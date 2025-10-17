#!/usr/bin/env bun
/**
 * Test single subscription via our adapter
 */

import { BinanceAdapter } from '@/modules/market-data/websocket/adapters/binance-adapter';

const adapter = new BinanceAdapter({
  url: 'wss://stream.binance.com:9443/ws',
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
  console.log('✓ TICKER:', {
    symbol: ticker.symbol,
    last: ticker.last,
    bid: ticker.bid,
    ask: ticker.ask,
  });
});

adapter.on('trade', (trade) => {
  console.log('✓ TRADE:', {
    symbol: trade.symbol,
    side: trade.side,
    price: trade.price,
    amount: trade.amount,
  });
});

async function test() {
  try {
    console.log('Connecting...');
    await adapter.connect();

    console.log('Subscribing to ticker...');
    await adapter.subscribe({
      channel: 'ticker',
      symbol: 'BTC/USDT',
    });

    console.log('Waiting for events...\n');
    await new Promise((resolve) => setTimeout(resolve, 10000));

    console.log('\nDisconnecting...');
    await adapter.disconnect();

    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

test();
