/**
 * Leaderboard Service
 */

import { db } from '../../../db';
import { socialLeaderboard, socialTraders } from '../schema/social.schema';
import { eq, and } from 'drizzle-orm';
import type { LeaderboardEntry, PerformancePeriod, ServiceResponse } from '../types/social.types';

export async function getLeaderboard(
  tenantId: string,
  period: PerformancePeriod,
  limit: number = 50
): Promise<ServiceResponse<LeaderboardEntry[]>> {
  try {
    const entries = await db
      .select({
        rank: socialLeaderboard.rank,
        traderId: socialLeaderboard.traderId,
        traderName: socialTraders.displayName,
        totalProfit: socialLeaderboard.totalProfit,
        roi: socialLeaderboard.roi,
        winRate: socialLeaderboard.winRate,
        totalTrades: socialLeaderboard.totalTrades,
        score: socialLeaderboard.score,
      })
      .from(socialLeaderboard)
      .innerJoin(socialTraders, eq(socialLeaderboard.traderId, socialTraders.id))
      .where(and(eq(socialLeaderboard.tenantId, tenantId), eq(socialLeaderboard.period, period)))
      .orderBy(socialLeaderboard.rank)
      .limit(limit);

    return { success: true, data: entries as LeaderboardEntry[] };
  } catch (error) {
    return { success: false, error: 'Failed to get leaderboard', code: 'GET_LEADERBOARD_FAILED' };
  }
}

export async function updateLeaderboard(_tenantId: string, _period: PerformancePeriod) {
  // This would calculate and update rankings
  // Implementation would fetch performance data, calculate scores, and update ranks
  return { success: true };
}
