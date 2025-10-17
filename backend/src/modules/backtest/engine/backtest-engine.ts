/**
 * Backtest Engine
 * Simulates trading strategies against historical data
 */

import { randomUUID } from 'crypto';
import logger from '@/utils/logger';
import { strategyRunner } from '../../strategies/engine';
import { OHLCVService } from '../../market-data/services/ohlcv.service';
import type { MarketDataPoint } from '../../strategies/engine/strategy-runner.types';
import type {
  IBacktestEngine,
  BacktestConfig,
  BacktestResult,
  BacktestState,
  BacktestMetrics,
  VirtualTrade,
  VirtualPosition,
  ClosedPosition,
  EquityCurvePoint,
  TradeAnalysis,
  DEFAULT_BACKTEST_CONFIG,
} from './backtest-engine.types';

/**
 * Backtest Engine Implementation
 */
export class BacktestEngine implements IBacktestEngine {
  /**
   * Run backtest by fetching market data
   */
  async run(config: BacktestConfig): Promise<BacktestResult> {
    const startTime = Date.now();

    try {
      logger.info('Starting backtest', {
        strategy: config.strategy.name,
        symbol: config.symbol,
        period: `${config.startDate.toISOString()} to ${config.endDate.toISOString()}`,
      });

      // Fetch historical market data
      const marketData = await this.fetchMarketData(config);

      if (marketData.length === 0) {
        throw new Error('No market data available for backtest period');
      }

      // Run backtest with data
      const result = await this.runWithData(config, marketData);

      const executionTime = Date.now() - startTime;
      logger.info('Backtest completed', {
        strategy: config.strategy.name,
        executionTime: `${executionTime}ms`,
        totalTrades: result.metrics.totalTrades,
        winRate: `${result.metrics.winRate.toFixed(2)}%`,
        totalReturn: `${result.metrics.totalReturnPercent.toFixed(2)}%`,
      });

      return { ...result, executionTime };
    } catch (error) {
      logger.error('Backtest failed', {
        strategy: config.strategy.name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Run backtest with provided market data
   */
  async runWithData(config: BacktestConfig, marketData: MarketDataPoint[]): Promise<BacktestResult> {
    // Handle empty market data
    if (marketData.length === 0) {
      const emptyState: BacktestState = {
        currentCapital: config.initialCapital,
        peakCapital: config.initialCapital,
        positions: [],
        closedPositions: [],
        trades: [],
        currentDrawdown: 0,
        equityCurve: [],
      };

      const metrics = this.calculateMetrics(emptyState, config);
      const analysis = this.analyzeResults({
        config,
        metrics,
        trades: [],
        equityCurve: [],
        analysis: { bestTrades: [], worstTrades: [], recommendations: [], warnings: [] },
        executionTime: 0,
        dataPointsProcessed: 0,
      });

      return {
        config,
        metrics,
        trades: [],
        equityCurve: [],
        analysis,
        executionTime: 0,
        dataPointsProcessed: 0,
      };
    }

    // Initialize state
    const state: BacktestState = {
      currentCapital: config.initialCapital,
      peakCapital: config.initialCapital,
      positions: [],
      closedPositions: [],
      trades: [],
      currentDrawdown: 0,
      equityCurve: [
        {
          timestamp: marketData[0].timestamp,
          equity: config.initialCapital,
          drawdown: 0,
          drawdownPercent: 0,
        },
      ],
    };

    // Process each candle
    for (let i = 0; i < marketData.length; i++) {
      const currentCandle = marketData[i];
      const historicalData = marketData.slice(0, i + 1);

      // Update open positions with current price
      this.updatePositions(state, currentCandle.close);

      // Check stop loss and take profit
      this.checkExits(state, currentCandle);

      // Only evaluate new signals if we have enough historical data
      if (historicalData.length >= 100) {
        // Evaluate strategy
        const signal = await strategyRunner.evaluate(config.strategy, historicalData);

        if (signal && signal.type !== 'HOLD') {
          // Check if we can open a new position
          if (state.positions.length === 0) {
            // Open new position
            await this.openPosition(state, config, signal, currentCandle);
          } else if (signal.type === 'SELL' && state.positions.length > 0) {
            // Close existing position on SELL signal
            this.closePosition(
              state,
              state.positions[0],
              currentCandle.close,
              currentCandle.timestamp,
              'signal'
            );
          }
        }
      }

      // Update equity curve
      this.updateEquityCurve(state, currentCandle.timestamp);
    }

    // Close any remaining positions at end of backtest
    for (const position of [...state.positions]) {
      this.closePosition(
        state,
        position,
        marketData[marketData.length - 1].close,
        marketData[marketData.length - 1].timestamp,
        'end_of_backtest'
      );
    }

    // Calculate final metrics
    const metrics = this.calculateMetrics(state, config);

    // Analyze results
    const analysis = this.analyzeResults({
      config,
      metrics,
      trades: state.closedPositions,
      equityCurve: state.equityCurve,
      analysis: { bestTrades: [], worstTrades: [], recommendations: [], warnings: [] },
      executionTime: 0,
      dataPointsProcessed: marketData.length,
    });

    return {
      config,
      metrics,
      trades: state.closedPositions,
      equityCurve: state.equityCurve,
      analysis,
      executionTime: 0, // Will be set by caller
      dataPointsProcessed: marketData.length,
    };
  }

  /**
   * Open virtual position
   */
  private async openPosition(
    state: BacktestState,
    config: BacktestConfig,
    signal: any,
    candle: MarketDataPoint
  ): Promise<void> {
    const positionSize = state.currentCapital * (config.positionSizePercent / 100);
    const commission = positionSize * (config.commission / 100);
    const slippage = positionSize * (config.slippage / 100);
    const totalCost = positionSize + commission + slippage;

    if (totalCost > state.currentCapital) {
      logger.warn('Insufficient capital for position', {
        required: totalCost,
        available: state.currentCapital,
      });
      return;
    }

    const entryPrice = candle.close * (1 + config.slippage / 100); // Apply slippage
    const quantity = positionSize / entryPrice;

    // Calculate stop loss and take profit (if configured in strategy)
    const stopLoss = config.strategy.stopLossPercent
      ? entryPrice * (1 - config.strategy.stopLossPercent / 100)
      : undefined;

    const takeProfit = config.strategy.takeProfitPercent
      ? entryPrice * (1 + config.strategy.takeProfitPercent / 100)
      : undefined;

    const position: VirtualPosition = {
      id: randomUUID(),
      symbol: config.symbol,
      side: signal.type === 'BUY' ? 'long' : 'short',
      entryPrice,
      entryTime: candle.timestamp,
      quantity,
      stopLoss,
      takeProfit,
      currentPrice: entryPrice,
      unrealizedPnl: 0,
      unrealizedPnlPercent: 0,
    };

    const trade: VirtualTrade = {
      id: randomUUID(),
      type: signal.type,
      timestamp: candle.timestamp,
      price: entryPrice,
      quantity,
      commission,
      slippage,
      signal: {
        strength: signal.strength,
        confidence: signal.confidence,
        reasons: signal.reasons,
      },
    };

    state.positions.push(position);
    state.trades.push(trade);
    state.currentCapital -= totalCost;

    logger.debug('Position opened', {
      side: position.side,
      entryPrice,
      quantity,
      stopLoss,
      takeProfit,
    });
  }

  /**
   * Close virtual position
   */
  private closePosition(
    state: BacktestState,
    position: VirtualPosition,
    exitPrice: number,
    exitTime: Date,
    exitReason: ClosedPosition['exitReason']
  ): void {
    const exitPriceWithSlippage = exitPrice * 0.9995; // Small slippage on exit
    const proceeds = position.quantity * exitPriceWithSlippage;
    const commission = proceeds * 0.001; // 0.1% commission
    const netProceeds = proceeds - commission;

    const realizedPnl = netProceeds - position.quantity * position.entryPrice;
    const realizedPnlPercent = (realizedPnl / (position.quantity * position.entryPrice)) * 100;
    const holdingPeriod = exitTime.getTime() - position.entryTime.getTime();

    const closedPosition: ClosedPosition = {
      id: position.id,
      symbol: position.symbol,
      side: position.side,
      entryPrice: position.entryPrice,
      entryTime: position.entryTime,
      quantity: position.quantity,
      stopLoss: position.stopLoss,
      takeProfit: position.takeProfit,
      exitPrice: exitPriceWithSlippage,
      exitTime,
      exitReason,
      realizedPnl,
      realizedPnlPercent,
      holdingPeriod,
      commission,
    };

    state.closedPositions.push(closedPosition);
    state.currentCapital += netProceeds;

    // Update peak capital and drawdown
    if (state.currentCapital > state.peakCapital) {
      state.peakCapital = state.currentCapital;
    }
    state.currentDrawdown = state.peakCapital - state.currentCapital;

    // Remove position from active positions
    state.positions = state.positions.filter((p) => p.id !== position.id);

    logger.debug('Position closed', {
      exitReason,
      exitPrice: exitPriceWithSlippage,
      realizedPnl: realizedPnl.toFixed(2),
      realizedPnlPercent: realizedPnlPercent.toFixed(2),
    });
  }

  /**
   * Update positions with current price
   */
  private updatePositions(state: BacktestState, currentPrice: number): void {
    for (const position of state.positions) {
      position.currentPrice = currentPrice;

      if (position.side === 'long') {
        position.unrealizedPnl = position.quantity * (currentPrice - position.entryPrice);
      } else {
        position.unrealizedPnl = position.quantity * (position.entryPrice - currentPrice);
      }

      position.unrealizedPnlPercent = (position.unrealizedPnl / (position.quantity * position.entryPrice)) * 100;
    }
  }

  /**
   * Check stop loss and take profit exits
   */
  private checkExits(state: BacktestState, candle: MarketDataPoint): void {
    for (const position of [...state.positions]) {
      // Check stop loss
      if (position.stopLoss && candle.low <= position.stopLoss) {
        this.closePosition(state, position, position.stopLoss, candle.timestamp, 'stop_loss');
        continue;
      }

      // Check take profit
      if (position.takeProfit && candle.high >= position.takeProfit) {
        this.closePosition(state, position, position.takeProfit, candle.timestamp, 'take_profit');
      }
    }
  }

  /**
   * Update equity curve
   */
  private updateEquityCurve(state: BacktestState, timestamp: Date): void {
    const openPositionsValue = state.positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
    const equity = state.currentCapital + openPositionsValue;
    const drawdown = state.peakCapital - equity;
    const drawdownPercent = state.peakCapital > 0 ? (drawdown / state.peakCapital) * 100 : 0;

    state.equityCurve.push({
      timestamp,
      equity,
      drawdown,
      drawdownPercent,
    });
  }

  /**
   * Calculate backtest metrics
   */
  calculateMetrics(state: BacktestState, config: BacktestConfig): BacktestMetrics {
    const trades = state.closedPositions;
    const winningTrades = trades.filter((t) => t.realizedPnl > 0);
    const losingTrades = trades.filter((t) => t.realizedPnl < 0);

    const totalReturn = state.currentCapital - config.initialCapital;
    const totalReturnPercent = (totalReturn / config.initialCapital) * 100;

    const averageReturn = trades.length > 0 ? totalReturn / trades.length : 0;
    const averageReturnPercent = trades.length > 0 ? totalReturnPercent / trades.length : 0;

    const totalWins = winningTrades.reduce((sum, t) => sum + t.realizedPnl, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.realizedPnl, 0));

    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    // Calculate Sharpe Ratio (simplified)
    const returns = trades.map((t) => t.realizedPnlPercent);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length || 0;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length || 0;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (avgReturn - 0) / stdDev : 0; // Assuming risk-free rate = 0

    // Calculate Sortino Ratio (only downside deviation)
    const downsideReturns = returns.filter((r) => r < 0);
    const downsideVariance =
      downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downsideReturns.length || 0;
    const downsideDeviation = Math.sqrt(downsideVariance);
    const sortinoRatio = downsideDeviation > 0 ? avgReturn / downsideDeviation : 0;

    // Max drawdown
    const maxDrawdown = Math.max(...state.equityCurve.map((e) => e.drawdown));
    const maxDrawdownPercent = Math.max(...state.equityCurve.map((e) => e.drawdownPercent));

    // Consecutive wins/losses
    let consecutiveWins = 0;
    let consecutiveLosses = 0;
    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;

    for (const trade of trades) {
      if (trade.realizedPnl > 0) {
        consecutiveWins++;
        consecutiveLosses = 0;
        maxConsecutiveWins = Math.max(maxConsecutiveWins, consecutiveWins);
      } else {
        consecutiveLosses++;
        consecutiveWins = 0;
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, consecutiveLosses);
      }
    }

    // Time analysis
    const holdingPeriods = trades.map((t) => t.holdingPeriod);
    const averageHoldingPeriod =
      holdingPeriods.reduce((sum, p) => sum + p, 0) / holdingPeriods.length || 0;

    const totalBacktestPeriod =
      config.endDate.getTime() - config.startDate.getTime();
    const averageTimeBetweenTrades = trades.length > 1 ? totalBacktestPeriod / (trades.length - 1) : 0;

    const daysInBacktest = totalBacktestPeriod / (1000 * 60 * 60 * 24);
    const averageTradesPerDay = daysInBacktest > 0 ? trades.length / daysInBacktest : 0;

    return {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
      totalReturn,
      totalReturnPercent,
      averageReturn,
      averageReturnPercent,
      averageWin: winningTrades.length > 0 ? totalWins / winningTrades.length : 0,
      averageLoss: losingTrades.length > 0 ? totalLosses / losingTrades.length : 0,
      largestWin: Math.max(...winningTrades.map((t) => t.realizedPnl), 0),
      largestLoss: Math.min(...losingTrades.map((t) => t.realizedPnl), 0),
      profitFactor,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      maxDrawdownPercent,
      maxConsecutiveWins,
      maxConsecutiveLosses,
      averageHoldingPeriod,
      averageTimeBetweenTrades,
      totalBacktestPeriod,
      initialCapital: config.initialCapital,
      finalCapital: state.currentCapital,
      peakCapital: state.peakCapital,
      longTrades: trades.filter((t) => t.side === 'long').length,
      shortTrades: trades.filter((t) => t.side === 'short').length,
      averageTradesPerDay,
    };
  }

  /**
   * Analyze backtest results
   */
  analyzeResults(result: BacktestResult): {
    bestTrades: TradeAnalysis[];
    worstTrades: TradeAnalysis[];
    recommendations: string[];
    warnings: string[];
  } {
    const bestTrades = result.trades
      .filter((t) => t.realizedPnl > 0)
      .sort((a, b) => b.realizedPnl - a.realizedPnl)
      .slice(0, 5)
      .map((trade) => this.analyzeTrade(trade));

    const worstTrades = result.trades
      .filter((t) => t.realizedPnl < 0)
      .sort((a, b) => a.realizedPnl - b.realizedPnl)
      .slice(0, 5)
      .map((trade) => this.analyzeTrade(trade));

    const recommendations: string[] = [];
    const warnings: string[] = [];

    // Generate recommendations based on metrics
    if (result.metrics.winRate < 40) {
      warnings.push(`Low win rate: ${result.metrics.winRate.toFixed(2)}%. Consider reviewing entry conditions.`);
    }

    if (result.metrics.profitFactor < 1) {
      warnings.push(
        `Profit factor below 1: ${result.metrics.profitFactor.toFixed(2)}. Strategy is losing money overall.`
      );
    } else if (result.metrics.profitFactor > 2) {
      recommendations.push(
        `Strong profit factor: ${result.metrics.profitFactor.toFixed(2)}. Strategy shows good potential.`
      );
    }

    if (result.metrics.maxDrawdownPercent > 20) {
      warnings.push(
        `High maximum drawdown: ${result.metrics.maxDrawdownPercent.toFixed(2)}%. Consider implementing better risk management.`
      );
    }

    if (result.metrics.sharpeRatio > 1) {
      recommendations.push(
        `Good Sharpe ratio: ${result.metrics.sharpeRatio.toFixed(2)}. Strategy has favorable risk-adjusted returns.`
      );
    } else if (result.metrics.sharpeRatio < 0.5) {
      warnings.push(
        `Low Sharpe ratio: ${result.metrics.sharpeRatio.toFixed(2)}. Risk-adjusted returns are poor.`
      );
    }

    if (result.metrics.totalTrades < 30) {
      warnings.push(
        `Low sample size: Only ${result.metrics.totalTrades} trades. Results may not be statistically significant.`
      );
    }

    if (result.metrics.maxConsecutiveLosses > 5) {
      warnings.push(
        `High consecutive losses: ${result.metrics.maxConsecutiveLosses}. Consider adding filters to avoid unfavorable conditions.`
      );
    }

    if (result.metrics.averageWin > 0 && result.metrics.averageLoss > 0) {
      const winLossRatio = result.metrics.averageWin / result.metrics.averageLoss;
      if (winLossRatio < 1) {
        recommendations.push(
          `Average loss exceeds average win. Focus on improving exit strategy or reducing losses.`
        );
      } else if (winLossRatio > 2) {
        recommendations.push(
          `Strong win/loss ratio: ${winLossRatio.toFixed(2)}. Winning trades significantly outpace losing trades.`
        );
      }
    }

    return {
      bestTrades,
      worstTrades,
      recommendations,
      warnings,
    };
  }

  /**
   * Analyze individual trade
   */
  private analyzeTrade(trade: ClosedPosition): TradeAnalysis {
    // Simplified analysis - in production would analyze market conditions
    const priceChange = trade.exitPrice - trade.entryPrice;
    const trend = priceChange > 0 ? 'bullish' : priceChange < 0 ? 'bearish' : 'sideways';
    const volatility = Math.abs(trade.realizedPnlPercent); // Simplified

    return {
      trade,
      marketCondition: {
        trend,
        volatility,
      },
      signalQuality: {
        strength: 50, // Would come from stored signal data
        confidence: 50, // Would come from stored signal data
      },
    };
  }

  /**
   * Fetch market data for backtest period
   */
  private async fetchMarketData(config: BacktestConfig): Promise<MarketDataPoint[]> {
    try {
      // Calculate required candles based on timeframe
      const timeframeMs = this.parseTimeframe(config.timeframe);
      const periodMs = config.endDate.getTime() - config.startDate.getTime();
      const limit = Math.ceil(periodMs / timeframeMs);

      const ohlcvData = await OHLCVService.fetchOHLCV({
        exchangeId: config.strategy.exchangeId,
        symbol: config.symbol,
        timeframe: config.timeframe as any, // Cast to match OHLCV service expectations
        since: config.startDate,
        limit: Math.min(limit, 1000), // Cap at 1000 candles per request
      });

      return ohlcvData.map((candle) => ({
        timestamp: candle.timestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      }));
    } catch (error) {
      logger.error('Failed to fetch market data for backtest', {
        symbol: config.symbol,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Parse timeframe string to milliseconds
   */
  private parseTimeframe(timeframe: string): number {
    const match = timeframe.match(/^(\d+)([mhd])$/);
    if (!match) return 60000; // Default 1 minute

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 60000;
    }
  }
}

// Export singleton instance
export const backtestEngine = new BacktestEngine();
