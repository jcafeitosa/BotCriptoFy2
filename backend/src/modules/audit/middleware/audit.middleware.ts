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
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;
    const statusCode = typeof set.status === 'number' ? set.status : 200;

    // Skip health checks and public endpoints
    if (path === '/' || path === '/health' || path.startsWith('/swagger')) {
      return;
    }

    // Determine if this request should be audited
    const auditConfig = getAuditConfig(method, path, statusCode);

    if (!auditConfig) {
      return;
    }

    // Get user context
    const userId = user?.id;
    const tenantId = (session as any)?.activeOrganizationId;

    // Get request context
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    // Log audit event (non-blocking)
    const numericStatusCode = typeof statusCode === 'number' ? statusCode : 200;
    await logAuditEvent({
      eventType: auditConfig.eventType,
      severity: auditConfig.severity,
      status: numericStatusCode >= 200 && numericStatusCode < 300 ? 'success' : 'failure',
      userId,
      tenantId,
      ipAddress,
      userAgent,
      resource: auditConfig.resource,
      action: auditConfig.action,
      metadata: {
        method,
        path,
        statusCode,
        requestId: request.headers.get('x-request-id'),
      },
      complianceCategory: auditConfig.complianceCategory,
    });
  });

/**
 * Get audit configuration for a request
 */
function getAuditConfig(
  method: string,
  path: string,
  statusCode: number
): {
  eventType: AuditEventType;
  severity: AuditSeverity;
  resource?: string;
  action?: string;
  complianceCategory?: string;
} | null {
  // Authentication events
  if (path.startsWith('/api/auth')) {
    if (path.includes('/sign-in') && method === 'POST') {
      return {
        eventType: statusCode === 200 ? 'auth.login' : 'auth.failed_login',
        severity: statusCode === 200 ? 'medium' : 'high',
        resource: 'auth',
        action: 'login',
      };
    }

    if (path.includes('/sign-up') && method === 'POST') {
      return {
        eventType: 'auth.register',
        severity: 'medium',
        resource: 'auth',
        action: 'register',
      };
    }

    if (path.includes('/sign-out') && method === 'POST') {
      return {
        eventType: 'auth.logout',
        severity: 'low',
        resource: 'auth',
        action: 'logout',
      };
    }

    if (path.includes('/reset-password') && method === 'POST') {
      return {
        eventType: 'auth.password_reset',
        severity: 'high',
        resource: 'auth',
        action: 'password_reset',
      };
    }
  }

  // User management events
  if (path.startsWith('/api/user')) {
    if (method === 'POST') {
      return {
        eventType: 'user.created',
        severity: 'medium',
        resource: 'users',
        action: 'create',
      };
    }

    if (method === 'PUT' || method === 'PATCH') {
      return {
        eventType: 'user.updated',
        severity: 'medium',
        resource: 'users',
        action: 'update',
      };
    }

    if (method === 'DELETE') {
      return {
        eventType: 'user.deleted',
        severity: 'high',
        resource: 'users',
        action: 'delete',
        complianceCategory: 'lgpd',
      };
    }
  }

  // RBAC events
  if (path.startsWith('/api/security')) {
    if (path.includes('/roles') && (method === 'POST' || method === 'DELETE')) {
      return {
        eventType: method === 'POST' ? 'rbac.role_assigned' : 'rbac.role_removed',
        severity: 'high',
        resource: 'rbac',
        action: method === 'POST' ? 'role_assign' : 'role_remove',
      };
    }

    if (path.includes('/permissions') && (method === 'POST' || method === 'DELETE')) {
      return {
        eventType: method === 'POST' ? 'rbac.permission_granted' : 'rbac.permission_revoked',
        severity: 'high',
        resource: 'rbac',
        action: method === 'POST' ? 'permission_grant' : 'permission_revoke',
      };
    }

    if (statusCode === 403) {
      return {
        eventType: 'security.permission_denied',
        severity: 'medium',
        resource: 'security',
        action: 'access_denied',
      };
    }
  }

  // Configuration events
  if (path.startsWith('/api/configurations')) {
    if (method === 'POST') {
      return {
        eventType: 'config.created',
        severity: 'medium',
        resource: 'configurations',
        action: 'create',
      };
    }

    if (method === 'PUT' || method === 'PATCH') {
      return {
        eventType: 'config.updated',
        severity: 'medium',
        resource: 'configurations',
        action: 'update',
      };
    }

    if (method === 'DELETE') {
      return {
        eventType: 'config.deleted',
        severity: 'high',
        resource: 'configurations',
        action: 'delete',
      };
    }
  }

  // Financial events
  if (path.startsWith('/api/financial')) {
    if (method === 'POST') {
      return {
        eventType: 'financial.transaction_created',
        severity: 'critical',
        resource: 'financial',
        action: 'create_transaction',
        complianceCategory: 'pci_dss',
      };
    }
  }

  // Subscription events
  if (path.startsWith('/api/subscriptions')) {
    if (method === 'POST' || method === 'PUT') {
      return {
        eventType: 'subscription.upgraded',
        severity: 'high',
        resource: 'subscriptions',
        action: method === 'POST' ? 'create' : 'update',
      };
    }

    if (method === 'DELETE') {
      return {
        eventType: 'subscription.cancelled',
        severity: 'high',
        resource: 'subscriptions',
        action: 'cancel',
      };
    }
  }

  // Data export events (LGPD)
  if (path.includes('/export') && method === 'GET') {
    return {
      eventType: 'data.exported',
      severity: 'high',
      resource: 'data',
      action: 'export',
      complianceCategory: 'lgpd',
    };
  }

  // Rate limit violations
  if (statusCode === 429) {
    return {
      eventType: 'security.rate_limit_exceeded',
      severity: 'medium',
      resource: 'security',
      action: 'rate_limit',
    };
  }

  // Unauthorized access attempts
  if (statusCode === 401 || statusCode === 403) {
    return {
      eventType: 'security.unauthorized_access',
      severity: 'high',
      resource: 'security',
      action: 'unauthorized_access',
    };
  }

  // Server errors
  if (statusCode >= 500) {
    return {
      eventType: 'system.error',
      severity: 'critical',
      resource: 'system',
      action: 'error',
    };
  }

  return null;
}
