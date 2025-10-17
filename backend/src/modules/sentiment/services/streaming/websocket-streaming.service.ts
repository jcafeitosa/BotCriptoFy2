/**
 * WebSocket Streaming Service
 * Real-time sentiment updates via WebSocket
 *
 * Features:
 * - Multi-channel subscriptions (sentiment, trending, news, social, alerts)
 * - Client connection management
 * - Heartbeat/ping-pong
 * - Throttling and rate limiting
 * - Message batching for efficiency
 *
 * @module sentiment/services/streaming/websocket-streaming
 */

import type { AggregatedSentiment, SentimentAnalysisResult } from '../../types/sentiment.types';
import type { NewsArticle } from '../../types/news.types';
import type { SocialMention, TrendingTopic } from '../../types/social.types';
import type { SentimentPriceSignal } from '../analyzer/price-correlation.service';

/**
 * WebSocket Message Types
 */
export type WSMessageType =
  | 'subscribe'
  | 'unsubscribe'
  | 'ping'
  | 'pong'
  | 'sentiment_update'
  | 'trending_update'
  | 'news_update'
  | 'social_update'
  | 'signal_update'
  | 'alert'
  | 'error'
  | 'success';

/**
 * Channel Types
 */
export type ChannelType =
  | 'sentiment' // Aggregated sentiment updates
  | 'sentiment:symbol' // Sentiment for specific symbol (e.g., sentiment:BTC)
  | 'trending' // Trending topics
  | 'news' // News articles
  | 'news:symbol' // News for specific symbol
  | 'social' // Social mentions
  | 'social:symbol' // Social for specific symbol
  | 'signals' // Trading signals
  | 'signals:symbol' // Signals for specific symbol
  | 'alerts'; // User alerts

/**
 * WebSocket Message
 */
export interface WSMessage {
  type: WSMessageType;
  channel?: string;
  data?: any;
  timestamp: number;
}

/**
 * Subscribe Message
 */
export interface SubscribeMessage extends WSMessage {
  type: 'subscribe';
  channel: string;
}

/**
 * Client Connection
 */
interface ClientConnection {
  id: string;
  ws: any; // WebSocket instance (Elysia WS)
  subscriptions: Set<string>;
  lastPing: Date;
  lastPong: Date;
  messageCount: number;
  connectedAt: Date;
  metadata?: {
    userId?: string;
    ip?: string;
    userAgent?: string;
  };
}

/**
 * Streaming Configuration
 */
export interface StreamingConfig {
  /**
   * Heartbeat interval (milliseconds)
   * Default: 30000 (30 seconds)
   */
  heartbeatInterval: number;

  /**
   * Client timeout (milliseconds)
   * Disconnect if no pong received
   * Default: 60000 (60 seconds)
   */
  clientTimeout: number;

  /**
   * Max subscriptions per client
   * Default: 50
   */
  maxSubscriptionsPerClient: number;

  /**
   * Message rate limit (messages per minute)
   * Default: 100
   */
  messageRateLimit: number;

  /**
   * Batch updates (delay before sending)
   * Default: 1000 (1 second)
   */
  batchDelay: number;

  /**
   * Max batch size
   * Default: 10
   */
  maxBatchSize: number;
}

/**
 * Message Queue for batching
 */
interface MessageQueue {
  channel: string;
  messages: any[];
  timeout?: NodeJS.Timeout;
}

/**
 * WebSocket Streaming Service
 */
export class WebSocketStreamingService {
  private config: StreamingConfig;
  private clients: Map<string, ClientConnection> = new Map();
  private channelSubscribers: Map<string, Set<string>> = new Map(); // channel -> client IDs
  private messageQueues: Map<string, MessageQueue> = new Map();
  private heartbeatInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config?: Partial<StreamingConfig>) {
    this.config = {
      heartbeatInterval: config?.heartbeatInterval || 30000,
      clientTimeout: config?.clientTimeout || 60000,
      maxSubscriptionsPerClient: config?.maxSubscriptionsPerClient || 50,
      messageRateLimit: config?.messageRateLimit || 100,
      batchDelay: config?.batchDelay || 1000,
      maxBatchSize: config?.maxBatchSize || 10,
    };

    // Start heartbeat
    this.startHeartbeat();

    // Start cleanup
    this.startCleanup();
  }

  /**
   * Handle new client connection
   */
  onConnect(ws: any, clientId: string, metadata?: ClientConnection['metadata']): void {
    const client: ClientConnection = {
      id: clientId,
      ws,
      subscriptions: new Set(),
      lastPing: new Date(),
      lastPong: new Date(),
      messageCount: 0,
      connectedAt: new Date(),
      metadata,
    };

    this.clients.set(clientId, client);

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'success',
      data: {
        message: 'Connected to sentiment stream',
        clientId,
        availableChannels: this.getAvailableChannels(),
      },
      timestamp: Date.now(),
    });

    console.log(`[WebSocket] Client connected: ${clientId} (Total: ${this.clients.size})`);
  }

  /**
   * Handle client disconnection
   */
  onDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);

    if (client) {
      // Unsubscribe from all channels
      client.subscriptions.forEach((channel) => {
        this.unsubscribeFromChannel(clientId, channel);
      });

      this.clients.delete(clientId);
      console.log(`[WebSocket] Client disconnected: ${clientId} (Total: ${this.clients.size})`);
    }
  }

  /**
   * Handle incoming message from client
   */
  onMessage(clientId: string, message: WSMessage): void {
    const client = this.clients.get(clientId);

    if (!client) {
      console.error(`[WebSocket] Client not found: ${clientId}`);
      return;
    }

    // Update message count (for rate limiting)
    client.messageCount++;

    // Check rate limit
    if (!this.checkRateLimit(client)) {
      this.sendToClient(clientId, {
        type: 'error',
        data: { message: 'Rate limit exceeded' },
        timestamp: Date.now(),
      });
      return;
    }

    // Handle message type
    switch (message.type) {
      case 'subscribe':
        this.handleSubscribe(clientId, message as SubscribeMessage);
        break;

      case 'unsubscribe':
        this.handleUnsubscribe(clientId, message);
        break;

      case 'ping':
        this.handlePing(clientId);
        break;

      case 'pong':
        this.handlePong(clientId);
        break;

      default:
        this.sendToClient(clientId, {
          type: 'error',
          data: { message: `Unknown message type: ${message.type}` },
          timestamp: Date.now(),
        });
    }
  }

  /**
   * Handle subscribe request
   */
  private handleSubscribe(clientId: string, message: SubscribeMessage): void {
    const client = this.clients.get(clientId);

    if (!client) return;

    const { channel } = message;

    // Validate channel
    if (!this.isValidChannel(channel)) {
      this.sendToClient(clientId, {
        type: 'error',
        data: { message: `Invalid channel: ${channel}` },
        timestamp: Date.now(),
      });
      return;
    }

    // Check max subscriptions
    if (client.subscriptions.size >= this.config.maxSubscriptionsPerClient) {
      this.sendToClient(clientId, {
        type: 'error',
        data: { message: 'Max subscriptions reached' },
        timestamp: Date.now(),
      });
      return;
    }

    // Subscribe
    this.subscribeToChannel(clientId, channel);

    this.sendToClient(clientId, {
      type: 'success',
      data: {
        message: `Subscribed to ${channel}`,
        subscriptions: Array.from(client.subscriptions),
      },
      timestamp: Date.now(),
    });
  }

  /**
   * Handle unsubscribe request
   */
  private handleUnsubscribe(clientId: string, message: WSMessage): void {
    const client = this.clients.get(clientId);

    if (!client || !message.channel) return;

    this.unsubscribeFromChannel(clientId, message.channel);

    this.sendToClient(clientId, {
      type: 'success',
      data: {
        message: `Unsubscribed from ${message.channel}`,
        subscriptions: Array.from(client.subscriptions),
      },
      timestamp: Date.now(),
    });
  }

  /**
   * Handle ping from client
   */
  private handlePing(clientId: string): void {
    const client = this.clients.get(clientId);

    if (client) {
      client.lastPing = new Date();
      this.sendToClient(clientId, {
        type: 'pong',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle pong from client
   */
  private handlePong(clientId: string): void {
    const client = this.clients.get(clientId);

    if (client) {
      client.lastPong = new Date();
    }
  }

  /**
   * Subscribe client to channel
   */
  private subscribeToChannel(clientId: string, channel: string): void {
    const client = this.clients.get(clientId);

    if (!client) return;

    client.subscriptions.add(channel);

    if (!this.channelSubscribers.has(channel)) {
      this.channelSubscribers.set(channel, new Set());
    }

    this.channelSubscribers.get(channel)!.add(clientId);
  }

  /**
   * Unsubscribe client from channel
   */
  private unsubscribeFromChannel(clientId: string, channel: string): void {
    const client = this.clients.get(clientId);

    if (client) {
      client.subscriptions.delete(channel);
    }

    const subscribers = this.channelSubscribers.get(channel);
    if (subscribers) {
      subscribers.delete(clientId);

      // Clean up empty channel
      if (subscribers.size === 0) {
        this.channelSubscribers.delete(channel);
      }
    }
  }

  /**
   * Broadcast sentiment update
   */
  broadcastSentimentUpdate(sentiment: AggregatedSentiment): void {
    const channels = ['sentiment', `sentiment:${sentiment.symbol}`];

    channels.forEach((channel) => {
      this.broadcastToChannel(channel, {
        type: 'sentiment_update',
        channel,
        data: sentiment,
        timestamp: Date.now(),
      });
    });
  }

  /**
   * Broadcast trending topics update
   */
  broadcastTrendingUpdate(trending: TrendingTopic[]): void {
    this.broadcastToChannel('trending', {
      type: 'trending_update',
      channel: 'trending',
      data: trending,
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast news article
   */
  broadcastNewsUpdate(article: NewsArticle): void {
    const channels = ['news', ...article.symbols.map((s) => `news:${s}`)];

    channels.forEach((channel) => {
      this.broadcastToChannel(channel, {
        type: 'news_update',
        channel,
        data: article,
        timestamp: Date.now(),
      });
    });
  }

  /**
   * Broadcast social mention
   */
  broadcastSocialUpdate(mention: SocialMention): void {
    const channels = ['social', ...mention.symbols.map((s) => `social:${s}`)];

    channels.forEach((channel) => {
      this.broadcastToChannel(channel, {
        type: 'social_update',
        channel,
        data: mention,
        timestamp: Date.now(),
      });
    });
  }

  /**
   * Broadcast trading signal
   */
  broadcastSignalUpdate(signal: SentimentPriceSignal): void {
    const channels = ['signals', `signals:${signal.symbol}`];

    channels.forEach((channel) => {
      this.broadcastToChannel(channel, {
        type: 'signal_update',
        channel,
        data: signal,
        timestamp: Date.now(),
      });
    });
  }

  /**
   * Broadcast to channel (with batching)
   */
  private broadcastToChannel(channel: string, message: WSMessage): void {
    // Check if batching is enabled
    if (this.config.batchDelay > 0) {
      this.addToQueue(channel, message);
    } else {
      this.sendToChannel(channel, message);
    }
  }

  /**
   * Add message to batch queue
   */
  private addToQueue(channel: string, message: WSMessage): void {
    if (!this.messageQueues.has(channel)) {
      this.messageQueues.set(channel, {
        channel,
        messages: [],
      });
    }

    const queue = this.messageQueues.get(channel)!;
    queue.messages.push(message);

    // Clear existing timeout
    if (queue.timeout) {
      clearTimeout(queue.timeout);
    }

    // Send if batch is full
    if (queue.messages.length >= this.config.maxBatchSize) {
      this.flushQueue(channel);
    } else {
      // Set timeout to flush
      queue.timeout = setTimeout(() => {
        this.flushQueue(channel);
      }, this.config.batchDelay);
    }
  }

  /**
   * Flush message queue
   */
  private flushQueue(channel: string): void {
    const queue = this.messageQueues.get(channel);

    if (!queue || queue.messages.length === 0) return;

    // Send batch
    if (queue.messages.length === 1) {
      this.sendToChannel(channel, queue.messages[0]);
    } else {
      // Send as batch
      this.sendToChannel(channel, {
        type: queue.messages[0].type,
        channel,
        data: queue.messages.map((m) => m.data),
        timestamp: Date.now(),
      });
    }

    // Clear queue
    queue.messages = [];
    if (queue.timeout) {
      clearTimeout(queue.timeout);
      queue.timeout = undefined;
    }
  }

  /**
   * Send message to channel subscribers
   */
  private sendToChannel(channel: string, message: WSMessage): void {
    const subscribers = this.channelSubscribers.get(channel);

    if (!subscribers || subscribers.size === 0) return;

    subscribers.forEach((clientId) => {
      this.sendToClient(clientId, message);
    });
  }

  /**
   * Send message to specific client
   */
  private sendToClient(clientId: string, message: WSMessage): void {
    const client = this.clients.get(clientId);

    if (!client) return;

    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error(`[WebSocket] Error sending to client ${clientId}:`, error);
      this.onDisconnect(clientId);
    }
  }

  /**
   * Check rate limit for client
   */
  private checkRateLimit(client: ClientConnection): boolean {
    // Reset counter every minute
    const now = Date.now();
    const connectedTime = now - client.connectedAt.getTime();
    const minutes = connectedTime / 60000;

    if (minutes < 1) {
      return client.messageCount <= this.config.messageRateLimit;
    }

    // Reset counter
    client.messageCount = 0;
    client.connectedAt = new Date();
    return true;
  }

  /**
   * Validate channel name
   */
  private isValidChannel(channel: string): boolean {
    const validPrefixes = [
      'sentiment',
      'trending',
      'news',
      'social',
      'signals',
      'alerts',
    ];

    return validPrefixes.some((prefix) => channel === prefix || channel.startsWith(`${prefix}:`));
  }

  /**
   * Get available channels
   */
  private getAvailableChannels(): string[] {
    return [
      'sentiment',
      'sentiment:{symbol}',
      'trending',
      'news',
      'news:{symbol}',
      'social',
      'social:{symbol}',
      'signals',
      'signals:{symbol}',
      'alerts',
    ];
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, clientId) => {
        // Check if client is alive
        const timeSinceLastPong = Date.now() - client.lastPong.getTime();

        if (timeSinceLastPong > this.config.clientTimeout) {
          console.log(`[WebSocket] Client timeout: ${clientId}`);
          this.onDisconnect(clientId);
          return;
        }

        // Send ping
        this.sendToClient(clientId, {
          type: 'ping',
          timestamp: Date.now(),
        });
      });
    }, this.config.heartbeatInterval);
  }

  /**
   * Start cleanup
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      // Flush all queues
      this.messageQueues.forEach((_, channel) => {
        this.flushQueue(channel);
      });

      // Log stats
      console.log(`[WebSocket] Stats: ${this.clients.size} clients, ${this.channelSubscribers.size} channels`);
    }, 60000); // Every minute
  }

  /**
   * Get statistics
   */
  getStats(): {
    clients: number;
    channels: number;
    totalSubscriptions: number;
    queuedMessages: number;
  } {
    let totalSubscriptions = 0;
    this.clients.forEach((client) => {
      totalSubscriptions += client.subscriptions.size;
    });

    let queuedMessages = 0;
    this.messageQueues.forEach((queue) => {
      queuedMessages += queue.messages.length;
    });

    return {
      clients: this.clients.size,
      channels: this.channelSubscribers.size,
      totalSubscriptions,
      queuedMessages,
    };
  }

  /**
   * Get client info
   */
  getClientInfo(clientId: string): ClientConnection | undefined {
    return this.clients.get(clientId);
  }

  /**
   * Get all clients
   */
  getClients(): ClientConnection[] {
    return Array.from(this.clients.values());
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<StreamingConfig>): void {
    this.config = { ...this.config, ...config };

    // Restart heartbeat if interval changed
    if (config.heartbeatInterval) {
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }
      this.startHeartbeat();
    }
  }

  /**
   * Get configuration
   */
  getConfig(): StreamingConfig {
    return { ...this.config };
  }

  /**
   * Shutdown
   */
  shutdown(): void {
    // Clear intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Disconnect all clients
    this.clients.forEach((_, clientId) => {
      this.onDisconnect(clientId);
    });

    console.log('[WebSocket] Service shutdown complete');
  }
}

/**
 * Create WebSocket Streaming Service
 */
export function createWebSocketStreamingService(config?: Partial<StreamingConfig>): WebSocketStreamingService {
  return new WebSocketStreamingService(config);
}

/**
 * Singleton instance
 */
export const websocketStreamingService = new WebSocketStreamingService({
  heartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL || '30000', 10),
  clientTimeout: parseInt(process.env.WS_CLIENT_TIMEOUT || '60000', 10),
  maxSubscriptionsPerClient: parseInt(process.env.WS_MAX_SUBSCRIPTIONS || '50', 10),
  messageRateLimit: parseInt(process.env.WS_MESSAGE_RATE_LIMIT || '100', 10),
  batchDelay: parseInt(process.env.WS_BATCH_DELAY || '1000', 10),
  maxBatchSize: parseInt(process.env.WS_MAX_BATCH_SIZE || '10', 10),
});
