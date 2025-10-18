import type {
  ExchangeBalanceSnapshot,
  ExchangeConnectionStatus,
  ExchangeConnectionSummary,
  ExchangeConfigurationResponse,
  ExchangeConfigurationWithSecrets,
  ExchangeInfo,
  ExchangeMarketSummary,
  NormalizedCandle,
  NormalizedOrderBook,
  NormalizedTicker,
  NormalizedTrade,
} from '../types/exchanges.types';
import { ExchangeConfigurationService } from './exchange-config.service';
import { ExchangeService } from './exchange.service';
import { exchangeConnectionPool } from './connection-pool.service';
import {
  normalizeBalances,
  normalizeCandles,
  normalizeMarketSummary,
  normalizeOrderBook,
  normalizeTicker,
  normalizeTrades,
} from '../utils/normalizers.util';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import logger from '@/utils/logger';

interface ConnectionContext {
  readonly userId: string;
  readonly tenantId: string;
}

interface RestClientCredentials {
  readonly apiKey: string;
  readonly apiSecret: string;
  readonly passphrase?: string | null;
  readonly sandbox: boolean;
  readonly exchangeSlug: string;
}

type RestClient = {
  loadMarkets: () => Promise<Record<string, any>>;
  fetchBalance: () => Promise<any>;
  fetchTicker: (symbol: string) => Promise<any>;
  fetchOrderBook: (symbol: string, limit?: number) => Promise<any>;
  fetchTrades: (symbol: string, since?: number, limit?: number) => Promise<any[]>;
  fetchOHLCV: (symbol: string, timeframe: string, since?: number, limit?: number) => Promise<any[]>;
  describe?: () => any;
  has?: Record<string, boolean>;
  markets?: Record<string, any>;
};

export interface ExchangeRestClientHandle<TClient = RestClient> {
  readonly client: TClient;
  readonly release: () => void;
  readonly connection: ExchangeConnectionSummary;
}

export class ExchangeConnectionService {
  static async createConnection(params: {
    userId: string;
    tenantId: string;
    request: {
      exchangeSlug: string;
      apiKey: string;
      apiSecret: string;
      passphrase?: string;
      sandbox?: boolean;
      permissions?: Record<string, boolean>;
    };
  }): Promise<ExchangeConnectionSummary> {
    const { userId, tenantId, request } = params;

    const exchangeMetadata = await ExchangeService.getExchangeBySlug(request.exchangeSlug);
    if (!exchangeMetadata) {
      throw new NotFoundError(`Exchange ${request.exchangeSlug} is not registered`);
    }

    await this.validateCredentials(request.exchangeSlug, {
      apiKey: request.apiKey,
      apiSecret: request.apiSecret,
      passphrase: request.passphrase,
      sandbox: request.sandbox ?? false,
    });

    const configuration = await ExchangeConfigurationService.createConfiguration({
      userId,
      tenantId,
      request: {
        exchangeSlug: request.exchangeSlug,
        apiKey: request.apiKey,
        apiSecret: request.apiSecret,
        passphrase: request.passphrase,
        sandbox: request.sandbox,
        permissions: request.permissions,
      },
    });

    await ExchangeConfigurationService.updateSyncMetadata({
      configurationId: configuration.id,
      userId,
      tenantId,
      status: 'active',
      lastSyncAt: new Date(),
      lastErrorAt: null,
      lastErrorMessage: null,
    });

    return this.buildConnectionSummary(configuration, exchangeMetadata);
  }

  static async listConnections(context: ConnectionContext): Promise<ExchangeConnectionSummary[]> {
    const rows = await ExchangeConfigurationService.listConfigurations(context);
    return Promise.all(
      rows.map(async (row) => {
        const metadata = (await ExchangeService.getExchangeBySlug(row.exchangeSlug)) ?? {
          name: row.exchangeSlug,
          displayName: row.exchangeSlug,
        };
        return this.buildConnectionSummary(row, metadata);
      })
    );
  }

  static async getConnectionSummary(params: ConnectionContext & { configurationId: string }): Promise<ExchangeConnectionSummary> {
    const configuration = await ExchangeConfigurationService.getConfigurationById(params);
    const metadata = (await ExchangeService.getExchangeBySlug(configuration.exchangeSlug)) ?? {
      name: configuration.exchangeSlug,
      displayName: configuration.exchangeSlug,
    };
    return this.buildConnectionSummary(configuration, metadata);
  }

  static async getConnectionStatus(params: ConnectionContext & { configurationId: string }): Promise<ExchangeConnectionStatus> {
    const summary = await this.getConnectionSummary(params);
    const exchangeInfo = await this.getExchangeInfo(summary.exchangeSlug);

    const capabilities = this.extractCapabilities(exchangeInfo);

    return {
      connection: summary,
      exchange: exchangeInfo,
      capabilities,
      lastSyncAt: summary.lastSyncAt,
      lastError: summary.lastErrorAt
        ? {
            at: summary.lastErrorAt,
            message: summary.lastErrorMessage ?? null,
          }
        : undefined,
    };
  }

  static async testConnection(params: ConnectionContext & { configurationId: string }): Promise<{ success: true }> {
    await this.withRestClient(params, async (client, configuration) => {
      if (!client.fetchBalance) {
        throw new BadRequestError('Exchange does not support balance retrieval');
      }
      await client.fetchBalance();
      await this.recordSyncSuccess(configuration, params);
    });

    return { success: true };
  }

  static async fetchBalances(params: ConnectionContext & { configurationId: string }): Promise<ExchangeBalanceSnapshot> {
    return this.withRestClient(params, async (client, configuration) => {
      if (!client.fetchBalance) {
        throw new BadRequestError('Exchange does not support fetching balances');
      }
      const exchangeId = this.getNormalizedExchangeId(configuration.exchangeSlug);
      const raw = await client.fetchBalance();
      const normalized = normalizeBalances(exchangeId, raw, Date.now());

      await this.recordSyncSuccess(configuration, params);

      return {
        balances: normalized,
        info: raw.info,
        updatedAt: Date.now(),
      };
    });
  }

  static async fetchTicker(params: ConnectionContext & { configurationId: string; symbol: string }): Promise<NormalizedTicker> {
    return this.withRestClient(params, async (client, configuration) => {
      if (!client.fetchTicker || client.has?.fetchTicker === false) {
        throw new BadRequestError('Exchange does not support ticker endpoint');
      }
      const exchangeId = this.getNormalizedExchangeId(configuration.exchangeSlug);
      const data = await client.fetchTicker(params.symbol);

      await this.recordSyncSuccess(configuration, params);

      return normalizeTicker(exchangeId, data);
    });
  }

  static async fetchOrderBook(params: ConnectionContext & { configurationId: string; symbol: string; depth?: number }): Promise<NormalizedOrderBook> {
    return this.withRestClient(params, async (client, configuration) => {
      if (!client.fetchOrderBook || client.has?.fetchOrderBook === false) {
        throw new BadRequestError('Exchange does not support order book endpoint');
      }
      const exchangeId = this.getNormalizedExchangeId(configuration.exchangeSlug);
      const data = await client.fetchOrderBook(params.symbol, params.depth);
      await this.recordSyncSuccess(configuration, params);
      return normalizeOrderBook(exchangeId, params.symbol, data);
    });
  }

  static async fetchTrades(params: ConnectionContext & { configurationId: string; symbol: string; since?: number; limit?: number }): Promise<NormalizedTrade[]> {
    return this.withRestClient(params, async (client, configuration) => {
      if (!client.fetchTrades || client.has?.fetchTrades === false) {
        throw new BadRequestError('Exchange does not support trades endpoint');
      }
      const exchangeId = this.getNormalizedExchangeId(configuration.exchangeSlug);
      const trades = await client.fetchTrades(params.symbol, params.since, params.limit);
      await this.recordSyncSuccess(configuration, params);
      return normalizeTrades(exchangeId, trades);
    });
  }

  static async fetchOHLCV(params: ConnectionContext & { configurationId: string; symbol: string; timeframe: string; since?: number; limit?: number }): Promise<NormalizedCandle[]> {
    return this.withRestClient(params, async (client, configuration) => {
      if (!client.fetchOHLCV || client.has?.fetchOHLCV === false) {
        throw new BadRequestError('Exchange does not support OHLCV endpoint');
      }
      const exchangeId = this.getNormalizedExchangeId(configuration.exchangeSlug);
      const candles = await client.fetchOHLCV(params.symbol, params.timeframe, params.since, params.limit);
      await this.recordSyncSuccess(configuration, params);
      return normalizeCandles(exchangeId, params.symbol, params.timeframe, candles);
    });
  }

  static async listMarkets(params: ConnectionContext & { configurationId: string }): Promise<ExchangeMarketSummary[]> {
    return this.withRestClient(params, async (client, configuration) => {
      const markets = await client.loadMarkets();
      await this.recordSyncSuccess(configuration, params);
      return Object.entries(markets).map(([symbol, market]) => normalizeMarketSummary(symbol, market));
    });
  }

  static async getMarket(params: ConnectionContext & { configurationId: string; symbol: string }): Promise<ExchangeMarketSummary> {
    return this.withRestClient(params, async (client, configuration) => {
      const markets = await client.loadMarkets();
      const market = markets[params.symbol];
      if (!market) {
        throw new NotFoundError(`Symbol ${params.symbol} is not listed for this exchange`);
      }
      await this.recordSyncSuccess(configuration, params);
      return normalizeMarketSummary(params.symbol, market);
    });
  }

  private static async validateCredentials(
    exchangeSlug: string,
    credentials: { apiKey: string; apiSecret: string; passphrase?: string; sandbox: boolean }
  ): Promise<void> {
    const client = ExchangeService.createCCXTInstance(exchangeSlug, {
      apiKey: credentials.apiKey,
      apiSecret: credentials.apiSecret,
      apiPassword: credentials.passphrase,
      sandbox: credentials.sandbox,
    });

    try {
      if (typeof (client as any).checkRequiredCredentials === 'function') {
        (client as any).checkRequiredCredentials();
      }
      if (typeof client.fetchBalance === 'function') {
        await client.fetchBalance();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Exchange credential validation failed', {
        exchange: exchangeSlug,
        error: message,
      });
      throw new BadRequestError('Exchange credentials validation failed');
    }
  }

  static async acquireRestClientHandle(
    params: ConnectionContext & { configurationId: string }
  ): Promise<ExchangeRestClientHandle> {
    const configurationWithSecrets = await ExchangeConfigurationService.getConfigurationWithSecrets({
      userId: params.userId,
      tenantId: params.tenantId,
      configurationId: params.configurationId,
      includeDisabled: false,
    });

    const { apiKey, apiSecret, passphrase, ...withoutSecrets } = configurationWithSecrets;
    const restHandle = await exchangeConnectionPool.acquireRestClient({
      exchangeIdentifier: withoutSecrets.exchangeSlug,
      apiKey,
      apiSecret,
      apiPassword: passphrase ?? undefined,
      sandbox: withoutSecrets.sandbox,
    });

    const metadata =
      (await ExchangeService.getExchangeBySlug(withoutSecrets.exchangeSlug)) ?? {
        name: withoutSecrets.exchangeSlug,
        displayName: withoutSecrets.exchangeSlug,
      };

    const connectionSummary = this.buildConnectionSummary(
      withoutSecrets as ExchangeConfigurationResponse,
      metadata
    );

    return {
      client: restHandle.client as RestClient,
      release: restHandle.release,
      connection: connectionSummary,
    };
  }

  private static async withRestClient<T>(
    params: ConnectionContext & { configurationId: string },
    handler: (client: RestClient, configuration: ExchangeConfigurationResponse) => Promise<T>
  ): Promise<T> {
    const handle = await this.acquireRestClientHandle(params);

    try {
      return await handler(handle.client, handle.connection);
    } catch (error) {
      if (!(error instanceof BadRequestError)) {
        await this.recordSyncFailure(handle.connection, params, error);
      }
      throw error;
    } finally {
      handle.release();
    }
  }

  private static buildConnectionSummary(
    configuration: ExchangeConfigurationResponse,
    metadata: { name: string; displayName?: string }
  ): ExchangeConnectionSummary {
    return {
      ...configuration,
      exchangeName: metadata.name,
      exchangeDisplayName: metadata.displayName ?? metadata.name,
    };
  }

  private static async getExchangeInfo(exchangeSlug: string): Promise<ExchangeInfo> {
    return ExchangeService.getExchangeInfo(exchangeSlug);
  }

  private static extractCapabilities(info: ExchangeInfo): {
    readonly rest: string[];
    readonly websocket: string[];
  } {
    const rest: string[] = [];
    const websocket: string[] = [];

    for (const [key, value] of Object.entries(info.has ?? {})) {
      if (!value) continue;
      if (key.toLowerCase().startsWith('watch') || key.toLowerCase().includes('ws')) {
        websocket.push(key);
      } else {
        rest.push(key);
      }
    }

    return { rest, websocket };
  }

  private static getNormalizedExchangeId(exchangeSlug: string) {
    return ExchangeService.resolveExchangeId(exchangeSlug) as any;
  }

  private static async recordSyncSuccess(
    configuration: ExchangeConfigurationWithSecrets | ExchangeConfigurationResponse,
    context: ConnectionContext
  ): Promise<void> {
    await ExchangeConfigurationService.updateSyncMetadata({
      configurationId: configuration.id,
      userId: context.userId,
      tenantId: context.tenantId,
      status: 'active',
      lastSyncAt: new Date(),
      lastErrorAt: null,
      lastErrorMessage: null,
    });
  }

  private static async recordSyncFailure(
    configuration: ExchangeConfigurationWithSecrets | ExchangeConfigurationResponse,
    context: ConnectionContext,
    error: unknown
  ): Promise<void> {
    await ExchangeConfigurationService.updateSyncMetadata({
      configurationId: configuration.id,
      userId: context.userId,
      tenantId: context.tenantId,
      status: 'error',
      lastErrorAt: new Date(),
      lastErrorMessage: this.sanitizeErrorMessage(error),
    });
  }

  private static sanitizeErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message.slice(0, 500);
    }
    return String(error).slice(0, 500);
  }
}
