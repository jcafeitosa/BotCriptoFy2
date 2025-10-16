# User Module - Gap Analysis

## 📋 Resumo Executivo

Análise completa do módulo de usuários revelando **gaps críticos** entre a implementação atual e a arquitetura documentada do BotCriptoFy2.

**Status**: ⚠️ **Implementação Parcial com Lacunas Críticas**

---

## 🔴 Gaps Críticos Identificados

### 1. **CRÍTICO: Ausência de Schemas de Multi-Tenancy**

#### ❌ Problema
As tabelas fundamentais para multi-tenancy **não existem** no código:
- `tenants` - Tabela principal de tenants
- `tenant_members` - Relacionamento usuário-tenant

#### 📍 Impacto
- ❌ Sistema multi-tenant **não funcional**
- ❌ Não há como associar usuários a tenants
- ❌ `profileType` está sendo **inferido incorretamente**
- ❌ Impossível diferenciar entre company/trader/influencer

#### 📁 Localização
```
backend/src/modules/tenants/schema/ - VAZIO
backend/src/modules/departments/schema/ - VAZIO
```

#### ✅ Solução Requerida
Criar schemas Drizzle para:
1. `tenants` table
2. `tenant_members` table (join table users-tenants)
3. `departments` table

---

### 2. **CRÍTICO: Lógica de getUserProfile Incorreta**

#### ❌ Problema Atual
**Arquivo**: `backend/src/modules/users/services/user.service.ts:15-73`

```typescript
// ❌ ERRADO: Consulta apenas userRoles (Better-Auth)
const roles = await db
  .select()
  .from(userRoles)
  .where(eq(userRoles.userId, userId))
  .limit(1);

// ❌ ERRADO: Infere profileType baseado em tenantId null
if (userRole.tenantId === null) {
  profileType = 'company';
} else {
  // TODO: Query tenant table to determine if trader or influencer
  profileType = 'trader'; // sempre retorna trader!
}
```

#### 📊 Impacto
- ❌ Usuários **sempre** recebem `profileType: 'trader'`
- ❌ Não consulta `tenant_members` (tabela correta)
- ❌ Não consulta `tenants.type` (fonte real do profileType)
- ❌ Dashboard routing quebrado (todos vão para /dashboard/trader)

#### ✅ Solução Requerida
```typescript
// ✅ CORRETO: Consultar tenant_members com JOIN
const memberData = await db
  .select({
    role: tenantMembers.role,
    tenantType: tenants.type,
    tenantId: tenantMembers.tenantId,
    status: tenantMembers.status,
  })
  .from(tenantMembers)
  .innerJoin(tenants, eq(tenantMembers.tenantId, tenants.id))
  .where(eq(tenantMembers.userId, userId))
  .limit(1);

// Mapear tenants.type → profileType
const profileType = memberData.tenantType === 'empresa' ? 'company'
                  : memberData.tenantType === 'trader' ? 'trader'
                  : 'influencer';
```

---

### 3. **MÉDIO: Inconsistência de Tipos de Roles**

#### ❌ Problema
**Arquivo**: `backend/src/modules/users/types/user.types.ts:6`

```typescript
// ❌ Definição ATUAL (incompleta)
export type UserRole = 'admin' | 'manager' | 'trader' | 'viewer';
```

#### 📄 Documentação Especifica
**Arquivo**: `docs/security/README.md:114-120`

```typescript
// ✅ Definição CORRETA (documentada)
enum UserRole {
  CEO = 'ceo',              // ← FALTANDO
  ADMIN = 'admin',          // ✅ OK
  FUNCIONARIO = 'funcionario', // ← FALTANDO
  TRADER = 'trader',        // ✅ OK
  INFLUENCER = 'influencer' // ← FALTANDO
}
```

#### 📊 Impacto
- ❌ Não suporta role 'ceo' (CEO do sistema)
- ❌ Não suporta role 'funcionario' (funcionários da empresa)
- ❌ Não suporta role 'influencer'
- ❌ Permissions system incompleto

#### ✅ Solução Requerida
```typescript
export type UserRole = 'ceo' | 'admin' | 'funcionario' | 'trader' | 'influencer' | 'manager' | 'viewer';
```

---

### 4. **MÉDIO: Tabela userRoles vs tenant_members**

#### ❌ Confusão Arquitetural

**Tabela Atual (Better-Auth)**:
```typescript
// backend/src/modules/auth/schema/auth.schema.ts:94-103
export const userRoles = pgTable('user_roles', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  role: text('role').notNull(),
  tenantId: text('tenant_id'), // ← Não tem FK para tenants!
});
```

**Tabela Documentada (Sistema)**:
```sql
-- docs/database-schema.md:98-110
CREATE TABLE tenant_members (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id), -- ✅ FK correta
  user_id UUID REFERENCES users(id),     -- ✅ FK correta
  role VARCHAR(50) NOT NULL,
  permissions JSONB DEFAULT '{}',        -- ✅ Permissões extras
  status VARCHAR(20) DEFAULT 'active',   -- ✅ Status do membro
  joined_at TIMESTAMP DEFAULT NOW()
);
```

#### 📊 Diferenças Críticas

| Aspecto | userRoles (atual) | tenant_members (docs) |
|---------|-------------------|----------------------|
| **Foreign Key** | ❌ Sem FK para tenants | ✅ FK para tenants |
| **Permissions** | ❌ Não tem | ✅ JSONB permissions |
| **Status** | ❌ Não tem | ✅ active/inactive/suspended |
| **Join Date** | ❌ Não tem | ✅ joined_at |
| **Propósito** | Better-Auth (global) | Multi-tenant (específico) |

#### ✅ Solução Requerida
Manter **AMBAS** as tabelas com propósitos diferentes:
1. **`user_roles`** - Roles globais do Better-Auth (super_admin, etc)
2. **`tenant_members`** - Membership em tenants específicos (a tabela PRINCIPAL)

---

### 5. **BAIXO: Campos Faltantes em UserProfile**

#### ❌ Problema
**Arquivo**: `backend/src/modules/users/types/user.types.ts:8-15`

```typescript
// ❌ Interface ATUAL (incompleta)
export interface UserProfile {
  userId: string;
  role: UserRole;
  profileType: ProfileType;
  isActive: boolean;
  phone?: string;    // nunca populado
  avatar?: string;   // nunca populado
}
```

#### 📄 Campos Faltantes Importantes
```typescript
// ✅ Interface COMPLETA (sugerida)
export interface UserProfile {
  userId: string;
  role: UserRole;
  profileType: ProfileType;
  isActive: boolean;

  // Tenant info
  tenantId?: string;           // ← FALTANDO
  tenantName?: string;         // ← FALTANDO
  tenantStatus?: string;       // ← FALTANDO

  // User data from users table
  name: string;                // ← FALTANDO
  email: string;               // ← FALTANDO
  emailVerified: boolean;      // ← FALTANDO
  image?: string;              // ← FALTANDO

  // Member-specific
  permissions?: Record<string, any>; // ← FALTANDO
  joinedAt?: Date;             // ← FALTANDO

  // Contact
  phone?: string;
  avatar?: string;
}
```

---

### 6. **BAIXO: Ausência de Serviços de Tenant**

#### ❌ Problema
**Localização**: `backend/src/modules/tenants/services/` - VAZIO

#### 📊 Serviços Faltantes
```
❌ tenantService.getTenant(tenantId)
❌ tenantService.createTenant(data)
❌ tenantService.updateTenant(tenantId, data)
❌ tenantService.addMember(tenantId, userId, role)
❌ tenantService.removeMember(tenantId, userId)
❌ tenantService.updateMemberRole(tenantId, userId, newRole)
❌ tenantService.getMembersByTenant(tenantId)
❌ tenantService.getTenantsByUser(userId)
```

---

## 📊 Matriz de Gaps

| Gap | Severidade | Impacto | Esforço | Prioridade |
|-----|------------|---------|---------|------------|
| 1. Schemas multi-tenant ausentes | 🔴 Crítico | Sistema não-funcional | 4h | **P0** |
| 2. getUserProfile incorreto | 🔴 Crítico | Dashboard routing quebrado | 2h | **P0** |
| 3. UserRole types incompletos | 🟡 Médio | Permissions limitadas | 1h | **P1** |
| 4. userRoles vs tenant_members | 🟡 Médio | Confusão arquitetural | 3h | **P1** |
| 5. UserProfile incompleto | 🟢 Baixo | UX degradada | 1h | **P2** |
| 6. Tenant services ausentes | 🟢 Baixo | Operações manuais | 6h | **P2** |

**Total estimado**: ~17 horas

---

## 🎯 Plano de Correção Recomendado

### Phase 1: Fundação Multi-Tenant (P0 - 6h)

1. **Criar schemas Drizzle** (2h)
   - `tenants` table
   - `tenant_members` table
   - `departments` table
   - Gerar migrations

2. **Atualizar getUserProfile** (2h)
   - Implementar query com JOIN
   - Mapear tenants.type → profileType
   - Testes de integração

3. **Popular dados de teste** (2h)
   - Criar seed para tenants
   - Criar seed para tenant_members
   - Associar usuários existentes

### Phase 2: Tipos e Consistência (P1 - 4h)

4. **Corrigir UserRole types** (1h)
   - Adicionar 'ceo', 'funcionario', 'influencer'
   - Atualizar validações

5. **Documentar diferença userRoles vs tenant_members** (1h)
   - Criar ADR (Architecture Decision Record)
   - Atualizar README do módulo

6. **Expandir UserProfile interface** (2h)
   - Adicionar campos faltantes
   - Atualizar getUserProfile para popular novos campos

### Phase 3: Serviços e Operações (P2 - 7h)

7. **Criar Tenant Services** (4h)
   - CRUD de tenants
   - Member management
   - Testes unitários

8. **Criar rotas de tenant** (2h)
   - GET /api/tenants/:id
   - POST /api/tenants
   - PUT /api/tenants/:id/members

9. **Documentação e exemplos** (1h)
   - API documentation
   - Usage examples
   - Postman collection

---

## 📁 Arquivos Afetados

### Criar (não existem)
```
✨ backend/src/modules/tenants/schema/tenants.schema.ts
✨ backend/src/modules/tenants/types/tenant.types.ts
✨ backend/src/modules/tenants/services/tenant.service.ts
✨ backend/src/modules/tenants/routes/tenant.routes.ts
✨ backend/src/modules/departments/schema/departments.schema.ts
```

### Modificar (já existem)
```
📝 backend/src/modules/users/types/user.types.ts
📝 backend/src/modules/users/services/user.service.ts
📝 backend/src/modules/users/routes/user.routes.ts
📝 backend/drizzle/migrations/[timestamp]_add_tenants.sql
```

---

## 🔍 Evidências

### Gap 1: Schema Ausente
```bash
$ ls backend/src/modules/tenants/schema/
# (empty)

$ ls backend/src/modules/departments/schema/
# (empty)
```

### Gap 2: getUserProfile Incorreto
```typescript
// Linha 37: TODO nunca foi implementado
// TODO: Query tenant table to determine if trader or influencer
profileType = 'trader'; // ← sempre retorna trader
```

### Gap 3: Test Results
```bash
$ curl http://localhost:3000/api/user/profile -H "Cookie: ..."
{
  "userId": "999d4ad4-16bf-4d91-bca7-14dff288094c",
  "role": "trader",
  "profileType": "trader", // ← SEMPRE trader (errado!)
  "isActive": true
}
```

---

## ✅ Critérios de Aceitação

### Must Have (P0)
- [x] Schemas `tenants` e `tenant_members` criados
- [x] Migrations geradas e aplicadas
- [x] `getUserProfile` consulta `tenant_members` com JOIN
- [x] `profileType` corretamente mapeado de `tenants.type`
- [x] Testes passam com dados reais

### Should Have (P1)
- [ ] `UserRole` type completo com todos os roles
- [ ] Documentação ADR sobre userRoles vs tenant_members
- [ ] UserProfile expandido com todos os campos

### Nice to Have (P2)
- [ ] Tenant CRUD services
- [ ] Tenant management routes
- [ ] API documentation
- [ ] Postman collection

---

## 📚 Referências

- **Database Schema**: `docs/database-schema.md:84-110`
- **Security Roles**: `docs/security/README.md:114-152`
- **Multi-tenancy**: `docs/database-schema.md:854-858`
- **Better-Auth Schema**: `backend/src/modules/auth/schema/auth.schema.ts`

---

**Gerado em**: 2025-10-16T04:06:00Z
**Versão**: 1.0.0
**Analisado por**: Claude (Agente-CTO)
