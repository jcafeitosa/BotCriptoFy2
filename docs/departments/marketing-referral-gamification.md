# Sistema de Referral e Gamificação - Marketing

## 🎮 Visão Geral

O Sistema de Referral e Gamificação é um módulo completo e configurável integrado ao departamento de Marketing, permitindo que usuários ganhem recompensas através de referências e engajamento no sistema.

## 🏗️ Arquitetura do Sistema

### Componentes Principais
- **Sistema de Referral**: Links únicos, QR codes, tracking de conversões
- **Sistema de Gamificação**: Níveis, badges, pontuação, recompensas
- **Sistema de Configuração**: Painel administrativo totalmente configurável
- **Sistema de Recompensas**: Múltiplos tipos de recompensas configuráveis
- **Sistema de Metas**: Etapas progressivas com recompensas por conquista

### Integração com Better-Auth
- **Multi-tenancy**: Suporte a diferentes tipos de usuários
- **Billing Integration**: Integração com Stripe para recompensas
- **User Management**: Gestão de usuários e permissões
- **Session Management**: Controle de sessões e autenticação

## 📊 Estrutura de Dados

### Tabelas do Banco de Dados

#### 1. referral_links
```sql
CREATE TABLE referral_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  code VARCHAR(50) UNIQUE NOT NULL,
  qr_code_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. referral_tracking
```sql
CREATE TABLE referral_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users(id),
  referred_id UUID NOT NULL REFERENCES users(id),
  referral_link_id UUID NOT NULL REFERENCES referral_links(id),
  conversion_date TIMESTAMP DEFAULT NOW(),
  reward_claimed BOOLEAN DEFAULT false,
  reward_claimed_at TIMESTAMP,
  metadata JSONB
);
```

#### 3. gamification_levels
```sql
CREATE TABLE gamification_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  min_points INTEGER NOT NULL,
  max_points INTEGER,
  badge_url TEXT,
  color VARCHAR(7),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 4. gamification_rewards
```sql
CREATE TABLE gamification_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, -- discount, credit, access, physical, digital
  value DECIMAL(10,2),
  currency VARCHAR(3),
  duration_days INTEGER,
  conditions JSONB,
  limits JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 5. gamification_achievements
```sql
CREATE TABLE gamification_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  level_id UUID NOT NULL REFERENCES gamification_levels(id),
  points INTEGER NOT NULL,
  achieved_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB
);
```

#### 6. gamification_leaderboards
```sql
CREATE TABLE gamification_leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  points INTEGER NOT NULL,
  level_id UUID NOT NULL REFERENCES gamification_levels(id),
  position INTEGER,
  period VARCHAR(20) NOT NULL, -- daily, weekly, monthly, yearly
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 7. referral_goals
```sql
CREATE TABLE referral_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, -- referral, engagement, revenue, custom
  steps JSONB NOT NULL, -- Array de etapas com recompensas
  period_type VARCHAR(20) NOT NULL, -- permanent, temporary, recurring, campaign
  period_start TIMESTAMP,
  period_end TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 8. scoring_rules
```sql
CREATE TABLE scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  action VARCHAR(100) NOT NULL,
  points INTEGER NOT NULL,
  category VARCHAR(50) NOT NULL,
  multiplier DECIMAL(3,2) DEFAULT 1.0,
  conditions JSONB,
  limits JSONB,
  cooldown_seconds INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🎯 Sistema de Configuração

### 1. Tipos de Recompensas

#### Desconto Percentual
```typescript
interface DiscountPercentageReward {
  type: 'discount_percentage';
  value: number; // % de desconto
  duration: number; // dias
  conditions: {
    minSubscriptionValue?: number;
    maxUses?: number;
    applicablePlans?: string[];
  };
  limits: {
    maxDiscount?: number;
    cooldownDays?: number;
  };
}
```

#### Desconto Fixo
```typescript
interface DiscountFixedReward {
  type: 'discount_fixed';
  value: number; // valor do desconto
  currency: string; // moeda
  duration: number; // dias
  conditions: {
    minSubscriptionValue?: number;
    maxUses?: number;
    applicablePlans?: string[];
  };
  limits: {
    maxDiscount?: number;
    cooldownDays?: number;
  };
}
```

#### Crédito na Conta
```typescript
interface CreditReward {
  type: 'credit_balance';
  value: number; // valor do crédito
  currency: string; // moeda
  conditions: {
    minSubscriptionValue?: number;
    maxUses?: number;
  };
  limits: {
    maxCredit?: number;
    cooldownDays?: number;
  };
}
```

#### Acesso Premium
```typescript
interface PremiumAccessReward {
  type: 'premium_access';
  duration: number; // dias
  features: string[]; // funcionalidades premium
  conditions: {
    minSubscriptionValue?: number;
    maxUses?: number;
  };
  limits: {
    maxDuration?: number;
    cooldownDays?: number;
  };
}
```

### 2. Sistema de Metas

#### Metas de Referral
```typescript
interface ReferralGoal {
  id: string;
  name: string;
  type: 'referral';
  steps: ReferralStep[];
  period: {
    type: 'permanent' | 'temporary' | 'recurring' | 'campaign';
    start?: Date;
    end?: Date;
    duration?: number; // dias
  };
  eligibility: EligibilityRule[];
  restrictions: RestrictionRule[];
}

interface ReferralStep {
  step: number;
  name: string;
  description: string;
  requiredReferrals: number;
  reward: RewardConfig;
  isActive: boolean;
}
```

#### Metas de Engajamento
```typescript
interface EngagementGoal {
  id: string;
  name: string;
  type: 'engagement';
  steps: EngagementStep[];
  period: {
    type: 'permanent' | 'temporary' | 'recurring' | 'campaign';
    start?: Date;
    end?: Date;
    duration?: number; // dias
  };
  eligibility: EligibilityRule[];
  restrictions: RestrictionRule[];
}

interface EngagementStep {
  step: number;
  name: string;
  description: string;
  requiredPoints: number;
  reward: RewardConfig;
  isActive: boolean;
}
```

### 3. Sistema de Pontuação

#### Regras de Pontuação
```typescript
interface ScoringRule {
  id: string;
  name: string;
  action: string; // referral.conversion, user.daily_login, etc.
  points: number;
  category: 'referral' | 'engagement' | 'revenue' | 'social' | 'custom';
  multiplier: number; // 1.0 - 5.0
  conditions: {
    userRole?: string[];
    subscriptionPlan?: string[];
    geographic?: string[];
    temporal?: {
      startTime?: string;
      endTime?: string;
      daysOfWeek?: number[];
    };
  };
  limits: {
    maxPointsPerDay?: number;
    maxPointsPerWeek?: number;
    maxPointsPerMonth?: number;
  };
  cooldown: number; // segundos
  isActive: boolean;
}
```

#### Ações que Geram Pontos
- **Referência convertida**: 100 pontos (configurável)
- **Login diário**: 10 pontos (configurável)
- **Uso do sistema**: 5 pontos/hora (configurável)
- **Compartilhamento social**: 25 pontos (configurável)
- **Envio de feedback**: 15 pontos (configurável)
- **Completar perfil**: 50 pontos (configurável)
- **Primeira compra**: 200 pontos (configurável)

### 4. Sistema de Níveis

#### Configuração de Níveis
```typescript
interface GamificationLevel {
  id: string;
  name: string;
  description: string;
  minPoints: number;
  maxPoints?: number;
  badge: {
    url: string;
    color: string;
    size: 'small' | 'medium' | 'large';
  };
  rewards: RewardConfig[];
  privileges: string[];
  isActive: boolean;
}
```

#### Níveis Padrão
1. **Iniciante** (0-100 pontos)
2. **Bronze** (101-500 pontos)
3. **Prata** (501-1000 pontos)
4. **Ouro** (1001-2500 pontos)
5. **Platina** (2501-5000 pontos)
6. **Diamante** (5001+ pontos)

## 🔧 APIs do Sistema

### 1. Referral APIs

#### GET /api/marketing/referral/links
Listar links de referência do usuário

```typescript
interface ReferralLinkResponse {
  id: string;
  code: string;
  qrCodeUrl: string;
  isActive: boolean;
  totalReferrals: number;
  conversions: number;
  conversionRate: number;
  createdAt: string;
}
```

#### POST /api/marketing/referral/links
Criar novo link de referência

```typescript
interface CreateReferralLinkRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
}

interface CreateReferralLinkResponse {
  id: string;
  code: string;
  qrCodeUrl: string;
  shareUrl: string;
  createdAt: string;
}
```

#### GET /api/marketing/referral/tracking
Tracking de referências

```typescript
interface ReferralTrackingResponse {
  totalReferrals: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  rewards: number;
  timeline: ReferralTimelineItem[];
}

interface ReferralTimelineItem {
  date: string;
  referrals: number;
  conversions: number;
  revenue: number;
}
```

### 2. Gamificação APIs

#### GET /api/marketing/gamification/profile
Perfil de gamificação do usuário

```typescript
interface GamificationProfileResponse {
  userId: string;
  currentLevel: GamificationLevel;
  points: number;
  nextLevel: GamificationLevel;
  progress: number; // % para próximo nível
  achievements: Achievement[];
  badges: Badge[];
  position: number; // posição no ranking
  totalUsers: number;
}
```

#### GET /api/marketing/gamification/leaderboard
Leaderboard de usuários

```typescript
interface LeaderboardResponse {
  period: string;
  users: LeaderboardUser[];
  currentUser: LeaderboardUser;
  totalUsers: number;
}

interface LeaderboardUser {
  userId: string;
  name: string;
  points: number;
  level: string;
  position: number;
  avatar?: string;
}
```

#### POST /api/marketing/gamification/claim-reward
Reivindicar recompensa

```typescript
interface ClaimRewardRequest {
  rewardId: string;
  goalId?: string;
  stepId?: string;
}

interface ClaimRewardResponse {
  success: boolean;
  reward: RewardConfig;
  claimedAt: string;
  message: string;
}
```

### 3. Configuração APIs

#### GET /api/marketing/config/reward-types
Listar tipos de recompensas

```typescript
interface RewardTypeResponse {
  id: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  configurableFields: ConfigurableField[];
  validationRules: ValidationRule[];
}
```

#### POST /api/marketing/config/reward-types
Criar tipo de recompensa

```typescript
interface CreateRewardTypeRequest {
  name: string;
  description: string;
  category: string;
  configurableFields: ConfigurableField[];
  validationRules: ValidationRule[];
}

interface CreateRewardTypeResponse {
  id: string;
  success: boolean;
  message: string;
}
```

#### GET /api/marketing/config/goals
Listar metas configuradas

```typescript
interface GoalResponse {
  id: string;
  name: string;
  description: string;
  type: string;
  steps: GoalStep[];
  period: PeriodConfig;
  eligibility: EligibilityRule[];
  restrictions: RestrictionRule[];
  isActive: boolean;
  createdAt: string;
}
```

#### POST /api/marketing/config/goals
Criar nova meta

```typescript
interface CreateGoalRequest {
  name: string;
  description: string;
  type: string;
  steps: GoalStep[];
  period: PeriodConfig;
  eligibility: EligibilityRule[];
  restrictions: RestrictionRule[];
}

interface CreateGoalResponse {
  id: string;
  success: boolean;
  message: string;
}
```

## 🤖 Agente de Marketing Atualizado

### Novas Capacidades

#### referral_management
- Gestão de links de referência
- Análise de performance de referências
- Otimização de campanhas de referência
- Detecção de fraudes em referências

#### gamification_design
- Design de sistemas de gamificação
- Criação de níveis e badges
- Configuração de recompensas
- Análise de engajamento

#### campaign_optimization
- Otimização de campanhas de marketing
- A/B testing de recompensas
- Análise de ROI de campanhas
- Previsão de performance

#### reward_management
- Gestão de recompensas
- Análise de custo-benefício
- Otimização de recompensas
- Prevenção de abuso

#### performance_analysis
- Análise de performance de referências
- Análise de engajamento
- Relatórios de gamificação
- Insights de marketing

#### notifications
- Gestão de notificações de marketing
- Integração com sistema central de notificações
- Templates de notificação de marketing
- Configuração de preferências de notificação

### Novos Comandos

```bash
/analyze_referrals - Analisar performance de referências
/optimize_gamification - Otimizar sistema de gamificação
/manage_rewards - Gerenciar recompensas
/generate_campaign - Gerar nova campanha
/update_leaderboard - Atualizar ranking
/analyze_engagement - Analisar engajamento
/optimize_rewards - Otimizar recompensas
/detect_fraud - Detectar fraudes
/generate_report - Gerar relatório de marketing
/update_config - Atualizar configurações
/send_referral_notification - Enviar notificação de referência
/send_gamification_notification - Enviar notificação de gamificação
/send_campaign_notification - Enviar notificação de campanha
/send_marketing_report_notification - Enviar notificação de relatório
```

## 📊 Dashboard de Marketing Atualizado

### Métricas de Referral
- **Total de Referências**: Número total de referências
- **Taxa de Conversão**: % de referências convertidas
- **Receita Gerada**: Receita total gerada por referências
- **ROI das Campanhas**: Retorno sobre investimento
- **Top Performers**: Usuários com mais referências

### Métricas de Gamificação
- **Usuários Ativos**: Número de usuários ativos
- **Pontos Distribuídos**: Total de pontos distribuídos
- **Recompensas Entregues**: Número de recompensas entregues
- **Engajamento Médio**: Engajamento médio dos usuários
- **Retenção por Nível**: Retenção por nível de gamificação

### Métricas de Configuração
- **Tipos de Recompensas**: Número de tipos configurados
- **Metas Ativas**: Número de metas ativas
- **Regras de Pontuação**: Número de regras configuradas
- **Períodos Ativos**: Número de períodos ativos
- **Regras de Elegibilidade**: Número de regras configuradas

## 🔄 Fluxo de Trabalho

### 1. Criação de Link de Referência
```
Usuário → Solicita link → Sistema gera código único → QR Code → Link compartilhável
```

### 2. Conversão de Referência
```
Link compartilhado → Usuário clica → Registro de referência → Conversão → Recompensa
```

### 3. Sistema de Gamificação
```
Ação do usuário → Regra de pontuação → Pontos adicionados → Verificação de nível → Recompensa
```

### 4. Configuração de Sistema
```
Admin → Painel de configuração → Validação → Aplicação → Notificação → Atualização
```

## 🧪 Testes

### Testes Unitários
```bash
# Testes de referência
bun test src/admin/departments/marketing/referral/

# Testes de gamificação
bun test src/admin/departments/marketing/gamification/

# Testes de configuração
bun test src/admin/departments/marketing/config/
```

### Testes de Integração
```bash
# Testes de integração com Better-Auth
bun test tests/integration/marketing-auth.test.ts

# Testes de integração com Stripe
bun test tests/integration/marketing-stripe.test.ts

# Testes de integração com Telegram
bun test tests/integration/marketing-telegram.test.ts
```

## 🚀 Deploy

### Variáveis de Ambiente
```env
# Marketing Referral & Gamification
MARKETING_REFERRAL_ENABLED=true
MARKETING_GAMIFICATION_ENABLED=true
MARKETING_QR_CODE_BASE_URL=https://botcriptofy2.com/qr/
MARKETING_SHARE_BASE_URL=https://botcriptofy2.com/ref/
MARKETING_LEADERBOARD_CACHE_TTL=3600
MARKETING_POINTS_CACHE_TTL=1800
```

### Docker
```dockerfile
# Adicionar ao Dockerfile existente
COPY src/admin/departments/marketing/ ./src/admin/departments/marketing/
RUN bun install
```

## 📈 Monitoramento

### Métricas de Performance
- **Response Time**: < 200ms para APIs
- **Throughput**: 1000+ requests/min
- **Error Rate**: < 0.1%
- **Uptime**: 99.9%

### Alertas
- **Alta taxa de conversão**: > 20%
- **Baixa taxa de conversão**: < 5%
- **Abuso de sistema**: Múltiplas contas
- **Erro em recompensas**: Falha na entrega
- **Sistema de gamificação**: Falha na pontuação

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO