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
import { runAnomalyDetection } from '../services/anomaly-detection.service';
import type { AuditEventType, AuditSeverity, AuditStatus, ComplianceCategory } from '../types/audit.types';

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
        limit: query.limit ? parseInt(query.limit) : 100,
        offset: query.offset ? parseInt(query.offset) : 0,
      });

      return {
        success: true,
        data: logs,
        total: logs.length,
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
  // ANOMALY DETECTION (Admin only)
  // ===========================================

  // Run anomaly detection for a user
  .post(
    '/anomaly-detection',
    async ({ body, session }) => {
      const tenantId = body.tenantId || (session as any)?.activeOrganizationId;

      const result = await runAnomalyDetection(body.userId, body.ipAddress, tenantId);

      return {
        success: true,
        data: result,
      };
    },
    {
      body: t.Object({
        userId: t.String({ description: 'User ID to check' }),
        ipAddress: t.Optional(t.String({ description: 'IP address' })),
        tenantId: t.Optional(t.String({ description: 'Tenant ID' })),
      }),
      detail: {
        tags: ['Audit', 'Security'],
        summary: 'Run anomaly detection',
        description: 'Run comprehensive anomaly detection for a user (Admin only)',
      },
    }
  );
