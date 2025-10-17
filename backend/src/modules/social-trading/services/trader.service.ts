/**
 * Trader Service
 *
 * Complete implementation for managing trader profiles in the social trading platform
 *
 * Features:
 * - CRUD operations for trader profiles
 * - Search and filtering
 * - Stats management (trades, win rate, followers)
 * - Verification and premium status
 * - Copier management
 */

import { db } from '../../../db';
import { socialTraders } from '../schema/social.schema';
import { eq, and, desc, asc, or, ilike, sql } from 'drizzle-orm';
import type {
  CreateTraderRequest,
  TraderProfile,
  ServiceResponse,
  TraderStatus
} from '../types/social.types';

/**
 * Create a new trader profile
 */
export async function createTrader(
  request: CreateTraderRequest
): Promise<ServiceResponse<TraderProfile>> {
  try {
    // Validate required fields
    if (!request.tenantId || !request.userId || !request.displayName) {
      return {
        success: false,
        error: 'Missing required fields: tenantId, userId, displayName',
        code: 'INVALID_INPUT',
      };
    }

    // Check if trader already exists for this user
    const existing = await db
      .select()
      .from(socialTraders)
      .where(
        and(
          eq(socialTraders.tenantId, request.tenantId),
          eq(socialTraders.userId, request.userId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return {
        success: false,
        error: 'Trader profile already exists for this user',
        code: 'TRADER_EXISTS',
      };
    }

    // Create trader
    const [trader] = await db
      .insert(socialTraders)
      .values({
        tenantId: request.tenantId,
        userId: request.userId,
        displayName: request.displayName,
        bio: request.bio || null,
        specialties: request.specialties || [],
        strategyType: request.strategyType || null,
        tradingSince: new Date(),
        status: 'active',
        isPublic: true,
        allowCopying: true,
        maxCopiers: 100,
        currentCopiers: 0,
        isVerified: false,
        isPremium: false,
        totalFollowers: 0,
        totalTrades: 0,
        winRate: '0',
      })
      .returning();

    return {
      success: true,
      data: trader as TraderProfile,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to create trader: ${errorMessage}`,
      code: 'CREATE_TRADER_FAILED',
    };
  }
}

/**
 * Get trader by ID
 */
export async function getTrader(
  traderId: string,
  tenantId: string
): Promise<ServiceResponse<TraderProfile>> {
  try {
    if (!traderId || !tenantId) {
      return {
        success: false,
        error: 'Missing required fields: traderId, tenantId',
        code: 'INVALID_INPUT',
      };
    }

    const [trader] = await db
      .select()
      .from(socialTraders)
      .where(
        and(
          eq(socialTraders.id, traderId),
          eq(socialTraders.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!trader) {
      return {
        success: false,
        error: 'Trader not found',
        code: 'TRADER_NOT_FOUND',
      };
    }

    return {
      success: true,
      data: trader as TraderProfile,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to get trader: ${errorMessage}`,
      code: 'GET_TRADER_FAILED',
    };
  }
}

/**
 * Update trader profile
 */
export async function updateTrader(
  traderId: string,
  tenantId: string,
  updates: Partial<{
    displayName: string;
    bio: string;
    avatar: string;
    country: string;
    specialties: string[];
    strategyType: string;
    isPublic: boolean;
    allowCopying: boolean;
    maxCopiers: number;
    subscriptionFee: string;
  }>
): Promise<ServiceResponse<TraderProfile>> {
  try {
    if (!traderId || !tenantId) {
      return {
        success: false,
        error: 'Missing required fields: traderId, tenantId',
        code: 'INVALID_INPUT',
      };
    }

    if (Object.keys(updates).length === 0) {
      return {
        success: false,
        error: 'No updates provided',
        code: 'INVALID_INPUT',
      };
    }

    // Check if trader exists
    const existing = await getTrader(traderId, tenantId);
    if (!existing.success) {
      return existing;
    }

    // Build update object safely
    const updateData: Record<string, any> = {
      updatedAt: new Date(),
    };

    // Only include valid fields
    if (updates.displayName !== undefined) updateData.displayName = updates.displayName;
    if (updates.bio !== undefined) updateData.bio = updates.bio;
    if (updates.avatar !== undefined) updateData.avatar = updates.avatar;
    if (updates.country !== undefined) updateData.country = updates.country;
    if (updates.specialties !== undefined) updateData.specialties = updates.specialties;
    if (updates.strategyType !== undefined) updateData.strategyType = updates.strategyType;
    if (updates.isPublic !== undefined) updateData.isPublic = updates.isPublic;
    if (updates.allowCopying !== undefined) updateData.allowCopying = updates.allowCopying;
    if (updates.maxCopiers !== undefined) updateData.maxCopiers = updates.maxCopiers;
    if (updates.subscriptionFee !== undefined) updateData.subscriptionFee = updates.subscriptionFee;

    // Update trader
    const [updated] = await db
      .update(socialTraders)
      .set(updateData)
      .where(
        and(
          eq(socialTraders.id, traderId),
          eq(socialTraders.tenantId, tenantId)
        )
      )
      .returning();

    return {
      success: true,
      data: updated as TraderProfile,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to update trader: ${errorMessage}`,
      code: 'UPDATE_TRADER_FAILED',
    };
  }
}

/**
 * Delete trader (soft delete - set status to inactive)
 */
export async function deleteTrader(
  traderId: string,
  tenantId: string
): Promise<ServiceResponse<void>> {
  try {
    if (!traderId || !tenantId) {
      return {
        success: false,
        error: 'Missing required fields: traderId, tenantId',
        code: 'INVALID_INPUT',
      };
    }

    // Check if trader exists
    const existing = await getTrader(traderId, tenantId);
    if (!existing.success) {
      return { success: false, error: existing.error, code: existing.code };
    }

    // Soft delete by setting status to inactive
    await db
      .update(socialTraders)
      .set({
        status: 'inactive',
        allowCopying: false,
        isPublic: false,
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
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to delete trader: ${errorMessage}`,
      code: 'DELETE_TRADER_FAILED',
    };
  }
}

/**
 * List traders with filters
 */
export async function listTraders(
  tenantId: string,
  filters?: {
    limit?: number;
    offset?: number;
    status?: TraderStatus;
    specialty?: string;
    isVerified?: boolean;
    isPremium?: boolean;
    isPublic?: boolean;
    allowCopying?: boolean;
    minWinRate?: number;
    minTotalTrades?: number;
    sortBy?: 'totalFollowers' | 'winRate' | 'totalTrades' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }
): Promise<ServiceResponse<TraderProfile[]>> {
  try {
    if (!tenantId) {
      return {
        success: false,
        error: 'Missing required field: tenantId',
        code: 'INVALID_INPUT',
      };
    }

    // Build where conditions
    const conditions = [eq(socialTraders.tenantId, tenantId)];

    if (filters?.status) {
      conditions.push(eq(socialTraders.status, filters.status));
    }

    if (filters?.isVerified !== undefined) {
      conditions.push(eq(socialTraders.isVerified, filters.isVerified));
    }

    if (filters?.isPremium !== undefined) {
      conditions.push(eq(socialTraders.isPremium, filters.isPremium));
    }

    if (filters?.isPublic !== undefined) {
      conditions.push(eq(socialTraders.isPublic, filters.isPublic));
    }

    if (filters?.allowCopying !== undefined) {
      conditions.push(eq(socialTraders.allowCopying, filters.allowCopying));
    }

    if (filters?.specialty) {
      conditions.push(
        sql`${filters.specialty} = ANY(${socialTraders.specialties})`
      );
    }

    if (filters?.minWinRate !== undefined) {
      conditions.push(
        sql`${socialTraders.winRate}::numeric >= ${filters.minWinRate}`
      );
    }

    if (filters?.minTotalTrades !== undefined) {
      conditions.push(
        sql`${socialTraders.totalTrades} >= ${filters.minTotalTrades}`
      );
    }

    // Build order by
    const sortBy = filters?.sortBy || 'totalFollowers';
    const sortOrder = filters?.sortOrder || 'desc';

    // Map sort field to column
    let orderByColumn;
    switch (sortBy) {
      case 'totalFollowers':
        orderByColumn = socialTraders.totalFollowers;
        break;
      case 'winRate':
        orderByColumn = socialTraders.winRate;
        break;
      case 'totalTrades':
        orderByColumn = socialTraders.totalTrades;
        break;
      case 'createdAt':
        orderByColumn = socialTraders.createdAt;
        break;
      default:
        orderByColumn = socialTraders.totalFollowers;
    }

    const orderByClause = sortOrder === 'asc' ? asc(orderByColumn) : desc(orderByColumn);

    // Execute query
    const traders = await db
      .select()
      .from(socialTraders)
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0);

    return {
      success: true,
      data: traders as TraderProfile[],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to list traders: ${errorMessage}`,
      code: 'LIST_TRADERS_FAILED',
    };
  }
}

/**
 * Search traders by name or bio
 */
export async function searchTraders(
  tenantId: string,
  searchTerm: string,
  filters?: {
    limit?: number;
    offset?: number;
    status?: TraderStatus;
    isVerified?: boolean;
  }
): Promise<ServiceResponse<TraderProfile[]>> {
  try {
    if (!tenantId || !searchTerm) {
      return {
        success: false,
        error: 'Missing required fields: tenantId, searchTerm',
        code: 'INVALID_INPUT',
      };
    }

    // Build where conditions
    const conditions = [
      eq(socialTraders.tenantId, tenantId),
      or(
        ilike(socialTraders.displayName, `%${searchTerm}%`),
        ilike(socialTraders.bio, `%${searchTerm}%`)
      ),
    ];

    if (filters?.status) {
      conditions.push(eq(socialTraders.status, filters.status));
    }

    if (filters?.isVerified !== undefined) {
      conditions.push(eq(socialTraders.isVerified, filters.isVerified));
    }

    // Execute search
    const traders = await db
      .select()
      .from(socialTraders)
      .where(and(...conditions))
      .orderBy(desc(socialTraders.totalFollowers))
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0);

    return {
      success: true,
      data: traders as TraderProfile[],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to search traders: ${errorMessage}`,
      code: 'SEARCH_TRADERS_FAILED',
    };
  }
}

/**
 * Update trader stats (totalTrades, winRate)
 */
export async function updateStats(
  traderId: string,
  tenantId: string,
  stats: {
    totalTrades?: number;
    winRate?: string;
    totalFollowers?: number;
  }
): Promise<ServiceResponse<TraderProfile>> {
  try {
    if (!traderId || !tenantId) {
      return {
        success: false,
        error: 'Missing required fields: traderId, tenantId',
        code: 'INVALID_INPUT',
      };
    }

    if (Object.keys(stats).length === 0) {
      return {
        success: false,
        error: 'No stats provided',
        code: 'INVALID_INPUT',
      };
    }

    // Validate numeric values
    if (stats.totalTrades !== undefined && stats.totalTrades < 0) {
      return {
        success: false,
        error: 'totalTrades cannot be negative',
        code: 'INVALID_INPUT',
      };
    }

    if (stats.totalFollowers !== undefined && stats.totalFollowers < 0) {
      return {
        success: false,
        error: 'totalFollowers cannot be negative',
        code: 'INVALID_INPUT',
      };
    }

    if (stats.winRate !== undefined) {
      const winRateNum = parseFloat(stats.winRate);
      if (isNaN(winRateNum) || winRateNum < 0 || winRateNum > 100) {
        return {
          success: false,
          error: 'winRate must be between 0 and 100',
          code: 'INVALID_INPUT',
        };
      }
    }

    // Check if trader exists
    const existing = await getTrader(traderId, tenantId);
    if (!existing.success) {
      return existing;
    }

    // Update stats
    const [updated] = await db
      .update(socialTraders)
      .set({
        ...stats,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(socialTraders.id, traderId),
          eq(socialTraders.tenantId, tenantId)
        )
      )
      .returning();

    return {
      success: true,
      data: updated as TraderProfile,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to update stats: ${errorMessage}`,
      code: 'UPDATE_STATS_FAILED',
    };
  }
}

/**
 * Verify trader (set isVerified = true)
 */
export async function verifyTrader(
  traderId: string,
  tenantId: string
): Promise<ServiceResponse<TraderProfile>> {
  try {
    if (!traderId || !tenantId) {
      return {
        success: false,
        error: 'Missing required fields: traderId, tenantId',
        code: 'INVALID_INPUT',
      };
    }

    // Check if trader exists
    const existing = await getTrader(traderId, tenantId);
    if (!existing.success) {
      return existing;
    }

    // Verify trader
    const [verified] = await db
      .update(socialTraders)
      .set({
        isVerified: true,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(socialTraders.id, traderId),
          eq(socialTraders.tenantId, tenantId)
        )
      )
      .returning();

    return {
      success: true,
      data: verified as TraderProfile,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to verify trader: ${errorMessage}`,
      code: 'VERIFY_TRADER_FAILED',
    };
  }
}

/**
 * Toggle copying allowed status
 */
export async function toggleCopyingAllowed(
  traderId: string,
  tenantId: string,
  allowCopying: boolean
): Promise<ServiceResponse<TraderProfile>> {
  try {
    if (!traderId || !tenantId) {
      return {
        success: false,
        error: 'Missing required fields: traderId, tenantId',
        code: 'INVALID_INPUT',
      };
    }

    // Check if trader exists
    const existing = await getTrader(traderId, tenantId);
    if (!existing.success) {
      return existing;
    }

    // Toggle copying
    const [updated] = await db
      .update(socialTraders)
      .set({
        allowCopying,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(socialTraders.id, traderId),
          eq(socialTraders.tenantId, tenantId)
        )
      )
      .returning();

    return {
      success: true,
      data: updated as TraderProfile,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to toggle copying: ${errorMessage}`,
      code: 'TOGGLE_COPYING_FAILED',
    };
  }
}

/**
 * Increment copiers count
 */
export async function incrementCopiers(
  traderId: string,
  tenantId: string
): Promise<ServiceResponse<TraderProfile>> {
  try {
    if (!traderId || !tenantId) {
      return {
        success: false,
        error: 'Missing required fields: traderId, tenantId',
        code: 'INVALID_INPUT',
      };
    }

    // Check if trader exists and can accept more copiers
    const existing = await getTrader(traderId, tenantId);
    if (!existing.success || !existing.data) {
      return existing;
    }

    if (!existing.data.allowCopying) {
      return {
        success: false,
        error: 'Trader does not allow copying',
        code: 'COPYING_NOT_ALLOWED',
      };
    }

    if (existing.data.currentCopiers >= (existing.data.maxCopiers || 100)) {
      return {
        success: false,
        error: 'Maximum copiers limit reached',
        code: 'MAX_COPIERS_REACHED',
      };
    }

    // Increment copiers
    const [updated] = await db
      .update(socialTraders)
      .set({
        currentCopiers: sql`${socialTraders.currentCopiers} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(socialTraders.id, traderId),
          eq(socialTraders.tenantId, tenantId)
        )
      )
      .returning();

    return {
      success: true,
      data: updated as TraderProfile,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to increment copiers: ${errorMessage}`,
      code: 'INCREMENT_COPIERS_FAILED',
    };
  }
}

/**
 * Decrement copiers count
 */
export async function decrementCopiers(
  traderId: string,
  tenantId: string
): Promise<ServiceResponse<TraderProfile>> {
  try {
    if (!traderId || !tenantId) {
      return {
        success: false,
        error: 'Missing required fields: traderId, tenantId',
        code: 'INVALID_INPUT',
      };
    }

    // Check if trader exists
    const existing = await getTrader(traderId, tenantId);
    if (!existing.success) {
      return existing;
    }

    // Decrement copiers (but not below 0)
    const [updated] = await db
      .update(socialTraders)
      .set({
        currentCopiers: sql`GREATEST(${socialTraders.currentCopiers} - 1, 0)`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(socialTraders.id, traderId),
          eq(socialTraders.tenantId, tenantId)
        )
      )
      .returning();

    return {
      success: true,
      data: updated as TraderProfile,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to decrement copiers: ${errorMessage}`,
      code: 'DECREMENT_COPIERS_FAILED',
    };
  }
}

/**
 * Get trader by user ID
 */
export async function getTraderByUserId(
  userId: string,
  tenantId: string
): Promise<ServiceResponse<TraderProfile>> {
  try {
    if (!userId || !tenantId) {
      return {
        success: false,
        error: 'Missing required fields: userId, tenantId',
        code: 'INVALID_INPUT',
      };
    }

    const [trader] = await db
      .select()
      .from(socialTraders)
      .where(
        and(
          eq(socialTraders.userId, userId),
          eq(socialTraders.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!trader) {
      return {
        success: false,
        error: 'Trader not found',
        code: 'TRADER_NOT_FOUND',
      };
    }

    return {
      success: true,
      data: trader as TraderProfile,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to get trader by user ID: ${errorMessage}`,
      code: 'GET_TRADER_BY_USER_FAILED',
    };
  }
}

/**
 * Increment followers count
 */
export async function incrementFollowers(
  traderId: string,
  tenantId: string
): Promise<ServiceResponse<TraderProfile>> {
  try {
    if (!traderId || !tenantId) {
      return {
        success: false,
        error: 'Missing required fields: traderId, tenantId',
        code: 'INVALID_INPUT',
      };
    }

    // Increment followers
    const [updated] = await db
      .update(socialTraders)
      .set({
        totalFollowers: sql`${socialTraders.totalFollowers} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(socialTraders.id, traderId),
          eq(socialTraders.tenantId, tenantId)
        )
      )
      .returning();

    return {
      success: true,
      data: updated as TraderProfile,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to increment followers: ${errorMessage}`,
      code: 'INCREMENT_FOLLOWERS_FAILED',
    };
  }
}

/**
 * Decrement followers count
 */
export async function decrementFollowers(
  traderId: string,
  tenantId: string
): Promise<ServiceResponse<TraderProfile>> {
  try {
    if (!traderId || !tenantId) {
      return {
        success: false,
        error: 'Missing required fields: traderId, tenantId',
        code: 'INVALID_INPUT',
      };
    }

    // Decrement followers (but not below 0)
    const [updated] = await db
      .update(socialTraders)
      .set({
        totalFollowers: sql`GREATEST(${socialTraders.totalFollowers} - 1, 0)`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(socialTraders.id, traderId),
          eq(socialTraders.tenantId, tenantId)
        )
      )
      .returning();

    return {
      success: true,
      data: updated as TraderProfile,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to decrement followers: ${errorMessage}`,
      code: 'DECREMENT_FOLLOWERS_FAILED',
    };
  }
}
