/**
 * Exchange WebSocket Adapter Factory
 * Centralizes creation of native WebSocket adapters for exchanges.
 *
 * All modules requiring WebSocket connections to exchanges must use this factory.
 */

import type { ConnectionConfig, ExchangeId, IExchangeAdapter } from '@/modules/market-data/websocket/types';
import { BinanceAdapter } from '@/modules/exchanges/websocket/adapters/binance-adapter';
import { CoinbaseAdapter } from '@/modules/exchanges/websocket/adapters/coinbase-adapter';
import { KrakenAdapter } from '@/modules/exchanges/websocket/adapters/kraken-adapter';
import { ExchangeWebSocketMetadataService } from './exchange-websocket-metadata.service';

export function createWebSocketAdapter(
  exchangeId: ExchangeId,
  config: ConnectionConfig
): IExchangeAdapter {
  switch (exchangeId) {
    case 'binance':
      return new BinanceAdapter(config);
    case 'coinbase':
      return new CoinbaseAdapter(config);
    case 'kraken':
      return new KrakenAdapter(config);
    default:
      throw new Error(`Unsupported exchange: ${exchangeId}`);
  }
}

/** Default reconnection strategy */
const DEFAULT_RECONNECTION = {
  maxAttempts: 5,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
} as const;

/**
 * Retorna ConnectionConfig padrão baseado na exchange
 * Fonte de URL é o metadata centralizado; tempos e heartbeat seguem padrões seguros.
 */
export function getDefaultWebSocketConfig(exchangeId: ExchangeId): ConnectionConfig {
  const meta = ExchangeWebSocketMetadataService.getMetadata(exchangeId);
  const url = meta?.streamUrl || meta?.wsUrl;
  if (!url) {
    throw new Error(`WebSocket URL não encontrado para exchange '${exchangeId}'`);
  }

  // Defaults seguros; podem ser ajustados via ENV no pipeline
  const base: ConnectionConfig = {
    url,
    timeout: 30000,
    pingInterval: exchangeId === 'binance' ? 30000 : 20000,
    pongTimeout: 10000,
    reconnection: DEFAULT_RECONNECTION,
  };
  return base;
}
