import type {
  ExchangeId,
  NormalizedBalance,
  NormalizedCandle,
  NormalizedOrderBook,
  NormalizedTicker,
  NormalizedTrade,
  ExchangeMarketSummary,
} from '../types/exchanges.types';

function safeNumber(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const num = Number(value);
  if (Number.isNaN(num) || !Number.isFinite(num)) {
    return null;
  }
  return num;
}

export function normalizeTicker(exchange: ExchangeId, ticker: any): NormalizedTicker {
  return {
    exchange,
    symbol: String(ticker.symbol ?? ''),
    timestamp: Number(ticker.timestamp ?? Date.now()),
    last: safeNumber(ticker.last ?? ticker.close) ?? 0,
    bid: safeNumber(ticker.bid),
    ask: safeNumber(ticker.ask),
    high24h: safeNumber(ticker.high),
    low24h: safeNumber(ticker.low),
    baseVolume24h: safeNumber(ticker.baseVolume),
    quoteVolume24h: safeNumber(ticker.quoteVolume),
    change24h: safeNumber(ticker.percentage ?? ticker.change),
  };
}

export function normalizeTrades(exchange: ExchangeId, trades: any[]): NormalizedTrade[] {
  return trades.map((trade) => ({
    exchange,
    symbol: String(trade.symbol ?? ''),
    id: String(trade.id ?? trade.timestamp ?? Date.now()),
    timestamp: Number(trade.timestamp ?? Date.now()),
    price: safeNumber(trade.price) ?? 0,
    amount: safeNumber(trade.amount) ?? 0,
    side: (trade.side ?? 'buy') as 'buy' | 'sell',
    takerOrMaker: (trade.takerOrMaker ?? 'taker') as 'taker' | 'maker',
  }));
}

export function normalizeOrderBook(
  exchange: ExchangeId,
  symbol: string,
  orderbook: any
): NormalizedOrderBook {
  const mapLevel = (entry: [number, number]) => ({
    price: Number(entry[0]),
    amount: Number(entry[1]),
  });

  return {
    exchange,
    symbol,
    timestamp: Number(orderbook.timestamp ?? Date.now()),
    bids: Array.isArray(orderbook.bids) ? orderbook.bids.map(mapLevel) : [],
    asks: Array.isArray(orderbook.asks) ? orderbook.asks.map(mapLevel) : [],
  };
}

export function normalizeCandles(
  exchange: ExchangeId,
  symbol: string,
  timeframe: string,
  candles: any[]
): NormalizedCandle[] {
  return candles.map((candle) => ({
    exchange,
    symbol,
    timeframe,
    timestamp: Number(candle[0]),
    open: Number(candle[1]),
    high: Number(candle[2]),
    low: Number(candle[3]),
    close: Number(candle[4]),
    volume: Number(candle[5]),
  }));
}

export function normalizeBalances(
  exchange: ExchangeId,
  balances: any,
  timestamp = Date.now()
): NormalizedBalance[] {
  const result: NormalizedBalance[] = [];
  const totals = balances?.total ?? {};
  const freeMap = balances?.free ?? {};
  const usedMap = balances?.used ?? {};

  for (const currency of Object.keys(totals)) {
    const total = safeNumber(totals[currency]) ?? 0;
    const free = safeNumber(freeMap[currency]) ?? 0;
    const used = safeNumber(usedMap[currency]) ?? Math.max(0, total - free);
    result.push({
      exchange,
      currency,
      free,
      used,
      total,
      timestamp,
    });
  }

  return result;
}

export function normalizeMarketSummary(symbol: string, market: any): ExchangeMarketSummary {
  return {
    symbol,
    base: String(market.base ?? ''),
    quote: String(market.quote ?? ''),
    type: String(market.type ?? 'spot'),
    active: Boolean(market.active ?? true),
    margin: Boolean(market.margin ?? false),
    swap: Boolean(market.swap ?? false),
    future: Boolean(market.future ?? false),
    spot: Boolean(market.spot ?? true),
    precision: {
      amount: safeNumber(market.precision?.amount) ?? undefined,
      price: safeNumber(market.precision?.price) ?? undefined,
    },
    limits: {
      amount: market.limits?.amount ?? undefined,
      price: market.limits?.price ?? undefined,
      cost: market.limits?.cost ?? undefined,
    },
    info: market.info,
  };
}
