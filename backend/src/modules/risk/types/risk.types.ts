/**
 * Risk Management Types
 * Type definitions for portfolio risk management
 */

/**
 * Risk tolerance levels
 */
export type RiskTolerance = 'conservative' | 'moderate' | 'aggressive';

/**
 * Risk alert types
 */
export type RiskAlertType =
  | 'limit_violation'
  | 'drawdown_warning'
  | 'large_position'
  | 'high_leverage'
  | 'margin_call'
  | 'concentration_risk'
  | 'correlation_risk'
  | 'volatility_spike';

/**
 * Alert severity levels
 */
export type AlertSeverity = 'info' | 'warning' | 'critical';

/**
 * Risk level classification
 */
export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

/**
 * Limit types
 */
export type LimitType =
  | 'daily_loss'
  | 'position_size'
  | 'leverage'
  | 'exposure'
  | 'drawdown'
  | 'concentration'
  | 'volatility';

/**
 * Limit scope
 */
export type LimitScope = 'portfolio' | 'position' | 'asset' | 'strategy';

/**
 * Violation actions
 */
export type ViolationAction = 'alert' | 'block' | 'reduce' | 'close';

/**
 * Position side
 */
export type PositionSide = 'long' | 'short';

/**
 * Risk Profile
 * User risk tolerance and preferences
 */
export interface RiskProfile {
  id: string;
  userId: string;
  tenantId: string;

  // Risk Tolerance
  riskTolerance: RiskTolerance;
  maxPortfolioRisk: number; // % per day
  maxPositionRisk: number; // % per position
  maxDrawdown: number; // %

  // Position Sizing
  defaultPositionSize: number; // % of portfolio
  maxPositionSize: number; // %
  useKellyCriterion: boolean;
  kellyFraction: number;

  // Leverage & Margin
  maxLeverage: number;
  maxMarginUtilization: number; // %

  // Exposure Limits
  maxTotalExposure: number; // %
  maxLongExposure: number; // %
  maxShortExposure: number; // %
  maxSingleAssetExposure: number; // %

  // Correlation & Diversification
  maxCorrelatedExposure: number; // %
  minDiversification: number; // count

  // Stop Loss Defaults
  defaultStopLoss: number; // %
  useTrailingStop: boolean;
  defaultTrailingStop: number; // %

  // Risk/Reward
  minRiskRewardRatio: number;

  // Alerts
  alertOnLimitViolation: boolean;
  alertOnDrawdown: boolean;
  alertOnLargePosition: boolean;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Risk Limit
 * Configurable risk limit
 */
export interface RiskLimit {
  id: string;
  userId: string;
  tenantId: string;
  profileId: string;

  // Limit Details
  limitType: LimitType;
  limitName: string;
  limitValue: number;
  limitUnit: string; // percentage, absolute, count

  // Scope
  scope: LimitScope;
  scopeId?: string;

  // Violation Handling
  hardLimit: boolean;
  alertOnViolation: boolean;
  violationAction: ViolationAction;

  // Status
  enabled: boolean;
  currentValue?: number;
  lastViolation?: Date;
  violationCount: number;

  // Metadata
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Risk Metrics
 * Real-time calculated portfolio risk metrics
 */
export interface RiskMetrics {
  id: string;
  userId: string;
  tenantId: string;

  // Portfolio Value
  portfolioValue: number;
  cashBalance: number;

  // Exposure Metrics
  totalExposure: number;
  longExposure: number;
  shortExposure: number;
  netExposure: number;
  grossExposure: number;

  // Exposure as %
  totalExposurePercent: number;
  longExposurePercent: number;
  shortExposurePercent: number;

  // Leverage & Margin
  currentLeverage: number;
  marginUsed: number;
  marginAvailable: number;
  marginUtilization: number; // %

  // Position Metrics
  openPositions: number;
  largestPosition: number;
  largestPositionPercent: number;

  // P&L Metrics
  unrealizedPnl: number;
  realizedPnl: number;
  totalPnl: number;

  // Drawdown
  currentDrawdown: number; // %
  maxDrawdown: number; // %
  peakValue: number;
  drawdownDuration: number; // days

  // Risk Metrics
  valueAtRisk?: number; // VaR
  expectedShortfall?: number; // CVaR

  // Performance Metrics
  sharpeRatio?: number;
  sortinoRatio?: number;
  calmarRatio?: number;

  // Volatility
  volatility?: number; // annualized %
  beta?: number;

  // Diversification
  concentrationRisk?: number; // Herfindahl index
  correlationAverage?: number;

  // Risk Score
  overallRiskScore: number; // 0-100
  riskLevel: RiskLevel;

  // Metadata
  calculatedAt: Date;
  snapshotDate: Date;
}

/**
 * Risk Alert
 * Risk limit violation or warning
 */
export interface RiskAlert {
  id: string;
  userId: string;
  tenantId: string;
  limitId?: string;

  // Alert Details
  alertType: RiskAlertType;
  severity: AlertSeverity;
  title: string;
  message: string;

  // Context
  limitType?: LimitType;
  limitValue?: number;
  currentValue?: number;
  violationPercent?: number;

  // Related Entities
  positionId?: string;
  strategyId?: string;
  assetSymbol?: string;

  // Status
  acknowledged: boolean;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;

  // Actions
  actionTaken?: ViolationAction;
  actionDetails?: Record<string, any>;

  // Metadata
  createdAt: Date;
}

/**
 * Position Sizing Result
 */
export interface PositionSizingResult {
  recommendedSize: number; // in base currency
  recommendedSizePercent: number; // % of portfolio
  maxSize: number;
  riskAmount: number;
  riskPercent: number;
  method: 'fixed' | 'kelly' | 'risk_parity';
  confidence: number; // 0-1
  warnings: string[];
}

/**
 * Risk/Reward Analysis
 */
export interface RiskRewardAnalysis {
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskAmount: number;
  rewardAmount: number;
  riskRewardRatio: number; // reward/risk
  winProbability?: number;
  expectedValue?: number;
  recommendation: 'take' | 'skip' | 'adjust';
  reasons: string[];
}

/**
 * Portfolio Risk Analysis
 */
export interface PortfolioRiskAnalysis {
  totalRisk: number; // $
  totalRiskPercent: number; // %
  positionCount: number;
  diversificationScore: number; // 0-100
  correlationMatrix?: number[][];
  topRisks: Array<{
    positionId: string;
    symbol: string;
    riskAmount: number;
    riskPercent: number;
  }>;
  recommendations: string[];
}

/**
 * Drawdown Analysis
 */
export interface DrawdownAnalysis {
  currentDrawdown: number; // %
  currentDrawdownAmount: number; // $
  maxDrawdown: number; // %
  maxDrawdownAmount: number; // $
  peakValue: number;
  peakDate: Date;
  durationDays: number;
  recoveryProjection?: {
    estimatedDays: number;
    requiredReturn: number; // %
  };
  isAtRisk: boolean;
  warnings: string[];
}

/**
 * VaR Calculation Result
 */
export interface VaRResult {
  valueAtRisk: number; // $ amount
  confidence: number; // 0.95, 0.99, etc.
  timeHorizon: number; // days
  method: 'historical' | 'parametric' | 'monte_carlo';
  expectedShortfall?: number; // CVaR
  breakdown: Array<{
    positionId: string;
    symbol: string;
    contribution: number;
    contributionPercent: number;
  }>;
}

/**
 * Performance Ratios
 */
export interface PerformanceRatios {
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  omegaRatio?: number;
  informationRatio?: number;
  treynorRatio?: number;
}

/**
 * Volatility Analysis
 */
export interface VolatilityAnalysis {
  currentVolatility: number; // annualized %
  historicalVolatility: number; // annualized %
  impliedVolatility?: number; // if options available
  volatilityTrend: 'increasing' | 'decreasing' | 'stable';
  percentile: number; // vs historical (0-100)
  isElevated: boolean;
  warnings: string[];
}

/**
 * Create Risk Profile Request
 */
export interface CreateRiskProfileRequest {
  riskTolerance: RiskTolerance;
  maxPortfolioRisk?: number;
  maxPositionRisk?: number;
  maxDrawdown?: number;
  defaultPositionSize?: number;
  maxPositionSize?: number;
  useKellyCriterion?: boolean;
  kellyFraction?: number;
  maxLeverage?: number;
  maxMarginUtilization?: number;
  maxTotalExposure?: number;
  maxLongExposure?: number;
  maxShortExposure?: number;
  maxSingleAssetExposure?: number;
  maxCorrelatedExposure?: number;
  minDiversification?: number;
  defaultStopLoss?: number;
  useTrailingStop?: boolean;
  defaultTrailingStop?: number;
  minRiskRewardRatio?: number;
  alertOnLimitViolation?: boolean;
  alertOnDrawdown?: boolean;
  alertOnLargePosition?: boolean;
}

/**
 * Update Risk Profile Request
 */
export interface UpdateRiskProfileRequest {
  riskTolerance?: RiskTolerance;
  maxPortfolioRisk?: number;
  maxPositionRisk?: number;
  maxDrawdown?: number;
  defaultPositionSize?: number;
  maxPositionSize?: number;
  useKellyCriterion?: boolean;
  kellyFraction?: number;
  maxLeverage?: number;
  maxMarginUtilization?: number;
  maxTotalExposure?: number;
  maxLongExposure?: number;
  maxShortExposure?: number;
  maxSingleAssetExposure?: number;
  maxCorrelatedExposure?: number;
  minDiversification?: number;
  defaultStopLoss?: number;
  useTrailingStop?: boolean;
  defaultTrailingStop?: number;
  minRiskRewardRatio?: number;
  alertOnLimitViolation?: boolean;
  alertOnDrawdown?: boolean;
  alertOnLargePosition?: boolean;
}

/**
 * Create Risk Limit Request
 */
export interface CreateRiskLimitRequest {
  limitType: LimitType;
  limitName: string;
  limitValue: number;
  limitUnit: string;
  scope: LimitScope;
  scopeId?: string;
  hardLimit?: boolean;
  alertOnViolation?: boolean;
  violationAction?: ViolationAction;
  notes?: string;
}

/**
 * Update Risk Limit Request
 */
export interface UpdateRiskLimitRequest {
  limitValue?: number;
  enabled?: boolean;
  hardLimit?: boolean;
  alertOnViolation?: boolean;
  violationAction?: ViolationAction;
  notes?: string;
}

/**
 * Position Sizing Request
 */
export interface PositionSizingRequest {
  symbol: string;
  side: PositionSide;
  entryPrice: number;
  stopLoss: number;
  portfolioValue?: number; // defaults to current
  method?: 'fixed' | 'kelly' | 'risk_parity';
}

/**
 * Risk/Reward Request
 */
export interface RiskRewardRequest {
  symbol: string;
  side: PositionSide;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  winProbability?: number; // if known from backtest
}

/**
 * VaR Calculation Request
 */
export interface VaRCalculationRequest {
  confidence?: number; // default 0.95
  timeHorizon?: number; // days, default 1
  method?: 'historical' | 'parametric' | 'monte_carlo';
  includeBreakdown?: boolean;
}

/**
 * Risk Service Interface
 */
export interface IRiskService {
  // Risk Profile
  createRiskProfile(userId: string, tenantId: string, request: CreateRiskProfileRequest): Promise<RiskProfile>;
  getRiskProfile(userId: string, tenantId: string): Promise<RiskProfile | null>;
  updateRiskProfile(userId: string, tenantId: string, updates: UpdateRiskProfileRequest): Promise<RiskProfile>;

  // Risk Limits
  createRiskLimit(userId: string, tenantId: string, request: CreateRiskLimitRequest): Promise<RiskLimit>;
  getRiskLimits(userId: string, tenantId: string): Promise<RiskLimit[]>;
  updateRiskLimit(limitId: string, userId: string, tenantId: string, updates: UpdateRiskLimitRequest): Promise<RiskLimit>;
  deleteRiskLimit(limitId: string, userId: string, tenantId: string): Promise<void>;
  checkLimitViolations(userId: string, tenantId: string): Promise<RiskAlert[]>;

  // Risk Metrics
  calculateRiskMetrics(userId: string, tenantId: string): Promise<RiskMetrics>;
  getRiskMetrics(userId: string, tenantId: string): Promise<RiskMetrics | null>;
  getRiskMetricsHistory(userId: string, tenantId: string, days: number): Promise<RiskMetrics[]>;

  // Position Sizing
  calculatePositionSize(userId: string, tenantId: string, request: PositionSizingRequest): Promise<PositionSizingResult>;

  // Risk/Reward Analysis
  analyzeRiskReward(userId: string, tenantId: string, request: RiskRewardRequest): Promise<RiskRewardAnalysis>;

  // Portfolio Analysis
  analyzePortfolioRisk(userId: string, tenantId: string): Promise<PortfolioRiskAnalysis>;

  // Drawdown Analysis
  analyzeDrawdown(userId: string, tenantId: string): Promise<DrawdownAnalysis>;

  // VaR Calculation
  calculateVaR(userId: string, tenantId: string, request: VaRCalculationRequest): Promise<VaRResult>;

  // Performance Ratios
  calculatePerformanceRatios(userId: string, tenantId: string, days: number): Promise<PerformanceRatios>;

  // Volatility Analysis
  analyzeVolatility(userId: string, tenantId: string, symbol?: string): Promise<VolatilityAnalysis>;

  // Alerts
  getAlerts(userId: string, tenantId: string, acknowledged?: boolean): Promise<RiskAlert[]>;
  acknowledgeAlert(alertId: string, userId: string, tenantId: string): Promise<void>;
  resolveAlert(alertId: string, userId: string, tenantId: string): Promise<void>;

  // Validation
  validateTrade(
    userId: string,
    tenantId: string,
    trade: {
      symbol: string;
      side: PositionSide;
      quantity: number;
      price: number;
      stopLoss?: number;
    }
  ): Promise<{
    allowed: boolean;
    violations: string[];
    warnings: string[];
  }>;
}
