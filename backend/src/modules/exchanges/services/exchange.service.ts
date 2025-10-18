import ccxt from 'ccxt';
import { db } from '@/db';
import { exchanges } from '../schema/exchanges.schema';
import { and, eq } from 'drizzle-orm';
import type {
  ExchangeMetadata,
  MarketDescription,
  MarketQueryOptions,
  ExchangeInfo,
} from '../types/exchanges.types';
import logger from '@/utils/logger';
import { NotFoundError } from '@/utils/errors';

const SUPPORTED_EXCHANGES: Array<ExchangeMetadata> = [
  {
    id: '',
    slug: 'binance',
    name: 'Binance',
    displayName: 'Binance',
    ccxtId: 'binance',
    status: 'active',
    country: 'Global',
    website: 'https://www.binance.com',
    apiDocsUrl: 'https://binance-docs.github.io/apidocs',
    supportedPairs: [],
    features: {
      spotTrading: true,
      marginTrading: true,
      futuresTrading: true,
      sandbox: true,
      websockets: true,
    },
    websocket: {
      public: true,
      private: true,
      url: 'wss://stream.binance.com:9443',
    },
  },
  {
    id: '',
    slug: 'coinbase',
    name: 'Coinbase Exchange',
    displayName: 'Coinbase',
    ccxtId: 'coinbase',
    status: 'active',
    country: 'United States',
    website: 'https://exchange.coinbase.com',
    apiDocsUrl: 'https://docs.cloud.coinbase.com/exchange',
    supportedPairs: [],
    features: {
      spotTrading: true,
      marginTrading: false,
      futuresTrading: false,
      sandbox: true,
      websockets: true,
    },
    websocket: {
      public: true,
      private: true,
      url: 'wss://ws-feed.exchange.coinbase.com',
    },
  },
  {
    id: '',
    slug: 'kraken',
    name: 'Kraken',
    displayName: 'Kraken',
    ccxtId: 'kraken',
    status: 'active',
    country: 'United States',
    website: 'https://www.kraken.com',
    apiDocsUrl: 'https://docs.kraken.com/websockets',
    supportedPairs: [],
    features: {
      spotTrading: true,
      marginTrading: true,
      futuresTrading: true,
      sandbox: false,
      websockets: true,
    },
    websocket: {
      public: true,
      private: true,
      url: 'wss://ws.kraken.com',
    },
  },
  {
    id: '',
    slug: 'bybit',
    name: 'Bybit',
    displayName: 'Bybit',
    ccxtId: 'bybit',
    status: 'active',
    country: 'Global',
    website: 'https://www.bybit.com',
    apiDocsUrl: 'https://bybit-exchange.github.io/docs/v5',
    supportedPairs: [],
    features: {
      spotTrading: true,
      marginTrading: true,
      futuresTrading: true,
      sandbox: true,
      websockets: true,
    },
    websocket: {
      public: true,
      private: true,
      url: 'wss://stream.bybit.com/v5/public/spot',
    },
  },
  {
    id: '',
    slug: 'okx',
    name: 'OKX',
    displayName: 'OKX',
    ccxtId: 'okx',
    status: 'active',
    country: 'Global',
    website: 'https://www.okx.com',
    apiDocsUrl: 'https://www.okx.com/docs-v5',
    supportedPairs: [],
    features: {
      spotTrading: true,
      marginTrading: true,
      futuresTrading: true,
      sandbox: true,
      websockets: true,
    },
    websocket: {
      public: true,
      private: true,
      url: 'wss://ws.okx.com:8443/ws/v5/public',
    },
  },
];

export class ExchangeService {
  static async bootstrapCatalog(): Promise<void> {
    try {
      const catalog = await db.select().from(exchanges);
      if (catalog.length > 0) {
        return;
      }

      await db.insert(exchanges).values(
        SUPPORTED_EXCHANGES.map((item) => ({
          slug: item.slug,
          name: item.name,
          displayName: item.displayName,
          status: item.status,
          country: item.country,
          website: item.website,
          apiDocsUrl: item.apiDocsUrl,
          supportedFeatures: item.features,
          supportedPairs: item.supportedPairs ?? [],
        }))
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('relation "exchanges" does not exist')) {
        logger.warn('Exchanges table not found. Run migrations to persist exchange metadata. Falling back to in-memory registry.');
      } else {
        logger.error('Failed to bootstrap exchanges catalog', { error: message });
      }
    }
  }

  static async listExchanges(): Promise<ExchangeMetadata[]> {
    let records: Array<{
      id: string;
      slug: string;
      name: string;
      displayName: string;
      status: string;
      country: string | null;
      website: string | null;
      apiDocsUrl: string | null;
      supportedFeatures: unknown;
      supportedPairs: unknown;
    }> = [];

    try {
      records = await db
        .select({
          id: exchanges.id,
          slug: exchanges.slug,
          name: exchanges.name,
          displayName: exchanges.displayName,
          status: exchanges.status,
          country: exchanges.country,
          website: exchanges.website,
          apiDocsUrl: exchanges.apiDocsUrl,
          supportedFeatures: exchanges.supportedFeatures,
          supportedPairs: exchanges.supportedPairs,
        })
        .from(exchanges);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('relation "exchanges" does not exist')) {
        logger.error('Failed to load exchanges from database', { error: message });
      }
    }

    if (records.length === 0) {
      return SUPPORTED_EXCHANGES;
    }

    return records.map((row) => {
      const base = SUPPORTED_EXCHANGES.find((item) => item.slug === row.slug);
      return {
        ...row,
        ccxtId: base?.ccxtId ?? row.slug,
        features: {
          spotTrading: Boolean((row.supportedFeatures as any)?.spotTrading ?? base?.features.spotTrading ?? false),
          marginTrading: Boolean((row.supportedFeatures as any)?.marginTrading ?? base?.features.marginTrading ?? false),
          futuresTrading: Boolean((row.supportedFeatures as any)?.futuresTrading ?? base?.features.futuresTrading ?? false),
          sandbox: Boolean((row.supportedFeatures as any)?.sandbox ?? base?.features.sandbox ?? false),
          websockets: Boolean((row.supportedFeatures as any)?.websockets ?? base?.features.websockets ?? false),
        },
        websocket: base?.websocket,
      } as ExchangeMetadata;
    });
  }

  static async getExchangeBySlug(slug: string): Promise<ExchangeMetadata | null> {
    const all = await this.listExchanges();
    return all.find((item) => item.slug === slug) ?? null;
  }

  static async getMarkets(exchangeSlug: string, options: MarketQueryOptions = {}): Promise<MarketDescription[]> {
    const exchange = await this.getExchangeBySlug(exchangeSlug);
    if (!exchange) {
      throw new NotFoundError(`Exchange ${exchangeSlug} is not registered`);
    }

    const ccxtInstance = this.buildCcxtClient(exchange.ccxtId);

    const markets = await ccxtInstance.fetchMarkets();
    const filtered = options.quote
      ? markets.filter((market) => market.quote?.toUpperCase() === options.quote?.toUpperCase())
      : markets;

    const limit = options.limit ?? 50;
    return filtered.slice(0, limit).map((market) => ({
      symbol: market.symbol,
      base: market.base ?? '',
      quote: market.quote ?? '',
      active: market.active ?? true,
      type: market.type ?? 'spot',
      precision: {
        amount: market.precision?.amount,
        price: market.precision?.price,
      },
      limits: {
        amount: market.limits?.amount,
        price: market.limits?.price,
        cost: market.limits?.cost,
      },
    }));
  }

  static resolveExchangeId(identifier: string): string {
    const normalized = identifier.toLowerCase();
    const entry = SUPPORTED_EXCHANGES.find(
      (item) => item.slug.toLowerCase() === normalized || item.ccxtId.toLowerCase() === normalized
    );
    if (!entry) {
      throw new NotFoundError(`Exchange ${identifier} is not supported`);
    }
    return entry.ccxtId;
  }

  static buildCcxtClient(exchangeIdentifier: string, credentials?: { apiKey?: string; secret?: string; password?: string; sandbox?: boolean }) {
    const ccxtId = this.resolveExchangeId(exchangeIdentifier);
    const ExchangeClass = (ccxt as any)[ccxtId];
    if (!ExchangeClass) {
      throw new NotFoundError(`Exchange adapter for ${ccxtId} is not available in CCXT`);
    }

    const instance = new ExchangeClass({ enableRateLimit: true });
    if (credentials?.apiKey) instance.apiKey = credentials.apiKey;
    if (credentials?.secret) instance.secret = credentials.secret;
    if (credentials?.password) instance.password = credentials.password;
    if (credentials?.sandbox && typeof instance.setSandboxMode === 'function') {
      instance.setSandboxMode(true);
    }

    return instance;
  }

  static createCCXTInstance(
    exchangeIdentifier: string,
    credentials?: { apiKey?: string; apiSecret?: string; apiPassword?: string; sandbox?: boolean }
  ) {
    return this.buildCcxtClient(exchangeIdentifier, {
      apiKey: credentials?.apiKey,
      secret: credentials?.apiSecret,
      password: credentials?.apiPassword,
      sandbox: credentials?.sandbox,
    });
  }

  static async fetchPositions(
    exchangeIdentifier: string,
    credentials: { apiKey?: string; apiSecret?: string; apiPassword?: string; sandbox?: boolean },
    symbols?: string[]
  ) {
    const client = this.createCCXTInstance(exchangeIdentifier, credentials);
    if (typeof client.fetchPositions !== 'function') {
      throw new NotFoundError('Exchange does not support position fetching via CCXT');
    }
    return client.fetchPositions(symbols);
  }

  static isExchangeSupported(identifier: string): boolean {
    try {
      this.resolveExchangeId(identifier);
      return true;
    } catch {
      return false;
    }
  }

  static async getExchangeInfo(identifier: string): Promise<ExchangeInfo> {
    const client = this.buildCcxtClient(identifier);
    const description = typeof client.describe === 'function' ? client.describe() : {};

    return {
      id: client.id,
      name: client.name,
      countries: description.countries,
      has: description.has,
      timeframes: description.timeframes,
      urls: description.urls,
      rateLimit: client.rateLimit,
      version: client.version,
      certified: Boolean(description.certified),
    };
  }
}
