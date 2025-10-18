/**
 * Budget Routes
 *
 * Rotas para gerenciamento de orçamentos
 */

import { Elysia, t } from 'elysia';
import { budgetService } from '../services';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import { requirePermission } from '../../security/middleware/rbac.middleware';
import logger from '@/utils/logger';

export const budgetRoutes = new Elysia({ prefix: '/api/v1/budgets' })
  .use(sessionGuard)
  .use(requireTenant)
  /**
   * Create new budget
   * POST /api/v1/budgets
   */
  .post(
    '/',
    async ({ body, user, tenantId }: any) => {
      logger.info('Creating budget', { user: user?.id });

      const { budget, lines } = body;

      // Calculate totalBudgeted from lines
      const totalBudgeted = lines.reduce((sum, line) => sum + parseFloat(line.budgetedAmount), 0).toString();

      // Add availableAmount to lines (initially equals budgetedAmount)
      const linesWithAvailable = lines.map(line => ({
        ...line,
        availableAmount: line.budgetedAmount,
      }));

      const result = await budgetService.create(
        {
          ...budget,
          startDate: new Date(budget.startDate),
          endDate: new Date(budget.endDate),
          totalBudgeted,
          tenantId,
          createdBy: user.id,
          updatedBy: user.id,
        },
        linesWithAvailable
      );

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          code: result.code,
        };
      }

      return {
        success: true,
        data: result.data,
      };
    },
    {
      beforeHandle: [requirePermission('financial', 'write')],
      body: t.Object({
        budget: t.Object({
          name: t.String(),
          description: t.Optional(t.String()),
          budgetNumber: t.String(),
          periodType: t.Union([
            t.Literal('monthly'),
            t.Literal('quarterly'),
            t.Literal('yearly'),
            t.Literal('custom'),
          ]),
          fiscalYear: t.String(),
          fiscalPeriod: t.Optional(t.String()),
          startDate: t.String(),
          endDate: t.String(),
          currency: t.Optional(t.String()),
          departmentId: t.Optional(t.String()),
          projectId: t.Optional(t.String()),
          costCenter: t.Optional(t.String()),
          ownerId: t.String(),
          managerId: t.Optional(t.String()),
          notes: t.Optional(t.String()),
        }),
        lines: t.Array(
          t.Object({
            categoryName: t.String(),
            categoryId: t.Optional(t.String()),
            accountId: t.Optional(t.String()),
            budgetedAmount: t.String(),
            warningThreshold: t.Optional(t.String()),
            criticalThreshold: t.Optional(t.String()),
            notes: t.Optional(t.String()),
          })
        ),
      }),
    }
  )

  /**
   * Get budget by ID with lines
   * GET /api/v1/budgets/:id
   */
  .get(
    '/:id',
    async ({ params, tenantId }: any) => {
      const result = await budgetService.getById(params.id, tenantId);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          code: result.code,
        };
      }

      return {
        success: true,
        data: result.data,
      };
    },
    {
      beforeHandle: [requirePermission('financial', 'read')],
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  /**
   * Get budget alerts
   * GET /api/v1/budgets/:id/alerts
   */
  .get(
    '/:id/alerts',
    async ({ params, tenantId }: any) => {
      const result = await budgetService.getAlerts(params.id, tenantId);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          code: result.code,
        };
      }

      return {
        success: true,
        data: result.data,
      };
    },
    {
      beforeHandle: [requirePermission('financial', 'read')],
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  /**
   * Resolve budget alert
   * POST /api/v1/budgets/alerts/:alertId/resolve
   */
  .post(
    '/alerts/:alertId/resolve',
    async ({ params, body, user, tenantId }: any) => {
      const result = await budgetService.resolveAlert(
        params.alertId,
        tenantId,
        user.id,
        body.resolutionNotes
      );

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          code: result.code,
        };
      }

      return {
        success: true,
        data: result.data,
      };
    },
    {
      beforeHandle: [requirePermission('financial', 'write')],
      params: t.Object({
        alertId: t.String(),
      }),
      body: t.Object({
        resolutionNotes: t.String(),
      }),
    }
  )

  /**
   * Create budget adjustment
   * POST /api/v1/budgets/adjustments
   */
  .post(
    '/adjustments',
    async ({ body, user, tenantId }: any) => {
      const result = await budgetService.createAdjustment({
        ...body,
        adjustmentDate: body.adjustmentDate ? new Date(body.adjustmentDate) : new Date(),
        tenantId,
        createdBy: user.id,
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          code: result.code,
        };
      }

      return {
        success: true,
        data: result.data,
      };
    },
    {
      beforeHandle: [requirePermission('financial', 'write')],
      body: t.Object({
        budgetId: t.String(),
        adjustmentNumber: t.String(),
        adjustmentDate: t.Optional(t.String()),
        adjustmentType: t.Union([
          t.Literal('increase'),
          t.Literal('decrease'),
          t.Literal('reallocation'),
        ]),
        sourceBudgetLineId: t.Optional(t.String()),
        targetBudgetLineId: t.Optional(t.String()),
        amount: t.String(),
        currency: t.Optional(t.String()),
        reason: t.String(),
        description: t.Optional(t.String()),
        requiresApproval: t.Optional(t.Boolean()),
      }),
    }
  )

  /**
   * Sync budget with expenses
   * POST /api/v1/budgets/:id/sync
   */
  .post(
    '/:id/sync',
    async ({ params, tenantId }: any) => {
      const result = await budgetService.syncWithExpenses(params.id, tenantId);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          code: result.code,
        };
      }

      return {
        success: true,
        message: 'Budget synced with expenses successfully',
      };
    },
    {
      beforeHandle: [requirePermission('financial', 'write')],
      params: t.Object({
        id: t.String(),
      }),
    }
  );
