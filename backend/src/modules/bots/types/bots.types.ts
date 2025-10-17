/**
 * Bots Module Types
 * Type definitions for automated trading bot management
 */

/**
 * Bot types
 */
export type BotType =
  | 'grid'
  | 'dca'
  | 'scalping'
  | 'arbitrage'
  | 'market_making'
  | 'trend_following'
  | 'mean_reversion'
  | 'momentum'
  | 'breakout';

/**
 * Bot status
 */
export type BotStatus = 'stopped' | 'running' | 'paused' | 'error';

/**
 * Position sizing methods
 */
export type PositionSizingMethod = 'fixed' | 'kelly' | 'risk_parity';

/**
 * Order types
 */
export type OrderType = 'market' | 'limit' | 'stop_limit';

/**
 * Execution status
 */
export type ExecutionStatus = 'running' | 'completed' | 'stopped' | 'error';

/**
 * Trade status
 */
export type TradeStatus = 'open' | 'closed' | 'cancelled';

/**
 * Trade side
 */
export type TradeSide = 'buy' | 'sell';

/**
 * Close reasons
 */
export type CloseReason =
  | 'stop_loss'
  | 'take_profit'
  | 'trailing_stop'
  | 'signal'
  | 'manual'
  | 'timeout'
  | 'risk_limit';

/**
 * Stop reasons
 */
export type StopReason =
  | 'manual'
  | 'max_drawdown'
  | 'daily_limit'
  | 'error'
  | 'scheduled'
  | 'insufficient_capital';

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

/**
 * Log categories
 */
export type LogCategory = 'execution' | 'signal' | 'order' | 'position' | 'risk' | 'system';

/**
 * Template categories
 */
export type TemplateCategory = 'beginner' | 'intermediate' | 'advanced' | 'experimental';

/**
 * Bot Configuration
 * Complete bot settings and parameters
 */
export interface Bot {
  id: string;
  userId: string;
  tenantId: string;

  // Basic Information
  name: string;
  description?: string;
  type: BotType;
  status: BotStatus;

  // Strategy Configuration
  strategyId?: string;
  templateId?: string;

  // Exchange & Market
  exchangeId: string;
  symbol: string;
  timeframe: string;

  // Capital & Risk Management
  allocatedCapital: number;
  currentCapital?: number;
  maxDrawdown: number;
  stopLossPercent: number;
  takeProfitPercent: number;

  // Position Management
  maxPositions: number;
  positionSizing: PositionSizingMethod;
  positionSizePercent: number;

  // Order Configuration
  orderType: OrderType;
  useTrailingStop: boolean;
  trailingStopPercent: number;

  // Grid Bot Specific
  gridLevels?: number;
  gridUpperPrice?: number;
  gridLowerPrice?: number;
  gridProfitPercent?: number;

  // DCA Bot Specific
  dcaOrderCount?: number;
  dcaOrderAmount?: number;
  dcaStepPercent?: number;
  dcaTakeProfitPercent?: number;

  // Advanced Settings
  parameters?: Record<string, any>;
  riskLimits?: Record<string, any>;
  notifications?: Record<string, any>;

  // Execution Settings
  runOnWeekends: boolean;
  runOnHolidays: boolean;
  startTime?: string;
  endTime?: string;
  maxDailyTrades?: number;
  cooldownMinutes: number;

  // Performance Tracking
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
  profitFactor?: number;
  winRate?: number;
  averageWin?: number;
  averageLoss?: number;
  largestWin?: number;
  largestLoss?: number;
  currentDrawdown: number;
  maxDrawdownReached: number;
  sharpeRatio?: number;
  sortinoRatio?: number;
  returnOnInvestment?: number;

  // Execution State
  lastExecutionId?: string;
  lastTradeAt?: Date;
  lastErrorAt?: Date;
  lastErrorMessage?: string;
  consecutiveErrors: number;

  // Control Flags
  autoRestart: boolean;
  autoStopOnDrawdown: boolean;
  autoStopOnLoss: boolean;
  enabled: boolean;

  // Metadata
  version: number;
  backtestId?: string;
  notes?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  stoppedAt?: Date;
}

/**
 * Bot Execution Session
 */
export interface BotExecution {
  id: string;
  botId: string;
  userId: string;
  tenantId: string;

  // Execution Details
  executionNumber: number;
  status: ExecutionStatus;

  // Capital & Performance
  startingCapital: number;
  endingCapital?: number;
  profitLoss: number;
  profitLossPercent: number;

  // Trade Statistics
  tradesExecuted: number;
  tradesWon: number;
  tradesLost: number;
  winRate?: number;

  // Errors & Issues
  errorsEncountered: number;
  warningsEncountered: number;
  lastError?: string;

  // Execution Context
  configuration?: Record<string, any>;
  marketConditions?: Record<string, any>;

  // Timing
  startedAt: Date;
  endedAt?: Date;
  durationSeconds?: number;

  // Stop Reason
  stopReason?: StopReason;
  stopDetails?: string;

  // Metadata
  createdAt: Date;
}

/**
 * Bot Trade
 */
export interface BotTrade {
  id: string;
  botId: string;
  executionId: string;
  userId: string;
  tenantId: string;

  // Trade Identification
  orderId?: string;
  positionId?: string;
  exchangeOrderId?: string;

  // Trade Details
  symbol: string;
  side: TradeSide;
  type: OrderType;

  // Execution Data
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  averagePrice?: number;

  // Stop Loss / Take Profit
  stopLoss?: number;
  takeProfit?: number;
  trailingStop?: number;

  // Trade Result
  status: TradeStatus;
  profitLoss?: number;
  profitLossPercent?: number;
  fees: number;
  netProfitLoss?: number;

  // Grid/DCA Specific
  gridLevel?: number;
  dcaLevel?: number;

  // Signal & Strategy
  signalType?: string;
  signalStrength?: number;
  strategySnapshot?: Record<string, any>;

  // Timing
  openedAt: Date;
  closedAt?: Date;
  durationMinutes?: number;

  // Close Reason
  closeReason?: CloseReason;
  closeDetails?: string;

  // Risk Metrics
  riskRewardRatio?: number;
  maxDrawdownPercent?: number;
  maxProfitPercent?: number;

  // Metadata
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Bot Log Entry
 */
export interface BotLog {
  id: string;
  botId: string;
  executionId?: string;
  userId: string;
  tenantId: string;

  // Log Details
  level: LogLevel;
  category: LogCategory;
  message: string;
  details?: Record<string, any>;

  // Context
  tradeId?: string;
  orderId?: string;

  // Error Information
  errorCode?: string;
  errorStack?: string;

  // Metadata
  timestamp: Date;
  createdAt: Date;
}

/**
 * Bot Template
 */
export interface BotTemplate {
  id: string;
  userId?: string;
  tenantId?: string;

  // Template Details
  name: string;
  description?: string;
  type: BotType;
  category: TemplateCategory;

  // Visibility
  isPublic: boolean;
  isSystem: boolean;
  isFeatured: boolean;

  // Configuration
  configuration: Record<string, any>;
  requiredParameters?: Record<string, any>;
  defaultParameters?: Record<string, any>;

  // Performance
  backtestResults?: Record<string, any>;
  expectedReturn?: number;
  expectedRisk?: number;
  minimumCapital?: number;
  recommendedCapital?: number;

  // Compatibility
  supportedExchanges?: string[];
  supportedSymbols?: string[];
  supportedTimeframes?: string[];

  // Usage Statistics
  timesUsed: number;
  averageRating?: number;
  totalRatings: number;

  // Documentation
  documentation?: string;
  setupInstructions?: string;
  riskWarning?: string;

  // Metadata
  version: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Bot Performance Summary
 */
export interface BotPerformanceSummary {
  botId: string;
  botName: string;

  // Capital
  allocatedCapital: number;
  currentCapital: number;
  capitalGrowth: number; // %

  // Trade Statistics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number; // %
  profitFactor: number;

  // Profit/Loss
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
  netProfitPercent: number; // %
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;

  // Risk Metrics
  currentDrawdown: number; // %
  maxDrawdownReached: number; // %
  sharpeRatio?: number;
  sortinoRatio?: number;
  returnOnInvestment: number; // %

  // Time
  runningDays: number;
  lastTradeAt?: Date;
}

/**
 * Bot Statistics
 */
export interface BotStatistics {
  bot: Bot;
  performance: BotPerformanceSummary;
  recentTrades: BotTrade[];
  currentExecution?: BotExecution;
  todayStats: {
    tradesExecuted: number;
    profitLoss: number;
    profitLossPercent: number;
  };
  weekStats: {
    tradesExecuted: number;
    profitLoss: number;
    profitLossPercent: number;
  };
  monthStats: {
    tradesExecuted: number;
    profitLoss: number;
    profitLossPercent: number;
  };
}

/**
 * Bot Health Status
 */
export interface BotHealthStatus {
  botId: string;
  status: BotStatus;
  isHealthy: boolean;
  issues: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    message: string;
    details?: string;
  }>;
  lastHeartbeat?: Date;
  consecutiveErrors: number;
  marketConnection: 'connected' | 'disconnected' | 'degraded';
  capitalStatus: 'sufficient' | 'low' | 'depleted';
  performanceStatus: 'good' | 'acceptable' | 'poor';
}

/**
 * Create Bot Request
 */
export interface CreateBotRequest {
  // Basic Information
  name: string;
  description?: string;
  type: BotType;
  templateId?: string;

  // Strategy Configuration
  strategyId?: string;

  // Exchange & Market
  exchangeId: string;
  symbol: string;
  timeframe?: string;

  // Capital & Risk Management
  allocatedCapital: number;
  maxDrawdown?: number;
  stopLossPercent?: number;
  takeProfitPercent?: number;

  // Position Management
  maxPositions?: number;
  positionSizing?: PositionSizingMethod;
  positionSizePercent?: number;

  // Order Configuration
  orderType?: OrderType;
  useTrailingStop?: boolean;
  trailingStopPercent?: number;

  // Grid Bot Specific
  gridLevels?: number;
  gridUpperPrice?: number;
  gridLowerPrice?: number;
  gridProfitPercent?: number;

  // DCA Bot Specific
  dcaOrderCount?: number;
  dcaOrderAmount?: number;
  dcaStepPercent?: number;
  dcaTakeProfitPercent?: number;

  // Advanced Settings
  parameters?: Record<string, any>;
  riskLimits?: Record<string, any>;
  notifications?: Record<string, any>;

  // Execution Settings
  runOnWeekends?: boolean;
  runOnHolidays?: boolean;
  startTime?: string;
  endTime?: string;
  maxDailyTrades?: number;
  cooldownMinutes?: number;

  // Control Flags
  autoRestart?: boolean;
  autoStopOnDrawdown?: boolean;
  autoStopOnLoss?: boolean;
  enabled?: boolean;

  // Metadata
  notes?: string;
  tags?: string[];
}

/**
 * Update Bot Request
 */
export interface UpdateBotRequest {
  name?: string;
  description?: string;
  allocatedCapital?: number;
  maxDrawdown?: number;
  stopLossPercent?: number;
  takeProfitPercent?: number;
  maxPositions?: number;
  positionSizing?: PositionSizingMethod;
  positionSizePercent?: number;
  orderType?: OrderType;
  useTrailingStop?: boolean;
  trailingStopPercent?: number;
  parameters?: Record<string, any>;
  riskLimits?: Record<string, any>;
  notifications?: Record<string, any>;
  runOnWeekends?: boolean;
  runOnHolidays?: boolean;
  startTime?: string;
  endTime?: string;
  maxDailyTrades?: number;
  cooldownMinutes?: number;
  autoRestart?: boolean;
  autoStopOnDrawdown?: boolean;
  autoStopOnLoss?: boolean;
  enabled?: boolean;
  notes?: string;
  tags?: string[];
}

/**
 * Bot Control Request
 */
export interface BotControlRequest {
  action: 'start' | 'stop' | 'pause' | 'resume' | 'restart';
  reason?: string;
}

/**
 * Create Template Request
 */
export interface CreateTemplateRequest {
  name: string;
  description?: string;
  type: BotType;
  category?: TemplateCategory;
  configuration: Record<string, any>;
  requiredParameters?: Record<string, any>;
  defaultParameters?: Record<string, any>;
  isPublic?: boolean;
  documentation?: string;
  setupInstructions?: string;
  riskWarning?: string;
  tags?: string[];
}

/**
 * Update Template Request
 */
export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  category?: TemplateCategory;
  configuration?: Record<string, any>;
  requiredParameters?: Record<string, any>;
  defaultParameters?: Record<string, any>;
  isPublic?: boolean;
  documentation?: string;
  setupInstructions?: string;
  riskWarning?: string;
  tags?: string[];
}

/**
 * Bot Query Filters
 */
export interface BotQueryFilters {
  status?: BotStatus;
  type?: BotType;
  exchangeId?: string;
  symbol?: string;
  enabled?: boolean;
  tags?: string[];
  search?: string;
}

/**
 * Execution Query Filters
 */
export interface ExecutionQueryFilters {
  botId?: string;
  status?: ExecutionStatus;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Trade Query Filters
 */
export interface TradeQueryFilters {
  botId?: string;
  executionId?: string;
  status?: TradeStatus;
  symbol?: string;
  side?: TradeSide;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Log Query Filters
 */
export interface LogQueryFilters {
  botId?: string;
  executionId?: string;
  level?: LogLevel;
  category?: LogCategory;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Template Query Filters
 */
export interface TemplateQueryFilters {
  type?: BotType;
  category?: TemplateCategory;
  isPublic?: boolean;
  isSystem?: boolean;
  isFeatured?: boolean;
  search?: string;
  tags?: string[];
}

/**
 * Pagination Options
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Bot Service Interface
 */
export interface IBotService {
  // Bot Management
  createBot(userId: string, tenantId: string, request: CreateBotRequest): Promise<Bot>;
  getBot(botId: string, userId: string, tenantId: string): Promise<Bot | null>;
  getBots(userId: string, tenantId: string, filters?: BotQueryFilters): Promise<Bot[]>;
  updateBot(botId: string, userId: string, tenantId: string, updates: UpdateBotRequest): Promise<Bot>;
  deleteBot(botId: string, userId: string, tenantId: string): Promise<void>;

  // Bot Control
  startBot(botId: string, userId: string, tenantId: string): Promise<BotExecution>;
  stopBot(botId: string, userId: string, tenantId: string, reason?: string): Promise<void>;
  pauseBot(botId: string, userId: string, tenantId: string): Promise<void>;
  resumeBot(botId: string, userId: string, tenantId: string): Promise<void>;
  restartBot(botId: string, userId: string, tenantId: string): Promise<BotExecution>;

  // Bot Statistics & Monitoring
  getBotStatistics(botId: string, userId: string, tenantId: string): Promise<BotStatistics>;
  getBotPerformance(botId: string, userId: string, tenantId: string): Promise<BotPerformanceSummary>;
  getBotHealth(botId: string, userId: string, tenantId: string): Promise<BotHealthStatus>;
  updateBotPerformance(botId: string, userId: string, tenantId: string): Promise<void>;

  // Executions
  getExecution(executionId: string, userId: string, tenantId: string): Promise<BotExecution | null>;
  getExecutions(
    userId: string,
    tenantId: string,
    filters?: ExecutionQueryFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<BotExecution>>;
  getCurrentExecution(botId: string, userId: string, tenantId: string): Promise<BotExecution | null>;

  // Trades
  getTrade(tradeId: string, userId: string, tenantId: string): Promise<BotTrade | null>;
  getTrades(
    userId: string,
    tenantId: string,
    filters?: TradeQueryFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<BotTrade>>;
  getOpenTrades(botId: string, userId: string, tenantId: string): Promise<BotTrade[]>;

  // Logs
  getLogs(
    userId: string,
    tenantId: string,
    filters?: LogQueryFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<BotLog>>;
  addLog(
    botId: string,
    userId: string,
    tenantId: string,
    level: LogLevel,
    category: LogCategory,
    message: string,
    details?: Record<string, any>
  ): Promise<BotLog>;

  // Templates
  createTemplate(userId: string, tenantId: string, request: CreateTemplateRequest): Promise<BotTemplate>;
  getTemplate(templateId: string): Promise<BotTemplate | null>;
  getTemplates(filters?: TemplateQueryFilters): Promise<BotTemplate[]>;
  updateTemplate(templateId: string, userId: string, updates: UpdateTemplateRequest): Promise<BotTemplate>;
  deleteTemplate(templateId: string, userId: string): Promise<void>;
  cloneBotFromTemplate(
    templateId: string,
    userId: string,
    tenantId: string,
    overrides: Partial<CreateBotRequest>
  ): Promise<Bot>;

  // Validation
  validateBotConfiguration(config: CreateBotRequest): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }>;
}
