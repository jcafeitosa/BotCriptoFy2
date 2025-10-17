/**
 * Trading Signal Service
 * Complete implementation for trading signals with performance tracking and validation
 */

import { db } from '../../../db';
import { socialSignals, socialTraders } from '../schema/social.schema';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import type { ServiceResponse } from '../types/social.types';

export interface CreateSignalRequest {
  tenantId: string;
  traderId: string;
  symbol: string;
  signalType: 'buy' | 'sell' | 'hold';
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  confidence?: number; // 0-100
  reasoning?: string;
}

export interface UpdateSignalRequest {
  currentPrice?: number;
  profit?: number;
  hitTarget?: boolean;
  hitStopLoss?: boolean;
  isActive?: boolean;
  closedAt?: Date;
}

export interface ListSignalsRequest {
  traderId?: string;
  symbol?: string;
  isActive?: boolean;
  signalType?: 'buy' | 'sell' | 'hold';
  minConfidence?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Create a new trading signal
 */
export async function createSignal(request: CreateSignalRequest): Promise<ServiceResponse<any>> {
  try {
    // Validate trader exists
    const trader = await db.query.socialTraders.findFirst({
      where: eq(socialTraders.id, request.traderId),
    });

    if (!trader) {
      return { success: false, error: 'Trader not found', code: 'TRADER_NOT_FOUND' };
    }

    // Validate confidence
    if (request.confidence !== undefined && (request.confidence < 0 || request.confidence > 100)) {
      return { success: false, error: 'Confidence must be between 0 and 100', code: 'INVALID_CONFIDENCE' };
    }

    // Create signal
    const [signal] = await db.insert(socialSignals).values({
      tenantId: request.tenantId,
      traderId: request.traderId,
      symbol: request.symbol,
      signalType: request.signalType,
      entryPrice: request.entryPrice.toString(),
      stopLoss: request.stopLoss?.toString(),
      takeProfit: request.takeProfit?.toString(),
      confidence: request.confidence || 50,
      reasoning: request.reasoning,
      isActive: true,
    }).returning();

    return { success: true, data: signal };
  } catch (error) {
    return { success: false, error: 'Failed to create signal', code: 'CREATE_SIGNAL_FAILED' };
  }
}

/**
 * Get signal by ID
 */
export async function getSignal(id: string): Promise<ServiceResponse<any>> {
  try {
    const signal = await db.query.socialSignals.findFirst({
      where: eq(socialSignals.id, id),
      with: {
        trader: true,
      },
    });

    if (!signal) {
      return { success: false, error: 'Signal not found', code: 'SIGNAL_NOT_FOUND' };
    }

    return { success: true, data: signal };
  } catch (error) {
    return { success: false, error: 'Failed to get signal', code: 'GET_SIGNAL_FAILED' };
  }
}

/**
 * Update signal (close, mark as hit/missed, add results)
 */
export async function updateSignal(id: string, request: UpdateSignalRequest): Promise<ServiceResponse<any>> {
  try {
    const signal = await db.query.socialSignals.findFirst({
      where: eq(socialSignals.id, id),
    });

    if (!signal) {
      return { success: false, error: 'Signal not found', code: 'SIGNAL_NOT_FOUND' };
    }

    const updateData: any = {};

    if (request.currentPrice !== undefined) {
      updateData.currentPrice = request.currentPrice.toString();
    }

    if (request.profit !== undefined) {
      updateData.profit = request.profit.toString();
    }

    if (request.hitTarget !== undefined) {
      updateData.hitTarget = request.hitTarget;
    }

    if (request.hitStopLoss !== undefined) {
      updateData.hitStopLoss = request.hitStopLoss;
    }

    if (request.isActive !== undefined) {
      updateData.isActive = request.isActive;
    }

    if (request.closedAt) {
      updateData.closedAt = request.closedAt;
    }

    const [updated] = await db
      .update(socialSignals)
      .set(updateData)
      .where(eq(socialSignals.id, id))
      .returning();

    return { success: true, data: updated };
  } catch (error) {
    return { success: false, error: 'Failed to update signal', code: 'UPDATE_SIGNAL_FAILED' };
  }
}

/**
 * Delete signal
 */
export async function deleteSignal(id: string): Promise<ServiceResponse<void>> {
  try {
    const signal = await db.query.socialSignals.findFirst({
      where: eq(socialSignals.id, id),
    });

    if (!signal) {
      return { success: false, error: 'Signal not found', code: 'SIGNAL_NOT_FOUND' };
    }

    await db.delete(socialSignals).where(eq(socialSignals.id, id));

    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: 'Failed to delete signal', code: 'DELETE_SIGNAL_FAILED' };
  }
}

/**
 * List signals with advanced filtering
 */
export async function getSignals(request: ListSignalsRequest = {}): Promise<ServiceResponse<any[]>> {
  try {
    const conditions = [];

    if (request.traderId) {
      conditions.push(eq(socialSignals.traderId, request.traderId));
    }

    if (request.symbol) {
      conditions.push(eq(socialSignals.symbol, request.symbol));
    }

    if (request.isActive !== undefined) {
      conditions.push(eq(socialSignals.isActive, request.isActive));
    }

    if (request.signalType) {
      conditions.push(eq(socialSignals.signalType, request.signalType));
    }

    if (request.minConfidence !== undefined) {
      conditions.push(sql`CAST(${socialSignals.confidence} AS DECIMAL) >= ${request.minConfidence}`);
    }

    if (request.startDate) {
      conditions.push(gte(socialSignals.createdAt, request.startDate));
    }

    if (request.endDate) {
      conditions.push(lte(socialSignals.createdAt, request.endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const signals = await db.query.socialSignals.findMany({
      where: whereClause,
      with: {
        trader: true,
      },
      orderBy: desc(socialSignals.createdAt),
      limit: request.limit || 50,
      offset: request.offset || 0,
    });

    return { success: true, data: signals };
  } catch (error) {
    return { success: false, error: 'Failed to get signals', code: 'GET_SIGNALS_FAILED' };
  }
}

/**
 * Get active signals for a trader
 */
export async function getActiveSignals(traderId: string): Promise<ServiceResponse<any[]>> {
  try {
    const signals = await db.query.socialSignals.findMany({
      where: and(
        eq(socialSignals.traderId, traderId),
        eq(socialSignals.isActive, true)
      ),
      orderBy: desc(socialSignals.createdAt),
    });

    return { success: true, data: signals };
  } catch (error) {
    return { success: false, error: 'Failed to get active signals', code: 'GET_ACTIVE_SIGNALS_FAILED' };
  }
}

/**
 * Get signal performance statistics for a trader
 */
export async function getSignalStats(traderId: string): Promise<ServiceResponse<any>> {
  try {
    const [stats] = await db
      .select({
        totalSignals: sql<number>`COUNT(*)`,
        activeSignals: sql<number>`COUNT(*) FILTER (WHERE is_active = true)`,
        hitTargetSignals: sql<number>`COUNT(*) FILTER (WHERE hit_target = true)`,
        hitStopLossSignals: sql<number>`COUNT(*) FILTER (WHERE hit_stop_loss = true)`,
        closedSignals: sql<number>`COUNT(*) FILTER (WHERE is_active = false)`,
        avgConfidence: sql<number>`AVG(confidence)`,
        totalProfit: sql<number>`SUM(CAST(profit AS DECIMAL))`,
      })
      .from(socialSignals)
      .where(eq(socialSignals.traderId, traderId));

    const closedCount = Number(stats.closedSignals);
    const successRate = closedCount > 0
      ? (Number(stats.hitTargetSignals) / closedCount) * 100
      : 0;

    return {
      success: true,
      data: {
        totalSignals: Number(stats.totalSignals),
        activeSignals: Number(stats.activeSignals),
        hitTargetSignals: Number(stats.hitTargetSignals),
        hitStopLossSignals: Number(stats.hitStopLossSignals),
        closedSignals: closedCount,
        avgConfidence: Math.round(Number(stats.avgConfidence || 0) * 100) / 100,
        totalProfit: Number(stats.totalProfit || 0),
        successRate: Math.round(successRate * 100) / 100,
      },
    };
  } catch (error) {
    return { success: false, error: 'Failed to get signal stats', code: 'GET_SIGNAL_STATS_FAILED' };
  }
}

/**
 * Close signal with result (hit/missed)
 */
export async function closeSignal(
  id: string,
  currentPrice: number,
  hitTarget: boolean
): Promise<ServiceResponse<any>> {
  try {
    const signal = await db.query.socialSignals.findFirst({
      where: eq(socialSignals.id, id),
    });

    if (!signal) {
      return { success: false, error: 'Signal not found', code: 'SIGNAL_NOT_FOUND' };
    }

    if (!signal.isActive) {
      return { success: false, error: 'Signal not active', code: 'SIGNAL_NOT_ACTIVE' };
    }

    // Calculate profit
    const entry = parseFloat(signal.entryPrice);
    const profitPercent = ((currentPrice - entry) / entry) * 100;
    const adjustedProfit = signal.signalType === 'buy' ? profitPercent : -profitPercent;

    const [closed] = await db
      .update(socialSignals)
      .set({
        currentPrice: currentPrice.toString(),
        closedAt: new Date(),
        isActive: false,
        hitTarget,
        profit: adjustedProfit.toString(),
      })
      .where(eq(socialSignals.id, id))
      .returning();

    return { success: true, data: closed };
  } catch (error) {
    return { success: false, error: 'Failed to close signal', code: 'CLOSE_SIGNAL_FAILED' };
  }
}

/**
 * Cancel an active signal
 */
export async function cancelSignal(id: string): Promise<ServiceResponse<any>> {
  try {
    const signal = await db.query.socialSignals.findFirst({
      where: eq(socialSignals.id, id),
    });

    if (!signal) {
      return { success: false, error: 'Signal not found', code: 'SIGNAL_NOT_FOUND' };
    }

    if (!signal.isActive) {
      return { success: false, error: 'Signal not active', code: 'SIGNAL_NOT_ACTIVE' };
    }

    const [cancelled] = await db
      .update(socialSignals)
      .set({
        isActive: false,
        closedAt: new Date(),
      })
      .where(eq(socialSignals.id, id))
      .returning();

    return { success: true, data: cancelled };
  } catch (error) {
    return { success: false, error: 'Failed to cancel signal', code: 'CANCEL_SIGNAL_FAILED' };
  }
}

/**
 * Get signals by symbol
 */
export async function getSignalsBySymbol(symbol: string, limit = 20): Promise<ServiceResponse<any[]>> {
  try {
    const signals = await db.query.socialSignals.findMany({
      where: eq(socialSignals.symbol, symbol),
      with: {
        trader: true,
      },
      orderBy: desc(socialSignals.createdAt),
      limit,
    });

    return { success: true, data: signals };
  } catch (error) {
    return { success: false, error: 'Failed to get signals by symbol', code: 'GET_SIGNALS_BY_SYMBOL_FAILED' };
  }
}

/**
 * Get top performing signals by hit rate
 */
export async function getTopSignals(limit = 10): Promise<ServiceResponse<any>> {
  try {
    const topTraders = await db
      .select({
        traderId: socialSignals.traderId,
        totalSignals: sql<number>`COUNT(*)`,
        hitTargetSignals: sql<number>`COUNT(*) FILTER (WHERE hit_target = true)`,
        closedSignals: sql<number>`COUNT(*) FILTER (WHERE is_active = false)`,
        hitRate: sql<number>`(COUNT(*) FILTER (WHERE hit_target = true)::DECIMAL / NULLIF(COUNT(*) FILTER (WHERE is_active = false), 0)) * 100`,
        avgProfit: sql<number>`AVG(CAST(profit AS DECIMAL))`,
      })
      .from(socialSignals)
      .groupBy(socialSignals.traderId)
      .having(sql`COUNT(*) FILTER (WHERE is_active = false) >= 10`)
      .orderBy(desc(sql`hit_rate`))
      .limit(limit);

    return { success: true, data: topTraders };
  } catch (error) {
    return { success: false, error: 'Failed to get top signals', code: 'GET_TOP_SIGNALS_FAILED' };
  }
}
