#!/usr/bin/env bun
/**
 * Binance WebSocket Debug Test
 * Simple test to see what Binance is sending
 */

import WebSocket from 'ws';

const ws = new WebSocket('wss://stream.binance.com:9443/ws');

ws.on('open', () => {
  console.log('✓ Connected to Binance');

  // Subscribe to btcusdt mini ticker
  const subscribeMsg = {
    method: 'SUBSCRIBE',
    params: ['btcusdt@miniTicker'],
    id: 1,
  };

  console.log('Sending subscription:', JSON.stringify(subscribeMsg));
  ws.send(JSON.stringify(subscribeMsg));
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('Received:', JSON.stringify(message, null, 2));
});

ws.on('error', (error) => {
  console.error('✗ Error:', error.message);
});

ws.on('close', (code, reason) => {
  console.log(`✗ Connection closed: ${code} - ${reason}`);
});

// Keep alive for 10 seconds
setTimeout(() => {
  console.log('\nClosing connection...');
  ws.close();
  process.exit(0);
}, 10000);
