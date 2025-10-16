/**
 * Deals Schema
 * Sales opportunities and pipeline management
 */

import { pgTable, uuid, varchar, text, timestamp, decimal, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from '../../tenants/schema/tenants.schema';
import { users } from '../../auth/schema/auth.schema';
import { contacts } from './contacts.schema';
import { pipelineStages } from './pipeline-stages.schema';
import { activities } from './activities.schema';
import { notes } from './notes.schema';

/**
 * Deal Status
 */
export type DealStatus = 'open' | 'won' | 'lost' | 'abandoned';

/**
 * Product Line Item
 */
export interface ProductLineItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

/**
 * Deals Table
 * Sales opportunities in the pipeline
 */
export const deals = pgTable(
  'deals',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'restrict' }),
    stageId: uuid('stage_id')
      .notNull()
      .references(() => pipelineStages.id, { onDelete: 'restrict' }),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),

    // Deal Info
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),

    // Financial
    value: decimal('value', { precision: 15, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),

    // Pipeline
    probability: integer('probability').notNull().default(50), // 0-100
    expectedCloseDate: timestamp('expected_close_date', { withTimezone: true }),
    actualCloseDate: timestamp('actual_close_date', { withTimezone: true }),

    // Status
    status: varchar('status', { length: 20 }).notNull().default('open').$type<DealStatus>(),
    lostReason: text('lost_reason'),

    // Products
    products: jsonb('products').$type<ProductLineItem[]>().default([]),

    // Custom Fields
    customFields: jsonb('custom_fields').$type<Record<string, any>>().default({}),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantIdIdx: index('deals_tenant_id_idx').on(table.tenantId),
    contactIdIdx: index('deals_contact_id_idx').on(table.contactId),
    stageIdIdx: index('deals_stage_id_idx').on(table.stageId),
    ownerIdIdx: index('deals_owner_id_idx').on(table.ownerId),
    statusIdx: index('deals_status_idx').on(table.status),
    expectedCloseDateIdx: index('deals_expected_close_date_idx').on(table.expectedCloseDate),
    tenantStatusIdx: index('deals_tenant_status_idx').on(table.tenantId, table.status),
    tenantStageIdx: index('deals_tenant_stage_idx').on(table.tenantId, table.stageId),
  })
);

/**
 * Relations
 */
export const dealsRelations = relations(deals, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [deals.tenantId],
    references: [tenants.id],
  }),
  contact: one(contacts, {
    fields: [deals.contactId],
    references: [contacts.id],
  }),
  stage: one(pipelineStages, {
    fields: [deals.stageId],
    references: [pipelineStages.id],
  }),
  owner: one(users, {
    fields: [deals.ownerId],
    references: [users.id],
    relationName: 'dealOwner',
  }),
  creator: one(users, {
    fields: [deals.createdBy],
    references: [users.id],
    relationName: 'dealCreator',
  }),
  activities: many(activities),
  notes: many(notes),
}));

/**
 * Type Exports
 */
export type Deal = typeof deals.$inferSelect;
export type NewDeal = typeof deals.$inferInsert;
