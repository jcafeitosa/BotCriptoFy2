/**
 * Analytics Service
 * Support metrics and performance analytics
 */

import { db } from '@/db';
import { eq, and, desc, sql, gte, lte, isNull, isNotNull } from 'drizzle-orm';
import logger from '@/utils/logger';
import { cacheManager } from '@/cache/cache-manager';
import { CacheNamespace } from '@/cache/types';
import { tickets /* , ticketMessages */ } from '../schema';
import type {
  TicketStats,
  AgentPerformance,
  SatisfactionMetrics,
  TicketPriority,
  TicketStatus,
} from '../types';

export class AnalyticsService {
  private static readonly CACHE_TTL = 600; // 10 minutes

  /**
   * Get ticket statistics
   */
  static async getTicketStats(
    tenantId: string,
    dateRange?: { from: Date; to: Date }
  ): Promise<TicketStats> {
    logger.info('Calculating ticket stats', { tenantId });

    const cacheKey = `stats:tickets:${tenantId}:${dateRange?.from?.toISOString()}:${dateRange?.to?.toISOString()}`;

    // Try cache first
    const cached = await cacheManager.get<TicketStats>(CacheNamespace.SUPPORT, cacheKey);
    if (cached) {
      return cached;
    }

    const conditions = [eq(tickets.tenantId, tenantId), isNull(tickets.deletedAt)];

    if (dateRange) {
      conditions.push(gte(tickets.createdAt, dateRange.from));
      conditions.push(lte(tickets.createdAt, dateRange.to));
    }

    // Get all tickets
    const allTickets = await db
      .select()
      .from(tickets)
      .where(and(...conditions));

    const total = allTickets.length;

    // Initialize counters
    const byStatus: TicketStats['byStatus'] = {
      new: 0,
      open: 0,
      pending: 0,
      on_hold: 0,
      resolved: 0,
      closed: 0,
    };

    const byPriority: TicketStats['byPriority'] = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    };

    const byCategory: Record<string, number> = {};

    let totalFirstResponseTime = 0;
    let totalResolutionTime = 0;
    let totalSatisfactionRating = 0;
    let firstResponseCount = 0;
    let resolutionCount = 0;
    let satisfactionCount = 0;

    // Process tickets
    for (const ticket of allTickets) {
      // Count by status
      byStatus[ticket.status as TicketStatus]++;

      // Count by priority
      byPriority[ticket.priority as TicketPriority]++;

      // Count by category
      byCategory[ticket.category] = (byCategory[ticket.category] || 0) + 1;

      // Calculate averages
      if (ticket.firstResponseTime) {
        totalFirstResponseTime += ticket.firstResponseTime;
        firstResponseCount++;
      }

      if (ticket.resolutionTime) {
        totalResolutionTime += ticket.resolutionTime;
        resolutionCount++;
      }

      if (ticket.satisfactionRating) {
        totalSatisfactionRating += ticket.satisfactionRating;
        satisfactionCount++;
      }
    }

    const stats: TicketStats = {
      total,
      byStatus,
      byPriority,
      byCategory,
      avgResolutionTime: resolutionCount > 0 ? Math.round(totalResolutionTime / resolutionCount) : 0,
      avgFirstResponseTime: firstResponseCount > 0 ? Math.round(totalFirstResponseTime / firstResponseCount) : 0,
      satisfactionScore: satisfactionCount > 0 ? parseFloat((totalSatisfactionRating / satisfactionCount).toFixed(2)) : 0,
    };

    await cacheManager.set(CacheNamespace.SUPPORT, cacheKey, stats, this.CACHE_TTL);

    return stats;
  }

  /**
   * Get average resolution time
   */
  static async getResolutionTimeAvg(
    tenantId: string,
    dateRange?: { from: Date; to: Date }
  ): Promise<number> {
    logger.info('Calculating avg resolution time', { tenantId });

    const conditions = [
      eq(tickets.tenantId, tenantId),
      isNull(tickets.deletedAt),
      isNotNull(tickets.resolutionTime),
    ];

    if (dateRange) {
      conditions.push(gte(tickets.createdAt, dateRange.from));
      conditions.push(lte(tickets.createdAt, dateRange.to));
    }

    const [result] = await db
      .select({
        avg: sql<number>`AVG(${tickets.resolutionTime})`,
      })
      .from(tickets)
      .where(and(...conditions));

    return Math.round(Number(result?.avg || 0));
  }

  /**
   * Get average first response time
   */
  static async getFirstResponseTimeAvg(
    tenantId: string,
    dateRange?: { from: Date; to: Date }
  ): Promise<number> {
    logger.info('Calculating avg first response time', { tenantId });

    const conditions = [
      eq(tickets.tenantId, tenantId),
      isNull(tickets.deletedAt),
      isNotNull(tickets.firstResponseTime),
    ];

    if (dateRange) {
      conditions.push(gte(tickets.createdAt, dateRange.from));
      conditions.push(lte(tickets.createdAt, dateRange.to));
    }

    const [result] = await db
      .select({
        avg: sql<number>`AVG(${tickets.firstResponseTime})`,
      })
      .from(tickets)
      .where(and(...conditions));

    return Math.round(Number(result?.avg || 0));
  }

  /**
   * Get satisfaction score (CSAT)
   */
  static async getSatisfactionScore(
    tenantId: string,
    dateRange?: { from: Date; to: Date }
  ): Promise<SatisfactionMetrics> {
    logger.info('Calculating satisfaction score', { tenantId });

    const cacheKey = `stats:satisfaction:${tenantId}:${dateRange?.from?.toISOString()}:${dateRange?.to?.toISOString()}`;

    // Try cache first
    const cached = await cacheManager.get<SatisfactionMetrics>(CacheNamespace.SUPPORT, cacheKey);
    if (cached) {
      return cached;
    }

    const conditions = [
      eq(tickets.tenantId, tenantId),
      isNull(tickets.deletedAt),
      isNotNull(tickets.satisfactionRating),
    ];

    if (dateRange) {
      conditions.push(gte(tickets.createdAt, dateRange.from));
      conditions.push(lte(tickets.createdAt, dateRange.to));
    }

    const ratedTickets = await db
      .select()
      .from(tickets)
      .where(and(...conditions));

    const totalRatings = ratedTickets.length;

    const distribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    let totalScore = 0;
    let positiveRatings = 0; // 4-5 stars

    for (const ticket of ratedTickets) {
      const rating = ticket.satisfactionRating;
      if (!rating) continue; // Skip null/undefined ratings
      
      distribution[rating as 1 | 2 | 3 | 4 | 5]++;
      totalScore += rating;

      if (rating >= 4) {
        positiveRatings++;
      }
    }

    const averageScore = totalRatings > 0 ? parseFloat((totalScore / totalRatings).toFixed(2)) : 0;
    const csatScore = totalRatings > 0 ? Math.round((positiveRatings / totalRatings) * 100) : 0;

    const metrics: SatisfactionMetrics = {
      totalRatings,
      averageScore,
      distribution,
      csatScore,
    };

    await cacheManager.set(CacheNamespace.SUPPORT, cacheKey, metrics, this.CACHE_TTL);

    return metrics;
  }

  /**
   * Get agent performance
   */
  static async getAgentPerformance(
    userId: string,
    tenantId: string,
    dateRange?: { from: Date; to: Date }
  ): Promise<AgentPerformance> {
    logger.info('Calculating agent performance', { userId, tenantId });

    const conditions = [
      eq(tickets.tenantId, tenantId),
      eq(tickets.assignedTo, userId),
      isNull(tickets.deletedAt),
    ];

    if (dateRange) {
      conditions.push(gte(tickets.createdAt, dateRange.from));
      conditions.push(lte(tickets.createdAt, dateRange.to));
    }

    const agentTickets = await db
      .select()
      .from(tickets)
      .where(and(...conditions));

    const totalTickets = agentTickets.length;
    let resolvedTickets = 0;
    let totalResolutionTime = 0;
    let totalFirstResponseTime = 0;
    let totalSatisfactionRating = 0;
    let resolutionCount = 0;
    let firstResponseCount = 0;
    let satisfactionCount = 0;
    let withinSLA = 0;
    let breachedSLA = 0;

    for (const ticket of agentTickets) {
      if (ticket.status === 'resolved' || ticket.status === 'closed') {
        resolvedTickets++;
      }

      if (ticket.resolutionTime) {
        totalResolutionTime += ticket.resolutionTime;
        resolutionCount++;

        // Check SLA (simplified - would need actual SLA policy)
        if (ticket.dueDate) {
          const resolveDate = ticket.resolvedAt || new Date();
          if (resolveDate <= ticket.dueDate) {
            withinSLA++;
          } else {
            breachedSLA++;
          }
        }
      }

      if (ticket.firstResponseTime) {
        totalFirstResponseTime += ticket.firstResponseTime;
        firstResponseCount++;
      }

      if (ticket.satisfactionRating) {
        totalSatisfactionRating += ticket.satisfactionRating;
        satisfactionCount++;
      }
    }

    const slaTotal = withinSLA + breachedSLA;
    const slaCompliance = slaTotal > 0 ? Math.round((withinSLA / slaTotal) * 100) : 0;

    return {
      userId,
      totalTickets,
      resolvedTickets,
      avgResolutionTime: resolutionCount > 0 ? Math.round(totalResolutionTime / resolutionCount) : 0,
      avgFirstResponseTime: firstResponseCount > 0 ? Math.round(totalFirstResponseTime / firstResponseCount) : 0,
      satisfactionScore: satisfactionCount > 0 ? parseFloat((totalSatisfactionRating / satisfactionCount).toFixed(2)) : 0,
      slaCompliance,
    };
  }

  /**
   * Get category distribution
   */
  static async getCategoryDistribution(
    tenantId: string,
    dateRange?: { from: Date; to: Date }
  ): Promise<Record<string, number>> {
    logger.info('Calculating category distribution', { tenantId });

    const conditions = [eq(tickets.tenantId, tenantId), isNull(tickets.deletedAt)];

    if (dateRange) {
      conditions.push(gte(tickets.createdAt, dateRange.from));
      conditions.push(lte(tickets.createdAt, dateRange.to));
    }

    const results = await db
      .select({
        category: tickets.category,
        count: sql<number>`count(*)`,
      })
      .from(tickets)
      .where(and(...conditions))
      .groupBy(tickets.category)
      .orderBy(desc(sql`count(*)`));

    const distribution: Record<string, number> = {};
    for (const row of results) {
      distribution[row.category] = Number(row.count);
    }

    return distribution;
  }

  /**
   * Get tickets created over time (for charts)
   */
  static async getTicketsOverTime(
    tenantId: string,
    dateRange: { from: Date; to: Date },
    interval: 'day' | 'week' | 'month' = 'day'
  ): Promise<Array<{ date: string; count: number }>> {
    logger.info('Getting tickets over time', { tenantId, interval });

    const dateFormat = interval === 'day' ? 'YYYY-MM-DD' : interval === 'week' ? 'YYYY-WW' : 'YYYY-MM';

    const results = await db
      .select({
        date: sql<string>`TO_CHAR(${tickets.createdAt}, ${dateFormat})`,
        count: sql<number>`count(*)`,
      })
      .from(tickets)
      .where(
        and(
          eq(tickets.tenantId, tenantId),
          isNull(tickets.deletedAt),
          gte(tickets.createdAt, dateRange.from),
          lte(tickets.createdAt, dateRange.to)
        )
      )
      .groupBy(sql`TO_CHAR(${tickets.createdAt}, ${dateFormat})`)
      .orderBy(sql`TO_CHAR(${tickets.createdAt}, ${dateFormat})`);

    return results.map((row) => ({
      date: row.date,
      count: Number(row.count),
    }));
  }
}
