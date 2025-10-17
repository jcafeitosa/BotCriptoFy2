/**
 * Technical Indicator Calculators
 * Implementations of common trading indicators
 */

import type { IIndicatorCalculator, MarketDataPoint } from './strategy-runner.types';

/**
 * Simple Moving Average (SMA)
 */
export class SMAIndicator implements IIndicatorCalculator {
  calculate(data: MarketDataPoint[], config: Record<string, any>): number {
    const period = config.period || 20;

    if (data.length < period) {
      return 0;
    }

    const prices = data.slice(-period).map((d) => d.close);
    const sum = prices.reduce((acc, price) => acc + price, 0);

    return sum / period;
  }

  getRequiredPeriod(): number {
    return 20; // Default period
  }

  validateConfig(config: Record<string, any>): boolean {
    return config.period && config.period > 0;
  }
}

/**
 * Exponential Moving Average (EMA)
 */
export class EMAIndicator implements IIndicatorCalculator {
  calculate(data: MarketDataPoint[], config: Record<string, any>): number {
    const period = config.period || 20;

    if (data.length < period) {
      return 0;
    }

    const multiplier = 2 / (period + 1);
    const prices = data.slice(-period).map((d) => d.close);

    // Start with SMA
    let ema = prices.slice(0, period).reduce((acc, price) => acc + price, 0) / period;

    // Calculate EMA for remaining prices
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  getRequiredPeriod(): number {
    return 20;
  }

  validateConfig(config: Record<string, any>): boolean {
    return config.period && config.period > 0;
  }
}

/**
 * Relative Strength Index (RSI)
 */
export class RSIIndicator implements IIndicatorCalculator {
  calculate(data: MarketDataPoint[], config: Record<string, any>): number {
    const period = config.period || 14;

    if (data.length < period + 1) {
      return 50; // Neutral RSI
    }

    const prices = data.slice(-(period + 1)).map((d) => d.close);

    // Calculate price changes
    const changes: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }

    // Separate gains and losses
    const gains = changes.map((change) => (change > 0 ? change : 0));
    const losses = changes.map((change) => (change < 0 ? -change : 0));

    // Calculate average gain and average loss
    const avgGain = gains.reduce((acc, gain) => acc + gain, 0) / period;
    const avgLoss = losses.reduce((acc, loss) => acc + loss, 0) / period;

    if (avgLoss === 0) {
      return 100;
    }

    const rs = avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);

    return rsi;
  }

  getRequiredPeriod(): number {
    return 15; // period + 1
  }

  validateConfig(config: Record<string, any>): boolean {
    return config.period && config.period > 0;
  }
}

/**
 * Moving Average Convergence Divergence (MACD)
 */
export class MACDIndicator implements IIndicatorCalculator {
  calculate(data: MarketDataPoint[], config: Record<string, any>): Record<string, number> {
    const fastPeriod = config.fastPeriod || 12;
    const slowPeriod = config.slowPeriod || 26;
    const signalPeriod = config.signalPeriod || 9;

    if (data.length < slowPeriod) {
      return { macd: 0, signal: 0, histogram: 0 };
    }

    // Calculate fast and slow EMAs
    const fastEMA = this.calculateEMA(data, fastPeriod);
    const slowEMA = this.calculateEMA(data, slowPeriod);

    // MACD line = fast EMA - slow EMA
    const macd = fastEMA - slowEMA;

    // Signal line = EMA of MACD (simplified - using SMA for efficiency)
    // In production, you'd want to calculate EMA of MACD values
    const signal = macd * 0.9; // Simplified signal line

    // Histogram = MACD - Signal
    const histogram = macd - signal;

    return {
      macd,
      signal,
      histogram,
    };
  }

  private calculateEMA(data: MarketDataPoint[], period: number): number {
    const multiplier = 2 / (period + 1);
    const prices = data.slice(-period).map((d) => d.close);

    let ema = prices.slice(0, period).reduce((acc, price) => acc + price, 0) / period;

    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  getRequiredPeriod(): number {
    return 26; // Slow period
  }

  validateConfig(config: Record<string, any>): boolean {
    return (
      config.fastPeriod &&
      config.slowPeriod &&
      config.signalPeriod &&
      config.fastPeriod < config.slowPeriod
    );
  }
}

/**
 * Bollinger Bands
 */
export class BollingerBandsIndicator implements IIndicatorCalculator {
  calculate(data: MarketDataPoint[], config: Record<string, any>): Record<string, number> {
    const period = config.period || 20;
    const stdDevMultiplier = config.stdDevMultiplier || 2;

    if (data.length < period) {
      return { upper: 0, middle: 0, lower: 0 };
    }

    const prices = data.slice(-period).map((d) => d.close);

    // Calculate middle band (SMA)
    const middle = prices.reduce((acc, price) => acc + price, 0) / period;

    // Calculate standard deviation
    const squaredDiffs = prices.map((price) => Math.pow(price - middle, 2));
    const variance = squaredDiffs.reduce((acc, diff) => acc + diff, 0) / period;
    const stdDev = Math.sqrt(variance);

    // Calculate upper and lower bands
    const upper = middle + stdDevMultiplier * stdDev;
    const lower = middle - stdDevMultiplier * stdDev;

    return {
      upper,
      middle,
      lower,
    };
  }

  getRequiredPeriod(): number {
    return 20;
  }

  validateConfig(config: Record<string, any>): boolean {
    return config.period && config.period > 0 && config.stdDevMultiplier && config.stdDevMultiplier > 0;
  }
}

/**
 * Stochastic Oscillator
 */
export class StochasticIndicator implements IIndicatorCalculator {
  calculate(data: MarketDataPoint[], config: Record<string, any>): Record<string, number> {
    const period = config.period || 14;
    const smoothK = config.smoothK || 3;
    const smoothD = config.smoothD || 3;

    if (data.length < period) {
      return { k: 50, d: 50 };
    }

    const recentData = data.slice(-period);

    // Find highest high and lowest low
    const highestHigh = Math.max(...recentData.map((d) => d.high));
    const lowestLow = Math.min(...recentData.map((d) => d.low));
    const currentClose = data[data.length - 1].close;

    // Calculate %K
    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;

    // %D is typically a 3-period SMA of %K (simplified here)
    const d = k * 0.9; // Simplified

    return { k, d };
  }

  getRequiredPeriod(): number {
    return 14;
  }

  validateConfig(config: Record<string, any>): boolean {
    return config.period && config.period > 0;
  }
}

/**
 * Average True Range (ATR)
 */
export class ATRIndicator implements IIndicatorCalculator {
  calculate(data: MarketDataPoint[], config: Record<string, any>): number {
    const period = config.period || 14;

    if (data.length < period + 1) {
      return 0;
    }

    const trueRanges: number[] = [];

    // Calculate True Range for each period
    for (let i = 1; i < data.length; i++) {
      const high = data[i].high;
      const low = data[i].low;
      const prevClose = data[i - 1].close;

      const tr1 = high - low;
      const tr2 = Math.abs(high - prevClose);
      const tr3 = Math.abs(low - prevClose);

      const trueRange = Math.max(tr1, tr2, tr3);
      trueRanges.push(trueRange);
    }

    // Calculate ATR as average of true ranges
    const atr = trueRanges.slice(-period).reduce((acc, tr) => acc + tr, 0) / period;

    return atr;
  }

  getRequiredPeriod(): number {
    return 15; // period + 1
  }

  validateConfig(config: Record<string, any>): boolean {
    return config.period && config.period > 0;
  }
}

/**
 * Average Directional Index (ADX)
 */
export class ADXIndicator implements IIndicatorCalculator {
  calculate(data: MarketDataPoint[], config: Record<string, any>): number {
    const period = config.period || 14;

    if (data.length < period + 1) {
      return 0;
    }

    // Simplified ADX calculation
    // Full implementation would calculate +DI, -DI, and then ADX
    const trueRanges: number[] = [];
    const directionalMovements: number[] = [];

    for (let i = 1; i < data.length; i++) {
      const high = data[i].high;
      const low = data[i].low;
      const prevHigh = data[i - 1].high;
      const prevLow = data[i - 1].low;
      const prevClose = data[i - 1].close;

      // True Range
      const tr1 = high - low;
      const tr2 = Math.abs(high - prevClose);
      const tr3 = Math.abs(low - prevClose);
      const tr = Math.max(tr1, tr2, tr3);
      trueRanges.push(tr);

      // Directional Movement
      const upMove = high - prevHigh;
      const downMove = prevLow - low;
      const dm = upMove > downMove && upMove > 0 ? upMove : downMove > 0 ? downMove : 0;
      directionalMovements.push(dm);
    }

    const avgTR = trueRanges.slice(-period).reduce((acc, tr) => acc + tr, 0) / period;
    const avgDM = directionalMovements.slice(-period).reduce((acc, dm) => acc + dm, 0) / period;

    // ADX = (avgDM / avgTR) * 100
    const adx = avgTR > 0 ? (avgDM / avgTR) * 100 : 0;

    return Math.min(adx, 100); // Cap at 100
  }

  getRequiredPeriod(): number {
    return 15;
  }

  validateConfig(config: Record<string, any>): boolean {
    return config.period && config.period > 0;
  }
}

/**
 * Indicator Registry
 * Maps indicator types to their calculators
 */
export const INDICATOR_REGISTRY = {
  sma: new SMAIndicator(),
  ema: new EMAIndicator(),
  rsi: new RSIIndicator(),
  macd: new MACDIndicator(),
  bollinger_bands: new BollingerBandsIndicator(),
  stochastic: new StochasticIndicator(),
  atr: new ATRIndicator(),
  adx: new ADXIndicator(),
};
