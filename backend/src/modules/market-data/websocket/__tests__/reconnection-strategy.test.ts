/**
 * Reconnection Strategy Tests
 * Tests exponential backoff with jitter
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { ReconnectionStrategy, DEFAULT_RECONNECTION_CONFIGS } from '../reconnection-strategy';
import type { ReconnectionConfig } from '../types';

describe('ReconnectionStrategy', () => {
  describe('Standard Configuration', () => {
    let strategy: ReconnectionStrategy;

    beforeEach(() => {
      strategy = new ReconnectionStrategy(DEFAULT_RECONNECTION_CONFIGS.standard);
    });

    it('should use standard configuration', () => {
      const config = DEFAULT_RECONNECTION_CONFIGS.standard;
      expect(config.maxAttempts).toBe(10);
      expect(config.initialDelay).toBe(1000);
      expect(config.maxDelay).toBe(30000);
      expect(config.backoffMultiplier).toBe(2);
      expect(config.jitterFactor).toBe(0.2);
    });

    it('should return true for first attempt', () => {
      const canRetry = strategy.recordAttempt();
      expect(canRetry).toBe(true);
    });

    it('should calculate exponential delay', () => {
      // Initial delay before any attempts: 1000ms (1000 * 2^0)
      const delay0 = strategy.getNextDelay();
      expect(delay0).toBeGreaterThanOrEqual(800); // 1000 ± 20%
      expect(delay0).toBeLessThanOrEqual(1200);

      // First attempt: 2000ms (1000 * 2^1) ± 20%
      strategy.recordAttempt();
      const delay1 = strategy.getNextDelay();
      expect(delay1).toBeGreaterThanOrEqual(1600);
      expect(delay1).toBeLessThanOrEqual(2400);

      // Second attempt: 4000ms (1000 * 2^2) ± 20%
      strategy.recordAttempt();
      const delay2 = strategy.getNextDelay();
      expect(delay2).toBeGreaterThanOrEqual(3200);
      expect(delay2).toBeLessThanOrEqual(4800);
    });

    it('should cap delay at maxDelay (accounting for jitter)', () => {
      // Simulate many attempts to reach max
      for (let i = 0; i < 10; i++) {
        strategy.recordAttempt();
      }

      const delay = strategy.getNextDelay();
      // Base delay capped at maxDelay (30000ms), but jitter can add up to 20%
      // maxDelay + (maxDelay * jitterFactor) = 30000 + (30000 * 0.2) = 36000ms
      expect(delay).toBeLessThanOrEqual(36000);
      // Should also be at least maxDelay minus jitter
      expect(delay).toBeGreaterThanOrEqual(24000); // 30000 - (30000 * 0.2)
    });

    it('should stop retrying after maxAttempts', () => {
      // Record 9 attempts (returns true)
      for (let i = 0; i < 9; i++) {
        const canRetry = strategy.recordAttempt();
        expect(canRetry).toBe(true);
      }

      // 10th attempt should return false (at maxAttempts)
      const canRetry = strategy.recordAttempt();
      expect(canRetry).toBe(false);
    });

    it('should reset strategy correctly', () => {
      // Record some attempts
      strategy.recordAttempt();
      strategy.recordAttempt();
      strategy.recordAttempt();

      // Reset
      strategy.reset();

      // Should start from scratch (1000ms * 2^0) ± 20%
      const delay = strategy.getNextDelay();
      expect(delay).toBeGreaterThanOrEqual(800);
      expect(delay).toBeLessThanOrEqual(1200);
    });
  });

  describe('Custom Configuration', () => {
    it('should accept custom config', () => {
      const customConfig: ReconnectionConfig = {
        maxAttempts: 3,
        initialDelay: 500,
        maxDelay: 5000,
        backoffMultiplier: 3,
        jitterFactor: 0.2,
      };

      const strategy = new ReconnectionStrategy(customConfig);

      // Initial: 500 * 3^0 = 500ms ± 20%
      const delay0 = strategy.getNextDelay();
      expect(delay0).toBeGreaterThanOrEqual(400);
      expect(delay0).toBeLessThanOrEqual(600);

      // After first attempt: 500 * 3^1 = 1500ms ± 20%
      strategy.recordAttempt();
      const delay1 = strategy.getNextDelay();
      expect(delay1).toBeGreaterThanOrEqual(1200);
      expect(delay1).toBeLessThanOrEqual(1800);
    });

    it('should stop after custom maxAttempts', () => {
      const customConfig: ReconnectionConfig = {
        maxAttempts: 2,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        jitterFactor: 0.1,
      };

      const strategy = new ReconnectionStrategy(customConfig);

      expect(strategy.recordAttempt()).toBe(true); // attempt 1
      expect(strategy.recordAttempt()).toBe(false); // attempt 2, at maxAttempts
    });

    it('should allow infinite retries when maxAttempts = 0', () => {
      const customConfig: ReconnectionConfig = {
        maxAttempts: 0, // Infinite
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        jitterFactor: 0.1,
      };

      const strategy = new ReconnectionStrategy(customConfig);

      // Try 100 attempts - all should succeed
      for (let i = 0; i < 100; i++) {
        expect(strategy.recordAttempt()).toBe(true);
      }
    });
  });

  describe('Preset Configurations', () => {
    it('should have aggressive preset', () => {
      const config = DEFAULT_RECONNECTION_CONFIGS.aggressive;
      expect(config.maxAttempts).toBe(20);
      expect(config.initialDelay).toBe(500);
      expect(config.maxDelay).toBe(10000);
      expect(config.backoffMultiplier).toBe(1.5);
    });

    it('should have conservative preset', () => {
      const config = DEFAULT_RECONNECTION_CONFIGS.conservative;
      expect(config.maxAttempts).toBe(5);
      expect(config.initialDelay).toBe(2000);
      expect(config.maxDelay).toBe(60000);
      expect(config.backoffMultiplier).toBe(3);
    });

    it('should have infinite preset', () => {
      const config = DEFAULT_RECONNECTION_CONFIGS.infinite;
      expect(config.maxAttempts).toBe(0);
      expect(config.initialDelay).toBe(1000);
      expect(config.maxDelay).toBe(60000);
    });

    it('should apply aggressive preset correctly', () => {
      const strategy = new ReconnectionStrategy(DEFAULT_RECONNECTION_CONFIGS.aggressive);

      // Initial delay: 500ms * 1.5^0 = 500ms ± 10%
      const delay = strategy.getNextDelay();
      expect(delay).toBeGreaterThanOrEqual(450);
      expect(delay).toBeLessThanOrEqual(550);
    });
  });

  describe('Jitter Functionality', () => {
    it('should apply jitter to delays', () => {
      const customConfig: ReconnectionConfig = {
        maxAttempts: 10,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        jitterFactor: 0, // No jitter for deterministic test
      };

      const strategy = new ReconnectionStrategy(customConfig);

      // Initial delay: 1000 * 2^0 = 1000ms (no jitter)
      const delay = strategy.getNextDelay();
      expect(delay).toBe(1000);

      // After first attempt: 1000 * 2^1 = 2000ms (no jitter)
      strategy.recordAttempt();
      const delay2 = strategy.getNextDelay();
      expect(delay2).toBe(2000);
    });

    it('should produce different delays with jitter', () => {
      const delays: number[] = [];

      for (let i = 0; i < 10; i++) {
        const strategy = new ReconnectionStrategy(DEFAULT_RECONNECTION_CONFIGS.standard);
        delays.push(strategy.getNextDelay());
      }

      // With jitter, delays should vary
      const uniqueDelays = new Set(delays);
      // At least some variation (due to randomness, not all might be different)
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero initial delay', () => {
      const customConfig: ReconnectionConfig = {
        maxAttempts: 5,
        initialDelay: 0,
        maxDelay: 1000,
        backoffMultiplier: 2,
        jitterFactor: 0.1,
      };

      const strategy = new ReconnectionStrategy(customConfig);

      // Initial: 0 * 2^0 = 0
      const delay = strategy.getNextDelay();
      expect(delay).toBe(0);

      // After first attempt: 0 * 2^1 = 0
      strategy.recordAttempt();
      const delay2 = strategy.getNextDelay();
      expect(delay2).toBe(0);
    });

    it('should handle very large backoff multiplier', () => {
      const customConfig: ReconnectionConfig = {
        maxAttempts: 5,
        initialDelay: 100,
        maxDelay: 5000,
        backoffMultiplier: 10,
        jitterFactor: 0.1,
      };

      const strategy = new ReconnectionStrategy(customConfig);

      // Initial: 100 * 10^0 = 100ms ± 10%
      const delay0 = strategy.getNextDelay();
      expect(delay0).toBeGreaterThanOrEqual(90);
      expect(delay0).toBeLessThanOrEqual(110);

      // First attempt: 100 * 10 = 1000ms ± 10%
      strategy.recordAttempt();
      const delay1 = strategy.getNextDelay();
      expect(delay1).toBeGreaterThanOrEqual(900);
      expect(delay1).toBeLessThanOrEqual(1100);

      // Second attempt: 100 * 10^2 = 10000ms, but capped at maxDelay (5000ms) ± 10%
      strategy.recordAttempt();
      const delay2 = strategy.getNextDelay();
      expect(delay2).toBeLessThanOrEqual(5500); // maxDelay + jitter
      expect(delay2).toBeGreaterThanOrEqual(4500); // maxDelay - jitter
    });

    it('should handle jitterFactor of 1 (100%)', () => {
      const customConfig: ReconnectionConfig = {
        maxAttempts: 5,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        jitterFactor: 1, // 100% jitter
      };

      const strategy = new ReconnectionStrategy(customConfig);

      // Initial: 1000ms with 100% jitter
      // jitter range: ±1000, so 1000 + (1000 * randomFactor[-1,1]) = [0, 2000]
      const delay = strategy.getNextDelay();
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThanOrEqual(2000);
    });
  });

  describe('Realistic Trading Scenarios', () => {
    it('should handle exchange disconnection scenario', () => {
      // Simulate real-world exchange disconnection
      const strategy = new ReconnectionStrategy(DEFAULT_RECONNECTION_CONFIGS.aggressive);

      const delays: number[] = [];

      // First 5 quick reconnection attempts
      for (let i = 0; i < 5; i++) {
        if (strategy.recordAttempt()) {
          delays.push(strategy.getNextDelay());
        }
      }

      // Verify delays are growing exponentially
      for (let i = 1; i < delays.length; i++) {
        expect(delays[i]).toBeGreaterThan(delays[i - 1]);
      }

      // All delays should be under maxDelay (10s for aggressive)
      delays.forEach((delay) => {
        expect(delay).toBeLessThanOrEqual(10000);
      });
    });

    it('should prevent thundering herd with jitter', () => {
      // Multiple connections reconnecting simultaneously
      const strategies: ReconnectionStrategy[] = [];
      const delays: number[][] = [];

      // Create 10 parallel strategies (simulating 10 WebSocket connections)
      for (let i = 0; i < 10; i++) {
        const strategy = new ReconnectionStrategy(DEFAULT_RECONNECTION_CONFIGS.standard);
        strategies.push(strategy);
        delays.push([]);
      }

      // Get initial delay for each (without recording attempts)
      strategies.forEach((strategy, index) => {
        delays[index].push(strategy.getNextDelay());
      });

      // Check that delays are NOT all identical (jitter working)
      const firstDelays = delays.map((d) => d[0]);
      const uniqueDelays = new Set(firstDelays);

      // With jitter, we should have multiple different delays
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });
  });
});
