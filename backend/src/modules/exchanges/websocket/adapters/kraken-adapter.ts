/**
 * @fileoverview Kraken WebSocket adapter implementation
 * @module market-data/websocket/adapters/kraken
 */

import type { SubscriptionRequest, OrderBook, Trade, Ticker, Candle } from '@/modules/market-data/websocket/types';
import type { ConnectionConfig } from '@/modules/exchanges';
import { BaseExchangeAdapter } from '@/modules/market-data/websocket/base-adapter';
import type WebSocket from 'ws';

/**
 * Kraken WebSocket adapter
 *
 * @see https://docs.kraken.com/websockets/
 */
export class KrakenAdapter extends BaseExchangeAdapter {
  private channelIds: Map<number, { channel: string; symbol: string }> = new Map();

  constructor(config: ConnectionConfig) {
    super('kraken', config);
  }

  protected getWebSocketUrl(): string {
    return this.config.url || 'wss://ws.kraken.com';
  }

  protected formatSubscriptionMessage(request: SubscriptionRequest): string {
    const pair = this.formatPair(request.symbol);
    const channelName = this.mapChannel(request.channel);

    const subscription: any = {
      name: channelName,
    };

    if (request.channel === 'candles' && request.params?.interval) {
      subscription.interval = parseInt(request.params.interval as string);
    }

    if (request.channel === 'orderbook' && request.params?.depth) {
      subscription.depth = request.params.depth;
    }

    return JSON.stringify({
      event: 'subscribe',
      pair: [pair],
      subscription,
    });
  }

  protected formatUnsubscriptionMessage(request: SubscriptionRequest): string {
    const pair = this.formatPair(request.symbol);
    const channelName = this.mapChannel(request.channel);

    return JSON.stringify({
      event: 'unsubscribe',
      pair: [pair],
      subscription: {
        name: channelName,
      },
    });
  }

  protected parseMessage(data: WebSocket.Data): void {
    const message = JSON.parse(data.toString());

    // Handle system messages
    if (message.event) {
      this.handleSystemMessage(message);
      return;
    }

    // Handle data messages (array format)
    if (Array.isArray(message)) {
      this.handleDataMessage(message);
    }
  }

  private mapChannel(channel: string): string {
    switch (channel) {
      case 'ticker':
        return 'ticker';
      case 'trades':
        return 'trade';
      case 'orderbook':
        return 'book';
      case 'candles':
        return 'ohlc';
      default:
        return channel;
    }
  }

  private formatPair(symbol: string): string {
    // Convert BTC/USDT to XBT/USDT (Kraken uses XBT instead of BTC)
    const pair = symbol.replace('BTC', 'XBT');
    // Remove slash: XBT/USDT -> XBTUSDT
    return pair.replace('/', '');
  }

  private parsePair(krakenPair: string): string {
    // Convert XBT/USD to BTC/USD
    return krakenPair.replace('XBT', 'BTC');
  }

  private handleSystemMessage(message: any): void {
    switch (message.event) {
      case 'subscriptionStatus':
        if (message.status === 'subscribed') {
          this.channelIds.set(message.channelID, {
            channel: message.subscription.name,
            symbol: this.parsePair(message.pair),
          });
        }
        break;
      case 'error':
        this.emitTypedEvent('error', {
          code: 'KRAKEN_ERROR',
          message: message.errorMessage || 'Unknown error',
          exchange: this.exchangeId,
          timestamp: Date.now(),
          fatal: false,
        });
        break;
    }
  }

  private handleDataMessage(message: any[]): void {
    const channelId = message[0];
    const data = message[1];
    const channelInfo = this.channelIds.get(channelId);

    if (!channelInfo) {
      return;
    }

    const channelName = message[2];

    switch (channelName) {
      case 'ticker':
        this.handleTicker(data, channelInfo.symbol);
        break;
      case 'trade':
        this.handleTrades(data, channelInfo.symbol);
        break;
      case 'book-5':
      case 'book-10':
      case 'book-25':
      case 'book-100':
      case 'book-500':
      case 'book-1000':
        this.handleOrderBook(data, channelInfo.symbol);
        break;
      case 'ohlc':
      case 'ohlc-1':
      case 'ohlc-5':
      case 'ohlc-15':
      case 'ohlc-30':
      case 'ohlc-60':
      case 'ohlc-240':
      case 'ohlc-1440':
      case 'ohlc-10080':
      case 'ohlc-21600':
        this.handleCandle(data, channelInfo.symbol, channelName);
        break;
    }
  }

  private handleTicker(data: any, symbol: string): void {
    const ticker: Ticker = {
      symbol,
      exchange: this.exchangeId,
      timestamp: Date.now(),
      last: parseFloat(data.c[0]),
      bid: parseFloat(data.b[0]),
      ask: parseFloat(data.a[0]),
      high24h: parseFloat(data.h[1]),
      low24h: parseFloat(data.l[1]),
      volume24h: parseFloat(data.v[1]),
      change24h: 0, // Calculate from open and close
    };

    this.emitTypedEvent('ticker', ticker);
  }

  private handleTrades(data: any[], symbol: string): void {
    data.forEach((tradeData) => {
      const trade: Trade = {
        id: `${Date.now()}-${Math.random()}`,
        symbol,
        exchange: this.exchangeId,
        timestamp: Math.floor(parseFloat(tradeData[2]) * 1000),
        price: parseFloat(tradeData[0]),
        amount: parseFloat(tradeData[1]),
        side: tradeData[3] === 'b' ? 'buy' : 'sell',
        takerOrMaker: tradeData[4] === 'm' ? 'maker' : 'taker',
      };

      this.emitTypedEvent('trade', trade);
    });
  }

  private handleOrderBook(data: any, symbol: string): void {
    const bids = (data.bs || data.b || []).map(([price, amount, timestamp]: [string, string, string]) => ({
      price: parseFloat(price),
      amount: parseFloat(amount),
    }));

    const asks = (data.as || data.a || []).map(([price, amount, timestamp]: [string, string, string]) => ({
      price: parseFloat(price),
      amount: parseFloat(amount),
    }));

    if (bids.length === 0 && asks.length === 0) {
      return;
    }

    const orderbook: OrderBook = {
      symbol,
      exchange: this.exchangeId,
      timestamp: Date.now(),
      bids,
      asks,
    };

    this.emitTypedEvent('orderbook', orderbook);
  }

  private handleCandle(data: any, symbol: string, channelName: string): void {
    const intervalMatch = channelName.match(/ohlc-(\d+)/);
    const interval = intervalMatch ? intervalMatch[1] : '1';

    const candle: Candle = {
      symbol,
      exchange: this.exchangeId,
      timestamp: Math.floor(parseFloat(data[1]) * 1000),
      timeframe: `${interval}m`,
      open: parseFloat(data[2]),
      high: parseFloat(data[3]),
      low: parseFloat(data[4]),
      close: parseFloat(data[5]),
      volume: parseFloat(data[7]),
    };

    this.emitTypedEvent('candle', candle);
  }
}
