/**
 * @fileoverview Technical Indicators Calculations
 * @description Pure calculation functions for trading indicators
 * @version 1.0.0
 */

import type { KlineData } from './binance-websocket';

/**
 * Simple Moving Average (SMA)
 */
export function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }

    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }

  return result;
}

/**
 * Standard Deviation
 */
export function calculateStdDev(data: number[], period: number): number[] {
  const result: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }

    const slice = data.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
    result.push(Math.sqrt(variance));
  }

  return result;
}

/**
 * Bollinger Bands
 * @param closes - Array of closing prices
 * @param period - Period for SMA (default: 20)
 * @param stdDev - Number of standard deviations (default: 2)
 */
export function calculateBollingerBands(
  closes: number[],
  period: number = 20,
  stdDev: number = 2
): {
  upper: number[];
  middle: number[];
  lower: number[];
} {
  const middle = calculateSMA(closes, period);
  const std = calculateStdDev(closes, period);

  const upper = middle.map((sma, i) => sma + stdDev * std[i]);
  const lower = middle.map((sma, i) => sma - stdDev * std[i]);

  return { upper, middle, lower };
}

/**
 * Relative Strength Index (RSI)
 * @param closes - Array of closing prices
 * @param period - Period for RSI (default: 14)
 */
export function calculateRSI(closes: number[], period: number = 14): number[] {
  const result: number[] = [];

  if (closes.length < period + 1) {
    return closes.map(() => NaN);
  }

  // Calculate price changes
  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  // Initial average gain/loss
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) {
      avgGain += changes[i];
    } else {
      avgLoss += Math.abs(changes[i]);
    }
  }

  avgGain /= period;
  avgLoss /= period;

  // Fill initial values with NaN
  for (let i = 0; i < period; i++) {
    result.push(NaN);
  }

  // Calculate RSI using Wilder's smoothing
  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    result.push(rsi);
  }

  // Add final value for alignment
  result.push(result[result.length - 1]);

  return result;
}

/**
 * Convert KlineData to indicator data with time
 */
export function klineToIndicatorData<T extends number | { value: number }>(
  klines: KlineData[],
  values: (number | { value: number })[],
  mapValue?: (v: number) => T
): Array<{ time: number; value: T }> {
  return klines.map((k, i) => {
    const val = typeof values[i] === 'number' ? values[i] : (values[i] as { value: number }).value;

    return {
      time: k.time,
      value: mapValue ? mapValue(val) : (val as T),
    };
  }).filter(item => !isNaN(item.value as number));
}
