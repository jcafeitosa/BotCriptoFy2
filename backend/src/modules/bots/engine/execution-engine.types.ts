/**
 * Bot Execution Engine Types
 * Type definitions for bot execution engine
 */

import type { Bot } from '../types/bots.types';

/**
 * Execution engine states
 */
export type ExecutionState =
  | 'IDLE'
  | 'INITIALIZING'
  | 'RUNNING'
  | 'EVALUATING'
  | 'TRADING'
  | 'MONITORING'
  | 'CLOSING'
  | 'PAUSED'
  | 'STOPPING'
  | 'ERROR'
  | 'RECOVERING'
  | 'TERMINATED';

/**
 * Signal types from strategy evaluation
 */
export type SignalType = 'BUY' | 'SELL' | 'HOLD';

/**
 * Signal from strategy runner
 */
export interface TradingSignal {
  type: SignalType;
  strength: number; // 0-100
  confidence: number; // 0-100
  reasons: string[];
  indicators?: Record<string, number>;
  metadata?: Record<string, any>;
  timestamp: Date;
}

/**
 * Execution configuration
 */
export interface ExecutionConfig {
  tickIntervalMs: number; // Interval between evaluations (default: 60000 = 1 minute)
  maxConsecutiveErrors: number; // Max errors before auto-stop (default: 5)
  orderTimeoutMs: number; // Timeout for order execution (default: 30000 = 30s)
  positionCheckIntervalMs: number; // How often to check positions (default: 5000 = 5s)
  enableCircuitBreaker: boolean; // Enable circuit breaker pattern (default: true)
  circuitBreakerThreshold: number; // Errors before circuit opens (default: 3)
  circuitBreakerResetMs: number; // Time before circuit closes (default: 60000 = 1m)
  retryDelayMs: number; // Delay between retries (default: 5000 = 5s)
  maxRetries: number; // Max retry attempts (default: 3)
}

/**
 * Execution context - runtime state
 */
export interface ExecutionContext {
  bot: Bot;
  executionId: string;
  state: ExecutionState;
  previousState?: ExecutionState;
  startedAt: Date;
  lastTickAt?: Date;
  lastEvaluationAt?: Date;
  lastTradeAt?: Date;
  consecutiveErrors: number;
  totalTicks: number;
  totalEvaluations: number;
  totalSignals: number;
  totalOrders: number;
  circuitBreakerOpen: boolean;
  circuitBreakerOpenedAt?: Date;
  isPaused: boolean;
  shouldStop: boolean;
  metadata: Record<string, any>;
}

/**
 * Execution metrics
 */
export interface ExecutionMetrics {
  botId: string;
  executionId: string;
  state: ExecutionState;
  uptime: number; // milliseconds
  ticksPerMinute: number;
  evaluationsPerMinute: number;
  ordersPerHour: number;
  successRate: number; // percentage
  errorRate: number; // percentage
  averageTickDuration: number; // milliseconds
  averageEvaluationDuration: number; // milliseconds
  memoryUsageMB: number;
  cpuUsagePercent: number;
  lastError?: string;
  lastErrorAt?: Date;
}

/**
 * Order result from execution
 */
export interface OrderExecutionResult {
  success: boolean;
  orderId?: string;
  exchangeOrderId?: string;
  price?: number;
  quantity?: number;
  error?: string;
  timestamp: Date;
}

/**
 * Position monitoring result
 */
export interface PositionCheckResult {
  positionId: string;
  shouldClose: boolean;
  closeReason?: 'STOP_LOSS' | 'TAKE_PROFIT' | 'TRAILING_STOP' | 'MANUAL';
  currentPnL: number;
  currentPnLPercent: number;
}

/**
 * Risk validation result
 */
export interface RiskValidationResult {
  approved: boolean;
  reasons: string[];
  warnings: string[];
  maxPositionSize?: number;
  currentExposure: number;
  maxExposure: number;
}

/**
 * Execution event types
 */
export type ExecutionEventType =
  | 'state_change'
  | 'tick'
  | 'price_update'
  | 'evaluation_start'
  | 'evaluation_complete'
  | 'signal_generated'
  | 'order_created'
  | 'order_filled'
  | 'order_failed'
  | 'position_opened'
  | 'position_closed'
  | 'stop_loss_hit'
  | 'take_profit_hit'
  | 'trailing_stop_hit'
  | 'error'
  | 'warning'
  | 'paused'
  | 'resumed'
  | 'stopped';

/**
 * Execution event
 */
export interface ExecutionEvent {
  type: ExecutionEventType;
  botId: string;
  executionId: string;
  timestamp: Date;
  data?: Record<string, any>;
  error?: Error;
}

/**
 * Execution engine interface
 */
export interface IExecutionEngine {
  /**
   * Start the execution engine
   */
  start(): Promise<void>;

  /**
   * Stop the execution engine
   */
  stop(): Promise<void>;

  /**
   * Pause the execution engine
   */
  pause(): void;

  /**
   * Resume the execution engine
   */
  resume(): void;

  /**
   * Get current state
   */
  getState(): ExecutionState;

  /**
   * Get execution context
   */
  getContext(): ExecutionContext;

  /**
   * Get execution metrics
   */
  getMetrics(): ExecutionMetrics;

  /**
   * Check if engine is running
   */
  isRunning(): boolean;

  /**
   * Check if engine is healthy
   */
  isHealthy(): boolean;
}

/**
 * Default execution configuration
 */
export const DEFAULT_EXECUTION_CONFIG: ExecutionConfig = {
  tickIntervalMs: 60000, // 1 minute
  maxConsecutiveErrors: 5,
  orderTimeoutMs: 30000, // 30 seconds
  positionCheckIntervalMs: 5000, // 5 seconds
  enableCircuitBreaker: true,
  circuitBreakerThreshold: 3,
  circuitBreakerResetMs: 60000, // 1 minute
  retryDelayMs: 5000, // 5 seconds
  maxRetries: 3,
};
