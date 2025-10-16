# JSDoc Patterns - BotCriptoFy2

**Protocolo**: Agente-CTO v2.0 - Regra 17
**Data**: 2025-10-15
**Objetivo**: Padronizar documentação de código com JSDoc

---

## 🎯 Por que JSDoc?

1. **Autocomplete**: IDEs mostram descrições inline
2. **Type Hints**: Informações extras além dos tipos TypeScript
3. **Generated Docs**: Gerar documentação automaticamente
4. **Onboarding**: Novos devs entendem código mais rápido
5. **Conformidade**: Regra 17 do Protocolo Agente-CTO v2.0

---

## 📚 Patterns para Schemas Drizzle

### Pattern 1: Table Documentation

```typescript
/**
 * [Table Name] - [Brief Purpose]
 *
 * @description
 * [Detailed description of what this table stores and why]
 * [Multi-line descriptions are encouraged]
 *
 * @example
 * ```typescript
 * // [Common usage example]
 * const result = await db.query.[tableName].findFirst({
 *   where: eq([tableName].id, id)
 * });
 * ```
 *
 * @see {@link /path/to/doc.md|Related Documentation}
 */
export const tableName = pgTable('table_name', {
  // ...
});
```

**Exemplo Real** (auth.schema.ts):
```typescript
/**
 * Users table - Core user authentication and profile
 *
 * @description
 * Compatible with Better-Auth for authentication flow.
 * Stores basic user information and email verification status.
 *
 * @example
 * ```typescript
 * const user = await db.select().from(users).where(eq(users.id, userId));
 * ```
 *
 * @see {@link https://www.better-auth.com/docs/concepts/users|Better-Auth Users}
 */
export const users = pgTable('users', {
  // ...
});
```

---

### Pattern 2: Field Documentation

```typescript
export const tableName = pgTable('table_name', {
  /** [Brief field description] */
  simpleField: varchar('simple_field', { length: 255 }),

  /**
   * [Field name] - detailed description
   * [Can be multiline if needed]
   * - Option 1: Description
   * - Option 2: Description
   */
  complexField: varchar('complex_field', { length: 50 }).notNull(),
});
```

**Exemplo Real** (tenants.schema.ts):
```typescript
export const tenants = pgTable('tenants', {
  /** Unique identifier (UUID v4) */
  id: uuid('id').primaryKey().defaultRandom(),

  /** Tenant display name */
  name: varchar('name', { length: 255 }).notNull(),

  /**
   * Tenant type defining access model
   * - 'empresa': Company tenant (1:N - multiple employees)
   * - 'trader': Individual trader (1:1 - single user)
   * - 'influencer': Influencer tenant (1:1 - special access)
   */
  type: varchar('type', { length: 20 }).notNull(),
});
```

---

### Pattern 3: Relations Documentation

```typescript
/**
 * [Table] Relations - Type-safe relationships
 *
 * @description
 * Enables querying [table] with [related data].
 * [Additional context about the relationships]
 */
export const tableRelations = relations(tableName, ({ one, many }) => ({
  /** [Relationship description] */
  relatedTable: one(relatedTableName, {
    fields: [tableName.foreignKey],
    references: [relatedTableName.id]
  })
}));
```

**Exemplo Real**:
```typescript
/**
 * User Relations - Defines relationships between users and their accounts/sessions
 *
 * @description
 * Enables type-safe queries with automatic joins using Drizzle ORM relations.
 * Used by query API to fetch users with their associated data.
 */
export const usersRelations = relations(users, ({ many }) => ({
  /** All OAuth accounts linked to this user */
  accounts: many(accounts),

  /** All active sessions for this user */
  sessions: many(sessions),
}));
```

---

## 📝 Padrões por Tipo de Schema

### Auth/Security Schemas

```typescript
/**
 * [Table Name] - Authentication/Security Purpose
 *
 * @description
 * Part of Better-Auth/RBAC system.
 * [Specific security considerations]
 *
 * @security
 * - [Security consideration 1]
 * - [Security consideration 2]
 *
 * @example
 * ```typescript
 * // [Example]
 * ```
 *
 * @see {@link https://docs.security-provider.com|Provider Docs}
 */
```

**Exemplo**:
```typescript
/**
 * Security API Keys table - API key management
 *
 * @description
 * Stores hashed API keys for service-to-service authentication.
 * Keys are automatically rotated every 90 days.
 *
 * @security
 * - Keys are hashed using bcrypt (cost factor 12)
 * - Original keys shown only once during creation
 * - Last used timestamp tracked for audit
 *
 * @example
 * ```typescript
 * const apiKey = await db.query.securityApiKeys.findFirst({
 *   where: and(
 *     eq(securityApiKeys.key, hashedKey),
 *     eq(securityApiKeys.isActive, true)
 *   )
 * });
 * ```
 */
```

---

### TimescaleDB Hypertables

```typescript
/**
 * [Table Name] - Time-series data (Hypertable)
 *
 * @description
 * TimescaleDB hypertable optimized for time-series queries.
 * [What data is stored and retention policy]
 *
 * @hypertable
 * - Partitioned by: [time_column]
 * - Chunk interval: [interval]
 * - Compression: After [period]
 * - Retention: [period]
 *
 * @performance
 * - [Performance characteristics]
 * - [Index strategies]
 *
 * @example
 * ```typescript
 * // [Time-range query example]
 * ```
 */
```

**Exemplo**:
```typescript
/**
 * Audit Logs - Immutable audit trail (Hypertable)
 *
 * @description
 * TimescaleDB hypertable storing immutable audit logs for compliance.
 * All user actions, API calls, and system events are logged here.
 *
 * @hypertable
 * - Partitioned by: created_at
 * - Chunk interval: 1 day
 * - Compression: After 1 day (90% storage reduction)
 * - Retention: 2 years (LGPD compliance)
 *
 * @performance
 * - Queries for last 30 days: < 100ms
 * - Write throughput: 50k logs/second
 * - Indexes: tenant_id, user_id, action
 *
 * @example
 * ```typescript
 * // Query logs for specific user (last 7 days)
 * const logs = await db.query.auditLogs.findMany({
 *   where: and(
 *     eq(auditLogs.userId, userId),
 *     gte(auditLogs.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
 *   ),
 *   orderBy: desc(auditLogs.createdAt)
 * });
 * ```
 *
 * @see {@link /docs/adr/004-timescaledb-hypertables.md|ADR 004}
 */
```

---

### Trading Schemas

```typescript
/**
 * [Table Name] - Trading data/operations
 *
 * @description
 * [What trading data is stored]
 * [Relationship to trading engine]
 *
 * @trading
 * - [Trading-specific info]
 * - [Risk management notes]
 *
 * @example
 * ```typescript
 * // [Trading operation example]
 * ```
 */
```

---

## 🚀 Checklist para Documentar Schema

Ao criar ou atualizar um schema, garanta:

- [ ] **Table JSDoc**: Descrição completa da tabela
- [ ] **@description**: Explicação detalhada do propósito
- [ ] **@example**: Pelo menos 1 exemplo de uso comum
- [ ] **@see**: Links para docs relacionadas (ADRs, APIs externas)
- [ ] **Field Comments**: Todos os campos documentados
- [ ] **Complex Fields**: Enums/options explicados inline
- [ ] **Relations JSDoc**: Relações documentadas
- [ ] **Special Tags**: @hypertable, @security, @trading conforme aplicável

---

## 📊 Níveis de Documentação

### Nível 1: Mínimo Aceitável ✅
```typescript
/** Users table - stores user data */
export const users = pgTable('users', {
  /** User ID */
  id: uuid('id').primaryKey(),
  /** Email address */
  email: varchar('email', { length: 255 })
});
```

### Nível 2: Recomendado ✅✅
```typescript
/**
 * Users table - Core user authentication
 *
 * @description
 * Stores user profiles and authentication data.
 */
export const users = pgTable('users', {
  /** Unique identifier (UUID v4) */
  id: uuid('id').primaryKey().defaultRandom(),

  /** User email (unique, validated) */
  email: varchar('email', { length: 255 }).notNull().unique()
});
```

### Nível 3: Excelente ✅✅✅ (Use este!)
```typescript
/**
 * Users table - Core user authentication and profile
 *
 * @description
 * Compatible with Better-Auth for authentication flow.
 * Stores basic user information and email verification status.
 * Part of multi-tenant architecture - users can belong to multiple tenants.
 *
 * @example
 * ```typescript
 * // Fetch user with accounts
 * const user = await db.query.users.findFirst({
 *   where: eq(users.id, userId),
 *   with: { accounts: true, sessions: true }
 * });
 * ```
 *
 * @see {@link https://www.better-auth.com/docs/concepts/users|Better-Auth Users}
 * @see {@link /docs/architecture/two-machine-architecture.md|Multi-Tenancy}
 */
export const users = pgTable('users', {
  /** Unique identifier (UUID v4) generated automatically */
  id: uuid('id').primaryKey().defaultRandom(),

  /**
   * User email address
   * - Must be unique across platform
   * - Validated on registration
   * - Used for password recovery
   */
  email: varchar('email', { length: 255 }).notNull().unique(),

  /** Email verification status (false until verified) */
  emailVerified: boolean('email_verified').default(false),

  /** Display name (optional, can be null) */
  name: varchar('name', { length: 255 }),

  /** Profile image URL (optional) */
  image: varchar('image', { length: 500 }),

  /** Account creation timestamp */
  createdAt: timestamp('created_at').defaultNow().notNull(),

  /** Last profile update timestamp */
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});
```

---

## 🔧 Tools & Automation

### VS Code Extensions
- **Better Comments**: Syntax highlighting for JSDoc
- **Document This**: Auto-generate JSDoc templates
- **TypeDoc**: Generate HTML docs from JSDoc

### Commands
```bash
# Generate documentation (future)
bun run docs:generate

# Lint JSDoc (future)
bun run lint:jsdoc
```

---

## 📖 Schemas Documentados

Status de documentação JSDoc por módulo:

| Módulo | Status | Nível | Revisor |
|--------|--------|-------|---------|
| auth | ✅ Completo | Nível 3 | Agente-Dev |
| tenants | ✅ Completo | Nível 3 | Agente-Dev |
| departments | ⏳ Pendente | - | - |
| sales | ⏳ Pendente | - | - |
| security | ⏳ Pendente | - | - |
| subscriptions | ⏳ Pendente | - | - |
| notifications | ⏳ Pendente | - | - |
| support | ⏳ Pendente | - | - |
| audit | ⏳ Pendente | - | - |
| documents | ⏳ Pendente | - | - |
| configurations | ⏳ Pendente | - | - |
| ceo | ⏳ Pendente | - | - |
| financial | ⏳ Pendente | - | - |
| marketing | ⏳ Pendente | - | - |

---

## 🎯 Próximos Passos

1. ✅ ~~Documentar auth + tenants (COMPLETO)~~
2. ⏳ Documentar security (próximo - crítico para RBAC)
3. ⏳ Documentar subscriptions (importante para billing)
4. ⏳ Documentar demais schemas administrativos
5. ⏳ Configurar TypeDoc para gerar docs HTML
6. ⏳ Adicionar ao CI/CD: lint JSDoc obrigatório

---

**Responsável**: Agente-Dev
**Aprovado por**: Agente-CTO
**Data**: 2025-10-15
