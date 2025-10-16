/**
 * Subscription History Schema
 * Audit trail for all subscription changes and events
 */

import { pgTable, uuid, varchar, text, timestamp, decimal, jsonb, boolean, integer } from 'drizzle-orm/pg-core';
import { tenants } from '../../tenants/schema/tenants.schema';
import { subscriptionPlans } from './subscription-plans.schema';
import { users } from '../../auth/schema/auth.schema';

/**
 * Subscription History Table
 * Complete audit trail of subscription lifecycle events
 * (plan changes, cancellations, renewals, payment events)
 */
export const subscriptionHistory = pgTable('subscription_history', {
  // Primary Key
  id: uuid('id').primaryKey().defaultRandom(),

  // Foreign Keys
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  planId: uuid('plan_id')
    .references(() => subscriptionPlans.id, { onDelete: 'set null' }),
  previousPlanId: uuid('previous_plan_id')
    .references(() => subscriptionPlans.id, { onDelete: 'set null' }),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'set null' }), // Who made the change

  // Event Details
  eventType: varchar('event_type', { length: 50 }).notNull(), // created, upgraded, downgraded, canceled, renewed, payment_succeeded, payment_failed
  eventCategory: varchar('event_category', { length: 50 }).notNull(), // subscription, payment, usage, limit
  eventSource: varchar('event_source', { length: 50 }).notNull(), // user_action, stripe_webhook, system_auto, admin_action

  // Event Description
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),

  // Status Changes
  oldStatus: varchar('old_status', { length: 20 }),
  newStatus: varchar('new_status', { length: 20 }),

  // Pricing Changes
  oldPrice: decimal('old_price', { precision: 10, scale: 2 }),
  newPrice: decimal('new_price', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 3 }).default('BRL'),

  // Payment Information (from Stripe webhooks via Better-Auth)
  stripeEventId: varchar('stripe_event_id', { length: 255 }), // evt_xxx
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }), // sub_xxx
  stripeInvoiceId: varchar('stripe_invoice_id', { length: 255 }), // in_xxx
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }), // pi_xxx

  // Amount Details
  amount: decimal('amount', { precision: 10, scale: 2 }),
  amountRefunded: decimal('amount_refunded', { precision: 10, scale: 2 }),

  // Additional Context
  reason: text('reason'), // User-provided reason (e.g., cancellation reason)
  notes: text('notes'), // Admin notes

  // IP and User Agent (for audit)
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),

  // Success/Failure
  isSuccess: boolean('is_success').notNull().default(true),
  errorMessage: text('error_message'),
  errorCode: varchar('error_code', { length: 50 }),

  // Metadata (flexible JSON for additional data)
  metadata: jsonb('metadata').$type<{
    previousLimits?: Record<string, any>;
    newLimits?: Record<string, any>;
    featuresAdded?: string[];
    featuresRemoved?: string[];
    prorationAmount?: number;
    nextBillingDate?: string;
    trialEndDate?: string;
    cancelAtPeriodEnd?: boolean;
    [key: string]: any;
  }>(),

  // Timestamp
  eventTime: timestamp('event_time', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Subscription Invoices Table (synced from Stripe via Better-Auth)
 * Stores invoice information for billing history
 */
export const subscriptionInvoices = pgTable('subscription_invoices', {
  // Primary Key
  id: uuid('id').primaryKey().defaultRandom(),

  // Foreign Keys
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  planId: uuid('plan_id')
    .references(() => subscriptionPlans.id, { onDelete: 'set null' }),

  // Stripe References
  stripeInvoiceId: varchar('stripe_invoice_id', { length: 255 }).notNull().unique(), // in_xxx
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }), // sub_xxx
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }).notNull(), // cus_xxx
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }), // pi_xxx

  // Invoice Details
  invoiceNumber: varchar('invoice_number', { length: 100 }), // Human-readable invoice number
  status: varchar('status', { length: 20 }).notNull(), // draft, open, paid, void, uncollectible

  // Amounts
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  tax: decimal('tax', { precision: 10, scale: 2 }).notNull().default('0.00'),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  amountPaid: decimal('amount_paid', { precision: 10, scale: 2 }).notNull().default('0.00'),
  amountDue: decimal('amount_due', { precision: 10, scale: 2 }).notNull().default('0.00'),
  amountRemaining: decimal('amount_remaining', { precision: 10, scale: 2 }).notNull().default('0.00'),
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'),

  // Billing Period
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),

  // Due Date
  dueDate: timestamp('due_date', { withTimezone: true }),

  // Payment
  paid: boolean('paid').notNull().default(false),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  attemptCount: integer('attempt_count').notNull().default(0),
  nextPaymentAttempt: timestamp('next_payment_attempt', { withTimezone: true }),

  // PDF and Hosted Page
  invoicePdfUrl: text('invoice_pdf_url'),
  hostedInvoiceUrl: text('hosted_invoice_url'),

  // Failure Details
  lastFinalizationError: text('last_finalization_error'),

  // Metadata
  metadata: jsonb('metadata').$type<Record<string, any>>(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/**
 * Subscription Notifications Table
 * Tracks notifications sent to tenants about subscription events
 */
export const subscriptionNotifications = pgTable('subscription_notifications', {
  // Primary Key
  id: uuid('id').primaryKey().defaultRandom(),

  // Foreign Keys
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'set null' }),

  // Notification Details
  notificationType: varchar('notification_type', { length: 50 }).notNull(), // trial_ending, payment_failed, limit_reached, upgrade_available, etc.
  notificationCategory: varchar('notification_category', { length: 50 }).notNull(), // billing, usage, feature, system
  priority: varchar('priority', { length: 20 }).notNull().default('normal'), // low, normal, high, urgent

  // Content
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  actionUrl: text('action_url'), // Link to take action (e.g., upgrade page)
  actionLabel: varchar('action_label', { length: 100 }), // Button text

  // Delivery Status
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at', { withTimezone: true }),
  isSent: boolean('is_sent').notNull().default(false),
  sentAt: timestamp('sent_at', { withTimezone: true }),

  // Delivery Channels
  channels: jsonb('channels').notNull().$type<string[]>().default(['in_app']), // in_app, email, sms, webhook
  emailSent: boolean('email_sent').notNull().default(false),
  emailSentAt: timestamp('email_sent_at', { withTimezone: true }),

  // Expiration
  expiresAt: timestamp('expires_at', { withTimezone: true }),

  // Metadata
  metadata: jsonb('metadata').$type<Record<string, any>>(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Export types for use in services
export type SubscriptionHistory = typeof subscriptionHistory.$inferSelect;
export type NewSubscriptionHistory = typeof subscriptionHistory.$inferInsert;
export type SubscriptionInvoice = typeof subscriptionInvoices.$inferSelect;
export type NewSubscriptionInvoice = typeof subscriptionInvoices.$inferInsert;
export type SubscriptionNotification = typeof subscriptionNotifications.$inferSelect;
export type NewSubscriptionNotification = typeof subscriptionNotifications.$inferInsert;
