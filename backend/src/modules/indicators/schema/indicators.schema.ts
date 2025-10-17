/**
 * Indicators Schema
 * Database schema for technical indicators presets and cache
 *
 * @module indicators/schema
 */

import { pgTable, uuid, varchar, jsonb, boolean, timestamp, integer, index } from 'drizzle-orm/pg-core';

// ============================================================================
// INDICATOR PRESETS TABLE
// ============================================================================

/**
 * Indicator Presets
 * Pre-configured indicator settings that can be reused
 */
export const indicatorPresets = pgTable(
  'indicator_presets',
  {
    // Identity
    id: uuid('id').defaultRandom().primaryKey(),
    userId: varchar('user_id', { length: 255 }),
    tenantId: varchar('tenant_id', { length: 255 }),

    // Preset details
    name: varchar('name', { length: 255 }).notNull(),
    description: varchar('description', { length: 1000 }),
    category: varchar('category', { length: 50 }).notNull(), // momentum, trend, volatility, volume
    indicatorType: varchar('indicator_type', { length: 50 }).notNull(), // RSI, MACD, etc.

    // Configuration (stored as JSON)
    configuration: jsonb('configuration').notNull(), // BaseIndicatorConfig

    // Visibility
    isPublic: boolean('is_public').default(false).notNull(),

    // Usage tracking
    usageCount: integer('usage_count').default(0).notNull(),

    // Metadata
    tags: jsonb('tags'), // string[]

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => {
    return {
      // Indexes for fast queries
      userIdIdx: index('indicator_presets_user_id_idx').on(table.userId),
      tenantIdIdx: index('indicator_presets_tenant_id_idx').on(table.tenantId),
      categoryIdx: index('indicator_presets_category_idx').on(table.category),
      indicatorTypeIdx: index('indicator_presets_indicator_type_idx').on(table.indicatorType),
      isPublicIdx: index('indicator_presets_is_public_idx').on(table.isPublic),
      createdAtIdx: index('indicator_presets_created_at_idx').on(table.createdAt),
    };
  }
);

// ============================================================================
// INDICATOR CACHE TABLE
// ============================================================================

/**
 * Indicator Cache
 * Caches calculated indicator results to avoid expensive recalculations
 */
export const indicatorCache = pgTable(
  'indicator_cache',
  {
    // Identity
    id: uuid('id').defaultRandom().primaryKey(),

    // Market context
    exchangeId: varchar('exchange_id', { length: 255 }).notNull(),
    symbol: varchar('symbol', { length: 50 }).notNull(),
    timeframe: varchar('timeframe', { length: 10 }).notNull(), // 1m, 5m, 1h, etc.

    // Indicator details
    indicatorType: varchar('indicator_type', { length: 50 }).notNull(),
    configuration: jsonb('configuration').notNull(), // BaseIndicatorConfig

    // Result (stored as JSON)
    result: jsonb('result').notNull(), // IndicatorResult<any>

    // Cache management
    calculatedAt: timestamp('calculated_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    hits: integer('hits').default(0).notNull(), // Number of times cache was used

    // Metadata
    calculationTimeMs: integer('calculation_time_ms'), // Time taken to calculate
  },
  (table) => {
    return {
      // Composite index for lookups
      marketIndicatorIdx: index('indicator_cache_market_indicator_idx').on(
        table.exchangeId,
        table.symbol,
        table.timeframe,
        table.indicatorType
      ),
      // Index for cache cleanup
      expiresAtIdx: index('indicator_cache_expires_at_idx').on(table.expiresAt),
      // Index for statistics
      calculatedAtIdx: index('indicator_cache_calculated_at_idx').on(table.calculatedAt),
      indicatorTypeIdx: index('indicator_cache_indicator_type_idx').on(table.indicatorType),
    };
  }
);

// ============================================================================
// INDICATOR CALCULATION LOGS
// ============================================================================

/**
 * Indicator Calculation Logs
 * Tracks all indicator calculations for analytics and debugging
 */
export const indicatorCalculationLogs = pgTable(
  'indicator_calculation_logs',
  {
    // Identity
    id: uuid('id').defaultRandom().primaryKey(),

    // User context
    userId: varchar('user_id', { length: 255 }),
    tenantId: varchar('tenant_id', { length: 255 }),

    // Market context
    exchangeId: varchar('exchange_id', { length: 255 }).notNull(),
    symbol: varchar('symbol', { length: 50 }).notNull(),
    timeframe: varchar('timeframe', { length: 10 }).notNull(),

    // Indicator details
    indicatorType: varchar('indicator_type', { length: 50 }).notNull(),
    configuration: jsonb('configuration').notNull(),

    // Calculation details
    success: boolean('success').notNull(),
    errorMessage: varchar('error_message', { length: 1000 }),
    calculationTimeMs: integer('calculation_time_ms').notNull(),
    fromCache: boolean('from_cache').default(false).notNull(),

    // Timestamp
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => {
    return {
      // Indexes for analytics
      userIdIdx: index('indicator_logs_user_id_idx').on(table.userId),
      tenantIdIdx: index('indicator_logs_tenant_id_idx').on(table.tenantId),
      indicatorTypeIdx: index('indicator_logs_indicator_type_idx').on(table.indicatorType),
      successIdx: index('indicator_logs_success_idx').on(table.success),
      createdAtIdx: index('indicator_logs_created_at_idx').on(table.createdAt),
    };
  }
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type IndicatorPreset = typeof indicatorPresets.$inferSelect;
export type NewIndicatorPreset = typeof indicatorPresets.$inferInsert;

export type IndicatorCache = typeof indicatorCache.$inferSelect;
export type NewIndicatorCache = typeof indicatorCache.$inferInsert;

export type IndicatorCalculationLog = typeof indicatorCalculationLogs.$inferSelect;
export type NewIndicatorCalculationLog = typeof indicatorCalculationLogs.$inferInsert;
