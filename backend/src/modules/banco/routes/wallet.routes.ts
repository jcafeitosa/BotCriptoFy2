/**
 * Wallet Routes
 *
 * API endpoints for wallet operations
 */

import { Elysia, t } from 'elysia';
import { walletService } from '../services/wallet.service';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import logger from '@/utils/logger';

export const walletRoutes = new Elysia({ prefix: '/api/v1/wallets' })
  .use(sessionGuard)
  .use(requireTenant)

  /**
   * Create a new wallet
   * POST /api/v1/wallets
   */
  .post(
    '/',
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
        asset: t.String(),
        amount: t.Number({ minimum: 0 }),
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
        asset: t.String(),
        amount: t.Number({ minimum: 0 }),
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
        asset: t.String(),
        amount: t.Number({ minimum: 0 }),
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
   * Approve/Reject withdrawal
   * POST /api/v1/wallets/withdrawals/:id/approve
   */
  .post(
    '/withdrawals/:id/approve',
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
  );
