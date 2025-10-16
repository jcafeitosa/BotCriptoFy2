/**
 * Pipeline Calculator Tests
 * Test pipeline value calculations and metrics
 */

import { describe, it, expect } from 'bun:test';
import {
  calculatePipelineValue,
  calculateWeightedPipelineValue,
  calculateAverageDealSize,
  calculateWinRate,
  calculateSalesCycle,
  calculateDealAging,
  identifyStaleDeals,
} from '../utils/pipeline-calculator';
import type { Deal } from '../types';

describe('Pipeline Calculator', () => {
  const mockOpenDeals: Partial<Deal>[] = [
    { id: '1', value: '10000' as any, probability: 80, status: 'open' },
    { id: '2', value: '5000' as any, probability: 50, status: 'open' },
    { id: '3', value: '20000' as any, probability: 90, status: 'open' },
  ];

  const mockClosedDeals: Partial<Deal>[] = [
    { id: '4', value: '15000' as any, status: 'won', createdAt: new Date('2024-01-01'), actualCloseDate: new Date('2024-01-15') },
    { id: '5', value: '8000' as any, status: 'won', createdAt: new Date('2024-01-01'), actualCloseDate: new Date('2024-01-30') },
    { id: '6', value: '12000' as any, status: 'lost', createdAt: new Date('2024-01-01'), actualCloseDate: new Date('2024-01-20') },
  ];

  describe('calculatePipelineValue', () => {
    it('should sum all open deal values', () => {
      const result = calculatePipelineValue(mockOpenDeals as Deal[]);
      // 10000 + 5000 + 20000 = 35000
      expect(result).toBe(35000);
    });

    it('should ignore closed deals', () => {
      const allDeals = [...mockOpenDeals, ...mockClosedDeals];
      const result = calculatePipelineValue(allDeals as Deal[]);
      expect(result).toBe(35000); // Only open deals
    });

    it('should return 0 for empty pipeline', () => {
      const result = calculatePipelineValue([]);
      expect(result).toBe(0);
    });
  });

  describe('calculateWeightedPipelineValue', () => {
    it('should calculate weighted value correctly', () => {
      const result = calculateWeightedPipelineValue(mockOpenDeals as Deal[]);
      // (10000 * 0.8) + (5000 * 0.5) + (20000 * 0.9) = 28500
      expect(result).toBe(28500);
    });

    it('should ignore closed deals', () => {
      const allDeals = [...mockOpenDeals, ...mockClosedDeals];
      const result = calculateWeightedPipelineValue(allDeals as Deal[]);
      expect(result).toBe(28500); // Only open deals
    });
  });

  describe('calculateAverageDealSize', () => {
    it('should calculate average for won deals by default', () => {
      const result = calculateAverageDealSize(mockClosedDeals as Deal[], 'won');
      // (15000 + 8000) / 2 = 11500
      expect(result).toBe(11500);
    });

    it('should calculate average for open deals', () => {
      const result = calculateAverageDealSize(mockOpenDeals as Deal[], 'open');
      // (10000 + 5000 + 20000) / 3 = 11666.67
      expect(result).toBeCloseTo(11666.67, 1);
    });

    it('should return 0 for empty deals', () => {
      const result = calculateAverageDealSize([]);
      expect(result).toBe(0);
    });
  });

  describe('calculateWinRate', () => {
    it('should calculate win rate correctly', () => {
      const result = calculateWinRate(mockClosedDeals as Deal[]);
      // 2 won out of 3 closed = 66.67%
      expect(result).toBeCloseTo(66.67, 1);
    });

    it('should return 0 for no closed deals', () => {
      const result = calculateWinRate(mockOpenDeals as Deal[]);
      expect(result).toBe(0);
    });

    it('should calculate 100% win rate when all won', () => {
      const allWon: Partial<Deal>[] = [
        { id: '1', status: 'won' },
        { id: '2', status: 'won' },
      ];

      const result = calculateWinRate(allWon as Deal[]);
      expect(result).toBe(100);
    });

    it('should calculate 0% win rate when all lost', () => {
      const allLost: Partial<Deal>[] = [
        { id: '1', status: 'lost' },
        { id: '2', status: 'lost' },
      ];

      const result = calculateWinRate(allLost as Deal[]);
      expect(result).toBe(0);
    });
  });

  describe('calculateSalesCycle', () => {
    it('should calculate average days to close', () => {
      const result = calculateSalesCycle(mockClosedDeals as Deal[]);
      // Deal 4: 14 days, Deal 5: 29 days, Deal 6: 19 days
      // Average: (14 + 29 + 19) / 3 = ~21 days
      expect(result).toBeGreaterThanOrEqual(20);
      expect(result).toBeLessThanOrEqual(22);
    });

    it('should return 0 for no closed deals', () => {
      const result = calculateSalesCycle(mockOpenDeals as Deal[]);
      expect(result).toBe(0);
    });

    it('should ignore deals without close date', () => {
      const dealsWithoutDate: Partial<Deal>[] = [
        { id: '1', status: 'won', createdAt: new Date(), actualCloseDate: null as any },
      ];

      const result = calculateSalesCycle(dealsWithoutDate as Deal[]);
      expect(result).toBe(0);
    });
  });

  describe('calculateDealAging', () => {
    it('should calculate days since last update', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const deal: Partial<Deal> = {
        id: '1',
        updatedAt: twoDaysAgo,
      };

      const result = calculateDealAging(deal as Deal);
      expect(result).toBe(2);
    });

    it('should return 0 for deals updated today', () => {
      const deal: Partial<Deal> = {
        id: '1',
        updatedAt: new Date(),
      };

      const result = calculateDealAging(deal as Deal);
      expect(result).toBeLessThanOrEqual(1);
    });
  });

  describe('identifyStaleDeals', () => {
    it('should identify deals older than threshold', () => {
      const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
      const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);

      const deals: Partial<Deal>[] = [
        { id: '1', status: 'open', updatedAt: fortyDaysAgo },
        { id: '2', status: 'open', updatedAt: twentyDaysAgo },
        { id: '3', status: 'open', updatedAt: new Date() },
      ];

      const stale = identifyStaleDeals(deals as Deal[], 30);
      expect(stale.length).toBe(1);
      expect(stale[0].id).toBe('1');
    });

    it('should ignore closed deals', () => {
      const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);

      const deals: Partial<Deal>[] = [
        { id: '1', status: 'won', updatedAt: fortyDaysAgo },
        { id: '2', status: 'open', updatedAt: fortyDaysAgo },
      ];

      const stale = identifyStaleDeals(deals as Deal[], 30);
      expect(stale.length).toBe(1);
      expect(stale[0].id).toBe('2');
    });

    it('should return empty array when no stale deals', () => {
      const deals: Partial<Deal>[] = [
        { id: '1', status: 'open', updatedAt: new Date() },
      ];

      const stale = identifyStaleDeals(deals as Deal[], 30);
      expect(stale.length).toBe(0);
    });
  });
});
