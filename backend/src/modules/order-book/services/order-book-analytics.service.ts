/**
 * Order Book Analytics Service
 * Advanced analytics for order book data
 *
 * Features:
 * - Depth analysis (multi-level)
 * - Spread analysis (absolute, relative, effective)
 * - Volume distribution analysis
 * - Liquidity scoring
 * - Depth chart data generation
 * - DOM (Depth of Market) display data
 * - Statistical analysis
 */

import { db } from '@/db';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { orderBookSnapshots, liquidityScores } from '../schema/order-book.schema';
import { OrderBookSnapshotService } from './order-book-snapshot.service';
import logger from '@/utils/logger';
import { BadRequestError } from '@/utils/errors';
import type {
  OrderBookSnapshot,
  OrderBookLevel,
  DepthChartData,
  DOMDisplayData,
  DOMLevelData,
  LiquidityScore,
} from '../types/order-book.types';

export class OrderBookAnalyticsService {
  /**
   * Analyze order book depth at multiple levels
   */
  static analyzeDepth(
    snapshot: OrderBookSnapshot
  ): {
    depth5: { bid: number; ask: number; total: number; imbalance: number };
    depth10: { bid: number; ask: number; total: number; imbalance: number };
    depth20: { bid: number; ask: number; total: number; imbalance: number };
    depth50: { bid: number; ask: number; total: number; imbalance: number };
    depth100: { bid: number; ask: number; total: number; imbalance: number };
  } {
    const calculateDepthAtLevel = (levels: number) => {
      const bidDepth = this.calculateDepth(snapshot.bids.slice(0, levels));
      const askDepth = this.calculateDepth(snapshot.asks.slice(0, levels));
      const total = bidDepth + askDepth;
      const imbalance = total > 0 ? (bidDepth - askDepth) / total : 0;

      return { bid: bidDepth, ask: askDepth, total, imbalance };
    };

    return {
      depth5: calculateDepthAtLevel(5),
      depth10: calculateDepthAtLevel(10),
      depth20: calculateDepthAtLevel(20),
      depth50: calculateDepthAtLevel(50),
      depth100: calculateDepthAtLevel(100),
    };
  }

  /**
   * Analyze spread metrics
   */
  static analyzeSpread(snapshot: OrderBookSnapshot): {
    absolute: number;
    percent: number;
    bps: number; // Basis points
    midPrice: number;
    effectiveSpread?: number;
  } {
    const bestBid = snapshot.bestBid || snapshot.bids[0]?.price || 0;
    const bestAsk = snapshot.bestAsk || snapshot.asks[0]?.price || 0;

    const absolute = bestAsk - bestBid;
    const midPrice = (bestBid + bestAsk) / 2;
    const percent = bestBid > 0 ? (absolute / bestBid) * 100 : 0;
    const bps = percent * 100; // 1% = 100 bps

    return {
      absolute,
      percent,
      bps,
      midPrice,
    };
  }

  /**
   * Calculate volume distribution across price levels
   */
  static analyzeVolumeDistribution(snapshot: OrderBookSnapshot): {
    bid: {
      totalVolume: number;
      averageSize: number;
      weightedAveragePrice: number;
      concentrationIndex: number; // Gini coefficient
    };
    ask: {
      totalVolume: number;
      averageSize: number;
      weightedAveragePrice: number;
      concentrationIndex: number;
    };
  } {
    const analyzeSide = (levels: OrderBookLevel[]) => {
      const totalVolume = levels.reduce((sum, level) => sum + level.amount, 0);
      const averageSize = levels.length > 0 ? totalVolume / levels.length : 0;

      // Weighted average price
      const totalValue = levels.reduce((sum, level) => sum + level.price * level.amount, 0);
      const weightedAveragePrice = totalVolume > 0 ? totalValue / totalVolume : 0;

      // Concentration index (simplified Gini coefficient)
      // Measures how concentrated the volume is (0 = uniform, 1 = concentrated)
      const sortedAmounts = levels.map((l) => l.amount).sort((a, b) => a - b);
      const n = sortedAmounts.length;
      let sumOfDifferences = 0;
      for (let i = 0; i < n; i++) {
        sumOfDifferences += (2 * (i + 1) - n - 1) * sortedAmounts[i];
      }
      const concentrationIndex =
        n > 0 && totalVolume > 0 ? sumOfDifferences / (n * totalVolume) : 0;

      return {
        totalVolume,
        averageSize,
        weightedAveragePrice,
        concentrationIndex,
      };
    };

    return {
      bid: analyzeSide(snapshot.bids),
      ask: analyzeSide(snapshot.asks),
    };
  }

  /**
   * Calculate liquidity score (0-100)
   */
  static calculateLiquidityScore(snapshot: OrderBookSnapshot): LiquidityScore {
    const depth = this.analyzeDepth(snapshot);
    const spread = this.analyzeSpread(snapshot);

    // Component scores (0-100)

    // 1. Depth Score - based on total depth (normalized)
    // Assume $100k depth = 50 score, $1M depth = 100 score
    const depthScore = Math.min(100, (depth.depth50.total / 1000000) * 100);

    // 2. Spread Score - tighter spread = higher score
    // 0.01% spread = 100, 1% spread = 0
    const spreadScore = Math.max(0, 100 - spread.percent * 100);

    // 3. Volume Score - based on average order size
    const volumeDistribution = this.analyzeVolumeDistribution(snapshot);
    const avgVolume =
      (volumeDistribution.bid.totalVolume + volumeDistribution.ask.totalVolume) / 2;
    const volumeScore = Math.min(100, (avgVolume / 100) * 100); // Normalized to 100 BTC

    // 4. Stability Score - based on bid-ask balance
    const stabilityScore = Math.max(0, 100 - Math.abs(depth.depth10.imbalance) * 200);

    // Overall score (weighted average)
    const score =
      depthScore * 0.3 + // 30% weight
      spreadScore * 0.3 + // 30% weight
      volumeScore * 0.2 + // 20% weight
      stabilityScore * 0.2; // 20% weight

    // Determine regime
    let regime: 'abundant' | 'normal' | 'scarce' | 'crisis';
    if (score >= 80) regime = 'abundant';
    else if (score >= 60) regime = 'normal';
    else if (score >= 40) regime = 'scarce';
    else regime = 'crisis';

    return {
      exchangeId: snapshot.exchangeId,
      symbol: snapshot.symbol,
      timestamp: snapshot.timestamp,
      score,
      depthScore,
      spreadScore,
      volumeScore,
      stabilityScore,
      regime,
      bidDepth: depth.depth50.bid,
      askDepth: depth.depth50.ask,
      spread: spread.absolute,
    };
  }

  /**
   * Store liquidity score
   */
  static async storeLiquidityScore(score: LiquidityScore): Promise<void> {
    try {
      await db.insert(liquidityScores).values({
        exchangeId: score.exchangeId,
        symbol: score.symbol,
        timestamp: score.timestamp,
        score: score.score.toString(),
        depthScore: score.depthScore?.toString(),
        spreadScore: score.spreadScore?.toString(),
        volumeScore: score.volumeScore?.toString(),
        stabilityScore: score.stabilityScore?.toString(),
        regime: score.regime,
        bidDepth: score.bidDepth?.toString(),
        askDepth: score.askDepth?.toString(),
        spread: score.spread?.toString(),
      });

      logger.debug('Stored liquidity score', {
        exchangeId: score.exchangeId,
        symbol: score.symbol,
        score: score.score.toFixed(2),
        regime: score.regime,
      });
    } catch (error) {
      logger.error('Failed to store liquidity score', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get latest liquidity score
   */
  static async getLatestLiquidityScore(
    exchangeId: string,
    symbol: string
  ): Promise<LiquidityScore | null> {
    try {
      const [result] = await db
        .select()
        .from(liquidityScores)
        .where(
          and(eq(liquidityScores.exchangeId, exchangeId), eq(liquidityScores.symbol, symbol))
        )
        .orderBy(desc(liquidityScores.timestamp))
        .limit(1);

      if (!result) return null;

      return {
        id: result.id,
        exchangeId: result.exchangeId,
        symbol: result.symbol,
        timestamp: result.timestamp,
        score: parseFloat(result.score),
        depthScore: result.depthScore ? parseFloat(result.depthScore) : undefined,
        spreadScore: result.spreadScore ? parseFloat(result.spreadScore) : undefined,
        volumeScore: result.volumeScore ? parseFloat(result.volumeScore) : undefined,
        stabilityScore: result.stabilityScore ? parseFloat(result.stabilityScore) : undefined,
        regime: result.regime as 'abundant' | 'normal' | 'scarce' | 'crisis',
        bidDepth: result.bidDepth ? parseFloat(result.bidDepth) : undefined,
        askDepth: result.askDepth ? parseFloat(result.askDepth) : undefined,
        spread: result.spread ? parseFloat(result.spread) : undefined,
        createdAt: result.createdAt,
      };
    } catch (error) {
      logger.error('Failed to get latest liquidity score', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Generate depth chart data for visualization
   */
  static generateDepthChartData(snapshot: OrderBookSnapshot): DepthChartData {
    // Calculate cumulative depth for bids (descending)
    let cumulativeBid = 0;
    const bids = snapshot.bids.map((level) => {
      cumulativeBid += level.price * level.amount;
      return {
        price: level.price,
        cumulative: cumulativeBid,
      };
    });

    // Calculate cumulative depth for asks (ascending)
    let cumulativeAsk = 0;
    const asks = snapshot.asks.map((level) => {
      cumulativeAsk += level.price * level.amount;
      return {
        price: level.price,
        cumulative: cumulativeAsk,
      };
    });

    const spread = this.analyzeSpread(snapshot);

    return {
      exchangeId: snapshot.exchangeId,
      symbol: snapshot.symbol,
      timestamp: snapshot.timestamp,
      bids,
      asks,
      bestBid: snapshot.bestBid || snapshot.bids[0]?.price || 0,
      bestAsk: snapshot.bestAsk || snapshot.asks[0]?.price || 0,
      midPrice: spread.midPrice,
    };
  }

  /**
   * Generate DOM (Depth of Market) display data
   * Nelogica-style DOM visualization
   */
  static generateDOMDisplayData(snapshot: OrderBookSnapshot, levels: number = 20): DOMDisplayData {
    const spread = this.analyzeSpread(snapshot);
    const midPrice = spread.midPrice;

    // Get levels around mid price
    const bidLevels = snapshot.bids.slice(0, levels);
    const askLevels = snapshot.asks.slice(0, levels);

    // Calculate max volume for intensity normalization
    const maxBidVolume = Math.max(...bidLevels.map((l) => l.amount), 0);
    const maxAskVolume = Math.max(...askLevels.map((l) => l.amount), 0);
    const maxVolume = Math.max(maxBidVolume, maxAskVolume);

    // Create price range (from best ask to best bid)
    const minPrice = Math.min(bidLevels[bidLevels.length - 1]?.price || 0, askLevels[0]?.price || 0);
    const maxPrice = Math.max(bidLevels[0]?.price || 0, askLevels[askLevels.length - 1]?.price || 0);

    // Generate levels
    const domLevels: DOMLevelData[] = [];

    // Create a map for quick lookup
    const bidMap = new Map(bidLevels.map((l) => [l.price, l]));
    const askMap = new Map(askLevels.map((l) => [l.price, l]));

    // Generate all price levels
    const allPrices = new Set([
      ...bidLevels.map((l) => l.price),
      ...askLevels.map((l) => l.price),
    ]);

    let cumulativeBid = 0;
    let cumulativeAsk = 0;

    Array.from(allPrices)
      .sort((a, b) => b - a) // Descending
      .forEach((price) => {
        const bidLevel = bidMap.get(price);
        const askLevel = askMap.get(price);

        const bidSize = bidLevel?.amount || 0;
        const askSize = askLevel?.amount || 0;

        if (bidSize > 0) cumulativeBid += bidSize;
        if (askSize > 0) cumulativeAsk += askSize;

        const bidIntensity = maxVolume > 0 ? (bidSize / maxVolume) * 100 : 0;
        const askIntensity = maxVolume > 0 ? (askSize / maxVolume) * 100 : 0;

        const imbalance =
          bidSize + askSize > 0 ? (bidSize - askSize) / (bidSize + askSize) : 0;

        domLevels.push({
          price,
          bidSize: bidSize > 0 ? bidSize : undefined,
          bidOrders: bidLevel ? 1 : undefined, // Simplified - CCXT doesn't provide order count
          bidIntensity: bidSize > 0 ? bidIntensity : undefined,
          askSize: askSize > 0 ? askSize : undefined,
          askOrders: askLevel ? 1 : undefined,
          askIntensity: askSize > 0 ? askIntensity : undefined,
          cumulativeBidSize: cumulativeBid > 0 ? cumulativeBid : undefined,
          cumulativeAskSize: cumulativeAsk > 0 ? cumulativeAsk : undefined,
          imbalance: bidSize > 0 || askSize > 0 ? imbalance : undefined,
        });
      });

    const totalBidVolume = bidLevels.reduce((sum, l) => sum + l.amount, 0);
    const totalAskVolume = askLevels.reduce((sum, l) => sum + l.amount, 0);

    return {
      exchangeId: snapshot.exchangeId,
      symbol: snapshot.symbol,
      timestamp: snapshot.timestamp,
      levels: domLevels,
      totalBidVolume,
      totalAskVolume,
      totalBidOrders: bidLevels.length, // Simplified
      totalAskOrders: askLevels.length, // Simplified
      midPrice,
      spread: spread.absolute,
      spreadPercent: spread.percent,
    };
  }

  /**
   * Calculate order book statistics over time period
   */
  static async calculateStatistics(
    exchangeId: string,
    symbol: string,
    startTime: Date,
    endTime: Date
  ): Promise<{
    count: number;
    avgSpread: number;
    minSpread: number;
    maxSpread: number;
    avgDepth: number;
    minDepth: number;
    maxDepth: number;
    avgImbalance: number;
    avgLiquidityScore: number;
    liquidityRegimeDistribution: {
      abundant: number;
      normal: number;
      scarce: number;
      crisis: number;
    };
  }> {
    try {
      // Get snapshot statistics
      const [snapshotStats] = await db
        .select({
          count: sql<number>`COUNT(*)::int`,
          avgSpread: sql<number>`AVG(${orderBookSnapshots.spread})::float`,
          minSpread: sql<number>`MIN(${orderBookSnapshots.spread})::float`,
          maxSpread: sql<number>`MAX(${orderBookSnapshots.spread})::float`,
          avgDepth: sql<number>`AVG(${orderBookSnapshots.totalDepth})::float`,
          minDepth: sql<number>`MIN(${orderBookSnapshots.totalDepth})::float`,
          maxDepth: sql<number>`MAX(${orderBookSnapshots.totalDepth})::float`,
          avgImbalance: sql<number>`AVG(
            (${orderBookSnapshots.bidDepth10} - ${orderBookSnapshots.askDepth10}) /
            NULLIF(${orderBookSnapshots.bidDepth10} + ${orderBookSnapshots.askDepth10}, 0)
          )::float`,
        })
        .from(orderBookSnapshots)
        .where(
          and(
            eq(orderBookSnapshots.exchangeId, exchangeId),
            eq(orderBookSnapshots.symbol, symbol),
            gte(orderBookSnapshots.timestamp, startTime),
            lte(orderBookSnapshots.timestamp, endTime)
          )
        );

      // Get liquidity score statistics
      const [liquidityStats] = await db
        .select({
          avgScore: sql<number>`AVG(${liquidityScores.score})::float`,
        })
        .from(liquidityScores)
        .where(
          and(
            eq(liquidityScores.exchangeId, exchangeId),
            eq(liquidityScores.symbol, symbol),
            gte(liquidityScores.timestamp, startTime),
            lte(liquidityScores.timestamp, endTime)
          )
        );

      // Get regime distribution
      const regimeDistribution = await db
        .select({
          regime: liquidityScores.regime,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(liquidityScores)
        .where(
          and(
            eq(liquidityScores.exchangeId, exchangeId),
            eq(liquidityScores.symbol, symbol),
            gte(liquidityScores.timestamp, startTime),
            lte(liquidityScores.timestamp, endTime)
          )
        )
        .groupBy(liquidityScores.regime);

      const regimeMap = {
        abundant: 0,
        normal: 0,
        scarce: 0,
        crisis: 0,
      };

      regimeDistribution.forEach((r) => {
        if (r.regime && r.regime in regimeMap) {
          regimeMap[r.regime as keyof typeof regimeMap] = r.count;
        }
      });

      return {
        count: snapshotStats?.count || 0,
        avgSpread: snapshotStats?.avgSpread || 0,
        minSpread: snapshotStats?.minSpread || 0,
        maxSpread: snapshotStats?.maxSpread || 0,
        avgDepth: snapshotStats?.avgDepth || 0,
        minDepth: snapshotStats?.minDepth || 0,
        maxDepth: snapshotStats?.maxDepth || 0,
        avgImbalance: snapshotStats?.avgImbalance || 0,
        avgLiquidityScore: liquidityStats?.avgScore || 0,
        liquidityRegimeDistribution: regimeMap,
      };
    } catch (error) {
      logger.error('Failed to calculate order book statistics', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Detect price gaps (liquidity gaps) in order book
   */
  static detectLiquidityGaps(
    snapshot: OrderBookSnapshot,
    thresholdPercent: number = 0.5
  ): {
    bidGaps: { startPrice: number; endPrice: number; gapPercent: number }[];
    askGaps: { startPrice: number; endPrice: number; gapPercent: number }[];
  } {
    const detectGaps = (levels: OrderBookLevel[]) => {
      const gaps: { startPrice: number; endPrice: number; gapPercent: number }[] = [];

      for (let i = 0; i < levels.length - 1; i++) {
        const currentPrice = levels[i].price;
        const nextPrice = levels[i + 1].price;
        const gap = Math.abs(currentPrice - nextPrice);
        const gapPercent = (gap / currentPrice) * 100;

        if (gapPercent > thresholdPercent) {
          gaps.push({
            startPrice: currentPrice,
            endPrice: nextPrice,
            gapPercent,
          });
        }
      }

      return gaps;
    };

    return {
      bidGaps: detectGaps(snapshot.bids),
      askGaps: detectGaps(snapshot.asks),
    };
  }

  /**
   * Calculate depth (total USD value) at given levels
   */
  private static calculateDepth(levels: OrderBookLevel[]): number {
    return levels.reduce((sum, level) => sum + level.price * level.amount, 0);
  }

  /**
   * Analyze and store complete analytics (convenience method)
   */
  static async analyzeAndStore(
    exchangeId: string,
    symbol: string
  ): Promise<{
    snapshot: OrderBookSnapshot;
    depth: ReturnType<typeof OrderBookAnalyticsService.analyzeDepth>;
    spread: ReturnType<typeof OrderBookAnalyticsService.analyzeSpread>;
    volumeDistribution: ReturnType<typeof OrderBookAnalyticsService.analyzeVolumeDistribution>;
    liquidityScore: LiquidityScore;
  }> {
    // Fetch latest snapshot
    const snapshot = await OrderBookSnapshotService.getLatestSnapshot(exchangeId, symbol);

    if (!snapshot) {
      throw new BadRequestError('No order book snapshot found');
    }

    // Analyze
    const depth = this.analyzeDepth(snapshot);
    const spread = this.analyzeSpread(snapshot);
    const volumeDistribution = this.analyzeVolumeDistribution(snapshot);
    const liquidityScore = this.calculateLiquidityScore(snapshot);

    // Store liquidity score
    await this.storeLiquidityScore(liquidityScore);

    logger.info('Analyzed and stored order book analytics', {
      exchangeId,
      symbol,
      liquidityScore: liquidityScore.score.toFixed(2),
      regime: liquidityScore.regime,
    });

    return {
      snapshot,
      depth,
      spread,
      volumeDistribution,
      liquidityScore,
    };
  }
}
