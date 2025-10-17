/**
 * Social Trading Module
 */

import { Elysia } from 'elysia';
import {
  socialTradersRoutes,
  socialCopyRoutes,
  socialLeaderboardRoutes,
  socialAnalyticsRoutes,
} from './routes';

export const socialTradingModule = new Elysia()
  .use(socialTradersRoutes)
  .use(socialCopyRoutes)
  .use(socialLeaderboardRoutes)
  .use(socialAnalyticsRoutes);

export * from './schema/social.schema';
export * from './services';
export * from './types/social.types';
export * from './utils/copy-engine';
export * from './utils/leaderboard-ranker';

// Export from risk-calculator
export {
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateMaxDrawdown,
  calculateVolatility,
  calculateCalmarRatio,
  calculateWinRate,
  calculateProfitFactor,
  calculateAllRiskMetrics,
  type RiskMetrics,
  type TradeReturn,
} from './utils/risk-calculator';

// Export from performance-tracker with aliases to avoid conflicts
export {
  calculateTradeProfit,
  calculateTradeProfitPercentage,
  calculateROI,
  calculateWinRate as calculatePerformanceWinRate,
  categorizeTrades,
  calculateAverageWinLoss,
  buildEquityCurve,
  type Trade,
} from './utils/performance-tracker';
