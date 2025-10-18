/**
 * CEO Dashboard Service
 * Aggregates metrics from all modules for executive dashboard
 */

import { db } from '../../../db';
import { eq, and, sql, gte, lte, desc } from 'drizzle-orm';
import { ceoDashboardConfigs, ceoKpis, ceoAlerts } from '../schema/ceo.schema';
import { tenantSubscriptionPlans, subscriptionPlans } from '../../subscriptions/schema/subscription-plans.schema';
import { subscriptionHistory } from '../../subscriptions/schema/subscription-history.schema';
import { users } from '../../auth/schema/auth.schema';
import { cacheManager } from '../../../cache/cache-manager';
import logger from '../../../utils/logger';
import type {
  DashboardData,
  DashboardConfig,
  KPIMetric,
  Alert,
  RevenueMetrics,
  UserMetrics,
  SubscriptionMetrics,
  FinancialHealthMetrics,
  SystemHealthMetrics,
  ServiceResponse,
  DashboardQueryOptions,
} from '../types/ceo.types';

export class CeoService {
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly CACHE_NAMESPACE = 'ceo';

  /**
   * Get complete dashboard data
   */
  async getDashboardData(options: DashboardQueryOptions): Promise<ServiceResponse<DashboardData>> {
    try {
      const cacheKey = `dashboard:${options.tenantId}:${options.dateRange}`;

      // Try cache first
      const cached = await cacheManager.get<DashboardData>(this.CACHE_NAMESPACE, cacheKey);
      if (cached) {
        logger.debug('CEO dashboard data retrieved from cache', { tenantId: options.tenantId });
        return { success: true, data: cached };
      }

      // Calculate date range
      const { startDate, endDate } = this.calculateDateRange(options);

      // Fetch all metrics in parallel
      const [revenue, userMetrics, subscriptions, financial, system, alerts] = await Promise.all([
        this.getRevenueMetrics(options.tenantId, startDate, endDate),
        this.getUserMetrics(options.tenantId, startDate, endDate),
        this.getSubscriptionMetrics(options.tenantId, startDate, endDate),
        this.getFinancialHealthMetrics(options.tenantId, startDate, endDate),
        this.getSystemHealthMetrics(options.tenantId, startDate, endDate),
        this.getActiveAlerts(options.tenantId),
      ]);

      const dashboardData: DashboardData = {
        period: {
          start: startDate,
          end: endDate,
          days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
        },
        revenue: revenue.data ?? ({} as RevenueMetrics),
        users: userMetrics.data ?? ({} as UserMetrics),
        subscriptions: subscriptions.data ?? ({} as SubscriptionMetrics),
        financial: financial.data ?? ({} as FinancialHealthMetrics),
        system: system.data ?? ({} as SystemHealthMetrics),
        activeAlerts: alerts.data || [],
        criticalAlertsCount: alerts.data?.filter((a) => a.severity === 'critical').length || 0,
        generatedAt: new Date(),
        cacheExpiresAt: new Date(Date.now() + this.CACHE_TTL * 1000),
      };

      // Cache the result
      await cacheManager.set(this.CACHE_NAMESPACE, cacheKey, dashboardData, this.CACHE_TTL);

      logger.info('CEO dashboard data generated', {
        tenantId: options.tenantId,
        period: `${startDate.toISOString()} - ${endDate.toISOString()}`,
      });

      return { success: true, data: dashboardData };
    } catch (error) {
      logger.error('Error getting CEO dashboard data', { error, options });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'CEO_DASHBOARD_ERROR',
      };
    }
  }

  /**
   * Get real-time KPIs
   */
  async getKPIs(tenantId: string): Promise<ServiceResponse<KPIMetric[]>> {
    try {
      const cacheKey = `kpis:${tenantId}`;

      // Try cache first
      const cached = await cacheManager.get<KPIMetric[]>(this.CACHE_NAMESPACE, cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      // Get custom KPIs from database (reserved for future use)
      const _customKpis = await db
        .select()
        .from(ceoKpis)
        .where(and(eq(ceoKpis.tenantId, tenantId), eq(ceoKpis.isActive, true)))
        .orderBy(ceoKpis.sortOrder);

      // Calculate standard KPIs
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [revenue, userMetrics, subscriptions] = await Promise.all([
        this.getRevenueMetrics(tenantId, thirtyDaysAgo, now),
        this.getUserMetrics(tenantId, thirtyDaysAgo, now),
        this.getSubscriptionMetrics(tenantId, thirtyDaysAgo, now),
      ]);

      const revenueData = revenue.data ?? { mrr: 0, arr: 0, mrrGrowth: 0, arrGrowth: 0, previousPeriod: { mrr: 0, arr: 0 } } as RevenueMetrics;
      const userMetricsData = userMetrics.data ?? { activeUsers: 0, activeUserGrowth: 0, churnRate: 0, previousPeriod: { activeUsers: 0 } } as UserMetrics;
      const subscriptionsData = subscriptions.data ?? { activeSubscriptions: 0, previousPeriod: { activeSubscriptions: 0 } } as SubscriptionMetrics;

      const kpis: KPIMetric[] = [
        {
          id: 'mrr',
          name: 'MRR',
          displayName: 'Monthly Recurring Revenue',
          category: 'revenue',
          metric: 'mrr',
          value: revenueData.mrr,
          previousValue: revenueData.previousPeriod.mrr,
          changePercent: revenueData.mrrGrowth,
          unit: 'currency',
          trend: revenueData.mrrGrowth > 0 ? 'up' : revenueData.mrrGrowth < 0 ? 'down' : 'stable',
          color: 'green',
          icon: 'dollar-sign',
        },
        {
          id: 'arr',
          name: 'ARR',
          displayName: 'Annual Recurring Revenue',
          category: 'revenue',
          metric: 'arr',
          value: revenueData.arr,
          previousValue: revenueData.previousPeriod.arr,
          changePercent: revenueData.arrGrowth,
          unit: 'currency',
          trend: revenueData.arrGrowth > 0 ? 'up' : revenueData.arrGrowth < 0 ? 'down' : 'stable',
          color: 'blue',
          icon: 'trending-up',
        },
        {
          id: 'active_users',
          name: 'Active Users',
          displayName: 'Active Users',
          category: 'users',
          metric: 'active_users',
          value: userMetricsData.activeUsers,
          previousValue: userMetricsData.previousPeriod.activeUsers,
          changePercent: userMetricsData.activeUserGrowth,
          unit: 'number',
          trend:
            userMetricsData.activeUserGrowth > 0
              ? 'up'
              : userMetricsData.activeUserGrowth < 0
                ? 'down'
                : 'stable',
          color: 'purple',
          icon: 'users',
        },
        {
          id: 'churn_rate',
          name: 'Churn Rate',
          displayName: 'Churn Rate',
          category: 'retention',
          metric: 'churn',
          value: userMetricsData.churnRate,
          unit: 'percentage',
          trend: userMetricsData.churnRate < 5 ? 'stable' : 'down',
          color: userMetricsData.churnRate < 5 ? 'green' : 'red',
          icon: 'alert-triangle',
        },
        {
          id: 'total_subscriptions',
          name: 'Total Subscriptions',
          displayName: 'Total Subscriptions',
          category: 'growth',
          metric: 'active_users',
          value: subscriptionsData.activeSubscriptions,
          previousValue: subscriptionsData.previousPeriod.activeSubscriptions,
          changePercent: this.calculateGrowth(
            subscriptionsData.activeSubscriptions,
            subscriptionsData.previousPeriod.activeSubscriptions
          ),
          unit: 'number',
          color: 'indigo',
          icon: 'credit-card',
        },
      ];

      // Cache the result
      await cacheManager.set(this.CACHE_NAMESPACE, cacheKey, kpis, this.CACHE_TTL);

      return { success: true, data: kpis };
    } catch (error) {
      logger.error('Error getting KPIs', { error, tenantId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'KPI_ERROR',
      };
    }
  }

  /**
   * Get active alerts
   */
  async getAlerts(tenantId: string, severity?: string): Promise<ServiceResponse<Alert[]>> {
    try {
      const query = db
        .select()
        .from(ceoAlerts)
        .where(
          severity
            ? and(
                eq(ceoAlerts.tenantId, tenantId),
                eq(ceoAlerts.status, 'active'),
                eq(ceoAlerts.severity, severity as any)
              )
            : and(eq(ceoAlerts.tenantId, tenantId), eq(ceoAlerts.status, 'active'))
        )
        .orderBy(desc(ceoAlerts.createdAt))
        .limit(50);

      const alerts = await query;

      // Transform decimal strings to numbers for client
      const transformedAlerts = alerts.map((alert) => ({
        ...alert,
        currentValue: alert.currentValue ? parseFloat(alert.currentValue) : undefined,
        previousValue: alert.previousValue ? parseFloat(alert.previousValue) : undefined,
        changePercent: alert.changePercent ? parseFloat(alert.changePercent) : undefined,
        threshold: alert.threshold ? parseFloat(alert.threshold) : undefined,
      })) as Alert[];

      return { success: true, data: transformedAlerts };
    } catch (error) {
      logger.error('Error getting alerts', { error, tenantId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'ALERTS_ERROR',
      };
    }
  }

  /**
   * Get revenue metrics
   */
  async getRevenueMetrics(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ServiceResponse<RevenueMetrics>> {
    try {
      // Query active subscriptions for the period
      const activeSubscriptions = await db
        .select({
          planId: subscriptionPlans.id,
          planName: subscriptionPlans.name,
          priceMonthly: subscriptionPlans.priceMonthly,
          billingPeriod: tenantSubscriptionPlans.billingPeriod,
        })
        .from(tenantSubscriptionPlans)
        .innerJoin(subscriptionPlans, eq(tenantSubscriptionPlans.planId, subscriptionPlans.id))
        .where(
          and(
            eq(tenantSubscriptionPlans.tenantId, tenantId),
            eq(tenantSubscriptionPlans.status, 'active')
          )
        );

      // Calculate MRR
      let mrr = 0;
      const revenueByPlan: { [key: string]: { planId: string; planName: string; revenue: number } } = {};

      for (const sub of activeSubscriptions) {
        const monthlyPrice = parseFloat(sub.priceMonthly);
        mrr += monthlyPrice;

        if (!revenueByPlan[sub.planId]) {
          revenueByPlan[sub.planId] = {
            planId: sub.planId,
            planName: sub.planName,
            revenue: 0,
          };
        }
        revenueByPlan[sub.planId].revenue += monthlyPrice;
      }

      const arr = mrr * 12;

      // Get previous period for comparison
      const periodLength = endDate.getTime() - startDate.getTime();
      const _prevStartDate = new Date(startDate.getTime() - periodLength);
      const prevEndDate = startDate;

      const prevSubscriptions = await db
        .select({
          priceMonthly: subscriptionPlans.priceMonthly,
        })
        .from(tenantSubscriptionPlans)
        .innerJoin(subscriptionPlans, eq(tenantSubscriptionPlans.planId, subscriptionPlans.id))
        .where(
          and(
            eq(tenantSubscriptionPlans.tenantId, tenantId),
            eq(tenantSubscriptionPlans.status, 'active'),
            lte(tenantSubscriptionPlans.currentPeriodStart, prevEndDate)
          )
        );

      const prevMrr = prevSubscriptions.reduce((sum, sub) => sum + parseFloat(sub.priceMonthly), 0);
      const prevArr = prevMrr * 12;

      const mrrGrowth = this.calculateGrowth(mrr, prevMrr);
      const arrGrowth = this.calculateGrowth(arr, prevArr);

      // Calculate ARPU (Average Revenue Per User)
      const arpu = activeSubscriptions.length > 0 ? mrr / activeSubscriptions.length : 0;

      // Calculate churned revenue from canceled subscriptions in period
      const churnedRevenueResult = await db
        .select({
          total: sql<string>`COALESCE(SUM(CAST(${subscriptionHistory.oldPrice} AS DECIMAL)), 0)`,
        })
        .from(subscriptionHistory)
        .where(
          and(
            eq(subscriptionHistory.tenantId, tenantId),
            eq(subscriptionHistory.eventType, 'canceled'),
            gte(subscriptionHistory.eventTime, startDate),
            lte(subscriptionHistory.eventTime, endDate)
          )
        );

      const churnedRevenue = parseFloat(churnedRevenueResult[0]?.total || '0');

      // Calculate expansion revenue from upgrades in period
      const upgradesResult = await db
        .select({
          oldPrice: subscriptionHistory.oldPrice,
          newPrice: subscriptionHistory.newPrice,
        })
        .from(subscriptionHistory)
        .where(
          and(
            eq(subscriptionHistory.tenantId, tenantId),
            eq(subscriptionHistory.eventType, 'upgraded'),
            gte(subscriptionHistory.eventTime, startDate),
            lte(subscriptionHistory.eventTime, endDate)
          )
        );

      const expansionRevenue = upgradesResult.reduce((sum, upgrade) => {
        const oldPrice = parseFloat(upgrade.oldPrice || '0');
        const newPrice = parseFloat(upgrade.newPrice || '0');
        return sum + Math.max(0, newPrice - oldPrice);
      }, 0);

      const metrics: RevenueMetrics = {
        mrr,
        arr,
        totalRevenue: mrr,
        newRevenue: Math.max(0, mrr - prevMrr),
        mrrGrowth,
        arrGrowth,
        revenueGrowth: mrrGrowth,
        arpu,
        churnedRevenue,
        expansionRevenue,
        revenueByPlan: Object.values(revenueByPlan).map((item) => ({
          ...item,
          percentage: mrr > 0 ? (item.revenue / mrr) * 100 : 0,
        })),
        previousPeriod: {
          mrr: prevMrr,
          arr: prevArr,
          totalRevenue: prevMrr,
        },
      };

      return { success: true, data: metrics };
    } catch (error) {
      logger.error('Error getting revenue metrics', { error, tenantId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'REVENUE_METRICS_ERROR',
      };
    }
  }

  /**
   * Get user metrics
   */
  async getUserMetrics(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ServiceResponse<UserMetrics>> {
    try {
      // Count total users
      const totalUsersResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(lte(users.createdAt, endDate));

      const totalUsers = totalUsersResult[0]?.count || 0;

      // Count new users in period
      const newUsersResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(and(gte(users.createdAt, startDate), lte(users.createdAt, endDate)));

      const newUsers = newUsersResult[0]?.count || 0;

      // For demo purposes, calculate some metrics
      // In production, you'd query actual session/activity data
      const activeUsers = Math.floor(totalUsers * 0.7); // 70% active assumption
      const churnedUsers = Math.floor(totalUsers * 0.05); // 5% churn assumption

      // Previous period comparison
      const periodLength = endDate.getTime() - startDate.getTime();
      const _prevStartDate = new Date(startDate.getTime() - periodLength);

      const prevTotalUsersResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(lte(users.createdAt, startDate));

      const prevTotalUsers = prevTotalUsersResult[0]?.count || 0;
      const prevActiveUsers = Math.floor(prevTotalUsers * 0.7);

      const userGrowth = this.calculateGrowth(totalUsers, prevTotalUsers);
      const activeUserGrowth = this.calculateGrowth(activeUsers, prevActiveUsers);

      const churnRate = totalUsers > 0 ? (churnedUsers / totalUsers) * 100 : 0;
      const retentionRate = 100 - churnRate;

      const metrics: UserMetrics = {
        totalUsers,
        activeUsers,
        newUsers,
        churnedUsers,
        userGrowth,
        activeUserGrowth,
        churnRate,
        retentionRate,
        dailyActiveUsers: Math.floor(activeUsers * 0.4),
        weeklyActiveUsers: Math.floor(activeUsers * 0.7),
        monthlyActiveUsers: activeUsers,
        avgSessionDuration: 1800, // 30 minutes
        avgSessionsPerUser: 15,
        previousPeriod: {
          totalUsers: prevTotalUsers,
          activeUsers: prevActiveUsers,
          newUsers: Math.floor(newUsers * 0.8), // Estimate
        },
      };

      return { success: true, data: metrics };
    } catch (error) {
      logger.error('Error getting user metrics', { error, tenantId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'USER_METRICS_ERROR',
      };
    }
  }

  /**
   * Get subscription metrics
   */
  async getSubscriptionMetrics(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ServiceResponse<SubscriptionMetrics>> {
    try {
      // Count active subscriptions
      const activeSubsResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(tenantSubscriptionPlans)
        .where(
          and(
            eq(tenantSubscriptionPlans.tenantId, tenantId),
            eq(tenantSubscriptionPlans.status, 'active')
          )
        );

      const activeSubscriptions = activeSubsResult[0]?.count || 0;

      // Count trialing subscriptions
      const trialingSubsResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(tenantSubscriptionPlans)
        .where(
          and(
            eq(tenantSubscriptionPlans.tenantId, tenantId),
            eq(tenantSubscriptionPlans.status, 'trialing')
          )
        );

      const trialingSubscriptions = trialingSubsResult[0]?.count || 0;

      // Count new subscriptions in period
      const newSubsResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(tenantSubscriptionPlans)
        .where(
          and(
            eq(tenantSubscriptionPlans.tenantId, tenantId),
            gte(tenantSubscriptionPlans.currentPeriodStart, startDate),
            lte(tenantSubscriptionPlans.currentPeriodStart, endDate)
          )
        );

      const newSubscriptions = newSubsResult[0]?.count || 0;

      // Get subscriptions by plan
      const subsByPlan = await db
        .select({
          planId: subscriptionPlans.id,
          planName: subscriptionPlans.name,
          count: sql<number>`count(*)::int`,
        })
        .from(tenantSubscriptionPlans)
        .innerJoin(subscriptionPlans, eq(tenantSubscriptionPlans.planId, subscriptionPlans.id))
        .where(
          and(
            eq(tenantSubscriptionPlans.tenantId, tenantId),
            eq(tenantSubscriptionPlans.status, 'active')
          )
        )
        .groupBy(subscriptionPlans.id, subscriptionPlans.name);

      // Get subscriptions by billing period
      const subsByBilling = await db
        .select({
          period: tenantSubscriptionPlans.billingPeriod,
          count: sql<number>`count(*)::int`,
        })
        .from(tenantSubscriptionPlans)
        .where(
          and(
            eq(tenantSubscriptionPlans.tenantId, tenantId),
            eq(tenantSubscriptionPlans.status, 'active')
          )
        )
        .groupBy(tenantSubscriptionPlans.billingPeriod);

      const totalSubscriptions = activeSubscriptions + trialingSubscriptions;

      // Previous period
      const _periodLength = endDate.getTime() - startDate.getTime();
      const prevEndDate = startDate;

      const prevActiveSubsResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(tenantSubscriptionPlans)
        .where(
          and(
            eq(tenantSubscriptionPlans.tenantId, tenantId),
            eq(tenantSubscriptionPlans.status, 'active'),
            lte(tenantSubscriptionPlans.currentPeriodStart, prevEndDate)
          )
        );

      const prevActiveSubscriptions = prevActiveSubsResult[0]?.count || 0;

      // Count canceled subscriptions in period
      const canceledSubsResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(subscriptionHistory)
        .where(
          and(
            eq(subscriptionHistory.tenantId, tenantId),
            eq(subscriptionHistory.eventType, 'canceled'),
            gte(subscriptionHistory.eventTime, startDate),
            lte(subscriptionHistory.eventTime, endDate)
          )
        );

      const canceledSubscriptions = canceledSubsResult[0]?.count || 0;

      // Count upgrades in period
      const upgradesCountResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(subscriptionHistory)
        .where(
          and(
            eq(subscriptionHistory.tenantId, tenantId),
            eq(subscriptionHistory.eventType, 'upgraded'),
            gte(subscriptionHistory.eventTime, startDate),
            lte(subscriptionHistory.eventTime, endDate)
          )
        );

      const upgrades = upgradesCountResult[0]?.count || 0;

      // Count downgrades in period
      const downgradesCountResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(subscriptionHistory)
        .where(
          and(
            eq(subscriptionHistory.tenantId, tenantId),
            eq(subscriptionHistory.eventType, 'downgraded'),
            gte(subscriptionHistory.eventTime, startDate),
            lte(subscriptionHistory.eventTime, endDate)
          )
        );

      const downgrades = downgradesCountResult[0]?.count || 0;

      // Count cancellations in period (same as canceledSubscriptions)
      const cancellations = canceledSubscriptions;

      // Calculate trial conversion rate
      // Find trials created in period
      const trialsCreatedResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(subscriptionHistory)
        .where(
          and(
            eq(subscriptionHistory.tenantId, tenantId),
            eq(subscriptionHistory.eventType, 'created'),
            eq(subscriptionHistory.oldStatus, 'trialing'),
            gte(subscriptionHistory.eventTime, startDate),
            lte(subscriptionHistory.eventTime, endDate)
          )
        );

      const trialsCreated = trialsCreatedResult[0]?.count || 0;

      // Find trials that converted to active in period
      const trialsConvertedResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(subscriptionHistory)
        .where(
          and(
            eq(subscriptionHistory.tenantId, tenantId),
            eq(subscriptionHistory.oldStatus, 'trialing'),
            eq(subscriptionHistory.newStatus, 'active'),
            gte(subscriptionHistory.eventTime, startDate),
            lte(subscriptionHistory.eventTime, endDate)
          )
        );

      const trialsConverted = trialsConvertedResult[0]?.count || 0;

      // Calculate conversion rate percentage
      const trialConversionRate = trialsCreated > 0 ? (trialsConverted / trialsCreated) * 100 : 0;

      const metrics: SubscriptionMetrics = {
        totalSubscriptions,
        activeSubscriptions,
        trialingSubscriptions,
        canceledSubscriptions,
        subscriptionsByPlan: subsByPlan.map((item) => ({
          planId: item.planId,
          planName: item.planName,
          count: item.count,
          percentage: activeSubscriptions > 0 ? (item.count / activeSubscriptions) * 100 : 0,
        })),
        subscriptionsByBilling: subsByBilling.map((item) => ({
          period: item.period as 'monthly' | 'quarterly' | 'yearly',
          count: item.count,
          percentage: activeSubscriptions > 0 ? (item.count / activeSubscriptions) * 100 : 0,
        })),
        newSubscriptions,
        upgrades,
        downgrades,
        cancellations,
        trialConversionRate,
        previousPeriod: {
          totalSubscriptions: prevActiveSubscriptions,
          activeSubscriptions: prevActiveSubscriptions,
          newSubscriptions: Math.floor(newSubscriptions * 0.8), // Estimate
        },
      };

      return { success: true, data: metrics };
    } catch (error) {
      logger.error('Error getting subscription metrics', { error, tenantId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'SUBSCRIPTION_METRICS_ERROR',
      };
    }
  }

  /**
   * Get financial health metrics
   */
  async getFinancialHealthMetrics(
    tenantId: string,
    _startDate: Date,
    _endDate: Date
  ): Promise<ServiceResponse<FinancialHealthMetrics>> {
    try {
      // These would typically come from financial/accounting modules
      // Using placeholder values for demo
      const metrics: FinancialHealthMetrics = {
        cac: 150, // Customer Acquisition Cost
        ltv: 1800, // Lifetime Value
        ltvCacRatio: 12, // 12:1 ratio (excellent)
        grossMargin: 80, // 80%
        netMargin: 25, // 25%
        cashBalance: 500000,
        cashBurn: 50000,
        runwayMonths: 10,
        outstandingInvoices: 25000,
        overdueInvoices: 5000,
        pendingPayments: 15000,
      };

      return { success: true, data: metrics };
    } catch (error) {
      logger.error('Error getting financial health metrics', { error, tenantId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'FINANCIAL_METRICS_ERROR',
      };
    }
  }

  /**
   * Get system health metrics
   */
  async getSystemHealthMetrics(
    tenantId: string,
    _startDate: Date,
    _endDate: Date
  ): Promise<ServiceResponse<SystemHealthMetrics>> {
    try {
      // These would come from monitoring/observability modules
      // Using placeholder values for demo
      const metrics: SystemHealthMetrics = {
        avgResponseTime: 125, // ms
        errorRate: 0.5, // 0.5%
        uptime: 99.9, // 99.9%
        totalApiCalls: 1500000,
        apiCallsGrowth: 15, // 15% growth
        storageUsed: 125, // GB
        storageLimit: 500, // GB
        storagePercent: 25, // 25%
        activeBots: 45,
        activeStrategies: 120,
        activeWebhooks: 30,
      };

      return { success: true, data: metrics };
    } catch (error) {
      logger.error('Error getting system health metrics', { error, tenantId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'SYSTEM_METRICS_ERROR',
      };
    }
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(tenantId: string): Promise<ServiceResponse<Alert[]>> {
    try {
      const alerts = await db
        .select()
        .from(ceoAlerts)
        .where(and(eq(ceoAlerts.tenantId, tenantId), eq(ceoAlerts.status, 'active')))
        .orderBy(desc(ceoAlerts.createdAt))
        .limit(20);

      // Transform decimal strings to numbers for client
      const transformedAlerts = alerts.map((alert) => ({
        ...alert,
        currentValue: alert.currentValue ? parseFloat(alert.currentValue) : undefined,
        previousValue: alert.previousValue ? parseFloat(alert.previousValue) : undefined,
        changePercent: alert.changePercent ? parseFloat(alert.changePercent) : undefined,
        threshold: alert.threshold ? parseFloat(alert.threshold) : undefined,
      })) as Alert[];

      return { success: true, data: transformedAlerts };
    } catch (error) {
      logger.error('Error getting active alerts', { error, tenantId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'ALERTS_ERROR',
      };
    }
  }

  /**
   * Save dashboard configuration
   */
  async saveDashboardConfig(
    config: Partial<DashboardConfig> & { userId: string; tenantId: string }
  ): Promise<ServiceResponse<DashboardConfig>> {
    try {
      // Check if config exists
      const existing = await db
        .select()
        .from(ceoDashboardConfigs)
        .where(
          and(
            eq(ceoDashboardConfigs.userId, config.userId),
            eq(ceoDashboardConfigs.tenantId, config.tenantId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing - only update provided fields
        const updateData: any = {
          updatedAt: new Date(),
        };

        if (config.displayName !== undefined) updateData.displayName = config.displayName;
        if (config.theme) updateData.theme = config.theme;
        if (config.defaultDateRange) updateData.defaultDateRange = config.defaultDateRange;
        if (config.refreshInterval !== undefined) updateData.refreshInterval = config.refreshInterval;
        if (config.currency) updateData.currency = config.currency;
        if (config.emailAlerts !== undefined) updateData.emailAlerts = config.emailAlerts;
        if (config.pushAlerts !== undefined) updateData.pushAlerts = config.pushAlerts;

        // Handle alertThresholds - merge with existing or use defaults
        if (config.alertThresholds) {
          const existingThresholds = existing[0].alertThresholds as any || {};
          updateData.alertThresholds = {
            revenueDropPercent: config.alertThresholds.revenueDropPercent ?? existingThresholds.revenueDropPercent ?? 10,
            churnRatePercent: config.alertThresholds.churnRatePercent ?? existingThresholds.churnRatePercent ?? 5,
            activeUsersDropPercent: config.alertThresholds.activeUsersDropPercent ?? existingThresholds.activeUsersDropPercent ?? 15,
            errorRatePercent: config.alertThresholds.errorRatePercent ?? existingThresholds.errorRatePercent ?? 5,
          };
        }

        const updated = await db
          .update(ceoDashboardConfigs)
          .set(updateData)
          .where(eq(ceoDashboardConfigs.id, existing[0].id))
          .returning();

        return { success: true, data: updated[0] as DashboardConfig };
      } else {
        // Insert new - provide all required defaults
        const defaultThresholds = {
          revenueDropPercent: 10,
          churnRatePercent: 5,
          activeUsersDropPercent: 15,
          errorRatePercent: 5,
        };

        const alertThresholds = config.alertThresholds ? {
          revenueDropPercent: config.alertThresholds.revenueDropPercent ?? defaultThresholds.revenueDropPercent,
          churnRatePercent: config.alertThresholds.churnRatePercent ?? defaultThresholds.churnRatePercent,
          activeUsersDropPercent: config.alertThresholds.activeUsersDropPercent ?? defaultThresholds.activeUsersDropPercent,
          errorRatePercent: config.alertThresholds.errorRatePercent ?? defaultThresholds.errorRatePercent,
        } : defaultThresholds;

        const created = await db
          .insert(ceoDashboardConfigs)
          .values({
            userId: config.userId,
            tenantId: config.tenantId,
            displayName: config.displayName,
            theme: config.theme || 'light',
            defaultDateRange: config.defaultDateRange || '30d',
            refreshInterval: config.refreshInterval || 300,
            currency: config.currency || 'BRL',
            emailAlerts: config.emailAlerts ?? true,
            pushAlerts: config.pushAlerts ?? true,
            alertThresholds,
          })
          .returning();

        return { success: true, data: created[0] as DashboardConfig };
      }
    } catch (error) {
      logger.error('Error saving dashboard config', { error, config });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'CONFIG_SAVE_ERROR',
      };
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Calculate date range from options
   */
  private calculateDateRange(options: DashboardQueryOptions): { startDate: Date; endDate: Date } {
    const endDate = options.endDate || new Date();
    let startDate: Date;

    if (options.startDate) {
      startDate = options.startDate;
    } else {
      switch (options.dateRange) {
        case '7d':
          startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
        default:
          startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }
    }

    return { startDate, endDate };
  }

  /**
   * Calculate growth percentage
   */
  private calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }
}

// Export singleton instance
export const ceoService = new CeoService();
export default ceoService;
