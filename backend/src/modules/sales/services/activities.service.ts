/**
 * Activities Service
 * Sales activity tracking and management
 */

import { db } from '@/db';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import logger from '@/utils/logger';
import { cacheManager } from '@/cache/cache-manager';
import { CacheNamespace } from '@/cache/types';
import { activities, type Activity, type NewActivity } from '../schema';
import type { ActivityFilters } from '../types';

export class ActivitiesService {
  private static readonly CACHE_TTL = 180; // 3 minutes

  /**
   * Create a new activity
   */
  static async createActivity(
    data: Partial<NewActivity>,
    userId: string,
    tenantId: string
  ): Promise<Activity> {
    logger.info('Creating activity', { type: data.type, tenantId });

    if (!data.type) {
      throw new Error('Activity type is required');
    }

    if (!data.subject) {
      throw new Error('Activity subject is required');
    }

    const newActivity: NewActivity = {
      tenantId,
      contactId: data.contactId,
      dealId: data.dealId,
      ownerId: userId,
      type: data.type,
      subject: data.subject,
      description: data.description,
      dueDate: data.dueDate,
      status: 'pending',
    };

    const [activity] = await db.insert(activities).values(newActivity).returning();

    // Invalidate cache
    await this.invalidateActivitiesCache(tenantId);

    logger.info('Activity created', { activityId: activity.id, type: activity.type });
    return activity;
  }

  /**
   * Get activity by ID
   */
  static async getActivityById(id: string, tenantId: string): Promise<Activity | null> {
    const [activity] = await db
      .select()
      .from(activities)
      .where(and(eq(activities.id, id), eq(activities.tenantId, tenantId)))
      .limit(1);

    return activity || null;
  }

  /**
   * List activities with filters
   */
  static async listActivities(
    filters: ActivityFilters,
    tenantId: string
  ): Promise<{ activities: Activity[]; total: number }> {
    const conditions = [eq(activities.tenantId, tenantId)];

    // Apply filters
    if (filters.type) {
      conditions.push(eq(activities.type, filters.type));
    }

    if (filters.status) {
      conditions.push(eq(activities.status, filters.status));
    }

    if (filters.ownerId) {
      conditions.push(eq(activities.ownerId, filters.ownerId));
    }

    if (filters.contactId) {
      conditions.push(eq(activities.contactId, filters.contactId));
    }

    if (filters.dealId) {
      conditions.push(eq(activities.dealId, filters.dealId));
    }

    if (filters.dueDateFrom) {
      conditions.push(gte(activities.dueDate, filters.dueDateFrom));
    }

    if (filters.dueDateTo) {
      conditions.push(lte(activities.dueDate, filters.dueDateTo));
    }

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(activities)
      .where(and(...conditions));

    // Get activities
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const activitiesList = await db
      .select()
      .from(activities)
      .where(and(...conditions))
      .orderBy(desc(activities.dueDate))
      .limit(limit)
      .offset(offset);

    return {
      activities: activitiesList,
      total: Number(count),
    };
  }

  /**
   * Update activity
   */
  static async updateActivity(
    id: string,
    data: Partial<NewActivity>,
    tenantId: string
  ): Promise<Activity> {
    logger.info('Updating activity', { activityId: id, tenantId });

    const existing = await this.getActivityById(id, tenantId);
    if (!existing) {
      throw new Error('Activity not found');
    }

    const [updated] = await db
      .update(activities)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(activities.id, id), eq(activities.tenantId, tenantId)))
      .returning();

    // Invalidate cache
    await this.invalidateActivitiesCache(tenantId);

    logger.info('Activity updated', { activityId: id });
    return updated;
  }

  /**
   * Complete activity
   */
  static async completeActivity(
    id: string,
    outcome: string,
    tenantId: string
  ): Promise<Activity> {
    logger.info('Completing activity', { activityId: id, tenantId });

    const existing = await this.getActivityById(id, tenantId);
    if (!existing) {
      throw new Error('Activity not found');
    }

    const [updated] = await db
      .update(activities)
      .set({
        status: 'completed',
        outcome,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(activities.id, id), eq(activities.tenantId, tenantId)))
      .returning();

    // Invalidate cache
    await this.invalidateActivitiesCache(tenantId);

    logger.info('Activity completed', { activityId: id });
    return updated;
  }

  /**
   * Delete activity
   */
  static async deleteActivity(id: string, tenantId: string): Promise<void> {
    logger.info('Deleting activity', { activityId: id, tenantId });

    await db
      .delete(activities)
      .where(and(eq(activities.id, id), eq(activities.tenantId, tenantId)));

    // Invalidate cache
    await this.invalidateActivitiesCache(tenantId);

    logger.info('Activity deleted', { activityId: id });
  }

  /**
   * Get upcoming activities (next 7 days)
   */
  static async getUpcomingActivities(userId: string, tenantId: string): Promise<Activity[]> {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const upcomingActivities = await db
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.tenantId, tenantId),
          eq(activities.ownerId, userId),
          eq(activities.status, 'pending'),
          gte(activities.dueDate, now),
          lte(activities.dueDate, nextWeek)
        )
      )
      .orderBy(activities.dueDate)
      .limit(20);

    return upcomingActivities;
  }

  /**
   * Invalidate activities cache
   */
  private static async invalidateActivitiesCache(tenantId: string): Promise<void> {
    await cacheManager.invalidate({
      namespace: CacheNamespace.USERS,
      pattern: `activities:${tenantId}:*`,
    });
  }
}
