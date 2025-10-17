/**
 * @fileoverview Custom error classes for exchange adapters
 * @module market-data/websocket/errors
 */

import type { ExchangeId, ExchangeError } from './types';

/**
 * Base error class for exchange-related errors
 */
export class ExchangeErrorBase extends Error {
  public readonly code: string;
  public readonly exchange: ExchangeId;
  public readonly timestamp: number;
  public readonly fatal: boolean;
  public readonly originalError?: Error;

  constructor(error: ExchangeError) {
    super(error.message);
    this.name = 'ExchangeError';
    this.code = error.code;
    this.exchange = error.exchange;
    this.timestamp = error.timestamp;
    this.fatal = error.fatal;
    this.originalError = error.originalError;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): ExchangeError {
    return {
      code: this.code,
      message: this.message,
      exchange: this.exchange,
      timestamp: this.timestamp,
      fatal: this.fatal,
      originalError: this.originalError,
    };
  }
}

/**
 * Connection-related errors
 */
export class ConnectionError extends ExchangeErrorBase {
  constructor(exchange: ExchangeId, message: string, originalError?: Error) {
    super({
      code: 'CONNECTION_ERROR',
      message,
      exchange,
      timestamp: Date.now(),
      fatal: false,
      originalError,
    });
    this.name = 'ConnectionError';
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends ExchangeErrorBase {
  constructor(exchange: ExchangeId, operation: string, timeout: number) {
    super({
      code: 'TIMEOUT_ERROR',
      message: `Operation ${operation} timed out after ${timeout}ms`,
      exchange,
      timestamp: Date.now(),
      fatal: false,
    });
    this.name = 'TimeoutError';
  }
}

/**
 * Authentication errors
 */
export class AuthenticationError extends ExchangeErrorBase {
  constructor(exchange: ExchangeId, message: string) {
    super({
      code: 'AUTH_ERROR',
      message,
      exchange,
      timestamp: Date.now(),
      fatal: true,
    });
    this.name = 'AuthenticationError';
  }
}

/**
 * Subscription errors
 */
export class SubscriptionError extends ExchangeErrorBase {
  constructor(exchange: ExchangeId, channel: string, message: string) {
    super({
      code: 'SUBSCRIPTION_ERROR',
      message: `Failed to subscribe to ${channel}: ${message}`,
      exchange,
      timestamp: Date.now(),
      fatal: false,
    });
    this.name = 'SubscriptionError';
  }
}

/**
 * Message parsing errors
 */
export class MessageParsingError extends ExchangeErrorBase {
  constructor(exchange: ExchangeId, rawMessage: string, originalError: Error) {
    super({
      code: 'MESSAGE_PARSING_ERROR',
      message: `Failed to parse message: ${rawMessage.substring(0, 100)}`,
      exchange,
      timestamp: Date.now(),
      fatal: false,
      originalError,
    });
    this.name = 'MessageParsingError';
  }
}

/**
 * Rate limit errors
 */
export class RateLimitError extends ExchangeErrorBase {
  constructor(exchange: ExchangeId, retryAfter?: number) {
    super({
      code: 'RATE_LIMIT_ERROR',
      message: `Rate limit exceeded${retryAfter ? `. Retry after ${retryAfter}ms` : ''}`,
      exchange,
      timestamp: Date.now(),
      fatal: false,
    });
    this.name = 'RateLimitError';
  }
}
