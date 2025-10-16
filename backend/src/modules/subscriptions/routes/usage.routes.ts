/**
 * Subscriptions Usage Routes
 * Routes for tracking usage and managing quotas
 */

import { Elysia, t } from 'elysia';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import { usageTrackingService, quotaService } from '../services';
import {
  recordUsageEventSchema,
  checkQuotaSchema,
  usageSummaryQuerySchema,
  usageEventsQuerySchema,
} from '../validators/subscription.validators';
import logger from '@/utils/logger';

export const usageSubscriptionRoutes = new Elysia({ prefix: '/subscriptions/usage' })
  .use(sessionGuard)
  .use(requireTenant)

  // Track usage event
  .post('/track-event', async ({ tenantId, body, set }) => {
    try {
      // Validate input
      const validatedData = recordUsageEventSchema.parse(body);

      // Record usage event
      await usageTrackingService.recordUsageEvent({
        tenantId,
        ...validatedData,
      });

      logger.info('Usage event recorded', {
        tenantId,
        eventType: validatedData.eventType,
        quantity: validatedData.quantity,
      });

      set.status = 201;
      return {
        success: true,
        message: 'Usage event recorded successfully',
      };
    } catch (error) {
      logger.error('Error tracking usage event:', error);

      if (error instanceof Error && error.message.includes('quota exceeded')) {
        set.status = 429;
        return {
          success: false,
          error: 'Quota exceeded',
          message: error.message,
        };
      }

      set.status = 500;
      return {
        success: false,
        error: 'Failed to track event',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, {
    body: t.Object({
      eventType: t.String({
        description: 'Type of event (e.g., "bot_created", "api_call", "strategy_activated")',
        minLength: 1,
        maxLength: 50,
      }),
      eventCategory: t.Union([t.Literal('trading'), t.Literal('api'), t.Literal('storage'), t.Literal('feature')], {
        description: 'Category of the event',
      }),
      resourceType: t.String({
        description: 'Type of resource being used (e.g., "bot", "strategy", "api")',
        minLength: 1,
        maxLength: 50,
      }),
      resourceId: t.Optional(t.String({
        description: 'ID of the resource (if applicable)',
        maxLength: 255,
      })),
      quantity: t.Optional(t.Number({
        description: 'Quantity of resource used (default: 1)',
        minimum: 1,
        default: 1,
      })),
      unitType: t.String({
        description: 'Unit type (e.g., "count", "mb", "calls")',
        minLength: 1,
        maxLength: 50,
      }),
      metadata: t.Optional(t.Record(t.String(), t.Any(), {
        description: 'Additional metadata',
      })),
    }),
    detail: {
      tags: ['Subscriptions - Usage'],
      summary: 'Track usage event',
      description: 'Record a usage event for the tenant (bot creation, API call, etc.)',
    },
  })

  // Get usage summary for current month
  .get('/', async ({ tenantId, query, set }) => {
    try {
      // Validate query params
      const validatedQuery = usageSummaryQuerySchema.parse(query);

      // Get usage summary
      const summary = await usageTrackingService.getUsageSummary(
        tenantId,
        validatedQuery.month
      );

      return {
        success: true,
        data: summary,
      };
    } catch (error) {
      logger.error('Error getting usage summary:', error);

      set.status = 500;
      return {
        success: false,
        error: 'Failed to fetch usage summary',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, {
    query: t.Object({
      month: t.Optional(t.String({
        description: 'Month in YYYY-MM format (default: current month)',
        pattern: '^\\d{4}-\\d{2}$',
      })),
    }),
    detail: {
      tags: ['Subscriptions - Usage'],
      summary: 'Get usage summary',
      description: 'Returns usage summary for the specified month (default: current month)',
    },
  })

  // Get detailed usage summary with filters
  .get('/summary', async ({ tenantId, query, set }) => {
    try {
      // Validate query params
      const validatedQuery = usageSummaryQuerySchema.parse(query);

      // Get detailed summary
      const summary = await usageTrackingService.getDetailedUsageSummary(
        tenantId,
        validatedQuery.month
      );

      return {
        success: true,
        data: summary,
      };
    } catch (error) {
      logger.error('Error getting detailed usage summary:', error);

      set.status = 500;
      return {
        success: false,
        error: 'Failed to fetch detailed usage',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, {
    query: t.Object({
      month: t.Optional(t.String({
        description: 'Month in YYYY-MM format (default: current month)',
        pattern: '^\\d{4}-\\d{2}$',
      })),
    }),
    detail: {
      tags: ['Subscriptions - Usage'],
      summary: 'Get detailed usage summary',
      description: 'Returns detailed usage summary with breakdown by category and resource type',
    },
  })

  // Get usage events history
  .get('/events', async ({ tenantId, query, set }) => {
    try {
      // Validate query params
      const validatedQuery = usageEventsQuerySchema.parse(query);

      // Get events
      const events = await usageTrackingService.getUsageEvents(tenantId, {
        startDate: validatedQuery.startDate ? new Date(validatedQuery.startDate) : undefined,
        endDate: validatedQuery.endDate ? new Date(validatedQuery.endDate) : undefined,
        eventType: validatedQuery.eventType,
        eventCategory: validatedQuery.eventCategory,
        limit: validatedQuery.limit,
      });

      return {
        success: true,
        data: events,
        meta: {
          total: events.length,
          limit: validatedQuery.limit,
        },
      };
    } catch (error) {
      logger.error('Error getting usage events:', error);

      set.status = 500;
      return {
        success: false,
        error: 'Failed to fetch usage events',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, {
    query: t.Object({
      startDate: t.Optional(t.String({
        description: 'Start date in ISO 8601 format',
      })),
      endDate: t.Optional(t.String({
        description: 'End date in ISO 8601 format',
      })),
      eventType: t.Optional(t.String({
        description: 'Filter by event type',
      })),
      eventCategory: t.Optional(t.Union([t.Literal('trading'), t.Literal('api'), t.Literal('storage'), t.Literal('feature')], {
        description: 'Filter by event category',
      })),
      limit: t.Optional(t.Number({
        description: 'Maximum number of events to return (1-500, default: 100)',
        minimum: 1,
        maximum: 500,
        default: 100,
      })),
    }),
    detail: {
      tags: ['Subscriptions - Usage'],
      summary: 'Get usage events',
      description: 'Returns usage events history with optional filtering',
    },
  })

  // Get all quotas for tenant
  .get('/quotas', async ({ tenantId, set }) => {
    try {
      const quotas = await quotaService.getTenantQuotas(tenantId);

      return {
        success: true,
        data: quotas,
        meta: {
          total: quotas.length,
        },
      };
    } catch (error) {
      logger.error('Error getting quotas:', error);

      set.status = 500;
      return {
        success: false,
        error: 'Failed to fetch quotas',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, {
    detail: {
      tags: ['Subscriptions - Usage'],
      summary: 'Get all quotas',
      description: 'Returns all quotas for the tenant with current usage and limits',
    },
  })

  // Check specific quota
  .post('/quotas/check', async ({ tenantId, body, set }) => {
    try {
      // Validate input
      const validatedData = checkQuotaSchema.parse(body);

      // Check quota
      const quotaStatus = await quotaService.checkQuota({
        tenantId,
        ...validatedData,
      });

      return {
        success: true,
        data: quotaStatus,
      };
    } catch (error) {
      logger.error('Error checking quota:', error);

      if (error instanceof Error && error.message.includes('not found')) {
        set.status = 404;
        return {
          success: false,
          error: 'Quota not found',
          message: error.message,
        };
      }

      set.status = 500;
      return {
        success: false,
        error: 'Failed to check quota',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, {
    body: t.Object({
      quotaType: t.String({
        description: 'Type of quota to check (e.g., "max_bots", "max_api_calls")',
        minLength: 1,
        maxLength: 50,
      }),
      requiredAmount: t.Optional(t.Number({
        description: 'Amount required for the action (default: 1)',
        minimum: 1,
        default: 1,
      })),
    }),
    detail: {
      tags: ['Subscriptions - Usage'],
      summary: 'Check quota',
      description: 'Check if tenant has sufficient quota for an action',
    },
  })

  // Get specific quota status
  .get('/quotas/:quotaType', async ({ tenantId, params, set }) => {
    try {
      const quotaStatus = await quotaService.getQuotaStatus(tenantId, params.quotaType);

      if (!quotaStatus) {
        set.status = 404;
        return {
          success: false,
          error: 'Quota not found',
          message: `No quota found for type: ${params.quotaType}`,
        };
      }

      return {
        success: true,
        data: quotaStatus,
      };
    } catch (error) {
      logger.error('Error getting quota status:', error);

      set.status = 500;
      return {
        success: false,
        error: 'Failed to fetch quota status',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, {
    params: t.Object({
      quotaType: t.String({
        description: 'Type of quota (e.g., "max_bots", "max_api_calls")',
      }),
    }),
    detail: {
      tags: ['Subscriptions - Usage'],
      summary: 'Get quota status',
      description: 'Returns the status of a specific quota type',
    },
  });
