/**
 * Notes Schema
 * Quick notes for contacts and deals
 */

import { pgTable, uuid, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from '../../tenants/schema/tenants.schema';
import { users } from '../../auth/schema/auth.schema';
import { contacts } from './contacts.schema';
import { deals } from './deals.schema';

/**
 * Notes Table
 * Store notes related to contacts or deals
 */
export const notes = pgTable(
  'notes',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'cascade' }),
    dealId: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),

    // Note Content
    content: text('content').notNull(),
    isPinned: boolean('is_pinned').notNull().default(false),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    tenantIdIdx: index('notes_tenant_id_idx').on(table.tenantId),
    contactIdIdx: index('notes_contact_id_idx').on(table.contactId),
    dealIdIdx: index('notes_deal_id_idx').on(table.dealId),
    createdByIdx: index('notes_created_by_idx').on(table.createdBy),
    isPinnedIdx: index('notes_is_pinned_idx').on(table.isPinned),
    tenantContactIdx: index('notes_tenant_contact_idx').on(table.tenantId, table.contactId),
    tenantDealIdx: index('notes_tenant_deal_idx').on(table.tenantId, table.dealId),
  })
);

/**
 * Relations
 */
export const notesRelations = relations(notes, ({ one }) => ({
  tenant: one(tenants, {
    fields: [notes.tenantId],
    references: [tenants.id],
  }),
  contact: one(contacts, {
    fields: [notes.contactId],
    references: [contacts.id],
  }),
  deal: one(deals, {
    fields: [notes.dealId],
    references: [deals.id],
  }),
  creator: one(users, {
    fields: [notes.createdBy],
    references: [users.id],
  }),
}));

/**
 * Type Exports
 */
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
