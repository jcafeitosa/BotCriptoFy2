import type { ExchangeId, ConnectionConfig, IExchangeAdapter } from '@/modules/market-data/websocket/types';
import { PollingExchangeAdapter } from './adapters/polling-exchange-adapter';

const DEFAULT_RECONNECTION = {
  maxAttempts: 0,
  initialDelay: 1_000,
  maxDelay: 30_000,
  backoffMultiplier: 1.5,
  jitterFactor: 0.25,
} as const;

const DEFAULT_CONFIG: Record<ExchangeId, ConnectionConfig> = {
  binance: {
    url: 'wss://stream.binance.com:9443',
    timeout: 15_000,
    pingInterval: 15_000,
    pongTimeout: 5_000,
    reconnection: DEFAULT_RECONNECTION,
  },
  coinbase: {
    url: 'wss://ws-feed.exchange.coinbase.com',
    timeout: 15_000,
    pingInterval: 15_000,
    pongTimeout: 5_000,
    reconnection: DEFAULT_RECONNECTION,
  },
  kraken: {
    url: 'wss://ws.kraken.com',
    timeout: 15_000,
    pingInterval: 15_000,
    pongTimeout: 5_000,
    reconnection: DEFAULT_RECONNECTION,
  },
  bybit: {
    url: 'wss://stream.bybit.com/v5/public/spot',
    timeout: 15_000,
    pingInterval: 15_000,
    pongTimeout: 5_000,
    reconnection: DEFAULT_RECONNECTION,
  },
  okx: {
    url: 'wss://ws.okx.com:8443/ws/v5/public',
    timeout: 15_000,
    pingInterval: 15_000,
    pongTimeout: 5_000,
    reconnection: DEFAULT_RECONNECTION,
  },
};

export function getDefaultWebSocketConfig(exchangeId: ExchangeId): ConnectionConfig {
  const config = DEFAULT_CONFIG[exchangeId];
  if (!config) {
    throw new Error(`No default configuration defined for exchange ${exchangeId}`);
  }
  return config;
}

export function createWebSocketAdapter(exchangeId: ExchangeId, config: ConnectionConfig = getDefaultWebSocketConfig(exchangeId)): IExchangeAdapter {
  return new PollingExchangeAdapter(exchangeId, config);
}
