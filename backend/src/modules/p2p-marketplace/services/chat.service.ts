/**
 * P2P Chat Service
 */

import { db } from '../../../db';
import { p2pMessages } from '../schema/p2p.schema';
import { eq, and, or, desc } from 'drizzle-orm';
import type { SendMessageRequest, MessageResponse, ServiceResponse } from '../types/p2p.types';

export async function sendMessage(request: SendMessageRequest): Promise<ServiceResponse<MessageResponse>> {
  try {
    const message = await db.insert(p2pMessages).values({
      tenantId: request.tenantId,
      tradeId: request.tradeId,
      senderId: request.senderId,
      recipientId: request.recipientId,
      message: request.message,
      attachments: request.attachments || [],
      isRead: false,
      isSystem: false,
    }).returning();

    return { success: true, data: message[0] as MessageResponse };
  } catch (error) {
    return { success: false, error: 'Failed to send message', code: 'SEND_MESSAGE_FAILED' };
  }
}

export async function getTradeMessages(tradeId: string, userId: string): Promise<ServiceResponse<MessageResponse[]>> {
  try {
    const messages = await db.select().from(p2pMessages)
      .where(and(
        eq(p2pMessages.tradeId, tradeId),
        or(eq(p2pMessages.senderId, userId), eq(p2pMessages.recipientId, userId))
      ))
      .orderBy(desc(p2pMessages.createdAt));

    return { success: true, data: messages as MessageResponse[] };
  } catch (error) {
    return { success: false, error: 'Failed to get messages', code: 'GET_MESSAGES_FAILED' };
  }
}

export async function markAsRead(messageId: string, userId: string): Promise<ServiceResponse<boolean>> {
  try {
    await db.update(p2pMessages).set({
      isRead: true,
      readAt: new Date(),
    }).where(and(eq(p2pMessages.id, messageId), eq(p2pMessages.recipientId, userId)));

    return { success: true, data: true };
  } catch (error) {
    return { success: false, error: 'Failed to mark as read', code: 'MARK_READ_FAILED' };
  }
}
