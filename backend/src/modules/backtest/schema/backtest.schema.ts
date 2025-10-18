/**
 * Backtest Database Schema
 * Stores backtest results and configurations
 */

import { pgTable, uuid, text, timestamp, jsonb, numeric, integer, boolean } from 'drizzle-orm/pg-core';

/**
 * Backtest Results Table
 * Stores completed backtest results with full metrics
 */
export const backtestResults = pgTable('backtest_results', {
  // Identifiers
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  tenantId: text('tenant_id').notNull(),
  strategyId: uuid('strategy_id').notNull(),

  // Configuration
  name: text('name').notNull(),
  description: text('description'),
  symbol: text('symbol').notNull(),
  timeframe: text('timeframe').notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),

  // Capital & Sizing
  initialCapital: numeric('initial_capital', { precision: 20, scale: 2 }).notNull(),
  positionSizePercent: numeric('position_size_percent', { precision: 5, scale: 2 }).notNull(),
  commission: numeric('commission', { precision: 5, scale: 4 }).notNull(),
  slippage: numeric('slippage', { precision: 5, scale: 4 }).notNull(),

  // Results - General
  totalTrades: integer('total_trades').notNull(),
  winningTrades: integer('winning_trades').notNull(),
  losingTrades: integer('losing_trades').notNull(),
  winRate: numeric('win_rate', { precision: 5, scale: 2 }).notNull(), // percentage

  // Results - Returns
  totalReturn: numeric('total_return', { precision: 20, scale: 2 }).notNull(),
  totalReturnPercent: numeric('total_return_percent', { precision: 10, scale: 4 }).notNull(),
  averageReturn: numeric('average_return', { precision: 20, scale: 2 }).notNull(),
  averageReturnPercent: numeric('average_return_percent', { precision: 10, scale: 4 }).notNull(),

  // Results - Win/Loss
  averageWin: numeric('average_win', { precision: 20, scale: 2 }).notNull(),
  averageLoss: numeric('average_loss', { precision: 20, scale: 2 }).notNull(),
  largestWin: numeric('largest_win', { precision: 20, scale: 2 }).notNull(),
  largestLoss: numeric('largest_loss', { precision: 20, scale: 2 }).notNull(),
  profitFactor: numeric('profit_factor', { precision: 10, scale: 4 }).notNull(),

  // Results - Risk Metrics
  sharpeRatio: numeric('sharpe_ratio', { precision: 10, scale: 4 }),
  sortinoRatio: numeric('sortino_ratio', { precision: 10, scale: 4 }),
  maxDrawdown: numeric('max_drawdown', { precision: 20, scale: 2 }).notNull(),
  maxDrawdownPercent: numeric('max_drawdown_percent', { precision: 10, scale: 4 }).notNull(),
  maxConsecutiveWins: integer('max_consecutive_wins').notNull(),
  maxConsecutiveLosses: integer('max_consecutive_losses').notNull(),

  // Results - Time Analysis
  averageHoldingPeriod: integer('average_holding_period').notNull(), // milliseconds
  averageTimeBetweenTrades: integer('average_time_between_trades').notNull(),
  totalBacktestPeriod: integer('total_backtest_period').notNull(),

  // Results - Capital
  finalCapital: numeric('final_capital', { precision: 20, scale: 2 }).notNull(),
  peakCapital: numeric('peak_capital', { precision: 20, scale: 2 }).notNull(),

  // Results - Trading Activity
  longTrades: integer('long_trades').notNull(),
  shortTrades: integer('short_trades').notNull(),
  averageTradesPerDay: numeric('average_trades_per_day', { precision: 10, scale: 4 }).notNull(),

  // Execution Metrics
  executionTime: integer('execution_time').notNull(), // milliseconds
  dataPointsProcessed: integer('data_points_processed').notNull(),

  // Detailed Data (JSON)
  trades: jsonb('trades').notNull().$type<any[]>(), // ClosedPosition[]
  equityCurve: jsonb('equity_curve').notNull().$type<any[]>(), // EquityCurvePoint[]
  analysis: jsonb('analysis').notNull().$type<{
    bestTrades: any[];
    worstTrades: any[];
    recommendations: string[];
    warnings: string[];
  }>(),

  // Status & Metadata
  status: text('status').notNull().default('completed'), // completed, failed, running
  error: text('error'), // Error message if failed
  isArchived: boolean('is_archived').notNull().default(false),

  // Timestamps
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Backtest Runs Table
 * Stores history of backtest executions (for tracking and debugging)
 */
export const backtestRuns = pgTable('backtest_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  tenantId: text('tenant_id').notNull(),
  strategyId: uuid('strategy_id').notNull(),
  resultId: uuid('result_id'), // FK to backtest_results (null if failed)

  // Config Snapshot
  config: jsonb('config').notNull().$type<any>(), // BacktestConfig

  // Execution
  status: text('status').notNull(), // running, completed, failed
  progress: numeric('progress', { precision: 5, scale: 2 }), // 0-100
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  error: text('error'),

  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/**
 * Backtest Comparisons Table
 * Stores side-by-side comparisons of multiple backtests
 */
export const backtestComparisons = pgTable('backtest_comparisons', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  tenantId: text('tenant_id').notNull(),

  name: text('name').notNull(),
  description: text('description'),

  // Results to compare
  resultIds: jsonb('result_ids').notNull().$type<string[]>(),

  // Comparison Analysis
  analysis: jsonb('analysis').$type<{
    bestPerformer: string; // resultId
    worstPerformer: string; // resultId
    metrics: any;
  }>(),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
