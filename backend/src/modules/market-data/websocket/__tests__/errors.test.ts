/**
 * WebSocket Errors Tests
 * Tests custom error classes for exchange WebSocket adapters
 */

import { describe, it, expect } from 'bun:test';
import {
  ExchangeErrorBase,
  ConnectionError,
  TimeoutError,
  AuthenticationError,
  SubscriptionError,
  MessageParsingError,
  RateLimitError,
} from '../errors';

describe('Exchange WebSocket Errors', () => {
  describe('ConnectionError', () => {
    it('should create connection error', () => {
      const error = new ConnectionError('binance', 'Connection failed');

      expect(error.code).toBe('CONNECTION_ERROR');
      expect(error.message).toBe('Connection failed');
      expect(error.exchange).toBe('binance');
      expect(error.fatal).toBe(false);
      expect(error.name).toBe('ConnectionError');
    });

    it('should wrap original error', () => {
      const originalError = new Error('Network unreachable');
      const error = new ConnectionError('coinbase', 'Connection failed', originalError);

      expect(error.originalError).toBe(originalError);
    });

    it('should serialize connection error', () => {
      const error = new ConnectionError('binance', 'Failed to connect');
      const json = error.toJSON();

      expect(json.code).toBe('CONNECTION_ERROR');
      expect(json.message).toBe('Failed to connect');
      expect(json.fatal).toBe(false);
    });

    it('should extend Error and ExchangeErrorBase', () => {
      const error = new ConnectionError('binance', 'Test');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ExchangeErrorBase);
      expect(error).toBeInstanceOf(ConnectionError);
    });
  });

  describe('TimeoutError', () => {
    it('should create timeout error', () => {
      const error = new TimeoutError('binance', 'ping', 5000);

      expect(error.code).toBe('TIMEOUT_ERROR');
      expect(error.message).toContain('ping');
      expect(error.message).toContain('5000ms');
      expect(error.exchange).toBe('binance');
      expect(error.fatal).toBe(false);
      expect(error.name).toBe('TimeoutError');
    });

    it('should format message with operation and timeout', () => {
      const error = new TimeoutError('kraken', 'connection', 10000);

      expect(error.message).toBe('Operation connection timed out after 10000ms');
    });

    it('should serialize timeout error', () => {
      const error = new TimeoutError('coinbase', 'subscribe', 3000);
      const json = error.toJSON();

      expect(json.code).toBe('TIMEOUT_ERROR');
      expect(json.message).toContain('subscribe');
      expect(json.message).toContain('3000ms');
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error', () => {
      const error = new AuthenticationError('binance', 'Invalid API key');

      expect(error.code).toBe('AUTH_ERROR');
      expect(error.message).toBe('Invalid API key');
      expect(error.fatal).toBe(true); // Auth errors are always fatal
      expect(error.name).toBe('AuthenticationError');
    });

    it('should always be fatal', () => {
      const error1 = new AuthenticationError('kraken', 'Auth failed');
      const error2 = new AuthenticationError('coinbase', 'Invalid signature');

      expect(error1.fatal).toBe(true);
      expect(error2.fatal).toBe(true);
    });

    it('should serialize authentication error', () => {
      const error = new AuthenticationError('binance', 'API key expired');
      const json = error.toJSON();

      expect(json.code).toBe('AUTH_ERROR');
      expect(json.fatal).toBe(true);
      expect(json.message).toBe('API key expired');
    });
  });

  describe('SubscriptionError', () => {
    it('should create subscription error', () => {
      const error = new SubscriptionError('binance', 'ticker', 'Invalid symbol');

      expect(error.code).toBe('SUBSCRIPTION_ERROR');
      expect(error.message).toContain('ticker');
      expect(error.message).toContain('Invalid symbol');
      expect(error.name).toBe('SubscriptionError');
    });

    it('should format message with channel', () => {
      const error = new SubscriptionError('kraken', 'trades', 'Subscription limit reached');

      expect(error.message).toBe('Failed to subscribe to trades: Subscription limit reached');
    });

    it('should serialize subscription error', () => {
      const error = new SubscriptionError('coinbase', 'orderbook', 'Failed');
      const json = error.toJSON();

      expect(json.code).toBe('SUBSCRIPTION_ERROR');
      expect(json.message).toContain('orderbook');
    });
  });

  describe('MessageParsingError', () => {
    it('should create message parsing error', () => {
      const rawMessage = '{"invalid": json}';
      const parseError = new Error('Unexpected token');
      const error = new MessageParsingError('binance', rawMessage, parseError);

      expect(error.code).toBe('MESSAGE_PARSING_ERROR');
      expect(error.message).toContain('Failed to parse message');
      expect(error.originalError).toBe(parseError);
      expect(error.name).toBe('MessageParsingError');
    });

    it('should truncate long messages in error text', () => {
      const longMessage = 'x'.repeat(200);
      const error = new MessageParsingError('kraken', longMessage, new Error('Parse failed'));

      // Message is truncated to 100 chars in implementation
      expect(error.message.length).toBeLessThan(longMessage.length + 50);
    });

    it('should serialize with original error', () => {
      const rawMessage = '{"event": "error"}';
      const parseError = new Error('Invalid');
      const error = new MessageParsingError('binance', rawMessage, parseError);
      const json = error.toJSON();

      expect(json.code).toBe('MESSAGE_PARSING_ERROR');
      expect(json.originalError).toBe(parseError);
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error with retry time', () => {
      const error = new RateLimitError('binance', 60000);

      expect(error.code).toBe('RATE_LIMIT_ERROR');
      expect(error.message).toContain('60000ms');
      expect(error.message).toContain('Rate limit exceeded');
      expect(error.name).toBe('RateLimitError');
    });

    it('should create rate limit error without retry time', () => {
      const error = new RateLimitError('kraken');

      expect(error.code).toBe('RATE_LIMIT_ERROR');
      expect(error.message).toBe('Rate limit exceeded');
    });

    it('should format message correctly', () => {
      const error1 = new RateLimitError('binance', 30000);
      const error2 = new RateLimitError('coinbase');

      expect(error1.message).toBe('Rate limit exceeded. Retry after 30000ms');
      expect(error2.message).toBe('Rate limit exceeded');
    });

    it('should serialize rate limit error', () => {
      const error = new RateLimitError('coinbase', 120000);
      const json = error.toJSON();

      expect(json.code).toBe('RATE_LIMIT_ERROR');
      expect(json.message).toContain('120000ms');
    });
  });

  describe('Error Hierarchy', () => {
    it('should all extend ExchangeErrorBase', () => {
      const errors = [
        new ConnectionError('binance', 'Failed'),
        new TimeoutError('binance', 'ping', 5000),
        new AuthenticationError('binance', 'Invalid key'),
        new SubscriptionError('binance', 'ticker', 'Failed'),
        new MessageParsingError('binance', '{}', new Error('Invalid')),
        new RateLimitError('binance', 5000),
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(ExchangeErrorBase);
      });
    });

    it('should all extend Error', () => {
      const errors = [
        new ConnectionError('binance', 'Failed'),
        new TimeoutError('binance', 'ping', 5000),
        new AuthenticationError('binance', 'Invalid'),
        new SubscriptionError('binance', 'ticker', 'Failed'),
        new MessageParsingError('binance', '{}', new Error('Invalid')),
        new RateLimitError('binance', 5000),
      ];

      errors.forEach((error) => {
        expect(error).toBeInstanceOf(Error);
      });
    });

    it('should have unique error codes', () => {
      const codes = [
        new ConnectionError('binance', 'a').code,
        new TimeoutError('binance', 'ping', 5000).code,
        new AuthenticationError('binance', 'a').code,
        new SubscriptionError('binance', 'ticker', 'a').code,
        new MessageParsingError('binance', '{}', new Error('a')).code,
        new RateLimitError('binance', 5000).code,
      ];

      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });
  });

  describe('Error Recovery Hints', () => {
    it('should indicate which errors are fatal', () => {
      const authError = new AuthenticationError('binance', 'Invalid key');
      expect(authError.fatal).toBe(true);

      const nonFatalErrors = [
        new ConnectionError('binance', 'Failed'),
        new TimeoutError('binance', 'ping', 5000),
        new SubscriptionError('binance', 'ticker', 'Failed'),
        new MessageParsingError('binance', '{}', new Error('Invalid')),
        new RateLimitError('binance', 5000),
      ];

      nonFatalErrors.forEach((error) => {
        expect(error.fatal).toBe(false);
      });
    });

    it('should preserve stack traces', () => {
      const error = new ConnectionError('binance', 'Test');

      expect(error.stack).toBeTruthy();
      expect(error.stack).toContain('ConnectionError');
    });

    it('should include timestamps', () => {
      const before = Date.now();
      const error = new ConnectionError('binance', 'Test');
      const after = Date.now();

      expect(error.timestamp).toBeGreaterThanOrEqual(before);
      expect(error.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('JSON Serialization', () => {
    it('should serialize all error types correctly', () => {
      const errors = [
        new ConnectionError('binance', 'Failed'),
        new TimeoutError('binance', 'ping', 5000),
        new AuthenticationError('binance', 'Invalid'),
        new SubscriptionError('binance', 'ticker', 'Failed'),
        new MessageParsingError('binance', '{}', new Error('Invalid')),
        new RateLimitError('binance', 5000),
      ];

      errors.forEach((error) => {
        const json = error.toJSON();
        expect(json.code).toBeTruthy();
        expect(json.message).toBeTruthy();
        expect(json.exchange).toBe('binance');
        expect(json.timestamp).toBeGreaterThan(0);
        expect(typeof json.fatal).toBe('boolean');
      });
    });
  });
});
