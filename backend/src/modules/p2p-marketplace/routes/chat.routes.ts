/**
 * P2P Chat Routes
 */

import { Elysia, t } from 'elysia';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import * as chatService from '../services/chat.service';

export const p2pChatRoutes = new Elysia({ prefix: '/api/v1/p2p/chat' })
  .use(sessionGuard)
  .use(requireTenant)

  // Send message
  .post('/', async ({ body, user, tenantId }) => {
    return await chatService.sendMessage({ ...body, tenantId, senderId: user.id });
  }, {
    body: t.Object({
      tradeId: t.String(),
      recipientId: t.String(),
      message: t.String(),
      attachments: t.Optional(t.Array(t.Any())),
    }),
  })

  // Get trade messages
  .get('/:tradeId', async ({ params, user }) => {
    return await chatService.getTradeMessages(params.tradeId, user.id);
  })

  // Mark as read
  .post('/:messageId/read', async ({ params, user }) => {
    return await chatService.markAsRead(params.messageId, user.id);
  });
