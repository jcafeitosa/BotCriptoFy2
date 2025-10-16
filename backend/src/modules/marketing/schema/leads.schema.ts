/**
 * Leads Schema
 * Lead management with scoring and tracking
 */

import { pgTable, uuid, varchar, text, timestamp, jsonb, integer, index, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from '../../tenants/schema/tenants.schema';
import { leadActivities } from './lead-activities.schema';
import { campaignSends } from './campaign-sends.schema';

/**
 * Lead Status
 */
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';

/**
 * Leads Table
 * Contact management with lead scoring
 */
export const leads = pgTable(
  'leads',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    // Contact Info
    email: varchar('email', { length: 255 }).notNull(),
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    phone: varchar('phone', { length: 20 }),

    // Company Info
    company: varchar('company', { length: 255 }),
    jobTitle: varchar('job_title', { length: 100 }),

    // Lead Info
    source: varchar('source', { length: 100 }).notNull(), // 'website', 'linkedin', 'referral', 'import'
    status: varchar('status', { length: 20 }).notNull().default('new').$type<LeadStatus>(),
    score: integer('score').notNull().default(0), // 0-100

    // Classification
    tags: jsonb('tags').$type<string[]>().default([]),
    customFields: jsonb('custom_fields').$type<Record<string, any>>().default({}),

    // Tracking
    lastContactedAt: timestamp('last_contacted_at', { withTimezone: true }),
    convertedAt: timestamp('converted_at', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantIdIdx: index('leads_tenant_id_idx').on(table.tenantId),
    emailIdx: index('leads_email_idx').on(table.email),
    statusIdx: index('leads_status_idx').on(table.status),
    scoreIdx: index('leads_score_idx').on(table.score),
    sourceIdx: index('leads_source_idx').on(table.source),
    tenantEmailIdx: unique('leads_tenant_email_unique').on(table.tenantId, table.email),
    tenantStatusIdx: index('leads_tenant_status_idx').on(table.tenantId, table.status),
  })
);

/**
 * Relations
 */
export const leadsRelations = relations(leads, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [leads.tenantId],
    references: [tenants.id],
  }),
  activities: many(leadActivities),
  campaignSends: many(campaignSends),
}));

/**
 * Type Exports
 */
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
