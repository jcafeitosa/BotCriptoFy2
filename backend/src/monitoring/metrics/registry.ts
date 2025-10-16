/**
 * Prometheus Metrics Registry
 * Central registry for all application metrics
 */

import { Registry, Counter, Gauge, Histogram } from 'prom-client';
import type { MetricsRegistry } from '../types';
import logger from '@/utils/logger';

/**
 * Global Prometheus registry
 * Singleton instance that holds all metrics
 */
class MetricsRegistryManager {
  private static instance: MetricsRegistryManager;
  private registry: Registry;
  private metrics: MetricsRegistry | null = null;
  private initialized = false;

  private constructor() {
    this.registry = new Registry();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): MetricsRegistryManager {
    if (!MetricsRegistryManager.instance) {
      MetricsRegistryManager.instance = new MetricsRegistryManager();
    }
    return MetricsRegistryManager.instance;
  }

  /**
   * Initialize all metrics
   */
  public initialize(): void {
    if (this.initialized) {
      logger.warn('Metrics registry already initialized');
      return;
    }

    try {
      // HTTP Metrics
      const httpRequestsTotal = new Counter({
        name: 'http_requests_total',
        help: 'Total number of HTTP requests',
        labelNames: ['method', 'path', 'status'],
        registers: [this.registry],
      });

      const httpRequestDuration = new Histogram({
        name: 'http_request_duration_seconds',
        help: 'HTTP request duration in seconds',
        labelNames: ['method', 'path'],
        buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
        registers: [this.registry],
      });

      const httpActiveConnections = new Gauge({
        name: 'http_active_connections',
        help: 'Number of active HTTP connections',
        registers: [this.registry],
      });

      // Database Metrics
      const dbQueriesTotal = new Counter({
        name: 'db_queries_total',
        help: 'Total number of database queries',
        labelNames: ['type', 'table'],
        registers: [this.registry],
      });

      const dbQueryDuration = new Histogram({
        name: 'db_query_duration_seconds',
        help: 'Database query duration in seconds',
        labelNames: ['type'],
        buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
        registers: [this.registry],
      });

      const dbPoolConnections = new Gauge({
        name: 'db_pool_connections',
        help: 'Number of database pool connections by state',
        labelNames: ['state'],
        registers: [this.registry],
      });

      // Cache Metrics
      const cacheOperationsTotal = new Counter({
        name: 'cache_operations_total',
        help: 'Total number of cache operations',
        labelNames: ['operation', 'namespace', 'result'],
        registers: [this.registry],
      });

      const cacheHitRate = new Gauge({
        name: 'cache_hit_rate',
        help: 'Cache hit rate by namespace',
        labelNames: ['namespace'],
        registers: [this.registry],
      });

      const cacheMemoryUsage = new Gauge({
        name: 'cache_memory_usage_bytes',
        help: 'Cache memory usage in bytes by namespace',
        labelNames: ['namespace'],
        registers: [this.registry],
      });

      // Rate Limiting Metrics
      const rateLimitRequestsTotal = new Counter({
        name: 'rate_limit_requests_total',
        help: 'Total number of rate limit checks',
        labelNames: ['rule', 'result'],
        registers: [this.registry],
      });

      const rateLimitBlockRate = new Gauge({
        name: 'rate_limit_block_rate',
        help: 'Rate limit block rate by rule',
        labelNames: ['rule'],
        registers: [this.registry],
      });

      // System Metrics
      const nodejsMemoryUsage = new Gauge({
        name: 'nodejs_memory_usage_bytes',
        help: 'Node.js memory usage in bytes by type',
        labelNames: ['type'],
        registers: [this.registry],
      });

      const nodejsCpuUsage = new Gauge({
        name: 'nodejs_cpu_usage_percent',
        help: 'Node.js CPU usage percentage',
        registers: [this.registry],
      });

      const nodejsGcRuns = new Counter({
        name: 'nodejs_gc_runs_total',
        help: 'Total number of garbage collection runs',
        labelNames: ['type'],
        registers: [this.registry],
      });

      const nodejsEventLoopLag = new Gauge({
        name: 'nodejs_event_loop_lag_seconds',
        help: 'Event loop lag in seconds',
        registers: [this.registry],
      });

      // Store all metrics
      this.metrics = {
        httpRequestsTotal,
        httpRequestDuration,
        httpActiveConnections,
        dbQueriesTotal,
        dbQueryDuration,
        dbPoolConnections,
        cacheOperationsTotal,
        cacheHitRate,
        cacheMemoryUsage,
        rateLimitRequestsTotal,
        rateLimitBlockRate,
        nodejsMemoryUsage,
        nodejsCpuUsage,
        nodejsGcRuns,
        nodejsEventLoopLag,
      };

      this.initialized = true;

      logger.info('Metrics registry initialized', {
        metricsCount: Object.keys(this.metrics).length,
      });
    } catch (error) {
      logger.error('Failed to initialize metrics registry', { error });
      throw error;
    }
  }

  /**
   * Get the registry instance
   */
  public getRegistry(): Registry {
    return this.registry;
  }

  /**
   * Get all metrics
   */
  public getMetrics(): MetricsRegistry {
    if (!this.metrics) {
      throw new Error('Metrics registry not initialized. Call initialize() first.');
    }
    return this.metrics;
  }

  /**
   * Get metrics as Prometheus text format
   */
  public async getMetricsText(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Get metrics as JSON
   */
  public async getMetricsJSON(): Promise<any> {
    return this.registry.getMetricsAsJSON();
  }

  /**
   * Reset all metrics (useful for testing)
   */
  public reset(): void {
    this.registry.resetMetrics();
    logger.debug('Metrics registry reset');
  }

  /**
   * Clear all metrics and registry
   */
  public clear(): void {
    this.registry.clear();
    this.metrics = null;
    this.initialized = false;
    logger.debug('Metrics registry cleared');
  }
}

// Export singleton instance
export const metricsRegistry = MetricsRegistryManager.getInstance();

// Initialize on import
metricsRegistry.initialize();
