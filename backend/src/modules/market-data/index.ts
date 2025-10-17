/**
 * Market Data Module Main Export
 */

export * from './schema/market-data.schema';
export * from './types/market-data.types';
export * from './services/ohlcv.service';
export * from './services/trades.service';
export * from './services/orderbook.service';
export * from './services/ticker.service';
export * from './services/exchange-websocket-metadata.service';
// WebSocket adapters - native WebSocket implementation with CCXT metadata
// Export WebSocket types with namespace to avoid conflicts
export * as WebSocketTypes from './websocket/types';
export * from './websocket/errors';
export * from './websocket/reconnection-strategy';
export * from './websocket/base-adapter';
export * from './websocket/adapters/binance-adapter';
export * from './websocket/adapters/coinbase-adapter';
export * from './websocket/adapters/kraken-adapter';
export { marketDataRoutes } from './routes';
