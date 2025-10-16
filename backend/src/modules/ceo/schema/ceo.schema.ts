/**
 * CEO Dashboard Schema
 * Database tables for CEO dashboard configurations, KPIs, and alerts
 */

import { pgTable, uuid, varchar, text, jsonb, timestamp, boolean, decimal, integer } from 'drizzle-orm/pg-core';
import { tenants } from '../../tenants/schema/tenants.schema';
import { users } from '../../auth/schema/auth.schema';

/**
 * CEO Dashboard Configurations
 * Personalization settings per CEO user
 */
export const ceoDashboardConfigs = pgTable('ceo_dashboard_configs', {
  // Primary Key
  id: uuid('id').primaryKey().defaultRandom(),

  // Foreign Keys
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),

  // Dashboard Configuration
  displayName: varchar('display_name', { length: 100 }),
  theme: varchar('theme', { length: 20 }).notNull().default('light'), // light, dark, auto
  layout: jsonb('layout').$type<{
    widgets: Array<{
      id: string;
      type: string;
      position: { x: number; y: number; w: number; h: number };
      visible: boolean;
    }>;
  }>(),

  // Preferences
  defaultDateRange: varchar('default_date_range', { length: 20 }).notNull().default('30d'), // 7d, 30d, 90d, 1y
  refreshInterval: integer('refresh_interval').notNull().default(300), // seconds
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'),

  // Notification Settings
  emailAlerts: boolean('email_alerts').notNull().default(true),
  pushAlerts: boolean('push_alerts').notNull().default(true),
  alertThresholds: jsonb('alert_thresholds').$type<{
    revenueDropPercent: number;
    churnRatePercent: number;
    activeUsersDropPercent: number;
    errorRatePercent: number;
  }>().default({
    revenueDropPercent: 10,
    churnRatePercent: 5,
    activeUsersDropPercent: 15,
    errorRatePercent: 5,
  }),

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
 * CEO KPIs (Custom Key Performance Indicators)
 * Custom KPI definitions for tracking specific metrics
 */
export const ceoKpis = pgTable('ceo_kpis', {
  // Primary Key
  id: uuid('id').primaryKey().defaultRandom(),

  // Foreign Keys
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),

  // KPI Definition
  name: varchar('name', { length: 100 }).notNull(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }).notNull(), // revenue, users, growth, retention, health

  // Calculation
  metric: varchar('metric', { length: 50 }).notNull(), // mrr, arr, cac, ltv, churn, arpu, etc.
  formula: text('formula'), // Optional custom formula
  unit: varchar('unit', { length: 20 }).notNull().default('number'), // number, currency, percentage

  // Target/Goal
  target: decimal('target', { precision: 15, scale: 2 }),
  targetPeriod: varchar('target_period', { length: 20 }).default('monthly'), // daily, weekly, monthly, yearly

  // Display
  color: varchar('color', { length: 20 }),
  icon: varchar('icon', { length: 50 }),
  sortOrder: integer('sort_order').notNull().default(0),

  // Status
  isActive: boolean('is_active').notNull().default(true),
  isPublic: boolean('is_public').notNull().default(false), // Visible to all admins

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
 * CEO Alerts
 * Critical alerts and notifications for CEO attention
 */
export const ceoAlerts = pgTable('ceo_alerts', {
  // Primary Key
  id: uuid('id').primaryKey().defaultRandom(),

  // Foreign Keys
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),

  // Alert Information
  type: varchar('type', { length: 50 }).notNull(), // revenue_drop, churn_spike, system_error, payment_failure
  severity: varchar('severity', { length: 20 }).notNull().default('info'), // critical, warning, info
  title: varchar('title', { length: 200 }).notNull(),
  message: text('message').notNull(),

  // Alert Data
  metric: varchar('metric', { length: 50 }), // Related metric
  currentValue: decimal('current_value', { precision: 15, scale: 2 }),
  previousValue: decimal('previous_value', { precision: 15, scale: 2 }),
  changePercent: decimal('change_percent', { precision: 10, scale: 2 }),
  threshold: decimal('threshold', { precision: 15, scale: 2 }),

  // Context
  category: varchar('category', { length: 50 }).notNull(), // revenue, users, system, security
  source: varchar('source', { length: 100 }), // Which module/service generated the alert
  resourceId: uuid('resource_id'), // Related resource ID (optional)
  resourceType: varchar('resource_type', { length: 50 }), // subscription, user, transaction, etc.

  // Alert Status
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, acknowledged, resolved, dismissed
  acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
  acknowledgedBy: text('acknowledged_by').references(() => users.id),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolvedBy: text('resolved_by').references(() => users.id),

  // Action
  actionUrl: varchar('action_url', { length: 500 }), // Deep link to relevant page
  actionLabel: varchar('action_label', { length: 100 }), // Button text

  // Notification
  notificationSent: boolean('notification_sent').notNull().default(false),
  notificationSentAt: timestamp('notification_sent_at', { withTimezone: true }),

  // Metadata
  metadata: jsonb('metadata').$type<Record<string, any>>(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Export types
export type CeoDashboardConfig = typeof ceoDashboardConfigs.$inferSelect;
export type NewCeoDashboardConfig = typeof ceoDashboardConfigs.$inferInsert;
export type CeoKpi = typeof ceoKpis.$inferSelect;
export type NewCeoKpi = typeof ceoKpis.$inferInsert;
export type CeoAlert = typeof ceoAlerts.$inferSelect;
export type NewCeoAlert = typeof ceoAlerts.$inferInsert;
