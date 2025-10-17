/**
 * Exchanges Types
 * TypeScript types for exchange operations
 */

export type ExchangeId =
  | 'binance'
  | 'binanceus'
  | 'coinbase'
  | 'coinbasepro'
  | 'kraken'
  | 'bitfinex'
  | 'bybit'
  | 'okx'
  | 'huobi'
  | 'kucoin'
  | 'gateio'
  | 'mexc';

export type ExchangeStatus = 'active' | 'disabled' | 'error';

export interface ExchangeCredentials {
  apiKey: string;
  apiSecret: string;
  apiPassword?: string;
  sandbox?: boolean;
}

export interface ExchangeBalance {
  currency: string;
  free: number;
  used: number;
  total: number;
}

export interface ExchangeMarket {
  symbol: string;
  base: string;
  quote: string;
  active: boolean;
  type: 'spot' | 'future' | 'swap';
  spot: boolean;
  future: boolean;
  swap: boolean;
  limits: {
    amount?: { min?: number; max?: number };
    price?: { min?: number; max?: number };
    cost?: { min?: number; max?: number };
  };
}

export interface ExchangeTicker {
  symbol: string;
  timestamp: number;
  datetime: string;
  high: number;
  low: number;
  bid: number;
  ask: number;
  last: number;
  close: number;
  baseVolume: number;
  quoteVolume: number;
  percentage: number;
}

export interface CreateExchangeConnectionData {
  userId: string;
  tenantId: string;
  exchangeId: ExchangeId;
  apiKey: string;
  apiSecret: string;
  apiPassword?: string;
  sandbox?: boolean;
  enableTrading?: boolean;
  enableWithdrawal?: boolean;
}

export interface UpdateExchangeConnectionData {
  apiKey?: string;
  apiSecret?: string;
  apiPassword?: string;
  sandbox?: boolean;
  enableTrading?: boolean;
  enableWithdrawal?: boolean;
  status?: ExchangeStatus;
}

export interface ExchangeConnectionFilters {
  userId?: string;
  exchangeId?: ExchangeId;
  status?: ExchangeStatus;
  sandbox?: boolean;
}
