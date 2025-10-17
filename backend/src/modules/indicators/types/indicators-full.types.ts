/**
 * Complete Technical Indicators Types
 * ALL 106 indicators from @ixjb94/indicators library v1.2.4
 *
 * @module indicators/types/indicators-full
 */

// ============================================================================
// COMPLETE INDICATOR TYPE ENUM (106 INDICATORS)
// ============================================================================

/**
 * All supported technical indicator types (106 total)
 * Organized by category for better navigation
 */
export type IndicatorType =
  // ========== TREND / MOVING AVERAGES (19) ==========
  | 'SMA'           // Simple Moving Average
  | 'EMA'           // Exponential Moving Average
  | 'WMA'           // Weighted Moving Average
  | 'DEMA'          // Double Exponential MA
  | 'TEMA'          // Triple Exponential MA
  | 'HMA'           // Hull Moving Average
  | 'KAMA'          // Kaufman Adaptive MA
  | 'ZLEMA'         // Zero-Lag EMA
  | 'VWMA'          // Volume Weighted MA
  | 'ALMA'          // Arnaud Legoux MA
  | 'TRIMA'         // Triangular MA
  | 'MAMA'          // MESA Adaptive MA
  | 'CCI'           // Commodity Channel Index
  | 'MACD'          // Moving Average Convergence Divergence
  | 'MarketFI'      // Market Facilitation Index
  | 'MASS'          // Mass Index
  | 'MAX'           // Maximum value
  | 'Normalize'     // Normalize data
  | 'Normalize2'    // Alternative normalization

  // ========== MOMENTUM (9) ==========
  | 'RSI'           // Relative Strength Index
  | 'StochRSI'      // Stochastic RSI
  | 'Stoch'         // Stochastic Oscillator
  | 'ROC'           // Rate of Change
  | 'ROCR'          // Rate of Change Ratio
  | 'MFI'           // Money Flow Index
  | 'CMO'           // Chande Momentum Oscillator
  | 'TSI'           // True Strength Index
  | 'Fisher'        // Fisher Transform

  // ========== VOLATILITY (4) ==========
  | 'ATR'           // Average True Range
  | 'NATR'          // Normalized ATR
  | 'StdDev'        // Standard Deviation
  | 'StdErr'        // Standard Error

  // ========== VOLUME (9) ==========
  | 'OBV'           // On Balance Volume
  | 'VWAP'          // Volume Weighted Average Price
  | 'AD'            // Accumulation/Distribution
  | 'ADOSC'         // AD Oscillator
  | 'CMF'           // Chaikin Money Flow
  | 'KVO'           // Klinger Volume Oscillator
  | 'WAD'           // Williams Accumulation/Distribution
  | 'ADX'           // Average Directional Index
  | 'ADXR'          // ADX Rating

  // ========== SUPPORT/RESISTANCE (3) ==========
  | 'Aroon'         // Aroon Indicator
  | 'AroonOsc'      // Aroon Oscillator
  | 'PSAR'          // Parabolic SAR

  // ========== BANDS & CHANNELS (6) ==========
  | 'BBands'        // Bollinger Bands
  | 'KC'            // Keltner Channels
  | 'DC'            // Donchian Channels
  | 'ABands'        // Acceleration Bands
  | 'PBands'        // Price Bands
  | 'CE'            // Chandelier Exit

  // ========== OSCILLATORS (15) ==========
  | 'AO'            // Awesome Oscillator
  | 'APO'           // Absolute Price Oscillator
  | 'BOP'           // Balance of Power
  | 'CVI'           // Chaikin Volatility Index
  | 'DPO'           // Detrended Price Oscillator
  | 'FOSC'          // Forecast Oscillator
  | 'KST'           // Know Sure Thing
  | 'POSC'          // Price Oscillator
  | 'PPO'           // Percentage Price Oscillator
  | 'QStick'        // QStick
  | 'RVI'           // Relative Volatility Index
  | 'SMI'           // Stochastic Momentum Index
  | 'TRIX'          // Triple Exponential Average
  | 'UltOsc'        // Ultimate Oscillator
  | 'VOSC'          // Volume Oscillator

  // ========== PRICE CALCULATIONS (5) ==========
  | 'AvgPrice'      // Average Price
  | 'MedPrice'      // Median Price
  | 'TypPrice'      // Typical Price
  | 'WCPrice'       // Weighted Close Price
  | 'TR'            // True Range

  // ========== DIRECTIONAL INDICATORS (3) ==========
  | 'DI'            // Directional Indicator
  | 'DM'            // Directional Movement
  | 'DX'            // Directional Movement Index

  // ========== LINEAR REGRESSION (4) ==========
  | 'LinReg'        // Linear Regression
  | 'LinRegIntercept' // Linear Regression Intercept
  | 'LinRegSlope'   // Linear Regression Slope
  | 'TSF'           // Time Series Forecast

  // ========== INDEX & COMPOSITE (8) ==========
  | 'Copp'          // Coppock Curve
  | 'EMV'           // Ease of Movement
  | 'FI'            // Force Index
  | 'MSW'           // Mesa Sine Wave
  | 'NVI'           // Negative Volume Index
  | 'PVI'           // Positive Volume Index
  | 'PFE'           // Polarized Fractal Efficiency
  | 'VHF'           // Vertical Horizontal Filter

  // ========== ADVANCED TECHNICAL (10) ==========
  | 'RMI'           // Relative Momentum Index
  | 'RMTA'          // Recursive Moving Trend Average
  | 'VIDYA'         // Variable Index Dynamic Average
  | 'Wilders'       // Wilders Smoothing
  | 'WillR'         // Williams %R
  | 'Lag'           // Lag
  | 'MD'            // Mean Deviation
  | 'MIN'           // Minimum
  | 'SUM'           // Sum
  | 'VAR'           // Variance

  // ========== SPECIAL INDICATORS (8) ==========
  | 'Decay'         // Linear Decay
  | 'EDecay'        // Exponential Decay
  | 'Mom'           // Momentum
  | 'PC'            // Price Channel
  | 'Volatility'    // Volatility
  | 'CrossOver'     // CrossOver detection
  | 'CrossUnder'    // CrossUnder detection
  | 'CrossAny'      // Any cross detection

  // ========== ICHIMOKU (1) ==========
  | 'IkhTS';        // Ichimoku Tenkan-Sen + others

/**
 * Indicator category for grouping
 */
export type IndicatorCategory =
  | 'trend'
  | 'momentum'
  | 'volatility'
  | 'volume'
  | 'support_resistance'
  | 'bands_channels'
  | 'oscillators'
  | 'price_calculations'
  | 'directional'
  | 'linear_regression'
  | 'index_composite'
  | 'advanced'
  | 'special';

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

/**
 * Indicator calculation input
 */
export interface IndicatorInput {
  ohlcv: OHLCVData[];
  config: BaseIndicatorConfig;
}

// ============================================================================
// CATEGORY MAPPING
// ============================================================================

/**
 * Map each indicator to its category
 */
export const INDICATOR_CATEGORY_MAP: Record<IndicatorType, IndicatorCategory> = {
  // Trend
  SMA: 'trend',
  EMA: 'trend',
  WMA: 'trend',
  DEMA: 'trend',
  TEMA: 'trend',
  HMA: 'trend',
  KAMA: 'trend',
  ZLEMA: 'trend',
  VWMA: 'trend',
  ALMA: 'trend',
  TRIMA: 'trend',
  MAMA: 'trend',
  CCI: 'trend',
  MACD: 'trend',
  MarketFI: 'trend',
  MASS: 'trend',
  MAX: 'trend',
  Normalize: 'trend',
  Normalize2: 'trend',

  // Momentum
  RSI: 'momentum',
  StochRSI: 'momentum',
  Stoch: 'momentum',
  ROC: 'momentum',
  ROCR: 'momentum',
  MFI: 'momentum',
  CMO: 'momentum',
  TSI: 'momentum',
  Fisher: 'momentum',

  // Volatility
  ATR: 'volatility',
  NATR: 'volatility',
  StdDev: 'volatility',
  StdErr: 'volatility',

  // Volume
  OBV: 'volume',
  VWAP: 'volume',
  AD: 'volume',
  ADOSC: 'volume',
  CMF: 'volume',
  KVO: 'volume',
  WAD: 'volume',
  ADX: 'volume',
  ADXR: 'volume',

  // Support/Resistance
  Aroon: 'support_resistance',
  AroonOsc: 'support_resistance',
  PSAR: 'support_resistance',

  // Bands & Channels
  BBands: 'bands_channels',
  KC: 'bands_channels',
  DC: 'bands_channels',
  ABands: 'bands_channels',
  PBands: 'bands_channels',
  CE: 'bands_channels',

  // Oscillators
  AO: 'oscillators',
  APO: 'oscillators',
  BOP: 'oscillators',
  CVI: 'oscillators',
  DPO: 'oscillators',
  FOSC: 'oscillators',
  KST: 'oscillators',
  POSC: 'oscillators',
  PPO: 'oscillators',
  QStick: 'oscillators',
  RVI: 'oscillators',
  SMI: 'oscillators',
  TRIX: 'oscillators',
  UltOsc: 'oscillators',
  VOSC: 'oscillators',

  // Price Calculations
  AvgPrice: 'price_calculations',
  MedPrice: 'price_calculations',
  TypPrice: 'price_calculations',
  WCPrice: 'price_calculations',
  TR: 'price_calculations',

  // Directional
  DI: 'directional',
  DM: 'directional',
  DX: 'directional',

  // Linear Regression
  LinReg: 'linear_regression',
  LinRegIntercept: 'linear_regression',
  LinRegSlope: 'linear_regression',
  TSF: 'linear_regression',

  // Index/Composite
  Copp: 'index_composite',
  EMV: 'index_composite',
  FI: 'index_composite',
  MSW: 'index_composite',
  NVI: 'index_composite',
  PVI: 'index_composite',
  PFE: 'index_composite',
  VHF: 'index_composite',

  // Advanced
  RMI: 'advanced',
  RMTA: 'advanced',
  VIDYA: 'advanced',
  Wilders: 'advanced',
  WillR: 'advanced',
  Lag: 'advanced',
  MD: 'advanced',
  MIN: 'advanced',
  SUM: 'advanced',
  VAR: 'advanced',

  // Special
  Decay: 'special',
  EDecay: 'special',
  Mom: 'special',
  PC: 'special',
  Volatility: 'special',
  CrossOver: 'special',
  CrossUnder: 'special',
  CrossAny: 'special',

  // Ichimoku
  IkhTS: 'support_resistance',
};

// ============================================================================
// INDICATOR DESCRIPTIONS
// ============================================================================

/**
 * Human-readable descriptions for each indicator
 */
export const INDICATOR_DESCRIPTIONS: Record<IndicatorType, string> = {
  // Trend
  SMA: 'Simple Moving Average - Basic trend indicator',
  EMA: 'Exponential Moving Average - Weighted recent prices',
  WMA: 'Weighted Moving Average - Linear weights',
  DEMA: 'Double Exponential MA - Faster response than EMA',
  TEMA: 'Triple Exponential MA - Even faster than DEMA',
  HMA: 'Hull Moving Average - Reduced lag, very popular in crypto',
  KAMA: 'Kaufman Adaptive MA - Adapts to market volatility',
  ZLEMA: 'Zero-Lag EMA - Eliminates lag component',
  VWMA: 'Volume Weighted MA - Weighted by volume',
  ALMA: 'Arnaud Legoux MA - Gaussian filter',
  TRIMA: 'Triangular MA - Double smoothed',
  MAMA: 'MESA Adaptive MA - Hilbert Transform based',
  CCI: 'Commodity Channel Index - Deviation from average',
  MACD: 'Moving Average Convergence Divergence - Trend following momentum',
  MarketFI: 'Market Facilitation Index - Price movement efficiency',
  MASS: 'Mass Index - Trend reversal identification',
  MAX: 'Maximum value over period',
  Normalize: 'Normalize data between 0 and 1',
  Normalize2: 'Alternative normalization method',

  // Momentum
  RSI: 'Relative Strength Index - Overbought/oversold',
  StochRSI: 'Stochastic RSI - Stochastic applied to RSI',
  Stoch: 'Stochastic Oscillator - %K and %D lines',
  ROC: 'Rate of Change - Price momentum',
  ROCR: 'Rate of Change Ratio - ROC as ratio',
  MFI: 'Money Flow Index - Volume-weighted RSI',
  CMO: 'Chande Momentum Oscillator - Price momentum',
  TSI: 'True Strength Index - Double smoothed momentum',
  Fisher: 'Fisher Transform - Gaussian conversion',

  // Volatility
  ATR: 'Average True Range - Volatility measurement',
  NATR: 'Normalized ATR - ATR as percentage',
  StdDev: 'Standard Deviation - Price dispersion',
  StdErr: 'Standard Error - Regression fit quality',

  // Volume
  OBV: 'On Balance Volume - Volume accumulation',
  VWAP: 'Volume Weighted Average Price - Intraday benchmark',
  AD: 'Accumulation/Distribution - Volume flow',
  ADOSC: 'AD Oscillator - AD with signal line',
  CMF: 'Chaikin Money Flow - Volume-weighted accumulation',
  KVO: 'Klinger Volume Oscillator - Long-term money flow',
  WAD: 'Williams Accumulation/Distribution - Price and volume relationship',
  ADX: 'Average Directional Index - Trend strength',
  ADXR: 'ADX Rating - Smoothed ADX',

  // Support/Resistance
  Aroon: 'Aroon Indicator - Trend strength and direction',
  AroonOsc: 'Aroon Oscillator - Aroon Up minus Aroon Down',
  PSAR: 'Parabolic SAR - Stop and reverse',

  // Bands & Channels
  BBands: 'Bollinger Bands - Volatility bands',
  KC: 'Keltner Channels - ATR-based bands',
  DC: 'Donchian Channels - Breakout indicator',
  ABands: 'Acceleration Bands - Acceleration-based bands',
  PBands: 'Price Bands - Price-based channels',
  CE: 'Chandelier Exit - Volatility stop',

  // Oscillators
  AO: 'Awesome Oscillator - Momentum histogram',
  APO: 'Absolute Price Oscillator - Price momentum',
  BOP: 'Balance of Power - Buyers vs sellers strength',
  CVI: 'Chaikin Volatility Index - Volatility change',
  DPO: 'Detrended Price Oscillator - Cycle identification',
  FOSC: 'Forecast Oscillator - Linear regression deviation',
  KST: 'Know Sure Thing - Weighted ROC oscillator',
  POSC: 'Price Oscillator - Difference between two MAs',
  PPO: 'Percentage Price Oscillator - MACD as percentage',
  QStick: 'QStick - Candlestick average',
  RVI: 'Relative Volatility Index - RSI for high/low',
  SMI: 'Stochastic Momentum Index - Enhanced stochastic',
  TRIX: 'Triple Exponential Average - Rate of change of triple EMA',
  UltOsc: 'Ultimate Oscillator - Multiple timeframe momentum',
  VOSC: 'Volume Oscillator - Volume momentum',

  // Price Calculations
  AvgPrice: 'Average Price - (O+H+L+C)/4',
  MedPrice: 'Median Price - (H+L)/2',
  TypPrice: 'Typical Price - (H+L+C)/3',
  WCPrice: 'Weighted Close Price - (H+L+C+C)/4',
  TR: 'True Range - Max(H-L, |H-PC|, |L-PC|)',

  // Directional
  DI: 'Directional Indicator - +DI and -DI',
  DM: 'Directional Movement - +DM and -DM',
  DX: 'Directional Movement Index - Trend strength',

  // Linear Regression
  LinReg: 'Linear Regression - Best fit line',
  LinRegIntercept: 'Linear Regression Intercept - Y-intercept',
  LinRegSlope: 'Linear Regression Slope - Trend angle',
  TSF: 'Time Series Forecast - Linear regression forecast',

  // Index/Composite
  Copp: 'Coppock Curve - Long-term momentum',
  EMV: 'Ease of Movement - Volume-adjusted price change',
  FI: 'Force Index - Price change and volume',
  MSW: 'Mesa Sine Wave - Hilbert Transform based',
  NVI: 'Negative Volume Index - Down volume days',
  PVI: 'Positive Volume Index - Up volume days',
  PFE: 'Polarized Fractal Efficiency - Efficiency of price movement',
  VHF: 'Vertical Horizontal Filter - Trend vs consolidation',

  // Advanced
  RMI: 'Relative Momentum Index - Enhanced RSI',
  RMTA: 'Recursive Moving Trend Average - Adaptive MA',
  VIDYA: 'Variable Index Dynamic Average - Volatility-adaptive MA',
  Wilders: 'Wilders Smoothing - J. Welles Wilder smoothing',
  WillR: 'Williams %R - Stochastic-like oscillator',
  Lag: 'Lag - Shift data by periods',
  MD: 'Mean Deviation - Average deviation from mean',
  MIN: 'Minimum - Minimum value over period',
  SUM: 'Sum - Sum of values over period',
  VAR: 'Variance - Statistical variance',

  // Special
  Decay: 'Linear Decay - Linear weight decay',
  EDecay: 'Exponential Decay - Exponential weight decay',
  Mom: 'Momentum - Price difference over period',
  PC: 'Price Channel - High/Low channel',
  Volatility: 'Volatility - Price volatility measure',
  CrossOver: 'CrossOver - Detect bullish crossover',
  CrossUnder: 'CrossUnder - Detect bearish crossover',
  CrossAny: 'CrossAny - Detect any crossover',

  // Ichimoku
  IkhTS: 'Ichimoku Tenkan-Sen - Conversion line and more',
};
