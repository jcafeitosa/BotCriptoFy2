/**
 * Budgets Schema
 *
 * Gerenciamento de orçamentos e controle de gastos
 */

import {
  pgTable,
  text,
  timestamp,
  decimal,
  uuid,
  boolean,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Budget Period Types
 */
export type BudgetPeriodType = 'monthly' | 'quarterly' | 'yearly' | 'custom';

/**
 * Budget Status
 */
export type BudgetStatus = 'draft' | 'active' | 'completed' | 'archived';

/**
 * Alert Severity
 */
export type AlertSeverity = 'info' | 'warning' | 'critical';

/**
 * Budgets Table
 * Orçamentos por período fiscal
 */
export const budgets = pgTable('budgets', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),

  // Budget identification
  name: text('name').notNull(),
  description: text('description'),
  budgetNumber: text('budget_number').notNull().unique(),

  // Period
  periodType: text('period_type').notNull().$type<BudgetPeriodType>(),
  fiscalYear: text('fiscal_year').notNull(), // "2025"
  fiscalPeriod: text('fiscal_period'), // "2025-01" (for monthly), "Q1" (for quarterly)
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),

  // Financial data
  currency: text('currency').notNull().default('BRL'),
  totalBudgeted: decimal('total_budgeted', { precision: 18, scale: 2 }).notNull(),
  totalActual: decimal('total_actual', { precision: 18, scale: 2 }).default('0.00'),
  totalVariance: decimal('total_variance', { precision: 18, scale: 2 }).default('0.00'),
  variancePercent: decimal('variance_percent', { precision: 5, scale: 2 }).default('0.00'),

  // Status
  status: text('status').notNull().default('draft').$type<BudgetStatus>(),

  // Dimensions
  departmentId: uuid('department_id'), // Budget for specific department
  projectId: uuid('project_id'), // Budget for specific project
  costCenter: text('cost_center'),

  // Ownership
  ownerId: uuid('owner_id').notNull(), // User responsible for this budget
  managerId: uuid('manager_id'), // Budget approver

  // Rollover settings
  allowRollover: boolean('allow_rollover').default(false),
  rolloverPercent: decimal('rollover_percent', { precision: 5, scale: 2 }).default('0.00'),

  // Notes
  notes: text('notes'),
  attachments: jsonb('attachments').$type<
    Array<{
      id: string;
      filename: string;
      url: string;
      uploadedAt: string;
    }>
  >(),

  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: uuid('created_by').notNull(),
  updatedBy: uuid('updated_by').notNull(),
});

/**
 * Budget Lines Table
 * Linhas de orçamento por categoria
 */
export const budgetLines = pgTable('budget_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  budgetId: uuid('budget_id')
    .notNull()
    .references(() => budgets.id, { onDelete: 'cascade' }),

  // Category
  categoryId: uuid('category_id'), // Reference to expense_categories
  categoryName: text('category_name').notNull(),
  accountId: uuid('account_id'), // Reference to chart_of_accounts

  // Budget amounts
  budgetedAmount: decimal('budgeted_amount', { precision: 18, scale: 2 }).notNull(),
  actualAmount: decimal('actual_amount', { precision: 18, scale: 2 }).default('0.00'),
  committedAmount: decimal('committed_amount', { precision: 18, scale: 2 }).default('0.00'), // Approved but not spent
  availableAmount: decimal('available_amount', { precision: 18, scale: 2 }).notNull(),

  // Variance tracking
  variance: decimal('variance', { precision: 18, scale: 2 }).default('0.00'),
  variancePercent: decimal('variance_percent', { precision: 5, scale: 2 }).default('0.00'),

  // Alerts
  warningThreshold: decimal('warning_threshold', { precision: 5, scale: 2 }).default('80.00'), // 80%
  criticalThreshold: decimal('critical_threshold', { precision: 5, scale: 2 }).default('95.00'), // 95%
  currentAlertLevel: text('current_alert_level').$type<AlertSeverity | null>(),

  // Notes
  notes: text('notes'),

  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Budget Alerts Table
 * Alertas de orçamento excedido
 */
export const budgetAlerts = pgTable('budget_alerts', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  budgetId: uuid('budget_id')
    .notNull()
    .references(() => budgets.id, { onDelete: 'cascade' }),
  budgetLineId: uuid('budget_line_id').references(() => budgetLines.id, {
    onDelete: 'cascade',
  }),

  // Alert details
  severity: text('severity').notNull().$type<AlertSeverity>(),
  message: text('message').notNull(),
  thresholdPercent: decimal('threshold_percent', { precision: 5, scale: 2 }).notNull(),
  currentPercent: decimal('current_percent', { precision: 5, scale: 2 }).notNull(),

  // Notification
  notificationSent: boolean('notification_sent').default(false),
  notificationSentAt: timestamp('notification_sent_at'),
  notifiedUsers: jsonb('notified_users').$type<string[]>(), // User IDs

  // Resolution
  isResolved: boolean('is_resolved').default(false),
  resolvedAt: timestamp('resolved_at'),
  resolvedBy: uuid('resolved_by'),
  resolutionNotes: text('resolution_notes'),

  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Budget Adjustments Table
 * Ajustes e realocações de orçamento
 */
export const budgetAdjustments = pgTable('budget_adjustments', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  budgetId: uuid('budget_id')
    .notNull()
    .references(() => budgets.id, { onDelete: 'cascade' }),

  // Adjustment details
  adjustmentNumber: text('adjustment_number').notNull().unique(),
  adjustmentDate: timestamp('adjustment_date').notNull().defaultNow(),
  adjustmentType: text('adjustment_type').notNull(), // 'increase', 'decrease', 'reallocation'

  // Source and target
  sourceBudgetLineId: uuid('source_budget_line_id').references(() => budgetLines.id),
  targetBudgetLineId: uuid('target_budget_line_id').references(() => budgetLines.id),

  // Amount
  amount: decimal('amount', { precision: 18, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('BRL'),

  // Justification
  reason: text('reason').notNull(),
  description: text('description'),

  // Approval
  requiresApproval: boolean('requires_approval').default(true),
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at'),
  rejectedBy: uuid('rejected_by'),
  rejectedAt: timestamp('rejected_at'),
  rejectionReason: text('rejection_reason'),

  // Attachments
  attachments: jsonb('attachments').$type<
    Array<{
      id: string;
      filename: string;
      url: string;
      uploadedAt: string;
    }>
  >(),

  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdBy: uuid('created_by').notNull(),
});

/**
 * Budget Forecasts Table
 * Previsões de gastos futuros
 */
export const budgetForecasts = pgTable('budget_forecasts', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  budgetId: uuid('budget_id')
    .notNull()
    .references(() => budgets.id, { onDelete: 'cascade' }),
  budgetLineId: uuid('budget_line_id')
    .notNull()
    .references(() => budgetLines.id, { onDelete: 'cascade' }),

  // Forecast period
  forecastDate: timestamp('forecast_date').notNull(),
  forecastPeriod: text('forecast_period').notNull(), // "2025-03"

  // Forecast amounts
  forecastedAmount: decimal('forecasted_amount', { precision: 18, scale: 2 }).notNull(),
  actualAmount: decimal('actual_amount', { precision: 18, scale: 2 }).default('0.00'),
  variance: decimal('variance', { precision: 18, scale: 2 }).default('0.00'),

  // Model metadata
  forecastModel: text('forecast_model'), // 'linear', 'moving_average', 'manual', etc.
  confidence: decimal('confidence', { precision: 5, scale: 2 }), // 0-100%

  // Notes
  notes: text('notes'),

  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdBy: uuid('created_by').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Relations
 */
export const budgetsRelations = relations(budgets, ({ many }) => ({
  lines: many(budgetLines),
  alerts: many(budgetAlerts),
  adjustments: many(budgetAdjustments),
  forecasts: many(budgetForecasts),
}));

export const budgetLinesRelations = relations(budgetLines, ({ one, many }) => ({
  budget: one(budgets, {
    fields: [budgetLines.budgetId],
    references: [budgets.id],
  }),
  alerts: many(budgetAlerts),
  forecasts: many(budgetForecasts),
}));

export const budgetAlertsRelations = relations(budgetAlerts, ({ one }) => ({
  budget: one(budgets, {
    fields: [budgetAlerts.budgetId],
    references: [budgets.id],
  }),
  budgetLine: one(budgetLines, {
    fields: [budgetAlerts.budgetLineId],
    references: [budgetLines.id],
  }),
}));

export const budgetAdjustmentsRelations = relations(budgetAdjustments, ({ one }) => ({
  budget: one(budgets, {
    fields: [budgetAdjustments.budgetId],
    references: [budgets.id],
  }),
  sourceLine: one(budgetLines, {
    fields: [budgetAdjustments.sourceBudgetLineId],
    references: [budgetLines.id],
  }),
  targetLine: one(budgetLines, {
    fields: [budgetAdjustments.targetBudgetLineId],
    references: [budgetLines.id],
  }),
}));

export const budgetForecastsRelations = relations(budgetForecasts, ({ one }) => ({
  budget: one(budgets, {
    fields: [budgetForecasts.budgetId],
    references: [budgets.id],
  }),
  budgetLine: one(budgetLines, {
    fields: [budgetForecasts.budgetLineId],
    references: [budgetLines.id],
  }),
}));

/**
 * Type Exports
 */
export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
export type BudgetLine = typeof budgetLines.$inferSelect;
export type NewBudgetLine = typeof budgetLines.$inferInsert;
export type BudgetAlert = typeof budgetAlerts.$inferSelect;
export type NewBudgetAlert = typeof budgetAlerts.$inferInsert;
export type BudgetAdjustment = typeof budgetAdjustments.$inferSelect;
export type NewBudgetAdjustment = typeof budgetAdjustments.$inferInsert;
export type BudgetForecast = typeof budgetForecasts.$inferSelect;
export type NewBudgetForecast = typeof budgetForecasts.$inferInsert;
