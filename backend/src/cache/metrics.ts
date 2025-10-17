/**
 * Cache Metrics
 * Prometheus metrics for cache monitoring
 */

import { cacheManager } from './cache-manager';
import type { CacheStats } from './types';

/**
 * Get cache metrics for Prometheus
 * Returns metrics in Prometheus text format
 */
export function getCacheMetrics(): string {
  const stats = cacheManager.getStats();

  const metrics: string[] = [];

  // Total hits
  metrics.push('# HELP cache_hits_total Total number of cache hits');
  metrics.push('# TYPE cache_hits_total counter');
  metrics.push(`cache_hits_total ${stats.hits}`);

  // Total misses
  metrics.push('# HELP cache_misses_total Total number of cache misses');
  metrics.push('# TYPE cache_misses_total counter');
  metrics.push(`cache_misses_total ${stats.misses}`);

  // Hit rate
  metrics.push('# HELP cache_hit_rate Cache hit rate (0-1)');
  metrics.push('# TYPE cache_hit_rate gauge');
  metrics.push(`cache_hit_rate ${stats.hitRate.toFixed(4)}`);

  // Total keys
  metrics.push('# HELP cache_keys_total Total number of cached keys');
  metrics.push('# TYPE cache_keys_total gauge');
  metrics.push(`cache_keys_total ${stats.keys}`);

  // Total size
  metrics.push('# HELP cache_size_bytes Total cache size in bytes');
  metrics.push('# TYPE cache_size_bytes gauge');
  metrics.push(`cache_size_bytes ${stats.size}`);

  // Evictions
  metrics.push('# HELP cache_evictions_total Total number of cache evictions');
  metrics.push('# TYPE cache_evictions_total counter');
  metrics.push(`cache_evictions_total ${stats.evictions}`);

  // Per-namespace metrics
  Object.entries(stats.namespaces).forEach(([namespace, nsStats]) => {
    // Namespace hits
    metrics.push(`cache_namespace_hits_total{namespace="${namespace}"} ${nsStats.hits}`);

    // Namespace misses
    metrics.push(`cache_namespace_misses_total{namespace="${namespace}"} ${nsStats.misses}`);

    // Namespace hit rate
    metrics.push(`cache_namespace_hit_rate{namespace="${namespace}"} ${nsStats.hitRate.toFixed(4)}`);

    // Namespace keys
    metrics.push(`cache_namespace_keys_total{namespace="${namespace}"} ${nsStats.keys}`);

    // Namespace size
    metrics.push(`cache_namespace_size_bytes{namespace="${namespace}"} ${nsStats.size}`);
  });

  return metrics.join('\n');
}

/**
 * Get cache metrics as JSON
 */
export function getCacheMetricsJSON(): {
  global: CacheStats;
  timestamp: number;
} {
  return {
    global: cacheManager.getStats(),
    timestamp: Date.now(),
  };
}

/**
 * Export metrics for monitoring route
 */
export async function exportCacheMetrics(): Promise<{
  success: boolean;
  metrics: CacheStats;
}> {
  try {
    const metrics = cacheManager.getStats();

    return {
      success: true,
      metrics,
    };
  } catch (error) {
    return {
      success: false,
      metrics: {
        hits: 0,
        misses: 0,
        hitRate: 0,
        keys: 0,
        size: 0,
        evictions: 0,
        namespaces: {},
      },
    };
  }
}
