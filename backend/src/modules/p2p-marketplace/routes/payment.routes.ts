/**
 * P2P Payment Methods Routes
 */

import { Elysia, t } from 'elysia';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import * as paymentService from '../services/payment.service';

export const p2pPaymentRoutes = new Elysia({ prefix: '/api/v1/p2p/payment-methods' })
  .use(sessionGuard)
  .use(requireTenant)

  // Create payment method
  .post('/', async ({ body, user, tenantId }) => {
    return await paymentService.createPaymentMethod({ ...body, tenantId, userId: user.id });
  }, {
    body: t.Object({
      methodType: t.String(),
      methodName: t.String(),
      details: t.Any(),
    }),
  })

  // Get user payment methods
  .get('/', async ({ user, tenantId }) => {
    return await paymentService.getUserPaymentMethods(user.id, tenantId);
  });
