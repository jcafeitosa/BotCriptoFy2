/**
 * Strategies Types
 * Type definitions for trading strategies
 */

/**
 * Strategy Type
 */
export type StrategyType =
  | 'trend_following'
  | 'mean_reversion'
  | 'breakout'
  | 'arbitrage'
  | 'scalping'
  | 'grid'
  | 'dca'; // Dollar Cost Averaging

/**
 * Strategy Status
 */
export type StrategyStatus = 'draft' | 'active' | 'paused' | 'archived';

/**
 * Signal Type
 */
export type SignalType = 'buy' | 'sell' | 'close_long' | 'close_short';

/**
 * Signal Status
 */
export type SignalStatus = 'pending' | 'executed' | 'cancelled' | 'expired';

/**
 * Backtest Status
 */
export type BacktestStatus = 'running' | 'completed' | 'failed';

/**
 * Timeframe
 */
export type Timeframe = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '6h' | '12h' | '1d' | '1w' | '1M';

/**
 * Indicator Configuration
 */
export interface IndicatorConfig {
  type: string; // rsi, macd, bollinger_bands, etc
  parameters: Record<string, any>;
  enabled: boolean;
}

/**
 * Strategy Condition
 */
export interface StrategyCondition {
  type: 'entry' | 'exit';
  rules: ConditionRule[];
  logic: 'AND' | 'OR'; // How to combine rules
}

/**
 * Condition Rule
 */
export interface ConditionRule {
  indicator: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=' | 'crosses_above' | 'crosses_below';
  value: number | string;
  weight?: number; // Weight for weighted conditions
}

/**
 * Trading Strategy
 */
export interface TradingStrategy {
  id?: string;
  userId: string;
  tenantId: string;

  // Identification
  name: string;
  description?: string;
  version: string;

  // Target market
  exchangeId: string;
  symbol: string;
  timeframe: Timeframe;

  // Strategy configuration
  type: StrategyType;
  indicators: IndicatorConfig[];
  conditions: StrategyCondition[];
  parameters?: Record<string, any>;

  // Risk management
  stopLossPercent?: number;
  takeProfitPercent?: number;
  trailingStopPercent?: number;
  maxPositionSize?: number;
  maxDrawdownPercent?: number;

  // Status
  status: StrategyStatus;
  isPublic: boolean;

  // Performance tracking
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalPnl: number;
  winRate?: number;
  profitFactor?: number;
  sharpeRatio?: number;
  maxDrawdown?: number;

  // Metadata
  tags?: string[];
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
  lastRunAt?: Date;
}

/**
 * Strategy Signal
 */
export interface StrategySignal {
  id?: string;
  strategyId: string;
  userId: string;
  tenantId: string;

  // Signal details
  exchangeId: string;
  symbol: string;
  timeframe: Timeframe;

  // Signal type
  type: SignalType;
  strength?: number; // 0-100
  confidence?: number; // 0-1

  // Price levels
  price: number;
  stopLoss?: number;
  takeProfit?: number;

  // Indicator values
  indicatorValues?: Record<string, any>;

  // Execution
  status: SignalStatus;
  orderId?: string;
  executedPrice?: number;
  executedAt?: Date;

  // Performance
  pnl?: number;
  pnlPercent?: number;

  // Metadata
  reason?: string;
  notes?: string;
  timestamp: Date;
  expiresAt?: Date;
}

/**
 * Strategy Backtest
 */
export interface StrategyBacktest {
  id?: string;
  strategyId: string;
  userId: string;
  tenantId: string;

  // Configuration
  startDate: Date;
  endDate: Date;
  initialCapital: number;

  // Results
  finalCapital?: number;
  totalReturn?: number;
  totalReturnPercent?: number;

  // Trade statistics
  totalTrades?: number;
  winningTrades?: number;
  losingTrades?: number;
  winRate?: number;

  // Performance metrics
  profitFactor?: number;
  sharpeRatio?: number;
  sortinoRatio?: number;
  maxDrawdown?: number;
  maxDrawdownPercent?: number;

  // Risk metrics
  averageWin?: number;
  averageLoss?: number;
  largestWin?: number;
  largestLoss?: number;

  // Detailed results
  trades?: BacktestTrade[];
  equityCurve?: EquityCurvePoint[];

  // Status
  status: BacktestStatus;
  errorMessage?: string;

  // Metadata
  createdAt?: Date;
  completedAt?: Date;
}

/**
 * Backtest Trade
 */
export interface BacktestTrade {
  entryTime: Date;
  entryPrice: number;
  exitTime: Date;
  exitPrice: number;
  quantity: number;
  side: 'long' | 'short';
  pnl: number;
  pnlPercent: number;
  fees: number;
  reason: string;
}

/**
 * Equity Curve Point
 */
export interface EquityCurvePoint {
  timestamp: Date;
  equity: number;
  drawdown: number;
}

/**
 * Indicator Preset
 */
export interface IndicatorPreset {
  id?: string;
  userId?: string;
  tenantId?: string;

  // Preset details
  name: string;
  description?: string;
  indicatorType: string;

  // Configuration
  parameters: Record<string, any>;

  // Usage
  isPublic: boolean;
  usageCount: number;

  // Metadata
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Create Strategy Request
 */
export interface CreateStrategyRequest {
  name: string;
  description?: string;
  exchangeId: string;
  symbol: string;
  timeframe: Timeframe;
  type: StrategyType;
  indicators: IndicatorConfig[];
  conditions: StrategyCondition[];
  parameters?: Record<string, any>;
  stopLossPercent?: number;
  takeProfitPercent?: number;
  trailingStopPercent?: number;
  maxPositionSize?: number;
  maxDrawdownPercent?: number;
  tags?: string[];
  notes?: string;
}

/**
 * Update Strategy Request
 */
export interface UpdateStrategyRequest {
  name?: string;
  description?: string;
  indicators?: IndicatorConfig[];
  conditions?: StrategyCondition[];
  parameters?: Record<string, any>;
  stopLossPercent?: number;
  takeProfitPercent?: number;
  trailingStopPercent?: number;
  maxPositionSize?: number;
  maxDrawdownPercent?: number;
  status?: StrategyStatus;
  tags?: string[];
  notes?: string;
}

/**
 * Run Backtest Request
 */
export interface RunBacktestRequest {
  strategyId: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
}

/**
 * Strategy Query Options
 */
export interface StrategyQueryOptions {
  userId?: string;
  tenantId?: string;
  exchangeId?: string;
  symbol?: string;
  type?: StrategyType;
  status?: StrategyStatus;
  tags?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Signal Query Options
 */
export interface SignalQueryOptions {
  userId?: string;
  tenantId?: string;
  strategyId?: string;
  exchangeId?: string;
  symbol?: string;
  type?: SignalType;
  status?: SignalStatus;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Strategy Statistics
 */
export interface StrategyStatistics {
  totalStrategies: number;
  activeStrategies: number;
  totalSignals: number;
  executedSignals: number;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  totalPnl: number;
  bestStrategy?: {
    id: string;
    name: string;
    winRate: number;
    profitFactor: number;
  };
}

/**
 * Strategy Service Interface
 */
export interface IStrategyService {
  // Strategy CRUD
  createStrategy(userId: string, tenantId: string, request: CreateStrategyRequest): Promise<TradingStrategy>;
  getStrategy(strategyId: string, userId: string, tenantId: string): Promise<TradingStrategy | null>;
  getStrategies(options: StrategyQueryOptions): Promise<TradingStrategy[]>;
  updateStrategy(strategyId: string, userId: string, tenantId: string, updates: UpdateStrategyRequest): Promise<TradingStrategy>;
  deleteStrategy(strategyId: string, userId: string, tenantId: string): Promise<void>;

  // Strategy execution
  activateStrategy(strategyId: string, userId: string, tenantId: string): Promise<TradingStrategy>;
  pauseStrategy(strategyId: string, userId: string, tenantId: string): Promise<TradingStrategy>;

  // Signals
  getSignals(options: SignalQueryOptions): Promise<StrategySignal[]>;
  generateSignal(strategyId: string): Promise<StrategySignal | null>;

  // Backtesting
  runBacktest(userId: string, tenantId: string, request: RunBacktestRequest): Promise<StrategyBacktest>;
  getBacktest(backtestId: string, userId: string, tenantId: string): Promise<StrategyBacktest | null>;
  getBacktests(strategyId: string, userId: string, tenantId: string): Promise<StrategyBacktest[]>;

  // Statistics
  getStrategyStatistics(userId: string, tenantId: string): Promise<StrategyStatistics>;
}
