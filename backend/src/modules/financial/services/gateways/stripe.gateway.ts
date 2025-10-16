/**
 * Stripe Gateway Implementation
 *
 * International payment gateway supporting credit/debit cards, digital wallets globally
 */

import { PaymentGatewayBase } from '../payment-gateway.base';
import type {
  GatewayPaymentRequest,
  GatewayPaymentResponse,
  GatewayRefundRequest,
  GatewayRefundResponse,
  WebhookEvent,
  WebhookProcessingResult,
  PaymentStatus,
} from '../../types/payment.types';
import crypto from 'crypto';

/**
 * Stripe Gateway Configuration
 */
interface StripeConfig {
  baseUrl: string;
  apiKey: string;
  webhookSecret: string;
  publishableKey?: string;
}

/**
 * Stripe Payment Intent Request
 */
interface StripePaymentIntentRequest {
  amount: number;
  currency: string;
  payment_method_types: string[];
  customer?: string;
  payment_method?: string;
  confirmation_method?: 'automatic' | 'manual';
  confirm?: boolean;
  metadata?: Record<string, any>;
  setup_future_usage?: 'on_session' | 'off_session';
}

/**
 * Stripe Payment Intent Response
 */
interface StripePaymentIntentResponse {
  id: string;
  status: string;
  amount: number;
  currency: string;
  payment_method?: string;
  client_secret?: string;
  next_action?: any;
  created: number;
}

/**
 * Stripe Refund Request
 */
interface StripeRefundRequest {
  payment_intent: string;
  amount?: number;
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  metadata?: Record<string, any>;
}

/**
 * Stripe Refund Response
 */
interface StripeRefundResponse {
  id: string;
  payment_intent: string;
  amount: number;
  status: string;
  created: number;
}

/**
 * Stripe Gateway Implementation
 */
export class StripeGateway extends PaymentGatewayBase {
  private stripeConfig: StripeConfig;

  constructor(config: any) {
    super(config);
    this.stripeConfig = config.configuration as StripeConfig;
  }

  /**
   * Process a payment through Stripe
   */
  async processPayment(request: GatewayPaymentRequest): Promise<GatewayPaymentResponse> {
    try {
      // Map payment method to Stripe format
      const stripeMethod = this.mapPaymentMethod(request.paymentMethod);

      // Build request payload
      const payload: StripePaymentIntentRequest = {
        amount: Math.round(request.amount * 100), // Convert to cents
        currency: request.currency.toLowerCase(),
        payment_method_types: [stripeMethod],
        metadata: request.metadata,
        confirmation_method: 'automatic',
        confirm: false,
      };

      // Add customer if provided
      if (request.customerId) {
        payload.customer = request.customerId;
      }

      // Add payment method if provided
      if (request.paymentMethodId) {
        payload.payment_method = request.paymentMethodId;
        payload.confirm = true;
      }

      // Setup for future usage if requested
      if (request.savePaymentMethod) {
        payload.setup_future_usage = 'off_session';
      }

      // Make API request
      const response = await this.makeStripeRequest<StripePaymentIntentResponse>(
        '/payment_intents',
        'POST',
        payload
      );

      // Map response to standard format
      return {
        externalId: response.id,
        status: this.mapStatus(response.status),
        gatewayStatus: response.status,
        paymentUrl: response.client_secret
          ? `https://checkout.stripe.com/pay/${response.client_secret}`
          : undefined,
        response: response as Record<string, any>,
      };
    } catch (error) {
      throw new Error(`Stripe payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process a refund through Stripe
   */
  async processRefund(request: GatewayRefundRequest): Promise<GatewayRefundResponse> {
    try {
      const payload: StripeRefundRequest = {
        payment_intent: request.externalId,
        amount: request.amount ? Math.round(request.amount * 100) : undefined,
        reason: this.mapRefundReason(request.reason),
      };

      const response = await this.makeStripeRequest<StripeRefundResponse>(
        '/refunds',
        'POST',
        payload
      );

      return {
        externalId: response.id,
        status: this.mapRefundStatus(response.status),
        processedAt: new Date(response.created * 1000),
        response: response as Record<string, any>,
      };
    } catch (error) {
      throw new Error(`Stripe refund failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify Stripe webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      // Stripe signature format: t=timestamp,v1=signature
      const elements = signature.split(',');
      const signatureMap: Record<string, string> = {};

      for (const element of elements) {
        const [key, value] = element.split('=');
        signatureMap[key] = value;
      }

      const timestamp = signatureMap.t;
      const expectedSignature = signatureMap.v1;

      if (!timestamp || !expectedSignature) {
        return false;
      }

      // Check if timestamp is within 5 minutes
      const currentTime = Math.floor(Date.now() / 1000);
      const requestTime = parseInt(timestamp, 10);
      if (currentTime - requestTime > 300) {
        return false;
      }

      // Compute expected signature
      const signedPayload = `${timestamp}.${payload}`;
      const computedSignature = crypto
        .createHmac('sha256', this.stripeConfig.webhookSecret)
        .update(signedPayload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(computedSignature)
      );
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Process Stripe webhook event
   */
  async processWebhook(event: WebhookEvent): Promise<WebhookProcessingResult> {
    try {
      const { eventType, payload } = event;

      // Map Stripe event types to our status
      let status: PaymentStatus;

      switch (eventType) {
        case 'payment_intent.created':
          status = 'pending';
          break;
        case 'payment_intent.processing':
          status = 'processing';
          break;
        case 'payment_intent.succeeded':
          status = 'completed';
          break;
        case 'payment_intent.payment_failed':
          status = 'failed';
          break;
        case 'payment_intent.canceled':
          status = 'cancelled';
          break;
        case 'charge.refunded':
          status = 'refunded';
          break;
        default:
          throw new Error(`Unknown event type: ${eventType}`);
      }

      return {
        success: true,
        transactionId: payload.transaction_id as string,
        status,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get payment status from Stripe
   */
  async getPaymentStatus(externalId: string): Promise<PaymentStatus> {
    try {
      const response = await this.makeStripeRequest<StripePaymentIntentResponse>(
        `/payment_intents/${externalId}`,
        'GET'
      );

      return this.mapStatus(response.status);
    } catch (error) {
      throw new Error(`Failed to get payment status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create customer in Stripe
   */
  async createCustomer(userId: string, metadata?: Record<string, any>): Promise<string> {
    try {
      const response = await this.makeStripeRequest<{ id: string }>(
        '/customers',
        'POST',
        {
          metadata: {
            user_id: userId,
            ...metadata,
          },
          name: metadata?.name,
          email: metadata?.email,
          phone: metadata?.phone,
          description: `Customer for user ${userId}`,
        }
      );

      return response.id;
    } catch (error) {
      throw new Error(`Failed to create customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save payment method in Stripe
   */
  async savePaymentMethod(customerId: string, paymentMethodData: any): Promise<string> {
    try {
      // Create payment method
      const paymentMethod = await this.makeStripeRequest<{ id: string }>(
        '/payment_methods',
        'POST',
        {
          type: 'card',
          card: {
            number: paymentMethodData.cardNumber,
            exp_month: paymentMethodData.expirationMonth,
            exp_year: paymentMethodData.expirationYear,
            cvc: paymentMethodData.cvv,
          },
          billing_details: {
            name: paymentMethodData.cardHolderName,
          },
        }
      );

      // Attach to customer
      await this.makeStripeRequest(
        `/payment_methods/${paymentMethod.id}/attach`,
        'POST',
        {
          customer: customerId,
        }
      );

      // Set as default if requested
      if (paymentMethodData.setAsDefault) {
        await this.makeStripeRequest(
          `/customers/${customerId}`,
          'POST',
          {
            invoice_settings: {
              default_payment_method: paymentMethod.id,
            },
          }
        );
      }

      return paymentMethod.id;
    } catch (error) {
      throw new Error(`Failed to save payment method: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Make authenticated request to Stripe API
   */
  private async makeStripeRequest<T>(
    endpoint: string,
    method: string = 'POST',
    data?: any
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.stripeConfig.apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2023-10-16',
    };

    // Stripe uses form-encoded data
    let body: string | undefined;
    if (data) {
      body = new URLSearchParams(this.flattenObject(data)).toString();
    }

    const baseUrl = this.stripeConfig.baseUrl || 'https://api.stripe.com/v1';
    const url = `${baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers,
      body,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stripe request failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Flatten nested object for Stripe's form encoding
   */
  private flattenObject(obj: any, prefix: string = ''): Record<string, string> {
    const flattened: Record<string, string> = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}[${key}]` : key;

      if (value === null || value === undefined) {
        continue;
      }

      if (typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(flattened, this.flattenObject(value, newKey));
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item === 'object') {
            Object.assign(flattened, this.flattenObject(item, `${newKey}[${index}]`));
          } else {
            flattened[`${newKey}[${index}]`] = String(item);
          }
        });
      } else {
        flattened[newKey] = String(value);
      }
    }

    return flattened;
  }

  /**
   * Map our payment method types to Stripe format
   */
  private mapPaymentMethod(method: string): string {
    const methodMap: Record<string, string> = {
      credit_card: 'card',
      debit_card: 'card',
      digital_wallet: 'card',
      bank_transfer: 'us_bank_account',
    };

    return methodMap[method] || 'card';
  }

  /**
   * Map Stripe status to our standard status
   */
  private mapStatus(stripeStatus: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      requires_payment_method: 'pending',
      requires_confirmation: 'pending',
      requires_action: 'pending',
      processing: 'processing',
      requires_capture: 'processing',
      succeeded: 'completed',
      canceled: 'cancelled',
    };

    return statusMap[stripeStatus] || 'pending';
  }

  /**
   * Map Stripe refund status to our standard status
   */
  private mapRefundStatus(stripeStatus: string): string {
    const statusMap: Record<string, string> = {
      pending: 'pending',
      succeeded: 'completed',
      failed: 'failed',
      canceled: 'failed',
    };

    return statusMap[stripeStatus] || 'pending';
  }

  /**
   * Map our refund reason to Stripe format
   */
  private mapRefundReason(reason?: string): 'duplicate' | 'fraudulent' | 'requested_by_customer' | undefined {
    if (!reason) return 'requested_by_customer';

    const lowerReason = reason.toLowerCase();
    if (lowerReason.includes('duplicate')) return 'duplicate';
    if (lowerReason.includes('fraud')) return 'fraudulent';
    return 'requested_by_customer';
  }
}
