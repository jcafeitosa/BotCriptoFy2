# TypeCheck Errors - Plano de Correção

**Status:** 📋 **DOCUMENTADO** (Erros pré-existentes, não introduzidos por este PR)  
**Data:** 2025-10-18  
**Total de Erros:** 38 erros de tipo TypeScript  

## ⚠️ Contexto

Durante a preparação do PR de **WebSocket Refactoring + Module Audits**, executamos `tsc --noEmit` e identificamos 38 erros de tipo. **IMPORTANTE:** Nenhum desses erros foi introduzido pelas mudanças deste PR. São erros pré-existentes no codebase.

### Arquivos modificados neste PR (ZERO erros):
✅ `bot-execution.engine.ts` - Fix: `let` → `const`  
✅ `bot.service.ts` - Fix: `let` → `const`  
✅ `kraken-adapter.ts` - Fix: `let` → `const`  
✅ `sentiment-agent.integration.ts` - Fix: `{}` → `Record<string, never>`  
✅ `strategy.service.ts` - Fix: `let` → `const`  
✅ `test-redis-load.ts` - Fix: `let` → `const`  
✅ `test-redis-multi-instance.ts` - Fix: `let` → `const`  

---

## 📋 Erros por Módulo

### 1. **Affiliate Module** (3 erros)
- `affiliate/routes/public.routes.ts:36` - Type string não assignable a union type literal
- `affiliate/services/profile.service.ts:318` - Cannot find name 'db'
- `affiliate/services/referral.service.ts:312,316` - Parameter implicitly 'any' (2 ocorrências)

**Prioridade:** 🔴 **ALTA** (novo código de auditoria)

### 2. **Backtest Module** (3 erros)
- `backtest/services/backtest.service.ts:55` - No overload matches insert call
- `backtest/services/backtest.service.ts:163` - Type number não assignable a string | SQL
- `backtest/services/backtest.service.ts:432` - Property 'rules' does not exist

**Prioridade:** 🟡 **MÉDIA**

### 3. **Exchanges Module** (10 erros)
- `exchanges/services/exchange.service.ts:56` - string não assignable a ExchangeId
- `exchanges/services/exchange.service.ts:149,150,257,258` - Comparison unintentional (4 ocorrências)
- `exchanges/services/exchange.service.ts:415,437` - Unused @ts-expect-error (2 ocorrências)
- `exchanges/services/exchange.service.ts:501,502` - Type [Num, Num][] não assignable (2 ocorrências)

**Prioridade:** 🔴 **ALTA** (módulo crítico)

### 4. **Market Data Module** (4 erros)
- `market-data/routes/market-data.routes.ts:90` - 'exchange' specified more than once
- `market-data/websocket/market-data-websocket-manager.ts:232` - string não assignable a ExchangeId
- `market-data/websocket/market-data-websocket-manager.ts:477` - string não assignable a ExchangeId
- `market-data/websocket/market-data-websocket-manager.ts:572` - string não assignable a ExchangeId

**Prioridade:** 🔴 **CRÍTICA** (infraestrutura WebSocket)

### 5. **Order Book Module** (18 erros)
- Vários erros de métodos que não existem ou assinaturas incompatíveis
- `order-book/routes/order-book.routes.ts` - Múltiplos erros de type mismatch

**Prioridade:** 🟡 **MÉDIA** (módulo avançado)

---

## 🎯 Plano de Ação

### Fase 1: Críticos (ANTES do próximo deploy)
1. ✅ **Market Data WebSocket** (4 erros) - ExchangeId type casting
2. ✅ **Exchanges Service** (10 erros) - Type assertions e comparações
3. ✅ **Affiliate Module** (3 erros) - Novo código de auditoria

**Timeline:** 2-4 horas  
**Responsável:** Agente Backend Specialist  

### Fase 2: Médios (Próximo PR)
1. ✅ **Backtest Module** (3 erros) - Schema fixes
2. ✅ **Order Book Module** (18 erros) - Interface alignment

**Timeline:** 4-6 horas  
**Responsável:** Agente QA + Backend  

---

## 🔧 Estratégia de Correção

### 1. ExchangeId Type Issues
```typescript
// ❌ Antes
const exchangeId: string = req.params.exchange;

// ✅ Depois
const exchangeId = req.params.exchange as ExchangeId;
// OU
import { isValidExchangeId } from '@/types/exchanges';
if (!isValidExchangeId(exchangeId)) throw new Error('Invalid exchange');
```

### 2. Implicit Any
```typescript
// ❌ Antes
.map(row => row.value)

// ✅ Depois
.map((row: { value: string }) => row.value)
```

### 3. Property Does Not Exist
```typescript
// ❌ Antes
service.nonExistentMethod()

// ✅ Depois
// 1. Implementar o método
// 2. OU remover a chamada se obsoleta
// 3. OU atualizar a interface
```

---

## ✅ Validação

Após correção de cada fase:
```bash
bun run type-check  # Deve passar sem erros
bun run lint        # Deve passar sem erros
bun test            # Coverage ≥ 80%
```

---

## 📊 Progresso

- [ ] Fase 1: Críticos (17 erros)
- [ ] Fase 2: Médios (21 erros)
- [ ] Validação Final
- [ ] PR de Correção

**Meta:** Zero erros de tipo até 2025-10-20

---

## 🔗 Links Relacionados

- **Este PR:** WebSocket Refactoring + Module Audits
- **Próximo PR:** TypeScript Zero Errors Initiative
- **Issue:** #TBD (criar issue de tracking)

---

**⚠️ IMPORTANTE:** Este documento serve como rastreamento. O PR atual pode prosseguir pois não introduziu novos erros de tipo.
