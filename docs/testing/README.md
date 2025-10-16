# Testing & QA - BotCriptoFy2

## 🧪 Visão Geral

Este documento descreve a estratégia completa de testes e QA para o BotCriptoFy2, incluindo testes unitários, integração, E2E, performance e segurança.

## 📋 Estratégia de Testes

### Pirâmide de Testes
- **Testes Unitários**: 70% - Testes rápidos e isolados
- **Testes de Integração**: 20% - Testes de componentes integrados
- **Testes E2E**: 10% - Testes de fluxos completos

### Tipos de Testes
- **Unitários**: Funções e componentes individuais
- **Integração**: APIs e serviços integrados
- **E2E**: Fluxos completos do usuário
- **Performance**: Carga e stress testing
- **Segurança**: Vulnerabilidades e compliance
- **Acessibilidade**: WCAG 2.1 AA compliance

## 🛠️ Stack de Testes

### Backend (Elysia)
- **Framework**: Bun Test
- **Assertions**: Bun built-in assertions
- **Mocks**: Mock Service Worker
- **Coverage**: c8
- **API Testing**: Supertest

### Frontend (Astro)
- **Framework**: Vitest
- **Component Testing**: Testing Library
- **E2E**: Playwright
- **Coverage**: c8
- **Visual Testing**: Chromatic

### Infraestrutura
- **Database**: Testcontainers
- **Redis**: Redis Test Server
- **External APIs**: Wiremock
- **Load Testing**: Artillery

## 🏗️ Estrutura de Testes

```
tests/
├── unit/                   # Testes unitários
│   ├── backend/           # Backend unit tests
│   ├── frontend/          # Frontend unit tests
│   └── shared/            # Shared utilities
├── integration/           # Testes de integração
│   ├── api/              # API integration tests
│   ├── database/         # Database tests
│   └── external/         # External services
├── e2e/                  # Testes end-to-end
│   ├── user-flows/       # User journey tests
│   ├── admin-flows/      # Admin journey tests
│   └── api-flows/        # API workflow tests
├── performance/          # Testes de performance
│   ├── load/             # Load testing
│   ├── stress/           # Stress testing
│   └── volume/           # Volume testing
├── security/             # Testes de segurança
│   ├── auth/             # Authentication tests
│   ├── authorization/    # Authorization tests
│   └── vulnerabilities/  # Security scans
├── fixtures/             # Dados de teste
├── helpers/              # Utilitários de teste
└── config/               # Configurações de teste
```

## 🔧 Configuração de Testes

### 1. Backend - Bun Test

```typescript
// backend/tests/setup.ts
import { beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

let prisma: PrismaClient;
let redis: Redis;

beforeAll(async () => {
  // Setup database
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL,
      },
    },
  });

  // Setup Redis
  redis = new Redis(process.env.TEST_REDIS_URL);

  // Run migrations
  await prisma.$executeRaw`CREATE SCHEMA IF NOT EXISTS test`;
  await prisma.$executeRaw`SET search_path TO test`;
});

afterAll(async () => {
  // Cleanup
  await prisma.$disconnect();
  await redis.disconnect();
});

beforeEach(async () => {
  // Clean database before each test
  await prisma.$executeRaw`TRUNCATE TABLE users, tenants, departments CASCADE`;
});

export { prisma, redis };
```

### 2. Frontend - Vitest

```typescript
// frontend/vitest.config.ts
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
```

### 3. E2E - Playwright

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: [
    {
      command: 'bun run dev',
      port: 3000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'bun run dev',
      port: 4321,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
```

## 🧪 Testes Unitários

### 1. Backend - Exemplo

```typescript
// backend/tests/unit/services/user.service.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { UserService } from '../../src/services/user.service';
import { prisma } from '../setup';

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService(prisma);
  });

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
      };

      const user = await userService.createUser(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(user.id).toBeDefined();
    });

    it('should throw error for duplicate email', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
      };

      await userService.createUser(userData);

      await expect(userService.createUser(userData))
        .rejects
        .toThrow('User with this email already exists');
    });
  });

  describe('getUserById', () => {
    it('should return user by id', async () => {
      const user = await userService.createUser({
        email: 'test@example.com',
        name: 'Test User',
      });

      const foundUser = await userService.getUserById(user.id);

      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(user.id);
    });

    it('should return null for non-existent user', async () => {
      const foundUser = await userService.getUserById('non-existent-id');

      expect(foundUser).toBeNull();
    });
  });
});
```

### 2. Frontend - Exemplo

```typescript
// frontend/tests/unit/components/UserCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserCard } from '@/components/UserCard';

describe('UserCard', () => {
  it('should render user information', () => {
    const user = {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      avatar: 'https://example.com/avatar.jpg',
    };

    render(<UserCard user={user} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', user.avatar);
  });

  it('should handle missing avatar', () => {
    const user = {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
    };

    render(<UserCard user={user} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByTestId('default-avatar')).toBeInTheDocument();
  });
});
```

## 🔗 Testes de Integração

### 1. API Integration

```typescript
// tests/integration/api/auth.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Elysia } from 'elysia';
import { app } from '../../src/app';
import { prisma } from '../setup';

describe('Auth API', () => {
  beforeAll(async () => {
    // Setup test data
    await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.deleteMany();
  });

  describe('POST /api/auth/login', () => {
    it('should login user successfully', async () => {
      const response = await app.handle(
        new Request('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
          }),
        })
      );

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('token');
      expect(data).toHaveProperty('user');
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await app.handle(
        new Request('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'wrongpassword',
          }),
        })
      );

      expect(response.status).toBe(401);
    });
  });
});
```

### 2. Database Integration

```typescript
// tests/integration/database/user.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { prisma } from '../setup';

describe('User Database Operations', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  it('should create user with tenant', async () => {
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Test Tenant',
        slug: 'test-tenant',
        type: 'empresa',
      },
    });

    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        tenants: {
          create: {
            tenantId: tenant.id,
            role: 'admin',
          },
        },
      },
      include: {
        tenants: true,
      },
    });

    expect(user).toBeDefined();
    expect(user.tenants).toHaveLength(1);
    expect(user.tenants[0].tenantId).toBe(tenant.id);
  });

  it('should handle cascade delete', async () => {
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Test Tenant',
        slug: 'test-tenant',
        type: 'empresa',
      },
    });

    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        tenants: {
          create: {
            tenantId: tenant.id,
            role: 'admin',
          },
        },
      },
    });

    await prisma.tenant.delete({
      where: { id: tenant.id },
    });

    const userAfterDelete = await prisma.user.findUnique({
      where: { id: user.id },
      include: { tenants: true },
    });

    expect(userAfterDelete?.tenants).toHaveLength(0);
  });
});
```

## 🎭 Testes E2E

### 1. User Journey

```typescript
// tests/e2e/user-flows/registration.test.ts
import { test, expect } from '@playwright/test';

test.describe('User Registration Flow', () => {
  test('should complete user registration', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/auth/register');

    // Fill registration form
    await page.fill('[data-testid="name-input"]', 'John Doe');
    await page.fill('[data-testid="email-input"]', 'john@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.fill('[data-testid="confirm-password-input"]', 'password123');

    // Submit form
    await page.click('[data-testid="register-button"]');

    // Wait for success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText(
      'Registration successful'
    );

    // Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test('should show validation errors', async ({ page }) => {
    await page.goto('/auth/register');

    // Submit empty form
    await page.click('[data-testid="register-button"]');

    // Check validation errors
    await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
  });
});
```

### 2. Admin Journey

```typescript
// tests/e2e/admin-flows/dashboard.test.ts
import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/auth/login');
    await page.fill('[data-testid="email-input"]', 'admin@botcriptofy2.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/admin/dashboard');
  });

  test('should display dashboard metrics', async ({ page }) => {
    // Check metrics cards
    await expect(page.locator('[data-testid="total-users"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-revenue"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-subscriptions"]')).toBeVisible();

    // Check charts
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="users-chart"]')).toBeVisible();
  });

  test('should navigate to departments', async ({ page }) => {
    // Click on Financeiro department
    await page.click('[data-testid="financeiro-department"]');

    // Verify navigation
    await expect(page).toHaveURL('/admin/departments/financeiro');
    await expect(page.locator('[data-testid="department-title"]')).toContainText('Financeiro');
  });
});
```

## ⚡ Testes de Performance

### 1. Load Testing

```yaml
# tests/performance/load/load-test.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: '2m'
      arrivalRate: 10
      name: 'Warm up'
    - duration: '5m'
      arrivalRate: 50
      name: 'Ramp up load'
    - duration: '10m'
      arrivalRate: 100
      name: 'Sustained load'
    - duration: '2m'
      arrivalRate: 200
      name: 'Spike test'
    - duration: '5m'
      arrivalRate: 0
      name: 'Ramp down'

scenarios:
  - name: 'API Load Test'
    weight: 70
    flow:
      - get:
          url: '/api/health'
      - post:
          url: '/api/auth/login'
          json:
            email: 'test@example.com'
            password: 'password123'
      - get:
          url: '/api/users/profile'
          headers:
            Authorization: 'Bearer {{ token }}'

  - name: 'Frontend Load Test'
    weight: 30
    flow:
      - get:
          url: '/'
      - get:
          url: '/dashboard'
      - get:
          url: '/admin'
```

### 2. Stress Testing

```typescript
// tests/performance/stress/stress.test.ts
import { test, expect } from '@playwright/test';

test.describe('Stress Testing', () => {
  test('should handle high concurrent users', async ({ browser }) => {
    const contexts = [];
    const pages = [];

    // Create multiple browser contexts
    for (let i = 0; i < 50; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      contexts.push(context);
      pages.push(page);
    }

    // Navigate all pages simultaneously
    const promises = pages.map(page => page.goto('/'));
    await Promise.all(promises);

    // Verify all pages loaded successfully
    for (const page of pages) {
      await expect(page.locator('body')).toBeVisible();
    }

    // Cleanup
    for (const context of contexts) {
      await context.close();
    }
  });
});
```

## 🔒 Testes de Segurança

### 1. Authentication Tests

```typescript
// tests/security/auth/auth.test.ts
import { describe, it, expect } from 'bun:test';
import { app } from '../../../src/app';

describe('Security - Authentication', () => {
  it('should prevent SQL injection in login', async () => {
    const maliciousInput = "'; DROP TABLE users; --";
    
    const response = await app.handle(
      new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: maliciousInput,
          password: 'password123',
        }),
      })
    );

    expect(response.status).toBe(400);
  });

  it('should rate limit login attempts', async () => {
    const promises = [];
    
    // Make 10 rapid login attempts
    for (let i = 0; i < 10; i++) {
      promises.push(
        app.handle(
          new Request('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: 'test@example.com',
              password: 'wrongpassword',
            }),
          })
        )
      );
    }

    const responses = await Promise.all(promises);
    
    // Should have rate limiting after 5 attempts
    const rateLimitedResponses = responses.filter(r => r.status === 429);
    expect(rateLimitedResponses.length).toBeGreaterThan(0);
  });
});
```

### 2. Authorization Tests

```typescript
// tests/security/authorization/authorization.test.ts
import { describe, it, expect } from 'bun:test';
import { app } from '../../../src/app';

describe('Security - Authorization', () => {
  it('should prevent unauthorized access to admin routes', async () => {
    const response = await app.handle(
      new Request('http://localhost:3000/api/admin/users', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid-token',
        },
      })
    );

    expect(response.status).toBe(401);
  });

  it('should prevent privilege escalation', async () => {
    // Login as regular user
    const loginResponse = await app.handle(
      new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'password123',
        }),
      })
    );

    const { token } = await loginResponse.json();

    // Try to access admin route
    const adminResponse = await app.handle(
      new Request('http://localhost:3000/api/admin/users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
    );

    expect(adminResponse.status).toBe(403);
  });
});
```

## 📊 Coverage e Relatórios

### 1. Coverage Configuration

```json
// package.json
{
  "scripts": {
    "test": "bun test",
    "test:unit": "bun test tests/unit",
    "test:integration": "bun test tests/integration",
    "test:e2e": "playwright test",
    "test:coverage": "bun test --coverage",
    "test:watch": "bun test --watch",
    "test:ci": "bun test --coverage --reporter=json"
  }
}
```

### 2. Coverage Thresholds

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        './src/services/': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
    },
  },
});
```

## 🚀 CI/CD Integration

### 1. GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
      with:
        bun-version: latest
    
    - name: Install dependencies
      run: bun install
    
    - name: Run unit tests
      run: bun test tests/unit --coverage
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: timescale/timescaledb:16.0-pg16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7.2-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
    
    - name: Install dependencies
      run: bun install
    
    - name: Run integration tests
      run: bun test tests/integration
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
        REDIS_URL: redis://localhost:6379

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Bun
      uses: oven-sh/setup-bun@v1
    
    - name: Install dependencies
      run: bun install
    
    - name: Install Playwright
      run: bunx playwright install --with-deps
    
    - name: Build application
      run: |
        cd backend && bun run build
        cd ../frontend && bun run build
    
    - name: Run E2E tests
      run: bunx playwright test
      env:
        CI: true
```

## 📋 Checklist de QA

### ✅ Testes Unitários
- [ ] Cobertura > 80%
- [ ] Todos os serviços testados
- [ ] Utilitários testados
- [ ] Validações testadas
- [ ] Tratamento de erros testado

### ✅ Testes de Integração
- [ ] APIs testadas
- [ ] Banco de dados testado
- [ ] Redis testado
- [ ] Serviços externos testados
- [ ] Webhooks testados

### ✅ Testes E2E
- [ ] Fluxos de usuário testados
- [ ] Fluxos de admin testados
- [ ] Responsividade testada
- [ ] Acessibilidade testada
- [ ] Cross-browser testado

### ✅ Testes de Performance
- [ ] Load testing executado
- [ ] Stress testing executado
- [ ] Memory leaks verificados
- [ ] Response times validados
- [ ] Throughput validado

### ✅ Testes de Segurança
- [ ] Autenticação testada
- [ ] Autorização testada
- [ ] SQL injection testado
- [ ] XSS testado
- [ ] CSRF testado
- [ ] Rate limiting testado

## 🚨 Troubleshooting

### Problemas Comuns

#### 1. Testes Flaky
```bash
# Verificar logs detalhados
bun test --verbose

# Executar testes em modo watch
bun test --watch

# Verificar timeouts
bun test --timeout 10000
```

#### 2. Problemas de Database
```bash
# Verificar conexão
bun test tests/integration/database/connection.test.ts

# Limpar dados de teste
bun run test:cleanup
```

#### 3. Problemas de E2E
```bash
# Executar em modo debug
bunx playwright test --debug

# Verificar screenshots
ls tests/e2e/results/
```

## 📞 Suporte

Para problemas de testes:
1. Verificar logs: `bun test --verbose`
2. Executar testes específicos: `bun test tests/unit/services/`
3. Verificar cobertura: `bun test --coverage`
4. Contatar equipe de QA

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO