/**
 * Affiliate Commission Service
 * Calculates and manages commissions
 */

import { db } from '@/db';
import { eq, and, desc, sql, inArray, gte, lte, isNull } from 'drizzle-orm';
import logger from '@/utils/logger';
import { NotFoundError } from '@/utils/errors';
import {
  affiliateCommissions,
  affiliateConversions,
  affiliateProfiles,
  affiliateTiers,
  type AffiliateCommission,
  type NewAffiliateCommission,
  type AffiliateConversion,
  type NewAffiliateConversion,
} from '../schema/affiliate.schema';
import { calculateCommission, calculateHoldingPeriod } from '../utils/commission-calculator';
import { AffiliateProfileService } from './profile.service';
import type {
  CreateConversionData,
  CommissionFilters,
  PaginationOptions,
  PaginatedResponse,
} from '../types/affiliate.types';

export class AffiliateCommissionService {
  /**
   * Create conversion and calculate commission
   */
  static async createConversion(data: CreateConversionData): Promise<{
    conversion: AffiliateConversion;
    commission: AffiliateCommission;
  }> {
    logger.info('Creating affiliate conversion', {
      affiliateId: data.affiliateId,
      userId: data.userId,
    });

    // Get affiliate profile and tier
    const profile = await AffiliateProfileService.getProfileById(
      data.affiliateId,
      '' // tenantId not needed for this query
    );
    if (!profile) {
      throw new NotFoundError('Affiliate profile not found');
    }

    let tier = null;
    if (profile.tierId) {
      const [tierData] = await db
        .select()
        .from(affiliateTiers)
        .where(eq(affiliateTiers.id, profile.tierId))
        .limit(1);
      tier = tierData || null;
    }

    // Calculate commission first to get the amount
    const calculation = calculateCommission(
      data.orderValue,
      data.commissionRate,
      tier
    );

    // Create conversion
    const newConversion: NewAffiliateConversion = {
      affiliateId: data.affiliateId,
      referralId: data.referralId,
      userId: data.userId,
      conversionType: data.conversionType,
      subscriptionPlanId: data.subscriptionPlanId,
      orderValue: data.orderValue.toString(),
      commissionAmount: calculation.totalAmount.toString(),
      commissionRate: data.commissionRate.toString(),
      stripePaymentId: data.stripePaymentId,
      stripeSubscriptionId: data.stripeSubscriptionId,
      status: 'pending',
      currency: profile.currency || 'BRL',
    };

    const [conversion] = await db
      .insert(affiliateConversions)
      .values(newConversion)
      .returning();

    // Determine holding period
    const isNewCustomer = data.conversionType === 'first_payment';
    const holdUntil = calculateHoldingPeriod(data.orderValue, isNewCustomer);

    // Create commission
    const newCommission: NewAffiliateCommission = {
      affiliateId: data.affiliateId,
      conversionId: conversion.id,
      type: calculation.type,
      amount: calculation.totalAmount.toString(),
      rate: calculation.commissionRate.toString(),
      status: 'pending',
      currency: profile.currency || 'BRL',
      holdUntil,
    };

    const [commission] = await db
      .insert(affiliateCommissions)
      .values(newCommission)
      .returning();

    // Update affiliate profile
    await db
      .update(affiliateProfiles)
      .set({
        totalEarned: sql`${affiliateProfiles.totalEarned} + ${calculation.totalAmount}`,
        pendingBalance: sql`${affiliateProfiles.pendingBalance} + ${calculation.totalAmount}`,
        updatedAt: new Date(),
      })
      .where(eq(affiliateProfiles.id, data.affiliateId));

    logger.info('Conversion and commission created', {
      conversionId: conversion.id,
      commissionId: commission.id,
      amount: calculation.totalAmount,
    });

    return { conversion, commission };
  }

  /**
   * Approve commission (release from hold)
   */
  static async approveCommission(id: string): Promise<AffiliateCommission> {
    logger.info('Approving commission', { commissionId: id });

    const [updated] = await db
      .update(affiliateCommissions)
      .set({
        status: 'approved',
        releaseReason: 'Holding period completed',
        updatedAt: new Date(),
      })
      .where(eq(affiliateCommissions.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundError('Commission not found');
    }

    return updated;
  }

  /**
   * Mark commission as paid
   */
  static async markAsPaid(
    id: string,
    payoutId: string
  ): Promise<AffiliateCommission> {
    const [updated] = await db
      .update(affiliateCommissions)
      .set({
        status: 'paid',
        payoutId,
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(affiliateCommissions.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundError('Commission not found');
    }

    return updated;
  }

  /**
   * List commissions
   */
  static async listCommissions(
    filters: CommissionFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<AffiliateCommission>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (filters.affiliateId) {
      conditions.push(eq(affiliateCommissions.affiliateId, filters.affiliateId));
    }

    if (filters.status && filters.status.length > 0) {
      conditions.push(inArray(affiliateCommissions.status, filters.status));
    }

    if (filters.type && filters.type.length > 0) {
      conditions.push(inArray(affiliateCommissions.type, filters.type));
    }

    if (filters.dateFrom) {
      conditions.push(gte(affiliateCommissions.createdAt, filters.dateFrom));
    }

    if (filters.dateTo) {
      conditions.push(lte(affiliateCommissions.createdAt, filters.dateTo));
    }

    if (filters.minAmount !== undefined) {
      conditions.push(gte(affiliateCommissions.amount, filters.minAmount.toString()));
    }

    if (filters.maxAmount !== undefined) {
      conditions.push(lte(affiliateCommissions.amount, filters.maxAmount.toString()));
    }

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(affiliateCommissions)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const results = await db
      .select()
      .from(affiliateCommissions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(affiliateCommissions.createdAt))
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(count / limit);

    return {
      data: results,
      pagination: {
        page,
        limit,
        total: count,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get pending commissions for affiliate
   */
  static async getPendingCommissions(affiliateId: string): Promise<AffiliateCommission[]> {
    return await db
      .select()
      .from(affiliateCommissions)
      .where(
        and(
          eq(affiliateCommissions.affiliateId, affiliateId),
          eq(affiliateCommissions.status, 'pending'),
          isNull(affiliateCommissions.payoutId)
        )
      )
      .orderBy(desc(affiliateCommissions.createdAt));
  }

  /**
   * Get approved commissions ready for payout
   */
  static async getApprovedCommissions(affiliateId: string): Promise<AffiliateCommission[]> {
    const now = new Date();
    
    return await db
      .select()
      .from(affiliateCommissions)
      .where(
        and(
          eq(affiliateCommissions.affiliateId, affiliateId),
          eq(affiliateCommissions.status, 'approved'),
          isNull(affiliateCommissions.payoutId),
          lte(affiliateCommissions.holdUntil, now)
        )
      )
      .orderBy(affiliateCommissions.createdAt);
  }

  /**
   * Get total pending balance for affiliate
   */
  static async getPendingBalance(affiliateId: string): Promise<number> {
    const [result] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${affiliateCommissions.amount}), 0)`,
      })
      .from(affiliateCommissions)
      .where(
        and(
          eq(affiliateCommissions.affiliateId, affiliateId),
          inArray(affiliateCommissions.status, ['pending', 'approved']),
          isNull(affiliateCommissions.payoutId)
        )
      );

    return parseFloat(result.total || '0');
  }
}
