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
  IndicatorConfig,
  StrategyCondition,
  ConditionRule,
  SignalType,
  BacktestTrade,
  EquityCurvePoint,
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

    // Validate request
    this.validateStrategyRequest(request);

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

    // Update status
    const updated = await this.updateStrategy(strategyId, userId, tenantId, {
      status: 'active',
    });

    logger.info('Strategy activated', { strategyId });

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
   * Generate signal for strategy
   * Evaluates indicators and conditions to produce trading signals
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

    // Fetch latest market data
    const ohlcvData = await OHLCVService.fetchOHLCV({
      exchangeId: strategy.exchangeId,
      symbol: strategy.symbol,
      timeframe: strategy.timeframe as any, // Type assertion - timeframe is validated in schema
      limit: 100,
    });

    if (ohlcvData.length === 0) {
      logger.warn('No market data available for signal generation');
      return null;
    }

    // Calculate indicators using real implementation
    const latestCandle = ohlcvData[ohlcvData.length - 1];
    const indicatorValues = await this.calculateIndicators(ohlcvData, strategy.indicators as any);

    // Evaluate conditions to generate trading signal
    const signalType = this.evaluateConditions(
      indicatorValues,
      strategy.conditions as any
    );

    if (!signalType) {
      logger.debug('No signal generated - conditions not met');
      return null;
    }

    // Calculate stop loss and take profit
    const currentPrice = latestCandle.close;
    const stopLoss = strategy.stopLossPercent
      ? currentPrice * (1 - parseFloat(strategy.stopLossPercent) / 100)
      : undefined;
    const takeProfit = strategy.takeProfitPercent
      ? currentPrice * (1 + parseFloat(strategy.takeProfitPercent) / 100)
      : undefined;

    const signalQuality = this.calculateSignalQuality(
      indicatorValues as Record<string, any>,
      strategy.conditions as any,
      signalType
    );

    // Create signal
    const [signal] = await db
      .insert(strategySignals)
      .values({
        strategyId: strategy.id,
        userId: strategy.userId,
        tenantId: strategy.tenantId,
        exchangeId: strategy.exchangeId,
        symbol: strategy.symbol,
        timeframe: strategy.timeframe,
        type: signalType,
        strength: signalQuality.strength,
        confidence: signalQuality.confidence,
        price: currentPrice.toString(),
        stopLoss: stopLoss?.toString(),
        takeProfit: takeProfit?.toString(),
        indicatorValues: indicatorValues as any,
        status: 'pending',
        reason: 'Strategy conditions met',
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
      })
      .returning();

    logger.info('Signal generated', { signalId: signal.id, type: signalType });

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

    // Run backtest asynchronously with full simulation
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
   * Validate strategy request
   */
  private validateStrategyRequest(request: CreateStrategyRequest): void {
    if (!request.name || request.name.trim().length === 0) {
      throw new BadRequestError('Strategy name is required');
    }

    if (!request.exchangeId || !request.symbol || !request.timeframe) {
      throw new BadRequestError('Exchange, symbol, and timeframe are required');
    }

    if (!request.indicators || request.indicators.length === 0) {
      throw new BadRequestError('At least one indicator is required');
    }

    if (!request.conditions || request.conditions.length === 0) {
      throw new BadRequestError('At least one condition is required');
    }
  }

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
   * Calculate indicators based on configuration
   * Converts OHLCV data and calculates each indicator using indicators module
   */
  private async calculateIndicators(
    ohlcvData: any[],
    indicators: IndicatorConfig[]
  ): Promise<Record<string, any>> {
    if (!ohlcvData || ohlcvData.length === 0) {
      logger.warn('No OHLCV data provided for indicator calculation');
      return {};
    }

    if (!indicators || indicators.length === 0) {
      return {};
    }

    // Convert OHLCV data to the format expected by calculator
    const convertedData = ohlcvData.map((candle) => ({
      timestamp: candle.timestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
    }));

    const results: Record<string, any> = {};

    // Import indicator calculator dynamically
    const {
      calculateRSI,
      calculateMACD,
      calculateEMA,
      calculateSMA,
      calculateBBands,
      calculateATR,
      calculateStoch,
      calculateADX,
      getLatestValue,
    } = await import('@/modules/indicators/utils/calculator-v2');

    // Calculate each indicator
    for (const indicator of indicators) {
      if (!indicator.enabled) continue;

      try {
        const params = indicator.parameters || {};
        let indicatorResult: any;

        switch (indicator.type.toLowerCase()) {
          case 'rsi':
            indicatorResult = await calculateRSI(convertedData, params.period || 14);
            results.rsi = getLatestValue(indicatorResult);
            break;

          case 'macd':
            indicatorResult = await calculateMACD(
              convertedData,
              params.fastPeriod || 12,
              params.slowPeriod || 26,
              params.signalPeriod || 9
            );
            results.macd = {
              value: getLatestValue(indicatorResult.macd),
              signal: getLatestValue(indicatorResult.signal),
              histogram: getLatestValue(indicatorResult.histogram),
            };
            break;

          case 'ema':
            indicatorResult = await calculateEMA(convertedData, params.period || 20);
            const key = `ema_${params.period || 20}`;
            results[key] = getLatestValue(indicatorResult);
            break;

          case 'sma':
            indicatorResult = await calculateSMA(convertedData, params.period || 20);
            const smaKey = `sma_${params.period || 20}`;
            results[smaKey] = getLatestValue(indicatorResult);
            break;

          case 'bollinger_bands':
          case 'bbands':
            indicatorResult = await calculateBBands(
              convertedData,
              params.period || 20,
              params.stdDev || 2
            );
            results.bollinger_bands = {
              upper: getLatestValue(indicatorResult.upper),
              middle: getLatestValue(indicatorResult.middle),
              lower: getLatestValue(indicatorResult.lower),
            };
            break;

          case 'atr':
            indicatorResult = await calculateATR(convertedData, params.period || 14);
            results.atr = getLatestValue(indicatorResult);
            break;

          case 'stochastic':
          case 'stoch':
            indicatorResult = await calculateStoch(
              convertedData,
              params.kPeriod || 14,
              params.kSlowing || 3,
              params.dPeriod || 3
            );
            results.stochastic = {
              k: getLatestValue(indicatorResult.k),
              d: getLatestValue(indicatorResult.d),
            };
            break;

          case 'adx':
            indicatorResult = await calculateADX(convertedData, params.period || 14);
            results.adx = getLatestValue(indicatorResult);
            break;

          default:
            logger.warn(`Unsupported indicator type: ${indicator.type}`);
        }
      } catch (error) {
        logger.error(`Error calculating indicator ${indicator.type}`, { error });
        // Continue with other indicators instead of failing completely
      }
    }

    return results;
  }

  /**
   * Evaluate conditions based on indicator values
   * Supports multiple condition types and operators
   */
  private evaluateConditions(
    indicatorValues: Record<string, any>,
    conditions: StrategyCondition[]
  ): SignalType | null {
    if (!conditions || conditions.length === 0) {
      return null;
    }

    let entrySignal: SignalType | null = null;
    let exitSignal: SignalType | null = null;

    // Evaluate entry and exit conditions separately
    for (const condition of conditions) {
      const conditionMet = this.evaluateConditionRules(indicatorValues, condition);

      if (conditionMet) {
        if (condition.type === 'entry') {
          // For entry conditions, we need to determine buy/sell
          // This is a simplified approach - real strategies might be more complex
          entrySignal = this.determineEntrySignal(indicatorValues, condition);
        } else if (condition.type === 'exit') {
          exitSignal = this.determineExitSignal(indicatorValues, condition);
        }
      }
    }

    // Prioritize exit signals over entry signals
    if (exitSignal) {
      return exitSignal;
    }

    return entrySignal;
  }

  /**
   * Evaluate condition rules with AND/OR logic
   */
  private evaluateConditionRules(
    indicatorValues: Record<string, any>,
    condition: StrategyCondition
  ): boolean {
    if (!condition.rules || condition.rules.length === 0) {
      return false;
    }

    const ruleResults = condition.rules.map((rule) =>
      this.evaluateRule(indicatorValues, rule)
    );

    // Apply logic operator
    if (condition.logic === 'AND') {
      return ruleResults.every((result) => result);
    } else {
      // OR logic
      return ruleResults.some((result) => result);
    }
  }

  /**
   * Evaluate a single condition rule
   */
  private evaluateRule(indicatorValues: Record<string, any>, rule: ConditionRule): boolean {
    const indicatorValue = this.getIndicatorValue(indicatorValues, rule.indicator);

    if (indicatorValue === null || indicatorValue === undefined) {
      return false;
    }

    const compareValue = typeof rule.value === 'string'
      ? this.getIndicatorValue(indicatorValues, rule.value)
      : rule.value;

    if (compareValue === null || compareValue === undefined) {
      return false;
    }

    switch (rule.operator) {
      case '>':
        return indicatorValue > compareValue;
      case '<':
        return indicatorValue < compareValue;
      case '>=':
        return indicatorValue >= compareValue;
      case '<=':
        return indicatorValue <= compareValue;
      case '==':
        return Math.abs(indicatorValue - compareValue) < 0.0001;
      case '!=':
        return Math.abs(indicatorValue - compareValue) >= 0.0001;
      case 'crosses_above':
        // For crossover detection, we'd need historical data
        // Simplified: just check if current value is above
        return indicatorValue > compareValue;
      case 'crosses_below':
        // Simplified: just check if current value is below
        return indicatorValue < compareValue;
      default:
        logger.warn(`Unsupported operator: ${rule.operator}`);
        return false;
    }
  }

  /**
   * Get indicator value from the results object
   * Supports nested paths like 'macd.histogram' or 'bollinger_bands.upper'
   */
  private getIndicatorValue(indicatorValues: Record<string, any>, path: string): number | null {
    if (!path || !indicatorValues) {
      return null;
    }

    const parts = path.split('.');
    let value: any = indicatorValues;

    for (const part of parts) {
      if (value === null || value === undefined || typeof value !== 'object') {
        return null;
      }
      value = value[part];
    }

    return typeof value === 'number' ? value : null;
  }

  /**
   * Determine entry signal type based on conditions
   */
  private determineEntrySignal(
    indicatorValues: Record<string, any>,
    _condition: StrategyCondition
  ): SignalType | null {
    // Simplified logic: Check RSI for overbought/oversold
    const rsi = indicatorValues.rsi;

    if (rsi !== null && rsi !== undefined) {
      if (rsi < 30) {
        return 'buy'; // Oversold
      }
      if (rsi > 70) {
        return 'sell'; // Overbought
      }
    }

    // Check MACD for bullish/bearish signal
    const macd = indicatorValues.macd;
    if (macd && macd.histogram !== null && macd.histogram !== undefined) {
      if (macd.histogram > 0) {
        return 'buy'; // Bullish
      }
      if (macd.histogram < 0) {
        return 'sell'; // Bearish
      }
    }

    return null;
  }

  /**
   * Determine exit signal type based on conditions
   */
  private determineExitSignal(
    indicatorValues: Record<string, any>,
    _condition: StrategyCondition
  ): SignalType | null {
    const rsi = this.getIndicatorValue(indicatorValues, 'rsi');
    if (rsi !== null) {
      if (rsi >= 70) {
        return 'close_long';
      }
      if (rsi <= 30) {
        return 'close_short';
      }
    }

    const macdHistogram = this.getIndicatorValue(indicatorValues, 'macd.histogram');
    if (macdHistogram !== null) {
      if (macdHistogram < 0) {
        return 'close_long';
      }
      if (macdHistogram > 0) {
        return 'close_short';
      }
    }

    const stochasticK = this.getIndicatorValue(indicatorValues, 'stochastic.k');
    const stochasticD = this.getIndicatorValue(indicatorValues, 'stochastic.d');
    if (stochasticK !== null && stochasticD !== null) {
      if (stochasticK < stochasticD) {
        return 'close_long';
      }
      if (stochasticK > stochasticD) {
        return 'close_short';
      }
    }

    return null;
  }

  /**
   * Calculate signal quality metrics
   */
  private calculateSignalQuality(
    indicatorValues: Record<string, any>,
    conditions: StrategyCondition[] | undefined,
    signalType: SignalType | null
  ): { strength: number; confidence: number } {
    if (!signalType) {
      return { strength: 0, confidence: 0 };
    }

    const relevantConditions = (conditions || []).filter((condition) =>
      signalType === 'buy' || signalType === 'sell'
        ? condition.type === 'entry'
        : condition.type === 'exit'
    );

    let totalRules = 0;
    let matchedRules = 0;

    for (const condition of relevantConditions) {
      for (const rule of condition.rules || []) {
        totalRules += 1;
        if (this.evaluateRule(indicatorValues, rule)) {
          matchedRules += 1;
        }
      }
    }

    const baseStrength =
      totalRules > 0
        ? matchedRules / totalRules
        : relevantConditions.length > 0
          ? 0.5
          : 0.25;

    const strengthRatio = Math.min(1, Math.max(0, baseStrength));

    const rsi = this.getIndicatorValue(indicatorValues, 'rsi');
    let rsiScore = 0;
    if (rsi !== null) {
      if (signalType === 'buy' || signalType === 'close_short') {
        rsiScore = Math.max(0, Math.min(1, (70 - rsi) / 40));
      } else if (signalType === 'sell' || signalType === 'close_long') {
        rsiScore = Math.max(0, Math.min(1, (rsi - 30) / 40));
      }
    }

    const macdHistogram = this.getIndicatorValue(indicatorValues, 'macd.histogram');
    let macdScore = 0;
    if (macdHistogram !== null) {
      const normalized = Math.min(1, Math.abs(macdHistogram) / 2);
      if (signalType === 'buy' || signalType === 'close_short') {
        macdScore = macdHistogram > 0 ? normalized : 0;
      } else if (signalType === 'sell' || signalType === 'close_long') {
        macdScore = macdHistogram < 0 ? normalized : 0;
      }
    }

    const stochasticK = this.getIndicatorValue(indicatorValues, 'stochastic.k');
    const stochasticD = this.getIndicatorValue(indicatorValues, 'stochastic.d');
    let stochasticScore = 0;
    if (stochasticK !== null && stochasticD !== null) {
      const diff = stochasticK - stochasticD;
      const normalizedDiff = Math.min(1, Math.abs(diff) / 20);
      if (signalType === 'buy' || signalType === 'close_short') {
        stochasticScore = diff > 0 ? normalizedDiff : 0;
      } else if (signalType === 'sell' || signalType === 'close_long') {
        stochasticScore = diff < 0 ? normalizedDiff : 0;
      }
    }

    const scoreComponents = [strengthRatio];
    if (rsiScore > 0) scoreComponents.push(rsiScore);
    if (macdScore > 0) scoreComponents.push(macdScore);
    if (stochasticScore > 0) scoreComponents.push(stochasticScore);

    const confidence = scoreComponents.length
      ? scoreComponents.reduce((sum, value) => sum + value, 0) / scoreComponents.length
      : strengthRatio;

    return {
      strength: Math.round(strengthRatio * 100),
      confidence: Number(Math.min(1, Math.max(0, confidence)).toFixed(2)),
    };
  }

  /**
   * Run backtest asynchronously with full simulation
   */
  private async runBacktestAsync(
    backtestId: string,
    strategy: TradingStrategy,
    request: RunBacktestRequest
  ): Promise<void> {
    try {
      logger.info('Starting backtest execution', { backtestId, strategyId: strategy.id });

      // 1. Fetch historical OHLCV data
      const ohlcvData = await OHLCVService.fetchOHLCV({
        exchangeId: strategy.exchangeId,
        symbol: strategy.symbol,
        timeframe: strategy.timeframe as any,
        since: request.startDate,
        limit: 10000, // Maximum data points
      });

      if (ohlcvData.length === 0) {
        throw new Error('No historical data available for the specified period');
      }

      logger.info('Historical data fetched', {
        backtestId,
        candlesCount: ohlcvData.length,
        startDate: ohlcvData[0].timestamp,
        endDate: ohlcvData[ohlcvData.length - 1].timestamp,
      });

      // 2. Initialize backtest state
      let capital = request.initialCapital;
      let position: {
        side: 'long' | 'short';
        entryPrice: number;
        entryTime: Date;
        quantity: number;
      } | null = null;

      const trades: BacktestTrade[] = [];
      const equityCurve: EquityCurvePoint[] = [];
      const maxEquity = capital;
      let maxDrawdown = 0;
      let peakCapital = capital;

      const SLIPPAGE_PERCENT = 0.1; // 0.1%
      const FEE_PERCENT = 0.1; // 0.1%

      // 3. Simulate strategy execution candle by candle
      for (let i = 0; i < ohlcvData.length; i++) {
        const currentCandle = ohlcvData[i];
        const historicalData = ohlcvData.slice(0, i + 1);

        // Calculate indicators for current state
        const indicatorValues = await this.calculateIndicators(
          historicalData,
          strategy.indicators as any
        );

        // Evaluate conditions to generate signal
        const signal = this.evaluateConditions(indicatorValues, strategy.conditions as any);

        // Current equity (capital + unrealized PnL)
        let currentEquity = capital;
        if (position) {
          const unrealizedPnl = this.calculateUnrealizedPnL(position, currentCandle.close);
          currentEquity += unrealizedPnl;
        }

        // Update drawdown
        if (currentEquity > peakCapital) {
          peakCapital = currentEquity;
        }
        const drawdown = peakCapital - currentEquity;
        const drawdownPercent = (drawdown / peakCapital) * 100;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }

        // Record equity curve
        equityCurve.push({
          timestamp: currentCandle.timestamp,
          equity: currentEquity,
          drawdown: drawdownPercent,
        });

        // Check stop loss and take profit
        if (position) {
          const shouldExit = this.shouldExitPosition(
            position,
            currentCandle.close,
            strategy.stopLossPercent,
            strategy.takeProfitPercent
          );

          if (shouldExit) {
            // Close position
            const exitPrice = this.applySlippage(
              currentCandle.close,
              position.side === 'long' ? 'sell' : 'buy',
              SLIPPAGE_PERCENT
            );
            const pnl = this.calculatePnL(position, exitPrice, FEE_PERCENT);
            capital += pnl;

            trades.push({
              entryTime: position.entryTime,
              entryPrice: position.entryPrice,
              exitTime: currentCandle.timestamp,
              exitPrice,
              quantity: position.quantity,
              side: position.side,
              pnl,
              pnlPercent: (pnl / (position.entryPrice * position.quantity)) * 100,
              fees: (position.entryPrice * position.quantity * FEE_PERCENT) / 100 +
                    (exitPrice * position.quantity * FEE_PERCENT) / 100,
              reason: shouldExit.reason,
            });

            position = null;
            logger.debug('Position closed', { backtestId, pnl, reason: shouldExit.reason });
          }
        }

        // Execute signal if no position
        if (!position && signal && (signal === 'buy' || signal === 'sell')) {
          const side = signal === 'buy' ? 'long' : 'short';
          const entryPrice = this.applySlippage(currentCandle.close, signal, SLIPPAGE_PERCENT);

          // Calculate position size (risk management)
          const maxPositionSize = strategy.maxPositionSize || capital;
          const positionCapital = Math.min(capital * 0.95, maxPositionSize); // Use 95% max
          const quantity = positionCapital / entryPrice;

          position = {
            side,
            entryPrice,
            entryTime: currentCandle.timestamp,
            quantity,
          };

          logger.debug('Position opened', { backtestId, side, entryPrice, quantity });
        }
      }

      // Close any remaining open position at the end
      if (position) {
        const lastCandle = ohlcvData[ohlcvData.length - 1];
        const exitPrice = this.applySlippage(
          lastCandle.close,
          position.side === 'long' ? 'sell' : 'buy',
          SLIPPAGE_PERCENT
        );
        const pnl = this.calculatePnL(position, exitPrice, FEE_PERCENT);
        capital += pnl;

        trades.push({
          entryTime: position.entryTime,
          entryPrice: position.entryPrice,
          exitTime: lastCandle.timestamp,
          exitPrice,
          quantity: position.quantity,
          side: position.side,
          pnl,
          pnlPercent: (pnl / (position.entryPrice * position.quantity)) * 100,
          fees: (position.entryPrice * position.quantity * FEE_PERCENT) / 100 +
                (exitPrice * position.quantity * FEE_PERCENT) / 100,
          reason: 'End of backtest period',
        });
      }

      // 4. Calculate performance metrics
      const finalCapital = capital;
      const totalReturn = finalCapital - request.initialCapital;
      const totalReturnPercent = (totalReturn / request.initialCapital) * 100;

      const winningTrades = trades.filter((t) => t.pnl > 0);
      const losingTrades = trades.filter((t) => t.pnl <= 0);
      const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;

      const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
      const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
      const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;

      const averageWin = winningTrades.length > 0
        ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length
        : 0;
      const averageLoss = losingTrades.length > 0
        ? losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length
        : 0;

      const largestWin = winningTrades.length > 0
        ? Math.max(...winningTrades.map((t) => t.pnl))
        : 0;
      const largestLoss = losingTrades.length > 0
        ? Math.min(...losingTrades.map((t) => t.pnl))
        : 0;

      // Calculate Sharpe Ratio (simplified)
      const returns = trades.map((t) => t.pnlPercent);
      const averageReturn = returns.length > 0
        ? returns.reduce((sum, r) => sum + r, 0) / returns.length
        : 0;
      const stdDevReturns = returns.length > 1
        ? Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - averageReturn, 2), 0) / (returns.length - 1))
        : 0;
      const sharpeRatio = stdDevReturns > 0 ? averageReturn / stdDevReturns : 0;

      const maxDrawdownPercent = peakCapital > 0 ? (maxDrawdown / peakCapital) * 100 : 0;

      logger.info('Backtest metrics calculated', {
        backtestId,
        totalTrades: trades.length,
        winRate,
        profitFactor,
        sharpeRatio,
      });

      // 5. Store results in database
      await db
        .update(strategyBacktests)
        .set({
          status: 'completed',
          finalCapital: finalCapital.toString(),
          totalReturn: totalReturn.toString(),
          totalReturnPercent: totalReturnPercent.toFixed(2),
          totalTrades: trades.length.toString(),
          winningTrades: winningTrades.length.toString(),
          losingTrades: losingTrades.length.toString(),
          winRate: winRate.toFixed(2),
          profitFactor: profitFactor.toFixed(2),
          sharpeRatio: sharpeRatio.toFixed(2),
          maxDrawdown: maxDrawdown.toString(),
          maxDrawdownPercent: maxDrawdownPercent.toFixed(2),
          averageWin: averageWin.toString(),
          averageLoss: averageLoss.toString(),
          largestWin: largestWin.toString(),
          largestLoss: largestLoss.toString(),
          trades: trades as any,
          equityCurve: equityCurve as any,
          completedAt: new Date(),
        })
        .where(eq(strategyBacktests.id, backtestId));

      logger.info('Backtest completed successfully', { backtestId, finalCapital, totalReturn });
    } catch (error) {
      logger.error('Backtest failed', { backtestId, error });

      await db
        .update(strategyBacktests)
        .set({
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        })
        .where(eq(strategyBacktests.id, backtestId));
    }
  }

  /**
   * Calculate unrealized PnL for an open position
   */
  private calculateUnrealizedPnL(
    position: { side: 'long' | 'short'; entryPrice: number; quantity: number },
    currentPrice: number
  ): number {
    if (position.side === 'long') {
      return (currentPrice - position.entryPrice) * position.quantity;
    } else {
      return (position.entryPrice - currentPrice) * position.quantity;
    }
  }

  /**
   * Check if position should be exited based on stop loss or take profit
   */
  private shouldExitPosition(
    position: { side: 'long' | 'short'; entryPrice: number },
    currentPrice: number,
    stopLossPercent?: number,
    takeProfitPercent?: number
  ): { shouldExit: boolean; reason: string } | null {
    if (position.side === 'long') {
      // Check stop loss
      if (stopLossPercent) {
        const stopLossPrice = position.entryPrice * (1 - stopLossPercent / 100);
        if (currentPrice <= stopLossPrice) {
          return { shouldExit: true, reason: 'Stop loss triggered' };
        }
      }

      // Check take profit
      if (takeProfitPercent) {
        const takeProfitPrice = position.entryPrice * (1 + takeProfitPercent / 100);
        if (currentPrice >= takeProfitPrice) {
          return { shouldExit: true, reason: 'Take profit triggered' };
        }
      }
    } else {
      // Short position
      // Check stop loss
      if (stopLossPercent) {
        const stopLossPrice = position.entryPrice * (1 + stopLossPercent / 100);
        if (currentPrice >= stopLossPrice) {
          return { shouldExit: true, reason: 'Stop loss triggered' };
        }
      }

      // Check take profit
      if (takeProfitPercent) {
        const takeProfitPrice = position.entryPrice * (1 - takeProfitPercent / 100);
        if (currentPrice <= takeProfitPrice) {
          return { shouldExit: true, reason: 'Take profit triggered' };
        }
      }
    }

    return null;
  }

  /**
   * Apply slippage to execution price
   */
  private applySlippage(price: number, side: string, slippagePercent: number): number {
    if (side === 'buy') {
      return price * (1 + slippagePercent / 100);
    } else {
      return price * (1 - slippagePercent / 100);
    }
  }

  /**
   * Calculate realized PnL for a closed position
   */
  private calculatePnL(
    position: { side: 'long' | 'short'; entryPrice: number; quantity: number },
    exitPrice: number,
    feePercent: number
  ): number {
    let pnl: number;

    if (position.side === 'long') {
      pnl = (exitPrice - position.entryPrice) * position.quantity;
    } else {
      pnl = (position.entryPrice - exitPrice) * position.quantity;
    }

    // Subtract fees
    const entryFee = (position.entryPrice * position.quantity * feePercent) / 100;
    const exitFee = (exitPrice * position.quantity * feePercent) / 100;
    pnl -= (entryFee + exitFee);

    return pnl;
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
