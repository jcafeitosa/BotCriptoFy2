/**
 * Monitoring Module
 * Sistema de monitoring e observability com Prometheus
 */

// Metrics Registry
export { metricsRegistry } from './metrics/registry';

// Collectors
export { httpMetrics } from './metrics/collectors/http.metrics';
export { cacheMetrics } from './metrics/collectors/cache.metrics';
export { systemMetrics } from './metrics/collectors/system.metrics';

// Middleware
export { metricsMiddleware } from './middleware/metrics.middleware';

// Routes
export { metricsRoutes } from './routes/metrics.routes';

// Types
export * from './types';
