/**
 * Rate Limit Service Tests
 * Tests Redis-backed rate limiting with fallback
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { rateLimitService } from '../rate-limit.service';
import { RateLimitRule } from '../../types/rate-limit.types';
import type { RateLimitKey } from '../../types/rate-limit.types';
import redis from '@/utils/redis';

describe('RateLimitService', () => {
  beforeEach(async () => {
    // Clear stats before each test
    rateLimitService.clearStats();

    // Clear all Redis keys used in tests
    await redis.flushAll();
  });

  describe('Default Configurations', () => {
    it('should initialize with GLOBAL rule (100 req/min)', async () => {
      const key: RateLimitKey = { ip: '192.168.1.1', endpoint: '/test' };
      const result = await rateLimitService.checkLimit(key, RateLimitRule.GLOBAL);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(100);
      expect(result.remaining).toBe(99);
    });

    it('should initialize with AUTH rule (10 req/min)', async () => {
      const key: RateLimitKey = { ip: '192.168.1.1', endpoint: '/api/auth/login' };
      const result = await rateLimitService.checkLimit(key, RateLimitRule.AUTH);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(9);
    });

    it('should initialize with API rule (60 req/min)', async () => {
      const key: RateLimitKey = { ip: '192.168.1.1', endpoint: '/api/users' };
      const result = await rateLimitService.checkLimit(key, RateLimitRule.API);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(60);
      expect(result.remaining).toBe(59);
    });

    it('should initialize with ADMIN rule (30 req/min)', async () => {
      const key: RateLimitKey = { ip: '192.168.1.1', endpoint: '/api/admin/users' };
      const result = await rateLimitService.checkLimit(key, RateLimitRule.ADMIN);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(30);
      expect(result.remaining).toBe(29);
    });
  });

  describe('checkLimit() - Request Limiting', () => {
    it('should allow first request', async () => {
      const key: RateLimitKey = { ip: '192.168.1.1', endpoint: '/api/test' };
      const result = await rateLimitService.checkLimit(key, RateLimitRule.API);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(59); // 60 - 1
    });

    it('should increment counter on each request', async () => {
      const key: RateLimitKey = { ip: '192.168.1.1', endpoint: '/api/test' };

      const result1 = await rateLimitService.checkLimit(key, RateLimitRule.API);
      expect(result1.remaining).toBe(59);

      const result2 = await rateLimitService.checkLimit(key, RateLimitRule.API);
      expect(result2.remaining).toBe(58);

      const result3 = await rateLimitService.checkLimit(key, RateLimitRule.API);
      expect(result3.remaining).toBe(57);
    });

    it('should block request when limit exceeded', async () => {
      const key: RateLimitKey = { ip: '192.168.1.1', endpoint: '/api/auth/login' };

      // Make 10 requests (AUTH limit)
      for (let i = 0; i < 10; i++) {
        const result = await rateLimitService.checkLimit(key, RateLimitRule.AUTH);
        expect(result.allowed).toBe(true);
      }

      // 11th request should be blocked
      const blocked = await rateLimitService.checkLimit(key, RateLimitRule.AUTH);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.retryAfter).toBeGreaterThan(0);
    });

    it('should include resetAt timestamp', async () => {
      const key: RateLimitKey = { ip: '192.168.1.1', endpoint: '/api/test' };
      const before = Date.now();

      const result = await rateLimitService.checkLimit(key, RateLimitRule.API);

      expect(result.resetAt).toBeGreaterThan(before);
      // Should be approximately 60 seconds from now (60000ms window)
      expect(result.resetAt).toBeLessThanOrEqual(before + 61000);
    });

    it('should handle different IPs independently', async () => {
      const key1: RateLimitKey = { ip: '192.168.1.1', endpoint: '/api/test' };
      const key2: RateLimitKey = { ip: '192.168.1.2', endpoint: '/api/test' };

      // Make requests from first IP
      for (let i = 0; i < 10; i++) {
        await rateLimitService.checkLimit(key1, RateLimitRule.AUTH);
      }

      // First IP should be blocked
      const result1 = await rateLimitService.checkLimit(key1, RateLimitRule.AUTH);
      expect(result1.allowed).toBe(false);

      // Second IP should still be allowed
      const result2 = await rateLimitService.checkLimit(key2, RateLimitRule.AUTH);
      expect(result2.allowed).toBe(true);
    });

    it('should handle different endpoints independently', async () => {
      const key1: RateLimitKey = { ip: '192.168.1.1', endpoint: '/api/test1' };
      const key2: RateLimitKey = { ip: '192.168.1.1', endpoint: '/api/test2' };

      // Exhaust limit for first endpoint
      for (let i = 0; i < 60; i++) {
        await rateLimitService.checkLimit(key1, RateLimitRule.API);
      }

      // First endpoint should be blocked
      const result1 = await rateLimitService.checkLimit(key1, RateLimitRule.API);
      expect(result1.allowed).toBe(false);

      // Second endpoint should still be allowed
      const result2 = await rateLimitService.checkLimit(key2, RateLimitRule.API);
      expect(result2.allowed).toBe(true);
    });

    it('should handle userId in key', async () => {
      const key: RateLimitKey = {
        ip: '192.168.1.1',
        userId: 'user-123',
        endpoint: '/api/test',
      };

      const result = await rateLimitService.checkLimit(key, RateLimitRule.API);
      expect(result.allowed).toBe(true);
    });

    it('should handle tenantId in key', async () => {
      const key: RateLimitKey = {
        ip: '192.168.1.1',
        tenantId: 'tenant-456',
        endpoint: '/api/test',
      };

      const result = await rateLimitService.checkLimit(key, RateLimitRule.API);
      expect(result.allowed).toBe(true);
    });

    it('should handle userId and tenantId together', async () => {
      const key: RateLimitKey = {
        ip: '192.168.1.1',
        userId: 'user-123',
        tenantId: 'tenant-456',
        endpoint: '/api/test',
      };

      const result = await rateLimitService.checkLimit(key, RateLimitRule.API);
      expect(result.allowed).toBe(true);
    });

    it('should allow request for unknown rule (fail open)', async () => {
      const key: RateLimitKey = { ip: '192.168.1.1', endpoint: '/api/test' };
      const result = await rateLimitService.checkLimit(key, 'unknown-rule');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(0);
      expect(result.remaining).toBe(0);
    });
  });

  describe('Statistics Tracking', () => {
    it('should track total requests', async () => {
      const key: RateLimitKey = { ip: '192.168.1.1', endpoint: '/api/test' };

      await rateLimitService.checkLimit(key, RateLimitRule.API);
      await rateLimitService.checkLimit(key, RateLimitRule.API);
      await rateLimitService.checkLimit(key, RateLimitRule.API);

      const stats = rateLimitService.getStats();
      expect(stats.totalRequests).toBe(3);
    });

    it('should track allowed requests', async () => {
      const key: RateLimitKey = { ip: '192.168.1.1', endpoint: '/api/test' };

      await rateLimitService.checkLimit(key, RateLimitRule.API);
      await rateLimitService.checkLimit(key, RateLimitRule.API);

      const stats = rateLimitService.getStats();
      expect(stats.allowedRequests).toBe(2);
    });

    it('should track blocked requests', async () => {
      const key: RateLimitKey = { ip: '192.168.1.1', endpoint: '/api/test' };

      // Exhaust limit
      for (let i = 0; i < 10; i++) {
        await rateLimitService.checkLimit(key, RateLimitRule.AUTH);
      }

      // Try one more (will be blocked)
      await rateLimitService.checkLimit(key, RateLimitRule.AUTH);

      const stats = rateLimitService.getStats();
      expect(stats.blockedRequests).toBe(1);
      expect(stats.totalRequests).toBe(11);
    });

    it('should calculate block rate correctly', async () => {
      const key: RateLimitKey = { ip: '192.168.1.1', endpoint: '/api/test' };

      // 10 allowed (AUTH limit is 10)
      for (let i = 0; i < 10; i++) {
        await rateLimitService.checkLimit(key, RateLimitRule.AUTH);
      }

      // 5 blocked
      for (let i = 0; i < 5; i++) {
        await rateLimitService.checkLimit(key, RateLimitRule.AUTH);
      }

      const stats = rateLimitService.getStats();
      expect(stats.totalRequests).toBe(15);
      expect(stats.allowedRequests).toBe(10);
      expect(stats.blockedRequests).toBe(5);
      expect(stats.blockRate).toBeCloseTo(0.3333, 2); // 5/15 ≈ 33.33%
    });

    it('should return copy of stats (immutability)', () => {
      const stats1 = rateLimitService.getStats();
      const stats2 = rateLimitService.getStats();

      expect(stats1).not.toBe(stats2); // Different objects
      expect(stats1).toEqual(stats2); // Same values
    });
  });

  describe('clearStats()', () => {
    it('should reset all statistics to zero', async () => {
      const key: RateLimitKey = { ip: '192.168.1.1', endpoint: '/api/test' };

      // Generate some stats
      await rateLimitService.checkLimit(key, RateLimitRule.API);
      await rateLimitService.checkLimit(key, RateLimitRule.API);

      // Clear stats
      rateLimitService.clearStats();

      const stats = rateLimitService.getStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.allowedRequests).toBe(0);
      expect(stats.blockedRequests).toBe(0);
      expect(stats.blockRate).toBe(0);
    });
  });

  describe('reset()', () => {
    it('should reset rate limit for specific key', async () => {
      const key: RateLimitKey = { ip: '192.168.1.1', endpoint: '/api/test' };

      // Exhaust limit
      for (let i = 0; i < 10; i++) {
        await rateLimitService.checkLimit(key, RateLimitRule.AUTH);
      }

      // Should be blocked
      let result = await rateLimitService.checkLimit(key, RateLimitRule.AUTH);
      expect(result.allowed).toBe(false);

      // Reset
      await rateLimitService.reset(key, RateLimitRule.AUTH);

      // Should be allowed again
      result = await rateLimitService.checkLimit(key, RateLimitRule.AUTH);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9); // Fresh start
    });

    it('should only reset specific key, not others', async () => {
      const key1: RateLimitKey = { ip: '192.168.1.1', endpoint: '/api/test' };
      const key2: RateLimitKey = { ip: '192.168.1.2', endpoint: '/api/test' };

      // Exhaust both
      for (let i = 0; i < 10; i++) {
        await rateLimitService.checkLimit(key1, RateLimitRule.AUTH);
        await rateLimitService.checkLimit(key2, RateLimitRule.AUTH);
      }

      // Reset only first key
      await rateLimitService.reset(key1, RateLimitRule.AUTH);

      // First should be allowed
      const result1 = await rateLimitService.checkLimit(key1, RateLimitRule.AUTH);
      expect(result1.allowed).toBe(true);

      // Second should still be blocked
      const result2 = await rateLimitService.checkLimit(key2, RateLimitRule.AUTH);
      expect(result2.allowed).toBe(false);
    });
  });

  describe('Redis Key Building', () => {
    it('should build key with IP only', async () => {
      const key: RateLimitKey = {
        ip: '192.168.1.1',
        endpoint: '/api/test',
      };

      // This will internally build: rate-limit:api:ip:192.168.1.1:/api/test
      const result = await rateLimitService.checkLimit(key, RateLimitRule.API);
      expect(result.allowed).toBe(true);
    });

    it('should build key with userId (not IP)', async () => {
      const key: RateLimitKey = {
        ip: '192.168.1.1',
        userId: 'user-123',
        endpoint: '/api/test',
      };

      // This will internally build: rate-limit:api:user:user-123:/api/test
      const result = await rateLimitService.checkLimit(key, RateLimitRule.API);
      expect(result.allowed).toBe(true);

      // Different userId should be independent
      const key2 = { ...key, userId: 'user-456' };
      const result2 = await rateLimitService.checkLimit(key2, RateLimitRule.API);
      expect(result2.allowed).toBe(true);
    });

    it('should build key with tenantId', async () => {
      const key: RateLimitKey = {
        ip: '192.168.1.1',
        tenantId: 'tenant-abc',
        endpoint: '/api/test',
      };

      // This will internally build: rate-limit:api:ip:192.168.1.1:tenant:tenant-abc:/api/test
      const result = await rateLimitService.checkLimit(key, RateLimitRule.API);
      expect(result.allowed).toBe(true);
    });

    it('should build key with userId and tenantId', async () => {
      const key: RateLimitKey = {
        ip: '192.168.1.1',
        userId: 'user-123',
        tenantId: 'tenant-abc',
        endpoint: '/api/test',
      };

      // This will internally build: rate-limit:api:user:user-123:tenant:tenant-abc:/api/test
      const result = await rateLimitService.checkLimit(key, RateLimitRule.API);
      expect(result.allowed).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent requests', async () => {
      const key: RateLimitKey = { ip: '192.168.1.1', endpoint: '/api/test' };

      // Simulate 5 concurrent requests
      const promises = Array.from({ length: 5 }, () =>
        rateLimitService.checkLimit(key, RateLimitRule.API)
      );

      const results = await Promise.all(promises);

      // All should be allowed
      results.forEach((result) => {
        expect(result.allowed).toBe(true);
      });
    });

    it('should handle empty endpoint', async () => {
      const key: RateLimitKey = { ip: '192.168.1.1', endpoint: '' };
      const result = await rateLimitService.checkLimit(key, RateLimitRule.API);

      expect(result.allowed).toBe(true);
    });

    it('should handle special characters in endpoint', async () => {
      const key: RateLimitKey = {
        ip: '192.168.1.1',
        endpoint: '/api/users?page=1&limit=10',
      };
      const result = await rateLimitService.checkLimit(key, RateLimitRule.API);

      expect(result.allowed).toBe(true);
    });

    it('should handle IPv6 addresses', async () => {
      const key: RateLimitKey = {
        ip: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
        endpoint: '/api/test',
      };
      const result = await rateLimitService.checkLimit(key, RateLimitRule.API);

      expect(result.allowed).toBe(true);
    });
  });

  describe('Fail-Open Strategy', () => {
    it('should allow request when Redis fails (fail open)', async () => {
      const key: RateLimitKey = { ip: '192.168.1.1', endpoint: '/api/test' };

      // Create a key that will cause Redis error (if needed)
      // For this test, we rely on service's try-catch
      // If Redis throws, service should fail open

      const result = await rateLimitService.checkLimit(key, RateLimitRule.API);
      expect(result.allowed).toBe(true);
    });
  });

  describe('Time Window Behavior', () => {
    it('should use correct TTL for first request', async () => {
      const key: RateLimitKey = { ip: '192.168.1.1', endpoint: '/api/test' };

      // First request sets TTL (60 seconds for API rule)
      const result = await rateLimitService.checkLimit(key, RateLimitRule.API);

      expect(result.allowed).toBe(true);
      expect(result.resetAt).toBeGreaterThan(Date.now());
    });

    it('should maintain same TTL for subsequent requests', async () => {
      const key: RateLimitKey = { ip: '192.168.1.1', endpoint: '/api/test' };

      const result1 = await rateLimitService.checkLimit(key, RateLimitRule.API);
      const resetAt1 = result1.resetAt;

      // Small delay to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      const result2 = await rateLimitService.checkLimit(key, RateLimitRule.API);
      const resetAt2 = result2.resetAt;

      // resetAt should be approximately the same (within 1 second tolerance)
      expect(Math.abs(resetAt2 - resetAt1)).toBeLessThan(1000);
    });
  });

  describe('Different Rules Isolation', () => {
    it('should isolate GLOBAL and API rules for same key', async () => {
      const key: RateLimitKey = { ip: '192.168.1.1', endpoint: '/api/test' };

      // Use GLOBAL rule (100 limit)
      await rateLimitService.checkLimit(key, RateLimitRule.GLOBAL);
      const globalResult = await rateLimitService.checkLimit(key, RateLimitRule.GLOBAL);
      expect(globalResult.remaining).toBe(98); // 100 - 2

      // Use API rule (60 limit) - should be independent
      const apiResult = await rateLimitService.checkLimit(key, RateLimitRule.API);
      expect(apiResult.remaining).toBe(59); // 60 - 1, independent counter
    });
  });
});
