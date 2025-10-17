/**
 * Redis WebSocket Event Bridge
 * Distributes WebSocket events across multiple application instances via Redis pub/sub
 *
 * This enables horizontal scaling by allowing multiple bot instances to share
 * WebSocket connections and receive real-time market data events.
 */

import { EventEmitter } from 'events';
import { Redis } from 'ioredis';
import logger from '@/utils/logger';
import type { Ticker, Trade, OrderBook, Candle, ExchangeId } from './types';

/**
 * Redis Event Bridge Configuration
 */
export interface RedisEventBridgeConfig {
  /** Redis connection URL */
  redisUrl?: string;
  /** Redis host (if not using URL) */
  host?: string;
  /** Redis port */
  port?: number;
  /** Redis password */
  password?: string;
  /** Redis database number */
  db?: number;
  /** Key prefix for Redis channels */
  keyPrefix?: string;
  /** Enable event publishing */
  enablePublishing?: boolean;
  /** Enable event subscription */
  enableSubscription?: boolean;
  /** Unique instance ID (defaults to process.pid for production, can be overridden for testing) */
  instanceId?: string | number;
  /** Reconnection strategy */
  reconnection?: {
    maxRetries?: number;
    retryDelay?: number;
  };
}

/**
 * Default Configuration
 */
const DEFAULT_CONFIG: Required<RedisEventBridgeConfig> = {
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  host: 'localhost',
  port: 6379,
  password: '',
  db: 0,
  keyPrefix: 'ws:',
  enablePublishing: true,
  enableSubscription: true,
  instanceId: process.pid, // Default to process PID
  reconnection: {
    maxRetries: 10,
    retryDelay: 1000,
  },
};

/**
 * Event Types
 */
export type WebSocketEvent =
  | { type: 'ticker'; data: Ticker }
  | { type: 'trade'; data: Trade }
  | { type: 'orderbook'; data: OrderBook }
  | { type: 'candle'; data: Candle }
  | { type: 'exchange:connected'; data: { exchange: ExchangeId; timestamp: number } }
  | { type: 'exchange:disconnected'; data: { exchange: ExchangeId; timestamp: number; reason?: string } }
  | { type: 'exchange:reconnecting'; data: { exchange: ExchangeId; attempt: number; nextDelay: number } }
  | { type: 'exchange:error'; data: { exchange: ExchangeId; code: string; message: string; fatal: boolean } };

/**
 * Redis WebSocket Event Bridge
 *
 * Publishes WebSocket events to Redis and subscribes to events from other instances.
 * This enables horizontal scaling and load distribution.
 */
export class RedisEventBridge extends EventEmitter {
  private config: Required<RedisEventBridgeConfig>;
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private isConnected: boolean = false;
  private subscriptions: Set<string> = new Set();
  private publishedEvents: number = 0;
  private receivedEvents: number = 0;
  private errors: number = 0;

  constructor(config?: RedisEventBridgeConfig) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    try {
      logger.info('Connecting to Redis for WebSocket event distribution', {
        host: this.config.host,
        port: this.config.port,
        keyPrefix: this.config.keyPrefix,
      });

      // Create Redis clients
      const redisOptions = {
        host: this.config.host,
        port: this.config.port,
        password: this.config.password || undefined,
        db: this.config.db,
        retryStrategy: (times: number) => {
          if (times > (this.config.reconnection.maxRetries || 10)) {
            logger.error('Redis reconnection failed after max retries');
            return null; // Stop retrying
          }
          const delay = Math.min(times * (this.config.reconnection.retryDelay || 1000), 30000);
          logger.warn(`Redis reconnecting in ${delay}ms`, { attempt: times });
          return delay;
        },
      };

      // Publisher client
      if (this.config.enablePublishing) {
        this.publisher = new Redis(redisOptions);

        this.publisher.on('connect', () => {
          logger.info('Redis publisher connected');
        });

        this.publisher.on('error', (error) => {
          logger.error('Redis publisher error', { error: error.message });
          this.errors++;
          this.emit('error', { type: 'publisher', error });
        });

        await this.waitForConnection(this.publisher, 'publisher');
      }

      // Subscriber client
      if (this.config.enableSubscription) {
        this.subscriber = new Redis(redisOptions);

        this.subscriber.on('connect', () => {
          logger.info('Redis subscriber connected');
        });

        this.subscriber.on('error', (error) => {
          logger.error('Redis subscriber error', { error: error.message });
          this.errors++;
          this.emit('error', { type: 'subscriber', error });
        });

        this.subscriber.on('message', (channel: string, message: string) => {
          this.handleMessage(channel, message);
        });

        await this.waitForConnection(this.subscriber, 'subscriber');
      }

      this.isConnected = true;
      this.emit('connected');

      logger.info('Redis event bridge connected', {
        publishing: this.config.enablePublishing,
        subscription: this.config.enableSubscription,
      });
    } catch (error) {
      logger.error('Failed to connect to Redis', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      logger.info('Disconnecting from Redis event bridge');

      if (this.subscriber) {
        await this.subscriber.quit();
        this.subscriber = null;
      }

      if (this.publisher) {
        await this.publisher.quit();
        this.publisher = null;
      }

      this.isConnected = false;
      this.subscriptions.clear();
      this.emit('disconnected');

      logger.info('Redis event bridge disconnected', {
        publishedEvents: this.publishedEvents,
        receivedEvents: this.receivedEvents,
        errors: this.errors,
      });
    } catch (error) {
      logger.error('Error disconnecting from Redis', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Publish WebSocket event to Redis
   */
  async publish(event: WebSocketEvent): Promise<void> {
    if (!this.config.enablePublishing || !this.publisher || !this.isConnected) {
      return;
    }

    try {
      const channel = this.getChannelName(event.type);
      const message = JSON.stringify({
        type: event.type,
        data: event.data,
        timestamp: Date.now(),
        source: this.config.instanceId, // Instance identifier (process.pid or custom ID)
      });

      await this.publisher.publish(channel, message);
      this.publishedEvents++;

      // Log periodically (every 100 events)
      if (this.publishedEvents % 100 === 0) {
        logger.debug('Redis events published', {
          total: this.publishedEvents,
          type: event.type,
        });
      }
    } catch (error) {
      logger.error('Failed to publish event to Redis', {
        type: event.type,
        error: error instanceof Error ? error.message : String(error),
      });
      this.errors++;
      throw error;
    }
  }

  /**
   * Subscribe to WebSocket event channel
   */
  async subscribe(eventType: WebSocketEvent['type']): Promise<void> {
    if (!this.config.enableSubscription || !this.subscriber || !this.isConnected) {
      return;
    }

    try {
      const channel = this.getChannelName(eventType);

      if (this.subscriptions.has(channel)) {
        logger.debug('Already subscribed to channel', { channel });
        return;
      }

      await this.subscriber.subscribe(channel);
      this.subscriptions.add(channel);

      logger.info('Subscribed to Redis channel', { channel, eventType });
      this.emit('subscribed', { channel, eventType });
    } catch (error) {
      logger.error('Failed to subscribe to Redis channel', {
        eventType,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Unsubscribe from WebSocket event channel
   */
  async unsubscribe(eventType: WebSocketEvent['type']): Promise<void> {
    if (!this.subscriber || !this.isConnected) {
      return;
    }

    try {
      const channel = this.getChannelName(eventType);

      if (!this.subscriptions.has(channel)) {
        return;
      }

      await this.subscriber.unsubscribe(channel);
      this.subscriptions.delete(channel);

      logger.info('Unsubscribed from Redis channel', { channel, eventType });
      this.emit('unsubscribed', { channel, eventType });
    } catch (error) {
      logger.error('Failed to unsubscribe from Redis channel', {
        eventType,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Subscribe to all event types
   */
  async subscribeAll(): Promise<void> {
    const eventTypes: WebSocketEvent['type'][] = [
      'ticker',
      'trade',
      'orderbook',
      'candle',
      'exchange:connected',
      'exchange:disconnected',
      'exchange:reconnecting',
      'exchange:error',
    ];

    await Promise.all(eventTypes.map((type) => this.subscribe(type)));

    logger.info('Subscribed to all Redis channels', {
      count: eventTypes.length,
    });
  }

  /**
   * Unsubscribe from all channels
   */
  async unsubscribeAll(): Promise<void> {
    if (!this.subscriber || !this.isConnected) {
      return;
    }

    try {
      await this.subscriber.unsubscribe(...Array.from(this.subscriptions));
      this.subscriptions.clear();

      logger.info('Unsubscribed from all Redis channels');
    } catch (error) {
      logger.error('Failed to unsubscribe from all channels', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Check if bridge is connected
   */
  isReady(): boolean {
    return this.isConnected;
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      connected: this.isConnected,
      publishedEvents: this.publishedEvents,
      receivedEvents: this.receivedEvents,
      errors: this.errors,
      subscriptions: this.subscriptions.size,
      activeSubscriptions: Array.from(this.subscriptions),
    };
  }

  /**
   * Wait for Redis connection
   */
  private waitForConnection(client: Redis, name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Redis ${name} connection timeout`));
      }, 10000);

      if (client.status === 'ready') {
        clearTimeout(timeout);
        resolve();
        return;
      }

      client.once('ready', () => {
        clearTimeout(timeout);
        resolve();
      });

      client.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Handle incoming Redis message
   */
  private handleMessage(channel: string, message: string): void {
    try {
      const parsed = JSON.parse(message);
      const { type, data, timestamp, source } = parsed;

      // Ignore own messages (same instance ID)
      if (source === this.config.instanceId) {
        return;
      }

      this.receivedEvents++;

      // Emit the event to local listeners
      this.emit(type, data);

      // Log periodically (every 100 events)
      if (this.receivedEvents % 100 === 0) {
        logger.debug('Redis events received', {
          total: this.receivedEvents,
          type,
          latency: Date.now() - timestamp,
        });
      }
    } catch (error) {
      logger.error('Failed to parse Redis message', {
        channel,
        error: error instanceof Error ? error.message : String(error),
      });
      this.errors++;
    }
  }

  /**
   * Get Redis channel name for event type
   */
  private getChannelName(eventType: string): string {
    return `${this.config.keyPrefix}${eventType}`;
  }
}

/**
 * Singleton instance
 */
export const redisEventBridge = new RedisEventBridge();
