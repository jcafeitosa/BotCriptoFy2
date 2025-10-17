/**
 * Orders Schema
 * Database schema for trading orders and positions
 */

import { pgTable, uuid, varchar, timestamp, numeric, boolean, text, index, jsonb } from 'drizzle-orm/pg-core';

/**
 * Trading Orders
 * Tracks all trading orders placed by users
 */
export const tradingOrders = pgTable(
  'trading_orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    exchangeConnectionId: uuid('exchange_connection_id').notNull(), // FK to exchange_connections
    exchangeId: varchar('exchange_id', { length: 50 }).notNull(),
    symbol: varchar('symbol', { length: 20 }).notNull(),

    // Order identification
    clientOrderId: varchar('client_order_id', { length: 100 }).notNull(), // Our internal ID
    exchangeOrderId: varchar('exchange_order_id', { length: 100 }), // Exchange's ID (after submission)

    // Order type and parameters
    type: varchar('type', { length: 20 }).notNull(), // market, limit, stop_loss, stop_loss_limit, take_profit, take_profit_limit, trailing_stop, trailing_stop_limit
    side: varchar('side', { length: 10 }).notNull(), // buy, sell
    timeInForce: varchar('time_in_force', { length: 20 }).default('GTC'), // GTC, IOC, FOK, PO

    // Price and quantity
    price: numeric('price', { precision: 20, scale: 8 }), // Limit price (null for market orders)
    stopPrice: numeric('stop_price', { precision: 20, scale: 8 }), // Stop price for stop orders
    amount: numeric('amount', { precision: 20, scale: 8 }).notNull(), // Order amount
    filled: numeric('filled', { precision: 20, scale: 8 }).default('0').notNull(), // Filled amount
    remaining: numeric('remaining', { precision: 20, scale: 8 }).notNull(), // Remaining amount
    cost: numeric('cost', { precision: 20, scale: 8 }).default('0'), // Total cost (filled * average price)
    average: numeric('average', { precision: 20, scale: 8 }), // Average fill price

    // Trailing stop parameters
    trailingDelta: numeric('trailing_delta', { precision: 20, scale: 8 }), // Trailing delta
    trailingPercent: numeric('trailing_percent', { precision: 10, scale: 4 }), // Trailing percent

    // Status tracking
    status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, open, partially_filled, filled, canceled, rejected, expired
    lastTradeTimestamp: timestamp('last_trade_timestamp', { withTimezone: true }),

    // Fee information
    fee: jsonb('fee'), // { cost: number, currency: string, rate: number }
    fees: jsonb('fees'), // Array of fees if multiple

    // Metadata
    reduceOnly: boolean('reduce_only').default(false), // Reduce-only flag (for futures)
    postOnly: boolean('post_only').default(false), // Post-only flag (maker-only)
    strategy: varchar('strategy', { length: 100 }), // Associated strategy name
    notes: text('notes'),
    info: jsonb('info'), // Raw exchange response

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    filledAt: timestamp('filled_at', { withTimezone: true }),
    canceledAt: timestamp('canceled_at', { withTimezone: true }),
  },
  (table) => ({
    userIdx: index('trading_orders_user_idx').on(table.userId),
    tenantIdx: index('trading_orders_tenant_idx').on(table.tenantId),
    exchangeConnectionIdx: index('trading_orders_exchange_connection_idx').on(table.exchangeConnectionId),
    symbolIdx: index('trading_orders_symbol_idx').on(table.symbol),
    statusIdx: index('trading_orders_status_idx').on(table.status),
    clientOrderIdIdx: index('trading_orders_client_order_id_idx').on(table.clientOrderId),
    exchangeOrderIdIdx: index('trading_orders_exchange_order_id_idx').on(table.exchangeOrderId),
    createdAtIdx: index('trading_orders_created_at_idx').on(table.createdAt),
  })
);

/**
 * Order Fills/Trades
 * Individual fills/trades for each order
 */
export const orderFills = pgTable(
  'order_fills',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id').notNull(), // FK to trading_orders
    userId: uuid('user_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    exchangeId: varchar('exchange_id', { length: 50 }).notNull(),
    symbol: varchar('symbol', { length: 20 }).notNull(),

    // Trade identification
    tradeId: varchar('trade_id', { length: 100 }).notNull(), // Exchange trade ID
    exchangeOrderId: varchar('exchange_order_id', { length: 100 }),

    // Trade details
    price: numeric('price', { precision: 20, scale: 8 }).notNull(),
    amount: numeric('amount', { precision: 20, scale: 8 }).notNull(),
    cost: numeric('cost', { precision: 20, scale: 8 }).notNull(),
    side: varchar('side', { length: 10 }).notNull(), // buy, sell
    takerOrMaker: varchar('taker_or_maker', { length: 10 }), // taker, maker

    // Fee information
    fee: jsonb('fee'), // { cost: number, currency: string, rate: number }

    // Metadata
    info: jsonb('info'), // Raw exchange data
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    orderIdx: index('order_fills_order_idx').on(table.orderId),
    userIdx: index('order_fills_user_idx').on(table.userId),
    tenantIdx: index('order_fills_tenant_idx').on(table.tenantId),
    symbolIdx: index('order_fills_symbol_idx').on(table.symbol),
    timestampIdx: index('order_fills_timestamp_idx').on(table.timestamp),
  })
);

/**
 * Trading Positions
 * Open positions (for futures/margin trading)
 */
export const tradingPositions = pgTable(
  'trading_positions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    exchangeConnectionId: uuid('exchange_connection_id').notNull(),
    exchangeId: varchar('exchange_id', { length: 50 }).notNull(),
    symbol: varchar('symbol', { length: 20 }).notNull(),

    // Position details
    side: varchar('side', { length: 10 }).notNull(), // long, short
    contracts: numeric('contracts', { precision: 20, scale: 8 }).notNull(), // Number of contracts
    contractSize: numeric('contract_size', { precision: 20, scale: 8 }), // Contract size (for futures)
    leverage: numeric('leverage', { precision: 10, scale: 2 }), // Leverage used
    collateral: numeric('collateral', { precision: 20, scale: 8 }), // Collateral amount

    // Entry details
    entryPrice: numeric('entry_price', { precision: 20, scale: 8 }).notNull(),
    entryTimestamp: timestamp('entry_timestamp', { withTimezone: true }).notNull(),

    // Current state
    markPrice: numeric('mark_price', { precision: 20, scale: 8 }), // Current mark price
    liquidationPrice: numeric('liquidation_price', { precision: 20, scale: 8 }), // Liquidation price
    unrealizedPnl: numeric('unrealized_pnl', { precision: 20, scale: 8 }), // Unrealized P&L
    realizedPnl: numeric('realized_pnl', { precision: 20, scale: 8 }).default('0'), // Realized P&L
    percentage: numeric('percentage', { precision: 10, scale: 4 }), // P&L percentage

    // Stop loss and take profit
    stopLoss: numeric('stop_loss', { precision: 20, scale: 8 }),
    takeProfit: numeric('take_profit', { precision: 20, scale: 8 }),

    // Margin details
    maintenanceMargin: numeric('maintenance_margin', { precision: 20, scale: 8 }),
    maintenanceMarginPercentage: numeric('maintenance_margin_percentage', { precision: 10, scale: 4 }),
    initialMargin: numeric('initial_margin', { precision: 20, scale: 8 }),
    initialMarginPercentage: numeric('initial_margin_percentage', { precision: 10, scale: 4 }),

    // Status
    status: varchar('status', { length: 20 }).notNull().default('open'), // open, closed, liquidated
    strategy: varchar('strategy', { length: 100 }), // Associated strategy

    // Metadata
    info: jsonb('info'), // Raw exchange data
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
  },
  (table) => ({
    userIdx: index('trading_positions_user_idx').on(table.userId),
    tenantIdx: index('trading_positions_tenant_idx').on(table.tenantId),
    exchangeConnectionIdx: index('trading_positions_exchange_connection_idx').on(table.exchangeConnectionId),
    symbolIdx: index('trading_positions_symbol_idx').on(table.symbol),
    statusIdx: index('trading_positions_status_idx').on(table.status),
  })
);

/**
 * Order History
 * Archive of canceled/filled/rejected orders for analytics
 */
export const orderHistory = pgTable(
  'order_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id').notNull(), // Original order ID
    userId: uuid('user_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    exchangeId: varchar('exchange_id', { length: 50 }).notNull(),
    symbol: varchar('symbol', { length: 20 }).notNull(),

    // Order snapshot
    type: varchar('type', { length: 20 }).notNull(),
    side: varchar('side', { length: 10 }).notNull(),
    price: numeric('price', { precision: 20, scale: 8 }),
    amount: numeric('amount', { precision: 20, scale: 8 }).notNull(),
    filled: numeric('filled', { precision: 20, scale: 8 }),
    cost: numeric('cost', { precision: 20, scale: 8 }),
    average: numeric('average', { precision: 20, scale: 8 }),
    status: varchar('status', { length: 20 }).notNull(),

    // Performance metrics
    pnl: numeric('pnl', { precision: 20, scale: 8 }), // Profit/Loss
    pnlPercentage: numeric('pnl_percentage', { precision: 10, scale: 4 }), // P&L percentage
    fees: numeric('fees', { precision: 20, scale: 8 }), // Total fees paid

    // Metadata
    strategy: varchar('strategy', { length: 100 }),
    info: jsonb('info'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    closedAt: timestamp('closed_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    userIdx: index('order_history_user_idx').on(table.userId),
    tenantIdx: index('order_history_tenant_idx').on(table.tenantId),
    symbolIdx: index('order_history_symbol_idx').on(table.symbol),
    closedAtIdx: index('order_history_closed_at_idx').on(table.closedAt),
  })
);

/**
 * Order Book (Internal)
 * Local order book for order matching (for internal exchange)
 */
export const internalOrderBook = pgTable(
  'internal_order_book',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    symbol: varchar('symbol', { length: 20 }).notNull(),
    side: varchar('side', { length: 10 }).notNull(), // buy, sell
    price: numeric('price', { precision: 20, scale: 8 }).notNull(),
    amount: numeric('amount', { precision: 20, scale: 8 }).notNull(),
    orderId: uuid('order_id').notNull(), // FK to trading_orders
    userId: uuid('user_id').notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    symbolIdx: index('internal_order_book_symbol_idx').on(table.symbol),
    sideIdx: index('internal_order_book_side_idx').on(table.side),
    priceIdx: index('internal_order_book_price_idx').on(table.price),
  })
);
