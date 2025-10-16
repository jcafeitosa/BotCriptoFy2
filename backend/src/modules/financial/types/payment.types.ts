/**
 * Payment Types
 *
 * Type definitions for payment system
 */

import type {
  PaymentStatus,
  RefundStatus,
  PaymentMethodType,
  GatewayProvider,
} from '../schema/payments.schema';

/**
 * Gateway Configuration
 */
export interface GatewayConfig {
  name: string;
  slug: string;
  provider: GatewayProvider;
  isActive: boolean;
  isPrimary: boolean;
  supportedCountries: string[];
  supportedCurrencies: string[];
  supportedMethods: Record<string, PaymentMethodConfig>;
  configuration: Record<string, any>;
  fees: GatewayFees;
  webhookUrl?: string;
}

/**
 * Payment Method Configuration
 */
export interface PaymentMethodConfig {
  enabled: boolean;
  instant?: boolean;
  brands?: string[];
  installments?: InstallmentConfig;
  fees: GatewayFees;
  [key: string]: any;
}

/**
 * Installment Configuration
 */
export interface InstallmentConfig {
  enabled: boolean;
  max?: number;
  fees?: Record<number, number>;
}

/**
 * Gateway Fees
 */
export interface GatewayFees {
  fixed?: number;
  percentage?: number;
}

/**
 * Payment Request
 */
export interface PaymentRequest {
  tenantId: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethodType;
  country: string;
  userPreferences?: string[];
  metadata?: Record<string, any>;
  installments?: number;
  savePaymentMethod?: boolean;
}

/**
 * Payment Response
 */
export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  externalId?: string;
  status?: PaymentStatus;
  gateway?: string;
  paymentUrl?: string;
  qrCode?: string;
  qrCodeBase64?: string;
  pixKey?: string;
  error?: string;
  errorCode?: string;
}

/**
 * Refund Request
 */
export interface RefundRequest {
  transactionId: string;
  amount?: number;
  reason?: string;
}

/**
 * Refund Response
 */
export interface RefundResponse {
  success: boolean;
  refundId?: string;
  externalId?: string;
  status?: RefundStatus;
  amount?: number;
  error?: string;
}

/**
 * Gateway Payment Request
 */
export interface GatewayPaymentRequest {
  amount: number;
  currency: string;
  paymentMethod: PaymentMethodType;
  metadata?: Record<string, any>;
  installments?: number;
  savePaymentMethod?: boolean;
  customerId?: string;
  paymentMethodId?: string;
}

/**
 * Gateway Payment Response
 */
export interface GatewayPaymentResponse {
  externalId: string;
  status: string;
  gatewayStatus?: string;
  paymentUrl?: string;
  qrCode?: string;
  qrCodeBase64?: string;
  pixKey?: string;
  response: Record<string, any>;
}

/**
 * Gateway Refund Request
 */
export interface GatewayRefundRequest {
  externalId: string;
  amount: number;
  reason?: string;
}

/**
 * Gateway Refund Response
 */
export interface GatewayRefundResponse {
  externalId: string;
  status: string;
  processedAt?: Date;
  response: Record<string, any>;
}

/**
 * Webhook Event
 */
export interface WebhookEvent {
  gatewayId: string;
  externalId: string;
  eventType: string;
  payload: Record<string, any>;
  signature?: string;
}

/**
 * Webhook Processing Result
 */
export interface WebhookProcessingResult {
  success: boolean;
  transactionId?: string;
  status?: PaymentStatus;
  error?: string;
}

/**
 * Payment Gateway Interface
 */
export interface IPaymentGateway {
  /**
   * Process a payment
   */
  processPayment(request: GatewayPaymentRequest): Promise<GatewayPaymentResponse>;

  /**
   * Process a refund
   */
  processRefund(request: GatewayRefundRequest): Promise<GatewayRefundResponse>;

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean;

  /**
   * Process webhook event
   */
  processWebhook(event: WebhookEvent): Promise<WebhookProcessingResult>;

  /**
   * Get payment status
   */
  getPaymentStatus(externalId: string): Promise<PaymentStatus>;

  /**
   * Create customer
   */
  createCustomer?(userId: string, metadata?: Record<string, any>): Promise<string>;

  /**
   * Save payment method
   */
  savePaymentMethod?(customerId: string, paymentMethodData: any): Promise<string>;
}

/**
 * Gateway Selection Criteria
 */
export interface GatewaySelectionCriteria {
  country: string;
  currency: string;
  paymentMethod: PaymentMethodType;
  amount: number;
  userPreferences?: string[];
}

/**
 * Gateway Selection Result
 */
export interface GatewaySelectionResult {
  gateway: GatewayConfig;
  estimatedFees: number;
  estimatedTotal: number;
}

/**
 * Service Response
 */
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// Re-export types from schema for convenience
export type {
  PaymentStatus,
  RefundStatus,
  PaymentMethodType,
  GatewayProvider,
} from '../schema/payments.schema';
