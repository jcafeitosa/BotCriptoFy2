/**
 * Audit Schema
 * Database schema for audit logging with TimescaleDB
 */

import { pgTable, text, timestamp, uuid, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from '../../auth/schema/auth.schema';
import { tenants } from '../../tenants/schema/tenants.schema';

/**
 * Audit Logs Table
 * Stores immutable audit logs with TimescaleDB hypertable for time-series optimization
 *
 * Features:
 * - Immutable logs (append-only)
 * - TimescaleDB hypertable partitioned by timestamp
 * - Automatic compression after 7 days
 * - Automatic data retention (90 days for low/medium, 365 days for high/critical)
 * - Optimized for time-range queries
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Event information
    eventType: text('event_type').notNull(), // AuditEventType
    severity: text('severity').notNull().default('medium'), // low, medium, high, critical
    status: text('status').notNull().default('success'), // success, failure, pending, error

    // User context
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'set null' }),

    // Request context
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),

    // Resource information
    resource: text('resource'), // Table/entity name
    resourceId: text('resource_id'), // ID of affected resource
    action: text('action'), // CRUD action or custom action

    // Event metadata
    metadata: jsonb('metadata'), // Additional context
    changes: jsonb('changes'), // Before/after changes { before: {}, after: {} }
    errorMessage: text('error_message'), // Error details if status is error
    errorStack: text('error_stack'), // Stack trace for errors

    // Compliance
    complianceCategory: text('compliance_category'), // lgpd, gdpr, pci_dss, sox, internal

    // Timestamps
    timestamp: timestamp('timestamp').notNull().defaultNow(),

    // Correlation (for tracking related events)
    correlationId: text('correlation_id'), // Links related audit events
    sessionId: text('session_id'), // User session ID
    requestId: text('request_id'), // Request ID for debugging
  },
  (table) => ({
    // Indexes optimized for common queries
    timestampIdx: index('audit_logs_timestamp_idx').on(table.timestamp),
    userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
    tenantIdIdx: index('audit_logs_tenant_id_idx').on(table.tenantId),
    eventTypeIdx: index('audit_logs_event_type_idx').on(table.eventType),
    severityIdx: index('audit_logs_severity_idx').on(table.severity),
    resourceIdx: index('audit_logs_resource_idx').on(table.resource, table.resourceId),
    complianceIdx: index('audit_logs_compliance_idx').on(table.complianceCategory),
    correlationIdx: index('audit_logs_correlation_idx').on(table.correlationId),

    // Composite indexes for common filter combinations
    userTimeIdx: index('audit_logs_user_time_idx').on(table.userId, table.timestamp),
    tenantTimeIdx: index('audit_logs_tenant_time_idx').on(table.tenantId, table.timestamp),
    eventSeverityIdx: index('audit_logs_event_severity_idx').on(table.eventType, table.severity),
  })
);

/**
 * Audit Log Relations
 */
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
