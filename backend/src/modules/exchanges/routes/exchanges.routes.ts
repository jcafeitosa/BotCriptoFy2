/**
 * Exchanges Routes
 * API endpoints for exchange management
 */

import { Elysia, t } from 'elysia';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import { ExchangeService } from '../services/exchange.service';
import logger from '@/utils/logger';

export const exchangesRoutes = new Elysia({ prefix: '/api/v1/exchanges' })
  .use(sessionGuard)
  .use(requireTenant)

  /**
   * Get supported exchanges
   * GET /api/v1/exchanges/supported
   */
  .get(
    '/supported',
    async () => {
      const exchanges = ExchangeService.getSupportedExchanges();
      return { success: true, data: exchanges };
    },
    {
      detail: {
        tags: ['Exchanges'],
        summary: 'Get supported exchanges',
        description: 'Get list of supported cryptocurrency exchanges',
      },
    }
  )

  /**
   * Get user connections
   * GET /api/v1/exchanges/connections
   */
  .get(
    '/connections',
    async ({ user, tenantId }: any) => {
      logger.info('Getting user exchange connections', { userId: user.id });
      const connections = await ExchangeService.getUserConnections(user.id, tenantId);

      // Remove sensitive data
      const sanitized = connections.map((conn) => ({
        id: conn.id,
        exchangeId: conn.exchangeId,
        exchangeName: conn.exchangeName,
        sandbox: conn.sandbox,
        enableTrading: conn.enableTrading,
        enableWithdrawal: conn.enableWithdrawal,
        status: conn.status,
        isVerified: conn.isVerified,
        lastSyncAt: conn.lastSyncAt,
        balances: conn.balances,
        createdAt: conn.createdAt,
      }));

      return { success: true, data: sanitized };
    },
    {
      detail: {
        tags: ['Exchanges'],
        summary: 'Get user connections',
        description: 'Get all exchange connections for the authenticated user',
      },
    }
  )

  /**
   * Create exchange connection
   * POST /api/v1/exchanges/connections
   */
  .post(
    '/connections',
    async ({ user, tenantId, body }: any) => {
      logger.info('Creating exchange connection', {
        userId: user.id,
        exchangeId: body.exchangeId,
      });

      const connection = await ExchangeService.createConnection({
        userId: user.id,
        tenantId,
        ...body,
      });

      return { success: true, data: { id: connection.id, status: 'connected' } };
    },
    {
      body: t.Object({
        exchangeId: t.String(),
        apiKey: t.String(),
        apiSecret: t.String(),
        apiPassword: t.Optional(t.String()),
        sandbox: t.Optional(t.Boolean()),
        enableTrading: t.Optional(t.Boolean()),
        enableWithdrawal: t.Optional(t.Boolean()),
      }),
      detail: {
        tags: ['Exchanges'],
        summary: 'Create exchange connection',
        description: 'Connect a new exchange with API credentials',
      },
    }
  )

  /**
   * Get balances
   * GET /api/v1/exchanges/connections/:id/balances
   */
  .get(
    '/connections/:id/balances',
    async ({ user, tenantId, params }: any) => {
      logger.info('Fetching exchange balances', {
        userId: user.id,
        connectionId: params.id,
      });

      const balances = await ExchangeService.fetchBalances(params.id, user.id, tenantId);

      return { success: true, data: balances };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ['Exchanges'],
        summary: 'Get exchange balances',
        description: 'Fetch current balances from exchange',
      },
    }
  )

  /**
   * Get ticker
   * GET /api/v1/exchanges/connections/:id/ticker/:symbol
   */
  .get(
    '/connections/:id/ticker/:symbol',
    async ({ user, tenantId, params }: any) => {
      logger.info('Fetching ticker', {
        userId: user.id,
        connectionId: params.id,
        symbol: params.symbol,
      });

      const ticker = await ExchangeService.fetchTicker(
        params.id,
        user.id,
        tenantId,
        params.symbol
      );

      return { success: true, data: ticker };
    },
    {
      params: t.Object({
        id: t.String(),
        symbol: t.String(),
      }),
      detail: {
        tags: ['Exchanges'],
        summary: 'Get ticker data',
        description: 'Fetch current ticker/price data for a symbol',
      },
    }
  )

  /**
   * Delete connection
   * DELETE /api/v1/exchanges/connections/:id
   */
  .delete(
    '/connections/:id',
    async ({ user, tenantId, params }: any) => {
      logger.info('Deleting exchange connection', {
        userId: user.id,
        connectionId: params.id,
      });

      await ExchangeService.deleteConnection(params.id, user.id, tenantId);

      return { success: true, message: 'Exchange connection deleted' };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ['Exchanges'],
        summary: 'Delete exchange connection',
        description: 'Delete an exchange connection',
      },
    }
  );
