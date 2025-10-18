# Real-Time Market Data Pipeline

**Status:** ✅ Implemented  
**Last Update:** 2025-10-18  
**Owner:** Trading Platform / Market Data Team

---

## Overview

The market data pipeline bootstraps native WebSocket adapters (Binance, Coinbase, Kraken, Bybit, OKX) and streams real-time prices, trades, order books, and candles into the trading engine. A lightweight bootstrapper now runs during API startup to automatically:

1. Connect to the configured exchanges using first-party WebSocket adapters (no ccxt.pro).
2. Register default subscriptions (tickers/trades/candles/order books).
3. Optionally bridge events across instances using Redis pub/sub.

By default the bootstrap is **disabled** to avoid opening live connections during local development and automated tests. Enable it explicitly in environments that require live data.

---

## Environment Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `MARKET_DATA_WS_BOOTSTRAP` | Enables the bootstrapper when set to `true` | `false` |
| `MARKET_DATA_WS_SUBSCRIPTIONS` | Custom subscription list (`exchange:symbol:channel1,channel2;...`) | Built-in defaults (`binance:BTC/USDT:ticker,trades` & `binance:ETH/USDT:ticker`) |
| `MARKET_DATA_WS_CANDLE_TIMEFRAME` | Default candle interval when subscribing to `candles` channel | `1m` |
| `MARKET_DATA_WS_ORDERBOOK_DEPTH` | Depth used for `orderbook` channel subscriptions | `20` |
| `MARKET_DATA_WS_MAX_CONNECTIONS` | Upper bound on concurrent exchange connections | `10` |
| `MARKET_DATA_WS_CONNECTION_TIMEOUT` | Socket connection timeout (ms) | `30000` |
| `MARKET_DATA_WS_AUTO_RECONNECT` | Toggle automatic reconnection (`true`/`false`) | `true` |
| `MARKET_DATA_WS_ENABLE_METRICS` | Toggle in-memory metrics collection | `true` |
| `MARKET_DATA_WS_ENABLE_REDIS` | Enable Redis event bridge for horizontal scaling | `false` |

When Redis support is enabled, the following overrides are available (fall back to `REDIS_URL` and the defaults inside the manager):

| Variable | Purpose |
|----------|---------|
| `MARKET_DATA_REDIS_URL` | Full Redis connection string |
| `MARKET_DATA_REDIS_HOST` / `MARKET_DATA_REDIS_PORT` | Host/port overrides |
| `MARKET_DATA_REDIS_PASSWORD` | Authentication |
| `MARKET_DATA_REDIS_DB` | Database index |
| `MARKET_DATA_REDIS_PREFIX` | Channel key prefix (`ws:` by default) |
| `MARKET_DATA_REDIS_PUBLISH` | Toggle publishing (`true`/`false`) |
| `MARKET_DATA_REDIS_SUBSCRIBE` | Toggle subscription (`true`/`false`) |

---

## Subscription Syntax

```
MARKET_DATA_WS_SUBSCRIPTIONS="binance:BTC/USDT:ticker,trades;kraken:BTC/USD:candles"
```

- `exchange` — one of `binance`, `coinbase`, `kraken`, `bybit`, `okx`
- `symbol` — exchange-native symbol (e.g. `BTC/USDT`, `BTC/USD`)
- `channels` — comma-separated list of `ticker`, `trades`, `orderbook`, `candles`

The bootstrapper automatically deduplicates subscriptions and skips channels that are already active.

Channel-specific tuning:

- `orderbook` → depth determined by `MARKET_DATA_WS_ORDERBOOK_DEPTH`
- `candles` → interval determined by `MARKET_DATA_WS_CANDLE_TIMEFRAME`

---

## Startup Flow

1. API bootstraps as usual (`backend/src/index.ts`).
2. After Redis and notification workers, the server invokes `initializeMarketDataPipeline()`.
3. The pipeline checks the bootstrap flag; if disabled, it logs and exits.
4. When enabled:
   - Determines the subscription set (custom or default).
   - Connects to each exchange using predefined connection configs (can be overridden per exchange via `MARKET_DATA_WS_<EXCHANGE>_URL`).
   - Subscribes to the requested channels, skipping duplicates.
   - Logs success/failure for each operation.
5. Pipeline state can be queried through `isMarketDataPipelineInitialized()` (exported by the market data module).

---

## Default Connection Profiles

| Exchange | WebSocket URL | Notes |
|----------|---------------|-------|
| Binance  | `wss://stream.binance.com:9443/ws` | 30s ping interval, 10s pong timeout |
| Coinbase | `wss://ws-feed.exchange.coinbase.com` | 30s ping interval |
| Kraken   | `wss://ws.kraken.com` | 30s ping / 10s pong |
| Bybit    | `wss://stream.bybit.com/v5/public/spot` | 20s ping |
| OKX      | `wss://ws.okx.com:8443/ws/v5/public` | 20s ping |

Override any URL via `MARKET_DATA_WS_<EXCHANGE>_URL`.

---

## Redis Event Bridge

When `MARKET_DATA_WS_ENABLE_REDIS=true`, the manager instantiates the shared `RedisEventBridge`, enabling:

- Multi-instance distribution of WebSocket events (scale out bot workers).
- Publisher/subscriber toggles for fine-grained control.
- Metrics available via `marketDataWebSocketManager.getRedisMetrics()`.

Ensure Redis credentials are configured before enabling this option.

---

## Health & Diagnostics

- `marketDataWebSocketManager.getSystemMetrics()` returns consolidated metrics (connections, subscriptions, Redis stats).
- `marketDataWebSocketManager.getHealthStatus()` surfaces healthy/unhealthy connections.
- `isMarketDataPipelineInitialized()` can be exposed in health checks to assert bootstrap success.

---

## Operational Checklist

- [ ] Set `MARKET_DATA_WS_BOOTSTRAP=true` in staging/production.
- [ ] Define subscription set matching your trading universe.
- [ ] Configure Redis bridge for multi-instance deployments.
- [ ] Monitor logs for connection/subscription failures (retry policy already in place).
- [ ] Include pipeline status in environment readiness checks.

---

## Related Components

- `backend/src/modules/market-data/websocket/market-data-websocket-manager.ts`
- `backend/src/modules/market-data/websocket/pipeline.ts`
- `backend/src/modules/market-data/websocket/adapters/*`
- `backend/src/modules/bots/engine/bot-execution.engine.ts`

---

For questions or escalations contact **@Trading Platform Team**.
