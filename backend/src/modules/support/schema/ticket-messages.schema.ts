/**
 * Ticket Messages Schema
 * Messages and internal notes for tickets
 */

import { pgTable, uuid, text, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tickets } from './tickets.schema';
import { users } from '../../auth/schema/auth.schema';

/**
 * File Attachment Structure
 */
export interface FileAttachment {
  filename: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
}

/**
 * Ticket Messages Table
 * All communications and notes on a ticket
 */
export const ticketMessages = pgTable(
  'ticket_messages',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    ticketId: uuid('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }), // null = customer

    // Message Content
    message: text('message').notNull(),

    // Message Type
    isInternal: boolean('is_internal').notNull().default(false), // Internal note
    isFromCustomer: boolean('is_from_customer').notNull().default(false),

    // Attachments
    attachments: jsonb('attachments').$type<FileAttachment[]>().default([]),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ticketIdIdx: index('ticket_messages_ticket_id_idx').on(table.ticketId),
    createdByIdx: index('ticket_messages_created_by_idx').on(table.createdBy),
    createdAtIdx: index('ticket_messages_created_at_idx').on(table.createdAt),
    isInternalIdx: index('ticket_messages_is_internal_idx').on(table.isInternal),
  })
);

/**
 * Ticket Messages Relations
 */
export const ticketMessagesRelations = relations(ticketMessages, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketMessages.ticketId],
    references: [tickets.id],
  }),
  author: one(users, {
    fields: [ticketMessages.createdBy],
    references: [users.id],
  }),
}));
