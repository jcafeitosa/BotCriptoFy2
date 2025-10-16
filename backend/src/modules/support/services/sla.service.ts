/**
 * SLA Service
 * Service Level Agreement management and monitoring
 */

import { db } from '@/db';
import { eq, and, desc, sql, gte, lte, isNull } from 'drizzle-orm';
import logger from '@/utils/logger';
import { cacheManager } from '@/cache/cache-manager';
import { CacheNamespace } from '@/cache/types';
import { slaPolices, tickets } from '../schema';
import type {
  SLAPolicy,
  CreateSLAPolicyInput,
  UpdateSLAPolicyInput,
  SLAMetrics,
  TicketPriority,
} from '../types';
import { calculateSLADueDate, isSLABreached, calculateSLACompliance } from '../utils/sla-calculator';

export class SLAService {
  private static readonly CACHE_TTL = 1800; // 30 minutes

  /**
   * Create SLA policy
   */
  static async createSLAPolicy(data: CreateSLAPolicyInput, tenantId: string): Promise<SLAPolicy> {
    logger.info('Creating SLA policy', { name: data.name, tenantId });

    // Check if policy for this priority already exists
    const existing = await db
      .select()
      .from(slaPolices)
      .where(and(eq(slaPolices.tenantId, tenantId), eq(slaPolices.priority, data.priority)))
      .limit(1);

    if (existing.length > 0) {
      throw new Error(`SLA policy for priority ${data.priority} already exists`);
    }

    const [policy] = await db
      .insert(slaPolices)
      .values({
        tenantId,
        name: data.name,
        description: data.description,
        priority: data.priority,
        firstResponseMinutes: data.firstResponseMinutes,
        resolutionMinutes: data.resolutionMinutes,
        businessHoursOnly: data.businessHoursOnly || false,
        isActive: true,
      })
      .returning();

    // Invalidate cache
    await this.invalidateCache(tenantId);

    logger.info('SLA policy created', { policyId: policy.id, priority: policy.priority });
    return policy as SLAPolicy;
  }

  /**
   * Get all SLA policies for tenant
   */
  static async getSLAPolicies(tenantId: string): Promise<SLAPolicy[]> {
    const cacheKey = `sla:policies:${tenantId}`;

    // Try cache first
    const cached = await cacheManager.get<SLAPolicy[]>(CacheNamespace.SUPPORT, cacheKey);
    if (cached) {
      return cached;
    }

    const policies = await db
      .select()
      .from(slaPolices)
      .where(eq(slaPolices.tenantId, tenantId))
      .orderBy(desc(slaPolices.createdAt));

    await cacheManager.set(CacheNamespace.SUPPORT, cacheKey, policies as SLAPolicy[], this.CACHE_TTL);

    return policies as SLAPolicy[];
  }

  /**
   * Get SLA policy by ID
   */
  static async getSLAPolicyById(id: string, tenantId: string): Promise<SLAPolicy | null> {
    const [policy] = await db
      .select()
      .from(slaPolices)
      .where(and(eq(slaPolices.id, id), eq(slaPolices.tenantId, tenantId)))
      .limit(1);

    return (policy as SLAPolicy) || null;
  }

  /**
   * Get SLA policy by priority
   */
  static async getSLAPolicyByPriority(priority: TicketPriority, tenantId: string): Promise<SLAPolicy | null> {
    const [policy] = await db
      .select()
      .from(slaPolices)
      .where(
        and(
          eq(slaPolices.tenantId, tenantId),
          eq(slaPolices.priority, priority),
          eq(slaPolices.isActive, true)
        )
      )
      .limit(1);

    return (policy as SLAPolicy) || null;
  }

  /**
   * Update SLA policy
   */
  static async updateSLAPolicy(id: string, data: UpdateSLAPolicyInput, tenantId: string): Promise<SLAPolicy> {
    logger.info('Updating SLA policy', { policyId: id, tenantId });

    const [updated] = await db
      .update(slaPolices)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(slaPolices.id, id), eq(slaPolices.tenantId, tenantId)))
      .returning();

    if (!updated) {
      throw new Error('SLA policy not found');
    }

    // Invalidate cache
    await this.invalidateCache(tenantId);

    logger.info('SLA policy updated', { policyId: id });
    return updated as SLAPolicy;
  }

  /**
   * Delete SLA policy
   */
  static async deleteSLAPolicy(id: string, tenantId: string): Promise<void> {
    logger.info('Deleting SLA policy', { policyId: id, tenantId });

    // Check if policy is in use
    const [ticketsUsingPolicy] = await db
      .select({ count: sql<number>`count(*)` })
      .from(tickets)
      .where(eq(tickets.slaId, id));

    if (Number(ticketsUsingPolicy?.count || 0) > 0) {
      throw new Error('Cannot delete SLA policy that is in use by tickets');
    }

    await db.delete(slaPolices).where(and(eq(slaPolices.id, id), eq(slaPolices.tenantId, tenantId)));

    // Invalidate cache
    await this.invalidateCache(tenantId);

    logger.info('SLA policy deleted', { policyId: id });
  }

  /**
   * Calculate due date for ticket
   */
  static calculateDueDate(createdAt: Date, policy: SLAPolicy): Date {
    return calculateSLADueDate(createdAt, policy, false);
  }

  /**
   * Check if ticket breached SLA
   */
  static async checkSLABreach(ticketId: string): Promise<boolean> {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);

    if (!ticket || !ticket.dueDate) {
      return false;
    }

    return isSLABreached(ticket.dueDate);
  }

  /**
   * Get SLA metrics for date range
   */
  static async getSLAMetrics(
    tenantId: string,
    dateRange?: { from: Date; to: Date }
  ): Promise<SLAMetrics> {
    logger.info('Calculating SLA metrics', { tenantId });

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

    const totalTickets = allTickets.length;
    let withinSLA = 0;
    let breachedSLA = 0;
    let totalFirstResponseTime = 0;
    let totalResolutionTime = 0;
    let firstResponseCount = 0;
    let resolutionCount = 0;

    const byPriority: SLAMetrics['byPriority'] = {
      low: { total: 0, withinSLA: 0, breached: 0, complianceRate: 0 },
      medium: { total: 0, withinSLA: 0, breached: 0, complianceRate: 0 },
      high: { total: 0, withinSLA: 0, breached: 0, complianceRate: 0 },
      urgent: { total: 0, withinSLA: 0, breached: 0, complianceRate: 0 },
    };

    for (const ticket of allTickets) {
      // Count by priority
      byPriority[ticket.priority].total++;

      // Check SLA breach
      if (ticket.dueDate) {
        const isBreached = isSLABreached(ticket.dueDate, ticket.resolvedAt || new Date());

        if (isBreached) {
          breachedSLA++;
          byPriority[ticket.priority].breached++;
        } else {
          withinSLA++;
          byPriority[ticket.priority].withinSLA++;
        }
      }

      // Calculate average times
      if (ticket.firstResponseTime) {
        totalFirstResponseTime += ticket.firstResponseTime;
        firstResponseCount++;
      }

      if (ticket.resolutionTime) {
        totalResolutionTime += ticket.resolutionTime;
        resolutionCount++;
      }
    }

    // Calculate compliance rates
    const complianceRate = calculateSLACompliance(withinSLA, totalTickets);

    for (const priority in byPriority) {
      const data = byPriority[priority as TicketPriority];
      data.complianceRate = calculateSLACompliance(data.withinSLA, data.total);
    }

    return {
      totalTickets,
      withinSLA,
      breachedSLA,
      complianceRate,
      avgFirstResponseTime: firstResponseCount > 0 ? Math.round(totalFirstResponseTime / firstResponseCount) : 0,
      avgResolutionTime: resolutionCount > 0 ? Math.round(totalResolutionTime / resolutionCount) : 0,
      byPriority,
    };
  }

  /**
   * Invalidate SLA cache
   */
  private static async invalidateCache(tenantId: string): Promise<void> {
    await cacheManager.delete(CacheNamespace.SUPPORT, `sla:policies:${tenantId}`);
  }
}
