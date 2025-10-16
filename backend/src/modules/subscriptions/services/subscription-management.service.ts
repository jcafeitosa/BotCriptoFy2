/**
 * Subscription Management Service
 * Manages tenant subscriptions (subscribe, upgrade, downgrade, cancel)
 * Integrates with Better-Auth + Stripe for payment processing
 */

import { db } from '@/db';
import { eq, desc } from 'drizzle-orm';
import {
  tenantSubscriptionPlans,
  type SubscriptionPlan,
} from '../schema/subscription-plans.schema';
import { subscriptionHistory } from '../schema/subscription-history.schema';
import type {
  TenantSubscriptionPlan,
  NewTenantSubscriptionPlan,
  SubscribeToPlanDTO,
  ChangePlanDTO,
  CancelSubscriptionDTO,
  SubscriptionStatusResponse,
  PlanLimits,
} from '../types';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { subscriptionPlansService } from './subscription-plans.service';
import logger from '@/utils/logger';

/**
 * Helper function to get price based on billing period
 */
function getPriceForPeriod(plan: SubscriptionPlan, billingPeriod: string): string {
  switch (billingPeriod) {
    case 'monthly':
      return plan.priceMonthly;
    case 'quarterly':
      return plan.priceQuarterly;
    case 'yearly':
      return plan.priceYearly;
    default:
      return plan.priceMonthly; // Default to monthly
  }
}

export class SubscriptionManagementService {
  // ============================================
  // SUBSCRIPTION STATUS
  // ============================================

  /**
   * Get tenant's current subscription
   */
  async getTenantSubscription(tenantId: string): Promise<TenantSubscriptionPlan | null> {
    try {
      const [subscription] = await db
        .select()
        .from(tenantSubscriptionPlans)
        .where(eq(tenantSubscriptionPlans.tenantId, tenantId))
        .orderBy(desc(tenantSubscriptionPlans.createdAt))
        .limit(1);

      return subscription || null;
    } catch (error) {
      logger.error('Error getting tenant subscription:', error);
      throw error;
    }
  }

  /**
   * Get subscription status with full details
   */
  async getSubscriptionStatus(tenantId: string): Promise<SubscriptionStatusResponse | null> {
    try {
      const subscription = await this.getTenantSubscription(tenantId);

      if (!subscription) {
        return null;
      }

      const plan = await subscriptionPlansService.getPlanById(subscription.planId);
      const features = await subscriptionPlansService.getPlanFeaturesWithDetails(plan.id);

      const response: SubscriptionStatusResponse = {
        tenantId,
        plan: {
          id: plan.id,
          name: plan.name,
          displayName: plan.displayName,
          slug: plan.slug,
          price: getPriceForPeriod(plan, subscription.billingPeriod),
          currency: plan.currency,
          billingPeriod: subscription.billingPeriod,
        },
        status: subscription.status as any,
        currentPeriod: {
          start: subscription.currentPeriodStart || new Date(),
          end: subscription.currentPeriodEnd || new Date(),
        },
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        canceledAt: subscription.canceledAt || undefined,
        stripeSubscriptionId: subscription.stripeSubscriptionId || undefined,
        stripeCustomerId: subscription.stripeCustomerId || undefined,
        limits: plan.limits as PlanLimits,
        features,
      };

      // Add trial info if in trial
      if (subscription.status === 'trialing' && subscription.trialStart && subscription.trialEnd) {
        const now = new Date();
        const trialEnd = new Date(subscription.trialEnd);
        const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        response.trial = {
          start: subscription.trialStart,
          end: subscription.trialEnd,
          daysRemaining: Math.max(0, daysRemaining),
        };
      }

      return response;
    } catch (error) {
      logger.error('Error getting subscription status:', error);
      throw error;
    }
  }

  /**
   * Check if tenant has active subscription
   */
  async hasActiveSubscription(tenantId: string): Promise<boolean> {
    try {
      const subscription = await this.getTenantSubscription(tenantId);

      if (!subscription) {
        return false;
      }

      return subscription.status === 'active' || subscription.status === 'trialing';
    } catch (error) {
      logger.error('Error checking active subscription:', error);
      throw error;
    }
  }

  // ============================================
  // SUBSCRIPTION LIFECYCLE
  // ============================================

  /**
   * Subscribe tenant to a plan
   * Note: For paid plans, this should be called AFTER Stripe checkout succeeds
   * For free plan, can be called directly
   */
  async subscribeToPlan(data: SubscribeToPlanDTO): Promise<TenantSubscriptionPlan> {
    try {
      const { tenantId, planId, trialPeriodDays, metadata } = data;

      // Check if tenant already has a subscription
      const existingSubscription = await this.getTenantSubscription(tenantId);
      if (existingSubscription) {
        throw new BadRequestError('Tenant already has a subscription. Use changePlan() to upgrade/downgrade.');
      }

      // Get plan details
      const plan = await subscriptionPlansService.getPlanById(planId);

      // Calculate subscription period
      const now = new Date();
      const currentPeriodStart = now;
      const currentPeriodEnd = new Date(now);
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1); // Monthly billing

      // Calculate trial period
      const finalTrialDays = trialPeriodDays !== undefined ? trialPeriodDays : plan.trialDays;
      let trialStart: Date | undefined;
      let trialEnd: Date | undefined;
      let status: string = 'active';

      if (finalTrialDays > 0) {
        trialStart = now;
        trialEnd = new Date(now);
        trialEnd.setDate(trialEnd.getDate() + finalTrialDays);
        status = 'trialing';
      }

      // Create subscription
      const subscriptionData: NewTenantSubscriptionPlan = {
        tenantId,
        planId,
        status,
        currentPeriodStart,
        currentPeriodEnd,
        trialStart: trialStart || null,
        trialEnd: trialEnd || null,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        metadata: metadata || null,
      };

      const [newSubscription] = await db
        .insert(tenantSubscriptionPlans)
        .values(subscriptionData)
        .returning();

      // Log to history
      await this.logSubscriptionEvent({
        tenantId,
        planId,
        eventType: 'created',
        eventCategory: 'subscription',
        eventSource: 'user_action',
        title: `Subscribed to ${plan.displayName}`,
        description: finalTrialDays > 0
          ? `Started ${finalTrialDays}-day trial on ${plan.displayName} plan`
          : `Activated ${plan.displayName} plan`,
        newStatus: status,
        newPrice: getPriceForPeriod(plan, newSubscription.billingPeriod),
        currency: plan.currency,
        metadata: {
          trialDays: finalTrialDays,
          limits: plan.limits,
        },
      });

      logger.info(`Tenant subscribed to plan: ${plan.displayName}`, {
        tenantId,
        planId,
        status,
        trialDays: finalTrialDays,
      });

      return newSubscription;
    } catch (error) {
      logger.error('Error subscribing to plan:', error);
      throw error;
    }
  }

  /**
   * Change subscription plan (upgrade or downgrade)
   */
  async changePlan(tenantId: string, data: ChangePlanDTO): Promise<TenantSubscriptionPlan> {
    try {
      const { newPlanId, reason, effectiveDate = 'immediate' } = data;

      // Get current subscription
      const currentSubscription = await this.getTenantSubscription(tenantId);
      if (!currentSubscription) {
        throw new NotFoundError('No active subscription found. Use subscribeToPlan() first.');
      }

      // Get old and new plan details
      const oldPlan = await subscriptionPlansService.getPlanById(currentSubscription.planId);
      const newPlan = await subscriptionPlansService.getPlanById(newPlanId);

      // Determine if it's an upgrade or downgrade (using current billing period)
      const oldPrice = parseFloat(getPriceForPeriod(oldPlan, currentSubscription.billingPeriod));
      const newPrice = parseFloat(getPriceForPeriod(newPlan, currentSubscription.billingPeriod));
      const isUpgrade = newPrice > oldPrice;
      const _eventType = isUpgrade ? 'plan.upgraded' : 'plan.downgraded';

      // Update subscription
      const [updatedSubscription] = await db
        .update(tenantSubscriptionPlans)
        .set({
          planId: newPlanId,
          updatedAt: new Date(),
        })
        .where(eq(tenantSubscriptionPlans.id, currentSubscription.id))
        .returning();

      // Log to history
      await this.logSubscriptionEvent({
        tenantId,
        planId: newPlanId,
        previousPlanId: oldPlan.id,
        eventType: isUpgrade ? 'upgraded' : 'downgraded',
        eventCategory: 'subscription',
        eventSource: 'user_action',
        title: `${isUpgrade ? 'Upgraded' : 'Downgraded'} to ${newPlan.displayName}`,
        description: reason || `Changed from ${oldPlan.displayName} to ${newPlan.displayName}`,
        oldStatus: currentSubscription.status,
        newStatus: currentSubscription.status,
        oldPrice: getPriceForPeriod(oldPlan, currentSubscription.billingPeriod),
        newPrice: getPriceForPeriod(newPlan, currentSubscription.billingPeriod),
        currency: newPlan.currency,
        reason,
        metadata: {
          oldLimits: oldPlan.limits,
          newLimits: newPlan.limits,
          effectiveDate,
        },
      });

      logger.info(`Tenant changed plan: ${oldPlan.displayName} → ${newPlan.displayName}`, {
        tenantId,
        oldPlanId: oldPlan.id,
        newPlanId,
        isUpgrade,
      });

      return updatedSubscription;
    } catch (error) {
      logger.error('Error changing plan:', error);
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(tenantId: string, data: CancelSubscriptionDTO): Promise<TenantSubscriptionPlan> {
    try {
      const { reason, cancelAtPeriodEnd = true, feedback } = data;

      // Get current subscription
      const subscription = await this.getTenantSubscription(tenantId);
      if (!subscription) {
        throw new NotFoundError('No active subscription found');
      }

      const plan = await subscriptionPlansService.getPlanById(subscription.planId);

      const now = new Date();
      const updateData: Partial<TenantSubscriptionPlan> = {
        cancelAtPeriodEnd,
        canceledAt: now,
        updatedAt: now,
      };

      // If immediate cancellation, set status to canceled
      if (!cancelAtPeriodEnd) {
        updateData.status = 'canceled';
      }

      const [canceledSubscription] = await db
        .update(tenantSubscriptionPlans)
        .set(updateData)
        .where(eq(tenantSubscriptionPlans.id, subscription.id))
        .returning();

      // Log to history
      await this.logSubscriptionEvent({
        tenantId,
        planId: subscription.planId,
        eventType: 'canceled',
        eventCategory: 'subscription',
        eventSource: 'user_action',
        title: `Canceled ${plan.displayName} subscription`,
        description: cancelAtPeriodEnd
          ? `Subscription will be canceled at end of billing period (${subscription.currentPeriodEnd})`
          : 'Subscription canceled immediately',
        oldStatus: subscription.status,
        newStatus: cancelAtPeriodEnd ? subscription.status : 'canceled',
        reason: reason || feedback,
        metadata: {
          cancelAtPeriodEnd,
          feedback,
          periodEnd: subscription.currentPeriodEnd,
        },
      });

      logger.info(`Tenant canceled subscription: ${plan.displayName}`, {
        tenantId,
        planId: subscription.planId,
        cancelAtPeriodEnd,
        reason,
      });

      return canceledSubscription;
    } catch (error) {
      logger.error('Error canceling subscription:', error);
      throw error;
    }
  }

  /**
   * Reactivate canceled subscription
   */
  async reactivateSubscription(tenantId: string): Promise<TenantSubscriptionPlan> {
    try {
      const subscription = await this.getTenantSubscription(tenantId);
      if (!subscription) {
        throw new NotFoundError('No subscription found');
      }

      if (!subscription.cancelAtPeriodEnd && subscription.status !== 'canceled') {
        throw new BadRequestError('Subscription is not canceled');
      }

      const [reactivatedSubscription] = await db
        .update(tenantSubscriptionPlans)
        .set({
          cancelAtPeriodEnd: false,
          canceledAt: null,
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(tenantSubscriptionPlans.id, subscription.id))
        .returning();

      const plan = await subscriptionPlansService.getPlanById(subscription.planId);

      // Log to history
      await this.logSubscriptionEvent({
        tenantId,
        planId: subscription.planId,
        eventType: 'renewed',
        eventCategory: 'subscription',
        eventSource: 'user_action',
        title: `Reactivated ${plan.displayName} subscription`,
        description: 'Subscription reactivated',
        oldStatus: 'canceled',
        newStatus: 'active',
      });

      logger.info(`Tenant reactivated subscription: ${plan.displayName}`, { tenantId });

      return reactivatedSubscription;
    } catch (error) {
      logger.error('Error reactivating subscription:', error);
      throw error;
    }
  }

  // ============================================
  // HISTORY LOGGING
  // ============================================

  /**
   * Log subscription event to history
   */
  private async logSubscriptionEvent(event: {
    tenantId: string;
    planId?: string;
    previousPlanId?: string;
    userId?: string;
    eventType: string;
    eventCategory: string;
    eventSource: string;
    title: string;
    description?: string;
    oldStatus?: string;
    newStatus?: string;
    oldPrice?: string;
    newPrice?: string;
    currency?: string;
    reason?: string;
    notes?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await db.insert(subscriptionHistory).values({
        ...event,
        planId: event.planId || null,
        previousPlanId: event.previousPlanId || null,
        userId: event.userId || null,
        description: event.description || null,
        oldStatus: event.oldStatus || null,
        newStatus: event.newStatus || null,
        oldPrice: event.oldPrice || null,
        newPrice: event.newPrice || null,
        currency: event.currency || null,
        reason: event.reason || null,
        notes: event.notes || null,
        metadata: event.metadata || null,
        eventTime: new Date(),
      });
    } catch (error) {
      logger.error('Error logging subscription event:', error);
      // Don't throw - logging failure shouldn't break the main operation
    }
  }

  /**
   * Get subscription history for tenant
   */
  async getSubscriptionHistory(tenantId: string, limit: number = 50): Promise<any[]> {
    try {
      const history = await db
        .select()
        .from(subscriptionHistory)
        .where(eq(subscriptionHistory.tenantId, tenantId))
        .orderBy(desc(subscriptionHistory.eventTime))
        .limit(limit);

      return history;
    } catch (error) {
      logger.error('Error getting subscription history:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const subscriptionManagementService = new SubscriptionManagementService();
