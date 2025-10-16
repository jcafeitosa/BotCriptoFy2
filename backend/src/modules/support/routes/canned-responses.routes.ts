/**
 * Canned Responses Routes
 * API endpoints for canned response templates
 */

import { Elysia, t } from 'elysia';
import { sessionGuard, requireRole } from '../../auth/middleware/session.middleware';
import { CannedResponsesService } from '../services';
import logger from '@/utils/logger';

export const cannedResponsesRoutes = new Elysia({ prefix: '/api/v1/support/canned-responses' })
  .use(sessionGuard)
  .use(requireRole(['ceo', 'admin', 'support_manager', 'support_agent']))

  /**
   * POST /api/v1/support/canned-responses
   * Create canned response
   */
  .post(
    '/',
    async ({ body, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;
        const userId = (session as any)?.userId;

        const response = await CannedResponsesService.createResponse(body, userId, tenantId);

        logger.info('Canned response created', { responseId: response.id, tenantId });
        return { success: true, data: response };
      } catch (error) {
        logger.error('Error creating canned response', { error });
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      body: t.Object({
        title: t.String({ minLength: 3, maxLength: 100 }),
        content: t.String({ minLength: 10 }),
        category: t.Optional(t.String({ maxLength: 100 })),
        isShared: t.Optional(t.Boolean()),
      }),
    }
  )

  /**
   * GET /api/v1/support/canned-responses
   * Get user's canned responses (personal + shared)
   */
  .get('/', async ({ session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;
      const userId = (session as any)?.userId;

      const responses = await CannedResponsesService.getResponses(userId, tenantId);

      return { success: true, data: responses };
    } catch (error) {
      logger.error('Error getting canned responses', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * GET /api/v1/support/canned-responses/:id
   * Get canned response by ID
   */
  .get('/:id', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;
      const userId = (session as any)?.userId;

      const response = await CannedResponsesService.getResponseById(params.id, userId, tenantId);

      if (!response) {
        set.status = 404;
        return { success: false, error: 'Canned response not found' };
      }

      return { success: true, data: response };
    } catch (error) {
      logger.error('Error getting canned response', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * PATCH /api/v1/support/canned-responses/:id
   * Update canned response (owner only)
   */
  .patch(
    '/:id',
    async ({ params, body, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;
        const userId = (session as any)?.userId;

        const response = await CannedResponsesService.updateResponse(params.id, body, userId, tenantId);

        return { success: true, data: response };
      } catch (error) {
        logger.error('Error updating canned response', { error });
        set.status = error instanceof Error && error.message.includes('not found') ? 404 : 403;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      body: t.Object({
        title: t.Optional(t.String({ minLength: 3, maxLength: 100 })),
        content: t.Optional(t.String({ minLength: 10 })),
        category: t.Optional(t.String({ maxLength: 100 })),
        isShared: t.Optional(t.Boolean()),
      }),
    }
  )

  /**
   * DELETE /api/v1/support/canned-responses/:id
   * Delete canned response (owner only)
   */
  .delete('/:id', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;
      const userId = (session as any)?.userId;

      await CannedResponsesService.deleteResponse(params.id, userId, tenantId);

      return { success: true, message: 'Canned response deleted successfully' };
    } catch (error) {
      logger.error('Error deleting canned response', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * POST /api/v1/support/canned-responses/:id/use
   * Increment usage count
   */
  .post('/:id/use', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;
      const userId = (session as any)?.userId;

      await CannedResponsesService.incrementUsage(params.id, userId, tenantId);

      return { success: true, message: 'Usage count incremented' };
    } catch (error) {
      logger.error('Error incrementing usage', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
