#!/usr/bin/env bun
/**
 * Test Coinbase adapter directly
 */

import { CoinbaseAdapter } from '@/modules/market-data/websocket/adapters/coinbase-adapter';

const adapter = new CoinbaseAdapter({
  url: 'wss://ws-feed.exchange.coinbase.com',
  timeout: 30000,
  pingInterval: 30000,
  pongTimeout: 10000,
  reconnection: {
    enabled: true,
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  },
});

let tickerCount = 0;
let tradeCount = 0;

adapter.on('connected', (data) => {
  console.log('✓ Connected:', data);
});

adapter.on('disconnected', (data) => {
  console.log('✗ Disconnected:', data);
});

adapter.on('error', (error) => {
  console.error('✗ Error:', error);
});

adapter.on('ticker', (ticker) => {
  tickerCount++;
  console.log(`✓ TICKER #${tickerCount}:`, {
    symbol: ticker.symbol,
    price: ticker.last,
    bid: ticker.bid,
    ask: ticker.ask,
    volume24h: ticker.volume24h,
  });
});

adapter.on('trade', (trade) => {
  tradeCount++;
  if (tradeCount <= 5) { // Only show first 5 trades
    console.log(`✓ TRADE #${tradeCount}:`, {
      symbol: trade.symbol,
      side: trade.side,
      price: trade.price,
      amount: trade.amount,
    });
  }
});

async function test() {
  try {
    console.log('Connecting to Coinbase...');
    await adapter.connect();

    console.log('Subscribing to ticker...');
    await adapter.subscribe({
      channel: 'ticker',
      symbol: 'BTC/USD', // Use USD for Coinbase (not USDT)
    });

    console.log('Subscribing to trades...');
    await adapter.subscribe({
      channel: 'trades',
      symbol: 'BTC/USD',
    });

    console.log('Waiting for events...\n');
    await new Promise((resolve) => setTimeout(resolve, 10000));

    console.log(`\n✓ Summary: ${tickerCount} tickers, ${tradeCount} trades received`);

    console.log('\nDisconnecting...');
    await adapter.disconnect();

    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

test();
