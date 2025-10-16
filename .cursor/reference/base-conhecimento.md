# Base de Conhecimento - Documentações Oficiais

## Visão Geral

Este documento centraliza **todas as documentações oficiais** das bibliotecas e frameworks utilizados nos projetos. Todos os agentes devem:

1. **Consultar** esta base antes de iniciar qualquer tarefa
2. **Atualizar** com novos links descobertos
3. **Salvar na memória persistente** usando `update_memory`

---

## Como Usar a Base de Conhecimento

### 1. Consultar Antes de Implementar

```typescript
// Sempre ler a documentação oficial antes de implementar
await read_file({
  target_file: "docs/cursor-agent/reference/base-conhecimento.md"
});
```

### 2. Salvar na Memória Persistente

```typescript
// Salvar cada documentação na memória do agente
await update_memory({
  action: "create",
  title: "Documentação React v18",
  knowledge_to_store: "React v18: https://react.dev/. Principais recursos: Concurrent rendering, Automatic batching, Transitions API, Suspense improvements, Server Components."
});
```

### 3. Atualizar ao Descobrir Novas Bibliotecas

```typescript
// Adicionar nova biblioteca descoberta
await search_replace({
  file_path: "docs/cursor-agent/reference/base-conhecimento.md",
  old_string: "## Frontend Frameworks",
  new_string: `## Frontend Frameworks

### Nova Biblioteca Descoberta
- **Site**: https://...
- **Versão**: X.X.X
- **Documentação**: https://...
- **Exemplos**: https://...`
});

// E salvar na memória
await update_memory({
  action: "create",
  title: "Documentação Nova Biblioteca",
  knowledge_to_store: "..."
});
```

---

## Frontend Frameworks

### Astro
- **Site**: https://astro.build/
- **Versão Recomendada**: 5.11+ (latest stable)
- **Documentação**: https://docs.astro.build/
- **Getting Started**: https://docs.astro.build/en/getting-started/
- **Authentication Guide**: https://docs.astro.build/en/guides/authentication/
- **Testing Guide**: https://docs.astro.build/en/guides/testing/
- **GitHub**: https://github.com/withastro/astro

**Principais Recursos**:
- Island Architecture (carrega JS apenas onde necessário)
- Zero JS by default (performance máxima)
- Suporte a React, Vue, Svelte, Solid no mesmo projeto
- SSR (Server-Side Rendering) e SSG (Static Site Generation)
- View Transitions nativas
- TypeScript first-class support
- Integração com Elysia via adapter

**Integração com Elysia**:
```typescript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server', // SSR mode
  adapter: node({ mode: 'standalone' })
});

// Rotas API com Elysia em src/pages/api/[...].ts
```

**Autenticação no Astro**:
Astro suporta múltiplos métodos de auth:
- Better Auth (nossa escolha)
- NextAuth/Auth.js
- Lucia Auth
- OAuth providers (Google, Apple, GitHub)

**Testing no Astro**:
- Vitest para unit tests
- Playwright para E2E
- Testing Library para componentes

**Salvar na Memória**:
```typescript
await update_memory({
  action: "create",
  title: "Documentação Astro v5.11",
  knowledge_to_store: `Astro v5.11: https://docs.astro.build/

RECURSOS:
- Island Architecture (JS apenas onde necessário)
- Zero JS by default, performance máxima
- Multi-framework (React, Vue, Svelte, Solid)
- SSR + SSG, View Transitions nativas
- TypeScript first-class
- Integração com Elysia, Better Auth

LINKS IMPORTANTES:
- Auth Guide: https://docs.astro.build/en/guides/authentication/
- Testing: https://docs.astro.build/en/guides/testing/
- Integração Elysia: https://elysiajs.com/integrations/astro.html`
});
```

---

### React
- **Site**: https://react.dev/
- **Versão Recomendada**: 18.x
- **Documentação**: https://react.dev/learn
- **API Reference**: https://react.dev/reference/react
- **Blog**: https://react.dev/blog
- **GitHub**: https://github.com/facebook/react

**Principais Recursos v18**:
- Concurrent rendering
- Automatic batching
- Transitions API
- Suspense improvements
- Server Components (experimental)

**Salvar na Memória**:
```typescript
await update_memory({
  action: "create",
  title: "Documentação React v18",
  knowledge_to_store: "React v18: https://react.dev/. Concurrent rendering, Automatic batching, Transitions API, Suspense improvements, Server Components."
});
```

---

### Next.js
- **Site**: https://nextjs.org/
- **Versão Recomendada**: 14.x
- **Documentação**: https://nextjs.org/docs
- **App Router**: https://nextjs.org/docs/app
- **API Routes**: https://nextjs.org/docs/api-routes/introduction
- **GitHub**: https://github.com/vercel/next.js

**Principais Recursos**:
- App Router (React Server Components)
- Server Actions
- Parallel Routes
- Intercepting Routes
- Middleware

**Salvar na Memória**:
```typescript
await update_memory({
  action: "create",
  title: "Documentação Next.js v14",
  knowledge_to_store: "Next.js v14: https://nextjs.org/docs. App Router, Server Actions, Parallel Routes, Intercepting Routes, Middleware."
});
```

---

### Vue.js
- **Site**: https://vuejs.org/
- **Versão Recomendada**: 3.x
- **Documentação**: https://vuejs.org/guide/introduction.html
- **API**: https://vuejs.org/api/
- **GitHub**: https://github.com/vuejs/core

---

### Angular
- **Site**: https://angular.dev/
- **Versão Recomendada**: 17.x
- **Documentação**: https://angular.dev/overview
- **API**: https://angular.dev/api
- **GitHub**: https://github.com/angular/angular

---

## TypeScript

### TypeScript
- **Site**: https://www.typescriptlang.org/
- **Versão Recomendada**: 5.x
- **Documentação**: https://www.typescriptlang.org/docs/
- **Handbook**: https://www.typescriptlang.org/docs/handbook/intro.html
- **Playground**: https://www.typescriptlang.org/play
- **GitHub**: https://github.com/microsoft/TypeScript

**Salvar na Memória**:
```typescript
await update_memory({
  action: "create",
  title: "Documentação TypeScript v5",
  knowledge_to_store: "TypeScript v5: https://www.typescriptlang.org/docs/. Decorators, const type parameters, satisfies operator, improved inference."
});
```

---

## UI Libraries

### Shadcn UI
- **Site**: https://ui.shadcn.com/
- **Documentação**: https://ui.shadcn.com/docs
- **Componentes**: https://ui.shadcn.com/docs/components
- **Blocks**: https://ui.shadcn.com/blocks
- **GitHub**: https://github.com/shadcn-ui/ui

**Integração MCP**: Instalação automatizada disponível via `mcp_shadcn-ui-server_*`

**Salvar na Memória**:
```typescript
await update_memory({
  action: "create",
  title: "Documentação Shadcn UI",
  knowledge_to_store: "Shadcn UI: https://ui.shadcn.com/docs. Componentes com Radix UI + Tailwind CSS. Acessibilidade e customização total."
});
```

---

### Chakra UI
- **Site**: https://www.chakra-ui.com/
- **Versão**: 3.x
- **Documentação**: https://www.chakra-ui.com/docs/get-started
- **Componentes**: https://www.chakra-ui.com/docs/components
- **GitHub**: https://github.com/chakra-ui/chakra-ui

**Migração v2 → v3**: Disponível via `mcp_chakra-ui_v2_to_v3_code_review`

---

### Material UI (MUI)
- **Site**: https://mui.com/
- **Documentação**: https://mui.com/material-ui/getting-started/
- **Componentes**: https://mui.com/material-ui/all-components/
- **GitHub**: https://github.com/mui/material-ui

---

### Ant Design
- **Site**: https://ant.design/
- **Documentação**: https://ant.design/docs/react/introduce
- **Componentes**: https://ant.design/components/overview/
- **GitHub**: https://github.com/ant-design/ant-design

---

### Aceternity UI
- **Site**: https://ui.aceternity.com/
- **Documentação**: https://ui.aceternity.com/components
- **GitHub**: https://github.com/aceternity/ui

**Integração MCP**: Busca e instalação via `mcp_aceternityui_*`

---

### Magic UI
- **Site**: https://magicui.design/
- **Documentação**: https://magicui.design/docs
- **Componentes**: https://magicui.design/docs/components

**Integração MCP**: Acesso via `mcp_MagicUI_Design_*`

---

## State Management

### Redux Toolkit
- **Site**: https://redux-toolkit.js.org/
- **Documentação**: https://redux-toolkit.js.org/introduction/getting-started
- **API**: https://redux-toolkit.js.org/api/configureStore
- **GitHub**: https://github.com/reduxjs/redux-toolkit

---

### Zustand
- **Site**: https://zustand-demo.pmnd.rs/
- **Documentação**: https://docs.pmnd.rs/zustand/getting-started/introduction
- **GitHub**: https://github.com/pmndrs/zustand

**Salvar na Memória**:
```typescript
await update_memory({
  action: "create",
  title: "Documentação Zustand",
  knowledge_to_store: "Zustand: https://docs.pmnd.rs/zustand. State management simples e performático. Menos boilerplate que Redux."
});
```

---

### Jotai
- **Site**: https://jotai.org/
- **Documentação**: https://jotai.org/docs/introduction
- **GitHub**: https://github.com/pmndrs/jotai

---

### Recoil
- **Site**: https://recoiljs.org/
- **Documentação**: https://recoiljs.org/docs/introduction/installation
- **GitHub**: https://github.com/facebookexperimental/Recoil

---

## Validation

### Zod
- **Site**: https://zod.dev/
- **Documentação**: https://zod.dev/
- **GitHub**: https://github.com/colinhacks/zod

**Obrigatório** para validação de schema (Regra 19 do Protocolo CTO)

**Salvar na Memória**:
```typescript
await update_memory({
  action: "create",
  title: "Documentação Zod",
  knowledge_to_store: "Zod: https://zod.dev/. TypeScript-first schema validation. Inferência automática de tipos. Usado para validação obrigatória (Regra 19)."
});
```

---

### Yup
- **Site**: https://github.com/jquense/yup
- **Documentação**: https://github.com/jquense/yup#usage
- **GitHub**: https://github.com/jquense/yup

---

## Testing

### Jest
- **Site**: https://jestjs.io/
- **Documentação**: https://jestjs.io/docs/getting-started
- **API**: https://jestjs.io/docs/api
- **GitHub**: https://github.com/jestjs/jest

---

### Vitest
- **Site**: https://vitest.dev/
- **Documentação**: https://vitest.dev/guide/
- **API**: https://vitest.dev/api/
- **GitHub**: https://github.com/vitest-dev/vitest

---

### React Testing Library
- **Site**: https://testing-library.com/react
- **Documentação**: https://testing-library.com/docs/react-testing-library/intro/
- **API**: https://testing-library.com/docs/react-testing-library/api
- **GitHub**: https://github.com/testing-library/react-testing-library

**Salvar na Memória**:
```typescript
await update_memory({
  action: "create",
  title: "Documentação React Testing Library",
  knowledge_to_store: "React Testing Library: https://testing-library.com/react. Testes focados no comportamento do usuário, não em implementação."
});
```

---

### Playwright
- **Site**: https://playwright.dev/
- **Documentação**: https://playwright.dev/docs/intro
- **API**: https://playwright.dev/docs/api/class-playwright
- **GitHub**: https://github.com/microsoft/playwright

---

### Cypress
- **Site**: https://www.cypress.io/
- **Documentação**: https://docs.cypress.io/
- **API**: https://docs.cypress.io/api/table-of-contents
- **GitHub**: https://github.com/cypress-io/cypress

---

## Backend Frameworks

### Bun
- **Site**: https://bun.sh/
- **Versão Recomendada**: 1.3+ (latest stable)
- **Documentação**: https://bun.sh/docs
- **GitHub**: https://github.com/oven-sh/bun

**Principais Recursos**:
- All-in-one runtime (runtime + bundler + test runner + package manager)
- 3-4x faster than Node.js
- TypeScript nativo (sem ts-node)
- npm compatibility
- Web APIs nativas (fetch, WebSocket)
- Hot reload ultra-rápido

**Salvar na Memória**:
```typescript
await update_memory({
  action: "create",
  title: "Documentação Bun v1.3",
  knowledge_to_store: "Bun v1.3: https://bun.sh/docs. Runtime 3-4x faster, TypeScript nativo, all-in-one toolkit."
});
```

---

### Elysia
- **Site**: https://elysiajs.com/
- **Versão Recomendada**: 1.4+ (latest)
- **Documentação**: https://elysiajs.com/introduction.html
- **Essential**: https://elysiajs.com/essential/
- **Patterns**: https://elysiajs.com/patterns/
- **Plugins**: https://elysiajs.com/plugins/overview.html
- **Eden**: https://elysiajs.com/eden/overview.html
- **Better Auth Integration**: https://www.better-auth.com/docs/integrations/elysia
- **Astro Integration**: https://elysiajs.com/integrations/astro.html
- **Drizzle Integration**: https://elysiajs.com/integrations/drizzle.html
- **GitHub**: https://github.com/elysiajs/elysia

**Principais Recursos**:
- 15x faster than Express
- Bun-first framework
- TypeScript end-to-end type safety
- OpenAPI/Swagger automático
- Validation com Type Boxes ou Zod
- Plugin ecosystem rico
- Eden para type-safe client
- WebSocket support

**Eden - Type-Safe Client**:
Eden é o cliente RPC end-to-end type-safe do Elysia. Duas opções:
- **Eden Treaty** (recomendado): Representação orientada a objetos com autocomplete completo
- **Eden Fetch**: Sintaxe similar ao fetch nativo

```typescript
// Backend (Elysia)
import { Elysia } from 'elysia';

export const app = new Elysia()
  .get('/user/:id', ({ params }) => ({
    id: params.id,
    name: 'John Doe'
  }))
  .listen(3000);

export type App = typeof app;

// Frontend (Eden Treaty)
import { treaty } from '@elysiajs/eden';
import type { App } from './server';

const client = treaty<App>('localhost:3000');

// Type-safe calls com autocomplete
const { data, error } = await client.user({ id: '1' }).get();
// data é tipado automaticamente: { id: string; name: string }
```

**Plugins Oficiais**:
- **@elysiajs/bearer**: Bearer token automático
- **@elysiajs/cors**: CORS setup
- **@elysiajs/cron**: Cron jobs
- **@elysiajs/jwt**: JWT auth
- **@elysiajs/openapi**: OpenAPI/Swagger docs
- **@elysiajs/html**: HTML responses
- **@elysiajs/static**: Static files
- **@elysiajs/opentelemetry**: Observability
- **@elysiajs/server-timing**: Performance audit

**Integração com Astro**:
```typescript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import elysia from '@elysiajs/astro';

export default defineConfig({
  integrations: [elysia()]
});

// src/pages/api/[...].ts
import { Elysia } from 'elysia';

export const app = new Elysia()
  .get('/api/hello', () => 'Hello from Elysia!')
  .listen(3000);
```

**Salvar na Memória**:
```typescript
await update_memory({
  action: "create",
  title: "Documentação Elysia v1.4 Completa",
  knowledge_to_store: `Elysia v1.4: https://elysiajs.com/
  
RECURSOS:
- 15x faster than Express, Bun-first
- Eden Treaty para type-safe client (end-to-end)
- Plugins oficiais: JWT, CORS, Bearer, OpenAPI, HTML, Static
- Integração nativa com Astro, Better Auth, Drizzle
- WebSocket, Cron, OpenTelemetry

LINKS IMPORTANTES:
- Essential: https://elysiajs.com/essential/
- Patterns: https://elysiajs.com/patterns/
- Plugins: https://elysiajs.com/plugins/overview.html
- Eden: https://elysiajs.com/eden/overview.html
- Astro Integration: https://elysiajs.com/integrations/astro.html
- Drizzle Integration: https://elysiajs.com/integrations/drizzle.html`
});
```

---

### Node.js
- **Site**: https://nodejs.org/
- **Documentação**: https://nodejs.org/docs/latest/api/
- **Guides**: https://nodejs.org/en/learn/getting-started/introduction-to-nodejs
- **GitHub**: https://github.com/nodejs/node

**Nota**: Usando Bun ao invés de Node.js no projeto atual

---

### Express
- **Site**: https://expressjs.com/
- **Documentação**: https://expressjs.com/en/4x/api.html
- **Guides**: https://expressjs.com/en/guide/routing.html
- **GitHub**: https://github.com/expressjs/express

---

### Fastify
- **Site**: https://fastify.dev/
- **Documentação**: https://fastify.dev/docs/latest/
- **GitHub**: https://github.com/fastify/fastify

---

### NestJS
- **Site**: https://nestjs.com/
- **Documentação**: https://docs.nestjs.com/
- **GitHub**: https://github.com/nestjs/nest

---

### Hono
- **Site**: https://hono.dev/
- **Documentação**: https://hono.dev/docs/
- **GitHub**: https://github.com/honojs/hono

---

## Databases

### Prisma
- **Site**: https://www.prisma.io/
- **Documentação**: https://www.prisma.io/docs
- **GitHub**: https://github.com/prisma/prisma

**Salvar na Memória**:
```typescript
await update_memory({
  action: "create",
  title: "Documentação Prisma",
  knowledge_to_store: "Prisma: https://www.prisma.io/docs. ORM TypeScript-first. Schema declarativo, migrations, type-safe queries."
});
```

---

### Drizzle ORM
- **Site**: https://orm.drizzle.team/
- **Versão Recomendada**: 0.33+ (latest)
- **Documentação**: https://orm.drizzle.team/docs/overview
- **PostgreSQL**: https://orm.drizzle.team/docs/get-started-postgresql
- **Migrations**: https://orm.drizzle.team/docs/migrations
- **Better Auth Adapter**: https://www.better-auth.com/docs/adapters/drizzle
- **Elysia Integration**: https://elysiajs.com/integrations/drizzle.html
- **GitHub**: https://github.com/drizzle-team/drizzle-orm

**Principais Recursos**:
- TypeScript-first ORM
- Zero-overhead SQL-like syntax
- Type-safe queries
- Migrations automáticas
- Relation handling
- Suporte a PostgreSQL, MySQL, SQLite
- Raw SQL support
- Performance próxima ao SQL puro

**Exemplo com PostgreSQL**:
```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Define schema
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow()
});

// Connect
const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

// Type-safe queries
const allUsers = await db.select().from(users);
const user = await db.select().from(users).where(eq(users.id, 1));

// Insert
await db.insert(users).values({
  name: 'John Doe',
  email: 'john@example.com'
});
```

**Multi-Tenancy com Drizzle**:
```typescript
// Row-Level Security com tenant_id
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  name: text('name').notNull(),
  // ...
});

// Queries automáticas com tenant filter
const tenantUsers = await db
  .select()
  .from(users)
  .where(eq(users.tenantId, currentTenantId));
```

**Integração com Better Auth**:
```typescript
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg'
  })
});
```

**Salvar na Memória**:
```typescript
await update_memory({
  action: "create",
  title: "Documentação Drizzle ORM v0.33",
  knowledge_to_store: `Drizzle ORM v0.33: https://orm.drizzle.team/

RECURSOS:
- TypeScript-first, zero-overhead
- Type-safe queries, SQL-like syntax
- Migrations automáticas, Relations
- PostgreSQL + TimescaleDB support
- Integração com Better Auth, Elysia
- Multi-tenancy via row-level security

LINKS IMPORTANTES:
- PostgreSQL: https://orm.drizzle.team/docs/get-started-postgresql
- Migrations: https://orm.drizzle.team/docs/migrations
- Better Auth: https://www.better-auth.com/docs/adapters/drizzle
- Elysia: https://elysiajs.com/integrations/drizzle.html`
});
```

---

### TimescaleDB
- **Site**: https://www.timescale.com/
- **Versão Recomendada**: 3.0+ (latest)
- **Documentação**: https://docs.timescale.com/
- **Getting Started**: https://docs.timescale.com/getting-started/latest/
- **Time-Series Data**: https://docs.timescale.com/use-timescale/latest/
- **GitHub**: https://github.com/timescale/timescaledb

**O Que É**:
TimescaleDB é uma extensão do PostgreSQL otimizada para time-series data (dados de séries temporais). Ideal para:
- Trading data (preços, volumes, indicadores)
- IoT sensors
- Monitoring & observability
- Financial data
- Analytics

**Principais Recursos**:
- 100% compatível com PostgreSQL (usa Drizzle normalmente)
- Hypertables (tabelas otimizadas para time-series)
- Compressão automática (economiza até 95% espaço)
- Continuous aggregates (views materializadas automáticas)
- Data retention policies
- Time-bucketing queries
- Parallel query execution

**Instalação**:
```sql
-- No PostgreSQL
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
```

**Exemplo com Trading Data**:
```typescript
// Schema Drizzle
import { pgTable, serial, text, timestamp, decimal } from 'drizzle-orm/pg-core';

export const priceData = pgTable('price_data', {
  id: serial('id').primaryKey(),
  symbol: text('symbol').notNull(),
  price: decimal('price', { precision: 18, scale: 8 }).notNull(),
  volume: decimal('volume', { precision: 18, scale: 8 }).notNull(),
  timestamp: timestamp('timestamp').notNull()
});

// Converter para hypertable (SQL)
// SELECT create_hypertable('price_data', 'timestamp');

// Query time-bucketed
const hourlyAvg = await db.execute(sql`
  SELECT 
    time_bucket('1 hour', timestamp) AS bucket,
    symbol,
    avg(price) as avg_price,
    sum(volume) as total_volume
  FROM price_data
  WHERE timestamp > NOW() - INTERVAL '24 hours'
  GROUP BY bucket, symbol
  ORDER BY bucket DESC
`);
```

**Compressão Automática**:
```sql
-- Comprimir dados > 7 dias
ALTER TABLE price_data SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'symbol'
);

SELECT add_compression_policy('price_data', INTERVAL '7 days');
```

**Data Retention**:
```sql
-- Deletar dados > 90 dias automaticamente
SELECT add_retention_policy('price_data', INTERVAL '90 days');
```

**Salvar na Memória**:
```typescript
await update_memory({
  action: "create",
  title: "Documentação TimescaleDB v3.0",
  knowledge_to_store: `TimescaleDB v3.0: https://docs.timescale.com/

RECURSOS:
- Extensão PostgreSQL para time-series data
- Hypertables (tabelas otimizadas), compressão até 95%
- Continuous aggregates automáticos
- Data retention policies, time-bucketing
- 100% compatível com Drizzle ORM
- Ideal para trading data (preços, volumes, indicadores)

USO NO PROJETO:
- Armazenar preços de criptomoedas em tempo real
- Indicadores técnicos históricos
- Performance de bots de trading
- Logs e monitoring

LINKS:
- Getting Started: https://docs.timescale.com/getting-started/latest/
- Time-Series: https://docs.timescale.com/use-timescale/latest/`
});
```

---

### MongoDB
- **Site**: https://www.mongodb.com/
- **Documentação**: https://www.mongodb.com/docs/
- **Driver Node.js**: https://www.mongodb.com/docs/drivers/node/current/
- **GitHub**: https://github.com/mongodb/mongo

---

### PostgreSQL
- **Site**: https://www.postgresql.org/
- **Documentação**: https://www.postgresql.org/docs/
- **Node.js (pg)**: https://node-postgres.com/
- **GitHub**: https://github.com/postgres/postgres

---

## Authentication

### Better Auth
- **Site**: https://www.better-auth.com/
- **Versão Recomendada**: 1.3+ (latest)
- **Documentação**: https://www.better-auth.com/docs/introduction
- **Elysia Integration**: https://www.better-auth.com/docs/integrations/elysia
- **PostgreSQL Adapter**: https://www.better-auth.com/docs/adapters/postgresql
- **Drizzle Adapter**: https://www.better-auth.com/docs/adapters/drizzle
- **GitHub**: https://github.com/better-auth/better-auth

**O Que É**:
Better Auth é uma biblioteca de autenticação moderna, type-safe e extensível para TypeScript. Escolhida para o projeto por:
- Type-safety completo
- Integração nativa com Elysia, Astro, Drizzle
- Multi-tenancy support
- OAuth providers (Google, Apple, GitHub, etc)
- Session management robusto
- Roles & Permissions
- Two-Factor Authentication (2FA)

**Principais Recursos**:
- Email/Password authentication
- OAuth 2.0 providers (Google, Apple, GitHub, Discord, etc)
- Magic links
- Session management (JWT ou database)
- Role-Based Access Control (RBAC)
- Multi-factor authentication (MFA/2FA)
- Account linking
- Email verification
- Password reset
- Rate limiting
- CSRF protection

**Integração com Elysia + Drizzle + PostgreSQL**:
```typescript
// backend/src/auth.ts
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg', // PostgreSQL
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID!,
      teamId: process.env.APPLE_TEAM_ID!,
      keyId: process.env.APPLE_KEY_ID!,
      privateKey: process.env.APPLE_PRIVATE_KEY!,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
});

// Elysia plugin
import { Elysia } from 'elysia';
import { betterAuthPlugin } from 'better-auth/elysia';

const app = new Elysia()
  .use(betterAuthPlugin(auth))
  .get('/protected', async ({ auth }) => {
    const session = await auth.getSession();
    if (!session) {
      return { error: 'Unauthorized' };
    }
    return { user: session.user };
  });
```

**Integração com Astro (Frontend)**:
```typescript
// frontend/src/lib/auth-client.ts
import { createAuthClient } from 'better-auth/client';

export const authClient = createAuthClient({
  baseURL: 'http://localhost:3000', // Backend URL
});

// Login
await authClient.signIn.email({
  email: 'user@example.com',
  password: 'password123',
});

// OAuth (Google)
await authClient.signIn.social({
  provider: 'google',
  callbackURL: '/dashboard',
});

// Get session
const session = await authClient.getSession();

// Logout
await authClient.signOut();
```

**Multi-Tenancy com Better Auth**:
```typescript
// Custom fields for tenant
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    // Adicionar tenant_id ao user
    schema: {
      user: {
        fields: {
          tenantId: {
            type: 'string',
            required: true,
          },
          tenantType: {
            type: 'string', // 'company' | 'trader' | 'influencer'
            required: true,
          },
        },
      },
    },
  }),
  // Hook para validar tenant
  hooks: {
    after: {
      signIn: async ({ user }) => {
        // Validar tenant do user
        const tenant = await db.select().from(tenants)
          .where(eq(tenants.id, user.tenantId));
        
        if (!tenant || !tenant.active) {
          throw new Error('Tenant inativo');
        }
      },
    },
  },
});
```

**Roles & Permissions**:
```typescript
// Definir roles
export const auth = betterAuth({
  // ...
  plugins: [
    {
      id: 'roles',
      roles: {
        admin: ['*'], // Todas permissões
        manager: ['users:read', 'users:write', 'bots:read', 'bots:write'],
        trader: ['bots:read', 'bots:write', 'portfolio:read'],
        viewer: ['bots:read', 'portfolio:read'],
      },
    },
  ],
});

// Middleware de autorização
const requireRole = (role: string) => async ({ auth }: { auth: any }) => {
  const session = await auth.getSession();
  if (!session || !session.user.roles.includes(role)) {
    throw new Error('Forbidden');
  }
};

// Usar em rotas
app.get('/admin', { preHandler: requireRole('admin') }, () => {
  return { message: 'Admin dashboard' };
});
```

**Email/Password Authentication**:
```typescript
// Backend
export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 100,
    sendVerificationEmail: async ({ email, token }) => {
      // Enviar email de verificação
      await emailService.send({
        to: email,
        subject: 'Verifique seu email',
        html: `<a href="${process.env.FRONTEND_URL}/verify?token=${token}">Verificar</a>`,
      });
    },
    sendResetPasswordEmail: async ({ email, token }) => {
      // Enviar email de reset de senha
      await emailService.send({
        to: email,
        subject: 'Resetar senha',
        html: `<a href="${process.env.FRONTEND_URL}/reset-password?token=${token}">Resetar</a>`,
      });
    },
  },
});

// Frontend
// Signup
await authClient.signUp.email({
  email: 'user@example.com',
  password: 'SecurePass123!',
  name: 'John Doe',
});

// Login
await authClient.signIn.email({
  email: 'user@example.com',
  password: 'SecurePass123!',
});

// Reset password
await authClient.sendPasswordReset({
  email: 'user@example.com',
});

await authClient.resetPassword({
  token: 'reset-token',
  newPassword: 'NewSecurePass123!',
});
```

**Google OAuth**:
```typescript
// Backend (.env)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

// Backend (auth.ts)
export const auth = betterAuth({
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectURI: `${process.env.BACKEND_URL}/auth/callback/google`,
    },
  },
});

// Frontend
await authClient.signIn.social({
  provider: 'google',
  callbackURL: '/dashboard',
});
```

**Apple OAuth**:
```typescript
// Backend (.env)
APPLE_CLIENT_ID=com.your-app
APPLE_TEAM_ID=your-team-id
APPLE_KEY_ID=your-key-id
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

// Backend (auth.ts)
export const auth = betterAuth({
  socialProviders: {
    apple: {
      clientId: process.env.APPLE_CLIENT_ID!,
      teamId: process.env.APPLE_TEAM_ID!,
      keyId: process.env.APPLE_KEY_ID!,
      privateKey: process.env.APPLE_PRIVATE_KEY!,
      redirectURI: `${process.env.BACKEND_URL}/auth/callback/apple`,
    },
  },
});

// Frontend
await authClient.signIn.social({
  provider: 'apple',
  callbackURL: '/dashboard',
});
```

**Schema do Banco (Drizzle)**:
```typescript
// Better Auth cria automaticamente as tabelas:
// - users
// - sessions
// - accounts (OAuth)
// - verification_tokens

// Você pode estender com campos customizados:
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  emailVerified: boolean('email_verified').default(false),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow(),
  // Campos customizados
  tenantId: text('tenant_id').notNull(),
  tenantType: text('tenant_type').notNull(), // 'company' | 'trader' | 'influencer'
  role: text('role').default('viewer'), // 'admin' | 'manager' | 'trader' | 'viewer'
});
```

**Salvar na Memória**:
```typescript
await update_memory({
  action: "create",
  title: "Documentação Better Auth v1.3 Completa",
  knowledge_to_store: `Better Auth v1.3: https://www.better-auth.com/

RECURSOS:
- Type-safe authentication library
- Email/Password + OAuth (Google, Apple, GitHub, Discord, etc)
- Session management (JWT ou database)
- RBAC (Roles & Permissions)
- Multi-tenancy support
- 2FA/MFA support
- Integração nativa: Elysia, Astro, Drizzle, PostgreSQL

INTEGRAÇÕES:
- Elysia: https://www.better-auth.com/docs/integrations/elysia
- Drizzle: https://www.better-auth.com/docs/adapters/drizzle
- PostgreSQL: https://www.better-auth.com/docs/adapters/postgresql

AUTHENTICATION METHODS:
- Email/Password: https://www.better-auth.com/docs/authentication/email-password
- Google OAuth: https://www.better-auth.com/docs/authentication/google
- Apple OAuth: https://www.better-auth.com/docs/authentication/apple

USO NO PROJETO:
- Autenticação de usuários (company, traders, influencers)
- Multi-tenancy com tenant_id no user
- RBAC (admin, manager, trader, viewer)
- OAuth Google + Apple
- Session management robusto`
});
```

---

### NextAuth.js (Auth.js)
- **Site**: https://authjs.dev/
- **Documentação**: https://authjs.dev/getting-started
- **GitHub**: https://github.com/nextauthjs/next-auth

---

### Clerk
- **Site**: https://clerk.com/
- **Documentação**: https://clerk.com/docs
- **GitHub**: https://github.com/clerkinc/javascript

---

### Lucia
- **Site**: https://lucia-auth.com/
- **Documentação**: https://lucia-auth.com/getting-started/
- **GitHub**: https://github.com/lucia-auth/lucia

---

## Styling

### Tailwind CSS
- **Site**: https://tailwindcss.com/
- **Documentação**: https://tailwindcss.com/docs
- **Playground**: https://play.tailwindcss.com/
- **GitHub**: https://github.com/tailwindlabs/tailwindcss

**Salvar na Memória**:
```typescript
await update_memory({
  action: "create",
  title: "Documentação Tailwind CSS",
  knowledge_to_store: "Tailwind CSS: https://tailwindcss.com/docs. Utility-first CSS framework. Altamente customizável via config."
});
```

---

### Styled Components
- **Site**: https://styled-components.com/
- **Documentação**: https://styled-components.com/docs
- **GitHub**: https://github.com/styled-components/styled-components

---

### Emotion
- **Site**: https://emotion.sh/
- **Documentação**: https://emotion.sh/docs/introduction
- **GitHub**: https://github.com/emotion-js/emotion

---

## Build Tools

### Vite
- **Site**: https://vitejs.dev/
- **Documentação**: https://vitejs.dev/guide/
- **Config**: https://vitejs.dev/config/
- **GitHub**: https://github.com/vitejs/vite

---

### Webpack
- **Site**: https://webpack.js.org/
- **Documentação**: https://webpack.js.org/concepts/
- **Config**: https://webpack.js.org/configuration/
- **GitHub**: https://github.com/webpack/webpack

---

### Turbopack
- **Site**: https://turbo.build/pack
- **Documentação**: https://turbo.build/pack/docs
- **GitHub**: https://github.com/vercel/turbo

---

## API Development

### tRPC
- **Site**: https://trpc.io/
- **Documentação**: https://trpc.io/docs
- **GitHub**: https://github.com/trpc/trpc

---

### GraphQL
- **Site**: https://graphql.org/
- **Documentação**: https://graphql.org/learn/
- **Apollo Client**: https://www.apollographql.com/docs/react/
- **GitHub**: https://github.com/graphql/graphql-js

---

### REST API

#### Axios
- **Site**: https://axios-http.com/
- **Documentação**: https://axios-http.com/docs/intro
- **GitHub**: https://github.com/axios/axios

#### Fetch API
- **MDN**: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
- **Using Fetch**: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch

---

## DevOps & CI/CD

### Docker
- **Site**: https://www.docker.com/
- **Documentação**: https://docs.docker.com/
- **Get Started**: https://docs.docker.com/get-started/
- **GitHub**: https://github.com/docker

---

### GitHub Actions
- **Site**: https://github.com/features/actions
- **Documentação**: https://docs.github.com/en/actions
- **Marketplace**: https://github.com/marketplace?type=actions

---

## Utilities

### Lodash
- **Site**: https://lodash.com/
- **Documentação**: https://lodash.com/docs/
- **GitHub**: https://github.com/lodash/lodash

---

### Date-fns
- **Site**: https://date-fns.org/
- **Documentação**: https://date-fns.org/docs/Getting-Started
- **GitHub**: https://github.com/date-fns/date-fns

---

### Dayjs
- **Site**: https://day.js.org/
- **Documentação**: https://day.js.org/docs/en/installation/installation
- **GitHub**: https://github.com/iamkun/dayjs

---

## Protocolos & Padrões

### MDN Web Docs
- **Site**: https://developer.mozilla.org/
- **JavaScript**: https://developer.mozilla.org/en-US/docs/Web/JavaScript
- **HTML**: https://developer.mozilla.org/en-US/docs/Web/HTML
- **CSS**: https://developer.mozilla.org/en-US/docs/Web/CSS
- **Web APIs**: https://developer.mozilla.org/en-US/docs/Web/API

---

### W3C
- **Site**: https://www.w3.org/
- **Standards**: https://www.w3.org/TR/
- **HTML**: https://html.spec.whatwg.org/
- **CSS**: https://www.w3.org/Style/CSS/

---

## Workflow de Atualização

### Ao Descobrir Nova Biblioteca

```typescript
// 1. Ler documentação oficial
await web_search({
  search_term: "nome-da-biblioteca official documentation",
  explanation: "Buscar documentação oficial da biblioteca"
});

// 2. Atualizar base de conhecimento
await search_replace({
  file_path: "docs/cursor-agent/reference/base-conhecimento.md",
  old_string: "## Nova Categoria (se necessário)",
  new_string: `## Nova Categoria

### Nome da Biblioteca
- **Site**: https://...
- **Documentação**: https://...
- **Versão Recomendada**: X.X.X
- **GitHub**: https://...

**Principais Recursos**:
- Recurso 1
- Recurso 2

**Salvar na Memória**:
\`\`\`typescript
await update_memory({
  action: "create",
  title: "Documentação Nome da Biblioteca",
  knowledge_to_store: "Nome da Biblioteca: https://... Descrição e principais recursos."
});
\`\`\``
});

// 3. Salvar na memória persistente
await update_memory({
  action: "create",
  title: "Documentação Nome da Biblioteca",
  knowledge_to_store: "Nome da Biblioteca vX.X: https://docs.... Principais recursos: ..."
});
```

---

## Checklist de Consulta Antes de Implementar

- [ ] Consultei a base de conhecimento?
- [ ] Encontrei a documentação oficial?
- [ ] Li a seção de "Getting Started"?
- [ ] Entendi os principais conceitos?
- [ ] Salvei na memória persistente?
- [ ] Atualizei a base de conhecimento se necessário?

---

## Manutenção desta Base

**Responsabilidade**: Todos os agentes

**Frequência**: A cada nova biblioteca ou framework descoberto

**Processo**:
1. Descobrir documentação oficial
2. Atualizar este documento
3. Salvar na memória persistente
4. Comunicar ao time (via PR ou documentação)

---

## Próximos Passos

- [Workflow Completo →](../workflows/workflow-completo.md)
- [Templates →](./templates.md)
- [Todas as Ferramentas →](./todas-ferramentas.md)

