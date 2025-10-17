/**
 * Performance Tracker
 *
 * Tracks and calculates P&L, ROI, and performance metrics
 */

export interface Trade {
  entryPrice: number;
  exitPrice: number;
  amount: number;
  side: 'buy' | 'sell';
  profit: number;
}

/**
 * Calculate trade profit
 */
export function calculateTradeProfit(trade: {
  side: 'buy' | 'sell';
  entryPrice: number;
  exitPrice: number;
  amount: number;
}): number {
  const priceDiff = trade.exitPrice - trade.entryPrice;
  const profitPerUnit = trade.side === 'buy' ? priceDiff : -priceDiff;
  return profitPerUnit * trade.amount;
}

/**
 * Calculate trade profit percentage
 */
export function calculateTradeProfitPercentage(trade: {
  side: 'buy' | 'sell';
  entryPrice: number;
  exitPrice: number;
}): number {
  const priceDiff = trade.exitPrice - trade.entryPrice;
  const profitPct = trade.side === 'buy'
    ? (priceDiff / trade.entryPrice) * 100
    : -(priceDiff / trade.entryPrice) * 100;

  return profitPct;
}

/**
 * Calculate ROI
 */
export function calculateROI(
  initialBalance: number,
  finalBalance: number
): number {
  if (initialBalance === 0) return 0;
  return ((finalBalance - initialBalance) / initialBalance) * 100;
}

/**
 * Calculate win rate
 */
export function calculateWinRate(
  winningTrades: number,
  totalTrades: number
): number {
  if (totalTrades === 0) return 0;
  return (winningTrades / totalTrades) * 100;
}

/**
 * Separate winning and losing trades
 */
export function categorizeTrades(trades: Trade[]): {
  winning: Trade[];
  losing: Trade[];
  breakeven: Trade[];
} {
  const winning = trades.filter(t => t.profit > 0);
  const losing = trades.filter(t => t.profit < 0);
  const breakeven = trades.filter(t => t.profit === 0);

  return { winning, losing, breakeven };
}

/**
 * Calculate average win and loss
 */
export function calculateAverageWinLoss(trades: Trade[]): {
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
} {
  const { winning, losing } = categorizeTrades(trades);

  const avgWin = winning.length > 0
    ? winning.reduce((sum, t) => sum + t.profit, 0) / winning.length
    : 0;

  const avgLoss = losing.length > 0
    ? losing.reduce((sum, t) => sum + t.profit, 0) / losing.length
    : 0;

  const grossProfit = winning.reduce((sum, t) => sum + t.profit, 0);
  const grossLoss = Math.abs(losing.reduce((sum, t) => sum + t.profit, 0));

  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;

  return { avgWin, avgLoss, profitFactor };
}

/**
 * Build equity curve
 */
export function buildEquityCurve(
  initialBalance: number,
  trades: Trade[]
): number[] {
  const curve = [initialBalance];
  let balance = initialBalance;

  for (const trade of trades) {
    balance += trade.profit;
    curve.push(balance);
  }

  return curve;
}
