# 📋 Proposta: Refatoração CLAUDE.md vs README.md

## 🎯 Objetivo

Separar claramente:
- **CLAUDE.md**: Instruções exclusivas para agentes IA
- **README.md**: Informações sobre o projeto (para humanos e agentes)

---

## 📐 Estrutura Proposta

### CLAUDE.md (APENAS Instruções para Agentes)

```markdown
# CLAUDE.md - Instruções para Agentes IA

## ⚠️ PROTOCOLO OBRIGATÓRIO

**ANTES de qualquer tarefa**:
1. Leia **[AGENTS.md](./AGENTS.md)** (53 Regras de Ouro)
2. Execute `/agent-cto-validate`
3. Consulte **[README.md](./README.md)** para info do projeto

---

## 🤝 TRABALHO EM EQUIPE

### Princípios
1. **SEMPRE trabalhe em EQUIPE**
2. **Consulte especialistas**
3. **Delegue apropriadamente**
4. **Escale quando bloqueado**
5. **Documente em TEAM_DECISIONS.md**

### Hierarquia de Agentes

[Diagrama Mermaid mantido]

### Especialistas Disponíveis

| Tecnologia | Comando |
|------------|---------|
| CCXT | `/agent ccxt-specialist` |
| Elysia.js | `/agent elysia-specialist` |
[etc...]

---

## 🛠️ COMANDOS SLASH

### Uso Obrigatório

**ANTES de desenvolvimento**:
- `/agent-cto-validate` (OBRIGATÓRIO)
- `/project-init`

**DURANTE desenvolvimento**:
- `/dev-analyze-dependencies` (Regra 53 - OBRIGATÓRIO antes de modificar arquivos)
- `/exchange-test`
- `/strategy-validate`

**DURANTE code review**:
- `/dev-code-review`

**ANTES de deploy**:
- `/project-health-check`
- `/backtest-run`

[Ver lista completa: [.claude/README.md](.claude/README.md)]

---

## 🎯 WORKFLOW OBRIGATÓRIO (Agente-CTO)

### 1. Planejamento (Regras 1-10)
- [ ] Definir contexto e objetivo técnico
- [ ] Criar workflow Mermaid
- [ ] Quebrar em ≤6 subtarefas
- [ ] **ANÁLISE DE DEPENDÊNCIAS** (grep arquivos linkados)
- [ ] **MAPEAR GRAFO DE DEPENDÊNCIAS**
- [ ] Validar padrões de código

### 2. Análise de Dependências (CRÍTICO - Regra 53)

```bash
# Antes de modificar QUALQUER arquivo:
./scripts/analyze-deps.sh <arquivo>
# OU
/dev-analyze-dependencies
```

**Checklist**:
- [ ] Todos arquivos dependentes identificados
- [ ] Impacto avaliado
- [ ] Atualizações em cascata planejadas
- [ ] Mudança atômica garantida

### 3. Desenvolvimento (Regras 11-20)
- [ ] Zero mocks/placeholders
- [ ] Código completo e testado
- [ ] Documentação JSDoc/NatSpec
- [ ] Validação com Zod
- [ ] Coverage ≥80% (backend) / ≥95% (contratos)

### 4. Validação Pós-Modificação

```bash
grep -r "referencias" . --exclude-dir=node_modules
bun test
bun run lint
bun run typecheck
```

### 5. Code Review (Regras 21-30)
- [ ] `/dev-code-review` executado
- [ ] 2+ revisores (contratos)
- [ ] Security scan passou
- [ ] CI/CD verde

---

## ⚠️ ZERO TOLERÂNCIA

- Referências quebradas
- Imports quebrados
- Links de documentação inválidos
- Testes falhando
- Vulnerabilidades de segurança
- Mocks ou código incompleto

**"No blockchain/trading, não há 'quase certo' — ou está seguro, ou não está."**

---

## 📚 Hierarquia de Documentação

1. **AGENTS.md** ← Fonte única de verdade (53 Regras)
2. **CLAUDE.md** ← Este arquivo (instruções para agentes)
3. **README.md** ← Informações do projeto
4. docs/AGENTS_README.md ← Guia rápido
5. docs/ ← Documentação específica

---

## 🔗 Links Importantes

- 📘 [AGENTS.md](./AGENTS.md) - Guia principal (LEIA PRIMEIRO)
- 📖 [README.md](./README.md) - Sobre o projeto
- 📊 [IMPLEMENTACAO.md](./docs/IMPLEMENTACAO.md) - Status (5% completo)
- 🔄 [MIGRATION_WEB3_TO_TRADING.md](./docs/MIGRATION_WEB3_TO_TRADING.md)
- ✅ [AGENTS_ADAPTATION_APPROVAL.json](./docs/AGENTS_ADAPTATION_APPROVAL.json)
```

---

### README.md (Informações sobre o Projeto)

```markdown
# BeeCripto / BotCriptoFy

**Plataforma SaaS de automação de trading de criptomoedas** construída com TypeScript moderno.

[![Status](https://img.shields.io/badge/status-development-yellow)]
[![Coverage](https://img.shields.io/badge/coverage-5%25-red)]
[![License](https://img.shields.io/badge/license-MIT-blue)]

---

## 🎯 Visão Geral

BeeCripto é uma plataforma SaaS que permite usuários criar, testar e deploar bots de trading automatizados com estratégias personalizadas e indicadores técnicos através de 100+ exchanges via CCXT.

### Core Features

- 📊 **Multi-Exchange Trading**: Conexão com 100+ exchanges via CCXT
- 🤖 **Trading Bots**: Trading automatizado com estratégias customizadas
- 📈 **Technical Indicators**: Indicadores built-in e personalizados
- 🧪 **Backtesting**: Teste de estratégias com dados históricos
- 💼 **Portfolio Management**: Tracking e otimização de portfolios
- 🔐 **Risk Management**: Stop-loss, take-profit, position sizing
- 📱 **SaaS Multi-Tenancy**: Múltiplos usuários, subscriptions, API access

---

## 🏗️ Arquitetura

### Tech Stack

**Backend**:
- Runtime: Bun (all-in-one JavaScript runtime)
- Framework: Elysia.js (fast & ergonomic)
- Language: TypeScript (strict mode)
- Database: PostgreSQL + TimescaleDB
- Cache: Redis
- ORM: Drizzle
- Validation: Zod
- Auth: Better Auth

**Frontend** (Planejado):
- Framework: Astro + React
- Charts: TradingView Lightweight Charts, ECharts
- UI: Material Tailwind, shadcn/ui
- Styling: Tailwind CSS

**Trading**:
- Exchange API: CCXT (100+ exchanges)
- AI Agents: Mastra.ai (28 agentes especializados)
- WebSockets: Real-time market data

**Infrastructure**:
- Containerization: Docker
- CI/CD: GitHub Actions
- Monitoring: (To be defined)

### Estrutura do Projeto

```
beecripto/
├── backend/              # Bun + Elysia API
│   ├── src/
│   │   ├── index.ts      # Entry point
│   │   ├── modules/      # Feature modules
│   │   ├── services/     # Business logic
│   │   ├── trading/      # Trading engine
│   │   ├── strategies/   # Trading strategies
│   │   ├── indicators/   # Technical indicators
│   │   └── backtest/     # Backtesting framework
│   ├── test/             # Tests
│   └── docs/             # Backend docs
├── frontend/             # Astro + React (Planejado)
├── strategies/           # Trading strategies (Planejado)
├── docs/                 # Documentation
│   ├── IMPLEMENTACAO.md  # Implementation status (5%)
│   ├── AGENTS.md         # Development rules (53 rules)
│   └── ARCHITECTURE.md   # Architecture docs
└── .claude/              # Claude Code customizations
    ├── commands/         # 34 slash commands
    └── agents/           # Agent hierarchy
```

---

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh) >= 1.0.0
- PostgreSQL >= 14
- Redis >= 6
- Git

### Installation

```bash
# Clone repository
git clone https://github.com/yourorg/beecripto.git
cd beecripto

# Backend setup
cd backend
bun install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Run migrations
bun run migrate

# Start dev server
bun run dev
```

Server runs at: http://localhost:3000

### Verificar Instalação

```bash
# Health check
curl http://localhost:3000/health

# Run tests
bun test

# Check coverage
bun run test:coverage
```

---

## 📊 Status do Projeto

**Implementação**: 5% completo

Veja [IMPLEMENTACAO.md](./docs/IMPLEMENTACAO.md) para roadmap detalhado.

### Completed
- ✅ Setup inicial (Bun + Elysia)
- ✅ Estrutura de documentação
- ✅ 53 Regras de Ouro definidas
- ✅ 34 comandos slash criados
- ✅ Hierarquia de agentes estabelecida

### In Progress
- 🔄 Core trading engine
- 🔄 CCXT integration
- 🔄 Database schema (Drizzle)
- 🔄 Authentication (Better Auth)

### Planned
- 📅 Trading strategies
- 📅 Backtesting framework
- 📅 Frontend (Astro + React)
- 📅 Portfolio management
- 📅 Risk management
- 📅 Multi-tenancy

---

## 🛠️ Development

### Available Commands

```bash
# Development
bun run dev           # Start dev server with hot reload
bun run build         # Build for production
bun run start         # Serve production build

# Testing
bun test              # Run tests
bun run test:watch    # Watch mode
bun run test:coverage # Coverage report (min 80%)

# Database
bun run migrate       # Apply migrations
bun run db:studio     # Open Drizzle Studio

# Code Quality
bun run lint          # Lint code
bun run lint:fix      # Auto-fix lint issues
bun run format        # Format with Prettier
bun run typecheck     # TypeScript type checking

# Trading
bun run backtest      # Run backtesting
bun run bot:start     # Start trading bot
bun run bot:stop      # Stop trading bot
bun run bot:status    # Check bot status
```

### Development Workflow

Para desenvolvedores usando Claude Code:

```bash
# 1. Antes de iniciar qualquer tarefa
/agent-cto-validate

# 2. Antes de modificar arquivos
/dev-analyze-dependencies

# 3. Durante desenvolvimento
# - Seguir AGENTS.md (53 Regras)
# - Testes obrigatórios (≥80% coverage)
# - Code review obrigatório

# 4. Antes de PR
/dev-code-review
/project-health-check
```

Ver [CLAUDE.md](./CLAUDE.md) para instruções completas de agentes.

---

## 🧪 Testing

### Requirements

- Backend: ≥ 80% coverage
- Trading strategies: ≥ 95% coverage
- Financial logic: 100% coverage

### Test Types

- **Unit Tests**: Individual functions/classes
- **Integration Tests**: Module interactions
- **E2E Tests**: Complete user flows
- **Strategy Tests**: Backtesting validation

```bash
# Run all tests
bun test

# Run with coverage
bun run test:coverage

# Watch mode
bun run test:watch
```

---

## 🔐 Security

### Principles

- **Zero Trust**: Validate all inputs (Zod schemas)
- **Least Privilege**: RBAC implemented
- **Defense in Depth**: Multiple security layers
- **Secure by Default**: Security first, convenience second

### Checklists

- ✅ Input validation (Zod)
- ✅ Rate limiting
- ✅ CORS configured
- ✅ JWT authentication
- ✅ SQL injection prevention (Drizzle ORM)
- ✅ XSS protection
- ✅ Secure headers (Helmet)
- ✅ Secrets in environment variables
- ✅ OWASP Top 10 compliance

### Reporting Security Issues

**DO NOT** open public issues for security vulnerabilities.

Email: security@beecripto.com

---

## 📚 Documentation

### For Developers

- [AGENTS.md](./AGENTS.md) - 53 Golden Rules (READ FIRST)
- [CLAUDE.md](./CLAUDE.md) - Agent instructions
- [IMPLEMENTACAO.md](./docs/IMPLEMENTACAO.md) - Implementation status
- [MIGRATION_WEB3_TO_TRADING.md](./docs/MIGRATION_WEB3_TO_TRADING.md) - Migration plan

### For Users

- API Documentation: http://localhost:3000/docs (Scalar)
- User Guide: (To be created)
- FAQ: (To be created)

### Architecture

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System architecture
- [ADRs](./docs/adr/) - Architecture Decision Records
- Database Schema: See Drizzle Studio

---

## 🤝 Contributing

### Prerequisites

1. Read [AGENTS.md](./AGENTS.md) - **Mandatory**
2. Setup development environment
3. Familiarize with slash commands

### Process

1. Create issue describing the problem/feature
2. Wait for assignment / approval
3. Create branch: `feature/ISSUE-ID` or `fix/ISSUE-ID`
4. Follow development workflow (see above)
5. Submit PR with checklist complete
6. Pass code review (2+ approvers for critical code)
7. Merge after CI/CD green

### Code Standards

- TypeScript strict mode
- 100% JSDoc coverage
- ≥80% test coverage
- Zero warnings
- Conventional commits
- No mocks/placeholders

---

## 📜 License

MIT License - See [LICENSE](./LICENSE)

---

## 👥 Team

- Tech Lead: (To be defined)
- Backend: (To be defined)
- Frontend: (To be defined)
- DevOps: (To be defined)
- QA: (To be defined)

---

## 📞 Contact

- Website: (To be created)
- Email: contact@beecripto.com
- Discord: (To be created)
- Twitter: (To be created)

---

## 🙏 Acknowledgments

- [Bun](https://bun.sh) - Amazing runtime
- [Elysia.js](https://elysiajs.com) - Fast framework
- [CCXT](https://ccxt.com) - Crypto exchange API
- [Drizzle ORM](https://orm.drizzle.team) - Type-safe ORM
- OpenAI & Anthropic - AI assistance

---

**⚠️ Disclaimer**: Trading cryptocurrencies involves substantial risk of loss. This software is provided "as is" without warranty of any kind. Use at your own risk.
```

---

## 🔄 Migration Plan

### Files to Refactor

```bash
# 1. Refatorar CLAUDE.md
# - Remover info do projeto
# - Manter apenas instruções para agentes
# - Linkar README.md

# 2. Criar/Atualizar README.md
# - Adicionar info do projeto
# - Adicionar quick start
# - Adicionar contributing guide

# 3. Atualizar links em:
# - AGENTS.md
# - docs/AGENTS_README.md
# - .claude/commands/*.md
```

### Checklist de Validação

- [ ] CLAUDE.md contém APENAS instruções para agentes
- [ ] README.md contém TODA info do projeto
- [ ] Todos os links atualizados
- [ ] Hierarquia de documentação clara
- [ ] Zero redundância entre arquivos

---

## ✅ Benefícios

1. **Clareza**: Separação clara de responsabilidades
2. **Manutenibilidade**: Atualizar info do projeto sem afetar agentes
3. **Onboarding**: Humanos leem README, agentes leem CLAUDE
4. **Profissionalismo**: README padronizado da indústria
5. **SEO**: README bem estruturado para GitHub

---

**Aprovação**: ✅ Recomendado
**Prioridade**: 🟡 Média
**Esforço**: ~2 horas

---

**Gerado por**: Agente-CTO
**Data**: 2025-10-12
