#!/usr/bin/env bun
/**
 * Exchange WebSocket Testing Utility
 *
 * Tests WebSocket connections to real exchanges (testnet/mainnet)
 * Verifies event reception, measures latency, and validates Redis integration
 *
 * Usage:
 *   bun run src/scripts/test-exchange-websockets.ts [options]
 *
 * Options:
 *   --exchange <name>    Test specific exchange (binance, coinbase, kraken)
 *   --all                Test all exchanges
 *   --symbol <symbol>    Symbol to test (default: BTC/USDT)
 *   --duration <seconds> Test duration (default: 30)
 *   --redis              Enable Redis testing
 *   --verbose            Verbose output
 */

import { MarketDataWebSocketManager } from '@/modules/market-data/websocket';
import type { ExchangeId, Ticker, Trade, OrderBook } from '@/modules/market-data/websocket/types';
import logger from '@/utils/logger';

// Test configuration
interface TestConfig {
  exchange: ExchangeId;
  symbol: string;
  duration: number; // seconds
  enableRedis: boolean;
  verbose: boolean;
}

// Test results
interface ExchangeTestResult {
  exchange: ExchangeId;
  symbol: string;
  duration: number;
  success: boolean;
  error?: string;
  metrics: {
    connected: boolean;
    tickersReceived: number;
    tradesReceived: number;
    orderbooksReceived: number;
    firstEventTime?: number;
    lastEventTime?: number;
    averageLatency?: number;
    minLatency?: number;
    maxLatency?: number;
  };
  redisMetrics?: {
    enabled: boolean;
    publishedEvents: number;
    receivedEvents: number;
    errors: number;
  };
}

// Exchange configurations
const EXCHANGE_CONFIGS = {
  binance: {
    mainnet: 'wss://stream.binance.com:9443/ws',
    testnet: 'wss://testnet.binance.vision/ws',
    defaultSymbol: 'BTC/USDT',
  },
  coinbase: {
    mainnet: 'wss://ws-feed.exchange.coinbase.com',
    sandbox: 'wss://ws-feed-public.sandbox.exchange.coinbase.com',
    defaultSymbol: 'BTC-USD',
  },
  kraken: {
    mainnet: 'wss://ws.kraken.com',
    beta: 'wss://ws-auth.kraken.com',
    defaultSymbol: 'XBT/USD',
  },
};

/**
 * Test single exchange
 */
async function testExchange(config: TestConfig): Promise<ExchangeTestResult> {
  const startTime = Date.now();
  const result: ExchangeTestResult = {
    exchange: config.exchange,
    symbol: config.symbol,
    duration: config.duration,
    success: false,
    metrics: {
      connected: false,
      tickersReceived: 0,
      tradesReceived: 0,
      orderbooksReceived: 0,
    },
  };

  const latencies: number[] = [];

  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing ${config.exchange.toUpperCase()} - ${config.symbol}`);
    console.log(`Duration: ${config.duration}s | Redis: ${config.enableRedis ? 'Enabled' : 'Disabled'}`);
    console.log('='.repeat(60));

    // Create manager
    const manager = new MarketDataWebSocketManager({
      enableRedis: config.enableRedis,
      redis: config.enableRedis ? {
        host: 'localhost',
        port: 6379,
        keyPrefix: 'test:ws:',
        enablePublishing: true,
        enableSubscription: true,
      } : undefined,
    });

    // Set up event listeners
    manager.on('ticker', (ticker: Ticker) => {
      result.metrics.tickersReceived++;
      const latency = Date.now() - ticker.timestamp;
      latencies.push(latency);

      if (!result.metrics.firstEventTime) {
        result.metrics.firstEventTime = Date.now();
        console.log(`✓ First ticker received in ${Date.now() - startTime}ms`);
      }
      result.metrics.lastEventTime = Date.now();

      if (config.verbose) {
        console.log(`  TICKER: ${ticker.symbol} | Price: ${ticker.last} | Latency: ${latency}ms`);
      }
    });

    manager.on('trade', (trade: Trade) => {
      result.metrics.tradesReceived++;
      const latency = Date.now() - trade.timestamp;
      latencies.push(latency);

      if (!result.metrics.firstEventTime) {
        result.metrics.firstEventTime = Date.now();
        console.log(`✓ First trade received in ${Date.now() - startTime}ms`);
      }
      result.metrics.lastEventTime = Date.now();

      if (config.verbose) {
        console.log(`  TRADE: ${trade.symbol} | ${trade.side} | Price: ${trade.price} | Amount: ${trade.amount}`);
      }
    });

    manager.on('orderbook', (orderbook: OrderBook) => {
      result.metrics.orderbooksReceived++;
      const latency = Date.now() - orderbook.timestamp;
      latencies.push(latency);

      if (!result.metrics.firstEventTime) {
        result.metrics.firstEventTime = Date.now();
        console.log(`✓ First orderbook received in ${Date.now() - startTime}ms`);
      }
      result.metrics.lastEventTime = Date.now();

      if (config.verbose) {
        console.log(`  ORDERBOOK: ${orderbook.symbol} | Bids: ${orderbook.bids.length} | Asks: ${orderbook.asks.length}`);
      }
    });

    manager.on('exchange:connected', (data) => {
      console.log(`✓ Connected to ${data.exchange}`);
      result.metrics.connected = true;
    });

    manager.on('exchange:disconnected', (data) => {
      console.log(`✗ Disconnected from ${data.exchange}`);
      result.metrics.connected = false;
    });

    manager.on('exchange:error', (error) => {
      console.error(`✗ Exchange error:`, error.message);
    });

    // Connect to exchange
    const exchangeConfig = EXCHANGE_CONFIGS[config.exchange as keyof typeof EXCHANGE_CONFIGS];
    if (!exchangeConfig) {
      throw new Error(`Exchange ${config.exchange} not configured`);
    }
    const wsUrl = exchangeConfig.mainnet; // Use mainnet for real testing

    console.log(`\nConnecting to ${config.exchange}...`);
    await manager.connect(config.exchange, {
      url: wsUrl,
      timeout: 30000,
      pingInterval: 30000,
      pongTimeout: 10000,
      reconnection: {
        maxAttempts: 5,
        initialDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
        jitterFactor: 0.1,
      },
    });

    // Subscribe to channels
    console.log(`Subscribing to channels...`);

    // Subscribe to ticker
    try {
      await manager.subscribe({
        channel: 'ticker',
        symbol: config.symbol,
      });
      console.log(`✓ Subscribed to ticker`);
    } catch (error) {
      console.log(`⚠ Ticker subscription not available`);
    }

    // Subscribe to trades
    try {
      await manager.subscribe({
        channel: 'trades',
        symbol: config.symbol,
      });
      console.log(`✓ Subscribed to trades`);
    } catch (error) {
      console.log(`⚠ Trades subscription not available`);
    }

    // Subscribe to orderbook
    try {
      await manager.subscribe({
        channel: 'orderbook',
        symbol: config.symbol,
      });
      console.log(`✓ Subscribed to orderbook`);
    } catch (error) {
      console.log(`⚠ Orderbook subscription not available`);
    }

    // Wait for test duration
    console.log(`\nReceiving events for ${config.duration} seconds...`);
    if (!config.verbose) {
      console.log(`(Use --verbose to see individual events)`);
    }

    await new Promise((resolve) => setTimeout(resolve, config.duration * 1000));

    // Calculate latency statistics
    if (latencies.length > 0) {
      result.metrics.averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      result.metrics.minLatency = Math.min(...latencies);
      result.metrics.maxLatency = Math.max(...latencies);
    }

    // Get Redis metrics if enabled
    if (config.enableRedis) {
      const redisMetrics = manager.getRedisMetrics();
      if (redisMetrics) {
        result.redisMetrics = {
          enabled: redisMetrics.connected,
          publishedEvents: redisMetrics.publishedEvents,
          receivedEvents: redisMetrics.receivedEvents,
          errors: redisMetrics.errors,
        };
      }
    }

    // Disconnect
    console.log(`\nDisconnecting...`);
    await manager.disconnect(config.exchange);

    // Mark as success if we received any events
    const totalEvents = result.metrics.tickersReceived + result.metrics.tradesReceived + result.metrics.orderbooksReceived;
    result.success = totalEvents > 0;

    // Print results
    printTestResult(result);

    return result;

  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    console.error(`\n✗ Test failed:`, result.error);
    printTestResult(result);
    return result;
  }
}

/**
 * Print test result
 */
function printTestResult(result: ExchangeTestResult): void {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Test Results - ${result.exchange.toUpperCase()}`);
  console.log('─'.repeat(60));
  console.log(`Status: ${result.success ? '✓ SUCCESS' : '✗ FAILED'}`);

  if (result.error) {
    console.log(`Error: ${result.error}`);
  }

  console.log(`\nMetrics:`);
  console.log(`  Connected: ${result.metrics.connected ? 'Yes' : 'No'}`);
  console.log(`  Tickers Received: ${result.metrics.tickersReceived}`);
  console.log(`  Trades Received: ${result.metrics.tradesReceived}`);
  console.log(`  Orderbooks Received: ${result.metrics.orderbooksReceived}`);

  const totalEvents = result.metrics.tickersReceived + result.metrics.tradesReceived + result.metrics.orderbooksReceived;
  console.log(`  Total Events: ${totalEvents}`);

  if (totalEvents > 0) {
    const eventsPerSecond = totalEvents / result.duration;
    console.log(`  Events/Second: ${eventsPerSecond.toFixed(2)}`);
  }

  if (result.metrics.firstEventTime) {
    console.log(`  Time to First Event: ${result.metrics.firstEventTime - Date.now() + (result.duration * 1000)}ms`);
  }

  if (result.metrics.averageLatency !== undefined) {
    console.log(`\nLatency:`);
    console.log(`  Average: ${result.metrics.averageLatency.toFixed(2)}ms`);
    console.log(`  Min: ${result.metrics.minLatency}ms`);
    console.log(`  Max: ${result.metrics.maxLatency}ms`);
  }

  if (result.redisMetrics) {
    console.log(`\nRedis Metrics:`);
    console.log(`  Enabled: ${result.redisMetrics.enabled ? 'Yes' : 'No'}`);
    console.log(`  Published Events: ${result.redisMetrics.publishedEvents}`);
    console.log(`  Received Events: ${result.redisMetrics.receivedEvents}`);
    console.log(`  Errors: ${result.redisMetrics.errors}`);
  }

  console.log('─'.repeat(60));
}

/**
 * Print summary of all tests
 */
function printSummary(results: ExchangeTestResult[]): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST SUMMARY`);
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;

  console.log(`Total Tests: ${results.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);

  console.log(`\nResults by Exchange:`);
  for (const result of results) {
    const totalEvents = result.metrics.tickersReceived + result.metrics.tradesReceived + result.metrics.orderbooksReceived;
    const status = result.success ? '✓' : '✗';
    console.log(`  ${status} ${result.exchange.padEnd(10)} | ${totalEvents.toString().padStart(4)} events | ${result.metrics.averageLatency?.toFixed(0) || 'N/A'}ms avg latency`);
  }

  // Overall statistics
  const totalEvents = results.reduce((sum, r) =>
    sum + r.metrics.tickersReceived + r.metrics.tradesReceived + r.metrics.orderbooksReceived, 0
  );
  const avgLatency = results.reduce((sum, r) => sum + (r.metrics.averageLatency || 0), 0) / results.length;

  console.log(`\nOverall Statistics:`);
  console.log(`  Total Events Received: ${totalEvents}`);
  console.log(`  Average Latency: ${avgLatency.toFixed(2)}ms`);

  console.log('='.repeat(60));
}

/**
 * Parse command line arguments
 */
function parseArgs(): {
  exchanges: ExchangeId[];
  symbol?: string;
  duration: number;
  enableRedis: boolean;
  verbose: boolean;
} {
  const args = process.argv.slice(2);

  const exchanges: ExchangeId[] = [];
  let symbol: string | undefined;
  let duration = 30;
  let enableRedis = false;
  let verbose = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--exchange' && i + 1 < args.length) {
      exchanges.push(args[++i] as ExchangeId);
    } else if (arg === '--all') {
      exchanges.push('binance', 'coinbase', 'kraken');
    } else if (arg === '--symbol' && i + 1 < args.length) {
      symbol = args[++i];
    } else if (arg === '--duration' && i + 1 < args.length) {
      duration = parseInt(args[++i]);
    } else if (arg === '--redis') {
      enableRedis = true;
    } else if (arg === '--verbose') {
      verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Exchange WebSocket Testing Utility

Usage: bun run src/scripts/test-exchange-websockets.ts [options]

Options:
  --exchange <name>    Test specific exchange (binance, coinbase, kraken)
  --all                Test all exchanges
  --symbol <symbol>    Symbol to test (default: exchange-specific)
  --duration <seconds> Test duration in seconds (default: 30)
  --redis              Enable Redis testing
  --verbose            Show individual events
  --help, -h           Show this help message

Examples:
  # Test Binance for 30 seconds
  bun run src/scripts/test-exchange-websockets.ts --exchange binance

  # Test all exchanges with Redis
  bun run src/scripts/test-exchange-websockets.ts --all --redis

  # Test Coinbase with custom symbol and duration
  bun run src/scripts/test-exchange-websockets.ts --exchange coinbase --symbol ETH-USD --duration 60

  # Verbose output
  bun run src/scripts/test-exchange-websockets.ts --exchange binance --verbose
      `);
      process.exit(0);
    }
  }

  // Default to Binance if no exchange specified
  if (exchanges.length === 0) {
    exchanges.push('binance');
  }

  return { exchanges, symbol, duration, enableRedis, verbose };
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const { exchanges, symbol, duration, enableRedis, verbose } = parseArgs();

  console.log(`
╔════════════════════════════════════════════════════════════╗
║         Exchange WebSocket Testing Utility                 ║
╚════════════════════════════════════════════════════════════╝
  `);

  const results: ExchangeTestResult[] = [];

  for (const exchange of exchanges) {
    const exchangeConfig = EXCHANGE_CONFIGS[exchange as keyof typeof EXCHANGE_CONFIGS];
    if (!exchangeConfig) {
      console.error(`Exchange ${exchange} not configured, skipping...`);
      continue;
    }
    const testSymbol = symbol || exchangeConfig.defaultSymbol;

    const result = await testExchange({
      exchange,
      symbol: testSymbol,
      duration,
      enableRedis,
      verbose,
    });

    results.push(result);

    // Wait between tests
    if (exchanges.length > 1 && exchange !== exchanges[exchanges.length - 1]) {
      console.log(`\nWaiting 3 seconds before next test...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // Print summary if testing multiple exchanges
  if (results.length > 1) {
    printSummary(results);
  }

  // Exit with appropriate code
  const allSuccessful = results.every(r => r.success);
  process.exit(allSuccessful ? 0 : 1);
}

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
