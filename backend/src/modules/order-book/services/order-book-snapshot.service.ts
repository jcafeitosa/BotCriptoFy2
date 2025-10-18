/**
 * Order Book Snapshot Service
 * Core service for managing order book snapshots
 *
 * Features:
 * - Fetch and store full order book snapshots
 * - Level 1 (top-of-book) fast storage
 * - Delta tracking for efficiency
 * - Historical snapshot retrieval
 * - Snapshot comparison and diff
 */

import { db } from '@/db';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
// Module not yet implemented
// import { ExchangeService } from '../../exchanges/services/exchange.service';
import {
  orderBookSnapshots,
  orderBookLevel1,
  orderBookDeltas,
} from '../schema/order-book.schema';
import logger from '@/utils/logger';
import { BadRequestError } from '@/utils/errors';
import type {
  OrderBookSnapshot,
  OrderBookLevel1 as OrderBookLevel1Type,
  OrderBookDelta,
  OrderBookQueryOptions,
  OrderBookHistoricalQuery,
  OrderBookLevel,
} from '../types/order-book.types';

export class OrderBookSnapshotService {
  /**
   * Fetch order book from exchange via CCXT
   */
  static async fetchFromExchange(options: OrderBookQueryOptions): Promise<OrderBookSnapshot> {
    const { exchangeId, symbol, limit = 20 } = options;

    try {
      logger.info('Fetching order book from exchange', { exchangeId, symbol, limit });

      // Create exchange instance (no auth needed for public data)
      const exchange = ExchangeService.createCCXTInstance(exchangeId, {
        apiKey: '',
        apiSecret: '',
      });

      // Fetch order book from CCXT
      const orderbook = await exchange.fetchOrderBook(symbol, limit);

      // Calculate metrics
      const bestBid = orderbook.bids[0]?.[0] || 0;
      const bestAsk = orderbook.asks[0]?.[0] || 0;
      const spread = bestAsk - bestBid;
      const spreadPercent = bestBid > 0 ? (spread / bestBid) * 100 : 0;
      const midPrice = (bestBid + bestAsk) / 2;

      // Calculate depth metrics (convert CCXT Num types to number[][])
      const bidsAsNumbers = orderbook.bids.map(([p, a]) => [Number(p), Number(a)]);
      const asksAsNumbers = orderbook.asks.map(([p, a]) => [Number(p), Number(a)]);

      const bidDepth10 = this.calculateDepth(bidsAsNumbers.slice(0, 10));
      const askDepth10 = this.calculateDepth(asksAsNumbers.slice(0, 10));
      const bidDepth50 = this.calculateDepth(bidsAsNumbers.slice(0, 50));
      const askDepth50 = this.calculateDepth(asksAsNumbers.slice(0, 50));
      const totalDepth = bidDepth50 + askDepth50;

      // Convert to our format
      const snapshot: OrderBookSnapshot = {
        exchangeId,
        symbol,
        timestamp: new Date(orderbook.timestamp || Date.now()),
        bids: orderbook.bids.map(([price, amount]) => ({
          price: Number(price),
          amount: Number(amount)
        })),
        asks: orderbook.asks.map(([price, amount]) => ({
          price: Number(price),
          amount: Number(amount)
        })),
        nonce: orderbook.nonce,

        // Level 1
        bestBid,
        bestBidSize: orderbook.bids[0]?.[1] || 0,
        bestAsk,
        bestAskSize: orderbook.asks[0]?.[1] || 0,

        // Spread
        spread,
        spreadPercent,
        midPrice,

        // Depth
        bidDepth10,
        askDepth10,
        bidDepth50,
        askDepth50,
        totalDepth,

        // Metadata
        bidLevels: orderbook.bids.length,
        askLevels: orderbook.asks.length,
        isComplete: orderbook.bids.length === limit && orderbook.asks.length === limit,
      };

      logger.info('Fetched order book from exchange', {
        exchangeId,
        symbol,
        bidLevels: snapshot.bidLevels,
        askLevels: snapshot.askLevels,
        spread: spread.toFixed(2),
      });

      return snapshot;
    } catch (error) {
      logger.error('Failed to fetch order book from exchange', {
        exchangeId,
        symbol,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new BadRequestError('Failed to fetch order book from exchange');
    }
  }

  /**
   * Store full order book snapshot
   */
  static async storeSnapshot(snapshot: OrderBookSnapshot): Promise<void> {
    try {
      logger.debug('Storing order book snapshot', {
        exchangeId: snapshot.exchangeId,
        symbol: snapshot.symbol,
        timestamp: snapshot.timestamp,
      });

      await db.insert(orderBookSnapshots).values({
        exchangeId: snapshot.exchangeId,
        symbol: snapshot.symbol,
        timestamp: snapshot.timestamp,
        bids: snapshot.bids as any,
        asks: snapshot.asks as any,
        nonce: snapshot.nonce,

        // Level 1
        bestBid: snapshot.bestBid?.toString(),
        bestBidSize: snapshot.bestBidSize?.toString(),
        bestAsk: snapshot.bestAsk?.toString(),
        bestAskSize: snapshot.bestAskSize?.toString(),

        // Spread
        spread: snapshot.spread?.toString(),
        spreadPercent: snapshot.spreadPercent?.toString(),
        midPrice: snapshot.midPrice?.toString(),

        // Depth
        bidDepth10: snapshot.bidDepth10?.toString(),
        askDepth10: snapshot.askDepth10?.toString(),
        bidDepth50: snapshot.bidDepth50?.toString(),
        askDepth50: snapshot.askDepth50?.toString(),
        totalDepth: snapshot.totalDepth?.toString(),

        // Metadata
        bidLevels: snapshot.bidLevels,
        askLevels: snapshot.askLevels,
        isComplete: snapshot.isComplete,
      });

      logger.debug('Stored order book snapshot', {
        exchangeId: snapshot.exchangeId,
        symbol: snapshot.symbol,
      });
    } catch (error) {
      logger.error('Failed to store order book snapshot', {
        exchangeId: snapshot.exchangeId,
        symbol: snapshot.symbol,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Store Level 1 (top-of-book) only - for ultra-fast updates
   */
  static async storeLevel1(data: OrderBookLevel1Type): Promise<void> {
    try {
      await db.insert(orderBookLevel1).values({
        exchangeId: data.exchangeId,
        symbol: data.symbol,
        timestamp: data.timestamp,
        bestBid: data.bestBid.toString(),
        bestBidSize: data.bestBidSize.toString(),
        bestAsk: data.bestAsk.toString(),
        bestAskSize: data.bestAskSize.toString(),
        spread: data.spread?.toString(),
        spreadPercent: data.spreadPercent?.toString(),
        midPrice: data.midPrice?.toString(),
      });

      logger.debug('Stored Level 1 order book', {
        exchangeId: data.exchangeId,
        symbol: data.symbol,
      });
    } catch (error) {
      logger.error('Failed to store Level 1 order book', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Store order book delta (incremental changes)
   */
  static async storeDelta(delta: OrderBookDelta): Promise<void> {
    try {
      await db.insert(orderBookDeltas).values({
        exchangeId: delta.exchangeId,
        symbol: delta.symbol,
        timestamp: delta.timestamp,
        bidChanges: delta.bidChanges as any,
        askChanges: delta.askChanges as any,
        changeType: delta.changeType,
        nonce: delta.nonce,
      });

      logger.debug('Stored order book delta', {
        exchangeId: delta.exchangeId,
        symbol: delta.symbol,
        changeType: delta.changeType,
      });
    } catch (error) {
      logger.error('Failed to store order book delta', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get latest order book snapshot
   */
  static async getLatestSnapshot(
    exchangeId: string,
    symbol: string
  ): Promise<OrderBookSnapshot | null> {
    try {
      const [result] = await db
        .select()
        .from(orderBookSnapshots)
        .where(
          and(
            eq(orderBookSnapshots.exchangeId, exchangeId),
            eq(orderBookSnapshots.symbol, symbol)
          )
        )
        .orderBy(desc(orderBookSnapshots.timestamp))
        .limit(1);

      if (!result) return null;

      return this.mapSnapshotFromDB(result);
    } catch (error) {
      logger.error('Failed to get latest order book snapshot', {
        exchangeId,
        symbol,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get latest Level 1 (top-of-book)
   */
  static async getLatestLevel1(
    exchangeId: string,
    symbol: string
  ): Promise<OrderBookLevel1Type | null> {
    try {
      const [result] = await db
        .select()
        .from(orderBookLevel1)
        .where(
          and(
            eq(orderBookLevel1.exchangeId, exchangeId),
            eq(orderBookLevel1.symbol, symbol)
          )
        )
        .orderBy(desc(orderBookLevel1.timestamp))
        .limit(1);

      if (!result) return null;

      return {
        id: result.id,
        exchangeId: result.exchangeId,
        symbol: result.symbol,
        timestamp: result.timestamp,
        bestBid: parseFloat(result.bestBid),
        bestBidSize: parseFloat(result.bestBidSize),
        bestAsk: parseFloat(result.bestAsk),
        bestAskSize: parseFloat(result.bestAskSize),
        spread: result.spread ? parseFloat(result.spread) : undefined,
        spreadPercent: result.spreadPercent ? parseFloat(result.spreadPercent) : undefined,
        midPrice: result.midPrice ? parseFloat(result.midPrice) : undefined,
        createdAt: result.createdAt,
      };
    } catch (error) {
      logger.error('Failed to get latest Level 1', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get historical snapshots
   */
  static async getHistoricalSnapshots(
    query: OrderBookHistoricalQuery
  ): Promise<OrderBookSnapshot[]> {
    const { exchangeId, symbol, startTime, endTime, limit = 100 } = query;

    try {
      const results = await db
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
        .orderBy(desc(orderBookSnapshots.timestamp))
        .limit(limit);

      return results.map((row) => this.mapSnapshotFromDB(row));
    } catch (error) {
      logger.error('Failed to get historical snapshots', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Compare two snapshots and generate delta
   */
  static generateDelta(
    oldSnapshot: OrderBookSnapshot,
    newSnapshot: OrderBookSnapshot
  ): OrderBookDelta {
    const bidChanges: OrderBookLevel[] = [];
    const askChanges: OrderBookLevel[] = [];

    // Compare bids
    const oldBids = new Map(oldSnapshot.bids.map((b) => [b.price, b.amount]));
    const newBids = new Map(newSnapshot.bids.map((b) => [b.price, b.amount]));

    // Find changed/new bids
    for (const [price, amount] of newBids) {
      const oldAmount = oldBids.get(price);
      if (oldAmount !== amount) {
        bidChanges.push({ price, amount });
      }
    }

    // Find removed bids
    for (const [price] of oldBids) {
      if (!newBids.has(price)) {
        bidChanges.push({ price, amount: 0 });
      }
    }

    // Compare asks (same logic)
    const oldAsks = new Map(oldSnapshot.asks.map((a) => [a.price, a.amount]));
    const newAsks = new Map(newSnapshot.asks.map((a) => [a.price, a.amount]));

    for (const [price, amount] of newAsks) {
      const oldAmount = oldAsks.get(price);
      if (oldAmount !== amount) {
        askChanges.push({ price, amount });
      }
    }

    for (const [price] of oldAsks) {
      if (!newAsks.has(price)) {
        askChanges.push({ price, amount: 0 });
      }
    }

    // Determine change type
    const changeType =
      bidChanges.length === 0 && askChanges.length === 0
        ? 'update'
        : bidChanges.some((c) => c.amount === 0) || askChanges.some((c) => c.amount === 0)
          ? 'remove'
          : 'add';

    return {
      exchangeId: newSnapshot.exchangeId,
      symbol: newSnapshot.symbol,
      timestamp: newSnapshot.timestamp,
      bidChanges,
      askChanges,
      changeType,
      nonce: newSnapshot.nonce,
    };
  }

  /**
   * Fetch and store snapshot (convenience method)
   */
  static async fetchAndStore(options: OrderBookQueryOptions): Promise<OrderBookSnapshot> {
    const snapshot = await this.fetchFromExchange(options);
    await this.storeSnapshot(snapshot);

    // Also store Level 1 for fast access
    await this.storeLevel1({
      exchangeId: snapshot.exchangeId,
      symbol: snapshot.symbol,
      timestamp: snapshot.timestamp,
      bestBid: snapshot.bestBid!,
      bestBidSize: snapshot.bestBidSize!,
      bestAsk: snapshot.bestAsk!,
      bestAskSize: snapshot.bestAskSize!,
      spread: snapshot.spread,
      spreadPercent: snapshot.spreadPercent,
      midPrice: snapshot.midPrice,
    });

    return snapshot;
  }

  /**
   * Calculate depth (total USD value) at given levels
   */
  private static calculateDepth(levels: number[][]): number {
    return levels.reduce((sum, [price, amount]) => sum + price * amount, 0);
  }

  /**
   * Map database row to OrderBookSnapshot
   */
  private static mapSnapshotFromDB(row: any): OrderBookSnapshot {
    return {
      id: row.id,
      exchangeId: row.exchangeId,
      symbol: row.symbol,
      timestamp: row.timestamp,
      bids: row.bids as OrderBookLevel[],
      asks: row.asks as OrderBookLevel[],
      nonce: row.nonce || undefined,

      bestBid: row.bestBid ? parseFloat(row.bestBid) : undefined,
      bestBidSize: row.bestBidSize ? parseFloat(row.bestBidSize) : undefined,
      bestAsk: row.bestAsk ? parseFloat(row.bestAsk) : undefined,
      bestAskSize: row.bestAskSize ? parseFloat(row.bestAskSize) : undefined,

      spread: row.spread ? parseFloat(row.spread) : undefined,
      spreadPercent: row.spreadPercent ? parseFloat(row.spreadPercent) : undefined,
      midPrice: row.midPrice ? parseFloat(row.midPrice) : undefined,

      bidDepth10: row.bidDepth10 ? parseFloat(row.bidDepth10) : undefined,
      askDepth10: row.askDepth10 ? parseFloat(row.askDepth10) : undefined,
      bidDepth50: row.bidDepth50 ? parseFloat(row.bidDepth50) : undefined,
      askDepth50: row.askDepth50 ? parseFloat(row.askDepth50) : undefined,
      totalDepth: row.totalDepth ? parseFloat(row.totalDepth) : undefined,

      bidLevels: row.bidLevels || 0,
      askLevels: row.askLevels || 0,
      isComplete: row.isComplete ?? true,

      createdAt: row.createdAt,
    };
  }

  /**
   * Get order book statistics for a time period
   */
  static async getSnapshotStatistics(
    exchangeId: string,
    symbol: string,
    startTime: Date,
    endTime: Date
  ): Promise<{
    count: number;
    avgSpread: number;
    avgDepth: number;
    avgImbalance: number;
  }> {
    try {
      const [result] = await db
        .select({
          count: sql<number>`COUNT(*)::int`,
          avgSpread: sql<number>`AVG(${orderBookSnapshots.spread})::float`,
          avgDepth: sql<number>`AVG(${orderBookSnapshots.totalDepth})::float`,
          avgImbalance: sql<number>`AVG(
            (${orderBookSnapshots.bidDepth10} - ${orderBookSnapshots.askDepth10}) /
            (${orderBookSnapshots.bidDepth10} + ${orderBookSnapshots.askDepth10})
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

      return {
        count: result?.count || 0,
        avgSpread: result?.avgSpread || 0,
        avgDepth: result?.avgDepth || 0,
        avgImbalance: result?.avgImbalance || 0,
      };
    } catch (error) {
      logger.error('Failed to get snapshot statistics', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Delete old snapshots (for maintenance/cleanup)
   */
  static async deleteOldSnapshots(olderThan: Date): Promise<number> {
    try {
      const result = await db
        .delete(orderBookSnapshots)
        .where(lte(orderBookSnapshots.timestamp, olderThan));

      logger.info('Deleted old order book snapshots', {
        olderThan,
        deletedCount: result.rowCount || 0,
      });

      return result.rowCount || 0;
    } catch (error) {
      logger.error('Failed to delete old snapshots', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
