/**
 * Forecasting Service
 * Revenue predictions and sales forecasting
 */

import { db } from '@/db';
import { eq, and, desc, sql, gte, lte, between } from 'drizzle-orm';
import logger from '@/utils/logger';
import { cacheManager } from '@/cache/cache-manager';
import { CacheNamespace } from '@/cache/types';
import { salesForecasts, type NewSalesForecast, deals } from '../schema';
import type {
  ForecastPeriod,
  ForecastMethodology,
  ForecastResult,
  WinRateMetrics,
  SalesCycleAnalysis,
  DateRange,
} from '../types';
import {
  generateForecast,
  calculateTrend,
  calculateWeightedRevenue,
} from '../utils/forecasting-algorithm';
import { calculateWinRate, calculateSalesCycle } from '../utils/pipeline-calculator';

export class ForecastingService {
  private static readonly CACHE_TTL = 1800; // 30 minutes

  /**
   * Generate forecast for period
   */
  static async generateForecastForPeriod(
    period: ForecastPeriod,
    tenantId: string,
    userId: string,
    methodology: ForecastMethodology = 'weighted_pipeline'
  ): Promise<ForecastResult> {
    logger.info('Generating forecast', { period, methodology, tenantId });

    const cacheKey = `forecast:${tenantId}:${period}:${methodology}`;

    // Check cache
    const cached = await cacheManager.get<ForecastResult>(CacheNamespace.USERS, cacheKey);
    if (cached) {
      return cached;
    }

    // Get all open deals
    const openDeals = await db
      .select()
      .from(deals)
      .where(and(eq(deals.tenantId, tenantId), eq(deals.status, 'open')))
      .orderBy(desc(deals.createdAt));

    // Get historical revenue (last 12 months of closed deals)
    const historicalRevenue = await this.getHistoricalRevenue(tenantId, 12);

    // Generate forecast
    const forecastData = generateForecast(openDeals, historicalRevenue, methodology);

    // Calculate forecast date based on period
    const forecastDate = this.getForecastDate(period);

    // Save forecast to database
    const newForecast: NewSalesForecast = {
      tenantId,
      createdBy: userId,
      period,
      forecastDate,
      predictedRevenue: forecastData.predictedRevenue.toString(),
      weightedRevenue: forecastData.weightedRevenue.toString(),
      bestCase: forecastData.bestCase.toString(),
      worstCase: forecastData.worstCase.toString(),
      confidenceLevel: forecastData.confidenceLevel,
      methodology,
    };

    const [forecast] = await db.insert(salesForecasts).values(newForecast).returning();

    // Calculate trends
    const previousPeriodRevenue =
      historicalRevenue.length > 0 ? historicalRevenue[historicalRevenue.length - 1] : 0;
    const trends = calculateTrend(forecastData.predictedRevenue, previousPeriodRevenue);

    // Calculate conversion rate
    const allDeals = await db
      .select()
      .from(deals)
      .where(eq(deals.tenantId, tenantId));

    const conversionRate = calculateWinRate(allDeals);

    const result: ForecastResult = {
      forecast,
      breakdown: {
        openDeals: openDeals.length,
        totalValue: openDeals.reduce((sum, d) => sum + parseFloat(d.value.toString()), 0),
        weightedValue: forecastData.weightedRevenue,
        conversionRate,
      },
      trends,
    };

    // Cache result
    await cacheManager.set(CacheNamespace.USERS, cacheKey, result, this.CACHE_TTL);

    logger.info('Forecast generated', { period, predictedRevenue: forecastData.predictedRevenue });
    return result;
  }

  /**
   * Get weighted pipeline value
   */
  static async getWeightedPipeline(tenantId: string): Promise<number> {
    const openDeals = await db
      .select()
      .from(deals)
      .where(and(eq(deals.tenantId, tenantId), eq(deals.status, 'open')));

    return calculateWeightedRevenue(openDeals);
  }

  /**
   * Get predicted revenue for period
   */
  static async getPredictedRevenue(
    period: ForecastPeriod,
    tenantId: string,
    userId: string
  ): Promise<number> {
    const forecast = await this.generateForecastForPeriod(period, tenantId, userId);
    return parseFloat(forecast.forecast.predictedRevenue.toString());
  }

  /**
   * Get win rate analysis
   */
  static async getWinRateAnalysis(
    userId: string | null,
    tenantId: string,
    dateRange?: DateRange
  ): Promise<WinRateMetrics> {
    logger.info('Calculating win rate', { userId, tenantId });

    const conditions = [eq(deals.tenantId, tenantId)];

    // Filter by user if provided
    if (userId) {
      conditions.push(eq(deals.ownerId, userId));
    }

    // Filter by date range if provided
    if (dateRange) {
      conditions.push(between(deals.createdAt, dateRange.from, dateRange.to));
    }

    // Get all deals
    const allDeals = await db
      .select()
      .from(deals)
      .where(and(...conditions));

    // Calculate metrics
    const totalDeals = allDeals.filter((d) => d.status === 'won' || d.status === 'lost').length;
    const won = allDeals.filter((d) => d.status === 'won').length;
    const lost = allDeals.filter((d) => d.status === 'lost').length;
    const winRate = totalDeals > 0 ? (won / totalDeals) * 100 : 0;

    // Calculate average deal value
    const wonDeals = allDeals.filter((d) => d.status === 'won');
    const averageDealValue =
      wonDeals.length > 0
        ? wonDeals.reduce((sum, d) => sum + parseFloat(d.value.toString()), 0) / wonDeals.length
        : 0;

    // Calculate sales cycle
    const averageSalesCycle = calculateSalesCycle(allDeals);

    // Calculate average time to close (for won deals only)
    const closedWonDeals = wonDeals.filter((d) => d.actualCloseDate);
    const averageTimeToClose =
      closedWonDeals.length > 0
        ? closedWonDeals.reduce((sum, d) => {
            const created = new Date(d.createdAt).getTime();
            if (!d.actualCloseDate) {
              return sum;
            }
            const closed = new Date(d.actualCloseDate).getTime();
            return sum + (closed - created) / (1000 * 60 * 60 * 24);
          }, 0) / closedWonDeals.length
        : 0;

    return {
      totalDeals,
      won,
      lost,
      winRate,
      averageDealValue,
      averageSalesCycle,
      averageTimeToClose: Math.round(averageTimeToClose),
    };
  }

  /**
   * Get sales cycle analysis
   */
  static async getSalesCycle(tenantId: string): Promise<SalesCycleAnalysis> {
    logger.info('Analyzing sales cycle', { tenantId });

    // Get all closed deals
    const closedDeals = await db
      .select()
      .from(deals)
      .where(
        and(
          eq(deals.tenantId, tenantId),
          sql`${deals.actualCloseDate} IS NOT NULL`,
          sql`${deals.status} IN ('won', 'lost')`
        )
      );

    if (closedDeals.length === 0) {
      return {
        averageDays: 0,
        medianDays: 0,
        shortestDeal: 0,
        longestDeal: 0,
        byStage: {},
      };
    }

    // Calculate days for each deal
    const dealDays = closedDeals
      .filter((deal) => deal.actualCloseDate)
      .map((deal) => {
        const created = new Date(deal.createdAt).getTime();
        // actualCloseDate is guaranteed to exist here due to filter above
        const closed = new Date(deal.actualCloseDate as Date).getTime();
        return Math.round((closed - created) / (1000 * 60 * 60 * 24));
      });

    // Sort for median
    dealDays.sort((a, b) => a - b);

    const averageDays = Math.round(dealDays.reduce((a, b) => a + b, 0) / dealDays.length);
    const medianDays = dealDays[Math.floor(dealDays.length / 2)];
    const shortestDeal = Math.min(...dealDays);
    const longestDeal = Math.max(...dealDays);

    // Calculate by stage (simplified - would need deal history for accurate data)
    const byStage: Record<string, number> = {};

    return {
      averageDays,
      medianDays,
      shortestDeal,
      longestDeal,
      byStage,
    };
  }

  /**
   * Get historical revenue (monthly)
   */
  private static async getHistoricalRevenue(
    tenantId: string,
    months: number
  ): Promise<number[]> {
    const revenue: number[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

      const [result] = await db
        .select({
          total: sql<string>`COALESCE(SUM(${deals.value}), 0)`,
        })
        .from(deals)
        .where(
          and(
            eq(deals.tenantId, tenantId),
            eq(deals.status, 'won'),
            gte(deals.actualCloseDate, monthStart),
            lte(deals.actualCloseDate, monthEnd)
          )
        );

      revenue.push(parseFloat(result.total));
    }

    return revenue;
  }

  /**
   * Get forecast date based on period
   */
  private static getForecastDate(period: ForecastPeriod): Date {
    const now = new Date();

    switch (period) {
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
      case 'quarterly':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        return new Date(now.getFullYear(), (currentQuarter + 1) * 3, 1);
      case 'yearly':
        return new Date(now.getFullYear() + 1, 0, 1);
      default:
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }
  }
}
