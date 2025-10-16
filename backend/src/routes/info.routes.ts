import { Elysia, t } from 'elysia';
import logger from '../utils/logger';

/**
 * API Info Routes Plugin
 * Provides information about the API capabilities and features
 */
export const infoRoutes = new Elysia({ prefix: '/api/v1', name: 'info-routes' })
  .get(
    '/info',
    () => {
      const info = {
        name: 'BotCriptoFy2',
        version: '1.0.0',
        description: 'SaaS Multi-Tenant Cryptocurrency Trading Platform',
        features: [
          'Autonomous AI Agents',
          'Multi-Tenant Architecture',
          'Real-time Trading',
          'Advanced Analytics',
          'Better-Auth Integration',
          'Winston Logging',
          'Comprehensive Error Handling',
        ],
      };

      logger.debug('API info accessed');

      return info;
    },
    {
      detail: {
        tags: ['Info'],
        summary: 'API information',
        description: 'Returns detailed API information including features and capabilities',
      },
      response: {
        200: t.Object({
          name: t.String({ description: 'API name' }),
          version: t.String({ description: 'API version' }),
          description: t.String({ description: 'API description' }),
          features: t.Array(t.String(), { description: 'List of API features' }),
        }),
      },
    }
  )
  .get(
    '/version',
    () => ({
      version: '1.0.0',
      build: process.env.BUILD_NUMBER || 'dev',
      commit: process.env.GIT_COMMIT || 'unknown',
      buildDate: process.env.BUILD_DATE || new Date().toISOString(),
    }),
    {
      detail: {
        tags: ['Info'],
        summary: 'Version information',
        description: 'Returns version and build information',
      },
      response: {
        200: t.Object({
          version: t.String({ description: 'Semantic version' }),
          build: t.String({ description: 'Build number or environment' }),
          commit: t.String({ description: 'Git commit hash' }),
          buildDate: t.String({ description: 'Build timestamp' }),
        }),
      },
    }
  );
