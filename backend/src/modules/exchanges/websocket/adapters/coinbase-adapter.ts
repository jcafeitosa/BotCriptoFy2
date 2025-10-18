/**
 * @fileoverview Coinbase WebSocket adapter implementation
 * @module market-data/websocket/adapters/coinbase
 */

import type { SubscriptionRequest, OrderBook, Trade, Ticker } from '@/modules/market-data/websocket/types';
import type { ConnectionConfig } from '@/modules/exchanges';
import { BaseExchangeAdapter } from '@/modules/market-data/websocket/base-adapter';
import type WebSocket from 'ws';

/**
 * Coinbase Pro WebSocket adapter
 *
 * @see https://docs.cloud.coinbase.com/exchange/docs/websocket-overview
 */
export class CoinbaseAdapter extends BaseExchangeAdapter {
  private subscribedChannels: Set<string> = new Set();

  constructor(config: ConnectionConfig) {
    super('coinbase', config);
  }

  protected getWebSocketUrl(): string {
    return this.config.url || 'wss://ws-feed.exchange.coinbase.com';
  }

  protected formatSubscriptionMessage(request: SubscriptionRequest): string {
    const productId = this.formatProductId(request.symbol);
    const channel = this.mapChannel(request.channel);

    return JSON.stringify({
      type: 'subscribe',
      product_ids: [productId],
      channels: [channel],
    });
  }

  protected formatUnsubscriptionMessage(request: SubscriptionRequest): string {
    const productId = this.formatProductId(request.symbol);
    const channel = this.mapChannel(request.channel);

    return JSON.stringify({
      type: 'unsubscribe',
      product_ids: [productId],
      channels: [channel],
    });
  }

  protected parseMessage(data: WebSocket.Data): void {
    const message: any = JSON.parse(data.toString());

    switch (message.type) {
      case 'ticker':
        this.handleTicker(message);
        break;
      case 'match':
        this.handleTrade(message);
        break;
      case 'snapshot':
      case 'l2update':
        this.handleOrderBook(message);
        break;
      case 'subscriptions':
        // Subscription confirmation
        break;
      case 'error':
        this.emitTypedEvent('error', {
          code: 'COINBASE_ERROR',
          message: message.message || 'Unknown error',
          exchange: this.exchangeId,
          timestamp: Date.now(),
          fatal: false,
        });
        break;
    }
  }

  private mapChannel(channel: string): string {
    switch (channel) {
      case 'ticker':
        return 'ticker';
      case 'trades':
        return 'matches';
      case 'orderbook':
        return 'level2';
      default:
        return channel;
    }
  }

  private formatProductId(symbol: string): string {
    // Convert BTC/USDT to BTC-USDT
    return symbol.replace('/', '-');
  }

  private parseProductId(productId: string): string {
    // Convert BTC-USD to BTC/USD
    return productId.replace('-', '/');
  }

  private handleTicker(message: any): void {
    const ticker: Ticker = {
      symbol: this.parseProductId(message.product_id),
      exchange: this.exchangeId,
      timestamp: new Date(message.time).getTime(),
      last: parseFloat(message.price),
      bid: parseFloat(message.best_bid),
      ask: parseFloat(message.best_ask),
      high24h: parseFloat(message.high_24h),
      low24h: parseFloat(message.low_24h),
      volume24h: parseFloat(message.volume_24h),
      change24h: 0, // Coinbase doesn't provide this directly
    };

    this.emitTypedEvent('ticker', ticker);
  }

  private handleTrade(message: any): void {
    const trade: Trade = {
      id: message.trade_id.toString(),
      symbol: this.parseProductId(message.product_id),
      exchange: this.exchangeId,
      timestamp: new Date(message.time).getTime(),
      price: parseFloat(message.price),
      amount: parseFloat(message.size),
      side: message.side,
      takerOrMaker: message.maker_order_id ? 'maker' : 'taker',
    };

    this.emitTypedEvent('trade', trade);
  }

  private handleOrderBook(message: any): void {
    if (message.type === 'snapshot') {
      const orderbook: OrderBook = {
        symbol: this.parseProductId(message.product_id),
        exchange: this.exchangeId,
        timestamp: Date.now(),
        bids: message.bids.map(([price, amount]: [string, string]) => ({
          price: parseFloat(price),
          amount: parseFloat(amount),
        })),
        asks: message.asks.map(([price, amount]: [string, string]) => ({
          price: parseFloat(price),
          amount: parseFloat(amount),
        })),
      };

      this.emitTypedEvent('orderbook', orderbook);
    } else if (message.type === 'l2update') {
      // Handle incremental updates
      const changes = message.changes.map(([side, price, amount]: [string, string, string]) => ({
        side,
        price: parseFloat(price),
        amount: parseFloat(amount),
      }));

      // For simplicity, emit as orderbook update
      // In production, you'd want to maintain a local orderbook
      const orderbook: OrderBook = {
        symbol: this.parseProductId(message.product_id),
        exchange: this.exchangeId,
        timestamp: new Date(message.time).getTime(),
        bids: changes
          .filter((c: { side: string; price: number; amount: number }) => c.side === 'buy')
          .map((c: { side: string; price: number; amount: number }) => ({
            price: c.price,
            amount: c.amount,
          })),
        asks: changes
          .filter((c: { side: string; price: number; amount: number }) => c.side === 'sell')
          .map((c: { side: string; price: number; amount: number }) => ({
            price: c.price,
            amount: c.amount,
          })),
      };

      this.emitTypedEvent('orderbook', orderbook);
    }
  }
}
