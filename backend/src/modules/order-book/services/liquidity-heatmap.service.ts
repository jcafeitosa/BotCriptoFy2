/**
 * Liquidity Heatmap Service
 * Bookmap-style liquidity heatmap visualization
 *
 * Features:
 * - 2D heatmap generation (price x time)
 * - Intensity calculation for color mapping
 * - Historical liquidity tracking
 * - Liquidity concentration detection
 * - Support/resistance zone identification
 * - Heatmap data aggregation
 */

import { db } from '@/db';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { liquidityHeatmapData, liquidityZones } from '../schema/order-book.schema';
import { OrderBookSnapshotService } from './order-book-snapshot.service';
import logger from '@/utils/logger';
import { BadRequestError } from '@/utils/errors';
import type {
  OrderBookSnapshot,
  LiquidityHeatmapPoint,
  LiquidityHeatmap,
  LiquidityZone,
} from '../types/order-book.types';

export class LiquidityHeatmapService {
  /**
   * Generate heatmap data points from order book snapshot
   */
  static generateHeatmapPoints(snapshot: OrderBookSnapshot): LiquidityHeatmapPoint[] {
    const points: LiquidityHeatmapPoint[] = [];

    // Calculate max volume for intensity normalization
    const allVolumes = [
      ...snapshot.bids.map((l) => l.price * l.amount),
      ...snapshot.asks.map((l) => l.price * l.amount),
    ];
    const maxVolume = Math.max(...allVolumes, 0);

    // Process bids
    snapshot.bids.forEach((level) => {
      const volume = level.price * level.amount; // USD value
      const intensity = maxVolume > 0 ? (volume / maxVolume) * 100 : 0;

      points.push({
        exchangeId: snapshot.exchangeId,
        symbol: snapshot.symbol,
        timestamp: snapshot.timestamp,
        priceLevel: level.price,
        bidVolume: volume,
        askVolume: 0,
        totalVolume: volume,
        intensity,
      });
    });

    // Process asks
    snapshot.asks.forEach((level) => {
      const volume = level.price * level.amount; // USD value
      const intensity = maxVolume > 0 ? (volume / maxVolume) * 100 : 0;

      // Check if price level already exists (from bids)
      const existingPoint = points.find((p) => p.priceLevel === level.price);

      if (existingPoint) {
        existingPoint.askVolume = volume;
        existingPoint.totalVolume += volume;
        existingPoint.intensity = maxVolume > 0 ? (existingPoint.totalVolume / maxVolume) * 100 : 0;
      } else {
        points.push({
          exchangeId: snapshot.exchangeId,
          symbol: snapshot.symbol,
          timestamp: snapshot.timestamp,
          priceLevel: level.price,
          bidVolume: 0,
          askVolume: volume,
          totalVolume: volume,
          intensity,
        });
      }
    });

    return points;
  }

  /**
   * Store heatmap data points
   */
  static async storeHeatmapPoints(points: LiquidityHeatmapPoint[]): Promise<void> {
    if (points.length === 0) return;

    try {
      await db.insert(liquidityHeatmapData).values(
        points.map((point) => ({
          exchangeId: point.exchangeId,
          symbol: point.symbol,
          timestamp: point.timestamp,
          priceLevel: point.priceLevel.toString(),
          bidVolume: point.bidVolume.toString(),
          askVolume: point.askVolume.toString(),
          totalVolume: point.totalVolume.toString(),
          intensity: point.intensity.toString(),
        }))
      );

      logger.debug('Stored liquidity heatmap points', {
        exchangeId: points[0].exchangeId,
        symbol: points[0].symbol,
        count: points.length,
      });
    } catch (error) {
      logger.error('Failed to store liquidity heatmap points', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get heatmap data for time range
   */
  static async getHeatmapData(
    exchangeId: string,
    symbol: string,
    startTime: Date,
    endTime: Date,
    priceMin?: number,
    priceMax?: number
  ): Promise<LiquidityHeatmap> {
    try {
      // Build where conditions
      const conditions = [
        eq(liquidityHeatmapData.exchangeId, exchangeId),
        eq(liquidityHeatmapData.symbol, symbol),
        gte(liquidityHeatmapData.timestamp, startTime),
        lte(liquidityHeatmapData.timestamp, endTime),
      ];

      // Add price range filters if provided
      if (priceMin !== undefined) {
        conditions.push(gte(liquidityHeatmapData.priceLevel, priceMin.toString()));
      }
      if (priceMax !== undefined) {
        conditions.push(lte(liquidityHeatmapData.priceLevel, priceMax.toString()));
      }

      // Query heatmap data
      const results = await db
        .select()
        .from(liquidityHeatmapData)
        .where(and(...conditions))
        .orderBy(
          liquidityHeatmapData.timestamp,
          liquidityHeatmapData.priceLevel
        );

      if (results.length === 0) {
        throw new BadRequestError('No heatmap data found for the specified time range');
      }

      // Convert to points
      const points: LiquidityHeatmapPoint[] = results.map((row) => ({
        id: row.id,
        exchangeId: row.exchangeId,
        symbol: row.symbol,
        timestamp: row.timestamp,
        priceLevel: parseFloat(row.priceLevel ?? '0'),
        bidVolume: parseFloat(row.bidVolume ?? '0'),
        askVolume: parseFloat(row.askVolume ?? '0'),
        totalVolume: parseFloat(row.totalVolume ?? '0'),
        intensity: parseFloat(row.intensity ?? '0'),
        createdAt: row.createdAt,
      }));

      // Group by timestamp
      const dataByTimestamp = new Map<number, LiquidityHeatmapPoint[]>();
      points.forEach((point) => {
        const timestamp = point.timestamp.getTime();
        if (!dataByTimestamp.has(timestamp)) {
          dataByTimestamp.set(timestamp, []);
        }
        dataByTimestamp.get(timestamp)!.push(point);
      });

      // Convert to 2D array
      const data = Array.from(dataByTimestamp.values());

      // Calculate bounds
      const minPrice = Math.min(...points.map((p) => p.priceLevel));
      const maxPrice = Math.max(...points.map((p) => p.priceLevel));
      const minIntensity = Math.min(...points.map((p) => p.intensity));
      const maxIntensity = Math.max(...points.map((p) => p.intensity));

      return {
        exchangeId,
        symbol,
        startTime,
        endTime,
        data,
        minPrice,
        maxPrice,
        minIntensity,
        maxIntensity,
      };
    } catch (error) {
      logger.error('Failed to get heatmap data', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Detect liquidity zones (support/resistance) from heatmap
   */
  static detectLiquidityZones(
    heatmapData: LiquidityHeatmap,
    minIntensityThreshold: number = 70,
    minDuration: number = 3 // Number of snapshots
  ): LiquidityZone[] {
    const zones: LiquidityZone[] = [];

    // Aggregate volume by price level across time
    const volumeByPrice = new Map<number, { total: number; count: number; timestamps: Date[] }>();

    heatmapData.data.forEach((snapshot) => {
      snapshot.forEach((point) => {
        if (point.intensity >= minIntensityThreshold) {
          const existing = volumeByPrice.get(point.priceLevel);
          if (existing) {
            existing.total += point.totalVolume;
            existing.count++;
            existing.timestamps.push(point.timestamp);
          } else {
            volumeByPrice.set(point.priceLevel, {
              total: point.totalVolume,
              count: 1,
              timestamps: [point.timestamp],
            });
          }
        }
      });
    });

    // Find zones that appear frequently enough
    volumeByPrice.forEach((data, priceLevel) => {
      if (data.count >= minDuration) {
        const averageVolume = data.total / data.count;
        const firstSeen = new Date(Math.min(...data.timestamps.map((t) => t.getTime())));
        const lastSeen = new Date(Math.max(...data.timestamps.map((t) => t.getTime())));

        // Determine zone type based on price position
        const midPrice = (heatmapData.minPrice + heatmapData.maxPrice) / 2;
        const zoneType = priceLevel < midPrice ? 'support' : 'resistance';

        // Calculate strength based on frequency and volume
        const frequencyScore = Math.min(100, (data.count / heatmapData.data.length) * 100);
        const volumeScore = Math.min(100, (averageVolume / 1000000) * 100); // Normalized to $1M
        const strength = (frequencyScore * 0.6 + volumeScore * 0.4);

        // Confidence based on duration and consistency
        const durationMinutes = (lastSeen.getTime() - firstSeen.getTime()) / 1000 / 60;
        const confidenceScore = Math.min(100, (durationMinutes / 60) * 100); // Normalized to 1 hour

        zones.push({
          exchangeId: heatmapData.exchangeId,
          symbol: heatmapData.symbol,
          priceLevel,
          side: 'both', // Detected from heatmap, could be either
          totalLiquidity: data.total,
          averageSize: averageVolume,
          orderCount: data.count,
          zoneType,
          strength,
          detectedAt: firstSeen,
          lastSeenAt: lastSeen,
          confidenceScore,
          isActive: true,
        });
      }
    });

    // Sort by strength (strongest first)
    zones.sort((a, b) => b.strength - a.strength);

    logger.info('Detected liquidity zones from heatmap', {
      exchangeId: heatmapData.exchangeId,
      symbol: heatmapData.symbol,
      zonesFound: zones.length,
    });

    return zones;
  }

  /**
   * Store liquidity zones
   */
  static async storeLiquidityZones(zones: LiquidityZone[]): Promise<void> {
    if (zones.length === 0) return;

    try {
      await db.insert(liquidityZones).values(
        zones.map((zone) => ({
          exchangeId: zone.exchangeId,
          symbol: zone.symbol,
          priceLevel: zone.priceLevel.toString(),
          priceRange: zone.priceRange?.toString(),
          side: zone.side,
          totalLiquidity: zone.totalLiquidity.toString(),
          averageSize: zone.averageSize?.toString(),
          orderCount: zone.orderCount,
          zoneType: zone.zoneType,
          strength: zone.strength.toString(),
          detectedAt: zone.detectedAt,
          lastSeenAt: zone.lastSeenAt,
          confidenceScore: zone.confidenceScore?.toString(),
          isActive: zone.isActive,
        }))
      );

      logger.info('Stored liquidity zones', {
        exchangeId: zones[0].exchangeId,
        symbol: zones[0].symbol,
        count: zones.length,
      });
    } catch (error) {
      logger.error('Failed to store liquidity zones', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get active liquidity zones
   */
  static async getActiveLiquidityZones(
    exchangeId: string,
    symbol: string,
    minStrength: number = 50
  ): Promise<LiquidityZone[]> {
    try {
      const results = await db
        .select()
        .from(liquidityZones)
        .where(
          and(
            eq(liquidityZones.exchangeId, exchangeId),
            eq(liquidityZones.symbol, symbol),
            eq(liquidityZones.isActive, true),
            gte(liquidityZones.strength, minStrength.toString())
          )
        )
        .orderBy(desc(liquidityZones.strength))
        .limit(20);

      return results.map((row) => ({
        id: row.id,
        exchangeId: row.exchangeId,
        symbol: row.symbol,
        priceLevel: parseFloat(row.priceLevel ?? '0'),
        priceRange: row.priceRange ? parseFloat(row.priceRange) : undefined,
        side: row.side as 'bid' | 'ask' | 'both',
        totalLiquidity: parseFloat(row.totalLiquidity ?? '0'),
        averageSize: row.averageSize ? parseFloat(row.averageSize) : undefined,
        orderCount: row.orderCount || undefined,
        zoneType: row.zoneType as 'support' | 'resistance' | 'accumulation' | 'distribution',
        strength: parseFloat(row.strength ?? '0'),
        detectedAt: row.detectedAt,
        lastSeenAt: row.lastSeenAt,
        confidenceScore: row.confidenceScore ? parseFloat(row.confidenceScore) : undefined,
        isActive: row.isActive ?? true,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }));
    } catch (error) {
      logger.error('Failed to get active liquidity zones', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Deactivate old liquidity zones (cleanup)
   */
  static async deactivateOldZones(olderThan: Date): Promise<number> {
    try {
      const result = await db
        .update(liquidityZones)
        .set({ isActive: false, updatedAt: new Date() })
        .where(lte(liquidityZones.lastSeenAt, olderThan));

      logger.info('Deactivated old liquidity zones', {
        olderThan,
        count: result.rowCount || 0,
      });

      return result.rowCount || 0;
    } catch (error) {
      logger.error('Failed to deactivate old liquidity zones', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Generate and store heatmap from snapshot (convenience method)
   */
  static async generateAndStore(
    exchangeId: string,
    symbol: string
  ): Promise<LiquidityHeatmapPoint[]> {
    // Get latest snapshot
    const snapshot = await OrderBookSnapshotService.getLatestSnapshot(exchangeId, symbol);

    if (!snapshot) {
      throw new BadRequestError('No order book snapshot found');
    }

    // Generate heatmap points
    const points = this.generateHeatmapPoints(snapshot);

    // Store points
    await this.storeHeatmapPoints(points);

    logger.info('Generated and stored liquidity heatmap', {
      exchangeId,
      symbol,
      points: points.length,
    });

    return points;
  }

  /**
   * Analyze heatmap and detect zones (full workflow)
   */
  static async analyzeAndDetectZones(
    exchangeId: string,
    symbol: string,
    startTime: Date,
    endTime: Date,
    minIntensityThreshold: number = 70,
    minDuration: number = 3
  ): Promise<{
    heatmap: LiquidityHeatmap;
    zones: LiquidityZone[];
  }> {
    // Get heatmap data
    const heatmap = await this.getHeatmapData(exchangeId, symbol, startTime, endTime);

    // Detect zones
    const zones = this.detectLiquidityZones(heatmap, minIntensityThreshold, minDuration);

    // Store zones
    if (zones.length > 0) {
      await this.storeLiquidityZones(zones);
    }

    logger.info('Analyzed heatmap and detected zones', {
      exchangeId,
      symbol,
      dataPoints: heatmap.data.flat().length,
      zonesDetected: zones.length,
    });

    return { heatmap, zones };
  }

  /**
   * Get heatmap intensity distribution (for visualization)
   */
  static getIntensityDistribution(heatmap: LiquidityHeatmap): {
    buckets: { min: number; max: number; count: number }[];
    mean: number;
    median: number;
    stdDev: number;
  } {
    const allIntensities = heatmap.data.flat().map((p) => p.intensity);

    // Create 10 buckets
    const bucketSize = (heatmap.maxIntensity - heatmap.minIntensity) / 10;
    const buckets = Array.from({ length: 10 }, (_, i) => ({
      min: heatmap.minIntensity + i * bucketSize,
      max: heatmap.minIntensity + (i + 1) * bucketSize,
      count: 0,
    }));

    allIntensities.forEach((intensity) => {
      const bucketIndex = Math.min(
        Math.floor((intensity - heatmap.minIntensity) / bucketSize),
        9
      );
      buckets[bucketIndex].count++;
    });

    // Calculate statistics
    const mean = allIntensities.reduce((sum, val) => sum + val, 0) / allIntensities.length;
    const sortedIntensities = [...allIntensities].sort((a, b) => a - b);
    const median = sortedIntensities[Math.floor(sortedIntensities.length / 2)];
    const variance =
      allIntensities.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      allIntensities.length;
    const stdDev = Math.sqrt(variance);

    return { buckets, mean, median, stdDev };
  }
}
