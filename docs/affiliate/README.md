# Sistema de Afiliados Multi-Nível - BotCriptoFy2

## 🎯 Visão Geral

Sistema de afiliados robusto e escalável que permite comissionamento em até 5 níveis, com diferentes limitações e benefícios baseados no tipo de usuário (Traders, Influencers, Parceiros).

## 🏗️ Arquitetura do Sistema

### Componentes Principais
- **Affiliate Manager**: Gerenciador central de afiliados
- **Commission Calculator**: Calculadora de comissões multi-nível
- **Invite System**: Sistema de convites e gestão
- **Payment Processor**: Processamento de pagamentos de comissões
- **Analytics Engine**: Motor de análise e relatórios
- **MMN Integration**: Integração com sistema MMN
- **Tree Manager**: Gerenciador da árvore hierárquica

### Estratégia de Comissionamento
- **Traders**: 5 convites limitados, comissionamento até 5º nível
- **Influencers**: Convites ilimitados, comissionamento até 5º nível
- **Parceiros**: Convites ilimitados, comissionamento até 5º nível
- **Limite Total**: Máximo 5% da comissão da plataforma distribuída entre todos os níveis
- **Árvore MMN**: Estrutura hierárquica com CEO como raiz principal
- **Reconexão Automática**: Descendentes reconectados à raiz quando convite é revogado

## 📊 Estrutura de Dados

### Tabelas do Banco de Dados

#### 1. affiliate_programs
```sql
CREATE TABLE affiliate_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  max_levels INTEGER DEFAULT 5,
  total_commission_limit DECIMAL(5,2) DEFAULT 5.00, -- 5% máximo
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. affiliate_users
```sql
CREATE TABLE affiliate_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  affiliate_code VARCHAR(20) UNIQUE NOT NULL,
  user_type VARCHAR(20) NOT NULL, -- trader, influencer, partner
  invite_limit INTEGER, -- NULL = ilimitado, número = limitado
  is_active BOOLEAN DEFAULT true,
  total_earnings DECIMAL(15,2) DEFAULT 0.00,
  total_commissions_paid DECIMAL(15,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. affiliate_invites
```sql
CREATE TABLE affiliate_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id UUID NOT NULL REFERENCES affiliate_users(id),
  invited_user_id UUID REFERENCES users(id),
  invite_code VARCHAR(50) UNIQUE NOT NULL,
  invite_url VARCHAR(500) NOT NULL,
  status VARCHAR(20) NOT NULL, -- pending, accepted, expired, revoked
  expires_at TIMESTAMP,
  accepted_at TIMESTAMP,
  revoked_at TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 4. affiliate_relationships
```sql
CREATE TABLE affiliate_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id UUID NOT NULL REFERENCES affiliate_users(id),
  referred_user_id UUID NOT NULL REFERENCES users(id),
  level INTEGER NOT NULL, -- 1-5
  parent_affiliate_id UUID REFERENCES affiliate_users(id),
  invite_id UUID REFERENCES affiliate_invites(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(affiliate_user_id, referred_user_id, level)
);
```

#### 5. affiliate_commissions
```sql
CREATE TABLE affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id UUID NOT NULL REFERENCES affiliate_users(id),
  referred_user_id UUID NOT NULL REFERENCES users(id),
  level INTEGER NOT NULL,
  transaction_id UUID NOT NULL REFERENCES financial_transactions(id),
  commission_amount DECIMAL(15,2) NOT NULL,
  commission_percentage DECIMAL(5,2) NOT NULL,
  base_amount DECIMAL(15,2) NOT NULL,
  status VARCHAR(20) NOT NULL, -- pending, paid, cancelled
  paid_at TIMESTAMP,
  payment_reference VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 6. affiliate_commission_rates
```sql
CREATE TABLE affiliate_commission_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_type VARCHAR(20) NOT NULL, -- trader, influencer, partner
  level INTEGER NOT NULL, -- 1-5
  commission_percentage DECIMAL(5,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_type, level)
);
```

#### 7. affiliate_payments
```sql
CREATE TABLE affiliate_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_user_id UUID NOT NULL REFERENCES affiliate_users(id),
  total_amount DECIMAL(15,2) NOT NULL,
  commission_count INTEGER NOT NULL,
  payment_method VARCHAR(50) NOT NULL, -- pix, bank_transfer, credit_card
  status VARCHAR(20) NOT NULL, -- pending, processing, completed, failed
  gateway VARCHAR(50), -- infinitypay, banco, stripe
  external_id VARCHAR(255),
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🎯 Funcionalidades do Sistema

### 1. Gestão de Afiliados

#### Criação de Afiliado
- **Geração de Código**: Código único de afiliado
- **Definição de Tipo**: Trader, Influencer ou Parceiro
- **Configuração de Limites**: Convites limitados ou ilimitados
- **Ativação**: Ativação imediata do programa

#### Tipos de Usuário
- **Traders**: 5 convites limitados, comissionamento até 5º nível
- **Influencers**: Convites ilimitados, comissionamento até 5º nível
- **Parceiros**: Convites ilimitados, comissionamento até 5º nível

### 2. Sistema de Convites

#### Gestão de Convites
- **Criação**: Gerar convite com código único
- **Compartilhamento**: URL personalizada para convite
- **Rastreamento**: Acompanhamento de status do convite
- **Revogação**: Revogar convite a qualquer momento
- **Reutilização**: Reutilizar convite revogado

#### Limitações por Tipo
- **Traders**: Máximo 5 convites ativos
- **Influencers**: Convites ilimitados
- **Parceiros**: Convites ilimitados

### 3. Comissionamento Multi-Nível

#### Estrutura de Níveis
- **1º Nível**: Usuário direto convidado
- **2º Nível**: Usuário convidado pelo 1º nível
- **3º Nível**: Usuário convidado pelo 2º nível
- **4º Nível**: Usuário convidado pelo 3º nível
- **5º Nível**: Usuário convidado pelo 4º nível

#### Cálculo de Comissões
- **Base**: Comissão gerada pelas operações com lucro
- **Limite Total**: Máximo 5% da comissão da plataforma
- **Distribuição**: Percentual por nível e tipo de usuário
- **Pagamento**: Processamento automático de comissões

### 4. Configuração de Taxas

#### Taxas por Tipo e Nível

##### **Traders**
- **1º Nível**: 2.00%
- **2º Nível**: 1.50%
- **3º Nível**: 1.00%
- **4º Nível**: 0.50%
- **5º Nível**: 0.25%

##### **Influencers**
- **1º Nível**: 1.50%
- **2º Nível**: 1.00%
- **3º Nível**: 0.75%
- **4º Nível**: 0.50%
- **5º Nível**: 0.25%

##### **Parceiros**
- **1º Nível**: 1.00%
- **2º Nível**: 0.75%
- **3º Nível**: 0.50%
- **4º Nível**: 0.25%
- **5º Nível**: 0.10%

### 5. Processamento de Comissões

#### Trigger de Comissão
- **Operação com Lucro**: Quando usuário tem operação lucrativa
- **Cálculo Automático**: Cálculo automático de comissões
- **Distribuição**: Distribuição por níveis
- **Acumulação**: Acumulação para pagamento

#### Pagamento de Comissões
- **Frequência**: Mensal ou conforme solicitado
- **Método**: PIX, transferência bancária, cartão
- **Gateway**: InfinityPay, Banco, Stripe
- **Relatório**: Relatório detalhado de pagamentos

## 🔧 APIs do Sistema

### 1. Affiliate Management APIs

#### POST /api/affiliate/register
Registrar usuário como afiliado

```typescript
interface RegisterAffiliateRequest {
  userType: 'trader' | 'influencer' | 'partner';
  customCode?: string;
}

interface RegisterAffiliateResponse {
  success: boolean;
  affiliateId: string;
  affiliateCode: string;
  inviteLimit: number | null;
  message: string;
}
```

#### GET /api/affiliate/profile
Obter perfil do afiliado

```typescript
interface AffiliateProfileResponse {
  id: string;
  affiliateCode: string;
  userType: string;
  inviteLimit: number | null;
  totalEarnings: number;
  totalCommissionsPaid: number;
  activeInvites: number;
  totalReferrals: number;
  isActive: boolean;
  createdAt: string;
}
```

### 2. Invite Management APIs

#### POST /api/affiliate/invites
Criar novo convite

```typescript
interface CreateInviteRequest {
  expiresInDays?: number;
  metadata?: Record<string, any>;
}

interface CreateInviteResponse {
  success: boolean;
  inviteId: string;
  inviteCode: string;
  inviteUrl: string;
  expiresAt: string;
  message: string;
}
```

#### GET /api/affiliate/invites
Listar convites do afiliado

```typescript
interface InviteListResponse {
  invites: {
    id: string;
    inviteCode: string;
    inviteUrl: string;
    status: string;
    expiresAt: string;
    acceptedAt?: string;
    invitedUser?: {
      id: string;
      name: string;
      email: string;
    };
  }[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

#### POST /api/affiliate/invites/{id}/revoke
Revogar convite

```typescript
interface RevokeInviteResponse {
  success: boolean;
  message: string;
}
```

#### POST /api/affiliate/invites/{id}/reuse
Reutilizar convite revogado

```typescript
interface ReuseInviteResponse {
  success: boolean;
  inviteId: string;
  inviteCode: string;
  inviteUrl: string;
  expiresAt: string;
  message: string;
}
```

### 3. Commission APIs

#### GET /api/affiliate/commissions
Listar comissões do afiliado

```typescript
interface CommissionListResponse {
  commissions: {
    id: string;
    level: number;
    referredUser: {
      id: string;
      name: string;
      email: string;
    };
    transaction: {
      id: string;
      amount: number;
      currency: string;
      description: string;
    };
    commissionAmount: number;
    commissionPercentage: number;
    baseAmount: number;
    status: string;
    createdAt: string;
    paidAt?: string;
  }[];
  summary: {
    totalEarnings: number;
    totalCommissions: number;
    pendingAmount: number;
    paidAmount: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

#### GET /api/affiliate/commissions/stats
Estatísticas de comissões

```typescript
interface CommissionStatsResponse {
  totalEarnings: number;
  totalCommissions: number;
  pendingAmount: number;
  paidAmount: number;
  earningsByLevel: {
    level: number;
    amount: number;
    count: number;
  }[];
  earningsByMonth: {
    month: string;
    amount: number;
    count: number;
  }[];
  topReferrals: {
    userId: string;
    userName: string;
    totalEarnings: number;
    commissionCount: number;
  }[];
}
```

### 4. Payment APIs

#### POST /api/affiliate/payments/request
Solicitar pagamento de comissões

```typescript
interface RequestPaymentRequest {
  amount?: number; // Se não informado, paga tudo disponível
  paymentMethod: 'pix' | 'bank_transfer' | 'credit_card';
  bankAccount?: {
    bank: string;
    agency: string;
    account: string;
    digit: string;
  };
}

interface RequestPaymentResponse {
  success: boolean;
  paymentId: string;
  amount: number;
  paymentMethod: string;
  status: string;
  estimatedProcessing: string;
  message: string;
}
```

#### GET /api/affiliate/payments
Listar pagamentos

```typescript
interface PaymentListResponse {
  payments: {
    id: string;
    amount: number;
    paymentMethod: string;
    status: string;
    gateway?: string;
    processedAt?: string;
    createdAt: string;
  }[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

## 🤖 Agent de Afiliados

### Capacidades do Agent

#### affiliate_management
- Gestão de afiliados
- Criação de convites
- Revogação de convites
- Análise de performance

#### commission_management
- Cálculo de comissões
- Processamento de pagamentos
- Análise de comissões
- Relatórios de comissões

#### analytics
- Análise de performance
- Relatórios de afiliados
- Métricas de conversão
- Análise de tendências

#### notifications
- Notificações de comissões
- Alertas de pagamentos
- Notificações de convites
- Relatórios automáticos

### Comandos do Agent

```bash
/register_affiliate - Registrar novo afiliado
/create_invite - Criar convite de afiliado
/revoke_invite - Revogar convite
/reuse_invite - Reutilizar convite revogado
/calculate_commission - Calcular comissão
/process_commission - Processar comissão
/request_payment - Solicitar pagamento
/analyze_performance - Analisar performance
/generate_report - Gerar relatório
/send_commission_notification - Enviar notificação de comissão
/send_payment_notification - Enviar notificação de pagamento
/send_invite_notification - Enviar notificação de convite
```

## 📊 Dashboard de Afiliados

### Métricas Principais
- **Total de Ganhos**: Soma de todas as comissões
- **Comissões Pendentes**: Valor a receber
- **Total de Referidos**: Número de usuários referidos
- **Taxa de Conversão**: Percentual de convites aceitos
- **Convites Ativos**: Número de convites pendentes

### Gráficos e Relatórios
- **Ganhos por Mês**: Gráfico de linha temporal
- **Comissões por Nível**: Gráfico de barras
- **Top Referidos**: Lista dos melhores referidos
- **Performance de Convites**: Taxa de conversão por convite
- **Histórico de Pagamentos**: Timeline de pagamentos

### Alertas
- **Comissão Disponível**: Quando há comissão para receber
- **Convite Expirado**: Quando convite está próximo do vencimento
- **Limite de Convites**: Quando trader atinge limite
- **Pagamento Processado**: Confirmação de pagamento

## 🔄 Fluxo de Trabalho

### 1. Registro de Afiliado
```
Usuário → Solicita registro → Validação → Criação de código → Ativação
```

### 2. Criação de Convite
```
Afiliado → Cria convite → Gera código → Compartilha → Rastreia
```

### 3. Aceitação de Convite
```
Usuário → Acessa link → Registra conta → Aceita convite → Ativa comissão
```

### 4. Processamento de Comissão
```
Operação lucrativa → Cálculo automático → Distribuição por níveis → Acumulação
```

### 5. Pagamento de Comissão
```
Solicitação → Validação → Processamento → Pagamento → Confirmação
```

## 🧪 Testes do Sistema

### Testes Unitários
```bash
bun test tests/unit/affiliate/
```

### Testes de Integração
```bash
bun test tests/integration/affiliate/
```

### Testes E2E
```bash
bun test tests/e2e/affiliate/
```

## 🔒 Segurança e Compliance

### Medidas de Segurança
- **Validação de Códigos**: Códigos únicos e seguros
- **Rate Limiting**: Limitação de criação de convites
- **Auditoria**: Log completo de ações
- **Criptografia**: Dados sensíveis criptografados

### Compliance
- **LGPD**: Conformidade com lei brasileira
- **GDPR**: Conformidade com regulamentação europeia
- **Auditoria**: Rastreabilidade completa
- **Relatórios**: Relatórios para autoridades

## 📋 Checklist de Implementação

### ✅ Configuração Inicial
- [ ] Criar tabelas do banco de dados
- [ ] Configurar taxas de comissão
- [ ] Configurar limites por tipo de usuário
- [ ] Configurar webhooks de pagamento

### ✅ Funcionalidades
- [ ] Sistema de registro de afiliados
- [ ] Sistema de convites
- [ ] Cálculo de comissões
- [ ] Processamento de pagamentos

### ✅ Integrações
- [ ] Integração com módulo Financeiro
- [ ] Integração com sistema de pagamentos
- [ ] Integração com sistema de notificações
- [ ] Integração com Better-Auth

### ✅ Testes e QA
- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Testes E2E
- [ ] Testes de segurança

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO