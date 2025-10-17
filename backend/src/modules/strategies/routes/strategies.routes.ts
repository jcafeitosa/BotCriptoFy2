/**
 * Strategies Routes
 * RESTful API endpoints for trading strategies
 */

import { Elysia, t } from 'elysia';
import { strategyService } from '../services/strategy.service';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import logger from '@/utils/logger';

export const strategiesRoutes = new Elysia({ prefix: '/api/v1/strategies' })
  // Apply authentication middleware to all routes
  .use(sessionGuard)
  .use(requireTenant)

  // ============================================================================
  // STRATEGY CRUD
  // ============================================================================

  /**
   * Create new strategy
   * POST /api/v1/strategies
   */
  .post(
    '/',
    async ({ body, user, tenantId }) => {
      logger.info('POST /api/v1/strategies', { userId: user.id });

      const strategy = await strategyService.createStrategy(user.id, tenantId, body as any);

      return {
        success: true,
        data: strategy,
      };
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 100 }),
        description: t.Optional(t.String()),
        exchangeId: t.String(),
        symbol: t.String(),
        timeframe: t.String(),
        type: t.Union([
          t.Literal('trend_following'),
          t.Literal('mean_reversion'),
          t.Literal('breakout'),
          t.Literal('arbitrage'),
          t.Literal('scalping'),
          t.Literal('grid'),
          t.Literal('dca'),
        ]),
        indicators: t.Array(
          t.Object({
            type: t.String(),
            parameters: t.Record(t.String(), t.Any()),
            enabled: t.Boolean(),
          })
        ),
        conditions: t.Array(
          t.Object({
            type: t.Union([t.Literal('entry'), t.Literal('exit')]),
            rules: t.Array(
              t.Object({
                indicator: t.String(),
                operator: t.String(),
                value: t.Union([t.Number(), t.String()]),
                weight: t.Optional(t.Number()),
              })
            ),
            logic: t.Union([t.Literal('AND'), t.Literal('OR')]),
          })
        ),
        parameters: t.Optional(t.Record(t.String(), t.Any())),
        stopLossPercent: t.Optional(t.Number()),
        takeProfitPercent: t.Optional(t.Number()),
        trailingStopPercent: t.Optional(t.Number()),
        maxPositionSize: t.Optional(t.Number()),
        maxDrawdownPercent: t.Optional(t.Number()),
        tags: t.Optional(t.Array(t.String())),
        notes: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Strategies'],
        summary: 'Create new trading strategy',
        description: 'Create a new trading strategy with indicators and conditions',
      },
    }
  )

  /**
   * Get all strategies
   * GET /api/v1/strategies
   */
  .get(
    '/',
    async ({ query, user, tenantId }) => {
      logger.info('GET /api/v1/strategies', { userId: user.id });

      const strategies = await strategyService.getStrategies({
        userId: user.id,
        tenantId,
        exchangeId: query.exchangeId,
        symbol: query.symbol,
        type: query.type as any,
        status: query.status as any,
        limit: query.limit ? parseInt(query.limit) : 50,
        offset: query.offset ? parseInt(query.offset) : 0,
      });

      return {
        success: true,
        data: strategies,
        pagination: {
          limit: query.limit ? parseInt(query.limit) : 50,
          offset: query.offset ? parseInt(query.offset) : 0,
          total: strategies.length,
        },
      };
    },
    {
      query: t.Object({
        exchangeId: t.Optional(t.String()),
        symbol: t.Optional(t.String()),
        type: t.Optional(t.String()),
        status: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Strategies'],
        summary: 'Get all strategies',
        description: 'Get all trading strategies for the authenticated user',
      },
    }
  )

  /**
   * Get strategy by ID
   * GET /api/v1/strategies/:id
   */
  .get(
    '/:id',
    async ({ params, user, tenantId }) => {
      logger.info('GET /api/v1/strategies/:id', { strategyId: params.id });

      const strategy = await strategyService.getStrategy(params.id, user.id, tenantId);

      if (!strategy) {
        return {
          success: false,
          error: 'Strategy not found',
        };
      }

      return {
        success: true,
        data: strategy,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ['Strategies'],
        summary: 'Get strategy by ID',
        description: 'Get a specific trading strategy by ID',
      },
    }
  )

  /**
   * Update strategy
   * PUT /api/v1/strategies/:id
   */
  .put(
    '/:id',
    async ({ params, body, user, tenantId }) => {
      logger.info('PUT /api/v1/strategies/:id', { strategyId: params.id });

      const strategy = await strategyService.updateStrategy(params.id, user.id, tenantId, body as any);

      return {
        success: true,
        data: strategy,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        name: t.Optional(t.String()),
        description: t.Optional(t.String()),
        indicators: t.Optional(t.Array(t.Any())),
        conditions: t.Optional(t.Array(t.Any())),
        parameters: t.Optional(t.Record(t.String(), t.Any())),
        stopLossPercent: t.Optional(t.Number()),
        takeProfitPercent: t.Optional(t.Number()),
        trailingStopPercent: t.Optional(t.Number()),
        maxPositionSize: t.Optional(t.Number()),
        maxDrawdownPercent: t.Optional(t.Number()),
        status: t.Optional(t.String()),
        tags: t.Optional(t.Array(t.String())),
        notes: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Strategies'],
        summary: 'Update strategy',
        description: 'Update a trading strategy',
      },
    }
  )

  /**
   * Delete strategy
   * DELETE /api/v1/strategies/:id
   */
  .delete(
    '/:id',
    async ({ params, user, tenantId }) => {
      logger.info('DELETE /api/v1/strategies/:id', { strategyId: params.id });

      await strategyService.deleteStrategy(params.id, user.id, tenantId);

      return {
        success: true,
        message: 'Strategy deleted successfully',
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ['Strategies'],
        summary: 'Delete strategy',
        description: 'Delete a trading strategy',
      },
    }
  )

  // ============================================================================
  // STRATEGY EXECUTION
  // ============================================================================

  /**
   * Activate strategy
   * POST /api/v1/strategies/:id/activate
   */
  .post(
    '/:id/activate',
    async ({ params, user, tenantId }) => {
      logger.info('POST /api/v1/strategies/:id/activate', { strategyId: params.id });

      const strategy = await strategyService.activateStrategy(params.id, user.id, tenantId);

      return {
        success: true,
        data: strategy,
        message: 'Strategy activated successfully',
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ['Strategies'],
        summary: 'Activate strategy',
        description: 'Activate a trading strategy to start generating signals',
      },
    }
  )

  /**
   * Pause strategy
   * POST /api/v1/strategies/:id/pause
   */
  .post(
    '/:id/pause',
    async ({ params, user, tenantId }) => {
      logger.info('POST /api/v1/strategies/:id/pause', { strategyId: params.id });

      const strategy = await strategyService.pauseStrategy(params.id, user.id, tenantId);

      return {
        success: true,
        data: strategy,
        message: 'Strategy paused successfully',
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ['Strategies'],
        summary: 'Pause strategy',
        description: 'Pause an active trading strategy',
      },
    }
  )

  // ============================================================================
  // SIGNALS
  // ============================================================================

  /**
   * Get signals
   * GET /api/v1/strategies/signals
   */
  .get(
    '/signals/all',
    async ({ query, user, tenantId }) => {
      logger.info('GET /api/v1/strategies/signals/all', { userId: user.id });

      const signals = await strategyService.getSignals({
        userId: user.id,
        tenantId: tenantId,
        strategyId: query.strategyId,
        exchangeId: query.exchangeId,
        symbol: query.symbol,
        type: query.type as any,
        status: query.status as any,
        limit: query.limit ? parseInt(query.limit) : 50,
        offset: query.offset ? parseInt(query.offset) : 0,
      });

      return {
        success: true,
        data: signals,
        pagination: {
          limit: query.limit ? parseInt(query.limit) : 50,
          offset: query.offset ? parseInt(query.offset) : 0,
          total: signals.length,
        },
      };
    },
    {
      query: t.Object({
        strategyId: t.Optional(t.String()),
        exchangeId: t.Optional(t.String()),
        symbol: t.Optional(t.String()),
        type: t.Optional(t.String()),
        status: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Strategies'],
        summary: 'Get all signals',
        description: 'Get all trading signals generated by strategies',
      },
    }
  )

  /**
   * Get signals for strategy
   * GET /api/v1/strategies/:id/signals
   */
  .get(
    '/:id/signals',
    async ({ params, query, user, tenantId }) => {
      logger.info('GET /api/v1/strategies/:id/signals', { strategyId: params.id });

      const signals = await strategyService.getSignals({
        userId: user.id,
        tenantId: tenantId,
        strategyId: params.id,
        limit: query.limit ? parseInt(query.limit) : 50,
        offset: query.offset ? parseInt(query.offset) : 0,
      });

      return {
        success: true,
        data: signals,
        pagination: {
          limit: query.limit ? parseInt(query.limit) : 50,
          offset: query.offset ? parseInt(query.offset) : 0,
          total: signals.length,
        },
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      query: t.Object({
        limit: t.Optional(t.String()),
        offset: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Strategies'],
        summary: 'Get signals for strategy',
        description: 'Get all signals generated by a specific strategy',
      },
    }
  )

  /**
   * Generate signal manually
   * POST /api/v1/strategies/:id/signals/generate
   */
  .post(
    '/:id/signals/generate',
    async ({ params }) => {
      logger.info('POST /api/v1/strategies/:id/signals/generate', { strategyId: params.id });

      const signal = await strategyService.generateSignal(params.id);

      return {
        success: true,
        data: signal,
        message: signal ? 'Signal generated successfully' : 'No signal generated (conditions not met)',
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ['Strategies'],
        summary: 'Generate signal manually',
        description: 'Manually trigger signal generation for a strategy',
      },
    }
  )

  // ============================================================================
  // BACKTESTING
  // ============================================================================

  /**
   * Run backtest
   * POST /api/v1/strategies/:id/backtest
   */
  .post(
    '/:id/backtest',
    async ({ params, body, user, tenantId }) => {
      logger.info('POST /api/v1/strategies/:id/backtest', { strategyId: params.id });

      const backtest = await strategyService.runBacktest(user.id, tenantId, {
        strategyId: params.id,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        initialCapital: body.initialCapital,
      });

      return {
        success: true,
        data: backtest,
        message: 'Backtest started successfully',
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        startDate: t.String(),
        endDate: t.String(),
        initialCapital: t.Number(),
      }),
      detail: {
        tags: ['Strategies'],
        summary: 'Run backtest',
        description: 'Run a backtest for a trading strategy',
      },
    }
  )

  /**
   * Get backtest results
   * GET /api/v1/strategies/:id/backtest/:backtestId
   */
  .get(
    '/:id/backtest/:backtestId',
    async ({ params, user, tenantId }) => {
      logger.info('GET /api/v1/strategies/:id/backtest/:backtestId', {
        strategyId: params.id,
        backtestId: params.backtestId,
      });

      const backtest = await strategyService.getBacktest(params.backtestId, user.id, tenantId);

      if (!backtest) {
        return {
          success: false,
          error: 'Backtest not found',
        };
      }

      return {
        success: true,
        data: backtest,
      };
    },
    {
      params: t.Object({
        id: t.String(),
        backtestId: t.String(),
      }),
      detail: {
        tags: ['Strategies'],
        summary: 'Get backtest results',
        description: 'Get results of a specific backtest',
      },
    }
  )

  /**
   * Get all backtests for strategy
   * GET /api/v1/strategies/:id/backtests
   */
  .get(
    '/:id/backtests',
    async ({ params, user, tenantId }) => {
      logger.info('GET /api/v1/strategies/:id/backtests', { strategyId: params.id });

      const backtests = await strategyService.getBacktests(params.id, user.id, tenantId);

      return {
        success: true,
        data: backtests,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ['Strategies'],
        summary: 'Get all backtests',
        description: 'Get all backtests for a specific strategy',
      },
    }
  )

  // ============================================================================
  // STATISTICS
  // ============================================================================

  /**
   * Get strategy statistics
   * GET /api/v1/strategies/stats
   */
  .get(
    '/stats/overview',
    async ({ user, tenantId }) => {
      logger.info('GET /api/v1/strategies/stats/overview', { userId: user.id });

      const statistics = await strategyService.getStrategyStatistics(user.id, tenantId);

      return {
        success: true,
        data: statistics,
      };
    },
    {
      detail: {
        tags: ['Strategies'],
        summary: 'Get strategy statistics',
        description: 'Get overall statistics for all user strategies',
      },
    }
  );
