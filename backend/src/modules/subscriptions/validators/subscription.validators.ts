/**
 * Subscription API Validators
 * Zod schemas for request validation
 */

import { z } from 'zod';

// ============================================
// SUBSCRIPTION MANAGEMENT
// ============================================

/**
 * Subscribe to plan
 */
export const subscribeToPlanSchema = z.object({
  planId: z.string().uuid('Invalid plan ID'),
  trialPeriodDays: z.number().int().min(0).max(90).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Change plan (upgrade/downgrade)
 */
export const changePlanSchema = z.object({
  newPlanId: z.string().uuid('Invalid plan ID'),
  reason: z.string().max(500).optional(),
  effectiveDate: z.enum(['immediate', 'end_of_period']).default('immediate'),
});

/**
 * Cancel subscription
 */
export const cancelSubscriptionSchema = z.object({
  reason: z.string().max(500).optional(),
  cancelAtPeriodEnd: z.boolean().default(true),
  feedback: z.string().max(1000).optional(),
});

// ============================================
// USAGE TRACKING
// ============================================

/**
 * Record usage event
 */
export const recordUsageEventSchema = z.object({
  eventType: z.string().min(1).max(50),
  eventCategory: z.enum(['trading', 'api', 'storage', 'feature']),
  resourceType: z.string().min(1).max(50),
  resourceId: z.string().max(255).optional(),
  quantity: z.number().int().min(1).default(1),
  unitType: z.string().min(1).max(50),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Check quota
 */
export const checkQuotaSchema = z.object({
  quotaType: z.string().min(1).max(50),
  requiredAmount: z.number().int().min(1).default(1),
});

/**
 * Get usage summary query params
 */
export const usageSummaryQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month format (YYYY-MM)').optional(),
});

/**
 * Get usage events query params
 */
export const usageEventsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  eventType: z.string().optional(),
  eventCategory: z.enum(['trading', 'api', 'storage', 'feature']).optional(),
  limit: z.number().int().min(1).max(500).default(100),
});

// ============================================
// PLANS & FEATURES (ADMIN)
// ============================================

/**
 * Create plan
 */
export const createPlanSchema = z.object({
  name: z.string().min(1).max(100),
  displayName: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  price: z.string().regex(/^\d+(\.\d{2})?$/, 'Price must be a decimal string (e.g., "29.00")'),
  currency: z.string().length(3).default('BRL'),
  billingPeriod: z.enum(['monthly', 'yearly']).default('monthly'),
  stripeProductId: z.string().optional(),
  stripePriceId: z.string().optional(),
  limits: z.object({
    maxBots: z.number().int().min(0),
    maxStrategies: z.number().int().min(0),
    maxBacktests: z.number().int().min(0),
    maxExchanges: z.number().int().min(0),
    maxApiCalls: z.number().int().min(0),
    maxWebhooks: z.number().int().min(0),
    maxAlerts: z.number().int().min(0),
    maxOrders: z.number().int().min(0),
    storageGB: z.number().int().min(0),
    historicalDataMonths: z.number().int().min(0),
    aiModelAccess: z.boolean(),
    prioritySupport: z.boolean(),
    customDomain: z.boolean(),
    whiteLabel: z.boolean(),
    apiAccess: z.boolean(),
    webhookAccess: z.boolean(),
  }),
  features: z.array(z.string()),
  isActive: z.boolean().default(true),
  isPublic: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
  trialDays: z.number().int().min(0).max(90).default(0),
  trialPrice: z.string().regex(/^\d+(\.\d{2})?$/).default('0.00'),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * Update plan
 */
export const updatePlanSchema = createPlanSchema.partial().omit({ slug: true });

/**
 * Create feature
 */
export const createFeatureSchema = z.object({
  name: z.string().min(1).max(100),
  displayName: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9_]+$/, 'Slug must be lowercase alphanumeric with underscores'),
  category: z.string().min(1).max(50),
  isCore: z.boolean().default(false),
  isPremium: z.boolean().default(false),
  isEnterprise: z.boolean().default(false),
  icon: z.string().max(50).optional(),
  sortOrder: z.number().int().min(0).default(0),
});

/**
 * Update feature
 */
export const updateFeatureSchema = createFeatureSchema.partial().omit({ slug: true });

// ============================================
// QUERY FILTERS
// ============================================

/**
 * Plans query filter
 */
export const plansQuerySchema = z.object({
  search: z.string().max(255).optional(),
  isActive: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'price', 'name']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

/**
 * Features query filter
 */
export const featuresQuerySchema = z.object({
  category: z.string().max(50).optional(),
});

// ============================================
// EXPORTS
// ============================================

export type SubscribeToPlanInput = z.infer<typeof subscribeToPlanSchema>;
export type ChangePlanInput = z.infer<typeof changePlanSchema>;
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;
export type RecordUsageEventInput = z.infer<typeof recordUsageEventSchema>;
export type CheckQuotaInput = z.infer<typeof checkQuotaSchema>;
export type UsageSummaryQuery = z.infer<typeof usageSummaryQuerySchema>;
export type UsageEventsQuery = z.infer<typeof usageEventsQuerySchema>;
export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type CreateFeatureInput = z.infer<typeof createFeatureSchema>;
export type UpdateFeatureInput = z.infer<typeof updateFeatureSchema>;
export type PlansQuery = z.infer<typeof plansQuerySchema>;
export type FeaturesQuery = z.infer<typeof featuresQuerySchema>;
