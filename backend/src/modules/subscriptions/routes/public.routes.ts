/**
 * Subscriptions Public Routes
 * Routes accessible without authentication (plans, features)
 */

import { Elysia, t } from 'elysia';
import { subscriptionPlansService } from '../services';
import { plansQuerySchema, featuresQuerySchema } from '../validators/subscription.validators';
import logger from '@/utils/logger';

export const publicSubscriptionRoutes = new Elysia({ prefix: '/subscriptions' })
  .get('/plans', async ({ query, set }) => {
    try {
      // Validate query params
      const validatedQuery = plansQuerySchema.parse(query);

      // Get plans with filters
      const plans = await subscriptionPlansService.getAllPlans({
        search: validatedQuery.search,
        isActive: validatedQuery.isActive,
        sortBy: validatedQuery.sortBy as any,
        sortOrder: validatedQuery.sortOrder,
      });

      return {
        success: true,
        data: plans,
        meta: {
          total: plans.length,
          page: validatedQuery.page,
          pageSize: validatedQuery.pageSize,
        },
      };
    } catch (error) {
      logger.error('Error getting plans:', error);
      set.status = 500;
      return {
        success: false,
        error: 'Failed to fetch plans',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, {
    detail: {
      tags: ['Subscriptions - Public'],
      summary: 'Get all subscription plans',
      description: 'Returns all available subscription plans with optional filtering',
    },
  })

  .get('/plans/public', async ({ set }) => {
    try {
      const plans = await subscriptionPlansService.getPublicPlans();

      return {
        success: true,
        data: plans,
        meta: {
          total: plans.length,
        },
      };
    } catch (error) {
      logger.error('Error getting public plans:', error);
      set.status = 500;
      return {
        success: false,
        error: 'Failed to fetch public plans',
      };
    }
  }, {
    detail: {
      tags: ['Subscriptions - Public'],
      summary: 'Get public subscription plans',
      description: 'Returns only active and public subscription plans visible on pricing page',
    },
  })

  .get('/plans/featured', async ({ set }) => {
    try {
      const plan = await subscriptionPlansService.getFeaturedPlan();

      if (!plan) {
        set.status = 404;
        return {
          success: false,
          error: 'No featured plan found',
        };
      }

      return {
        success: true,
        data: plan,
      };
    } catch (error) {
      logger.error('Error getting featured plan:', error);
      set.status = 500;
      return {
        success: false,
        error: 'Failed to fetch featured plan',
      };
    }
  }, {
    detail: {
      tags: ['Subscriptions - Public'],
      summary: 'Get featured subscription plan',
      description: 'Returns the featured/recommended subscription plan',
    },
  })

  .get('/plans/:slug', async ({ params, set }) => {
    try {
      const plan = await subscriptionPlansService.getPlanBySlug(params.slug);

      return {
        success: true,
        data: plan,
      };
    } catch (error) {
      logger.error('Error getting plan by slug:', error);
      set.status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      return {
        success: false,
        error: 'Failed to fetch plan',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, {
    params: t.Object({
      slug: t.String(),
    }),
    detail: {
      tags: ['Subscriptions - Public'],
      summary: 'Get plan by slug',
      description: 'Returns a specific plan by its slug (e.g., "free", "pro", "enterprise")',
    },
  })

  .get('/plans/:slug/features', async ({ params, set }) => {
    try {
      // First get the plan by slug to get its ID
      const plan = await subscriptionPlansService.getPlanBySlug(params.slug);

      // Then get features using the plan ID
      const features = await subscriptionPlansService.getPlanFeaturesWithDetails(plan.id);

      return {
        success: true,
        data: features,
        meta: {
          total: features.length,
          planId: plan.id,
          planSlug: plan.slug,
        },
      };
    } catch (error) {
      logger.error('Error getting plan features:', error);
      set.status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      return {
        success: false,
        error: 'Failed to fetch plan features',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, {
    params: t.Object({
      slug: t.String(),
    }),
    detail: {
      tags: ['Subscriptions - Public'],
      summary: 'Get features for a plan',
      description: 'Returns all features included in a specific plan (by slug) with full details',
    },
  })

  .get('/plans/compare/:slug1/:slug2', async ({ params, set }) => {
    try {
      // Get both plans by slug to get their IDs
      const plan1 = await subscriptionPlansService.getPlanBySlug(params.slug1);
      const plan2 = await subscriptionPlansService.getPlanBySlug(params.slug2);

      // Compare using plan IDs
      const comparison = await subscriptionPlansService.comparePlans(
        plan1.id,
        plan2.id
      );

      return {
        success: true,
        data: comparison,
      };
    } catch (error) {
      logger.error('Error comparing plans:', error);
      set.status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      return {
        success: false,
        error: 'Failed to compare plans',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, {
    params: t.Object({
      slug1: t.String(),
      slug2: t.String(),
    }),
    detail: {
      tags: ['Subscriptions - Public'],
      summary: 'Compare two plans',
      description: 'Returns a detailed comparison between two subscription plans (by slug) including price difference and feature differences. Example: /plans/compare/free/pro',
    },
  })

  .get('/features', async ({ query, set }) => {
    try {
      const validatedQuery = featuresQuerySchema.parse(query);

      const features = await subscriptionPlansService.getAllFeatures(validatedQuery.category);

      return {
        success: true,
        data: features,
        meta: {
          total: features.length,
          category: validatedQuery.category,
        },
      };
    } catch (error) {
      logger.error('Error getting features:', error);
      set.status = 500;
      return {
        success: false,
        error: 'Failed to fetch features',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, {
    detail: {
      tags: ['Subscriptions - Public'],
      summary: 'Get all features',
      description: 'Returns all available features, optionally filtered by category',
    },
  })

  .get('/features/:slug', async ({ params, set }) => {
    try {
      const feature = await subscriptionPlansService.getFeatureBySlug(params.slug);

      return {
        success: true,
        data: feature,
      };
    } catch (error) {
      logger.error('Error getting feature by slug:', error);
      set.status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      return {
        success: false,
        error: 'Failed to fetch feature',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, {
    params: t.Object({
      slug: t.String(),
    }),
    detail: {
      tags: ['Subscriptions - Public'],
      summary: 'Get feature by slug',
      description: 'Returns a specific feature by its slug',
    },
  });
