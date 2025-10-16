/**
 * Automations Routes
 * API endpoints for ticket automations
 */

import { Elysia, t } from 'elysia';
import { sessionGuard, requireRole } from '../../auth/middleware/session.middleware';
import { AutomationsService } from '../services';
import logger from '@/utils/logger';

export const automationsRoutes = new Elysia({ prefix: '/api/v1/support/automations' })
  .use(sessionGuard)
  .use(requireRole(['ceo', 'admin', 'support_manager']))

  /**
   * POST /api/v1/support/automations
   * Create automation
   */
  .post(
    '/',
    async ({ body, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;

        const automation = await AutomationsService.createAutomation(body, tenantId);

        logger.info('Automation created', { automationId: automation.id, tenantId });
        return { success: true, data: automation };
      } catch (error) {
        logger.error('Error creating automation', { error });
        set.status = 500;
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
        trigger: t.Union([
          t.Literal('on_create'),
          t.Literal('on_update'),
          t.Literal('on_status_change'),
          t.Literal('on_sla_breach'),
        ]),
        conditions: t.Any(),
        actions: t.Any(),
      }),
    }
  )

  /**
   * GET /api/v1/support/automations
   * Get all automations
   */
  .get('/', async ({ session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      const automations = await AutomationsService.getAutomations(tenantId);

      return { success: true, data: automations };
    } catch (error) {
      logger.error('Error getting automations', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * GET /api/v1/support/automations/:id
   * Get automation by ID
   */
  .get('/:id', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      const automation = await AutomationsService.getAutomationById(params.id, tenantId);

      if (!automation) {
        set.status = 404;
        return { success: false, error: 'Automation not found' };
      }

      return { success: true, data: automation };
    } catch (error) {
      logger.error('Error getting automation', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * PATCH /api/v1/support/automations/:id
   * Update automation
   */
  .patch(
    '/:id',
    async ({ params, body, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;

        const automation = await AutomationsService.updateAutomation(params.id, body, tenantId);

        return { success: true, data: automation };
      } catch (error) {
        logger.error('Error updating automation', { error });
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
        conditions: t.Optional(t.Any()),
        actions: t.Optional(t.Any()),
        isActive: t.Optional(t.Boolean()),
      }),
    }
  )

  /**
   * DELETE /api/v1/support/automations/:id
   * Delete automation
   */
  .delete('/:id', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      await AutomationsService.deleteAutomation(params.id, tenantId);

      return { success: true, message: 'Automation deleted successfully' };
    } catch (error) {
      logger.error('Error deleting automation', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * POST /api/v1/support/automations/:id/test
   * Test automation
   */
  .post(
    '/:id/test',
    async ({ params, body, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;

        const result = await AutomationsService.testAutomation(params.id, body.sampleTicket, tenantId);

        return { success: true, data: result };
      } catch (error) {
        logger.error('Error testing automation', { error });
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      body: t.Object({
        sampleTicket: t.Any(),
      }),
    }
  );
