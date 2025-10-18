/**
 * Market Data WebSocket Manager - Routing Tests
 * Verifies exchangeId routing and ambiguity handling across multiple adapters
 */

import { describe, test, expect, beforeEach, mock } from 'bun:test';

// State holders for mocked adapters
const binanceState = { instances: [] as any[], subscribes: [] as any[], unsubscribes: [] as any[] };
const krakenState = { instances: [] as any[], subscribes: [] as any[], unsubscribes: [] as any[] };

// Mock factory in exchanges module to return lightweight adapters
mock.module('@/modules/exchanges', () => ({
  createWebSocketAdapter: (exchangeId: any, _config: any) => {
    if (exchangeId === 'binance') {
      return new (class FakeBinanceAdapter {
        exchangeId = 'binance' as const;
        isConnected = false;
        status: any = { state: 'DISCONNECTED', exchange: 'binance', reconnectAttempts: 0, subscriptions: [] };
        async connect() { this.isConnected = true; this.status.state = 'CONNECTED'; }
        async disconnect() { this.isConnected = false; this.status.state = 'DISCONNECTED'; }
        async subscribe(request: any) { binanceState.subscribes.push(request); this.status.subscriptions.push(`${request.channel}:${request.symbol}`); }
        async unsubscribe(request: any) { binanceState.unsubscribes.push(request); this.status.subscriptions = this.status.subscriptions.filter((s: string) => s !== `${request.channel}:${request.symbol}`); }
        on() { return this as any; }
        once() { return this as any; }
        off() { return this as any; }
        ping = async () => {};
        getLatency = () => 0;
        terminate = () => {};
      })();
    }
    if (exchangeId === 'kraken') {
      return new (class FakeKrakenAdapter {
        exchangeId = 'kraken' as const;
        isConnected = false;
        status: any = { state: 'DISCONNECTED', exchange: 'kraken', reconnectAttempts: 0, subscriptions: [] };
        async connect() { this.isConnected = true; this.status.state = 'CONNECTED'; }
        async disconnect() { this.isConnected = false; this.status.state = 'DISCONNECTED'; }
        async subscribe(request: any) { krakenState.subscribes.push(request); this.status.subscriptions.push(`${request.channel}:${request.symbol}`); }
        async unsubscribe(request: any) { krakenState.unsubscribes.push(request); this.status.subscriptions = this.status.subscriptions.filter((s: string) => s !== `${request.channel}:${request.symbol}`); }
        on() { return this as any; }
        once() { return this as any; }
        off() { return this as any; }
        ping = async () => {};
        getLatency = () => 0;
        terminate = () => {};
      })();
    }
    throw new Error(`Unsupported exchange: ${exchangeId}`);
  },
}));

// Import manager after mocks so it picks up fake adapters
import { MarketDataWebSocketManager } from '../market-data-websocket-manager';

describe('MarketDataWebSocketManager routing', () => {
  let manager: MarketDataWebSocketManager;

  beforeEach(() => {
    manager = new MarketDataWebSocketManager({ enableMetrics: false });
    binanceState.instances.length = 0;
    binanceState.subscribes.length = 0;
    binanceState.unsubscribes.length = 0;
    krakenState.instances.length = 0;
    krakenState.subscribes.length = 0;
    krakenState.unsubscribes.length = 0;
  });

  test('throws on ambiguous subscribe when multiple exchanges connected and no exchangeId provided', async () => {
    await manager.connect('binance', {
      url: 'wss://test', timeout: 1000, pingInterval: 1000, pongTimeout: 500, reconnection: { maxAttempts: 1, initialDelay: 10, maxDelay: 20, backoffMultiplier: 2, jitterFactor: 0 }
    } as any);
    await manager.connect('kraken', {
      url: 'wss://test', timeout: 1000, pingInterval: 1000, pongTimeout: 500, reconnection: { maxAttempts: 1, initialDelay: 10, maxDelay: 20, backoffMultiplier: 2, jitterFactor: 0 }
    } as any);

    await expect(
      manager.subscribe({ channel: 'ticker', symbol: 'BTC/USDT' })
    ).rejects.toThrow(/Ambiguous subscription target/i);
  });

  test('routes subscribe to the specified exchangeId', async () => {
    await manager.connect('binance', {
      url: 'wss://test', timeout: 1000, pingInterval: 1000, pongTimeout: 500, reconnection: { maxAttempts: 1, initialDelay: 10, maxDelay: 20, backoffMultiplier: 2, jitterFactor: 0 }
    } as any);
    await manager.connect('kraken', {
      url: 'wss://test', timeout: 1000, pingInterval: 1000, pongTimeout: 500, reconnection: { maxAttempts: 1, initialDelay: 10, maxDelay: 20, backoffMultiplier: 2, jitterFactor: 0 }
    } as any);

    await manager.subscribe({ exchangeId: 'kraken', channel: 'ticker', symbol: 'BTC/USD' });

    // Stored under kraken
    const krakenSubs = manager.getSubscriptions('kraken');
    expect(krakenSubs).toEqual([
      expect.objectContaining({ exchangeId: 'kraken', channel: 'ticker', symbol: 'BTC/USD' })
    ]);
    // Not stored under binance
    expect(manager.getSubscriptions('binance')).toEqual([]);
  });

  test('routes unsubscribe by stored subscription when exchangeId not provided', async () => {
    await manager.connect('kraken', {
      url: 'wss://test', timeout: 1000, pingInterval: 1000, pongTimeout: 500, reconnection: { maxAttempts: 1, initialDelay: 10, maxDelay: 20, backoffMultiplier: 2, jitterFactor: 0 }
    } as any);

    await manager.subscribe({ exchangeId: 'kraken', channel: 'ticker', symbol: 'ETH/USD' });

    // Now unsubscribe without exchangeId
    await manager.unsubscribe({ channel: 'ticker', symbol: 'ETH/USD' });

    expect(manager.getSubscriptions('kraken')).toEqual([]);
  });
});
