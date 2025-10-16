/**
 * Activities Routes
 * API endpoints for activities management
 */

import { Elysia, t } from 'elysia';
import { sessionGuard, requireRole } from '../../auth/middleware/session.middleware';
import { ActivitiesService } from '../services';
import logger from '@/utils/logger';

export const activitiesRoutes = new Elysia({ prefix: '/api/v1/sales/activities' })
  .use(sessionGuard)
  .use(requireRole(['ceo', 'admin', 'sales_manager', 'sales_rep']))

  /** POST /api/v1/sales/activities */
  .post(
    '/',
    async ({ body, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;
        const userId = (session as any)?.userId;

        const activity = await ActivitiesService.createActivity(body as any, userId, tenantId);

        return { success: true, data: activity };
      } catch (error) {
        logger.error('Error creating activity', { error });
        set.status = 500;
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
    {
      body: t.Object({
        type: t.Union([
          t.Literal('call'),
          t.Literal('email'),
          t.Literal('meeting'),
          t.Literal('task'),
          t.Literal('note'),
          t.Literal('demo'),
        ]),
        subject: t.String({ minLength: 1, maxLength: 255 }),
        description: t.Optional(t.String()),
        contactId: t.Optional(t.String()),
        dealId: t.Optional(t.String()),
        dueDate: t.Optional(t.String()),
      }),
    }
  )

  /** GET /api/v1/sales/activities */
  .get('/list', async ({ query, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      const filters = {
        type: query.type as any,
        status: query.status as any,
        ownerId: query.ownerId,
        contactId: query.contactId,
        dealId: query.dealId,
        limit: query.limit ? Number(query.limit) : 50,
        offset: query.offset ? Number(query.offset) : 0,
      };

      const result = await ActivitiesService.listActivities(filters, tenantId);

      return {
        success: true,
        data: result.activities,
        pagination: { total: result.total, limit: filters.limit, offset: filters.offset },
      };
    } catch (error) {
      set.status = 500;
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  })

  /** GET /api/v1/sales/activities/:id */
  .get('/:id', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;
      const activity = await ActivitiesService.getActivityById(params.id, tenantId);

      if (!activity) {
        set.status = 404;
        return { success: false, error: 'Activity not found' };
      }

      return { success: true, data: activity };
    } catch (error) {
      set.status = 500;
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  })

  /** PATCH /api/v1/sales/activities/:id */
  .patch('/:id', async ({ params, body, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;
      const activity = await ActivitiesService.updateActivity(params.id, body, tenantId);

      return { success: true, data: activity };
    } catch (error) {
      set.status = 500;
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  })

  /** POST /api/v1/sales/activities/:id/complete */
  .post(
    '/:id/complete',
    async ({ params, body, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;
        const activity = await ActivitiesService.completeActivity(
          params.id,
          body.outcome,
          tenantId
        );

        return { success: true, data: activity };
      } catch (error) {
        set.status = 500;
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },
    {
      body: t.Object({
        outcome: t.String({ minLength: 1 }),
      }),
    }
  )

  /** DELETE /api/v1/sales/activities/:id */
  .delete('/:id', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;
      await ActivitiesService.deleteActivity(params.id, tenantId);

      return { success: true, message: 'Activity deleted successfully' };
    } catch (error) {
      set.status = 500;
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  })

  /** GET /api/v1/sales/activities/upcoming */
  .get('/upcoming/list', async ({ set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;
      const userId = (session as any)?.userId;

      const activities = await ActivitiesService.getUpcomingActivities(userId, tenantId);

      return { success: true, data: activities };
    } catch (error) {
      set.status = 500;
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
