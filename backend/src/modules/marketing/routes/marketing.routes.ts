/**
 * Marketing Routes
 * Complete API endpoints for marketing system
 * Handles campaigns, leads, templates, and analytics
 */

import { Elysia, t } from 'elysia';
import { db } from '@/db';
import { eq, and, desc, isNull, sql } from 'drizzle-orm';
import { sessionGuard, requireRole } from '../../auth/middleware/session.middleware';
import { LeadsService } from '../services/leads.service';
import { campaigns } from '../schema/campaigns.schema';
import { emailTemplates } from '../schema/templates.schema';
import { campaignAnalytics } from '../schema/analytics.schema';
import { campaignSends } from '../schema/campaign-sends.schema';
import { TemplateRenderer } from '../utils/template-renderer';
import logger from '@/utils/logger';

export const marketingRoutes = new Elysia({ prefix: '/api/v1/marketing' })
  .use(sessionGuard)
  .use(requireRole(['ceo', 'admin', 'manager']))

  // ========================================================================
  // CAMPAIGNS
  // ========================================================================

  /**
   * POST /api/v1/marketing/campaigns
   * Create new campaign
   */
  .post(
    '/campaigns',
    async ({ body, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;
        const userId = (session as any)?.userId;

        const [campaign] = await db
          .insert(campaigns)
          .values({
            tenantId,
            createdBy: userId,
            ...body,
            scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
          } as any)
          .returning();

        logger.info('Campaign created', { campaignId: campaign.id, tenantId });

        return { success: true, data: campaign };
      } catch (error) {
        logger.error('Error creating campaign', { error });
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 255 }),
        description: t.Optional(t.String()),
        type: t.Union([t.Literal('email'), t.Literal('social'), t.Literal('ads'), t.Literal('mixed')]),
        templateId: t.Optional(t.String()),
        targetAudience: t.Optional(t.Any()),
        scheduleType: t.Union([t.Literal('immediate'), t.Literal('scheduled'), t.Literal('recurring')]),
        scheduledAt: t.Optional(t.String()),
        recurringPattern: t.Optional(t.Any()),
      }),
    }
  )

  /**
   * GET /api/v1/marketing/campaigns
   * List all campaigns
   */
  .get('/campaigns', async ({ query, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;
      const limit = Number(query.limit) || 50;
      const offset = Number(query.offset) || 0;

      const [campaignsData, countResult] = await Promise.all([
        db
          .select()
          .from(campaigns)
          .where(and(eq(campaigns.tenantId, tenantId), isNull(campaigns.deletedAt)))
          .orderBy(desc(campaigns.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(campaigns)
          .where(and(eq(campaigns.tenantId, tenantId), isNull(campaigns.deletedAt))),
      ]);

      const total = countResult[0]?.count || 0;

      return {
        success: true,
        data: campaignsData,
        pagination: {
          total,
          limit,
          offset,
        },
      };
    } catch (error) {
      logger.error('Error listing campaigns', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * GET /api/v1/marketing/campaigns/:id
   * Get campaign by ID
   */
  .get('/campaigns/:id', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(and(eq(campaigns.id, params.id), eq(campaigns.tenantId, tenantId)))
        .limit(1);

      if (!campaign) {
        set.status = 404;
        return { success: false, error: 'Campaign not found' };
      }

      return { success: true, data: campaign };
    } catch (error) {
      logger.error('Error getting campaign', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * PATCH /api/v1/marketing/campaigns/:id
   * Update campaign
   */
  .patch(
    '/campaigns/:id',
    async ({ params, body, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;

        const [updated] = await db
          .update(campaigns)
          .set({
            ...body,
            scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
            updatedAt: new Date(),
          } as any)
          .where(and(eq(campaigns.id, params.id), eq(campaigns.tenantId, tenantId)))
          .returning();

        if (!updated) {
          set.status = 404;
          return { success: false, error: 'Campaign not found' };
        }

        logger.info('Campaign updated', { campaignId: params.id });

        return { success: true, data: updated };
      } catch (error) {
        logger.error('Error updating campaign', { error });
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      body: t.Partial(
        t.Object({
          name: t.String(),
          description: t.String(),
          status: t.String(),
          targetAudience: t.Any(),
          scheduledAt: t.String(),
        })
      ),
    }
  )

  /**
   * DELETE /api/v1/marketing/campaigns/:id
   * Delete campaign (soft delete)
   */
  .delete('/campaigns/:id', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      await db
        .update(campaigns)
        .set({ deletedAt: new Date() })
        .where(and(eq(campaigns.id, params.id), eq(campaigns.tenantId, tenantId)));

      logger.info('Campaign deleted', { campaignId: params.id });

      return { success: true };
    } catch (error) {
      logger.error('Error deleting campaign', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * POST /api/v1/marketing/campaigns/:id/launch
   * Launch campaign
   */
  .post('/campaigns/:id/launch', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      const [updated] = await db
        .update(campaigns)
        .set({
          status: 'running',
          startedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(campaigns.id, params.id), eq(campaigns.tenantId, tenantId)))
        .returning();

      if (!updated) {
        set.status = 404;
        return { success: false, error: 'Campaign not found' };
      }

      logger.info('Campaign launched', { campaignId: params.id });

      return { success: true, data: updated };
    } catch (error) {
      logger.error('Error launching campaign', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * POST /api/v1/marketing/campaigns/:id/pause
   * Pause campaign
   */
  .post('/campaigns/:id/pause', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      const [updated] = await db
        .update(campaigns)
        .set({
          status: 'paused',
          updatedAt: new Date(),
        })
        .where(and(eq(campaigns.id, params.id), eq(campaigns.tenantId, tenantId)))
        .returning();

      if (!updated) {
        set.status = 404;
        return { success: false, error: 'Campaign not found' };
      }

      logger.info('Campaign paused', { campaignId: params.id });

      return { success: true, data: updated };
    } catch (error) {
      logger.error('Error pausing campaign', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * GET /api/v1/marketing/campaigns/:id/analytics
   * Get campaign analytics
   */
  .get('/campaigns/:id/analytics', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      // Verify campaign exists and belongs to tenant
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(and(eq(campaigns.id, params.id), eq(campaigns.tenantId, tenantId)))
        .limit(1);

      if (!campaign) {
        set.status = 404;
        return { success: false, error: 'Campaign not found' };
      }

      // Get analytics
      const analytics = await db
        .select()
        .from(campaignAnalytics)
        .where(eq(campaignAnalytics.campaignId, params.id))
        .orderBy(desc(campaignAnalytics.date));

      // Get overall stats from campaign_sends
      const [stats] = await db
        .select({
          totalSends: sql<number>`count(*)::int`,
          delivered: sql<number>`count(*) filter (where status = 'delivered')::int`,
          opened: sql<number>`count(*) filter (where status = 'opened')::int`,
          clicked: sql<number>`count(*) filter (where status = 'clicked')::int`,
          bounced: sql<number>`count(*) filter (where status = 'bounced')::int`,
        })
        .from(campaignSends)
        .where(eq(campaignSends.campaignId, params.id));

      return {
        success: true,
        data: {
          campaign: {
            id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            startedAt: campaign.startedAt,
            completedAt: campaign.completedAt,
          },
          overall: stats,
          daily: analytics,
        },
      };
    } catch (error) {
      logger.error('Error getting campaign analytics', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  // ========================================================================
  // LEADS
  // ========================================================================

  /**
   * POST /api/v1/marketing/leads
   * Create new lead
   */
  .post(
    '/leads',
    async ({ body, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;

        const lead = await LeadsService.createLead(body, tenantId);

        return { success: true, data: lead };
      } catch (error) {
        logger.error('Error creating lead', { error });
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
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

  /**
   * POST /api/v1/marketing/leads/import
   * Import leads from CSV
   */
  .post(
    '/leads/import',
    async ({ body, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;

        const result = await LeadsService.importLeads(body.csvContent, tenantId);

        return { success: true, data: result };
      } catch (error) {
        logger.error('Error importing leads', { error });
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      body: t.Object({
        csvContent: t.String({ minLength: 1 }),
      }),
    }
  )

  /**
   * GET /api/v1/marketing/leads
   * List leads with filters
   */
  .get('/leads', async ({ query, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      const filters: any = {};
      if (query.status) filters.status = [query.status];
      if (query.minScore) filters.minScore = Number(query.minScore);
      if (query.maxScore) filters.maxScore = Number(query.maxScore);
      if (query.search) filters.search = query.search;

      const pagination = {
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 50,
      };

      const result = await LeadsService.listLeads(filters, tenantId, pagination);

      return { success: true, ...result };
    } catch (error) {
      logger.error('Error listing leads', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * GET /api/v1/marketing/leads/:id
   * Get lead by ID
   */
  .get('/leads/:id', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      const lead = await LeadsService.getLeadById(params.id, tenantId);

      if (!lead) {
        set.status = 404;
        return { success: false, error: 'Lead not found' };
      }

      return { success: true, data: lead };
    } catch (error) {
      logger.error('Error getting lead', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * PATCH /api/v1/marketing/leads/:id
   * Update lead
   */
  .patch(
    '/leads/:id',
    async ({ params, body, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;

        const lead = await LeadsService.updateLead(params.id, body as any, tenantId);

        return { success: true, data: lead };
      } catch (error) {
        logger.error('Error updating lead', { error });
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
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

  /**
   * DELETE /api/v1/marketing/leads/:id
   * Delete lead
   */
  .delete('/leads/:id', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      await LeadsService.deleteLead(params.id, tenantId);

      return { success: true };
    } catch (error) {
      logger.error('Error deleting lead', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * POST /api/v1/marketing/leads/:id/convert
   * Convert lead to customer
   */
  .post('/leads/:id/convert', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;
      const userId = (session as any)?.userId;

      const lead = await LeadsService.convertLead(params.id, userId, tenantId);

      return { success: true, data: lead };
    } catch (error) {
      logger.error('Error converting lead', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * GET /api/v1/marketing/leads/:id/activity
   * Get lead activity timeline
   */
  .get('/leads/:id/activity', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      const activities = await LeadsService.getLeadActivity(params.id, tenantId);

      return { success: true, data: activities };
    } catch (error) {
      logger.error('Error getting lead activity', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * GET /api/v1/marketing/leads/search
   * Search leads
   */
  .get('/leads/search', async ({ query, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      if (!query.q) {
        set.status = 400;
        return { success: false, error: 'Search query required' };
      }

      const leads = await LeadsService.searchLeads(query.q, tenantId);

      return { success: true, data: leads };
    } catch (error) {
      logger.error('Error searching leads', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  // ========================================================================
  // TEMPLATES
  // ========================================================================

  /**
   * POST /api/v1/marketing/templates
   * Create email template
   */
  .post(
    '/templates',
    async ({ body, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;
        const userId = (session as any)?.userId;

        const [template] = await db
          .insert(emailTemplates)
          .values({
            tenantId,
            createdBy: userId,
            ...body,
          })
          .returning();

        logger.info('Template created', { templateId: template.id });

        return { success: true, data: template };
      } catch (error) {
        logger.error('Error creating template', { error });
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
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

  /**
   * GET /api/v1/marketing/templates
   * List templates
   */
  .get('/templates', async ({ query, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      const conditions = [eq(emailTemplates.tenantId, tenantId)];
      
      if (query.category) {
        conditions.push(eq(emailTemplates.category, query.category));
      }

      const templates = await db
        .select()
        .from(emailTemplates)
        .where(and(...conditions))
        .orderBy(desc(emailTemplates.createdAt));

      return { success: true, data: templates };
    } catch (error) {
      logger.error('Error listing templates', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * GET /api/v1/marketing/templates/:id
   * Get template by ID
   */
  .get('/templates/:id', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      const [template] = await db
        .select()
        .from(emailTemplates)
        .where(and(eq(emailTemplates.id, params.id), eq(emailTemplates.tenantId, tenantId)))
        .limit(1);

      if (!template) {
        set.status = 404;
        return { success: false, error: 'Template not found' };
      }

      return { success: true, data: template };
    } catch (error) {
      logger.error('Error getting template', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * POST /api/v1/marketing/templates/:id/preview
   * Preview template with variables
   */
  .post(
    '/templates/:id/preview',
    async ({ params, body, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;

        const [template] = await db
          .select()
          .from(emailTemplates)
          .where(and(eq(emailTemplates.id, params.id), eq(emailTemplates.tenantId, tenantId)))
          .limit(1);

        if (!template) {
          set.status = 404;
          return { success: false, error: 'Template not found' };
        }

        const rendered = TemplateRenderer.renderEmail(
          template.subject,
          template.htmlContent,
          template.textContent,
          body.context
        );

        return { success: true, data: rendered };
      } catch (error) {
        logger.error('Error previewing template', { error });
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      body: t.Object({
        context: t.Any(),
      }),
    }
  );
