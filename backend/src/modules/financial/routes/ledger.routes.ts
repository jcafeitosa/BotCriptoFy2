/**
 * Ledger Routes
 *
 * Rotas para contabilidade (double-entry bookkeeping) - Admin only
 */

import { Elysia, t } from 'elysia';
import { ledgerService } from '../services';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import { requirePermission } from '../../security/middleware/rbac.middleware';
import logger from '@/utils/logger';

export const ledgerRoutes = new Elysia({ prefix: '/api/v1/ledger' })
  .use(sessionGuard)
  .use(requireTenant)
  /**
   * Create ledger entry (double-entry)
   * POST /api/v1/ledger/entries
   */
  .post(
    '/entries',
    async ({ body, user, tenantId }) => {
      logger.info('Creating ledger entry', { user: user?.id });

      const { entry, lines } = body;

      const result = await ledgerService.createEntry(
        {
          ...entry,
          entryDate: entry.entryDate ? new Date(entry.entryDate) : new Date(),
          tenantId,
          createdBy: user.id,
        },
        lines
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
        entry: t.Object({
          entryNumber: t.String(),
          entryDate: t.Optional(t.String()),
          description: t.String(),
          reference: t.Optional(t.String()),
          fiscalYear: t.String(),
          fiscalPeriod: t.String(),
          fiscalQuarter: t.String(),
          notes: t.Optional(t.String()),
        }),
        lines: t.Array(
          t.Object({
            accountId: t.String(),
            entryType: t.Union([t.Literal('debit'), t.Literal('credit')]),
            amount: t.String(),
            currency: t.Optional(t.String()),
            description: t.Optional(t.String()),
            departmentId: t.Optional(t.String()),
            projectId: t.Optional(t.String()),
            costCenter: t.Optional(t.String()),
          })
        ),
      }),
    }
  )

  /**
   * Get entry with lines
   * GET /api/v1/ledger/entries/:id
   */
  .get(
    '/entries/:id',
    async ({ params, user: _user, tenantId }) => {
      const result = await ledgerService.getEntryWithLines(params.id, tenantId);

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
   * Post entry (move from draft to posted)
   * POST /api/v1/ledger/entries/:id/post
   */
  .post(
    '/entries/:id/post',
    async ({ params, user, tenantId }) => {
      const result = await ledgerService.postEntry(params.id, tenantId, user.id);

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
    }
  )

  /**
   * Reverse entry
   * POST /api/v1/ledger/entries/:id/reverse
   */
  .post(
    '/entries/:id/reverse',
    async ({ params, body, user, tenantId }) => {
      const result = await ledgerService.reverseEntry(
        params.id,
        tenantId,
        body.reason,
        user.id
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
        reason: t.String(),
      }),
    }
  )

  /**
   * Chart of Accounts Management
   */

  /**
   * Create account
   * POST /api/v1/ledger/accounts
   */
  .post(
    '/accounts',
    async ({ body, user: _user, tenantId }) => {
      const result = await ledgerService.createAccount({
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
      beforeHandle: [requirePermission('financial', 'write')],
      body: t.Object({
        code: t.String(),
        name: t.String(),
        description: t.Optional(t.String()),
        accountType: t.Union([
          t.Literal('asset'),
          t.Literal('liability'),
          t.Literal('equity'),
          t.Literal('revenue'),
          t.Literal('expense'),
        ]),
        parentId: t.Optional(t.String()),
        isDebitNormal: t.Boolean(),
        allowsManualEntry: t.Optional(t.Boolean()),
        requiresReconciliation: t.Optional(t.Boolean()),
        taxReportingCategory: t.Optional(t.String()),
        isTaxDeductible: t.Optional(t.Boolean()),
        currency: t.Optional(t.String()),
      }),
    }
  )

  /**
   * List accounts
   * GET /api/v1/ledger/accounts
   */
  .get(
    '/accounts',
    async ({ tenantId }) => {
      const result = await ledgerService.listAccounts(tenantId);

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
   * Get account balance
   * GET /api/v1/ledger/accounts/:id/balance
   */
  .get(
    '/accounts/:id/balance',
    async ({ params, query, tenantId }) => {
      const result = await ledgerService.getAccountBalance(
        tenantId,
        params.id,
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
      params: t.Object({
        id: t.String(),
      }),
      query: t.Object({
        fiscalPeriod: t.String(),
      }),
    }
  )

  /**
   * Get trial balance
   * GET /api/v1/ledger/trial-balance
   */
  .get(
    '/trial-balance',
    async ({ query, tenantId }) => {
      const result = await ledgerService.getTrialBalance(tenantId, query.fiscalPeriod);

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
   * Close fiscal period
   * POST /api/v1/ledger/periods/:period/close
   */
  .post(
    '/periods/:period/close',
    async ({ params, user, tenantId }) => {
      const result = await ledgerService.closeFiscalPeriod(
        tenantId,
        params.period,
        user.id
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
        period: t.String(),
      }),
    }
  );
