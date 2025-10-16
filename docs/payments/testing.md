# Testes de Gateways de Pagamento - BotCriptoFy2

## 🧪 Visão Geral

Este documento descreve a estratégia completa de testes para os gateways de pagamento (InfinityPay, Banco e Stripe), incluindo testes unitários, integração, E2E e testes de segurança.

## 📋 Estratégia de Testes

### Pirâmide de Testes para Pagamentos
- **Testes Unitários**: 60% - Lógica de seleção, validação, mapeamento
- **Testes de Integração**: 30% - APIs dos gateways, webhooks
- **Testes E2E**: 10% - Fluxos completos de pagamento

### Tipos de Testes
- **Unitários**: Classes e funções individuais
- **Integração**: APIs dos gateways e webhooks
- **E2E**: Fluxos completos de pagamento
- **Segurança**: Validação de webhooks e dados sensíveis
- **Performance**: Carga e stress testing
- **Mock Testing**: Testes com gateways simulados

## 🛠️ Stack de Testes

### Backend (Elysia)
- **Framework**: Bun Test
- **Assertions**: Bun built-in assertions
- **Mocks**: Mock Service Worker
- **Coverage**: c8
- **API Testing**: Supertest

### Mocks e Fixtures
- **Gateway Mocks**: Simulação de respostas dos gateways
- **Webhook Mocks**: Simulação de webhooks
- **Database Fixtures**: Dados de teste para transações
- **Payment Fixtures**: Dados de pagamento de teste

## 🏗️ Estrutura de Testes

```
tests/
├── unit/                           # Testes unitários
│   ├── gateway-selector.test.ts   # Seleção de gateway
│   ├── payment-processor.test.ts  # Processamento de pagamentos
│   ├── gateway-manager.test.ts    # Gerenciador de gateways
│   └── webhook-handler.test.ts    # Processamento de webhooks
├── integration/                    # Testes de integração
│   ├── infinitypay.test.ts        # Integração InfinityPay
│   ├── banco.test.ts              # Integração Banco
│   ├── stripe.test.ts             # Integração Stripe
│   └── webhooks.test.ts           # Testes de webhooks
├── e2e/                           # Testes end-to-end
│   ├── payment-flows.test.ts      # Fluxos de pagamento
│   ├── refund-flows.test.ts       # Fluxos de reembolso
│   └── multi-gateway.test.ts      # Testes multi-gateway
├── security/                      # Testes de segurança
│   ├── webhook-security.test.ts   # Segurança de webhooks
│   ├── data-validation.test.ts    # Validação de dados
│   └── encryption.test.ts         # Criptografia
├── performance/                   # Testes de performance
│   ├── load-testing.test.ts       # Testes de carga
│   ├── stress-testing.test.ts     # Testes de stress
│   └── gateway-performance.test.ts # Performance dos gateways
├── fixtures/                      # Dados de teste
│   ├── payments.json              # Dados de pagamento
│   ├── webhooks.json              # Dados de webhook
│   └── gateways.json              # Configurações de gateway
└── mocks/                         # Mocks e simulações
    ├── infinitypay-mock.ts        # Mock InfinityPay
    ├── banco-mock.ts              # Mock Banco
    └── stripe-mock.ts             # Mock Stripe
```

## 🔧 Configuração de Testes

### 1. Setup de Testes

```typescript
// tests/setup/payment-setup.ts
import { beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

let prisma: PrismaClient;
let redis: Redis;

beforeAll(async () => {
  // Setup database de teste
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL,
      },
    },
  });

  // Setup Redis de teste
  redis = new Redis(process.env.TEST_REDIS_URL);

  // Executar migrações de teste
  await prisma.$executeRaw`CREATE SCHEMA IF NOT EXISTS test`;
  await prisma.$executeRaw`SET search_path TO test`;
});

afterAll(async () => {
  // Cleanup
  await prisma.$disconnect();
  await redis.disconnect();
});

beforeEach(async () => {
  // Limpar dados de teste
  await prisma.paymentTransaction.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.paymentGateway.deleteMany();
  await redis.flushdb();
});

export { prisma, redis };
```

### 2. Mocks dos Gateways

```typescript
// tests/mocks/infinitypay-mock.ts
export class InfinityPayMock {
  static createPaymentResponse = {
    id: 'inf_pay_123456789',
    status: 'pending',
    payment_url: 'https://infinitypay.com/pay/123456789',
    qr_code: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
    barcode: '12345678901234567890123456789012345678901234',
    due_date: '2024-12-20T23:59:59Z',
    amount: 10000, // em centavos
    currency: 'BRL',
    payment_method: 'pix'
  };

  static getPaymentStatusResponse = {
    id: 'inf_pay_123456789',
    status: 'approved',
    amount: 10000,
    currency: 'BRL',
    payment_method: 'pix',
    processed_at: '2024-12-19T10:30:00Z'
  };

  static refundResponse = {
    id: 'inf_ref_987654321',
    status: 'completed',
    amount: 5000,
    processed_at: '2024-12-19T11:00:00Z'
  };

  static webhookPayload = {
    id: 'evt_123456789',
    event_type: 'payment.approved',
    data: {
      id: 'inf_pay_123456789',
      status: 'approved',
      amount: 10000,
      currency: 'BRL'
    },
    created_at: '2024-12-19T10:30:00Z'
  };
}
```

```typescript
// tests/mocks/banco-mock.ts
export class BancoMock {
  static createPixPaymentResponse = {
    id: 'banco_pix_123456789',
    status: 'pending',
    qr_code: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
    qr_code_text: '00020126580014br.gov.bcb.pix...',
    pix_key: 'pix-123456789',
    expires_at: '2024-12-20T23:59:59Z'
  };

  static createBankTransferResponse = {
    id: 'banco_transfer_123456789',
    status: 'pending',
    transfer_code: 'TRF123456789',
    due_date: '2024-12-20T23:59:59Z',
    instructions: 'Transferir para conta 12345-6 agência 1234'
  };

  static getPaymentStatusResponse = {
    id: 'banco_pix_123456789',
    status: 'completed',
    amount: 100.00,
    currency: 'BRL',
    payment_method: 'pix',
    processed_at: '2024-12-19T10:30:00Z'
  };
}
```

```typescript
// tests/mocks/stripe-mock.ts
export class StripeMock {
  static createPaymentIntentResponse = {
    id: 'pi_1234567890',
    status: 'requires_payment_method',
    client_secret: 'pi_1234567890_secret_abcdef',
    amount: 10000, // em centavos
    currency: 'usd'
  };

  static getPaymentIntentResponse = {
    id: 'pi_1234567890',
    status: 'succeeded',
    amount: 10000,
    currency: 'usd',
    payment_method: 'pm_1234567890',
    created: 1703001000
  };

  static createRefundResponse = {
    id: 're_1234567890',
    status: 'succeeded',
    amount: 5000,
    created: 1703004600
  };

  static webhookPayload = {
    id: 'evt_1234567890',
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_1234567890',
        status: 'succeeded',
        amount: 10000,
        currency: 'usd'
      }
    },
    created: 1703001000
  };
}
```

## 🧪 Testes Unitários

### 1. Gateway Selector

```typescript
// tests/unit/gateway-selector.test.ts
import { describe, it, expect } from 'bun:test';
import { GatewaySelector } from '../../src/payments/gateway-selector';

describe('GatewaySelector', () => {
  let selector: GatewaySelector;

  beforeEach(() => {
    selector = new GatewaySelector();
  });

  describe('selectGateway', () => {
    it('should select InfinityPay for Brazilian PIX', async () => {
      const gateway = await selector.selectGateway('BR', 'BRL', 'pix', 100);
      
      expect(gateway.slug).toBe('infinitypay');
      expect(gateway.supportedCountries).toContain('BR');
      expect(gateway.supportedCurrencies).toContain('BRL');
      expect(gateway.supportedMethods.pix.enabled).toBe(true);
    });

    it('should select Stripe for US credit card', async () => {
      const gateway = await selector.selectGateway('US', 'USD', 'credit_card', 100);
      
      expect(gateway.slug).toBe('stripe');
      expect(gateway.supportedCountries).toContain('US');
      expect(gateway.supportedCurrencies).toContain('USD');
      expect(gateway.supportedMethods.credit_card.enabled).toBe(true);
    });

    it('should select Banco for Brazilian PIX when preferred', async () => {
      const gateway = await selector.selectGateway(
        'BR', 
        'BRL', 
        'pix', 
        100, 
        ['banco']
      );
      
      expect(gateway.slug).toBe('banco');
    });

    it('should throw error for unsupported combination', async () => {
      await expect(
        selector.selectGateway('XX', 'XXX', 'unsupported_method', 100)
      ).rejects.toThrow('No gateway available');
    });

    it('should select gateway with lowest cost', async () => {
      const gateway = await selector.selectGateway('BR', 'BRL', 'credit_card', 100);
      
      // InfinityPay should be selected as it has lower fees
      expect(gateway.slug).toBe('infinitypay');
    });
  });

  describe('calculateTotalCost', () => {
    it('should calculate cost correctly for fixed fee', () => {
      const gateway = {
        fees: { fixed: 2.90, percentage: 0 },
        supportedMethods: { pix: { enabled: true } }
      } as any;

      const cost = selector['calculateTotalCost'](gateway, 100);
      expect(cost).toBe(2.90);
    });

    it('should calculate cost correctly for percentage fee', () => {
      const gateway = {
        fees: { fixed: 0, percentage: 1.99 },
        supportedMethods: { pix: { enabled: true } }
      } as any;

      const cost = selector['calculateTotalCost'](gateway, 100);
      expect(cost).toBe(1.99);
    });

    it('should calculate cost correctly for combined fees', () => {
      const gateway = {
        fees: { fixed: 0.30, percentage: 1.4 },
        supportedMethods: { pix: { enabled: true } }
      } as any;

      const cost = selector['calculateTotalCost'](gateway, 100);
      expect(cost).toBe(1.70); // 0.30 + (100 * 0.014)
    });
  });
});
```

### 2. Payment Processor

```typescript
// tests/unit/payment-processor.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { PaymentProcessor } from '../../src/payments/payment-processor';
import { prisma } from '../setup';

describe('PaymentProcessor', () => {
  let processor: PaymentProcessor;

  beforeEach(() => {
    processor = new PaymentProcessor();
  });

  describe('processPayment', () => {
    it('should process PIX payment successfully', async () => {
      const paymentData = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        amount: 100.00,
        currency: 'BRL',
        paymentMethod: 'pix',
        country: 'BR'
      };

      const result = await processor.processPayment(paymentData);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.gateway).toBe('infinitypay');
      expect(result.status).toBe('pending');

      // Verificar se a transação foi criada no banco
      const transaction = await prisma.paymentTransaction.findUnique({
        where: { id: result.transactionId }
      });

      expect(transaction).toBeDefined();
      expect(transaction?.amount).toBe(100.00);
      expect(transaction?.currency).toBe('BRL');
      expect(transaction?.status).toBe('pending');
    });

    it('should handle payment failure', async () => {
      const paymentData = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        amount: 0, // Valor inválido
        currency: 'BRL',
        paymentMethod: 'pix',
        country: 'BR'
      };

      await expect(processor.processPayment(paymentData))
        .rejects.toThrow();

      // Verificar se a transação foi marcada como falhada
      const transactions = await prisma.paymentTransaction.findMany({
        where: { userId: 'user-1' }
      });

      expect(transactions).toHaveLength(1);
      expect(transactions[0].status).toBe('failed');
    });

    it('should process international payment with Stripe', async () => {
      const paymentData = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        amount: 100.00,
        currency: 'USD',
        paymentMethod: 'credit_card',
        country: 'US'
      };

      const result = await processor.processPayment(paymentData);

      expect(result.success).toBe(true);
      expect(result.gateway).toBe('stripe');
      expect(result.clientSecret).toBeDefined();
    });
  });

  describe('processRefund', () => {
    it('should process refund successfully', async () => {
      // Criar transação de teste
      const transaction = await prisma.paymentTransaction.create({
        data: {
          tenantId: 'tenant-1',
          userId: 'user-1',
          gatewayId: 'infinitypay-gateway-id',
          externalId: 'inf_pay_123456789',
          amount: 100.00,
          currency: 'BRL',
          paymentMethod: 'pix',
          status: 'completed'
        }
      });

      const result = await processor.processRefund(transaction.id, 50.00, 'Partial refund');

      expect(result.success).toBe(true);
      expect(result.refundId).toBeDefined();
      expect(result.amount).toBe(50.00);

      // Verificar se o reembolso foi criado no banco
      const refund = await prisma.paymentRefund.findUnique({
        where: { id: result.refundId }
      });

      expect(refund).toBeDefined();
      expect(refund?.amount).toBe(50.00);
      expect(refund?.reason).toBe('Partial refund');
    });

    it('should not allow refund of pending transaction', async () => {
      const transaction = await prisma.paymentTransaction.create({
        data: {
          tenantId: 'tenant-1',
          userId: 'user-1',
          gatewayId: 'infinitypay-gateway-id',
          externalId: 'inf_pay_123456789',
          amount: 100.00,
          currency: 'BRL',
          paymentMethod: 'pix',
          status: 'pending'
        }
      });

      await expect(
        processor.processRefund(transaction.id, 50.00)
      ).rejects.toThrow('Only completed transactions can be refunded');
    });
  });
});
```

## 🔗 Testes de Integração

### 1. InfinityPay Integration

```typescript
// tests/integration/infinitypay.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { InfinityPayGateway } from '../../src/payments/gateways/infinitypay';
import { InfinityPayMock } from '../mocks/infinitypay-mock';

describe('InfinityPay Integration', () => {
  let gateway: InfinityPayGateway;

  beforeEach(() => {
    gateway = new InfinityPayGateway({
      apiKey: 'test-api-key',
      secretKey: 'test-secret-key',
      baseUrl: 'https://api.infinitypay.com',
      environment: 'sandbox'
    });
  });

  describe('createPayment', () => {
    it('should create PIX payment', async () => {
      // Mock da resposta da API
      const mockResponse = InfinityPayMock.createPaymentResponse;

      const result = await gateway.createPayment({
        amount: 100.00,
        currency: 'BRL',
        paymentMethod: 'pix',
        customer: {
          name: 'Test User',
          email: 'test@example.com',
          document: '12345678901'
        }
      });

      expect(result.externalId).toBe(mockResponse.id);
      expect(result.status).toBe('pending');
      expect(result.qrCode).toBeDefined();
      expect(result.paymentUrl).toBeDefined();
    });

    it('should create credit card payment', async () => {
      const result = await gateway.createPayment({
        amount: 100.00,
        currency: 'BRL',
        paymentMethod: 'credit_card',
        customer: {
          name: 'Test User',
          email: 'test@example.com',
          document: '12345678901'
        }
      });

      expect(result.externalId).toBeDefined();
      expect(result.status).toBe('pending');
      expect(result.paymentUrl).toBeDefined();
    });

    it('should create boleto payment', async () => {
      const result = await gateway.createPayment({
        amount: 100.00,
        currency: 'BRL',
        paymentMethod: 'boleto',
        customer: {
          name: 'Test User',
          email: 'test@example.com',
          document: '12345678901'
        }
      });

      expect(result.externalId).toBeDefined();
      expect(result.status).toBe('pending');
      expect(result.barcode).toBeDefined();
      expect(result.dueDate).toBeDefined();
    });
  });

  describe('getPaymentStatus', () => {
    it('should get payment status', async () => {
      const mockResponse = InfinityPayMock.getPaymentStatusResponse;

      const result = await gateway.getPaymentStatus('inf_pay_123456789');

      expect(result.externalId).toBe(mockResponse.id);
      expect(result.status).toBe('completed');
      expect(result.amount).toBe(100.00);
      expect(result.currency).toBe('BRL');
    });
  });

  describe('processRefund', () => {
    it('should process refund', async () => {
      const mockResponse = InfinityPayMock.refundResponse;

      const result = await gateway.processRefund({
        externalId: 'inf_pay_123456789',
        amount: 50.00,
        reason: 'Partial refund'
      });

      expect(result.externalId).toBe(mockResponse.id);
      expect(result.status).toBe('completed');
      expect(result.amount).toBe(50.00);
    });
  });

  describe('verifyWebhook', () => {
    it('should verify valid webhook signature', async () => {
      const payload = InfinityPayMock.webhookPayload;
      const signature = 'valid_signature_hash';

      const isValid = await gateway.verifyWebhook(payload, signature);

      expect(isValid).toBe(true);
    });

    it('should reject invalid webhook signature', async () => {
      const payload = InfinityPayMock.webhookPayload;
      const signature = 'invalid_signature_hash';

      const isValid = await gateway.verifyWebhook(payload, signature);

      expect(isValid).toBe(false);
    });
  });
});
```

### 2. Webhook Integration

```typescript
// tests/integration/webhooks.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { Elysia } from 'elysia';
import { infinityPayWebhook } from '../../src/routes/webhooks/infinitypay';
import { stripeWebhook } from '../../src/routes/webhooks/stripe';
import { prisma } from '../setup';

describe('Webhook Integration', () => {
  describe('InfinityPay Webhook', () => {
    it('should handle payment approved webhook', async () => {
      const payload = {
        id: 'evt_123456789',
        event_type: 'payment.approved',
        data: {
          id: 'inf_pay_123456789',
          status: 'approved',
          amount: 10000,
          currency: 'BRL'
        }
      };

      const signature = 'valid_signature';

      const response = await infinityPayWebhook.handle(
        new Request('http://localhost:3000/webhooks/infinitypay', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-infinitypay-signature': signature
          },
          body: JSON.stringify(payload)
        })
      );

      expect(response.status).toBe(200);

      // Verificar se a transação foi atualizada
      const transaction = await prisma.paymentTransaction.findFirst({
        where: { externalId: 'inf_pay_123456789' }
      });

      expect(transaction?.status).toBe('completed');
    });

    it('should handle payment failed webhook', async () => {
      const payload = {
        id: 'evt_123456790',
        event_type: 'payment.failed',
        data: {
          id: 'inf_pay_123456790',
          status: 'failed',
          amount: 10000,
          currency: 'BRL'
        }
      };

      const signature = 'valid_signature';

      const response = await infinityPayWebhook.handle(
        new Request('http://localhost:3000/webhooks/infinitypay', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-infinitypay-signature': signature
          },
          body: JSON.stringify(payload)
        })
      );

      expect(response.status).toBe(200);

      // Verificar se a transação foi marcada como falhada
      const transaction = await prisma.paymentTransaction.findFirst({
        where: { externalId: 'inf_pay_123456790' }
      });

      expect(transaction?.status).toBe('failed');
    });
  });

  describe('Stripe Webhook', () => {
    it('should handle payment intent succeeded webhook', async () => {
      const payload = {
        id: 'evt_1234567890',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_1234567890',
            status: 'succeeded',
            amount: 10000,
            currency: 'usd'
          }
        }
      };

      const signature = 'valid_stripe_signature';

      const response = await stripeWebhook.handle(
        new Request('http://localhost:3000/webhooks/stripe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'stripe-signature': signature
          },
          body: JSON.stringify(payload)
        })
      );

      expect(response.status).toBe(200);

      // Verificar se a transação foi atualizada
      const transaction = await prisma.paymentTransaction.findFirst({
        where: { externalId: 'pi_1234567890' }
      });

      expect(transaction?.status).toBe('completed');
    });
  });
});
```

## 🎭 Testes E2E

### 1. Payment Flows

```typescript
// tests/e2e/payment-flows.test.ts
import { test, expect } from '@playwright/test';

test.describe('Payment Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Login como usuário
    await page.goto('/auth/login');
    await page.fill('[data-testid="email-input"]', 'user@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should complete PIX payment flow', async ({ page }) => {
    // Navegar para página de pagamento
    await page.goto('/payments/new');
    
    // Preencher dados do pagamento
    await page.fill('[data-testid="amount-input"]', '100.00');
    await page.selectOption('[data-testid="currency-select"]', 'BRL');
    await page.selectOption('[data-testid="payment-method-select"]', 'pix');
    
    // Submeter pagamento
    await page.click('[data-testid="process-payment-button"]');
    
    // Verificar seleção de gateway
    await expect(page.locator('[data-testid="gateway-info"]')).toContainText('InfinityPay');
    
    // Verificar QR Code
    await expect(page.locator('[data-testid="qr-code"]')).toBeVisible();
    
    // Simular pagamento aprovado
    await page.click('[data-testid="simulate-payment-button"]');
    
    // Verificar confirmação
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-success"]')).toContainText('Pagamento aprovado');
  });

  test('should complete credit card payment flow', async ({ page }) => {
    await page.goto('/payments/new');
    
    await page.fill('[data-testid="amount-input"]', '100.00');
    await page.selectOption('[data-testid="currency-select"]', 'USD');
    await page.selectOption('[data-testid="payment-method-select"]', 'credit_card');
    
    await page.click('[data-testid="process-payment-button"]');
    
    // Verificar seleção de gateway
    await expect(page.locator('[data-testid="gateway-info"]')).toContainText('Stripe');
    
    // Preencher dados do cartão
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="card-expiry"]', '12/25');
    await page.fill('[data-testid="card-cvc"]', '123');
    
    // Submeter pagamento
    await page.click('[data-testid="submit-payment-button"]');
    
    // Verificar confirmação
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
  });

  test('should handle payment failure', async ({ page }) => {
    await page.goto('/payments/new');
    
    await page.fill('[data-testid="amount-input"]', '0.01'); // Valor muito baixo
    await page.selectOption('[data-testid="currency-select"]', 'BRL');
    await page.selectOption('[data-testid="payment-method-select"]', 'pix');
    
    await page.click('[data-testid="process-payment-button"]');
    
    // Verificar erro
    await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-error"]')).toContainText('Valor inválido');
  });
});
```

### 2. Multi-Gateway Testing

```typescript
// tests/e2e/multi-gateway.test.ts
import { test, expect } from '@playwright/test';

test.describe('Multi-Gateway Testing', () => {
  test('should select appropriate gateway for Brazilian user', async ({ page }) => {
    // Simular localização brasileira
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'language', {
        get: () => 'pt-BR'
      });
    });

    await page.goto('/payments/new');
    
    await page.fill('[data-testid="amount-input"]', '100.00');
    await page.selectOption('[data-testid="currency-select"]', 'BRL');
    await page.selectOption('[data-testid="payment-method-select"]', 'pix');
    
    await page.click('[data-testid="process-payment-button"]');
    
    // Deve selecionar InfinityPay para PIX no Brasil
    await expect(page.locator('[data-testid="gateway-info"]')).toContainText('InfinityPay');
  });

  test('should select appropriate gateway for US user', async ({ page }) => {
    // Simular localização americana
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'language', {
        get: () => 'en-US'
      });
    });

    await page.goto('/payments/new');
    
    await page.fill('[data-testid="amount-input"]', '100.00');
    await page.selectOption('[data-testid="currency-select"]', 'USD');
    await page.selectOption('[data-testid="payment-method-select"]', 'credit_card');
    
    await page.click('[data-testid="process-payment-button"]');
    
    // Deve selecionar Stripe para cartão nos EUA
    await expect(page.locator('[data-testid="gateway-info"]')).toContainText('Stripe');
  });

  test('should respect user gateway preference', async ({ page }) => {
    await page.goto('/payments/new');
    
    // Selecionar gateway preferido
    await page.selectOption('[data-testid="gateway-select"]', 'banco');
    
    await page.fill('[data-testid="amount-input"]', '100.00');
    await page.selectOption('[data-testid="currency-select"]', 'BRL');
    await page.selectOption('[data-testid="payment-method-select"]', 'pix');
    
    await page.click('[data-testid="process-payment-button"]');
    
    // Deve usar o gateway preferido
    await expect(page.locator('[data-testid="gateway-info"]')).toContainText('Banco');
  });
});
```

## 🔒 Testes de Segurança

### 1. Webhook Security

```typescript
// tests/security/webhook-security.test.ts
import { describe, it, expect } from 'bun:test';
import { InfinityPayGateway } from '../../src/payments/gateways/infinitypay';

describe('Webhook Security', () => {
  let gateway: InfinityPayGateway;

  beforeEach(() => {
    gateway = new InfinityPayGateway({
      apiKey: 'test-api-key',
      secretKey: 'test-secret-key',
      baseUrl: 'https://api.infinitypay.com',
      environment: 'sandbox'
    });
  });

  it('should verify webhook signature correctly', async () => {
    const payload = { id: 'test', amount: 100 };
    const signature = 'valid_signature_hash';

    const isValid = await gateway.verifyWebhook(payload, signature);
    expect(isValid).toBe(true);
  });

  it('should reject webhook with invalid signature', async () => {
    const payload = { id: 'test', amount: 100 };
    const signature = 'invalid_signature';

    const isValid = await gateway.verifyWebhook(payload, signature);
    expect(isValid).toBe(false);
  });

  it('should reject webhook with missing signature', async () => {
    const payload = { id: 'test', amount: 100 };
    const signature = '';

    const isValid = await gateway.verifyWebhook(payload, signature);
    expect(isValid).toBe(false);
  });

  it('should handle webhook replay attacks', async () => {
    const payload = { id: 'test', amount: 100, timestamp: Date.now() - 3600000 }; // 1 hour ago
    const signature = 'valid_signature_hash';

    const isValid = await gateway.verifyWebhook(payload, signature);
    expect(isValid).toBe(false); // Should reject old webhooks
  });
});
```

### 2. Data Validation

```typescript
// tests/security/data-validation.test.ts
import { describe, it, expect } from 'bun:test';
import { PaymentProcessor } from '../../src/payments/payment-processor';

describe('Data Validation Security', () => {
  let processor: PaymentProcessor;

  beforeEach(() => {
    processor = new PaymentProcessor();
  });

  it('should validate payment amount', async () => {
    const paymentData = {
      tenantId: 'tenant-1',
      userId: 'user-1',
      amount: -100, // Valor negativo
      currency: 'BRL',
      paymentMethod: 'pix',
      country: 'BR'
    };

    await expect(processor.processPayment(paymentData))
      .rejects.toThrow('Invalid payment amount');
  });

  it('should validate currency format', async () => {
    const paymentData = {
      tenantId: 'tenant-1',
      userId: 'user-1',
      amount: 100,
      currency: 'INVALID', // Moeda inválida
      paymentMethod: 'pix',
      country: 'BR'
    };

    await expect(processor.processPayment(paymentData))
      .rejects.toThrow('Invalid currency');
  });

  it('should validate country code', async () => {
    const paymentData = {
      tenantId: 'tenant-1',
      userId: 'user-1',
      amount: 100,
      currency: 'BRL',
      paymentMethod: 'pix',
      country: 'INVALID' // País inválido
    };

    await expect(processor.processPayment(paymentData))
      .rejects.toThrow('Invalid country code');
  });

  it('should sanitize user input', async () => {
    const paymentData = {
      tenantId: 'tenant-1',
      userId: 'user-1',
      amount: 100,
      currency: 'BRL',
      paymentMethod: 'pix',
      country: 'BR',
      metadata: {
        description: '<script>alert("xss")</script>' // XSS attempt
      }
    };

    const result = await processor.processPayment(paymentData);
    
    // Verificar se o script foi sanitizado
    expect(result.metadata.description).not.toContain('<script>');
  });
});
```

## ⚡ Testes de Performance

### 1. Load Testing

```typescript
// tests/performance/load-testing.test.ts
import { describe, it, expect } from 'bun:test';
import { PaymentProcessor } from '../../src/payments/payment-processor';

describe('Payment Load Testing', () => {
  let processor: PaymentProcessor;

  beforeEach(() => {
    processor = new PaymentProcessor();
  });

  it('should handle concurrent payments', async () => {
    const payments = Array.from({ length: 100 }, (_, i) => ({
      tenantId: 'tenant-1',
      userId: `user-${i}`,
      amount: 100,
      currency: 'BRL',
      paymentMethod: 'pix',
      country: 'BR'
    }));

    const startTime = Date.now();
    const results = await Promise.all(
      payments.map(payment => processor.processPayment(payment))
    );
    const endTime = Date.now();

    const duration = endTime - startTime;
    const successCount = results.filter(r => r.success).length;

    expect(successCount).toBe(100);
    expect(duration).toBeLessThan(5000); // Deve completar em menos de 5 segundos
  });

  it('should handle high volume webhook processing', async () => {
    const webhooks = Array.from({ length: 1000 }, (_, i) => ({
      id: `evt_${i}`,
      event_type: 'payment.approved',
      data: {
        id: `inf_pay_${i}`,
        status: 'approved',
        amount: 10000,
        currency: 'BRL'
      }
    }));

    const startTime = Date.now();
    
    // Processar webhooks em lotes
    const batchSize = 100;
    for (let i = 0; i < webhooks.length; i += batchSize) {
      const batch = webhooks.slice(i, i + batchSize);
      await Promise.all(
        batch.map(webhook => processWebhook(webhook))
      );
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(10000); // Deve completar em menos de 10 segundos
  });
});

async function processWebhook(webhook: any) {
  // Simular processamento de webhook
  return new Promise(resolve => setTimeout(resolve, 10));
}
```

## 📊 Coverage e Relatórios

### 1. Coverage Configuration

```json
// package.json
{
  "scripts": {
    "test:payments": "bun test tests/unit/payments/ tests/integration/payments/",
    "test:payments:coverage": "bun test --coverage tests/unit/payments/ tests/integration/payments/",
    "test:payments:e2e": "playwright test tests/e2e/payment-flows.test.ts",
    "test:payments:security": "bun test tests/security/",
    "test:payments:performance": "bun test tests/performance/"
  }
}
```

### 2. Coverage Thresholds

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
        './src/payments/': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
    },
  },
});
```

## 🚀 CI/CD Integration

### 1. GitHub Actions

```yaml
# .github/workflows/payment-tests.yml
name: Payment Gateway Tests

on:
  push:
    paths: ['src/payments/**', 'tests/**/payment*']
  pull_request:
    paths: ['src/payments/**', 'tests/**/payment*']

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
    
    - name: Install dependencies
      run: bun install
    
    - name: Run unit tests
      run: bun test tests/unit/payments/ --coverage
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: timescale/timescaledb:16.0-pg16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7.2-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
    
    - name: Install dependencies
      run: bun install
    
    - name: Run integration tests
      run: bun test tests/integration/payments/
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
        REDIS_URL: redis://localhost:6379
        INFINITYPAY_API_KEY: test-key
        INFINITYPAY_SECRET_KEY: test-secret
        STRIPE_SECRET_KEY: sk_test_...
        BANCO_CLIENT_ID: test-client-id

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
    
    - name: Install dependencies
      run: bun install
    
    - name: Install Playwright
      run: bunx playwright install --with-deps
    
    - name: Build application
      run: |
        cd backend && bun run build
        cd ../frontend && bun run build
    
    - name: Run E2E tests
      run: bunx playwright test tests/e2e/payment-flows.test.ts
      env:
        CI: true
```

## 📋 Checklist de Testes

### ✅ Testes Unitários
- [ ] Gateway Selector testado
- [ ] Payment Processor testado
- [ ] Gateway Manager testado
- [ ] Webhook Handler testado
- [ ] Validação de dados testada
- [ ] Cálculo de custos testado

### ✅ Testes de Integração
- [ ] InfinityPay integração testada
- [ ] Banco integração testada
- [ ] Stripe integração testada
- [ ] Webhooks testados
- [ ] Database operations testadas

### ✅ Testes E2E
- [ ] Fluxos de pagamento testados
- [ ] Fluxos de reembolso testados
- [ ] Multi-gateway testado
- [ ] Responsividade testada
- [ ] Cross-browser testado

### ✅ Testes de Segurança
- [ ] Webhook signature validation
- [ ] Data sanitization
- [ ] Input validation
- [ ] XSS prevention
- [ ] SQL injection prevention

### ✅ Testes de Performance
- [ ] Load testing executado
- [ ] Stress testing executado
- [ ] Concurrent payments testados
- [ ] Webhook processing testado
- [ ] Memory leaks verificados

## 🚨 Troubleshooting

### Problemas Comuns

#### 1. Testes Flaky
```bash
# Verificar logs detalhados
bun test --verbose tests/unit/payments/

# Executar testes específicos
bun test tests/unit/payments/gateway-selector.test.ts

# Verificar timeouts
bun test --timeout 30000 tests/integration/payments/
```

#### 2. Problemas de Mock
```bash
# Verificar configuração de mocks
bun test --verbose tests/mocks/

# Limpar cache de mocks
rm -rf node_modules/.cache
bun test tests/unit/payments/
```

#### 3. Problemas de Webhook
```bash
# Testar webhooks localmente
bun test tests/integration/webhooks.test.ts

# Verificar configuração de webhook
echo $INFINITYPAY_WEBHOOK_SECRET
echo $STRIPE_WEBHOOK_SECRET
```

## 📞 Suporte

Para problemas de testes de pagamento:
1. Verificar logs: `bun test --verbose tests/unit/payments/`
2. Executar testes específicos: `bun test tests/integration/infinitypay.test.ts`
3. Verificar cobertura: `bun test --coverage tests/unit/payments/`
4. Contatar equipe de QA

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO