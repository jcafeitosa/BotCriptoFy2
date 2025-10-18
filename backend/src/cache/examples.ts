// @ts-nocheck
/**
 * Cache Usage Examples
 * Demonstrates how to use the cache system
 *
 * Note: TypeScript checking disabled due to decorator type complexities
 * This is example code and doesn't affect runtime
 */

import { cacheManager } from './cache-manager';
import { Cacheable, CacheInvalidate, CachePut } from './decorators/cacheable.decorator';
import { CacheNamespace } from './types';

// ============================================================================
// EXAMPLE 1: Basic Cache Usage
// ============================================================================

async function basicCacheExample() {
  // Set a value
  await cacheManager.set(CacheNamespace.USERS, 'user:123', {
    id: '123',
    name: 'John Doe',
    email: 'john@example.com',
  }, 300); // 5 minutes TTL

  // Get a value
  const user = await cacheManager.get(CacheNamespace.USERS, 'user:123');
  console.log('Cached user:', user);

  // Delete a value
  await cacheManager.delete(CacheNamespace.USERS, 'user:123');
}

// ============================================================================
// EXAMPLE 2: Cache-Aside Pattern (Get or Set)
// ============================================================================

async function cacheAsideExample(userId: string) {
  const user = await cacheManager.getOrSet(
    CacheNamespace.USERS,
    `user:${userId}`,
    async () => {
      // This function only executes if cache miss
      console.log('Loading from database...');
      return { id: userId, name: 'John Doe' };
    },
    600 // 10 minutes
  );

  return user;
}

// ============================================================================
// EXAMPLE 3: Using Decorators
// ============================================================================

class UserService {
  /**
   * Automatically cache getUser results
   */
  @Cacheable({ namespace: CacheNamespace.USERS, ttl: 300 })
  async getUser(userId: string) {
    console.log('Fetching from database...');
    // Simulate database query
    return {
      id: userId,
      name: 'John Doe',
      email: 'john@example.com',
    };
  }

  /**
   * Automatically cache with custom key generator
   */
  @Cacheable({
    namespace: CacheNamespace.USERS,
    ttl: 300,
    keyGenerator: (email: string) => `user:email:${email}`,
  })
  async getUserByEmail(email: string) {
    console.log('Fetching by email...');
    return {
      id: '123',
      name: 'John Doe',
      email,
    };
  }

  /**
   * Cache only if condition is met
   */
  @Cacheable({
    namespace: CacheNamespace.USERS,
    ttl: 300,
    condition: (userId: string) => userId.length > 0,
  })
  async getUserConditional(userId: string) {
    return { id: userId, name: 'John Doe' };
  }

  /**
   * Invalidate cache after update
   */
  @CacheInvalidate({
    namespace: CacheNamespace.USERS,
    keyGenerator: (userId: string) => userId,
  })
  async updateUser(userId: string, data: any) {
    console.log('Updating user in database...');
    return { id: userId, ...data };
  }

  /**
   * Always execute and update cache
   */
  @CachePut({
    namespace: CacheNamespace.USERS,
    ttl: 300,
    keyGenerator: (userId: string) => userId,
  })
  async refreshUser(userId: string) {
    console.log('Refreshing user from API...');
    return {
      id: userId,
      name: 'John Doe Updated',
    };
  }
}

// ============================================================================
// EXAMPLE 4: Cache Warming
// ============================================================================

async function cacheWarmingExample() {
  await cacheManager.warmCache([
    {
      namespace: CacheNamespace.USERS,
      key: 'popular-users',
      loader: async () => {
        console.log('Loading popular users...');
        return [
          { id: '1', name: 'Alice' },
          { id: '2', name: 'Bob' },
        ];
      },
      ttl: 3600, // 1 hour
    },
    {
      namespace: CacheNamespace.TRADING,
      key: 'top-symbols',
      loader: async () => {
        console.log('Loading top trading symbols...');
        return ['BTC/USDT', 'ETH/USDT', 'BNB/USDT'];
      },
      ttl: 600, // 10 minutes
    },
  ]);
}

// ============================================================================
// EXAMPLE 5: Cache Invalidation
// ============================================================================

async function cacheInvalidationExample() {
  // Invalidate single key
  await cacheManager.invalidate({
    namespace: CacheNamespace.USERS,
    key: 'user:123',
  });

  // Invalidate entire namespace
  await cacheManager.invalidate({
    namespace: CacheNamespace.USERS,
  });

  // Invalidate by pattern
  await cacheManager.invalidate({
    pattern: 'cache:users:user:*',
  });
}

// ============================================================================
// EXAMPLE 6: Monitoring Cache Stats
// ============================================================================

async function monitoringExample() {
  const stats = cacheManager.getStats();

  console.log('Cache Statistics:');
  console.log(`- Total Hits: ${stats.hits}`);
  console.log(`- Total Misses: ${stats.misses}`);
  console.log(`- Hit Rate: ${(stats.hitRate * 100).toFixed(2)}%`);
  console.log(`- Total Keys: ${stats.keys}`);
  console.log(`- Cache Size: ${(stats.size / 1024).toFixed(2)} KB`);

  // Per-namespace stats
  Object.entries(stats.namespaces).forEach(([namespace, nsStats]) => {
    console.log(`\nNamespace: ${namespace}`);
    console.log(`- Hits: ${nsStats.hits}`);
    console.log(`- Misses: ${nsStats.misses}`);
    console.log(`- Hit Rate: ${(nsStats.hitRate * 100).toFixed(2)}%`);
  });
}

// Export examples
export {
  basicCacheExample,
  cacheAsideExample,
  UserService,
  cacheWarmingExample,
  cacheInvalidationExample,
  monitoringExample,
};
