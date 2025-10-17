/**
 * Data Normalizers
 * Normalize data from different exchanges to unified format
 */

import type * as ccxt from 'ccxt';

/**
 * Normalized Balance
 */
export interface NormalizedBalance {
  currency: string;
  free: number;
  used: number;
  total: number;
  usdValue?: number;
}

/**
 * Normalized Market
 */
export interface NormalizedMarket {
  id: string;
  symbol: string;
  base: string;
  quote: string;
  baseId: string;
  quoteId: string;
  active: boolean;
  type: 'spot' | 'future' | 'swap' | 'option';
  spot: boolean;
  margin: boolean;
  future: boolean;
  swap: boolean;
  option: boolean;
  contract: boolean;
  settle?: string;
  settleId?: string;
  contractSize?: number;
  linear?: boolean;
  inverse?: boolean;
  taker: number;
  maker: number;
  percentage: boolean;
  tierBased: boolean;
  limits: {
    amount: { min?: number; max?: number };
    price: { min?: number; max?: number };
    cost: { min?: number; max?: number };
    leverage?: { min?: number; max?: number };
  };
  precision: {
    amount: number;
    price: number;
    base?: number;
    quote?: number;
  };
  info: any;
}

/**
 * Normalized Ticker
 */
export interface NormalizedTicker {
  symbol: string;
  timestamp: number;
  datetime: string;
  high: number;
  low: number;
  bid: number;
  bidVolume?: number;
  ask: number;
  askVolume?: number;
  vwap?: number;
  open: number;
  close: number;
  last: number;
  previousClose?: number;
  change?: number;
  percentage?: number;
  average?: number;
  baseVolume: number;
  quoteVolume: number;
  info: any;
}

/**
 * Normalized Order
 */
export interface NormalizedOrder {
  id: string;
  clientOrderId?: string;
  timestamp: number;
  datetime: string;
  lastTradeTimestamp?: number;
  symbol: string;
  type: 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop';
  timeInForce?: 'GTC' | 'IOC' | 'FOK' | 'PO';
  postOnly?: boolean;
  side: 'buy' | 'sell';
  price?: number;
  amount: number;
  cost: number;
  average?: number;
  filled: number;
  remaining: number;
  status: 'open' | 'closed' | 'canceled' | 'expired' | 'rejected';
  fee?: {
    cost: number;
    currency: string;
    rate?: number;
  };
  trades?: any[];
  info: any;
}

/**
 * Normalized Trade
 */
export interface NormalizedTrade {
  id: string;
  timestamp: number;
  datetime: string;
  symbol: string;
  order?: string;
  type?: 'market' | 'limit';
  side: 'buy' | 'sell';
  takerOrMaker: 'taker' | 'maker';
  price: number;
  amount: number;
  cost: number;
  fee?: {
    cost: number;
    currency: string;
    rate?: number;
  };
  info: any;
}

/**
 * Normalized OHLCV
 */
export interface NormalizedOHLCV {
  timestamp: number;
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Normalize Balances
 */
export function normalizeBalances(balance: ccxt.Balances): NormalizedBalance[] {
  const normalized: NormalizedBalance[] = [];

  for (const [currency, amounts] of Object.entries(balance)) {
    if (
      currency === 'info' ||
      currency === 'free' ||
      currency === 'used' ||
      currency === 'total' ||
      currency === 'debt' ||
      currency === 'timestamp' ||
      currency === 'datetime'
    ) {
      continue;
    }

    const typedAmounts = amounts as any;
    if (typedAmounts.total && typedAmounts.total > 0) {
      normalized.push({
        currency,
        free: typedAmounts.free || 0,
        used: typedAmounts.used || 0,
        total: typedAmounts.total || 0,
      });
    }
  }

  return normalized.sort((a, b) => b.total - a.total);
}

/**
 * Normalize Market
 */
export function normalizeMarket(market: ccxt.Market): NormalizedMarket {
  return {
    id: market.id,
    symbol: market.symbol,
    base: market.base,
    quote: market.quote,
    baseId: market.baseId,
    quoteId: market.quoteId,
    active: market.active || false,
    type: market.type as any || 'spot',
    spot: market.spot || false,
    margin: market.margin || false,
    future: market.future || false,
    swap: market.swap || false,
    option: market.option || false,
    contract: market.contract || false,
    settle: market.settle,
    settleId: market.settleId,
    contractSize: market.contractSize,
    linear: market.linear,
    inverse: market.inverse,
    taker: market.taker || 0,
    maker: market.maker || 0,
    percentage: market.percentage || false,
    tierBased: market.tierBased || false,
    limits: {
      amount: {
        min: market.limits?.amount?.min,
        max: market.limits?.amount?.max,
      },
      price: {
        min: market.limits?.price?.min,
        max: market.limits?.price?.max,
      },
      cost: {
        min: market.limits?.cost?.min,
        max: market.limits?.cost?.max,
      },
      leverage: market.limits?.leverage
        ? {
            min: (market.limits.leverage as any).min,
            max: (market.limits.leverage as any).max,
          }
        : undefined,
    },
    precision: {
      amount: market.precision?.amount || 8,
      price: market.precision?.price || 8,
      base: market.precision?.base,
      quote: market.precision?.quote,
    },
    info: market.info,
  };
}

/**
 * Normalize Ticker
 */
export function normalizeTicker(ticker: ccxt.Ticker): NormalizedTicker {
  return {
    symbol: ticker.symbol,
    timestamp: ticker.timestamp || Date.now(),
    datetime: ticker.datetime || new Date().toISOString(),
    high: ticker.high || 0,
    low: ticker.low || 0,
    bid: ticker.bid || 0,
    bidVolume: ticker.bidVolume,
    ask: ticker.ask || 0,
    askVolume: ticker.askVolume,
    vwap: ticker.vwap,
    open: ticker.open || 0,
    close: ticker.close || 0,
    last: ticker.last || 0,
    previousClose: ticker.previousClose,
    change: ticker.change,
    percentage: ticker.percentage,
    average: ticker.average,
    baseVolume: ticker.baseVolume || 0,
    quoteVolume: ticker.quoteVolume || 0,
    info: ticker.info,
  };
}

/**
 * Normalize Order
 */
export function normalizeOrder(order: ccxt.Order): NormalizedOrder {
  return {
    id: order.id,
    clientOrderId: order.clientOrderId,
    timestamp: order.timestamp || Date.now(),
    datetime: order.datetime || new Date().toISOString(),
    lastTradeTimestamp: order.lastTradeTimestamp,
    symbol: order.symbol,
    type: order.type as any,
    timeInForce: order.timeInForce as any,
    postOnly: order.postOnly,
    side: order.side as any,
    price: order.price,
    amount: order.amount || 0,
    cost: order.cost || 0,
    average: order.average,
    filled: order.filled || 0,
    remaining: order.remaining || 0,
    status: order.status as any,
    fee: order.fee,
    trades: order.trades,
    info: order.info,
  };
}

/**
 * Normalize Trade
 */
export function normalizeTrade(trade: ccxt.Trade): NormalizedTrade {
  return {
    id: trade.id,
    timestamp: trade.timestamp || Date.now(),
    datetime: trade.datetime || new Date().toISOString(),
    symbol: trade.symbol,
    order: trade.order,
    type: trade.type as any,
    side: trade.side as any,
    takerOrMaker: trade.takerOrMaker as any,
    price: trade.price || 0,
    amount: trade.amount || 0,
    cost: trade.cost || 0,
    fee: trade.fee,
    info: trade.info,
  };
}

/**
 * Normalize OHLCV
 */
export function normalizeOHLCV(ohlcv: ccxt.OHLCV): NormalizedOHLCV {
  return {
    timestamp: ohlcv[0],
    datetime: new Date(ohlcv[0]).toISOString(),
    open: ohlcv[1],
    high: ohlcv[2],
    low: ohlcv[3],
    close: ohlcv[4],
    volume: ohlcv[5],
  };
}
