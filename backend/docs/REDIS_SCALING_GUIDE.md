# Redis Pub/Sub Scaling Guide

Complete guide for enabling horizontal scaling of WebSocket connections using Redis pub/sub.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Configuration](#configuration)
4. [Usage](#usage)
5. [Deployment](#deployment)
6. [Monitoring](#monitoring)
7. [Troubleshooting](#troubleshooting)

---

## Overview

### What is Redis Pub/Sub?

Redis pub/sub (publish/subscribe) enables multiple application instances to share WebSocket events in real-time. This allows horizontal scaling - running multiple bot instances across different servers while sharing a single set of exchange WebSocket connections.

### Benefits

- **Horizontal Scaling**: Run multiple instances without multiplying WebSocket connections
- **Load Distribution**: Distribute bot execution across multiple servers
- **High Availability**: Automatic failover if one instance goes down
- **Cost Savings**: Single set of exchange connections shared across all instances
- **Real-Time Sync**: Sub-100ms event distribution between instances

### Use Cases

1. **High-Volume Trading**: Scale bot execution to handle thousands of simultaneous strategies
2. **Geographic Distribution**: Run instances in different regions for lower latency
3. **Development/Production Separation**: Share market data between dev and prod environments
4. **Microservices**: Separate WebSocket handling from bot execution logic

---

## Architecture

### Without Redis (Single Instance)

```
┌─────────────────────────────────────┐
│      Application Instance           │
│  ┌─────────────────────────────┐   │
│  │  WebSocket Manager          │   │
│  │  - Binance Connection       │   │
│  │  - Coinbase Connection      │   │
│  │  - Kraken Connection        │   │
│  └─────────────────────────────┘   │
│             │                       │
│             ▼                       │
│  ┌─────────────────────────────┐   │
│  │  Bot Execution Engine       │   │
│  │  - 50 Bot Instances         │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Limitations**:
- Limited to ~50-100 bots per instance (CPU/memory bound)
- Single point of failure
- No geographic distribution

### With Redis (Multi-Instance)

```
┌──────────────────────────────────┐
│     Exchange WebSocket API       │
│  ┌────────┐  ┌────────┐         │
│  │Binance │  │Coinbase│         │
│  └────────┘  └────────┘         │
└──────────────────────────────────┘
        │            │
        ▼            ▼
┌─────────────────────────────────┐
│   Instance 1 (WebSocket Host)   │
│  ┌──────────────────────────┐   │
│  │  WebSocket Manager       │   │
│  │  - All Connections       │   │
│  └──────────────────────────┘   │
│             │                    │
│             ▼                    │
│  ┌──────────────────────────┐   │
│  │  Redis Event Bridge      │◄──┼──────┐
│  │  - Publish Events        │   │      │
│  └──────────────────────────┘   │      │
└─────────────────────────────────┘      │
                                          │
        ┌─────────────────────────────────┤
        │       Redis Pub/Sub Server      │
        │  Channels:                      │
        │  - ws:ticker                    │
        │  - ws:trade                     │
        │  - ws:orderbook                 │
        │  - ws:candle                    │
        └─────────────────────────────────┤
                                          │
┌─────────────────────────────────┐      │
│   Instance 2 (Bot Executor)     │      │
│  ┌──────────────────────────┐   │      │
│  │  Redis Event Bridge      │◄──┼──────┘
│  │  - Subscribe Events      │   │
│  └──────────────────────────┘   │
│             │                    │
│             ▼                    │
│  ┌──────────────────────────┐   │
│  │  Bot Execution Engine    │   │
│  │  - 50 Bots (set 1-50)    │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│   Instance 3 (Bot Executor)     │
│  ┌──────────────────────────┐   │
│  │  Redis Event Bridge      │◄──┼──────┐
│  │  - Subscribe Events      │   │      │
│  └──────────────────────────┘   │      │
│             │                    │      │
│             ▼                    │      │
│  ┌──────────────────────────┐   │      │
│  │  Bot Execution Engine    │   │      │
│  │  - 50 Bots (set 51-100)  │   │      │
│  └──────────────────────────┘   │      │
└─────────────────────────────────┘      │
```

**Benefits**:
- Scales to 1000s of bots across multiple instances
- Single set of WebSocket connections (cost-effective)
- High availability with automatic failover
- Sub-100ms latency between instances

---

## Configuration

### Prerequisites

1. **Redis Server** (v6.0+)
   - Local development: `docker run -d -p 6379:6379 redis:7-alpine`
   - Production: Redis Cloud, AWS ElastiCache, or self-hosted cluster

2. **Node Package**: `ioredis`
   ```bash
   bun add ioredis
   ```

### Environment Variables

Add to your `.env` file:

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password-here  # Optional
REDIS_DB=0                         # Default: 0
REDIS_KEY_PREFIX=ws:              # Channel prefix

# Feature Flags
ENABLE_REDIS_SCALING=true         # Enable Redis pub/sub
REDIS_ENABLE_PUBLISHING=true      # Publish events to Redis
REDIS_ENABLE_SUBSCRIPTION=true    # Subscribe to events from Redis

# Reconnection
REDIS_MAX_RETRIES=10              # Max reconnection attempts
REDIS_RETRY_DELAY=1000            # Delay between retries (ms)
```

### Configuration Options

#### Basic Configuration

```typescript
import { MarketDataWebSocketManager } from '@/modules/market-data/websocket';

const manager = new MarketDataWebSocketManager({
  enableRedis: true,
  redis: {
    host: 'localhost',
    port: 6379,
    keyPrefix: 'ws:',
  },
});
```

#### Advanced Configuration

```typescript
const manager = new MarketDataWebSocketManager({
  enableRedis: true,
  redis: {
    // Connection
    redisUrl: 'redis://user:pass@redis.example.com:6379/0',
    // OR
    host: 'redis.example.com',
    port: 6379,
    password: 'secure-password',
    db: 0,

    // Behavior
    keyPrefix: 'production:ws:',
    enablePublishing: true,
    enableSubscription: true,

    // Reconnection
    reconnection: {
      maxRetries: 10,
      retryDelay: 1000, // 1 second
    },
  },
});
```

#### Production Configuration

```typescript
// Load from environment
const manager = new MarketDataWebSocketManager({
  enableRedis: process.env.ENABLE_REDIS_SCALING === 'true',
  redis: {
    redisUrl: process.env.REDIS_URL,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'ws:',
    reconnection: {
      maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '10'),
      retryDelay: parseInt(process.env.REDIS_RETRY_DELAY || '1000'),
    },
  },
});
```

---

## Usage

### 1. WebSocket Host Instance

This instance manages exchange WebSocket connections and publishes events to Redis.

```typescript
import { MarketDataWebSocketManager } from '@/modules/market-data/websocket';

// Create manager with Redis publishing enabled
const manager = new MarketDataWebSocketManager({
  enableRedis: true,
  redis: {
    host: 'localhost',
    port: 6379,
    enablePublishing: true,   // Publish to Redis
    enableSubscription: false, // Don't subscribe (saves resources)
  },
});

// Connect to exchanges
await manager.connect('binance', {
  url: 'wss://stream.binance.com:9443/ws',
});

await manager.connect('coinbase', {
  url: 'wss://ws-feed.exchange.coinbase.com',
});

// Subscribe to market data
await manager.subscribe({
  channel: 'ticker',
  symbol: 'BTC/USDT',
});

// Events are automatically published to Redis
// Other instances will receive them
```

### 2. Bot Executor Instances

These instances subscribe to Redis events and execute bots.

```typescript
import { MarketDataWebSocketManager } from '@/modules/market-data/websocket';
import { BotExecutionEngine } from '@/modules/bots/engine';

// Create manager with Redis subscription enabled
const manager = new MarketDataWebSocketManager({
  enableRedis: true,
  redis: {
    host: 'localhost',
    port: 6379,
    enablePublishing: false,  // Don't publish (no WebSocket connections)
    enableSubscription: true, // Subscribe to events
  },
});

// Listen for market data events from Redis
manager.on('ticker', (ticker) => {
  console.log('Received ticker from Redis:', ticker);
});

// Bot execution engine will receive events via manager
const engine = new BotExecutionEngine(bot, strategy, config);
await engine.initialize();
```

### 3. Hybrid Instance

Run both WebSocket connections and bot execution.

```typescript
const manager = new MarketDataWebSocketManager({
  enableRedis: true,
  redis: {
    enablePublishing: true,   // Publish events
    enableSubscription: true, // Also receive from other instances
  },
});

// Connect to exchanges and subscribe
await manager.connect('binance', { url: 'wss://...' });
await manager.subscribe({ channel: 'ticker', symbol: 'BTC/USDT' });

// Run bots locally
const engine = new BotExecutionEngine(bot, strategy, config);
await engine.initialize();
```

### 4. Monitoring Redis

```typescript
// Get Redis metrics
const redisMetrics = manager.getRedisMetrics();
console.log({
  connected: redisMetrics.connected,
  publishedEvents: redisMetrics.publishedEvents,
  receivedEvents: redisMetrics.receivedEvents,
  errors: redisMetrics.errors,
  subscriptions: redisMetrics.subscriptions,
});

// Get comprehensive system metrics
const systemMetrics = manager.getSystemMetrics();
console.log({
  exchanges: systemMetrics.exchanges,
  redis: systemMetrics.redis,
  connections: systemMetrics.connections,
  health: systemMetrics.health,
});
```

---

## Deployment

### Development Setup

```bash
# Terminal 1: Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# Terminal 2: WebSocket Host
ENABLE_REDIS_SCALING=true \
REDIS_ENABLE_PUBLISHING=true \
REDIS_ENABLE_SUBSCRIPTION=false \
bun run dev

# Terminal 3: Bot Executor 1
ENABLE_REDIS_SCALING=true \
REDIS_ENABLE_PUBLISHING=false \
REDIS_ENABLE_SUBSCRIPTION=true \
bun run dev

# Terminal 4: Bot Executor 2
ENABLE_REDIS_SCALING=true \
REDIS_ENABLE_PUBLISHING=false \
REDIS_ENABLE_SUBSCRIPTION=true \
bun run dev
```

### Docker Compose

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

  websocket-host:
    build: .
    environment:
      NODE_ENV: production
      ENABLE_REDIS_SCALING: "true"
      REDIS_HOST: redis
      REDIS_ENABLE_PUBLISHING: "true"
      REDIS_ENABLE_SUBSCRIPTION: "false"
    depends_on:
      - redis
    deploy:
      replicas: 1

  bot-executor:
    build: .
    environment:
      NODE_ENV: production
      ENABLE_REDIS_SCALING: "true"
      REDIS_HOST: redis
      REDIS_ENABLE_PUBLISHING: "false"
      REDIS_ENABLE_SUBSCRIPTION: "true"
    depends_on:
      - redis
      - websocket-host
    deploy:
      replicas: 5  # 5 bot executor instances

volumes:
  redis-data:
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: websocket-host
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: app
        image: beecripto:latest
        env:
        - name: ENABLE_REDIS_SCALING
          value: "true"
        - name: REDIS_HOST
          value: redis-service
        - name: REDIS_ENABLE_PUBLISHING
          value: "true"
        - name: REDIS_ENABLE_SUBSCRIPTION
          value: "false"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bot-executor
spec:
  replicas: 10  # Scale as needed
  template:
    spec:
      containers:
      - name: app
        image: beecripto:latest
        env:
        - name: ENABLE_REDIS_SCALING
          value: "true"
        - name: REDIS_HOST
          value: redis-service
        - name: REDIS_ENABLE_PUBLISHING
          value: "false"
        - name: REDIS_ENABLE_SUBSCRIPTION
          value: "true"
```

---

## Monitoring

### Health Checks

```typescript
// Check Redis connection status
const redisMetrics = manager.getRedisMetrics();
if (!redisMetrics || !redisMetrics.connected) {
  console.error('Redis disconnected!');
}

// Monitor event flow
setInterval(() => {
  const metrics = manager.getRedisMetrics();
  console.log({
    published: metrics.publishedEvents,
    received: metrics.receivedEvents,
    errors: metrics.errors,
    rate: `${metrics.publishedEvents / 60} events/sec`,
  });
}, 60000); // Every minute
```

### Metrics to Track

1. **Connection Health**
   - `redis.connected`: Boolean
   - `redis.errors`: Error count
   - `redis.subscriptions`: Active subscriptions

2. **Event Flow**
   - `redis.publishedEvents`: Total events published
   - `redis.receivedEvents`: Total events received
   - **Publish Rate**: Events/second from WebSocket host
   - **Receive Rate**: Events/second per bot executor

3. **Latency**
   - Time from exchange → WebSocket host → Redis → Bot executor
   - Target: < 100ms end-to-end

4. **Resource Usage**
   - Redis memory usage
   - Network bandwidth
   - CPU usage per instance

### Prometheus Metrics

```typescript
// Export metrics for Prometheus
app.get('/metrics', (req, res) => {
  const metrics = manager.getSystemMetrics();

  res.send(`
# HELP redis_connected Redis connection status
# TYPE redis_connected gauge
redis_connected ${metrics.redis?.connected ? 1 : 0}

# HELP redis_events_published_total Total events published to Redis
# TYPE redis_events_published_total counter
redis_events_published_total ${metrics.redis?.publishedEvents || 0}

# HELP redis_events_received_total Total events received from Redis
# TYPE redis_events_received_total counter
redis_events_received_total ${metrics.redis?.receivedEvents || 0}

# HELP redis_errors_total Total Redis errors
# TYPE redis_errors_total counter
redis_errors_total ${metrics.redis?.errors || 0}
  `);
});
```

---

## Troubleshooting

### Issue: Redis Connection Timeout

**Symptom**: `Redis connection timeout` error

**Causes**:
- Redis server not running
- Incorrect host/port configuration
- Network firewall blocking connection

**Solutions**:
```bash
# Check if Redis is running
redis-cli ping  # Should return PONG

# Test connection
telnet localhost 6379

# Check firewall rules
sudo ufw status
```

### Issue: Events Not Being Received

**Symptom**: WebSocket host publishes events but bot executors don't receive them

**Causes**:
- Subscription not configured
- Wrong channel prefix
- Publisher and subscriber using different databases

**Solutions**:
```typescript
// Verify configuration matches
const config = {
  keyPrefix: 'ws:',  // Must match on both sides
  db: 0,             // Must match on both sides
};

// Check subscriptions
const metrics = manager.getRedisMetrics();
console.log('Active subscriptions:', metrics.activeSubscriptions);

// Enable debug logging
process.env.LOG_LEVEL = 'debug';
```

### Issue: High Memory Usage in Redis

**Symptom**: Redis memory usage growing continuously

**Causes**:
- Too many events being buffered
- Slow subscribers can't keep up
- Events not being consumed

**Solutions**:
```bash
# Check Redis memory usage
redis-cli info memory

# Set max memory limit
redis-cli config set maxmemory 2gb
redis-cli config set maxmemory-policy allkeys-lru

# Monitor slow subscribers
redis-cli client list
```

### Issue: Duplicate Events

**Symptom**: Bot receives same event multiple times

**Causes**:
- Multiple instances subscribing with same process.pid
- Redis bridge reconnecting
- Application logic subscribing multiple times

**Solutions**:
```typescript
// Verify process.pid filtering is working
// Each instance should have unique process.pid

// Check for duplicate subscriptions
const metrics = manager.getRedisMetrics();
console.log('Subscriptions:', metrics.subscriptions);

// Add deduplication logic in bot
const processedEvents = new Set();
manager.on('ticker', (ticker) => {
  const eventKey = `${ticker.symbol}-${ticker.timestamp}`;
  if (processedEvents.has(eventKey)) {
    return; // Already processed
  }
  processedEvents.add(eventKey);
  // Process event...
});
```

### Issue: Latency Too High

**Symptom**: > 100ms delay from exchange to bot

**Causes**:
- Network latency between instances
- Redis server overloaded
- Too many events per second

**Solutions**:
```bash
# Monitor Redis latency
redis-cli --latency

# Check network latency
ping redis-host

# Optimize Redis
# Use Redis Cluster for horizontal scaling
# Enable Redis persistence for reliability
```

---

## Performance Tuning

### Redis Configuration

```bash
# /etc/redis/redis.conf

# Network
bind 0.0.0.0
port 6379
tcp-backlog 511
timeout 0
tcp-keepalive 300

# Performance
maxclients 10000
maxmemory 4gb
maxmemory-policy allkeys-lru

# Persistence (for production)
save 900 1
save 300 10
save 60 10000

# Pub/Sub specific
client-output-buffer-limit pubsub 32mb 8mb 60
```

### Application Configuration

```typescript
// Batch event publishing for better performance
const eventBatch: WebSocketEvent[] = [];
const BATCH_SIZE = 10;
const BATCH_INTERVAL = 50; // ms

manager.on('ticker', (ticker) => {
  eventBatch.push({ type: 'ticker', data: ticker });

  if (eventBatch.length >= BATCH_SIZE) {
    flushBatch();
  }
});

setInterval(flushBatch, BATCH_INTERVAL);

async function flushBatch() {
  if (eventBatch.length === 0) return;

  const batch = [...eventBatch];
  eventBatch.length = 0;

  await Promise.all(
    batch.map(event => manager.publish(event))
  );
}
```

---

## Best Practices

1. **Separate WebSocket and Bot Execution**
   - Run dedicated WebSocket host instances
   - Scale bot executor instances independently

2. **Monitor Everything**
   - Track Redis connection health
   - Monitor event flow rates
   - Alert on errors

3. **Plan for Failures**
   - WebSocket host should reconnect automatically
   - Bot executors should handle missing events gracefully
   - Use Redis persistence for reliability

4. **Optimize for Latency**
   - Deploy Redis close to application instances
   - Use Redis Cluster for horizontal scaling
   - Batch events when possible

5. **Security**
   - Use Redis password authentication
   - Enable TLS for production
   - Restrict Redis network access

---

## Additional Resources

- [Redis Pub/Sub Documentation](https://redis.io/topics/pubsub)
- [ioredis Documentation](https://github.com/luin/ioredis)
- [WebSocket Manager Documentation](./WEBSOCKET_USAGE_GUIDE.md)
- [Bot Integration Guide](./BOT_WEBSOCKET_INTEGRATION.md)

---

**Last Updated**: 2025-01-17
**Version**: 1.0.0
