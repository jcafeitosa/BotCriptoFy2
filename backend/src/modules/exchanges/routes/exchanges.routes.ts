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
   * Get exchange info (capabilities, rateLimit, timeframes, urls)
   * GET /api/v1/exchanges/info/:exchangeId
   */
  .get(
    '/info/:exchangeId',
    async ({ params }: any) => {
      const info = ExchangeService.getExchangeInfo(params.exchangeId);
      return { success: true, data: info };
    },
    {
      params: t.Object({ exchangeId: t.String() }),
      detail: {
        tags: ['Exchanges'],
        summary: 'Get exchange info',
        description: 'Return capabilities and metadata for a given exchange',
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
   * Get markets
   * GET /api/v1/exchanges/connections/:id/markets
   */
  .get(
    '/connections/:id/markets',
    async ({ user, tenantId, params, query }: any) => {
      const markets = await ExchangeService.getMarkets(params.id, user.id, tenantId);
      const format = (query.format || '').toLowerCase();
      if (format === 'csv') {
        const header = 'symbol,base,quote,active,type';
        const lines = markets.map((m: any) => `${m.symbol},${m.base},${m.quote},${m.active},${m.type}`);
        const csv = [header, ...lines].join('\n');
        return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
      }
      if (format === 'ndjson') {
        const ndjson = markets.map((m: any) => JSON.stringify(m)).join('\n');
        return new Response(ndjson, { headers: { 'Content-Type': 'application/x-ndjson' } });
      }
      return { success: true, data: markets };
    },
    {
      params: t.Object({ id: t.String() }),
      query: t.Object({ format: t.Optional(t.String()) }),
      detail: {
        tags: ['Exchanges'],
        summary: 'List markets',
        description: 'List unified markets metadata (symbol, precision, limits, type)',
      },
    }
  )

  /**
   * Get market details
   * GET /api/v1/exchanges/connections/:id/markets/:symbol
   */
  .get(
    '/connections/:id/markets/:symbol',
    async ({ user, tenantId, params }: any) => {
      const market = await ExchangeService.getMarket(params.id, user.id, tenantId, params.symbol);
      return { success: true, data: market };
    },
    {
      params: t.Object({ id: t.String(), symbol: t.String() }),
      detail: {
        tags: ['Exchanges'],
        summary: 'Get market details',
        description: 'Return unified market details for a symbol',
      },
    }
  )

  /**
   * Get order book
   * GET /api/v1/exchanges/connections/:id/orderbook/:symbol
   */
  .get(
    '/connections/:id/orderbook/:symbol',
    async ({ user, tenantId, params, query }: any) => {
      const limit = query.limit ? parseInt(query.limit) : undefined;
      const ob = await ExchangeService.fetchOrderBook(params.id, user.id, tenantId, params.symbol, limit);
      return { success: true, data: ob };
    },
    {
      params: t.Object({ id: t.String(), symbol: t.String() }),
      query: t.Object({ limit: t.Optional(t.String()) }),
      detail: {
        tags: ['Exchanges'],
        summary: 'Get order book',
        description: 'Fetch unified order book (bids/asks) for a symbol',
      },
    }
  )

  /**
   * Get OHLCV
   * GET /api/v1/exchanges/connections/:id/ohlcv/:symbol/:timeframe
   */
  .get(
    '/connections/:id/ohlcv/:symbol/:timeframe',
    async ({ user, tenantId, params, query }: any) => {
      const since = query.since ? parseInt(query.since) : undefined;
      const limit = query.limit ? parseInt(query.limit) : undefined;
      const candles = await ExchangeService.fetchOHLCV(
        params.id,
        user.id,
        tenantId,
        params.symbol,
        params.timeframe,
        since,
        limit
      );
      const format = (query.format || '').toLowerCase();
      if (format === 'csv') {
        const header = 'timestamp,open,high,low,close,volume';
        const lines = candles.map((c: any) => `${c.timestamp},${c.open},${c.high},${c.low},${c.close},${c.volume}`);
        const csv = [header, ...lines].join('\n');
        return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
      }
      if (format === 'ndjson') {
        const ndjson = candles.map((c: any) => JSON.stringify(c)).join('\n');
        return new Response(ndjson, { headers: { 'Content-Type': 'application/x-ndjson' } });
      }
      return { success: true, data: candles };
    },
    {
      params: t.Object({ id: t.String(), symbol: t.String(), timeframe: t.String() }),
      query: t.Object({ since: t.Optional(t.String()), limit: t.Optional(t.String()), format: t.Optional(t.String()) }),
      detail: {
        tags: ['Exchanges'],
        summary: 'Get OHLCV candles',
        description: 'Fetch unified OHLCV data for a symbol/timeframe',
      },
    }
  )

  /**
   * Get trades
   * GET /api/v1/exchanges/connections/:id/trades/:symbol
   */
  .get(
    '/connections/:id/trades/:symbol',
    async ({ user, tenantId, params, query }: any) => {
      const since = query.since ? parseInt(query.since) : undefined;
      const limit = query.limit ? parseInt(query.limit) : undefined;
      const minAmount = query.minAmount ? parseFloat(query.minAmount) : undefined;
      const minCost = query.minCost ? parseFloat(query.minCost) : undefined;
      const start = query.start ? parseInt(query.start) : undefined;
      const end = query.end ? parseInt(query.end) : undefined;

      let trades = await ExchangeService.fetchTrades(
        params.id,
        user.id,
        tenantId,
        params.symbol,
        since,
        limit
      );

      // Filtros avançados
      if (start) trades = trades.filter((t) => t.timestamp >= start);
      if (end) trades = trades.filter((t) => t.timestamp <= end);
      if (minAmount) trades = trades.filter((t) => (t.amount || 0) >= minAmount);
      if (minCost) trades = trades.filter((t) => (t.cost || (t.amount || 0) * (t.price || 0)) >= minCost);
      const format = (query.format || '').toLowerCase();
      if (format === 'csv') {
        const header = 'id,timestamp,price,amount,side';
        const lines = trades.map((t: any) => `${t.id || ''},${t.timestamp},${t.price},${t.amount},${t.side || ''}`);
        const csv = [header, ...lines].join('\n');
        return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
      }
      if (format === 'ndjson') {
        const ndjson = trades.map((t: any) => JSON.stringify(t)).join('\n');
        return new Response(ndjson, { headers: { 'Content-Type': 'application/x-ndjson' } });
      }
      return { success: true, data: trades };
    },
    {
      params: t.Object({ id: t.String(), symbol: t.String() }),
      query: t.Object({
        since: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        minAmount: t.Optional(t.String()),
        minCost: t.Optional(t.String()),
        start: t.Optional(t.String()),
        end: t.Optional(t.String()),
        format: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Exchanges'],
        summary: 'Get trades',
        description: 'Fetch unified recent trades for a symbol',
      },
    }
  )

  /**
   * Admin: refresh markets (bypass cache)
   * POST /api/v1/exchanges/connections/:id/markets/refresh
   */
  .post(
    '/connections/:id/markets/refresh',
    async ({ user, tenantId, params }: any) => {
      const markets = await ExchangeService.refreshMarkets(params.id, user.id, tenantId);
      return { success: true, data: { refreshed: true, count: markets.length } };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ['Exchanges'],
        summary: 'Refresh markets cache and persistence',
        description: 'Force reload markets from exchange and refresh cache/persistence',
      },
    }
  )

  /**
   * Connection status/health
   * GET /api/v1/exchanges/connections/:id/status
   */
  .get(
    '/connections/:id/status',
    async ({ user, tenantId, params }: any) => {
      const connection = await ExchangeService.getConnectionById(params.id, user.id, tenantId);
      const info = ExchangeService.getExchangeInfo(connection.exchangeId);
      return {
        success: true,
        data: {
          connection: {
            id: connection.id,
            exchangeId: connection.exchangeId,
            sandbox: connection.sandbox,
            status: connection.status,
            isVerified: connection.isVerified,
            lastSyncAt: connection.lastSyncAt,
          },
          exchange: info,
        },
      };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ['Exchanges'],
        summary: 'Get connection status',
        description: 'Return connection status and exchange capabilities',
      },
    }
  )

  /**
   * Test connection (revalidate credentials)
   * POST /api/v1/exchanges/connections/:id/test
   */
  .post(
    '/connections/:id/test',
    async ({ user, tenantId, params }: any) => {
      const connection = await ExchangeService.getConnectionById(params.id, user.id, tenantId);
      try {
        const ex = await ExchangeService.getCCXTInstance(params.id, user.id, tenantId);
        await ex.fetchBalance();
        return { success: true, data: { connectionId: connection.id, status: 'ok' } };
      } catch (error) {
        return { success: false, error: { message: (error as Error).message } };
      }
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ['Exchanges'],
        summary: 'Test exchange connection',
        description: 'Validate connection by performing a lightweight API call',
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
