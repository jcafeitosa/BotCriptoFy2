/**
 * Indicator Presets
 * Pre-configured indicator settings for common trading strategies
 *
 * @module indicators/presets
 */

import type {
  RSIConfig,
  MACDConfig,
  StochasticConfig,
  SMAConfig,
  EMAConfig,
  ADXConfig,
  BollingerBandsConfig,
  ATRConfig,
  VWAPConfig,
} from '../types/indicators.types';

// ============================================================================
// SCALPING PRESETS (1m-5m timeframes)
// ============================================================================

export const ScalpingPresets = {
  rsi: {
    type: 'RSI',
    period: 7,
  } as RSIConfig,

  emaFast: {
    type: 'EMA',
    period: 9,
  } as EMAConfig,

  emaSlow: {
    type: 'EMA',
    period: 21,
  } as EMAConfig,

  stochastic: {
    type: 'Stochastic',
    period: 5,
    signalPeriod: 3,
    smoothPeriod: 3,
  } as StochasticConfig,

  bollinger: {
    type: 'BollingerBands',
    period: 10,
    stdDevMultiplier: 2,
  } as BollingerBandsConfig,
};

// ============================================================================
// DAY TRADING PRESETS (15m-1h timeframes)
// ============================================================================

export const DayTradingPresets = {
  rsi: {
    type: 'RSI',
    period: 14,
  } as RSIConfig,

  macd: {
    type: 'MACD',
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
  } as MACDConfig,

  ema20: {
    type: 'EMA',
    period: 20,
  } as EMAConfig,

  ema50: {
    type: 'EMA',
    period: 50,
  } as EMAConfig,

  bollinger: {
    type: 'BollingerBands',
    period: 20,
    stdDevMultiplier: 2,
  } as BollingerBandsConfig,

  vwap: {
    type: 'VWAP',
  } as VWAPConfig,

  atr: {
    type: 'ATR',
    period: 14,
  } as ATRConfig,
};

// ============================================================================
// SWING TRADING PRESETS (4h-1d timeframes)
// ============================================================================

export const SwingTradingPresets = {
  rsi: {
    type: 'RSI',
    period: 14,
  } as RSIConfig,

  macd: {
    type: 'MACD',
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
  } as MACDConfig,

  ema50: {
    type: 'EMA',
    period: 50,
  } as EMAConfig,

  ema200: {
    type: 'EMA',
    period: 200,
  } as EMAConfig,

  sma50: {
    type: 'SMA',
    period: 50,
  } as SMAConfig,

  sma200: {
    type: 'SMA',
    period: 200,
  } as SMAConfig,

  adx: {
    type: 'ADX',
    period: 14,
  } as ADXConfig,

  atr: {
    type: 'ATR',
    period: 14,
  } as ATRConfig,

  bollinger: {
    type: 'BollingerBands',
    period: 20,
    stdDevMultiplier: 2,
  } as BollingerBandsConfig,
};

// ============================================================================
// TREND FOLLOWING PRESETS
// ============================================================================

export const TrendFollowingPresets = {
  ema20: {
    type: 'EMA',
    period: 20,
  } as EMAConfig,

  ema50: {
    type: 'EMA',
    period: 50,
  } as EMAConfig,

  adxStrong: {
    type: 'ADX',
    period: 14,
  } as ADXConfig,

  macd: {
    type: 'MACD',
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
  } as MACDConfig,
};

// ============================================================================
// MEAN REVERSION PRESETS
// ============================================================================

export const MeanReversionPresets = {
  rsi: {
    type: 'RSI',
    period: 14,
  } as RSIConfig,

  bollingerTight: {
    type: 'BollingerBands',
    period: 20,
    stdDevMultiplier: 1.5,
  } as BollingerBandsConfig,

  sma: {
    type: 'SMA',
    period: 20,
  } as SMAConfig,
};

// ============================================================================
// VOLATILITY BREAKOUT PRESETS
// ============================================================================

export const VolatilityBreakoutPresets = {
  bollingerWide: {
    type: 'BollingerBands',
    period: 20,
    stdDevMultiplier: 2.5,
  } as BollingerBandsConfig,

  atr: {
    type: 'ATR',
    period: 14,
  } as ATRConfig,

  adx: {
    type: 'ADX',
    period: 14,
  } as ADXConfig,
};

// ============================================================================
// EXPORT ALL PRESETS
// ============================================================================

export const IndicatorPresets = {
  scalping: ScalpingPresets,
  dayTrading: DayTradingPresets,
  swingTrading: SwingTradingPresets,
  trendFollowing: TrendFollowingPresets,
  meanReversion: MeanReversionPresets,
  volatilityBreakout: VolatilityBreakoutPresets,
};

// ============================================================================
// PRESET DESCRIPTIONS
// ============================================================================

export const PresetDescriptions = {
  scalping: {
    name: 'Scalping',
    description: 'Fast-paced trading on 1m-5m timeframes with quick entries/exits',
    timeframes: ['1m', '3m', '5m'],
    riskLevel: 'high',
  },
  dayTrading: {
    name: 'Day Trading',
    description: 'Intraday trading on 15m-1h timeframes, closing positions before EOD',
    timeframes: ['15m', '30m', '1h'],
    riskLevel: 'medium',
  },
  swingTrading: {
    name: 'Swing Trading',
    description: 'Multi-day positions on 4h-1d timeframes, capturing larger moves',
    timeframes: ['4h', '6h', '12h', '1d'],
    riskLevel: 'medium',
  },
  trendFollowing: {
    name: 'Trend Following',
    description: 'Riding established trends with moving averages and ADX',
    timeframes: ['1h', '4h', '1d'],
    riskLevel: 'low',
  },
  meanReversion: {
    name: 'Mean Reversion',
    description: 'Trading overbought/oversold conditions, expecting price to revert',
    timeframes: ['15m', '1h', '4h'],
    riskLevel: 'medium',
  },
  volatilityBreakout: {
    name: 'Volatility Breakout',
    description: 'Trading volatility expansions after consolidation periods',
    timeframes: ['1h', '4h', '1d'],
    riskLevel: 'high',
  },
};
