/**
 * Activities Schema
 * Sales activities tracking (calls, meetings, emails, etc.)
 */

import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from '../../tenants/schema/tenants.schema';
import { users } from '../../auth/schema/auth.schema';
import { contacts } from './contacts.schema';
import { deals } from './deals.schema';

/**
 * Activity Type
 */
export type ActivityType = 'call' | 'email' | 'meeting' | 'task' | 'note' | 'demo';

/**
 * Activity Status
 */
export type ActivityStatus = 'pending' | 'completed' | 'cancelled';

/**
 * Activities Table
 * Track all sales-related activities
 */
export const activities = pgTable(
  'activities',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'cascade' }),
    dealId: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),

    // Activity Info
    type: varchar('type', { length: 20 }).notNull().$type<ActivityType>(),
    subject: varchar('subject', { length: 255 }).notNull(),
    description: text('description'),

    // Scheduling
    dueDate: timestamp('due_date', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    // Status
    status: varchar('status', { length: 20 }).notNull().default('pending').$type<ActivityStatus>(),
    outcome: text('outcome'), // Result/notes after completion

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    tenantIdIdx: index('activities_tenant_id_idx').on(table.tenantId),
    contactIdIdx: index('activities_contact_id_idx').on(table.contactId),
    dealIdIdx: index('activities_deal_id_idx').on(table.dealId),
    ownerIdIdx: index('activities_owner_id_idx').on(table.ownerId),
    typeIdx: index('activities_type_idx').on(table.type),
    statusIdx: index('activities_status_idx').on(table.status),
    dueDateIdx: index('activities_due_date_idx').on(table.dueDate),
    tenantStatusIdx: index('activities_tenant_status_idx').on(table.tenantId, table.status),
    tenantDueDateIdx: index('activities_tenant_due_date_idx').on(table.tenantId, table.dueDate),
  })
);

/**
 * Relations
 */
export const activitiesRelations = relations(activities, ({ one }) => ({
  tenant: one(tenants, {
    fields: [activities.tenantId],
    references: [tenants.id],
  }),
  contact: one(contacts, {
    fields: [activities.contactId],
    references: [contacts.id],
  }),
  deal: one(deals, {
    fields: [activities.dealId],
    references: [deals.id],
  }),
  owner: one(users, {
    fields: [activities.ownerId],
    references: [users.id],
  }),
}));

/**
 * Type Exports
 */
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
