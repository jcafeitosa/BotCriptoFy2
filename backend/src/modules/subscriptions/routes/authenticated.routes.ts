/**
 * Subscriptions Authenticated Routes
 * Routes for authenticated users to manage their subscriptions
 */

import { Elysia, t } from 'elysia';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import { subscriptionManagementService } from '../services';
import {
  subscribeToPlanSchema,
  changePlanSchema,
  cancelSubscriptionSchema
} from '../validators/subscription.validators';
import logger from '@/utils/logger';

export const authenticatedSubscriptionRoutes = new Elysia({ prefix: '/subscriptions' })
  .use(sessionGuard)
  .use(requireTenant)

  // Get current subscription status
  .get('/my-subscription', async ({ tenantId, set }) => {
    try {
      const subscription = await subscriptionManagementService.getSubscriptionStatus(tenantId);

      return {
        success: true,
        data: subscription,
      };
    } catch (error) {
      logger.error('Error getting subscription status:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        set.status = 404;
        return {
          success: false,
          error: 'No active subscription found',
          message: 'This tenant does not have an active subscription',
        };
      }

      set.status = 500;
      return {
        success: false,
        error: 'Failed to fetch subscription',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, {
    detail: {
      tags: ['Subscriptions - Authenticated'],
      summary: 'Get my subscription',
      description: 'Returns the current subscription status for the authenticated tenant',
    },
  })

  // Subscribe to a plan
  .post('/subscribe', async ({ tenantId, body, set }) => {
    try {
      // Validate input
      const validatedData = subscribeToPlanSchema.parse(body);

      // Check if already subscribed
      try {
        const currentSubscription = await subscriptionManagementService.getSubscriptionStatus(tenantId);

        if (currentSubscription && (currentSubscription.status === 'active' || currentSubscription.status === 'trialing')) {
          set.status = 400;
          return {
            success: false,
            error: 'Already subscribed',
            message: 'You already have an active subscription. Use /change-plan to upgrade or downgrade.',
            data: {
              currentPlan: currentSubscription.plan?.name || 'Unknown',
              status: currentSubscription.status,
            },
          };
        }
      } catch {
        // No subscription found, continue with subscribe
      }

      // Subscribe to plan
      const subscription = await subscriptionManagementService.subscribeToPlan({
        tenantId,
        planId: validatedData.planId,
        trialPeriodDays: validatedData.trialPeriodDays,
        metadata: validatedData.metadata,
      });

      logger.info('Tenant subscribed to plan', {
        tenantId,
        planId: validatedData.planId,
        subscriptionId: subscription.id,
      });

      set.status = 201;
      return {
        success: true,
        message: 'Successfully subscribed to plan',
        data: subscription,
      };
    } catch (error) {
      logger.error('Error subscribing to plan:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        set.status = 404;
        return {
          success: false,
          error: 'Plan not found',
          message: error.message,
        };
      }

      set.status = 500;
      return {
        success: false,
        error: 'Failed to subscribe',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, {
    body: t.Object({
      planId: t.String({ description: 'ID of the plan to subscribe to' }),
      trialPeriodDays: t.Optional(t.Number({
        description: 'Trial period in days (0-90)',
        minimum: 0,
        maximum: 90
      })),
      metadata: t.Optional(t.Record(t.String(), t.Any(), {
        description: 'Additional metadata'
      })),
    }),
    detail: {
      tags: ['Subscriptions - Authenticated'],
      summary: 'Subscribe to plan',
      description: 'Subscribe the tenant to a subscription plan',
    },
  })

  // Change plan (upgrade/downgrade)
  .post('/change-plan', async ({ tenantId, body, set }) => {
    try {
      // Validate input
      const validatedData = changePlanSchema.parse(body);

      // Check if has active subscription
      try {
        await subscriptionManagementService.getSubscriptionStatus(tenantId);
      } catch {
        set.status = 400;
        return {
          success: false,
          error: 'No subscription found',
          message: 'You must have an active subscription before changing plans. Use /subscribe instead.',
        };
      }

      // Change plan
      const result = await subscriptionManagementService.changePlan(tenantId, {
        newPlanId: validatedData.newPlanId,
        reason: validatedData.reason,
        effectiveDate: validatedData.effectiveDate,
      });

      logger.info('Tenant changed plan', {
        tenantId,
        newPlanId: validatedData.newPlanId,
        effectiveDate: validatedData.effectiveDate,
      });

      return {
        success: true,
        message: validatedData.effectiveDate === 'immediate'
          ? 'Plan changed successfully'
          : 'Plan change scheduled for end of billing period',
        data: result,
      };
    } catch (error) {
      logger.error('Error changing plan:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        set.status = 404;
        return {
          success: false,
          error: 'Plan not found',
          message: error.message,
        };
      }

      if (error instanceof Error && error.message.includes('same plan')) {
        set.status = 400;
        return {
          success: false,
          error: 'Invalid plan change',
          message: error.message,
        };
      }

      set.status = 500;
      return {
        success: false,
        error: 'Failed to change plan',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, {
    body: t.Object({
      newPlanId: t.String({ description: 'ID of the new plan' }),
      reason: t.Optional(t.String({
        description: 'Reason for plan change (max 500 chars)',
        maxLength: 500,
      })),
      effectiveDate: t.Optional(t.Union([t.Literal('immediate'), t.Literal('end_of_period')], {
        description: 'When the plan change should take effect',
        default: 'immediate',
      })),
    }),
    detail: {
      tags: ['Subscriptions - Authenticated'],
      summary: 'Change plan',
      description: 'Upgrade or downgrade the subscription plan',
    },
  })

  // Cancel subscription
  .post('/cancel', async ({ tenantId, body, set }) => {
    try {
      // Validate input
      const validatedData = cancelSubscriptionSchema.parse(body);

      // Check if has active subscription
      try {
        const current = await subscriptionManagementService.getSubscriptionStatus(tenantId);

        if (current && current.status === 'canceled') {
          set.status = 400;
          return {
            success: false,
            error: 'Already canceled',
            message: 'Your subscription is already canceled',
          };
        }
      } catch {
        set.status = 404;
        return {
          success: false,
          error: 'No subscription found',
          message: 'You do not have an active subscription',
        };
      }

      // Cancel subscription
      const result = await subscriptionManagementService.cancelSubscription(tenantId, {
        reason: validatedData.reason,
        cancelAtPeriodEnd: validatedData.cancelAtPeriodEnd,
        feedback: validatedData.feedback,
      });

      logger.info('Tenant canceled subscription', {
        tenantId,
        cancelAtPeriodEnd: validatedData.cancelAtPeriodEnd,
        reason: validatedData.reason,
      });

      return {
        success: true,
        message: validatedData.cancelAtPeriodEnd
          ? 'Subscription will be canceled at the end of the billing period'
          : 'Subscription canceled immediately',
        data: result,
      };
    } catch (error) {
      logger.error('Error canceling subscription:', error);

      set.status = 500;
      return {
        success: false,
        error: 'Failed to cancel subscription',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, {
    body: t.Object({
      reason: t.Optional(t.String({
        description: 'Reason for cancellation (max 500 chars)',
        maxLength: 500,
      })),
      cancelAtPeriodEnd: t.Optional(t.Boolean({
        description: 'Whether to cancel immediately or at end of period',
        default: true,
      })),
      feedback: t.Optional(t.String({
        description: 'Feedback about the service (max 1000 chars)',
        maxLength: 1000,
      })),
    }),
    detail: {
      tags: ['Subscriptions - Authenticated'],
      summary: 'Cancel subscription',
      description: 'Cancel the current subscription',
    },
  })

  // Reactivate canceled subscription
  .post('/reactivate', async ({ tenantId, set }) => {
    try {
      // Check if subscription is canceled
      const current = await subscriptionManagementService.getSubscriptionStatus(tenantId);

      if (!current) {
        set.status = 404;
        return {
          success: false,
          error: 'Subscription not found',
          message: 'No subscription found for this tenant',
        };
      }

      if (current.status !== 'canceled') {
        set.status = 400;
        return {
          success: false,
          error: 'Subscription not canceled',
          message: 'Your subscription is not canceled. Current status: ' + current.status,
        };
      }

      if (!current.cancelAtPeriodEnd) {
        set.status = 400;
        return {
          success: false,
          error: 'Cannot reactivate',
          message: 'This subscription was canceled immediately and cannot be reactivated. Please subscribe to a new plan.',
        };
      }

      // Reactivate by removing cancel flag
      const reactivated = await subscriptionManagementService.reactivateSubscription(tenantId);

      logger.info('Tenant reactivated subscription', {
        tenantId,
        subscriptionId: reactivated.id,
      });

      return {
        success: true,
        message: 'Subscription reactivated successfully',
        data: reactivated,
      };
    } catch (error) {
      logger.error('Error reactivating subscription:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        set.status = 404;
        return {
          success: false,
          error: 'Subscription not found',
          message: error.message,
        };
      }

      set.status = 500;
      return {
        success: false,
        error: 'Failed to reactivate subscription',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, {
    detail: {
      tags: ['Subscriptions - Authenticated'],
      summary: 'Reactivate subscription',
      description: 'Reactivate a subscription that was scheduled for cancellation at period end',
    },
  })

  // Get subscription history
  .get('/history', async ({ tenantId, set }) => {
    try {
      const history = await subscriptionManagementService.getSubscriptionHistory(tenantId);

      return {
        success: true,
        data: history,
        meta: {
          total: history.length,
        },
      };
    } catch (error) {
      logger.error('Error getting subscription history:', error);

      set.status = 500;
      return {
        success: false,
        error: 'Failed to fetch subscription history',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, {
    detail: {
      tags: ['Subscriptions - Authenticated'],
      summary: 'Get subscription history',
      description: 'Returns the history of all subscription changes for the tenant',
    },
  });
