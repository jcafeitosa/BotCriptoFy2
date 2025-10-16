# 🔐 Better-Auth Integration Guide

Guia completo de integração do Better-Auth no BotCriptoFy2.

## ✅ Backend - Status: COMPLETO

### 📦 Estrutura Implementada

```
backend/src/
├── db/
│   ├── connection.ts          ✅ PostgreSQL + Drizzle connection
│   └── index.ts               ✅ Database exports
├── modules/auth/
│   ├── schema/
│   │   └── auth.schema.ts     ✅ 8 tabelas Better-Auth
│   ├── types/
│   │   └── auth.types.ts      ✅ TypeScript types + enums
│   ├── services/
│   │   └── auth.config.ts     ✅ Better-Auth configuration
│   ├── routes/
│   │   └── auth.routes.ts     ✅ Auth API routes
│   ├── middleware/
│   │   ├── session.middleware.ts  ✅ Session guards
│   │   └── guards.ts          ✅ Backward compatibility
│   ├── index.ts               ✅ Barrel exports
│   └── README.md              ✅ Complete documentation
├── index.ts                   ✅ Integrado com Better-Auth
└── tsconfig.json              ✅ Path aliases configurados
```

### 🗄️ Database Schema

**8 Tabelas Criadas:**
1. `users` - Usuários
2. `sessions` - Sessões ativas
3. `accounts` - Contas OAuth
4. `verifications` - Tokens de verificação
5. `two_factor` - Autenticação 2FA
6. `user_roles` - Roles por tenant
7. `passkeys` - WebAuthn credentials

### 🔌 Rotas Disponíveis

**Better-Auth (Auto-generated):**
- `POST /api/auth/sign-up/email`
- `POST /api/auth/sign-in/email`
- `POST /api/auth/sign-out`
- `GET /api/auth/session`
- `POST /api/auth/verify-email`
- `POST /api/auth/forget-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/update-user`
- `POST /api/auth/change-password`

**Custom Endpoints:**
- `GET /api/auth/me` - Get current user
- `GET /api/auth/status` - Auth status (non-failing)

### 🛡️ Guards Disponíveis

```typescript
import {
  sessionGuard,        // Require authentication
  optionalSessionGuard, // Optional authentication
  requireRole,         // Require specific role
  requireVerifiedEmail, // Require verified email
  requireTenant,       // Require tenant membership
} from '@/modules/auth';

// Uso
app
  .use(sessionGuard)
  .get('/protected', ({ user, session }) => {
    return { user };
  });
```

---

## 🚀 Setup do Backend

### 1. Gerar e Aplicar Migrations

```bash
cd backend

# Gerar migrations
bun run db:generate

# Aplicar migrations
bun run db:migrate

# Verificar tabelas (opcional)
bun run db:studio
```

### 2. Configurar .env

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/botcriptofy2

# Frontend URL (para CORS)
FRONTEND_URL=http://localhost:4321

# Better-Auth (opcional)
NODE_ENV=development

# Email (para verificação - implementar depois)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=noreply@botcriptofy.com
# SMTP_PASSWORD=your-password
```

### 3. Iniciar Servidor

```bash
bun run dev
```

Servidor deve iniciar em `http://localhost:3000` com:
- ✅ Health check: `http://localhost:3000`
- ✅ API Docs: `http://localhost:3000/swagger`
- ✅ Auth endpoints: `http://localhost:3000/api/auth/*`

---

## 🎨 Frontend Integration

### 1. Verificar Configuração Existente

O Better-Auth client já está configurado no frontend:

```typescript
// frontend/src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: "http://localhost:3000",
  fetchOptions: {
    credentials: "include", // ✅ Importante para cookies
  },
});
```

### 2. Usar em Componentes React

```tsx
// frontend/src/components/LoginForm.tsx
import { authClient } from '@/lib/auth-client';
import { useState } from 'react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const { data, error: authError } = await authClient.signIn.email({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      // Redirect after login
      window.location.href = '/dashboard';
    } catch (err) {
      setError('Login failed');
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <p className="error">{error}</p>}
      <button type="submit">Login</button>
    </form>
  );
}
```

### 3. Usar Hook useSession

```tsx
// frontend/src/components/UserProfile.tsx
import { authClient } from '@/lib/auth-client';

export function UserProfile() {
  // Hook Better-Auth
  const { data: session, error, isPending } = authClient.useSession();

  if (isPending) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!session) return <div>Not authenticated</div>;

  return (
    <div>
      <h2>Welcome, {session.user.name}!</h2>
      <p>Email: {session.user.email}</p>
      <p>Verified: {session.user.emailVerified ? 'Yes' : 'No'}</p>

      <button onClick={() => authClient.signOut()}>
        Logout
      </button>
    </div>
  );
}
```

### 4. Proteger Páginas Astro (SSR)

```tsx
// frontend/src/pages/dashboard.astro
---
import Layout from '@/layouts/Layout.astro';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';

// Verificar sessão no servidor
const response = await fetch(`${API_URL}/api/auth/session`, {
  headers: Astro.request.headers,
  credentials: 'include',
});

if (!response.ok) {
  // Not authenticated - redirect to login
  return Astro.redirect('/login');
}

const session = await response.json();
---

<Layout title="Dashboard">
  <h1>Welcome, {session.user.name}!</h1>
  <!-- Dashboard content -->
</Layout>
```

### 5. Middleware Astro (Protect Multiple Routes)

```typescript
// frontend/src/middleware/index.ts
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Páginas protegidas
  const protectedRoutes = ['/dashboard', '/settings', '/profile'];

  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';

    const response = await fetch(`${API_URL}/api/auth/session`, {
      headers: context.request.headers,
      credentials: 'include',
    });

    if (!response.ok) {
      return context.redirect('/login');
    }

    // Adicionar session ao contexto local
    const session = await response.json();
    context.locals.user = session.user;
    context.locals.session = session.session;
  }

  return next();
});
```

### 6. API Calls Autenticadas

```typescript
// frontend/src/lib/api-client.ts
const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';

export const apiClient = {
  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      credentials: 'include', // ✅ Importante para enviar cookies
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  },

  async post<T>(path: string, body: any): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // ✅ Importante
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  },
};

// Uso
const users = await apiClient.get('/api/v1/users');
```

---

## 🧪 Testing

### Test Auth Flow

```typescript
// 1. Sign Up
const signUpResponse = await fetch('http://localhost:3000/api/auth/sign-up/email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'SecurePass123',
    name: 'Test User',
  }),
});

console.log('Sign up:', await signUpResponse.json());

// 2. Sign In
const signInResponse = await fetch('http://localhost:3000/api/auth/sign-in/email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'SecurePass123',
  }),
});

console.log('Sign in:', await signInResponse.json());

// 3. Get Session
const sessionResponse = await fetch('http://localhost:3000/api/auth/session', {
  credentials: 'include',
});

console.log('Session:', await sessionResponse.json());

// 4. Sign Out
const signOutResponse = await fetch('http://localhost:3000/api/auth/sign-out', {
  method: 'POST',
  credentials: 'include',
});

console.log('Sign out:', await signOutResponse.json());
```

---

## 📋 Checklist Final

### Backend
- [x] Database connection configurada
- [x] Schemas Drizzle criados
- [x] Better-Auth configurado
- [x] Rotas de auth implementadas
- [x] Middleware de sessão implementado
- [x] Guards implementados
- [x] Types exportados
- [x] Documentação completa

### Próximos Passos
- [ ] Gerar migrations (`bun run db:generate`)
- [ ] Aplicar migrations (`bun run db:migrate`)
- [ ] Testar signup/signin/signout
- [ ] Implementar envio de email (verificação)
- [ ] Testar protecção de rotas
- [ ] Implementar 2FA (opcional)
- [ ] Implementar social login (opcional)

### Frontend
- [x] Better-Auth client configurado
- [ ] Criar componentes de Login/Register
- [ ] Criar hook personalizado useAuth
- [ ] Implementar middleware de proteção
- [ ] Testar fluxo completo
- [ ] Error handling
- [ ] Loading states
- [ ] Redirect after login

---

## 🚨 Troubleshooting

### Erro: Cannot find module '@/db'

**Solução**: O Bun pode não estar resolvendo o path alias. Use import relativo temporariamente:

```typescript
// Em vez de:
import { db } from '@/db';

// Use:
import { db } from '../../../db';
```

Ou configure `bunfig.toml`:

```toml
# backend/bunfig.toml
[resolve]
paths = {
  "@/*" = "./src/*"
}
```

### Erro: Session cookie not found

**Causa**: Frontend não está enviando credentials.

**Solução**: Sempre use `credentials: 'include'` em todas as chamadas fetch:

```typescript
fetch(url, {
  credentials: 'include', // ✅ Required
});
```

### Erro: CORS policy blocked

**Causa**: CORS não configurado corretamente.

**Solução**: Verificar `FRONTEND_URL` no .env e CORS no index.ts:

```typescript
cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4321',
  credentials: true, // ✅ Required
})
```

---

## 📚 Recursos

- **Better-Auth Docs**: https://www.better-auth.com/docs
- **Better-Auth + Elysia**: https://www.better-auth.com/docs/integrations/elysia
- **Better-Auth + Drizzle**: https://www.better-auth.com/docs/integrations/drizzle
- **Better-Auth React**: https://www.better-auth.com/docs/integrations/react
- **Elysia Documentation**: https://elysiajs.com

---

**BotCriptoFy2** | Better-Auth Integration v1.0.0
**Status**: ✅ Backend Completo | Frontend Pronto para Integração
