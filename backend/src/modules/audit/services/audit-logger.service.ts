/**
 * Audit Logger Service
 * Universal audit logging service for compliance and security
 */

import { db } from '@/db';
import { auditLogs } from '../schema/audit.schema';
import { and, between, desc, eq, gte, lte, sql } from 'drizzle-orm';
import type {
  AuditEventType,
  AuditQueryFilters,
  AuditSeverity,
  AuditStatistics,
  AuditStatus,
  BucketGranularity,
  TimelineBucket,
} from '../types/audit.types';
import logger from '@/utils/logger';

/**
 * Log audit event
 */
export async function logAuditEvent(data: {
  eventType: AuditEventType;
  severity?: AuditSeverity;
  status?: AuditStatus;
  userId?: string;
  tenantId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  resourceId?: string;
  action?: string;
  metadata?: Record<string, any>;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  errorMessage?: string;
  errorStack?: string;
  complianceCategory?: string;
  correlationId?: string;
  sessionId?: string;
  requestId?: string;
}): Promise<void> {
  try {
    // Insert audit log (immutable, append-only)
    await db.insert(auditLogs).values({
      eventType: data.eventType,
      severity: data.severity || 'medium',
      status: data.status || 'success',
      userId: data.userId,
      tenantId: data.tenantId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      resource: data.resource,
      resourceId: data.resourceId,
      action: data.action,
      metadata: data.metadata as any,
      changes: data.changes as any,
      errorMessage: data.errorMessage,
      errorStack: data.errorStack,
      complianceCategory: data.complianceCategory,
      correlationId: data.correlationId,
      sessionId: data.sessionId,
      requestId: data.requestId,
    });

    // Log to Winston for immediate visibility (non-blocking)
    logger.info(`Audit event: ${data.eventType}`, {
      severity: data.severity,
      userId: data.userId,
      resource: data.resource,
      action: data.action,
    });
  } catch (error) {
    // Never throw on audit logging failure (non-blocking)
    logger.error('Failed to log audit event', { error, eventType: data.eventType });
  }
}

/**
 * Query audit logs with filters
 */
export async function queryAuditLogs(filters: AuditQueryFilters = {}) {
  const conditions = [];

  if (filters.eventType) {
    conditions.push(eq(auditLogs.eventType, filters.eventType));
  }

  if (filters.severity) {
    conditions.push(eq(auditLogs.severity, filters.severity));
  }

  if (filters.status) {
    conditions.push(eq(auditLogs.status, filters.status));
  }

  if (filters.userId) {
    conditions.push(eq(auditLogs.userId, filters.userId));
  }

  if (filters.tenantId) {
    conditions.push(eq(auditLogs.tenantId, filters.tenantId));
  }

  if (filters.resource) {
    conditions.push(eq(auditLogs.resource, filters.resource));
  }

  if (filters.complianceCategory) {
    conditions.push(eq(auditLogs.complianceCategory, filters.complianceCategory));
  }

  // Time range filters
  if (filters.startDate && filters.endDate) {
    conditions.push(between(auditLogs.timestamp, filters.startDate, filters.endDate));
  } else if (filters.startDate) {
    conditions.push(gte(auditLogs.timestamp, filters.startDate));
  } else if (filters.endDate) {
    conditions.push(lte(auditLogs.timestamp, filters.endDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const logs = await db
    .select()
    .from(auditLogs)
    .where(whereClause)
    .orderBy(desc(auditLogs.timestamp))
    .limit(filters.limit || 100)
    .offset(filters.offset || 0);

  return logs;
}

/**
 * Get audit log by ID
 */
export async function getAuditLogById(id: string) {
  const [log] = await db.select().from(auditLogs).where(eq(auditLogs.id, id)).limit(1);

  return log || null;
}

/**
 * Get audit logs by correlation ID (related events)
 */
export async function getAuditLogsByCorrelation(correlationId: string) {
  return await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.correlationId, correlationId))
    .orderBy(desc(auditLogs.timestamp));
}

/**
 * Get audit statistics for a time period
 */
export async function getAuditStatistics(
  startDate: Date,
  endDate: Date,
  tenantId?: string
): Promise<AuditStatistics> {
  const conditions = [between(auditLogs.timestamp, startDate, endDate)];

  if (tenantId) {
    conditions.push(eq(auditLogs.tenantId, tenantId));
  }

  // Total events
  const [totalResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLogs)
    .where(and(...conditions));

  // Events by type
  const eventsByType = await db
    .select({
      eventType: auditLogs.eventType,
      count: sql<number>`count(*)::int`,
    })
    .from(auditLogs)
    .where(and(...conditions))
    .groupBy(auditLogs.eventType)
    .orderBy(desc(sql`count(*)`));

  // Events by severity
  const eventsBySeverity = await db
    .select({
      severity: auditLogs.severity,
      count: sql<number>`count(*)::int`,
    })
    .from(auditLogs)
    .where(and(...conditions))
    .groupBy(auditLogs.severity);

  // Events by status
  const eventsByStatus = await db
    .select({
      status: auditLogs.status,
      count: sql<number>`count(*)::int`,
    })
    .from(auditLogs)
    .where(and(...conditions))
    .groupBy(auditLogs.status);

  // Top users
  const topUsers = await db
    .select({
      userId: auditLogs.userId,
      count: sql<number>`count(*)::int`,
    })
    .from(auditLogs)
    .where(and(...conditions, sql`${auditLogs.userId} IS NOT NULL`))
    .groupBy(auditLogs.userId)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  return {
    totalEvents: totalResult?.count || 0,
    eventsByType: eventsByType.reduce(
      (acc, row) => {
        acc[row.eventType] = row.count;
        return acc;
      },
      {} as Record<string, number>
    ),
    eventsBySeverity: eventsBySeverity.reduce(
      (acc, row) => {
        acc[row.severity] = row.count;
        return acc;
      },
      {} as Record<string, number>
    ),
    eventsByStatus: eventsByStatus.reduce(
      (acc, row) => {
        acc[row.status] = row.count;
        return acc;
      },
      {} as Record<string, number>
    ),
    topUsers: topUsers.map((row) => ({
      userId: row.userId || 'unknown',
      count: row.count,
    })),
    timeRange: {
      start: startDate,
      end: endDate,
    },
  };
}

/**
 * Get recent critical events
 */
export async function getRecentCriticalEvents(tenantId?: string, limit = 50) {
  const conditions = [eq(auditLogs.severity, 'critical')];

  if (tenantId) {
    conditions.push(eq(auditLogs.tenantId, tenantId));
  }

  return await db
    .select()
    .from(auditLogs)
    .where(and(...conditions))
    .orderBy(desc(auditLogs.timestamp))
    .limit(limit);
}

/**
 * Get failed events for investigation
 */
export async function getFailedEvents(tenantId?: string, limit = 50) {
  const conditions = [eq(auditLogs.status, 'failure')];

  if (tenantId) {
    conditions.push(eq(auditLogs.tenantId, tenantId));
  }

  return await db
    .select()
    .from(auditLogs)
    .where(and(...conditions))
    .orderBy(desc(auditLogs.timestamp))
    .limit(limit);
}

/**
 * Search audit logs by metadata
 */
export async function searchAuditLogsByMetadata(
  searchKey: string,
  searchValue: any,
  tenantId?: string,
  limit = 50
) {
  const conditions = [sql`${auditLogs.metadata}->>${searchKey} = ${searchValue}`];

  if (tenantId) {
    conditions.push(eq(auditLogs.tenantId, tenantId));
  }

  return await db
    .select()
    .from(auditLogs)
    .where(and(...conditions))
    .orderBy(desc(auditLogs.timestamp))
    .limit(limit);
}

/**
 * Get time-bucketed counts for timeline charts
 */
export async function getTimelineBuckets(
  granularity: BucketGranularity,
  startDate: Date,
  endDate: Date,
  options: { tenantId?: string; eventType?: AuditEventType }
): Promise<TimelineBucket[]> {
  const unit = granularity;

  const conditions = [between(auditLogs.timestamp, startDate, endDate)];
  if (options.tenantId) conditions.push(eq(auditLogs.tenantId, options.tenantId));
  if (options.eventType) conditions.push(eq(auditLogs.eventType, options.eventType));

  const rows = await db
    .select({
      bucket: sql<string>`to_char(date_trunc(${unit}, ${auditLogs.timestamp}) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:00"Z"')`,
      count: sql<number>`count(*)::int`,
    })
    .from(auditLogs)
    .where(and(...conditions))
    .groupBy(sql`date_trunc(${unit}, ${auditLogs.timestamp})`)
    .orderBy(sql`date_trunc(${unit}, ${auditLogs.timestamp})`);

  return rows.map((r) => ({ bucket: r.bucket, count: r.count }));
}

/**
 * Get top summary slices for quick dashboards
 */
export async function getTopSummary(
  startDate: Date,
  endDate: Date,
  tenantId?: string
): Promise<{
  topEventTypes: Array<{ key: string; count: number }>;
  topResources: Array<{ key: string; count: number }>;
  topUsers: Array<{ key: string; count: number }>;
}> {
  const conditions = [between(auditLogs.timestamp, startDate, endDate)];
  if (tenantId) conditions.push(eq(auditLogs.tenantId, tenantId));

  const [eventTypes, resources, users] = await Promise.all([
    db
      .select({ key: auditLogs.eventType, count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(and(...conditions))
      .groupBy(auditLogs.eventType)
      .orderBy(desc(sql`count(*)`))
      .limit(10),
    db
      .select({ key: auditLogs.resource, count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(and(...conditions, sql`${auditLogs.resource} IS NOT NULL`))
      .groupBy(auditLogs.resource)
      .orderBy(desc(sql`count(*)`))
      .limit(10),
    db
      .select({ key: auditLogs.userId, count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(and(...conditions, sql`${auditLogs.userId} IS NOT NULL`))
      .groupBy(auditLogs.userId)
      .orderBy(desc(sql`count(*)`))
      .limit(10),
  ]);

  return {
    topEventTypes: eventTypes.map((r) => ({ key: r.key, count: r.count })),
    topResources: resources.map((r) => ({ key: r.key || 'unknown', count: r.count })),
    topUsers: users.map((r) => ({ key: r.key || 'unknown', count: r.count })),
  };
}
