/**
 * Strategy Service
 * Manages trading strategies, signals, and backtests
 */

import { db } from '@/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import logger from '@/utils/logger';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { tradingStrategies, strategySignals, strategyBacktests } from '../schema/strategies.schema';
import { OHLCVService } from '../../market-data/services/ohlcv.service';
import {
  validateCreateStrategyRequest,
  validateUpdateStrategyRequest,
} from '../utils/strategy-validator';
import { validateExchangeCapabilities } from '../utils/ccxt-validator';
import type {
  TradingStrategy,
  CreateStrategyRequest,
  UpdateStrategyRequest,
  StrategyQueryOptions,
  StrategySignal,
  SignalQueryOptions,
  StrategyBacktest,
  RunBacktestRequest,
  StrategyStatistics,
  IStrategyService,
} from '../types/strategies.types';

export class StrategyService implements IStrategyService {
  // ============================================================================
  // STRATEGY CRUD
  // ============================================================================

  /**
   * Create a new trading strategy
   */
  async createStrategy(
    userId: string,
    tenantId: string,
    request: CreateStrategyRequest
  ): Promise<TradingStrategy> {
    logger.info('Creating trading strategy', { userId, tenantId, name: request.name });

    // Validate and sanitize request
    validateCreateStrategyRequest(request);

    // Create strategy
    const [strategy] = await db
      .insert(tradingStrategies)
      .values({
        userId,
        tenantId,
        name: request.name,
        description: request.description,
        version: '1.0.0',
        exchangeId: request.exchangeId,
        symbol: request.symbol,
        timeframe: request.timeframe,
        type: request.type,
        indicators: request.indicators as any,
        conditions: request.conditions as any,
        parameters: request.parameters as any,
        stopLossPercent: request.stopLossPercent?.toString(),
        takeProfitPercent: request.takeProfitPercent?.toString(),
        trailingStopPercent: request.trailingStopPercent?.toString(),
        maxPositionSize: request.maxPositionSize?.toString(),
        maxDrawdownPercent: request.maxDrawdownPercent?.toString(),
        status: 'draft',
        isPublic: false,
        tags: request.tags as any,
        notes: request.notes,
      })
      .returning();

    logger.info('Trading strategy created', { strategyId: strategy.id });

    return this.mapStrategyFromDb(strategy);
  }

  /**
   * Get strategy by ID
   */
  async getStrategy(
    strategyId: string,
    userId: string,
    tenantId: string
  ): Promise<TradingStrategy | null> {
    const [strategy] = await db
      .select()
      .from(tradingStrategies)
      .where(
        and(
          eq(tradingStrategies.id, strategyId),
          eq(tradingStrategies.userId, userId),
          eq(tradingStrategies.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!strategy) {
      return null;
    }

    return this.mapStrategyFromDb(strategy);
  }

  /**
   * Get all strategies matching criteria
   */
  async getStrategies(options: StrategyQueryOptions): Promise<TradingStrategy[]> {
    const conditions = [];

    if (options.userId) {
      conditions.push(eq(tradingStrategies.userId, options.userId));
    }

    if (options.tenantId) {
      conditions.push(eq(tradingStrategies.tenantId, options.tenantId));
    }

    if (options.exchangeId) {
      conditions.push(eq(tradingStrategies.exchangeId, options.exchangeId));
    }

    if (options.symbol) {
      conditions.push(eq(tradingStrategies.symbol, options.symbol));
    }

    if (options.type) {
      conditions.push(eq(tradingStrategies.type, options.type));
    }

    if (options.status) {
      conditions.push(eq(tradingStrategies.status, options.status));
    }

    let query = db
      .select()
      .from(tradingStrategies)
      .orderBy(desc(tradingStrategies.createdAt));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    if (options.limit) {
      query = query.limit(options.limit) as any;
    }

    if (options.offset) {
      query = query.offset(options.offset) as any;
    }

    const strategies = await query;

    return strategies.map((s) => this.mapStrategyFromDb(s));
  }

  /**
   * Update strategy
   */
  async updateStrategy(
    strategyId: string,
    userId: string,
    tenantId: string,
    updates: UpdateStrategyRequest
  ): Promise<TradingStrategy> {
    logger.info('Updating trading strategy', { strategyId, updates });

    // Validate and sanitize updates
    validateUpdateStrategyRequest(updates);

    // Check if strategy exists
    const existing = await this.getStrategy(strategyId, userId, tenantId);
    if (!existing) {
      throw new NotFoundError('Strategy not found');
    }

    // Cannot update active strategies directly
    if (existing.status === 'active' && updates.status !== 'paused') {
      throw new BadRequestError('Cannot update active strategy. Pause it first.');
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.indicators !== undefined) updateData.indicators = updates.indicators;
    if (updates.conditions !== undefined) updateData.conditions = updates.conditions;
    if (updates.parameters !== undefined) updateData.parameters = updates.parameters;
    if (updates.stopLossPercent !== undefined)
      updateData.stopLossPercent = updates.stopLossPercent.toString();
    if (updates.takeProfitPercent !== undefined)
      updateData.takeProfitPercent = updates.takeProfitPercent.toString();
    if (updates.trailingStopPercent !== undefined)
      updateData.trailingStopPercent = updates.trailingStopPercent.toString();
    if (updates.maxPositionSize !== undefined)
      updateData.maxPositionSize = updates.maxPositionSize.toString();
    if (updates.maxDrawdownPercent !== undefined)
      updateData.maxDrawdownPercent = updates.maxDrawdownPercent.toString();
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    // Update in database
    const [updated] = await db
      .update(tradingStrategies)
      .set(updateData)
      .where(
        and(
          eq(tradingStrategies.id, strategyId),
          eq(tradingStrategies.userId, userId),
          eq(tradingStrategies.tenantId, tenantId)
        )
      )
      .returning();

    logger.info('Trading strategy updated', { strategyId });

    return this.mapStrategyFromDb(updated);
  }

  /**
   * Delete strategy
   */
  async deleteStrategy(strategyId: string, userId: string, tenantId: string): Promise<void> {
    logger.info('Deleting trading strategy', { strategyId });

    const strategy = await this.getStrategy(strategyId, userId, tenantId);
    if (!strategy) {
      throw new NotFoundError('Strategy not found');
    }

    if (strategy.status === 'active') {
      throw new BadRequestError('Cannot delete active strategy. Pause it first.');
    }

    // Delete strategy (cascade will delete signals and backtests)
    await db
      .delete(tradingStrategies)
      .where(
        and(
          eq(tradingStrategies.id, strategyId),
          eq(tradingStrategies.userId, userId),
          eq(tradingStrategies.tenantId, tenantId)
        )
      );

    logger.info('Trading strategy deleted', { strategyId });
  }

  // ============================================================================
  // STRATEGY EXECUTION
  // ============================================================================

  /**
   * Activate strategy
   */
  async activateStrategy(
    strategyId: string,
    userId: string,
    tenantId: string
  ): Promise<TradingStrategy> {
    logger.info('Activating strategy', { strategyId });

    const strategy = await this.getStrategy(strategyId, userId, tenantId);
    if (!strategy) {
      throw new NotFoundError('Strategy not found');
    }

    if (strategy.status === 'active') {
      throw new BadRequestError('Strategy is already active');
    }

    // Validate strategy is ready to activate
    this.validateStrategyForExecution(strategy);

    // Validate exchange capabilities (CCXT)
    await validateExchangeCapabilities(strategy.exchangeId, strategy);

    logger.info('Exchange capabilities validated', {
      strategyId,
      exchangeId: strategy.exchangeId,
      symbol: strategy.symbol,
      timeframe: strategy.timeframe,
    });

    // Update status
    const updated = await this.updateStrategy(strategyId, userId, tenantId, {
      status: 'active',
    });

    logger.info('Strategy activated successfully', {
      strategyId,
      exchangeId: strategy.exchangeId,
      symbol: strategy.symbol,
    });

    return updated;
  }

  /**
   * Pause strategy
   */
  async pauseStrategy(
    strategyId: string,
    userId: string,
    tenantId: string
  ): Promise<TradingStrategy> {
    logger.info('Pausing strategy', { strategyId });

    const strategy = await this.getStrategy(strategyId, userId, tenantId);
    if (!strategy) {
      throw new NotFoundError('Strategy not found');
    }

    if (strategy.status !== 'active') {
      throw new BadRequestError('Only active strategies can be paused');
    }

    // Update status
    const updated = await this.updateStrategy(strategyId, userId, tenantId, {
      status: 'paused',
    });

    logger.info('Strategy paused', { strategyId });

    return updated;
  }

  // ============================================================================
  // SIGNALS
  // ============================================================================

  /**
   * Get signals matching criteria
   */
  async getSignals(options: SignalQueryOptions): Promise<StrategySignal[]> {
    const conditions = [];

    if (options.userId) {
      conditions.push(eq(strategySignals.userId, options.userId));
    }

    if (options.tenantId) {
      conditions.push(eq(strategySignals.tenantId, options.tenantId));
    }

    if (options.strategyId) {
      conditions.push(eq(strategySignals.strategyId, options.strategyId));
    }

    if (options.exchangeId) {
      conditions.push(eq(strategySignals.exchangeId, options.exchangeId));
    }

    if (options.symbol) {
      conditions.push(eq(strategySignals.symbol, options.symbol));
    }

    if (options.type) {
      conditions.push(eq(strategySignals.type, options.type));
    }

    if (options.status) {
      conditions.push(eq(strategySignals.status, options.status));
    }

    let query = db
      .select()
      .from(strategySignals)
      .orderBy(desc(strategySignals.timestamp));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    if (options.limit) {
      query = query.limit(options.limit) as any;
    }

    if (options.offset) {
      query = query.offset(options.offset) as any;
    }

    const signals = await query;

    return signals.map((s) => this.mapSignalFromDb(s));
  }

  /**
   * Generate signal for strategy using StrategyRunner
   */
  async generateSignal(strategyId: string): Promise<StrategySignal | null> {
    logger.info('Generating signal for strategy', { strategyId });

    // Get strategy
    const [strategy] = await db
      .select()
      .from(tradingStrategies)
      .where(eq(tradingStrategies.id, strategyId))
      .limit(1);

    if (!strategy) {
      throw new NotFoundError('Strategy not found');
    }

    if (strategy.status !== 'active') {
      throw new BadRequestError('Strategy must be active to generate signals');
    }

    // Map database strategy to TradingStrategy type
    const mappedStrategy = this.mapStrategyFromDb(strategy);

    // Use StrategyRunner to evaluate and generate signal
    const { strategyRunner } = await import('../engine');
    const tradingSignal = await strategyRunner.evaluate(mappedStrategy);

    if (!tradingSignal) {
      logger.debug('No signal generated - conditions not met');
      return null;
    }

    // Get latest market price for calculations
    const ohlcvData = await OHLCVService.fetchOHLCV({
      exchangeId: strategy.exchangeId,
      symbol: strategy.symbol,
      timeframe: strategy.timeframe as any,
      limit: 1,
    });

    const currentPrice = ohlcvData[0]?.close || 0;

    // Calculate stop loss and take profit based on signal type
    let stopLoss: number | undefined;
    let takeProfit: number | undefined;

    if (tradingSignal.type === 'BUY') {
      stopLoss = strategy.stopLossPercent
        ? currentPrice * (1 - parseFloat(strategy.stopLossPercent) / 100)
        : undefined;
      takeProfit = strategy.takeProfitPercent
        ? currentPrice * (1 + parseFloat(strategy.takeProfitPercent) / 100)
        : undefined;
    } else if (tradingSignal.type === 'SELL') {
      stopLoss = strategy.stopLossPercent
        ? currentPrice * (1 + parseFloat(strategy.stopLossPercent) / 100)
        : undefined;
      takeProfit = strategy.takeProfitPercent
        ? currentPrice * (1 - parseFloat(strategy.takeProfitPercent) / 100)
        : undefined;
    }

    // Map TradingSignal type to database signal type
    const dbSignalType = tradingSignal.type === 'BUY' ? 'buy' : tradingSignal.type === 'SELL' ? 'sell' : 'buy';

    // Create signal in database
    const [signal] = await db
      .insert(strategySignals)
      .values({
        strategyId: strategy.id,
        userId: strategy.userId,
        tenantId: strategy.tenantId,
        exchangeId: strategy.exchangeId,
        symbol: strategy.symbol,
        timeframe: strategy.timeframe,
        type: dbSignalType,
        strength: tradingSignal.strength.toString(),
        confidence: tradingSignal.confidence.toString(),
        price: currentPrice.toString(),
        stopLoss: stopLoss?.toString(),
        takeProfit: takeProfit?.toString(),
        indicatorValues: tradingSignal.indicators as any,
        status: 'pending',
        reason: tradingSignal.reasons.join(', '),
        timestamp: tradingSignal.timestamp,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
      })
      .returning();

    logger.info('Signal generated via StrategyRunner', {
      signalId: signal.id,
      type: tradingSignal.type,
      strength: tradingSignal.strength,
      confidence: tradingSignal.confidence,
    });

    return this.mapSignalFromDb(signal);
  }

  // ============================================================================
  // BACKTESTING
  // ============================================================================

  /**
   * Run backtest for strategy
   */
  async runBacktest(
    userId: string,
    tenantId: string,
    request: RunBacktestRequest
  ): Promise<StrategyBacktest> {
    logger.info('Starting backtest', { strategyId: request.strategyId });

    // Get strategy
    const strategy = await this.getStrategy(request.strategyId, userId, tenantId);
    if (!strategy) {
      throw new NotFoundError('Strategy not found');
    }

    // Create backtest record
    const [backtest] = await db
      .insert(strategyBacktests)
      .values({
        strategyId: request.strategyId,
        userId,
        tenantId,
        startDate: request.startDate,
        endDate: request.endDate,
        initialCapital: request.initialCapital.toString(),
        status: 'running',
      })
      .returning();

    logger.info('Backtest created', { backtestId: backtest.id });

    // Run backtest asynchronously using BacktestEngine
    this.runBacktestAsync(backtest.id, strategy, request).catch((error) => {
      logger.error('Backtest failed', { backtestId: backtest.id, error });
    });

    return this.mapBacktestFromDb(backtest);
  }

  /**
   * Get backtest by ID
   */
  async getBacktest(
    backtestId: string,
    userId: string,
    tenantId: string
  ): Promise<StrategyBacktest | null> {
    const [backtest] = await db
      .select()
      .from(strategyBacktests)
      .where(
        and(
          eq(strategyBacktests.id, backtestId),
          eq(strategyBacktests.userId, userId),
          eq(strategyBacktests.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!backtest) {
      return null;
    }

    return this.mapBacktestFromDb(backtest);
  }

  /**
   * Get all backtests for strategy
   */
  async getBacktests(
    strategyId: string,
    userId: string,
    tenantId: string
  ): Promise<StrategyBacktest[]> {
    const backtests = await db
      .select()
      .from(strategyBacktests)
      .where(
        and(
          eq(strategyBacktests.strategyId, strategyId),
          eq(strategyBacktests.userId, userId),
          eq(strategyBacktests.tenantId, tenantId)
        )
      )
      .orderBy(desc(strategyBacktests.createdAt));

    return backtests.map((b) => this.mapBacktestFromDb(b));
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Get strategy statistics for user
   */
  async getStrategyStatistics(userId: string, tenantId: string): Promise<StrategyStatistics> {
    // Count strategies
    const [strategyCounts] = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(case when ${tradingStrategies.status} = 'active' then 1 end)::int`,
      })
      .from(tradingStrategies)
      .where(
        and(eq(tradingStrategies.userId, userId), eq(tradingStrategies.tenantId, tenantId))
      );

    // Count signals
    const [signalCounts] = await db
      .select({
        total: sql<number>`count(*)::int`,
        executed: sql<number>`count(case when ${strategySignals.status} = 'executed' then 1 end)::int`,
      })
      .from(strategySignals)
      .where(and(eq(strategySignals.userId, userId), eq(strategySignals.tenantId, tenantId)));

    // Get overall performance
    const [performance] = await db
      .select({
        totalTrades: sql<number>`coalesce(sum(${tradingStrategies.totalTrades}), 0)::int`,
        winningTrades: sql<number>`coalesce(sum(${tradingStrategies.winningTrades}), 0)::int`,
        totalPnl: sql<string>`coalesce(sum(${tradingStrategies.totalPnl}), 0)`,
      })
      .from(tradingStrategies)
      .where(and(eq(tradingStrategies.userId, userId), eq(tradingStrategies.tenantId, tenantId)));

    const totalTrades = performance.totalTrades;
    const winningTrades = performance.winningTrades;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    // Get best strategy
    const [bestStrategy] = await db
      .select({
        id: tradingStrategies.id,
        name: tradingStrategies.name,
        winRate: tradingStrategies.winRate,
        profitFactor: tradingStrategies.profitFactor,
      })
      .from(tradingStrategies)
      .where(and(eq(tradingStrategies.userId, userId), eq(tradingStrategies.tenantId, tenantId)))
      .orderBy(desc(tradingStrategies.profitFactor))
      .limit(1);

    return {
      totalStrategies: strategyCounts.total,
      activeStrategies: strategyCounts.active,
      totalSignals: signalCounts.total,
      executedSignals: signalCounts.executed,
      totalTrades,
      winRate,
      profitFactor: bestStrategy?.profitFactor ? parseFloat(bestStrategy.profitFactor) : 0,
      totalPnl: parseFloat(performance.totalPnl),
      bestStrategy: bestStrategy
        ? {
            id: bestStrategy.id,
            name: bestStrategy.name,
            winRate: bestStrategy.winRate ? parseFloat(bestStrategy.winRate) : 0,
            profitFactor: bestStrategy.profitFactor ? parseFloat(bestStrategy.profitFactor) : 0,
          }
        : undefined,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Validate strategy for execution
   */
  private validateStrategyForExecution(strategy: TradingStrategy): void {
    if (!strategy.indicators || strategy.indicators.length === 0) {
      throw new BadRequestError('Strategy must have at least one indicator');
    }

    if (!strategy.conditions || strategy.conditions.length === 0) {
      throw new BadRequestError('Strategy must have at least one condition');
    }
  }


  /**
   * Run backtest asynchronously using BacktestEngine
   */
  private async runBacktestAsync(
    backtestId: string,
    strategy: TradingStrategy,
    request: RunBacktestRequest
  ): Promise<void> {
    try {
      logger.info('Starting backtest execution', {
        backtestId,
        strategyId: strategy.id,
        startDate: request.startDate,
        endDate: request.endDate,
      });

      // Import BacktestEngine
      const { BacktestEngine } = await import('../../backtest/engine/backtest-engine');

      // Fetch historical market data
      const ohlcvData = await OHLCVService.fetchOHLCV({
        exchangeId: strategy.exchangeId,
        symbol: strategy.symbol,
        timeframe: strategy.timeframe,
        since: request.startDate.getTime(),
        until: request.endDate.getTime(),
      });

      if (ohlcvData.length === 0) {
        throw new Error('No historical data available for backtest period');
      }

      logger.info('Historical data fetched', {
        backtestId,
        candles: ohlcvData.length,
      });

      // Initialize backtest engine
      const engine = new BacktestEngine({
        initialCapital: request.initialCapital,
        feeRate: 0.001, // 0.1% default trading fee
        slippage: 0.0005, // 0.05% default slippage
      });

      // Run backtest
      const results = await engine.run(strategy, ohlcvData);

      // Calculate additional metrics
      const totalTrades = results.trades.length;
      const winningTrades = results.trades.filter((t) => t.pnl > 0).length;
      const losingTrades = results.trades.filter((t) => t.pnl < 0).length;
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

      const totalWins = results.trades
        .filter((t) => t.pnl > 0)
        .reduce((sum, t) => sum + t.pnl, 0);
      const totalLosses = Math.abs(
        results.trades.filter((t) => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0)
      );
      const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;

      const averageWin = winningTrades > 0 ? totalWins / winningTrades : 0;
      const averageLoss = losingTrades > 0 ? totalLosses / losingTrades : 0;

      const largestWin = Math.max(...results.trades.map((t) => t.pnl), 0);
      const largestLoss = Math.min(...results.trades.map((t) => t.pnl), 0);

      // Calculate Sharpe Ratio
      const returns = results.trades.map((t) => t.pnlPercent);
      const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const stdDev = Math.sqrt(
        returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
      );
      const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualized

      // Calculate Sortino Ratio (downside deviation)
      const negativeReturns = returns.filter((r) => r < 0);
      const downsideStdDev =
        negativeReturns.length > 0
          ? Math.sqrt(
              negativeReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) /
                negativeReturns.length
            )
          : 0;
      const sortinoRatio = downsideStdDev > 0 ? (avgReturn / downsideStdDev) * Math.sqrt(252) : 0;

      // Update backtest record with results
      await db
        .update(strategyBacktests)
        .set({
          status: 'completed',
          finalCapital: results.finalCapital.toString(),
          totalReturn: (results.finalCapital - request.initialCapital).toString(),
          totalReturnPercent: (
            ((results.finalCapital - request.initialCapital) / request.initialCapital) *
            100
          ).toString(),
          totalTrades: totalTrades.toString(),
          winningTrades: winningTrades.toString(),
          losingTrades: losingTrades.toString(),
          winRate: winRate.toFixed(2),
          profitFactor: profitFactor.toFixed(2),
          sharpeRatio: sharpeRatio.toFixed(2),
          sortinoRatio: sortinoRatio.toFixed(2),
          maxDrawdown: results.maxDrawdown?.toString(),
          maxDrawdownPercent: results.maxDrawdownPercent?.toString(),
          averageWin: averageWin.toFixed(2),
          averageLoss: averageLoss.toFixed(2),
          largestWin: largestWin.toFixed(2),
          largestLoss: largestLoss.toFixed(2),
          trades: results.trades as any,
          equityCurve: results.equityCurve as any,
          completedAt: new Date(),
        })
        .where(eq(strategyBacktests.id, backtestId));

      // Update strategy performance metrics
      await db
        .update(tradingStrategies)
        .set({
          totalTrades: totalTrades.toString(),
          winningTrades: winningTrades.toString(),
          losingTrades: losingTrades.toString(),
          winRate: winRate.toFixed(2),
          profitFactor: profitFactor.toFixed(2),
          sharpeRatio: sharpeRatio.toFixed(2),
          maxDrawdown: results.maxDrawdown?.toString(),
          updatedAt: new Date(),
        })
        .where(eq(tradingStrategies.id, strategy.id));

      logger.info('Backtest completed successfully', {
        backtestId,
        totalTrades,
        winRate: winRate.toFixed(2),
        profitFactor: profitFactor.toFixed(2),
        finalCapital: results.finalCapital,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Backtest execution failed', { backtestId, error: errorMessage });

      await db
        .update(strategyBacktests)
        .set({
          status: 'failed',
          errorMessage,
        })
        .where(eq(strategyBacktests.id, backtestId));

      throw error;
    }
  }

  /**
   * Map strategy from database
   */
  private mapStrategyFromDb(strategy: any): TradingStrategy {
    return {
      id: strategy.id,
      userId: strategy.userId,
      tenantId: strategy.tenantId,
      name: strategy.name,
      description: strategy.description,
      version: strategy.version,
      exchangeId: strategy.exchangeId,
      symbol: strategy.symbol,
      timeframe: strategy.timeframe,
      type: strategy.type,
      indicators: strategy.indicators,
      conditions: strategy.conditions,
      parameters: strategy.parameters,
      stopLossPercent: strategy.stopLossPercent ? parseFloat(strategy.stopLossPercent) : undefined,
      takeProfitPercent: strategy.takeProfitPercent
        ? parseFloat(strategy.takeProfitPercent)
        : undefined,
      trailingStopPercent: strategy.trailingStopPercent
        ? parseFloat(strategy.trailingStopPercent)
        : undefined,
      maxPositionSize: strategy.maxPositionSize ? parseFloat(strategy.maxPositionSize) : undefined,
      maxDrawdownPercent: strategy.maxDrawdownPercent
        ? parseFloat(strategy.maxDrawdownPercent)
        : undefined,
      status: strategy.status,
      isPublic: strategy.isPublic,
      totalTrades: parseFloat(strategy.totalTrades),
      winningTrades: parseFloat(strategy.winningTrades),
      losingTrades: parseFloat(strategy.losingTrades),
      totalPnl: parseFloat(strategy.totalPnl),
      winRate: strategy.winRate ? parseFloat(strategy.winRate) : undefined,
      profitFactor: strategy.profitFactor ? parseFloat(strategy.profitFactor) : undefined,
      sharpeRatio: strategy.sharpeRatio ? parseFloat(strategy.sharpeRatio) : undefined,
      maxDrawdown: strategy.maxDrawdown ? parseFloat(strategy.maxDrawdown) : undefined,
      tags: strategy.tags,
      notes: strategy.notes,
      createdAt: strategy.createdAt,
      updatedAt: strategy.updatedAt,
      lastRunAt: strategy.lastRunAt,
    };
  }

  /**
   * Map signal from database
   */
  private mapSignalFromDb(signal: any): StrategySignal {
    return {
      id: signal.id,
      strategyId: signal.strategyId,
      userId: signal.userId,
      tenantId: signal.tenantId,
      exchangeId: signal.exchangeId,
      symbol: signal.symbol,
      timeframe: signal.timeframe,
      type: signal.type,
      strength: signal.strength ? parseFloat(signal.strength) : undefined,
      confidence: signal.confidence ? parseFloat(signal.confidence) : undefined,
      price: parseFloat(signal.price),
      stopLoss: signal.stopLoss ? parseFloat(signal.stopLoss) : undefined,
      takeProfit: signal.takeProfit ? parseFloat(signal.takeProfit) : undefined,
      indicatorValues: signal.indicatorValues,
      status: signal.status,
      orderId: signal.orderId,
      executedPrice: signal.executedPrice ? parseFloat(signal.executedPrice) : undefined,
      executedAt: signal.executedAt,
      pnl: signal.pnl ? parseFloat(signal.pnl) : undefined,
      pnlPercent: signal.pnlPercent ? parseFloat(signal.pnlPercent) : undefined,
      reason: signal.reason,
      notes: signal.notes,
      timestamp: signal.timestamp,
      expiresAt: signal.expiresAt,
    };
  }

  /**
   * Map backtest from database
   */
  private mapBacktestFromDb(backtest: any): StrategyBacktest {
    return {
      id: backtest.id,
      strategyId: backtest.strategyId,
      userId: backtest.userId,
      tenantId: backtest.tenantId,
      startDate: backtest.startDate,
      endDate: backtest.endDate,
      initialCapital: parseFloat(backtest.initialCapital),
      finalCapital: backtest.finalCapital ? parseFloat(backtest.finalCapital) : undefined,
      totalReturn: backtest.totalReturn ? parseFloat(backtest.totalReturn) : undefined,
      totalReturnPercent: backtest.totalReturnPercent
        ? parseFloat(backtest.totalReturnPercent)
        : undefined,
      totalTrades: backtest.totalTrades ? parseFloat(backtest.totalTrades) : undefined,
      winningTrades: backtest.winningTrades ? parseFloat(backtest.winningTrades) : undefined,
      losingTrades: backtest.losingTrades ? parseFloat(backtest.losingTrades) : undefined,
      winRate: backtest.winRate ? parseFloat(backtest.winRate) : undefined,
      profitFactor: backtest.profitFactor ? parseFloat(backtest.profitFactor) : undefined,
      sharpeRatio: backtest.sharpeRatio ? parseFloat(backtest.sharpeRatio) : undefined,
      sortinoRatio: backtest.sortinoRatio ? parseFloat(backtest.sortinoRatio) : undefined,
      maxDrawdown: backtest.maxDrawdown ? parseFloat(backtest.maxDrawdown) : undefined,
      maxDrawdownPercent: backtest.maxDrawdownPercent
        ? parseFloat(backtest.maxDrawdownPercent)
        : undefined,
      averageWin: backtest.averageWin ? parseFloat(backtest.averageWin) : undefined,
      averageLoss: backtest.averageLoss ? parseFloat(backtest.averageLoss) : undefined,
      largestWin: backtest.largestWin ? parseFloat(backtest.largestWin) : undefined,
      largestLoss: backtest.largestLoss ? parseFloat(backtest.largestLoss) : undefined,
      trades: backtest.trades,
      equityCurve: backtest.equityCurve,
      status: backtest.status,
      errorMessage: backtest.errorMessage,
      createdAt: backtest.createdAt,
      completedAt: backtest.completedAt,
    };
  }
}

// Export singleton instance
export const strategyService = new StrategyService();
