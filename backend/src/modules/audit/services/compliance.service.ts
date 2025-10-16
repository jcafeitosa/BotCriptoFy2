/**
 * Compliance Service
 * LGPD/GDPR compliance management
 */

import { db } from '@/db';
import { auditLogs } from '../schema/audit.schema';
import { and, between, desc, eq, sql } from 'drizzle-orm';
import type { ComplianceCategory, ComplianceReport } from '../types/audit.types';
import { logAuditEvent, queryAuditLogs } from './audit-logger.service';

/**
 * Generate compliance report for a specific category and period
 */
export async function generateComplianceReport(
  category: ComplianceCategory,
  startDate: Date,
  endDate: Date,
  tenantId?: string
): Promise<ComplianceReport> {
  const conditions = [
    between(auditLogs.timestamp, startDate, endDate),
    eq(auditLogs.complianceCategory, category),
  ];

  if (tenantId) {
    conditions.push(eq(auditLogs.tenantId, tenantId));
  }

  // Total events
  const [totalResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLogs)
    .where(and(...conditions));

  // Critical events
  const [criticalResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLogs)
    .where(and(...conditions, eq(auditLogs.severity, 'critical')));

  // Failed events
  const [failedResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLogs)
    .where(and(...conditions, eq(auditLogs.status, 'failure')));

  // Findings by event type and severity
  const findings = await db
    .select({
      eventType: auditLogs.eventType,
      severity: auditLogs.severity,
      count: sql<number>`count(*)::int`,
    })
    .from(auditLogs)
    .where(and(...conditions))
    .groupBy(auditLogs.eventType, auditLogs.severity)
    .orderBy(desc(sql`count(*)`));

  // Generate recommendations based on findings
  const recommendations: string[] = [];

  if (criticalResult?.count > 0) {
    recommendations.push(
      `Review ${criticalResult.count} critical events for potential compliance violations`
    );
  }

  if (failedResult?.count > 0) {
    recommendations.push(`Investigate ${failedResult.count} failed operations for data integrity`);
  }

  // Category-specific recommendations
  if (category === 'lgpd' || category === 'gdpr') {
    recommendations.push('Ensure all data access events are properly logged');
    recommendations.push('Verify user consent records are up to date');
    recommendations.push('Review data retention policies for compliance');
  }

  if (category === 'pci_dss') {
    recommendations.push('Verify all payment transactions are encrypted');
    recommendations.push('Review access controls for cardholder data');
  }

  return {
    category,
    period: {
      start: startDate,
      end: endDate,
    },
    totalEvents: totalResult?.count || 0,
    criticalEvents: criticalResult?.count || 0,
    failedEvents: failedResult?.count || 0,
    findings: findings.map((f) => ({
      type: f.eventType,
      severity: f.severity as any,
      count: f.count,
      description: `${f.count} ${f.eventType} events with ${f.severity} severity`,
    })),
    recommendations,
  };
}

/**
 * Log LGPD data access event
 */
export async function logLGPDDataAccess(data: {
  userId: string;
  tenantId?: string;
  dataSubject: string; // ID of data owner
  dataType: string; // Type of personal data accessed
  purpose: string; // Purpose of data access
  legalBasis: string; // Legal basis for processing
  ipAddress?: string;
  userAgent?: string;
}) {
  await logAuditEvent({
    eventType: 'data.exported',
    severity: 'high',
    status: 'success',
    userId: data.userId,
    tenantId: data.tenantId,
    resource: 'personal_data',
    resourceId: data.dataSubject,
    action: 'access',
    complianceCategory: 'lgpd',
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    metadata: {
      dataType: data.dataType,
      purpose: data.purpose,
      legalBasis: data.legalBasis,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log LGPD data deletion event (right to be forgotten)
 */
export async function logLGPDDataDeletion(data: {
  userId: string;
  tenantId?: string;
  dataSubject: string;
  dataType: string;
  reason: string;
  ipAddress?: string;
}) {
  await logAuditEvent({
    eventType: 'data.deleted',
    severity: 'critical',
    status: 'success',
    userId: data.userId,
    tenantId: data.tenantId,
    resource: 'personal_data',
    resourceId: data.dataSubject,
    action: 'delete',
    complianceCategory: 'lgpd',
    ipAddress: data.ipAddress,
    metadata: {
      dataType: data.dataType,
      reason: data.reason,
      irrevocable: true,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log LGPD data export event (portability right)
 */
export async function logLGPDDataExport(data: {
  userId: string;
  tenantId?: string;
  dataSubject: string;
  format: string; // Export format (JSON, CSV, etc.)
  includesPersonalData: boolean;
  ipAddress?: string;
}) {
  await logAuditEvent({
    eventType: 'data.exported',
    severity: 'high',
    status: 'success',
    userId: data.userId,
    tenantId: data.tenantId,
    resource: 'personal_data',
    resourceId: data.dataSubject,
    action: 'export',
    complianceCategory: 'lgpd',
    ipAddress: data.ipAddress,
    metadata: {
      format: data.format,
      includesPersonalData: data.includesPersonalData,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log LGPD anonymization event
 */
export async function logLGPDAnonymization(data: {
  userId: string;
  tenantId?: string;
  dataSubject: string;
  dataType: string;
  method: string; // Anonymization method used
}) {
  await logAuditEvent({
    eventType: 'data.anonymized',
    severity: 'high',
    status: 'success',
    userId: data.userId,
    tenantId: data.tenantId,
    resource: 'personal_data',
    resourceId: data.dataSubject,
    action: 'anonymize',
    complianceCategory: 'lgpd',
    metadata: {
      dataType: data.dataType,
      method: data.method,
      irrevocable: true,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Get data access history for a specific user (LGPD Article 18)
 */
export async function getDataAccessHistory(dataSubject: string, days = 90) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return await queryAuditLogs({
    complianceCategory: 'lgpd',
    startDate,
    endDate: new Date(),
    limit: 1000,
  });
}

/**
 * Check compliance with data retention policies
 */
export async function checkDataRetentionCompliance(tenantId?: string) {
  const now = new Date();

  // Get logs older than retention period (90 days for low/medium, 365 for high/critical)
  const lowMediumRetentionDate = new Date(now);
  lowMediumRetentionDate.setDate(lowMediumRetentionDate.getDate() - 90);

  const highCriticalRetentionDate = new Date(now);
  highCriticalRetentionDate.setDate(highCriticalRetentionDate.getDate() - 365);

  const conditions = [
    sql`(
      (${auditLogs.severity} IN ('low', 'medium') AND ${auditLogs.timestamp} < ${lowMediumRetentionDate})
      OR
      (${auditLogs.severity} IN ('high', 'critical') AND ${auditLogs.timestamp} < ${highCriticalRetentionDate})
    )`,
  ];

  if (tenantId) {
    conditions.push(eq(auditLogs.tenantId, tenantId));
  }

  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLogs)
    .where(and(...conditions));

  return {
    exceededRetention: result?.count || 0,
    recommendations:
      result?.count > 0
        ? ['Archive or delete logs exceeding retention period', 'Review data retention policy']
        : ['Data retention policy is compliant'],
  };
}

/**
 * Generate LGPD compliance summary
 */
export async function generateLGPDSummary(tenantId?: string) {
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);

  const report = await generateComplianceReport('lgpd', last30Days, new Date(), tenantId);
  const retentionCheck = await checkDataRetentionCompliance(tenantId);

  return {
    report,
    retentionCompliance: retentionCheck,
    status:
      report.criticalEvents === 0 && report.failedEvents === 0 && retentionCheck.exceededRetention === 0
        ? 'compliant'
        : 'requires_attention',
  };
}
