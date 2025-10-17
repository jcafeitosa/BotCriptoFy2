/**
 * Orders Routes
 * API endpoints for trading orders and positions
 */

import { Elysia, t } from 'elysia';
import { sessionGuard } from '../../auth/middleware/session.middleware';
import { requireTenant } from '../../tenants/middleware/tenant.middleware';
import { OrderService } from '../services/order.service';
import { PositionService } from '../services/position.service';
import logger from '@/utils/logger';

export const ordersRoutes = new Elysia({ prefix: '/api/v1/orders' })
  .use(sessionGuard)
  .use(requireTenant)

  /**
   * Create order
   * POST /api/v1/orders
   */
  .post(
    '/',
    async ({ user, tenantId, body }: any) => {
      logger.info('Creating order', { userId: user.id, tenantId, body });

      const order = await OrderService.createOrder(user.id, tenantId, body);

      return { success: true, data: order };
    },
    {
      body: t.Object({
        exchangeConnectionId: t.String(),
        symbol: t.String(),
        type: t.Union([
          t.Literal('market'),
          t.Literal('limit'),
          t.Literal('stop_loss'),
          t.Literal('stop_loss_limit'),
          t.Literal('take_profit'),
          t.Literal('take_profit_limit'),
          t.Literal('trailing_stop'),
          t.Literal('trailing_stop_limit'),
        ]),
        side: t.Union([t.Literal('buy'), t.Literal('sell')]),
        amount: t.Number(),
        price: t.Optional(t.Number()),
        stopPrice: t.Optional(t.Number()),
        timeInForce: t.Optional(t.String()),
        trailingDelta: t.Optional(t.Number()),
        trailingPercent: t.Optional(t.Number()),
        reduceOnly: t.Optional(t.Boolean()),
        postOnly: t.Optional(t.Boolean()),
        strategy: t.Optional(t.String()),
        notes: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Orders'],
        summary: 'Create trading order',
        description: 'Create a new trading order (market, limit, stop, etc.)',
      },
    }
  )

  /**
   * Get orders
   * GET /api/v1/orders
   */
  .get(
    '/',
    async ({ user, tenantId, query }: any) => {
      logger.info('Getting orders', { userId: user.id, tenantId, query });

      const orders = await OrderService.getOrders({
        userId: user.id,
        tenantId,
        exchangeId: query.exchangeId,
        symbol: query.symbol,
        status: query.status,
        strategy: query.strategy,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        limit: query.limit ? parseInt(query.limit) : 100,
        offset: query.offset ? parseInt(query.offset) : 0,
      });

      return { success: true, data: orders };
    },
    {
      query: t.Object({
        exchangeId: t.Optional(t.String()),
        symbol: t.Optional(t.String()),
        status: t.Optional(t.String()),
        strategy: t.Optional(t.String()),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Orders'],
        summary: 'Get orders',
        description: 'Get user orders with optional filters',
      },
    }
  )

  /**
   * Get order by ID
   * GET /api/v1/orders/:orderId
   */
  .get(
    '/:orderId',
    async ({ user, tenantId, params }: any) => {
      logger.info('Getting order', { userId: user.id, tenantId, orderId: params.orderId });

      const order = await OrderService.getOrder(params.orderId, user.id, tenantId);

      return { success: true, data: order };
    },
    {
      params: t.Object({
        orderId: t.String(),
      }),
      detail: {
        tags: ['Orders'],
        summary: 'Get order by ID',
        description: 'Get a specific order by ID',
      },
    }
  )

  /**
   * Update order
   * PATCH /api/v1/orders/:orderId
   */
  .patch(
    '/:orderId',
    async ({ user, tenantId, params, body }: any) => {
      logger.info('Updating order', { userId: user.id, tenantId, orderId: params.orderId, body });

      const order = await OrderService.updateOrder(params.orderId, user.id, tenantId, body);

      return { success: true, data: order };
    },
    {
      params: t.Object({
        orderId: t.String(),
      }),
      body: t.Object({
        amount: t.Optional(t.Number()),
        price: t.Optional(t.Number()),
        stopPrice: t.Optional(t.Number()),
        trailingDelta: t.Optional(t.Number()),
        trailingPercent: t.Optional(t.Number()),
      }),
      detail: {
        tags: ['Orders'],
        summary: 'Update order',
        description: 'Update order parameters (only for pending/open orders)',
      },
    }
  )

  /**
   * Cancel order
   * DELETE /api/v1/orders/:orderId
   */
  .delete(
    '/:orderId',
    async ({ user, tenantId, params, query }: any) => {
      logger.info('Canceling order', { userId: user.id, tenantId, orderId: params.orderId });

      const order = await OrderService.cancelOrder(
        params.orderId,
        user.id,
        tenantId,
        query.reason
      );

      return { success: true, data: order };
    },
    {
      params: t.Object({
        orderId: t.String(),
      }),
      query: t.Object({
        reason: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Orders'],
        summary: 'Cancel order',
        description: 'Cancel an open order',
      },
    }
  )

  /**
   * Cancel all orders
   * POST /api/v1/orders/cancel-all
   */
  .post(
    '/cancel-all',
    async ({ user, tenantId, query }: any) => {
      logger.info('Canceling all orders', { userId: user.id, tenantId, symbol: query.symbol });

      const count = await OrderService.cancelAllOrders(user.id, tenantId, query.symbol);

      return { success: true, data: { canceled: count } };
    },
    {
      query: t.Object({
        symbol: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Orders'],
        summary: 'Cancel all orders',
        description: 'Cancel all open orders (optionally filtered by symbol)',
      },
    }
  )

  /**
   * Get order fills
   * GET /api/v1/orders/:orderId/fills
   */
  .get(
    '/:orderId/fills',
    async ({ params }: any) => {
      logger.info('Getting order fills', { orderId: params.orderId });

      const fills = await OrderService.getOrderFills(params.orderId);

      return { success: true, data: fills };
    },
    {
      params: t.Object({
        orderId: t.String(),
      }),
      detail: {
        tags: ['Orders'],
        summary: 'Get order fills',
        description: 'Get all fills/trades for a specific order',
      },
    }
  )

  /**
   * Get order statistics
   * GET /api/v1/orders/stats
   */
  .get(
    '/stats',
    async ({ user, tenantId, query }: any) => {
      logger.info('Getting order statistics', { userId: user.id, tenantId });

      const stats = await OrderService.getOrderStatistics(user.id, tenantId, {
        exchangeId: query.exchangeId,
        symbol: query.symbol,
        strategy: query.strategy,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
      });

      return { success: true, data: stats };
    },
    {
      query: t.Object({
        exchangeId: t.Optional(t.String()),
        symbol: t.Optional(t.String()),
        strategy: t.Optional(t.String()),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Orders'],
        summary: 'Get order statistics',
        description: 'Get aggregated order statistics and metrics',
      },
    }
  )

  /**
   * Sync orders from exchange
   * POST /api/v1/orders/sync
   */
  .post(
    '/sync',
    async ({ user, tenantId, body }: any) => {
      logger.info('Syncing orders', { userId: user.id, tenantId, body });

      const count = await OrderService.syncOrders(user.id, tenantId, body.exchangeConnectionId);

      return { success: true, data: { synced: count } };
    },
    {
      body: t.Object({
        exchangeConnectionId: t.String(),
      }),
      detail: {
        tags: ['Orders'],
        summary: 'Sync orders from exchange',
        description: 'Fetch and sync open orders from exchange',
      },
    }
  )

  /**
   * Get positions
   * GET /api/v1/orders/positions
   */
  .get(
    '/positions',
    async ({ user, tenantId, query }: any) => {
      logger.info('Getting positions', { userId: user.id, tenantId, query });

      const positions = await PositionService.getPositions({
        userId: user.id,
        tenantId,
        exchangeId: query.exchangeId,
        symbol: query.symbol,
        status: query.status,
        strategy: query.strategy,
        limit: query.limit ? parseInt(query.limit) : 100,
        offset: query.offset ? parseInt(query.offset) : 0,
      });

      return { success: true, data: positions };
    },
    {
      query: t.Object({
        exchangeId: t.Optional(t.String()),
        symbol: t.Optional(t.String()),
        status: t.Optional(t.String()),
        strategy: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Positions'],
        summary: 'Get positions',
        description: 'Get trading positions with optional filters',
      },
    }
  )

  /**
   * Get position by ID
   * GET /api/v1/orders/positions/:positionId
   */
  .get(
    '/positions/:positionId',
    async ({ user, tenantId, params }: any) => {
      logger.info('Getting position', { userId: user.id, tenantId, positionId: params.positionId });

      const position = await PositionService.getPosition(params.positionId, user.id, tenantId);

      return { success: true, data: position };
    },
    {
      params: t.Object({
        positionId: t.String(),
      }),
      detail: {
        tags: ['Positions'],
        summary: 'Get position by ID',
        description: 'Get a specific position by ID',
      },
    }
  )

  /**
   * Close position
   * POST /api/v1/orders/positions/:positionId/close
   */
  .post(
    '/positions/:positionId/close',
    async ({ user, tenantId, params }: any) => {
      logger.info('Closing position', { userId: user.id, tenantId, positionId: params.positionId });

      const position = await PositionService.closePosition(params.positionId, user.id, tenantId);

      return { success: true, data: position };
    },
    {
      params: t.Object({
        positionId: t.String(),
      }),
      detail: {
        tags: ['Positions'],
        summary: 'Close position',
        description: 'Close an open position',
      },
    }
  )

  /**
   * Get position statistics
   * GET /api/v1/orders/positions/stats
   */
  .get(
    '/positions/stats',
    async ({ user, tenantId, query }: any) => {
      logger.info('Getting position statistics', { userId: user.id, tenantId });

      const stats = await PositionService.getPositionStatistics(user.id, tenantId, {
        exchangeId: query.exchangeId,
        symbol: query.symbol,
        strategy: query.strategy,
      });

      return { success: true, data: stats };
    },
    {
      query: t.Object({
        exchangeId: t.Optional(t.String()),
        symbol: t.Optional(t.String()),
        strategy: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Positions'],
        summary: 'Get position statistics',
        description: 'Get aggregated position statistics (win rate, P&L, etc.)',
      },
    }
  )

  /**
   * Sync positions from exchange
   * POST /api/v1/orders/positions/sync
   */
  .post(
    '/positions/sync',
    async ({ user, tenantId, body }: any) => {
      logger.info('Syncing positions', { userId: user.id, tenantId, body });

      const count = await PositionService.syncPositions(user.id, tenantId, body.exchangeConnectionId);

      return { success: true, data: { synced: count } };
    },
    {
      body: t.Object({
        exchangeConnectionId: t.String(),
      }),
      detail: {
        tags: ['Positions'],
        summary: 'Sync positions from exchange',
        description: 'Fetch and sync positions from exchange (futures/margin)',
      },
    }
  );
