# Sistema de Cobrança por Uso e Comissionamento - Módulo de Assinaturas

## 🎯 Visão Geral

O Sistema de Cobrança por Uso e Comissionamento é uma funcionalidade avançada do módulo de Assinaturas que permite cobrar pelos recursos de trading utilizados pelos usuários e aplicar comissões configuráveis sobre operações lucrativas, baseadas no plano de assinatura.

## 🏗️ Arquitetura do Sistema

### Componentes Principais
- **Trading Resource Tracker**: Rastreamento de uso de recursos de trading
- **Usage Billing Engine**: Motor de cobrança por uso
- **Commission Calculator**: Calculadora de comissões
- **Commission Collector**: Coletor de comissões
- **Pricing Manager**: Gerenciador de preços
- **Commission Rate Manager**: Gerenciador de taxas de comissão

### Integração com Better-Auth
- **User Context**: Contexto do usuário logado
- **Tenant Isolation**: Isolamento por tenant
- **Subscription Context**: Contexto da assinatura ativa
- **Payment Integration**: Integração com Stripe

## 📊 Estrutura de Dados Detalhada

### Tabelas de Cobrança por Uso

#### 1. trading_resource_usage
```sql
CREATE TABLE trading_resource_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  subscription_id UUID NOT NULL REFERENCES user_subscriptions(id),
  resource_type VARCHAR(50) NOT NULL, -- bot_execution, signal_analysis, market_data, backtesting, paper_trading
  resource_name VARCHAR(100) NOT NULL, -- bot_1, signal_analyzer, market_feed, backtest_1, paper_1
  usage_count INTEGER NOT NULL DEFAULT 1,
  usage_duration INTEGER DEFAULT 0, -- in seconds
  usage_value DECIMAL(15,2) DEFAULT 0, -- for value-based resources
  unit_price DECIMAL(10,4) NOT NULL, -- price per unit
  total_cost DECIMAL(10,2) NOT NULL, -- total cost for this usage
  currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  is_included_in_plan BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. trading_resource_pricing
```sql
CREATE TABLE trading_resource_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type VARCHAR(50) NOT NULL, -- bot_execution, signal_analysis, market_data, backtesting, paper_trading
  pricing_model VARCHAR(20) NOT NULL, -- per_use, per_minute, per_hour, per_day, per_trade
  unit_price DECIMAL(10,4) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
  minimum_charge DECIMAL(10,2) DEFAULT 0,
  maximum_charge DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  effective_from TIMESTAMP NOT NULL,
  effective_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tabelas de Comissionamento

#### 3. trading_commissions
```sql
CREATE TABLE trading_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  subscription_id UUID NOT NULL REFERENCES user_subscriptions(id),
  trade_id VARCHAR(100) NOT NULL,
  trade_type VARCHAR(20) NOT NULL, -- buy, sell, long, short
  asset_symbol VARCHAR(20) NOT NULL,
  trade_volume DECIMAL(15,8) NOT NULL,
  trade_price DECIMAL(15,8) NOT NULL,
  trade_value DECIMAL(15,2) NOT NULL,
  profit_loss DECIMAL(15,2) NOT NULL,
  commission_rate DECIMAL(5,4) NOT NULL, -- percentage (e.g., 0.0250 for 2.5%)
  commission_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
  trade_timestamp TIMESTAMP NOT NULL,
  commission_timestamp TIMESTAMP NOT NULL,
  status VARCHAR(20) NOT NULL, -- pending, collected, refunded, waived
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 4. plan_commission_rates
```sql
CREATE TABLE plan_commission_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  asset_type VARCHAR(50) NOT NULL, -- crypto, forex, stocks, commodities
  commission_rate DECIMAL(5,4) NOT NULL, -- percentage
  minimum_commission DECIMAL(10,2) DEFAULT 0,
  maximum_commission DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  effective_from TIMESTAMP NOT NULL,
  effective_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🎯 Funcionalidades Detalhadas

### 1. Cobrança por Uso de Recursos de Trading

#### Recursos Cobráveis
- **Execução de Bots**: Cobrança por tempo de execução dos bots
- **Análise de Sinais**: Cobrança por análise de sinais de trading
- **Dados de Mercado**: Cobrança por acesso a dados de mercado
- **Backtesting**: Cobrança por simulações de backtesting
- **Paper Trading**: Cobrança por operações de paper trading

#### Modelos de Preços
- **Por Uso**: R$ 0,50 por execução de bot
- **Por Minuto**: R$ 0,10 por minuto de execução
- **Por Hora**: R$ 5,00 por hora de execução
- **Por Dia**: R$ 50,00 por dia de acesso
- **Por Trade**: R$ 1,00 por operação executada

#### Configuração de Preços
```json
{
  "bot_execution": {
    "pricing_model": "per_minute",
    "unit_price": 0.10,
    "currency": "BRL",
    "minimum_charge": 0.50,
    "maximum_charge": 100.00
  },
  "signal_analysis": {
    "pricing_model": "per_use",
    "unit_price": 0.50,
    "currency": "BRL",
    "minimum_charge": 0.50,
    "maximum_charge": 50.00
  },
  "market_data": {
    "pricing_model": "per_hour",
    "unit_price": 5.00,
    "currency": "BRL",
    "minimum_charge": 5.00,
    "maximum_charge": 200.00
  },
  "backtesting": {
    "pricing_model": "per_use",
    "unit_price": 2.00,
    "currency": "BRL",
    "minimum_charge": 2.00,
    "maximum_charge": 100.00
  },
  "paper_trading": {
    "pricing_model": "per_trade",
    "unit_price": 1.00,
    "currency": "BRL",
    "minimum_charge": 1.00,
    "maximum_charge": 50.00
  }
}
```

### 2. Sistema de Comissionamento

#### Taxas de Comissão por Plano
```json
{
  "start": {
    "crypto": 0.025, // 2.5%
    "forex": 0.020,  // 2.0%
    "stocks": 0.015, // 1.5%
    "commodities": 0.030 // 3.0%
  },
  "pro": {
    "crypto": 0.020, // 2.0%
    "forex": 0.015,  // 1.5%
    "stocks": 0.010, // 1.0%
    "commodities": 0.025 // 2.5%
  },
  "enterprise": {
    "crypto": 0.015, // 1.5%
    "forex": 0.010,  // 1.0%
    "stocks": 0.005, // 0.5%
    "commodities": 0.020 // 2.0%
  }
}
```

#### Regras de Comissionamento
- **Apenas sobre Lucros**: Comissão aplicada apenas em operações lucrativas
- **Comissão Mínima**: R$ 0,50 por operação
- **Comissão Máxima**: R$ 500,00 por operação
- **Taxa Base**: Taxa padrão do plano
- **Taxas Personalizadas**: Taxas customizadas por cliente

## 🔧 APIs Detalhadas

### 1. Trading Resource Usage APIs

#### POST /api/assinaturas/trading/usage/track
Rastrear uso de recursos de trading

```typescript
interface TrackTradingUsageRequest {
  userId: string;
  resourceType: 'bot_execution' | 'signal_analysis' | 'market_data' | 'backtesting' | 'paper_trading';
  resourceName: string;
  usageCount?: number;
  usageDuration?: number; // in seconds
  usageValue?: number;
  metadata?: Record<string, any>;
}

interface TrackTradingUsageResponse {
  id: string;
  status: 'success' | 'error' | 'blocked';
  message: string;
  totalCost: number;
  unitPrice: number;
  isIncludedInPlan: boolean;
  requiresPayment: boolean;
  paymentRequired?: number;
  currency: string;
  billingPeriod: {
    start: string;
    end: string;
  };
}
```

#### GET /api/assinaturas/trading/usage/{userId}
Obter uso de recursos de trading do usuário

```typescript
interface TradingUsageResponse {
  userId: string;
  subscriptionId: string;
  planName: string;
  currentPeriod: {
    start: string;
    end: string;
  };
  usage: {
    botExecution: TradingResourceUsage;
    signalAnalysis: TradingResourceUsage;
    marketData: TradingResourceUsage;
    backtesting: TradingResourceUsage;
    paperTrading: TradingResourceUsage;
  };
  totalCost: number;
  totalIncluded: number;
  totalCharged: number;
  currency: string;
  lastUpdated: string;
}

interface TradingResourceUsage {
  resourceType: string;
  usageCount: number;
  usageDuration: number;
  usageValue: number;
  unitPrice: number;
  totalCost: number;
  isIncludedInPlan: boolean;
  includedAmount: number;
  chargedAmount: number;
  lastUsed: string;
}
```

### 2. Commission APIs

#### POST /api/assinaturas/commissions/calculate
Calcular comissão de operação

```typescript
interface CalculateCommissionRequest {
  userId: string;
  tradeId: string;
  tradeType: 'buy' | 'sell' | 'long' | 'short';
  assetSymbol: string;
  assetType: 'crypto' | 'forex' | 'stocks' | 'commodities';
  tradeVolume: number;
  tradePrice: number;
  tradeValue: number;
  profitLoss: number;
  tradeTimestamp: string;
}

interface CalculateCommissionResponse {
  tradeId: string;
  commissionRate: number;
  commissionAmount: number;
  currency: string;
  isProfitTrade: boolean;
  planName: string;
  effectiveRate: number;
  minimumCommission: number;
  maximumCommission?: number;
  finalCommission: number;
  calculation: {
    baseRate: number;
    planDiscount: number;
    volumeDiscount: number;
    finalRate: number;
    appliedMinimum: boolean;
    appliedMaximum: boolean;
  };
}
```

#### POST /api/assinaturas/commissions/collect
Cobrar comissão de operação

```typescript
interface CollectCommissionRequest {
  userId: string;
  tradeId: string;
  commissionAmount: number;
  currency: string;
  paymentMethod: 'subscription_credit' | 'stripe' | 'pix' | 'bank_transfer';
  metadata?: Record<string, any>;
}

interface CollectCommissionResponse {
  id: string;
  status: 'collected' | 'pending' | 'failed';
  message: string;
  commissionId: string;
  paymentId?: string;
  collectedAt?: string;
  paymentDetails?: {
    method: string;
    amount: number;
    currency: string;
    transactionId?: string;
  };
}
```

## 🤖 Agente de Cobrança e Comissionamento

### Capacidades Específicas

#### trading_billing
- Rastreamento de uso de recursos
- Cálculo de custos
- Cobrança automática
- Gestão de preços

#### commission_management
- Cálculo de comissões
- Cobrança de comissões
- Gestão de taxas
- Relatórios de comissões

### Comandos Específicos

```bash
/track_trading_usage - Rastrear uso de recursos de trading
/calculate_commission - Calcular comissão de operação
/collect_commission - Cobrar comissão
/update_commission_rates - Atualizar taxas de comissão
/analyze_trading_costs - Analisar custos de trading
/generate_commission_report - Gerar relatório de comissões
/update_pricing - Atualizar preços de recursos
/analyze_usage_patterns - Analisar padrões de uso
/optimize_pricing - Otimizar preços
/generate_billing_report - Gerar relatório de cobrança
```

## 📊 Dashboard de Cobrança e Comissões

### Métricas de Cobrança por Uso
- **Recursos Mais Utilizados**: Ranking de recursos por uso
- **Custo Médio por Usuário**: Custo médio por usuário
- **Receita por Recurso**: Receita gerada por tipo de recurso
- **Uso por Plano**: Distribuição de uso por plano

### Métricas de Comissões
- **Comissões Coletadas**: Valor total de comissões
- **Taxa Média de Comissão**: Taxa média por plano
- **Operações com Comissão**: Número de operações
- **Comissões por Ativo**: Comissões por tipo de ativo

### Gráficos Interativos
- **Uso de Recursos por Período**: Gráfico de linha
- **Custo por Usuário**: Gráfico de barras
- **Comissões por Plano**: Gráfico de pizza
- **Taxa de Comissão por Ativo**: Gráfico de barras
- **Receita de Uso vs Comissões**: Gráfico de comparação

## 🔄 Fluxos de Trabalho

### 1. Cobrança por Uso
```
Uso de Recurso → Verificação de Inclusão → Cálculo de Custo → Cobrança → Notificação
```

### 2. Comissionamento
```
Operação com Lucro → Cálculo de Comissão → Cobrança → Registro → Relatório
```

### 3. Atualização de Preços
```
Novo Preço → Validação → Aplicação → Notificação → Log
```

### 4. Atualização de Taxas
```
Nova Taxa → Validação → Aplicação → Notificação → Log
```

## 🧪 Testes Específicos

### Testes de Cobrança por Uso
```bash
# Testes de rastreamento de uso
bun test tests/trading-billing/usage-tracking.test.ts

# Testes de cálculo de custos
bun test tests/trading-billing/cost-calculation.test.ts

# Testes de cobrança
bun test tests/trading-billing/billing.test.ts
```

### Testes de Comissionamento
```bash
# Testes de cálculo de comissões
bun test tests/commission/calculation.test.ts

# Testes de cobrança de comissões
bun test tests/commission/collection.test.ts

# Testes de gestão de taxas
bun test tests/commission/rate-management.test.ts
```

## 🚀 Implementação

### 1. Serviço de Rastreamento de Uso

```typescript
// trading-usage-tracker.service.ts
export class TradingUsageTrackerService {
  async trackUsage(request: TrackTradingUsageRequest): Promise<TrackTradingUsageResponse> {
    const subscription = await this.getUserSubscription(request.userId);
    const pricing = await this.getResourcePricing(request.resourceType);
    const planLimits = await this.getPlanLimits(subscription.planId);
    
    // Verificar se está incluído no plano
    const isIncluded = this.isResourceIncludedInPlan(
      request.resourceType, 
      planLimits
    );
    
    // Calcular custo
    const cost = this.calculateCost(
      request,
      pricing,
      isIncluded
    );
    
    // Registrar uso
    const usage = await this.recordUsage({
      ...request,
      totalCost: cost.totalCost,
      unitPrice: pricing.unitPrice,
      isIncludedInPlan: isIncluded,
      periodStart: this.getCurrentPeriodStart(),
      periodEnd: this.getCurrentPeriodEnd()
    });
    
    return {
      id: usage.id,
      status: 'success',
      message: 'Usage tracked successfully',
      totalCost: cost.totalCost,
      unitPrice: pricing.unitPrice,
      isIncludedInPlan: isIncluded,
      requiresPayment: cost.requiresPayment,
      paymentRequired: cost.paymentRequired,
      currency: pricing.currency,
      billingPeriod: {
        start: this.getCurrentPeriodStart(),
        end: this.getCurrentPeriodEnd()
      }
    };
  }
  
  private calculateCost(
    request: TrackTradingUsageRequest,
    pricing: TradingResourcePricing,
    isIncluded: boolean
  ): { totalCost: number; requiresPayment: boolean; paymentRequired?: number } {
    if (isIncluded) {
      return {
        totalCost: 0,
        requiresPayment: false
      };
    }
    
    let totalCost = 0;
    
    switch (pricing.pricingModel) {
      case 'per_use':
        totalCost = request.usageCount * pricing.unitPrice;
        break;
      case 'per_minute':
        totalCost = (request.usageDuration / 60) * pricing.unitPrice;
        break;
      case 'per_hour':
        totalCost = (request.usageDuration / 3600) * pricing.unitPrice;
        break;
      case 'per_day':
        totalCost = pricing.unitPrice;
        break;
      case 'per_trade':
        totalCost = request.usageCount * pricing.unitPrice;
        break;
    }
    
    // Aplicar mínimo e máximo
    totalCost = Math.max(totalCost, pricing.minimumCharge);
    if (pricing.maximumCharge) {
      totalCost = Math.min(totalCost, pricing.maximumCharge);
    }
    
    return {
      totalCost,
      requiresPayment: totalCost > 0,
      paymentRequired: totalCost
    };
  }
}
```

### 2. Serviço de Comissionamento

```typescript
// commission.service.ts
export class CommissionService {
  async calculateCommission(request: CalculateCommissionRequest): Promise<CalculateCommissionResponse> {
    const subscription = await this.getUserSubscription(request.userId);
    const commissionRates = await this.getPlanCommissionRates(subscription.planId);
    const rate = commissionRates[request.assetType];
    
    if (!rate) {
      throw new Error(`No commission rate found for asset type: ${request.assetType}`);
    }
    
    // Apenas operações lucrativas
    if (request.profitLoss <= 0) {
      return {
        tradeId: request.tradeId,
        commissionRate: 0,
        commissionAmount: 0,
        currency: 'BRL',
        isProfitTrade: false,
        planName: subscription.planName,
        effectiveRate: 0,
        minimumCommission: rate.minimumCommission,
        maximumCommission: rate.maximumCommission,
        finalCommission: 0,
        calculation: {
          baseRate: rate.commissionRate,
          planDiscount: 0,
          volumeDiscount: 0,
          finalRate: 0,
          appliedMinimum: false,
          appliedMaximum: false
        }
      };
    }
    
    // Calcular comissão base
    let commissionAmount = request.profitLoss * rate.commissionRate;
    
    // Aplicar descontos por volume (se houver)
    const volumeDiscount = this.calculateVolumeDiscount(request.tradeValue, subscription.planId);
    commissionAmount *= (1 - volumeDiscount);
    
    // Aplicar mínimo e máximo
    const finalCommission = Math.max(
      Math.min(commissionAmount, rate.maximumCommission || commissionAmount),
      rate.minimumCommission
    );
    
    return {
      tradeId: request.tradeId,
      commissionRate: rate.commissionRate,
      commissionAmount: finalCommission,
      currency: 'BRL',
      isProfitTrade: true,
      planName: subscription.planName,
      effectiveRate: finalCommission / request.profitLoss,
      minimumCommission: rate.minimumCommission,
      maximumCommission: rate.maximumCommission,
      finalCommission,
      calculation: {
        baseRate: rate.commissionRate,
        planDiscount: 0,
        volumeDiscount,
        finalRate: finalCommission / request.profitLoss,
        appliedMinimum: finalCommission === rate.minimumCommission,
        appliedMaximum: finalCommission === rate.maximumCommission
      }
    };
  }
  
  async collectCommission(request: CollectCommissionRequest): Promise<CollectCommissionResponse> {
    // Registrar comissão
    const commission = await this.recordCommission({
      userId: request.userId,
      tradeId: request.tradeId,
      commissionAmount: request.commissionAmount,
      currency: request.currency,
      status: 'pending'
    });
    
    // Processar pagamento
    let paymentResult;
    try {
      switch (request.paymentMethod) {
        case 'subscription_credit':
          paymentResult = await this.deductFromSubscriptionCredit(
            request.userId,
            request.commissionAmount
          );
          break;
        case 'stripe':
          paymentResult = await this.processStripePayment(
            request.userId,
            request.commissionAmount,
            request.currency
          );
          break;
        case 'pix':
          paymentResult = await this.processPixPayment(
            request.userId,
            request.commissionAmount
          );
          break;
        case 'bank_transfer':
          paymentResult = await this.processBankTransfer(
            request.userId,
            request.commissionAmount
          );
          break;
      }
      
      // Atualizar status da comissão
      await this.updateCommissionStatus(commission.id, 'collected', paymentResult.paymentId);
      
      return {
        id: commission.id,
        status: 'collected',
        message: 'Commission collected successfully',
        commissionId: commission.id,
        paymentId: paymentResult.paymentId,
        collectedAt: new Date().toISOString(),
        paymentDetails: {
          method: request.paymentMethod,
          amount: request.commissionAmount,
          currency: request.currency,
          transactionId: paymentResult.paymentId
        }
      };
      
    } catch (error) {
      await this.updateCommissionStatus(commission.id, 'failed');
      
      return {
        id: commission.id,
        status: 'failed',
        message: `Failed to collect commission: ${error.message}`,
        commissionId: commission.id
      };
    }
  }
}
```

## 📈 Monitoramento e Alertas

### Métricas de Performance
- **Response Time**: < 100ms para cálculos
- **Throughput**: 500+ cálculos/min
- **Error Rate**: < 0.1%
- **Uptime**: 99.9%

### Alertas Configuráveis
- **Alto Custo de Trading**: > R$ 100,00 por usuário
- **Comissões Não Coletadas**: > 10 comissões pendentes
- **Taxa de Comissão Baixa**: < 1% de taxa média
- **Uso Excessivo de Recursos**: > 90% do limite
- **Falhas de Cobrança**: > 5% de falhas

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO