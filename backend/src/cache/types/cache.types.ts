/**
 * Cache Types
 * Type definitions for the caching system
 */

/**
 * Cache strategies
 */
export type CacheStrategy = 'ttl' | 'lru' | 'lfu' | 'tagged';

/**
 * Cache entry with metadata
 */
export interface CacheEntry<T = any> {
  key: string;
  value: T;
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Tags for invalidation
  createdAt: Date;
  expiresAt?: Date;
  accessCount: number;
  lastAccessedAt: Date;
  size?: number; // Size in bytes (for LRU)
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  strategy: CacheStrategy;
  ttl?: number; // Default TTL in seconds
  maxSize?: number; // Max cache size in MB (for LRU)
  maxEntries?: number; // Max number of entries (for LRU)
  namespace?: string; // Cache namespace/prefix
  enableMetrics?: boolean; // Enable hit/miss tracking
}

/**
 * Cache options for set operations
 */
export interface CacheSetOptions {
  ttl?: number; // Override default TTL
  tags?: string[]; // Tags for invalidation
  namespace?: string; // Override namespace
}

/**
 * Cache options for get operations
 */
export interface CacheGetOptions {
  namespace?: string; // Override namespace
  updateAccessTime?: boolean; // Update last accessed time (for LRU)
}

/**
 * Cache invalidation options
 */
export interface CacheInvalidateOptions {
  namespace?: string; // Invalidate by namespace
  tags?: string[]; // Invalidate by tags
  pattern?: string; // Invalidate by key pattern (glob)
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number; // Percentage
  totalRequests: number;
  entriesCount: number;
  memoryUsage: number; // In bytes
  averageEntrySize: number; // In bytes
  oldestEntry?: Date;
  newestEntry?: Date;
}

/**
 * Cache metrics for monitoring
 */
export interface CacheMetrics {
  namespace: string;
  stats: CacheStats;
  topKeys: Array<{
    key: string;
    accessCount: number;
    size: number;
  }>;
  expiringKeys: Array<{
    key: string;
    expiresAt: Date;
  }>;
}

/**
 * Cache warming configuration
 */
export interface CacheWarmingConfig {
  enabled: boolean;
  keys: Array<{
    key: string;
    loader: () => Promise<any>;
    ttl?: number;
    tags?: string[];
  }>;
  interval?: number; // Re-warm interval in seconds
}

/**
 * Cache decorator options
 */
export interface CacheableOptions {
  ttl?: number;
  tags?: string[];
  keyGenerator?: (...args: any[]) => string;
  namespace?: string;
  condition?: (...args: any[]) => boolean; // Conditional caching
}
