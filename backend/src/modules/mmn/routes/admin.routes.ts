/**
 * MMN Admin Routes
 * Administrative endpoints for MMN management
 */

import { Elysia, t } from 'elysia';
import {
  TreeService,
  VolumeService,
  CommissionService,
  RankService,
  PayoutService,
} from '../services';
import logger from '@/utils/logger';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import { requireAnyRole } from '../../security/middleware/rbac.middleware';

export const adminRoutes = new Elysia({ prefix: '/api/v1/mmn/admin' })
  .use(sessionGuard)
  .use(requireTenant)
  .use(requireAnyRole(['super_admin', 'admin']))

  /**
   * Get all members
   * GET /api/v1/mmn/admin/members
   */
  .get(
    '/members',
    async ({ tenantId }: any) => {
      logger.info('Getting all MMN members', { tenantId });

      // This would need pagination in production
      // For now, simplified implementation
      return {
        members: [],
        count: 0,
      };
    },
    {
      detail: {
        tags: ['MMN - Admin'],
        summary: 'Get all members',
        description: 'Get all members in MMN tree (admin only)',
      },
    }
  )

  /**
   * Process commissions for period
   * POST /api/v1/mmn/admin/calculate-commissions
   */
  .post(
    '/calculate-commissions',
    async ({ body, tenantId }: any) => {
      logger.info('Processing commissions', {
        tenantId,
        period: body.period,
      });

      const result = await CommissionService.processCommissions(
        tenantId,
        body.period
      );

      return { result };
    },
    {
      body: t.Object({
        period: t.String(),
      }),
      detail: {
        tags: ['MMN - Admin'],
        summary: 'Process commissions',
        description: 'Calculate and process all commissions for a period',
      },
    }
  )

  /**
   * Get statistics
   * GET /api/v1/mmn/admin/stats
   */
  .get(
    '/stats',
    async ({ query, tenantId }: any) => {
      logger.info('Getting MMN statistics', { tenantId });

      const volumes = await VolumeService.getTotalVolumes(
        tenantId,
        query.period
      );

      const payoutStats = await PayoutService.getTenantPayoutStats(
        tenantId,
        query.period ? {
          start: new Date(query.periodStart),
          end: new Date(query.periodEnd),
        } : undefined
      );

      return {
        volumes,
        payouts: payoutStats,
      };
    },
    {
      query: t.Object({
        period: t.Optional(t.String()),
        periodStart: t.Optional(t.String()),
        periodEnd: t.Optional(t.String()),
      }),
      detail: {
        tags: ['MMN - Admin'],
        summary: 'Get statistics',
        description: 'Get tenant-wide MMN statistics',
      },
    }
  )

  /**
   * Update member qualification
   * POST /api/v1/mmn/admin/members/:userId/qualify
   */
  .post(
    '/members/:userId/qualify',
    async ({ params, body, tenantId }: any) => {
      logger.info('Updating member qualification', {
        userId: params.userId,
        isQualified: body.isQualified,
      });

      const node = await TreeService.getNodeByUserId(params.userId, tenantId);

      if (!node) {
        return { error: 'Member not found in MMN tree' };
      }

      const updated = await TreeService.updateQualification(
        node.id,
        body.isQualified
      );

      return { node: updated };
    },
    {
      params: t.Object({
        userId: t.String(),
      }),
      body: t.Object({
        isQualified: t.Boolean(),
      }),
      detail: {
        tags: ['MMN - Admin'],
        summary: 'Update qualification',
        description: 'Update member qualification status',
      },
    }
  )

  /**
   * Update member status
   * POST /api/v1/mmn/admin/members/:userId/status
   */
  .post(
    '/members/:userId/status',
    async ({ params, body, tenantId }: any) => {
      logger.info('Updating member status', {
        userId: params.userId,
        status: body.status,
      });

      const node = await TreeService.getNodeByUserId(params.userId, tenantId);

      if (!node) {
        return { error: 'Member not found in MMN tree' };
      }

      const updated = await TreeService.updateNodeStatus(node.id, body.status);

      return { node: updated };
    },
    {
      params: t.Object({
        userId: t.String(),
      }),
      body: t.Object({
        status: t.Union([
          t.Literal('active'),
          t.Literal('inactive'),
          t.Literal('suspended'),
        ]),
      }),
      detail: {
        tags: ['MMN - Admin'],
        summary: 'Update status',
        description: 'Update member status',
      },
    }
  )

  /**
   * Get pending payouts
   * GET /api/v1/mmn/admin/payouts/pending
   */
  .get(
    '/payouts/pending',
    async ({ tenantId }: any) => {
      logger.info('Getting pending payouts', { tenantId });

      const payouts = await PayoutService.getPendingPayouts(tenantId);

      return {
        payouts,
        count: payouts.length,
        totalAmount: payouts.reduce((sum, p) => sum + parseFloat(p.amount), 0),
      };
    },
    {
      detail: {
        tags: ['MMN - Admin'],
        summary: 'Get pending payouts',
        description: 'Get all pending payout requests',
      },
    }
  )

  /**
   * Process payout
   * POST /api/v1/mmn/admin/payouts/:id/process
   */
  .post(
    '/payouts/:id/process',
    async ({ params, body }: any) => {
      logger.info('Processing payout', { payoutId: params.id });

      const payout = await PayoutService.processPayout(
        params.id,
        body.stripeTransferId,
        body.stripeAccountId
      );

      return { payout };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        stripeTransferId: t.Optional(t.String()),
        stripeAccountId: t.Optional(t.String()),
      }),
      detail: {
        tags: ['MMN - Admin'],
        summary: 'Process payout',
        description: 'Process pending payout',
      },
    }
  )

  /**
   * Complete payout
   * POST /api/v1/mmn/admin/payouts/:id/complete
   */
  .post(
    '/payouts/:id/complete',
    async ({ params }: any) => {
      logger.info('Completing payout', { payoutId: params.id });

      const payout = await PayoutService.completePayout(params.id);

      return { payout };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ['MMN - Admin'],
        summary: 'Complete payout',
        description: 'Mark payout as completed',
      },
    }
  )

  /**
   * Fail payout
   * POST /api/v1/mmn/admin/payouts/:id/fail
   */
  .post(
    '/payouts/:id/fail',
    async ({ params, body }: any) => {
      logger.info('Failing payout', { payoutId: params.id });

      const payout = await PayoutService.failPayout(params.id, body.reason);

      return { payout };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        reason: t.String(),
      }),
      detail: {
        tags: ['MMN - Admin'],
        summary: 'Fail payout',
        description: 'Mark payout as failed with reason',
      },
    }
  )

  /**
   * Approve commission
   * POST /api/v1/mmn/admin/commissions/:id/approve
   */
  .post(
    '/commissions/:id/approve',
    async ({ params }: any) => {
      logger.info('Approving commission', { commissionId: params.id });

      const commission = await CommissionService.approveCommission(params.id);

      return { commission };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ['MMN - Admin'],
        summary: 'Approve commission',
        description: 'Approve pending commission',
      },
    }
  )

  /**
   * Calculate rank for member
   * POST /api/v1/mmn/admin/members/:userId/calculate-rank
   */
  .post(
    '/members/:userId/calculate-rank',
    async ({ params, tenantId }: any) => {
      logger.info('Calculating rank', { userId: params.userId });

      const rank = await RankService.calculateRank(params.userId, tenantId);

      return { rank };
    },
    {
      params: t.Object({
        userId: t.String(),
      }),
      detail: {
        tags: ['MMN - Admin'],
        summary: 'Calculate rank',
        description: 'Calculate and update member rank',
      },
    }
  )

  /**
   * Get rank leaderboard
   * GET /api/v1/mmn/admin/leaderboard
   */
  .get(
    '/leaderboard',
    async ({ query, tenantId }: any) => {
      logger.info('Getting rank leaderboard', { tenantId });

      const limit = query.limit ? parseInt(query.limit) : 50;
      const leaderboard = await RankService.getRankLeaderboard(tenantId, limit);

      return {
        leaderboard,
        count: leaderboard.length,
      };
    },
    {
      query: t.Object({
        limit: t.Optional(t.String()),
      }),
      detail: {
        tags: ['MMN - Admin'],
        summary: 'Get leaderboard',
        description: 'Get rank leaderboard',
      },
    }
  );
