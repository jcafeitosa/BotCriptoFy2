/**
 * Subscription Usage Schema
 * Tracks usage metrics for subscription limits (API calls, bots, strategies, etc.)
 */

import { pgTable, uuid, varchar, integer, timestamp, date, boolean, jsonb, text } from 'drizzle-orm/pg-core';
import { tenants } from '../../tenants/schema/tenants.schema';
import { subscriptionPlans } from './subscription-plans.schema';

/**
 * Subscription Usage Tracking Table
 * Records daily usage metrics per tenant to enforce plan limits
 */
export const subscriptionUsage = pgTable('subscription_usage', {
  // Primary Key
  id: uuid('id').primaryKey().defaultRandom(),

  // Foreign Keys
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  planId: uuid('plan_id')
    .notNull()
    .references(() => subscriptionPlans.id, { onDelete: 'restrict' }),

  // Usage Period
  usageDate: date('usage_date').notNull(), // Daily usage tracking
  usageMonth: varchar('usage_month', { length: 7 }).notNull(), // YYYY-MM format

  // Resource Usage Counters
  // Trading Resources
  activeBots: integer('active_bots').notNull().default(0),
  activeStrategies: integer('active_strategies').notNull().default(0),
  backtestsRun: integer('backtests_run').notNull().default(0),
  activeExchanges: integer('active_exchanges').notNull().default(0),
  ordersPlaced: integer('orders_placed').notNull().default(0),
  alertsCreated: integer('alerts_created').notNull().default(0),

  // API Usage
  apiCalls: integer('api_calls').notNull().default(0),
  webhookCalls: integer('webhook_calls').notNull().default(0),
  websocketConnections: integer('websocket_connections').notNull().default(0),

  // Storage Usage
  storageUsedMB: integer('storage_used_mb').notNull().default(0),

  // Feature Usage
  aiModelCalls: integer('ai_model_calls').notNull().default(0),
  reportGenerated: integer('report_generated').notNull().default(0),
  exportActions: integer('export_actions').notNull().default(0),

  // Limit Status
  limitsExceeded: jsonb('limits_exceeded').$type<{
    resource: string;
    limit: number;
    current: number;
    exceededAt: string;
  }[]>().default([]),

  // Warnings
  warningsSent: boolean('warnings_sent').notNull().default(false),
  warningsSentAt: timestamp('warnings_sent_at', { withTimezone: true }),

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
 * Subscription Usage Events Table
 * Logs individual usage events for detailed tracking and auditing
 */
export const subscriptionUsageEvents = pgTable('subscription_usage_events', {
  // Primary Key
  id: uuid('id').primaryKey().defaultRandom(),

  // Foreign Keys
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  usageId: uuid('usage_id')
    .references(() => subscriptionUsage.id, { onDelete: 'cascade' }),

  // Event Details
  eventType: varchar('event_type', { length: 50 }).notNull(), // api_call, bot_created, strategy_run, etc.
  eventCategory: varchar('event_category', { length: 50 }).notNull(), // trading, api, storage, feature
  resourceType: varchar('resource_type', { length: 50 }).notNull(), // bot, strategy, order, webhook, etc.
  resourceId: varchar('resource_id', { length: 255 }), // ID of the resource being used

  // Usage Details
  quantity: integer('quantity').notNull().default(1), // Number of units consumed
  unitType: varchar('unit_type', { length: 50 }).notNull(), // call, MB, execution, etc.

  // Status
  status: varchar('status', { length: 20 }).notNull().default('success'), // success, failed, blocked
  blockedReason: text('blocked_reason'), // If blocked, why? (limit exceeded, plan restriction, etc.)

  // Request Context
  userId: text('user_id'), // User who triggered the event
  ipAddress: varchar('ip_address', { length: 45 }), // IPv4 or IPv6
  userAgent: text('user_agent'),
  endpoint: varchar('endpoint', { length: 255 }), // API endpoint

  // Metadata
  metadata: jsonb('metadata').$type<Record<string, any>>(),

  // Timestamp
  eventTime: timestamp('event_time', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Subscription Quotas Table
 * Current real-time quota usage (for fast lookups)
 * Updated on every usage event, reset monthly/daily
 */
export const subscriptionQuotas = pgTable('subscription_quotas', {
  // Primary Key
  id: uuid('id').primaryKey().defaultRandom(),

  // Foreign Keys
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  planId: uuid('plan_id')
    .notNull()
    .references(() => subscriptionPlans.id, { onDelete: 'restrict' }),

  // Quota Type
  quotaType: varchar('quota_type', { length: 50 }).notNull(), // api_calls, bots, strategies, etc.
  quotaPeriod: varchar('quota_period', { length: 20 }).notNull(), // daily, monthly, concurrent

  // Quota Limits (from plan)
  quotaLimit: integer('quota_limit').notNull(), // Maximum allowed
  quotaUsed: integer('quota_used').notNull().default(0), // Current usage

  // Status
  isExceeded: boolean('is_exceeded').notNull().default(false),
  exceededAt: timestamp('exceeded_at', { withTimezone: true }),

  // Reset Schedule
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
  nextResetAt: timestamp('next_reset_at', { withTimezone: true }).notNull(),

  // Soft Limits (warnings before hard limit)
  softLimitPercentage: integer('soft_limit_percentage').notNull().default(80), // Warn at 80%
  softLimitReached: boolean('soft_limit_reached').notNull().default(false),
  softLimitReachedAt: timestamp('soft_limit_reached_at', { withTimezone: true }),

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
export type SubscriptionUsage = typeof subscriptionUsage.$inferSelect;
export type NewSubscriptionUsage = typeof subscriptionUsage.$inferInsert;
export type SubscriptionUsageEvent = typeof subscriptionUsageEvents.$inferSelect;
export type NewSubscriptionUsageEvent = typeof subscriptionUsageEvents.$inferInsert;
export type SubscriptionQuota = typeof subscriptionQuotas.$inferSelect;
export type NewSubscriptionQuota = typeof subscriptionQuotas.$inferInsert;
