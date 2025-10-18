/**
 * Market Data WebSocket Pipeline Bootstrap
 * Connects native exchange adapters and subscribes to default market data feeds.
 */

import logger from '@/utils/logger';
import { marketDataWebSocketManager } from './market-data-websocket-manager';
import type { ChannelType, ConnectionConfig, ExchangeId } from './types';
import { getDefaultWebSocketConfig } from '@/modules/exchanges';

/**
 * Default reconnection strategy used for all managed exchanges.
 */
const DEFAULT_RECONNECTION = {
  maxAttempts: 5,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
} as const;


/**
 * Default subscriptions used when no custom configuration is supplied.
 */
const DEFAULT_SUBSCRIPTIONS: PipelineSubscription[] = [
  {
    exchangeId: 'binance',
    symbol: 'BTC/USDT',
    channels: ['ticker', 'trades'],
  },
  {
    exchangeId: 'binance',
    symbol: 'ETH/USDT',
    channels: ['ticker'],
  },
];

interface PipelineSubscription {
  exchangeId: ExchangeId;
  symbol: string;
  channels: ChannelType[];
}

let initialized = false;

/**
 * Parse MARKET_DATA_WS_SUBSCRIPTIONS env variable.
 * Format: exchange:symbol:channel1,channel2;exchange:symbol:channel
 * Example: binance:BTC/USDT:ticker,trades;kraken:BTC/USD:candles
 */
function parseSubscriptionsFromEnv(): PipelineSubscription[] | null {
  const raw = process.env.MARKET_DATA_WS_SUBSCRIPTIONS;
  if (!raw) {
    return null;
  }

  const entries = raw
    .split(/[\n;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  const subscriptions: PipelineSubscription[] = [];

  for (const entry of entries) {
    const parts = entry.split(':');
    if (parts.length < 3) {
      logger.warn('Invalid MARKET_DATA_WS_SUBSCRIPTIONS entry (expected exchange:symbol:channels)', {
        entry,
      });
      continue;
    }

    const [exchangeRaw, symbolRaw, channelsRaw] = parts;
    const exchangeId = exchangeRaw.toLowerCase() as ExchangeId;

    // Validar exchange suportada via config centralizado
    try {
      getDefaultWebSocketConfig(exchangeId);
    } catch {
      logger.warn('Unsupported exchange in MARKET_DATA_WS_SUBSCRIPTIONS entry', {
        exchange: exchangeRaw,
      });
      continue;
    }

    const channels = channelsRaw
      .split(',')
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean) as ChannelType[];

    const validChannels = channels.filter((channel) =>
      ['ticker', 'trades', 'orderbook', 'candles'].includes(channel)
    ) as ChannelType[];

    if (validChannels.length === 0) {
      logger.warn('No valid channels provided in MARKET_DATA_WS_SUBSCRIPTIONS entry', {
        entry,
      });
      continue;
    }

    subscriptions.push({
      exchangeId,
      symbol: symbolRaw.trim(),
      channels: validChannels,
    });
  }

  return subscriptions;
}

function resolveSubscriptions(): PipelineSubscription[] {
  const fromEnv = parseSubscriptionsFromEnv();
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv;
  }
  return DEFAULT_SUBSCRIPTIONS;
}

function resolveConnectionConfig(exchangeId: ExchangeId): ConnectionConfig {
  const baseConfig = getDefaultWebSocketConfig(exchangeId);
  const urlOverride = process.env[`MARKET_DATA_WS_${exchangeId.toUpperCase()}_URL`];

  if (!urlOverride) {
    return baseConfig;
  }

  return {
    ...baseConfig,
    url: urlOverride,
  };
}

function buildChannelParams(channel: ChannelType): Record<string, unknown> | undefined {
  if (channel === 'orderbook') {
    const depthEnv = process.env.MARKET_DATA_WS_ORDERBOOK_DEPTH;
    const depth = depthEnv ? Number.parseInt(depthEnv, 10) : 20;
    return { depth: Number.isNaN(depth) ? 20 : depth };
  }

  if (channel === 'candles') {
    const timeframe = process.env.MARKET_DATA_WS_CANDLE_TIMEFRAME || '1m';
    return { interval: timeframe };
  }

  return undefined;
}

/**
 * Initialize market data WebSocket pipeline (idempotent).
 */
export async function initializeMarketDataPipeline(): Promise<void> {
  const bootstrapEnabled =
    (process.env.MARKET_DATA_WS_BOOTSTRAP ?? '').toLowerCase() === 'true';

  if (!bootstrapEnabled) {
    logger.info(
      'Market data WebSocket pipeline bootstrap disabled (MARKET_DATA_WS_BOOTSTRAP != true)'
    );
    return;
  }

  if (initialized) {
    logger.info('Market data WebSocket pipeline already initialized');
    return;
  }

  const subscriptions = resolveSubscriptions();
  if (subscriptions.length === 0) {
    logger.warn('Market data WebSocket pipeline has no subscriptions configured; skipping');
    initialized = true;
    return;
  }

  const exchangesToConnect = new Set<ExchangeId>(subscriptions.map((s) => s.exchangeId));

  logger.info('Initializing market data WebSocket pipeline', {
    exchanges: Array.from(exchangesToConnect),
    totalSubscriptions: subscriptions.length,
  });

  for (const exchangeId of exchangesToConnect) {
    if (marketDataWebSocketManager.isConnected(exchangeId)) {
      logger.info('Exchange already connected, skipping', { exchangeId });
      continue;
    }

    try {
      await marketDataWebSocketManager.connect(
        exchangeId,
        resolveConnectionConfig(exchangeId)
      );
    } catch (error) {
      logger.error('Failed to connect exchange WebSocket', {
        exchange: exchangeId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const { exchangeId, symbol, channels } of subscriptions) {
    const existingSubscriptions = marketDataWebSocketManager
      .getSubscriptions(exchangeId)
      .map((sub) => `${sub.channel}:${sub.symbol}`);

    for (const channel of channels) {
      const subscriptionKey = `${channel}:${symbol}`;
      if (existingSubscriptions.includes(subscriptionKey)) {
        continue;
      }

      try {
        await marketDataWebSocketManager.subscribe({
          exchangeId,
          channel,
          symbol,
          params: buildChannelParams(channel),
        });
      } catch (error) {
        logger.error('Failed to subscribe to market data channel', {
          exchange: exchangeId,
          symbol,
          channel,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  initialized = true;
  logger.info('Market data WebSocket pipeline initialized successfully', {
    activeConnections: Array.from(exchangesToConnect),
  });
}

/**
 * Expose initialization status (useful for health checks/tests).
 */
export function isMarketDataPipelineInitialized(): boolean {
  return initialized;
}

/**
 * Testing utility to reset initialization state between test runs.
 */
export function __resetMarketDataPipelineForTests(): void {
  initialized = false;
}
