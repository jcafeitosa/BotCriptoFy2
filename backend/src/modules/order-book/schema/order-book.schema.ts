/**
 * Order Book Schema
 * Advanced Order Book Analysis with TimescaleDB hypertables
 *
 * Features:
 * - Real-time order book snapshots (100ms-1s intervals)
 * - Liquidity heatmap data
 * - Order book imbalance tracking
 * - Large order detection (icebergs)
 * - Microstructure metrics (VPIN, toxicity)
 * - Multi-exchange aggregation
 */

import { pgTable, uuid, varchar, timestamp, numeric, bigint, jsonb, index, primaryKey, boolean, text } from 'drizzle-orm/pg-core';

/**
 * Order Book Snapshots (Hypertable)
 * Full order book snapshots at regular intervals
 * Partitioned by timestamp for time-series queries
 */
export const orderBookSnapshots = pgTable(
  'order_book_snapshots',
  {
    id: uuid('id').defaultRandom().notNull(),
    exchangeId: varchar('exchange_id', { length: 50 }).notNull(),
    symbol: varchar('symbol', { length: 20 }).notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),

    // Order book data
    bids: jsonb('bids').notNull(), // [[price, amount], ...] top 200 levels
    asks: jsonb('asks').notNull(), // [[price, amount], ...] top 200 levels
    nonce: bigint('nonce', { mode: 'number' }), // Exchange sequence number

    // Level 1 (top-of-book) - duplicated for fast queries
    bestBid: numeric('best_bid', { precision: 20, scale: 8 }),
    bestBidSize: numeric('best_bid_size', { precision: 20, scale: 8 }),
    bestAsk: numeric('best_ask', { precision: 20, scale: 8 }),
    bestAskSize: numeric('best_ask_size', { precision: 20, scale: 8 }),

    // Spread metrics
    spread: numeric('spread', { precision: 20, scale: 8 }),
    spreadPercent: numeric('spread_percent', { precision: 10, scale: 4 }),
    midPrice: numeric('mid_price', { precision: 20, scale: 8 }),

    // Depth metrics (pre-calculated)
    bidDepth10: numeric('bid_depth_10', { precision: 20, scale: 8 }), // USD value in top 10 levels
    askDepth10: numeric('ask_depth_10', { precision: 20, scale: 8 }),
    bidDepth50: numeric('bid_depth_50', { precision: 20, scale: 8 }), // USD value in top 50 levels
    askDepth50: numeric('ask_depth_50', { precision: 20, scale: 8 }),
    totalDepth: numeric('total_depth', { precision: 20, scale: 8 }),

    // Data quality
    bidLevels: bigint('bid_levels', { mode: 'number' }), // Number of bid levels
    askLevels: bigint('ask_levels', { mode: 'number' }), // Number of ask levels
    isComplete: boolean('is_complete').default(true), // All expected levels present?

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.timestamp, table.exchangeId, table.symbol] }),
    timestampIdx: index('order_book_snapshots_timestamp_idx').on(table.timestamp),
    symbolIdx: index('order_book_snapshots_symbol_idx').on(table.symbol),
    exchangeSymbolIdx: index('order_book_snapshots_exchange_symbol_idx').on(table.exchangeId, table.symbol),
  })
);

/**
 * Order Book Deltas (Hypertable)
 * Incremental changes to order book (more storage efficient)
 */
export const orderBookDeltas = pgTable(
  'order_book_deltas',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    exchangeId: varchar('exchange_id', { length: 50 }).notNull(),
    symbol: varchar('symbol', { length: 20 }).notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),

    // Delta data
    bidChanges: jsonb('bid_changes'), // [[price, amount], ...] changed levels
    askChanges: jsonb('ask_changes'), // [[price, amount], ...] changed levels
    nonce: bigint('nonce', { mode: 'number' }),

    // Change type
    changeType: varchar('change_type', { length: 20 }).notNull(), // add, update, remove

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    timestampIdx: index('order_book_deltas_timestamp_idx').on(table.timestamp),
    exchangeSymbolIdx: index('order_book_deltas_exchange_symbol_idx').on(table.exchangeId, table.symbol),
  })
);

/**
 * Order Book Level 1 (Hypertable)
 * Best bid/ask only - ultra-fast updates
 */
export const orderBookLevel1 = pgTable(
  'order_book_level1',
  {
    id: uuid('id').defaultRandom().notNull(),
    exchangeId: varchar('exchange_id', { length: 50 }).notNull(),
    symbol: varchar('symbol', { length: 20 }).notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),

    // Top-of-book
    bestBid: numeric('best_bid', { precision: 20, scale: 8 }).notNull(),
    bestBidSize: numeric('best_bid_size', { precision: 20, scale: 8 }).notNull(),
    bestAsk: numeric('best_ask', { precision: 20, scale: 8 }).notNull(),
    bestAskSize: numeric('best_ask_size', { precision: 20, scale: 8 }).notNull(),

    // Derived metrics
    spread: numeric('spread', { precision: 20, scale: 8 }),
    spreadPercent: numeric('spread_percent', { precision: 10, scale: 4 }),
    midPrice: numeric('mid_price', { precision: 20, scale: 8 }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.timestamp, table.exchangeId, table.symbol] }),
    timestampIdx: index('order_book_level1_timestamp_idx').on(table.timestamp),
    exchangeSymbolIdx: index('order_book_level1_exchange_symbol_idx').on(table.exchangeId, table.symbol),
  })
);

/**
 * Liquidity Heatmap Data (Hypertable)
 * Time-series data for liquidity heatmap visualization
 */
export const liquidityHeatmapData = pgTable(
  'liquidity_heatmap_data',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    exchangeId: varchar('exchange_id', { length: 50 }).notNull(),
    symbol: varchar('symbol', { length: 20 }).notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),

    // Price level
    priceLevel: numeric('price_level', { precision: 20, scale: 8 }).notNull(),

    // Liquidity metrics
    bidVolume: numeric('bid_volume', { precision: 20, scale: 8 }).default('0'),
    askVolume: numeric('ask_volume', { precision: 20, scale: 8 }).default('0'),
    totalVolume: numeric('total_volume', { precision: 20, scale: 8 }),

    // Intensity (for heatmap coloring)
    intensity: numeric('intensity', { precision: 10, scale: 4 }), // 0-100

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    timestampIdx: index('liquidity_heatmap_timestamp_idx').on(table.timestamp),
    exchangeSymbolIdx: index('liquidity_heatmap_exchange_symbol_idx').on(table.exchangeId, table.symbol),
    priceLevelIdx: index('liquidity_heatmap_price_level_idx').on(table.priceLevel),
  })
);

/**
 * Order Book Imbalance (Hypertable)
 * Real-time imbalance calculations at multiple levels
 */
export const orderBookImbalance = pgTable(
  'order_book_imbalance',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    exchangeId: varchar('exchange_id', { length: 50 }).notNull(),
    symbol: varchar('symbol', { length: 20 }).notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),

    // Imbalance at different depths
    imbalance5: numeric('imbalance_5', { precision: 10, scale: 4 }), // Top 5 levels: (bid-ask)/(bid+ask)
    imbalance10: numeric('imbalance_10', { precision: 10, scale: 4 }),
    imbalance20: numeric('imbalance_20', { precision: 10, scale: 4 }),
    imbalance50: numeric('imbalance_50', { precision: 10, scale: 4 }),

    // Volume imbalance (USD value)
    volumeImbalance: numeric('volume_imbalance', { precision: 20, scale: 8 }),

    // Pressure score (-100 to +100)
    pressureScore: numeric('pressure_score', { precision: 10, scale: 2 }),

    // Momentum (rate of change)
    imbalanceMomentum: numeric('imbalance_momentum', { precision: 10, scale: 4 }),

    // Cumulative imbalance (5-minute window)
    cumulativeImbalance: numeric('cumulative_imbalance', { precision: 10, scale: 4 }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    timestampIdx: index('order_book_imbalance_timestamp_idx').on(table.timestamp),
    exchangeSymbolIdx: index('order_book_imbalance_exchange_symbol_idx').on(table.exchangeId, table.symbol),
    pressureScoreIdx: index('order_book_imbalance_pressure_idx').on(table.pressureScore),
  })
);

/**
 * Liquidity Zones
 * Identified support/resistance zones based on liquidity clustering
 */
export const liquidityZones = pgTable(
  'liquidity_zones',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    exchangeId: varchar('exchange_id', { length: 50 }).notNull(),
    symbol: varchar('symbol', { length: 20 }).notNull(),

    // Zone definition
    priceLevel: numeric('price_level', { precision: 20, scale: 8 }).notNull(),
    priceRange: numeric('price_range', { precision: 20, scale: 8 }), // +/- range
    side: varchar('side', { length: 10 }).notNull(), // bid, ask, both

    // Liquidity metrics
    totalLiquidity: numeric('total_liquidity', { precision: 20, scale: 8 }).notNull(),
    averageSize: numeric('average_size', { precision: 20, scale: 8 }),
    orderCount: bigint('order_count', { mode: 'number' }),

    // Zone classification
    zoneType: varchar('zone_type', { length: 20 }).notNull(), // support, resistance, accumulation, distribution
    strength: numeric('strength', { precision: 10, scale: 4 }), // 0-100

    // Detection metadata
    detectedAt: timestamp('detected_at', { withTimezone: true }).notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull(),
    confidenceScore: numeric('confidence_score', { precision: 10, scale: 4 }),

    // Status
    isActive: boolean('is_active').default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    exchangeSymbolIdx: index('liquidity_zones_exchange_symbol_idx').on(table.exchangeId, table.symbol),
    priceLevelIdx: index('liquidity_zones_price_level_idx').on(table.priceLevel),
    zoneTypeIdx: index('liquidity_zones_type_idx').on(table.zoneType),
    isActiveIdx: index('liquidity_zones_active_idx').on(table.isActive),
  })
);

/**
 * Large Orders Detected
 * Iceberg orders and hidden liquidity detection
 */
export const largeOrdersDetected = pgTable(
  'large_orders_detected',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    exchangeId: varchar('exchange_id', { length: 50 }).notNull(),
    symbol: varchar('symbol', { length: 20 }).notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),

    // Order details
    side: varchar('side', { length: 10 }).notNull(), // bid, ask
    priceLevel: numeric('price_level', { precision: 20, scale: 8 }).notNull(),

    // Detection metrics
    visibleSize: numeric('visible_size', { precision: 20, scale: 8 }).notNull(),
    estimatedTotalSize: numeric('estimated_total_size', { precision: 20, scale: 8 }),
    icebergProbability: numeric('iceberg_probability', { precision: 10, scale: 4 }), // 0-100

    // Classification
    orderType: varchar('order_type', { length: 20 }).notNull(), // iceberg, whale, market_maker

    // Impact
    potentialImpact: numeric('potential_impact', { precision: 10, scale: 4 }), // % price impact if filled

    // Status
    status: varchar('status', { length: 20 }).default('active'), // active, partially_filled, filled, cancelled
    filledSize: numeric('filled_size', { precision: 20, scale: 8 }).default('0'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    timestampIdx: index('large_orders_timestamp_idx').on(table.timestamp),
    exchangeSymbolIdx: index('large_orders_exchange_symbol_idx').on(table.exchangeId, table.symbol),
    statusIdx: index('large_orders_status_idx').on(table.status),
  })
);

/**
 * Spoofing Events
 * Detected spoofing/layering attempts
 */
export const spoofingEvents = pgTable(
  'spoofing_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    exchangeId: varchar('exchange_id', { length: 50 }).notNull(),
    symbol: varchar('symbol', { length: 20 }).notNull(),
    detectedAt: timestamp('detected_at', { withTimezone: true }).notNull(),

    // Spoofing pattern
    side: varchar('side', { length: 10 }).notNull(),
    priceLevel: numeric('price_level', { precision: 20, scale: 8 }).notNull(),
    orderSize: numeric('order_size', { precision: 20, scale: 8 }),

    // Detection metrics
    spoofingType: varchar('spoofing_type', { length: 20 }).notNull(), // layering, quote_stuffing, wash_trading
    confidenceScore: numeric('confidence_score', { precision: 10, scale: 4 }), // 0-100

    // Pattern details
    orderLifetimeMs: bigint('order_lifetime_ms', { mode: 'number' }), // How long before cancel
    layerCount: bigint('layer_count', { mode: 'number' }), // Number of layers (if layering)

    // Impact
    marketImpact: numeric('market_impact', { precision: 10, scale: 4 }), // Price movement caused

    // Resolution
    resolved: boolean('resolved').default(false),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolution: text('resolution'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    detectedAtIdx: index('spoofing_events_detected_at_idx').on(table.detectedAt),
    exchangeSymbolIdx: index('spoofing_events_exchange_symbol_idx').on(table.exchangeId, table.symbol),
    spoofingTypeIdx: index('spoofing_events_type_idx').on(table.spoofingType),
  })
);

/**
 * Order Flow Toxicity (VPIN)
 * Volume-Synchronized Probability of Informed Trading
 */
export const orderFlowToxicity = pgTable(
  'order_flow_toxicity',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    exchangeId: varchar('exchange_id', { length: 50 }).notNull(),
    symbol: varchar('symbol', { length: 20 }).notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),

    // VPIN metric
    vpin: numeric('vpin', { precision: 10, scale: 4 }).notNull(), // 0-1

    // Components
    volumeBuckets: bigint('volume_buckets', { mode: 'number' }).notNull(),
    buyVolume: numeric('buy_volume', { precision: 20, scale: 8 }),
    sellVolume: numeric('sell_volume', { precision: 20, scale: 8 }),
    orderImbalance: numeric('order_imbalance', { precision: 20, scale: 8 }),

    // Toxicity classification
    toxicityLevel: varchar('toxicity_level', { length: 20 }), // low, medium, high, extreme

    // Moving averages
    vpinMA5: numeric('vpin_ma5', { precision: 10, scale: 4 }),
    vpinMA20: numeric('vpin_ma20', { precision: 10, scale: 4 }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    timestampIdx: index('order_flow_toxicity_timestamp_idx').on(table.timestamp),
    exchangeSymbolIdx: index('order_flow_toxicity_exchange_symbol_idx').on(table.exchangeId, table.symbol),
    toxicityLevelIdx: index('order_flow_toxicity_level_idx').on(table.toxicityLevel),
  })
);

/**
 * Price Impact Estimates
 * Pre-calculated price impact for different order sizes
 */
export const priceImpactEstimates = pgTable(
  'price_impact_estimates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    exchangeId: varchar('exchange_id', { length: 50 }).notNull(),
    symbol: varchar('symbol', { length: 20 }).notNull(),
    calculatedAt: timestamp('calculated_at', { withTimezone: true }).notNull(),

    // Order size tiers (USD value)
    size1k: numeric('impact_1k', { precision: 10, scale: 4 }), // $1,000 order impact %
    size5k: numeric('impact_5k', { precision: 10, scale: 4 }),
    size10k: numeric('impact_10k', { precision: 10, scale: 4 }),
    size50k: numeric('impact_50k', { precision: 10, scale: 4 }),
    size100k: numeric('impact_100k', { precision: 10, scale: 4 }),
    size500k: numeric('impact_500k', { precision: 10, scale: 4 }),
    size1m: numeric('impact_1m', { precision: 10, scale: 4 }), // $1M order impact %

    // Slippage estimates
    slippage1k: numeric('slippage_1k', { precision: 20, scale: 8 }),
    slippage10k: numeric('slippage_10k', { precision: 20, scale: 8 }),
    slippage100k: numeric('slippage_100k', { precision: 20, scale: 8 }),

    // Liquidity score at calculation time
    liquidityScore: numeric('liquidity_score', { precision: 10, scale: 4 }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    calculatedAtIdx: index('price_impact_calculated_at_idx').on(table.calculatedAt),
    exchangeSymbolIdx: index('price_impact_exchange_symbol_idx').on(table.exchangeId, table.symbol),
  })
);

/**
 * Liquidity Scores
 * Composite liquidity scoring over time
 */
export const liquidityScores = pgTable(
  'liquidity_scores',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    exchangeId: varchar('exchange_id', { length: 50 }).notNull(),
    symbol: varchar('symbol', { length: 20 }).notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),

    // Overall score (0-100)
    score: numeric('score', { precision: 10, scale: 4 }).notNull(),

    // Component scores
    depthScore: numeric('depth_score', { precision: 10, scale: 4 }),
    spreadScore: numeric('spread_score', { precision: 10, scale: 4 }),
    volumeScore: numeric('volume_score', { precision: 10, scale: 4 }),
    stabilityScore: numeric('stability_score', { precision: 10, scale: 4 }),

    // Liquidity regime
    regime: varchar('regime', { length: 20 }), // abundant, normal, scarce, crisis

    // Metadata
    bidDepth: numeric('bid_depth', { precision: 20, scale: 8 }),
    askDepth: numeric('ask_depth', { precision: 20, scale: 8 }),
    spread: numeric('spread', { precision: 20, scale: 8 }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    timestampIdx: index('liquidity_scores_timestamp_idx').on(table.timestamp),
    exchangeSymbolIdx: index('liquidity_scores_exchange_symbol_idx').on(table.exchangeId, table.symbol),
    regimeIdx: index('liquidity_scores_regime_idx').on(table.regime),
  })
);

/**
 * Microstructure Metrics
 * Aggregated microstructure metrics
 */
export const microstructureMetrics = pgTable(
  'microstructure_metrics',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    exchangeId: varchar('exchange_id', { length: 50 }).notNull(),
    symbol: varchar('symbol', { length: 20 }).notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    intervalMinutes: bigint('interval_minutes', { mode: 'number' }).notNull(), // 1, 5, 15, 60

    // Order flow metrics
    totalOrders: bigint('total_orders', { mode: 'number' }),
    totalCancels: bigint('total_cancels', { mode: 'number' }),
    cancelRate: numeric('cancel_rate', { precision: 10, scale: 4 }),

    // Liquidity metrics
    averageSpread: numeric('average_spread', { precision: 20, scale: 8 }),
    averageDepth: numeric('average_depth', { precision: 20, scale: 8 }),
    depthVolatility: numeric('depth_volatility', { precision: 10, scale: 4 }),

    // Price metrics
    priceVolatility: numeric('price_volatility', { precision: 10, scale: 4 }),
    returnVariance: numeric('return_variance', { precision: 20, scale: 8 }),

    // Noise metrics
    microstructureNoise: numeric('microstructure_noise', { precision: 10, scale: 4 }),
    effectiveSpread: numeric('effective_spread', { precision: 20, scale: 8 }),
    realizedSpread: numeric('realized_spread', { precision: 20, scale: 8 }),

    // Queue metrics
    averageQueuePosition: numeric('average_queue_position', { precision: 10, scale: 2 }),
    queueJumps: bigint('queue_jumps', { mode: 'number' }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    timestampIdx: index('microstructure_metrics_timestamp_idx').on(table.timestamp),
    exchangeSymbolIdx: index('microstructure_metrics_exchange_symbol_idx').on(table.exchangeId, table.symbol),
    intervalIdx: index('microstructure_metrics_interval_idx').on(table.intervalMinutes),
  })
);

/**
 * Order Book Subscriptions
 * Active WebSocket subscriptions management
 */
export const orderBookSubscriptions = pgTable(
  'order_book_subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),

    // Subscription details
    exchangeId: varchar('exchange_id', { length: 50 }).notNull(),
    symbol: varchar('symbol', { length: 20 }).notNull(),
    depth: bigint('depth', { mode: 'number' }).default(20), // Number of levels to stream

    // Stream settings
    updateIntervalMs: bigint('update_interval_ms', { mode: 'number' }).default(100), // 100ms, 1s, etc
    includeDelta: boolean('include_delta').default(false), // Stream deltas or full snapshots

    // Filters
    minPrice: numeric('min_price', { precision: 20, scale: 8 }),
    maxPrice: numeric('max_price', { precision: 20, scale: 8 }),
    minSize: numeric('min_size', { precision: 20, scale: 8 }),

    // Status
    status: varchar('status', { length: 20 }).default('active'), // active, paused, stopped
    connectionId: varchar('connection_id', { length: 100 }), // WebSocket connection ID

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  },
  (table) => ({
    userIdx: index('order_book_subscriptions_user_idx').on(table.userId),
    tenantIdx: index('order_book_subscriptions_tenant_idx').on(table.tenantId),
    exchangeSymbolIdx: index('order_book_subscriptions_exchange_symbol_idx').on(table.exchangeId, table.symbol),
    statusIdx: index('order_book_subscriptions_status_idx').on(table.status),
    connectionIdx: index('order_book_subscriptions_connection_idx').on(table.connectionId),
  })
);

/**
 * TimescaleDB SQL Migration Notes:
 *
 * -- Enable TimescaleDB extension
 * CREATE EXTENSION IF NOT EXISTS timescaledb;
 *
 * -- Convert to hypertables (run after schema creation)
 * SELECT create_hypertable('order_book_snapshots', 'timestamp', if_not_exists => TRUE, chunk_time_interval => INTERVAL '1 day');
 * SELECT create_hypertable('order_book_deltas', 'timestamp', if_not_exists => TRUE, chunk_time_interval => INTERVAL '1 day');
 * SELECT create_hypertable('order_book_level1', 'timestamp', if_not_exists => TRUE, chunk_time_interval => INTERVAL '6 hours');
 * SELECT create_hypertable('liquidity_heatmap_data', 'timestamp', if_not_exists => TRUE, chunk_time_interval => INTERVAL '1 day');
 * SELECT create_hypertable('order_book_imbalance', 'timestamp', if_not_exists => TRUE, chunk_time_interval => INTERVAL '6 hours');
 * SELECT create_hypertable('order_flow_toxicity', 'timestamp', if_not_exists => TRUE, chunk_time_interval => INTERVAL '1 day');
 * SELECT create_hypertable('liquidity_scores', 'timestamp', if_not_exists => TRUE, chunk_time_interval => INTERVAL '1 day');
 * SELECT create_hypertable('microstructure_metrics', 'timestamp', if_not_exists => TRUE, chunk_time_interval => INTERVAL '1 day');
 *
 * -- Create retention policies (keep snapshots for 30 days, level1 for 7 days)
 * SELECT add_retention_policy('order_book_snapshots', INTERVAL '30 days');
 * SELECT add_retention_policy('order_book_level1', INTERVAL '7 days');
 * SELECT add_retention_policy('liquidity_heatmap_data', INTERVAL '30 days');
 *
 * -- Create continuous aggregates for 1-minute order book imbalance
 * CREATE MATERIALIZED VIEW order_book_imbalance_1m
 * WITH (timescaledb.continuous) AS
 * SELECT
 *   time_bucket('1 minute', timestamp) AS bucket,
 *   exchange_id,
 *   symbol,
 *   AVG(imbalance_10) AS avg_imbalance_10,
 *   MAX(pressure_score) AS max_pressure,
 *   MIN(pressure_score) AS min_pressure,
 *   AVG(cumulative_imbalance) AS avg_cumulative_imbalance
 * FROM order_book_imbalance
 * GROUP BY bucket, exchange_id, symbol;
 *
 * -- Add refresh policy (refresh every 30 seconds)
 * SELECT add_continuous_aggregate_policy('order_book_imbalance_1m',
 *   start_offset => INTERVAL '2 hours',
 *   end_offset => INTERVAL '30 seconds',
 *   schedule_interval => INTERVAL '30 seconds');
 *
 * -- Create indexes for common queries
 * CREATE INDEX CONCURRENTLY idx_order_book_snapshots_recent
 *   ON order_book_snapshots(exchange_id, symbol, timestamp DESC);
 *
 * CREATE INDEX CONCURRENTLY idx_liquidity_zones_active
 *   ON liquidity_zones(exchange_id, symbol, is_active, strength DESC);
 */
