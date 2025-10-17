/**
 * Position Service
 * Handles trading position management for futures/margin trading
 */

import { db } from '@/db';
import { eq, and, desc } from 'drizzle-orm';
import { ExchangeService } from '../../exchanges/services/exchange.service';
import { exchangeConnections } from '../../exchanges/schema/exchanges.schema';
import { tradingPositions } from '../schema/orders.schema';
import logger from '@/utils/logger';
import { NotFoundError } from '@/utils/errors';
import type {
  TradingPosition,
  PositionQueryOptions,
  PositionStatistics,
  PositionStatus,
  PositionSide,
} from '../types/orders.types';

export class PositionService {
  /**
   * Get position by ID
   */
  static async getPosition(
    positionId: string,
    userId: string,
    tenantId: string
  ): Promise<TradingPosition | null> {
    const [position] = await db
      .select()
      .from(tradingPositions)
      .where(
        and(
          eq(tradingPositions.id, positionId),
          eq(tradingPositions.userId, userId),
          eq(tradingPositions.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!position) return null;

    return this.mapToTradingPosition(position);
  }

  /**
   * Get positions with filters
   */
  static async getPositions(options: PositionQueryOptions): Promise<TradingPosition[]> {
    const conditions = [];

    if (options.userId) conditions.push(eq(tradingPositions.userId, options.userId));
    if (options.tenantId) conditions.push(eq(tradingPositions.tenantId, options.tenantId));
    if (options.exchangeId) conditions.push(eq(tradingPositions.exchangeId, options.exchangeId));
    if (options.symbol) conditions.push(eq(tradingPositions.symbol, options.symbol));
    if (options.status) conditions.push(eq(tradingPositions.status, options.status));
    if (options.strategy) conditions.push(eq(tradingPositions.strategy, options.strategy));

    const query = db
      .select()
      .from(tradingPositions)
      .where(and(...conditions))
      .orderBy(desc(tradingPositions.createdAt))
      .limit(options.limit || 100)
      .offset(options.offset || 0);

    const results = await query;

    return results.map(this.mapToTradingPosition);
  }

  /**
   * Update position
   */
  static async updatePosition(
    positionId: string,
    updates: Partial<TradingPosition>
  ): Promise<TradingPosition> {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (updates.markPrice !== undefined) updateData.markPrice = updates.markPrice.toString();
    if (updates.unrealizedPnl !== undefined)
      updateData.unrealizedPnl = updates.unrealizedPnl.toString();
    if (updates.realizedPnl !== undefined) updateData.realizedPnl = updates.realizedPnl.toString();
    if (updates.percentage !== undefined) updateData.percentage = updates.percentage.toString();
    if (updates.stopLoss !== undefined) updateData.stopLoss = updates.stopLoss.toString();
    if (updates.takeProfit !== undefined) updateData.takeProfit = updates.takeProfit.toString();
    if (updates.liquidationPrice !== undefined)
      updateData.liquidationPrice = updates.liquidationPrice.toString();
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.status === 'closed') updateData.closedAt = new Date();

    const [updated] = await db
      .update(tradingPositions)
      .set(updateData)
      .where(eq(tradingPositions.id, positionId))
      .returning();

    logger.info('Position updated', { positionId, updates });

    return this.mapToTradingPosition(updated);
  }

  /**
   * Close position
   */
  static async closePosition(
    positionId: string,
    userId: string,
    tenantId: string
  ): Promise<TradingPosition> {
    const position = await this.getPosition(positionId, userId, tenantId);
    if (!position) throw new NotFoundError('Position not found');

    return this.updatePosition(positionId, {
      status: 'closed',
    });
  }

  /**
   * Get position statistics
   */
  static async getPositionStatistics(
    userId: string,
    tenantId: string,
    options?: PositionQueryOptions
  ): Promise<PositionStatistics> {
    const queryOptions: PositionQueryOptions = {
      userId,
      tenantId,
      ...options,
    };

    const positions = await this.getPositions(queryOptions);

    const closedPositions = positions.filter((p) => p.status === 'closed');
    const profitablePositions = closedPositions.filter((p) => (p.realizedPnl || 0) > 0);

    const totalPnl = closedPositions.reduce((sum, p) => sum + (p.realizedPnl || 0), 0);
    const wins = profitablePositions.map((p) => p.realizedPnl || 0);
    const losses = closedPositions
      .filter((p) => (p.realizedPnl || 0) < 0)
      .map((p) => Math.abs(p.realizedPnl || 0));

    const stats: PositionStatistics = {
      totalPositions: positions.length,
      openPositions: positions.filter((p) => p.status === 'open').length,
      closedPositions: closedPositions.length,
      totalPnl,
      totalPnlPercentage: 0,
      winRate: closedPositions.length > 0 ? (profitablePositions.length / closedPositions.length) * 100 : 0,
      averageWin: wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0,
      averageLoss: losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0,
      largestWin: wins.length > 0 ? Math.max(...wins) : 0,
      largestLoss: losses.length > 0 ? Math.max(...losses) : 0,
      profitFactor: 0,
    };

    const totalWins = wins.reduce((a, b) => a + b, 0);
    const totalLosses = losses.reduce((a, b) => a + b, 0);
    stats.profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    return stats;
  }

  /**
   * Sync positions from exchange
   */
  static async syncPositions(
    userId: string,
    tenantId: string,
    exchangeConnectionId: string
  ): Promise<number> {
    try {
      // Get connection to retrieve exchangeId
      const [connection] = await db
        .select()
        .from(exchangeConnections)
        .where(
          and(
            eq(exchangeConnections.id, exchangeConnectionId),
            eq(exchangeConnections.userId, userId),
            eq(exchangeConnections.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!connection) throw new NotFoundError('Exchange connection not found');

      // Fetch positions from exchange using centralized ExchangeService
      const exchangePositions = await ExchangeService.fetchPositions(
        exchangeConnectionId,
        userId,
        tenantId
      );

      let synced = 0;
      for (const exchangePosition of exchangePositions) {
        // Find or create position in database
        const [dbPosition] = await db
          .select()
          .from(tradingPositions)
          .where(
            and(
              eq(tradingPositions.exchangeConnectionId, exchangeConnectionId),
              eq(tradingPositions.symbol, exchangePosition.symbol),
              eq(tradingPositions.status, 'open')
            )
          )
          .limit(1);

        if (dbPosition) {
          // Update existing position
          await this.updatePosition(dbPosition.id, {
            contracts: exchangePosition.contracts || undefined,
            markPrice: exchangePosition.markPrice || undefined,
            liquidationPrice: exchangePosition.liquidationPrice || undefined,
            unrealizedPnl: exchangePosition.unrealizedPnl || undefined,
            percentage: exchangePosition.percentage || undefined,
          });
          synced++;
        } else if (exchangePosition.contracts && Number(exchangePosition.contracts) > 0) {
          // Create new position
          await db.insert(tradingPositions).values({
            userId,
            tenantId,
            exchangeConnectionId,
            exchangeId: connection.exchangeId,
            symbol: exchangePosition.symbol,
            side: exchangePosition.side === 'long' ? 'long' : 'short',
            contracts: Number(exchangePosition.contracts).toString(),
            contractSize: exchangePosition.contractSize ? Number(exchangePosition.contractSize).toString() : undefined,
            leverage: exchangePosition.leverage ? Number(exchangePosition.leverage).toString() : undefined,
            collateral: exchangePosition.collateral ? Number(exchangePosition.collateral).toString() : undefined,
            entryPrice: exchangePosition.entryPrice ? Number(exchangePosition.entryPrice).toString() : '0',
            entryTimestamp: new Date(exchangePosition.timestamp || Date.now()),
            markPrice: exchangePosition.markPrice?.toString(),
            liquidationPrice: exchangePosition.liquidationPrice?.toString(),
            unrealizedPnl: exchangePosition.unrealizedPnl?.toString(),
            realizedPnl: '0',
            percentage: exchangePosition.percentage?.toString(),
            status: 'open',
            info: exchangePosition.info,
          });
          synced++;
        }
      }

      logger.info('Synced positions from exchange', { userId, exchangeConnectionId, synced });

      return synced;
    } catch (error) {
      logger.error('Failed to sync positions', {
        userId,
        exchangeConnectionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Map database row to TradingPosition
   */
  private static mapToTradingPosition(row: any): TradingPosition {
    return {
      id: row.id,
      userId: row.userId,
      tenantId: row.tenantId,
      exchangeConnectionId: row.exchangeConnectionId,
      exchangeId: row.exchangeId,
      symbol: row.symbol,
      side: row.side as PositionSide,
      contracts: parseFloat(row.contracts),
      contractSize: row.contractSize ? parseFloat(row.contractSize) : undefined,
      leverage: row.leverage ? parseFloat(row.leverage) : undefined,
      collateral: row.collateral ? parseFloat(row.collateral) : undefined,
      entryPrice: parseFloat(row.entryPrice),
      entryTimestamp: row.entryTimestamp,
      markPrice: row.markPrice ? parseFloat(row.markPrice) : undefined,
      liquidationPrice: row.liquidationPrice ? parseFloat(row.liquidationPrice) : undefined,
      unrealizedPnl: row.unrealizedPnl ? parseFloat(row.unrealizedPnl) : undefined,
      realizedPnl: row.realizedPnl ? parseFloat(row.realizedPnl) : undefined,
      percentage: row.percentage ? parseFloat(row.percentage) : undefined,
      stopLoss: row.stopLoss ? parseFloat(row.stopLoss) : undefined,
      takeProfit: row.takeProfit ? parseFloat(row.takeProfit) : undefined,
      maintenanceMargin: row.maintenanceMargin ? parseFloat(row.maintenanceMargin) : undefined,
      maintenanceMarginPercentage: row.maintenanceMarginPercentage
        ? parseFloat(row.maintenanceMarginPercentage)
        : undefined,
      initialMargin: row.initialMargin ? parseFloat(row.initialMargin) : undefined,
      initialMarginPercentage: row.initialMarginPercentage
        ? parseFloat(row.initialMarginPercentage)
        : undefined,
      status: row.status as PositionStatus,
      strategy: row.strategy || undefined,
      info: row.info,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      closedAt: row.closedAt || undefined,
    };
  }
}
