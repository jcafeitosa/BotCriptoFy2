/**
 * Price Impact Service
 * Advanced slippage estimation and liquidity cost analysis
 *
 * Features:
 * - Slippage estimation for market orders
 * - Price impact calculation (temporary + permanent)
 * - Optimal execution analysis (VWAP, TWAP)
 * - Liquidity cost modeling
 * - Trade splitting recommendations
 * - Market depth curves
 * - Execution quality metrics
 *
 * Models:
 * - Linear impact model
 * - Square-root impact model (Almgren-Chriss)
 * - Permanent vs temporary impact decomposition
 * - Cost of immediacy (spread + impact)
 */

import { db } from '@/db';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import {
  orderBookSnapshots,
  priceImpactEstimates,
} from '../schema/order-book.schema';
import { OrderBookSnapshotService } from './order-book-snapshot.service';
import { OrderBookAnalyticsService } from './order-book-analytics.service';
import logger from '@/utils/logger';
import { BadRequestError } from '@/utils/errors';
import type { OrderBookSnapshot, OrderBookLevel } from '../types/order-book.types';

/**
 * Price Impact Estimate
 */
export interface PriceImpactEstimate {
  exchangeId: string;
  symbol: string;
  timestamp: Date;

  // Order details
  side: 'buy' | 'sell';
  orderSize: number; // In base currency
  orderSizeUSD: number;

  // Price impact
  impactPercent: number; // Total price impact %
  impactBps: number; // Impact in basis points
  slippageUSD: number; // Dollar slippage

  // Execution prices
  bestPrice: number; // Best available price
  averagePrice: number; // VWAP execution price
  worstPrice: number; // Last fill price

  // Impact decomposition
  temporaryImpact: number; // Reverses after trade
  permanentImpact: number; // Persists in market
  spreadCost: number; // Cost of crossing spread

  // Liquidity analysis
  liquidityConsumed: number; // % of available liquidity
  levelsConsumed: number; // Number of price levels needed
  executionPath: Array<{ price: number; size: number; cumulative: number }>;
}

/**
 * Slippage Analysis
 */
export interface SlippageAnalysis {
  exchangeId: string;
  symbol: string;
  timestamp: Date;

  side: 'buy' | 'sell';
  orderSize: number;

  // Slippage scenarios
  bestCase: PriceImpactEstimate; // Current liquidity
  worstCase: PriceImpactEstimate; // Stressed liquidity (-50%)
  expected: PriceImpactEstimate; // Probabilistic estimate

  // Risk metrics
  slippageRisk: 'low' | 'medium' | 'high' | 'extreme';
  recommendedMaxSize: number;
  suggestedSplits: number; // Recommended order splits
}

/**
 * Optimal Execution Strategy
 */
export interface OptimalExecutionStrategy {
  exchangeId: string;
  symbol: string;
  timestamp: Date;

  // Target
  targetSize: number;
  targetSide: 'buy' | 'sell';

  // Strategy
  strategy: 'market' | 'vwap' | 'twap' | 'pov' | 'adaptive';
  splitCount: number;
  orderSizePerSplit: number;
  timeBetweenOrders: number; // seconds

  // Expected costs
  estimatedImpact: number; // %
  estimatedSlippage: number; // USD
  estimatedDuration: number; // seconds

  // Comparison
  marketOrderCost: number; // Immediate execution cost
  optimalCost: number; // Strategy cost
  savings: number; // USD saved vs market order
  savingsPercent: number; // % saved
}

/**
 * Market Depth Curve
 */
export interface MarketDepthCurve {
  exchangeId: string;
  symbol: string;
  timestamp: Date;

  side: 'buy' | 'sell';

  // Curve points (size -> price impact)
  curve: Array<{
    size: number;
    sizeUSD: number;
    impactPercent: number;
    averagePrice: number;
    marginalCost: number; // Cost of next unit
  }>;

  // Key metrics
  liquidityScore: number; // 0-100
  depthQuality: 'excellent' | 'good' | 'fair' | 'poor';
  elasticity: number; // How responsive price is to volume
}

/**
 * Execution Quality Metrics
 */
export interface ExecutionQualityMetrics {
  exchangeId: string;
  symbol: string;
  timestamp: Date;

  // Execution details
  executedPrice: number;
  executedSize: number;
  executionTime: Date;

  // Benchmarks
  arrivalPrice: number; // Price when order was placed
  vwapPrice: number; // VWAP during execution
  twapPrice: number; // TWAP during execution

  // Quality scores
  priceImprovement: number; // vs arrival price (%)
  implementationShortfall: number; // Total cost vs benchmark
  slippageCost: number; // Actual slippage
  opportunityCost: number; // Cost of not executing immediately

  // Rating
  executionQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export class PriceImpactService {
  /**
   * Estimate price impact for a market order
   */
  static async estimatePriceImpact(
    exchangeId: string,
    symbol: string,
    side: 'buy' | 'sell',
    orderSize: number
  ): Promise<PriceImpactEstimate> {
    try {
      const snapshot = await OrderBookSnapshotService.getLatestSnapshot(exchangeId, symbol);

      if (!snapshot) {
        throw new BadRequestError('No order book data available');
      }

      // Select appropriate side of book
      const levels = side === 'buy' ? snapshot.asks : snapshot.bids;
      const bestAsk = typeof snapshot.bestAsk === 'string'
        ? parseFloat(snapshot.bestAsk || '0')
        : (snapshot.bestAsk || 0);
      const bestBid = typeof snapshot.bestBid === 'string'
        ? parseFloat(snapshot.bestBid || '0')
        : (snapshot.bestBid || 0);
      const bestPrice = side === 'buy' ? bestAsk : bestBid;

      if (levels.length === 0 || bestPrice === 0) {
        throw new BadRequestError('Insufficient liquidity');
      }

      // Walk through order book to fill order
      let remainingSize = orderSize;
      let totalCost = 0;
      let levelsConsumed = 0;
      const executionPath: Array<{ price: number; size: number; cumulative: number }> = [];

      for (const level of levels) {
        if (remainingSize <= 0) break;

        const availableSize = level.amount;
        const fillSize = Math.min(remainingSize, availableSize);

        totalCost += level.price * fillSize;
        remainingSize -= fillSize;
        levelsConsumed++;

        executionPath.push({
          price: level.price,
          size: fillSize,
          cumulative: orderSize - remainingSize,
        });
      }

      if (remainingSize > 0) {
        throw new BadRequestError(
          `Insufficient liquidity. Can only fill ${orderSize - remainingSize} of ${orderSize}`
        );
      }

      // Calculate metrics
      const averagePrice = totalCost / orderSize;
      const worstPrice = executionPath[executionPath.length - 1].price;
      const orderSizeUSD = totalCost;

      // Impact calculation
      const impactPercent = Math.abs(((averagePrice - bestPrice) / bestPrice) * 100);
      const impactBps = impactPercent * 100;
      const slippageUSD = Math.abs(totalCost - (bestPrice * orderSize));

      // Impact decomposition (Almgren-Chriss model)
      const { temporaryImpact, permanentImpact } = this.decomposeImpact(
        impactPercent,
        orderSize,
        snapshot
      );

      // Spread cost
      const midPrice = snapshot.midPrice || ((snapshot.bestBid || 0) + (snapshot.bestAsk || 0)) / 2;
      const spreadCost = Math.abs(((bestPrice - midPrice) / midPrice) * 100);

      // Liquidity consumed
      const totalLiquidity = levels.reduce((sum, l) => sum + l.amount, 0);
      const liquidityConsumed = (orderSize / totalLiquidity) * 100;

      const result: PriceImpactEstimate = {
        exchangeId,
        symbol,
        timestamp: snapshot.timestamp,
        side,
        orderSize,
        orderSizeUSD,
        impactPercent,
        impactBps,
        slippageUSD,
        bestPrice,
        averagePrice,
        worstPrice,
        temporaryImpact,
        permanentImpact,
        spreadCost,
        liquidityConsumed,
        levelsConsumed,
        executionPath,
      };

      logger.debug('Estimated price impact', {
        exchangeId,
        symbol,
        side,
        orderSize,
        impactPercent: impactPercent.toFixed(3),
      });

      return result;
    } catch (error) {
      logger.error('Failed to estimate price impact', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Decompose impact into temporary and permanent components
   * Based on Almgren-Chriss model
   */
  private static decomposeImpact(
    totalImpact: number,
    orderSize: number,
    snapshot: OrderBookSnapshot
  ): { temporaryImpact: number; permanentImpact: number } {
    // Square-root law: impact ~ sqrt(orderSize / ADV)
    // Temporary impact: ~70% of total (reverses quickly)
    // Permanent impact: ~30% of total (market adjustment)

    const totalVolume = snapshot.bids.reduce((sum, b) => sum + b.amount, 0) +
                       snapshot.asks.reduce((sum, a) => sum + a.amount, 0);

    const volumeRatio = orderSize / totalVolume;

    // Larger orders have more permanent impact
    const permanentRatio = Math.min(0.5, 0.2 + volumeRatio * 0.5);
    const temporaryRatio = 1 - permanentRatio;

    return {
      temporaryImpact: totalImpact * temporaryRatio,
      permanentImpact: totalImpact * permanentRatio,
    };
  }

  /**
   * Analyze slippage scenarios
   */
  static async analyzeSlippage(
    exchangeId: string,
    symbol: string,
    side: 'buy' | 'sell',
    orderSize: number
  ): Promise<SlippageAnalysis> {
    try {
      // Best case: current liquidity
      const bestCase = await this.estimatePriceImpact(exchangeId, symbol, side, orderSize);

      // Expected case: 80% of current liquidity (typical)
      const expectedSize = orderSize * 0.8;
      const expected = await this.estimatePriceImpact(exchangeId, symbol, side, expectedSize);

      // Worst case: 50% of current liquidity (stressed)
      const worstCaseSize = orderSize * 0.5;
      let worstCase: PriceImpactEstimate;
      try {
        worstCase = await this.estimatePriceImpact(exchangeId, symbol, side, worstCaseSize);
      } catch (error) {
        // If even 50% fails, use best case with doubled impact
        worstCase = {
          ...bestCase,
          impactPercent: bestCase.impactPercent * 2,
          impactBps: bestCase.impactBps * 2,
          slippageUSD: bestCase.slippageUSD * 2,
        };
      }

      // Risk assessment
      let slippageRisk: 'low' | 'medium' | 'high' | 'extreme';
      if (bestCase.impactPercent < 0.1) slippageRisk = 'low';
      else if (bestCase.impactPercent < 0.5) slippageRisk = 'medium';
      else if (bestCase.impactPercent < 1.0) slippageRisk = 'high';
      else slippageRisk = 'extreme';

      // Recommended max size (impact < 0.5%)
      const recommendedMaxSize = orderSize * (0.5 / Math.max(0.1, bestCase.impactPercent));

      // Suggested splits (to keep impact < 0.25% per order)
      const suggestedSplits = Math.ceil(bestCase.impactPercent / 0.25);

      const result: SlippageAnalysis = {
        exchangeId,
        symbol,
        timestamp: bestCase.timestamp,
        side,
        orderSize,
        bestCase,
        worstCase,
        expected,
        slippageRisk,
        recommendedMaxSize,
        suggestedSplits: Math.max(1, suggestedSplits),
      };

      logger.info('Analyzed slippage scenarios', {
        exchangeId,
        symbol,
        slippageRisk,
        suggestedSplits,
      });

      return result;
    } catch (error) {
      logger.error('Failed to analyze slippage', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Calculate optimal execution strategy
   */
  static async calculateOptimalExecution(
    exchangeId: string,
    symbol: string,
    side: 'buy' | 'sell',
    targetSize: number,
    maxImpactPercent: number = 0.25
  ): Promise<OptimalExecutionStrategy> {
    try {
      // Get market order cost (baseline)
      const marketOrder = await this.estimatePriceImpact(exchangeId, symbol, side, targetSize);

      // Calculate optimal split size
      const splitCount = Math.ceil(marketOrder.impactPercent / maxImpactPercent);
      const orderSizePerSplit = targetSize / splitCount;

      // Estimate cost per split
      const splitImpact = await this.estimatePriceImpact(
        exchangeId,
        symbol,
        side,
        orderSizePerSplit
      );

      // Time between orders (to allow market to absorb)
      // Rule of thumb: wait for ~10% of daily volume to trade
      const timeBetweenOrders = Math.max(30, splitCount * 10); // seconds

      // Total execution time
      const estimatedDuration = timeBetweenOrders * (splitCount - 1);

      // Optimal strategy cost
      const optimalCost = splitImpact.slippageUSD * splitCount;

      // Savings vs market order
      const savings = marketOrder.slippageUSD - optimalCost;
      const savingsPercent = (savings / marketOrder.slippageUSD) * 100;

      // Determine strategy type
      let strategy: 'market' | 'vwap' | 'twap' | 'pov' | 'adaptive';
      if (splitCount === 1) {
        strategy = 'market'; // Small order, execute immediately
      } else if (splitCount <= 5) {
        strategy = 'twap'; // Time-weighted
      } else if (marketOrder.liquidityConsumed > 20) {
        strategy = 'adaptive'; // Large order, needs smart execution
      } else {
        strategy = 'vwap'; // Volume-weighted
      }

      const result: OptimalExecutionStrategy = {
        exchangeId,
        symbol,
        timestamp: marketOrder.timestamp,
        targetSize,
        targetSide: side,
        strategy,
        splitCount,
        orderSizePerSplit,
        timeBetweenOrders,
        estimatedImpact: splitImpact.impactPercent,
        estimatedSlippage: optimalCost,
        estimatedDuration,
        marketOrderCost: marketOrder.slippageUSD,
        optimalCost,
        savings: Math.max(0, savings),
        savingsPercent: Math.max(0, savingsPercent),
      };

      logger.info('Calculated optimal execution strategy', {
        exchangeId,
        symbol,
        strategy,
        splitCount,
        savings: savings.toFixed(2),
      });

      return result;
    } catch (error) {
      logger.error('Failed to calculate optimal execution', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Generate market depth curve
   */
  static async generateDepthCurve(
    exchangeId: string,
    symbol: string,
    side: 'buy' | 'sell',
    maxSizeMultiplier: number = 10
  ): Promise<MarketDepthCurve> {
    try {
      const snapshot = await OrderBookSnapshotService.getLatestSnapshot(exchangeId, symbol);

      if (!snapshot) {
        throw new BadRequestError('No order book data available');
      }

      const levels = side === 'buy' ? snapshot.asks : snapshot.bids;
      const totalLiquidity = levels.reduce((sum, l) => sum + l.amount, 0);

      // Calculate average order size
      const avgOrderSize = totalLiquidity / levels.length;
      const maxSize = avgOrderSize * maxSizeMultiplier;

      // Generate curve points
      const curve: MarketDepthCurve['curve'] = [];
      const steps = 20;

      for (let i = 1; i <= steps; i++) {
        const size = (maxSize / steps) * i;

        try {
          const impact = await this.estimatePriceImpact(exchangeId, symbol, side, size);

          curve.push({
            size,
            sizeUSD: impact.orderSizeUSD,
            impactPercent: impact.impactPercent,
            averagePrice: impact.averagePrice,
            marginalCost: i > 1
              ? impact.impactPercent - curve[i - 2].impactPercent
              : impact.impactPercent,
          });
        } catch (error) {
          // Stop if we hit liquidity limit
          break;
        }
      }

      // Calculate metrics
      const liquidityScore = Math.min(100, (totalLiquidity / avgOrderSize) * 10);

      let depthQuality: 'excellent' | 'good' | 'fair' | 'poor';
      if (liquidityScore >= 80) depthQuality = 'excellent';
      else if (liquidityScore >= 60) depthQuality = 'good';
      else if (liquidityScore >= 40) depthQuality = 'fair';
      else depthQuality = 'poor';

      // Elasticity: how much impact changes per unit size
      const elasticity = curve.length > 1
        ? (curve[curve.length - 1].impactPercent - curve[0].impactPercent) /
          (curve[curve.length - 1].size - curve[0].size)
        : 0;

      const result: MarketDepthCurve = {
        exchangeId,
        symbol,
        timestamp: snapshot.timestamp,
        side,
        curve,
        liquidityScore,
        depthQuality,
        elasticity,
      };

      logger.debug('Generated market depth curve', {
        exchangeId,
        symbol,
        points: curve.length,
        depthQuality,
      });

      return result;
    } catch (error) {
      logger.error('Failed to generate depth curve', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Measure execution quality
   */
  static async measureExecutionQuality(
    exchangeId: string,
    symbol: string,
    executedPrice: number,
    executedSize: number,
    executionTime: Date,
    arrivalTime: Date
  ): Promise<ExecutionQualityMetrics> {
    try {
      // Get snapshot at arrival time
      const arrivalSnapshots = await db
        .select()
        .from(orderBookSnapshots)
        .where(
          and(
            eq(orderBookSnapshots.exchangeId, exchangeId),
            eq(orderBookSnapshots.symbol, symbol),
            gte(orderBookSnapshots.timestamp, arrivalTime)
          )
        )
        .orderBy(orderBookSnapshots.timestamp)
        .limit(1);

      if (arrivalSnapshots.length === 0) {
        throw new BadRequestError('No data at arrival time');
      }

      const arrivalSnapshot = arrivalSnapshots[0];
      const arrivalPrice = parseFloat(arrivalSnapshot.midPrice || '0');

      // Get snapshots during execution window
      const executionSnapshots = await db
        .select()
        .from(orderBookSnapshots)
        .where(
          and(
            eq(orderBookSnapshots.exchangeId, exchangeId),
            eq(orderBookSnapshots.symbol, symbol),
            gte(orderBookSnapshots.timestamp, arrivalTime),
            lte(orderBookSnapshots.timestamp, executionTime)
          )
        )
        .orderBy(orderBookSnapshots.timestamp);

      // Calculate VWAP and TWAP
      let vwapNumerator = 0;
      let vwapDenominator = 0;
      let twapSum = 0;

      executionSnapshots.forEach(snapshot => {
        const price = parseFloat(snapshot.midPrice || '0');
        const volume = parseFloat(snapshot.bidDepth10 || '0') +
                      parseFloat(snapshot.askDepth10 || '0');

        vwapNumerator += price * volume;
        vwapDenominator += volume;
        twapSum += price;
      });

      const vwapPrice = vwapDenominator > 0
        ? vwapNumerator / vwapDenominator
        : arrivalPrice;

      const twapPrice = executionSnapshots.length > 0
        ? twapSum / executionSnapshots.length
        : arrivalPrice;

      // Calculate metrics
      const priceImprovement = ((executedPrice - arrivalPrice) / arrivalPrice) * 100;

      // Implementation shortfall: total cost vs arrival price
      const implementationShortfall = Math.abs(
        (executedPrice - arrivalPrice) * executedSize
      );

      // Slippage cost
      const slippageCost = Math.abs(executedPrice - vwapPrice) * executedSize;

      // Opportunity cost (if we had executed at arrival)
      const opportunityCost = Math.abs(executedPrice - arrivalPrice) * executedSize;

      // Quality rating
      let executionQuality: 'excellent' | 'good' | 'fair' | 'poor';
      const impactPct = Math.abs(priceImprovement);

      if (impactPct < 0.1) executionQuality = 'excellent';
      else if (impactPct < 0.3) executionQuality = 'good';
      else if (impactPct < 0.6) executionQuality = 'fair';
      else executionQuality = 'poor';

      const result: ExecutionQualityMetrics = {
        exchangeId,
        symbol,
        timestamp: executionTime,
        executedPrice,
        executedSize,
        executionTime,
        arrivalPrice,
        vwapPrice,
        twapPrice,
        priceImprovement,
        implementationShortfall,
        slippageCost,
        opportunityCost,
        executionQuality,
      };

      logger.info('Measured execution quality', {
        exchangeId,
        symbol,
        executionQuality,
        priceImprovement: priceImprovement.toFixed(3),
      });

      return result;
    } catch (error) {
      logger.error('Failed to measure execution quality', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Store price impact estimate in database
   * Calculates impact for all standard order size tiers
   */
  static async storePriceImpactEstimate(
    estimate: PriceImpactEstimate
  ): Promise<void> {
    try {
      // Calculate impacts for all size tiers
      const sizeTiers = [1000, 5000, 10000, 50000, 100000, 500000, 1000000]; // USD
      const impacts: Record<string, string> = {};
      const slippages: Record<string, string> = {};

      // Get order book snapshot for calculations
      const snapshot = await OrderBookSnapshotService.getLatestSnapshot(
        estimate.exchangeId,
        estimate.symbol
      );

      if (!snapshot) {
        throw new BadRequestError('No order book data available');
      }

      // Calculate impact for each tier
      for (const sizeUSD of sizeTiers) {
        try {
          // Convert USD to base currency (approximate using current price)
          const baseSize = sizeUSD / estimate.bestPrice;

          const tierEstimate = await this.estimatePriceImpact(
            estimate.exchangeId,
            estimate.symbol,
            estimate.side,
            baseSize
          );

          // Map to schema field names
          const tierKey = sizeUSD >= 1000000 ? '1m' : `${sizeUSD / 1000}k`;
          impacts[`size${tierKey}`] = tierEstimate.impactPercent.toFixed(4);

          // Store slippage for 1k, 10k, 100k tiers
          if ([1000, 10000, 100000].includes(sizeUSD)) {
            slippages[`slippage${tierKey}`] = tierEstimate.slippageUSD.toFixed(8);
          }
        } catch (error) {
          // If tier size exceeds liquidity, use null
          const tierKey = sizeUSD >= 1000000 ? '1m' : `${sizeUSD / 1000}k`;
          impacts[`size${tierKey}`] = '0';
          if ([1000, 10000, 100000].includes(sizeUSD)) {
            slippages[`slippage${tierKey}`] = '0';
          }
        }
      }

      // Store in database
      await db.insert(priceImpactEstimates).values({
        exchangeId: estimate.exchangeId,
        symbol: estimate.symbol,
        calculatedAt: estimate.timestamp,
        size1k: impacts.size1k || '0',
        size5k: impacts.size5k || '0',
        size10k: impacts.size10k || '0',
        size50k: impacts.size50k || '0',
        size100k: impacts.size100k || '0',
        size500k: impacts.size500k || '0',
        size1m: impacts.size1m || '0',
        slippage1k: slippages.slippage1k || '0',
        slippage10k: slippages.slippage10k || '0',
        slippage100k: slippages.slippage100k || '0',
        liquidityScore: estimate.liquidityConsumed.toFixed(4),
      });

      logger.info('Stored price impact estimate', {
        exchangeId: estimate.exchangeId,
        symbol: estimate.symbol,
        tiers: Object.keys(impacts).length,
      });
    } catch (error) {
      logger.error('Failed to store price impact estimate', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get historical impact estimates
   */
  static async getHistoricalImpact(
    exchangeId: string,
    symbol: string,
    orderSize: number,
    lookbackHours: number = 24
  ): Promise<Array<typeof priceImpactEstimates.$inferSelect>> {
    try {
      const startTime = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

      const estimates = await db
        .select()
        .from(priceImpactEstimates)
        .where(
          and(
            eq(priceImpactEstimates.exchangeId, exchangeId),
            eq(priceImpactEstimates.symbol, symbol),
            gte(priceImpactEstimates.calculatedAt, startTime)
          )
        )
        .orderBy(desc(priceImpactEstimates.calculatedAt));

      logger.debug('Retrieved historical impact estimates', {
        exchangeId,
        symbol,
        count: estimates.length,
      });

      return estimates;
    } catch (error) {
      logger.error('Failed to get historical impact', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Calculate average impact for size
   */
  static async calculateAverageImpact(
    exchangeId: string,
    symbol: string,
    orderSize: number,
    lookbackHours: number = 24
  ): Promise<{
    avgImpactPercent: number;
    avgSlippageUSD: number;
    sampleSize: number;
    confidence: number;
  }> {
    try {
      const historical = await this.getHistoricalImpact(
        exchangeId,
        symbol,
        orderSize,
        lookbackHours
      );

      if (historical.length === 0) {
        throw new BadRequestError('No historical data available');
      }

      // Select appropriate size tier based on order size (in USD)
      // Tiers: 1k, 5k, 10k, 50k, 100k, 500k, 1m
      const selectTierField = (sizeUSD: number): {
        impactField: keyof typeof historical[0];
        slippageField: keyof typeof historical[0];
      } => {
        if (sizeUSD >= 1000000) return { impactField: 'size1m' as any, slippageField: 'slippage100k' as any };
        if (sizeUSD >= 500000) return { impactField: 'size500k' as any, slippageField: 'slippage100k' as any };
        if (sizeUSD >= 100000) return { impactField: 'size100k' as any, slippageField: 'slippage100k' as any };
        if (sizeUSD >= 50000) return { impactField: 'size50k' as any, slippageField: 'slippage10k' as any };
        if (sizeUSD >= 10000) return { impactField: 'size10k' as any, slippageField: 'slippage10k' as any };
        if (sizeUSD >= 5000) return { impactField: 'size5k' as any, slippageField: 'slippage1k' as any };
        return { impactField: 'size1k' as any, slippageField: 'slippage1k' as any };
      };

      // Get average price from historical data to estimate USD value
      const avgPrice = historical.length > 0
        ? parseFloat(historical[0].size10k ?? '0') > 0
          ? parseFloat(historical[0].size10k ?? '0')
          : 1
        : 1;

      const estimatedSizeUSD = orderSize * avgPrice;
      const { impactField, slippageField } = selectTierField(estimatedSizeUSD);

      const impacts = historical.map(h => parseFloat((h[impactField] as string) ?? '0'));
      const slippages = historical.map(h => parseFloat((h[slippageField] as string) ?? '0'));

      const avgImpactPercent = impacts.reduce((sum, val) => sum + val, 0) / impacts.length;
      const avgSlippageUSD = slippages.reduce((sum, val) => sum + val, 0) / slippages.length;

      // Confidence based on sample size
      const confidence = Math.min(100, (historical.length / 100) * 100);

      return {
        avgImpactPercent,
        avgSlippageUSD,
        sampleSize: historical.length,
        confidence,
      };
    } catch (error) {
      logger.error('Failed to calculate average impact', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
