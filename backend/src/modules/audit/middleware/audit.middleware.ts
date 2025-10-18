/**
 * Audit Middleware
 * Automatically captures important events for audit logging
 */

import { Elysia } from 'elysia';
import { logAuditEvent } from '../services/audit-logger.service';
import type { AuditEventType, AuditSeverity } from '../types/audit.types';

/**
 * Audit logging middleware
 * Automatically logs HTTP requests that match important patterns
 */
export const auditMiddleware = new Elysia({ name: 'audit-middleware' })
  .onAfterResponse(async ({ request, set, store }: any) => {
    const user = (store as any)?.user;
    const session = (store as any)?.session;
    const intent = (store as any)?.auditIntent as
      | {
          eventType: AuditEventType;
          severity: AuditSeverity;
          resource?: string;
          action?: string;
          complianceCategory?: string;
          metadata?: Record<string, any>;
        }
      | undefined;

    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;
    const statusCode = typeof set.status === 'number' ? set.status : 200;

    // Skip health docs and root
    if (path === '/' || path === '/health' || path.startsWith('/swagger')) return;

    // Context
    const userId = user?.id;
    const tenantId = (session as any)?.activeOrganizationId;
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      undefined;
    const userAgent = request.headers.get('user-agent') || undefined;
    const numericStatusCode = typeof statusCode === 'number' ? statusCode : 200;

    // 1) Priority: explicit audit intent set by modules
    if (intent) {
      await logAuditEvent({
        eventType: intent.eventType,
        severity: intent.severity,
        status: numericStatusCode >= 200 && numericStatusCode < 300 ? 'success' : 'failure',
        userId,
        tenantId,
        ipAddress,
        userAgent,
        resource: intent.resource,
        action: intent.action,
        metadata: {
          ...(intent.metadata || {}),
          method,
          path,
          statusCode,
          requestId: request.headers.get('x-request-id'),
        },
        complianceCategory: intent.complianceCategory,
      });
      // clear intent for safety
      (store as any).auditIntent = undefined;
      return;
    }

    // 2) Minimal fallback: security-relevant generics only
    const fallback = getFallbackAuditConfig(numericStatusCode);
    if (!fallback) return;

    await logAuditEvent({
      eventType: fallback.eventType,
      severity: fallback.severity,
      status: numericStatusCode >= 200 && numericStatusCode < 300 ? 'success' : 'failure',
      userId,
      tenantId,
      ipAddress,
      userAgent,
      resource: 'system',
      action: fallback.action,
      metadata: { method, path, statusCode, requestId: request.headers.get('x-request-id') },
    });
  });

/**
 * Get audit configuration for a request
 */
function getFallbackAuditConfig(
  statusCode: number
): { eventType: AuditEventType; severity: AuditSeverity; action: string } | null {
  if (statusCode === 429) {
    return { eventType: 'security.rate_limit_exceeded', severity: 'medium', action: 'rate_limit' };
  }
  if (statusCode === 401 || statusCode === 403) {
    return { eventType: 'security.unauthorized_access', severity: 'high', action: 'unauthorized_access' };
  }
  if (statusCode >= 500) {
    return { eventType: 'system.error', severity: 'critical', action: 'error' };
  }
  return null;
}
