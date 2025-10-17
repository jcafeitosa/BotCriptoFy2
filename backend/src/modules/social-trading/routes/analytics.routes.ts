/**
 * Analytics Routes
 */

import { Elysia, t } from 'elysia';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import * as performanceService from '../services/performance.service';

export const socialAnalyticsRoutes = new Elysia({ prefix: '/api/v1/social/analytics' })
  .use(sessionGuard)
  .use(requireTenant)

  .get('/traders/:id/performance', async ({ params, query, tenantId }) => {
    return await performanceService.getPerformance(
      params.id,
      tenantId,
      query.period || 'monthly'
    );
  }, {
    query: t.Object({
      period: t.Optional(t.Union([
        t.Literal('daily'),
        t.Literal('weekly'),
        t.Literal('monthly'),
        t.Literal('yearly'),
        t.Literal('all_time'),
      ])),
    }),
  });
