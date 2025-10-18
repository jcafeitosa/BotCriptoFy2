/**
 * CEO Dashboard Service
 * Aggregates metrics from all modules for executive dashboard
 */

import { db } from '../../../db';
import { eq, and, sql, gte, lte, desc, isNotNull } from 'drizzle-orm';
import { ceoDashboardConfigs, ceoKpis, ceoAlerts } from '../schema/ceo.schema';
import { tenantSubscriptionPlans, subscriptionPlans } from '../../subscriptions/schema/subscription-plans.schema';
import { subscriptionHistory } from '../../subscriptions/schema/subscription-history.schema';
import { users } from '../../auth/schema/auth.schema';
import { tenantMembers } from '../../tenants/schema/tenants.schema';
import { cacheManager } from '../../../cache/cache-manager';
import logger from '../../../utils/logger';
import { invoices } from '../../financial/schema/invoices.schema';
import { paymentTransactions, paymentGateways } from '../../financial/schema/payments.schema';
import { chartOfAccounts, accountBalances } from '../../financial/schema/ledger.schema';
import { tradingStrategies } from '../../strategies/schema/strategies.schema';
import { bots } from '../../bots/schema/bots.schema';
import { metricsRegistry } from '../../monitoring/metrics/registry';
import { systemMetrics } from '../../monitoring/metrics/collectors/system.metrics';
import { summarizeHttpMetrics } from '../utils/metrics.util';
import * as fs from 'fs';
import * as path from 'path';
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
   * Acknowledge an alert
   */
  async acknowledgeAlert(tenantId: string, alertId: string, userId: string): Promise<ServiceResponse<Alert>> {
    try {
      const [updated] = await db
        .update(ceoAlerts)
        .set({ status: 'acknowledged', acknowledgedAt: new Date(), acknowledgedBy: userId, updatedAt: new Date() })
        .where(and(eq(ceoAlerts.id, alertId as any), eq(ceoAlerts.tenantId, tenantId as any)))
        .returning();
      if (!updated) {
        return { success: false, error: 'Alert not found', code: 'ALERT_NOT_FOUND' };
      }
      return { success: true, data: (updated as unknown) as Alert };
    } catch (error) {
      logger.error('Error acknowledging alert', { error, tenantId, alertId });
      return { success: false, error: 'ALERT_ACK_ERROR', code: 'ALERT_ACK_ERROR' };
    }
  }

  /** Resolve an alert */
  async resolveAlert(tenantId: string, alertId: string, userId: string): Promise<ServiceResponse<Alert>> {
    try {
      const [updated] = await db
        .update(ceoAlerts)
        .set({ status: 'resolved', resolvedAt: new Date(), resolvedBy: userId, updatedAt: new Date() })
        .where(and(eq(ceoAlerts.id, alertId as any), eq(ceoAlerts.tenantId, tenantId as any)))
        .returning();
      if (!updated) {
        return { success: false, error: 'Alert not found', code: 'ALERT_NOT_FOUND' };
      }
      return { success: true, data: (updated as unknown) as Alert };
    } catch (error) {
      logger.error('Error resolving alert', { error, tenantId, alertId });
      return { success: false, error: 'ALERT_RESOLVE_ERROR', code: 'ALERT_RESOLVE_ERROR' };
    }
  }

  /** Dismiss an alert */
  async dismissAlert(tenantId: string, alertId: string): Promise<ServiceResponse<Alert>> {
    try {
      const [updated] = await db
        .update(ceoAlerts)
        .set({ status: 'dismissed', updatedAt: new Date() })
        .where(and(eq(ceoAlerts.id, alertId as any), eq(ceoAlerts.tenantId, tenantId as any)))
        .returning();
      if (!updated) return { success: false, error: 'Alert not found', code: 'ALERT_NOT_FOUND' };
      return { success: true, data: (updated as unknown) as Alert };
    } catch (error) {
      logger.error('Error dismissing alert', { error, tenantId, alertId });
      return { success: false, error: 'ALERT_DISMISS_ERROR', code: 'ALERT_DISMISS_ERROR' };
    }
  }

  /**
   * Trend: new users per day
   */
  async getUserTrends(tenantId: string, startDate: Date, endDate: Date): Promise<ServiceResponse<Array<{ bucket: string; count: number }>>> {
    try {
      const rows = await db
        .select({
          bucket: sql<string>`to_char(date_trunc('day', ${tenantMembers.joinedAt}) AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
          count: sql<number>`count(*)::int`,
        })
        .from(tenantMembers)
        .where(
          and(
            eq(tenantMembers.tenantId, tenantId as any),
            gte(tenantMembers.joinedAt, startDate),
            lte(tenantMembers.joinedAt, endDate)
          )
        )
        .groupBy(sql`date_trunc('day', ${tenantMembers.joinedAt})`)
        .orderBy(sql`date_trunc('day', ${tenantMembers.joinedAt})`);

      return { success: true, data: rows };
    } catch (error) {
      logger.error('Error getting user trends', { error, tenantId });
      return { success: false, error: 'USER_TRENDS_ERROR', code: 'USER_TRENDS_ERROR' };
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
      // Total users in tenant = active memberships count
      const totalUsersResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(tenantMembers)
        .where(and(eq(tenantMembers.tenantId, tenantId as any), eq(tenantMembers.status, 'active')));
      const totalUsers = totalUsersResult[0]?.count || 0;

      // New users in period = memberships joined in range
      const newUsersResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(tenantMembers)
        .where(
          and(
            eq(tenantMembers.tenantId, tenantId as any),
            gte(tenantMembers.joinedAt, startDate),
            lte(tenantMembers.joinedAt, endDate)
          )
        );
      const newUsers = newUsersResult[0]?.count || 0;

      // Active/Churn approximations (until session/activity and churn events available)
      const activeUsers = Math.floor(totalUsers * 0.7);
      const churnedUsers = Math.floor(totalUsers * 0.05);

      // Previous period comparison based on membership snapshot
      const periodLength = endDate.getTime() - startDate.getTime();
      const prevEnd = startDate;
      const prevTotalUsersResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(tenantMembers)
        .where(and(eq(tenantMembers.tenantId, tenantId as any), lte(tenantMembers.joinedAt, prevEnd)));
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
      // Determine fiscal period (YYYY-MM) using endDate
      const end = _endDate || new Date();
      const fiscalPeriod = `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, '0')}`;

      // Profit & Loss for net margin
      const { ReportService } = await import('../../financial/services/report.service');
      const reportService = new ReportService();
      const pl = await reportService.generateProfitLoss(tenantId, fiscalPeriod);

      let netMargin = 0;
      let revenueTotal = 0;
      let expenseTotal = 0;
      if (pl.success && pl.data) {
        revenueTotal = parseFloat(pl.data.revenue.total);
        expenseTotal = parseFloat(pl.data.expenses.total);
        const netIncome = revenueTotal - expenseTotal;
        netMargin = revenueTotal > 0 ? (netIncome / revenueTotal) * 100 : 0;
      }

      // Cash flow closing balance as cash balance
      const cf = await reportService.generateCashFlow(tenantId, fiscalPeriod);
      const cashBalance = cf.success && cf.data ? parseFloat(cf.data.closingBalance) : 0;

      // Approximate cash burn: if net negative in P&L, use -(netIncome); else 0
      const netIncome = revenueTotal - expenseTotal;
      const cashBurn = netIncome < 0 ? Math.abs(netIncome) : 0;
      const runwayMonths = cashBurn > 0 ? +(cashBalance / cashBurn).toFixed(2) : Infinity;

      // Outstanding invoices (pending AR)
      const [outstandingRow] = await db
        .select({
          total: sql<string>`COALESCE(SUM(CAST(${invoices.remainingAmount} AS DECIMAL)), 0)::text`,
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.tenantId, tenantId as any),
            sql`${invoices.type} = 'income'`,
            sql`${invoices.paymentStatus} IN ('pending','partial')`
          )
        );
      const outstandingInvoices = parseFloat(outstandingRow?.total || '0');

      // Overdue invoices (past due and not fully paid)
      const now = new Date();
      const [overdueRow] = await db
        .select({
          total: sql<string>`COALESCE(SUM(CAST(${invoices.remainingAmount} AS DECIMAL)), 0)::text`,
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.tenantId, tenantId as any),
            sql`${invoices.type} = 'income'`,
            lte(invoices.dueDate, now),
            sql`${invoices.paymentStatus} <> 'paid'`
          )
        );
      const overdueInvoices = parseFloat(overdueRow?.total || '0');

      // Pending payments (AP transactions not completed)
      const [pendingPaymentsRow] = await db
        .select({
          total: sql<string>`COALESCE(SUM(CAST(${paymentTransactions.amount} AS DECIMAL)), 0)::text`,
        })
        .from(paymentTransactions)
        .where(
          and(
            eq(paymentTransactions.tenantId, tenantId as any),
            sql`${paymentTransactions.status} IN ('pending','processing')`
          )
        );
      const pendingPayments = parseFloat(pendingPaymentsRow?.total || '0');

      // CAC/LTV best-effort placeholders from available data: derive from ARPU where possible
      // ARPU proxy: monthly revenue per active subscription
      const activeSubsCountRow = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(tenantSubscriptionPlans)
        .where(and(eq(tenantSubscriptionPlans.tenantId, tenantId), eq(tenantSubscriptionPlans.status, 'active')))
        .limit(1);
      const activeSubsCount = activeSubsCountRow[0]?.count || 0;
      const mrrProxy = revenueTotal / Math.max(1, (_endDate.getTime() - _startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
      const arpuProxy = activeSubsCount > 0 ? mrrProxy / activeSubsCount : 0;
      const ltv = +(arpuProxy * 24).toFixed(2); // assume 24 months lifetime unless better data exists
      const cac = 0; // marketing spend not modeled; report 0 until expense classification exists
      const ltvCacRatio = cac > 0 ? +(ltv / cac).toFixed(2) : Infinity;

      const metrics: FinancialHealthMetrics = {
        cac,
        ltv,
        ltvCacRatio,
        grossMargin: netMargin, // without COGS classification, use net margin as conservative proxy
        netMargin: +netMargin.toFixed(2),
        cashBalance: +cashBalance.toFixed(2),
        cashBurn: +cashBurn.toFixed(2),
        runwayMonths: isFinite(runwayMonths) ? runwayMonths : 0,
        outstandingInvoices: +outstandingInvoices.toFixed(2),
        overdueInvoices: +overdueInvoices.toFixed(2),
        pendingPayments: +pendingPayments.toFixed(2),
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
      // Force collection of latest system metrics
      systemMetrics.collect();
      const metricsJSON = await metricsRegistry.getMetricsJSON();

      const httpSummary = summarizeHttpMetrics(metricsJSON as any[]);
      const totalApiCalls = httpSummary.totalApiCalls;
      const errorRate = httpSummary.errorRatePercent;
      const avgResponseTime = httpSummary.avgResponseTimeMs;

      // Uptime approximation: process uptime vs period length (capped 100)
      const periodSeconds = Math.max(1, Math.floor((_endDate.getTime() - _startDate.getTime()) / 1000));
      const uptimeSeconds = Math.min(process.uptime(), periodSeconds);
      const uptime = +Math.min(100, (uptimeSeconds / periodSeconds) * 100).toFixed(2);

      // Storage usage (local provider)
      const baseDir = process.env.STORAGE_LOCAL_PATH || './storage/documents';
      const storageUsedBytes = await this.getDirectorySizeSafe(baseDir);
      const storageUsed = +(storageUsedBytes / (1024 ** 3)).toFixed(2); // GB
      const storageLimit = +(process.env.STORAGE_LIMIT_GB ? Number(process.env.STORAGE_LIMIT_GB) : 500);
      const storagePercent = +Math.min(100, (storageUsed / storageLimit) * 100).toFixed(2);

      // Active resources (DB counts)
      const activeBotsRow = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(bots)
        .where(and(eq(bots.tenantId, tenantId), eq(bots.status, 'running')))
        .limit(1);
      const activeBotsCount = activeBotsRow[0]?.count || 0;

      const activeStrategiesRow = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(tradingStrategies)
        .where(and(eq(tradingStrategies.tenantId, tenantId), eq(tradingStrategies.status, 'active')))
        .limit(1);
      const activeStrategies = activeStrategiesRow[0]?.count || 0;

      const activeWebhooksRow = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(paymentGateways)
        .where(and(eq(paymentGateways.isActive, true), isNotNull(paymentGateways.webhookUrl)))
        .limit(1);
      const activeWebhooks = activeWebhooksRow[0]?.count || 0;

      const metrics: SystemHealthMetrics = {
        avgResponseTime,
        errorRate,
        uptime,
        totalApiCalls,
        apiCallsGrowth: 0,
        storageUsed,
        storageLimit,
        storagePercent,
        activeBots: activeBotsCount,
        activeStrategies,
        activeWebhooks,
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
   * Compute directory size safely (returns 0 if not found)
   */
  private async getDirectorySizeSafe(dirPath: string): Promise<number> {
    try {
      const stat = await fs.promises.stat(dirPath).catch(() => null as any);
      if (!stat) return 0;
      if (stat.isFile()) return stat.size;
      if (!stat.isDirectory()) return 0;
      let total = 0;
      const entries = await fs.promises.readdir(dirPath);
      for (const entry of entries) {
        const full = path.join(dirPath, entry);
        total += await this.getDirectorySizeSafe(full);
      }
      return total;
    } catch {
      return 0;
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
