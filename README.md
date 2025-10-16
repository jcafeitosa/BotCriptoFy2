# BotCriptoFy2 - Plataforma SaaS de Trading de Criptomoedas

## 🎯 Visão Geral

BotCriptoFy2 é uma plataforma SaaS Multi-Tenant completa de trading de criptomoedas com bots autônomos, combinando **inteligência artificial**, **automação** e **gestão empresarial** em uma única solução integrada.

### 📊 Status do Projeto

- ✅ **FASE 0 - Infraestrutura** (100% Completo)
  - ✅ Autenticação e Autorização (Better-Auth + RBAC)
  - ✅ Database (PostgreSQL + TimescaleDB + Drizzle ORM)
  - ✅ Cache (Redis com fallback in-memory)
  - ✅ Logging (Winston com rotação)
  - ✅ Docker + Docker Compose
  - ✅ Scripts de setup automático
  - ✅ Health checks e monitoramento
- 🚧 **FASE 1 - Módulos Core** (Em breve)
- ⏳ **FASE 2 - Trading Engine** (Planejado)
- ⏳ **FASE 3 - AI/ML Integration** (Planejado)

## 🏗️ Arquitetura

### Stack Tecnológica

- **Backend**: Elysia + Better-Auth + TimescaleDB + Drizzle ORM
- **Frontend**: Astro + React 19 + Tailwind CSS v4
- **IA**: Mastra.ai + Ollama (Qwen3:0.6b)
- **Comunicação**: Telegram Bot API
- **Cache**: Redis 7.2
- **Documentação**: Swagger/OpenAPI

### Estrutura Organizacional

- **CEO**: Julio Cezar Aquino Feitosa (Super Admin)
- **Departamentos**: 9 departamentos com agentes autônomos
- **Tenants**: Híbrida (1:N + 1:1)
- **Billing**: Better-Auth + Stripe

## 🚀 Início Rápido

### Pré-requisitos

#### Para Desenvolvimento Local
- **Bun** >= 1.0.0 (obrigatório)
- **PostgreSQL** >= 16.0 com TimescaleDB (obrigatório)
- **Redis** >= 7.2 (opcional - usa fallback in-memory)
- **Ollama** com modelo Qwen3:0.6b (opcional)

#### Para Desenvolvimento com Docker
- **Docker** >= 24.0
- **Docker Compose** >= 2.0
- **Bun** >= 1.0.0 (para desenvolvimento local do código)

### 🔧 Opção 1: Setup Local (Recomendado para Desenvolvimento)

Ideal para desenvolvimento rápido sem Docker. Redis e Ollama são opcionais.

```bash
# Clone o repositório
git clone <repository-url>
cd BotCriptoFy2/backend

# Execute o script de setup automático
./scripts/setup-local.sh

# O script irá:
# ✓ Verificar pré-requisitos (Bun, PostgreSQL)
# ✓ Criar arquivo .env com valores padrão
# ✓ Criar database e usuário PostgreSQL
# ✓ Habilitar extensão TimescaleDB
# ✓ Instalar dependências
# ✓ Executar migrações
# ✓ Seed do banco de dados (opcional)

# Inicie o servidor de desenvolvimento
cd ..
bun run dev
```

**Acesse:**
- Backend API: http://localhost:3000
- Frontend: http://localhost:4321
- API Docs: http://localhost:3000/swagger
- Health Check: http://localhost:3000

### 🐳 Opção 2: Setup com Docker

Ideal para ambientes de produção ou quando você quer isolar completamente a infraestrutura.

#### 2.1 Apenas Infraestrutura (Backend/Frontend Local)

```bash
cd BotCriptoFy2

# Copie o arquivo .env
cp .env.example .env
# Edite conforme necessário

# Inicie PostgreSQL, Redis e Ollama via Docker
./scripts/docker-start.sh

# Em outro terminal, inicie backend/frontend localmente
bun run dev
```

#### 2.2 Stack Completa com Docker (Backend + Frontend + Infraestrutura)

```bash
cd BotCriptoFy2

# Copie o arquivo .env
cp .env.example .env

# Inicie todos os serviços no Docker
./scripts/docker-start.sh --full

# Opcional: Rebuild das imagens
./scripts/docker-start.sh --full --build
```

**Acesse:**
- Backend API: http://localhost:3000
- Frontend: http://localhost:4321
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- Ollama: http://localhost:11434

#### Comandos Docker Úteis

```bash
# Parar todos os serviços
./scripts/docker-stop.sh

# Parar e remover volumes (⚠️ apaga dados!)
./scripts/docker-stop.sh --volumes

# Reiniciar serviços
./scripts/docker-restart.sh

# Reiniciar com rebuild
./scripts/docker-restart.sh --build

# Ver logs
docker-compose logs -f [service-name]

# Exemplos:
docker-compose logs -f postgres
docker-compose logs -f backend
docker-compose logs -f redis
```

### 🔧 Instalação Manual (Avançado)

```bash
# 1. Instale dependências
bun install

# 2. Configure backend
cd backend
bun install
cp .env.example .env
# Edite .env com suas configurações

# 3. Configure PostgreSQL
createdb -U postgres botcriptofy2
psql -U postgres -d botcriptofy2 -c "CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;"

# 4. Execute migrações
bun run db:push

# 5. (Opcional) Seed do banco
bun run db:seed

# 6. Inicie o servidor
cd ..
bun run dev
```

### 📝 Notas Importantes

1. **Redis é Opcional**: O sistema possui fallback automático para in-memory cache quando Redis não está disponível. Ideal para desenvolvimento local.

2. **Ollama é Opcional**: Se não estiver disponível, os agentes AI não funcionarão, mas o resto do sistema opera normalmente.

3. **Docker Profiles**:
   - **Default** (sem --full): Apenas PostgreSQL, Redis e Ollama
   - **Full** (com --full): Todos os serviços incluindo backend/frontend

4. **Desenvolvimento Local vs Docker**:
   - **Local**: Mais rápido para desenvolvimento, hot reload instantâneo
   - **Docker**: Melhor para testar ambiente de produção

5. **TimescaleDB**: Extensão habilitada automaticamente no setup. Usada para dados temporais (trading, logs, analytics).

## 📚 Documentação

- [📄 Ordem de Desenvolvimento](./docs/ORDEM-DE-DESENVOLVIMENTO.md) - **COMECE AQUI**
- [📄 Resumo Executivo](./docs/RESUMO-EXECUTIVO.md)
- [📄 Índice Completo](./docs/INDICE-COMPLETO-DOCUMENTACAO.md)
- [🏗️ Arquitetura](./docs/architecture/README.md)
- [🔌 API Reference](./docs/api/README.md)
- [🤖 Agentes](./docs/agents/README.md)
- [🏢 Departamentos](./docs/departments/README.md)
- [💻 Desenvolvimento](./docs/development/README.md)
- [🚀 Deploy](./docs/deployment/README.md)
- [🔒 Segurança](./docs/security/README.md)
- [🧪 Testes](./docs/testing/README.md)

## 🎯 Funcionalidades

### Módulos Administrativos (9 módulos)

1. **CEO Dashboard** - Visão executiva completa
2. **Financeiro** - Gestão de billing e pagamentos
3. **Marketing** - Campanhas e analytics
4. **Vendas** - Leads e prospects
5. **Segurança** - Monitoramento e auditoria
6. **SAC** - Suporte ao cliente
7. **Auditoria** - Conformidade e logs
8. **Documentos** - Gestão de documentos
9. **Configurações** - Configurações do sistema
10. **Assinaturas** - Gestão de planos e cobrança

### Módulos de Trading (12 módulos)

1. **Core Trading Engine** - Motor de trading
2. **Orders Module** - Gestão de ordens
3. **Exchanges Integration** - Multi-exchange
4. **Bot Management** - Criação e monitoramento
5. **Strategy Engine** - Builder visual
6. **AI/ML Integration** - Predições e sentimento
7. **Risk Management** - Gestão de risco
8. **Portfolio** - Gestão de portfólio
9. **Analytics** - Relatórios
10. **Social Trading** - Copy trading
11. **Education** - Cursos e certificação
12. **Mobile** - App mobile

### Agentes Autônomos (10 agentes)

Cada departamento possui um agente autônomo com:
- Acesso em tempo real aos dados
- Comunicação via Telegram
- Processamento via Ollama (Qwen3:0.6b)
- Capacidades específicas por departamento

## 🔧 Configuração

### Variáveis de Ambiente

O projeto possui um arquivo `.env.example` completo com valores padrão para desenvolvimento local. Copie-o para `.env` e ajuste conforme necessário:

```bash
cp .env.example .env
```

#### Variáveis Principais

```env
# ===========================================
# Database (Obrigatório)
# ===========================================
DATABASE_URL=postgresql://botcriptofy2:botcriptofy2@localhost:5432/botcriptofy2
POSTGRES_USER=botcriptofy2
POSTGRES_PASSWORD=botcriptofy2
POSTGRES_DB=botcriptofy2

# ===========================================
# Redis (Opcional - fallback in-memory)
# ===========================================
REDIS_URL=redis://default:botcriptofy2@localhost:6379
REDIS_PASSWORD=botcriptofy2

# ===========================================
# Better-Auth (Obrigatório)
# ===========================================
BETTER_AUTH_SECRET=your-super-secret-key-change-this-in-production
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:4321

# ===========================================
# Stripe (Opcional para desenvolvimento)
# ===========================================
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# ===========================================
# Telegram Bot (Opcional)
# ===========================================
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id

# ===========================================
# Ollama AI (Opcional)
# ===========================================
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:0.6b

# ===========================================
# API Configuration
# ===========================================
PORT=3000
NODE_ENV=development
APP_VERSION=1.0.0
FRONTEND_URL=http://localhost:4321
```

#### Estrutura de Arquivos .env

- **Raiz do projeto**: `.env` - Variáveis globais e Docker Compose
- **Backend**: `backend/.env` - Variáveis específicas do backend (opcional, herda da raiz)

#### Geração Automática de Secrets

O script `setup-local.sh` gera automaticamente um `BETTER_AUTH_SECRET` seguro se você estiver usando o valor padrão do exemplo.

## 🧪 Testes

```bash
# Testes unitários
bun run test

# Testes com coverage
bun run test:coverage

# Testes E2E
bun run test:e2e
```

## 📊 Monitoramento

- **Logs**: Estruturados com Winston
- **Métricas**: TimescaleDB para dados temporais
- **Alertas**: Telegram para notificações
- **Health Checks**: Endpoints de saúde

## 🔒 Segurança

- Autenticação via Better-Auth
- Autorização por roles e departamentos
- Criptografia de dados sensíveis
- Rate limiting e validação
- Auditoria completa de ações

## 📈 Performance

- Cache Redis para otimização
- TimescaleDB para dados temporais
- Agentes assíncronos
- WebSockets para tempo real
- CDN para assets estáticos

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 👥 Equipe

- **CEO**: Julio Cezar Aquino Feitosa
- **Desenvolvimento**: Agente-Dev
- **QA**: Agente-QA
- **Documentação**: Agente-CTO

## 📞 Suporte

Para suporte, entre em contato via:
- Email: jcafeitosa@icloud.com
- Telegram: [@BotCriptoFy2](https://t.me/BotCriptoFy2)
- Issues: [GitHub Issues](https://github.com/your-org/botcriptofy2/issues)

---

**Desenvolvido com ❤️ pela equipe BotCriptoFy2**