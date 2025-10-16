/**
 * Subscriptions Admin Routes
 * Routes for administrators to manage plans, features, and analytics
 */

import { Elysia, t } from 'elysia';
import { sessionGuard, requireRole } from '../../auth/middleware/session.middleware';
import { subscriptionPlansService } from '../services';
import {
  createPlanSchema,
  updatePlanSchema,
  createFeatureSchema,
  updateFeatureSchema,
} from '../validators/subscription.validators';
import logger from '@/utils/logger';

export const adminSubscriptionRoutes = new Elysia({ prefix: '/subscriptions/admin' })
  .use(sessionGuard)
  .use(requireRole(['admin', 'ceo']))

  // ============================================
  // PLANS MANAGEMENT
  // ============================================

  // Create new plan
  .post('/plans', async ({ body, set }) => {
    try {
      // Validate input
      const validatedData = createPlanSchema.parse(body);

      // Create plan
      const plan = await subscriptionPlansService.createPlan(validatedData);

      logger.info('Admin created subscription plan', {
        planId: plan.id,
        planName: plan.name,
      });

      set.status = 201;
      return {
        success: true,
        message: 'Plan created successfully',
        data: plan,
      };
    } catch (error) {
      logger.error('Error creating plan:', error);

      if (error instanceof Error && error.message.includes('already exists')) {
        set.status = 409;
        return {
          success: false,
          error: 'Plan already exists',
          message: error.message,
        };
      }

      set.status = 500;
      return {
        success: false,
        error: 'Failed to create plan',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, {
    body: t.Object({
      name: t.String({ minLength: 1, maxLength: 100 }),
      displayName: t.String({ minLength: 1, maxLength: 100 }),
      description: t.Optional(t.String({ maxLength: 1000 })),
      slug: t.String({
        minLength: 1,
        maxLength: 50,
        pattern: '^[a-z0-9-]+$',
        description: 'URL-friendly slug (lowercase, alphanumeric, hyphens)',
      }),
      price: t.String({
        pattern: '^\\d+(\\.\\d{2})?$',
        description: 'Price as decimal string (e.g., "29.00")',
      }),
      currency: t.Optional(t.String({ length: 3, default: 'BRL' })),
      billingPeriod: t.Optional(t.Union([t.Literal('monthly'), t.Literal('yearly')], { default: 'monthly' })),
      stripeProductId: t.Optional(t.String()),
      stripePriceId: t.Optional(t.String()),
      limits: t.Object({
        maxBots: t.Number({ minimum: 0 }),
        maxStrategies: t.Number({ minimum: 0 }),
        maxBacktests: t.Number({ minimum: 0 }),
        maxExchanges: t.Number({ minimum: 0 }),
        maxApiCalls: t.Number({ minimum: 0 }),
        maxWebhooks: t.Number({ minimum: 0 }),
        maxAlerts: t.Number({ minimum: 0 }),
        maxOrders: t.Number({ minimum: 0 }),
        storageGB: t.Number({ minimum: 0 }),
        historicalDataMonths: t.Number({ minimum: 0 }),
        aiModelAccess: t.Boolean(),
        prioritySupport: t.Boolean(),
        customDomain: t.Boolean(),
        whiteLabel: t.Boolean(),
        apiAccess: t.Boolean(),
        webhookAccess: t.Boolean(),
      }),
      features: t.Array(t.String()),
      isActive: t.Optional(t.Boolean({ default: true })),
      isPublic: t.Optional(t.Boolean({ default: true })),
      isFeatured: t.Optional(t.Boolean({ default: false })),
      sortOrder: t.Optional(t.Number({ minimum: 0, default: 0 })),
      trialDays: t.Optional(t.Number({ minimum: 0, maximum: 90, default: 0 })),
      trialPrice: t.Optional(t.String({ pattern: '^\\d+(\\.\\d{2})?$', default: '0.00' })),
      metadata: t.Optional(t.Record(t.String(), t.Any())),
    }),
    detail: {
      tags: ['Subscriptions - Admin'],
      summary: 'Create plan',
      description: 'Create a new subscription plan (admin only)',
    },
  })

  // Update plan
  .put('/plans/:id', async ({ params, body, set }) => {
    try {
      // Validate input
      const validatedData = updatePlanSchema.parse(body);

      // Update plan
      const plan = await subscriptionPlansService.updatePlan(params.id, validatedData);

      logger.info('Admin updated subscription plan', {
        planId: plan.id,
        planName: plan.name,
      });

      return {
        success: true,
        message: 'Plan updated successfully',
        data: plan,
      };
    } catch (error) {
      logger.error('Error updating plan:', error);

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
        error: 'Failed to update plan',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, {
    params: t.Object({
      id: t.String({ description: 'Plan ID' }),
    }),
    body: t.Object({
      name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
      displayName: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
      description: t.Optional(t.String({ maxLength: 1000 })),
      price: t.Optional(t.String({ pattern: '^\\d+(\\.\\d{2})?$' })),
      currency: t.Optional(t.String({ length: 3 })),
      billingPeriod: t.Optional(t.Union([t.Literal('monthly'), t.Literal('yearly')])),
      stripeProductId: t.Optional(t.String()),
      stripePriceId: t.Optional(t.String()),
      limits: t.Optional(t.Object({
        maxBots: t.Optional(t.Number({ minimum: 0 })),
        maxStrategies: t.Optional(t.Number({ minimum: 0 })),
        maxBacktests: t.Optional(t.Number({ minimum: 0 })),
        maxExchanges: t.Optional(t.Number({ minimum: 0 })),
        maxApiCalls: t.Optional(t.Number({ minimum: 0 })),
        maxWebhooks: t.Optional(t.Number({ minimum: 0 })),
        maxAlerts: t.Optional(t.Number({ minimum: 0 })),
        maxOrders: t.Optional(t.Number({ minimum: 0 })),
        storageGB: t.Optional(t.Number({ minimum: 0 })),
        historicalDataMonths: t.Optional(t.Number({ minimum: 0 })),
        aiModelAccess: t.Optional(t.Boolean()),
        prioritySupport: t.Optional(t.Boolean()),
        customDomain: t.Optional(t.Boolean()),
        whiteLabel: t.Optional(t.Boolean()),
        apiAccess: t.Optional(t.Boolean()),
        webhookAccess: t.Optional(t.Boolean()),
      })),
      features: t.Optional(t.Array(t.String())),
      isActive: t.Optional(t.Boolean()),
      isPublic: t.Optional(t.Boolean()),
      isFeatured: t.Optional(t.Boolean()),
      sortOrder: t.Optional(t.Number({ minimum: 0 })),
      trialDays: t.Optional(t.Number({ minimum: 0, maximum: 90 })),
      trialPrice: t.Optional(t.String({ pattern: '^\\d+(\\.\\d{2})?$' })),
      metadata: t.Optional(t.Record(t.String(), t.Any())),
    }),
    detail: {
      tags: ['Subscriptions - Admin'],
      summary: 'Update plan',
      description: 'Update an existing subscription plan (admin only)',
    },
  })

  // Delete plan
  .delete('/plans/:id', async ({ params, set }) => {
    try {
      await subscriptionPlansService.deletePlan(params.id);

      logger.info('Admin deleted subscription plan', {
        planId: params.id,
      });

      return {
        success: true,
        message: 'Plan deleted successfully',
      };
    } catch (error) {
      logger.error('Error deleting plan:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        set.status = 404;
        return {
          success: false,
          error: 'Plan not found',
          message: error.message,
        };
      }

      if (error instanceof Error && error.message.includes('has active subscriptions')) {
        set.status = 400;
        return {
          success: false,
          error: 'Cannot delete plan',
          message: error.message,
        };
      }

      set.status = 500;
      return {
        success: false,
        error: 'Failed to delete plan',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, {
    params: t.Object({
      id: t.String({ description: 'Plan ID' }),
    }),
    detail: {
      tags: ['Subscriptions - Admin'],
      summary: 'Delete plan',
      description: 'Delete a subscription plan (admin only, only if no active subscriptions)',
    },
  })

  // ============================================
  // FEATURES MANAGEMENT
  // ============================================

  // Create feature
  .post('/features', async ({ body, set }) => {
    try {
      // Validate input
      const validatedData = createFeatureSchema.parse(body);

      // Create feature
      const feature = await subscriptionPlansService.createFeature(validatedData);

      logger.info('Admin created feature', {
        featureId: feature.id,
        featureName: feature.name,
      });

      set.status = 201;
      return {
        success: true,
        message: 'Feature created successfully',
        data: feature,
      };
    } catch (error) {
      logger.error('Error creating feature:', error);

      if (error instanceof Error && error.message.includes('already exists')) {
        set.status = 409;
        return {
          success: false,
          error: 'Feature already exists',
          message: error.message,
        };
      }

      set.status = 500;
      return {
        success: false,
        error: 'Failed to create feature',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, {
    body: t.Object({
      name: t.String({ minLength: 1, maxLength: 100 }),
      displayName: t.String({ minLength: 1, maxLength: 100 }),
      description: t.Optional(t.String({ maxLength: 1000 })),
      slug: t.String({
        minLength: 1,
        maxLength: 50,
        pattern: '^[a-z0-9_]+$',
        description: 'Slug (lowercase, alphanumeric, underscores)',
      }),
      category: t.String({ minLength: 1, maxLength: 50 }),
      isCore: t.Optional(t.Boolean({ default: false })),
      isPremium: t.Optional(t.Boolean({ default: false })),
      isEnterprise: t.Optional(t.Boolean({ default: false })),
      icon: t.Optional(t.String({ maxLength: 50 })),
      sortOrder: t.Optional(t.Number({ minimum: 0, default: 0 })),
    }),
    detail: {
      tags: ['Subscriptions - Admin'],
      summary: 'Create feature',
      description: 'Create a new feature (admin only)',
    },
  })

  // Update feature
  .put('/features/:id', async ({ params, body, set }) => {
    try {
      // Validate input
      const validatedData = updateFeatureSchema.parse(body);

      // Update feature
      const feature = await subscriptionPlansService.updateFeature(params.id, validatedData);

      logger.info('Admin updated feature', {
        featureId: feature.id,
        featureName: feature.name,
      });

      return {
        success: true,
        message: 'Feature updated successfully',
        data: feature,
      };
    } catch (error) {
      logger.error('Error updating feature:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        set.status = 404;
        return {
          success: false,
          error: 'Feature not found',
          message: error.message,
        };
      }

      set.status = 500;
      return {
        success: false,
        error: 'Failed to update feature',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, {
    params: t.Object({
      id: t.String({ description: 'Feature ID' }),
    }),
    body: t.Object({
      name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
      displayName: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
      description: t.Optional(t.String({ maxLength: 1000 })),
      category: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
      isCore: t.Optional(t.Boolean()),
      isPremium: t.Optional(t.Boolean()),
      isEnterprise: t.Optional(t.Boolean()),
      icon: t.Optional(t.String({ maxLength: 50 })),
      sortOrder: t.Optional(t.Number({ minimum: 0 })),
    }),
    detail: {
      tags: ['Subscriptions - Admin'],
      summary: 'Update feature',
      description: 'Update an existing feature (admin only)',
    },
  })

  // Delete feature
  .delete('/features/:id', async ({ params, set }) => {
    try {
      await subscriptionPlansService.deleteFeature(params.id);

      logger.info('Admin deleted feature', {
        featureId: params.id,
      });

      return {
        success: true,
        message: 'Feature deleted successfully',
      };
    } catch (error) {
      logger.error('Error deleting feature:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        set.status = 404;
        return {
          success: false,
          error: 'Feature not found',
          message: error.message,
        };
      }

      set.status = 500;
      return {
        success: false,
        error: 'Failed to delete feature',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, {
    params: t.Object({
      id: t.String({ description: 'Feature ID' }),
    }),
    detail: {
      tags: ['Subscriptions - Admin'],
      summary: 'Delete feature',
      description: 'Delete a feature (admin only)',
    },
  })

  // ============================================
  // ANALYTICS
  // ============================================

  // Get subscription analytics
  .get('/analytics', async ({ set }) => {
    try {
      const analytics = await subscriptionPlansService.getSubscriptionAnalytics();

      return {
        success: true,
        data: analytics,
      };
    } catch (error) {
      logger.error('Error getting subscription analytics:', error);

      set.status = 500;
      return {
        success: false,
        error: 'Failed to fetch analytics',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, {
    detail: {
      tags: ['Subscriptions - Admin'],
      summary: 'Get subscription analytics',
      description: 'Returns subscription analytics (MRR, ARR, churn, active subscriptions, etc.)',
    },
  });
