/**
 * Social Feed Service
 * Complete implementation for social feed with post ranking and engagement tracking
 */

import { db } from '../../../db';
import { socialPosts, socialTraders } from '../schema/social.schema';
import { eq, and, desc, gte, sql, or } from 'drizzle-orm';
import type { ServiceResponse } from '../types/social.types';

export interface CreatePostRequest {
  tenantId: string;
  traderId: string;
  content: string;
  postType: 'trade' | 'insight' | 'analysis' | 'announcement';
  title?: string;
  attachments?: any[];
}

export interface UpdatePostRequest {
  content?: string;
  title?: string;
  attachments?: any[];
  isPinned?: boolean;
}

export interface FeedFilters {
  traderId?: string;
  postType?: 'trade' | 'insight' | 'analysis' | 'announcement';
  startDate?: Date;
  endDate?: Date;
}

/**
 * Calculate post engagement score for ranking
 * Score = likes * 1 + comments * 3 + shares * 5
 */
function _calculateEngagementScore(likes: number, comments: number, shares: number): number {
  return (likes * 1) + (comments * 3) + (shares * 5);
}

/**
 * Create a new post
 */
export async function createPost(request: CreatePostRequest): Promise<ServiceResponse<any>> {
  try {
    // Validate trader exists
    const trader = await db.query.socialTraders.findFirst({
      where: eq(socialTraders.id, request.traderId),
    });

    if (!trader) {
      return { success: false, error: 'Trader not found', code: 'TRADER_NOT_FOUND' };
    }

    // Validate content length
    if (!request.content || request.content.trim().length === 0) {
      return { success: false, error: 'Content cannot be empty', code: 'EMPTY_CONTENT' };
    }

    if (request.content.length > 5000) {
      return { success: false, error: 'Content too long (max 5000 characters)', code: 'CONTENT_TOO_LONG' };
    }

    // Create post
    const [post] = await db.insert(socialPosts).values({
      tenantId: request.tenantId,
      traderId: request.traderId,
      content: request.content,
      postType: request.postType,
      title: request.title,
      attachments: request.attachments || [],
      likes: 0,
      comments: 0,
      shares: 0,
      isPinned: false,
    }).returning();

    return { success: true, data: post };
  } catch (error) {
    return { success: false, error: 'Failed to create post', code: 'CREATE_POST_FAILED' };
  }
}

/**
 * Get post by ID
 */
export async function getPost(id: string): Promise<ServiceResponse<any>> {
  try {
    const post = await db.query.socialPosts.findFirst({
      where: eq(socialPosts.id, id),
      with: {
        trader: true,
      },
    });

    if (!post) {
      return { success: false, error: 'Post not found', code: 'POST_NOT_FOUND' };
    }

    return { success: true, data: post };
  } catch (error) {
    return { success: false, error: 'Failed to get post', code: 'GET_POST_FAILED' };
  }
}

/**
 * Update post
 */
export async function updatePost(id: string, request: UpdatePostRequest): Promise<ServiceResponse<any>> {
  try {
    const post = await db.query.socialPosts.findFirst({
      where: eq(socialPosts.id, id),
    });

    if (!post) {
      return { success: false, error: 'Post not found', code: 'POST_NOT_FOUND' };
    }

    const updateData: any = { updatedAt: new Date() };

    if (request.content !== undefined) {
      if (request.content.length > 5000) {
        return { success: false, error: 'Content too long', code: 'CONTENT_TOO_LONG' };
      }
      updateData.content = request.content;
    }

    if (request.title !== undefined) {
      updateData.title = request.title;
    }

    if (request.attachments !== undefined) {
      updateData.attachments = request.attachments;
    }

    if (request.isPinned !== undefined) {
      updateData.isPinned = request.isPinned;
    }

    const [updated] = await db
      .update(socialPosts)
      .set(updateData)
      .where(eq(socialPosts.id, id))
      .returning();

    return { success: true, data: updated };
  } catch (error) {
    return { success: false, error: 'Failed to update post', code: 'UPDATE_POST_FAILED' };
  }
}

/**
 * Delete post
 */
export async function deletePost(id: string): Promise<ServiceResponse<void>> {
  try {
    const post = await db.query.socialPosts.findFirst({
      where: eq(socialPosts.id, id),
    });

    if (!post) {
      return { success: false, error: 'Post not found', code: 'POST_NOT_FOUND' };
    }

    await db.delete(socialPosts).where(eq(socialPosts.id, id));

    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: 'Failed to delete post', code: 'DELETE_POST_FAILED' };
  }
}

/**
 * Get social feed with ranking algorithm
 */
export async function getFeed(
  tenantId: string,
  limit = 50,
  offset = 0,
  filters?: FeedFilters
): Promise<ServiceResponse<any[]>> {
  try {
    const conditions = [eq(socialPosts.tenantId, tenantId)];

    if (filters?.traderId) {
      conditions.push(eq(socialPosts.traderId, filters.traderId));
    }

    if (filters?.postType) {
      conditions.push(eq(socialPosts.postType, filters.postType));
    }

    if (filters?.startDate) {
      conditions.push(gte(socialPosts.createdAt, filters.startDate));
    }

    // Calculate engagement score for ranking
    const posts = await db
      .select({
        id: socialPosts.id,
        content: socialPosts.content,
        postType: socialPosts.postType,
        title: socialPosts.title,
        attachments: socialPosts.attachments,
        likes: socialPosts.likes,
        comments: socialPosts.comments,
        shares: socialPosts.shares,
        isPinned: socialPosts.isPinned,
        createdAt: socialPosts.createdAt,
        updatedAt: socialPosts.updatedAt,
        traderId: socialPosts.traderId,
        traderName: socialTraders.displayName,
        isVerified: socialTraders.isVerified,
        engagementScore: sql<number>`(${socialPosts.likes} * 1 + ${socialPosts.comments} * 3 + ${socialPosts.shares} * 5)`,
      })
      .from(socialPosts)
      .innerJoin(socialTraders, eq(socialPosts.traderId, socialTraders.id))
      .where(and(...conditions))
      .orderBy(desc(socialPosts.isPinned), desc(sql`engagement_score`), desc(socialPosts.createdAt))
      .limit(limit)
      .offset(offset);

    return { success: true, data: posts };
  } catch (error) {
    return { success: false, error: 'Failed to get feed', code: 'GET_FEED_FAILED' };
  }
}

/**
 * Get posts by trader
 */
export async function getTraderPosts(traderId: string, limit = 50): Promise<ServiceResponse<any[]>> {
  try {
    const posts = await db.query.socialPosts.findMany({
      where: eq(socialPosts.traderId, traderId),
      orderBy: desc(socialPosts.createdAt),
      limit,
      with: {
        trader: true,
      },
    });

    return { success: true, data: posts };
  } catch (error) {
    return { success: false, error: 'Failed to get trader posts', code: 'GET_TRADER_POSTS_FAILED' };
  }
}

/**
 * Get trending posts (highest engagement in last 24h)
 */
export async function getTrendingPosts(tenantId: string, limit = 10): Promise<ServiceResponse<any[]>> {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const posts = await db
      .select({
        id: socialPosts.id,
        content: socialPosts.content,
        postType: socialPosts.postType,
        title: socialPosts.title,
        attachments: socialPosts.attachments,
        likes: socialPosts.likes,
        comments: socialPosts.comments,
        shares: socialPosts.shares,
        createdAt: socialPosts.createdAt,
        traderId: socialPosts.traderId,
        traderName: socialTraders.displayName,
        isVerified: socialTraders.isVerified,
        engagementScore: sql<number>`(${socialPosts.likes} * 1 + ${socialPosts.comments} * 3 + ${socialPosts.shares} * 5)`,
      })
      .from(socialPosts)
      .innerJoin(socialTraders, eq(socialPosts.traderId, socialTraders.id))
      .where(
        and(
          eq(socialPosts.tenantId, tenantId),
          gte(socialPosts.createdAt, yesterday)
        )
      )
      .orderBy(desc(sql`engagement_score`))
      .limit(limit);

    return { success: true, data: posts };
  } catch (error) {
    return { success: false, error: 'Failed to get trending posts', code: 'GET_TRENDING_FAILED' };
  }
}

/**
 * Like a post
 */
export async function likePost(postId: string): Promise<ServiceResponse<any>> {
  try {
    const post = await db.query.socialPosts.findFirst({
      where: eq(socialPosts.id, postId),
    });

    if (!post) {
      return { success: false, error: 'Post not found', code: 'POST_NOT_FOUND' };
    }

    const [updated] = await db
      .update(socialPosts)
      .set({
        likes: sql`${socialPosts.likes} + 1`,
      })
      .where(eq(socialPosts.id, postId))
      .returning();

    return { success: true, data: updated };
  } catch (error) {
    return { success: false, error: 'Failed to like post', code: 'LIKE_POST_FAILED' };
  }
}

/**
 * Unlike a post
 */
export async function unlikePost(postId: string): Promise<ServiceResponse<any>> {
  try {
    const post = await db.query.socialPosts.findFirst({
      where: eq(socialPosts.id, postId),
    });

    if (!post) {
      return { success: false, error: 'Post not found', code: 'POST_NOT_FOUND' };
    }

    const [updated] = await db
      .update(socialPosts)
      .set({
        likes: sql`GREATEST(${socialPosts.likes} - 1, 0)`,
      })
      .where(eq(socialPosts.id, postId))
      .returning();

    return { success: true, data: updated };
  } catch (error) {
    return { success: false, error: 'Failed to unlike post', code: 'UNLIKE_POST_FAILED' };
  }
}

/**
 * Increment comment count
 */
export async function incrementComments(postId: string): Promise<ServiceResponse<void>> {
  try {
    await db
      .update(socialPosts)
      .set({
        comments: sql`${socialPosts.comments} + 1`,
      })
      .where(eq(socialPosts.id, postId));

    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: 'Failed to increment comments', code: 'INCREMENT_COMMENTS_FAILED' };
  }
}

/**
 * Decrement comment count
 */
export async function decrementComments(postId: string): Promise<ServiceResponse<void>> {
  try {
    await db
      .update(socialPosts)
      .set({
        comments: sql`GREATEST(${socialPosts.comments} - 1, 0)`,
      })
      .where(eq(socialPosts.id, postId));

    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: 'Failed to decrement comments', code: 'DECREMENT_COMMENTS_FAILED' };
  }
}

/**
 * Share a post
 */
export async function sharePost(postId: string): Promise<ServiceResponse<any>> {
  try {
    const post = await db.query.socialPosts.findFirst({
      where: eq(socialPosts.id, postId),
    });

    if (!post) {
      return { success: false, error: 'Post not found', code: 'POST_NOT_FOUND' };
    }

    const [updated] = await db
      .update(socialPosts)
      .set({
        shares: sql`${socialPosts.shares} + 1`,
      })
      .where(eq(socialPosts.id, postId))
      .returning();

    return { success: true, data: updated };
  } catch (error) {
    return { success: false, error: 'Failed to share post', code: 'SHARE_POST_FAILED' };
  }
}

/**
 * Pin/unpin a post
 */
export async function togglePinPost(postId: string): Promise<ServiceResponse<any>> {
  try {
    const post = await db.query.socialPosts.findFirst({
      where: eq(socialPosts.id, postId),
    });

    if (!post) {
      return { success: false, error: 'Post not found', code: 'POST_NOT_FOUND' };
    }

    const [updated] = await db
      .update(socialPosts)
      .set({
        isPinned: !post.isPinned,
      })
      .where(eq(socialPosts.id, postId))
      .returning();

    return { success: true, data: updated };
  } catch (error) {
    return { success: false, error: 'Failed to toggle pin', code: 'TOGGLE_PIN_FAILED' };
  }
}

/**
 * Search posts by keyword
 */
export async function searchPosts(
  tenantId: string,
  keyword: string,
  limit = 50
): Promise<ServiceResponse<any[]>> {
  try {
    const posts = await db
      .select()
      .from(socialPosts)
      .where(
        and(
          eq(socialPosts.tenantId, tenantId),
          or(
            sql`${socialPosts.content} ILIKE ${'%' + keyword + '%'}`,
            sql`${socialPosts.title} ILIKE ${'%' + keyword + '%'}`
          )
        )
      )
      .orderBy(desc(socialPosts.createdAt))
      .limit(limit);

    return { success: true, data: posts };
  } catch (error) {
    return { success: false, error: 'Failed to search posts', code: 'SEARCH_POSTS_FAILED' };
  }
}

/**
 * Get feed statistics
 */
export async function getFeedStats(tenantId: string): Promise<ServiceResponse<any>> {
  try {
    const [stats] = await db
      .select({
        totalPosts: sql<number>`COUNT(*)`,
        totalLikes: sql<number>`SUM(${socialPosts.likes})`,
        totalComments: sql<number>`SUM(${socialPosts.comments})`,
        totalShares: sql<number>`SUM(${socialPosts.shares})`,
        avgEngagement: sql<number>`AVG(${socialPosts.likes} + ${socialPosts.comments} + ${socialPosts.shares})`,
      })
      .from(socialPosts)
      .where(eq(socialPosts.tenantId, tenantId));

    return {
      success: true,
      data: {
        totalPosts: Number(stats.totalPosts),
        totalLikes: Number(stats.totalLikes || 0),
        totalComments: Number(stats.totalComments || 0),
        totalShares: Number(stats.totalShares || 0),
        avgEngagement: Math.round(Number(stats.avgEngagement || 0) * 100) / 100,
      },
    };
  } catch (error) {
    return { success: false, error: 'Failed to get feed stats', code: 'GET_FEED_STATS_FAILED' };
  }
}
