/**
 * Performance Service
 * Complete implementation for calculating trading performance metrics:
 * Sharpe ratio, Sortino ratio, max drawdown, win rate, profit factor, and more
 */

import { db } from '../../../db';
import { socialPerformance, socialCopiedTrades } from '../schema/social.schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import type { PerformanceMetrics, PerformancePeriod, ServiceResponse } from '../types/social.types';

export interface CalculatePerformanceRequest {
  traderId: string;
  tenantId: string;
  period: PerformancePeriod;
  startDate?: Date;
  endDate?: Date;
}

export interface TradeData {
  pnl: number;
  entryPrice: number;
  exitPrice: number;
  amount: number;
  entryTime: Date;
  exitTime: Date;
}

/**
 * Calculate Sharpe Ratio
 * Measures risk-adjusted returns
 * Formula: (Average Return - Risk Free Rate) / Standard Deviation of Returns
 */
function calculateSharpeRatio(returns: number[], riskFreeRate = 0.02): number {
  if (returns.length === 0) return 0;

  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;

  return (avgReturn - riskFreeRate / 252) / stdDev; // 252 trading days per year
}

/**
 * Calculate Sortino Ratio
 * Like Sharpe but only considers downside volatility
 * Formula: (Average Return - Risk Free Rate) / Downside Deviation
 */
function calculateSortinoRatio(returns: number[], riskFreeRate = 0.02): number {
  if (returns.length === 0) return 0;

  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const negativeReturns = returns.filter(r => r < 0);

  if (negativeReturns.length === 0) return 0;

  const downsideVariance = negativeReturns.reduce((sum, ret) => sum + Math.pow(ret, 2), 0) / negativeReturns.length;
  const downsideDeviation = Math.sqrt(downsideVariance);

  if (downsideDeviation === 0) return 0;

  return (avgReturn - riskFreeRate / 252) / downsideDeviation;
}

/**
 * Calculate Maximum Drawdown
 * Measures the largest peak-to-trough decline
 */
function calculateMaxDrawdown(cumulativePnl: number[]): number {
  if (cumulativePnl.length === 0) return 0;

  let maxDrawdown = 0;
  let peak = cumulativePnl[0];

  for (const value of cumulativePnl) {
    if (value > peak) {
      peak = value;
    }
    const drawdown = (peak - value) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown * 100; // Return as percentage
}

/**
 * Calculate Win Rate
 */
function calculateWinRate(trades: TradeData[]): number {
  if (trades.length === 0) return 0;
  const winningTrades = trades.filter(t => t.pnl > 0).length;
  return (winningTrades / trades.length) * 100;
}

/**
 * Calculate Profit Factor
 * Ratio of gross profit to gross loss
 */
function calculateProfitFactor(trades: TradeData[]): number {
  const grossProfit = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));

  if (grossLoss === 0) return grossProfit > 0 ? 999 : 0;

  return grossProfit / grossLoss;
}

/**
 * Calculate Average Win and Average Loss
 */
function calculateAvgWinLoss(trades: TradeData[]): { avgWin: number; avgLoss: number } {
  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);

  const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length : 0;

  return { avgWin, avgLoss: Math.abs(avgLoss) };
}

/**
 * Get performance metrics for a trader
 */
export async function getPerformance(
  traderId: string,
  tenantId: string,
  period: PerformancePeriod
): Promise<ServiceResponse<PerformanceMetrics>> {
  try {
    const performance = await db.query.socialPerformance.findFirst({
      where: and(
        eq(socialPerformance.traderId, traderId),
        eq(socialPerformance.tenantId, tenantId),
        eq(socialPerformance.period, period)
      ),
      orderBy: desc(socialPerformance.date),
    });

    if (!performance) {
      return { success: false, error: 'Performance data not found', code: 'PERFORMANCE_NOT_FOUND' };
    }

    return { success: true, data: performance as PerformanceMetrics };
  } catch (error) {
    return { success: false, error: 'Failed to get performance', code: 'GET_PERFORMANCE_FAILED' };
  }
}

/**
 * Calculate and store performance metrics for a trader
 */
export async function calculatePerformance(request: CalculatePerformanceRequest): Promise<ServiceResponse<PerformanceMetrics>> {
  try {
    const { traderId, tenantId, period, startDate, endDate } = request;

    // Get all closed trades for the period
    const conditions = [
      eq(socialCopiedTrades.traderId, traderId),
      eq(socialCopiedTrades.tenantId, tenantId),
      eq(socialCopiedTrades.status, 'closed'),
    ];

    if (startDate) {
      conditions.push(gte(socialCopiedTrades.closedAt, startDate));
    }

    if (endDate) {
      conditions.push(lte(socialCopiedTrades.closedAt, endDate));
    }

    const trades = await db.query.socialCopiedTrades.findMany({
      where: and(...conditions),
      orderBy: socialCopiedTrades.closedAt,
    });

    if (trades.length === 0) {
      return { success: false, error: 'No trades found for period', code: 'NO_TRADES' };
    }

    // Convert to TradeData format
    const tradeData: TradeData[] = trades.map(t => ({
      pnl: parseFloat(t.profit || '0'),
      entryPrice: parseFloat(t.entryPrice),
      exitPrice: parseFloat(t.exitPrice || '0'),
      amount: parseFloat(t.amount),
      entryTime: t.copiedAt,
      exitTime: t.closedAt!,
    }));

    // Calculate returns (PnL percentages)
    const returns = tradeData.map(t => {
      const pnlPercent = ((t.exitPrice - t.entryPrice) / t.entryPrice) * 100;
      return pnlPercent;
    });

    // Calculate cumulative PnL
    const cumulativePnl = returns.reduce((acc, ret, idx) => {
      const prevValue = idx > 0 ? acc[idx - 1] : 100;
      acc.push(prevValue * (1 + ret / 100));
      return acc;
    }, [] as number[]);

    // Calculate all metrics
    const totalTrades = trades.length;
    const winningTrades = tradeData.filter(t => t.pnl > 0).length;
    const losingTrades = tradeData.filter(t => t.pnl < 0).length;
    const winRate = calculateWinRate(tradeData);
    const profitFactor = calculateProfitFactor(tradeData);
    const { avgWin, avgLoss } = calculateAvgWinLoss(tradeData);
    const sharpeRatio = calculateSharpeRatio(returns);
    const sortinoRatio = calculateSortinoRatio(returns);
    const maxDrawdown = calculateMaxDrawdown(cumulativePnl);

    // Calculate profit/loss breakdown
    const totalProfit = tradeData.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
    const totalLoss = Math.abs(tradeData.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
    const netProfit = totalProfit - totalLoss;
    const roi = (netProfit / (totalProfit + totalLoss || 1)) * 100;

    // Store performance metrics
    const [performance] = await db.insert(socialPerformance).values({
      tenantId,
      traderId,
      period,
      date: endDate || new Date(),
      totalTrades,
      winningTrades,
      losingTrades,
      winRate: winRate.toString(),
      profitFactor: profitFactor.toString(),
      sharpeRatio: sharpeRatio.toString(),
      sortinoRatio: sortinoRatio.toString(),
      maxDrawdown: maxDrawdown.toString(),
      avgWin: avgWin.toString(),
      avgLoss: avgLoss.toString(),
      totalProfit: totalProfit.toString(),
      totalLoss: totalLoss.toString(),
      netProfit: netProfit.toString(),
      roi: roi.toString(),
    }).returning();

    return { success: true, data: performance as PerformanceMetrics };
  } catch (error) {
    return { success: false, error: 'Failed to calculate performance', code: 'CALCULATE_PERFORMANCE_FAILED' };
  }
}

/**
 * Get performance history for multiple periods
 */
export async function getPerformanceHistory(
  traderId: string,
  tenantId: string,
  periods: PerformancePeriod[]
): Promise<ServiceResponse<PerformanceMetrics[]>> {
  try {
    const performances = await db.query.socialPerformance.findMany({
      where: and(
        eq(socialPerformance.traderId, traderId),
        eq(socialPerformance.tenantId, tenantId)
      ),
      orderBy: desc(socialPerformance.date),
    });

    const filtered = periods.length > 0
      ? performances.filter(p => periods.includes(p.period as PerformancePeriod))
      : performances;

    return { success: true, data: filtered as PerformanceMetrics[] };
  } catch (error) {
    return { success: false, error: 'Failed to get performance history', code: 'GET_HISTORY_FAILED' };
  }
}

/**
 * Compare performance between multiple traders
 */
export async function comparePerformance(
  traderIds: string[],
  tenantId: string,
  period: PerformancePeriod
): Promise<ServiceResponse<PerformanceMetrics[]>> {
  try {
    const performances = await db.query.socialPerformance.findMany({
      where: and(
        eq(socialPerformance.tenantId, tenantId),
        eq(socialPerformance.period, period)
      ),
      orderBy: desc(socialPerformance.winRate),
    });

    const filtered = performances.filter(p => traderIds.includes(p.traderId));

    return { success: true, data: filtered as PerformanceMetrics[] };
  } catch (error) {
    return { success: false, error: 'Failed to compare performance', code: 'COMPARE_FAILED' };
  }
}

/**
 * Get top performers by specific metric
 */
export async function getTopPerformers(
  tenantId: string,
  period: PerformancePeriod,
  metric: 'winRate' | 'profitFactor' | 'sharpeRatio' | 'netProfit' = 'winRate',
  limit = 10
): Promise<ServiceResponse<PerformanceMetrics[]>> {
  try {
    const metricColumn = {
      winRate: socialPerformance.winRate,
      profitFactor: socialPerformance.profitFactor,
      sharpeRatio: socialPerformance.sharpeRatio,
      netProfit: socialPerformance.netProfit,
    }[metric];

    const performances = await db.query.socialPerformance.findMany({
      where: and(
        eq(socialPerformance.tenantId, tenantId),
        eq(socialPerformance.period, period)
      ),
      orderBy: desc(metricColumn),
      limit,
    });

    return { success: true, data: performances as PerformanceMetrics[] };
  } catch (error) {
    return { success: false, error: 'Failed to get top performers', code: 'GET_TOP_PERFORMERS_FAILED' };
  }
}

/**
 * Delete performance data for a trader
 */
export async function deletePerformance(
  traderId: string,
  tenantId: string,
  period?: PerformancePeriod
): Promise<ServiceResponse<void>> {
  try {
    const conditions = [
      eq(socialPerformance.traderId, traderId),
      eq(socialPerformance.tenantId, tenantId),
    ];

    if (period) {
      conditions.push(eq(socialPerformance.period, period));
    }

    await db.delete(socialPerformance).where(and(...conditions));

    return { success: true, data: undefined };
  } catch (error) {
    return { success: false, error: 'Failed to delete performance', code: 'DELETE_PERFORMANCE_FAILED' };
  }
}

/**
 * Get performance summary statistics
 */
export async function getPerformanceSummary(traderId: string, tenantId: string): Promise<ServiceResponse<any>> {
  try {
    const [summary] = await db
      .select({
        periods: sql<number>`COUNT(DISTINCT period)`,
        avgWinRate: sql<number>`AVG(CAST(win_rate AS DECIMAL))`,
        avgSharpeRatio: sql<number>`AVG(CAST(sharpe_ratio AS DECIMAL))`,
        avgProfitFactor: sql<number>`AVG(CAST(profit_factor AS DECIMAL))`,
        bestWinRate: sql<number>`MAX(CAST(win_rate AS DECIMAL))`,
        worstWinRate: sql<number>`MIN(CAST(win_rate AS DECIMAL))`,
        totalTrades: sql<number>`SUM(CAST(total_trades AS INTEGER))`,
      })
      .from(socialPerformance)
      .where(
        and(
          eq(socialPerformance.traderId, traderId),
          eq(socialPerformance.tenantId, tenantId)
        )
      );

    return {
      success: true,
      data: {
        periods: Number(summary.periods),
        avgWinRate: Math.round(Number(summary.avgWinRate || 0) * 100) / 100,
        avgSharpeRatio: Math.round(Number(summary.avgSharpeRatio || 0) * 100) / 100,
        avgProfitFactor: Math.round(Number(summary.avgProfitFactor || 0) * 100) / 100,
        bestWinRate: Math.round(Number(summary.bestWinRate || 0) * 100) / 100,
        worstWinRate: Math.round(Number(summary.worstWinRate || 0) * 100) / 100,
        totalTrades: Number(summary.totalTrades || 0),
      },
    };
  } catch (error) {
    return { success: false, error: 'Failed to get performance summary', code: 'GET_SUMMARY_FAILED' };
  }
}
