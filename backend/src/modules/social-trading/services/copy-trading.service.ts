/**
 * Copy Trading Service
 * Complete implementation for copy trading engine with filters, ratios, and risk management
 */

import { db } from '../../../db';
import { socialCopySettings, socialCopiedTrades, socialTraders } from '../schema/social.schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { CreateCopySettingsRequest, CopySettings, ServiceResponse } from '../types/social.types';
import { prepareCopiedTrade, type TradeToConform } from '../utils/copy-engine';

export interface UpdateCopySettingsRequest {
  copyRatio?: number;
  maxAmountPerTrade?: number;
  maxDailyLoss?: number;
  copiedPairs?: string[];
  stopLossPercentage?: number;
  takeProfitPercentage?: number;
  isActive?: boolean;
}

/**
 * Create copy settings for a copier to follow a trader
 */
export async function createCopySettings(request: CreateCopySettingsRequest): Promise<ServiceResponse<CopySettings>> {
  try {
    // Validate trader exists and allows copying
    const trader = await db.query.socialTraders.findFirst({
      where: eq(socialTraders.id, request.traderId),
    });

    if (!trader) {
      return { success: false, error: 'Trader not found', code: 'TRADER_NOT_FOUND' };
    }

    if (!trader.allowCopying) {
      return { success: false, error: 'Trader does not allow copying', code: 'COPYING_NOT_ALLOWED' };
    }

    // Check if copier already follows this trader
    const existing = await db.query.socialCopySettings.findFirst({
      where: and(
        eq(socialCopySettings.copierId, request.copierId),
        eq(socialCopySettings.traderId, request.traderId)
      ),
    });

    if (existing) {
      return { success: false, error: 'Already copying this trader', code: 'ALREADY_COPYING' };
    }

    // Create copy settings
    const [settings] = await db.insert(socialCopySettings).values({
      tenantId: request.tenantId,
      copierId: request.copierId,
      traderId: request.traderId,
      copyRatio: request.copyRatio?.toString() || '1.0',
      maxAmountPerTrade: request.maxAmountPerTrade?.toString(),
      maxDailyLoss: request.maxDailyLoss?.toString(),
      copiedPairs: request.copiedPairs || [],
      stopLossPercentage: request.stopLossPercentage?.toString(),
      takeProfitPercentage: request.takeProfitPercentage?.toString(),
      isActive: true,
    }).returning();

    // Increment trader's copiers count
    await db
      .update(socialTraders)
      .set({ currentCopiers: sql`${socialTraders.currentCopiers} + 1` })
      .where(eq(socialTraders.id, request.traderId));

    return { success: true, data: settings as CopySettings };
  } catch (error) {
    return { success: false, error: 'Failed to create copy settings', code: 'CREATE_COPY_SETTINGS_FAILED' };
  }
}

/**
 * Get copy settings by ID
 */
export async function getCopySettings(id: string): Promise<ServiceResponse<CopySettings>> {
  try {
    const settings = await db.query.socialCopySettings.findFirst({
      where: eq(socialCopySettings.id, id),
      with: {
        trader: true,
      },
    });

    if (!settings) {
      return { success: false, error: 'Copy settings not found', code: 'SETTINGS_NOT_FOUND' };
    }

    return { success: true, data: settings as CopySettings };
  } catch (error) {
    return { success: false, error: 'Failed to get copy settings', code: 'GET_SETTINGS_FAILED' };
  }
}

/**
 * Update copy settings
 */
export async function updateCopySettings(
  id: string,
  request: UpdateCopySettingsRequest
): Promise<ServiceResponse<CopySettings>> {
  try {
    const [updated] = await db
      .update(socialCopySettings)
      .set({
        copyRatio: request.copyRatio?.toString(),
        maxAmountPerTrade: request.maxAmountPerTrade?.toString(),
        maxDailyLoss: request.maxDailyLoss?.toString(),
        copiedPairs: request.copiedPairs,
        stopLossPercentage: request.stopLossPercentage?.toString(),
        takeProfitPercentage: request.takeProfitPercentage?.toString(),
        isActive: request.isActive,
        updatedAt: new Date(),
      })
      .where(eq(socialCopySettings.id, id))
      .returning();

    if (!updated) {
      return { success: false, error: 'Copy settings not found', code: 'SETTINGS_NOT_FOUND' };
    }

    return { success: true, data: updated as CopySettings };
  } catch (error) {
    return { success: false, error: 'Failed to update copy settings', code: 'UPDATE_SETTINGS_FAILED' };
  }
}

/**
 * Delete copy settings (stop copying)
 */
export async function deleteCopySettings(id: string): Promise<ServiceResponse<void>> {
  try {
    const settings = await db.query.socialCopySettings.findFirst({
      where: eq(socialCopySettings.id, id),
    });

    if (!settings) {
      return { success: false, error: 'Copy settings not found', code: 'SETTINGS_NOT_FOUND' };
    }

    await db.delete(socialCopySettings).where(eq(socialCopySettings.id, id));

    // Decrement trader's copiers count
    await db
      .update(socialTraders)
      .set({ currentCopiers: sql`GREATEST(${socialTraders.currentCopiers} - 1, 0)` })
      .where(eq(socialTraders.id, settings.traderId));

    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: 'Failed to delete copy settings', code: 'DELETE_SETTINGS_FAILED' };
  }
}

/**
 * Get copier's active copy settings
 */
export async function getCopierSettings(copierId: string): Promise<ServiceResponse<CopySettings[]>> {
  try {
    const settings = await db.query.socialCopySettings.findMany({
      where: eq(socialCopySettings.copierId, copierId),
      with: {
        trader: true,
      },
      orderBy: desc(socialCopySettings.startedAt),
    });

    return { success: true, data: settings as CopySettings[] };
  } catch (error) {
    return { success: false, error: 'Failed to get copier settings', code: 'GET_COPIER_SETTINGS_FAILED' };
  }
}

/**
 * Get trader's copiers (who is copying them)
 */
export async function getTraderCopiers(traderId: string): Promise<ServiceResponse<CopySettings[]>> {
  try {
    const copiers = await db.query.socialCopySettings.findMany({
      where: and(
        eq(socialCopySettings.traderId, traderId),
        eq(socialCopySettings.isActive, true)
      ),
      orderBy: desc(socialCopySettings.startedAt),
    });

    return { success: true, data: copiers as CopySettings[] };
  } catch (error) {
    return { success: false, error: 'Failed to get trader copiers', code: 'GET_COPIERS_FAILED' };
  }
}

/**
 * Toggle copy settings active status
 */
export async function toggleCopySettings(id: string): Promise<ServiceResponse<CopySettings>> {
  try {
    const settings = await db.query.socialCopySettings.findFirst({
      where: eq(socialCopySettings.id, id),
    });

    if (!settings) {
      return { success: false, error: 'Copy settings not found', code: 'SETTINGS_NOT_FOUND' };
    }

    const [updated] = await db
      .update(socialCopySettings)
      .set({
        isActive: !settings.isActive,
        updatedAt: new Date(),
      })
      .where(eq(socialCopySettings.id, id))
      .returning();

    return { success: true, data: updated as CopySettings };
  } catch (error) {
    return { success: false, error: 'Failed to toggle copy settings', code: 'TOGGLE_SETTINGS_FAILED' };
  }
}

/**
 * Execute a copied trade based on original trade
 */
export async function executeCopiedTrade(
  copySettingsId: string,
  originalTrade: TradeToConform
): Promise<ServiceResponse<any>> {
  try {
    const settings = await db.query.socialCopySettings.findFirst({
      where: eq(socialCopySettings.id, copySettingsId),
    });

    if (!settings) {
      return { success: false, error: 'Copy settings not found', code: 'SETTINGS_NOT_FOUND' };
    }

    if (!settings.isActive) {
      return { success: false, error: 'Copy settings not active', code: 'SETTINGS_INACTIVE' };
    }

    // Prepare trade with copy engine (applies filters, ratios, limits)
    const copiedTrade = prepareCopiedTrade(originalTrade, settings as CopySettings);

    if (!copiedTrade.shouldExecute) {
      return { success: false, error: copiedTrade.reason, code: 'TRADE_NOT_COPIED' };
    }

    // Record copied trade
    const [trade] = await db.insert(socialCopiedTrades).values({
      tenantId: settings.tenantId,
      copySettingsId,
      originalTradeId: (originalTrade as any).id || 'original-' + Date.now(),
      traderId: settings.traderId,
      copierId: settings.copierId,
      symbol: copiedTrade.symbol,
      side: copiedTrade.side,
      amount: copiedTrade.adjustedAmount.toString(),
      entryPrice: copiedTrade.price.toString(),
      status: 'open',
    }).returning();

    // TODO: Execute actual trade via orders module
    // This would integrate with the orders service to place the actual order

    return { success: true, data: trade };
  } catch (error) {
    return { success: false, error: 'Failed to execute copied trade', code: 'EXECUTE_TRADE_FAILED' };
  }
}

/**
 * Get copied trades for a copier
 */
export async function getCopiedTrades(copierId: string, limit = 50): Promise<ServiceResponse<any[]>> {
  try {
    const trades = await db.query.socialCopiedTrades.findMany({
      where: eq(socialCopiedTrades.copierId, copierId),
      orderBy: desc(socialCopiedTrades.copiedAt),
      limit,
    });

    return { success: true, data: trades };
  } catch (error) {
    return { success: false, error: 'Failed to get copied trades', code: 'GET_TRADES_FAILED' };
  }
}

/**
 * Close a copied trade
 */
export async function closeCopiedTrade(
  tradeId: string,
  exitPrice: number,
  _exitReason?: string
): Promise<ServiceResponse<any>> {
  try {
    const trade = await db.query.socialCopiedTrades.findFirst({
      where: eq(socialCopiedTrades.id, tradeId),
    });

    if (!trade) {
      return { success: false, error: 'Trade not found', code: 'TRADE_NOT_FOUND' };
    }

    if (trade.status !== 'open') {
      return { success: false, error: 'Trade already closed', code: 'TRADE_ALREADY_CLOSED' };
    }

    // Calculate PnL
    const entryPrice = parseFloat(trade.entryPrice);
    const amount = parseFloat(trade.amount);
    const pnlMultiplier = trade.side === 'buy' ? 1 : -1;
    const pnl = ((exitPrice - entryPrice) / entryPrice) * amount * pnlMultiplier;

    const [closed] = await db
      .update(socialCopiedTrades)
      .set({
        exitPrice: exitPrice.toString(),
        closedAt: new Date(),
        profit: pnl.toString(),
        profitPercentage: (((exitPrice - entryPrice) / entryPrice) * 100).toString(),
        status: 'closed',
      })
      .where(eq(socialCopiedTrades.id, tradeId))
      .returning();

    return { success: true, data: closed };
  } catch (error) {
    return { success: false, error: 'Failed to close trade', code: 'CLOSE_TRADE_FAILED' };
  }
}

/**
 * Get copy trading statistics for a copier
 */
export async function getCopyStats(copierId: string): Promise<ServiceResponse<any>> {
  try {
    const [stats] = await db
      .select({
        totalTrades: sql<number>`COUNT(*)`,
        openTrades: sql<number>`COUNT(*) FILTER (WHERE status = 'open')`,
        closedTrades: sql<number>`COUNT(*) FILTER (WHERE status = 'closed')`,
        totalProfit: sql<number>`SUM(CAST(profit AS DECIMAL))`,
        winningTrades: sql<number>`COUNT(*) FILTER (WHERE status = 'closed' AND CAST(profit AS DECIMAL) > 0)`,
        losingTrades: sql<number>`COUNT(*) FILTER (WHERE status = 'closed' AND CAST(profit AS DECIMAL) < 0)`,
      })
      .from(socialCopiedTrades)
      .where(eq(socialCopiedTrades.copierId, copierId));

    const winRate = stats.closedTrades > 0
      ? (Number(stats.winningTrades) / Number(stats.closedTrades)) * 100
      : 0;

    return {
      success: true,
      data: {
        totalTrades: Number(stats.totalTrades),
        openTrades: Number(stats.openTrades),
        closedTrades: Number(stats.closedTrades),
        totalProfit: Number(stats.totalProfit || 0),
        winningTrades: Number(stats.winningTrades),
        losingTrades: Number(stats.losingTrades),
        winRate: Math.round(winRate * 100) / 100,
      },
    };
  } catch (error) {
    return { success: false, error: 'Failed to get copy stats', code: 'GET_STATS_FAILED' };
  }
}
