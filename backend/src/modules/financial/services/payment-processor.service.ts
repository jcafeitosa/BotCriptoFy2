/**
 * Payment Processor Service
 *
 * Main service for processing payments through multiple gateways
 * Handles payment lifecycle: selection, processing, webhooks, refunds, dunning
 */

import { db } from '../../../db';
import {
  paymentGateways,
  paymentTransactions,
  paymentRefunds,
  paymentWebhooks,
  paymentDunning,
  type PaymentTransaction,
  // type PaymentRefund, // Não usado ainda
} from '../schema/payments.schema';
import { eq } from 'drizzle-orm';
import { gatewaySelector } from './gateway-selector.service';
import { InfinityPayGateway } from './gateways/infinitypay.gateway';
import { StripeGateway } from './gateways/stripe.gateway';
import { BancoGateway } from './gateways/banco.gateway';
import { logAuditEvent } from '@/modules/audit/services/audit-logger.service';
import type {
  IPaymentGateway,
  PaymentRequest,
  PaymentResponse,
  RefundRequest,
  RefundResponse,
  GatewayConfig,
  WebhookEvent,
  ServiceResponse,
} from '../types/payment.types';

/**
 * Payment Processor Service
 */
export class PaymentProcessor {
  /**
   * Process a payment through the best available gateway
   */
  async processPayment(request: PaymentRequest): Promise<ServiceResponse<PaymentResponse>> {
    try {
      // Select the best gateway
      const selection = await gatewaySelector.selectGateway({
        country: request.country,
        currency: request.currency,
        paymentMethod: request.paymentMethod,
        amount: request.amount,
        userPreferences: request.userPreferences,
      });

      // Get gateway configuration
      const gatewayConfig = selection.gateway;

      // Instantiate gateway
      const gateway = this.instantiateGateway(gatewayConfig);

      // Create payment transaction record
      const transaction = await db
        .insert(paymentTransactions)
        .values({
          tenantId: request.tenantId,
          userId: request.userId,
          gatewayId: await this.getGatewayId(gatewayConfig.slug),
          externalId: '', // Will be updated after gateway response
          amount: String(request.amount),
          currency: request.currency,
          paymentMethod: request.paymentMethod,
          status: 'pending',
          metadata: request.metadata || {},
        })
        .returning();

      // Audit: Transaction created
      await logAuditEvent({
        eventType: 'financial.transaction_created',
        severity: 'medium',
        status: 'success',
        userId: request.userId,
        tenantId: request.tenantId,
        resource: 'payment_transactions',
        resourceId: transaction[0].id,
        action: 'create',
        metadata: {
          amount: request.amount,
          currency: request.currency,
          paymentMethod: request.paymentMethod,
          gateway: gatewayConfig.slug,
        },
        complianceCategory: 'pci_dss',
      });

      try {
        // Process payment through gateway
        const gatewayResponse = await gateway.processPayment({
          amount: request.amount,
          currency: request.currency,
          paymentMethod: request.paymentMethod,
          metadata: {
            ...request.metadata,
            transactionId: transaction[0].id,
            userId: request.userId,
            tenantId: request.tenantId,
          },
          installments: request.installments,
          savePaymentMethod: request.savePaymentMethod,
        });

        // Update transaction with gateway response
        await db
          .update(paymentTransactions)
          .set({
            externalId: gatewayResponse.externalId,
            status: gatewayResponse.status,
            gatewayStatus: gatewayResponse.gatewayStatus,
            gatewayResponse: gatewayResponse.response,
            processedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(paymentTransactions.id, transaction[0].id));

        // Audit: Payment processed successfully
        await logAuditEvent({
          eventType: 'financial.payment_processed',
          severity: 'high',
          status: 'success',
          userId: request.userId,
          tenantId: request.tenantId,
          resource: 'payment_transactions',
          resourceId: transaction[0].id,
          action: 'process',
          metadata: {
            transactionId: transaction[0].id,
            externalId: gatewayResponse.externalId,
            amount: request.amount,
            currency: request.currency,
            gateway: gatewayConfig.slug,
            paymentStatus: gatewayResponse.status,
          },
          complianceCategory: 'pci_dss',
        });

        return {
          success: true,
          data: {
            success: true,
            transactionId: transaction[0].id,
            externalId: gatewayResponse.externalId,
            status: gatewayResponse.status,
            gateway: gatewayConfig.slug,
            paymentUrl: gatewayResponse.paymentUrl,
            qrCode: gatewayResponse.qrCode,
            qrCodeBase64: gatewayResponse.qrCodeBase64,
            pixKey: gatewayResponse.pixKey,
          },
        };
      } catch (error) {
        // Update transaction as failed
        await db
          .update(paymentTransactions)
          .set({
            status: 'failed',
            metadata: {
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            updatedAt: new Date(),
          })
          .where(eq(paymentTransactions.id, transaction[0].id));

        // Audit: Payment failed
        await logAuditEvent({
          eventType: 'financial.payment_failed',
          severity: 'high',
          status: 'failure',
          userId: request.userId,
          tenantId: request.tenantId,
          resource: 'payment_transactions',
          resourceId: transaction[0].id,
          action: 'process',
          metadata: {
            transactionId: transaction[0].id,
            amount: request.amount,
            currency: request.currency,
            gateway: gatewayConfig.slug,
          },
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorStack: error instanceof Error ? error.stack : undefined,
          complianceCategory: 'pci_dss',
        });

        // Create dunning record for retry
        if (request.metadata?.enableDunning !== false) {
          await this.createDunningRecord(transaction[0].id, request.tenantId, request.userId);
        }

        throw error;
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed',
        code: 'PAYMENT_ERROR',
      };
    }
  }

  /**
   * Process a refund
   */
  async processRefund(request: RefundRequest): Promise<ServiceResponse<RefundResponse>> {
    try {
      // Get transaction
      const transaction = await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.id, request.transactionId))
        .limit(1);

      if (transaction.length === 0) {
        throw new Error('Transaction not found');
      }

      const tx = transaction[0];

      // Check if transaction can be refunded
      if (tx.status !== 'completed') {
        throw new Error(`Cannot refund transaction with status: ${tx.status}`);
      }

      // Get gateway configuration
      const gateway = await db
        .select()
        .from(paymentGateways)
        .where(eq(paymentGateways.id, tx.gatewayId))
        .limit(1);

      if (gateway.length === 0) {
        throw new Error('Gateway not found');
      }

      const gatewayConfig = this.mapToGatewayConfig(gateway[0]);
      const gatewayInstance = this.instantiateGateway(gatewayConfig);

      // Create refund record
      const refund = await db
        .insert(paymentRefunds)
        .values({
          transactionId: request.transactionId,
          externalId: '', // Will be updated after gateway response
          amount: String(request.amount || tx.amount),
          reason: request.reason,
          status: 'pending',
        })
        .returning();

      try {
        // Process refund through gateway
        const gatewayResponse = await gatewayInstance.processRefund({
          externalId: tx.externalId,
          amount: request.amount || parseFloat(tx.amount),
          reason: request.reason,
        });

        // Update refund record
        await db
          .update(paymentRefunds)
          .set({
            externalId: gatewayResponse.externalId,
            status: gatewayResponse.status,
            gatewayResponse: gatewayResponse.response,
            processedAt: gatewayResponse.processedAt,
          })
          .where(eq(paymentRefunds.id, refund[0].id));

        // Update transaction status if fully refunded
        if (!request.amount || request.amount >= parseFloat(tx.amount)) {
          await db
            .update(paymentTransactions)
            .set({
              status: 'refunded',
              updatedAt: new Date(),
            })
            .where(eq(paymentTransactions.id, request.transactionId));
        }

        // Audit: Refund issued
        await logAuditEvent({
          eventType: 'financial.refund_issued',
          severity: 'high',
          status: 'success',
          userId: tx.userId,
          tenantId: tx.tenantId,
          resource: 'payment_refunds',
          resourceId: refund[0].id,
          action: 'refund',
          metadata: {
            refundId: refund[0].id,
            transactionId: request.transactionId,
            externalId: gatewayResponse.externalId,
            amount: parseFloat(refund[0].amount),
            originalAmount: parseFloat(tx.amount),
            reason: request.reason,
            isFullRefund: !request.amount || request.amount >= parseFloat(tx.amount),
          },
          complianceCategory: 'pci_dss',
        });

        return {
          success: true,
          data: {
            success: true,
            refundId: refund[0].id,
            externalId: gatewayResponse.externalId,
            status: gatewayResponse.status,
            amount: parseFloat(refund[0].amount),
          },
        };
      } catch (error) {
        // Update refund as failed
        await db
          .update(paymentRefunds)
          .set({
            status: 'failed',
          })
          .where(eq(paymentRefunds.id, refund[0].id));

        throw error;
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund processing failed',
        code: 'REFUND_ERROR',
      };
    }
  }

  /**
   * Process webhook event
   */
  async processWebhook(
    gatewaySlug: string,
    event: WebhookEvent
  ): Promise<ServiceResponse<{ processed: boolean }>> {
    try {
      // Get gateway configuration
      const gatewayConfig = await gatewaySelector.getGatewayBySlug(gatewaySlug);

      if (!gatewayConfig) {
        throw new Error('Gateway not found');
      }

      const gateway = this.instantiateGateway(gatewayConfig);

      // Verify webhook signature
      if (event.signature) {
        const isValid = gateway.verifyWebhookSignature(
          JSON.stringify(event.payload),
          event.signature
        );

        if (!isValid) {
          throw new Error('Invalid webhook signature');
        }
      }

      // Save webhook event
      const webhook = await db
        .insert(paymentWebhooks)
        .values({
          gatewayId: event.gatewayId,
          externalId: event.externalId,
          eventType: event.eventType,
          payload: event.payload,
          signature: event.signature,
          processed: false,
        })
        .returning();

      try {
        // Process webhook
        const result = await gateway.processWebhook(event);

        if (result.success && result.transactionId && result.status) {
          // Get transaction details for audit
          const [transaction] = await db
            .select()
            .from(paymentTransactions)
            .where(eq(paymentTransactions.externalId, event.externalId))
            .limit(1);

          // Update transaction status
          await db
            .update(paymentTransactions)
            .set({
              status: result.status,
              updatedAt: new Date(),
            })
            .where(eq(paymentTransactions.externalId, event.externalId));

          // Audit: Webhook processed
          if (transaction) {
            await logAuditEvent({
              eventType:
                result.status === 'completed'
                  ? 'financial.payment_processed'
                  : 'financial.payment_failed',
              severity: 'medium',
              status: 'success',
              userId: transaction.userId,
              tenantId: transaction.tenantId,
              resource: 'payment_webhooks',
              resourceId: webhook[0].id,
              action: 'webhook_processed',
              metadata: {
                webhookId: webhook[0].id,
                transactionId: transaction.id,
                externalId: event.externalId,
                eventType: event.eventType,
                gateway: gatewaySlug,
                paymentStatus: result.status,
              },
              complianceCategory: 'pci_dss',
            });
          }
        }

        // Mark webhook as processed
        await db
          .update(paymentWebhooks)
          .set({
            processed: true,
            processedAt: new Date(),
          })
          .where(eq(paymentWebhooks.id, webhook[0].id));

        return {
          success: true,
          data: { processed: true },
        };
      } catch (error) {
        // Update webhook with error
        await db
          .update(paymentWebhooks)
          .set({
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            retryCount: webhook[0].retryCount + 1,
          })
          .where(eq(paymentWebhooks.id, webhook[0].id));

        throw error;
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Webhook processing failed',
        code: 'WEBHOOK_ERROR',
      };
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(
    transactionId: string
  ): Promise<ServiceResponse<{ status: string; transaction: PaymentTransaction }>> {
    try {
      const transaction = await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.id, transactionId))
        .limit(1);

      if (transaction.length === 0) {
        throw new Error('Transaction not found');
      }

      return {
        success: true,
        data: {
          status: transaction[0].status,
          transaction: transaction[0],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get payment status',
        code: 'STATUS_ERROR',
      };
    }
  }

  /**
   * Create dunning record for failed payment retry
   */
  private async createDunningRecord(
    transactionId: string,
    tenantId: string,
    userId: string
  ): Promise<void> {
    const now = new Date();
    const nextAttempt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours later

    await db.insert(paymentDunning).values({
      transactionId,
      tenantId,
      userId,
      attemptCount: 0,
      maxAttempts: 3,
      nextAttempt,
      status: 'active',
      metadata: {},
    });
  }

  /**
   * Instantiate gateway implementation
   */
  private instantiateGateway(config: GatewayConfig): IPaymentGateway {
    switch (config.provider) {
      case 'infinitypay':
        return new InfinityPayGateway(config);
      case 'stripe':
        return new StripeGateway(config);
      case 'banco':
        return new BancoGateway(config);
      default:
        throw new Error(`Unsupported gateway provider: ${config.provider}`);
    }
  }

  /**
   * Get gateway ID from slug
   */
  private async getGatewayId(slug: string): Promise<string> {
    const gateway = await db
      .select({ id: paymentGateways.id })
      .from(paymentGateways)
      .where(eq(paymentGateways.slug, slug))
      .limit(1);

    if (gateway.length === 0) {
      throw new Error('Gateway not found');
    }

    return gateway[0].id;
  }

  /**
   * Map database record to GatewayConfig
   */
  private mapToGatewayConfig(gateway: any): GatewayConfig {
    return {
      name: gateway.name,
      slug: gateway.slug,
      provider: gateway.provider,
      isActive: gateway.isActive,
      isPrimary: gateway.isPrimary,
      supportedCountries: gateway.supportedCountries,
      supportedCurrencies: gateway.supportedCurrencies,
      supportedMethods: gateway.supportedMethods,
      configuration: gateway.configuration,
      fees: gateway.fees,
      webhookUrl: gateway.webhookUrl || undefined,
    };
  }
}

// Export singleton instance
export const paymentProcessor = new PaymentProcessor();
