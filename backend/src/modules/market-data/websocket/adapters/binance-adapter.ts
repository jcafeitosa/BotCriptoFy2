/**
 * @fileoverview Binance WebSocket adapter implementation
 * @module market-data/websocket/adapters/binance
 */

import type {
  SubscriptionRequest,
  OrderBook,
  Trade,
  Ticker,
  Candle,
  ConnectionConfig,
} from '../types';
import { BaseExchangeAdapter } from '../base-adapter';
import type WebSocket from 'ws';

interface BinanceMessage {
  e: string;
  E: number;
  s: string;
  [key: string]: any;
}

/**
 * Binance Spot WebSocket adapter
 *
 * @see https://binance-docs.github.io/apidocs/spot/en/#websocket-market-streams
 */
export class BinanceAdapter extends BaseExchangeAdapter {
  private subscriptionId = 1;

  constructor(config: ConnectionConfig) {
    super('binance', config);
  }

  protected getWebSocketUrl(): string {
    return this.config.url || 'wss://stream.binance.com:9443/ws';
  }

  protected formatSubscriptionMessage(request: SubscriptionRequest): string {
    const stream = this.getStreamName(request);

    return JSON.stringify({
      method: 'SUBSCRIBE',
      params: [stream],
      id: this.subscriptionId++,
    });
  }

  protected formatUnsubscriptionMessage(request: SubscriptionRequest): string {
    const stream = this.getStreamName(request);

    return JSON.stringify({
      method: 'UNSUBSCRIBE',
      params: [stream],
      id: this.subscriptionId++,
    });
  }

  protected parseMessage(data: WebSocket.Data): void {
    const message: BinanceMessage = JSON.parse(data.toString());

    // Handle subscription responses
    if (message.id !== undefined) {
      return;
    }

    switch (message.e) {
      case 'depthUpdate':
        this.handleOrderBookUpdate(message);
        break;
      case 'trade':
        this.handleTrade(message);
        break;
      case '24hrTicker':
      case 'miniTicker':
      case '24hrMiniTicker': // Binance's actual miniTicker event type
        this.handleTicker(message);
        break;
      case 'kline':
        this.handleCandle(message);
        break;
    }
  }

  private getStreamName(request: SubscriptionRequest): string {
    const symbol = request.symbol.toLowerCase().replace('/', '');

    switch (request.channel) {
      case 'orderbook':
        const depth = (request.params?.depth as number) || 20;
        return `${symbol}@depth${depth}`;
      case 'trades':
        return `${symbol}@trade`;
      case 'ticker':
        // Use miniTicker for real-time price updates (1 second)
        // Or use ticker for 24hr rolling window ticker
        return `${symbol}@miniTicker`;
      case 'candles':
        const interval = (request.params?.interval as string) || '1m';
        return `${symbol}@kline_${interval}`;
      default:
        throw new Error(`Unknown channel: ${request.channel}`);
    }
  }

  private handleOrderBookUpdate(message: any): void {
    const orderbook: OrderBook = {
      symbol: this.formatSymbol(message.s),
      exchange: this.exchangeId,
      timestamp: message.E,
      bids: message.b.map(([price, amount]: [string, string]) => ({
        price: parseFloat(price),
        amount: parseFloat(amount),
      })),
      asks: message.a.map(([price, amount]: [string, string]) => ({
        price: parseFloat(price),
        amount: parseFloat(amount),
      })),
      sequenceId: message.u,
    };

    this.emitTypedEvent('orderbook', orderbook);
  }

  private handleTrade(message: any): void {
    const trade: Trade = {
      id: message.t.toString(),
      symbol: this.formatSymbol(message.s),
      exchange: this.exchangeId,
      timestamp: message.T,
      price: parseFloat(message.p),
      amount: parseFloat(message.q),
      side: message.m ? 'sell' : 'buy',
      takerOrMaker: message.m ? 'maker' : 'taker',
    };

    this.emitTypedEvent('trade', trade);
  }

  private handleTicker(message: any): void {
    const ticker: Ticker = {
      symbol: this.formatSymbol(message.s),
      exchange: this.exchangeId,
      timestamp: message.E,
      last: parseFloat(message.c),
      // miniTicker doesn't have bid/ask, use last price as fallback
      bid: message.b ? parseFloat(message.b) : parseFloat(message.c),
      ask: message.a ? parseFloat(message.a) : parseFloat(message.c),
      high24h: parseFloat(message.h),
      low24h: parseFloat(message.l),
      volume24h: parseFloat(message.v),
      // miniTicker doesn't have percentage change, use 0 as fallback
      change24h: message.P ? parseFloat(message.P) : 0,
    };

    this.emitTypedEvent('ticker', ticker);
  }

  private handleCandle(message: any): void {
    const k = message.k;

    const candle: Candle = {
      symbol: this.formatSymbol(message.s),
      exchange: this.exchangeId,
      timestamp: k.t,
      timeframe: k.i,
      open: parseFloat(k.o),
      high: parseFloat(k.h),
      low: parseFloat(k.l),
      close: parseFloat(k.c),
      volume: parseFloat(k.v),
    };

    this.emitTypedEvent('candle', candle);
  }

  private formatSymbol(binanceSymbol: string): string {
    // Convert BTCUSDT to BTC/USDT
    // Simple heuristic: split at known quote currencies
    const quotes = ['USDT', 'BUSD', 'USD', 'BTC', 'ETH', 'BNB'];
    for (const quote of quotes) {
      if (binanceSymbol.endsWith(quote)) {
        const base = binanceSymbol.slice(0, -quote.length);
        return `${base}/${quote}`;
      }
    }
    return binanceSymbol;
  }
}
