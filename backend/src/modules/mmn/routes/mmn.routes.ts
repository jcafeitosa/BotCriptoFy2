/**
 * MMN Routes
 * Autenticadas por sessão + tenant com RBAC granular (mmn:read|write|manage)
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
import { requirePermission } from '../../security/middleware/rbac.middleware';
import type { TreePosition } from '../types/mmn.types';

const parseOptionalInt = (value?: string): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

export const mmnRoutes = new Elysia({ prefix: '/api/v1/mmn' })
  .use(sessionGuard)
  .use(requireTenant)

  // =======================================================
  // Tree & genealogy (read)
  // =======================================================

  .get(
    '/tree',
    { beforeHandle: [requirePermission('mmn', 'read')] },
    async ({ query, user, tenantId, set }) => {
      try {
        const depth = parseOptionalInt(query.depth) ?? 3;
        const tree = await TreeService.getTree(user.id, tenantId, depth);

        if (!tree) {
          set.status = 404;
          return { success: false, error: 'User not found in MMN tree' };
        }

        return { success: true, data: { tree } };
      } catch (error) {
        logger.error('Error fetching MMN tree', { error });
        set.status = 500;
        return { success: false, error: 'Failed to load tree' };
      }
    },
    {
      query: t.Object({ depth: t.Optional(t.String()) }),
      detail: {
        tags: ['MMN'],
        summary: 'Get tree structure',
        description: 'Returns binary tree structure up to a given depth',
      },
    }
  )

  .get(
    '/position',
    { beforeHandle: [requirePermission('mmn', 'read')] },
    async ({ user, tenantId, set }) => {
      try {
        const node = await TreeService.getNodeByUserId(user.id, tenantId);
        if (!node) {
          set.status = 404;
          return { success: false, error: 'User not found in MMN tree' };
        }

        const stats = await TreeService.getTreeStats(user.id, tenantId);
        return { success: true, data: { node, stats } };
      } catch (error) {
        logger.error('Error fetching MMN position', { error });
        set.status = 500;
        return { success: false, error: 'Failed to load position' };
      }
    }
  )

  .post(
    '/join',
    { beforeHandle: [requirePermission('mmn', 'write')] },
    async ({ body, user, tenantId, set }) => {
      try {
        const result = await TreeService.createNode({
          userId: user.id,
          tenantId,
          sponsorId: body.sponsorId,
          preferredPosition: body.preferredPosition as TreePosition | undefined,
        });

        return { success: true, data: result };
      } catch (error) {
        logger.error('Error joining MMN', { error, userId: user.id });
        set.status = 400;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to join MMN',
        };
      }
    },
    {
      body: t.Object({
        sponsorId: t.String(),
        preferredPosition: t.Optional(t.Union([t.Literal('left'), t.Literal('right')])),
      }),
    }
  )

  .get(
    '/genealogy',
    { beforeHandle: [requirePermission('mmn', 'read')] },
    async ({ user, tenantId }) => {
      const stats = await GenealogyService.getGenealogyStats(user.id, tenantId);
      return { success: true, data: stats };
    }
  )

  .get(
    '/downline',
    { beforeHandle: [requirePermission('mmn', 'read')] },
    async ({ query, user, tenantId }) => {
      const downline = await GenealogyService.getDownline(
        user.id,
        tenantId,
        parseOptionalInt(query.levels),
        query.leg as TreePosition | undefined,
      );
      return { success: true, data: { members: downline, count: downline.length } };
    },
    {
      query: t.Object({
        leg: t.Optional(t.Union([t.Literal('left'), t.Literal('right')])),
        levels: t.Optional(t.String()),
      }),
    }
  )

  .get(
    '/upline',
    { beforeHandle: [requirePermission('mmn', 'read')] },
    async ({ query, user, tenantId }) => {
      const upline = await GenealogyService.getUpline(
        user.id,
        tenantId,
        parseOptionalInt(query.levels),
      );
      return { success: true, data: { members: upline, count: upline.length } };
    },
    { query: t.Object({ levels: t.Optional(t.String()) }) }
  )

  // =======================================================
  // Volumes, commissions, ranks, payouts
  // =======================================================

  .get(
    '/volumes',
    { beforeHandle: [requirePermission('mmn', 'read')] },
    async ({ query, user, tenantId, set }) => {
      const node = await TreeService.getNodeByUserId(user.id, tenantId);
      if (!node) {
        set.status = 404;
        return { success: false, error: 'User not found in MMN tree' };
      }

      const volumes = await VolumeService.getVolumes(node.id, query.period);
      const calculation = await VolumeService.calculateLegVolumes(node.id, query.period);

      return { success: true, data: { volumes, calculation } };
    },
    { query: t.Object({ period: t.Optional(t.String()) }) }
  )

  .get(
    '/commissions',
    { beforeHandle: [requirePermission('mmn', 'read')] },
    async ({ query, user, tenantId, set }) => {
      const node = await TreeService.getNodeByUserId(user.id, tenantId);
      if (!node) {
        set.status = 404;
        return { success: false, error: 'User not found in MMN tree' };
      }

      const filters: Record<string, any> = {};
      if (query.type) filters.type = query.type.split(',');
      if (query.status) filters.status = query.status.split(',');
      if (query.period) filters.period = query.period;

      const commissions = await CommissionService.getCommissions(node.id, filters);
      const pendingBalance = await CommissionService.getPendingBalance(node.id);
      const totals = await CommissionService.getTotalsByType(node.id, query.period);

      return {
        success: true,
        data: { commissions, pendingBalance, totals, count: commissions.length },
      };
    },
    {
      query: t.Object({
        type: t.Optional(t.String()),
        status: t.Optional(t.String()),
        period: t.Optional(t.String()),
      }),
    }
  )

  .get(
    '/rank',
    { beforeHandle: [requirePermission('mmn', 'read')] },
    async ({ user, tenantId }) => {
      const [current, progress, history] = await Promise.all([
        RankService.getCurrentRank(user.id, tenantId),
        RankService.getRankProgress(user.id, tenantId),
        RankService.getRankHistory(user.id, tenantId),
      ]);

      return { success: true, data: { current, progress, history } };
    }
  )

  .get(
    '/payouts',
    { beforeHandle: [requirePermission('mmn', 'read')] },
    async ({ query, user, tenantId }) => {
      const filters: Record<string, any> = {};
      if (query.status) filters.status = query.status.split(',');
      if (query.limit) filters.limit = Number(query.limit);

      const payouts = await PayoutService.getPayouts(user.id, tenantId, filters);
      const stats = await PayoutService.getPayoutStats(user.id, tenantId);

      return { success: true, data: { payouts, stats, count: payouts.length } };
    },
    {
      query: t.Object({ status: t.Optional(t.String()), limit: t.Optional(t.String()) }),
    }
  )

  .post(
    '/request-payout',
    { beforeHandle: [requirePermission('mmn', 'write')] },
    async ({ body, user, tenantId, set }) => {
      try {
        const payout = await PayoutService.requestPayout(
          user.id,
          tenantId,
          body.amount,
          body.method,
          body.bankInfo,
        );
        return { success: true, data: payout };
      } catch (error) {
        logger.error('Error requesting payout', { error, userId: user.id });
        set.status = 400;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to request payout',
        };
      }
    },
    {
      body: t.Object({
        amount: t.Number({ minimum: 0 }),
        method: t.Union([t.Literal('stripe'), t.Literal('bank_transfer'), t.Literal('pix')]),
        bankInfo: t.Optional(
          t.Object({
            bankName: t.Optional(t.String()),
            accountNumber: t.Optional(t.String()),
            routingNumber: t.Optional(t.String()),
            pixKey: t.Optional(t.String()),
          })
        ),
      }),
    }
  )

  .post(
    '/payouts/:id/cancel',
    { beforeHandle: [requirePermission('mmn', 'write')] },
    async ({ params, user, tenantId, set }) => {
      try {
        const payout = await PayoutService.cancelPayout(params.id, user.id, tenantId);
        return { success: true, data: payout };
      } catch (error) {
        logger.error('Error cancelling payout', { error, payoutId: params.id });
        set.status = 400;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to cancel payout',
        };
      }
    },
    {
      params: t.Object({ id: t.String() }),
    }
  );
