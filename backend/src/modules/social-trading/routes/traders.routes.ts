/**
 * Traders Routes
 */

import { Elysia, t } from 'elysia';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import * as traderService from '../services/trader.service';

export const socialTradersRoutes = new Elysia({ prefix: '/api/v1/social/traders' })
  .use(sessionGuard)
  .use(requireTenant)

  .post('/', async ({ body, user, tenantId }) => {
    return await traderService.createTrader({ ...body, tenantId, userId: user.id });
  }, {
    body: t.Object({
      displayName: t.String(),
      bio: t.Optional(t.String()),
      specialties: t.Optional(t.Array(t.String())),
      strategyType: t.Optional(t.Union([
        t.Literal('scalping'),
        t.Literal('day_trading'),
        t.Literal('swing'),
        t.Literal('position'),
      ])),
    }),
  })

  .get('/', async ({ query, tenantId }) => {
    return await traderService.listTraders(tenantId, query);
  })

  .get('/:id', async ({ params, tenantId }) => {
    return await traderService.getTrader(params.id, tenantId);
  });
