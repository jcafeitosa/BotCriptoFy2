-- Migration: Create Marketing System Tables
-- Description: Creates tables for campaigns, leads, templates, and analytics
-- Version: 0008
-- Date: 2025-10-16

-- =====================================================================
-- EMAIL TEMPLATES
-- =====================================================================

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES users(id),

  -- Template Info
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT NOT NULL,

  -- Variables
  variables JSONB DEFAULT '{"allowed": []}'::jsonb,

  -- Classification
  category VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_templates_tenant_id ON email_templates(tenant_id);
CREATE INDEX idx_email_templates_category ON email_templates(category);
CREATE INDEX idx_email_templates_is_active ON email_templates(is_active);
CREATE INDEX idx_email_templates_tenant_category ON email_templates(tenant_id, category);

-- =====================================================================
-- LEADS
-- =====================================================================

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Contact Info
  email VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),

  -- Company Info
  company VARCHAR(255),
  job_title VARCHAR(100),

  -- Lead Info
  source VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),

  -- Classification
  tags JSONB DEFAULT '[]'::jsonb,
  custom_fields JSONB DEFAULT '{}'::jsonb,

  -- Tracking
  last_contacted_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT leads_tenant_email_unique UNIQUE (tenant_id, email)
);

CREATE INDEX idx_leads_tenant_id ON leads(tenant_id);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_score ON leads(score);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_tenant_status ON leads(tenant_id, status);

-- =====================================================================
-- CAMPAIGNS
-- =====================================================================

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  created_by TEXT NOT NULL REFERENCES users(id),

  -- Campaign Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'social', 'ads', 'mixed')),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed', 'archived')),

  -- Targeting
  target_audience JSONB,

  -- Scheduling
  schedule_type VARCHAR(20) NOT NULL DEFAULT 'immediate' CHECK (schedule_type IN ('immediate', 'scheduled', 'recurring')),
  scheduled_at TIMESTAMPTZ,
  recurring_pattern JSONB,

  -- Execution
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_campaigns_tenant_id ON campaigns(tenant_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_scheduled_at ON campaigns(scheduled_at);
CREATE INDEX idx_campaigns_created_at ON campaigns(created_at);
CREATE INDEX idx_campaigns_tenant_status ON campaigns(tenant_id, status);

-- =====================================================================
-- CAMPAIGN SENDS
-- =====================================================================

CREATE TABLE IF NOT EXISTS campaign_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  -- Recipient Info
  email VARCHAR(255) NOT NULL,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),

  -- Timing
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  -- Error Handling
  failure_reason TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaign_sends_campaign_id ON campaign_sends(campaign_id);
CREATE INDEX idx_campaign_sends_lead_id ON campaign_sends(lead_id);
CREATE INDEX idx_campaign_sends_status ON campaign_sends(status);
CREATE INDEX idx_campaign_sends_email ON campaign_sends(email);
CREATE INDEX idx_campaign_sends_sent_at ON campaign_sends(sent_at);
CREATE INDEX idx_campaign_sends_opened_at ON campaign_sends(opened_at);

-- =====================================================================
-- CAMPAIGN ANALYTICS
-- =====================================================================

CREATE TABLE IF NOT EXISTS campaign_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Date
  date DATE NOT NULL,

  -- Send Metrics
  total_sends INTEGER NOT NULL DEFAULT 0,
  delivered INTEGER NOT NULL DEFAULT 0,
  bounced INTEGER NOT NULL DEFAULT 0,

  -- Engagement Metrics
  opened INTEGER NOT NULL DEFAULT 0,
  unique_opens INTEGER NOT NULL DEFAULT 0,
  clicked INTEGER NOT NULL DEFAULT 0,
  unique_clicks INTEGER NOT NULL DEFAULT 0,
  unsubscribed INTEGER NOT NULL DEFAULT 0,

  -- Calculated Rates (percentages)
  open_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  click_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  bounce_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT campaign_analytics_campaign_date_unique UNIQUE (campaign_id, date)
);

CREATE INDEX idx_campaign_analytics_campaign_id ON campaign_analytics(campaign_id);
CREATE INDEX idx_campaign_analytics_date ON campaign_analytics(date);

-- =====================================================================
-- LEAD ACTIVITIES
-- =====================================================================

CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  performed_by TEXT REFERENCES users(id),

  -- Activity Info
  activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('email_sent', 'email_opened', 'email_clicked', 'form_submitted', 'page_visited', 'note_added')),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX idx_lead_activities_tenant_id ON lead_activities(tenant_id);
CREATE INDEX idx_lead_activities_activity_type ON lead_activities(activity_type);
CREATE INDEX idx_lead_activities_campaign_id ON lead_activities(campaign_id);
CREATE INDEX idx_lead_activities_created_at ON lead_activities(created_at);
CREATE INDEX idx_lead_activities_lead_created ON lead_activities(lead_id, created_at);

-- =====================================================================
-- COMMENTS
-- =====================================================================

COMMENT ON TABLE email_templates IS 'Reusable email templates with variable substitution';
COMMENT ON TABLE leads IS 'Contact database with lead scoring and tracking';
COMMENT ON TABLE campaigns IS 'Marketing campaigns with targeting and scheduling';
COMMENT ON TABLE campaign_sends IS 'Individual email sends per campaign per lead';
COMMENT ON TABLE campaign_analytics IS 'Daily aggregated campaign performance metrics';
COMMENT ON TABLE lead_activities IS 'Activity timeline for lead engagement tracking';

-- =====================================================================
-- SAMPLE DATA (Optional - for development)
-- =====================================================================

-- Uncomment to insert sample data for testing:
-- INSERT INTO email_templates (tenant_id, created_by, name, subject, html_content, text_content, category) VALUES
-- ('default', 'admin', 'Welcome Email', 'Welcome {{first_name}}!', '<h1>Welcome {{first_name}} {{last_name}}!</h1>', 'Welcome {{first_name}} {{last_name}}!', 'promotional');
