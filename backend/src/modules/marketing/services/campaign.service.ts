import { db } from '@/db';
import { and, desc, eq, gte, isNull, lte, sql, inArray } from 'drizzle-orm';
import { campaigns } from '../schema/campaigns.schema';
import { campaignAnalytics } from '../schema/analytics.schema';
import { campaignSends } from '../schema/campaign-sends.schema';
import type {
  Campaign,
  CampaignStatus,
  CreateCampaignData,
  UpdateCampaignData,
  CampaignFilters,
  PaginationOptions,
  PaginatedResponse,
} from '../types';
import logger from '@/utils/logger';

type CampaignListResult = PaginatedResponse<Campaign>;

const DEFAULT_PAGINATION: Required<PaginationOptions> = {
  page: 1,
  limit: 50,
  sortBy: 'created_at',
  sortOrder: 'desc',
};

export class CampaignService {
  /**
   * Create a new campaign for a tenant
   */
  static async createCampaign(
    tenantId: string,
    userId: string,
    data: CreateCampaignData,
  ): Promise<Campaign> {
    const [campaign] = await db
      .insert(campaigns)
      .values({
        tenantId,
        createdBy: userId,
        ...data,
        scheduledAt: data.scheduledAt ?? null,
        recurringPattern: data.recurringPattern ?? null,
      })
      .returning();

    logger.info('Marketing campaign created', { campaignId: campaign.id, tenantId });
    return campaign;
  }

  /**
   * List campaigns with optional filters and pagination
   */
  static async listCampaigns(
    tenantId: string,
    filters: CampaignFilters = {},
    pagination: PaginationOptions = {},
  ): Promise<CampaignListResult> {
    const page = pagination.page ?? DEFAULT_PAGINATION.page;
    const limit = pagination.limit ?? DEFAULT_PAGINATION.limit;
    const offset = (page - 1) * limit;

    const conditions = [eq(campaigns.tenantId, tenantId), isNull(campaigns.deletedAt)];

    if (filters.status && filters.status.length > 0) {
      conditions.push(inArray(campaigns.status, filters.status as CampaignStatus[]));
    }

    if (filters.type && filters.type.length > 0) {
      conditions.push(inArray(campaigns.type, filters.type));
    }

    if (filters.dateFrom) {
      conditions.push(gte(campaigns.createdAt, filters.dateFrom));
    }

    if (filters.dateTo) {
      conditions.push(lte(campaigns.createdAt, filters.dateTo));
    }

    if (filters.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(
        sql`${campaigns.name} ILIKE ${pattern} OR coalesce(${campaigns.description}, '') ILIKE ${pattern}`
      );
    }

    const whereClause = and(...conditions);

    const [records, [{ count }]] = await Promise.all([
      db
        .select()
        .from(campaigns)
        .where(whereClause)
        .orderBy(desc(campaigns.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(campaigns)
        .where(whereClause),
    ]);

    return {
      data: records,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.max(1, Math.ceil(count / limit)),
      },
    };
  }

  /**
   * Fetch campaign belonging to tenant
   */
  static async getCampaignById(id: string, tenantId: string): Promise<Campaign | null> {
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.tenantId, tenantId), isNull(campaigns.deletedAt)))
      .limit(1);

    return campaign ?? null;
  }

  /**
   * Update campaign fields
   */
  static async updateCampaign(
    id: string,
    tenantId: string,
    data: UpdateCampaignData,
  ): Promise<Campaign | null> {
    const [updated] = await db
      .update(campaigns)
      .set({
        ...data,
        scheduledAt: data.scheduledAt ?? undefined,
        recurringPattern: data.recurringPattern ?? undefined,
        updatedAt: new Date(),
      })
      .where(and(eq(campaigns.id, id), eq(campaigns.tenantId, tenantId)))
      .returning();

    return updated ?? null;
  }

  static async deleteCampaign(id: string, tenantId: string): Promise<void> {
    await db
      .update(campaigns)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(campaigns.id, id), eq(campaigns.tenantId, tenantId)));
  }

  static async setStatus(
    id: string,
    tenantId: string,
    status: CampaignStatus,
  ): Promise<Campaign | null> {
    const update: Partial<Campaign> = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'running') {
      update.startedAt = new Date();
    }

    if (status === 'completed') {
      update.completedAt = new Date();
    }

    const [updated] = await db
      .update(campaigns)
      .set(update)
      .where(and(eq(campaigns.id, id), eq(campaigns.tenantId, tenantId)))
      .returning();

    return updated ?? null;
  }

  static async duplicateCampaign(
    id: string,
    tenantId: string,
    userId: string,
  ): Promise<Campaign> {
    const source = await this.getCampaignById(id, tenantId);
    if (!source) {
      throw new Error('Campaign not found');
    }

    const copyName = `${source.name} (Copy)`;

    const [duplicate] = await db
      .insert(campaigns)
      .values({
        ...source,
        id: undefined,
        name: copyName,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        startedAt: null,
        completedAt: null,
        scheduledAt: null,
        createdBy: userId,
      } as any)
      .returning();

    return duplicate;
  }

  static async getAnalytics(id: string, tenantId: string) {
    const campaign = await this.getCampaignById(id, tenantId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const metrics = await db
      .select()
      .from(campaignAnalytics)
      .where(eq(campaignAnalytics.campaignId, id))
      .orderBy(desc(campaignAnalytics.date));

    const [summary] = await db
      .select({
        totalSends: sql<number>`count(*)::int`,
        delivered: sql<number>`count(*) FILTER (WHERE status = 'delivered')::int`,
        opened: sql<number>`count(*) FILTER (WHERE status = 'opened')::int`,
        clicked: sql<number>`count(*) FILTER (WHERE status = 'clicked')::int`,
        bounced: sql<number>`count(*) FILTER (WHERE status = 'bounced')::int`,
        unsubscribed: sql<number>`count(*) FILTER (WHERE status = 'unsubscribed')::int`,
      })
      .from(campaignSends)
      .where(eq(campaignSends.campaignId, id));

    const total = summary?.totalSends || 0;
    const openRate = total > 0 ? (summary.opened / total) * 100 : 0;
    const clickRate = total > 0 ? (summary.clicked / total) * 100 : 0;
    const bounceRate = total > 0 ? (summary.bounced / total) * 100 : 0;

    return {
      campaign,
      summary: {
        ...summary,
        openRate,
        clickRate,
        bounceRate,
      },
      metrics,
    };
  }
}

export default CampaignService;
