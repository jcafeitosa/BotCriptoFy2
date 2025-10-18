/**
 * MMN Admin Routes – require mmn:manage
 */

import { Elysia, t } from 'elysia';
import {
  TreeService,
  VolumeService,
  CommissionService,
  RankService,
  PayoutService,
  AnalyticsService,
} from '../services';
import logger from '@/utils/logger';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import { requirePermission } from '../../security/middleware/rbac.middleware';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import type { MemberListFilters } from '../types/mmn.types';

const MEMBERS_QUERY_SCHEMA = t.Object({
  page: t.Optional(t.String()),
  limit: t.Optional(t.String()),
  status: t.Optional(t.String()),
  rank: t.Optional(t.String()),
  search: t.Optional(t.String()),
  qualified: t.Optional(t.String()),
  sort: t.Optional(t.String()),
  direction: t.Optional(t.Union([t.Literal('asc'), t.Literal('desc')])),
});

const LEADERBOARD_QUERY_SCHEMA = t.Object({
  limit: t.Optional(t.String()),
  period: t.Optional(t.String()),
});

const PAYOUT_PROCESS_SCHEMA = t.Object({
  stripeTransferId: t.Optional(t.String()),
  stripeAccountId: t.Optional(t.String()),
});

const PAYOUT_FAIL_SCHEMA = t.Object({
  failureReason: t.String(),
});

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const parseBoolean = (value: string | undefined): boolean | undefined => {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (['true', '1', 'yes'].includes(normalized)) return true;
  if (['false', '0', 'no'].includes(normalized)) return false;
  return undefined;
};

const parseCsv = (value: string | undefined): string[] | undefined => {
  if (!value) return undefined;
  const parts = value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  return parts.length > 0 ? parts : undefined;
};

const parseSortKey = (value: string | undefined): MemberListFilters['sortBy'] => {
  if (!value) return 'joinedAt';
  const normalized = value.toLowerCase();

  if (normalized === 'rank') return 'rank';
  if (normalized === 'volume') return 'volume';
  if (normalized === 'team' || normalized === 'team_size') return 'teamSize';
  if (normalized === 'commissions') return 'commissions';
  if (normalized === 'joined_at') return 'joinedAt';

  return 'joinedAt';
};

const buildMemberFilters = (query: Record<string, string | undefined>): MemberListFilters => ({
  page: Math.max(parseNumber(query.page, 1), 1),
  limit: parseNumber(query.limit, 25),
  status: parseCsv(query.status),
  ranks: parseCsv(query.rank),
  search: query.search?.trim() || undefined,
  qualified: parseBoolean(query.qualified),
  sortBy: parseSortKey(query.sort),
  sortDirection: query.direction === 'asc' ? 'asc' : 'desc',
});

export const adminRoutes = new Elysia({ prefix: '/api/v1/mmn/admin' })
  .use(sessionGuard)
  .use(requireTenant)
  .use(requirePermission('mmn', 'manage'))

  .get(
    '/members',
    async ({ tenantId, query }) => {
      const filters = buildMemberFilters(query);
      const response = await AnalyticsService.listMembers(tenantId, filters);

      logger.info('MMN admin members listed', {
        tenantId,
        filters,
        total: response.pagination.total,
      });

      return { success: true, data: response };
    },
    { query: MEMBERS_QUERY_SCHEMA },
  )

  .post(
    '/calculate-commissions',
    async ({ body, tenantId, set }) => {
      try {
        const result = await CommissionService.processCommissions(tenantId, body.period);
        return { success: true, data: result };
      } catch (error) {
        logger.error('Error processing commissions', { error });
        set.status = 500;
        return { success: false, error: 'Failed to process commissions' };
      }
    },
    { body: t.Object({ period: t.String() }) }
  )

  .get(
    '/stats',
    async ({ query, tenantId }) => {
      const volumes = await VolumeService.getTotalVolumes(tenantId, query.period);
      const payouts = await PayoutService.getTenantPayoutStats(
        tenantId,
        query.periodStart && query.periodEnd
          ? { start: new Date(query.periodStart), end: new Date(query.periodEnd) }
          : undefined,
      );
      return { success: true, data: { volumes, payouts } };
    },
    {
      query: t.Object({
        period: t.Optional(t.String()),
        periodStart: t.Optional(t.String()),
        periodEnd: t.Optional(t.String()),
      }),
    }
  )

  .post(
    '/members/:userId/qualify',
    async ({ params, body, tenantId, set }) => {
      const node = await TreeService.getNodeByUserId(params.userId, tenantId);
      if (!node) {
        set.status = 404;
        return { success: false, error: 'Member not found in MMN tree' };
      }

      const updated = await TreeService.updateQualification(node.id, body.isQualified);
      return { success: true, data: updated };
    },
    {
      params: t.Object({ userId: t.String() }),
      body: t.Object({ isQualified: t.Boolean() }),
    }
  )

  .post(
    '/members/:userId/status',
    async ({ params, body, tenantId, set }) => {
      const node = await TreeService.getNodeByUserId(params.userId, tenantId);
      if (!node) {
        set.status = 404;
        return { success: false, error: 'Member not found in MMN tree' };
      }

      const updated = await TreeService.updateNodeStatus(node.id, body.status);
      return { success: true, data: updated };
    },
    {
      params: t.Object({ userId: t.String() }),
      body: t.Object({
        status: t.Union([t.Literal('active'), t.Literal('inactive'), t.Literal('suspended')]),
      }),
    }
  )

  .post(
    '/members/:userId/calculate-rank',
    async ({ params, tenantId, set }) => {
      try {
        const rank = await RankService.calculateRank(params.userId, tenantId);
        if (!rank) {
          return { success: true, data: { message: 'Member does not qualify for a higher rank yet.' } };
        }

        return { success: true, data: rank };
      } catch (error) {
        logger.error('Error calculating rank for member', { error, userId: params.userId });
        set.status = error instanceof NotFoundError ? 404 : 500;
        return { success: false, error: error instanceof Error ? error.message : 'Failed to calculate rank' };
      }
    },
    {
      params: t.Object({ userId: t.String() }),
    }
  )

  .post(
    '/commissions/:id/approve',
    async ({ params, set }) => {
      try {
        const commission = await CommissionService.approveCommission(params.id);
        return { success: true, data: commission };
      } catch (error) {
        logger.error('Error approving commission', { error, commissionId: params.id });
        if (error instanceof NotFoundError) {
          set.status = 404;
          return { success: false, error: error.message };
        }

        set.status = 500;
        return { success: false, error: 'Failed to approve commission' };
      }
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )

  .get(
    '/payouts/pending',
    async ({ tenantId }) => {
      const payouts = await PayoutService.getPendingPayouts(tenantId);
      const memberMap = await AnalyticsService.getMemberProfiles(
        tenantId,
        payouts.map((payout) => payout.memberId),
      );

      const data = payouts.map((payout) => ({
        payout,
        member: memberMap[payout.memberId] ?? null,
      }));

      return { success: true, data: { pending: data, count: data.length } };
    }
  )

  .post(
    '/payouts/:id/process',
    async ({ params, body, set }) => {
      try {
        const payout = await PayoutService.processPayout(
          params.id,
          body.stripeTransferId,
          body.stripeAccountId,
        );
        return { success: true, data: payout };
      } catch (error) {
        logger.error('Error processing payout', { error, payoutId: params.id });

        if (error instanceof NotFoundError) {
          set.status = 404;
          return { success: false, error: error.message };
        }

        if (error instanceof BadRequestError) {
          set.status = 400;
          return { success: false, error: error.message };
        }

        set.status = 500;
        return { success: false, error: 'Failed to process payout' };
      }
    },
    {
      params: t.Object({ id: t.String() }),
      body: PAYOUT_PROCESS_SCHEMA,
    }
  )

  .post(
    '/payouts/:id/complete',
    async ({ params, set }) => {
      try {
        const payout = await PayoutService.completePayout(params.id);
        return { success: true, data: payout };
      } catch (error) {
        logger.error('Error completing payout', { error, payoutId: params.id });

        if (error instanceof NotFoundError) {
          set.status = 404;
          return { success: false, error: error.message };
        }

        set.status = 500;
        return { success: false, error: 'Failed to complete payout' };
      }
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )

  .post(
    '/payouts/:id/fail',
    async ({ params, body, set }) => {
      try {
        const payout = await PayoutService.failPayout(params.id, body.failureReason);
        return { success: true, data: payout };
      } catch (error) {
        logger.error('Error marking payout as failed', { error, payoutId: params.id });

        if (error instanceof NotFoundError) {
          set.status = 404;
          return { success: false, error: error.message };
        }

        set.status = 500;
        return { success: false, error: 'Failed to mark payout as failed' };
      }
    },
    {
      params: t.Object({ id: t.String() }),
      body: PAYOUT_FAIL_SCHEMA,
    }
  )

  .get(
    '/leaderboard',
    async ({ tenantId, query }) => {
      const limit = parseNumber(query.limit, 10);
      const entries = await AnalyticsService.getLeaderboard(tenantId, {
        limit,
        period: query.period,
      });

      return { success: true, data: { entries, count: entries.length } };
    },
    { query: LEADERBOARD_QUERY_SCHEMA },
  );
