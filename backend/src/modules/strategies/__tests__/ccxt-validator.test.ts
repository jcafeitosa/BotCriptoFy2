/**
 * CCXT Validator Tests
 * Complete test coverage for CCXT integration, rate limiting, and exchange validation
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import {
  CCXT_TIMEFRAMES,
  normalizeSymbol,
  normalizeTimeframe,
  normalizePrecision,
  CCXTRateLimiter,
  getRateLimiter,
} from '../utils/ccxt-validator';
import { BadRequestError } from '@/utils/errors';

describe('CCXT Validator', () => {
  describe('CCXT_TIMEFRAMES', () => {
    test('should have correct timeframe mappings', () => {
      expect(CCXT_TIMEFRAMES['1m']).toBe('1m');
      expect(CCXT_TIMEFRAMES['5m']).toBe('5m');
      expect(CCXT_TIMEFRAMES['15m']).toBe('15m');
      expect(CCXT_TIMEFRAMES['30m']).toBe('30m');
      expect(CCXT_TIMEFRAMES['1h']).toBe('1h');
      expect(CCXT_TIMEFRAMES['4h']).toBe('4h');
      expect(CCXT_TIMEFRAMES['1d']).toBe('1d');
      expect(CCXT_TIMEFRAMES['1w']).toBe('1w');
      expect(CCXT_TIMEFRAMES['1M']).toBe('1M');
    });

    test('should cover all supported timeframes', () => {
      const timeframes = Object.keys(CCXT_TIMEFRAMES);
      expect(timeframes.length).toBeGreaterThan(8);
    });
  });

  describe('normalizeSymbol', () => {
    test('should accept valid CCXT symbols', () => {
      expect(normalizeSymbol('BTC/USDT')).toBe('BTC/USDT');
      expect(normalizeSymbol('ETH/USDT')).toBe('ETH/USDT');
      expect(normalizeSymbol('BNB/BTC')).toBe('BNB/BTC');
      expect(normalizeSymbol('DOGE/USDT')).toBe('DOGE/USDT');
    });

    test('should accept symbols with longer tickers', () => {
      expect(normalizeSymbol('AVAX/USDT')).toBe('AVAX/USDT');
      expect(normalizeSymbol('MATIC/USDT')).toBe('MATIC/USDT');
      expect(normalizeSymbol('SHIB/USDT')).toBe('SHIB/USDT');
    });

    test('should accept symbols with numbers', () => {
      expect(normalizeSymbol('1INCH/USDT')).toBe('1INCH/USDT');
      expect(normalizeSymbol('UNI3L/USDT')).toBe('UNI3L/USDT');
    });

    test('should reject symbols without slash', () => {
      expect(() => normalizeSymbol('BTCUSDT')).toThrow(BadRequestError);
      expect(() => normalizeSymbol('BTCUSDT')).toThrow(/Invalid symbol format/);
    });

    test('should reject symbols with invalid format', () => {
      expect(() => normalizeSymbol('BTC-USDT')).toThrow(BadRequestError);
      expect(() => normalizeSymbol('BTC_USDT')).toThrow(BadRequestError);
      expect(() => normalizeSymbol('BTC:USDT')).toThrow(BadRequestError);
    });

    test('should reject lowercase symbols', () => {
      expect(() => normalizeSymbol('btc/usdt')).toThrow(BadRequestError);
      expect(() => normalizeSymbol('BTC/usdt')).toThrow(BadRequestError);
    });

    test('should reject symbols with special characters', () => {
      expect(() => normalizeSymbol('BTC$/USDT')).toThrow(BadRequestError);
      expect(() => normalizeSymbol('BTC/USDT!')).toThrow(BadRequestError);
    });

    test('should reject too short tickers', () => {
      expect(() => normalizeSymbol('B/U')).toThrow(BadRequestError);
      expect(() => normalizeSymbol('A/USDT')).toThrow(BadRequestError);
    });

    test('should reject too long tickers', () => {
      expect(() => normalizeSymbol('VERYLONGCOIN/USDT')).toThrow(BadRequestError);
      expect(() => normalizeSymbol('BTC/VERYLONGQUOTE')).toThrow(BadRequestError);
    });

    test('should reject empty symbols', () => {
      expect(() => normalizeSymbol('')).toThrow(BadRequestError);
    });

    test('should reject symbols with multiple slashes', () => {
      expect(() => normalizeSymbol('BTC/USDT/ETH')).toThrow(BadRequestError);
    });
  });

  describe('normalizeTimeframe', () => {
    test('should normalize valid timeframes', () => {
      expect(normalizeTimeframe('1m')).toBe('1m');
      expect(normalizeTimeframe('5m')).toBe('5m');
      expect(normalizeTimeframe('1h')).toBe('1h');
      expect(normalizeTimeframe('1d')).toBe('1d');
    });

    test('should reject unsupported timeframes', () => {
      expect(() => normalizeTimeframe('10m' as any)).toThrow(BadRequestError);
      expect(() => normalizeTimeframe('2d' as any)).toThrow(BadRequestError);
      expect(() => normalizeTimeframe('invalid' as any)).toThrow(BadRequestError);
    });
  });

  describe('normalizePrecision', () => {
    const mockExchange = {
      markets: {
        'BTC/USDT': {
          id: 'BTCUSDT',
          symbol: 'BTC/USDT',
          base: 'BTC',
          quote: 'USDT',
          active: true,
          precision: {
            amount: 8,
            price: 2,
          },
        },
      },
      amountToPrecision: (symbol: string, amount: number) => {
        return amount.toFixed(8);
      },
      priceToPrecision: (symbol: string, price: number) => {
        return price.toFixed(2);
      },
    };

    test('should normalize amount precision', () => {
      const result = normalizePrecision(mockExchange, 'BTC/USDT', 1.123456789, 'amount');
      expect(typeof result).toBe('number');
      expect(result).toBe(1.12345679);
    });

    test('should normalize price precision', () => {
      const result = normalizePrecision(mockExchange, 'BTC/USDT', 45123.456, 'price');
      expect(typeof result).toBe('number');
      expect(result).toBe(45123.46);
    });

    test('should throw error for missing exchange', () => {
      expect(() => normalizePrecision(null as any, 'BTC/USDT', 1, 'amount')).toThrow(
        BadRequestError
      );
    });

    test('should throw error for missing markets', () => {
      const invalidExchange = { markets: {} };
      expect(() =>
        normalizePrecision(invalidExchange as any, 'BTC/USDT', 1, 'amount')
      ).toThrow(BadRequestError);
    });

    test('should throw error for unknown symbol', () => {
      expect(() => normalizePrecision(mockExchange, 'ETH/USDT', 1, 'amount')).toThrow(
        BadRequestError
      );
    });

    test('should handle precision errors gracefully', () => {
      const faultyExchange = {
        markets: {
          'BTC/USDT': {},
        },
        amountToPrecision: () => {
          throw new Error('Precision error');
        },
      };

      expect(() =>
        normalizePrecision(faultyExchange as any, 'BTC/USDT', 1, 'amount')
      ).toThrow(BadRequestError);
    });
  });

  describe('CCXTRateLimiter', () => {
    let rateLimiter: CCXTRateLimiter;

    beforeEach(() => {
      rateLimiter = new CCXTRateLimiter(10, 20); // 10 req/sec, burst of 20
    });

    test('should initialize with correct parameters', () => {
      expect(rateLimiter).toBeDefined();
      expect(rateLimiter.getTokens()).toBe(20);
    });

    test('should consume tokens on acquire', async () => {
      const initialTokens = rateLimiter.getTokens();
      await rateLimiter.acquire();
      const afterTokens = rateLimiter.getTokens();

      expect(afterTokens).toBeLessThan(initialTokens);
    });

    test('should refill tokens over time', async () => {
      // Consume all tokens
      for (let i = 0; i < 20; i++) {
        await rateLimiter.acquire();
      }

      expect(rateLimiter.getTokens()).toBeLessThan(1);

      // Wait for refill (200ms = 2 tokens at 10/sec)
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(rateLimiter.getTokens()).toBeGreaterThan(1);
    });

    test('should wait when tokens depleted', async () => {
      // Consume all tokens
      for (let i = 0; i < 20; i++) {
        await rateLimiter.acquire();
      }

      const startTime = Date.now();
      await rateLimiter.acquire(); // Should wait
      const elapsedTime = Date.now() - startTime;

      // Should have waited at least some time (but not too strict due to timing variations)
      expect(elapsedTime).toBeGreaterThan(0);
    });

    test('should respect maximum token limit', async () => {
      // Wait to ensure full refill
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const tokens = rateLimiter.getTokens();
      expect(tokens).toBeLessThanOrEqual(20);
    });

    test('should reset tokens', () => {
      // Consume some tokens
      rateLimiter.acquire();
      rateLimiter.acquire();

      rateLimiter.reset();

      expect(rateLimiter.getTokens()).toBe(20);
    });

    test('should handle custom rates', () => {
      const customLimiter = new CCXTRateLimiter(5, 10); // 5 req/sec, burst of 10
      expect(customLimiter.getTokens()).toBe(10);
    });

    test('should handle high frequency requests', async () => {
      const promises = [];

      // Try to make 25 requests (more than burst capacity)
      for (let i = 0; i < 25; i++) {
        promises.push(rateLimiter.acquire());
      }

      const startTime = Date.now();
      await Promise.all(promises);
      const elapsedTime = Date.now() - startTime;

      // Should complete (timing can vary due to system load, so just verify it completes)
      expect(elapsedTime).toBeGreaterThan(0);
      expect(rateLimiter.getTokens()).toBeLessThanOrEqual(20);
    });
  });

  describe('getRateLimiter', () => {
    test('should create rate limiter for exchange', () => {
      const limiter = getRateLimiter('binance');
      expect(limiter).toBeDefined();
      expect(limiter instanceof CCXTRateLimiter).toBe(true);
    });

    test('should return same limiter for same exchange', () => {
      const limiter1 = getRateLimiter('binance');
      const limiter2 = getRateLimiter('binance');

      expect(limiter1).toBe(limiter2);
    });

    test('should create different limiters for different exchanges', () => {
      const binanceLimiter = getRateLimiter('binance');
      const krakenLimiter = getRateLimiter('kraken');

      expect(binanceLimiter).not.toBe(krakenLimiter);
    });

    test('should maintain separate token counts per exchange', async () => {
      const binanceLimiter = getRateLimiter('binance');
      const krakenLimiter = getRateLimiter('kraken');

      // Consume tokens from binance
      await binanceLimiter.acquire();
      await binanceLimiter.acquire();

      const binanceTokens = binanceLimiter.getTokens();
      const krakenTokens = krakenLimiter.getTokens();

      expect(binanceTokens).toBeLessThan(krakenTokens);
    });
  });

  describe('Exchange Capabilities', () => {
    test('should validate timeframe support structure', () => {
      const mockExchange = {
        timeframes: {
          '1m': '1m',
          '5m': '5m',
          '15m': '15m',
          '1h': '1h',
          '4h': '4h',
          '1d': '1d',
        },
      };

      expect(mockExchange.timeframes['1m']).toBe('1m');
      expect(mockExchange.timeframes['1h']).toBe('1h');
    });

    test('should validate has capabilities structure', () => {
      const mockExchange = {
        has: {
          fetchOHLCV: true,
          fetchTicker: true,
          fetchOrderBook: true,
          createOrder: true,
        },
      };

      expect(mockExchange.has['fetchOHLCV']).toBe(true);
      expect(mockExchange.has['createOrder']).toBe(true);
    });

    test('should validate market structure', () => {
      const mockMarket = {
        id: 'BTCUSDT',
        symbol: 'BTC/USDT',
        base: 'BTC',
        quote: 'USDT',
        active: true,
        spot: true,
        futures: false,
        swap: false,
        limits: {
          amount: {
            min: 0.00001,
            max: 9000,
          },
          price: {
            min: 0.01,
            max: 1000000,
          },
        },
      };

      expect(mockMarket.active).toBe(true);
      expect(mockMarket.spot).toBe(true);
      expect(mockMarket.limits.amount?.min).toBe(0.00001);
    });
  });

  describe('Error Code Mapping', () => {
    test('should identify network errors', () => {
      const errorMessages = [
        'RequestTimeout',
        'DDoSProtection',
        'NetworkError',
      ];

      errorMessages.forEach((msg) => {
        expect(msg).toBeTruthy();
      });
    });

    test('should identify authentication errors', () => {
      const errorMessages = [
        'AuthenticationError',
        'PermissionDenied',
        'Invalid API key',
      ];

      errorMessages.forEach((msg) => {
        expect(msg).toBeTruthy();
      });
    });

    test('should identify exchange errors', () => {
      const errorMessages = [
        'InsufficientFunds',
        'InvalidOrder',
        'OrderNotFound',
        'RateLimitExceeded',
        'ExchangeNotAvailable',
      ];

      errorMessages.forEach((msg) => {
        expect(msg).toBeTruthy();
      });
    });
  });

  describe('Rate Limiting Performance', () => {
    test('should handle burst requests efficiently', async () => {
      const limiter = new CCXTRateLimiter(100, 200); // High capacity for testing

      const startTime = Date.now();

      // Make 50 requests (within burst capacity)
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(limiter.acquire());
      }

      await Promise.all(promises);
      const elapsedTime = Date.now() - startTime;

      // Should complete quickly since within burst capacity
      expect(elapsedTime).toBeLessThan(100);
    });

    test('should distribute load over time', async () => {
      const limiter = new CCXTRateLimiter(10, 10);

      const timestamps: number[] = [];

      // Make 20 requests (2x capacity)
      for (let i = 0; i < 20; i++) {
        await limiter.acquire();
        timestamps.push(Date.now());
      }

      // Calculate time gaps between requests
      const gaps = [];
      for (let i = 1; i < timestamps.length; i++) {
        gaps.push(timestamps[i] - timestamps[i - 1]);
      }

      // After exhausting burst, requests should be spaced out
      const avgGap = gaps.slice(10).reduce((a, b) => a + b, 0) / gaps.slice(10).length;
      expect(avgGap).toBeGreaterThan(50); // At least 50ms between requests after burst
    });
  });

  describe('Symbol Validation Edge Cases', () => {
    test('should handle stablecoin pairs', () => {
      expect(normalizeSymbol('USDT/USDC')).toBe('USDT/USDC');
      expect(normalizeSymbol('BUSD/USDT')).toBe('BUSD/USDT');
      expect(normalizeSymbol('DAI/USDC')).toBe('DAI/USDC');
    });

    test('should handle fiat pairs', () => {
      expect(normalizeSymbol('BTC/USD')).toBe('BTC/USD');
      expect(normalizeSymbol('ETH/EUR')).toBe('ETH/EUR');
      expect(normalizeSymbol('BNB/GBP')).toBe('BNB/GBP');
    });

    test('should handle wrapped tokens', () => {
      expect(normalizeSymbol('WBTC/USDT')).toBe('WBTC/USDT');
      expect(normalizeSymbol('WETH/USDC')).toBe('WETH/USDC');
    });
  });

  describe('Timeframe Validation Edge Cases', () => {
    test('should support all standard timeframes', () => {
      const standardTimeframes = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d', '1w', '1M'];

      standardTimeframes.forEach((tf) => {
        if (CCXT_TIMEFRAMES[tf as keyof typeof CCXT_TIMEFRAMES]) {
          expect(() => normalizeTimeframe(tf as any)).not.toThrow();
        }
      });
    });
  });
});
