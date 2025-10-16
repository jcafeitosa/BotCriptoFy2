/**
 * Ledger Schema
 *
 * Livro razão contábil - Double-entry bookkeeping
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
 * Account Types (Tipos de Conta)
 */
export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

/**
 * Entry Types
 */
export type EntryType = 'debit' | 'credit';

/**
 * Entry Status
 */
export type EntryStatus = 'draft' | 'posted' | 'voided';

/**
 * Chart of Accounts (Plano de Contas)
 * Define a estrutura contábil da empresa
 */
export const chartOfAccounts = pgTable('chart_of_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),

  // Account identification
  code: text('code').notNull(), // e.g., "1.1.01" (Asset > Current Asset > Cash)
  name: text('name').notNull(),
  description: text('description'),

  // Account classification
  accountType: text('account_type').notNull().$type<AccountType>(),
  parentId: uuid('parent_id'), // For hierarchical structure

  // Behavior
  isDebitNormal: boolean('is_debit_normal').notNull(), // true = debit increases balance
  allowsManualEntry: boolean('allows_manual_entry').default(true),
  requiresReconciliation: boolean('requires_reconciliation').default(false),

  // Tax settings
  taxReportingCategory: text('tax_reporting_category'), // For tax reports
  isTaxDeductible: boolean('is_tax_deductible').default(false),

  // Balance tracking
  currentBalance: decimal('current_balance', { precision: 18, scale: 2 }).default('0.00'),
  currency: text('currency').notNull().default('BRL'),

  // Status
  isActive: boolean('is_active').default(true),
  displayOrder: decimal('display_order', { precision: 10, scale: 2 }).default('0'),

  // Metadata
  tags: jsonb('tags').$type<string[]>(),
  customFields: jsonb('custom_fields').$type<Record<string, any>>(),

  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Ledger Entries Table
 * Lançamentos contábeis (double-entry)
 */
export const ledgerEntries = pgTable('ledger_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),

  // Entry identification
  entryNumber: text('entry_number').notNull().unique(),
  entryDate: timestamp('entry_date').notNull().defaultNow(),
  postingDate: timestamp('posting_date'), // When entry was posted to ledger

  // Status
  status: text('status').notNull().default('draft').$type<EntryStatus>(),

  // Description
  description: text('description').notNull(),
  reference: text('reference'), // External reference (invoice number, expense number, etc.)

  // Origin tracking
  sourceType: text('source_type'), // 'invoice', 'expense', 'payment', 'adjustment', 'manual'
  sourceId: uuid('source_id'), // ID of the source record

  // Accounting period
  fiscalYear: text('fiscal_year').notNull(), // "2025"
  fiscalPeriod: text('fiscal_period').notNull(), // "2025-01" (YYYY-MM)
  fiscalQuarter: text('fiscal_quarter').notNull(), // "Q1", "Q2", "Q3", "Q4"

  // Reversal
  isReversal: boolean('is_reversal').default(false),
  reversedEntryId: uuid('reversed_entry_id'), // Original entry that this reverses

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
  postedBy: uuid('posted_by'),
});

/**
 * Ledger Entry Lines Table
 * Linhas de lançamento (debits e credits)
 */
export const ledgerEntryLines = pgTable('ledger_entry_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  entryId: uuid('entry_id')
    .notNull()
    .references(() => ledgerEntries.id, { onDelete: 'cascade' }),

  // Account
  accountId: uuid('account_id')
    .notNull()
    .references(() => chartOfAccounts.id),

  // Entry details
  entryType: text('entry_type').notNull().$type<EntryType>(), // 'debit' or 'credit'
  amount: decimal('amount', { precision: 18, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('BRL'),

  // Dimensions (for multi-dimensional analysis)
  departmentId: uuid('department_id'),
  projectId: uuid('project_id'),
  costCenter: text('cost_center'),
  customDimensions: jsonb('custom_dimensions').$type<Record<string, string>>(),

  // Description
  description: text('description'),
  memo: text('memo'),

  // Reconciliation
  isReconciled: boolean('is_reconciled').default(false),
  reconciledAt: timestamp('reconciled_at'),
  reconciledBy: uuid('reconciled_by'),

  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Account Balances Table
 * Saldos agregados por conta e período (para performance)
 */
export const accountBalances = pgTable('account_balances', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => chartOfAccounts.id),

  // Period
  fiscalYear: text('fiscal_year').notNull(),
  fiscalPeriod: text('fiscal_period').notNull(), // "2025-01"

  // Balances
  openingBalance: decimal('opening_balance', { precision: 18, scale: 2 }).notNull(),
  debitTotal: decimal('debit_total', { precision: 18, scale: 2 }).default('0.00'),
  creditTotal: decimal('credit_total', { precision: 18, scale: 2 }).default('0.00'),
  closingBalance: decimal('closing_balance', { precision: 18, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('BRL'),

  // Audit
  lastRecalculatedAt: timestamp('last_recalculated_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Fiscal Periods Table
 * Define os períodos fiscais (meses, trimestres, anos)
 */
export const fiscalPeriods = pgTable('fiscal_periods', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),

  // Period identification
  fiscalYear: text('fiscal_year').notNull(), // "2025"
  fiscalPeriod: text('fiscal_period').notNull(), // "2025-01"
  periodName: text('period_name').notNull(), // "Janeiro 2025"

  // Dates
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),

  // Quarter
  fiscalQuarter: text('fiscal_quarter').notNull(), // "Q1"

  // Status
  isClosed: boolean('is_closed').default(false),
  closedAt: timestamp('closed_at'),
  closedBy: uuid('closed_by'),

  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Relations
 */
export const chartOfAccountsRelations = relations(chartOfAccounts, ({ one, many }) => ({
  parent: one(chartOfAccounts, {
    fields: [chartOfAccounts.parentId],
    references: [chartOfAccounts.id],
  }),
  children: many(chartOfAccounts),
  entryLines: many(ledgerEntryLines),
  balances: many(accountBalances),
}));

export const ledgerEntriesRelations = relations(ledgerEntries, ({ many }) => ({
  lines: many(ledgerEntryLines),
}));

export const ledgerEntryLinesRelations = relations(ledgerEntryLines, ({ one }) => ({
  entry: one(ledgerEntries, {
    fields: [ledgerEntryLines.entryId],
    references: [ledgerEntries.id],
  }),
  account: one(chartOfAccounts, {
    fields: [ledgerEntryLines.accountId],
    references: [chartOfAccounts.id],
  }),
}));

export const accountBalancesRelations = relations(accountBalances, ({ one }) => ({
  account: one(chartOfAccounts, {
    fields: [accountBalances.accountId],
    references: [chartOfAccounts.id],
  }),
}));

/**
 * Type Exports
 */
export type ChartOfAccount = typeof chartOfAccounts.$inferSelect;
export type NewChartOfAccount = typeof chartOfAccounts.$inferInsert;
export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type NewLedgerEntry = typeof ledgerEntries.$inferInsert;
export type LedgerEntryLine = typeof ledgerEntryLines.$inferSelect;
export type NewLedgerEntryLine = typeof ledgerEntryLines.$inferInsert;
export type AccountBalance = typeof accountBalances.$inferSelect;
export type NewAccountBalance = typeof accountBalances.$inferInsert;
export type FiscalPeriod = typeof fiscalPeriods.$inferSelect;
export type NewFiscalPeriod = typeof fiscalPeriods.$inferInsert;
