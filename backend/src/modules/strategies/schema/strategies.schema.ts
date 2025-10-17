/**
 * Strategies Schema
 * Database schema for trading strategies and signals
 */

import { pgTable, uuid, varchar, timestamp, numeric, boolean, text, jsonb, index } from 'drizzle-orm/pg-core';

/**
 * Trading Strategies
 * User-defined trading strategies
 */
export const tradingStrategies = pgTable(
  'trading_strategies',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),

    // Strategy identification
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    version: varchar('version', { length: 20 }).default('1.0.0'),

    // Target market
    exchangeId: varchar('exchange_id', { length: 50 }).notNull(),
    symbol: varchar('symbol', { length: 20 }).notNull(),
    timeframe: varchar('timeframe', { length: 10 }).notNull(), // 1m, 5m, 15m, 1h, 4h, 1d

    // Strategy configuration
    type: varchar('type', { length: 20 }).notNull(), // trend_following, mean_reversion, breakout, arbitrage, scalping
    indicators: jsonb('indicators').notNull(), // Array of indicator configs
    conditions: jsonb('conditions').notNull(), // Entry/exit conditions
    parameters: jsonb('parameters'), // Strategy parameters

    // Risk management
    stopLossPercent: numeric('stop_loss_percent', { precision: 10, scale: 4 }),
    takeProfitPercent: numeric('take_profit_percent', { precision: 10, scale: 4 }),
    trailingStopPercent: numeric('trailing_stop_percent', { precision: 10, scale: 4 }),
    maxPositionSize: numeric('max_position_size', { precision: 20, scale: 8 }),
    maxDrawdownPercent: numeric('max_drawdown_percent', { precision: 10, scale: 4 }),

    // Status
    status: varchar('status', { length: 20 }).notNull().default('draft'), // draft, active, paused, archived
    isPublic: boolean('is_public').default(false),

    // Performance tracking
    totalTrades: numeric('total_trades', { precision: 10, scale: 0 }).default('0'),
    winningTrades: numeric('winning_trades', { precision: 10, scale: 0 }).default('0'),
    losingTrades: numeric('losing_trades', { precision: 10, scale: 0 }).default('0'),
    totalPnl: numeric('total_pnl', { precision: 20, scale: 8 }).default('0'),
    winRate: numeric('win_rate', { precision: 10, scale: 4 }),
    profitFactor: numeric('profit_factor', { precision: 10, scale: 4 }),
    sharpeRatio: numeric('sharpe_ratio', { precision: 10, scale: 4 }),
    maxDrawdown: numeric('max_drawdown', { precision: 20, scale: 8 }),

    // Metadata
    tags: jsonb('tags'), // Array of tags
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  },
  (table) => ({
    userIdx: index('trading_strategies_user_idx').on(table.userId),
    tenantIdx: index('trading_strategies_tenant_idx').on(table.tenantId),
    symbolIdx: index('trading_strategies_symbol_idx').on(table.symbol),
    statusIdx: index('trading_strategies_status_idx').on(table.status),
    typeIdx: index('trading_strategies_type_idx').on(table.type),
  })
);

/**
 * Strategy Signals
 * Generated trading signals from strategies
 */
export const strategySignals = pgTable(
  'strategy_signals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    strategyId: uuid('strategy_id').notNull(), // FK to trading_strategies
    userId: uuid('user_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),

    // Signal details
    exchangeId: varchar('exchange_id', { length: 50 }).notNull(),
    symbol: varchar('symbol', { length: 20 }).notNull(),
    timeframe: varchar('timeframe', { length: 10 }).notNull(),

    // Signal type
    type: varchar('type', { length: 20 }).notNull(), // buy, sell, close_long, close_short
    strength: numeric('strength', { precision: 10, scale: 4 }), // Signal strength 0-100
    confidence: numeric('confidence', { precision: 10, scale: 4 }), // Confidence level 0-1

    // Price levels
    price: numeric('price', { precision: 20, scale: 8 }).notNull(),
    stopLoss: numeric('stop_loss', { precision: 20, scale: 8 }),
    takeProfit: numeric('take_profit', { precision: 20, scale: 8 }),

    // Indicator values at signal time
    indicatorValues: jsonb('indicator_values'), // Snapshot of indicator values

    // Execution
    status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, executed, cancelled, expired
    orderId: uuid('order_id'), // FK to trading_orders if executed
    executedPrice: numeric('executed_price', { precision: 20, scale: 8 }),
    executedAt: timestamp('executed_at', { withTimezone: true }),

    // Performance (if executed)
    pnl: numeric('pnl', { precision: 20, scale: 8 }),
    pnlPercent: numeric('pnl_percent', { precision: 10, scale: 4 }),

    // Metadata
    reason: text('reason'), // Why this signal was generated
    notes: text('notes'),
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (table) => ({
    strategyIdx: index('strategy_signals_strategy_idx').on(table.strategyId),
    userIdx: index('strategy_signals_user_idx').on(table.userId),
    symbolIdx: index('strategy_signals_symbol_idx').on(table.symbol),
    statusIdx: index('strategy_signals_status_idx').on(table.status),
    timestampIdx: index('strategy_signals_timestamp_idx').on(table.timestamp),
  })
);

/**
 * Strategy Backtests
 * Backtest results for strategies
 */
export const strategyBacktests = pgTable(
  'strategy_backtests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    strategyId: uuid('strategy_id').notNull(),
    userId: uuid('user_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),

    // Backtest configuration
    startDate: timestamp('start_date', { withTimezone: true }).notNull(),
    endDate: timestamp('end_date', { withTimezone: true }).notNull(),
    initialCapital: numeric('initial_capital', { precision: 20, scale: 8 }).notNull(),

    // Results
    finalCapital: numeric('final_capital', { precision: 20, scale: 8 }),
    totalReturn: numeric('total_return', { precision: 20, scale: 8 }),
    totalReturnPercent: numeric('total_return_percent', { precision: 10, scale: 4 }),

    // Trade statistics
    totalTrades: numeric('total_trades', { precision: 10, scale: 0 }),
    winningTrades: numeric('winning_trades', { precision: 10, scale: 0 }),
    losingTrades: numeric('losing_trades', { precision: 10, scale: 0 }),
    winRate: numeric('win_rate', { precision: 10, scale: 4 }),

    // Performance metrics
    profitFactor: numeric('profit_factor', { precision: 10, scale: 4 }),
    sharpeRatio: numeric('sharpe_ratio', { precision: 10, scale: 4 }),
    sortinoRatio: numeric('sortino_ratio', { precision: 10, scale: 4 }),
    maxDrawdown: numeric('max_drawdown', { precision: 20, scale: 8 }),
    maxDrawdownPercent: numeric('max_drawdown_percent', { precision: 10, scale: 4 }),

    // Risk metrics
    averageWin: numeric('average_win', { precision: 20, scale: 8 }),
    averageLoss: numeric('average_loss', { precision: 20, scale: 8 }),
    largestWin: numeric('largest_win', { precision: 20, scale: 8 }),
    largestLoss: numeric('largest_loss', { precision: 20, scale: 8 }),

    // Detailed results
    trades: jsonb('trades'), // Array of individual trade results
    equityCurve: jsonb('equity_curve'), // Equity curve data points

    // Status
    status: varchar('status', { length: 20 }).notNull().default('running'), // running, completed, failed
    errorMessage: text('error_message'),

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => ({
    strategyIdx: index('strategy_backtests_strategy_idx').on(table.strategyId),
    userIdx: index('strategy_backtests_user_idx').on(table.userId),
    statusIdx: index('strategy_backtests_status_idx').on(table.status),
  })
);

/**
 * Indicator Presets
 * Pre-configured technical indicator settings
 */
export const indicatorPresets = pgTable(
  'indicator_presets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id'), // null = system preset
    tenantId: uuid('tenant_id'),

    // Preset details
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    indicatorType: varchar('indicator_type', { length: 50 }).notNull(), // rsi, macd, bollinger_bands, etc

    // Configuration
    parameters: jsonb('parameters').notNull(), // Indicator parameters

    // Usage
    isPublic: boolean('is_public').default(false),
    usageCount: numeric('usage_count', { precision: 10, scale: 0 }).default('0'),

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    typeIdx: index('indicator_presets_type_idx').on(table.indicatorType),
    userIdx: index('indicator_presets_user_idx').on(table.userId),
  })
);
