/**
 * Indicators API Routes V2
 * RESTful endpoints for indicator calculations and management
 * Refactored to use calculator-v2 (async) and updated services
 *
 * @module indicators/routes
 */

import { Elysia, t } from 'elysia';
import { indicatorsService } from '../services/indicators.service';
import { sessionGuard } from '../../auth/middleware/session.middleware';
import { getUserPrimaryTenantId } from '../../tenants/services/membership.service';
import { BadRequestError } from '../../../utils/errors';
import type {
  CalculateIndicatorRequest,
  BatchCalculateRequest,
  CreatePresetRequest,
  UpdatePresetRequest,
  IndicatorType,
  IndicatorCategory,
  Timeframe,
} from '../types/indicators.types';

/**
 * Simple console logger
 */
const logger = {
  debug: (msg: string, meta?: any) => console.log(`[DEBUG] ${msg}`, meta ? JSON.stringify(meta) : ''),
  info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta ? JSON.stringify(meta) : ''),
  error: (msg: string, meta?: any) => console.error(`[ERROR] ${msg}`, meta ? JSON.stringify(meta) : ''),
  warn: (msg: string, meta?: any) => console.warn(`[WARN] ${msg}`, meta ? JSON.stringify(meta) : ''),
};

/**
 * Enhanced validation schemas using Elysia's type system
 */

// Timeframe enum
const TimeframeSchema = t.Union([
  t.Literal('1m'),
  t.Literal('3m'),
  t.Literal('5m'),
  t.Literal('15m'),
  t.Literal('30m'),
  t.Literal('1h'),
  t.Literal('2h'),
  t.Literal('4h'),
  t.Literal('6h'),
  t.Literal('12h'),
  t.Literal('1d'),
  t.Literal('1w'),
  t.Literal('1M'),
]);

// Indicator category enum
const IndicatorCategorySchema = t.Union([
  t.Literal('momentum'),
  t.Literal('trend'),
  t.Literal('volatility'),
  t.Literal('volume'),
  t.Literal('support_resistance'),
]);

// Base indicator configuration
const IndicatorConfigSchema = t.Object({
  type: t.String({ minLength: 1, maxLength: 50 }),
  period: t.Optional(t.Number({ minimum: 1, maximum: 500 })),
  parameters: t.Optional(t.Record(t.String(), t.Any())),
});

// Calculate single indicator request
const CalculateRequestSchema = t.Object({
  exchangeId: t.String({ minLength: 1, maxLength: 255 }),
  symbol: t.String({ minLength: 1, maxLength: 50, pattern: '^[A-Z0-9]+/[A-Z0-9]+$' }), // e.g., BTC/USDT
  timeframe: TimeframeSchema,
  indicatorType: t.String({ minLength: 1, maxLength: 50 }),
  configuration: IndicatorConfigSchema,
  limit: t.Optional(t.Number({ minimum: 10, maximum: 1000, default: 100 })),
  useCache: t.Optional(t.Boolean({ default: true })),
});

// Batch calculate request
const BatchCalculateRequestSchema = t.Object({
  exchangeId: t.String({ minLength: 1, maxLength: 255 }),
  symbol: t.String({ minLength: 1, maxLength: 50, pattern: '^[A-Z0-9]+/[A-Z0-9]+$' }),
  timeframe: TimeframeSchema,
  indicators: t.Array(IndicatorConfigSchema, { minItems: 1, maxItems: 20 }),
  limit: t.Optional(t.Number({ minimum: 10, maximum: 1000, default: 100 })),
  useCache: t.Optional(t.Boolean({ default: true })),
});

// Create preset request
const CreatePresetRequestSchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 255 }),
  description: t.Optional(t.String({ maxLength: 1000 })),
  category: IndicatorCategorySchema,
  indicatorType: t.String({ minLength: 1, maxLength: 50 }),
  configuration: IndicatorConfigSchema,
  isPublic: t.Optional(t.Boolean({ default: false })),
  tags: t.Optional(t.Array(t.String({ maxLength: 50 }), { maxItems: 10 })),
});

// Update preset request
const UpdatePresetRequestSchema = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
  description: t.Optional(t.String({ maxLength: 1000 })),
  configuration: t.Optional(IndicatorConfigSchema),
  isPublic: t.Optional(t.Boolean()),
  tags: t.Optional(t.Array(t.String({ maxLength: 50 }), { maxItems: 10 })),
});

// Clear cache request
const ClearCacheRequestSchema = t.Object({
  exchangeId: t.Optional(t.String({ maxLength: 255 })),
  symbol: t.Optional(t.String({ maxLength: 50 })),
  indicatorType: t.Optional(t.String({ maxLength: 50 })),
});

// Query filters
const PresetFiltersSchema = t.Object({
  category: t.Optional(IndicatorCategorySchema),
  indicatorType: t.Optional(t.String({ maxLength: 50 })),
});

/**
 * Create Indicators Routes Plugin
 */
export const indicatorsRoutes = new Elysia({ prefix: '/indicators' })
  /**
   * GET /indicators/list
   * List all available indicators with their configurations
   */
  .get('/list', async () => {
    const indicators = [
      {
        type: 'sma',
        name: 'Simple Moving Average',
        category: 'trend',
        description: 'Average of closing prices over a specified period',
        parameters: {
          period: { type: 'number', default: 20, min: 2, max: 500, description: 'Number of periods' },
        },
      },
      {
        type: 'ema',
        name: 'Exponential Moving Average',
        category: 'trend',
        description: 'Weighted average giving more importance to recent prices',
        parameters: {
          period: { type: 'number', default: 20, min: 2, max: 500, description: 'Number of periods' },
        },
      },
      {
        type: 'rsi',
        name: 'Relative Strength Index',
        category: 'momentum',
        description: 'Momentum oscillator measuring speed and change of price movements',
        parameters: {
          period: { type: 'number', default: 14, min: 2, max: 100, description: 'Number of periods' },
        },
      },
      {
        type: 'macd',
        name: 'MACD',
        category: 'momentum',
        description: 'Trend-following momentum indicator',
        parameters: {
          fastPeriod: { type: 'number', default: 12, min: 2, max: 100, description: 'Fast EMA period' },
          slowPeriod: { type: 'number', default: 26, min: 2, max: 100, description: 'Slow EMA period' },
          signalPeriod: { type: 'number', default: 9, min: 2, max: 100, description: 'Signal line period' },
        },
      },
      {
        type: 'bb',
        name: 'Bollinger Bands',
        category: 'volatility',
        description: 'Volatility bands placed above and below a moving average',
        parameters: {
          period: { type: 'number', default: 20, min: 2, max: 500, description: 'SMA period' },
          stdDev: { type: 'number', default: 2, min: 0.5, max: 5, description: 'Standard deviations' },
        },
      },
      {
        type: 'atr',
        name: 'Average True Range',
        category: 'volatility',
        description: 'Volatility indicator showing market volatility',
        parameters: {
          period: { type: 'number', default: 14, min: 2, max: 100, description: 'Number of periods' },
        },
      },
      {
        type: 'obv',
        name: 'On Balance Volume',
        category: 'volume',
        description: 'Momentum indicator using volume flow',
        parameters: {},
      },
      {
        type: 'stoch',
        name: 'Stochastic Oscillator',
        category: 'momentum',
        description: 'Momentum indicator comparing closing price to price range',
        parameters: {
          period: { type: 'number', default: 14, min: 2, max: 100, description: 'Number of periods' },
          kPeriod: { type: 'number', default: 3, min: 1, max: 50, description: '%K smoothing' },
          dPeriod: { type: 'number', default: 3, min: 1, max: 50, description: '%D smoothing' },
        },
      },
    ];

    return {
      success: true,
      data: indicators,
      count: indicators.length,
      timestamp: new Date().toISOString(),
    };
  })

  /**
   * Calculate single indicator
   * POST /indicators/calculate
   */
  .post(
    '/calculate',
    async ({ body, set }: any) => {
      try {
        logger.info('Calculating indicator', {
          type: body.indicatorType,
          symbol: body.symbol,
          timeframe: body.timeframe,
        });

        const result = await indicatorsService.calculate(body as CalculateIndicatorRequest);

        if (!result.success) {
          set.status = 400;
          return {
            success: false,
            error: result.error || 'Calculation failed',
          };
        }

        return {
          success: true as const,
          data: result.data,
          fromCache: result.fromCache || false,
          calculationTime: result.calculationTime || 0,
        };
      } catch (error) {
        logger.error('Indicator calculation failed', { error });
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error',
        };
      }
    },
    {
      body: CalculateRequestSchema,
      response: {
        200: t.Object({
          success: t.Literal(true),
          data: t.Any(),
          fromCache: t.Optional(t.Boolean()),
          calculationTime: t.Number(),
        }),
        400: t.Object({
          success: t.Literal(false),
          error: t.String(),
        }),
        500: t.Object({
          success: t.Literal(false),
          error: t.String(),
        }),
      },
      detail: {
        tags: ['Indicators'],
        summary: 'Calculate single indicator',
        description:
          'Calculate a technical indicator for a specific symbol and timeframe. ' +
          'Results are cached for improved performance. Supports 106 indicators from @ixjb94/indicators library.',
      },
    }
  )

  /**
   * Calculate multiple indicators in batch
   * POST /indicators/batch
   */
  .post(
    '/batch',
    async ({ body, set }: any) => {
      try {
        logger.info('Batch calculating indicators', {
          symbol: body.symbol,
          timeframe: body.timeframe,
          count: body.indicators.length,
        });

        const result = await indicatorsService.calculateBatch(body as BatchCalculateRequest);

        return {
          success: result.success,
          results: result.results,
          totalCalculationTime: result.totalCalculationTime,
        };
      } catch (error) {
        logger.error('Batch calculation failed', { error });
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error',
          results: [],
          totalCalculationTime: 0,
        };
      }
    },
    {
      body: BatchCalculateRequestSchema,
      response: {
        200: t.Object({
          success: t.Boolean(),
          results: t.Array(
            t.Object({
              indicatorType: t.String(),
              data: t.Optional(t.Any()),
              error: t.Optional(t.String()),
              fromCache: t.Optional(t.Boolean()),
            })
          ),
          totalCalculationTime: t.Number(),
        }),
        500: t.Object({
          success: t.Literal(false),
          error: t.String(),
          results: t.Array(t.Any()),
          totalCalculationTime: t.Number(),
        }),
      },
      detail: {
        tags: ['Indicators'],
        summary: 'Calculate multiple indicators',
        description:
          'Calculate multiple technical indicators in a single request for improved performance. ' +
          'Up to 20 indicators can be calculated simultaneously.',
      },
    }
  )

  /**
   * Clear cache
   * DELETE /indicators/cache
   */
  .delete(
    '/cache',
    async ({ body, set }: any) => {
      try {
        logger.info('Clearing indicator cache', body || {});

        await indicatorsService.clearCache(
          body?.exchangeId,
          body?.symbol,
          body?.indicatorType as IndicatorType | undefined
        );

        return {
          success: true,
          message: 'Cache cleared successfully',
        };
      } catch (error) {
        logger.error('Failed to clear cache', { error });
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error',
        };
      }
    },
    {
      body: t.Optional(ClearCacheRequestSchema),
      response: {
        200: t.Object({
          success: t.Literal(true),
          message: t.String(),
        }),
        500: t.Object({
          success: t.Literal(false),
          error: t.String(),
        }),
      },
      detail: {
        tags: ['Cache'],
        summary: 'Clear indicator cache',
        description:
          'Clear cached indicator results with optional filters. ' +
          'Filters can be combined to clear specific cache entries.',
      },
    }
  )

  /**
   * Health check endpoint
   * GET /indicators/health
   */
  .get(
    '/health',
    () => {
      return {
        status: 'healthy',
        module: 'indicators',
        version: '2.0.0',
        library: '@ixjb94/indicators v1.2.4',
        indicators: 106,
        timestamp: new Date().toISOString(),
      };
    },
    {
      response: t.Object({
        status: t.String(),
        module: t.String(),
        version: t.String(),
        library: t.String(),
        indicators: t.Number(),
        timestamp: t.String(),
      }),
      detail: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Check if the indicators module is operational.',
      },
    }
  )

  // ==================================================
  // PROTECTED ROUTES (Require Authentication)
  // ==================================================
  .use(sessionGuard)

  /**
   * List indicator presets
   * GET /indicators/presets
   */
  .get(
    '/presets',
    async ({ user, query, set }: any) => {
      try {
        const userId = user.id;
        const tenantId = await getUserPrimaryTenantId(user.id);

        if (!tenantId) {
          throw new BadRequestError('User has no tenant membership');
        }

        const presets = await indicatorsService.getPresets(userId, tenantId, {
          category: query.category as IndicatorCategory | undefined,
          indicatorType: query.indicatorType as IndicatorType | undefined,
        });

        return {
          success: true,
          data: presets,
          count: presets.length,
        };
      } catch (error) {
        logger.error('Failed to get presets', { error });
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error',
          data: [],
          count: 0,
        };
      }
    },
    {
      query: PresetFiltersSchema,
      response: {
        200: t.Object({
          success: t.Literal(true),
          data: t.Array(t.Any()),
          count: t.Number(),
        }),
        500: t.Object({
          success: t.Literal(false),
          error: t.String(),
          data: t.Array(t.Any()),
          count: t.Number(),
        }),
      },
      detail: {
        tags: ['Presets'],
        summary: 'List indicator presets',
        description:
          'Get all indicator presets with optional filtering by category or indicator type. ' +
          'Returns both public presets and user-specific private presets.',
      },
    }
  )

  /**
   * Create new indicator preset
   * POST /indicators/presets
   */
  .post(
    '/presets',
    async ({ user, body, set }: any) => {
      try {
        const userId = user.id;
        const tenantId = await getUserPrimaryTenantId(user.id);

        if (!tenantId) {
          throw new BadRequestError('User has no tenant membership');
        }

        logger.info('Creating indicator preset', { name: body.name });

        const preset = await indicatorsService.createPreset(
          userId,
          tenantId,
          body as CreatePresetRequest
        );

        set.status = 201;
        return {
          success: true,
          data: preset,
        };
      } catch (error) {
        logger.error('Failed to create preset', { error });
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error',
        };
      }
    },
    {
      body: CreatePresetRequestSchema,
      response: {
        201: t.Object({
          success: t.Literal(true),
          data: t.Any(),
        }),
        500: t.Object({
          success: t.Literal(false),
          error: t.String(),
        }),
      },
      detail: {
        tags: ['Presets'],
        summary: 'Create indicator preset',
        description:
          'Create a new reusable indicator configuration preset. ' +
          'Presets can be private (default) or public for sharing with other users.',
      },
    }
  )

  /**
   * Get preset by ID
   * GET /indicators/presets/:id
   */
  .get(
    '/presets/:id',
    async ({ params, set }: any) => {
      try {
        const preset = await indicatorsService.getPreset(params.id);

        if (!preset) {
          set.status = 404;
          return {
            success: false,
            error: 'Preset not found',
          };
        }

        return {
          success: true,
          data: preset,
        };
      } catch (error) {
        logger.error('Failed to get preset', { presetId: params.id, error });
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error',
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
      response: {
        200: t.Object({
          success: t.Literal(true),
          data: t.Any(),
        }),
        404: t.Object({
          success: t.Literal(false),
          error: t.String(),
        }),
        500: t.Object({
          success: t.Literal(false),
          error: t.String(),
        }),
      },
      detail: {
        tags: ['Presets'],
        summary: 'Get indicator preset',
        description: 'Retrieve a specific indicator preset by ID. Increments usage count.',
      },
    }
  )

  /**
   * Update preset
   * PATCH /indicators/presets/:id
   */
  .patch(
    '/presets/:id',
    async ({ user, params, body, set }: any) => {
      try {
        const userId = user.id;
        const tenantId = await getUserPrimaryTenantId(user.id);

        if (!tenantId) {
          throw new BadRequestError('User has no tenant membership');
        }

        logger.info('Updating indicator preset', { id: params.id });

        const preset = await indicatorsService.updatePreset(
          params.id,
          userId,
          tenantId,
          body as UpdatePresetRequest
        );

        return {
          success: true,
          data: preset,
        };
      } catch (error) {
        logger.error('Failed to update preset', { presetId: params.id, error });
        const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
        set.status = status;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error',
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
      body: UpdatePresetRequestSchema,
      response: {
        200: t.Object({
          success: t.Literal(true),
          data: t.Any(),
        }),
        404: t.Object({
          success: t.Literal(false),
          error: t.String(),
        }),
        500: t.Object({
          success: t.Literal(false),
          error: t.String(),
        }),
      },
      detail: {
        tags: ['Presets'],
        summary: 'Update indicator preset',
        description: 'Update an existing indicator preset configuration. Requires ownership.',
      },
    }
  )

  /**
   * Delete preset
   * DELETE /indicators/presets/:id
   */
  .delete(
    '/presets/:id',
    async ({ user, params, set }: any) => {
      try {
        const userId = user.id;
        const tenantId = await getUserPrimaryTenantId(user.id);

        if (!tenantId) {
          throw new BadRequestError('User has no tenant membership');
        }

        logger.info('Deleting indicator preset', { id: params.id });

        await indicatorsService.deletePreset(params.id, userId, tenantId);

        return {
          success: true,
          message: 'Preset deleted successfully',
        };
      } catch (error) {
        logger.error('Failed to delete preset', { presetId: params.id, error });
        const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
        set.status = status;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error',
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
      response: {
        200: t.Object({
          success: t.Literal(true),
          message: t.String(),
        }),
        404: t.Object({
          success: t.Literal(false),
          error: t.String(),
        }),
        500: t.Object({
          success: t.Literal(false),
          error: t.String(),
        }),
      },
      detail: {
        tags: ['Presets'],
        summary: 'Delete indicator preset',
        description: 'Delete an indicator preset. Requires ownership.',
      },
    }
  )

  /**
   * Get usage statistics
   * GET /indicators/statistics
   */
  .get(
    '/statistics',
    async ({ user, set }: any) => {
      try {
        const userId = user.id;
        const tenantId = await getUserPrimaryTenantId(user.id);

        if (!tenantId) {
          throw new BadRequestError('User has no tenant membership');
        }

        const stats = await indicatorsService.getStatistics(userId, tenantId);

        return {
          success: true,
          data: stats,
        };
      } catch (error) {
        logger.error('Failed to get statistics', { error });
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error',
        };
      }
    },
    {
      response: {
        200: t.Object({
          success: t.Literal(true),
          data: t.Object({
            totalCalculations: t.Number(),
            cacheHitRate: t.Number(),
            averageCalculationTime: t.Number(),
            mostUsedIndicators: t.Array(
              t.Object({
                type: t.String(),
                count: t.Number(),
              })
            ),
          }),
        }),
        500: t.Object({
          success: t.Literal(false),
          error: t.String(),
        }),
      },
      detail: {
        tags: ['Statistics'],
        summary: 'Get usage statistics',
        description:
          'Retrieve indicator calculation statistics and performance metrics. ' +
          'Includes cache hit rate, average calculation time, and most used indicators.',
      },
    }
  );

/**
 * Export types for route handlers
 */
export type IndicatorsRoutes = typeof indicatorsRoutes;
