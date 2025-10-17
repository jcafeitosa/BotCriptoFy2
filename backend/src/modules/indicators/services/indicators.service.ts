/**
 * Indicators Service V2
 * Main service for calculating, caching, and managing technical indicators
 * Refactored to use calculator-v2 (async) and IndicatorFactory
 *
 * @module indicators/services
 */

import { and, eq, gte, lte, or } from 'drizzle-orm';
import { OHLCVService } from '../../market-data/services/ohlcv.service';
import type {
  CalculateIndicatorRequest,
  BatchCalculateRequest,
  IndicatorCalculationResponse,
  BatchCalculationResponse,
  IIndicatorService,
  IndicatorPreset,
  CreatePresetRequest,
  UpdatePresetRequest,
  IndicatorStatistics,
  IndicatorResult,
  BaseIndicatorConfig,
  IndicatorType,
  IndicatorCategory,
  OHLCVData,
  Timeframe,
} from '../types/indicators.types';
import {
  indicatorPresets,
  indicatorCache,
  indicatorCalculationLogs,
} from '../schema/indicators.schema';
import { db } from '../../../db';
import { IndicatorFactory } from './indicator-factory.service';

/**
 * Simple console logger fallback
 */
const logger = {
  debug: (msg: string, meta?: any) => console.log(`[DEBUG] ${msg}`, meta || ''),
  info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta || ''),
  error: (msg: string, meta?: any) => console.error(`[ERROR] ${msg}`, meta || ''),
  warn: (msg: string, meta?: any) => console.warn(`[WARN] ${msg}`, meta || ''),
};

/**
 * Cache TTL configuration by timeframe (in seconds)
 */
const CACHE_TTL_MAP: Record<Timeframe, number> = {
  '1m': 60, // 1 minute
  '3m': 180, // 3 minutes
  '5m': 300, // 5 minutes
  '15m': 900, // 15 minutes
  '30m': 1800, // 30 minutes
  '1h': 3600, // 1 hour
  '2h': 7200, // 2 hours
  '4h': 14400, // 4 hours
  '6h': 21600, // 6 hours
  '12h': 43200, // 12 hours
  '1d': 86400, // 1 day
  '1w': 604800, // 1 week
  '1M': 2592000, // ~30 days
};

/**
 * Indicator category mapping
 * Extended to include all indicators from indicators-full.types
 */
const INDICATOR_CATEGORY_MAP: Record<string, IndicatorCategory> = {
  // Momentum
  RSI: 'momentum',
  MACD: 'momentum',
  Stochastic: 'momentum',
  StochasticRSI: 'momentum',
  StochRSI: 'momentum',
  CCI: 'momentum',
  ROC: 'momentum',
  MFI: 'momentum',
  Williams_R: 'momentum',
  AO: 'momentum',
  TSI: 'momentum',
  KST: 'momentum',
  ForceIndex: 'momentum',
  FI: 'momentum',
  // Trend
  SMA: 'trend',
  EMA: 'trend',
  WMA: 'trend',
  WEMA: 'trend',
  DEMA: 'trend',
  TEMA: 'trend',
  HMA: 'trend',
  ADX: 'trend',
  Aroon: 'trend',
  Parabolic_SAR: 'trend',
  Ichimoku: 'trend',
  SuperTrend: 'trend',
  // Volatility
  BollingerBands: 'volatility',
  ATR: 'volatility',
  Keltner: 'volatility',
  StandardDev: 'volatility',
  DonchianChannel: 'volatility',
  DC: 'volatility',
  // Volume
  OBV: 'volume',
  VWAP: 'volume',
  AD: 'volume',
  ADL: 'volume',
  VWMA: 'volume',
  CMF: 'volume',
  VolumeOscillator: 'volume',
  VOSC: 'volume',
  // Support/Resistance
  PivotPoints: 'support_resistance',
  FibonacciRetracement: 'support_resistance',
};

/**
 * Main Indicators Service Implementation
 */
export class IndicatorsService implements IIndicatorService {
  /**
   * Calculate a single indicator with caching support
   */
  async calculate<T = any>(request: CalculateIndicatorRequest): Promise<IndicatorCalculationResponse<T>> {
    const startTime = Date.now();

    try {
      // Check cache first if enabled
      if (request.useCache !== false) {
        const cached = await this.getCachedResult<T>(
          request.exchangeId,
          request.symbol,
          request.timeframe,
          request.indicatorType,
          request.configuration
        );

        if (cached) {
          logger.debug('Cache hit for indicator calculation', {
            indicator: request.indicatorType,
            symbol: request.symbol,
          });

          return {
            success: true,
            data: cached,
            fromCache: true,
            calculationTime: Date.now() - startTime,
          };
        }
      }

      // Fetch OHLCV data (this should come from market-data module)
      const ohlcvData = await this.fetchOHLCVData(
        request.exchangeId,
        request.symbol,
        request.timeframe,
        request.limit || 100
      );

      if (!ohlcvData || ohlcvData.length === 0) {
        throw new Error('No market data available for calculation');
      }

      // Calculate indicator using async IndicatorFactory
      const result = await this.calculateIndicator<T>(
        ohlcvData,
        request.indicatorType,
        request.configuration
      );

      // Cache result
      if (request.useCache !== false) {
        await this.cacheResult(
          request.exchangeId,
          request.symbol,
          request.timeframe,
          request.indicatorType,
          request.configuration,
          result
        );
      }

      // Log calculation
      await this.logCalculation(
        request.exchangeId,
        request.symbol,
        request.timeframe,
        request.indicatorType,
        request.configuration,
        Date.now() - startTime,
        true
      );

      return {
        success: true,
        data: result,
        fromCache: false,
        calculationTime: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Indicator calculation failed', {
        indicator: request.indicatorType,
        error: errorMessage,
      });

      // Log failed calculation
      await this.logCalculation(
        request.exchangeId,
        request.symbol,
        request.timeframe,
        request.indicatorType,
        request.configuration,
        Date.now() - startTime,
        false,
        errorMessage
      );

      return {
        success: false,
        error: errorMessage,
        calculationTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Calculate multiple indicators in batch
   */
  async calculateBatch(request: BatchCalculateRequest): Promise<BatchCalculationResponse> {
    const startTime = Date.now();

    try {
      const results = await Promise.allSettled(
        request.indicators.map((config) =>
          this.calculate({
            exchangeId: request.exchangeId,
            symbol: request.symbol,
            timeframe: request.timeframe,
            indicatorType: config.type,
            configuration: config,
            limit: request.limit,
            useCache: request.useCache,
          })
        )
      );

      const processedResults = results.map((result, index) => {
        const indicatorType = request.indicators[index].type;

        if (result.status === 'fulfilled' && result.value.success) {
          return {
            indicatorType,
            data: result.value.data,
            fromCache: result.value.fromCache,
          };
        } else {
          const error =
            result.status === 'rejected'
              ? result.reason?.message || 'Unknown error'
              : result.value.error || 'Calculation failed';

          return {
            indicatorType,
            error,
          };
        }
      });

      return {
        success: true,
        results: processedResults,
        totalCalculationTime: Date.now() - startTime,
      };
    } catch (error) {
      logger.error('Batch calculation failed', { error });

      return {
        success: false,
        results: [],
        totalCalculationTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Create a new indicator preset
   */
  async createPreset(
    userId: string,
    tenantId: string,
    request: CreatePresetRequest
  ): Promise<IndicatorPreset> {
    try {
      const [preset] = await db
        .insert(indicatorPresets)
        .values({
          userId,
          tenantId,
          name: request.name,
          description: request.description,
          category: request.category,
          indicatorType: request.indicatorType,
          configuration: request.configuration as any,
          isPublic: request.isPublic || false,
          usageCount: 0,
          tags: request.tags || [],
        })
        .returning();

      logger.info('Indicator preset created', { presetId: preset.id, name: preset.name });

      return preset as IndicatorPreset;
    } catch (error) {
      logger.error('Failed to create preset', { error });
      throw new Error('Failed to create indicator preset');
    }
  }

  /**
   * Get a preset by ID
   */
  async getPreset(presetId: string): Promise<IndicatorPreset | null> {
    try {
      const [preset] = await db
        .select()
        .from(indicatorPresets)
        .where(eq(indicatorPresets.id, presetId))
        .limit(1);

      if (!preset) return null;

      // Increment usage count
      await db
        .update(indicatorPresets)
        .set({ usageCount: preset.usageCount + 1 })
        .where(eq(indicatorPresets.id, presetId));

      return preset as IndicatorPreset;
    } catch (error) {
      logger.error('Failed to get preset', { presetId, error });
      return null;
    }
  }

  /**
   * Get presets with optional filters
   */
  async getPresets(
    userId: string,
    tenantId: string,
    filters?: { category?: IndicatorCategory; indicatorType?: IndicatorType }
  ): Promise<IndicatorPreset[]> {
    try {
      const conditions = [
        or(eq(indicatorPresets.userId, userId), eq(indicatorPresets.isPublic, true)),
        eq(indicatorPresets.tenantId, tenantId),
      ];

      if (filters?.category) {
        conditions.push(eq(indicatorPresets.category, filters.category));
      }

      if (filters?.indicatorType) {
        conditions.push(eq(indicatorPresets.indicatorType, filters.indicatorType));
      }

      const presets = await db
        .select()
        .from(indicatorPresets)
        .where(and(...conditions))
        .orderBy(indicatorPresets.usageCount);

      return presets as IndicatorPreset[];
    } catch (error) {
      logger.error('Failed to get presets', { error });
      return [];
    }
  }

  /**
   * Update a preset
   */
  async updatePreset(
    presetId: string,
    userId: string,
    tenantId: string,
    updates: UpdatePresetRequest
  ): Promise<IndicatorPreset> {
    try {
      // Verify ownership
      const [existing] = await db
        .select()
        .from(indicatorPresets)
        .where(
          and(
            eq(indicatorPresets.id, presetId),
            eq(indicatorPresets.userId, userId),
            eq(indicatorPresets.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!existing) {
        throw new Error('Preset not found or access denied');
      }

      const [updated] = await db
        .update(indicatorPresets)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(indicatorPresets.id, presetId))
        .returning();

      logger.info('Preset updated', { presetId });

      return updated as IndicatorPreset;
    } catch (error) {
      logger.error('Failed to update preset', { presetId, error });
      throw new Error('Failed to update preset');
    }
  }

  /**
   * Delete a preset
   */
  async deletePreset(presetId: string, userId: string, tenantId: string): Promise<void> {
    try {
      await db
        .delete(indicatorPresets)
        .where(
          and(
            eq(indicatorPresets.id, presetId),
            eq(indicatorPresets.userId, userId),
            eq(indicatorPresets.tenantId, tenantId)
          )
        );

      logger.info('Preset deleted', { presetId });
    } catch (error) {
      logger.error('Failed to delete preset', { presetId, error });
      throw new Error('Failed to delete preset');
    }
  }

  /**
   * Clear cache with optional filters
   */
  async clearCache(exchangeId?: string, symbol?: string, indicatorType?: IndicatorType): Promise<void> {
    try {
      const conditions = [];

      if (exchangeId) {
        conditions.push(eq(indicatorCache.exchangeId, exchangeId));
      }

      if (symbol) {
        conditions.push(eq(indicatorCache.symbol, symbol));
      }

      if (indicatorType) {
        conditions.push(eq(indicatorCache.indicatorType, indicatorType));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      await db.delete(indicatorCache).where(whereClause);

      logger.info('Cache cleared', { exchangeId, symbol, indicatorType });
    } catch (error) {
      logger.error('Failed to clear cache', { error });
      throw new Error('Failed to clear cache');
    }
  }

  /**
   * Get usage statistics
   */
  async getStatistics(userId: string, tenantId: string): Promise<IndicatorStatistics> {
    try {
      // Get total calculations from logs
      const logs = await db
        .select()
        .from(indicatorCalculationLogs)
        .where(
          and(
            eq(indicatorCalculationLogs.userId, userId),
            eq(indicatorCalculationLogs.tenantId, tenantId)
          )
        );

      const totalCalculations = logs.length;
      const successfulCalculations = logs.filter((log) => log.success).length;
      const cacheHits = logs.filter((log) => log.fromCache).length;
      const cacheHitRate = totalCalculations > 0 ? (cacheHits / totalCalculations) * 100 : 0;

      const totalTime = logs.reduce((sum, log) => sum + (log.calculationTimeMs || 0), 0);
      const averageCalculationTime = totalCalculations > 0 ? totalTime / totalCalculations : 0;

      // Get most used indicators
      const indicatorCounts = logs.reduce(
        (acc, log) => {
          acc[log.indicatorType] = (acc[log.indicatorType] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const mostUsedIndicators = Object.entries(indicatorCounts)
        .map(([type, count]) => ({ type: type as IndicatorType, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalCalculations,
        cacheHitRate,
        averageCalculationTime,
        mostUsedIndicators,
      };
    } catch (error) {
      logger.error('Failed to get statistics', { error });
      throw new Error('Failed to retrieve statistics');
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Calculate indicator based on type using IndicatorFactory (async)
   */
  private async calculateIndicator<T>(
    data: OHLCVData[],
    type: IndicatorType,
    config: BaseIndicatorConfig
  ): Promise<IndicatorResult<T>> {
    try {
      // Try using IndicatorFactory for supported indicators
      const result = await IndicatorFactory.calculate(data, config);
      return result as IndicatorResult<T>;
    } catch (error) {
      // If IndicatorFactory doesn't support it, throw error
      const message = error instanceof Error ? error.message : `Indicator type ${type} not supported`;
      throw new Error(message);
    }
  }

  /**
   * Get cached result if available and not expired
   */
  private async getCachedResult<T>(
    exchangeId: string,
    symbol: string,
    timeframe: Timeframe,
    indicatorType: IndicatorType,
    configuration: BaseIndicatorConfig
  ): Promise<IndicatorResult<T> | null> {
    try {
      const [cached] = await db
        .select()
        .from(indicatorCache)
        .where(
          and(
            eq(indicatorCache.exchangeId, exchangeId),
            eq(indicatorCache.symbol, symbol),
            eq(indicatorCache.timeframe, timeframe),
            eq(indicatorCache.indicatorType, indicatorType),
            gte(indicatorCache.expiresAt, new Date())
          )
        )
        .limit(1);

      if (!cached) return null;

      // Increment hit counter
      await db
        .update(indicatorCache)
        .set({ hits: cached.hits + 1 })
        .where(eq(indicatorCache.id, cached.id));

      return cached.result as IndicatorResult<T>;
    } catch (error) {
      logger.error('Cache lookup failed', { error });
      return null;
    }
  }

  /**
   * Cache calculation result
   */
  private async cacheResult(
    exchangeId: string,
    symbol: string,
    timeframe: Timeframe,
    indicatorType: IndicatorType,
    configuration: BaseIndicatorConfig,
    result: IndicatorResult<any>
  ): Promise<void> {
    try {
      const ttl = CACHE_TTL_MAP[timeframe];
      const expiresAt = new Date(Date.now() + ttl * 1000);

      await db.insert(indicatorCache).values({
        exchangeId,
        symbol,
        timeframe,
        indicatorType,
        configuration: configuration as any,
        result: result as any,
        expiresAt,
        calculationTimeMs: result.metadata?.calculationTime || 0,
      });
    } catch (error) {
      logger.error('Failed to cache result', { error });
      // Don't throw - caching failure shouldn't break calculation
    }
  }

  /**
   * Log calculation for analytics
   */
  private async logCalculation(
    exchangeId: string,
    symbol: string,
    timeframe: Timeframe,
    indicatorType: IndicatorType,
    configuration: BaseIndicatorConfig,
    calculationTime: number,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    try {
      await db.insert(indicatorCalculationLogs).values({
        userId: 'system', // TODO: Get from context
        tenantId: 'system', // TODO: Get from context
        exchangeId,
        symbol,
        timeframe,
        indicatorType,
        configuration: configuration as any,
        calculationTimeMs: calculationTime,
        success,
        errorMessage: errorMessage || null,
        fromCache: false,
      });
    } catch (error) {
      logger.error('Failed to log calculation', { error });
      // Don't throw - logging failure shouldn't break calculation
    }
  }

  /**
   * Fetch OHLCV data from market-data module
   */
  private async fetchOHLCVData(
    exchangeId: string,
    symbol: string,
    timeframe: Timeframe,
    limit: number
  ): Promise<OHLCVData[]> {
    try {
      logger.debug('Fetching OHLCV data for indicator calculation', {
        exchangeId,
        symbol,
        timeframe,
        limit,
      });

      // Fetch OHLCV data from market-data service
      const ohlcvData = await OHLCVService.fetchOHLCV({
        exchangeId,
        symbol,
        timeframe,
        limit,
      });

      // Convert to OHLCVData format
      const converted: OHLCVData[] = ohlcvData.map(candle => ({
        timestamp: candle.timestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      }));

      logger.debug('OHLCV data fetched successfully', {
        exchangeId,
        symbol,
        candlesCount: converted.length,
      });

      return converted;
    } catch (error) {
      logger.error('Failed to fetch OHLCV data for indicator calculation', {
        exchangeId,
        symbol,
        timeframe,
        limit,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(
        `Failed to fetch OHLCV data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

/**
 * Export singleton instance
 */
export const indicatorsService = new IndicatorsService();
