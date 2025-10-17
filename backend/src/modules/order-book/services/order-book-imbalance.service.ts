/**
 * Order Book Imbalance Service
 * Calculate and analyze order book imbalance at multiple depth levels
 *
 * Features:
 * - Multi-level imbalance calculation (5, 10, 20, 50 levels)
 * - Volume imbalance (USD value)
 * - Pressure score (-100 to +100)
 * - Imbalance momentum (rate of change)
 * - Cumulative imbalance (time window)
 * - Adaptive thresholds based on volatility
 * - Trading signals from imbalance
 */

import { db } from '@/db';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { orderBookImbalance } from '../schema/order-book.schema';
import { OrderBookSnapshotService } from './order-book-snapshot.service';
import logger from '@/utils/logger';
import { BadRequestError } from '@/utils/errors';
import type {
  OrderBookSnapshot,
  OrderBookImbalance as OrderBookImbalanceType,
  OrderBookLevel,
} from '../types/order-book.types';

export class OrderBookImbalanceService {
  /**
   * Calculate order book imbalance at multiple depth levels
   * Imbalance = (Bid - Ask) / (Bid + Ask)
   * Range: -1 to +1 (-1 = all asks, +1 = all bids, 0 = balanced)
   */
  static calculateImbalance(snapshot: OrderBookSnapshot): OrderBookImbalanceType {
    // Calculate imbalance at different depths
    const imbalance5 = this.calculateImbalanceAtDepth(snapshot.bids.slice(0, 5), snapshot.asks.slice(0, 5));
    const imbalance10 = this.calculateImbalanceAtDepth(snapshot.bids.slice(0, 10), snapshot.asks.slice(0, 10));
    const imbalance20 = this.calculateImbalanceAtDepth(snapshot.bids.slice(0, 20), snapshot.asks.slice(0, 20));
    const imbalance50 = this.calculateImbalanceAtDepth(snapshot.bids.slice(0, 50), snapshot.asks.slice(0, 50));

    // Calculate volume imbalance (USD value)
    const bidVolume = this.calculateVolume(snapshot.bids.slice(0, 10));
    const askVolume = this.calculateVolume(snapshot.asks.slice(0, 10));
    const volumeImbalance = bidVolume - askVolume;

    // Calculate pressure score (-100 to +100)
    // Weighted average of imbalances at different depths
    const pressureScore = this.calculatePressureScore(
      imbalance5,
      imbalance10,
      imbalance20,
      imbalance50
    );

    return {
      exchangeId: snapshot.exchangeId,
      symbol: snapshot.symbol,
      timestamp: snapshot.timestamp,
      imbalance5,
      imbalance10,
      imbalance20,
      imbalance50,
      volumeImbalance,
      pressureScore,
    };
  }

  /**
   * Calculate imbalance momentum (rate of change)
   */
  static calculateImbalanceMomentum(
    current: OrderBookImbalanceType,
    previous: OrderBookImbalanceType
  ): number {
    // Rate of change in imbalance10 (most commonly used depth)
    const timeDiffSeconds =
      (current.timestamp.getTime() - previous.timestamp.getTime()) / 1000;

    if (timeDiffSeconds === 0) return 0;

    const imbalanceChange = current.imbalance10 - previous.imbalance10;
    const momentum = imbalanceChange / timeDiffSeconds; // Change per second

    return momentum;
  }

  /**
   * Calculate cumulative imbalance over time window
   */
  static async calculateCumulativeImbalance(
    exchangeId: string,
    symbol: string,
    windowMinutes: number = 5
  ): Promise<number> {
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - windowMinutes * 60 * 1000);

      const [result] = await db
        .select({
          cumulative: sql<number>`SUM(${orderBookImbalance.imbalance10})::float`,
        })
        .from(orderBookImbalance)
        .where(
          and(
            eq(orderBookImbalance.exchangeId, exchangeId),
            eq(orderBookImbalance.symbol, symbol),
            gte(orderBookImbalance.timestamp, startTime),
            lte(orderBookImbalance.timestamp, endTime)
          )
        );

      return result?.cumulative || 0;
    } catch (error) {
      logger.error('Failed to calculate cumulative imbalance', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Store order book imbalance
   */
  static async storeImbalance(imbalance: OrderBookImbalanceType): Promise<void> {
    try {
      await db.insert(orderBookImbalance).values({
        exchangeId: imbalance.exchangeId,
        symbol: imbalance.symbol,
        timestamp: imbalance.timestamp,
        imbalance5: imbalance.imbalance5.toString(),
        imbalance10: imbalance.imbalance10.toString(),
        imbalance20: imbalance.imbalance20.toString(),
        imbalance50: imbalance.imbalance50.toString(),
        volumeImbalance: imbalance.volumeImbalance.toString(),
        pressureScore: imbalance.pressureScore.toString(),
        imbalanceMomentum: imbalance.imbalanceMomentum?.toString(),
        cumulativeImbalance: imbalance.cumulativeImbalance?.toString(),
      });

      logger.debug('Stored order book imbalance', {
        exchangeId: imbalance.exchangeId,
        symbol: imbalance.symbol,
        imbalance10: imbalance.imbalance10.toFixed(4),
        pressureScore: imbalance.pressureScore.toFixed(2),
      });
    } catch (error) {
      logger.error('Failed to store order book imbalance', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get latest imbalance
   */
  static async getLatestImbalance(
    exchangeId: string,
    symbol: string
  ): Promise<OrderBookImbalanceType | null> {
    try {
      const [result] = await db
        .select()
        .from(orderBookImbalance)
        .where(
          and(
            eq(orderBookImbalance.exchangeId, exchangeId),
            eq(orderBookImbalance.symbol, symbol)
          )
        )
        .orderBy(desc(orderBookImbalance.timestamp))
        .limit(1);

      if (!result) return null;

      return {
        id: result.id,
        exchangeId: result.exchangeId,
        symbol: result.symbol,
        timestamp: result.timestamp,
        imbalance5: parseFloat(result.imbalance5 ?? '0'),
        imbalance10: parseFloat(result.imbalance10 ?? '0'),
        imbalance20: parseFloat(result.imbalance20 ?? '0'),
        imbalance50: parseFloat(result.imbalance50 ?? '0'),
        volumeImbalance: parseFloat(result.volumeImbalance ?? '0'),
        pressureScore: parseFloat(result.pressureScore ?? '0'),
        imbalanceMomentum: result.imbalanceMomentum
          ? parseFloat(result.imbalanceMomentum)
          : undefined,
        cumulativeImbalance: result.cumulativeImbalance
          ? parseFloat(result.cumulativeImbalance)
          : undefined,
        createdAt: result.createdAt,
      };
    } catch (error) {
      logger.error('Failed to get latest imbalance', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get historical imbalance data
   */
  static async getHistoricalImbalance(
    exchangeId: string,
    symbol: string,
    startTime: Date,
    endTime: Date,
    limit: number = 1000
  ): Promise<OrderBookImbalanceType[]> {
    try {
      const results = await db
        .select()
        .from(orderBookImbalance)
        .where(
          and(
            eq(orderBookImbalance.exchangeId, exchangeId),
            eq(orderBookImbalance.symbol, symbol),
            gte(orderBookImbalance.timestamp, startTime),
            lte(orderBookImbalance.timestamp, endTime)
          )
        )
        .orderBy(desc(orderBookImbalance.timestamp))
        .limit(limit);

      return results.map((row) => ({
        id: row.id,
        exchangeId: row.exchangeId,
        symbol: row.symbol,
        timestamp: row.timestamp,
        imbalance5: parseFloat(row.imbalance5 ?? '0'),
        imbalance10: parseFloat(row.imbalance10 ?? '0'),
        imbalance20: parseFloat(row.imbalance20 ?? '0'),
        imbalance50: parseFloat(row.imbalance50 ?? '0'),
        volumeImbalance: parseFloat(row.volumeImbalance ?? '0'),
        pressureScore: parseFloat(row.pressureScore ?? '0'),
        imbalanceMomentum: row.imbalanceMomentum ? parseFloat(row.imbalanceMomentum) : undefined,
        cumulativeImbalance: row.cumulativeImbalance
          ? parseFloat(row.cumulativeImbalance)
          : undefined,
        createdAt: row.createdAt,
      }));
    } catch (error) {
      logger.error('Failed to get historical imbalance', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Calculate adaptive thresholds based on volatility
   */
  static async calculateAdaptiveThresholds(
    exchangeId: string,
    symbol: string,
    windowMinutes: number = 60
  ): Promise<{
    buyThreshold: number;
    sellThreshold: number;
    neutralRange: { min: number; max: number };
  }> {
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - windowMinutes * 60 * 1000);

      // Get historical imbalance data
      const historicalData = await this.getHistoricalImbalance(
        exchangeId,
        symbol,
        startTime,
        endTime,
        100
      );

      if (historicalData.length === 0) {
        // Default thresholds
        return {
          buyThreshold: 0.3,
          sellThreshold: -0.3,
          neutralRange: { min: -0.1, max: 0.1 },
        };
      }

      // Calculate statistics
      const imbalances = historicalData.map((d) => d.imbalance10);
      const mean = imbalances.reduce((sum, val) => sum + val, 0) / imbalances.length;
      const variance =
        imbalances.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / imbalances.length;
      const stdDev = Math.sqrt(variance);

      // Adaptive thresholds based on volatility
      const buyThreshold = mean + stdDev * 1.5;
      const sellThreshold = mean - stdDev * 1.5;
      const neutralRange = {
        min: mean - stdDev * 0.5,
        max: mean + stdDev * 0.5,
      };

      logger.debug('Calculated adaptive imbalance thresholds', {
        exchangeId,
        symbol,
        mean: mean.toFixed(4),
        stdDev: stdDev.toFixed(4),
        buyThreshold: buyThreshold.toFixed(4),
        sellThreshold: sellThreshold.toFixed(4),
      });

      return { buyThreshold, sellThreshold, neutralRange };
    } catch (error) {
      logger.error('Failed to calculate adaptive thresholds', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Generate trading signal from imbalance
   */
  static generateSignal(
    imbalance: OrderBookImbalanceType,
    thresholds?: {
      buyThreshold: number;
      sellThreshold: number;
      neutralRange: { min: number; max: number };
    }
  ): {
    direction: 'buy' | 'sell' | 'neutral';
    strength: number; // 0-100
    reason: string;
  } {
    // Use default thresholds if not provided
    const {
      buyThreshold = 0.3,
      sellThreshold = -0.3,
      neutralRange = { min: -0.1, max: 0.1 },
    } = thresholds || {};

    const imb = imbalance.imbalance10; // Use 10-level imbalance as primary

    let direction: 'buy' | 'sell' | 'neutral';
    let strength: number;
    let reason: string;

    if (imb > buyThreshold) {
      direction = 'buy';
      // Strength based on how far above threshold (0-100 scale)
      strength = Math.min(100, ((imb - buyThreshold) / (1 - buyThreshold)) * 100);
      reason = `Strong bid pressure: ${(imb * 100).toFixed(1)}% imbalance`;
    } else if (imb < sellThreshold) {
      direction = 'sell';
      strength = Math.min(100, ((sellThreshold - imb) / (1 + sellThreshold)) * 100);
      reason = `Strong ask pressure: ${(imb * 100).toFixed(1)}% imbalance`;
    } else {
      direction = 'neutral';
      // Strength of neutrality (closer to center = stronger neutral)
      const distanceFromCenter = Math.abs(imb);
      strength = Math.max(0, 100 - distanceFromCenter * 200);
      reason = `Balanced order book: ${(imb * 100).toFixed(1)}% imbalance`;
    }

    return { direction, strength, reason };
  }

  /**
   * Calculate and store imbalance with full enrichment (convenience method)
   */
  static async calculateAndStore(
    exchangeId: string,
    symbol: string
  ): Promise<OrderBookImbalanceType> {
    // Get latest snapshot
    const snapshot = await OrderBookSnapshotService.getLatestSnapshot(exchangeId, symbol);

    if (!snapshot) {
      throw new BadRequestError('No order book snapshot found');
    }

    // Calculate imbalance
    const imbalance = this.calculateImbalance(snapshot);

    // Get previous imbalance for momentum
    const previousImbalance = await this.getLatestImbalance(exchangeId, symbol);

    if (previousImbalance) {
      imbalance.imbalanceMomentum = this.calculateImbalanceMomentum(imbalance, previousImbalance);
    }

    // Calculate cumulative imbalance
    imbalance.cumulativeImbalance = await this.calculateCumulativeImbalance(exchangeId, symbol, 5);

    // Store
    await this.storeImbalance(imbalance);

    logger.info('Calculated and stored order book imbalance', {
      exchangeId,
      symbol,
      imbalance10: imbalance.imbalance10.toFixed(4),
      pressureScore: imbalance.pressureScore.toFixed(2),
      momentum: imbalance.imbalanceMomentum?.toFixed(6),
    });

    return imbalance;
  }

  /**
   * Calculate imbalance at specific depth
   */
  private static calculateImbalanceAtDepth(
    bids: OrderBookLevel[],
    asks: OrderBookLevel[]
  ): number {
    const bidVolume = this.calculateVolume(bids);
    const askVolume = this.calculateVolume(asks);
    const total = bidVolume + askVolume;

    if (total === 0) return 0;

    return (bidVolume - askVolume) / total;
  }

  /**
   * Calculate total volume (USD value) at given levels
   */
  private static calculateVolume(levels: OrderBookLevel[]): number {
    return levels.reduce((sum, level) => sum + level.price * level.amount, 0);
  }

  /**
   * Calculate pressure score from multi-level imbalances
   * Weighted average: closer levels = higher weight
   */
  private static calculatePressureScore(
    imbalance5: number,
    imbalance10: number,
    imbalance20: number,
    imbalance50: number
  ): number {
    // Weights: closer levels have more weight
    const weights = {
      level5: 0.4, // 40% weight
      level10: 0.3, // 30% weight
      level20: 0.2, // 20% weight
      level50: 0.1, // 10% weight
    };

    const weightedSum =
      imbalance5 * weights.level5 +
      imbalance10 * weights.level10 +
      imbalance20 * weights.level20 +
      imbalance50 * weights.level50;

    // Convert to -100 to +100 scale
    return weightedSum * 100;
  }

  /**
   * Get imbalance statistics
   */
  static async getImbalanceStatistics(
    exchangeId: string,
    symbol: string,
    startTime: Date,
    endTime: Date
  ): Promise<{
    count: number;
    avgImbalance: number;
    maxImbalance: number;
    minImbalance: number;
    avgPressure: number;
    buySignalCount: number;
    sellSignalCount: number;
    neutralCount: number;
  }> {
    try {
      const [result] = await db
        .select({
          count: sql<number>`COUNT(*)::int`,
          avgImbalance: sql<number>`AVG(${orderBookImbalance.imbalance10})::float`,
          maxImbalance: sql<number>`MAX(${orderBookImbalance.imbalance10})::float`,
          minImbalance: sql<number>`MIN(${orderBookImbalance.imbalance10})::float`,
          avgPressure: sql<number>`AVG(${orderBookImbalance.pressureScore})::float`,
          buySignalCount: sql<number>`COUNT(CASE WHEN ${orderBookImbalance.imbalance10}::float > 0.3 THEN 1 END)::int`,
          sellSignalCount: sql<number>`COUNT(CASE WHEN ${orderBookImbalance.imbalance10}::float < -0.3 THEN 1 END)::int`,
          neutralCount: sql<number>`COUNT(CASE WHEN ${orderBookImbalance.imbalance10}::float BETWEEN -0.1 AND 0.1 THEN 1 END)::int`,
        })
        .from(orderBookImbalance)
        .where(
          and(
            eq(orderBookImbalance.exchangeId, exchangeId),
            eq(orderBookImbalance.symbol, symbol),
            gte(orderBookImbalance.timestamp, startTime),
            lte(orderBookImbalance.timestamp, endTime)
          )
        );

      return {
        count: result?.count || 0,
        avgImbalance: result?.avgImbalance || 0,
        maxImbalance: result?.maxImbalance || 0,
        minImbalance: result?.minImbalance || 0,
        avgPressure: result?.avgPressure || 0,
        buySignalCount: result?.buySignalCount || 0,
        sellSignalCount: result?.sellSignalCount || 0,
        neutralCount: result?.neutralCount || 0,
      };
    } catch (error) {
      logger.error('Failed to get imbalance statistics', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
