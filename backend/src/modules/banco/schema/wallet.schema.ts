/**
 * Wallet Schema
 *
 * Multi-asset wallet system with main wallet + savings
 * Supports BTC, ETH, USDT, and other cryptocurrencies
 */

import {
  pgTable,
  text,
  timestamp,
  decimal,
  uuid,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from '../../auth/schema/auth.schema';
import { tenants } from '../../tenants/schema/tenants.schema';

/**
 * Asset Types
 */
export type AssetType =
  | 'BTC'
  | 'ETH'
  | 'USDT'
  | 'USDC'
  | 'BNB'
  | 'SOL'
  | 'ADA'
  | 'DOT'
  | 'MATIC'
  | 'AVAX'
  | 'BRL'
  | 'USD';

/**
 * Wallet Types
 */
export type WalletType = 'main' | 'savings' | 'trading' | 'staking';

/**
 * Transaction Types
 */
export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'transfer'
  | 'trade'
  | 'fee'
  | 'reward'
  | 'staking_reward'
  | 'interest';

/**
 * Transaction Status
 */
export type TransactionStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'pending_approval';

/**
 * Withdrawal Status
 */
export type WithdrawalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'processing'
  | 'completed'
  | 'failed';

/**
 * Wallets Table
 * User wallets for different purposes (main, savings, trading)
 */
export const wallets = pgTable(
  'wallets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    // Wallet info
    name: text('name').notNull(),
    type: text('type').notNull().$type<WalletType>(),
    description: text('description'),

    // Status
    isActive: boolean('is_active').notNull().default(true),
    isLocked: boolean('is_locked').notNull().default(false),
    lockReason: text('lock_reason'),

    // Metadata
    metadata: jsonb('metadata').$type<{
      color?: string;
      icon?: string;
      displayOrder?: number;
      customFields?: Record<string, any>;
    }>(),

    // Audit
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('wallets_user_id_idx').on(table.userId),
    tenantIdIdx: index('wallets_tenant_id_idx').on(table.tenantId),
    typeIdx: index('wallets_type_idx').on(table.type),
    userTypeUnique: uniqueIndex('wallets_user_type_unique').on(table.userId, table.type),
  })
);

/**
 * Wallet Assets Table
 * Asset balances within each wallet
 */
export const walletAssets = pgTable(
  'wallet_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    walletId: uuid('wallet_id')
      .notNull()
      .references(() => wallets.id, { onDelete: 'cascade' }),

    // Asset info
    asset: text('asset').notNull().$type<AssetType>(),
    balance: decimal('balance', { precision: 36, scale: 18 }).notNull().default('0'),
    lockedBalance: decimal('locked_balance', { precision: 36, scale: 18 }).notNull().default('0'),
    availableBalance: decimal('available_balance', { precision: 36, scale: 18 }).notNull().default('0'),

    // Price tracking (cached)
    lastPrice: decimal('last_price', { precision: 18, scale: 8 }),
    lastPriceUsd: decimal('last_price_usd', { precision: 18, scale: 8 }),
    lastPriceUpdate: timestamp('last_price_update'),

    // Portfolio allocation
    valueUsd: decimal('value_usd', { precision: 18, scale: 2 }).default('0'),
    valueBtc: decimal('value_btc', { precision: 18, scale: 8 }).default('0'),
    allocationPercent: decimal('allocation_percent', { precision: 5, scale: 2 }).default('0'),

    // Cost basis for P&L
    averageCost: decimal('average_cost', { precision: 18, scale: 8 }),
    totalCost: decimal('total_cost', { precision: 18, scale: 2 }),
    unrealizedPnl: decimal('unrealized_pnl', { precision: 18, scale: 2 }),
    unrealizedPnlPercent: decimal('unrealized_pnl_percent', { precision: 10, scale: 2 }),

    // Audit
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    walletIdIdx: index('wallet_assets_wallet_id_idx').on(table.walletId),
    assetIdx: index('wallet_assets_asset_idx').on(table.asset),
    walletAssetUnique: uniqueIndex('wallet_assets_wallet_asset_unique').on(table.walletId, table.asset),
  })
);

/**
 * Wallet Transactions Table
 * All wallet transactions (deposits, withdrawals, transfers)
 */
export const walletTransactions = pgTable(
  'wallet_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    walletId: uuid('wallet_id')
      .notNull()
      .references(() => wallets.id, { onDelete: 'cascade' }),

    // Transaction info
    type: text('type').notNull().$type<TransactionType>(),
    asset: text('asset').notNull().$type<AssetType>(),
    amount: decimal('amount', { precision: 36, scale: 18 }).notNull(),
    fee: decimal('fee', { precision: 36, scale: 18 }).default('0'),
    status: text('status').notNull().$type<TransactionStatus>(),

    // External references
    externalId: text('external_id'), // Exchange transaction ID
    txHash: text('tx_hash'), // Blockchain transaction hash
    blockchainNetwork: text('blockchain_network'), // mainnet, testnet, etc.

    // Related entities
    fromWalletId: uuid('from_wallet_id').references(() => wallets.id),
    toWalletId: uuid('to_wallet_id').references(() => wallets.id),
    fromAddress: text('from_address'),
    toAddress: text('to_address'),

    // Additional data
    description: text('description'),
    metadata: jsonb('metadata').$type<{
      exchange?: string;
      orderId?: string;
      tradeId?: string;
      gasUsed?: string;
      confirmations?: number;
      customFields?: Record<string, any>;
    }>(),

    // Timestamps
    processedAt: timestamp('processed_at'),
    confirmedAt: timestamp('confirmed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    walletIdIdx: index('wallet_transactions_wallet_id_idx').on(table.walletId),
    userIdIdx: index('wallet_transactions_user_id_idx').on(table.userId),
    tenantIdIdx: index('wallet_transactions_tenant_id_idx').on(table.tenantId),
    typeIdx: index('wallet_transactions_type_idx').on(table.type),
    statusIdx: index('wallet_transactions_status_idx').on(table.status),
    assetIdx: index('wallet_transactions_asset_idx').on(table.asset),
    txHashIdx: index('wallet_transactions_tx_hash_idx').on(table.txHash),
    createdAtIdx: index('wallet_transactions_created_at_idx').on(table.createdAt),
  })
);

/**
 * Withdrawal Requests Table
 * Withdrawal requests with approval workflow
 */
export const withdrawalRequests = pgTable(
  'withdrawal_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    walletId: uuid('wallet_id')
      .notNull()
      .references(() => wallets.id, { onDelete: 'cascade' }),

    // Withdrawal details
    asset: text('asset').notNull().$type<AssetType>(),
    amount: decimal('amount', { precision: 36, scale: 18 }).notNull(),
    destinationAddress: text('destination_address').notNull(),
    network: text('network').notNull(), // BTC, ETH, BSC, etc.

    // Fees
    networkFee: decimal('network_fee', { precision: 36, scale: 18 }),
    platformFee: decimal('platform_fee', { precision: 36, scale: 18 }),
    totalFee: decimal('total_fee', { precision: 36, scale: 18 }),

    // Status
    status: text('status').notNull().$type<WithdrawalStatus>(),

    // Approval workflow
    requiresApproval: boolean('requires_approval').notNull().default(true),
    approvedBy: text('approver_id').references(() => users.id),
    approvedAt: timestamp('approved_at'),
    rejectedBy: text('rejector_id').references(() => users.id),
    rejectedAt: timestamp('rejected_at'),
    rejectionReason: text('rejection_reason'),

    // Security
    twoFactorVerified: boolean('two_factor_verified').default(false),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),

    // Linked transaction
    transactionId: uuid('transaction_id').references(() => walletTransactions.id),

    // Metadata
    notes: text('notes'),
    metadata: jsonb('metadata').$type<Record<string, any>>(),

    // Timestamps
    processedAt: timestamp('processed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('withdrawal_requests_user_id_idx').on(table.userId),
    walletIdIdx: index('withdrawal_requests_wallet_id_idx').on(table.walletId),
    statusIdx: index('withdrawal_requests_status_idx').on(table.status),
    createdAtIdx: index('withdrawal_requests_created_at_idx').on(table.createdAt),
  })
);

/**
 * Savings Goals Table
 * User savings goals with gamification
 */
export const savingsGoals = pgTable(
  'savings_goals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    walletId: uuid('wallet_id')
      .notNull()
      .references(() => wallets.id, { onDelete: 'cascade' }),

    // Goal details
    name: text('name').notNull(),
    description: text('description'),
    targetAmount: decimal('target_amount', { precision: 36, scale: 18 }).notNull(),
    currentAmount: decimal('current_amount', { precision: 36, scale: 18 }).notNull().default('0'),
    asset: text('asset').notNull().$type<AssetType>(),

    // Timeline
    targetDate: timestamp('target_date'),
    startDate: timestamp('start_date').notNull().defaultNow(),
    completedDate: timestamp('completed_date'),

    // Progress
    progressPercent: decimal('progress_percent', { precision: 5, scale: 2 }).default('0'),
    isCompleted: boolean('is_completed').default(false),
    isActive: boolean('is_active').default(true),

    // Gamification
    badges: jsonb('badges').$type<Array<{
      id: string;
      name: string;
      description: string;
      earnedAt: string;
      icon?: string;
    }>>(),
    milestones: jsonb('milestones').$type<Array<{
      percent: number;
      amount: string;
      reached: boolean;
      reachedAt?: string;
    }>>(),

    // Metadata
    metadata: jsonb('metadata').$type<{
      color?: string;
      icon?: string;
      category?: string;
      customFields?: Record<string, any>;
    }>(),

    // Audit
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('savings_goals_user_id_idx').on(table.userId),
    walletIdIdx: index('savings_goals_wallet_id_idx').on(table.walletId),
    isActiveIdx: index('savings_goals_is_active_idx').on(table.isActive),
  })
);

/**
 * Asset Price History Table
 * Historical price data for assets
 */
export const assetPriceHistory = pgTable(
  'asset_price_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    asset: text('asset').notNull().$type<AssetType>(),

    // Prices
    priceUsd: decimal('price_usd', { precision: 18, scale: 8 }).notNull(),
    priceBtc: decimal('price_btc', { precision: 18, scale: 8 }),

    // Market data
    marketCap: decimal('market_cap', { precision: 20, scale: 2 }),
    volume24h: decimal('volume_24h', { precision: 20, scale: 2 }),
    change24h: decimal('change_24h', { precision: 10, scale: 2 }),

    // Source
    source: text('source').notNull().default('coingecko'), // coingecko, binance, etc.

    // Timestamp
    timestamp: timestamp('timestamp').notNull().defaultNow(),
  },
  (table) => ({
    assetIdx: index('asset_price_history_asset_idx').on(table.asset),
    timestampIdx: index('asset_price_history_timestamp_idx').on(table.timestamp),
    assetTimestampIdx: uniqueIndex('asset_price_history_asset_timestamp_idx').on(table.asset, table.timestamp),
  })
);

/**
 * Relations
 */
export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [wallets.tenantId],
    references: [tenants.id],
  }),
  assets: many(walletAssets),
  transactions: many(walletTransactions),
  withdrawalRequests: many(withdrawalRequests),
  savingsGoals: many(savingsGoals),
}));

export const walletAssetsRelations = relations(walletAssets, ({ one }) => ({
  wallet: one(wallets, {
    fields: [walletAssets.walletId],
    references: [wallets.id],
  }),
}));

export const walletTransactionsRelations = relations(walletTransactions, ({ one }) => ({
  wallet: one(wallets, {
    fields: [walletTransactions.walletId],
    references: [wallets.id],
  }),
  user: one(users, {
    fields: [walletTransactions.userId],
    references: [users.id],
  }),
  tenant: one(tenants, {
    fields: [walletTransactions.tenantId],
    references: [tenants.id],
  }),
  fromWallet: one(wallets, {
    fields: [walletTransactions.fromWalletId],
    references: [wallets.id],
  }),
  toWallet: one(wallets, {
    fields: [walletTransactions.toWalletId],
    references: [wallets.id],
  }),
}));

export const withdrawalRequestsRelations = relations(withdrawalRequests, ({ one }) => ({
  user: one(users, {
    fields: [withdrawalRequests.userId],
    references: [users.id],
  }),
  wallet: one(wallets, {
    fields: [withdrawalRequests.walletId],
    references: [wallets.id],
  }),
  transaction: one(walletTransactions, {
    fields: [withdrawalRequests.transactionId],
    references: [walletTransactions.id],
  }),
}));

export const savingsGoalsRelations = relations(savingsGoals, ({ one }) => ({
  user: one(users, {
    fields: [savingsGoals.userId],
    references: [users.id],
  }),
  wallet: one(wallets, {
    fields: [savingsGoals.walletId],
    references: [wallets.id],
  }),
}));

/**
 * Type Exports
 */
export type Wallet = typeof wallets.$inferSelect;
export type NewWallet = typeof wallets.$inferInsert;
export type WalletAsset = typeof walletAssets.$inferSelect;
export type NewWalletAsset = typeof walletAssets.$inferInsert;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type NewWalletTransaction = typeof walletTransactions.$inferInsert;
export type WithdrawalRequest = typeof withdrawalRequests.$inferSelect;
export type NewWithdrawalRequest = typeof withdrawalRequests.$inferInsert;
export type SavingsGoal = typeof savingsGoals.$inferSelect;
export type NewSavingsGoal = typeof savingsGoals.$inferInsert;
export type AssetPriceHistory = typeof assetPriceHistory.$inferSelect;
export type NewAssetPriceHistory = typeof assetPriceHistory.$inferInsert;
