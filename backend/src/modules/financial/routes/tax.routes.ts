// @ts-nocheck
/**
 * Tax Routes
 *
 * Rotas para gerenciamento de impostos e obrigações fiscais
 */

import { Elysia, t } from 'elysia';
import { taxService } from '../services';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import { requirePermission } from '../../security/middleware/rbac.middleware';
import type { TaxType } from '../types';

export const taxRoutes = new Elysia({ prefix: '/api/v1/tax' })
  .use(sessionGuard)
  .use(requireTenant)
  /**
   * Calculate tax
   * POST /api/v1/tax/calculate
   */
  .post(
    '/calculate',
    async ({ body, tenantId }: any) => {
      const result = await taxService.calculateTax(
        tenantId,
        body.taxType as TaxType,
        body.taxableAmount,
        body.stateCode,
        body.cityCode
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
        taxType: t.String(),
        taxableAmount: t.String(),
        stateCode: t.Optional(t.String()),
        cityCode: t.Optional(t.String()),
      }),
    }
  )

  /**
   * Tax Records
   */

  /**
   * Create tax record
   * POST /api/v1/tax/records
   */
  .post(
    '/records',
    async ({ body, user, tenantId }: any) => {
      const result = await taxService.createRecord({
        ...body,
        taxType: body.taxType as TaxType,
        periodStartDate: new Date(body.periodStartDate),
        periodEndDate: new Date(body.periodEndDate),
        dueDate: new Date(body.dueDate),
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
        recordNumber: t.String(),
        taxType: t.String(),
        taxRateId: t.Optional(t.String()),
        fiscalYear: t.String(),
        fiscalPeriod: t.String(),
        periodStartDate: t.String(),
        periodEndDate: t.String(),
        currency: t.Optional(t.String()),
        taxableAmount: t.String(),
        taxRate: t.String(),
        taxAmount: t.String(),
        deductions: t.Optional(t.String()),
        netTaxAmount: t.String(),
        dueDate: t.String(),
        notes: t.Optional(t.String()),
      }),
    }
  )

  /**
   * Get tax records for period
   * GET /api/v1/tax/records
   */
  .get(
    '/records',
    async ({ query, tenantId }: any) => {
      const result = await taxService.getRecordsForPeriod(tenantId, query.fiscalPeriod);

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
        fiscalPeriod: t.String(),
      }),
    }
  )

  /**
   * Get overdue tax records
   * GET /api/v1/tax/records/overdue
   */
  .get(
    '/records/overdue',
    async ({ tenantId }: any) => {
      const result = await taxService.getOverdueRecords(tenantId);

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
  )

  /**
   * Mark tax record as paid
   * POST /api/v1/tax/records/:id/pay
   */
  .post(
    '/records/:id/pay',
    async ({ params, body, tenantId }: any) => {
      const result = await taxService.markAsPaid(
        params.id,
        tenantId,
        body.paidAmount,
        new Date(body.paidDate),
        body.paymentMethod,
        body.paymentReference
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
        id: t.String(),
      }),
      body: t.Object({
        paidAmount: t.String(),
        paidDate: t.String(),
        paymentMethod: t.String(),
        paymentReference: t.String(),
      }),
    }
  )

  /**
   * Get tax summary for period
   * GET /api/v1/tax/summary
   */
  .get(
    '/summary',
    async ({ query, tenantId }: any) => {
      const result = await taxService.getTaxSummary(tenantId, query.fiscalPeriod);

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
        fiscalPeriod: t.String(),
      }),
    }
  )

  /**
   * Tax Obligations
   */

  /**
   * Create tax obligation
   * POST /api/v1/tax/obligations
   */
  .post(
    '/obligations',
    async ({ body, tenantId }: any) => {
      const result = await taxService.createObligation({
        name: body.name,
        code: body.code,
        tenantId: tenantId,
        dueDay: body.dueDay,
        frequency: body.frequency as any,
        description: body.description,
        taxRegime: body.taxRegime as any,
        legalReference: body.legalReference,
        governmentSystem: body.governmentSystem,
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
      beforeHandle: [requirePermission('financial', 'manage')],
      body: t.Object({
        name: t.String(),
        code: t.String(),
        description: t.Optional(t.String()),
        frequency: t.Union([
          t.Literal('monthly'),
          t.Literal('quarterly'),
          t.Literal('yearly'),
          t.Literal('annual'),
        ]),
        dueDay: t.String(),
        taxRegime: t.Optional(t.String()),
        legalReference: t.Optional(t.String()),
        governmentSystem: t.Optional(t.String()),
      }),
    }
  )

  /**
   * List tax obligations
   * GET /api/v1/tax/obligations
   */
  .get(
    '/obligations',
    async ({ tenantId }: any) => {
      const result = await taxService.listObligations(tenantId);

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
  )

  /**
   * Tax Filings
   */

  /**
   * Create tax filing
   * POST /api/v1/tax/filings
   */
  .post(
    '/filings',
    async ({ body, tenantId }: any) => {
      const result = await taxService.createFiling({
        ...body,
        periodStartDate: new Date(body.periodStartDate),
        periodEndDate: new Date(body.periodEndDate),
        dueDate: new Date(body.dueDate),
        tenantId,
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
      beforeHandle: [requirePermission('financial', 'manage')],
      body: t.Object({
        obligationId: t.String(),
        fiscalYear: t.String(),
        fiscalPeriod: t.String(),
        periodStartDate: t.String(),
        periodEndDate: t.String(),
        dueDate: t.String(),
      }),
    }
  )

  /**
   * Submit tax filing
   * POST /api/v1/tax/filings/:id/submit
   */
  .post(
    '/filings/:id/submit',
    async ({ params, body, user, tenantId }: any) => {
      const result = await taxService.submitFiling(
        params.id,
        tenantId,
        user.id,
        body.receiptNumber,
        body.protocolNumber
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
      beforeHandle: [requirePermission('financial', 'manage')],
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        receiptNumber: t.String(),
        protocolNumber: t.String(),
      }),
    }
  )

  /**
   * Get upcoming filings
   * GET /api/v1/tax/filings/upcoming
   */
  .get(
    '/filings/upcoming',
    async ({ query, tenantId }: any) => {
      const days = query.days ? parseInt(query.days) : 30;
      const result = await taxService.getUpcomingFilings(tenantId, days);

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
        days: t.Optional(t.String()),
      }),
    }
  )

  /**
   * Tax Rates
   */

  /**
   * Create tax rate
   * POST /api/v1/tax/rates
   */
  .post(
    '/rates',
    async ({ body, tenantId }: any) => {
      const result = await taxService.createRate({
        ...body,
        taxType: body.taxType as TaxType,
        effectiveFrom: new Date(body.effectiveFrom),
        effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : undefined,
        tenantId,
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
      beforeHandle: [requirePermission('financial', 'manage')],
      body: t.Object({
        name: t.String(),
        taxType: t.String(),
        description: t.Optional(t.String()),
        rate: t.String(),
        isCompound: t.Optional(t.Boolean()),
        stateCode: t.Optional(t.String()),
        cityCode: t.Optional(t.String()),
        effectiveFrom: t.String(),
        effectiveTo: t.Optional(t.String()),
        legalReference: t.Optional(t.String()),
      }),
    }
  )

  /**
   * List tax rates
   * GET /api/v1/tax/rates
   */
  .get(
    '/rates',
    async ({ query, tenantId }: any) => {
      const result = await taxService.listRates(tenantId, query.taxType as any);

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
        taxType: t.Optional(t.String()),
      }),
    }
  );
