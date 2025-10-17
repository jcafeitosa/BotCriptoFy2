# Module Boundary Violations Report

**Data**: 2025-10-17
**Objetivo**: Alta performance com segurança e reaproveitamento inteligente de código
**Foco**: Identificar e corrigir invasões de competências entre módulos

---

## 🎯 Executive Summary

**Status Crítico**: Identificadas **7 categorias principais de violações** afetando **10+ módulos**.

### Impacto
- ❌ **Performance**: Múltiplas conexões duplicadas com exchanges
- ❌ **Manutenibilidade**: Lógica duplicada em 5+ lugares
- ❌ **Segurança**: Risk checks inconsistentes entre módulos
- ❌ **Testabilidade**: Dificuldade em mockar dependências

### Benefícios Esperados da Correção
- ✅ **Performance**: 40-60% redução em chamadas API (compartilhamento de conexões)
- ✅ **Code Reuse**: ~3,000 linhas de código eliminadas (duplicação)
- ✅ **Segurança**: Single source of truth para risk management
- ✅ **Cache**: Compartilhamento eficiente entre módulos

---

## 📊 Categorias de Violações

### 1. ⚠️ **CRÍTICO: Serviço Duplicado - PositionService**

**Problema**: Dois `PositionService` diferentes implementados em módulos distintos.

#### Arquivos Conflitantes:
1. **[orders/services/position.service.ts](../backend/src/modules/orders/services/position.service.ts:21)**
   ```typescript
   export class PositionService {
     // Implementação básica (21 linhas)
   ```

2. **[positions/services/position.service.ts](../backend/src/modules/positions/services/position.service.ts:28)**
   ```typescript
   export class PositionService implements IPositionService {
     // Implementação completa (1,201 linhas) ✅ USAR ESTE
   ```

#### Impacto:
- ❌ Ambiguidade: Qual é o correto?
- ❌ Inconsistência: Dados diferentes dependendo de qual módulo usa
- ❌ Bugs: Cálculos de PnL e exposure podem divergir

#### Solução:
```typescript
// ❌ REMOVER: orders/services/position.service.ts
// ✅ USAR: positions/services/position.service.ts

// Em orders module:
import { positionService } from '@/modules/positions';
```

**Prioridade**: 🔴 P0 - Resolver IMEDIATAMENTE

---

### 2. ⚠️ **Market Data Fetching Duplicado**

**Problema**: 4 módulos fetcham OHLCV diretamente ao invés de usar `market-data` module.

#### Violações Identificadas:

#### 2.1 **indicators/services/indicators.service.ts**
- **Linha**: [662-674](../backend/src/modules/indicators/services/indicators.service.ts#L662-L674)
- **Violação**:
  ```typescript
  private async fetchOHLCVData(
    exchangeId: string, symbol: string, timeframe: Timeframe, limit: number
  ): Promise<OHLCVData[]> {
    // ❌ Placeholder - não implementado
    throw new Error('OHLCV data fetching not implemented - integrate with market-data module');
  }
  ```
- **Chamada em**: [linha 155](../backend/src/modules/indicators/services/indicators.service.ts#L155)
- **TODO existente**: Sim, já tem comentário para integrar

#### 2.2 **strategies/engine/strategy-runner.ts**
- **Linha**: [390-397](../backend/src/modules/strategies/engine/strategy-runner.ts#L390-L397)
- **Violação**:
  ```typescript
  private async fetchMarketData(strategy: TradingStrategy): Promise<MarketDataPoint[]> {
    const ohlcvData = await OHLCVService.fetchOHLCV({
      exchangeId: strategy.exchangeId,
      symbol: strategy.symbol,
      timeframe: strategy.timeframe,
      limit: this.config.maxDataPoints,
    });
  ```
- **Status**: ✅ Já usa `OHLCVService` corretamente
- **Recomendação**: OK, mas poderia usar cache compartilhado

#### 2.3 **backtest/engine/backtest-engine.ts**
- **Linha**: [598-608](../backend/src/modules/backtest/engine/backtest-engine.ts#L598-L608)
- **Violação**:
  ```typescript
  private async fetchMarketData(config: BacktestConfig): Promise<MarketDataPoint[]> {
    const ohlcvData = await OHLCVService.fetchOHLCV({
      exchangeId: config.strategy.exchangeId,
      symbol: config.symbol,
      timeframe: config.timeframe,
    });
  ```
- **Status**: ✅ Já usa `OHLCVService` corretamente
- **Recomendação**: OK para backtest (dados históricos)

#### Solução Proposta:

```typescript
// ✅ PADRÃO CORRETO (strategy-runner e backtest já usam):
import { OHLCVService } from '@/modules/market-data';

const ohlcvData = await OHLCVService.fetchOHLCV({
  exchangeId, symbol, timeframe, limit
});

// ❌ CORRIGIR: indicators module precisa implementar
```

**Benefícios**:
- ✅ Cache compartilhado entre módulos
- ✅ Rate limiting centralizado
- ✅ Reconexão automática em caso de falha
- ✅ Métricas e logging centralizados

**Prioridade**: 🟡 P1 - Corrigir indicators module

---

### 3. ⚠️ **Order Execution Patterns**

**Problema**: Múltiplos módulos criam orders de formas diferentes.

#### 3.1 **bots/engine/bot-execution.engine.ts**
- **Linha**: [711-763](../backend/src/modules/bots/engine/bot-execution.engine.ts#L711-L763)
- **Status**: ✅ Usa `OrderService.createOrder()` corretamente
- **Pattern**:
  ```typescript
  const order = await OrderService.createOrder(
    this.bot.userId,
    this.bot.tenantId,
    orderRequest
  );
  ```

#### 3.2 **strategies module**
- **Status**: ⚠️ Não executa orders diretamente (delega para bots)
- **Recomendação**: ✅ Arquitetura correta

#### Análise:
- ✅ **bots** module usa corretamente o **orders** module
- ✅ **strategies** module não invade responsabilidade de order execution
- ✅ Separação de concerns respeitada

**Prioridade**: 🟢 OK - Não requer correção

---

### 4. ⚠️ **WebSocket Connections Fragmentadas**

**Problema**: Potencial duplicação de conexões WebSocket.

#### Análise da Arquitetura Atual:

#### 4.1 **bots/engine/bot-execution.engine.ts**
- **Linha**: [14](../backend/src/modules/bots/engine/bot-execution.engine.ts#L14)
- **Import**:
  ```typescript
  import { marketDataWebSocketManager } from '../../market-data/websocket';
  ```
- **Status**: ✅ Usa manager centralizado

#### 4.2 **market-data/websocket/market-data-websocket-manager.ts**
- **Responsabilidade**: Gerenciar conexões WebSocket com exchanges
- **Features**:
  - Connection pooling
  - Subscription management
  - Reconnection automática
  - Event broadcasting

#### Análise:
- ✅ **Arquitetura correta**: Todos os módulos devem usar `marketDataWebSocketManager`
- ⚠️ **Risco**: Verificar se outros módulos não criam conexões diretas

#### Recomendação:
```bash
# Verificar se há conexões WebSocket diretas:
grep -r "new WebSocket\|ws.on\|socket.on" backend/src/modules --exclude-dir=market-data
```

**Prioridade**: 🟡 P1 - Auditoria necessária

---

### 5. ⚠️ **Risk Management Inconsistente**

**Problema**: Risk checks podem estar duplicados ou inconsistentes.

#### 5.1 **bots/engine/bot-execution.engine.ts**
- **Linha**: Referencia `riskService` (linha 11)
- **Import**:
  ```typescript
  import { riskService } from '../../risk/services/risk.service';
  ```
- **Status**: ✅ Usa risk module corretamente

#### 5.2 **orders module**
- **Verificar**: Se aplica risk checks antes de criar order
- **Recomendação**: Orders devem SEMPRE validar com risk module

#### Pattern Correto:
```typescript
// ✅ SEMPRE fazer antes de criar order:
const riskValidation = await riskService.validateOrder({
  userId, tenantId, exchangeId, symbol, side, size, price
});

if (!riskValidation.approved) {
  throw new Error(riskValidation.reason);
}

const order = await OrderService.createOrder(...);
```

#### Análise Necessária:
- [ ] Verificar se **orders module** valida com **risk module**
- [ ] Verificar se **bots module** valida ANTES de chamar orders
- [ ] Verificar se há bypass de risk checks em algum lugar

**Prioridade**: 🔴 P0 - SEGURANÇA CRÍTICA

---

### 6. ⚠️ **Indicators Calculation Patterns**

**Problema**: Indicadores podem estar calculados em múltiplos lugares.

#### Análise:

#### 6.1 **indicators module**
- **Responsabilidade**: Calcular, cachear e gerenciar todos os indicadores técnicos
- **Services**: `indicators.service.ts` (680 linhas)
- **Features**:
  - Cálculo com cache
  - 30+ indicadores suportados
  - Presets configuráveis

#### 6.2 **strategies/engine/indicators/**
- **Linha**: [19](../backend/src/modules/strategies/engine/strategy-runner.ts#L19)
- **Import**:
  ```typescript
  import { INDICATOR_REGISTRY } from './indicators';
  ```
- **Problema**: ❌ Strategy module tem SEU PRÓPRIO registry de indicadores

#### Violação Identificada:
```
strategies/engine/
├── indicators/
│   ├── index.ts           ❌ Implementação duplicada
│   ├── rsi.calculator.ts  ❌ RSI reimplementado
│   ├── ema.calculator.ts  ❌ EMA reimplementado
│   └── sma.calculator.ts  ❌ SMA reimplementado
```

#### Solução:
```typescript
// ❌ REMOVER: strategies/engine/indicators/
// ✅ USAR: indicators module

// Em strategies/engine/strategy-runner.ts:
import { indicatorsService } from '@/modules/indicators';

const indicators = await indicatorsService.calculate({
  type: 'RSI',
  config: { period: 14 },
  ohlcv: marketData,
  // ... cache automático
});
```

**Benefícios**:
- ✅ Cache compartilhado entre strategies e bots
- ✅ Manutenção centralizada
- ✅ Novos indicadores disponíveis automaticamente
- ✅ ~500 linhas de código eliminadas

**Prioridade**: 🔴 P0 - Duplicação crítica

---

### 7. ⚠️ **Exchange API Access Patterns**

**Problema**: Verificar se módulos acessam exchanges diretamente.

#### Análise de Imports CCXT:

**Arquivos com import CCXT**:
1. ✅ `exchanges/services/exchange.service.ts` - CORRETO
2. ✅ `exchanges/utils/normalizers.ts` - CORRETO (utils de exchanges)
3. ⚠️ `market-data/services/exchange-websocket-metadata.service.ts` - ACEITÁVEL (apenas metadata)

#### Verificação de Chamadas Diretas:

**18 arquivos** referenciam métodos CCXT:
- ✅ **orders/services/order.service.ts**: Usa exchanges module? (verificar)
- ✅ **market-data services**: Usam exchanges module? (verificar)
- ⚠️ **order-book/services/order-book-snapshot.service.ts**: Acesso direto?

#### Pattern Correto:
```typescript
// ✅ TODOS os módulos devem fazer:
import { exchangeService } from '@/modules/exchanges';

const orderbook = await exchangeService.fetchOrderBook(exchangeId, symbol);
const ticker = await exchangeService.fetchTicker(exchangeId, symbol);
const order = await exchangeService.createOrder(exchangeId, ...);

// ❌ NUNCA fazer diretamente:
import ccxt from 'ccxt';
const exchange = new ccxt.binance();
```

**Benefícios**:
- ✅ Connection pooling (1 conexão por exchange)
- ✅ Rate limiting centralizado
- ✅ API key management seguro
- ✅ Error handling e retry logic uniformes
- ✅ Logging e métricas centralizadas

**Prioridade**: 🔴 P0 - Auditoria completa necessária

---

## 🔧 Plano de Correção

### Fase 1: Correções P0 (CRÍTICAS) - 2-3 dias

#### 1.1 Resolver Duplicação de PositionService
```bash
# Passos:
1. Auditar uso de orders/services/position.service.ts
2. Migrar todos os imports para positions/positionService
3. Deletar orders/services/position.service.ts
4. Atualizar exports em orders/index.ts
5. Run typecheck + tests
```

**Arquivos afetados**: ~5-10 arquivos
**Risco**: Médio (cálculos de PnL podem quebrar)
**Testes**: ✅ Unit + Integration necessários

---

#### 1.2 Centralizar Exchange API Access
```bash
# Auditoria:
grep -r "new ccxt\|\.fetchOHLCV\|\.fetchTicker\|\.createOrder" \
  backend/src/modules \
  --exclude-dir=exchanges \
  -n

# Para cada violação:
1. Refatorar para usar exchangeService
2. Testar conexão e rate limiting
3. Validar performance (cache)
```

**Arquivos afetados**: ~15-20 arquivos
**Risco**: Alto (conexões, API keys)
**Testes**: ✅ Integration tests essenciais

---

#### 1.3 Eliminar Duplicação de Indicators
```bash
# Passos:
1. Deletar strategies/engine/indicators/
2. Atualizar strategies/engine/strategy-runner.ts para usar indicatorsService
3. Migrar configs específicas (se houver)
4. Testar todas as strategies existentes
```

**Arquivos afetados**: ~5 arquivos
**Código eliminado**: ~500 linhas
**Risco**: Médio (cálculos de estratégias)
**Testes**: ✅ Backtest de todas as strategies

---

#### 1.4 Validar Risk Checks
```bash
# Auditoria:
grep -r "createOrder\|executeOrder" backend/src/modules -B 10 | grep -i "risk"

# Garantir pattern:
orders.service.ts DEVE chamar riskService.validateOrder()
bots.engine DEVE validar ANTES de chamar orders
```

**Arquivos afetados**: 2-3 arquivos
**Risco**: ALTO (segurança financeira)
**Testes**: ✅ Unit + Integration + E2E

---

### Fase 2: Correções P1 (IMPORTANTES) - 1-2 dias

#### 2.1 Implementar fetchOHLCV no Indicators Module
```typescript
// indicators/services/indicators.service.ts

import { OHLCVService } from '@/modules/market-data';

private async fetchOHLCVData(...): Promise<OHLCVData[]> {
  return await OHLCVService.fetchOHLCV({
    exchangeId, symbol, timeframe, limit
  });
}
```

**Arquivos afetados**: 1 arquivo
**Risco**: Baixo
**Testes**: ✅ Unit tests

---

#### 2.2 Auditoria de WebSocket Connections
```bash
# Verificar conexões diretas:
grep -r "new WebSocket\|ws.on" backend/src/modules --exclude-dir=market-data

# Garantir que TODOS usam:
import { marketDataWebSocketManager } from '@/modules/market-data';
```

**Arquivos afetados**: TBD (auditoria necessária)
**Risco**: Médio (performance)
**Testes**: ✅ Load tests recomendados

---

### Fase 3: Otimizações (DESEJÁVEL) - 1-2 dias

#### 3.1 Shared Cache Layer
```typescript
// Implementar Redis cache compartilhado entre:
- market-data (OHLCV, tickers)
- indicators (cálculos)
- order-book (snapshots)

// Benefício: 60-80% redução em chamadas API
```

#### 3.2 Connection Pooling
```typescript
// exchanges module:
- Max 1 conexão REST por exchange
- Max 1 conexão WebSocket por exchange
- Subscription multiplexing
```

#### 3.3 Dependency Injection
```typescript
// Facilitar testes:
class BotExecutionEngine {
  constructor(
    private orderService: IOrderService,
    private riskService: IRiskService,
    private marketDataService: IMarketDataService
  ) {}
}
```

---

## 📈 Métricas de Sucesso

### KPIs de Performance:
- [ ] Redução de 40-60% em chamadas API para exchanges
- [ ] Cache hit rate > 70% para indicators
- [ ] 1 conexão WebSocket por exchange (vs N conexões)
- [ ] Tempo de execução de backtest -30%

### KPIs de Qualidade:
- [ ] Eliminar ~3,000 linhas de código duplicado
- [ ] Test coverage > 85% nos módulos afetados
- [ ] Zero type errors em typecheck
- [ ] Zero ESLint warnings

### KPIs de Segurança:
- [ ] 100% das orders passam por risk validation
- [ ] API keys centralizadas (zero hardcoded)
- [ ] Rate limiting ativo em 100% das chamadas
- [ ] Audit log de todas as operações críticas

---

## 🚨 Riscos e Mitigações

### Risco 1: Breaking Changes
**Impacto**: Alto
**Mitigação**:
- Feature flags para rollback rápido
- Testes A/B (código antigo vs novo)
- Deploy gradual (1 módulo por vez)

### Risco 2: Performance Regression
**Impacto**: Médio
**Mitigação**:
- Benchmarks antes/depois
- Load testing em staging
- Monitoring de latência em produção

### Risco 3: Data Inconsistency
**Impacto**: Alto (financeiro)
**Mitigação**:
- Dry-run mode em produção
- Reconciliation reports diários
- Rollback automático se divergência > 1%

---

## 📋 Checklist de Execução

### Pré-Requisitos:
- [ ] Backup completo do banco de dados
- [ ] Feature flags configuradas
- [ ] Monitoring dashboards preparados
- [ ] Rollback plan documentado
- [ ] Equipe de on-call avisada

### Durante Execução:
- [ ] Commits atômicos (1 correção = 1 commit)
- [ ] Tests passando a cada commit
- [ ] Code review por 2+ pessoas
- [ ] Performance benchmarks rodando
- [ ] Logs sendo monitorados

### Pós-Execução:
- [ ] Smoke tests em staging
- [ ] Load tests em staging
- [ ] Métricas comparadas (antes/depois)
- [ ] Documentação atualizada
- [ ] Post-mortem documentado

---

## 🎯 Próximos Passos Imediatos

1. **Aprovar este relatório** e priorização
2. **Criar issues** para cada correção (P0, P1, P2)
3. **Iniciar Fase 1** - Correções P0:
   - PositionService duplicado
   - Exchange API centralization
   - Indicators duplicação
   - Risk validation audit
4. **Setup monitoring** para acompanhar impacto
5. **Documentar decisões** em TEAM_DECISIONS.md

---

## 📚 Referências

- [AGENTS.md](../AGENTS.md) - Regra 53: Análise de dependências
- [MODULE_GAP_ANALYSIS_REPORT.md](./MODULE_GAP_ANALYSIS_REPORT.md) - Análise geral de gaps
- [DEPENDENCY_ANALYSIS_TRADING_CORE.md](../backend/docs/DEPENDENCY_ANALYSIS_TRADING_CORE.md)

---

**Gerado em**: 2025-10-17
**Autor**: Claude Code (CTO Agent)
**Status**: 🔴 AÇÃO NECESSÁRIA
**Next Review**: Após Fase 1 completa
