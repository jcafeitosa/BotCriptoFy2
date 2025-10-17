/**
 * Targets Service
 * Sales targets and performance tracking
 */

import { db } from '@/db';
import { eq, and, desc, sql, gte, lte, isNull } from 'drizzle-orm';
import logger from '@/utils/logger';
import { cacheManager } from '@/cache/cache-manager';
import { CacheNamespace } from '@/cache/types';
import { salesTargets, type SalesTarget, type NewSalesTarget, deals } from '../schema';
import { users } from '../../auth/schema/auth.schema';
import type { TargetPeriod, UserPerformance } from '../types';

export class TargetsService {
  private static readonly CACHE_TTL = 900; // 15 minutes

  /**
   * Create a new sales target
   */
  static async createTarget(
    data: Partial<NewSalesTarget>,
    tenantId: string
  ): Promise<SalesTarget> {
    logger.info('Creating sales target', { period: data.period, tenantId });

    if (!data.period) {
      throw new Error('Period is required');
    }

    if (!data.startDate || !data.endDate) {
      throw new Error('Start date and end date are required');
    }

    if (!data.targetAmount || parseFloat(data.targetAmount.toString()) <= 0) {
      throw new Error('Target amount must be greater than 0');
    }

    const newTarget: NewSalesTarget = {
      tenantId,
      userId: data.userId,
      period: data.period,
      startDate: data.startDate,
      endDate: data.endDate,
      targetAmount: data.targetAmount,
      achievedAmount: '0',
      achievementPercentage: '0',
    };

    const [target] = await db.insert(salesTargets).values(newTarget).returning();

    // Invalidate cache
    await this.invalidateTargetsCache(tenantId);

    logger.info('Sales target created', { targetId: target.id });
    return target;
  }

  /**
   * Update target progress
   * Calculate achieved amount from won deals in period
   */
  static async updateTargetProgress(
    userId: string | null,
    tenantId: string
  ): Promise<SalesTarget[]> {
    logger.info('Updating target progress', { userId, tenantId });

    // Get all targets for user or team
    const conditions = [eq(salesTargets.tenantId, tenantId)];

    if (userId) {
      conditions.push(eq(salesTargets.userId, userId));
    } else {
      conditions.push(isNull(salesTargets.userId));
    }

    const targets = await db
      .select()
      .from(salesTargets)
      .where(and(...conditions));

    // Update each target
    const updatedTargets: SalesTarget[] = [];

    for (const target of targets) {
      // Get won deals in period
      const dealConditions = [
        eq(deals.tenantId, tenantId),
        eq(deals.status, 'won'),
        gte(deals.actualCloseDate, target.startDate as any),
        lte(deals.actualCloseDate, target.endDate as any),
      ];

      if (target.userId) {
        dealConditions.push(eq(deals.ownerId, target.userId));
      }

      const [result] = await db
        .select({
          total: sql<string>`COALESCE(SUM(${deals.value}), 0)`,
        })
        .from(deals)
        .where(and(...dealConditions));

      const achievedAmount = parseFloat(result.total);
      const targetAmount = parseFloat(target.targetAmount.toString());
      const achievementPercentage = targetAmount > 0 ? (achievedAmount / targetAmount) * 100 : 0;

      // Update target
      const [updated] = await db
        .update(salesTargets)
        .set({
          achievedAmount: achievedAmount.toString(),
          achievementPercentage: achievementPercentage.toString(),
          updatedAt: new Date(),
        })
        .where(eq(salesTargets.id, target.id))
        .returning();

      updatedTargets.push(updated);
    }

    // Invalidate cache
    await this.invalidateTargetsCache(tenantId);

    logger.info('Target progress updated', { count: updatedTargets.length });
    return updatedTargets;
  }

  /**
   * Get targets by period
   */
  static async getTargetsByPeriod(
    period: TargetPeriod,
    tenantId: string
  ): Promise<SalesTarget[]> {
    const targets = await db
      .select()
      .from(salesTargets)
      .where(and(eq(salesTargets.tenantId, tenantId), eq(salesTargets.period, period)))
      .orderBy(desc(salesTargets.startDate));

    return targets;
  }

  /**
   * Get user performance (without rank calculation)
   * Internal method to avoid recursion
   */
  private static async getUserPerformanceInternal(
    userId: string,
    tenantId: string
  ): Promise<Omit<UserPerformance, 'rank'>> {
    // Get user info
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    // Get user's targets
    const userTargets = await db
      .select()
      .from(salesTargets)
      .where(and(eq(salesTargets.tenantId, tenantId), eq(salesTargets.userId, userId)))
      .orderBy(desc(salesTargets.startDate));

    // Calculate totals
    const achieved = userTargets.reduce(
      (sum, t) => sum + parseFloat(t.achievedAmount.toString()),
      0
    );

    const targetAmount = userTargets.reduce(
      (sum, t) => sum + parseFloat(t.targetAmount.toString()),
      0
    );

    const achievementRate = targetAmount > 0 ? (achieved / targetAmount) * 100 : 0;

    // Get deal statistics
    const userDeals = await db
      .select()
      .from(deals)
      .where(and(eq(deals.tenantId, tenantId), eq(deals.ownerId, userId)));

    const dealsStats = {
      total: userDeals.length,
      won: userDeals.filter((d) => d.status === 'won').length,
      lost: userDeals.filter((d) => d.status === 'lost').length,
      open: userDeals.filter((d) => d.status === 'open').length,
    };

    return {
      userId: user.id,
      userName: user.name,
      targets: userTargets,
      achieved,
      targetAmount,
      achievementRate,
      deals: dealsStats,
    };
  }

  /**
   * Get user performance
   */
  static async getUserPerformance(
    userId: string,
    tenantId: string
  ): Promise<UserPerformance> {
    logger.info('Getting user performance', { userId, tenantId });

    // Get performance data
    const performance = await this.getUserPerformanceInternal(userId, tenantId);

    // Calculate rank by comparing with all users
    const allPerformances = await this.getAllUserPerformances(tenantId);
    const userPerformance = allPerformances.find((p) => p.userId === userId);
    const rank = userPerformance?.rank || allPerformances.length + 1;

    return {
      ...performance,
      rank,
    };
  }

  /**
   * Get all user performances (leaderboard)
   */
  static async getAllUserPerformances(tenantId: string): Promise<UserPerformance[]> {
    logger.info('Getting all user performances', { tenantId });

    // Get all users with deals in this tenant
    const usersWithDeals = await db
      .select({ userId: deals.ownerId })
      .from(deals)
      .where(eq(deals.tenantId, tenantId))
      .groupBy(deals.ownerId);

    const uniqueUserIds = [...new Set(usersWithDeals.map((u) => u.userId))];

    // Get performance for each user (using internal method to avoid recursion)
    const performances: UserPerformance[] = [];

    for (const userId of uniqueUserIds) {
      try {
        const performance = await this.getUserPerformanceInternal(userId, tenantId);
        performances.push({ ...performance, rank: 0 }); // Temporary rank
      } catch (error) {
        logger.warn('Failed to get user performance', { userId, error });
      }
    }

    // Sort by achievement rate and assign ranks
    performances.sort((a, b) => b.achievementRate - a.achievementRate);

    for (let i = 0; i < performances.length; i++) {
      performances[i].rank = i + 1;
    }

    return performances;
  }

  /**
   * Invalidate targets cache
   */
  private static async invalidateTargetsCache(tenantId: string): Promise<void> {
    await cacheManager.invalidate({
      namespace: CacheNamespace.USERS,
      pattern: `targets:${tenantId}:*`,
    });
  }
}
