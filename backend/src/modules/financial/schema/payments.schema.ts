/**
 * Payment Schemas
 *
 * Schemas for multi-gateway payment system
 */

import { pgTable, uuid, varchar, boolean, text, decimal, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from '../../tenants/schema/tenants.schema';
import { users } from '../../users/schema/users.schema';

/**
 * Payment Gateways
 *
 * Supported payment gateways (InfinityPay, Banco, Stripe, etc.)
 */
export const paymentGateways = pgTable('payment_gateways', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 50 }).unique().notNull(),
  provider: varchar('provider', { length: 50 }).notNull(), // infinitypay, stripe, banco
  isActive: boolean('is_active').default(true).notNull(),
  isPrimary: boolean('is_primary').default(false).notNull(),
  supportedCountries: text('supported_countries').array().notNull(), // ['BR', 'US']
  supportedCurrencies: text('supported_currencies').array().notNull(), // ['BRL', 'USD']
  supportedMethods: jsonb('supported_methods').notNull(), // { pix: {}, credit_card: {} }
  configuration: jsonb('configuration').notNull(), // API keys, secrets, etc.
  fees: jsonb('fees').notNull(), // { fixed: 0, percentage: 2.9 }
  webhookUrl: varchar('webhook_url', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Payment Transactions
 *
 * All payment transactions processed
 */
export const paymentTransactions = pgTable('payment_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  gatewayId: uuid('gateway_id').notNull().references(() => paymentGateways.id),
  externalId: varchar('external_id', { length: 255 }).notNull(), // Gateway transaction ID
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }).notNull(), // pix, credit_card, etc.
  status: varchar('status', { length: 20 }).notNull(), // pending, processing, completed, failed, cancelled, refunded
  gatewayStatus: varchar('gateway_status', { length: 50 }), // Gateway-specific status
  gatewayResponse: jsonb('gateway_response'), // Full gateway response
  metadata: jsonb('metadata').default({}).notNull(), // Additional metadata
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Payment Methods
 *
 * Saved payment methods for users
 */
export const paymentMethods = pgTable('payment_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  gatewayId: uuid('gateway_id').notNull().references(() => paymentGateways.id),
  externalId: varchar('external_id', { length: 255 }).notNull(), // Gateway payment method ID
  type: varchar('type', { length: 50 }).notNull(), // card, pix, bank_transfer, boleto
  lastFour: varchar('last_four', { length: 4 }), // Last 4 digits of card
  brand: varchar('brand', { length: 50 }), // visa, mastercard, etc.
  expiryMonth: integer('expiry_month'),
  expiryYear: integer('expiry_year'),
  isDefault: boolean('is_default').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Payment Webhooks
 *
 * Webhook events from payment gateways
 */
export const paymentWebhooks = pgTable('payment_webhooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  gatewayId: uuid('gateway_id').notNull().references(() => paymentGateways.id),
  externalId: varchar('external_id', { length: 255 }).notNull(), // Gateway event ID
  eventType: varchar('event_type', { length: 100 }).notNull(), // payment.success, payment.failed, etc.
  payload: jsonb('payload').notNull(), // Full webhook payload
  signature: varchar('signature', { length: 500 }), // Webhook signature for verification
  processed: boolean('processed').default(false).notNull(),
  processedAt: timestamp('processed_at'),
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Payment Refunds
 *
 * Refund transactions
 */
export const paymentRefunds = pgTable('payment_refunds', {
  id: uuid('id').primaryKey().defaultRandom(),
  transactionId: uuid('transaction_id').notNull().references(() => paymentTransactions.id),
  externalId: varchar('external_id', { length: 255 }).notNull(), // Gateway refund ID
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  reason: varchar('reason', { length: 100 }),
  status: varchar('status', { length: 20 }).notNull(), // pending, completed, failed
  gatewayResponse: jsonb('gateway_response'),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Payment Dunning
 *
 * Retry logic for failed payments
 */
export const paymentDunning = pgTable('payment_dunning', {
  id: uuid('id').primaryKey().defaultRandom(),
  transactionId: uuid('transaction_id').notNull().references(() => paymentTransactions.id),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  attemptCount: integer('attempt_count').default(0).notNull(),
  maxAttempts: integer('max_attempts').default(3).notNull(),
  nextAttempt: timestamp('next_attempt').notNull(),
  lastAttempt: timestamp('last_attempt'),
  status: varchar('status', { length: 20 }).notNull(), // active, paused, completed, failed
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const paymentGatewaysRelations = relations(paymentGateways, ({ many }) => ({
  transactions: many(paymentTransactions),
  methods: many(paymentMethods),
  webhooks: many(paymentWebhooks),
}));

export const paymentTransactionsRelations = relations(paymentTransactions, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [paymentTransactions.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [paymentTransactions.userId],
    references: [users.id],
  }),
  gateway: one(paymentGateways, {
    fields: [paymentTransactions.gatewayId],
    references: [paymentGateways.id],
  }),
  refunds: many(paymentRefunds),
  dunning: many(paymentDunning),
}));

export const paymentMethodsRelations = relations(paymentMethods, ({ one }) => ({
  user: one(users, {
    fields: [paymentMethods.userId],
    references: [users.id],
  }),
  gateway: one(paymentGateways, {
    fields: [paymentMethods.gatewayId],
    references: [paymentGateways.id],
  }),
}));

export const paymentWebhooksRelations = relations(paymentWebhooks, ({ one }) => ({
  gateway: one(paymentGateways, {
    fields: [paymentWebhooks.gatewayId],
    references: [paymentGateways.id],
  }),
}));

export const paymentRefundsRelations = relations(paymentRefunds, ({ one }) => ({
  transaction: one(paymentTransactions, {
    fields: [paymentRefunds.transactionId],
    references: [paymentTransactions.id],
  }),
}));

export const paymentDunningRelations = relations(paymentDunning, ({ one }) => ({
  transaction: one(paymentTransactions, {
    fields: [paymentDunning.transactionId],
    references: [paymentTransactions.id],
  }),
  tenant: one(tenants, {
    fields: [paymentDunning.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [paymentDunning.userId],
    references: [users.id],
  }),
}));

// Types
export type PaymentGateway = typeof paymentGateways.$inferSelect;
export type NewPaymentGateway = typeof paymentGateways.$inferInsert;

export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type NewPaymentTransaction = typeof paymentTransactions.$inferInsert;

export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type NewPaymentMethod = typeof paymentMethods.$inferInsert;

export type PaymentWebhook = typeof paymentWebhooks.$inferSelect;
export type NewPaymentWebhook = typeof paymentWebhooks.$inferInsert;

export type PaymentRefund = typeof paymentRefunds.$inferSelect;
export type NewPaymentRefund = typeof paymentRefunds.$inferInsert;

export type PaymentDunning = typeof paymentDunning.$inferSelect;
export type NewPaymentDunning = typeof paymentDunning.$inferInsert;

// Payment Types
export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export type RefundStatus =
  | 'pending'
  | 'completed'
  | 'failed';

export type DunningStatus =
  | 'active'
  | 'paused'
  | 'completed'
  | 'failed';

export type PaymentMethodType =
  | 'pix'
  | 'credit_card'
  | 'debit_card'
  | 'boleto'
  | 'bank_transfer'
  | 'digital_wallet';

export type GatewayProvider =
  | 'infinitypay'
  | 'stripe'
  | 'banco';
