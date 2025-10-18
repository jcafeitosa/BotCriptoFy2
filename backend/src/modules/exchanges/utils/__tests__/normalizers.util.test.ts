import { describe, expect, test } from 'bun:test';
import {
  normalizeTicker,
  normalizeTrades,
  normalizeOrderBook,
  normalizeCandles,
  normalizeBalances,
  normalizeMarketSummary,
} from '../normalizers.util';

describe('exchanges normalizers', () => {
  test('normalizeTicker handles missing optional fields', () => {
    const normalized = normalizeTicker('binance' as any, {
      symbol: 'BTC/USDT',
      last: '12345.67',
      bid: '12340.1',
      ask: '12346.9',
      high: '12500',
      low: '12000',
      baseVolume: '100',
      quoteVolume: '1234567',
      percentage: '1.5',
      timestamp: 1710000000000,
    });

    expect(normalized).toEqual({
      exchange: 'binance',
      symbol: 'BTC/USDT',
      timestamp: 1710000000000,
      last: 12345.67,
      bid: 12340.1,
      ask: 12346.9,
      high24h: 12500,
      low24h: 12000,
      baseVolume24h: 100,
      quoteVolume24h: 1234567,
      change24h: 1.5,
    });
  });

  test('normalizeTrades converts trades array to normalized format', () => {
    const result = normalizeTrades('binance' as any, [
      {
        id: '1',
        symbol: 'ETH/USDT',
        timestamp: 1700000000000,
        price: '2000.5',
        amount: '1.23',
        side: 'buy',
        takerOrMaker: 'taker',
      },
    ]);

    expect(result).toEqual([
      {
        exchange: 'binance',
        symbol: 'ETH/USDT',
        id: '1',
        timestamp: 1700000000000,
        price: 2000.5,
        amount: 1.23,
        side: 'buy',
        takerOrMaker: 'taker',
      },
    ]);
  });

  test('normalizeOrderBook maps bid/ask levels', () => {
    const data = normalizeOrderBook('binance' as any, 'BTC/USDT', {
      bids: [
        [12340, 0.5],
        [12339, 0.4],
      ],
      asks: [
        [12341, 0.6],
        [12342, 0.3],
      ],
      timestamp: 1720000000000,
    });

    expect(data).toEqual({
      exchange: 'binance',
      symbol: 'BTC/USDT',
      timestamp: 1720000000000,
      bids: [
        { price: 12340, amount: 0.5 },
        { price: 12339, amount: 0.4 },
      ],
      asks: [
        { price: 12341, amount: 0.6 },
        { price: 12342, amount: 0.3 },
      ],
    });
  });

  test('normalizeCandles converts OHLCV arrays', () => {
    const data = normalizeCandles('binance' as any, 'BTC/USDT', '1m', [
      [1700000000000, 10, 12, 9, 11, 100],
    ]);

    expect(data).toEqual([
      {
        exchange: 'binance',
        symbol: 'BTC/USDT',
        timeframe: '1m',
        timestamp: 1700000000000,
        open: 10,
        high: 12,
        low: 9,
        close: 11,
        volume: 100,
      },
    ]);
  });

  test('normalizeBalances derives totals safely', () => {
    const data = normalizeBalances(
      'binance' as any,
      {
        total: { BTC: '1.5', ETH: '2.0' },
        free: { BTC: '1.0', ETH: '1.5' },
        used: { BTC: '0.5' },
      },
      1710000000
    );

    expect(data).toEqual([
      {
        exchange: 'binance',
        currency: 'BTC',
        free: 1,
        used: 0.5,
        total: 1.5,
        timestamp: 1710000000,
      },
      {
        exchange: 'binance',
        currency: 'ETH',
        free: 1.5,
        used: 0.5,
        total: 2,
        timestamp: 1710000000,
      },
    ]);
  });

  test('normalizeMarketSummary keeps precision and limits', () => {
    const market = normalizeMarketSummary('BTC/USDT', {
      base: 'BTC',
      quote: 'USDT',
      type: 'spot',
      active: true,
      margin: true,
      swap: false,
      future: false,
      spot: true,
      precision: { amount: 0.0001, price: 0.01 },
      limits: {
        amount: { min: 0.001, max: 100 },
        price: { min: 100, max: 100000 },
        cost: { min: 10 },
      },
      info: { example: true },
    });

    expect(market).toEqual({
      symbol: 'BTC/USDT',
      base: 'BTC',
      quote: 'USDT',
      type: 'spot',
      active: true,
      margin: true,
      swap: false,
      future: false,
      spot: true,
      precision: { amount: 0.0001, price: 0.01 },
      limits: {
        amount: { min: 0.001, max: 100 },
        price: { min: 100, max: 100000 },
        cost: { min: 10 },
      },
      info: { example: true },
    });
  });
});
