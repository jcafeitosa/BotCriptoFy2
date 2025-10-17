/**
 * Backtest Engine Types
 * Type definitions for backtesting system
 */

import type { TradingStrategy } from '../../strategies/types/strategies.types';
import type { MarketDataPoint } from '../../strategies/engine/strategy-runner.types';

/**
 * Backtest Configuration
 */
export interface BacktestConfig {
  strategy: TradingStrategy;
  symbol: string;
  timeframe: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  positionSizePercent: number; // Percentage of capital per trade
  commission: number; // Commission percentage per trade (e.g., 0.1 for 0.1%)
  slippage: number; // Slippage percentage (e.g., 0.05 for 0.05%)
}

/**
 * Virtual Trade
 */
export interface VirtualTrade {
  id: string;
  type: 'BUY' | 'SELL';
  timestamp: Date;
  price: number;
  quantity: number;
  commission: number;
  slippage: number;
  signal: {
    strength: number;
    confidence: number;
    reasons: string[];
  };
}

/**
 * Virtual Position
 */
export interface VirtualPosition {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  entryTime: Date;
  quantity: number;
  stopLoss?: number;
  takeProfit?: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
}

/**
 * Closed Position
 */
export interface ClosedPosition extends Omit<VirtualPosition, 'currentPrice' | 'unrealizedPnl' | 'unrealizedPnlPercent'> {
  exitPrice: number;
  exitTime: Date;
  exitReason: 'signal' | 'stop_loss' | 'take_profit' | 'end_of_backtest';
  realizedPnl: number;
  realizedPnlPercent: number;
  holdingPeriod: number; // milliseconds
  commission: number;
}

/**
 * Backtest Metrics
 */
export interface BacktestMetrics {
  // General
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number; // percentage

  // Returns
  totalReturn: number; // dollar amount
  totalReturnPercent: number; // percentage
  averageReturn: number;
  averageReturnPercent: number;

  // Win/Loss Analysis
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  profitFactor: number; // Total wins / Total losses

  // Risk Metrics
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number; // dollar amount
  maxDrawdownPercent: number; // percentage
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;

  // Time Analysis
  averageHoldingPeriod: number; // milliseconds
  averageTimeBetweenTrades: number; // milliseconds
  totalBacktestPeriod: number; // milliseconds

  // Capital
  initialCapital: number;
  finalCapital: number;
  peakCapital: number;

  // Trading Activity
  longTrades: number;
  shortTrades: number;
  averageTradesPerDay: number;
}

/**
 * Equity Curve Point
 */
export interface EquityCurvePoint {
  timestamp: Date;
  equity: number;
  drawdown: number;
  drawdownPercent: number;
}

/**
 * Trade Analysis
 */
export interface TradeAnalysis {
  trade: ClosedPosition;
  marketCondition: {
    trend: 'bullish' | 'bearish' | 'sideways';
    volatility: number;
  };
  signalQuality: {
    strength: number;
    confidence: number;
  };
}

/**
 * Backtest Result
 */
export interface BacktestResult {
  config: BacktestConfig;
  metrics: BacktestMetrics;
  trades: ClosedPosition[];
  equityCurve: EquityCurvePoint[];
  analysis: {
    bestTrades: TradeAnalysis[];
    worstTrades: TradeAnalysis[];
    recommendations: string[];
    warnings: string[];
  };
  executionTime: number; // milliseconds
  dataPointsProcessed: number;
}

/**
 * Backtest State
 */
export interface BacktestState {
  currentCapital: number;
  peakCapital: number;
  positions: VirtualPosition[];
  closedPositions: ClosedPosition[];
  trades: VirtualTrade[];
  currentDrawdown: number;
  equityCurve: EquityCurvePoint[];
}

/**
 * Backtest Engine Interface
 */
export interface IBacktestEngine {
  /**
   * Run backtest with configuration
   */
  run(config: BacktestConfig): Promise<BacktestResult>;

  /**
   * Run backtest with market data provided
   */
  runWithData(config: BacktestConfig, marketData: MarketDataPoint[]): Promise<BacktestResult>;

  /**
   * Calculate metrics from backtest state
   */
  calculateMetrics(state: BacktestState, config: BacktestConfig): BacktestMetrics;

  /**
   * Generate trade analysis
   */
  analyzeResults(result: BacktestResult): {
    bestTrades: TradeAnalysis[];
    worstTrades: TradeAnalysis[];
    recommendations: string[];
    warnings: string[];
  };
}

/**
 * Default Backtest Configuration
 */
export const DEFAULT_BACKTEST_CONFIG: Partial<BacktestConfig> = {
  initialCapital: 10000,
  positionSizePercent: 10, // 10% of capital per trade
  commission: 0.1, // 0.1% commission
  slippage: 0.05, // 0.05% slippage
};
