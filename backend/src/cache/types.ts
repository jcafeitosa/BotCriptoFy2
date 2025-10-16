/**
 * Cache System Types
 * Type definitions for the centralized cache system
 */

/**
 * Cache strategy types
 */
export enum CacheStrategy {
  /** Write to cache and database simultaneously (consistency priority) */
  WRITE_THROUGH = 'write-through',
  /** Write to cache first, then database asynchronously (performance priority) */
  WRITE_BEHIND = 'write-behind',
  /** Write directly to database, bypass cache (data freshness priority) */
  WRITE_AROUND = 'write-around',
}

/**
 * Cache configuration per module
 */
export interface CacheConfig {
  /** Module namespace for cache keys */
  namespace: string;
  /** Default TTL in seconds (0 = no expiration) */
  defaultTTL: number;
  /** Cache strategy to use */
  strategy: CacheStrategy;
  /** Enable cache for this module */
  enabled: boolean;
  /** Maximum number of keys to store (LRU eviction) */
  maxKeys?: number;
  /** Enable compression for large values */
  compress?: boolean;
  /** Minimum size in bytes to trigger compression */
  compressThreshold?: number;
}

/**
 * Cache entry metadata
 */
export interface CacheEntry<T = any> {
  /** Cached value */
  value: T;
  /** Timestamp when cached */
  cachedAt: number;
  /** Expiration timestamp (null = never expires) */
  expiresAt: number | null;
  /** Number of hits for this entry */
  hits: number;
  /** Size in bytes (approximate) */
  size: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total number of cache hits */
  hits: number;
  /** Total number of cache misses */
  misses: number;
  /** Cache hit rate (0-1) */
  hitRate: number;
  /** Total number of keys in cache */
  keys: number;
  /** Total cache size in bytes */
  size: number;
  /** Number of evictions due to maxKeys limit */
  evictions: number;
  /** Statistics per namespace */
  namespaces: Record<string, NamespaceStats>;
}

/**
 * Namespace-specific statistics
 */
export interface NamespaceStats {
  hits: number;
  misses: number;
  hitRate: number;
  keys: number;
  size: number;
}

/**
 * Cache invalidation options
 */
export interface InvalidationOptions {
  /** Invalidate by exact key */
  key?: string;
  /** Invalidate by pattern (supports wildcards) */
  pattern?: string;
  /** Invalidate entire namespace */
  namespace?: string;
  /** Propagate invalidation to other instances (cluster mode) */
  propagate?: boolean;
}

/**
 * Write-behind queue entry
 */
export interface WriteBehindEntry<T = any> {
  /** Cache key */
  key: string;
  /** Value to write */
  value: T;
  /** Timestamp when queued */
  queuedAt: number;
  /** Number of retry attempts */
  retries: number;
  /** Write function to execute */
  writeFn: (value: T) => Promise<void>;
}

/**
 * Module namespaces (predefined)
 */
export enum CacheNamespace {
  // Core modules
  AUTH = 'auth',
  USERS = 'users',
  TENANTS = 'tenants',
  SESSIONS = 'sessions',

  // Administrative modules
  CEO = 'ceo',
  FINANCIAL = 'financial',
  MARKETING = 'marketing',
  SALES = 'sales',
  SECURITY = 'security',
  SUPPORT = 'support',
  AUDIT = 'audit',
  DOCUMENTS = 'documents',
  CONFIGURATIONS = 'configurations',
  SUBSCRIPTIONS = 'subscriptions',

  // Trading modules
  TRADING = 'trading',
  ORDERS = 'orders',
  BOTS = 'bots',
  STRATEGIES = 'strategies',
  EXCHANGES = 'exchanges',
  PORTFOLIO = 'portfolio',
  ANALYTICS = 'analytics',

  // Other modules
  NOTIFICATIONS = 'notifications',
  AFFILIATE = 'affiliate',
  MMN = 'mmn',
  P2P = 'p2p',
  BANCO = 'banco',

  // System
  RATE_LIMIT = 'rate-limit',
  HEALTH = 'health',
}
