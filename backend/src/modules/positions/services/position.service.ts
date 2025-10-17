/**
 * Position Service
 * Manages trading positions with P&L calculation, margin management, and risk controls
 */

import { db } from '@/db';
import { eq, and, desc } from 'drizzle-orm';
import logger from '@/utils/logger';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { positions, positionHistory, positionAlerts, positionSummaries } from '../schema/positions.schema';
import type {
  Position,
  CreatePositionRequest,
  UpdatePositionRequest,
  ClosePositionRequest,
  PositionQueryOptions,
  PositionHistoryEntry,
  PositionAlert,
  PositionSummary,
  PositionStatistics,
  PnLCalculation,
  MarginCalculation,
  IPositionService,
  AlertType,
  AlertSeverity,
} from '../types/positions.types';

export class PositionService implements IPositionService {
  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  /**
   * Create a new position
   */
  async createPosition(
    userId: string,
    tenantId: string,
    request: CreatePositionRequest
  ): Promise<Position> {
    logger.info('Creating position', { userId, tenantId, symbol: request.symbol });

    // Validate request
    this.validateCreateRequest(request);

    // Calculate initial values
    const entryPrice = request.entryPrice || 0; // Will be filled by market price
    const leverage = request.leverage || 1;
    const marginUsed = (request.quantity * entryPrice) / leverage;

    // Calculate liquidation price for leveraged positions
    const liquidationPrice = leverage > 1 ? await this.calculateLiquidationPriceForNew(
      request.side,
      entryPrice,
      leverage,
      request.marginType || 'cross'
    ) : undefined;

    // Create position
    const [position] = await db
      .insert(positions)
      .values({
        userId,
        tenantId,
        exchangeId: request.exchangeId,
        symbol: request.symbol,
        side: request.side,
        type: request.type,
        entryPrice: entryPrice.toString(),
        currentPrice: entryPrice.toString(),
        quantity: request.quantity.toString(),
        remainingQuantity: request.quantity.toString(),
        leverage: leverage.toString(),
        marginType: request.marginType || 'cross',
        marginUsed: marginUsed.toString(),
        liquidationPrice: liquidationPrice?.toString(),
        stopLoss: request.stopLoss?.toString(),
        takeProfit: request.takeProfit?.toString(),
        trailingStop: request.trailingStop?.toString(),
        openOrderId: request.openOrderId,
        strategyId: request.strategyId,
        botId: request.botId,
        signalId: request.signalId,
        notes: request.notes,
        tags: request.tags as any,
        status: 'open',
      })
      .returning();

    // Add history entry
    await this.addHistoryEntry(position.id, 'open', {
      entryPrice,
      quantity: request.quantity,
    });

    // Update summary
    await this.updatePositionSummary(userId, tenantId);

    logger.info('Position created', { positionId: position.id, symbol: request.symbol });

    return this.mapPositionFromDb(position);
  }

  /**
   * Get position by ID
   */
  async getPosition(
    positionId: string,
    userId: string,
    tenantId: string
  ): Promise<Position | null> {
    const [position] = await db
      .select()
      .from(positions)
      .where(
        and(
          eq(positions.id, positionId),
          eq(positions.userId, userId),
          eq(positions.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!position) {
      return null;
    }

    return this.mapPositionFromDb(position);
  }

  /**
   * Get all positions matching criteria
   */
  async getPositions(options: PositionQueryOptions): Promise<Position[]> {
    const conditions = [
      eq(positions.userId, options.userId),
      eq(positions.tenantId, options.tenantId),
    ];

    if (options.exchangeId) {
      conditions.push(eq(positions.exchangeId, options.exchangeId));
    }

    if (options.symbol) {
      conditions.push(eq(positions.symbol, options.symbol));
    }

    if (options.side) {
      conditions.push(eq(positions.side, options.side));
    }

    if (options.type) {
      conditions.push(eq(positions.type, options.type));
    }

    if (options.status) {
      conditions.push(eq(positions.status, options.status));
    }

    if (options.strategyId) {
      conditions.push(eq(positions.strategyId, options.strategyId));
    }

    if (options.botId) {
      conditions.push(eq(positions.botId, options.botId));
    }

    let query = db
      .select()
      .from(positions)
      .where(and(...conditions))
      .orderBy(desc(positions.openedAt));

    if (options.limit) {
      query = query.limit(options.limit) as any;
    }

    if (options.offset) {
      query = query.offset(options.offset) as any;
    }

    const results = await query;

    return results.map((p) => this.mapPositionFromDb(p));
  }

  /**
   * Update position
   */
  async updatePosition(
    positionId: string,
    userId: string,
    tenantId: string,
    updates: UpdatePositionRequest
  ): Promise<Position> {
    logger.info('Updating position', { positionId, updates });

    // Get existing position
    const existing = await this.getPosition(positionId, userId, tenantId);
    if (!existing) {
      throw new NotFoundError('Position not found');
    }

    if (existing.status === 'closed' || existing.status === 'liquidated') {
      throw new BadRequestError('Cannot update closed or liquidated position');
    }

    // Build update object
    const updateData: any = {
      lastUpdatedAt: new Date(),
    };

    const changes: any = {};

    if (updates.currentPrice !== undefined) {
      updateData.currentPrice = updates.currentPrice.toString();
      changes.currentPrice = { from: existing.currentPrice, to: updates.currentPrice };

      // Recalculate P&L
      const pnl = await this.calculatePnL(existing, updates.currentPrice);
      updateData.unrealizedPnl = pnl.unrealizedPnl.toString();
      updateData.unrealizedPnlPercent = pnl.unrealizedPnlPercent.toString();
      updateData.totalPnl = pnl.totalPnl.toString();
      updateData.totalPnlPercent = pnl.totalPnlPercent.toString();

      // Update price extremes
      if (!existing.highestPrice || updates.currentPrice > existing.highestPrice) {
        updateData.highestPrice = updates.currentPrice.toString();
      }
      if (!existing.lowestPrice || updates.currentPrice < existing.lowestPrice) {
        updateData.lowestPrice = updates.currentPrice.toString();
      }
    }

    if (updates.stopLoss !== undefined) {
      updateData.stopLoss = updates.stopLoss.toString();
      changes.stopLoss = { from: existing.stopLoss, to: updates.stopLoss };
    }

    if (updates.takeProfit !== undefined) {
      updateData.takeProfit = updates.takeProfit.toString();
      changes.takeProfit = { from: existing.takeProfit, to: updates.takeProfit };
    }

    if (updates.trailingStop !== undefined) {
      updateData.trailingStop = updates.trailingStop.toString();
      changes.trailingStop = { from: existing.trailingStop, to: updates.trailingStop };
    }

    if (updates.notes !== undefined) {
      updateData.notes = updates.notes;
    }

    if (updates.tags !== undefined) {
      updateData.tags = updates.tags as any;
    }

    // Update in database
    const [updated] = await db
      .update(positions)
      .set(updateData)
      .where(
        and(
          eq(positions.id, positionId),
          eq(positions.userId, userId),
          eq(positions.tenantId, tenantId)
        )
      )
      .returning();

    // Add history entry
    await this.addHistoryEntry(positionId, 'update', changes);

    logger.info('Position updated', { positionId });

    return this.mapPositionFromDb(updated);
  }

  /**
   * Close position (full or partial)
   */
  async closePosition(
    positionId: string,
    userId: string,
    tenantId: string,
    request: ClosePositionRequest
  ): Promise<Position> {
    logger.info('Closing position', { positionId, request });

    // Get existing position
    const existing = await this.getPosition(positionId, userId, tenantId);
    if (!existing) {
      throw new NotFoundError('Position not found');
    }

    if (existing.status === 'closed' || existing.status === 'liquidated') {
      throw new BadRequestError('Position is already closed');
    }

    const closeQuantity = request.quantity || existing.remainingQuantity;
    const exitPrice = request.exitPrice || existing.currentPrice;

    if (closeQuantity > existing.remainingQuantity) {
      throw new BadRequestError('Close quantity exceeds remaining quantity');
    }

    const isFullClose = closeQuantity === existing.remainingQuantity;

    // Calculate realized P&L for closed portion
    const realizedPnl = await this.calculateRealizedPnL(existing, closeQuantity, exitPrice);
    const realizedPnlPercent = (realizedPnl / (existing.entryPrice * closeQuantity)) * 100;

    // Calculate exit fee (assume 0.1% for now)
    const exitFee = exitPrice * closeQuantity * 0.001;

    // Build update object
    const updateData: any = {
      remainingQuantity: (existing.remainingQuantity - closeQuantity).toString(),
      realizedPnl: (existing.realizedPnl + realizedPnl).toString(),
      realizedPnlPercent: realizedPnlPercent.toString(),
      exitFee: (existing.exitFee + exitFee).toString(),
      totalFees: (existing.totalFees + exitFee).toString(),
      lastUpdatedAt: new Date(),
    };

    // Add close order ID
    const closeOrderIds = existing.closeOrderIds || [];
    if (request.closeOrderId) {
      closeOrderIds.push(request.closeOrderId);
      updateData.closeOrderIds = closeOrderIds as any;
    }

    if (isFullClose) {
      // Full close
      updateData.status = 'closed';
      updateData.exitPrice = exitPrice.toString();
      updateData.exitReason = request.exitReason;
      updateData.closedAt = new Date();
      updateData.unrealizedPnl = '0'; // All P&L is now realized
      updateData.totalPnl = (existing.realizedPnl + realizedPnl).toString();
    } else {
      // Partial close
      updateData.status = 'partial';

      // Recalculate unrealized P&L for remaining quantity
      const remainingQuantity = existing.remainingQuantity - closeQuantity;
      const unrealizedPnl = (existing.currentPrice - existing.entryPrice) * remainingQuantity * (existing.side === 'long' ? 1 : -1);
      updateData.unrealizedPnl = unrealizedPnl.toString();
      updateData.totalPnl = (existing.realizedPnl + realizedPnl + unrealizedPnl).toString();
    }

    if (request.notes) {
      updateData.notes = request.notes;
    }

    // Update in database
    const [updated] = await db
      .update(positions)
      .set(updateData)
      .where(
        and(
          eq(positions.id, positionId),
          eq(positions.userId, userId),
          eq(positions.tenantId, tenantId)
        )
      )
      .returning();

    // Add history entry
    await this.addHistoryEntry(positionId, isFullClose ? 'close' : 'partial_close', {
      closeQuantity,
      exitPrice,
      realizedPnl,
      exitReason: request.exitReason,
    });

    // Update summary
    await this.updatePositionSummary(userId, tenantId);

    logger.info('Position closed', { positionId, isFullClose, realizedPnl });

    return this.mapPositionFromDb(updated);
  }

  /**
   * Delete position (only for drafts or testing)
   */
  async deletePosition(positionId: string, userId: string, tenantId: string): Promise<void> {
    logger.info('Deleting position', { positionId });

    const position = await this.getPosition(positionId, userId, tenantId);
    if (!position) {
      throw new NotFoundError('Position not found');
    }

    // Only allow deletion of closed positions or positions that haven't been traded
    if (position.status === 'open' || position.status === 'partial') {
      throw new BadRequestError('Cannot delete open positions. Close them first.');
    }

    await db
      .delete(positions)
      .where(
        and(
          eq(positions.id, positionId),
          eq(positions.userId, userId),
          eq(positions.tenantId, tenantId)
        )
      );

    logger.info('Position deleted', { positionId });
  }

  // ============================================================================
  // P&L CALCULATIONS
  // ============================================================================

  /**
   * Calculate P&L for position at current price
   */
  async calculatePnL(position: Position, currentPrice: number): Promise<PnLCalculation> {
    const quantity = position.remainingQuantity;
    const entryPrice = position.entryPrice;

    // Calculate unrealized P&L
    const priceDiff = currentPrice - entryPrice;
    const direction = position.side === 'long' ? 1 : -1;
    const unrealizedPnl = priceDiff * quantity * direction;
    const unrealizedPnlPercent = (unrealizedPnl / (entryPrice * quantity)) * 100;

    // Total P&L = realized + unrealized
    const totalPnl = position.realizedPnl + unrealizedPnl;
    const totalCost = entryPrice * (position.quantity); // Original quantity
    const totalPnlPercent = (totalPnl / totalCost) * 100;

    // Total fees
    const totalFees = position.totalFees;

    // Net P&L
    const netPnl = totalPnl - totalFees;

    return {
      unrealizedPnl,
      unrealizedPnlPercent,
      realizedPnl: position.realizedPnl,
      realizedPnlPercent: position.realizedPnlPercent,
      totalPnl,
      totalPnlPercent,
      totalFees,
      netPnl,
    };
  }

  /**
   * Update position P&L with current price
   */
  async updatePositionPnL(positionId: string, currentPrice: number): Promise<Position> {
    const position = await db
      .select()
      .from(positions)
      .where(eq(positions.id, positionId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!position) {
      throw new NotFoundError('Position not found');
    }

    const mapped = this.mapPositionFromDb(position);
    const pnl = await this.calculatePnL(mapped, currentPrice);

    await db
      .update(positions)
      .set({
        currentPrice: currentPrice.toString(),
        unrealizedPnl: pnl.unrealizedPnl.toString(),
        unrealizedPnlPercent: pnl.unrealizedPnlPercent.toString(),
        totalPnl: pnl.totalPnl.toString(),
        totalPnlPercent: pnl.totalPnlPercent.toString(),
        lastUpdatedAt: new Date(),
      })
      .where(eq(positions.id, positionId));

    return await this.getPosition(positionId, mapped.userId, mapped.tenantId).then((p) => p!);
  }

  /**
   * Calculate realized P&L for closing a portion
   */
  async calculateRealizedPnL(
    position: Position,
    closeQuantity: number,
    exitPrice: number
  ): Promise<number> {
    const priceDiff = exitPrice - position.entryPrice;
    const direction = position.side === 'long' ? 1 : -1;
    return priceDiff * closeQuantity * direction;
  }

  // ============================================================================
  // MARGIN MANAGEMENT
  // ============================================================================

  /**
   * Calculate margin metrics for position
   */
  async calculateMargin(position: Position, currentPrice: number): Promise<MarginCalculation> {
    const leverage = position.leverage;
    const quantity = position.remainingQuantity;
    const entryPrice = position.entryPrice;

    // Margin used
    const marginUsed = (quantity * entryPrice) / leverage;

    // Calculate P&L
    const pnl = await this.calculatePnL(position, currentPrice);

    // Margin available = margin used + unrealized P&L
    const marginAvailable = marginUsed + pnl.unrealizedPnl;

    // Margin level = (margin available / margin used) * 100
    const marginLevel = (marginAvailable / marginUsed) * 100;

    // Calculate liquidation price
    const liquidationPrice = await this.calculateLiquidationPrice(position);

    // Distance to liquidation
    const distanceToLiquidation = liquidationPrice
      ? Math.abs(((currentPrice - liquidationPrice) / currentPrice) * 100)
      : undefined;

    // Margin call and liquidation warnings
    const isMarginCall = marginLevel < 120; // < 120%
    const isLiquidationWarning = marginLevel < 105; // < 105%

    return {
      marginUsed,
      marginAvailable,
      marginLevel,
      liquidationPrice,
      distanceToLiquidation,
      isMarginCall,
      isLiquidationWarning,
    };
  }

  /**
   * Calculate liquidation price for position
   */
  async calculateLiquidationPrice(position: Position): Promise<number> {
    if (position.leverage <= 1) {
      return 0; // No liquidation for non-leveraged positions
    }

    const entryPrice = position.entryPrice;
    const leverage = position.leverage;
    const maintenanceMargin = 0.005; // 0.5% maintenance margin

    if (position.side === 'long') {
      // Long liquidation: entry * (1 - 1/leverage + maintenance)
      return entryPrice * (1 - 1 / leverage + maintenanceMargin);
    } else {
      // Short liquidation: entry * (1 + 1/leverage - maintenance)
      return entryPrice * (1 + 1 / leverage - maintenanceMargin);
    }
  }

  /**
   * Calculate liquidation price for new position
   */
  private async calculateLiquidationPriceForNew(
    side: 'long' | 'short',
    entryPrice: number,
    leverage: number,
    _marginType: 'cross' | 'isolated'
  ): Promise<number> {
    if (leverage <= 1) {
      return 0;
    }

    const maintenanceMargin = 0.005; // 0.5%

    if (side === 'long') {
      return entryPrice * (1 - 1 / leverage + maintenanceMargin);
    } else {
      return entryPrice * (1 + 1 / leverage - maintenanceMargin);
    }
  }

  /**
   * Check for margin calls across all positions
   */
  async checkMarginCall(userId: string, tenantId: string): Promise<PositionAlert[]> {
    const openPositions = await this.getPositions({
      userId,
      tenantId,
      status: 'open',
    });

    const alerts: PositionAlert[] = [];

    for (const position of openPositions) {
      const margin = await this.calculateMargin(position, position.currentPrice);

      if (margin.isLiquidationWarning) {
        const alert = await this.createAlert(
          position.id,
          'liquidation_warning',
          'critical',
          `Position ${position.symbol} is near liquidation! Margin level: ${margin.marginLevel.toFixed(2)}%`,
          { marginLevel: margin.marginLevel, currentPrice: position.currentPrice }
        );
        alerts.push(alert);
      } else if (margin.isMarginCall) {
        const alert = await this.createAlert(
          position.id,
          'margin_call',
          'warning',
          `Margin call for ${position.symbol}! Margin level: ${margin.marginLevel.toFixed(2)}%`,
          { marginLevel: margin.marginLevel, currentPrice: position.currentPrice }
        );
        alerts.push(alert);
      }
    }

    return alerts;
  }

  // ============================================================================
  // RISK MANAGEMENT
  // ============================================================================

  /**
   * Check if stop loss is hit
   */
  async checkStopLoss(positionId: string, currentPrice: number): Promise<boolean> {
    const position = await db
      .select()
      .from(positions)
      .where(eq(positions.id, positionId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!position || !position.stopLoss) {
      return false;
    }

    const stopLoss = parseFloat(position.stopLoss);
    const side = position.side;

    // Long position: stop loss hit if price falls below stop loss
    // Short position: stop loss hit if price rises above stop loss
    if (side === 'long') {
      return currentPrice <= stopLoss;
    } else {
      return currentPrice >= stopLoss;
    }
  }

  /**
   * Check if take profit is hit
   */
  async checkTakeProfit(positionId: string, currentPrice: number): Promise<boolean> {
    const position = await db
      .select()
      .from(positions)
      .where(eq(positions.id, positionId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!position || !position.takeProfit) {
      return false;
    }

    const takeProfit = parseFloat(position.takeProfit);
    const side = position.side;

    // Long position: take profit hit if price rises above take profit
    // Short position: take profit hit if price falls below take profit
    if (side === 'long') {
      return currentPrice >= takeProfit;
    } else {
      return currentPrice <= takeProfit;
    }
  }

  /**
   * Update trailing stop for position
   */
  async updateTrailingStop(positionId: string, currentPrice: number): Promise<void> {
    const position = await db
      .select()
      .from(positions)
      .where(eq(positions.id, positionId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!position || !position.trailingStop) {
      return;
    }

    const trailingStopPercent = parseFloat(position.trailingStop);
    const side = position.side;
    const currentStopLoss = position.stopLoss ? parseFloat(position.stopLoss) : null;

    // Calculate new stop loss based on trailing stop
    let newStopLoss: number;
    if (side === 'long') {
      newStopLoss = currentPrice * (1 - trailingStopPercent / 100);
      // Only update if new stop loss is higher (trailing up)
      if (!currentStopLoss || newStopLoss > currentStopLoss) {
        await db
          .update(positions)
          .set({
            stopLoss: newStopLoss.toString(),
            trailingStopActivationPrice: currentPrice.toString(),
            lastUpdatedAt: new Date(),
          })
          .where(eq(positions.id, positionId));

        logger.debug('Trailing stop updated', { positionId, newStopLoss, currentPrice });
      }
    } else {
      // Short position
      newStopLoss = currentPrice * (1 + trailingStopPercent / 100);
      // Only update if new stop loss is lower (trailing down)
      if (!currentStopLoss || newStopLoss < currentStopLoss) {
        await db
          .update(positions)
          .set({
            stopLoss: newStopLoss.toString(),
            trailingStopActivationPrice: currentPrice.toString(),
            lastUpdatedAt: new Date(),
          })
          .where(eq(positions.id, positionId));

        logger.debug('Trailing stop updated', { positionId, newStopLoss, currentPrice });
      }
    }
  }

  // ============================================================================
  // ALERTS
  // ============================================================================

  /**
   * Create position alert
   */
  async createAlert(
    positionId: string,
    type: AlertType,
    severity: AlertSeverity,
    message: string,
    context?: any
  ): Promise<PositionAlert> {
    const position = await db
      .select()
      .from(positions)
      .where(eq(positions.id, positionId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!position) {
      throw new NotFoundError('Position not found');
    }

    const [alert] = await db
      .insert(positionAlerts)
      .values({
        positionId,
        userId: position.userId,
        tenantId: position.tenantId,
        type,
        severity,
        message,
        currentPrice: context?.currentPrice?.toString(),
        marginLevel: context?.marginLevel?.toString(),
        unrealizedPnl: context?.unrealizedPnl?.toString(),
        acknowledged: false,
      })
      .returning();

    logger.info('Position alert created', { positionId, type, severity });

    return this.mapAlertFromDb(alert);
  }

  /**
   * Get alerts for user
   */
  async getAlerts(
    userId: string,
    tenantId: string,
    acknowledged?: boolean
  ): Promise<PositionAlert[]> {
    const conditions = [
      eq(positionAlerts.userId, userId),
      eq(positionAlerts.tenantId, tenantId),
    ];

    if (acknowledged !== undefined) {
      conditions.push(eq(positionAlerts.acknowledged, acknowledged));
    }

    const alerts = await db
      .select()
      .from(positionAlerts)
      .where(and(...conditions))
      .orderBy(desc(positionAlerts.createdAt));

    return alerts.map((a) => this.mapAlertFromDb(a));
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    await db
      .update(positionAlerts)
      .set({
        acknowledged: true,
        acknowledgedAt: new Date(),
      })
      .where(and(eq(positionAlerts.id, alertId), eq(positionAlerts.userId, userId)));

    logger.info('Alert acknowledged', { alertId });
  }

  // ============================================================================
  // HISTORY
  // ============================================================================

  /**
   * Get position history
   */
  async getPositionHistory(
    positionId: string,
    userId: string,
    tenantId: string
  ): Promise<PositionHistoryEntry[]> {
    const history = await db
      .select()
      .from(positionHistory)
      .where(
        and(
          eq(positionHistory.positionId, positionId),
          eq(positionHistory.userId, userId),
          eq(positionHistory.tenantId, tenantId)
        )
      )
      .orderBy(desc(positionHistory.timestamp));

    return history.map((h) => this.mapHistoryFromDb(h));
  }

  /**
   * Add history entry
   */
  async addHistoryEntry(
    positionId: string,
    action: string,
    changes?: any
  ): Promise<void> {
    const position = await db
      .select()
      .from(positions)
      .where(eq(positions.id, positionId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!position) {
      return;
    }

    await db.insert(positionHistory).values({
      positionId,
      userId: position.userId,
      tenantId: position.tenantId,
      action,
      currentPrice: position.currentPrice,
      quantity: position.quantity,
      unrealizedPnl: position.unrealizedPnl,
      realizedPnl: position.realizedPnl,
      changes: changes as any,
    });

    logger.debug('Position history entry added', { positionId, action });
  }

  // ============================================================================
  // SUMMARY & STATISTICS
  // ============================================================================

  /**
   * Get position summary for user
   */
  async getPositionSummary(userId: string, tenantId: string): Promise<PositionSummary> {
    const [summary] = await db
      .select()
      .from(positionSummaries)
      .where(and(eq(positionSummaries.userId, userId), eq(positionSummaries.tenantId, tenantId)))
      .limit(1);

    if (!summary) {
      // Create initial summary
      return await this.updatePositionSummary(userId, tenantId);
    }

    return this.mapSummaryFromDb(summary);
  }

  /**
   * Update position summary for user
   */
  async updatePositionSummary(userId: string, tenantId: string): Promise<PositionSummary> {
    const allPositions = await this.getPositions({ userId, tenantId });

    const totalPositions = allPositions.length;
    const openPositions = allPositions.filter((p) => p.status === 'open' || p.status === 'partial').length;
    const closedPositions = allPositions.filter((p) => p.status === 'closed').length;

    const totalUnrealizedPnl = allPositions
      .filter((p) => p.status === 'open' || p.status === 'partial')
      .reduce((sum, p) => sum + p.unrealizedPnl, 0);

    const totalRealizedPnl = allPositions.reduce((sum, p) => sum + p.realizedPnl, 0);
    const totalPnl = totalUnrealizedPnl + totalRealizedPnl;
    const totalFees = allPositions.reduce((sum, p) => sum + p.totalFees, 0);

    const totalMarginUsed = allPositions
      .filter((p) => p.status === 'open' || p.status === 'partial')
      .reduce((sum, p) => sum + p.marginUsed, 0);

    const closedWithPnl = allPositions.filter((p) => p.status === 'closed');
    const winningPositions = closedWithPnl.filter((p) => p.totalPnl > 0).length;
    const losingPositions = closedWithPnl.filter((p) => p.totalPnl < 0).length;
    const winRate = closedWithPnl.length > 0 ? (winningPositions / closedWithPnl.length) * 100 : 0;

    // Upsert summary
    const [summary] = await db
      .insert(positionSummaries)
      .values({
        userId,
        tenantId,
        totalPositions: totalPositions.toString(),
        openPositions: openPositions.toString(),
        closedPositions: closedPositions.toString(),
        totalUnrealizedPnl: totalUnrealizedPnl.toString(),
        totalRealizedPnl: totalRealizedPnl.toString(),
        totalPnl: totalPnl.toString(),
        totalFees: totalFees.toString(),
        totalMarginUsed: totalMarginUsed.toString(),
        winningPositions: winningPositions.toString(),
        losingPositions: losingPositions.toString(),
        winRate: winRate.toString(),
        lastUpdatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [positionSummaries.userId],
        set: {
          totalPositions: totalPositions.toString(),
          openPositions: openPositions.toString(),
          closedPositions: closedPositions.toString(),
          totalUnrealizedPnl: totalUnrealizedPnl.toString(),
          totalRealizedPnl: totalRealizedPnl.toString(),
          totalPnl: totalPnl.toString(),
          totalFees: totalFees.toString(),
          totalMarginUsed: totalMarginUsed.toString(),
          winningPositions: winningPositions.toString(),
          losingPositions: losingPositions.toString(),
          winRate: winRate.toString(),
          lastUpdatedAt: new Date(),
        },
      })
      .returning();

    return this.mapSummaryFromDb(summary);
  }

  /**
   * Get position statistics for user
   */
  async getPositionStatistics(userId: string, tenantId: string): Promise<PositionStatistics> {
    const allPositions = await this.getPositions({ userId, tenantId });
    const closedPositions = allPositions.filter((p) => p.status === 'closed');

    const totalPositions = allPositions.length;
    const openPositions = allPositions.filter((p) => p.status === 'open' || p.status === 'partial').length;

    const winningPositions = closedPositions.filter((p) => p.totalPnl > 0);
    const losingPositions = closedPositions.filter((p) => p.totalPnl < 0);

    const winRate = closedPositions.length > 0 ? (winningPositions.length / closedPositions.length) * 100 : 0;

    const averageWin = winningPositions.length > 0
      ? winningPositions.reduce((sum, p) => sum + p.totalPnl, 0) / winningPositions.length
      : 0;

    const averageLoss = losingPositions.length > 0
      ? losingPositions.reduce((sum, p) => sum + p.totalPnl, 0) / losingPositions.length
      : 0;

    const largestWin = winningPositions.length > 0
      ? Math.max(...winningPositions.map((p) => p.totalPnl))
      : 0;

    const largestLoss = losingPositions.length > 0
      ? Math.min(...losingPositions.map((p) => p.totalPnl))
      : 0;

    const totalPnl = closedPositions.reduce((sum, p) => sum + p.totalPnl, 0);
    const totalFees = allPositions.reduce((sum, p) => sum + p.totalFees, 0);
    const netPnl = totalPnl - totalFees;

    const totalWins = winningPositions.reduce((sum, p) => sum + p.totalPnl, 0);
    const totalLosses = Math.abs(losingPositions.reduce((sum, p) => sum + p.totalPnl, 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;

    // Calculate holding times
    const holdingTimes = closedPositions
      .filter((p) => p.closedAt)
      .map((p) => (p.closedAt!.getTime() - p.openedAt.getTime()) / 1000); // In seconds

    const averageHoldingTime = holdingTimes.length > 0
      ? holdingTimes.reduce((sum, t) => sum + t, 0) / holdingTimes.length
      : 0;

    const longestHoldingTime = holdingTimes.length > 0 ? Math.max(...holdingTimes) : 0;
    const shortestHoldingTime = holdingTimes.length > 0 ? Math.min(...holdingTimes) : 0;

    return {
      totalPositions,
      openPositions,
      closedPositions: closedPositions.length,
      winningPositions: winningPositions.length,
      losingPositions: losingPositions.length,
      winRate,
      averageWin,
      averageLoss,
      largestWin,
      largestLoss,
      totalPnl,
      totalFees,
      netPnl,
      profitFactor,
      averageHoldingTime,
      longestHoldingTime,
      shortestHoldingTime,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Validate create position request
   */
  private validateCreateRequest(request: CreatePositionRequest): void {
    if (!request.exchangeId || !request.symbol) {
      throw new BadRequestError('Exchange ID and symbol are required');
    }

    if (request.quantity <= 0) {
      throw new BadRequestError('Quantity must be greater than 0');
    }

    if (request.leverage && request.leverage < 1) {
      throw new BadRequestError('Leverage must be at least 1x');
    }

    if (request.leverage && request.leverage > 125) {
      throw new BadRequestError('Leverage cannot exceed 125x');
    }
  }

  /**
   * Map position from database
   */
  private mapPositionFromDb(position: any): Position {
    return {
      id: position.id,
      userId: position.userId,
      tenantId: position.tenantId,
      exchangeId: position.exchangeId,
      symbol: position.symbol,
      side: position.side,
      type: position.type,
      entryPrice: parseFloat(position.entryPrice),
      currentPrice: parseFloat(position.currentPrice),
      quantity: parseFloat(position.quantity),
      remainingQuantity: parseFloat(position.remainingQuantity),
      leverage: parseFloat(position.leverage),
      marginType: position.marginType,
      marginUsed: parseFloat(position.marginUsed),
      marginAvailable: position.marginAvailable ? parseFloat(position.marginAvailable) : undefined,
      marginLevel: position.marginLevel ? parseFloat(position.marginLevel) : undefined,
      unrealizedPnl: parseFloat(position.unrealizedPnl),
      unrealizedPnlPercent: parseFloat(position.unrealizedPnlPercent),
      realizedPnl: parseFloat(position.realizedPnl),
      realizedPnlPercent: parseFloat(position.realizedPnlPercent),
      totalPnl: parseFloat(position.totalPnl),
      totalPnlPercent: parseFloat(position.totalPnlPercent),
      entryFee: parseFloat(position.entryFee),
      exitFee: parseFloat(position.exitFee),
      fundingFee: parseFloat(position.fundingFee),
      totalFees: parseFloat(position.totalFees),
      stopLoss: position.stopLoss ? parseFloat(position.stopLoss) : undefined,
      takeProfit: position.takeProfit ? parseFloat(position.takeProfit) : undefined,
      trailingStop: position.trailingStop ? parseFloat(position.trailingStop) : undefined,
      trailingStopActivationPrice: position.trailingStopActivationPrice
        ? parseFloat(position.trailingStopActivationPrice)
        : undefined,
      liquidationPrice: position.liquidationPrice ? parseFloat(position.liquidationPrice) : undefined,
      highestPrice: position.highestPrice ? parseFloat(position.highestPrice) : undefined,
      lowestPrice: position.lowestPrice ? parseFloat(position.lowestPrice) : undefined,
      maxUnrealizedPnl: parseFloat(position.maxUnrealizedPnl),
      maxDrawdown: parseFloat(position.maxDrawdown),
      status: position.status,
      exitPrice: position.exitPrice ? parseFloat(position.exitPrice) : undefined,
      exitReason: position.exitReason,
      openOrderId: position.openOrderId,
      closeOrderIds: position.closeOrderIds,
      strategyId: position.strategyId,
      botId: position.botId,
      signalId: position.signalId,
      notes: position.notes,
      tags: position.tags,
      openedAt: position.openedAt,
      closedAt: position.closedAt,
      lastUpdatedAt: position.lastUpdatedAt,
    };
  }

  /**
   * Map alert from database
   */
  private mapAlertFromDb(alert: any): PositionAlert {
    return {
      id: alert.id,
      positionId: alert.positionId,
      userId: alert.userId,
      tenantId: alert.tenantId,
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      currentPrice: alert.currentPrice ? parseFloat(alert.currentPrice) : undefined,
      marginLevel: alert.marginLevel ? parseFloat(alert.marginLevel) : undefined,
      unrealizedPnl: alert.unrealizedPnl ? parseFloat(alert.unrealizedPnl) : undefined,
      acknowledged: alert.acknowledged,
      acknowledgedAt: alert.acknowledgedAt,
      createdAt: alert.createdAt,
    };
  }

  /**
   * Map history from database
   */
  private mapHistoryFromDb(history: any): PositionHistoryEntry {
    return {
      id: history.id,
      positionId: history.positionId,
      userId: history.userId,
      tenantId: history.tenantId,
      action: history.action,
      currentPrice: parseFloat(history.currentPrice),
      quantity: parseFloat(history.quantity),
      unrealizedPnl: history.unrealizedPnl ? parseFloat(history.unrealizedPnl) : undefined,
      realizedPnl: history.realizedPnl ? parseFloat(history.realizedPnl) : undefined,
      changes: history.changes,
      timestamp: history.timestamp,
    };
  }

  /**
   * Map summary from database
   */
  private mapSummaryFromDb(summary: any): PositionSummary {
    return {
      id: summary.id,
      userId: summary.userId,
      tenantId: summary.tenantId,
      totalPositions: parseFloat(summary.totalPositions),
      openPositions: parseFloat(summary.openPositions),
      closedPositions: parseFloat(summary.closedPositions),
      totalUnrealizedPnl: parseFloat(summary.totalUnrealizedPnl),
      totalRealizedPnl: parseFloat(summary.totalRealizedPnl),
      totalPnl: parseFloat(summary.totalPnl),
      totalFees: parseFloat(summary.totalFees),
      totalMarginUsed: parseFloat(summary.totalMarginUsed),
      averageMarginLevel: summary.averageMarginLevel ? parseFloat(summary.averageMarginLevel) : undefined,
      winningPositions: parseFloat(summary.winningPositions),
      losingPositions: parseFloat(summary.losingPositions),
      winRate: summary.winRate ? parseFloat(summary.winRate) : undefined,
      lastUpdatedAt: summary.lastUpdatedAt,
    };
  }
}

// Export singleton instance
export const positionService = new PositionService();
