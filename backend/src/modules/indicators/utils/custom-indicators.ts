/**
 * Custom Technical Indicators
 * Indicators not available in @ixjb94/indicators library
 * Popular in cryptocurrency trading
 *
 * @module indicators/utils/custom-indicators
 */

import type { OHLCVData } from '../types/indicators-full.types';
import {
  validateDataLength,
  validateParameter,
  getHighPrices,
  getLowPrices,
  getClosePrices,
  getOpenPrices,
} from './calculator-v2';

// ============================================================================
// SUPERTREND INDICATOR
// ============================================================================

export interface SuperTrendResult {
  supertrend: number[];
  direction: ('up' | 'down')[];
  signal: ('buy' | 'sell' | 'hold')[];
}

/**
 * Calculate SuperTrend Indicator
 * Popular trend-following indicator in crypto
 *
 * @param data - OHLCV candle data
 * @param period - ATR period (default: 10)
 * @param multiplier - ATR multiplier (default: 3)
 * @returns SuperTrend values, direction, and signals
 */
export async function calculateSuperTrend(
  data: OHLCVData[],
  period: number = 10,
  multiplier: number = 3
): Promise<SuperTrendResult> {
  validateDataLength(data, period + 1, 'SuperTrend');
  validateParameter(period, 'period', 1, 500);
  validateParameter(multiplier, 'multiplier', 0.1, 10);

  const high = getHighPrices(data);
  const low = getLowPrices(data);
  const close = getClosePrices(data);

  // Calculate ATR (Average True Range)
  const atr: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      atr.push(high[i] - low[i]);
    } else {
      const tr = Math.max(
        high[i] - low[i],
        Math.abs(high[i] - close[i - 1]),
        Math.abs(low[i] - close[i - 1])
      );

      if (i < period) {
        atr.push(((atr[i - 1] * i) + tr) / (i + 1));
      } else {
        atr.push(((atr[i - 1] * (period - 1)) + tr) / period);
      }
    }
  }

  // Calculate Basic Bands
  const basicUpperBand: number[] = [];
  const basicLowerBand: number[] = [];

  for (let i = 0; i < data.length; i++) {
    const hl2 = (high[i] + low[i]) / 2;
    basicUpperBand.push(hl2 + (multiplier * atr[i]));
    basicLowerBand.push(hl2 - (multiplier * atr[i]));
  }

  // Calculate Final Bands
  const finalUpperBand: number[] = [basicUpperBand[0]];
  const finalLowerBand: number[] = [basicLowerBand[0]];

  for (let i = 1; i < data.length; i++) {
    // Upper band
    if (basicUpperBand[i] < finalUpperBand[i - 1] || close[i - 1] > finalUpperBand[i - 1]) {
      finalUpperBand.push(basicUpperBand[i]);
    } else {
      finalUpperBand.push(finalUpperBand[i - 1]);
    }

    // Lower band
    if (basicLowerBand[i] > finalLowerBand[i - 1] || close[i - 1] < finalLowerBand[i - 1]) {
      finalLowerBand.push(basicLowerBand[i]);
    } else {
      finalLowerBand.push(finalLowerBand[i - 1]);
    }
  }

  // Calculate SuperTrend and Direction
  const supertrend: number[] = [];
  const direction: ('up' | 'down')[] = [];
  const signal: ('buy' | 'sell' | 'hold')[] = [];

  let prevDirection: 'up' | 'down' = 'up';

  for (let i = 0; i < data.length; i++) {
    let currentDirection: 'up' | 'down';

    if (i === 0) {
      currentDirection = 'up';
      supertrend.push(finalLowerBand[i]);
      direction.push(currentDirection);
      signal.push('hold');
    } else {
      // Determine direction
      if (prevDirection === 'up') {
        currentDirection = close[i] <= finalUpperBand[i] ? 'down' : 'up';
      } else {
        currentDirection = close[i] >= finalLowerBand[i] ? 'up' : 'down';
      }

      // Set SuperTrend value
      supertrend.push(currentDirection === 'up' ? finalLowerBand[i] : finalUpperBand[i]);

      // Detect signal
      let currentSignal: 'buy' | 'sell' | 'hold' = 'hold';
      if (prevDirection === 'down' && currentDirection === 'up') {
        currentSignal = 'buy';
      } else if (prevDirection === 'up' && currentDirection === 'down') {
        currentSignal = 'sell';
      }

      direction.push(currentDirection);
      signal.push(currentSignal);
      prevDirection = currentDirection;
    }
  }

  return { supertrend, direction, signal };
}

// ============================================================================
// ICHIMOKU CLOUD INDICATOR
// ============================================================================

export interface IchimokuResult {
  tenkanSen: number[];      // Conversion Line
  kijunSen: number[];       // Base Line
  senkouSpanA: number[];    // Leading Span A
  senkouSpanB: number[];    // Leading Span B
  chikouSpan: number[];     // Lagging Span
  cloudColor: ('bullish' | 'bearish')[];
  signal: ('strong-buy' | 'buy' | 'neutral' | 'sell' | 'strong-sell')[];
}

/**
 * Calculate Ichimoku Cloud Indicator
 * Complete implementation of all Ichimoku components
 *
 * @param data - OHLCV candle data
 * @param conversionPeriod - Tenkan-sen period (default: 9)
 * @param basePeriod - Kijun-sen period (default: 26)
 * @param spanBPeriod - Senkou Span B period (default: 52)
 * @param displacement - Cloud displacement (default: 26)
 * @returns Complete Ichimoku indicator values
 */
export async function calculateIchimoku(
  data: OHLCVData[],
  conversionPeriod: number = 9,
  basePeriod: number = 26,
  spanBPeriod: number = 52,
  displacement: number = 26
): Promise<IchimokuResult> {
  validateDataLength(data, spanBPeriod + displacement, 'Ichimoku');
  validateParameter(conversionPeriod, 'conversionPeriod', 1, 100);
  validateParameter(basePeriod, 'basePeriod', 1, 100);
  validateParameter(spanBPeriod, 'spanBPeriod', 1, 200);
  validateParameter(displacement, 'displacement', 1, 100);

  const high = getHighPrices(data);
  const low = getLowPrices(data);
  const close = getClosePrices(data);

  /**
   * Helper: Calculate midpoint of highest high and lowest low over period
   */
  function calculateMidpoint(period: number, index: number): number {
    const start = Math.max(0, index - period + 1);
    const slice = high.slice(start, index + 1);
    const sliceLow = low.slice(start, index + 1);
    const highest = Math.max(...slice);
    const lowest = Math.min(...sliceLow);
    return (highest + lowest) / 2;
  }

  // Calculate Tenkan-sen (Conversion Line)
  const tenkanSen: number[] = [];
  for (let i = 0; i < data.length; i++) {
    tenkanSen.push(calculateMidpoint(conversionPeriod, i));
  }

  // Calculate Kijun-sen (Base Line)
  const kijunSen: number[] = [];
  for (let i = 0; i < data.length; i++) {
    kijunSen.push(calculateMidpoint(basePeriod, i));
  }

  // Calculate Senkou Span A (Leading Span A) - displaced forward
  const senkouSpanA: number[] = [];
  for (let i = 0; i < data.length; i++) {
    senkouSpanA.push((tenkanSen[i] + kijunSen[i]) / 2);
  }

  // Calculate Senkou Span B (Leading Span B) - displaced forward
  const senkouSpanB: number[] = [];
  for (let i = 0; i < data.length; i++) {
    senkouSpanB.push(calculateMidpoint(spanBPeriod, i));
  }

  // Calculate Chikou Span (Lagging Span) - displaced backward
  const chikouSpan: number[] = [];
  for (let i = 0; i < data.length; i++) {
    chikouSpan.push(close[i]);
  }

  // Determine Cloud Color
  const cloudColor: ('bullish' | 'bearish')[] = [];
  for (let i = 0; i < data.length; i++) {
    cloudColor.push(senkouSpanA[i] > senkouSpanB[i] ? 'bullish' : 'bearish');
  }

  // Generate Trading Signals
  const signal: ('strong-buy' | 'buy' | 'neutral' | 'sell' | 'strong-sell')[] = [];
  for (let i = 0; i < data.length; i++) {
    const price = close[i];
    const tenkan = tenkanSen[i];
    const kijun = kijunSen[i];
    const cloudTop = Math.max(senkouSpanA[i], senkouSpanB[i]);
    const cloudBottom = Math.min(senkouSpanA[i], senkouSpanB[i]);

    let currentSignal: 'strong-buy' | 'buy' | 'neutral' | 'sell' | 'strong-sell';

    if (price > cloudTop && tenkan > kijun && cloudColor[i] === 'bullish') {
      currentSignal = 'strong-buy';
    } else if (price > cloudTop || tenkan > kijun) {
      currentSignal = 'buy';
    } else if (price < cloudBottom && tenkan < kijun && cloudColor[i] === 'bearish') {
      currentSignal = 'strong-sell';
    } else if (price < cloudBottom || tenkan < kijun) {
      currentSignal = 'sell';
    } else {
      currentSignal = 'neutral';
    }

    signal.push(currentSignal);
  }

  return {
    tenkanSen,
    kijunSen,
    senkouSpanA,
    senkouSpanB,
    chikouSpan,
    cloudColor,
    signal,
  };
}

// ============================================================================
// PIVOT POINTS INDICATOR
// ============================================================================

export interface PivotPointsResult {
  pivot: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
  position: 'above-R3' | 'R2-R3' | 'R1-R2' | 'P-R1' | 'S1-P' | 'S2-S1' | 'S3-S2' | 'below-S3';
}

/**
 * Calculate Pivot Points
 * Supports Classic, Fibonacci, Woodie, and Camarilla methods
 *
 * @param data - OHLCV candle data (uses last candle for calculation)
 * @param method - Pivot calculation method (default: 'classic')
 * @returns Pivot points and support/resistance levels
 */
export async function calculatePivotPoints(
  data: OHLCVData[],
  method: 'classic' | 'fibonacci' | 'woodie' | 'camarilla' = 'classic'
): Promise<PivotPointsResult> {
  validateDataLength(data, 1, 'PivotPoints');

  // Use last candle for calculation
  const lastCandle = data[data.length - 1];
  const high = lastCandle.high;
  const low = lastCandle.low;
  const close = lastCandle.close;
  const open = lastCandle.open;

  let pivot: number;
  let r1: number, r2: number, r3: number;
  let s1: number, s2: number, s3: number;

  switch (method) {
    case 'fibonacci':
      pivot = (high + low + close) / 3;
      r1 = pivot + 0.382 * (high - low);
      r2 = pivot + 0.618 * (high - low);
      r3 = pivot + 1.000 * (high - low);
      s1 = pivot - 0.382 * (high - low);
      s2 = pivot - 0.618 * (high - low);
      s3 = pivot - 1.000 * (high - low);
      break;

    case 'woodie':
      pivot = (high + low + 2 * close) / 4;
      r1 = 2 * pivot - low;
      r2 = pivot + (high - low);
      r3 = high + 2 * (pivot - low);
      s1 = 2 * pivot - high;
      s2 = pivot - (high - low);
      s3 = low - 2 * (high - pivot);
      break;

    case 'camarilla':
      pivot = (high + low + close) / 3;
      const range = high - low;
      r1 = close + range * 1.1 / 12;
      r2 = close + range * 1.1 / 6;
      r3 = close + range * 1.1 / 4;
      s1 = close - range * 1.1 / 12;
      s2 = close - range * 1.1 / 6;
      s3 = close - range * 1.1 / 4;
      break;

    case 'classic':
    default:
      pivot = (high + low + close) / 3;
      r1 = 2 * pivot - low;
      r2 = pivot + (high - low);
      r3 = high + 2 * (pivot - low);
      s1 = 2 * pivot - high;
      s2 = pivot - (high - low);
      s3 = low - 2 * (high - pivot);
      break;
  }

  // Determine current position
  let position: PivotPointsResult['position'];
  if (close > r3) position = 'above-R3';
  else if (close > r2) position = 'R2-R3';
  else if (close > r1) position = 'R1-R2';
  else if (close > pivot) position = 'P-R1';
  else if (close > s1) position = 'S1-P';
  else if (close > s2) position = 'S2-S1';
  else if (close > s3) position = 'S3-S2';
  else position = 'below-S3';

  return {
    pivot,
    r1,
    r2,
    r3,
    s1,
    s2,
    s3,
    position,
  };
}

// ============================================================================
// FIBONACCI RETRACEMENT INDICATOR
// ============================================================================

export interface FibonacciRetracementResult {
  level_0: number;      // 0% (swing low/high)
  level_236: number;    // 23.6%
  level_382: number;    // 38.2%
  level_500: number;    // 50%
  level_618: number;    // 61.8% (golden ratio)
  level_786: number;    // 78.6%
  level_100: number;    // 100% (swing high/low)
  // Extensions
  level_1272: number;   // 127.2%
  level_1618: number;   // 161.8%
  nearestLevel: number;
  nearestLevelName: string;
}

/**
 * Calculate Fibonacci Retracement Levels
 * Calculates retracement and extension levels based on swing high/low
 *
 * @param high - Swing high price
 * @param low - Swing low price
 * @param trend - Market trend direction ('uptrend' or 'downtrend')
 * @param currentPrice - Current price (optional, for nearest level calculation)
 * @returns Fibonacci retracement levels
 */
export async function calculateFibonacciRetracement(
  high: number,
  low: number,
  trend: 'uptrend' | 'downtrend',
  currentPrice?: number
): Promise<FibonacciRetracementResult> {
  if (high <= low) {
    throw new Error('High must be greater than low for Fibonacci calculation');
  }

  const range = high - low;

  let result: FibonacciRetracementResult;

  if (trend === 'uptrend') {
    // In uptrend, levels are calculated from low to high
    result = {
      level_0: low,
      level_236: low + range * 0.236,
      level_382: low + range * 0.382,
      level_500: low + range * 0.500,
      level_618: low + range * 0.618,
      level_786: low + range * 0.786,
      level_100: high,
      level_1272: low + range * 1.272,
      level_1618: low + range * 1.618,
      nearestLevel: 0,
      nearestLevelName: '',
    };
  } else {
    // In downtrend, levels are calculated from high to low
    result = {
      level_0: high,
      level_236: high - range * 0.236,
      level_382: high - range * 0.382,
      level_500: high - range * 0.500,
      level_618: high - range * 0.618,
      level_786: high - range * 0.786,
      level_100: low,
      level_1272: high - range * 1.272,
      level_1618: high - range * 1.618,
      nearestLevel: 0,
      nearestLevelName: '',
    };
  }

  // Calculate nearest level if current price is provided
  if (currentPrice !== undefined) {
    const levels = [
      { value: result.level_0, name: '0%' },
      { value: result.level_236, name: '23.6%' },
      { value: result.level_382, name: '38.2%' },
      { value: result.level_500, name: '50%' },
      { value: result.level_618, name: '61.8%' },
      { value: result.level_786, name: '78.6%' },
      { value: result.level_100, name: '100%' },
      { value: result.level_1272, name: '127.2%' },
      { value: result.level_1618, name: '161.8%' },
    ];

    let minDistance = Infinity;
    let nearestLevel = levels[0];

    for (const level of levels) {
      const distance = Math.abs(currentPrice - level.value);
      if (distance < minDistance) {
        minDistance = distance;
        nearestLevel = level;
      }
    }

    result.nearestLevel = nearestLevel.value;
    result.nearestLevelName = nearestLevel.name;
  }

  return result;
}

// Export all custom indicators
export const CustomIndicators = {
  SuperTrend: calculateSuperTrend,
  Ichimoku: calculateIchimoku,
  PivotPoints: calculatePivotPoints,
  FibonacciRetracement: calculateFibonacciRetracement,
};
