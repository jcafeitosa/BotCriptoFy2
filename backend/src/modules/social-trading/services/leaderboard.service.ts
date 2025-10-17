/**
 * Leaderboard Service
 * Complete implementation for ranking system with composite scoring
 */

import { db } from '../../../db';
import { socialLeaderboard, socialTraders, socialPerformance } from '../schema/social.schema';
import { eq, and, sql } from 'drizzle-orm';
import type { LeaderboardEntry, PerformancePeriod, ServiceResponse } from '../types/social.types';

export interface LeaderboardFilters {
  period?: PerformancePeriod;
  minTrades?: number;
  minWinRate?: number;
  verified?: boolean;
}

/**
 * Calculate composite score for leaderboard ranking
 * Score = (winRate * 0.3) + (profitFactor * 0.25) + (sharpeRatio * 0.25) + (totalTrades * 0.2)
 */
function calculateScore(
  winRate: number,
  profitFactor: number,
  sharpeRatio: number,
  totalTrades: number
): number {
  // Normalize values
  const normalizedWinRate = Math.min(winRate / 100, 1); // 0-1
  const normalizedProfitFactor = Math.min(profitFactor / 5, 1); // 0-1 (cap at 5)
  const normalizedSharpe = Math.min(Math.max(sharpeRatio + 1, 0) / 4, 1); // 0-1 (range -1 to 3)
  const normalizedTrades = Math.min(totalTrades / 100, 1); // 0-1 (cap at 100)

  const score = (
    normalizedWinRate * 30 +
    normalizedProfitFactor * 25 +
    normalizedSharpe * 25 +
    normalizedTrades * 20
  );

  return Math.round(score * 100) / 100;
}

/**
 * Get leaderboard for a period with filters
 */
export async function getLeaderboard(
  tenantId: string,
  period: PerformancePeriod,
  limit = 50,
  filters?: LeaderboardFilters
): Promise<ServiceResponse<LeaderboardEntry[]>> {
  try {
    const conditions = [
      eq(socialLeaderboard.tenantId, tenantId),
      eq(socialLeaderboard.period, period),
    ];

    if (filters?.minTrades) {
      conditions.push(sql`CAST(${socialLeaderboard.totalTrades} AS INTEGER) >= ${filters.minTrades}`);
    }

    if (filters?.minWinRate) {
      conditions.push(sql`CAST(${socialLeaderboard.winRate} AS DECIMAL) >= ${filters.minWinRate}`);
    }

    const entries = await db
      .select({
        rank: socialLeaderboard.rank,
        traderId: socialLeaderboard.traderId,
        traderName: socialTraders.displayName,
        isVerified: socialTraders.isVerified,
        totalProfit: socialLeaderboard.totalProfit,
        roi: socialLeaderboard.roi,
        winRate: socialLeaderboard.winRate,
        totalTrades: socialLeaderboard.totalTrades,
        score: socialLeaderboard.score,
      })
      .from(socialLeaderboard)
      .innerJoin(socialTraders, eq(socialLeaderboard.traderId, socialTraders.id))
      .where(and(...conditions))
      .orderBy(socialLeaderboard.rank)
      .limit(limit);

    // Apply verified filter (post-query since it's a JOIN)
    const filtered = filters?.verified !== undefined
      ? entries.filter(e => e.isVerified === filters.verified)
      : entries;

    return { success: true, data: filtered as LeaderboardEntry[] };
  } catch (error) {
    return { success: false, error: 'Failed to get leaderboard', code: 'GET_LEADERBOARD_FAILED' };
  }
}

/**
 * Get trader's position in leaderboard
 */
export async function getTraderRank(
  traderId: string,
  tenantId: string,
  period: PerformancePeriod
): Promise<ServiceResponse<LeaderboardEntry>> {
  try {
    const entry = await db.query.socialLeaderboard.findFirst({
      where: and(
        eq(socialLeaderboard.traderId, traderId),
        eq(socialLeaderboard.tenantId, tenantId),
        eq(socialLeaderboard.period, period)
      ),
      with: {
        trader: true,
      },
    });

    if (!entry) {
      return { success: false, error: 'Trader not ranked', code: 'NOT_RANKED' };
    }

    return { success: true, data: entry as any as LeaderboardEntry };
  } catch (error) {
    return { success: false, error: 'Failed to get trader rank', code: 'GET_RANK_FAILED' };
  }
}

/**
 * Update leaderboard rankings for a period
 * Fetches performance data, calculates scores, and updates rankings
 */
export async function updateLeaderboard(tenantId: string, period: PerformancePeriod): Promise<ServiceResponse<void>> {
  try {
    // Get all performance data for the period
    const performances = await db.query.socialPerformance.findMany({
      where: and(
        eq(socialPerformance.tenantId, tenantId),
        eq(socialPerformance.period, period)
      ),
      with: {
        trader: true,
      },
    });

    if (performances.length === 0) {
      return { success: false, error: 'No performance data found', code: 'NO_DATA' };
    }

    // Determine period dates
    const now = new Date();
    let periodStart: Date;
    const periodEnd = now;

    switch (period) {
      case 'daily':
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'yearly':
        periodStart = new Date(now.getFullYear(), 0, 1);
        break;
      default: // all_time
        periodStart = new Date(2020, 0, 1);
    }

    // Calculate scores and prepare leaderboard entries
    const entries = performances.map(perf => {
      const winRate = parseFloat(perf.winRate || '0');
      const profitFactor = parseFloat(perf.profitFactor || '0');
      const sharpeRatio = parseFloat(perf.sharpeRatio || '0');
      const totalTrades = perf.totalTrades;
      const totalProfit = parseFloat(perf.totalProfit || '0');
      const roi = parseFloat(perf.roi || '0');

      const score = calculateScore(winRate, profitFactor, sharpeRatio, totalTrades);

      return {
        tenantId,
        traderId: perf.traderId,
        period,
        periodStart,
        periodEnd,
        rank: 0, // Will be assigned after sorting
        score: score.toString(),
        totalTrades,
        winRate: winRate.toString(),
        totalProfit: totalProfit.toString(),
        roi: roi.toString(),
      };
    });

    // Sort by score descending and assign ranks
    entries.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Delete old leaderboard entries for this period
    await db
      .delete(socialLeaderboard)
      .where(
        and(
          eq(socialLeaderboard.tenantId, tenantId),
          eq(socialLeaderboard.period, period)
        )
      );

    // Insert new rankings
    if (entries.length > 0) {
      await db.insert(socialLeaderboard).values(entries);
    }

    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: 'Failed to update leaderboard', code: 'UPDATE_LEADERBOARD_FAILED' };
  }
}

/**
 * Get top N traders from leaderboard
 */
export async function getTopTraders(
  tenantId: string,
  period: PerformancePeriod,
  limit = 10
): Promise<ServiceResponse<LeaderboardEntry[]>> {
  try {
    const entries = await db
      .select({
        rank: socialLeaderboard.rank,
        traderId: socialLeaderboard.traderId,
        traderName: socialTraders.displayName,
        isVerified: socialTraders.isVerified,
        totalProfit: socialLeaderboard.totalProfit,
        roi: socialLeaderboard.roi,
        winRate: socialLeaderboard.winRate,
        totalTrades: socialLeaderboard.totalTrades,
        score: socialLeaderboard.score,
      })
      .from(socialLeaderboard)
      .innerJoin(socialTraders, eq(socialLeaderboard.traderId, socialTraders.id))
      .where(
        and(
          eq(socialLeaderboard.tenantId, tenantId),
          eq(socialLeaderboard.period, period)
        )
      )
      .orderBy(socialLeaderboard.rank)
      .limit(limit);

    return { success: true, data: entries as LeaderboardEntry[] };
  } catch (error) {
    return { success: false, error: 'Failed to get top traders', code: 'GET_TOP_TRADERS_FAILED' };
  }
}

/**
 * Get leaderboard with pagination
 */
export async function getLeaderboardPaginated(
  tenantId: string,
  period: PerformancePeriod,
  page = 1,
  pageSize = 25
): Promise<ServiceResponse<{ entries: LeaderboardEntry[]; total: number; page: number; pageSize: number }>> {
  try {
    const offset = (page - 1) * pageSize;

    const entries = await db
      .select({
        rank: socialLeaderboard.rank,
        traderId: socialLeaderboard.traderId,
        traderName: socialTraders.displayName,
        isVerified: socialTraders.isVerified,
        totalProfit: socialLeaderboard.totalProfit,
        roi: socialLeaderboard.roi,
        winRate: socialLeaderboard.winRate,
        totalTrades: socialLeaderboard.totalTrades,
        score: socialLeaderboard.score,
      })
      .from(socialLeaderboard)
      .innerJoin(socialTraders, eq(socialLeaderboard.traderId, socialTraders.id))
      .where(
        and(
          eq(socialLeaderboard.tenantId, tenantId),
          eq(socialLeaderboard.period, period)
        )
      )
      .orderBy(socialLeaderboard.rank)
      .limit(pageSize)
      .offset(offset);

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(socialLeaderboard)
      .where(
        and(
          eq(socialLeaderboard.tenantId, tenantId),
          eq(socialLeaderboard.period, period)
        )
      );

    return {
      success: true,
      data: {
        entries: entries as LeaderboardEntry[],
        total: Number(countResult.count),
        page,
        pageSize,
      },
    };
  } catch (error) {
    return { success: false, error: 'Failed to get leaderboard', code: 'GET_LEADERBOARD_PAGINATED_FAILED' };
  }
}

/**
 * Get leaderboard statistics
 */
export async function getLeaderboardStats(
  tenantId: string,
  period: PerformancePeriod
): Promise<ServiceResponse<any>> {
  try {
    const [stats] = await db
      .select({
        totalTraders: sql<number>`COUNT(*)`,
        avgScore: sql<number>`AVG(CAST(score AS DECIMAL))`,
        avgWinRate: sql<number>`AVG(CAST(win_rate AS DECIMAL))`,
        avgTotalTrades: sql<number>`AVG(CAST(total_trades AS INTEGER))`,
        topScore: sql<number>`MAX(CAST(score AS DECIMAL))`,
        totalProfit: sql<number>`SUM(CAST(total_profit AS DECIMAL))`,
      })
      .from(socialLeaderboard)
      .where(
        and(
          eq(socialLeaderboard.tenantId, tenantId),
          eq(socialLeaderboard.period, period)
        )
      );

    return {
      success: true,
      data: {
        totalTraders: Number(stats.totalTraders),
        avgScore: Math.round(Number(stats.avgScore || 0) * 100) / 100,
        avgWinRate: Math.round(Number(stats.avgWinRate || 0) * 100) / 100,
        avgTotalTrades: Math.round(Number(stats.avgTotalTrades || 0)),
        topScore: Math.round(Number(stats.topScore || 0) * 100) / 100,
        totalProfit: Number(stats.totalProfit || 0),
      },
    };
  } catch (error) {
    return { success: false, error: 'Failed to get leaderboard stats', code: 'GET_STATS_FAILED' };
  }
}

/**
 * Get traders near a specific rank (context around a position)
 */
export async function getTradersNearRank(
  tenantId: string,
  period: PerformancePeriod,
  rank: number,
  context = 5
): Promise<ServiceResponse<LeaderboardEntry[]>> {
  try {
    const startRank = Math.max(1, rank - context);
    const endRank = rank + context;

    const entries = await db
      .select({
        rank: socialLeaderboard.rank,
        traderId: socialLeaderboard.traderId,
        traderName: socialTraders.displayName,
        isVerified: socialTraders.isVerified,
        totalProfit: socialLeaderboard.totalProfit,
        roi: socialLeaderboard.roi,
        winRate: socialLeaderboard.winRate,
        totalTrades: socialLeaderboard.totalTrades,
        score: socialLeaderboard.score,
      })
      .from(socialLeaderboard)
      .innerJoin(socialTraders, eq(socialLeaderboard.traderId, socialTraders.id))
      .where(
        and(
          eq(socialLeaderboard.tenantId, tenantId),
          eq(socialLeaderboard.period, period),
          sql`${socialLeaderboard.rank} >= ${startRank}`,
          sql`${socialLeaderboard.rank} <= ${endRank}`
        )
      )
      .orderBy(socialLeaderboard.rank);

    return { success: true, data: entries as LeaderboardEntry[] };
  } catch (error) {
    return { success: false, error: 'Failed to get traders near rank', code: 'GET_NEAR_RANK_FAILED' };
  }
}

/**
 * Delete leaderboard entries
 */
export async function deleteLeaderboard(
  tenantId: string,
  period?: PerformancePeriod
): Promise<ServiceResponse<void>> {
  try {
    const conditions = [eq(socialLeaderboard.tenantId, tenantId)];

    if (period) {
      conditions.push(eq(socialLeaderboard.period, period));
    }

    await db.delete(socialLeaderboard).where(and(...conditions));

    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: 'Failed to delete leaderboard', code: 'DELETE_LEADERBOARD_FAILED' };
  }
}
