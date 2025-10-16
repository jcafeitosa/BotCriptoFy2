/**
 * Subscription Plans Schema
 * Defines available subscription plans (Free, Pro, Enterprise)
 * Integrates with Better-Auth + Stripe
 */

import { pgTable, uuid, varchar, text, decimal, boolean, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from '../../tenants/schema/tenants.schema';

/**
 * Subscription Plans Table
 * Defines the available plans with pricing and limits
 */
export const subscriptionPlans = pgTable('subscription_plans', {
  // Primary Key
  id: uuid('id').primaryKey().defaultRandom(),

  // Plan Identification
  name: varchar('name', { length: 100 }).notNull().unique(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  description: text('description'),
  slug: varchar('slug', { length: 50 }).notNull().unique(), // free, pro, enterprise

  // Pricing (multiple billing periods)
  priceMonthly: decimal('price_monthly', { precision: 10, scale: 2 }).notNull().default('0.00'),
  priceQuarterly: decimal('price_quarterly', { precision: 10, scale: 2 }).notNull().default('0.00'),
  priceYearly: decimal('price_yearly', { precision: 10, scale: 2 }).notNull().default('0.00'),
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'), // BRL, USD

  // Stripe Integration (one price ID per billing period)
  stripeProductId: varchar('stripe_product_id', { length: 255 }), // prod_xxx
  stripePriceIdMonthly: varchar('stripe_price_id_monthly', { length: 255 }), // price_xxx (monthly)
  stripePriceIdQuarterly: varchar('stripe_price_id_quarterly', { length: 255 }), // price_xxx (quarterly/3-month)
  stripePriceIdYearly: varchar('stripe_price_id_yearly', { length: 255 }), // price_xxx (yearly/12-month)

  // Plan Limits
  limits: jsonb('limits').notNull().$type<{
    maxBots: number; // Maximum trading bots
    maxStrategies: number; // Maximum strategies
    maxBacktests: number; // Maximum backtests per month
    maxExchanges: number; // Maximum exchange connections
    maxApiCalls: number; // API calls per month
    maxWebhooks: number; // Webhook endpoints
    maxAlerts: number; // Price alerts
    maxOrders: number; // Orders per day
    storageGB: number; // Storage in GB
    historicalDataMonths: number; // Historical data access
    aiModelAccess: boolean; // AI/ML models access
    prioritySupport: boolean; // Priority support
    customDomain: boolean; // Custom domain
    whiteLabel: boolean; // White label
    apiAccess: boolean; // API access
    webhookAccess: boolean; // Webhook access
  }>(),

  // Features (JSON array of feature IDs)
  features: jsonb('features').notNull().$type<string[]>().default([]),

  // Plan Status
  isActive: boolean('is_active').notNull().default(true),
  isPublic: boolean('is_public').notNull().default(true), // Visible in pricing page
  isFeatured: boolean('is_featured').notNull().default(false), // Highlighted plan
  sortOrder: integer('sort_order').notNull().default(0), // Display order

  // Trial Configuration
  trialDays: integer('trial_days').notNull().default(0), // 0 = no trial, 7, 14, 30
  trialPrice: decimal('trial_price', { precision: 10, scale: 2 }).notNull().default('0.00'),

  // Metadata
  metadata: jsonb('metadata').$type<Record<string, any>>(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/**
 * Subscription Features Table
 * Defines individual features that can be assigned to plans
 */
export const subscriptionFeatures = pgTable('subscription_features', {
  // Primary Key
  id: uuid('id').primaryKey().defaultRandom(),

  // Feature Identification
  name: varchar('name', { length: 100 }).notNull().unique(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  description: text('description'),
  slug: varchar('slug', { length: 50 }).notNull().unique(),

  // Feature Category
  category: varchar('category', { length: 50 }).notNull(), // trading, analytics, support, integrations, etc.

  // Feature Configuration
  isCore: boolean('is_core').notNull().default(false), // Core feature (always available)
  isPremium: boolean('is_premium').notNull().default(false), // Premium feature (Pro+)
  isEnterprise: boolean('is_enterprise').notNull().default(false), // Enterprise only

  // Display
  icon: varchar('icon', { length: 50 }), // Icon name (for UI)
  sortOrder: integer('sort_order').notNull().default(0),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/**
 * Tenant Subscription Plans Table
 * Links tenants to their subscription plans (Better-Auth manages this via Stripe)
 * This table is for caching and quick access, Better-Auth is the source of truth
 */
export const tenantSubscriptionPlans = pgTable('tenant_subscription_plans', {
  // Primary Key
  id: uuid('id').primaryKey().defaultRandom(),

  // Foreign Keys
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  planId: uuid('plan_id')
    .notNull()
    .references(() => subscriptionPlans.id, { onDelete: 'restrict' }),

  // Subscription Status (synced from Better-Auth/Stripe)
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, past_due, canceled, trialing
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }), // sub_xxx (from Better-Auth)
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }), // cus_xxx (from Better-Auth)

  // Billing Period
  billingPeriod: varchar('billing_period', { length: 20 }).notNull().default('monthly'), // monthly, quarterly, yearly

  // Subscription Period
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),

  // Trial
  trialStart: timestamp('trial_start', { withTimezone: true }),
  trialEnd: timestamp('trial_end', { withTimezone: true }),

  // Cancellation
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  canceledAt: timestamp('canceled_at', { withTimezone: true }),

  // Metadata
  metadata: jsonb('metadata').$type<Record<string, any>>(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Export types for use in services
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type NewSubscriptionPlan = typeof subscriptionPlans.$inferInsert;
export type SubscriptionFeature = typeof subscriptionFeatures.$inferSelect;
export type NewSubscriptionFeature = typeof subscriptionFeatures.$inferInsert;
export type TenantSubscriptionPlan = typeof tenantSubscriptionPlans.$inferSelect;
export type NewTenantSubscriptionPlan = typeof tenantSubscriptionPlans.$inferInsert;
