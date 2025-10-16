/**
 * SLA Policies Schema
 * Service Level Agreement policies for ticket resolution
 */

import { pgTable, uuid, text, varchar, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from '../../tenants/schema/tenants.schema';
import { tickets, type TicketPriority } from './tickets.schema';

/**
 * SLA Policies Table
 * Define response and resolution time targets
 */
export const slaPolices = pgTable(
  'sla_policies',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    // Policy Details
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),

    // Priority Mapping
    priority: varchar('priority', { length: 20 }).notNull().$type<TicketPriority>(),

    // Time Targets (in minutes)
    firstResponseMinutes: integer('first_response_minutes').notNull(),
    resolutionMinutes: integer('resolution_minutes').notNull(),

    // Configuration
    businessHoursOnly: boolean('business_hours_only').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    tenantIdIdx: index('sla_policies_tenant_id_idx').on(table.tenantId),
    priorityIdx: index('sla_policies_priority_idx').on(table.priority),
    isActiveIdx: index('sla_policies_is_active_idx').on(table.isActive),
  })
);

/**
 * SLA Policies Relations
 */
export const slaPoliciesRelations = relations(slaPolices, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [slaPolices.tenantId],
    references: [tenants.id],
  }),
  tickets: many(tickets),
}));
