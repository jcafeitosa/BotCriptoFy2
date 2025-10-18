/**
 * System Metrics Collector
 * Collects system-level metrics (CPU, memory, uptime, etc.)
 */

import { metricsRegistry } from '../registry';

class SystemMetrics {
  private lastCollectionTime: number = 0;
  private readonly COLLECTION_INTERVAL = 60000; // 1 minute

  /**
   * Collect system metrics
   */
  collect(): void {
    const now = Date.now();

    // Throttle collections to prevent excessive overhead
    if (now - this.lastCollectionTime < this.COLLECTION_INTERVAL) {
      return;
    }

    this.lastCollectionTime = now;

    try {
      // Memory usage
      const memUsage = process.memoryUsage();
      metricsRegistry.recordGauge('system_memory_heap_used', memUsage.heapUsed);
      metricsRegistry.recordGauge('system_memory_heap_total', memUsage.heapTotal);
      metricsRegistry.recordGauge('system_memory_rss', memUsage.rss);
      metricsRegistry.recordGauge('system_memory_external', memUsage.external);

      // Process uptime
      metricsRegistry.recordGauge('system_process_uptime_seconds', process.uptime());

      // CPU usage (basic approximation)
      const cpuUsage = process.cpuUsage();
      metricsRegistry.recordGauge('system_cpu_user_microseconds', cpuUsage.user);
      metricsRegistry.recordGauge('system_cpu_system_microseconds', cpuUsage.system);

      // Event loop lag (approximate)
      const start = Date.now();
      setImmediate(() => {
        const lag = Date.now() - start;
        metricsRegistry.recordHistogram('system_event_loop_lag_ms', lag);
      });

    } catch (error) {
      console.error('Error collecting system metrics:', error);
    }
  }

  /**
   * Get current memory usage in MB
   */
  getMemoryUsageMB(): number {
    const memUsage = process.memoryUsage();
    return Math.round(memUsage.heapUsed / 1024 / 1024);
  }

  /**
   * Get process uptime in seconds
   */
  getUptimeSeconds(): number {
    return Math.round(process.uptime());
  }

  /**
   * Start automatic collection
   */
  startAutoCollection(): void {
    // Collect immediately
    this.collect();

    // Set up interval for automatic collection
    setInterval(() => {
      this.collect();
    }, this.COLLECTION_INTERVAL);
  }
}

export const systemMetrics = new SystemMetrics();
