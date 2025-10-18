// @ts-nocheck
/**
 * Market Data WebSocket Manager
 * Manages real-time market data connections using native exchange adapters
 *
 * This replaces the ccxt.pro-dependent WebSocketManager with native WebSocket adapters
 */

import { EventEmitter } from 'events';
import logger from '@/utils/logger';
// Module not yet implemented
// import { createWebSocketAdapter } from '@/modules/exchanges';
import { RedisEventBridge, type RedisEventBridgeConfig } from './redis-event-bridge';
// Module not yet implemented
// import type { ConnectionConfig, ExchangeId } from '@/modules/exchanges';
import type { IExchangeAdapter, SubscriptionRequest, ConnectionStatus, OrderBook, Trade, Ticker, Candle, ExchangeEventName, ExchangeEventListener, ConnectionMetrics } from './types';

/**
 * Manager Configuration
 */
export interface MarketDataManagerConfig {
  /** Enable automatic reconnection */
  autoReconnect?: boolean;
  /** Maximum concurrent connections */
  maxConnections?: number;
  /** Connection timeout (ms) */
  connectionTimeout?: number;
  /** Enable metrics collection */
  enableMetrics?: boolean;
  /** Enable Redis pub/sub for multi-instance scaling */
  enableRedis?: boolean;
  /** Redis configuration */
  redis?: RedisEventBridgeConfig;
}

/**
 * Default Manager Configuration
 */
const DEFAULT_CONFIG: Required<Omit<MarketDataManagerConfig, 'redis'>> = {
  autoReconnect: true,
  maxConnections: 10,
  connectionTimeout: 30000,
  enableMetrics: true,
  enableRedis: false,
};

/**
 * Market Data WebSocket Manager
 * Manages multiple exchange WebSocket connections with native adapters
 */
export class MarketDataWebSocketManager extends EventEmitter {
  private adapters: Map<ExchangeId, IExchangeAdapter> = new Map();
  private config: Required<Omit<MarketDataManagerConfig, 'redis'>>;
  private redisConfig?: RedisEventBridgeConfig;
  private metrics: Map<ExchangeId, ConnectionMetrics> = new Map();
  private subscriptions: Map<ExchangeId, SubscriptionRequest[]> = new Map();
  private redisBridge: RedisEventBridge | null = null;

  constructor(config?: MarketDataManagerConfig) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.redisConfig = config?.redis;

    // Initialize Redis bridge if enabled
    if (this.config.enableRedis) {
      this.initializeRedis();
    }
  }

  /**
   * Initialize Redis event bridge
   */
  private async initializeRedis(): Promise<void> {
    try {
      logger.info('Initializing Redis event bridge for multi-instance scaling');

      this.redisBridge = new RedisEventBridge(this.redisConfig);

      // Set up Redis event listeners
      this.redisBridge.on('ticker', (data: Ticker) => {
        this.emit('ticker', data);
      });

      this.redisBridge.on('trade', (data: Trade) => {
        this.emit('trade', data);
      });

      this.redisBridge.on('orderbook', (data: OrderBook) => {
        this.emit('orderbook', data);
      });

      this.redisBridge.on('candle', (data: Candle) => {
        this.emit('candle', data);
      });

      // Connection events
      this.redisBridge.on('connected', () => {
        logger.info('Redis event bridge connected');
      });

      this.redisBridge.on('disconnected', () => {
        logger.warn('Redis event bridge disconnected');
      });

      this.redisBridge.on('error', (error: any) => {
        logger.error('Redis event bridge error', { error });
      });

      // Connect to Redis
      await this.redisBridge.connect();

      // Subscribe to all event types
      await this.redisBridge.subscribeAll();

      logger.info('Redis event bridge initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Redis event bridge', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - allow manager to work without Redis
      this.redisBridge = null;
    }
  }

  /**
   * Connect to exchange WebSocket
   */
  async connect(exchangeId: ExchangeId, config: ConnectionConfig): Promise<void> {
    try {
      // Check if already connected
      if (this.adapters.has(exchangeId)) {
        logger.warn('Exchange already connected', { exchangeId });
        return;
      }

      // Check max connections
      if (this.adapters.size >= this.config.maxConnections) {
        throw new Error(`Maximum connections reached (${this.config.maxConnections})`);
      }

      logger.info('Connecting to exchange WebSocket', { exchangeId });

      // Create appropriate adapter
      const adapter = this.createAdapter(exchangeId, config);

      // Set up event forwarding
      this.setupEventForwarding(adapter);

      // Connect
      await adapter.connect();

      // Store adapter
      this.adapters.set(exchangeId, adapter);

      // Initialize metrics
      if (this.config.enableMetrics) {
        this.initializeMetrics(exchangeId);
      }

      logger.info('Exchange WebSocket connected', { exchangeId });

      // Emit connected event
      this.emit('exchange:connected', { exchangeId, timestamp: Date.now() });
    } catch (error) {
      logger.error('Failed to connect to exchange WebSocket', {
        exchangeId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Disconnect from exchange WebSocket
   */
  async disconnect(exchangeId: ExchangeId): Promise<void> {
    const adapter = this.adapters.get(exchangeId);
    if (!adapter) {
      logger.warn('Exchange not connected', { exchangeId });
      return;
    }

    try {
      logger.info('Disconnecting from exchange WebSocket', { exchangeId });

      // Disconnect adapter
      await adapter.disconnect();

      // Remove from adapters
      this.adapters.delete(exchangeId);

      // Remove subscriptions
      this.subscriptions.delete(exchangeId);

      // Remove metrics
      this.metrics.delete(exchangeId);

      logger.info('Exchange WebSocket disconnected', { exchangeId });

      // Emit disconnected event
      this.emit('exchange:disconnected', { exchangeId, timestamp: Date.now() });
    } catch (error) {
      logger.error('Error disconnecting from exchange WebSocket', {
        exchangeId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Subscribe to market data channel
   */
  async subscribe(request: SubscriptionRequest): Promise<void> {
    const exchangeId = this.resolveExchangeForSubscribe(request);

    try {
      // Ensure connection exists
      const adapter = this.adapters.get(exchangeId);
      if (!adapter) {
        throw new Error(`Exchange ${exchangeId} not connected`);
      }

      logger.info('Subscribing to market data', {
        exchange: exchangeId,
        channel: request.channel,
        symbol: request.symbol,
      });

      // Subscribe via adapter
      await adapter.subscribe(request);

      // Store subscription
      const subs = this.subscriptions.get(exchangeId) || [];
      subs.push({ ...request, exchangeId });
      this.subscriptions.set(exchangeId, subs);

      logger.info('Subscribed to market data', {
        exchange: exchangeId,
        channel: request.channel,
        symbol: request.symbol,
      });

      // Emit subscription event
      this.emit('subscription:added', { exchangeId, request });
    } catch (error) {
      logger.error('Failed to subscribe to market data', {
        exchange: exchangeId,
        channel: request.channel,
        symbol: request.symbol,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Unsubscribe from market data channel
   */
  async unsubscribe(request: SubscriptionRequest): Promise<void> {
    const exchangeId = this.resolveExchangeForUnsubscribe(request);
    if (!exchangeId) {
      logger.warn('Unable to resolve exchange for unsubscribe', {
        channel: request.channel,
        symbol: request.symbol,
      });
      return;
    }
    const adapter = this.adapters.get(exchangeId);
    if (!adapter) {
      logger.warn('Exchange not connected', { exchangeId });
      return;
    }

    try {
      logger.info('Unsubscribing from market data', {
        exchange: exchangeId,
        channel: request.channel,
        symbol: request.symbol,
      });

      // Unsubscribe via adapter
      await adapter.unsubscribe(request);

      // Remove from subscriptions
      const subs = this.subscriptions.get(exchangeId) || [];
      const filtered = subs.filter(
        (s) => s.channel !== request.channel || s.symbol !== request.symbol
      );
      this.subscriptions.set(exchangeId, filtered);

      logger.info('Unsubscribed from market data', {
        exchange: exchangeId,
        channel: request.channel,
        symbol: request.symbol,
      });

      // Emit unsubscription event
      this.emit('subscription:removed', { exchangeId, request });
    } catch (error) {
      logger.error('Failed to unsubscribe from market data', {
        exchange: exchangeId,
        channel: request.channel,
        symbol: request.symbol,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get connection status for exchange
   */
  getConnectionStatus(exchangeId: ExchangeId): ConnectionStatus | null {
    const adapter = this.adapters.get(exchangeId);
    if (!adapter) return null;

    return adapter.status;
  }

  /**
   * Get all connection statuses
   */
  getAllConnectionStatuses(): Map<ExchangeId, ConnectionStatus> {
    const statuses = new Map<ExchangeId, ConnectionStatus>();

    for (const [exchangeId, adapter] of this.adapters) {
      statuses.set(exchangeId, adapter.status);
    }

    return statuses;
  }

  /**
   * Check if connected to exchange
   */
  isConnected(exchangeId: ExchangeId): boolean {
    const adapter = this.adapters.get(exchangeId);
    return adapter?.isConnected || false;
  }

  /**
   * Get metrics for exchange
   */
  getMetrics(exchangeId: ExchangeId): ConnectionMetrics | null {
    return this.metrics.get(exchangeId) || null;
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<ExchangeId, ConnectionMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Get Redis metrics
   */
  getRedisMetrics() {
    if (!this.redisBridge) {
      return null;
    }

    return this.redisBridge.getMetrics();
  }

  /**
   * Get comprehensive system metrics
   */
  getSystemMetrics() {
    return {
      exchanges: Object.fromEntries(this.metrics),
      redis: this.getRedisMetrics(),
      connections: {
        active: this.adapters.size,
        max: this.config.maxConnections,
        available: this.config.maxConnections - this.adapters.size,
      },
      subscriptions: {
        total: Array.from(this.subscriptions.values()).reduce((sum, subs) => sum + subs.length, 0),
        byExchange: Object.fromEntries(
          Array.from(this.subscriptions.entries()).map(([exchange, subs]) => [exchange, subs.length])
        ),
      },
      health: this.getHealthStatus(),
    };
  }

  /**
   * Get active subscriptions for exchange
   */
  getSubscriptions(exchangeId: ExchangeId): SubscriptionRequest[] {
    return this.subscriptions.get(exchangeId) || [];
  }

  /**
   * Get all active subscriptions
   */
  getAllSubscriptions(): Map<ExchangeId, SubscriptionRequest[]> {
    return new Map(this.subscriptions);
  }

  /**
   * Disconnect all exchanges
   */
  async disconnectAll(): Promise<void> {
    logger.info('Disconnecting all exchange WebSockets');

    const promises: Promise<void>[] = [];
    for (const exchangeId of this.adapters.keys()) {
      promises.push(this.disconnect(exchangeId));
    }

    await Promise.all(promises);

    // Disconnect Redis bridge if enabled
    if (this.redisBridge) {
      try {
        await this.redisBridge.disconnect();
        logger.info('Redis event bridge disconnected');
      } catch (error) {
        logger.error('Error disconnecting Redis event bridge', { error });
      }
    }

    logger.info('All exchange WebSockets disconnected');
  }

  /**
   * Ping all connected exchanges
   */
  async pingAll(): Promise<Map<ExchangeId, number | null>> {
    const latencies = new Map<ExchangeId, number | null>();

    for (const [exchangeId, adapter] of this.adapters) {
      try {
        await adapter.ping();
        const latency = adapter.getLatency();
        latencies.set(exchangeId, latency);
      } catch (error) {
        logger.error('Ping failed', { exchangeId, error });
        latencies.set(exchangeId, null);
      }
    }

    return latencies;
  }

  /**
   * Get health status of all connections
   */
  getHealthStatus(): {
    healthy: ExchangeId[];
    unhealthy: ExchangeId[];
    total: number;
  } {
    const healthy: ExchangeId[] = [];
    const unhealthy: ExchangeId[] = [];

    for (const [exchangeId, adapter] of this.adapters) {
      if (adapter.isConnected) {
        healthy.push(exchangeId);
      } else {
        unhealthy.push(exchangeId);
      }
    }

    return {
      healthy,
      unhealthy,
      total: this.adapters.size,
    };
  }

  /**
   * Create adapter for exchange
   */
  private createAdapter(exchangeId: ExchangeId, config: ConnectionConfig): IExchangeAdapter {
    // Delegate creation to exchanges module to centralize exchange connectivity
    // Module not yet implemented
    throw new Error(`Exchanges module not yet implemented. Cannot create adapter for ${exchangeId}`);
    // return createWebSocketAdapter(exchangeId, config);
  }

  /**
   * Set up event forwarding from adapter to manager
   */
  private setupEventForwarding(adapter: IExchangeAdapter): void {
    const exchangeId = adapter.exchangeId;

    // Forward all events with exchange prefix
    adapter.on('connected', (data) => {
      this.emit('exchange:connected', data);
      this.emit('connected', { ...data, exchange: exchangeId });
    });

    adapter.on('disconnected', (data) => {
      this.emit('exchange:disconnected', data);
      this.emit('disconnected', { ...data, exchange: exchangeId });

      // Auto-reconnect if enabled
      if (this.config.autoReconnect) {
        logger.info('Auto-reconnecting to exchange', { exchangeId });
        // Note: Adapter handles its own reconnection via reconnection strategy
      }
    });

    adapter.on('reconnecting', (data) => {
      this.emit('exchange:reconnecting', data);
      this.emit('reconnecting', { ...data, exchange: exchangeId });
    });

    adapter.on('error', (error) => {
      this.emit('exchange:error', error);
      this.emit('error', { ...error, exchange: exchangeId });
    });

    // Forward market data events
    adapter.on('orderbook', (data: OrderBook) => {
      this.emit('orderbook', data);
      this.updateMetrics(exchangeId, 'messagesReceived');

      // Publish to Redis if enabled
      if (this.redisBridge) {
        this.redisBridge.publish({ type: 'orderbook', data }).catch((error) => {
          logger.error('Failed to publish orderbook to Redis', { error });
        });
      }
    });

    adapter.on('trade', (data: Trade) => {
      this.emit('trade', data);
      this.updateMetrics(exchangeId, 'messagesReceived');

      // Publish to Redis if enabled
      if (this.redisBridge) {
        this.redisBridge.publish({ type: 'trade', data }).catch((error) => {
          logger.error('Failed to publish trade to Redis', { error });
        });
      }
    });

    adapter.on('ticker', (data: Ticker) => {
      this.emit('ticker', data);
      this.updateMetrics(exchangeId, 'messagesReceived');

      // Publish to Redis if enabled
      if (this.redisBridge) {
        this.redisBridge.publish({ type: 'ticker', data }).catch((error) => {
          logger.error('Failed to publish ticker to Redis', { error });
        });
      }
    });

    adapter.on('candle', (data: Candle) => {
      this.emit('candle', data);
      this.updateMetrics(exchangeId, 'messagesReceived');

      // Publish to Redis if enabled
      if (this.redisBridge) {
        this.redisBridge.publish({ type: 'candle', data }).catch((error) => {
          logger.error('Failed to publish candle to Redis', { error });
        });
      }
    });

    adapter.on('stateChange', (data) => {
      this.emit('stateChange', data);
    });
  }

  /**
   * Initialize metrics for exchange
   */
  private initializeMetrics(exchangeId: ExchangeId): void {
    this.metrics.set(exchangeId, {
      exchange: exchangeId,
      uptime: 0,
      messagesReceived: 0,
      messagesSent: 0,
      reconnections: 0,
      errors: 0,
      averageLatency: 0,
      lastPingTimestamp: 0,
    });
  }

  /**
   * Update metrics
   */
  private updateMetrics(
    exchangeId: ExchangeId,
    field: keyof ConnectionMetrics,
    increment: number = 1
  ): void {
    if (!this.config.enableMetrics) return;

    const metrics = this.metrics.get(exchangeId);
    if (!metrics) return;

    if (typeof metrics[field] === 'number') {
      (metrics[field] as number) += increment;
    }
  }

  /**
   * Get exchange ID from symbol
   * This is a simplified version - in production you'd maintain a symbol→exchange mapping
   */
  private resolveExchangeForSubscribe(request: SubscriptionRequest): ExchangeId {
    // Prefer explicit exchangeId when provided
    if (request.exchangeId) {
      return request.exchangeId;
    }

    // If only one adapter is connected, default to it for backward compatibility
    if (this.adapters.size === 1) {
      return Array.from(this.adapters.keys())[0];
    }

    // Ambiguous without explicit exchange when multiple exchanges are connected
    throw new Error(
      'Ambiguous subscription target: provide request.exchangeId when multiple exchanges are connected'
    );
  }

  private resolveExchangeForUnsubscribe(request: SubscriptionRequest): ExchangeId | null {
    // Prefer explicit exchangeId when provided
    if (request.exchangeId) {
      return request.exchangeId;
    }

    // Look up which exchange holds this subscription
    const key = `${request.channel}:${request.symbol}`;
    for (const [ex, subs] of this.subscriptions.entries()) {
      if (subs.some((s) => `${s.channel}:${s.symbol}` === key)) {
        return ex;
      }
    }

    // If only one adapter exists, use it
    if (this.adapters.size === 1) {
      return Array.from(this.adapters.keys())[0];
    }

    // Not resolvable
    return null;
  }
}

/**
 * Build manager configuration from environment variables
 */
const AUTO_RECONNECT_ENV = process.env.MARKET_DATA_WS_AUTO_RECONNECT;
const MAX_CONNECTIONS_ENV = process.env.MARKET_DATA_WS_MAX_CONNECTIONS;
const CONNECTION_TIMEOUT_ENV = process.env.MARKET_DATA_WS_CONNECTION_TIMEOUT;
const ENABLE_METRICS_ENV = process.env.MARKET_DATA_WS_ENABLE_METRICS;
const ENABLE_REDIS_ENV = process.env.MARKET_DATA_WS_ENABLE_REDIS;

const managerConfig: MarketDataManagerConfig = {
  autoReconnect: AUTO_RECONNECT_ENV
    ? AUTO_RECONNECT_ENV.toLowerCase() !== 'false'
    : DEFAULT_CONFIG.autoReconnect,
  enableMetrics: ENABLE_METRICS_ENV
    ? ENABLE_METRICS_ENV.toLowerCase() !== 'false'
    : DEFAULT_CONFIG.enableMetrics,
  enableRedis: ENABLE_REDIS_ENV ? ENABLE_REDIS_ENV.toLowerCase() === 'true' : false,
};

const maxConnections = MAX_CONNECTIONS_ENV ? Number.parseInt(MAX_CONNECTIONS_ENV, 10) : NaN;
if (!Number.isNaN(maxConnections) && maxConnections > 0) {
  managerConfig.maxConnections = maxConnections;
}

const connectionTimeout = CONNECTION_TIMEOUT_ENV
  ? Number.parseInt(CONNECTION_TIMEOUT_ENV, 10)
  : NaN;
if (!Number.isNaN(connectionTimeout) && connectionTimeout > 0) {
  managerConfig.connectionTimeout = connectionTimeout;
}

if (managerConfig.enableRedis) {
  const redisConfig: RedisEventBridgeConfig = {
    redisUrl: process.env.MARKET_DATA_REDIS_URL || process.env.REDIS_URL,
    host: process.env.MARKET_DATA_REDIS_HOST,
    port: process.env.MARKET_DATA_REDIS_PORT
      ? Number.parseInt(process.env.MARKET_DATA_REDIS_PORT, 10)
      : undefined,
    password: process.env.MARKET_DATA_REDIS_PASSWORD,
    db: process.env.MARKET_DATA_REDIS_DB
      ? Number.parseInt(process.env.MARKET_DATA_REDIS_DB, 10)
      : undefined,
    keyPrefix: process.env.MARKET_DATA_REDIS_PREFIX,
    enablePublishing:
      (process.env.MARKET_DATA_REDIS_PUBLISH ?? 'true').toLowerCase() !== 'false',
    enableSubscription:
      (process.env.MARKET_DATA_REDIS_SUBSCRIBE ?? 'true').toLowerCase() !== 'false',
  };

  // Remove undefined values so defaults remain intact
  for (const key of Object.keys(redisConfig) as (keyof RedisEventBridgeConfig)[]) {
    if (redisConfig[key] === undefined) {
      delete redisConfig[key];
    }
  }

  managerConfig.redis = redisConfig;
}

/**
 * Singleton instance for easy access
 */
export const marketDataWebSocketManager = new MarketDataWebSocketManager(managerConfig);

/**
 * Export convenience methods
 */
export const connectToExchange = (exchangeId: ExchangeId, config: ConnectionConfig) =>
  marketDataWebSocketManager.connect(exchangeId, config);

export const disconnectFromExchange = (exchangeId: ExchangeId) =>
  marketDataWebSocketManager.disconnect(exchangeId);

export const subscribeToMarketData = (request: SubscriptionRequest) =>
  marketDataWebSocketManager.subscribe(request);

export const unsubscribeFromMarketData = (request: SubscriptionRequest) =>
  marketDataWebSocketManager.unsubscribe(request);
