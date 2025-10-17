/**
 * P2P Dispute Service
 */

import { db } from '../../../db';
import { p2pDisputes } from '../schema/p2p.schema';
import { eq } from 'drizzle-orm';
import type { CreateDisputeRequest, DisputeResponse, ServiceResponse } from '../types/p2p.types';
// import { analyzeDispute } from '../utils/dispute-resolver';

export async function createDispute(request: CreateDisputeRequest): Promise<ServiceResponse<DisputeResponse>> {
  try {
    const dispute = await db.insert(p2pDisputes).values({
      tenantId: request.tenantId,
      tradeId: request.tradeId,
      openedBy: request.openedBy,
      reason: request.reason,
      description: request.description,
      evidence: request.evidence || [],
      status: 'open',
    }).returning();

    return { success: true, data: dispute[0] as DisputeResponse };
  } catch (error) {
    return { success: false, error: 'Failed to create dispute', code: 'CREATE_DISPUTE_FAILED' };
  }
}

export async function resolveDispute(
  disputeId: string,
  resolvedBy: string,
  resolution: string,
  favorOf: string
): Promise<ServiceResponse<DisputeResponse>> {
  try {
    const updated = await db.update(p2pDisputes).set({
      status: 'resolved',
      assignedTo: resolvedBy,
      resolution,
      resolvedInFavorOf: favorOf,
      resolvedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(p2pDisputes.id, disputeId)).returning();

    return { success: true, data: updated[0] as DisputeResponse };
  } catch (error) {
    return { success: false, error: 'Failed to resolve dispute', code: 'RESOLVE_DISPUTE_FAILED' };
  }
}
