/**
 * Strategy Validator and Sanitizer
 * Security utilities for strategy input validation and sanitization
 */

import { BadRequestError } from '@/utils/errors';
import type {
  CreateStrategyRequest,
  UpdateStrategyRequest,
  IndicatorConfig,
  StrategyCondition,
  ConditionRule,
} from '../types/strategies.types';

/**
 * Allowed indicator types (whitelist)
 */
const ALLOWED_INDICATORS = [
  'rsi',
  'macd',
  'sma',
  'ema',
  'atr',
  'adx',
  'bollinger_bands',
  'stochastic',
  'vwap',
  'obv',
  'cci',
  'williams_r',
] as const;

/**
 * Allowed operators (whitelist)
 */
const ALLOWED_OPERATORS = [
  '>',
  '<',
  '>=',
  '<=',
  '==',
  '!=',
  'crosses_above',
  'crosses_below',
] as const;

/**
 * Allowed strategy types
 */
const ALLOWED_STRATEGY_TYPES = [
  'trend_following',
  'mean_reversion',
  'breakout',
  'arbitrage',
  'scalping',
  'grid',
  'dca',
] as const;

/**
 * Sanitize strategy name
 * Allows: letters, numbers, spaces, hyphens, underscores
 * Max length: 100 chars
 */
export function sanitizeStrategyName(name: string): string {
  if (!name || typeof name !== 'string') {
    throw new BadRequestError('Strategy name is required and must be a string');
  }

  // Remove any HTML tags
  const sanitized = name.replace(/<[^>]*>/g, '');

  // Validate pattern
  if (!/^[a-zA-Z0-9\s\-_]{1,100}$/.test(sanitized)) {
    throw new BadRequestError(
      'Strategy name must contain only letters, numbers, spaces, hyphens, and underscores (max 100 characters)'
    );
  }

  return sanitized.trim();
}

/**
 * Sanitize description
 * Max length: 500 chars
 */
export function sanitizeDescription(description?: string): string | undefined {
  if (!description) {
    return undefined;
  }

  if (typeof description !== 'string') {
    throw new BadRequestError('Description must be a string');
  }

  // Remove HTML tags
  const sanitized = description.replace(/<[^>]*>/g, '');

  // Check max length
  if (sanitized.length > 500) {
    throw new BadRequestError('Description must not exceed 500 characters');
  }

  return sanitized.trim();
}

/**
 * Validate indicator configuration
 */
export function validateIndicator(indicator: IndicatorConfig): void {
  if (!indicator || typeof indicator !== 'object') {
    throw new BadRequestError('Invalid indicator configuration');
  }

  // Validate type against whitelist
  if (!ALLOWED_INDICATORS.includes(indicator.type as any)) {
    throw new BadRequestError(
      `Invalid indicator type: ${indicator.type}. Allowed: ${ALLOWED_INDICATORS.join(', ')}`
    );
  }

  // Validate parameters
  if (indicator.parameters && typeof indicator.parameters !== 'object') {
    throw new BadRequestError('Indicator parameters must be an object');
  }

  // Validate common parameters
  if (indicator.parameters) {
    const { period, length, multiplier, fastPeriod, slowPeriod, signalPeriod } = indicator.parameters;

    // Validate period values (must be positive integers)
    const periodParams = [period, length, fastPeriod, slowPeriod, signalPeriod].filter(
      (p) => p !== undefined
    );

    for (const param of periodParams) {
      if (typeof param !== 'number' || param <= 0 || param > 1000 || !Number.isInteger(param)) {
        throw new BadRequestError(
          'Indicator periods must be positive integers between 1 and 1000'
        );
      }
    }

    // Validate multiplier (for Bollinger Bands, etc.)
    if (multiplier !== undefined) {
      if (typeof multiplier !== 'number' || multiplier <= 0 || multiplier > 10) {
        throw new BadRequestError('Indicator multiplier must be a number between 0 and 10');
      }
    }
  }

  // Validate enabled flag
  if (typeof indicator.enabled !== 'boolean') {
    throw new BadRequestError('Indicator enabled flag must be a boolean');
  }
}

/**
 * Validate condition rule
 */
export function validateConditionRule(rule: ConditionRule): void {
  if (!rule || typeof rule !== 'object') {
    throw new BadRequestError('Invalid condition rule');
  }

  // Validate indicator name
  if (!rule.indicator || typeof rule.indicator !== 'string') {
    throw new BadRequestError('Rule indicator is required and must be a string');
  }

  // Sanitize indicator name (prevent injection)
  if (!/^[a-zA-Z0-9_]{1,50}$/.test(rule.indicator)) {
    throw new BadRequestError('Rule indicator must contain only letters, numbers, and underscores');
  }

  // Validate operator against whitelist
  if (!ALLOWED_OPERATORS.includes(rule.operator as any)) {
    throw new BadRequestError(
      `Invalid operator: ${rule.operator}. Allowed: ${ALLOWED_OPERATORS.join(', ')}`
    );
  }

  // Validate value
  if (rule.value === undefined || rule.value === null) {
    throw new BadRequestError('Rule value is required');
  }

  if (typeof rule.value === 'number') {
    if (!Number.isFinite(rule.value)) {
      throw new BadRequestError('Rule value must be a finite number');
    }
  } else if (typeof rule.value === 'string') {
    const numValue = parseFloat(rule.value);
    if (!Number.isFinite(numValue)) {
      throw new BadRequestError('Rule value must be a valid number');
    }
  } else {
    throw new BadRequestError('Rule value must be a number or string');
  }

  // Validate weight (optional)
  if (rule.weight !== undefined) {
    if (typeof rule.weight !== 'number' || rule.weight < 0 || rule.weight > 100) {
      throw new BadRequestError('Rule weight must be a number between 0 and 100');
    }
  }
}

/**
 * Validate strategy condition
 */
export function validateCondition(condition: StrategyCondition): void {
  if (!condition || typeof condition !== 'object') {
    throw new BadRequestError('Invalid condition');
  }

  // Validate type
  if (condition.type !== 'entry' && condition.type !== 'exit') {
    throw new BadRequestError('Condition type must be "entry" or "exit"');
  }

  // Validate logic
  if (condition.logic !== 'AND' && condition.logic !== 'OR') {
    throw new BadRequestError('Condition logic must be "AND" or "OR"');
  }

  // Validate rules
  if (!Array.isArray(condition.rules) || condition.rules.length === 0) {
    throw new BadRequestError('Condition must have at least one rule');
  }

  if (condition.rules.length > 10) {
    throw new BadRequestError('Condition cannot have more than 10 rules');
  }

  // Validate each rule
  for (const rule of condition.rules) {
    validateConditionRule(rule);
  }
}

/**
 * Validate percentage values
 */
export function validatePercentage(value: number, name: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new BadRequestError(`${name} must be a valid number`);
  }

  if (value < 0 || value > 100) {
    throw new BadRequestError(`${name} must be between 0 and 100`);
  }
}

/**
 * Validate position size
 */
export function validatePositionSize(value: number): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new BadRequestError('Position size must be a valid number');
  }

  if (value <= 0) {
    throw new BadRequestError('Position size must be greater than 0');
  }

  if (value > 1000000) {
    throw new BadRequestError('Position size cannot exceed 1,000,000');
  }
}

/**
 * Validate create strategy request
 */
export function validateCreateStrategyRequest(request: CreateStrategyRequest): void {
  // Sanitize and validate name
  request.name = sanitizeStrategyName(request.name);

  // Sanitize description
  if (request.description) {
    request.description = sanitizeDescription(request.description);
  }

  // Validate strategy type
  if (!ALLOWED_STRATEGY_TYPES.includes(request.type as any)) {
    throw new BadRequestError(
      `Invalid strategy type: ${request.type}. Allowed: ${ALLOWED_STRATEGY_TYPES.join(', ')}`
    );
  }

  // Validate exchangeId
  if (!request.exchangeId || typeof request.exchangeId !== 'string') {
    throw new BadRequestError('Exchange ID is required');
  }

  if (!/^[a-z_]{2,20}$/.test(request.exchangeId)) {
    throw new BadRequestError('Invalid exchange ID format');
  }

  // Validate symbol
  if (!request.symbol || typeof request.symbol !== 'string') {
    throw new BadRequestError('Symbol is required');
  }

  if (!/^[A-Z0-9]{2,10}\/[A-Z0-9]{2,10}$/.test(request.symbol)) {
    throw new BadRequestError('Invalid symbol format (expected: BTC/USDT)');
  }

  // Validate timeframe
  const validTimeframes = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d', '1w', '1M'];
  if (!validTimeframes.includes(request.timeframe)) {
    throw new BadRequestError(
      `Invalid timeframe. Allowed: ${validTimeframes.join(', ')}`
    );
  }

  // Validate indicators
  if (!Array.isArray(request.indicators) || request.indicators.length === 0) {
    throw new BadRequestError('At least one indicator is required');
  }

  if (request.indicators.length > 20) {
    throw new BadRequestError('Cannot have more than 20 indicators');
  }

  for (const indicator of request.indicators) {
    validateIndicator(indicator);
  }

  // Validate conditions
  if (!Array.isArray(request.conditions) || request.conditions.length === 0) {
    throw new BadRequestError('At least one condition is required');
  }

  if (request.conditions.length > 10) {
    throw new BadRequestError('Cannot have more than 10 conditions');
  }

  for (const condition of request.conditions) {
    validateCondition(condition);
  }

  // Validate risk management parameters
  if (request.stopLossPercent !== undefined) {
    validatePercentage(request.stopLossPercent, 'Stop loss');
  }

  if (request.takeProfitPercent !== undefined) {
    validatePercentage(request.takeProfitPercent, 'Take profit');
  }

  if (request.trailingStopPercent !== undefined) {
    validatePercentage(request.trailingStopPercent, 'Trailing stop');
  }

  if (request.maxDrawdownPercent !== undefined) {
    validatePercentage(request.maxDrawdownPercent, 'Max drawdown');
  }

  if (request.maxPositionSize !== undefined) {
    validatePositionSize(request.maxPositionSize);
  }

  // Validate tags
  if (request.tags) {
    if (!Array.isArray(request.tags)) {
      throw new BadRequestError('Tags must be an array');
    }

    if (request.tags.length > 10) {
      throw new BadRequestError('Cannot have more than 10 tags');
    }

    for (const tag of request.tags) {
      if (typeof tag !== 'string' || tag.length > 50) {
        throw new BadRequestError('Each tag must be a string (max 50 characters)');
      }

      if (!/^[a-zA-Z0-9\-_\s]{1,50}$/.test(tag)) {
        throw new BadRequestError('Tags must contain only letters, numbers, hyphens, and underscores');
      }
    }
  }

  // Sanitize notes
  if (request.notes) {
    if (typeof request.notes !== 'string') {
      throw new BadRequestError('Notes must be a string');
    }

    // Remove HTML tags
    request.notes = request.notes.replace(/<[^>]*>/g, '');

    if (request.notes.length > 1000) {
      throw new BadRequestError('Notes cannot exceed 1000 characters');
    }
  }
}

/**
 * Validate update strategy request
 */
export function validateUpdateStrategyRequest(request: UpdateStrategyRequest): void {
  // Sanitize name if provided
  if (request.name !== undefined) {
    request.name = sanitizeStrategyName(request.name);
  }

  // Sanitize description if provided
  if (request.description !== undefined) {
    request.description = sanitizeDescription(request.description);
  }

  // Validate indicators if provided
  if (request.indicators !== undefined) {
    if (!Array.isArray(request.indicators) || request.indicators.length === 0) {
      throw new BadRequestError('At least one indicator is required');
    }

    if (request.indicators.length > 20) {
      throw new BadRequestError('Cannot have more than 20 indicators');
    }

    for (const indicator of request.indicators) {
      validateIndicator(indicator);
    }
  }

  // Validate conditions if provided
  if (request.conditions !== undefined) {
    if (!Array.isArray(request.conditions) || request.conditions.length === 0) {
      throw new BadRequestError('At least one condition is required');
    }

    if (request.conditions.length > 10) {
      throw new BadRequestError('Cannot have more than 10 conditions');
    }

    for (const condition of request.conditions) {
      validateCondition(condition);
    }
  }

  // Validate risk management parameters
  if (request.stopLossPercent !== undefined) {
    validatePercentage(request.stopLossPercent, 'Stop loss');
  }

  if (request.takeProfitPercent !== undefined) {
    validatePercentage(request.takeProfitPercent, 'Take profit');
  }

  if (request.trailingStopPercent !== undefined) {
    validatePercentage(request.trailingStopPercent, 'Trailing stop');
  }

  if (request.maxDrawdownPercent !== undefined) {
    validatePercentage(request.maxDrawdownPercent, 'Max drawdown');
  }

  if (request.maxPositionSize !== undefined) {
    validatePositionSize(request.maxPositionSize);
  }

  // Validate status if provided
  if (request.status !== undefined) {
    const allowedStatuses = ['draft', 'active', 'paused', 'archived'];
    if (!allowedStatuses.includes(request.status)) {
      throw new BadRequestError(`Invalid status. Allowed: ${allowedStatuses.join(', ')}`);
    }
  }

  // Validate and sanitize tags if provided
  if (request.tags !== undefined) {
    if (!Array.isArray(request.tags)) {
      throw new BadRequestError('Tags must be an array');
    }

    if (request.tags.length > 10) {
      throw new BadRequestError('Cannot have more than 10 tags');
    }

    for (const tag of request.tags) {
      if (typeof tag !== 'string' || tag.length > 50) {
        throw new BadRequestError('Each tag must be a string (max 50 characters)');
      }

      if (!/^[a-zA-Z0-9\-_\s]{1,50}$/.test(tag)) {
        throw new BadRequestError('Tags must contain only letters, numbers, hyphens, and underscores');
      }
    }
  }

  // Sanitize notes if provided
  if (request.notes !== undefined) {
    if (typeof request.notes !== 'string') {
      throw new BadRequestError('Notes must be a string');
    }

    // Remove HTML tags
    request.notes = request.notes.replace(/<[^>]*>/g, '');

    if (request.notes.length > 1000) {
      throw new BadRequestError('Notes cannot exceed 1000 characters');
    }
  }
}
