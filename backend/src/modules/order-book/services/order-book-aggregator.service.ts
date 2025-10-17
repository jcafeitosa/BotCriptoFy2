/**
 * Order Book Aggregator Service
 * Multi-exchange order book aggregation and smart order routing
 *
 * Features:
 * - Multi-exchange order book merging
 * - Smart order routing (SOR)
 * - Best execution price discovery
 * - Cross-exchange arbitrage detection
 * - Liquidity aggregation
 * - Exchange quality scoring
 * - Routing optimization
 *
 * Benefits:
 * - Deeper liquidity pool
 * - Better execution prices
 * - Reduced slippage
 * - Arbitrage opportunities
 * - Risk diversification
 */

import { db } from '@/db';
import { eq, and, inArray } from 'drizzle-orm';
import { orderBookSnapshots } from '../schema/order-book.schema';
import { OrderBookSnapshotService } from './order-book-snapshot.service';
import { OrderBookAnalyticsService } from './order-book-analytics.service';
import { PriceImpactService } from './price-impact.service';
import logger from '@/utils/logger';
import { BadRequestError } from '@/utils/errors';
import type { OrderBookSnapshot, OrderBookLevel } from '../types/order-book.types';

/**
 * Aggregated Order Book
 */
export interface AggregatedOrderBook {
  symbol: string;
  timestamp: Date;

  // Aggregated levels
  bids: Array<OrderBookLevel & { exchanges: string[] }>;
  asks: Array<OrderBookLevel & { exchanges: string[] }>;

  // Best prices across all exchanges
  bestBid: number;
  bestAsk: number;
  bestBidExchange: string;
  bestAskExchange: string;

  // Aggregated metrics
  totalBidDepth: number;
  totalAskDepth: number;
  avgSpread: number;
  tightestSpread: number;

  // Exchange coverage
  exchanges: string[];
  exchangeCount: number;
}

/**
 * Smart Order Routing Plan
 */
export interface SmartOrderRoutingPlan {
  symbol: string;
  timestamp: Date;

  // Order details
  side: 'buy' | 'sell';
  targetSize: number;
  targetSizeUSD: number;

  // Routing plan
  routes: Array<{
    exchange: string;
    size: number;
    sizeUSD: number;
    price: number;
    percentage: number; // % of total order
    estimatedFee: number;
  }>;

  // Execution summary
  averagePrice: number;
  totalFees: number;
  estimatedSlippage: number;
  estimatedImpact: number;

  // Comparison
  bestSingleExchange: string;
  bestSinglePrice: number;
  improvementVsSingle: number; // % better price
  savingsUSD: number;
}

/**
 * Cross-Exchange Arbitrage Opportunity
 */
export interface ArbitrageOpportunity {
  symbol: string;
  timestamp: Date;

  // Buy side
  buyExchange: string;
  buyPrice: number;
  buySize: number;

  // Sell side
  sellExchange: string;
  sellPrice: number;
  sellSize: number;

  // Profit analysis
  profitPercent: number;
  profitUSD: number;
  maxSize: number; // Max tradeable size

  // Costs
  buyFee: number;
  sellFee: number;
  transferCost: number;
  netProfit: number;
  netProfitPercent: number;

  // Quality
  confidence: number; // 0-100
  executionRisk: 'low' | 'medium' | 'high';
}

/**
 * Exchange Quality Score
 */
export interface ExchangeQualityScore {
  exchangeId: string;
  symbol: string;
  timestamp: Date;

  // Quality metrics
  liquidityScore: number; // 0-100
  spreadScore: number; // 0-100 (tighter = better)
  depthScore: number; // 0-100
  stabilityScore: number; // 0-100

  // Overall score
  overallScore: number; // Weighted average
  qualityTier: 'tier1' | 'tier2' | 'tier3' | 'tier4';

  // Ranking
  rank: number; // Among all exchanges for this symbol
}

/**
 * Liquidity Distribution
 */
export interface LiquidityDistribution {
  symbol: string;
  timestamp: Date;

  // Per-exchange breakdown
  exchanges: Array<{
    exchangeId: string;
    bidLiquidity: number;
    askLiquidity: number;
    totalLiquidity: number;
    marketShare: number; // %
  }>;

  // Concentration metrics
  herfindahlIndex: number; // 0-10000 (lower = more distributed)
  top3Concentration: number; // % held by top 3 exchanges
  effectiveExchangeCount: number; // Accounting for concentration
}

export class OrderBookAggregatorService {
  /**
   * Aggregate order books from multiple exchanges
   */
  static async aggregateOrderBooks(
    exchangeIds: string[],
    symbol: string
  ): Promise<AggregatedOrderBook> {
    try {
      if (exchangeIds.length === 0) {
        throw new BadRequestError('At least one exchange required');
      }

      // Fetch order books from all exchanges in parallel
      const snapshots = await Promise.all(
        exchangeIds.map(async (exchangeId) => {
          try {
            return await OrderBookSnapshotService.getLatestSnapshot(exchangeId, symbol);
          } catch (error) {
            logger.warn('Failed to fetch order book', { exchangeId, symbol });
            return null;
          }
        })
      );

      // Filter out failed fetches
      const validSnapshots = snapshots.filter((s): s is OrderBookSnapshot => s !== null);

      if (validSnapshots.length === 0) {
        throw new BadRequestError('No order book data available from any exchange');
      }

      // Merge order books
      const allBids: Array<OrderBookLevel & { exchange: string }> = [];
      const allAsks: Array<OrderBookLevel & { exchange: string }> = [];

      validSnapshots.forEach((snapshot, index) => {
        const exchangeId = exchangeIds[index];

        snapshot.bids.forEach(bid => {
          allBids.push({ ...bid, exchange: exchangeId });
        });

        snapshot.asks.forEach(ask => {
          allAsks.push({ ...ask, exchange: exchangeId });
        });
      });

      // Sort bids (highest first) and asks (lowest first)
      allBids.sort((a, b) => b.price - a.price);
      allAsks.sort((a, b) => a.price - b.price);

      // Aggregate levels at same price
      const aggregatedBids = this.aggregateLevels(allBids);
      const aggregatedAsks = this.aggregateLevels(allAsks);

      // Find best prices
      const bestBid = allBids[0]?.price || 0;
      const bestAsk = allAsks[0]?.price || 0;
      const bestBidExchange = allBids[0]?.exchange || '';
      const bestAskExchange = allAsks[0]?.exchange || '';

      // Calculate metrics
      const totalBidDepth = allBids.reduce((sum, b) => sum + b.price * b.amount, 0);
      const totalAskDepth = allAsks.reduce((sum, a) => sum + a.price * a.amount, 0);

      const spreads = validSnapshots
        .map(s => typeof s.spread === 'string' ? parseFloat(s.spread || '0') : (s.spread || 0))
        .filter(s => s > 0);

      const avgSpread = spreads.length > 0
        ? spreads.reduce((sum, s) => sum + s, 0) / spreads.length
        : 0;

      const tightestSpread = spreads.length > 0
        ? Math.min(...spreads)
        : 0;

      const result: AggregatedOrderBook = {
        symbol,
        timestamp: new Date(),
        bids: aggregatedBids,
        asks: aggregatedAsks,
        bestBid,
        bestAsk,
        bestBidExchange,
        bestAskExchange,
        totalBidDepth,
        totalAskDepth,
        avgSpread,
        tightestSpread,
        exchanges: exchangeIds.filter((_, i) => validSnapshots[i] !== null),
        exchangeCount: validSnapshots.length,
      };

      logger.info('Aggregated order books', {
        symbol,
        exchanges: result.exchangeCount,
        bestBid,
        bestAsk,
      });

      return result;
    } catch (error) {
      logger.error('Failed to aggregate order books', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Aggregate levels at the same price
   */
  private static aggregateLevels(
    levels: Array<OrderBookLevel & { exchange: string }>
  ): Array<OrderBookLevel & { exchanges: string[] }> {
    const priceMap = new Map<number, { amount: number; exchanges: Set<string> }>();

    levels.forEach(level => {
      const existing = priceMap.get(level.price);

      if (existing) {
        existing.amount += level.amount;
        existing.exchanges.add(level.exchange);
      } else {
        priceMap.set(level.price, {
          amount: level.amount,
          exchanges: new Set([level.exchange]),
        });
      }
    });

    return Array.from(priceMap.entries())
      .map(([price, data]) => ({
        price,
        amount: data.amount,
        exchanges: Array.from(data.exchanges),
      }))
      .sort((a, b) => b.price - a.price);
  }

  /**
   * Calculate smart order routing plan
   */
  static async calculateSmartRouting(
    exchangeIds: string[],
    symbol: string,
    side: 'buy' | 'sell',
    targetSize: number,
    feeRates?: Map<string, number> // Exchange ID -> fee rate (0.001 = 0.1%)
  ): Promise<SmartOrderRoutingPlan> {
    try {
      // Get aggregated order book
      const aggregated = await this.aggregateOrderBooks(exchangeIds, symbol);

      // Select appropriate side
      const levels = side === 'buy' ? aggregated.asks : aggregated.bids;

      // Default fee rate: 0.1%
      const defaultFeeRate = 0.001;
      const getFeeRate = (exchange: string) =>
        feeRates?.get(exchange) || defaultFeeRate;

      // Walk through aggregated book to fill order
      let remainingSize = targetSize;
      const routes: SmartOrderRoutingPlan['routes'] = [];

      for (const level of levels) {
        if (remainingSize <= 0) break;

        const fillSize = Math.min(remainingSize, level.amount);
        const sizeUSD = level.price * fillSize;

        // Distribute across exchanges at this price level
        const exchangeShare = fillSize / level.exchanges.length;

        level.exchanges.forEach(exchange => {
          const fee = sizeUSD * getFeeRate(exchange) / level.exchanges.length;

          routes.push({
            exchange,
            size: exchangeShare,
            sizeUSD: sizeUSD / level.exchanges.length,
            price: level.price,
            percentage: (exchangeShare / targetSize) * 100,
            estimatedFee: fee,
          });
        });

        remainingSize -= fillSize;
      }

      if (remainingSize > 0) {
        logger.warn('Insufficient aggregated liquidity', {
          symbol,
          requested: targetSize,
          available: targetSize - remainingSize,
        });
      }

      // Calculate summary metrics
      const totalCost = routes.reduce((sum, r) => sum + r.sizeUSD, 0);
      const totalFees = routes.reduce((sum, r) => sum + r.estimatedFee, 0);
      const averagePrice = totalCost / targetSize;

      // Compare to best single exchange
      const bestSingleExchange = side === 'buy'
        ? aggregated.bestAskExchange
        : aggregated.bestBidExchange;

      const bestSinglePrice = side === 'buy'
        ? aggregated.bestAsk
        : aggregated.bestBid;

      // Estimate single exchange execution
      let singleExchangeCost = 0;
      try {
        const singleImpact = await PriceImpactService.estimatePriceImpact(
          bestSingleExchange,
          symbol,
          side,
          targetSize
        );
        singleExchangeCost = singleImpact.orderSizeUSD;
      } catch (error) {
        singleExchangeCost = bestSinglePrice * targetSize;
      }

      const savingsUSD = Math.abs(singleExchangeCost - totalCost);
      const improvementVsSingle = (savingsUSD / singleExchangeCost) * 100;

      const result: SmartOrderRoutingPlan = {
        symbol,
        timestamp: new Date(),
        side,
        targetSize,
        targetSizeUSD: totalCost,
        routes,
        averagePrice,
        totalFees,
        estimatedSlippage: Math.abs(averagePrice - bestSinglePrice),
        estimatedImpact: ((averagePrice - bestSinglePrice) / bestSinglePrice) * 100,
        bestSingleExchange,
        bestSinglePrice,
        improvementVsSingle,
        savingsUSD,
      };

      logger.info('Calculated smart routing plan', {
        symbol,
        routes: routes.length,
        savingsUSD: savingsUSD.toFixed(2),
        improvement: improvementVsSingle.toFixed(2),
      });

      return result;
    } catch (error) {
      logger.error('Failed to calculate smart routing', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Detect arbitrage opportunities across exchanges
   */
  static async detectArbitrage(
    exchangeIds: string[],
    symbol: string,
    minProfitPercent: number = 0.5
  ): Promise<ArbitrageOpportunity[]> {
    try {
      if (exchangeIds.length < 2) {
        throw new BadRequestError('At least 2 exchanges required for arbitrage');
      }

      // Fetch all order books
      const snapshots = await Promise.all(
        exchangeIds.map(async (exchangeId) => {
          try {
            const snapshot = await OrderBookSnapshotService.getLatestSnapshot(exchangeId, symbol);
            return { exchangeId, snapshot };
          } catch (error) {
            return null;
          }
        })
      );

      const validSnapshots = snapshots.filter(
        (s): s is { exchangeId: string; snapshot: OrderBookSnapshot } => s !== null
      );

      if (validSnapshots.length < 2) {
        throw new BadRequestError('Need at least 2 exchanges with data');
      }

      const opportunities: ArbitrageOpportunity[] = [];

      // Compare all exchange pairs
      for (let i = 0; i < validSnapshots.length; i++) {
        for (let j = i + 1; j < validSnapshots.length; j++) {
          const exchange1 = validSnapshots[i];
          const exchange2 = validSnapshots[j];

          // Check both directions
          const opp1 = this.checkArbitragePair(
            exchange1.exchangeId,
            exchange1.snapshot,
            exchange2.exchangeId,
            exchange2.snapshot,
            symbol,
            minProfitPercent
          );

          const opp2 = this.checkArbitragePair(
            exchange2.exchangeId,
            exchange2.snapshot,
            exchange1.exchangeId,
            exchange1.snapshot,
            symbol,
            minProfitPercent
          );

          if (opp1) opportunities.push(opp1);
          if (opp2) opportunities.push(opp2);
        }
      }

      // Sort by net profit percent
      opportunities.sort((a, b) => b.netProfitPercent - a.netProfitPercent);

      logger.info('Detected arbitrage opportunities', {
        symbol,
        opportunities: opportunities.length,
      });

      return opportunities;
    } catch (error) {
      logger.error('Failed to detect arbitrage', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Check arbitrage between two exchanges
   */
  private static checkArbitragePair(
    buyExchangeId: string,
    buySnapshot: OrderBookSnapshot,
    sellExchangeId: string,
    sellSnapshot: OrderBookSnapshot,
    symbol: string,
    minProfitPercent: number
  ): ArbitrageOpportunity | null {
    const buyPrice = typeof buySnapshot.bestAsk === 'string'
      ? parseFloat(buySnapshot.bestAsk || '0')
      : (buySnapshot.bestAsk || 0);
    const sellPrice = typeof sellSnapshot.bestBid === 'string'
      ? parseFloat(sellSnapshot.bestBid || '0')
      : (sellSnapshot.bestBid || 0);

    if (buyPrice === 0 || sellPrice === 0) return null;

    // Profit opportunity if sell > buy
    const profitPercent = ((sellPrice - buyPrice) / buyPrice) * 100;

    if (profitPercent < minProfitPercent) return null;

    // Max tradeable size (limited by both sides)
    const buySize = buySnapshot.asks[0]?.amount || 0;
    const sellSize = sellSnapshot.bids[0]?.amount || 0;
    const maxSize = Math.min(buySize, sellSize);

    // Estimate fees (0.1% typical)
    const buyFee = buyPrice * maxSize * 0.001;
    const sellFee = sellPrice * maxSize * 0.001;
    const transferCost = 0; // Would depend on blockchain/network

    const profitUSD = (sellPrice - buyPrice) * maxSize;
    const netProfit = profitUSD - buyFee - sellFee - transferCost;
    const netProfitPercent = (netProfit / (buyPrice * maxSize)) * 100;

    // Confidence based on spread tightness and size
    const spreadBuy = typeof buySnapshot.spreadPercent === 'string'
      ? parseFloat(buySnapshot.spreadPercent || '0')
      : (buySnapshot.spreadPercent || 0);
    const spreadSell = typeof sellSnapshot.spreadPercent === 'string'
      ? parseFloat(sellSnapshot.spreadPercent || '0')
      : (sellSnapshot.spreadPercent || 0);
    const avgSpread = (spreadBuy + spreadSell) / 2;

    const confidence = Math.min(100,
      (profitPercent / minProfitPercent) * 40 +
      Math.max(0, 100 - avgSpread * 100) * 30 +
      (maxSize > 1 ? 30 : maxSize * 30)
    );

    // Execution risk
    let executionRisk: 'low' | 'medium' | 'high';
    if (confidence > 70 && maxSize > 1) executionRisk = 'low';
    else if (confidence > 50 && maxSize > 0.1) executionRisk = 'medium';
    else executionRisk = 'high';

    return {
      symbol,
      timestamp: new Date(),
      buyExchange: buyExchangeId,
      buyPrice,
      buySize: maxSize,
      sellExchange: sellExchangeId,
      sellPrice,
      sellSize: maxSize,
      profitPercent,
      profitUSD,
      maxSize,
      buyFee,
      sellFee,
      transferCost,
      netProfit,
      netProfitPercent,
      confidence,
      executionRisk,
    };
  }

  /**
   * Score exchange quality for a symbol
   */
  static async scoreExchangeQuality(
    exchangeIds: string[],
    symbol: string
  ): Promise<ExchangeQualityScore[]> {
    try {
      const scores: ExchangeQualityScore[] = [];

      // Fetch snapshots and analytics for all exchanges
      const results = await Promise.all(
        exchangeIds.map(async (exchangeId) => {
          try {
            const snapshot = await OrderBookSnapshotService.getLatestSnapshot(exchangeId, symbol);
            if (!snapshot) return null;

            const analytics = OrderBookAnalyticsService.generateDOMDisplayData(snapshot);

            return { exchangeId, snapshot, analytics };
          } catch (error) {
            return null;
          }
        })
      );

      const validResults = results.filter((r): r is NonNullable<typeof r> => r !== null);

      if (validResults.length === 0) {
        throw new BadRequestError('No exchange data available');
      }

      // Calculate scores for each exchange
      validResults.forEach(({ exchangeId, snapshot, analytics }) => {
        // Liquidity score (based on depth)
        const bidDepth50 = typeof snapshot.bidDepth50 === 'string'
          ? parseFloat(snapshot.bidDepth50 || '0')
          : (snapshot.bidDepth50 || 0);
        const askDepth50 = typeof snapshot.askDepth50 === 'string'
          ? parseFloat(snapshot.askDepth50 || '0')
          : (snapshot.askDepth50 || 0);
        const totalDepth = bidDepth50 + askDepth50;
        const liquidityScore = Math.min(100, (totalDepth / 1000000) * 100);

        // Spread score (tighter = better)
        const spreadPercent = typeof snapshot.spreadPercent === 'string'
          ? parseFloat(snapshot.spreadPercent || '1')
          : (snapshot.spreadPercent || 1);
        const spreadScore = Math.max(0, 100 - spreadPercent * 1000);

        // Depth score (how many levels)
        const depthScore = Math.min(100,
          ((snapshot.bids.length + snapshot.asks.length) / 100) * 100
        );

        // Stability score (inverse of volatility)
        const stabilityScore = 75; // Would require historical data

        // Overall score (weighted)
        const overallScore =
          liquidityScore * 0.4 +
          spreadScore * 0.3 +
          depthScore * 0.2 +
          stabilityScore * 0.1;

        // Quality tier
        let qualityTier: 'tier1' | 'tier2' | 'tier3' | 'tier4';
        if (overallScore >= 80) qualityTier = 'tier1';
        else if (overallScore >= 60) qualityTier = 'tier2';
        else if (overallScore >= 40) qualityTier = 'tier3';
        else qualityTier = 'tier4';

        scores.push({
          exchangeId,
          symbol,
          timestamp: snapshot.timestamp,
          liquidityScore,
          spreadScore,
          depthScore,
          stabilityScore,
          overallScore,
          qualityTier,
          rank: 0, // Will be set after sorting
        });
      });

      // Rank exchanges
      scores.sort((a, b) => b.overallScore - a.overallScore);
      scores.forEach((score, index) => {
        score.rank = index + 1;
      });

      logger.info('Scored exchange quality', {
        symbol,
        exchanges: scores.length,
      });

      return scores;
    } catch (error) {
      logger.error('Failed to score exchange quality', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Analyze liquidity distribution across exchanges
   */
  static async analyzeLiquidityDistribution(
    exchangeIds: string[],
    symbol: string
  ): Promise<LiquidityDistribution> {
    try {
      const snapshots = await Promise.all(
        exchangeIds.map(async (exchangeId) => {
          try {
            const snapshot = await OrderBookSnapshotService.getLatestSnapshot(exchangeId, symbol);
            return { exchangeId, snapshot };
          } catch (error) {
            return null;
          }
        })
      );

      const validSnapshots = snapshots.filter(
        (s): s is { exchangeId: string; snapshot: OrderBookSnapshot } => s !== null
      );

      if (validSnapshots.length === 0) {
        throw new BadRequestError('No exchange data available');
      }

      // Calculate liquidity per exchange
      const exchanges = validSnapshots.map(({ exchangeId, snapshot }) => {
        const bidLiquidity = snapshot.bids.reduce((sum, b) => sum + b.price * b.amount, 0);
        const askLiquidity = snapshot.asks.reduce((sum, a) => sum + a.price * a.amount, 0);
        const totalLiquidity = bidLiquidity + askLiquidity;

        return {
          exchangeId,
          bidLiquidity,
          askLiquidity,
          totalLiquidity,
          marketShare: 0, // Will calculate after total
        };
      });

      // Calculate market shares
      const totalMarketLiquidity = exchanges.reduce((sum, e) => sum + e.totalLiquidity, 0);

      exchanges.forEach(exchange => {
        exchange.marketShare = totalMarketLiquidity > 0
          ? (exchange.totalLiquidity / totalMarketLiquidity) * 100
          : 0;
      });

      // Sort by liquidity
      exchanges.sort((a, b) => b.totalLiquidity - a.totalLiquidity);

      // Calculate concentration metrics
      // Herfindahl-Hirschman Index (HHI)
      const herfindahlIndex = exchanges.reduce((sum, e) => {
        return sum + Math.pow(e.marketShare, 2);
      }, 0);

      // Top 3 concentration
      const top3Concentration = exchanges
        .slice(0, 3)
        .reduce((sum, e) => sum + e.marketShare, 0);

      // Effective number of exchanges
      const effectiveExchangeCount = herfindahlIndex > 0
        ? 10000 / herfindahlIndex
        : exchanges.length;

      const result: LiquidityDistribution = {
        symbol,
        timestamp: new Date(),
        exchanges,
        herfindahlIndex,
        top3Concentration,
        effectiveExchangeCount,
      };

      logger.info('Analyzed liquidity distribution', {
        symbol,
        exchanges: exchanges.length,
        herfindahlIndex: herfindahlIndex.toFixed(2),
      });

      return result;
    } catch (error) {
      logger.error('Failed to analyze liquidity distribution', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get best execution venue for order
   */
  static async getBestExecutionVenue(
    exchangeIds: string[],
    symbol: string,
    side: 'buy' | 'sell',
    orderSize: number
  ): Promise<{
    bestExchange: string;
    reason: string;
    estimatedImpact: number;
    alternatives: Array<{ exchange: string; impact: number }>;
  }> {
    try {
      // Score all exchanges for this order
      const impacts = await Promise.all(
        exchangeIds.map(async (exchangeId) => {
          try {
            const impact = await PriceImpactService.estimatePriceImpact(
              exchangeId,
              symbol,
              side,
              orderSize
            );

            return {
              exchange: exchangeId,
              impact: impact.impactPercent,
            };
          } catch (error) {
            return {
              exchange: exchangeId,
              impact: Infinity,
            };
          }
        })
      );

      // Filter out failed exchanges
      const validImpacts = impacts.filter(i => i.impact !== Infinity);

      if (validImpacts.length === 0) {
        throw new BadRequestError('No exchange can handle this order');
      }

      // Sort by impact (lowest first)
      validImpacts.sort((a, b) => a.impact - b.impact);

      const bestExchange = validImpacts[0].exchange;
      const estimatedImpact = validImpacts[0].impact;

      let reason = 'Lowest price impact';
      if (estimatedImpact < 0.1) {
        reason = 'Excellent liquidity, minimal impact';
      } else if (estimatedImpact < 0.5) {
        reason = 'Good liquidity, low impact';
      } else if (estimatedImpact < 1.0) {
        reason = 'Moderate impact, best available';
      } else {
        reason = 'High impact, consider splitting order';
      }

      return {
        bestExchange,
        reason,
        estimatedImpact,
        alternatives: validImpacts.slice(1, 4), // Top 3 alternatives
      };
    } catch (error) {
      logger.error('Failed to get best execution venue', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
