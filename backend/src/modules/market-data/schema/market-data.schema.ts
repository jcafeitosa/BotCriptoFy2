/**
 * Market Data Schema
 * TimescaleDB hypertables for time-series market data
 */

import { pgTable, uuid, varchar, timestamp, numeric, bigint, jsonb, index, primaryKey } from 'drizzle-orm/pg-core';

/**
 * OHLCV Data (Hypertable)
 * Partitioned by timestamp for optimal time-series queries
 */
export const marketOHLCV = pgTable(
  'market_ohlcv',
  {
    id: uuid('id').defaultRandom().notNull(),
    exchangeId: varchar('exchange_id', { length: 50 }).notNull(),
    symbol: varchar('symbol', { length: 20 }).notNull(),
    timeframe: varchar('timeframe', { length: 10 }).notNull(), // 1m, 5m, 15m, 1h, 4h, 1d
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    open: numeric('open', { precision: 20, scale: 8 }).notNull(),
    high: numeric('high', { precision: 20, scale: 8 }).notNull(),
    low: numeric('low', { precision: 20, scale: 8 }).notNull(),
    close: numeric('close', { precision: 20, scale: 8 }).notNull(),
    volume: numeric('volume', { precision: 20, scale: 8 }).notNull(),
    quoteVolume: numeric('quote_volume', { precision: 20, scale: 8 }),
    trades: bigint('trades', { mode: 'number' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.timestamp, table.exchangeId, table.symbol, table.timeframe] }),
    timestampIdx: index('market_ohlcv_timestamp_idx').on(table.timestamp),
    symbolIdx: index('market_ohlcv_symbol_idx').on(table.symbol),
    exchangeSymbolIdx: index('market_ohlcv_exchange_symbol_idx').on(table.exchangeId, table.symbol),
    timeframeIdx: index('market_ohlcv_timeframe_idx').on(table.timeframe),
  })
);

/**
 * Market Trades (Hypertable)
 * Real-time trades data
 */
export const marketTrades = pgTable(
  'market_trades',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    exchangeId: varchar('exchange_id', { length: 50 }).notNull(),
    symbol: varchar('symbol', { length: 20 }).notNull(),
    tradeId: varchar('trade_id', { length: 100 }).notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    price: numeric('price', { precision: 20, scale: 8 }).notNull(),
    amount: numeric('amount', { precision: 20, scale: 8 }).notNull(),
    cost: numeric('cost', { precision: 20, scale: 8 }).notNull(),
    side: varchar('side', { length: 10 }).notNull(), // buy, sell
    takerOrMaker: varchar('taker_or_maker', { length: 10 }), // taker, maker
    fee: jsonb('fee'), // { cost: number, currency: string }
    info: jsonb('info'), // Raw exchange data
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    timestampIdx: index('market_trades_timestamp_idx').on(table.timestamp),
    symbolIdx: index('market_trades_symbol_idx').on(table.symbol),
    exchangeSymbolIdx: index('market_trades_exchange_symbol_idx').on(table.exchangeId, table.symbol),
    tradeIdIdx: index('market_trades_trade_id_idx').on(table.exchangeId, table.tradeId),
  })
);

/**
 * Order Book Snapshots
 * Periodic snapshots of order book depth
 */
export const marketOrderBookSnapshots = pgTable(
  'market_orderbook_snapshots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    exchangeId: varchar('exchange_id', { length: 50 }).notNull(),
    symbol: varchar('symbol', { length: 20 }).notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    bids: jsonb('bids').notNull(), // [[price, amount], ...]
    asks: jsonb('asks').notNull(), // [[price, amount], ...]
    nonce: bigint('nonce', { mode: 'number' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    timestampIdx: index('market_orderbook_timestamp_idx').on(table.timestamp),
    symbolIdx: index('market_orderbook_symbol_idx').on(table.symbol),
    exchangeSymbolIdx: index('market_orderbook_exchange_symbol_idx').on(table.exchangeId, table.symbol),
  })
);

/**
 * Market Tickers
 * Latest ticker/price data (frequently updated)
 */
export const marketTickers = pgTable(
  'market_tickers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    exchangeId: varchar('exchange_id', { length: 50 }).notNull(),
    symbol: varchar('symbol', { length: 20 }).notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    datetime: varchar('datetime', { length: 30 }),
    high: numeric('high', { precision: 20, scale: 8 }),
    low: numeric('low', { precision: 20, scale: 8 }),
    bid: numeric('bid', { precision: 20, scale: 8 }),
    bidVolume: numeric('bid_volume', { precision: 20, scale: 8 }),
    ask: numeric('ask', { precision: 20, scale: 8 }),
    askVolume: numeric('ask_volume', { precision: 20, scale: 8 }),
    vwap: numeric('vwap', { precision: 20, scale: 8 }),
    open: numeric('open', { precision: 20, scale: 8 }),
    close: numeric('close', { precision: 20, scale: 8 }),
    last: numeric('last', { precision: 20, scale: 8 }),
    previousClose: numeric('previous_close', { precision: 20, scale: 8 }),
    change: numeric('change', { precision: 20, scale: 8 }),
    percentage: numeric('percentage', { precision: 10, scale: 4 }),
    average: numeric('average', { precision: 20, scale: 8 }),
    baseVolume: numeric('base_volume', { precision: 20, scale: 8 }),
    quoteVolume: numeric('quote_volume', { precision: 20, scale: 8 }),
    info: jsonb('info'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    timestampIdx: index('market_tickers_timestamp_idx').on(table.timestamp),
    symbolIdx: index('market_tickers_symbol_idx').on(table.symbol),
    exchangeSymbolIdx: index('market_tickers_exchange_symbol_idx').on(table.exchangeId, table.symbol),
    exchangeSymbolUniqueIdx: index('market_tickers_exchange_symbol_unique').on(
      table.exchangeId,
      table.symbol
    ),
  })
);

/**
 * Market Data Subscriptions
 * Track active WebSocket subscriptions
 */
export const marketDataSubscriptions = pgTable(
  'market_data_subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    exchangeId: varchar('exchange_id', { length: 50 }).notNull(),
    symbol: varchar('symbol', { length: 20 }).notNull(),
    channel: varchar('channel', { length: 50 }).notNull(), // ticker, trades, orderbook, ohlcv
    params: jsonb('params'), // Additional params (e.g., timeframe for OHLCV)
    status: varchar('status', { length: 20 }).notNull().default('active'), // active, paused, stopped
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('market_subscriptions_user_idx').on(table.userId),
    tenantIdx: index('market_subscriptions_tenant_idx').on(table.tenantId),
    statusIdx: index('market_subscriptions_status_idx').on(table.status),
    exchangeSymbolChannelIdx: index('market_subscriptions_exchange_symbol_channel_idx').on(
      table.exchangeId,
      table.symbol,
      table.channel
    ),
  })
);

/**
 * Market Data Sync Status
 * Track data collection progress for each exchange/symbol
 */
export const marketDataSyncStatus = pgTable(
  'market_data_sync_status',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    exchangeId: varchar('exchange_id', { length: 50 }).notNull(),
    symbol: varchar('symbol', { length: 20 }).notNull(),
    timeframe: varchar('timeframe', { length: 10 }).notNull(),
    lastSyncedTimestamp: timestamp('last_synced_timestamp', { withTimezone: true }),
    lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
    totalCandles: bigint('total_candles', { mode: 'number' }).default(0),
    syncStatus: varchar('sync_status', { length: 20 }).notNull().default('pending'), // pending, syncing, completed, error
    errorMessage: varchar('error_message', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    exchangeSymbolTimeframeIdx: index('market_sync_exchange_symbol_timeframe_idx').on(
      table.exchangeId,
      table.symbol,
      table.timeframe
    ),
    statusIdx: index('market_sync_status_idx').on(table.syncStatus),
  })
);

/**
 * TimescaleDB Continuous Aggregates (Created via SQL migrations)
 *
 * These are materialized views that automatically aggregate data:
 *
 * 1. market_ohlcv_1h (from 1m data)
 * 2. market_ohlcv_4h (from 1h data)
 * 3. market_ohlcv_1d (from 1h data)
 * 4. market_volume_stats (hourly volume aggregation)
 * 5. market_price_stats (price statistics by hour)
 */

/**
 * SQL Migration for TimescaleDB Hypertables:
 *
 * -- Enable TimescaleDB extension
 * CREATE EXTENSION IF NOT EXISTS timescaledb;
 *
 * -- Convert to hypertables (run after schema creation)
 * SELECT create_hypertable('market_ohlcv', 'timestamp', if_not_exists => TRUE);
 * SELECT create_hypertable('market_trades', 'timestamp', if_not_exists => TRUE);
 * SELECT create_hypertable('market_orderbook_snapshots', 'timestamp', if_not_exists => TRUE);
 *
 * -- Create continuous aggregates for 1h OHLCV from 1m data
 * CREATE MATERIALIZED VIEW market_ohlcv_1h
 * WITH (timescaledb.continuous) AS
 * SELECT
 *   time_bucket('1 hour', timestamp) AS bucket,
 *   exchange_id,
 *   symbol,
 *   FIRST(open, timestamp) AS open,
 *   MAX(high) AS high,
 *   MIN(low) AS low,
 *   LAST(close, timestamp) AS close,
 *   SUM(volume) AS volume,
 *   SUM(quote_volume) AS quote_volume,
 *   SUM(trades) AS trades
 * FROM market_ohlcv
 * WHERE timeframe = '1m'
 * GROUP BY bucket, exchange_id, symbol;
 *
 * -- Add refresh policy (refresh every 5 minutes)
 * SELECT add_continuous_aggregate_policy('market_ohlcv_1h',
 *   start_offset => INTERVAL '2 hours',
 *   end_offset => INTERVAL '5 minutes',
 *   schedule_interval => INTERVAL '5 minutes');
 *
 * -- Create retention policy (keep raw 1m data for 30 days)
 * SELECT add_retention_policy('market_ohlcv', INTERVAL '30 days');
 */
