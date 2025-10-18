// @ts-nocheck
/**
 * Risk Validation Schemas
 * Zod schemas for comprehensive validation
 * 
 * Features:
 * - Input validation for all endpoints
 * - Business rule validation
 * - Type safety
 * - Error messages in Portuguese
 * - Custom validators for risk-specific rules
 */

import { z } from 'zod';

/**
 * Risk Tolerance Validation
 */
export const RiskToleranceSchema = z.enum(['conservative', 'moderate', 'aggressive'], {
  errorMap: () => ({ message: 'Tolerância ao risco deve ser: conservative, moderate ou aggressive' })
});

/**
 * Investment Horizon Validation
 */
export const InvestmentHorizonSchema = z.enum(['short', 'medium', 'long'], {
  errorMap: () => ({ message: 'Horizonte de investimento deve ser: short, medium ou long' })
});

/**
 * Alert Type Validation
 */
export const AlertTypeSchema = z.enum([
  'limit_violation',
  'drawdown_exceeded',
  'large_position',
  'correlation_high',
  'liquidity_low',
  'volatility_high',
  'leverage_high',
  'concentration_high'
], {
  errorMap: () => ({ message: 'Tipo de alerta inválido' })
});

/**
 * Alert Severity Validation
 */
export const AlertSeveritySchema = z.enum(['low', 'medium', 'high', 'critical'], {
  errorMap: () => ({ message: 'Severidade do alerta deve ser: low, medium, high ou critical' })
});

/**
 * Risk Level Validation
 */
export const RiskLevelSchema = z.enum(['low', 'moderate', 'high', 'critical'], {
  errorMap: () => ({ message: 'Nível de risco deve ser: low, moderate, high ou critical' })
});

/**
 * Position Side Validation
 */
export const PositionSideSchema = z.enum(['long', 'short'], {
  errorMap: () => ({ message: 'Lado da posição deve ser: long ou short' })
});

/**
 * Custom validators
 */
const PercentageSchema = z.number()
  .min(0, 'Percentual deve ser maior ou igual a 0')
  .max(100, 'Percentual deve ser menor ou igual a 100');

const PositiveNumberSchema = z.number()
  .positive('Número deve ser positivo');

const NonNegativeNumberSchema = z.number()
  .min(0, 'Número deve ser maior ou igual a zero');

const RiskScoreSchema = z.number()
  .min(0, 'Score de risco deve ser maior ou igual a 0')
  .max(100, 'Score de risco deve ser menor ou igual a 100');

/**
 * Risk Profile Validation Schemas
 */
export const CreateRiskProfileSchema = z.object({
  riskTolerance: RiskToleranceSchema,
  investmentHorizon: InvestmentHorizonSchema,
  maxDrawdown: PercentageSchema.optional(),
  maxLeverage: PositiveNumberSchema.optional(),
  maxPositionSize: PercentageSchema.optional(),
  maxSectorExposure: PercentageSchema.optional(),
  maxCorrelation: z.number()
    .min(0, 'Correlação máxima deve ser maior ou igual a 0')
    .max(1, 'Correlação máxima deve ser menor ou igual a 1')
    .optional(),
  isActive: z.boolean().optional().default(true),
  preferences: z.record(z.any()).optional(),
}).strict();

export const UpdateRiskProfileSchema = CreateRiskProfileSchema.partial().strict();

/**
 * Risk Limit Validation Schemas
 */
export const CreateRiskLimitSchema = z.object({
  limitType: z.enum([
    'max_portfolio_value',
    'max_position_size',
    'max_drawdown',
    'max_leverage',
    'max_margin_utilization',
    'max_total_exposure',
    'max_long_exposure',
    'max_short_exposure',
    'max_single_asset_exposure',
    'max_correlated_exposure',
    'min_diversification',
    'max_concentration_risk',
    'max_correlation_average',
    'max_volatility',
    'min_liquidity_ratio'
  ], {
    errorMap: () => ({ message: 'Tipo de limite inválido' })
  }),
  limitValue: NonNegativeNumberSchema,
  threshold: PercentageSchema.optional().default(80),
  severity: AlertSeveritySchema.optional().default('medium'),
  isActive: z.boolean().optional().default(true),
  description: z.string().min(1, 'Descrição é obrigatória').max(500, 'Descrição muito longa').optional(),
}).strict();

export const UpdateRiskLimitSchema = CreateRiskLimitSchema.partial().strict();

/**
 * Risk Alert Validation Schemas
 */
export const CreateRiskAlertSchema = z.object({
  limitId: z.string().uuid('ID do limite deve ser um UUID válido'),
  alertType: AlertTypeSchema,
  severity: AlertSeveritySchema,
  title: z.string().min(1, 'Título é obrigatório').max(100, 'Título muito longo'),
  message: z.string().min(1, 'Mensagem é obrigatória').max(1000, 'Mensagem muito longa'),
  limitType: z.string().min(1, 'Tipo de limite é obrigatório'),
  limitValue: NonNegativeNumberSchema,
  currentValue: NonNegativeNumberSchema,
  threshold: PercentageSchema,
}).strict();

export const UpdateRiskAlertSchema = z.object({
  isAcknowledged: z.boolean().optional(),
  acknowledgedBy: z.string().uuid('ID do usuário deve ser um UUID válido').optional(),
  isResolved: z.boolean().optional(),
  resolvedBy: z.string().uuid('ID do usuário deve ser um UUID válido').optional(),
  actionTaken: z.string().max(500, 'Ação tomada muito longa').optional(),
  actionDetails: z.string().max(1000, 'Detalhes da ação muito longos').optional(),
}).strict();

/**
 * Risk Metrics Validation Schemas
 */
export const RiskMetricsSchema = z.object({
  portfolioValue: NonNegativeNumberSchema,
  openPositions: z.number().int('Número de posições deve ser inteiro').min(0),
  cashBalance: NonNegativeNumberSchema,
  totalExposure: NonNegativeNumberSchema,
  longExposure: NonNegativeNumberSchema,
  shortExposure: NonNegativeNumberSchema,
  netExposure: z.number(),
  grossExposure: NonNegativeNumberSchema,
  totalExposurePercent: PercentageSchema,
  longExposurePercent: PercentageSchema,
  shortExposurePercent: PercentageSchema,
  currentLeverage: NonNegativeNumberSchema,
  marginUsed: NonNegativeNumberSchema,
  marginAvailable: NonNegativeNumberSchema,
  marginUtilization: PercentageSchema,
  largestPosition: NonNegativeNumberSchema,
  largestPositionPercent: PercentageSchema,
  unrealizedPnl: z.number(),
  realizedPnl: NonNegativeNumberSchema,
  totalPnl: z.number(),
  currentDrawdown: PercentageSchema,
  maxDrawdown: PercentageSchema,
  peakValue: NonNegativeNumberSchema,
  drawdownDuration: z.number().int('Duração do drawdown deve ser inteira').min(0),
  valueAtRisk: NonNegativeNumberSchema.optional(),
  expectedShortfall: NonNegativeNumberSchema.optional(),
  sharpeRatio: z.number().optional(),
  sortinoRatio: z.number().optional(),
  calmarRatio: z.number().optional(),
  volatility: PercentageSchema.optional(),
  beta: z.number().optional(),
  concentrationRisk: PercentageSchema.optional(),
  correlationAverage: z.number()
    .min(-1, 'Correlação média deve ser maior ou igual a -1')
    .max(1, 'Correlação média deve ser menor ou igual a 1')
    .optional(),
  overallRiskScore: RiskScoreSchema,
  riskLevel: RiskLevelSchema,
}).strict();

/**
 * Performance Ratios Validation Schema
 */
export const PerformanceRatiosSchema = z.object({
  sharpeRatio: z.number(),
  sortinoRatio: z.number(),
  calmarRatio: z.number(),
}).strict();

/**
 * Position Sizing Validation Schema
 */
export const PositionSizingSchema = z.object({
  symbol: z.string().min(1, 'Símbolo é obrigatório').max(20, 'Símbolo muito longo'),
  side: PositionSideSchema,
  quantity: NonNegativeNumberSchema,
  price: NonNegativeNumberSchema,
  stopLoss: NonNegativeNumberSchema.optional(),
  takeProfit: NonNegativeNumberSchema.optional(),
  riskAmount: NonNegativeNumberSchema.optional(),
  riskPercent: PercentageSchema.optional(),
}).strict();

/**
 * Trade Validation Schema
 */
export const TradeValidationSchema = z.object({
  symbol: z.string().min(1, 'Símbolo é obrigatório').max(20, 'Símbolo muito longo'),
  side: PositionSideSchema,
  quantity: NonNegativeNumberSchema,
  price: NonNegativeNumberSchema,
  stopLoss: NonNegativeNumberSchema.optional(),
}).strict();

/**
 * Stress Test Validation Schema
 */
export const StressTestScenarioSchema = z.object({
  name: z.string().min(1, 'Nome do cenário é obrigatório').max(100, 'Nome muito longo'),
  marketCrash: PercentageSchema.optional(),
  volatilitySpike: PercentageSchema.optional(),
  liquidityCrisis: PercentageSchema.optional(),
  correlationIncrease: PercentageSchema.optional(),
}).strict();

export const StressTestRequestSchema = z.object({
  scenarios: z.array(StressTestScenarioSchema).min(1, 'Pelo menos um cenário é obrigatório').max(10, 'Máximo 10 cenários'),
}).strict();

/**
 * Portfolio Optimization Validation Schema
 */
export const PortfolioOptimizationSchema = z.object({
  targetReturn: PercentageSchema.optional(),
  maxRisk: PercentageSchema.optional(),
  rebalanceThreshold: PercentageSchema.optional().default(5),
  constraints: z.object({
    maxPositionSize: PercentageSchema.optional(),
    minPositionSize: PercentageSchema.optional(),
    maxSectorExposure: PercentageSchema.optional(),
  }).optional(),
}).strict();

/**
 * Backtest Validation Schema
 */
export const BacktestRequestSchema = z.object({
  startDate: z.string().datetime('Data de início inválida'),
  endDate: z.string().datetime('Data de fim inválida'),
  initialCapital: NonNegativeNumberSchema,
  strategy: z.object({
    type: z.string().min(1, 'Tipo de estratégia é obrigatório'),
    parameters: z.record(z.any()),
  }),
  riskMetrics: z.array(z.string()).optional().default(['sharpe', 'sortino', 'calmar', 'var', 'cvar']),
}).strict();

/**
 * Query Parameters Validation Schemas
 */
export const PaginationSchema = z.object({
  page: z.coerce.number().int('Página deve ser um número inteiro').min(1, 'Página deve ser maior que 0').optional().default(1),
  limit: z.coerce.number().int('Limite deve ser um número inteiro').min(1, 'Limite deve ser maior que 0').max(100, 'Limite máximo é 100').optional().default(20),
});

export const DateRangeSchema = z.object({
  startDate: z.string().datetime('Data de início inválida').optional(),
  endDate: z.string().datetime('Data de fim inválida').optional(),
});

export const RiskLevelFilterSchema = z.object({
  riskLevel: RiskLevelSchema.optional(),
  severity: AlertSeveritySchema.optional(),
  isActive: z.coerce.boolean().optional(),
});

/**
 * Combined Query Schemas
 */
export const RiskMetricsQuerySchema = PaginationSchema.merge(DateRangeSchema).merge(RiskLevelFilterSchema);

export const RiskAlertsQuerySchema = PaginationSchema.merge(DateRangeSchema).merge(RiskLevelFilterSchema).merge(z.object({
  alertType: AlertTypeSchema.optional(),
  isResolved: z.coerce.boolean().optional(),
  isAcknowledged: z.coerce.boolean().optional(),
}));

/**
 * Custom validation functions
 */
export const validateRiskProfile = (data: unknown) => {
  return CreateRiskProfileSchema.parse(data);
};

export const validateRiskLimit = (data: unknown) => {
  return CreateRiskLimitSchema.parse(data);
};

export const validateRiskAlert = (data: unknown) => {
  return CreateRiskAlertSchema.parse(data);
};

export const validateTrade = (data: unknown) => {
  return TradeValidationSchema.parse(data);
};

export const validateStressTest = (data: unknown) => {
  return StressTestRequestSchema.parse(data);
};

export const validatePortfolioOptimization = (data: unknown) => {
  return PortfolioOptimizationSchema.parse(data);
};

export const validateBacktest = (data: unknown) => {
  return BacktestRequestSchema.parse(data);
};

/**
 * Error formatter for API responses
 */
export const formatZodError = (error: z.ZodError) => {
  return {
    success: false,
    error: 'Validation Error',
    details: error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    })),
  };
};

/**
 * Safe validation wrapper
 */
export const safeValidate = <T>(schema: z.ZodSchema<T>, data: unknown) => {
  try {
    return { success: true, data: schema.parse(data) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: formatZodError(error) };
    }
    return { success: false, error: { message: 'Unknown validation error' } };
  }
};