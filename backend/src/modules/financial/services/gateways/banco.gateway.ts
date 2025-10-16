/**
 * Banco Gateway Implementation
 *
 * Internal payment gateway for PIX and bank transfers within the platform
 * Integrates with the internal wallet/banco module
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
 * Banco Gateway Configuration
 */
interface BancoConfig {
  baseUrl: string;
  apiKey: string;
  webhookSecret: string;
  pixKey?: string;
  bankAccount?: {
    bank: string;
    agency: string;
    account: string;
    accountType: string;
  };
}

/**
 * Internal Payment Request
 */
interface BancoPaymentRequest {
  amount: number;
  currency: string;
  payment_method: 'pix' | 'bank_transfer' | 'internal_transfer';
  from_user_id: string;
  to_user_id?: string;
  pix_key?: string;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Internal Payment Response
 */
interface BancoPaymentResponse {
  id: string;
  status: string;
  amount: number;
  currency: string;
  payment_method: string;
  qr_code?: string;
  qr_code_base64?: string;
  pix_key?: string;
  copy_paste_code?: string;
  transaction_id?: string;
  created_at: string;
  expires_at?: string;
}

/**
 * Internal Refund Request
 */
interface BancoRefundRequest {
  transaction_id: string;
  amount: number;
  reason?: string;
}

/**
 * Internal Refund Response
 */
interface BancoRefundResponse {
  id: string;
  transaction_id: string;
  amount: number;
  status: string;
  processed_at: string;
}

/**
 * Banco Gateway Implementation
 */
export class BancoGateway extends PaymentGatewayBase {
  private bancoConfig: BancoConfig;

  constructor(config: any) {
    super(config);
    this.bancoConfig = config.configuration as BancoConfig;
  }

  /**
   * Process a payment through internal Banco system
   */
  async processPayment(request: GatewayPaymentRequest): Promise<GatewayPaymentResponse> {
    try {
      // Build request payload
      const payload: BancoPaymentRequest = {
        amount: request.amount,
        currency: request.currency,
        payment_method: this.mapPaymentMethod(request.paymentMethod),
        from_user_id: request.metadata?.userId as string,
        to_user_id: request.metadata?.recipientId as string,
        pix_key: request.metadata?.pixKey as string,
        description: request.metadata?.description as string,
        metadata: request.metadata,
      };

      // Make API request to internal banco service
      const response = await this.makeBancoRequest<BancoPaymentResponse>(
        '/transactions',
        'POST',
        payload
      );

      // Map response to standard format
      return {
        externalId: response.id,
        status: this.mapStatus(response.status),
        gatewayStatus: response.status,
        qrCode: response.qr_code,
        qrCodeBase64: response.qr_code_base64,
        pixKey: response.pix_key || this.bancoConfig.pixKey,
        response: response as Record<string, any>,
      };
    } catch (error) {
      throw new Error(`Banco payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process a refund through internal Banco system
   */
  async processRefund(request: GatewayRefundRequest): Promise<GatewayRefundResponse> {
    try {
      const payload: BancoRefundRequest = {
        transaction_id: request.externalId,
        amount: request.amount,
        reason: request.reason,
      };

      const response = await this.makeBancoRequest<BancoRefundResponse>(
        '/refunds',
        'POST',
        payload
      );

      return {
        externalId: response.id,
        status: this.mapRefundStatus(response.status),
        processedAt: new Date(response.processed_at),
        response: response as Record<string, any>,
      };
    } catch (error) {
      throw new Error(`Banco refund failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify Banco webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.bancoConfig.webhookSecret)
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
   * Process Banco webhook event
   */
  async processWebhook(event: WebhookEvent): Promise<WebhookProcessingResult> {
    try {
      const { eventType, payload } = event;

      // Map internal event types to our status
      let status: PaymentStatus;

      switch (eventType) {
        case 'transaction.created':
          status = 'pending';
          break;
        case 'transaction.processing':
          status = 'processing';
          break;
        case 'transaction.completed':
        case 'transaction.confirmed':
          status = 'completed';
          break;
        case 'transaction.failed':
          status = 'failed';
          break;
        case 'transaction.cancelled':
          status = 'cancelled';
          break;
        case 'transaction.refunded':
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
   * Get payment status from Banco system
   */
  async getPaymentStatus(externalId: string): Promise<PaymentStatus> {
    try {
      const response = await this.makeBancoRequest<BancoPaymentResponse>(
        `/transactions/${externalId}`,
        'GET'
      );

      return this.mapStatus(response.status);
    } catch (error) {
      throw new Error(`Failed to get payment status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create customer in Banco system (wallet creation)
   */
  override async createCustomer(userId: string, metadata?: Record<string, any>): Promise<string> {
    try {
      const response = await this.makeBancoRequest<{ id: string; wallet_id: string }>(
        '/wallets',
        'POST',
        {
          user_id: userId,
          currency: metadata?.currency || 'BRL',
          type: metadata?.type || 'checking',
          metadata: metadata,
        }
      );

      return response.wallet_id;
    } catch (error) {
      throw new Error(`Failed to create wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save payment method in Banco system (PIX key registration)
   */
  override async savePaymentMethod(customerId: string, paymentMethodData: any): Promise<string> {
    try {
      const response = await this.makeBancoRequest<{ id: string }>(
        '/pix-keys',
        'POST',
        {
          wallet_id: customerId,
          key_type: paymentMethodData.pixKeyType, // cpf, cnpj, email, phone, random
          key_value: paymentMethodData.pixKey,
          is_default: paymentMethodData.setAsDefault || false,
        }
      );

      return response.id;
    } catch (error) {
      throw new Error(`Failed to save PIX key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate PIX QR Code for payment
   */
  async generatePixQRCode(amount: number, description?: string): Promise<{
    qrCode: string;
    qrCodeBase64: string;
    copyPasteCode: string;
    expiresAt: Date;
  }> {
    try {
      const response = await this.makeBancoRequest<{
        qr_code: string;
        qr_code_base64: string;
        copy_paste_code: string;
        expires_at: string;
      }>(
        '/pix/qr-code',
        'POST',
        {
          amount,
          description,
          pix_key: this.bancoConfig.pixKey,
          expires_in: 3600, // 1 hour
        }
      );

      return {
        qrCode: response.qr_code,
        qrCodeBase64: response.qr_code_base64,
        copyPasteCode: response.copy_paste_code,
        expiresAt: new Date(response.expires_at),
      };
    } catch (error) {
      throw new Error(`Failed to generate PIX QR Code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process internal transfer between platform wallets
   */
  async processInternalTransfer(
    fromUserId: string,
    toUserId: string,
    amount: number,
    description?: string
  ): Promise<string> {
    try {
      const response = await this.makeBancoRequest<{ transaction_id: string }>(
        '/transfers/internal',
        'POST',
        {
          from_user_id: fromUserId,
          to_user_id: toUserId,
          amount,
          description,
        }
      );

      return response.transaction_id;
    } catch (error) {
      throw new Error(`Internal transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(userId: string): Promise<{
    available: number;
    blocked: number;
    total: number;
    currency: string;
  }> {
    try {
      const response = await this.makeBancoRequest<{
        available: number;
        blocked: number;
        total: number;
        currency: string;
      }>(
        `/wallets/${userId}/balance`,
        'GET'
      );

      return response;
    } catch (error) {
      throw new Error(`Failed to get wallet balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Make authenticated request to internal Banco API
   */
  private async makeBancoRequest<T>(
    endpoint: string,
    method: string = 'POST',
    data?: any
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.bancoConfig.apiKey}`,
      'Content-Type': 'application/json',
      'X-Service': 'payment-gateway',
    };

    return this.makeRequest(endpoint, method, data, headers);
  }

  /**
   * Map our payment method types to Banco format
   */
  private mapPaymentMethod(method: string): 'pix' | 'bank_transfer' | 'internal_transfer' {
    const methodMap: Record<string, 'pix' | 'bank_transfer' | 'internal_transfer'> = {
      pix: 'pix',
      bank_transfer: 'bank_transfer',
      digital_wallet: 'internal_transfer',
    };

    return methodMap[method] || 'pix';
  }

  /**
   * Map Banco status to our standard status
   */
  private mapStatus(bancoStatus: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      created: 'pending',
      pending: 'pending',
      processing: 'processing',
      confirmed: 'completed',
      completed: 'completed',
      failed: 'failed',
      cancelled: 'cancelled',
      refunded: 'refunded',
    };

    return statusMap[bancoStatus.toLowerCase()] || 'pending';
  }

  /**
   * Map Banco refund status to our standard status
   */
  private mapRefundStatus(bancoStatus: string): string {
    const statusMap: Record<string, string> = {
      pending: 'pending',
      processing: 'pending',
      completed: 'completed',
      failed: 'failed',
    };

    return statusMap[bancoStatus.toLowerCase()] || 'pending';
  }
}
