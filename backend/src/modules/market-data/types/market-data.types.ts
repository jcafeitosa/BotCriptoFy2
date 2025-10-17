/**
 * Market Data Types
 * Type definitions for market data structures
 */

/**
 * Timeframe options for OHLCV data
 */
export type Timeframe = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '12h' | '1d' | '1w' | '1M';

/**
 * WebSocket channel types
 */
export type WebSocketChannel = 'ticker' | 'trades' | 'orderbook' | 'ohlcv';

/**
 * Subscription status
 */
export type SubscriptionStatus = 'active' | 'paused' | 'stopped';

/**
 * Sync status
 */
export type SyncStatus = 'pending' | 'syncing' | 'completed' | 'error';

/**
 * OHLCV Candle Data
 */
export interface OHLCVCandle {
  id?: string;
  exchangeId: string;
  symbol: string;
  timeframe: Timeframe;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume?: number;
  trades?: number;
  createdAt?: Date;
}

/**
 * Trade Data
 */
export interface TradeData {
  id?: string;
  exchangeId: string;
  symbol: string;
  tradeId: string;
  timestamp: Date;
  price: number;
  amount: number;
  cost: number;
  side: 'buy' | 'sell';
  takerOrMaker?: 'taker' | 'maker';
  fee?: {
    cost: number;
    currency: string;
    rate?: number;
  };
  info?: any;
  createdAt?: Date;
}

/**
 * Order Book Snapshot
 */
export interface OrderBookSnapshot {
  id?: string;
  exchangeId: string;
  symbol: string;
  timestamp: Date;
  bids: [number, number][]; // [price, amount]
  asks: [number, number][]; // [price, amount]
  nonce?: number;
  createdAt?: Date;
}

/**
 * Ticker Data
 */
export interface TickerData {
  id?: string;
  exchangeId: string;
  symbol: string;
  timestamp: Date;
  datetime?: string;
  high?: number;
  low?: number;
  bid?: number;
  bidVolume?: number;
  ask?: number;
  askVolume?: number;
  vwap?: number;
  open?: number;
  close?: number;
  last?: number;
  previousClose?: number;
  change?: number;
  percentage?: number;
  average?: number;
  baseVolume?: number;
  quoteVolume?: number;
  info?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Market Data Subscription
 */
export interface MarketDataSubscription {
  id?: string;
  userId: string;
  tenantId: string;
  exchangeId: string;
  symbol: string;
  channel: WebSocketChannel;
  params?: {
    timeframe?: Timeframe;
    limit?: number;
    depth?: number;
  };
  status: SubscriptionStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Sync Status Record
 */
export interface SyncStatusRecord {
  id?: string;
  exchangeId: string;
  symbol: string;
  timeframe: Timeframe;
  lastSyncedTimestamp?: Date;
  lastSyncAt?: Date;
  totalCandles: number;
  syncStatus: SyncStatus;
  errorMessage?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * WebSocket Message Types
 */
export interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'data' | 'error' | 'ping' | 'pong';
  channel?: WebSocketChannel;
  data?: any;
  error?: string;
  timestamp?: number;
}

/**
 * WebSocket Subscription Request
 */
export interface SubscriptionRequest {
  exchangeId: string;
  symbol: string;
  channel: WebSocketChannel;
  params?: {
    timeframe?: Timeframe;
    limit?: number;
    depth?: number;
  };
}

/**
 * OHLCV Fetch Options
 */
export interface FetchOHLCVOptions {
  exchangeId: string;
  symbol: string;
  timeframe: Timeframe;
  since?: Date;
  limit?: number;
}

/**
 * Trades Fetch Options
 */
export interface FetchTradesOptions {
  exchangeId: string;
  symbol: string;
  since?: Date;
  limit?: number;
}

/**
 * Order Book Fetch Options
 */
export interface FetchOrderBookOptions {
  exchangeId: string;
  symbol: string;
  limit?: number; // depth limit
}

/**
 * Ticker Fetch Options
 */
export interface FetchTickerOptions {
  exchangeId: string;
  symbol: string;
}

/**
 * Historical Data Sync Options
 */
export interface HistoricalSyncOptions {
  exchangeId: string;
  symbol: string;
  timeframe: Timeframe;
  startDate: Date;
  endDate?: Date;
  batchSize?: number;
}

/**
 * Market Data Query Options
 */
export interface MarketDataQuery {
  exchangeId: string;
  symbol: string;
  timeframe?: Timeframe;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Aggregated Market Stats
 */
export interface MarketStats {
  symbol: string;
  exchangeId: string;
  timeframe: Timeframe;
  period: {
    start: Date;
    end: Date;
  };
  ohlc: {
    open: number;
    high: number;
    low: number;
    close: number;
  };
  volume: {
    base: number;
    quote: number;
    trades: number;
  };
  price: {
    change: number;
    changePercent: number;
    average: number;
    vwap?: number;
  };
  volatility?: number;
}

/**
 * WebSocket Connection Status
 */
export interface ConnectionStatus {
  exchangeId: string;
  connected: boolean;
  subscriptions: number;
  lastPing?: Date;
  lastPong?: Date;
  reconnectAttempts: number;
  error?: string;
}

/**
 * Data Gap Detection
 */
export interface DataGap {
  exchangeId: string;
  symbol: string;
  timeframe: Timeframe;
  gapStart: Date;
  gapEnd: Date;
  missingCandles: number;
  detected: Date;
}

/**
 * Batch Insert Result
 */
export interface BatchInsertResult {
  inserted: number;
  updated: number;
  failed: number;
  errors?: Array<{
    record: any;
    error: string;
  }>;
}

/**
 * Real-time Data Event
 */
export interface RealtimeDataEvent {
  type: 'ticker' | 'trade' | 'orderbook' | 'ohlcv';
  exchangeId: string;
  symbol: string;
  timestamp: Date;
  data: TickerData | TradeData | OrderBookSnapshot | OHLCVCandle;
}

/**
 * Market Data Service Interface
 */
export interface IMarketDataService {
  // OHLCV operations
  fetchOHLCV(options: FetchOHLCVOptions): Promise<OHLCVCandle[]>;
  storeOHLCV(candles: OHLCVCandle[]): Promise<BatchInsertResult>;
  getOHLCV(query: MarketDataQuery): Promise<OHLCVCandle[]>;

  // Trades operations
  fetchTrades(options: FetchTradesOptions): Promise<TradeData[]>;
  storeTrades(trades: TradeData[]): Promise<BatchInsertResult>;
  getTrades(query: MarketDataQuery): Promise<TradeData[]>;

  // Order book operations
  fetchOrderBook(options: FetchOrderBookOptions): Promise<OrderBookSnapshot>;
  storeOrderBook(snapshot: OrderBookSnapshot): Promise<void>;
  getOrderBook(exchangeId: string, symbol: string): Promise<OrderBookSnapshot | null>;

  // Ticker operations
  fetchTicker(options: FetchTickerOptions): Promise<TickerData>;
  storeTicker(ticker: TickerData): Promise<void>;
  getTicker(exchangeId: string, symbol: string): Promise<TickerData | null>;

  // Historical sync
  syncHistoricalData(options: HistoricalSyncOptions): Promise<SyncStatusRecord>;

  // Gap detection
  detectGaps(exchangeId: string, symbol: string, timeframe: Timeframe): Promise<DataGap[]>;
  fillGaps(gap: DataGap): Promise<number>;
}

/**
 * WebSocket Manager Interface
 */
export interface IWebSocketManager {
  connect(exchangeId: string): Promise<void>;
  disconnect(exchangeId: string): Promise<void>;
  subscribe(request: SubscriptionRequest): Promise<void>;
  unsubscribe(request: SubscriptionRequest): Promise<void>;
  getStatus(exchangeId: string): ConnectionStatus | null;
  isConnected(exchangeId: string): boolean;
}
