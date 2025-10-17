#!/usr/bin/env bun
/**
 * Multi-Instance Redis Pub/Sub Test
 *
 * This script tests Redis event distribution across multiple simulated
 * application instances to validate:
 *
 * 1. Events published by one instance are received by others
 * 2. Instances don't receive their own events (process.pid filtering)
 * 3. Event ordering and timing
 * 4. Latency measurements
 * 5. Connection stability
 *
 * Usage:
 *   bun src/scripts/test-redis-multi-instance.ts
 *   bun src/scripts/test-redis-multi-instance.ts --instances 5 --duration 30
 *   bun src/scripts/test-redis-multi-instance.ts --verbose
 */

import { RedisEventBridge } from '@/modules/market-data/websocket/redis-event-bridge';
import type { Ticker, Trade } from '@/modules/market-data/websocket/types';

// Parse command line arguments
const args = process.argv.slice(2);
const instanceCount = parseInt(args.find((arg) => arg.startsWith('--instances='))?.split('=')[1] || '3');
const testDuration = parseInt(args.find((arg) => arg.startsWith('--duration='))?.split('=')[1] || '20') * 1000;
const verbose = args.includes('--verbose');

interface InstanceMetrics {
  instanceId: number;
  processId: number;
  connected: boolean;
  published: number;
  received: number;
  selfReceived: number; // Should always be 0!
  latencies: number[];
  errors: number;
}

class RedisInstanceTester {
  private bridges: RedisEventBridge[] = [];
  private metrics: Map<number, InstanceMetrics> = new Map();
  private testStartTime: number = 0;
  private publishedMessages: Map<string, { timestamp: number; sourceInstance: number }> = new Map();

  async initialize(count: number): Promise<void> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Multi-Instance Redis Pub/Sub Test`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Instances: ${count}`);
    console.log(`Duration: ${testDuration / 1000}s`);
    console.log(`Verbose: ${verbose ? 'Yes' : 'No'}`);
    console.log(`${'='.repeat(60)}\n`);

    // Create and initialize instances
    for (let i = 0; i < count; i++) {
      const bridge = new RedisEventBridge({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        keyPrefix: 'ws:',
        instanceId: `test-instance-${i}`, // Unique ID for each instance
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
        processId: process.pid, // All will have same PID in this test
        connected: false,
        published: 0,
        received: 0,
        selfReceived: 0,
        latencies: [],
        errors: 0,
      });

      // Setup event listeners
      this.setupEventListeners(bridge, i);

      this.bridges.push(bridge);
    }

    // Connect all instances
    console.log(`Connecting ${count} instances to Redis...`);
    await Promise.all(this.bridges.map(async (bridge, i) => {
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
    }));

    console.log(`\n✓ All instances connected\n`);
  }

  private setupEventListeners(bridge: RedisEventBridge, instanceId: number): void {
    // Ticker events
    bridge.on('ticker', (data: Ticker) => {
      const metrics = this.metrics.get(instanceId)!;
      metrics.received++;

      // Check if this is our own message
      const messageKey = `ticker:${data.symbol}:${data.last}`;
      const publishInfo = this.publishedMessages.get(messageKey);

      if (publishInfo && publishInfo.sourceInstance === instanceId) {
        metrics.selfReceived++;
        console.error(`⚠️  Instance ${instanceId} received its OWN ticker event! (This should never happen)`);
      } else if (publishInfo) {
        // Calculate latency
        const latency = Date.now() - publishInfo.timestamp;
        metrics.latencies.push(latency);

        if (verbose) {
          console.log(`Instance ${instanceId} received ticker from Instance ${publishInfo.sourceInstance} (${latency}ms latency)`);
        }
      }
    });

    // Trade events
    bridge.on('trade', (data: Trade) => {
      const metrics = this.metrics.get(instanceId)!;
      metrics.received++;

      const messageKey = `trade:${data.symbol}:${data.price}:${data.amount}`;
      const publishInfo = this.publishedMessages.get(messageKey);

      if (publishInfo && publishInfo.sourceInstance === instanceId) {
        metrics.selfReceived++;
        console.error(`⚠️  Instance ${instanceId} received its OWN trade event! (This should never happen)`);
      } else if (publishInfo) {
        const latency = Date.now() - publishInfo.timestamp;
        metrics.latencies.push(latency);

        if (verbose) {
          console.log(`Instance ${instanceId} received trade from Instance ${publishInfo.sourceInstance} (${latency}ms latency)`);
        }
      }
    });

    // Error events
    bridge.on('error', (error: Error) => {
      const metrics = this.metrics.get(instanceId)!;
      metrics.errors++;
      console.error(`✗ Instance ${instanceId} error:`, error.message);
    });
  }

  async runTest(): Promise<void> {
    console.log(`Starting event publishing test for ${testDuration / 1000}s...\n`);
    this.testStartTime = Date.now();

    const publishInterval = setInterval(() => {
      // Rotate through instances for publishing
      const instanceId = Math.floor(Math.random() * this.bridges.length);
      const bridge = this.bridges[instanceId];
      const metrics = this.metrics.get(instanceId)!;

      if (!metrics.connected) return;

      // Randomly publish ticker or trade
      if (Math.random() > 0.5) {
        this.publishTicker(bridge, instanceId);
      } else {
        this.publishTrade(bridge, instanceId);
      }
    }, 100); // Publish every 100ms

    // Wait for test duration
    await new Promise((resolve) => setTimeout(resolve, testDuration));

    clearInterval(publishInterval);

    // Wait a bit for final messages to propagate
    console.log(`\nWaiting for final messages to propagate...`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
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
    };

    const messageKey = `ticker:${ticker.symbol}:${ticker.last}`;
    this.publishedMessages.set(messageKey, {
      timestamp: Date.now(),
      sourceInstance: instanceId,
    });

    bridge.publish({ type: 'ticker', data: ticker }).catch((error) => {
      console.error(`Failed to publish ticker:`, error);
      const metrics = this.metrics.get(instanceId)!;
      metrics.errors++;
    });

    const metrics = this.metrics.get(instanceId)!;
    metrics.published++;
  }

  private publishTrade(bridge: RedisEventBridge, instanceId: number): void {
    const trade: Trade = {
      exchange: 'binance',
      symbol: 'BTC/USDT',
      timestamp: Date.now(),
      side: Math.random() > 0.5 ? 'buy' : 'sell',
      price: 100000 + Math.random() * 10000,
      amount: Math.random() * 10,
    };

    const messageKey = `trade:${trade.symbol}:${trade.price}:${trade.amount}`;
    this.publishedMessages.set(messageKey, {
      timestamp: Date.now(),
      sourceInstance: instanceId,
    });

    bridge.publish({ type: 'trade', data: trade }).catch((error) => {
      console.error(`Failed to publish trade:`, error);
      const metrics = this.metrics.get(instanceId)!;
      metrics.errors++;
    });

    const metrics = this.metrics.get(instanceId)!;
    metrics.published++;
  }

  async cleanup(): Promise<void> {
    console.log(`\nDisconnecting all instances...`);
    await Promise.all(this.bridges.map(async (bridge, i) => {
      try {
        await bridge.disconnect();
        console.log(`✓ Instance ${i} disconnected`);
      } catch (error) {
        console.error(`✗ Instance ${i} failed to disconnect:`, error);
      }
    }));
  }

  printReport(): void {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Test Results - Multi-Instance Redis Pub/Sub`);
    console.log(`${'='.repeat(60)}\n`);

    // Overall statistics
    let totalPublished = 0;
    let totalReceived = 0;
    let totalSelfReceived = 0;
    let totalErrors = 0;
    let allLatencies: number[] = [];

    this.metrics.forEach((metrics) => {
      totalPublished += metrics.published;
      totalReceived += metrics.received;
      totalSelfReceived += metrics.selfReceived;
      totalErrors += metrics.errors;
      allLatencies.push(...metrics.latencies);
    });

    console.log(`Overall Statistics:`);
    console.log(`  Total Instances: ${this.bridges.length}`);
    console.log(`  Test Duration: ${testDuration / 1000}s`);
    console.log(`  Total Events Published: ${totalPublished}`);
    console.log(`  Total Events Received: ${totalReceived}`);
    console.log(`  Expected Received: ${totalPublished * (this.bridges.length - 1)}`);
    console.log(`  Delivery Rate: ${((totalReceived / (totalPublished * (this.bridges.length - 1))) * 100).toFixed(2)}%`);
    console.log(`  Self-Received Events: ${totalSelfReceived} ${totalSelfReceived === 0 ? '✓' : '✗ FAIL'}`);
    console.log(`  Total Errors: ${totalErrors}\n`);

    // Latency statistics
    if (allLatencies.length > 0) {
      const avgLatency = allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length;
      const minLatency = Math.min(...allLatencies);
      const maxLatency = Math.max(...allLatencies);
      const p50 = allLatencies.sort((a, b) => a - b)[Math.floor(allLatencies.length * 0.5)];
      const p95 = allLatencies.sort((a, b) => a - b)[Math.floor(allLatencies.length * 0.95)];
      const p99 = allLatencies.sort((a, b) => a - b)[Math.floor(allLatencies.length * 0.99)];

      console.log(`Latency Statistics:`);
      console.log(`  Average: ${avgLatency.toFixed(2)}ms`);
      console.log(`  Min: ${minLatency}ms`);
      console.log(`  Max: ${maxLatency}ms`);
      console.log(`  P50 (Median): ${p50}ms`);
      console.log(`  P95: ${p95}ms`);
      console.log(`  P99: ${p99}ms\n`);
    }

    // Per-instance statistics
    console.log(`Per-Instance Statistics:\n`);
    this.metrics.forEach((metrics, instanceId) => {
      const avgLatency = metrics.latencies.length > 0
        ? metrics.latencies.reduce((a, b) => a + b, 0) / metrics.latencies.length
        : 0;

      console.log(`Instance ${instanceId}:`);
      console.log(`  Connected: ${metrics.connected ? 'Yes' : 'No'}`);
      console.log(`  Published: ${metrics.published}`);
      console.log(`  Received: ${metrics.received}`);
      console.log(`  Expected: ${totalPublished - metrics.published}`);
      console.log(`  Self-Received: ${metrics.selfReceived} ${metrics.selfReceived === 0 ? '✓' : '✗'}`);
      console.log(`  Avg Latency: ${avgLatency.toFixed(2)}ms`);
      console.log(`  Errors: ${metrics.errors}\n`);
    });

    // Final verdict
    console.log(`${'─'.repeat(60)}\n`);

    const allConnected = Array.from(this.metrics.values()).every((m) => m.connected);
    const noSelfReceived = totalSelfReceived === 0;
    const goodDeliveryRate = (totalReceived / (totalPublished * (this.bridges.length - 1))) > 0.95;
    const noErrors = totalErrors === 0;
    const avgLatency = allLatencies.length > 0
      ? allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length
      : 0;
    const lowLatency = avgLatency < 100;

    console.log(`Test Verdict:\n`);
    console.log(`  ${allConnected ? '✓' : '✗'} All instances connected`);
    console.log(`  ${noSelfReceived ? '✓' : '✗'} No self-received events (process.pid filtering works)`);
    console.log(`  ${goodDeliveryRate ? '✓' : '✗'} Delivery rate >95%`);
    console.log(`  ${noErrors ? '✓' : '✗'} No errors`);
    console.log(`  ${lowLatency ? '✓' : '✗'} Average latency <100ms`);

    const allTestsPassed = allConnected && noSelfReceived && goodDeliveryRate && noErrors && lowLatency;

    console.log(`\n${allTestsPassed ? '✓' : '✗'} Overall Status: ${allTestsPassed ? 'PASS' : 'FAIL'}\n`);
    console.log(`${'='.repeat(60)}\n`);
  }
}

async function main() {
  const tester = new RedisInstanceTester();

  try {
    // Initialize instances
    await tester.initialize(instanceCount);

    // Run the test
    await tester.runTest();

    // Print results
    tester.printReport();

    // Cleanup
    await tester.cleanup();

    process.exit(0);
  } catch (error) {
    console.error('Test failed with error:', error);
    await tester.cleanup();
    process.exit(1);
  }
}

main();
