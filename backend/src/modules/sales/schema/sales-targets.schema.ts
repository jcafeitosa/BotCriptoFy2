/**
 * Sales Targets Schema
 * Sales goals and performance tracking
 */

import { pgTable, uuid, text, varchar, decimal, timestamp, date, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from '../../tenants/schema/tenants.schema';
import { users } from '../../auth/schema/auth.schema';

/**
 * Target Period
 */
export type TargetPeriod = 'monthly' | 'quarterly' | 'yearly';

/**
 * Sales Targets Table
 * Track sales goals for individuals or teams
 */
export const salesTargets = pgTable(
  'sales_targets',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }), // NULL = team target

    // Period
    period: varchar('period', { length: 20 }).notNull().$type<TargetPeriod>(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),

    // Targets
    targetAmount: decimal('target_amount', { precision: 15, scale: 2 }).notNull(),
    achievedAmount: decimal('achieved_amount', { precision: 15, scale: 2 }).notNull().default('0'),
    achievementPercentage: decimal('achievement_percentage', { precision: 5, scale: 2 })
      .notNull()
      .default('0'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    tenantIdIdx: index('sales_targets_tenant_id_idx').on(table.tenantId),
    userIdIdx: index('sales_targets_user_id_idx').on(table.userId),
    periodIdx: index('sales_targets_period_idx').on(table.period),
    startDateIdx: index('sales_targets_start_date_idx').on(table.startDate),
    endDateIdx: index('sales_targets_end_date_idx').on(table.endDate),
    tenantPeriodIdx: index('sales_targets_tenant_period_idx').on(table.tenantId, table.period),
    tenantUserIdx: index('sales_targets_tenant_user_idx').on(table.tenantId, table.userId),
  })
);

/**
 * Relations
 */
export const salesTargetsRelations = relations(salesTargets, ({ one }) => ({
  tenant: one(tenants, {
    fields: [salesTargets.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [salesTargets.userId],
    references: [users.id],
  }),
}));

/**
 * Type Exports
 */
export type SalesTarget = typeof salesTargets.$inferSelect;
export type NewSalesTarget = typeof salesTargets.$inferInsert;
