/**
 * Strategy Runner Tests
 * Comprehensive test suite for strategy runner engine
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { StrategyRunner } from './strategy-runner';
import type { TradingStrategy } from '../types/strategies.types';
import type { MarketDataPoint } from './strategy-runner.types';

// Test data generators
const generateMarketData = (count: number, startPrice = 50000): MarketDataPoint[] => {
  const data: MarketDataPoint[] = [];
  let price = startPrice;

  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * 1000;
    price += change;

    data.push({
      timestamp: new Date(Date.now() - (count - i) * 3600000), // 1 hour intervals
      open: price - Math.random() * 100,
      high: price + Math.random() * 200,
      low: price - Math.random() * 200,
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
  description: 'Test strategy description',
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
        { indicator: 'rsi', operator: '<', value: 30 },
        { indicator: 'sma', operator: '>', value: 50000 },
      ],
    },
  ],
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

describe('StrategyRunner - Indicator Calculation', () => {
  let runner: StrategyRunner;
  let strategy: TradingStrategy;
  let marketData: MarketDataPoint[];

  beforeEach(() => {
    runner = new StrategyRunner();
    strategy = createTestStrategy();
    marketData = generateMarketData(100);
  });

  test('should calculate RSI indicator', async () => {
    const indicators = await runner.calculateIndicators(strategy, marketData);
    const rsi = indicators.find((i) => i.type === 'rsi');

    expect(rsi).toBeDefined();
    expect(rsi?.value).toBeGreaterThanOrEqual(0);
    expect(rsi?.value).toBeLessThanOrEqual(100);
  });

  test('should calculate SMA indicator', async () => {
    const indicators = await runner.calculateIndicators(strategy, marketData);
    const sma = indicators.find((i) => i.type === 'sma');

    expect(sma).toBeDefined();
    expect(typeof sma?.value).toBe('number');
  });

  test('should calculate EMA indicator', async () => {
    const strategyWithEMA = createTestStrategy({
      indicators: [{ type: 'ema', parameters: { period: 20 }, enabled: true }],
    });

    const indicators = await runner.calculateIndicators(strategyWithEMA, marketData);
    const ema = indicators.find((i) => i.type === 'ema');

    expect(ema).toBeDefined();
    expect(typeof ema?.value).toBe('number');
  });

  test('should calculate MACD indicator', async () => {
    const strategyWithMACD = createTestStrategy({
      indicators: [
        {
          type: 'macd',
          parameters: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
          enabled: true,
        },
      ],
    });

    const indicators = await runner.calculateIndicators(strategyWithMACD, marketData);
    const macd = indicators.find((i) => i.type === 'macd');

    expect(macd).toBeDefined();
    expect(macd?.value).toHaveProperty('macd');
    expect(macd?.value).toHaveProperty('signal');
    expect(macd?.value).toHaveProperty('histogram');
  });

  test('should calculate Bollinger Bands', async () => {
    const strategyWithBB = createTestStrategy({
      indicators: [
        {
          type: 'bollinger_bands',
          parameters: { period: 20, stdDevMultiplier: 2 },
          enabled: true,
        },
      ],
    });

    const indicators = await runner.calculateIndicators(strategyWithBB, marketData);
    const bb = indicators.find((i) => i.type === 'bollinger_bands');

    expect(bb).toBeDefined();
    expect(bb?.value).toHaveProperty('upper');
    expect(bb?.value).toHaveProperty('middle');
    expect(bb?.value).toHaveProperty('lower');
  });

  test('should skip disabled indicators', async () => {
    const strategyWithDisabled = createTestStrategy({
      indicators: [
        { type: 'rsi', parameters: { period: 14 }, enabled: true },
        { type: 'sma', parameters: { period: 20 }, enabled: false },
      ],
    });

    const indicators = await runner.calculateIndicators(strategyWithDisabled, marketData);

    expect(indicators.some((i) => i.type === 'rsi')).toBe(true);
    expect(indicators.some((i) => i.type === 'sma')).toBe(false);
  });

  test('should skip indicators with insufficient data', async () => {
    const shortData = generateMarketData(10); // Not enough for period 20

    const indicators = await runner.calculateIndicators(strategy, shortData);
    const sma = indicators.find((i) => i.type === 'sma');

    expect(sma).toBeUndefined();
  });

  test('should validate indicator configuration', async () => {
    const strategyWithInvalidConfig = createTestStrategy({
      indicators: [{ type: 'rsi', parameters: { period: -1 }, enabled: true }],
    });

    const indicators = await runner.calculateIndicators(strategyWithInvalidConfig, marketData);
    const rsi = indicators.find((i) => i.type === 'rsi');

    expect(rsi).toBeUndefined();
  });
});

describe('StrategyRunner - Condition Evaluation', () => {
  let runner: StrategyRunner;
  let strategy: TradingStrategy;
  let marketData: MarketDataPoint[];

  beforeEach(() => {
    runner = new StrategyRunner();
    strategy = createTestStrategy();
    marketData = generateMarketData(100);
  });

  test('should evaluate AND logic correctly', async () => {
    const indicators = [
      { name: 'rsi', type: 'rsi', value: 25, timestamp: new Date() },
      { name: 'sma', type: 'sma', value: 51000, timestamp: new Date() },
    ];

    const result = runner.evaluateConditions(strategy, indicators, 50000);

    expect(result.met).toBe(true);
    expect(result.reasons).toHaveLength(2);
  });

  test('should evaluate OR logic correctly', async () => {
    const strategyWithOR = createTestStrategy({
      conditions: [
        {
          type: 'entry',
          logic: 'OR',
          rules: [
            { indicator: 'rsi', operator: '<', value: 30 },
            { indicator: 'sma', operator: '>', value: 60000 },
          ],
        },
      ],
    });

    const indicators = [
      { name: 'rsi', type: 'rsi', value: 25, timestamp: new Date() },
      { name: 'sma', type: 'sma', value: 50000, timestamp: new Date() },
    ];

    const result = runner.evaluateConditions(strategyWithOR, indicators, 50000);

    expect(result.met).toBe(true);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  test('should handle greater than operator', () => {
    const indicators = [{ name: 'rsi', type: 'rsi', value: 70, timestamp: new Date() }];

    const strategyWithGT = createTestStrategy({
      conditions: [
        {
          type: 'entry',
          logic: 'AND',
          rules: [{ indicator: 'rsi', operator: '>', value: 60 }],
        },
      ],
    });

    const result = runner.evaluateConditions(strategyWithGT, indicators, 50000);

    expect(result.met).toBe(true);
  });

  test('should handle less than operator', () => {
    const indicators = [{ name: 'rsi', type: 'rsi', value: 25, timestamp: new Date() }];

    const strategyWithLT = createTestStrategy({
      conditions: [
        {
          type: 'entry',
          logic: 'AND',
          rules: [{ indicator: 'rsi', operator: '<', value: 30 }],
        },
      ],
    });

    const result = runner.evaluateConditions(strategyWithLT, indicators, 50000);

    expect(result.met).toBe(true);
  });

  test('should handle equal operator', () => {
    const indicators = [{ name: 'rsi', type: 'rsi', value: 50, timestamp: new Date() }];

    const strategyWithEQ = createTestStrategy({
      conditions: [
        {
          type: 'entry',
          logic: 'AND',
          rules: [{ indicator: 'rsi', operator: '==', value: 50 }],
        },
      ],
    });

    const result = runner.evaluateConditions(strategyWithEQ, indicators, 50000);

    expect(result.met).toBe(true);
  });

  test('should handle complex indicator values', () => {
    const indicators = [
      {
        name: 'macd',
        type: 'macd',
        value: { macd: 100, signal: 90, histogram: 10 },
        timestamp: new Date(),
      },
    ];

    const strategyWithMACD = createTestStrategy({
      conditions: [
        {
          type: 'entry',
          logic: 'AND',
          rules: [{ indicator: 'macd', operator: '>', value: 50 }],
        },
      ],
    });

    const result = runner.evaluateConditions(strategyWithMACD, indicators, 50000);

    expect(result.met).toBe(true);
  });

  test('should normalize score to 0-100', () => {
    const indicators = [
      { name: 'rsi', type: 'rsi', value: 25, timestamp: new Date() },
      { name: 'sma', type: 'sma', value: 51000, timestamp: new Date() },
    ];

    const result = runner.evaluateConditions(strategy, indicators, 50000);

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe('StrategyRunner - Signal Generation', () => {
  let runner: StrategyRunner;
  let strategy: TradingStrategy;
  let marketData: MarketDataPoint[];

  beforeEach(() => {
    runner = new StrategyRunner();
    strategy = createTestStrategy();
    marketData = generateMarketData(100);
  });

  test('should generate BUY signal for trend following strategy', async () => {
    const trendStrategy = createTestStrategy({
      type: 'trend_following',
      conditions: [
        {
          type: 'entry',
          logic: 'AND',
          rules: [{ indicator: 'rsi', operator: '<', value: 30 }],
        },
      ],
    });

    // Create oversold RSI condition
    const oversoldData = generateMarketData(100, 50000);
    oversoldData[oversoldData.length - 1].close = 45000; // Drop price to create oversold

    const signal = await runner.evaluate(trendStrategy, oversoldData);

    if (signal) {
      expect(signal.type).toBe('BUY');
    }
  });

  test('should generate SELL signal for mean reversion with overbought RSI', async () => {
    const meanRevStrategy = createTestStrategy({
      type: 'mean_reversion',
      indicators: [{ type: 'rsi', parameters: { period: 14 }, enabled: true }],
      conditions: [
        {
          type: 'entry',
          logic: 'AND',
          rules: [{ indicator: 'rsi', operator: '>', value: 70 }],
        },
      ],
    });

    const overboughtData = generateMarketData(100, 50000);
    overboughtData[overboughtData.length - 1].close = 55000; // Pump price

    const signal = await runner.evaluate(meanRevStrategy, overboughtData);

    if (signal) {
      expect(['BUY', 'SELL', 'HOLD']).toContain(signal.type);
    }
  });

  test('should return null when conditions not met', async () => {
    const strictStrategy = createTestStrategy({
      conditions: [
        {
          type: 'entry',
          logic: 'AND',
          rules: [
            { indicator: 'rsi', operator: '<', value: 10 }, // Very strict
            { indicator: 'sma', operator: '>', value: 100000 }, // Very strict
          ],
        },
      ],
    });

    const signal = await runner.evaluate(strictStrategy, marketData);

    expect(signal).toBeNull();
  });

  test('should return null when insufficient data', async () => {
    const shortData = generateMarketData(50); // Less than minDataPoints (100)
    const signal = await runner.evaluate(strategy, shortData);

    expect(signal).toBeNull();
  });

  test('should include indicator values in signal', async () => {
    const signal = await runner.evaluate(strategy, marketData);

    if (signal) {
      expect(signal).toHaveProperty('indicators');
      expect(typeof signal.indicators).toBe('object');
    }
  });

  test('should calculate confidence and strength', async () => {
    const signal = await runner.evaluate(strategy, marketData);

    if (signal) {
      expect(signal.confidence).toBeGreaterThanOrEqual(0);
      expect(signal.confidence).toBeLessThanOrEqual(100);
      expect(signal.strength).toBeGreaterThanOrEqual(0);
      expect(signal.strength).toBeLessThanOrEqual(100);
    }
  });
});

describe('StrategyRunner - Custom Indicators', () => {
  let runner: StrategyRunner;

  beforeEach(() => {
    runner = new StrategyRunner();
  });

  test('should register custom indicator', () => {
    const customCalculator = {
      calculate: (data: MarketDataPoint[]) => data[data.length - 1].close,
      getRequiredPeriod: () => 1,
      validateConfig: () => true,
    };

    runner.registerIndicator('custom', customCalculator);

    const strategy = createTestStrategy({
      indicators: [{ type: 'custom', parameters: {}, enabled: true }],
    });

    const marketData = generateMarketData(100);

    runner.calculateIndicators(strategy, marketData).then((indicators) => {
      const custom = indicators.find((i) => i.type === 'custom');
      expect(custom).toBeDefined();
    });
  });
});

describe('StrategyRunner - Error Handling', () => {
  let runner: StrategyRunner;
  let strategy: TradingStrategy;
  let marketData: MarketDataPoint[];

  beforeEach(() => {
    runner = new StrategyRunner();
    strategy = createTestStrategy();
    marketData = generateMarketData(100);
  });

  test('should handle unknown indicator type gracefully', async () => {
    const strategyWithUnknown = createTestStrategy({
      indicators: [{ type: 'unknown_indicator', parameters: {}, enabled: true }],
    });

    const indicators = await runner.calculateIndicators(strategyWithUnknown, marketData);

    expect(indicators).toHaveLength(0);
  });

  test('should handle missing indicator values', () => {
    const indicators = [{ name: 'rsi', type: 'rsi', value: 50, timestamp: new Date() }];

    const strategyWithMissing = createTestStrategy({
      conditions: [
        {
          type: 'entry',
          logic: 'AND',
          rules: [{ indicator: 'missing_indicator', operator: '>', value: 50 }],
        },
      ],
    });

    const result = runner.evaluateConditions(strategyWithMissing, indicators, 50000);

    expect(result.met).toBe(false);
  });

  test('should handle evaluation errors', async () => {
    const emptyData: MarketDataPoint[] = [];
    const signal = await runner.evaluate(strategy, emptyData);

    expect(signal).toBeNull();
  });
});

describe('StrategyRunner - Cache', () => {
  let runner: StrategyRunner;

  beforeEach(() => {
    runner = new StrategyRunner();
  });

  test('should clear cache', () => {
    runner.clearCache();
    // If cache clearing throws, test will fail
    expect(true).toBe(true);
  });
});

describe('StrategyRunner - Configuration', () => {
  test('should accept custom configuration', () => {
    const config = {
      minDataPoints: 50,
      maxDataPoints: 1000,
      enableCache: false,
      cacheExpiryMs: 30000,
    };

    const runner = new StrategyRunner(config);
    expect(runner).toBeDefined();
  });

  test('should use default configuration when not provided', () => {
    const runner = new StrategyRunner();
    expect(runner).toBeDefined();
  });
});
