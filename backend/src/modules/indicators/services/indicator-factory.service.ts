/**
 * Indicator Factory Service V2
 * Simplified factory pattern using calculator-v2 (async)
 * Provides type-safe wrappers with metadata for key indicators
 *
 * @module indicators/services/indicator-factory
 */

import type {
  BaseIndicatorConfig,
  IndicatorType,
  IndicatorResult,
  IndicatorCategory,
  OHLCVData,
  RSIConfig,
  RSIResult,
  MACDConfig,
  MACDResult,
  BollingerBandsConfig,
  BollingerBandsResult,
  ATRConfig,
  ATRResult,
  SMAConfig,
  SMAResult,
  EMAConfig,
  EMAResult,
  VWAPConfig,
  VWAPResult,
} from '../types/indicators.types';

// Import custom indicator configs and results
import type {
  SuperTrendConfig,
  SuperTrendResult as SuperTrendResultType,
  IchimokuConfig,
  IchimokuResult as IchimokuResultType,
  PivotPointsConfig,
  PivotPointsResult as PivotPointsResultType,
  FibonacciRetracementConfig,
  FibonacciRetracementResult as FibonacciRetracementResultType,
} from '../types/crypto-indicators.types';

import * as Calculator from '../utils/calculator-v2';

/**
 * Indicator category mapping
 */
const INDICATOR_CATEGORY_MAP: Record<string, IndicatorCategory> = {
  RSI: 'momentum',
  MACD: 'momentum',
  BollingerBands: 'volatility',
  ATR: 'volatility',
  SMA: 'trend',
  EMA: 'trend',
  VWAP: 'volume',
};

/**
 * Indicator Factory for type-safe indicator creation
 * All methods are async to work with calculator-v2
 */
export class IndicatorFactory {
  /**
   * Calculate RSI (Relative Strength Index)
   */
  static async calculateRSI(data: OHLCVData[], config: RSIConfig): Promise<IndicatorResult<RSIResult>> {
    const startTime = Date.now();
    const values = await Calculator.calculateRSI(data, config.period);
    const latestValue = Calculator.getLatestValue(values);

    const result: RSIResult = {
      rsi: latestValue || 0,
      overbought: latestValue ? latestValue > 70 : false,
      oversold: latestValue ? latestValue < 30 : false,
    };

    return {
      type: 'RSI',
      category: 'momentum',
      timestamp: new Date(),
      value: result,
      metadata: {
        period: config.period,
        calculationTime: Date.now() - startTime,
      },
    };
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   */
  static async calculateMACD(data: OHLCVData[], config: MACDConfig): Promise<IndicatorResult<MACDResult>> {
    const startTime = Date.now();
    const values = await Calculator.calculateMACD(data, config.fastPeriod, config.slowPeriod, config.signalPeriod);

    // Extract latest values from arrays
    const latestMACD = Calculator.getLatestValue(values.macd);
    const latestSignal = Calculator.getLatestValue(values.signal);
    const latestHistogram = Calculator.getLatestValue(values.histogram);

    // Detect crossover by comparing last 2 values
    let crossover: 'bullish' | 'bearish' | null = null;
    if (values.macd.length >= 2 && values.signal.length >= 2) {
      const prevMACD = values.macd[values.macd.length - 2];
      const prevSignal = values.signal[values.signal.length - 2];

      if (prevMACD < prevSignal && latestMACD! > latestSignal!) {
        crossover = 'bullish';
      } else if (prevMACD > prevSignal && latestMACD! < latestSignal!) {
        crossover = 'bearish';
      }
    }

    const result: MACDResult = {
      macd: latestMACD || 0,
      signal: latestSignal || 0,
      histogram: latestHistogram || 0,
      crossover,
    };

    return {
      type: 'MACD',
      category: 'momentum',
      timestamp: new Date(),
      value: result,
      metadata: {
        parameters: {
          fastPeriod: config.fastPeriod,
          slowPeriod: config.slowPeriod,
          signalPeriod: config.signalPeriod,
        },
        calculationTime: Date.now() - startTime,
      },
    };
  }

  /**
   * Calculate Bollinger Bands
   */
  static async calculateBollingerBands(
    data: OHLCVData[],
    config: BollingerBandsConfig
  ): Promise<IndicatorResult<BollingerBandsResult>> {
    const startTime = Date.now();
    const values = await Calculator.calculateBBands(data, config.period, config.stdDevMultiplier);

    const latestUpper = Calculator.getLatestValue(values.upper);
    const latestMiddle = Calculator.getLatestValue(values.middle);
    const latestLower = Calculator.getLatestValue(values.lower);
    const currentPrice = data[data.length - 1]?.close || 0;

    // Calculate bandwidth: (upper - lower) / middle
    const bandwidth = latestMiddle ? (latestUpper! - latestLower!) / latestMiddle : 0;

    // Calculate %B: (price - lower) / (upper - lower)
    const percentB = (latestUpper! - latestLower!) !== 0
      ? (currentPrice - latestLower!) / (latestUpper! - latestLower!)
      : 0.5;

    const result: BollingerBandsResult = {
      upper: latestUpper || 0,
      middle: latestMiddle || 0,
      lower: latestLower || 0,
      bandwidth,
      percentB,
      squeeze: bandwidth < 0.1, // Squeeze when bandwidth is low
    };

    return {
      type: 'BollingerBands',
      category: 'volatility',
      timestamp: new Date(),
      value: result,
      metadata: {
        period: config.period,
        parameters: { stdDevMultiplier: config.stdDevMultiplier },
        calculationTime: Date.now() - startTime,
      },
    };
  }

  /**
   * Calculate ATR (Average True Range)
   */
  static async calculateATR(data: OHLCVData[], config: ATRConfig): Promise<IndicatorResult<ATRResult>> {
    const startTime = Date.now();
    const values = await Calculator.calculateATR(data, config.period);
    const latestValue = Calculator.getLatestValue(values);
    const currentPrice = data[data.length - 1]?.close || 1;
    const atrPercent = latestValue ? (latestValue / currentPrice) * 100 : 0;

    let volatility: 'low' | 'normal' | 'high' | 'extreme';
    if (atrPercent > 5) volatility = 'extreme';
    else if (atrPercent > 3) volatility = 'high';
    else if (atrPercent > 1) volatility = 'normal';
    else volatility = 'low';

    const result: ATRResult = {
      atr: latestValue || 0,
      atrPercent,
      volatility,
    };

    return {
      type: 'ATR',
      category: 'volatility',
      timestamp: new Date(),
      value: result,
      metadata: {
        period: config.period,
        calculationTime: Date.now() - startTime,
      },
    };
  }

  /**
   * Calculate SMA (Simple Moving Average)
   */
  static async calculateSMA(data: OHLCVData[], config: SMAConfig): Promise<IndicatorResult<SMAResult>> {
    const startTime = Date.now();
    const values = await Calculator.calculateSMA(data, config.period);
    const latestValue = Calculator.getLatestValue(values);
    const currentPrice = data[data.length - 1]?.close || 0;

    const result: SMAResult = {
      sma: latestValue || 0,
      trend: Calculator.determineTrend(values),
      distance: currentPrice - (latestValue || 0),
      distancePercent: Calculator.calculatePercentDiff(currentPrice, latestValue || currentPrice),
    };

    return {
      type: 'SMA',
      category: 'trend',
      timestamp: new Date(),
      value: result,
      metadata: {
        period: config.period,
        calculationTime: Date.now() - startTime,
      },
    };
  }

  /**
   * Calculate EMA (Exponential Moving Average)
   */
  static async calculateEMA(data: OHLCVData[], config: EMAConfig): Promise<IndicatorResult<EMAResult>> {
    const startTime = Date.now();
    const values = await Calculator.calculateEMA(data, config.period);
    const latestValue = Calculator.getLatestValue(values);
    const currentPrice = data[data.length - 1]?.close || 0;

    const result: EMAResult = {
      ema: latestValue || 0,
      trend: Calculator.determineTrend(values),
      distance: currentPrice - (latestValue || 0),
      distancePercent: Calculator.calculatePercentDiff(currentPrice, latestValue || currentPrice),
    };

    return {
      type: 'EMA',
      category: 'trend',
      timestamp: new Date(),
      value: result,
      metadata: {
        period: config.period,
        calculationTime: Date.now() - startTime,
      },
    };
  }

  /**
   * Calculate VWAP (Volume Weighted Average Price)
   */
  static async calculateVWAP(data: OHLCVData[], config: VWAPConfig): Promise<IndicatorResult<VWAPResult>> {
    const startTime = Date.now();
    const values = await Calculator.calculateVWAP(data, config.period || 14);
    const latestValue = Calculator.getLatestValue(values);
    const currentPrice = data[data.length - 1]?.close || 0;

    const distance = currentPrice - (latestValue || 0);
    const distancePercent = Calculator.calculatePercentDiff(currentPrice, latestValue || currentPrice);

    let position: 'above' | 'below' | 'at';
    if (Math.abs(distancePercent) < 0.1) position = 'at';
    else if (distance > 0) position = 'above';
    else position = 'below';

    const result: VWAPResult = {
      vwap: latestValue || 0,
      distance,
      distancePercent,
      position,
    };

    return {
      type: 'VWAP',
      category: 'volume',
      timestamp: new Date(),
      value: result,
      metadata: {
        period: config.period,
        calculationTime: Date.now() - startTime,
      },
    };
  }

  /**
   * Calculate SuperTrend (Custom Indicator)
   */
  static async calculateSuperTrend(data: OHLCVData[], config: SuperTrendConfig): Promise<{
    type: 'SuperTrend';
    category: 'trend';
    timestamp: Date;
    value: SuperTrendResultType;
    metadata: any;
  }> {
    const startTime = Date.now();
    const values = await Calculator.calculateSuperTrend(data, config.period, config.multiplier);

    // Get latest values
    const latestSupertrend = Calculator.getLatestValue(values.supertrend);
    const latestDirection = Calculator.getLatestValue(values.direction);
    const latestSignal = Calculator.getLatestValue(values.signal);

    const result: SuperTrendResultType = {
      supertrend: latestSupertrend || 0,
      direction: latestDirection || 'up',
      signal: latestSignal || 'hold',
    };

    return {
      type: 'SuperTrend',
      category: 'trend',
      timestamp: new Date(),
      value: result,
      metadata: {
        period: config.period,
        parameters: { multiplier: config.multiplier },
        calculationTime: Date.now() - startTime,
      },
    };
  }

  /**
   * Calculate Ichimoku Cloud (Custom Indicator)
   */
  static async calculateIchimoku(data: OHLCVData[], config: IchimokuConfig): Promise<{
    type: 'Ichimoku';
    category: 'trend';
    timestamp: Date;
    value: IchimokuResultType;
    metadata: any;
  }> {
    const startTime = Date.now();
    const values = await Calculator.calculateIchimoku(
      data,
      config.conversionPeriod,
      config.basePeriod,
      config.spanBPeriod,
      config.displacement
    );

    // Get latest values
    const latestTenkanSen = Calculator.getLatestValue(values.tenkanSen);
    const latestKijunSen = Calculator.getLatestValue(values.kijunSen);
    const latestSenkouSpanA = Calculator.getLatestValue(values.senkouSpanA);
    const latestSenkouSpanB = Calculator.getLatestValue(values.senkouSpanB);
    const latestChikouSpan = Calculator.getLatestValue(values.chikouSpan);
    const latestCloudColor = Calculator.getLatestValue(values.cloudColor);
    const latestSignal = Calculator.getLatestValue(values.signal);

    const result: IchimokuResultType = {
      tenkanSen: latestTenkanSen || 0,
      kijunSen: latestKijunSen || 0,
      senkouSpanA: latestSenkouSpanA || 0,
      senkouSpanB: latestSenkouSpanB || 0,
      chikouSpan: latestChikouSpan || 0,
      cloudColor: latestCloudColor || 'bullish',
      signal: latestSignal || 'neutral',
    };

    return {
      type: 'Ichimoku',
      category: 'trend',
      timestamp: new Date(),
      value: result,
      metadata: {
        parameters: {
          conversionPeriod: config.conversionPeriod,
          basePeriod: config.basePeriod,
          spanBPeriod: config.spanBPeriod,
          displacement: config.displacement,
        },
        calculationTime: Date.now() - startTime,
      },
    };
  }

  /**
   * Calculate Pivot Points (Custom Indicator)
   */
  static async calculatePivotPoints(data: OHLCVData[], config: PivotPointsConfig): Promise<{
    type: 'PivotPoints';
    category: 'support_resistance';
    timestamp: Date;
    value: PivotPointsResultType;
    metadata: any;
  }> {
    const startTime = Date.now();
    const values = await Calculator.calculatePivotPoints(data, config.method);

    const result: PivotPointsResultType = {
      pivot: values.pivot,
      resistance1: values.r1,
      resistance2: values.r2,
      resistance3: values.r3,
      support1: values.s1,
      support2: values.s2,
      support3: values.s3,
      currentPosition: values.position,
    };

    return {
      type: 'PivotPoints',
      category: 'support_resistance',
      timestamp: new Date(),
      value: result,
      metadata: {
        parameters: { method: config.method },
        calculationTime: Date.now() - startTime,
      },
    };
  }

  /**
   * Calculate Fibonacci Retracement (Custom Indicator)
   * @param config - Fibonacci configuration
   * @param currentPrice - Optional current price for nearest level calculation
   */
  static async calculateFibonacciRetracement(
    config: FibonacciRetracementConfig,
    currentPrice?: number
  ): Promise<{
    type: 'FibonacciRetracement';
    category: 'support_resistance';
    timestamp: Date;
    value: FibonacciRetracementResultType;
    metadata: any;
  }> {
    const startTime = Date.now();
    const values = await Calculator.calculateFibonacciRetracement(
      config.high,
      config.low,
      config.trend,
      currentPrice
    );

    const result: FibonacciRetracementResultType = {
      level_0: values.level_0,
      level_236: values.level_236,
      level_382: values.level_382,
      level_500: values.level_500,
      level_618: values.level_618,
      level_786: values.level_786,
      level_100: values.level_100,
      level_1272: values.level_1272,
      level_1618: values.level_1618,
      nearestLevel: values.nearestLevel,
      nearestLevelName: values.nearestLevelName,
    };

    return {
      type: 'FibonacciRetracement',
      category: 'support_resistance',
      timestamp: new Date(),
      value: result,
      metadata: {
        parameters: {
          high: config.high,
          low: config.low,
          trend: config.trend,
        },
        calculationTime: Date.now() - startTime,
      },
    };
  }

  /**
   * Generic calculate method that routes to appropriate calculator
   *
   * Note: Only supports key indicators. For other indicators,
   * use calculator-v2 functions directly.
   */
  static async calculate(data: OHLCVData[], config: BaseIndicatorConfig): Promise<IndicatorResult<any>> {
    switch (config.type) {
      case 'RSI':
        return this.calculateRSI(data, config as RSIConfig);
      case 'MACD':
        return this.calculateMACD(data, config as MACDConfig);
      case 'BollingerBands':
        return this.calculateBollingerBands(data, config as BollingerBandsConfig);
      case 'ATR':
        return this.calculateATR(data, config as ATRConfig);
      case 'SMA':
        return this.calculateSMA(data, config as SMAConfig);
      case 'EMA':
        return this.calculateEMA(data, config as EMAConfig);
      case 'VWAP':
        return this.calculateVWAP(data, config as VWAPConfig);
      default:
        throw new Error(
          `Indicator type ${config.type} not implemented in factory. ` +
          `Use calculator-v2 functions directly for ${config.type}.`
        );
    }
  }
}

/**
 * Export convenience functions (renamed to avoid conflicts with calculator-v2)
 */
export const factoryCalculateRSI = IndicatorFactory.calculateRSI.bind(IndicatorFactory);
export const factoryCalculateMACD = IndicatorFactory.calculateMACD.bind(IndicatorFactory);
export const factoryCalculateBollingerBands = IndicatorFactory.calculateBollingerBands.bind(IndicatorFactory);
export const factoryCalculateATR = IndicatorFactory.calculateATR.bind(IndicatorFactory);
export const factoryCalculateSMA = IndicatorFactory.calculateSMA.bind(IndicatorFactory);
export const factoryCalculateEMA = IndicatorFactory.calculateEMA.bind(IndicatorFactory);
export const factoryCalculateVWAP = IndicatorFactory.calculateVWAP.bind(IndicatorFactory);

// Custom indicators
export const factoryCalculateSuperTrend = IndicatorFactory.calculateSuperTrend.bind(IndicatorFactory);
export const factoryCalculateIchimoku = IndicatorFactory.calculateIchimoku.bind(IndicatorFactory);
export const factoryCalculatePivotPoints = IndicatorFactory.calculatePivotPoints.bind(IndicatorFactory);
export const factoryCalculateFibonacciRetracement = IndicatorFactory.calculateFibonacciRetracement.bind(IndicatorFactory);
