# Quick Start - Primeiros Passos com Cursor Agent

## Visão Geral

Guia rápido para começar a usar o Cursor Agent seguindo o Protocolo Agente-CTO v2.0.

---

## Passo 1: Receber Tarefa

Você recebe uma nova tarefa:

**Exemplo**: "Implementar sistema de autenticação com login e registro"

---

## Passo 2: Consultar Base de Conhecimento

**OBRIGATÓRIO**: Antes de começar, consulte as documentações oficiais.

```typescript
// 1. Ler base de conhecimento
await read_file({
  target_file: "docs/cursor-agent/reference/base-conhecimento.md"
});

// 2. Identificar tecnologias necessárias
const techStack = {
  frontend: "React v18",
  validation: "Zod",
  auth: "NextAuth.js",
  typescript: "TypeScript v5"
};

// 3. Salvar docs na memória persistente
await update_memory({
  action: "create",
  title: "Documentação React v18",
  knowledge_to_store: "React v18: https://react.dev/. Concurrent rendering, Automatic batching, Transitions API."
});

await update_memory({
  action: "create",
  title: "Documentação Zod",
  knowledge_to_store: "Zod: https://zod.dev/. TypeScript-first schema validation. Obrigatório para validação (Regra 19)."
});

await update_memory({
  action: "create",
  title: "Documentação NextAuth.js",
  knowledge_to_store: "NextAuth.js: https://authjs.dev/. Authentication for Next.js. Múltiplos providers, sessions, JWT."
});
```

---

## Passo 3: Criar Plano Estruturado

```typescript
await create_plan({
  name: "Sistema de Autenticação",
  overview: "Implementar autenticação completa com login, registro e gerenciamento de sessões usando NextAuth.js e Zod",
  plan: `# Sistema de Autenticação

## Contexto
Sistema de autenticação para aplicação Next.js com:
- Registro de novos usuários
- Login com email/senha
- Gerenciamento de sessões
- Proteção de rotas

## Objetivo
Permitir que usuários se registrem, façam login e acessem áreas protegidas.

## Escopo

### Incluído
- Página de registro com validação
- Página de login
- Sessão com NextAuth.js
- Middleware de proteção de rotas
- Testes E2E

### Excluído
- OAuth providers (fase futura)
- 2FA (fase futura)
- Password reset (fase futura)

## Tecnologias

### Frontend
- React 18
- Next.js 14 (App Router)
- TypeScript 5
- Tailwind CSS

### Backend
- NextAuth.js v5
- Prisma ORM
- PostgreSQL

### Validation & Testing
- Zod (validação)
- Jest + RTL (testes unitários)
- Playwright (testes E2E)

## Documentações Oficiais Consultadas
- React: https://react.dev/
- Next.js: https://nextjs.org/docs
- NextAuth.js: https://authjs.dev/
- Zod: https://zod.dev/
- Prisma: https://www.prisma.io/docs
- TypeScript: https://www.typescriptlang.org/docs/

## Subtarefas (TODOs abaixo)
`,
  todos: [
    {
      id: "1-schema",
      content: "Criar schema Prisma e validação Zod para User",
      status: "pending"
    },
    {
      id: "2-auth-config",
      content: "Configurar NextAuth.js com credentials provider",
      status: "pending"
    },
    {
      id: "3-register",
      content: "Implementar página e API de registro",
      status: "pending"
    },
    {
      id: "4-login",
      content: "Implementar página de login",
      status: "pending"
    },
    {
      id: "5-middleware",
      content: "Criar middleware de proteção de rotas",
      status: "pending"
    },
    {
      id: "6-tests",
      content: "Testes completos (80%+ coverage)",
      status: "pending"
    }
  ]
});
```

---

## Passo 4: Criar Diagramas Mermaid

### Arquitetura

```typescript
await write({
  file_path: "docs/architecture/auth-architecture.md",
  contents: `# Arquitetura do Sistema de Autenticação

## Diagrama de Componentes

\`\`\`mermaid
graph TB
    subgraph Frontend
        LoginPage[Login Page]
        RegisterPage[Register Page]
        ProtectedPage[Protected Pages]
    end
    
    subgraph NextAuth
        AuthAPI[Auth API Routes]
        Session[Session Management]
        Middleware[Auth Middleware]
    end
    
    subgraph Database
        Prisma[Prisma ORM]
        DB[(PostgreSQL)]
    end
    
    LoginPage --> AuthAPI
    RegisterPage --> AuthAPI
    ProtectedPage --> Middleware
    Middleware --> Session
    AuthAPI --> Prisma
    Prisma --> DB
\`\`\`

## Fluxo de Registro

\`\`\`mermaid
sequenceDiagram
    participant U as User
    participant R as Register Page
    participant API as Auth API
    participant DB as Database
    
    U->>R: Preenche formulário
    R->>R: Validação Zod (client)
    R->>API: POST /api/auth/register
    API->>API: Validação Zod (server)
    API->>API: Hash password (bcrypt)
    API->>DB: Criar usuário
    DB-->>API: User created
    API-->>R: Success
    R-->>U: Redirecionar para login
\`\`\`

## Fluxo de Login

\`\`\`mermaid
sequenceDiagram
    participant U as User
    participant L as Login Page
    participant Auth as NextAuth
    participant DB as Database
    
    U->>L: Preenche credenciais
    L->>Auth: signIn()
    Auth->>DB: Buscar user
    DB-->>Auth: User data
    Auth->>Auth: Verificar password
    Auth->>Auth: Criar sessão (JWT)
    Auth-->>L: Session token
    L-->>U: Redirecionar para /dashboard
\`\`\`
`
});
```

### Workflow CRUD

```typescript
await write({
  file_path: "docs/workflows/auth-workflow.md",
  contents: `# Workflow de Autenticação

## CRUD de Usuário

\`\`\`mermaid
graph TD
    Start[Início] --> Create{Registro?}
    Create -->|Sim| ValidateC[Validar com Zod]
    ValidateC -->|Válido| HashC[Hash Password]
    HashC --> SaveC[Salvar no DB]
    SaveC --> SuccessC[201 Created]
    ValidateC -->|Inválido| ErrorC[400 Bad Request]
    
    Create -->|Não| Login{Login?}
    Login -->|Sim| FindU[Buscar Usuário]
    FindU -->|Encontrado| CheckPass[Verificar Password]
    CheckPass -->|Correto| CreateSession[Criar Sessão]
    CreateSession --> SuccessL[200 OK]
    CheckPass -->|Incorreto| ErrorL[401 Unauthorized]
    FindU -->|Não Encontrado| Error404[404 Not Found]
\`\`\`

## Árvore de Decisão

\`\`\`mermaid
graph TD
    Request[Request] --> Type{Tipo?}
    Type -->|Register| ValidateR{Dados Válidos?}
    ValidateR -->|Não| Return400[400 Bad Request]
    ValidateR -->|Sim| CheckDup{Email Existe?}
    CheckDup -->|Sim| Return409[409 Conflict]
    CheckDup -->|Não| CreateUser[Criar Usuário]
    CreateUser --> Return201[201 Created]
    
    Type -->|Login| ValidateL{Credenciais Válidas?}
    ValidateL -->|Não| Return401[401 Unauthorized]
    ValidateL -->|Sim| CreateSession[Criar Sessão]
    CreateSession --> Return200[200 OK]
\`\`\`
`
});
```

---

## Passo 5: Implementar (Fase 4 - Execução)

### 5.1 Marcar TODO como in_progress

```typescript
await todo_write({
  merge: true,
  todos: [
    { id: "1-schema", status: "in_progress" }
  ]
});
```

### 5.2 Criar Schema Prisma

```typescript
await write({
  file_path: "prisma/schema.prisma",
  contents: `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  passwordHash  String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([email])
}
`
});
```

### 5.3 Criar Validação Zod

```typescript
await write({
  file_path: "src/schemas/auth.ts",
  contents: `import { z } from 'zod';

/**
 * Schema de validação para registro de usuário
 * @see https://zod.dev
 */
export const registerSchema = z.object({
  name: z.string()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  email: z.string()
    .email('Email inválido')
    .toLowerCase(),
  password: z.string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
    .regex(/[@$!%*?&]/, 'Senha deve conter pelo menos um caractere especial'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword']
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Schema de validação para login
 */
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória')
});

export type LoginInput = z.infer<typeof loginSchema>;
`
});
```

### 5.4 Adicionar Testes

```typescript
await write({
  file_path: "src/schemas/auth.test.ts",
  contents: `import { registerSchema, loginSchema } from './auth';

describe('registerSchema', () => {
  it('should validate correct registration data', () => {
    const validData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!'
    };
    
    const result = registerSchema.parse(validData);
    expect(result.email).toBe('john@example.com');
  });
  
  it('should reject short name', () => {
    const data = {
      name: 'J',
      email: 'john@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!'
    };
    
    expect(() => registerSchema.parse(data)).toThrow('Nome deve ter no mínimo 2 caracteres');
  });
  
  it('should reject invalid email', () => {
    const data = {
      name: 'John Doe',
      email: 'invalid-email',
      password: 'Password123!',
      confirmPassword: 'Password123!'
    };
    
    expect(() => registerSchema.parse(data)).toThrow('Email inválido');
  });
  
  it('should reject weak password', () => {
    const data = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'weak',
      confirmPassword: 'weak'
    };
    
    expect(() => registerSchema.parse(data)).toThrow();
  });
  
  it('should reject mismatched passwords', () => {
    const data = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123!',
      confirmPassword: 'Different123!'
    };
    
    expect(() => registerSchema.parse(data)).toThrow('Senhas não conferem');
  });
});

describe('loginSchema', () => {
  it('should validate correct login data', () => {
    const validData = {
      email: 'john@example.com',
      password: 'Password123!'
    };
    
    const result = loginSchema.parse(validData);
    expect(result).toEqual(validData);
  });
});
`
});
```

### 5.5 Verificar Lints e Testes

```typescript
// Verificar lints
const lints = await read_lints({
  paths: ["src/schemas/"]
});

// Executar testes
await run_terminal_cmd({
  command: "npm test auth.test.ts",
  is_background: false
});
```

### 5.6 Marcar como Completed

```typescript
await todo_write({
  merge: true,
  todos: [
    { id: "1-schema", status: "completed" },
    { id: "2-auth-config", status: "in_progress" }
  ]
});
```

---

## Passo 6: Repetir para Outros TODOs

Continue implementando os próximos TODOs seguindo o mesmo padrão:
1. Marcar in_progress
2. Implementar código completo
3. Adicionar testes
4. Verificar lints
5. Executar testes
6. Marcar completed

---

## Passo 7: Revisão (Fase 5)

```typescript
// Pipeline completo de validação
await run_terminal_cmd({
  command: "npm run lint && npm run type-check && npm test -- --coverage",
  is_background: false
});

// Gerar relatório de review
await write({
  file_path: "docs/reviews/auth-review.md",
  contents: `# Code Review: Sistema de Autenticação

## Status: ✅ Aprovado

## Checklist
- [x] Lint passou (0 erros)
- [x] Type check passou (0 erros)
- [x] Testes passaram
- [x] Coverage: 87%
- [x] Código completo (sem mocks)
- [x] Validação Zod implementada
- [x] Documentação inline

## Aprovado por: Agente-Revisor
## Data: ${new Date().toISOString()}
`
});
```

---

## Passo 8: QA (Fase 6)

```typescript
// Executar testes E2E
await run_terminal_cmd({
  command: "npm run test:e2e",
  is_background: false
});

// Gerar relatório de QA
await write({
  file_path: "docs/qa/auth-qa-report.md",
  contents: `# Relatório de QA: Sistema de Autenticação

## Status: ✅ Aprovado

## Testes Executados
- Unitários: 45 (100% passou)
- Integração: 12 (100% passou)
- E2E: 5 (100% passou)
- Coverage: 87%

## Cenários Testados
- [x] Registro com dados válidos
- [x] Registro com email duplicado
- [x] Login com credenciais corretas
- [x] Login com credenciais incorretas
- [x] Acesso a rota protegida sem auth
- [x] Acesso a rota protegida com auth

## Aprovado por: Agente-QA
## Data: ${new Date().toISOString()}
`
});
```

---

## Passo 9: Documentação (Fase 7)

```typescript
// README
await write({
  file_path: "src/features/auth/README.md",
  contents: `# Sistema de Autenticação

## Descrição
Sistema completo de autenticação com registro, login e proteção de rotas.

## Tecnologias
- NextAuth.js v5
- Zod para validação
- Prisma ORM
- bcrypt para hashing

## Uso

### Registro
\`\`\`typescript
import { registerSchema } from '@/schemas/auth';

const data = registerSchema.parse({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'Password123!',
  confirmPassword: 'Password123!'
});
\`\`\`

### Login
\`\`\`typescript
import { signIn } from 'next-auth/react';

await signIn('credentials', {
  email: 'john@example.com',
  password: 'Password123!',
  callbackUrl: '/dashboard'
});
\`\`\`

## Documentação
- [Arquitetura](../../docs/architecture/auth-architecture.md)
- [Workflows](../../docs/workflows/auth-workflow.md)
- [ADR](../../docs/adr/001-auth-decisions.md)
`
});

// ADR
await write({
  file_path: "docs/adr/001-auth-technology-choices.md",
  contents: `# ADR 001: Escolhas Tecnológicas para Autenticação

## Status
Aceito

## Contexto
Precisamos implementar autenticação segura e escalável.

## Decisão
- NextAuth.js v5 para gerenciamento de sessões
- Zod para validação (Regra 19)
- bcrypt para hashing de senhas
- JWT para tokens

## Consequências

### Positivas
- Type safety completo com Zod + TypeScript
- NextAuth.js bem mantido e seguro
- Fácil adicionar OAuth providers no futuro

### Negativas
- Curva de aprendizado do NextAuth.js

## Referências
- NextAuth.js: https://authjs.dev/
- Zod: https://zod.dev/

## Data: ${new Date().toISOString()}
`
});
```

---

## Passo 10: Pull Request (Fase 8) ⭐

```typescript
// 1. Criar branch
await run_terminal_cmd({
  command: "git checkout -b feature/auth-system",
  required_permissions: ["git_write"]
});

// 2. Commit
await run_terminal_cmd({
  command: `git add . && git commit -m "feat: implement authentication system

- Complete registration and login flows
- Zod validation for all inputs
- NextAuth.js session management
- Protected routes middleware
- 87% test coverage
- Full documentation

Closes #123"`,
  required_permissions: ["git_write"]
});

// 3. Push
await run_terminal_cmd({
  command: "git push origin feature/auth-system",
  required_permissions: ["git_write", "network"]
});

// 4. Criar PR
await run_terminal_cmd({
  command: `gh pr create --title "feat: Authentication System" --body "## Descrição
Sistema completo de autenticação com registro e login.

## Checklist
- [x] Código completo
- [x] Testes 87%
- [x] Documentação completa
- [x] Diagramas Mermaid
- [x] ADR criado

## Docs
- [Arquitetura](docs/architecture/auth-architecture.md)
- [Workflow](docs/workflows/auth-workflow.md)
- [ADR](docs/adr/001-auth-decisions.md)"`,
  required_permissions: ["network"]
});
```

---

## Passo 11: Entrega (Fase 9)

```typescript
// Após aprovação, merge
await run_terminal_cmd({
  command: "gh pr merge --squash --delete-branch",
  required_permissions: ["git_write", "network"]
});

// Atualizar memória com aprendizados
await update_memory({
  action: "create",
  title: "Aprendizados: Sistema de Autenticação",
  knowledge_to_store: `Sistema de autenticação implementado com sucesso.

Principais aprendizados:
- NextAuth.js v5 tem API simplificada vs v4
- Zod refinements perfeitos para validação de senhas
- Middleware do Next.js 14 muito eficiente

Métricas:
- Coverage: 87%
- 0 bugs em QA
- Implementação em 2 dias

Refs usadas:
- NextAuth.js: https://authjs.dev/
- Zod: https://zod.dev/`
});
```

---

## Resumo do Fluxo

```
1. Consultar base de conhecimento ✅
2. Salvar docs na memória ✅
3. Criar plano estruturado ✅
4. Criar diagramas Mermaid ✅
5. Implementar (executar TODOs) ✅
6. Revisão ✅
7. QA ✅
8. Documentação ✅
9. Pull Request ✅
10. Entrega ✅
```

---

## Próximos Passos

- [Workflow Completo →](./workflow-completo.md)
- [Exemplo Detalhado →](./exemplo-completo.md)
- [Base de Conhecimento →](../reference/base-conhecimento.md)

