/**
 * Risk Management Schema
 * Database schema for portfolio risk management and monitoring
 */

import { pgTable, uuid, varchar, timestamp, numeric, boolean, text, jsonb, index } from 'drizzle-orm/pg-core';

/**
 * Risk Profiles
 * User-defined risk tolerance and preferences
 */
export const riskProfiles = pgTable(
  'risk_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().unique(), // One profile per user
    tenantId: uuid('tenant_id').notNull(),

    // Risk Tolerance
    riskTolerance: varchar('risk_tolerance', { length: 20 }).notNull().default('moderate'), // conservative, moderate, aggressive
    maxPortfolioRisk: numeric('max_portfolio_risk', { precision: 10, scale: 4 }).default('2.0'), // Max % risk per day (2% default)
    maxPositionRisk: numeric('max_position_risk', { precision: 10, scale: 4 }).default('1.0'), // Max % risk per position (1% default)
    maxDrawdown: numeric('max_drawdown', { precision: 10, scale: 4 }).default('10.0'), // Max acceptable drawdown (10% default)

    // Position Sizing
    defaultPositionSize: numeric('default_position_size', { precision: 10, scale: 4 }).default('2.0'), // Default position size as % of portfolio
    maxPositionSize: numeric('max_position_size', { precision: 10, scale: 4 }).default('5.0'), // Max position size (5% default)
    useKellyCriterion: boolean('use_kelly_criterion').default(false), // Use Kelly formula for position sizing
    kellyFraction: numeric('kelly_fraction', { precision: 10, scale: 4 }).default('0.25'), // Kelly fraction (0.25 = quarter Kelly)

    // Leverage & Margin
    maxLeverage: numeric('max_leverage', { precision: 10, scale: 2 }).default('3.0'), // Max leverage allowed (3x default)
    maxMarginUtilization: numeric('max_margin_utilization', { precision: 10, scale: 4 }).default('50.0'), // Max margin usage (50% default)

    // Exposure Limits
    maxTotalExposure: numeric('max_total_exposure', { precision: 10, scale: 4 }).default('100.0'), // Max total exposure as % of portfolio
    maxLongExposure: numeric('max_long_exposure', { precision: 10, scale: 4 }).default('80.0'), // Max long exposure
    maxShortExposure: numeric('max_short_exposure', { precision: 10, scale: 4 }).default('30.0'), // Max short exposure
    maxSingleAssetExposure: numeric('max_single_asset_exposure', { precision: 10, scale: 4 }).default('20.0'), // Max exposure to single asset

    // Correlation & Diversification
    maxCorrelatedExposure: numeric('max_correlated_exposure', { precision: 10, scale: 4 }).default('30.0'), // Max exposure to correlated assets
    minDiversification: numeric('min_diversification', { precision: 10, scale: 0 }).default('5'), // Min number of positions

    // Stop Loss Defaults
    defaultStopLoss: numeric('default_stop_loss', { precision: 10, scale: 4 }).default('2.0'), // Default SL % from entry
    useTrailingStop: boolean('use_trailing_stop').default(true),
    defaultTrailingStop: numeric('default_trailing_stop', { precision: 10, scale: 4 }).default('1.5'), // Default trailing stop %

    // Risk/Reward
    minRiskRewardRatio: numeric('min_risk_reward_ratio', { precision: 10, scale: 4 }).default('2.0'), // Min R:R ratio (1:2)

    // Alerts
    alertOnLimitViolation: boolean('alert_on_limit_violation').default(true),
    alertOnDrawdown: boolean('alert_on_drawdown').default(true),
    alertOnLargePosition: boolean('alert_on_large_position').default(true),

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('risk_profiles_user_idx').on(table.userId),
    tenantIdx: index('risk_profiles_tenant_idx').on(table.tenantId),
  })
);

/**
 * Risk Limits
 * Configurable risk limits and thresholds
 */
export const riskLimits = pgTable(
  'risk_limits',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    profileId: uuid('profile_id').notNull(), // FK to risk_profiles

    // Limit Details
    limitType: varchar('limit_type', { length: 50 }).notNull(), // daily_loss, position_size, leverage, exposure, etc.
    limitName: varchar('limit_name', { length: 100 }).notNull(),
    limitValue: numeric('limit_value', { precision: 20, scale: 8 }).notNull(),
    limitUnit: varchar('limit_unit', { length: 20 }).notNull(), // percentage, absolute, count

    // Scope
    scope: varchar('scope', { length: 20 }).notNull(), // portfolio, position, asset, strategy
    scopeId: varchar('scope_id', { length: 100 }), // Optional scope identifier (e.g., asset symbol, strategy ID)

    // Violation Handling
    hardLimit: boolean('hard_limit').default(false), // If true, block trades that violate
    alertOnViolation: boolean('alert_on_violation').default(true),
    violationAction: varchar('violation_action', { length: 50 }).default('alert'), // alert, block, reduce, close

    // Status
    enabled: boolean('enabled').default(true),
    currentValue: numeric('current_value', { precision: 20, scale: 8 }), // Current value for monitoring
    lastViolation: timestamp('last_violation', { withTimezone: true }),
    violationCount: numeric('violation_count', { precision: 10, scale: 0 }).default('0'),

    // Metadata
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('risk_limits_user_idx').on(table.userId),
    profileIdx: index('risk_limits_profile_idx').on(table.profileId),
    typeIdx: index('risk_limits_type_idx').on(table.limitType),
    enabledIdx: index('risk_limits_enabled_idx').on(table.enabled),
  })
);

/**
 * Risk Metrics
 * Real-time calculated risk metrics
 */
export const riskMetrics = pgTable(
  'risk_metrics',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),

    // Portfolio Value
    portfolioValue: numeric('portfolio_value', { precision: 20, scale: 8 }).notNull(),
    cashBalance: numeric('cash_balance', { precision: 20, scale: 8 }).notNull(),

    // Exposure Metrics
    totalExposure: numeric('total_exposure', { precision: 20, scale: 8 }).default('0'),
    longExposure: numeric('long_exposure', { precision: 20, scale: 8 }).default('0'),
    shortExposure: numeric('short_exposure', { precision: 20, scale: 8 }).default('0'),
    netExposure: numeric('net_exposure', { precision: 20, scale: 8 }).default('0'), // long - short
    grossExposure: numeric('gross_exposure', { precision: 20, scale: 8 }).default('0'), // long + short

    // Exposure as % of Portfolio
    totalExposurePercent: numeric('total_exposure_percent', { precision: 10, scale: 4 }).default('0'),
    longExposurePercent: numeric('long_exposure_percent', { precision: 10, scale: 4 }).default('0'),
    shortExposurePercent: numeric('short_exposure_percent', { precision: 10, scale: 4 }).default('0'),

    // Leverage & Margin
    currentLeverage: numeric('current_leverage', { precision: 10, scale: 2 }).default('1.0'),
    marginUsed: numeric('margin_used', { precision: 20, scale: 8 }).default('0'),
    marginAvailable: numeric('margin_available', { precision: 20, scale: 8 }).default('0'),
    marginUtilization: numeric('margin_utilization', { precision: 10, scale: 4 }).default('0'), // % of available margin used

    // Position Metrics
    openPositions: numeric('open_positions', { precision: 10, scale: 0 }).default('0'),
    largestPosition: numeric('largest_position', { precision: 20, scale: 8 }).default('0'),
    largestPositionPercent: numeric('largest_position_percent', { precision: 10, scale: 4 }).default('0'),

    // P&L Metrics
    unrealizedPnl: numeric('unrealized_pnl', { precision: 20, scale: 8 }).default('0'),
    realizedPnl: numeric('realized_pnl', { precision: 20, scale: 8 }).default('0'),
    totalPnl: numeric('total_pnl', { precision: 20, scale: 8 }).default('0'),

    // Drawdown
    currentDrawdown: numeric('current_drawdown', { precision: 10, scale: 4 }).default('0'), // % from peak
    maxDrawdown: numeric('max_drawdown', { precision: 10, scale: 4 }).default('0'),
    peakValue: numeric('peak_value', { precision: 20, scale: 8 }).default('0'),
    drawdownDuration: numeric('drawdown_duration', { precision: 10, scale: 0 }).default('0'), // Days in drawdown

    // Risk Metrics
    valueAtRisk: numeric('value_at_risk', { precision: 20, scale: 8 }), // VaR (95% confidence)
    expectedShortfall: numeric('expected_shortfall', { precision: 20, scale: 8 }), // CVaR/ES

    // Performance Metrics
    sharpeRatio: numeric('sharpe_ratio', { precision: 10, scale: 4 }),
    sortinoRatio: numeric('sortino_ratio', { precision: 10, scale: 4 }),
    calmarRatio: numeric('calmar_ratio', { precision: 10, scale: 4 }),

    // Volatility
    volatility: numeric('volatility', { precision: 10, scale: 4 }), // Annualized volatility %
    beta: numeric('beta', { precision: 10, scale: 4 }), // Portfolio beta vs benchmark

    // Diversification
    concentrationRisk: numeric('concentration_risk', { precision: 10, scale: 4 }), // Herfindahl index
    correlationAverage: numeric('correlation_average', { precision: 10, scale: 4 }), // Avg correlation between positions

    // Risk Score
    overallRiskScore: numeric('overall_risk_score', { precision: 10, scale: 2 }), // Composite risk score (0-100)
    riskLevel: varchar('risk_level', { length: 20 }).default('moderate'), // low, moderate, high, critical

    // Metadata
    calculatedAt: timestamp('calculated_at', { withTimezone: true }).defaultNow().notNull(),
    snapshotDate: timestamp('snapshot_date', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('risk_metrics_user_idx').on(table.userId),
    tenantIdx: index('risk_metrics_tenant_idx').on(table.tenantId),
    calculatedAtIdx: index('risk_metrics_calculated_at_idx').on(table.calculatedAt),
    snapshotIdx: index('risk_metrics_snapshot_idx').on(table.snapshotDate),
  })
);

/**
 * Risk Alerts
 * Risk limit violations and warnings
 */
export const riskAlerts = pgTable(
  'risk_alerts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    limitId: uuid('limit_id'), // FK to risk_limits (optional)

    // Alert Details
    alertType: varchar('alert_type', { length: 50 }).notNull(), // limit_violation, drawdown, large_position, high_leverage, etc.
    severity: varchar('severity', { length: 20 }).notNull(), // info, warning, critical
    title: varchar('title', { length: 200 }).notNull(),
    message: text('message').notNull(),

    // Context
    limitType: varchar('limit_type', { length: 50 }),
    limitValue: numeric('limit_value', { precision: 20, scale: 8 }),
    currentValue: numeric('current_value', { precision: 20, scale: 8 }),
    violationPercent: numeric('violation_percent', { precision: 10, scale: 4 }), // % over limit

    // Related Entities
    positionId: uuid('position_id'), // Related position if applicable
    strategyId: uuid('strategy_id'), // Related strategy if applicable
    assetSymbol: varchar('asset_symbol', { length: 20 }), // Related asset if applicable

    // Status
    acknowledged: boolean('acknowledged').default(false),
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
    resolved: boolean('resolved').default(false),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),

    // Actions Taken
    actionTaken: varchar('action_taken', { length: 50 }), // none, alert_sent, trade_blocked, position_reduced, position_closed
    actionDetails: jsonb('action_details'),

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('risk_alerts_user_idx').on(table.userId),
    tenantIdx: index('risk_alerts_tenant_idx').on(table.tenantId),
    typeIdx: index('risk_alerts_type_idx').on(table.alertType),
    severityIdx: index('risk_alerts_severity_idx').on(table.severity),
    acknowledgedIdx: index('risk_alerts_acknowledged_idx').on(table.acknowledged),
    createdAtIdx: index('risk_alerts_created_at_idx').on(table.createdAt),
  })
);
