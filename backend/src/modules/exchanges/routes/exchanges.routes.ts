import { Elysia, t } from 'elysia';
import { sessionGuard } from '@/modules/auth/middleware/session.middleware';
import { requirePermission } from '@/modules/security/middleware/rbac.middleware';
import { ExchangeService } from '../services/exchange.service';
import { ExchangeConfigurationService } from '../services/exchange-config.service';
import { ExchangeConnectionService } from '../services/exchange-connection.service';
import { createWebSocketAdapter, getDefaultWebSocketConfig } from '../services/exchange-websocket.service';
import type { ExchangeId } from '@/modules/market-data/websocket/types';
import logger from '@/utils/logger';
import { BadRequestError, NotFoundError } from '@/utils/errors';

const resolveTenantId = (context: any): string => {
  const tenantId = context.tenantId ?? (context.session as any)?.activeOrganizationId;
  if (!tenantId) {
    throw new BadRequestError('Tenant context is required');
  }
  return tenantId;
};

const resolveExchangeSlug = (payload: { exchangeSlug?: string; exchangeId?: string }): string => {
  const candidate = payload.exchangeSlug ?? payload.exchangeId;
  if (!candidate) {
    throw new BadRequestError('exchangeSlug or exchangeId must be provided');
  }
  return candidate.toLowerCase();
};

export const exchangesRoutes = new Elysia({ prefix: '/api/v1/exchanges' })
  .use(sessionGuard)

  // ===== PUBLIC EXCHANGE INFORMATION (READ PERMISSION) =====
  .use(requirePermission('exchanges', 'read'))
  .get(
    '/',
    async () => {
      await ExchangeService.bootstrapCatalog();
      const list = await ExchangeService.listExchanges();
      return { success: true, data: list };
    },
    {
      detail: {
        tags: ['Exchanges'],
        summary: 'List supported exchanges',
        description: 'Returns catalog of exchanges with metadata and capabilities.',
      },
    }
  )
  .get(
    '/supported',
    async () => {
      await ExchangeService.bootstrapCatalog();
      const list = await ExchangeService.listExchanges();
      return { success: true, data: list };
    },
    {
      detail: {
        tags: ['Exchanges'],
        summary: 'List supported exchanges (alias)',
        description: 'Alias for GET /api/v1/exchanges returning exchange catalog.',
      },
    }
  )
  .get(
    '/info/:slug',
    async ({ params }) => {
      if (!ExchangeService.isExchangeSupported(params.slug)) {
        throw new NotFoundError(`Exchange ${params.slug} is not supported`);
      }

      const [metadata, info] = await Promise.all([
        ExchangeService.getExchangeBySlug(params.slug),
        ExchangeService.getExchangeInfo(params.slug),
      ]);

      return {
        success: true,
        data: {
          metadata,
          info,
        },
      };
    },
    {
      params: t.Object({ slug: t.String({ minLength: 2 }) }),
      detail: {
        tags: ['Exchanges'],
        summary: 'Exchange capabilities',
        description: 'Returns CCXT describe() information alongside catalog metadata.',
      },
    }
  )
  .get(
    '/:slug/default-websocket-config',
    async ({ params }) => {
      const exchangeId = params.slug as ExchangeId;
      const config = getDefaultWebSocketConfig(exchangeId);
      return { success: true, data: config };
    },
    {
      params: t.Object({ slug: t.String({ minLength: 2 }) }),
      detail: {
        tags: ['Exchanges'],
        summary: 'Default WebSocket configuration',
        description: 'Returns default configuration used by the polling WebSocket adapter.',
      },
    }
  )
  .post(
    '/:slug/test-websocket',
    async ({ params }) => {
      const exchangeId = params.slug as ExchangeId;
      const adapter = createWebSocketAdapter(exchangeId, getDefaultWebSocketConfig(exchangeId));
      await adapter.connect();
      await adapter.ping();
      await adapter.disconnect();
      return { success: true };
    },
    {
      params: t.Object({ slug: t.String({ minLength: 2 }) }),
      detail: {
        tags: ['Exchanges'],
        summary: 'Test WebSocket connectivity',
        description: 'Performs a connectivity test using the polling adapter for the given exchange.',
      },
    }
  )
  .get(
    '/:slug/markets',
    async ({ params, query }) => {
      const markets = await ExchangeService.getMarkets(params.slug, {
        quote: query.quote,
        limit: query.limit ? Number(query.limit) : undefined,
      });
      return { success: true, data: markets };
    },
    {
      params: t.Object({ slug: t.String({ minLength: 2 }) }),
      query: t.Object({
        quote: t.Optional(t.String({ minLength: 2, maxLength: 10 })),
        limit: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Exchanges'],
        summary: 'List exchange markets',
        description: 'Fetches market information for a specific exchange via CCXT.',
      },
    }
  )

  // ===== USER CONFIGURATION MANAGEMENT (MANAGE PERMISSION) =====
  .use(requirePermission('exchanges', 'manage'))
  .get(
    '/connections',
    async (context) => {
      const tenantId = resolveTenantId(context);
      const connections = await ExchangeConnectionService.listConnections({
        userId: context.user.id,
        tenantId,
      });
      return { success: true, data: connections };
    },
    {
      detail: {
        tags: ['Exchanges'],
        summary: 'List user exchange connections',
        description: 'Lists exchange API connections configured by the authenticated user.',
      },
    }
  )
  .post(
    '/connections',
    async ({ user, session, body }) => {
      const tenantId = resolveTenantId({ session });
      const exchangeSlug = resolveExchangeSlug(body);

      const connection = await ExchangeConnectionService.createConnection({
        userId: user.id,
        tenantId,
        request: {
          exchangeSlug,
          apiKey: body.apiKey,
          apiSecret: body.apiSecret,
          passphrase: body.passphrase,
          sandbox: body.sandbox,
          permissions: body.permissions,
        },
      });

      logger.info('Exchange connection created', {
        exchange: exchangeSlug,
        userId: user.id,
        tenantId,
      });

      return { success: true, data: connection };
    },
    {
      body: t.Object({
        exchangeSlug: t.Optional(t.String({ minLength: 2 })),
        exchangeId: t.Optional(t.String({ minLength: 2 })),
        apiKey: t.String({ minLength: 8 }),
        apiSecret: t.String({ minLength: 8 }),
        passphrase: t.Optional(t.String()),
        sandbox: t.Optional(t.Boolean()),
        permissions: t.Optional(t.Record(t.String(), t.Boolean())),
      }),
      detail: {
        tags: ['Exchanges'],
        summary: 'Create exchange connection',
        description: 'Validates credentials and stores encrypted API keys for a tenant.',
      },
    }
  )
  .get(
    '/connections/:id',
    async (context) => {
      const tenantId = resolveTenantId(context);
      const connection = await ExchangeConnectionService.getConnectionSummary({
        userId: context.user.id,
        tenantId,
        configurationId: context.params.id,
      });
      return { success: true, data: connection };
    },
    {
      params: t.Object({ id: t.String({ minLength: 10 }) }),
      detail: {
        tags: ['Exchanges'],
        summary: 'Get exchange connection',
        description: 'Returns sanitized details about a specific exchange connection.',
      },
    }
  )
  .delete(
    '/connections/:id',
    async (context) => {
      const tenantId = resolveTenantId(context);
      await ExchangeConfigurationService.disableConfiguration({
        configurationId: context.params.id,
        tenantId,
        userId: context.user.id,
      });
      logger.info('Exchange connection disabled', {
        configurationId: context.params.id,
        userId: context.user.id,
        tenantId,
      });
      return { success: true };
    },
    {
      params: t.Object({ id: t.String({ minLength: 10 }) }),
      detail: {
        tags: ['Exchanges'],
        summary: 'Disable exchange connection',
        description: 'Disables an exchange connection without deleting historical data.',
      },
    }
  )
  .get(
    '/connections/:id/status',
    async (context) => {
      const tenantId = resolveTenantId(context);
      const status = await ExchangeConnectionService.getConnectionStatus({
        userId: context.user.id,
        tenantId,
        configurationId: context.params.id,
      });
      return { success: true, data: status };
    },
    {
      params: t.Object({ id: t.String({ minLength: 10 }) }),
      detail: {
        tags: ['Exchanges'],
        summary: 'Connection status',
        description: 'Returns capabilities, last sync information and errors for a connection.',
      },
    }
  )
  .post(
    '/connections/:id/test',
    async (context) => {
      const tenantId = resolveTenantId(context);
      await ExchangeConnectionService.testConnection({
        userId: context.user.id,
        tenantId,
        configurationId: context.params.id,
      });
      return { success: true };
    },
    {
      params: t.Object({ id: t.String({ minLength: 10 }) }),
      detail: {
        tags: ['Exchanges'],
        summary: 'Test exchange connection',
        description: 'Validates stored credentials by performing a balance fetch.',
      },
    }
  )
  .get(
    '/connections/:id/balances',
    async (context) => {
      const tenantId = resolveTenantId(context);
      const balances = await ExchangeConnectionService.fetchBalances({
        userId: context.user.id,
        tenantId,
        configurationId: context.params.id,
      });
      return { success: true, data: balances };
    },
    {
      params: t.Object({ id: t.String({ minLength: 10 }) }),
      detail: {
        tags: ['Exchanges'],
        summary: 'Fetch balances',
        description: 'Retrieves normalized balances from the connected exchange.',
      },
    }
  )
  .get(
    '/connections/:id/ticker/:symbol',
    async (context) => {
      const tenantId = resolveTenantId(context);
      const ticker = await ExchangeConnectionService.fetchTicker({
        userId: context.user.id,
        tenantId,
        configurationId: context.params.id,
        symbol: decodeURIComponent(context.params.symbol),
      });
      return { success: true, data: ticker };
    },
    {
      params: t.Object({
        id: t.String({ minLength: 10 }),
        symbol: t.String({ minLength: 3 }),
      }),
      detail: {
        tags: ['Exchanges'],
        summary: 'Fetch ticker',
        description: 'Retrieves normalized ticker data for a given trading pair.',
      },
    }
  )
  .get(
    '/connections/:id/markets',
    async (context) => {
      const tenantId = resolveTenantId(context);
      const markets = await ExchangeConnectionService.listMarkets({
        userId: context.user.id,
        tenantId,
        configurationId: context.params.id,
      });
      return { success: true, data: markets };
    },
    {
      params: t.Object({ id: t.String({ minLength: 10 }) }),
      detail: {
        tags: ['Exchanges'],
        summary: 'List connection markets',
        description: 'Lists markets available for the specific authenticated exchange connection.',
      },
    }
  )
  .get(
    '/connections/:id/markets/:symbol',
    async (context) => {
      const tenantId = resolveTenantId(context);
      const market = await ExchangeConnectionService.getMarket({
        userId: context.user.id,
        tenantId,
        configurationId: context.params.id,
        symbol: decodeURIComponent(context.params.symbol),
      });
      return { success: true, data: market };
    },
    {
      params: t.Object({
        id: t.String({ minLength: 10 }),
        symbol: t.String({ minLength: 3 }),
      }),
      detail: {
        tags: ['Exchanges'],
        summary: 'Get market detail',
        description: 'Returns metadata for a specific market symbol via the authenticated connection.',
      },
    }
  )
  .get(
    '/connections/:id/orderbook/:symbol',
    async (context) => {
      const tenantId = resolveTenantId(context);
      const depthParam = context.query.depth ? Number(context.query.depth) : undefined;
      const orderbook = await ExchangeConnectionService.fetchOrderBook({
        userId: context.user.id,
        tenantId,
        configurationId: context.params.id,
        symbol: decodeURIComponent(context.params.symbol),
        depth: depthParam,
      });
      return { success: true, data: orderbook };
    },
    {
      params: t.Object({
        id: t.String({ minLength: 10 }),
        symbol: t.String({ minLength: 3 }),
      }),
      query: t.Object({
        depth: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Exchanges'],
        summary: 'Order book snapshot',
        description: 'Fetches a normalized order book snapshot for the provided symbol.',
      },
    }
  )
  .get(
    '/connections/:id/ohlcv/:symbol/:timeframe',
    async (context) => {
      const tenantId = resolveTenantId(context);
      const { since, limit } = context.query;
      const candles = await ExchangeConnectionService.fetchOHLCV({
        userId: context.user.id,
        tenantId,
        configurationId: context.params.id,
        symbol: decodeURIComponent(context.params.symbol),
        timeframe: context.params.timeframe,
        since: since ? Number(since) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      return { success: true, data: candles };
    },
    {
      params: t.Object({
        id: t.String({ minLength: 10 }),
        symbol: t.String({ minLength: 3 }),
        timeframe: t.String({ minLength: 1 }),
      }),
      query: t.Object({
        since: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Exchanges'],
        summary: 'OHLCV candles',
        description: 'Retrieves normalized historical candles for the provided symbol/timeframe.',
      },
    }
  )
  .get(
    '/connections/:id/trades/:symbol',
    async (context) => {
      const tenantId = resolveTenantId(context);
      const trades = await ExchangeConnectionService.fetchTrades({
        userId: context.user.id,
        tenantId,
        configurationId: context.params.id,
        symbol: decodeURIComponent(context.params.symbol),
        since: context.query.since ? Number(context.query.since) : undefined,
        limit: context.query.limit ? Number(context.query.limit) : undefined,
      });
      return { success: true, data: trades };
    },
    {
      params: t.Object({
        id: t.String({ minLength: 10 }),
        symbol: t.String({ minLength: 3 }),
      }),
      query: t.Object({
        since: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Exchanges'],
        summary: 'Recent trades',
        description: 'Retrieves normalized trade history for the provided symbol.',
      },
    }
  )

  // ===== LEGACY CONFIG ROUTES (BACKWARD COMPATIBILITY) =====
  .post(
    '/config',
    async ({ user, session, body }) => {
      const tenantId = resolveTenantId({ session });
      const exchangeSlug = resolveExchangeSlug(body);

      const connection = await ExchangeConnectionService.createConnection({
        userId: user.id,
        tenantId,
        request: {
          exchangeSlug,
          apiKey: body.apiKey,
          apiSecret: body.apiSecret,
          passphrase: body.passphrase,
          sandbox: body.sandbox,
          permissions: body.permissions,
        },
      });

      logger.info('Legacy exchange configuration created', {
        exchange: exchangeSlug,
        userId: user.id,
        tenantId,
      });

      return { success: true, data: connection };
    },
    {
      body: t.Object({
        exchangeSlug: t.Optional(t.String({ minLength: 2 })),
        exchangeId: t.Optional(t.String({ minLength: 2 })),
        apiKey: t.String({ minLength: 8 }),
        apiSecret: t.String({ minLength: 8 }),
        passphrase: t.Optional(t.String()),
        sandbox: t.Optional(t.Boolean()),
        permissions: t.Optional(t.Record(t.String(), t.Boolean())),
      }),
      detail: {
        tags: ['Exchanges'],
        summary: 'Create exchange configuration (legacy alias)',
        description: 'Alias for POST /connections maintained for backward compatibility.',
      },
    }
  )
  .get(
    '/config',
    async (context) => {
      const tenantId = resolveTenantId(context);
      const configs = await ExchangeConnectionService.listConnections({
        userId: context.user.id,
        tenantId,
      });
      return { success: true, data: configs };
    },
    {
      detail: {
        tags: ['Exchanges'],
        summary: 'List exchange configurations (legacy alias)',
        description: 'Alias for GET /connections maintained for backward compatibility.',
      },
    }
  )
  .delete(
    '/config/:id',
    async (context) => {
      const tenantId = resolveTenantId(context);
      await ExchangeConfigurationService.deleteConfiguration({
        configurationId: context.params.id,
        tenantId,
        userId: context.user.id,
      });

      logger.info('Legacy exchange configuration deleted', {
        configurationId: context.params.id,
        userId: context.user.id,
        tenantId,
      });

      return { success: true };
    },
    {
      params: t.Object({ id: t.String({ minLength: 10 }) }),
      detail: {
        tags: ['Exchanges'],
        summary: 'Delete exchange configuration (legacy)',
        description: 'Physically deletes configuration record (legacy behaviour).',
      },
    }
  );
