/**
 * Metrics Middleware
 * Elysia middleware to collect HTTP request metrics
 */

import Elysia from 'elysia';
import { httpMetrics } from '../metrics/collectors/http.metrics';
import logger from '@/utils/logger';

// Store for tracking request metrics (global Map outside Elysia context)
interface MetricsStore {
  startTime: number;
  path: string;
  method: string;
}

const metricsStore = new Map<string, MetricsStore>();

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Metrics middleware
 * Automatically collects HTTP request metrics for all routes
 *
 * Uses global Map to track request lifecycle
 */
export const metricsMiddleware = new Elysia({ name: 'metrics', aot: false })
  .onRequest(({ request }) => {
    // Generate unique request ID
    const requestId = generateRequestId();

    // Increment active connections
    httpMetrics.incrementActiveConnections();

    // Extract path from URL
    const url = new URL(request.url);
    const path = url.pathname;

    // Store request metadata
    metricsStore.set(requestId, {
      startTime: Date.now(),
      path,
      method: request.method,
    });

    // Store requestId in request object for later retrieval
    (request as any)._metricsRequestId = requestId;

    logger.debug('Metrics middleware: Request started', {
      requestId,
      url: request.url,
      method: request.method,
      path,
    });
  })
  .onAfterResponse({ as: 'global' }, ({ request, set }) => {
    try {
      const requestId = (request as any)._metricsRequestId;

      if (!requestId) {
        logger.warn('Metrics middleware: Request ID not found');
        httpMetrics.decrementActiveConnections();
        return;
      }

      const requestData = metricsStore.get(requestId);

      if (!requestData) {
        logger.warn('Metrics middleware: Request data not found', { requestId });
        httpMetrics.decrementActiveConnections();
        return;
      }

      // Calculate duration
      const duration = Date.now() - requestData.startTime;

      // Get status code (default to 200 if not set)
      const status = set.status || 200;

      // Record metrics
      httpMetrics.recordRequest(
        {
          method: requestData.method,
          path: requestData.path,
          status: String(status),
        },
        duration
      );

      // Decrement active connections
      httpMetrics.decrementActiveConnections();

      // Clean up store
      metricsStore.delete(requestId);

      logger.debug('Metrics middleware: Request completed', {
        requestId,
        method: requestData.method,
        path: requestData.path,
        status,
        duration,
      });
    } catch (error) {
      logger.error('Metrics middleware: Error recording metrics', { error });
      httpMetrics.decrementActiveConnections();
    }
  })
  .onError({ as: 'global' }, ({ request, error, set }) => {
    try {
      const requestId = (request as any)._metricsRequestId;

      if (!requestId) {
        logger.warn('Metrics middleware: Request ID not found on error');
        httpMetrics.decrementActiveConnections();
        return;
      }

      const requestData = metricsStore.get(requestId);

      if (!requestData) {
        logger.warn('Metrics middleware: Request data not found on error', { requestId });
        httpMetrics.decrementActiveConnections();
        return;
      }

      // Calculate duration
      const duration = Date.now() - requestData.startTime;

      // Get status code (default to 500 for errors)
      const status = set.status || 500;

      // Record metrics
      httpMetrics.recordRequest(
        {
          method: requestData.method,
          path: requestData.path,
          status: String(status),
        },
        duration
      );

      // Decrement active connections
      httpMetrics.decrementActiveConnections();

      // Clean up store
      metricsStore.delete(requestId);

      logger.debug('Metrics middleware: Request error', {
        requestId,
        method: requestData.method,
        path: requestData.path,
        status,
        duration,
        error: error instanceof Error ? error.message : String(error),
      });
    } catch (metricsError) {
      logger.error('Metrics middleware: Error recording error metrics', {
        error: metricsError,
      });
      httpMetrics.decrementActiveConnections();
    }
  });
