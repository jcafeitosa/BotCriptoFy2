/**
 * Usage Tracking Service
 * Tracks resource usage and enforces subscription limits
 */

import { db } from '@/db';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import {
  subscriptionUsage,
  subscriptionUsageEvents,
} from '../schema/subscription-usage.schema';
import type {
  NewSubscriptionUsage,
  RecordUsageEventDTO,
  UsageSummaryResponse,
  PlanLimits,
} from '../types';
import { BadRequestError } from '@/utils/errors';
import { subscriptionManagementService } from './subscription-management.service';
import { subscriptionPlansService } from './subscription-plans.service';
import logger from '@/utils/logger';

export class UsageTrackingService {
  // ============================================
  // USAGE TRACKING
  // ============================================

  /**
   * Record a usage event (API call, bot created, etc.)
   */
  async recordUsageEvent(data: RecordUsageEventDTO): Promise<void> {
    try {
      const {
        tenantId,
        eventType,
        eventCategory,
        resourceType,
        resourceId,
        quantity = 1,
        unitType,
        userId,
        metadata,
      } = data;

      // Get current subscription to validate limits
      const subscription = await subscriptionManagementService.getTenantSubscription(tenantId);
      if (!subscription) {
        throw new BadRequestError('No active subscription found');
      }

      const plan = await subscriptionPlansService.getPlanById(subscription.planId);
      const limits = plan.limits as PlanLimits;

      // Get or create today's usage record
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const usageMonth = today.substring(0, 7); // YYYY-MM

      const usageRecord = await this.getOrCreateDailyUsage(tenantId, subscription.planId, today, usageMonth);

      // Update usage counters based on event type
      const updates: Partial<typeof subscriptionUsage.$inferInsert> = {};
      let isBlocked = false;
      let blockedReason: string | undefined;

      switch (eventCategory) {
        case 'api':
          updates.apiCalls = (usageRecord.apiCalls || 0) + quantity;
          if (limits.maxApiCalls && updates.apiCalls > limits.maxApiCalls) {
            isBlocked = true;
            blockedReason = `API call limit exceeded (${limits.maxApiCalls}/month)`;
          }
          break;

        case 'trading':
          if (resourceType === 'bot') {
            updates.activeBots = (usageRecord.activeBots || 0) + quantity;
            if (limits.maxBots && updates.activeBots > limits.maxBots) {
              isBlocked = true;
              blockedReason = `Bot limit exceeded (${limits.maxBots} max)`;
            }
          } else if (resourceType === 'strategy') {
            updates.activeStrategies = (usageRecord.activeStrategies || 0) + quantity;
            if (limits.maxStrategies && updates.activeStrategies > limits.maxStrategies) {
              isBlocked = true;
              blockedReason = `Strategy limit exceeded (${limits.maxStrategies} max)`;
            }
          } else if (resourceType === 'backtest') {
            updates.backtestsRun = (usageRecord.backtestsRun || 0) + quantity;
            if (limits.maxBacktests && updates.backtestsRun > limits.maxBacktests) {
              isBlocked = true;
              blockedReason = `Backtest limit exceeded (${limits.maxBacktests}/month)`;
            }
          } else if (resourceType === 'order') {
            updates.ordersPlaced = (usageRecord.ordersPlaced || 0) + quantity;
            if (limits.maxOrders && updates.ordersPlaced > limits.maxOrders) {
              isBlocked = true;
              blockedReason = `Order limit exceeded (${limits.maxOrders}/day)`;
            }
          }
          break;

        case 'feature':
          if (resourceType === 'ai_model') {
            if (!limits.aiModelAccess) {
              isBlocked = true;
              blockedReason = 'AI model access not available in current plan';
            } else {
              updates.aiModelCalls = (usageRecord.aiModelCalls || 0) + quantity;
            }
          } else if (resourceType === 'webhook') {
            updates.webhookCalls = (usageRecord.webhookCalls || 0) + quantity;
            if (limits.maxWebhooks && updates.webhookCalls > limits.maxWebhooks) {
              isBlocked = true;
              blockedReason = `Webhook limit exceeded (${limits.maxWebhooks} max)`;
            }
          }
          break;
      }

      // Update usage record if not blocked
      if (!isBlocked && Object.keys(updates).length > 0) {
        await db
          .update(subscriptionUsage)
          .set(updates)
          .where(eq(subscriptionUsage.id, usageRecord.id));
      }

      // Log the event
      await db.insert(subscriptionUsageEvents).values({
        tenantId,
        usageId: usageRecord.id,
        eventType,
        eventCategory,
        resourceType,
        resourceId: resourceId || null,
        quantity,
        unitType,
        status: isBlocked ? 'blocked' : 'success',
        blockedReason: blockedReason || null,
        userId: userId || null,
        metadata: metadata || null,
      });

      if (isBlocked) {
        logger.warn('Usage event blocked due to limit', {
          tenantId,
          eventType,
          resourceType,
          blockedReason,
        });
        throw new BadRequestError(blockedReason || 'Usage limit exceeded');
      }

      logger.info('Usage event recorded', {
        tenantId,
        eventType,
        resourceType,
        quantity,
      });
    } catch (error) {
      logger.error('Error recording usage event:', error);
      throw error;
    }
  }

  /**
   * Get or create daily usage record
   */
  private async getOrCreateDailyUsage(
    tenantId: string,
    planId: string,
    usageDate: string,
    usageMonth: string
  ): Promise<typeof subscriptionUsage.$inferSelect> {
    try {
      // Try to get existing record
      const [existing] = await db
        .select()
        .from(subscriptionUsage)
        .where(
          and(
            eq(subscriptionUsage.tenantId, tenantId),
            eq(subscriptionUsage.usageDate, usageDate)
          )
        )
        .limit(1);

      if (existing) {
        return existing;
      }

      // Create new record
      const usageData: NewSubscriptionUsage = {
        tenantId,
        planId,
        usageDate,
        usageMonth,
        activeBots: 0,
        activeStrategies: 0,
        backtestsRun: 0,
        activeExchanges: 0,
        ordersPlaced: 0,
        alertsCreated: 0,
        apiCalls: 0,
        webhookCalls: 0,
        websocketConnections: 0,
        storageUsedMB: 0,
        aiModelCalls: 0,
        reportGenerated: 0,
        exportActions: 0,
        limitsExceeded: [],
        warningsSent: false,
        warningsSentAt: null,
        metadata: null,
      };

      const [newRecord] = await db.insert(subscriptionUsage).values(usageData).returning();

      return newRecord;
    } catch (error) {
      logger.error('Error getting/creating daily usage:', error);
      throw error;
    }
  }

  /**
   * Get usage summary for tenant
   */
  async getUsageSummary(tenantId: string, month?: string): Promise<UsageSummaryResponse> {
    try {
      const subscription = await subscriptionManagementService.getTenantSubscription(tenantId);
      if (!subscription) {
        throw new BadRequestError('No active subscription found');
      }

      const plan = await subscriptionPlansService.getPlanById(subscription.planId);
      const limits = plan.limits as PlanLimits;

      // Get current month if not specified
      const targetMonth = month || new Date().toISOString().substring(0, 7);
      const periodStart = new Date(`${targetMonth}-01`);
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      // Get usage records for the month
      const usageRecords = await db
        .select()
        .from(subscriptionUsage)
        .where(
          and(
            eq(subscriptionUsage.tenantId, tenantId),
            eq(subscriptionUsage.usageMonth, targetMonth)
          )
        );

      // Aggregate usage
      const totals = {
        activeBots: 0,
        activeStrategies: 0,
        backtestsRun: 0,
        apiCalls: 0,
        storageUsedMB: 0,
      };

      for (const record of usageRecords) {
        totals.activeBots = Math.max(totals.activeBots, record.activeBots || 0);
        totals.activeStrategies = Math.max(totals.activeStrategies, record.activeStrategies || 0);
        totals.backtestsRun += record.backtestsRun || 0;
        totals.apiCalls += record.apiCalls || 0;
        totals.storageUsedMB = Math.max(totals.storageUsedMB, record.storageUsedMB || 0);
      }

      // Calculate percentages
      const usage: UsageSummaryResponse['usage'] = {
        bots: {
          used: totals.activeBots,
          limit: limits.maxBots,
          percentage: Math.round((totals.activeBots / limits.maxBots) * 100),
        },
        strategies: {
          used: totals.activeStrategies,
          limit: limits.maxStrategies,
          percentage: Math.round((totals.activeStrategies / limits.maxStrategies) * 100),
        },
        backtests: {
          used: totals.backtestsRun,
          limit: limits.maxBacktests,
          percentage: Math.round((totals.backtestsRun / limits.maxBacktests) * 100),
        },
        apiCalls: {
          used: totals.apiCalls,
          limit: limits.maxApiCalls,
          percentage: Math.round((totals.apiCalls / limits.maxApiCalls) * 100),
        },
        storage: {
          usedMB: totals.storageUsedMB,
          limitGB: limits.storageGB,
          percentage: Math.round((totals.storageUsedMB / (limits.storageGB * 1024)) * 100),
        },
      };

      // Identify warnings and exceeded limits
      const warnings: string[] = [];
      const exceededLimits: string[] = [];

      Object.entries(usage).forEach(([key, value]) => {
        if ('percentage' in value) {
          if (value.percentage >= 100) {
            exceededLimits.push(key);
          } else if (value.percentage >= 80) {
            warnings.push(`${key} usage at ${value.percentage}%`);
          }
        }
      });

      return {
        tenantId,
        planId: plan.id,
        planName: plan.displayName,
        period: {
          start: periodStart,
          end: periodEnd,
        },
        usage,
        warnings,
        exceededLimits,
      };
    } catch (error) {
      logger.error('Error getting usage summary:', error);
      throw error;
    }
  }

  /**
   * Get detailed usage summary with breakdown by category and resource type
   */
  async getDetailedUsageSummary(tenantId: string, month?: string): Promise<any> {
    try {
      const subscription = await subscriptionManagementService.getTenantSubscription(tenantId);
      if (!subscription) {
        throw new BadRequestError('No active subscription found');
      }

      const plan = await subscriptionPlansService.getPlanById(subscription.planId);

      // Get current month if not specified
      const targetMonth = month || new Date().toISOString().substring(0, 7);
      const periodStart = new Date(`${targetMonth}-01`);
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      // Get all usage events for the month
      const events = await db
        .select()
        .from(subscriptionUsageEvents)
        .where(
          and(
            eq(subscriptionUsageEvents.tenantId, tenantId),
            gte(subscriptionUsageEvents.eventTime, periodStart),
            lte(subscriptionUsageEvents.eventTime, periodEnd)
          )
        )
        .orderBy(desc(subscriptionUsageEvents.eventTime));

      // Aggregate by category
      const byCategory: Record<string, { count: number; quantity: number }> = {};
      const byResourceType: Record<string, { count: number; quantity: number }> = {};

      for (const event of events) {
        // By category
        const category = event.eventCategory;
        if (!byCategory[category]) {
          byCategory[category] = { count: 0, quantity: 0 };
        }
        byCategory[category].count++;
        byCategory[category].quantity += event.quantity;

        // By resource type
        const resourceType = event.resourceType;
        if (!byResourceType[resourceType]) {
          byResourceType[resourceType] = { count: 0, quantity: 0 };
        }
        byResourceType[resourceType].count++;
        byResourceType[resourceType].quantity += event.quantity;
      }

      return {
        tenantId,
        planId: plan.id,
        planName: plan.displayName,
        period: {
          start: periodStart,
          end: periodEnd,
        },
        totalEvents: events.length,
        byCategory,
        byResourceType,
        recentEvents: events.slice(0, 10), // Last 10 events
      };
    } catch (error) {
      logger.error('Error getting detailed usage summary:', error);
      throw error;
    }
  }

  /**
   * Get usage events for tenant
   */
  async getUsageEvents(
    tenantId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      eventType?: string;
      eventCategory?: string;
      limit?: number;
    } = {}
  ): Promise<typeof subscriptionUsageEvents.$inferSelect[]> {
    try {
      const { startDate, endDate, eventType, eventCategory, limit = 100 } = options;

      const conditions = [eq(subscriptionUsageEvents.tenantId, tenantId)];

      if (startDate) {
        conditions.push(gte(subscriptionUsageEvents.eventTime, startDate));
      }

      if (endDate) {
        conditions.push(lte(subscriptionUsageEvents.eventTime, endDate));
      }

      if (eventType) {
        conditions.push(eq(subscriptionUsageEvents.eventType, eventType));
      }

      if (eventCategory) {
        conditions.push(eq(subscriptionUsageEvents.eventCategory, eventCategory));
      }

      const events = await db
        .select()
        .from(subscriptionUsageEvents)
        .where(and(...conditions))
        .orderBy(desc(subscriptionUsageEvents.eventTime))
        .limit(limit);

      return events;
    } catch (error) {
      logger.error('Error getting usage events:', error);
      throw error;
    }
  }

  /**
   * Check if action is allowed (pre-check before executing)
   */
  async checkActionAllowed(
    tenantId: string,
    resourceType: string,
    requiredQuantity: number = 1
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const subscription = await subscriptionManagementService.getTenantSubscription(tenantId);
      if (!subscription) {
        return { allowed: false, reason: 'No active subscription' };
      }

      const plan = await subscriptionPlansService.getPlanById(subscription.planId);
      const limits = plan.limits as PlanLimits;

      // Get current usage
      const today = new Date().toISOString().split('T')[0];
      const usageMonth = today.substring(0, 7);
      const usageRecord = await this.getOrCreateDailyUsage(tenantId, subscription.planId, today, usageMonth);

      // Check limits based on resource type
      switch (resourceType) {
        case 'bot':
          if (limits.maxBots && usageRecord.activeBots + requiredQuantity > limits.maxBots) {
            return { allowed: false, reason: `Bot limit reached (${limits.maxBots} max)` };
          }
          break;

        case 'strategy':
          if (limits.maxStrategies && usageRecord.activeStrategies + requiredQuantity > limits.maxStrategies) {
            return { allowed: false, reason: `Strategy limit reached (${limits.maxStrategies} max)` };
          }
          break;

        case 'api_call':
          if (limits.maxApiCalls && usageRecord.apiCalls + requiredQuantity > limits.maxApiCalls) {
            return { allowed: false, reason: `API call limit reached (${limits.maxApiCalls}/month)` };
          }
          break;

        case 'ai_model':
          if (!limits.aiModelAccess) {
            return { allowed: false, reason: 'AI model access not available in your plan' };
          }
          break;
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Error checking action allowed:', error);
      return { allowed: false, reason: 'Error checking limits' };
    }
  }

  /**
   * Reset daily usage counters (run daily via cron)
   */
  async resetDailyCounters(): Promise<void> {
    try {
      // This would typically be called by a cron job
      // Reset counters that are daily (like ordersPlaced)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      logger.info('Resetting daily usage counters', { date: yesterdayStr });

      // Daily counters are automatically reset by creating new records each day
      // This method is here for any cleanup needed
    } catch (error) {
      logger.error('Error resetting daily counters:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const usageTrackingService = new UsageTrackingService();
