/**
 * Pipeline Service
 * Pipeline stage management
 */

import { db } from '@/db';
import { eq, and, sql } from 'drizzle-orm';
import logger from '@/utils/logger';
import { cacheManager } from '@/cache/cache-manager';
import { CacheNamespace } from '@/cache/types';
import { pipelineStages, type PipelineStage, type NewPipelineStage, deals } from '../schema';

export class PipelineService {
  private static readonly CACHE_TTL = 600; // 10 minutes (rarely changes)

  /**
   * Create a new pipeline stage
   */
  static async createStage(
    data: Partial<NewPipelineStage>,
    tenantId: string
  ): Promise<PipelineStage> {
    logger.info('Creating pipeline stage', { name: data.name, tenantId });

    if (!data.name) {
      throw new Error('Stage name is required');
    }

    // Get max order index
    const [maxOrder] = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${pipelineStages.orderIndex}), -1)` })
      .from(pipelineStages)
      .where(eq(pipelineStages.tenantId, tenantId));

    const newStage: NewPipelineStage = {
      tenantId,
      name: data.name,
      description: data.description,
      orderIndex: data.orderIndex ?? (maxOrder.maxOrder + 1),
      probabilityDefault: data.probabilityDefault ?? 50,
      color: data.color || '#3B82F6',
      isActive: data.isActive ?? true,
    };

    const [stage] = await db.insert(pipelineStages).values(newStage).returning();

    // Invalidate cache
    await this.invalidateStagesCache(tenantId);

    logger.info('Pipeline stage created', { stageId: stage.id, name: stage.name });
    return stage;
  }

  /**
   * Get all stages for tenant
   */
  static async getStages(tenantId: string): Promise<PipelineStage[]> {
    const cacheKey = `stages:${tenantId}`;

    // Check cache
    const cached = await cacheManager.get<PipelineStage[]>(CacheNamespace.USERS, cacheKey);
    if (cached) {
      return cached;
    }

    // Query database
    const stages = await db
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.tenantId, tenantId))
      .orderBy(pipelineStages.orderIndex);

    // Cache result
    await cacheManager.set(CacheNamespace.USERS, cacheKey, stages, this.CACHE_TTL);

    return stages;
  }

  /**
   * Update stage
   */
  static async updateStage(
    id: string,
    data: Partial<NewPipelineStage>,
    tenantId: string
  ): Promise<PipelineStage> {
    logger.info('Updating pipeline stage', { stageId: id, tenantId });

    const [stage] = await db
      .select()
      .from(pipelineStages)
      .where(and(eq(pipelineStages.id, id), eq(pipelineStages.tenantId, tenantId)))
      .limit(1);

    if (!stage) {
      throw new Error('Pipeline stage not found');
    }

    const [updated] = await db
      .update(pipelineStages)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(pipelineStages.id, id), eq(pipelineStages.tenantId, tenantId)))
      .returning();

    // Invalidate cache
    await this.invalidateStagesCache(tenantId);

    logger.info('Pipeline stage updated', { stageId: id });
    return updated;
  }

  /**
   * Delete stage
   */
  static async deleteStage(id: string, tenantId: string): Promise<void> {
    logger.info('Deleting pipeline stage', { stageId: id, tenantId });

    // Check if stage has deals
    const [dealCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(deals)
      .where(and(eq(deals.stageId, id), eq(deals.status, 'open')));

    if (Number(dealCount.count) > 0) {
      throw new Error('Cannot delete stage with active deals. Move deals first.');
    }

    // Delete stage
    await db
      .delete(pipelineStages)
      .where(and(eq(pipelineStages.id, id), eq(pipelineStages.tenantId, tenantId)));

    // Invalidate cache
    await this.invalidateStagesCache(tenantId);

    logger.info('Pipeline stage deleted', { stageId: id });
  }

  /**
   * Reorder stages
   */
  static async reorderStages(stageIds: string[], tenantId: string): Promise<PipelineStage[]> {
    logger.info('Reordering pipeline stages', { count: stageIds.length, tenantId });

    // Verify all stages exist and belong to tenant
    const stages = await db
      .select()
      .from(pipelineStages)
      .where(and(eq(pipelineStages.tenantId, tenantId)));

    const stageMap = new Map(stages.map((s) => [s.id, s]));

    for (const stageId of stageIds) {
      if (!stageMap.has(stageId)) {
        throw new Error(`Stage ${stageId} not found or does not belong to tenant`);
      }
    }

    // Update order indices
    await db.transaction(async (tx) => {
      for (let i = 0; i < stageIds.length; i++) {
        await tx
          .update(pipelineStages)
          .set({ orderIndex: i, updatedAt: new Date() })
          .where(and(eq(pipelineStages.id, stageIds[i]), eq(pipelineStages.tenantId, tenantId)));
      }
    });

    // Invalidate cache
    await this.invalidateStagesCache(tenantId);

    logger.info('Pipeline stages reordered', { count: stageIds.length });

    return this.getStages(tenantId);
  }

  /**
   * Invalidate stages cache
   */
  private static async invalidateStagesCache(tenantId: string): Promise<void> {
    await cacheManager.invalidate({
      namespace: CacheNamespace.USERS,
      key: `stages:${tenantId}`,
    });
    await cacheManager.invalidate({
      namespace: CacheNamespace.USERS,
      key: `pipeline:${tenantId}`,
    });
  }
}
