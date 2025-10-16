# Módulo Financeiro - BotCriptoFy2

## 💰 Visão Geral

O Módulo Financeiro é responsável por toda a gestão financeira da plataforma, incluindo billing, pagamentos, receitas, despesas e relatórios financeiros.

## 🏗️ Arquitetura do Módulo

### Componentes Principais
- **Billing Management**: Gestão de cobrança e assinaturas
- **Multi-Gateway Payment Processing**: Processamento via InfinityPay, Banco e Stripe
- **Gateway Selection**: Seleção automática de gateway baseada na localização
- **Affiliate Commission Processing**: Processamento de comissões de afiliados
- **Revenue Analytics**: Análise de receitas e métricas
- **Financial Reports**: Relatórios financeiros detalhados
- **Forecasting**: Previsões financeiras e projeções
- **Refund Management**: Gestão de reembolsos multi-gateway

### Integração com Better-Auth
- **Multi-tenancy**: Suporte a diferentes tipos de usuários
- **Multi-Gateway Billing**: Integração com InfinityPay, Banco e Stripe
- **Subscription Management**: Gestão de assinaturas
- **User Management**: Gestão de usuários e permissões
- **Payment Methods**: Gestão de métodos de pagamento salvos

## 📊 Estrutura de Dados

### Tabelas do Banco de Dados

#### 1. financial_transactions
```sql
CREATE TABLE financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  type VARCHAR(50) NOT NULL, -- subscription, payment, refund, credit
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  status VARCHAR(20) NOT NULL, -- pending, completed, failed, cancelled
  gateway VARCHAR(50) NOT NULL, -- infinitypay, banco, stripe
  external_id VARCHAR(255),
  payment_method VARCHAR(50), -- pix, credit_card, bank_transfer, boleto
  gateway_status VARCHAR(50),
  gateway_response JSONB,
  description TEXT,
  metadata JSONB,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. financial_reports
```sql
CREATE TABLE financial_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type VARCHAR(50) NOT NULL, -- revenue, expenses, profit, cashflow
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  data JSONB NOT NULL,
  generated_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. financial_forecasts
```sql
CREATE TABLE financial_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_type VARCHAR(50) NOT NULL, -- revenue, expenses, profit
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  predicted_value DECIMAL(10,2) NOT NULL,
  confidence_level DECIMAL(3,2) NOT NULL,
  methodology TEXT,
  assumptions JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 4. financial_metrics
```sql
CREATE TABLE financial_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(10,2) NOT NULL,
  metric_type VARCHAR(50) NOT NULL, -- revenue, expense, profit, ratio
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🎯 Funcionalidades do Módulo

### 1. Gestão de Billing

#### Assinaturas
- **Criação**: Criação de novas assinaturas
- **Ativação**: Ativação de assinaturas
- **Suspensão**: Suspensão temporária
- **Cancelamento**: Cancelamento definitivo
- **Renovação**: Renovação automática

#### Planos de Pagamento
- **Free**: Plano gratuito
- **Pro**: R$ 29,00/mês
- **Enterprise**: R$ 99,00/mês
- **Custom**: Planos personalizados

#### Métodos de Pagamento por Gateway

##### **InfinityPay (Brasil)**
- **PIX**: Pagamento instantâneo (0.99% taxa)
- **Cartão de Crédito**: Visa, Mastercard, Elo, Amex (parcelamento até 12x)
- **Cartão de Débito**: Visa, Mastercard, Elo (1.99% taxa)
- **Boleto**: Pagamento bancário (R$ 2,90 taxa fixa)

##### **Banco (Brasil)**
- **PIX**: Pagamento instantâneo (sem taxa)
- **Transferência Bancária**: Transferência direta (sem taxa)

##### **Stripe (Global)**
- **Cartão de Crédito**: Visa, Mastercard, Amex, Discover, Diners, JCB
- **Cartão de Débito**: Visa, Mastercard (1.4% + R$ 0,30)
- **Transferência Bancária**: ACH, SEPA (0.8% + R$ 0,80)
- **Digital Wallets**: Apple Pay, Google Pay, PayPal (2.9% taxa)

### 2. Sistema Multi-Gateway de Pagamentos

#### Seleção Automática de Gateway
- **Brasil (BRL)**: InfinityPay → Banco → Stripe
- **Internacional (USD/EUR)**: Stripe → InfinityPay
- **Preferências do Usuário**: Respeitar escolha do cliente
- **Método de Pagamento**: Selecionar gateway compatível

#### Processamento de Pagamentos
- **Gateway Selection**: Seleção automática baseada em localização
- **Payment Processing**: Processamento via gateway selecionado
- **Webhook Handling**: Processamento de confirmações
- **Status Management**: Atualização de status em tempo real

#### Gestão de Reembolsos
- **Multi-Gateway Refunds**: Reembolsos via gateway original
- **Refund Tracking**: Rastreamento de reembolsos
- **Status Updates**: Atualizações de status
- **Notification System**: Notificações de reembolso

#### Gestão de Falhas
- **Retry Automático**: Tentativas automáticas
- **Gateway Fallback**: Fallback para gateway alternativo
- **Notificações**: Alertas de falhas
- **Escalação**: Escalação para suporte
- **Relatórios**: Relatórios de falhas por gateway

### 3. Análise de Receitas

#### Métricas de Receita
- **MRR**: Monthly Recurring Revenue
- **ARR**: Annual Recurring Revenue
- **Churn Rate**: Taxa de cancelamento
- **LTV**: Lifetime Value
- **CAC**: Customer Acquisition Cost

#### Análise Temporal
- **Receita Diária**: Receita por dia
- **Receita Semanal**: Receita por semana
- **Receita Mensal**: Receita por mês
- **Receita Anual**: Receita por ano

### 4. Sistema de Notificações

#### Notificações de Pagamento
- **Pagamento Confirmado**: Notificação de pagamento bem-sucedido
- **Pagamento Falhado**: Notificação de falha no pagamento
- **Tentativa de Pagamento**: Notificação de nova tentativa
- **Reembolso Processado**: Notificação de reembolso

#### Notificações de Cobrança
- **Cobrança Gerada**: Notificação de nova cobrança
- **Cobrança Vencida**: Notificação de cobrança em atraso
- **Cobrança Paga**: Notificação de cobrança quitada
- **Cobrança Cancelada**: Notificação de cancelamento

#### Notificações de Assinatura
- **Renovação de Assinatura**: Notificação de renovação
- **Upgrade de Plano**: Notificação de upgrade
- **Downgrade de Plano**: Notificação de downgrade
- **Cancelamento de Assinatura**: Notificação de cancelamento

#### Notificações de Relatórios
- **Relatório Mensal**: Notificação de relatório mensal
- **Relatório Anual**: Notificação de relatório anual
- **Relatório de Auditoria**: Notificação de relatório de auditoria
- **Relatório de Compliance**: Notificação de relatório de conformidade

### 5. Relatórios Financeiros

#### Relatórios Padrão
- **P&L**: Profit & Loss
- **Cash Flow**: Fluxo de caixa
- **Balance Sheet**: Balanço patrimonial
- **Revenue Report**: Relatório de receitas

#### Relatórios Personalizados
- **Período Customizado**: Período personalizado
- **Filtros Avançados**: Filtros por usuário, plano, etc.
- **Exportação**: PDF, Excel, CSV
- **Agendamento**: Relatórios automáticos

### 5. Previsões Financeiras

#### Modelos de Previsão
- **Linear Regression**: Regressão linear
- **Time Series**: Séries temporais
- **Machine Learning**: Aprendizado de máquina
- **Expert Judgment**: Julgamento de especialistas

#### Cenários
- **Otimista**: Cenário otimista
- **Realista**: Cenário realista
- **Pessimista**: Cenário pessimista
- **Customizado**: Cenário personalizado

## 🔧 APIs do Módulo

### 1. Payment Gateway APIs

#### POST /api/financeiro/payments/process
Processar pagamento com seleção automática de gateway

```typescript
interface ProcessPaymentRequest {
  amount: number;
  currency: string;
  paymentMethod: string;
  country: string;
  userPreferences?: string[];
  metadata?: Record<string, any>;
}

interface ProcessPaymentResponse {
  success: boolean;
  transactionId: string;
  externalId: string;
  status: string;
  gateway: string;
  paymentUrl?: string;
  qrCode?: string;
  barcode?: string;
  dueDate?: string;
}
```

#### POST /api/financeiro/payments/refund
Processar reembolso

```typescript
interface RefundRequest {
  transactionId: string;
  amount?: number;
  reason?: string;
}

interface RefundResponse {
  success: boolean;
  refundId: string;
  externalId: string;
  status: string;
  amount: number;
  processedAt: string;
}
```

#### GET /api/financeiro/payments/gateways
Listar gateways disponíveis

```typescript
interface GatewayResponse {
  id: string;
  name: string;
  slug: string;
  provider: string;
  isActive: boolean;
  isPrimary: boolean;
  supportedCountries: string[];
  supportedCurrencies: string[];
  supportedMethods: Record<string, any>;
  fees: Record<string, any>;
}
```

#### GET /api/financeiro/payments/methods
Listar métodos de pagamento do usuário

```typescript
interface PaymentMethodResponse {
  id: string;
  type: string;
  lastFour?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  isActive: boolean;
  gateway: {
    name: string;
    slug: string;
  };
  createdAt: string;
}
```

#### POST /api/financeiro/payments/methods
Adicionar método de pagamento

```typescript
interface AddPaymentMethodRequest {
  gatewayId: string;
  type: string;
  externalId: string;
  lastFour?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  metadata?: Record<string, any>;
}
```

### 2. Billing APIs

#### GET /api/financeiro/billing/subscriptions
Listar assinaturas

```typescript
interface SubscriptionResponse {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  amount: number;
  currency: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
}
```

#### POST /api/financeiro/billing/subscriptions
Criar nova assinatura

```typescript
interface CreateSubscriptionRequest {
  userId: string;
  planId: string;
  paymentMethodId: string;
  trialDays?: number;
}

interface CreateSubscriptionResponse {
  id: string;
  clientSecret: string;
  status: string;
  message: string;
}
```

#### PUT /api/financeiro/billing/subscriptions/{id}
Atualizar assinatura

```typescript
interface UpdateSubscriptionRequest {
  planId?: string;
  paymentMethodId?: string;
  cancelAtPeriodEnd?: boolean;
}

interface UpdateSubscriptionResponse {
  id: string;
  status: string;
  message: string;
}
```

#### DELETE /api/financeiro/billing/subscriptions/{id}
Cancelar assinatura

```typescript
interface CancelSubscriptionResponse {
  id: string;
  status: string;
  cancelledAt: string;
  message: string;
}
```

### 2. Payment APIs

#### GET /api/financeiro/payments
Listar pagamentos

```typescript
interface PaymentResponse {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  description: string;
  createdAt: string;
}
```

#### POST /api/financeiro/payments
Processar pagamento

```typescript
interface ProcessPaymentRequest {
  userId: string;
  amount: number;
  currency: string;
  paymentMethodId: string;
  description?: string;
}

interface ProcessPaymentResponse {
  id: string;
  clientSecret: string;
  status: string;
  message: string;
}
```

#### POST /api/financeiro/payments/{id}/refund
Estornar pagamento

```typescript
interface RefundPaymentRequest {
  amount?: number;
  reason?: string;
}

interface RefundPaymentResponse {
  id: string;
  refundId: string;
  status: string;
  message: string;
}
```

### 3. Revenue APIs

#### GET /api/financeiro/revenue
Análise de receita

```typescript
interface RevenueResponse {
  period: {
    start: string;
    end: string;
  };
  totalRevenue: number;
  recurringRevenue: number;
  oneTimeRevenue: number;
  growthRate: number;
  breakdown: {
    byPlan: PlanRevenue[];
    byPeriod: PeriodRevenue[];
    byUser: UserRevenue[];
  };
  predictions: {
    nextMonth: number;
    nextQuarter: number;
    nextYear: number;
    confidence: number;
  };
}
```

#### GET /api/financeiro/revenue/metrics
Métricas de receita

```typescript
interface RevenueMetricsResponse {
  mrr: number;
  arr: number;
  churnRate: number;
  ltv: number;
  cac: number;
  ltvCacRatio: number;
  paybackPeriod: number;
  grossMargin: number;
  netMargin: number;
}
```

### 4. Reports APIs

#### GET /api/financeiro/reports
Listar relatórios

```typescript
interface ReportResponse {
  id: string;
  type: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  generatedBy: string;
  createdAt: string;
  downloadUrl?: string;
}
```

#### POST /api/financeiro/reports
Gerar relatório

```typescript
interface GenerateReportRequest {
  type: string;
  periodStart: string;
  periodEnd: string;
  filters?: ReportFilters;
  format?: 'pdf' | 'excel' | 'csv';
}

interface GenerateReportResponse {
  id: string;
  status: string;
  estimatedCompletion: string;
  message: string;
}
```

#### GET /api/financeiro/reports/{id}/download
Download de relatório

```typescript
interface DownloadReportResponse {
  url: string;
  expiresAt: string;
  filename: string;
}
```

### 5. Forecasting APIs

#### GET /api/financeiro/forecasts
Listar previsões

```typescript
interface ForecastResponse {
  id: string;
  type: string;
  periodStart: string;
  periodEnd: string;
  predictedValue: number;
  confidenceLevel: number;
  methodology: string;
  createdAt: string;
}
```

#### POST /api/financeiro/forecasts
Criar previsão

```typescript
interface CreateForecastRequest {
  type: string;
  periodStart: string;
  periodEnd: string;
  methodology: string;
  assumptions: Record<string, any>;
}

interface CreateForecastResponse {
  id: string;
  status: string;
  predictedValue: number;
  confidenceLevel: number;
  message: string;
}
```

## 🤖 Agente Financeiro

### Capacidades

#### billing
- Gestão de assinaturas
- Processamento de pagamentos
- Gestão de falhas
- Renovação automática

#### payments
- Processamento de pagamentos multi-gateway
- Seleção automática de gateway
- Gestão de transações
- Gestão de métodos de pagamento
- Estornos e reembolsos multi-gateway
- Reconciliação bancária
- Gestão de webhooks de pagamento
- Análise de performance de gateways

#### reports
- Geração de relatórios
- Análise de dados
- Exportação de dados
- Agendamento de relatórios

#### forecasting
- Previsões financeiras
- Análise de tendências
- Cenários de projeção
- Validação de modelos

#### alerts
- Alertas de pagamento
- Notificações de falhas
- Alertas de receita
- Alertas de churn

#### notifications
- Gestão de notificações financeiras
- Integração com sistema central de notificações
- Templates de notificação financeira
- Configuração de preferências de notificação

### Comandos

```bash
/analyze_revenue - Analisar receita
/check_payments - Verificar pagamentos pendentes
/generate_financial_report - Gerar relatório financeiro
/forecast_revenue - Prever receita futura
/alert_payment_issues - Alertar problemas de pagamento
/optimize_billing - Otimizar processo de billing
/analyze_churn - Analisar taxa de churn
/update_forecasts - Atualizar previsões
/generate_metrics - Gerar métricas financeiras
/alert_revenue_drop - Alertar queda de receita
/select_payment_gateway - Selecionar gateway de pagamento
/process_payment - Processar pagamento
/process_refund - Processar reembolso
/check_gateway_status - Verificar status dos gateways
/analyze_gateway_performance - Analisar performance dos gateways
/optimize_gateway_selection - Otimizar seleção de gateway
/alert_gateway_issues - Alertar problemas de gateway
/send_payment_notification - Enviar notificação de pagamento
/send_billing_notification - Enviar notificação de cobrança
/send_subscription_notification - Enviar notificação de assinatura
/send_financial_report_notification - Enviar notificação de relatório
```

## 📊 Dashboard Financeiro

### Métricas Principais
- **Receita Total**: Receita total do período
- **Receita Recorrente**: Receita recorrente mensal
- **Taxa de Churn**: Taxa de cancelamento
- **LTV**: Valor de vida do cliente
- **CAC**: Custo de aquisição
- **Taxa de Conversão**: Taxa de conversão por gateway
- **Receita Líquida**: Receita após descontar taxas dos gateways

### Métricas por Gateway
- **InfinityPay**: Volume, taxa de sucesso, custos
- **Banco**: Volume, taxa de sucesso, custos
- **Stripe**: Volume, taxa de sucesso, custos
- **Comparação**: Performance relativa entre gateways

### Gráficos
- **Receita por Período**: Gráfico de linha
- **Receita por Plano**: Gráfico de pizza
- **Receita por Usuário**: Gráfico de barras
- **Receita por Gateway**: Gráfico de barras comparativo
- **Taxa de Sucesso por Gateway**: Gráfico de barras
- **Custos por Gateway**: Gráfico de linha
- **Previsões**: Gráfico de projeção

### Alertas
- **Pagamentos Falhados**: Alertas de falha
- **Queda de Receita**: Alertas de queda
- **Alta Taxa de Churn**: Alertas de churn
- **Problemas de Billing**: Alertas de billing
- **Problemas de Gateway**: Alertas de falha de gateway
- **Alta Taxa de Falha**: Alertas de alta taxa de falha
- **Gateway Indisponível**: Alertas de indisponibilidade

## 🔄 Fluxo de Trabalho

### 1. Criação de Assinatura
```
Usuário → Seleciona plano → Detecta localização → Seleciona gateway → Escolhe método de pagamento → Processa pagamento → Ativa assinatura
```

### 2. Processamento de Pagamento Multi-Gateway
```
Pagamento → Seleção de Gateway → Processamento → Webhook → Validação → Confirmação → Notificação
```

### 3. Seleção de Gateway
```
Localização → Moeda → Método de Pagamento → Preferências → Seleção → Processamento
```

### 4. Geração de Relatório
```
Solicitação → Validação → Processamento → Geração → Notificação → Download
```

### 5. Previsão Financeira
```
Dados históricos → Modelo de previsão → Validação → Aplicação → Relatório
```

### 6. Gestão de Reembolsos
```
Solicitação → Validação → Gateway Original → Processamento → Confirmação → Notificação
```

## 🧪 Testes

### Testes Unitários
```bash
# Testes de billing
bun test src/admin/departments/financeiro/billing/

# Testes de pagamentos
bun test src/admin/departments/financeiro/payments/

# Testes de relatórios
bun test src/admin/departments/financeiro/reports/
```

### Testes de Integração
```bash
# Testes de integração com Stripe
bun test tests/integration/financeiro-stripe.test.ts

# Testes de integração com Better-Auth
bun test tests/integration/financeiro-auth.test.ts
```

## 🚀 Deploy

### Variáveis de Ambiente
```env
# Financeiro
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FINANCEIRO_REPORT_CACHE_TTL=3600
FINANCEIRO_FORECAST_CACHE_TTL=7200
```

### Docker
```dockerfile
# Adicionar ao Dockerfile existente
COPY src/admin/departments/financeiro/ ./src/admin/departments/financeiro/
RUN bun install
```

## 📈 Monitoramento

### Métricas de Performance
- **Response Time**: < 100ms para APIs
- **Throughput**: 500+ requests/min
- **Error Rate**: < 0.1%
- **Uptime**: 99.9%

### Alertas
- **Falha de Pagamento**: > 5%
- **Queda de Receita**: > 10%
- **Alta Taxa de Churn**: > 15%
- **Erro de Billing**: Qualquer erro

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO