# Middleware Stack

## Overview

Elysia middleware provides a powerful way to process requests before they reach route handlers. BotCriptoFy2 uses a carefully ordered middleware stack to handle logging, errors, authentication, and data transformation.

## Middleware Execution Order

**Order is critical!** Middleware executes in the order it's registered:

```typescript
const app = new Elysia()
  // 1. Logger Middleware (FIRST - logs all requests)
  .use(loggerMiddleware)

  // 2. Error Middleware (EARLY - catches all errors)
  .use(errorMiddleware)

  // 3. Swagger Documentation
  .use(swagger({ /* config */ }))

  // 4. CORS Configuration
  .use(cors({ /* config */ }))

  // 5. Auth Routes (WITHOUT transform to avoid conflicts)
  .use(authRoutes)
  .use(authCustomRoutes)

  // 6. Transform Middleware (AFTER auth routes)
  .use(transformMiddleware)

  // 7. Application Routes (protected by auth)
  .use(userRoutes)
  .use(healthRoutes)
  .use(infoRoutes)
```

## Core Middleware

### 1. Logger Middleware

**File**: `src/middleware/logger.middleware.ts`

**Purpose**: Logs all HTTP requests and responses with structured data.

**Features**:
- Logs request method, path, status code, duration
- Generates correlation IDs for request tracing
- Extracts user and tenant context
- Different log levels based on status code
- Color-coded console output in development

**Implementation**:
```typescript
export const loggerMiddleware = new Elysia({ name: 'logger-middleware' })
  .derive({ as: 'scoped' }, ({ request }) => {
    const correlation_id = randomUUID();
    const startTime = Date.now();

    // Log incoming request
    const { method } = request;
    const path = new URL(request.url).pathname;

    logger.debug(`→ ${method} ${path}`, {
      source: 'http',
      correlation_id,
    });

    return { correlation_id, startTime };
  })
  .onAfterResponse((context: any) => {
    const { request, set, correlation_id, startTime, user, tenant } = context;

    const duration = Date.now() - startTime;
    const { method } = request;
    const path = new URL(request.url).pathname;
    const statusCode = typeof set.status === 'number' ? set.status : 200;

    // Extract context
    const user_id = user?.id;
    const tenant_id = tenant?.id;

    // Use logRequest helper for structured logging
    logRequest(method, path, statusCode, duration, {
      correlation_id,
      ...(user_id && { user_id }),
      ...(tenant_id && { tenant_id }),
    });
  })
  .onError((context: any) => {
    const { request, error, set, correlation_id, startTime, user, tenant } = context;

    const duration = Date.now() - (startTime || 0);
    const { method } = request;
    const path = new URL(request.url).pathname;
    const statusCode = typeof set.status === 'number' ? set.status : 500;

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : 'Error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    const user_id = user?.id;
    const tenant_id = tenant?.id;

    logger.error(`✗ ${method} ${path} ${statusCode} ${duration}ms - ${errorMessage}`, {
      source: 'http',
      correlation_id,
      error_type: errorName,
      ...(user_id && { user_id }),
      ...(tenant_id && { tenant_id }),
      ...(statusCode >= 500 && errorStack && { stack: errorStack }),
    });
  });
```

**Log Output Example**:
```json
{
  "@timestamp": "2025-10-16T10:30:00.000Z",
  "level": "HTTP",
  "message": "← GET /api/user/profile 200 45ms",
  "correlation_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user_123",
  "tenant_id": "tenant_456"
}
```

---

### 2. Error Middleware

**File**: `src/middleware/error.middleware.ts`

**Purpose**: Global error handler that catches and formats all errors.

**Features**:
- Catches all unhandled errors
- Formats errors consistently
- Maps errors to HTTP status codes
- Includes stack traces in development
- Logs errors with full context

**Implementation**:
```typescript
export const errorMiddleware = new Elysia({ name: 'error-middleware' })
  .onError((context: any) => {
    const { error, set, request } = context;

    const path = new URL(request.url).pathname;
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Handle known AppError instances
    if (error instanceof AppError) {
      set.status = error.statusCode;

      const errorResponse: ErrorResponse = {
        error: error.name,
        message: error.message,
        statusCode: error.statusCode,
        timestamp: new Date().toISOString(),
        path,
        ...(error.context && { context: error.context }),
        ...(isDevelopment && error.stack && { stack: error.stack }),
      };

      return errorResponse;
    }

    // Handle validation errors (Zod)
    if (error.name === 'ValidationError') {
      set.status = 422;
      return {
        error: 'ValidationError',
        message: 'Validation failed',
        statusCode: 422,
        timestamp: new Date().toISOString(),
        path,
        ...(error.errors && { errors: error.errors }),
      };
    }

    // Handle unknown errors
    set.status = 500;

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error(`Unhandled error at ${path}`, {
      error: errorMessage,
      stack: errorStack,
      path,
    });

    return {
      error: 'InternalServerError',
      message: isDevelopment ? errorMessage : 'An unexpected error occurred',
      statusCode: 500,
      timestamp: new Date().toISOString(),
      path,
      ...(isDevelopment && errorStack && { stack: errorStack }),
    };
  });
```

**Error Response Format**:
```json
{
  "error": "NotFoundError",
  "message": "User not found",
  "statusCode": 404,
  "timestamp": "2025-10-16T10:30:00.000Z",
  "path": "/api/user/profile",
  "context": {
    "userId": "user_123"
  }
}
```

---

### 3. Transform Middleware

**File**: `src/middleware/transform.ts`

**Purpose**: Transforms and sanitizes request data (pagination, input cleaning).

**Features**:
- Pagination parameter transformation (page, limit)
- Input sanitization
- Query parameter normalization

**Components**:

#### Pagination Transform
```typescript
export const paginationTransform = new Elysia({ name: 'pagination-transform' })
  .onTransform(({ query }) => {
    if (query && typeof query === 'object') {
      // Parse page parameter
      if ('page' in query) {
        const page = parseInt(query.page as string, 10);
        (query as any).page = isNaN(page) || page < 1 ? 1 : page;
      }

      // Parse limit parameter
      if ('limit' in query) {
        const limit = parseInt(query.limit as string, 10);
        (query as any).limit = isNaN(limit) || limit < 1 ? 10 : Math.min(limit, 100);
      }

      // Calculate offset
      if ('page' in query && 'limit' in query) {
        const page = (query as any).page;
        const limit = (query as any).limit;
        (query as any).offset = (page - 1) * limit;
      }
    }
  });
```

**Usage Example**:
```bash
# Request: GET /api/users?page=2&limit=50
# Transformed to: { page: 2, limit: 50, offset: 50 }

# Request: GET /api/users?page=abc&limit=200
# Transformed to: { page: 1, limit: 100, offset: 0 }
```

#### Sanitization Transform
```typescript
export const sanitizationTransform = new Elysia({ name: 'sanitization-transform' })
  .onTransform(({ body }) => {
    if (body && typeof body === 'object') {
      // Trim string values
      Object.keys(body).forEach((key) => {
        if (typeof body[key] === 'string') {
          body[key] = body[key].trim();
        }
      });

      // Remove null/undefined values
      Object.keys(body).forEach((key) => {
        if (body[key] === null || body[key] === undefined) {
          delete body[key];
        }
      });
    }
  });
```

#### Combined Transform Middleware
```typescript
export const transformMiddleware = new Elysia({ name: 'transform-middleware' })
  .use(paginationTransform)
  .use(sanitizationTransform);
```

---

### 4. Authentication Middleware

**File**: `src/modules/auth/middleware/session.middleware.ts`

**Purpose**: Validates user sessions and injects user context.

**Guards**:

#### requireAuth
Ensures user is authenticated:
```typescript
export const requireAuth = new Elysia({ name: 'require-auth' })
  .derive({ as: 'scoped' }, async (context: any) => {
    const { request, set } = context;

    try {
      const session = await auth.api.getSession({ headers: request.headers });

      if (!session || !session.user) {
        set.status = 401;
        throw new UnauthorizedError('Invalid or expired session');
      }

      return { user: session.user, session: session.session };
    } catch (error) {
      set.status = 401;
      throw new UnauthorizedError('Invalid or expired session');
    }
  });
```

#### optionalAuth
Injects user context if authenticated (doesn't fail if not):
```typescript
export const optionalAuth = new Elysia({ name: 'optional-auth' })
  .derive({ as: 'scoped' }, async (context: any) => {
    const { request } = context;

    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (session && session.user) {
        return { user: session.user, session: session.session };
      }
    } catch (error) {
      // Ignore errors - auth is optional
    }

    return { user: null, session: null };
  });
```

#### requireVerifiedEmail
Ensures user's email is verified:
```typescript
export const requireVerifiedEmail = new Elysia({ name: 'require-verified-email' })
  .use(requireAuth)
  .derive({ as: 'scoped' }, (context: any) => {
    const { user, set } = context;

    if (!user.emailVerified) {
      set.status = 403;
      throw new ForbiddenError('Email verification required');
    }

    return {};
  });
```

---

### 5. RBAC Middleware

**File**: `src/modules/auth/middleware/guards.ts`

**Purpose**: Role-based access control guards.

**Guards**:

#### requireRole
```typescript
export const requireRole = (allowedRoles: string | string[]) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return new Elysia({ name: `role-guard-${roles.join('-')}` })
    .use(requireAuth)
    .derive({ as: 'scoped' }, (context: any) => {
      const { user, set } = context;

      const userRole = (user as any).role;

      if (!userRole || !roles.includes(userRole)) {
        set.status = 403;
        throw new ForbiddenError(`Required role: ${roles.join(' or ')}`);
      }

      return {};
    });
};
```

**Usage**:
```typescript
app.get('/api/admin/users',
  async () => { /* ... */ },
  { beforeHandle: [requireRole('admin')] }
);
```

#### requireAnyRole
```typescript
export const requireAnyRole = (roles: string[]) => {
  return new Elysia({ name: 'require-any-role' })
    .use(requireAuth)
    .derive({ as: 'scoped' }, (context: any) => {
      const { user, set } = context;

      const userRole = (user as any).role;

      if (!roles.includes(userRole)) {
        set.status = 403;
        throw new ForbiddenError(`Required one of: ${roles.join(', ')}`);
      }

      return {};
    });
};
```

---

### 6. Tenant Middleware

**Purpose**: Validates tenant context and membership.

**Guards**:

#### requireTenant
Ensures tenant context exists:
```typescript
export const requireTenant = new Elysia({ name: 'require-tenant' })
  .use(tenantContext)
  .derive({ as: 'scoped' }, (context: any) => {
    const { tenant, set } = context;

    if (!tenant) {
      set.status = 400;
      throw new BadRequestError('Tenant context required');
    }

    return {};
  });
```

#### requireTenantMember
Ensures user is member of tenant:
```typescript
export const requireTenantMember = new Elysia({ name: 'require-tenant-member' })
  .use(requireAuth)
  .use(tenantContext)
  .derive({ as: 'scoped' }, async (context: any) => {
    const { user, tenant, set } = context;

    const isMember = await checkTenantMembership(tenant.id, user.id);

    if (!isMember) {
      set.status = 403;
      throw new ForbiddenError('Not a member of this tenant');
    }

    return {};
  });
```

---

## Creating Custom Middleware

### Basic Middleware Example
```typescript
export const myMiddleware = new Elysia({ name: 'my-middleware' })
  .derive({ as: 'scoped' }, (context) => {
    // Add custom context
    return { customValue: 'hello' };
  })
  .onBeforeHandle((context) => {
    // Run before route handler
    console.log('Before handling request');
  })
  .onAfterHandle((context) => {
    // Run after route handler
    console.log('After handling request');
  });
```

### Middleware with Options
```typescript
export const rateLimiter = (options: { max: number; window: number }) => {
  return new Elysia({ name: 'rate-limiter' })
    .derive({ as: 'scoped' }, async (context) => {
      const { request, set } = context;
      const ip = request.headers.get('x-forwarded-for') || 'unknown';

      const count = await redis.incr(`rate:${ip}`);
      if (count === 1) {
        await redis.expire(`rate:${ip}`, options.window);
      }

      if (count > options.max) {
        set.status = 429;
        throw new RateLimitError('Too many requests');
      }

      return {};
    });
};

// Usage
app.use(rateLimiter({ max: 100, window: 60 }));
```

## Middleware Best Practices

### 1. Clear Naming
Use descriptive names for middleware:
```typescript
// ✅ Good
export const requireAuth = new Elysia({ name: 'require-auth' });

// ❌ Bad
export const middleware1 = new Elysia();
```

### 2. Scoped Derivation
Use `as: 'scoped'` for request-specific context:
```typescript
// ✅ Good - scoped to request
.derive({ as: 'scoped' }, (context) => ({
  requestId: randomUUID()
}))

// ❌ Bad - shared across requests
.derive((context) => ({
  requestId: randomUUID()
}))
```

### 3. Error Handling
Always handle errors properly:
```typescript
.derive({ as: 'scoped' }, async (context) => {
  try {
    const data = await fetchData();
    return { data };
  } catch (error) {
    throw new InternalServerError('Failed to fetch data');
  }
})
```

### 4. Performance
Avoid heavy operations in middleware:
```typescript
// ❌ Bad - expensive operation
.derive({ as: 'scoped' }, async (context) => {
  const allUsers = await fetchAllUsers(); // Expensive!
  return { allUsers };
})

// ✅ Good - lightweight operation
.derive({ as: 'scoped' }, (context) => {
  const requestId = randomUUID(); // Fast!
  return { requestId };
})
```

### 5. Middleware Order
Be mindful of execution order:
```typescript
const app = new Elysia()
  .use(logger)        // First - logs everything
  .use(errorHandler)  // Second - catches all errors
  .use(auth)          // Third - authentication
  .use(routes)        // Last - application routes
```

## Next Steps
- [Authentication Guards](../authentication/guards.md)
- [Error Handling](../api/errors.md)
- [Logging System](../logging/winston.md)
