/**
 * Canned Responses Schema
 * Pre-written response templates
 */

import { pgTable, uuid, text, varchar, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from '../../tenants/schema/tenants.schema';
import { users } from '../../auth/schema/auth.schema';

/**
 * Canned Responses Table
 * Quick response templates for common scenarios
 */
export const cannedResponses = pgTable(
  'canned_responses',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    ownerId: text('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Response Details
    title: varchar('title', { length: 100 }).notNull(),
    content: text('content').notNull(),

    // Classification
    category: varchar('category', { length: 100 }),

    // Sharing
    isShared: boolean('is_shared').notNull().default(false), // Share with team

    // Analytics
    usageCount: integer('usage_count').notNull().default(0),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    tenantIdIdx: index('canned_responses_tenant_id_idx').on(table.tenantId),
    ownerIdIdx: index('canned_responses_owner_id_idx').on(table.ownerId),
    categoryIdx: index('canned_responses_category_idx').on(table.category),
    isSharedIdx: index('canned_responses_is_shared_idx').on(table.isShared),
  })
);

/**
 * Canned Responses Relations
 */
export const cannedResponsesRelations = relations(cannedResponses, ({ one }) => ({
  tenant: one(tenants, {
    fields: [cannedResponses.tenantId],
    references: [tenants.id],
  }),
  owner: one(users, {
    fields: [cannedResponses.ownerId],
    references: [users.id],
  }),
}));
