/**
 * Market Microstructure Service
 * Advanced market microstructure analysis and metrics
 *
 * Implements:
 * - VPIN (Volume-Synchronized Probability of Informed Trading)
 * - Order Flow Toxicity
 * - Market Noise Ratio
 * - Bid-Ask Bounce
 * - Price Discovery Efficiency
 * - Informed Trading Detection
 * - Kyle's Lambda (Price Impact Coefficient)
 * - Adverse Selection Risk
 *
 * References:
 * - Easley, D., López de Prado, M., & O'Hara, M. (2012). "Flow Toxicity and Liquidity in a High-frequency World"
 * - Kyle, A. S. (1985). "Continuous Auctions and Insider Trading"
 */

import { db } from '@/db';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import {
  orderBookSnapshots,
  orderFlowToxicity,
  microstructureMetrics
} from '../schema/order-book.schema';
import { OrderBookSnapshotService } from './order-book-snapshot.service';
import logger from '@/utils/logger';
import { BadRequestError } from '@/utils/errors';
import type { OrderBookSnapshot, OrderBookLevel } from '../types/order-book.types';

/**
 * VPIN (Volume-Synchronized Probability of Informed Trading)
 * Measures the probability of informed trading based on order flow imbalance
 */
export interface VPINMetrics {
  exchangeId: string;
  symbol: string;
  timestamp: Date;

  // VPIN calculation
  vpin: number; // 0-100, higher = more informed trading
  volumeBucketSize: number; // Volume per bucket
  numberOfBuckets: number; // Lookback window in buckets

  // Volume classification
  buyVolume: number; // Estimated buy volume
  sellVolume: number; // Estimated sell volume
  totalVolume: number;

  // Toxicity indicators
  toxicityLevel: 'low' | 'medium' | 'high' | 'extreme';
  informedTradingProbability: number; // 0-1

  // Confidence
  confidence: number; // Based on sample size and consistency
}

/**
 * Order Flow Toxicity Metrics
 */
export interface OrderFlowToxicityMetrics {
  exchangeId: string;
  symbol: string;
  timestamp: Date;

  // Toxicity score (0-100)
  toxicityScore: number;
  toxicityLevel: 'low' | 'medium' | 'high' | 'extreme';

  // Components
  adverseSelectionCost: number; // Cost of being picked off
  priceReversal: number; // Tendency for prices to reverse
  informedTradingRatio: number; // Ratio of informed to uninformed

  // Market quality
  effectiveSpread: number;
  realizedSpread: number;
  priceImpact: number;

  // Risk indicators
  adverseSelectionRisk: 'low' | 'medium' | 'high';
  marketMakerRisk: number; // Risk score for market makers
}

/**
 * Market Noise Metrics
 */
export interface MarketNoiseMetrics {
  exchangeId: string;
  symbol: string;
  timestamp: Date;

  // Noise ratio (0-1, higher = more noise)
  noiseRatio: number;
  signalToNoise: number;

  // Price efficiency
  efficiencyRatio: number; // How efficiently price discovers information
  autocorrelation: number; // Price autocorrelation

  // Microstructure noise
  bidAskBounce: number; // Variance from bid-ask bounce
  tickNoise: number; // Noise from minimum tick size

  // Quality assessment
  priceQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

/**
 * Kyle's Lambda (Price Impact Coefficient)
 */
export interface KyleLambda {
  exchangeId: string;
  symbol: string;
  timestamp: Date;

  // Lambda coefficient
  lambda: number; // Price impact per unit of volume

  // Interpretation
  marketDepth: 'deep' | 'moderate' | 'shallow';
  liquidityLevel: number; // Inverse of lambda

  // Components
  priceChange: number;
  volumeTraded: number;

  // Confidence
  rSquared: number; // Goodness of fit
  sampleSize: number;
}

/**
 * Comprehensive Microstructure Metrics
 */
export interface MicrostructureMetricsComplete {
  exchangeId: string;
  symbol: string;
  timestamp: Date;

  // All metric sets
  vpin: VPINMetrics;
  toxicity: OrderFlowToxicityMetrics;
  noise: MarketNoiseMetrics;
  kyle: KyleLambda;

  // Overall assessment
  overallQuality: 'excellent' | 'good' | 'fair' | 'poor';
  tradingRecommendation: 'favorable' | 'neutral' | 'caution' | 'avoid';
}

export class MicrostructureService {
  /**
   * Calculate VPIN (Volume-Synchronized Probability of Informed Trading)
   */
  static async calculateVPIN(
    exchangeId: string,
    symbol: string,
    volumeBucketSize: number = 1000000, // $1M per bucket
    numberOfBuckets: number = 50
  ): Promise<VPINMetrics> {
    try {
      // Get recent snapshots
      const snapshots = await db
        .select()
        .from(orderBookSnapshots)
        .where(
          and(
            eq(orderBookSnapshots.exchangeId, exchangeId),
            eq(orderBookSnapshots.symbol, symbol)
          )
        )
        .orderBy(desc(orderBookSnapshots.timestamp))
        .limit(numberOfBuckets * 10); // Get enough data

      if (snapshots.length < numberOfBuckets) {
        throw new BadRequestError('Insufficient data for VPIN calculation');
      }

      // Create volume buckets
      const buckets: Array<{ buyVolume: number; sellVolume: number }> = [];
      let currentBucket = { buyVolume: 0, sellVolume: 0 };
      let currentVolume = 0;

      for (let i = 0; i < snapshots.length - 1; i++) {
        const current = snapshots[i];
        const previous = snapshots[i + 1];

        // Calculate volume traded and classify as buy/sell
        const { buyVolume, sellVolume } = this.classifyVolume(current, previous);

        currentBucket.buyVolume += buyVolume;
        currentBucket.sellVolume += sellVolume;
        currentVolume += buyVolume + sellVolume;

        // If bucket is full, start new bucket
        if (currentVolume >= volumeBucketSize) {
          buckets.push({ ...currentBucket });
          currentBucket = { buyVolume: 0, sellVolume: 0 };
          currentVolume = 0;

          if (buckets.length >= numberOfBuckets) break;
        }
      }

      if (buckets.length < numberOfBuckets) {
        throw new BadRequestError('Could not create enough volume buckets');
      }

      // Calculate VPIN
      let totalImbalance = 0;
      let totalVolume = 0;

      buckets.forEach(bucket => {
        const imbalance = Math.abs(bucket.buyVolume - bucket.sellVolume);
        const volume = bucket.buyVolume + bucket.sellVolume;

        totalImbalance += imbalance;
        totalVolume += volume;
      });

      const vpin = (totalImbalance / totalVolume) * 100;

      // Determine toxicity level
      let toxicityLevel: 'low' | 'medium' | 'high' | 'extreme';
      if (vpin < 30) toxicityLevel = 'low';
      else if (vpin < 50) toxicityLevel = 'medium';
      else if (vpin < 70) toxicityLevel = 'high';
      else toxicityLevel = 'extreme';

      // Calculate total buy/sell volume
      const totalBuyVolume = buckets.reduce((sum, b) => sum + b.buyVolume, 0);
      const totalSellVolume = buckets.reduce((sum, b) => sum + b.sellVolume, 0);

      // Confidence based on consistency
      const vpinVariance = this.calculateVPINVariance(buckets);
      const confidence = Math.max(0, 100 - vpinVariance * 100);

      const result: VPINMetrics = {
        exchangeId,
        symbol,
        timestamp: snapshots[0].timestamp,
        vpin,
        volumeBucketSize,
        numberOfBuckets,
        buyVolume: totalBuyVolume,
        sellVolume: totalSellVolume,
        totalVolume: totalBuyVolume + totalSellVolume,
        toxicityLevel,
        informedTradingProbability: vpin / 100,
        confidence,
      };

      logger.debug('Calculated VPIN', {
        exchangeId,
        symbol,
        vpin: vpin.toFixed(2),
        toxicityLevel,
      });

      return result;
    } catch (error) {
      logger.error('Failed to calculate VPIN', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Classify volume as buy or sell using trade classification algorithm
   */
  private static classifyVolume(
    current: typeof orderBookSnapshots.$inferSelect,
    previous: typeof orderBookSnapshots.$inferSelect
  ): { buyVolume: number; sellVolume: number } {
    const currentBids = current.bids as any as OrderBookLevel[];
    const currentAsks = current.asks as any as OrderBookLevel[];
    const previousBids = previous.bids as any as OrderBookLevel[];
    const previousAsks = previous.asks as any as OrderBookLevel[];

    // Calculate mid-price change
    const currentMid = (parseFloat(current.bestBid || '0') + parseFloat(current.bestAsk || '0')) / 2;
    const previousMid = (parseFloat(previous.bestBid || '0') + parseFloat(previous.bestAsk || '0')) / 2;

    // Calculate volume changes
    const bidVolumeChange = this.calculateVolumeChange(currentBids, previousBids);
    const askVolumeChange = this.calculateVolumeChange(currentAsks, previousAsks);

    // Tick rule: if price moved up, it's a buy; if down, it's a sell
    let buyVolume = 0;
    let sellVolume = 0;

    if (currentMid > previousMid) {
      // Price increased = aggressive buy
      buyVolume = Math.abs(askVolumeChange);
    } else if (currentMid < previousMid) {
      // Price decreased = aggressive sell
      sellVolume = Math.abs(bidVolumeChange);
    } else {
      // No price change, use volume changes
      buyVolume = Math.max(0, -askVolumeChange);
      sellVolume = Math.max(0, -bidVolumeChange);
    }

    return { buyVolume, sellVolume };
  }

  /**
   * Calculate volume change between snapshots
   */
  private static calculateVolumeChange(
    current: OrderBookLevel[],
    previous: OrderBookLevel[]
  ): number {
    const currentVolume = current.reduce((sum, level) => sum + level.price * level.amount, 0);
    const previousVolume = previous.reduce((sum, level) => sum + level.price * level.amount, 0);
    return currentVolume - previousVolume;
  }

  /**
   * Calculate VPIN variance for confidence scoring
   */
  private static calculateVPINVariance(
    buckets: Array<{ buyVolume: number; sellVolume: number }>
  ): number {
    const imbalances = buckets.map(bucket => {
      const total = bucket.buyVolume + bucket.sellVolume;
      return total > 0 ? Math.abs(bucket.buyVolume - bucket.sellVolume) / total : 0;
    });

    const mean = imbalances.reduce((sum, val) => sum + val, 0) / imbalances.length;
    const variance = imbalances.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / imbalances.length;

    return Math.sqrt(variance); // Standard deviation
  }

  /**
   * Calculate Order Flow Toxicity
   */
  static async calculateOrderFlowToxicity(
    exchangeId: string,
    symbol: string,
    lookbackMinutes: number = 60
  ): Promise<OrderFlowToxicityMetrics> {
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
        throw new BadRequestError('Insufficient data for toxicity calculation');
      }

      // Calculate effective spread
      const effectiveSpreads = snapshots.map(s => parseFloat(s.spread || '0'));
      const effectiveSpread = effectiveSpreads.reduce((sum, val) => sum + val, 0) / effectiveSpreads.length;

      // Calculate price reversals
      let reversals = 0;
      for (let i = 1; i < snapshots.length - 1; i++) {
        const prev = parseFloat(snapshots[i - 1].midPrice || '0');
        const curr = parseFloat(snapshots[i].midPrice || '0');
        const next = parseFloat(snapshots[i + 1].midPrice || '0');

        if ((curr > prev && curr > next) || (curr < prev && curr < next)) {
          reversals++;
        }
      }
      const priceReversal = (reversals / (snapshots.length - 2)) * 100;

      // Calculate realized spread (using 5-minute delay)
      const realizedSpread = this.calculateRealizedSpread(snapshots);

      // Adverse selection cost = Effective Spread - Realized Spread
      const adverseSelectionCost = Math.max(0, effectiveSpread - realizedSpread);

      // Price impact
      const priceImpact = this.calculateAveragePriceImpact(snapshots);

      // Informed trading ratio (higher adverse selection = more informed trading)
      const informedTradingRatio = effectiveSpread > 0
        ? adverseSelectionCost / effectiveSpread
        : 0;

      // Calculate toxicity score (0-100)
      const toxicityScore = Math.min(100,
        (adverseSelectionCost / effectiveSpread) * 40 + // 40% weight
        (priceReversal / 100) * 30 +                    // 30% weight
        (priceImpact) * 30                              // 30% weight
      );

      // Toxicity level
      let toxicityLevel: 'low' | 'medium' | 'high' | 'extreme';
      if (toxicityScore < 25) toxicityLevel = 'low';
      else if (toxicityScore < 50) toxicityLevel = 'medium';
      else if (toxicityScore < 75) toxicityLevel = 'high';
      else toxicityLevel = 'extreme';

      // Adverse selection risk
      let adverseSelectionRisk: 'low' | 'medium' | 'high';
      if (informedTradingRatio < 0.3) adverseSelectionRisk = 'low';
      else if (informedTradingRatio < 0.6) adverseSelectionRisk = 'medium';
      else adverseSelectionRisk = 'high';

      // Market maker risk score
      const marketMakerRisk = toxicityScore * (1 + informedTradingRatio);

      const result: OrderFlowToxicityMetrics = {
        exchangeId,
        symbol,
        timestamp: snapshots[snapshots.length - 1].timestamp,
        toxicityScore,
        toxicityLevel,
        adverseSelectionCost,
        priceReversal,
        informedTradingRatio,
        effectiveSpread,
        realizedSpread,
        priceImpact,
        adverseSelectionRisk,
        marketMakerRisk,
      };

      logger.debug('Calculated order flow toxicity', {
        exchangeId,
        symbol,
        toxicityScore: toxicityScore.toFixed(2),
        toxicityLevel,
      });

      return result;
    } catch (error) {
      logger.error('Failed to calculate order flow toxicity', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Calculate realized spread
   */
  private static calculateRealizedSpread(
    snapshots: Array<typeof orderBookSnapshots.$inferSelect>
  ): number {
    if (snapshots.length < 2) return 0;

    const delays = Math.min(5, snapshots.length - 1);
    let totalRealizedSpread = 0;
    let count = 0;

    for (let i = 0; i < snapshots.length - delays; i++) {
      const current = parseFloat(snapshots[i].midPrice || '0');
      const future = parseFloat(snapshots[i + delays].midPrice || '0');

      totalRealizedSpread += Math.abs(future - current);
      count++;
    }

    return count > 0 ? totalRealizedSpread / count : 0;
  }

  /**
   * Calculate average price impact from order book changes
   */
  private static calculateAveragePriceImpact(
    snapshots: Array<typeof orderBookSnapshots.$inferSelect>
  ): number {
    if (snapshots.length < 2) return 0;

    let totalImpact = 0;
    let count = 0;

    for (let i = 1; i < snapshots.length; i++) {
      const currentPrice = parseFloat(snapshots[i].midPrice || '0');
      const previousPrice = parseFloat(snapshots[i - 1].midPrice || '0');

      if (previousPrice > 0) {
        const impact = Math.abs((currentPrice - previousPrice) / previousPrice) * 100;
        totalImpact += impact;
        count++;
      }
    }

    return count > 0 ? totalImpact / count : 0;
  }

  /**
   * Calculate Market Noise Metrics
   */
  static async calculateMarketNoise(
    exchangeId: string,
    symbol: string,
    lookbackMinutes: number = 60
  ): Promise<MarketNoiseMetrics> {
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
        throw new BadRequestError('Insufficient data for noise calculation');
      }

      // Extract mid prices
      const midPrices = snapshots.map(s => parseFloat(s.midPrice || '0'));

      // Calculate price changes
      const priceChanges = [];
      for (let i = 1; i < midPrices.length; i++) {
        priceChanges.push(midPrices[i] - midPrices[i - 1]);
      }

      // Calculate autocorrelation (lag-1)
      const autocorrelation = this.calculateAutocorrelation(priceChanges, 1);

      // Bid-ask bounce variance
      const bidAskBounce = this.calculateBidAskBounce(snapshots);

      // Efficiency ratio (directional movement / total movement)
      const efficiencyRatio = this.calculateEfficiencyRatio(midPrices);

      // Noise ratio (inverse of efficiency)
      const noiseRatio = 1 - efficiencyRatio;

      // Signal to noise ratio
      const signalToNoise = efficiencyRatio > 0 ? (1 / noiseRatio) : 0;

      // Tick noise (variance due to minimum tick size)
      const tickNoise = this.calculateTickNoise(midPrices);

      // Quality assessment
      let priceQuality: 'excellent' | 'good' | 'fair' | 'poor';
      if (efficiencyRatio > 0.8) priceQuality = 'excellent';
      else if (efficiencyRatio > 0.6) priceQuality = 'good';
      else if (efficiencyRatio > 0.4) priceQuality = 'fair';
      else priceQuality = 'poor';

      const result: MarketNoiseMetrics = {
        exchangeId,
        symbol,
        timestamp: snapshots[snapshots.length - 1].timestamp,
        noiseRatio,
        signalToNoise,
        efficiencyRatio,
        autocorrelation,
        bidAskBounce,
        tickNoise,
        priceQuality,
      };

      logger.debug('Calculated market noise', {
        exchangeId,
        symbol,
        noiseRatio: noiseRatio.toFixed(3),
        priceQuality,
      });

      return result;
    } catch (error) {
      logger.error('Failed to calculate market noise', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Calculate autocorrelation
   */
  private static calculateAutocorrelation(data: number[], lag: number): number {
    if (data.length < lag + 1) return 0;

    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;

    let numerator = 0;
    let denominator = 0;

    for (let i = lag; i < data.length; i++) {
      numerator += (data[i] - mean) * (data[i - lag] - mean);
    }

    for (let i = 0; i < data.length; i++) {
      denominator += Math.pow(data[i] - mean, 2);
    }

    return denominator !== 0 ? numerator / denominator : 0;
  }

  /**
   * Calculate bid-ask bounce variance
   */
  private static calculateBidAskBounce(
    snapshots: Array<typeof orderBookSnapshots.$inferSelect>
  ): number {
    const spreads = snapshots.map(s => parseFloat(s.spread || '0'));

    if (spreads.length === 0) return 0;

    const mean = spreads.reduce((sum, val) => sum + val, 0) / spreads.length;
    const variance = spreads.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / spreads.length;

    return Math.sqrt(variance);
  }

  /**
   * Calculate efficiency ratio (Kaufman's)
   */
  private static calculateEfficiencyRatio(prices: number[]): number {
    if (prices.length < 2) return 0;

    // Direction: net price change
    const direction = Math.abs(prices[prices.length - 1] - prices[0]);

    // Volatility: sum of absolute price changes
    let volatility = 0;
    for (let i = 1; i < prices.length; i++) {
      volatility += Math.abs(prices[i] - prices[i - 1]);
    }

    return volatility !== 0 ? direction / volatility : 0;
  }

  /**
   * Calculate tick noise
   */
  private static calculateTickNoise(prices: number[]): number {
    if (prices.length < 2) return 0;

    // Estimate minimum tick size
    const priceChanges = [];
    for (let i = 1; i < prices.length; i++) {
      const change = Math.abs(prices[i] - prices[i - 1]);
      if (change > 0) {
        priceChanges.push(change);
      }
    }

    if (priceChanges.length === 0) return 0;

    // Minimum non-zero change is likely the tick size
    const tickSize = Math.min(...priceChanges);

    // Tick noise is the ratio of tick size to average price
    const avgPrice = prices.reduce((sum, val) => sum + val, 0) / prices.length;

    return avgPrice > 0 ? (tickSize / avgPrice) * 100 : 0;
  }

  /**
   * Calculate Kyle's Lambda (Price Impact Coefficient)
   */
  static async calculateKyleLambda(
    exchangeId: string,
    symbol: string,
    lookbackMinutes: number = 60
  ): Promise<KyleLambda> {
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
        throw new BadRequestError('Insufficient data for Kyle Lambda calculation');
      }

      // Regression: price_change = lambda * volume + error
      const dataPoints: Array<{ priceChange: number; volume: number }> = [];

      for (let i = 1; i < snapshots.length; i++) {
        const currentPrice = parseFloat(snapshots[i].midPrice || '0');
        const previousPrice = parseFloat(snapshots[i - 1].midPrice || '0');

        const priceChange = Math.abs(currentPrice - previousPrice);

        const currentBids = snapshots[i].bids as any as OrderBookLevel[];
        const currentAsks = snapshots[i].asks as any as OrderBookLevel[];
        const previousBids = snapshots[i - 1].bids as any as OrderBookLevel[];
        const previousAsks = snapshots[i - 1].asks as any as OrderBookLevel[];

        const volumeChange = Math.abs(
          this.calculateVolumeChange(currentBids, previousBids) +
          this.calculateVolumeChange(currentAsks, previousAsks)
        );

        if (volumeChange > 0 && priceChange > 0) {
          dataPoints.push({ priceChange, volume: volumeChange });
        }
      }

      if (dataPoints.length < 5) {
        throw new BadRequestError('Insufficient variation for Kyle Lambda');
      }

      // Simple linear regression
      const n = dataPoints.length;
      const sumX = dataPoints.reduce((sum, p) => sum + p.volume, 0);
      const sumY = dataPoints.reduce((sum, p) => sum + p.priceChange, 0);
      const sumXY = dataPoints.reduce((sum, p) => sum + p.volume * p.priceChange, 0);
      const sumX2 = dataPoints.reduce((sum, p) => sum + p.volume * p.volume, 0);
      const sumY2 = dataPoints.reduce((sum, p) => sum + p.priceChange * p.priceChange, 0);

      // Lambda = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX^2)
      const lambda = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

      // R-squared for confidence
      const meanY = sumY / n;
      const ssTotal = sumY2 - n * meanY * meanY;
      const ssResidual = dataPoints.reduce((sum, p) => {
        const predicted = lambda * p.volume;
        return sum + Math.pow(p.priceChange - predicted, 2);
      }, 0);
      const rSquared = 1 - (ssResidual / ssTotal);

      // Interpretation
      let marketDepth: 'deep' | 'moderate' | 'shallow';
      if (lambda < 0.00001) marketDepth = 'deep';
      else if (lambda < 0.0001) marketDepth = 'moderate';
      else marketDepth = 'shallow';

      const liquidityLevel = lambda > 0 ? 1 / lambda : Infinity;

      // Average price change and volume
      const avgPriceChange = sumY / n;
      const avgVolume = sumX / n;

      const result: KyleLambda = {
        exchangeId,
        symbol,
        timestamp: snapshots[snapshots.length - 1].timestamp,
        lambda,
        marketDepth,
        liquidityLevel,
        priceChange: avgPriceChange,
        volumeTraded: avgVolume,
        rSquared: Math.max(0, Math.min(1, rSquared)),
        sampleSize: n,
      };

      logger.debug('Calculated Kyle Lambda', {
        exchangeId,
        symbol,
        lambda: lambda.toFixed(8),
        marketDepth,
      });

      return result;
    } catch (error) {
      logger.error('Failed to calculate Kyle Lambda', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Calculate comprehensive microstructure metrics
   */
  static async calculateComprehensiveMetrics(
    exchangeId: string,
    symbol: string,
    lookbackMinutes: number = 60
  ): Promise<MicrostructureMetricsComplete> {
    try {
      // Calculate all metrics in parallel
      const [vpin, toxicity, noise, kyle] = await Promise.all([
        this.calculateVPIN(exchangeId, symbol),
        this.calculateOrderFlowToxicity(exchangeId, symbol, lookbackMinutes),
        this.calculateMarketNoise(exchangeId, symbol, lookbackMinutes),
        this.calculateKyleLambda(exchangeId, symbol, lookbackMinutes),
      ]);

      // Overall quality assessment
      const qualityScore =
        (vpin.toxicityLevel === 'low' ? 25 : vpin.toxicityLevel === 'medium' ? 15 : vpin.toxicityLevel === 'high' ? 5 : 0) +
        (toxicity.toxicityLevel === 'low' ? 25 : toxicity.toxicityLevel === 'medium' ? 15 : toxicity.toxicityLevel === 'high' ? 5 : 0) +
        (noise.priceQuality === 'excellent' ? 25 : noise.priceQuality === 'good' ? 15 : noise.priceQuality === 'fair' ? 10 : 0) +
        (kyle.marketDepth === 'deep' ? 25 : kyle.marketDepth === 'moderate' ? 15 : 5);

      let overallQuality: 'excellent' | 'good' | 'fair' | 'poor';
      if (qualityScore >= 80) overallQuality = 'excellent';
      else if (qualityScore >= 60) overallQuality = 'good';
      else if (qualityScore >= 40) overallQuality = 'fair';
      else overallQuality = 'poor';

      // Trading recommendation
      let tradingRecommendation: 'favorable' | 'neutral' | 'caution' | 'avoid';
      if (vpin.vpin > 70 || toxicity.toxicityScore > 75) {
        tradingRecommendation = 'avoid';
      } else if (vpin.vpin > 50 || toxicity.toxicityScore > 50) {
        tradingRecommendation = 'caution';
      } else if (overallQuality === 'excellent' || overallQuality === 'good') {
        tradingRecommendation = 'favorable';
      } else {
        tradingRecommendation = 'neutral';
      }

      const result: MicrostructureMetricsComplete = {
        exchangeId,
        symbol,
        timestamp: new Date(),
        vpin,
        toxicity,
        noise,
        kyle,
        overallQuality,
        tradingRecommendation,
      };

      logger.info('Calculated comprehensive microstructure metrics', {
        exchangeId,
        symbol,
        overallQuality,
        tradingRecommendation,
      });

      return result;
    } catch (error) {
      logger.error('Failed to calculate comprehensive metrics', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Store toxicity metrics in database
   */
  static async storeToxicityMetrics(
    metrics: OrderFlowToxicityMetrics
  ): Promise<void> {
    try {
      // Map to schema fields
      await db.insert(orderFlowToxicity).values({
        exchangeId: metrics.exchangeId,
        symbol: metrics.symbol,
        timestamp: metrics.timestamp,
        vpin: metrics.toxicityScore.toString(), // Using toxicity score as VPIN
        volumeBuckets: 50, // Default value
        buyVolume: '0', // Would come from order flow analysis
        sellVolume: '0',
        orderImbalance: metrics.informedTradingRatio.toString(),
        toxicityLevel: metrics.toxicityScore > 0.7 ? 'high' : metrics.toxicityScore > 0.4 ? 'medium' : 'low',
      });

      logger.debug('Stored toxicity metrics', {
        exchangeId: metrics.exchangeId,
        symbol: metrics.symbol,
      });
    } catch (error) {
      logger.error('Failed to store toxicity metrics', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Store microstructure metrics in database
   */
  static async storeMicrostructureMetrics(
    metrics: MicrostructureMetricsComplete
  ): Promise<void> {
    try {
      // Map to schema fields
      await db.insert(microstructureMetrics).values({
        exchangeId: metrics.exchangeId,
        symbol: metrics.symbol,
        timestamp: metrics.timestamp,
        intervalMinutes: 1, // Default 1 minute interval
        totalOrders: 0, // Would come from order tracking
        totalCancels: 0,
        cancelRate: '0',
        averageSpread: '0',
        averageDepth: '0',
        depthVolatility: '0',
        priceVolatility: '0',
        returnVariance: '0',
        microstructureNoise: metrics.noise.bidAskBounce.toString(),
        effectiveSpread: metrics.toxicity.effectiveSpread.toString(),
        realizedSpread: metrics.toxicity.realizedSpread.toString(),
        averageQueuePosition: '0',
        queueJumps: 0,
      });

      logger.debug('Stored microstructure metrics', {
        exchangeId: metrics.exchangeId,
        symbol: metrics.symbol,
      });
    } catch (error) {
      logger.error('Failed to store microstructure metrics', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
