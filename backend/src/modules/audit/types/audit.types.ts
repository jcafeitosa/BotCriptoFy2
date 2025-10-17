/**
 * Audit Types
 * Type definitions for audit logging system
 */

/**
 * Audit event types
 */
export type AuditEventType =
  // Authentication events
  | 'auth.login'
  | 'auth.logout'
  | 'auth.register'
  | 'auth.password_reset'
  | 'auth.email_verified'
  | 'auth.failed_login'
  // User events
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.profile_updated'
  // Tenant events
  | 'tenant.created'
  | 'tenant.updated'
  | 'tenant.deleted'
  | 'tenant.member_added'
  | 'tenant.member_removed'
  | 'tenant.settings_changed'
  // Role & Permission events
  | 'rbac.role_assigned'
  | 'rbac.role_removed'
  | 'rbac.permission_granted'
  | 'rbac.permission_revoked'
  // Financial events
  | 'financial.transaction_created'
  | 'financial.payment_processed'
  | 'financial.payment_failed'
  | 'financial.refund_issued'
  | 'financial.chargeback'
  // Subscription events
  | 'subscription.created'
  | 'subscription.upgraded'
  | 'subscription.downgraded'
  | 'subscription.cancelled'
  | 'subscription.renewed'
  // Configuration events
  | 'config.created'
  | 'config.updated'
  | 'config.deleted'
  // Security events
  | 'security.suspicious_activity'
  | 'security.rate_limit_exceeded'
  | 'security.unauthorized_access'
  | 'security.permission_denied'
  // Trading events
  | 'trading.order_created'
  | 'trading.order_executed'
  | 'trading.order_cancelled'
  | 'trading.bot_started'
  | 'trading.bot_stopped'
  // P2P events
  | 'p2p.order_created'
  | 'p2p.order_updated'
  | 'p2p.order_cancelled'
  | 'p2p.order_matched'
  | 'p2p.trade_created'
  | 'p2p.trade_completed'
  | 'p2p.trade_cancelled'
  | 'p2p.dispute_opened'
  | 'p2p.dispute_resolved'
  // Data events
  | 'data.exported'
  | 'data.deleted'
  | 'data.anonymized'
  // System events
  | 'system.error'
  | 'system.warning'
  | 'system.maintenance';

/**
 * Audit severity levels
 */
export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Audit status
 */
export type AuditStatus = 'success' | 'failure' | 'pending' | 'error';

/**
 * Compliance categories
 */
export type ComplianceCategory = 'lgpd' | 'gdpr' | 'pci_dss' | 'sox' | 'internal';

/**
 * Audit log entry
 */
export interface AuditLog {
  id: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  status: AuditStatus;
  userId?: string;
  tenantId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  metadata?: Record<string, any>;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  complianceCategory?: ComplianceCategory;
  timestamp: Date;
}

/**
 * Audit query filters
 */
export interface AuditQueryFilters {
  eventType?: AuditEventType;
  severity?: AuditSeverity;
  status?: AuditStatus;
  userId?: string;
  tenantId?: string;
  resource?: string;
  complianceCategory?: ComplianceCategory;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Audit statistics
 */
export interface AuditStatistics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  eventsByStatus: Record<string, number>;
  topUsers: Array<{ userId: string; count: number }>;
  timeRange: {
    start: Date;
    end: Date;
  };
}

/**
 * Compliance report
 */
export interface ComplianceReport {
  category: ComplianceCategory;
  period: {
    start: Date;
    end: Date;
  };
  totalEvents: number;
  criticalEvents: number;
  failedEvents: number;
  findings: Array<{
    type: string;
    severity: AuditSeverity;
    count: number;
    description: string;
  }>;
  recommendations: string[];
}

/**
 * Anomaly detection result
 */
export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  confidence: number;
  reason?: string;
  relatedEvents: string[];
  timestamp: Date;
}
