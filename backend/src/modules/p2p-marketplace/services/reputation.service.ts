/**
 * P2P Reputation Service
 */

import { db } from '../../../db';
import { p2pReputation, p2pTrades } from '../schema/p2p.schema';
import { eq, and, sql } from 'drizzle-orm';
import type { CreateReputationRequest, ReputationResponse, UserP2PStats, ServiceResponse } from '../types/p2p.types';
import { isPositiveReview } from '../utils/reputation-score';

export async function createReputation(request: CreateReputationRequest): Promise<ServiceResponse<ReputationResponse>> {
  try {
    const reputation = await db.insert(p2pReputation).values({
      tenantId: request.tenantId,
      tradeId: request.tradeId,
      reviewerId: request.reviewerId,
      reviewedUserId: request.reviewedUserId,
      rating: request.rating,
      comment: request.comment,
      isPositive: isPositiveReview(request.rating),
    }).returning();

    return { success: true, data: reputation[0] as ReputationResponse };
  } catch (error) {
    return { success: false, error: 'Failed to create reputation', code: 'CREATE_REPUTATION_FAILED' };
  }
}

export async function getUserStats(userId: string, tenantId: string): Promise<ServiceResponse<UserP2PStats>> {
  try {
    const stats = await db.select({
      totalTrades: sql<number>`count(*)`,
      completedTrades: sql<number>`count(*) filter (where status = 'completed')`,
    }).from(p2pTrades).where(
      and(
        eq(p2pTrades.tenantId, tenantId),
        sql`(${p2pTrades.sellerId} = ${userId} OR ${p2pTrades.buyerId} = ${userId})`
      )
    );

    const reviews = await db.select().from(p2pReputation)
      .where(eq(p2pReputation.reviewedUserId, userId));

    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    const positiveReviews = reviews.filter(r => r.isPositive).length;

    const userStats: UserP2PStats = {
      userId,
      totalTrades: Number(stats[0]?.totalTrades || 0),
      completedTrades: Number(stats[0]?.completedTrades || 0),
      completionRate: stats[0] ? (Number(stats[0].completedTrades) / Number(stats[0].totalTrades)) * 100 : 0,
      averageRating: avgRating,
      totalReviews: reviews.length,
      positiveReviews,
      negativeReviews: reviews.length - positiveReviews,
      totalVolume: '0',
      averageTradeTime: 0,
      disputesOpened: 0,
      disputesAgainst: 0,
    };

    return { success: true, data: userStats };
  } catch (error) {
    return { success: false, error: 'Failed to get user stats', code: 'GET_STATS_FAILED' };
  }
}
