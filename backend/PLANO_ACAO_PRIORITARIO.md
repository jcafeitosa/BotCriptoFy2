# 🎯 Plano de Ação Prioritário - BotCriptoFy2

**Data**: 2025-10-17
**Objetivo**: Preparar sistema para produção em 6-8 semanas
**Status Atual**: 80% completo, 40% do Trading System implementado

---

## 🚨 SEMANA 1-2: BLOQUEADORES CRÍTICOS

### 1. Cache Manager (Prioridade: CRÍTICA)
**ETA**: 3-4 dias | **Linhas**: ~800 | **Impacto**: +50-70% performance

```typescript
// src/cache/cache-manager.ts
// Já existe especificação em: docs/analysis/module-analysis-and-improvements.md
```

**Tasks**:
- [ ] Implementar Redis caching layer
- [ ] Estratégias de invalidação (TTL, LRU, tags)
- [ ] Cache warming para dados críticos
- [ ] Monitoring de hit rate
- [ ] Testes de performance

**Arquivos a criar**:
```
src/cache/
├── cache-manager.ts          (core manager)
├── strategies/
│   ├── ttl.strategy.ts
│   ├── lru.strategy.ts
│   └── tagged.strategy.ts
├── decorators/
│   └── cacheable.decorator.ts
└── types/
    └── cache.types.ts
```

---

### 2. Positions Module (Prioridade: CRÍTICA)
**ETA**: 5-6 dias | **Linhas**: ~2,500 | **Impacto**: Habilita trading real

**Funcionalidades core**:
- [ ] Position tracking (open, closed, partial)
- [ ] Real-time P&L calculation
- [ ] Margin management (cross/isolated)
- [ ] Leverage control (1x-125x)
- [ ] Position sizing calculator
- [ ] Close position (market/limit)
- [ ] Position history & analytics

**Schema** (`src/modules/positions/schema/positions.schema.ts`):
```typescript
export const positions = pgTable('positions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  tenantId: uuid('tenant_id').notNull(),

  // Position Details
  exchangeId: varchar('exchange_id', { length: 50 }).notNull(),
  symbol: varchar('symbol', { length: 20 }).notNull(),
  side: varchar('side', { length: 10 }).notNull(), // long, short
  type: varchar('type', { length: 20 }).notNull(), // spot, margin, futures

  // Quantities
  entryPrice: numeric('entry_price', { precision: 20, scale: 8 }).notNull(),
  currentPrice: numeric('current_price', { precision: 20, scale: 8 }).notNull(),
  quantity: numeric('quantity', { precision: 20, scale: 8 }).notNull(),
  leverage: numeric('leverage', { precision: 10, scale: 2 }).default('1'),

  // P&L
  unrealizedPnl: numeric('unrealized_pnl', { precision: 20, scale: 8 }).default('0'),
  realizedPnl: numeric('realized_pnl', { precision: 20, scale: 8 }).default('0'),
  pnlPercent: numeric('pnl_percent', { precision: 10, scale: 4 }).default('0'),

  // Risk Management
  stopLoss: numeric('stop_loss', { precision: 20, scale: 8 }),
  takeProfit: numeric('take_profit', { precision: 20, scale: 8 }),
  trailingStop: numeric('trailing_stop', { precision: 10, scale: 4 }),
  liquidationPrice: numeric('liquidation_price', { precision: 20, scale: 8 }),

  // Margin (for margin/futures)
  marginUsed: numeric('margin_used', { precision: 20, scale: 8 }).default('0'),
  marginAvailable: numeric('margin_available', { precision: 20, scale: 8 }),
  marginLevel: numeric('margin_level', { precision: 10, scale: 4 }), // %

  // Status
  status: varchar('status', { length: 20 }).notNull().default('open'), // open, closed, liquidated

  // Metadata
  openedAt: timestamp('opened_at', { withTimezone: true }).defaultNow().notNull(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  lastUpdatedAt: timestamp('last_updated_at', { withTimezone: true }).defaultNow().notNull(),

  // Linking
  openOrderId: uuid('open_order_id'), // FK to orders
  closeOrderId: uuid('close_order_id'),
  strategyId: uuid('strategy_id'), // FK to strategies
  botId: uuid('bot_id'), // FK to bots
});
```

**Service** (`src/modules/positions/services/position.service.ts`):
```typescript
export class PositionService {
  // CRUD
  async openPosition(params: OpenPositionParams): Promise<Position>
  async getPosition(positionId: string): Promise<Position | null>
  async getPositions(options: PositionQueryOptions): Promise<Position[]>
  async closePosition(positionId: string, params: ClosePositionParams): Promise<Position>

  // P&L Calculation
  async updatePositionPnL(positionId: string): Promise<Position>
  async calculateUnrealizedPnL(position: Position, currentPrice: number): Promise<number>
  async calculateRealizedPnL(position: Position): Promise<number>

  // Margin Management
  async calculateMarginUsed(position: Position): Promise<number>
  async calculateLiquidationPrice(position: Position): Promise<number>
  async checkMarginCall(userId: string): Promise<MarginCallStatus>

  // Risk Management
  async checkStopLoss(position: Position, currentPrice: number): Promise<boolean>
  async checkTakeProfit(position: Position, currentPrice: number): Promise<boolean>
  async updateTrailingStop(position: Position, currentPrice: number): Promise<void>

  // Analytics
  async getPositionStatistics(userId: string, tenantId: string): Promise<PositionStatistics>
  async getPositionHistory(userId: string, options: HistoryOptions): Promise<Position[]>
}
```

---

### 3. Risk Management Module (Prioridade: CRÍTICA)
**ETA**: 4-5 dias | **Linhas**: ~1,800 | **Impacto**: Segurança do trading

**Funcionalidades**:
- [ ] Account-level risk limits
- [ ] Position size calculator (Kelly Criterion, Fixed %, etc)
- [ ] Drawdown protection (daily, weekly, total)
- [ ] Margin call warnings
- [ ] Risk scoring per trade
- [ ] Max open positions limit
- [ ] Concentration risk (per symbol, per exchange)

**Schema** (`src/modules/risk/schema/risk.schema.ts`):
```typescript
export const riskSettings = pgTable('risk_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  tenantId: uuid('tenant_id').notNull(),

  // Account Limits
  maxDrawdownPercent: numeric('max_drawdown_percent', { precision: 10, scale: 4 }).default('20'), // 20%
  maxDailyLossPercent: numeric('max_daily_loss_percent', { precision: 10, scale: 4 }).default('5'), // 5%
  maxDailyLossAmount: numeric('max_daily_loss_amount', { precision: 20, scale: 8 }),

  // Position Limits
  maxPositionSizePercent: numeric('max_position_size_percent', { precision: 10, scale: 4 }).default('10'), // 10% of portfolio
  maxLeverage: numeric('max_leverage', { precision: 10, scale: 2 }).default('10'),
  maxOpenPositions: integer('max_open_positions').default(10),

  // Concentration Limits
  maxExposurePerSymbol: numeric('max_exposure_per_symbol', { precision: 10, scale: 4 }).default('20'), // 20%
  maxExposurePerExchange: numeric('max_exposure_per_exchange', { precision: 10, scale: 4 }).default('50'), // 50%

  // Risk Score Thresholds
  minRiskScore: numeric('min_risk_score', { precision: 10, scale: 2 }).default('3'), // 1-10 scale

  // Alerts
  marginCallThreshold: numeric('margin_call_threshold', { precision: 10, scale: 4 }).default('80'), // 80%

  // Status
  isActive: boolean('is_active').default(true),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const riskViolations = pgTable('risk_violations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  tenantId: uuid('tenant_id').notNull(),

  // Violation Details
  type: varchar('type', { length: 50 }).notNull(), // max_drawdown, daily_loss, position_size, etc
  severity: varchar('severity', { length: 20 }).notNull(), // warning, critical, blocked

  // Context
  currentValue: numeric('current_value', { precision: 20, scale: 8 }).notNull(),
  limitValue: numeric('limit_value', { precision: 20, scale: 8 }).notNull(),
  description: text('description'),

  // Action Taken
  actionTaken: varchar('action_taken', { length: 50 }), // alert_sent, position_closed, trading_blocked

  // Metadata
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
});
```

**Service** (`src/modules/risk/services/risk.service.ts`):
```typescript
export class RiskService {
  // Settings Management
  async getRiskSettings(userId: string): Promise<RiskSettings>
  async updateRiskSettings(userId: string, settings: Partial<RiskSettings>): Promise<RiskSettings>

  // Pre-Trade Risk Check
  async validateTrade(params: TradeValidationParams): Promise<RiskCheckResult>
  async calculatePositionSize(params: PositionSizeParams): Promise<number>
  async calculateRiskScore(trade: Trade): Promise<number>

  // Real-Time Monitoring
  async checkAccountLimits(userId: string): Promise<LimitCheckResult>
  async checkDrawdown(userId: string): Promise<DrawdownStatus>
  async checkDailyLoss(userId: string): Promise<DailyLossStatus>
  async checkConcentration(userId: string): Promise<ConcentrationStatus>

  // Violation Handling
  async recordViolation(violation: RiskViolation): Promise<void>
  async handleViolation(violation: RiskViolation): Promise<void>
  async getViolations(userId: string, options: ViolationQueryOptions): Promise<RiskViolation[]>

  // Analytics
  async getRiskMetrics(userId: string): Promise<RiskMetrics>
}
```

---

## 📅 SEMANA 3-4: CORE FEATURES

### 4. Bots Module (Prioridade: ALTA)
**ETA**: 6-7 dias | **Linhas**: ~3,500 | **Impacto**: Core feature

**Bot Types a implementar**:
1. **Scalping Bot** - High frequency, small gains
2. **DCA Bot** (Dollar-Cost Averaging) - Compra periódica
3. **Grid Bot** - Grid trading (níveis de compra/venda)
4. **Arbitrage Bot** - Cross-exchange arbitrage
5. **Swing Bot** - Trend following
6. **Copy Trading Bot** - Replica trades de traders

**Schema** (`src/modules/bots/schema/bots.schema.ts`):
```typescript
export const bots = pgTable('bots', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  tenantId: uuid('tenant_id').notNull(),

  // Bot Details
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 20 }).notNull(), // scalping, dca, grid, arbitrage, swing, copy

  // Configuration
  exchangeId: varchar('exchange_id', { length: 50 }).notNull(),
  symbol: varchar('symbol', { length: 20 }).notNull(),
  strategyId: uuid('strategy_id'), // FK to strategies (optional)

  // Bot-specific config
  config: jsonb('config').notNull(), // Bot-type specific parameters

  // Risk Management
  maxPositionSize: numeric('max_position_size', { precision: 20, scale: 8 }),
  stopLossPercent: numeric('stop_loss_percent', { precision: 10, scale: 4 }),
  takeProfitPercent: numeric('take_profit_percent', { precision: 10, scale: 4 }),

  // Trading Mode
  mode: varchar('mode', { length: 20 }).notNull().default('paper'), // paper, live

  // Performance
  totalTrades: integer('total_trades').default(0),
  winningTrades: integer('winning_trades').default(0),
  losingTrades: integer('losing_trades').default(0),
  totalPnl: numeric('total_pnl', { precision: 20, scale: 8 }).default('0'),
  winRate: numeric('win_rate', { precision: 10, scale: 4 }),
  profitFactor: numeric('profit_factor', { precision: 10, scale: 4 }),

  // Status
  status: varchar('status', { length: 20 }).notNull().default('stopped'), // stopped, running, paused, error

  // Metadata
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  stoppedAt: timestamp('stopped_at', { withTimezone: true }),
});
```

**Service** (`src/modules/bots/services/bot.service.ts`):
```typescript
export class BotService {
  // Lifecycle
  async createBot(params: CreateBotParams): Promise<Bot>
  async startBot(botId: string): Promise<Bot>
  async stopBot(botId: string): Promise<Bot>
  async pauseBot(botId: string): Promise<Bot>
  async deleteBot(botId: string): Promise<void>

  // Execution
  async executeBotCycle(botId: string): Promise<BotExecutionResult>
  async processSignal(botId: string, signal: Signal): Promise<void>

  // Monitoring
  async getBotStatus(botId: string): Promise<BotStatus>
  async getBotPerformance(botId: string): Promise<BotPerformance>
  async getBotLogs(botId: string, options: LogQueryOptions): Promise<BotLog[]>

  // Analytics
  async getBotStatistics(userId: string): Promise<BotStatistics>
}
```

---

## 📅 SEMANA 5-6: INFRAESTRUTURA

### 5. Monitoring System (Prioridade: ALTA)
**ETA**: 2-3 dias | **Setup**: Prometheus + Grafana | **Impacto**: Observability

**Components**:
- [ ] Prometheus metrics export
- [ ] Grafana dashboards (5 dashboards essenciais)
- [ ] Alerting rules (10 alertas críticos)
- [ ] Log aggregation (Winston → Elasticsearch)
- [ ] Performance tracing (Jaeger)

**Metrics a exportar**:
```typescript
// src/monitoring/metrics.ts
import { register, Counter, Histogram, Gauge } from 'prom-client';

export const metrics = {
  // HTTP Metrics
  httpRequestsTotal: new Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status'],
  }),

  httpRequestDuration: new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration',
    labelNames: ['method', 'route'],
  }),

  // Trading Metrics
  ordersTotal: new Counter({
    name: 'orders_total',
    help: 'Total orders',
    labelNames: ['exchange', 'symbol', 'type', 'status'],
  }),

  positionsOpen: new Gauge({
    name: 'positions_open',
    help: 'Open positions count',
    labelNames: ['exchange', 'symbol'],
  }),

  pnlTotal: new Gauge({
    name: 'pnl_total',
    help: 'Total P&L',
    labelNames: ['user_id'],
  }),

  // System Metrics
  cacheHitRate: new Gauge({
    name: 'cache_hit_rate',
    help: 'Cache hit rate percentage',
  }),

  dbConnectionsActive: new Gauge({
    name: 'db_connections_active',
    help: 'Active database connections',
  }),
};
```

**Dashboards Grafana**:
1. **System Overview**: CPU, memory, requests/sec
2. **Trading Dashboard**: Orders, positions, P&L
3. **Exchange Health**: API status, latencies
4. **User Activity**: Active users, signup funnel
5. **Errors & Alerts**: Error rate, critical alerts

---

### 6. Backup & DR System (Prioridade: ALTA)
**ETA**: 3-4 dias | **Setup**: Automated backups | **Impacto**: Confiabilidade

**Components**:
- [ ] PostgreSQL automated backups (daily + WAL archiving)
- [ ] TimescaleDB chunk backups
- [ ] Redis RDB/AOF snapshots (hourly)
- [ ] S3 backup storage (AWS/MinIO)
- [ ] Recovery procedures documentation
- [ ] Disaster recovery testing

**Backup Strategy**:
```bash
# PostgreSQL Full Backup (Daily at 3 AM)
pg_dump -Fc botcriptofy2 > /backups/full_$(date +%Y%m%d).dump

# PostgreSQL WAL Archiving (Continuous)
archive_command = 'cp %p /backups/wal/%f'

# TimescaleDB Hypertable Backup
SELECT timescaledb_pre_restore();
pg_dump -Fc -t market_ohlcv > /backups/ohlcv_$(date +%Y%m%d).dump
SELECT timescaledb_post_restore();

# Redis Backup (Hourly)
redis-cli BGSAVE
cp /var/lib/redis/dump.rdb /backups/redis_$(date +%Y%m%d_%H).rdb

# Upload to S3
aws s3 sync /backups/ s3://botcriptofy2-backups/$(date +%Y%m%d)/
```

**Recovery Procedures**:
```markdown
## RTO (Recovery Time Objective): < 1 hour
## RPO (Recovery Point Objective): < 5 minutes

### Full System Recovery:
1. Spin up new infrastructure (Terraform)
2. Restore latest PostgreSQL dump (15-20 min)
3. Apply WAL files since backup (5-10 min)
4. Restore Redis snapshot (2-3 min)
5. Verify data integrity (10 min)
6. Switch DNS to new instance (5 min)
7. Resume trading operations (5 min)

TOTAL: ~45-60 minutes
```

---

## 📅 SEMANA 7-8: POLIMENTO

### 7. Portfolio Analytics (Prioridade: MÉDIA)
**ETA**: 3-4 dias | **Linhas**: ~1,200 | **Impacto**: User insights

**Funcionalidades**:
- [ ] Risk metrics (Sharpe, Sortino, Calmar ratios)
- [ ] Performance analytics (daily, weekly, monthly, all-time)
- [ ] Diversification analysis
- [ ] Asset correlation matrix
- [ ] Benchmarking (vs BTC, vs market)

---

### 8. Testing Infrastructure (Prioridade: ALTA)
**ETA**: 5-6 dias | **Target**: 80% coverage | **Impacto**: Qualidade

**Tasks**:
- [ ] Unit tests para módulos críticos (Positions, Risk, Bots)
- [ ] Integration tests (Exchange APIs, Database)
- [ ] E2E tests (User flows críticos)
- [ ] Load testing (10k concurrent users)
- [ ] Security testing (OWASP Top 10)

**Tools**:
```bash
# Test Runner: Bun native
bun test

# Coverage: c8
bun test --coverage

# E2E: Playwright
bunx playwright test

# Load: k6
k6 run load-test.js --vus 100 --duration 30s
```

---

## ✅ CHECKLIST FINAL (Production Readiness)

### Code Quality
- [ ] TypeScript errors: 0
- [ ] ESLint warnings: < 10
- [ ] Test coverage: > 80%
- [ ] JSDoc coverage: > 90%

### Performance
- [ ] API response time: p95 < 200ms
- [ ] Cache hit rate: > 70%
- [ ] Database query time: p95 < 50ms
- [ ] Load tested: 10k concurrent users

### Security
- [ ] OWASP Top 10 mitigated
- [ ] Secrets management (env vars, not hardcoded)
- [ ] API rate limiting active
- [ ] Audit logging comprehensive

### Reliability
- [ ] Backup/DR tested
- [ ] Monitoring dashboards live
- [ ] Alerting rules configured
- [ ] Recovery procedures documented

### Trading Specific
- [ ] Positions Module live
- [ ] Risk Management enforced
- [ ] Bots Module operational
- [ ] P&L tracking accurate
- [ ] Exchange integrations tested

---

## 📊 CRONOGRAMA CONSOLIDADO

```
SEMANA 1-2 (CRÍTICO)
├─ D1-4:   Cache Manager         (800 L)
├─ D5-10:  Positions Module      (2,500 L)
└─ D11-14: Risk Management       (1,800 L)

SEMANA 3-4 (CORE FEATURES)
├─ D15-21: Bots Module           (3,500 L)
└─ D22-28: Social Trading completo (500 L)

SEMANA 5-6 (INFRAESTRUTURA)
├─ D29-31: Monitoring            (500 L setup)
├─ D32-35: Backup/DR             (1,000 L)
└─ D36-42: Testing Infrastructure

SEMANA 7-8 (POLIMENTO)
├─ D43-46: Portfolio Analytics   (1,200 L)
├─ D47-49: Documentation updates
├─ D50-52: Load testing
├─ D53-54: Security audit
└─ D55-56: Production deploy prep

TOTAL: 56 dias (~8 semanas)
       ~11,300 linhas de código
```

---

## 💰 ESTIMATIVA DE ESFORÇO

```
┌─────────────────────────────────────────────────┐
│ MÓDULO               │ LINHAS │ DIAS │ CUSTO    │
├──────────────────────┼────────┼──────┼──────────┤
│ Cache Manager        │    800 │    4 │ R$ 8k    │
│ Positions Module     │  2,500 │    6 │ R$ 12k   │
│ Risk Management      │  1,800 │    5 │ R$ 10k   │
│ Bots Module          │  3,500 │    7 │ R$ 14k   │
│ Monitoring Setup     │    500 │    3 │ R$ 6k    │
│ Backup/DR            │  1,000 │    4 │ R$ 8k    │
│ Portfolio Analytics  │  1,200 │    4 │ R$ 8k    │
│ Testing Infra        │      - │    6 │ R$ 12k   │
│ Documentation        │      - │    3 │ R$ 6k    │
│ Polishing            │      - │    4 │ R$ 8k    │
├──────────────────────┼────────┼──────┼──────────┤
│ TOTAL                │ 11,300 │   46 │ R$ 92k   │
└─────────────────────────────────────────────────┘

Assumindo: R$ 2k/dia (dev sênior especializado)
Prazo Real: 8 semanas (56 dias incluindo revisões)
```

---

## 🎯 MÉTRICAS DE SUCESSO

### Após Implementação Completa:

```
┌──────────────────────────────────────────────┐
│ MÉTRICA                  │ ATUAL │ META     │
├──────────────────────────┼───────┼──────────┤
│ Código Completo          │  80%  │ 100%     │
│ Trading System           │  40%  │ 100%     │
│ Test Coverage            │  35%  │  80%+    │
│ Prod-Ready Score         │  60%  │  95%+    │
│ Performance (p95)        │ 350ms │ <200ms   │
│ Cache Hit Rate           │   0%  │  70%+    │
│ Uptime SLA               │   -   │ 99.9%    │
│ Security Score           │  B    │   A+     │
└──────────────────────────┴───────┴──────────┘
```

---

## 🚀 GO-LIVE CHECKLIST

```
┌─────────────────────────────────────────────────┐
│ PRÉ-LANÇAMENTO                                  │
├─────────────────────────────────────────────────┤
│ □ Todos os módulos críticos implementados       │
│ □ Tests >80% coverage                           │
│ □ Security audit passed                         │
│ □ Performance targets met                       │
│ □ Monitoring dashboards live                    │
│ □ Backup/DR tested successfully                 │
│ □ Load testing (10k users) passed               │
│ □ Documentation 100% updated                    │
│ □ Support team trained                          │
│ □ Incident response plan ready                  │
│ □ Rollback procedure documented                 │
│ □ Legal compliance verified (LGPD, terms)       │
└─────────────────────────────────────────────────┘
```

---

**Próximo Passo Imediato**: Começar Cache Manager (Semana 1, Dias 1-4)

**Arquivo de referência**: `/docs/analysis/module-analysis-and-improvements.md`
**Código exemplo**: Já existe estrutura básica, precisa implementação completa

---

**Autor**: Claude Code Strategic Planning
**Baseado em**: Análise de 78,994 linhas + 65 documentos técnicos
**Última atualização**: 2025-10-17
