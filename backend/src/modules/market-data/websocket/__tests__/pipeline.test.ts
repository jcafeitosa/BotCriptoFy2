/**
 * Market Data Pipeline Bootstrap Tests
 */

import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import type { ExchangeId } from '../types';

const connectionState = new Map<ExchangeId, boolean>();

const connectMock = mock(async (exchangeId: ExchangeId) => {
  connectionState.set(exchangeId, true);
});
const subscribeMock = mock(async () => {});
const isConnectedMock = mock((exchangeId: ExchangeId) => connectionState.get(exchangeId) ?? false);
const getSubscriptionsMock = mock(() => []);

mock.module('../market-data-websocket-manager', () => ({
  marketDataWebSocketManager: {
    isConnected: isConnectedMock,
    connect: connectMock,
    subscribe: subscribeMock,
    getSubscriptions: getSubscriptionsMock,
  },
}));

const infoMock = mock(() => {});
const warnMock = mock(() => {});
const errorMock = mock(() => {});
const debugMock = mock(() => {});

mock.module('@/utils/logger', () => ({
  default: {
    info: infoMock,
    warn: warnMock,
    error: errorMock,
  },
  info: infoMock,
  warn: warnMock,
  error: errorMock,
  logInfo: infoMock,
  logWarn: warnMock,
  logError: errorMock,
  logDebug: debugMock,
}));

async function importPipelineModule() {
  const module = await import('../pipeline');
  if (typeof module.__resetMarketDataPipelineForTests === 'function') {
    module.__resetMarketDataPipelineForTests();
  }
  return module;
}

beforeEach(() => {
  connectionState.clear();
  connectMock.mockReset();
  connectMock.mockImplementation(async (exchangeId: ExchangeId) => {
    connectionState.set(exchangeId, true);
  });
  subscribeMock.mockReset();
  isConnectedMock.mockReset();
  isConnectedMock.mockImplementation((exchangeId: ExchangeId) => connectionState.get(exchangeId) ?? false);
  getSubscriptionsMock.mockReset();
  getSubscriptionsMock.mockImplementation(() => []);
  infoMock.mockReset();
  warnMock.mockReset();
  errorMock.mockReset();

  delete process.env.MARKET_DATA_WS_BOOTSTRAP;
  delete process.env.MARKET_DATA_WS_SUBSCRIPTIONS;
  delete process.env.MARKET_DATA_WS_CANDLE_TIMEFRAME;
  delete process.env.MARKET_DATA_WS_ORDERBOOK_DEPTH;
  delete process.env.MARKET_DATA_WS_BINANCE_URL;
});

afterEach(() => {
  delete process.env.MARKET_DATA_WS_BOOTSTRAP;
  delete process.env.MARKET_DATA_WS_SUBSCRIPTIONS;
  delete process.env.MARKET_DATA_WS_CANDLE_TIMEFRAME;
  delete process.env.MARKET_DATA_WS_ORDERBOOK_DEPTH;
  delete process.env.MARKET_DATA_WS_BINANCE_URL;
});

describe('initializeMarketDataPipeline', () => {
  test('should skip initialization when bootstrap flag is disabled', async () => {
    const { initializeMarketDataPipeline, isMarketDataPipelineInitialized } =
      await importPipelineModule();

    await initializeMarketDataPipeline();

    expect(connectMock).not.toHaveBeenCalled();
    expect(subscribeMock).not.toHaveBeenCalled();
    expect(isMarketDataPipelineInitialized()).toBe(false);
  });

  test('should connect and subscribe according to env configuration', async () => {
    process.env.MARKET_DATA_WS_BOOTSTRAP = 'true';
    process.env.MARKET_DATA_WS_SUBSCRIPTIONS =
      'binance:BTC/USDT:ticker,trades;kraken:BTC/USD:candles';
    process.env.MARKET_DATA_WS_CANDLE_TIMEFRAME = '5m';

    const { initializeMarketDataPipeline } = await importPipelineModule();

    await initializeMarketDataPipeline();

    expect(connectMock).toHaveBeenCalledTimes(2);
    expect(connectMock.mock.calls.map(([exchange]) => exchange)).toEqual(
      expect.arrayContaining(['binance', 'kraken'])
    );

    expect(subscribeMock).toHaveBeenCalledTimes(3);
    const subscriptionPayloads = subscribeMock.mock.calls.map(([request]) => request);
    expect(subscriptionPayloads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ channel: 'ticker', symbol: 'BTC/USDT' }),
        expect.objectContaining({ channel: 'trades', symbol: 'BTC/USDT' }),
        expect.objectContaining({
          channel: 'candles',
          symbol: 'BTC/USD',
          params: { interval: '5m' },
        }),
      ])
    );
  });

  test('should be idempotent across multiple invocations', async () => {
    process.env.MARKET_DATA_WS_BOOTSTRAP = 'true';

    const module = await importPipelineModule();
    const { initializeMarketDataPipeline } = module;

    await initializeMarketDataPipeline();
    const connectCallsAfterFirst = connectMock.mock.calls.length;
    const subscribeCallsAfterFirst = subscribeMock.mock.calls.length;

    await initializeMarketDataPipeline();

    expect(connectMock.mock.calls.length).toBe(connectCallsAfterFirst);
    expect(subscribeMock.mock.calls.length).toBe(subscribeCallsAfterFirst);
  });

  test('should warn and fall back to defaults for invalid subscription entries', async () => {
    process.env.MARKET_DATA_WS_BOOTSTRAP = 'true';
    process.env.MARKET_DATA_WS_SUBSCRIPTIONS = 'invalid-entry';

    const { initializeMarketDataPipeline } = await importPipelineModule();

    await initializeMarketDataPipeline();

    expect(warnMock).toHaveBeenCalled();
    expect(connectMock).toHaveBeenCalledWith(
      'binance',
      expect.objectContaining({ url: expect.stringContaining('binance.com') })
    );
  });

  test('should skip duplicate subscriptions that already exist', async () => {
    process.env.MARKET_DATA_WS_BOOTSTRAP = 'true';
    process.env.MARKET_DATA_WS_SUBSCRIPTIONS = 'binance:BTC/USDT:ticker,trades';

    getSubscriptionsMock.mockImplementation(() => [
      { channel: 'ticker', symbol: 'BTC/USDT', params: undefined },
    ]);

    const { initializeMarketDataPipeline } = await importPipelineModule();

    await initializeMarketDataPipeline();

    // One connect call for binance, only the missing channel (trades) should be subscribed
    expect(connectMock).toHaveBeenCalledTimes(1);
    expect(subscribeMock).toHaveBeenCalledTimes(1);
    expect(subscribeMock).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'trades', symbol: 'BTC/USDT' })
    );
  });

  test('should apply exchange URL override from environment', async () => {
    process.env.MARKET_DATA_WS_BOOTSTRAP = 'true';
    process.env.MARKET_DATA_WS_SUBSCRIPTIONS = 'binance:BTC/USDT:ticker';
    process.env.MARKET_DATA_WS_BINANCE_URL = 'wss://custom-binance.example/ws';

    const { initializeMarketDataPipeline } = await importPipelineModule();

    await initializeMarketDataPipeline();

    expect(connectMock).toHaveBeenCalledWith(
      'binance',
      expect.objectContaining({ url: 'wss://custom-binance.example/ws' })
    );
  });

  test('should warn and continue when unsupported exchange is configured', async () => {
    process.env.MARKET_DATA_WS_BOOTSTRAP = 'true';
    process.env.MARKET_DATA_WS_SUBSCRIPTIONS = 'unsupported:BTC/USDT:ticker';

    const { initializeMarketDataPipeline } = await importPipelineModule();

    await initializeMarketDataPipeline();

    expect(warnMock).toHaveBeenCalled();
    expect(connectMock).toHaveBeenCalledWith(
      'binance',
      expect.objectContaining({ url: expect.any(String) })
    );
  });

  test('should warn when subscription entry contains only invalid channels', async () => {
    process.env.MARKET_DATA_WS_BOOTSTRAP = 'true';
    process.env.MARKET_DATA_WS_SUBSCRIPTIONS = 'binance:BTC/USDT:invalid-channel';

    const { initializeMarketDataPipeline } = await importPipelineModule();

    await initializeMarketDataPipeline();

    expect(warnMock).toHaveBeenCalled();
    expect(connectMock).toHaveBeenCalledWith(
      'binance',
      expect.objectContaining({ url: expect.stringContaining('binance.com') })
    );
  });

  test('should apply orderbook params when subscribing to depth channel', async () => {
    process.env.MARKET_DATA_WS_BOOTSTRAP = 'true';
    process.env.MARKET_DATA_WS_SUBSCRIPTIONS = 'binance:BTC/USDT:orderbook';
    process.env.MARKET_DATA_WS_ORDERBOOK_DEPTH = '50';

    const { initializeMarketDataPipeline } = await importPipelineModule();

    await initializeMarketDataPipeline();

    expect(subscribeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'orderbook',
        params: { depth: 50 },
      })
    );
  });

  test('should log error when exchange connection fails but continue execution', async () => {
    process.env.MARKET_DATA_WS_BOOTSTRAP = 'true';
    process.env.MARKET_DATA_WS_SUBSCRIPTIONS = 'binance:BTC/USDT:ticker;kraken:BTC/USD:ticker';

    connectMock.mockImplementation(async (exchangeId: ExchangeId) => {
      if (exchangeId === 'kraken') {
        throw new Error('connect failed');
      }
      connectionState.set(exchangeId, true);
    });

    const { initializeMarketDataPipeline } = await importPipelineModule();

    await initializeMarketDataPipeline();

    expect(errorMock).toHaveBeenCalledWith(
      'Failed to connect exchange WebSocket',
      expect.objectContaining({
        exchange: 'kraken',
        error: 'connect failed',
      })
    );
    expect(connectMock.mock.calls.map(([exchange]) => exchange)).toEqual(
      expect.arrayContaining(['binance', 'kraken'])
    );
  });

  test('should log error when subscription fails', async () => {
    process.env.MARKET_DATA_WS_BOOTSTRAP = 'true';
    process.env.MARKET_DATA_WS_SUBSCRIPTIONS = 'binance:BTC/USDT:ticker,trades';

    subscribeMock.mockImplementation(async (request) => {
      if (request.channel === 'trades') {
        throw new Error('subscribe failed');
      }
    });

    const { initializeMarketDataPipeline } = await importPipelineModule();

    await initializeMarketDataPipeline();

    expect(errorMock).toHaveBeenCalledWith(
      'Failed to subscribe to market data channel',
      expect.objectContaining({
        channel: 'trades',
        symbol: 'BTC/USDT',
        error: 'subscribe failed',
      })
    );
  });

  test('should fall back to default subscriptions when none are configured', async () => {
    process.env.MARKET_DATA_WS_BOOTSTRAP = 'true';

    const { initializeMarketDataPipeline } = await importPipelineModule();

    await initializeMarketDataPipeline();

    expect(connectMock).toHaveBeenCalledWith(
      'binance',
      expect.objectContaining({ url: expect.stringContaining('binance.com') })
    );
  });
});
