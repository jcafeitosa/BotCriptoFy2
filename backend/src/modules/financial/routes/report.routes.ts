/**
 * Report Routes
 *
 * Rotas para geração de relatórios financeiros
 */

import { Elysia, t } from 'elysia';
import { reportService } from '../services';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import { requirePermission } from '../../security/middleware/rbac.middleware';
import logger from '@/utils/logger';

export const reportRoutes = new Elysia({ prefix: '/api/v1/reports' })
  .use(sessionGuard)
  .use(requireTenant)
  /**
   * Generate Profit & Loss Statement (DRE)
   * GET /api/v1/reports/profit-loss
   */
  .get(
    '/profit-loss',
    async ({ query, tenantId }: any) => {
      logger.info('Generating P&L report', {
        tenantId,
        fiscalPeriod: query.fiscalPeriod
      });

      const result = await reportService.generateProfitLoss(
        tenantId,
        query.fiscalPeriod
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
      beforeHandle: [requirePermission('financial', 'read')],
      query: t.Object({
        fiscalPeriod: t.String(), // e.g., "2025-01" or "2025-Q1"
      }),
    }
  )

  /**
   * Generate Balance Sheet (Balanço Patrimonial)
   * GET /api/v1/reports/balance-sheet
   */
  .get(
    '/balance-sheet',
    async ({ query, tenantId }: any) => {
      logger.info('Generating Balance Sheet', {
        tenantId,
        date: query.date
      });

      const result = await reportService.generateBalanceSheet(
        tenantId,
        new Date(query.date)
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
      beforeHandle: [requirePermission('financial', 'read')],
      query: t.Object({
        date: t.String(), // ISO date string
      }),
    }
  )

  /**
   * Generate Cash Flow Statement (DFC)
   * GET /api/v1/reports/cash-flow
   */
  .get(
    '/cash-flow',
    async ({ query, tenantId }: any) => {
      logger.info('Generating Cash Flow Statement', {
        tenantId,
        fiscalPeriod: query.fiscalPeriod
      });

      const result = await reportService.generateCashFlow(
        tenantId,
        query.fiscalPeriod
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
      beforeHandle: [requirePermission('financial', 'read')],
      query: t.Object({
        fiscalPeriod: t.String(),
      }),
    }
  );
