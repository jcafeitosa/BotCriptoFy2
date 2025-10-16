# Enterprise-Grade Logging System

Sistema de logging profissional para BotCriptoFy2 com **Winston**, seguindo padrões **OpenTelemetry** e **RFC 5424**.

## Features

- **Structured JSON Logging** - Machine-readable, OpenTelemetry-compatible
- **Correlation IDs** - Distributed tracing através de requests
- **Rich Context** - Metadata completo (service, host, runtime, user, tenant)
- **Multi-Environment** - Formatos diferentes para dev/prod
- **Performance Monitoring** - Métricas de response time
- **Security Events** - Logging de eventos de segurança
- **Audit Trail** - Compliance logging (LGPD, GDPR)
- **Daily Rotation** - Logs rotativos com compressão automática
- **Error Tracking** - Stack traces completos com contexto

## Log Levels (RFC 5424)

| Level | Severity | Description | Usage |
|-------|----------|-------------|-------|
| `fatal` | 0 | System unusable | Process-exiting errors |
| `error` | 1 | Error conditions | Errors that allow app to continue |
| `warn` | 2 | Warning conditions | Potentially harmful situations |
| `info` | 3 | Informational | System progress highlights |
| `http` | 4 | HTTP requests | API request/response logging |
| `debug` | 5 | Debug information | Detailed diagnostic info |
| `trace` | 6 | Very detailed | Granular diagnostic info |

## Log Structure

### Production Format (JSON - OpenTelemetry Compatible)

```json
{
  "@timestamp": "2025-10-16T20:15:30.123Z",
  "level": "INFO",
  "severity": 3,
  "message": "Server started successfully",
  "service": {
    "name": "botcriptofy2-api",
    "version": "1.0.0",
    "environment": "production"
  },
  "host": {
    "hostname": "api-server-01",
    "platform": "linux",
    "pid": 12345
  },
  "runtime": {
    "node": "v24.3.0",
    "bun": "1.3.0"
  },
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000",
  "context": {
    "server": {
      "port": 3000,
      "url": "http://localhost:3000"
    }
  }
}
```

### Development Format (Console - Human Readable)

```
[2025-10-16 20:15:30.123] [ INFO  ] [ server      ] - Starting server on port 3000 {"environment":"development","version":"1.0.0"}
[2025-10-16 20:15:30.456] [ INFO  ] [ server      ] - Server ready at http://localhost:3000 {"environment":"development"}
[2025-10-16 20:15:30.457] [ INFO  ] [ server      ] - ├─ API Docs: http://localhost:3000/swagger
[2025-10-16 20:15:30.458] [ INFO  ] [ server      ] - └─ Health: http://localhost:3000/
[2025-10-16 20:15:31.045] [ HTTP  ] [ http        ] - ← GET /api/users 200 45ms {"source":"http","correlation_id":"550e8400-..."}
[2025-10-16 20:15:32.123] [ WARN  ] [ http        ] - ← GET /api/invalid 404 12ms {"source":"http","correlation_id":"660e8400-..."}
[2025-10-16 20:15:33.456] [ ERROR ] [ http        ] - ✗ GET /api/error 500 123ms - Database error {"source":"http","correlation_id":"770e8400-..."}
```

**Formato:** `[YYYY-MM-DD HH:mm:ss.SSS] [ LEVEL ] [ SOURCE ] - message {metadata}`

**Componentes:**
- **Timestamp**: Data e hora com milissegundos
- **Level**: Nível do log (5 caracteres, colorizado)
- **Source**: Origem do log (12 caracteres: server, http, process, database, etc)
- **Message**: Mensagem descritiva e concisa
- **Metadata**: JSON com contexto essencial (opcional)

## File Structure

```
logs/
├── combined-YYYY-MM-DD.log       # All logs (JSON)
├── error-YYYY-MM-DD.log          # Errors only (JSON)
├── http-YYYY-MM-DD.log           # HTTP requests (JSON)
├── performance-YYYY-MM-DD.log    # Performance metrics (JSON)
├── exceptions-YYYY-MM-DD.log     # Uncaught exceptions (JSON)
└── rejections-YYYY-MM-DD.log     # Unhandled rejections (JSON)
```

### Rotation Configuration

| File | Max Size | Retention | Compression |
|------|----------|-----------|-------------|
| combined | 100MB | 30 days | Yes |
| error | 50MB | 90 days | Yes |
| http | 100MB | 7 days | Yes |
| performance | 50MB | 7 days | Yes |
| exceptions | 20MB | 90 days | Yes |
| rejections | 20MB | 90 days | Yes |

## Usage

### Basic Logging

```typescript
import logger from './utils/logger';

// Info
logger.info('User created', {
  user_id: '123',
  email: 'user@example.com',
});

// Debug
logger.debug('Processing request', {
  request_id: 'abc-123',
  payload: { key: 'value' },
});

// Warning
logger.warn('Rate limit approaching', {
  user_id: '123',
  current_rate: 95,
  limit: 100,
});

// Error
logger.error('Database connection failed', {
  error: {
    name: 'ConnectionError',
    message: 'Connection timeout',
    stack: '...',
  },
  database: 'postgres',
});
```

### Helper Functions

```typescript
import {
  logRequest,
  logError,
  logInfo,
  logWarn,
  logDebug,
  logTrace,
  logFatal,
  logMetric,
  logPerformance,
  logSecurity,
  logAudit,
} from './utils/logger';

// HTTP Request (automatic via middleware)
logRequest('GET', '/api/users', 200, 45, {
  correlation_id: '550e8400-e29b-41d4-a716-446655440000',
  user_id: '123',
  tenant_id: '456',
  ip: '192.168.1.1',
  user_agent: 'Mozilla/5.0',
});

// Error with context
logError(new Error('Database error'), {
  query: 'SELECT * FROM users',
  database: 'postgres',
  connection_pool: 'main',
});

// Fatal error (process-exiting)
logFatal('Critical system failure', error, {
  component: 'database',
});

// Business metric
logMetric('active_users', 1500, 'count', {
  tenant_id: '456',
});

// Performance measurement
logPerformance('database_query', 45, {
  query: 'SELECT * FROM users',
  rows: 100,
});

// Security event
logSecurity('Failed login attempt', 'high', {
  user_id: '123',
  ip: '192.168.1.1',
  attempts: 5,
});

// Audit event (compliance)
logAudit('delete', 'user', '123', 'success', {
  admin_id: '456',
  tenant_id: '789',
});
```

### Correlation IDs

Correlation IDs são automaticamente gerados para cada request e permitem rastreamento distribuído:

```typescript
// Middleware automatically adds correlation_id to all logs
// Client can also provide via header: X-Correlation-ID

// Example: Track a request across multiple services
// Request 1: GET /api/users
// correlation_id: 550e8400-e29b-41d4-a716-446655440000
//
// All logs for this request will have the same correlation_id:
// - HTTP request log
// - Database query log
// - Cache access log
// - External API call log
// - Response log
```

### Child Logger (Persistent Context)

```typescript
import { createChildLogger } from './utils/logger';

// Create logger with persistent context
const userLogger = createChildLogger({
  user_id: '123',
  tenant_id: '456',
});

// All logs from this logger will include the context
userLogger.info('User action performed');
// Output includes: user_id: '123', tenant_id: '456'
```

### Use Logger in Routes

```typescript
app.get('/api/test', ({ logger }) => {
  logger.info('Test endpoint accessed');
  return { success: true };
});
```

## Environment Variables

```bash
# Log Level (fatal, error, warn, info, http, debug, trace)
LOG_LEVEL=debug         # development
LOG_LEVEL=info          # production

# Environment
NODE_ENV=development    # development | production | test

# Application Version
APP_VERSION=1.0.0
```

## HTTP Logging (Automatic)

O middleware `loggerMiddleware` loga automaticamente todas as requisições HTTP com:

- **Correlation ID** - Rastreamento distribuído
- **Request Context** - Method, path, headers
- **Response Context** - Status code, duration
- **User Context** - user_id, tenant_id (se autenticado)
- **Client Context** - IP, user-agent
- **Performance** - Response time em milissegundos

### Exemplo de Log HTTP

**Console (Development):**
```
[2025-10-16 20:15:31.045] [ HTTP  ] [ http        ] - ← GET /api/users 200 45ms {"source":"http","correlation_id":"550e8400-...","user_id":"123","tenant_id":"456"}
```

**JSON (Production):**
```json
{
  "@timestamp": "2025-10-16T20:15:31.456Z",
  "level": "HTTP",
  "severity": 4,
  "message": "← GET /api/users 200 45ms",
  "service": {
    "name": "botcriptofy2-api",
    "version": "1.0.0",
    "environment": "production"
  },
  "host": {
    "hostname": "api-server-01",
    "platform": "linux",
    "pid": 12345
  },
  "runtime": {
    "node": "v24.3.0",
    "bun": "1.3.0"
  },
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000",
  "context": {
    "source": "http",
    "user_id": "123",
    "tenant_id": "456"
  }
}
```

## Security & Compliance

### Security Events

```typescript
import { logSecurity } from './utils/logger';

// Failed authentication
logSecurity('Failed login attempt', 'high', {
  user_id: '123',
  ip: '192.168.1.1',
  attempts: 5,
});

// Unauthorized access
logSecurity('Unauthorized access attempt', 'critical', {
  user_id: '123',
  resource: '/admin/users',
  required_permission: 'admin:read',
});

// Suspicious activity
logSecurity('SQL injection attempt detected', 'critical', {
  ip: '192.168.1.1',
  query: 'SELECT * FROM users WHERE id=1 OR 1=1',
});
```

### Audit Trail (LGPD, GDPR)

```typescript
import { logAudit } from './utils/logger';

// User data access
logAudit('read', 'user_profile', '123', 'success', {
  accessed_by: '456',
  tenant_id: '789',
});

// Data modification
logAudit('update', 'user_email', '123', 'success', {
  old_value: 'old@example.com',
  new_value: 'new@example.com',
  modified_by: '456',
});

// Data deletion
logAudit('delete', 'user_account', '123', 'success', {
  reason: 'GDPR right to be forgotten',
  requested_by: '123',
  approved_by: '456',
});
```

## Performance Monitoring

```typescript
import { logPerformance, logMetric } from './utils/logger';

// Measure operation duration
const start = Date.now();
await database.query('SELECT * FROM users');
logPerformance('database_query', Date.now() - start, {
  query: 'users',
  rows: 100,
});

// Track business metrics
logMetric('active_users', 1500, 'count');
logMetric('revenue', 50000.00, 'USD');
logMetric('cpu_usage', 75.5, 'percent');
```

## Best Practices

### ✅ DO

```typescript
// Use structured logging with context
logger.info('User registered', {
  user_id: user.id,
  email: user.email,
  tenant_id: tenant.id,
  registration_source: 'web',
});

// Log errors with full context
logError(error, {
  operation: 'user_registration',
  input: { email: 'user@example.com' },
  database: 'postgres',
});

// Use appropriate log levels
logger.error('Critical failure');     // Errors
logger.warn('Degraded performance');  // Warnings
logger.info('User action completed'); // Info
logger.debug('Internal state');       // Debug

// Add correlation IDs for tracing
logger.info('External API call', {
  correlation_id: request.correlation_id,
  api: 'payment_gateway',
});
```

### ❌ DON'T

```typescript
// Don't use console.log
console.log('Test'); // ❌

// Don't log sensitive data
logger.info('User login', {
  password: 'secret123',      // ❌
  credit_card: '1234-5678',   // ❌
  ssn: '123-45-6789',         // ❌
});

// Don't log in tight loops
for (let i = 0; i < 10000; i++) {
  logger.debug(`Item ${i}`); // ❌
}

// Don't concatenate strings
logger.info('User ' + userId + ' created'); // ❌
logger.info('User created', { userId });    // ✅

// Don't log without context
logger.error('Error occurred'); // ❌ (no details)
```

## Log Analysis

### Query Logs (jq)

```bash
# Filter by level
cat logs/combined-*.log | jq 'select(.level == "ERROR")'

# Filter by correlation_id
cat logs/combined-*.log | jq 'select(.correlation_id == "550e8400-...")'

# Count errors by type
cat logs/error-*.log | jq -r '.context.error.name' | sort | uniq -c

# Average response time
cat logs/http-*.log | jq '.context.http.response_time_ms' | awk '{sum+=$1} END {print sum/NR}'

# Slow requests (>1000ms)
cat logs/http-*.log | jq 'select(.context.http.response_time_ms > 1000)'

# Security events today
cat logs/combined-$(date +%Y-%m-%d).log | jq 'select(.context.security != null)'

# Audit trail for user
cat logs/combined-*.log | jq 'select(.context.audit.user_id == "123")'
```

### Monitoring & Alerts

```bash
# Monitor error rate
tail -f logs/error-*.log | jq -r '.message'

# Real-time performance
tail -f logs/http-*.log | jq -r '[.message, .context.http.response_time_ms] | @tsv'

# Alert on critical security events
tail -f logs/combined-*.log | jq 'select(.context.security.severity == "critical")'
```

## Integration with Observability Tools

### Elasticsearch (ELK Stack)

```bash
# Filebeat configuration
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /app/logs/combined-*.log
    json.keys_under_root: true
    json.add_error_key: true
    fields:
      service: botcriptofy2-api
```

### Grafana Loki

```bash
# Promtail configuration
- job_name: botcriptofy2
  static_configs:
    - targets: [localhost]
      labels:
        job: botcriptofy2-api
        __path__: /app/logs/combined-*.log
```

### Datadog

```bash
# Datadog agent configuration
logs:
  - type: file
    path: /app/logs/combined-*.log
    service: botcriptofy2-api
    source: nodejs
    sourcecategory: sourcecode
```

## Error Handling

### Global Error Handlers

Automaticamente configurado no `index.ts`:

- **Uncaught Exceptions** → `exceptions-YYYY-MM-DD.log`
- **Unhandled Rejections** → `rejections-YYYY-MM-DD.log`
- **HTTP Errors** → `error-YYYY-MM-DD.log`

### Custom Error Classes

```typescript
import { BadRequestError, UnauthorizedError, NotFoundError } from './utils/errors';

// Throw custom error (automatically logged)
throw new NotFoundError('User not found', {
  user_id: '123',
  searched_by: '456',
});
```

## Performance Impact

- **Production**: JSON format optimizado para parsing
- **Development**: Human-readable format para debugging
- **Overhead**: < 1ms por log entry
- **Async**: Escrita assíncrona (non-blocking)
- **Compression**: Gzip automático para arquivos antigos

## Dependencies

```json
{
  "winston": "^3.18.3",
  "winston-daily-rotate-file": "^5.0.0"
}
```

## Resources

- [Winston Documentation](https://github.com/winstonjs/winston)
- [OpenTelemetry Specification](https://opentelemetry.io/docs/specs/otel/)
- [RFC 5424 (Syslog Protocol)](https://datatracker.ietf.org/doc/html/rfc5424)
- [12-Factor App Logging](https://12factor.net/logs)

---

**BotCriptoFy2** | Enterprise Logging System v2.0.0
