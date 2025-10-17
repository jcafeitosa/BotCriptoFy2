/**
 * Copy Trading Routes
 */

import { Elysia, t } from 'elysia';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import * as copyService from '../services/copy-trading.service';

export const socialCopyRoutes = new Elysia({ prefix: '/api/v1/social/copy' })
  .use(sessionGuard)
  .use(requireTenant)

  .post('/settings', async ({ body, user, tenantId }) => {
    return await copyService.createCopySettings({ ...body, tenantId, copierId: user.id });
  }, {
    body: t.Object({
      traderId: t.String(),
      copyRatio: t.Optional(t.Number()),
      maxAmountPerTrade: t.Optional(t.Number()),
      maxDailyLoss: t.Optional(t.Number()),
      copiedPairs: t.Optional(t.Array(t.String())),
      stopLossPercentage: t.Optional(t.Number()),
      takeProfitPercentage: t.Optional(t.Number()),
    }),
  });
