/**
 * @fileoverview WebSocket module exports
 * @module market-data/websocket
 */

// Types
export * from './types';

// Errors
export * from './errors';

// Reconnection strategy
export * from './reconnection-strategy';

// Base adapter
export * from './base-adapter';


// Market Data WebSocket Manager (NEW - uses native adapters)
export * from './market-data-websocket-manager';

// Redis Event Bridge (for multi-instance scaling)
export * from './redis-event-bridge';

export { DEFAULT_RECONNECTION_CONFIGS } from './reconnection-strategy';
export {
  MarketDataWebSocketManager,
  marketDataWebSocketManager,
  connectToExchange,
  disconnectFromExchange,
  subscribeToMarketData,
  unsubscribeFromMarketData,
} from './market-data-websocket-manager';
export { RedisEventBridge, redisEventBridge } from './redis-event-bridge';
