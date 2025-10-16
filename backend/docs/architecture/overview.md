# System Architecture Overview

## High-Level Architecture

BotCriptoFy2 backend is built on a modern, scalable architecture using Bun runtime with Elysia framework.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  (Web Browser, Mobile App, Trading Bots, External Services)     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Elysia API Server                           │
│                     (Bun Runtime - Port 3000)                    │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              Middleware Stack                           │    │
│  │  1. Logger Middleware (Winston)                        │    │
│  │  2. Error Middleware (Global error handling)           │    │
│  │  3. CORS Middleware                                     │    │
│  │  4. Transform Middleware (Pagination, sanitization)    │    │
│  └────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              Route Layer                                │    │
│  │  • Health Routes (/, /health)                          │    │
│  │  • Auth Routes (/api/auth/*)                           │    │
│  │  • User Routes (/api/user/*)                           │    │
│  │  • Tenant Routes (/api/tenant/*)                       │    │
│  │  • Module Routes (/api/v1/*)                           │    │
│  └────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │          Authentication & Authorization                 │    │
│  │  • Better-Auth (Session management)                    │    │
│  │  • RBAC Guards (Role-based access)                     │    │
│  │  • Tenant Guards (Multi-tenant isolation)              │    │
│  └────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              Business Logic Layer                       │    │
│  │  • Services (Business logic)                           │    │
│  │  • Controllers (Request handling)                      │    │
│  │  • Utils (Helper functions)                            │    │
│  └────────────────────────────────────────────────────────┘    │
│                              │                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              Data Access Layer                          │    │
│  │  • Drizzle ORM (Type-safe queries)                     │    │
│  │  • Schema Definitions                                   │    │
│  │  • Migrations                                           │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ SQL
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PostgreSQL + TimescaleDB                      │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │  Authentication  │  │  Multi-Tenancy   │  │  Business    │ │
│  │  Tables          │  │  Tables          │  │  Tables      │ │
│  │  • users         │  │  • tenants       │  │  • dept...   │ │
│  │  • sessions      │  │  • members       │  │  • subs...   │ │
│  │  • accounts      │  │  • roles         │  │  • audit...  │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      External Services                           │
│  • Redis (Cache & Sessions)                                      │
│  • Ollama (AI/ML Models)                                         │
│  • SMTP (Email)                                                  │
│  • Stripe (Payments)                                             │
│  • Telegram Bot (Notifications)                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Core Architectural Principles

### 1. Modular Design
- **14 independent modules** for different business domains
- Each module is self-contained with its own schema, types, services, routes
- Modules can be developed, tested, and deployed independently
- Clear module boundaries and interfaces

### 2. Multi-Tenancy
- **Hybrid approach**: 1:N for company, 1:1 for traders/influencers
- Tenant isolation at database level (tenant_id foreign keys)
- Tenant context injected via middleware
- Tenant-specific role-based access control

### 3. Type Safety
- **TypeScript everywhere** with strict mode enabled
- Drizzle ORM provides compile-time SQL type safety
- Zod schemas for runtime validation
- Type inference from database schema

### 4. Security First
- **Authentication**: Better-Auth with session tokens
- **Authorization**: RBAC with granular permissions
- **Input Validation**: Zod schemas on all endpoints
- **Rate Limiting**: Adaptive rate limits per user
- **Audit Logging**: Complete audit trail

### 5. Observability
- **Structured Logging**: Winston with JSON format
- **Correlation IDs**: Request tracing across services
- **Error Tracking**: Comprehensive error context
- **Performance Metrics**: Request duration tracking

### 6. Scalability
- **Stateless API**: Sessions stored in database/Redis
- **Horizontal Scaling**: Multiple server instances
- **Database Optimization**: Indexes, connection pooling
- **Caching Strategy**: Redis for hot data

## Technology Stack

### Runtime & Framework
- **Bun 1.0.0**: Ultra-fast JavaScript runtime (10x faster than Node.js)
- **Elysia 1.4.12**: Ergonomic web framework with end-to-end type safety
- **TypeScript 5.x**: Strict type checking

### Database
- **PostgreSQL 14+**: Reliable RDBMS
- **TimescaleDB**: Time-series extension for trading data
- **Drizzle ORM**: Lightweight TypeScript ORM

### Authentication
- **Better-Auth 1.1.5**: Modern authentication library
- **Drizzle Adapter**: PostgreSQL session storage
- **bcrypt**: Password hashing

### Logging
- **Winston 3.19.0**: Enterprise logging
- **winston-daily-rotate-file**: Log rotation
- **OpenTelemetry format**: Structured JSON logs

### API Documentation
- **Swagger/OpenAPI 3.0**: API specification
- **Scalar**: Beautiful interactive documentation UI

### Development Tools
- **Drizzle Kit**: Database migrations
- **Drizzle Studio**: Database GUI
- **ESLint**: Code linting
- **Prettier**: Code formatting

## Request/Response Flow

### 1. Request Received
```typescript
Client → Elysia Server (Port 3000)
```

### 2. Middleware Pipeline
```typescript
Request
  → Logger Middleware (log incoming request)
  → CORS Middleware (validate origin)
  → Error Middleware (wrap in try-catch)
  → Transform Middleware (sanitize input)
  → Auth Middleware (validate session)
  → RBAC Middleware (check permissions)
  → Tenant Middleware (validate tenant access)
```

### 3. Route Handler
```typescript
Route Handler
  → Controller (validate input)
  → Service (business logic)
  → Drizzle ORM (database query)
  → Response Formatting
```

### 4. Response Returned
```typescript
Response
  → Logger Middleware (log response)
  → Error Middleware (catch errors)
  → Client (JSON response)
```

## Error Handling Flow

### 1. Operational Errors (Expected)
```typescript
try {
  const user = await findUser(id);
  if (!user) {
    throw new NotFoundError('User not found', { userId: id });
  }
} catch (error) {
  // Error middleware catches and formats
  // Returns: { error: 'NotFoundError', message: '...', statusCode: 404 }
}
```

### 2. Programming Errors (Unexpected)
```typescript
try {
  // Some code
} catch (error) {
  // Error middleware logs full stack trace
  // Returns: { error: 'InternalServerError', message: '...', statusCode: 500 }
}
```

### 3. Error Response Format
```json
{
  "error": "NotFoundError",
  "message": "User not found",
  "statusCode": 404,
  "timestamp": "2025-10-16T10:30:00.000Z",
  "path": "/api/user/profile",
  "context": {
    "userId": "123"
  }
}
```

## Authentication Flow

### Sign Up Flow
```
1. POST /api/auth/sign-up/email
   Body: { email, password, name }

2. Better-Auth validates input
   → Check email format
   → Check password strength (min 8 chars)
   → Hash password with bcrypt

3. Create user in database
   INSERT INTO users (id, email, name, password_hash)

4. Send verification email
   → Generate verification token
   → Send email with verification link

5. Return success response
   { success: true, user: {...} }
```

### Sign In Flow
```
1. POST /api/auth/sign-in/email
   Body: { email, password }

2. Better-Auth validates credentials
   → Find user by email
   → Compare password hash
   → Check email verified

3. Create session
   INSERT INTO sessions (id, user_id, expires_at)
   → Set session cookie (7-day expiration)

4. Return user data
   { success: true, user: {...}, session: {...} }
```

### Protected Endpoint Flow
```
1. GET /api/user/profile
   Cookie: session_token=xxx

2. Auth Middleware validates session
   → Extract session token from cookie
   → Query sessions table
   → Check expiration
   → Load user data

3. Inject user context
   context.user = { id, email, name, role }

4. Route handler accesses user
   const profile = await getUserProfile(context.user.id);

5. Return profile data
   { success: true, data: {...} }
```

## Multi-Tenancy Flow

### Tenant Identification
```typescript
// Priority order:
1. X-Tenant-ID header
2. Subdomain (tenant.example.com)
3. Query parameter (?tenant_id=xxx)
4. User's default tenant
```

### Tenant Context Injection
```typescript
Tenant Middleware
  → Extract tenant identifier
  → Query tenants table
  → Verify user is member of tenant
  → Inject into context
  → context.tenant = { id, name, type }
```

### Tenant-Scoped Queries
```typescript
// All queries automatically scoped to tenant
const orders = await db
  .select()
  .from(orders)
  .where(eq(orders.tenantId, context.tenant.id));
```

## Logging Flow

### Request Logging
```typescript
Logger Middleware (Start)
  → Generate correlation_id
  → Log: "→ GET /api/user/profile"
  → Start timer

... Request processing ...

Logger Middleware (End)
  → Calculate duration
  → Log: "← GET /api/user/profile 200 45ms"
  → Include: user_id, tenant_id, correlation_id
```

### Error Logging
```typescript
Error Middleware
  → Catch error
  → Log error with full context:
    • error name and message
    • stack trace
    • request path and method
    • user and tenant context
    • correlation_id for tracing
```

### Structured Log Format
```json
{
  "@timestamp": "2025-10-16T10:30:00.000Z",
  "level": "INFO",
  "severity": 3,
  "message": "← GET /api/user/profile 200 45ms",
  "service": {
    "name": "botcriptofy2-api",
    "version": "1.0.0",
    "environment": "production"
  },
  "host": {
    "hostname": "server-1",
    "platform": "linux",
    "pid": 12345
  },
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000",
  "context": {
    "user_id": "user_123",
    "tenant_id": "tenant_456"
  }
}
```

## Performance Considerations

### Database Optimization
- Connection pooling (max 20 connections)
- Prepared statements (SQL injection prevention + performance)
- Indexes on foreign keys and frequently queried columns
- TimescaleDB compression for time-series data

### Caching Strategy
- Redis for session storage (fast lookups)
- In-memory caching for static data (roles, permissions)
- Cache invalidation on updates

### Query Optimization
- Eager loading with Drizzle joins (avoid N+1 queries)
- Pagination on all list endpoints (max 100 per page)
- Selective field loading (only fetch needed columns)

### Response Optimization
- GZIP compression for responses
- Minimal JSON response sizes
- Streaming for large responses

## Security Measures

### Input Validation
- Zod schemas on all endpoints
- SQL injection prevention (parameterized queries)
- XSS prevention (output encoding)
- CSRF protection (SameSite cookies)

### Authentication Security
- bcrypt for password hashing (10 rounds)
- Session tokens (random UUIDs)
- Secure cookies (httpOnly, secure in production)
- Session expiration (7 days with refresh)

### Authorization Security
- Role-Based Access Control (RBAC)
- Permission checks on all protected routes
- Tenant isolation enforcement
- Principle of least privilege

### Rate Limiting
- Global: 100 requests/minute
- Auth endpoints: 5 requests/minute
- Adaptive limits based on user behavior

### Audit Logging
- All sensitive operations logged
- Immutable audit trail
- User actions tracked
- Compliance with LGPD/GDPR

## Scalability Strategy

### Horizontal Scaling
- Stateless API servers (session in database)
- Load balancer distribution
- Multiple server instances

### Database Scaling
- Read replicas for query distribution
- Connection pooling
- Query optimization
- TimescaleDB compression

### Caching
- Redis cluster for distributed cache
- Cache warming strategies
- Invalidation patterns

### Monitoring
- Health checks
- Performance metrics
- Error rates
- Resource utilization

## Next Steps

See specific documentation:
- [Multi-Tenant Architecture](./multi-tenancy.md)
- [Module Structure](./modules.md)
- [Middleware Stack](./middleware.md)
