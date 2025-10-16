# Integrações de Gateways de Pagamento - BotCriptoFy2

## 🔌 Visão Geral

Este documento detalha as integrações específicas com cada gateway de pagamento, incluindo configurações, APIs, webhooks e exemplos de implementação.

## 🏦 InfinityPay (Brasil)

### Configuração

```typescript
// backend/src/payments/gateways/infinitypay.ts
import axios from 'axios';

export class InfinityPayGateway {
  private apiKey: string;
  private secretKey: string;
  private baseUrl: string;
  private environment: string;

  constructor(config: {
    apiKey: string;
    secretKey: string;
    baseUrl: string;
    environment: string;
  }) {
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
    this.baseUrl = config.baseUrl;
    this.environment = config.environment;
  }

  async createPayment(paymentData: {
    amount: number;
    currency: string;
    paymentMethod: string;
    customer: {
      name: string;
      email: string;
      document: string;
      phone?: string;
    };
    metadata?: Record<string, any>;
  }) {
    const payload = {
      amount: Math.round(paymentData.amount * 100), // Converter para centavos
      currency: paymentData.currency,
      payment_method: paymentData.paymentMethod,
      customer: paymentData.customer,
      metadata: paymentData.metadata,
      notification_url: `${process.env.API_URL}/webhooks/infinitypay`,
      return_url: `${process.env.FRONTEND_URL}/payment/success`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`
    };

    const response = await axios.post(`${this.baseUrl}/payments`, payload, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'X-Environment': this.environment
      }
    });

    return {
      externalId: response.data.id,
      status: this.mapStatus(response.data.status),
      paymentUrl: response.data.payment_url,
      qrCode: response.data.qr_code,
      barcode: response.data.barcode,
      dueDate: response.data.due_date,
      response: response.data
    };
  }

  async getPaymentStatus(externalId: string) {
    const response = await axios.get(`${this.baseUrl}/payments/${externalId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Environment': this.environment
      }
    });

    return {
      externalId: response.data.id,
      status: this.mapStatus(response.data.status),
      amount: response.data.amount / 100,
      currency: response.data.currency,
      paymentMethod: response.data.payment_method,
      processedAt: response.data.processed_at,
      response: response.data
    };
  }

  async processRefund(refundData: {
    externalId: string;
    amount: number;
    reason?: string;
  }) {
    const payload = {
      amount: Math.round(refundData.amount * 100),
      reason: refundData.reason || 'Refund requested by customer'
    };

    const response = await axios.post(
      `${this.baseUrl}/payments/${refundData.externalId}/refund`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-Environment': this.environment
        }
      }
    );

    return {
      externalId: response.data.id,
      status: this.mapStatus(response.data.status),
      amount: response.data.amount / 100,
      processedAt: response.data.processed_at,
      response: response.data
    };
  }

  private mapStatus(status: string): string {
    const statusMap = {
      'pending': 'pending',
      'processing': 'processing',
      'approved': 'completed',
      'cancelled': 'cancelled',
      'failed': 'failed',
      'refunded': 'refunded'
    };

    return statusMap[status] || 'unknown';
  }

  async verifyWebhook(payload: any, signature: string): Promise<boolean> {
    // Implementar verificação de assinatura do webhook
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(JSON.stringify(payload))
      .digest('hex');

    return signature === expectedSignature;
  }
}
```

### Webhook Handler

```typescript
// backend/src/routes/webhooks/infinitypay.ts
import { Elysia } from 'elysia';
import { InfinityPayGateway } from '../../payments/gateways/infinitypay';
import { prisma } from '../../db';

export const infinityPayWebhook = new Elysia()
  .post('/webhooks/infinitypay', async ({ body, headers }) => {
    const gateway = new InfinityPayGateway({
      apiKey: process.env.INFINITYPAY_API_KEY!,
      secretKey: process.env.INFINITYPAY_SECRET_KEY!,
      baseUrl: process.env.INFINITYPAY_BASE_URL!,
      environment: process.env.INFINITYPAY_ENVIRONMENT!
    });

    const signature = headers['x-infinitypay-signature'];
    
    if (!await gateway.verifyWebhook(body, signature)) {
      return { error: 'Invalid signature' }, 400;
    }

    // Registrar webhook
    await prisma.paymentWebhook.create({
      data: {
        gatewayId: 'infinitypay-gateway-id',
        externalId: body.id,
        eventType: body.event_type,
        payload: body,
        signature,
        processed: false
      }
    });

    // Processar evento
    const eventType = body.event_type;
    const paymentId = body.data.id;

    switch (eventType) {
      case 'payment.approved':
        await handlePaymentApproved(paymentId, body.data);
        break;
      case 'payment.cancelled':
        await handlePaymentCancelled(paymentId, body.data);
        break;
      case 'payment.failed':
        await handlePaymentFailed(paymentId, body.data);
        break;
      case 'refund.processed':
        await handleRefundProcessed(paymentId, body.data);
        break;
    }

    return { success: true };
  });

async function handlePaymentApproved(paymentId: string, data: any) {
  // Atualizar transação no banco
  await prisma.paymentTransaction.updateMany({
    where: { externalId: paymentId },
    data: {
      status: 'completed',
      gatewayStatus: 'approved',
      processedAt: new Date(),
      gatewayResponse: data
    }
  });

  // Enviar notificação
  // ... implementar notificação
}

async function handlePaymentCancelled(paymentId: string, data: any) {
  await prisma.paymentTransaction.updateMany({
    where: { externalId: paymentId },
    data: {
      status: 'cancelled',
      gatewayStatus: 'cancelled',
      gatewayResponse: data
    }
  });
}

async function handlePaymentFailed(paymentId: string, data: any) {
  await prisma.paymentTransaction.updateMany({
    where: { externalId: paymentId },
    data: {
      status: 'failed',
      gatewayStatus: 'failed',
      gatewayResponse: data
    }
  });
}

async function handleRefundProcessed(paymentId: string, data: any) {
  await prisma.paymentRefund.updateMany({
    where: { externalId: paymentId },
    data: {
      status: 'completed',
      processedAt: new Date(),
      gatewayResponse: data
    }
  });
}
```

## 🏛️ Banco (PIX/Transferência)

### Configuração

```typescript
// backend/src/payments/gateways/banco.ts
import axios from 'axios';

export class BancoGateway {
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string;
  private pixKey: string;
  private bankAccount: {
    bank: string;
    agency: string;
    account: string;
    digit: string;
  };

  constructor(config: {
    clientId: string;
    clientSecret: string;
    baseUrl: string;
    pixKey: string;
    bankAccount: {
      bank: string;
      agency: string;
      account: string;
      digit: string;
    };
  }) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl;
    this.pixKey = config.pixKey;
    this.bankAccount = config.bankAccount;
  }

  async createPixPayment(paymentData: {
    amount: number;
    description: string;
    customer: {
      name: string;
      document: string;
    };
    metadata?: Record<string, any>;
  }) {
    // Gerar chave PIX dinâmica
    const pixKey = await this.generatePixKey();
    
    const payload = {
      amount: paymentData.amount,
      description: paymentData.description,
      pix_key: pixKey,
      customer: paymentData.customer,
      metadata: paymentData.metadata,
      webhook_url: `${process.env.API_URL}/webhooks/banco`
    };

    const response = await axios.post(`${this.baseUrl}/pix/payments`, payload, {
      headers: {
        'Authorization': `Bearer ${await this.getAccessToken()}`,
        'Content-Type': 'application/json'
      }
    });

    return {
      externalId: response.data.id,
      status: 'pending',
      qrCode: response.data.qr_code,
      qrCodeText: response.data.qr_code_text,
      pixKey: response.data.pix_key,
      expiresAt: response.data.expires_at,
      response: response.data
    };
  }

  async createBankTransfer(paymentData: {
    amount: number;
    description: string;
    customer: {
      name: string;
      document: string;
      bank: string;
      agency: string;
      account: string;
    };
    metadata?: Record<string, any>;
  }) {
    const payload = {
      amount: paymentData.amount,
      description: paymentData.description,
      customer: paymentData.customer,
      our_account: this.bankAccount,
      metadata: paymentData.metadata,
      webhook_url: `${process.env.API_URL}/webhooks/banco`
    };

    const response = await axios.post(`${this.baseUrl}/transfers`, payload, {
      headers: {
        'Authorization': `Bearer ${await this.getAccessToken()}`,
        'Content-Type': 'application/json'
      }
    });

    return {
      externalId: response.data.id,
      status: 'pending',
      transferCode: response.data.transfer_code,
      dueDate: response.data.due_date,
      instructions: response.data.instructions,
      response: response.data
    };
  }

  async getPaymentStatus(externalId: string) {
    const response = await axios.get(`${this.baseUrl}/payments/${externalId}`, {
      headers: {
        'Authorization': `Bearer ${await this.getAccessToken()}`
      }
    });

    return {
      externalId: response.data.id,
      status: this.mapStatus(response.data.status),
      amount: response.data.amount,
      currency: response.data.currency,
      paymentMethod: response.data.payment_method,
      processedAt: response.data.processed_at,
      response: response.data
    };
  }

  private async generatePixKey(): Promise<string> {
    // Gerar chave PIX aleatória ou usar chave fixa
    return this.pixKey || `pix-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getAccessToken(): Promise<string> {
    // Implementar autenticação OAuth2
    const response = await axios.post(`${this.baseUrl}/oauth/token`, {
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret
    });

    return response.data.access_token;
  }

  private mapStatus(status: string): string {
    const statusMap = {
      'pending': 'pending',
      'processing': 'processing',
      'completed': 'completed',
      'cancelled': 'cancelled',
      'failed': 'failed'
    };

    return statusMap[status] || 'unknown';
  }
}
```

## 🌍 Stripe (Global)

### Configuração

```typescript
// backend/src/payments/gateways/stripe.ts
import Stripe from 'stripe';

export class StripeGateway {
  private stripe: Stripe;

  constructor(config: {
    secretKey: string;
    environment: string;
  }) {
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: '2023-10-16',
      typescript: true
    });
  }

  async createPaymentIntent(paymentData: {
    amount: number;
    currency: string;
    paymentMethod: string;
    customer: {
      name: string;
      email: string;
    };
    metadata?: Record<string, any>;
  }) {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(paymentData.amount * 100), // Converter para centavos
      currency: paymentData.currency,
      payment_method_types: [paymentData.paymentMethod],
      customer: await this.getOrCreateCustomer(paymentData.customer),
      metadata: paymentData.metadata,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'always'
      }
    });

    return {
      externalId: paymentIntent.id,
      status: this.mapStatus(paymentIntent.status),
      clientSecret: paymentIntent.client_secret,
      paymentUrl: paymentIntent.next_action?.redirect_to_url?.url,
      response: paymentIntent
    };
  }

  async createSetupIntent(customerId: string) {
    const setupIntent = await this.stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session'
    });

    return {
      externalId: setupIntent.id,
      clientSecret: setupIntent.client_secret,
      response: setupIntent
    };
  }

  async getPaymentStatus(externalId: string) {
    const paymentIntent = await this.stripe.paymentIntents.retrieve(externalId);

    return {
      externalId: paymentIntent.id,
      status: this.mapStatus(paymentIntent.status),
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      paymentMethod: paymentIntent.payment_method,
      processedAt: paymentIntent.created,
      response: paymentIntent
    };
  }

  async processRefund(refundData: {
    externalId: string;
    amount: number;
    reason?: string;
  }) {
    const refund = await this.stripe.refunds.create({
      payment_intent: refundData.externalId,
      amount: Math.round(refundData.amount * 100),
      reason: refundData.reason as Stripe.RefundCreateParams.Reason
    });

    return {
      externalId: refund.id,
      status: this.mapStatus(refund.status),
      amount: refund.amount / 100,
      processedAt: new Date(refund.created * 1000),
      response: refund
    };
  }

  async createCustomer(customerData: {
    name: string;
    email: string;
    metadata?: Record<string, any>;
  }) {
    const customer = await this.stripe.customers.create({
      name: customerData.name,
      email: customerData.email,
      metadata: customerData.metadata
    });

    return {
      externalId: customer.id,
      response: customer
    };
  }

  async getOrCreateCustomer(customerData: {
    name: string;
    email: string;
  }) {
    // Buscar customer existente
    const customers = await this.stripe.customers.list({
      email: customerData.email,
      limit: 1
    });

    if (customers.data.length > 0) {
      return customers.data[0].id;
    }

    // Criar novo customer
    const customer = await this.createCustomer(customerData);
    return customer.externalId;
  }

  private mapStatus(status: string): string {
    const statusMap = {
      'requires_payment_method': 'pending',
      'requires_confirmation': 'pending',
      'requires_action': 'pending',
      'processing': 'processing',
      'succeeded': 'completed',
      'cancelled': 'cancelled',
      'requires_capture': 'pending'
    };

    return statusMap[status] || 'unknown';
  }

  async verifyWebhook(payload: string, signature: string): Promise<boolean> {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
      return true;
    } catch (error) {
      return false;
    }
  }
}
```

### Webhook Handler

```typescript
// backend/src/routes/webhooks/stripe.ts
import { Elysia } from 'elysia';
import { StripeGateway } from '../../payments/gateways/stripe';
import { prisma } from '../../db';

export const stripeWebhook = new Elysia()
  .post('/webhooks/stripe', async ({ body, headers }) => {
    const gateway = new StripeGateway({
      secretKey: process.env.STRIPE_SECRET_KEY!,
      environment: process.env.STRIPE_ENVIRONMENT!
    });

    const signature = headers['stripe-signature'];
    
    if (!await gateway.verifyWebhook(body, signature)) {
      return { error: 'Invalid signature' }, 400;
    }

    const event = JSON.parse(body);

    // Registrar webhook
    await prisma.paymentWebhook.create({
      data: {
        gatewayId: 'stripe-gateway-id',
        externalId: event.id,
        eventType: event.type,
        payload: event,
        signature,
        processed: false
      }
    });

    // Processar evento
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
    }

    return { success: true };
  });

async function handlePaymentSucceeded(paymentIntent: any) {
  await prisma.paymentTransaction.updateMany({
    where: { externalId: paymentIntent.id },
    data: {
      status: 'completed',
      gatewayStatus: 'succeeded',
      processedAt: new Date(),
      gatewayResponse: paymentIntent
    }
  });
}

async function handlePaymentFailed(paymentIntent: any) {
  await prisma.paymentTransaction.updateMany({
    where: { externalId: paymentIntent.id },
    data: {
      status: 'failed',
      gatewayStatus: 'payment_failed',
      gatewayResponse: paymentIntent
    }
  });
}

async function handleDisputeCreated(dispute: any) {
  // Implementar lógica de disputa
  console.log('Dispute created:', dispute.id);
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  // Implementar lógica de fatura paga
  console.log('Invoice payment succeeded:', invoice.id);
}
```

## 🔄 Gateway Manager

### Implementação Central

```typescript
// backend/src/payments/gateway-manager.ts
import { InfinityPayGateway } from './gateways/infinitypay';
import { BancoGateway } from './gateways/banco';
import { StripeGateway } from './gateways/stripe';

export class PaymentGatewayManager {
  private infinityPay: InfinityPayGateway;
  private banco: BancoGateway;
  private stripe: StripeGateway;

  constructor() {
    this.infinityPay = new InfinityPayGateway({
      apiKey: process.env.INFINITYPAY_API_KEY!,
      secretKey: process.env.INFINITYPAY_SECRET_KEY!,
      baseUrl: process.env.INFINITYPAY_BASE_URL!,
      environment: process.env.INFINITYPAY_ENVIRONMENT!
    });

    this.banco = new BancoGateway({
      clientId: process.env.BANCO_CLIENT_ID!,
      clientSecret: process.env.BANCO_CLIENT_SECRET!,
      baseUrl: process.env.BANCO_BASE_URL!,
      pixKey: process.env.BANCO_PIX_KEY!,
      bankAccount: {
        bank: process.env.BANCO_BANK_CODE!,
        agency: process.env.BANCO_AGENCY!,
        account: process.env.BANCO_ACCOUNT!,
        digit: process.env.BANCO_ACCOUNT_DIGIT!
      }
    });

    this.stripe = new StripeGateway({
      secretKey: process.env.STRIPE_SECRET_KEY!,
      environment: process.env.STRIPE_ENVIRONMENT!
    });
  }

  async processPayment(gateway: string, paymentData: any) {
    switch (gateway) {
      case 'infinitypay':
        return await this.infinityPay.createPayment(paymentData);
      case 'banco':
        if (paymentData.paymentMethod === 'pix') {
          return await this.banco.createPixPayment(paymentData);
        } else if (paymentData.paymentMethod === 'bank_transfer') {
          return await this.banco.createBankTransfer(paymentData);
        }
        throw new Error('Unsupported payment method for Banco gateway');
      case 'stripe':
        return await this.stripe.createPaymentIntent(paymentData);
      default:
        throw new Error(`Unsupported gateway: ${gateway}`);
    }
  }

  async processRefund(gateway: string, refundData: any) {
    switch (gateway) {
      case 'infinitypay':
        return await this.infinityPay.processRefund(refundData);
      case 'banco':
        // Banco não suporta reembolsos automáticos
        throw new Error('Refunds not supported for Banco gateway');
      case 'stripe':
        return await this.stripe.processRefund(refundData);
      default:
        throw new Error(`Unsupported gateway: ${gateway}`);
    }
  }

  async getPaymentStatus(gateway: string, externalId: string) {
    switch (gateway) {
      case 'infinitypay':
        return await this.infinityPay.getPaymentStatus(externalId);
      case 'banco':
        return await this.banco.getPaymentStatus(externalId);
      case 'stripe':
        return await this.stripe.getPaymentStatus(externalId);
      default:
        throw new Error(`Unsupported gateway: ${gateway}`);
    }
  }
}
```

## 📊 Monitoramento e Logs

### Logs de Transações

```typescript
// backend/src/payments/payment-logger.ts
import { prisma } from '../db';

export class PaymentLogger {
  static async logTransaction(transactionData: {
    gateway: string;
    externalId: string;
    action: string;
    status: string;
    amount: number;
    currency: string;
    metadata?: any;
  }) {
    await prisma.paymentTransaction.create({
      data: {
        gatewayId: transactionData.gateway,
        externalId: transactionData.externalId,
        amount: transactionData.amount,
        currency: transactionData.currency,
        status: transactionData.status,
        metadata: {
          action: transactionData.action,
          ...transactionData.metadata
        }
      }
    });
  }

  static async logError(errorData: {
    gateway: string;
    externalId: string;
    error: string;
    stack?: string;
    metadata?: any;
  }) {
    console.error('Payment Error:', {
      gateway: errorData.gateway,
      externalId: errorData.externalId,
      error: errorData.error,
      stack: errorData.stack,
      metadata: errorData.metadata,
      timestamp: new Date().toISOString()
    });

    // Salvar no banco para análise
    await prisma.paymentTransaction.create({
      data: {
        gatewayId: errorData.gateway,
        externalId: errorData.externalId,
        amount: 0,
        currency: 'BRL',
        status: 'failed',
        metadata: {
          error: errorData.error,
          stack: errorData.stack,
          ...errorData.metadata
        }
      }
    });
  }
}
```

## 🧪 Testes de Integração

### Testes dos Gateways

```typescript
// tests/integration/payments/gateways.test.ts
import { describe, it, expect } from 'bun:test';
import { InfinityPayGateway } from '../../src/payments/gateways/infinitypay';
import { BancoGateway } from '../../src/payments/gateways/banco';
import { StripeGateway } from '../../src/payments/gateways/stripe';

describe('Payment Gateways Integration', () => {
  describe('InfinityPay', () => {
    it('should create PIX payment', async () => {
      const gateway = new InfinityPayGateway({
        apiKey: 'test-api-key',
        secretKey: 'test-secret-key',
        baseUrl: 'https://api.infinitypay.com',
        environment: 'sandbox'
      });

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

      expect(result.externalId).toBeDefined();
      expect(result.status).toBe('pending');
      expect(result.qrCode).toBeDefined();
    });
  });

  describe('Banco', () => {
    it('should create PIX payment', async () => {
      const gateway = new BancoGateway({
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        baseUrl: 'https://api.banco.com',
        pixKey: 'test-pix-key',
        bankAccount: {
          bank: '001',
          agency: '1234',
          account: '567890',
          digit: '1'
        }
      });

      const result = await gateway.createPixPayment({
        amount: 100.00,
        description: 'Test payment',
        customer: {
          name: 'Test User',
          document: '12345678901'
        }
      });

      expect(result.externalId).toBeDefined();
      expect(result.status).toBe('pending');
      expect(result.qrCode).toBeDefined();
    });
  });

  describe('Stripe', () => {
    it('should create payment intent', async () => {
      const gateway = new StripeGateway({
        secretKey: 'sk_test_...',
        environment: 'test'
      });

      const result = await gateway.createPaymentIntent({
        amount: 100.00,
        currency: 'USD',
        paymentMethod: 'card',
        customer: {
          name: 'Test User',
          email: 'test@example.com'
        }
      });

      expect(result.externalId).toBeDefined();
      expect(result.status).toBe('pending');
      expect(result.clientSecret).toBeDefined();
    });
  });
});
```

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO