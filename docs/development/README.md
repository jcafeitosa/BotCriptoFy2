# Guia de Desenvolvimento - BotCriptoFy2

## 🚀 Início Rápido

### Pré-requisitos

- **Bun**: >= 1.0.0
- **Node.js**: >= 18.0.0
- **TimescaleDB**: >= 16.0
- **Redis**: >= 7.2
- **Ollama**: Com modelo Qwen3:0.6b
- **Git**: >= 2.30.0

### Instalação

```bash
# Clone o repositório
git clone https://github.com/your-org/botcriptofy2.git
cd botcriptofy2

# Instale dependências do backend
cd backend
bun install

# Instale dependências do frontend
cd ../frontend
bun install

# Configure variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

### Configuração do Ambiente

```bash
# Backend
cd backend
bun run db:generate  # Gerar migrações
bun run db:migrate   # Executar migrações
bun run dev          # Iniciar servidor de desenvolvimento

# Frontend
cd frontend
bun run dev          # Iniciar servidor de desenvolvimento
```

## 🏗️ Estrutura do Projeto

```
BotCriptoFy2/
├── backend/                 # Backend Elysia
│   ├── src/
│   │   ├── auth/           # Better-Auth config
│   │   ├── admin/          # Módulos administrativos
│   │   ├── agents/         # Agentes Mastra.ai
│   │   ├── communication/  # Telegram integration
│   │   ├── database/       # Drizzle ORM
│   │   ├── api/            # API routes
│   │   ├── cache/          # Redis cache
│   │   ├── utils/          # Utilities
│   │   └── scalar/         # API docs
│   ├── tests/              # Testes
│   ├── docs/               # Documentação
│   └── package.json
├── frontend/               # Frontend Astro
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── pages/          # Páginas Astro
│   │   └── layouts/        # Layouts
│   ├── public/             # Assets estáticos
│   └── package.json
├── docs/                   # Documentação
├── .github/workflows/      # CI/CD
├── docker-compose.yml      # Docker
└── README.md
```

## 🛠️ Stack Tecnológica

### Backend
- **Elysia**: Framework web rápido
- **Bun**: Runtime JavaScript
- **Better-Auth**: Autenticação e autorização
- **TimescaleDB**: Banco de dados temporal
- **Drizzle ORM**: ORM TypeScript
- **Redis**: Cache e sessões
- **Mastra.ai**: Framework de agentes
- **Ollama**: LLM local
- **Stripe**: Pagamentos
- **Telegram Bot API**: Comunicação

### Frontend
- **Astro**: Framework web
- **Tailwind CSS**: Styling
- **Chart.js**: Gráficos
- **Zustand**: Gerenciamento de estado
- **TypeScript**: Tipagem estática

## 🔧 Configuração

### Variáveis de Ambiente

```env
# Database
TIMESCALEDB_URL=postgresql://user:password@localhost:5432/botcriptofy2
REDIS_URL=redis://localhost:6379

# Better-Auth
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=http://localhost:3000

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:0.6b

# Mastra.ai
MASTRA_API_KEY=your-mastra-key
MASTRA_WEBHOOK_URL=https://api.botcriptofy2.com/webhooks/mastra

# API
API_URL=http://localhost:3000
NODE_ENV=development
```

### Configuração do Banco de Dados

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/database/schema/*',
  out: './src/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.TIMESCALEDB_URL!,
  },
  verbose: true,
  strict: true,
});
```

### Configuração do Redis

```typescript
// src/cache/redis.ts
import { createClient } from 'redis';

export const redis = createClient({
  url: process.env.REDIS_URL,
});

await redis.connect();
```

## 🧪 Testes

### Configuração de Testes

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
});
```

### Executar Testes

```bash
# Testes unitários
bun run test

# Testes com coverage
bun run test:coverage

# Testes E2E
bun run test:e2e

# Testes específicos
bun test src/agents/ceo/
```

### Exemplo de Teste

```typescript
// tests/agents/ceo.test.ts
import { describe, it, expect } from 'vitest';
import { CEOAgent } from '../../src/agents/ceo/agent';

describe('CEO Agent', () => {
  it('should analyze performance correctly', async () => {
    const agent = new CEOAgent();
    const result = await agent.analyzePerformance();
    
    expect(result).toHaveProperty('metrics');
    expect(result.metrics).toHaveProperty('totalUsers');
  });
});
```

## 📝 Padrões de Código

### TypeScript

```typescript
// Use interfaces para tipos
interface User {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string;
}

// Use enums para constantes
enum UserRole {
  CEO = 'ceo',
  ADMIN = 'admin',
  FUNCIONARIO = 'funcionario',
  TRADER = 'trader',
  INFLUENCER = 'influencer'
}

// Use tipos para unions
type DepartmentCode = 'FIN' | 'MKT' | 'VND' | 'SEG' | 'SAC' | 'AUD' | 'DOC' | 'CFG' | 'ASS';
```

### Elysia Routes

```typescript
// src/api/routes/users.ts
import { Elysia } from 'elysia';
import { z } from 'zod';

const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(['admin', 'funcionario']),
  departmentId: z.string().uuid()
});

export const usersRoutes = new Elysia()
  .get('/users', async ({ query }) => {
    // Listar usuários
  })
  .post('/users', async ({ body }) => {
    // Criar usuário
  }, {
    body: userSchema
  });
```

### Drizzle ORM

```typescript
// src/database/schema/users.ts
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

## 🤖 Desenvolvimento de Agentes

### Estrutura de Agente

```typescript
// src/agents/ceo/agent.ts
import { Agent } from '@mastra/core';

export class CEOAgent extends Agent {
  constructor() {
    super({
      name: 'CEO Agent',
      description: 'Agente CEO para coordenação geral',
      model: 'qwen3:0.6b',
      capabilities: ['coordination', 'decision_making', 'reporting']
    });
  }

  async analyzePerformance(): Promise<PerformanceAnalysis> {
    // Implementar análise de performance
  }

  async generateReport(): Promise<ExecutiveReport> {
    // Implementar geração de relatório
  }
}
```

### Configuração do Mastra.ai

```typescript
// src/agents/mastra.config.ts
import { Mastra } from '@mastra/core';
import { Ollama } from '@mastra/ollama';

export const mastra = new Mastra({
  name: 'BotCriptoFy2',
  llm: {
    provider: 'ollama',
    model: 'qwen3:0.6b',
    config: {
      baseURL: process.env.OLLAMA_BASE_URL,
      temperature: 0.7,
      maxTokens: 2048,
    },
  },
  agents: {
    ceo: CEOAgent,
    financeiro: FinanceiroAgent,
    // ... outros agentes
  },
});
```

## 🔄 CI/CD

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run test
      - run: bun run test:coverage
```

### Docker

```dockerfile
# Dockerfile
FROM oven/bun:1.0.0

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install

COPY . .

EXPOSE 3000

CMD ["bun", "run", "dev"]
```

## 📊 Monitoramento

### Logs

```typescript
// src/utils/logger.ts
import { createLogger, format, transports } from 'winston';

export const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
  ],
});
```

### Métricas

```typescript
// src/utils/metrics.ts
import { register, Counter, Histogram } from 'prom-client';

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route']
});
```

## 🚀 Deploy

### Desenvolvimento

```bash
# Backend
cd backend
bun run dev

# Frontend
cd frontend
bun run dev
```

### Staging

```bash
# Build
bun run build

# Deploy
docker-compose -f docker-compose.staging.yml up -d
```

### Produção

```bash
# Build
bun run build

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

## 🔧 Debugging

### Backend

```bash
# Debug com logs
DEBUG=* bun run dev

# Debug específico
DEBUG=elysia:* bun run dev
```

### Frontend

```bash
# Debug com logs
DEBUG=astro:* bun run dev
```

### Banco de Dados

```bash
# Conectar ao banco
psql $TIMESCALEDB_URL

# Ver logs
tail -f logs/database.log
```

## 📚 Recursos Adicionais

### Documentação
- [Elysia Docs](https://elysiajs.com/)
- [Better-Auth Docs](https://www.better-auth.com/)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Mastra.ai Docs](https://mastra.ai/)
- [Astro Docs](https://docs.astro.build/)

### Comunidade
- [Discord](https://discord.gg/botcriptofy2)
- [GitHub Discussions](https://github.com/your-org/botcriptofy2/discussions)
- [Telegram](https://t.me/BotCriptoFy2)

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO