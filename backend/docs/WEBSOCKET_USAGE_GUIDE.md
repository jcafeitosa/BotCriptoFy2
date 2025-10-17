# 🚀 WebSocket Real-Time Market Data - Usage Guide

**Version:** 2.0 (Native Adapters)
**Date:** 2025-10-17
**Status:** Production Ready ✅

---

## 📋 Overview

The Market Data WebSocket Manager provides real-time market data from multiple cryptocurrency exchanges using native WebSocket adapters. No ccxt.pro required!

### Supported Exchanges:
- ✅ **Binance** (Spot)
- ✅ **Coinbase** (Pro)
- ✅ **Kraken**
- 🔄 More coming soon (Bybit, OKX)

### Supported Data Types:
- ✅ **Ticker** (real-time prices)
- ✅ **Trades** (individual trades)
- ✅ **Order Book** (depth)
- ✅ **Candles** (OHLCV)

---

## 🚀 Quick Start

### 1. Basic Connection

```typescript
import {
  marketDataWebSocketManager,
  connectToExchange,
} from '@/modules/market-data/websocket';

// Connect to Binance
await connectToExchange('binance', {
  url: 'wss://stream.binance.com:9443/ws',
  timeout: 30000,
  pingInterval: 30000,
  pongTimeout: 10000,
  reconnection: {
    maxAttempts: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
  },
});
```

### 2. Subscribe to Real-Time Prices

```typescript
import { subscribeToMarketData } from '@/modules/market-data/websocket';

// Subscribe to BTC/USDT ticker
await subscribeToMarketData({
  channel: 'ticker',
  symbol: 'BTC/USDT',
});

// Listen to price updates
marketDataWebSocketManager.on('ticker', (ticker) => {
  console.log('Price update:', {
    symbol: ticker.symbol,
    last: ticker.last,
    bid: ticker.bid,
    ask: ticker.ask,
    volume24h: ticker.volume24h,
  });
});
```

### 3. Complete Example

```typescript
import {
  MarketDataWebSocketManager,
  type Ticker,
  type Trade,
  type OrderBook,
} from '@/modules/market-data/websocket';

class TradingBot {
  private wsManager: MarketDataWebSocketManager;

  constructor() {
    this.wsManager = new MarketDataWebSocketManager({
      autoReconnect: true,
      maxConnections: 5,
      enableMetrics: true,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Price updates
    this.wsManager.on('ticker', this.onPriceUpdate.bind(this));

    // Trades
    this.wsManager.on('trade', this.onTrade.bind(this));

    // Order book updates
    this.wsManager.on('orderbook', this.onOrderBookUpdate.bind(this));

    // Connection events
    this.wsManager.on('exchange:connected', (data) => {
      console.log('Connected to exchange:', data.exchange);
    });

    this.wsManager.on('exchange:disconnected', (data) => {
      console.log('Disconnected from exchange:', data.exchange);
    });

    this.wsManager.on('exchange:error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  async start() {
    // Connect to Binance
    await this.wsManager.connect('binance', {
      url: 'wss://stream.binance.com:9443/ws',
      timeout: 30000,
      pingInterval: 30000,
      pongTimeout: 10000,
      reconnection: {
        maxAttempts: 5,
        initialDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
        jitterFactor: 0.1,
      },
    });

    // Subscribe to BTC/USDT
    await this.wsManager.subscribe({
      channel: 'ticker',
      symbol: 'BTC/USDT',
    });

    console.log('Trading bot started!');
  }

  private onPriceUpdate(ticker: Ticker) {
    console.log(`${ticker.symbol}: $${ticker.last}`);

    // Your trading logic here
    if (this.shouldTrade(ticker)) {
      this.executeTrade(ticker);
    }
  }

  private onTrade(trade: Trade) {
    console.log('New trade:', {
      symbol: trade.symbol,
      price: trade.price,
      amount: trade.amount,
      side: trade.side,
    });
  }

  private onOrderBookUpdate(orderbook: OrderBook) {
    console.log('Order book updated:', {
      symbol: orderbook.symbol,
      bestBid: orderbook.bids[0]?.price,
      bestAsk: orderbook.asks[0]?.price,
    });
  }

  private shouldTrade(ticker: Ticker): boolean {
    // Your strategy logic
    return false;
  }

  private executeTrade(ticker: Ticker) {
    // Your trade execution logic
  }

  async stop() {
    await this.wsManager.disconnectAll();
    console.log('Trading bot stopped!');
  }
}

// Usage
const bot = new TradingBot();
await bot.start();

// Stop after some time
// await bot.stop();
```

---

## 📚 API Reference

### MarketDataWebSocketManager

#### Constructor

```typescript
new MarketDataWebSocketManager(config?: MarketDataManagerConfig)
```

**Config Options:**
```typescript
interface MarketDataManagerConfig {
  autoReconnect?: boolean;      // Default: true
  maxConnections?: number;       // Default: 10
  connectionTimeout?: number;    // Default: 30000ms
  enableMetrics?: boolean;       // Default: true
}
```

#### Methods

##### connect()
```typescript
async connect(
  exchangeId: ExchangeId,
  config: ConnectionConfig
): Promise<void>
```

Connect to an exchange WebSocket.

**Example:**
```typescript
await wsManager.connect('binance', {
  url: 'wss://stream.binance.com:9443/ws',
  timeout: 30000,
  pingInterval: 30000,
  pongTimeout: 10000,
  reconnection: {
    maxAttempts: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitterFactor: 0.1,
  },
});
```

##### disconnect()
```typescript
async disconnect(exchangeId: ExchangeId): Promise<void>
```

Disconnect from an exchange.

**Example:**
```typescript
await wsManager.disconnect('binance');
```

##### subscribe()
```typescript
async subscribe(request: SubscriptionRequest): Promise<void>
```

Subscribe to a market data channel.

**Example:**
```typescript
// Ticker
await wsManager.subscribe({
  channel: 'ticker',
  symbol: 'BTC/USDT',
});

// Trades
await wsManager.subscribe({
  channel: 'trades',
  symbol: 'ETH/USDT',
});

// Order Book
await wsManager.subscribe({
  channel: 'orderbook',
  symbol: 'BTC/USDT',
  params: { depth: 20 },
});

// Candles
await wsManager.subscribe({
  channel: 'candles',
  symbol: 'BTC/USDT',
  params: { interval: '1m' },
});
```

##### unsubscribe()
```typescript
async unsubscribe(request: SubscriptionRequest): Promise<void>
```

Unsubscribe from a market data channel.

##### isConnected()
```typescript
isConnected(exchangeId: ExchangeId): boolean
```

Check if connected to an exchange.

##### getConnectionStatus()
```typescript
getConnectionStatus(exchangeId: ExchangeId): ConnectionStatus | null
```

Get detailed connection status.

##### getMetrics()
```typescript
getMetrics(exchangeId: ExchangeId): ConnectionMetrics | null
```

Get connection metrics (messages, latency, uptime, etc.).

##### getHealthStatus()
```typescript
getHealthStatus(): {
  healthy: ExchangeId[];
  unhealthy: ExchangeId[];
  total: number;
}
```

Get health status of all connections.

---

## 🎧 Events

The manager emits the following events:

### Connection Events

```typescript
// Exchange connected
wsManager.on('exchange:connected', (data: {
  exchange: ExchangeId;
  timestamp: number;
}) => {
  console.log('Connected:', data);
});

// Exchange disconnected
wsManager.on('exchange:disconnected', (data: {
  exchange: ExchangeId;
  timestamp: number;
  reason?: string;
}) => {
  console.log('Disconnected:', data);
});

// Reconnecting
wsManager.on('exchange:reconnecting', (data: {
  exchange: ExchangeId;
  attempt: number;
  nextDelay: number;
}) => {
  console.log('Reconnecting:', data);
});

// Error
wsManager.on('exchange:error', (error: {
  code: string;
  message: string;
  exchange: ExchangeId;
  fatal: boolean;
}) => {
  console.error('Error:', error);
});
```

### Market Data Events

```typescript
// Ticker updates
wsManager.on('ticker', (ticker: Ticker) => {
  console.log('Price:', ticker.last);
});

// Trade updates
wsManager.on('trade', (trade: Trade) => {
  console.log('Trade:', trade);
});

// Order book updates
wsManager.on('orderbook', (orderbook: OrderBook) => {
  console.log('Order book:', orderbook);
});

// Candle updates
wsManager.on('candle', (candle: Candle) => {
  console.log('Candle:', candle);
});
```

### Subscription Events

```typescript
// Subscription added
wsManager.on('subscription:added', (data: {
  exchangeId: ExchangeId;
  request: SubscriptionRequest;
}) => {
  console.log('Subscribed:', data);
});

// Subscription removed
wsManager.on('subscription:removed', (data: {
  exchangeId: ExchangeId;
  request: SubscriptionRequest;
}) => {
  console.log('Unsubscribed:', data);
});
```

---

## 🔧 Advanced Usage

### Multiple Exchanges

```typescript
const wsManager = new MarketDataWebSocketManager();

// Connect to multiple exchanges
await wsManager.connect('binance', binanceConfig);
await wsManager.connect('coinbase', coinbaseConfig);
await wsManager.connect('kraken', krakenConfig);

// Subscribe to same symbol on different exchanges
await wsManager.subscribe({
  channel: 'ticker',
  symbol: 'BTC/USDT', // Binance
});

await wsManager.subscribe({
  channel: 'ticker',
  symbol: 'BTC-USD', // Coinbase
});

// Compare prices across exchanges
let binancePrice = 0;
let coinbasePrice = 0;

wsManager.on('ticker', (ticker) => {
  if (ticker.exchange === 'binance') {
    binancePrice = ticker.last;
  } else if (ticker.exchange === 'coinbase') {
    coinbasePrice = ticker.last;
  }

  const spread = Math.abs(binancePrice - coinbasePrice);
  if (spread > 100) {
    console.log('Arbitrage opportunity!', { binancePrice, coinbasePrice, spread });
  }
});
```

### Health Monitoring

```typescript
// Check health every minute
setInterval(() => {
  const health = wsManager.getHealthStatus();

  console.log('Health Status:', {
    healthy: health.healthy.length,
    unhealthy: health.unhealthy.length,
    total: health.total,
  });

  // Reconnect unhealthy connections
  for (const exchangeId of health.unhealthy) {
    console.log('Reconnecting unhealthy exchange:', exchangeId);
    // The adapter will auto-reconnect if autoReconnect is enabled
  }
}, 60000);
```

### Metrics Collection

```typescript
// Get metrics every 5 seconds
setInterval(() => {
  const metrics = wsManager.getAllMetrics();

  for (const [exchangeId, metric] of metrics) {
    console.log(`${exchangeId} Metrics:`, {
      messagesReceived: metric.messagesReceived,
      uptime: metric.uptime,
      averageLatency: metric.averageLatency,
      errors: metric.errors,
    });
  }
}, 5000);
```

### Ping/Latency Monitoring

```typescript
// Check latency every 30 seconds
setInterval(async () => {
  const latencies = await wsManager.pingAll();

  for (const [exchangeId, latency] of latencies) {
    if (latency === null) {
      console.warn(`${exchangeId}: Ping failed`);
    } else if (latency > 500) {
      console.warn(`${exchangeId}: High latency ${latency}ms`);
    } else {
      console.log(`${exchangeId}: Latency ${latency}ms`);
    }
  }
}, 30000);
```

---

## ⚠️ Best Practices

### 1. Error Handling

Always handle errors:

```typescript
try {
  await wsManager.connect('binance', config);
} catch (error) {
  console.error('Failed to connect:', error);
  // Implement retry logic or fallback
}

wsManager.on('exchange:error', (error) => {
  if (error.fatal) {
    // Critical error - may need to restart
    console.error('Fatal error:', error);
  } else {
    // Non-fatal error - can be logged
    console.warn('Error:', error);
  }
});
```

### 2. Graceful Shutdown

Always disconnect before exiting:

```typescript
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await wsManager.disconnectAll();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await wsManager.disconnectAll();
  process.exit(0);
});
```

### 3. Subscription Management

Keep track of your subscriptions:

```typescript
const subscriptions = wsManager.getAllSubscriptions();

for (const [exchangeId, subs] of subscriptions) {
  console.log(`${exchangeId}: ${subs.length} subscriptions`);
}
```

### 4. Connection Limits

Respect exchange connection limits:

```typescript
const wsManager = new MarketDataWebSocketManager({
  maxConnections: 5, // Limit concurrent connections
});
```

### 5. Memory Management

For long-running bots, monitor memory:

```typescript
setInterval(() => {
  const used = process.memoryUsage();
  console.log('Memory:', {
    rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
  });
}, 60000);
```

---

## 🐛 Troubleshooting

### Connection Fails

```typescript
// Check if exchange is supported
const supported = ['binance', 'coinbase', 'kraken'];
if (!supported.includes(exchangeId)) {
  console.error('Exchange not supported');
}

// Check WebSocket URL
console.log('Connecting to:', config.url);

// Verify network connectivity
// Check firewall rules
```

### High Latency

```typescript
// Check latency
const latency = adapter.getLatency();
if (latency && latency > 1000) {
  console.warn('High latency detected:', latency);
  // Consider switching to a closer exchange endpoint
}
```

### Messages Not Received

```typescript
// Verify subscription
const subs = wsManager.getSubscriptions('binance');
console.log('Active subscriptions:', subs);

// Check connection status
const status = wsManager.getConnectionStatus('binance');
console.log('Connection status:', status);

// Check for errors
wsManager.on('exchange:error', (error) => {
  console.error('Error:', error);
});
```

---

## 📊 Performance

### Expected Performance:

| Metric | Target | Typical |
|--------|--------|---------|
| **Latency** | <100ms | 20-50ms |
| **Messages/sec** | 1,000+ | 500-2,000 |
| **Memory** | <100MB | 50-80MB |
| **Reconnect Time** | <5s | 1-3s |

### Optimization Tips:

1. **Subscribe only to needed data**
2. **Use depth limits on order books** (default 20)
3. **Batch operations when possible**
4. **Monitor and clean up old subscriptions**
5. **Use metrics to identify bottlenecks**

---

## 🎯 Next Steps

1. ✅ Connect to exchange
2. ✅ Subscribe to market data
3. ✅ Handle events
4. 🔄 Integrate with Bot Execution Engine
5. 🔄 Add Redis pub/sub for scaling
6. 🔄 Production deployment

---

**Ready to build real-time trading bots!** 🚀

See also:
- [Bot Execution Engine Integration](./BOT_WEBSOCKET_INTEGRATION.md)
- [Redis Pub/Sub Setup](./REDIS_PUBSUB_SETUP.md)
- [Production Deployment](./PRODUCTION_DEPLOYMENT.md)
