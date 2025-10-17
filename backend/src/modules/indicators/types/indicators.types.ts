/**
 * Technical Indicators Types
 * Type definitions for all technical analysis indicators
 *
 * @module indicators/types
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

/**
 * Supported technical indicator types
 * Only includes indicators available in technicalindicators library v3.1.0
 */
export type IndicatorType =
  // Momentum Indicators
  | 'RSI'           // Relative Strength Index
  | 'MACD'          // Moving Average Convergence Divergence
  | 'Stochastic'    // Stochastic Oscillator
  | 'StochasticRSI' // Stochastic RSI (crypto favorite)
  | 'CCI'           // Commodity Channel Index
  | 'ROC'           // Rate of Change
  | 'MFI'           // Money Flow Index
  | 'Williams_R'    // Williams %R
  | 'AO'            // Awesome Oscillator (Bill Williams)
  | 'KST'           // Know Sure Thing
  | 'ForceIndex'    // Force Index (volume + price)
  // Trend Indicators
  | 'SMA'           // Simple Moving Average
  | 'EMA'           // Exponential Moving Average
  | 'WMA'           // Weighted Moving Average
  | 'WEMA'          // Weighted Exponential Moving Average
  | 'ADX'           // Average Directional Index
  | 'Parabolic_SAR' // Parabolic SAR
  | 'Ichimoku'      // Ichimoku Cloud (very popular in crypto)
  // Volatility Indicators
  | 'BollingerBands'     // Bollinger Bands
  | 'ATR'                // Average True Range
  | 'Keltner'            // Keltner Channels
  | 'StandardDev'        // Standard Deviation
  // Volume Indicators
  | 'OBV'           // On Balance Volume
  | 'VWAP'          // Volume Weighted Average Price (day trading)
  | 'ADL'           // Accumulation/Distribution Line
  // Support/Resistance
  | 'PivotPoints'   // Pivot Points (support/resistance)
  | 'FibonacciRetracement'; // Fibonacci Levels

/**
 * Indicator category for grouping
 */
export type IndicatorCategory = 'momentum' | 'trend' | 'volatility' | 'volume' | 'support_resistance';

/**
 * Timeframe for calculations
 */
export type Timeframe = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '12h' | '1d' | '1w' | '1M';

// ============================================================================
// BASE INTERFACES
// ============================================================================

/**
 * OHLCV Candle data structure
 */
export interface OHLCVData {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Base indicator configuration
 */
export interface BaseIndicatorConfig {
  type: IndicatorType;
  period?: number;
  parameters?: Record<string, any>;
}

/**
 * Indicator calculation input
 */
export interface IndicatorInput {
  ohlcv: OHLCVData[];
  config: BaseIndicatorConfig;
}

/**
 * Generic indicator result
 */
export interface IndicatorResult<T = any> {
  type: IndicatorType;
  category: IndicatorCategory;
  timestamp: Date;
  value: T;
  metadata?: {
    period?: number;
    parameters?: Record<string, any>;
    calculationTime?: number;
  };
}

// ============================================================================
// MOMENTUM INDICATORS
// ============================================================================

/**
 * RSI (Relative Strength Index) Configuration
 */
export interface RSIConfig extends BaseIndicatorConfig {
  type: 'RSI';
  period: number; // Default: 14
}

/**
 * RSI Result
 */
export interface RSIResult {
  rsi: number; // 0-100
  overbought: boolean; // > 70
  oversold: boolean; // < 30
}

/**
 * MACD (Moving Average Convergence Divergence) Configuration
 */
export interface MACDConfig extends BaseIndicatorConfig {
  type: 'MACD';
  fastPeriod: number;    // Default: 12
  slowPeriod: number;    // Default: 26
  signalPeriod: number;  // Default: 9
}

/**
 * MACD Result
 */
export interface MACDResult {
  macd: number;
  signal: number;
  histogram: number;
  crossover?: 'bullish' | 'bearish' | null;
}

/**
 * Stochastic Oscillator Configuration
 */
export interface StochasticConfig extends BaseIndicatorConfig {
  type: 'Stochastic';
  period: number;        // Default: 14 (%K period)
  signalPeriod: number;  // Default: 3 (%D period)
  smoothPeriod: number;  // Default: 3
}

/**
 * Stochastic Result
 */
export interface StochasticResult {
  k: number; // %K line (fast)
  d: number; // %D line (slow/signal)
  overbought: boolean; // > 80
  oversold: boolean; // < 20
}

/**
 * CCI (Commodity Channel Index) Configuration
 */
export interface CCIConfig extends BaseIndicatorConfig {
  type: 'CCI';
  period: number; // Default: 20
}

/**
 * CCI Result
 */
export interface CCIResult {
  cci: number;
  overbought: boolean; // > +100
  oversold: boolean; // < -100
}

/**
 * ROC (Rate of Change) Configuration
 */
export interface ROCConfig extends BaseIndicatorConfig {
  type: 'ROC';
  period: number; // Default: 12
}

/**
 * ROC Result
 */
export interface ROCResult {
  roc: number; // Percentage
  trending: 'up' | 'down' | 'sideways';
}

/**
 * MFI (Money Flow Index) Configuration
 */
export interface MFIConfig extends BaseIndicatorConfig {
  type: 'MFI';
  period: number; // Default: 14
}

/**
 * MFI Result
 */
export interface MFIResult {
  mfi: number; // 0-100
  overbought: boolean; // > 80
  oversold: boolean; // < 20
}

// ============================================================================
// TREND INDICATORS
// ============================================================================

/**
 * SMA (Simple Moving Average) Configuration
 */
export interface SMAConfig extends BaseIndicatorConfig {
  type: 'SMA';
  period: number; // Default: 20
}

/**
 * SMA Result
 */
export interface SMAResult {
  sma: number;
  trend: 'up' | 'down' | 'sideways';
  distance: number; // Distance from current price
  distancePercent: number;
}

/**
 * EMA (Exponential Moving Average) Configuration
 */
export interface EMAConfig extends BaseIndicatorConfig {
  type: 'EMA';
  period: number; // Default: 20
}

/**
 * EMA Result
 */
export interface EMAResult {
  ema: number;
  trend: 'up' | 'down' | 'sideways';
  distance: number;
  distancePercent: number;
}

/**
 * WMA (Weighted Moving Average) Configuration
 */
export interface WMAConfig extends BaseIndicatorConfig {
  type: 'WMA';
  period: number; // Default: 20
}

/**
 * WMA Result
 */
export interface WMAResult {
  wma: number;
  trend: 'up' | 'down' | 'sideways';
}

/**
 * ADX (Average Directional Index) Configuration
 */
export interface ADXConfig extends BaseIndicatorConfig {
  type: 'ADX';
  period: number; // Default: 14
}

/**
 * ADX Result
 */
export interface ADXResult {
  adx: number; // Trend strength (0-100)
  plusDI: number; // +DI
  minusDI: number; // -DI
  trendStrength: 'weak' | 'moderate' | 'strong' | 'very-strong';
  trendDirection: 'up' | 'down' | 'sideways';
}

/**
 * Parabolic SAR Configuration
 */
export interface ParabolicSARConfig extends BaseIndicatorConfig {
  type: 'Parabolic_SAR';
  acceleration: number;     // Default: 0.02
  accelerationMax: number;  // Default: 0.2
}

/**
 * Parabolic SAR Result
 */
export interface ParabolicSARResult {
  sar: number;
  trend: 'bullish' | 'bearish';
  reversal: boolean;
}

// ============================================================================
// VOLATILITY INDICATORS
// ============================================================================

/**
 * Bollinger Bands Configuration
 */
export interface BollingerBandsConfig extends BaseIndicatorConfig {
  type: 'BollingerBands';
  period: number;           // Default: 20
  stdDevMultiplier: number; // Default: 2
}

/**
 * Bollinger Bands Result
 */
export interface BollingerBandsResult {
  upper: number;
  middle: number; // SMA
  lower: number;
  bandwidth: number; // (upper - lower) / middle
  percentB: number; // Position within bands (0-1)
  squeeze: boolean; // Bandwidth < threshold
}

/**
 * ATR (Average True Range) Configuration
 */
export interface ATRConfig extends BaseIndicatorConfig {
  type: 'ATR';
  period: number; // Default: 14
}

/**
 * ATR Result
 */
export interface ATRResult {
  atr: number;
  atrPercent: number; // ATR as % of price
  volatility: 'low' | 'normal' | 'high' | 'extreme';
}

/**
 * Keltner Channels Configuration
 */
export interface KeltnerConfig extends BaseIndicatorConfig {
  type: 'Keltner';
  period: number;         // Default: 20
  atrPeriod: number;      // Default: 10
  atrMultiplier: number;  // Default: 2
}

/**
 * Keltner Channels Result
 */
export interface KeltnerResult {
  upper: number;
  middle: number; // EMA
  lower: number;
  position: 'above' | 'inside' | 'below';
}

/**
 * Standard Deviation Configuration
 */
export interface StandardDevConfig extends BaseIndicatorConfig {
  type: 'StandardDev';
  period: number; // Default: 20
}

/**
 * Standard Deviation Result
 */
export interface StandardDevResult {
  stdDev: number;
  variance: number;
  volatility: 'low' | 'normal' | 'high';
}

// ============================================================================
// VOLUME INDICATORS
// ============================================================================

/**
 * OBV (On Balance Volume) Configuration
 */
export interface OBVConfig extends BaseIndicatorConfig {
  type: 'OBV';
}

/**
 * OBV Result
 */
export interface OBVResult {
  obv: number;
  trend: 'up' | 'down' | 'sideways';
  divergence?: 'bullish' | 'bearish' | null;
}

/**
 * VWAP (Volume Weighted Average Price) Configuration
 */
export interface VWAPConfig extends BaseIndicatorConfig {
  type: 'VWAP';
  period?: number; // Optional rolling period
}

/**
 * VWAP Result
 */
export interface VWAPResult {
  vwap: number;
  distance: number;
  distancePercent: number;
  position: 'above' | 'below' | 'at';
}

/**
 * ADL (Accumulation/Distribution Line) Configuration
 */
export interface ADLConfig extends BaseIndicatorConfig {
  type: 'ADL';
}

/**
 * ADL Result
 */
export interface ADLResult {
  adl: number;
  trend: 'accumulation' | 'distribution' | 'neutral';
  divergence?: 'bullish' | 'bearish' | null;
}

// ============================================================================
// INDICATOR PRESETS
// ============================================================================

/**
 * Pre-configured indicator preset
 */
export interface IndicatorPreset {
  id?: string;
  userId?: string;
  tenantId?: string;

  // Preset details
  name: string;
  description?: string;
  category: IndicatorCategory;
  indicatorType: IndicatorType;

  // Configuration
  configuration: BaseIndicatorConfig;

  // Usage tracking
  isPublic: boolean;
  usageCount: number;

  // Metadata
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Create preset request
 */
export interface CreatePresetRequest {
  name: string;
  description?: string;
  category: IndicatorCategory;
  indicatorType: IndicatorType;
  configuration: BaseIndicatorConfig;
  isPublic?: boolean;
  tags?: string[];
}

/**
 * Update preset request
 */
export interface UpdatePresetRequest {
  name?: string;
  description?: string;
  configuration?: BaseIndicatorConfig;
  isPublic?: boolean;
  tags?: string[];
}

// ============================================================================
// INDICATOR CACHE
// ============================================================================

/**
 * Cached indicator result
 */
export interface CachedIndicator {
  id: string;
  exchangeId: string;
  symbol: string;
  timeframe: Timeframe;
  indicatorType: IndicatorType;
  configuration: BaseIndicatorConfig;
  result: any;
  calculatedAt: Date;
  expiresAt: Date;
  hits: number;
}

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

/**
 * Indicator calculation request
 */
export interface CalculateIndicatorRequest {
  exchangeId: string;
  symbol: string;
  timeframe: Timeframe;
  indicatorType: IndicatorType;
  configuration: BaseIndicatorConfig;
  limit?: number; // Number of candles to fetch
  useCache?: boolean;
}

/**
 * Batch indicator calculation request
 */
export interface BatchCalculateRequest {
  exchangeId: string;
  symbol: string;
  timeframe: Timeframe;
  indicators: BaseIndicatorConfig[];
  limit?: number;
  useCache?: boolean;
}

/**
 * Indicator calculation response
 */
export interface IndicatorCalculationResponse<T = any> {
  success: boolean;
  data?: IndicatorResult<T>;
  error?: string;
  fromCache?: boolean;
  calculationTime?: number;
}

/**
 * Batch calculation response
 */
export interface BatchCalculationResponse {
  success: boolean;
  results: Array<{
    indicatorType: IndicatorType;
    data?: IndicatorResult<any>;
    error?: string;
    fromCache?: boolean;
  }>;
  totalCalculationTime: number;
}

/**
 * Indicator statistics
 */
export interface IndicatorStatistics {
  totalCalculations: number;
  cacheHitRate: number;
  averageCalculationTime: number;
  mostUsedIndicators: Array<{
    type: IndicatorType;
    count: number;
  }>;
}

// ============================================================================
// SERVICE INTERFACE
// ============================================================================

/**
 * Indicator Service Interface
 */
export interface IIndicatorService {
  // Single indicator calculation
  calculate<T = any>(request: CalculateIndicatorRequest): Promise<IndicatorCalculationResponse<T>>;

  // Batch calculation
  calculateBatch(request: BatchCalculateRequest): Promise<BatchCalculationResponse>;

  // Preset management
  createPreset(userId: string, tenantId: string, request: CreatePresetRequest): Promise<IndicatorPreset>;
  getPreset(presetId: string): Promise<IndicatorPreset | null>;
  getPresets(userId: string, tenantId: string, filters?: { category?: IndicatorCategory; indicatorType?: IndicatorType }): Promise<IndicatorPreset[]>;
  updatePreset(presetId: string, userId: string, tenantId: string, updates: UpdatePresetRequest): Promise<IndicatorPreset>;
  deletePreset(presetId: string, userId: string, tenantId: string): Promise<void>;

  // Cache management
  clearCache(exchangeId?: string, symbol?: string, indicatorType?: IndicatorType): Promise<void>;

  // Statistics
  getStatistics(userId: string, tenantId: string): Promise<IndicatorStatistics>;
}
