/**
 * @fileoverview Type definitions for Exchange WebSocket Adapters
 * @module market-data/websocket/types
 * @category Trading
 */

/**
 * Supported exchange identifiers
 */
export type ExchangeId = 'binance' | 'coinbase' | 'kraken' | 'bybit' | 'okx';

/**
 * WebSocket connection states
 */
export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR',
  TERMINATED = 'TERMINATED',
}

/**
 * Reconnection strategy configuration
 */
export interface ReconnectionConfig {
  /** Maximum number of reconnection attempts (0 = infinite) */
  readonly maxAttempts: number;
  /** Initial delay in milliseconds */
  readonly initialDelay: number;
  /** Maximum delay in milliseconds */
  readonly maxDelay: number;
  /** Backoff multiplier */
  readonly backoffMultiplier: number;
  /** Jitter factor (0-1) for randomization */
  readonly jitterFactor: number;
}

/**
 * WebSocket connection configuration
 */
export interface ConnectionConfig {
  /** WebSocket URL */
  readonly url: string;
  /** API key (if required) */
  readonly apiKey?: string;
  /** API secret (if required) */
  readonly apiSecret?: string;
  /** Connection timeout in milliseconds */
  readonly timeout: number;
  /** Heartbeat/ping interval in milliseconds */
  readonly pingInterval: number;
  /** Pong timeout in milliseconds */
  readonly pongTimeout: number;
  /** Reconnection configuration */
  readonly reconnection: ReconnectionConfig;
}

/**
 * Order book depth level
 */
export interface OrderBookLevel {
  readonly price: number;
  readonly amount: number;
}

/**
 * Order book snapshot/update
 */
export interface OrderBook {
  readonly symbol: string;
  readonly exchange: ExchangeId;
  readonly timestamp: number;
  readonly bids: readonly OrderBookLevel[];
  readonly asks: readonly OrderBookLevel[];
  readonly sequenceId?: number;
}

/**
 * Trade execution data
 */
export interface Trade {
  readonly id: string;
  readonly symbol: string;
  readonly exchange: ExchangeId;
  readonly timestamp: number;
  readonly price: number;
  readonly amount: number;
  readonly side: 'buy' | 'sell';
  readonly takerOrMaker: 'taker' | 'maker';
}

/**
 * Ticker/price update
 */
export interface Ticker {
  readonly symbol: string;
  readonly exchange: ExchangeId;
  readonly timestamp: number;
  readonly last: number;
  readonly bid: number;
  readonly ask: number;
  readonly high24h: number;
  readonly low24h: number;
  readonly volume24h: number;
  readonly change24h: number;
}

/**
 * OHLCV candlestick data
 */
export interface Candle {
  readonly symbol: string;
  readonly exchange: ExchangeId;
  readonly timestamp: number;
  readonly timeframe: string;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
}

/**
 * WebSocket error details
 */
export interface ExchangeError {
  readonly code: string;
  readonly message: string;
  readonly exchange: ExchangeId;
  readonly timestamp: number;
  readonly fatal: boolean;
  readonly originalError?: Error;
}

/**
 * Connection status with metadata
 */
export interface ConnectionStatus {
  readonly state: ConnectionState;
  readonly exchange: ExchangeId;
  readonly connectedAt?: number;
  readonly reconnectAttempts: number;
  readonly lastError?: ExchangeError;
  readonly subscriptions: readonly string[];
}

/**
 * Subscription channel types
 */
export type ChannelType = 'orderbook' | 'trades' | 'ticker' | 'candles';

/**
 * Subscription request
 */
export interface SubscriptionRequest {
  /** Target exchange for the subscription. Strongly recommended when multiple exchanges are connected. */
  readonly exchangeId?: ExchangeId;
  /** Channel to subscribe to */
  readonly channel: ChannelType;
  /** Unified CCXT-style symbol, e.g., BTC/USDT */
  readonly symbol: string;
  /** Optional channel-specific params (e.g., depth, interval) */
  readonly params?: Record<string, unknown>;
}

/**
 * Event payload types mapping
 */
export interface ExchangeEventMap {
  readonly connected: { exchange: ExchangeId; timestamp: number };
  readonly disconnected: { exchange: ExchangeId; timestamp: number; reason?: string };
  readonly reconnecting: { exchange: ExchangeId; attempt: number; nextDelay: number };
  readonly error: ExchangeError;
  readonly orderbook: OrderBook;
  readonly trade: Trade;
  readonly ticker: Ticker;
  readonly candle: Candle;
  readonly stateChange: { from: ConnectionState; to: ConnectionState; exchange: ExchangeId };
}

/**
 * Type-safe event names
 */
export type ExchangeEventName = keyof ExchangeEventMap;

/**
 * Type-safe event listener
 */
export type ExchangeEventListener<T extends ExchangeEventName> = (
  payload: ExchangeEventMap[T]
) => void | Promise<void>;

/**
 * Core interface for exchange WebSocket adapters
 */
export interface IExchangeAdapter {
  /** Exchange identifier */
  readonly exchangeId: ExchangeId;

  /** Current connection status */
  readonly status: ConnectionStatus;

  /** Whether adapter is currently connected */
  readonly isConnected: boolean;

  /** Establish WebSocket connection */
  connect(): Promise<void>;

  /** Close WebSocket connection gracefully */
  disconnect(code?: number, reason?: string): Promise<void>;

  /** Subscribe to data channel */
  subscribe(request: SubscriptionRequest): Promise<void>;

  /** Unsubscribe from data channel */
  unsubscribe(request: SubscriptionRequest): Promise<void>;

  /** Register event listener (type-safe) */
  on<T extends ExchangeEventName>(event: T, listener: ExchangeEventListener<T>): this;

  /** Register one-time event listener (type-safe) */
  once<T extends ExchangeEventName>(event: T, listener: ExchangeEventListener<T>): this;

  /** Remove event listener */
  off<T extends ExchangeEventName>(event: T, listener: ExchangeEventListener<T>): this;

  /** Send ping/heartbeat to server */
  ping(): Promise<void>;

  /** Get current connection latency in milliseconds */
  getLatency(): number | null;

  /** Terminate connection immediately */
  terminate(): void;
}

/**
 * Connection metrics for monitoring
 */
export interface ConnectionMetrics {
  readonly exchange: ExchangeId;
  uptime: number;
  messagesReceived: number;
  messagesSent: number;
  reconnections: number;
  errors: number;
  averageLatency: number;
  lastPingTimestamp: number;
}
