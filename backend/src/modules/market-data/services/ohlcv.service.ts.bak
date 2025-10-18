/**
 * OHLCV Service
 * Handles OHLCV (candlestick) data collection, storage, and retrieval
 */

import { db } from '@/db';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { ExchangeService } from '../../exchanges/services/exchange.service';
import { marketOHLCV, marketDataSyncStatus } from '../schema/market-data.schema';
import logger from '@/utils/logger';
import { BadRequestError } from '@/utils/errors';
import type {
  OHLCVCandle,
  FetchOHLCVOptions,
  MarketDataQuery,
  BatchInsertResult,
  HistoricalSyncOptions,
  SyncStatusRecord,
  Timeframe,
  DataGap,
} from '../types/market-data.types';

export class OHLCVService {
  /**
   * Timeframe to milliseconds mapping
   */
  private static timeframeToMs: Record<Timeframe, number> = {
    '1m': 60 * 1000,
    '3m': 3 * 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '2h': 2 * 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '12h': 12 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
    '1M': 30 * 24 * 60 * 60 * 1000,
  };

  /**
   * Fetch OHLCV data from exchange
   */
  static async fetchOHLCV(options: FetchOHLCVOptions): Promise<OHLCVCandle[]> {
    const { exchangeId, symbol, timeframe, since, limit = 1000 } = options;

    try {
      logger.info('Fetching OHLCV from exchange', { exchangeId, symbol, timeframe, since, limit });

      // Create exchange instance (no auth needed for public data)
      const exchange = ExchangeService.createCCXTInstance(exchangeId, {
        apiKey: '',
        apiSecret: '',
      });

      // Fetch OHLCV
      const ohlcvData = await exchange.fetchOHLCV(
        symbol,
        timeframe,
        since ? since.getTime() : undefined,
        limit
      );

      // Convert to our format
      const candles: OHLCVCandle[] = ohlcvData.map((candle) => ({
        exchangeId,
        symbol,
        timeframe,
        timestamp: new Date(Number(candle[0])),
        open: Number(candle[1]),
        high: Number(candle[2]),
        low: Number(candle[3]),
        close: Number(candle[4]),
        volume: Number(candle[5]),
      }));

      logger.info('Fetched OHLCV data', {
        exchangeId,
        symbol,
        timeframe,
        count: candles.length,
      });

      return candles;
    } catch (error) {
      logger.error('Failed to fetch OHLCV', {
        exchangeId,
        symbol,
        timeframe,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new BadRequestError('Failed to fetch OHLCV data from exchange');
    }
  }

  /**
   * Store OHLCV data in database
   */
  static async storeOHLCV(candles: OHLCVCandle[]): Promise<BatchInsertResult> {
    if (candles.length === 0) {
      return { inserted: 0, updated: 0, failed: 0 };
    }

    const result: BatchInsertResult = {
      inserted: 0,
      updated: 0,
      failed: 0,
      errors: [],
    };

    try {
      logger.info('Storing OHLCV data', { count: candles.length });

      // Use PostgreSQL UPSERT (ON CONFLICT DO UPDATE)
      for (const candle of candles) {
        try {
          await db
            .insert(marketOHLCV)
            .values({
              exchangeId: candle.exchangeId,
              symbol: candle.symbol,
              timeframe: candle.timeframe,
              timestamp: candle.timestamp,
              open: candle.open.toString(),
              high: candle.high.toString(),
              low: candle.low.toString(),
              close: candle.close.toString(),
              volume: candle.volume.toString(),
              quoteVolume: candle.quoteVolume?.toString(),
              trades: candle.trades,
            })
            .onConflictDoUpdate({
              target: [
                marketOHLCV.timestamp,
                marketOHLCV.exchangeId,
                marketOHLCV.symbol,
                marketOHLCV.timeframe,
              ],
              set: {
                open: candle.open.toString(),
                high: candle.high.toString(),
                low: candle.low.toString(),
                close: candle.close.toString(),
                volume: candle.volume.toString(),
                quoteVolume: candle.quoteVolume?.toString(),
                trades: candle.trades,
              },
            });

          result.inserted++;
        } catch (error) {
          result.failed++;
          result.errors?.push({
            record: candle,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      logger.info('Stored OHLCV data', result);

      return result;
    } catch (error) {
      logger.error('Failed to store OHLCV', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get OHLCV data from database
   */
  static async getOHLCV(query: MarketDataQuery): Promise<OHLCVCandle[]> {
    const { exchangeId, symbol, timeframe, startDate, endDate, limit = 1000, offset = 0 } = query;

    try {
      const conditions = [
        eq(marketOHLCV.exchangeId, exchangeId),
        eq(marketOHLCV.symbol, symbol),
      ];

      if (timeframe) {
        conditions.push(eq(marketOHLCV.timeframe, timeframe));
      }

      if (startDate) {
        conditions.push(gte(marketOHLCV.timestamp, startDate));
      }

      if (endDate) {
        conditions.push(lte(marketOHLCV.timestamp, endDate));
      }

      const results = await db
        .select()
        .from(marketOHLCV)
        .where(and(...conditions))
        .orderBy(desc(marketOHLCV.timestamp))
        .limit(limit)
        .offset(offset);

      const candles: OHLCVCandle[] = results.map((row) => ({
        id: row.id,
        exchangeId: row.exchangeId,
        symbol: row.symbol,
        timeframe: row.timeframe as Timeframe,
        timestamp: row.timestamp,
        open: parseFloat(row.open),
        high: parseFloat(row.high),
        low: parseFloat(row.low),
        close: parseFloat(row.close),
        volume: parseFloat(row.volume),
        quoteVolume: row.quoteVolume ? parseFloat(row.quoteVolume) : undefined,
        trades: row.trades || undefined,
        createdAt: row.createdAt,
      }));

      return candles;
    } catch (error) {
      logger.error('Failed to get OHLCV', {
        exchangeId,
        symbol,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Sync historical OHLCV data
   */
  static async syncHistoricalData(options: HistoricalSyncOptions): Promise<SyncStatusRecord> {
    const {
      exchangeId,
      symbol,
      timeframe,
      startDate,
      endDate = new Date(),
      batchSize = 1000,
    } = options;

    try {
      logger.info('Starting historical OHLCV sync', {
        exchangeId,
        symbol,
        timeframe,
        startDate,
        endDate,
      });

      // Create or get sync status record
      let syncStatus = await this.getSyncStatus(exchangeId, symbol, timeframe);
      if (!syncStatus) {
        syncStatus = await this.createSyncStatus(exchangeId, symbol, timeframe);
      }

      // Update status to syncing
      await this.updateSyncStatus(syncStatus.id!, { syncStatus: 'syncing' });

      const timeframeMs = this.timeframeToMs[timeframe];
      let currentDate = startDate;
      let totalCandles = 0;

      while (currentDate < endDate) {
        try {
          // Fetch batch
          const candles = await this.fetchOHLCV({
            exchangeId,
            symbol,
            timeframe,
            since: currentDate,
            limit: batchSize,
          });

          if (candles.length === 0) break;

          // Store batch
          const result = await this.storeOHLCV(candles);
          totalCandles += result.inserted;

          // Update last synced timestamp
          const lastCandle = candles[candles.length - 1];
          await this.updateSyncStatus(syncStatus.id!, {
            lastSyncedTimestamp: lastCandle.timestamp,
            lastSyncAt: new Date(),
            totalCandles,
          });

          // Move to next batch
          currentDate = new Date(lastCandle.timestamp.getTime() + timeframeMs);

          logger.info('Synced OHLCV batch', {
            exchangeId,
            symbol,
            timeframe,
            count: candles.length,
            total: totalCandles,
            lastTimestamp: lastCandle.timestamp,
          });

          // Rate limiting delay
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          logger.error('Error syncing OHLCV batch', {
            exchangeId,
            symbol,
            timeframe,
            currentDate,
            error: error instanceof Error ? error.message : String(error),
          });

          await this.updateSyncStatus(syncStatus.id!, {
            syncStatus: 'error',
            errorMessage: error instanceof Error ? error.message : String(error),
          });

          throw error;
        }
      }

      // Update final status
      await this.updateSyncStatus(syncStatus.id!, {
        syncStatus: 'completed',
        totalCandles,
        errorMessage: undefined,
      });

      logger.info('Completed historical OHLCV sync', {
        exchangeId,
        symbol,
        timeframe,
        totalCandles,
      });

      return (await this.getSyncStatus(exchangeId, symbol, timeframe))!;
    } catch (error) {
      logger.error('Failed to sync historical OHLCV', {
        exchangeId,
        symbol,
        timeframe,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Detect gaps in OHLCV data
   */
  static async detectGaps(
    exchangeId: string,
    symbol: string,
    timeframe: Timeframe
  ): Promise<DataGap[]> {
    try {
      logger.info('Detecting OHLCV gaps', { exchangeId, symbol, timeframe });

      const timeframeMs = this.timeframeToMs[timeframe];
      const gaps: DataGap[] = [];

      // Get all candles ordered by timestamp
      const candles = await this.getOHLCV({
        exchangeId,
        symbol,
        timeframe,
        limit: 100000, // Large limit to get all data
      });

      if (candles.length < 2) return gaps;

      // Check for gaps between consecutive candles
      for (let i = 1; i < candles.length; i++) {
        const prevCandle = candles[i - 1];
        const currentCandle = candles[i];

        const expectedTimestamp = new Date(prevCandle.timestamp.getTime() + timeframeMs);
        const actualTimestamp = currentCandle.timestamp;

        if (actualTimestamp.getTime() > expectedTimestamp.getTime()) {
          const missingCandles = Math.floor(
            (actualTimestamp.getTime() - expectedTimestamp.getTime()) / timeframeMs
          );

          gaps.push({
            exchangeId,
            symbol,
            timeframe,
            gapStart: expectedTimestamp,
            gapEnd: new Date(actualTimestamp.getTime() - timeframeMs),
            missingCandles,
            detected: new Date(),
          });
        }
      }

      logger.info('Detected OHLCV gaps', { exchangeId, symbol, timeframe, count: gaps.length });

      return gaps;
    } catch (error) {
      logger.error('Failed to detect OHLCV gaps', {
        exchangeId,
        symbol,
        timeframe,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Fill data gaps
   */
  static async fillGaps(gap: DataGap): Promise<number> {
    try {
      logger.info('Filling OHLCV gap', gap);

      const candles = await this.fetchOHLCV({
        exchangeId: gap.exchangeId,
        symbol: gap.symbol,
        timeframe: gap.timeframe,
        since: gap.gapStart,
        limit: gap.missingCandles + 10, // Add buffer
      });

      // Filter candles within gap range
      const gapCandles = candles.filter(
        (candle) => candle.timestamp >= gap.gapStart && candle.timestamp <= gap.gapEnd
      );

      if (gapCandles.length === 0) {
        logger.warn('No candles found to fill gap', gap);
        return 0;
      }

      const result = await this.storeOHLCV(gapCandles);

      logger.info('Filled OHLCV gap', { gap, filled: result.inserted });

      return result.inserted;
    } catch (error) {
      logger.error('Failed to fill OHLCV gap', {
        gap,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get sync status
   */
  private static async getSyncStatus(
    exchangeId: string,
    symbol: string,
    timeframe: Timeframe
  ): Promise<SyncStatusRecord | null> {
    const [result] = await db
      .select()
      .from(marketDataSyncStatus)
      .where(
        and(
          eq(marketDataSyncStatus.exchangeId, exchangeId),
          eq(marketDataSyncStatus.symbol, symbol),
          eq(marketDataSyncStatus.timeframe, timeframe)
        )
      )
      .limit(1);

    if (!result) return null;

    return {
      id: result.id,
      exchangeId: result.exchangeId,
      symbol: result.symbol,
      timeframe: result.timeframe as Timeframe,
      lastSyncedTimestamp: result.lastSyncedTimestamp || undefined,
      lastSyncAt: result.lastSyncAt || undefined,
      totalCandles: result.totalCandles || 0,
      syncStatus: result.syncStatus as any,
      errorMessage: result.errorMessage || undefined,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  /**
   * Create sync status record
   */
  private static async createSyncStatus(
    exchangeId: string,
    symbol: string,
    timeframe: Timeframe
  ): Promise<SyncStatusRecord> {
    const [result] = await db
      .insert(marketDataSyncStatus)
      .values({
        exchangeId,
        symbol,
        timeframe,
        syncStatus: 'pending',
        totalCandles: 0,
      })
      .returning();

    return {
      id: result.id,
      exchangeId: result.exchangeId,
      symbol: result.symbol,
      timeframe: result.timeframe as Timeframe,
      totalCandles: result.totalCandles || 0,
      syncStatus: result.syncStatus as any,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  /**
   * Update sync status
   */
  private static async updateSyncStatus(
    id: string,
    updates: Partial<SyncStatusRecord>
  ): Promise<void> {
    await db
      .update(marketDataSyncStatus)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(marketDataSyncStatus.id, id));
  }
}
