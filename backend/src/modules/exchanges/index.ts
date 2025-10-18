/**
 * Exchanges Module Main Export
 */

export * from './schema/exchanges.schema';
export * from './schema/exchange-markets.schema';
export * from './types/exchanges.types';
export * from './types/realtime.types';
export * from './services/exchange.service';
export { exchangesRoutes } from './routes';
export { createWebSocketAdapter, getDefaultWebSocketConfig } from './services/exchange-websocket.factory';
export { ExchangeWebSocketMetadataService } from './services/exchange-websocket-metadata.service';
