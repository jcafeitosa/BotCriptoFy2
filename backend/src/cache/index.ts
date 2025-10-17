/**
 * Cache Module
 * Exports cache manager, types, and decorators
 */

// Export cache manager
export { cacheManager, default as defaultCacheManager } from './cache-manager';

// Export types
export * from './types';
export { CacheNamespace } from './types';

// Export decorators
export { Cacheable, CacheInvalidate, CachePut } from './decorators/cacheable.decorator';

// Export metrics (if needed)
export { getCacheMetrics } from './metrics';
