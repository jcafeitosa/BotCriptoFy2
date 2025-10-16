# Módulo de Vendas - BotCriptoFy2

## 💼 Visão Geral

O Módulo de Vendas é responsável por toda a gestão de leads, prospects, qualificação, follow-up e análise de conversão da plataforma.

## 🏗️ Arquitetura do Módulo

### Componentes Principais
- **Lead Management**: Gestão de leads e prospects
- **Qualification Engine**: Motor de qualificação automática
- **Follow-up Automation**: Automação de follow-up
- **Sales Analytics**: Análise de vendas e conversão
- **CRM Integration**: Integração com sistemas CRM

### Integração com Better-Auth
- **Multi-tenancy**: Suporte a diferentes tipos de usuários
- **User Management**: Gestão de usuários e permissões
- **Lead Attribution**: Atribuição de leads a usuários
- **Sales Tracking**: Rastreamento de vendas

## 📊 Estrutura de Dados

### Tabelas do Banco de Dados

#### 1. sales_leads
```sql
CREATE TABLE sales_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(20),
  company VARCHAR(255),
  source VARCHAR(100), -- website, referral, social, etc.
  status VARCHAR(50) NOT NULL, -- new, qualified, contacted, converted, lost
  score INTEGER DEFAULT 0, -- 0-100
  assigned_to UUID REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. sales_activities
```sql
CREATE TABLE sales_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES sales_leads(id),
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL, -- call, email, meeting, demo, proposal
  subject VARCHAR(255),
  description TEXT,
  outcome VARCHAR(50), -- success, failure, pending
  scheduled_at TIMESTAMP,
  completed_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. sales_opportunities
```sql
CREATE TABLE sales_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES sales_leads(id),
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  value DECIMAL(10,2),
  currency VARCHAR(3),
  stage VARCHAR(50) NOT NULL, -- prospecting, qualification, proposal, negotiation, closed
  probability INTEGER DEFAULT 0, -- 0-100
  expected_close_date DATE,
  actual_close_date DATE,
  status VARCHAR(50) NOT NULL, -- open, won, lost
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 4. visitor_tracking
```sql
CREATE TABLE visitor_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) NOT NULL,
  visitor_id VARCHAR(255),
  page_url VARCHAR(500) NOT NULL,
  page_title VARCHAR(255),
  referrer_url VARCHAR(500),
  traffic_source VARCHAR(50) NOT NULL, -- organic, social, ads, referral, direct
  traffic_medium VARCHAR(50), -- google, facebook, instagram, twitter, etc
  traffic_campaign VARCHAR(100),
  ip_address INET NOT NULL,
  ip_version VARCHAR(4) NOT NULL, -- v4 or v6
  country VARCHAR(2),
  country_name VARCHAR(100),
  region VARCHAR(100),
  city VARCHAR(100),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  timezone VARCHAR(50),
  asn VARCHAR(20),
  asn_name VARCHAR(255),
  isp VARCHAR(255),
  organization VARCHAR(255),
  user_agent TEXT NOT NULL,
  browser_name VARCHAR(50),
  browser_version VARCHAR(20),
  browser_engine VARCHAR(50),
  os_name VARCHAR(50),
  os_version VARCHAR(20),
  os_architecture VARCHAR(20),
  device_type VARCHAR(20), -- desktop, mobile, tablet
  device_brand VARCHAR(50),
  device_model VARCHAR(100),
  screen_resolution VARCHAR(20),
  screen_orientation VARCHAR(20),
  connection_type VARCHAR(20), -- wifi, 4g, 5g, cable
  connection_speed VARCHAR(20),
  is_proxy BOOLEAN DEFAULT false,
  is_vpn BOOLEAN DEFAULT false,
  is_tor BOOLEAN DEFAULT false,
  language VARCHAR(10),
  accept_language TEXT,
  viewport_width INTEGER,
  viewport_height INTEGER,
  color_depth INTEGER,
  pixel_ratio DECIMAL(3,2),
  time_on_page INTEGER DEFAULT 0,
  bounce_rate BOOLEAN DEFAULT false,
  exit_page BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 5. visitor_sessions
```sql
CREATE TABLE visitor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) UNIQUE NOT NULL,
  visitor_id VARCHAR(255),
  first_visit TIMESTAMP NOT NULL,
  last_visit TIMESTAMP NOT NULL,
  total_pages INTEGER DEFAULT 1,
  total_time INTEGER DEFAULT 0,
  entry_page VARCHAR(500) NOT NULL,
  exit_page VARCHAR(500),
  traffic_source VARCHAR(50) NOT NULL,
  traffic_medium VARCHAR(50),
  traffic_campaign VARCHAR(100),
  country VARCHAR(2),
  city VARCHAR(100),
  device_type VARCHAR(20),
  browser_name VARCHAR(50),
  os_name VARCHAR(50),
  is_converted BOOLEAN DEFAULT false,
  conversion_value DECIMAL(10,2) DEFAULT 0,
  conversion_goal VARCHAR(100),
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  utm_term VARCHAR(100),
  utm_content VARCHAR(100),
  gclid VARCHAR(255),
  fbclid VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 6. visitor_analytics
```sql
CREATE TABLE visitor_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(15,2) NOT NULL,
  metric_type VARCHAR(50) NOT NULL, -- traffic, conversion, engagement, geographic
  dimension VARCHAR(100),
  dimension_value VARCHAR(255),
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 7. sales_metrics
```sql
CREATE TABLE sales_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(10,2) NOT NULL,
  metric_type VARCHAR(50) NOT NULL, -- conversion, revenue, activity
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  user_id UUID REFERENCES users(id),
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🎯 Funcionalidades do Módulo

### 1. Monitoramento Avançado de Visitantes

#### Rastreamento de Acessos
- **Páginas Públicas**: Monitoramento de todas as páginas públicas
- **Tipos de Acesso**: Orgânico, redes sociais, ads, referral
- **Sessões**: Rastreamento completo de sessões
- **Jornada do Usuário**: Mapeamento da jornada completa

#### Dados de Geolocalização
- **IP v4 e v6**: Rastreamento de endereços IP
- **Geolocalização**: País, estado, cidade, coordenadas
- **ASN**: Autonomous System Number
- **ISP**: Provedor de internet
- **Timezone**: Fuso horário

#### Dados do Dispositivo
- **Navegador**: Tipo, versão, engine
- **Sistema Operacional**: OS, versão, arquitetura
- **Dispositivo**: Desktop, mobile, tablet
- **Resolução**: Resolução de tela
- **Orientação**: Portrait, landscape

#### Dados de Rede
- **Velocidade**: Velocidade de conexão estimada
- **Tipo de Conexão**: WiFi, 4G, 5G, cabo
- **Proxy/VPN**: Detecção de proxy/VPN
- **Tor**: Detecção de rede Tor

### 2. Gestão de Leads

#### Captura de Leads
- **Formulários**: Formulários de captura
- **Landing Pages**: Páginas de destino
- **Referrals**: Leads de referência
- **Social Media**: Leads de redes sociais
- **Website**: Leads do website

#### Qualificação de Leads
- **Scoring Automático**: Pontuação automática
- **Critérios de Qualificação**: Critérios configuráveis
- **Segmentação**: Segmentação por perfil
- **Priorização**: Priorização automática

#### Gestão de Status
- **Novo**: Lead recém-capturado
- **Qualificado**: Lead qualificado
- **Contatado**: Lead contatado
- **Convertido**: Lead convertido
- **Perdido**: Lead perdido

### 3. Análise de Tráfego

#### Análise de Fontes de Tráfego
- **Tráfego Orgânico**: Busca orgânica, SEO
- **Redes Sociais**: Facebook, Instagram, Twitter, LinkedIn
- **Anúncios**: Google Ads, Facebook Ads, outros
- **Referral**: Links de referência, parcerias
- **Direto**: Acesso direto ao site

#### Análise Geográfica
- **Países**: Análise por país
- **Estados/Regiões**: Análise regional
- **Cidades**: Análise por cidade
- **Fusos Horários**: Análise temporal

#### Análise de Dispositivos
- **Desktop vs Mobile**: Comparação de dispositivos
- **Navegadores**: Análise por navegador
- **Sistemas Operacionais**: Análise por OS
- **Resoluções**: Análise de resoluções

#### Análise de Comportamento
- **Páginas Mais Visitadas**: Páginas populares
- **Tempo de Permanência**: Tempo médio por página
- **Taxa de Rejeição**: Análise de bounce rate
- **Jornada do Usuário**: Fluxo de navegação

### 4. Automação de Follow-up

#### Sequências de Email
- **Welcome Series**: Sequência de boas-vindas
- **Nurturing**: Sequência de nutrição
- **Re-engagement**: Sequência de re-engajamento
- **Follow-up**: Sequência de follow-up

#### Agendamento de Atividades
- **Ligações**: Agendamento de ligações
- **Reuniões**: Agendamento de reuniões
- **Demos**: Agendamento de demos
- **Propostas**: Agendamento de propostas

#### Lembretes e Notificações
- **Email**: Notificações por email
- **SMS**: Notificações por SMS
- **Push**: Notificações push
- **Telegram**: Notificações via Telegram

### 5. Análise de Vendas

#### Métricas de Conversão
- **Taxa de Conversão**: % de leads convertidos
- **Tempo de Conversão**: Tempo médio de conversão
- **Valor Médio**: Valor médio de venda
- **Pipeline**: Pipeline de vendas

#### Análise de Performance
- **Performance por Vendedor**: Performance individual
- **Performance por Fonte**: Performance por fonte
- **Performance por Período**: Performance temporal
- **ROI de Campanhas**: ROI de campanhas

#### Relatórios de Vendas
- **Relatório de Leads**: Relatório de leads
- **Relatório de Atividades**: Relatório de atividades
- **Relatório de Oportunidades**: Relatório de oportunidades
- **Relatório de Performance**: Relatório de performance

### 6. Gestão de Oportunidades

#### Pipeline de Vendas
- **Prospecção**: Fase de prospecção
- **Qualificação**: Fase de qualificação
- **Proposta**: Fase de proposta
- **Negociação**: Fase de negociação
- **Fechamento**: Fase de fechamento

#### Gestão de Estágios
- **Movimentação**: Movimentação entre estágios
- **Probabilidade**: Probabilidade de fechamento
- **Valor**: Valor da oportunidade
- **Prazo**: Prazo de fechamento

#### Análise de Pipeline
- **Volume**: Volume de oportunidades
- **Valor**: Valor total do pipeline
- **Velocidade**: Velocidade de fechamento
- **Previsão**: Previsão de vendas

### 4. Sistema de Notificações

#### Notificações de Leads
- **Novo Lead**: Notificação de novo lead capturado
- **Lead Qualificado**: Notificação de lead qualificado
- **Lead Convertido**: Notificação de conversão de lead
- **Lead Perdido**: Notificação de lead perdido

#### Notificações de Visitantes
- **Visitante Importante**: Notificação de visitante de alto valor
- **Tráfego Anômalo**: Notificação de tráfego anômalo
- **Conversão de Visitante**: Notificação de conversão
- **Retorno de Visitante**: Notificação de retorno

#### Notificações de Vendas
- **Venda Realizada**: Notificação de venda concluída
- **Meta Alcançada**: Notificação de meta de vendas atingida
- **Oportunidade Perdida**: Notificação de oportunidade perdida
- **Follow-up Necessário**: Notificação de follow-up

#### Notificações de Relatórios
- **Relatório de Vendas**: Notificação de relatório de vendas
- **Relatório de Leads**: Notificação de relatório de leads
- **Relatório de Tráfego**: Notificação de relatório de tráfego
- **Análise de Performance**: Notificação de análise de performance

## 🔧 APIs do Módulo

### 1. Visitor Tracking APIs

#### POST /api/vendas/tracking/visitor
Registrar visita

```typescript
interface TrackVisitorRequest {
  sessionId: string;
  visitorId?: string;
  pageUrl: string;
  pageTitle?: string;
  referrerUrl?: string;
  trafficSource: string;
  trafficMedium?: string;
  trafficCampaign?: string;
  userAgent: string;
  viewportWidth?: number;
  viewportHeight?: number;
  language?: string;
  acceptLanguage?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  gclid?: string;
  fbclid?: string;
  metadata?: Record<string, any>;
}

interface TrackVisitorResponse {
  id: string;
  status: string;
  message: string;
}
```

#### GET /api/vendas/tracking/visitors
Listar visitantes

```typescript
interface VisitorTrackingResponse {
  id: string;
  sessionId: string;
  visitorId?: string;
  pageUrl: string;
  pageTitle?: string;
  referrerUrl?: string;
  trafficSource: string;
  trafficMedium?: string;
  trafficCampaign?: string;
  ipAddress: string;
  ipVersion: string;
  country?: string;
  countryName?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  asn?: string;
  asnName?: string;
  isp?: string;
  organization?: string;
  browserName?: string;
  browserVersion?: string;
  browserEngine?: string;
  osName?: string;
  osVersion?: string;
  osArchitecture?: string;
  deviceType?: string;
  deviceBrand?: string;
  deviceModel?: string;
  screenResolution?: string;
  screenOrientation?: string;
  connectionType?: string;
  connectionSpeed?: string;
  isProxy: boolean;
  isVpn: boolean;
  isTor: boolean;
  language?: string;
  viewportWidth?: number;
  viewportHeight?: number;
  colorDepth?: number;
  pixelRatio?: number;
  timeOnPage: number;
  bounceRate: boolean;
  exitPage: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
}
```

#### GET /api/vendas/tracking/sessions
Listar sessões

```typescript
interface VisitorSessionResponse {
  id: string;
  sessionId: string;
  visitorId?: string;
  firstVisit: string;
  lastVisit: string;
  totalPages: number;
  totalTime: number;
  entryPage: string;
  exitPage?: string;
  trafficSource: string;
  trafficMedium?: string;
  trafficCampaign?: string;
  country?: string;
  city?: string;
  deviceType?: string;
  browserName?: string;
  osName?: string;
  isConverted: boolean;
  conversionValue: number;
  conversionGoal?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  gclid?: string;
  fbclid?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
```

#### GET /api/vendas/tracking/analytics
Análise de visitantes

```typescript
interface VisitorAnalyticsResponse {
  period: {
    start: string;
    end: string;
  };
  totalVisitors: number;
  totalSessions: number;
  totalPageViews: number;
  averageSessionDuration: number;
  bounceRate: number;
  conversionRate: number;
  trafficSources: TrafficSourceAnalytics[];
  geographicData: GeographicAnalytics[];
  deviceData: DeviceAnalytics[];
  browserData: BrowserAnalytics[];
  topPages: PageAnalytics[];
  realTimeVisitors: number;
  trends: TrendData[];
}

interface TrafficSourceAnalytics {
  source: string;
  medium?: string;
  campaign?: string;
  visitors: number;
  sessions: number;
  pageViews: number;
  conversionRate: number;
  averageSessionDuration: number;
}

interface GeographicAnalytics {
  country: string;
  countryName: string;
  region?: string;
  city?: string;
  visitors: number;
  sessions: number;
  conversionRate: number;
}

interface DeviceAnalytics {
  deviceType: string;
  visitors: number;
  sessions: number;
  conversionRate: number;
  averageSessionDuration: number;
}

interface BrowserAnalytics {
  browserName: string;
  browserVersion?: string;
  visitors: number;
  sessions: number;
  conversionRate: number;
}

interface PageAnalytics {
  pageUrl: string;
  pageTitle?: string;
  pageViews: number;
  uniqueVisitors: number;
  averageTimeOnPage: number;
  bounceRate: number;
  exitRate: number;
}
```

### 2. Leads APIs

#### GET /api/vendas/leads
Listar leads

```typescript
interface LeadResponse {
  id: string;
  email: string;
  name: string;
  phone?: string;
  company?: string;
  source: string;
  status: string;
  score: number;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### POST /api/vendas/leads
Criar novo lead

```typescript
interface CreateLeadRequest {
  email: string;
  name?: string;
  phone?: string;
  company?: string;
  source: string;
  assignedTo?: string;
  metadata?: Record<string, any>;
}

interface CreateLeadResponse {
  id: string;
  status: string;
  score: number;
  message: string;
}
```

#### PUT /api/vendas/leads/{id}
Atualizar lead

```typescript
interface UpdateLeadRequest {
  name?: string;
  phone?: string;
  company?: string;
  status?: string;
  assignedTo?: string;
  metadata?: Record<string, any>;
}

interface UpdateLeadResponse {
  id: string;
  status: string;
  message: string;
}
```

#### DELETE /api/vendas/leads/{id}
Excluir lead

```typescript
interface DeleteLeadResponse {
  id: string;
  status: string;
  message: string;
}
```

### 2. Activities APIs

#### GET /api/vendas/activities
Listar atividades

```typescript
interface ActivityResponse {
  id: string;
  leadId: string;
  userId: string;
  type: string;
  subject: string;
  description: string;
  outcome: string;
  scheduledAt?: string;
  completedAt?: string;
  createdAt: string;
}
```

#### POST /api/vendas/activities
Criar atividade

```typescript
interface CreateActivityRequest {
  leadId: string;
  type: string;
  subject: string;
  description: string;
  scheduledAt?: string;
  metadata?: Record<string, any>;
}

interface CreateActivityResponse {
  id: string;
  status: string;
  message: string;
}
```

#### PUT /api/vendas/activities/{id}
Atualizar atividade

```typescript
interface UpdateActivityRequest {
  subject?: string;
  description?: string;
  outcome?: string;
  scheduledAt?: string;
  completedAt?: string;
  metadata?: Record<string, any>;
}

interface UpdateActivityResponse {
  id: string;
  status: string;
  message: string;
}
```

### 3. Opportunities APIs

#### GET /api/vendas/opportunities
Listar oportunidades

```typescript
interface OpportunityResponse {
  id: string;
  leadId: string;
  userId: string;
  title: string;
  description: string;
  value: number;
  currency: string;
  stage: string;
  probability: number;
  expectedCloseDate?: string;
  actualCloseDate?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}
```

#### POST /api/vendas/opportunities
Criar oportunidade

```typescript
interface CreateOpportunityRequest {
  leadId: string;
  title: string;
  description?: string;
  value: number;
  currency: string;
  stage: string;
  probability: number;
  expectedCloseDate?: string;
  metadata?: Record<string, any>;
}

interface CreateOpportunityResponse {
  id: string;
  status: string;
  message: string;
}
```

#### PUT /api/vendas/opportunities/{id}
Atualizar oportunidade

```typescript
interface UpdateOpportunityRequest {
  title?: string;
  description?: string;
  value?: number;
  stage?: string;
  probability?: number;
  expectedCloseDate?: string;
  actualCloseDate?: string;
  status?: string;
  metadata?: Record<string, any>;
}

interface UpdateOpportunityResponse {
  id: string;
  status: string;
  message: string;
}
```

### 4. Analytics APIs

#### GET /api/vendas/analytics/conversion
Análise de conversão

```typescript
interface ConversionAnalyticsResponse {
  period: {
    start: string;
    end: string;
  };
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  averageConversionTime: number;
  conversionBySource: SourceConversion[];
  conversionByUser: UserConversion[];
  conversionByPeriod: PeriodConversion[];
}
```

#### GET /api/vendas/analytics/pipeline
Análise de pipeline

```typescript
interface PipelineAnalyticsResponse {
  totalOpportunities: number;
  totalValue: number;
  opportunitiesByStage: StageOpportunity[];
  valueByStage: StageValue[];
  averageDealSize: number;
  averageDealTime: number;
  winRate: number;
  lossRate: number;
}
```

#### GET /api/vendas/analytics/performance
Análise de performance

```typescript
interface PerformanceAnalyticsResponse {
  period: {
    start: string;
    end: string;
  };
  totalActivities: number;
  activitiesByType: TypeActivity[];
  activitiesByUser: UserActivity[];
  averageResponseTime: number;
  followUpRate: number;
  meetingRate: number;
  demoRate: number;
}
```

## 🤖 Agente de Vendas

### Capacidades

#### visitor_tracking
- Monitoramento de visitantes
- Análise de tráfego
- Rastreamento de sessões
- Análise geográfica

#### traffic_analysis
- Análise de fontes de tráfego
- Análise de dispositivos
- Análise de comportamento
- Análise de jornada do usuário

#### leads
- Gestão de leads
- Qualificação automática
- Segmentação
- Priorização

#### prospects
- Gestão de prospects
- Qualificação avançada
- Scoring automático
- Nurturing

#### sales
- Análise de vendas
- Previsão de vendas
- Otimização de pipeline
- Gestão de oportunidades

#### followup
- Automação de follow-up
- Sequências de email
- Agendamento de atividades
- Lembretes automáticos

#### conversion
- Análise de conversão
- Otimização de conversão
- A/B testing
- Relatórios de conversão

#### notifications
- Gestão de notificações de vendas
- Integração com sistema central de notificações
- Templates de notificação de vendas
- Configuração de preferências de notificação

### Comandos

```bash
/track_visitors - Rastrear visitantes
/analyze_traffic - Analisar tráfego
/analyze_geographic - Analisar dados geográficos
/analyze_devices - Analisar dispositivos
/qualify_leads - Qualificar leads
/followup_prospects - Follow-up de prospects
/analyze_sales - Analisar performance de vendas
/generate_sales_report - Gerar relatório de vendas
/optimize_conversion - Otimizar conversão
/update_pipeline - Atualizar pipeline
/analyze_performance - Analisar performance
/generate_forecast - Gerar previsão de vendas
/optimize_followup - Otimizar follow-up
/update_qualification - Atualizar qualificação
/send_lead_notification - Enviar notificação de lead
/send_visitor_notification - Enviar notificação de visitante
/send_sales_notification - Enviar notificação de venda
/send_report_notification - Enviar notificação de relatório
```

## 📊 Dashboard de Vendas

### Métricas Principais
- **Visitantes Únicos**: Número de visitantes únicos
- **Sessões**: Número total de sessões
- **Páginas Visualizadas**: Total de páginas visualizadas
- **Taxa de Conversão**: % de visitantes convertidos
- **Tempo Médio de Sessão**: Tempo médio por sessão
- **Taxa de Rejeição**: % de sessões com bounce
- **Total de Leads**: Número total de leads
- **Pipeline Total**: Valor total do pipeline

### Gráficos de Visitantes
- **Tráfego por Fonte**: Gráfico de pizza (orgânico, social, ads, referral, direto)
- **Visitantes por País**: Gráfico de barras
- **Dispositivos**: Gráfico de pizza (desktop, mobile, tablet)
- **Navegadores**: Gráfico de barras
- **Páginas Mais Visitadas**: Gráfico de barras horizontais
- **Tráfego por Período**: Gráfico de linha temporal

### Gráficos de Vendas
- **Leads por Fonte**: Gráfico de pizza
- **Conversão por Período**: Gráfico de linha
- **Pipeline por Estágio**: Gráfico de barras
- **Performance por Vendedor**: Gráfico de barras

### Alertas
- **Alto Tráfego**: Alertas de picos de tráfego
- **Baixa Conversão**: Alertas de baixa conversão
- **Leads Não Qualificados**: Alertas de leads
- **Atividades Pendentes**: Alertas de atividades
- **Oportunidades Atrasadas**: Alertas de oportunidades
- **Meta Não Atingida**: Alertas de meta

## 🔄 Fluxo de Trabalho

### 1. Monitoramento de Visitantes
```
Acesso à Página → Coleta de Dados → Geolocalização → Análise de Dispositivo → Armazenamento
```

### 2. Análise de Tráfego
```
Dados Coletados → Processamento → Análise de Fonte → Segmentação → Relatórios
```

### 3. Captura de Lead
```
Formulário → Validação → Criação de lead → Qualificação → Atribuição
```

### 4. Qualificação de Lead
```
Lead → Critérios de qualificação → Scoring → Segmentação → Priorização
```

### 5. Follow-up de Lead
```
Lead qualificado → Sequência de email → Agendamento → Atividade → Conversão
```

### 6. Gestão de Oportunidade
```
Lead convertido → Criação de oportunidade → Pipeline → Negociação → Fechamento
```

## 🧪 Testes

### Testes Unitários
```bash
# Testes de monitoramento de visitantes
bun test src/admin/departments/vendas/visitor-tracking/

# Testes de análise de tráfego
bun test src/admin/departments/vendas/traffic-analysis/

# Testes de leads
bun test src/admin/departments/vendas/leads/

# Testes de atividades
bun test src/admin/departments/vendas/activities/

# Testes de oportunidades
bun test src/admin/departments/vendas/opportunities/
```

### Testes de Integração
```bash
# Testes de integração com Better-Auth
bun test tests/integration/vendas-auth.test.ts

# Testes de integração com Telegram
bun test tests/integration/vendas-telegram.test.ts
```

## 🚀 Deploy

### Variáveis de Ambiente
```env
# Vendas
VENDAS_LEAD_CACHE_TTL=1800
VENDAS_ACTIVITY_CACHE_TTL=3600
VENDAS_OPPORTUNITY_CACHE_TTL=7200
VENDAS_ANALYTICS_CACHE_TTL=3600

# Visitor Tracking
VISITOR_TRACKING_CACHE_TTL=900
VISITOR_SESSION_CACHE_TTL=1800
VISITOR_ANALYTICS_CACHE_TTL=3600
GEOIP_API_KEY=your-geoip-api-key
GEOIP_API_URL=https://api.geoip.com
USER_AGENT_PARSING=true
IP_ANONYMIZATION=false
```

### Docker
```dockerfile
# Adicionar ao Dockerfile existente
COPY src/admin/departments/vendas/ ./src/admin/departments/vendas/
RUN bun install
```

## 📈 Monitoramento

### Métricas de Performance
- **Response Time**: < 150ms para APIs
- **Throughput**: 300+ requests/min
- **Error Rate**: < 0.1%
- **Uptime**: 99.9%

### Alertas
- **Alta Taxa de Conversão**: > 25%
- **Baixa Taxa de Conversão**: < 5%
- **Atividades Pendentes**: > 10
- **Oportunidades Atrasadas**: > 5

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO