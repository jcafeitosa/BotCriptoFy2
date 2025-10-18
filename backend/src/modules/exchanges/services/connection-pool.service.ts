import { createHash } from 'crypto';
import type { ConnectionConfig, ExchangeId, IExchangeAdapter } from '@/modules/market-data/websocket/types';
import { ExchangeService } from './exchange.service';
import { createWebSocketAdapter, getDefaultWebSocketConfig } from './exchange-websocket.service';
import logger from '@/utils/logger';

interface RestCredentials {
  exchangeIdentifier: string;
  apiKey?: string;
  apiSecret?: string;
  apiPassword?: string;
  sandbox?: boolean;
}

export interface RestClientHandle<TClient = any> {
  client: TClient;
  release: () => void;
}

export interface WebSocketHandle {
  adapter: IExchangeAdapter;
  release: () => Promise<void>;
}

interface RestEntry {
  client: any;
  refCount: number;
}

interface WebSocketEntry {
  adapter: IExchangeAdapter;
  refCount: number;
}

class ExchangeConnectionPool {
  private restClients: Map<string, RestEntry> = new Map();
  private websocketAdapters: Map<string, WebSocketEntry> = new Map();

  async acquireRestClient(credentials: RestCredentials): Promise<RestClientHandle> {
    const key = this.restKey(credentials);
    let entry = this.restClients.get(key);

    if (!entry) {
      logger.debug('Creating pooled REST client', {
        exchange: credentials.exchangeIdentifier,
        sandbox: credentials.sandbox ?? false,
      });
      const client = ExchangeService.createCCXTInstance(credentials.exchangeIdentifier, {
        apiKey: credentials.apiKey,
        apiSecret: credentials.apiSecret,
        apiPassword: credentials.apiPassword,
        sandbox: credentials.sandbox,
      });
      entry = { client, refCount: 0 };
      this.restClients.set(key, entry);
    }

    entry.refCount += 1;

    return {
      client: entry.client,
      release: () => this.releaseRestClient(key),
    };
  }

  async acquireWebSocketAdapter(
    exchangeId: ExchangeId,
    config?: ConnectionConfig
  ): Promise<WebSocketHandle> {
    const key = this.websocketKey(exchangeId);
    let entry = this.websocketAdapters.get(key);

    if (!entry) {
      const adapter = createWebSocketAdapter(exchangeId, config ?? getDefaultWebSocketConfig(exchangeId));
      try {
        await adapter.connect();
      } catch (error) {
        logger.error('Failed to connect pooled WebSocket adapter', {
          exchange: exchangeId,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
      entry = { adapter, refCount: 0 };
      this.websocketAdapters.set(key, entry);
    }

    entry.refCount += 1;

    return {
      adapter: entry.adapter,
      release: async () => this.releaseWebSocketAdapter(key),
    };
  }

  async shutdown(): Promise<void> {
    for (const [key, entry] of this.websocketAdapters.entries()) {
      try {
        await entry.adapter.disconnect();
      } catch (error) {
        logger.error('Failed to disconnect pooled WebSocket adapter', {
          key,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    this.websocketAdapters.clear();
    this.restClients.clear();
  }

  private releaseRestClient(key: string): void {
    const entry = this.restClients.get(key);
    if (!entry) return;

    entry.refCount = Math.max(0, entry.refCount - 1);
    if (entry.refCount === 0) {
      this.restClients.delete(key);
      logger.debug('Released pooled REST client', { key });
    }
  }

  private async releaseWebSocketAdapter(key: string): Promise<void> {
    const entry = this.websocketAdapters.get(key);
    if (!entry) return;

    entry.refCount = Math.max(0, entry.refCount - 1);
    if (entry.refCount === 0) {
      this.websocketAdapters.delete(key);
      try {
        await entry.adapter.disconnect();
      } catch (error) {
        logger.error('Failed to disconnect WebSocket adapter during release', {
          key,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private restKey(credentials: RestCredentials): string {
    const ccxtId = ExchangeService.resolveExchangeId(credentials.exchangeIdentifier);
    const normalized = `${ccxtId}:${credentials.sandbox ? 'sandbox' : 'live'}`;
    const secretMaterial = [credentials.apiKey ?? '', credentials.apiSecret ?? '', credentials.apiPassword ?? ''].join('|');
    const hash = createHash('sha256').update(secretMaterial).digest('hex');
    return `rest:${normalized}:${hash}`;
  }

  private websocketKey(exchangeId: ExchangeId): string {
    return `ws:${exchangeId}`;
  }
}

export const exchangeConnectionPool = new ExchangeConnectionPool();
