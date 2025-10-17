/**
 * Positions Types
 * Type definitions for trading positions
 */

/**
 * Position side
 */
export type PositionSide = 'long' | 'short';

/**
 * Position type
 */
export type PositionType = 'spot' | 'margin' | 'futures' | 'perpetual';

/**
 * Margin type
 */
export type MarginType = 'cross' | 'isolated';

/**
 * Position status
 */
export type PositionStatus = 'open' | 'partial' | 'closed' | 'liquidated';

/**
 * Exit reason
 */
export type ExitReason = 'manual' | 'stop_loss' | 'take_profit' | 'trailing_stop' | 'liquidation';

/**
 * Alert type
 */
export type AlertType = 'margin_call' | 'liquidation_warning' | 'stop_loss_hit' | 'take_profit_hit';

/**
 * Alert severity
 */
export type AlertSeverity = 'info' | 'warning' | 'critical';

/**
 * Trading Position
 */
export interface Position {
  id: string;
  userId: string;
  tenantId: string;

  // Position Details
  exchangeId: string;
  symbol: string;
  side: PositionSide;
  type: PositionType;

  // Entry
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  remainingQuantity: number;

  // Leverage & Margin
  leverage: number;
  marginType: MarginType;
  marginUsed: number;
  marginAvailable?: number;
  marginLevel?: number;

  // P&L
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  realizedPnl: number;
  realizedPnlPercent: number;
  totalPnl: number;
  totalPnlPercent: number;

  // Fees
  entryFee: number;
  exitFee: number;
  fundingFee: number;
  totalFees: number;

  // Risk Management
  stopLoss?: number;
  takeProfit?: number;
  trailingStop?: number;
  trailingStopActivationPrice?: number;
  liquidationPrice?: number;

  // Price Extremes
  highestPrice?: number;
  lowestPrice?: number;
  maxUnrealizedPnl: number;
  maxDrawdown: number;

  // Status
  status: PositionStatus;
  exitPrice?: number;
  exitReason?: ExitReason;

  // Linking
  openOrderId?: string;
  closeOrderIds?: string[];
  strategyId?: string;
  botId?: string;
  signalId?: string;

  // Metadata
  notes?: string;
  tags?: string[];
  openedAt: Date;
  closedAt?: Date;
  lastUpdatedAt: Date;
}

/**
 * Create Position Request
 */
export interface CreatePositionRequest {
  exchangeId: string;
  symbol: string;
  side: PositionSide;
  type: PositionType;
  quantity: number;
  entryPrice?: number; // Optional for market orders
  leverage?: number;
  marginType?: MarginType;

  // Risk Management
  stopLoss?: number;
  takeProfit?: number;
  trailingStop?: number;

  // Linking
  openOrderId?: string;
  strategyId?: string;
  botId?: string;
  signalId?: string;

  // Metadata
  notes?: string;
  tags?: string[];
}

/**
 * Update Position Request
 */
export interface UpdatePositionRequest {
  currentPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  trailingStop?: number;
  notes?: string;
  tags?: string[];
}

/**
 * Close Position Request
 */
export interface ClosePositionRequest {
  quantity?: number; // For partial close, omit for full close
  exitPrice?: number; // Optional for market orders
  exitReason: ExitReason;
  closeOrderId?: string;
  notes?: string;
}

/**
 * Position Query Options
 */
export interface PositionQueryOptions {
  userId: string;
  tenantId: string;
  exchangeId?: string;
  symbol?: string;
  side?: PositionSide;
  type?: PositionType;
  status?: PositionStatus;
  strategyId?: string;
  botId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Position History Entry
 */
export interface PositionHistoryEntry {
  id: string;
  positionId: string;
  userId: string;
  tenantId: string;
  action: string;
  currentPrice: number;
  quantity: number;
  unrealizedPnl?: number;
  realizedPnl?: number;
  changes?: Record<string, any>;
  timestamp: Date;
}

/**
 * Position Alert
 */
export interface PositionAlert {
  id: string;
  positionId: string;
  userId: string;
  tenantId: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  currentPrice?: number;
  marginLevel?: number;
  unrealizedPnl?: number;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  createdAt: Date;
}

/**
 * Position Summary
 */
export interface PositionSummary {
  id: string;
  userId: string;
  tenantId: string;

  // Counts
  totalPositions: number;
  openPositions: number;
  closedPositions: number;

  // Performance
  totalUnrealizedPnl: number;
  totalRealizedPnl: number;
  totalPnl: number;
  totalFees: number;

  // Risk
  totalMarginUsed: number;
  averageMarginLevel?: number;

  // Win Rate
  winningPositions: number;
  losingPositions: number;
  winRate?: number;

  lastUpdatedAt: Date;
}

/**
 * P&L Calculation Result
 */
export interface PnLCalculation {
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  realizedPnl: number;
  realizedPnlPercent: number;
  totalPnl: number;
  totalPnlPercent: number;
  totalFees: number;
  netPnl: number; // totalPnl - totalFees
}

/**
 * Margin Calculation Result
 */
export interface MarginCalculation {
  marginUsed: number;
  marginAvailable: number;
  marginLevel: number;
  liquidationPrice?: number;
  distanceToLiquidation?: number; // In percentage
  isMarginCall: boolean;
  isLiquidationWarning: boolean;
}

/**
 * Position Statistics
 */
export interface PositionStatistics {
  totalPositions: number;
  openPositions: number;
  closedPositions: number;
  winningPositions: number;
  losingPositions: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  totalPnl: number;
  totalFees: number;
  netPnl: number;
  profitFactor: number;
  averageHoldingTime: number; // In seconds
  longestHoldingTime: number;
  shortestHoldingTime: number;
}

/**
 * Position Service Interface
 */
export interface IPositionService {
  // CRUD
  createPosition(userId: string, tenantId: string, request: CreatePositionRequest): Promise<Position>;
  getPosition(positionId: string, userId: string, tenantId: string): Promise<Position | null>;
  getPositions(options: PositionQueryOptions): Promise<Position[]>;
  updatePosition(positionId: string, userId: string, tenantId: string, updates: UpdatePositionRequest): Promise<Position>;
  closePosition(positionId: string, userId: string, tenantId: string, request: ClosePositionRequest): Promise<Position>;
  deletePosition(positionId: string, userId: string, tenantId: string): Promise<void>;

  // P&L Calculations
  calculatePnL(position: Position, currentPrice: number): Promise<PnLCalculation>;
  updatePositionPnL(positionId: string, currentPrice: number): Promise<Position>;
  calculateRealizedPnL(position: Position, closeQuantity: number, exitPrice: number): Promise<number>;

  // Margin Management
  calculateMargin(position: Position, currentPrice: number): Promise<MarginCalculation>;
  calculateLiquidationPrice(position: Position): Promise<number>;
  checkMarginCall(userId: string, tenantId: string): Promise<PositionAlert[]>;

  // Risk Management
  checkStopLoss(positionId: string, currentPrice: number): Promise<boolean>;
  checkTakeProfit(positionId: string, currentPrice: number): Promise<boolean>;
  updateTrailingStop(positionId: string, currentPrice: number): Promise<void>;

  // Alerts
  createAlert(positionId: string, type: AlertType, severity: AlertSeverity, message: string, context?: any): Promise<PositionAlert>;
  getAlerts(userId: string, tenantId: string, acknowledged?: boolean): Promise<PositionAlert[]>;
  acknowledgeAlert(alertId: string, userId: string): Promise<void>;

  // History
  getPositionHistory(positionId: string, userId: string, tenantId: string): Promise<PositionHistoryEntry[]>;
  addHistoryEntry(positionId: string, action: string, changes?: any): Promise<void>;

  // Summary & Statistics
  getPositionSummary(userId: string, tenantId: string): Promise<PositionSummary>;
  updatePositionSummary(userId: string, tenantId: string): Promise<PositionSummary>;
  getPositionStatistics(userId: string, tenantId: string): Promise<PositionStatistics>;
}
