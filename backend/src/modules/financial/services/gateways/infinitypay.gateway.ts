/**
 * InfinityPay Gateway Implementation
 *
 * Brazilian payment gateway supporting PIX, credit/debit cards, and boleto
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
 * InfinityPay Gateway Configuration
 */
interface InfinityPayConfig {
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  webhookSecret: string;
}

/**
 * InfinityPay Payment Request
 */
interface InfinityPayPaymentRequest {
  amount: number;
  currency: string;
  payment_method: string;
  customer?: {
    name?: string;
    email?: string;
    document?: string;
  };
  metadata?: Record<string, any>;
  installments?: number;
}

/**
 * InfinityPay Payment Response
 */
interface InfinityPayPaymentResponse {
  id: string;
  status: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_url?: string;
  qr_code?: string;
  qr_code_base64?: string;
  pix_key?: string;
  created_at: string;
  expires_at?: string;
}

/**
 * InfinityPay Refund Request
 */
interface InfinityPayRefundRequest {
  payment_id: string;
  amount: number;
  reason?: string;
}

/**
 * InfinityPay Refund Response
 */
interface InfinityPayRefundResponse {
  id: string;
  payment_id: string;
  amount: number;
  status: string;
  processed_at?: string;
}

/**
 * InfinityPay Gateway Implementation
 */
export class InfinityPayGateway extends PaymentGatewayBase {
  private infinityPayConfig: InfinityPayConfig;

  constructor(config: any) {
    super(config);
    this.infinityPayConfig = config.configuration as InfinityPayConfig;
  }

  /**
   * Process a payment through InfinityPay
   */
  async processPayment(request: GatewayPaymentRequest): Promise<GatewayPaymentResponse> {
    try {
      // Map payment method to InfinityPay format
      const infinityPayMethod = this.mapPaymentMethod(request.paymentMethod);

      // Build request payload
      const payload: InfinityPayPaymentRequest = {
        amount: Math.round(request.amount * 100), // Convert to cents
        currency: request.currency,
        payment_method: infinityPayMethod,
        metadata: request.metadata,
        installments: request.installments,
      };

      // Add customer data if available
      if (request.metadata?.customerName || request.metadata?.customerEmail) {
        payload.customer = {
          name: request.metadata.customerName,
          email: request.metadata.customerEmail,
          document: request.metadata.customerDocument,
        };
      }

      // Make API request
      const response = await this.makeInfinityPayRequest<InfinityPayPaymentResponse>(
        '/payments',
        'POST',
        payload
      );

      // Map response to standard format
      return {
        externalId: response.id,
        status: this.mapStatus(response.status),
        gatewayStatus: response.status,
        paymentUrl: response.payment_url,
        qrCode: response.qr_code,
        qrCodeBase64: response.qr_code_base64,
        pixKey: response.pix_key,
        response: response as Record<string, any>,
      };
    } catch (error) {
      throw new Error(`InfinityPay payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process a refund through InfinityPay
   */
  async processRefund(request: GatewayRefundRequest): Promise<GatewayRefundResponse> {
    try {
      const payload: InfinityPayRefundRequest = {
        payment_id: request.externalId,
        amount: Math.round(request.amount * 100), // Convert to cents
        reason: request.reason,
      };

      const response = await this.makeInfinityPayRequest<InfinityPayRefundResponse>(
        '/refunds',
        'POST',
        payload
      );

      return {
        externalId: response.id,
        status: this.mapRefundStatus(response.status),
        processedAt: response.processed_at ? new Date(response.processed_at) : undefined,
        response: response as Record<string, any>,
      };
    } catch (error) {
      throw new Error(`InfinityPay refund failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify InfinityPay webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.infinityPayConfig.webhookSecret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  /**
   * Process InfinityPay webhook event
   */
  async processWebhook(event: WebhookEvent): Promise<WebhookProcessingResult> {
    try {
      const { eventType, payload } = event;

      // Map InfinityPay event types to our status
      let status: PaymentStatus;

      switch (eventType) {
        case 'payment.created':
          status = 'pending';
          break;
        case 'payment.processing':
          status = 'processing';
          break;
        case 'payment.approved':
        case 'payment.completed':
          status = 'completed';
          break;
        case 'payment.failed':
          status = 'failed';
          break;
        case 'payment.cancelled':
          status = 'cancelled';
          break;
        case 'payment.refunded':
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
   * Get payment status from InfinityPay
   */
  async getPaymentStatus(externalId: string): Promise<PaymentStatus> {
    try {
      const response = await this.makeInfinityPayRequest<InfinityPayPaymentResponse>(
        `/payments/${externalId}`,
        'GET'
      );

      return this.mapStatus(response.status);
    } catch (error) {
      throw new Error(`Failed to get payment status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create customer in InfinityPay (optional)
   */
  override async createCustomer(userId: string, metadata?: Record<string, any>): Promise<string> {
    try {
      const response = await this.makeInfinityPayRequest<{ id: string }>(
        '/customers',
        'POST',
        {
          external_id: userId,
          name: metadata?.name,
          email: metadata?.email,
          document: metadata?.document,
          phone: metadata?.phone,
        }
      );

      return response.id;
    } catch (error) {
      throw new Error(`Failed to create customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save payment method in InfinityPay (optional)
   */
  override async savePaymentMethod(customerId: string, paymentMethodData: any): Promise<string> {
    try {
      const response = await this.makeInfinityPayRequest<{ id: string }>(
        '/payment-methods',
        'POST',
        {
          customer_id: customerId,
          type: paymentMethodData.type,
          card_number: paymentMethodData.cardNumber,
          card_holder_name: paymentMethodData.cardHolderName,
          card_expiration_month: paymentMethodData.expirationMonth,
          card_expiration_year: paymentMethodData.expirationYear,
          card_cvv: paymentMethodData.cvv,
        }
      );

      return response.id;
    } catch (error) {
      throw new Error(`Failed to save payment method: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Make authenticated request to InfinityPay API
   */
  private async makeInfinityPayRequest<T>(
    endpoint: string,
    method: string = 'POST',
    data?: any
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.infinityPayConfig.apiKey}`,
      'X-API-Secret': this.infinityPayConfig.apiSecret,
      'Content-Type': 'application/json',
    };

    return this.makeRequest(endpoint, method, data, headers);
  }

  /**
   * Map our payment method types to InfinityPay format
   */
  private mapPaymentMethod(method: string): string {
    const methodMap: Record<string, string> = {
      pix: 'pix',
      credit_card: 'credit_card',
      debit_card: 'debit_card',
      boleto: 'boleto',
      bank_transfer: 'bank_transfer',
    };

    return methodMap[method] || method;
  }

  /**
   * Map InfinityPay status to our standard status
   */
  private mapStatus(infinityPayStatus: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      created: 'pending',
      pending: 'pending',
      processing: 'processing',
      approved: 'completed',
      completed: 'completed',
      failed: 'failed',
      cancelled: 'cancelled',
      refunded: 'refunded',
    };

    return statusMap[infinityPayStatus.toLowerCase()] || 'pending';
  }

  /**
   * Map InfinityPay refund status to our standard status
   */
  private mapRefundStatus(infinityPayStatus: string): string {
    const statusMap: Record<string, string> = {
      pending: 'pending',
      processing: 'pending',
      completed: 'completed',
      failed: 'failed',
    };

    return statusMap[infinityPayStatus.toLowerCase()] || 'pending';
  }
}
