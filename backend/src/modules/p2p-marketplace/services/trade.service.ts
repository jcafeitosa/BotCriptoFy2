/**
 * P2P Trade Service
 *
 * Handles trade execution and lifecycle
 */

import { db } from '../../../db';
import { p2pTrades, p2pOrders } from '../schema/p2p.schema';
import { eq } from 'drizzle-orm';
import type { CreateTradeRequest, TradeResponse, ServiceResponse } from '../types/p2p.types';
import { logAuditEvent } from '@/modules/audit/services/audit-logger.service';
import { deductAvailableAmount } from './order.service';
import { lockEscrow } from './escrow.service';
import { calculateMakerFee, calculateTakerFee } from '../utils/escrow-calculator';

export async function createTrade(request: CreateTradeRequest): Promise<ServiceResponse<TradeResponse>> {
  try {
    // Calculate fees
    const makerFee = calculateMakerFee(request.cryptoAmount);
    const takerFee = calculateTakerFee(request.cryptoAmount);

    // Calculate payment deadline
    const order = await db.query.p2pOrders.findFirst({
      where: eq(p2pOrders.id, request.orderId),
    });

    if (!order) {
      return { success: false, error: 'Order not found', code: 'ORDER_NOT_FOUND' };
    }

    const paymentDeadline = new Date();
    paymentDeadline.setMinutes(paymentDeadline.getMinutes() + order.paymentTimeLimit);

    // Create trade
    const trade = await db.insert(p2pTrades).values({
      tenantId: request.tenantId,
      orderId: request.orderId,
      sellerId: request.sellerId,
      buyerId: request.buyerId,
      cryptocurrency: order.cryptocurrency,
      cryptoAmount: request.cryptoAmount.toString(),
      fiatCurrency: order.fiatCurrency,
      fiatAmount: request.fiatAmount.toString(),
      price: request.price.toString(),
      paymentMethod: request.paymentMethod,
      paymentDetails: request.paymentDetails,
      status: 'pending',
      makerFee: makerFee.toString(),
      takerFee: takerFee.toString(),
      paymentDeadline,
    }).returning();

    // Deduct from order
    await deductAvailableAmount(request.orderId, request.cryptoAmount);

    // Lock funds in escrow
    await lockEscrow({
      tenantId: request.tenantId,
      tradeId: trade[0].id,
      cryptocurrency: order.cryptocurrency,
      amount: request.cryptoAmount,
      holderId: request.sellerId,
    });

    await logAuditEvent({
      eventType: 'p2p.trade_created',
      severity: 'medium',
      status: 'success',
      userId: request.buyerId,
      tenantId: request.tenantId,
      resource: 'p2p_trades',
      resourceId: trade[0].id,
      action: 'create',
      metadata: { orderId: request.orderId, amount: request.cryptoAmount },
    });

    return { success: true, data: trade[0] as TradeResponse };
  } catch (error) {
    console.error('Error creating trade:', error);
    return { success: false, error: 'Failed to create trade', code: 'CREATE_TRADE_FAILED' };
  }
}

export async function confirmPaymentSent(tradeId: string, userId: string): Promise<ServiceResponse<TradeResponse>> {
  const trade = await db.query.p2pTrades.findFirst({ where: eq(p2pTrades.id, tradeId) });
  if (!trade || trade.buyerId !== userId) {
    return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' };
  }

  const updated = await db.update(p2pTrades).set({
    status: 'payment_sent',
    paymentSentAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(p2pTrades.id, tradeId)).returning();

  return { success: true, data: updated[0] as TradeResponse };
}

export async function confirmPaymentReceived(tradeId: string, userId: string): Promise<ServiceResponse<TradeResponse>> {
  const trade = await db.query.p2pTrades.findFirst({ where: eq(p2pTrades.id, tradeId) });
  if (!trade || trade.sellerId !== userId) {
    return { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' };
  }

  const updated = await db.update(p2pTrades).set({
    status: 'payment_confirmed',
    paymentConfirmedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(p2pTrades.id, tradeId)).returning();

  return { success: true, data: updated[0] as TradeResponse };
}

export async function completeTrade(tradeId: string): Promise<ServiceResponse<TradeResponse>> {
  const updated = await db.update(p2pTrades).set({
    status: 'completed',
    completedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(p2pTrades.id, tradeId)).returning();

  // Release escrow would be called here
  return { success: true, data: updated[0] as TradeResponse };
}
