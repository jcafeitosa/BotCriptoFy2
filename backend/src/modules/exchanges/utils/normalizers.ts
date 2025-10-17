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
export function normalizeMarket(market: ccxt.Market | undefined): NormalizedMarket {
  if (!market) {
    throw new Error('Market is undefined');
  }

  return {
    id: String(market.id || ''),
    symbol: String(market.symbol || ''),
    base: String(market.base || ''),
    quote: String(market.quote || ''),
    baseId: String(market.baseId || ''),
    quoteId: String(market.quoteId || ''),
    active: market.active || false,
    type: (market.type as any) || 'spot',
    spot: market.spot || false,
    margin: market.margin || false,
    future: market.future || false,
    swap: market.swap || false,
    option: market.option || false,
    contract: market.contract || false,
    settle: market.settle ? String(market.settle) : undefined,
    settleId: market.settleId ? String(market.settleId) : undefined,
    contractSize: market.contractSize ? Number(market.contractSize) : undefined,
    linear: market.linear,
    inverse: market.inverse,
    taker: Number(market.taker || 0),
    maker: Number(market.maker || 0),
    percentage: market.percentage || false,
    tierBased: market.tierBased || false,
    limits: {
      amount: {
        min: market.limits?.amount?.min ? Number(market.limits.amount.min) : undefined,
        max: market.limits?.amount?.max ? Number(market.limits.amount.max) : undefined,
      },
      price: {
        min: market.limits?.price?.min ? Number(market.limits.price.min) : undefined,
        max: market.limits?.price?.max ? Number(market.limits.price.max) : undefined,
      },
      cost: {
        min: market.limits?.cost?.min ? Number(market.limits.cost.min) : undefined,
        max: market.limits?.cost?.max ? Number(market.limits.cost.max) : undefined,
      },
      leverage: market.limits?.leverage
        ? {
            min: Number((market.limits.leverage as any).min || 0),
            max: Number((market.limits.leverage as any).max || 0),
          }
        : undefined,
    },
    precision: {
      amount: Number(market.precision?.amount || 8),
      price: Number(market.precision?.price || 8),
      base: (market.precision as any)?.base ? Number((market.precision as any).base) : undefined,
      quote: (market.precision as any)?.quote ? Number((market.precision as any).quote) : undefined,
    },
    info: market.info,
  };
}

/**
 * Normalize Ticker
 */
export function normalizeTicker(ticker: ccxt.Ticker): NormalizedTicker {
  return {
    symbol: String(ticker.symbol || ''),
    timestamp: Number(ticker.timestamp || Date.now()),
    datetime: String(ticker.datetime || new Date().toISOString()),
    high: Number(ticker.high || 0),
    low: Number(ticker.low || 0),
    bid: Number(ticker.bid || 0),
    bidVolume: ticker.bidVolume ? Number(ticker.bidVolume) : undefined,
    ask: Number(ticker.ask || 0),
    askVolume: ticker.askVolume ? Number(ticker.askVolume) : undefined,
    vwap: ticker.vwap ? Number(ticker.vwap) : undefined,
    open: Number(ticker.open || 0),
    close: Number(ticker.close || 0),
    last: Number(ticker.last || 0),
    previousClose: ticker.previousClose ? Number(ticker.previousClose) : undefined,
    change: ticker.change ? Number(ticker.change) : undefined,
    percentage: ticker.percentage ? Number(ticker.percentage) : undefined,
    average: ticker.average ? Number(ticker.average) : undefined,
    baseVolume: Number(ticker.baseVolume || 0),
    quoteVolume: Number(ticker.quoteVolume || 0),
    info: ticker.info,
  };
}

/**
 * Normalize Order
 */
export function normalizeOrder(order: ccxt.Order): NormalizedOrder {
  return {
    id: String(order.id || ''),
    clientOrderId: order.clientOrderId ? String(order.clientOrderId) : undefined,
    timestamp: Number(order.timestamp || Date.now()),
    datetime: String(order.datetime || new Date().toISOString()),
    lastTradeTimestamp: order.lastTradeTimestamp ? Number(order.lastTradeTimestamp) : undefined,
    symbol: String(order.symbol || ''),
    type: order.type as any,
    timeInForce: order.timeInForce as any,
    postOnly: order.postOnly,
    side: order.side as any,
    price: order.price ? Number(order.price) : undefined,
    amount: Number(order.amount || 0),
    cost: Number(order.cost || 0),
    average: order.average ? Number(order.average) : undefined,
    filled: Number(order.filled || 0),
    remaining: Number(order.remaining || 0),
    status: order.status as any,
    fee: order.fee ? {
      cost: Number((order.fee as any).cost || 0),
      currency: String((order.fee as any).currency || ''),
      rate: (order.fee as any).rate ? Number((order.fee as any).rate) : undefined,
    } : undefined,
    trades: order.trades,
    info: order.info,
  };
}

/**
 * Normalize Trade
 */
export function normalizeTrade(trade: ccxt.Trade): NormalizedTrade {
  return {
    id: String(trade.id || ''),
    timestamp: Number(trade.timestamp || Date.now()),
    datetime: String(trade.datetime || new Date().toISOString()),
    symbol: String(trade.symbol || ''),
    order: trade.order ? String(trade.order) : undefined,
    type: trade.type as any,
    side: trade.side as any,
    takerOrMaker: trade.takerOrMaker as any,
    price: Number(trade.price || 0),
    amount: Number(trade.amount || 0),
    cost: Number(trade.cost || 0),
    fee: trade.fee ? {
      cost: Number((trade.fee as any).cost || 0),
      currency: String((trade.fee as any).currency || ''),
      rate: (trade.fee as any).rate ? Number((trade.fee as any).rate) : undefined,
    } : undefined,
    info: trade.info,
  };
}

/**
 * Normalize OHLCV
 */
export function normalizeOHLCV(ohlcv: ccxt.OHLCV): NormalizedOHLCV {
  return {
    timestamp: Number(ohlcv[0]),
    datetime: new Date(Number(ohlcv[0])).toISOString(),
    open: Number(ohlcv[1]),
    high: Number(ohlcv[2]),
    low: Number(ohlcv[3]),
    close: Number(ohlcv[4]),
    volume: Number(ohlcv[5]),
  };
}
