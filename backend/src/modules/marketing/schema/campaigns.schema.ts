/**
 * Campaigns Schema
 * Marketing campaigns with scheduling and targeting
 */

import { pgTable, uuid, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from '../../tenants/schema/tenants.schema';
import { users } from '../../auth/schema/auth.schema';
import { emailTemplates } from './templates.schema';
import { campaignSends } from './campaign-sends.schema';
import { campaignAnalytics } from './analytics.schema';

/**
 * Campaign Type
 */
export type CampaignType = 'email' | 'social' | 'ads' | 'mixed';

/**
 * Campaign Status
 */
export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'archived';

/**
 * Schedule Type
 */
export type ScheduleType = 'immediate' | 'scheduled' | 'recurring';

/**
 * Campaigns Table
 * Marketing campaigns with targeting and scheduling
 */
export const campaigns = pgTable(
  'campaigns',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    templateId: uuid('template_id').references(() => emailTemplates.id, { onDelete: 'set null' }),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id),

    // Campaign Info
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    type: varchar('type', { length: 20 }).notNull().$type<CampaignType>(),
    status: varchar('status', { length: 20 }).notNull().default('draft').$type<CampaignStatus>(),

    // Targeting
    targetAudience: jsonb('target_audience').$type<{
      leadStatus?: string[];
      minScore?: number;
      maxScore?: number;
      tags?: string[];
      source?: string[];
      dateRange?: { from: string; to: string };
      customFilters?: Record<string, any>;
    }>(),

    // Scheduling
    scheduleType: varchar('schedule_type', { length: 20 }).notNull().default('immediate').$type<ScheduleType>(),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    recurringPattern: jsonb('recurring_pattern').$type<{
      frequency: 'daily' | 'weekly' | 'monthly';
      interval: number;
      daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
      dayOfMonth?: number; // 1-31
      endDate?: string;
    }>(),

    // Execution
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantIdIdx: index('campaigns_tenant_id_idx').on(table.tenantId),
    statusIdx: index('campaigns_status_idx').on(table.status),
    scheduledAtIdx: index('campaigns_scheduled_at_idx').on(table.scheduledAt),
    createdAtIdx: index('campaigns_created_at_idx').on(table.createdAt),
    tenantStatusIdx: index('campaigns_tenant_status_idx').on(table.tenantId, table.status),
  })
);

/**
 * Relations
 */
export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [campaigns.tenantId],
    references: [tenants.id],
  }),
  template: one(emailTemplates, {
    fields: [campaigns.templateId],
    references: [emailTemplates.id],
  }),
  creator: one(users, {
    fields: [campaigns.createdBy],
    references: [users.id],
  }),
  sends: many(campaignSends),
  analytics: many(campaignAnalytics),
}));

/**
 * Type Exports
 */
export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
