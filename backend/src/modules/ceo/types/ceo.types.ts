/**
 * CEO Dashboard Types
 * Type definitions for CEO dashboard data structures
 */

/**
 * Dashboard Configuration
 */
export interface DashboardConfig {
  userId: string;
  tenantId: string;
  displayName?: string;
  theme: 'light' | 'dark' | 'auto';
  defaultDateRange: '7d' | '30d' | '90d' | '1y';
  refreshInterval: number;
  currency: string;
  emailAlerts: boolean;
  pushAlerts: boolean;
  alertThresholds?: {
    revenueDropPercent?: number;
    churnRatePercent?: number;
    activeUsersDropPercent?: number;
    errorRatePercent?: number;
  };
}

/**
 * KPI Metric Types
 */
export type KPIMetricType =
  | 'mrr' // Monthly Recurring Revenue
  | 'arr' // Annual Recurring Revenue
  | 'cac' // Customer Acquisition Cost
  | 'ltv' // Lifetime Value
  | 'churn' // Churn Rate
  | 'arpu' // Average Revenue Per User
  | 'active_users'
  | 'new_users'
  | 'total_users'
  | 'conversion_rate'
  | 'retention_rate'
  | 'revenue_growth'
  | 'user_growth';

/**
 * KPI Metric Definition
 */
export interface KPIMetric {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  category: 'revenue' | 'users' | 'growth' | 'retention' | 'health';
  metric: KPIMetricType;
  value: number | string;
  previousValue?: number | string;
  changePercent?: number;
  unit: 'number' | 'currency' | 'percentage';
  target?: number;
  targetPeriod?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  trend?: 'up' | 'down' | 'stable';
  color?: string;
  icon?: string;
}

/**
 * Alert Severity Levels
 */
export type AlertSeverity = 'critical' | 'warning' | 'info';

/**
 * Alert Status
 */
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'dismissed';

/**
 * Alert Definition
 */
export interface Alert {
  id: string;
  tenantId: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  metric?: string;
  currentValue?: number | string;
  previousValue?: number | string;
  changePercent?: number;
  threshold?: number;
  category: 'revenue' | 'users' | 'system' | 'security';
  source?: string;
  resourceId?: string;
  resourceType?: string;
  status: AlertStatus;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  actionUrl?: string;
  actionLabel?: string;
  notificationSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Revenue Metrics
 */
export interface RevenueMetrics {
  // Current Period
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  totalRevenue: number;
  newRevenue: number;

  // Growth
  mrrGrowth: number; // Percentage
  arrGrowth: number; // Percentage
  revenueGrowth: number; // Percentage

  // Per User
  arpu: number; // Average Revenue Per User

  // Churn Impact
  churnedRevenue: number;
  expansionRevenue: number;

  // Breakdown
  revenueByPlan: Array<{
    planId: string;
    planName: string;
    revenue: number;
    percentage: number;
  }>;

  // Period Comparison
  previousPeriod: {
    mrr: number;
    arr: number;
    totalRevenue: number;
  };
}

/**
 * User Metrics
 */
export interface UserMetrics {
  // Current Counts
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  churnedUsers: number;

  // Growth
  userGrowth: number; // Percentage
  activeUserGrowth: number; // Percentage

  // Rates
  churnRate: number; // Percentage
  retentionRate: number; // Percentage

  // Activity
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;

  // Engagement
  avgSessionDuration: number; // seconds
  avgSessionsPerUser: number;

  // Period Comparison
  previousPeriod: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
  };
}

/**
 * Subscription Metrics
 */
export interface SubscriptionMetrics {
  // Current Subscriptions
  totalSubscriptions: number;
  activeSubscriptions: number;
  trialingSubscriptions: number;
  canceledSubscriptions: number;

  // Plan Distribution
  subscriptionsByPlan: Array<{
    planId: string;
    planName: string;
    count: number;
    percentage: number;
  }>;

  // Billing Period Distribution
  subscriptionsByBilling: Array<{
    period: 'monthly' | 'quarterly' | 'yearly';
    count: number;
    percentage: number;
  }>;

  // Changes
  newSubscriptions: number;
  upgrades: number;
  downgrades: number;
  cancellations: number;

  // Conversion
  trialConversionRate: number; // Percentage

  // Period Comparison
  previousPeriod: {
    totalSubscriptions: number;
    activeSubscriptions: number;
    newSubscriptions: number;
  };
}

/**
 * Financial Health Metrics
 */
export interface FinancialHealthMetrics {
  // Efficiency
  cac: number; // Customer Acquisition Cost
  ltv: number; // Lifetime Value
  ltvCacRatio: number;

  // Profitability
  grossMargin: number; // Percentage
  netMargin: number; // Percentage

  // Cash Flow
  cashBalance: number;
  cashBurn: number;
  runwayMonths: number;

  // Receivables
  outstandingInvoices: number;
  overdueInvoices: number;

  // Payables
  pendingPayments: number;
}

/**
 * System Health Metrics
 */
export interface SystemHealthMetrics {
  // Performance
  avgResponseTime: number; // ms
  errorRate: number; // Percentage
  uptime: number; // Percentage

  // API Usage
  totalApiCalls: number;
  apiCallsGrowth: number; // Percentage

  // Storage
  storageUsed: number; // GB
  storageLimit: number; // GB
  storagePercent: number; // Percentage

  // Active Resources
  activeBots: number;
  activeStrategies: number;
  activeWebhooks: number;
}

/**
 * Complete Dashboard Data
 */
export interface DashboardData {
  // Overview
  period: {
    start: Date;
    end: Date;
    days: number;
  };

  // Key Metrics
  revenue: RevenueMetrics;
  users: UserMetrics;
  subscriptions: SubscriptionMetrics;
  financial: FinancialHealthMetrics;
  system: SystemHealthMetrics;

  // Alerts
  activeAlerts: Alert[];
  criticalAlertsCount: number;

  // Timestamp
  generatedAt: Date;
  cacheExpiresAt?: Date;
}

/**
 * Date Range Options
 */
export type DateRangeType = '7d' | '30d' | '90d' | '1y' | 'custom';

/**
 * Dashboard Query Options
 */
export interface DashboardQueryOptions {
  tenantId: string;
  dateRange: DateRangeType;
  startDate?: Date;
  endDate?: Date;
  includeComparison?: boolean;
  metrics?: KPIMetricType[];
}

/**
 * Service Response Wrapper
 */
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}
