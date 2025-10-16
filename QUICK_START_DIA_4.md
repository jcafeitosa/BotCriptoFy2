# 🚀 QUICK START - Dia 4: Stripe Integration

**Objetivo**: Integrar Stripe como gateway de pagamento para o sistema de assinaturas

**Tempo estimado**: 4-6 horas

**Pré-requisitos**: Dia 3.5 completo (0 erros TypeScript)

---

## ⚡ INÍCIO RÁPIDO (10 minutos)

### 1. Verificar Estado

```bash
cd /Users/myminimac/Desenvolvimento/BotCriptoFy2/backend

# Confirmar 0 erros TypeScript
bunx tsc --noEmit

# Verificar Stripe já instalado
bun pm ls | grep stripe
# Deve mostrar: stripe@19.1.0
```

### 2. Ler Documentação

📖 **LEIA PRIMEIRO**: [DIA_4_STRIPE_INTEGRATION_PLAN.md](backend/docs/subscriptions/DIA_4_STRIPE_INTEGRATION_PLAN.md)

### 3. Configurar Stripe (Obrigatório)

**Criar conta**: https://dashboard.stripe.com/register

**Ativar test mode**: Toggle no canto superior direito

**Copiar API keys**: Developers → API keys → Reveal test key

---

## 🎯 TAREFAS SEQUENCIAIS

### Fase 1: Setup Stripe (30 min)

#### Task 1.1: Configurar .env

```bash
# Adicionar ao .env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SUCCESS_URL=http://localhost:3000/subscription/success
STRIPE_CANCEL_URL=http://localhost:3000/subscription/cancel
STRIPE_WEBHOOK_URL=http://localhost:3000/api/webhooks/stripe
```

#### Task 1.2: Criar Produtos no Stripe

1. Acessar: https://dashboard.stripe.com/test/products
2. Criar 4 produtos:
   - ✅ **Starter**: $29/mês, $290/ano
   - ✅ **Pro**: $99/mês, $990/ano
   - ✅ **Enterprise**: $499/mês, $4990/ano
3. Copiar Product IDs e Price IDs
4. Adicionar ao `.env`:

```bash
STRIPE_PRODUCT_STARTER=prod_...
STRIPE_PRODUCT_PRO=prod_...
STRIPE_PRODUCT_ENTERPRISE=prod_...

STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_STARTER_YEARLY=price_...
# ... etc
```

---

### Fase 2: Tipos (30 min)

#### Task 2.1: Criar stripe.types.ts

```bash
# Criar arquivo
touch src/modules/subscriptions/types/stripe.types.ts
```

**Conteúdo**: Ver seção "Fase 2" do [DIA_4_STRIPE_INTEGRATION_PLAN.md](backend/docs/subscriptions/DIA_4_STRIPE_INTEGRATION_PLAN.md)

---

### Fase 3: Stripe Service (90 min)

#### Task 3.1: Criar stripe.service.ts

```bash
touch src/modules/subscriptions/services/stripe.service.ts
```

**Implementar**:
- ✅ `createCheckoutSession()`
- ✅ `createPortalSession()`
- ✅ `syncSubscription()`
- ✅ `cancelSubscription()`
- ✅ `reactivateSubscription()`

**Conteúdo completo**: Ver seção "Fase 3" do plano

---

### Fase 4: Webhook Handlers (90 min)

#### Task 4.1: Criar webhook-handlers.service.ts

```bash
touch src/modules/subscriptions/services/webhook-handlers.service.ts
```

**Implementar handlers**:
- ✅ `handleCheckoutCompleted()`
- ✅ `handleSubscriptionCreated()`
- ✅ `handleSubscriptionUpdated()`
- ✅ `handleSubscriptionDeleted()`
- ✅ `handleTrialWillEnd()`
- ✅ `handlePaymentSucceeded()`
- ✅ `handlePaymentFailed()`

#### Task 4.2: Criar webhooks.routes.ts

```bash
touch src/modules/subscriptions/routes/webhooks.routes.ts
```

**Implementar**:
- ✅ POST `/webhooks/stripe` com signature verification
- ✅ Event routing por tipo
- ✅ Error handling

---

### Fase 5: Atualizar Rotas (60 min)

#### Task 5.1: Adicionar endpoints em authenticated.routes.ts

**Adicionar**:
- ✅ POST `/create-checkout` - Criar checkout session
- ✅ POST `/portal-session` - Criar customer portal session

#### Task 5.2: Importar stripe service

```typescript
import { stripeService } from '../services/stripe.service.js';
```

---

### Fase 6: Schema & Migração (15 min)

#### Task 6.1: Atualizar schema

**Arquivo**: `src/modules/subscriptions/schema/subscriptions.schema.ts`

```typescript
// Adicionar em subscriptions table:
stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),

// Adicionar em plans table:
stripePriceIdMonthly: varchar('stripe_price_id_monthly', { length: 255 }),
stripePriceIdYearly: varchar('stripe_price_id_yearly', { length: 255 }),
stripeProductId: varchar('stripe_product_id', { length: 255 }),
```

#### Task 6.2: Gerar e aplicar migração

```bash
bun run db:generate
bun run db:push

# Verificar
psql -U botcriptofy2 -d botcriptofy2 -c "\d subscriptions"
```

---

### Fase 7: Testes (60 min)

#### Task 7.1: Setup Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
# Copiar STRIPE_WEBHOOK_SECRET do output
```

#### Task 7.2: Testar Checkout Flow

```bash
# 1. Iniciar servidor
bun run dev

# 2. Criar checkout session (novo terminal)
curl -X POST http://localhost:3000/api/subscriptions/create-checkout \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "plan-uuid-aqui",
    "billingPeriod": "monthly"
  }'

# 3. Acessar checkoutUrl no browser
# 4. Usar card de teste: 4242 4242 4242 4242
# 5. Verificar webhook recebido no terminal do Stripe CLI
# 6. Verificar subscription criada no banco
```

#### Task 7.3: Testar Webhooks

```bash
# Terminal 1: Stripe CLI listening
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe

# Terminal 2: Trigger events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_failed
```

---

## 📋 CHECKLIST DE PROGRESSO

```markdown
### Setup (30 min)
- [ ] Criar conta Stripe (test mode)
- [ ] Copiar API keys para .env
- [ ] Criar 3 produtos no Stripe Dashboard
- [ ] Criar prices (monthly + yearly) para cada
- [ ] Copiar product/price IDs para .env
- [ ] Instalar Stripe CLI

### Código (3-4h)
- [ ] Criar types/stripe.types.ts
- [ ] Criar services/stripe.service.ts
- [ ] Criar services/webhook-handlers.service.ts
- [ ] Criar routes/webhooks.routes.ts
- [ ] Atualizar routes/authenticated.routes.ts
- [ ] Atualizar schema (campos Stripe)
- [ ] Gerar migração: bun run db:generate
- [ ] Aplicar migração: bun run db:push
- [ ] Validar TypeScript: bunx tsc --noEmit → 0 erros

### Testes (1h)
- [ ] Setup Stripe CLI
- [ ] Testar: Criar checkout session
- [ ] Testar: Completar checkout (4242...)
- [ ] Testar: Webhook checkout.session.completed
- [ ] Testar: Webhook subscription.updated
- [ ] Testar: Webhook subscription.deleted
- [ ] Testar: Customer portal session
- [ ] Testar: Cancelar subscription
- [ ] Verificar: Database sync correto
```

---

## ✅ CRITÉRIO DE SUCESSO

Você completou quando:

1. ✅ **TypeScript**: `bunx tsc --noEmit` = 0 erros
2. ✅ **Checkout funciona**: URL gerada → pagamento → webhook → DB atualizado
3. ✅ **Webhooks processam**: Todos os 7 event types com logs corretos
4. ✅ **Portal funciona**: Customer portal acessível e funcional
5. ✅ **Sync Stripe ↔ DB**: Status sempre sincronizado

---

## 🔗 RECURSOS

### Documentação
- 📘 [DIA_4_STRIPE_INTEGRATION_PLAN.md](backend/docs/subscriptions/DIA_4_STRIPE_INTEGRATION_PLAN.md) - Plano completo
- 📊 [DIA_3_5_COMPLETED.md](backend/docs/subscriptions/DIA_3_5_COMPLETED.md) - Estado atual

### Stripe Official
- [Stripe API Docs](https://stripe.com/docs/api)
- [Webhooks Guide](https://stripe.com/docs/webhooks)
- [Checkout Guide](https://stripe.com/docs/payments/checkout)
- [Testing Guide](https://stripe.com/docs/testing)

### Test Cards
```
✅ Sucesso: 4242 4242 4242 4242
🔐 3D Secure: 4000 0027 6000 3184
❌ Declined: 4000 0000 0000 0002
💰 Insufficient: 4000 0000 0000 9995
```

---

## 🚨 TROUBLESHOOTING

### Erro: "Webhook signature verification failed"

```bash
# Verificar STRIPE_WEBHOOK_SECRET está configurado
echo $STRIPE_WEBHOOK_SECRET

# Reiniciar Stripe CLI
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
```

### Erro: "Product not found"

```bash
# Verificar product IDs no .env
grep STRIPE_PRODUCT .env

# Verificar no Stripe Dashboard
open https://dashboard.stripe.com/test/products
```

### Erro: "Cannot find module 'stripe'"

```bash
# Reinstalar dependências
bun install
bun pm ls | grep stripe
```

---

## 🎉 APÓS COMPLETAR

1. ✅ Validar: Todos os checkboxes ✅
2. ✅ Testar: Fluxo completo end-to-end
3. ✅ Commit:
   ```bash
   git add .
   git commit -m "feat(subscriptions): integrate Stripe payment gateway

   - Implement Stripe checkout session creation
   - Add webhook handlers for subscription lifecycle
   - Sync subscription status Stripe ↔ Database
   - Add customer portal session creation
   - Update schema with Stripe fields

   Closes: Dia 4 - Stripe Integration
   Next: Dia 5 - Middleware & Guards

   🤖 Generated with Claude Code

   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```

4. 🚀 Prosseguir para **Dia 5 - Middleware & Guards**

---

**Boa sorte! 💪**

**Tempo estimado**: 4-6 horas
**Dificuldade**: Alta
**Impacto**: Crítico (desbloqueia monetização)
