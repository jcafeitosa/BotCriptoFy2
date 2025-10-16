/**
 * Pipeline Stages Schema
 * Customizable sales pipeline stages
 */

import { pgTable, uuid, varchar, text, timestamp, integer, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from '../../tenants/schema/tenants.schema';
import { deals } from './deals.schema';

/**
 * Pipeline Stages Table
 * Defines the stages in the sales pipeline
 */
export const pipelineStages = pgTable(
  'pipeline_stages',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    // Stage Info
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    orderIndex: integer('order_index').notNull(), // Position in pipeline
    probabilityDefault: integer('probability_default').notNull().default(50), // Default win probability (0-100)

    // Visual
    color: varchar('color', { length: 7 }).notNull().default('#3B82F6'), // HEX color

    // Status
    isActive: boolean('is_active').notNull().default(true),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    tenantIdIdx: index('pipeline_stages_tenant_id_idx').on(table.tenantId),
    orderIdx: index('pipeline_stages_order_idx').on(table.orderIndex),
    tenantOrderIdx: index('pipeline_stages_tenant_order_idx').on(table.tenantId, table.orderIndex),
  })
);

/**
 * Relations
 */
export const pipelineStagesRelations = relations(pipelineStages, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [pipelineStages.tenantId],
    references: [tenants.id],
  }),
  deals: many(deals),
}));

/**
 * Type Exports
 */
export type PipelineStage = typeof pipelineStages.$inferSelect;
export type NewPipelineStage = typeof pipelineStages.$inferInsert;
