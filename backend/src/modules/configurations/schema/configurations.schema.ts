/**
 * Configurations Schema
 * System-wide configuration management
 */

import { pgTable, text, uuid, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
import { users } from '../../auth/schema/auth.schema';

/**
 * System Configurations
 * Dynamic configuration values for the entire system
 */
export const systemConfigurations = pgTable('system_configurations', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').unique().notNull(),
  value: text('value').notNull(),
  dataType: text('data_type').notNull(), // string, number, boolean, json, array
  category: text('category').notNull(), // general, security, performance, integration
  description: text('description'),
  isEncrypted: boolean('is_encrypted').default(false),
  isSensitive: boolean('is_sensitive').default(false),
  isReadonly: boolean('is_readonly').default(false),
  validationRules: jsonb('validation_rules').$type<Record<string, any>>().default({}),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  updatedBy: text('updated_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Type exports
export type SystemConfiguration = typeof systemConfigurations.$inferSelect;
export type NewSystemConfiguration = typeof systemConfigurations.$inferInsert;
