# Detalhamento Técnico dos Módulos - BotCriptoFy2

## 🔴 Tier 1: Infraestrutura Core

### 1. auth (Autenticação)

**Tecnologia:** Better-Auth
**Criticidade:** ⭐⭐⭐⭐⭐
**Status:** Implementado

**Funcionalidades:**
- Login/logout/registro
- Sessões e tokens JWT
- OAuth providers (Google, GitHub, etc.)
- 2FA/MFA
- Password recovery
- Session management

**Rotas:**
- `authRoutes` - Endpoints Better-Auth
- `authCustomRoutes` - Customizações
- `adminAuthRoutes` - Admin auth
- `devAuthRoutes` - Dev/debug

**Dependências:**
- Better-Auth library
- Redis (sessions)
- PostgreSQL (users)

---

### 2. security (Segurança & RBAC)

**Criticidade:** ⭐⭐⭐⭐⭐
**Status:** Implementado

**Funcionalidades:**
- RBAC (Role-Based Access Control)
- Roles: CEO, Admin, Manager, User
- Permissions granulares
- Middleware de autorização
- Resource-level permissions

**Middlewares:**
- `requireAdmin()` - Requer role admin
- `requirePermission(permission)` - Requer permissão específica
- `requireRole(role)` - Requer role específica

**Dependências:**
- `auth` (autenticação)
- PostgreSQL (roles, permissions)

---

### 3. audit (Auditoria & Compliance)

**Criticidade:** ⭐⭐⭐⭐⭐
**Status:** Implementado

**Funcionalidades:**
- Audit logging automático
- Compliance LGPD/GDPR
- Data retention policies
- Rastreabilidade de ações
- Logs imutáveis

**Serviços:**
- `logAuditEvent()` - Registra evento
- Usado por: banco, p2p, financial

**Dependências:**
- `auth` (user context)
- `security` (permissions)
- PostgreSQL (audit_logs)
- TimescaleDB (time-series logs)

---

### 4. tenants (Multi-tenancy)

**Criticidade:** ⭐⭐⭐⭐⭐
**Status:** Implementado

**Funcionalidades:**
- Tenant isolation (row-level security)
- Tenant management
- Membership management
- Tenant-scoped data

**Modelo:**
```typescript
{
  id: string
  name: string
  ownerId: string
  plan: 'free' | 'basic' | 'pro' | 'enterprise'
  members: TenantMember[]
}
```

**Dependências:**
- `auth` (ownership)
- PostgreSQL (tenants)

---

### 5. users (Gestão de Usuários)

**Criticidade:** ⭐⭐⭐⭐⭐
**Status:** Implementado

**Funcionalidades:**
- Perfis de usuário
- Tenant membership
- User preferences
- Avatar/profile pictures

**Rotas:**
- `GET /users/me` - Perfil atual
- `PUT /users/me` - Atualizar perfil
- `GET /users/:id` - Perfil público

**Dependências:**
- `auth` (autenticação)
- `tenants` (membership)

---

### 6. rate-limiting (Proteção de API)

**Criticidade:** ⭐⭐⭐⭐
**Status:** Implementado

**Funcionalidades:**
- Rate limiting por IP
- Rate limiting por usuário
- Rate limiting por tenant
- Sliding window algorithm
- Redis-based storage

**Configuração:**
```typescript
{
  windowMs: 60000,      // 1 minuto
  maxRequests: 100,     // 100 requests
  skipSuccessfulRequests: false
}
```

**Dependências:**
- `security` (admin routes)
- Redis (counters)

---

## 🟠 Tier 2: Trading Core

### 7. exchanges (Integração de Exchanges)

**Tecnologia:** CCXT
**Criticidade:** ⭐⭐⭐⭐⭐
**Status:** Implementado

**Funcionalidades:**
- Conexão com 105+ exchanges
- Credential management (encrypted)
- API key rotation
- Exchange health monitoring
- Multi-exchange arbitrage

**Exchanges Suportadas:**
- Binance, Coinbase, Kraken, Bitfinex, etc.
- CEX e DEX

**Rotas:**
- `POST /exchanges` - Conectar exchange
- `GET /exchanges` - Listar exchanges
- `DELETE /exchanges/:id` - Desconectar
- `GET /exchanges/:id/balance` - Saldo

**Dependências:**
- `auth` (ownership)
- `tenants` (isolation)
- `audit` (tracking)
- PostgreSQL (credentials - encrypted)
- Redis (caching)

---

### 8. market-data (Dados de Mercado)

**Tecnologia:** CCXT + TimescaleDB
**Criticidade:** ⭐⭐⭐⭐⭐
**Status:** Implementado

**Funcionalidades:**
- OHLCV data collection
- Real-time ticker updates
- Order book snapshots
- Trade history
- Data aggregation (1m, 5m, 15m, 1h, 4h, 1d)

**Estrutura TimescaleDB:**
```sql
CREATE TABLE ohlcv (
  time TIMESTAMPTZ NOT NULL,
  exchange TEXT,
  symbol TEXT,
  open NUMERIC,
  high NUMERIC,
  low NUMERIC,
  close NUMERIC,
  volume NUMERIC
);
SELECT create_hypertable('ohlcv', 'time');
```

**Rotas:**
- `GET /market-data/ohlcv` - OHLCV data
- `GET /market-data/ticker` - Ticker atual
- `GET /market-data/orderbook` - Order book
- `GET /market-data/trades` - Recent trades

**Dependências:**
- `exchanges` (data source)
- TimescaleDB (time-series storage)
- Redis (real-time caching)

---

### 9. orders (Ordens de Trading)

**Criticidade:** ⭐⭐⭐⭐⭐
**Status:** Implementado

**Funcionalidades:**
- 8 tipos de ordens:
  - Market (execução imediata)
  - Limit (preço específico)
  - Stop Loss (proteção)
  - Take Profit (objetivo)
  - Stop Limit (combinação)
  - Trailing Stop (dinâmico)
  - OCO (One-Cancels-Other)
  - Iceberg (grandes volumes)

**Estados:**
```typescript
'pending' | 'open' | 'filled' | 'partially_filled' | 'cancelled' | 'rejected'
```

**Rotas:**
- `POST /orders` - Criar ordem
- `GET /orders` - Listar ordens
- `GET /orders/:id` - Detalhes
- `DELETE /orders/:id` - Cancelar
- `GET /orders/history` - Histórico

**Dependências:**
- `exchanges` (execution)
- `market-data` (pricing)
- `audit` (tracking)
- PostgreSQL (orders)
- Redis (order matching)

---

### 10. positions (Posições de Trading)

**Criticidade:** ⭐⭐⭐⭐⭐
**Status:** Implementado

**Funcionalidades:**
- Futures/margin positions
- Long/short tracking
- Leverage management
- Liquidation monitoring
- PnL calculation (realized/unrealized)

**Modelo:**
```typescript
{
  id: string
  userId: string
  exchangeId: string
  symbol: string
  side: 'long' | 'short'
  size: number
  leverage: number
  entryPrice: number
  currentPrice: number
  unrealizedPnl: number
  realizedPnl: number
  liquidationPrice: number
  status: 'open' | 'closed'
}
```

**Rotas:**
- `GET /positions` - Posições abertas
- `GET /positions/:id` - Detalhes
- `POST /positions/:id/close` - Fechar posição
- `PUT /positions/:id/leverage` - Ajustar leverage

**Dependências:**
- `exchanges` (execution)
- `orders` (entry/exit)
- `market-data` (pricing)

---

### 11. strategies (Estratégias de Trading)

**Criticidade:** ⭐⭐⭐⭐⭐
**Status:** Implementado

**Funcionalidades:**
- Strategy builder
- Backtesting engine
- Signal generation
- Multi-timeframe analysis
- Custom indicators

**Estratégias Built-in:**
- Moving Average Crossover
- RSI Oversold/Overbought
- MACD Divergence
- Bollinger Bands Breakout
- Custom (user-defined)

**Backtesting:**
```typescript
{
  strategyId: string
  symbol: string
  timeframe: string
  startDate: Date
  endDate: Date
  initialCapital: number
  results: {
    totalTrades: number
    winRate: number
    profitFactor: number
    sharpeRatio: number
    maxDrawdown: number
  }
}
```

**Rotas:**
- `POST /strategies` - Criar estratégia
- `GET /strategies` - Listar estratégias
- `POST /strategies/:id/backtest` - Executar backtest
- `POST /strategies/:id/activate` - Ativar estratégia
- `GET /strategies/:id/signals` - Sinais gerados

**Dependências:**
- `market-data` (historical data)
- `orders` (execution)
- `positions` (tracking)
- TimescaleDB (backtesting data)

---

### 12. risk (Gestão de Risco)

**Criticidade:** ⭐⭐⭐⭐⭐
**Status:** Implementado

**Funcionalidades:**
- Value at Risk (VaR)
- Position sizing (Kelly Criterion)
- Portfolio risk analysis
- Correlation analysis
- Drawdown monitoring
- Risk/reward ratio calculation

**Métricas:**
```typescript
{
  portfolioVaR: number      // 95% confidence
  sharpeRatio: number       // Risk-adjusted returns
  sortinoRatio: number      // Downside deviation
  maxDrawdown: number       // Peak-to-trough
  beta: number              // Market correlation
  alpha: number             // Excess returns
}
```

**Rotas:**
- `GET /risk/portfolio` - Análise de portfólio
- `GET /risk/var` - Value at Risk
- `GET /risk/position-size` - Tamanho recomendado
- `GET /risk/correlation` - Matriz de correlação

**Dependências:**
- `positions` (exposures)
- `market-data` (volatility)
- `orders` (historical performance)

---

### 13. bots (Bots de Trading Automatizado)

**Criticidade:** ⭐⭐⭐⭐⭐
**Status:** Implementado

**Funcionalidades:**
- Grid Trading Bot
- DCA (Dollar-Cost Averaging) Bot
- Scalping Bot
- Arbitrage Bot
- Market Making Bot
- Custom Strategy Bot

**Grid Bot:**
```typescript
{
  type: 'grid'
  config: {
    upperPrice: number
    lowerPrice: number
    grids: number
    amountPerGrid: number
    takeProfit: number
  }
}
```

**Rotas:**
- `POST /bots` - Criar bot
- `GET /bots` - Listar bots
- `POST /bots/:id/start` - Iniciar bot
- `POST /bots/:id/stop` - Parar bot
- `GET /bots/:id/performance` - Performance

**Dependências:**
- `strategies` (logic)
- `orders` (execution)
- `risk` (limits)
- Redis (state management)
- PostgreSQL (configuration)

---

## 🟡 Tier 3: Financeiro

### 14. financial (Sistema Financeiro)

**Criticidade:** ⭐⭐⭐⭐
**Status:** Implementado

**Funcionalidades:**
- Invoices (faturamento)
- Expenses (despesas)
- Budgets (orçamentos)
- Payments (pagamentos)
- Tax calculation (impostos)
- Multi-gateway (InfinityPay, Stripe, Banco)

**Módulos:**
```
financial/
├── invoices/
├── expenses/
├── budgets/
├── ledger/           # Livro-razão
├── tax/              # Tax jurisdiction
├── payments/         # Payment processing
└── reports/          # Relatórios fiscais
```

**Rotas:**
- 12 rotas (invoice, expense, budget, ledger, tax, report, payment, gateway, webhook)

**Dependências:**
- `auth`, `tenants`, `audit`
- PostgreSQL (transactions)
- Redis (payment processing)

---

### 15. banco (Sistema de Wallets)

**Criticidade:** ⭐⭐⭐⭐
**Status:** Implementado

**Funcionalidades:**
- Multi-asset wallets
- 4 tipos de wallet:
  - Main (principal)
  - Savings (poupança)
  - Trading (negociação)
  - Staking (yield)
- Deposits/withdrawals
- Internal transfers
- Portfolio analytics
- Price feeds (CoinGecko)

**Modelo:**
```typescript
{
  id: string
  userId: string
  type: 'main' | 'savings' | 'trading' | 'staking'
  asset: string      // BTC, ETH, USDT, etc.
  balance: number
  locked: number     // Em ordens/staking
  available: number  // balance - locked
}
```

**Rotas:**
- `walletRoutes` - Wallet management
- `portfolioRoutes` - Portfolio analytics

**Dependências:**
- `auth`, `tenants`, `audit`
- `market-data` (pricing)
- PostgreSQL (balances)
- Redis (real-time updates)

---

### 16. subscriptions (Assinaturas & Planos)

**Criticidade:** ⭐⭐⭐⭐
**Status:** Implementado

**Funcionalidades:**
- 4 planos: Free, Basic, Pro, Enterprise
- Usage tracking
- Quota management
- Feature flags
- Billing cycles
- Upgrade/downgrade

**Planos:**
```typescript
{
  free: {
    maxExchanges: 1,
    maxBots: 1,
    maxStrategies: 3
  },
  basic: {
    maxExchanges: 3,
    maxBots: 5,
    maxStrategies: 10
  },
  pro: {
    maxExchanges: 10,
    maxBots: 20,
    maxStrategies: 50
  },
  enterprise: {
    maxExchanges: -1,  // unlimited
    maxBots: -1,
    maxStrategies: -1
  }
}
```

**Rotas:**
- `publicSubscriptionRoutes` - Planos públicos
- `authenticatedSubscriptionRoutes` - Gerenciamento
- `usageSubscriptionRoutes` - Uso e quotas
- `adminSubscriptionRoutes` - Admin

**Dependências:**
- `auth`, `tenants`, `financial`

---

## 🔵 Tier 4: Social Trading

### 17. social-trading (Trading Social)

**Criticidade:** ⭐⭐⭐⭐
**Status:** Implementado (3,658 linhas)

**Funcionalidades:**
- 8 serviços completos
- 70+ endpoints
- Copy trading engine
- Trading signals
- Leaderboard com composite scoring
- Social feed
- Performance analytics (Sharpe, Sortino)

**Serviços:**
1. `trader.service.ts` (913 linhas) - Perfis de traders
2. `follow.service.ts` (611 linhas) - Follow/unfollow
3. `copy-trading.service.ts` (359 linhas) - Copy engine
4. `signal.service.ts` (419 linhas) - Sinais
5. `performance.service.ts` (394 linhas) - Métricas avançadas
6. `leaderboard.service.ts` (408 linhas) - Rankings
7. `feed.service.ts` (534 linhas) - Feed social

**Rotas:**
- 7 categorias Swagger
- Copy settings, signals, rankings, feed

**Dependências:**
- `auth`, `strategies`, `orders`, `positions`

---

### 18. p2p-marketplace (Trading P2P)

**Criticidade:** ⭐⭐⭐
**Status:** Implementado

**Funcionalidades:**
- Peer-to-peer trading
- Escrow system
- Dispute resolution
- Rating system
- Multi-payment methods

**Dependências:**
- `auth`, `banco`, `audit`

---

### 19. affiliate (Programa de Afiliados)

**Criticidade:** ⭐⭐⭐
**Status:** Implementado

**Funcionalidades:**
- Referral links
- Commission tracking
- Payout management
- Multi-tier commissions

**Dependências:**
- `auth`, `tenants`

---

### 20. mmn (Multi-Level Marketing)

**Criticidade:** ⭐⭐⭐
**Status:** Implementado

**Funcionalidades:**
- Network visualization
- Level-based rewards
- Genealogy tree
- Binary/unilevel plans

**Dependências:**
- `auth`, `tenants`, `affiliate`

---

## 🟢 Tier 5: Operacional

### 21-29. Módulos Operacionais

**notifications** - Sistema multi-canal
**support** - Help desk completo
**sales** - CRM e pipeline
**marketing** - Campanhas de email
**documents** - Gestão de arquivos
**departments** - Organização
**configurations** - Configurações

Todos implementados e operacionais.

---

## ⚪ Tier 6: Executivo

### 30. ceo (Dashboard Executivo)

**Criticidade:** ⭐⭐
**Status:** Implementado

**Funcionalidades:**
- KPIs agregados
- Métricas de receita
- User growth
- Trading volume
- System health

**Dependências:**
- 10+ módulos (todos os operacionais)

---

*Gerado em: 2025-10-17*
