/**
 * Risk Repository Interfaces
 * Defines contracts for data access layer
 * 
 * Benefits:
 * - Decouples business logic from database implementation
 * - Enables easy testing with mocks
 * - Supports multiple data sources
 * - Follows Clean Architecture principles
 */

import type { 
  RiskProfile, 
  RiskLimit, 
  RiskMetrics, 
  RiskAlert,
  CreateRiskProfileRequest,
  UpdateRiskProfileRequest,
  CreateRiskLimitRequest,
  UpdateRiskLimitRequest,
  CreateRiskAlertRequest,
  UpdateRiskAlertRequest
} from '../../types/risk.types';

/**
 * Base repository interface
 */
export interface IBaseRepository<T, CreateRequest, UpdateRequest> {
  create(data: CreateRequest): Promise<T>;
  findById(id: string): Promise<T | null>;
  findByUserId(userId: string, tenantId: string): Promise<T[]>;
  update(id: string, data: UpdateRequest): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  exists(id: string): Promise<boolean>;
}

/**
 * Risk Profile Repository Interface
 */
export interface IRiskProfileRepository extends IBaseRepository<
  RiskProfile,
  CreateRiskProfileRequest,
  UpdateRiskProfileRequest
> {
  findByUserIdAndTenant(userId: string, tenantId: string): Promise<RiskProfile | null>;
  findByRiskTolerance(tolerance: string): Promise<RiskProfile[]>;
  findByInvestmentHorizon(horizon: string): Promise<RiskProfile[]>;
  findByActiveStatus(active: boolean): Promise<RiskProfile[]>;
  countByTenant(tenantId: string): Promise<number>;
  getActiveProfileCount(): Promise<number>;
}

/**
 * Risk Limit Repository Interface
 */
export interface IRiskLimitRepository extends IBaseRepository<
  RiskLimit,
  CreateRiskLimitRequest,
  UpdateRiskLimitRequest
> {
  findByUserIdAndTenant(userId: string, tenantId: string): Promise<RiskLimit[]>;
  findByLimitType(limitType: string): Promise<RiskLimit[]>;
  findByActiveStatus(active: boolean): Promise<RiskLimit[]>;
  findBySeverity(severity: string): Promise<RiskLimit[]>;
  getLimitsForValidation(userId: string, tenantId: string): Promise<RiskLimit[]>;
  countByTenant(tenantId: string): Promise<number>;
}

/**
 * Risk Metrics Repository Interface
 */
export interface IRiskMetricsRepository {
  create(metrics: Omit<RiskMetrics, 'id' | 'calculatedAt' | 'snapshotDate'>): Promise<RiskMetrics>;
  findById(id: string): Promise<RiskMetrics | null>;
  findByUserId(userId: string, tenantId: string, limit?: number): Promise<RiskMetrics[]>;
  findByDateRange(userId: string, tenantId: string, startDate: Date, endDate: Date): Promise<RiskMetrics[]>;
  findLatest(userId: string, tenantId: string): Promise<RiskMetrics | null>;
  findByRiskLevel(riskLevel: string): Promise<RiskMetrics[]>;
  findByPortfolioValueRange(minValue: number, maxValue: number): Promise<RiskMetrics[]>;
  deleteOldMetrics(cutoffDate: Date): Promise<number>;
  countByTenant(tenantId: string): Promise<number>;
  getMetricsHistory(userId: string, tenantId: string, days: number): Promise<RiskMetrics[]>;
  getAggregatedMetrics(tenantId: string, startDate: Date, endDate: Date): Promise<{
    averageRiskScore: number;
    totalPortfolioValue: number;
    riskLevelDistribution: Record<string, number>;
  }>;
}

/**
 * Risk Alert Repository Interface
 */
export interface IRiskAlertRepository extends IBaseRepository<
  RiskAlert,
  CreateRiskAlertRequest,
  UpdateRiskAlertRequest
> {
  findByUserIdAndTenant(userId: string, tenantId: string): Promise<RiskAlert[]>;
  findByAlertType(alertType: string): Promise<RiskAlert[]>;
  findBySeverity(severity: string): Promise<RiskAlert[]>;
  findByResolvedStatus(resolved: boolean): Promise<RiskAlert[]>;
  findByAcknowledgedStatus(acknowledged: boolean): Promise<RiskAlert[]>;
  findActiveAlerts(userId: string, tenantId: string): Promise<RiskAlert[]>;
  acknowledgeAlert(id: string, acknowledgedBy: string): Promise<RiskAlert | null>;
  resolveAlert(id: string, resolvedBy: string, actionTaken?: string, actionDetails?: string): Promise<RiskAlert | null>;
  countByTenant(tenantId: string): Promise<number>;
  getAlertStatistics(tenantId: string, startDate: Date, endDate: Date): Promise<{
    totalAlerts: number;
    resolvedAlerts: number;
    acknowledgedAlerts: number;
    alertsByType: Record<string, number>;
    alertsBySeverity: Record<string, number>;
  }>;
}

/**
 * Risk Analytics Repository Interface
 * For complex analytical queries
 */
export interface IRiskAnalyticsRepository {
  getCorrelationMatrix(userId: string, tenantId: string): Promise<number[][]>;
  getRiskDistribution(tenantId: string): Promise<{
    low: number;
    moderate: number;
    high: number;
    critical: number;
  }>;
  getPerformanceMetrics(userId: string, tenantId: string, days: number): Promise<{
    sharpeRatio: number;
    sortinoRatio: number;
    calmarRatio: number;
    maxDrawdown: number;
    volatility: number;
  }>;
  getConcentrationAnalysis(userId: string, tenantId: string): Promise<{
    hhi: number;
    largestPositionPercent: number;
    diversificationScore: number;
  }>;
  getLiquidityAnalysis(userId: string, tenantId: string): Promise<{
    liquidityRatio: number;
    illiquidPositions: number;
    averageLiquidationTime: number;
  }>;
  getStressTestResults(userId: string, tenantId: string, scenarios: any[]): Promise<any[]>;
  getPortfolioOptimization(userId: string, tenantId: string, options: any): Promise<any>;
}

/**
 * Risk Audit Repository Interface
 * For audit and compliance queries
 */
export interface IRiskAuditRepository {
  getAuditTrail(userId: string, tenantId: string, startDate: Date, endDate: Date): Promise<{
    profileChanges: any[];
    limitChanges: any[];
    alertHistory: any[];
    metricsHistory: any[];
  }>;
  getComplianceReport(tenantId: string, startDate: Date, endDate: Date): Promise<{
    riskLimitsCompliance: number;
    alertResponseTime: number;
    dataRetentionCompliance: boolean;
    auditLogs: any[];
  }>;
  getRiskEvents(userId: string, tenantId: string, eventType: string): Promise<any[]>;
  getDataRetentionStats(tenantId: string): Promise<{
    totalRecords: number;
    archivedRecords: number;
    deletedRecords: number;
    retentionCompliance: boolean;
  }>;
}

/**
 * Repository Factory Interface
 * For dependency injection
 */
export interface IRiskRepositoryFactory {
  profiles: IRiskProfileRepository;
  limits: IRiskLimitRepository;
  metrics: IRiskMetricsRepository;
  alerts: IRiskAlertRepository;
  analytics: IRiskAnalyticsRepository;
  audit: IRiskAuditRepository;
}