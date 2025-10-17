/**
 * P2P Disputes Routes
 */

import { Elysia, t } from 'elysia';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import * as disputeService from '../services/dispute.service';

export const p2pDisputesRoutes = new Elysia({ prefix: '/api/v1/p2p/disputes' })
  .use(sessionGuard)
  .use(requireTenant)

  // Create dispute
  .post('/', async ({ body, user, tenantId }) => {
    return await disputeService.createDispute({ ...body, tenantId, openedBy: user.id });
  }, {
    body: t.Object({
      tradeId: t.String(),
      reason: t.Union([
        t.Literal('payment_not_received'),
        t.Literal('payment_incorrect'),
        t.Literal('fraud'),
        t.Literal('other'),
      ]),
      description: t.String(),
      evidence: t.Optional(t.Array(t.Any())),
    }),
  })

  // Resolve dispute (admin only)
  .post('/:id/resolve', async ({ params, body, user }) => {
    return await disputeService.resolveDispute(
      params.id,
      user.id,
      body.resolution,
      body.favorOf
    );
  }, {
    body: t.Object({
      resolution: t.String(),
      favorOf: t.String(),
    }),
  });
