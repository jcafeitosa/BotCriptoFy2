/**
 * Cache Metrics Collector
 * Collects and exports cache-related metrics
 */

import { metricsRegistry } from '../registry';
import type { CacheMetricsLabels } from '../../types';
import logger from '@/utils/logger';

/**
 * Cache Metrics Collector
 * Provides methods to record cache operation metrics
 */
class CacheMetricsCollector {
  private static instance: CacheMetricsCollector;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): CacheMetricsCollector {
    if (!CacheMetricsCollector.instance) {
      CacheMetricsCollector.instance = new CacheMetricsCollector();
    }
    return CacheMetricsCollector.instance;
  }

  /**
   * Record a cache operation
   */
  public recordOperation(labels: CacheMetricsLabels): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.cacheOperationsTotal.inc({
        operation: labels.operation,
        namespace: labels.namespace,
        result: labels.result,
      });

      logger.debug('Cache operation metrics recorded', { labels });
    } catch (error) {
      logger.error('Failed to record cache operation metrics', { error, labels });
    }
  }

  /**
   * Update cache hit rate for a namespace
   */
  public updateHitRate(namespace: string, hitRate: number): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.cacheHitRate.set({ namespace }, hitRate);

      logger.debug('Cache hit rate updated', { namespace, hitRate });
    } catch (error) {
      logger.error('Failed to update cache hit rate', { error, namespace, hitRate });
    }
  }

  /**
   * Update cache memory usage for a namespace
   */
  public updateMemoryUsage(namespace: string, bytes: number): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.cacheMemoryUsage.set({ namespace }, bytes);

      logger.debug('Cache memory usage updated', { namespace, bytes });
    } catch (error) {
      logger.error('Failed to update cache memory usage', { error, namespace, bytes });
    }
  }

  /**
   * Record a cache hit
   */
  public recordHit(namespace: string): void {
    this.recordOperation({
      operation: 'get',
      namespace,
      result: 'hit',
    });
  }

  /**
   * Record a cache miss
   */
  public recordMiss(namespace: string): void {
    this.recordOperation({
      operation: 'get',
      namespace,
      result: 'miss',
    });
  }

  /**
   * Record a successful cache set operation
   */
  public recordSet(namespace: string): void {
    this.recordOperation({
      operation: 'set',
      namespace,
      result: 'success',
    });
  }

  /**
   * Record a failed cache operation
   */
  public recordError(operation: 'get' | 'set' | 'del' | 'clear', namespace: string): void {
    this.recordOperation({
      operation,
      namespace,
      result: 'error',
    });
  }

  /**
   * Record a cache delete operation
   */
  public recordDelete(namespace: string): void {
    this.recordOperation({
      operation: 'del',
      namespace,
      result: 'success',
    });
  }

  /**
   * Record a cache clear operation
   */
  public recordClear(namespace: string): void {
    this.recordOperation({
      operation: 'clear',
      namespace,
      result: 'success',
    });
  }

  /**
   * Update all cache metrics from cache stats
   */
  public updateFromStats(stats: {
    namespaces: Record<
      string,
      {
        hits: number;
        misses: number;
        hitRate: number;
        size: number;
      }
    >;
  }): void {
    try {
      for (const [namespace, nsStats] of Object.entries(stats.namespaces)) {
        // Update hit rate
        this.updateHitRate(namespace, nsStats.hitRate);

        // Update memory usage
        this.updateMemoryUsage(namespace, nsStats.size);
      }

      logger.debug('Cache metrics updated from stats', {
        namespacesCount: Object.keys(stats.namespaces).length,
      });
    } catch (error) {
      logger.error('Failed to update cache metrics from stats', { error });
    }
  }
}

// Export singleton instance
export const cacheMetrics = CacheMetricsCollector.getInstance();
