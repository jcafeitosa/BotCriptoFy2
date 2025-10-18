/**
 * Large Order Detection Service
 * Detects and analyzes large orders, iceberg orders, whale activity, and spoofing
 *
 * Features:
 * - Iceberg order detection (hidden liquidity)
 * - Whale order identification
 * - Order spoofing detection
 * - Large order clustering
 * - Market manipulation detection
 * - Order renewal tracking
 * - Size-based anomaly detection
 *
 * Detection Methods:
 * - Statistical anomaly detection (>3 std dev)
 * - Pattern recognition (repeated orders)
 * - Time-series analysis (order renewal)
 * - Volume distribution analysis
 */

import { db } from '@/db';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import {
  orderBookSnapshots,
  largeOrdersDetected,
  spoofingEvents,
} from '../schema/order-book.schema';
import { OrderBookSnapshotService } from './order-book-snapshot.service';
import logger from '@/utils/logger';
import { BadRequestError } from '@/utils/errors';
import type { OrderBookSnapshot, OrderBookLevel } from '../types/order-book.types';

/**
 * Large Order Detection Result
 */
export interface LargeOrderDetection {
  exchangeId: string;
  symbol: string;
  timestamp: Date;

  // Order details
  side: 'bid' | 'ask';
  price: number;
  size: number;
  sizeUSD: number;

  // Statistical analysis
  zScore: number; // How many std deviations from mean
  percentileRank: number; // 0-100

  // Classification
  orderType: 'whale' | 'institutional' | 'large_retail' | 'iceberg';
  confidence: number; // 0-100

  // Context
  distanceFromMid: number; // Distance from mid price (%)
  marketShare: number; // % of total order book liquidity
}

/**
 * Iceberg Order Detection
 */
export interface IcebergDetection {
  exchangeId: string;
  symbol: string;
  timestamp: Date;

  // Order details
  side: 'bid' | 'ask';
  price: number;
  visibleSize: number;
  estimatedTotalSize: number;
  hiddenSize: number;

  // Detection metrics
  renewalCount: number; // How many times order was renewed
  renewalFrequency: number; // Renewals per minute
  consistency: number; // How consistent the renewals are (0-100)

  // Confidence
  confidence: number; // 0-100
  detectionMethod: 'renewal_pattern' | 'size_anomaly' | 'execution_pattern';
}

/**
 * Spoofing Detection
 */
export interface SpoofingDetection {
  exchangeId: string;
  symbol: string;
  timestamp: Date;
  startTime: Date;
  endTime: Date;

  // Spoofing details
  side: 'bid' | 'ask';
  price: number;
  maxSize: number;
  avgLifetime: number; // Average time order stays in book (seconds)

  // Pattern analysis
  placementCount: number; // How many times placed
  cancellationCount: number; // How many times cancelled
  executionRate: number; // % that got executed (low = likely spoofing)

  // Classification
  spoofingType: 'layering' | 'spoofing' | 'quote_stuffing';
  severity: 'low' | 'medium' | 'high' | 'extreme';
  confidence: number; // 0-100
}

/**
 * Order Cluster (multiple large orders at similar prices)
 */
export interface OrderCluster {
  exchangeId: string;
  symbol: string;
  timestamp: Date;

  side: 'bid' | 'ask';
  priceRange: { min: number; max: number };
  centerPrice: number;
  totalSize: number;
  orderCount: number;

  // Analysis
  clusterStrength: number; // 0-100
  supportResistanceLevel: boolean;
  intention: 'accumulation' | 'distribution' | 'defense' | 'unknown';
}

/**
 * Whale Activity Summary
 */
export interface WhaleActivitySummary {
  exchangeId: string;
  symbol: string;
  timestamp: Date;
  timeRange: { start: Date; end: Date };

  // Whale metrics
  totalWhaleOrders: number;
  totalWhaleVolume: number;
  totalWhaleVolumeUSD: number;

  // Distribution
  bidWhaleOrders: number;
  askWhaleOrders: number;
  bidWhaleVolume: number;
  askWhaleVolume: number;

  // Sentiment
  whaleSentiment: 'bullish' | 'bearish' | 'neutral';
  confidenceScore: number;

  // Largest orders
  largestBid?: LargeOrderDetection;
  largestAsk?: LargeOrderDetection;
}

export class LargeOrderDetectionService {
  /**
   * Detect large orders in current order book
   */
  static async detectLargeOrders(
    exchangeId: string,
    symbol: string,
    thresholdMultiplier: number = 3.0 // How many std deviations
  ): Promise<LargeOrderDetection[]> {
    try {
      const snapshot = await OrderBookSnapshotService.getLatestSnapshot(exchangeId, symbol);

      if (!snapshot) {
        throw new BadRequestError('No order book data available');
      }

      // Calculate statistics for order sizes
      const allOrders = [...snapshot.bids, ...snapshot.asks];
      const sizes = allOrders.map(order => order.price * order.amount);

      const stats = this.calculateStatistics(sizes);
      const threshold = stats.mean + thresholdMultiplier * stats.stdDev;

      const detections: LargeOrderDetection[] = [];

      // Check bids
      snapshot.bids.forEach(bid => {
        const sizeUSD = bid.price * bid.amount;

        if (sizeUSD >= threshold) {
          const detection = this.analyzeLargeOrder(
            exchangeId,
            symbol,
            snapshot.timestamp,
            'bid',
            bid,
            sizeUSD,
            stats,
            snapshot
          );
          detections.push(detection);
        }
      });

      // Check asks
      snapshot.asks.forEach(ask => {
        const sizeUSD = ask.price * ask.amount;

        if (sizeUSD >= threshold) {
          const detection = this.analyzeLargeOrder(
            exchangeId,
            symbol,
            snapshot.timestamp,
            'ask',
            ask,
            sizeUSD,
            stats,
            snapshot
          );
          detections.push(detection);
        }
      });

      logger.debug('Detected large orders', {
        exchangeId,
        symbol,
        count: detections.length,
        threshold: threshold.toFixed(2),
      });

      return detections.sort((a, b) => b.sizeUSD - a.sizeUSD);
    } catch (error) {
      logger.error('Failed to detect large orders', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Calculate statistics for order sizes
   */
  private static calculateStatistics(values: number[]): {
    mean: number;
    stdDev: number;
    median: number;
    percentiles: { p50: number; p75: number; p90: number; p95: number; p99: number };
  } {
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;

    const mean = values.reduce((sum, val) => sum + val, 0) / n;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    const percentile = (p: number) => sorted[Math.floor(n * p)];

    return {
      mean,
      stdDev,
      median: percentile(0.5),
      percentiles: {
        p50: percentile(0.5),
        p75: percentile(0.75),
        p90: percentile(0.90),
        p95: percentile(0.95),
        p99: percentile(0.99),
      },
    };
  }

  /**
   * Analyze a large order
   */
  private static analyzeLargeOrder(
    exchangeId: string,
    symbol: string,
    timestamp: Date,
    side: 'bid' | 'ask',
    order: OrderBookLevel,
    sizeUSD: number,
    stats: ReturnType<typeof this.calculateStatistics>,
    snapshot: OrderBookSnapshot
  ): LargeOrderDetection {
    // Calculate z-score
    const zScore = (sizeUSD - stats.mean) / stats.stdDev;

    // Calculate percentile rank
    let percentileRank = 50;
    if (sizeUSD >= stats.percentiles.p99) percentileRank = 99;
    else if (sizeUSD >= stats.percentiles.p95) percentileRank = 95;
    else if (sizeUSD >= stats.percentiles.p90) percentileRank = 90;
    else if (sizeUSD >= stats.percentiles.p75) percentileRank = 75;

    // Classify order type
    let orderType: 'whale' | 'institutional' | 'large_retail' | 'iceberg';
    let confidence = 70;

    if (zScore > 5) {
      orderType = 'whale';
      confidence = 95;
    } else if (zScore > 4) {
      orderType = 'institutional';
      confidence = 85;
    } else if (zScore > 3) {
      orderType = 'large_retail';
      confidence = 75;
    } else {
      orderType = 'iceberg'; // Potential iceberg
      confidence = 60;
    }

    // Distance from mid price
    const midPrice = snapshot.midPrice || ((snapshot.bestBid || 0) + (snapshot.bestAsk || 0)) / 2;
    const distanceFromMid = ((order.price - midPrice) / midPrice) * 100;

    // Market share
    const totalLiquidity = side === 'bid'
      ? snapshot.bids.reduce((sum, b) => sum + b.price * b.amount, 0)
      : snapshot.asks.reduce((sum, a) => sum + a.price * a.amount, 0);

    const marketShare = (sizeUSD / totalLiquidity) * 100;

    return {
      exchangeId,
      symbol,
      timestamp,
      side,
      price: order.price,
      size: order.amount,
      sizeUSD,
      zScore,
      percentileRank,
      orderType,
      confidence,
      distanceFromMid,
      marketShare,
    };
  }

  /**
   * Detect iceberg orders (hidden liquidity)
   */
  static async detectIcebergOrders(
    exchangeId: string,
    symbol: string,
    lookbackMinutes: number = 60
  ): Promise<IcebergDetection[]> {
    try {
      const startTime = new Date(Date.now() - lookbackMinutes * 60 * 1000);

      const snapshots = await db
        .select()
        .from(orderBookSnapshots)
        .where(
          and(
            eq(orderBookSnapshots.exchangeId, exchangeId),
            eq(orderBookSnapshots.symbol, symbol),
            gte(orderBookSnapshots.timestamp, startTime)
          )
        )
        .orderBy(orderBookSnapshots.timestamp);

      if (snapshots.length < 10) {
        throw new BadRequestError('Insufficient data for iceberg detection');
      }

      // Track orders at each price level
      const priceTracking = new Map<string, {
        appearances: number;
        totalSize: number;
        sizes: number[];
        timestamps: Date[];
      }>();

      snapshots.forEach(snapshot => {
        const bids = snapshot.bids as any as OrderBookLevel[];
        const asks = snapshot.asks as any as OrderBookLevel[];

        [...bids, ...asks].forEach(order => {
          const key = `${order.price}`;
          const existing = priceTracking.get(key);

          if (existing) {
            existing.appearances++;
            existing.totalSize += order.amount;
            existing.sizes.push(order.amount);
            existing.timestamps.push(snapshot.timestamp);
          } else {
            priceTracking.set(key, {
              appearances: 1,
              totalSize: order.amount,
              sizes: [order.amount],
              timestamps: [snapshot.timestamp],
            });
          }
        });
      });

      // Analyze for iceberg patterns
      const icebergDetections: IcebergDetection[] = [];

      priceTracking.forEach((data, priceStr) => {
        const price = parseFloat(priceStr);

        // Iceberg indicator: order appears multiple times with consistent size
        if (data.appearances >= 5) {
          const avgSize = data.totalSize / data.appearances;
          const sizeStdDev = this.calculateStdDev(data.sizes);
          const consistency = Math.max(0, 100 - (sizeStdDev / avgSize) * 100);

          // High consistency = likely iceberg
          if (consistency > 70) {
            // Calculate renewal frequency
            const timeSpan = data.timestamps[data.timestamps.length - 1].getTime() -
                           data.timestamps[0].getTime();
            const renewalFrequency = (data.appearances / (timeSpan / 60000)); // Per minute

            // Estimate hidden size (conservative)
            const estimatedTotalSize = avgSize * data.appearances * 2;
            const hiddenSize = estimatedTotalSize - avgSize;

            // Determine side from last snapshot
            const lastSnapshot = snapshots[snapshots.length - 1];
            const bids = lastSnapshot.bids as any as OrderBookLevel[];
            const asks = lastSnapshot.asks as any as OrderBookLevel[];

            const isBid = bids.some(b => b.price === price);
            const side: 'bid' | 'ask' = isBid ? 'bid' : 'ask';

            const detection: IcebergDetection = {
              exchangeId,
              symbol,
              timestamp: data.timestamps[data.timestamps.length - 1],
              side,
              price,
              visibleSize: avgSize,
              estimatedTotalSize,
              hiddenSize,
              renewalCount: data.appearances,
              renewalFrequency,
              consistency,
              confidence: Math.min(95, consistency + renewalFrequency * 5),
              detectionMethod: 'renewal_pattern',
            };

            icebergDetections.push(detection);
          }
        }
      });

      logger.info('Detected iceberg orders', {
        exchangeId,
        symbol,
        count: icebergDetections.length,
      });

      return icebergDetections.sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      logger.error('Failed to detect iceberg orders', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Calculate standard deviation
   */
  private static calculateStdDev(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Detect spoofing activity
   */
  static async detectSpoofing(
    exchangeId: string,
    symbol: string,
    lookbackMinutes: number = 60
  ): Promise<SpoofingDetection[]> {
    try {
      const startTime = new Date(Date.now() - lookbackMinutes * 60 * 1000);

      const snapshots = await db
        .select()
        .from(orderBookSnapshots)
        .where(
          and(
            eq(orderBookSnapshots.exchangeId, exchangeId),
            eq(orderBookSnapshots.symbol, symbol),
            gte(orderBookSnapshots.timestamp, startTime)
          )
        )
        .orderBy(orderBookSnapshots.timestamp);

      if (snapshots.length < 20) {
        throw new BadRequestError('Insufficient data for spoofing detection');
      }

      // Track order lifecycles
      const orderLifecycles = new Map<string, {
        placements: number;
        cancellations: number;
        lifetimes: number[]; // in seconds
        sizes: number[];
        maxSize: number;
        firstSeen: Date;
        lastSeen: Date;
      }>();

      // Analyze order book changes
      for (let i = 1; i < snapshots.length; i++) {
        const current = snapshots[i];
        const previous = snapshots[i - 1];

        const currentBids = current.bids as any as OrderBookLevel[];
        const currentAsks = current.asks as any as OrderBookLevel[];
        const previousBids = previous.bids as any as OrderBookLevel[];
        const previousAsks = previous.asks as any as OrderBookLevel[];

        // Check for orders that appeared and disappeared
        this.trackOrderChanges(
          currentBids,
          previousBids,
          'bid',
          current.timestamp,
          previous.timestamp,
          orderLifecycles
        );

        this.trackOrderChanges(
          currentAsks,
          previousAsks,
          'ask',
          current.timestamp,
          previous.timestamp,
          orderLifecycles
        );
      }

      // Analyze for spoofing patterns
      const spoofingDetections: SpoofingDetection[] = [];

      orderLifecycles.forEach((data, key) => {
        const [side, priceStr] = key.split(':');
        const price = parseFloat(priceStr);

        // Spoofing indicators:
        // 1. Many placements/cancellations
        // 2. Short average lifetime
        // 3. Low execution rate (not executed, just cancelled)

        if (data.placements >= 5 && data.cancellations >= 3) {
          const avgLifetime = data.lifetimes.reduce((sum, val) => sum + val, 0) / data.lifetimes.length;
          const executionRate = ((data.placements - data.cancellations) / data.placements) * 100;

          // Short-lived orders with low execution = likely spoofing
          if (avgLifetime < 30 && executionRate < 20) {
            let spoofingType: 'layering' | 'spoofing' | 'quote_stuffing';
            let severity: 'low' | 'medium' | 'high' | 'extreme';

            // Classification
            if (data.placements > 20) {
              spoofingType = 'quote_stuffing'; // Many rapid orders
              severity = 'extreme';
            } else if (data.cancellations > data.placements * 0.8) {
              spoofingType = 'spoofing'; // Most orders cancelled
              severity = 'high';
            } else {
              spoofingType = 'layering'; // Multiple layers
              severity = 'medium';
            }

            // Confidence based on pattern strength
            const confidence = Math.min(95,
              (data.placements / 20) * 30 +
              (100 - executionRate) * 0.4 +
              (30 / avgLifetime) * 30
            );

            const detection: SpoofingDetection = {
              exchangeId,
              symbol,
              timestamp: data.lastSeen,
              startTime: data.firstSeen,
              endTime: data.lastSeen,
              side: side as 'bid' | 'ask',
              price,
              maxSize: data.maxSize,
              avgLifetime,
              placementCount: data.placements,
              cancellationCount: data.cancellations,
              executionRate,
              spoofingType,
              severity,
              confidence,
            };

            spoofingDetections.push(detection);
          }
        }
      });

      logger.warn('Detected spoofing activity', {
        exchangeId,
        symbol,
        count: spoofingDetections.length,
      });

      return spoofingDetections.sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      logger.error('Failed to detect spoofing', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Track order changes between snapshots
   */
  private static trackOrderChanges(
    current: OrderBookLevel[],
    previous: OrderBookLevel[],
    side: 'bid' | 'ask',
    currentTime: Date,
    previousTime: Date,
    tracking: Map<string, any>
  ): void {
    const currentMap = new Map(current.map(o => [o.price, o.amount]));
    const previousMap = new Map(previous.map(o => [o.price, o.amount]));

    // Find orders that disappeared (cancelled)
    previousMap.forEach((amount, price) => {
      const key = `${side}:${price}`;

      if (!currentMap.has(price)) {
        // Order was cancelled
        const existing = tracking.get(key);

        if (existing) {
          existing.cancellations++;
          const lifetime = (currentTime.getTime() - previousTime.getTime()) / 1000;
          existing.lifetimes.push(lifetime);
          existing.lastSeen = currentTime;
        }
      }
    });

    // Find new orders (placements)
    currentMap.forEach((amount, price) => {
      const key = `${side}:${price}`;

      if (!previousMap.has(price)) {
        // New order placement
        const existing = tracking.get(key);

        if (existing) {
          existing.placements++;
          existing.sizes.push(amount);
          existing.maxSize = Math.max(existing.maxSize, amount);
          existing.lastSeen = currentTime;
        } else {
          tracking.set(key, {
            placements: 1,
            cancellations: 0,
            lifetimes: [],
            sizes: [amount],
            maxSize: amount,
            firstSeen: currentTime,
            lastSeen: currentTime,
          });
        }
      }
    });
  }

  /**
   * Detect order clusters
   */
  static async detectOrderClusters(
    exchangeId: string,
    symbol: string,
    priceRangePercent: number = 0.5 // Cluster within 0.5% price range
  ): Promise<OrderCluster[]> {
    try {
      const snapshot = await OrderBookSnapshotService.getLatestSnapshot(exchangeId, symbol);

      if (!snapshot) {
        throw new BadRequestError('No order book data available');
      }

      const clusters: OrderCluster[] = [];

      // Analyze bids
      const bidClusters = this.findClusters(
        snapshot.bids,
        'bid',
        priceRangePercent,
        exchangeId,
        symbol,
        snapshot.timestamp
      );
      clusters.push(...bidClusters);

      // Analyze asks
      const askClusters = this.findClusters(
        snapshot.asks,
        'ask',
        priceRangePercent,
        exchangeId,
        symbol,
        snapshot.timestamp
      );
      clusters.push(...askClusters);

      logger.debug('Detected order clusters', {
        exchangeId,
        symbol,
        count: clusters.length,
      });

      return clusters.sort((a, b) => b.clusterStrength - a.clusterStrength);
    } catch (error) {
      logger.error('Failed to detect order clusters', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Find clusters in order book side
   */
  private static findClusters(
    orders: OrderBookLevel[],
    side: 'bid' | 'ask',
    rangePercent: number,
    exchangeId: string,
    symbol: string,
    timestamp: Date
  ): OrderCluster[] {
    const clusters: OrderCluster[] = [];
    const processed = new Set<number>();

    orders.forEach((order, index) => {
      if (processed.has(index)) return;

      const priceRange = order.price * (rangePercent / 100);
      const minPrice = order.price - priceRange;
      const maxPrice = order.price + priceRange;

      // Find all orders in this price range
      const clusterOrders = orders.filter((o, i) => {
        if (processed.has(i)) return false;
        return o.price >= minPrice && o.price <= maxPrice;
      });

      if (clusterOrders.length >= 3) {
        // Mark as processed
        clusterOrders.forEach((o) => {
          const idx = orders.indexOf(o);
          if (idx >= 0) processed.add(idx);
        });

        const totalSize = clusterOrders.reduce((sum, o) => sum + o.price * o.amount, 0);
        const avgPrice = clusterOrders.reduce((sum, o) => sum + o.price, 0) / clusterOrders.length;

        // Cluster strength based on size and density
        const clusterStrength = Math.min(100,
          (clusterOrders.length / orders.length) * 50 +
          (totalSize / 1000000) * 50
        );

        // Determine intention
        let intention: 'accumulation' | 'distribution' | 'defense' | 'unknown' = 'unknown';
        if (side === 'bid' && clusterStrength > 70) intention = 'accumulation';
        else if (side === 'ask' && clusterStrength > 70) intention = 'distribution';
        else if (clusterStrength > 50) intention = 'defense';

        clusters.push({
          exchangeId,
          symbol,
          timestamp,
          side,
          priceRange: {
            min: Math.min(...clusterOrders.map(o => o.price)),
            max: Math.max(...clusterOrders.map(o => o.price)),
          },
          centerPrice: avgPrice,
          totalSize,
          orderCount: clusterOrders.length,
          clusterStrength,
          supportResistanceLevel: clusterStrength > 60,
          intention,
        });
      }
    });

    return clusters;
  }

  /**
   * Get whale activity summary
   */
  static async getWhaleActivitySummary(
    exchangeId: string,
    symbol: string,
    lookbackMinutes: number = 60
  ): Promise<WhaleActivitySummary> {
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - lookbackMinutes * 60 * 1000);

      // Get all large orders in time range
      const largeOrders = await this.detectLargeOrders(exchangeId, symbol, 3.0);

      // Filter to whale orders only
      const whaleOrders = largeOrders.filter(o => o.orderType === 'whale' || o.zScore > 4);

      // Calculate metrics
      const bidWhaleOrders = whaleOrders.filter(o => o.side === 'bid');
      const askWhaleOrders = whaleOrders.filter(o => o.side === 'ask');

      const bidWhaleVolume = bidWhaleOrders.reduce((sum, o) => sum + o.sizeUSD, 0);
      const askWhaleVolume = askWhaleOrders.reduce((sum, o) => sum + o.sizeUSD, 0);

      // Sentiment analysis
      let whaleSentiment: 'bullish' | 'bearish' | 'neutral';
      const sentimentRatio = bidWhaleVolume / (askWhaleVolume || 1);

      if (sentimentRatio > 1.5) whaleSentiment = 'bullish';
      else if (sentimentRatio < 0.67) whaleSentiment = 'bearish';
      else whaleSentiment = 'neutral';

      // Confidence based on volume
      const totalVolume = bidWhaleVolume + askWhaleVolume;
      const confidenceScore = Math.min(100, (totalVolume / 10000000) * 100);

      const result: WhaleActivitySummary = {
        exchangeId,
        symbol,
        timestamp: new Date(),
        timeRange: { start: startTime, end: endTime },
        totalWhaleOrders: whaleOrders.length,
        totalWhaleVolume: bidWhaleVolume + askWhaleVolume,
        totalWhaleVolumeUSD: bidWhaleVolume + askWhaleVolume,
        bidWhaleOrders: bidWhaleOrders.length,
        askWhaleOrders: askWhaleOrders.length,
        bidWhaleVolume,
        askWhaleVolume,
        whaleSentiment,
        confidenceScore,
        largestBid: bidWhaleOrders.length > 0 ? bidWhaleOrders[0] : undefined,
        largestAsk: askWhaleOrders.length > 0 ? askWhaleOrders[0] : undefined,
      };

      logger.info('Generated whale activity summary', {
        exchangeId,
        symbol,
        whaleOrders: whaleOrders.length,
        sentiment: whaleSentiment,
      });

      return result;
    } catch (error) {
      logger.error('Failed to get whale activity summary', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Store large order detection in database
   */
  static async storeLargeOrderDetection(
    detection: LargeOrderDetection
  ): Promise<void> {
    try {
      await db.insert(largeOrdersDetected).values({
        exchangeId: detection.exchangeId,
        symbol: detection.symbol,
        timestamp: detection.timestamp,
        side: detection.side,
        priceLevel: detection.price.toString(),
        visibleSize: detection.size.toString(),
        orderType: detection.orderType,
        icebergProbability: detection.confidence.toString(),
      });

      logger.debug('Stored large order detection', {
        exchangeId: detection.exchangeId,
        symbol: detection.symbol,
        orderType: detection.orderType,
      });
    } catch (error) {
      logger.error('Failed to store large order detection', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Store spoofing detection in database
   */
  static async storeSpoofingDetection(
    detection: SpoofingDetection
  ): Promise<void> {
    try {
      await db.insert(spoofingEvents).values({
        exchangeId: detection.exchangeId,
        symbol: detection.symbol,
        detectedAt: detection.timestamp,
        side: detection.side,
        priceLevel: detection.price.toString(),
        orderSize: detection.maxSize.toString(),
        spoofingType: detection.spoofingType,
        confidenceScore: detection.confidence.toString(),
      });

      logger.warn('Stored spoofing detection', {
        exchangeId: detection.exchangeId,
        symbol: detection.symbol,
        spoofingType: detection.spoofingType,
        severity: detection.severity,
      });
    } catch (error) {
      logger.error('Failed to store spoofing detection', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
