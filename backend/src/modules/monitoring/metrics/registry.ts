/**
 * Metrics Registry
 * Central registry for application metrics collection
 */

interface MetricData {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  value: number;
  labels?: Record<string, string>;
  timestamp: number;
}

interface HttpMetric {
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  timestamp: number;
}

class MetricsRegistry {
  private metrics: MetricData[] = [];
  private httpMetrics: HttpMetric[] = [];

  /**
   * Record a counter metric
   */
  recordCounter(name: string, value: number, labels?: Record<string, string>): void {
    this.metrics.push({
      name,
      type: 'counter',
      value,
      labels,
      timestamp: Date.now(),
    });
  }

  /**
   * Record a gauge metric
   */
  recordGauge(name: string, value: number, labels?: Record<string, string>): void {
    this.metrics.push({
      name,
      type: 'gauge',
      value,
      labels,
      timestamp: Date.now(),
    });
  }

  /**
   * Record a histogram metric
   */
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    this.metrics.push({
      name,
      type: 'histogram',
      value,
      labels,
      timestamp: Date.now(),
    });
  }

  /**
   * Record an HTTP request metric
   */
  recordHttpRequest(method: string, path: string, statusCode: number, duration: number): void {
    this.httpMetrics.push({
      method,
      path,
      statusCode,
      duration,
      timestamp: Date.now(),
    });

    // Keep only last 1000 HTTP metrics to prevent memory issues
    if (this.httpMetrics.length > 1000) {
      this.httpMetrics = this.httpMetrics.slice(-1000);
    }
  }

  /**
   * Get all metrics as JSON in Prometheus format
   */
  async getMetricsJSON(): Promise<any[]> {
    const prometheusFormat: any[] = [];

    // Build http_requests_total metric
    const httpRequestsTotal: any = {
      name: 'http_requests_total',
      type: 'counter',
      values: [],
    };

    const statusCounts: Record<string, number> = {};
    for (const metric of this.httpMetrics) {
      const statusKey = metric.statusCode.toString();
      statusCounts[statusKey] = (statusCounts[statusKey] || 0) + 1;
    }

    for (const [status, count] of Object.entries(statusCounts)) {
      httpRequestsTotal.values.push({
        value: count,
        labels: { status },
      });
    }

    if (httpRequestsTotal.values.length > 0) {
      prometheusFormat.push(httpRequestsTotal);
    }

    // Build http_request_duration_seconds metric
    const httpDuration: any = {
      name: 'http_request_duration_seconds',
      type: 'histogram',
      values: [],
    };

    if (this.httpMetrics.length > 0) {
      const totalDuration = this.httpMetrics.reduce((sum, m) => sum + m.duration, 0);
      const count = this.httpMetrics.length;

      httpDuration.values.push({
        metricNameSuffix: 'sum',
        value: totalDuration / 1000, // Convert ms to seconds
      });

      httpDuration.values.push({
        metricNameSuffix: 'count',
        value: count,
      });

      prometheusFormat.push(httpDuration);
    }

    return prometheusFormat;
  }

  /**
   * Get HTTP metrics
   */
  getHttpMetrics(): HttpMetric[] {
    return [...this.httpMetrics];
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.httpMetrics = [];
  }

  /**
   * Get metrics summary
   */
  getSummary() {
    return {
      totalMetrics: this.metrics.length,
      totalHttpRequests: this.httpMetrics.length,
      counters: this.metrics.filter(m => m.type === 'counter').length,
      gauges: this.metrics.filter(m => m.type === 'gauge').length,
      histograms: this.metrics.filter(m => m.type === 'histogram').length,
    };
  }
}

export const metricsRegistry = new MetricsRegistry();
