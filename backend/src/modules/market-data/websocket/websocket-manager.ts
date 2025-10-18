// @ts-nocheck
/**
 * WebSocket Manager
 * Manages WebSocket connections to exchanges for real-time market data
 *
 * NOTE: This implementation requires ccxt.pro (paid version) for WebSocket support.
 * For now, this is a placeholder implementation.
 */

import ccxt from 'ccxt';
// Module not yet implemented
// import { ExchangeService } from '../../exchanges/services/exchange.service';
import logger from '@/utils/logger';
import type {
  SubscriptionRequest,
  ConnectionStatus,
  RealtimeDataEvent,
  IWebSocketManager,
  OHLCVCandle,
  Timeframe,
} from '../types/market-data.types';

/**
 * Exchange WebSocket Connection
 * NOTE: Requires ccxt.pro for actual implementation
 */
interface ExchangeConnection {
  exchange: any;
  exchangeId: string;
  connected: boolean;
  subscriptions: Map<string, SubscriptionRequest>;
  reconnectAttempts: number;
  lastPing?: Date;
  lastPong?: Date;
  error?: string;
  pollers: Map<string, NodeJS.Timeout>;
  lastTradeTimestamps: Map<string, number>;
  lastOhlcvTimestamps: Map<string, number>;
}

/**
 * WebSocket Manager Implementation
 */
export class WebSocketManager implements IWebSocketManager {
  private connections: Map<string, ExchangeConnection> = new Map();
  private eventHandlers: Map<string, (event: RealtimeDataEvent) => void> = new Map();
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000; // 5 seconds

  /**
   * Connect to exchange WebSocket
   * NOTE: This requires ccxt.pro (paid version) to work
   */
  async connect(exchangeId: string): Promise<void> {
    try {
      if (this.connections.has(exchangeId)) {
        logger.warn('Exchange already connected', { exchangeId });
        return;
      }

      logger.info('Connecting to exchange WebSocket', { exchangeId });

      // Check if exchange is supported
      if (!ExchangeService.isExchangeSupported(exchangeId)) {
        throw new Error(`Exchange ${exchangeId} not supported`);
      }

      const ExchangeClass = (ccxt as any)[exchangeId];
      if (!ExchangeClass) {
        throw new Error(`Exchange ${exchangeId} not supported`);
      }

      const exchangeInstance = new ExchangeClass({
        enableRateLimit: true,
      });

      await exchangeInstance.loadMarkets();

      const connection: ExchangeConnection = {
        exchange: exchangeInstance,
        exchangeId,
        connected: true,
        subscriptions: new Map(),
        reconnectAttempts: 0,
        pollers: new Map(),
        lastTradeTimestamps: new Map(),
        lastOhlcvTimestamps: new Map(),
      };

      this.connections.set(exchangeId, connection);

      logger.info('Exchange connection established using REST polling', { exchangeId });

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
  async disconnect(exchangeId: string): Promise<void> {
    const connection = this.connections.get(exchangeId);
    if (!connection) {
      logger.warn('Exchange not connected', { exchangeId });
      return;
    }

    try {
      logger.info('Disconnecting from exchange WebSocket', { exchangeId });

      // Unsubscribe from all channels
      for (const request of connection.subscriptions.values()) {
        await this.unsubscribe(request);
      }

      // Clear any remaining pollers
      for (const poller of connection.pollers.values()) {
        clearInterval(poller);
      }
      connection.pollers.clear();

      // Close exchange connection if supported
      if (typeof connection.exchange.close === 'function') {
        await connection.exchange.close();
      }

      this.connections.delete(exchangeId);

      logger.info('Exchange WebSocket disconnected', { exchangeId });
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
    const { exchangeId, symbol, channel, params } = request;

    try {
      // Ensure connection exists
      if (!this.connections.has(exchangeId)) {
        await this.connect(exchangeId);
      }

      const connection = this.connections.get(exchangeId)!;
      const subKey = this.getSubscriptionKey(request);

      // Check if already subscribed
      if (connection.subscriptions.has(subKey)) {
        logger.warn('Already subscribed to channel', { exchangeId, symbol, channel });
        return;
      }

      logger.info('Subscribing to market data', { exchangeId, symbol, channel, params });

      // Start watching based on channel type
      switch (channel) {
        case 'ticker':
          this.watchTicker(connection, symbol);
          break;
        case 'trades':
          this.watchTrades(connection, symbol, params?.limit);
          break;
        case 'orderbook':
          this.watchOrderBook(connection, symbol, params?.limit);
          break;
        case 'ohlcv':
          if (!params?.timeframe) {
            throw new Error('Timeframe required for OHLCV subscription');
          }
          this.watchOHLCV(connection, symbol, params.timeframe);
          break;
        default:
          throw new Error(`Unsupported channel: ${channel}`);
      }

      connection.subscriptions.set(subKey, request);

      logger.info('Subscribed to market data', { exchangeId, symbol, channel });
    } catch (error) {
      logger.error('Failed to subscribe to market data', {
        exchangeId,
        symbol,
        channel,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Unsubscribe from market data channel
   */
  async unsubscribe(request: SubscriptionRequest): Promise<void> {
    const { exchangeId, symbol, channel } = request;
    const connection = this.connections.get(exchangeId);

    if (!connection) {
      logger.warn('Exchange not connected', { exchangeId });
      return;
    }

    const subKey = this.getSubscriptionKey(request);

    if (!connection.subscriptions.has(subKey)) {
      logger.warn('Not subscribed to channel', { exchangeId, symbol, channel });
      return;
    }

    try {
      logger.info('Unsubscribing from market data', { exchangeId, symbol, channel });

      const poller = connection.pollers.get(subKey);
      if (poller) {
        clearInterval(poller);
        connection.pollers.delete(subKey);
      }
      connection.lastTradeTimestamps.delete(subKey);
      connection.lastOhlcvTimestamps.delete(subKey);

      connection.subscriptions.delete(subKey);

      logger.info('Unsubscribed from market data', { exchangeId, symbol, channel });
    } catch (error) {
      logger.error('Failed to unsubscribe from market data', {
        exchangeId,
        symbol,
        channel,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get connection status
   */
  getStatus(exchangeId: string): ConnectionStatus | null {
    const connection = this.connections.get(exchangeId);
    if (!connection) return null;

    return {
      exchangeId,
      connected: connection.connected,
      subscriptions: connection.subscriptions.size,
      lastPing: connection.lastPing,
      lastPong: connection.lastPong,
      reconnectAttempts: connection.reconnectAttempts,
      error: connection.error,
    };
  }

  /**
   * Check if connected to exchange
   */
  isConnected(exchangeId: string): boolean {
    const connection = this.connections.get(exchangeId);
    return connection?.connected || false;
  }

  /**
   * Register event handler
   */
  on(event: string, handler: (event: RealtimeDataEvent) => void): void {
    this.eventHandlers.set(event, handler);
  }

  /**
   * Emit event
   */
  private emit(event: RealtimeDataEvent): void {
    const handler = this.eventHandlers.get('data');
    if (handler) {
      handler(event);
    }
  }

  /**
   * Watch ticker updates
   * NOTE: Requires ccxt.pro for implementation
   */
  private watchTicker(connection: ExchangeConnection, symbol: string): void {
    const subKey = this.getSubscriptionKey({
      exchangeId: connection.exchangeId,
      symbol,
      channel: 'ticker',
    });
    if (connection.pollers.has(subKey)) {
      return;
    }

    const poll = async () => {
      try {
        const ticker = await connection.exchange.fetchTicker(symbol);
        const timestamp = ticker.timestamp ? new Date(ticker.timestamp) : new Date();

        const event: RealtimeDataEvent = {
          type: 'ticker',
          exchangeId: connection.exchangeId,
          symbol,
          timestamp,
          data: {
            exchangeId: connection.exchangeId,
            symbol,
            timestamp,
            datetime: ticker.datetime,
            high: ticker.high,
            low: ticker.low,
            bid: ticker.bid,
            bidVolume: ticker.bidVolume,
            ask: ticker.ask,
            askVolume: ticker.askVolume,
            vwap: ticker.vwap,
            open: ticker.open,
            close: ticker.close ?? ticker.last,
            last: ticker.last,
            previousClose: ticker.previousClose,
            change: ticker.change,
            percentage: ticker.percentage,
            average: ticker.average,
            baseVolume: ticker.baseVolume,
            quoteVolume: ticker.quoteVolume,
            info: ticker.info,
          },
        };

        this.emit(event);
        connection.connected = true;
        connection.error = undefined;
      } catch (error) {
        connection.error = error instanceof Error ? error.message : String(error);
        logger.warn('Failed to fetch ticker update', {
          exchangeId: connection.exchangeId,
          symbol,
          error: connection.error,
        });
      }
    };

    void poll();
    const interval = setInterval(poll, 5000);
    connection.pollers.set(subKey, interval);
  }

  private watchTrades(connection: ExchangeConnection, symbol: string, limit = 50): void {
    const subKey = this.getSubscriptionKey({
      exchangeId: connection.exchangeId,
      symbol,
      channel: 'trades',
    });
    if (connection.pollers.has(subKey)) {
      return;
    }

    const stateKey = subKey;

    const poll = async () => {
      try {
        const trades = await connection.exchange.fetchTrades(symbol, undefined, limit);
        if (!Array.isArray(trades)) {
          return;
        }

        const lastTimestamp = connection.lastTradeTimestamps.get(stateKey) || 0;
        const newTrades = trades.filter(
          (trade) => typeof trade.timestamp === 'number' && trade.timestamp > lastTimestamp
        );

        if (newTrades.length === 0 && trades.length > 0 && lastTimestamp === 0) {
          // Emit the most recent trade on first subscription
          newTrades.push(trades[trades.length - 1]);
        }

        if (newTrades.length > 0) {
          const latestTimestamp = newTrades[newTrades.length - 1].timestamp ?? Date.now();
          connection.lastTradeTimestamps.set(stateKey, latestTimestamp);

          for (const trade of newTrades) {
            const tradeTimestamp = trade.timestamp ? new Date(trade.timestamp) : new Date();
            const event: RealtimeDataEvent = {
              type: 'trade',
              exchangeId: connection.exchangeId,
              symbol,
              timestamp: tradeTimestamp,
              data: {
                exchangeId: connection.exchangeId,
                symbol,
                tradeId: trade.id || `${tradeTimestamp.getTime()}`,
                timestamp: tradeTimestamp,
                price: trade.price ?? 0,
                amount: trade.amount ?? 0,
                cost: trade.cost ?? (trade.price ?? 0) * (trade.amount ?? 0),
                side: (trade.side || 'buy') as 'buy' | 'sell',
                takerOrMaker: trade.takerOrMaker as 'taker' | 'maker' | undefined,
                fee: trade.fee
                  ? {
                      cost: trade.fee.cost ?? 0,
                      currency: trade.fee.currency ?? '',
                      rate: trade.fee.rate,
                    }
                  : undefined,
                info: trade.info,
              },
            };

            this.emit(event);
          }
        }

        connection.connected = true;
        connection.error = undefined;
      } catch (error) {
        connection.error = error instanceof Error ? error.message : String(error);
        logger.warn('Failed to fetch trades', {
          exchangeId: connection.exchangeId,
          symbol,
          error: connection.error,
        });
      }
    };

    void poll();
    const interval = setInterval(poll, 5000);
    connection.pollers.set(subKey, interval);
  }

  private watchOrderBook(
    connection: ExchangeConnection,
    symbol: string,
    limit?: number
  ): void {
    const subKey = this.getSubscriptionKey({
      exchangeId: connection.exchangeId,
      symbol,
      channel: 'orderbook',
    });
    if (connection.pollers.has(subKey)) {
      return;
    }

    const depth = limit && limit > 0 ? limit : 20;

    const poll = async () => {
      try {
        const orderBook = await connection.exchange.fetchOrderBook(symbol, depth);
        const timestamp = orderBook.timestamp ? new Date(orderBook.timestamp) : new Date();

        const event: RealtimeDataEvent = {
          type: 'orderbook',
          exchangeId: connection.exchangeId,
          symbol,
          timestamp,
          data: {
            exchangeId: connection.exchangeId,
            symbol,
            timestamp,
            bids: orderBook.bids?.slice(0, depth) ?? [],
            asks: orderBook.asks?.slice(0, depth) ?? [],
            nonce: orderBook.nonce,
          },
        };

        this.emit(event);
        connection.connected = true;
        connection.error = undefined;
      } catch (error) {
        connection.error = error instanceof Error ? error.message : String(error);
        logger.warn('Failed to fetch order book', {
          exchangeId: connection.exchangeId,
          symbol,
          error: connection.error,
        });
      }
    };

    void poll();
    const interval = setInterval(poll, 5000);
    connection.pollers.set(subKey, interval);
  }

  private watchOHLCV(
    connection: ExchangeConnection,
    symbol: string,
    timeframe: Timeframe
  ): void {
    const subKey = this.getSubscriptionKey({
      exchangeId: connection.exchangeId,
      symbol,
      channel: 'ohlcv',
      params: { timeframe },
    });
    if (connection.pollers.has(subKey)) {
      return;
    }

    const stateKey = subKey;

    const poll = async () => {
      try {
        const candles = await connection.exchange.fetchOHLCV(symbol, timeframe as string, undefined, 2);
        if (!Array.isArray(candles) || candles.length === 0) {
          return;
        }

        const latest = candles[candles.length - 1];
        const candleTimestamp = typeof latest[0] === 'number' ? latest[0] : Date.now();
        const lastEmitted = connection.lastOhlcvTimestamps.get(stateKey) || 0;

        if (candleTimestamp <= lastEmitted) {
          return;
        }

        connection.lastOhlcvTimestamps.set(stateKey, candleTimestamp);

        const candleData: OHLCVCandle = {
          exchangeId: connection.exchangeId,
          symbol,
          timeframe: timeframe as any,
          timestamp: new Date(candleTimestamp),
          open: Number(latest[1] ?? 0),
          high: Number(latest[2] ?? 0),
          low: Number(latest[3] ?? 0),
          close: Number(latest[4] ?? 0),
          volume: Number(latest[5] ?? 0),
        };

        const event: RealtimeDataEvent = {
          type: 'ohlcv',
          exchangeId: connection.exchangeId,
          symbol,
          timestamp: candleData.timestamp,
          data: candleData,
        };

        this.emit(event);
        connection.connected = true;
        connection.error = undefined;
      } catch (error) {
        connection.error = error instanceof Error ? error.message : String(error);
        logger.warn('Failed to fetch OHLCV', {
          exchangeId: connection.exchangeId,
          symbol,
          timeframe,
          error: connection.error,
        });
      }
    };

    void poll();
    const interval = setInterval(poll, 10000);
    connection.pollers.set(subKey, interval);
  }

  /**
   * Handle connection errors and reconnection
   */
  private async handleConnectionError(
    connection: ExchangeConnection,
    error: unknown
  ): Promise<void> {
    connection.connected = false;
    connection.error = error instanceof Error ? error.message : String(error);
    connection.reconnectAttempts++;

    if (connection.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnect attempts reached', {
        exchangeId: connection.exchangeId,
        attempts: connection.reconnectAttempts,
      });
      await this.disconnect(connection.exchangeId);
      return;
    }

    logger.info('Attempting to reconnect', {
      exchangeId: connection.exchangeId,
      attempt: connection.reconnectAttempts,
    });

    // Wait before reconnecting
    await new Promise((resolve) => setTimeout(resolve, this.reconnectDelay));

    // Reconnect
    await this.disconnect(connection.exchangeId);
    await this.connect(connection.exchangeId);

    // Resubscribe to all channels
    const subscriptions = Array.from(connection.subscriptions.values());
    for (const request of subscriptions) {
      await this.subscribe(request);
    }
  }

  /**
   * Generate unique subscription key
   */
  private getSubscriptionKey(request: SubscriptionRequest): string {
    const { channel, symbol, params } = request;
    if (channel === 'ohlcv' && params?.timeframe) {
      return `${channel}:${symbol}:${params.timeframe}`;
    }
    return `${channel}:${symbol}`;
  }

  /**
   * Cleanup and close all connections
   */
  async closeAll(): Promise<void> {
    logger.info('Closing all WebSocket connections');

    const promises: Promise<void>[] = [];
    for (const exchangeId of this.connections.keys()) {
      promises.push(this.disconnect(exchangeId));
    }

    await Promise.all(promises);

    logger.info('All WebSocket connections closed');
  }
}

// Singleton instance
export const webSocketManager = new WebSocketManager();
