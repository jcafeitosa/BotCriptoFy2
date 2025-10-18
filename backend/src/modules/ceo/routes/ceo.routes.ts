/**
 * CEO Dashboard Routes
 * API endpoints for CEO dashboard and executive metrics
 * Requires CEO or super_admin role
 */

import { Elysia, t } from 'elysia';
import { sessionGuard, requireRole } from '../../auth/middleware/session.middleware';
import { ceoService } from '../services/ceo.service';
import { getRecentCriticalEvents } from '../../audit/services/audit-logger.service';
import { markAudit } from '../../audit';
import logger from '../../../utils/logger';
import type { DashboardQueryOptions } from '../types/ceo.types';

export const ceoRoutes = new Elysia({ prefix: '/api/v1/ceo' })
  // Apply session guard and CEO/admin role requirement to all routes
  .use(sessionGuard)
  .use(requireRole(['ceo', 'admin', 'super_admin']))

  /**
   * GET /api/v1/ceo/dashboard
   * Get complete dashboard data with all metrics
   */
  .get(
    '/dashboard',
    async ({ query, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;

        if (!tenantId) {
          set.status = 400;
          return {
            success: false,
            error: 'No active organization',
            message: 'Please select an organization first',
          };
        }

        const options: DashboardQueryOptions = {
          tenantId,
          dateRange: (query.dateRange as any) || '30d',
          includeComparison: query.includeComparison === 'true',
        };

        // Parse custom date range if provided
        if (query.startDate) {
          options.startDate = new Date(query.startDate);
        }
        if (query.endDate) {
          options.endDate = new Date(query.endDate);
        }

        const result = await ceoService.getDashboardData(options);

        if (!result.success) {
          set.status = 500;
          return {
            success: false,
            error: result.error,
            code: result.code,
          };
        }

        logger.info('CEO dashboard accessed', {
          tenantId,
          dateRange: options.dateRange,
        });

        return {
          success: true,
          data: result.data,
        };
      } catch (error) {
        logger.error('Error in CEO dashboard route', { error });
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      query: t.Object({
        dateRange: t.Optional(
          t.Union([t.Literal('7d'), t.Literal('30d'), t.Literal('90d'), t.Literal('1y')])
        ),
        startDate: t.Optional(t.String({ format: 'date' })),
        endDate: t.Optional(t.String({ format: 'date' })),
        includeComparison: t.Optional(t.String()),
      }),
      detail: {
        tags: ['CEO Dashboard'],
        summary: 'Get complete dashboard data',
        description: 'Returns aggregated metrics for executive dashboard (revenue, users, subscriptions, etc.)',
        security: [{ bearerAuth: [] }],
      },
    }
  )

  /**
   * GET /api/v1/ceo/executive-summary
   * Key highlights for CEO: KPIs, critical alerts, recent critical audit events
   */
  .get(
    '/executive-summary',
    async ({ set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;
        if (!tenantId) {
          set.status = 400;
          return { success: false, error: 'No active organization' };
        }

        const now = new Date();
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [kpis, alerts, criticalEvents] = await Promise.all([
          ceoService.getKPIs(tenantId),
          ceoService.getAlerts(tenantId, 'critical'),
          getRecentCriticalEvents(tenantId, 20),
        ]);

        return {
          success: true,
          data: {
            kpis: kpis.data || [],
            criticalAlerts: alerts.data || [],
            recentCriticalEvents: criticalEvents,
            period: { start, end: now },
          },
        };
      } catch (error) {
        logger.error('Error in CEO executive summary route', { error });
        set.status = 500;
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
    {
      detail: {
        tags: ['CEO Dashboard'],
        summary: 'Executive summary',
        description: 'Key KPIs, critical alerts, and recent critical audit events',
        security: [{ bearerAuth: [] }],
      },
    }
  )

  /**
   * GET /api/v1/ceo/kpis
   * Get real-time KPIs
   */
  .get(
    '/kpis',
    async ({ set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;

        if (!tenantId) {
          set.status = 400;
          return {
            success: false,
            error: 'No active organization',
          };
        }

        const result = await ceoService.getKPIs(tenantId);

        if (!result.success) {
          set.status = 500;
          return {
            success: false,
            error: result.error,
            code: result.code,
          };
        }

        return {
          success: true,
          data: result.data,
        };
      } catch (error) {
        logger.error('Error in CEO KPIs route', { error });
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      detail: {
        tags: ['CEO Dashboard'],
        summary: 'Get real-time KPIs',
        description: 'Returns key performance indicators (MRR, ARR, CAC, LTV, churn, etc.)',
        security: [{ bearerAuth: [] }],
      },
    }
  )

  /**
   * PATCH /api/v1/ceo/alerts/:id/ack
   * Acknowledge alert
   */
  .patch(
    '/alerts/:id/ack',
    async (ctx) => {
      const { params, set, user, session } = ctx as any;
      const tenantId = (session as any)?.activeOrganizationId;
      if (!tenantId || !user) {
        set.status = 400;
        return { success: false, error: 'Missing tenant or user context' };
      }
      const result = await ceoService.acknowledgeAlert(tenantId, params.id, user.id);
      if (!result.success) {
        set.status = 400;
        return { success: false, error: result.error, code: result.code };
      }
      markAudit(ctx, {
        eventType: 'system.warning',
        severity: 'medium',
        resource: 'ceo_alerts',
        action: 'acknowledge',
        metadata: { alertId: params.id, tenantId, userId: user.id },
      });
      return { success: true, data: result.data };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ['CEO Dashboard'],
        summary: 'Acknowledge alert',
        description: 'Marks the alert as acknowledged',
        security: [{ bearerAuth: [] }],
      },
    }
  )

  /**
   * PATCH /api/v1/ceo/alerts/:id/resolve
   * Resolve alert
   */
  .patch(
    '/alerts/:id/resolve',
    async (ctx) => {
      const { params, set, user, session } = ctx as any;
      const tenantId = (session as any)?.activeOrganizationId;
      if (!tenantId || !user) {
        set.status = 400;
        return { success: false, error: 'Missing tenant or user context' };
      }
      const result = await ceoService.resolveAlert(tenantId, params.id, user.id);
      if (!result.success) {
        set.status = 400;
        return { success: false, error: result.error, code: result.code };
      }
      markAudit(ctx, {
        eventType: 'system.warning',
        severity: 'medium',
        resource: 'ceo_alerts',
        action: 'resolve',
        metadata: { alertId: params.id, tenantId, userId: user.id },
      });
      return { success: true, data: result.data };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ['CEO Dashboard'],
        summary: 'Resolve alert',
        description: 'Marks the alert as resolved',
        security: [{ bearerAuth: [] }],
      },
    }
  )

  /**
   * PATCH /api/v1/ceo/alerts/:id/dismiss
   * Dismiss alert
   */
  .patch(
    '/alerts/:id/dismiss',
    async (ctx) => {
      const { params, set, session, user } = ctx as any;
      const tenantId = (session as any)?.activeOrganizationId;
      if (!tenantId) {
        set.status = 400;
        return { success: false, error: 'Missing tenant context' };
      }
      const result = await ceoService.dismissAlert(tenantId, params.id);
      if (!result.success) {
        set.status = 400;
        return { success: false, error: result.error, code: result.code };
      }
      markAudit(ctx, {
        eventType: 'system.warning',
        severity: 'low',
        resource: 'ceo_alerts',
        action: 'dismiss',
        metadata: { alertId: params.id, tenantId, userId: user?.id },
      });
      return { success: true, data: result.data };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ['CEO Dashboard'],
        summary: 'Dismiss alert',
        description: 'Dismisses the alert',
        security: [{ bearerAuth: [] }],
      },
    }
  )

  /**
   * GET /api/v1/ceo/trends/users
   * New users per day in range
   */
  .get(
    '/trends/users',
    async ({ query, set, session }) => {
      const tenantId = (session as any)?.activeOrganizationId;
      if (!tenantId) {
        set.status = 400;
        return { success: false, error: 'No active organization' };
      }
      const endDate = query.endDate ? new Date(query.endDate) : new Date();
      const startDate = query.startDate
        ? new Date(query.startDate)
        : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      const trends = await ceoService.getUserTrends(tenantId, startDate, endDate);
      if (!trends.success) {
        set.status = 500;
        return { success: false, error: trends.error, code: trends.code };
      }
      return { success: true, data: trends.data };
    },
    {
      query: t.Object({ startDate: t.Optional(t.String()), endDate: t.Optional(t.String()) }),
      detail: {
        tags: ['CEO Dashboard'],
        summary: 'User trends',
        description: 'New users per day in a date range',
        security: [{ bearerAuth: [] }],
      },
    }
  )

  /**
   * GET /api/v1/ceo/alerts
   * Get active alerts
   */
  .get(
    '/alerts',
    async ({ query, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;

        if (!tenantId) {
          set.status = 400;
          return {
            success: false,
            error: 'No active organization',
          };
        }

        const result = await ceoService.getAlerts(tenantId, query.severity);

        if (!result.success) {
          set.status = 500;
          return {
            success: false,
            error: result.error,
            code: result.code,
          };
        }

        return {
          success: true,
          data: result.data,
          count: result.data?.length || 0,
        };
      } catch (error) {
        logger.error('Error in CEO alerts route', { error });
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      query: t.Object({
        severity: t.Optional(t.Union([t.Literal('critical'), t.Literal('warning'), t.Literal('info')])),
      }),
      detail: {
        tags: ['CEO Dashboard'],
        summary: 'Get active alerts',
        description: 'Returns active alerts requiring CEO attention',
        security: [{ bearerAuth: [] }],
      },
    }
  )

  /**
   * GET /api/v1/ceo/revenue
   * Get revenue metrics
   */
  .get(
    '/revenue',
    async ({ query, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;

        if (!tenantId) {
          set.status = 400;
          return {
            success: false,
            error: 'No active organization',
          };
        }

        const dateRange = query.dateRange || '30d';
        let days = 30;
        switch (dateRange) {
          case '7d':
            days = 7;
            break;
          case '90d':
            days = 90;
            break;
          case '1y':
            days = 365;
            break;
        }

        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

        const result = await ceoService.getRevenueMetrics(tenantId, startDate, endDate);

        if (!result.success) {
          set.status = 500;
          return {
            success: false,
            error: result.error,
            code: result.code,
          };
        }

        return {
          success: true,
          data: result.data,
        };
      } catch (error) {
        logger.error('Error in CEO revenue route', { error });
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      query: t.Object({
        dateRange: t.Optional(
          t.Union([t.Literal('7d'), t.Literal('30d'), t.Literal('90d'), t.Literal('1y')])
        ),
      }),
      detail: {
        tags: ['CEO Dashboard'],
        summary: 'Get revenue metrics',
        description: 'Returns detailed revenue metrics (MRR, ARR, ARPU, revenue by plan, etc.)',
        security: [{ bearerAuth: [] }],
      },
    }
  )

  /**
   * GET /api/v1/ceo/users
   * Get user metrics
   */
  .get(
    '/users',
    async ({ query, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;

        if (!tenantId) {
          set.status = 400;
          return {
            success: false,
            error: 'No active organization',
          };
        }

        const dateRange = query.dateRange || '30d';
        let days = 30;
        switch (dateRange) {
          case '7d':
            days = 7;
            break;
          case '90d':
            days = 90;
            break;
          case '1y':
            days = 365;
            break;
        }

        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

        const result = await ceoService.getUserMetrics(tenantId, startDate, endDate);

        if (!result.success) {
          set.status = 500;
          return {
            success: false,
            error: result.error,
            code: result.code,
          };
        }

        return {
          success: true,
          data: result.data,
        };
      } catch (error) {
        logger.error('Error in CEO users route', { error });
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      query: t.Object({
        dateRange: t.Optional(
          t.Union([t.Literal('7d'), t.Literal('30d'), t.Literal('90d'), t.Literal('1y')])
        ),
      }),
      detail: {
        tags: ['CEO Dashboard'],
        summary: 'Get user metrics',
        description: 'Returns user metrics (total, active, new, churn rate, retention, etc.)',
        security: [{ bearerAuth: [] }],
      },
    }
  )

  /**
   * GET /api/v1/ceo/subscriptions
   * Get subscription metrics
   */
  .get(
    '/subscriptions',
    async ({ query, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;

        if (!tenantId) {
          set.status = 400;
          return {
            success: false,
            error: 'No active organization',
          };
        }

        const dateRange = query.dateRange || '30d';
        let days = 30;
        switch (dateRange) {
          case '7d':
            days = 7;
            break;
          case '90d':
            days = 90;
            break;
          case '1y':
            days = 365;
            break;
        }

        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

        const result = await ceoService.getSubscriptionMetrics(tenantId, startDate, endDate);

        if (!result.success) {
          set.status = 500;
          return {
            success: false,
            error: result.error,
            code: result.code,
          };
        }

        return {
          success: true,
          data: result.data,
        };
      } catch (error) {
        logger.error('Error in CEO subscriptions route', { error });
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      query: t.Object({
        dateRange: t.Optional(
          t.Union([t.Literal('7d'), t.Literal('30d'), t.Literal('90d'), t.Literal('1y')])
        ),
      }),
      detail: {
        tags: ['CEO Dashboard'],
        summary: 'Get subscription metrics',
        description:
          'Returns subscription metrics (total, active, by plan, upgrades, downgrades, etc.)',
        security: [{ bearerAuth: [] }],
      },
    }
  )

  /**
   * POST /api/v1/ceo/config
   * Save dashboard configuration
   */
  .post(
    '/config',
    async ({ body, set, user, session }) => {
      try {
        if (!user) {
          set.status = 401;
          return {
            success: false,
            error: 'Unauthorized',
          };
        }

        const tenantId = (session as any)?.activeOrganizationId;

        if (!tenantId) {
          set.status = 400;
          return {
            success: false,
            error: 'No active organization',
          };
        }

        const result = await ceoService.saveDashboardConfig({
          ...body,
          userId: user.id,
          tenantId,
        });

        if (!result.success) {
          set.status = 500;
          return {
            success: false,
            error: result.error,
            code: result.code,
          };
        }

        logger.info('CEO dashboard config saved', {
          userId: user.id,
          tenantId,
        });

        return {
          success: true,
          message: 'Configuration saved successfully',
          data: result.data,
        };
      } catch (error) {
        logger.error('Error saving CEO dashboard config', { error });
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      body: t.Object({
        displayName: t.Optional(t.String({ maxLength: 100 })),
        theme: t.Optional(t.Union([t.Literal('light'), t.Literal('dark'), t.Literal('auto')])),
        defaultDateRange: t.Optional(
          t.Union([t.Literal('7d'), t.Literal('30d'), t.Literal('90d'), t.Literal('1y')])
        ),
        refreshInterval: t.Optional(t.Number({ minimum: 60, maximum: 3600 })),
        currency: t.Optional(t.String({ minLength: 3, maxLength: 3 })),
        emailAlerts: t.Optional(t.Boolean()),
        pushAlerts: t.Optional(t.Boolean()),
        alertThresholds: t.Optional(
          t.Object({
            revenueDropPercent: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
            churnRatePercent: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
            activeUsersDropPercent: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
            errorRatePercent: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
          })
        ),
        layout: t.Optional(t.Any()),
        metadata: t.Optional(t.Record(t.String(), t.Any())),
      }),
      detail: {
        tags: ['CEO Dashboard'],
        summary: 'Save dashboard configuration',
        description: 'Save personalized dashboard configuration (theme, layout, alerts, etc.)',
        security: [{ bearerAuth: [] }],
      },
    }
  );

export default ceoRoutes;
