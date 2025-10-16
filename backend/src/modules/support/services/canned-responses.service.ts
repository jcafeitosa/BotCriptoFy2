/**
 * Canned Responses Service
 * Pre-written response templates management
 */

import { db } from '@/db';
import { eq, and, desc, sql, or } from 'drizzle-orm';
import logger from '@/utils/logger';
import { cacheManager } from '@/cache/cache-manager';
import { CacheNamespace } from '@/cache/types';
import { cannedResponses } from '../schema';
import type {
  CannedResponse,
  CreateCannedResponseInput,
  UpdateCannedResponseInput,
} from '../types';

export class CannedResponsesService {
  private static readonly CACHE_TTL = 300; // 5 minutes

  /**
   * Create canned response
   */
  static async createResponse(
    data: CreateCannedResponseInput,
    userId: string,
    tenantId: string
  ): Promise<CannedResponse> {
    logger.info('Creating canned response', { title: data.title, tenantId });

    const [response] = await db
      .insert(cannedResponses)
      .values({
        tenantId,
        ownerId: userId,
        title: data.title,
        content: data.content,
        category: data.category,
        isShared: data.isShared || false,
      })
      .returning();

    // Invalidate cache
    await this.invalidateCache(userId, tenantId);

    logger.info('Canned response created', { responseId: response.id });
    return response as CannedResponse;
  }

  /**
   * Get responses for user (personal + shared)
   */
  static async getResponses(userId: string, tenantId: string): Promise<CannedResponse[]> {
    const cacheKey = `canned:${tenantId}:${userId}`;

    // Try cache first
    const cached = await cacheManager.get<CannedResponse[]>(CacheNamespace.SUPPORT, cacheKey);
    if (cached) {
      return cached;
    }

    // Get personal responses + shared responses
    const responses = await db
      .select()
      .from(cannedResponses)
      .where(
        and(
          eq(cannedResponses.tenantId, tenantId),
          or(
            eq(cannedResponses.ownerId, userId), // Personal
            eq(cannedResponses.isShared, true) // Shared
          )
        )
      )
      .orderBy(desc(cannedResponses.usageCount), desc(cannedResponses.createdAt));

    await cacheManager.set(CacheNamespace.SUPPORT, cacheKey, responses as CannedResponse[], this.CACHE_TTL);

    return responses as CannedResponse[];
  }

  /**
   * Get response by ID
   */
  static async getResponseById(id: string, userId: string, tenantId: string): Promise<CannedResponse | null> {
    const [response] = await db
      .select()
      .from(cannedResponses)
      .where(
        and(
          eq(cannedResponses.id, id),
          eq(cannedResponses.tenantId, tenantId),
          or(
            eq(cannedResponses.ownerId, userId), // Own response
            eq(cannedResponses.isShared, true) // Shared response
          )
        )
      )
      .limit(1);

    return (response as CannedResponse) || null;
  }

  /**
   * Get responses by category
   */
  static async getResponsesByCategory(
    category: string,
    userId: string,
    tenantId: string
  ): Promise<CannedResponse[]> {
    const responses = await db
      .select()
      .from(cannedResponses)
      .where(
        and(
          eq(cannedResponses.tenantId, tenantId),
          eq(cannedResponses.category, category),
          or(eq(cannedResponses.ownerId, userId), eq(cannedResponses.isShared, true))
        )
      )
      .orderBy(desc(cannedResponses.usageCount));

    return responses as CannedResponse[];
  }

  /**
   * Update canned response
   */
  static async updateResponse(
    id: string,
    data: UpdateCannedResponseInput,
    userId: string,
    tenantId: string
  ): Promise<CannedResponse> {
    logger.info('Updating canned response', { responseId: id, tenantId });

    // Only owner can update
    const [updated] = await db
      .update(cannedResponses)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(cannedResponses.id, id),
          eq(cannedResponses.ownerId, userId),
          eq(cannedResponses.tenantId, tenantId)
        )
      )
      .returning();

    if (!updated) {
      throw new Error('Canned response not found or you do not have permission to update it');
    }

    // Invalidate cache
    await this.invalidateCache(userId, tenantId);

    logger.info('Canned response updated', { responseId: id });
    return updated as CannedResponse;
  }

  /**
   * Delete canned response
   */
  static async deleteResponse(id: string, userId: string, tenantId: string): Promise<void> {
    logger.info('Deleting canned response', { responseId: id, tenantId });

    // Only owner can delete
    const _result = await db
      .delete(cannedResponses)
      .where(
        and(
          eq(cannedResponses.id, id),
          eq(cannedResponses.ownerId, userId),
          eq(cannedResponses.tenantId, tenantId)
        )
      );

    // Invalidate cache
    await this.invalidateCache(userId, tenantId);

    logger.info('Canned response deleted', { responseId: id });
  }

  /**
   * Increment usage count
   */
  static async incrementUsage(id: string, userId: string, tenantId: string): Promise<void> {
    await db
      .update(cannedResponses)
      .set({
        usageCount: sql`${cannedResponses.usageCount} + 1`,
      })
      .where(
        and(
          eq(cannedResponses.id, id),
          eq(cannedResponses.tenantId, tenantId),
          or(eq(cannedResponses.ownerId, userId), eq(cannedResponses.isShared, true))
        )
      );

    // Invalidate cache
    await this.invalidateCache(userId, tenantId);
  }

  /**
   * Get most used responses
   */
  static async getMostUsed(userId: string, tenantId: string, limit: number = 10): Promise<CannedResponse[]> {
    const responses = await db
      .select()
      .from(cannedResponses)
      .where(
        and(
          eq(cannedResponses.tenantId, tenantId),
          or(eq(cannedResponses.ownerId, userId), eq(cannedResponses.isShared, true))
        )
      )
      .orderBy(desc(cannedResponses.usageCount))
      .limit(limit);

    return responses as CannedResponse[];
  }

  /**
   * Invalidate canned responses cache
   */
  private static async invalidateCache(userId: string, tenantId: string): Promise<void> {
    await cacheManager.delete(CacheNamespace.SUPPORT, `canned:${tenantId}:${userId}`);
    // Also invalidate shared responses for all users
    await cacheManager.invalidate({ namespace: CacheNamespace.SUPPORT, pattern: `canned:${tenantId}:*` });
  }
}
