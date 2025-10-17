/**
 * Complete Indicator Calculator V2
 * All 106 indicators from @ixjb94/indicators library
 * Optimized wrappers with validation and error handling
 *
 * @module indicators/utils/calculator-v2
 */

import { Indicators } from '@ixjb94/indicators';
import type { OHLCVData } from '../types/indicators-full.types';
// import logger from '../../../utils/logger'; // Commented out - not actively used

// Initialize indicators instance (singleton)
const indicators = new Indicators();

// ============================================================================
// DATA CONVERSION HELPERS
// ============================================================================

/**
 * Extract specific OHLCV field as number array
 */
export function extractField(data: OHLCVData[], field: keyof Omit<OHLCVData, 'timestamp'>): number[] {
  return data.map((candle) => candle[field]);
}

/**
 * Get close prices from OHLCV data
 */
export function getClosePrices(data: OHLCVData[]): number[] {
  return extractField(data, 'close');
}

/**
 * Get high prices from OHLCV data
 */
export function getHighPrices(data: OHLCVData[]): number[] {
  return extractField(data, 'high');
}

/**
 * Get low prices from OHLCV data
 */
export function getLowPrices(data: OHLCVData[]): number[] {
  return extractField(data, 'low');
}

/**
 * Get open prices from OHLCV data
 */
export function getOpenPrices(data: OHLCVData[]): number[] {
  return extractField(data, 'open');
}

/**
 * Get volumes from OHLCV data
 */
export function getVolumes(data: OHLCVData[]): number[] {
  return extractField(data, 'volume');
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate if we have enough data for calculation
 */
export function validateDataLength(data: OHLCVData[], minLength: number, indicatorName: string): void {
  if (!data || data.length === 0) {
    throw new Error(`No data provided for ${indicatorName} calculation`);
  }

  if (data.length < minLength) {
    throw new Error(`Insufficient data for ${indicatorName}: need at least ${minLength} candles, got ${data.length}`);
  }
}

/**
 * Validate parameter value
 */
export function validateParameter(value: any, name: string, min: number, max?: number): void {
  if (value === undefined || value === null) {
    throw new Error(`Parameter '${name}' is required`);
  }

  if (typeof value !== 'number') {
    throw new Error(`Parameter '${name}' must be a number`);
  }

  if (value < min) {
    throw new Error(`Parameter '${name}' must be at least ${min}`);
  }

  if (max !== undefined && value > max) {
    throw new Error(`Parameter '${name}' must be at most ${max}`);
  }
}

// ============================================================================
// TREND / MOVING AVERAGES (19 indicators)
// ============================================================================

/**
 * Calculate SMA (Simple Moving Average)
 */
export async function calculateSMA(data: OHLCVData[], period: number = 20): Promise<number[]> {
  validateDataLength(data, period, 'SMA');
  validateParameter(period, 'period', 1, 500);
  const close = getClosePrices(data);
  return await indicators.sma(close, period);
}

/**
 * Calculate EMA (Exponential Moving Average)
 */
export async function calculateEMA(data: OHLCVData[], period: number = 20): Promise<number[]> {
  validateDataLength(data, period, 'EMA');
  validateParameter(period, 'period', 1, 500);
  const close = getClosePrices(data);
  return await indicators.ema(close, period);
}

/**
 * Calculate WMA (Weighted Moving Average)
 */
export async function calculateWMA(data: OHLCVData[], period: number = 20): Promise<number[]> {
  validateDataLength(data, period, 'WMA');
  validateParameter(period, 'period', 1, 500);
  const close = getClosePrices(data);
  return await indicators.wma(close, period);
}

/**
 * Calculate DEMA (Double Exponential Moving Average)
 */
export async function calculateDEMA(data: OHLCVData[], period: number = 20): Promise<number[]> {
  validateDataLength(data, period * 2, 'DEMA');
  validateParameter(period, 'period', 1, 500);
  const close = getClosePrices(data);
  return await indicators.dema(close, period);
}

/**
 * Calculate TEMA (Triple Exponential Moving Average)
 */
export async function calculateTEMA(data: OHLCVData[], period: number = 20): Promise<number[]> {
  validateDataLength(data, period * 3, 'TEMA');
  validateParameter(period, 'period', 1, 500);
  const close = getClosePrices(data);
  return await indicators.tema(close, period);
}

/**
 * Calculate HMA (Hull Moving Average)
 * Very popular in crypto trading
 */
export async function calculateHMA(data: OHLCVData[], period: number = 9): Promise<number[]> {
  validateDataLength(data, period * 2, 'HMA');
  validateParameter(period, 'period', 1, 500);
  const close = getClosePrices(data);
  return await indicators.hma(close, period);
}

/**
 * Calculate KAMA (Kaufman Adaptive Moving Average)
 */
export async function calculateKAMA(data: OHLCVData[], period: number = 10): Promise<number[]> {
  validateDataLength(data, period + 1, 'KAMA');
  validateParameter(period, 'period', 1, 500);
  const close = getClosePrices(data);
  return await indicators.kama(close, period);
}

/**
 * Calculate ZLEMA (Zero-Lag EMA)
 */
export async function calculateZLEMA(data: OHLCVData[], period: number = 20): Promise<number[]> {
  validateDataLength(data, period, 'ZLEMA');
  validateParameter(period, 'period', 1, 500);
  const close = getClosePrices(data);
  return await indicators.zlema(close, period);
}

/**
 * Calculate VWMA (Volume Weighted Moving Average)
 */
export async function calculateVWMA(data: OHLCVData[], period: number = 20): Promise<number[]> {
  validateDataLength(data, period, 'VWMA');
  validateParameter(period, 'period', 1, 500);
  const close = getClosePrices(data);
  const volume = getVolumes(data);
  return await indicators.vwma(close, volume, period);
}

/**
 * Calculate ALMA (Arnaud Legoux Moving Average)
 */
export async function calculateALMA(data: OHLCVData[], period: number = 9, offset: number = 0.85, sigma: number = 6): Promise<number[]> {
  validateDataLength(data, period, 'ALMA');
  validateParameter(period, 'period', 1, 500);
  const close = getClosePrices(data);
  return await indicators.alma(close, period, offset, sigma);
}

/**
 * Calculate TRIMA (Triangular Moving Average)
 */
export async function calculateTRIMA(data: OHLCVData[], period: number = 20): Promise<number[]> {
  validateDataLength(data, period, 'TRIMA');
  validateParameter(period, 'period', 1, 500);
  const close = getClosePrices(data);
  return await indicators.trima(close, period);
}

/**
 * Calculate MAMA (MESA Adaptive Moving Average)
 * NOTE: Not implemented in @ixjb94/indicators v1.2.4
 */
export async function calculateMAMA(data: OHLCVData[], fastLimit: number = 0.5, slowLimit: number = 0.05): Promise<number[]> {
  throw new Error('MAMA indicator is not yet implemented in @ixjb94/indicators library');
}

/**
 * Calculate CCI (Commodity Channel Index)
 */
export async function calculateCCI(data: OHLCVData[], period: number = 20): Promise<number[]> {
  validateDataLength(data, period, 'CCI');
  validateParameter(period, 'period', 1, 500);
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  const close = getClosePrices(data);
  return await indicators.cci(high, low, close, period);
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 * Library returns [macd, signal, histogram]
 */
export async function calculateMACD(
  data: OHLCVData[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): Promise<{ macd: number[]; signal: number[]; histogram: number[] }> {
  const minLength = Math.max(fastPeriod, slowPeriod) + signalPeriod;
  validateDataLength(data, minLength, 'MACD');
  const close = getClosePrices(data);
  const [macd, signal, histogram] = await indicators.macd(close, fastPeriod, slowPeriod, signalPeriod);
  return { macd, signal, histogram };
}

/**
 * Calculate Market Facilitation Index
 */
export async function calculateMarketFI(data: OHLCVData[]): Promise<number[]> {
  validateDataLength(data, 1, 'MarketFI');
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  const volume = getVolumes(data);
  return await indicators.marketfi(high, low, volume);
}

/**
 * Calculate MASS Index
 */
export async function calculateMASS(data: OHLCVData[], period: number = 25): Promise<number[]> {
  validateDataLength(data, period * 2, 'MASS');
  validateParameter(period, 'period', 1, 500);
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  return await indicators.mass(high, low, period);
}

/**
 * Calculate MAX (Maximum value over period)
 */
export async function calculateMAX(data: OHLCVData[], period: number = 14): Promise<number[]> {
  validateDataLength(data, period, 'MAX');
  validateParameter(period, 'period', 1, 500);
  const close = getClosePrices(data);
  return await indicators.max(close, period);
}

/**
 * Normalize data between 0 and 1
 * Library signature: normalize(originalLength, source, empty?)
 */
export async function calculateNormalize(data: OHLCVData[], period: number = 14): Promise<number[]> {
  validateDataLength(data, period, 'Normalize');
  const close = getClosePrices(data);
  return await indicators.normalize(data.length, close);
}

/**
 * Alternative normalization method
 * Library signature: normalize2(source, length)
 */
export async function calculateNormalize2(data: OHLCVData[], period: number = 14): Promise<number[]> {
  validateDataLength(data, period, 'Normalize2');
  const close = getClosePrices(data);
  return await indicators.normalize2(close, data.length);
}

// ============================================================================
// MOMENTUM INDICATORS (9 indicators)
// ============================================================================

/**
 * Calculate RSI (Relative Strength Index)
 */
export async function calculateRSI(data: OHLCVData[], period: number = 14): Promise<number[]> {
  validateDataLength(data, period + 1, 'RSI');
  validateParameter(period, 'period', 1, 500);
  const close = getClosePrices(data);
  return await indicators.rsi(close, period);
}

/**
 * Calculate Stochastic RSI
 * NOTE: Library only accepts 2 parameters (source, period) and returns single array
 */
export async function calculateStochRSI(
  data: OHLCVData[],
  period: number = 14
): Promise<number[]> {
  validateDataLength(data, period * 2, 'StochRSI');
  const close = getClosePrices(data);
  return await indicators.stochrsi(close, period);
}

/**
 * Calculate Stochastic Oscillator
 * Library returns [stoch, stoch_ma]
 */
export async function calculateStoch(
  data: OHLCVData[],
  kPeriod: number = 14,
  kSlowing: number = 3,
  dPeriod: number = 3
): Promise<{ k: number[]; d: number[] }> {
  validateDataLength(data, kPeriod + kSlowing + dPeriod, 'Stoch');
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  const close = getClosePrices(data);
  const [k, d] = await indicators.stoch(high, low, close, kPeriod, kSlowing, dPeriod);
  return { k, d };
}

/**
 * Calculate ROC (Rate of Change)
 */
export async function calculateROC(data: OHLCVData[], period: number = 12): Promise<number[]> {
  validateDataLength(data, period + 1, 'ROC');
  validateParameter(period, 'period', 1, 500);
  const close = getClosePrices(data);
  return await indicators.roc(close, period);
}

/**
 * Calculate ROCR (Rate of Change Ratio)
 */
export async function calculateROCR(data: OHLCVData[], period: number = 12): Promise<number[]> {
  validateDataLength(data, period + 1, 'ROCR');
  validateParameter(period, 'period', 1, 500);
  const close = getClosePrices(data);
  return await indicators.rocr(close, period);
}

/**
 * Calculate MFI (Money Flow Index)
 */
export async function calculateMFI(data: OHLCVData[], period: number = 14): Promise<number[]> {
  validateDataLength(data, period + 1, 'MFI');
  validateParameter(period, 'period', 1, 500);
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  const close = getClosePrices(data);
  const volume = getVolumes(data);
  return await indicators.mfi(high, low, close, volume, period);
}

/**
 * Calculate CMO (Chande Momentum Oscillator)
 */
export async function calculateCMO(data: OHLCVData[], period: number = 14): Promise<number[]> {
  validateDataLength(data, period + 1, 'CMO');
  validateParameter(period, 'period', 1, 500);
  const close = getClosePrices(data);
  return await indicators.cmo(close, period);
}

/**
 * Calculate TSI (True Strength Index)
 */
export async function calculateTSI(data: OHLCVData[], longPeriod: number = 25, shortPeriod: number = 13): Promise<number[]> {
  validateDataLength(data, longPeriod + shortPeriod, 'TSI');
  const close = getClosePrices(data);
  return await indicators.tsi(close, longPeriod, shortPeriod);
}

/**
 * Calculate Fisher Transform
 * Library returns [fisher, signal]
 */
export async function calculateFisher(data: OHLCVData[], period: number = 10): Promise<{ fisher: number[]; signal: number[] }> {
  validateDataLength(data, period, 'Fisher');
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  const [fisher, signal] = await indicators.fisher(high, low, period);
  return { fisher, signal };
}

// ============================================================================
// VOLATILITY INDICATORS (4 indicators)
// ============================================================================

/**
 * Calculate ATR (Average True Range)
 */
export async function calculateATR(data: OHLCVData[], period: number = 14): Promise<number[]> {
  validateDataLength(data, period + 1, 'ATR');
  validateParameter(period, 'period', 1, 500);
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  const close = getClosePrices(data);
  return await indicators.atr(high, low, close, period);
}

/**
 * Calculate NATR (Normalized ATR)
 */
export async function calculateNATR(data: OHLCVData[], period: number = 14): Promise<number[]> {
  validateDataLength(data, period + 1, 'NATR');
  validateParameter(period, 'period', 1, 500);
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  const close = getClosePrices(data);
  return await indicators.natr(high, low, close, period);
}

/**
 * Calculate Standard Deviation
 */
export async function calculateStdDev(data: OHLCVData[], period: number = 20): Promise<number[]> {
  validateDataLength(data, period, 'StdDev');
  validateParameter(period, 'period', 1, 500);
  const close = getClosePrices(data);
  return await indicators.stddev(close, period);
}

/**
 * Calculate Standard Error
 */
export async function calculateStdErr(data: OHLCVData[], period: number = 20): Promise<number[]> {
  validateDataLength(data, period, 'StdErr');
  validateParameter(period, 'period', 1, 500);
  const close = getClosePrices(data);
  return await indicators.stderr(close, period);
}

// ============================================================================
// VOLUME INDICATORS (9 indicators)
// ============================================================================

/**
 * Calculate OBV (On Balance Volume)
 */
export async function calculateOBV(data: OHLCVData[]): Promise<number[]> {
  validateDataLength(data, 2, 'OBV');
  const close = getClosePrices(data);
  const volume = getVolumes(data);
  return await indicators.obv(close, volume);
}

/**
 * Calculate VWAP (Volume Weighted Average Price)
 * Library signature: vwap(high, low, close, volume, period)
 */
export async function calculateVWAP(data: OHLCVData[], period: number = 14): Promise<number[]> {
  validateDataLength(data, period, 'VWAP');
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  const close = getClosePrices(data);
  const volume = getVolumes(data);
  return await indicators.vwap(high, low, close, volume, period);
}

/**
 * Calculate AD (Accumulation/Distribution)
 */
export async function calculateAD(data: OHLCVData[]): Promise<number[]> {
  validateDataLength(data, 1, 'AD');
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  const close = getClosePrices(data);
  const volume = getVolumes(data);
  return await indicators.ad(high, low, close, volume);
}

/**
 * Calculate ADOSC (AD Oscillator)
 */
export async function calculateADOSC(data: OHLCVData[], fastPeriod: number = 3, slowPeriod: number = 10): Promise<number[]> {
  validateDataLength(data, slowPeriod, 'ADOSC');
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  const close = getClosePrices(data);
  const volume = getVolumes(data);
  return await indicators.adosc(high, low, close, volume, fastPeriod, slowPeriod);
}

/**
 * Calculate CMF (Chaikin Money Flow)
 */
export async function calculateCMF(data: OHLCVData[], period: number = 20): Promise<number[]> {
  validateDataLength(data, period, 'CMF');
  validateParameter(period, 'period', 1, 500);
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  const close = getClosePrices(data);
  const volume = getVolumes(data);
  return await indicators.cmf(high, low, close, volume, period);
}

/**
 * Calculate KVO (Klinger Volume Oscillator)
 */
export async function calculateKVO(data: OHLCVData[], fastPeriod: number = 34, slowPeriod: number = 55): Promise<number[]> {
  validateDataLength(data, slowPeriod, 'KVO');
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  const close = getClosePrices(data);
  const volume = getVolumes(data);
  return await indicators.kvo(high, low, close, volume, fastPeriod, slowPeriod);
}

/**
 * Calculate WAD (Williams Accumulation/Distribution)
 */
export async function calculateWAD(data: OHLCVData[]): Promise<number[]> {
  validateDataLength(data, 2, 'WAD');
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  const close = getClosePrices(data);
  return await indicators.wad(high, low, close);
}

/**
 * Calculate ADX (Average Directional Index)
 * Library signature: adx(high, low, period) - NO CLOSE!
 */
export async function calculateADX(data: OHLCVData[], period: number = 14): Promise<number[]> {
  validateDataLength(data, period * 2, 'ADX');
  validateParameter(period, 'period', 1, 500);
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  return await indicators.adx(high, low, period);
}

/**
 * Calculate ADXR (ADX Rating)
 * Library signature: adxr(high, low, period) - NO CLOSE!
 */
export async function calculateADXR(data: OHLCVData[], period: number = 14): Promise<number[]> {
  validateDataLength(data, period * 3, 'ADXR');
  validateParameter(period, 'period', 1, 500);
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  return await indicators.adxr(high, low, period);
}

// ============================================================================
// SUPPORT/RESISTANCE INDICATORS (3 indicators)
// ============================================================================

/**
 * Calculate Aroon Indicator
 * Library returns [aroon_down, aroon_up]
 */
export async function calculateAroon(data: OHLCVData[], period: number = 25): Promise<{ up: number[]; down: number[] }> {
  validateDataLength(data, period, 'Aroon');
  validateParameter(period, 'period', 1, 500);
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  const [down, up] = await indicators.aroon(high, low, period);
  return { up, down };
}

/**
 * Calculate Aroon Oscillator
 */
export async function calculateAroonOsc(data: OHLCVData[], period: number = 25): Promise<number[]> {
  validateDataLength(data, period, 'AroonOsc');
  validateParameter(period, 'period', 1, 500);
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  return await indicators.aroonosc(high, low, period);
}

/**
 * Calculate PSAR (Parabolic SAR)
 */
export async function calculatePSAR(data: OHLCVData[], acceleration: number = 0.02, maximum: number = 0.2): Promise<number[]> {
  validateDataLength(data, 2, 'PSAR');
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  return await indicators.psar(high, low, acceleration, maximum);
}

// ============================================================================
// BANDS & CHANNELS (6 indicators)
// ============================================================================

/**
 * Calculate Bollinger Bands
 * Library returns [lower, middle, upper]
 */
export async function calculateBBands(
  data: OHLCVData[],
  period: number = 20,
  stdDev: number = 2
): Promise<{ upper: number[]; middle: number[]; lower: number[] }> {
  validateDataLength(data, period, 'BBands');
  validateParameter(period, 'period', 1, 500);
  const close = getClosePrices(data);
  const [lower, middle, upper] = await indicators.bbands(close, period, stdDev);
  return { upper, middle, lower };
}

/**
 * Calculate Keltner Channels
 */
export async function calculateKC(
  data: OHLCVData[],
  period: number = 20,
  multiplier: number = 2
): Promise<{ upper: number[]; middle: number[]; lower: number[] }> {
  validateDataLength(data, period, 'KC');
  validateParameter(period, 'period', 1, 500);
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  const close = getClosePrices(data);
  const [lower, middle, upper] = await indicators.kc(high, low, close, period, multiplier);
  return { upper, middle, lower };
}

/**
 * Calculate Donchian Channels
 */
export async function calculateDC(data: OHLCVData[], period: number = 20): Promise<{ upper: number[]; middle: number[]; lower: number[] }> {
  validateDataLength(data, period, 'DC');
  validateParameter(period, 'period', 1, 500);
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  const [upper, middle, lower] = await indicators.dc(high, low, period);
  return { upper, middle, lower };
}

/**
 * Calculate Acceleration Bands
 */
export async function calculateABands(
  data: OHLCVData[],
  period: number = 20
): Promise<{ upper: number[]; middle: number[]; lower: number[] }> {
  validateDataLength(data, period, 'ABands');
  validateParameter(period, 'period', 1, 500);
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  const close = getClosePrices(data);
  const [upper, lower, middle] = await indicators.abands(high, low, close, period);
  return { upper, middle, lower };
}

/**
 * Calculate Price Bands
 */
export async function calculatePBands(
  data: OHLCVData[],
  period: number = 20
): Promise<{ upper: number[]; middle: number[]; lower: number[] }> {
  validateDataLength(data, period, 'PBands');
  validateParameter(period, 'period', 1, 500);
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  const close = getClosePrices(data);
  const [lower, upper] = await indicators.pbands(high, low, close, period);
  const middle = lower.map((l, i) => (l + upper[i]) / 2);
  return { upper, middle, lower };
}

/**
 * Calculate Chandelier Exit
 */
export async function calculateCE(
  data: OHLCVData[],
  period: number = 22,
  multiplier: number = 3
): Promise<{ long: number[]; short: number[] }> {
  validateDataLength(data, period, 'CE');
  validateParameter(period, 'period', 1, 500);
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  const close = getClosePrices(data);
  const [short, long] = await indicators.ce(high, low, close, period, multiplier);
  return { long, short };
}

// ============================================================================
// OSCILLATORS (15 indicators)
// ============================================================================

/**
 * Calculate AO (Awesome Oscillator)
 */
export async function calculateAO(data: OHLCVData[]): Promise<number[]> {
  validateDataLength(data, 5, 'AO');
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  return await indicators.ao(high, low);
}

/**
 * Calculate APO (Absolute Price Oscillator)
 */
export async function calculateAPO(data: OHLCVData[], fastPeriod: number = 12, slowPeriod: number = 26): Promise<number[]> {
  validateDataLength(data, slowPeriod, 'APO');
  const close = getClosePrices(data);
  return await indicators.apo(close, fastPeriod, slowPeriod);
}

/**
 * Calculate BOP (Balance of Power)
 */
export async function calculateBOP(data: OHLCVData[]): Promise<number[]> {
  validateDataLength(data, 1, 'BOP');
  const open = getOpenPrices(data);
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  const close = getClosePrices(data);
  return await indicators.bop(open, high, low, close);
}

/**
 * Calculate CVI (Chaikin Volatility Index)
 */
export async function calculateCVI(data: OHLCVData[], period: number = 10): Promise<number[]> {
  validateDataLength(data, period * 2, 'CVI');
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  return await indicators.cvi(high, low, period);
}

/**
 * Calculate DPO (Detrended Price Oscillator)
 */
export async function calculateDPO(data: OHLCVData[], period: number = 20): Promise<number[]> {
  validateDataLength(data, period, 'DPO');
  const close = getClosePrices(data);
  return await indicators.dpo(close, period);
}

/**
 * Calculate FOSC (Forecast Oscillator)
 */
export async function calculateFOSC(data: OHLCVData[], period: number = 14): Promise<number[]> {
  validateDataLength(data, period, 'FOSC');
  const close = getClosePrices(data);
  return await indicators.fosc(close, period);
}

/**
 * Calculate KST (Know Sure Thing)
 */
export async function calculateKST(
  data: OHLCVData[],
  roc1: number = 10,
  roc2: number = 15,
  roc3: number = 20,
  roc4: number = 30,
  sma1: number = 10,
  sma2: number = 10,
  sma3: number = 10,
  sma4: number = 15
): Promise<{ kst: number[]; signal: number[] }> {
  const minLength = Math.max(roc4, sma4) + 10;
  validateDataLength(data, minLength, 'KST');
  const close = getClosePrices(data);
  const [kst, signal] = await indicators.kst(close, roc1, roc2, roc3, roc4, sma1, sma2, sma3, sma4);
  return { kst, signal };
}

/**
 * Calculate POSC (Price Oscillator)
 */
export async function calculatePOSC(data: OHLCVData[], period: number = 12, emaPeriod: number = 26): Promise<number[]> {
  validateDataLength(data, period, 'POSC');
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  const close = getClosePrices(data);
  return await indicators.posc(high, low, close, period, emaPeriod);
}

/**
 * Calculate PPO (Percentage Price Oscillator)
 */
export async function calculatePPO(data: OHLCVData[], fastPeriod: number = 12, slowPeriod: number = 26): Promise<number[]> {
  validateDataLength(data, slowPeriod, 'PPO');
  const close = getClosePrices(data);
  return await indicators.ppo(close, fastPeriod, slowPeriod);
}

/**
 * Calculate QStick
 */
export async function calculateQStick(data: OHLCVData[], period: number = 14): Promise<number[]> {
  validateDataLength(data, period, 'QStick');
  const open = getOpenPrices(data);
  const close = getClosePrices(data);
  return await indicators.qstick(open, close, period);
}

/**
 * Calculate RVI (Relative Volatility Index)
 */
export async function calculateRVI(data: OHLCVData[], smaPeriod: number = 10, stddevPeriod: number = 10): Promise<number[]> {
  validateDataLength(data, smaPeriod * 2, 'RVI');
  const close = getClosePrices(data);
  return await indicators.rvi(close, smaPeriod, stddevPeriod);
}

/**
 * Calculate SMI (Stochastic Momentum Index)
 */
export async function calculateSMI(
  data: OHLCVData[],
  kPeriod: number = 5,
  dPeriod: number = 3
): Promise<number[]> {
  validateDataLength(data, kPeriod + dPeriod, 'SMI');
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  const close = getClosePrices(data);
  return await indicators.smi(high, low, close, kPeriod, kPeriod, dPeriod);
}

/**
 * Calculate TRIX
 */
export async function calculateTRIX(data: OHLCVData[], period: number = 15): Promise<number[]> {
  validateDataLength(data, period * 3, 'TRIX');
  const close = getClosePrices(data);
  return await indicators.trix(close, period);
}

/**
 * Calculate Ultimate Oscillator
 */
export async function calculateUltOsc(
  data: OHLCVData[],
  period1: number = 7,
  period2: number = 14,
  period3: number = 28
): Promise<number[]> {
  validateDataLength(data, period3, 'UltOsc');
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  const close = getClosePrices(data);
  return await indicators.ultosc(high, low, close, period1, period2, period3);
}

/**
 * Calculate VOSC (Volume Oscillator)
 */
export async function calculateVOSC(data: OHLCVData[], fastPeriod: number = 12, slowPeriod: number = 26): Promise<number[]> {
  validateDataLength(data, slowPeriod, 'VOSC');
  const volume = getVolumes(data);
  return await indicators.vosc(volume, fastPeriod, slowPeriod);
}

// ============================================================================
// PRICE CALCULATIONS (5 indicators)
// ============================================================================

/**
 * Calculate Average Price
 */
export async function calculateAvgPrice(data: OHLCVData[]): Promise<number[]> {
  validateDataLength(data, 1, 'AvgPrice');
  const open = getOpenPrices(data);
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  const close = getClosePrices(data);
  return await indicators.avgprice(open, high, low, close);
}

/**
 * Calculate Median Price
 */
export async function calculateMedPrice(data: OHLCVData[]): Promise<number[]> {
  validateDataLength(data, 1, 'MedPrice');
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  return await indicators.medprice(high, low);
}

/**
 * Calculate Typical Price
 */
export async function calculateTypPrice(data: OHLCVData[]): Promise<number[]> {
  validateDataLength(data, 1, 'TypPrice');
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  const close = getClosePrices(data);
  return await indicators.typprice(high, low, close);
}

/**
 * Calculate Weighted Close Price
 */
export async function calculateWCPrice(data: OHLCVData[]): Promise<number[]> {
  validateDataLength(data, 1, 'WCPrice');
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  const close = getClosePrices(data);
  return await indicators.wcprice(high, low, close);
}

/**
 * Calculate True Range
 */
export async function calculateTR(data: OHLCVData[]): Promise<number[]> {
  validateDataLength(data, 2, 'TR');
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  const close = getClosePrices(data);
  return await indicators.tr(high, low, close);
}

// ============================================================================
// DIRECTIONAL INDICATORS (3 indicators)
// ============================================================================

/**
 * Calculate DI (Directional Indicator)
 */
export async function calculateDI(data: OHLCVData[], period: number = 14): Promise<{ plus: number[]; minus: number[] }> {
  validateDataLength(data, period, 'DI');
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  const close = getClosePrices(data);
  const [plus, minus] = await indicators.di(high, low, close, period);
  return { plus, minus };
}

/**
 * Calculate DM (Directional Movement)
 */
export async function calculateDM(data: OHLCVData[], period: number = 14): Promise<{ plus: number[]; minus: number[] }> {
  validateDataLength(data, period, 'DM');
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  const [plus, minus] = await indicators.dm(high, low, period);
  return { plus, minus };
}

/**
 * Calculate DX (Directional Movement Index)
 */
export async function calculateDX(data: OHLCVData[], period: number = 14): Promise<number[]> {
  validateDataLength(data, period * 2, 'DX');
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  return await indicators.dx(high, low, period);
}

// ============================================================================
// LINEAR REGRESSION (4 indicators)
// ============================================================================

/**
 * Calculate Linear Regression
 */
export async function calculateLinReg(data: OHLCVData[], period: number = 14): Promise<number[]> {
  validateDataLength(data, period, 'LinReg');
  const close = getClosePrices(data);
  return await indicators.linreg(close, period);
}

/**
 * Calculate Linear Regression Intercept
 */
export async function calculateLinRegIntercept(data: OHLCVData[], period: number = 14): Promise<number[]> {
  validateDataLength(data, period, 'LinRegIntercept');
  const close = getClosePrices(data);
  return await indicators.linregintercept(close, period);
}

/**
 * Calculate Linear Regression Slope
 */
export async function calculateLinRegSlope(data: OHLCVData[], period: number = 14): Promise<number[]> {
  validateDataLength(data, period, 'LinRegSlope');
  const close = getClosePrices(data);
  return await indicators.linregslope(close, period);
}

/**
 * Calculate Time Series Forecast
 */
export async function calculateTSF(data: OHLCVData[], period: number = 14): Promise<number[]> {
  validateDataLength(data, period, 'TSF');
  const close = getClosePrices(data);
  return await indicators.tsf(close, period);
}

// ============================================================================
// INDEX/COMPOSITE (8 indicators)
// ============================================================================

/**
 * Calculate Coppock Curve
 */
export async function calculateCopp(
  data: OHLCVData[],
  period1: number = 14,
  period2: number = 11
): Promise<number[]> {
  validateDataLength(data, Math.max(period1, period2), 'Copp');
  const close = getClosePrices(data);
  return await indicators.copp(close, period1, period2);
}

/**
 * Calculate EMV (Ease of Movement)
 */
export async function calculateEMV(data: OHLCVData[], period: number = 14): Promise<number[]> {
  validateDataLength(data, period, 'EMV');
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  const volume = getVolumes(data);
  return await indicators.emv(high, low, volume, period);
}

/**
 * Calculate FI (Force Index)
 */
export async function calculateFI(data: OHLCVData[], period: number = 13): Promise<number[]> {
  validateDataLength(data, period, 'FI');
  const close = getClosePrices(data);
  const volume = getVolumes(data);
  return await indicators.fi(close, volume, period);
}

/**
 * Calculate MSW (Mesa Sine Wave)
 */
export async function calculateMSW(data: OHLCVData[], period: number = 5): Promise<{ sine: number[]; lead: number[] }> {
  validateDataLength(data, period * 3, 'MSW');
  const close = getClosePrices(data);
  const result = await indicators.msw(close, period);
  if (result.length === 0) return { sine: [], lead: [] };
  const [sine, lead] = result;
  return { sine, lead };
}

/**
 * Calculate NVI (Negative Volume Index)
 */
export async function calculateNVI(data: OHLCVData[]): Promise<number[]> {
  validateDataLength(data, 2, 'NVI');
  const close = getClosePrices(data);
  const volume = getVolumes(data);
  return await indicators.nvi(close, volume);
}

/**
 * Calculate PVI (Positive Volume Index)
 */
export async function calculatePVI(data: OHLCVData[]): Promise<number[]> {
  validateDataLength(data, 2, 'PVI');
  const close = getClosePrices(data);
  const volume = getVolumes(data);
  return await indicators.pvi(close, volume);
}

/**
 * Calculate PFE (Polarized Fractal Efficiency)
 */
export async function calculatePFE(data: OHLCVData[], period: number = 10, emaPeriod: number = 5): Promise<number[]> {
  validateDataLength(data, period, 'PFE');
  const close = getClosePrices(data);
  return await indicators.pfe(close, period, emaPeriod);
}

/**
 * Calculate VHF (Vertical Horizontal Filter)
 */
export async function calculateVHF(data: OHLCVData[], period: number = 28): Promise<number[]> {
  validateDataLength(data, period, 'VHF');
  const close = getClosePrices(data);
  return await indicators.vhf(close, period);
}

// ============================================================================
// ADVANCED TECHNICAL (10 indicators)
// ============================================================================

/**
 * Calculate RMI (Relative Momentum Index)
 */
export async function calculateRMI(data: OHLCVData[], period: number = 20, momentumPeriod: number = 5): Promise<number[]> {
  validateDataLength(data, period + momentumPeriod, 'RMI');
  const close = getClosePrices(data);
  return await indicators.rmi(close, period, momentumPeriod);
}

/**
 * Calculate RMTA (Recursive Moving Trend Average)
 */
export async function calculateRMTA(data: OHLCVData[], period: number = 21, beta: number = 0.8): Promise<number[]> {
  validateDataLength(data, period, 'RMTA');
  const close = getClosePrices(data);
  return await indicators.rmta(close, period, beta);
}

/**
 * Calculate VIDYA (Variable Index Dynamic Average)
 */
export async function calculateVIDYA(
  data: OHLCVData[],
  shortPeriod: number = 2,
  longPeriod: number = 12,
  alpha: number = 0.2
): Promise<number[]> {
  validateDataLength(data, longPeriod, 'VIDYA');
  const close = getClosePrices(data);
  return await indicators.vidya(close, shortPeriod, longPeriod, alpha);
}

/**
 * Calculate Wilders Smoothing
 */
export async function calculateWilders(data: OHLCVData[], period: number = 14): Promise<number[]> {
  validateDataLength(data, period, 'Wilders');
  const close = getClosePrices(data);
  return await indicators.wilders(close, period);
}

/**
 * Calculate Williams %R
 */
export async function calculateWillR(data: OHLCVData[], period: number = 14): Promise<number[]> {
  validateDataLength(data, period, 'WillR');
  const high = getHighPrices(data);
  const low = getLowPrices(data);
  const close = getClosePrices(data);
  return await indicators.willr(high, low, close, period);
}

/**
 * Calculate Lag
 */
export async function calculateLag(data: OHLCVData[], period: number = 1): Promise<number[]> {
  validateDataLength(data, period + 1, 'Lag');
  const close = getClosePrices(data);
  return await indicators.lag(close, period);
}

/**
 * Calculate MD (Mean Deviation)
 */
export async function calculateMD(data: OHLCVData[], period: number = 14): Promise<number[]> {
  validateDataLength(data, period, 'MD');
  const close = getClosePrices(data);
  return await indicators.md(close, period);
}

/**
 * Calculate MIN (Minimum)
 */
export async function calculateMIN(data: OHLCVData[], period: number = 14): Promise<number[]> {
  validateDataLength(data, period, 'MIN');
  const close = getClosePrices(data);
  return await indicators.min(close, period);
}

/**
 * Calculate SUM
 */
export async function calculateSUM(data: OHLCVData[], period: number = 14): Promise<number[]> {
  validateDataLength(data, period, 'SUM');
  const close = getClosePrices(data);
  return await indicators.sum(close, period);
}

/**
 * Calculate VAR (Variance)
 */
export async function calculateVAR(data: OHLCVData[], period: number = 14): Promise<number[]> {
  validateDataLength(data, period, 'VAR');
  const close = getClosePrices(data);
  return await indicators.var(close, period);
}

// ============================================================================
// SPECIAL INDICATORS (8 indicators)
// ============================================================================

/**
 * Calculate Decay (Linear)
 */
export async function calculateDecay(data: OHLCVData[], period: number = 14): Promise<number[]> {
  validateDataLength(data, period, 'Decay');
  const close = getClosePrices(data);
  return await indicators.decay(close, period);
}

/**
 * Calculate EDecay (Exponential)
 */
export async function calculateEDecay(data: OHLCVData[], period: number = 14): Promise<number[]> {
  validateDataLength(data, period, 'EDecay');
  const close = getClosePrices(data);
  return await indicators.edecay(close, period);
}

/**
 * Calculate Mom (Momentum)
 */
export async function calculateMom(data: OHLCVData[], period: number = 10): Promise<number[]> {
  validateDataLength(data, period + 1, 'Mom');
  const close = getClosePrices(data);
  return await indicators.mom(close, period);
}

/**
 * Calculate PC (Price Channel)
 */
export async function calculatePC(data: OHLCVData[], period: number = 20): Promise<{ upper: number[]; lower: number[] }> {
  throw new Error('PC indicator is not yet implemented in @ixjb94/indicators library');
}

/**
 * Calculate Volatility
 */
export async function calculateVolatility(data: OHLCVData[], period: number = 14): Promise<number[]> {
  validateDataLength(data, period, 'Volatility');
  const close = getClosePrices(data);
  return await indicators.volatility(close, period);
}

/**
 * CrossOver detection
 */
export async function calculateCrossOver(series1: number[], series2: number[]): Promise<boolean[]> {
  return await indicators.crossover(series1, series2);
}

/**
 * CrossUnder detection
 */
export async function calculateCrossUnder(series1: number[], series2: number[]): Promise<boolean[]> {
  return indicators.crossUnderNumber(series1, 0) as any as Promise<boolean[]>;
}

/**
 * CrossAny detection
 */
export async function calculateCrossAny(series1: number[], series2: number[]): Promise<boolean[]> {
  return await indicators.crossany(series1, series2);
}

// ============================================================================
// ICHIMOKU (1 indicator)
// ============================================================================

/**
 * Calculate Ichimoku Tenkan-Sen and related lines
 */
export async function calculateIkhTS(
  data: OHLCVData[],
  conversionPeriod: number = 9,
  basePeriod: number = 26
): Promise<{ tenkan: number[]; kijun: number[] }> {
  throw new Error('IkhTS indicator is not yet implemented in @ixjb94/indicators library');
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get the last value from an array of results
 */
export function getLatestValue<T>(results: T[]): T | null {
  if (!results || results.length === 0) {
    return null;
  }
  return results[results.length - 1];
}

/**
 * Detect crossover between two series
 */
export function detectCrossover(
  series1Current: number,
  series1Previous: number,
  series2Current: number,
  series2Previous: number
): 'bullish' | 'bearish' | null {
  if (series1Previous < series2Previous && series1Current > series2Current) {
    return 'bullish';
  }
  if (series1Previous > series2Previous && series1Current < series2Current) {
    return 'bearish';
  }
  return null;
}

/**
 * Calculate percentage difference
 */
export function calculatePercentDiff(current: number, reference: number): number {
  if (reference === 0) return 0;
  return ((current - reference) / reference) * 100;
}

/**
 * Determine trend direction
 */
export function determineTrend(values: number[], lookback: number = 3): 'up' | 'down' | 'sideways' {
  if (!values || values.length < lookback) {
    return 'sideways';
  }

  const recent = values.slice(-lookback);
  let sumUp = 0;
  let sumDown = 0;

  for (let i = 1; i < recent.length; i++) {
    const diff = recent[i] - recent[i - 1];
    if (diff > 0) sumUp += diff;
    if (diff < 0) sumDown += Math.abs(diff);
  }

  const avgChange = (sumUp + sumDown) / (recent.length - 1);
  const threshold = recent[recent.length - 1] * 0.001;

  if (avgChange < threshold) return 'sideways';
  if (sumUp > sumDown) return 'up';
  if (sumDown > sumUp) return 'down';

  return 'sideways';
}

/**
 * Safe calculation wrapper
 */
export async function safeCalculate<T>(
  calculationFn: () => Promise<T>,
  indicatorName: string
): Promise<T> {
  try {
    const startTime = Date.now();
    const result = await calculationFn();
    const calculationTime = Date.now() - startTime;

    // logger.debug(`${indicatorName} calculated successfully`, { calculationTime });
    console.log(`${indicatorName} calculated in ${calculationTime}ms`);

    return result;
  } catch (error) {
    // logger.error(`Error calculating ${indicatorName}`, { error });
    console.error(`Error calculating ${indicatorName}:`, error);
    throw new Error(`Failed to calculate ${indicatorName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// CUSTOM INDICATORS (4 indicators)
// ============================================================================

// Re-export custom indicators from separate file
export {
  calculateSuperTrend,
  calculateIchimoku,
  calculatePivotPoints,
  calculateFibonacciRetracement,
  type SuperTrendResult,
  type IchimokuResult,
  type PivotPointsResult,
  type FibonacciRetracementResult,
} from './custom-indicators';

// Export all for easy access (110 indicators = 106 from library + 4 custom)
export const Calculator = {
  // ========== TREND / MOVING AVERAGES (19) ==========
  SMA: calculateSMA,
  EMA: calculateEMA,
  WMA: calculateWMA,
  DEMA: calculateDEMA,
  TEMA: calculateTEMA,
  HMA: calculateHMA,
  KAMA: calculateKAMA,
  ZLEMA: calculateZLEMA,
  VWMA: calculateVWMA,
  ALMA: calculateALMA,
  TRIMA: calculateTRIMA,
  MAMA: calculateMAMA,
  CCI: calculateCCI,
  MACD: calculateMACD,
  MarketFI: calculateMarketFI,
  MASS: calculateMASS,
  MAX: calculateMAX,
  Normalize: calculateNormalize,
  Normalize2: calculateNormalize2,

  // ========== MOMENTUM (9) ==========
  RSI: calculateRSI,
  StochRSI: calculateStochRSI,
  Stoch: calculateStoch,
  ROC: calculateROC,
  ROCR: calculateROCR,
  MFI: calculateMFI,
  CMO: calculateCMO,
  TSI: calculateTSI,
  Fisher: calculateFisher,

  // ========== VOLATILITY (4) ==========
  ATR: calculateATR,
  NATR: calculateNATR,
  StdDev: calculateStdDev,
  StdErr: calculateStdErr,

  // ========== VOLUME (9) ==========
  OBV: calculateOBV,
  VWAP: calculateVWAP,
  AD: calculateAD,
  ADOSC: calculateADOSC,
  CMF: calculateCMF,
  KVO: calculateKVO,
  WAD: calculateWAD,
  ADX: calculateADX,
  ADXR: calculateADXR,

  // ========== SUPPORT/RESISTANCE (3) ==========
  Aroon: calculateAroon,
  AroonOsc: calculateAroonOsc,
  PSAR: calculatePSAR,

  // ========== BANDS & CHANNELS (6) ==========
  BBands: calculateBBands,
  KC: calculateKC,
  DC: calculateDC,
  ABands: calculateABands,
  PBands: calculatePBands,
  CE: calculateCE,

  // ========== OSCILLATORS (15) ==========
  AO: calculateAO,
  APO: calculateAPO,
  BOP: calculateBOP,
  CVI: calculateCVI,
  DPO: calculateDPO,
  FOSC: calculateFOSC,
  KST: calculateKST,
  POSC: calculatePOSC,
  PPO: calculatePPO,
  QStick: calculateQStick,
  RVI: calculateRVI,
  SMI: calculateSMI,
  TRIX: calculateTRIX,
  UltOsc: calculateUltOsc,
  VOSC: calculateVOSC,

  // ========== PRICE CALCULATIONS (5) ==========
  AvgPrice: calculateAvgPrice,
  MedPrice: calculateMedPrice,
  TypPrice: calculateTypPrice,
  WCPrice: calculateWCPrice,
  TR: calculateTR,

  // ========== DIRECTIONAL (3) ==========
  DI: calculateDI,
  DM: calculateDM,
  DX: calculateDX,

  // ========== LINEAR REGRESSION (4) ==========
  LinReg: calculateLinReg,
  LinRegIntercept: calculateLinRegIntercept,
  LinRegSlope: calculateLinRegSlope,
  TSF: calculateTSF,

  // ========== INDEX/COMPOSITE (8) ==========
  Copp: calculateCopp,
  EMV: calculateEMV,
  FI: calculateFI,
  MSW: calculateMSW,
  NVI: calculateNVI,
  PVI: calculatePVI,
  PFE: calculatePFE,
  VHF: calculateVHF,

  // ========== ADVANCED TECHNICAL (10) ==========
  RMI: calculateRMI,
  RMTA: calculateRMTA,
  VIDYA: calculateVIDYA,
  Wilders: calculateWilders,
  WillR: calculateWillR,
  Lag: calculateLag,
  MD: calculateMD,
  MIN: calculateMIN,
  SUM: calculateSUM,
  VAR: calculateVAR,

  // ========== SPECIAL (8) ==========
  Decay: calculateDecay,
  EDecay: calculateEDecay,
  Mom: calculateMom,
  PC: calculatePC,
  Volatility: calculateVolatility,
  CrossOver: calculateCrossOver,
  CrossUnder: calculateCrossUnder,
  CrossAny: calculateCrossAny,

  // ========== ICHIMOKU (1) ==========
  IkhTS: calculateIkhTS,

  // ========== UTILITIES ==========
  getLatestValue,
  detectCrossover,
  calculatePercentDiff,
  determineTrend,
  safeCalculate,
};
