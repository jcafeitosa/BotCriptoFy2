// @ts-nocheck
/**
 * Backtest Service
 * Manages backtest execution, storage, and retrieval
 */

import { db } from '@/db';
import { eq, and, desc, gte, lte, inArray } from 'drizzle-orm';
import { backtestResults, backtestRuns, backtestComparisons } from '../schema/backtest.schema';
import { backtestEngine } from '../engine';
import type { BacktestConfig, BacktestResult } from '../engine/backtest-engine.types';
import type { TradingStrategy } from '../../strategies/types/strategies.types';
import logger from '@/utils/logger';
import { NotFoundError, BadRequestError } from '@/utils/errors';

/**
 * Create Backtest Request
 */
export interface CreateBacktestRequest {
  userId: string;
  tenantId: string;
  strategyId: string;
  name: string;
  description?: string;
  symbol: string;
  timeframe: string;
  startDate: Date;
  endDate: Date;
  initialCapital?: number;
  positionSizePercent?: number;
  commission?: number;
  slippage?: number;
}

/**
 * Backtest Service
 */
export class BacktestService {
  /**
   * Create and run a new backtest
   */
  static async createAndRun(
    request: CreateBacktestRequest,
    strategy: TradingStrategy
  ): Promise<{ runId: string; resultId: string | null }> {
    try {
      logger.info('Creating and running backtest', {
        userId: request.userId,
        strategy: strategy.name,
        symbol: request.symbol,
      });

      // Create backtest run record
      const [run] = await db
        .insert(backtestRuns)
        .values({
          userId: request.userId,
          tenantId: request.tenantId,
          strategyId: request.strategyId,
          config: {
            strategy,
            symbol: request.symbol,
            timeframe: request.timeframe,
            startDate: request.startDate,
            endDate: request.endDate,
            initialCapital: request.initialCapital || 10000,
            positionSizePercent: request.positionSizePercent || 10,
            commission: request.commission || 0.1,
            slippage: request.slippage || 0.05,
          } as BacktestConfig,
          status: 'running',
          progress: 0,
        })
        .returning();

      try {
        // Prepare backtest configuration
        const config: BacktestConfig = {
          strategy,
          symbol: request.symbol,
          timeframe: request.timeframe,
          startDate: request.startDate,
          endDate: request.endDate,
          initialCapital: request.initialCapital || 10000,
          positionSizePercent: request.positionSizePercent || 10,
          commission: request.commission || 0.1,
          slippage: request.slippage || 0.05,
        };

        // Run backtest
        const result = await backtestEngine.run(config);

        // Save backtest result
        const [savedResult] = await db
          .insert(backtestResults)
          .values({
            userId: request.userId,
            tenantId: request.tenantId,
            strategyId: request.strategyId,
            name: request.name,
            description: request.description,
            symbol: request.symbol,
            timeframe: request.timeframe,
            startDate: request.startDate,
            endDate: request.endDate,

            // Configuration
            initialCapital: config.initialCapital.toString(),
            positionSizePercent: config.positionSizePercent.toString(),
            commission: config.commission.toString(),
            slippage: config.slippage.toString(),

            // Metrics
            totalTrades: result.metrics.totalTrades,
            winningTrades: result.metrics.winningTrades,
            losingTrades: result.metrics.losingTrades,
            winRate: result.metrics.winRate.toString(),

            totalReturn: result.metrics.totalReturn.toString(),
            totalReturnPercent: result.metrics.totalReturnPercent.toString(),
            averageReturn: result.metrics.averageReturn.toString(),
            averageReturnPercent: result.metrics.averageReturnPercent.toString(),

            averageWin: result.metrics.averageWin.toString(),
            averageLoss: result.metrics.averageLoss.toString(),
            largestWin: result.metrics.largestWin.toString(),
            largestLoss: result.metrics.largestLoss.toString(),
            profitFactor: result.metrics.profitFactor.toString(),

            sharpeRatio: result.metrics.sharpeRatio?.toString(),
            sortinoRatio: result.metrics.sortinoRatio?.toString(),
            maxDrawdown: result.metrics.maxDrawdown.toString(),
            maxDrawdownPercent: result.metrics.maxDrawdownPercent.toString(),
            maxConsecutiveWins: result.metrics.maxConsecutiveWins,
            maxConsecutiveLosses: result.metrics.maxConsecutiveLosses,

            averageHoldingPeriod: result.metrics.averageHoldingPeriod,
            averageTimeBetweenTrades: result.metrics.averageTimeBetweenTrades,
            totalBacktestPeriod: result.metrics.totalBacktestPeriod,

            finalCapital: result.metrics.finalCapital.toString(),
            peakCapital: result.metrics.peakCapital.toString(),

            longTrades: result.metrics.longTrades,
            shortTrades: result.metrics.shortTrades,
            averageTradesPerDay: result.metrics.averageTradesPerDay.toString(),

            executionTime: result.executionTime,
            dataPointsProcessed: result.dataPointsProcessed,

            trades: result.trades as any,
            equityCurve: result.equityCurve as any,
            analysis: result.analysis as any,

            status: 'completed',
          })
          .returning();

        // Update run record
        await db
          .update(backtestRuns)
          .set({
            status: 'completed',
            progress: 100,
            completedAt: new Date(),
            resultId: savedResult.id,
          })
          .where(eq(backtestRuns.id, run.id));

        logger.info('Backtest completed successfully', {
          runId: run.id,
          resultId: savedResult.id,
          metrics: {
            totalTrades: result.metrics.totalTrades,
            winRate: result.metrics.winRate,
            totalReturn: result.metrics.totalReturnPercent,
          },
        });

        return { runId: run.id, resultId: savedResult.id };
      } catch (error) {
        // Update run record with error
        await db
          .update(backtestRuns)
          .set({
            status: 'failed',
            completedAt: new Date(),
            error: error instanceof Error ? error.message : String(error),
          })
          .where(eq(backtestRuns.id, run.id));

        logger.error('Backtest execution failed', {
          runId: run.id,
          error: error instanceof Error ? error.message : String(error),
        });

        throw error;
      }
    } catch (error) {
      logger.error('Failed to create and run backtest', {
        userId: request.userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get backtest result by ID
   */
  static async getResult(id: string, userId: string): Promise<BacktestResult | null> {
    try {
      const [result] = await db
        .select()
        .from(backtestResults)
        .where(and(eq(backtestResults.id, id), eq(backtestResults.userId, userId)))
        .limit(1);

      if (!result) {
        return null;
      }

      return this.mapResultFromDB(result);
    } catch (error) {
      logger.error('Failed to get backtest result', {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * List backtest results for a user
   */
  static async listResults(userId: string, filters?: {
    strategyId?: string;
    symbol?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<BacktestResult[]> {
    try {
      const conditions = [eq(backtestResults.userId, userId)];

      if (filters?.strategyId) {
        conditions.push(eq(backtestResults.strategyId, filters.strategyId));
      }
      if (filters?.symbol) {
        conditions.push(eq(backtestResults.symbol, filters.symbol));
      }
      if (filters?.startDate) {
        conditions.push(gte(backtestResults.startDate, filters.startDate));
      }
      if (filters?.endDate) {
        conditions.push(lte(backtestResults.endDate, filters.endDate));
      }

      const results = await db
        .select()
        .from(backtestResults)
        .where(and(...conditions))
        .orderBy(desc(backtestResults.createdAt))
        .limit(filters?.limit || 100);

      return results.map((r) => this.mapResultFromDB(r));
    } catch (error) {
      logger.error('Failed to list backtest results', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Compare multiple backtest results
   */
  static async compareResults(
    userId: string,
    tenantId: string,
    name: string,
    resultIds: string[]
  ): Promise<{ comparisonId: string; analysis: any }> {
    try {
      if (resultIds.length < 2) {
        throw new BadRequestError('At least 2 results are required for comparison');
      }

      logger.info('Comparing backtest results', { userId, resultIds });

      // Fetch all results
      const results = await db
        .select()
        .from(backtestResults)
        .where(and(eq(backtestResults.userId, userId), inArray(backtestResults.id, resultIds)));

      if (results.length !== resultIds.length) {
        throw new NotFoundError('Some backtest results not found');
      }

      // Analyze and compare
      const analysis = {
        bestPerformer: '',
        worstPerformer: '',
        metrics: {
          totalReturnPercent: results.map((r) => ({
            resultId: r.id,
            strategyName: r.name,
            value: parseFloat(r.totalReturnPercent),
          })),
          winRate: results.map((r) => ({
            resultId: r.id,
            strategyName: r.name,
            value: parseFloat(r.winRate),
          })),
          sharpeRatio: results.map((r) => ({
            resultId: r.id,
            strategyName: r.name,
            value: r.sharpeRatio ? parseFloat(r.sharpeRatio) : null,
          })),
          maxDrawdownPercent: results.map((r) => ({
            resultId: r.id,
            strategyName: r.name,
            value: parseFloat(r.maxDrawdownPercent),
          })),
          profitFactor: results.map((r) => ({
            resultId: r.id,
            strategyName: r.name,
            value: parseFloat(r.profitFactor),
          })),
        },
      };

      // Find best/worst performers
      const sorted = [...results].sort(
        (a, b) => parseFloat(b.totalReturnPercent) - parseFloat(a.totalReturnPercent)
      );
      analysis.bestPerformer = sorted[0].id;
      analysis.worstPerformer = sorted[sorted.length - 1].id;

      // Save comparison
      const [comparison] = await db
        .insert(backtestComparisons)
        .values({
          userId,
          tenantId,
          name,
          resultIds,
          analysis,
        })
        .returning();

      logger.info('Backtest comparison created', {
        comparisonId: comparison.id,
        resultCount: results.length,
      });

      return { comparisonId: comparison.id, analysis };
    } catch (error) {
      logger.error('Failed to compare backtest results', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Delete backtest result
   */
  static async deleteResult(id: string, userId: string): Promise<void> {
    try {
      const result = await db
        .delete(backtestResults)
        .where(and(eq(backtestResults.id, id), eq(backtestResults.userId, userId)));

      if (!result.rowCount) {
        throw new NotFoundError('Backtest result not found');
      }

      logger.info('Backtest result deleted', { id, userId });
    } catch (error) {
      logger.error('Failed to delete backtest result', {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Archive old backtest results
   */
  static async archiveOldResults(olderThanDays: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await db
        .update(backtestResults)
        .set({ isArchived: true })
        .where(and(lte(backtestResults.createdAt, cutoffDate), eq(backtestResults.isArchived, false)));

      logger.info('Archived old backtest results', {
        olderThanDays,
        archivedCount: result.rowCount || 0,
      });

      return result.rowCount || 0;
    } catch (error) {
      logger.error('Failed to archive old backtest results', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Map database row to BacktestResult
   */
  private static mapResultFromDB(row: any): BacktestResult {
    // Note: strategy object would need to be reconstructed or fetched separately
    // For now, we'll use a placeholder
    const placeholderStrategy: TradingStrategy = {
      id: row.strategyId,
      userId: row.userId,
      tenantId: row.tenantId,
      name: row.name,
      description: row.description || '',
      type: 'technical' as any,
      indicators: [],
      rules: { entry: [], exit: [] },
      risk: { stopLossPercent: 0, takeProfitPercent: 0 },
      status: 'active',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };

    return {
      config: {
        strategy: placeholderStrategy,
        symbol: row.symbol,
        timeframe: row.timeframe,
        startDate: row.startDate,
        endDate: row.endDate,
        initialCapital: parseFloat(row.initialCapital),
        positionSizePercent: parseFloat(row.positionSizePercent),
        commission: parseFloat(row.commission),
        slippage: parseFloat(row.slippage),
      },
      metrics: {
        totalTrades: row.totalTrades,
        winningTrades: row.winningTrades,
        losingTrades: row.losingTrades,
        winRate: parseFloat(row.winRate),
        totalReturn: parseFloat(row.totalReturn),
        totalReturnPercent: parseFloat(row.totalReturnPercent),
        averageReturn: parseFloat(row.averageReturn),
        averageReturnPercent: parseFloat(row.averageReturnPercent),
        averageWin: parseFloat(row.averageWin),
        averageLoss: parseFloat(row.averageLoss),
        largestWin: parseFloat(row.largestWin),
        largestLoss: parseFloat(row.largestLoss),
        profitFactor: parseFloat(row.profitFactor),
        sharpeRatio: row.sharpeRatio ? parseFloat(row.sharpeRatio) : 0,
        sortinoRatio: row.sortinoRatio ? parseFloat(row.sortinoRatio) : 0,
        maxDrawdown: parseFloat(row.maxDrawdown),
        maxDrawdownPercent: parseFloat(row.maxDrawdownPercent),
        maxConsecutiveWins: row.maxConsecutiveWins,
        maxConsecutiveLosses: row.maxConsecutiveLosses,
        averageHoldingPeriod: row.averageHoldingPeriod,
        averageTimeBetweenTrades: row.averageTimeBetweenTrades,
        totalBacktestPeriod: row.totalBacktestPeriod,
        initialCapital: parseFloat(row.initialCapital),
        finalCapital: parseFloat(row.finalCapital),
        peakCapital: parseFloat(row.peakCapital),
        longTrades: row.longTrades,
        shortTrades: row.shortTrades,
        averageTradesPerDay: parseFloat(row.averageTradesPerDay),
      },
      trades: row.trades,
      equityCurve: row.equityCurve,
      analysis: row.analysis,
      executionTime: row.executionTime,
      dataPointsProcessed: row.dataPointsProcessed,
    };
  }
}
