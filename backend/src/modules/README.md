# 📦 Módulos BotCriptoFy2

Estrutura modular do backend organizada por domínio de negócio.

## 🏗️ Estrutura de Cada Módulo

```
module-name/
├── schema/           # Drizzle ORM schemas (database tables)
├── types/            # TypeScript interfaces and types
├── services/         # Business logic layer
├── routes/           # Elysia route plugins
├── controllers/      # Request handlers
├── utils/            # Module-specific utilities
└── index.ts          # Barrel exports
```

## 📋 Módulos Disponíveis

### Administrative Modules (9 módulos)

| Módulo | Descrição | Status |
|--------|-----------|--------|
| `auth` | Autenticação e sessões (Better-Auth) | ⚠️ Em desenvolvimento |
| `tenants` | Multi-tenancy (Company, Trader, Influencer) | ⚠️ Em desenvolvimento |
| `departments` | Gestão de departamentos | ⚠️ Em desenvolvimento |
| `sales` | Leads, prospects, vendas | ⚠️ Em desenvolvimento |
| `security` | Monitoramento e segurança | ⚠️ Em desenvolvimento |
| `support` | SAC e atendimento | ⚠️ Em desenvolvimento |
| `audit` | Auditoria e compliance (LGPD) | ⚠️ Em desenvolvimento |
| `documents` | Gestão documental | ⚠️ Em desenvolvimento |
| `configurations` | Configurações do sistema | ⚠️ Em desenvolvimento |

### Executive & Operations (5 módulos)

| Módulo | Descrição | Status |
|--------|-----------|--------|
| `ceo` | Dashboard executivo | ⚠️ Em desenvolvimento |
| `financial` | Billing e pagamentos | ⚠️ Em desenvolvimento |
| `marketing` | Campanhas e analytics | ⚠️ Em desenvolvimento |
| `subscriptions` | Planos e assinaturas | ⚠️ Em desenvolvimento |
| `notifications` | Sistema de notificações | ⚠️ Em desenvolvimento |

## 🎯 Padrão de Desenvolvimento

### 1. Schema (Drizzle ORM)

```typescript
// schema/users.schema.ts
import { pgTable, serial, varchar, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### 2. Types (TypeScript)

```typescript
// types/user.types.ts
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { users } from '../schema/users.schema';

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export interface UserWithRole extends User {
  role: string;
  permissions: string[];
}
```

### 3. Services (Business Logic)

```typescript
// services/user.service.ts
import { db } from '@/db';
import { users } from '../schema/users.schema';
import type { NewUser, User } from '../types/user.types';

export class UserService {
  static async create(data: NewUser): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  static async findById(id: number): Promise<User | undefined> {
    return db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, id),
    });
  }

  static async list(limit = 10, offset = 0): Promise<User[]> {
    return db.query.users.findMany({
      limit,
      offset,
    });
  }
}
```

### 4. Routes (Elysia Plugins)

```typescript
// routes/user.routes.ts
import { Elysia, t } from 'elysia';
import { UserService } from '../services/user.service';
import { authGuard, requireRole } from '@/middleware/guards';

export const userRoutes = new Elysia({ prefix: '/api/v1/users', name: 'user-routes' })
  .use(authGuard)
  .get(
    '/',
    async ({ query }) => {
      const users = await UserService.list(query.limit, query.offset);
      return { success: true, data: users };
    },
    {
      query: t.Object({
        limit: t.Number({ minimum: 1, maximum: 100, default: 10 }),
        offset: t.Number({ minimum: 0, default: 0 }),
      }),
      response: {
        200: t.Object({
          success: t.Boolean(),
          data: t.Array(t.Object({
            id: t.Number(),
            email: t.String(),
            name: t.String(),
          })),
        }),
      },
      detail: {
        tags: ['Users'],
        summary: 'List all users',
      },
    }
  )
  .get(
    '/:id',
    async ({ params, set }) => {
      const user = await UserService.findById(Number(params.id));
      if (!user) {
        set.status = 404;
        return { success: false, error: 'User not found' };
      }
      return { success: true, data: user };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ['Users'],
        summary: 'Get user by ID',
      },
    }
  )
  .post(
    '/',
    async ({ body }) => {
      const user = await UserService.create(body);
      return { success: true, data: user };
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        name: t.String({ minLength: 2 }),
      }),
      detail: {
        tags: ['Users'],
        summary: 'Create new user',
      },
    }
  )
  .use(requireRole(['admin']))
  .delete(
    '/:id',
    async ({ params, set }) => {
      // Admin only
      await UserService.delete(Number(params.id));
      return { success: true };
    },
    {
      detail: {
        tags: ['Users'],
        summary: 'Delete user (admin only)',
      },
    }
  );
```

### 5. Controllers (Optional - para lógica complexa)

```typescript
// controllers/user.controller.ts
export class UserController {
  static async handleRegistration(data: RegisterDTO) {
    // Complex business logic
    // Multiple service calls
    // Transaction handling
  }
}
```

### 6. Utils (Module-specific utilities)

```typescript
// utils/user.utils.ts
export function formatUserName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

### 7. Index (Barrel Exports)

```typescript
// index.ts
export * from './schema/users.schema';
export * from './types/user.types';
export * from './services/user.service';
export * from './routes/user.routes';
export * from './utils/user.utils';
```

## 🔗 Integração no App Principal

```typescript
// src/index.ts
import { Elysia } from 'elysia';
import { userRoutes } from './modules/auth/routes/user.routes';
import { tenantRoutes } from './modules/tenants/routes/tenant.routes';

const app = new Elysia()
  .use(userRoutes)
  .use(tenantRoutes);
```

## 📝 Convenções de Nomenclatura

### Arquivos

- **Schema**: `*.schema.ts` - Define tabelas do banco
- **Types**: `*.types.ts` - Interfaces TypeScript
- **Services**: `*.service.ts` - Lógica de negócio
- **Routes**: `*.routes.ts` - Plugins Elysia
- **Controllers**: `*.controller.ts` - Handlers complexos
- **Utils**: `*.utils.ts` - Funções auxiliares

### Classes e Funções

- **Services**: `UserService`, `TenantService` (PascalCase)
- **Routes**: `userRoutes`, `tenantRoutes` (camelCase)
- **Types**: `User`, `Tenant` (PascalCase)
- **Interfaces**: `IUserService`, `ITenantRepository` (I + PascalCase)

## 🎨 Best Practices

### ✅ DO

```typescript
// Organize by feature/domain
modules/
  auth/
    schema/
    services/
    routes/

// Use TypeScript strict mode
export interface User {
  id: number;
  email: string;
}

// Dependency injection
export class UserService {
  constructor(private db: Database) {}
}

// Validate at route level
.post('/', handler, {
  body: t.Object({ email: t.String() })
})

// Use transactions for multiple operations
await db.transaction(async (tx) => {
  await tx.insert(users).values(userData);
  await tx.insert(profiles).values(profileData);
});
```

### ❌ DON'T

```typescript
// Don't mix concerns
// ❌ routes/userDatabase.ts
// ✅ schema/users.schema.ts

// Don't use any
// ❌ function process(data: any)
// ✅ function process(data: User)

// Don't skip validation
// ❌ .post('/', async ({ body }) => { ... })
// ✅ .post('/', handler, { body: t.Object({...}) })

// Don't put business logic in routes
// ❌ .post('/', async ({ body }) => { await db.insert(...) })
// ✅ .post('/', async ({ body }) => { await UserService.create(...) })
```

## 🔍 Módulo Template

Use este template para criar novos módulos:

```bash
# Criar novo módulo
mkdir -p src/modules/new-module/{schema,types,services,routes,controllers,utils}
touch src/modules/new-module/index.ts
touch src/modules/new-module/README.md
```

## 📚 Recursos

- [Drizzle ORM Docs](https://orm.drizzle.team)
- [Elysia Plugins](https://elysiajs.com/patterns/plugin.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Project Architecture Guide](../../../docs/architecture/README.md)

---

**BotCriptoFy2** | Modular Architecture v1.0.0
