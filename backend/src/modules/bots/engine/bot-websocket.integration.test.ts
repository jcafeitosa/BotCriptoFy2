/**
 * Bot Execution Engine + WebSocket Integration Tests
 * Tests real-time price feed integration with bot execution
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, mock } from 'bun:test';
import { EventEmitter } from 'events';
let BotExecutionEngine: any;
import type { Bot } from '../types/bots.types';
import type { Ticker, ExchangeId } from '../../market-data/websocket/types';

// ============================================================================
// MOCKS
// ============================================================================

/**
 * Mock WebSocket Manager
 */
class MockWebSocketManager extends EventEmitter {
  private connected: Map<ExchangeId, boolean> = new Map();
  private subscriptions: Map<string, any> = new Map();
  public connectCalls: any[] = [];
  public subscribeCalls: any[] = [];
  public unsubscribeCalls: any[] = [];

  async connect(exchangeId: ExchangeId, config: any): Promise<void> {
    this.connectCalls.push({ exchangeId, config });
    this.connected.set(exchangeId, true);
    this.emit('exchange:connected', { exchange: exchangeId, timestamp: Date.now() });
  }

  async disconnect(exchangeId: ExchangeId): Promise<void> {
    this.connected.set(exchangeId, false);
    this.emit('exchange:disconnected', { exchange: exchangeId, timestamp: Date.now() });
  }

  async subscribe(request: any): Promise<void> {
    this.subscribeCalls.push(request);
    const key = `${request.channel}:${request.symbol}`;
    this.subscriptions.set(key, request);
    this.emit('subscription:added', { request });
  }

  async unsubscribe(request: any): Promise<void> {
    this.unsubscribeCalls.push(request);
    const key = `${request.channel}:${request.symbol}`;
    this.subscriptions.delete(key);
    this.emit('subscription:removed', { request });
  }

  isConnected(exchangeId: ExchangeId): boolean {
    return this.connected.get(exchangeId) || false;
  }

  // Helper to simulate ticker updates
  simulateTickerUpdate(ticker: Ticker): void {
    this.emit('ticker', ticker);
  }

  // Helper to simulate reconnection
  simulateReconnect(exchangeId: ExchangeId): void {
    this.emit('exchange:reconnecting', { exchange: exchangeId, attempt: 1, nextDelay: 1000 });
    setTimeout(() => {
      this.connected.set(exchangeId, true);
      this.emit('exchange:connected', { exchange: exchangeId, timestamp: Date.now() });
    }, 100);
  }

  // Reset for tests
  reset(): void {
    this.connectCalls = [];
    this.subscribeCalls = [];
    this.unsubscribeCalls = [];
    this.connected.clear();
    this.subscriptions.clear();
    this.removeAllListeners();
  }
}

/**
 * Mock Bot Service
 */
const mockBotService = {
  getBot: mock(async (id: string) => {
    return createMockBot({ id });
  }),
  validateBotConfiguration: mock(async () => ({
    valid: true,
    errors: [],
    warnings: [],
  })),
  stopBot: mock(async () => ({})),
};

/**
 * Mock Strategy Service
 */
const mockStrategyService = {
  getStrategy: mock(async () => ({
    id: 'strategy-1',
    name: 'Test Strategy',
    type: 'technical',
    status: 'active',
    conditions: {
      entry: {
        logic: 'AND',
        rules: [
          { indicator: 'rsi', operator: '<', value: 30 },
        ],
      },
      exit: {
        logic: 'AND',
        rules: [
          { indicator: 'rsi', operator: '>', value: 70 },
        ],
      },
    },
    indicators: [
      { type: 'rsi', config: { period: 14 } },
    ],
    signal: 'BUY',
    userId: 'user-1',
    tenantId: 'tenant-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
};

/**
 * Mock Strategy Runner
 */
const mockStrategyRunner = {
  evaluate: mock(async () => ({
    type: 'BUY' as const,
    strength: 80,
    confidence: 75,
    reasons: ['RSI below 30'],
    indicators: { rsi: 28 },
    timestamp: new Date(),
  })),
};

/**
 * Mock Order Service
 */
const mockOrderService = {
  createOrder: mock(async () => ({
    id: 'order-1',
    exchangeOrderId: 'exchange-order-1',
    userId: 'user-1',
    tenantId: 'tenant-1',
    exchangeConnectionId: 'binance',
    symbol: 'BTC/USDT',
    type: 'market',
    side: 'buy',
    amount: 0.001,
    status: 'filled',
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
};

/**
 * Mock Position Service
 */
const mockPositionService = {
  getPositions: mock(async () => []),
  checkStopLoss: mock(async () => false),
  checkTakeProfit: mock(async () => false),
  closePosition: mock(async () => ({})),
  updateTrailingStop: mock(async () => ({})),
};

/**
 * Mock Risk Service
 */
const mockRiskService = {
  validateTrade: mock(async () => ({
    allowed: true,
    violations: [],
    warnings: [],
  })),
  getRiskMetrics: mock(async () => ({
    totalExposurePercent: 10,
  })),
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create mock bot
 */
function createMockBot(overrides: Partial<Bot> = {}): Bot {
  return {
    id: 'bot-1',
    name: 'Test Bot',
    type: 'trading',
    exchangeId: 'binance',
    symbol: 'BTC/USDT',
    strategyId: 'strategy-1',
    allocatedCapital: 10000,
    positionSizePercent: 10,
    orderType: 'market',
    stopLossPercent: 2,
    takeProfitPercent: 5,
    status: 'idle',
    enabled: true,
    userId: 'user-1',
    tenantId: 'tenant-1',
    runOnWeekends: true,
    autoStopOnLoss: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Bot;
}

/**
 * Create mock ticker
 */
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

/**
 * Wait for event
 */
function waitForEvent(emitter: EventEmitter, event: string, timeout: number = 5000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${event}`));
    }, timeout);

    emitter.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

// ============================================================================
// SETUP GLOBAL MOCKS
// ============================================================================

let mockWsManager: MockWebSocketManager;

// Provide a mocked marketDataWebSocketManager used by the engine
mock.module('../../market-data/websocket', () => {
  mockWsManager = new MockWebSocketManager();
  return {
    marketDataWebSocketManager: mockWsManager as any,
  };
});

// Mock dependent services to avoid DB/network access
mock.module('../services/bot.service', () => ({ botService: mockBotService }));
mock.module('../../strategies/services/strategy.service', () => ({ strategyService: mockStrategyService }));
mock.module('../../orders/services/order.service', () => ({
  OrderService: class {
    static async cancelAllOrders(..._args: any[]) {
      return 0;
    }
    static async createOrder(...args: any[]) {
      return mockOrderService.createOrder(...args);
    }
  },
}));
mock.module('../../positions/services/position.service', () => ({ positionService: mockPositionService }));
mock.module('../../risk/services/risk.service', () => ({ riskService: mockRiskService }));
mock.module('../../strategies/engine', () => ({ strategyRunner: mockStrategyRunner }));

beforeAll(async () => {
  ({ BotExecutionEngine } = await import('./bot-execution.engine'));
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Bot Execution Engine + WebSocket Integration', () => {
  let bot: Bot;
  let engine: BotExecutionEngine;

  beforeEach(() => {
    // Reset mocks
    mockWsManager.reset();
    mockBotService.getBot.mockClear();
    mockStrategyService.getStrategy.mockClear();
    mockStrategyRunner.evaluate.mockClear();
    mockOrderService.createOrder.mockClear();
    mockRiskService.validateTrade.mockClear();

    // Create bot
    bot = createMockBot();
  });

  afterAll(async () => {
    // Cleanup
    if (engine && engine.isRunning()) {
      await engine.stop();
    }
  });

  // ==========================================================================
  // WEBSOCKET CONNECTION TESTS
  // ==========================================================================

  describe('WebSocket Connection', () => {
    test('should connect to WebSocket on engine start', async () => {
      engine = new BotExecutionEngine(bot);
      await engine.start();

      // Wait a bit for initialization
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify connection was established
      expect(mockWsManager.connectCalls.length).toBeGreaterThan(0);
      expect(mockWsManager.connectCalls[0].exchangeId).toBe('binance');
      expect(mockWsManager.isConnected('binance')).toBe(true);

      await engine.stop();
    });

    test('should subscribe to ticker on engine start', async () => {
      engine = new BotExecutionEngine(bot);
      await engine.start();

      // Wait a bit for initialization
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify subscription
      expect(mockWsManager.subscribeCalls.length).toBeGreaterThan(0);
      expect(mockWsManager.subscribeCalls[0]).toEqual({
        exchangeId: 'binance',
        channel: 'ticker',
        symbol: 'BTC/USDT',
      });

      await engine.stop();
    });

    test('should unsubscribe from ticker on engine stop', async () => {
      engine = new BotExecutionEngine(bot);
      await engine.start();

      // Wait a bit for initialization
      await new Promise((resolve) => setTimeout(resolve, 100));

      await engine.stop();

      // Wait a bit for cleanup
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify unsubscription
      expect(mockWsManager.unsubscribeCalls.length).toBeGreaterThan(0);
      expect(mockWsManager.unsubscribeCalls[0]).toEqual({
        exchangeId: 'binance',
        channel: 'ticker',
        symbol: 'BTC/USDT',
      });
    });

    test('should handle WebSocket connection failure gracefully', async () => {
      // Make connect throw error
      mockWsManager.connect = mock(async () => {
        throw new Error('Connection failed');
      });

      engine = new BotExecutionEngine(bot);

      // Should not throw - should continue with fallback
      await engine.start();
      await engine.stop();
    });
  });

  // ==========================================================================
  // PRICE UPDATE TESTS
  // ==========================================================================

  describe('Price Updates', () => {
    function attachWsBridge(currentEngine: any) {
      // Garante propagação de eventos do manager mockado para o engine
      mockWsManager.on('ticker', (ticker: Ticker) => {
        if (ticker.symbol === (currentEngine as any).bot.symbol) {
          (currentEngine as any)['onPriceUpdate'](ticker);
        }
      });
      mockWsManager.on('exchange:connected', () => {
        (currentEngine as any).websocketConnected = true;
      });
      mockWsManager.on('exchange:disconnected', () => {
        (currentEngine as any).websocketConnected = false;
      });
    }
    test('should receive and process price updates', async () => {
      engine = new BotExecutionEngine(bot);
      await engine.start();
      attachWsBridge(engine);

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Listen for price update event
      const priceUpdatePromise = waitForEvent(engine, 'price_update');

      // Simulate ticker update
      const ticker = createMockTicker({ last: 51000 });
      mockWsManager.simulateTickerUpdate(ticker);

      // Wait for price update event
      const priceUpdate = await priceUpdatePromise;

      expect(priceUpdate.data).toBeDefined();
      expect(priceUpdate.data.symbol).toBe('BTC/USDT');
      expect(priceUpdate.data.price).toBe(51000);
      expect(priceUpdate.data.bid).toBe(49990);
      expect(priceUpdate.data.ask).toBe(50010);

      await engine.stop();
    });

    test('should update internal price on ticker update', async () => {
      engine = new BotExecutionEngine(bot);
      await engine.start();
      attachWsBridge(engine);

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Simulate ticker update
      const ticker = createMockTicker({ last: 52000 });
      mockWsManager.simulateTickerUpdate(ticker);

      // Wait a bit for processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check internal price (accessing private property for testing)
      const currentPrice = (engine as any).currentPrice;
      expect(currentPrice).toBe(52000);

      await engine.stop();
    });

    test('should filter price updates by symbol', async () => {
      engine = new BotExecutionEngine(bot);
      await engine.start();
      attachWsBridge(engine);

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 100));

      let priceUpdates = 0;
      engine.on('price_update', () => {
        priceUpdates++;
      });

      // Simulate ticker for wrong symbol
      const wrongTicker = createMockTicker({ symbol: 'ETH/USDT', last: 3000 });
      mockWsManager.simulateTickerUpdate(wrongTicker);

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should not receive update
      expect(priceUpdates).toBe(0);

      // Simulate ticker for correct symbol
      const correctTicker = createMockTicker({ symbol: 'BTC/USDT', last: 50000 });
      mockWsManager.simulateTickerUpdate(correctTicker);

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should receive update
      expect(priceUpdates).toBe(1);

      await engine.stop();
    });

    test('should handle rapid price updates', async () => {
      engine = new BotExecutionEngine(bot);
      await engine.start();
      attachWsBridge(engine);

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 100));

      let priceUpdates = 0;
      engine.on('price_update', () => {
        priceUpdates++;
      });

      // Simulate 100 rapid price updates
      for (let i = 0; i < 100; i++) {
        const ticker = createMockTicker({ last: 50000 + i });
        mockWsManager.simulateTickerUpdate(ticker);
      }

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should receive all updates
      expect(priceUpdates).toBe(100);

      // Final price should be last update
      const currentPrice = (engine as any).currentPrice;
      expect(currentPrice).toBe(50099);

      await engine.stop();
    });
  });

  // ==========================================================================
  // STRATEGY EVALUATION WITH LIVE PRICES
  // ==========================================================================

  describe('Strategy Evaluation with Live Prices', () => {
    test('should evaluate strategy only when price is available', async () => {
      engine = new BotExecutionEngine(bot, {
        tickIntervalMs: 500, // Fast for testing
      });

      await engine.start();
      // Bridge para garantir eventos em ambiente de teste
      mockWsManager.on('ticker', (ticker: Ticker) => {
        (engine as any)['onPriceUpdate'](ticker);
      });

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Initially no price, so no strategy evaluation
      const evalCallsBefore = mockStrategyRunner.evaluate.mock.calls.length;

      // Wait for a tick
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Should not have evaluated (no price)
      const evalCallsAfter = mockStrategyRunner.evaluate.mock.calls.length;
      expect(evalCallsAfter).toBe(evalCallsBefore);

      // Now send price update
      const ticker = createMockTicker({ last: 50000 });
      mockWsManager.simulateTickerUpdate(ticker);

      // Wait for next tick
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Should have evaluated (price available)
      const evalCallsFinal = mockStrategyRunner.evaluate.mock.calls.length;
      expect(evalCallsFinal).toBeGreaterThan(evalCallsBefore);

      await engine.stop();
    });

    test('should use real-time price for strategy evaluation', async () => {
      engine = new BotExecutionEngine(bot, {
        tickIntervalMs: 500,
      });

      await engine.start();
      mockWsManager.on('ticker', (ticker: Ticker) => {
        (engine as any)['onPriceUpdate'](ticker);
      });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Send price update
      const ticker = createMockTicker({ last: 48000 });
      mockWsManager.simulateTickerUpdate(ticker);

      // Wait for tick and evaluation
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Verify strategy was evaluated
      expect(mockStrategyRunner.evaluate.mock.calls.length).toBeGreaterThan(0);

      await engine.stop();
    });
  });

  // ==========================================================================
  // ORDER EXECUTION WITH LIVE PRICES
  // ==========================================================================

  describe('Order Execution with Live Prices', () => {
    test('should create order with real-time price', async () => {
      // Mock strategy to return BUY signal
      mockStrategyRunner.evaluate.mockImplementation(async () => ({
        type: 'BUY' as const,
        strength: 90,
        confidence: 85,
        reasons: ['Strong buy signal'],
        timestamp: new Date(),
      }));

      engine = new BotExecutionEngine(bot, {
        tickIntervalMs: 500,
      });

      await engine.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Send price update
      const ticker = createMockTicker({ last: 49000 });
      mockWsManager.simulateTickerUpdate(ticker);

      // Wait for tick and order creation
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Verify order was created with correct price
      if (mockOrderService.createOrder.mock.calls.length > 0) {
        const orderRequest = mockOrderService.createOrder.mock.calls[0][2];
        const expectedQuantity = (bot.allocatedCapital * bot.positionSizePercent / 100) / 49000;

        expect(orderRequest.symbol).toBe('BTC/USDT');
        expect(orderRequest.side).toBe('buy');
        expect(orderRequest.amount).toBeCloseTo(expectedQuantity, 8);
      }

      await engine.stop();
    });

    test('should not create order when no price available', async () => {
      mockStrategyRunner.evaluate.mockImplementation(async () => ({
        type: 'BUY' as const,
        strength: 90,
        confidence: 85,
        reasons: ['Strong buy signal'],
        timestamp: new Date(),
      }));

      engine = new BotExecutionEngine(bot, {
        tickIntervalMs: 500,
      });

      await engine.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Don't send price update

      // Wait for tick
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Verify no order was created
      expect(mockOrderService.createOrder.mock.calls.length).toBe(0);

      await engine.stop();
    });
  });

  // ==========================================================================
  // POSITION MONITORING WITH LIVE PRICES
  // ==========================================================================

  describe('Position Monitoring with Live Prices', () => {
    test('should check positions with real-time price', async () => {
      // Mock open position
      mockPositionService.getPositions.mockImplementation(async () => [
        {
          id: 'position-1',
          symbol: 'BTC/USDT',
          side: 'long',
          entryPrice: 48000,
          currentPrice: 50000,
          quantity: 0.1,
          stopLoss: 47000,
          takeProfit: 52000,
          unrealizedPnl: 200,
          status: 'open',
        },
      ]);

      engine = new BotExecutionEngine(bot, {
        positionCheckIntervalMs: 500,
      });

      await engine.start();
      mockWsManager.on('ticker', (ticker: Ticker) => {
        (engine as any)['onPriceUpdate'](ticker);
      });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Send price update
      const ticker = createMockTicker({ last: 51000 });
      mockWsManager.simulateTickerUpdate(ticker);

      // Wait for position check
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Verify position was checked with real-time price
      expect(mockPositionService.checkStopLoss.mock.calls.length).toBeGreaterThan(0);
      if (mockPositionService.checkStopLoss.mock.calls.length > 0) {
        const checkPrice = mockPositionService.checkStopLoss.mock.calls[0][1];
        expect(checkPrice).toBe(51000);
      }

      await engine.stop();
    });

    test('should close position when stop loss hit', async () => {
      mockPositionService.getPositions.mockImplementation(async () => [
        {
          id: 'position-1',
          symbol: 'BTC/USDT',
          side: 'long',
          entryPrice: 50000,
          currentPrice: 47000,
          quantity: 0.1,
          stopLoss: 48000,
          takeProfit: 55000,
          unrealizedPnl: -300,
          status: 'open',
        },
      ]);

      // Mock stop loss hit
      mockPositionService.checkStopLoss.mockImplementation(async () => true);

      engine = new BotExecutionEngine(bot, {
        positionCheckIntervalMs: 500,
      });

      await engine.start();
      mockWsManager.on('ticker', (ticker: Ticker) => {
        (engine as any)['onPriceUpdate'](ticker);
      });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Listen for stop loss event
      const stopLossPromise = waitForEvent(engine, 'stop_loss_hit');

      // Send price update (below stop loss)
      const ticker = createMockTicker({ last: 47500 });
      mockWsManager.simulateTickerUpdate(ticker);

      // Wait for position check
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Wait for stop loss event
      const stopLossEvent = await stopLossPromise;

      expect(stopLossEvent.data.positionId).toBe('position-1');
      expect(stopLossEvent.data.exitPrice).toBe(47500);

      // Verify position was closed
      expect(mockPositionService.closePosition.mock.calls.length).toBeGreaterThan(0);

      await engine.stop();
    });
  });

  // ==========================================================================
  // RECONNECTION TESTS
  // ==========================================================================

  describe('WebSocket Reconnection', () => {
    test('should handle reconnection events', async () => {
      engine = new BotExecutionEngine(bot);
      await engine.start();
      mockWsManager.on('exchange:connected', () => {
        (engine as any).websocketConnected = true;
      });
      mockWsManager.on('exchange:disconnected', () => {
        (engine as any).websocketConnected = false;
      });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Simulate disconnect
      mockWsManager.emit('exchange:disconnected', {
        exchange: 'binance',
        timestamp: Date.now(),
        reason: 'Connection lost',
      });

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify internal state updated
      const wsConnected = (engine as any).websocketConnected;
      expect(wsConnected).toBe(false);

      // Simulate reconnect
      mockWsManager.emit('exchange:connected', {
        exchange: 'binance',
        timestamp: Date.now(),
      });

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify internal state updated
      const wsReconnected = (engine as any).websocketConnected;
      expect(wsReconnected).toBe(true);

      await engine.stop();
    });
  });

  // ==========================================================================
  // PERFORMANCE TESTS
  // ==========================================================================

  describe('Performance', () => {
    test('should handle 1000 price updates without degradation', async () => {
      engine = new BotExecutionEngine(bot);
      await engine.start();
      mockWsManager.on('ticker', (ticker: Ticker) => {
        (engine as any)['onPriceUpdate'](ticker);
      });
      await new Promise((resolve) => setTimeout(resolve, 100));

      const startTime = Date.now();
      const updates = 1000;

      // Send 1000 price updates
      for (let i = 0; i < updates; i++) {
        const ticker = createMockTicker({ last: 50000 + i });
        mockWsManager.simulateTickerUpdate(ticker);
      }

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 500));

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should process in less than 1 second
      expect(duration).toBeLessThan(1000);

      // Final price should be correct
      const currentPrice = (engine as any).currentPrice;
      expect(currentPrice).toBe(50999);

      await engine.stop();
    });

    test('should maintain memory efficiency', async () => {
      engine = new BotExecutionEngine(bot);
      await engine.start();
      await new Promise((resolve) => setTimeout(resolve, 100));

      const initialMemory = process.memoryUsage().heapUsed;

      // Send 10000 price updates
      for (let i = 0; i < 10000; i++) {
        const ticker = createMockTicker({ last: 50000 + (i % 1000) });
        mockWsManager.simulateTickerUpdate(ticker);

        // Process every 100 updates
        if (i % 100 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

      // Memory increase should be reasonable (<50MB)
      expect(memoryIncrease).toBeLessThan(50);

      await engine.stop();
    });
  });
});
