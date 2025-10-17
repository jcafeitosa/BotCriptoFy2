/**
 * Strategy Runner
 * Evaluates trading strategies and generates signals
 */

import logger from '@/utils/logger';
import { OHLCVService } from '../../market-data/services/ohlcv.service';
import type { TradingSignal } from '../../bots/engine/execution-engine.types';
import type { TradingStrategy, ConditionRule, StrategyCondition } from '../types/strategies.types';
import type {
  IStrategyRunner,
  StrategyRunnerConfig,
  MarketDataPoint,
  IndicatorResult,
  ConditionEvaluationResult,
  IIndicatorCalculator,
} from './strategy-runner.types';
import { DEFAULT_STRATEGY_RUNNER_CONFIG } from './strategy-runner.types';
import { INDICATOR_REGISTRY } from './indicators';

/**
 * Strategy Runner Implementation
 */
export class StrategyRunner implements IStrategyRunner {
  private config: StrategyRunnerConfig;
  private indicators: Map<string, IIndicatorCalculator>;
  private cache: Map<string, { data: any; timestamp: number }>;

  constructor(config?: Partial<StrategyRunnerConfig>) {
    this.config = { ...DEFAULT_STRATEGY_RUNNER_CONFIG, ...config };
    this.indicators = new Map(Object.entries(INDICATOR_REGISTRY));
    this.cache = new Map();
  }

  /**
   * Evaluate strategy and generate trading signal
   */
  async evaluate(
    strategy: TradingStrategy,
    marketData?: MarketDataPoint[]
  ): Promise<TradingSignal | null> {
    try {
      logger.debug('Evaluating strategy', { strategyId: strategy.id, strategyName: strategy.name });

      // Fetch market data if not provided
      if (!marketData || marketData.length === 0) {
        marketData = await this.fetchMarketData(strategy);
      }

      if (marketData.length < this.config.minDataPoints) {
        logger.warn('Insufficient market data for strategy evaluation', {
          strategyId: strategy.id,
          dataPoints: marketData.length,
          required: this.config.minDataPoints,
        });
        return null;
      }

      // Calculate indicators
      const indicators = await this.calculateIndicators(strategy, marketData);

      if (indicators.length === 0) {
        logger.warn('No indicators calculated', { strategyId: strategy.id });
        return null;
      }

      // Get current price
      const currentPrice = marketData[marketData.length - 1].close;

      // Evaluate conditions
      const evaluation = this.evaluateConditions(strategy, indicators, currentPrice);

      if (!evaluation.met) {
        logger.debug('Strategy conditions not met', {
          strategyId: strategy.id,
          score: evaluation.score,
        });
        return null;
      }

      // Generate signal
      const signal = this.generateSignal(strategy, evaluation, currentPrice);

      logger.info('Trading signal generated', {
        strategyId: strategy.id,
        type: signal.type,
        strength: signal.strength,
        confidence: signal.confidence,
      });

      return signal;
    } catch (error) {
      logger.error('Strategy evaluation failed', {
        strategyId: strategy.id,
        error: error instanceof Error ? error.message : String(error),
      });

      // Return null instead of throwing to allow bot to continue
      return null;
    }
  }

  /**
   * Calculate all indicators for strategy
   */
  async calculateIndicators(
    strategy: TradingStrategy,
    marketData: MarketDataPoint[]
  ): Promise<IndicatorResult[]> {
    const results: IndicatorResult[] = [];

    for (const indicatorConfig of strategy.indicators) {
      if (!indicatorConfig.enabled) {
        continue;
      }

      const calculator = this.indicators.get(indicatorConfig.type);
      if (!calculator) {
        logger.warn('Unknown indicator type', { type: indicatorConfig.type });
        continue;
      }

      // Check if we have enough data
      const requiredPeriod = calculator.getRequiredPeriod();
      if (marketData.length < requiredPeriod) {
        logger.warn('Insufficient data for indicator', {
          type: indicatorConfig.type,
          dataPoints: marketData.length,
          required: requiredPeriod,
        });
        continue;
      }

      // Validate configuration
      if (!calculator.validateConfig(indicatorConfig.parameters)) {
        logger.warn('Invalid indicator configuration', {
          type: indicatorConfig.type,
          parameters: indicatorConfig.parameters,
        });
        continue;
      }

      // Calculate indicator
      try {
        const value = calculator.calculate(marketData, indicatorConfig.parameters);

        results.push({
          name: indicatorConfig.type,
          type: indicatorConfig.type,
          value,
          timestamp: marketData[marketData.length - 1].timestamp,
        });

        logger.debug('Indicator calculated', {
          type: indicatorConfig.type,
          value,
        });
      } catch (error) {
        logger.error('Indicator calculation failed', {
          type: indicatorConfig.type,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  /**
   * Evaluate strategy conditions
   */
  evaluateConditions(
    strategy: TradingStrategy,
    indicators: IndicatorResult[],
    currentPrice: number
  ): ConditionEvaluationResult {
    const result: ConditionEvaluationResult = {
      conditionType: 'entry',
      met: false,
      score: 0,
      reasons: [],
      indicatorValues: {},
    };

    // Build indicator values map
    const indicatorValues: Record<string, any> = {};
    for (const indicator of indicators) {
      indicatorValues[indicator.name] = indicator.value;
    }
    result.indicatorValues = indicatorValues;

    // Evaluate each condition
    for (const condition of strategy.conditions) {
      const conditionMet = this.evaluateCondition(condition, indicatorValues, currentPrice);

      if (conditionMet.met) {
        result.met = true;
        result.conditionType = condition.type;
        result.score += conditionMet.score;
        result.reasons.push(...conditionMet.reasons);
      }
    }

    // Normalize score to 0-100
    result.score = Math.min(result.score, 100);

    return result;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    condition: StrategyCondition,
    indicatorValues: Record<string, any>,
    currentPrice: number
  ): { met: boolean; score: number; reasons: string[] } {
    const results = {
      met: false,
      score: 0,
      reasons: [] as string[],
    };

    const ruleResults: boolean[] = [];
    let totalWeight = 0;
    let weightedScore = 0;

    // Evaluate each rule
    for (const rule of condition.rules) {
      const ruleResult = this.evaluateRule(rule, indicatorValues, currentPrice);
      ruleResults.push(ruleResult.met);

      if (ruleResult.met) {
        const weight = rule.weight || 1;
        totalWeight += weight;
        weightedScore += weight;
        results.reasons.push(ruleResult.reason);
      }
    }

    // Determine if condition is met based on logic
    if (condition.logic === 'AND') {
      results.met = ruleResults.every((r) => r);
      results.score = results.met ? 100 : 0;
    } else {
      // OR logic
      results.met = ruleResults.some((r) => r);
      results.score = totalWeight > 0 ? (weightedScore / totalWeight) * 100 : 0;
    }

    return results;
  }

  /**
   * Evaluate a single rule
   */
  private evaluateRule(
    rule: ConditionRule,
    indicatorValues: Record<string, any>,
    _currentPrice: number
  ): { met: boolean; reason: string } {
    const indicatorValue = indicatorValues[rule.indicator];

    if (indicatorValue === undefined) {
      return { met: false, reason: `Indicator ${rule.indicator} not found` };
    }

    // Handle complex indicator values (e.g., MACD, Bollinger Bands)
    let actualValue: number;
    if (typeof indicatorValue === 'object') {
      // For complex indicators, use the first numeric property
      actualValue = Object.values(indicatorValue)[0] as number;
    } else {
      actualValue = indicatorValue as number;
    }

    // Convert rule value to number if it's a string
    const ruleValue = typeof rule.value === 'string' ? parseFloat(rule.value) : rule.value;

    // Evaluate operator
    let met = false;
    let reason = '';

    switch (rule.operator) {
      case '>':
        met = actualValue > ruleValue;
        reason = met
          ? `${rule.indicator} (${actualValue.toFixed(2)}) > ${ruleValue}`
          : `${rule.indicator} (${actualValue.toFixed(2)}) not > ${ruleValue}`;
        break;

      case '<':
        met = actualValue < ruleValue;
        reason = met
          ? `${rule.indicator} (${actualValue.toFixed(2)}) < ${ruleValue}`
          : `${rule.indicator} (${actualValue.toFixed(2)}) not < ${ruleValue}`;
        break;

      case '>=':
        met = actualValue >= ruleValue;
        reason = met
          ? `${rule.indicator} (${actualValue.toFixed(2)}) >= ${ruleValue}`
          : `${rule.indicator} (${actualValue.toFixed(2)}) not >= ${ruleValue}`;
        break;

      case '<=':
        met = actualValue <= ruleValue;
        reason = met
          ? `${rule.indicator} (${actualValue.toFixed(2)}) <= ${ruleValue}`
          : `${rule.indicator} (${actualValue.toFixed(2)}) not <= ${ruleValue}`;
        break;

      case '==':
        met = Math.abs(actualValue - ruleValue) < 0.0001; // Float comparison tolerance
        reason = met
          ? `${rule.indicator} (${actualValue.toFixed(2)}) == ${ruleValue}`
          : `${rule.indicator} (${actualValue.toFixed(2)}) not == ${ruleValue}`;
        break;

      case '!=':
        met = Math.abs(actualValue - ruleValue) >= 0.0001;
        reason = met
          ? `${rule.indicator} (${actualValue.toFixed(2)}) != ${ruleValue}`
          : `${rule.indicator} (${actualValue.toFixed(2)}) not != ${ruleValue}`;
        break;

      case 'crosses_above':
      case 'crosses_below':
        // Would need historical data to implement crosses - simplified for now
        met = rule.operator === 'crosses_above' ? actualValue > ruleValue : actualValue < ruleValue;
        reason = `${rule.indicator} ${rule.operator} ${ruleValue} (simplified)`;
        break;

      default:
        met = false;
        reason = `Unknown operator: ${rule.operator}`;
    }

    return { met, reason };
  }

  /**
   * Generate trading signal from evaluation
   */
  private generateSignal(
    strategy: TradingStrategy,
    evaluation: ConditionEvaluationResult,
    currentPrice: number
  ): TradingSignal {
    // Determine signal type based on condition type and strategy type
    let signalType: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';

    if (evaluation.conditionType === 'entry') {
      // For entry conditions, determine if it's a buy or sell based on strategy type
      if (strategy.type === 'trend_following' || strategy.type === 'breakout') {
        signalType = 'BUY'; // Assume long bias for these strategies
      } else if (strategy.type === 'mean_reversion') {
        // Mean reversion could be buy or sell - use RSI if available
        const rsi = evaluation.indicatorValues['rsi'];
        if (rsi && rsi < 30) {
          signalType = 'BUY'; // Oversold
        } else if (rsi && rsi > 70) {
          signalType = 'SELL'; // Overbought
        }
      } else {
        signalType = 'BUY'; // Default to buy for other strategies
      }
    } else {
      // Exit conditions
      signalType = 'SELL';
    }

    // Calculate confidence based on score and number of reasons
    const confidence = Math.min(evaluation.score, 100);
    const strength = Math.min(evaluation.reasons.length * 20, 100);

    return {
      type: signalType,
      strength,
      confidence,
      reasons: evaluation.reasons,
      indicators: evaluation.indicatorValues,
      timestamp: new Date(),
    };
  }

  /**
   * Fetch market data for strategy
   */
  private async fetchMarketData(strategy: TradingStrategy): Promise<MarketDataPoint[]> {
    try {
      const ohlcvData = await OHLCVService.fetchOHLCV({
        exchangeId: strategy.exchangeId,
        symbol: strategy.symbol,
        timeframe: strategy.timeframe,
        limit: this.config.maxDataPoints,
      });

      return ohlcvData.map((candle) => ({
        timestamp: candle.timestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      }));
    } catch (error) {
      logger.error('Failed to fetch market data', {
        strategyId: strategy.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Register a custom indicator
   */
  registerIndicator(type: string, calculator: IIndicatorCalculator): void {
    this.indicators.set(type, calculator);
    logger.info('Custom indicator registered', { type });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const strategyRunner = new StrategyRunner();
