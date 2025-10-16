/**
 * Invoices Schema
 *
 * Gerenciamento de faturas e notas fiscais (emitidas e recebidas)
 */

import {
  pgTable,
  text,
  timestamp,
  decimal,
  uuid,
  integer,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Invoice Types
 */
export type InvoiceType = 'income' | 'expense';

/**
 * Invoice Status
 */
export type InvoiceStatus =
  | 'draft'
  | 'pending'
  | 'sent'
  | 'paid'
  | 'overdue'
  | 'cancelled'
  | 'refunded';

/**
 * Payment Status
 */
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'failed';

/**
 * Invoices Table
 * Armazena faturas emitidas e recebidas
 */
export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),

  // Invoice identification
  invoiceNumber: text('invoice_number').notNull().unique(),
  type: text('type').notNull().$type<InvoiceType>(), // income (AR) or expense (AP)
  status: text('status').notNull().default('draft').$type<InvoiceStatus>(),

  // Parties
  customerId: uuid('customer_id'), // Reference to customers table (if income)
  supplierId: uuid('supplier_id'), // Reference to suppliers table (if expense)
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email'),
  customerTaxId: text('customer_tax_id'), // CPF/CNPJ
  customerAddress: jsonb('customer_address').$type<{
    street: string;
    number: string;
    complement?: string;
    district: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  }>(),

  // Financial data
  currency: text('currency').notNull().default('BRL'),
  subtotal: decimal('subtotal', { precision: 18, scale: 2 }).notNull(),
  discountAmount: decimal('discount_amount', { precision: 18, scale: 2 }).default('0.00'),
  discountPercent: decimal('discount_percent', { precision: 5, scale: 2 }).default('0.00'),
  taxAmount: decimal('tax_amount', { precision: 18, scale: 2 }).default('0.00'),
  totalAmount: decimal('total_amount', { precision: 18, scale: 2 }).notNull(),

  // Payment tracking
  paidAmount: decimal('paid_amount', { precision: 18, scale: 2 }).default('0.00'),
  remainingAmount: decimal('remaining_amount', { precision: 18, scale: 2 }).notNull(),
  paymentStatus: text('payment_status').notNull().default('pending').$type<PaymentStatus>(),
  paymentMethod: text('payment_method'), // credit_card, boleto, pix, wire_transfer, etc.
  paymentTerms: text('payment_terms'), // Net 30, Net 60, etc.

  // Dates
  issueDate: timestamp('issue_date').notNull().defaultNow(),
  dueDate: timestamp('due_date').notNull(),
  paidDate: timestamp('paid_date'),

  // Line items
  items: jsonb('items').notNull().$type<
    Array<{
      id: string;
      description: string;
      quantity: number;
      unitPrice: string;
      discount: string;
      taxRate: string;
      taxAmount: string;
      total: string;
    }>
  >(),

  // Tax information (NF-e, NFS-e data)
  taxData: jsonb('tax_data').$type<{
    nfeKey?: string; // Chave de acesso NF-e
    nfeNumber?: string;
    nfeSeries?: string;
    nfeProtocol?: string;
    nfseNumber?: string;
    issTax?: string;
    icmsTax?: string;
    pisTax?: string;
    cofinsTax?: string;
  }>(),

  // Additional info
  notes: text('notes'),
  internalNotes: text('internal_notes'), // Not visible to customer
  attachments: jsonb('attachments').$type<
    Array<{
      id: string;
      filename: string;
      url: string;
      type: string;
      size: number;
      uploadedAt: string;
    }>
  >(),

  // Integrations
  stripeInvoiceId: text('stripe_invoice_id'), // Integration with Stripe
  externalId: text('external_id'), // Integration with external systems

  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  createdBy: uuid('created_by').notNull(),
  updatedBy: uuid('updated_by').notNull(),
});

/**
 * Invoice Payments Table
 * Registro de pagamentos recebidos/realizados para uma fatura
 */
export const invoicePayments = pgTable('invoice_payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  invoiceId: uuid('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),

  // Payment details
  amount: decimal('amount', { precision: 18, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('BRL'),
  paymentDate: timestamp('payment_date').notNull().defaultNow(),
  paymentMethod: text('payment_method').notNull(), // credit_card, boleto, pix, etc.

  // Transaction data
  transactionId: text('transaction_id'), // Bank transaction ID, Stripe charge ID, etc.
  referenceNumber: text('reference_number'), // Check number, wire reference, etc.

  // Bank reconciliation
  bankAccountId: uuid('bank_account_id'), // Reference to bank_accounts table
  reconciledAt: timestamp('reconciled_at'),

  // Additional info
  notes: text('notes'),
  attachments: jsonb('attachments').$type<
    Array<{
      id: string;
      filename: string;
      url: string;
      type: string;
      uploadedAt: string;
    }>
  >(),

  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdBy: uuid('created_by').notNull(),
});

/**
 * Invoice Reminders Table
 * Lembretes automáticos para faturas vencidas
 */
export const invoiceReminders = pgTable('invoice_reminders', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull(),
  invoiceId: uuid('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),

  // Reminder config
  daysBeforeDue: integer('days_before_due'), // Negative = after due date
  reminderType: text('reminder_type').notNull(), // email, sms, webhook

  // Status
  status: text('status').notNull().default('pending'), // pending, sent, failed
  sentAt: timestamp('sent_at'),
  errorMessage: text('error_message'),

  // Audit
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Relations
 */
export const invoicesRelations = relations(invoices, ({ many }) => ({
  payments: many(invoicePayments),
  reminders: many(invoiceReminders),
}));

export const invoicePaymentsRelations = relations(invoicePayments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoicePayments.invoiceId],
    references: [invoices.id],
  }),
}));

export const invoiceRemindersRelations = relations(invoiceReminders, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceReminders.invoiceId],
    references: [invoices.id],
  }),
}));

/**
 * Type Exports
 */
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type InvoicePayment = typeof invoicePayments.$inferSelect;
export type NewInvoicePayment = typeof invoicePayments.$inferInsert;
export type InvoiceReminder = typeof invoiceReminders.$inferSelect;
export type NewInvoiceReminder = typeof invoiceReminders.$inferInsert;
