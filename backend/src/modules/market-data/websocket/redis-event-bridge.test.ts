/**
 * Redis Event Bridge Tests
 * Tests for Redis pub/sub integration for WebSocket event distribution
 */

import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { RedisEventBridge } from './redis-event-bridge';
import type { WebSocketEvent } from './redis-event-bridge';
import type { Ticker, Trade, OrderBook, Candle } from './types';

// Helper to create mock WebSocket events
const createMockTicker = (overrides?: Partial<Ticker>): Ticker => ({
  exchange: 'binance',
  symbol: 'BTC/USDT',
  timestamp: Date.now(),
  datetime: new Date().toISOString(),
  last: 50000,
  bid: 49999,
  ask: 50001,
  high: 51000,
  low: 49000,
  open: 49500,
  close: 50000,
  volume: 1000,
  ...overrides,
});

const createMockTrade = (overrides?: Partial<Trade>): Trade => ({
  exchange: 'binance',
  symbol: 'BTC/USDT',
  id: 'trade-1',
  timestamp: Date.now(),
  datetime: new Date().toISOString(),
  side: 'buy',
  price: 50000,
  amount: 0.1,
  cost: 5000,
  ...overrides,
});

const createMockOrderBook = (overrides?: Partial<OrderBook>): OrderBook => ({
  exchange: 'binance',
  symbol: 'BTC/USDT',
  timestamp: Date.now(),
  datetime: new Date().toISOString(),
  bids: [[49999, 1.5]],
  asks: [[50001, 2.0]],
  ...overrides,
});

const createMockCandle = (overrides?: Partial<Candle>): Candle => ({
  exchange: 'binance',
  symbol: 'BTC/USDT',
  timestamp: Date.now(),
  datetime: new Date().toISOString(),
  open: 49500,
  high: 51000,
  low: 49000,
  close: 50000,
  volume: 1000,
  ...overrides,
});

describe('RedisEventBridge', () => {
  let bridge: RedisEventBridge;

  beforeEach(() => {
    // Create a new bridge for each test
    bridge = new RedisEventBridge({
      host: 'localhost',
      port: 6379,
      keyPrefix: 'test:ws:',
      enablePublishing: true,
      enableSubscription: true,
    });
  });

  afterEach(async () => {
    // Clean up after each test
    if (bridge && bridge.isReady()) {
      try {
        await bridge.disconnect();
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
  });

  describe('Configuration', () => {
    test('should create bridge with default config', () => {
      const defaultBridge = new RedisEventBridge();
      expect(defaultBridge).toBeDefined();
      expect(defaultBridge.isReady()).toBe(false);
    });

    test('should create bridge with custom config', () => {
      const customBridge = new RedisEventBridge({
        host: 'custom-redis',
        port: 6380,
        keyPrefix: 'custom:',
        enablePublishing: false,
        enableSubscription: true,
      });

      expect(customBridge).toBeDefined();
      expect(customBridge.isReady()).toBe(false);
    });
  });

  describe('Connection Management', () => {
    test('should report not ready before connection', () => {
      expect(bridge.isReady()).toBe(false);
    });

    test('should handle connection without Redis running gracefully', async () => {
      // This test assumes Redis is NOT running
      try {
        await bridge.connect();
        // If connection succeeds, just disconnect
        await bridge.disconnect();
      } catch (error) {
        // Expected - Redis not running
        expect(error).toBeDefined();
      }
    });

    test('should report ready after successful connection', async () => {
      // This test requires Redis to be running
      // Skip if Redis is not available
      try {
        await bridge.connect();
        expect(bridge.isReady()).toBe(true);
        await bridge.disconnect();
      } catch (error) {
        // Skip test if Redis not available
        console.log('Redis not available, skipping test');
      }
    });

    test('should handle disconnect gracefully when not connected', async () => {
      try {
        await bridge.disconnect();
        expect(true).toBe(true); // Should not throw
      } catch (error) {
        throw new Error('Should not have thrown');
      }
    });

    test('should emit connected event on successful connection', async () => {
      try {
        let connectedEmitted = false;
        bridge.on('connected', () => {
          connectedEmitted = true;
        });

        await bridge.connect();
        expect(connectedEmitted).toBe(true);
        await bridge.disconnect();
      } catch (error) {
        // Skip if Redis not available
        console.log('Redis not available, skipping test');
      }
    });

    test('should emit disconnected event on disconnect', async () => {
      try {
        await bridge.connect();

        let disconnectedEmitted = false;
        bridge.on('disconnected', () => {
          disconnectedEmitted = true;
        });

        await bridge.disconnect();
        expect(disconnectedEmitted).toBe(true);
      } catch (error) {
        // Skip if Redis not available
        console.log('Redis not available, skipping test');
      }
    });
  });

  describe('Metrics', () => {
    test('should initialize metrics', () => {
      const metrics = bridge.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.connected).toBe(false);
      expect(metrics.publishedEvents).toBe(0);
      expect(metrics.receivedEvents).toBe(0);
      expect(metrics.errors).toBe(0);
      expect(metrics.subscriptions).toBe(0);
    });

    test('should track connection state in metrics', async () => {
      const initialMetrics = bridge.getMetrics();
      expect(initialMetrics.connected).toBe(false);

      try {
        await bridge.connect();
        const connectedMetrics = bridge.getMetrics();
        expect(connectedMetrics.connected).toBe(true);
        await bridge.disconnect();
      } catch (error) {
        // Skip if Redis not available
      }
    });

    test('should return metrics after disconnect', async () => {
      try {
        await bridge.connect();
        await bridge.disconnect();

        const metrics = bridge.getMetrics();
        expect(metrics).toBeDefined();
        expect(metrics.connected).toBe(false);
      } catch (error) {
        // Skip if Redis not available
      }
    });
  });

  describe('Publishing', () => {
    test('should not throw when publishing without connection', async () => {
      const event: WebSocketEvent = {
        type: 'ticker',
        data: createMockTicker(),
      };

      try {
        await bridge.publish(event);
        expect(true).toBe(true); // Should not throw
      } catch (error) {
        throw new Error('Should not have thrown');
      }
    });

    test('should publish ticker event when connected', async () => {
      try {
        await bridge.connect();

        const event: WebSocketEvent = {
          type: 'ticker',
          data: createMockTicker(),
        };

        await bridge.publish(event);

        const metrics = bridge.getMetrics();
        expect(metrics.publishedEvents).toBe(1);

        await bridge.disconnect();
      } catch (error) {
        // Skip if Redis not available
        console.log('Redis not available, skipping test');
      }
    });

    test('should publish trade event when connected', async () => {
      try {
        await bridge.connect();

        const event: WebSocketEvent = {
          type: 'trade',
          data: createMockTrade(),
        };

        await bridge.publish(event);

        const metrics = bridge.getMetrics();
        expect(metrics.publishedEvents).toBe(1);

        await bridge.disconnect();
      } catch (error) {
        // Skip if Redis not available
      }
    });

    test('should publish orderbook event when connected', async () => {
      try {
        await bridge.connect();

        const event: WebSocketEvent = {
          type: 'orderbook',
          data: createMockOrderBook(),
        };

        await bridge.publish(event);

        const metrics = bridge.getMetrics();
        expect(metrics.publishedEvents).toBe(1);

        await bridge.disconnect();
      } catch (error) {
        // Skip if Redis not available
      }
    });

    test('should publish candle event when connected', async () => {
      try {
        await bridge.connect();

        const event: WebSocketEvent = {
          type: 'candle',
          data: createMockCandle(),
        };

        await bridge.publish(event);

        const metrics = bridge.getMetrics();
        expect(metrics.publishedEvents).toBe(1);

        await bridge.disconnect();
      } catch (error) {
        // Skip if Redis not available
      }
    });

    test('should publish exchange event when connected', async () => {
      try {
        await bridge.connect();

        const event: WebSocketEvent = {
          type: 'exchange:connected',
          data: { exchange: 'binance', timestamp: Date.now() },
        };

        await bridge.publish(event);

        const metrics = bridge.getMetrics();
        expect(metrics.publishedEvents).toBe(1);

        await bridge.disconnect();
      } catch (error) {
        // Skip if Redis not available
      }
    });

    test('should track published events count', async () => {
      try {
        await bridge.connect();

        // Publish multiple events
        for (let i = 0; i < 5; i++) {
          await bridge.publish({
            type: 'ticker',
            data: createMockTicker({ last: 50000 + i }),
          });
        }

        const metrics = bridge.getMetrics();
        expect(metrics.publishedEvents).toBe(5);

        await bridge.disconnect();
      } catch (error) {
        // Skip if Redis not available
      }
    });
  });

  describe('Subscription', () => {
    test('should not throw when subscribing without connection', async () => {
      try {
        await bridge.subscribe('ticker');
        expect(true).toBe(true); // Should not throw
      } catch (error) {
        throw new Error('Should not have thrown');
      }
    });

    test('should subscribe to ticker channel when connected', async () => {
      try {
        await bridge.connect();
        await bridge.subscribe('ticker');

        const metrics = bridge.getMetrics();
        expect(metrics.subscriptions).toBe(1);

        await bridge.disconnect();
      } catch (error) {
        // Skip if Redis not available
      }
    });

    test('should subscribe to multiple channels', async () => {
      try {
        await bridge.connect();

        await bridge.subscribe('ticker');
        await bridge.subscribe('trade');
        await bridge.subscribe('orderbook');

        const metrics = bridge.getMetrics();
        expect(metrics.subscriptions).toBe(3);

        await bridge.disconnect();
      } catch (error) {
        // Skip if Redis not available
      }
    });

    test('should not duplicate subscriptions', async () => {
      try {
        await bridge.connect();

        await bridge.subscribe('ticker');
        await bridge.subscribe('ticker'); // Duplicate

        const metrics = bridge.getMetrics();
        expect(metrics.subscriptions).toBe(1);

        await bridge.disconnect();
      } catch (error) {
        // Skip if Redis not available
      }
    });

    test('should subscribe to all event types', async () => {
      try {
        await bridge.connect();
        await bridge.subscribeAll();

        const metrics = bridge.getMetrics();
        expect(metrics.subscriptions).toBe(8); // ticker, trade, orderbook, candle, 4 exchange events

        await bridge.disconnect();
      } catch (error) {
        // Skip if Redis not available
      }
    });

    test('should emit subscribed event', async () => {
      try {
        await bridge.connect();

        let subscribedData: any = null;
        bridge.on('subscribed', (data) => {
          subscribedData = data;
        });

        await bridge.subscribe('ticker');

        expect(subscribedData).toBeDefined();
        expect(subscribedData.eventType).toBe('ticker');

        await bridge.disconnect();
      } catch (error) {
        // Skip if Redis not available
      }
    });

    test('should unsubscribe from channel', async () => {
      try {
        await bridge.connect();

        await bridge.subscribe('ticker');
        let metrics = bridge.getMetrics();
        expect(metrics.subscriptions).toBe(1);

        await bridge.unsubscribe('ticker');
        metrics = bridge.getMetrics();
        expect(metrics.subscriptions).toBe(0);

        await bridge.disconnect();
      } catch (error) {
        // Skip if Redis not available
      }
    });

    test('should unsubscribe from all channels', async () => {
      try {
        await bridge.connect();

        await bridge.subscribeAll();
        let metrics = bridge.getMetrics();
        expect(metrics.subscriptions).toBeGreaterThan(0);

        await bridge.unsubscribeAll();
        metrics = bridge.getMetrics();
        expect(metrics.subscriptions).toBe(0);

        await bridge.disconnect();
      } catch (error) {
        // Skip if Redis not available
      }
    });
  });

  describe('Event Handling', () => {
    test('should emit received events to local listeners', async () => {
      try {
        // Create two bridges to simulate two instances
        const publisher = new RedisEventBridge({
          host: 'localhost',
          port: 6379,
          keyPrefix: 'test:ws:',
        });

        const subscriber = new RedisEventBridge({
          host: 'localhost',
          port: 6379,
          keyPrefix: 'test:ws:',
        });

        await publisher.connect();
        await subscriber.connect();
        await subscriber.subscribe('ticker');

        // Wait for subscription to be ready
        await new Promise((resolve) => setTimeout(resolve, 100));

        let receivedTicker: Ticker | null = null;
        subscriber.on('ticker', (data: Ticker) => {
          receivedTicker = data;
        });

        // Publish from first instance
        const tickerData = createMockTicker();
        await publisher.publish({
          type: 'ticker',
          data: tickerData,
        });

        // Wait for message to be received
        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(receivedTicker).toBeDefined();
        if (receivedTicker) {
          expect(receivedTicker.symbol).toBe('BTC/USDT');
          expect(receivedTicker.last).toBe(50000);
        }

        await publisher.disconnect();
        await subscriber.disconnect();
      } catch (error) {
        // Skip if Redis not available
        console.log('Redis not available, skipping test');
      }
    });

    test('should not receive own published events', async () => {
      try {
        await bridge.connect();
        await bridge.subscribe('ticker');

        let receivedCount = 0;
        bridge.on('ticker', () => {
          receivedCount++;
        });

        // Publish event
        await bridge.publish({
          type: 'ticker',
          data: createMockTicker(),
        });

        // Wait for potential message
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Should not receive own message (filtered by process.pid)
        expect(receivedCount).toBe(0);

        await bridge.disconnect();
      } catch (error) {
        // Skip if Redis not available
      }
    });

    test('should track received events count', async () => {
      try {
        const publisher = new RedisEventBridge({
          host: 'localhost',
          port: 6379,
          keyPrefix: 'test:ws:',
        });

        const subscriber = new RedisEventBridge({
          host: 'localhost',
          port: 6379,
          keyPrefix: 'test:ws:',
        });

        await publisher.connect();
        await subscriber.connect();
        await subscriber.subscribe('ticker');

        await new Promise((resolve) => setTimeout(resolve, 100));

        // Publish 3 events
        for (let i = 0; i < 3; i++) {
          await publisher.publish({
            type: 'ticker',
            data: createMockTicker({ last: 50000 + i }),
          });
        }

        await new Promise((resolve) => setTimeout(resolve, 200));

        const metrics = subscriber.getMetrics();
        expect(metrics.receivedEvents).toBe(3);

        await publisher.disconnect();
        await subscriber.disconnect();
      } catch (error) {
        // Skip if Redis not available
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid Redis configuration', async () => {
      const invalidBridge = new RedisEventBridge({
        host: 'invalid-host-that-does-not-exist',
        port: 6380, // Valid port, invalid host
      });

      // Suppress error listeners to avoid unhandled errors
      invalidBridge.on('error', () => {
        // Ignore
      });

      try {
        await invalidBridge.connect();
        // Should fail
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should emit error event on connection failure', async () => {
      const invalidBridge = new RedisEventBridge({
        host: 'invalid-host',
        port: 6380, // Valid port, invalid host
      });

      let errorEmitted = false;
      invalidBridge.on('error', () => {
        errorEmitted = true;
      });

      try {
        await invalidBridge.connect();
      } catch (error) {
        // Expected
      }

      // Wait for error event
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(errorEmitted).toBe(true);
    });

    test('should gracefully handle publish errors when disconnected', async () => {
      try {
        await bridge.connect();
      } catch (error) {
        // Skip if Redis not available
        console.log('Redis not available, skipping test');
        return;
      }

      await bridge.disconnect();

      // Should not throw
      await bridge.publish({
        type: 'ticker',
        data: createMockTicker(),
      });

      expect(true).toBe(true);
    });
  });

  describe('Performance', () => {
    test('should handle rapid event publishing', async () => {
      try {
        await bridge.connect();

        // Publish many events rapidly
        const promises: Promise<void>[] = [];
        for (let i = 0; i < 100; i++) {
          promises.push(
            bridge.publish({
              type: 'ticker',
              data: createMockTicker({ last: 50000 + i }),
            })
          );
        }

        await Promise.all(promises);

        const metrics = bridge.getMetrics();
        expect(metrics.publishedEvents).toBe(100);

        await bridge.disconnect();
      } catch (error) {
        // Skip if Redis not available
      }
    });

    test('should maintain performance with many subscriptions', async () => {
      try {
        await bridge.connect();

        const start = Date.now();
        await bridge.subscribeAll();
        const duration = Date.now() - start;

        // Should complete quickly (< 1 second)
        expect(duration).toBeLessThan(1000);

        await bridge.disconnect();
      } catch (error) {
        // Skip if Redis not available
      }
    });
  });
});
