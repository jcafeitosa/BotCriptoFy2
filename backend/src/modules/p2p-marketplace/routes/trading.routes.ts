/**
 * P2P Trading Routes
 */

import { Elysia, t } from 'elysia';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import * as tradeService from '../services/trade.service';
import * as matchingService from '../services/matching.service';

export const p2pTradingRoutes = new Elysia({ prefix: '/api/v1/p2p/trading' })
  .use(sessionGuard)
  .use(requireTenant)

  // Create trade
  .post('/', async ({ body, user, tenantId }) => {
    return await tradeService.createTrade({ ...body, tenantId, buyerId: user.id });
  }, {
    body: t.Object({
      orderId: t.String(),
      sellerId: t.String(),
      cryptoAmount: t.Number(),
      fiatAmount: t.Number(),
      price: t.Number(),
      paymentMethod: t.String(),
      paymentDetails: t.Any(),
    }),
  })

  // Confirm payment sent
  .post('/:id/payment-sent', async ({ params, user }) => {
    return await tradeService.confirmPaymentSent(params.id, user.id);
  })

  // Confirm payment received
  .post('/:id/payment-received', async ({ params, user }) => {
    return await tradeService.confirmPaymentReceived(params.id, user.id);
  })

  // Complete trade
  .post('/:id/complete', async ({ params }) => {
    return await tradeService.completeTrade(params.id);
  })

  // Find matching orders
  .post('/match', async ({ body, tenantId }) => {
    return await matchingService.findMatchingOrders(body, tenantId);
  }, {
    body: t.Object({
      amount: t.Number(),
      fiatCurrency: t.String(),
      cryptocurrency: t.String(),
      paymentMethods: t.Array(t.String()),
    }),
  });
