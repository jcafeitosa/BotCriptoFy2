/**
 * Rate Limiting Service
 * Handles rate limiting logic using Redis
 */

import redis from '@/utils/redis';
import logger from '@/utils/logger';
import type {
  RateLimitConfig,
  RateLimitResult,
  RateLimitKey,
  RateLimitStats,
} from '../types/rate-limit.types';
import { RateLimitRule } from '../types/rate-limit.types';

class RateLimitService {
  private configs: Map<string, RateLimitConfig> = new Map();
  private stats: RateLimitStats = {
    totalRequests: 0,
    blockedRequests: 0,
    allowedRequests: 0,
    blockRate: 0,
  };

  constructor() {
    this.initializeDefaultConfigs();
  }

  /**
   * Initialize default rate limit configurations
   */
  private initializeDefaultConfigs(): void {
    // Global rate limit: 100 requests per minute
    this.configs.set(RateLimitRule.GLOBAL, {
      id: RateLimitRule.GLOBAL,
      maxRequests: 100,
      windowMs: 60000,
      message: 'Too many requests, please try again later',
      statusCode: 429,
    });

    // Auth endpoints: 10 requests per minute
    this.configs.set(RateLimitRule.AUTH, {
      id: RateLimitRule.AUTH,
      maxRequests: 10,
      windowMs: 60000,
      message: 'Too many authentication attempts',
      statusCode: 429,
    });

    // API endpoints: 60 requests per minute
    this.configs.set(RateLimitRule.API, {
      id: RateLimitRule.API,
      maxRequests: 60,
      windowMs: 60000,
      message: 'API rate limit exceeded',
      statusCode: 429,
    });

    // Admin endpoints: 30 requests per minute
    this.configs.set(RateLimitRule.ADMIN, {
      id: RateLimitRule.ADMIN,
      maxRequests: 30,
      windowMs: 60000,
      message: 'Admin API rate limit exceeded',
      statusCode: 429,
    });

    logger.info('Rate limit configurations initialized', {
      source: 'rate-limit-service',
      rules: Array.from(this.configs.keys()),
    });
  }

  /**
   * Check if request is within rate limit
   */
  async checkLimit(key: RateLimitKey, ruleId: string = RateLimitRule.GLOBAL): Promise<RateLimitResult> {
    this.stats.totalRequests++;

    const config = this.configs.get(ruleId);
    if (!config) {
      logger.warn('Rate limit rule not found, allowing request', {
        source: 'rate-limit-service',
        ruleId,
      });
      return {
        allowed: true,
        limit: 0,
        remaining: 0,
        resetAt: Date.now(),
      };
    }

    const redisKey = this.buildRedisKey(key, ruleId);
    const now = Date.now();

    try {
      // Get current count
      const countStr = await redis.get(redisKey);
      const count = countStr ? parseInt(countStr, 10) : 0;

      // Check if limit exceeded
      if (count >= config.maxRequests) {
        this.stats.blockedRequests++;
        this.updateBlockRate();

        const resetAt = now + config.windowMs;
        const retryAfter = Math.ceil(config.windowMs / 1000);

        logger.warn('Rate limit exceeded', {
          source: 'rate-limit-service',
          key: redisKey,
          count,
          limit: config.maxRequests,
        });

        return {
          allowed: false,
          limit: config.maxRequests,
          remaining: 0,
          resetAt,
          retryAfter,
        };
      }

      // Increment counter
      const newCount = count + 1;
      const ttl = count === 0 ? Math.ceil(config.windowMs / 1000) : undefined;
      await redis.set(redisKey, String(newCount), ttl);

      this.stats.allowedRequests++;
      this.updateBlockRate();

      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - newCount,
        resetAt: now + config.windowMs,
      };
    } catch (error) {
      logger.error('Rate limit check failed', {
        source: 'rate-limit-service',
        error: error instanceof Error ? error.message : String(error),
      });

      // Fail open - allow request on error
      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetAt: now + config.windowMs,
      };
    }
  }

  /**
   * Get rate limit statistics
   */
  getStats(): RateLimitStats {
    return { ...this.stats };
  }

  /**
   * Clear statistics
   */
  clearStats(): void {
    this.stats = {
      totalRequests: 0,
      blockedRequests: 0,
      allowedRequests: 0,
      blockRate: 0,
    };
  }

  /**
   * Reset rate limit for a specific key
   */
  async reset(key: RateLimitKey, ruleId: string): Promise<void> {
    const redisKey = this.buildRedisKey(key, ruleId);
    await redis.del(redisKey);
    logger.info('Rate limit reset', {
      source: 'rate-limit-service',
      key: redisKey,
    });
  }

  /**
   * Build Redis key for rate limiting
   */
  private buildRedisKey(key: RateLimitKey, ruleId: string): string {
    const parts = ['rate-limit', ruleId];

    if (key.userId) {
      parts.push(`user:${key.userId}`);
    } else {
      parts.push(`ip:${key.ip}`);
    }

    if (key.tenantId) {
      parts.push(`tenant:${key.tenantId}`);
    }

    parts.push(key.endpoint);

    return parts.join(':');
  }

  /**
   * Update block rate statistic
   */
  private updateBlockRate(): void {
    if (this.stats.totalRequests > 0) {
      this.stats.blockRate = this.stats.blockedRequests / this.stats.totalRequests;
    }
  }
}

// Export singleton instance
export const rateLimitService = new RateLimitService();
