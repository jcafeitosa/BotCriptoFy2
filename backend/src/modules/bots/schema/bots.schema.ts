/**
 * Bots Module Schema
 * Database schema for automated trading bot management and execution
 */

import { pgTable, uuid, varchar, timestamp, numeric, boolean, text, jsonb, index } from 'drizzle-orm/pg-core';

/**
 * Bots
 * Main trading bot configurations
 */
export const bots = pgTable(
  'bots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),

    // Basic Information
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    type: varchar('type', { length: 50 }).notNull(), // grid, dca, scalping, arbitrage, market_making, trend_following, mean_reversion
    status: varchar('status', { length: 20 }).notNull().default('stopped'), // stopped, running, paused, error

    // Strategy Configuration
    strategyId: uuid('strategy_id'), // FK to strategies table (optional - can use template)
    templateId: uuid('template_id'), // FK to bot_templates (optional)

    // Exchange & Market
    exchangeId: uuid('exchange_id').notNull(), // FK to exchanges
    symbol: varchar('symbol', { length: 50 }).notNull(), // BTC/USDT, ETH/USDT, etc.
    timeframe: varchar('timeframe', { length: 10 }).default('1h'), // 1m, 5m, 15m, 1h, 4h, 1d

    // Capital & Risk Management
    allocatedCapital: numeric('allocated_capital', { precision: 20, scale: 8 }).notNull(), // Capital allocated to this bot
    currentCapital: numeric('current_capital', { precision: 20, scale: 8 }), // Current capital (updated in real-time)
    maxDrawdown: numeric('max_drawdown', { precision: 10, scale: 4 }).default('10.0'), // Max acceptable drawdown %
    stopLossPercent: numeric('stop_loss_percent', { precision: 10, scale: 4 }).default('2.0'),
    takeProfitPercent: numeric('take_profit_percent', { precision: 10, scale: 4 }).default('5.0'),

    // Position Management
    maxPositions: numeric('max_positions', { precision: 10, scale: 0 }).default('5'), // Max concurrent positions
    positionSizing: varchar('position_sizing', { length: 20 }).default('fixed'), // fixed, kelly, risk_parity
    positionSizePercent: numeric('position_size_percent', { precision: 10, scale: 4 }).default('20.0'), // % of capital per position

    // Order Configuration
    orderType: varchar('order_type', { length: 20 }).default('limit'), // market, limit, stop_limit
    useTrailingStop: boolean('use_trailing_stop').default(false),
    trailingStopPercent: numeric('trailing_stop_percent', { precision: 10, scale: 4 }).default('1.5'),

    // Grid Bot Specific (for grid type)
    gridLevels: numeric('grid_levels', { precision: 10, scale: 0 }), // Number of grid levels
    gridUpperPrice: numeric('grid_upper_price', { precision: 20, scale: 8 }), // Upper price bound
    gridLowerPrice: numeric('grid_lower_price', { precision: 20, scale: 8 }), // Lower price bound
    gridProfitPercent: numeric('grid_profit_percent', { precision: 10, scale: 4 }), // Profit per grid level

    // DCA Bot Specific (for dca type)
    dcaOrderCount: numeric('dca_order_count', { precision: 10, scale: 0 }), // Total DCA orders
    dcaOrderAmount: numeric('dca_order_amount', { precision: 20, scale: 8 }), // Amount per DCA order
    dcaStepPercent: numeric('dca_step_percent', { precision: 10, scale: 4 }), // Price drop % between orders
    dcaTakeProfitPercent: numeric('dca_take_profit_percent', { precision: 10, scale: 4 }), // Overall TP

    // Advanced Settings
    parameters: jsonb('parameters'), // Strategy-specific parameters (indicators, signals, etc.)
    riskLimits: jsonb('risk_limits'), // Custom risk limits for this bot
    notifications: jsonb('notifications'), // Notification settings (email, telegram, etc.)

    // Execution Settings
    runOnWeekends: boolean('run_on_weekends').default(true),
    runOnHolidays: boolean('run_on_holidays').default(true),
    startTime: varchar('start_time', { length: 5 }), // Daily start time (HH:MM)
    endTime: varchar('end_time', { length: 5 }), // Daily end time (HH:MM)
    maxDailyTrades: numeric('max_daily_trades', { precision: 10, scale: 0 }), // Max trades per day
    cooldownMinutes: numeric('cooldown_minutes', { precision: 10, scale: 0 }).default('5'), // Cooldown between trades

    // Performance Tracking
    totalTrades: numeric('total_trades', { precision: 10, scale: 0 }).default('0'),
    winningTrades: numeric('winning_trades', { precision: 10, scale: 0 }).default('0'),
    losingTrades: numeric('losing_trades', { precision: 10, scale: 0 }).default('0'),
    totalProfit: numeric('total_profit', { precision: 20, scale: 8 }).default('0'),
    totalLoss: numeric('total_loss', { precision: 20, scale: 8 }).default('0'),
    netProfit: numeric('net_profit', { precision: 20, scale: 8 }).default('0'), // totalProfit - totalLoss
    profitFactor: numeric('profit_factor', { precision: 10, scale: 4 }), // totalProfit / totalLoss
    winRate: numeric('win_rate', { precision: 10, scale: 4 }), // winningTrades / totalTrades * 100
    averageWin: numeric('average_win', { precision: 20, scale: 8 }),
    averageLoss: numeric('average_loss', { precision: 20, scale: 8 }),
    largestWin: numeric('largest_win', { precision: 20, scale: 8 }),
    largestLoss: numeric('largest_loss', { precision: 20, scale: 8 }),
    currentDrawdown: numeric('current_drawdown', { precision: 10, scale: 4 }).default('0'),
    maxDrawdownReached: numeric('max_drawdown_reached', { precision: 10, scale: 4 }).default('0'),
    sharpeRatio: numeric('sharpe_ratio', { precision: 10, scale: 4 }),
    sortinoRatio: numeric('sortino_ratio', { precision: 10, scale: 4 }),
    returnOnInvestment: numeric('return_on_investment', { precision: 10, scale: 4 }), // ROI %

    // Execution State
    lastExecutionId: uuid('last_execution_id'), // FK to bot_executions
    lastTradeAt: timestamp('last_trade_at', { withTimezone: true }),
    lastErrorAt: timestamp('last_error_at', { withTimezone: true }),
    lastErrorMessage: text('last_error_message'),
    consecutiveErrors: numeric('consecutive_errors', { precision: 10, scale: 0 }).default('0'),

    // Control Flags
    autoRestart: boolean('auto_restart').default(true), // Auto restart on error
    autoStopOnDrawdown: boolean('auto_stop_on_drawdown').default(true), // Stop if max drawdown reached
    autoStopOnLoss: boolean('auto_stop_on_loss').default(false), // Stop if daily loss limit reached
    enabled: boolean('enabled').default(true), // Master on/off switch

    // Metadata
    version: numeric('version', { precision: 10, scale: 0 }).default('1'), // Bot configuration version
    backtestId: uuid('backtest_id'), // FK to backtest results (optional)
    notes: text('notes'),
    tags: jsonb('tags'), // Array of tags for organization
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }), // When bot was last started
    stoppedAt: timestamp('stopped_at', { withTimezone: true }), // When bot was last stopped
  },
  (table) => ({
    userIdx: index('bots_user_idx').on(table.userId),
    tenantIdx: index('bots_tenant_idx').on(table.tenantId),
    statusIdx: index('bots_status_idx').on(table.status),
    exchangeIdx: index('bots_exchange_idx').on(table.exchangeId),
    symbolIdx: index('bots_symbol_idx').on(table.symbol),
    typeIdx: index('bots_type_idx').on(table.type),
    enabledIdx: index('bots_enabled_idx').on(table.enabled),
  })
);

/**
 * Bot Executions
 * Bot run sessions and history
 */
export const botExecutions = pgTable(
  'bot_executions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    botId: uuid('bot_id').notNull(), // FK to bots
    userId: uuid('user_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),

    // Execution Details
    executionNumber: numeric('execution_number', { precision: 10, scale: 0 }).notNull(), // Incremental execution counter
    status: varchar('status', { length: 20 }).notNull().default('running'), // running, completed, stopped, error

    // Capital & Performance
    startingCapital: numeric('starting_capital', { precision: 20, scale: 8 }).notNull(),
    endingCapital: numeric('ending_capital', { precision: 20, scale: 8 }),
    profitLoss: numeric('profit_loss', { precision: 20, scale: 8 }).default('0'),
    profitLossPercent: numeric('profit_loss_percent', { precision: 10, scale: 4 }).default('0'),

    // Trade Statistics
    tradesExecuted: numeric('trades_executed', { precision: 10, scale: 0 }).default('0'),
    tradesWon: numeric('trades_won', { precision: 10, scale: 0 }).default('0'),
    tradesLost: numeric('trades_lost', { precision: 10, scale: 0 }).default('0'),
    winRate: numeric('win_rate', { precision: 10, scale: 4 }),

    // Errors & Issues
    errorsEncountered: numeric('errors_encountered', { precision: 10, scale: 0 }).default('0'),
    warningsEncountered: numeric('warnings_encountered', { precision: 10, scale: 0 }).default('0'),
    lastError: text('last_error'),

    // Execution Context
    configuration: jsonb('configuration'), // Snapshot of bot config at execution start
    marketConditions: jsonb('market_conditions'), // Market state at execution start

    // Timing
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    durationSeconds: numeric('duration_seconds', { precision: 10, scale: 0 }),

    // Stop Reason
    stopReason: varchar('stop_reason', { length: 50 }), // manual, max_drawdown, daily_limit, error, scheduled
    stopDetails: text('stop_details'),

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    botIdx: index('bot_executions_bot_idx').on(table.botId),
    userIdx: index('bot_executions_user_idx').on(table.userId),
    statusIdx: index('bot_executions_status_idx').on(table.status),
    startedAtIdx: index('bot_executions_started_at_idx').on(table.startedAt),
  })
);

/**
 * Bot Trades
 * Individual trades executed by bots
 */
export const botTrades = pgTable(
  'bot_trades',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    botId: uuid('bot_id').notNull(), // FK to bots
    executionId: uuid('execution_id').notNull(), // FK to bot_executions
    userId: uuid('user_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),

    // Trade Identification
    orderId: uuid('order_id'), // FK to orders table
    positionId: uuid('position_id'), // FK to positions table (if applicable)
    exchangeOrderId: varchar('exchange_order_id', { length: 100 }), // Exchange's order ID

    // Trade Details
    symbol: varchar('symbol', { length: 50 }).notNull(),
    side: varchar('side', { length: 10 }).notNull(), // buy, sell
    type: varchar('type', { length: 20 }).notNull(), // market, limit, stop_limit

    // Execution Data
    quantity: numeric('quantity', { precision: 20, scale: 8 }).notNull(),
    entryPrice: numeric('entry_price', { precision: 20, scale: 8 }).notNull(),
    exitPrice: numeric('exit_price', { precision: 20, scale: 8 }),
    averagePrice: numeric('average_price', { precision: 20, scale: 8 }),

    // Stop Loss / Take Profit
    stopLoss: numeric('stop_loss', { precision: 20, scale: 8 }),
    takeProfit: numeric('take_profit', { precision: 20, scale: 8 }),
    trailingStop: numeric('trailing_stop', { precision: 20, scale: 8 }),

    // Trade Result
    status: varchar('status', { length: 20 }).notNull().default('open'), // open, closed, cancelled
    profitLoss: numeric('profit_loss', { precision: 20, scale: 8 }),
    profitLossPercent: numeric('profit_loss_percent', { precision: 10, scale: 4 }),
    fees: numeric('fees', { precision: 20, scale: 8 }).default('0'),
    netProfitLoss: numeric('net_profit_loss', { precision: 20, scale: 8 }), // P&L after fees

    // Grid/DCA Specific
    gridLevel: numeric('grid_level', { precision: 10, scale: 0 }), // Grid level (for grid bots)
    dcaLevel: numeric('dca_level', { precision: 10, scale: 0 }), // DCA level (for dca bots)

    // Signal & Strategy
    signalType: varchar('signal_type', { length: 50 }), // Entry signal that triggered trade
    signalStrength: numeric('signal_strength', { precision: 10, scale: 4 }), // Signal confidence (0-100)
    strategySnapshot: jsonb('strategy_snapshot'), // Strategy state at trade time

    // Timing
    openedAt: timestamp('opened_at', { withTimezone: true }).defaultNow().notNull(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    durationMinutes: numeric('duration_minutes', { precision: 10, scale: 0 }),

    // Close Reason
    closeReason: varchar('close_reason', { length: 50 }), // stop_loss, take_profit, trailing_stop, signal, manual, timeout
    closeDetails: text('close_details'),

    // Risk Metrics
    riskRewardRatio: numeric('risk_reward_ratio', { precision: 10, scale: 4 }),
    maxDrawdownPercent: numeric('max_drawdown_percent', { precision: 10, scale: 4 }),
    maxProfitPercent: numeric('max_profit_percent', { precision: 10, scale: 4 }),

    // Metadata
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    botIdx: index('bot_trades_bot_idx').on(table.botId),
    executionIdx: index('bot_trades_execution_idx').on(table.executionId),
    userIdx: index('bot_trades_user_idx').on(table.userId),
    statusIdx: index('bot_trades_status_idx').on(table.status),
    symbolIdx: index('bot_trades_symbol_idx').on(table.symbol),
    openedAtIdx: index('bot_trades_opened_at_idx').on(table.openedAt),
  })
);

/**
 * Bot Logs
 * Detailed execution logs for debugging and monitoring
 */
export const botLogs = pgTable(
  'bot_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    botId: uuid('bot_id').notNull(), // FK to bots
    executionId: uuid('execution_id'), // FK to bot_executions (optional)
    userId: uuid('user_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),

    // Log Details
    level: varchar('level', { length: 20 }).notNull(), // debug, info, warn, error, critical
    category: varchar('category', { length: 50 }).notNull(), // execution, signal, order, position, risk, system
    message: text('message').notNull(),
    details: jsonb('details'), // Additional structured data

    // Context
    tradeId: uuid('trade_id'), // FK to bot_trades (if related to specific trade)
    orderId: uuid('order_id'), // FK to orders (if related to specific order)

    // Error Information (if level = error/critical)
    errorCode: varchar('error_code', { length: 50 }),
    errorStack: text('error_stack'),

    // Metadata
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    botIdx: index('bot_logs_bot_idx').on(table.botId),
    executionIdx: index('bot_logs_execution_idx').on(table.executionId),
    levelIdx: index('bot_logs_level_idx').on(table.level),
    categoryIdx: index('bot_logs_category_idx').on(table.category),
    timestampIdx: index('bot_logs_timestamp_idx').on(table.timestamp),
  })
);

/**
 * Bot Templates
 * Reusable bot configurations and presets
 */
export const botTemplates = pgTable(
  'bot_templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id'), // NULL = system template, UUID = user template
    tenantId: uuid('tenant_id'), // NULL = public template

    // Template Details
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    type: varchar('type', { length: 50 }).notNull(), // grid, dca, scalping, arbitrage, etc.
    category: varchar('category', { length: 50 }).default('general'), // beginner, intermediate, advanced, experimental

    // Visibility
    isPublic: boolean('is_public').default(false), // Public templates visible to all users
    isSystem: boolean('is_system').default(false), // System templates (curated by platform)
    isFeatured: boolean('is_featured').default(false), // Featured templates (promoted)

    // Configuration
    configuration: jsonb('configuration').notNull(), // Complete bot configuration
    requiredParameters: jsonb('required_parameters'), // Parameters that must be set by user
    defaultParameters: jsonb('default_parameters'), // Default parameter values

    // Performance (from backtests)
    backtestResults: jsonb('backtest_results'), // Historical backtest performance
    expectedReturn: numeric('expected_return', { precision: 10, scale: 4 }), // Expected annual return %
    expectedRisk: numeric('expected_risk', { precision: 10, scale: 4 }), // Expected max drawdown %
    minimumCapital: numeric('minimum_capital', { precision: 20, scale: 8 }), // Minimum recommended capital
    recommendedCapital: numeric('recommended_capital', { precision: 20, scale: 8 }), // Recommended capital

    // Compatibility
    supportedExchanges: jsonb('supported_exchanges'), // Array of supported exchange IDs
    supportedSymbols: jsonb('supported_symbols'), // Array of supported trading pairs
    supportedTimeframes: jsonb('supported_timeframes'), // Array of supported timeframes

    // Usage Statistics
    timesUsed: numeric('times_used', { precision: 10, scale: 0 }).default('0'),
    averageRating: numeric('average_rating', { precision: 10, scale: 2 }),
    totalRatings: numeric('total_ratings', { precision: 10, scale: 0 }).default('0'),

    // Documentation
    documentation: text('documentation'), // Markdown documentation
    setupInstructions: text('setup_instructions'), // Step-by-step setup guide
    riskWarning: text('risk_warning'), // Risk disclosure

    // Metadata
    version: varchar('version', { length: 20 }).default('1.0.0'),
    tags: jsonb('tags'), // Array of tags
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('bot_templates_user_idx').on(table.userId),
    typeIdx: index('bot_templates_type_idx').on(table.type),
    isPublicIdx: index('bot_templates_is_public_idx').on(table.isPublic),
    isSystemIdx: index('bot_templates_is_system_idx').on(table.isSystem),
    isFeaturedIdx: index('bot_templates_is_featured_idx').on(table.isFeatured),
  })
);
