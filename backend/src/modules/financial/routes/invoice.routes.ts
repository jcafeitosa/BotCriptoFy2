/**
 * Invoice Routes
 *
 * Rotas para gerenciamento de faturas (AR/AP)
 */

import { Elysia, t } from 'elysia';
import { invoiceService } from '../services';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import { requirePermission } from '../../security/middleware/rbac.middleware';
import logger from '@/utils/logger';
import type { InvoiceStatus } from '../schema/invoices.schema';

export const invoiceRoutes = new Elysia({ prefix: '/api/v1/invoices' })
  .use(sessionGuard)
  .use(requireTenant)
  /**
   * Create new invoice
   * POST /api/v1/invoices
   */
  .post(
    '/',
    async ({ body, user, tenantId }) => {
      logger.info('Creating invoice', { user: user?.id });

      // Calculate totalAmount and remainingAmount
      const subtotal = parseFloat(body.subtotal);
      const discount = body.discountAmount ? parseFloat(body.discountAmount) : 0;
      const tax = body.taxAmount ? parseFloat(body.taxAmount) : 0;
      const totalAmount = (subtotal - discount + tax).toString();

      const result = await invoiceService.create({
        ...body,
        dueDate: new Date(body.dueDate),
        totalAmount,
        remainingAmount: totalAmount, // Initially unpaid
        tenantId,
        createdBy: user.id,
        updatedBy: user.id,
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
        invoiceNumber: t.String(),
        type: t.Union([t.Literal('income'), t.Literal('expense')]),
        customerName: t.String(),
        customerEmail: t.Optional(t.String()),
        customerTaxId: t.Optional(t.String()),
        customerAddress: t.Optional(t.Any()),
        currency: t.Optional(t.String()),
        subtotal: t.String(),
        discountAmount: t.Optional(t.String()),
        discountPercent: t.Optional(t.String()),
        taxAmount: t.Optional(t.String()),
        dueDate: t.String(),
        items: t.Array(
          t.Object({
            id: t.String(),
            description: t.String(),
            quantity: t.Number(),
            unitPrice: t.String(),
            discount: t.String(),
            taxRate: t.String(),
            taxAmount: t.String(),
            total: t.String(),
          })
        ),
        notes: t.Optional(t.String()),
        paymentMethod: t.Optional(t.String()),
        paymentTerms: t.Optional(t.String()),
      }),
    }
  )

  /**
   * Get invoice by ID
   * GET /api/v1/invoices/:id
   */
  .get(
    '/:id',
    async ({ params, tenantId }) => {
      const result = await invoiceService.getById(params.id, tenantId);

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
   * List invoices with filters
   * GET /api/v1/invoices
   */
  .get(
    '/',
    async ({ query, tenantId }) => {
      const filters = {
        tenantId,
        type: query.type,
        status: query.status,
        customerId: query.customerId,
        supplierId: query.supplierId,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
      };

      const page = query.page ? parseInt(query.page) : 1;
      const pageSize = query.pageSize ? parseInt(query.pageSize) : 20;

      const result = await invoiceService.list(filters, page, pageSize);

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
      query: t.Object({
        type: t.Optional(t.Union([t.Literal('income'), t.Literal('expense')])),
        status: t.Optional(t.String()),
        customerId: t.Optional(t.String()),
        supplierId: t.Optional(t.String()),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        page: t.Optional(t.String()),
        pageSize: t.Optional(t.String()),
      }),
    }
  )

  /**
   * Update invoice
   * PATCH /api/v1/invoices/:id
   */
  .patch(
    '/:id',
    async ({ params, body, user, tenantId }) => {
      const result = await invoiceService.update(params.id, tenantId, {
        ...body,
        status: body.status as InvoiceStatus | undefined,
        updatedBy: user.id,
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
      params: t.Object({
        id: t.String(),
      }),
      body: t.Partial(
        t.Object({
          status: t.String(),
          customerName: t.String(),
          customerEmail: t.String(),
          notes: t.String(),
          internalNotes: t.String(),
        })
      ),
    }
  )

  /**
   * Delete invoice
   * DELETE /api/v1/invoices/:id
   */
  .delete(
    '/:id',
    async ({ params, tenantId }) => {
      const result = await invoiceService.delete(params.id, tenantId);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          code: result.code,
        };
      }

      return {
        success: true,
        message: 'Invoice deleted successfully',
      };
    },
    {
      beforeHandle: [requirePermission('financial', 'manage')],
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  /**
   * Add payment to invoice
   * POST /api/v1/invoices/:id/payments
   */
  .post(
    '/:id/payments',
    async ({ params, body, user, tenantId }) => {
      const result = await invoiceService.addPayment(params.id, tenantId, {
        ...body,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
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
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        amount: t.String(),
        currency: t.Optional(t.String()),
        paymentDate: t.Optional(t.String()),
        paymentMethod: t.String(),
        transactionId: t.Optional(t.String()),
        referenceNumber: t.Optional(t.String()),
        notes: t.Optional(t.String()),
      }),
    }
  )

  /**
   * Get invoice payments
   * GET /api/v1/invoices/:id/payments
   */
  .get(
    '/:id/payments',
    async ({ params, tenantId }) => {
      const result = await invoiceService.getPayments(params.id, tenantId);

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
   * Update invoice status
   * PATCH /api/v1/invoices/:id/status
   */
  .patch(
    '/:id/status',
    async ({ params, body, tenantId }) => {
      const result = await invoiceService.updateStatus(params.id, tenantId, body.status);

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
        id: t.String(),
      }),
      body: t.Object({
        status: t.Union([
          t.Literal('draft'),
          t.Literal('pending'),
          t.Literal('sent'),
          t.Literal('paid'),
          t.Literal('overdue'),
          t.Literal('cancelled'),
        ]),
      }),
    }
  )

  /**
   * Get overdue invoices
   * GET /api/v1/invoices/overdue
   */
  .get(
    '/overdue/list',
    async ({ tenantId }) => {
      const result = await invoiceService.getOverdue(tenantId);

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
    }
  );
