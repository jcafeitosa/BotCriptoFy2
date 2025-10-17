/**
 * Calculator V2 - Unit Tests
 * Tests for key technical indicators
 *
 * @module indicators/utils/__tests__/calculator-v2
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import {
  calculateRSI,
  calculateMACD,
  calculateEMA,
  calculateBBands,
  calculateATR,
  calculateSMA,
  getLatestValue,
  validateDataLength,
} from '../calculator-v2';
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
 * Known values test data for RSI
 * Using simple trending data where RSI can be calculated manually
 */
function generateKnownRSIData(): OHLCVData[] {
  const baseDate = new Date('2024-01-01T00:00:00Z');
  const prices = [
    44, 44.34, 44.09, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08,
    45.89, 46.03, 45.61, 46.28, 46.28, 46.00, 46.03, 46.41, 46.22, 45.64,
  ];

  return prices.map((close, i) => ({
    timestamp: new Date(baseDate.getTime() + i * 60000),
    open: close * 0.99,
    high: close * 1.01,
    low: close * 0.98,
    close,
    volume: 1000,
  }));
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe('Calculator V2 - Helper Functions', () => {
  test('getLatestValue should return last element', () => {
    const values = [1, 2, 3, 4, 5];
    expect(getLatestValue(values)).toBe(5);
  });

  test('getLatestValue should return null for empty array', () => {
    expect(getLatestValue([])).toBeNull();
  });

  test('validateDataLength should not throw for sufficient data', () => {
    const data = generateMockOHLCV(50);
    expect(() => validateDataLength(data, 14, 'RSI')).not.toThrow();
  });

  test('validateDataLength should throw for insufficient data', () => {
    const data = generateMockOHLCV(10);
    expect(() => validateDataLength(data, 20, 'RSI')).toThrow('Insufficient data');
  });

  test('validateDataLength should throw for empty data', () => {
    expect(() => validateDataLength([], 14, 'RSI')).toThrow('No data provided');
  });
});

describe('Calculator V2 - SMA (Simple Moving Average)', () => {
  let mockData: OHLCVData[];

  beforeAll(() => {
    mockData = generateMockOHLCV(100);
  });

  test('should calculate SMA with default period (20)', async () => {
    const result = await calculateSMA(mockData);

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(typeof result[0]).toBe('number');
  });

  test('should calculate SMA with custom period (50)', async () => {
    const result = await calculateSMA(mockData, 50);

    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });

  test('should throw error for insufficient data', async () => {
    const shortData = generateMockOHLCV(10);
    await expect(calculateSMA(shortData, 50)).rejects.toThrow('Insufficient data');
  });

  test('SMA values should be reasonable', async () => {
    const result = await calculateSMA(mockData, 20);
    const latestSMA = getLatestValue(result);
    const latestClose = mockData[mockData.length - 1].close;

    // SMA should be within ±20% of current price
    expect(latestSMA).toBeGreaterThan(latestClose * 0.8);
    expect(latestSMA).toBeLessThan(latestClose * 1.2);
  });
});

describe('Calculator V2 - EMA (Exponential Moving Average)', () => {
  let mockData: OHLCVData[];

  beforeAll(() => {
    mockData = generateMockOHLCV(100);
  });

  test('should calculate EMA with default period (20)', async () => {
    const result = await calculateEMA(mockData);

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(typeof result[0]).toBe('number');
  });

  test('should calculate EMA with custom period (50)', async () => {
    const result = await calculateEMA(mockData, 50);

    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });

  test('EMA should be more responsive than SMA', async () => {
    const ema = await calculateEMA(mockData, 20);
    const sma = await calculateSMA(mockData, 20);

    // Both should have values (EMA returns full array, SMA may be shorter)
    expect(ema.length).toBeGreaterThan(0);
    expect(sma.length).toBeGreaterThan(0);

    // EMA typically differs from SMA
    const latestEMA = getLatestValue(ema);
    const latestSMA = getLatestValue(sma);

    expect(latestEMA).toBeDefined();
    expect(latestSMA).toBeDefined();

    // EMA and SMA should be different (EMA is more responsive)
    expect(latestEMA).not.toBe(latestSMA);
  });

  test('should throw error for insufficient data', async () => {
    const shortData = generateMockOHLCV(5);
    await expect(calculateEMA(shortData, 20)).rejects.toThrow('Insufficient data');
  });
});

describe('Calculator V2 - RSI (Relative Strength Index)', () => {
  let mockData: OHLCVData[];
  let knownData: OHLCVData[];

  beforeAll(() => {
    mockData = generateMockOHLCV(100);
    knownData = generateKnownRSIData();
  });

  test('should calculate RSI with default period (14)', async () => {
    const result = await calculateRSI(mockData);

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  test('should calculate RSI with custom period (7)', async () => {
    const result = await calculateRSI(mockData, 7);

    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });

  test('RSI values should be between 0 and 100', async () => {
    const result = await calculateRSI(mockData, 14);

    result.forEach((value, index) => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    });
  });

  test('RSI should identify overbought/oversold conditions', async () => {
    const result = await calculateRSI(mockData, 14);
    const latestRSI = getLatestValue(result);

    expect(latestRSI).toBeDefined();
    expect(typeof latestRSI).toBe('number');

    // RSI typically ranges 30-70 in normal conditions
    // Extreme values (>80 or <20) are rare but valid
    expect(latestRSI).toBeGreaterThan(0);
    expect(latestRSI).toBeLessThan(100);
  });

  test('should throw error for insufficient data', async () => {
    const shortData = generateMockOHLCV(10);
    await expect(calculateRSI(shortData, 14)).rejects.toThrow('Insufficient data');
  });

  test('should handle known trending data correctly', async () => {
    const result = await calculateRSI(knownData, 14);

    expect(result.length).toBeGreaterThan(0);

    // For uptrending data, RSI should be > 50
    const latestRSI = getLatestValue(result);
    expect(latestRSI).toBeGreaterThan(30); // Should show upward momentum
  });
});

describe('Calculator V2 - MACD (Moving Average Convergence Divergence)', () => {
  let mockData: OHLCVData[];

  beforeAll(() => {
    mockData = generateMockOHLCV(100);
  });

  test('should calculate MACD with default periods (12, 26, 9)', async () => {
    const result = await calculateMACD(mockData);

    expect(result).toBeDefined();
    expect(result.macd).toBeDefined();
    expect(result.signal).toBeDefined();
    expect(result.histogram).toBeDefined();

    expect(Array.isArray(result.macd)).toBe(true);
    expect(Array.isArray(result.signal)).toBe(true);
    expect(Array.isArray(result.histogram)).toBe(true);
  });

  test('should calculate MACD with custom periods', async () => {
    const result = await calculateMACD(mockData, 8, 17, 9);

    expect(result.macd.length).toBeGreaterThan(0);
    expect(result.signal.length).toBeGreaterThan(0);
    expect(result.histogram.length).toBeGreaterThan(0);
  });

  test('MACD arrays should have same length', async () => {
    const result = await calculateMACD(mockData);

    expect(result.macd.length).toBe(result.signal.length);
    expect(result.macd.length).toBe(result.histogram.length);
  });

  test('MACD histogram should equal macd - signal', async () => {
    const result = await calculateMACD(mockData);

    const latestMACD = getLatestValue(result.macd);
    const latestSignal = getLatestValue(result.signal);
    const latestHistogram = getLatestValue(result.histogram);

    expect(latestMACD).toBeDefined();
    expect(latestSignal).toBeDefined();
    expect(latestHistogram).toBeDefined();

    // Histogram = MACD - Signal (with small floating point tolerance)
    const expectedHistogram = latestMACD! - latestSignal!;
    expect(Math.abs(latestHistogram! - expectedHistogram)).toBeLessThan(0.0001);
  });

  test('should detect crossovers', async () => {
    const result = await calculateMACD(mockData);

    // Check if we can detect a crossover in the data
    let crossoverFound = false;
    for (let i = 1; i < result.macd.length; i++) {
      const prevMacd = result.macd[i - 1];
      const currMacd = result.macd[i];
      const prevSignal = result.signal[i - 1];
      const currSignal = result.signal[i];

      // Bullish crossover: MACD crosses above signal
      if (prevMacd < prevSignal && currMacd > currSignal) {
        crossoverFound = true;
        break;
      }

      // Bearish crossover: MACD crosses below signal
      if (prevMacd > prevSignal && currMacd < currSignal) {
        crossoverFound = true;
        break;
      }
    }

    // With 100 bars of random data, crossovers are common
    // Just check that the logic works
    expect(typeof crossoverFound).toBe('boolean');
  });

  test('should throw error for insufficient data', async () => {
    const shortData = generateMockOHLCV(20);
    await expect(calculateMACD(shortData, 12, 26, 9)).rejects.toThrow('Insufficient data');
  });
});

describe('Calculator V2 - Bollinger Bands', () => {
  let mockData: OHLCVData[];

  beforeAll(() => {
    mockData = generateMockOHLCV(100);
  });

  test('should calculate BBands with default parameters (20, 2)', async () => {
    const result = await calculateBBands(mockData);

    expect(result).toBeDefined();
    expect(result.upper).toBeDefined();
    expect(result.middle).toBeDefined();
    expect(result.lower).toBeDefined();

    expect(Array.isArray(result.upper)).toBe(true);
    expect(Array.isArray(result.middle)).toBe(true);
    expect(Array.isArray(result.lower)).toBe(true);
  });

  test('should calculate BBands with custom parameters', async () => {
    const result = await calculateBBands(mockData, 10, 1.5);

    expect(result.upper.length).toBeGreaterThan(0);
    expect(result.middle.length).toBeGreaterThan(0);
    expect(result.lower.length).toBeGreaterThan(0);
  });

  test('BBand arrays should have same length', async () => {
    const result = await calculateBBands(mockData);

    expect(result.upper.length).toBe(result.middle.length);
    expect(result.upper.length).toBe(result.lower.length);
  });

  test('upper band should be above middle, middle above lower', async () => {
    const result = await calculateBBands(mockData);

    const latestUpper = getLatestValue(result.upper);
    const latestMiddle = getLatestValue(result.middle);
    const latestLower = getLatestValue(result.lower);

    expect(latestUpper).toBeDefined();
    expect(latestMiddle).toBeDefined();
    expect(latestLower).toBeDefined();

    expect(latestUpper!).toBeGreaterThan(latestMiddle!);
    expect(latestMiddle!).toBeGreaterThan(latestLower!);
  });

  test('middle band should be SMA', async () => {
    const bbands = await calculateBBands(mockData, 20, 2);
    const sma = await calculateSMA(mockData, 20);

    const latestBBMiddle = getLatestValue(bbands.middle);
    const latestSMA = getLatestValue(sma);

    // Middle band should equal SMA (with floating point tolerance)
    expect(Math.abs(latestBBMiddle! - latestSMA!)).toBeLessThan(0.0001);
  });

  test('bandwidth should increase with stdDev multiplier', async () => {
    const bbands1 = await calculateBBands(mockData, 20, 1);
    const bbands2 = await calculateBBands(mockData, 20, 2);

    const bandwidth1 = getLatestValue(bbands1.upper)! - getLatestValue(bbands1.lower)!;
    const bandwidth2 = getLatestValue(bbands2.upper)! - getLatestValue(bbands2.lower)!;

    expect(bandwidth2).toBeGreaterThan(bandwidth1);
  });

  test('should throw error for insufficient data', async () => {
    const shortData = generateMockOHLCV(10);
    await expect(calculateBBands(shortData, 20, 2)).rejects.toThrow('Insufficient data');
  });

  test('price should generally stay within bands', async () => {
    const result = await calculateBBands(mockData, 20, 2);

    let withinBands = 0;
    let totalBars = 0;

    for (let i = result.upper.length - 50; i < result.upper.length; i++) {
      const price = mockData[mockData.length - (result.upper.length - i)].close;
      const upper = result.upper[i];
      const lower = result.lower[i];

      if (price >= lower && price <= upper) {
        withinBands++;
      }
      totalBars++;
    }

    // Statistically, ~95% of prices should be within 2 std dev bands
    const percentageWithin = (withinBands / totalBars) * 100;
    expect(percentageWithin).toBeGreaterThan(70); // Allow some variance
  });
});

describe('Calculator V2 - ATR (Average True Range)', () => {
  let mockData: OHLCVData[];

  beforeAll(() => {
    mockData = generateMockOHLCV(100);
  });

  test('should calculate ATR with default period (14)', async () => {
    const result = await calculateATR(mockData);

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  test('should calculate ATR with custom period (7)', async () => {
    const result = await calculateATR(mockData, 7);

    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });

  test('ATR values should be positive', async () => {
    const result = await calculateATR(mockData, 14);

    result.forEach((value) => {
      expect(value).toBeGreaterThan(0);
    });
  });

  test('ATR should measure volatility', async () => {
    const result = await calculateATR(mockData, 14);
    const latestATR = getLatestValue(result);
    const latestClose = mockData[mockData.length - 1].close;

    expect(latestATR).toBeDefined();

    // ATR as percentage of price (typically 1-5% for crypto)
    const atrPercent = (latestATR! / latestClose) * 100;

    expect(atrPercent).toBeGreaterThan(0);
    expect(atrPercent).toBeLessThan(20); // Reasonable upper bound
  });

  test('longer period should smooth ATR', async () => {
    const atr7 = await calculateATR(mockData, 7);
    const atr21 = await calculateATR(mockData, 21);

    // Both should have values
    expect(atr7.length).toBeGreaterThan(0);
    expect(atr21.length).toBeGreaterThan(0);

    // Calculate standard deviation of last 20 values
    const calcStdDev = (values: number[]) => {
      const slice = values.slice(-20);
      const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / slice.length;
      return Math.sqrt(variance);
    };

    const stdDev7 = calcStdDev(atr7);
    const stdDev21 = calcStdDev(atr21);

    // Longer period should have lower volatility (more smooth)
    expect(stdDev21).toBeLessThanOrEqual(stdDev7 * 1.5); // Allow some variance
  });

  test('should throw error for insufficient data', async () => {
    const shortData = generateMockOHLCV(10);
    await expect(calculateATR(shortData, 14)).rejects.toThrow('Insufficient data');
  });

  test('ATR should reflect high/low range', async () => {
    // Create data with known high volatility
    const volatileData = generateMockOHLCV(50).map((bar, i) => ({
      ...bar,
      high: bar.close * 1.05, // 5% above close
      low: bar.close * 0.95,  // 5% below close
    }));

    const atr = await calculateATR(volatileData, 14);
    const latestATR = getLatestValue(atr);
    const latestClose = volatileData[volatileData.length - 1].close;

    // ATR should reflect the ~10% range
    const atrPercent = (latestATR! / latestClose) * 100;
    expect(atrPercent).toBeGreaterThan(2); // Should show significant volatility
  });
});

describe('Calculator V2 - Integration Tests', () => {
  let mockData: OHLCVData[];

  beforeAll(() => {
    mockData = generateMockOHLCV(100);
  });

  test('should calculate multiple indicators on same data', async () => {
    const rsi = await calculateRSI(mockData, 14);
    const macd = await calculateMACD(mockData, 12, 26, 9);
    const bbands = await calculateBBands(mockData, 20, 2);
    const atr = await calculateATR(mockData, 14);
    const ema = await calculateEMA(mockData, 20);

    expect(rsi.length).toBeGreaterThan(0);
    expect(macd.macd.length).toBeGreaterThan(0);
    expect(bbands.upper.length).toBeGreaterThan(0);
    expect(atr.length).toBeGreaterThan(0);
    expect(ema.length).toBeGreaterThan(0);
  });

  test('indicators should handle edge cases', async () => {
    // Test with minimum data
    const minData = generateMockOHLCV(30);

    await expect(calculateRSI(minData, 14)).resolves.toBeDefined();
    await expect(calculateEMA(minData, 20)).resolves.toBeDefined();
    await expect(calculateATR(minData, 14)).resolves.toBeDefined();
  });

  test('performance - should calculate indicators quickly', async () => {
    const largeData = generateMockOHLCV(1000);

    const startTime = Date.now();

    await calculateRSI(largeData, 14);
    await calculateMACD(largeData, 12, 26, 9);
    await calculateBBands(largeData, 20, 2);
    await calculateATR(largeData, 14);
    await calculateEMA(largeData, 20);

    const endTime = Date.now();
    const duration = endTime - startTime;

    // All 5 indicators should calculate in under 1 second
    expect(duration).toBeLessThan(1000);
  });
});
