#!/usr/bin/env bun
/**
 * Coinbase WebSocket Debug Test
 * Simple test to see what Coinbase is sending
 */

import WebSocket from 'ws';

const ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');

ws.on('open', () => {
  console.log('✓ Connected to Coinbase');

  // Subscribe to BTC-USD ticker
  const subscribeMsg = {
    type: 'subscribe',
    product_ids: ['BTC-USD'],
    channels: ['ticker']
  };

  console.log('Sending subscription:', JSON.stringify(subscribeMsg, null, 2));
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
