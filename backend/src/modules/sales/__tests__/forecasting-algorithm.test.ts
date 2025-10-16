/**
 * Forecasting Algorithm Tests
 * Test revenue prediction and forecasting calculations
 */

import { describe, it, expect } from 'bun:test';
import {
  calculateWeightedRevenue,
  calculateBestCase,
  calculateWorstCase,
  predictRevenueMovingAverage,
  predictRevenueLinearRegression,
  calculateConfidenceLevel,
  calculateTrend,
} from '../utils/forecasting-algorithm';
import type { Deal } from '../types';

describe('Forecasting Algorithm', () => {
  const mockDeals: Partial<Deal>[] = [
    { id: '1', value: '10000' as any, probability: 80, status: 'open' },
    { id: '2', value: '5000' as any, probability: 50, status: 'open' },
    { id: '3', value: '20000' as any, probability: 90, status: 'open' },
    { id: '4', value: '15000' as any, probability: 30, status: 'open' },
  ];

  describe('calculateWeightedRevenue', () => {
    it('should calculate weighted revenue correctly', () => {
      const result = calculateWeightedRevenue(mockDeals as Deal[]);
      // (10000 * 0.8) + (5000 * 0.5) + (20000 * 0.9) + (15000 * 0.3) = 33000
      expect(result).toBe(33000);
    });

    it('should return 0 for empty deals', () => {
      const result = calculateWeightedRevenue([]);
      expect(result).toBe(0);
    });

    it('should ignore closed deals', () => {
      const deals: Partial<Deal>[] = [
        { id: '1', value: '10000' as any, probability: 80, status: 'open' },
        { id: '2', value: '5000' as any, probability: 100, status: 'won' },
      ];

      const result = calculateWeightedRevenue(deals as Deal[]);
      expect(result).toBe(8000); // Only open deal
    });
  });

  describe('calculateBestCase', () => {
    it('should sum all open deal values', () => {
      const result = calculateBestCase(mockDeals as Deal[]);
      // 10000 + 5000 + 20000 + 15000 = 50000
      expect(result).toBe(50000);
    });

    it('should ignore closed deals', () => {
      const deals: Partial<Deal>[] = [
        { id: '1', value: '10000' as any, probability: 80, status: 'open' },
        { id: '2', value: '5000' as any, probability: 100, status: 'won' },
      ];

      const result = calculateBestCase(deals as Deal[]);
      expect(result).toBe(10000);
    });
  });

  describe('calculateWorstCase', () => {
    it('should only include high-probability deals (>80%)', () => {
      const result = calculateWorstCase(mockDeals as Deal[]);
      // 10000 (80%) + 20000 (90%) = 30000
      expect(result).toBe(30000);
    });

    it('should return 0 when no high-probability deals', () => {
      const deals: Partial<Deal>[] = [
        { id: '1', value: '10000' as any, probability: 50, status: 'open' },
        { id: '2', value: '5000' as any, probability: 30, status: 'open' },
      ];

      const result = calculateWorstCase(deals as Deal[]);
      expect(result).toBe(0);
    });
  });

  describe('predictRevenueMovingAverage', () => {
    it('should calculate 3-period moving average by default', () => {
      const historical = [10000, 12000, 15000, 14000, 16000];
      const result = predictRevenueMovingAverage(historical, 3);
      // (14000 + 16000 + last=?) Average of last 3: (14000 + 16000 + 15000) / 3
      // Actually: last 3 are [15000, 14000, 16000] = 45000 / 3 = 15000
      expect(result).toBe(15000);
    });

    it('should handle fewer periods than requested', () => {
      const historical = [10000, 12000];
      const result = predictRevenueMovingAverage(historical, 3);
      // Uses available 2 periods: (10000 + 12000) / 2 = 11000
      expect(result).toBe(11000);
    });

    it('should return 0 for empty historical data', () => {
      const result = predictRevenueMovingAverage([]);
      expect(result).toBe(0);
    });
  });

  describe('predictRevenueLinearRegression', () => {
    it('should predict upward trend correctly', () => {
      const historical = [10000, 12000, 14000, 16000];
      const result = predictRevenueLinearRegression(historical);
      // Linear trend should predict ~18000
      expect(result).toBeGreaterThan(17000);
      expect(result).toBeLessThan(19000);
    });

    it('should predict downward trend correctly', () => {
      const historical = [20000, 18000, 16000, 14000];
      const result = predictRevenueLinearRegression(historical);
      // Linear trend should predict ~12000
      expect(result).toBeGreaterThan(11000);
      expect(result).toBeLessThan(13000);
    });

    it('should return 0 for empty historical data', () => {
      const result = predictRevenueLinearRegression([]);
      expect(result).toBe(0);
    });
  });

  describe('calculateConfidenceLevel', () => {
    it('should increase confidence with more deals', () => {
      const manyDeals = Array(25).fill({
        id: '1',
        value: '10000',
        probability: 50,
        status: 'open',
      }) as Deal[];

      const fewDeals = mockDeals as Deal[];

      const manyConfidence = calculateConfidenceLevel(manyDeals, [10000, 12000, 14000]);
      const fewConfidence = calculateConfidenceLevel(fewDeals, [10000, 12000, 14000]);

      expect(manyConfidence).toBeGreaterThan(fewConfidence);
    });

    it('should increase confidence with more historical data', () => {
      const longHistory = Array(12).fill(10000);
      const shortHistory = [10000, 12000];

      const longConfidence = calculateConfidenceLevel(mockDeals as Deal[], longHistory);
      const shortConfidence = calculateConfidenceLevel(mockDeals as Deal[], shortHistory);

      expect(longConfidence).toBeGreaterThan(shortConfidence);
    });

    it('should cap confidence at 100', () => {
      const manyDeals = Array(50).fill({
        id: '1',
        value: '10000',
        probability: 50,
        status: 'open',
      }) as Deal[];
      const longHistory = Array(24).fill(10000);

      const confidence = calculateConfidenceLevel(manyDeals, longHistory);
      expect(confidence).toBeLessThanOrEqual(100);
    });

    it('should have minimum confidence of 0', () => {
      const confidence = calculateConfidenceLevel([], []);
      expect(confidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateTrend', () => {
    it('should detect upward trend', () => {
      const result = calculateTrend(12000, 10000);
      expect(result.direction).toBe('up');
      expect(result.changePercentage).toBe(20);
    });

    it('should detect downward trend', () => {
      const result = calculateTrend(8000, 10000);
      expect(result.direction).toBe('down');
      expect(result.changePercentage).toBe(-20);
    });

    it('should detect stable trend for small changes', () => {
      const result = calculateTrend(10200, 10000);
      expect(result.direction).toBe('stable');
    });

    it('should handle zero previous value', () => {
      const result = calculateTrend(10000, 0);
      expect(result.direction).toBe('stable');
      expect(result.changePercentage).toBe(0);
    });
  });
});
