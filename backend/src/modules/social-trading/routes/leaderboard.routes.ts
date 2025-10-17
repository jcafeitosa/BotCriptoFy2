/**
 * Leaderboard Routes
 */

import { Elysia, t } from 'elysia';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import * as leaderboardService from '../services/leaderboard.service';

export const socialLeaderboardRoutes = new Elysia({ prefix: '/api/v1/social/leaderboard' })
  .use(sessionGuard)
  .use(requireTenant)

  .get('/', async ({ query, tenantId }) => {
    return await leaderboardService.getLeaderboard(
      tenantId,
      query.period || 'monthly',
      query.limit || 50
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
      limit: t.Optional(t.Number()),
    }),
  });
