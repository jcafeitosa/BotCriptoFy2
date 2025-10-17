/**
 * P2P Reputation Routes
 */

import { Elysia, t } from 'elysia';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import * as reputationService from '../services/reputation.service';

export const p2pReputationRoutes = new Elysia({ prefix: '/api/v1/p2p/reputation' })
  .use(sessionGuard)
  .use(requireTenant)

  // Create review
  .post('/', async ({ body, user, tenantId }) => {
    return await reputationService.createReputation({ ...body, tenantId, reviewerId: user.id });
  }, {
    body: t.Object({
      tradeId: t.String(),
      reviewedUserId: t.String(),
      rating: t.Number({ minimum: 1, maximum: 5 }),
      comment: t.Optional(t.String()),
    }),
  })

  // Get user stats
  .get('/users/:userId/stats', async ({ params, tenantId }) => {
    return await reputationService.getUserStats(params.userId, tenantId);
  });
