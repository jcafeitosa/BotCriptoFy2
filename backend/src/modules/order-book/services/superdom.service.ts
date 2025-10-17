/**
 * SuperDOM Service (Nelogica-style Trading Interface)
 * Professional depth of market visualization and trading interface
 *
 * Features inspired by Nelogica Profit Ultra:
 * - SuperDOM interface data generation
 * - Volume at Price display
 * - One-Click Trading data structures
 * - AutoOp (automated gain/loss orders)
 * - Ladder interface support
 * - Real-time order book updates
 * - Market depth visualization
 * - Working orders display
 */

import { db } from '@/db';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import { orderBookSnapshots, orderBookImbalance } from '../schema/order-book.schema';
import { OrderBookSnapshotService } from './order-book-snapshot.service';
import { OrderBookAnalyticsService } from './order-book-analytics.service';
import logger from '@/utils/logger';
import { BadRequestError } from '@/utils/errors';
import type {
  OrderBookSnapshot,
  DOMDisplayData,
  DOMLevelData,
  OrderBookLevel,
} from '../types/order-book.types';

/**
 * SuperDOM Display Configuration
 */
export interface SuperDOMConfig {
  // Display settings
  priceLevels: number; // Number of price levels to show (default: 50)
  priceTickSize: number; // Minimum price movement
  volumeFormat: 'contracts' | 'lots' | 'usd'; // Volume display format

  // Visualization
  showCumulative: boolean; // Show cumulative volume
  showImbalance: boolean; // Show bid/ask imbalance
  showLiquidityZones: boolean; // Highlight liquidity zones
  showLargeOrders: boolean; // Highlight whale orders

  // Trading features
  enableOneClick: boolean; // Enable one-click trading
  defaultOrderSize: number; // Default order size
  quickOrderSizes: number[]; // Quick access order sizes

  // AutoOp settings
  autoOpEnabled: boolean; // Enable automated orders
  autoOpGainTicks: number; // Ticks for gain target
  autoOpLossTicks: number; // Ticks for stop loss
  autoOpTrailing: boolean; // Enable trailing stop
}

/**
 * SuperDOM Data Point
 * Complete data for a single price level in SuperDOM
 */
export interface SuperDOMLevel extends DOMLevelData {
  // Trading actions
  canBuy: boolean;
  canSell: boolean;

  // Working orders (user's orders at this level)
  workingBuyOrders: number;
  workingSellOrders: number;

  // Price action indicators
  isNewHigh?: boolean;
  isNewLow?: boolean;
  volumeChange?: number; // Change from previous snapshot

  // AutoOp data
  isGainTarget?: boolean; // Matches gain target price
  isStopLoss?: boolean; // Matches stop loss price
  isTrailingStop?: boolean; // Matches trailing stop price
}

/**
 * SuperDOM Display Data
 */
export interface SuperDOMData {
  exchangeId: string;
  symbol: string;
  timestamp: Date;

  // Price levels (sorted by price desc)
  levels: SuperDOMLevel[];

  // Current market
  lastPrice: number;
  midPrice: number;
  spread: number;
  spreadPercent: number;

  // Volume totals
  totalBidVolume: number;
  totalAskVolume: number;
  totalBidOrders: number;
  totalAskOrders: number;

  // Imbalance
  overallImbalance: number; // -100 to +100

  // Price boundaries
  highestBid: number;
  lowestAsk: number;
  highestPrice: number; // Top of ladder
  lowestPrice: number; // Bottom of ladder

  // Statistics
  avgBidSize: number;
  avgAskSize: number;
  largeOrderThreshold: number; // What is considered a "large" order

  // Configuration
  config: SuperDOMConfig;
}

/**
 * One-Click Trading Action
 */
export interface OneClickAction {
  action: 'buy' | 'sell';
  price: number;
  size: number;
  orderType: 'limit' | 'market' | 'stop';
  timeInForce: 'GTC' | 'IOC' | 'FOK';
}

/**
 * AutoOp Order Configuration
 */
export interface AutoOpConfig {
  enabled: boolean;

  // Entry
  entryPrice: number;
  entrySize: number;
  entrySide: 'buy' | 'sell';

  // Exit targets
  gainTarget?: number; // Price for profit taking
  stopLoss?: number; // Price for stop loss

  // Trailing stop
  trailingStopEnabled: boolean;
  trailingStopDistance?: number; // Ticks from current price
  trailingStopActivationPrice?: number; // Price to activate trailing

  // OCO (One-Cancels-Other)
  ocoEnabled: boolean; // Gain cancels stop, stop cancels gain
}

/**
 * Volume at Price Data
 */
export interface VolumeAtPriceData {
  exchangeId: string;
  symbol: string;
  startTime: Date;
  endTime: Date;

  // Volume by price level
  levels: {
    price: number;
    buyVolume: number;
    sellVolume: number;
    totalVolume: number;
    trades: number;
    avgTradeSize: number;
    delta: number; // Buy - Sell
  }[];

  // Key levels
  maxVolumePrice: number; // Price with highest volume
  maxBuyPrice: number; // Price with highest buy volume
  maxSellPrice: number; // Price with highest sell volume
}

export class SuperDOMService {
  /**
   * Generate SuperDOM display data
   */
  static async generateSuperDOM(
    exchangeId: string,
    symbol: string,
    config: Partial<SuperDOMConfig> = {}
  ): Promise<SuperDOMData> {
    try {
      // Get latest order book snapshot
      const snapshot = await OrderBookSnapshotService.getLatestSnapshot(exchangeId, symbol);

      if (!snapshot) {
        throw new BadRequestError('No order book data available');
      }

      // Get latest imbalance data
      const imbalanceData = await db
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

      const imbalance = imbalanceData[0];

      // Merge config with defaults
      const fullConfig: SuperDOMConfig = {
        priceLevels: config.priceLevels || 50,
        priceTickSize: config.priceTickSize || 0.01,
        volumeFormat: config.volumeFormat || 'usd',
        showCumulative: config.showCumulative ?? true,
        showImbalance: config.showImbalance ?? true,
        showLiquidityZones: config.showLiquidityZones ?? true,
        showLargeOrders: config.showLargeOrders ?? true,
        enableOneClick: config.enableOneClick ?? true,
        defaultOrderSize: config.defaultOrderSize || 100,
        quickOrderSizes: config.quickOrderSizes || [10, 25, 50, 100, 250, 500],
        autoOpEnabled: config.autoOpEnabled ?? true,
        autoOpGainTicks: config.autoOpGainTicks || 10,
        autoOpLossTicks: config.autoOpLossTicks || 5,
        autoOpTrailing: config.autoOpTrailing ?? false,
      };

      // Generate DOM display data
      const domData = OrderBookAnalyticsService.generateDOMDisplayData(snapshot);

      // Calculate large order threshold (2x average size)
      const avgSize = (domData.totalBidVolume + domData.totalAskVolume) /
                     (domData.totalBidOrders + domData.totalAskOrders || 1);
      const largeOrderThreshold = avgSize * 2;

      // Enhance levels with SuperDOM data
      const superDOMLevels: SuperDOMLevel[] = domData.levels.map((level) => {
        const isLargeOrder =
          !!(level.bidSize && level.bidSize > largeOrderThreshold) ||
          !!(level.askSize && level.askSize > largeOrderThreshold);

        return {
          ...level,
          canBuy: !!level.askSize, // Can buy if there's ask liquidity
          canSell: !!level.bidSize, // Can sell if there's bid liquidity
          workingBuyOrders: 0, // Would come from user's order tracking
          workingSellOrders: 0,
          isLargeOrder: fullConfig.showLargeOrders ? isLargeOrder : undefined,
        };
      });

      // Calculate overall imbalance
      const overallImbalance = imbalance
        ? parseFloat(imbalance.imbalance10 ?? '0')
        : this.calculateSimpleImbalance(snapshot);

      // Determine price boundaries
      const prices = superDOMLevels.map(l => l.price).sort((a, b) => b - a);
      const highestPrice = prices[0];
      const lowestPrice = prices[prices.length - 1];

      const result: SuperDOMData = {
        exchangeId,
        symbol,
        timestamp: snapshot.timestamp,
        levels: superDOMLevels,
        lastPrice: snapshot.midPrice || ((snapshot.bestBid || 0) + (snapshot.bestAsk || 0)) / 2,
        midPrice: snapshot.midPrice || 0,
        spread: snapshot.spread || 0,
        spreadPercent: snapshot.spreadPercent || 0,
        totalBidVolume: domData.totalBidVolume,
        totalAskVolume: domData.totalAskVolume,
        totalBidOrders: domData.totalBidOrders,
        totalAskOrders: domData.totalAskOrders,
        overallImbalance,
        highestBid: snapshot.bestBid || 0,
        lowestAsk: snapshot.bestAsk || 0,
        highestPrice,
        lowestPrice,
        avgBidSize: domData.totalBidVolume / (domData.totalBidOrders || 1),
        avgAskSize: domData.totalAskVolume / (domData.totalAskOrders || 1),
        largeOrderThreshold,
        config: fullConfig,
      };

      logger.debug('Generated SuperDOM data', {
        exchangeId,
        symbol,
        levels: superDOMLevels.length,
        imbalance: overallImbalance,
      });

      return result;
    } catch (error) {
      logger.error('Failed to generate SuperDOM data', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Calculate simple imbalance from snapshot
   */
  private static calculateSimpleImbalance(snapshot: OrderBookSnapshot): number {
    const bidVolume = snapshot.bids
      .slice(0, 10)
      .reduce((sum, level) => sum + level.price * level.amount, 0);

    const askVolume = snapshot.asks
      .slice(0, 10)
      .reduce((sum, level) => sum + level.price * level.amount, 0);

    const total = bidVolume + askVolume;
    if (total === 0) return 0;

    return ((bidVolume - askVolume) / total) * 100;
  }

  /**
   * Generate One-Click Trading action
   */
  static generateOneClickAction(
    side: 'buy' | 'sell',
    price: number,
    config: SuperDOMConfig
  ): OneClickAction {
    return {
      action: side,
      price,
      size: config.defaultOrderSize,
      orderType: 'limit',
      timeInForce: 'GTC',
    };
  }

  /**
   * Calculate AutoOp prices (gain target and stop loss)
   */
  static calculateAutoOpPrices(
    entryPrice: number,
    entrySide: 'buy' | 'sell',
    config: SuperDOMConfig,
    tickSize: number = 0.01
  ): {
    gainTarget: number;
    stopLoss: number;
  } {
    const gainDistance = config.autoOpGainTicks * tickSize;
    const lossDistance = config.autoOpLossTicks * tickSize;

    if (entrySide === 'buy') {
      return {
        gainTarget: entryPrice + gainDistance, // Sell higher
        stopLoss: entryPrice - lossDistance, // Sell lower to cut loss
      };
    } else {
      return {
        gainTarget: entryPrice - gainDistance, // Buy lower
        stopLoss: entryPrice + lossDistance, // Buy higher to cut loss
      };
    }
  }

  /**
   * Generate AutoOp configuration
   */
  static generateAutoOpConfig(
    entryPrice: number,
    entrySize: number,
    entrySide: 'buy' | 'sell',
    config: SuperDOMConfig,
    tickSize: number = 0.01
  ): AutoOpConfig {
    const { gainTarget, stopLoss } = this.calculateAutoOpPrices(
      entryPrice,
      entrySide,
      config,
      tickSize
    );

    return {
      enabled: config.autoOpEnabled,
      entryPrice,
      entrySize,
      entrySide,
      gainTarget,
      stopLoss,
      trailingStopEnabled: config.autoOpTrailing,
      trailingStopDistance: config.autoOpTrailing ? config.autoOpLossTicks : undefined,
      ocoEnabled: true, // Always use OCO for safety
    };
  }

  /**
   * Update trailing stop price
   */
  static updateTrailingStop(
    currentPrice: number,
    autoOpConfig: AutoOpConfig,
    tickSize: number = 0.01
  ): AutoOpConfig {
    if (!autoOpConfig.trailingStopEnabled || !autoOpConfig.trailingStopDistance) {
      return autoOpConfig;
    }

    const distance = autoOpConfig.trailingStopDistance * tickSize;

    // For buy positions: move stop up as price goes up
    if (autoOpConfig.entrySide === 'buy') {
      const newStopLoss = currentPrice - distance;

      // Only move stop up, never down
      if (newStopLoss > autoOpConfig.stopLoss!) {
        return {
          ...autoOpConfig,
          stopLoss: newStopLoss,
        };
      }
    }
    // For sell positions: move stop down as price goes down
    else {
      const newStopLoss = currentPrice + distance;

      // Only move stop down, never up
      if (newStopLoss < autoOpConfig.stopLoss!) {
        return {
          ...autoOpConfig,
          stopLoss: newStopLoss,
        };
      }
    }

    return autoOpConfig;
  }

  /**
   * Check if price hit AutoOp target
   */
  static checkAutoOpTrigger(
    currentPrice: number,
    autoOpConfig: AutoOpConfig
  ): {
    triggered: boolean;
    triggerType?: 'gain' | 'loss';
    action?: 'buy' | 'sell';
    price: number;
  } {
    if (!autoOpConfig.enabled) {
      return { triggered: false, price: currentPrice };
    }

    // Check gain target
    if (autoOpConfig.gainTarget) {
      const gainHit = autoOpConfig.entrySide === 'buy'
        ? currentPrice >= autoOpConfig.gainTarget
        : currentPrice <= autoOpConfig.gainTarget;

      if (gainHit) {
        return {
          triggered: true,
          triggerType: 'gain',
          action: autoOpConfig.entrySide === 'buy' ? 'sell' : 'buy',
          price: autoOpConfig.gainTarget,
        };
      }
    }

    // Check stop loss
    if (autoOpConfig.stopLoss) {
      const lossHit = autoOpConfig.entrySide === 'buy'
        ? currentPrice <= autoOpConfig.stopLoss
        : currentPrice >= autoOpConfig.stopLoss;

      if (lossHit) {
        return {
          triggered: true,
          triggerType: 'loss',
          action: autoOpConfig.entrySide === 'buy' ? 'sell' : 'buy',
          price: autoOpConfig.stopLoss,
        };
      }
    }

    return { triggered: false, price: currentPrice };
  }

  /**
   * Generate Volume at Price data
   */
  static async generateVolumeAtPrice(
    exchangeId: string,
    symbol: string,
    startTime: Date,
    endTime: Date
  ): Promise<VolumeAtPriceData> {
    try {
      // Get all snapshots in time range
      const snapshots = await db
        .select()
        .from(orderBookSnapshots)
        .where(
          and(
            eq(orderBookSnapshots.exchangeId, exchangeId),
            eq(orderBookSnapshots.symbol, symbol),
            gte(orderBookSnapshots.timestamp, startTime),
            lte(orderBookSnapshots.timestamp, endTime)
          )
        )
        .orderBy(orderBookSnapshots.timestamp);

      if (snapshots.length === 0) {
        throw new BadRequestError('No order book data for specified time range');
      }

      // Aggregate volume by price level
      const volumeByPrice = new Map<number, {
        buyVolume: number;
        sellVolume: number;
        totalVolume: number;
        trades: number;
      }>();

      snapshots.forEach((snapshot) => {
        const bids = snapshot.bids as any as OrderBookLevel[];
        const asks = snapshot.asks as any as OrderBookLevel[];

        // Process bids (buy volume)
        bids.forEach((level) => {
          const volume = level.price * level.amount;
          const existing = volumeByPrice.get(level.price);

          if (existing) {
            existing.buyVolume += volume;
            existing.totalVolume += volume;
            existing.trades += 1;
          } else {
            volumeByPrice.set(level.price, {
              buyVolume: volume,
              sellVolume: 0,
              totalVolume: volume,
              trades: 1,
            });
          }
        });

        // Process asks (sell volume)
        asks.forEach((level) => {
          const volume = level.price * level.amount;
          const existing = volumeByPrice.get(level.price);

          if (existing) {
            existing.sellVolume += volume;
            existing.totalVolume += volume;
            existing.trades += 1;
          } else {
            volumeByPrice.set(level.price, {
              buyVolume: 0,
              sellVolume: volume,
              totalVolume: volume,
              trades: 1,
            });
          }
        });
      });

      // Convert to array and calculate metrics
      const levels = Array.from(volumeByPrice.entries())
        .map(([price, data]) => ({
          price,
          buyVolume: data.buyVolume,
          sellVolume: data.sellVolume,
          totalVolume: data.totalVolume,
          trades: data.trades,
          avgTradeSize: data.totalVolume / data.trades,
          delta: data.buyVolume - data.sellVolume,
        }))
        .sort((a, b) => b.price - a.price); // Sort by price desc

      // Find key levels
      const maxVolumeLevel = levels.reduce((max, level) =>
        level.totalVolume > max.totalVolume ? level : max
      );

      const maxBuyLevel = levels.reduce((max, level) =>
        level.buyVolume > max.buyVolume ? level : max
      );

      const maxSellLevel = levels.reduce((max, level) =>
        level.sellVolume > max.sellVolume ? level : max
      );

      const result: VolumeAtPriceData = {
        exchangeId,
        symbol,
        startTime,
        endTime,
        levels,
        maxVolumePrice: maxVolumeLevel.price,
        maxBuyPrice: maxBuyLevel.price,
        maxSellPrice: maxSellLevel.price,
      };

      logger.info('Generated Volume at Price data', {
        exchangeId,
        symbol,
        priceLevels: levels.length,
        totalVolume: levels.reduce((sum, l) => sum + l.totalVolume, 0),
      });

      return result;
    } catch (error) {
      logger.error('Failed to generate Volume at Price data', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get ladder display (price levels around current price)
   */
  static getLadderDisplay(
    superDOM: SuperDOMData,
    levelsAbove: number = 25,
    levelsBelow: number = 25
  ): SuperDOMLevel[] {
    const currentPrice = superDOM.lastPrice;

    // Sort levels by distance from current price
    const sorted = [...superDOM.levels].sort((a, b) => {
      const distA = Math.abs(a.price - currentPrice);
      const distB = Math.abs(b.price - currentPrice);
      return distA - distB;
    });

    // Get levels above current price
    const above = sorted
      .filter(l => l.price > currentPrice)
      .slice(0, levelsAbove)
      .sort((a, b) => b.price - a.price); // Sort desc

    // Get levels below current price
    const below = sorted
      .filter(l => l.price < currentPrice)
      .slice(0, levelsBelow)
      .sort((a, b) => b.price - a.price); // Sort desc

    // Combine: above + current + below
    return [...above, ...below];
  }

  /**
   * Get quick order sizes for one-click trading
   */
  static getQuickOrderSizes(config: SuperDOMConfig): number[] {
    return config.quickOrderSizes;
  }

  /**
   * Validate order size
   */
  static validateOrderSize(
    size: number,
    superDOM: SuperDOMData,
    side: 'buy' | 'sell'
  ): {
    valid: boolean;
    reason?: string;
    maxSize?: number;
  } {
    if (size <= 0) {
      return { valid: false, reason: 'Order size must be positive' };
    }

    // Check against available liquidity
    const availableLiquidity = side === 'buy'
      ? superDOM.totalAskVolume
      : superDOM.totalBidVolume;

    if (size > availableLiquidity * 0.5) {
      return {
        valid: false,
        reason: 'Order size exceeds 50% of available liquidity',
        maxSize: Math.floor(availableLiquidity * 0.5),
      };
    }

    return { valid: true };
  }

  /**
   * Calculate market impact for order size
   */
  static calculateMarketImpact(
    orderSize: number,
    side: 'buy' | 'sell',
    superDOM: SuperDOMData
  ): {
    impactPercent: number;
    avgPrice: number;
    worstPrice: number;
    levels: { price: number; size: number }[];
  } {
    const levels = side === 'buy'
      ? [...superDOM.levels].filter(l => l.askSize).sort((a, b) => a.price - b.price)
      : [...superDOM.levels].filter(l => l.bidSize).sort((a, b) => b.price - a.price);

    let remainingSize = orderSize;
    let totalCost = 0;
    let worstPrice = side === 'buy' ? levels[0].price : levels[0].price;
    const executedLevels: { price: number; size: number }[] = [];

    // Walk through order book
    for (const level of levels) {
      if (remainingSize <= 0) break;

      const availableSize = (side === 'buy' ? level.askSize : level.bidSize) || 0;
      const executeSize = Math.min(remainingSize, availableSize);

      totalCost += level.price * executeSize;
      remainingSize -= executeSize;
      worstPrice = level.price;

      executedLevels.push({
        price: level.price,
        size: executeSize,
      });
    }

    const avgPrice = totalCost / orderSize;
    const bestPrice = levels[0].price;
    const impactPercent = ((avgPrice - bestPrice) / bestPrice) * 100;

    return {
      impactPercent: Math.abs(impactPercent),
      avgPrice,
      worstPrice,
      levels: executedLevels,
    };
  }
}
