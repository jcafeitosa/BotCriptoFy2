/**
 * Crypto-Specific Technical Indicators Types
 * Additional indicators popular in cryptocurrency trading
 *
 * @module indicators/types/crypto-indicators
 */

import type { BaseIndicatorConfig } from './indicators.types';

// ============================================================================
// CRYPTO MOMENTUM INDICATORS
// ============================================================================

/**
 * Stochastic RSI Configuration (Very popular in crypto)
 */
export interface StochasticRSIConfig extends BaseIndicatorConfig {
  type: 'StochasticRSI';
  rsiPeriod: number;     // Default: 14
  stochPeriod: number;   // Default: 14
  kPeriod: number;       // Default: 3
  dPeriod: number;       // Default: 3
}

/**
 * Stochastic RSI Result
 */
export interface StochasticRSIResult {
  k: number; // %K (0-100)
  d: number; // %D (0-100)
  overbought: boolean; // > 80
  oversold: boolean; // < 20
  extremeOverbought: boolean; // > 95
  extremeOversold: boolean; // < 5
}

/**
 * Awesome Oscillator Configuration (Bill Williams)
 */
export interface AOConfig extends BaseIndicatorConfig {
  type: 'AO';
  fastPeriod: number;  // Default: 5
  slowPeriod: number;  // Default: 34
}

/**
 * Awesome Oscillator Result
 */
export interface AOResult {
  ao: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  momentum: 'increasing' | 'decreasing';
}

/**
 * True Strength Index Configuration
 */
export interface TSIConfig extends BaseIndicatorConfig {
  type: 'TSI';
  longPeriod: number;   // Default: 25
  shortPeriod: number;  // Default: 13
  signalPeriod: number; // Default: 13
}

/**
 * TSI Result
 */
export interface TSIResult {
  tsi: number; // -100 to +100
  signal: number;
  crossover?: 'bullish' | 'bearish' | null;
}

/**
 * Know Sure Thing Configuration
 */
export interface KSTConfig extends BaseIndicatorConfig {
  type: 'KST';
  roc1: number;    // Default: 10
  roc2: number;    // Default: 15
  roc3: number;    // Default: 20
  roc4: number;    // Default: 30
  sma1: number;    // Default: 10
  sma2: number;    // Default: 10
  sma3: number;    // Default: 10
  sma4: number;    // Default: 15
  signalPeriod: number; // Default: 9
}

/**
 * KST Result
 */
export interface KSTResult {
  kst: number;
  signal: number;
  crossover?: 'bullish' | 'bearish' | null;
}

/**
 * Force Index Configuration
 */
export interface ForceIndexConfig extends BaseIndicatorConfig {
  type: 'ForceIndex';
  period: number; // Default: 13
}

/**
 * Force Index Result
 */
export interface ForceIndexResult {
  forceIndex: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  strength: 'weak' | 'moderate' | 'strong';
}

// ============================================================================
// CRYPTO TREND INDICATORS
// ============================================================================

/**
 * DEMA (Double Exponential Moving Average) Configuration
 */
export interface DEMAConfig extends BaseIndicatorConfig {
  type: 'DEMA';
  period: number; // Default: 20
}

/**
 * DEMA Result
 */
export interface DEMAResult {
  dema: number;
  trend: 'up' | 'down' | 'sideways';
  distance: number;
  distancePercent: number;
}

/**
 * TEMA (Triple Exponential Moving Average) Configuration
 */
export interface TEMAConfig extends BaseIndicatorConfig {
  type: 'TEMA';
  period: number; // Default: 20
}

/**
 * TEMA Result
 */
export interface TEMAResult {
  tema: number;
  trend: 'up' | 'down' | 'sideways';
  distance: number;
  distancePercent: number;
}

/**
 * HMA (Hull Moving Average) Configuration - Very popular in crypto
 */
export interface HMAConfig extends BaseIndicatorConfig {
  type: 'HMA';
  period: number; // Default: 9
}

/**
 * HMA Result
 */
export interface HMAResult {
  hma: number;
  trend: 'up' | 'down' | 'sideways';
  distance: number;
  distancePercent: number;
}

/**
 * Aroon Indicator Configuration
 */
export interface AroonConfig extends BaseIndicatorConfig {
  type: 'Aroon';
  period: number; // Default: 25
}

/**
 * Aroon Result
 */
export interface AroonResult {
  aroonUp: number; // 0-100
  aroonDown: number; // 0-100
  oscillator: number; // aroonUp - aroonDown
  trend: 'strong-up' | 'up' | 'sideways' | 'down' | 'strong-down';
}

/**
 * SuperTrend Configuration (Popular in crypto)
 */
export interface SuperTrendConfig extends BaseIndicatorConfig {
  type: 'SuperTrend';
  period: number;      // Default: 10
  multiplier: number;  // Default: 3
}

/**
 * SuperTrend Result
 */
export interface SuperTrendResult {
  supertrend: number;
  direction: 'up' | 'down';
  signal: 'buy' | 'sell' | 'hold';
}

/**
 * Ichimoku Cloud Configuration (Very popular in crypto)
 */
export interface IchimokuConfig extends BaseIndicatorConfig {
  type: 'Ichimoku';
  conversionPeriod: number;  // Tenkan-sen: Default 9
  basePeriod: number;        // Kijun-sen: Default 26
  spanBPeriod: number;       // Senkou Span B: Default 52
  displacement: number;      // Default: 26
}

/**
 * Ichimoku Result
 */
export interface IchimokuResult {
  tenkanSen: number;      // Conversion Line
  kijunSen: number;       // Base Line
  senkouSpanA: number;    // Leading Span A
  senkouSpanB: number;    // Leading Span B
  chikouSpan: number;     // Lagging Span
  cloudColor: 'bullish' | 'bearish';
  signal: 'strong-buy' | 'buy' | 'neutral' | 'sell' | 'strong-sell';
}

// ============================================================================
// CRYPTO VOLATILITY INDICATORS
// ============================================================================

/**
 * Donchian Channel Configuration (Breakout trading)
 */
export interface DonchianChannelConfig extends BaseIndicatorConfig {
  type: 'DonchianChannel';
  period: number; // Default: 20
}

/**
 * Donchian Channel Result
 */
export interface DonchianChannelResult {
  upper: number;  // Highest high
  middle: number; // Average of upper and lower
  lower: number;  // Lowest low
  position: 'breakout-high' | 'upper-third' | 'middle' | 'lower-third' | 'breakout-low';
  bandwidth: number;
}

// ============================================================================
// CRYPTO VOLUME INDICATORS
// ============================================================================

/**
 * Chaikin Money Flow Configuration
 */
export interface CMFConfig extends BaseIndicatorConfig {
  type: 'CMF';
  period: number; // Default: 20
}

/**
 * CMF Result
 */
export interface CMFResult {
  cmf: number; // -1 to +1
  buyingPressure: boolean; // CMF > 0
  sellingPressure: boolean; // CMF < 0
  strength: 'strong' | 'moderate' | 'weak';
}

/**
 * Volume Oscillator Configuration
 */
export interface VolumeOscillatorConfig extends BaseIndicatorConfig {
  type: 'VolumeOscillator';
  shortPeriod: number; // Default: 5
  longPeriod: number;  // Default: 10
}

/**
 * Volume Oscillator Result
 */
export interface VolumeOscillatorResult {
  oscillator: number; // Percentage difference
  trend: 'increasing' | 'decreasing';
  signal: 'accumulation' | 'distribution' | 'neutral';
}

// ============================================================================
// SUPPORT & RESISTANCE INDICATORS
// ============================================================================

/**
 * Pivot Points Configuration (Classic, Fibonacci, Woodie, Camarilla)
 */
export interface PivotPointsConfig extends BaseIndicatorConfig {
  type: 'PivotPoints';
  method: 'classic' | 'fibonacci' | 'woodie' | 'camarilla'; // Default: classic
}

/**
 * Pivot Points Result
 */
export interface PivotPointsResult {
  pivot: number;      // P
  resistance1: number; // R1
  resistance2: number; // R2
  resistance3: number; // R3
  support1: number;    // S1
  support2: number;    // S2
  support3: number;    // S3
  currentPosition: 'above-R3' | 'R2-R3' | 'R1-R2' | 'P-R1' | 'S1-P' | 'S2-S1' | 'S3-S2' | 'below-S3';
}

/**
 * Fibonacci Retracement Configuration
 */
export interface FibonacciRetracementConfig extends BaseIndicatorConfig {
  type: 'FibonacciRetracement';
  high: number;  // Swing high
  low: number;   // Swing low
  trend: 'uptrend' | 'downtrend';
}

/**
 * Fibonacci Retracement Result
 */
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
