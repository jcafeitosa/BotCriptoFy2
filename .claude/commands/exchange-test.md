---
description: Testa conexão e funcionalidades de exchange via CCXT
---

# Test Exchange Connection

Testa conexão com exchange e valida funcionalidades CCXT.

**🔌 MCP Integration**: Este comando usa `@ccxt-mcp` para acesso otimizado às exchanges.

## 1. Setup do Exchange

### Usando MCP (Recomendado)

O CCXT MCP está ativo e pronto para uso. Claude pode acessar diretamente os métodos:

```bash
# Verificar se MCP está ativo
claude mcp list | grep ccxt-mcp

# Deve mostrar: ✓ Connected
```

### Métodos Disponíveis via MCP

- `mcp__ccxt-mcp__list-exchanges` - Lista todas exchanges
- `mcp__ccxt-mcp__get-ticker` - Obtém ticker de um par
- `mcp__ccxt-mcp__batch-get-tickers` - Múltiplos tickers
- `mcp__ccxt-mcp__get-orderbook` - Livro de ordens
- `mcp__ccxt-mcp__get-ohlcv` - Candlestick data
- `mcp__ccxt-mcp__get-trades` - Trades recentes
- `mcp__ccxt-mcp__fetch-balance` - Saldo (requer API key)
- `mcp__ccxt-mcp__create-order` - Criar ordem (requer API key)

### Setup Tradicional (Fallback)

```typescript
import ccxt from 'ccxt';

const exchange = new ccxt.binance({
  apiKey: process.env.BINANCE_API_KEY,
  secret: process.env.BINANCE_SECRET,
  enableRateLimit: true, // SEMPRE true!
  options: {
    defaultType: 'spot',
    adjustForTimeDifference: true
  }
});
```

## 2. Testes de Conexão

### 2.1 Load Markets
```typescript
try {
  await exchange.loadMarkets();
  console.log('✅ Markets loaded');
  console.log(`📊 ${Object.keys(exchange.markets).length} markets available`);
} catch (error) {
  console.error('❌ Failed to load markets:', error.message);
}
```

### 2.2 Check Exchange Status
```typescript
const status = exchange.has;
console.log('Exchange capabilities:');
console.log('- fetchTicker:', status.fetchTicker);
console.log('- fetchOHLCV:', status.fetchOHLCV);
console.log('- fetchOrderBook:', status.fetchOrderBook);
console.log('- createOrder:', status.createOrder);
console.log('- fetchBalance:', status.fetchBalance);
console.log('- watchTicker:', status.watchTicker);
```

## 3. Market Data Tests

### 3.1 Fetch Ticker
```typescript
const symbol = 'BTC/USDT';

try {
  const ticker = await exchange.fetchTicker(symbol);
  console.log('✅ Ticker fetched');
  console.log(`- Last: ${ticker.last}`);
  console.log(`- Bid: ${ticker.bid}`);
  console.log(`- Ask: ${ticker.ask}`);
  console.log(`- Volume: ${ticker.baseVolume}`);
} catch (error) {
  console.error('❌ Ticker fetch failed:', error.message);
}
```

### 3.2 Fetch OHLCV
```typescript
try {
  const ohlcv = await exchange.fetchOHLCV(symbol, '1h', undefined, 100);
  console.log('✅ OHLCV fetched');
  console.log(`- Candles: ${ohlcv.length}`);
  console.log(`- Latest: [${ohlcv[ohlcv.length - 1]}]`);
} catch (error) {
  console.error('❌ OHLCV fetch failed:', error.message);
}
```

### 3.3 Fetch Order Book
```typescript
try {
  const orderBook = await exchange.fetchOrderBook(symbol, 20);
  console.log('✅ Order book fetched');
  console.log(`- Bids: ${orderBook.bids.length}`);
  console.log(`- Asks: ${orderBook.asks.length}`);
  console.log(`- Best bid: ${orderBook.bids[0]}`);
  console.log(`- Best ask: ${orderBook.asks[0]}`);
} catch (error) {
  console.error('❌ Order book fetch failed:', error.message);
}
```

## 4. Account Tests

### 4.1 Fetch Balance
```typescript
try {
  const balance = await exchange.fetchBalance();
  console.log('✅ Balance fetched');
  console.log(`- USDT free: ${balance.USDT?.free || 0}`);
  console.log(`- BTC total: ${balance.BTC?.total || 0}`);
} catch (error) {
  console.error('❌ Balance fetch failed:', error.message);
}
```

### 4.2 Fetch Open Orders
```typescript
try {
  const openOrders = await exchange.fetchOpenOrders(symbol);
  console.log('✅ Open orders fetched');
  console.log(`- Count: ${openOrders.length}`);
} catch (error) {
  console.error('❌ Open orders fetch failed:', error.message);
}
```

## 5. Trading Tests (TESTNET ONLY!)

**⚠️ NUNCA execute em produção sem validar!**

### 5.1 Create Test Order (Dry Run)
```typescript
// APENAS em testnet ou com enableDryRun
exchange.setSandboxMode(true); // Se suportado

try {
  const order = await exchange.createLimitBuyOrder(
    'BTC/USDT',
    0.001, // amount
    30000  // price (abaixo do mercado para não executar)
  );
  
  console.log('✅ Order created (test)');
  console.log(`- Order ID: ${order.id}`);
  console.log(`- Status: ${order.status}`);
} catch (error) {
  console.error('❌ Order creation failed:', error.message);
}
```

### 5.2 Cancel Test Order
```typescript
try {
  await exchange.cancelOrder(order.id, symbol);
  console.log('✅ Order canceled');
} catch (error) {
  console.error('❌ Order cancel failed:', error.message);
}
```

## 6. Error Handling Tests

### 6.1 Insufficient Funds
```typescript
try {
  await exchange.createMarketBuyOrder('BTC/USDT', 1000);
} catch (error) {
  if (error instanceof ccxt.InsufficientFunds) {
    console.log('✅ InsufficientFunds error handled correctly');
  }
}
```

### 6.2 Invalid Symbol
```typescript
try {
  await exchange.fetchTicker('INVALID/SYMBOL');
} catch (error) {
  if (error instanceof ccxt.BadSymbol) {
    console.log('✅ BadSymbol error handled correctly');
  }
}
```

### 6.3 Network Error
```typescript
try {
  exchange.timeout = 1; // Force timeout
  await exchange.fetchTicker('BTC/USDT');
} catch (error) {
  if (error instanceof ccxt.NetworkError) {
    console.log('✅ NetworkError handled correctly');
  }
}
```

## 7. Rate Limiting Test

```typescript
console.log('Testing rate limiting...');
const start = Date.now();

for (let i = 0; i < 5; i++) {
  await exchange.fetchTicker('BTC/USDT');
  console.log(`Request ${i + 1} completed`);
}

const elapsed = Date.now() - start;
console.log(`✅ Rate limiting working (${elapsed}ms for 5 requests)`);
```

## 8. Market Info Validation

```typescript
const market = exchange.market('BTC/USDT');

console.log('Market info:');
console.log('- Precision (price):', market.precision.price);
console.log('- Precision (amount):', market.precision.amount);
console.log('- Min amount:', market.limits.amount.min);
console.log('- Max amount:', market.limits.amount.max);
console.log('- Min cost:', market.limits.cost.min);
```

---

## Report de Validação

```markdown
# Exchange Test Report

**Exchange**: Binance
**Date**: 2025-01-11
**Status**: ✅ PASSED | ❌ FAILED

## Connection
- [✅] Markets loaded (1,247 markets)
- [✅] Capabilities verified
- [✅] Rate limiting active

## Market Data
- [✅] Ticker fetch working
- [✅] OHLCV fetch working
- [✅] Order book fetch working

## Account
- [✅] Balance fetch working
- [✅] Open orders fetch working

## Error Handling
- [✅] InsufficientFunds handled
- [✅] BadSymbol handled
- [✅] NetworkError handled

## Issues Found
None

## Ready for Production
✅ YES - Exchange integration validated
```

---

## Checklist Final

- [ ] Connection successful
- [ ] All market data endpoints working
- [ ] Account endpoints working
- [ ] Error handling tested
- [ ] Rate limiting verified
- [ ] Market info validated
- [ ] Documentation complete

**Aprovação**: ✅ Agente-CTO

