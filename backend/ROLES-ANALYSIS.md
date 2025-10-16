# Análise Completa de Roles - BotCriptoFy2

## 📋 Resumo Executivo

O sistema possui **DOIS sistemas de roles distintos** com propósitos diferentes:

1. **Global Roles** (Better-Auth `userRoles` table) - Roles globais do sistema
2. **Tenant Roles** (Multi-tenant `tenant_members` table) - Roles específicos por tenant

---

## 🔐 Sistema 1: Global Roles (Better-Auth)

### Tabela: `user_roles`

**Arquivo**: `backend/src/modules/auth/schema/auth.schema.ts:94-103`

```typescript
export const userRoles = pgTable('user_roles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  role: text('role').notNull(),
  tenantId: text('tenant_id'), // NULL para roles globais
});
```

### Tipos Definidos

**Arquivo**: `backend/src/modules/auth/types/auth.types.ts:63-69`

```typescript
export enum Role {
  SUPER_ADMIN = 'super_admin',  // Super administrador do sistema
  ADMIN = 'admin',               // Administrador
  MANAGER = 'manager',           // Gerente
  USER = 'user',                 // Usuário comum
  VIEWER = 'viewer',             // Visualizador (read-only)
}
```

### Propósito

- **Escopo**: Global, não vinculado a tenant específico
- **Uso**: Controle de acesso ao sistema como um todo
- **Exemplo**: `super_admin` pode acessar todos os tenants
- **Características**:
  - `tenantId` é NULL para roles globais
  - Gerenciado pelo Better-Auth
  - Usado para autenticação e autorização global

---

## 🏢 Sistema 2: Tenant Roles (Multi-Tenant)

### Tabela: `tenant_members`

**Arquivo**: `backend/src/modules/tenants/schema/tenants.schema.ts:33-56`

```typescript
export const tenantMembers = pgTable('tenant_members', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  userId: text('user_id').notNull().references(() => users.id),
  role: text('role').notNull(),
  permissions: text('permissions', { mode: 'json' }).default('{}'),
  status: text('status').notNull().default('active'),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
});
```

### Tipos Documentados

**Arquivo**: `docs/security/README.md:114-120`

```typescript
export enum UserRole {
  CEO = 'ceo',                    // CEO da empresa/sistema
  ADMIN = 'admin',                // Administrador do tenant
  FUNCIONARIO = 'funcionario',    // Funcionário da empresa
  TRADER = 'trader',              // Trader individual
  INFLUENCER = 'influencer'       // Influenciador
}
```

### Tipos Implementados

**Arquivo**: `backend/src/modules/users/types/user.types.ts:10-17` ✅ **ATUALIZADO**

```typescript
export type UserRole =
  | 'ceo'           // CEO of the system/company
  | 'admin'         // Administrator
  | 'funcionario'   // Employee
  | 'trader'        // Trader
  | 'influencer'    // Influencer
  | 'manager'       // Manager (legacy - pode ser removido?)
  | 'viewer';       // View-only access (legacy - pode ser removido?)
```

### Tipos no Tenant Schema

**Arquivo**: `backend/src/modules/tenants/types/tenant.types.ts:20-27`

```typescript
export type TenantRole =
  | 'ceo'
  | 'admin'
  | 'funcionario'
  | 'trader'
  | 'influencer'
  | 'manager'
  | 'viewer';
```

### Propósito

- **Escopo**: Específico por tenant
- **Uso**: Controle de acesso dentro de um tenant
- **Exemplo**: Um usuário pode ser 'admin' no tenant A e 'trader' no tenant B
- **Características**:
  - `tenantId` é sempre NOT NULL
  - Gerenciado pelo sistema multi-tenant
  - Usado para autorização dentro do contexto do tenant

---

## ⚠️ Inconsistências Identificadas

### 1. Roles 'manager' e 'viewer' são Ambíguos

**Problema**:
- `manager` e `viewer` existem em **Global Roles** (Better-Auth)
- `manager` e `viewer` foram adicionados em **Tenant Roles** (mas não estão documentados)

**Origem**:
- Global Roles: Definidos em `auth.types.ts` (Better-Auth)
- Documentação: Define apenas 5 tenant roles (ceo, admin, funcionario, trader, influencer)

**Impacto**:
- Confusão sobre qual sistema usar
- Potencial duplicação de funcionalidade
- Falta de clareza na arquitetura

### 2. UserRole Type Usado para Dois Propósitos

**Problema**:
O tipo `UserRole` em `users/types/user.types.ts` está sendo usado para **tenant roles**, mas inclui roles que pertencem ao sistema global.

**Arquivo**: `backend/src/modules/users/types/user.types.ts`

```typescript
// ⚠️ Mistura roles de dois sistemas diferentes
export type UserRole =
  | 'ceo'           // ✅ Tenant role (docs)
  | 'admin'         // ✅ Tanto global quanto tenant
  | 'funcionario'   // ✅ Tenant role (docs)
  | 'trader'        // ✅ Tenant role (docs)
  | 'influencer'    // ✅ Tenant role (docs)
  | 'manager'       // ❌ Global role (Better-Auth)
  | 'viewer';       // ❌ Global role (Better-Auth)
```

---

## ✅ Recomendações

### Opção 1: Separação Total (Recomendado)

Criar tipos distintos para cada sistema:

```typescript
// auth/types/auth.types.ts
export type GlobalRole = 'super_admin' | 'admin' | 'manager' | 'user' | 'viewer';

// users/types/user.types.ts
export type TenantRole = 'ceo' | 'admin' | 'funcionario' | 'trader' | 'influencer';

// Renomear UserRole para TenantRole
export type UserRole = TenantRole; // Alias para compatibilidade
```

**Vantagens**:
- Clareza arquitetural
- Sem ambiguidade
- Fácil de documentar
- Segue a documentação original

### Opção 2: Unificação com Namespacing

Manter ambos os sistemas mas com namespacing claro:

```typescript
export type GlobalRole = 'global:super_admin' | 'global:admin' | 'global:manager';
export type TenantRole = 'tenant:ceo' | 'tenant:admin' | 'tenant:funcionario' | 'tenant:trader' | 'tenant:influencer';
```

**Vantagens**:
- Explicitamente diferencia os dois sistemas
- Evita colisões de nomes

**Desvantagens**:
- Mudanças em toda a codebase
- Mais verboso

### Opção 3: Adicionar 'manager' e 'viewer' como Tenant Roles Válidos

Oficializar `manager` e `viewer` como tenant roles:

```typescript
export type TenantRole =
  | 'ceo'           // CEO
  | 'admin'         // Administrador
  | 'manager'       // ✅ Gerente (adicionar à docs)
  | 'funcionario'   // Funcionário
  | 'trader'        // Trader
  | 'influencer'    // Influencer
  | 'viewer';       // ✅ Visualizador (adicionar à docs)
```

**Vantagens**:
- Mantém compatibilidade com código existente
- Adiciona flexibilidade ao sistema de permissões

**Desvantagens**:
- Desvia da documentação original
- Requer atualização da documentação

---

## 📊 Mapeamento Atual

### Global Roles → Tenant Roles (quando aplicável)

| Global Role | Pode ter Tenant Role? | Exemplo de Uso |
|-------------|----------------------|----------------|
| super_admin | ❌ Não (acesso global) | Acesso a todos os tenants sem membership |
| admin       | ✅ Sim | Pode ser admin em um tenant específico |
| manager     | ✅ Sim | Pode ser manager em um tenant específico |
| user        | ✅ Sim | Pode ter role trader/funcionario/etc |
| viewer      | ✅ Sim | Pode ter acesso read-only a um tenant |

### Tenant Roles → Profile Types

| Tenant Role | Tenant Type | Profile Type |
|-------------|-------------|--------------|
| ceo         | empresa     | company      |
| admin       | empresa     | company      |
| funcionario | empresa     | company      |
| trader      | trader      | trader       |
| influencer  | influencer  | influencer   |
| manager     | ❓ qualquer | ❓ depende do tenant type |
| viewer      | ❓ qualquer | ❓ depende do tenant type |

---

## 🎯 Decisão Requerida

**Preciso de decisão do usuário sobre qual abordagem seguir:**

1. **Opção 1 (Recomendada)**: Remover 'manager' e 'viewer' de TenantRole, manter apenas nos Global Roles
2. **Opção 2**: Adicionar namespacing explícito (global: vs tenant:)
3. **Opção 3**: Oficializar 'manager' e 'viewer' como tenant roles válidos e atualizar a documentação

**Recomendação do Agente-CTO**: **Opção 1** - Seguir estritamente a documentação original.

---

## 📁 Arquivos Impactados

### Se escolher Opção 1 (Recomendada):

**Modificar**:
- `backend/src/modules/users/types/user.types.ts` - Remover 'manager' e 'viewer'
- `backend/src/modules/tenants/types/tenant.types.ts` - Remover 'manager' e 'viewer'
- `backend/src/modules/users/routes/user.routes.ts` - Atualizar descrição
- `backend/src/modules/auth/types/auth.types.ts` - Deixar como está (GlobalRole)

**Atualizar Documentação**:
- `docs/security/README.md` - Adicionar seção explicando os dois sistemas
- `backend/USER-MODULE-GAP-ANALYSIS.md` - Atualizar com nova informação

---

## 📚 Referências

- **Better-Auth Roles**: `backend/src/modules/auth/types/auth.types.ts:63-69`
- **Tenant Roles (Docs)**: `docs/security/README.md:114-120`
- **Tenant Roles (Impl)**: `backend/src/modules/users/types/user.types.ts:10-17`
- **User Roles Table**: `backend/src/modules/auth/schema/auth.schema.ts:94-103`
- **Tenant Members Table**: `backend/src/modules/tenants/schema/tenants.schema.ts:33-56`

---

**Gerado em**: 2025-10-16
**Versão**: 1.0.0
**Analisado por**: Claude (Agente-CTO)
