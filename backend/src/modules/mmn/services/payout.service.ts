/**
 * MMN Payout Service
 * Manages payout requests and processing
 */

import { db } from '@/db';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import logger from '@/utils/logger';
import { NotFoundError, BadRequestError } from '@/utils/errors';
import {
  mmnPayouts,
  mmnTree,
  mmnConfig,
  mmnCommissions,
  type MmnPayout,
  type NewMmnPayout,
} from '../schema/mmn.schema';
import { CommissionService } from './commission.service';
import type { PayoutStatus } from '../types/mmn.types';

export class PayoutService {
  /**
   * Request payout for accumulated commissions
   */
  static async requestPayout(
    userId: string,
    tenantId: string,
    amount: number,
    method: 'stripe' | 'bank_transfer' | 'pix',
    bankInfo?: {
      bankName?: string;
      accountNumber?: string;
      routingNumber?: string;
      pixKey?: string;
    }
  ): Promise<MmnPayout> {
    logger.info('Requesting payout', { userId, amount, method });

    // Get member node
    const [member] = await db
      .select()
      .from(mmnTree)
      .where(
        and(
          eq(mmnTree.userId, userId),
          eq(mmnTree.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!member) {
      throw new NotFoundError('Member not found in MMN tree');
    }

    // Get MMN config for minimum payout check
    const [config] = await db
      .select()
      .from(mmnConfig)
      .where(eq(mmnConfig.tenantId, tenantId))
      .limit(1);

    if (!config) {
      throw new NotFoundError('MMN config not found');
    }

    const minimumPayout = parseFloat(config.minimumPayout || '50');

    if (amount < minimumPayout) {
      throw new BadRequestError(
        `Minimum payout amount is ${minimumPayout}`
      );
    }

    // Get approved commissions
    const approvedCommissions = await CommissionService.getApprovedCommissions(member.id);

    const availableBalance = approvedCommissions.reduce(
      (sum, c) => sum + parseFloat(c.amount),
      0
    );

    if (amount > availableBalance) {
      throw new BadRequestError(
        `Insufficient balance. Available: ${availableBalance}, Requested: ${amount}`
      );
    }

    // Calculate which commissions to include
    const commissionIds: string[] = [];
    let totalAmount = 0;

    for (const commission of approvedCommissions) {
      if (totalAmount + parseFloat(commission.amount) <= amount) {
        commissionIds.push(commission.id);
        totalAmount += parseFloat(commission.amount);
      }

      if (totalAmount >= amount) {
        break;
      }
    }

    // Calculate fee (example: 2% for bank transfer, 3% for Stripe, 1% for PIX)
    let feePercentage = 0;
    if (method === 'stripe') feePercentage = 3;
    else if (method === 'bank_transfer') feePercentage = 2;
    else if (method === 'pix') feePercentage = 1;

    const fee = (totalAmount * feePercentage) / 100;
    const netAmount = totalAmount - fee;

    // Create payout request
    const newPayout: NewMmnPayout = {
      memberId: member.id,
      amount: totalAmount.toString(),
      currency: 'BRL',
      method,
      commissionIds: commissionIds as any,
      bankInfo: bankInfo as any,
      fee: fee.toString(),
      netAmount: netAmount.toString(),
      status: 'pending',
    };

    const [payout] = await db.insert(mmnPayouts).values(newPayout).returning();

    // Mark commissions as paid (associated with payout)
    for (const commissionId of commissionIds) {
      await CommissionService.markAsPaid(commissionId, payout.id);
    }

    logger.info('Payout requested', {
      payoutId: payout.id,
      amount: totalAmount,
      netAmount,
      commissionsCount: commissionIds.length,
    });

    return payout;
  }

  /**
   * Process payout (admin/system)
   */
  static async processPayout(
    payoutId: string,
    stripeTransferId?: string,
    stripeAccountId?: string
  ): Promise<MmnPayout> {
    logger.info('Processing payout', { payoutId });

    const [payout] = await db
      .select()
      .from(mmnPayouts)
      .where(eq(mmnPayouts.id, payoutId))
      .limit(1);

    if (!payout) {
      throw new NotFoundError('Payout not found');
    }

    if (payout.status !== 'pending') {
      throw new BadRequestError(`Payout status is ${payout.status}, cannot process`);
    }

    // Update to processing
    const [updated] = await db
      .update(mmnPayouts)
      .set({
        status: 'processing',
        processedAt: new Date(),
        stripeTransferId,
        stripeAccountId,
        updatedAt: new Date(),
      })
      .where(eq(mmnPayouts.id, payoutId))
      .returning();

    logger.info('Payout processing started', { payoutId });

    // TODO: Integrate with payment provider (Stripe, PIX, etc.)
    // For now, we just mark as processing
    // In production, this would trigger actual payment

    return updated;
  }

  /**
   * Complete payout (mark as completed)
   */
  static async completePayout(payoutId: string): Promise<MmnPayout> {
    logger.info('Completing payout', { payoutId });

    const [updated] = await db
      .update(mmnPayouts)
      .set({
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(mmnPayouts.id, payoutId))
      .returning();

    if (!updated) {
      throw new NotFoundError('Payout not found');
    }

    logger.info('Payout completed', { payoutId });

    return updated;
  }

  /**
   * Fail payout (mark as failed with reason)
   */
  static async failPayout(
    payoutId: string,
    failureReason: string
  ): Promise<MmnPayout> {
    logger.info('Failing payout', { payoutId, failureReason });

    // Get payout
    const [payout] = await db
      .select()
      .from(mmnPayouts)
      .where(eq(mmnPayouts.id, payoutId))
      .limit(1);

    if (!payout) {
      throw new NotFoundError('Payout not found');
    }

    // Update payout status
    const [updated] = await db
      .update(mmnPayouts)
      .set({
        status: 'failed',
        failedAt: new Date(),
        failureReason,
        updatedAt: new Date(),
      })
      .where(eq(mmnPayouts.id, payoutId))
      .returning();

    // Revert commission status back to approved
    const commissionIds = payout.commissionIds as unknown as string[];

    await db
      .update(mmnCommissions)
      .set({
        status: 'approved',
        payoutId: null,
        paidAt: null,
        updatedAt: new Date(),
      })
      .where(inArray(mmnCommissions.id, commissionIds));

    logger.info('Payout failed and commissions reverted', { payoutId });

    return updated;
  }

  /**
   * Cancel payout (user-initiated before processing)
   */
  static async cancelPayout(
    payoutId: string,
    userId: string,
    tenantId: string
  ): Promise<MmnPayout> {
    logger.info('Cancelling payout', { payoutId, userId });

    // Get payout
    const [payout] = await db
      .select({
        payout: mmnPayouts,
        member: mmnTree,
      })
      .from(mmnPayouts)
      .innerJoin(mmnTree, eq(mmnPayouts.memberId, mmnTree.id))
      .where(
        and(
          eq(mmnPayouts.id, payoutId),
          eq(mmnTree.userId, userId),
          eq(mmnTree.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!payout) {
      throw new NotFoundError('Payout not found or unauthorized');
    }

    if (payout.payout.status !== 'pending') {
      throw new BadRequestError(
        'Can only cancel pending payouts'
      );
    }

    // Update payout status
    const [updated] = await db
      .update(mmnPayouts)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(mmnPayouts.id, payoutId))
      .returning();

    // Revert commission status back to approved
    const commissionIds = payout.payout.commissionIds as unknown as string[];

    await db
      .update(mmnCommissions)
      .set({
        status: 'approved',
        payoutId: null,
        paidAt: null,
        updatedAt: new Date(),
      })
      .where(inArray(mmnCommissions.id, commissionIds));

    logger.info('Payout cancelled', { payoutId });

    return updated;
  }

  /**
   * Get payouts for member
   */
  static async getPayouts(
    userId: string,
    tenantId: string,
    filters?: {
      status?: PayoutStatus[];
      limit?: number;
    }
  ): Promise<MmnPayout[]> {
    const conditions = [
      eq(mmnTree.userId, userId),
      eq(mmnTree.tenantId, tenantId),
    ];

    if (filters?.status && filters.status.length > 0) {
      conditions.push(inArray(mmnPayouts.status, filters.status));
    }

    const results = await db
      .select({
        payout: mmnPayouts,
      })
      .from(mmnPayouts)
      .innerJoin(mmnTree, eq(mmnPayouts.memberId, mmnTree.id))
      .where(and(...conditions))
      .orderBy(desc(mmnPayouts.createdAt))
      .limit(filters?.limit || 50);

    return results.map(r => r.payout);
  }

  /**
   * Get payout by ID
   */
  static async getPayoutById(
    payoutId: string,
    userId?: string,
    tenantId?: string
  ): Promise<MmnPayout> {
    if (userId && tenantId) {
      // User-specific query (authorization check)
      const [result] = await db
        .select({
          payout: mmnPayouts,
        })
        .from(mmnPayouts)
        .innerJoin(mmnTree, eq(mmnPayouts.memberId, mmnTree.id))
        .where(
          and(
            eq(mmnPayouts.id, payoutId),
            eq(mmnTree.userId, userId),
            eq(mmnTree.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!result) {
        throw new NotFoundError('Payout not found or unauthorized');
      }

      return result.payout;
    } else {
      // Admin query (no authorization check)
      const [payout] = await db
        .select()
        .from(mmnPayouts)
        .where(eq(mmnPayouts.id, payoutId))
        .limit(1);

      if (!payout) {
        throw new NotFoundError('Payout not found');
      }

      return payout;
    }
  }

  /**
   * Get payout statistics for member
   */
  static async getPayoutStats(
    userId: string,
    tenantId: string
  ): Promise<{
    totalPaid: number;
    totalPending: number;
    totalFailed: number;
    payoutCount: number;
    averageAmount: number;
  }> {
    const [member] = await db
      .select()
      .from(mmnTree)
      .where(
        and(
          eq(mmnTree.userId, userId),
          eq(mmnTree.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!member) {
      return {
        totalPaid: 0,
        totalPending: 0,
        totalFailed: 0,
        payoutCount: 0,
        averageAmount: 0,
      };
    }

    const [stats] = await db
      .select({
        totalPaid: sql<string>`COALESCE(SUM(CASE WHEN ${mmnPayouts.status} = 'completed' THEN ${mmnPayouts.amount} ELSE 0 END), 0)`,
        totalPending: sql<string>`COALESCE(SUM(CASE WHEN ${mmnPayouts.status} IN ('pending', 'processing') THEN ${mmnPayouts.amount} ELSE 0 END), 0)`,
        totalFailed: sql<string>`COALESCE(SUM(CASE WHEN ${mmnPayouts.status} = 'failed' THEN ${mmnPayouts.amount} ELSE 0 END), 0)`,
        payoutCount: sql<number>`COUNT(*)::int`,
        averageAmount: sql<string>`COALESCE(AVG(${mmnPayouts.amount}), 0)`,
      })
      .from(mmnPayouts)
      .where(eq(mmnPayouts.memberId, member.id));

    return {
      totalPaid: parseFloat(stats.totalPaid || '0'),
      totalPending: parseFloat(stats.totalPending || '0'),
      totalFailed: parseFloat(stats.totalFailed || '0'),
      payoutCount: stats.payoutCount || 0,
      averageAmount: parseFloat(stats.averageAmount || '0'),
    };
  }

  /**
   * Get all pending payouts (admin)
   */
  static async getPendingPayouts(tenantId: string): Promise<MmnPayout[]> {
    const results = await db
      .select({
        payout: mmnPayouts,
      })
      .from(mmnPayouts)
      .innerJoin(mmnTree, eq(mmnPayouts.memberId, mmnTree.id))
      .where(
        and(
          eq(mmnTree.tenantId, tenantId),
          eq(mmnPayouts.status, 'pending')
        )
      )
      .orderBy(mmnPayouts.createdAt);

    return results.map(r => r.payout);
  }

  /**
   * Get total payout statistics for tenant (admin)
   */
  static async getTenantPayoutStats(
    tenantId: string,
    period?: { start: Date; end: Date }
  ): Promise<{
    totalPaid: number;
    totalPending: number;
    totalFailed: number;
    payoutCount: number;
    memberCount: number;
  }> {
    const conditions = [eq(mmnTree.tenantId, tenantId)];

    if (period) {
      conditions.push(
        and(
          sql`${mmnPayouts.createdAt} >= ${period.start}`,
          sql`${mmnPayouts.createdAt} <= ${period.end}`
        )!
      );
    }

    const [stats] = await db
      .select({
        totalPaid: sql<string>`COALESCE(SUM(CASE WHEN ${mmnPayouts.status} = 'completed' THEN ${mmnPayouts.amount} ELSE 0 END), 0)`,
        totalPending: sql<string>`COALESCE(SUM(CASE WHEN ${mmnPayouts.status} IN ('pending', 'processing') THEN ${mmnPayouts.amount} ELSE 0 END), 0)`,
        totalFailed: sql<string>`COALESCE(SUM(CASE WHEN ${mmnPayouts.status} = 'failed' THEN ${mmnPayouts.amount} ELSE 0 END), 0)`,
        payoutCount: sql<number>`COUNT(*)::int`,
        memberCount: sql<number>`COUNT(DISTINCT ${mmnPayouts.memberId})::int`,
      })
      .from(mmnPayouts)
      .innerJoin(mmnTree, eq(mmnPayouts.memberId, mmnTree.id))
      .where(and(...conditions));

    return {
      totalPaid: parseFloat(stats.totalPaid || '0'),
      totalPending: parseFloat(stats.totalPending || '0'),
      totalFailed: parseFloat(stats.totalFailed || '0'),
      payoutCount: stats.payoutCount || 0,
      memberCount: stats.memberCount || 0,
    };
  }
}
