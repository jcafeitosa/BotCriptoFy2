/**
 * P2P Escrow Service
 */

import { db } from '../../../db';
import { p2pEscrow } from '../schema/p2p.schema';
import { eq } from 'drizzle-orm';
import type { EscrowLockRequest, EscrowReleaseRequest, EscrowResponse, ServiceResponse } from '../types/p2p.types';

export async function lockEscrow(request: EscrowLockRequest): Promise<ServiceResponse<EscrowResponse>> {
  try {
    const escrow = await db.insert(p2pEscrow).values({
      tenantId: request.tenantId,
      tradeId: request.tradeId,
      cryptocurrency: request.cryptocurrency,
      amount: request.amount.toString(),
      holderId: request.holderId,
      status: 'locked',
      lockedAt: new Date(),
    }).returning();

    return { success: true, data: escrow[0] as EscrowResponse };
  } catch (error) {
    return { success: false, error: 'Failed to lock escrow', code: 'LOCK_ESCROW_FAILED' };
  }
}

export async function releaseEscrow(request: EscrowReleaseRequest): Promise<ServiceResponse<EscrowResponse>> {
  try {
    const updated = await db.update(p2pEscrow).set({
      status: 'released',
      releasedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(p2pEscrow.tradeId, request.tradeId)).returning();

    return { success: true, data: updated[0] as EscrowResponse };
  } catch (error) {
    return { success: false, error: 'Failed to release escrow', code: 'RELEASE_ESCROW_FAILED' };
  }
}

export async function refundEscrow(tradeId: string): Promise<ServiceResponse<EscrowResponse>> {
  try {
    const updated = await db.update(p2pEscrow).set({
      status: 'refunded',
      refundedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(p2pEscrow.tradeId, tradeId)).returning();

    return { success: true, data: updated[0] as EscrowResponse };
  } catch (error) {
    return { success: false, error: 'Failed to refund escrow', code: 'REFUND_ESCROW_FAILED' };
  }
}
