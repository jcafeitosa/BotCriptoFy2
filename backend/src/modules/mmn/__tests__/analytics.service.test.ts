import { describe, it, expect } from 'bun:test';
import {
  generateMonthlyBuckets,
  mergeMonthlyMetrics,
  AnalyticsService,
} from '../services/analytics.service';
import type { DownlineSnapshot } from '../types/mmn.types';

describe('MMN Analytics helpers', () => {
  it('should generate consecutive monthly buckets', () => {
    const start = new Date(Date.UTC(2024, 0, 1));
    const buckets = generateMonthlyBuckets(start, 3);

    expect(buckets).toEqual(['2024-01', '2024-02', '2024-03']);
  });

  it('should merge metric series respecting buckets order', () => {
    const buckets = ['2024-01', '2024-02', '2024-03'];
    const members = new Map<string, { newMembers: number; qualifiedMembers: number }>([
      ['2024-01', { newMembers: 5, qualifiedMembers: 2 }],
      ['2024-03', { newMembers: 3, qualifiedMembers: 1 }],
    ]);
    const volumes = new Map<string, number>([
      ['2024-01', 1500],
      ['2024-02', 900],
    ]);
    const commissions = new Map<string, number>([['2024-02', 250]]);

    const merged = mergeMonthlyMetrics(buckets, members, volumes, commissions);

    expect(merged).toEqual([
      {
        period: '2024-01',
        newMembers: 5,
        qualifiedMembers: 2,
        totalVolume: 1500,
        totalCommissions: 0,
      },
      {
        period: '2024-02',
        newMembers: 0,
        qualifiedMembers: 0,
        totalVolume: 900,
        totalCommissions: 250,
      },
      {
        period: '2024-03',
        newMembers: 3,
        qualifiedMembers: 1,
        totalVolume: 0,
        totalCommissions: 0,
      },
    ]);
  });

  it('should compute network health metrics', () => {
    const snapshot: DownlineSnapshot[] = [
      { status: 'active', isQualified: true, level: 1 },
      { status: 'inactive', isQualified: false, level: 2 },
      { status: 'active', isQualified: false, level: 3 },
    ];

    const health = AnalyticsService.computeNetworkHealthFromDownline(snapshot);

    expect(health).toEqual({
      totalMembers: 3,
      activeMembers: 2,
      inactiveMembers: 1,
      qualifiedMembers: 1,
      retentionRate: 0.67,
      qualificationRate: 0.33,
      averageLevel: 2,
    });
  });
});
