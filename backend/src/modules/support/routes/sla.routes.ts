/**
 * SLA Routes
 * API endpoints for SLA policy management
 */

import { Elysia, t } from 'elysia';
import { sessionGuard, requireRole } from '../../auth/middleware/session.middleware';
import { SLAService } from '../services';
import logger from '@/utils/logger';

export const slaRoutes = new Elysia({ prefix: '/api/v1/support/sla' })
  .use(sessionGuard)
  .use(requireRole(['ceo', 'admin', 'support_manager']))

  /**
   * POST /api/v1/support/sla/policies
   * Create SLA policy
   */
  .post(
    '/policies',
    async ({ body, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;

        const policy = await SLAService.createSLAPolicy(body, tenantId);

        logger.info('SLA policy created', { policyId: policy.id, tenantId });
        return { success: true, data: policy };
      } catch (error) {
        logger.error('Error creating SLA policy', { error });
        set.status = error instanceof Error && error.message.includes('already exists') ? 409 : 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 3, maxLength: 100 }),
        description: t.Optional(t.String()),
        priority: t.Union([t.Literal('low'), t.Literal('medium'), t.Literal('high'), t.Literal('urgent')]),
        firstResponseMinutes: t.Integer({ minimum: 1 }),
        resolutionMinutes: t.Integer({ minimum: 1 }),
        businessHoursOnly: t.Optional(t.Boolean()),
      }),
    }
  )

  /**
   * GET /api/v1/support/sla/policies
   * Get all SLA policies
   */
  .get('/policies', async ({ session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      const policies = await SLAService.getSLAPolicies(tenantId);

      return { success: true, data: policies };
    } catch (error) {
      logger.error('Error getting SLA policies', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * GET /api/v1/support/sla/policies/:id
   * Get SLA policy by ID
   */
  .get('/policies/:id', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      const policy = await SLAService.getSLAPolicyById(params.id, tenantId);

      if (!policy) {
        set.status = 404;
        return { success: false, error: 'SLA policy not found' };
      }

      return { success: true, data: policy };
    } catch (error) {
      logger.error('Error getting SLA policy', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * PATCH /api/v1/support/sla/policies/:id
   * Update SLA policy
   */
  .patch(
    '/policies/:id',
    async ({ params, body, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;

        const policy = await SLAService.updateSLAPolicy(params.id, body, tenantId);

        return { success: true, data: policy };
      } catch (error) {
        logger.error('Error updating SLA policy', { error });
        set.status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      body: t.Object({
        name: t.Optional(t.String({ minLength: 3, maxLength: 100 })),
        description: t.Optional(t.String()),
        firstResponseMinutes: t.Optional(t.Integer({ minimum: 1 })),
        resolutionMinutes: t.Optional(t.Integer({ minimum: 1 })),
        businessHoursOnly: t.Optional(t.Boolean()),
        isActive: t.Optional(t.Boolean()),
      }),
    }
  )

  /**
   * DELETE /api/v1/support/sla/policies/:id
   * Delete SLA policy
   */
  .delete('/policies/:id', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      await SLAService.deleteSLAPolicy(params.id, tenantId);

      return { success: true, message: 'SLA policy deleted successfully' };
    } catch (error) {
      logger.error('Error deleting SLA policy', { error });
      set.status = error instanceof Error && error.message.includes('in use') ? 409 : 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * GET /api/v1/support/sla/metrics
   * Get SLA metrics
   */
  .get('/metrics', async ({ query, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      const dateRange = query.from && query.to
        ? {
            from: new Date(query.from as string),
            to: new Date(query.to as string),
          }
        : undefined;

      const metrics = await SLAService.getSLAMetrics(tenantId, dateRange);

      return { success: true, data: metrics };
    } catch (error) {
      logger.error('Error getting SLA metrics', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
