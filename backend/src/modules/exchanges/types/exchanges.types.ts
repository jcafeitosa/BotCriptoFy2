import type { Exchange } from '../schema/exchanges.schema';
import type { ExchangeId } from '@/modules/market-data/websocket/types';

export interface ExchangeMetadata extends Pick<Exchange, 'id' | 'slug' | 'name' | 'displayName' | 'status'> {
  readonly ccxtId: string;
  readonly country?: string;
  readonly website?: string;
  readonly apiDocsUrl?: string;
  readonly supportedPairs?: string[];
  readonly features: {
    readonly spotTrading: boolean;
    readonly marginTrading: boolean;
    readonly futuresTrading: boolean;
    readonly sandbox: boolean;
    readonly websockets: boolean;
  };
  readonly websocket?: {
    readonly public: boolean;
    readonly private: boolean;
    readonly url?: string;
  };
  readonly capabilities?: ExchangeCapability;
}

export interface CreateExchangeConfigRequest {
  readonly exchangeSlug: string;
  readonly apiKey: string;
  readonly apiSecret: string;
  readonly passphrase?: string;
  readonly sandbox?: boolean;
  readonly permissions?: Record<string, boolean>;
}

export interface ExchangeConfigurationResponse {
  readonly id: string;
  readonly exchangeId: string;
  readonly exchangeSlug: string;
  readonly status: string;
  readonly sandbox: boolean;
  readonly permissions: Record<string, boolean>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly lastSyncAt?: Date | null;
  readonly lastErrorAt?: Date | null;
  readonly lastErrorMessage?: string | null;
}

export interface ExchangeConfigurationWithSecrets extends ExchangeConfigurationResponse {
  readonly apiKey: string;
  readonly apiSecret: string;
  readonly passphrase?: string | null;
}

export interface ExchangeConnectionSummary extends ExchangeConfigurationResponse {
  readonly exchangeName: string;
  readonly exchangeDisplayName: string;
}

export interface MarketQueryOptions {
  readonly quote?: string;
  readonly limit?: number;
}

export interface MarketDescription {
  readonly symbol: string;
  readonly base: string;
  readonly quote: string;
  readonly active: boolean;
  readonly type: string;
  readonly precision: {
    readonly amount?: number;
    readonly price?: number;
  };
  readonly limits: {
    readonly amount?: { readonly min?: number; readonly max?: number };
    readonly price?: { readonly min?: number; readonly max?: number };
    readonly cost?: { readonly min?: number; readonly max?: number };
  };
}

export type SupportedExchangeId = ExchangeId;

export interface ExchangeCapability {
  readonly rest: {
    readonly public: ExchangeRestFeature[];
    readonly private: ExchangeRestFeature[];
    readonly rateLimited: boolean;
  };
  readonly websocket: {
    readonly supported: boolean;
    readonly native: boolean;
    readonly channels: ExchangeWebSocketChannel[];
  };
  readonly notes?: string[];
}

export type ExchangeRestFeature =
  | 'fetchTicker'
  | 'fetchTickers'
  | 'fetchOrderBook'
  | 'fetchTrades'
  | 'fetchOHLCV'
  | 'fetchBalance'
  | 'createOrder'
  | 'cancelOrder'
  | 'fetchOpenOrders'
  | 'fetchClosedOrders'
  | 'fetchOrders'
  | 'fetchPositions'
  | 'setLeverage'
  | 'transfer'
  | 'fetchFundingRate'
  | 'unknown';

export type ExchangeWebSocketChannel = 'ticker' | 'orderbook' | 'trades' | 'candles' | 'balance' | 'userOrders' | 'positions';

export interface NormalizedTicker {
  readonly exchange: ExchangeId;
  readonly symbol: string;
  readonly timestamp: number;
  readonly last: number;
  readonly bid: number | null;
  readonly ask: number | null;
  readonly high24h: number | null;
  readonly low24h: number | null;
  readonly baseVolume24h: number | null;
  readonly quoteVolume24h: number | null;
  readonly change24h: number | null;
}

export interface NormalizedTrade {
  readonly exchange: ExchangeId;
  readonly symbol: string;
  readonly id: string;
  readonly timestamp: number;
  readonly price: number;
  readonly amount: number;
  readonly side: 'buy' | 'sell';
  readonly takerOrMaker: 'taker' | 'maker';
}

export interface NormalizedOrderBookLevel {
  readonly price: number;
  readonly amount: number;
}

export interface NormalizedOrderBook {
  readonly exchange: ExchangeId;
  readonly symbol: string;
  readonly timestamp: number;
  readonly bids: NormalizedOrderBookLevel[];
  readonly asks: NormalizedOrderBookLevel[];
}

export interface NormalizedCandle {
  readonly exchange: ExchangeId;
  readonly symbol: string;
  readonly timeframe: string;
  readonly timestamp: number;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
}

export interface NormalizedBalance {
  readonly exchange: ExchangeId;
  readonly currency: string;
  readonly free: number;
  readonly used: number;
  readonly total: number;
  readonly timestamp: number;
}

export interface ExchangeBalanceSnapshot {
  readonly balances: NormalizedBalance[];
  readonly info?: unknown;
  readonly updatedAt: number;
}

export interface ExchangeMarketSummary {
  readonly symbol: string;
  readonly base: string;
  readonly quote: string;
  readonly type: string;
  readonly active: boolean;
  readonly margin: boolean;
  readonly swap: boolean;
  readonly future: boolean;
  readonly spot: boolean;
  readonly precision: {
    readonly amount?: number;
    readonly price?: number;
  };
  readonly limits: {
    readonly amount?: { readonly min?: number; readonly max?: number };
    readonly price?: { readonly min?: number; readonly max?: number };
    readonly cost?: { readonly min?: number; readonly max?: number };
  };
  readonly info?: unknown;
}

export interface ExchangeInfo {
  readonly id: string;
  readonly name: string;
  readonly countries?: string[];
  readonly has?: Record<string, boolean>;
  readonly timeframes?: Record<string, string>;
  readonly urls?: Record<string, unknown>;
  readonly rateLimit?: number;
  readonly version?: string;
  readonly certified?: boolean;
}

export interface ExchangeConnectionStatus {
  readonly connection: ExchangeConnectionSummary;
  readonly exchange: ExchangeInfo;
  readonly capabilities: {
    readonly rest: string[];
    readonly websocket: string[];
  };
  readonly lastSyncAt?: Date | null;
  readonly lastError?: {
    readonly at: Date | null;
    readonly message: string | null;
  };
}
