/**
 * Trades Service
 * Handles trades data collection, storage, and retrieval
 */

import { db } from '@/db';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { ExchangeService } from '../../exchanges/services/exchange.service';
import { marketTrades } from '../schema/market-data.schema';
import logger from '@/utils/logger';
import { BadRequestError } from '@/utils/errors';
import type {
  TradeData,
  FetchTradesOptions,
  MarketDataQuery,
  BatchInsertResult,
} from '../types/market-data.types';

export class TradesService {
  /**
   * Fetch trades from exchange
   */
  static async fetchTrades(options: FetchTradesOptions): Promise<TradeData[]> {
    const { exchangeId, symbol, since, limit = 1000 } = options;

    try {
      logger.info('Fetching trades from exchange', { exchangeId, symbol, since, limit });

      // Create exchange instance (no auth needed for public data)
      const exchange = ExchangeService.createCCXTInstance(exchangeId, {
        apiKey: '',
        apiSecret: '',
      });

      // Fetch trades
      const tradesData = await exchange.fetchTrades(
        symbol,
        since ? since.getTime() : undefined,
        limit
      );

      // Convert to our format
      const trades: TradeData[] = tradesData.map((trade) => ({
        exchangeId,
        symbol: String(trade.symbol || ''),
        tradeId: String(trade.id || ''),
        timestamp: new Date(Number(trade.timestamp || Date.now())),
        price: Number(trade.price || 0),
        amount: Number(trade.amount || 0),
        cost: Number(trade.cost || 0),
        side: (trade.side as 'buy' | 'sell') || 'buy',
        takerOrMaker: trade.takerOrMaker as 'taker' | 'maker' | undefined,
        fee: trade.fee as any,
        info: trade.info,
      }));

      logger.info('Fetched trades', {
        exchangeId,
        symbol,
        count: trades.length,
      });

      return trades;
    } catch (error) {
      logger.error('Failed to fetch trades', {
        exchangeId,
        symbol,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new BadRequestError('Failed to fetch trades from exchange');
    }
  }

  /**
   * Store trades in database
   */
  static async storeTrades(trades: TradeData[]): Promise<BatchInsertResult> {
    if (trades.length === 0) {
      return { inserted: 0, updated: 0, failed: 0 };
    }

    const result: BatchInsertResult = {
      inserted: 0,
      updated: 0,
      failed: 0,
      errors: [],
    };

    try {
      logger.info('Storing trades', { count: trades.length });

      for (const trade of trades) {
        try {
          // Check if trade already exists (by exchange + tradeId)
          const [existing] = await db
            .select()
            .from(marketTrades)
            .where(
              and(
                eq(marketTrades.exchangeId, trade.exchangeId),
                eq(marketTrades.tradeId, trade.tradeId)
              )
            )
            .limit(1);

          if (existing) {
            result.updated++;
            continue; // Skip duplicate trades
          }

          await db.insert(marketTrades).values({
            exchangeId: trade.exchangeId,
            symbol: trade.symbol,
            tradeId: trade.tradeId,
            timestamp: trade.timestamp,
            price: trade.price.toString(),
            amount: trade.amount.toString(),
            cost: trade.cost.toString(),
            side: trade.side,
            takerOrMaker: trade.takerOrMaker,
            fee: trade.fee as any,
            info: trade.info as any,
          });

          result.inserted++;
        } catch (error) {
          result.failed++;
          result.errors?.push({
            record: trade,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      logger.info('Stored trades', result);

      return result;
    } catch (error) {
      logger.error('Failed to store trades', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get trades from database
   */
  static async getTrades(query: MarketDataQuery): Promise<TradeData[]> {
    const { exchangeId, symbol, startDate, endDate, limit = 1000, offset = 0 } = query;

    try {
      const conditions = [
        eq(marketTrades.exchangeId, exchangeId),
        eq(marketTrades.symbol, symbol),
      ];

      if (startDate) {
        conditions.push(gte(marketTrades.timestamp, startDate));
      }

      if (endDate) {
        conditions.push(lte(marketTrades.timestamp, endDate));
      }

      const results = await db
        .select()
        .from(marketTrades)
        .where(and(...conditions))
        .orderBy(desc(marketTrades.timestamp))
        .limit(limit)
        .offset(offset);

      const trades: TradeData[] = results.map((row) => ({
        id: row.id,
        exchangeId: row.exchangeId,
        symbol: row.symbol,
        tradeId: row.tradeId,
        timestamp: row.timestamp,
        price: parseFloat(row.price),
        amount: parseFloat(row.amount),
        cost: parseFloat(row.cost),
        side: row.side as 'buy' | 'sell',
        takerOrMaker: row.takerOrMaker as 'taker' | 'maker' | undefined,
        fee: row.fee as any,
        info: row.info,
        createdAt: row.createdAt,
      }));

      return trades;
    } catch (error) {
      logger.error('Failed to get trades', {
        exchangeId,
        symbol,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get trade statistics for a time period
   */
  static async getTradeStats(
    exchangeId: string,
    symbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalTrades: number;
    totalVolume: number;
    buyVolume: number;
    sellVolume: number;
    avgPrice: number;
    maxPrice: number;
    minPrice: number;
    vwap: number; // Volume Weighted Average Price
  }> {
    try {
      const trades = await this.getTrades({
        exchangeId,
        symbol,
        startDate,
        endDate,
        limit: 100000, // Get all trades in period
      });

      if (trades.length === 0) {
        return {
          totalTrades: 0,
          totalVolume: 0,
          buyVolume: 0,
          sellVolume: 0,
          avgPrice: 0,
          maxPrice: 0,
          minPrice: 0,
          vwap: 0,
        };
      }

      const totalTrades = trades.length;
      const totalVolume = trades.reduce((sum, t) => sum + t.amount, 0);
      const buyVolume = trades.filter((t) => t.side === 'buy').reduce((sum, t) => sum + t.amount, 0);
      const sellVolume = trades.filter((t) => t.side === 'sell').reduce((sum, t) => sum + t.amount, 0);

      const prices = trades.map((t) => t.price);
      const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      const maxPrice = Math.max(...prices);
      const minPrice = Math.min(...prices);

      // Calculate VWAP
      const totalValue = trades.reduce((sum, t) => sum + t.price * t.amount, 0);
      const vwap = totalVolume > 0 ? totalValue / totalVolume : 0;

      return {
        totalTrades,
        totalVolume,
        buyVolume,
        sellVolume,
        avgPrice,
        maxPrice,
        minPrice,
        vwap,
      };
    } catch (error) {
      logger.error('Failed to get trade stats', {
        exchangeId,
        symbol,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get recent large trades (whales)
   */
  static async getLargeTrades(
    exchangeId: string,
    symbol: string,
    minAmount: number,
    limit: number = 100
  ): Promise<TradeData[]> {
    try {
      const allTrades = await this.getTrades({
        exchangeId,
        symbol,
        limit: limit * 10, // Get more trades and filter
      });

      // Filter by minimum amount and sort by amount descending
      const largeTrades = allTrades
        .filter((trade) => trade.amount >= minAmount)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, limit);

      logger.info('Found large trades', {
        exchangeId,
        symbol,
        minAmount,
        count: largeTrades.length,
      });

      return largeTrades;
    } catch (error) {
      logger.error('Failed to get large trades', {
        exchangeId,
        symbol,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Calculate buy/sell pressure
   */
  static async getTradePressure(
    exchangeId: string,
    symbol: string,
    minutes: number = 60
  ): Promise<{
    period: { start: Date; end: Date };
    buyPressure: number; // 0 to 1
    sellPressure: number; // 0 to 1
    netPressure: number; // -1 to 1 (negative = sell pressure, positive = buy pressure)
    buyVolume: number;
    sellVolume: number;
    totalVolume: number;
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - minutes * 60 * 1000);

      const trades = await this.getTrades({
        exchangeId,
        symbol,
        startDate,
        endDate,
        limit: 100000,
      });

      const buyVolume = trades
        .filter((t) => t.side === 'buy')
        .reduce((sum, t) => sum + t.amount, 0);
      const sellVolume = trades
        .filter((t) => t.side === 'sell')
        .reduce((sum, t) => sum + t.amount, 0);
      const totalVolume = buyVolume + sellVolume;

      const buyPressure = totalVolume > 0 ? buyVolume / totalVolume : 0.5;
      const sellPressure = totalVolume > 0 ? sellVolume / totalVolume : 0.5;
      const netPressure = buyPressure - sellPressure;

      return {
        period: { start: startDate, end: endDate },
        buyPressure,
        sellPressure,
        netPressure,
        buyVolume,
        sellVolume,
        totalVolume,
      };
    } catch (error) {
      logger.error('Failed to get trade pressure', {
        exchangeId,
        symbol,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
