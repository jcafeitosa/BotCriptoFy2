/**
 * Audit Routes
 * API endpoints for audit log management and compliance
 */

import { Elysia, t } from 'elysia';
import { sessionGuard } from '../../auth/middleware/session.middleware';
import { requireAdmin, requirePermission } from '../../security/middleware/rbac.middleware';
import {
  queryAuditLogs,
  getAuditLogById,
  getAuditLogsByCorrelation,
  getAuditStatistics,
  getRecentCriticalEvents,
  getFailedEvents,
} from '../services/audit-logger.service';
import {
  generateComplianceReport,
  generateLGPDSummary,
  getDataAccessHistory,
  checkDataRetentionCompliance,
} from '../services/compliance.service';
import type { AuditEventType, AuditSeverity, AuditStatus, ComplianceCategory, BucketGranularity } from '../types/audit.types';
import { sanitizeAuditLogForResponse, clampLimit } from '../utils/sanitize.util';
import { getTimelineBuckets, getTopSummary } from '../services/audit-logger.service';

/**
 * Audit routes plugin
 */
export const auditRoutes = new Elysia({ prefix: '/api/audit', name: 'audit-routes' })
  .use(sessionGuard)
  .use(requirePermission('audit', 'read'))

  // ===========================================
  // AUDIT LOGS QUERIES
  // ===========================================

  // Query audit logs with filters
  .get(
    '/logs',
    async ({ query, session }) => {
      const tenantId = query.tenantId || (session as any)?.activeOrganizationId;

      const limit = clampLimit(query.limit ? parseInt(query.limit) : 100);
      const offset = query.offset ? Math.max(0, parseInt(query.offset)) : 0;
      const logs = await queryAuditLogs({
        eventType: query.eventType as AuditEventType | undefined,
        severity: query.severity as AuditSeverity | undefined,
        status: query.status as AuditStatus | undefined,
        userId: query.userId,
        tenantId,
        resource: query.resource,
        complianceCategory: query.complianceCategory as ComplianceCategory | undefined,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        limit,
        offset,
      });

      // Always mask sensitive by default in /logs
      const sanitized = logs.map((log) => sanitizeAuditLogForResponse(log, { maskSensitive: true }));

      return {
        success: true,
        data: sanitized,
        total: sanitized.length,
      };
    },
    {
      query: t.Object({
        eventType: t.Optional(t.String()),
        severity: t.Optional(t.String()),
        status: t.Optional(t.String()),
        userId: t.Optional(t.String()),
        tenantId: t.Optional(t.String()),
        resource: t.Optional(t.String()),
        complianceCategory: t.Optional(t.String()),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Audit'],
        summary: 'Query audit logs',
        description: 'Search and filter audit logs with pagination',
      },
    }
  )

  // Raw logs (unmasked) - requires audit:view_all
  .use(new Elysia().use(requirePermission('audit', 'view_all')).get(
    '/logs/raw',
    async ({ query, session }: any) => {
      const tenantId = query.tenantId || (session as any)?.activeOrganizationId;
      const limit = clampLimit(query.limit ? parseInt(query.limit) : 100);
      const offset = query.offset ? Math.max(0, parseInt(query.offset)) : 0;
      const logs = await queryAuditLogs({
        eventType: query.eventType as AuditEventType | undefined,
        severity: query.severity as AuditSeverity | undefined,
        status: query.status as AuditStatus | undefined,
        userId: query.userId,
        tenantId,
        resource: query.resource,
        complianceCategory: query.complianceCategory as ComplianceCategory | undefined,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        limit,
        offset,
      });
      return { success: true, data: logs, total: logs.length };
    },
    {
      query: t.Object({
        eventType: t.Optional(t.String()),
        severity: t.Optional(t.String()),
        status: t.Optional(t.String()),
        userId: t.Optional(t.String()),
        tenantId: t.Optional(t.String()),
        resource: t.Optional(t.String()),
        complianceCategory: t.Optional(t.String()),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Audit'],
        summary: 'Query raw audit logs',
        description: 'Retrieve unmasked audit logs (requires audit:view_all)',
      },
    }
  ))

  // Get audit log by ID
  .get(
    '/logs/:id',
    async ({ params }) => {
      const log = await getAuditLogById(params.id);

      if (!log) {
        return {
          success: false,
          error: 'Audit log not found',
        };
      }

      return {
        success: true,
        data: log,
      };
    },
    {
      params: t.Object({
        id: t.String({ description: 'Audit log ID' }),
      }),
      detail: {
        tags: ['Audit'],
        summary: 'Get audit log by ID',
        description: 'Retrieve a specific audit log entry',
      },
    }
  )

  // Get related audit logs by correlation ID
  .get(
    '/logs/correlation/:correlationId',
    async ({ params }) => {
      const logs = await getAuditLogsByCorrelation(params.correlationId);

      return {
        success: true,
        data: logs,
        total: logs.length,
      };
    },
    {
      params: t.Object({
        correlationId: t.String({ description: 'Correlation ID' }),
      }),
      detail: {
        tags: ['Audit'],
        summary: 'Get related audit logs',
        description: 'Retrieve all audit logs with the same correlation ID',
      },
    }
  )

  // Export audit logs (CSV or JSONL)
  .get(
    '/export',
    async ({ query, session }) => {
      const tenantId = query.tenantId || (session as any)?.activeOrganizationId;
      const format = (query.format || 'jsonl').toLowerCase();
      const pageSize = clampLimit(query.pageSize ? parseInt(query.pageSize) : 500, 2000, 500);

      const headers: Record<string, string> = {
        'Content-Disposition': `attachment; filename="audit-export.${format === 'csv' ? 'csv' : 'jsonl'}"`,
        'Cache-Control': 'no-cache',
      };

      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const encoder = new TextEncoder();
          let offset = 0;

          // CSV header
          if (format === 'csv') {
            controller.enqueue(
              encoder.encode(
                'id,timestamp,eventType,severity,status,userId,tenantId,resource,resourceId,action,ipAddress,userAgent,complianceCategory\n'
              )
            );
          }

          while (true) {
            const rows = await queryAuditLogs({
              eventType: query.eventType as AuditEventType | undefined,
              severity: query.severity as AuditSeverity | undefined,
              status: query.status as AuditStatus | undefined,
              userId: query.userId,
              tenantId,
              resource: query.resource,
              complianceCategory: query.complianceCategory as ComplianceCategory | undefined,
              startDate: query.startDate ? new Date(query.startDate) : undefined,
              endDate: query.endDate ? new Date(query.endDate) : undefined,
              limit: pageSize,
              offset,
            });

            if (!rows.length) break;

            for (const row of rows) {
              const log = sanitizeAuditLogForResponse(row, { maskSensitive: true });
              if (format === 'csv') {
                const line = [
                  log.id,
                  new Date(log.timestamp).toISOString(),
                  log.eventType,
                  log.severity,
                  log.status,
                  log.userId || '',
                  log.tenantId || '',
                  log.resource || '',
                  log.resourceId || '',
                  log.action || '',
                  log.ipAddress || '',
                  (log.userAgent || '').replaceAll(',', ' '),
                  log.complianceCategory || '',
                ].join(',') + '\n';
                controller.enqueue(encoder.encode(line));
              } else {
                controller.enqueue(encoder.encode(JSON.stringify(log) + '\n'));
              }
            }

            offset += rows.length;
          }

          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': format === 'csv' ? 'text/csv; charset=utf-8' : 'application/x-ndjson',
          ...headers,
        },
      });
    },
    {
      query: t.Object({
        eventType: t.Optional(t.String()),
        severity: t.Optional(t.String()),
        status: t.Optional(t.String()),
        userId: t.Optional(t.String()),
        tenantId: t.Optional(t.String()),
        resource: t.Optional(t.String()),
        complianceCategory: t.Optional(t.String()),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        format: t.Optional(t.String()), // csv | jsonl
        pageSize: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Audit'],
        summary: 'Export audit logs',
        description: 'Export filtered audit logs as CSV or JSONL (always masked).',
      },
    }
  )

  // Raw export (unmasked) - requires audit:view_all
  .use(new Elysia().use(requirePermission('audit', 'view_all')).get(
    '/export/raw',
    async ({ query, session }: any) => {
      const tenantId = query.tenantId || (session as any)?.activeOrganizationId;
      const format = (query.format || 'jsonl').toLowerCase();
      const pageSize = clampLimit(query.pageSize ? parseInt(query.pageSize) : 500, 2000, 500);
      const headers: Record<string, string> = {
        'Content-Disposition': `attachment; filename="audit-export-raw.${format === 'csv' ? 'csv' : 'jsonl'}"`,
        'Cache-Control': 'no-cache',
      };
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          const encoder = new TextEncoder();
          let offset = 0;
          if (format === 'csv') {
            controller.enqueue(
              encoder.encode(
                'id,timestamp,eventType,severity,status,userId,tenantId,resource,resourceId,action,ipAddress,userAgent,complianceCategory\n'
              )
            );
          }
          while (true) {
            const rows = await queryAuditLogs({
              eventType: query.eventType as AuditEventType | undefined,
              severity: query.severity as AuditSeverity | undefined,
              status: query.status as AuditStatus | undefined,
              userId: query.userId,
              tenantId,
              resource: query.resource,
              complianceCategory: query.complianceCategory as ComplianceCategory | undefined,
              startDate: query.startDate ? new Date(query.startDate) : undefined,
              endDate: query.endDate ? new Date(query.endDate) : undefined,
              limit: pageSize,
              offset,
            });
            if (!rows.length) break;
            for (const log of rows) {
              if (format === 'csv') {
                const line = [
                  log.id,
                  new Date(log.timestamp as any).toISOString(),
                  log.eventType,
                  log.severity,
                  log.status,
                  (log as any).userId || '',
                  (log as any).tenantId || '',
                  (log as any).resource || '',
                  (log as any).resourceId || '',
                  (log as any).action || '',
                  (log as any).ipAddress || '',
                  String((log as any).userAgent || '').replaceAll(',', ' '),
                  (log as any).complianceCategory || '',
                ].join(',') + '\n';
                controller.enqueue(encoder.encode(line));
              } else {
                controller.enqueue(encoder.encode(JSON.stringify(log) + '\n'));
              }
            }
            offset += rows.length;
          }
          controller.close();
        },
      });
      return new Response(stream, {
        headers: {
          'Content-Type': format === 'csv' ? 'text/csv; charset=utf-8' : 'application/x-ndjson',
          ...headers,
        },
      });
    },
    {
      query: t.Object({
        eventType: t.Optional(t.String()),
        severity: t.Optional(t.String()),
        status: t.Optional(t.String()),
        userId: t.Optional(t.String()),
        tenantId: t.Optional(t.String()),
        resource: t.Optional(t.String()),
        complianceCategory: t.Optional(t.String()),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        format: t.Optional(t.String()),
        pageSize: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Audit'],
        summary: 'Export raw audit logs',
        description: 'Export unmasked audit logs (requires audit:view_all)',
      },
    }
  ))

  // ===========================================
  // STATISTICS & ANALYTICS
  // ===========================================

  // Get audit statistics for a time period
  .get(
    '/statistics',
    async ({ query, session }) => {
      const tenantId = query.tenantId || (session as any)?.activeOrganizationId;

      const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = query.endDate ? new Date(query.endDate) : new Date();

      const stats = await getAuditStatistics(startDate, endDate, tenantId);

      return {
        success: true,
        data: stats,
      };
    },
    {
      query: t.Object({
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        tenantId: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Audit'],
        summary: 'Get audit statistics',
        description: 'Get aggregated statistics for audit events in a time period',
      },
    }
  )

  // Time-bucketed timeline for charts
  .get(
    '/timeline/buckets',
    async ({ query, session }) => {
      const tenantId = query.tenantId || (session as any)?.activeOrganizationId;
      const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = query.endDate ? new Date(query.endDate) : new Date();
      const bucket = (query.bucket || 'hour') as BucketGranularity;

      const data = await getTimelineBuckets(bucket, startDate, endDate, {
        tenantId,
        eventType: query.eventType as AuditEventType | undefined,
      });

      return { success: true, data };
    },
    {
      query: t.Object({
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        tenantId: t.Optional(t.String()),
        bucket: t.Optional(t.String()), // minute|hour|day
        eventType: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Audit'],
        summary: 'Timeline buckets',
        description: 'Get time-bucketed counts for charts',
      },
    }
  )

  // Top slices for quick dashboards
  .get(
    '/summary/top',
    async ({ query, session }) => {
      const tenantId = query.tenantId || (session as any)?.activeOrganizationId;
      const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = query.endDate ? new Date(query.endDate) : new Date();
      const result = await getTopSummary(startDate, endDate, tenantId);
      return { success: true, data: result };
    },
    {
      query: t.Object({
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        tenantId: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Audit'],
        summary: 'Top summary slices',
        description: 'Top event types, resources, users in a period',
      },
    }
  )

  // Get recent critical events
  .get(
    '/critical-events',
    async ({ query, session }) => {
      const tenantId = query.tenantId || (session as any)?.activeOrganizationId;
      const limit = query.limit ? parseInt(query.limit) : 50;

      const events = await getRecentCriticalEvents(tenantId, limit);

      return {
        success: true,
        data: events,
        total: events.length,
      };
    },
    {
      query: t.Object({
        tenantId: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Audit'],
        summary: 'Get recent critical events',
        description: 'Retrieve recent audit events with critical severity',
      },
    }
  )

  // Get failed events
  .get(
    '/failed-events',
    async ({ query, session }) => {
      const tenantId = query.tenantId || (session as any)?.activeOrganizationId;
      const limit = query.limit ? parseInt(query.limit) : 50;

      const events = await getFailedEvents(tenantId, limit);

      return {
        success: true,
        data: events,
        total: events.length,
      };
    },
    {
      query: t.Object({
        tenantId: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Audit'],
        summary: 'Get failed events',
        description: 'Retrieve recent audit events with failure status',
      },
    }
  )

  // ===========================================
  // COMPLIANCE (Admin only)
  // ===========================================

  .use(requireAdmin())

  // Generate compliance report
  .get(
    '/compliance/report',
    async ({ query, session }) => {
      const tenantId = query.tenantId || (session as any)?.activeOrganizationId;
      const category = (query.category || 'lgpd') as ComplianceCategory;
      const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = query.endDate ? new Date(query.endDate) : new Date();

      const report = await generateComplianceReport(category, startDate, endDate, tenantId);

      return {
        success: true,
        data: report,
      };
    },
    {
      query: t.Object({
        category: t.Optional(t.String()),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        tenantId: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Audit', 'Compliance'],
        summary: 'Generate compliance report',
        description: 'Generate compliance report for LGPD/GDPR/PCI-DSS (Admin only)',
      },
    }
  )

  // Get LGPD summary
  .get(
    '/compliance/lgpd/summary',
    async ({ query, session }) => {
      const tenantId = query.tenantId || (session as any)?.activeOrganizationId;

      const summary = await generateLGPDSummary(tenantId);

      return {
        success: true,
        data: summary,
      };
    },
    {
      query: t.Object({
        tenantId: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Audit', 'Compliance'],
        summary: 'Get LGPD compliance summary',
        description: 'Get LGPD compliance summary for last 30 days (Admin only)',
      },
    }
  )

  // Get data access history (LGPD Article 18)
  .get(
    '/compliance/data-access/:dataSubject',
    async ({ params, query }) => {
      const days = query.days ? parseInt(query.days) : 90;

      const history = await getDataAccessHistory(params.dataSubject, days);

      return {
        success: true,
        data: history,
        total: history.length,
      };
    },
    {
      params: t.Object({
        dataSubject: t.String({ description: 'Data subject ID (user ID)' }),
      }),
      query: t.Object({
        days: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Audit', 'Compliance'],
        summary: 'Get data access history',
        description: 'Get data access history for a specific user (LGPD Article 18)',
      },
    }
  )

  // Check data retention compliance
  .get(
    '/compliance/retention',
    async ({ query, session }) => {
      const tenantId = query.tenantId || (session as any)?.activeOrganizationId;

      const result = await checkDataRetentionCompliance(tenantId);

      return {
        success: true,
        data: result,
      };
    },
    {
      query: t.Object({
        tenantId: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Audit', 'Compliance'],
        summary: 'Check data retention compliance',
        description: 'Check if audit logs comply with data retention policies',
      },
    }
  )

  // ===========================================
  ;
