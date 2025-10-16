/**
 * Audit Module
 * Exports all audit-related functionality
 */

// Schema (explicitly export to avoid ambiguity)
export { auditLogs, type NewAuditLog, type AuditLog } from './schema/audit.schema';

// Types
export * from './types/audit.types';

// Services
export * from './services/audit-logger.service';
export * from './services/compliance.service';
export * from './services/anomaly-detection.service';

// Routes
export { auditRoutes } from './routes/audit.routes';

// Middleware
export { auditMiddleware } from './middleware/audit.middleware';
