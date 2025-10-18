/**
 * Backtest Routes
 * REST API endpoints for strategy backtesting
 */

import { Elysia, t } from 'elysia';
import { BacktestService } from '../services/backtest.service';
import type { TradingStrategy } from '../../strategies/types/strategies.types';
import logger from '@/utils/logger';

export const backtestRoutes = new Elysia({ prefix: '/backtest' })
  /**
   * Create and run a new backtest
   */
  .post(
    '/',
    async ({ body }) => {
      logger.info('Creating new backtest', body);

      // Note: In a real implementation, you'd fetch the strategy from the database
      // For now, we'll use the strategy passed in the request
      const strategy = body.strategy as TradingStrategy;

      const result = await BacktestService.createAndRun(
        {
          userId: body.userId,
          tenantId: body.tenantId,
          strategyId: body.strategyId,
          name: body.name,
          description: body.description,
          symbol: body.symbol,
          timeframe: body.timeframe,
          startDate: new Date(body.startDate),
          endDate: new Date(body.endDate),
          initialCapital: body.initialCapital,
          positionSizePercent: body.positionSizePercent,
          commission: body.commission,
          slippage: body.slippage,
        },
        strategy
      );

      return result;
    },
    {
      body: t.Object({
        userId: t.String(),
        tenantId: t.String(),
        strategyId: t.String(),
        strategy: t.Any(), // TradingStrategy object
        name: t.String({ description: 'Backtest name' }),
        description: t.Optional(t.String()),
        symbol: t.String({ description: 'Trading pair (e.g., BTC/USDT)' }),
        timeframe: t.String({ description: 'Timeframe (e.g., 1h, 4h, 1d)' }),
        startDate: t.String({ description: 'ISO 8601 start date' }),
        endDate: t.String({ description: 'ISO 8601 end date' }),
        initialCapital: t.Optional(t.Number({ description: 'Initial capital (default: 10000)' })),
        positionSizePercent: t.Optional(t.Number({ description: 'Position size % (default: 10)', minimum: 1, maximum: 100 })),
        commission: t.Optional(t.Number({ description: 'Commission % (default: 0.1)' })),
        slippage: t.Optional(t.Number({ description: 'Slippage % (default: 0.05)' })),
      }),
      detail: {
        summary: 'Create and run backtest',
        description: 'Execute a backtest for a trading strategy against historical data',
        tags: ['Backtest'],
      },
    }
  )

  /**
   * Get backtest result by ID
   */
  .get(
    '/:id',
    async ({ params, query }) => {
      logger.info('Getting backtest result', { id: params.id, userId: query.userId });
      const result = await BacktestService.getResult(params.id, query.userId);
      return result;
    },
    {
      params: t.Object({
        id: t.String({ description: 'Backtest result ID' }),
      }),
      query: t.Object({
        userId: t.String({ description: 'User ID' }),
      }),
      detail: {
        summary: 'Get backtest result',
        description: 'Retrieve a completed backtest result with full metrics and trade history',
        tags: ['Backtest'],
      },
    }
  )

  /**
   * List backtest results
   */
  .get(
    '/',
    async ({ query }) => {
      logger.info('Listing backtest results', query);
      const results = await BacktestService.listResults(query.userId, {
        strategyId: query.strategyId,
        symbol: query.symbol,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        limit: query.limit,
      });
      return results;
    },
    {
      query: t.Object({
        userId: t.String(),
        strategyId: t.Optional(t.String({ description: 'Filter by strategy ID' })),
        symbol: t.Optional(t.String({ description: 'Filter by trading pair' })),
        startDate: t.Optional(t.String({ description: 'Filter by start date (ISO 8601)' })),
        endDate: t.Optional(t.String({ description: 'Filter by end date (ISO 8601)' })),
        limit: t.Optional(t.Number({ description: 'Max results (default: 100)', maximum: 1000 })),
      }),
      detail: {
        summary: 'List backtest results',
        description: 'Get a list of backtest results with optional filtering',
        tags: ['Backtest'],
      },
    }
  )

  /**
   * Compare multiple backtest results
   */
  .post(
    '/compare',
    async ({ body }) => {
      logger.info('Comparing backtest results', body);
      const comparison = await BacktestService.compareResults(
        body.userId,
        body.tenantId,
        body.name,
        body.resultIds
      );
      return comparison;
    },
    {
      body: t.Object({
        userId: t.String(),
        tenantId: t.String(),
        name: t.String({ description: 'Comparison name' }),
        resultIds: t.Array(t.String(), { description: 'Backtest result IDs to compare', minItems: 2 }),
      }),
      detail: {
        summary: 'Compare backtest results',
        description: 'Create a side-by-side comparison of multiple backtest results',
        tags: ['Backtest'],
      },
    }
  )

  /**
   * Delete backtest result
   */
  .delete(
    '/:id',
    async ({ params, query }) => {
      logger.info('Deleting backtest result', { id: params.id, userId: query.userId });
      await BacktestService.deleteResult(params.id, query.userId);
      return { success: true, message: 'Backtest result deleted' };
    },
    {
      params: t.Object({
        id: t.String({ description: 'Backtest result ID' }),
      }),
      query: t.Object({
        userId: t.String({ description: 'User ID' }),
      }),
      detail: {
        summary: 'Delete backtest result',
        description: 'Permanently delete a backtest result',
        tags: ['Backtest'],
      },
    }
  )

  /**
   * Archive old backtest results
   */
  .post(
    '/archive',
    async ({ body }) => {
      logger.info('Archiving old backtest results', body);
      const archivedCount = await BacktestService.archiveOldResults(body.olderThanDays);
      return { archivedCount, message: `Archived ${archivedCount} old backtest results` };
    },
    {
      body: t.Object({
        olderThanDays: t.Number({ description: 'Archive results older than N days (default: 90)', minimum: 1 }),
      }),
      detail: {
        summary: 'Archive old backtest results',
        description: 'Mark old backtest results as archived (soft delete)',
        tags: ['Backtest'],
      },
    }
  );
