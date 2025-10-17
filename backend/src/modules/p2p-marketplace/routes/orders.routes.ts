/**
 * P2P Orders Routes
 */

import { Elysia, t } from 'elysia';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import * as orderService from '../services/order.service';

export const p2pOrdersRoutes = new Elysia({ prefix: '/api/v1/p2p/orders' })
  .use(sessionGuard)
  .use(requireTenant)

  // Create order
  .post('/', async ({ body, user, tenantId }) => {
    return await orderService.createOrder({
      ...body,
      tenantId,
      userId: user.id,
    });
  }, {
    body: t.Object({
      orderType: t.Union([t.Literal('buy'), t.Literal('sell')]),
      cryptocurrency: t.String(),
      fiatCurrency: t.String(),
      priceType: t.Union([t.Literal('market'), t.Literal('limit'), t.Literal('floating')]),
      price: t.Optional(t.Number()),
      priceMargin: t.Optional(t.Number()),
      minAmount: t.Number(),
      maxAmount: t.Number(),
      availableAmount: t.Number(),
      paymentTimeLimit: t.Optional(t.Number()),
      paymentMethods: t.Array(t.String()),
      terms: t.Optional(t.String()),
      autoReply: t.Optional(t.String()),
      minTradeCount: t.Optional(t.Number()),
      minCompletionRate: t.Optional(t.Number()),
      verifiedUsersOnly: t.Optional(t.Boolean()),
    }),
  })

  // List orders
  .get('/', async ({ query, tenantId }) => {
    return await orderService.listOrders(tenantId, query);
  }, {
    query: t.Object({
      orderType: t.Optional(t.Union([t.Literal('buy'), t.Literal('sell')])),
      cryptocurrency: t.Optional(t.String()),
      fiatCurrency: t.Optional(t.String()),
      status: t.Optional(t.Union([
        t.Literal('active'),
        t.Literal('inactive'),
        t.Literal('completed'),
        t.Literal('cancelled'),
        t.Literal('expired'),
      ])),
      limit: t.Optional(t.Number()),
      offset: t.Optional(t.Number()),
    }),
  })

  // Get order
  .get('/:id', async ({ params, tenantId }) => {
    return await orderService.getOrderById(params.id, tenantId);
  })

  // Update order
  .patch('/:id', async ({ params, body, user, tenantId }) => {
    return await orderService.updateOrder(params.id, tenantId, user.id, body);
  }, {
    body: t.Object({
      price: t.Optional(t.Number()),
      priceMargin: t.Optional(t.Number()),
      minAmount: t.Optional(t.Number()),
      maxAmount: t.Optional(t.Number()),
      availableAmount: t.Optional(t.Number()),
      paymentMethods: t.Optional(t.Array(t.String())),
      terms: t.Optional(t.String()),
    }),
  })

  // Cancel order
  .delete('/:id', async ({ params, user, tenantId }) => {
    return await orderService.cancelOrder(params.id, tenantId, user.id);
  });
