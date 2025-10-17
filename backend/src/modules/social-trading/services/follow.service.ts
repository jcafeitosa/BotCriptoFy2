/**
 * Follow Service
 *
 * Handles social relationships: follow/unfollow traders, notifications, followers management
 * Features:
 * - Follow/Unfollow traders with totalFollowers sync
 * - Prevent duplicate follows
 * - Notification preferences
 * - Followers/Following lists
 * - Count aggregations
 */

import { db } from '../../../db';
import { socialFollowers, socialTraders } from '../schema/social.schema';
import { eq, and, sql } from 'drizzle-orm';
import type { ServiceResponse } from '../types/social.types';

/**
 * Follow Types
 */
export interface FollowRequest {
  tenantId: string;
  followerId: string;
  followedTraderId: string;
  notificationsEnabled?: boolean;
}

export interface FollowRelationship {
  id: string;
  tenantId: string;
  followerId: string;
  followedTraderId: string;
  notificationsEnabled: boolean;
  followedAt: Date;
}

export interface FollowerInfo {
  id: string;
  followerId: string;
  followerName?: string;
  followerAvatar?: string;
  notificationsEnabled: boolean;
  followedAt: Date;
}

export interface FollowingInfo {
  id: string;
  traderId: string;
  traderName: string;
  traderAvatar: string | null;
  traderBio: string | null;
  totalFollowers: number;
  winRate: string;
  isVerified: boolean;
  isPremium: boolean;
  notificationsEnabled: boolean;
  followedAt: Date;
}

/**
 * Follow a Trader
 *
 * Creates follow relationship and increments trader's totalFollowers counter
 * Prevents duplicate follows
 *
 * @param request - Follow relationship details
 * @returns ServiceResponse with follow relationship
 */
export async function followTrader(request: FollowRequest): Promise<ServiceResponse<FollowRelationship>> {
  try {
    // Check if trader exists and is active
    const trader = await db.select()
      .from(socialTraders)
      .where(
        and(
          eq(socialTraders.id, request.followedTraderId),
          eq(socialTraders.tenantId, request.tenantId),
          eq(socialTraders.status, 'active')
        )
      )
      .limit(1);

    if (!trader.length) {
      return {
        success: false,
        error: 'Trader not found or inactive',
        code: 'TRADER_NOT_FOUND',
      };
    }

    // Check if already following
    const existing = await db.select()
      .from(socialFollowers)
      .where(
        and(
          eq(socialFollowers.followerId, request.followerId),
          eq(socialFollowers.followedTraderId, request.followedTraderId),
          eq(socialFollowers.tenantId, request.tenantId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return {
        success: false,
        error: 'Already following this trader',
        code: 'ALREADY_FOLLOWING',
      };
    }

    // Create follow relationship
    const follow = await db.insert(socialFollowers)
      .values({
        tenantId: request.tenantId,
        followerId: request.followerId,
        followedTraderId: request.followedTraderId,
        notificationsEnabled: request.notificationsEnabled ?? true,
      })
      .returning();

    // Increment trader's totalFollowers count
    await db.update(socialTraders)
      .set({
        totalFollowers: sql`${socialTraders.totalFollowers} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(socialTraders.id, request.followedTraderId),
          eq(socialTraders.tenantId, request.tenantId)
        )
      );

    return {
      success: true,
      data: follow[0] as FollowRelationship,
    };
  } catch (error) {
    console.error('Error following trader:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to follow trader',
      code: 'FOLLOW_TRADER_FAILED',
    };
  }
}

/**
 * Unfollow a Trader
 *
 * Removes follow relationship and decrements trader's totalFollowers counter
 *
 * @param tenantId - Tenant ID
 * @param followerId - User ID who is unfollowing
 * @param followedTraderId - Trader ID being unfollowed
 * @returns ServiceResponse with success status
 */
export async function unfollowTrader(
  tenantId: string,
  followerId: string,
  followedTraderId: string
): Promise<ServiceResponse<{ unfollowed: boolean }>> {
  try {
    // Check if follow relationship exists
    const existing = await db.select()
      .from(socialFollowers)
      .where(
        and(
          eq(socialFollowers.followerId, followerId),
          eq(socialFollowers.followedTraderId, followedTraderId),
          eq(socialFollowers.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!existing.length) {
      return {
        success: false,
        error: 'Follow relationship not found',
        code: 'NOT_FOLLOWING',
      };
    }

    // Delete follow relationship
    await db.delete(socialFollowers)
      .where(
        and(
          eq(socialFollowers.followerId, followerId),
          eq(socialFollowers.followedTraderId, followedTraderId),
          eq(socialFollowers.tenantId, tenantId)
        )
      );

    // Decrement trader's totalFollowers count (prevent going below 0)
    await db.update(socialTraders)
      .set({
        totalFollowers: sql`GREATEST(0, ${socialTraders.totalFollowers} - 1)`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(socialTraders.id, followedTraderId),
          eq(socialTraders.tenantId, tenantId)
        )
      );

    return {
      success: true,
      data: { unfollowed: true },
    };
  } catch (error) {
    console.error('Error unfollowing trader:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unfollow trader',
      code: 'UNFOLLOW_TRADER_FAILED',
    };
  }
}

/**
 * Get Followers List
 *
 * Retrieves list of users following a specific trader
 *
 * @param tenantId - Tenant ID
 * @param traderId - Trader ID
 * @param options - Pagination options
 * @returns ServiceResponse with followers list
 */
export async function getFollowers(
  tenantId: string,
  traderId: string,
  options?: { limit?: number; offset?: number }
): Promise<ServiceResponse<FollowerInfo[]>> {
  try {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    // Validate trader exists
    const trader = await db.select()
      .from(socialTraders)
      .where(
        and(
          eq(socialTraders.id, traderId),
          eq(socialTraders.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!trader.length) {
      return {
        success: false,
        error: 'Trader not found',
        code: 'TRADER_NOT_FOUND',
      };
    }

    const followers = await db.select({
      id: socialFollowers.id,
      followerId: socialFollowers.followerId,
      notificationsEnabled: socialFollowers.notificationsEnabled,
      followedAt: socialFollowers.followedAt,
    })
      .from(socialFollowers)
      .where(
        and(
          eq(socialFollowers.followedTraderId, traderId),
          eq(socialFollowers.tenantId, tenantId)
        )
      )
      .orderBy(sql`${socialFollowers.followedAt} DESC`)
      .limit(limit)
      .offset(offset);

    return {
      success: true,
      data: followers as FollowerInfo[],
    };
  } catch (error) {
    console.error('Error getting followers:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get followers',
      code: 'GET_FOLLOWERS_FAILED',
    };
  }
}

/**
 * Get Following List
 *
 * Retrieves list of traders that a user is following
 *
 * @param tenantId - Tenant ID
 * @param followerId - User ID
 * @param options - Pagination options
 * @returns ServiceResponse with following list
 */
export async function getFollowing(
  tenantId: string,
  followerId: string,
  options?: { limit?: number; offset?: number }
): Promise<ServiceResponse<FollowingInfo[]>> {
  try {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const following = await db.select({
      id: socialFollowers.id,
      traderId: socialTraders.id,
      traderName: socialTraders.displayName,
      traderAvatar: socialTraders.avatar,
      traderBio: socialTraders.bio,
      totalFollowers: socialTraders.totalFollowers,
      winRate: socialTraders.winRate,
      isVerified: socialTraders.isVerified,
      isPremium: socialTraders.isPremium,
      notificationsEnabled: socialFollowers.notificationsEnabled,
      followedAt: socialFollowers.followedAt,
    })
      .from(socialFollowers)
      .innerJoin(
        socialTraders,
        eq(socialFollowers.followedTraderId, socialTraders.id)
      )
      .where(
        and(
          eq(socialFollowers.followerId, followerId),
          eq(socialFollowers.tenantId, tenantId)
        )
      )
      .orderBy(sql`${socialFollowers.followedAt} DESC`)
      .limit(limit)
      .offset(offset);

    return {
      success: true,
      data: following as FollowingInfo[],
    };
  } catch (error) {
    console.error('Error getting following:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get following list',
      code: 'GET_FOLLOWING_FAILED',
    };
  }
}

/**
 * Check if Following
 *
 * Checks if a user is following a specific trader
 *
 * @param tenantId - Tenant ID
 * @param followerId - User ID
 * @param traderId - Trader ID
 * @returns ServiceResponse with following status
 */
export async function isFollowing(
  tenantId: string,
  followerId: string,
  traderId: string
): Promise<ServiceResponse<{ isFollowing: boolean; notificationsEnabled?: boolean }>> {
  try {
    const follow = await db.select({
      notificationsEnabled: socialFollowers.notificationsEnabled,
    })
      .from(socialFollowers)
      .where(
        and(
          eq(socialFollowers.followerId, followerId),
          eq(socialFollowers.followedTraderId, traderId),
          eq(socialFollowers.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!follow.length) {
      return {
        success: true,
        data: { isFollowing: false },
      };
    }

    return {
      success: true,
      data: {
        isFollowing: true,
        notificationsEnabled: follow[0].notificationsEnabled ?? true,
      },
    };
  } catch (error) {
    console.error('Error checking following status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check following status',
      code: 'IS_FOLLOWING_FAILED',
    };
  }
}

/**
 * Toggle Notifications
 *
 * Enables or disables notifications for a follow relationship
 *
 * @param tenantId - Tenant ID
 * @param followerId - User ID
 * @param traderId - Trader ID
 * @param enabled - Notifications enabled status
 * @returns ServiceResponse with updated status
 */
export async function toggleNotifications(
  tenantId: string,
  followerId: string,
  traderId: string,
  enabled: boolean
): Promise<ServiceResponse<{ notificationsEnabled: boolean }>> {
  try {
    // Check if follow relationship exists
    const existing = await db.select()
      .from(socialFollowers)
      .where(
        and(
          eq(socialFollowers.followerId, followerId),
          eq(socialFollowers.followedTraderId, traderId),
          eq(socialFollowers.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!existing.length) {
      return {
        success: false,
        error: 'Follow relationship not found',
        code: 'NOT_FOLLOWING',
      };
    }

    // Update notifications setting
    await db.update(socialFollowers)
      .set({
        notificationsEnabled: enabled,
      })
      .where(
        and(
          eq(socialFollowers.followerId, followerId),
          eq(socialFollowers.followedTraderId, traderId),
          eq(socialFollowers.tenantId, tenantId)
        )
      );

    return {
      success: true,
      data: { notificationsEnabled: enabled },
    };
  } catch (error) {
    console.error('Error toggling notifications:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to toggle notifications',
      code: 'TOGGLE_NOTIFICATIONS_FAILED',
    };
  }
}

/**
 * Get Follower Count
 *
 * Returns the total number of followers for a trader
 *
 * @param tenantId - Tenant ID
 * @param traderId - Trader ID
 * @returns ServiceResponse with follower count
 */
export async function getFollowerCount(
  tenantId: string,
  traderId: string
): Promise<ServiceResponse<{ count: number }>> {
  try {
    // Get count from socialTraders table (cached count)
    const trader = await db.select({
      totalFollowers: socialTraders.totalFollowers,
    })
      .from(socialTraders)
      .where(
        and(
          eq(socialTraders.id, traderId),
          eq(socialTraders.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!trader.length) {
      return {
        success: false,
        error: 'Trader not found',
        code: 'TRADER_NOT_FOUND',
      };
    }

    return {
      success: true,
      data: { count: trader[0].totalFollowers ?? 0 },
    };
  } catch (error) {
    console.error('Error getting follower count:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get follower count',
      code: 'GET_FOLLOWER_COUNT_FAILED',
    };
  }
}

/**
 * Get Following Count
 *
 * Returns the total number of traders a user is following
 *
 * @param tenantId - Tenant ID
 * @param followerId - User ID
 * @returns ServiceResponse with following count
 */
export async function getFollowingCount(
  tenantId: string,
  followerId: string
): Promise<ServiceResponse<{ count: number }>> {
  try {
    const result = await db.select({
      count: sql<number>`COUNT(*)::int`,
    })
      .from(socialFollowers)
      .where(
        and(
          eq(socialFollowers.followerId, followerId),
          eq(socialFollowers.tenantId, tenantId)
        )
      );

    return {
      success: true,
      data: { count: result[0]?.count ?? 0 },
    };
  } catch (error) {
    console.error('Error getting following count:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get following count',
      code: 'GET_FOLLOWING_COUNT_FAILED',
    };
  }
}

/**
 * Sync Follower Counts
 *
 * Recalculates and syncs totalFollowers count for a trader
 * Useful for fixing inconsistencies
 *
 * @param tenantId - Tenant ID
 * @param traderId - Trader ID
 * @returns ServiceResponse with synced count
 */
export async function syncFollowerCount(
  tenantId: string,
  traderId: string
): Promise<ServiceResponse<{ count: number }>> {
  try {
    // Count actual followers
    const result = await db.select({
      count: sql<number>`COUNT(*)::int`,
    })
      .from(socialFollowers)
      .where(
        and(
          eq(socialFollowers.followedTraderId, traderId),
          eq(socialFollowers.tenantId, tenantId)
        )
      );

    const actualCount = result[0]?.count ?? 0;

    // Update trader's totalFollowers
    await db.update(socialTraders)
      .set({
        totalFollowers: actualCount,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(socialTraders.id, traderId),
          eq(socialTraders.tenantId, tenantId)
        )
      );

    return {
      success: true,
      data: { count: actualCount },
    };
  } catch (error) {
    console.error('Error syncing follower count:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync follower count',
      code: 'SYNC_FOLLOWER_COUNT_FAILED',
    };
  }
}
