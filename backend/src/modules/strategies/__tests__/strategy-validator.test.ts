/**
 * Strategy Validator Tests
 * Complete test coverage for security validations and input sanitization
 */

import { describe, test, expect } from 'bun:test';
import {
  sanitizeStrategyName,
  sanitizeDescription,
  validateIndicator,
  validateConditionRule,
  validateCondition,
  validatePercentage,
  validatePositionSize,
  validateCreateStrategyRequest,
  validateUpdateStrategyRequest,
} from '../utils/strategy-validator';
import { BadRequestError } from '@/utils/errors';
import type {
  CreateStrategyRequest,
  UpdateStrategyRequest,
  IndicatorConfig,
  ConditionRule,
  StrategyCondition,
} from '../types/strategies.types';

describe('Strategy Validator', () => {
  describe('sanitizeStrategyName', () => {
    test('should accept valid strategy names', () => {
      expect(sanitizeStrategyName('My Strategy')).toBe('My Strategy');
      expect(sanitizeStrategyName('RSI-Breakout_2024')).toBe('RSI-Breakout_2024');
      expect(sanitizeStrategyName('Simple 123')).toBe('Simple 123');
    });

    test('should trim whitespace', () => {
      expect(sanitizeStrategyName('  Strategy Name  ')).toBe('Strategy Name');
    });

    test('should remove HTML tags (XSS prevention)', () => {
      // After HTML removal, <script>alert(1)</script> becomes alert(1) which has invalid chars
      expect(() => sanitizeStrategyName('<script>alert(1)</script>')).toThrow(BadRequestError);
      // After HTML removal, Name<b>Bold</b> becomes NameBold which is actually valid
      // So test that HTML is stripped even if result is valid
      expect(sanitizeStrategyName('Name<b>Bold</b>')).toBe('NameBold');
    });

    test('should reject invalid characters', () => {
      expect(() => sanitizeStrategyName('Strategy@Name')).toThrow(BadRequestError);
      expect(() => sanitizeStrategyName('Strategy#Name')).toThrow(BadRequestError);
      expect(() => sanitizeStrategyName('Strategy$Name')).toThrow(BadRequestError);
    });

    test('should reject names exceeding max length', () => {
      const longName = 'a'.repeat(101);
      expect(() => sanitizeStrategyName(longName)).toThrow(BadRequestError);
    });

    test('should reject empty names', () => {
      expect(() => sanitizeStrategyName('')).toThrow(BadRequestError);
    });

    test('should reject non-string input', () => {
      expect(() => sanitizeStrategyName(null as any)).toThrow(BadRequestError);
      expect(() => sanitizeStrategyName(123 as any)).toThrow(BadRequestError);
      expect(() => sanitizeStrategyName(undefined as any)).toThrow(BadRequestError);
    });
  });

  describe('sanitizeDescription', () => {
    test('should accept valid descriptions', () => {
      expect(sanitizeDescription('This is a valid description')).toBe('This is a valid description');
    });

    test('should trim whitespace', () => {
      expect(sanitizeDescription('  Description  ')).toBe('Description');
    });

    test('should remove HTML tags', () => {
      const html = '<p>Description with <strong>HTML</strong></p>';
      expect(sanitizeDescription(html)).toBe('Description with HTML');
    });

    test('should reject descriptions exceeding max length', () => {
      const longDesc = 'a'.repeat(501);
      expect(() => sanitizeDescription(longDesc)).toThrow(BadRequestError);
    });

    test('should handle undefined descriptions', () => {
      expect(sanitizeDescription(undefined)).toBeUndefined();
    });

    test('should reject non-string descriptions', () => {
      expect(() => sanitizeDescription(123 as any)).toThrow(BadRequestError);
    });
  });

  describe('validateIndicator', () => {
    test('should accept valid RSI indicator', () => {
      const indicator: IndicatorConfig = {
        type: 'rsi',
        parameters: { period: 14 },
        enabled: true,
      };
      expect(() => validateIndicator(indicator)).not.toThrow();
    });

    test('should accept valid MACD indicator', () => {
      const indicator: IndicatorConfig = {
        type: 'macd',
        parameters: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
        enabled: true,
      };
      expect(() => validateIndicator(indicator)).not.toThrow();
    });

    test('should accept valid Bollinger Bands indicator', () => {
      const indicator: IndicatorConfig = {
        type: 'bollinger_bands',
        parameters: { period: 20, multiplier: 2 },
        enabled: true,
      };
      expect(() => validateIndicator(indicator)).not.toThrow();
    });

    test('should reject invalid indicator types (whitelist protection)', () => {
      const indicator: IndicatorConfig = {
        type: 'malicious_indicator' as any,
        parameters: {},
        enabled: true,
      };
      expect(() => validateIndicator(indicator)).toThrow(BadRequestError);
      expect(() => validateIndicator(indicator)).toThrow(/Invalid indicator type/);
    });

    test('should reject negative periods', () => {
      const indicator: IndicatorConfig = {
        type: 'rsi',
        parameters: { period: -5 },
        enabled: true,
      };
      expect(() => validateIndicator(indicator)).toThrow(BadRequestError);
    });

    test('should reject zero periods', () => {
      const indicator: IndicatorConfig = {
        type: 'rsi',
        parameters: { period: 0 },
        enabled: true,
      };
      expect(() => validateIndicator(indicator)).toThrow(BadRequestError);
    });

    test('should reject periods exceeding maximum', () => {
      const indicator: IndicatorConfig = {
        type: 'rsi',
        parameters: { period: 1001 },
        enabled: true,
      };
      expect(() => validateIndicator(indicator)).toThrow(BadRequestError);
    });

    test('should reject non-integer periods', () => {
      const indicator: IndicatorConfig = {
        type: 'rsi',
        parameters: { period: 14.5 },
        enabled: true,
      };
      expect(() => validateIndicator(indicator)).toThrow(BadRequestError);
    });

    test('should reject invalid multiplier values', () => {
      const indicator: IndicatorConfig = {
        type: 'bollinger_bands',
        parameters: { period: 20, multiplier: -1 },
        enabled: true,
      };
      expect(() => validateIndicator(indicator)).toThrow(BadRequestError);
    });

    test('should reject multiplier exceeding maximum', () => {
      const indicator: IndicatorConfig = {
        type: 'bollinger_bands',
        parameters: { period: 20, multiplier: 11 },
        enabled: true,
      };
      expect(() => validateIndicator(indicator)).toThrow(BadRequestError);
    });

    test('should reject missing enabled flag', () => {
      const indicator = {
        type: 'rsi',
        parameters: { period: 14 },
      };
      expect(() => validateIndicator(indicator as any)).toThrow(BadRequestError);
    });

    test('should reject non-boolean enabled flag', () => {
      const indicator: IndicatorConfig = {
        type: 'rsi',
        parameters: { period: 14 },
        enabled: 'true' as any,
      };
      expect(() => validateIndicator(indicator)).toThrow(BadRequestError);
    });

    test('should reject invalid indicator structure', () => {
      expect(() => validateIndicator(null as any)).toThrow(BadRequestError);
      expect(() => validateIndicator('invalid' as any)).toThrow(BadRequestError);
    });
  });

  describe('validateConditionRule', () => {
    test('should accept valid rule', () => {
      const rule: ConditionRule = {
        indicator: 'rsi',
        operator: '>',
        value: 70,
        weight: 1,
      };
      expect(() => validateConditionRule(rule)).not.toThrow();
    });

    test('should accept all valid operators', () => {
      const operators = ['>', '<', '>=', '<=', '==', '!=', 'crosses_above', 'crosses_below'];

      operators.forEach((operator) => {
        const rule: ConditionRule = {
          indicator: 'rsi',
          operator: operator as any,
          value: 50,
        };
        expect(() => validateConditionRule(rule)).not.toThrow();
      });
    });

    test('should reject invalid operators (whitelist protection)', () => {
      const rule: ConditionRule = {
        indicator: 'rsi',
        operator: 'DROP TABLE' as any,
        value: 50,
      };
      expect(() => validateConditionRule(rule)).toThrow(BadRequestError);
      expect(() => validateConditionRule(rule)).toThrow(/Invalid operator/);
    });

    test('should sanitize indicator names (SQL injection prevention)', () => {
      const rule: ConditionRule = {
        indicator: 'rsi; DROP TABLE strategies;',
        operator: '>',
        value: 50,
      };
      expect(() => validateConditionRule(rule)).toThrow(BadRequestError);
    });

    test('should reject indicator names with special characters', () => {
      const rule: ConditionRule = {
        indicator: 'rsi@malicious',
        operator: '>',
        value: 50,
      };
      expect(() => validateConditionRule(rule)).toThrow(BadRequestError);
    });

    test('should reject missing indicator', () => {
      const rule = {
        operator: '>',
        value: 50,
      };
      expect(() => validateConditionRule(rule as any)).toThrow(BadRequestError);
    });

    test('should reject missing value', () => {
      const rule = {
        indicator: 'rsi',
        operator: '>',
      };
      expect(() => validateConditionRule(rule as any)).toThrow(BadRequestError);
    });

    test('should reject non-finite values', () => {
      const rule: ConditionRule = {
        indicator: 'rsi',
        operator: '>',
        value: Infinity,
      };
      expect(() => validateConditionRule(rule)).toThrow(BadRequestError);
    });

    test('should accept string numeric values', () => {
      const rule: ConditionRule = {
        indicator: 'rsi',
        operator: '>',
        value: '70' as any,
      };
      expect(() => validateConditionRule(rule)).not.toThrow();
    });

    test('should reject invalid string values', () => {
      const rule: ConditionRule = {
        indicator: 'rsi',
        operator: '>',
        value: 'invalid' as any,
      };
      expect(() => validateConditionRule(rule)).toThrow(BadRequestError);
    });

    test('should reject weight outside valid range', () => {
      const rule: ConditionRule = {
        indicator: 'rsi',
        operator: '>',
        value: 70,
        weight: 101,
      };
      expect(() => validateConditionRule(rule)).toThrow(BadRequestError);
    });

    test('should accept optional weight', () => {
      const rule: ConditionRule = {
        indicator: 'rsi',
        operator: '>',
        value: 70,
      };
      expect(() => validateConditionRule(rule)).not.toThrow();
    });
  });

  describe('validateCondition', () => {
    test('should accept valid entry condition', () => {
      const condition: StrategyCondition = {
        type: 'entry',
        logic: 'AND',
        rules: [
          { indicator: 'rsi', operator: '<', value: 30 },
          { indicator: 'macd', operator: 'crosses_above', value: 0 },
        ],
      };
      expect(() => validateCondition(condition)).not.toThrow();
    });

    test('should accept valid exit condition', () => {
      const condition: StrategyCondition = {
        type: 'exit',
        logic: 'OR',
        rules: [
          { indicator: 'rsi', operator: '>', value: 70 },
          { indicator: 'macd', operator: 'crosses_below', value: 0 },
        ],
      };
      expect(() => validateCondition(condition)).not.toThrow();
    });

    test('should reject invalid condition type', () => {
      const condition = {
        type: 'invalid',
        logic: 'AND',
        rules: [{ indicator: 'rsi', operator: '>', value: 50 }],
      };
      expect(() => validateCondition(condition as any)).toThrow(BadRequestError);
    });

    test('should reject invalid logic', () => {
      const condition = {
        type: 'entry',
        logic: 'NOT',
        rules: [{ indicator: 'rsi', operator: '>', value: 50 }],
      };
      expect(() => validateCondition(condition as any)).toThrow(BadRequestError);
    });

    test('should reject conditions without rules', () => {
      const condition = {
        type: 'entry',
        logic: 'AND',
        rules: [],
      };
      expect(() => validateCondition(condition as any)).toThrow(BadRequestError);
    });

    test('should reject conditions exceeding max rules', () => {
      const rules = Array(11)
        .fill(null)
        .map(() => ({ indicator: 'rsi', operator: '>', value: 50 }));

      const condition = {
        type: 'entry',
        logic: 'AND',
        rules,
      };
      expect(() => validateCondition(condition as any)).toThrow(BadRequestError);
    });

    test('should validate all rules in condition', () => {
      const condition: StrategyCondition = {
        type: 'entry',
        logic: 'AND',
        rules: [
          { indicator: 'rsi', operator: '>', value: 50 },
          { indicator: 'macd', operator: 'INVALID' as any, value: 0 },
        ],
      };
      expect(() => validateCondition(condition)).toThrow(BadRequestError);
    });
  });

  describe('validatePercentage', () => {
    test('should accept valid percentages', () => {
      expect(() => validatePercentage(0, 'Test')).not.toThrow();
      expect(() => validatePercentage(50, 'Test')).not.toThrow();
      expect(() => validatePercentage(100, 'Test')).not.toThrow();
    });

    test('should reject negative percentages', () => {
      expect(() => validatePercentage(-1, 'Test')).toThrow(BadRequestError);
    });

    test('should reject percentages exceeding 100', () => {
      expect(() => validatePercentage(101, 'Test')).toThrow(BadRequestError);
    });

    test('should reject non-finite values', () => {
      expect(() => validatePercentage(Infinity, 'Test')).toThrow(BadRequestError);
      expect(() => validatePercentage(NaN, 'Test')).toThrow(BadRequestError);
    });

    test('should reject non-numeric values', () => {
      expect(() => validatePercentage('50' as any, 'Test')).toThrow(BadRequestError);
    });
  });

  describe('validatePositionSize', () => {
    test('should accept valid position sizes', () => {
      expect(() => validatePositionSize(0.01)).not.toThrow();
      expect(() => validatePositionSize(100)).not.toThrow();
      expect(() => validatePositionSize(10000)).not.toThrow();
    });

    test('should reject zero position size', () => {
      expect(() => validatePositionSize(0)).toThrow(BadRequestError);
    });

    test('should reject negative position size', () => {
      expect(() => validatePositionSize(-10)).toThrow(BadRequestError);
    });

    test('should reject position size exceeding maximum', () => {
      expect(() => validatePositionSize(1000001)).toThrow(BadRequestError);
    });

    test('should reject non-finite values', () => {
      expect(() => validatePositionSize(Infinity)).toThrow(BadRequestError);
      expect(() => validatePositionSize(NaN)).toThrow(BadRequestError);
    });
  });

  describe('validateCreateStrategyRequest', () => {
    const validRequest: CreateStrategyRequest = {
      name: 'Test Strategy',
      description: 'Test description',
      type: 'trend_following',
      exchangeId: 'binance',
      symbol: 'BTC/USDT',
      timeframe: '1h',
      indicators: [
        { type: 'rsi', parameters: { period: 14 }, enabled: true },
      ],
      conditions: [
        {
          type: 'entry',
          logic: 'AND',
          rules: [{ indicator: 'rsi', operator: '<', value: 30 }],
        },
      ],
    };

    test('should accept valid create request', () => {
      expect(() => validateCreateStrategyRequest({ ...validRequest })).not.toThrow();
    });

    test('should sanitize name', () => {
      const request = { ...validRequest, name: '  Strategy  ' };
      validateCreateStrategyRequest(request);
      expect(request.name).toBe('Strategy');
    });

    test('should sanitize description', () => {
      const request = { ...validRequest, description: '<p>Description</p>' };
      validateCreateStrategyRequest(request);
      expect(request.description).toBe('Description');
    });

    test('should reject invalid strategy types', () => {
      const request = { ...validRequest, type: 'invalid_type' as any };
      expect(() => validateCreateStrategyRequest(request)).toThrow(BadRequestError);
    });

    test('should reject invalid exchange ID format', () => {
      const request = { ...validRequest, exchangeId: 'INVALID@ID' };
      expect(() => validateCreateStrategyRequest(request)).toThrow(BadRequestError);
    });

    test('should reject invalid symbol format', () => {
      const request = { ...validRequest, symbol: 'BTCUSDT' };
      expect(() => validateCreateStrategyRequest(request)).toThrow(BadRequestError);
    });

    test('should reject invalid timeframe', () => {
      const request = { ...validRequest, timeframe: '10m' as any };
      expect(() => validateCreateStrategyRequest(request)).toThrow(BadRequestError);
    });

    test('should require at least one indicator', () => {
      const request = { ...validRequest, indicators: [] };
      expect(() => validateCreateStrategyRequest(request)).toThrow(BadRequestError);
    });

    test('should reject excessive indicators', () => {
      const indicators = Array(21).fill({ type: 'rsi', parameters: { period: 14 }, enabled: true });
      const request = { ...validRequest, indicators };
      expect(() => validateCreateStrategyRequest(request)).toThrow(BadRequestError);
    });

    test('should require at least one condition', () => {
      const request = { ...validRequest, conditions: [] };
      expect(() => validateCreateStrategyRequest(request)).toThrow(BadRequestError);
    });

    test('should reject excessive conditions', () => {
      const conditions = Array(11).fill({
        type: 'entry',
        logic: 'AND',
        rules: [{ indicator: 'rsi', operator: '>', value: 50 }],
      });
      const request = { ...validRequest, conditions };
      expect(() => validateCreateStrategyRequest(request)).toThrow(BadRequestError);
    });

    test('should validate risk management parameters', () => {
      const request = {
        ...validRequest,
        stopLossPercent: 5,
        takeProfitPercent: 10,
        maxPositionSize: 1000,
      };
      expect(() => validateCreateStrategyRequest(request)).not.toThrow();
    });

    test('should reject invalid stop loss', () => {
      const request = { ...validRequest, stopLossPercent: 101 };
      expect(() => validateCreateStrategyRequest(request)).toThrow(BadRequestError);
    });

    test('should validate tags', () => {
      const request = { ...validRequest, tags: ['crypto', 'trend-following', 'BTC'] };
      expect(() => validateCreateStrategyRequest(request)).not.toThrow();
    });

    test('should reject excessive tags', () => {
      const tags = Array(11).fill('tag');
      const request = { ...validRequest, tags };
      expect(() => validateCreateStrategyRequest(request)).toThrow(BadRequestError);
    });

    test('should reject invalid tag format', () => {
      const request = { ...validRequest, tags: ['valid', 'invalid@tag'] };
      expect(() => validateCreateStrategyRequest(request)).toThrow(BadRequestError);
    });

    test('should sanitize notes', () => {
      const request = { ...validRequest, notes: '<script>alert(1)</script>Test notes' };
      validateCreateStrategyRequest(request);
      expect(request.notes).toBe('alert(1)Test notes');
    });

    test('should reject notes exceeding max length', () => {
      const notes = 'a'.repeat(1001);
      const request = { ...validRequest, notes };
      expect(() => validateCreateStrategyRequest(request)).toThrow(BadRequestError);
    });
  });

  describe('validateUpdateStrategyRequest', () => {
    test('should accept valid update request', () => {
      const request: UpdateStrategyRequest = {
        name: 'Updated Strategy',
        description: 'Updated description',
      };
      expect(() => validateUpdateStrategyRequest(request)).not.toThrow();
    });

    test('should accept partial updates', () => {
      const request: UpdateStrategyRequest = {
        name: 'New Name',
      };
      expect(() => validateUpdateStrategyRequest(request)).not.toThrow();
    });

    test('should sanitize name if provided', () => {
      const request: UpdateStrategyRequest = {
        name: '  Updated  ',
      };
      validateUpdateStrategyRequest(request);
      expect(request.name).toBe('Updated');
    });

    test('should validate indicators if provided', () => {
      const request: UpdateStrategyRequest = {
        indicators: [
          { type: 'rsi', parameters: { period: 14 }, enabled: true },
        ],
      };
      expect(() => validateUpdateStrategyRequest(request)).not.toThrow();
    });

    test('should validate conditions if provided', () => {
      const request: UpdateStrategyRequest = {
        conditions: [
          {
            type: 'entry',
            logic: 'AND',
            rules: [{ indicator: 'rsi', operator: '<', value: 30 }],
          },
        ],
      };
      expect(() => validateUpdateStrategyRequest(request)).not.toThrow();
    });

    test('should validate status if provided', () => {
      const statuses = ['draft', 'active', 'paused', 'archived'];

      statuses.forEach((status) => {
        const request: UpdateStrategyRequest = { status: status as any };
        expect(() => validateUpdateStrategyRequest(request)).not.toThrow();
      });
    });

    test('should reject invalid status', () => {
      const request: UpdateStrategyRequest = { status: 'invalid' as any };
      expect(() => validateUpdateStrategyRequest(request)).toThrow(BadRequestError);
    });

    test('should validate tags if provided', () => {
      const request: UpdateStrategyRequest = {
        tags: ['crypto', 'updated'],
      };
      expect(() => validateUpdateStrategyRequest(request)).not.toThrow();
    });

    test('should accept empty update (no changes)', () => {
      const request: UpdateStrategyRequest = {};
      expect(() => validateUpdateStrategyRequest(request)).not.toThrow();
    });
  });
});
