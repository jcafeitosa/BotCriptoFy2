/**
 * Metrics Routes
 * HTTP endpoints for Prometheus metrics scraping
 */

import Elysia from 'elysia';
import { metricsRegistry } from '../metrics/registry';
import { systemMetrics } from '../metrics/collectors/system.metrics';
import logger from '@/utils/logger';

/**
 * Metrics routes
 * Provides endpoints for metrics collection and health
 */
export const metricsRoutes = new Elysia({ prefix: '/metrics' })
  /**
   * GET /metrics
   * Prometheus metrics endpoint (text format)
   */
  .get(
    '/',
    async ({ set }) => {
      try {
        // Force system metrics collection before scraping
        systemMetrics.collect();

        // Get metrics in Prometheus text format
        const metricsText = await metricsRegistry.getMetricsText();

        // Set content type for Prometheus
        set.headers['Content-Type'] = 'text/plain; version=0.0.4; charset=utf-8';

        logger.debug('Metrics endpoint accessed', {
          size: metricsText.length,
        });

        return metricsText;
      } catch (error) {
        logger.error('Failed to get metrics', { error });
        set.status = 500;
        return {
          error: 'InternalServerError',
          message: 'Failed to retrieve metrics',
          timestamp: new Date().toISOString(),
        };
      }
    },
    {
      detail: {
        summary: 'Get Prometheus metrics',
        description:
          'Returns all application metrics in Prometheus text format for scraping',
        tags: ['Monitoring'],
      },
    }
  )

  /**
   * GET /metrics/json
   * Metrics in JSON format (for debugging)
   */
  .get(
    '/json',
    async ({ set }) => {
      try {
        // Force system metrics collection
        systemMetrics.collect();

        // Get metrics as JSON
        const metricsJSON = await metricsRegistry.getMetricsJSON();

        logger.debug('Metrics JSON endpoint accessed', {
          metricsCount: metricsJSON.length,
        });

        return {
          success: true,
          timestamp: new Date().toISOString(),
          metrics: metricsJSON,
        };
      } catch (error) {
        logger.error('Failed to get metrics JSON', { error });
        set.status = 500;
        return {
          error: 'InternalServerError',
          message: 'Failed to retrieve metrics',
          timestamp: new Date().toISOString(),
        };
      }
    },
    {
      detail: {
        summary: 'Get metrics as JSON',
        description: 'Returns all application metrics in JSON format for debugging',
        tags: ['Monitoring'],
      },
    }
  )

  /**
   * GET /metrics/health
   * Simple health check for monitoring system
   */
  .get(
    '/health',
    () => {
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
      };
    },
    {
      detail: {
        summary: 'Monitoring system health',
        description: 'Check if the monitoring system is operational',
        tags: ['Monitoring'],
      },
    }
  );
