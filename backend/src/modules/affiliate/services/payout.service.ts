/**
 * Affiliate Payout Service
 * Manages payouts to affiliates via Stripe Connect
 */

import { db } from '@/db';
import { eq, and, desc, sql, inArray, gte, lte } from 'drizzle-orm';
import logger from '@/utils/logger';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import {
  affiliatePayouts,
  affiliateCommissions,
  affiliateProfiles,
  type AffiliatePayout,
  type NewAffiliatePayout,
} from '../schema/affiliate.schema';
import { AffiliateCommissionService } from './commission.service';
import type { RequestPayoutData, PayoutFilters, PaginationOptions, PaginatedResponse } from '../types/affiliate.types';

export class AffiliatePayoutService {
  /**
   * Request payout
   */
  static async requestPayout(affiliateId: string, data: RequestPayoutData): Promise<AffiliatePayout> {
    logger.info('Requesting payout', { affiliateId, amount: data.amount });

    // Get affiliate profile
    const [profile] = await db
      .select()
      .from(affiliateProfiles)
      .where(eq(affiliateProfiles.id, affiliateId))
      .limit(1);

    if (!profile) {
      throw new NotFoundError('Affiliate profile not found');
    }

    // Check minimum payout amount
    const minimum = parseFloat(profile.payoutMinimum || '100');
    if (data.amount < minimum) {
      throw new BadRequestError(`Minimum payout amount is ${minimum}`);
    }

    // Get approved commissions
    const commissions = await AffiliateCommissionService.getApprovedCommissions(affiliateId);
    const totalAvailable = commissions.reduce(
      (sum, c) => sum + parseFloat(c.amount),
      0
    );

    if (data.amount > totalAvailable) {
      throw new BadRequestError(`Insufficient balance. Available: ${totalAvailable}`);
    }

    // Select commissions for payout
    let remaining = data.amount;
    const selectedCommissions: string[] = [];

    for (const commission of commissions) {
      if (remaining <= 0) break;
      const amount = parseFloat(commission.amount);
      if (amount <= remaining) {
        selectedCommissions.push(commission.id);
        remaining -= amount;
      }
    }

    // Calculate fee (example: 2.5%)
    const feeRate = 0.025;
    const fee = Math.round(data.amount * feeRate * 100) / 100;
    const netAmount = data.amount - fee;

    // Create payout
    const newPayout: NewAffiliatePayout = {
      affiliateId,
      amount: data.amount.toString(),
      currency: profile.currency || 'BRL',
      method: data.method,
      stripeAccountId: profile.stripeAccountId || undefined,
      bankInfo: data.bankInfo,
      status: 'pending',
      commissionIds: selectedCommissions,
      fee: fee.toString(),
      netAmount: netAmount.toString(),
      notes: data.notes,
    };

    const [payout] = await db.insert(affiliatePayouts).values(newPayout).returning();

    // Mark commissions as being paid
    await db
      .update(affiliateCommissions)
      .set({
        payoutId: payout.id,
        status: 'paid',
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(inArray(affiliateCommissions.id, selectedCommissions));

    // Update affiliate profile
    await db
      .update(affiliateProfiles)
      .set({
        pendingBalance: sql`${affiliateProfiles.pendingBalance} - ${data.amount}`,
        updatedAt: new Date(),
      })
      .where(eq(affiliateProfiles.id, affiliateId));

    logger.info('Payout requested', { payoutId: payout.id, amount: data.amount });

    return payout;
  }

  /**
   * Process payout (admin)
   */
  static async processPayout(id: string): Promise<AffiliatePayout> {
    logger.info('Processing payout', { payoutId: id });

    // In a real implementation, this would call Stripe API
    // For now, just mark as processing
    const [updated] = await db
      .update(affiliatePayouts)
      .set({
        status: 'processing',
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(affiliatePayouts.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundError('Payout not found');
    }

    return updated;
  }

  /**
   * Complete payout
   */
  static async completePayout(id: string, stripeTransferId?: string): Promise<AffiliatePayout> {
    const [payout] = await db
      .select()
      .from(affiliatePayouts)
      .where(eq(affiliatePayouts.id, id))
      .limit(1);

    if (!payout) {
      throw new NotFoundError('Payout not found');
    }

    const [updated] = await db
      .update(affiliatePayouts)
      .set({
        status: 'completed',
        completedAt: new Date(),
        stripeTransferId,
        updatedAt: new Date(),
      })
      .where(eq(affiliatePayouts.id, id))
      .returning();

    // Update affiliate total paid
    await db
      .update(affiliateProfiles)
      .set({
        totalPaid: sql`${affiliateProfiles.totalPaid} + ${payout.amount}`,
        updatedAt: new Date(),
      })
      .where(eq(affiliateProfiles.id, payout.affiliateId));

    logger.info('Payout completed', { payoutId: id });

    return updated;
  }

  /**
   * List payouts
   */
  static async listPayouts(
    filters: PayoutFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<AffiliatePayout>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (filters.affiliateId) {
      conditions.push(eq(affiliatePayouts.affiliateId, filters.affiliateId));
    }

    if (filters.status && filters.status.length > 0) {
      conditions.push(inArray(affiliatePayouts.status, filters.status));
    }

    if (filters.method && filters.method.length > 0) {
      conditions.push(inArray(affiliatePayouts.method, filters.method));
    }

    if (filters.dateFrom) {
      conditions.push(gte(affiliatePayouts.createdAt, filters.dateFrom));
    }

    if (filters.dateTo) {
      conditions.push(lte(affiliatePayouts.createdAt, filters.dateTo));
    }

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(affiliatePayouts)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const results = await db
      .select()
      .from(affiliatePayouts)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(affiliatePayouts.createdAt))
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(count / limit);

    return {
      data: results,
      pagination: { page, limit, total: count, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    };
  }
}
