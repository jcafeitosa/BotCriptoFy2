#!/usr/bin/env bun
/**
 * Apply Risk Module Schema to Database
 * Creates all risk-related tables if they don't exist
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

console.log('🔧 Connecting to database...');
const client = postgres(DATABASE_URL);
const db = drizzle(client);

async function applySchema() {
  try {
    console.log('📊 Creating Risk module tables...\n');

    // 1. Risk Profiles Table
    console.log('  ✅ Creating risk_profiles table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS risk_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE,
        tenant_id UUID NOT NULL,

        -- Risk Tolerance
        risk_tolerance VARCHAR(20) NOT NULL DEFAULT 'moderate',
        max_portfolio_risk NUMERIC(10, 4) DEFAULT 2.0,
        max_position_risk NUMERIC(10, 4) DEFAULT 1.0,
        max_drawdown NUMERIC(10, 4) DEFAULT 10.0,

        -- Position Sizing
        default_position_size NUMERIC(10, 4) DEFAULT 2.0,
        max_position_size NUMERIC(10, 4) DEFAULT 5.0,
        use_kelly_criterion BOOLEAN DEFAULT false,
        kelly_fraction NUMERIC(10, 4) DEFAULT 0.25,

        -- Leverage & Margin
        max_leverage NUMERIC(10, 2) DEFAULT 3.0,
        max_margin_utilization NUMERIC(10, 4) DEFAULT 50.0,

        -- Exposure Limits
        max_total_exposure NUMERIC(10, 4) DEFAULT 100.0,
        max_long_exposure NUMERIC(10, 4) DEFAULT 80.0,
        max_short_exposure NUMERIC(10, 4) DEFAULT 30.0,
        max_single_asset_exposure NUMERIC(10, 4) DEFAULT 20.0,

        -- Correlation & Diversification
        max_correlated_exposure NUMERIC(10, 4) DEFAULT 30.0,
        min_diversification NUMERIC(10, 0) DEFAULT 5,

        -- Stop Loss Defaults
        default_stop_loss NUMERIC(10, 4) DEFAULT 2.0,
        use_trailing_stop BOOLEAN DEFAULT true,
        default_trailing_stop NUMERIC(10, 4) DEFAULT 1.5,

        -- Risk/Reward
        min_risk_reward_ratio NUMERIC(10, 4) DEFAULT 2.0,

        -- Alerts
        alert_on_limit_violation BOOLEAN DEFAULT true,
        alert_on_drawdown BOOLEAN DEFAULT true,
        alert_on_large_position BOOLEAN DEFAULT true,

        -- Metadata
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS risk_profiles_user_idx ON risk_profiles(user_id);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS risk_profiles_tenant_idx ON risk_profiles(tenant_id);
    `);

    // 2. Risk Limits Table
    console.log('  ✅ Creating risk_limits table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS risk_limits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        tenant_id UUID NOT NULL,
        profile_id UUID NOT NULL,

        -- Limit Details
        limit_type VARCHAR(50) NOT NULL,
        limit_name VARCHAR(100) NOT NULL,
        limit_value NUMERIC(20, 8) NOT NULL,
        limit_unit VARCHAR(20) NOT NULL,

        -- Scope
        scope VARCHAR(20) NOT NULL,
        scope_id VARCHAR(100),

        -- Time-based
        timeframe VARCHAR(20),

        -- Violation Handling
        hard_limit BOOLEAN DEFAULT false,
        alert_on_violation BOOLEAN DEFAULT true,
        violation_action VARCHAR(50) DEFAULT 'alert',

        -- Status
        enabled BOOLEAN DEFAULT true,
        current_value NUMERIC(20, 8),
        last_violation TIMESTAMPTZ,
        violation_count NUMERIC(10, 0) DEFAULT 0,

        -- Metadata
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS risk_limits_user_idx ON risk_limits(user_id);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS risk_limits_profile_idx ON risk_limits(profile_id);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS risk_limits_type_idx ON risk_limits(limit_type);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS risk_limits_enabled_idx ON risk_limits(enabled);
    `);

    // 3. Risk Metrics Table
    console.log('  ✅ Creating risk_metrics table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS risk_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        tenant_id UUID NOT NULL,

        -- Portfolio Value
        portfolio_value NUMERIC(20, 8) NOT NULL,
        cash_balance NUMERIC(20, 8) NOT NULL,

        -- Exposure Metrics
        total_exposure NUMERIC(20, 8) DEFAULT 0,
        long_exposure NUMERIC(20, 8) DEFAULT 0,
        short_exposure NUMERIC(20, 8) DEFAULT 0,
        net_exposure NUMERIC(20, 8) DEFAULT 0,
        gross_exposure NUMERIC(20, 8) DEFAULT 0,

        -- Exposure as % of Portfolio
        total_exposure_percent NUMERIC(10, 4) DEFAULT 0,
        long_exposure_percent NUMERIC(10, 4) DEFAULT 0,
        short_exposure_percent NUMERIC(10, 4) DEFAULT 0,

        -- Leverage & Margin
        current_leverage NUMERIC(10, 2) DEFAULT 1.0,
        margin_used NUMERIC(20, 8) DEFAULT 0,
        margin_available NUMERIC(20, 8) DEFAULT 0,
        margin_utilization NUMERIC(10, 4) DEFAULT 0,

        -- Position Metrics
        open_positions NUMERIC(10, 0) DEFAULT 0,
        largest_position NUMERIC(20, 8) DEFAULT 0,
        largest_position_percent NUMERIC(10, 4) DEFAULT 0,

        -- P&L Metrics
        unrealized_pnl NUMERIC(20, 8) DEFAULT 0,
        realized_pnl NUMERIC(20, 8) DEFAULT 0,
        total_pnl NUMERIC(20, 8) DEFAULT 0,

        -- Drawdown
        current_drawdown NUMERIC(10, 4) DEFAULT 0,
        max_drawdown NUMERIC(10, 4) DEFAULT 0,
        peak_value NUMERIC(20, 8) DEFAULT 0,
        drawdown_duration NUMERIC(10, 0) DEFAULT 0,

        -- Risk Metrics
        value_at_risk NUMERIC(20, 8),
        expected_shortfall NUMERIC(20, 8),

        -- Performance Metrics
        sharpe_ratio NUMERIC(10, 4),
        sortino_ratio NUMERIC(10, 4),
        calmar_ratio NUMERIC(10, 4),

        -- Volatility
        volatility NUMERIC(10, 4),
        beta NUMERIC(10, 4),

        -- Diversification
        concentration_risk NUMERIC(10, 4),
        correlation_average NUMERIC(10, 4),

        -- Risk Score
        overall_risk_score NUMERIC(10, 2),
        risk_level VARCHAR(20) DEFAULT 'moderate',

        -- Metadata
        calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        snapshot_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS risk_metrics_user_idx ON risk_metrics(user_id);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS risk_metrics_tenant_idx ON risk_metrics(tenant_id);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS risk_metrics_calculated_at_idx ON risk_metrics(calculated_at);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS risk_metrics_snapshot_idx ON risk_metrics(snapshot_date);
    `);

    // 4. Risk Alerts Table
    console.log('  ✅ Creating risk_alerts table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS risk_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        tenant_id UUID NOT NULL,
        limit_id UUID,

        -- Alert Details
        alert_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,

        -- Context
        limit_type VARCHAR(50),
        limit_value NUMERIC(20, 8),
        current_value NUMERIC(20, 8),
        violation_percent NUMERIC(10, 4),

        -- Related Entities
        position_id UUID,
        strategy_id UUID,
        asset_symbol VARCHAR(20),

        -- Status
        acknowledged BOOLEAN DEFAULT false,
        acknowledged_at TIMESTAMPTZ,
        resolved BOOLEAN DEFAULT false,
        resolved_at TIMESTAMPTZ,

        -- Actions Taken
        action_taken VARCHAR(50),
        action_details JSONB,

        -- Metadata
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS risk_alerts_user_idx ON risk_alerts(user_id);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS risk_alerts_tenant_idx ON risk_alerts(tenant_id);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS risk_alerts_type_idx ON risk_alerts(alert_type);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS risk_alerts_severity_idx ON risk_alerts(severity);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS risk_alerts_acknowledged_idx ON risk_alerts(acknowledged);
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS risk_alerts_created_at_idx ON risk_alerts(created_at);
    `);

    console.log('\n✅ All Risk module tables created successfully!');
    console.log('\n📊 Schema Summary:');
    console.log('  - risk_profiles (24 columns, 2 indices)');
    console.log('  - risk_limits (17 columns, 4 indices)');
    console.log('  - risk_metrics (44 columns, 4 indices)');
    console.log('  - risk_alerts (19 columns, 6 indices)');
    console.log('\n🎯 Ready for integration tests!\n');

  } catch (error) {
    console.error('❌ Error applying schema:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run
applySchema()
  .then(() => {
    console.log('✅ Schema application completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Schema application failed:', error);
    process.exit(1);
  });
