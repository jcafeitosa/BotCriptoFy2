# Sistema de Monitoramento de Uso da Plataforma - Módulo de Assinaturas

## 🎯 Visão Geral

O Sistema de Monitoramento de Uso da Plataforma é uma funcionalidade avançada do módulo de Assinaturas que permite rastrear e controlar o uso de recursos da plataforma por usuário, aplicando limites baseados no plano de assinatura e implementando ações de mitigação quando necessário.

## 🏗️ Arquitetura do Sistema

### Componentes Principais
- **Usage Tracker**: Rastreamento de uso em tempo real
- **Limit Engine**: Motor de verificação de limites
- **Enforcement Engine**: Motor de aplicação de restrições
- **Alert System**: Sistema de alertas e notificações
- **Analytics Engine**: Motor de análise de uso

### Integração com Better-Auth
- **User Context**: Contexto do usuário logado
- **Tenant Isolation**: Isolamento por tenant
- **Permission Control**: Controle de permissões
- **Session Management**: Gestão de sessões

## 📊 Estrutura de Dados Detalhada

### Tabelas de Monitoramento

#### 1. platform_usage_tracking
```sql
CREATE TABLE platform_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  subscription_id UUID NOT NULL REFERENCES user_subscriptions(id),
  feature_type VARCHAR(50) NOT NULL, -- bots, api_calls, storage, bandwidth, users, transactions
  feature_name VARCHAR(100) NOT NULL, -- bot_1, api_endpoint, file_upload, etc
  usage_count INTEGER NOT NULL DEFAULT 1,
  usage_value DECIMAL(15,2) DEFAULT 0, -- for storage, bandwidth, etc
  usage_unit VARCHAR(20), -- MB, GB, calls, hours, etc
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. usage_limits
```sql
CREATE TABLE usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  feature_type VARCHAR(50) NOT NULL,
  feature_name VARCHAR(100) NOT NULL,
  limit_type VARCHAR(20) NOT NULL, -- count, value, time, storage
  limit_value DECIMAL(15,2) NOT NULL,
  limit_unit VARCHAR(20),
  reset_period VARCHAR(20) NOT NULL, -- daily, weekly, monthly, yearly, lifetime
  is_hard_limit BOOLEAN DEFAULT true, -- true = block, false = warn
  overage_action VARCHAR(20) DEFAULT 'block', -- block, warn, charge, upgrade
  overage_price DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. usage_violations
```sql
CREATE TABLE usage_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  subscription_id UUID NOT NULL REFERENCES user_subscriptions(id),
  limit_id UUID NOT NULL REFERENCES usage_limits(id),
  violation_type VARCHAR(20) NOT NULL, -- exceeded, approaching, blocked
  current_usage DECIMAL(15,2) NOT NULL,
  limit_value DECIMAL(15,2) NOT NULL,
  excess_amount DECIMAL(15,2) NOT NULL,
  action_taken VARCHAR(50) NOT NULL, -- blocked, warned, charged, upgraded
  resolved_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 4. bot_usage_tracking
```sql
CREATE TABLE bot_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  subscription_id UUID NOT NULL REFERENCES user_subscriptions(id),
  bot_id VARCHAR(100) NOT NULL,
  bot_name VARCHAR(255) NOT NULL,
  bot_type VARCHAR(50) NOT NULL, -- trading, analysis, monitoring, etc
  status VARCHAR(20) NOT NULL, -- active, inactive, paused, error
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  total_runtime INTEGER DEFAULT 0, -- in seconds
  trades_executed INTEGER DEFAULT 0,
  api_calls_made INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  performance_score DECIMAL(3,2) DEFAULT 0.00,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🎯 Funcionalidades Detalhadas

### 1. Rastreamento de Uso em Tempo Real

#### Tipos de Recursos Monitorados
- **Bots**: Número de bots ativos, tempo de execução, trades executados
- **API Calls**: Chamadas por endpoint, por período, por usuário
- **Storage**: Armazenamento de arquivos, dados, logs
- **Bandwidth**: Largura de banda consumida
- **Users**: Número de usuários ativos por tenant
- **Transactions**: Volume de transações, valor total

#### Métricas Coletadas
- **Contadores**: Número de ações executadas
- **Valores**: Valores monetários, tamanhos de arquivo
- **Tempo**: Duração de sessões, tempo de execução
- **Performance**: Scores de performance, taxa de erro

### 2. Sistema de Limites Configuráveis

#### Tipos de Limites
- **Limites Rígidos**: Bloqueiam funcionalidade quando excedidos
- **Limites Flexíveis**: Apenas alertam quando excedidos
- **Limites com Cobrança**: Cobram por exceder limite
- **Limites com Upgrade**: Forçam upgrade de plano

#### Períodos de Reset
- **Diário**: Reset a cada 24 horas
- **Semanal**: Reset a cada 7 dias
- **Mensal**: Reset a cada 30 dias
- **Anual**: Reset a cada 365 dias
- **Vitalício**: Limites sem reset

#### Ações de Mitigação
- **Bloqueio**: Bloqueia funcionalidade
- **Alerta**: Envia notificação
- **Cobrança**: Cobra pelo excesso
- **Upgrade**: Força upgrade de plano

### 3. Planos de Assinatura Detalhados

#### Plano Start
```json
{
  "name": "Start",
  "price": 29.90,
  "currency": "BRL",
  "billing_cycle": "monthly",
  "limits": {
    "bots": {
      "max_active": 1,
      "max_total": 1,
      "reset_period": "monthly"
    },
    "api_calls": {
      "max_per_day": 1000,
      "max_per_hour": 100,
      "reset_period": "daily"
    },
    "storage": {
      "max_gb": 5,
      "reset_period": "lifetime"
    },
    "bandwidth": {
      "max_gb_per_month": 10,
      "reset_period": "monthly"
    },
    "users": {
      "max_per_tenant": 1,
      "reset_period": "lifetime"
    },
    "transactions": {
      "max_per_day": 50,
      "max_value_per_day": 1000,
      "reset_period": "daily"
    }
  }
}
```

#### Plano Pro
```json
{
  "name": "Pro",
  "price": 99.90,
  "currency": "BRL",
  "billing_cycle": "monthly",
  "limits": {
    "bots": {
      "max_active": 3,
      "max_total": 3,
      "reset_period": "monthly"
    },
    "api_calls": {
      "max_per_day": 10000,
      "max_per_hour": 1000,
      "reset_period": "daily"
    },
    "storage": {
      "max_gb": 50,
      "reset_period": "lifetime"
    },
    "bandwidth": {
      "max_gb_per_month": 100,
      "reset_period": "monthly"
    },
    "users": {
      "max_per_tenant": 5,
      "reset_period": "lifetime"
    },
    "transactions": {
      "max_per_day": 500,
      "max_value_per_day": 10000,
      "reset_period": "daily"
    }
  }
}
```

#### Plano Enterprise
```json
{
  "name": "Enterprise",
  "price": 299.90,
  "currency": "BRL",
  "billing_cycle": "monthly",
  "limits": {
    "bots": {
      "max_active": -1,
      "max_total": -1,
      "reset_period": "monthly"
    },
    "api_calls": {
      "max_per_day": 100000,
      "max_per_hour": 10000,
      "reset_period": "daily"
    },
    "storage": {
      "max_gb": 500,
      "reset_period": "lifetime"
    },
    "bandwidth": {
      "max_gb_per_month": 1000,
      "reset_period": "monthly"
    },
    "users": {
      "max_per_tenant": -1,
      "reset_period": "lifetime"
    },
    "transactions": {
      "max_per_day": -1,
      "max_value_per_day": -1,
      "reset_period": "daily"
    }
  }
}
```

## 🔧 APIs Detalhadas

### 1. Rastreamento de Uso

#### POST /api/assinaturas/usage/track
Rastrear uso da plataforma

```typescript
interface TrackUsageRequest {
  userId: string;
  featureType: 'bots' | 'api_calls' | 'storage' | 'bandwidth' | 'users' | 'transactions';
  featureName: string;
  usageCount?: number;
  usageValue?: number;
  usageUnit?: string;
  metadata?: Record<string, any>;
}

interface TrackUsageResponse {
  id: string;
  status: 'success' | 'error' | 'blocked';
  message: string;
  limitStatus: 'within' | 'approaching' | 'exceeded';
  currentUsage: number;
  limitValue: number;
  percentage: number;
  requiresAction: boolean;
  actionRequired?: 'block' | 'warn' | 'charge' | 'upgrade';
  restrictions?: string[];
  upgradeRequired?: boolean;
  upgradePlan?: string;
}
```

#### GET /api/assinaturas/usage/tracking/{userId}
Obter rastreamento completo do usuário

```typescript
interface UserUsageTrackingResponse {
  userId: string;
  subscriptionId: string;
  planName: string;
  currentUsage: {
    bots: BotUsageData;
    apiCalls: ApiUsageData;
    storage: StorageUsageData;
    bandwidth: BandwidthUsageData;
    users: UserCountData;
    transactions: TransactionUsageData;
  };
  limits: {
    bots: LimitData;
    apiCalls: LimitData;
    storage: LimitData;
    bandwidth: LimitData;
    users: LimitData;
    transactions: LimitData;
  };
  violations: UsageViolation[];
  recommendations: UsageRecommendation[];
  lastUpdated: string;
}
```

### 2. Verificação de Limites

#### POST /api/assinaturas/usage/check
Verificar se uso está dentro dos limites

```typescript
interface CheckUsageRequest {
  userId: string;
  featureType: string;
  featureName: string;
  requestedUsage: number;
}

interface CheckUsageResponse {
  allowed: boolean;
  reason?: string;
  currentUsage: number;
  limitValue: number;
  remainingUsage: number;
  percentage: number;
  requiresConfirmation: boolean;
  confirmationType?: 'email' | 'sms' | '2fa' | 'manual';
  restrictions?: string[];
  upgradeRequired?: boolean;
  upgradePlan?: string;
}
```

#### GET /api/assinaturas/usage/limits/{planId}
Obter limites do plano

```typescript
interface PlanLimitsResponse {
  planId: string;
  planName: string;
  limits: {
    bots: LimitConfig;
    apiCalls: LimitConfig;
    storage: LimitConfig;
    bandwidth: LimitConfig;
    users: LimitConfig;
    transactions: LimitConfig;
  };
  features: FeatureConfig[];
  policies: PolicyConfig[];
}
```

### 3. Gestão de Violações

#### GET /api/assinaturas/usage/violations/{userId}
Listar violações do usuário

```typescript
interface UserViolationsResponse {
  userId: string;
  violations: UsageViolation[];
  totalViolations: number;
  activeViolations: number;
  resolvedViolations: number;
  lastViolation?: string;
}
```

#### POST /api/assinaturas/usage/violations/{id}/resolve
Resolver violação

```typescript
interface ResolveViolationRequest {
  resolution: 'upgraded' | 'paid' | 'waived' | 'false_positive';
  notes?: string;
  metadata?: Record<string, any>;
}

interface ResolveViolationResponse {
  id: string;
  status: 'resolved' | 'error';
  message: string;
  resolvedAt: string;
}
```

## 🤖 Agente de Monitoramento

### Capacidades Específicas

#### usage_tracking
- Rastreamento em tempo real
- Coleta de métricas
- Análise de padrões
- Detecção de anomalias

#### limit_enforcement
- Verificação de limites
- Aplicação de restrições
- Bloqueio automático
- Alertas de aproximação

#### bot_monitoring
- Monitoramento de bots
- Controle de ativação
- Análise de performance
- Gestão de recursos

#### api_monitoring
- Contagem de chamadas
- Rate limiting
- Análise de endpoints
- Detecção de abuso

#### storage_monitoring
- Uso de armazenamento
- Análise de arquivos
- Limpeza automática
- Otimização de espaço

### Comandos Específicos

```bash
/track_usage - Rastrear uso da plataforma
/check_limits - Verificar limites de uso
/enforce_limits - Aplicar limites de planos
/monitor_bots - Monitorar uso de bots
/monitor_api_calls - Monitorar chamadas de API
/monitor_storage - Monitorar uso de storage
/monitor_bandwidth - Monitorar bandwidth
/alert_usage - Alertar sobre uso excessivo
/block_usage - Bloquear uso excessivo
/upgrade_required - Verificar necessidade de upgrade
/analyze_usage_patterns - Analisar padrões de uso
/optimize_limits - Otimizar limites de planos
/generate_usage_report - Gerar relatório de uso
```

## 📊 Dashboard de Monitoramento

### Métricas em Tempo Real
- **Usuários Ativos**: Número de usuários ativos
- **Bots Ativos**: Número de bots ativos
- **Chamadas de API**: Chamadas por minuto
- **Uso de Storage**: Armazenamento utilizado
- **Bandwidth**: Largura de banda consumida

### Métricas por Plano
- **Start**: Usuários no plano Start
- **Pro**: Usuários no plano Pro
- **Enterprise**: Usuários no plano Enterprise
- **Limites Excedidos**: Por plano
- **Upgrades Necessários**: Por plano

### Gráficos Interativos
- **Uso de Bots por Plano**: Gráfico de barras
- **Chamadas de API por Período**: Gráfico de linha
- **Storage por Usuário**: Gráfico de barras
- **Bandwidth por Plano**: Gráfico de pizza
- **Limites vs Uso**: Gráfico de comparação
- **Violações por Tipo**: Gráfico de pizza

### Alertas Inteligentes
- **Limites Excedidos**: Alertas de uso excessivo
- **Upgrade Necessário**: Alertas de necessidade de upgrade
- **Bots Bloqueados**: Alertas de bots bloqueados por limite
- **API Rate Limit**: Alertas de limite de API excedido
- **Storage Quase Cheio**: Alertas de storage próximo do limite
- **Bandwidth Alta**: Alertas de alto consumo de bandwidth

## 🔄 Fluxos de Trabalho

### 1. Rastreamento de Uso
```
Ação do Usuário → Coleta de Dados → Armazenamento → Análise → Notificação
```

### 2. Verificação de Limites
```
Solicitação → Verificação de Limite → Comparação → Decisão → Ação
```

### 3. Aplicação de Restrições
```
Violação Detectada → Análise de Severidade → Aplicação de Ação → Notificação → Log
```

### 4. Resolução de Violações
```
Violação → Análise → Ação de Resolução → Confirmação → Atualização de Status
```

## 🧪 Testes Específicos

### Testes de Rastreamento
```bash
# Testes de rastreamento de bots
bun test tests/usage-tracking/bot-tracking.test.ts

# Testes de rastreamento de API
bun test tests/usage-tracking/api-tracking.test.ts

# Testes de rastreamento de storage
bun test tests/usage-tracking/storage-tracking.test.ts
```

### Testes de Limites
```bash
# Testes de verificação de limites
bun test tests/limit-enforcement/limit-check.test.ts

# Testes de aplicação de restrições
bun test tests/limit-enforcement/restriction-application.test.ts

# Testes de violações
bun test tests/limit-enforcement/violation-handling.test.ts
```

### Testes de Integração
```bash
# Testes de integração com Better-Auth
bun test tests/integration/usage-auth.test.ts

# Testes de integração com Stripe
bun test tests/integration/usage-stripe.test.ts
```

## 🚀 Implementação

### 1. Middleware de Rastreamento

```typescript
// usage-tracking.middleware.ts
export const usageTrackingMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  const featureType = req.route?.featureType;
  const featureName = req.route?.featureName;
  
  if (userId && featureType && featureName) {
    try {
      const usageData = {
        userId,
        featureType,
        featureName,
        usageCount: 1,
        metadata: {
          endpoint: req.path,
          method: req.method,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        }
      };
      
      const result = await trackUsage(usageData);
      
      if (result.status === 'blocked') {
        return res.status(429).json({
          error: 'Usage limit exceeded',
          message: result.message,
          restrictions: result.restrictions,
          upgradeRequired: result.upgradeRequired
        });
      }
      
      if (result.requiresAction) {
        req.usageAction = result.actionRequired;
      }
      
    } catch (error) {
      console.error('Usage tracking error:', error);
    }
  }
  
  next();
};
```

### 2. Serviço de Verificação de Limites

```typescript
// limit-checker.service.ts
export class LimitCheckerService {
  async checkUsage(userId: string, featureType: string, featureName: string, requestedUsage: number): Promise<CheckUsageResponse> {
    const subscription = await this.getUserSubscription(userId);
    const limits = await this.getPlanLimits(subscription.planId);
    const currentUsage = await this.getCurrentUsage(userId, featureType, featureName);
    
    const limit = limits[featureType];
    const totalUsage = currentUsage + requestedUsage;
    
    if (totalUsage > limit.limitValue) {
      return {
        allowed: false,
        reason: 'Usage limit exceeded',
        currentUsage,
        limitValue: limit.limitValue,
        remainingUsage: Math.max(0, limit.limitValue - currentUsage),
        percentage: (totalUsage / limit.limitValue) * 100,
        requiresConfirmation: limit.overageAction === 'charge',
        confirmationType: 'email',
        restrictions: ['feature_blocked'],
        upgradeRequired: true,
        upgradePlan: this.getRecommendedUpgrade(subscription.planId)
      };
    }
    
    if (totalUsage > limit.limitValue * 0.8) {
      return {
        allowed: true,
        currentUsage,
        limitValue: limit.limitValue,
        remainingUsage: limit.limitValue - totalUsage,
        percentage: (totalUsage / limit.limitValue) * 100,
        requiresConfirmation: false
      };
    }
    
    return {
      allowed: true,
      currentUsage,
      limitValue: limit.limitValue,
      remainingUsage: limit.limitValue - totalUsage,
      percentage: (totalUsage / limit.limitValue) * 100,
      requiresConfirmation: false
    };
  }
}
```

### 3. Serviço de Aplicação de Restrições

```typescript
// restriction-applier.service.ts
export class RestrictionApplierService {
  async applyRestrictions(userId: string, violations: UsageViolation[]): Promise<void> {
    for (const violation of violations) {
      switch (violation.actionTaken) {
        case 'blocked':
          await this.blockFeature(userId, violation.limitId);
          break;
        case 'warned':
          await this.sendWarning(userId, violation);
          break;
        case 'charged':
          await this.chargeOverage(userId, violation);
          break;
        case 'upgraded':
          await this.suggestUpgrade(userId, violation);
          break;
      }
    }
  }
  
  private async blockFeature(userId: string, limitId: string): Promise<void> {
    // Implementar bloqueio de funcionalidade
    await this.updateUserPermissions(userId, { blocked: true, limitId });
  }
  
  private async sendWarning(userId: string, violation: UsageViolation): Promise<void> {
    // Implementar envio de alerta
    await this.sendNotification(userId, {
      type: 'usage_warning',
      message: `You are approaching your usage limit for ${violation.feature}`,
      violation
    });
  }
}
```

## 📈 Monitoramento e Alertas

### Métricas de Performance
- **Response Time**: < 50ms para verificação de limites
- **Throughput**: 1000+ verificações/min
- **Error Rate**: < 0.1%
- **Uptime**: 99.9%

### Alertas Configuráveis
- **Limite Excedido**: Qualquer limite excedido
- **Aproximação de Limite**: 80% do limite
- **Alto Uso de Bots**: > 90% do limite de bots
- **Alto Uso de API**: > 90% do limite de API
- **Storage Quase Cheio**: > 90% do limite de storage
- **Bandwidth Alta**: > 90% do limite de bandwidth

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO