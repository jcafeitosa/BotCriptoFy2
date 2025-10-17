/**
 * WebSocket Manager
 * Manages WebSocket connections to exchanges for real-time market data
 */

import type * as ccxt from 'ccxt';
import { ExchangeService } from '../../exchanges/services/exchange.service';
import logger from '@/utils/logger';
import type {
  SubscriptionRequest,
  ConnectionStatus,
  RealtimeDataEvent,
  WebSocketChannel,
  TickerData,
  TradeData,
  OrderBookSnapshot,
  OHLCVCandle,
  IWebSocketManager,
} from '../types/market-data.types';

/**
 * Exchange WebSocket Connection
 */
interface ExchangeConnection {
  exchange: ccxt.pro.Exchange;
  exchangeId: string;
  connected: boolean;
  subscriptions: Map<string, SubscriptionRequest>;
  reconnectAttempts: number;
  lastPing?: Date;
  lastPong?: Date;
  error?: string;
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
   */
  async connect(exchangeId: string): Promise<void> {
    try {
      if (this.connections.has(exchangeId)) {
        logger.warn('Exchange already connected', { exchangeId });
        return;
      }

      logger.info('Connecting to exchange WebSocket', { exchangeId });

      // Check if exchange supports WebSocket (ccxt.pro)
      if (!ExchangeService.isExchangeSupported(exchangeId)) {
        throw new Error(`Exchange ${exchangeId} not supported`);
      }

      // Create ccxt.pro instance
      const ExchangeClass = (ccxt.pro as any)[exchangeId];
      if (!ExchangeClass) {
        throw new Error(`Exchange ${exchangeId} does not support WebSocket (ccxt.pro)`);
      }

      const exchange = new ExchangeClass({
        enableRateLimit: true,
        newUpdates: true, // Use incremental updates
      }) as ccxt.pro.Exchange;

      const connection: ExchangeConnection = {
        exchange,
        exchangeId,
        connected: true,
        subscriptions: new Map(),
        reconnectAttempts: 0,
      };

      this.connections.set(exchangeId, connection);

      logger.info('Exchange WebSocket connected', { exchangeId });
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

      // Close exchange connection
      await connection.exchange.close();

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
          this.watchTrades(connection, symbol);
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

      // CCXT Pro doesn't have explicit unsubscribe for most exchanges
      // We just stop watching and remove from subscriptions map

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
   */
  private async watchTicker(connection: ExchangeConnection, symbol: string): Promise<void> {
    try {
      while (connection.connected && connection.subscriptions.has(`ticker:${symbol}`)) {
        const ticker = await connection.exchange.watchTicker(symbol);

        const tickerData: TickerData = {
          exchangeId: connection.exchangeId,
          symbol: ticker.symbol,
          timestamp: new Date(ticker.timestamp || Date.now()),
          datetime: ticker.datetime,
          high: ticker.high || undefined,
          low: ticker.low || undefined,
          bid: ticker.bid || undefined,
          bidVolume: ticker.bidVolume,
          ask: ticker.ask || undefined,
          askVolume: ticker.askVolume,
          vwap: ticker.vwap,
          open: ticker.open || undefined,
          close: ticker.close || undefined,
          last: ticker.last || undefined,
          previousClose: ticker.previousClose,
          change: ticker.change,
          percentage: ticker.percentage,
          average: ticker.average,
          baseVolume: ticker.baseVolume || undefined,
          quoteVolume: ticker.quoteVolume || undefined,
          info: ticker.info,
        };

        this.emit({
          type: 'ticker',
          exchangeId: connection.exchangeId,
          symbol,
          timestamp: tickerData.timestamp,
          data: tickerData,
        });
      }
    } catch (error) {
      logger.error('Error watching ticker', {
        exchangeId: connection.exchangeId,
        symbol,
        error: error instanceof Error ? error.message : String(error),
      });
      await this.handleConnectionError(connection, error);
    }
  }

  /**
   * Watch trades stream
   */
  private async watchTrades(connection: ExchangeConnection, symbol: string): Promise<void> {
    try {
      while (connection.connected && connection.subscriptions.has(`trades:${symbol}`)) {
        const trades = await connection.exchange.watchTrades(symbol);

        for (const trade of trades) {
          const tradeData: TradeData = {
            exchangeId: connection.exchangeId,
            symbol: trade.symbol,
            tradeId: trade.id,
            timestamp: new Date(trade.timestamp || Date.now()),
            price: trade.price || 0,
            amount: trade.amount || 0,
            cost: trade.cost || 0,
            side: (trade.side as 'buy' | 'sell') || 'buy',
            takerOrMaker: trade.takerOrMaker as 'taker' | 'maker',
            fee: trade.fee,
            info: trade.info,
          };

          this.emit({
            type: 'trade',
            exchangeId: connection.exchangeId,
            symbol,
            timestamp: tradeData.timestamp,
            data: tradeData,
          });
        }
      }
    } catch (error) {
      logger.error('Error watching trades', {
        exchangeId: connection.exchangeId,
        symbol,
        error: error instanceof Error ? error.message : String(error),
      });
      await this.handleConnectionError(connection, error);
    }
  }

  /**
   * Watch order book updates
   */
  private async watchOrderBook(
    connection: ExchangeConnection,
    symbol: string,
    limit?: number
  ): Promise<void> {
    try {
      while (connection.connected && connection.subscriptions.has(`orderbook:${symbol}`)) {
        const orderbook = await connection.exchange.watchOrderBook(symbol, limit);

        const snapshot: OrderBookSnapshot = {
          exchangeId: connection.exchangeId,
          symbol,
          timestamp: new Date(orderbook.timestamp || Date.now()),
          bids: orderbook.bids.map((bid) => [bid[0], bid[1]] as [number, number]),
          asks: orderbook.asks.map((ask) => [ask[0], ask[1]] as [number, number]),
          nonce: orderbook.nonce,
        };

        this.emit({
          type: 'orderbook',
          exchangeId: connection.exchangeId,
          symbol,
          timestamp: snapshot.timestamp,
          data: snapshot,
        });
      }
    } catch (error) {
      logger.error('Error watching order book', {
        exchangeId: connection.exchangeId,
        symbol,
        error: error instanceof Error ? error.message : String(error),
      });
      await this.handleConnectionError(connection, error);
    }
  }

  /**
   * Watch OHLCV updates
   */
  private async watchOHLCV(
    connection: ExchangeConnection,
    symbol: string,
    timeframe: string
  ): Promise<void> {
    try {
      while (connection.connected && connection.subscriptions.has(`ohlcv:${symbol}:${timeframe}`)) {
        const candles = await connection.exchange.watchOHLCV(symbol, timeframe);

        for (const candle of candles) {
          const ohlcvData: OHLCVCandle = {
            exchangeId: connection.exchangeId,
            symbol,
            timeframe: timeframe as any,
            timestamp: new Date(candle[0]),
            open: candle[1],
            high: candle[2],
            low: candle[3],
            close: candle[4],
            volume: candle[5],
          };

          this.emit({
            type: 'ohlcv',
            exchangeId: connection.exchangeId,
            symbol,
            timestamp: ohlcvData.timestamp,
            data: ohlcvData,
          });
        }
      }
    } catch (error) {
      logger.error('Error watching OHLCV', {
        exchangeId: connection.exchangeId,
        symbol,
        timeframe,
        error: error instanceof Error ? error.message : String(error),
      });
      await this.handleConnectionError(connection, error);
    }
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
