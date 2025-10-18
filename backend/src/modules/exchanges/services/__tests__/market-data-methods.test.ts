/**
 * ExchangeService market data methods - unit tests with CCXT mocked
 */

import { describe, test, expect, beforeEach, mock } from 'bun:test';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const BadRequestError = class extends Error {};
const NotFoundError = class extends Error {};

mock.module('@/utils/errors', () => ({ BadRequestError, NotFoundError }));

// In-memory DB/select/update/insert/delete mocks
let selectResult: any[] = [];
const dbMock = {
  select: mock(() => ({
    from: () => ({
      where: () => ({ limit: (_n: number) => Promise.resolve(selectResult.slice(0, 1)) }),
    }),
  })),
  delete: mock(() => ({ where: () => Promise.resolve() })),
  insert: mock(() => ({ values: (_rows: any) => Promise.resolve() })),
};
mock.module('@/db', () => ({ db: dbMock }));

// Encryption mocks
mock.module('../../utils/encryption', () => ({
  encrypt: (v: string) => `enc(${v})`,
  decrypt: (v: string) => (v.startsWith('enc(') ? v.slice(4, -1) : v),
}));

// Redis mock (simple in-memory)
const store = new Map<string, string>();
mock.module('@/utils/redis', () => ({
  default: {
    get: async (k: string) => store.get(k) || null,
    set: async (k: string, v: string, _ttl?: number) => void store.set(k, v),
    del: async (k: string) => void store.delete(k),
  }
}));

// CCXT mock
const ccxtMock: any = {
  exchanges: ['binance'],
  binance: class {
    id = 'binance';
    name = 'Binance';
    rateLimit = 1200;
    has = { fetchOHLCV: true, createOrder: true, withdraw: false, spot: true };
    timeframes = { '1m': '1m', '1h': '1h' };
    urls = { api: 'https://api.binance.com' };
    markets: any = {
      'BTC/USDT': {
        symbol: 'BTC/USDT', base: 'BTC', quote: 'USDT', active: true, spot: true, future: false, swap: false,
        precision: { amount: 6, price: 2 }, limits: { amount: { min: 0.00001 }, price: { min: 0.01 } },
      },
    };
    constructor(public config: any) {}
    async loadMarkets() { /* no-op */ }
    async fetchOrderBook(_symbol: string, _limit?: number) {
      return { timestamp: 1700000000000, datetime: '2023-11-14T00:00:00Z', bids: [[100, 1]], asks: [[101, 1.2]] };
    }
    async fetchTrades(_symbol: string, _since?: number, _limit?: number) {
      return [ { id: 't1', symbol: 'BTC/USDT', timestamp: 1700000000000, price: 100, amount: 0.1, cost: 10, side: 'buy', takerOrMaker: 'taker' } ];
    }
    async fetchOHLCV(_symbol: string, _tf: string, _since?: number, _limit?: number) {
      return [ [1700000000000, 100, 102, 98, 101, 123.45] ];
    }
  },
};

mock.module('ccxt', () => ({ default: ccxtMock }));

// Import SUT after mocks
const { ExchangeService } = await import('../exchange.service');

describe('ExchangeService - market data methods', () => {
  beforeEach(() => {
    selectResult = [
      {
        id: 'connection-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        exchangeId: 'binance',
        exchangeName: 'BINANCE',
        apiKey: 'enc(dummy)',
        apiSecret: 'enc(dummy)',
        apiPassword: null,
        sandbox: false,
        enableTrading: false,
        enableWithdrawal: false,
        isVerified: true,
        status: 'active',
      },
    ];
    store.clear();
  });

  test('getMarkets returns normalized list and caches', async () => {
    const mkts1 = await ExchangeService.getMarkets('connection-1', 'user-1', 'tenant-1');
    expect(mkts1.length).toBeGreaterThan(0);
    expect(mkts1[0]).toMatchObject({ symbol: 'BTC/USDT', base: 'BTC', quote: 'USDT', type: 'spot' });

    // Second call should hit cache (no error thrown)
    const mkts2 = await ExchangeService.getMarkets('connection-1', 'user-1', 'tenant-1');
    expect(mkts2.length).toBe(mkts1.length);
  });

  test('getMarket returns single market details', async () => {
    const m = await ExchangeService.getMarket('connection-1', 'user-1', 'tenant-1', 'BTC/USDT');
    expect(m?.symbol).toBe('BTC/USDT');
    expect(m?.precision?.amount).toBe(6);
  });

  test('fetchOrderBook returns normalized order book', async () => {
    const ob = await ExchangeService.fetchOrderBook('connection-1', 'user-1', 'tenant-1', 'BTC/USDT', 50);
    expect(ob.bids.length).toBe(1);
    expect(ob.asks.length).toBe(1);
  });

  test('fetchTrades returns normalized trades', async () => {
    const trades = await ExchangeService.fetchTrades('connection-1', 'user-1', 'tenant-1', 'BTC/USDT', undefined, 10);
    expect(trades.length).toBe(1);
    expect(trades[0]).toMatchObject({ symbol: 'BTC/USDT', price: 100, amount: 0.1 });
  });

  test('fetchOHLCV returns normalized candles', async () => {
    const candles = await ExchangeService.fetchOHLCV('connection-1', 'user-1', 'tenant-1', 'BTC/USDT', '1m', undefined, 1);
    expect(candles.length).toBe(1);
    expect(candles[0]).toMatchObject({ symbol: 'BTC/USDT', timeframe: '1m', open: 100, close: 101 });
  });
});
