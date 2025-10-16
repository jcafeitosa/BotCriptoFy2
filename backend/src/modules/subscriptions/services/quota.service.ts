/**
 * Quota Service
 * Manages real-time quotas and enforces limits
 */

import { db } from '@/db';
import { eq, and } from 'drizzle-orm';
import { subscriptionQuotas } from '../schema/subscription-usage.schema';
import type {
  NewSubscriptionQuota,
  CheckQuotaDTO,
  QuotaStatusResponse,
  PlanLimits,
} from '../types';
import { BadRequestError } from '@/utils/errors';
import { subscriptionManagementService } from './subscription-management.service';
import { subscriptionPlansService } from './subscription-plans.service';
import logger from '@/utils/logger';

export class QuotaService {
  // ============================================
  // QUOTA MANAGEMENT
  // ============================================

  /**
   * Initialize quotas for a new subscription
   */
  async initializeQuotas(tenantId: string, planId: string): Promise<void> {
    try {
      const plan = await subscriptionPlansService.getPlanById(planId);
      const limits = plan.limits as PlanLimits;

      const now = new Date();
      const periodStart = now;
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1); // Monthly period

      // Define quota types to initialize
      const quotaTypes = [
        { type: 'api_calls', limit: limits.maxApiCalls, period: 'monthly' },
        { type: 'bots', limit: limits.maxBots, period: 'concurrent' },
        { type: 'strategies', limit: limits.maxStrategies, period: 'concurrent' },
        { type: 'backtests', limit: limits.maxBacktests, period: 'monthly' },
        { type: 'exchanges', limit: limits.maxExchanges, period: 'concurrent' },
        { type: 'webhooks', limit: limits.maxWebhooks, period: 'concurrent' },
        { type: 'orders', limit: limits.maxOrders, period: 'daily' },
      ];

      for (const quota of quotaTypes) {
        const quotaData: NewSubscriptionQuota = {
          tenantId,
          planId,
          quotaType: quota.type,
          quotaPeriod: quota.period,
          quotaLimit: quota.limit,
          quotaUsed: 0,
          isExceeded: false,
          exceededAt: null,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          nextResetAt: this.calculateNextReset(periodStart, quota.period),
          softLimitPercentage: 80,
          softLimitReached: false,
          softLimitReachedAt: null,
          metadata: null,
        };

        await db.insert(subscriptionQuotas).values(quotaData);
      }

      logger.info(`Initialized ${quotaTypes.length} quotas for tenant`, { tenantId, planId });
    } catch (error) {
      logger.error('Error initializing quotas:', error);
      throw error;
    }
  }

  /**
   * Check quota status for a specific resource
   */
  async checkQuota(data: CheckQuotaDTO): Promise<QuotaStatusResponse> {
    try {
      const { tenantId, quotaType, requiredAmount = 1 } = data;

      // Get quota record
      const [quota] = await db
        .select()
        .from(subscriptionQuotas)
        .where(
          and(
            eq(subscriptionQuotas.tenantId, tenantId),
            eq(subscriptionQuotas.quotaType, quotaType)
          )
        )
        .limit(1);

      if (!quota) {
        // Quota not found, initialize it
        const subscription = await subscriptionManagementService.getTenantSubscription(tenantId);
        if (!subscription) {
          throw new BadRequestError('No active subscription found');
        }
        await this.initializeQuotas(tenantId, subscription.planId);

        // Try again
        return this.checkQuota(data);
      }

      // Check if quota period has expired
      const now = new Date();
      if (now >= quota.nextResetAt) {
        await this.resetQuota(quota.id);
        // Reload quota after reset
        return this.checkQuota(data);
      }

      const remaining = quota.quotaLimit - quota.quotaUsed;
      const wouldExceed = quota.quotaUsed + requiredAmount > quota.quotaLimit;
      const percentage = Math.round((quota.quotaUsed / quota.quotaLimit) * 100);

      const response: QuotaStatusResponse = {
        allowed: !wouldExceed,
        quotaType,
        limit: quota.quotaLimit,
        used: quota.quotaUsed,
        remaining,
        percentage,
        isExceeded: quota.isExceeded,
        isSoftLimitReached: quota.softLimitReached,
        resetAt: quota.nextResetAt,
      };

      if (wouldExceed) {
        response.message = `Quota exceeded for ${quotaType}. Limit: ${quota.quotaLimit}, Used: ${quota.quotaUsed}`;
      } else if (percentage >= quota.softLimitPercentage && !quota.softLimitReached) {
        response.message = `Approaching quota limit for ${quotaType} (${percentage}%)`;
      }

      return response;
    } catch (error) {
      logger.error('Error checking quota:', error);
      throw error;
    }
  }

  /**
   * Increment quota usage
   */
  async incrementQuota(tenantId: string, quotaType: string, amount: number = 1): Promise<void> {
    try {
      const [quota] = await db
        .select()
        .from(subscriptionQuotas)
        .where(
          and(
            eq(subscriptionQuotas.tenantId, tenantId),
            eq(subscriptionQuotas.quotaType, quotaType)
          )
        )
        .limit(1);

      if (!quota) {
        logger.warn('Quota not found, cannot increment', { tenantId, quotaType });
        return;
      }

      const newUsed = quota.quotaUsed + amount;
      const percentage = (newUsed / quota.quotaLimit) * 100;

      const updates: Partial<typeof subscriptionQuotas.$inferInsert> = {
        quotaUsed: newUsed,
      };

      // Check if exceeded
      if (newUsed > quota.quotaLimit && !quota.isExceeded) {
        updates.isExceeded = true;
        updates.exceededAt = new Date();
      }

      // Check if soft limit reached
      if (percentage >= quota.softLimitPercentage && !quota.softLimitReached) {
        updates.softLimitReached = true;
        updates.softLimitReachedAt = new Date();
      }

      await db
        .update(subscriptionQuotas)
        .set(updates)
        .where(eq(subscriptionQuotas.id, quota.id));

      logger.info('Quota incremented', {
        tenantId,
        quotaType,
        amount,
        newUsed,
        limit: quota.quotaLimit,
        percentage: Math.round(percentage),
      });
    } catch (error) {
      logger.error('Error incrementing quota:', error);
      throw error;
    }
  }

  /**
   * Decrement quota usage (when resource is deleted)
   */
  async decrementQuota(tenantId: string, quotaType: string, amount: number = 1): Promise<void> {
    try {
      const [quota] = await db
        .select()
        .from(subscriptionQuotas)
        .where(
          and(
            eq(subscriptionQuotas.tenantId, tenantId),
            eq(subscriptionQuotas.quotaType, quotaType)
          )
        )
        .limit(1);

      if (!quota) {
        logger.warn('Quota not found, cannot decrement', { tenantId, quotaType });
        return;
      }

      const newUsed = Math.max(0, quota.quotaUsed - amount);
      const percentage = (newUsed / quota.quotaLimit) * 100;

      const updates: Partial<typeof subscriptionQuotas.$inferInsert> = {
        quotaUsed: newUsed,
      };

      // Reset exceeded flag if now under limit
      if (newUsed <= quota.quotaLimit && quota.isExceeded) {
        updates.isExceeded = false;
        updates.exceededAt = null;
      }

      // Reset soft limit flag if now under soft limit
      if (percentage < quota.softLimitPercentage && quota.softLimitReached) {
        updates.softLimitReached = false;
        updates.softLimitReachedAt = null;
      }

      await db
        .update(subscriptionQuotas)
        .set(updates)
        .where(eq(subscriptionQuotas.id, quota.id));

      logger.info('Quota decremented', {
        tenantId,
        quotaType,
        amount,
        newUsed,
        limit: quota.quotaLimit,
      });
    } catch (error) {
      logger.error('Error decrementing quota:', error);
      throw error;
    }
  }

  /**
   * Reset quota (for new period)
   */
  async resetQuota(quotaId: string): Promise<void> {
    try {
      const [quota] = await db
        .select()
        .from(subscriptionQuotas)
        .where(eq(subscriptionQuotas.id, quotaId))
        .limit(1);

      if (!quota) {
        return;
      }

      const now = new Date();
      const newPeriodStart = now;
      const newPeriodEnd = this.calculatePeriodEnd(now, quota.quotaPeriod);
      const nextReset = this.calculateNextReset(now, quota.quotaPeriod);

      await db
        .update(subscriptionQuotas)
        .set({
          quotaUsed: 0,
          isExceeded: false,
          exceededAt: null,
          softLimitReached: false,
          softLimitReachedAt: null,
          currentPeriodStart: newPeriodStart,
          currentPeriodEnd: newPeriodEnd,
          nextResetAt: nextReset,
        })
        .where(eq(subscriptionQuotas.id, quotaId));

      logger.info('Quota reset', {
        quotaId,
        quotaType: quota.quotaType,
        
      });
    } catch (error) {
      logger.error('Error resetting quota:', error);
      throw error;
    }
  }

  /**
   * Reset all quotas for tenant (when changing plan)
   */
  async resetAllQuotas(tenantId: string): Promise<void> {
    try {
      const quotas = await db
        .select()
        .from(subscriptionQuotas)
        .where(eq(subscriptionQuotas.tenantId, tenantId));

      for (const quota of quotas) {
        await this.resetQuota(quota.id);
      }

      logger.info(`Reset all quotas for tenant`, { tenantId, count: quotas.length });
    } catch (error) {
      logger.error('Error resetting all quotas:', error);
      throw error;
    }
  }

  /**
   * Update quota limits (when plan changes)
   */
  async updateQuotaLimits(tenantId: string, planId: string): Promise<void> {
    try {
      const plan = await subscriptionPlansService.getPlanById(planId);
      const limits = plan.limits as PlanLimits;

      const quotaLimits = {
        api_calls: limits.maxApiCalls,
        bots: limits.maxBots,
        strategies: limits.maxStrategies,
        backtests: limits.maxBacktests,
        exchanges: limits.maxExchanges,
        webhooks: limits.maxWebhooks,
        orders: limits.maxOrders,
      };

      for (const [quotaType, newLimit] of Object.entries(quotaLimits)) {
        const [quota] = await db
          .select()
          .from(subscriptionQuotas)
          .where(
            and(
              eq(subscriptionQuotas.tenantId, tenantId),
              eq(subscriptionQuotas.quotaType, quotaType)
            )
          )
          .limit(1);

        if (quota) {
          const updates: Partial<typeof subscriptionQuotas.$inferInsert> = {
            quotaLimit: newLimit,
            planId,
          };

          // Recalculate exceeded status with new limit
          if (quota.quotaUsed > newLimit) {
            updates.isExceeded = true;
            updates.exceededAt = quota.exceededAt || new Date();
          } else {
            updates.isExceeded = false;
            updates.exceededAt = null;
          }

          // Recalculate soft limit
          const percentage = (quota.quotaUsed / newLimit) * 100;
          if (percentage >= quota.softLimitPercentage) {
            updates.softLimitReached = true;
            updates.softLimitReachedAt = quota.softLimitReachedAt || new Date();
          } else {
            updates.softLimitReached = false;
            updates.softLimitReachedAt = null;
          }

          await db
            .update(subscriptionQuotas)
            .set(updates)
            .where(eq(subscriptionQuotas.id, quota.id));
        }
      }

      logger.info('Updated quota limits for tenant', { tenantId, planId });
    } catch (error) {
      logger.error('Error updating quota limits:', error);
      throw error;
    }
  }

  /**
   * Get all quotas for tenant
   */
  async getTenantQuotas(tenantId: string): Promise<typeof subscriptionQuotas.$inferSelect[]> {
    try {
      const quotas = await db
        .select()
        .from(subscriptionQuotas)
        .where(eq(subscriptionQuotas.tenantId, tenantId));

      return quotas;
    } catch (error) {
      logger.error('Error getting tenant quotas:', error);
      throw error;
    }
  }

  /**
   * Get specific quota status
   */
  async getQuotaStatus(tenantId: string, quotaType: string): Promise<QuotaStatusResponse | null> {
    try {
      const [quota] = await db
        .select()
        .from(subscriptionQuotas)
        .where(
          and(
            eq(subscriptionQuotas.tenantId, tenantId),
            eq(subscriptionQuotas.quotaType, quotaType)
          )
        )
        .limit(1);

      if (!quota) {
        return null;
      }

      const currentUsage = quota.quotaUsed;
      const limit = quota.quotaLimit;
      const percentage = limit > 0 ? Math.round((currentUsage / limit) * 100) : 0;

      const status: QuotaStatusResponse = {
        quotaType: quota.quotaType,
        used: currentUsage,
        limit,
        remaining: Math.max(0, limit - currentUsage),
        percentage,
        isExceeded: currentUsage >= limit,
        
        
        allowed: currentUsage < limit,
        isSoftLimitReached: quota.softLimitReached,
        resetAt: quota.nextResetAt,
      };

      return status;
    } catch (error) {
      logger.error('Error getting quota status:', error);
      throw error;
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Calculate next reset time based on period
   */
  private calculateNextReset(currentDate: Date, period: string): Date {
    const nextReset = new Date(currentDate);

    switch (period) {
      case 'daily':
        nextReset.setDate(nextReset.getDate() + 1);
        nextReset.setHours(0, 0, 0, 0); // Reset at midnight
        break;

      case 'monthly':
        nextReset.setMonth(nextReset.getMonth() + 1);
        nextReset.setDate(1); // First day of next month
        nextReset.setHours(0, 0, 0, 0);
        break;

      case 'concurrent':
        // Concurrent quotas don't reset automatically
        nextReset.setFullYear(nextReset.getFullYear() + 100); // Far future
        break;

      default:
        nextReset.setMonth(nextReset.getMonth() + 1);
    }

    return nextReset;
  }

  /**
   * Calculate period end based on period type
   */
  private calculatePeriodEnd(currentDate: Date, period: string): Date {
    const periodEnd = new Date(currentDate);

    switch (period) {
      case 'daily':
        periodEnd.setDate(periodEnd.getDate() + 1);
        break;

      case 'monthly':
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        break;

      case 'concurrent':
        periodEnd.setFullYear(periodEnd.getFullYear() + 100);
        break;

      default:
        periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    return periodEnd;
  }
}

// Export singleton instance
export const quotaService = new QuotaService();
