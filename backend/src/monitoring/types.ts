/**
 * Monitoring System Types
 * Type definitions for metrics, tracing, and observability
 */

import type { Counter, Gauge, Histogram } from 'prom-client';

/**
 * Metric types supported by Prometheus
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary',
}

/**
 * Configuration for a metric
 */
export interface MetricConfig {
  /** Metric name (snake_case) */
  name: string;
  /** Help text describing the metric */
  help: string;
  /** Metric type */
  type: MetricType;
  /** Label names for this metric */
  labelNames?: string[];
  /** Histogram-specific buckets */
  buckets?: number[];
  /** Summary-specific percentiles */
  percentiles?: number[];
}

/**
 * HTTP metrics labels
 */
export interface HttpMetricsLabels {
  method: string;
  path: string;
  status: string;
}

/**
 * Database metrics labels
 */
export interface DatabaseMetricsLabels {
  type: 'query' | 'transaction' | 'connection';
  operation?: string;
  table?: string;
}

/**
 * Cache metrics labels
 */
export interface CacheMetricsLabels {
  operation: 'get' | 'set' | 'del' | 'clear';
  namespace: string;
  result: 'hit' | 'miss' | 'success' | 'error';
}

/**
 * Rate limit metrics labels
 */
export interface RateLimitMetricsLabels {
  rule: string;
  result: 'allowed' | 'blocked';
}

/**
 * System metrics labels
 */
export interface SystemMetricsLabels {
  type: 'memory' | 'cpu' | 'gc' | 'eventloop';
}

/**
 * All metrics registry
 */
export interface MetricsRegistry {
  // HTTP metrics
  httpRequestsTotal: Counter<string>;
  httpRequestDuration: Histogram<string>;
  httpActiveConnections: Gauge<string>;

  // Database metrics
  dbQueriesTotal: Counter<string>;
  dbQueryDuration: Histogram<string>;
  dbPoolConnections: Gauge<string>;

  // Cache metrics
  cacheOperationsTotal: Counter<string>;
  cacheHitRate: Gauge<string>;
  cacheMemoryUsage: Gauge<string>;

  // Rate limiting metrics
  rateLimitRequestsTotal: Counter<string>;
  rateLimitBlockRate: Gauge<string>;

  // System metrics
  nodejsMemoryUsage: Gauge<string>;
  nodejsCpuUsage: Gauge<string>;
  nodejsGcRuns: Counter<string>;
  nodejsEventLoopLag: Gauge<string>;
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  /** Enable Prometheus metrics */
  enableMetrics: boolean;
  /** Enable OpenTelemetry tracing */
  enableTracing: boolean;
  /** Metrics endpoint path */
  metricsPath: string;
  /** Jaeger endpoint for traces */
  jaegerEndpoint?: string;
  /** Service name for tracing */
  serviceName: string;
  /** Environment (development, production) */
  environment: string;
}

/**
 * Performance timing information
 */
export interface PerformanceTiming {
  /** Start timestamp in milliseconds */
  startTime: number;
  /** End timestamp in milliseconds */
  endTime: number;
  /** Duration in milliseconds */
  duration: number;
  /** Operation name */
  operation: string;
  /** Additional context */
  context?: Record<string, any>;
}

/**
 * Trace context for correlation
 */
export interface TraceContext {
  /** Trace ID (unique per request) */
  traceId: string;
  /** Span ID (unique per operation) */
  spanId: string;
  /** Parent span ID (if nested) */
  parentSpanId?: string;
  /** Request start time */
  startTime: number;
  /** Additional metadata */
  metadata?: Record<string, any>;
}
