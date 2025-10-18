/**
 * Anomaly Detection Service (Security)
 * Uses audit logs as source; logs security.suspicious_activity via Audit service
 */

import { db } from '@/db';
import { auditLogs } from '@/modules/audit/schema/audit.schema';
import { and, between, desc, eq, gte, sql } from 'drizzle-orm';
import type { AnomalyDetectionResult } from '@/modules/audit/types/audit.types';
import { logAuditEvent } from '@/modules/audit/services/audit-logger.service';

export async function detectFailedLoginAttempts(
  userId?: string,
  ipAddress?: string,
  timeWindowMinutes = 15,
  threshold = 5
): Promise<AnomalyDetectionResult> {
  const startTime = new Date();
  startTime.setMinutes(startTime.getMinutes() - timeWindowMinutes);

  const conditions = [
    between(auditLogs.timestamp, startTime, new Date()),
    eq(auditLogs.eventType, 'auth.failed_login'),
    eq(auditLogs.status, 'failure'),
  ];

  if (userId) conditions.push(eq(auditLogs.userId, userId));
  if (ipAddress) conditions.push(eq(auditLogs.ipAddress, ipAddress));

  const failedAttempts = await db
    .select({ id: auditLogs.id })
    .from(auditLogs)
    .where(and(...conditions));

  const isAnomaly = failedAttempts.length >= threshold;
  if (isAnomaly) {
    await logAuditEvent({
      eventType: 'security.suspicious_activity',
      severity: 'critical',
      status: 'success',
      userId,
      ipAddress,
      resource: 'auth',
      action: 'failed_login_attempts',
      metadata: { attemptCount: failedAttempts.length, timeWindowMinutes, threshold },
    });
  }

  return {
    isAnomaly,
    confidence: isAnomaly ? Math.min((failedAttempts.length / threshold) * 0.8, 1.0) : 0,
    reason: isAnomaly
      ? `${failedAttempts.length} failed login attempts in ${timeWindowMinutes} minutes`
      : undefined,
    relatedEvents: failedAttempts.map((e) => e.id),
    timestamp: new Date(),
  };
}

export async function detectUnusualAccessPattern(
  userId: string,
  tenantId?: string,
  hoursToCheck = 24
): Promise<AnomalyDetectionResult> {
  const startTime = new Date();
  startTime.setHours(startTime.getHours() - hoursToCheck);

  const conditions = [between(auditLogs.timestamp, startTime, new Date()), eq(auditLogs.userId, userId)];
  if (tenantId) conditions.push(eq(auditLogs.tenantId, tenantId));

  const events = await db
    .select({ eventType: auditLogs.eventType, count: sql<number>`count(*)::int` })
    .from(auditLogs)
    .where(and(...conditions))
    .groupBy(auditLogs.eventType);

  const totalEvents = events.reduce((sum, e) => sum + e.count, 0);
  const eventsPerHour = totalEvents / hoursToCheck;
  const threshold = 100;
  const isAnomaly = eventsPerHour > threshold;
  if (isAnomaly) {
    await logAuditEvent({
      eventType: 'security.suspicious_activity',
      severity: 'high',
      status: 'success',
      userId,
      tenantId,
      resource: 'access_pattern',
      action: 'unusual_activity',
      metadata: { eventsPerHour, totalEvents, hoursChecked: hoursToCheck, threshold },
    });
  }

  return {
    isAnomaly,
    confidence: isAnomaly ? Math.min(eventsPerHour / (threshold * 2), 1.0) : 0,
    reason: isAnomaly
      ? `Unusual activity: ${eventsPerHour.toFixed(1)} events/hour (threshold: ${threshold})`
      : undefined,
    relatedEvents: events.map((e) => e.eventType),
    timestamp: new Date(),
  };
}

export async function detectPermissionEscalation(
  userId: string,
  tenantId?: string,
  timeWindowMinutes = 60
): Promise<AnomalyDetectionResult> {
  const startTime = new Date();
  startTime.setMinutes(startTime.getMinutes() - timeWindowMinutes);
  const conditions = [
    between(auditLogs.timestamp, startTime, new Date()),
    eq(auditLogs.userId, userId),
    sql`${auditLogs.eventType} IN ('rbac.role_assigned', 'rbac.permission_granted', 'security.unauthorized_access')`,
  ];
  if (tenantId) conditions.push(eq(auditLogs.tenantId, tenantId));

  const escalationEvents = await db.select().from(auditLogs).where(and(...conditions));
  const hasRoleChanges = escalationEvents.some((e) => e.eventType === 'rbac.role_assigned');
  const hasUnauthorizedAttempts = escalationEvents.filter((e) => e.eventType === 'security.unauthorized_access').length;
  const isAnomaly = hasRoleChanges && hasUnauthorizedAttempts >= 3;
  if (isAnomaly) {
    await logAuditEvent({
      eventType: 'security.suspicious_activity',
      severity: 'critical',
      status: 'success',
      userId,
      tenantId,
      resource: 'rbac',
      action: 'permission_escalation_attempt',
      metadata: { roleChanges: hasRoleChanges, unauthorizedAttempts: hasUnauthorizedAttempts, timeWindowMinutes },
    });
  }
  return {
    isAnomaly,
    confidence: isAnomaly ? 0.9 : 0,
    reason: isAnomaly
      ? `Possible permission escalation: role changes + ${hasUnauthorizedAttempts} unauthorized attempts`
      : undefined,
    relatedEvents: escalationEvents.map((e) => e.id),
    timestamp: new Date(),
  };
}

export async function detectDataExfiltration(
  userId: string,
  tenantId?: string,
  timeWindowMinutes = 30,
  exportThreshold = 10
): Promise<AnomalyDetectionResult> {
  const startTime = new Date();
  startTime.setMinutes(startTime.getMinutes() - timeWindowMinutes);
  const conditions = [between(auditLogs.timestamp, startTime, new Date()), eq(auditLogs.userId, userId), eq(auditLogs.eventType, 'data.exported')];
  if (tenantId) conditions.push(eq(auditLogs.tenantId, tenantId));
  const exportEvents = await db.select().from(auditLogs).where(and(...conditions));
  const isAnomaly = exportEvents.length >= exportThreshold;
  if (isAnomaly) {
    await logAuditEvent({
      eventType: 'security.suspicious_activity',
      severity: 'critical',
      status: 'success',
      userId,
      tenantId,
      resource: 'data',
      action: 'possible_exfiltration',
      metadata: { exportCount: exportEvents.length, timeWindowMinutes, threshold: exportThreshold },
    });
  }
  return {
    isAnomaly,
    confidence: isAnomaly ? Math.min(exportEvents.length / exportThreshold, 1.0) : 0,
    reason: isAnomaly
      ? `Possible data exfiltration: ${exportEvents.length} exports in ${timeWindowMinutes} minutes`
      : undefined,
    relatedEvents: exportEvents.map((e) => e.id),
    timestamp: new Date(),
  };
}

export async function detectUnusualGeographicAccess(
  userId: string,
  currentIpAddress: string,
  tenantId?: string
): Promise<AnomalyDetectionResult> {
  const last24Hours = new Date();
  last24Hours.setHours(last24Hours.getHours() - 24);
  const conditions = [gte(auditLogs.timestamp, last24Hours), eq(auditLogs.userId, userId), sql`${auditLogs.ipAddress} IS NOT NULL`];
  if (tenantId) conditions.push(eq(auditLogs.tenantId, tenantId));
  const recentAccess = await db
    .select({ ipAddress: auditLogs.ipAddress, count: sql<number>`count(*)::int` })
    .from(auditLogs)
    .where(and(...conditions))
    .groupBy(auditLogs.ipAddress)
    .orderBy(desc(sql`count(*)`));
  const isNewIp = !recentAccess.some((r) => r.ipAddress === currentIpAddress);
  const hasMultipleIps = recentAccess.length > 1;
  const isAnomaly = isNewIp && hasMultipleIps;
  if (isAnomaly) {
    await logAuditEvent({
      eventType: 'security.suspicious_activity',
      severity: 'high',
      status: 'success',
      userId,
      tenantId,
      ipAddress: currentIpAddress,
      resource: 'access',
      action: 'unusual_geographic_access',
      metadata: { newIpAddress: currentIpAddress, recentIpCount: recentAccess.length, recentIps: recentAccess.map((r) => r.ipAddress) },
    });
  }
  return {
    isAnomaly,
    confidence: isAnomaly ? 0.7 : 0,
    reason: isAnomaly
      ? `Access from new IP address with ${recentAccess.length} recent IPs used`
      : undefined,
    relatedEvents: [],
    timestamp: new Date(),
  };
}

export async function runAnomalyDetection(
  userId: string,
  ipAddress?: string,
  tenantId?: string
): Promise<{ hasAnomalies: boolean; results: Array<{ type: string; result: AnomalyDetectionResult }> }> {
  const results = await Promise.all([
    detectFailedLoginAttempts(userId, ipAddress).then((r) => ({ type: 'failed_login', result: r })),
    detectUnusualAccessPattern(userId, tenantId).then((r) => ({ type: 'access_pattern', result: r })),
    detectPermissionEscalation(userId, tenantId).then((r) => ({ type: 'permission_escalation', result: r })),
    detectDataExfiltration(userId, tenantId).then((r) => ({ type: 'data_exfiltration', result: r })),
    ...(ipAddress
      ? [detectUnusualGeographicAccess(userId, ipAddress, tenantId).then((r) => ({ type: 'geographic_access', result: r }))]
      : []),
  ]);
  const hasAnomalies = results.some((r) => r.result.isAnomaly);
  return { hasAnomalies, results };
}

