# FASE 1.5 - MONITORING & OBSERVABILITY - PLANO DE IMPLEMENTAÇÃO

## 📊 Status Atual
- **FASE 1 Progresso**: 80% (4/5 sistemas completos)
- **Sistema Pendente**: Monitoring & Observability
- **Prioridade**: 🔴 ALTA
- **Tempo Estimado**: 1-1.5 semanas (40-53 horas)

---

## 🎯 Objetivo da FASE 1.5

Implementar sistema completo de monitoring e observability para:
- Coletar métricas de performance (Prometheus)
- Rastreamento distribuído (OpenTelemetry + Jaeger)
- Dashboards de visualização (Grafana)
- Sistema de alertas automático
- Health checks avançados

---

## ✅ Infraestrutura Existente (Reutilizar)

### Logger (Winston) - EXCELENTE ✅
- **Arquivo**: `src/utils/logger.ts` (451 linhas)
- **Níveis**: fatal, error, warn, info, http, debug, trace
- **Features**:
  - JSON estruturado (OpenTelemetry-compatible)
  - Daily rotation
  - Correlation IDs
  - Helper functions: `logMetric()`, `logPerformance()`, `logSecurity()`, `logAudit()`
- **Ação**: Reutilizar e expandir

### Health Checks - BOM ✅
- **Arquivo**: `src/utils/health-check.ts` (194 linhas)
- **Checks**: Database, Redis, Ollama
- **Status levels**: healthy, degraded, unhealthy
- **Ação**: Adicionar métricas endpoint

### Audit System - COMPLETO ✅
- **Arquivo**: `src/modules/audit/services/audit-logger.service.ts` (311 linhas)
- **50+ event types** estruturados
- **Estatísticas agregadas**
- **Ação**: Mapear eventos para métricas

### Rate Limiting - COMPLETO ✅
- **Arquivo**: `src/modules/rate-limiting/services/rate-limit.service.ts` (221 linhas)
- **Stats tracking**: totalRequests, blockedRequests, allowedRequests, blockRate
- **Ação**: Exportar stats como Prometheus gauge

---

## ❌ Gaps a Implementar

### 1. Prometheus Metrics ❌
- **Prioridade**: P0 - Crítico
- **Tempo**: 4-6 horas
- Exportar métricas em formato Prometheus
- Endpoint `/metrics` para scraping
- Métricas HTTP, DB, Cache

### 2. OpenTelemetry Tracing ❌
- **Prioridade**: P1 - Alto
- **Tempo**: 6-8 horas
- Distributed tracing entre serviços
- Integração com Jaeger
- Auto-instrumentation

### 3. AsyncLocalStorage Context ❌
- **Prioridade**: P1 - Alto
- **Tempo**: 2-3 horas
- Context propagation automático
- Substituir randomUUID por contexto real

### 4. Custom Metrics (Trading) ❌
- **Prioridade**: P1 - Alto
- **Tempo**: 8-10 horas
- Exchange connectivity
- Order execution latency
- Strategy performance

### 5. Grafana Dashboards ❌
- **Prioridade**: P2 - Médio
- **Tempo**: 5-6 horas
- Pre-built dashboards
- Common queries
- Alerting rules

---

## 🏗️ Arquitetura Proposta

```
┌─────────────────────────────────────────────────────────┐
│                  MONITORING STACK                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  PROMETHEUS  │  │   JAEGER     │  │   GRAFANA    │ │
│  │  (Metrics)   │  │  (Tracing)   │  │ (Dashboards) │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                  │                  │          │
│         └──────────────────┴──────────────────┘          │
│                            │                              │
└────────────────────────────┼──────────────────────────────┘
                             │
                    ┌────────▼─────────┐
                    │   ELYSIA APP     │
                    │  (BotCriptoFy2)  │
                    └────────┬─────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼─────┐      ┌──────▼──────┐     ┌──────▼──────┐
   │ Metrics  │      │  Tracing    │     │   Logs      │
   │Middleware│      │ Middleware  │     │  Middleware │
   └──────────┘      └─────────────┘     └─────────────┘
```

---

## 📂 Estrutura de Arquivos a Criar

```
backend/src/
├── monitoring/                           # NOVO - Pasta principal
│   ├── index.ts                         # Exports principais
│   ├── types.ts                         # Type definitions
│   │
│   ├── metrics/                         # Prometheus metrics
│   │   ├── prometheus.ts                # Setup do prom-client
│   │   ├── collectors/                  # Collectors por domínio
│   │   │   ├── http.metrics.ts         # HTTP request metrics
│   │   │   ├── database.metrics.ts     # DB query metrics
│   │   │   ├── cache.metrics.ts        # Redis cache metrics
│   │   │   ├── trading.metrics.ts      # Trading-specific (future)
│   │   │   └── system.metrics.ts       # System (CPU, memory)
│   │   └── registry.ts                  # Central registry
│   │
│   ├── tracing/                         # OpenTelemetry tracing
│   │   ├── tracer.ts                    # Tracer setup
│   │   ├── instrumentation.ts           # Auto-instrumentation
│   │   ├── spans.ts                     # Span helpers
│   │   └── context.ts                   # Context management
│   │
│   ├── alerts/                          # Alerting system
│   │   ├── rules.ts                     # Alert rules definitions
│   │   ├── handlers.ts                  # Alert handlers
│   │   └── notifiers.ts                 # Notification integrations
│   │
│   └── context/                         # Request context
│       └── request-context.ts           # AsyncLocalStorage setup
│
├── middleware/
│   ├── logger.middleware.ts             # EXISTENTE
│   ├── metrics.middleware.ts            # NOVO - Prometheus metrics
│   └── tracing.middleware.ts            # NOVO - OpenTelemetry
│
└── routes/
    ├── health.routes.ts                 # EXISTENTE - expandir
    └── metrics.routes.ts                # NOVO - /metrics endpoint
```

---

## 📦 Dependências a Adicionar

```json
{
  "dependencies": {
    "prom-client": "^15.1.0",
    "@opentelemetry/api": "^1.7.0",
    "@opentelemetry/sdk-node": "^0.45.0",
    "@opentelemetry/exporter-jaeger": "^1.19.0",
    "@opentelemetry/instrumentation-http": "^0.45.0",
    "@opentelemetry/instrumentation-express": "^0.34.0",
    "@opentelemetry/instrumentation-pg": "^0.37.0",
    "@opentelemetry/instrumentation-redis-4": "^0.37.0"
  },
  "devDependencies": {
    "@types/prom-client": "^1.0.0"
  }
}
```

---

## 🎯 Métricas Críticas a Implementar

### HTTP & API Metrics
```typescript
// Counter: Total de requests
http_requests_total{method, path, status}

// Histogram: Duração dos requests
http_request_duration_seconds{method, path}
  - Buckets: 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10

// Gauge: Conexões ativas
http_active_connections
```

### Database Metrics
```typescript
// Counter: Queries executadas
db_queries_total{type, table}

// Histogram: Latência das queries
db_query_duration_seconds{type}
  - Buckets: 0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1

// Gauge: Connection pool
db_pool_connections{state} // state: idle, active, waiting
```

### Cache Metrics (Redis)
```typescript
// Counter: Cache operations
cache_operations_total{operation, namespace, result}
  - operation: get, set, del
  - result: hit, miss, success, error

// Gauge: Hit rate
cache_hit_rate{namespace}

// Gauge: Memory usage
cache_memory_usage_bytes{namespace}
```

### Rate Limiting Metrics
```typescript
// Counter: Requests bloqueadas
rate_limit_blocked_total{rule}

// Gauge: Block rate percentage
rate_limit_block_rate{rule}

// Counter: Total requests
rate_limit_requests_total{rule}
```

### Trading Metrics (Future)
```typescript
// Gauge: Exchange connectivity
exchange_connected{exchange}

// Histogram: Order execution time
order_execution_duration_seconds{exchange, type}

// Counter: Trades executed
trades_total{exchange, strategy, result}

// Gauge: Portfolio value
portfolio_value_usd{tenant}
```

### System Metrics
```typescript
// Gauge: Memory usage
nodejs_memory_usage_bytes{type} // type: rss, heapTotal, heapUsed, external

// Gauge: CPU usage
nodejs_cpu_usage_percent

// Counter: Garbage collections
nodejs_gc_runs_total{type}
```

---

## 📊 Dashboard Grafana (Estrutura)

### Dashboard 1: API Health
- Request rate (RPS)
- Error rate (%)
- Latency percentiles (p50, p95, p99)
- Active connections
- Top endpoints by traffic
- Top endpoints by latency

### Dashboard 2: Database Performance
- Query rate (QPS)
- Slow queries (>100ms)
- Connection pool usage
- Query latency by type
- Table access patterns

### Dashboard 3: Cache Performance
- Hit/Miss ratio
- Cache latency
- Memory usage
- Eviction rate
- Operations per second

### Dashboard 4: System Resources
- CPU usage
- Memory usage (RSS, Heap)
- GC frequency and duration
- Event loop lag
- Active handles

### Dashboard 5: Business Metrics (Future)
- Active users
- API calls per tenant
- Trading volume
- Revenue metrics

---

## 🚦 Alert Rules Recomendadas

### Critical Alerts (P0)
```yaml
- alert: APIHighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
  for: 2m
  severity: critical
  message: "API error rate above 5% for 2 minutes"

- alert: DatabaseConnectionPoolExhausted
  expr: db_pool_connections{state="waiting"} > 0
  for: 1m
  severity: critical
  message: "Database connection pool exhausted"

- alert: HighMemoryUsage
  expr: nodejs_memory_usage_bytes{type="heapUsed"} / nodejs_memory_usage_bytes{type="heapTotal"} > 0.90
  for: 5m
  severity: critical
  message: "Memory usage above 90%"
```

### Warning Alerts (P1)
```yaml
- alert: SlowAPIResponses
  expr: histogram_quantile(0.95, http_request_duration_seconds) > 1
  for: 5m
  severity: warning
  message: "95th percentile API response time above 1s"

- alert: CacheLowHitRate
  expr: cache_hit_rate < 0.70
  for: 10m
  severity: warning
  message: "Cache hit rate below 70%"

- alert: RateLimitHighBlockRate
  expr: rate_limit_block_rate > 0.10
  for: 5m
  severity: warning
  message: "Rate limit blocking more than 10% of requests"
```

---

## 🗓️ Cronograma de Implementação (1-1.5 semanas)

### Dia 1-2: Setup Básico (12-16h)
- [ ] Adicionar dependências (`prom-client`, `@opentelemetry/*`)
- [ ] Criar estrutura de pastas (`src/monitoring/`)
- [ ] Implementar Prometheus setup básico
- [ ] Criar `/metrics` endpoint
- [ ] Implementar HTTP metrics middleware
- [ ] Testar coleta básica de métricas

### Dia 3-4: Métricas Avançadas (12-16h)
- [ ] Implementar database metrics
- [ ] Implementar cache metrics
- [ ] Integrar rate-limiting stats com Prometheus
- [ ] Implementar system metrics (CPU, memory, GC)
- [ ] AsyncLocalStorage para request context
- [ ] Testar todas as métricas

### Dia 5-6: Tracing e Observabilidade (12-16h)
- [ ] Setup OpenTelemetry SDK
- [ ] Configurar Jaeger exporter
- [ ] Implementar tracing middleware
- [ ] Auto-instrumentation (HTTP, DB, Redis)
- [ ] Criar span helpers
- [ ] Testar distributed tracing

### Dia 7: Dashboards e Alerting (6-8h)
- [ ] Criar Grafana dashboards
- [ ] Configurar alerting rules
- [ ] Integrar notificações (Telegram/Email)
- [ ] Documentação completa
- [ ] Testes end-to-end

---

## 🧪 Testes de Validação

### Métricas
```bash
# Verificar endpoint de métricas
curl http://localhost:3000/metrics

# Verificar formato Prometheus
curl http://localhost:3000/metrics | grep "http_requests_total"

# Simular carga
for i in {1..100}; do curl http://localhost:3000/health; done

# Verificar contadores atualizados
curl http://localhost:3000/metrics | grep "http_requests_total"
```

### Tracing
```bash
# Verificar Jaeger UI
open http://localhost:16686

# Fazer request com correlation ID
curl -H "x-correlation-id: test-123" http://localhost:3000/api/user/profile

# Buscar trace no Jaeger UI
# Verificar spans para: HTTP → Auth → Database → Cache
```

### Alertas
```bash
# Simular erro rate alto
for i in {1..50}; do curl http://localhost:3000/api/nonexistent; done

# Verificar se alerta disparou
# Verificar notificação recebida (Telegram/Email)
```

---

## 📚 Referências e Documentação

### Prometheus
- [prom-client documentation](https://github.com/siimon/prom-client)
- [Prometheus best practices](https://prometheus.io/docs/practices/naming/)
- [Metric types explained](https://prometheus.io/docs/concepts/metric_types/)

### OpenTelemetry
- [OpenTelemetry JS docs](https://opentelemetry.io/docs/instrumentation/js/)
- [Auto-instrumentation](https://opentelemetry.io/docs/instrumentation/js/automatic/)
- [Jaeger integration](https://www.jaegertracing.io/docs/latest/getting-started/)

### Grafana
- [Dashboard best practices](https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/best-practices/)
- [Alerting rules](https://grafana.com/docs/grafana/latest/alerting/)

---

## ✅ Checklist de Completude FASE 1.5

- [ ] Prometheus client instalado e configurado
- [ ] Endpoint `/metrics` criado e funcional
- [ ] HTTP metrics coletando (request count, duration, status)
- [ ] Database metrics coletando (query count, latency)
- [ ] Cache metrics coletando (hit rate, operations)
- [ ] Rate limiting metrics exportadas
- [ ] System metrics coletando (CPU, memory, GC)
- [ ] OpenTelemetry SDK configurado
- [ ] Jaeger exporter funcionando
- [ ] Tracing middleware ativo
- [ ] Auto-instrumentation para HTTP, DB, Redis
- [ ] AsyncLocalStorage implementado
- [ ] Correlation IDs propagando em todos os traces
- [ ] Grafana dashboards criados (mínimo 3)
- [ ] Alert rules configuradas (mínimo 5)
- [ ] Notificações de alerta funcionando
- [ ] Documentação completa
- [ ] Testes de validação passando
- [ ] Commit final criado

---

## 🎯 Critérios de Sucesso

### Performance
- ✅ Overhead de metrics < 5% na latência
- ✅ Overhead de tracing < 10% na latência
- ✅ Memory usage increase < 50MB

### Funcionalidade
- ✅ 20+ métricas sendo coletadas
- ✅ Distributed tracing funcionando
- ✅ 5+ dashboards criados
- ✅ 10+ alert rules configuradas
- ✅ Alertas disparando corretamente

### Qualidade
- ✅ Zero erros TypeScript
- ✅ Código documentado
- ✅ Padrões consistentes
- ✅ Testes passando

---

## 🚀 Após FASE 1.5

Com monitoring completo, teremos:
- ✅ Visibilidade total do sistema
- ✅ Detecção proativa de problemas
- ✅ Dados para otimizações
- ✅ Foundation para FASE 2

**Status Final Esperado**: FASE 1 - 100% COMPLETA 🎉

---

**Criado**: 16 de Outubro de 2025
**Autor**: Claude (Agent CTO)
**Status**: PLANO APROVADO - PRONTO PARA IMPLEMENTAÇÃO
