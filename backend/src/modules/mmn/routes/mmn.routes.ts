/**
 * MMN Routes
 * API endpoints for MMN tree, volumes, commissions, and payouts
 */

import { Elysia, t } from 'elysia';
import {
  TreeService,
  GenealogyService,
  VolumeService,
  CommissionService,
  RankService,
  PayoutService,
} from '../services';
import logger from '@/utils/logger';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';

export const mmnRoutes = new Elysia({ prefix: '/api/v1/mmn' })
  .use(sessionGuard)
  .use(requireTenant)

  /**
   * Get tree structure
   * GET /api/v1/mmn/tree
   */
  .get(
    '/tree',
    async ({ query, user, tenantId }: any) => {
      logger.info('Getting MMN tree', { userId: user.id });

      const depth = query.depth ? parseInt(query.depth) : 3;
      const tree = await TreeService.getTree(user.id, tenantId, depth);

      return { tree };
    },
    {
      query: t.Object({
        depth: t.Optional(t.String()),
      }),
      detail: {
        tags: ['MMN'],
        summary: 'Get tree structure',
        description: 'Get binary tree structure with specified depth',
      },
    }
  )

  /**
   * Get position in tree
   * GET /api/v1/mmn/position
   */
  .get(
    '/position',
    async ({ user, tenantId }: any) => {
      logger.info('Getting MMN position', { userId: user.id });

      const node = await TreeService.getNodeByUserId(user.id, tenantId);

      if (!node) {
        return { error: 'Not in MMN tree' };
      }

      const stats = await TreeService.getTreeStats(user.id, tenantId);

      return { node, stats };
    },
    {
      detail: {
        tags: ['MMN'],
        summary: 'Get position in tree',
        description: 'Get current position and statistics in binary tree',
      },
    }
  )

  /**
   * Join MMN
   * POST /api/v1/mmn/join
   */
  .post(
    '/join',
    async ({ body, user, tenantId }: any) => {
      logger.info('Joining MMN', {
        userId: user.id,
        sponsorId: body.sponsorId,
      });

      const { node, placement } = await TreeService.createNode({
        userId: user.id,
        tenantId,
        sponsorId: body.sponsorId,
        preferredPosition: body.preferredPosition,
      });

      return { node, placement };
    },
    {
      body: t.Object({
        sponsorId: t.String(),
        preferredPosition: t.Optional(t.Union([t.Literal('left'), t.Literal('right')])),
      }),
      detail: {
        tags: ['MMN'],
        summary: 'Join MMN',
        description: 'Join MMN tree under a sponsor with automatic placement',
      },
    }
  )

  /**
   * Get genealogy
   * GET /api/v1/mmn/genealogy
   */
  .get(
    '/genealogy',
    async ({ user, tenantId }: any) => {
      logger.info('Getting genealogy', { userId: user.id });

      const stats = await GenealogyService.getGenealogyStats(user.id, tenantId);

      return { stats };
    },
    {
      detail: {
        tags: ['MMN'],
        summary: 'Get genealogy',
        description: 'Get complete genealogy statistics',
      },
    }
  )

  /**
   * Get downline
   * GET /api/v1/mmn/downline
   */
  .get(
    '/downline',
    async ({ query, user, tenantId }: any) => {
      logger.info('Getting downline', { userId: user.id, leg: query.leg });

      const downline = await GenealogyService.getDownline(
        user.id,
        tenantId,
        query.levels ? parseInt(query.levels) : undefined,
        query.leg as any
      );

      return { downline, count: downline.length };
    },
    {
      query: t.Object({
        leg: t.Optional(t.Union([t.Literal('left'), t.Literal('right')])),
        levels: t.Optional(t.String()),
      }),
      detail: {
        tags: ['MMN'],
        summary: 'Get downline',
        description: 'Get downline members with optional leg and level filters',
      },
    }
  )

  /**
   * Get upline
   * GET /api/v1/mmn/upline
   */
  .get(
    '/upline',
    async ({ query, user, tenantId }: any) => {
      logger.info('Getting upline', { userId: user.id });

      const upline = await GenealogyService.getUpline(
        user.id,
        tenantId,
        query.levels ? parseInt(query.levels) : undefined
      );

      return { upline, count: upline.length };
    },
    {
      query: t.Object({
        levels: t.Optional(t.String()),
      }),
      detail: {
        tags: ['MMN'],
        summary: 'Get upline',
        description: 'Get upline ancestors with optional level filter',
      },
    }
  )

  /**
   * Get volumes
   * GET /api/v1/mmn/volumes
   */
  .get(
    '/volumes',
    async ({ query, user, tenantId }: any) => {
      logger.info('Getting volumes', { userId: user.id });

      const node = await TreeService.getNodeByUserId(user.id, tenantId);

      if (!node) {
        return { error: 'Not in MMN tree' };
      }

      const volumes = await VolumeService.getVolumes(node.id, query.period);
      const calculation = await VolumeService.calculateLegVolumes(node.id, query.period);

      return { volumes, calculation };
    },
    {
      query: t.Object({
        period: t.Optional(t.String()),
      }),
      detail: {
        tags: ['MMN'],
        summary: 'Get volumes',
        description: 'Get volume statistics for current or specified period',
      },
    }
  )

  /**
   * Get commissions
   * GET /api/v1/mmn/commissions
   */
  .get(
    '/commissions',
    async ({ query, user, tenantId }: any) => {
      logger.info('Getting commissions', { userId: user.id });

      const node = await TreeService.getNodeByUserId(user.id, tenantId);

      if (!node) {
        return { error: 'Not in MMN tree' };
      }

      const filters: any = {};

      if (query.type) {
        filters.type = query.type.split(',');
      }

      if (query.status) {
        filters.status = query.status.split(',');
      }

      if (query.period) {
        filters.period = query.period;
      }

      const commissions = await CommissionService.getCommissions(node.id, filters);
      const pendingBalance = await CommissionService.getPendingBalance(node.id);
      const totals = await CommissionService.getTotalsByType(node.id, query.period);

      return {
        commissions,
        pendingBalance,
        totals,
        count: commissions.length,
      };
    },
    {
      query: t.Object({
        type: t.Optional(t.String()),
        status: t.Optional(t.String()),
        period: t.Optional(t.String()),
      }),
      detail: {
        tags: ['MMN'],
        summary: 'Get commissions',
        description: 'Get commission history with filters',
      },
    }
  )

  /**
   * Get rank
   * GET /api/v1/mmn/rank
   */
  .get(
    '/rank',
    async ({ user, tenantId }: any) => {
      logger.info('Getting rank', { userId: user.id });

      const currentRank = await RankService.getCurrentRank(user.id, tenantId);
      const progress = await RankService.getRankProgress(user.id, tenantId);
      const history = await RankService.getRankHistory(user.id, tenantId);

      return {
        current: currentRank,
        progress,
        history,
      };
    },
    {
      detail: {
        tags: ['MMN'],
        summary: 'Get rank',
        description: 'Get current rank, progress to next rank, and rank history',
      },
    }
  )

  /**
   * Get payouts
   * GET /api/v1/mmn/payouts
   */
  .get(
    '/payouts',
    async ({ query, user, tenantId }: any) => {
      logger.info('Getting payouts', { userId: user.id });

      const filters: any = {};

      if (query.status) {
        filters.status = query.status.split(',');
      }

      if (query.limit) {
        filters.limit = parseInt(query.limit);
      }

      const payouts = await PayoutService.getPayouts(user.id, tenantId, filters);
      const stats = await PayoutService.getPayoutStats(user.id, tenantId);

      return {
        payouts,
        stats,
        count: payouts.length,
      };
    },
    {
      query: t.Object({
        status: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
      detail: {
        tags: ['MMN'],
        summary: 'Get payouts',
        description: 'Get payout history and statistics',
      },
    }
  )

  /**
   * Request payout
   * POST /api/v1/mmn/request-payout
   */
  .post(
    '/request-payout',
    async ({ body, user, tenantId }: any) => {
      logger.info('Requesting payout', {
        userId: user.id,
        amount: body.amount,
      });

      const payout = await PayoutService.requestPayout(
        user.id,
        tenantId,
        body.amount,
        body.method,
        body.bankInfo
      );

      return { payout };
    },
    {
      body: t.Object({
        amount: t.Number(),
        method: t.Union([
          t.Literal('stripe'),
          t.Literal('bank_transfer'),
          t.Literal('pix'),
        ]),
        bankInfo: t.Optional(
          t.Object({
            bankName: t.Optional(t.String()),
            accountNumber: t.Optional(t.String()),
            routingNumber: t.Optional(t.String()),
            pixKey: t.Optional(t.String()),
          })
        ),
      }),
      detail: {
        tags: ['MMN'],
        summary: 'Request payout',
        description: 'Request payout of accumulated commissions',
      },
    }
  )

  /**
   * Cancel payout
   * POST /api/v1/mmn/payouts/:id/cancel
   */
  .post(
    '/payouts/:id/cancel',
    async ({ params, user, tenantId }: any) => {
      logger.info('Cancelling payout', {
        userId: user.id,
        payoutId: params.id,
      });

      const payout = await PayoutService.cancelPayout(params.id, user.id, tenantId);

      return { payout };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ['MMN'],
        summary: 'Cancel payout',
        description: 'Cancel pending payout request',
      },
    }
  );
