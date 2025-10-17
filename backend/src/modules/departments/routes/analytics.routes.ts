/**
 * Department Analytics Routes
 * Routes for department statistics and metrics
 */

import { Elysia, t } from 'elysia';
import { sessionGuard } from '../../auth/middleware/session.middleware';
import {
  getDepartmentStats,
  getTenantDepartmentStats,
  getDepartmentMemberActivity,
  getUserDepartmentSummary,
} from '../services/analytics.service';

/**
 * Department analytics routes
 */
export const analyticsRoutes = new Elysia({ prefix: '/api/departments', name: 'department-analytics-routes' })
  .use(sessionGuard)

  // Get department statistics
  .get(
    '/:id/stats',
    async ({ params }) => {
      const stats = await getDepartmentStats(params.id);
      return {
        success: true,
        data: stats,
      };
    },
    {
      params: t.Object({
        id: t.String({ description: 'Department ID' }),
      }),
      detail: {
        tags: ['Department Analytics'],
        summary: 'Get department statistics',
        description: 'Get comprehensive statistics for a department',
      },
    }
  )

  // Get tenant-wide department statistics
  .get(
    '/tenant/:tenantId/stats',
    async ({ params }) => {
      const stats = await getTenantDepartmentStats(params.tenantId);
      return {
        success: true,
        data: stats,
      };
    },
    {
      params: t.Object({
        tenantId: t.String({ description: 'Tenant ID' }),
      }),
      detail: {
        tags: ['Department Analytics'],
        summary: 'Get tenant department statistics',
        description: 'Get statistics for all departments in a tenant',
      },
    }
  )

  // Get department member activity
  .get(
    '/:id/activity',
    async ({ params }) => {
      const activity = await getDepartmentMemberActivity(params.id);
      return {
        success: true,
        data: activity,
      };
    },
    {
      params: t.Object({
        id: t.String({ description: 'Department ID' }),
      }),
      detail: {
        tags: ['Department Analytics'],
        summary: 'Get department activity',
        description: 'Get recent member activity for a department',
      },
    }
  )

  // Get user department summary
  .get(
    '/user/:userId/summary',
    async ({ params }) => {
      const summary = await getUserDepartmentSummary(params.userId);
      return {
        success: true,
        data: summary,
      };
    },
    {
      params: t.Object({
        userId: t.String({ description: 'User ID' }),
      }),
      detail: {
        tags: ['Department Analytics'],
        summary: 'Get user department summary',
        description: 'Get summary of all departments for a user',
      },
    }
  );
