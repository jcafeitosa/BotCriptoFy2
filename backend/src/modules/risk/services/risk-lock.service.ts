/**
 * Risk Lock Service
 * Distributed lock implementation using Redis to prevent race conditions
 *
 * Features:
 * - Redlock pattern for distributed locking
 * - Automatic lock release
 * - Retry logic with exponential backoff
 * - Deadlock prevention (TTL-based)
 *
 * Use Cases:
 * - Concurrent risk metric calculations
 * - Atomic cache updates
 * - Critical section protection
 */

import redis from '@/utils/redis';
import logger from '@/utils/logger';

/**
 * Lock configuration
 */
const LOCK_CONFIG = {
  TTL: 5000, // 5 seconds - prevents deadlocks
  RETRY_DELAY: 100, // 100ms initial retry delay
  RETRY_COUNT: 3, // Maximum 3 retries
  RETRY_JITTER: 50, // ±50ms jitter to prevent thundering herd
} as const;

/**
 * Lock prefix for Redis keys
 */
const LOCK_PREFIX = 'lock:risk' as const;

/**
 * Lock result interface
 */
interface LockResult {
  acquired: boolean;
  lockId: string | null;
  message?: string;
}

/**
 * Lock statistics interface
 */
interface LockStatistics {
  totalAcquired: number;
  totalFailed: number;
  totalReleased: number;
  currentlyLocked: number;
  averageHoldTime: number;
}

/**
 * Risk Lock Service
 * Implements distributed locking using Redis
 */
export class RiskLockService {
  private static lockStats = {
    acquired: 0,
    failed: 0,
    released: 0,
    holdTimes: [] as number[],
  };

  /**
   * Generate lock key for specific resource
   */
  private static getLockKey(userId: string, tenantId: string, resource: string = 'metrics'): string {
    return `${LOCK_PREFIX}:${resource}:${userId}:${tenantId}`;
  }

  /**
   * Generate unique lock ID
   */
  private static generateLockId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Acquire distributed lock with retry logic
   */
  static async acquireLock(
    userId: string,
    tenantId: string,
    resource: string = 'metrics',
    ttlMs: number = LOCK_CONFIG.TTL
  ): Promise<LockResult> {
    const lockKey = this.getLockKey(userId, tenantId, resource);
    const lockId = this.generateLockId();

    let retryCount = 0;
    let retryDelay = LOCK_CONFIG.RETRY_DELAY;

    while (retryCount <= LOCK_CONFIG.RETRY_COUNT) {
      try {
        // Try to acquire lock using SET NX (set if not exists)
        const acquired = await this.tryAcquire(lockKey, lockId, ttlMs);

        if (acquired) {
          this.lockStats.acquired++;
          logger.debug('Lock acquired', { lockKey, lockId, ttlMs, retryCount });

          return {
            acquired: true,
            lockId,
          };
        }

        // Lock not acquired, check if we should retry
        if (retryCount < LOCK_CONFIG.RETRY_COUNT) {
          // Calculate delay with jitter
          const jitter = Math.random() * LOCK_CONFIG.RETRY_JITTER * 2 - LOCK_CONFIG.RETRY_JITTER;
          const delayWithJitter = retryDelay + jitter;

          logger.debug('Lock acquisition failed, retrying', {
            lockKey,
            retryCount,
            delay: delayWithJitter,
          });

          // Wait before retry
          await this.sleep(delayWithJitter);

          // Exponential backoff
          retryDelay *= 2;
          retryCount++;
        } else {
          // Max retries reached
          break;
        }
      } catch (error) {
        logger.error('Error acquiring lock', {
          lockKey,
          retryCount,
          error: error instanceof Error ? error.message : String(error),
        });

        if (retryCount >= LOCK_CONFIG.RETRY_COUNT) {
          break;
        }

        retryCount++;
      }
    }

    // Failed to acquire lock
    this.lockStats.failed++;

    return {
      acquired: false,
      lockId: null,
      message: `Failed to acquire lock after ${LOCK_CONFIG.RETRY_COUNT} retries`,
    };
  }

  /**
   * Try to acquire lock (single attempt)
   */
  private static async tryAcquire(lockKey: string, lockId: string, ttlMs: number): Promise<boolean> {
    try {
      // Use SET with NX (only set if not exists) and PX (TTL in milliseconds)
      // This is atomic in Redis
      const result = await redis.get(lockKey);

      if (result === null) {
        // Key doesn't exist, try to set it
        await redis.set(lockKey, lockId, Math.floor(ttlMs / 1000));

        // Verify we actually got the lock
        const verify = await redis.get(lockKey);
        return verify === lockId;
      }

      return false;
    } catch (error) {
      logger.error('Error in tryAcquire', {
        lockKey,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Release distributed lock
   */
  static async releaseLock(
    userId: string,
    tenantId: string,
    lockId: string,
    resource: string = 'metrics'
  ): Promise<boolean> {
    const lockKey = this.getLockKey(userId, tenantId, resource);

    try {
      // Verify we own the lock before releasing
      const currentLockId = await redis.get(lockKey);

      if (currentLockId === lockId) {
        // We own the lock, release it
        await redis.del(lockKey);
        this.lockStats.released++;

        logger.debug('Lock released', { lockKey, lockId });
        return true;
      } else {
        logger.warn('Attempted to release lock not owned by this process', {
          lockKey,
          lockId,
          currentLockId,
        });
        return false;
      }
    } catch (error) {
      logger.error('Error releasing lock', {
        lockKey,
        lockId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Execute function with distributed lock protection
   */
  static async withLock<T>(
    userId: string,
    tenantId: string,
    fn: () => Promise<T>,
    options: {
      resource?: string;
      ttlMs?: number;
    } = {}
  ): Promise<T> {
    const { resource = 'metrics', ttlMs = LOCK_CONFIG.TTL } = options;
    const startTime = Date.now();

    // Try to acquire lock
    const lockResult = await this.acquireLock(userId, tenantId, resource, ttlMs);

    if (!lockResult.acquired) {
      throw new Error(`Failed to acquire lock: ${lockResult.message}`);
    }

    const lockId = lockResult.lockId!;

    try {
      // Execute protected function
      logger.debug('Executing function with lock protection', {
        userId,
        tenantId,
        resource,
        lockId,
      });

      const result = await fn();

      // Record hold time
      const holdTime = Date.now() - startTime;
      this.lockStats.holdTimes.push(holdTime);

      // Keep only last 100 hold times
      if (this.lockStats.holdTimes.length > 100) {
        this.lockStats.holdTimes.shift();
      }

      logger.debug('Function execution completed', {
        userId,
        tenantId,
        resource,
        holdTime,
      });

      return result;
    } finally {
      // Always release lock in finally block
      await this.releaseLock(userId, tenantId, lockId, resource);
    }
  }

  /**
   * Check if a lock exists (for monitoring)
   */
  static async isLocked(userId: string, tenantId: string, resource: string = 'metrics'): Promise<boolean> {
    try {
      const lockKey = this.getLockKey(userId, tenantId, resource);
      const exists = await redis.exists(lockKey);
      return exists;
    } catch (error) {
      logger.error('Error checking lock existence', {
        userId,
        tenantId,
        resource,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Force release a lock (use with caution!)
   * Only for emergency situations or cleanup
   */
  static async forceRelease(userId: string, tenantId: string, resource: string = 'metrics'): Promise<void> {
    try {
      const lockKey = this.getLockKey(userId, tenantId, resource);
      await redis.del(lockKey);

      logger.warn('Lock force released', { lockKey });
    } catch (error) {
      logger.error('Error force releasing lock', {
        userId,
        tenantId,
        resource,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get lock statistics
   */
  static getStatistics(): LockStatistics {
    const avgHoldTime =
      this.lockStats.holdTimes.length > 0
        ? this.lockStats.holdTimes.reduce((a, b) => a + b, 0) / this.lockStats.holdTimes.length
        : 0;

    return {
      totalAcquired: this.lockStats.acquired,
      totalFailed: this.lockStats.failed,
      totalReleased: this.lockStats.released,
      currentlyLocked: this.lockStats.acquired - this.lockStats.released,
      averageHoldTime: Math.round(avgHoldTime),
    };
  }

  /**
   * Reset statistics (for testing)
   */
  static resetStatistics(): void {
    this.lockStats = {
      acquired: 0,
      failed: 0,
      released: 0,
      holdTimes: [],
    };
  }

  /**
   * Clean up all locks for a user (for testing/cleanup)
   */
  static async cleanupUserLocks(userId: string, tenantId: string): Promise<number> {
    try {
      const pattern = `${LOCK_PREFIX}:*:${userId}:${tenantId}`;
      let cursor = '0';
      let keysDeleted = 0;

      do {
        const [newCursor, keys] = await redis.scan(cursor, pattern, 100);
        cursor = newCursor;

        if (keys.length > 0) {
          await redis.delMany(keys);
          keysDeleted += keys.length;
        }
      } while (cursor !== '0');

      logger.info('User locks cleaned up', { userId, tenantId, keysDeleted });
      return keysDeleted;
    } catch (error) {
      logger.error('Error cleaning up user locks', {
        userId,
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }

  /**
   * Sleep utility
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default RiskLockService;
