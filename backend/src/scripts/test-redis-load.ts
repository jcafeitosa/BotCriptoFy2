#!/usr/bin/env bun
/**
 * Redis Pub/Sub Load Testing
 *
 * Comprehensive load testing suite for Redis event distribution system.
 * Tests high-volume event publishing, extreme scale, and resource usage.
 *
 * Usage:
 *   # Standard load test (1000 events/sec, 5 instances, 60s)
 *   bun src/scripts/test-redis-load.ts
 *
 *   # Custom configuration
 *   bun src/scripts/test-redis-load.ts --events=5000 --instances=10 --duration=120
 *
 *   # Extreme scale test
 *   bun src/scripts/test-redis-load.ts --events=10000 --instances=20
 *
 *   # Quick smoke test
 *   bun src/scripts/test-redis-load.ts --events=100 --instances=3 --duration=10
 */

import { RedisEventBridge } from '@/modules/market-data/websocket/redis-event-bridge';
import type { Ticker, Trade } from '@/modules/market-data/websocket/types';

// Parse command line arguments
const args = process.argv.slice(2);
const targetEventsPerSecond = parseInt(
  args.find((arg) => arg.startsWith('--events='))?.split('=')[1] || '1000'
);
const instanceCount = parseInt(args.find((arg) => arg.startsWith('--instances='))?.split('=')[1] || '5');
const testDuration = parseInt(args.find((arg) => arg.startsWith('--duration='))?.split('=')[1] || '60') * 1000;
const warmupTime = 5000; // 5 second warmup
const verbose = args.includes('--verbose');

interface InstanceMetrics {
  instanceId: number;
  connected: boolean;
  published: number;
  received: number;
  selfReceived: number;
  latencies: number[];
  errors: number;
  lastPublishTime: number;
  lastReceiveTime: number;
}

interface ResourceMetrics {
  timestamp: number;
  memoryUsed: number;
  memoryTotal: number;
  cpuUsage: number;
  eventRate: number;
  deliveryRate: number;
}

class RedisLoadTester {
  private bridges: RedisEventBridge[] = [];
  private metrics: Map<number, InstanceMetrics> = new Map();
  private resourceMetrics: ResourceMetrics[] = [];
  private publishedMessages: Map<string, { timestamp: number; sourceInstance: number }> = new Map();
  private testStartTime: number = 0;
  private isRunning: boolean = false;
  private publishedCount: number = 0;
  private receivedCount: number = 0;
  private publishInterval: Timer | null = null;
  private metricsInterval: Timer | null = null;

  async initialize(count: number): Promise<void> {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Redis Pub/Sub Load Testing`);
    console.log(`${'='.repeat(70)}`);
    console.log(`Configuration:`);
    console.log(`  Target Events/Second: ${targetEventsPerSecond}`);
    console.log(`  Instances: ${count}`);
    console.log(`  Duration: ${testDuration / 1000}s`);
    console.log(`  Warmup: ${warmupTime / 1000}s`);
    console.log(`  Verbose: ${verbose ? 'Yes' : 'No'}`);
    console.log(`${'='.repeat(70)}\n`);

    console.log(`Initializing ${count} instances...`);

    // Create and initialize instances
    for (let i = 0; i < count; i++) {
      const bridge = new RedisEventBridge({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        keyPrefix: 'ws:load:',
        instanceId: `load-test-${i}`,
        enablePublishing: true,
        enableSubscription: true,
        reconnection: {
          maxRetries: 5,
          retryDelay: 1000,
        },
      });

      // Initialize metrics
      this.metrics.set(i, {
        instanceId: i,
        connected: false,
        published: 0,
        received: 0,
        selfReceived: 0,
        latencies: [],
        errors: 0,
        lastPublishTime: 0,
        lastReceiveTime: 0,
      });

      // Setup event listeners
      this.setupEventListeners(bridge, i);

      this.bridges.push(bridge);
    }

    // Connect all instances
    await Promise.all(
      this.bridges.map(async (bridge, i) => {
        try {
          await bridge.connect();
          await bridge.subscribeAll();
          const metrics = this.metrics.get(i)!;
          metrics.connected = true;
          console.log(`✓ Instance ${i} connected`);
        } catch (error) {
          console.error(`✗ Instance ${i} failed to connect:`, error);
          const metrics = this.metrics.get(i)!;
          metrics.errors++;
        }
      })
    );

    console.log(`\n✓ All instances initialized\n`);
  }

  private setupEventListeners(bridge: RedisEventBridge, instanceId: number): void {
    // Ticker events
    bridge.on('ticker', (data: Ticker) => {
      this.handleReceivedEvent('ticker', data, instanceId);
    });

    // Trade events
    bridge.on('trade', (data: Trade) => {
      this.handleReceivedEvent('trade', data, instanceId);
    });

    // Error events
    bridge.on('error', (error: Error) => {
      const metrics = this.metrics.get(instanceId)!;
      metrics.errors++;
      if (verbose) {
        console.error(`✗ Instance ${instanceId} error:`, error.message);
      }
    });
  }

  private handleReceivedEvent(type: string, data: any, instanceId: number): void {
    const metrics = this.metrics.get(instanceId)!;
    metrics.received++;
    this.receivedCount++;
    metrics.lastReceiveTime = Date.now();

    // Build message key based on event type
    const messageKey =
      type === 'ticker'
        ? `ticker:${data.symbol}:${data.last}`
        : `trade:${data.symbol}:${data.price}:${data.amount}`;

    const publishInfo = this.publishedMessages.get(messageKey);

    if (publishInfo && publishInfo.sourceInstance === instanceId) {
      metrics.selfReceived++;
      if (verbose) {
        console.error(`⚠️  Instance ${instanceId} received its OWN ${type} event!`);
      }
    } else if (publishInfo) {
      // Calculate latency
      const latency = Date.now() - publishInfo.timestamp;
      metrics.latencies.push(latency);

      if (verbose && metrics.received % 1000 === 0) {
        console.log(`Instance ${instanceId}: Received ${metrics.received} events (avg latency: ${this.calculateAvgLatency(metrics.latencies).toFixed(2)}ms)`);
      }
    }
  }

  async runLoadTest(): Promise<void> {
    console.log(`Starting warmup phase (${warmupTime / 1000}s)...`);
    this.isRunning = true;
    this.testStartTime = Date.now();

    // Calculate publish interval to achieve target rate
    const eventsPerInterval = Math.max(1, Math.floor(targetEventsPerSecond / 100)); // 10ms intervals
    const publishIntervalMs = Math.floor(1000 / (targetEventsPerSecond / eventsPerInterval));

    console.log(`Publishing ${eventsPerInterval} events every ${publishIntervalMs}ms`);
    console.log(`Expected rate: ${((eventsPerInterval / publishIntervalMs) * 1000).toFixed(0)} events/second\n`);

    // Start resource monitoring
    this.startResourceMonitoring();

    // Start publishing events
    this.publishInterval = setInterval(() => {
      if (!this.isRunning) return;

      for (let i = 0; i < eventsPerInterval; i++) {
        this.publishEvent();
      }
    }, publishIntervalMs);

    // Warmup period
    await new Promise((resolve) => setTimeout(resolve, warmupTime));
    console.log(`✓ Warmup complete, starting load test...\n`);

    // Run for test duration
    const testStart = Date.now();
    while (Date.now() - testStart < testDuration) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Print progress every 10 seconds
      if ((Date.now() - testStart) % 10000 < 1000) {
        this.printProgress();
      }
    }

    // Stop publishing
    this.isRunning = false;
    if (this.publishInterval) {
      clearInterval(this.publishInterval);
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    console.log(`\n✓ Load test complete, waiting for final events to propagate...`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  private publishEvent(): void {
    // Randomly select instance to publish from
    const instanceId = Math.floor(Math.random() * this.bridges.length);
    const bridge = this.bridges[instanceId];
    const metrics = this.metrics.get(instanceId)!;

    if (!metrics.connected) return;

    // Randomly publish ticker or trade (70% ticker, 30% trade)
    if (Math.random() > 0.3) {
      this.publishTicker(bridge, instanceId);
    } else {
      this.publishTrade(bridge, instanceId);
    }
  }

  private publishTicker(bridge: RedisEventBridge, instanceId: number): void {
    const ticker: Ticker = {
      exchange: 'binance',
      symbol: 'BTC/USDT',
      timestamp: Date.now(),
      last: 100000 + Math.random() * 10000,
      bid: 99900,
      ask: 100100,
      high24h: 110000,
      low24h: 95000,
      volume24h: 1000000,
      change24h: 5.5,
    };

    const messageKey = `ticker:${ticker.symbol}:${ticker.last}`;
    this.publishedMessages.set(messageKey, {
      timestamp: Date.now(),
      sourceInstance: instanceId,
    });

    bridge.publish({ type: 'ticker', data: ticker }).catch((error) => {
      const metrics = this.metrics.get(instanceId)!;
      metrics.errors++;
      if (verbose) {
        console.error(`Failed to publish ticker from instance ${instanceId}:`, error);
      }
    });

    const metrics = this.metrics.get(instanceId)!;
    metrics.published++;
    metrics.lastPublishTime = Date.now();
    this.publishedCount++;
  }

  private publishTrade(bridge: RedisEventBridge, instanceId: number): void {
    const trade: Trade = {
      id: `trade-${Date.now()}-${Math.random()}`,
      exchange: 'binance',
      symbol: 'BTC/USDT',
      timestamp: Date.now(),
      side: Math.random() > 0.5 ? 'buy' : 'sell',
      price: 100000 + Math.random() * 10000,
      amount: Math.random() * 10,
      takerOrMaker: Math.random() > 0.5 ? 'taker' : 'maker',
    };

    const messageKey = `trade:${trade.symbol}:${trade.price}:${trade.amount}`;
    this.publishedMessages.set(messageKey, {
      timestamp: Date.now(),
      sourceInstance: instanceId,
    });

    bridge.publish({ type: 'trade', data: trade }).catch((error) => {
      const metrics = this.metrics.get(instanceId)!;
      metrics.errors++;
      if (verbose) {
        console.error(`Failed to publish trade from instance ${instanceId}:`, error);
      }
    });

    const metrics = this.metrics.get(instanceId)!;
    metrics.published++;
    metrics.lastPublishTime = Date.now();
    this.publishedCount++;
  }

  private startResourceMonitoring(): void {
    this.metricsInterval = setInterval(() => {
      const memUsage = process.memoryUsage();

      this.resourceMetrics.push({
        timestamp: Date.now(),
        memoryUsed: memUsage.heapUsed,
        memoryTotal: memUsage.heapTotal,
        cpuUsage: process.cpuUsage().user / 1000, // Convert to ms
        eventRate: this.publishedCount,
        deliveryRate: this.receivedCount,
      });

      // Keep only last 100 samples (10 seconds at 100ms intervals)
      if (this.resourceMetrics.length > 100) {
        this.resourceMetrics.shift();
      }
    }, 100); // Sample every 100ms
  }

  private printProgress(): void {
    const elapsed = (Date.now() - this.testStartTime - warmupTime) / 1000;
    const actualPublishRate = this.publishedCount / elapsed;
    const actualDeliveryRate = this.receivedCount / elapsed;

    console.log(`[${elapsed.toFixed(0)}s] Published: ${this.publishedCount} (${actualPublishRate.toFixed(0)}/s) | Delivered: ${this.receivedCount} (${actualDeliveryRate.toFixed(0)}/s)`);
  }

  async cleanup(): Promise<void> {
    console.log(`\nDisconnecting all instances...`);
    await Promise.all(
      this.bridges.map(async (bridge, i) => {
        try {
          await bridge.disconnect();
          console.log(`✓ Instance ${i} disconnected`);
        } catch (error) {
          console.error(`✗ Instance ${i} failed to disconnect:`, error);
        }
      })
    );
  }

  printReport(): void {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Load Test Results`);
    console.log(`${'='.repeat(70)}\n`);

    // Calculate overall statistics
    let totalPublished = 0;
    let totalReceived = 0;
    let totalSelfReceived = 0;
    let totalErrors = 0;
    const allLatencies: number[] = [];

    this.metrics.forEach((metrics) => {
      totalPublished += metrics.published;
      totalReceived += metrics.received;
      totalSelfReceived += metrics.selfReceived;
      totalErrors += metrics.errors;
      allLatencies.push(...metrics.latencies);
    });

    const testDurationSeconds = testDuration / 1000;
    const actualPublishRate = totalPublished / testDurationSeconds;
    const actualDeliveryRate = totalReceived / testDurationSeconds;
    const expectedReceived = totalPublished * (this.bridges.length - 1);
    const deliveryRatePercent = (totalReceived / expectedReceived) * 100;

    // Overall Statistics
    console.log(`Overall Statistics:`);
    console.log(`  Test Duration: ${testDurationSeconds}s`);
    console.log(`  Total Instances: ${this.bridges.length}`);
    console.log(`  Events Published: ${totalPublished.toLocaleString()}`);
    console.log(`  Events Received: ${totalReceived.toLocaleString()}`);
    console.log(`  Expected Received: ${expectedReceived.toLocaleString()}`);
    console.log(`  Delivery Rate: ${deliveryRatePercent.toFixed(2)}% ${deliveryRatePercent > 95 ? '✓' : '✗'}`);
    console.log(`  Self-Received: ${totalSelfReceived} ${totalSelfReceived === 0 ? '✓' : '✗ FAIL'}`);
    console.log(`  Total Errors: ${totalErrors} ${totalErrors === 0 ? '✓' : '⚠️'}\n`);

    // Throughput Statistics
    console.log(`Throughput Statistics:`);
    console.log(`  Target Publish Rate: ${targetEventsPerSecond.toLocaleString()}/s`);
    console.log(`  Actual Publish Rate: ${actualPublishRate.toFixed(0)}/s (${((actualPublishRate / targetEventsPerSecond) * 100).toFixed(1)}% of target)`);
    console.log(`  Actual Delivery Rate: ${actualDeliveryRate.toFixed(0)}/s`);
    console.log(`  Amplification Factor: ${(actualDeliveryRate / actualPublishRate).toFixed(1)}x\n`);

    // Latency Statistics
    if (allLatencies.length > 0) {
      const sorted = allLatencies.sort((a, b) => a - b);
      const avg = allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length;
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];

      console.log(`Latency Statistics:`);
      console.log(`  Samples: ${allLatencies.length.toLocaleString()}`);
      console.log(`  Average: ${avg.toFixed(2)}ms`);
      console.log(`  Min: ${min}ms`);
      console.log(`  Max: ${max}ms`);
      console.log(`  P50 (Median): ${p50}ms`);
      console.log(`  P95: ${p95}ms ${p95 < 100 ? '✓' : '⚠️'}`);
      console.log(`  P99: ${p99}ms ${p99 < 200 ? '✓' : '⚠️'}\n`);
    }

    // Resource Usage
    if (this.resourceMetrics.length > 0) {
      const avgMemory =
        this.resourceMetrics.reduce((sum, m) => sum + m.memoryUsed, 0) / this.resourceMetrics.length;
      const maxMemory = Math.max(...this.resourceMetrics.map((m) => m.memoryUsed));

      console.log(`Resource Usage:`);
      console.log(`  Avg Memory: ${(avgMemory / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Max Memory: ${(maxMemory / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Memory per Instance: ${((avgMemory / this.bridges.length) / 1024 / 1024).toFixed(2)} MB\n`);
    }

    // Per-Instance Statistics
    console.log(`Per-Instance Statistics:\n`);
    this.metrics.forEach((metrics, instanceId) => {
      const avgLatency =
        metrics.latencies.length > 0
          ? metrics.latencies.reduce((a, b) => a + b, 0) / metrics.latencies.length
          : 0;

      console.log(`Instance ${instanceId}:`);
      console.log(`  Connected: ${metrics.connected ? 'Yes' : 'No'}`);
      console.log(`  Published: ${metrics.published.toLocaleString()}`);
      console.log(`  Received: ${metrics.received.toLocaleString()}`);
      console.log(`  Self-Received: ${metrics.selfReceived} ${metrics.selfReceived === 0 ? '✓' : '✗'}`);
      console.log(`  Avg Latency: ${avgLatency.toFixed(2)}ms`);
      console.log(`  Errors: ${metrics.errors}\n`);
    });

    // Test Verdict
    console.log(`${'─'.repeat(70)}\n`);

    const allConnected = Array.from(this.metrics.values()).every((m) => m.connected);
    const noSelfReceived = totalSelfReceived === 0;
    const goodDeliveryRate = deliveryRatePercent > 95;
    const noErrors = totalErrors === 0;
    const targetMet = actualPublishRate >= targetEventsPerSecond * 0.9; // Within 90% of target

    const avgLatency = allLatencies.length > 0
      ? allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length
      : 0;
    const lowLatency = avgLatency < 100;

    console.log(`Test Verdict:\n`);
    console.log(`  ${allConnected ? '✓' : '✗'} All instances connected`);
    console.log(`  ${noSelfReceived ? '✓' : '✗'} No self-received events`);
    console.log(`  ${goodDeliveryRate ? '✓' : '✗'} Delivery rate >95%`);
    console.log(`  ${noErrors ? '✓' : '⚠️'} No errors`);
    console.log(`  ${targetMet ? '✓' : '⚠️'} Target throughput met (>90%)`);
    console.log(`  ${lowLatency ? '✓' : '⚠️'} Average latency <100ms`);

    const allTestsPassed =
      allConnected && noSelfReceived && goodDeliveryRate && noErrors && targetMet && lowLatency;

    console.log(`\n${allTestsPassed ? '✓' : '✗'} Overall Status: ${allTestsPassed ? 'PASS' : 'FAIL'}\n`);
    console.log(`${'='.repeat(70)}\n`);
  }

  private calculateAvgLatency(latencies: number[]): number {
    if (latencies.length === 0) return 0;
    return latencies.reduce((a, b) => a + b, 0) / latencies.length;
  }
}

async function main() {
  const tester = new RedisLoadTester();

  try {
    // Initialize instances
    await tester.initialize(instanceCount);

    // Run load test
    await tester.runLoadTest();

    // Print results
    tester.printReport();

    // Cleanup
    await tester.cleanup();

    process.exit(0);
  } catch (error) {
    console.error('Load test failed with error:', error);
    await tester.cleanup();
    process.exit(1);
  }
}

main();
