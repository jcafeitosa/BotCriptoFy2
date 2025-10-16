import { Elysia, t } from 'elysia';
import logger from '../utils/logger';
import { performHealthCheck } from '../utils/health-check';

/**
 * Health Check Routes Plugin
 * Provides system health and status endpoints
 */
export const healthRoutes = new Elysia({ name: 'health-routes' })
  .get(
    '/',
    () => {
      const response = {
        status: 'ok',
        message: 'BotCriptoFy2 API is running',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
      };

      logger.info('Health check accessed', { status: response.status });

      return response;
    },
    {
      detail: {
        tags: ['Health'],
        summary: 'Health check endpoint',
        description: 'Returns the API status and basic information',
      },
      response: {
        200: t.Object({
          status: t.String({ description: 'API status' }),
          message: t.String({ description: 'Status message' }),
          version: t.String({ description: 'API version' }),
          environment: t.String({ description: 'Current environment' }),
          timestamp: t.String({ description: 'Current timestamp in ISO format' }),
        }),
      },
    }
  )
  .get(
    '/health',
    async () => {
      // Perform real health checks for all external services
      const health = await performHealthCheck();

      logger.debug('Detailed health check', health);

      return health;
    },
    {
      detail: {
        tags: ['Health'],
        summary: 'Detailed health check',
        description: 'Returns detailed health information including external services with real connection tests',
      },
      response: {
        200: t.Object({
          status: t.Union([t.Literal('healthy'), t.Literal('unhealthy'), t.Literal('degraded')], {
            description: 'Overall system health status',
          }),
          checks: t.Object({
            database: t.Object({
              status: t.Union([t.Literal('ok'), t.Literal('error'), t.Literal('degraded')]),
              message: t.Optional(t.String()),
              latency: t.Optional(t.Number()),
            }),
            redis: t.Object({
              status: t.Union([t.Literal('ok'), t.Literal('error'), t.Literal('degraded')]),
              message: t.Optional(t.String()),
              latency: t.Optional(t.Number()),
            }),
            ollama: t.Object({
              status: t.Union([t.Literal('ok'), t.Literal('error'), t.Literal('degraded')]),
              message: t.Optional(t.String()),
              latency: t.Optional(t.Number()),
            }),
          }),
          uptime: t.Number({ description: 'Server uptime in seconds' }),
          timestamp: t.String({ description: 'Current timestamp' }),
        }),
      },
    }
  );
