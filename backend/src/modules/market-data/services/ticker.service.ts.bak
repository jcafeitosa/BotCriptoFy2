/**
 * Ticker Service
 * Handles ticker/price data collection, storage, and retrieval
 */

import { db } from '@/db';
import { eq, and, desc } from 'drizzle-orm';
import { ExchangeService } from '../../exchanges/services/exchange.service';
import { marketTickers } from '../schema/market-data.schema';
import logger from '@/utils/logger';
import { BadRequestError } from '@/utils/errors';
import type { TickerData, FetchTickerOptions } from '../types/market-data.types';

export class TickerService {
  /**
   * Fetch ticker from exchange
   */
  static async fetchTicker(options: FetchTickerOptions): Promise<TickerData> {
    const { exchangeId, symbol } = options;

    try {
      logger.info('Fetching ticker from exchange', { exchangeId, symbol });

      // Create exchange instance (no auth needed for public data)
      const exchange = ExchangeService.createCCXTInstance(exchangeId, {
        apiKey: '',
        apiSecret: '',
      });

      // Fetch ticker
      const ticker = await exchange.fetchTicker(symbol);

      // Convert to our format
      const tickerData: TickerData = {
        exchangeId,
        symbol: ticker.symbol,
        timestamp: new Date(ticker.timestamp || Date.now()),
        datetime: ticker.datetime,
        high: ticker.high || undefined,
        low: ticker.low || undefined,
        bid: ticker.bid || undefined,
        bidVolume: ticker.bidVolume,
        ask: ticker.ask || undefined,
        askVolume: ticker.askVolume,
        vwap: ticker.vwap,
        open: ticker.open || undefined,
        close: ticker.close || undefined,
        last: ticker.last || undefined,
        previousClose: ticker.previousClose,
        change: ticker.change,
        percentage: ticker.percentage,
        average: ticker.average,
        baseVolume: ticker.baseVolume || undefined,
        quoteVolume: ticker.quoteVolume || undefined,
        info: ticker.info,
      };

      logger.info('Fetched ticker', {
        exchangeId,
        symbol,
        last: tickerData.last,
        change: tickerData.change,
        percentage: tickerData.percentage,
      });

      return tickerData;
    } catch (error) {
      logger.error('Failed to fetch ticker', {
        exchangeId,
        symbol,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new BadRequestError('Failed to fetch ticker from exchange');
    }
  }

  /**
   * Store ticker in database
   */
  static async storeTicker(ticker: TickerData): Promise<void> {
    try {
      logger.info('Storing ticker', {
        exchangeId: ticker.exchangeId,
        symbol: ticker.symbol,
        last: ticker.last,
      });

      // Use UPSERT to update existing ticker or insert new one
      await db
        .insert(marketTickers)
        .values({
          exchangeId: ticker.exchangeId,
          symbol: ticker.symbol,
          timestamp: ticker.timestamp,
          datetime: ticker.datetime,
          high: ticker.high?.toString(),
          low: ticker.low?.toString(),
          bid: ticker.bid?.toString(),
          bidVolume: ticker.bidVolume?.toString(),
          ask: ticker.ask?.toString(),
          askVolume: ticker.askVolume?.toString(),
          vwap: ticker.vwap?.toString(),
          open: ticker.open?.toString(),
          close: ticker.close?.toString(),
          last: ticker.last?.toString(),
          previousClose: ticker.previousClose?.toString(),
          change: ticker.change?.toString(),
          percentage: ticker.percentage?.toString(),
          average: ticker.average?.toString(),
          baseVolume: ticker.baseVolume?.toString(),
          quoteVolume: ticker.quoteVolume?.toString(),
          info: ticker.info as any,
        })
        .onConflictDoUpdate({
          target: [marketTickers.exchangeId, marketTickers.symbol],
          set: {
            timestamp: ticker.timestamp,
            datetime: ticker.datetime,
            high: ticker.high?.toString(),
            low: ticker.low?.toString(),
            bid: ticker.bid?.toString(),
            bidVolume: ticker.bidVolume?.toString(),
            ask: ticker.ask?.toString(),
            askVolume: ticker.askVolume?.toString(),
            vwap: ticker.vwap?.toString(),
            open: ticker.open?.toString(),
            close: ticker.close?.toString(),
            last: ticker.last?.toString(),
            previousClose: ticker.previousClose?.toString(),
            change: ticker.change?.toString(),
            percentage: ticker.percentage?.toString(),
            average: ticker.average?.toString(),
            baseVolume: ticker.baseVolume?.toString(),
            quoteVolume: ticker.quoteVolume?.toString(),
            info: ticker.info as any,
            updatedAt: new Date(),
          },
        });

      logger.info('Stored ticker', {
        exchangeId: ticker.exchangeId,
        symbol: ticker.symbol,
      });
    } catch (error) {
      logger.error('Failed to store ticker', {
        exchangeId: ticker.exchangeId,
        symbol: ticker.symbol,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get ticker from database
   */
  static async getTicker(exchangeId: string, symbol: string): Promise<TickerData | null> {
    try {
      const [result] = await db
        .select()
        .from(marketTickers)
        .where(
          and(
            eq(marketTickers.exchangeId, exchangeId),
            eq(marketTickers.symbol, symbol)
          )
        )
        .orderBy(desc(marketTickers.timestamp))
        .limit(1);

      if (!result) return null;

      const ticker: TickerData = {
        id: result.id,
        exchangeId: result.exchangeId,
        symbol: result.symbol,
        timestamp: result.timestamp,
        datetime: result.datetime || undefined,
        high: result.high ? parseFloat(result.high) : undefined,
        low: result.low ? parseFloat(result.low) : undefined,
        bid: result.bid ? parseFloat(result.bid) : undefined,
        bidVolume: result.bidVolume ? parseFloat(result.bidVolume) : undefined,
        ask: result.ask ? parseFloat(result.ask) : undefined,
        askVolume: result.askVolume ? parseFloat(result.askVolume) : undefined,
        vwap: result.vwap ? parseFloat(result.vwap) : undefined,
        open: result.open ? parseFloat(result.open) : undefined,
        close: result.close ? parseFloat(result.close) : undefined,
        last: result.last ? parseFloat(result.last) : undefined,
        previousClose: result.previousClose ? parseFloat(result.previousClose) : undefined,
        change: result.change ? parseFloat(result.change) : undefined,
        percentage: result.percentage ? parseFloat(result.percentage) : undefined,
        average: result.average ? parseFloat(result.average) : undefined,
        baseVolume: result.baseVolume ? parseFloat(result.baseVolume) : undefined,
        quoteVolume: result.quoteVolume ? parseFloat(result.quoteVolume) : undefined,
        info: result.info,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      };

      return ticker;
    } catch (error) {
      logger.error('Failed to get ticker', {
        exchangeId,
        symbol,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get all tickers for an exchange
   */
  static async getAllTickers(exchangeId: string): Promise<TickerData[]> {
    try {
      const results = await db
        .select()
        .from(marketTickers)
        .where(eq(marketTickers.exchangeId, exchangeId))
        .orderBy(desc(marketTickers.timestamp));

      return results.map((row) => ({
        id: row.id,
        exchangeId: row.exchangeId,
        symbol: row.symbol,
        timestamp: row.timestamp,
        datetime: row.datetime || undefined,
        high: row.high ? parseFloat(row.high) : undefined,
        low: row.low ? parseFloat(row.low) : undefined,
        bid: row.bid ? parseFloat(row.bid) : undefined,
        bidVolume: row.bidVolume ? parseFloat(row.bidVolume) : undefined,
        ask: row.ask ? parseFloat(row.ask) : undefined,
        askVolume: row.askVolume ? parseFloat(row.askVolume) : undefined,
        vwap: row.vwap ? parseFloat(row.vwap) : undefined,
        open: row.open ? parseFloat(row.open) : undefined,
        close: row.close ? parseFloat(row.close) : undefined,
        last: row.last ? parseFloat(row.last) : undefined,
        previousClose: row.previousClose ? parseFloat(row.previousClose) : undefined,
        change: row.change ? parseFloat(row.change) : undefined,
        percentage: row.percentage ? parseFloat(row.percentage) : undefined,
        average: row.average ? parseFloat(row.average) : undefined,
        baseVolume: row.baseVolume ? parseFloat(row.baseVolume) : undefined,
        quoteVolume: row.quoteVolume ? parseFloat(row.quoteVolume) : undefined,
        info: row.info,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }));
    } catch (error) {
      logger.error('Failed to get all tickers', {
        exchangeId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Fetch and store ticker (combined operation)
   */
  static async fetchAndStore(exchangeId: string, symbol: string): Promise<TickerData> {
    const ticker = await this.fetchTicker({ exchangeId, symbol });
    await this.storeTicker(ticker);
    return ticker;
  }

  /**
   * Get price change statistics
   */
  static async getPriceStats(exchangeId: string, symbol: string): Promise<{
    current: number;
    open: number;
    high: number;
    low: number;
    change: number;
    changePercent: number;
    volume24h: number;
    timestamp: Date;
  } | null> {
    try {
      const ticker = await this.getTicker(exchangeId, symbol);
      if (!ticker) return null;

      return {
        current: ticker.last || 0,
        open: ticker.open || 0,
        high: ticker.high || 0,
        low: ticker.low || 0,
        change: ticker.change || 0,
        changePercent: ticker.percentage || 0,
        volume24h: ticker.baseVolume || 0,
        timestamp: ticker.timestamp,
      };
    } catch (error) {
      logger.error('Failed to get price stats', {
        exchangeId,
        symbol,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
