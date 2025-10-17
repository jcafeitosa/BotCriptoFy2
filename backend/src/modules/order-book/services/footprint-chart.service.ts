/**
 * Footprint Chart Service
 * Nelogica-style order flow and volume analysis
 *
 * Features:
 * - Order flow visualization (footprint charts)
 * - Volume at price analysis
 * - Buy/sell pressure tracking
 * - Delta analysis (buy - sell volume)
 * - Point of Control (POC) identification
 * - Imbalance detection at price levels
 * - Volume profile generation
 * - Absorption detection
 */

import { db } from '@/db';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { marketTrades } from '../../market-data/schema/market-data.schema';
import logger from '@/utils/logger';
import { BadRequestError } from '@/utils/errors';
import type {
  FootprintData,
  FootprintPriceLevel,
  VolumeProfileData,
  VolumeProfileLevel,
} from '../types/order-book.types';

export class FootprintChartService {
  /**
   * Generate footprint chart data from trades
   * Aggregates trades into OHLC bars with volume at each price level
   */
  static async generateFootprintData(
    exchangeId: string,
    symbol: string,
    startTime: Date,
    endTime: Date,
    timeframe: string = '5m'
  ): Promise<FootprintData[]> {
    try {
      // Convert timeframe to minutes
      const timeframeMinutes = this.parseTimeframe(timeframe);

      // Get trades for the period
      const trades = await db
        .select()
        .from(marketTrades)
        .where(
          and(
            eq(marketTrades.exchangeId, exchangeId),
            eq(marketTrades.symbol, symbol),
            gte(marketTrades.timestamp, startTime),
            lte(marketTrades.timestamp, endTime)
          )
        )
        .orderBy(marketTrades.timestamp);

      if (trades.length === 0) {
        throw new BadRequestError('No trade data found for the specified period');
      }

      // Group trades into timeframe buckets
      const buckets = new Map<number, typeof trades>();

      trades.forEach((trade) => {
        const bucketTime = this.getBucketTime(trade.timestamp, timeframeMinutes);
        if (!buckets.has(bucketTime)) {
          buckets.set(bucketTime, []);
        }
        buckets.get(bucketTime)!.push(trade);
      });

      // Generate footprint for each bucket
      const footprints: FootprintData[] = [];

      for (const [bucketTime, bucketTrades] of buckets.entries()) {
        const footprint = this.calculateFootprintForBucket(
          exchangeId,
          symbol,
          timeframe,
          new Date(bucketTime),
          bucketTrades
        );
        footprints.push(footprint);
      }

      logger.info('Generated footprint chart data', {
        exchangeId,
        symbol,
        timeframe,
        bars: footprints.length,
      });

      return footprints;
    } catch (error) {
      logger.error('Failed to generate footprint data', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Generate volume profile for period
   */
  static async generateVolumeProfile(
    exchangeId: string,
    symbol: string,
    startTime: Date,
    endTime: Date,
    priceStepPercent: number = 0.1 // Price level grouping (0.1% = 10 bps)
  ): Promise<VolumeProfileData> {
    try {
      // Get trades for the period
      const trades = await db
        .select()
        .from(marketTrades)
        .where(
          and(
            eq(marketTrades.exchangeId, exchangeId),
            eq(marketTrades.symbol, symbol),
            gte(marketTrades.timestamp, startTime),
            lte(marketTrades.timestamp, endTime)
          )
        );

      if (trades.length === 0) {
        throw new BadRequestError('No trade data found for the specified period');
      }

      // Find price range
      const prices = trades.map((t) => parseFloat(t.price));
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const priceRange = maxPrice - minPrice;

      // Create price levels
      const priceStep = (priceStepPercent / 100) * minPrice;
      const volumeByPrice = new Map<number, VolumeProfileLevel>();

      // Aggregate volume by price level
      trades.forEach((trade) => {
        const price = parseFloat(trade.price);
        const amount = parseFloat(trade.amount);
        const side = trade.side;

        // Round price to nearest step
        const priceLevel = Math.round(price / priceStep) * priceStep;

        let level = volumeByPrice.get(priceLevel);
        if (!level) {
          level = {
            price: priceLevel,
            volume: 0,
            volumePercent: 0,
            buyVolume: 0,
            sellVolume: 0,
            delta: 0,
          };
          volumeByPrice.set(priceLevel, level);
        }

        level.volume += amount;
        if (side === 'buy') {
          level.buyVolume += amount;
        } else {
          level.sellVolume += amount;
        }
        level.delta = level.buyVolume - level.sellVolume;
      });

      // Calculate percentages
      const totalVolume = Array.from(volumeByPrice.values()).reduce(
        (sum, level) => sum + level.volume,
        0
      );

      volumeByPrice.forEach((level) => {
        level.volumePercent = (level.volume / totalVolume) * 100;
      });

      // Sort by volume (descending) to find POC
      const sortedLevels = Array.from(volumeByPrice.values()).sort(
        (a, b) => b.volume - a.volume
      );

      // Point of Control (highest volume price)
      const poc = sortedLevels[0].price;

      // Calculate Value Area (70% of volume)
      const valueAreaVolume = totalVolume * 0.7;
      let cumulativeVolume = 0;
      let vah = poc; // Value Area High
      let val = poc; // Value Area Low

      // Expand from POC until we have 70% of volume
      const sortedByPrice = Array.from(volumeByPrice.values()).sort((a, b) => a.price - b.price);
      const pocIndex = sortedByPrice.findIndex((l) => l.price === poc);

      let upperIndex = pocIndex;
      let lowerIndex = pocIndex;

      while (cumulativeVolume < valueAreaVolume && (upperIndex < sortedByPrice.length || lowerIndex >= 0)) {
        const upperVolume = upperIndex < sortedByPrice.length ? sortedByPrice[upperIndex].volume : 0;
        const lowerVolume = lowerIndex >= 0 ? sortedByPrice[lowerIndex].volume : 0;

        if (upperVolume > lowerVolume) {
          cumulativeVolume += upperVolume;
          vah = sortedByPrice[upperIndex].price;
          upperIndex++;
        } else {
          cumulativeVolume += lowerVolume;
          val = sortedByPrice[lowerIndex].price;
          lowerIndex--;
        }
      }

      const valueAreaPercent = ((vah - val) / val) * 100;

      const profile: VolumeProfileData = {
        exchangeId,
        symbol,
        startTime,
        endTime,
        priceLevels: sortedByPrice,
        poc,
        vah,
        val,
        totalVolume,
        valueAreaVolume,
        valueAreaPercent,
      };

      logger.info('Generated volume profile', {
        exchangeId,
        symbol,
        levels: profile.priceLevels.length,
        poc: poc.toFixed(2),
        vah: vah.toFixed(2),
        val: val.toFixed(2),
      });

      return profile;
    } catch (error) {
      logger.error('Failed to generate volume profile', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Detect absorption (large volume without price movement)
   */
  static detectAbsorption(footprint: FootprintData): {
    hasAbsorption: boolean;
    side: 'bid' | 'ask' | null;
    strength: number;
    priceLevel: number | null;
  } {
    // Look for high volume at a price level with minimal price movement
    const priceMovement = ((footprint.close - footprint.open) / footprint.open) * 100;

    // High volume but low price movement = absorption
    if (Math.abs(priceMovement) < 0.1 && footprint.totalVolume > 0) {
      // Find the price level with highest volume
      const sortedLevels = [...footprint.priceVolumes].sort(
        (a, b) => b.totalVolume - a.totalVolume
      );

      if (sortedLevels.length === 0) {
        return { hasAbsorption: false, side: null, strength: 0, priceLevel: null };
      }

      const topLevel = sortedLevels[0];

      // Determine if it's bid or ask absorption
      const side: 'bid' | 'ask' = topLevel.buyVolume > topLevel.sellVolume ? 'bid' : 'ask';

      // Strength based on volume concentration
      const volumeConcentration = (topLevel.totalVolume / footprint.totalVolume) * 100;
      const strength = Math.min(100, volumeConcentration * 2);

      return {
        hasAbsorption: strength > 30,
        side,
        strength,
        priceLevel: topLevel.price,
      };
    }

    return { hasAbsorption: false, side: null, strength: 0, priceLevel: null };
  }

  /**
   * Calculate footprint for a single time bucket
   */
  private static calculateFootprintForBucket(
    exchangeId: string,
    symbol: string,
    timeframe: string,
    timestamp: Date,
    trades: any[]
  ): FootprintData {
    if (trades.length === 0) {
      throw new Error('No trades in bucket');
    }

    // Calculate OHLC
    const prices = trades.map((t) => parseFloat(t.price));
    const open = parseFloat(trades[0].price);
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const close = parseFloat(trades[trades.length - 1].price);

    // Aggregate volume by price level
    const priceVolumeMap = new Map<number, FootprintPriceLevel>();

    trades.forEach((trade) => {
      const price = parseFloat(trade.price);
      const amount = parseFloat(trade.amount);
      const side = trade.side;

      let level = priceVolumeMap.get(price);
      if (!level) {
        level = {
          price,
          buyVolume: 0,
          sellVolume: 0,
          totalVolume: 0,
          delta: 0,
          imbalance: 0,
        };
        priceVolumeMap.set(price, level);
      }

      level.totalVolume += amount;
      if (side === 'buy') {
        level.buyVolume += amount;
      } else {
        level.sellVolume += amount;
      }
      level.delta = level.buyVolume - level.sellVolume;
      level.imbalance =
        level.totalVolume > 0
          ? (level.buyVolume - level.sellVolume) / level.totalVolume
          : 0;
    });

    // Convert map to sorted array
    const priceVolumes = Array.from(priceVolumeMap.values()).sort((a, b) => b.price - a.price);

    // Calculate aggregated metrics
    const totalVolume = priceVolumes.reduce((sum, level) => sum + level.totalVolume, 0);
    const buyVolume = priceVolumes.reduce((sum, level) => sum + level.buyVolume, 0);
    const sellVolume = priceVolumes.reduce((sum, level) => sum + level.sellVolume, 0);
    const delta = buyVolume - sellVolume;

    // Find imbalance at high and low
    const highLevel = priceVolumes.find((l) => l.price === high);
    const lowLevel = priceVolumes.find((l) => l.price === low);
    const highImbalance = highLevel?.imbalance || 0;
    const lowImbalance = lowLevel?.imbalance || 0;

    // Find Point of Control (POC) - price with highest volume
    const poc = priceVolumes.reduce((max, level) =>
      level.totalVolume > max.totalVolume ? level : max
    ).price;

    return {
      exchangeId,
      symbol,
      timeframe,
      timestamp,
      open,
      high,
      low,
      close,
      priceVolumes,
      totalVolume,
      buyVolume,
      sellVolume,
      delta,
      highImbalance,
      lowImbalance,
      poc,
    };
  }

  /**
   * Get bucket time for timeframe
   */
  private static getBucketTime(timestamp: Date, timeframeMinutes: number): number {
    const time = timestamp.getTime();
    const bucketMs = timeframeMinutes * 60 * 1000;
    return Math.floor(time / bucketMs) * bucketMs;
  }

  /**
   * Parse timeframe string to minutes
   */
  private static parseTimeframe(timeframe: string): number {
    const match = timeframe.match(/^(\d+)([mhd])$/);
    if (!match) {
      throw new BadRequestError('Invalid timeframe format. Use: 1m, 5m, 15m, 1h, 4h, 1d');
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'm':
        return value;
      case 'h':
        return value * 60;
      case 'd':
        return value * 60 * 24;
      default:
        throw new BadRequestError('Invalid timeframe unit');
    }
  }

  /**
   * Detect buying/selling climax
   */
  static detectClimax(footprints: FootprintData[]): {
    hasBuyingClimax: boolean;
    hasSellingClimax: boolean;
    climaxBar: FootprintData | null;
    strength: number;
  } {
    if (footprints.length < 3) {
      return {
        hasBuyingClimax: false,
        hasSellingClimax: false,
        climaxBar: null,
        strength: 0,
      };
    }

    // Look for bars with exceptionally high volume and strong delta
    const avgVolume =
      footprints.reduce((sum, fp) => sum + fp.totalVolume, 0) / footprints.length;

    let climaxBar: FootprintData | null = null;
    let maxStrength = 0;

    footprints.forEach((fp) => {
      const volumeRatio = fp.totalVolume / avgVolume;
      const deltaRatio = Math.abs(fp.delta) / fp.totalVolume;

      // Climax criteria: 2x average volume + strong delta
      if (volumeRatio > 2 && deltaRatio > 0.6) {
        const strength = volumeRatio * deltaRatio * 50;
        if (strength > maxStrength) {
          maxStrength = strength;
          climaxBar = fp;
        }
      }
    });

    if (!climaxBar) {
      return {
        hasBuyingClimax: false,
        hasSellingClimax: false,
        climaxBar: null,
        strength: 0,
      };
    }

    // Type assertion: we know climaxBar is not null at this point
    const bar: FootprintData = climaxBar;

    return {
      hasBuyingClimax: bar.delta > 0,
      hasSellingClimax: bar.delta < 0,
      climaxBar: bar,
      strength: maxStrength,
    };
  }

  /**
   * Analyze order flow divergence
   */
  static analyzeOrderFlowDivergence(footprints: FootprintData[]): {
    hasDivergence: boolean;
    type: 'bullish' | 'bearish' | null;
    description: string;
  } {
    if (footprints.length < 5) {
      return {
        hasDivergence: false,
        type: null,
        description: 'Insufficient data',
      };
    }

    // Compare price direction with delta direction
    const recentBars = footprints.slice(-5);
    const priceChange = recentBars[recentBars.length - 1].close - recentBars[0].open;
    const cumulativeDelta = recentBars.reduce((sum, fp) => sum + fp.delta, 0);

    // Bullish divergence: price down but delta positive (buying)
    if (priceChange < 0 && cumulativeDelta > 0) {
      return {
        hasDivergence: true,
        type: 'bullish',
        description: 'Price declining but buying pressure increasing',
      };
    }

    // Bearish divergence: price up but delta negative (selling)
    if (priceChange > 0 && cumulativeDelta < 0) {
      return {
        hasDivergence: true,
        type: 'bearish',
        description: 'Price rising but selling pressure increasing',
      };
    }

    return {
      hasDivergence: false,
      type: null,
      description: 'No divergence detected',
    };
  }

  /**
   * Get footprint statistics
   */
  static calculateStatistics(footprints: FootprintData[]): {
    totalBars: number;
    avgVolume: number;
    avgDelta: number;
    buyingBars: number;
    sellingBars: number;
    neutralBars: number;
    strongestBuyBar: FootprintData | null;
    strongestSellBar: FootprintData | null;
  } {
    if (footprints.length === 0) {
      return {
        totalBars: 0,
        avgVolume: 0,
        avgDelta: 0,
        buyingBars: 0,
        sellingBars: 0,
        neutralBars: 0,
        strongestBuyBar: null,
        strongestSellBar: null,
      };
    }

    const totalVolume = footprints.reduce((sum, fp) => sum + fp.totalVolume, 0);
    const totalDelta = footprints.reduce((sum, fp) => sum + fp.delta, 0);

    let buyingBars = 0;
    let sellingBars = 0;
    let neutralBars = 0;
    let strongestBuyBar: FootprintData | null = null;
    let strongestSellBar: FootprintData | null = null;
    let maxBuyDelta = 0;
    let maxSellDelta = 0;

    footprints.forEach((fp) => {
      const deltaPercent = (fp.delta / fp.totalVolume) * 100;

      if (deltaPercent > 20) {
        buyingBars++;
        if (fp.delta > maxBuyDelta) {
          maxBuyDelta = fp.delta;
          strongestBuyBar = fp;
        }
      } else if (deltaPercent < -20) {
        sellingBars++;
        if (fp.delta < maxSellDelta) {
          maxSellDelta = fp.delta;
          strongestSellBar = fp;
        }
      } else {
        neutralBars++;
      }
    });

    return {
      totalBars: footprints.length,
      avgVolume: totalVolume / footprints.length,
      avgDelta: totalDelta / footprints.length,
      buyingBars,
      sellingBars,
      neutralBars,
      strongestBuyBar,
      strongestSellBar,
    };
  }
}
