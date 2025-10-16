/**
 * Expenses Schema
 *
 * Gerenciamento de despesas operacionais da empresa
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
 * Expense Status
 */
export type ExpenseStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'paid'
  | 'cancelled';

/**
 * Expense Categories
 */
export type ExpenseCategory =
  | 'software'
  | 'hardware'
  | 'office'
  | 'travel'
  | 'marketing'
  | 'salaries'
  | 'benefits'
  | 'taxes'
  | 'utilities'
  | 'rent'
  | 'insurance'
  | 'legal'
  | 'consulting'
  | 'training'
  | 'entertainment'
  | 'other';

/**
 * Expense Payment Methods
 */
export type ExpensePaymentMethod =
  | 'credit_card'
  | 'debit_card'
  | 'bank_transfer'
  | 'cash'
  | 'check'
  | 'pix'
  | 'boleto'
  | 'paypal'
  | 'other';

/**
 * Expenses Table
 * Registro de despesas operacionais
 */
export const expenses = pgTable('expenses', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),

  // Expense identification
  expenseNumber: text('expense_number').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  category: text('category').notNull().$type<ExpenseCategory>(),
  subcategory: text('subcategory'),

  // Status
  status: text('status').notNull().default('draft').$type<ExpenseStatus>(),

  // Financial data
  currency: text('currency').notNull().default('BRL'),
  amount: decimal('amount', { precision: 18, scale: 2 }).notNull(),
  taxAmount: decimal('tax_amount', { precision: 18, scale: 2 }).default('0.00'),
  totalAmount: decimal('total_amount', { precision: 18, scale: 2 }).notNull(),

  // Payment info
  paymentMethod: text('payment_method').$type<ExpensePaymentMethod>(),
  paymentDate: timestamp('payment_date'),
  dueDate: timestamp('due_date'),

  // Supplier info
  supplierId: uuid('supplier_id'), // Reference to suppliers table
  supplierName: text('supplier_name').notNull(),
  supplierTaxId: text('supplier_tax_id'), // CNPJ/CPF

  // Department/Cost Center
  departmentId: uuid('department_id'), // Reference to departments table
  costCenter: text('cost_center'),
  projectId: uuid('project_id'), // Reference to projects table (if applicable)

  // Approval workflow
  requiresApproval: boolean('requires_approval').default(false),
  approvedBy: uuid('approved_by'), // User ID who approved
  approvedAt: timestamp('approved_at'),
  rejectedBy: uuid('rejected_by'),
  rejectedAt: timestamp('rejected_at'),
  rejectionReason: text('rejection_reason'),

  // Invoice/Receipt info
  invoiceId: uuid('invoice_id'), // Reference to invoices table
  receiptNumber: text('receipt_number'),
  receiptDate: timestamp('receipt_date'),

  // Bank reconciliation
  bankAccountId: uuid('bank_account_id'), // Reference to bank_accounts table
  transactionId: text('transaction_id'),
  reconciledAt: timestamp('reconciled_at'),

  // Recurring expense
  isRecurring: boolean('is_recurring').default(false),
  recurringFrequency: text('recurring_frequency'), // monthly, quarterly, yearly
  recurringEndDate: timestamp('recurring_end_date'),
  parentExpenseId: uuid('parent_expense_id'), // Reference to parent recurring expense

  // Tax deductible
  isTaxDeductible: boolean('is_tax_deductible').default(true),
  taxDeductionPercent: decimal('tax_deduction_percent', { precision: 5, scale: 2 }).default(
    '100.00'
  ),

  // Attachments
  attachments: jsonb('attachments').$type<
    Array<{
      id: string;
      filename: string;
      url: string;
      type: string; // receipt, invoice, contract, etc.
      size: number;
      uploadedAt: string;
    }>
  >(),

  // Additional metadata
  tags: jsonb('tags').$type<string[]>(),
  customFields: jsonb('custom_fields').$type<Record<string, any>>(),

  // Notes
  notes: text('notes'),
  internalNotes: text('internal_notes'),

  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: uuid('created_by').notNull(),
  updatedBy: uuid('updated_by').notNull(),
});

/**
 * Expense Categories Table
 * Categorias customizáveis de despesas por tenant
 */
export const expenseCategories = pgTable('expense_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),

  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  parentId: uuid('parent_id'), // For subcategories
  color: text('color'), // Hex color for UI
  icon: text('icon'), // Icon identifier

  // Budget tracking
  defaultBudgetAmount: decimal('default_budget_amount', { precision: 18, scale: 2 }),
  requiresApproval: boolean('requires_approval').default(false),
  approvalThreshold: decimal('approval_threshold', { precision: 18, scale: 2 }),

  // Tax settings
  defaultTaxRate: decimal('default_tax_rate', { precision: 5, scale: 2 }).default('0.00'),
  isTaxDeductible: boolean('is_tax_deductible').default(true),

  // Status
  isActive: boolean('is_active').default(true),
  displayOrder: decimal('display_order', { precision: 10, scale: 2 }).default('0'),

  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Expense Approvers Table
 * Configuração de aprovadores por categoria/valor
 */
export const expenseApprovers = pgTable('expense_approvers', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),

  categoryId: uuid('category_id').references(() => expenseCategories.id, {
    onDelete: 'cascade',
  }),
  departmentId: uuid('department_id'), // Approve for specific department
  approverId: uuid('approver_id').notNull(), // User ID

  // Approval limits
  minAmount: decimal('min_amount', { precision: 18, scale: 2 }).default('0.00'),
  maxAmount: decimal('max_amount', { precision: 18, scale: 2 }),

  // Priority (lower = higher priority)
  priority: decimal('priority', { precision: 5, scale: 0 }).default('1'),

  isActive: boolean('is_active').default(true),

  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Relations
 */
export const expensesRelations = relations(expenses, ({ one }) => ({
  category: one(expenseCategories, {
    fields: [expenses.category],
    references: [expenseCategories.slug],
  }),
}));

export const expenseCategoriesRelations = relations(expenseCategories, ({ one, many }) => ({
  parent: one(expenseCategories, {
    fields: [expenseCategories.parentId],
    references: [expenseCategories.id],
  }),
  subcategories: many(expenseCategories),
  approvers: many(expenseApprovers),
}));

export const expenseApproversRelations = relations(expenseApprovers, ({ one }) => ({
  category: one(expenseCategories, {
    fields: [expenseApprovers.categoryId],
    references: [expenseCategories.id],
  }),
}));

/**
 * Type Exports
 */
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type ExpenseCategory_ = typeof expenseCategories.$inferSelect;
export type NewExpenseCategory = typeof expenseCategories.$inferInsert;
export type ExpenseApprover = typeof expenseApprovers.$inferSelect;
export type NewExpenseApprover = typeof expenseApprovers.$inferInsert;
