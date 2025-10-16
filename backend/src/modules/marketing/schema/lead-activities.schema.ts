/**
 * Lead Activities Schema
 * Activity timeline for leads
 */

import { pgTable, uuid, varchar, timestamp, jsonb, index, text } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { leads } from './leads.schema';
import { tenants } from '../../tenants/schema/tenants.schema';
import { campaigns } from './campaigns.schema';
import { users } from '../../auth/schema/auth.schema';

/**
 * Activity Type
 */
export type ActivityType =
  | 'email_sent'
  | 'email_opened'
  | 'email_clicked'
  | 'form_submitted'
  | 'page_visited'
  | 'note_added';

/**
 * Lead Activities Table
 * Timeline of all lead interactions
 */
export const leadActivities = pgTable(
  'lead_activities',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    leadId: uuid('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
    performedBy: text('performed_by').references(() => users.id),

    // Activity Info
    activityType: varchar('activity_type', { length: 50 }).notNull().$type<ActivityType>(),

    // Metadata
    metadata: jsonb('metadata').$type<{
      emailSubject?: string;
      clickedUrl?: string;
      formName?: string;
      pageUrl?: string;
      note?: string;
      userAgent?: string;
      ipAddress?: string;
      [key: string]: any;
    }>().default({}),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    leadIdIdx: index('lead_activities_lead_id_idx').on(table.leadId),
    tenantIdIdx: index('lead_activities_tenant_id_idx').on(table.tenantId),
    activityTypeIdx: index('lead_activities_activity_type_idx').on(table.activityType),
    campaignIdIdx: index('lead_activities_campaign_id_idx').on(table.campaignId),
    createdAtIdx: index('lead_activities_created_at_idx').on(table.createdAt),
    leadCreatedIdx: index('lead_activities_lead_created_idx').on(table.leadId, table.createdAt),
  })
);

/**
 * Relations
 */
export const leadActivitiesRelations = relations(leadActivities, ({ one }) => ({
  lead: one(leads, {
    fields: [leadActivities.leadId],
    references: [leads.id],
  }),
  tenant: one(tenants, {
    fields: [leadActivities.tenantId],
    references: [tenants.id],
  }),
  campaign: one(campaigns, {
    fields: [leadActivities.campaignId],
    references: [campaigns.id],
  }),
  performer: one(users, {
    fields: [leadActivities.performedBy],
    references: [users.id],
  }),
}));

/**
 * Type Exports
 */
export type LeadActivity = typeof leadActivities.$inferSelect;
export type NewLeadActivity = typeof leadActivities.$inferInsert;
