/**
 * Positions Schema
 * Database schema for trading positions
 */

import { pgTable, uuid, varchar, timestamp, numeric, boolean, text, jsonb, index } from 'drizzle-orm/pg-core';

/**
 * Trading Positions
 * Tracks open and closed trading positions
 */
export const positions = pgTable(
  'positions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),

    // Position Details
    exchangeId: varchar('exchange_id', { length: 50 }).notNull(),
    symbol: varchar('symbol', { length: 20 }).notNull(),
    side: varchar('side', { length: 10 }).notNull(), // long, short
    type: varchar('type', { length: 20 }).notNull(), // spot, margin, futures, perpetual

    // Entry
    entryPrice: numeric('entry_price', { precision: 20, scale: 8 }).notNull(),
    currentPrice: numeric('current_price', { precision: 20, scale: 8 }).notNull(),
    quantity: numeric('quantity', { precision: 20, scale: 8 }).notNull(),
    remainingQuantity: numeric('remaining_quantity', { precision: 20, scale: 8 }).notNull(), // For partial closes

    // Leverage & Margin
    leverage: numeric('leverage', { precision: 10, scale: 2 }).default('1'), // 1x, 5x, 10x, etc
    marginType: varchar('margin_type', { length: 20 }).default('cross'), // cross, isolated
    marginUsed: numeric('margin_used', { precision: 20, scale: 8 }).default('0'),
    marginAvailable: numeric('margin_available', { precision: 20, scale: 8 }),
    marginLevel: numeric('margin_level', { precision: 10, scale: 4 }), // % (e.g., 150% = healthy, <120% = margin call)

    // P&L Tracking
    unrealizedPnl: numeric('unrealized_pnl', { precision: 20, scale: 8 }).default('0'),
    unrealizedPnlPercent: numeric('unrealized_pnl_percent', { precision: 10, scale: 4 }).default('0'),
    realizedPnl: numeric('realized_pnl', { precision: 20, scale: 8 }).default('0'),
    realizedPnlPercent: numeric('realized_pnl_percent', { precision: 10, scale: 4 }).default('0'),
    totalPnl: numeric('total_pnl', { precision: 20, scale: 8 }).default('0'), // unrealized + realized
    totalPnlPercent: numeric('total_pnl_percent', { precision: 10, scale: 4 }).default('0'),

    // Fees
    entryFee: numeric('entry_fee', { precision: 20, scale: 8 }).default('0'),
    exitFee: numeric('exit_fee', { precision: 20, scale: 8 }).default('0'),
    fundingFee: numeric('funding_fee', { precision: 20, scale: 8 }).default('0'), // For perpetuals
    totalFees: numeric('total_fees', { precision: 20, scale: 8 }).default('0'),

    // Risk Management
    stopLoss: numeric('stop_loss', { precision: 20, scale: 8 }),
    takeProfit: numeric('take_profit', { precision: 20, scale: 8 }),
    trailingStop: numeric('trailing_stop', { precision: 10, scale: 4 }), // Percentage
    trailingStopActivationPrice: numeric('trailing_stop_activation_price', { precision: 20, scale: 8 }),
    liquidationPrice: numeric('liquidation_price', { precision: 20, scale: 8 }),

    // Price Extremes (for analytics)
    highestPrice: numeric('highest_price', { precision: 20, scale: 8 }),
    lowestPrice: numeric('lowest_price', { precision: 20, scale: 8 }),
    maxUnrealizedPnl: numeric('max_unrealized_pnl', { precision: 20, scale: 8 }).default('0'),
    maxDrawdown: numeric('max_drawdown', { precision: 20, scale: 8 }).default('0'),

    // Status
    status: varchar('status', { length: 20 }).notNull().default('open'), // open, partial, closed, liquidated

    // Exit Details (when closed)
    exitPrice: numeric('exit_price', { precision: 20, scale: 8 }),
    exitReason: varchar('exit_reason', { length: 50 }), // manual, stop_loss, take_profit, trailing_stop, liquidation

    // Linking
    openOrderId: uuid('open_order_id'), // FK to trading_orders
    closeOrderIds: jsonb('close_order_ids'), // Array of close order IDs (for partial closes)
    strategyId: uuid('strategy_id'), // FK to trading_strategies
    botId: uuid('bot_id'), // FK to trading_bots
    signalId: uuid('signal_id'), // FK to strategy_signals

    // Metadata
    notes: text('notes'),
    tags: jsonb('tags'), // Array of tags for organization
    openedAt: timestamp('opened_at', { withTimezone: true }).defaultNow().notNull(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    lastUpdatedAt: timestamp('last_updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('positions_user_idx').on(table.userId),
    tenantIdx: index('positions_tenant_idx').on(table.tenantId),
    exchangeIdx: index('positions_exchange_idx').on(table.exchangeId),
    symbolIdx: index('positions_symbol_idx').on(table.symbol),
    statusIdx: index('positions_status_idx').on(table.status),
    strategyIdx: index('positions_strategy_idx').on(table.strategyId),
    botIdx: index('positions_bot_idx').on(table.botId),
    openedAtIdx: index('positions_opened_at_idx').on(table.openedAt),
  })
);

/**
 * Position History
 * Tracks position updates for analytics and audit
 */
export const positionHistory = pgTable(
  'position_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    positionId: uuid('position_id').notNull(), // FK to positions
    userId: uuid('user_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),

    // Snapshot
    action: varchar('action', { length: 50 }).notNull(), // open, update, partial_close, close, liquidate
    currentPrice: numeric('current_price', { precision: 20, scale: 8 }).notNull(),
    quantity: numeric('quantity', { precision: 20, scale: 8 }).notNull(),
    unrealizedPnl: numeric('unrealized_pnl', { precision: 20, scale: 8 }),
    realizedPnl: numeric('realized_pnl', { precision: 20, scale: 8 }),

    // Changes (optional)
    changes: jsonb('changes'), // What changed in this update

    // Metadata
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    positionIdx: index('position_history_position_idx').on(table.positionId),
    userIdx: index('position_history_user_idx').on(table.userId),
    timestampIdx: index('position_history_timestamp_idx').on(table.timestamp),
  })
);

/**
 * Position Alerts
 * Margin calls, liquidation warnings, etc.
 */
export const positionAlerts = pgTable(
  'position_alerts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    positionId: uuid('position_id').notNull(), // FK to positions
    userId: uuid('user_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),

    // Alert Details
    type: varchar('type', { length: 50 }).notNull(), // margin_call, liquidation_warning, stop_loss_hit, take_profit_hit
    severity: varchar('severity', { length: 20 }).notNull(), // info, warning, critical
    message: text('message').notNull(),

    // Context
    currentPrice: numeric('current_price', { precision: 20, scale: 8 }),
    marginLevel: numeric('margin_level', { precision: 10, scale: 4 }),
    unrealizedPnl: numeric('unrealized_pnl', { precision: 20, scale: 8 }),

    // Status
    acknowledged: boolean('acknowledged').default(false),
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    positionIdx: index('position_alerts_position_idx').on(table.positionId),
    userIdx: index('position_alerts_user_idx').on(table.userId),
    typeIdx: index('position_alerts_type_idx').on(table.type),
    acknowledgedIdx: index('position_alerts_acknowledged_idx').on(table.acknowledged),
    createdAtIdx: index('position_alerts_created_at_idx').on(table.createdAt),
  })
);

/**
 * User Position Summaries (Aggregated View)
 * Cached summary for quick dashboard display
 */
export const positionSummaries = pgTable(
  'position_summaries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().unique(),
    tenantId: uuid('tenant_id').notNull(),

    // Counts
    totalPositions: numeric('total_positions', { precision: 10, scale: 0 }).default('0'),
    openPositions: numeric('open_positions', { precision: 10, scale: 0 }).default('0'),
    closedPositions: numeric('closed_positions', { precision: 10, scale: 0 }).default('0'),

    // Performance
    totalUnrealizedPnl: numeric('total_unrealized_pnl', { precision: 20, scale: 8 }).default('0'),
    totalRealizedPnl: numeric('total_realized_pnl', { precision: 20, scale: 8 }).default('0'),
    totalPnl: numeric('total_pnl', { precision: 20, scale: 8 }).default('0'),
    totalFees: numeric('total_fees', { precision: 20, scale: 8 }).default('0'),

    // Risk
    totalMarginUsed: numeric('total_margin_used', { precision: 20, scale: 8 }).default('0'),
    averageMarginLevel: numeric('average_margin_level', { precision: 10, scale: 4 }),

    // Win Rate
    winningPositions: numeric('winning_positions', { precision: 10, scale: 0 }).default('0'),
    losingPositions: numeric('losing_positions', { precision: 10, scale: 0 }).default('0'),
    winRate: numeric('win_rate', { precision: 10, scale: 4 }),

    // Metadata
    lastUpdatedAt: timestamp('last_updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('position_summaries_user_idx').on(table.userId),
    tenantIdx: index('position_summaries_tenant_idx').on(table.tenantId),
  })
);
