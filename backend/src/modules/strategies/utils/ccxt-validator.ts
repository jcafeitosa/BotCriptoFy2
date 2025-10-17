/**
 * CCXT Validator
 * Validates exchange capabilities and normalizes data formats
 */

import { BadRequestError } from '@/utils/errors';
import type { TradingStrategy, Timeframe } from '../types/strategies.types';

/**
 * CCXT Timeframe mapping
 * Maps our timeframe format to CCXT format
 */
export const CCXT_TIMEFRAMES: Record<Timeframe, string> = {
  '1m': '1m',
  '3m': '3m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '1h',
  '2h': '2h',
  '4h': '4h',
  '6h': '6h',
  '12h': '12h',
  '1d': '1d',
  '1w': '1w',
  '1M': '1M',
};

/**
 * Normalize symbol to CCXT format
 * BTC/USDT → BTC/USDT (CCXT format)
 */
export function normalizeSymbol(symbol: string): string {
  // CCXT uses base/quote format (e.g., BTC/USDT)
  if (!/^[A-Z0-9]{2,10}\/[A-Z0-9]{2,10}$/.test(symbol)) {
    throw new BadRequestError(`Invalid symbol format: ${symbol}. Expected format: BTC/USDT`);
  }

  return symbol;
}

/**
 * Normalize timeframe to CCXT format
 */
export function normalizeTimeframe(timeframe: Timeframe): string {
  const ccxtTimeframe = CCXT_TIMEFRAMES[timeframe];

  if (!ccxtTimeframe) {
    throw new BadRequestError(`Unsupported timeframe: ${timeframe}`);
  }

  return ccxtTimeframe;
}

/**
 * Normalize price/amount to exchange precision
 * Uses CCXT exchange.amountToPrecision() and exchange.priceToPrecision()
 */
export function normalizePrecision(
  exchange: any,
  symbol: string,
  value: number,
  type: 'amount' | 'price'
): number {
  if (!exchange || !exchange.markets || !exchange.markets[symbol]) {
    throw new BadRequestError(`Symbol ${symbol} not found on exchange`);
  }

  try {
    if (type === 'amount') {
      return parseFloat(exchange.amountToPrecision(symbol, value));
    } else {
      return parseFloat(exchange.priceToPrecision(symbol, value));
    }
  } catch (error) {
    throw new BadRequestError(
      `Failed to normalize ${type} precision: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Validate exchange capabilities for strategy
 */
export async function validateExchangeCapabilities(
  exchangeId: string,
  strategy: TradingStrategy
): Promise<void> {
  // Import exchange service dynamically to avoid circular dependencies
  const { getExchange } = await import('../../exchanges/services/exchange.service');

  // Get exchange instance
  const exchange = await getExchange(exchangeId);

  if (!exchange) {
    throw new BadRequestError(`Exchange not found or not configured: ${exchangeId}`);
  }

  // Check if fetchOHLCV is supported
  if (!exchange.has['fetchOHLCV']) {
    throw new BadRequestError(
      `Exchange ${exchangeId} does not support OHLCV data fetching. This is required for strategy execution.`
    );
  }

  // Normalize and check timeframe support
  const ccxtTimeframe = normalizeTimeframe(strategy.timeframe);

  if (!exchange.timeframes || !exchange.timeframes[ccxtTimeframe]) {
    const supportedTimeframes = exchange.timeframes
      ? Object.keys(exchange.timeframes).join(', ')
      : 'none';
    throw new BadRequestError(
      `Timeframe ${strategy.timeframe} (${ccxtTimeframe}) is not supported by ${exchangeId}. Supported: ${supportedTimeframes}`
    );
  }

  // Normalize and check symbol
  const normalizedSymbol = normalizeSymbol(strategy.symbol);

  // Load markets if not loaded
  if (!exchange.markets || Object.keys(exchange.markets).length === 0) {
    await exchange.loadMarkets();
  }

  if (!exchange.markets[normalizedSymbol]) {
    throw new BadRequestError(
      `Symbol ${strategy.symbol} not found on ${exchangeId}. Please verify the symbol exists and is active.`
    );
  }

  // Check if symbol is active
  const market = exchange.markets[normalizedSymbol];
  if (market.active === false) {
    throw new BadRequestError(
      `Symbol ${strategy.symbol} is not active on ${exchangeId}. Trading is currently disabled for this pair.`
    );
  }

  // Check trading permissions (if exchange supports it)
  if (market.spot === false && market.futures === false && market.swap === false) {
    throw new BadRequestError(
      `Symbol ${strategy.symbol} does not support any trading type on ${exchangeId}`
    );
  }

  // Validate limits
  if (market.limits) {
    const { amount } = market.limits;

    if (strategy.maxPositionSize) {
      // Check against minimum amount
      if (amount?.min && strategy.maxPositionSize < amount.min) {
        throw new BadRequestError(
          `Max position size ${strategy.maxPositionSize} is below minimum allowed (${amount.min}) for ${strategy.symbol} on ${exchangeId}`
        );
      }

      // Check against maximum amount
      if (amount?.max && strategy.maxPositionSize > amount.max) {
        throw new BadRequestError(
          `Max position size ${strategy.maxPositionSize} exceeds maximum allowed (${amount.max}) for ${strategy.symbol} on ${exchangeId}`
        );
      }
    }
  }
}

/**
 * Handle CCXT-specific errors
 * Provides better error messages for common CCXT issues
 */
export async function handleCCXTError(error: any): Promise<never> {
  const ccxt = await import('ccxt');

  if (error instanceof ccxt.NetworkError) {
    if (error instanceof ccxt.RequestTimeout) {
      throw new BadRequestError('Exchange request timeout. Please try again.');
    } else if (error instanceof ccxt.DDoSProtection) {
      throw new BadRequestError('Exchange DDoS protection triggered. Please wait and try again.');
    } else {
      throw new BadRequestError('Network error communicating with exchange. Please check your connection.');
    }
  } else if (error instanceof ccxt.ExchangeError) {
    if (error instanceof ccxt.AuthenticationError) {
      throw new BadRequestError('Exchange authentication failed. Please check your API keys.');
    } else if (error instanceof ccxt.PermissionDenied) {
      throw new BadRequestError('Permission denied. Please check your API key permissions.');
    } else if (error instanceof ccxt.InsufficientFunds) {
      throw new BadRequestError('Insufficient funds in exchange account.');
    } else if (error instanceof ccxt.InvalidOrder) {
      throw new BadRequestError(`Invalid order: ${error.message}`);
    } else if (error instanceof ccxt.OrderNotFound) {
      throw new BadRequestError('Order not found on exchange.');
    } else if (error instanceof ccxt.RateLimitExceeded) {
      throw new BadRequestError('Exchange rate limit exceeded. Please wait before retrying.');
    } else if (error instanceof ccxt.ExchangeNotAvailable) {
      throw new BadRequestError('Exchange is currently unavailable. Please try again later.');
    } else {
      throw new BadRequestError(`Exchange error: ${error.message}`);
    }
  } else if (error instanceof ccxt.NotSupported) {
    throw new BadRequestError(`Operation not supported: ${error.message}`);
  } else {
    // Re-throw unknown errors
    throw error;
  }
}

/**
 * Rate limiter for CCXT requests
 * Prevents hitting exchange rate limits
 */
export class CCXTRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second

  constructor(tokensPerSecond: number = 10, maxTokens: number = 20) {
    this.maxTokens = maxTokens;
    this.refillRate = tokensPerSecond;
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Wait until a token is available
   */
  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens < 1) {
      const waitTime = (1 - this.tokens) / this.refillRate * 1000; // Convert to ms
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      this.refill();
    }

    this.tokens -= 1;
  }

  /**
   * Refill tokens based on time elapsed
   */
  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // Convert to seconds
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Get current token count
   */
  getTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Reset rate limiter
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }
}

// Global rate limiter per exchange
const exchangeRateLimiters = new Map<string, CCXTRateLimiter>();

/**
 * Get rate limiter for exchange
 */
export function getRateLimiter(exchangeId: string): CCXTRateLimiter {
  if (!exchangeRateLimiters.has(exchangeId)) {
    // Default: 10 requests per second, burst of 20
    exchangeRateLimiters.set(exchangeId, new CCXTRateLimiter(10, 20));
  }

  return exchangeRateLimiters.get(exchangeId)!;
}

/**
 * Execute CCXT operation with rate limiting
 */
export async function withRateLimit<T>(
  exchangeId: string,
  operation: () => Promise<T>
): Promise<T> {
  const rateLimiter = getRateLimiter(exchangeId);

  // Wait for rate limit
  await rateLimiter.acquire();

  try {
    return await operation();
  } catch (error) {
    handleCCXTError(error);
  }
}
