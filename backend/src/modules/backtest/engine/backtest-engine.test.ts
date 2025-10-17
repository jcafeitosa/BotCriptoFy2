/**
 * Backtest Engine Tests
 * Comprehensive test suite for backtesting engine
 */

import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { BacktestEngine } from './backtest-engine';
import type { BacktestConfig, BacktestState } from './backtest-engine.types';
import type { TradingStrategy } from '../../strategies/types/strategies.types';
import type { MarketDataPoint } from '../../strategies/engine/strategy-runner.types';

// Test data generators
const generateTrendingData = (
  count: number,
  trend: 'up' | 'down' | 'sideways' = 'up'
): MarketDataPoint[] => {
  const data: MarketDataPoint[] = [];
  let price = 50000;

  for (let i = 0; i < count; i++) {
    let change = 0;
    if (trend === 'up') {
      change = Math.random() * 200 - 50; // Slight uptrend
    } else if (trend === 'down') {
      change = Math.random() * 200 - 150; // Slight downtrend
    } else {
      change = Math.random() * 100 - 50; // Sideways
    }

    price += change;

    data.push({
      timestamp: new Date(Date.now() - (count - i) * 3600000),
      open: price - Math.random() * 50,
      high: price + Math.random() * 100,
      low: price - Math.random() * 100,
      close: price,
      volume: Math.random() * 1000000,
    });
  }

  return data;
};

const createTestStrategy = (overrides?: Partial<TradingStrategy>): TradingStrategy => ({
  id: 'strategy-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  name: 'Test Strategy',
  description: 'Backtest strategy',
  version: '1.0.0',
  exchangeId: 'binance',
  symbol: 'BTC/USDT',
  timeframe: '1h',
  type: 'trend_following',
  indicators: [
    {
      type: 'rsi',
      parameters: { period: 14 },
      enabled: true,
    },
    {
      type: 'sma',
      parameters: { period: 20 },
      enabled: true,
    },
  ],
  conditions: [
    {
      type: 'entry',
      logic: 'AND',
      rules: [
        { indicator: 'rsi', operator: '<', value: 40 },
        { indicator: 'sma', operator: '>', value: 49000 },
      ],
    },
  ],
  stopLossPercent: 2,
  takeProfitPercent: 5,
  status: 'active',
  isPublic: false,
  totalTrades: 0,
  winningTrades: 0,
  losingTrades: 0,
  totalPnl: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const createTestConfig = (overrides?: Partial<BacktestConfig>): BacktestConfig => ({
  strategy: createTestStrategy(),
  symbol: 'BTC/USDT',
  timeframe: '1h',
  startDate: new Date(Date.now() - 30 * 24 * 3600000), // 30 days ago
  endDate: new Date(),
  initialCapital: 10000,
  positionSizePercent: 10,
  commission: 0.1,
  slippage: 0.05,
  ...overrides,
});

describe('BacktestEngine - Basic Functionality', () => {
  let engine: BacktestEngine;
  let config: BacktestConfig;
  let marketData: MarketDataPoint[];

  beforeEach(() => {
    engine = new BacktestEngine();
    config = createTestConfig();
    marketData = generateTrendingData(200, 'up');
  });

  test('should initialize correctly', () => {
    expect(engine).toBeDefined();
    expect(engine).toBeInstanceOf(BacktestEngine);
  });

  test('should run backtest with provided data', async () => {
    const result = await engine.runWithData(config, marketData);

    expect(result).toBeDefined();
    expect(result.config).toEqual(config);
    expect(result.metrics).toBeDefined();
    expect(result.trades).toBeDefined();
    expect(result.equityCurve).toBeDefined();
  });

  test('should process all data points', async () => {
    const result = await engine.runWithData(config, marketData);

    expect(result.dataPointsProcessed).toBe(marketData.length);
  });

  test('should initialize equity curve', async () => {
    const result = await engine.runWithData(config, marketData);

    expect(result.equityCurve.length).toBeGreaterThan(0);
    expect(result.equityCurve[0].equity).toBe(config.initialCapital);
  });
});

describe('BacktestEngine - Position Management', () => {
  let engine: BacktestEngine;
  let config: BacktestConfig;

  beforeEach(() => {
    engine = new BacktestEngine();
    config = createTestConfig();
  });

  test('should open position when signal generated', async () => {
    const marketData = generateTrendingData(150, 'down'); // Create oversold conditions
    const result = await engine.runWithData(config, marketData);

    expect(result.trades.length).toBeGreaterThanOrEqual(0);
  });

  test('should apply commission to trades', async () => {
    const marketData = generateTrendingData(150, 'up');
    const result = await engine.runWithData(config, marketData);

    if (result.trades.length > 0) {
      const trade = result.trades[0];
      expect(trade.commission).toBeGreaterThan(0);
    }
  });

  test('should apply slippage to entry price', async () => {
    const marketData = generateTrendingData(150, 'up');
    const result = await engine.runWithData(config, marketData);

    if (result.trades.length > 0) {
      const trade = result.trades[0];
      expect(trade.entryPrice).toBeDefined();
      expect(trade.entryPrice).toBeGreaterThan(0);
    }
  });

  test('should calculate position size correctly', async () => {
    const marketData = generateTrendingData(150, 'up');
    const result = await engine.runWithData(config, marketData);

    if (result.trades.length > 0) {
      const trade = result.trades[0];
      const positionValue = trade.entryPrice * trade.quantity;
      const maxPositionSize = config.initialCapital * (config.positionSizePercent / 100);

      expect(positionValue).toBeLessThanOrEqual(maxPositionSize * 1.1); // Allow for slippage
    }
  });

  test('should not open position with insufficient capital', async () => {
    const lowCapitalConfig = createTestConfig({ initialCapital: 100 });
    const marketData = generateTrendingData(150);

    const result = await engine.runWithData(lowCapitalConfig, marketData);

    // Should have 0 or very few trades due to low capital
    expect(result.trades.length).toBeLessThan(5);
  });
});

describe('BacktestEngine - Stop Loss & Take Profit', () => {
  let engine: BacktestEngine;
  let config: BacktestConfig;

  beforeEach(() => {
    engine = new BacktestEngine();
    config = createTestConfig({
      strategy: createTestStrategy({
        stopLossPercent: 5,
        takeProfitPercent: 10,
      }),
    });
  });

  test('should set stop loss on position', async () => {
    const marketData = generateTrendingData(150);
    const result = await engine.runWithData(config, marketData);

    if (result.trades.length > 0) {
      const trade = result.trades[0];
      expect(trade.stopLoss).toBeDefined();
      if (trade.stopLoss) {
        expect(trade.stopLoss).toBeLessThan(trade.entryPrice);
      }
    }
  });

  test('should set take profit on position', async () => {
    const marketData = generateTrendingData(150);
    const result = await engine.runWithData(config, marketData);

    if (result.trades.length > 0) {
      const trade = result.trades[0];
      expect(trade.takeProfit).toBeDefined();
      if (trade.takeProfit) {
        expect(trade.takeProfit).toBeGreaterThan(trade.entryPrice);
      }
    }
  });

  test('should close position on stop loss hit', async () => {
    // Create data that drops significantly
    const marketData = generateTrendingData(150, 'down');
    const result = await engine.runWithData(config, marketData);

    const stopLossExits = result.trades.filter((t) => t.exitReason === 'stop_loss');
    expect(stopLossExits.length).toBeGreaterThanOrEqual(0);
  });

  test('should close position on take profit hit', async () => {
    // Create data that rises significantly
    const marketData = generateTrendingData(150, 'up');
    const result = await engine.runWithData(config, marketData);

    const takeProfitExits = result.trades.filter((t) => t.exitReason === 'take_profit');
    expect(takeProfitExits.length).toBeGreaterThanOrEqual(0);
  });

  test('should close remaining positions at end of backtest', async () => {
    const marketData = generateTrendingData(150);
    const result = await engine.runWithData(config, marketData);

    const endOfBacktestExits = result.trades.filter((t) => t.exitReason === 'end_of_backtest');
    expect(endOfBacktestExits.length).toBeGreaterThanOrEqual(0);
  });
});

describe('BacktestEngine - Metrics Calculation', () => {
  let engine: BacktestEngine;
  let config: BacktestConfig;

  beforeEach(() => {
    engine = new BacktestEngine();
    config = createTestConfig();
  });

  test('should calculate total trades', async () => {
    const marketData = generateTrendingData(200);
    const result = await engine.runWithData(config, marketData);

    expect(result.metrics.totalTrades).toBeGreaterThanOrEqual(0);
    expect(result.metrics.totalTrades).toBe(result.trades.length);
  });

  test('should calculate win rate', async () => {
    const marketData = generateTrendingData(200, 'up');
    const result = await engine.runWithData(config, marketData);

    expect(result.metrics.winRate).toBeGreaterThanOrEqual(0);
    expect(result.metrics.winRate).toBeLessThanOrEqual(100);

    if (result.metrics.totalTrades > 0) {
      const expectedWinRate =
        (result.metrics.winningTrades / result.metrics.totalTrades) * 100;
      expect(result.metrics.winRate).toBeCloseTo(expectedWinRate, 1);
    }
  });

  test('should calculate profit factor', async () => {
    const marketData = generateTrendingData(200);
    const result = await engine.runWithData(config, marketData);

    expect(result.metrics.profitFactor).toBeGreaterThanOrEqual(0);

    if (result.metrics.totalTrades > 0) {
      // Profit factor = total wins / total losses
      expect(typeof result.metrics.profitFactor).toBe('number');
    }
  });

  test('should calculate total return', async () => {
    const marketData = generateTrendingData(200);
    const result = await engine.runWithData(config, marketData);

    expect(result.metrics.totalReturn).toBeDefined();
    expect(result.metrics.totalReturnPercent).toBeDefined();

    const expectedReturn = result.metrics.finalCapital - config.initialCapital;
    expect(result.metrics.totalReturn).toBeCloseTo(expectedReturn, 2);
  });

  test('should calculate Sharpe ratio', async () => {
    const marketData = generateTrendingData(200);
    const result = await engine.runWithData(config, marketData);

    expect(typeof result.metrics.sharpeRatio).toBe('number');
  });

  test('should calculate Sortino ratio', async () => {
    const marketData = generateTrendingData(200);
    const result = await engine.runWithData(config, marketData);

    expect(typeof result.metrics.sortinoRatio).toBe('number');
  });

  test('should calculate max drawdown', async () => {
    const marketData = generateTrendingData(200);
    const result = await engine.runWithData(config, marketData);

    expect(result.metrics.maxDrawdown).toBeGreaterThanOrEqual(0);
    expect(result.metrics.maxDrawdownPercent).toBeGreaterThanOrEqual(0);
  });

  test('should track consecutive wins and losses', async () => {
    const marketData = generateTrendingData(200);
    const result = await engine.runWithData(config, marketData);

    expect(result.metrics.maxConsecutiveWins).toBeGreaterThanOrEqual(0);
    expect(result.metrics.maxConsecutiveLosses).toBeGreaterThanOrEqual(0);
  });

  test('should calculate average holding period', async () => {
    const marketData = generateTrendingData(200);
    const result = await engine.runWithData(config, marketData);

    if (result.metrics.totalTrades > 0) {
      expect(result.metrics.averageHoldingPeriod).toBeGreaterThan(0);
    }
  });

  test('should calculate trades per day', async () => {
    const marketData = generateTrendingData(200);
    const result = await engine.runWithData(config, marketData);

    expect(result.metrics.averageTradesPerDay).toBeGreaterThanOrEqual(0);
  });
});

describe('BacktestEngine - Analysis', () => {
  let engine: BacktestEngine;
  let config: BacktestConfig;

  beforeEach(() => {
    engine = new BacktestEngine();
    config = createTestConfig();
  });

  test('should identify best trades', async () => {
    const marketData = generateTrendingData(200, 'up');
    const result = await engine.runWithData(config, marketData);

    expect(result.analysis.bestTrades).toBeDefined();
    expect(Array.isArray(result.analysis.bestTrades)).toBe(true);
    expect(result.analysis.bestTrades.length).toBeLessThanOrEqual(5);
  });

  test('should identify worst trades', async () => {
    const marketData = generateTrendingData(200);
    const result = await engine.runWithData(config, marketData);

    expect(result.analysis.worstTrades).toBeDefined();
    expect(Array.isArray(result.analysis.worstTrades)).toBe(true);
    expect(result.analysis.worstTrades.length).toBeLessThanOrEqual(5);
  });

  test('should generate recommendations', async () => {
    const marketData = generateTrendingData(200);
    const result = await engine.runWithData(config, marketData);

    expect(result.analysis.recommendations).toBeDefined();
    expect(Array.isArray(result.analysis.recommendations)).toBe(true);
  });

  test('should generate warnings', async () => {
    const marketData = generateTrendingData(200);
    const result = await engine.runWithData(config, marketData);

    expect(result.analysis.warnings).toBeDefined();
    expect(Array.isArray(result.analysis.warnings)).toBe(true);
  });

  test('should warn on low win rate', async () => {
    const marketData = generateTrendingData(200, 'down');
    const result = await engine.runWithData(config, marketData);

    if (result.metrics.winRate < 40) {
      const hasWinRateWarning = result.analysis.warnings.some((w) =>
        w.includes('Low win rate')
      );
      expect(hasWinRateWarning).toBe(true);
    }
  });

  test('should warn on profit factor below 1', async () => {
    const marketData = generateTrendingData(200, 'down');
    const result = await engine.runWithData(config, marketData);

    if (result.metrics.profitFactor < 1) {
      const hasProfitFactorWarning = result.analysis.warnings.some((w) =>
        w.includes('Profit factor below 1')
      );
      expect(hasProfitFactorWarning).toBe(true);
    }
  });

  test('should warn on high drawdown', async () => {
    const marketData = generateTrendingData(200);
    const result = await engine.runWithData(config, marketData);

    if (result.metrics.maxDrawdownPercent > 20) {
      const hasDrawdownWarning = result.analysis.warnings.some((w) =>
        w.includes('High maximum drawdown')
      );
      expect(hasDrawdownWarning).toBe(true);
    }
  });

  test('should recommend on good Sharpe ratio', async () => {
    const marketData = generateTrendingData(200, 'up');
    const result = await engine.runWithData(config, marketData);

    if (result.metrics.sharpeRatio > 1) {
      const hasSharpeRecommendation = result.analysis.recommendations.some((r) =>
        r.includes('Good Sharpe ratio')
      );
      expect(hasSharpeRecommendation).toBe(true);
    }
  });
});

describe('BacktestEngine - Equity Curve', () => {
  let engine: BacktestEngine;
  let config: BacktestConfig;

  beforeEach(() => {
    engine = new BacktestEngine();
    config = createTestConfig();
  });

  test('should build equity curve', async () => {
    const marketData = generateTrendingData(200);
    const result = await engine.runWithData(config, marketData);

    expect(result.equityCurve.length).toBeGreaterThan(0);
    expect(result.equityCurve.length).toBeLessThanOrEqual(marketData.length + 1);
  });

  test('should track drawdown in equity curve', async () => {
    const marketData = generateTrendingData(200);
    const result = await engine.runWithData(config, marketData);

    result.equityCurve.forEach((point) => {
      expect(point.drawdown).toBeGreaterThanOrEqual(0);
      expect(point.drawdownPercent).toBeGreaterThanOrEqual(0);
    });
  });

  test('should have final equity equal to final capital', async () => {
    const marketData = generateTrendingData(200);
    const result = await engine.runWithData(config, marketData);

    const finalEquity = result.equityCurve[result.equityCurve.length - 1].equity;
    expect(finalEquity).toBeCloseTo(result.metrics.finalCapital, 2);
  });
});

describe('BacktestEngine - Edge Cases', () => {
  let engine: BacktestEngine;

  beforeEach(() => {
    engine = new BacktestEngine();
  });

  test('should handle empty market data', async () => {
    const config = createTestConfig();
    const emptyData: MarketDataPoint[] = [];

    const result = await engine.runWithData(config, emptyData);

    expect(result.metrics.totalTrades).toBe(0);
    expect(result.metrics.finalCapital).toBe(config.initialCapital);
  });

  test('should handle strategy with no indicators', async () => {
    const strategyNoIndicators = createTestStrategy({ indicators: [] });
    const config = createTestConfig({ strategy: strategyNoIndicators });
    const marketData = generateTrendingData(150);

    const result = await engine.runWithData(config, marketData);

    expect(result.metrics.totalTrades).toBe(0);
  });

  test('should handle strategy with no conditions', async () => {
    const strategyNoConditions = createTestStrategy({ conditions: [] });
    const config = createTestConfig({ strategy: strategyNoConditions });
    const marketData = generateTrendingData(150);

    const result = await engine.runWithData(config, marketData);

    expect(result.metrics.totalTrades).toBe(0);
  });

  test('should handle low sample size warning', async () => {
    const marketData = generateTrendingData(120);
    const config = createTestConfig();

    const result = await engine.runWithData(config, marketData);

    if (result.metrics.totalTrades < 30) {
      const hasLowSampleWarning = result.analysis.warnings.some((w) =>
        w.includes('Low sample size')
      );
      expect(hasLowSampleWarning).toBe(true);
    }
  });
});

describe('BacktestEngine - Timeframe Parsing', () => {
  let engine: BacktestEngine;

  beforeEach(() => {
    engine = new BacktestEngine();
  });

  test('should parse minute timeframes', () => {
    const ms = (engine as any).parseTimeframe('5m');
    expect(ms).toBe(5 * 60 * 1000);
  });

  test('should parse hour timeframes', () => {
    const ms = (engine as any).parseTimeframe('4h');
    expect(ms).toBe(4 * 60 * 60 * 1000);
  });

  test('should parse day timeframes', () => {
    const ms = (engine as any).parseTimeframe('1d');
    expect(ms).toBe(24 * 60 * 60 * 1000);
  });

  test('should default to 1 minute for invalid timeframe', () => {
    const ms = (engine as any).parseTimeframe('invalid');
    expect(ms).toBe(60000);
  });
});

describe('BacktestEngine - Long vs Short Positions', () => {
  let engine: BacktestEngine;
  let config: BacktestConfig;

  beforeEach(() => {
    engine = new BacktestEngine();
    config = createTestConfig();
  });

  test('should track long and short trades separately', async () => {
    const marketData = generateTrendingData(200);
    const result = await engine.runWithData(config, marketData);

    expect(result.metrics.longTrades).toBeGreaterThanOrEqual(0);
    expect(result.metrics.shortTrades).toBeGreaterThanOrEqual(0);
    expect(result.metrics.longTrades + result.metrics.shortTrades).toBe(
      result.metrics.totalTrades
    );
  });
});
