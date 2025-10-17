/**
 * P2P Marketplace Schemas
 *
 * Database schemas for peer-to-peer cryptocurrency trading marketplace
 * Supports: Orders, Trades, Escrow, Chat, Disputes, Reputation, Payment Methods, Fees
 */

import { pgTable, uuid, varchar, boolean, text, decimal, timestamp, jsonb, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from '../../tenants/schema/tenants.schema';
import { users } from '../../auth/schema/auth.schema';

/**
 * Enums
 */
export const orderTypeEnum = pgEnum('order_type', ['buy', 'sell']);
export const orderStatusEnum = pgEnum('order_status', ['active', 'inactive', 'completed', 'cancelled', 'expired']);
export const priceTypeEnum = pgEnum('price_type', ['market', 'limit', 'floating']);
export const tradeStatusEnum = pgEnum('trade_status', ['pending', 'payment_sent', 'payment_confirmed', 'completed', 'cancelled', 'disputed']);
export const escrowStatusEnum = pgEnum('escrow_status', ['locked', 'released', 'refunded', 'disputed']);
export const disputeStatusEnum = pgEnum('dispute_status', ['open', 'under_review', 'resolved', 'closed']);
export const disputeReasonEnum = pgEnum('dispute_reason', ['payment_not_received', 'payment_incorrect', 'fraud', 'other']);
export const feeTypeEnum = pgEnum('fee_type', ['maker', 'taker', 'withdrawal', 'deposit']);

export type OrderType = 'buy' | 'sell';
export type OrderStatus = 'active' | 'inactive' | 'completed' | 'cancelled' | 'expired';
export type PriceType = 'market' | 'limit' | 'floating';
export type TradeStatus = 'pending' | 'payment_sent' | 'payment_confirmed' | 'completed' | 'cancelled' | 'disputed';
export type EscrowStatus = 'locked' | 'released' | 'refunded' | 'disputed';
export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'closed';
export type DisputeReason = 'payment_not_received' | 'payment_incorrect' | 'fraud' | 'other';
export type FeeType = 'maker' | 'taker' | 'withdrawal' | 'deposit';

/**
 * P2P Orders
 *
 * Buy/Sell orders posted by users
 */
export const p2pOrders = pgTable('p2p_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  userId: uuid('user_id').notNull().references(() => users.id),

  // Order details
  orderType: orderTypeEnum('order_type').notNull(),
  cryptocurrency: varchar('cryptocurrency', { length: 10 }).notNull(), // BTC, ETH, USDT
  fiatCurrency: varchar('fiat_currency', { length: 3 }).notNull(), // USD, BRL, EUR
  priceType: priceTypeEnum('price_type').notNull(),
  price: decimal('price', { precision: 15, scale: 2 }), // Fixed price for limit orders
  priceMargin: decimal('price_margin', { precision: 5, scale: 2 }), // Margin % for floating prices

  // Amount limits
  minAmount: decimal('min_amount', { precision: 15, scale: 8 }).notNull(),
  maxAmount: decimal('max_amount', { precision: 15, scale: 8 }).notNull(),
  availableAmount: decimal('available_amount', { precision: 15, scale: 8 }).notNull(),

  // Trading parameters
  paymentTimeLimit: integer('payment_time_limit').notNull().default(30), // Minutes
  paymentMethods: text('payment_methods').array().notNull(), // ['pix', 'bank_transfer', 'paypal']
  terms: text('terms'), // Terms and conditions
  autoReply: text('auto_reply'), // Automatic response message

  // Restrictions
  minTradeCount: integer('min_trade_count').default(0), // Minimum trades completed
  minCompletionRate: decimal('min_completion_rate', { precision: 5, scale: 2 }).default('0'), // Minimum completion rate %
  verifiedUsersOnly: boolean('verified_users_only').default(false),

  // Status and metadata
  status: orderStatusEnum('status').notNull().default('active'),
  totalTrades: integer('total_trades').default(0).notNull(),
  completedTrades: integer('completed_trades').default(0).notNull(),
  metadata: jsonb('metadata').default({}).notNull(),

  // Timestamps
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * P2P Trades
 *
 * Individual trades between buyers and sellers
 */
export const p2pTrades = pgTable('p2p_trades', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  orderId: uuid('order_id').notNull().references(() => p2pOrders.id),

  // Participants
  sellerId: uuid('seller_id').notNull().references(() => users.id),
  buyerId: uuid('buyer_id').notNull().references(() => users.id),

  // Trade details
  cryptocurrency: varchar('cryptocurrency', { length: 10 }).notNull(),
  cryptoAmount: decimal('crypto_amount', { precision: 15, scale: 8 }).notNull(),
  fiatCurrency: varchar('fiat_currency', { length: 3 }).notNull(),
  fiatAmount: decimal('fiat_amount', { precision: 15, scale: 2 }).notNull(),
  price: decimal('price', { precision: 15, scale: 2 }).notNull(), // Final agreed price

  // Payment
  paymentMethod: varchar('payment_method', { length: 50 }).notNull(),
  paymentDetails: jsonb('payment_details').notNull(), // Payment information

  // Status tracking
  status: tradeStatusEnum('status').notNull().default('pending'),

  // Fee tracking
  makerFee: decimal('maker_fee', { precision: 15, scale: 8 }).notNull().default('0'),
  takerFee: decimal('taker_fee', { precision: 15, scale: 8 }).notNull().default('0'),

  // Timing
  paymentDeadline: timestamp('payment_deadline').notNull(),
  paymentSentAt: timestamp('payment_sent_at'),
  paymentConfirmedAt: timestamp('payment_confirmed_at'),
  completedAt: timestamp('completed_at'),
  cancelledAt: timestamp('cancelled_at'),

  // Additional data
  cancellationReason: text('cancellation_reason'),
  metadata: jsonb('metadata').default({}).notNull(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * P2P Escrow
 *
 * Funds held in escrow during trades
 */
export const p2pEscrow = pgTable('p2p_escrow', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  tradeId: uuid('trade_id').notNull().references(() => p2pTrades.id).unique(),

  // Escrow details
  cryptocurrency: varchar('cryptocurrency', { length: 10 }).notNull(),
  amount: decimal('amount', { precision: 15, scale: 8 }).notNull(),
  holderId: uuid('holder_id').notNull().references(() => users.id), // Seller (who locked funds)

  // Status
  status: escrowStatusEnum('status').notNull().default('locked'),

  // Timing
  lockedAt: timestamp('locked_at').defaultNow().notNull(),
  releasedAt: timestamp('released_at'),
  refundedAt: timestamp('refunded_at'),

  // Additional data
  metadata: jsonb('metadata').default({}).notNull(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * P2P Messages
 *
 * Chat messages between traders
 */
export const p2pMessages = pgTable('p2p_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  tradeId: uuid('trade_id').notNull().references(() => p2pTrades.id),

  // Message details
  senderId: uuid('sender_id').notNull().references(() => users.id),
  recipientId: uuid('recipient_id').notNull().references(() => users.id),
  message: text('message').notNull(),

  // Attachments
  attachments: jsonb('attachments').default([]).notNull(), // File URLs, images

  // Status
  isRead: boolean('is_read').default(false).notNull(),
  isSystem: boolean('is_system').default(false).notNull(), // System-generated message

  // Timestamps
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * P2P Disputes
 *
 * Disputes opened for problematic trades
 */
export const p2pDisputes = pgTable('p2p_disputes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  tradeId: uuid('trade_id').notNull().references(() => p2pTrades.id).unique(),

  // Dispute details
  openedBy: uuid('opened_by').notNull().references(() => users.id),
  reason: disputeReasonEnum('reason').notNull(),
  description: text('description').notNull(),
  evidence: jsonb('evidence').default([]).notNull(), // Screenshots, receipts, etc.

  // Resolution
  status: disputeStatusEnum('status').notNull().default('open'),
  assignedTo: uuid('assigned_to').references(() => users.id), // Admin/Arbitrator
  resolution: text('resolution'),
  resolvedInFavorOf: uuid('resolved_in_favor_of').references(() => users.id),

  // Timing
  resolvedAt: timestamp('resolved_at'),
  closedAt: timestamp('closed_at'),

  // Additional data
  metadata: jsonb('metadata').default({}).notNull(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * P2P Reputation
 *
 * User reputation and reviews
 */
export const p2pReputation = pgTable('p2p_reputation', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  tradeId: uuid('trade_id').notNull().references(() => p2pTrades.id).unique(),

  // Review details
  reviewerId: uuid('reviewer_id').notNull().references(() => users.id),
  reviewedUserId: uuid('reviewed_user_id').notNull().references(() => users.id),

  // Rating (1-5 stars)
  rating: integer('rating').notNull(), // 1-5
  comment: text('comment'),

  // Review type
  isPositive: boolean('is_positive').notNull(),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * P2P Payment Methods
 *
 * User's saved payment methods for P2P trading
 */
export const p2pPaymentMethods = pgTable('p2p_payment_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  userId: uuid('user_id').notNull().references(() => users.id),

  // Method details
  methodType: varchar('method_type', { length: 50 }).notNull(), // pix, bank_transfer, paypal, etc.
  methodName: varchar('method_name', { length: 100 }).notNull(), // Custom name

  // Payment details (encrypted in production)
  details: jsonb('details').notNull(), // Account number, PIX key, email, etc.

  // Status
  isActive: boolean('is_active').default(true).notNull(),
  isVerified: boolean('is_verified').default(false).notNull(),

  // Usage stats
  timesUsed: integer('times_used').default(0).notNull(),

  // Timestamps
  verifiedAt: timestamp('verified_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * P2P Fees
 *
 * Fee structure and history
 */
export const p2pFees = pgTable('p2p_fees', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),

  // Fee details
  feeType: feeTypeEnum('fee_type').notNull(),
  cryptocurrency: varchar('cryptocurrency', { length: 10 }), // null = applies to all

  // Fee structure
  percentage: decimal('percentage', { precision: 5, scale: 2 }).default('0').notNull(),
  fixedAmount: decimal('fixed_amount', { precision: 15, scale: 8 }).default('0').notNull(),

  // Tiers (volume-based discounts)
  minVolume: decimal('min_volume', { precision: 15, scale: 2 }),
  maxVolume: decimal('max_volume', { precision: 15, scale: 2 }),

  // Status
  isActive: boolean('is_active').default(true).notNull(),

  // Timestamps
  effectiveFrom: timestamp('effective_from').defaultNow().notNull(),
  effectiveUntil: timestamp('effective_until'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Relations
 */
export const p2pOrdersRelations = relations(p2pOrders, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [p2pOrders.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [p2pOrders.userId],
    references: [users.id],
  }),
  trades: many(p2pTrades),
}));

export const p2pTradesRelations = relations(p2pTrades, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [p2pTrades.tenantId],
    references: [tenants.id],
  }),
  order: one(p2pOrders, {
    fields: [p2pTrades.orderId],
    references: [p2pOrders.id],
  }),
  seller: one(users, {
    fields: [p2pTrades.sellerId],
    references: [users.id],
  }),
  buyer: one(users, {
    fields: [p2pTrades.buyerId],
    references: [users.id],
  }),
  escrow: one(p2pEscrow),
  messages: many(p2pMessages),
  dispute: one(p2pDisputes),
  reputation: one(p2pReputation),
}));

export const p2pEscrowRelations = relations(p2pEscrow, ({ one }) => ({
  tenant: one(tenants, {
    fields: [p2pEscrow.tenantId],
    references: [tenants.id],
  }),
  trade: one(p2pTrades, {
    fields: [p2pEscrow.tradeId],
    references: [p2pTrades.id],
  }),
  holder: one(users, {
    fields: [p2pEscrow.holderId],
    references: [users.id],
  }),
}));

export const p2pMessagesRelations = relations(p2pMessages, ({ one }) => ({
  tenant: one(tenants, {
    fields: [p2pMessages.tenantId],
    references: [tenants.id],
  }),
  trade: one(p2pTrades, {
    fields: [p2pMessages.tradeId],
    references: [p2pTrades.id],
  }),
  sender: one(users, {
    fields: [p2pMessages.senderId],
    references: [users.id],
  }),
  recipient: one(users, {
    fields: [p2pMessages.recipientId],
    references: [users.id],
  }),
}));

export const p2pDisputesRelations = relations(p2pDisputes, ({ one }) => ({
  tenant: one(tenants, {
    fields: [p2pDisputes.tenantId],
    references: [tenants.id],
  }),
  trade: one(p2pTrades, {
    fields: [p2pDisputes.tradeId],
    references: [p2pTrades.id],
  }),
  opener: one(users, {
    fields: [p2pDisputes.openedBy],
    references: [users.id],
  }),
}));

export const p2pReputationRelations = relations(p2pReputation, ({ one }) => ({
  tenant: one(tenants, {
    fields: [p2pReputation.tenantId],
    references: [tenants.id],
  }),
  trade: one(p2pTrades, {
    fields: [p2pReputation.tradeId],
    references: [p2pTrades.id],
  }),
  reviewer: one(users, {
    fields: [p2pReputation.reviewerId],
    references: [users.id],
  }),
  reviewedUser: one(users, {
    fields: [p2pReputation.reviewedUserId],
    references: [users.id],
  }),
}));

export const p2pPaymentMethodsRelations = relations(p2pPaymentMethods, ({ one }) => ({
  tenant: one(tenants, {
    fields: [p2pPaymentMethods.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [p2pPaymentMethods.userId],
    references: [users.id],
  }),
}));

export const p2pFeesRelations = relations(p2pFees, ({ one }) => ({
  tenant: one(tenants, {
    fields: [p2pFees.tenantId],
    references: [tenants.id],
  }),
}));
