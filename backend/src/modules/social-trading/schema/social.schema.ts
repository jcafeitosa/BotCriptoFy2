/**
 * Social Trading Schemas
 *
 * Database schemas for social trading platform
 * Supports: Copy Trading, Leaderboards, Social Feed, Performance Analytics
 */

import { pgTable, uuid, varchar, boolean, text, decimal, timestamp, jsonb, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from '../../tenants/schema/tenants.schema';
import { users } from '../../auth/schema/auth.schema';

/**
 * Enums
 */
export const traderStatusEnum = pgEnum('trader_status', ['active', 'inactive', 'suspended']);
export const postTypeEnum = pgEnum('post_type', ['trade', 'insight', 'analysis', 'announcement']);
export const signalTypeEnum = pgEnum('signal_type', ['buy', 'sell', 'hold']);
export const strategyTypeEnum = pgEnum('strategy_type', ['scalping', 'day_trading', 'swing', 'position']);
export const performancePeriodEnum = pgEnum('performance_period', ['daily', 'weekly', 'monthly', 'yearly', 'all_time']);

export type TraderStatus = 'active' | 'inactive' | 'suspended';
export type PostType = 'trade' | 'insight' | 'analysis' | 'announcement';
export type SignalType = 'buy' | 'sell' | 'hold';
export type StrategyType = 'scalping' | 'day_trading' | 'swing' | 'position';
export type PerformancePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time';

/**
 * Social Traders
 *
 * Public trader profiles
 */
export const socialTraders = pgTable('social_traders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  userId: uuid('user_id').notNull().references(() => users.id).unique(),

  // Profile
  displayName: varchar('display_name', { length: 100 }).notNull(),
  bio: text('bio'),
  avatar: varchar('avatar', { length: 500 }),
  country: varchar('country', { length: 2 }),

  // Trading info
  tradingSince: timestamp('trading_since').notNull(),
  specialties: text('specialties').array(), // ['forex', 'crypto', 'stocks']
  strategyType: strategyTypeEnum('strategy_type'),

  // Visibility
  isPublic: boolean('is_public').default(true).notNull(),
  allowCopying: boolean('allow_copying').default(true).notNull(),
  maxCopiers: integer('max_copiers').default(100),
  currentCopiers: integer('current_copiers').default(0),

  // Subscription
  isVerified: boolean('is_verified').default(false),
  isPremium: boolean('is_premium').default(false),
  subscriptionFee: decimal('subscription_fee', { precision: 10, scale: 2 }), // Monthly fee to copy

  // Stats
  totalFollowers: integer('total_followers').default(0),
  totalTrades: integer('total_trades').default(0),
  winRate: decimal('win_rate', { precision: 5, scale: 2 }).default('0'),

  // Status
  status: traderStatusEnum('status').notNull().default('active'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Social Followers
 *
 * Follow relationships
 */
export const socialFollowers = pgTable('social_followers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  followerId: uuid('follower_id').notNull().references(() => users.id),
  followedTraderId: uuid('followed_trader_id').notNull().references(() => socialTraders.id),

  // Notifications
  notificationsEnabled: boolean('notifications_enabled').default(true),

  // Timestamps
  followedAt: timestamp('followed_at').defaultNow().notNull(),
});

/**
 * Social Posts
 *
 * Social feed posts
 */
export const socialPosts = pgTable('social_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  traderId: uuid('trader_id').notNull().references(() => socialTraders.id),

  // Content
  postType: postTypeEnum('post_type').notNull(),
  title: varchar('title', { length: 200 }),
  content: text('content').notNull(),
  attachments: jsonb('attachments').default([]), // Images, charts

  // Engagement
  likes: integer('likes').default(0),
  comments: integer('comments').default(0),
  shares: integer('shares').default(0),

  // Visibility
  isPublic: boolean('is_public').default(true),
  isPinned: boolean('is_pinned').default(false),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Social Copy Settings
 *
 * Copy trading configuration
 */
export const socialCopySettings = pgTable('social_copy_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  copierId: uuid('copier_id').notNull().references(() => users.id),
  traderId: uuid('trader_id').notNull().references(() => socialTraders.id),

  // Copy parameters
  isActive: boolean('is_active').default(true),
  copyRatio: decimal('copy_ratio', { precision: 5, scale: 2 }).default('1.0'), // 1.0 = 100%, 0.5 = 50%
  maxAmountPerTrade: decimal('max_amount_per_trade', { precision: 15, scale: 2 }),
  maxDailyLoss: decimal('max_daily_loss', { precision: 15, scale: 2 }),

  // Filters
  copiedPairs: text('copied_pairs').array(), // ['BTC/USDT', 'ETH/USDT']
  excludedPairs: text('excluded_pairs').array(),
  minTradeAmount: decimal('min_trade_amount', { precision: 15, scale: 2 }),
  maxTradeAmount: decimal('max_trade_amount', { precision: 15, scale: 2 }),

  // Stop loss
  stopLossPercentage: decimal('stop_loss_percentage', { precision: 5, scale: 2 }),
  takeProfitPercentage: decimal('take_profit_percentage', { precision: 5, scale: 2 }),

  // Stats
  totalCopiedTrades: integer('total_copied_trades').default(0),
  totalProfit: decimal('total_profit', { precision: 15, scale: 2 }).default('0'),

  // Timestamps
  startedAt: timestamp('started_at').defaultNow().notNull(),
  pausedAt: timestamp('paused_at'),
  stoppedAt: timestamp('stopped_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Social Copied Trades
 *
 * Trades copied from leaders
 */
export const socialCopiedTrades = pgTable('social_copied_trades', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  copySettingsId: uuid('copy_settings_id').notNull().references(() => socialCopySettings.id),

  // Original trade info
  originalTradeId: varchar('original_trade_id', { length: 255 }).notNull(),
  traderId: uuid('trader_id').notNull().references(() => socialTraders.id),
  copierId: uuid('copier_id').notNull().references(() => users.id),

  // Trade details
  symbol: varchar('symbol', { length: 20 }).notNull(),
  side: varchar('side', { length: 10 }).notNull(), // buy/sell
  amount: decimal('amount', { precision: 15, scale: 8 }).notNull(),
  entryPrice: decimal('entry_price', { precision: 15, scale: 8 }).notNull(),
  exitPrice: decimal('exit_price', { precision: 15, scale: 8 }),

  // Performance
  profit: decimal('profit', { precision: 15, scale: 8 }),
  profitPercentage: decimal('profit_percentage', { precision: 5, scale: 2 }),

  // Status
  status: varchar('status', { length: 20 }).notNull(), // open/closed

  // Timing
  copiedAt: timestamp('copied_at').defaultNow().notNull(),
  closedAt: timestamp('closed_at'),
});

/**
 * Social Leaderboard
 *
 * Trader rankings
 */
export const socialLeaderboard = pgTable('social_leaderboard', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  traderId: uuid('trader_id').notNull().references(() => socialTraders.id),

  // Period
  period: performancePeriodEnum('period').notNull(),

  // Rankings
  rank: integer('rank').notNull(),
  previousRank: integer('previous_rank'),

  // Metrics
  totalProfit: decimal('total_profit', { precision: 15, scale: 2 }).notNull(),
  roi: decimal('roi', { precision: 5, scale: 2 }).notNull(),
  winRate: decimal('win_rate', { precision: 5, scale: 2 }).notNull(),
  totalTrades: integer('total_trades').notNull(),

  // Score (composite)
  score: decimal('score', { precision: 10, scale: 2 }).notNull(),

  // Timestamps
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Social Strategies
 *
 * Shared trading strategies
 */
export const socialStrategies = pgTable('social_strategies', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  traderId: uuid('trader_id').notNull().references(() => socialTraders.id),

  // Strategy info
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description').notNull(),
  strategyType: strategyTypeEnum('strategy_type').notNull(),

  // Configuration
  config: jsonb('config').notNull(), // Strategy parameters
  backtestedData: jsonb('backtested_data'), // Backtest results

  // Performance
  totalUsers: integer('total_users').default(0),
  avgProfit: decimal('avg_profit', { precision: 5, scale: 2 }),
  rating: decimal('rating', { precision: 3, scale: 2 }).default('0'),

  // Pricing
  price: decimal('price', { precision: 10, scale: 2 }),
  isFree: boolean('is_free').default(false),

  // Visibility
  isPublic: boolean('is_public').default(true),
  isActive: boolean('is_active').default(true),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Social Signals
 *
 * Trading signals
 */
export const socialSignals = pgTable('social_signals', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  traderId: uuid('trader_id').notNull().references(() => socialTraders.id),

  // Signal details
  signalType: signalTypeEnum('signal_type').notNull(),
  symbol: varchar('symbol', { length: 20 }).notNull(),
  entryPrice: decimal('entry_price', { precision: 15, scale: 8 }).notNull(),
  stopLoss: decimal('stop_loss', { precision: 15, scale: 8 }),
  takeProfit: decimal('take_profit', { precision: 15, scale: 8 }),

  // Analysis
  reasoning: text('reasoning'),
  confidence: integer('confidence'), // 0-100

  // Performance tracking
  currentPrice: decimal('current_price', { precision: 15, scale: 8 }),
  profit: decimal('profit', { precision: 5, scale: 2 }),
  hitTarget: boolean('hit_target').default(false),
  hitStopLoss: boolean('hit_stop_loss').default(false),

  // Engagement
  views: integer('views').default(0),
  copiedBy: integer('copied_by').default(0),

  // Status
  isActive: boolean('is_active').default(true),
  closedAt: timestamp('closed_at'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Social Performance
 *
 * Detailed performance metrics
 */
export const socialPerformance = pgTable('social_performance', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  traderId: uuid('trader_id').notNull().references(() => socialTraders.id),

  // Period
  period: performancePeriodEnum('period').notNull(),
  date: timestamp('date').notNull(),

  // P&L
  totalProfit: decimal('total_profit', { precision: 15, scale: 2 }).notNull(),
  totalLoss: decimal('total_loss', { precision: 15, scale: 2 }).notNull(),
  netProfit: decimal('net_profit', { precision: 15, scale: 2 }).notNull(),

  // Trade stats
  totalTrades: integer('total_trades').notNull(),
  winningTrades: integer('winning_trades').notNull(),
  losingTrades: integer('losing_trades').notNull(),
  winRate: decimal('win_rate', { precision: 5, scale: 2 }).notNull(),

  // Risk metrics
  sharpeRatio: decimal('sharpe_ratio', { precision: 5, scale: 2 }),
  sortinoRatio: decimal('sortino_ratio', { precision: 5, scale: 2 }),
  maxDrawdown: decimal('max_drawdown', { precision: 5, scale: 2 }),
  maxDrawdownDuration: integer('max_drawdown_duration'), // days

  // ROI
  roi: decimal('roi', { precision: 5, scale: 2 }).notNull(),
  annualizedRoi: decimal('annualized_roi', { precision: 5, scale: 2 }),

  // Average metrics
  avgWin: decimal('avg_win', { precision: 15, scale: 2 }),
  avgLoss: decimal('avg_loss', { precision: 15, scale: 2 }),
  profitFactor: decimal('profit_factor', { precision: 5, scale: 2 }),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Relations
 */
export const socialTradersRelations = relations(socialTraders, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [socialTraders.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [socialTraders.userId],
    references: [users.id],
  }),
  followers: many(socialFollowers),
  posts: many(socialPosts),
  signals: many(socialSignals),
  strategies: many(socialStrategies),
  performance: many(socialPerformance),
}));

export const socialFollowersRelations = relations(socialFollowers, ({ one }) => ({
  tenant: one(tenants, {
    fields: [socialFollowers.tenantId],
    references: [tenants.id],
  }),
  follower: one(users, {
    fields: [socialFollowers.followerId],
    references: [users.id],
  }),
  trader: one(socialTraders, {
    fields: [socialFollowers.followedTraderId],
    references: [socialTraders.id],
  }),
}));

export const socialPostsRelations = relations(socialPosts, ({ one }) => ({
  tenant: one(tenants, {
    fields: [socialPosts.tenantId],
    references: [tenants.id],
  }),
  trader: one(socialTraders, {
    fields: [socialPosts.traderId],
    references: [socialTraders.id],
  }),
}));

export const socialCopySettingsRelations = relations(socialCopySettings, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [socialCopySettings.tenantId],
    references: [tenants.id],
  }),
  copier: one(users, {
    fields: [socialCopySettings.copierId],
    references: [users.id],
  }),
  trader: one(socialTraders, {
    fields: [socialCopySettings.traderId],
    references: [socialTraders.id],
  }),
  copiedTrades: many(socialCopiedTrades),
}));
