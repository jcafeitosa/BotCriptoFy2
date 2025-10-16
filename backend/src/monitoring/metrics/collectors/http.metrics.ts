/**
 * HTTP Metrics Collector
 * Collects and exports HTTP-related metrics
 */

import { metricsRegistry } from '../registry';
import type { HttpMetricsLabels } from '../../types';
import logger from '@/utils/logger';

/**
 * HTTP Metrics Collector
 * Provides methods to record HTTP request metrics
 */
class HttpMetricsCollector {
  private static instance: HttpMetricsCollector;
  private activeConnections = 0;

  private constructor() {
    // Initialize active connections gauge
    this.updateActiveConnections(0);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): HttpMetricsCollector {
    if (!HttpMetricsCollector.instance) {
      HttpMetricsCollector.instance = new HttpMetricsCollector();
    }
    return HttpMetricsCollector.instance;
  }

  /**
   * Record an HTTP request
   */
  public recordRequest(labels: HttpMetricsLabels, duration: number): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      // Increment total requests counter
      metrics.httpRequestsTotal.inc({
        method: labels.method,
        path: this.normalizePath(labels.path),
        status: labels.status,
      });

      // Record request duration
      metrics.httpRequestDuration.observe(
        {
          method: labels.method,
          path: this.normalizePath(labels.path),
        },
        duration / 1000 // Convert ms to seconds
      );

      logger.debug('HTTP metrics recorded', {
        method: labels.method,
        path: labels.path,
        status: labels.status,
        duration,
      });
    } catch (error) {
      logger.error('Failed to record HTTP metrics', { error, labels });
    }
  }

  /**
   * Increment active connections
   */
  public incrementActiveConnections(): void {
    this.activeConnections++;
    this.updateActiveConnections(this.activeConnections);
  }

  /**
   * Decrement active connections
   */
  public decrementActiveConnections(): void {
    this.activeConnections = Math.max(0, this.activeConnections - 1);
    this.updateActiveConnections(this.activeConnections);
  }

  /**
   * Update active connections gauge
   */
  private updateActiveConnections(count: number): void {
    try {
      const metrics = metricsRegistry.getMetrics();
      metrics.httpActiveConnections.set(count);
    } catch (error) {
      logger.error('Failed to update active connections', { error, count });
    }
  }

  /**
   * Normalize path for metrics
   * Replace dynamic segments with placeholders to avoid high cardinality
   */
  private normalizePath(path: string): string {
    // Replace UUIDs
    let normalized = path.replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      ':id'
    );

    // Replace numeric IDs
    normalized = normalized.replace(/\/\d+/g, '/:id');

    // Replace hex IDs
    normalized = normalized.replace(/\/[0-9a-f]{24}/gi, '/:id');

    return normalized;
  }

  /**
   * Get current active connections count
   */
  public getActiveConnections(): number {
    return this.activeConnections;
  }

  /**
   * Reset all HTTP metrics (useful for testing)
   */
  public reset(): void {
    this.activeConnections = 0;
    this.updateActiveConnections(0);
    logger.debug('HTTP metrics collector reset');
  }
}

// Export singleton instance
export const httpMetrics = HttpMetricsCollector.getInstance();
