/**
 * Subscriptions Module Types
 * Centralized type definitions for subscription management
 */

import type {
  SubscriptionPlan,
  NewSubscriptionPlan,
  SubscriptionFeature,
  NewSubscriptionFeature,
  TenantSubscriptionPlan,
  NewTenantSubscriptionPlan,
} from '../schema/subscription-plans.schema';

import type {
  SubscriptionUsage,
  NewSubscriptionUsage,
  SubscriptionUsageEvent,
  NewSubscriptionUsageEvent,
  SubscriptionQuota,
  NewSubscriptionQuota,
} from '../schema/subscription-usage.schema';

import type {
  SubscriptionHistory,
  NewSubscriptionHistory,
  SubscriptionInvoice,
  NewSubscriptionInvoice,
  SubscriptionNotification,
  NewSubscriptionNotification,
} from '../schema/subscription-history.schema';

// Re-export all schema types
export type {
  // Plans
  SubscriptionPlan,
  NewSubscriptionPlan,
  SubscriptionFeature,
  NewSubscriptionFeature,
  TenantSubscriptionPlan,
  NewTenantSubscriptionPlan,
  // Usage
  SubscriptionUsage,
  NewSubscriptionUsage,
  SubscriptionUsageEvent,
  NewSubscriptionUsageEvent,
  SubscriptionQuota,
  NewSubscriptionQuota,
  // History
  SubscriptionHistory,
  NewSubscriptionHistory,
  SubscriptionInvoice,
  NewSubscriptionInvoice,
  SubscriptionNotification,
  NewSubscriptionNotification,
};

// ============================================
// DTOs (Data Transfer Objects)
// ============================================

/**
 * Plan Limits Interface
 * Defines resource limits for each plan
 */
export interface PlanLimits {
  maxBots: number;
  maxStrategies: number;
  maxBacktests: number;
  maxExchanges: number;
  maxApiCalls: number;
  maxWebhooks: number;
  maxAlerts: number;
  maxOrders: number;
  storageGB: number;
  historicalDataMonths: number;
  aiModelAccess: boolean;
  prioritySupport: boolean;
  customDomain: boolean;
  whiteLabel: boolean;
  apiAccess: boolean;
  webhookAccess: boolean;
}

/**
 * Create Subscription Plan DTO
 */
export interface CreateSubscriptionPlanDTO {
  name: string;
  displayName: string;
  description?: string;
  slug: string;
  price: string; // Decimal as string
  currency?: string;
  billingPeriod?: 'monthly' | 'yearly';
  stripeProductId?: string;
  stripePriceId?: string;
  limits: PlanLimits;
  features: string[];
  isActive?: boolean;
  isPublic?: boolean;
  isFeatured?: boolean;
  sortOrder?: number;
  trialDays?: number;
  trialPrice?: string;
  metadata?: Record<string, any>;
}

/**
 * Update Subscription Plan DTO
 */
export interface UpdateSubscriptionPlanDTO {
  displayName?: string;
  description?: string;
  price?: string;
  limits?: Partial<PlanLimits>;
  features?: string[];
  isActive?: boolean;
  isPublic?: boolean;
  isFeatured?: boolean;
  sortOrder?: number;
  trialDays?: number;
  trialPrice?: string;
  metadata?: Record<string, any>;
}

/**
 * Create Subscription Feature DTO
 */
export interface CreateSubscriptionFeatureDTO {
  name: string;
  displayName: string;
  description?: string;
  slug: string;
  category: string;
  isCore?: boolean;
  isPremium?: boolean;
  isEnterprise?: boolean;
  icon?: string;
  sortOrder?: number;
}

/**
 * Update Subscription Feature DTO
 */
export interface UpdateSubscriptionFeatureDTO {
  displayName?: string;
  description?: string;
  category?: string;
  isCore?: boolean;
  isPremium?: boolean;
  isEnterprise?: boolean;
  icon?: string;
  sortOrder?: number;
}

/**
 * Subscribe to Plan DTO (via Better-Auth + Stripe)
 */
export interface SubscribeToPlanDTO {
  planId: string;
  tenantId: string;
  paymentMethodId?: string; // Stripe payment method
  trialPeriodDays?: number;
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
  metadata?: Record<string, any>;
}

/**
 * Change Plan DTO (Upgrade/Downgrade)
 */
export interface ChangePlanDTO {
  newPlanId: string;
  reason?: string;
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
  effectiveDate?: 'immediate' | 'end_of_period';
}

/**
 * Cancel Subscription DTO
 */
export interface CancelSubscriptionDTO {
  reason?: string;
  cancelAtPeriodEnd?: boolean; // true = cancel at end, false = cancel immediately
  feedback?: string;
}

/**
 * Record Usage Event DTO
 */
export interface RecordUsageEventDTO {
  tenantId: string;
  eventType: string;
  eventCategory: 'trading' | 'api' | 'storage' | 'feature';
  resourceType: string;
  resourceId?: string;
  quantity?: number;
  unitType: string;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Check Quota DTO
 */
export interface CheckQuotaDTO {
  tenantId: string;
  quotaType: string;
  requiredAmount?: number;
}

/**
 * Quota Status Response
 */
export interface QuotaStatusResponse {
  allowed: boolean;
  quotaType: string;
  limit: number;
  used: number;
  remaining: number;
  percentage: number;
  isExceeded: boolean;
  isSoftLimitReached: boolean;
  resetAt: Date;
  message?: string;
}

/**
 * Usage Summary Response
 */
export interface UsageSummaryResponse {
  tenantId: string;
  planId: string;
  planName: string;
  period: {
    start: Date;
    end: Date;
  };
  usage: {
    bots: { used: number; limit: number; percentage: number };
    strategies: { used: number; limit: number; percentage: number };
    backtests: { used: number; limit: number; percentage: number };
    apiCalls: { used: number; limit: number; percentage: number };
    storage: { usedMB: number; limitGB: number; percentage: number };
    [key: string]: { used: number; limit: number; percentage: number } | { usedMB: number; limitGB: number; percentage: number };
  };
  warnings: string[];
  exceededLimits: string[];
}

/**
 * Subscription Status Response (from Better-Auth/Stripe)
 */
export interface SubscriptionStatusResponse {
  tenantId: string;
  plan: {
    id: string;
    name: string;
    displayName: string;
    slug: string;
    price: string;
    currency: string;
    billingPeriod: string;
  };
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';
  currentPeriod: {
    start: Date;
    end: Date;
  };
  trial?: {
    start: Date;
    end: Date;
    daysRemaining: number;
  };
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  limits: PlanLimits;
  features: SubscriptionFeature[];
}

/**
 * Invoice List Response
 */
export interface InvoiceListResponse {
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    total: string;
    currency: string;
    dueDate: Date;
    paidAt?: Date;
    invoicePdfUrl?: string;
    hostedInvoiceUrl?: string;
  }>;
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Subscription Analytics Response
 */
export interface SubscriptionAnalyticsResponse {
  totalTenants: number;
  activeTenants: number;
  trialingTenants: number;
  canceledTenants: number;
  planDistribution: Array<{
    planId: string;
    planName: string;
    count: number;
    percentage: number;
    mrr: string; // Monthly Recurring Revenue
  }>;
  revenue: {
    mrr: string; // Monthly Recurring Revenue
    arr: string; // Annual Recurring Revenue
    totalRevenue: string;
    averageRevenuePerTenant: string;
  };
  churn: {
    rate: number; // Percentage
    count: number;
    period: 'month' | 'quarter' | 'year';
  };
  growth: {
    newSubscriptions: number;
    upgrades: number;
    downgrades: number;
    cancellations: number;
    netGrowth: number;
  };
}

/**
 * Feature Access Check Response
 */
export interface FeatureAccessResponse {
  hasAccess: boolean;
  feature: string;
  reason?: string;
  upgradeRequired?: boolean;
  minimumPlan?: string;
}

// ============================================
// Event Types (for webhooks and notifications)
// ============================================

export type SubscriptionEventType =
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.canceled'
  | 'subscription.renewed'
  | 'subscription.trial_ending'
  | 'subscription.trial_ended'
  | 'plan.upgraded'
  | 'plan.downgraded'
  | 'payment.succeeded'
  | 'payment.failed'
  | 'payment.refunded'
  | 'invoice.created'
  | 'invoice.paid'
  | 'invoice.payment_failed'
  | 'usage.limit_reached'
  | 'usage.limit_exceeded'
  | 'usage.warning';

export type NotificationType =
  | 'trial_ending'
  | 'trial_ended'
  | 'payment_failed'
  | 'payment_succeeded'
  | 'subscription_canceled'
  | 'subscription_renewed'
  | 'limit_reached'
  | 'limit_exceeded'
  | 'upgrade_available'
  | 'feature_unlocked';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

// ============================================
// Query Filters
// ============================================

export interface SubscriptionQueryFilter {
  tenantId?: string;
  planId?: string;
  status?: string;
  isActive?: boolean;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'price' | 'name';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface UsageQueryFilter {
  tenantId?: string;
  startDate?: Date;
  endDate?: Date;
  eventType?: string;
  eventCategory?: string;
  page?: number;
  pageSize?: number;
}

export interface InvoiceQueryFilter {
  tenantId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}
