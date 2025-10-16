# 🔐 Auth Module - Better-Auth

Módulo de autenticação usando **Better-Auth** exclusivamente.

## 🎯 Características

- ✅ **Email & Password** - Autenticação tradicional
- ✅ **Session Management** - Sessões seguras com cookies
- ✅ **Email Verification** - Verificação obrigatória de email
- ✅ **Password Reset** - Recuperação de senha
- ✅ **Two-Factor Auth** - 2FA com TOTP
- ✅ **Passkeys/WebAuthn** - Autenticação sem senha
- ✅ **Social Login** - Google, GitHub (configurável)
- ✅ **Role-Based Access** - RBAC para multi-tenant
- ✅ **Multi-Tenant** - Suporte a múltiplos tenants

## 📂 Estrutura

```
auth/
├── schema/
│   └── auth.schema.ts        # Schemas Drizzle (users, sessions, etc.)
├── types/
│   └── auth.types.ts         # TypeScript types
├── services/
│   └── auth.config.ts        # Better-Auth configuration
├── routes/
│   └── auth.routes.ts        # Auth API routes
├── middleware/
│   ├── guards.ts             # Auth guards (backward compatibility)
│   └── session.middleware.ts # Better-Auth session guards
├── index.ts                  # Barrel exports
└── README.md                 # This file
```

## 🚀 Instalação

### 1. Gerar Migrations

```bash
cd backend
bun run db:generate
```

### 2. Aplicar Migrations

```bash
bun run db:migrate
```

### 3. Verificar Tabelas

```bash
bun run db:studio
```

Deve haver 8 tabelas:
- `users` - Usuários
- `sessions` - Sessões ativas
- `accounts` - Contas OAuth
- `verifications` - Tokens de verificação
- `two_factor` - Dados de 2FA
- `user_roles` - Roles por tenant
- `passkeys` - WebAuthn credentials

## 📖 Uso

### Backend (Integração no App)

```typescript
// src/index.ts
import { Elysia } from 'elysia';
import { authRoutes, authCustomRoutes } from '@/modules/auth';

const app = new Elysia()
  // Better-Auth routes (handles all /api/auth/* automatically)
  .use(authRoutes)

  // Custom auth endpoints (/api/auth/me, /api/auth/status)
  .use(authCustomRoutes);
```

### Rotas Disponíveis (Better-Auth)

**Autenticação:**
- `POST /api/auth/sign-up/email` - Registro com email/senha
- `POST /api/auth/sign-in/email` - Login com email/senha
- `POST /api/auth/sign-out` - Logout
- `GET  /api/auth/session` - Obter sessão atual

**Verificação:**
- `POST /api/auth/send-verification-email` - Enviar email de verificação
- `POST /api/auth/verify-email` - Verificar email

**Reset de Senha:**
- `POST /api/auth/forget-password` - Solicitar reset
- `POST /api/auth/reset-password` - Resetar senha

**Perfil:**
- `POST /api/auth/update-user` - Atualizar dados do usuário
- `POST /api/auth/change-password` - Mudar senha

**Two-Factor:**
- `POST /api/auth/two-factor/enable` - Ativar 2FA
- `POST /api/auth/two-factor/disable` - Desativar 2FA
- `POST /api/auth/two-factor/verify` - Verificar código 2FA

**Custom:**
- `GET  /api/auth/me` - Obter usuário atual
- `GET  /api/auth/status` - Status de autenticação (não falha)

### Frontend (Better-Auth Client)

```typescript
// frontend/src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: "http://localhost:3000",
});

// Uso em componentes
import { authClient } from '@/lib/auth-client';

// Sign up
await authClient.signUp.email({
  email: 'user@example.com',
  password: 'SecurePass123',
  name: 'John Doe',
});

// Sign in
await authClient.signIn.email({
  email: 'user@example.com',
  password: 'SecurePass123',
});

// Get session
const { data: session } = await authClient.getSession();

// Sign out
await authClient.signOut();
```

### Proteger Rotas (Guards)

```typescript
import { Elysia } from 'elysia';
import { sessionGuard, requireRole, requireVerifiedEmail } from '@/modules/auth';

const app = new Elysia()
  // Rota protegida (requer autenticação)
  .use(sessionGuard)
  .get('/api/v1/protected', ({ user }) => {
    return { message: `Hello ${user.name}` };
  })

  // Rota que requer role específica
  .use(sessionGuard)
  .use(requireRole(['admin', 'manager']))
  .get('/api/v1/admin', ({ user }) => {
    return { message: 'Admin area', user };
  })

  // Rota que requer email verificado
  .use(sessionGuard)
  .use(requireVerifiedEmail)
  .get('/api/v1/verified', ({ user }) => {
    return { message: 'Email verified!', email: user.email };
  });
```

### Auth Context Types

```typescript
import type { User, Session } from '@/modules/auth';

// Em rotas protegidas, user e session estão disponíveis
app
  .use(sessionGuard)
  .get('/profile', ({ user, session }) => {
    // user: User
    // session: Session

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      sessionId: session.id,
      expiresAt: session.expiresAt,
    };
  });
```

## 🔒 Roles & Permissions

### Roles Padrão

```typescript
enum Role {
  SUPER_ADMIN = 'super_admin',  // Acesso total
  ADMIN = 'admin',              // Administrador do tenant
  MANAGER = 'manager',          // Gerente
  USER = 'user',                // Usuário comum
  VIEWER = 'viewer',            // Apenas visualização
}
```

### Atribuir Role

```typescript
import { db } from '@/db';
import { userRoles } from '@/modules/auth';

// Criar role para usuário
await db.insert(userRoles).values({
  id: crypto.randomUUID(),
  userId: user.id,
  role: 'admin',
  tenantId: tenant.id, // ou null para role global
});
```

### Verificar Role em Guard

```typescript
import { sessionGuard, requireRole } from '@/modules/auth';

app
  .use(sessionGuard)
  .use(requireRole('admin')) // Uma role
  .get('/admin-only', handler)

  .use(requireRole(['admin', 'manager'])) // Múltiplas roles
  .get('/management', handler);
```

## 🏢 Multi-Tenancy

### Adicionar Tenant ao Usuário

```typescript
// Ao criar usuário, associar a um tenant
await db.insert(userRoles).values({
  id: crypto.randomUUID(),
  userId: user.id,
  role: 'user',
  tenantId: 'tenant-uuid',
});
```

### Validar Tenant

```typescript
import { sessionGuard, requireTenant } from '@/modules/auth';

app
  .use(sessionGuard)
  .use(requireTenant) // Valida que user tem tenantId
  .get('/tenant-resource', ({ user, tenantId }) => {
    // tenantId está disponível no contexto
    return { message: `Tenant: ${tenantId}` };
  });
```

## 🔐 Segurança

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/botcriptofy2

# Better-Auth
NODE_ENV=production  # Use secure cookies in production

# Email (para verificação e reset de senha)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@botcriptofy.com
SMTP_PASSWORD=your-smtp-password

# Social Login (opcional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Frontend URL
FRONTEND_URL=https://app.botcriptofy.com
```

### Session Security

- **Cookie-based**: Sessões armazenadas em cookies HttpOnly
- **SameSite**: Proteção CSRF
- **Secure**: HTTPS only em produção
- **Expiration**: 7 dias (configurável)
- **Refresh**: Atualização automática a cada 24h

### Password Security

- **Hashing**: bcrypt automático
- **Min Length**: 8 caracteres
- **Max Length**: 128 caracteres
- **Strength**: Validação de força (implementar no frontend)

## 📊 Database Schema

### Users Table

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  image TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Sessions Table

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  expires_at TIMESTAMP NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  active_organization_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### User Roles Table (Extensão)

```sql
CREATE TABLE user_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  tenant_id TEXT,  -- NULL = global role
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🧪 Testing

### Test Auth Flow

```typescript
// Sign up
const signUpRes = await fetch('http://localhost:3000/api/auth/sign-up/email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'TestPass123',
    name: 'Test User',
  }),
});

// Sign in
const signInRes = await fetch('http://localhost:3000/api/auth/sign-in/email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Important: include cookies
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'TestPass123',
  }),
});

// Get session
const sessionRes = await fetch('http://localhost:3000/api/auth/session', {
  credentials: 'include', // Include session cookie
});
```

## 📚 Recursos

- **Better-Auth Docs**: https://www.better-auth.com/docs
- **Better-Auth + Drizzle**: https://www.better-auth.com/docs/integrations/drizzle
- **Better-Auth API Reference**: https://www.better-auth.com/docs/concepts/api-reference
- **Elysia Documentation**: https://elysiajs.com

## 🔧 Troubleshooting

### Error: Database connection failed
```bash
# Verificar se PostgreSQL está rodando
pg_isready

# Verificar DATABASE_URL no .env
echo $DATABASE_URL
```

### Error: Session not found
```bash
# Verificar se cookies estão sendo enviados
# Frontend deve usar credentials: 'include'
```

### Error: Email not sent
```bash
# Implementar função de envio de email em auth.config.ts
# Configurar SMTP no .env
```

---

**BotCriptoFy2** | Auth Module v1.0.0 (Better-Auth)
