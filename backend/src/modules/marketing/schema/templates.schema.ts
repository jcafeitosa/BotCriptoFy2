/**
 * Email Templates Schema
 * Reusable email templates with variable support
 */

import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from '../../tenants/schema/tenants.schema';
import { users } from '../../auth/schema/auth.schema';
import { campaigns } from './campaigns.schema';

/**
 * Email Templates Table
 * Templates for email campaigns with variable substitution
 */
export const emailTemplates = pgTable(
  'email_templates',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id),

    // Template Info
    name: varchar('name', { length: 255 }).notNull(),
    subject: varchar('subject', { length: 500 }).notNull(),
    htmlContent: text('html_content').notNull(),
    textContent: text('text_content').notNull(),

    // Variables
    variables: jsonb('variables').$type<{
      allowed: string[]; // e.g., ['first_name', 'last_name', 'email', 'company']
      defaults?: Record<string, string>;
      required?: string[];
    }>().default({ allowed: [] }),

    // Classification
    category: varchar('category', { length: 100 }), // 'promotional', 'transactional', 'newsletter'
    isActive: boolean('is_active').notNull().default(true),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    tenantIdIdx: index('email_templates_tenant_id_idx').on(table.tenantId),
    categoryIdx: index('email_templates_category_idx').on(table.category),
    isActiveIdx: index('email_templates_is_active_idx').on(table.isActive),
    tenantCategoryIdx: index('email_templates_tenant_category_idx').on(table.tenantId, table.category),
  })
);

/**
 * Relations
 */
export const emailTemplatesRelations = relations(emailTemplates, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [emailTemplates.tenantId],
    references: [tenants.id],
  }),
  creator: one(users, {
    fields: [emailTemplates.createdBy],
    references: [users.id],
  }),
  campaigns: many(campaigns),
}));

/**
 * Type Exports
 */
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type NewEmailTemplate = typeof emailTemplates.$inferInsert;
