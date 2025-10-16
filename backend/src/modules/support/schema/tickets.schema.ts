/**
 * Tickets Schema
 * Support ticket management with SLA tracking
 */

import { pgTable, uuid, text, varchar, timestamp, integer, jsonb, index, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from '../../tenants/schema/tenants.schema';
import { users } from '../../auth/schema/auth.schema';
import { contacts } from '../../sales/schema/contacts.schema';
import { ticketMessages } from './ticket-messages.schema';
import { slaPolices } from './sla-policies.schema';

/**
 * Ticket Priority Levels
 */
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * Ticket Status Flow
 */
export type TicketStatus = 'new' | 'open' | 'pending' | 'on_hold' | 'resolved' | 'closed';

/**
 * Ticket Source Channels
 */
export type TicketSource = 'email' | 'phone' | 'chat' | 'web' | 'api';

/**
 * Tickets Table
 * Core support ticket management
 */
export const tickets = pgTable(
  'tickets',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
    assignedTo: text('assigned_to').references(() => users.id, { onDelete: 'set null' }),
    createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }), // null = customer created
    slaId: uuid('sla_id').references(() => slaPolices.id, { onDelete: 'set null' }),

    // Ticket Number (auto-generated, unique per tenant)
    ticketNumber: varchar('ticket_number', { length: 20 }).notNull(),

    // Ticket Details
    subject: varchar('subject', { length: 255 }).notNull(),
    description: text('description').notNull(),

    // Classification
    priority: varchar('priority', { length: 20 }).notNull().$type<TicketPriority>(),
    status: varchar('status', { length: 20 }).notNull().$type<TicketStatus>().default('new'),
    category: varchar('category', { length: 100 }).notNull(),
    source: varchar('source', { length: 20 }).notNull().$type<TicketSource>(),

    // SLA Tracking
    dueDate: timestamp('due_date', { withTimezone: true }),
    resolutionTime: integer('resolution_time'), // minutes
    firstResponseTime: integer('first_response_time'), // minutes

    // Customer Satisfaction
    satisfactionRating: integer('satisfaction_rating'), // 1-5
    satisfactionComment: text('satisfaction_comment'),

    // Metadata
    tags: jsonb('tags').$type<string[]>().default([]),
    customFields: jsonb('custom_fields').$type<Record<string, any>>().default({}),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantIdIdx: index('tickets_tenant_id_idx').on(table.tenantId),
    statusIdx: index('tickets_status_idx').on(table.status),
    priorityIdx: index('tickets_priority_idx').on(table.priority),
    assignedToIdx: index('tickets_assigned_to_idx').on(table.assignedTo),
    contactIdIdx: index('tickets_contact_id_idx').on(table.contactId),
    categoryIdx: index('tickets_category_idx').on(table.category),
    dueDateIdx: index('tickets_due_date_idx').on(table.dueDate),
    createdAtIdx: index('tickets_created_at_idx').on(table.createdAt),
    tenantNumberUnique: unique('tickets_tenant_number_unique').on(table.tenantId, table.ticketNumber),
  })
);

/**
 * Tickets Relations
 */
export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [tickets.tenantId],
    references: [tenants.id],
  }),
  contact: one(contacts, {
    fields: [tickets.contactId],
    references: [contacts.id],
  }),
  assignedUser: one(users, {
    fields: [tickets.assignedTo],
    references: [users.id],
    relationName: 'assignedTickets',
  }),
  creator: one(users, {
    fields: [tickets.createdBy],
    references: [users.id],
    relationName: 'createdTickets',
  }),
  slaPolicy: one(slaPolices, {
    fields: [tickets.slaId],
    references: [slaPolices.id],
  }),
  messages: many(ticketMessages),
}));
