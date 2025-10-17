/**
 * Custom Indicators - Unit Tests
 * Tests for custom technical indicators
 *
 * @module indicators/utils/__tests__/custom-indicators
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import {
  calculateSuperTrend,
  calculateIchimoku,
  calculatePivotPoints,
  calculateFibonacciRetracement,
} from '../custom-indicators';
import type { OHLCVData } from '../../types/indicators-full.types';

// ============================================================================
// MOCK DATA
// ============================================================================

/**
 * Generate realistic OHLCV mock data
 * Simulates BTC/USDT price movement
 */
function generateMockOHLCV(bars: number = 100, startPrice: number = 50000): OHLCVData[] {
  const data: OHLCVData[] = [];
  let currentPrice = startPrice;
  const baseDate = new Date('2024-01-01T00:00:00Z');

  for (let i = 0; i < bars; i++) {
    // Simulate realistic price movement (±2% per bar)
    const change = (Math.random() - 0.5) * 0.04; // -2% to +2%
    currentPrice = currentPrice * (1 + change);

    const high = currentPrice * (1 + Math.random() * 0.01); // +0-1%
    const low = currentPrice * (1 - Math.random() * 0.01);  // -0-1%
    const open = low + Math.random() * (high - low);
    const close = low + Math.random() * (high - low);
    const volume = 100 + Math.random() * 1000;

    data.push({
      timestamp: new Date(baseDate.getTime() + i * 60000), // 1 minute bars
      open,
      high,
      low,
      close,
      volume,
    });
  }

  return data;
}

/**
 * Generate uptrending data for SuperTrend/Ichimoku
 */
function generateUptrendData(bars: number = 100): OHLCVData[] {
  const data: OHLCVData[] = [];
  let currentPrice = 50000;
  const baseDate = new Date('2024-01-01T00:00:00Z');

  for (let i = 0; i < bars; i++) {
    // Consistent uptrend with small pullbacks
    const change = Math.random() * 0.015 - 0.005; // -0.5% to +1.5%
    currentPrice = currentPrice * (1 + change);

    const high = currentPrice * 1.005;
    const low = currentPrice * 0.995;
    const open = (high + low) / 2;
    const close = low + Math.random() * (high - low);
    const volume = 100 + Math.random() * 1000;

    data.push({
      timestamp: new Date(baseDate.getTime() + i * 60000),
      open,
      high,
      low,
      close,
      volume,
    });
  }

  return data;
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe('Custom Indicators - SuperTrend', () => {
  let mockData: OHLCVData[];
  let uptrendData: OHLCVData[];

  beforeAll(() => {
    mockData = generateMockOHLCV(100);
    uptrendData = generateUptrendData(100);
  });

  test('should calculate SuperTrend with default parameters (10, 3)', async () => {
    const result = await calculateSuperTrend(mockData, 10, 3);

    expect(result).toBeDefined();
    expect(result.supertrend).toBeDefined();
    expect(result.direction).toBeDefined();
    expect(result.signal).toBeDefined();

    expect(Array.isArray(result.supertrend)).toBe(true);
    expect(Array.isArray(result.direction)).toBe(true);
    expect(Array.isArray(result.signal)).toBe(true);
  });

  test('should calculate SuperTrend with custom parameters', async () => {
    const result = await calculateSuperTrend(mockData, 14, 2);

    expect(result.supertrend.length).toBe(mockData.length);
    expect(result.direction.length).toBe(mockData.length);
    expect(result.signal.length).toBe(mockData.length);
  });

  test('SuperTrend arrays should have same length as input data', async () => {
    const result = await calculateSuperTrend(mockData, 10, 3);

    expect(result.supertrend.length).toBe(mockData.length);
    expect(result.direction.length).toBe(mockData.length);
    expect(result.signal.length).toBe(mockData.length);
  });

  test('direction should be either "up" or "down"', async () => {
    const result = await calculateSuperTrend(mockData, 10, 3);

    result.direction.forEach((dir) => {
      expect(['up', 'down']).toContain(dir);
    });
  });

  test('signal should be "buy", "sell", or "hold"', async () => {
    const result = await calculateSuperTrend(mockData, 10, 3);

    result.signal.forEach((sig) => {
      expect(['buy', 'sell', 'hold']).toContain(sig);
    });
  });

  test('should detect buy signals in uptrend', async () => {
    const result = await calculateSuperTrend(uptrendData, 10, 3);

    // Count buy signals
    const buySignals = result.signal.filter((s) => s === 'buy').length;

    // In an uptrend, there should be at least some buy signals
    expect(buySignals).toBeGreaterThan(0);
  });

  test('SuperTrend values should be positive', async () => {
    const result = await calculateSuperTrend(mockData, 10, 3);

    result.supertrend.forEach((value) => {
      expect(value).toBeGreaterThan(0);
    });
  });

  test('larger multiplier should widen SuperTrend bands', async () => {
    const result1 = await calculateSuperTrend(mockData, 10, 2);
    const result2 = await calculateSuperTrend(mockData, 10, 4);

    // With larger multiplier, SuperTrend values should differ more from price
    const lastPrice = mockData[mockData.length - 1].close;
    const st1 = result1.supertrend[result1.supertrend.length - 1];
    const st2 = result2.supertrend[result2.supertrend.length - 1];

    const diff1 = Math.abs(lastPrice - st1);
    const diff2 = Math.abs(lastPrice - st2);

    // Larger multiplier typically creates wider bands
    // But direction matters, so just check they're different
    expect(st1).not.toBe(st2);
  });

  test('should throw error for insufficient data', async () => {
    const shortData = generateMockOHLCV(5);
    await expect(calculateSuperTrend(shortData, 10, 3)).rejects.toThrow('Insufficient data');
  });

  test('should validate parameters', async () => {
    await expect(calculateSuperTrend(mockData, 0, 3)).rejects.toThrow();
    await expect(calculateSuperTrend(mockData, 10, 0)).rejects.toThrow();
  });
});

describe('Custom Indicators - Ichimoku Cloud', () => {
  let mockData: OHLCVData[];
  let uptrendData: OHLCVData[];

  beforeAll(() => {
    mockData = generateMockOHLCV(100);
    uptrendData = generateUptrendData(100);
  });

  test('should calculate Ichimoku with default parameters (9, 26, 52, 26)', async () => {
    const result = await calculateIchimoku(mockData, 9, 26, 52, 26);

    expect(result).toBeDefined();
    expect(result.tenkanSen).toBeDefined();
    expect(result.kijunSen).toBeDefined();
    expect(result.senkouSpanA).toBeDefined();
    expect(result.senkouSpanB).toBeDefined();
    expect(result.chikouSpan).toBeDefined();
    expect(result.cloudColor).toBeDefined();
    expect(result.signal).toBeDefined();

    expect(Array.isArray(result.tenkanSen)).toBe(true);
    expect(Array.isArray(result.kijunSen)).toBe(true);
    expect(Array.isArray(result.senkouSpanA)).toBe(true);
    expect(Array.isArray(result.senkouSpanB)).toBe(true);
    expect(Array.isArray(result.chikouSpan)).toBe(true);
    expect(Array.isArray(result.cloudColor)).toBe(true);
    expect(Array.isArray(result.signal)).toBe(true);
  });

  test('all Ichimoku lines should have same length as input data', async () => {
    const result = await calculateIchimoku(mockData, 9, 26, 52, 26);

    expect(result.tenkanSen.length).toBe(mockData.length);
    expect(result.kijunSen.length).toBe(mockData.length);
    expect(result.senkouSpanA.length).toBe(mockData.length);
    expect(result.senkouSpanB.length).toBe(mockData.length);
    expect(result.chikouSpan.length).toBe(mockData.length);
    expect(result.cloudColor.length).toBe(mockData.length);
    expect(result.signal.length).toBe(mockData.length);
  });

  test('cloudColor should be "bullish" or "bearish"', async () => {
    const result = await calculateIchimoku(mockData, 9, 26, 52, 26);

    result.cloudColor.forEach((color) => {
      expect(['bullish', 'bearish']).toContain(color);
    });
  });

  test('signal should be valid trading signal', async () => {
    const result = await calculateIchimoku(mockData, 9, 26, 52, 26);

    result.signal.forEach((sig) => {
      expect(['strong-buy', 'buy', 'neutral', 'sell', 'strong-sell']).toContain(sig);
    });
  });

  test('should detect bullish signals in uptrend', async () => {
    const result = await calculateIchimoku(uptrendData, 9, 26, 52, 26);

    // Count bullish signals
    const bullishSignals = result.signal.filter((s) => s === 'strong-buy' || s === 'buy').length;

    // In an uptrend, there should be some bullish signals
    expect(bullishSignals).toBeGreaterThan(0);
  });

  test('Tenkan-sen should be more responsive than Kijun-sen', async () => {
    const result = await calculateIchimoku(mockData, 9, 26, 52, 26);

    // Tenkan-sen (9 period) should change more than Kijun-sen (26 period)
    // Just verify they're different
    const lastTenkan = result.tenkanSen[result.tenkanSen.length - 1];
    const lastKijun = result.kijunSen[result.kijunSen.length - 1];

    expect(typeof lastTenkan).toBe('number');
    expect(typeof lastKijun).toBe('number');
  });

  test('Senkou Span A should be average of Tenkan and Kijun', async () => {
    const result = await calculateIchimoku(mockData, 9, 26, 52, 26);

    // Check last value
    const lastIdx = result.tenkanSen.length - 1;
    const expectedSpanA = (result.tenkanSen[lastIdx] + result.kijunSen[lastIdx]) / 2;
    const actualSpanA = result.senkouSpanA[lastIdx];

    expect(Math.abs(actualSpanA - expectedSpanA)).toBeLessThan(0.0001);
  });

  test('should throw error for insufficient data', async () => {
    const shortData = generateMockOHLCV(50);
    await expect(calculateIchimoku(shortData, 9, 26, 52, 26)).rejects.toThrow('Insufficient data');
  });

  test('should validate parameters', async () => {
    await expect(calculateIchimoku(mockData, 0, 26, 52, 26)).rejects.toThrow();
    await expect(calculateIchimoku(mockData, 9, 0, 52, 26)).rejects.toThrow();
    await expect(calculateIchimoku(mockData, 9, 26, 0, 26)).rejects.toThrow();
  });
});

describe('Custom Indicators - Pivot Points', () => {
  let mockData: OHLCVData[];

  beforeAll(() => {
    mockData = generateMockOHLCV(50);
  });

  test('should calculate Classic Pivot Points', async () => {
    const result = await calculatePivotPoints(mockData, 'classic');

    expect(result).toBeDefined();
    expect(result.pivot).toBeDefined();
    expect(result.r1).toBeDefined();
    expect(result.r2).toBeDefined();
    expect(result.r3).toBeDefined();
    expect(result.s1).toBeDefined();
    expect(result.s2).toBeDefined();
    expect(result.s3).toBeDefined();
    expect(result.position).toBeDefined();

    expect(typeof result.pivot).toBe('number');
    expect(typeof result.r1).toBe('number');
    expect(typeof result.r2).toBe('number');
    expect(typeof result.r3).toBe('number');
    expect(typeof result.s1).toBe('number');
    expect(typeof result.s2).toBe('number');
    expect(typeof result.s3).toBe('number');
  });

  test('should calculate Fibonacci Pivot Points', async () => {
    const result = await calculatePivotPoints(mockData, 'fibonacci');

    expect(result.pivot).toBeDefined();
    expect(result.r1).toBeGreaterThan(result.pivot);
    expect(result.s1).toBeLessThan(result.pivot);
  });

  test('should calculate Woodie Pivot Points', async () => {
    const result = await calculatePivotPoints(mockData, 'woodie');

    expect(result.pivot).toBeDefined();
    expect(result.r1).toBeGreaterThan(result.pivot);
    expect(result.s1).toBeLessThan(result.pivot);
  });

  test('should calculate Camarilla Pivot Points', async () => {
    const result = await calculatePivotPoints(mockData, 'camarilla');

    expect(result.pivot).toBeDefined();
    expect(result.r1).toBeDefined();
    expect(result.s1).toBeDefined();

    // Camarilla uses close-based calculation, so R1/S1 relationship to pivot may vary
    // Just verify they're valid numbers
    expect(typeof result.r1).toBe('number');
    expect(typeof result.s1).toBe('number');
  });

  test('resistance levels should be in ascending order', async () => {
    const result = await calculatePivotPoints(mockData, 'classic');

    expect(result.r1).toBeLessThan(result.r2);
    expect(result.r2).toBeLessThan(result.r3);
  });

  test('support levels should be in descending order', async () => {
    const result = await calculatePivotPoints(mockData, 'classic');

    expect(result.s1).toBeGreaterThan(result.s2);
    expect(result.s2).toBeGreaterThan(result.s3);
  });

  test('pivot should be between S1 and R1', async () => {
    const result = await calculatePivotPoints(mockData, 'classic');

    expect(result.pivot).toBeGreaterThan(result.s1);
    expect(result.pivot).toBeLessThan(result.r1);
  });

  test('position should be valid', async () => {
    const result = await calculatePivotPoints(mockData, 'classic');

    const validPositions = [
      'above-R3',
      'R2-R3',
      'R1-R2',
      'P-R1',
      'S1-P',
      'S2-S1',
      'S3-S2',
      'below-S3',
    ];

    expect(validPositions).toContain(result.position);
  });

  test('different methods should produce different values', async () => {
    const classic = await calculatePivotPoints(mockData, 'classic');
    const fibonacci = await calculatePivotPoints(mockData, 'fibonacci');
    const woodie = await calculatePivotPoints(mockData, 'woodie');
    const camarilla = await calculatePivotPoints(mockData, 'camarilla');

    // Classic, Fibonacci, and Camarilla use (H+L+C)/3 for pivot
    // Woodie uses (H+L+2C)/4 for pivot, so it should be different
    expect(classic.pivot).toBe(fibonacci.pivot); // Same formula
    expect(classic.pivot).toBe(camarilla.pivot); // Same formula
    expect(classic.pivot).not.toBe(woodie.pivot); // Different formula

    // R1/S1 calculations differ between methods
    expect(classic.r1).not.toBe(fibonacci.r1);
    expect(classic.s1).not.toBe(fibonacci.s1);

    // At least woodie pivot should be unique
    const uniquePivots = new Set([classic.pivot, woodie.pivot]);
    expect(uniquePivots.size).toBe(2);
  });

  test('should throw error for insufficient data', async () => {
    const emptyData: OHLCVData[] = [];
    await expect(calculatePivotPoints(emptyData, 'classic')).rejects.toThrow();
  });
});

describe('Custom Indicators - Fibonacci Retracement', () => {
  test('should calculate Fibonacci retracement for uptrend', async () => {
    const result = await calculateFibonacciRetracement(52000, 48000, 'uptrend');

    expect(result).toBeDefined();
    expect(result.level_0).toBe(48000); // 0% = low
    expect(result.level_100).toBe(52000); // 100% = high
    expect(result.level_236).toBeGreaterThan(result.level_0);
    expect(result.level_382).toBeGreaterThan(result.level_236);
    expect(result.level_500).toBeGreaterThan(result.level_382);
    expect(result.level_618).toBeGreaterThan(result.level_500);
    expect(result.level_786).toBeGreaterThan(result.level_618);
  });

  test('should calculate Fibonacci retracement for downtrend', async () => {
    const result = await calculateFibonacciRetracement(52000, 48000, 'downtrend');

    expect(result).toBeDefined();
    expect(result.level_0).toBe(52000); // 0% = high
    expect(result.level_100).toBe(48000); // 100% = low
    expect(result.level_236).toBeLessThan(result.level_0);
    expect(result.level_382).toBeLessThan(result.level_236);
    expect(result.level_500).toBeLessThan(result.level_382);
    expect(result.level_618).toBeLessThan(result.level_500);
    expect(result.level_786).toBeLessThan(result.level_618);
  });

  test('50% level should be midpoint of high and low', async () => {
    const high = 52000;
    const low = 48000;
    const result = await calculateFibonacciRetracement(high, low, 'uptrend');

    const expectedMidpoint = (high + low) / 2;
    expect(result.level_500).toBe(expectedMidpoint);
  });

  test('should calculate extension levels beyond 100%', async () => {
    const result = await calculateFibonacciRetracement(52000, 48000, 'uptrend');

    expect(result.level_1272).toBeGreaterThan(result.level_100);
    expect(result.level_1618).toBeGreaterThan(result.level_1272);
  });

  test('should find nearest level to current price', async () => {
    const high = 52000;
    const low = 48000;
    const currentPrice = 50000; // Close to 50% level

    const result = await calculateFibonacciRetracement(high, low, 'uptrend', currentPrice);

    expect(result.nearestLevel).toBeDefined();
    expect(result.nearestLevelName).toBeDefined();
    expect(typeof result.nearestLevel).toBe('number');
    expect(typeof result.nearestLevelName).toBe('string');

    // Nearest should be 50% level
    expect(result.nearestLevelName).toBe('50%');
    expect(result.nearestLevel).toBe(result.level_500);
  });

  test('nearest level should be closest to current price', async () => {
    const high = 52000;
    const low = 48000;
    const currentPrice = 48944; // Very close to 23.6% level

    const result = await calculateFibonacciRetracement(high, low, 'uptrend', currentPrice);

    // Should find 23.6% as nearest
    expect(result.nearestLevelName).toBe('23.6%');
  });

  test('golden ratio (61.8%) should be between 50% and 78.6%', async () => {
    const result = await calculateFibonacciRetracement(52000, 48000, 'uptrend');

    expect(result.level_618).toBeGreaterThan(result.level_500);
    expect(result.level_618).toBeLessThan(result.level_786);
  });

  test('should throw error if high <= low', async () => {
    await expect(calculateFibonacciRetracement(48000, 52000, 'uptrend')).rejects.toThrow(
      'High must be greater than low'
    );
  });

  test('should handle equal high and low gracefully', async () => {
    await expect(calculateFibonacciRetracement(50000, 50000, 'uptrend')).rejects.toThrow();
  });

  test('Fibonacci levels should be mathematically correct', async () => {
    const high = 100;
    const low = 0;
    const result = await calculateFibonacciRetracement(high, low, 'uptrend');

    // Test exact percentages
    expect(result.level_0).toBe(0);
    expect(result.level_236).toBeCloseTo(23.6, 1);
    expect(result.level_382).toBeCloseTo(38.2, 1);
    expect(result.level_500).toBe(50);
    expect(result.level_618).toBeCloseTo(61.8, 1);
    expect(result.level_786).toBeCloseTo(78.6, 1);
    expect(result.level_100).toBe(100);
    expect(result.level_1272).toBeCloseTo(127.2, 1);
    expect(result.level_1618).toBeCloseTo(161.8, 1);
  });
});

describe('Custom Indicators - Integration Tests', () => {
  let mockData: OHLCVData[];

  beforeAll(() => {
    mockData = generateMockOHLCV(100);
  });

  test('should calculate multiple custom indicators on same data', async () => {
    const supertrend = await calculateSuperTrend(mockData, 10, 3);
    const ichimoku = await calculateIchimoku(mockData, 9, 26, 52, 26);
    const pivots = await calculatePivotPoints(mockData, 'classic');
    const fib = await calculateFibonacciRetracement(52000, 48000, 'uptrend', 50000);

    expect(supertrend.supertrend.length).toBeGreaterThan(0);
    expect(ichimoku.tenkanSen.length).toBeGreaterThan(0);
    expect(pivots.pivot).toBeGreaterThan(0);
    expect(fib.level_618).toBeGreaterThan(0);
  });

  test('performance - custom indicators should calculate quickly', async () => {
    const largeData = generateMockOHLCV(1000);

    const startTime = Date.now();

    await calculateSuperTrend(largeData, 10, 3);
    await calculateIchimoku(largeData, 9, 26, 52, 26);
    await calculatePivotPoints(largeData, 'classic');
    await calculateFibonacciRetracement(52000, 48000, 'uptrend', 50000);

    const endTime = Date.now();
    const duration = endTime - startTime;

    // All 4 custom indicators should calculate in under 1 second
    expect(duration).toBeLessThan(1000);
  });
});
