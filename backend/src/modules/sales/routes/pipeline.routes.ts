/**
 * Pipeline Routes
 * API endpoints for pipeline stage management
 */

import { Elysia, t } from 'elysia';
import { sessionGuard, requireRole } from '../../auth/middleware/session.middleware';
import { PipelineService } from '../services';
import logger from '@/utils/logger';

export const pipelineRoutes = new Elysia({ prefix: '/api/v1/sales/pipeline' })
  .use(sessionGuard)
  .use(requireRole(['ceo', 'admin', 'sales_manager']))

  /** POST /api/v1/sales/pipeline/stages */
  .post(
    '/stages',
    async ({ body, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;
        const stage = await PipelineService.createStage(body, tenantId);

        return { success: true, data: stage };
      } catch (error) {
        logger.error('Error creating stage', { error });
        set.status = 500;
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 100 }),
        description: t.Optional(t.String()),
        orderIndex: t.Optional(t.Number()),
        probabilityDefault: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
        color: t.Optional(t.String({ maxLength: 7 })),
        isActive: t.Optional(t.Boolean()),
      }),
    }
  )

  /** GET /api/v1/sales/pipeline/stages */
  .get('/stages', async ({ set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;
      const stages = await PipelineService.getStages(tenantId);

      return { success: true, data: stages };
    } catch (error) {
      set.status = 500;
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  })

  /** PATCH /api/v1/sales/pipeline/stages/:id */
  .patch(
    '/stages/:id',
    async ({ params, body, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;
        const stage = await PipelineService.updateStage(params.id, body, tenantId);

        return { success: true, data: stage };
      } catch (error) {
        set.status = 500;
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
    {
      body: t.Partial(
        t.Object({
          name: t.String({ maxLength: 100 }),
          description: t.String(),
          orderIndex: t.Number(),
          probabilityDefault: t.Number({ minimum: 0, maximum: 100 }),
          color: t.String({ maxLength: 7 }),
          isActive: t.Boolean(),
        })
      ),
    }
  )

  /** DELETE /api/v1/sales/pipeline/stages/:id */
  .delete('/stages/:id', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;
      await PipelineService.deleteStage(params.id, tenantId);

      return { success: true, message: 'Stage deleted successfully' };
    } catch (error) {
      set.status = 500;
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  })

  /** POST /api/v1/sales/pipeline/stages/reorder */
  .post(
    '/stages/reorder',
    async ({ body, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;
        const stages = await PipelineService.reorderStages(body.stageIds, tenantId);

        return { success: true, data: stages };
      } catch (error) {
        set.status = 500;
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
    {
      body: t.Object({
        stageIds: t.Array(t.String()),
      }),
    }
  );
