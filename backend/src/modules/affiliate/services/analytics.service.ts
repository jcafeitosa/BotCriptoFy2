/**
 * Affiliate Analytics Service
 */

import { getAffiliateDb } from '../test-helpers/db-access';
import { eq, and, gte, sql } from 'drizzle-orm';
import { cacheManager } from '@/cache/cache-manager';
import { CacheNamespace } from '@/cache/types';
import {
  affiliateClicks,
  affiliateReferrals,
  affiliateConversions,
  affiliateCommissions,
} from '../schema/affiliate.schema';
import type { AnalyticsPeriod, AffiliateStats } from '../types/affiliate.types';

export class AffiliateAnalyticsService {
  private static readonly CACHE_TTL = 600; // 10 minutes

  static async getStats(affiliateId: string, period: AnalyticsPeriod = 'last_30_days'): Promise<AffiliateStats> {
    const cacheKey = `stats:${affiliateId}:${period}`;
    const cached = await cacheManager.get<AffiliateStats>(CacheNamespace.AFFILIATE, cacheKey);
    if (cached) return cached;

    const { startDate } = this.getPeriodDates(period);

    // Total clicks
    const [{ totalClicks }] = await getAffiliateDb()
      .select({ totalClicks: sql<number>`count(*)::int` })
      .from(affiliateClicks)
      .where(and(eq(affiliateClicks.affiliateId, affiliateId), gte(affiliateClicks.createdAt, startDate)));

    // Total signups
    const [{ totalSignups }] = await getAffiliateDb()
      .select({ totalSignups: sql<number>`count(*)::int` })
      .from(affiliateReferrals)
      .where(and(eq(affiliateReferrals.affiliateId, affiliateId), eq(affiliateReferrals.status, 'signed_up')));

    // Total conversions and revenue
    const [conversionStats] = await getAffiliateDb()
      .select({
        totalConversions: sql<number>`count(*)::int`,
        totalEarned: sql<string>`COALESCE(SUM(${affiliateConversions.orderValue}), 0)`,
      })
      .from(affiliateConversions)
      .where(and(eq(affiliateConversions.affiliateId, affiliateId), eq(affiliateConversions.status, 'approved')));

    // Total paid and pending
    const [financials] = await getAffiliateDb()
      .select({
        totalPaid: sql<string>`COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0)`,
        pendingBalance: sql<string>`COALESCE(SUM(CASE WHEN status IN ('pending', 'approved') THEN amount ELSE 0 END), 0)`,
      })
      .from(affiliateCommissions)
      .where(eq(affiliateCommissions.affiliateId, affiliateId));

    const totalEarned = parseFloat(conversionStats.totalEarned || '0');
    const totalPaid = parseFloat(financials.totalPaid || '0');
    const pendingBalance = parseFloat(financials.pendingBalance || '0');
    const conversionRate = totalClicks > 0 ? (conversionStats.totalConversions / totalClicks) * 100 : 0;
    const averageOrderValue = conversionStats.totalConversions > 0 ? totalEarned / conversionStats.totalConversions : 0;

    const stats: AffiliateStats = {
      totalClicks,
      totalSignups,
      totalConversions: conversionStats.totalConversions,
      conversionRate: Math.round(conversionRate * 100) / 100,
      totalEarned,
      totalPaid,
      pendingBalance,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      topReferrals: [],
      clicksBySource: {},
      conversionsByMonth: [],
    };

    await cacheManager.set(CacheNamespace.AFFILIATE, cacheKey, stats, this.CACHE_TTL);
    return stats;
  }

  private static getPeriodDates(period: AnalyticsPeriod): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'last_7_days':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'last_30_days':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case 'this_month':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'last_month':
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'this_year':
        startDate.setMonth(0);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    return { startDate, endDate };
  }
}
