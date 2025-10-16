# Database Schema - BotCriptoFy2

## 🗄️ Visão Geral

Este documento descreve o schema completo do banco de dados do BotCriptoFy2, incluindo todas as tabelas, relacionamentos, índices e constraints necessários para o funcionamento da plataforma.

## 🏗️ Arquitetura do Banco

### Tecnologia
- **Database**: TimescaleDB 16.0 (PostgreSQL-based)
- **ORM**: Drizzle ORM 0.29.0
- **Cache**: Redis 7.2
- **Migrations**: Drizzle Kit

### Características
- **Multi-tenancy**: Suporte a múltiplos tenants
- **Temporal Data**: Otimizado para dados temporais
- **Escalabilidade**: Preparado para alta performance
- **Segurança**: Criptografia e auditoria integradas

## 📊 Estrutura das Tabelas

### 1. Tabelas de Autenticação (Better-Auth)

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  name VARCHAR(255),
  image VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### accounts
```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id VARCHAR(255) NOT NULL,
  provider_id VARCHAR(255) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  access_token_expires_at TIMESTAMP,
  refresh_token_expires_at TIMESTAMP,
  scope TEXT,
  password VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(provider_id, account_id)
);
```

#### sessions
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### verification_tokens
```sql
CREATE TABLE verification_tokens (
  identifier VARCHAR(255) NOT NULL,
  value VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (identifier, value)
);
```

### 2. Tabelas de Multi-tenancy

#### tenants
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(20) NOT NULL, -- empresa, trader, influencer
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, suspended, inactive
  settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### tenant_members
```sql
CREATE TABLE tenant_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  permissions JSONB DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  joined_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);
```

### 3. Tabelas de Departamentos

#### departments
```sql
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### department_agents
```sql
CREATE TABLE department_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  agent_name VARCHAR(100) NOT NULL,
  agent_type VARCHAR(50) NOT NULL, -- mastra, custom
  configuration JSONB DEFAULT '{}',
  capabilities JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4. Tabelas do Módulo Financeiro

#### financial_transactions
```sql
CREATE TABLE financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  transaction_type VARCHAR(50) NOT NULL, -- payment, refund, chargeback, adjustment
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
  status VARCHAR(20) NOT NULL, -- pending, completed, failed, cancelled
  payment_method VARCHAR(50),
  stripe_payment_intent_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### billing_subscriptions
```sql
CREATE TABLE billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  stripe_subscription_id VARCHAR(255) UNIQUE,
  plan_id VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL, -- active, cancelled, past_due, unpaid
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMP,
  trial_start TIMESTAMP,
  trial_end TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### financial_reports
```sql
CREATE TABLE financial_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  report_type VARCHAR(50) NOT NULL, -- revenue, expenses, profit_loss, cash_flow
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  data JSONB NOT NULL,
  generated_by UUID NOT NULL REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'generating', -- generating, completed, failed
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

### 5. Tabelas do Módulo Marketing

#### referral_campaigns
```sql
CREATE TABLE referral_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  reward_type VARCHAR(50) NOT NULL, -- discount, credit, access, cash
  reward_value DECIMAL(10,2) NOT NULL,
  max_rewards INTEGER,
  rules JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### referral_links
```sql
CREATE TABLE referral_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES referral_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  referral_code VARCHAR(50) UNIQUE NOT NULL,
  qr_code_url VARCHAR(500),
  click_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### gamification_achievements
```sql
CREATE TABLE gamification_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(100),
  points INTEGER NOT NULL DEFAULT 0,
  category VARCHAR(50) NOT NULL,
  requirements JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### user_achievements
```sql
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  achievement_id UUID NOT NULL REFERENCES gamification_achievements(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  earned_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, achievement_id)
);
```

### 6. Tabelas do Módulo Vendas

#### leads
```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  company VARCHAR(255),
  source VARCHAR(50) NOT NULL, -- organic, social, ads, referral, direct
  status VARCHAR(20) NOT NULL DEFAULT 'new', -- new, contacted, qualified, converted, lost
  score INTEGER DEFAULT 0,
  assigned_to UUID REFERENCES users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### visitor_tracking
```sql
CREATE TABLE visitor_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) NOT NULL,
  ip_address INET NOT NULL,
  ip_version INTEGER NOT NULL, -- 4 or 6
  country VARCHAR(2),
  region VARCHAR(100),
  city VARCHAR(100),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  asn VARCHAR(20),
  isp VARCHAR(255),
  user_agent TEXT,
  browser VARCHAR(100),
  browser_version VARCHAR(50),
  os VARCHAR(100),
  os_version VARCHAR(50),
  device_type VARCHAR(50),
  device_brand VARCHAR(100),
  device_model VARCHAR(100),
  screen_resolution VARCHAR(20),
  referrer VARCHAR(500),
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  utm_term VARCHAR(100),
  utm_content VARCHAR(100),
  gclid VARCHAR(100),
  fbclid VARCHAR(100),
  page_url VARCHAR(500) NOT NULL,
  page_title VARCHAR(255),
  visit_duration INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### visitor_sessions
```sql
CREATE TABLE visitor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) UNIQUE NOT NULL,
  visitor_id VARCHAR(255),
  first_visit_at TIMESTAMP NOT NULL,
  last_visit_at TIMESTAMP NOT NULL,
  total_visits INTEGER DEFAULT 1,
  total_duration INTEGER DEFAULT 0,
  pages_visited INTEGER DEFAULT 1,
  conversion_events INTEGER DEFAULT 0,
  is_converted BOOLEAN DEFAULT false,
  conversion_value DECIMAL(10,2),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 7. Tabelas do Módulo Segurança

#### user_behavior_tracking
```sql
CREATE TABLE user_behavior_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100),
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  location_data JSONB,
  session_data JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### user_behavior_patterns
```sql
CREATE TABLE user_behavior_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  pattern_type VARCHAR(50) NOT NULL, -- login_time, access_location, navigation, transaction
  pattern_data JSONB NOT NULL,
  confidence_score DECIMAL(3,2) NOT NULL,
  is_anomaly BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### security_risk_assessments
```sql
CREATE TABLE security_risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  risk_level VARCHAR(10) NOT NULL, -- green, yellow, red
  risk_score INTEGER NOT NULL,
  risk_factors JSONB NOT NULL,
  mitigation_actions JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  assessed_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 8. Tabelas do Módulo Assinaturas

#### subscription_plans
```sql
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
  billing_cycle VARCHAR(20) NOT NULL, -- monthly, quarterly, yearly
  stripe_price_id VARCHAR(255),
  features JSONB NOT NULL,
  limits JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### platform_usage_tracking
```sql
CREATE TABLE platform_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  resource_type VARCHAR(50) NOT NULL, -- bots, api_calls, storage, bandwidth, users, transactions
  resource_id VARCHAR(255),
  usage_count INTEGER NOT NULL DEFAULT 1,
  usage_value DECIMAL(15,2),
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### trading_resource_usage
```sql
CREATE TABLE trading_resource_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  resource_type VARCHAR(50) NOT NULL, -- bot_execution, signal_analysis, market_data, backtesting, paper_trading
  usage_duration INTEGER NOT NULL, -- in seconds
  usage_count INTEGER NOT NULL DEFAULT 1,
  cost_per_unit DECIMAL(10,4) NOT NULL,
  total_cost DECIMAL(10,2) NOT NULL,
  billing_period_start TIMESTAMP NOT NULL,
  billing_period_end TIMESTAMP NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### trading_commissions
```sql
CREATE TABLE trading_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  trade_id VARCHAR(255) NOT NULL,
  asset_type VARCHAR(20) NOT NULL, -- crypto, forex, stocks, commodities
  trade_amount DECIMAL(15,2) NOT NULL,
  profit_amount DECIMAL(15,2) NOT NULL,
  commission_rate DECIMAL(5,4) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  trade_date TIMESTAMP NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 9. Tabelas do Módulo de Notificações

#### notification_templates
```sql
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id),
  template_key VARCHAR(100) NOT NULL,
  template_name VARCHAR(255) NOT NULL,
  template_type VARCHAR(20) NOT NULL, -- email, sms, push, in_app, telegram, webhook
  subject VARCHAR(255),
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  priority VARCHAR(10) NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
  category VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(department_id, template_key, template_type)
);
```

#### notification_channels
```sql
CREATE TABLE notification_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_name VARCHAR(255) NOT NULL,
  channel_type VARCHAR(20) NOT NULL, -- email, sms, push, in_app, telegram, webhook, slack
  configuration JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  priority_order INTEGER DEFAULT 0,
  rate_limit_per_minute INTEGER DEFAULT 60,
  rate_limit_per_hour INTEGER DEFAULT 1000,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### notifications
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  department_id UUID NOT NULL REFERENCES departments(id),
  template_id UUID REFERENCES notification_templates(id),
  channel_id UUID REFERENCES notification_channels(id),
  notification_type VARCHAR(20) NOT NULL,
  category VARCHAR(50) NOT NULL,
  priority VARCHAR(10) NOT NULL DEFAULT 'normal',
  subject VARCHAR(255),
  content TEXT NOT NULL,
  variables JSONB DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, sent, delivered, failed, read
  scheduled_for TIMESTAMP,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### user_notification_preferences
```sql
CREATE TABLE user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  department_id UUID NOT NULL REFERENCES departments(id),
  notification_type VARCHAR(20) NOT NULL,
  channel_preferences JSONB NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone VARCHAR(50) DEFAULT 'UTC',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, department_id, notification_type)
);
```

### 10. Tabelas do Módulo SAC

#### support_tickets
```sql
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number VARCHAR(20) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL, -- technical, billing, account, feature, bug
  priority VARCHAR(20) NOT NULL, -- low, medium, high, urgent
  status VARCHAR(20) NOT NULL, -- open, in_progress, pending, resolved, closed
  assigned_to UUID REFERENCES users(id),
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);
```

#### support_messages
```sql
CREATE TABLE support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  message_type VARCHAR(20) NOT NULL, -- user, agent, system, automated
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  attachments JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### support_knowledge_base
```sql
CREATE TABLE support_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  tags TEXT[],
  is_published BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 11. Tabelas do Módulo Auditoria

#### audit_logs
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  tenant_id UUID REFERENCES tenants(id),
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### compliance_reports
```sql
CREATE TABLE compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type VARCHAR(50) NOT NULL, -- lgpd, gdpr, soc2, iso27001
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  status VARCHAR(20) NOT NULL, -- pending, generating, completed, failed
  data JSONB NOT NULL,
  generated_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

#### irregularity_detection
```sql
CREATE TABLE irregularity_detection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  tenant_id UUID REFERENCES tenants(id),
  irregularity_type VARCHAR(100) NOT NULL, -- data_breach, unauthorized_access, policy_violation
  severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
  description TEXT NOT NULL,
  evidence JSONB NOT NULL,
  status VARCHAR(20) NOT NULL, -- detected, investigating, resolved, false_positive
  assigned_to UUID REFERENCES users(id),
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);
```

### 12. Tabelas do Módulo Documentos

#### documents
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  file_type VARCHAR(50) NOT NULL, -- pdf, doc, docx, txt, html, markdown
  file_size BIGINT NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  tags TEXT[],
  is_public BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  parent_id UUID REFERENCES documents(id),
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### document_versions
```sql
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  change_summary TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### document_permissions
```sql
CREATE TABLE document_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  role_id UUID REFERENCES security_roles(id),
  permission_type VARCHAR(20) NOT NULL, -- read, write, delete, share
  granted_by UUID NOT NULL REFERENCES users(id),
  granted_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);
```

### 13. Tabelas do Módulo Configurações

#### system_configurations
```sql
CREATE TABLE system_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  data_type VARCHAR(20) NOT NULL, -- string, number, boolean, json, array
  category VARCHAR(50) NOT NULL, -- general, security, performance, integration
  description TEXT,
  is_encrypted BOOLEAN DEFAULT false,
  is_sensitive BOOLEAN DEFAULT false,
  is_readonly BOOLEAN DEFAULT false,
  validation_rules JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### department_configurations
```sql
CREATE TABLE department_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id),
  key VARCHAR(255) NOT NULL,
  value TEXT NOT NULL,
  data_type VARCHAR(20) NOT NULL,
  description TEXT,
  is_encrypted BOOLEAN DEFAULT false,
  is_sensitive BOOLEAN DEFAULT false,
  validation_rules JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(department_id, key)
);
```

#### tenant_configurations
```sql
CREATE TABLE tenant_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  key VARCHAR(255) NOT NULL,
  value TEXT NOT NULL,
  data_type VARCHAR(20) NOT NULL,
  description TEXT,
  is_encrypted BOOLEAN DEFAULT false,
  is_sensitive BOOLEAN DEFAULT false,
  validation_rules JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, key)
);
```

### 14. Tabelas do Módulo CEO

#### ceo_dashboard_metrics
```sql
CREATE TABLE ceo_dashboard_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(15,2) NOT NULL,
  metric_type VARCHAR(50) NOT NULL, -- revenue, users, performance, growth
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  department_id UUID REFERENCES departments(id),
  tenant_id UUID REFERENCES tenants(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### ceo_strategic_analysis
```sql
CREATE TABLE ceo_strategic_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_type VARCHAR(50) NOT NULL, -- market, competition, performance, risk
  title VARCHAR(255) NOT NULL,
  summary TEXT NOT NULL,
  detailed_analysis TEXT NOT NULL,
  recommendations TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL, -- low, medium, high, critical
  status VARCHAR(20) NOT NULL, -- pending, in_progress, completed, archived
  assigned_to UUID REFERENCES users(id),
  due_date TIMESTAMP,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### ceo_decisions
```sql
CREATE TABLE ceo_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_type VARCHAR(50) NOT NULL, -- strategic, operational, financial, personnel
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  context TEXT NOT NULL,
  options JSONB NOT NULL,
  chosen_option VARCHAR(255) NOT NULL,
  rationale TEXT NOT NULL,
  impact_assessment TEXT,
  implementation_plan TEXT,
  status VARCHAR(20) NOT NULL, -- pending, approved, implemented, cancelled
  priority VARCHAR(20) NOT NULL, -- low, medium, high, critical
  created_by UUID NOT NULL REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🔗 Relacionamentos Principais

### Hierarquia de Tenants
```
tenants (1) ←→ (N) tenant_members ←→ (1) users
tenants (1) ←→ (N) departments
```

### Estrutura de Usuários
```
users (1) ←→ (N) accounts
users (1) ←→ (N) sessions
users (1) ←→ (N) tenant_members
```

### Módulos por Departamento
```
departments (1) ←→ (N) department_agents
departments (1) ←→ (N) [module_tables]
```

## 📈 Índices de Performance

### Índices Temporais (TimescaleDB)
```sql
-- Índices para tabelas com dados temporais
CREATE INDEX idx_visitor_tracking_created_at ON visitor_tracking (created_at);
CREATE INDEX idx_user_behavior_tracking_created_at ON user_behavior_tracking (created_at);
CREATE INDEX idx_platform_usage_tracking_created_at ON platform_usage_tracking (created_at);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at);
```

### Índices de Busca
```sql
-- Índices para buscas frequentes
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_tenants_slug ON tenants (slug);
CREATE INDEX idx_leads_email ON leads (email);
CREATE INDEX idx_support_tickets_number ON support_tickets (ticket_number);
CREATE INDEX idx_documents_title ON documents (title);
```

### Índices Compostos
```sql
-- Índices compostos para consultas complexas
CREATE INDEX idx_tenant_user_behavior ON user_behavior_tracking (tenant_id, user_id, created_at);
CREATE INDEX idx_tenant_usage_tracking ON platform_usage_tracking (tenant_id, resource_type, created_at);
CREATE INDEX idx_user_notifications ON notifications (user_id, status, created_at);
```

## 🔒 Constraints e Validações

### Constraints de Integridade
```sql
-- Constraints de chave estrangeira
ALTER TABLE accounts ADD CONSTRAINT fk_accounts_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE sessions ADD CONSTRAINT fk_sessions_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE tenant_members ADD CONSTRAINT fk_tenant_members_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE tenant_members ADD CONSTRAINT fk_tenant_members_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

### Constraints de Validação
```sql
-- Constraints de validação de dados
ALTER TABLE users ADD CONSTRAINT chk_users_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
ALTER TABLE tenants ADD CONSTRAINT chk_tenants_type CHECK (type IN ('empresa', 'trader', 'influencer'));
ALTER TABLE financial_transactions ADD CONSTRAINT chk_transactions_amount CHECK (amount > 0);
ALTER TABLE subscription_plans ADD CONSTRAINT chk_plans_price CHECK (price >= 0);
```

## 🚀 Migrações

### Estrutura de Migrações
```typescript
// Exemplo de migração com Drizzle
import { sql } from 'drizzle-orm';

export const up = async (db: any) => {
  await db.execute(sql`
    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      email_verified BOOLEAN DEFAULT false,
      name VARCHAR(255),
      image VARCHAR(500),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
};

export const down = async (db: any) => {
  await db.execute(sql`DROP TABLE users;`);
};
```

## 📊 Estatísticas e Monitoramento

### Queries de Monitoramento
```sql
-- Estatísticas de uso por tenant
SELECT 
  t.name as tenant_name,
  COUNT(DISTINCT tm.user_id) as user_count,
  COUNT(ft.id) as transaction_count,
  SUM(ft.amount) as total_revenue
FROM tenants t
LEFT JOIN tenant_members tm ON t.id = tm.tenant_id
LEFT JOIN financial_transactions ft ON t.id = ft.tenant_id
GROUP BY t.id, t.name;

-- Performance de consultas
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY n_distinct DESC;
```

## 🔧 Configurações do TimescaleDB

### Extensões Necessárias
```sql
-- Ativar extensões do TimescaleDB
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### Configurações de Hypertables
```sql
-- Converter tabelas temporais em hypertables
SELECT create_hypertable('visitor_tracking', 'created_at');
SELECT create_hypertable('user_behavior_tracking', 'created_at');
SELECT create_hypertable('platform_usage_tracking', 'created_at');
SELECT create_hypertable('audit_logs', 'created_at');
```

## 📋 Checklist de Implementação

### ✅ Fase 1 - Estrutura Base
- [ ] Criar tabelas de autenticação (Better-Auth)
- [ ] Criar tabelas de multi-tenancy
- [ ] Criar tabelas de departamentos
- [ ] Configurar TimescaleDB

### ✅ Fase 2 - Módulos Principais
- [ ] Implementar módulo Financeiro
- [ ] Implementar módulo Marketing
- [ ] Implementar módulo Vendas
- [ ] Implementar módulo Segurança

### ✅ Fase 3 - Módulos Avançados
- [ ] Implementar módulo Assinaturas
- [ ] Implementar módulo Notificações
- [ ] Implementar módulo SAC
- [ ] Implementar módulo Auditoria

### ✅ Fase 4 - Módulos de Suporte
- [ ] Implementar módulo Documentos
- [ ] Implementar módulo Configurações
- [ ] Implementar módulo CEO
- [ ] Configurar índices e constraints

### ✅ Fase 5 - Otimização
- [ ] Configurar hypertables
- [ ] Otimizar consultas
- [ ] Configurar backup
- [ ] Monitoramento de performance

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO