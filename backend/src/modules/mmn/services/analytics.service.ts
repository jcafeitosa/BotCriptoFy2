/**
 * MMN Analytics Service
 * Consolida métricas avançadas para administração e visualização da rede.
 */

import { db } from '@/db';
import {
  sql,
  eq,
  and,
  or,
  inArray,
  desc,
  asc,
  ilike,
  type SQL,
} from 'drizzle-orm';
import {
  mmnTree,
  mmnGenealogy,
  mmnVolumes,
  mmnCommissions,
  mmnRanks,
} from '../schema/mmn.schema';
import { users } from '../../auth/schema/auth.schema';
import type {
  DownlineSnapshot,
  GrowthPoint,
  LeaderboardEntry,
  MemberListFilters,
  MemberStatus,
  MemberSummary,
  NetworkHealth,
  PaginatedResponse,
} from '../types/mmn.types';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

/**
 * Gera sequência contínua de buckets mensais no formato YYYY-MM.
 */
export function generateMonthlyBuckets(start: Date, months: number): string[] {
  if (months <= 0) {
    return [];
  }

  const buckets: string[] = [];
  const base = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));

  for (let i = 0; i < months; i++) {
    const current = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + i, 1));
    buckets.push(formatYearMonth(current));
  }

  return buckets;
}

/**
 * Mescla métricas por mês garantindo preenchimento de zeros onde não há dados.
 */
export function mergeMonthlyMetrics(
  buckets: string[],
  membersMap: Map<string, { newMembers: number; qualifiedMembers: number }>,
  volumeMap: Map<string, number>,
  commissionMap: Map<string, number>,
): GrowthPoint[] {
  return buckets.map((period) => {
    const memberMetrics = membersMap.get(period);
    return {
      period,
      newMembers: memberMetrics?.newMembers ?? 0,
      qualifiedMembers: memberMetrics?.qualifiedMembers ?? 0,
      totalVolume: volumeMap.get(period) ?? 0,
      totalCommissions: commissionMap.get(period) ?? 0,
    };
  });
}

function formatYearMonth(date: Date): string {
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

function clampLimit(value?: number): number {
  if (!value || Number.isNaN(value)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.max(value, 1), MAX_LIMIT);
}

function resolveSortExpression(
  sortBy: MemberListFilters['sortBy'],
  expressions: {
    joinedAt: typeof mmnTree.joinedAt;
    rankLevel: SQL<number>;
    totalVolume: SQL<number>;
    teamSize: SQL<number>;
    pendingCommissions: SQL<number>;
  },
): SQL | typeof mmnTree.joinedAt | null {
  switch (sortBy) {
    case 'rank':
      return expressions.rankLevel;
    case 'volume':
      return expressions.totalVolume;
    case 'teamSize':
      return expressions.teamSize;
    case 'commissions':
      return expressions.pendingCommissions;
    case 'joinedAt':
    default:
      return expressions.joinedAt;
  }
}

function normalizeMemberStatus(values?: string[]): MemberStatus[] | undefined {
  if (!values || values.length === 0) {
    return undefined;
  }

  const normalized = values
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is MemberStatus =>
      ['active', 'inactive', 'suspended'].includes(value),
    );

  return normalized.length > 0 ? normalized : undefined;
}

function resolvePeriodStart(period?: string): Date | undefined {
  if (!period) {
    return undefined;
  }

  const normalized = period.trim().toLowerCase();

  if (normalized === '30d') {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - 30);
    return date;
  }

  if (normalized === '90d') {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - 90);
    return date;
  }

  if (normalized.startsWith('month:')) {
    const [, monthStr] = normalized.split(':');
    const [year, month] = monthStr.split('-').map((value) => Number.parseInt(value, 10));

    if (!Number.isNaN(year) && !Number.isNaN(month)) {
      return new Date(Date.UTC(year, month - 1, 1));
    }
  }

  return undefined;
}

function buildDownlineSnapshot(
  members: Array<{ status: string; isQualified: boolean; level: number }>,
): DownlineSnapshot[] {
  return members.map((member) => ({
    status: ['active', 'inactive', 'suspended'].includes(member.status)
      ? (member.status as MemberStatus)
      : ('inactive' as MemberStatus),
    isQualified: Boolean(member.isQualified),
    level: member.level ?? 0,
  }));
}

function computeLeaderboardScore(entry: LeaderboardEntry): number {
  const volumeScore = entry.totalVolume;
  const commissionScore = entry.totalCommissions * 2;
  const teamScore = entry.teamSize * 50;
  const rankScore = (entry.rankLevel ?? 0) * 250;

  return volumeScore + commissionScore + teamScore + rankScore;
}

function mapMemberStatus(status: string): MemberStatus {
  if (status === 'inactive' || status === 'suspended') {
    return status;
  }

  return 'active';
}

export class AnalyticsService {
  /**
   * Lista membros com métricas agregadas.
   */
  static async listMembers(
    tenantId: string,
    filters: MemberListFilters,
  ): Promise<PaginatedResponse<MemberSummary>> {
    const page = Math.max(filters.page, 1);
    const limit = clampLimit(filters.limit);
    const offset = (page - 1) * limit;

    const conditions = [eq(mmnTree.tenantId, tenantId)];

    const statusList = normalizeMemberStatus(filters.status?.map((value) => value.toLowerCase()));
    if (statusList?.length) {
      conditions.push(inArray(mmnTree.status, statusList));
    }

    if (typeof filters.qualified === 'boolean') {
      conditions.push(eq(mmnTree.isQualified, filters.qualified));
    }

    if (filters.search) {
      const term = `%${filters.search.toLowerCase()}%`;
      conditions.push(
        or(
          ilike(users.name, term),
          ilike(users.email, term),
        ),
      );
    }

    if (filters.ranks?.length) {
      conditions.push(inArray(mmnRanks.rankName, filters.ranks));
    }

    const whereClause = and(...conditions);

    const [{ count }] = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${mmnTree.id})::int`,
      })
      .from(mmnTree)
      .innerJoin(users, eq(mmnTree.userId, users.id))
      .leftJoin(
        mmnRanks,
        and(eq(mmnRanks.memberId, mmnTree.id), eq(mmnRanks.isActive, true)),
      )
      .where(whereClause);

    const rankLevelExpr = sql<number>`COALESCE(${mmnRanks.rankLevel}, 0)`;
    const totalVolumeExpr = sql<number>`
      COALESCE((
        SELECT SUM(v.total_volume::numeric)
        FROM mmn_volumes v
        WHERE v.member_id = ${mmnTree.id}
      ), 0)::float
    `;
    const teamSizeExpr = sql<number>`
      (
        SELECT COUNT(*)::int
        FROM mmn_genealogy g
        WHERE g.ancestor_id = ${mmnTree.id}
      )
    `;
    const pendingCommissionsExpr = sql<number>`
      COALESCE((
        SELECT SUM(c.amount::numeric)
        FROM mmn_commissions c
        WHERE c.member_id = ${mmnTree.id}
          AND c.status IN ('pending', 'approved')
      ), 0)::float
    `;

    const primaryOrderExpression = resolveSortExpression(filters.sortBy, {
      joinedAt: mmnTree.joinedAt,
      rankLevel: rankLevelExpr,
      totalVolume: totalVolumeExpr,
      teamSize: teamSizeExpr,
      pendingCommissions: pendingCommissionsExpr,
    });

    const orderClauses = [];
    if (primaryOrderExpression) {
      orderClauses.push(
        filters.sortDirection === 'asc'
          ? asc(primaryOrderExpression)
          : desc(primaryOrderExpression),
      );
    }
    // Ordem secundária consistente
    orderClauses.push(desc(mmnTree.joinedAt));

    const records = await db
      .select({
        memberId: mmnTree.id,
        userId: mmnTree.userId,
        name: users.name,
        email: users.email,
        sponsorId: mmnTree.sponsorId,
        status: mmnTree.status,
        isQualified: mmnTree.isQualified,
        level: mmnTree.level,
        position: mmnTree.position,
        rankName: mmnRanks.rankName,
        rankLevel: mmnRanks.rankLevel,
        joinedAt: mmnTree.joinedAt,
        totalVolume: totalVolumeExpr,
        teamSize: teamSizeExpr,
        pendingCommissions: pendingCommissionsExpr,
      })
      .from(mmnTree)
      .innerJoin(users, eq(mmnTree.userId, users.id))
      .leftJoin(
        mmnRanks,
        and(eq(mmnRanks.memberId, mmnTree.id), eq(mmnRanks.isActive, true)),
      )
      .where(whereClause)
      .orderBy(...orderClauses)
      .limit(limit)
      .offset(offset);

    const data: MemberSummary[] = records.map((record) => ({
      memberId: record.memberId,
      userId: record.userId,
      name: record.name,
      email: record.email,
      sponsorId: record.sponsorId,
      status: mapMemberStatus(record.status),
      isQualified: record.isQualified,
      level: record.level,
      position: record.position,
      rankName: record.rankName ?? null,
      rankLevel: record.rankLevel ?? null,
      joinedAt: record.joinedAt,
      teamSize: record.teamSize ?? 0,
      totalVolume: Number(record.totalVolume ?? 0),
      pendingCommissions: Number(record.pendingCommissions ?? 0),
    }));

    const totalPages = Math.max(Math.ceil(count / limit), 1);

    return {
      data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Retorna leaderboard de membros com base em múltiplas métricas.
   */
  static async getLeaderboard(
    tenantId: string,
    options?: { limit?: number; period?: string },
  ): Promise<LeaderboardEntry[]> {
    const limit = clampLimit(options?.limit ?? 10);
    const periodStart = resolvePeriodStart(options?.period);

    const volumeExpr = periodStart
      ? sql<number>`
        COALESCE((
          SELECT SUM(v.total_volume::numeric)
          FROM mmn_volumes v
          WHERE v.member_id = ${mmnTree.id}
            AND v.period_start >= ${periodStart}
        ), 0)::float
      `
      : sql<number>`
        COALESCE((
          SELECT SUM(v.total_volume::numeric)
          FROM mmn_volumes v
          WHERE v.member_id = ${mmnTree.id}
        ), 0)::float
      `;

    const commissionExpr = periodStart
      ? sql<number>`
        COALESCE((
          SELECT SUM(c.amount::numeric)
          FROM mmn_commissions c
          WHERE c.member_id = ${mmnTree.id}
            AND c.created_at >= ${periodStart}
        ), 0)::float
      `
      : sql<number>`
        COALESCE((
          SELECT SUM(c.amount::numeric)
          FROM mmn_commissions c
          WHERE c.member_id = ${mmnTree.id}
        ), 0)::float
      `;

    const teamSizeExpr = sql<number>`
      (
        SELECT COUNT(*)::int
        FROM mmn_genealogy g
        WHERE g.ancestor_id = ${mmnTree.id}
      )
    `;

    const rawEntries = await db
      .select({
        memberId: mmnTree.id,
        userId: mmnTree.userId,
        name: users.name,
        email: users.email,
        rankName: mmnRanks.rankName,
        rankLevel: mmnRanks.rankLevel,
        teamSize: teamSizeExpr,
        totalVolume: volumeExpr,
        totalCommissions: commissionExpr,
      })
      .from(mmnTree)
      .innerJoin(users, eq(mmnTree.userId, users.id))
      .leftJoin(
        mmnRanks,
        and(eq(mmnRanks.memberId, mmnTree.id), eq(mmnRanks.isActive, true)),
      )
      .where(eq(mmnTree.tenantId, tenantId))
      .orderBy(desc(teamSizeExpr), desc(volumeExpr), desc(mmnTree.joinedAt))
      .limit(limit * 4);

    const enriched: LeaderboardEntry[] = rawEntries.map((entry) => {
      const data: LeaderboardEntry = {
        memberId: entry.memberId,
        userId: entry.userId,
        name: entry.name,
        email: entry.email,
        rankName: entry.rankName ?? null,
        rankLevel: entry.rankLevel ?? null,
        teamSize: entry.teamSize ?? 0,
        totalVolume: Number(entry.totalVolume ?? 0),
        totalCommissions: Number(entry.totalCommissions ?? 0),
        score: 0,
      };

      data.score = computeLeaderboardScore(data);
      return data;
    });

    return enriched
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Recupera dados básicos de membros específicos (nome, email, rank).
   */
  static async getMemberProfiles(
    tenantId: string,
    memberIds: string[],
  ): Promise<Record<string, { userId: string; name: string; email: string; rankName: string | null; rankLevel: number | null }>> {
    if (memberIds.length === 0) {
      return {};
    }

    const rows = await db
      .select({
        memberId: mmnTree.id,
        userId: mmnTree.userId,
        name: users.name,
        email: users.email,
        rankName: mmnRanks.rankName,
        rankLevel: mmnRanks.rankLevel,
      })
      .from(mmnTree)
      .innerJoin(users, eq(mmnTree.userId, users.id))
      .leftJoin(
        mmnRanks,
        and(eq(mmnRanks.memberId, mmnTree.id), eq(mmnRanks.isActive, true)),
      )
      .where(
        and(eq(mmnTree.tenantId, tenantId), inArray(mmnTree.id, memberIds)),
      );

    const map: Record<string, { userId: string; name: string; email: string; rankName: string | null; rankLevel: number | null }> =
      {};

    for (const row of rows) {
      map[row.memberId] = {
        userId: row.userId,
        name: row.name,
        email: row.email,
        rankName: row.rankName ?? null,
        rankLevel: row.rankLevel ?? null,
      };
    }

    return map;
  }

  /**
   * Calcula métricas de crescimento mensal.
   */
  static async getGrowthMetrics(
    tenantId: string,
    months: number = 6,
  ): Promise<GrowthPoint[]> {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));

    const buckets = generateMonthlyBuckets(start, months);

    const memberRows = await db
      .select({
        period: sql<string>`to_char(date_trunc('month', ${mmnTree.joinedAt}), 'YYYY-MM')`,
        newMembers: sql<number>`COUNT(*)::int`,
        qualifiedMembers: sql<number>`
          SUM(CASE WHEN ${mmnTree.isQualified} THEN 1 ELSE 0 END)::int
        `,
      })
      .from(mmnTree)
      .where(
        and(
          eq(mmnTree.tenantId, tenantId),
          sql`date_trunc('month', ${mmnTree.joinedAt}) >= date_trunc('month', ${start})`,
        ),
      )
      .groupBy(sql`date_trunc('month', ${mmnTree.joinedAt})`)
      .orderBy(sql`date_trunc('month', ${mmnTree.joinedAt})`);

    const volumeRows = await db
      .select({
        period: sql<string>`to_char(date_trunc('month', ${mmnVolumes.periodStart}), 'YYYY-MM')`,
        totalVolume: sql<number>`COALESCE(SUM(${mmnVolumes.totalVolume}::numeric), 0)::float`,
      })
      .from(mmnVolumes)
      .innerJoin(mmnTree, eq(mmnVolumes.memberId, mmnTree.id))
      .where(
        and(
          eq(mmnTree.tenantId, tenantId),
          sql`date_trunc('month', ${mmnVolumes.periodStart}) >= date_trunc('month', ${start})`,
        ),
      )
      .groupBy(sql`date_trunc('month', ${mmnVolumes.periodStart})`)
      .orderBy(sql`date_trunc('month', ${mmnVolumes.periodStart})`);

    const commissionRows = await db
      .select({
        period: sql<string>`to_char(date_trunc('month', ${mmnCommissions.createdAt}), 'YYYY-MM')`,
        totalCommissions: sql<number>`COALESCE(SUM(${mmnCommissions.amount}::numeric), 0)::float`,
      })
      .from(mmnCommissions)
      .innerJoin(mmnTree, eq(mmnCommissions.memberId, mmnTree.id))
      .where(
        and(
          eq(mmnTree.tenantId, tenantId),
          sql`date_trunc('month', ${mmnCommissions.createdAt}) >= date_trunc('month', ${start})`,
        ),
      )
      .groupBy(sql`date_trunc('month', ${mmnCommissions.createdAt})`)
      .orderBy(sql`date_trunc('month', ${mmnCommissions.createdAt})`);

    const membersMap = new Map<string, { newMembers: number; qualifiedMembers: number }>();
    for (const row of memberRows) {
      membersMap.set(row.period, {
        newMembers: row.newMembers ?? 0,
        qualifiedMembers: row.qualifiedMembers ?? 0,
      });
    }

    const volumeMap = new Map<string, number>();
    for (const row of volumeRows) {
      volumeMap.set(row.period, Number(row.totalVolume ?? 0));
    }

    const commissionMap = new Map<string, number>();
    for (const row of commissionRows) {
      commissionMap.set(row.period, Number(row.totalCommissions ?? 0));
    }

    return mergeMonthlyMetrics(buckets, membersMap, volumeMap, commissionMap);
  }

  /**
   * Consolida saúde da rede (percentuais de retenção e qualificação).
   */
  static computeNetworkHealthFromDownline(
    downline: DownlineSnapshot[],
  ): NetworkHealth {
    const totalMembers = downline.length;

    if (totalMembers === 0) {
      return {
        totalMembers: 0,
        activeMembers: 0,
        inactiveMembers: 0,
        qualifiedMembers: 0,
        retentionRate: 0,
        qualificationRate: 0,
        averageLevel: 0,
      };
    }

    let active = 0;
    let qualified = 0;
    let levelSum = 0;

    for (const member of downline) {
      if (member.status === 'active') {
        active += 1;
      }

      if (member.isQualified) {
        qualified += 1;
      }

      levelSum += member.level;
    }

    const inactiveMembers = totalMembers - active;
    const retentionRate = active / totalMembers;
    const qualificationRate = qualified / totalMembers;
    const averageLevel = levelSum / totalMembers;

    return {
      totalMembers,
      activeMembers: active,
      inactiveMembers,
      qualifiedMembers: qualified,
      retentionRate: Number(retentionRate.toFixed(2)),
      qualificationRate: Number(qualificationRate.toFixed(2)),
      averageLevel: Number(averageLevel.toFixed(2)),
    };
  }

  /**
   * Helper para mapear resultado de GenealogyService em snapshot mínimo.
   */
  static toDownlineSnapshot(
    members: Array<{ status: string; isQualified: boolean; level: number }>,
  ): DownlineSnapshot[] {
    return buildDownlineSnapshot(members);
  }
}
