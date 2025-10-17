# Production Deployment Guide

**Version**: 1.0.0
**Date**: 2025-10-17
**Status**: ✅ Ready for Deployment
**Target Environment**: Staging → Production

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Environment Setup](#environment-setup)
4. [Configuration Management](#configuration-management)
5. [Deployment Steps](#deployment-steps)
6. [Monitoring Setup](#monitoring-setup)
7. [Health Checks](#health-checks)
8. [Rollback Procedures](#rollback-procedures)
9. [Troubleshooting](#troubleshooting)
10. [Post-Deployment Checklist](#post-deployment-checklist)

---

## Prerequisites

### System Requirements

**Redis Server**:
- Version: 6.0+ (or 7.0+ recommended)
- Memory: 2GB minimum (4GB recommended for production)
- CPU: 2 cores minimum (4 cores recommended)
- Storage: 10GB for logs and persistence
- Network: Low-latency connection to application instances

**Application Server** (per instance):
- Runtime: Bun 1.0+
- Memory: 512MB minimum (1GB recommended)
- CPU: 1 core minimum (2 cores recommended)
- Storage: 5GB for application and logs
- Network: Low-latency connection to Redis

**Load Balancer** (optional but recommended):
- Any modern load balancer (Nginx, HAProxy, AWS ALB)
- SSL/TLS termination support
- WebSocket support
- Health check endpoints

### Access Requirements

- [ ] SSH access to all servers
- [ ] Redis admin access
- [ ] Database admin access (if using persistent storage)
- [ ] CI/CD pipeline access
- [ ] Monitoring dashboard access
- [ ] Log aggregation system access

### Software Requirements

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Verify installation
bun --version  # Should be 1.0.0 or higher

# Install Redis
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis

# Verify Redis
redis-cli --version
```

---

## Architecture Overview

### Deployment Topology

```
┌─────────────────────────────────────────────────────────┐
│                    Load Balancer                        │
│            (SSL Termination, Health Checks)             │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┬──────────────┐
        │                         │              │
        ▼                         ▼              ▼
┌───────────────┐         ┌───────────────┐  ┌───────────────┐
│   App Instance 1  │     │   App Instance 2  │  │   App Instance N  │
│   (WebSocket)     │     │   (Bot Engine)    │  │   (Bot Engine)    │
│                   │     │                   │  │                   │
│   - Exchanges     │     │   - Trading Bots  │  │   - Trading Bots  │
│   - Market Data   │     │   - Strategies    │  │   - Strategies    │
│   - Redis Pub     │     │   - Redis Sub     │  │   - Redis Sub     │
└────────┬──────────┘     └────────┬──────────┘  └────────┬──────────┘
         │                         │                       │
         └─────────────────────────┼───────────────────────┘
                                   │
                                   ▼
                        ┌──────────────────┐
                        │   Redis Server   │
                        │   (Pub/Sub)      │
                        │                  │
                        │   - Events       │
                        │   - Caching      │
                        │   - Sessions     │
                        └──────────────────┘
                                   │
                                   ▼
                        ┌──────────────────┐
                        │   PostgreSQL     │
                        │   + TimescaleDB  │
                        │                  │
                        │   - Persistent   │
                        │   - Time-series  │
                        └──────────────────┘
```

### Component Responsibilities

**WebSocket Instance** (Instance 1):
- Maintains connections to exchanges
- Receives real-time market data
- Publishes events to Redis
- Does NOT run trading bots

**Bot Instances** (Instances 2-N):
- Subscribe to Redis events
- Execute trading strategies
- Manage positions and orders
- Scale horizontally based on load

**Redis**:
- Event distribution hub
- Real-time pub/sub
- Session management
- Caching layer

**PostgreSQL + TimescaleDB**:
- Persistent data storage
- Time-series market data
- Trading history
- User accounts

---

## Environment Setup

### Environment Variables

Create `.env.production` file:

```bash
# =============================================================================
# APPLICATION SETTINGS
# =============================================================================
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Instance Configuration
INSTANCE_ID=${HOSTNAME}  # Automatically uses hostname
INSTANCE_TYPE=websocket  # websocket | bot | hybrid

# =============================================================================
# REDIS CONFIGURATION
# =============================================================================
REDIS_HOST=redis.production.internal
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-redis-password
REDIS_DB=0

# Redis Pub/Sub
REDIS_ENABLE_PUBSUB=true
REDIS_KEY_PREFIX=ws:prod:

# Redis Connection Pool
REDIS_MAX_RETRIES=10
REDIS_RETRY_DELAY=1000
REDIS_CONNECT_TIMEOUT=10000

# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================
DATABASE_URL=postgresql://user:password@postgres.production.internal:5432/botcripto
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_SSL=true

# =============================================================================
# WEBSOCKET CONFIGURATION
# =============================================================================
# Enable WebSocket management (only on WebSocket instance)
WS_ENABLE_MANAGER=true

# Exchange Connections
WS_BINANCE_ENABLE=true
WS_COINBASE_ENABLE=true
WS_KRAKEN_ENABLE=false

# WebSocket Timeouts
WS_TIMEOUT=30000
WS_PING_INTERVAL=30000
WS_PONG_TIMEOUT=10000

# Reconnection Strategy
WS_MAX_RETRIES=5
WS_INITIAL_DELAY=1000
WS_MAX_DELAY=30000
WS_BACKOFF_MULTIPLIER=2

# =============================================================================
# TRADING BOT CONFIGURATION
# =============================================================================
# Enable bot execution (only on bot instances)
BOT_ENABLE=true
BOT_MAX_CONCURRENT=50

# Risk Management
BOT_MAX_POSITION_SIZE=1000
BOT_MAX_DAILY_LOSS=500
BOT_REQUIRE_CONFIRMATION=true

# =============================================================================
# MONITORING & LOGGING
# =============================================================================
# Logging
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE=/var/log/botcripto/app.log
LOG_MAX_SIZE=100m
LOG_MAX_FILES=10

# Metrics
METRICS_ENABLE=true
METRICS_PORT=9090
METRICS_PATH=/metrics

# Health Checks
HEALTH_CHECK_ENABLE=true
HEALTH_CHECK_PORT=8080
HEALTH_CHECK_PATH=/health

# =============================================================================
# SECURITY
# =============================================================================
# API Keys (for exchanges)
BINANCE_API_KEY=your-binance-api-key
BINANCE_SECRET_KEY=your-binance-secret-key
COINBASE_API_KEY=your-coinbase-api-key
COINBASE_SECRET_KEY=your-coinbase-secret-key

# Session Security
SESSION_SECRET=your-very-long-random-secret-key-change-this
JWT_SECRET=your-jwt-secret-key-change-this

# CORS
CORS_ORIGIN=https://app.botcripto.com
CORS_CREDENTIALS=true

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100

# =============================================================================
# PERFORMANCE
# =============================================================================
# Bun Runtime
BUN_JSC_useJIT=1
BUN_JSC_useSamplingProfiler=0

# Memory Limits
NODE_OPTIONS="--max-old-space-size=1024"

# Worker Threads
WORKER_THREADS=2
```

### Configuration Files

**config/production.ts**:
```typescript
export const productionConfig = {
  // WebSocket Manager Configuration
  websocket: {
    enableRedis: true,
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'ws:prod:',
      instanceId: process.env.INSTANCE_ID || process.pid,
      enablePublishing: process.env.INSTANCE_TYPE === 'websocket',
      enableSubscription: process.env.INSTANCE_TYPE !== 'websocket',
      reconnection: {
        maxRetries: 10,
        retryDelay: 1000,
      },
    },
    exchanges: {
      binance: {
        enabled: process.env.WS_BINANCE_ENABLE === 'true',
        url: 'wss://stream.binance.com:9443/ws',
        timeout: 30000,
      },
      coinbase: {
        enabled: process.env.WS_COINBASE_ENABLE === 'true',
        url: 'wss://ws-feed.exchange.coinbase.com',
        timeout: 30000,
      },
    },
  },

  // Bot Engine Configuration
  bots: {
    enabled: process.env.BOT_ENABLE === 'true',
    maxConcurrent: parseInt(process.env.BOT_MAX_CONCURRENT || '50'),
    riskManagement: {
      maxPositionSize: parseFloat(process.env.BOT_MAX_POSITION_SIZE || '1000'),
      maxDailyLoss: parseFloat(process.env.BOT_MAX_DAILY_LOSS || '500'),
    },
  },

  // Monitoring Configuration
  monitoring: {
    metrics: {
      enabled: process.env.METRICS_ENABLE === 'true',
      port: parseInt(process.env.METRICS_PORT || '9090'),
      path: process.env.METRICS_PATH || '/metrics',
    },
    healthCheck: {
      enabled: process.env.HEALTH_CHECK_ENABLE === 'true',
      port: parseInt(process.env.HEALTH_CHECK_PORT || '8080'),
      path: process.env.HEALTH_CHECK_PATH || '/health',
    },
  },
};
```

---

## Configuration Management

### Environment-Specific Configs

**Development** (`.env.development`):
```bash
NODE_ENV=development
REDIS_HOST=localhost
LOG_LEVEL=debug
METRICS_ENABLE=false
```

**Staging** (`.env.staging`):
```bash
NODE_ENV=staging
REDIS_HOST=redis.staging.internal
LOG_LEVEL=info
METRICS_ENABLE=true
```

**Production** (`.env.production`):
```bash
NODE_ENV=production
REDIS_HOST=redis.production.internal
LOG_LEVEL=warn
METRICS_ENABLE=true
```

### Secrets Management

**Option 1: Environment Variables** (Simple)
```bash
# Set via systemd service file
Environment="REDIS_PASSWORD=secret123"
Environment="DATABASE_URL=postgresql://..."
```

**Option 2: Docker Secrets** (Recommended for Docker)
```bash
# Create secrets
echo "secret123" | docker secret create redis_password -
echo "postgresql://..." | docker secret create database_url -

# Use in docker-compose.yml
secrets:
  - redis_password
  - database_url
```

**Option 3: HashiCorp Vault** (Enterprise)
```bash
# Store secrets
vault kv put secret/botcripto/prod redis_password="secret123"

# Retrieve in application
export REDIS_PASSWORD=$(vault kv get -field=redis_password secret/botcripto/prod)
```

---

## Deployment Steps

### Step 1: Pre-Deployment Checks

```bash
#!/bin/bash
# pre-deployment-checks.sh

echo "Running pre-deployment checks..."

# Check Redis connectivity
if ! redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping | grep -q PONG; then
  echo "❌ Redis connection failed"
  exit 1
fi
echo "✅ Redis connection successful"

# Check database connectivity
if ! psql $DATABASE_URL -c "SELECT 1" > /dev/null 2>&1; then
  echo "❌ Database connection failed"
  exit 1
fi
echo "✅ Database connection successful"

# Check disk space
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
  echo "⚠️  Warning: Disk usage is ${DISK_USAGE}%"
fi

# Check memory
FREE_MEM=$(free -m | awk 'NR==2{printf "%.0f", $7}')
if [ $FREE_MEM -lt 512 ]; then
  echo "⚠️  Warning: Available memory is ${FREE_MEM}MB"
fi

echo "✅ Pre-deployment checks passed"
```

### Step 2: Build Application

```bash
#!/bin/bash
# build.sh

echo "Building application..."

# Install dependencies
bun install --frozen-lockfile

# Run type checking
echo "Running type checks..."
bun run type-check

# Run linting
echo "Running linter..."
bun run lint

# Run tests
echo "Running tests..."
bun test

echo "✅ Build completed successfully"
```

### Step 3: Deploy WebSocket Instance

```bash
#!/bin/bash
# deploy-websocket-instance.sh

INSTANCE_TYPE=websocket
INSTANCE_NAME=botcripto-ws-01

echo "Deploying WebSocket instance: $INSTANCE_NAME"

# Stop existing instance
sudo systemctl stop $INSTANCE_NAME || true

# Copy application files
sudo rsync -av --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude logs \
  ./ /opt/botcripto/

# Install dependencies
cd /opt/botcripto
bun install --production

# Set environment
cp .env.production .env
export INSTANCE_TYPE=websocket
export INSTANCE_ID=$INSTANCE_NAME

# Start service
sudo systemctl start $INSTANCE_NAME
sudo systemctl enable $INSTANCE_NAME

# Wait for health check
echo "Waiting for instance to become healthy..."
for i in {1..30}; do
  if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ Instance is healthy"
    exit 0
  fi
  echo "Waiting... ($i/30)"
  sleep 2
done

echo "❌ Instance failed to become healthy"
exit 1
```

### Step 4: Deploy Bot Instances

```bash
#!/bin/bash
# deploy-bot-instances.sh

NUM_INSTANCES=${1:-3}

echo "Deploying $NUM_INSTANCES bot instances..."

for i in $(seq 1 $NUM_INSTANCES); do
  INSTANCE_NAME=botcripto-bot-$(printf "%02d" $i)

  echo "Deploying $INSTANCE_NAME..."

  # Copy application
  sudo rsync -av --delete ./ /opt/botcripto-$i/

  # Configure
  cd /opt/botcripto-$i
  cp .env.production .env
  export INSTANCE_TYPE=bot
  export INSTANCE_ID=$INSTANCE_NAME

  # Start
  sudo systemctl start $INSTANCE_NAME
  sudo systemctl enable $INSTANCE_NAME

  # Health check
  if curl -f http://localhost:$((8080 + i))/health > /dev/null 2>&1; then
    echo "✅ $INSTANCE_NAME is healthy"
  else
    echo "⚠️  $INSTANCE_NAME health check failed"
  fi

  # Stagger startups
  sleep 5
done

echo "✅ All bot instances deployed"
```

### Step 5: Verify Deployment

```bash
#!/bin/bash
# verify-deployment.sh

echo "Verifying deployment..."

# Check all instances are running
EXPECTED_INSTANCES=4  # 1 WebSocket + 3 Bot
RUNNING_INSTANCES=$(systemctl list-units --type=service --state=running | grep botcripto | wc -l)

if [ $RUNNING_INSTANCES -ne $EXPECTED_INSTANCES ]; then
  echo "❌ Expected $EXPECTED_INSTANCES instances, found $RUNNING_INSTANCES"
  exit 1
fi
echo "✅ All instances are running"

# Check Redis pub/sub is working
echo "Testing Redis pub/sub..."
TEST_MESSAGE=$(date +%s)
redis-cli -h $REDIS_HOST PUBLISH ws:prod:test "$TEST_MESSAGE"
sleep 1

# Check logs for test message
if grep -q "$TEST_MESSAGE" /var/log/botcripto/app.log; then
  echo "✅ Redis pub/sub is working"
else
  echo "⚠️  Redis pub/sub test inconclusive"
fi

# Check exchange connections (WebSocket instance)
if curl -s http://localhost:8080/health | jq -r '.exchanges.binance.connected' | grep -q true; then
  echo "✅ Binance connection established"
else
  echo "⚠️  Binance connection failed"
fi

echo "✅ Deployment verification complete"
```

---

## Monitoring Setup

### Health Check Endpoint

```typescript
// src/api/health.ts
export const healthCheck = {
  async check() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      instance: {
        id: process.env.INSTANCE_ID,
        type: process.env.INSTANCE_TYPE,
        pid: process.pid,
      },
      redis: {
        connected: false,
        latency: 0,
      },
      exchanges: {},
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        percentage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
      },
    };

    // Check Redis
    try {
      const start = Date.now();
      await redis.ping();
      health.redis.connected = true;
      health.redis.latency = Date.now() - start;
    } catch (error) {
      health.status = 'unhealthy';
      health.redis.error = error.message;
    }

    // Check exchanges (WebSocket instance only)
    if (process.env.INSTANCE_TYPE === 'websocket') {
      const wsManager = getWebSocketManager();
      const exchanges = ['binance', 'coinbase'];

      for (const exchange of exchanges) {
        health.exchanges[exchange] = {
          connected: wsManager.isConnected(exchange),
          subscriptions: wsManager.getSubscriptionCount(exchange),
        };
      }
    }

    return health;
  },
};
```

### Metrics Endpoint

```typescript
// src/api/metrics.ts
import { Registry, Counter, Gauge, Histogram } from 'prom-client';

const register = new Registry();

// Event metrics
export const eventsPublished = new Counter({
  name: 'botcripto_events_published_total',
  help: 'Total number of events published to Redis',
  labelNames: ['type'],
  registers: [register],
});

export const eventsReceived = new Counter({
  name: 'botcripto_events_received_total',
  help: 'Total number of events received from Redis',
  labelNames: ['type'],
  registers: [register],
});

export const eventLatency = new Histogram({
  name: 'botcripto_event_latency_ms',
  help: 'Event latency in milliseconds',
  buckets: [0.1, 0.5, 1, 2, 5, 10, 20, 50, 100],
  registers: [register],
});

// System metrics
export const memoryUsage = new Gauge({
  name: 'botcripto_memory_usage_bytes',
  help: 'Memory usage in bytes',
  registers: [register],
});

export const cpuUsage = new Gauge({
  name: 'botcripto_cpu_usage_percent',
  help: 'CPU usage percentage',
  registers: [register],
});

// Update metrics periodically
setInterval(() => {
  const mem = process.memoryUsage();
  memoryUsage.set(mem.heapUsed);
}, 5000);

export const metricsHandler = async () => {
  return new Response(await register.metrics(), {
    headers: { 'Content-Type': register.contentType },
  });
};
```

### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'botcripto-websocket'
    static_configs:
      - targets: ['botcripto-ws-01:9090']
        labels:
          instance_type: 'websocket'
          environment: 'production'

  - job_name: 'botcripto-bots'
    static_configs:
      - targets:
        - 'botcripto-bot-01:9090'
        - 'botcripto-bot-02:9090'
        - 'botcripto-bot-03:9090'
        labels:
          instance_type: 'bot'
          environment: 'production'

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - 'alerts.yml'
```

### Alert Rules

```yaml
# alerts.yml
groups:
  - name: botcripto
    interval: 30s
    rules:
      # Latency alerts
      - alert: HighEventLatency
        expr: histogram_quantile(0.95, botcripto_event_latency_ms) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High event latency detected"
          description: "P95 latency is {{ $value }}ms (threshold: 10ms)"

      - alert: CriticalEventLatency
        expr: histogram_quantile(0.95, botcripto_event_latency_ms) > 50
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Critical event latency"
          description: "P95 latency is {{ $value }}ms (threshold: 50ms)"

      # Memory alerts
      - alert: HighMemoryUsage
        expr: (botcripto_memory_usage_bytes / 1024 / 1024 / 1024) > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value }}GB (threshold: 0.8GB)"

      # Redis connectivity
      - alert: RedisConnectionLost
        expr: up{job="botcripto-websocket"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis connection lost"
          description: "WebSocket instance cannot connect to Redis"

      # Exchange connectivity
      - alert: ExchangeDisconnected
        expr: botcripto_exchange_connected{exchange="binance"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Exchange disconnected"
          description: "Connection to {{ $labels.exchange }} lost"
```

---

## Health Checks

### Kubernetes Readiness Probe

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: botcripto-websocket
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: app
        image: botcripto:latest
        ports:
        - containerPort: 3000
        - containerPort: 8080
        - containerPort: 9090
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          successThreshold: 1
          failureThreshold: 3
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
```

### Docker Health Check

```dockerfile
# Dockerfile
FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

COPY . .

EXPOSE 3000 8080 9090

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

CMD ["bun", "run", "src/index.ts"]
```

---

## Rollback Procedures

### Quick Rollback

```bash
#!/bin/bash
# rollback.sh

PREVIOUS_VERSION=${1:-"previous"}

echo "Rolling back to version: $PREVIOUS_VERSION"

# Stop current version
sudo systemctl stop botcripto-*

# Restore previous version
sudo rm -rf /opt/botcripto
sudo cp -r /opt/botcripto-backup-$PREVIOUS_VERSION /opt/botcripto

# Restart services
sudo systemctl start botcripto-ws-01
sleep 5

for i in {1..3}; do
  sudo systemctl start botcripto-bot-$(printf "%02d" $i)
  sleep 3
done

# Verify
./verify-deployment.sh

echo "✅ Rollback complete"
```

### Database Rollback

```bash
#!/bin/bash
# rollback-database.sh

MIGRATION_VERSION=${1}

echo "Rolling back database to version: $MIGRATION_VERSION"

# Run migration rollback
bun run drizzle-kit rollback --to=$MIGRATION_VERSION

echo "✅ Database rollback complete"
```

---

## Troubleshooting

### Common Issues

#### Issue 1: Redis Connection Failed

**Symptoms**:
- Health check shows `redis.connected: false`
- Logs show "Redis connection error"

**Diagnosis**:
```bash
# Test Redis connectivity
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping

# Check Redis logs
sudo tail -f /var/log/redis/redis.log

# Check network connectivity
telnet $REDIS_HOST $REDIS_PORT
```

**Solutions**:
1. Verify Redis password in `.env`
2. Check firewall rules allow Redis port
3. Verify Redis server is running
4. Check Redis maxclients setting

#### Issue 2: High Event Latency

**Symptoms**:
- P95 latency > 10ms
- Slow event processing

**Diagnosis**:
```bash
# Check Redis latency
redis-cli --latency -h $REDIS_HOST

# Check system load
uptime
top

# Check network latency
ping $REDIS_HOST
```

**Solutions**:
1. Scale Redis vertically (more CPU/RAM)
2. Add more bot instances (horizontal scaling)
3. Enable Redis persistence if disabled
4. Check for slow queries in application

#### Issue 3: Exchange Connection Lost

**Symptoms**:
- Health check shows exchange disconnected
- No market data events

**Diagnosis**:
```bash
# Check WebSocket instance logs
sudo journalctl -u botcripto-ws-01 -f

# Test exchange connectivity
curl -v https://stream.binance.com:9443/ws

# Check API keys
curl -H "X-MBX-APIKEY: $BINANCE_API_KEY" https://api.binance.com/api/v3/account
```

**Solutions**:
1. Verify exchange API keys
2. Check IP whitelist on exchange
3. Verify exchange service status
4. Restart WebSocket instance

---

## Post-Deployment Checklist

### Immediate Checks (0-1 hour)

- [ ] All instances are running and healthy
- [ ] Redis pub/sub is functioning
- [ ] Exchange connections established
- [ ] Market data events flowing
- [ ] No error logs
- [ ] Metrics endpoint responding
- [ ] Health checks passing

### Short-term Monitoring (1-24 hours)

- [ ] Event latency P95 < 5ms
- [ ] Event delivery rate > 99%
- [ ] Memory usage stable
- [ ] CPU usage < 50%
- [ ] No memory leaks detected
- [ ] No connection drops
- [ ] Trading bots executing correctly

### Long-term Validation (1-7 days)

- [ ] System stable for 24 hours
- [ ] Performance metrics within targets
- [ ] No unexpected errors
- [ ] Database growth as expected
- [ ] Backup procedures tested
- [ ] Monitoring alerts working
- [ ] Documentation updated

---

## Next Steps

1. **Staging Deployment** (This Week)
   - Deploy to staging environment
   - Run 24-hour stability test
   - Validate all monitoring and alerts
   - Test failure scenarios

2. **Production Deployment** (Next Week)
   - Deploy WebSocket instance
   - Monitor for 1 day
   - Deploy bot instances gradually
   - Monitor and optimize

3. **Optimization** (Ongoing)
   - Fine-tune based on real usage
   - Add automatic scaling
   - Implement advanced monitoring
   - Document operational learnings

---

**Guide Version**: 1.0.0
**Last Updated**: 2025-10-17
**Status**: ✅ Ready for Use
**Maintained By**: DevOps Team
