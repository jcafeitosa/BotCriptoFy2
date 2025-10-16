# Sistema de Pagamentos Multi-Gateway

Sistema completo de processamento de pagamentos com suporte a múltiplos gateways (InfinityPay, Stripe, Banco Interno).

## Arquitetura

```
Client → Payment Routes → Payment Processor → Gateway Selector → Specific Gateway → External API
                    ↓                                ↓                      ↓
              Database Record                  Fee Calculation      Gateway Response
                    ↓                                                       ↓
              Webhook Handler ← Webhook Endpoint ← External Gateway Callback
                    ↓
              Transaction Update → Dunning Service (if failed)
```

## Componentes

### 1. Database Schema (6 Tables)

#### `payment_gateways`
Configuração dos gateways de pagamento.

```sql
- id: UUID (PK)
- name: varchar(100) - Nome do gateway
- slug: varchar(50) - Identificador único (infinitypay, stripe, banco)
- provider: varchar(50) - Provedor (infinitypay, stripe, banco)
- is_active: boolean - Gateway ativo?
- is_primary: boolean - Gateway primário?
- supported_countries: text[] - Países suportados
- supported_currencies: text[] - Moedas suportadas
- supported_methods: jsonb - Métodos de pagamento com config
- configuration: jsonb - API keys, secrets, etc
- fees: jsonb - Taxas do gateway
- webhook_url: varchar(500) - URL para webhooks
```

#### `payment_transactions`
Todas as transações de pagamento.

```sql
- id: UUID (PK)
- tenant_id: UUID (FK → tenants)
- user_id: UUID (FK → users)
- gateway_id: UUID (FK → payment_gateways)
- external_id: varchar(255) - ID no gateway externo
- amount: decimal(15,2) - Valor
- currency: varchar(3) - Moeda (BRL, USD, etc)
- payment_method: varchar(50) - Método (pix, credit_card, etc)
- status: varchar(20) - Status (pending, completed, failed, etc)
- gateway_status: varchar(50) - Status específico do gateway
- gateway_response: jsonb - Resposta completa do gateway
- metadata: jsonb - Metadados adicionais
- processed_at: timestamp
```

#### `payment_methods`
Métodos de pagamento salvos dos usuários.

```sql
- id: UUID (PK)
- user_id: UUID (FK → users)
- gateway_id: UUID (FK → payment_gateways)
- external_id: varchar(255) - ID no gateway
- type: varchar(50) - Tipo (card, pix, bank_transfer, etc)
- last_four: varchar(4) - Últimos 4 dígitos (cartão)
- brand: varchar(50) - Bandeira (visa, mastercard, etc)
- expiry_month: integer
- expiry_year: integer
- is_default: boolean - Método padrão?
- is_active: boolean - Ativo?
- metadata: jsonb
```

#### `payment_webhooks`
Eventos de webhook dos gateways.

```sql
- id: UUID (PK)
- gateway_id: UUID (FK → payment_gateways)
- external_id: varchar(255) - ID do evento
- event_type: varchar(100) - Tipo do evento
- payload: jsonb - Payload completo
- signature: varchar(500) - Assinatura para verificação
- processed: boolean - Processado?
- processed_at: timestamp
- error_message: text - Mensagem de erro se houver
- retry_count: integer - Contador de retentativas
```

#### `payment_refunds`
Transações de reembolso.

```sql
- id: UUID (PK)
- transaction_id: UUID (FK → payment_transactions)
- external_id: varchar(255) - ID no gateway
- amount: decimal(15,2) - Valor do reembolso
- reason: varchar(100) - Motivo
- status: varchar(20) - Status (pending, completed, failed)
- gateway_response: jsonb
- processed_at: timestamp
```

#### `payment_dunning`
Lógica de retry para pagamentos falhados.

```sql
- id: UUID (PK)
- transaction_id: UUID (FK → payment_transactions)
- tenant_id: UUID (FK → tenants)
- user_id: UUID (FK → users)
- attempt_count: integer - Contador de tentativas
- max_attempts: integer - Máximo de tentativas (padrão: 3)
- next_attempt: timestamp - Próxima tentativa
- last_attempt: timestamp - Última tentativa
- status: varchar(20) - Status (active, paused, completed, failed)
- metadata: jsonb
```

### 2. Gateways Implementados

#### InfinityPay (Brasil)
- **PIX**: 0.99% de taxa, instantâneo
- **Cartão de Crédito**: 3.99%, parcelamento até 12x
- **Cartão de Débito**: 1.99%, instantâneo
- **Boleto**: R$ 2.90 fixo

#### Stripe (Internacional)
- **Cartão de Crédito/Débito**: $0.30 + 2.9%
- **Apple Pay/Google Pay**: $0.30 + 2.9%
- Suporta: USD, CAD, GBP, EUR, AUD

#### Banco Interno
- **PIX**: Sem taxas, instantâneo
- **Transferências**: Sem taxas
- **Wallet Digital**: Sem taxas

### 3. Services

#### `GatewaySelector`
Seleciona o melhor gateway baseado em:
- País e moeda
- Método de pagamento
- Taxas
- Preferências do usuário
- Disponibilidade

#### `PaymentProcessor`
Orquestra todo o fluxo de pagamento:
- Cria registro de transação
- Processa pagamento via gateway
- Atualiza status
- Cria dunning se falhar

#### `DunningService`
Gerencia retentativas automáticas:
- Backoff exponencial: 24h, 72h, 168h (7 dias)
- Máximo de 3 tentativas por padrão
- Pode ser pausado/retomado

### 4. API Routes

#### Payments (`/api/v1/payments`)

**POST /** - Criar pagamento
```typescript
{
  amount: number,
  currency: string,
  paymentMethod: 'pix' | 'credit_card' | 'debit_card' | 'boleto' | 'bank_transfer' | 'digital_wallet',
  country?: string,
  gatewayPreferences?: string[],
  metadata?: Record<string, any>,
  installments?: number,
  savePaymentMethod?: boolean
}
```

**GET /:id** - Status do pagamento

**GET /** - Listar pagamentos
```typescript
{
  status?: string,
  limit?: number,
  offset?: number
}
```

**POST /:id/refund** - Processar reembolso
```typescript
{
  amount?: number,
  reason?: string
}
```

**GET /:id/refunds** - Listar reembolsos

**GET /:id/dunning** - Status de retry

**POST /:id/dunning/pause** - Pausar retry

**POST /:id/dunning/resume** - Retomar retry

**GET /dunning/stats** - Estatísticas de dunning

#### Gateways (`/api/v1/gateways`)

**GET /** - Listar gateways disponíveis
```typescript
{
  country: string,
  currency: string,
  paymentMethod?: string
}
```

**GET /:slug** - Detalhes do gateway

#### Webhooks (`/api/v1/webhooks` - Público)

**POST /:gateway** - Receber webhook
- InfinityPay: `/api/v1/webhooks/infinitypay`
- Stripe: `/api/v1/webhooks/stripe`
- Banco: `/api/v1/webhooks/banco`

## Instalação e Configuração

### 1. Executar Migration

```bash
# Conectar ao banco e executar a migration
psql $DATABASE_URL < drizzle/migrations/0004_payment_gateway_system.sql
```

### 2. Configurar Variáveis de Ambiente

```bash
# InfinityPay
INFINITYPAY_API_KEY=your_api_key
INFINITYPAY_API_SECRET=your_api_secret
INFINITYPAY_WEBHOOK_SECRET=your_webhook_secret

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Banco Interno
BANCO_INTERNAL_API_KEY=internal_key
BANCO_WEBHOOK_SECRET=banco_secret

# App URL para webhooks
APP_URL=https://yourdomain.com
```

### 3. Popular Gateways

```bash
bun run src/db/seeds/payment-gateways.seed.ts
```

### 4. Ativar Gateways

```sql
-- Ativar InfinityPay
UPDATE payment_gateways SET is_active = true WHERE slug = 'infinitypay';

-- Ativar Stripe
UPDATE payment_gateways SET is_active = true WHERE slug = 'stripe';
```

## Fluxo de Pagamento

### 1. Cliente Cria Pagamento

```typescript
POST /api/v1/payments
{
  "amount": 100.00,
  "currency": "BRL",
  "paymentMethod": "pix",
  "country": "BR"
}
```

### 2. Sistema Seleciona Gateway

O `GatewaySelector` analisa:
- País: BR → Filtra InfinityPay e Banco
- Moeda: BRL → Confirma compatibilidade
- Método: PIX → Verifica suporte
- Taxas: Compara 0.99% (InfinityPay) vs 0% (Banco)
- Prioridade: InfinityPay é primary

Resultado: **InfinityPay selecionado**

### 3. Payment Processor Executa

1. Cria registro em `payment_transactions` (status: pending)
2. Chama `InfinityPayGateway.processPayment()`
3. Recebe resposta com QR Code PIX
4. Atualiza transação com `externalId` e resposta
5. Retorna ao cliente

### 4. Cliente Recebe Resposta

```json
{
  "success": true,
  "transactionId": "uuid",
  "externalId": "infinitypay_id",
  "status": "pending",
  "gateway": "infinitypay",
  "qrCode": "00020101...",
  "qrCodeBase64": "data:image/png;base64,...",
  "pixKey": "chave@pix.com"
}
```

### 5. Usuário Paga PIX

- Escaneia QR Code ou copia código
- Realiza pagamento no app do banco
- InfinityPay detecta pagamento

### 6. Webhook Recebido

```typescript
POST /api/v1/webhooks/infinitypay
{
  "type": "payment.completed",
  "id": "infinitypay_id",
  "status": "completed",
  ...
}
```

Sistema:
1. Verifica assinatura do webhook
2. Salva evento em `payment_webhooks`
3. Processa evento via `InfinityPayGateway.processWebhook()`
4. Atualiza `payment_transactions` (status: completed)

### 7. Cliente Consulta Status

```typescript
GET /api/v1/payments/{transactionId}

Response:
{
  "success": true,
  "status": "completed",
  "transaction": { ... }
}
```

## Fluxo de Reembolso

### 1. Cliente Solicita Reembolso

```typescript
POST /api/v1/payments/{transactionId}/refund
{
  "amount": 50.00,  // parcial ou total
  "reason": "Produto defeituoso"
}
```

### 2. Sistema Processa

1. Valida transação (status = completed)
2. Cria registro em `payment_refunds` (status: pending)
3. Chama `gateway.processRefund()`
4. Atualiza refund com resposta
5. Se reembolso total, marca transação como refunded

### 3. Webhook de Confirmação

```typescript
POST /api/v1/webhooks/infinitypay
{
  "type": "refund.completed",
  ...
}
```

## Fluxo de Dunning (Retry)

### 1. Pagamento Falha

- Transaction criada com status: failed
- Dunning record criado automaticamente:
  - attemptCount: 0
  - maxAttempts: 3
  - nextAttempt: now + 24h
  - status: active

### 2. Cron Job Executa

```typescript
// Execute periodicamente (ex: a cada hora)
import { processDunningJob } from './services/dunning.service';

await processDunningJob();
```

### 3. Sistema Retenta

- Busca dunning records com `nextAttempt <= now`
- Para cada um:
  1. Incrementa `attemptCount`
  2. Tenta processar pagamento novamente
  3. Se sucesso: marca como `completed`
  4. Se falha e attemptCount < maxAttempts: agenda próxima (72h)
  5. Se atingiu max: marca como `failed`

### 4. Usuário Pode Gerenciar

```typescript
// Pausar retry
POST /api/v1/payments/{id}/dunning/pause

// Retomar retry
POST /api/v1/payments/{id}/dunning/resume

// Ver estatísticas
GET /api/v1/payments/dunning/stats
```

## Segurança

### Webhook Signature Verification

Todos os webhooks verificam assinatura:

**InfinityPay/Banco**:
```typescript
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(payload)
  .digest('hex');
```

**Stripe**:
```typescript
const signedPayload = `${timestamp}.${payload}`;
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(signedPayload)
  .digest('hex');
```

### Multi-tenancy

Todas as transações validam:
- `tenantId` do usuário autenticado
- Ownership da transação antes de operações

## Monitoramento

### Métricas Importantes

1. **Taxa de Sucesso**: `completed / total * 100`
2. **Taxa de Falha**: `failed / total * 100`
3. **Taxa de Dunning Success**: `dunning.completed / dunning.total * 100`
4. **Tempo Médio de Processamento**: webhook received - transaction created
5. **Webhooks Não Processados**: `processed = false AND retry_count > 3`

### Queries Úteis

```sql
-- Transações por status (últimas 24h)
SELECT status, COUNT(*) as count
FROM payment_transactions
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Taxa de sucesso por gateway
SELECT
  pg.name,
  COUNT(CASE WHEN pt.status = 'completed' THEN 1 END)::float / COUNT(*)::float * 100 as success_rate
FROM payment_transactions pt
JOIN payment_gateways pg ON pt.gateway_id = pg.id
WHERE pt.created_at > NOW() - INTERVAL '7 days'
GROUP BY pg.name;

-- Dunning pendentes
SELECT COUNT(*) FROM payment_dunning
WHERE status = 'active' AND next_attempt <= NOW();

-- Webhooks com falha
SELECT gateway_id, event_type, COUNT(*)
FROM payment_webhooks
WHERE processed = false AND retry_count >= 3
GROUP BY gateway_id, event_type;
```

## Troubleshooting

### Pagamento Ficou Pendente

1. Verificar se webhook foi recebido: `SELECT * FROM payment_webhooks WHERE external_id = 'xxx'`
2. Se não recebido: consultar status no gateway
3. Se recebido mas não processado: verificar erro em `error_message`
4. Reprocessar manualmente se necessário

### Webhook Falhando

1. Verificar assinatura está correta
2. Verificar payload está no formato esperado
3. Aumentar `retry_count` se necessário
4. Logs em `payment_webhooks.error_message`

### Dunning Não Está Executando

1. Verificar cron job está rodando
2. Verificar `next_attempt` está correto
3. Verificar `status = 'active'`
4. Logs do `dunningService.processDueDunning()`

## Próximos Passos

1. ✅ Implementar gateways adicionais conforme necessário
2. ✅ Adicionar métricas e dashboards
3. ✅ Implementar notificações para pagamentos
4. ✅ Criar testes end-to-end
5. ✅ Documentar APIs no Swagger/Scalar
6. ✅ Implementar reconciliação automática
7. ✅ Adicionar suporte a split payments
8. ✅ Implementar anti-fraude

## Referências

- [InfinityPay Docs](https://docs.infinitypay.io)
- [Stripe Docs](https://stripe.com/docs)
- [Payment System Best Practices](https://stripe.com/docs/payments/payment-intents)
