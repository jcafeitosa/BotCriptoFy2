/**
 * Risk Metrics Calculator
 *
 * Calculates Sharpe Ratio, Sortino Ratio, Max Drawdown, etc.
 */

export interface TradeReturn {
  date: Date;
  return: number; // percentage
}

export interface RiskMetrics {
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  maxDrawdownDuration: number; // days
  volatility: number;
  calmarRatio: number;
}

/**
 * Calculate Sharpe Ratio
 * (Average Return - Risk Free Rate) / Standard Deviation
 */
export function calculateSharpeRatio(
  returns: number[],
  riskFreeRate: number = 0.02 // 2% annual
): number {
  if (returns.length === 0) return 0;

  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;

  const excessReturn = avgReturn - (riskFreeRate / 252); // Daily risk-free rate
  return excessReturn / stdDev;
}

/**
 * Calculate Sortino Ratio
 * Similar to Sharpe but only considers downside volatility
 */
export function calculateSortinoRatio(
  returns: number[],
  riskFreeRate: number = 0.02
): number {
  if (returns.length === 0) return 0;

  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const downsideReturns = returns.filter(r => r < 0);

  if (downsideReturns.length === 0) return 0;

  const downsideVariance = downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downsideReturns.length;
  const downsideDeviation = Math.sqrt(downsideVariance);

  if (downsideDeviation === 0) return 0;

  const excessReturn = avgReturn - (riskFreeRate / 252);
  return excessReturn / downsideDeviation;
}

/**
 * Calculate Maximum Drawdown
 */
export function calculateMaxDrawdown(equityCurve: number[]): {
  maxDrawdown: number;
  maxDrawdownDuration: number;
} {
  if (equityCurve.length === 0) return { maxDrawdown: 0, maxDrawdownDuration: 0 };

  let maxDrawdown = 0;
  let maxDrawdownDuration = 0;
  let peak = equityCurve[0];
  let peakIndex = 0;

  for (let i = 1; i < equityCurve.length; i++) {
    if (equityCurve[i] > peak) {
      peak = equityCurve[i];
      peakIndex = i;
    } else {
      const drawdown = (peak - equityCurve[i]) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
        maxDrawdownDuration = i - peakIndex;
      }
    }
  }

  return {
    maxDrawdown: maxDrawdown * 100, // Convert to percentage
    maxDrawdownDuration,
  };
}

/**
 * Calculate Volatility (Standard Deviation of Returns)
 */
export function calculateVolatility(returns: number[]): number {
  if (returns.length === 0) return 0;

  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;

  return Math.sqrt(variance) * Math.sqrt(252); // Annualized
}

/**
 * Calculate Calmar Ratio
 * Annual Return / Max Drawdown
 */
export function calculateCalmarRatio(
  annualReturn: number,
  maxDrawdown: number
): number {
  if (maxDrawdown === 0) return 0;
  return annualReturn / maxDrawdown;
}

/**
 * Calculate Win Rate
 */
export function calculateWinRate(
  winningTrades: number,
  totalTrades: number
): number {
  if (totalTrades === 0) return 0;
  return (winningTrades / totalTrades) * 100;
}

/**
 * Calculate Profit Factor
 * Gross Profit / Gross Loss
 */
export function calculateProfitFactor(
  grossProfit: number,
  grossLoss: number
): number {
  if (grossLoss === 0) return 0;
  return grossProfit / Math.abs(grossLoss);
}

/**
 * Calculate all risk metrics
 */
export function calculateAllRiskMetrics(
  returns: number[],
  equityCurve: number[],
  annualReturn: number
): RiskMetrics {
  const sharpeRatio = calculateSharpeRatio(returns);
  const sortinoRatio = calculateSortinoRatio(returns);
  const { maxDrawdown, maxDrawdownDuration } = calculateMaxDrawdown(equityCurve);
  const volatility = calculateVolatility(returns);
  const calmarRatio = calculateCalmarRatio(annualReturn, maxDrawdown);

  return {
    sharpeRatio,
    sortinoRatio,
    maxDrawdown,
    maxDrawdownDuration,
    volatility,
    calmarRatio,
  };
}
