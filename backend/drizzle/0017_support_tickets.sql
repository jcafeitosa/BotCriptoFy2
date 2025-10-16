-- Migration: Create Support Module Tables
-- Description: Support ticket system with SLA tracking, knowledge base, and automations
-- Created: 2025-10-16

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: sla_policies
-- =====================================================
CREATE TABLE IF NOT EXISTS sla_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  first_response_minutes INTEGER NOT NULL CHECK (first_response_minutes > 0),
  resolution_minutes INTEGER NOT NULL CHECK (resolution_minutes > 0),
  business_hours_only BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for sla_policies
CREATE INDEX idx_sla_policies_tenant_id ON sla_policies(tenant_id);
CREATE INDEX idx_sla_policies_priority ON sla_policies(priority);
CREATE INDEX idx_sla_policies_is_active ON sla_policies(is_active);

-- =====================================================
-- TABLE: tickets
-- =====================================================
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ticket_number VARCHAR(20) NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  sla_id UUID REFERENCES sla_policies(id) ON DELETE SET NULL,
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'open', 'pending', 'on_hold', 'resolved', 'closed')),
  category VARCHAR(100) NOT NULL,
  source VARCHAR(20) NOT NULL CHECK (source IN ('email', 'phone', 'chat', 'web', 'api')),
  due_date TIMESTAMP WITH TIME ZONE,
  resolution_time INTEGER,
  first_response_time INTEGER,
  satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
  satisfaction_comment TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT tickets_tenant_number_unique UNIQUE (tenant_id, ticket_number)
);

-- Indexes for tickets
CREATE INDEX idx_tickets_tenant_id ON tickets(tenant_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX idx_tickets_contact_id ON tickets(contact_id);
CREATE INDEX idx_tickets_category ON tickets(category);
CREATE INDEX idx_tickets_due_date ON tickets(due_date);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);

-- =====================================================
-- TABLE: ticket_messages
-- =====================================================
CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  is_from_customer BOOLEAN NOT NULL DEFAULT false,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for ticket_messages
CREATE INDEX idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX idx_ticket_messages_created_by ON ticket_messages(created_by);
CREATE INDEX idx_ticket_messages_created_at ON ticket_messages(created_at);
CREATE INDEX idx_ticket_messages_is_internal ON ticket_messages(is_internal);

-- =====================================================
-- TABLE: knowledge_base_articles
-- =====================================================
CREATE TABLE IF NOT EXISTS knowledge_base_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  tags JSONB DEFAULT '[]'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT false,
  views_count INTEGER NOT NULL DEFAULT 0,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  not_helpful_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for knowledge_base_articles
CREATE INDEX idx_kb_articles_tenant_id ON knowledge_base_articles(tenant_id);
CREATE INDEX idx_kb_articles_category ON knowledge_base_articles(category);
CREATE INDEX idx_kb_articles_is_published ON knowledge_base_articles(is_published);
CREATE INDEX idx_kb_articles_author_id ON knowledge_base_articles(author_id);
CREATE INDEX idx_kb_articles_views_count ON knowledge_base_articles(views_count);

-- =====================================================
-- TABLE: ticket_automations
-- =====================================================
CREATE TABLE IF NOT EXISTS ticket_automations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  trigger VARCHAR(30) NOT NULL CHECK (trigger IN ('on_create', 'on_update', 'on_status_change', 'on_sla_breach')),
  conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  execution_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for ticket_automations
CREATE INDEX idx_ticket_automations_tenant_id ON ticket_automations(tenant_id);
CREATE INDEX idx_ticket_automations_trigger ON ticket_automations(trigger);
CREATE INDEX idx_ticket_automations_is_active ON ticket_automations(is_active);

-- =====================================================
-- TABLE: canned_responses
-- =====================================================
CREATE TABLE IF NOT EXISTS canned_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100),
  is_shared BOOLEAN NOT NULL DEFAULT false,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for canned_responses
CREATE INDEX idx_canned_responses_tenant_id ON canned_responses(tenant_id);
CREATE INDEX idx_canned_responses_owner_id ON canned_responses(owner_id);
CREATE INDEX idx_canned_responses_category ON canned_responses(category);
CREATE INDEX idx_canned_responses_is_shared ON canned_responses(is_shared);

-- =====================================================
-- TRIGGERS: Update updated_at timestamps
-- =====================================================

-- SLA Policies trigger
CREATE OR REPLACE FUNCTION update_sla_policies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sla_policies_updated_at
BEFORE UPDATE ON sla_policies
FOR EACH ROW
EXECUTE FUNCTION update_sla_policies_updated_at();

-- Tickets trigger
CREATE OR REPLACE FUNCTION update_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tickets_updated_at
BEFORE UPDATE ON tickets
FOR EACH ROW
EXECUTE FUNCTION update_tickets_updated_at();

-- Knowledge Base trigger
CREATE OR REPLACE FUNCTION update_kb_articles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_kb_articles_updated_at
BEFORE UPDATE ON knowledge_base_articles
FOR EACH ROW
EXECUTE FUNCTION update_kb_articles_updated_at();

-- Automations trigger
CREATE OR REPLACE FUNCTION update_automations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_automations_updated_at
BEFORE UPDATE ON ticket_automations
FOR EACH ROW
EXECUTE FUNCTION update_automations_updated_at();

-- Canned Responses trigger
CREATE OR REPLACE FUNCTION update_canned_responses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_canned_responses_updated_at
BEFORE UPDATE ON canned_responses
FOR EACH ROW
EXECUTE FUNCTION update_canned_responses_updated_at();

-- =====================================================
-- SEED DATA: Default SLA Policies
-- =====================================================

-- Note: Replace 'default-tenant-id' with actual tenant ID when running
-- INSERT INTO sla_policies (tenant_id, name, description, priority, first_response_minutes, resolution_minutes, business_hours_only)
-- VALUES
--   ('default-tenant-id', 'Urgent Priority SLA', 'SLA for urgent tickets', 'urgent', 30, 120, false),
--   ('default-tenant-id', 'High Priority SLA', 'SLA for high priority tickets', 'high', 60, 240, false),
--   ('default-tenant-id', 'Medium Priority SLA', 'SLA for medium priority tickets', 'medium', 120, 480, true),
--   ('default-tenant-id', 'Low Priority SLA', 'SLA for low priority tickets', 'low', 240, 1440, true);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE sla_policies IS 'SLA policy definitions for ticket resolution times';
COMMENT ON TABLE tickets IS 'Support tickets with full lifecycle tracking';
COMMENT ON TABLE ticket_messages IS 'Messages and internal notes for tickets';
COMMENT ON TABLE knowledge_base_articles IS 'Self-service help articles';
COMMENT ON TABLE ticket_automations IS 'Automated workflows for ticket management';
COMMENT ON TABLE canned_responses IS 'Pre-written response templates';

COMMENT ON COLUMN tickets.ticket_number IS 'Auto-generated unique number per tenant (TICK-YYYY-NNNN)';
COMMENT ON COLUMN tickets.resolution_time IS 'Time to resolve in minutes';
COMMENT ON COLUMN tickets.first_response_time IS 'Time to first response in minutes';
COMMENT ON COLUMN tickets.satisfaction_rating IS 'Customer satisfaction rating (1-5 stars)';

-- =====================================================
-- GRANTS (adjust as needed)
-- =====================================================

-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;
