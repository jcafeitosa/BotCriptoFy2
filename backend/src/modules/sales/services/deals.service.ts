/**
 * Deals Service
 * Deal/opportunity management and pipeline operations
 */

import { db } from '@/db';
import { eq, and, desc, sql, gte, lte, isNull, between } from 'drizzle-orm';
import logger from '@/utils/logger';
import { cacheManager } from '@/cache/cache-manager';
import { CacheNamespace } from '@/cache/types';
import {
  deals,
  type Deal,
  type NewDeal,
  pipelineStages,
} from '../schema';
import type { DealFilters, PipelineView } from '../types';
import { groupDealsByStage } from '../utils/pipeline-calculator';

export class DealsService {
  private static readonly CACHE_TTL = 120; // 2 minutes (frequent updates)

  /**
   * Create a new deal
   */
  static async createDeal(
    data: Partial<NewDeal>,
    userId: string,
    tenantId: string
  ): Promise<Deal> {
    logger.info('Creating deal', { title: data.title, tenantId });

    // Validate required fields
    if (!data.contactId) {
      throw new Error('Contact ID is required');
    }

    if (!data.stageId) {
      throw new Error('Stage ID is required');
    }

    if (!data.title) {
      throw new Error('Title is required');
    }

    if (!data.value || parseFloat(data.value.toString()) <= 0) {
      throw new Error('Value must be greater than 0');
    }

    // Verify stage exists
    const [stage] = await db
      .select()
      .from(pipelineStages)
      .where(and(eq(pipelineStages.id, data.stageId), eq(pipelineStages.tenantId, tenantId)))
      .limit(1);

    if (!stage) {
      throw new Error('Pipeline stage not found');
    }

    // Create deal
    const newDeal: NewDeal = {
      tenantId,
      contactId: data.contactId,
      stageId: data.stageId,
      ownerId: data.ownerId || userId,
      createdBy: userId,
      title: data.title,
      description: data.description,
      value: data.value,
      currency: data.currency || 'USD',
      probability: data.probability ?? stage.probabilityDefault,
      expectedCloseDate: data.expectedCloseDate,
      status: 'open',
      products: data.products || [],
      customFields: data.customFields || {},
    };

    const [deal] = await db.insert(deals).values(newDeal).returning();

    // Invalidate cache
    await this.invalidateDealsCache(tenantId);

    logger.info('Deal created', { dealId: deal.id, title: deal.title });
    return deal;
  }

  /**
   * Get deal by ID
   */
  static async getDealById(id: string, tenantId: string): Promise<Deal | null> {
    const cacheKey = `deal:${id}`;

    // Check cache
    const cached = await cacheManager.get<Deal>(CacheNamespace.USERS, cacheKey);
    if (cached) {
      return cached;
    }

    // Query database
    const [deal] = await db
      .select()
      .from(deals)
      .where(and(eq(deals.id, id), eq(deals.tenantId, tenantId), isNull(deals.deletedAt)))
      .limit(1);

    if (deal) {
      // Cache result
      await cacheManager.set(CacheNamespace.USERS, cacheKey, deal, this.CACHE_TTL);
    }

    return deal || null;
  }

  /**
   * List deals with filters and pagination
   */
  static async listDeals(
    filters: DealFilters,
    tenantId: string
  ): Promise<{ deals: Deal[]; total: number }> {
    const conditions = [eq(deals.tenantId, tenantId), isNull(deals.deletedAt)];

    // Apply filters
    if (filters.status) {
      conditions.push(eq(deals.status, filters.status));
    }

    if (filters.stageId) {
      conditions.push(eq(deals.stageId, filters.stageId));
    }

    if (filters.ownerId) {
      conditions.push(eq(deals.ownerId, filters.ownerId));
    }

    if (filters.contactId) {
      conditions.push(eq(deals.contactId, filters.contactId));
    }

    if (filters.minValue !== undefined) {
      conditions.push(gte(deals.value, filters.minValue.toString()));
    }

    if (filters.maxValue !== undefined) {
      conditions.push(lte(deals.value, filters.maxValue.toString()));
    }

    if (filters.expectedCloseDateFrom && filters.expectedCloseDateTo) {
      conditions.push(
        between(
          deals.expectedCloseDate,
          filters.expectedCloseDateFrom,
          filters.expectedCloseDateTo
        )
      );
    }

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(deals)
      .where(and(...conditions));

    // Get deals
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const dealsList = await db
      .select()
      .from(deals)
      .where(and(...conditions))
      .orderBy(desc(deals.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      deals: dealsList,
      total: Number(count),
    };
  }

  /**
   * Update deal
   */
  static async updateDeal(
    id: string,
    data: Partial<NewDeal>,
    tenantId: string
  ): Promise<Deal> {
    logger.info('Updating deal', { dealId: id, tenantId });

    // Verify deal exists
    const existing = await this.getDealById(id, tenantId);
    if (!existing) {
      throw new Error('Deal not found');
    }

    // Update deal
    const [updated] = await db
      .update(deals)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(deals.id, id), eq(deals.tenantId, tenantId)))
      .returning();

    // Invalidate cache
    await this.invalidateDealsCache(tenantId);
    await cacheManager.invalidate({ namespace: CacheNamespace.USERS, key: `deal:${id}` });

    logger.info('Deal updated', { dealId: id });
    return updated;
  }

  /**
   * Move deal to different stage
   */
  static async moveDealToStage(
    id: string,
    newStageId: string,
    tenantId: string,
    probability?: number
  ): Promise<Deal> {
    logger.info('Moving deal to stage', { dealId: id, newStageId, tenantId });

    // Verify deal exists
    const deal = await this.getDealById(id, tenantId);
    if (!deal) {
      throw new Error('Deal not found');
    }

    // Verify new stage exists
    const [newStage] = await db
      .select()
      .from(pipelineStages)
      .where(and(eq(pipelineStages.id, newStageId), eq(pipelineStages.tenantId, tenantId)))
      .limit(1);

    if (!newStage) {
      throw new Error('Pipeline stage not found');
    }

    // Update deal
    const [updated] = await db
      .update(deals)
      .set({
        stageId: newStageId,
        probability: probability ?? newStage.probabilityDefault,
        updatedAt: new Date(),
      })
      .where(and(eq(deals.id, id), eq(deals.tenantId, tenantId)))
      .returning();

    // Invalidate cache
    await this.invalidateDealsCache(tenantId);

    logger.info('Deal moved to stage', { dealId: id, newStageId });
    return updated;
  }

  /**
   * Mark deal as won
   */
  static async markDealWon(
    id: string,
    closeDate: Date,
    actualValue: number | undefined,
    tenantId: string
  ): Promise<Deal> {
    logger.info('Marking deal as won', { dealId: id, tenantId });

    const deal = await this.getDealById(id, tenantId);
    if (!deal) {
      throw new Error('Deal not found');
    }

    const [updated] = await db
      .update(deals)
      .set({
        status: 'won',
        actualCloseDate: closeDate,
        value: actualValue !== undefined ? actualValue.toString() : deal.value,
        probability: 100,
        updatedAt: new Date(),
      })
      .where(and(eq(deals.id, id), eq(deals.tenantId, tenantId)))
      .returning();

    // Invalidate cache
    await this.invalidateDealsCache(tenantId);

    logger.info('Deal marked as won', { dealId: id });
    return updated;
  }

  /**
   * Mark deal as lost
   */
  static async markDealLost(id: string, reason: string, tenantId: string): Promise<Deal> {
    logger.info('Marking deal as lost', { dealId: id, tenantId });

    const deal = await this.getDealById(id, tenantId);
    if (!deal) {
      throw new Error('Deal not found');
    }

    const [updated] = await db
      .update(deals)
      .set({
        status: 'lost',
        lostReason: reason,
        actualCloseDate: new Date(),
        probability: 0,
        updatedAt: new Date(),
      })
      .where(and(eq(deals.id, id), eq(deals.tenantId, tenantId)))
      .returning();

    // Invalidate cache
    await this.invalidateDealsCache(tenantId);

    logger.info('Deal marked as lost', { dealId: id, reason });
    return updated;
  }

  /**
   * Delete deal (soft delete)
   */
  static async deleteDeal(id: string, tenantId: string): Promise<void> {
    logger.info('Deleting deal', { dealId: id, tenantId });

    await db
      .update(deals)
      .set({ deletedAt: new Date() })
      .where(and(eq(deals.id, id), eq(deals.tenantId, tenantId)));

    // Invalidate cache
    await this.invalidateDealsCache(tenantId);
    await cacheManager.invalidate({ namespace: CacheNamespace.USERS, key: `deal:${id}` });

    logger.info('Deal deleted', { dealId: id });
  }

  /**
   * Get deals by pipeline (Kanban view)
   */
  static async getDealsByPipeline(tenantId: string): Promise<PipelineView> {
    const cacheKey = `pipeline:${tenantId}`;

    // Check cache
    const cached = await cacheManager.get<PipelineView>(CacheNamespace.USERS, cacheKey);
    if (cached) {
      return cached;
    }

    // Get all stages
    const stages = await db
      .select()
      .from(pipelineStages)
      .where(and(eq(pipelineStages.tenantId, tenantId), eq(pipelineStages.isActive, true)))
      .orderBy(pipelineStages.orderIndex);

    // Get all open deals
    const openDeals = await db
      .select()
      .from(deals)
      .where(and(eq(deals.tenantId, tenantId), eq(deals.status, 'open'), isNull(deals.deletedAt)))
      .orderBy(desc(deals.createdAt));

    // Group deals by stage
    const pipelineView = groupDealsByStage(openDeals, stages);

    // Cache result
    await cacheManager.set(CacheNamespace.USERS, cacheKey, pipelineView, this.CACHE_TTL);

    return pipelineView;
  }

  /**
   * Calculate deal value (including products)
   */
  static calculateDealValue(deal: Deal): number {
    if (!deal.products || deal.products.length === 0) {
      return parseFloat(deal.value.toString());
    }

    // Calculate total from products
    const productsTotal = deal.products.reduce((sum, product) => sum + product.total, 0);

    return productsTotal;
  }

  /**
   * Invalidate deals cache for tenant
   */
  private static async invalidateDealsCache(tenantId: string): Promise<void> {
    await cacheManager.invalidate({
      namespace: CacheNamespace.USERS,
      pattern: `deals:${tenantId}:*`,
    });
    await cacheManager.invalidate({
      namespace: CacheNamespace.USERS,
      key: `pipeline:${tenantId}`,
    });
  }
}
