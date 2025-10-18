/**
 * Expense Routes
 *
 * Rotas para gerenciamento de despesas
 */

import { Elysia, t } from 'elysia';
import { expenseService } from '../services';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import { requirePermission } from '../../security/middleware/rbac.middleware';
import logger from '@/utils/logger';
import type { ExpenseCategory, ExpensePaymentMethod } from '../schema/expenses.schema';

export const expenseRoutes = new Elysia({ prefix: '/api/v1/expenses' })
  .use(sessionGuard)
  .use(requireTenant)
  /**
   * Create new expense
   * POST /api/v1/expenses
   */
  .post(
    '/',
    { beforeHandle: [requirePermission('financial', 'write')] },
    async ({ body, user, tenantId }) => {
      logger.info('Creating expense', { user: user?.id });

      // Calculate totalAmount
      const amount = parseFloat(body.amount);
      const taxAmount = body.taxAmount ? parseFloat(body.taxAmount) : 0;
      const totalAmount = (amount + taxAmount).toString();

      const result = await expenseService.create({
        tenantId,
        category: body.category as ExpenseCategory,
        createdBy: user.id,
        updatedBy: user.id,
        totalAmount,
        amount: body.amount,
        expenseNumber: body.expenseNumber,
        title: body.title,
        supplierName: body.supplierName,
        description: body.description,
        subcategory: body.subcategory,
        taxAmount: body.taxAmount,
        supplierTaxId: body.supplierTaxId,
        paymentMethod: (body.paymentMethod as ExpensePaymentMethod | undefined) || null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        departmentId: body.departmentId || null,
        projectId: body.projectId || null,
        notes: body.notes,
        attachments: body.attachments as any,
        tags: body.tags || null,
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
      body: t.Object({
        expenseNumber: t.String(),
        title: t.String(),
        description: t.Optional(t.String()),
        category: t.String(),
        subcategory: t.Optional(t.String()),
        amount: t.String(),
        taxAmount: t.Optional(t.String()),
        supplierName: t.String(),
        supplierTaxId: t.Optional(t.String()),
        paymentMethod: t.Optional(t.String()),
        dueDate: t.Optional(t.String()),
        departmentId: t.Optional(t.String()),
        projectId: t.Optional(t.String()),
        notes: t.Optional(t.String()),
        attachments: t.Optional(t.Any()),
        tags: t.Optional(t.Array(t.String())),
      }),
    }
  )

  /**
   * Get expense by ID
   * GET /api/v1/expenses/:id
   */
  .get(
    '/:id',
    { beforeHandle: [requirePermission('financial', 'read')] },
    async ({ params, tenantId }) => {
      const result = await expenseService.getById(params.id, tenantId);

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
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  /**
   * List expenses with filters
   * GET /api/v1/expenses
   */
  .get(
    '/',
    { beforeHandle: [requirePermission('financial', 'read')] },
    async ({ query, tenantId }) => {
      const filters = {
        tenantId: tenantId,
        category: query.category,
        status: query.status,
        departmentId: query.departmentId,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
      };

      const page = query.page ? parseInt(query.page) : 1;
      const pageSize = query.pageSize ? parseInt(query.pageSize) : 20;

      const result = await expenseService.list(filters, page, pageSize);

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
      query: t.Object({
        category: t.Optional(t.String()),
        status: t.Optional(t.String()),
        departmentId: t.Optional(t.String()),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        page: t.Optional(t.String()),
        pageSize: t.Optional(t.String()),
      }),
    }
  )

  /**
   * Update expense
   * PATCH /api/v1/expenses/:id
   */
  .patch(
    '/:id',
    { beforeHandle: [requirePermission('financial', 'write')] },
    async ({ params, body, user, tenantId }) => {
      // Convert paymentDate string to Date if provided
      const updateData = {
        ...body,
        updatedBy: user.id,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : undefined,
      };

      const result = await expenseService.update(params.id, tenantId, updateData);

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
      params: t.Object({
        id: t.String(),
      }),
      body: t.Partial(
        t.Object({
          title: t.String(),
          description: t.String(),
          amount: t.String(),
          notes: t.String(),
          paymentDate: t.String(),
        })
      ),
    }
  )

  /**
   * Delete expense
   * DELETE /api/v1/expenses/:id
   */
  .delete(
    '/:id',
    { beforeHandle: [requirePermission('financial', 'manage')] },
    async ({ params, tenantId }) => {
      const result = await expenseService.delete(params.id, tenantId);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          code: result.code,
        };
      }

      return {
        success: true,
        message: 'Expense deleted successfully',
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  /**
   * Approve expense
   * POST /api/v1/expenses/:id/approve
   */
  .post(
    '/:id/approve',
    async ({ params, user, tenantId }) => {
      const result = await expenseService.approve(params.id, tenantId, user.id);

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
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  /**
   * Reject expense
   * POST /api/v1/expenses/:id/reject
   */
  .post(
    '/:id/reject',
    async ({ params, body, user, tenantId }) => {
      const result = await expenseService.reject(
        params.id,
        tenantId,
        user.id,
        body.reason
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
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        reason: t.String(),
      }),
    }
  )

  /**
   * Get pending approvals
   * GET /api/v1/expenses/pending-approvals
   */
  .get(
    '/pending-approvals/list',
    async ({ tenantId }) => {
      const result = await expenseService.getPendingApprovals(tenantId);

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
    }
  )

  /**
   * Category Management Routes
   */

  /**
   * Create expense category
   * POST /api/v1/expenses/categories
   */
  .post(
    '/categories',
    async ({ body, tenantId }) => {
      const result = await expenseService.createCategory({
        ...body,
        tenantId: tenantId,
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
      body: t.Object({
        name: t.String(),
        slug: t.String(),
        description: t.Optional(t.String()),
        color: t.Optional(t.String()),
        icon: t.Optional(t.String()),
        requiresApproval: t.Optional(t.Boolean()),
        approvalThreshold: t.Optional(t.String()),
        defaultTaxRate: t.Optional(t.String()),
      }),
    }
  )

  /**
   * List expense categories
   * GET /api/v1/expenses/categories
   */
  .get(
    '/categories/list',
    async ({ tenantId }) => {
      const result = await expenseService.listCategories(tenantId);

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
    }
  );
