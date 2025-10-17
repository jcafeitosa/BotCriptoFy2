/**
 * Strategy Runner Types
 * Type definitions for strategy execution engine
 */

import type { TradingSignal } from '../../bots/engine/execution-engine.types';
import type { TradingStrategy } from '../types/strategies.types';

/**
 * Market Data Point (OHLCV)
 */
export interface MarketDataPoint {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Indicator Result
 */
export interface IndicatorResult {
  name: string;
  type: string;
  value: number | Record<string, number>;
  timestamp: Date;
}

/**
 * Condition Evaluation Result
 */
export interface ConditionEvaluationResult {
  conditionType: 'entry' | 'exit';
  met: boolean;
  score: number; // 0-100
  reasons: string[];
  indicatorValues: Record<string, any>;
}

/**
 * Strategy Evaluation Context
 */
export interface StrategyEvaluationContext {
  strategy: TradingStrategy;
  marketData: MarketDataPoint[];
  indicators: IndicatorResult[];
  currentPrice: number;
  timestamp: Date;
}

/**
 * Strategy Evaluation Result
 */
export interface StrategyEvaluationResult {
  signal: TradingSignal;
  evaluation: ConditionEvaluationResult;
  context: StrategyEvaluationContext;
}

/**
 * Indicator Calculator Interface
 */
export interface IIndicatorCalculator {
  /**
   * Calculate indicator values
   */
  calculate(
    data: MarketDataPoint[],
    config: Record<string, any>
  ): number | Record<string, number>;

  /**
   * Get required minimum data points
   */
  getRequiredPeriod(): number;

  /**
   * Validate configuration
   */
  validateConfig(config: Record<string, any>): boolean;
}

/**
 * Available Indicators
 */
export type IndicatorType =
  | 'sma' // Simple Moving Average
  | 'ema' // Exponential Moving Average
  | 'rsi' // Relative Strength Index
  | 'macd' // Moving Average Convergence Divergence
  | 'bollinger_bands' // Bollinger Bands
  | 'stochastic' // Stochastic Oscillator
  | 'atr' // Average True Range
  | 'adx'; // Average Directional Index

/**
 * Indicator Registry
 */
export type IndicatorRegistry = Record<IndicatorType, IIndicatorCalculator>;

/**
 * Strategy Runner Configuration
 */
export interface StrategyRunnerConfig {
  minDataPoints: number; // Minimum data points required (default: 100)
  maxDataPoints: number; // Maximum data points to keep in memory (default: 500)
  enableCache: boolean; // Enable indicator caching (default: true)
  cacheExpiryMs: number; // Cache expiry time (default: 60000 = 1 minute)
}

/**
 * Strategy Runner Interface
 */
export interface IStrategyRunner {
  /**
   * Evaluate strategy and generate signal
   */
  evaluate(
    strategy: TradingStrategy,
    marketData?: MarketDataPoint[]
  ): Promise<TradingSignal | null>;

  /**
   * Calculate indicators for strategy
   */
  calculateIndicators(
    strategy: TradingStrategy,
    marketData: MarketDataPoint[]
  ): Promise<IndicatorResult[]>;

  /**
   * Evaluate strategy conditions
   */
  evaluateConditions(
    strategy: TradingStrategy,
    indicators: IndicatorResult[],
    currentPrice: number
  ): ConditionEvaluationResult;
}

/**
 * Default Strategy Runner Configuration
 */
export const DEFAULT_STRATEGY_RUNNER_CONFIG: StrategyRunnerConfig = {
  minDataPoints: 100,
  maxDataPoints: 500,
  enableCache: true,
  cacheExpiryMs: 60000, // 1 minute
};
