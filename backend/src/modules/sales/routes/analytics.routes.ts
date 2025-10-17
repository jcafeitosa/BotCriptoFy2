/**
 * Analytics Routes
 * API endpoints for sales analytics, forecasting, and targets
 */

import { Elysia, t } from 'elysia';
import { sessionGuard, requireRole } from '../../auth/middleware/session.middleware';
import { ForecastingService, TargetsService } from '../services';
import logger from '@/utils/logger';

export const analyticsRoutes = new Elysia({ prefix: '/api/v1/sales' })
  .use(sessionGuard)
  .use(requireRole(['ceo', 'admin', 'sales_manager', 'sales_rep']))

  // ========================================================================
  // FORECASTING
  // ========================================================================

  /** GET /api/v1/sales/forecast */
  .get('/forecast', async ({ query, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;
      const userId = (session as any)?.userId;

      const period = (query.period as any) || 'monthly';
      const methodology = (query.methodology as any) || 'weighted_pipeline';

      const forecast = await ForecastingService.generateForecastForPeriod(
        period,
        tenantId,
        userId,
        methodology
      );

      return { success: true, data: forecast };
    } catch (error) {
      set.status = 500;
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  })

  /** GET /api/v1/sales/forecast/weighted-pipeline */
  .get('/forecast/weighted-pipeline', async ({ set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;
      const weightedValue = await ForecastingService.getWeightedPipeline(tenantId);

      return { success: true, data: { weightedPipelineValue: weightedValue } };
    } catch (error) {
      set.status = 500;
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  })

  /** GET /api/v1/sales/analytics/win-rate */
  .get('/analytics/win-rate', async ({ query, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;
      const userId = query.userId || null;

      const dateRange = query.from && query.to
        ? { from: new Date(query.from), to: new Date(query.to) }
        : undefined;

      const metrics = await ForecastingService.getWinRateAnalysis(
        userId,
        tenantId,
        dateRange
      );

      return { success: true, data: metrics };
    } catch (error) {
      set.status = 500;
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  })

  /** GET /api/v1/sales/analytics/sales-cycle */
  .get('/analytics/sales-cycle', async ({ set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;
      const analysis = await ForecastingService.getSalesCycle(tenantId);

      return { success: true, data: analysis };
    } catch (error) {
      set.status = 500;
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  })

  // ========================================================================
  // TARGETS
  // ========================================================================

  /** POST /api/v1/sales/targets */
  .post(
    '/targets',
    async ({ body, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;
        const target = await TargetsService.createTarget(body as any, tenantId);

        return { success: true, data: target };
      } catch (error) {
        logger.error('Error creating target', { error });
        set.status = 500;
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
    {
      body: t.Object({
        userId: t.Optional(t.String()),
        period: t.Union([t.Literal('monthly'), t.Literal('quarterly'), t.Literal('yearly')]),
        startDate: t.String(),
        endDate: t.String(),
        targetAmount: t.Number({ minimum: 0 }),
      }),
    }
  )

  /** GET /api/v1/sales/targets */
  .get('/targets', async ({ query, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;
      const period = query.period as any;

      if (!period) {
        set.status = 400;
        return { success: false, error: 'Period is required' };
      }

      const targets = await TargetsService.getTargetsByPeriod(period, tenantId);

      return { success: true, data: targets };
    } catch (error) {
      set.status = 500;
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  })

  /** POST /api/v1/sales/targets/update-progress */
  .post('/targets/update-progress', async ({ query, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;
      const userId = query.userId || null;

      const targets = await TargetsService.updateTargetProgress(userId, tenantId);

      return { success: true, data: targets };
    } catch (error) {
      set.status = 500;
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  })

  /** GET /api/v1/sales/targets/:userId/performance */
  .get('/targets/:userId/performance', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;
      const performance = await TargetsService.getUserPerformance(params.userId, tenantId);

      return { success: true, data: performance };
    } catch (error) {
      set.status = 500;
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  })

  /** GET /api/v1/sales/leaderboard */
  .get('/leaderboard', async ({ set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;
      const leaderboard = await TargetsService.getAllUserPerformances(tenantId);

      return { success: true, data: leaderboard };
    } catch (error) {
      set.status = 500;
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
