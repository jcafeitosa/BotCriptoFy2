/**
 * Portfolio Routes
 *
 * API endpoints for portfolio analytics and statistics
 */

import { Elysia, t } from 'elysia';
import { portfolioService } from '../services/portfolio.service';
import { priceService } from '../services/price.service';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import logger from '@/utils/logger';

export const portfolioRoutes = new Elysia({ prefix: '/api/v1/portfolio' })
  .use(sessionGuard)
  .use(requireTenant)

  /**
   * Get portfolio analytics
   * GET /api/v1/portfolio/analytics
   */
  .get(
    '/analytics',
    async ({ user, tenantId }) => {
      logger.info('Getting portfolio analytics', { userId: user.id });

      const result = await portfolioService.getPortfolioAnalytics(user.id, tenantId);

      return result;
    },
    {
      detail: {
        tags: ['Banco - Portfolio'],
        summary: 'Get portfolio analytics',
        description:
          'Get complete portfolio analytics including total value, P&L, allocation, and top gainers/losers',
      },
    }
  )

  /**
   * Get asset statistics
   * GET /api/v1/portfolio/assets/:asset/stats
   */
  .get(
    '/assets/:asset/stats',
    async ({ params, tenantId }) => {
      logger.info('Getting asset statistics', { asset: params.asset });

      const result = await portfolioService.getAssetStatistics(params.asset as any, tenantId);

      return result;
    },
    {
      params: t.Object({
        asset: t.String(),
      }),
      detail: {
        tags: ['Banco - Portfolio'],
        summary: 'Get asset statistics',
        description: 'Get platform-wide statistics for a specific asset',
      },
    }
  )

  /**
   * Get wallet activity
   * GET /api/v1/portfolio/wallets/:id/activity
   */
  .get(
    '/wallets/:id/activity',
    async ({ params, query }) => {
      logger.info('Getting wallet activity', {
        walletId: params.id,
        days: query.days,
      });

      const days = query.days ? parseInt(query.days) : 30;
      const result = await portfolioService.getWalletActivity(params.id, days);

      return result;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      query: t.Object({
        days: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Banco - Portfolio'],
        summary: 'Get wallet activity',
        description: 'Get daily activity statistics for a wallet over a period of days',
      },
    }
  )

  /**
   * Get asset price
   * GET /api/v1/portfolio/prices/:asset
   */
  .get(
    '/prices/:asset',
    async ({ params }) => {
      logger.info('Getting asset price', { asset: params.asset });

      const price = await priceService.getPrice(params.asset as any);

      if (!price) {
        return {
          success: false,
          error: 'Price not available for this asset',
        };
      }

      return {
        success: true,
        price,
      };
    },
    {
      params: t.Object({
        asset: t.String(),
      }),
      detail: {
        tags: ['Banco - Prices'],
        summary: 'Get asset price',
        description: 'Get current price for a specific asset from CoinGecko',
      },
    }
  )

  /**
   * Get multiple asset prices
   * POST /api/v1/portfolio/prices
   */
  .post(
    '/prices',
    async ({ body }) => {
      logger.info('Getting multiple asset prices', { assets: body.assets });

      const prices = await priceService.getPrices(body.assets as any[]);

      return {
        success: true,
        prices: Object.fromEntries(prices),
      };
    },
    {
      body: t.Object({
        assets: t.Array(t.String()),
      }),
      detail: {
        tags: ['Banco - Prices'],
        summary: 'Get multiple asset prices',
        description: 'Get current prices for multiple assets in a single request',
      },
    }
  )

  /**
   * Convert between assets
   * POST /api/v1/portfolio/convert
   */
  .post(
    '/convert',
    async ({ body }) => {
      logger.info('Converting assets', {
        from: body.fromAsset,
        to: body.toAsset,
        amount: body.amount,
      });

      const convertedAmount = await priceService.convert(
        body.amount,
        body.fromAsset as any,
        body.toAsset as any
      );

      if (convertedAmount === null) {
        return {
          success: false,
          error: 'Failed to convert assets',
        };
      }

      return {
        success: true,
        fromAsset: body.fromAsset,
        toAsset: body.toAsset,
        fromAmount: body.amount,
        toAmount: convertedAmount,
      };
    },
    {
      body: t.Object({
        fromAsset: t.String(),
        toAsset: t.String(),
        amount: t.Number({ minimum: 0 }),
      }),
      detail: {
        tags: ['Banco - Prices'],
        summary: 'Convert between assets',
        description: 'Convert an amount from one asset to another using current prices',
      },
    }
  )

  /**
   * Update portfolio allocation
   * POST /api/v1/portfolio/update-allocation
   */
  .post(
    '/update-allocation',
    async ({ user }) => {
      logger.info('Updating portfolio allocation', { userId: user.id });

      await portfolioService.calculatePortfolioAllocation(user.id);

      return {
        success: true,
        message: 'Portfolio allocation updated successfully',
      };
    },
    {
      detail: {
        tags: ['Banco - Portfolio'],
        summary: 'Update portfolio allocation',
        description: 'Recalculate and update asset allocation percentages for user portfolio',
      },
    }
  );
