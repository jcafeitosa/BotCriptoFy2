/**
 * Departments Schema
 * Organizational structure for multi-tenant system
 */

import { pgTable, text, uuid, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
import { tenants } from '../../tenants/schema/tenants.schema';

/**
 * Departments Table
 * Organizational units within tenants
 */
export const departments = pgTable('departments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  type: text('type').notNull(), // ceo, financial, marketing, sales, security, sac, audit, documents, configurations, subscriptions
  isActive: boolean('is_active').default(true),
  settings: jsonb('settings').$type<Record<string, any>>().default({}),
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Type exports
export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;
