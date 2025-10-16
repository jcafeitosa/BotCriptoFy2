# 🚀 Roadmap: Admin & Departments FIRST - BotCriptoFy2

**Data**: 2025-10-16
**Decisão**: Completar módulos administrativos ANTES de Trading Core
**Razão**: Construir plataforma SaaS robusta com admin completo primeiro

---

## 📊 ESTADO ATUAL

### ✅ Módulos Completos (9)

| Módulo | % | Status |
|--------|---|--------|
| auth | 90% | ✅ Funcional |
| users | 85% | ✅ Funcional |
| tenants | 80% | ✅ Funcional |
| departments | 75% | ✅ Funcional |
| security | 80% | ✅ Funcional |
| audit | 85% | ✅ Funcional |
| notifications | 80% | ✅ Funcional |
| configurations | 70% | ✅ Funcional |
| rate-limiting | 100% | ✅ Funcional |

### ⚠️ Módulos Parciais (7)

| Módulo | % | Tem Schema? | Tem Routes? | Tem Services? |
|--------|---|-------------|-------------|---------------|
| **subscriptions** | 40% | ✅ | ✅ | ✅ |
| financial | 30% | ✅ | ⚠️ | ⚠️ |
| sales | 25% | ✅ | ⚠️ | ⚠️ |
| ceo | 20% | ✅ | ⚠️ | ⚠️ |
| support | 20% | ✅ | ⚠️ | ⚠️ |
| marketing | 15% | ✅ | ⚠️ | ⚠️ |
| documents | 10% | ✅ | ⚠️ | ⚠️ |

---

## 🎯 ROADMAP CONSOLIDADO (Admin First)

### FASE A: Completar Módulos Administrativos Core (3-4 semanas)

#### A.1 Subscriptions Module (ALTA prioridade) - 1 semana ✅

**Status**: ✅ **JÁ COMPLETO!** (100% - Stripe + Better-Auth integrado)

**Implementado**:
- ✅ Schema completo (4 tabelas)
- ✅ Services (plans, management, features)
- ✅ Routes (public, authenticated, usage, admin)
- ✅ Validators (Zod)
- ✅ Tests
- ✅ Stripe Integration (Better-Auth plugin)
- ✅ 4 planos (Free, Pro, Enterprise, Internal)
- ✅ Multi-gateway architecture

**Melhorias Opcionais**:
- [ ] Webhooks sync entre Better-Auth e Subscriptions module
- [ ] Usage tracking real-time
- [ ] Analytics dashboard (MRR, ARR, churn)

---

#### A.2 Financial Module (ALTA prioridade) - 1 semana

**Objetivo**: Sistema completo de gestão financeira

**Status Atual**: 30% (schema exists, services parciais)

**Specs do Doc** (financeiro.md - 19K):
- Double-entry accounting (ledger)
- Invoice generation (PDF)
- Tax calculation (VAT, GST, sales tax)
- Payment reconciliation
- Expense tracking
- Budget management
- Financial reports (P&L, Balance Sheet, Cash Flow)
- Multi-currency accounting

**Tarefas**:
1. **Schema Review e Extensão** (1 dia)
   - [ ] Revisar schema atual
   - [ ] Adicionar tabelas: `invoices`, `expenses`, `budgets`, `ledger_entries`
   - [ ] Adicionar campos de tax tracking
   - [ ] Migration

2. **Services Implementation** (2 dias)
   - [ ] `InvoiceService` - Geração e gestão de invoices
   - [ ] `ExpenseService` - Tracking de despesas
   - [ ] `LedgerService` - Double-entry accounting
   - [ ] `TaxService` - Cálculo de impostos
   - [ ] `BudgetService` - Gestão de budgets
   - [ ] `ReportService` - Financial reports

3. **Routes & Controllers** (1 dia)
   - [ ] `/api/financial/invoices` - CRUD invoices
   - [ ] `/api/financial/expenses` - CRUD expenses
   - [ ] `/api/financial/ledger` - View ledger
   - [ ] `/api/financial/reports` - Generate reports
   - [ ] `/api/financial/budgets` - CRUD budgets

4. **Features Avançadas** (1 dia)
   - [ ] Invoice PDF generation (puppeteer ou pdfkit)
   - [ ] Recurring invoices
   - [ ] Payment reminders
   - [ ] Tax reports por região
   - [ ] Multi-currency conversion (API de câmbio)

**Deliverables**:
- `src/modules/financial/services/` (6 services)
- `src/modules/financial/routes/` (5 route files)
- Invoice templates (HTML + PDF)
- Financial reports (P&L, Balance Sheet, Cash Flow)

---

#### A.3 Support/SAC Module (MÉDIA prioridade) - 3-4 dias

**Objetivo**: Sistema completo de atendimento ao cliente

**Status Atual**: 20% (schema exists)

**Specs do Doc** (sac.md - 16K):
- Ticketing system
- SLA tracking
- Knowledge base (FAQ, articles)
- Live chat (WebSocket)
- Ticket prioritization
- Customer satisfaction (CSAT surveys)
- Agent performance metrics

**Tarefas**:
1. **Schema Review** (4h)
   - [ ] Revisar schema: `tickets`, `ticket_messages`, `kb_articles`, `csat_surveys`
   - [ ] Adicionar campos: SLA, priority, tags
   - [ ] Migration

2. **Services Implementation** (1.5 dias)
   - [ ] `TicketService` - CRUD tickets, assignment, status
   - [ ] `MessageService` - Ticket messages, attachments
   - [ ] `KnowledgeBaseService` - Articles, search
   - [ ] `SLAService` - SLA tracking, violations
   - [ ] `CSATService` - Surveys, ratings

3. **Routes & WebSocket** (1 dia)
   - [ ] `/api/support/tickets` - CRUD tickets
   - [ ] `/api/support/kb` - Knowledge base
   - [ ] `/api/support/sla` - SLA dashboard
   - [ ] WebSocket `/ws/support/chat` - Live chat

4. **Features** (1 dia)
   - [ ] Email notifications (new ticket, response)
   - [ ] Auto-assignment por load balancing
   - [ ] Ticket escalation (SLA breach)
   - [ ] CSAT surveys automáticas
   - [ ] Agent performance dashboard

**Deliverables**:
- `src/modules/support/services/` (5 services)
- `src/modules/support/routes/` (4 route files)
- WebSocket chat server
- Knowledge base search (full-text)

---

#### A.4 Documents Module (BAIXA prioridade) - 2-3 dias

**Objetivo**: Document Management System (DMS)

**Status Atual**: 10% (schema exists)

**Specs do Doc** (documentos.md - 16K):
- Document upload/download
- Versioning
- Access control
- Templates
- E-signatures (opcional)
- Full-text search

**Tarefas**:
1. **Schema Review** (2h)
   - [ ] Revisar schema: `documents`, `document_versions`, `document_templates`
   - [ ] Adicionar campos: file_hash, mime_type, access_control
   - [ ] Migration

2. **Services Implementation** (1 dia)
   - [ ] `DocumentService` - Upload, download, versioning
   - [ ] `TemplateService` - Document templates
   - [ ] `SearchService` - Full-text search (PostgreSQL)
   - [ ] `AccessControlService` - Permissions

3. **Routes & File Handling** (1 dia)
   - [ ] `/api/documents` - CRUD documents
   - [ ] `/api/documents/upload` - File upload (multipart)
   - [ ] `/api/documents/download/:id` - File download
   - [ ] `/api/documents/search` - Full-text search
   - [ ] `/api/documents/templates` - CRUD templates

4. **Storage** (0.5 dia)
   - [ ] Local file storage (`/storage/documents/`)
   - [ ] File naming strategy (UUID + extension)
   - [ ] File validation (size, type)
   - [ ] Virus scanning (opcional - ClamAV)

**Deliverables**:
- `src/modules/documents/services/` (4 services)
- `src/modules/documents/routes/` (2 route files)
- File upload/download working
- Full-text search

---

### FASE B: Módulos de Negócio (3-4 semanas)

#### B.1 Sales Module (MÉDIA prioridade) - 1 semana

**Objetivo**: CRM e gestão de vendas

**Status Atual**: 25% (schema exists, services parciais)

**Specs do Doc** (vendas.md - 42K):
- CRM (leads, contacts, deals)
- Sales pipeline (stages, conversion)
- Visitor tracking (analytics, heatmaps)
- Lead scoring (ML-based)
- Email campaigns
- Sales reports
- Referral program integration

**Tarefas**:
1. **CRM Implementation** (2 dias)
   - [ ] `LeadService` - CRUD leads, scoring
   - [ ] `ContactService` - CRUD contacts
   - [ ] `DealService` - Pipeline management
   - [ ] `ActivityService` - Call logs, emails, meetings

2. **Analytics & Tracking** (2 dias)
   - [ ] `VisitorTrackingService` - Page views, sessions
   - [ ] `AnalyticsService` - Conversion funnel
   - [ ] Lead scoring algorithm (ML - opcional)
   - [ ] Heatmaps (opcional - integrar Hotjar/Mixpanel)

3. **Campaigns** (1 dia)
   - [ ] `CampaignService` - Email drip campaigns
   - [ ] Integration com notification system
   - [ ] A/B testing (opcional)

4. **Routes & Reports** (1 dia)
   - [ ] `/api/sales/leads` - CRUD leads
   - [ ] `/api/sales/deals` - Pipeline
   - [ ] `/api/sales/reports` - Conversion rates, MRR growth
   - [ ] `/api/sales/tracking` - Visitor analytics

**Deliverables**:
- `src/modules/sales/services/` (6 services)
- `src/modules/sales/routes/` (5 route files)
- CRM dashboard data
- Sales reports

---

#### B.2 Marketing Module (BAIXA prioridade) - 1 semana

**Objetivo**: Referral, gamification, rewards

**Status Atual**: 15% (schema exists)

**Specs do Doc** (marketing-referral-gamification.md - 17K):
- Referral program (invite friends, earn rewards)
- Gamification (points, badges, levels)
- Leaderboards (top traders, affiliates)
- Rewards marketplace (redeem points)
- Email marketing integration
- Social media sharing
- Affiliate tracking

**Tarefas**:
1. **Referral System** (2 dias)
   - [ ] `ReferralService` - Generate codes, track referrals
   - [ ] `RewardService` - Points, payouts
   - [ ] `AffiliateService` - Commission tracking

2. **Gamification** (2 dias)
   - [ ] `GamificationService` - Points, badges, levels
   - [ ] `LeaderboardService` - Rankings, filters
   - [ ] Achievement system (triggers, rewards)

3. **Rewards Marketplace** (1 dia)
   - [ ] `MarketplaceService` - Redeem points
   - [ ] Rewards catalog (discounts, freebies)
   - [ ] Redemption history

4. **Routes** (1 dia)
   - [ ] `/api/marketing/referrals` - Generate code, stats
   - [ ] `/api/marketing/gamification` - Points, badges
   - [ ] `/api/marketing/leaderboard` - Rankings
   - [ ] `/api/marketing/rewards` - Marketplace

**Deliverables**:
- `src/modules/marketing/services/` (5 services)
- Gamification engine
- Leaderboard API

---

#### B.3 CEO Dashboard Module (BAIXA prioridade) - 3-4 dias

**Objetivo**: Executive KPI dashboard

**Status Atual**: 20% (schema exists)

**Specs do Doc** (ceo.md - 19K):
- Executive KPIs (MRR, ARR, CAC, LTV, churn)
- Real-time metrics
- Growth charts (MoM, YoY)
- Cohort analysis
- Funnel visualization
- Alert system
- Export to Excel/PDF

**Tarefas**:
1. **KPI Service** (2 dias)
   - [ ] `KPIService` - Calculate MRR, ARR, CAC, LTV, churn
   - [ ] `CohortService` - Cohort analysis
   - [ ] `FunnelService` - Acquisition → conversion funnel
   - [ ] Real-time data aggregation

2. **Dashboard API** (1 dia)
   - [ ] `/api/ceo/kpis` - All KPIs
   - [ ] `/api/ceo/growth` - Growth charts
   - [ ] `/api/ceo/cohorts` - Cohort data
   - [ ] `/api/ceo/funnel` - Funnel data

3. **Alerts & Reports** (1 dia)
   - [ ] `AlertService` - Threshold alerts (email, push)
   - [ ] `ReportService` - Scheduled reports (daily, weekly)
   - [ ] Export to Excel (xlsx)
   - [ ] Export to PDF (puppeteer)

**Deliverables**:
- `src/modules/ceo/services/kpi.service.ts`
- KPI calculations (real-time)
- Dashboard API
- Scheduled reports

---

### FASE C: Completar Módulos Existentes a 100% (1 semana)

**Objetivo**: Elevar módulos de 70-90% para 100%

#### C.1 Configurations Module (70% → 100%) - 1 dia

**Missing**:
- [ ] Hot reload (watch config changes)
- [ ] Config versioning
- [ ] Rollback feature
- [ ] Config templates

---

#### C.2 Departments Module (75% → 100%) - 1 dia

**Missing**:
- [ ] Department budget tracking
- [ ] Department performance metrics
- [ ] Hierarchy visualization API

---

#### C.3 Security Module (80% → 100%) - 1 dia

**Missing** (specs: seguranca.md - 27K):
- [ ] **2FA enforcement** (TOTP, SMS)
- [ ] **Biometric auth** (WebAuthn, fingerprint)
- [ ] **IP whitelist/blacklist**
- [ ] **Device fingerprinting**
- [ ] **Fraud detection** (ML-based)
- [ ] **Withdrawal whitelist**

---

#### C.4 Audit Module (85% → 100%) - 1 dia

**Missing**:
- [ ] Audit report generation (compliance)
- [ ] Anomaly detection (unusual patterns)
- [ ] Audit retention policies (auto-delete old logs)

---

#### C.5 Notifications Module (80% → 100%) - 1 dia

**Missing** (specs: notificacoes*.md - 62K):
- [ ] **Telegram provider** configuration
- [ ] **Push notification** (FCM/APNs)
- [ ] **Notification preferences** per user
- [ ] **Notification batching** (reduce spam)
- [ ] **Notification templates** editor

---

### FASE D: Módulos Avançados (Opcional - 2-3 semanas)

#### D.1 Banco Module (banco.md - 70K) - 2 semanas

**Funcionalidades**:
- Multi-currency accounts (50+ moedas)
- Virtual IBAN generation
- Wire transfer (SWIFT, SEPA)
- Crypto deposits/withdrawals
- Balance reconciliation
- Transaction categorization
- Tax reporting
- Fraud detection

**Complexidade**: ALTA (integrações bancárias)
**Valor**: MUITO ALTO (monetização)

---

#### D.2 P2P Module (p2p.md - 48K) - 2 semanas

**Funcionalidades**:
- P2P marketplace (buy/sell crypto)
- Escrow system
- Reputation system
- Dispute resolution
- Payment methods (PIX, Bank Transfer)
- KYC verification
- Chat system

**Complexidade**: ALTA (escrow, disputes)
**Valor**: ALTO (nova revenue stream)

---

## 📊 CRONOGRAMA ADMIN-FIRST

| Fase | Descrição | Duração | Prioridade |
|------|-----------|---------|------------|
| **A** | Módulos Admin Core | 3-4 semanas | 🔴 ALTA |
| **A.1** | ✅ Subscriptions | ✅ Completo | 🔴 |
| **A.2** | Financial | 1 semana | 🔴 |
| **A.3** | Support/SAC | 3-4 dias | 🟡 |
| **A.4** | Documents | 2-3 dias | 🟢 |
| **B** | Módulos de Negócio | 3-4 semanas | 🟡 MÉDIA |
| **B.1** | Sales (CRM) | 1 semana | 🟡 |
| **B.2** | Marketing | 1 semana | 🟢 |
| **B.3** | CEO Dashboard | 3-4 dias | 🟢 |
| **C** | Completar 70-90% → 100% | 1 semana | 🟡 |
| **D** | Banco + P2P (Opcional) | 2-3 semanas | 🟢 |

**Total Admin-First**: **7-12 semanas** (sem Banco/P2P)
**Total Completo**: **11-15 semanas** (com Banco/P2P)

---

## 🎯 PRÓXIMA TAREFA RECOMENDADA

### 🏆 OPÇÃO 1: Financial Module (RECOMENDADO)

**Por quê?**
- ✅ ALTA prioridade (billing, invoices, taxes)
- ✅ Integra com Subscriptions (já completo)
- ✅ Monetização (invoicing, accounting)
- ✅ Specs detalhadas (19K)

**Duração**: 1 semana
**Resultado**: Sistema financeiro completo

---

### 🥈 OPÇÃO 2: Support/SAC Module

**Por quê?**
- ✅ Importante para clientes (atendimento)
- ✅ SLA tracking
- ✅ Knowledge base
- ✅ Live chat (WebSocket)

**Duração**: 3-4 dias
**Resultado**: Sistema de support completo

---

### 🥉 OPÇÃO 3: Sales Module (CRM)

**Por quê?**
- ✅ CRM para gestão de leads
- ✅ Sales pipeline
- ✅ Visitor tracking
- ✅ Specs detalhadas (42K)

**Duração**: 1 semana
**Resultado**: CRM completo

---

## 💡 RECOMENDAÇÃO FINAL

**Próxima Tarefa**: 🏆 **Financial Module**

**Justificativa**:
1. **ALTA prioridade** (billing, invoicing essencial)
2. **Integra com Subscriptions** (já 100% completo)
3. **Monetização** (invoices, accounting, taxes)
4. **Specs detalhadas** (financeiro.md - 19K)
5. **ROI imediato** (gestão financeira da empresa)

**Ordem de Implementação Recomendada**:
1. 🏆 **Financial** (1 semana)
2. 🥈 **Support/SAC** (3-4 dias)
3. 🥉 **Sales (CRM)** (1 semana)
4. 🏅 **Completar módulos** 70-90% → 100% (1 semana)
5. 🎖️ **Marketing** (1 semana)
6. 🎗️ **CEO Dashboard** (3-4 dias)
7. 🏵️ **Banco/P2P** (opcional - 2-3 semanas)

---

**Status**: 🟢 Roadmap Admin-First pronto
**Próximo Passo**: Iniciar Financial Module
**Trading Core**: Adiado para após Admin completo
