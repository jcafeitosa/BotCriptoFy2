/**
 * Deals Routes
 * API endpoints for deals/opportunities management
 */

import { Elysia, t } from 'elysia';
import { sessionGuard, requireRole } from '../../auth/middleware/session.middleware';
import { DealsService } from '../services';
import logger from '@/utils/logger';

export const dealsRoutes = new Elysia({ prefix: '/api/v1/sales/deals' })
  .use(sessionGuard)
  .use(requireRole(['ceo', 'admin', 'sales_manager', 'sales_rep']))

  /**
   * POST /api/v1/sales/deals
   */
  .post(
    '/',
    async ({ body, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;
        const userId = (session as any)?.userId;

        const deal = await DealsService.createDeal(body as any, userId, tenantId);

        return { success: true, data: deal };
      } catch (error) {
        logger.error('Error creating deal', { error });
        set.status = 500;
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
    {
      body: t.Object({
        contactId: t.String(),
        stageId: t.String(),
        title: t.String({ minLength: 1, maxLength: 255 }),
        description: t.Optional(t.String()),
        value: t.Number({ minimum: 0 }),
        currency: t.Optional(t.String({ maxLength: 3 })),
        probability: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
        expectedCloseDate: t.Optional(t.String()),
        products: t.Optional(t.Array(t.Any())),
        customFields: t.Optional(t.Any()),
        ownerId: t.Optional(t.String()),
      }),
    }
  )

  /** GET /api/v1/sales/deals */
  .get('/list', async ({ query, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      const filters = {
        status: query.status as any,
        stageId: query.stageId,
        ownerId: query.ownerId,
        contactId: query.contactId,
        minValue: query.minValue ? Number(query.minValue) : undefined,
        maxValue: query.maxValue ? Number(query.maxValue) : undefined,
        limit: query.limit ? Number(query.limit) : 50,
        offset: query.offset ? Number(query.offset) : 0,
      };

      const result = await DealsService.listDeals(filters, tenantId);

      return {
        success: true,
        data: result.deals,
        pagination: { total: result.total, limit: filters.limit, offset: filters.offset },
      };
    } catch (error) {
      logger.error('Error listing deals', { error });
      set.status = 500;
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  })

  /** GET /api/v1/sales/deals/:id */
  .get('/:id', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;
      const deal = await DealsService.getDealById(params.id, tenantId);

      if (!deal) {
        set.status = 404;
        return { success: false, error: 'Deal not found' };
      }

      return { success: true, data: deal };
    } catch (error) {
      set.status = 500;
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  })

  /** PATCH /api/v1/sales/deals/:id */
  .patch('/:id', async ({ params, body, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;
      const deal = await DealsService.updateDeal(params.id, body as any, tenantId);

      return { success: true, data: deal };
    } catch (error) {
      set.status = 500;
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  })

  /** DELETE /api/v1/sales/deals/:id */
  .delete('/:id', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;
      await DealsService.deleteDeal(params.id, tenantId);

      return { success: true, message: 'Deal deleted successfully' };
    } catch (error) {
      set.status = 500;
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  })

  /** POST /api/v1/sales/deals/:id/move */
  .post(
    '/:id/move',
    async ({ params, body, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;
        const deal = await DealsService.moveDealToStage(
          params.id,
          body.stageId,
          tenantId,
          body.probability
        );

        return { success: true, data: deal };
      } catch (error) {
        set.status = 500;
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
    {
      body: t.Object({
        stageId: t.String(),
        probability: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
      }),
    }
  )

  /** POST /api/v1/sales/deals/:id/win */
  .post(
    '/:id/win',
    async ({ params, body, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;
        const deal = await DealsService.markDealWon(
          params.id,
          new Date(body.closeDate),
          body.actualValue,
          tenantId
        );

        return { success: true, data: deal };
      } catch (error) {
        set.status = 500;
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
    {
      body: t.Object({
        closeDate: t.String(),
        actualValue: t.Optional(t.Number()),
      }),
    }
  )

  /** POST /api/v1/sales/deals/:id/lose */
  .post(
    '/:id/lose',
    async ({ params, body, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;
        const deal = await DealsService.markDealLost(params.id, body.reason, tenantId);

        return { success: true, data: deal };
      } catch (error) {
        set.status = 500;
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
    {
      body: t.Object({
        reason: t.String({ minLength: 1 }),
      }),
    }
  )

  /** GET /api/v1/sales/deals/pipeline */
  .get('/pipeline/view', async ({ set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;
      const pipelineView = await DealsService.getDealsByPipeline(tenantId);

      return { success: true, data: pipelineView };
    } catch (error) {
      set.status = 500;
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
