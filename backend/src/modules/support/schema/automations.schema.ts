/**
 * Ticket Automations Schema
 * Automated workflows and triggers
 */

import { pgTable, uuid, text, varchar, integer, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from '../../tenants/schema/tenants.schema';

/**
 * Automation Trigger Events
 */
export type AutomationTrigger = 'on_create' | 'on_update' | 'on_status_change' | 'on_sla_breach';

/**
 * Automation Conditions Structure
 */
export interface AutomationConditions {
  priority?: string | string[];
  status?: string | string[];
  category?: string | string[];
  assignedTo?: string;
  tags?: string[];
  [key: string]: any;
}

/**
 * Automation Actions Structure
 */
export interface AutomationActions {
  assignTo?: string;
  changeStatus?: string;
  changePriority?: string;
  addTag?: string | string[];
  removeTag?: string | string[];
  sendNotification?: boolean;
  notificationTemplate?: string;
  addNote?: string;
  [key: string]: any;
}

/**
 * Ticket Automations Table
 * Define automated workflows
 */
export const ticketAutomations = pgTable(
  'ticket_automations',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    // Automation Details
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),

    // Trigger Configuration
    trigger: varchar('trigger', { length: 30 }).notNull().$type<AutomationTrigger>(),
    conditions: jsonb('conditions').$type<AutomationConditions>().notNull(),
    actions: jsonb('actions').$type<AutomationActions>().notNull(),

    // Status
    isActive: boolean('is_active').notNull().default(true),

    // Analytics
    executionCount: integer('execution_count').notNull().default(0),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    tenantIdIdx: index('ticket_automations_tenant_id_idx').on(table.tenantId),
    triggerIdx: index('ticket_automations_trigger_idx').on(table.trigger),
    isActiveIdx: index('ticket_automations_is_active_idx').on(table.isActive),
  })
);

/**
 * Ticket Automations Relations
 */
export const ticketAutomationsRelations = relations(ticketAutomations, ({ one }) => ({
  tenant: one(tenants, {
    fields: [ticketAutomations.tenantId],
    references: [tenants.id],
  }),
}));
