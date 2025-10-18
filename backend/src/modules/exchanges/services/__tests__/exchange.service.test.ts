/**
 * Exchange Service Tests
 * Ensures critical exchange workflows are covered before enabling realtime pipelines
 */

import { describe, test, expect, beforeEach, mock } from 'bun:test';

class BadRequestError extends Error {}
class NotFoundError extends Error {}

mock.module('@/utils/errors', () => ({
  BadRequestError,
  NotFoundError,
}));

/**
 * Encryption mocks (deterministic output for assertions)
 */
const encryptMock = mock((value: string) => `enc(${value})`);
const decryptMock = mock((value: string) =>
  value.startsWith('enc(') ? value.slice(4, -1) : value
);

mock.module('../../utils/encryption', () => ({
  encrypt: encryptMock,
  decrypt: decryptMock,
}));

/**
 * Database mock (Drizzle-like chainable API)
 */
type SelectResult = Array<Record<string, any>>;

let selectResult: SelectResult = [];
let insertedValues: Record<string, any> | null = null;
let updateValues: Record<string, any> | null = null;
let updateReturningRows: Array<Record<string, any>> = [{ id: 'connection-1' }];

const dbMock = {
  insert: mock(() => ({
    values: (values: Record<string, any>) => {
      insertedValues = values;
      return {
        returning: () => Promise.resolve([{ id: 'connection-1', ...values }]),
      };
    },
  })),
  update: mock(() => ({
    set: (values: Record<string, any>) => {
      updateValues = values;
      return {
        where: () => ({
          returning: () => Promise.resolve(updateReturningRows),
        }),
      };
    },
  })),
  select: mock(() => ({
    from: () => ({
      where: () => {
        const promise = Promise.resolve(selectResult);
        (promise as any).limit = (limit: number) =>
          Promise.resolve(selectResult.slice(0, limit));
        return promise as any;
      },
    }),
  })),
};

mock.module('@/db', () => ({
  db: dbMock,
}));

/**
 * CCXT Mocks
 */
const loadMarketsMock = mock(async () => {});
const fetchBalanceMock = mock(async () => ({
  info: {},
  BTC: { total: 1, free: 0.6, used: 0.4 },
  ETH: { total: 0, free: 0, used: 0 },
}));
const fetchTickerMock = mock(async (_exchange: string, symbol: string) => ({
  symbol,
  timestamp: 1700000000000,
  datetime: '2023-11-14T00:00:00Z',
  high: 102,
  low: 98,
  bid: 99.5,
  ask: 100.5,
  last: 100,
  close: 100,
  baseVolume: 12,
  quoteVolume: 1200,
  percentage: 1.25,
}));
const fetchPositionsMock = mock(async () => [
  {
    symbol: 'BTC/USDT',
    id: 'pos-1',
    timestamp: 1700000000000,
    datetime: '2023-11-14T00:00:00Z',
    contracts: 3,
    contractSize: 1,
    side: 'long',
    notional: 3000,
    leverage: 2,
    unrealizedPnl: 150,
    realizedPnl: 50,
    collateral: 1500,
    entryPrice: 980,
    markPrice: 1005,
    liquidationPrice: 800,
    marginMode: 'cross',
    hedged: false,
    maintenanceMargin: 60,
    maintenanceMarginPercentage: 2,
    initialMargin: 150,
    initialMarginPercentage: 5,
    marginRatio: 0.1,
    lastUpdateTimestamp: 1700000000500,
    lastPrice: 1005,
    stopLossPrice: 930,
    takeProfitPrice: 1100,
    percentage: 5.1,
    info: {},
  },
  {
    symbol: 'ETH/USDT',
    contracts: 0,
  },
]);

let fetchPositionsSupported = true;

function createExchangeClass(id: string) {
  return class MockExchange {
    public id = id;
    public config: any;
    public has = {
      fetchPositions: fetchPositionsSupported,
    };

    constructor(config: any) {
      this.config = config;
    }

    async loadMarkets() {
      await loadMarketsMock(id);
    }

    async fetchBalance() {
      return fetchBalanceMock(id);
    }

    async fetchTicker(symbol: string) {
      return fetchTickerMock(id, symbol);
    }

    async fetchPositions(symbols?: string[]) {
      return fetchPositionsMock(id, symbols);
    }

    async close() {
      // No-op for mocks
    }
  };
}

const ccxtMock = {
  exchanges: ['binance', 'kraken'],
  binance: createExchangeClass('binance'),
  kraken: createExchangeClass('kraken'),
  __mocks: {
    loadMarketsMock,
    fetchBalanceMock,
    fetchTickerMock,
    fetchPositionsMock,
  },
};

mock.module('ccxt', () => ({
  default: ccxtMock,
}));

// Import after mock configuration to ensure modules receive mocks
const { ExchangeService } = await import('../exchange.service');
const { db } = await import('@/db');
const ccxt = (await import('ccxt')).default as any;

describe('ExchangeService - critical workflows', () => {
  beforeEach(() => {
    // Reset shared state between tests
    insertedValues = null;
    updateValues = null;
    selectResult = [];
    fetchPositionsSupported = true;
    updateReturningRows = [{ id: 'connection-1' }];

    encryptMock.mockReset();
    encryptMock.mockImplementation((value: string) => `enc(${value})`);
    decryptMock.mockReset();
    decryptMock.mockImplementation((value: string) =>
      value.startsWith('enc(') ? value.slice(4, -1) : value
    );

    loadMarketsMock.mockReset();
    fetchBalanceMock.mockReset();
    fetchBalanceMock.mockImplementation(async () => ({
      info: {},
      BTC: { total: 1, free: 0.6, used: 0.4 },
      ETH: { total: 0, free: 0, used: 0 },
    }));
    fetchTickerMock.mockReset();
    fetchTickerMock.mockImplementation(async (_exchange: string, symbol: string) => ({
      symbol,
      timestamp: 1700000000000,
      datetime: '2023-11-14T00:00:00Z',
      high: 102,
      low: 98,
      bid: 99.5,
      ask: 100.5,
      last: 100,
      close: 100,
      baseVolume: 12,
      quoteVolume: 1200,
      percentage: 1.25,
    }));
    fetchPositionsMock.mockReset();
    fetchPositionsMock.mockImplementation(async () => [
      {
        symbol: 'BTC/USDT',
        id: 'pos-1',
        timestamp: 1700000000000,
        datetime: '2023-11-14T00:00:00Z',
        contracts: 3,
        contractSize: 1,
        side: 'long',
        notional: 3000,
        leverage: 2,
        unrealizedPnl: 150,
        realizedPnl: 50,
        collateral: 1500,
        entryPrice: 980,
        markPrice: 1005,
        liquidationPrice: 800,
        marginMode: 'cross',
        hedged: false,
        maintenanceMargin: 60,
        maintenanceMarginPercentage: 2,
        initialMargin: 150,
        initialMarginPercentage: 5,
        marginRatio: 0.1,
        lastUpdateTimestamp: 1700000000500,
        lastPrice: 1005,
        stopLossPrice: 930,
        takeProfitPrice: 1100,
        percentage: 5.1,
        info: {},
      },
      { symbol: 'ETH/USDT', contracts: 0 },
    ]);

    dbMock.insert.mockReset();
    dbMock.insert.mockImplementation(() => ({
      values: (values: Record<string, any>) => {
        insertedValues = values;
        return {
          returning: () => Promise.resolve([{ id: 'connection-1', ...values }]),
        };
      },
    }));

    dbMock.update.mockReset();
    dbMock.update.mockImplementation(() => ({
      set: (values: Record<string, any>) => {
        updateValues = values;
        return {
          where: () => ({
            returning: () => Promise.resolve(updateReturningRows),
          }),
        };
      },
    }));

    dbMock.select.mockReset();
    dbMock.select.mockImplementation(() => ({
      from: () => ({
        where: () => {
          const promise = Promise.resolve(selectResult);
          (promise as any).limit = (limit: number) =>
            Promise.resolve(selectResult.slice(0, limit));
          return promise as any;
        },
      }),
    }));
  });

  test('getSupportedExchanges returns sorted list', () => {
    ccxt.exchanges = ['kraken', 'binance', 'coinbasepro'];

    const result = ExchangeService.getSupportedExchanges();

    expect(result).toEqual(['binance', 'coinbasepro', 'kraken']);
  });

  test('createCCXTInstance builds configured exchange client', () => {
    const instance = ExchangeService.createCCXTInstance('binance', {
      apiKey: 'key',
      apiSecret: 'secret',
      apiPassword: 'pass',
      sandbox: true,
    });

    expect(instance).toBeInstanceOf(ccxt.binance);
    expect(instance.config).toEqual({
      apiKey: 'key',
      secret: 'secret',
      enableRateLimit: true,
      password: 'pass',
      sandbox: true,
    });
  });

  test('createCCXTInstance rejects unsupported exchange', () => {
    expect(() =>
      ExchangeService.createCCXTInstance('unsupported' as any, {
        apiKey: 'k',
        apiSecret: 's',
        sandbox: false,
      })
    ).toThrow(BadRequestError);
  });

  test('createConnection stores encrypted credentials after verification', async () => {
    const data = {
      userId: 'user-1',
      tenantId: 'tenant-1',
      exchangeId: 'binance' as const,
      apiKey: 'plain-key',
      apiSecret: 'plain-secret',
      apiPassword: 'plain-pass',
      sandbox: true,
      enableTrading: true,
      enableWithdrawal: false,
    };

    const connection = await ExchangeService.createConnection(data);

    expect(fetchBalanceMock).toHaveBeenCalledTimes(1);
    expect(insertedValues).toMatchObject({
      apiKey: 'enc(plain-key)',
      apiSecret: 'enc(plain-secret)',
      apiPassword: 'enc(plain-pass)',
      sandbox: true,
      enableTrading: true,
      enableWithdrawal: false,
      isVerified: true,
      status: 'active',
    });
    expect(connection.id).toBe('connection-1');
  });

  test('createConnection throws BadRequestError when verification fails', async () => {
    fetchBalanceMock.mockImplementationOnce(async () => {
      throw new Error('invalid credentials');
    });

    await expect(
      ExchangeService.createConnection({
        userId: 'user-1',
        tenantId: 'tenant-1',
        exchangeId: 'binance',
        apiKey: 'key',
        apiSecret: 'secret',
        sandbox: false,
      })
    ).rejects.toThrow(BadRequestError);

    expect(dbMock.insert).not.toHaveBeenCalled();
  });

  test('fetchBalances maps positive totals and updates cache', async () => {
    selectResult = [
      {
        id: 'connection-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        exchangeId: 'binance',
        apiKey: 'enc(plain-key)',
        apiSecret: 'enc(plain-secret)',
        sandbox: false,
      },
    ];

    const balances = await ExchangeService.fetchBalances('connection-1', 'user-1', 'tenant-1');

    expect(balances).toEqual([
      {
        currency: 'BTC',
        free: 0.6,
        used: 0.4,
        total: 1,
      },
    ]);
    expect(updateValues?.balances).toEqual(balances);
  });

  test('fetchTicker normalizes ticker payload', async () => {
    selectResult = [
      {
        id: 'connection-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        exchangeId: 'binance',
        apiKey: 'enc(key)',
        apiSecret: 'enc(secret)',
        sandbox: false,
      },
    ];

    const ticker = await ExchangeService.fetchTicker('connection-1', 'user-1', 'tenant-1', 'BTC/USDT');

    expect(ticker).toMatchObject({
      symbol: 'BTC/USDT',
      timestamp: 1700000000000,
      datetime: '2023-11-14T00:00:00Z',
      high: 102,
      low: 98,
      bid: 99.5,
      ask: 100.5,
      last: 100,
      close: 100,
      baseVolume: 12,
      quoteVolume: 1200,
      percentage: 1.25,
    });
  });

  test('fetchPositions returns only active contracts', async () => {
    selectResult = [
      {
        id: 'connection-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        exchangeId: 'binance',
        apiKey: 'enc(key)',
        apiSecret: 'enc(secret)',
        sandbox: false,
      },
    ];

    const positions = await ExchangeService.fetchPositions('connection-1', 'user-1', 'tenant-1');

    expect(positions).toHaveLength(1);
    expect(positions[0]).toMatchObject({
      symbol: 'BTC/USDT',
      side: 'long',
      contracts: 3,
      leverage: 2,
      unrealizedPnl: 150,
      takeProfitPrice: 1100,
    });
  });

  test('fetchPositions rejects when exchange lacks fetchPositions capability', async () => {
    fetchPositionsSupported = false;
    selectResult = [
      {
        id: 'connection-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        exchangeId: 'binance',
        apiKey: 'enc(key)',
        apiSecret: 'enc(secret)',
        sandbox: false,
      },
    ];

    await expect(
      ExchangeService.fetchPositions('connection-1', 'user-1', 'tenant-1')
    ).rejects.toThrow(BadRequestError);
  });

  test('updateConnection re-encrypts and verifies when credentials change', async () => {
    selectResult = [
      {
        id: 'connection-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        exchangeId: 'binance',
        apiKey: 'enc(old-key)',
        apiSecret: 'enc(old-secret)',
        sandbox: false,
        enableTrading: true,
      },
    ];
    updateReturningRows = [
      {
        id: 'connection-1',
        apiKey: 'enc(new-key)',
        apiSecret: 'enc(old-secret)',
        enableTrading: false,
        status: 'active',
        isVerified: true,
      },
    ];

    const updated = await ExchangeService.updateConnection(
      'connection-1',
      'user-1',
      'tenant-1',
      {
        apiKey: 'new-key',
        enableTrading: false,
      }
    );

    expect(fetchBalanceMock).toHaveBeenCalledTimes(1);
    expect(encryptMock).toHaveBeenCalledWith('new-key');
    expect(updateValues).toMatchObject({
      apiKey: 'enc(new-key)',
      enableTrading: false,
      isVerified: true,
      status: 'active',
    });
    expect(updated).toMatchObject({
      id: 'connection-1',
      apiKey: 'enc(new-key)',
      enableTrading: false,
    });
  });

  test('updateConnection throws NotFound when update returns no record', async () => {
    selectResult = [
      {
        id: 'connection-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        exchangeId: 'binance',
        apiKey: 'enc(old-key)',
        apiSecret: 'enc(old-secret)',
        sandbox: false,
      },
    ];
    updateReturningRows = [];

    await expect(
      ExchangeService.updateConnection('connection-1', 'user-1', 'tenant-1', {
        enableTrading: true,
      })
    ).rejects.toThrow(NotFoundError);
  });

  test('getUserConnections returns active connections', async () => {
    selectResult = [
      { id: 'c1', userId: 'user-1', tenantId: 'tenant-1', status: 'active' },
      { id: 'c2', userId: 'user-1', tenantId: 'tenant-1', status: 'active' },
    ];

    const result = await ExchangeService.getUserConnections('user-1', 'tenant-1');

    expect(result).toEqual(selectResult);
  });

  test('getConnectionById throws when connection missing', async () => {
    selectResult = [];

    await expect(
      ExchangeService.getConnectionById('missing', 'user-1', 'tenant-1')
    ).rejects.toThrow(NotFoundError);
  });

  test('deleteConnection disables connection status', async () => {
    updateReturningRows = [{ id: 'connection-1' }];

    await ExchangeService.deleteConnection('connection-1', 'user-1', 'tenant-1');

    expect(updateValues).toMatchObject({
      status: 'disabled',
    });
  });
});
