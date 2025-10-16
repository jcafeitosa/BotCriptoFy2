-- Migration: Sales CRM Module
-- Creates tables for contacts, deals, pipeline stages, activities, notes, targets, and forecasts
-- Generated: 2025-10-16

-- ============================================================================
-- CONTACTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  -- Contact type
  type VARCHAR(20) NOT NULL CHECK (type IN ('person', 'company')),

  -- Personal info
  first_name VARCHAR(100),
  last_name VARCHAR(100),

  -- Company info
  company_name VARCHAR(255),

  -- Communication
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  mobile VARCHAR(20),

  -- Professional
  job_title VARCHAR(100),
  department VARCHAR(100),

  -- Social & Web
  linkedin_url TEXT,
  website TEXT,

  -- Location
  address JSONB,

  -- Classification
  tags JSONB DEFAULT '[]'::jsonb,
  custom_fields JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT contacts_tenant_email_unique UNIQUE (tenant_id, email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS contacts_tenant_id_idx ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS contacts_email_idx ON contacts(email);
CREATE INDEX IF NOT EXISTS contacts_owner_id_idx ON contacts(owner_id);
CREATE INDEX IF NOT EXISTS contacts_type_idx ON contacts(type);
CREATE INDEX IF NOT EXISTS contacts_lead_id_idx ON contacts(lead_id);

-- ============================================================================
-- PIPELINE STAGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Stage info
  name VARCHAR(100) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  probability_default INTEGER NOT NULL DEFAULT 50 CHECK (probability_default BETWEEN 0 AND 100),

  -- Visual
  color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS pipeline_stages_tenant_id_idx ON pipeline_stages(tenant_id);
CREATE INDEX IF NOT EXISTS pipeline_stages_order_idx ON pipeline_stages(order_index);
CREATE INDEX IF NOT EXISTS pipeline_stages_tenant_order_idx ON pipeline_stages(tenant_id, order_index);

-- ============================================================================
-- DEALS
-- ============================================================================

CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
  stage_id UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE RESTRICT,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  -- Deal info
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Financial
  value DECIMAL(15,2) NOT NULL CHECK (value >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',

  -- Pipeline
  probability INTEGER NOT NULL DEFAULT 50 CHECK (probability BETWEEN 0 AND 100),
  expected_close_date TIMESTAMPTZ,
  actual_close_date TIMESTAMPTZ,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost', 'abandoned')),
  lost_reason TEXT,

  -- Products
  products JSONB DEFAULT '[]'::jsonb,

  -- Custom fields
  custom_fields JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS deals_tenant_id_idx ON deals(tenant_id);
CREATE INDEX IF NOT EXISTS deals_contact_id_idx ON deals(contact_id);
CREATE INDEX IF NOT EXISTS deals_stage_id_idx ON deals(stage_id);
CREATE INDEX IF NOT EXISTS deals_owner_id_idx ON deals(owner_id);
CREATE INDEX IF NOT EXISTS deals_status_idx ON deals(status);
CREATE INDEX IF NOT EXISTS deals_expected_close_date_idx ON deals(expected_close_date);
CREATE INDEX IF NOT EXISTS deals_tenant_status_idx ON deals(tenant_id, status);
CREATE INDEX IF NOT EXISTS deals_tenant_stage_idx ON deals(tenant_id, stage_id);

-- ============================================================================
-- ACTIVITIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  -- Activity info
  type VARCHAR(20) NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'task', 'note', 'demo')),
  subject VARCHAR(255) NOT NULL,
  description TEXT,

  -- Scheduling
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  outcome TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS activities_tenant_id_idx ON activities(tenant_id);
CREATE INDEX IF NOT EXISTS activities_contact_id_idx ON activities(contact_id);
CREATE INDEX IF NOT EXISTS activities_deal_id_idx ON activities(deal_id);
CREATE INDEX IF NOT EXISTS activities_owner_id_idx ON activities(owner_id);
CREATE INDEX IF NOT EXISTS activities_type_idx ON activities(type);
CREATE INDEX IF NOT EXISTS activities_status_idx ON activities(status);
CREATE INDEX IF NOT EXISTS activities_due_date_idx ON activities(due_date);
CREATE INDEX IF NOT EXISTS activities_tenant_status_idx ON activities(tenant_id, status);
CREATE INDEX IF NOT EXISTS activities_tenant_due_date_idx ON activities(tenant_id, due_date);

-- ============================================================================
-- NOTES
-- ============================================================================

CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  -- Note content
  content TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS notes_tenant_id_idx ON notes(tenant_id);
CREATE INDEX IF NOT EXISTS notes_contact_id_idx ON notes(contact_id);
CREATE INDEX IF NOT EXISTS notes_deal_id_idx ON notes(deal_id);
CREATE INDEX IF NOT EXISTS notes_created_by_idx ON notes(created_by);
CREATE INDEX IF NOT EXISTS notes_is_pinned_idx ON notes(is_pinned);
CREATE INDEX IF NOT EXISTS notes_tenant_contact_idx ON notes(tenant_id, contact_id);
CREATE INDEX IF NOT EXISTS notes_tenant_deal_idx ON notes(tenant_id, deal_id);

-- ============================================================================
-- SALES TARGETS
-- ============================================================================

CREATE TABLE IF NOT EXISTS sales_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,

  -- Period
  period VARCHAR(20) NOT NULL CHECK (period IN ('monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Targets
  target_amount DECIMAL(15,2) NOT NULL CHECK (target_amount >= 0),
  achieved_amount DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (achieved_amount >= 0),
  achievement_percentage DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (achievement_percentage >= 0),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS sales_targets_tenant_id_idx ON sales_targets(tenant_id);
CREATE INDEX IF NOT EXISTS sales_targets_user_id_idx ON sales_targets(user_id);
CREATE INDEX IF NOT EXISTS sales_targets_period_idx ON sales_targets(period);
CREATE INDEX IF NOT EXISTS sales_targets_start_date_idx ON sales_targets(start_date);
CREATE INDEX IF NOT EXISTS sales_targets_end_date_idx ON sales_targets(end_date);
CREATE INDEX IF NOT EXISTS sales_targets_tenant_period_idx ON sales_targets(tenant_id, period);
CREATE INDEX IF NOT EXISTS sales_targets_tenant_user_idx ON sales_targets(tenant_id, user_id);

-- ============================================================================
-- SALES FORECASTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS sales_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  -- Forecast period
  period VARCHAR(20) NOT NULL CHECK (period IN ('monthly', 'quarterly', 'yearly')),
  forecast_date DATE NOT NULL,

  -- Predictions
  predicted_revenue DECIMAL(15,2) NOT NULL,
  weighted_revenue DECIMAL(15,2) NOT NULL,
  best_case DECIMAL(15,2) NOT NULL,
  worst_case DECIMAL(15,2) NOT NULL,

  -- Confidence
  confidence_level INTEGER NOT NULL CHECK (confidence_level BETWEEN 0 AND 100),

  -- Methodology
  methodology VARCHAR(100) NOT NULL CHECK (methodology IN ('weighted_pipeline', 'historical', 'linear_regression', 'moving_average')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS sales_forecasts_tenant_id_idx ON sales_forecasts(tenant_id);
CREATE INDEX IF NOT EXISTS sales_forecasts_period_idx ON sales_forecasts(period);
CREATE INDEX IF NOT EXISTS sales_forecasts_forecast_date_idx ON sales_forecasts(forecast_date);
CREATE INDEX IF NOT EXISTS sales_forecasts_tenant_period_idx ON sales_forecasts(tenant_id, period);
CREATE INDEX IF NOT EXISTS sales_forecasts_tenant_date_idx ON sales_forecasts(tenant_id, forecast_date);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER pipeline_stages_updated_at BEFORE UPDATE ON pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER deals_updated_at BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER activities_updated_at BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER notes_updated_at BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER sales_targets_updated_at BEFORE UPDATE ON sales_targets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DEFAULT PIPELINE STAGES (optional)
-- ============================================================================

-- Note: This should be run per tenant, not in migration
-- Example for reference:
-- INSERT INTO pipeline_stages (tenant_id, name, order_index, probability_default, color) VALUES
-- ('tenant-id', 'Lead', 0, 10, '#EF4444'),
-- ('tenant-id', 'Qualification', 1, 25, '#F59E0B'),
-- ('tenant-id', 'Proposal', 2, 50, '#3B82F6'),
-- ('tenant-id', 'Negotiation', 3, 75, '#8B5CF6'),
-- ('tenant-id', 'Closed Won', 4, 100, '#10B981');
