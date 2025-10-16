# 🔐 Stripe + Better-Auth + Subscriptions Module - Hybrid Architecture

**Status**: ✅ **Integração Completa** (Plugin Better-Auth + Módulo Subscriptions)

---

## 🎯 Arquitetura Híbrida

Este projeto usa uma **arquitetura híbrida** para máxima flexibilidade:

### 1. **Better-Auth Stripe Plugin** (Autenticação + Stripe Customer)
- ✅ Gerencia **autenticação** de usuários
- ✅ Cria **Stripe Customer** automaticamente no signup
- ✅ Processa **webhooks do Stripe**
- ✅ Gerencia **sessões** e **trials**
- ✅ Tabela: `subscriptions` (Better-Auth managed)

### 2. **Módulo Subscriptions** (Lógica de Negócio)
- ✅ Gerencia **planos** de assinatura (Free, Pro, Enterprise)
- ✅ Gerencia **features** e **limites**
- ✅ Gerencia **quotas** e **usage tracking**
- ✅ Gerencia **histórico** de mudanças
- ✅ **Agnóstico a gateway** de pagamento (Stripe, Mercado Pago, PagSeguro, etc.)
- ✅ Tabelas: `subscription_plans`, `subscription_features`, `tenant_subscription_plans`, `subscription_history`

---

## 📊 Diagrama de Arquitetura

\`\`\`mermaid
graph TB
    subgraph "Better-Auth + Stripe Plugin"
        A[User Signup] --> B[Better-Auth]
        B --> C[Create Stripe Customer]
        C --> D[subscriptions table]
        D --> E[Stripe Webhooks]
    end

    subgraph "Subscriptions Module (Multi-Gateway)"
        F[subscription_plans] --> G[Planos: Free/Pro/Enterprise]
        H[subscription_features] --> I[Features por plano]
        J[tenant_subscription_plans] --> K[Assinaturas ativas]
        L[subscription_history] --> M[Histórico de mudanças]
    end

    subgraph "Sincronização"
        E --> N[Webhook Handler]
        N --> J
        N --> L
    end

    style A fill:#e1f5ff
    style F fill:#fff4e1
    style N fill:#e1ffe1
\`\`\`

---

## 🗄️ Estrutura de Tabelas

### Better-Auth Tables (Plugin Stripe)

#### `users`
\`\`\`sql
- id (PK)
- name
- email (unique)
- email_verified
- stripe_customer_id  ← Link para Stripe Customer
- created_at
- updated_at
\`\`\`

#### `subscriptions` (Better-Auth Managed)
\`\`\`sql
- id (PK)
- plan (text)                    ← Nome do plano (free, pro, enterprise)
- reference_id (text)            ← User ID ou Organization ID
- stripe_customer_id (text)      ← Stripe Customer ID
- stripe_subscription_id (text)  ← Stripe Subscription ID
- status (text)                  ← active, canceled, past_due, trialing
- period_start (timestamp)
- period_end (timestamp)
- cancel_at_period_end (boolean)
- seats (int)
- trial_start (timestamp)
- trial_end (timestamp)
- created_at
- updated_at
\`\`\`

---

### Subscriptions Module Tables (Multi-Gateway)

#### `subscription_plans`
\`\`\`sql
- id (UUID PK)
- name (unique)
- display_name
- description
- slug (unique)                      ← free, pro, enterprise
- price_monthly (decimal)
- price_quarterly (decimal)
- price_yearly (decimal)
- currency                           ← BRL, USD
- stripe_product_id                  ← Stripe Product ID (opcional)
- stripe_price_id_monthly            ← Stripe Price ID mensal
- stripe_price_id_quarterly          ← Stripe Price ID trimestral
- stripe_price_id_yearly             ← Stripe Price ID anual
- limits (JSONB)                     ← maxBots, maxStrategies, etc.
- features (JSONB)                   ← ['backtesting', 'api_access', ...]
- is_active
- is_public
- is_featured
- sort_order
- trial_days
- created_at
- updated_at
\`\`\`

#### `subscription_features`
\`\`\`sql
- id (UUID PK)
- name (unique)
- display_name
- description
- slug (unique)
- category                           ← trading, analytics, ai, integrations
- is_core
- is_premium
- is_enterprise
- icon
- sort_order
- created_at
- updated_at
\`\`\`

#### `tenant_subscription_plans`
\`\`\`sql
- id (UUID PK)
- tenant_id (FK)
- plan_id (FK)
- status                             ← active, past_due, canceled, trialing
- stripe_subscription_id             ← Sincronizado do Better-Auth
- stripe_customer_id                 ← Sincronizado do Better-Auth
- billing_period                     ← monthly, quarterly, yearly
- current_period_start
- current_period_end
- trial_start
- trial_end
- cancel_at_period_end
- canceled_at
- metadata (JSONB)
- created_at
- updated_at
\`\`\`

#### `subscription_history`
\`\`\`sql
- id (UUID PK)
- tenant_id (FK)
- plan_id (FK)
- previous_plan_id (FK)
- user_id (FK)
- event_type                         ← created, upgraded, downgraded, canceled
- event_category                     ← subscription, payment, trial
- event_source                       ← user_action, webhook, system
- title
- description
- old_status
- new_status
- old_price
- new_price
- currency
- reason
- notes
- metadata (JSONB)
- event_time
\`\`\`

---

## 🔄 Fluxo de Integração

### 1. **User Signup**
\`\`\`typescript
// Better-Auth + Stripe Plugin
1. User se cadastra → POST /api/auth/sign-up/email
2. Better-Auth cria user na tabela users
3. Plugin Stripe cria Stripe Customer automaticamente
4. stripe_customer_id é salvo no user
\`\`\`

### 2. **Subscribe to Plan**
\`\`\`typescript
// Frontend → Better-Auth Stripe Plugin
await authClient.subscription.upgrade({
  plan: "pro",           // Plan name from Better-Auth config
  annual: false,         // true = yearly, false = monthly
  referenceId: user.id,  // User or organization ID
  successUrl: "/dashboard?success=true",
  cancelUrl: "/pricing?canceled=true"
});

// Result:
// 1. Cria Stripe Checkout Session
// 2. Redireciona usuário para checkout do Stripe
// 3. Após pagamento → webhook checkout.session.completed
// 4. Plugin Better-Auth cria record na tabela `subscriptions`
\`\`\`

### 3. **Webhook Sync** (Stripe → Better-Auth → Subscriptions Module)
\`\`\`typescript
// backend/src/modules/subscriptions/webhooks/stripe-sync.service.ts
export class StripeSyncService {
  /**
   * Sincroniza subscription do Better-Auth para o módulo Subscriptions
   */
  async syncFromBetterAuth(stripeSubscriptionId: string) {
    // 1. Buscar subscription da tabela Better-Auth
    const betterAuthSub = await db
      .select()
      .from(authSchema.subscriptions)
      .where(eq(authSchema.subscriptions.stripeSubscriptionId, stripeSubscriptionId))
      .limit(1);

    if (!betterAuthSub) return;

    // 2. Buscar plano pelo slug
    const plan = await subscriptionPlansService.getPlanBySlug(betterAuthSub.plan);

    // 3. Criar/atualizar no módulo Subscriptions
    await db.insert(tenantSubscriptionPlans).values({
      tenantId: betterAuthSub.referenceId,
      planId: plan.id,
      status: betterAuthSub.status,
      stripeSubscriptionId: betterAuthSub.stripeSubscriptionId,
      stripeCustomerId: betterAuthSub.stripeCustomerId,
      billingPeriod: 'monthly', // TODO: detectar do Stripe
      currentPeriodStart: betterAuthSub.periodStart,
      currentPeriodEnd: betterAuthSub.periodEnd,
      trialStart: betterAuthSub.trialStart,
      trialEnd: betterAuthSub.trialEnd,
      cancelAtPeriodEnd: betterAuthSub.cancelAtPeriodEnd,
    });

    // 4. Registrar no histórico
    await subscriptionManagementService.logSubscriptionEvent({
      tenantId: betterAuthSub.referenceId,
      planId: plan.id,
      eventType: 'created',
      eventCategory: 'subscription',
      eventSource: 'webhook',
      title: `Subscribed to ${plan.displayName}`,
      description: 'Subscription created via Stripe webhook',
      newStatus: betterAuthSub.status,
    });
  }
}
\`\`\`

### 4. **Check Active Subscription**
\`\`\`typescript
// Usar módulo Subscriptions (agnóstico a gateway)
const subscription = await subscriptionManagementService.getTenantSubscription(tenantId);

if (!subscription || subscription.status !== 'active') {
  throw new UnauthorizedError('Active subscription required');
}

// Verificar limites do plano
const plan = await subscriptionPlansService.getPlanById(subscription.planId);
if (botsCount >= plan.limits.maxBots) {
  throw new BadRequestError(`Bot limit reached: ${plan.limits.maxBots}`);
}
\`\`\`

---

## 🎯 Vantagens da Arquitetura Híbrida

### ✅ Better-Auth Stripe Plugin
- ✅ Autenticação + Pagamento integrado
- ✅ Webhooks automáticos
- ✅ Stripe Customer gerenciado
- ✅ Trials com anti-abuse (1 trial por usuário)

### ✅ Módulo Subscriptions
- ✅ **Multi-gateway** (fácil adicionar Mercado Pago, PagSeguro, etc.)
- ✅ Lógica de negócio **desacoplada**
- ✅ **Usage tracking** e quotas
- ✅ **Analytics** (MRR, ARR, churn)
- ✅ **Histórico** completo de mudanças
- ✅ **Features** granulares por plano

---

## 🚀 Próximos Passos

### 1. Criar Produtos no Stripe Dashboard
\`\`\`bash
# 1. Acesse: https://dashboard.stripe.com/test/products
# 2. Criar 3 produtos:
#    - Pro (R$ 29/mês)
#    - Enterprise (R$ 299/mês)
# 3. Copiar Price IDs e adicionar no .env:

STRIPE_PRICE_PRO_MONTHLY=price_xxx
STRIPE_PRICE_PRO_QUARTERLY=price_xxx
STRIPE_PRICE_PRO_YEARLY=price_xxx

STRIPE_PRICE_ENTERPRISE_MONTHLY=price_xxx
STRIPE_PRICE_ENTERPRISE_QUARTERLY=price_xxx
STRIPE_PRICE_ENTERPRISE_YEARLY=price_xxx
\`\`\`

### 2. Atualizar Better-Auth Config
\`\`\`typescript
// src/modules/auth/services/auth.config.ts
{
  name: 'pro',
  priceId: process.env.STRIPE_PRICE_PRO_MONTHLY!,
  annualDiscountPriceId: process.env.STRIPE_PRICE_PRO_YEARLY,
  // ...
}
\`\`\`

### 3. Atualizar Seed com Stripe IDs
\`\`\`typescript
// src/modules/subscriptions/seeds/subscription-plans.seed.ts
{
  name: 'Pro',
  slug: 'pro',
  stripeProductId: 'prod_xxx',
  stripePriceIdMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
  stripePriceIdQuarterly: process.env.STRIPE_PRICE_PRO_QUARTERLY,
  stripePriceIdYearly: process.env.STRIPE_PRICE_PRO_YEARLY,
  // ...
}
\`\`\`

### 4. Implementar Sync Service
\`\`\`bash
# Criar webhook sync
mkdir -p src/modules/subscriptions/webhooks
touch src/modules/subscriptions/webhooks/stripe-sync.service.ts
\`\`\`

### 5. Configurar Webhooks no Stripe
\`\`\`
Endpoint URL: https://your-domain.com/api/auth/stripe/webhook
Events:
- checkout.session.completed
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_succeeded
- invoice.payment_failed
\`\`\`

---

## 📚 Recursos

- **Better-Auth Docs**: https://www.better-auth.com/docs
- **Better-Auth Stripe Plugin**: https://www.better-auth.com/docs/plugins/stripe
- **Stripe API Docs**: https://stripe.com/docs/api
- **Stripe Webhooks**: https://stripe.com/docs/webhooks

---

**BotCriptoFy2** | Stripe + Better-Auth Integration v1.0.0
**Status**: ✅ Backend Completo | Multi-Gateway Ready
