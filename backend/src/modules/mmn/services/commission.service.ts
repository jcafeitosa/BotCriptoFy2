/**
 * MMN Commission Service
 * Calculates binary, unilevel, matching bonus, and leadership commissions
 */

import { db } from '@/db';
import { eq, and, desc, sql, inArray, isNull } from 'drizzle-orm';
import logger from '@/utils/logger';
import { NotFoundError, BadRequestError } from '@/utils/errors';
import {
  mmnCommissions,
  mmnTree,
  mmnConfig,
  type MmnCommission,
  type NewMmnCommission,
  type MmnConfig,
} from '../schema/mmn.schema';
import { VolumeService } from './volume.service';
import { GenealogyService } from './genealogy.service';
import type {
  // BinaryCalculation,
  CommissionType,
  CommissionStatus,
  // BinaryCalculation,
} from '../types/mmn.types';

export class CommissionService {
  /**
   * Calculate binary commission (weaker leg)
   */
  static async calculateBinaryCommission(
    memberId: string,
    tenantId: string,
    period: string
  ): Promise<MmnCommission | null> {
    logger.info('Calculating binary commission', { memberId, period });

    // Get member node
    const [member] = await db
      .select()
      .from(mmnTree)
      .where(eq(mmnTree.id, memberId))
      .limit(1);

    if (!member || !member.isQualified) {
      logger.debug('Member not qualified for commissions', { memberId });
      return null;
    }

    // Get MMN config
    const config = await this.getConfig(tenantId);

    // Calculate leg volumes
    const volumes = await VolumeService.calculateLegVolumes(memberId, period);

    if (volumes.commissionableVolume === 0) {
      logger.debug('No commissionable volume', { memberId });
      return null;
    }

    // Calculate commission amount
    const rate = parseFloat(config.binaryCommissionRate);
    const maxPayout = parseFloat(config.maxPayoutPercentage || '50');
    const weakerLegPct = parseFloat(config.weakerLegPercentage || '100');

    // Commission = weakerLeg * rate * weakerLegPercentage
    const commissionAmount = (volumes.weakerLeg * rate * weakerLegPct) / 10000; // Divided by 10000 because both are percentages

    // Apply max payout cap
    const cappedAmount = Math.min(
      commissionAmount,
      (volumes.commissionableVolume * maxPayout) / 100
    );

    // Create commission record
    const periodInfo = this.parsePeriodString(period);

    const newCommission: NewMmnCommission = {
      memberId,
      sourceId: memberId, // Binary commission is from own tree
      type: 'binary',
      level: 1,
      leg: volumes.leftVolume < volumes.rightVolume ? 'left' : 'right',
      volume: volumes.commissionableVolume.toString(),
      rate: rate.toString(),
      amount: cappedAmount.toString(),
      currency: 'BRL',
      status: 'pending',
      period: periodInfo.name,
      periodStart: periodInfo.start,
      periodEnd: periodInfo.end,
      metadata: {
        leftVolume: volumes.leftVolume,
        rightVolume: volumes.rightVolume,
        weakerLeg: volumes.weakerLeg,
        strongerLeg: volumes.strongerLeg,
        leftCarryForward: volumes.leftCarryForward,
        rightCarryForward: volumes.rightCarryForward,
      },
    };

    const [commission] = await db
      .insert(mmnCommissions)
      .values(newCommission)
      .returning();

    // Update carry forward for next period
    await VolumeService.updateCarryForward(
      memberId,
      period,
      volumes.leftCarryForward,
      volumes.rightCarryForward
    );

    logger.info('Binary commission calculated', {
      commissionId: commission.id,
      amount: cappedAmount,
      weakerLeg: volumes.weakerLeg,
    });

    return commission;
  }

  /**
   * Calculate unilevel commission (10 levels)
   */
  static async calculateUnilevelCommission(
    memberId: string,
    tenantId: string,
    period: string,
    salesVolume: number
  ): Promise<MmnCommission[]> {
    logger.info('Calculating unilevel commission', { memberId, period, salesVolume });

    // Get MMN config
    const config = await this.getConfig(tenantId);
    const maxLevels = config.unilevelLevels;
    const rates = config.unilevelRates as number[] || [5, 4, 3, 2, 2, 1, 1, 1, 1, 1];

    // Get member node
    const [member] = await db
      .select()
      .from(mmnTree)
      .where(eq(mmnTree.id, memberId))
      .limit(1);

    if (!member) {
      throw new NotFoundError('Member not found');
    }

    // Get upline (ancestors)
    const upline = await GenealogyService.getUpline(
      member.userId,
      tenantId,
      maxLevels
    );

    const commissions: MmnCommission[] = [];
    const periodInfo = this.parsePeriodString(period);

    // Calculate commission for each level
    for (const ancestor of upline) {
      // Check if ancestor is qualified
      const [ancestorNode] = await db
        .select()
        .from(mmnTree)
        .where(eq(mmnTree.id, ancestor.id))
        .limit(1);

      if (!ancestorNode?.isQualified) {
        logger.debug('Ancestor not qualified, skipping', {
          ancestorId: ancestor.id,
          level: ancestor.level,
        });
        continue;
      }

      // Get commission rate for this level
      const rate = rates[ancestor.level - 1] || 0;

      if (rate === 0) {
        continue;
      }

      const commissionAmount = (salesVolume * rate) / 100;

      const newCommission: NewMmnCommission = {
        memberId: ancestor.id,
        sourceId: memberId,
        type: 'unilevel',
        level: ancestor.level,
        volume: salesVolume.toString(),
        rate: rate.toString(),
        amount: commissionAmount.toString(),
        currency: 'BRL',
        status: 'pending',
        period: periodInfo.name,
        periodStart: periodInfo.start,
        periodEnd: periodInfo.end,
        metadata: {
          sourceMemberId: memberId,
          sourceUserId: member.userId,
        },
      };

      const [commission] = await db
        .insert(mmnCommissions)
        .values(newCommission)
        .returning();

      commissions.push(commission);

      logger.debug('Unilevel commission created', {
        commissionId: commission.id,
        ancestorId: ancestor.id,
        level: ancestor.level,
        amount: commissionAmount,
      });
    }

    logger.info('Unilevel commissions calculated', {
      totalCommissions: commissions.length,
      totalAmount: commissions.reduce((sum, c) => sum + parseFloat(c.amount), 0),
    });

    return commissions;
  }

  /**
   * Calculate matching bonus (percentage of downline commissions)
   */
  static async calculateMatchingBonus(
    memberId: string,
    tenantId: string,
    period: string,
    matchingRate: number = 10
  ): Promise<MmnCommission[]> {
    logger.info('Calculating matching bonus', { memberId, period, matchingRate });

    // Get member node
    const [member] = await db
      .select()
      .from(mmnTree)
      .where(eq(mmnTree.id, memberId))
      .limit(1);

    if (!member || !member.isQualified) {
      logger.debug('Member not qualified for matching bonus', { memberId });
      return [];
    }

    // Get personally sponsored members
    const sponsored = await GenealogyService.getPersonallySponsored(
      member.userId,
      tenantId
    );

    if (sponsored.length === 0) {
      return [];
    }

    const periodInfo = this.parsePeriodString(period);
    const sponsoredIds = sponsored.map(s => s.id);

    // Get all commissions earned by sponsored members in this period
    const sponsoredCommissions = await db
      .select()
      .from(mmnCommissions)
      .where(
        and(
          inArray(mmnCommissions.memberId, sponsoredIds),
          eq(mmnCommissions.period, periodInfo.name),
          eq(mmnCommissions.periodStart, periodInfo.start),
          eq(mmnCommissions.periodEnd, periodInfo.end),
          eq(mmnCommissions.status, 'approved')
        )
      );

    if (sponsoredCommissions.length === 0) {
      logger.debug('No sponsored commissions found', { memberId });
      return [];
    }

    const matchingCommissions: MmnCommission[] = [];

    // Group by sponsored member
    const commissionsByMember = sponsoredCommissions.reduce((acc, comm) => {
      if (!acc[comm.memberId]) {
        acc[comm.memberId] = [];
      }
      acc[comm.memberId].push(comm);
      return acc;
    }, {} as Record<string, MmnCommission[]>);

    // Create matching bonus for each sponsored member
    for (const [sponsoredId, commissions] of Object.entries(commissionsByMember)) {
      const totalCommissions = commissions.reduce(
        (sum, c) => sum + parseFloat(c.amount),
        0
      );

      const matchingAmount = (totalCommissions * matchingRate) / 100;

      const newCommission: NewMmnCommission = {
        memberId: member.id,
        sourceId: sponsoredId,
        type: 'matching',
        level: 1, // Always level 1 (direct sponsor)
        volume: totalCommissions.toString(),
        rate: matchingRate.toString(),
        amount: matchingAmount.toString(),
        currency: 'BRL',
        status: 'pending',
        period: periodInfo.name,
        periodStart: periodInfo.start,
        periodEnd: periodInfo.end,
        metadata: {
          sponsoredMemberId: sponsoredId,
          totalCommissions,
          commissionCount: commissions.length,
        },
      };

      const [commission] = await db
        .insert(mmnCommissions)
        .values(newCommission)
        .returning();

      matchingCommissions.push(commission);
    }

    logger.info('Matching bonuses calculated', {
      totalBonuses: matchingCommissions.length,
      totalAmount: matchingCommissions.reduce((sum, c) => sum + parseFloat(c.amount), 0),
    });

    return matchingCommissions;
  }

  /**
   * Process all commissions for a period
   */
  static async processCommissions(
    tenantId: string,
    period: string
  ): Promise<{
    binaryCount: number;
    unilevelCount: number;
    matchingCount: number;
    totalAmount: number;
  }> {
    logger.info('Processing commissions', { tenantId, period });

    // Get all members in tenant
    const members = await db
      .select()
      .from(mmnTree)
      .where(
        and(
          eq(mmnTree.tenantId, tenantId),
          eq(mmnTree.status, 'active')
        )
      );

    let binaryCount = 0;
    const unilevelCount = 0;
    let matchingCount = 0;
    let totalAmount = 0;

    // Process binary commissions
    for (const member of members) {
      if (!member.isQualified) continue;

      const binaryComm = await this.calculateBinaryCommission(
        member.id,
        tenantId,
        period
      );

      if (binaryComm) {
        binaryCount++;
        totalAmount += parseFloat(binaryComm.amount);
      }
    }

    // Process matching bonuses
    for (const member of members) {
      if (!member.isQualified) continue;

      const matchingComms = await this.calculateMatchingBonus(
        member.id,
        tenantId,
        period
      );

      matchingCount += matchingComms.length;
      totalAmount += matchingComms.reduce((sum, c) => sum + parseFloat(c.amount), 0);
    }

    logger.info('Commissions processed', {
      binaryCount,
      unilevelCount,
      matchingCount,
      totalAmount,
    });

    return {
      binaryCount,
      unilevelCount,
      matchingCount,
      totalAmount,
    };
  }

  /**
   * Approve commission
   */
  static async approveCommission(commissionId: string): Promise<MmnCommission> {
    const [updated] = await db
      .update(mmnCommissions)
      .set({
        status: 'approved',
        updatedAt: new Date(),
      })
      .where(eq(mmnCommissions.id, commissionId))
      .returning();

    if (!updated) {
      throw new NotFoundError('Commission not found');
    }

    logger.info('Commission approved', { commissionId });

    return updated;
  }

  /**
   * Mark commission as paid
   */
  static async markAsPaid(
    commissionId: string,
    payoutId: string
  ): Promise<MmnCommission> {
    const [updated] = await db
      .update(mmnCommissions)
      .set({
        status: 'paid',
        payoutId,
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(mmnCommissions.id, commissionId))
      .returning();

    if (!updated) {
      throw new NotFoundError('Commission not found');
    }

    return updated;
  }

  /**
   * Get commissions for member
   */
  static async getCommissions(
    memberId: string,
    filters?: {
      type?: CommissionType[];
      status?: CommissionStatus[];
      period?: string;
    }
  ): Promise<MmnCommission[]> {
    const conditions = [eq(mmnCommissions.memberId, memberId)];

    if (filters?.type && filters.type.length > 0) {
      conditions.push(inArray(mmnCommissions.type, filters.type));
    }

    if (filters?.status && filters.status.length > 0) {
      conditions.push(inArray(mmnCommissions.status, filters.status));
    }

    if (filters?.period) {
      const periodInfo = this.parsePeriodString(filters.period);
      conditions.push(
        and(
          eq(mmnCommissions.period, periodInfo.name),
          eq(mmnCommissions.periodStart, periodInfo.start),
          eq(mmnCommissions.periodEnd, periodInfo.end)
        )!
      );
    }

    return await db
      .select()
      .from(mmnCommissions)
      .where(and(...conditions))
      .orderBy(desc(mmnCommissions.createdAt));
  }

  /**
   * Get pending balance for member
   */
  static async getPendingBalance(memberId: string): Promise<number> {
    const [result] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${mmnCommissions.amount}), 0)`,
      })
      .from(mmnCommissions)
      .where(
        and(
          eq(mmnCommissions.memberId, memberId),
          inArray(mmnCommissions.status, ['pending', 'approved']),
          isNull(mmnCommissions.payoutId)
        )
      );

    return parseFloat(result.total || '0');
  }

  /**
   * Get approved commissions ready for payout
   */
  static async getApprovedCommissions(memberId: string): Promise<MmnCommission[]> {
    return await db
      .select()
      .from(mmnCommissions)
      .where(
        and(
          eq(mmnCommissions.memberId, memberId),
          eq(mmnCommissions.status, 'approved'),
          isNull(mmnCommissions.payoutId)
        )
      )
      .orderBy(mmnCommissions.createdAt);
  }

  /**
   * Get total commissions by type
   */
  static async getTotalsByType(
    memberId: string,
    period?: string
  ): Promise<Record<CommissionType, number>> {
    const conditions = [eq(mmnCommissions.memberId, memberId)];

    if (period) {
      const periodInfo = this.parsePeriodString(period);
      conditions.push(
        and(
          eq(mmnCommissions.period, periodInfo.name),
          eq(mmnCommissions.periodStart, periodInfo.start),
          eq(mmnCommissions.periodEnd, periodInfo.end)
        )!
      );
    }

    const results = await db
      .select({
        type: mmnCommissions.type,
        total: sql<string>`COALESCE(SUM(${mmnCommissions.amount}), 0)`,
      })
      .from(mmnCommissions)
      .where(and(...conditions))
      .groupBy(mmnCommissions.type);

    const totals: Record<string, number> = {
      binary: 0,
      unilevel: 0,
      matching: 0,
      leadership: 0,
    };

    for (const result of results) {
      totals[result.type] = parseFloat(result.total || '0');
    }

    return totals as Record<CommissionType, number>;
  }

  /**
   * Get MMN config
   */
  private static async getConfig(tenantId: string): Promise<MmnConfig> {
    const [config] = await db
      .select()
      .from(mmnConfig)
      .where(eq(mmnConfig.tenantId, tenantId))
      .limit(1);

    if (!config) {
      throw new NotFoundError('MMN config not found for tenant');
    }

    return config;
  }

  /**
   * Parse period string
   */
  private static parsePeriodString(period: string): {
    name: string;
    start: Date;
    end: Date;
  } {
    // Use same logic as VolumeService
    const [type, dateStr] = period.split('_');

    if (type === 'weekly') {
      // Simplified for now - should match VolumeService implementation
      return {
        name: 'weekly',
        start: new Date(),
        end: new Date(),
      };
    } else if (type === 'monthly') {
      const [year, month] = dateStr.split('-');
      return {
        name: 'monthly',
        start: new Date(parseInt(year), parseInt(month) - 1, 1),
        end: new Date(parseInt(year), parseInt(month), 0),
      };
    }

    throw new BadRequestError('Invalid period format');
  }
}
