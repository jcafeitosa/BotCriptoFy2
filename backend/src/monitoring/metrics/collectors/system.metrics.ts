/**
 * System Metrics Collector
 * Collects and exports system-level metrics (CPU, memory, GC, event loop)
 */

import { metricsRegistry } from '../registry';
import logger from '@/utils/logger';

/**
 * System Metrics Collector
 * Provides methods to record system performance metrics
 */
class SystemMetricsCollector {
  private static instance: SystemMetricsCollector;
  private collectionInterval: Timer | null = null;
  private lastCpuUsage: NodeJS.CpuUsage | null = null;
  private lastCheck: number = Date.now();

  private constructor() {
    // Start periodic collection
    this.startPeriodicCollection();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): SystemMetricsCollector {
    if (!SystemMetricsCollector.instance) {
      SystemMetricsCollector.instance = new SystemMetricsCollector();
    }
    return SystemMetricsCollector.instance;
  }

  /**
   * Start periodic metrics collection
   */
  private startPeriodicCollection(): void {
    // Collect every 10 seconds
    this.collectionInterval = setInterval(() => {
      this.collectMemoryMetrics();
      this.collectCpuMetrics();
      this.collectEventLoopMetrics();
    }, 10000);

    // Initial collection
    this.collectMemoryMetrics();
    this.collectCpuMetrics();
    this.collectEventLoopMetrics();

    logger.info('System metrics periodic collection started', { interval: '10s' });
  }

  /**
   * Stop periodic metrics collection
   */
  public stopPeriodicCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
      logger.info('System metrics periodic collection stopped');
    }
  }

  /**
   * Collect memory metrics
   */
  private collectMemoryMetrics(): void {
    try {
      const metrics = metricsRegistry.getMetrics();
      const memoryUsage = process.memoryUsage();

      metrics.nodejsMemoryUsage.set({ type: 'rss' }, memoryUsage.rss);
      metrics.nodejsMemoryUsage.set({ type: 'heapTotal' }, memoryUsage.heapTotal);
      metrics.nodejsMemoryUsage.set({ type: 'heapUsed' }, memoryUsage.heapUsed);
      metrics.nodejsMemoryUsage.set({ type: 'external' }, memoryUsage.external);

      if ('arrayBuffers' in memoryUsage) {
        metrics.nodejsMemoryUsage.set(
          { type: 'arrayBuffers' },
          memoryUsage.arrayBuffers || 0
        );
      }

      logger.debug('Memory metrics collected', {
        rss: memoryUsage.rss,
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
      });
    } catch (error) {
      logger.error('Failed to collect memory metrics', { error });
    }
  }

  /**
   * Collect CPU metrics
   */
  private collectCpuMetrics(): void {
    try {
      const metrics = metricsRegistry.getMetrics();
      const cpuUsage = process.cpuUsage(this.lastCpuUsage || undefined);
      const now = Date.now();
      const elapsed = (now - this.lastCheck) * 1000; // Convert to microseconds

      if (elapsed > 0) {
        // Calculate CPU usage percentage
        const userPercent = (cpuUsage.user / elapsed) * 100;
        const systemPercent = (cpuUsage.system / elapsed) * 100;
        const totalPercent = userPercent + systemPercent;

        metrics.nodejsCpuUsage.set(totalPercent);

        logger.debug('CPU metrics collected', {
          user: userPercent,
          system: systemPercent,
          total: totalPercent,
        });
      }

      this.lastCpuUsage = process.cpuUsage();
      this.lastCheck = now;
    } catch (error) {
      logger.error('Failed to collect CPU metrics', { error });
    }
  }

  /**
   * Collect event loop metrics
   */
  private collectEventLoopMetrics(): void {
    try {
      const metrics = metricsRegistry.getMetrics();
      const start = process.hrtime.bigint();

      // Measure event loop lag
      setImmediate(() => {
        const end = process.hrtime.bigint();
        const lagNs = end - start;
        const lagSeconds = Number(lagNs) / 1e9;

        metrics.nodejsEventLoopLag.set(lagSeconds);

        logger.debug('Event loop metrics collected', {
          lagMs: lagSeconds * 1000,
        });
      });
    } catch (error) {
      logger.error('Failed to collect event loop metrics', { error });
    }
  }

  /**
   * Record a garbage collection event
   */
  public recordGC(type: string): void {
    try {
      const metrics = metricsRegistry.getMetrics();
      metrics.nodejsGcRuns.inc({ type });

      logger.debug('GC metrics recorded', { type });
    } catch (error) {
      logger.error('Failed to record GC metrics', { error, type });
    }
  }

  /**
   * Get current memory usage
   */
  public getMemoryUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  }

  /**
   * Get current CPU usage
   */
  public getCpuUsage(): NodeJS.CpuUsage {
    return process.cpuUsage();
  }

  /**
   * Force collection of all metrics
   */
  public collect(): void {
    this.collectMemoryMetrics();
    this.collectCpuMetrics();
    this.collectEventLoopMetrics();
  }
}

// Export singleton instance
export const systemMetrics = SystemMetricsCollector.getInstance();

// Setup GC monitoring if available (Node.js only)
// Note: Bun runtime doesn't expose global.gc
// if (global.gc) {
//   const originalGc = global.gc;
//   global.gc = function (...args: any[]) {
//     systemMetrics.recordGC('manual');
//     return originalGc.apply(this, args);
//   };
// }
