/**
 * Exchanges Types
 * TypeScript types for exchange operations
 */

/**
 * Exchange ID - CCXT supports 100+ exchanges
 * Using string type instead of literal union for flexibility
 * Validation is done at runtime using ccxt.exchanges
 */
export type ExchangeId = string;

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

export interface ExchangePosition {
  symbol: string;
  id?: string;
  timestamp?: number;
  datetime?: string;
  contracts?: number;
  contractSize?: number;
  side: 'long' | 'short';
  notional?: number;
  leverage?: number;
  unrealizedPnl?: number;
  realizedPnl?: number;
  collateral?: number;
  entryPrice?: number;
  markPrice?: number;
  liquidationPrice?: number;
  marginMode?: string;
  hedged?: boolean;
  maintenanceMargin?: number;
  maintenanceMarginPercentage?: number;
  initialMargin?: number;
  initialMarginPercentage?: number;
  marginRatio?: number;
  lastUpdateTimestamp?: number;
  lastPrice?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  percentage?: number;
  info?: any;
}
