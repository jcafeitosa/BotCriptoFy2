/**
 * Order Book Service
 * Handles order book data collection, storage, and retrieval
 */

import { db } from '@/db';
import { eq, and, desc } from 'drizzle-orm';
import { ExchangeService } from '../../exchanges/services/exchange.service';
import { marketOrderBookSnapshots } from '../schema/market-data.schema';
import logger from '@/utils/logger';
import { BadRequestError } from '@/utils/errors';
import type {
  OrderBookSnapshot,
  FetchOrderBookOptions,
} from '../types/market-data.types';

export class OrderBookService {
  /**
   * Fetch order book from exchange
   */
  static async fetchOrderBook(options: FetchOrderBookOptions): Promise<OrderBookSnapshot> {
    const { exchangeId, symbol, limit = 20 } = options;

    try {
      logger.info('Fetching order book from exchange', { exchangeId, symbol, limit });

      // Create exchange instance (no auth needed for public data)
      const exchange = ExchangeService.createCCXTInstance(exchangeId, {
        apiKey: '',
        apiSecret: '',
      });

      // Fetch order book
      const orderbook = await exchange.fetchOrderBook(symbol, limit);

      // Convert to our format
      const snapshot: OrderBookSnapshot = {
        exchangeId,
        symbol,
        timestamp: new Date(orderbook.timestamp || Date.now()),
        bids: orderbook.bids.map((bid) => [bid[0], bid[1]] as [number, number]),
        asks: orderbook.asks.map((ask) => [ask[0], ask[1]] as [number, number]),
        nonce: orderbook.nonce,
      };

      logger.info('Fetched order book', {
        exchangeId,
        symbol,
        bids: snapshot.bids.length,
        asks: snapshot.asks.length,
      });

      return snapshot;
    } catch (error) {
      logger.error('Failed to fetch order book', {
        exchangeId,
        symbol,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new BadRequestError('Failed to fetch order book from exchange');
    }
  }

  /**
   * Store order book snapshot in database
   */
  static async storeOrderBook(snapshot: OrderBookSnapshot): Promise<void> {
    try {
      logger.info('Storing order book snapshot', {
        exchangeId: snapshot.exchangeId,
        symbol: snapshot.symbol,
        timestamp: snapshot.timestamp,
      });

      await db.insert(marketOrderBookSnapshots).values({
        exchangeId: snapshot.exchangeId,
        symbol: snapshot.symbol,
        timestamp: snapshot.timestamp,
        bids: snapshot.bids as any,
        asks: snapshot.asks as any,
        nonce: snapshot.nonce,
      });

      logger.info('Stored order book snapshot', {
        exchangeId: snapshot.exchangeId,
        symbol: snapshot.symbol,
      });
    } catch (error) {
      logger.error('Failed to store order book', {
        exchangeId: snapshot.exchangeId,
        symbol: snapshot.symbol,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get latest order book snapshot from database
   */
  static async getOrderBook(
    exchangeId: string,
    symbol: string
  ): Promise<OrderBookSnapshot | null> {
    try {
      const [result] = await db
        .select()
        .from(marketOrderBookSnapshots)
        .where(
          and(
            eq(marketOrderBookSnapshots.exchangeId, exchangeId),
            eq(marketOrderBookSnapshots.symbol, symbol)
          )
        )
        .orderBy(desc(marketOrderBookSnapshots.timestamp))
        .limit(1);

      if (!result) return null;

      const snapshot: OrderBookSnapshot = {
        id: result.id,
        exchangeId: result.exchangeId,
        symbol: result.symbol,
        timestamp: result.timestamp,
        bids: result.bids as [number, number][],
        asks: result.asks as [number, number][],
        nonce: result.nonce || undefined,
        createdAt: result.createdAt,
      };

      return snapshot;
    } catch (error) {
      logger.error('Failed to get order book', {
        exchangeId,
        symbol,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get order book depth analysis
   */
  static async getOrderBookDepth(exchangeId: string, symbol: string): Promise<{
    timestamp: Date;
    spread: number;
    spreadPercent: number;
    bidDepth: number;
    askDepth: number;
    totalDepth: number;
    imbalance: number; // -1 to 1, negative = more asks, positive = more bids
  } | null> {
    try {
      const snapshot = await this.getOrderBook(exchangeId, symbol);
      if (!snapshot) return null;

      const bestBid = snapshot.bids[0]?.[0] || 0;
      const bestAsk = snapshot.asks[0]?.[0] || 0;
      const spread = bestAsk - bestBid;
      const spreadPercent = (spread / bestBid) * 100;

      const bidDepth = snapshot.bids.reduce((sum, [price, amount]) => sum + price * amount, 0);
      const askDepth = snapshot.asks.reduce((sum, [price, amount]) => sum + price * amount, 0);
      const totalDepth = bidDepth + askDepth;
      const imbalance = totalDepth > 0 ? (bidDepth - askDepth) / totalDepth : 0;

      return {
        timestamp: snapshot.timestamp,
        spread,
        spreadPercent,
        bidDepth,
        askDepth,
        totalDepth,
        imbalance,
      };
    } catch (error) {
      logger.error('Failed to get order book depth', {
        exchangeId,
        symbol,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get historical order book snapshots
   */
  static async getHistoricalSnapshots(
    exchangeId: string,
    symbol: string,
    limit: number = 100
  ): Promise<OrderBookSnapshot[]> {
    try {
      const results = await db
        .select()
        .from(marketOrderBookSnapshots)
        .where(
          and(
            eq(marketOrderBookSnapshots.exchangeId, exchangeId),
            eq(marketOrderBookSnapshots.symbol, symbol)
          )
        )
        .orderBy(desc(marketOrderBookSnapshots.timestamp))
        .limit(limit);

      return results.map((row) => ({
        id: row.id,
        exchangeId: row.exchangeId,
        symbol: row.symbol,
        timestamp: row.timestamp,
        bids: row.bids as [number, number][],
        asks: row.asks as [number, number][],
        nonce: row.nonce || undefined,
        createdAt: row.createdAt,
      }));
    } catch (error) {
      logger.error('Failed to get historical order book snapshots', {
        exchangeId,
        symbol,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
