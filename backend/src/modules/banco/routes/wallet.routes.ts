/**
 * Wallet Routes
 *
 * API endpoints for wallet operations
 */

import { Elysia, t } from 'elysia';
// Move DB access into walletService (layering)
import { walletService } from '../services/wallet.service';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import { requirePermission } from '../../security/middleware/rbac.middleware';
import logger from '@/utils/logger';

export const walletRoutes = new Elysia({ prefix: '/api/v1/wallets' })
  .use(sessionGuard)
  .use(requireTenant)

  /**
   * List wallets for current user
   * GET /api/v1/wallets
   */
  .get(
    '/',
    { beforeHandle: [requirePermission('wallets', 'read')] },
    async ({ user, tenantId }) => {
      logger.info('Listing wallets', { userId: user.id });
      const rows = await walletService.listUserWallets(user.id, tenantId);
      return { success: true, data: rows, count: rows.length };
    },
    {
      detail: {
        tags: ['Banco - Wallets'],
        summary: 'List wallets',
        description: 'List all wallets for the authenticated user',
      },
    }
  )

  /**
   * Lock wallet (admin/manage)
   * POST /api/v1/wallets/:id/lock
   */
  .post(
    '/:id/lock',
    { beforeHandle: [requirePermission('wallets', 'manage')] },
    async ({ params, body, user, tenantId }) => {
      const result = await walletService.setWalletLock(params.id, user.id, tenantId, true, body.reason);
      return result;
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ reason: t.Optional(t.String({ maxLength: 200 })) }),
      detail: {
        tags: ['Banco - Admin'],
        summary: 'Lock wallet',
        description: 'Lock a wallet from operations (admin only)',
      },
    }
  )

  /**
   * Unlock wallet (admin/manage)
   * POST /api/v1/wallets/:id/unlock
   */
  .post(
    '/:id/unlock',
    { beforeHandle: [requirePermission('wallets', 'manage')] },
    async ({ params, user, tenantId }) => {
      const result = await walletService.setWalletLock(params.id, user.id, tenantId, false);
      return result;
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ['Banco - Admin'],
        summary: 'Unlock wallet',
        description: 'Unlock a wallet for normal operations (admin only)',
      },
    }
  )

  /**
   * Export transactions as CSV
   * GET /api/v1/wallets/:id/transactions/export?type=&status=&asset=&limit=&offset=
   */
  .get(
    '/:id/transactions/export',
    { beforeHandle: [requirePermission('wallets', 'read')] },
    async ({ params, query, user, set }) => {
      const csv = await walletService.exportTransactionsCsv({
        walletId: params.id,
        userId: user.id,
        type: query.type as any,
        status: query.status as any,
        asset: query.asset as any,
        limit: query.limit ? parseInt(query.limit) : 500,
        offset: query.offset ? parseInt(query.offset) : 0,
      });
      set.headers['Content-Type'] = 'text/csv; charset=utf-8';
      return csv;
    },
    {
      params: t.Object({ id: t.String() }),
      query: t.Object({
        type: t.Optional(t.String()),
        status: t.Optional(t.String()),
        asset: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Banco - Transactions'],
        summary: 'Export wallet transactions to CSV',
        description: 'Download a CSV export of wallet transactions with optional filters',
      },
    }
  )

  /**
   * Create a new wallet
   * POST /api/v1/wallets
   */
  .post(
    '/',
    { beforeHandle: [requirePermission('wallets', 'write')] },
    async ({ body, user, tenantId }) => {
      logger.info('Creating wallet', { userId: user.id, type: body.type });

      const result = await walletService.createWallet({
        userId: user.id,
        tenantId,
        name: body.name,
        type: body.type,
        description: body.description,
        metadata: body.metadata,
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      return {
        success: true,
        wallet: result.wallet,
      };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 100 }),
        type: t.Union([
          t.Literal('main'),
          t.Literal('savings'),
          t.Literal('trading'),
          t.Literal('staking'),
        ]),
        description: t.Optional(t.String({ maxLength: 500 })),
        metadata: t.Optional(
          t.Object({
            color: t.Optional(t.String()),
            icon: t.Optional(t.String()),
            displayOrder: t.Optional(t.Number()),
          })
        ),
      }),
      detail: {
        tags: ['Banco - Wallets'],
        summary: 'Create new wallet',
        description: 'Create a new wallet for the authenticated user',
      },
    }
  )

  /**
   * Get wallet summary
   * GET /api/v1/wallets/:id
   */
  .get(
    '/:id',
    { beforeHandle: [requirePermission('wallets', 'read')] },
    async ({ params, user }) => {
      logger.info('Getting wallet summary', { walletId: params.id, userId: user.id });

      const summary = await walletService.getWalletSummary(params.id);

      if (!summary) {
        return {
          success: false,
          error: 'Wallet not found',
        };
      }

      // Verify ownership
      if (summary.wallet.userId !== user.id) {
        return {
          success: false,
          error: 'Access denied',
        };
      }

      return {
        success: true,
        summary,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ['Banco - Wallets'],
        summary: 'Get wallet summary',
        description: 'Get complete summary of a wallet including all assets',
      },
    }
  )

  /**
   * Get asset balance
   * GET /api/v1/wallets/:id/assets/:asset
   */
  .get(
    '/:id/assets/:asset',
    { beforeHandle: [requirePermission('wallets', 'read')] },
    async ({ params, user }) => {
      logger.info('Getting asset balance', {
        walletId: params.id,
        asset: params.asset,
        userId: user.id,
      });

      const balance = await walletService.getAssetBalance(params.id, params.asset);

      if (!balance) {
        return {
          success: false,
          error: 'Asset not found in wallet',
        };
      }

      return {
        success: true,
        balance,
      };
    },
    {
      params: t.Object({
        id: t.String(),
        asset: t.String(),
      }),
      detail: {
        tags: ['Banco - Wallets'],
        summary: 'Get asset balance',
        description: 'Get balance of a specific asset in a wallet',
      },
    }
  )

  /**
   * Process deposit
   * POST /api/v1/wallets/:id/deposit
   */
  .post(
    '/:id/deposit',
    { beforeHandle: [requirePermission('wallets', 'write')] },
    async ({ params, body, user, tenantId }) => {
      logger.info('Processing deposit', {
        walletId: params.id,
        asset: body.asset,
        amount: body.amount,
        userId: user.id,
      });

      const result = await walletService.processDeposit({
        walletId: params.id,
        userId: user.id,
        tenantId,
        asset: body.asset as any,
        amount: body.amount,
        fromAddress: body.fromAddress,
        txHash: body.txHash,
        network: body.network,
        metadata: body.metadata,
      });

      return result;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        asset: t.Union([
          t.Literal('BTC'), t.Literal('ETH'), t.Literal('USDT'), t.Literal('USDC'), t.Literal('BNB'), t.Literal('SOL'), t.Literal('ADA'), t.Literal('DOT'), t.Literal('MATIC'), t.Literal('AVAX'), t.Literal('BRL'), t.Literal('USD'),
        ]),
        amount: t.Number({ minimum: 0.00000001 }),
        fromAddress: t.Optional(t.String()),
        txHash: t.Optional(t.String()),
        network: t.Optional(t.String()),
        metadata: t.Optional(t.Record(t.String(), t.Any())),
      }),
      detail: {
        tags: ['Banco - Transactions'],
        summary: 'Process deposit',
        description: 'Process a deposit to a wallet',
      },
    }
  )

  /**
   * Create withdrawal request
   * POST /api/v1/wallets/:id/withdraw
   */
  .post(
    '/:id/withdraw',
    { beforeHandle: [requirePermission('wallets', 'write')] },
    async ({ params, body, user, tenantId }) => {
      logger.info('Creating withdrawal request', {
        walletId: params.id,
        asset: body.asset,
        amount: body.amount,
        userId: user.id,
      });

      const result = await walletService.createWithdrawal({
        walletId: params.id,
        userId: user.id,
        tenantId,
        asset: body.asset as any,
        amount: body.amount,
        destinationAddress: body.destinationAddress,
        network: body.network,
        twoFactorCode: body.twoFactorCode,
        notes: body.notes,
      });

      return result;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        asset: t.Union([
          t.Literal('BTC'), t.Literal('ETH'), t.Literal('USDT'), t.Literal('USDC'), t.Literal('BNB'), t.Literal('SOL'), t.Literal('ADA'), t.Literal('DOT'), t.Literal('MATIC'), t.Literal('AVAX'), t.Literal('BRL'), t.Literal('USD'),
        ]),
        amount: t.Number({ minimum: 0.00000001 }),
        destinationAddress: t.String({ minLength: 1 }),
        network: t.String({ minLength: 1 }),
        twoFactorCode: t.Optional(t.String()),
        notes: t.Optional(t.String({ maxLength: 500 })),
      }),
      detail: {
        tags: ['Banco - Transactions'],
        summary: 'Create withdrawal request',
        description: 'Create a withdrawal request (requires approval)',
      },
    }
  )

  /**
   * Transfer between wallets
   * POST /api/v1/wallets/:id/transfer
   */
  .post(
    '/:id/transfer',
    { beforeHandle: [requirePermission('wallets', 'write')] },
    async ({ params, body, user, tenantId }) => {
      logger.info('Processing transfer', {
        fromWalletId: params.id,
        toWalletId: body.toWalletId,
        asset: body.asset,
        amount: body.amount,
        userId: user.id,
      });

      const result = await walletService.transfer({
        fromWalletId: params.id,
        toWalletId: body.toWalletId,
        userId: user.id,
        tenantId,
        asset: body.asset as any,
        amount: body.amount,
        description: body.description,
      });

      return result;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        toWalletId: t.String(),
        asset: t.Union([
          t.Literal('BTC'), t.Literal('ETH'), t.Literal('USDT'), t.Literal('USDC'), t.Literal('BNB'), t.Literal('SOL'), t.Literal('ADA'), t.Literal('DOT'), t.Literal('MATIC'), t.Literal('AVAX'), t.Literal('BRL'), t.Literal('USD'),
        ]),
        amount: t.Number({ minimum: 0.00000001 }),
        description: t.Optional(t.String({ maxLength: 500 })),
      }),
      detail: {
        tags: ['Banco - Transactions'],
        summary: 'Transfer between wallets',
        description: 'Transfer assets between two wallets',
      },
    }
  )

  /**
   * Get transactions
   * GET /api/v1/wallets/:id/transactions
   */
  .get(
    '/:id/transactions',
    { beforeHandle: [requirePermission('wallets', 'read')] },
    async ({ params, query, user }) => {
      logger.info('Getting transactions', { walletId: params.id, userId: user.id });

      const transactions = await walletService.getTransactions({
        walletId: params.id,
        userId: user.id,
        type: query.type as any,
        status: query.status as any,
        asset: query.asset as any,
        limit: query.limit ? parseInt(query.limit) : 100,
        offset: query.offset ? parseInt(query.offset) : 0,
      });

      return {
        success: true,
        transactions,
        total: transactions.length,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      query: t.Object({
        type: t.Optional(t.String()),
        status: t.Optional(t.String()),
        asset: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Banco - Transactions'],
        summary: 'Get wallet transactions',
        description: 'Get transaction history for a wallet with filters',
      },
    }
  )

  /**
   * Create savings goal
   * POST /api/v1/wallets/:id/goals
   */
  .post(
    '/:id/goals',
    { beforeHandle: [requirePermission('wallets', 'write')] },
    async ({ params, body, user }) => {
      const result = await walletService.createSavingsGoal({
        userId: user.id,
        walletId: params.id,
        name: body.name,
        description: body.description,
        targetAmount: body.targetAmount,
        asset: body.asset as any,
        targetDate: body.targetDate ? new Date(body.targetDate) : undefined,
        metadata: body.metadata,
      });
      return result;
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 100 }),
        description: t.Optional(t.String({ maxLength: 500 })),
        targetAmount: t.Number({ minimum: 0.00000001 }),
        asset: t.Union([
          t.Literal('BTC'), t.Literal('ETH'), t.Literal('USDT'), t.Literal('USDC'), t.Literal('BNB'), t.Literal('SOL'), t.Literal('ADA'), t.Literal('DOT'), t.Literal('MATIC'), t.Literal('AVAX'), t.Literal('BRL'), t.Literal('USD'),
        ]),
        targetDate: t.Optional(t.String()),
        metadata: t.Optional(t.Record(t.String(), t.Any())),
      }),
      detail: {
        tags: ['Banco - Savings'],
        summary: 'Create savings goal',
        description: 'Create a savings goal for a wallet',
      },
    }
  )

  /**
   * List savings goals
   * GET /api/v1/wallets/:id/goals
   */
  .get(
    '/:id/goals',
    { beforeHandle: [requirePermission('wallets', 'read')] },
    async ({ params, user }) => {
      const rows = await walletService.listSavingsGoals(user.id, params.id);
      return { success: true, data: rows, count: rows.length };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ['Banco - Savings'],
        summary: 'List savings goals',
        description: 'List active savings goals for a wallet',
      },
    }
  )

  /**
   * Add progress to a savings goal
   * POST /api/v1/wallets/goals/:goalId/progress
   */
  .post(
    '/goals/:goalId/progress',
    { beforeHandle: [requirePermission('wallets', 'write')] },
    async ({ params, body, user }) => {
      const result = await walletService.addSavingsProgress(params.goalId, user.id, body.amount);
      return result;
    },
    {
      params: t.Object({ goalId: t.String() }),
      body: t.Object({ amount: t.Number({ minimum: 0.00000001 }) }),
      detail: {
        tags: ['Banco - Savings'],
        summary: 'Add savings progress',
        description: 'Increase the current amount of a savings goal',
      },
    }
  )

  /**
   * Approve/Reject withdrawal
   * POST /api/v1/wallets/withdrawals/:id/approve
   */
  .post(
    '/withdrawals/:id/approve',
    { beforeHandle: [requirePermission('wallets', 'manage')] },
    async ({ params, body, user }) => {
      logger.info('Approving/rejecting withdrawal', {
        withdrawalId: params.id,
        approved: body.approved,
        approverId: user.id,
      });

      const result = await walletService.approveWithdrawal({
        withdrawalId: params.id,
        approverId: user.id,
        approved: body.approved,
        reason: body.reason,
      });

      return result;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        approved: t.Boolean(),
        reason: t.Optional(t.String({ maxLength: 500 })),
      }),
      detail: {
        tags: ['Banco - Admin'],
        summary: 'Approve/Reject withdrawal',
        description: 'Approve or reject a pending withdrawal request (admin only)',
      },
    }
  )

  /**
   * Preview withdrawal
   * POST /api/v1/wallets/:id/withdraw/preview
   */
  .post(
    '/:id/withdraw/preview',
    { beforeHandle: [requirePermission('wallets', 'write')] },
    async ({ params, body }) => {
      const amount = body.amount as number;
      const platformFee = amount * 0.005;
      const networkFee = 0;
      return {
        success: true,
        data: {
          asset: body.asset,
          amount,
          platformFee,
          networkFee,
          totalFee: platformFee + networkFee,
          requiresTwoFactor: true,
        },
      };
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        asset: t.Union([
          t.Literal('BTC'), t.Literal('ETH'), t.Literal('USDT'), t.Literal('USDC'), t.Literal('BNB'), t.Literal('SOL'), t.Literal('ADA'), t.Literal('DOT'), t.Literal('MATIC'), t.Literal('AVAX'), t.Literal('BRL'), t.Literal('USD'),
        ]),
        amount: t.Number({ minimum: 0.00000001 }),
      }),
      detail: {
        tags: ['Banco - Transactions'],
        summary: 'Preview withdrawal fees',
        description: 'Returns fees and 2FA requirements for a withdrawal request',
      },
    }
  )

  /**
   * List user withdrawal requests
   * GET /api/v1/wallets/withdrawals
   */
  .get(
    '/withdrawals',
    { beforeHandle: [requirePermission('wallets', 'read')] },
    async ({ user }) => {
      const rows = await walletService.listUserWithdrawals(user.id);
      return { success: true, data: rows, count: rows.length };
    },
    {
      detail: {
        tags: ['Banco - Transactions'],
        summary: 'List withdrawal requests',
        description: 'List all withdrawal requests for the authenticated user',
      },
    }
  );
