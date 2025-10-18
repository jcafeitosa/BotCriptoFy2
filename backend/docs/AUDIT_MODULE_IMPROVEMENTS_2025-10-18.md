# Audit Module Improvements — 2025-10-18

This update strengthens the audit module with advanced endpoints, safer defaults, and cross-cutting middleware.

Highlights
- Global optional session context and audit middleware enabled
- Intent-driven audit: modules can call `markAudit(ctx, intent)`
- Sensitive-field masking by default (IP, UA, stack traces)
- Advanced export endpoint (CSV/JSONL) with pagination streaming
- Time-bucket analytics for charts and dashboard top slices
- Parameter clamping and stricter input handling
- Unit tests for sanitization utilities

Endpoints
- GET `/api/audit/logs` (masked by default)
  - Filters: `eventType,severity,status,userId,tenantId,resource,complianceCategory,startDate,endDate,limit,offset`
- GET `/api/audit/logs/raw` (requires `audit:view_all`)
- GET `/api/audit/logs/:id`
- GET `/api/audit/logs/correlation/:correlationId`
- GET `/api/audit/statistics`
- GET `/api/audit/critical-events`
- GET `/api/audit/failed-events`
- GET `/api/audit/export` (always masked)
  - Query: same filters as `/logs` + `format=csv|jsonl` (default jsonl), `pageSize`
- GET `/api/audit/export/raw` (requires `audit:view_all`)
- GET `/api/audit/timeline/buckets`
  - Query: `bucket=minute|hour|day` (default hour), `startDate`, `endDate`, optional `eventType`, `tenantId`
- GET `/api/audit/summary/top`
  - Query: `startDate`, `endDate`, `tenantId`

Security & Privacy
- By default responses mask IP addresses, truncate user-agent and remove stack traces
- Sensitive metadata keys (token, password, secret, apiKey, privateKey) are redacted
- Raw endpoints require `audit:view_all` permission
- Rate limiter is applied globally; exports stream in pages to protect memory

Middleware
- `optionalSessionGuard` enabled globally to enrich context without blocking
- `auditMiddleware` updated to be intent-driven and only use minimal fallbacks (429/401-403/5xx)

Testing
- Unit tests: `backend/src/modules/audit/utils/__tests__/sanitize.util.test.ts`

Notes
- TimescaleDB is optional; time-bucket analytics use `date_trunc()` and work on standard Postgres.

Developer tip
- Use `markAudit(ctx, { eventType, severity, resource, action, complianceCategory, metadata })` inside route handlers to record explicit audit events without path-based coupling.
