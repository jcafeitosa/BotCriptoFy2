# Referência Rápida de Módulos - BotCriptoFy2

## 📋 Tabela Master de Módulos

| # | Módulo | Tier | Criticidade | Dependentes | Dependências | Coverage | Status |
|---|--------|------|-------------|-------------|--------------|----------|--------|
| 1 | **auth** | 1 | ⭐⭐⭐⭐⭐ | 29 | 0 | 95%+ | ✅ |
| 2 | **security** | 1 | ⭐⭐⭐⭐⭐ | 20 | 1 (auth) | 95%+ | ✅ |
| 3 | **audit** | 1 | ⭐⭐⭐⭐⭐ | 15 | 2 (auth, security) | 95%+ | ✅ |
| 4 | **tenants** | 1 | ⭐⭐⭐⭐⭐ | 25 | 1 (auth) | 95%+ | ✅ |
| 5 | **users** | 1 | ⭐⭐⭐⭐⭐ | 5 | 2 (auth, tenants) | 95%+ | ✅ |
| 6 | **rate-limiting** | 1 | ⭐⭐⭐⭐ | 0 | 1 (security) | 90%+ | ✅ |
| 7 | **exchanges** | 2 | ⭐⭐⭐⭐⭐ | 7 | 3 (auth, tenants, audit) | 90%+ | ✅ |
| 8 | **market-data** | 2 | ⭐⭐⭐⭐⭐ | 6 | 1 (exchanges) | 90%+ | ✅ |
| 9 | **orders** | 2 | ⭐⭐⭐⭐⭐ | 5 | 3 (exchanges, market-data, audit) | 90%+ | ✅ |
| 10 | **positions** | 2 | ⭐⭐⭐⭐⭐ | 3 | 3 (exchanges, orders, market-data) | 90%+ | ✅ |
| 11 | **strategies** | 2 | ⭐⭐⭐⭐⭐ | 3 | 3 (market-data, orders, positions) | 90%+ | ✅ |
| 12 | **risk** | 2 | ⭐⭐⭐⭐⭐ | 2 | 4 (positions, market-data, orders) | 90%+ | ✅ |
| 13 | **bots** | 2 | ⭐⭐⭐⭐⭐ | 1 | 3 (strategies, orders, risk) | 90%+ | ✅ |
| 14 | **financial** | 3 | ⭐⭐⭐⭐ | 3 | 3 (auth, tenants, audit) | 85%+ | ✅ |
| 15 | **banco** | 3 | ⭐⭐⭐⭐ | 2 | 4 (auth, tenants, audit, market-data) | 85%+ | ✅ |
| 16 | **subscriptions** | 3 | ⭐⭐⭐⭐ | 1 | 3 (auth, tenants, financial) | 85%+ | ✅ |
| 17 | **social-trading** | 4 | ⭐⭐⭐⭐ | 0 | 4 (auth, strategies, orders, positions) | 80%+ | ✅ |
| 18 | **p2p-marketplace** | 4 | ⭐⭐⭐ | 0 | 3 (auth, banco, audit) | 80%+ | ✅ |
| 19 | **affiliate** | 4 | ⭐⭐⭐ | 1 | 2 (auth, tenants) | 80%+ | ✅ |
| 20 | **mmn** | 4 | ⭐⭐⭐ | 0 | 3 (auth, tenants, affiliate) | 80%+ | ✅ |
| 21 | **notifications** | 5 | ⭐⭐⭐ | 10+ | 2 (auth, tenants) | 80%+ | ✅ |
| 22 | **support** | 5 | ⭐⭐⭐ | 1 | 2 (auth, tenants) | 80%+ | ✅ |
| 23 | **sales** | 5 | ⭐⭐⭐ | 1 | 2 (auth, tenants) | 80%+ | ✅ |
| 24 | **marketing** | 5 | ⭐⭐⭐ | 0 | 2 (auth, tenants) | 80%+ | ✅ |
| 25 | **documents** | 5 | ⭐⭐ | 0 | 3 (auth, tenants, security) | 80%+ | ✅ |
| 26 | **departments** | 5 | ⭐⭐ | 0 | 2 (auth, tenants) | 80%+ | ✅ |
| 27 | **configurations** | 5 | ⭐⭐ | 5+ | 2 (auth, security) | 80%+ | ✅ |
| 28 | **ceo** | 6 | ⭐⭐ | 0 | 10+ (vários) | 80%+ | ✅ |

**Total:** 28 módulos operacionais

---

## 🎯 Quick Actions por Módulo

### Tier 1: Infraestrutura (CRÍTICO)

```bash
# auth
bun test src/modules/auth --coverage
GET /auth/session
POST /auth/sign-in
POST /auth/sign-up

# security
bun test src/modules/security --coverage
GET /security/roles
GET /security/permissions
POST /security/roles/:id/permissions

# audit
SELECT * FROM audit_logs WHERE action='order.create' LIMIT 100
GET /audit/logs?entity_type=order

# tenants
GET /tenants/me
GET /tenants/:id/members

# users
GET /users/me
PUT /users/me

# rate-limiting
GET /rate-limit/stats
redis-cli GET rate_limit:user:123
```

### Tier 2: Trading (CRÍTICO)

```bash
# exchanges
/exchange-test Binance BTC/USDT
GET /exchanges
POST /exchanges
GET /exchanges/:id/balance

# market-data
GET /market-data/ohlcv?symbol=BTC/USDT&timeframe=1h
GET /market-data/ticker?symbol=BTC/USDT
redis-cli GET market:ticker:BTC/USDT

# orders
POST /orders {"type":"limit","side":"buy","symbol":"BTC/USDT","amount":0.01,"price":50000}
GET /orders?status=open
DELETE /orders/:id

# positions
GET /positions?status=open
GET /positions/:id
POST /positions/:id/close

# strategies
/strategy-validate minha-estrategia
POST /strategies/:id/backtest
GET /strategies/:id/signals

# risk
GET /risk/portfolio
GET /risk/var
GET /risk/position-size?symbol=BTC/USDT&risk_percent=2

# bots
POST /bots {"type":"grid","config":{...}}
POST /bots/:id/start
POST /bots/:id/stop
GET /bots/:id/performance
```

### Tier 3: Financeiro

```bash
# financial
GET /financial/invoices
POST /financial/payments
GET /financial/reports/tax

# banco
GET /banco/wallets
POST /banco/wallets/transfer
GET /banco/portfolio
GET /banco/portfolio/performance

# subscriptions
GET /subscriptions/plans
POST /subscriptions/subscribe
GET /subscriptions/usage
```

### Tier 4: Social Trading

```bash
# social-trading
GET /social/traders?verified=true
POST /social/follow/:traderId
POST /social/copy-settings
GET /social/leaderboard
GET /social/feed
POST /social/signals

# p2p-marketplace
GET /p2p/orders
POST /p2p/orders
POST /p2p/trades/:id/complete

# affiliate
GET /affiliate/stats
POST /affiliate/withdraw
GET /affiliate/referrals

# mmn
GET /mmn/genealogy
GET /mmn/network
```

### Tier 5: Operacional

```bash
# notifications
GET /notifications
PUT /notifications/:id/read

# support
GET /support/tickets
POST /support/tickets
GET /support/kb/articles

# sales
GET /sales/contacts
GET /sales/deals
GET /sales/pipeline

# marketing
GET /marketing/campaigns
POST /marketing/campaigns/:id/send

# documents
GET /documents
POST /documents/upload
GET /documents/:id/download

# departments
GET /departments
GET /departments/:id/members

# configurations
GET /configurations
PUT /configurations/:key
```

### Tier 6: Executivo

```bash
# ceo
GET /ceo/dashboard
GET /ceo/kpis
GET /ceo/metrics/revenue
GET /ceo/metrics/users
```

---

## 🔍 Comandos de Diagnóstico

### Health Checks

```bash
# Sistema inteiro
/project-health-check

# Módulo específico
GET /health
GET /

# Database
psql -d botcripto -c "SELECT COUNT(*) FROM users"
psql -d botcripto -c "SELECT COUNT(*) FROM orders WHERE status='open'"

# Redis
redis-cli PING
redis-cli INFO stats
redis-cli DBSIZE

# Logs
tail -f /var/log/botcripto/app.log
tail -f /var/log/botcripto/error.log
grep "ERROR" /var/log/botcripto/*.log | tail -20
```

### Performance

```bash
# Prometheus metrics
GET /metrics
curl http://localhost:3000/metrics | grep http_request_duration

# Database slow queries
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

# Redis slowlog
redis-cli SLOWLOG GET 10

# Process monitoring
ps aux | grep bun
top -p $(pgrep -f "bun run dev")
```

### Debugging

```bash
# TypeScript check
bun run typecheck

# Linting
bun run lint

# Tests
bun test
bun test src/modules/exchanges --coverage

# Build
bun run build
```

---

## 📊 Matriz de Impacto de Mudanças

| Módulo Modificado | Impacto | Módulos Afetados | Tempo Estimado | Risco |
|-------------------|---------|------------------|----------------|-------|
| **auth** | CRÍTICO | 29 módulos | 2-4 semanas | 🔴 Alto |
| **security** | CRÍTICO | 20 módulos | 1-2 semanas | 🔴 Alto |
| **audit** | ALTO | 15 módulos | 1 semana | 🟠 Médio |
| **tenants** | CRÍTICO | 25 módulos | 2-3 semanas | 🔴 Alto |
| **exchanges** | ALTO | 7 módulos | 1-2 semanas | 🟠 Médio |
| **market-data** | ALTO | 6 módulos | 1 semana | 🟠 Médio |
| **orders** | ALTO | 5 módulos | 3-5 dias | 🟠 Médio |
| **strategies** | MÉDIO | 3 módulos | 2-3 dias | 🟡 Baixo |
| **social-trading** | BAIXO | 0 módulos | 1-2 dias | 🟢 Muito Baixo |
| **ceo** | BAIXO | 0 módulos | 1 dia | 🟢 Muito Baixo |

---

## 🔗 Links Rápidos

### Documentação do Projeto

- [AGENTS.md](./AGENTS.md) - 53 Regras de Ouro
- [CLAUDE.md](./CLAUDE.md) - Instruções para agentes
- [MODULES_ANALYSIS.md](./MODULES_ANALYSIS.md) - Análise completa
- [MODULES_DETAILED.md](./MODULES_DETAILED.md) - Detalhamento técnico
- [MODULES_WORKFLOW.md](./MODULES_WORKFLOW.md) - Workflows práticos
- [IMPLEMENTACAO.md](./docs/IMPLEMENTACAO.md) - Status de implementação

### Comandos Personalizados

```bash
/agent-cto-validate              # Validar protocolo completo
/project-init novo-modulo        # Inicializar novo módulo
/dev-analyze-dependencies        # Analisar dependências
/dev-code-review                 # Code review profundo
/exchange-test Binance BTC/USDT  # Testar exchange
/strategy-validate               # Validar estratégia
/backtest-run                    # Executar backtest
/project-health-check            # Verificar saúde
```

### Ferramentas Externas

- **Swagger Docs:** http://localhost:3000/swagger
- **Prometheus:** http://localhost:9090 (se configurado)
- **Redis CLI:** `redis-cli`
- **PostgreSQL:** `psql -d botcripto`
- **TimescaleDB:** `psql -d botcripto -c "SELECT * FROM timescaledb_information.hypertables"`

---

## ⚡ Atalhos de Desenvolvimento

### Setup Inicial

```bash
# Clone e setup
git clone <repo>
cd BotCriptoFy2/backend
bun install

# Configurar .env
cp .env.example .env
# Editar .env com suas credenciais

# Setup database
bun run db:push
bun run db:seed

# Iniciar desenvolvimento
bun run dev
```

### Desenvolvimento Diário

```bash
# Terminal 1: Dev server
cd backend && bun run dev

# Terminal 2: Tests em watch mode
cd backend && bun test --watch

# Terminal 3: Logs
tail -f /var/log/botcripto/app.log

# Terminal 4: Comandos ad-hoc
redis-cli MONITOR
```

### Pre-Commit

```bash
# Antes de commit
bun run lint
bun run typecheck
bun test
/dev-code-review src/modules/novo-modulo
```

### Pre-Deploy

```bash
# Checklist completo
/project-health-check
bun run build
bun test --coverage
docker-compose up -d
```

---

## 🎓 Nível de Complexidade

| Módulo | Complexidade | Linhas de Código | Especialistas Necessários |
|--------|--------------|------------------|---------------------------|
| **exchanges** | 🔴 Muito Alta | 2000+ | CCXT, Crypto APIs |
| **market-data** | 🔴 Muito Alta | 1500+ | TimescaleDB, Real-time |
| **social-trading** | 🟠 Alta | 3658 | Trading, Social features |
| **strategies** | 🟠 Alta | 2500+ | TA, Backtesting |
| **risk** | 🟠 Alta | 1000+ | Quant Finance, Stats |
| **bots** | 🟠 Alta | 1500+ | Automation, Trading |
| **financial** | 🟡 Média | 2000+ | Payments, Tax |
| **auth** | 🟡 Média | 800+ | Better-Auth, Security |
| **banco** | 🟡 Média | 1200+ | Wallets, Crypto |
| **ceo** | 🟢 Baixa | 500+ | Analytics, Dashboards |

**Legenda:**
- 🔴 Muito Alta: Requer 2+ especialistas, 2+ semanas
- 🟠 Alta: Requer 1 especialista, 1 semana
- 🟡 Média: Dev sênior, 3-5 dias
- 🟢 Baixa: Dev mid/junior, 1-2 dias

---

*Última atualização: 2025-10-17*
*Versão: 1.0.0*
