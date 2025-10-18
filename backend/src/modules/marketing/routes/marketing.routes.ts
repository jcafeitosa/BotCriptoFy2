/**
 * Marketing Routes
 * Campaigns, leads, templates, and analytics APIs with RBAC enforcement
 */

import { Elysia, t } from 'elysia';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import { requirePermission } from '../../security/middleware/rbac.middleware';
import {
  LeadsService,
  CampaignService,
  TemplateService,
  MarketingAnalyticsService,
} from '../services';
import type {
  CampaignFilters,
  CreateCampaignData,
  UpdateCampaignData,
  CreateLeadData,
  UpdateLeadData,
  CreateTemplateData,
  UpdateTemplateData,
} from '../types';
import logger from '@/utils/logger';

export const marketingRoutes = new Elysia({ prefix: '/api/v1/marketing' })
  .use(sessionGuard)
  .use(requireTenant)

  // ========================================================================
  // CAMPAIGNS
  // ========================================================================

  .post(
    '/campaigns',
    { beforeHandle: [requirePermission('marketing', 'write')] },
    async ({ body, user, tenantId }: any) => {
      const campaign = await CampaignService.createCampaign(
        tenantId,
        user.id,
        body as CreateCampaignData,
      );
      return { success: true, data: campaign };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 255 }),
        description: t.Optional(t.String()),
        type: t.Union([t.Literal('email'), t.Literal('social'), t.Literal('ads'), t.Literal('mixed')]),
        templateId: t.Optional(t.String()),
        targetAudience: t.Optional(t.Any()),
        scheduleType: t.Union([
          t.Literal('immediate'),
          t.Literal('scheduled'),
          t.Literal('recurring'),
        ]),
        scheduledAt: t.Optional(t.String()),
        recurringPattern: t.Optional(t.Any()),
      }),
    }
  )
  .get(
    '/campaigns',
    { beforeHandle: [requirePermission('marketing', 'read')] },
    async ({ query, tenantId }: any) => {
      const filters: CampaignFilters = {};
      if (query.status) filters.status = [query.status as any];
      if (query.type) filters.type = [query.type as any];
      if (query.dateFrom) filters.dateFrom = new Date(query.dateFrom);
      if (query.dateTo) filters.dateTo = new Date(query.dateTo);
      if (query.search) filters.search = query.search;

      const pagination = {
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : 50,
      };

      const result = await CampaignService.listCampaigns(tenantId, filters, pagination);
      return { success: true, data: result.data, pagination: result.pagination };
    },
    {
      query: t.Object({
        status: t.Optional(t.String()),
        type: t.Optional(t.String()),
        dateFrom: t.Optional(t.String()),
        dateTo: t.Optional(t.String()),
        search: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )
  .get(
    '/campaigns/:id',
    { beforeHandle: [requirePermission('marketing', 'read')] },
    async ({ params, tenantId, set }: any) => {
      const campaign = await CampaignService.getCampaignById(params.id, tenantId);
      if (!campaign) {
        set.status = 404;
        return { success: false, error: 'Campaign not found' };
      }
      return { success: true, data: campaign };
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )
  .patch(
    '/campaigns/:id',
    { beforeHandle: [requirePermission('marketing', 'write')] },
    async ({ params, body, tenantId, set }: any) => {
      const campaign = await CampaignService.updateCampaign(
        params.id,
        tenantId,
        body as UpdateCampaignData,
      );
      if (!campaign) {
        set.status = 404;
        return { success: false, error: 'Campaign not found' };
      }
      return { success: true, data: campaign };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Partial(
        t.Object({
          name: t.String(),
          description: t.String(),
          status: t.String(),
          targetAudience: t.Any(),
          scheduledAt: t.String(),
          recurringPattern: t.Any(),
        })
      ),
    }
  )
  .delete(
    '/campaigns/:id',
    { beforeHandle: [requirePermission('marketing', 'write')] },
    async ({ params, tenantId }: any) => {
      await CampaignService.deleteCampaign(params.id, tenantId);
      return { success: true };
    },
    { params: t.Object({ id: t.String() }) }
  )
  .post(
    '/campaigns/:id/launch',
    { beforeHandle: [requirePermission('marketing', 'manage')] },
    async ({ params, tenantId, set }: any) => {
      const campaign = await CampaignService.setStatus(params.id, tenantId, 'running');
      if (!campaign) {
        set.status = 404;
        return { success: false, error: 'Campaign not found' };
      }
      return { success: true, data: campaign };
    },
    { params: t.Object({ id: t.String() }) }
  )
  .post(
    '/campaigns/:id/pause',
    { beforeHandle: [requirePermission('marketing', 'manage')] },
    async ({ params, tenantId, set }: any) => {
      const campaign = await CampaignService.setStatus(params.id, tenantId, 'paused');
      if (!campaign) {
        set.status = 404;
        return { success: false, error: 'Campaign not found' };
      }
      return { success: true, data: campaign };
    },
    { params: t.Object({ id: t.String() }) }
  )
  .post(
    '/campaigns/:id/duplicate',
    { beforeHandle: [requirePermission('marketing', 'manage')] },
    async ({ params, tenantId, user, set }: any) => {
      try {
        const duplicate = await CampaignService.duplicateCampaign(params.id, tenantId, user.id);
        return { success: true, data: duplicate };
      } catch (error) {
        logger.error('Error duplicating campaign', { error });
        set.status = 404;
        return { success: false, error: 'Campaign not found' };
      }
    },
    { params: t.Object({ id: t.String() }) }
  )
  .post(
    '/campaigns/:id/test-send',
    { beforeHandle: [requirePermission('marketing', 'manage')] },
    async ({ params, tenantId, user, body, set }: any) => {
      const campaign = await CampaignService.getCampaignById(params.id, tenantId);
      if (!campaign) {
        set.status = 404;
        return { success: false, error: 'Campaign not found' };
      }

      const template = campaign.templateId
        ? await TemplateService.getTemplate(tenantId, campaign.templateId)
        : null;

      if (!template) {
        set.status = 400;
        return { success: false, error: 'Campaign does not have an email template associated' };
      }

      const rendered = await TemplateService.previewTemplate(template, body.context || {});
      logger.info('Test campaign send simulated', {
        campaignId: params.id,
        previewSubject: rendered.subject,
        userId: user.id,
      });

      return {
        success: true,
        data: {
          preview: rendered,
          message: 'Test send simulated successfully (no email provider configured)',
        },
      };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ context: t.Optional(t.Any()) }),
    }
  )
  .get(
    '/campaigns/:id/analytics',
    { beforeHandle: [requirePermission('marketing', 'read')] },
    async ({ params, tenantId, set }: any) => {
      try {
        const analytics = await CampaignService.getAnalytics(params.id, tenantId);
        return { success: true, data: analytics };
      } catch (error) {
        logger.error('Error getting campaign analytics', { error });
        set.status = 404;
        return { success: false, error: 'Campaign not found' };
      }
    },
    { params: t.Object({ id: t.String() }) }
  )

  // ========================================================================
  // LEADS
  // ========================================================================

  .post(
    '/leads',
    { beforeHandle: [requirePermission('marketing', 'write')] },
    async ({ body, tenantId }: any) => {
      const lead = await LeadsService.createLead(body as CreateLeadData, tenantId);
      return { success: true, data: lead };
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        firstName: t.Optional(t.String()),
        lastName: t.Optional(t.String()),
        phone: t.Optional(t.String()),
        company: t.Optional(t.String()),
        jobTitle: t.Optional(t.String()),
        source: t.String(),
        tags: t.Optional(t.Array(t.String())),
        customFields: t.Optional(t.Any()),
      }),
    }
  )
  .post(
    '/leads/import',
    { beforeHandle: [requirePermission('marketing', 'manage')] },
    async ({ body, tenantId }: any) => {
      const result = await LeadsService.importLeads(body.csvContent, tenantId);
      return { success: true, data: result };
    },
    { body: t.Object({ csvContent: t.String({ minLength: 1 }) }) }
  )
  .get(
    '/leads',
    { beforeHandle: [requirePermission('marketing', 'read')] },
    async ({ query, tenantId }: any) => {
      const filters: any = {};
      if (query.status) filters.status = [query.status];
      if (query.minScore) filters.minScore = Number(query.minScore);
      if (query.maxScore) filters.maxScore = Number(query.maxScore);
      if (query.search) filters.search = query.search;

      const pagination = {
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : 50,
      };

      const result = await LeadsService.listLeads(filters, tenantId, pagination);
      return { success: true, ...result };
    },
    {
      query: t.Object({
        status: t.Optional(t.String()),
        minScore: t.Optional(t.String()),
        maxScore: t.Optional(t.String()),
        search: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )
  .get(
    '/leads/:id',
    { beforeHandle: [requirePermission('marketing', 'read')] },
    async ({ params, tenantId, set }: any) => {
      const lead = await LeadsService.getLeadById(params.id, tenantId);
      if (!lead) {
        set.status = 404;
        return { success: false, error: 'Lead not found' };
      }
      return { success: true, data: lead };
    },
    { params: t.Object({ id: t.String() }) }
  )
  .patch(
    '/leads/:id',
    { beforeHandle: [requirePermission('marketing', 'write')] },
    async ({ params, body, tenantId }: any) => {
      const lead = await LeadsService.updateLead(params.id, body as UpdateLeadData, tenantId);
      return { success: true, data: lead };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Partial(
        t.Object({
          firstName: t.String(),
          lastName: t.String(),
          phone: t.String(),
          company: t.String(),
          jobTitle: t.String(),
          status: t.String(),
          score: t.Number(),
          tags: t.Array(t.String()),
        })
      ),
    }
  )
  .delete(
    '/leads/:id',
    { beforeHandle: [requirePermission('marketing', 'manage')] },
    async ({ params, tenantId }: any) => {
      await LeadsService.softDeleteLead(params.id, tenantId);
      return { success: true };
    },
    { params: t.Object({ id: t.String() }) }
  )
  .get(
    '/leads/analytics',
    { beforeHandle: [requirePermission('marketing', 'read')] },
    async ({ query, tenantId }: any) => {
      const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined;
      const dateTo = query.dateTo ? new Date(query.dateTo) : undefined;
      const analytics = await MarketingAnalyticsService.getLeadAnalytics(tenantId, {
        dateFrom,
        dateTo,
      });
      return { success: true, data: analytics };
    },
    {
      query: t.Object({
        dateFrom: t.Optional(t.String()),
        dateTo: t.Optional(t.String()),
      }),
    }
  )

  // ========================================================================
  // TEMPLATES
  // ========================================================================

  .post(
    '/templates',
    { beforeHandle: [requirePermission('marketing', 'write')] },
    async ({ body, tenantId, user }: any) => {
      const template = await TemplateService.createTemplate(
        tenantId,
        user.id,
        body as CreateTemplateData,
      );
      return { success: true, data: template };
    },
    {
      body: t.Object({
        name: t.String(),
        subject: t.String(),
        htmlContent: t.String(),
        textContent: t.String(),
        variables: t.Optional(t.Any()),
        category: t.Optional(t.String()),
      }),
    }
  )
  .get(
    '/templates',
    { beforeHandle: [requirePermission('marketing', 'read')] },
    async ({ query, tenantId }: any) => {
      const templates = await TemplateService.listTemplates(tenantId, query.category);
      return { success: true, data: templates };
    },
    { query: t.Object({ category: t.Optional(t.String()) }) }
  )
  .get(
    '/templates/:id',
    { beforeHandle: [requirePermission('marketing', 'read')] },
    async ({ params, tenantId, set }: any) => {
      const template = await TemplateService.getTemplate(tenantId, params.id);
      if (!template) {
        set.status = 404;
        return { success: false, error: 'Template not found' };
      }
      return { success: true, data: template };
    },
    { params: t.Object({ id: t.String() }) }
  )
  .patch(
    '/templates/:id',
    { beforeHandle: [requirePermission('marketing', 'write')] },
    async ({ params, body, tenantId, set }: any) => {
      const template = await TemplateService.updateTemplate(
        tenantId,
        params.id,
        body as UpdateTemplateData,
      );
      if (!template) {
        set.status = 404;
        return { success: false, error: 'Template not found' };
      }
      return { success: true, data: template };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Partial(
        t.Object({
          name: t.String(),
          subject: t.String(),
          htmlContent: t.String(),
          textContent: t.String(),
          variables: t.Any(),
          category: t.String(),
          isActive: t.Boolean(),
        })
      ),
    }
  )
  .delete(
    '/templates/:id',
    { beforeHandle: [requirePermission('marketing', 'manage')] },
    async ({ params, tenantId }: any) => {
      await TemplateService.deactivateTemplate(tenantId, params.id);
      return { success: true };
    },
    { params: t.Object({ id: t.String() }) }
  )
  .post(
    '/templates/:id/preview',
    { beforeHandle: [requirePermission('marketing', 'read')] },
    async ({ params, body, tenantId, set }: any) => {
      const template = await TemplateService.getTemplate(tenantId, params.id);
      if (!template) {
        set.status = 404;
        return { success: false, error: 'Template not found' };
      }
      const rendered = await TemplateService.previewTemplate(template, body.context || {});
      return { success: true, data: rendered };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ context: t.Optional(t.Any()) }),
    }
  )

  // ========================================================================
  // DASHBOARD ANALYTICS
  // ========================================================================

  .get(
    '/dashboard',
    { beforeHandle: [requirePermission('marketing', 'read')] },
    async ({ query, tenantId }: any) => {
      const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined;
      const dateTo = query.dateTo ? new Date(query.dateTo) : undefined;

      const [leadsAnalytics, campaignOverview] = await Promise.all([
        MarketingAnalyticsService.getLeadAnalytics(tenantId, { dateFrom, dateTo }),
        MarketingAnalyticsService.getCampaignOverview(tenantId, { dateFrom, dateTo }),
      ]);

      return {
        success: true,
        data: {
          leads: leadsAnalytics,
          campaigns: campaignOverview,
        },
      };
    },
    {
      query: t.Object({
        dateFrom: t.Optional(t.String()),
        dateTo: t.Optional(t.String()),
      }),
    }
  );
