# Environment Setup - BotCriptoFy2

## 🚀 Visão Geral

Este documento fornece instruções completas para configurar o ambiente de desenvolvimento, staging e produção do BotCriptoFy2.

## 📋 Pré-requisitos

### Software Necessário
- **Node.js**: v20.0.0 ou superior
- **Bun**: v1.0.0 ou superior
- **Docker**: v24.0.0 ou superior
- **Docker Compose**: v2.20.0 ou superior
- **Git**: v2.40.0 ou superior

### Serviços Externos
- **TimescaleDB**: v16.0 ou superior
- **Redis**: v7.2 ou superior
- **Stripe**: Conta ativa
- **Telegram Bot**: Token e Chat ID
- **Ollama**: v0.1.0 ou superior

## 🏗️ Estrutura do Projeto

```
BotCriptoFy2/
├── backend/                 # Backend Elysia
├── frontend/               # Frontend Astro
├── docs/                   # Documentação
├── docker/                 # Configurações Docker
├── scripts/                # Scripts de automação
├── .env.example           # Exemplo de variáveis
├── docker-compose.yml     # Docker Compose
├── package.json           # Dependências raiz
└── README.md              # Documentação principal
```

## 🔧 Configuração do Ambiente

### 1. Clone do Repositório

```bash
# Clone o repositório
git clone https://github.com/your-org/BotCriptoFy2.git
cd BotCriptoFy2

# Instale dependências raiz
bun install
```

### 2. Configuração do Backend

```bash
# Navegue para o backend
cd backend

# Instale dependências
bun install

# Copie o arquivo de exemplo
cp .env.example .env

# Configure as variáveis de ambiente
nano .env
```

### 3. Configuração do Frontend

```bash
# Navegue para o frontend
cd frontend

# Instale dependências
bun install

# Copie o arquivo de exemplo
cp .env.example .env

# Configure as variáveis de ambiente
nano .env
```

## 📝 Variáveis de Ambiente

### Backend (.env)

```env
# ===========================================
# CONFIGURAÇÕES GERAIS
# ===========================================
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000
FRONTEND_URL=http://localhost:4321

# ===========================================
# BANCO DE DADOS
# ===========================================
DATABASE_URL=postgresql://username:password@localhost:5432/botcriptofy2
TIMESCALE_URL=postgresql://username:password@localhost:5432/botcriptofy2
DB_HOST=localhost
DB_PORT=5432
DB_NAME=botcriptofy2
DB_USER=username
DB_PASSWORD=password
DB_SSL=false

# ===========================================
# REDIS
# ===========================================
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# ===========================================
# AUTENTICAÇÃO (Better-Auth)
# ===========================================
BETTER_AUTH_SECRET=your-super-secret-key-here
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:4321,http://localhost:3000

# ===========================================
# STRIPE
# ===========================================
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_WEBHOOK_ENDPOINT=http://localhost:3000/api/webhooks/stripe

# ===========================================
# TELEGRAM
# ===========================================
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=-1001234567890

# ===========================================
# OLLAMA
# ===========================================
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:0.6b
OLLAMA_TIMEOUT=30000

# ===========================================
# MASTRA.AI
# ===========================================
MASTRA_API_KEY=your-mastra-api-key
MASTRA_BASE_URL=https://api.mastra.ai
MASTRA_AGENT_ID=your-agent-id

# ===========================================
# EMAIL (SMTP)
# ===========================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=BotCriptoFy2 <noreply@botcriptofy2.com>

# ===========================================
# SMS (Twilio)
# ===========================================
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# ===========================================
# PUSH NOTIFICATIONS (Firebase)
# ===========================================
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@your-project-id.iam.gserviceaccount.com

# ===========================================
# WEBHOOKS
# ===========================================
WEBHOOK_SECRET=your-webhook-secret
WEBHOOK_TIMEOUT=30000

# ===========================================
# CACHE
# ===========================================
CACHE_TTL=3600
CACHE_MAX_SIZE=1000

# ===========================================
# RATE LIMITING
# ===========================================
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# ===========================================
# LOGGING
# ===========================================
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE=logs/app.log

# ===========================================
# MONITORING
# ===========================================
SENTRY_DSN=https://...
NEW_RELIC_LICENSE_KEY=...
DATADOG_API_KEY=...

# ===========================================
# SECURITY
# ===========================================
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key
CORS_ORIGINS=http://localhost:4321,http://localhost:3000

# ===========================================
# FILE STORAGE
# ===========================================
STORAGE_TYPE=local
STORAGE_PATH=./storage
STORAGE_URL=http://localhost:3000/storage

# ===========================================
# BACKUP
# ===========================================
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
BACKUP_PATH=./backups

# ===========================================
# DEVELOPMENT
# ===========================================
DEBUG=true
HOT_RELOAD=true
MOCK_EXTERNAL_SERVICES=false
```

### Frontend (.env)

```env
# ===========================================
# CONFIGURAÇÕES GERAIS
# ===========================================
NODE_ENV=development
PORT=4321
PUBLIC_API_URL=http://localhost:3000
PUBLIC_APP_URL=http://localhost:4321

# ===========================================
# STRIPE (Frontend)
# ===========================================
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# ===========================================
# ANALYTICS
# ===========================================
PUBLIC_GA_TRACKING_ID=G-...
PUBLIC_GTM_ID=GTM-...

# ===========================================
# FEATURES
# ===========================================
PUBLIC_ENABLE_ANALYTICS=true
PUBLIC_ENABLE_DEBUG=true
PUBLIC_ENABLE_PWA=false

# ===========================================
# THEME
# ===========================================
PUBLIC_THEME=light
PUBLIC_PRIMARY_COLOR=#3B82F6
PUBLIC_SECONDARY_COLOR=#10B981
```

## 🐳 Configuração com Docker

### 1. Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  # TimescaleDB
  timescaledb:
    image: timescale/timescaledb:16.0-pg16
    container_name: botcriptofy2-timescaledb
    environment:
      POSTGRES_DB: botcriptofy2
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - timescaledb_data:/var/lib/postgresql/data
      - ./docker/timescaledb/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - botcriptofy2-network

  # Redis
  redis:
    image: redis:7.2-alpine
    container_name: botcriptofy2-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - botcriptofy2-network

  # Backend
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: botcriptofy2-backend
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:postgres@timescaledb:5432/botcriptofy2
      - REDIS_URL=redis://redis:6379
    ports:
      - "3000:3000"
    depends_on:
      - timescaledb
      - redis
    volumes:
      - ./backend:/app
      - /app/node_modules
    networks:
      - botcriptofy2-network

  # Frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: botcriptofy2-frontend
    environment:
      - NODE_ENV=production
      - PUBLIC_API_URL=http://backend:3000
    ports:
      - "4321:4321"
    depends_on:
      - backend
    volumes:
      - ./frontend:/app
      - /app/node_modules
    networks:
      - botcriptofy2-network

  # Ollama
  ollama:
    image: ollama/ollama:latest
    container_name: botcriptofy2-ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    networks:
      - botcriptofy2-network

volumes:
  timescaledb_data:
  redis_data:
  ollama_data:

networks:
  botcriptofy2-network:
    driver: bridge
```

### 2. Dockerfile Backend

```dockerfile
# backend/Dockerfile
FROM oven/bun:1.0.0-alpine

WORKDIR /app

# Instalar dependências
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Copiar código
COPY . .

# Build da aplicação
RUN bun run build

# Expor porta
EXPOSE 3000

# Comando de inicialização
CMD ["bun", "run", "start"]
```

### 3. Dockerfile Frontend

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Instalar dependências
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copiar código
COPY . .

# Build da aplicação
RUN npm run build

# Expor porta
EXPOSE 4321

# Comando de inicialização
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]
```

## 🚀 Scripts de Automação

### 1. Script de Setup Inicial

```bash
#!/bin/bash
# scripts/setup.sh

echo "🚀 Configurando BotCriptoFy2..."

# Verificar pré-requisitos
echo "📋 Verificando pré-requisitos..."
command -v bun >/dev/null 2>&1 || { echo "❌ Bun não encontrado. Instale: https://bun.sh"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker não encontrado. Instale: https://docker.com"; exit 1; }

# Instalar dependências
echo "📦 Instalando dependências..."
bun install

# Configurar backend
echo "🔧 Configurando backend..."
cd backend
bun install
cp .env.example .env
echo "⚠️  Configure as variáveis de ambiente em backend/.env"

# Configurar frontend
echo "🔧 Configurando frontend..."
cd ../frontend
bun install
cp .env.example .env
echo "⚠️  Configure as variáveis de ambiente em frontend/.env"

# Iniciar serviços
echo "🐳 Iniciando serviços Docker..."
cd ..
docker-compose up -d timescaledb redis ollama

# Aguardar serviços
echo "⏳ Aguardando serviços..."
sleep 10

# Executar migrações
echo "🗄️ Executando migrações..."
cd backend
bun run db:migrate

# Baixar modelo Ollama
echo "🤖 Baixando modelo Ollama..."
docker exec botcriptofy2-ollama ollama pull qwen3:0.6b

echo "✅ Setup concluído!"
echo "🌐 Backend: http://localhost:3000"
echo "🌐 Frontend: http://localhost:4321"
echo "📊 TimescaleDB: localhost:5432"
echo "🔴 Redis: localhost:6379"
echo "🤖 Ollama: http://localhost:11434"
```

### 2. Script de Desenvolvimento

```bash
#!/bin/bash
# scripts/dev.sh

echo "🚀 Iniciando ambiente de desenvolvimento..."

# Iniciar serviços de infraestrutura
echo "🐳 Iniciando infraestrutura..."
docker-compose up -d timescaledb redis ollama

# Aguardar serviços
sleep 5

# Iniciar backend
echo "🔧 Iniciando backend..."
cd backend
bun run dev &
BACKEND_PID=$!

# Iniciar frontend
echo "🔧 Iniciando frontend..."
cd ../frontend
bun run dev &
FRONTEND_PID=$!

# Função de cleanup
cleanup() {
    echo "🛑 Parando serviços..."
    kill $BACKEND_PID $FRONTEND_PID
    docker-compose down
    exit
}

# Capturar Ctrl+C
trap cleanup INT

echo "✅ Ambiente de desenvolvimento iniciado!"
echo "🌐 Backend: http://localhost:3000"
echo "🌐 Frontend: http://localhost:4321"

# Manter script rodando
wait
```

### 3. Script de Produção

```bash
#!/bin/bash
# scripts/prod.sh

echo "🚀 Iniciando ambiente de produção..."

# Build das imagens
echo "🔨 Fazendo build das imagens..."
docker-compose build

# Iniciar serviços
echo "🐳 Iniciando serviços..."
docker-compose up -d

# Aguardar serviços
echo "⏳ Aguardando serviços..."
sleep 15

# Executar migrações
echo "🗄️ Executando migrações..."
docker exec botcriptofy2-backend bun run db:migrate

# Verificar saúde dos serviços
echo "🏥 Verificando saúde dos serviços..."
docker-compose ps

echo "✅ Ambiente de produção iniciado!"
echo "🌐 Backend: http://localhost:3000"
echo "🌐 Frontend: http://localhost:4321"
```

## 🗄️ Configuração do Banco de Dados

### 1. Inicialização do TimescaleDB

```sql
-- docker/timescaledb/init.sql
-- Criar extensões
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Criar banco de dados
CREATE DATABASE botcriptofy2;

-- Conectar ao banco
\c botcriptofy2;

-- Executar schema inicial
-- (O schema será criado via migrações do Drizzle)
```

### 2. Configuração do Drizzle

```typescript
// backend/drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
```

### 3. Scripts de Migração

```json
// backend/package.json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:seed": "bun run src/db/seed.ts"
  }
}
```

## 🔴 Configuração do Redis

### 1. Configuração Básica

```conf
# docker/redis/redis.conf
bind 0.0.0.0
port 6379
timeout 0
tcp-keepalive 300
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### 2. Configuração de Clusters (Produção)

```yaml
# docker-compose.redis-cluster.yml
version: '3.8'

services:
  redis-node-1:
    image: redis:7.2-alpine
    command: redis-server --port 7001 --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    ports:
      - "7001:7001"
    volumes:
      - redis_node_1:/data

  redis-node-2:
    image: redis:7.2-alpine
    command: redis-server --port 7002 --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    ports:
      - "7002:7002"
    volumes:
      - redis_node_2:/data

  redis-node-3:
    image: redis:7.2-alpine
    command: redis-server --port 7003 --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    ports:
      - "7003:7003"
    volumes:
      - redis_node_3:/data
```

## 🤖 Configuração do Ollama

### 1. Modelos Necessários

```bash
# Baixar modelos
ollama pull qwen3:0.6b
ollama pull llama3:8b
ollama pull mistral:7b
```

### 2. Configuração de Performance

```bash
# Configurar variáveis de ambiente
export OLLAMA_NUM_PARALLEL=4
export OLLAMA_MAX_LOADED_MODELS=2
export OLLAMA_MAX_QUEUE=512
export OLLAMA_FLASH_ATTENTION=1
```

## 📊 Monitoramento e Logs

### 1. Configuração de Logs

```typescript
// backend/src/utils/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export default logger;
```

### 2. Health Checks

```typescript
// backend/src/routes/health.ts
import { Elysia } from 'elysia';

export const healthRoutes = new Elysia()
  .get('/health', async () => {
    const checks = {
      database: await checkDatabase(),
      redis: await checkRedis(),
      ollama: await checkOllama(),
      stripe: await checkStripe(),
    };

    const isHealthy = Object.values(checks).every(check => check.status === 'healthy');

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks,
    };
  });
```

## 🔒 Configuração de Segurança

### 1. SSL/TLS (Produção)

```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    location / {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. Firewall

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 📋 Checklist de Configuração

### ✅ Desenvolvimento
- [ ] Instalar Bun e Docker
- [ ] Clonar repositório
- [ ] Configurar variáveis de ambiente
- [ ] Iniciar serviços Docker
- [ ] Executar migrações
- [ ] Testar conexões
- [ ] Iniciar aplicação

### ✅ Staging
- [ ] Configurar ambiente de staging
- [ ] Configurar CI/CD
- [ ] Testes automatizados
- [ ] Monitoramento básico
- [ ] Backup automático

### ✅ Produção
- [ ] Configurar servidor de produção
- [ ] Configurar SSL/TLS
- [ ] Configurar firewall
- [ ] Configurar monitoramento
- [ ] Configurar backup
- [ ] Configurar logs
- [ ] Testes de carga
- [ ] Plano de rollback

## 🚨 Troubleshooting

### Problemas Comuns

#### 1. Erro de Conexão com Banco
```bash
# Verificar se o TimescaleDB está rodando
docker ps | grep timescaledb

# Verificar logs
docker logs botcriptofy2-timescaledb

# Testar conexão
psql -h localhost -p 5432 -U postgres -d botcriptofy2
```

#### 2. Erro de Conexão com Redis
```bash
# Verificar se o Redis está rodando
docker ps | grep redis

# Testar conexão
redis-cli -h localhost -p 6379 ping
```

#### 3. Erro de Modelo Ollama
```bash
# Verificar modelos disponíveis
docker exec botcriptofy2-ollama ollama list

# Baixar modelo
docker exec botcriptofy2-ollama ollama pull qwen3:0.6b
```

#### 4. Problemas de Permissão
```bash
# Corrigir permissões
sudo chown -R $USER:$USER .
chmod +x scripts/*.sh
```

## 📞 Suporte

Para problemas de configuração:
1. Verifique os logs: `docker-compose logs`
2. Consulte a documentação: `docs/`
3. Abra uma issue no GitHub
4. Entre em contato com a equipe

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO