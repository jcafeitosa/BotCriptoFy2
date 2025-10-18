/**
 * Market Data Module Main Export
 */

export * from './schema/market-data.schema';
export * from './types/market-data.types';
export * from './services/ohlcv.service';
export * from './services/trades.service';
export * from './services/orderbook.service';
export * from './services/ticker.service';
// WebSocket metadata agora vive no módulo Exchanges
// WebSocket adapters - native WebSocket implementation with CCXT metadata
// Export WebSocket types with namespace to avoid conflicts
export * as WebSocketTypes from './websocket/types';
export * from './websocket/errors';
export * from './websocket/reconnection-strategy';
export * from './websocket/base-adapter';
// Adapters não são exportados publicamente — use a fábrica em '@/modules/exchanges'
export { initializeMarketDataPipeline, isMarketDataPipelineInitialized } from './websocket/pipeline';
export { marketDataRoutes } from './routes';
