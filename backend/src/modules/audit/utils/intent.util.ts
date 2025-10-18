/**
 * Audit Intent Utilities
 * Other modules can mark an audit intent on the current request context.
 * The audit middleware will pick it up and persist safely.
 */

import type { AuditEventType, AuditSeverity } from '../types/audit.types';

export interface AuditIntent {
  eventType: AuditEventType;
  severity: AuditSeverity;
  resource?: string;
  action?: string;
  complianceCategory?: string;
  metadata?: Record<string, any>;
}

export function markAudit(context: any, intent: AuditIntent) {
  if (!context || typeof context !== 'object') return;
  const store = (context as any).store || (context as any);
  store.auditIntent = intent;
}

