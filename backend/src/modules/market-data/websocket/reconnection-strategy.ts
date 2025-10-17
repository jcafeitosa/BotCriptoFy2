/**
 * @fileoverview Exponential backoff reconnection strategy
 * @module market-data/websocket/reconnection-strategy
 */

import type { ReconnectionConfig } from './types';

/**
 * Implements exponential backoff with jitter for reconnection attempts
 */
export class ReconnectionStrategy {
  private currentAttempt = 0;
  private readonly config: ReconnectionConfig;

  constructor(config: ReconnectionConfig) {
    this.config = config;
    this.validateConfig();
  }

  /**
   * Calculate next reconnection delay with exponential backoff and jitter
   * Formula: min(maxDelay, initialDelay * multiplier^attempt) * (1 ± jitter)
   */
  public getNextDelay(): number {
    const exponentialDelay =
      this.config.initialDelay * Math.pow(this.config.backoffMultiplier, this.currentAttempt);

    const cappedDelay = Math.min(exponentialDelay, this.config.maxDelay);

    return this.applyJitter(cappedDelay);
  }

  /**
   * Record a reconnection attempt
   * @returns true if should retry, false if max attempts reached
   */
  public recordAttempt(): boolean {
    this.currentAttempt++;

    if (this.config.maxAttempts === 0) {
      return true; // Infinite retries
    }

    return this.currentAttempt < this.config.maxAttempts;
  }

  /**
   * Reset attempt counter (called on successful connection)
   */
  public reset(): void {
    this.currentAttempt = 0;
  }

  /**
   * Get current attempt number
   */
  public getCurrentAttempt(): number {
    return this.currentAttempt;
  }

  /**
   * Check if max attempts reached
   */
  public isMaxAttemptsReached(): boolean {
    if (this.config.maxAttempts === 0) {
      return false;
    }
    return this.currentAttempt >= this.config.maxAttempts;
  }

  /**
   * Apply jitter to delay to avoid thundering herd problem
   */
  private applyJitter(delay: number): number {
    const jitter = delay * this.config.jitterFactor;
    const randomFactor = Math.random() * 2 - 1; // Range: -1 to 1
    return Math.max(0, delay + jitter * randomFactor);
  }

  /**
   * Validate configuration parameters
   */
  private validateConfig(): void {
    if (this.config.initialDelay < 0) {
      throw new Error('initialDelay must be non-negative');
    }
    if (this.config.maxDelay < this.config.initialDelay) {
      throw new Error('maxDelay must be >= initialDelay');
    }
    if (this.config.backoffMultiplier < 1) {
      throw new Error('backoffMultiplier must be >= 1');
    }
    if (this.config.jitterFactor < 0 || this.config.jitterFactor > 1) {
      throw new Error('jitterFactor must be between 0 and 1');
    }
    if (this.config.maxAttempts < 0) {
      throw new Error('maxAttempts must be non-negative');
    }
  }
}

/**
 * Default reconnection configurations for different scenarios
 */
export const DEFAULT_RECONNECTION_CONFIGS: Record<string, ReconnectionConfig> = {
  aggressive: {
    maxAttempts: 20,
    initialDelay: 500,
    maxDelay: 10000,
    backoffMultiplier: 1.5,
    jitterFactor: 0.1,
  },
  standard: {
    maxAttempts: 10,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitterFactor: 0.2,
  },
  conservative: {
    maxAttempts: 5,
    initialDelay: 2000,
    maxDelay: 60000,
    backoffMultiplier: 3,
    jitterFactor: 0.3,
  },
  infinite: {
    maxAttempts: 0,
    initialDelay: 1000,
    maxDelay: 60000,
    backoffMultiplier: 2,
    jitterFactor: 0.2,
  },
};
