/**
 * Analytics Routes
 * API endpoints for support analytics and metrics
 */

import { Elysia } from 'elysia';
import { sessionGuard, requireRole } from '../../auth/middleware/session.middleware';
import { AnalyticsService } from '../services';
import logger from '@/utils/logger';

export const analyticsRoutes = new Elysia({ prefix: '/api/v1/support/analytics' })
  .use(sessionGuard)
  .use(requireRole(['ceo', 'admin', 'support_manager']))

  /**
   * GET /api/v1/support/analytics/stats
   * Get ticket statistics
   */
  .get('/stats', async ({ query, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      const dateRange = query.from && query.to
        ? {
            from: new Date(query.from as string),
            to: new Date(query.to as string),
          }
        : undefined;

      const stats = await AnalyticsService.getTicketStats(tenantId, dateRange);

      return { success: true, data: stats };
    } catch (error) {
      logger.error('Error getting ticket stats', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * GET /api/v1/support/analytics/resolution-time
   * Get average resolution time
   */
  .get('/resolution-time', async ({ query, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      const dateRange = query.from && query.to
        ? {
            from: new Date(query.from as string),
            to: new Date(query.to as string),
          }
        : undefined;

      const avgTime = await AnalyticsService.getResolutionTimeAvg(tenantId, dateRange);

      return { success: true, data: { avgResolutionTime: avgTime } };
    } catch (error) {
      logger.error('Error getting resolution time', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * GET /api/v1/support/analytics/first-response-time
   * Get average first response time
   */
  .get('/first-response-time', async ({ query, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      const dateRange = query.from && query.to
        ? {
            from: new Date(query.from as string),
            to: new Date(query.to as string),
          }
        : undefined;

      const avgTime = await AnalyticsService.getFirstResponseTimeAvg(tenantId, dateRange);

      return { success: true, data: { avgFirstResponseTime: avgTime } };
    } catch (error) {
      logger.error('Error getting first response time', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * GET /api/v1/support/analytics/satisfaction
   * Get satisfaction score (CSAT)
   */
  .get('/satisfaction', async ({ query, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      const dateRange = query.from && query.to
        ? {
            from: new Date(query.from as string),
            to: new Date(query.to as string),
          }
        : undefined;

      const metrics = await AnalyticsService.getSatisfactionScore(tenantId, dateRange);

      return { success: true, data: metrics };
    } catch (error) {
      logger.error('Error getting satisfaction score', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * GET /api/v1/support/analytics/agent-performance
   * Get agent performance
   */
  .get('/agent-performance', async ({ query, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;
      const userId = query.userId as string;

      if (!userId) {
        return {
          success: false,
          error: 'userId query parameter is required',
        };
      }

      const dateRange = query.from && query.to
        ? {
            from: new Date(query.from as string),
            to: new Date(query.to as string),
          }
        : undefined;

      const performance = await AnalyticsService.getAgentPerformance(userId, tenantId, dateRange);

      return { success: true, data: performance };
    } catch (error) {
      logger.error('Error getting agent performance', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * GET /api/v1/support/analytics/category-distribution
   * Get category distribution
   */
  .get('/category-distribution', async ({ query, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      const dateRange = query.from && query.to
        ? {
            from: new Date(query.from as string),
            to: new Date(query.to as string),
          }
        : undefined;

      const distribution = await AnalyticsService.getCategoryDistribution(tenantId, dateRange);

      return { success: true, data: distribution };
    } catch (error) {
      logger.error('Error getting category distribution', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * GET /api/v1/support/analytics/tickets-over-time
   * Get tickets created over time
   */
  .get('/tickets-over-time', async ({ query, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      if (!query.from || !query.to) {
        return {
          success: false,
          error: 'from and to query parameters are required',
        };
      }

      const dateRange = {
        from: new Date(query.from as string),
        to: new Date(query.to as string),
      };

      const interval = (query.interval as 'day' | 'week' | 'month') || 'day';

      const data = await AnalyticsService.getTicketsOverTime(tenantId, dateRange, interval);

      return { success: true, data };
    } catch (error) {
      logger.error('Error getting tickets over time', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
