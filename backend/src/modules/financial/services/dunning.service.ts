/**
 * Dunning Service
 *
 * Handles automatic retry logic for failed payments
 * Implements exponential backoff and smart retry strategies
 */

import { db } from '../../../db';
import {
  paymentDunning,
  paymentTransactions,
  // paymentGateways, // Não usado ainda
  type PaymentDunning,
} from '../schema/payments.schema';
import { eq, and, lte } from 'drizzle-orm';
import { paymentProcessor } from './payment-processor.service';
import type { PaymentRequest } from '../types/payment.types';

/**
 * Dunning Configuration
 */
interface DunningConfig {
  maxAttempts: number;
  retryDelays: number[]; // Delays in hours for each retry attempt
  enableNotifications: boolean;
}

/**
 * Default dunning configuration
 */
const DEFAULT_CONFIG: DunningConfig = {
  maxAttempts: 3,
  retryDelays: [24, 72, 168], // 1 day, 3 days, 7 days
  enableNotifications: true,
};

/**
 * Dunning Service
 */
export class DunningService {
  private config: DunningConfig;

  constructor(config: Partial<DunningConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Process all due dunning records
   */
  async processDueDunning(): Promise<{
    processed: number;
    successful: number;
    failed: number;
    errors: string[];
  }> {
    const now = new Date();
    const errors: string[] = [];
    let processed = 0;
    let successful = 0;
    let failed = 0;

    try {
      // Get all active dunning records that are due for retry
      const dueRecords = await db
        .select()
        .from(paymentDunning)
        .where(
          and(
            eq(paymentDunning.status, 'active'),
            lte(paymentDunning.nextAttempt, now)
          )
        );

      console.log(`Found ${dueRecords.length} dunning records due for retry`);

      // Process each dunning record
      for (const record of dueRecords) {
        try {
          const result = await this.retryPayment(record);
          processed++;

          if (result.success) {
            successful++;
          } else {
            failed++;
            errors.push(`Transaction ${record.transactionId}: ${result.error}`);
          }
        } catch (error) {
          failed++;
          errors.push(
            `Transaction ${record.transactionId}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      return { processed, successful, failed, errors };
    } catch (error) {
      console.error('Error processing dunning:', error);
      throw error;
    }
  }

  /**
   * Retry a failed payment
   */
  private async retryPayment(dunningRecord: PaymentDunning): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Get original transaction
      const transaction = await db
        .select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.id, dunningRecord.transactionId))
        .limit(1);

      if (transaction.length === 0) {
        throw new Error('Original transaction not found');
      }

      const tx = transaction[0];

      // Check if transaction is still in failed state
      if (tx.status !== 'failed') {
        // Transaction already processed by other means
        await this.completeDunning(dunningRecord.id);
        return { success: true };
      }

      // Increment attempt count
      const newAttemptCount = dunningRecord.attemptCount + 1;

      // Update dunning record
      await db
        .update(paymentDunning)
        .set({
          attemptCount: newAttemptCount,
          lastAttempt: new Date(),
        })
        .where(eq(paymentDunning.id, dunningRecord.id));

      // Reconstruct payment request from transaction
      const paymentRequest: PaymentRequest = {
        tenantId: tx.tenantId,
        userId: tx.userId,
        amount: parseFloat(tx.amount),
        currency: tx.currency,
        paymentMethod: tx.paymentMethod as any,
        country: (tx.metadata as any)?.country || 'BR',
        metadata: {
          ...((tx.metadata as any) || {}),
          isDunningRetry: true,
          originalTransactionId: tx.id,
          attemptNumber: newAttemptCount,
        },
      };

      // Attempt to process payment again
      const result = await paymentProcessor.processPayment(paymentRequest);

      if (result.success) {
        // Payment successful, complete dunning
        await this.completeDunning(dunningRecord.id);

        // Mark original transaction as superseded
        await db
          .update(paymentTransactions)
          .set({
            status: 'cancelled',
            metadata: {
              ...((tx.metadata as any) || {}),
              supersededBy: result.data?.transactionId,
            },
          })
          .where(eq(paymentTransactions.id, tx.id));

        return { success: true };
      } else {
        // Payment failed again
        if (newAttemptCount >= dunningRecord.maxAttempts) {
          // Max attempts reached, fail dunning
          await this.failDunning(dunningRecord.id);
          return {
            success: false,
            error: `Max attempts (${dunningRecord.maxAttempts}) reached`,
          };
        } else {
          // Schedule next retry
          await this.scheduleNextRetry(dunningRecord.id, newAttemptCount);
          return {
            success: false,
            error: result.error || 'Payment failed, will retry',
          };
        }
      }
    } catch (error) {
      // Update dunning with error
      await db
        .update(paymentDunning)
        .set({
          metadata: {
            ...((dunningRecord.metadata as any) || {}),
            lastError: error instanceof Error ? error.message : 'Unknown error',
          },
        })
        .where(eq(paymentDunning.id, dunningRecord.id));

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Schedule next retry attempt
   */
  private async scheduleNextRetry(dunningId: string, attemptCount: number): Promise<void> {
    const delayHours =
      attemptCount < this.config.retryDelays.length
        ? this.config.retryDelays[attemptCount]
        : this.config.retryDelays[this.config.retryDelays.length - 1];

    const nextAttempt = new Date(Date.now() + delayHours * 60 * 60 * 1000);

    await db
      .update(paymentDunning)
      .set({
        nextAttempt,
        updatedAt: new Date(),
      })
      .where(eq(paymentDunning.id, dunningId));
  }

  /**
   * Complete dunning (payment successful)
   */
  private async completeDunning(dunningId: string): Promise<void> {
    await db
      .update(paymentDunning)
      .set({
        status: 'completed',
        updatedAt: new Date(),
      })
      .where(eq(paymentDunning.id, dunningId));
  }

  /**
   * Fail dunning (max attempts reached)
   */
  private async failDunning(dunningId: string): Promise<void> {
    await db
      .update(paymentDunning)
      .set({
        status: 'failed',
        updatedAt: new Date(),
      })
      .where(eq(paymentDunning.id, dunningId));
  }

  /**
   * Pause dunning for a transaction
   */
  async pauseDunning(transactionId: string): Promise<void> {
    await db
      .update(paymentDunning)
      .set({
        status: 'paused',
        updatedAt: new Date(),
      })
      .where(eq(paymentDunning.transactionId, transactionId));
  }

  /**
   * Resume dunning for a transaction
   */
  async resumeDunning(transactionId: string): Promise<void> {
    await db
      .update(paymentDunning)
      .set({
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(paymentDunning.transactionId, transactionId));
  }

  /**
   * Cancel dunning for a transaction
   */
  async cancelDunning(transactionId: string): Promise<void> {
    await db
      .update(paymentDunning)
      .set({
        status: 'failed',
        updatedAt: new Date(),
      })
      .where(eq(paymentDunning.transactionId, transactionId));
  }

  /**
   * Get dunning status for a transaction
   */
  async getDunningStatus(transactionId: string): Promise<PaymentDunning | null> {
    const dunning = await db
      .select()
      .from(paymentDunning)
      .where(eq(paymentDunning.transactionId, transactionId))
      .limit(1);

    return dunning.length > 0 ? dunning[0] : null;
  }

  /**
   * Get all active dunning records for a tenant
   */
  async getActiveDunningByTenant(tenantId: string): Promise<PaymentDunning[]> {
    return db
      .select()
      .from(paymentDunning)
      .where(
        and(
          eq(paymentDunning.tenantId, tenantId),
          eq(paymentDunning.status, 'active')
        )
      );
  }

  /**
   * Get dunning statistics for a tenant
   */
  async getDunningStats(tenantId: string): Promise<{
    active: number;
    paused: number;
    completed: number;
    failed: number;
    totalAttempts: number;
    successRate: number;
  }> {
    const records = await db
      .select()
      .from(paymentDunning)
      .where(eq(paymentDunning.tenantId, tenantId));

    const active = records.filter((r) => r.status === 'active').length;
    const paused = records.filter((r) => r.status === 'paused').length;
    const completed = records.filter((r) => r.status === 'completed').length;
    const failed = records.filter((r) => r.status === 'failed').length;
    const totalAttempts = records.reduce((sum, r) => sum + r.attemptCount, 0);
    const successRate =
      records.length > 0 ? (completed / records.length) * 100 : 0;

    return {
      active,
      paused,
      completed,
      failed,
      totalAttempts,
      successRate: Math.round(successRate * 100) / 100,
    };
  }
}

// Export singleton instance
export const dunningService = new DunningService();

/**
 * Scheduled job to process dunning
 * This should be called periodically (e.g., every hour) by a cron job
 */
export async function processDunningJob(): Promise<void> {
  console.log('[Dunning] Starting dunning processing job...');

  try {
    const result = await dunningService.processDueDunning();

    console.log('[Dunning] Job completed:', {
      processed: result.processed,
      successful: result.successful,
      failed: result.failed,
      errorCount: result.errors.length,
    });

    if (result.errors.length > 0) {
      console.error('[Dunning] Errors:', result.errors);
    }
  } catch (error) {
    console.error('[Dunning] Job failed:', error);
    throw error;
  }
}
