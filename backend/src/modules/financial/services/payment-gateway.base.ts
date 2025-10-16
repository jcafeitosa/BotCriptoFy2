/**
 * Payment Gateway Base
 *
 * Abstract base class for payment gateways
 */

import type {
  IPaymentGateway,
  GatewayConfig,
  GatewayPaymentRequest,
  GatewayPaymentResponse,
  GatewayRefundRequest,
  GatewayRefundResponse,
  WebhookEvent,
  WebhookProcessingResult,
  PaymentStatus,
} from '../types/payment.types';

export abstract class PaymentGatewayBase implements IPaymentGateway {
  protected config: GatewayConfig;

  constructor(config: GatewayConfig) {
    this.config = config;
  }

  /**
   * Process a payment
   */
  abstract processPayment(request: GatewayPaymentRequest): Promise<GatewayPaymentResponse>;

  /**
   * Process a refund
   */
  abstract processRefund(request: GatewayRefundRequest): Promise<GatewayRefundResponse>;

  /**
   * Verify webhook signature
   */
  abstract verifyWebhookSignature(payload: string, signature: string): boolean;

  /**
   * Process webhook event
   */
  abstract processWebhook(event: WebhookEvent): Promise<WebhookProcessingResult>;

  /**
   * Get payment status
   */
  abstract getPaymentStatus(externalId: string): Promise<PaymentStatus>;

  /**
   * Create customer (optional)
   */
  async createCustomer?(_userId: string, _metadata?: Record<string, any>): Promise<string> {
    throw new Error('createCustomer not implemented');
  }

  /**
   * Save payment method (optional)
   */
  async savePaymentMethod?(_customerId: string, _paymentMethodData: any): Promise<string> {
    throw new Error('savePaymentMethod not implemented');
  }

  /**
   * Get gateway configuration
   */
  getConfig(): GatewayConfig {
    return this.config;
  }

  /**
   * Check if gateway is active
   */
  isActive(): boolean {
    return this.config.isActive;
  }

  /**
   * Check if gateway is primary
   */
  isPrimary(): boolean {
    return this.config.isPrimary;
  }

  /**
   * Get supported countries
   */
  getSupportedCountries(): string[] {
    return this.config.supportedCountries;
  }

  /**
   * Get supported currencies
   */
  getSupportedCurrencies(): string[] {
    return this.config.supportedCurrencies;
  }

  /**
   * Get supported payment methods
   */
  getSupportedMethods(): string[] {
    return Object.keys(this.config.supportedMethods).filter(
      (method) => this.config.supportedMethods[method].enabled
    );
  }

  /**
   * Calculate gateway fees
   */
  calculateFees(amount: number, paymentMethod: string): number {
    const methodConfig = this.config.supportedMethods[paymentMethod];
    if (!methodConfig) {
      return 0;
    }

    const fixedFee = methodConfig.fees?.fixed || 0;
    const percentageFee = (methodConfig.fees?.percentage || 0) / 100;

    return fixedFee + amount * percentageFee;
  }

  /**
   * Make HTTP request to gateway API
   */
  protected async makeRequest(
    endpoint: string,
    method: string = 'POST',
    data?: any,
    headers?: Record<string, string>
  ): Promise<any> {
    const baseUrl = this.config.configuration.baseUrl;
    const url = `${baseUrl}${endpoint}`;

    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    const response = await fetch(url, {
      method,
      headers: defaultHeaders,
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gateway request failed: ${error}`);
    }

    return response.json();
  }
}
