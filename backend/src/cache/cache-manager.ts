/**
 * Centralized Cache Manager
 * Implements caching strategies with Redis backend and in-memory fallback
 */

import redis from '@/utils/redis';
import logger from '@/utils/logger';
import type {
  CacheConfig,
  CacheEntry,
  CacheStats,
  CacheStrategy,
  InvalidationOptions,
  WriteBehindEntry,
} from './types';
import { CacheNamespace } from './types';

/**
 * Default cache configurations per namespace
 */
const DEFAULT_CONFIGS: Record<string, CacheConfig> = {
  [CacheNamespace.AUTH]: {
    namespace: CacheNamespace.AUTH,
    defaultTTL: 300, // 5 minutes
    strategy: 'write-through' as CacheStrategy,
    enabled: true,
    maxKeys: 10000,
  },
  [CacheNamespace.SESSIONS]: {
    namespace: CacheNamespace.SESSIONS,
    defaultTTL: 604800, // 7 days
    strategy: 'write-through' as CacheStrategy,
    enabled: true,
    maxKeys: 100000,
  },
  [CacheNamespace.USERS]: {
    namespace: CacheNamespace.USERS,
    defaultTTL: 600, // 10 minutes
    strategy: 'write-through' as CacheStrategy,
    enabled: true,
    maxKeys: 50000,
  },
  [CacheNamespace.RATE_LIMIT]: {
    namespace: CacheNamespace.RATE_LIMIT,
    defaultTTL: 60, // 1 minute
    strategy: 'write-through' as CacheStrategy,
    enabled: true,
    maxKeys: 100000,
  },
  [CacheNamespace.TRADING]: {
    namespace: CacheNamespace.TRADING,
    defaultTTL: 10, // 10 seconds (high frequency updates)
    strategy: 'write-behind' as CacheStrategy,
    enabled: true,
    maxKeys: 20000,
  },
};

class CacheManager {
  private configs: Map<string, CacheConfig> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    keys: 0,
    size: 0,
    evictions: 0,
    namespaces: {},
  };
  private writeBehindQueue: Map<string, WriteBehindEntry> = new Map();
  private writeBehindInterval: Timer | null = null;

  constructor() {
    // Initialize default configs
    Object.values(DEFAULT_CONFIGS).forEach((config) => {
      this.configs.set(config.namespace, config);
      this.stats.namespaces[config.namespace] = {
        hits: 0,
        misses: 0,
        hitRate: 0,
        keys: 0,
        size: 0,
      };
    });

    // Start write-behind processor
    this.startWriteBehindProcessor();

    logger.info('CacheManager initialized', {
      source: 'cache',
      namespaces: Array.from(this.configs.keys()),
    });
  }

  /**
   * Configure cache for a specific namespace
   */
  configure(namespace: string, config: Partial<CacheConfig>): void {
    const existingConfig = this.configs.get(namespace) || {
      namespace,
      defaultTTL: 300,
      strategy: 'write-through' as CacheStrategy,
      enabled: true,
    };

    this.configs.set(namespace, { ...existingConfig, ...config });

    if (!this.stats.namespaces[namespace]) {
      this.stats.namespaces[namespace] = {
        hits: 0,
        misses: 0,
        hitRate: 0,
        keys: 0,
        size: 0,
      };
    }

    logger.info('Cache configured', { namespace, config });
  }

  /**
   * Get cached value
   */
  async get<T>(namespace: string, key: string): Promise<T | null> {
    const config = this.getConfig(namespace);
    if (!config.enabled) {
      return null;
    }

    const fullKey = this.buildKey(namespace, key);

    try {
      const cached = await redis.get(fullKey);

      if (cached) {
        // Cache hit
        this.recordHit(namespace);
        const entry: CacheEntry<T> = JSON.parse(cached);

        // Check expiration
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
          await this.delete(namespace, key);
          this.recordMiss(namespace);
          return null;
        }

        // Update hits counter
        entry.hits++;
        await redis.set(fullKey, JSON.stringify(entry), config.defaultTTL);

        logger.debug('Cache hit', { namespace, key });
        return entry.value;
      }

      // Cache miss
      this.recordMiss(namespace);
      logger.debug('Cache miss', { namespace, key });
      return null;
    } catch (error) {
      logger.error('Cache get error', {
        namespace,
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Set cached value with strategy
   */
  async set<T>(
    namespace: string,
    key: string,
    value: T,
    ttl?: number,
    writeFn?: (value: T) => Promise<void>
  ): Promise<void> {
    const config = this.getConfig(namespace);
    if (!config.enabled) {
      return;
    }

    const fullKey = this.buildKey(namespace, key);
    const effectiveTTL = ttl ?? config.defaultTTL;

    // Create cache entry
    const entry: CacheEntry<T> = {
      value,
      cachedAt: Date.now(),
      expiresAt: effectiveTTL > 0 ? Date.now() + effectiveTTL * 1000 : null,
      hits: 0,
      size: this.estimateSize(value),
    };

    try {
      // Apply cache strategy
      switch (config.strategy) {
        case 'write-through':
          await this.writeThrough(fullKey, entry, effectiveTTL, writeFn);
          break;

        case 'write-behind':
          await this.writeBehind(fullKey, entry, effectiveTTL, writeFn);
          break;

        case 'write-around':
          await this.writeAround(entry, writeFn);
          break;
      }

      this.updateStats(namespace, entry.size);
      logger.debug('Cache set', { namespace, key, strategy: config.strategy });
    } catch (error) {
      logger.error('Cache set error', {
        namespace,
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Delete cached value
   */
  async delete(namespace: string, key: string): Promise<void> {
    const fullKey = this.buildKey(namespace, key);

    try {
      await redis.del(fullKey);
      logger.debug('Cache deleted', { namespace, key });
    } catch (error) {
      logger.error('Cache delete error', {
        namespace,
        key,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Invalidate cache with options
   */
  async invalidate(options: InvalidationOptions): Promise<number> {
    let invalidated = 0;

    try {
      if (options.key) {
        // Invalidate single key
        const namespace = options.namespace || '';
        await this.delete(namespace, options.key);
        invalidated = 1;
      } else if (options.pattern) {
        // Invalidate by pattern (requires scanning, expensive operation)
        logger.warn('Pattern-based invalidation is expensive', { pattern: options.pattern });
        // TODO: Implement pattern-based invalidation with SCAN
      } else if (options.namespace) {
        // Invalidate entire namespace
        const _pattern = `${options.namespace}:*`;
        logger.warn('Namespace invalidation', { namespace: options.namespace });
        // TODO: Implement namespace invalidation with SCAN
      }

      logger.info('Cache invalidated', { options, count: invalidated });
      return invalidated;
    } catch (error) {
      logger.error('Cache invalidation error', {
        options,
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    // Calculate hit rate
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;

    // Calculate hit rate per namespace
    Object.keys(this.stats.namespaces).forEach((namespace) => {
      const ns = this.stats.namespaces[namespace];
      const nsTotal = ns.hits + ns.misses;
      ns.hitRate = nsTotal > 0 ? ns.hits / nsTotal : 0;
    });

    return { ...this.stats };
  }

  /**
   * Clear all cache statistics
   */
  clearStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      keys: 0,
      size: 0,
      evictions: 0,
      namespaces: {},
    };

    // Reinitialize namespace stats
    this.configs.forEach((config) => {
      this.stats.namespaces[config.namespace] = {
        hits: 0,
        misses: 0,
        hitRate: 0,
        keys: 0,
        size: 0,
      };
    });
  }

  /**
   * Shutdown cache manager gracefully
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down CacheManager...');

    // Stop write-behind processor
    if (this.writeBehindInterval) {
      clearInterval(this.writeBehindInterval);
    }

    // Process remaining write-behind queue
    if (this.writeBehindQueue.size > 0) {
      logger.info(`Processing ${this.writeBehindQueue.size} remaining write-behind entries`);
      await this.processWriteBehindQueue();
    }

    logger.info('CacheManager shut down gracefully');
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Get configuration for namespace
   */
  private getConfig(namespace: string): CacheConfig {
    return (
      this.configs.get(namespace) || {
        namespace,
        defaultTTL: 300,
        strategy: 'write-through' as CacheStrategy,
        enabled: true,
      }
    );
  }

  /**
   * Build full cache key with namespace
   */
  private buildKey(namespace: string, key: string): string {
    return `cache:${namespace}:${key}`;
  }

  /**
   * Estimate size of value in bytes
   */
  private estimateSize(value: any): number {
    return JSON.stringify(value).length;
  }

  /**
   * Write-through strategy: write to cache and database simultaneously
   */
  private async writeThrough<T>(
    key: string,
    entry: CacheEntry<T>,
    ttl: number,
    writeFn?: (value: T) => Promise<void>
  ): Promise<void> {
    // Write to cache
    await redis.set(key, JSON.stringify(entry), ttl);

    // Write to database if provided
    if (writeFn) {
      await writeFn(entry.value);
    }
  }

  /**
   * Write-behind strategy: write to cache first, queue database write
   */
  private async writeBehind<T>(
    key: string,
    entry: CacheEntry<T>,
    ttl: number,
    writeFn?: (value: T) => Promise<void>
  ): Promise<void> {
    // Write to cache immediately
    await redis.set(key, JSON.stringify(entry), ttl);

    // Queue database write if provided
    if (writeFn) {
      this.writeBehindQueue.set(key, {
        key,
        value: entry.value,
        queuedAt: Date.now(),
        retries: 0,
        writeFn,
      });
    }
  }

  /**
   * Write-around strategy: skip cache, write directly to database
   */
  private async writeAround<T>(
    entry: CacheEntry<T>,
    writeFn?: (value: T) => Promise<void>
  ): Promise<void> {
    // Write directly to database, bypass cache
    if (writeFn) {
      await writeFn(entry.value);
    }
  }

  /**
   * Start write-behind background processor
   */
  private startWriteBehindProcessor(): void {
    this.writeBehindInterval = setInterval(() => {
      this.processWriteBehindQueue();
    }, 1000); // Process every second
  }

  /**
   * Process write-behind queue
   */
  private async processWriteBehindQueue(): Promise<void> {
    if (this.writeBehindQueue.size === 0) {
      return;
    }

    const entries = Array.from(this.writeBehindQueue.entries());

    for (const [key, entry] of entries) {
      try {
        await entry.writeFn(entry.value);
        this.writeBehindQueue.delete(key);
        logger.debug('Write-behind completed', { key });
      } catch (error) {
        entry.retries++;

        if (entry.retries >= 3) {
          logger.error('Write-behind failed after 3 retries', {
            key,
            error: error instanceof Error ? error.message : String(error),
          });
          this.writeBehindQueue.delete(key);
        } else {
          logger.warn('Write-behind retry', { key, retries: entry.retries });
        }
      }
    }
  }

  /**
   * Record cache hit
   */
  private recordHit(namespace: string): void {
    this.stats.hits++;

    if (!this.stats.namespaces[namespace]) {
      this.stats.namespaces[namespace] = {
        hits: 0,
        misses: 0,
        hitRate: 0,
        keys: 0,
        size: 0,
      };
    }

    this.stats.namespaces[namespace].hits++;
  }

  /**
   * Record cache miss
   */
  private recordMiss(namespace: string): void {
    this.stats.misses++;

    if (!this.stats.namespaces[namespace]) {
      this.stats.namespaces[namespace] = {
        hits: 0,
        misses: 0,
        hitRate: 0,
        keys: 0,
        size: 0,
      };
    }

    this.stats.namespaces[namespace].misses++;
  }

  /**
   * Update cache statistics
   */
  private updateStats(namespace: string, size: number): void {
    this.stats.keys++;
    this.stats.size += size;

    if (!this.stats.namespaces[namespace]) {
      this.stats.namespaces[namespace] = {
        hits: 0,
        misses: 0,
        hitRate: 0,
        keys: 0,
        size: 0,
      };
    }

    this.stats.namespaces[namespace].keys++;
    this.stats.namespaces[namespace].size += size;
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();
export default cacheManager;
