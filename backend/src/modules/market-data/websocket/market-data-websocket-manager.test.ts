/**
 * Market Data WebSocket Manager Tests
 * Unit tests for WebSocket manager functionality
 */

import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { EventEmitter } from 'events';
import { MarketDataWebSocketManager } from './market-data-websocket-manager';
import type { ExchangeId, Ticker, ConnectionConfig } from './types';

// ============================================================================
// MOCKS
// ============================================================================

/**
 * Mock Exchange Adapter
 */
class MockExchangeAdapter extends EventEmitter {
  public exchangeId: ExchangeId;
  public isConnected: boolean = false;
  public status: any;
  private _latency: number | null = null;

  constructor(exchangeId: ExchangeId) {
    super();
    this.exchangeId = exchangeId;
    this.status = {
      state: 'DISCONNECTED',
      connectedAt: null,
      lastPingAt: null,
      lastPongAt: null,
      reconnectAttempts: 0,
    };
  }

  async connect(): Promise<void> {
    this.isConnected = true;
    this.status.state = 'CONNECTED';
    this.status.connectedAt = new Date();
    this.emit('connected', { timestamp: Date.now() });
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    this.status.state = 'DISCONNECTED';
    this.emit('disconnected', { timestamp: Date.now() });
  }

  async subscribe(request: any): Promise<void> {
    // Simulate subscription
  }

  async unsubscribe(request: any): Promise<void> {
    // Simulate unsubscription
  }

  async ping(): Promise<void> {
    this._latency = Math.random() * 100;
  }

  getLatency(): number | null {
    return this._latency;
  }

  // Helper to simulate ticker
  simulateTicker(ticker: Ticker): void {
    this.emit('ticker', ticker);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createMockTicker(overrides: Partial<Ticker> = {}): Ticker {
  return {
    symbol: 'BTC/USDT',
    exchange: 'binance',
    timestamp: Date.now(),
    last: 50000,
    bid: 49990,
    ask: 50010,
    high24h: 51000,
    low24h: 49000,
    volume24h: 1000,
    change24h: 1000,
    changePercent24h: 2,
    ...overrides,
  };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// TESTS
// ============================================================================

describe('MarketDataWebSocketManager', () => {
  let manager: MarketDataWebSocketManager;
  let mockAdapter: MockExchangeAdapter;

  beforeEach(() => {
    manager = new MarketDataWebSocketManager({
      autoReconnect: true,
      maxConnections: 10,
      connectionTimeout: 30000,
      enableMetrics: true,
    });

    mockAdapter = new MockExchangeAdapter('binance');
  });

  afterEach(async () => {
    await manager.disconnectAll();
  });

  // ==========================================================================
  // BASIC FUNCTIONALITY
  // ==========================================================================

  describe('Basic Functionality', () => {
    test('should create manager with default config', () => {
      const defaultManager = new MarketDataWebSocketManager();
      expect(defaultManager).toBeDefined();
    });

    test('should create manager with custom config', () => {
      const customManager = new MarketDataWebSocketManager({
        autoReconnect: false,
        maxConnections: 5,
        enableMetrics: false,
      });
      expect(customManager).toBeDefined();
    });
  });

  // ==========================================================================
  // CONNECTION MANAGEMENT
  // ==========================================================================

  describe('Connection Management', () => {
    test('should check if exchange is connected', () => {
      expect(manager.isConnected('binance')).toBe(false);
    });

    test('should get connection status', () => {
      const status = manager.getConnectionStatus('binance');
      expect(status).toBeNull();
    });

    test('should get all connection statuses', () => {
      const statuses = manager.getAllConnectionStatuses();
      expect(statuses.size).toBe(0);
    });

    test('should get health status', () => {
      const health = manager.getHealthStatus();
      expect(health.healthy).toEqual([]);
      expect(health.unhealthy).toEqual([]);
      expect(health.total).toBe(0);
    });
  });

  // ==========================================================================
  // SUBSCRIPTION MANAGEMENT
  // ==========================================================================

  describe('Subscription Management', () => {
    test('should get subscriptions for exchange', () => {
      const subs = manager.getSubscriptions('binance');
      expect(subs).toEqual([]);
    });

    test('should get all subscriptions', () => {
      const allSubs = manager.getAllSubscriptions();
      expect(allSubs.size).toBe(0);
    });
  });

  // ==========================================================================
  // METRICS
  // ==========================================================================

  describe('Metrics', () => {
    test('should get metrics for exchange', () => {
      const metrics = manager.getMetrics('binance');
      expect(metrics).toBeNull();
    });

    test('should get all metrics', () => {
      const allMetrics = manager.getAllMetrics();
      expect(allMetrics.size).toBe(0);
    });
  });

  // ==========================================================================
  // EVENT HANDLING
  // ==========================================================================

  describe('Event Handling', () => {
    test('should be an event emitter', () => {
      expect(manager).toBeInstanceOf(EventEmitter);
    });

    test('should emit events', (done) => {
      manager.once('test-event', (data) => {
        expect(data).toEqual({ test: true });
        done();
      });

      manager.emit('test-event', { test: true });
    });
  });

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================

  describe('Error Handling', () => {
    test('should handle disconnect gracefully when not connected', async () => {
      // Should not throw
      try {
        await manager.disconnect('binance');
        expect(true).toBe(true);
      } catch (error) {
        throw new Error('Should not have thrown');
      }
    });

    test('should handle unsubscribe gracefully when not subscribed', async () => {
      // Should not throw
      try {
        await manager.unsubscribe({
          channel: 'ticker',
          symbol: 'BTC/USDT',
        });
        expect(true).toBe(true);
      } catch (error) {
        throw new Error('Should not have thrown');
      }
    });
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe('MarketDataWebSocketManager Performance', () => {
  let manager: MarketDataWebSocketManager;

  beforeEach(() => {
    manager = new MarketDataWebSocketManager({
      enableMetrics: true,
    });
  });

  afterEach(async () => {
    await manager.disconnectAll();
  });

  test('should handle rapid event emissions', () => {
    const events: any[] = [];

    manager.on('ticker', (ticker) => {
      events.push(ticker);
    });

    // Emit 1000 ticker events
    for (let i = 0; i < 1000; i++) {
      manager.emit('ticker', createMockTicker({ last: 50000 + i }));
    }

    expect(events.length).toBe(1000);
    expect(events[999].last).toBe(50999);
  });

  test('should maintain performance with many listeners', () => {
    // Increase max listeners to avoid warning
    manager.setMaxListeners(200);

    const startTime = Date.now();

    // Add 100 listeners
    for (let i = 0; i < 100; i++) {
      manager.on('ticker', () => {
        // Empty listener
      });
    }

    // Emit 100 events
    for (let i = 0; i < 100; i++) {
      manager.emit('ticker', createMockTicker());
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should complete in less than 100ms
    expect(duration).toBeLessThan(100);
  });
});

// ============================================================================
// INTEGRATION SCENARIOS
// ============================================================================

describe('MarketDataWebSocketManager Integration Scenarios', () => {
  let manager: MarketDataWebSocketManager;

  beforeEach(() => {
    manager = new MarketDataWebSocketManager();
  });

  afterEach(async () => {
    await manager.disconnectAll();
  });

  test('should handle multiple symbol subscriptions', () => {
    const symbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT', 'SOL/USDT'];
    const receivedSymbols: string[] = [];

    manager.on('ticker', (ticker: Ticker) => {
      receivedSymbols.push(ticker.symbol);
    });

    // Simulate tickers for all symbols
    symbols.forEach((symbol) => {
      manager.emit('ticker', createMockTicker({ symbol }));
    });

    expect(receivedSymbols).toEqual(symbols);
  });

  test('should filter events by symbol', () => {
    const btcUpdates: Ticker[] = [];
    const ethUpdates: Ticker[] = [];

    manager.on('ticker', (ticker: Ticker) => {
      if (ticker.symbol === 'BTC/USDT') {
        btcUpdates.push(ticker);
      } else if (ticker.symbol === 'ETH/USDT') {
        ethUpdates.push(ticker);
      }
    });

    // Emit mixed tickers
    manager.emit('ticker', createMockTicker({ symbol: 'BTC/USDT', last: 50000 }));
    manager.emit('ticker', createMockTicker({ symbol: 'ETH/USDT', last: 3000 }));
    manager.emit('ticker', createMockTicker({ symbol: 'BTC/USDT', last: 51000 }));
    manager.emit('ticker', createMockTicker({ symbol: 'SOL/USDT', last: 100 }));

    expect(btcUpdates.length).toBe(2);
    expect(ethUpdates.length).toBe(1);
    expect(btcUpdates[0].last).toBe(50000);
    expect(btcUpdates[1].last).toBe(51000);
    expect(ethUpdates[0].last).toBe(3000);
  });

  test('should calculate price changes', () => {
    const prices: number[] = [];

    manager.on('ticker', (ticker: Ticker) => {
      prices.push(ticker.last);
    });

    // Simulate price movement
    const priceSequence = [50000, 50500, 50200, 51000, 50800];
    priceSequence.forEach((price) => {
      manager.emit('ticker', createMockTicker({ last: price }));
    });

    expect(prices).toEqual(priceSequence);

    // Calculate volatility
    const changes = prices.slice(1).map((price, i) => price - prices[i]);
    const avgChange = changes.reduce((sum, change) => sum + Math.abs(change), 0) / changes.length;

    expect(avgChange).toBeGreaterThan(0);
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('MarketDataWebSocketManager Edge Cases', () => {
  let manager: MarketDataWebSocketManager;

  beforeEach(() => {
    manager = new MarketDataWebSocketManager();
  });

  afterEach(async () => {
    await manager.disconnectAll();
  });

  test('should handle undefined ticker data', () => {
    let receivedTicker: any = null;

    manager.on('ticker', (ticker) => {
      receivedTicker = ticker;
    });

    // Emit undefined
    manager.emit('ticker', undefined as any);

    expect(receivedTicker).toBeUndefined();
  });

  test('should handle null ticker data', () => {
    let receivedTicker: any = 'not-null';

    manager.on('ticker', (ticker) => {
      receivedTicker = ticker;
    });

    // Emit null
    manager.emit('ticker', null as any);

    expect(receivedTicker).toBeNull();
  });

  test('should handle invalid ticker data', () => {
    const invalidTickers: any[] = [];

    manager.on('ticker', (ticker) => {
      invalidTickers.push(ticker);
    });

    // Emit invalid data
    manager.emit('ticker', { invalid: true } as any);
    manager.emit('ticker', 'string' as any);
    manager.emit('ticker', 12345 as any);
    manager.emit('ticker', [] as any);

    expect(invalidTickers.length).toBe(4);
  });

  test('should handle zero prices', () => {
    const zeroPrice = createMockTicker({ last: 0, bid: 0, ask: 0 });
    let receivedTicker: Ticker | null = null;

    manager.on('ticker', (ticker) => {
      receivedTicker = ticker;
    });

    manager.emit('ticker', zeroPrice);

    expect(receivedTicker).not.toBeNull();
    expect(receivedTicker?.last).toBe(0);
  });

  test('should handle negative prices', () => {
    const negativePrice = createMockTicker({ last: -1000 });
    let receivedTicker: Ticker | null = null;

    manager.on('ticker', (ticker) => {
      receivedTicker = ticker;
    });

    manager.emit('ticker', negativePrice);

    expect(receivedTicker).not.toBeNull();
    expect(receivedTicker?.last).toBe(-1000);
  });

  test('should handle very large prices', () => {
    const largePrice = createMockTicker({ last: Number.MAX_SAFE_INTEGER });
    let receivedTicker: Ticker | null = null;

    manager.on('ticker', (ticker) => {
      receivedTicker = ticker;
    });

    manager.emit('ticker', largePrice);

    expect(receivedTicker).not.toBeNull();
    expect(receivedTicker?.last).toBe(Number.MAX_SAFE_INTEGER);
  });
});
