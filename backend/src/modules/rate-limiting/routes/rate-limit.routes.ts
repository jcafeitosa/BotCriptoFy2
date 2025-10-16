/**
 * Rate Limiting Routes
 * Administrative endpoints for rate limiting management
 */

import { Elysia, t } from 'elysia';
import { rateLimitService } from '../services/rate-limit.service';
import { requireAdmin } from '@/modules/security/middleware/rbac.middleware';
import logger from '@/utils/logger';

export const rateLimitRoutes = new Elysia({ prefix: '/api/rate-limit', name: 'rate-limit-routes' })
  .use(requireAdmin())

  /**
   * Get rate limiting statistics
   */
  .get(
    '/stats',
    async () => {
      const stats = rateLimitService.getStats();

      logger.info('Rate limit stats requested', {
        source: 'rate-limit-routes',
        stats,
      });

      return {
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      };
    },
    {
      detail: {
        summary: 'Get rate limiting statistics',
        description: 'Returns statistics about rate limiting activity',
        tags: ['Rate Limiting'],
      },
    }
  )

  /**
   * Clear rate limiting statistics
   */
  .post(
    '/stats/clear',
    async () => {
      rateLimitService.clearStats();

      logger.info('Rate limit stats cleared', {
        source: 'rate-limit-routes',
      });

      return {
        success: true,
        message: 'Rate limiting statistics cleared',
        timestamp: new Date().toISOString(),
      };
    },
    {
      detail: {
        summary: 'Clear rate limiting statistics',
        description: 'Resets all rate limiting statistics to zero',
        tags: ['Rate Limiting'],
      },
    }
  )

  /**
   * Reset rate limit for a specific key
   */
  .post(
    '/reset',
    async ({ body }) => {
      await rateLimitService.reset(
        {
          ip: body.ip,
          endpoint: body.endpoint,
          userId: body.userId,
          tenantId: body.tenantId,
        },
        body.ruleId
      );

      logger.info('Rate limit reset', {
        source: 'rate-limit-routes',
        body,
      });

      return {
        success: true,
        message: 'Rate limit reset successfully',
        timestamp: new Date().toISOString(),
      };
    },
    {
      body: t.Object({
        ip: t.String(),
        endpoint: t.String(),
        ruleId: t.String(),
        userId: t.Optional(t.String()),
        tenantId: t.Optional(t.String()),
      }),
      detail: {
        summary: 'Reset rate limit for a specific key',
        description: 'Removes rate limiting restrictions for a specific user/IP combination',
        tags: ['Rate Limiting'],
      },
    }
  );
