/**
 * Market Data Routes
 * API endpoints for market data operations
 */

import { Elysia, t } from 'elysia';
import { sessionGuard } from '../../auth/middleware/session.middleware';
import { OHLCVService } from '../services/ohlcv.service';
import { TradesService } from '../services/trades.service';
import { OrderBookService } from '../services/orderbook.service';
import { TickerService } from '../services/ticker.service';
import logger from '@/utils/logger';

export const marketDataRoutes = new Elysia({ prefix: '/api/v1/market-data' })
  .use(sessionGuard)

  /**
   * Get OHLCV data
   * GET /api/v1/market-data/ohlcv/:exchangeId/:symbol/:timeframe
   */
  .get(
    '/ohlcv/:exchangeId/:symbol/:timeframe',
    async ({ params, query }: any) => {
      logger.info('Getting OHLCV data', params);

      const startDate = query.startDate ? new Date(query.startDate) : undefined;
      const endDate = query.endDate ? new Date(query.endDate) : undefined;

      const candles = await OHLCVService.getOHLCV({
        exchangeId: params.exchangeId,
        symbol: params.symbol,
        timeframe: params.timeframe,
        startDate,
        endDate,
        limit: query.limit ? parseInt(query.limit) : 1000,
        offset: query.offset ? parseInt(query.offset) : 0,
      });

      return { success: true, data: candles };
    },
    {
      params: t.Object({
        exchangeId: t.String(),
        symbol: t.String(),
        timeframe: t.String(),
      }),
      query: t.Object({
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Market Data'],
        summary: 'Get OHLCV candles',
        description: 'Get historical OHLCV (candlestick) data for a symbol',
      },
    }
  )

  /**
   * Fetch fresh OHLCV from exchange
   * POST /api/v1/market-data/ohlcv/fetch
   */
  .post(
    '/ohlcv/fetch',
    async ({ body }: any) => {
      logger.info('Fetching OHLCV from exchange', body);

      const candles = await OHLCVService.fetchOHLCV({
        exchangeId: body.exchangeId,
        symbol: body.symbol,
        timeframe: body.timeframe,
        since: body.since ? new Date(body.since) : undefined,
        limit: body.limit,
      });

      // Store in database
      await OHLCVService.storeOHLCV(candles);

      return { success: true, data: candles };
    },
    {
      body: t.Object({
        exchangeId: t.String(),
        symbol: t.String(),
        timeframe: t.String(),
        since: t.Optional(t.String()),
        limit: t.Optional(t.Number()),
      }),
      detail: {
        tags: ['Market Data'],
        summary: 'Fetch OHLCV from exchange',
        description: 'Fetch fresh OHLCV data from exchange and store in database',
      },
    }
  )

  /**
   * Sync historical OHLCV
   * POST /api/v1/market-data/ohlcv/sync
   */
  .post(
    '/ohlcv/sync',
    async ({ body }: any) => {
      logger.info('Starting historical OHLCV sync', body);

      const syncStatus = await OHLCVService.syncHistoricalData({
        exchangeId: body.exchangeId,
        symbol: body.symbol,
        timeframe: body.timeframe,
        startDate: new Date(body.startDate),
        endDate: body.endDate ? new Date(body.endDate) : new Date(),
        batchSize: body.batchSize,
      });

      return { success: true, data: syncStatus };
    },
    {
      body: t.Object({
        exchangeId: t.String(),
        symbol: t.String(),
        timeframe: t.String(),
        startDate: t.String(),
        endDate: t.Optional(t.String()),
        batchSize: t.Optional(t.Number()),
      }),
      detail: {
        tags: ['Market Data'],
        summary: 'Sync historical OHLCV',
        description: 'Sync historical OHLCV data from exchange',
      },
    }
  )

  /**
   * Detect data gaps
   * GET /api/v1/market-data/ohlcv/gaps/:exchangeId/:symbol/:timeframe
   */
  .get(
    '/ohlcv/gaps/:exchangeId/:symbol/:timeframe',
    async ({ params }: any) => {
      logger.info('Detecting OHLCV gaps', params);

      const gaps = await OHLCVService.detectGaps(
        params.exchangeId,
        params.symbol,
        params.timeframe
      );

      return { success: true, data: gaps };
    },
    {
      params: t.Object({
        exchangeId: t.String(),
        symbol: t.String(),
        timeframe: t.String(),
      }),
      detail: {
        tags: ['Market Data'],
        summary: 'Detect data gaps',
        description: 'Detect gaps in OHLCV data',
      },
    }
  )

  /**
   * Get trades
   * GET /api/v1/market-data/trades/:exchangeId/:symbol
   */
  .get(
    '/trades/:exchangeId/:symbol',
    async ({ params, query }: any) => {
      logger.info('Getting trades', params);

      const startDate = query.startDate ? new Date(query.startDate) : undefined;
      const endDate = query.endDate ? new Date(query.endDate) : undefined;

      const trades = await TradesService.getTrades({
        exchangeId: params.exchangeId,
        symbol: params.symbol,
        startDate,
        endDate,
        limit: query.limit ? parseInt(query.limit) : 1000,
        offset: query.offset ? parseInt(query.offset) : 0,
      });

      return { success: true, data: trades };
    },
    {
      params: t.Object({
        exchangeId: t.String(),
        symbol: t.String(),
      }),
      query: t.Object({
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Market Data'],
        summary: 'Get trades',
        description: 'Get historical trade data for a symbol',
      },
    }
  )

  /**
   * Fetch fresh trades
   * POST /api/v1/market-data/trades/fetch
   */
  .post(
    '/trades/fetch',
    async ({ body }: any) => {
      logger.info('Fetching trades from exchange', body);

      const trades = await TradesService.fetchTrades({
        exchangeId: body.exchangeId,
        symbol: body.symbol,
        since: body.since ? new Date(body.since) : undefined,
        limit: body.limit,
      });

      // Store in database
      await TradesService.storeTrades(trades);

      return { success: true, data: trades };
    },
    {
      body: t.Object({
        exchangeId: t.String(),
        symbol: t.String(),
        since: t.Optional(t.String()),
        limit: t.Optional(t.Number()),
      }),
      detail: {
        tags: ['Market Data'],
        summary: 'Fetch trades from exchange',
        description: 'Fetch fresh trade data from exchange and store in database',
      },
    }
  )

  /**
   * Get trade statistics
   * GET /api/v1/market-data/trades/stats/:exchangeId/:symbol
   */
  .get(
    '/trades/stats/:exchangeId/:symbol',
    async ({ params, query }: any) => {
      logger.info('Getting trade statistics', params);

      const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = query.endDate ? new Date(query.endDate) : new Date();

      const stats = await TradesService.getTradeStats(
        params.exchangeId,
        params.symbol,
        startDate,
        endDate
      );

      return { success: true, data: stats };
    },
    {
      params: t.Object({
        exchangeId: t.String(),
        symbol: t.String(),
      }),
      query: t.Object({
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Market Data'],
        summary: 'Get trade statistics',
        description: 'Get aggregated trade statistics for a time period',
      },
    }
  )

  /**
   * Get trade pressure
   * GET /api/v1/market-data/trades/pressure/:exchangeId/:symbol
   */
  .get(
    '/trades/pressure/:exchangeId/:symbol',
    async ({ params, query }: any) => {
      logger.info('Getting trade pressure', params);

      const minutes = query.minutes ? parseInt(query.minutes) : 60;

      const pressure = await TradesService.getTradePressure(
        params.exchangeId,
        params.symbol,
        minutes
      );

      return { success: true, data: pressure };
    },
    {
      params: t.Object({
        exchangeId: t.String(),
        symbol: t.String(),
      }),
      query: t.Object({
        minutes: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Market Data'],
        summary: 'Get trade pressure',
        description: 'Get buy/sell pressure from recent trades',
      },
    }
  )

  /**
   * Get order book
   * GET /api/v1/market-data/orderbook/:exchangeId/:symbol
   */
  .get(
    '/orderbook/:exchangeId/:symbol',
    async ({ params }: any) => {
      logger.info('Getting order book', params);

      const orderbook = await OrderBookService.getOrderBook(
        params.exchangeId,
        params.symbol
      );

      return { success: true, data: orderbook };
    },
    {
      params: t.Object({
        exchangeId: t.String(),
        symbol: t.String(),
      }),
      detail: {
        tags: ['Market Data'],
        summary: 'Get order book',
        description: 'Get latest order book snapshot',
      },
    }
  )

  /**
   * Fetch fresh order book
   * POST /api/v1/market-data/orderbook/fetch
   */
  .post(
    '/orderbook/fetch',
    async ({ body }: any) => {
      logger.info('Fetching order book from exchange', body);

      const orderbook = await OrderBookService.fetchOrderBook({
        exchangeId: body.exchangeId,
        symbol: body.symbol,
        limit: body.limit,
      });

      // Store in database
      await OrderBookService.storeOrderBook(orderbook);

      return { success: true, data: orderbook };
    },
    {
      body: t.Object({
        exchangeId: t.String(),
        symbol: t.String(),
        limit: t.Optional(t.Number()),
      }),
      detail: {
        tags: ['Market Data'],
        summary: 'Fetch order book from exchange',
        description: 'Fetch fresh order book from exchange and store in database',
      },
    }
  )

  /**
   * Get order book depth analysis
   * GET /api/v1/market-data/orderbook/depth/:exchangeId/:symbol
   */
  .get(
    '/orderbook/depth/:exchangeId/:symbol',
    async ({ params }: any) => {
      logger.info('Getting order book depth analysis', params);

      const depth = await OrderBookService.getOrderBookDepth(
        params.exchangeId,
        params.symbol
      );

      return { success: true, data: depth };
    },
    {
      params: t.Object({
        exchangeId: t.String(),
        symbol: t.String(),
      }),
      detail: {
        tags: ['Market Data'],
        summary: 'Get order book depth analysis',
        description: 'Get order book depth analysis with spread and imbalance',
      },
    }
  )

  /**
   * Get ticker
   * GET /api/v1/market-data/ticker/:exchangeId/:symbol
   */
  .get(
    '/ticker/:exchangeId/:symbol',
    async ({ params }: any) => {
      logger.info('Getting ticker', params);

      const ticker = await TickerService.getTicker(
        params.exchangeId,
        params.symbol
      );

      return { success: true, data: ticker };
    },
    {
      params: t.Object({
        exchangeId: t.String(),
        symbol: t.String(),
      }),
      detail: {
        tags: ['Market Data'],
        summary: 'Get ticker',
        description: 'Get latest ticker/price data',
      },
    }
  )

  /**
   * Fetch fresh ticker
   * POST /api/v1/market-data/ticker/fetch
   */
  .post(
    '/ticker/fetch',
    async ({ body }: any) => {
      logger.info('Fetching ticker from exchange', body);

      const ticker = await TickerService.fetchAndStore(
        body.exchangeId,
        body.symbol
      );

      return { success: true, data: ticker };
    },
    {
      body: t.Object({
        exchangeId: t.String(),
        symbol: t.String(),
      }),
      detail: {
        tags: ['Market Data'],
        summary: 'Fetch ticker from exchange',
        description: 'Fetch fresh ticker from exchange and store in database',
      },
    }
  )

  /**
   * Get price statistics
   * GET /api/v1/market-data/ticker/stats/:exchangeId/:symbol
   */
  .get(
    '/ticker/stats/:exchangeId/:symbol',
    async ({ params }: any) => {
      logger.info('Getting price statistics', params);

      const stats = await TickerService.getPriceStats(
        params.exchangeId,
        params.symbol
      );

      return { success: true, data: stats };
    },
    {
      params: t.Object({
        exchangeId: t.String(),
        symbol: t.String(),
      }),
      detail: {
        tags: ['Market Data'],
        summary: 'Get price statistics',
        description: 'Get price change statistics',
      },
    }
  );
