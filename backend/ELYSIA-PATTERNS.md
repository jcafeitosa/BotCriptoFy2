# 🎯 Padrões Elysia Implementados

Documentação completa dos padrões oficiais do Elysia implementados no BotCriptoFy2.

## ✅ Padrões Implementados

### 1. Plugin Pattern

**Localização**: Todos os middlewares e rotas são plugins separados

**Implementação**:
```typescript
// Middleware como plugin
export const loggerMiddleware = new Elysia({ name: 'logger' })
  .derive({ as: 'global' }, () => ({ logger }))
  .onRequest(...)
  .onAfterResponse(...);

// Rotas como plugin
export const healthRoutes = new Elysia({ prefix: '/', name: 'health-routes' })
  .get('/', handler, options);

// Composição no app principal
const app = new Elysia()
  .use(loggerMiddleware)
  .use(healthRoutes);
```

**Benefícios**:
- ✅ Modularidade e reutilização
- ✅ Separação de responsabilidades
- ✅ Fácil manutenção e testes
- ✅ Type-safe composition

**Arquivos**:
- `src/middleware/logger.middleware.ts`
- `src/middleware/error.middleware.ts`
- `src/middleware/transform.ts`
- `src/middleware/guards.ts`
- `src/routes/*.routes.ts`

---

### 2. Lifecycle Hooks

**Ordem de Execução**:
1. `onRequest` - Início do request
2. `onParse` - Parsing do body
3. `onTransform` - Transformação de dados
4. `onBeforeHandle` - Guards e autenticação
5. `onAfterHandle` - Modificação da resposta
6. `onError` - Tratamento de erros
7. `onAfterResponse` - Logging e cleanup

**Implementação por Hook**:

#### onRequest
```typescript
// Usado para: Iniciar timer, adicionar contexto inicial
.onRequest(({ request }) => {
  (request as any).startTime = Date.now();
})
```
**Arquivo**: `src/middleware/logger.middleware.ts:19-21`

#### onTransform
```typescript
// Usado para: Sanitizar e normalizar dados ANTES da validação
.onTransform(({ body, query, params }) => {
  if (body && typeof body === 'object') {
    sanitizeObject(body);
  }
})
```
**Arquivo**: `src/middleware/transform.ts:10-23`

#### onBeforeHandle (Guards)
```typescript
// Usado para: Autenticação, autorização, validações
.derive({ as: 'scoped' }, async ({ headers, set, jwt }) => {
  const token = headers.authorization?.substring(7);
  const payload = await jwt.verify(token);
  if (!payload) {
    set.status = 401;
    throw new UnauthorizedError('Invalid token');
  }
  return { user: payload };
})
```
**Arquivo**: `src/middleware/guards.ts:10-36`

#### onError
```typescript
// Usado para: Tratamento global de erros
.onError(({ code, error, set }) => {
  // Trata: VALIDATION, NOT_FOUND, PARSE, AppError, etc.
})
```
**Arquivo**: `src/middleware/error.middleware.ts:6-57`

#### onAfterResponse
```typescript
// Usado para: Logging, métricas, analytics
.onAfterResponse(({ request, path, set }) => {
  const duration = Date.now() - request.startTime;
  logger.http(`${request.method} ${path}`, {
    responseTime: duration
  });
})
```
**Arquivo**: `src/middleware/logger.middleware.ts:23-34`

---

### 3. Schema Validation

**Usando `t.*` (TypeBox)**:

```typescript
import { t } from 'elysia';

.get('/info', handler, {
  response: {
    200: t.Object({
      name: t.String({ description: 'API name' }),
      version: t.String({ description: 'API version' }),
      features: t.Array(t.String())
    })
  }
})

.get('/users', handler, {
  query: t.Object({
    page: t.Number({ minimum: 1, default: 1 }),
    limit: t.Number({ minimum: 1, maximum: 100, default: 10 })
  }),
  response: {
    200: t.Array(t.Object({
      id: t.Number(),
      name: t.String(),
      email: t.String({ format: 'email' })
    }))
  }
})
```

**Benefícios**:
- ✅ Validação automática de request/response
- ✅ Type inference automática
- ✅ Documentação Swagger automática
- ✅ Runtime validation + compile-time types

**Arquivos**:
- `src/routes/health.routes.ts:15-51`
- `src/routes/info.routes.ts:15-59`
- `src/routes/error.routes.ts:60-62`

---

### 4. Guard Pattern

**Implementação de Guards Reutilizáveis**:

```typescript
// Auth Guard - Verifica JWT e injeta user
export const authGuard = new Elysia({ name: 'auth-guard' })
  .derive({ as: 'scoped' }, async ({ headers, jwt }) => {
    // Validação de token
    return { user: payload };
  });

// Role Guard - Verifica role do usuário
export const requireRole = (roles: string[]) =>
  new Elysia({ name: `role-guard-${roles.join('-')}` })
    .derive({ as: 'scoped' }, ({ user, set }) => {
      if (!user.role || !roles.includes(user.role)) {
        throw new ForbiddenError('Insufficient permissions');
      }
    });

// Uso combinado
app
  .use(authGuard)
  .use(requireRole(['admin']))
  .get('/admin/users', ({ user }) => {
    // user está disponível e validado como admin
  });
```

**Guards Disponíveis**:
- `authGuard` - Autenticação JWT
- `optionalAuthGuard` - Auth opcional
- `requireRole(roles)` - Validação de role
- `requireTenant` - Validação de tenant
- `requireVerifiedEmail` - Email verificado

**Arquivo**: `src/middleware/guards.ts`

---

### 5. Scoping Strategy

**3 Tipos de Scope**:

| Scope | Uso | Quando Usar |
|-------|-----|-------------|
| `global` | Afeta todas as rotas (incluindo futuras) | Logger, error handler |
| `scoped` | Afeta apenas rotas do plugin atual | Guards, auth, context específico |
| `local` | Afeta apenas a rota atual | Validação única |

**Exemplos**:

```typescript
// Global - Logger disponível em TODAS as rotas
.derive({ as: 'global' }, () => ({ logger }))

// Scoped - User disponível apenas em rotas protegidas
export const authGuard = new Elysia({ name: 'auth-guard' })
  .derive({ as: 'scoped' }, async () => {
    return { user };
  });

// Local - Transformação específica de uma rota
.get('/users', handler, {
  transform({ params }) {
    params.id = Number(params.id);
  }
})
```

---

### 6. Route Groups

**Organização de Rotas Relacionadas**:

```typescript
// Rotas de API v1
export const apiV1Routes = new Elysia({ prefix: '/api/v1' })
  .use(infoRoutes)
  .use(errorRoutes)
  .group('/users', (app) =>
    app
      .get('/', listUsers)
      .get('/:id', getUser)
      .post('/', createUser)
  )
  .group('/admin', (app) =>
    app
      .use(authGuard)
      .use(requireRole(['admin']))
      .get('/stats', getAdminStats)
  );
```

**Benefícios**:
- ✅ Prefixos automáticos
- ✅ Middleware compartilhado
- ✅ Organização lógica
- ✅ Documentação agrupada no Swagger

**Arquivos**:
- `src/routes/health.routes.ts` - Usa `prefix: '/'`
- `src/routes/info.routes.ts` - Usa `prefix: '/api/v1'`
- `src/routes/error.routes.ts` - Usa `prefix: '/api/v1/error'`

---

### 7. Type Inference

**Exportação de Tipos para Cliente**:

```typescript
// Backend
export type App = typeof app;

// Frontend/Cliente
import type { App } from '@backend/index';
import { treaty } from '@elysiajs/eden';

const client = treaty<App>('http://localhost:3000');

// ✅ Type-safe calls
const { data } = await client.api.v1.info.get();
// data é tipado automaticamente como ApiInfoResponse
```

**Type Guards**:
```typescript
export function isApiError(response: any): response is ApiError {
  return response?.success === false && 'error' in response;
}

// Uso
const response = await fetch('/api/users');
const data = await response.json();

if (isApiError(data)) {
  console.error(data.error.message);
} else {
  console.log(data.users);
}
```

**Arquivo**: `src/types/api.types.ts`

---

### 8. Transform Hooks

**Sanitização Automática de Dados**:

```typescript
// Transform global para todos os endpoints
export const transformMiddleware = new Elysia({ name: 'transform' })
  .onTransform(({ body, query }) => {
    // Trim strings
    // Normalizar emails
    // Limpar arrays
  });

// Transform específico para paginação
export const paginationTransform = new Elysia()
  .onTransform(({ query }) => {
    query.page = parseInt(query.page) || 1;
    query.limit = Math.min(parseInt(query.limit) || 10, 100);
  });
```

**Quando Usar Transform**:
- ✅ Normalização de dados (lowercase, trim)
- ✅ Conversão de tipos
- ✅ Defaults para parâmetros opcionais
- ✅ Sanitização ANTES da validação

**Arquivo**: `src/middleware/transform.ts`

---

### 9. Error Handling

**Hierarquia de Tratamento**:

1. **Custom Errors** - AppError classes
2. **Elysia Errors** - VALIDATION, NOT_FOUND, PARSE
3. **Unhandled Errors** - Fallback genérico

```typescript
// Custom error classes
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public context?: any
  ) {
    super(message);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, context?: any) {
    super(400, 'BAD_REQUEST', message, context);
  }
}

// Error middleware
.onError(({ code, error, set }) => {
  // AppError - usa statusCode da classe
  if (error instanceof AppError) {
    set.status = error.statusCode;
    return formatErrorResponse(error);
  }

  // VALIDATION - 400 com detalhes
  if (code === 'VALIDATION') {
    set.status = 400;
    return { success: false, error: { ... } };
  }

  // NOT_FOUND - 404
  if (code === 'NOT_FOUND') {
    set.status = 404;
    return { success: false, error: { ... } };
  }

  // Fallback - 500
  set.status = 500;
  return { success: false, error: 'Internal Server Error' };
})
```

**Arquivos**:
- `src/utils/errors.ts` - Custom error classes
- `src/middleware/error.middleware.ts` - Error handler

---

## 📁 Estrutura de Arquivos

```
backend/src/
├── index.ts                       # App principal com composição
├── middleware/
│   ├── logger.middleware.ts       # Plugin: logging (global scope)
│   ├── error.middleware.ts        # Plugin: error handling (global)
│   ├── transform.ts               # Plugin: data sanitization
│   └── guards.ts                  # Plugins: auth guards (scoped)
├── routes/
│   ├── health.routes.ts           # Plugin: health checks
│   ├── info.routes.ts             # Plugin: API info
│   └── error.routes.ts            # Plugin: error demos
├── types/
│   └── api.types.ts               # Type exports for clients
└── utils/
    ├── errors.ts                  # Custom error classes
    └── logger.ts                  # Winston logger setup
```

---

## 🎯 Ordem de Middleware (Importante!)

```typescript
const app = new Elysia()
  // 1. Logging (primeiro - para logar tudo)
  .use(loggerMiddleware)

  // 2. Error Handling (cedo - para capturar erros)
  .use(errorMiddleware)

  // 3. Transform (antes da validação - sanitizar dados)
  .use(transformMiddleware)

  // 4. Infrastructure (Swagger, CORS, JWT)
  .use(swagger(...))
  .use(cors(...))
  .use(jwt(...))

  // 5. Routes (por último - após toda configuração)
  .use(healthRoutes)
  .use(infoRoutes);
```

**Por que essa ordem?**
1. **Logger primeiro** - Captura todos os requests (inclusive os que falham)
2. **Error handler cedo** - Captura erros de todos os middlewares seguintes
3. **Transform antes de rotas** - Sanitiza dados antes da validação de schema
4. **Infrastructure** - Configura ferramentas necessárias
5. **Routes por último** - Usa toda a infraestrutura configurada

---

## 🚀 Próximos Passos

### Padrões Adicionais Recomendados

1. **WebSocket Plugin**
```typescript
const wsPlugin = new Elysia()
  .ws('/ws', {
    open(ws) { ... },
    message(ws, message) { ... }
  });
```

2. **Rate Limiting**
```typescript
const rateLimitPlugin = new Elysia()
  .derive(async ({ request, set }) => {
    const limited = await checkRateLimit(request.ip);
    if (limited) {
      set.status = 429;
      throw new Error('Too Many Requests');
    }
  });
```

3. **Caching Layer**
```typescript
const cachePlugin = new Elysia()
  .onBeforeHandle(async ({ request }) => {
    const cached = await redis.get(request.url);
    if (cached) return JSON.parse(cached);
  })
  .onAfterResponse(async ({ request, response }) => {
    await redis.set(request.url, JSON.stringify(response));
  });
```

4. **Metrics & Tracing**
```typescript
const metricsPlugin = new Elysia()
  .trace(async ({ handle }) => {
    const start = Date.now();
    await handle();
    const duration = Date.now() - start;
    metrics.histogram('http_request_duration', duration);
  });
```

---

## 📚 Recursos

- [Elysia Documentation](https://elysiajs.com/)
- [Elysia Lifecycle](https://elysiajs.com/essential/life-cycle.html)
- [Elysia Plugins](https://elysiajs.com/patterns/plugin.html)
- [TypeBox Schema](https://github.com/sinclairzx81/typebox)
- [Eden Treaty (Type-safe Client)](https://elysiajs.com/eden/treaty/overview.html)

---

**BotCriptoFy2** | Elysia Best Practices v1.0.0
