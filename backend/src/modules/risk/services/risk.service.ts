/**
 * Risk Management Service
 * Portfolio risk analysis and management
 */

import { db } from '@/db';
import { riskProfiles, riskLimits, riskMetrics, riskAlerts } from '../schema/risk.schema';
import { positions } from '../../positions/schema/positions.schema';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import logger from '@/utils/logger';
import type {
  RiskProfile,
  RiskLimit,
  RiskMetrics,
  RiskAlert,
  CreateRiskProfileRequest,
  UpdateRiskProfileRequest,
  CreateRiskLimitRequest,
  UpdateRiskLimitRequest,
  PositionSizingRequest,
  PositionSizingResult,
  RiskRewardRequest,
  RiskRewardAnalysis,
  PortfolioRiskAnalysis,
  DrawdownAnalysis,
  VaRCalculationRequest,
  VaRResult,
  PerformanceRatios,
  VolatilityAnalysis,
  IRiskService,
  PositionSide,
} from '../types/risk.types';

class RiskService implements IRiskService {
  // ============================================================================
  // RISK PROFILE MANAGEMENT
  // ============================================================================

  async createRiskProfile(
    userId: string,
    tenantId: string,
    request: CreateRiskProfileRequest
  ): Promise<RiskProfile> {
    try {
      const [profile] = await db
        .insert(riskProfiles)
        .values({
          userId,
          tenantId,
          riskTolerance: request.riskTolerance,
          maxPortfolioRisk: request.maxPortfolioRisk?.toString(),
          maxPositionRisk: request.maxPositionRisk?.toString(),
          maxDrawdown: request.maxDrawdown?.toString(),
          defaultPositionSize: request.defaultPositionSize?.toString(),
          maxPositionSize: request.maxPositionSize?.toString(),
          useKellyCriterion: request.useKellyCriterion,
          kellyFraction: request.kellyFraction?.toString(),
          maxLeverage: request.maxLeverage?.toString(),
          maxMarginUtilization: request.maxMarginUtilization?.toString(),
          maxTotalExposure: request.maxTotalExposure?.toString(),
          maxLongExposure: request.maxLongExposure?.toString(),
          maxShortExposure: request.maxShortExposure?.toString(),
          maxSingleAssetExposure: request.maxSingleAssetExposure?.toString(),
          maxCorrelatedExposure: request.maxCorrelatedExposure?.toString(),
          minDiversification: request.minDiversification?.toString(),
          defaultStopLoss: request.defaultStopLoss?.toString(),
          useTrailingStop: request.useTrailingStop,
          defaultTrailingStop: request.defaultTrailingStop?.toString(),
          minRiskRewardRatio: request.minRiskRewardRatio?.toString(),
          alertOnLimitViolation: request.alertOnLimitViolation,
          alertOnDrawdown: request.alertOnDrawdown,
          alertOnLargePosition: request.alertOnLargePosition,
        })
        .returning();

      logger.info('Risk profile created', { userId, tenantId });
      return this.mapRiskProfile(profile);
    } catch (error) {
      logger.error('Failed to create risk profile', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getRiskProfile(userId: string, tenantId: string): Promise<RiskProfile | null> {
    try {
      const [profile] = await db
        .select()
        .from(riskProfiles)
        .where(and(eq(riskProfiles.userId, userId), eq(riskProfiles.tenantId, tenantId)))
        .limit(1);

      return profile ? this.mapRiskProfile(profile) : null;
    } catch (error) {
      logger.error('Failed to get risk profile', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async updateRiskProfile(
    userId: string,
    tenantId: string,
    updates: UpdateRiskProfileRequest
  ): Promise<RiskProfile> {
    try {
      const updateData: any = { updatedAt: new Date() };

      if (updates.riskTolerance !== undefined) updateData.riskTolerance = updates.riskTolerance;
      if (updates.maxPortfolioRisk !== undefined) updateData.maxPortfolioRisk = updates.maxPortfolioRisk.toString();
      if (updates.maxPositionRisk !== undefined) updateData.maxPositionRisk = updates.maxPositionRisk.toString();
      if (updates.maxDrawdown !== undefined) updateData.maxDrawdown = updates.maxDrawdown.toString();
      if (updates.defaultPositionSize !== undefined) updateData.defaultPositionSize = updates.defaultPositionSize.toString();
      if (updates.maxPositionSize !== undefined) updateData.maxPositionSize = updates.maxPositionSize.toString();
      if (updates.useKellyCriterion !== undefined) updateData.useKellyCriterion = updates.useKellyCriterion;
      if (updates.kellyFraction !== undefined) updateData.kellyFraction = updates.kellyFraction.toString();
      if (updates.maxLeverage !== undefined) updateData.maxLeverage = updates.maxLeverage.toString();
      if (updates.maxMarginUtilization !== undefined) updateData.maxMarginUtilization = updates.maxMarginUtilization.toString();

      const [profile] = await db
        .update(riskProfiles)
        .set(updateData)
        .where(and(eq(riskProfiles.userId, userId), eq(riskProfiles.tenantId, tenantId)))
        .returning();

      logger.info('Risk profile updated', { userId, tenantId });
      return this.mapRiskProfile(profile);
    } catch (error) {
      logger.error('Failed to update risk profile', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // ============================================================================
  // RISK LIMITS
  // ============================================================================

  async createRiskLimit(
    userId: string,
    tenantId: string,
    request: CreateRiskLimitRequest
  ): Promise<RiskLimit> {
    try {
      const profile = await this.getRiskProfile(userId, tenantId);
      if (!profile) {
        throw new Error('Risk profile not found');
      }

      const [limit] = await db
        .insert(riskLimits)
        .values({
          userId,
          tenantId,
          profileId: profile.id,
          limitType: request.limitType,
          limitName: request.limitName,
          limitValue: request.limitValue.toString(),
          limitUnit: request.limitUnit,
          scope: request.scope,
          scopeId: request.scopeId,
          hardLimit: request.hardLimit ?? false,
          alertOnViolation: request.alertOnViolation ?? true,
          violationAction: request.violationAction ?? 'alert',
          notes: request.notes,
        })
        .returning();

      logger.info('Risk limit created', { userId, limitType: request.limitType });
      return this.mapRiskLimit(limit);
    } catch (error) {
      logger.error('Failed to create risk limit', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getRiskLimits(userId: string, tenantId: string): Promise<RiskLimit[]> {
    try {
      const limits = await db
        .select()
        .from(riskLimits)
        .where(and(eq(riskLimits.userId, userId), eq(riskLimits.tenantId, tenantId)));

      return limits.map((l) => this.mapRiskLimit(l));
    } catch (error) {
      logger.error('Failed to get risk limits', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async updateRiskLimit(
    limitId: string,
    userId: string,
    tenantId: string,
    updates: UpdateRiskLimitRequest
  ): Promise<RiskLimit> {
    try {
      const updateData: any = { updatedAt: new Date() };

      if (updates.limitValue !== undefined) updateData.limitValue = updates.limitValue.toString();
      if (updates.enabled !== undefined) updateData.enabled = updates.enabled;
      if (updates.hardLimit !== undefined) updateData.hardLimit = updates.hardLimit;
      if (updates.alertOnViolation !== undefined) updateData.alertOnViolation = updates.alertOnViolation;
      if (updates.violationAction !== undefined) updateData.violationAction = updates.violationAction;
      if (updates.notes !== undefined) updateData.notes = updates.notes;

      const [limit] = await db
        .update(riskLimits)
        .set(updateData)
        .where(
          and(
            eq(riskLimits.id, limitId),
            eq(riskLimits.userId, userId),
            eq(riskLimits.tenantId, tenantId)
          )
        )
        .returning();

      logger.info('Risk limit updated', { limitId, userId });
      return this.mapRiskLimit(limit);
    } catch (error) {
      logger.error('Failed to update risk limit', {
        limitId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async deleteRiskLimit(limitId: string, userId: string, tenantId: string): Promise<void> {
    try {
      await db
        .delete(riskLimits)
        .where(
          and(
            eq(riskLimits.id, limitId),
            eq(riskLimits.userId, userId),
            eq(riskLimits.tenantId, tenantId)
          )
        );

      logger.info('Risk limit deleted', { limitId, userId });
    } catch (error) {
      logger.error('Failed to delete risk limit', {
        limitId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async checkLimitViolations(userId: string, tenantId: string): Promise<RiskAlert[]> {
    try {
      const limits = await this.getRiskLimits(userId, tenantId);
      const metrics = await this.calculateRiskMetrics(userId, tenantId);
      const alerts: RiskAlert[] = [];

      for (const limit of limits) {
        if (!limit.enabled) continue;

        let currentValue: number | undefined;
        let violated = false;

        // Check different limit types
        switch (limit.limitType) {
          case 'daily_loss':
            currentValue = Math.abs(metrics.totalPnl);
            violated = currentValue > limit.limitValue;
            break;
          case 'position_size':
            currentValue = metrics.largestPositionPercent;
            violated = currentValue > limit.limitValue;
            break;
          case 'leverage':
            currentValue = metrics.currentLeverage;
            violated = currentValue > limit.limitValue;
            break;
          case 'exposure':
            currentValue = metrics.totalExposurePercent;
            violated = currentValue > limit.limitValue;
            break;
          case 'drawdown':
            currentValue = metrics.currentDrawdown;
            violated = currentValue > limit.limitValue;
            break;
        }

        if (violated && currentValue !== undefined) {
          const alert = await this.createAlert(userId, tenantId, {
            limitId: limit.id,
            alertType: 'limit_violation',
            severity: limit.hardLimit ? 'critical' : 'warning',
            title: `${limit.limitName} Limit Exceeded`,
            message: `Current value ${currentValue.toFixed(2)} exceeds limit of ${limit.limitValue}`,
            limitType: limit.limitType,
            limitValue: limit.limitValue,
            currentValue,
            violationPercent: ((currentValue - limit.limitValue) / limit.limitValue) * 100,
          });

          alerts.push(alert);

          // Update limit violation tracking
          await db
            .update(riskLimits)
            .set({
              currentValue: currentValue.toString(),
              lastViolation: new Date(),
              violationCount: sql`${riskLimits.violationCount} + 1`,
            })
            .where(eq(riskLimits.id, limit.id));
        }
      }

      return alerts;
    } catch (error) {
      logger.error('Failed to check limit violations', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // ============================================================================
  // RISK METRICS CALCULATION
  // ============================================================================

  async calculateRiskMetrics(userId: string, tenantId: string): Promise<RiskMetrics> {
    try {
      // Get all open positions
      const openPositions = await db
        .select()
        .from(positions)
        .where(
          and(
            eq(positions.userId, userId),
            eq(positions.tenantId, tenantId),
            eq(positions.status, 'open')
          )
        );

      // Calculate portfolio value and exposures
      let portfolioValue = 0;
      const cashBalance = 0; // TODO: Get from wallet/balance
      let longExposure = 0;
      let shortExposure = 0;
      let marginUsed = 0;
      let unrealizedPnl = 0;
      let realizedPnl = 0;
      let largestPosition = 0;

      for (const pos of openPositions) {
        const posValue = parseFloat(pos.currentPrice) * parseFloat(pos.remainingQuantity);
        portfolioValue += posValue;

        if (pos.side === 'long') {
          longExposure += posValue;
        } else {
          shortExposure += posValue;
        }

        marginUsed += parseFloat(pos.marginUsed || '0');
        unrealizedPnl += parseFloat(pos.unrealizedPnl || '0');
        realizedPnl += parseFloat(pos.realizedPnl || '0');

        if (posValue > largestPosition) {
          largestPosition = posValue;
        }
      }

      const totalExposure = longExposure + shortExposure;
      const netExposure = longExposure - shortExposure;
      const grossExposure = longExposure + shortExposure;

      // Calculate percentages
      const totalExposurePercent = portfolioValue > 0 ? (totalExposure / portfolioValue) * 100 : 0;
      const longExposurePercent = portfolioValue > 0 ? (longExposure / portfolioValue) * 100 : 0;
      const shortExposurePercent = portfolioValue > 0 ? (shortExposure / portfolioValue) * 100 : 0;
      const largestPositionPercent = portfolioValue > 0 ? (largestPosition / portfolioValue) * 100 : 0;

      // Calculate leverage
      const currentLeverage = portfolioValue > 0 ? grossExposure / portfolioValue : 1;

      // Calculate drawdown
      const drawdownAnalysis = await this.analyzeDrawdown(userId, tenantId);

      // Calculate overall risk score (0-100)
      const overallRiskScore = this.calculateRiskScore({
        leverage: currentLeverage,
        exposurePercent: totalExposurePercent,
        drawdown: drawdownAnalysis.currentDrawdown,
        positionCount: openPositions.length,
        marginUtilization: marginUsed,
      });

      // Determine risk level
      let riskLevel: 'low' | 'moderate' | 'high' | 'critical' = 'low';
      if (overallRiskScore > 75) riskLevel = 'critical';
      else if (overallRiskScore > 50) riskLevel = 'high';
      else if (overallRiskScore > 25) riskLevel = 'moderate';

      // Save metrics to database
      const [savedMetrics] = await db
        .insert(riskMetrics)
        .values({
          userId,
          tenantId,
          portfolioValue: portfolioValue.toString(),
          cashBalance: cashBalance.toString(),
          totalExposure: totalExposure.toString(),
          longExposure: longExposure.toString(),
          shortExposure: shortExposure.toString(),
          netExposure: netExposure.toString(),
          grossExposure: grossExposure.toString(),
          totalExposurePercent: totalExposurePercent.toString(),
          longExposurePercent: longExposurePercent.toString(),
          shortExposurePercent: shortExposurePercent.toString(),
          currentLeverage: currentLeverage.toString(),
          marginUsed: marginUsed.toString(),
          marginAvailable: '0', // TODO: Calculate from wallet
          marginUtilization: '0',
          openPositions: openPositions.length.toString(),
          largestPosition: largestPosition.toString(),
          largestPositionPercent: largestPositionPercent.toString(),
          unrealizedPnl: unrealizedPnl.toString(),
          realizedPnl: realizedPnl.toString(),
          totalPnl: (unrealizedPnl + realizedPnl).toString(),
          currentDrawdown: drawdownAnalysis.currentDrawdown.toString(),
          maxDrawdown: drawdownAnalysis.maxDrawdown.toString(),
          peakValue: drawdownAnalysis.peakValue.toString(),
          drawdownDuration: drawdownAnalysis.durationDays.toString(),
          overallRiskScore: overallRiskScore.toString(),
          riskLevel,
        })
        .returning();

      logger.info('Risk metrics calculated', { userId, riskScore: overallRiskScore });
      return this.mapRiskMetrics(savedMetrics);
    } catch (error) {
      logger.error('Failed to calculate risk metrics', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getRiskMetrics(userId: string, tenantId: string): Promise<RiskMetrics | null> {
    try {
      const [metrics] = await db
        .select()
        .from(riskMetrics)
        .where(and(eq(riskMetrics.userId, userId), eq(riskMetrics.tenantId, tenantId)))
        .orderBy(desc(riskMetrics.calculatedAt))
        .limit(1);

      return metrics ? this.mapRiskMetrics(metrics) : null;
    } catch (error) {
      logger.error('Failed to get risk metrics', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getRiskMetricsHistory(userId: string, tenantId: string, days: number): Promise<RiskMetrics[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const metricsHistory = await db
        .select()
        .from(riskMetrics)
        .where(
          and(
            eq(riskMetrics.userId, userId),
            eq(riskMetrics.tenantId, tenantId),
            gte(riskMetrics.calculatedAt, cutoffDate)
          )
        )
        .orderBy(desc(riskMetrics.calculatedAt));

      return metricsHistory.map((m) => this.mapRiskMetrics(m));
    } catch (error) {
      logger.error('Failed to get risk metrics history', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // ============================================================================
  // POSITION SIZING
  // ============================================================================

  async calculatePositionSize(
    userId: string,
    tenantId: string,
    request: PositionSizingRequest
  ): Promise<PositionSizingResult> {
    try {
      const profile = await this.getRiskProfile(userId, tenantId);
      if (!profile) {
        throw new Error('Risk profile not found');
      }

      const metrics = await this.getRiskMetrics(userId, tenantId);
      const portfolioValue = request.portfolioValue ?? metrics?.portfolioValue ?? 10000;

      const method = request.method ?? (profile.useKellyCriterion ? 'kelly' : 'fixed');
      let recommendedSize = 0;
      const warnings: string[] = [];

      // Calculate risk per unit
      const riskPerUnit = Math.abs(request.entryPrice - request.stopLoss);
      const riskPercent = (riskPerUnit / request.entryPrice) * 100;

      // Method-specific sizing
      switch (method) {
        case 'fixed':
          // Fixed percentage of portfolio
          recommendedSize = (portfolioValue * profile.defaultPositionSize) / 100 / request.entryPrice;
          break;

        case 'kelly':
          // Kelly Criterion: f = (bp - q) / b
          // where: f = fraction to bet, b = odds (R:R ratio), p = win probability, q = 1 - p
          // Simplified: use max position risk
          const kellyFraction = profile.kellyFraction;
          const riskAmount = (portfolioValue * profile.maxPositionRisk) / 100;
          recommendedSize = (riskAmount / riskPerUnit) * kellyFraction;
          break;

        case 'risk_parity':
          // Equal risk contribution
          const targetRisk = (portfolioValue * profile.maxPositionRisk) / 100;
          recommendedSize = targetRisk / riskPerUnit;
          break;
      }

      // Apply maximum position size constraint
      const maxSize = (portfolioValue * profile.maxPositionSize) / 100 / request.entryPrice;
      if (recommendedSize > maxSize) {
        recommendedSize = maxSize;
        warnings.push(`Position size capped at maximum ${profile.maxPositionSize}% of portfolio`);
      }

      // Calculate actual risk
      const actualSize = recommendedSize * request.entryPrice;
      const riskAmount = recommendedSize * riskPerUnit;
      const actualRiskPercent = (riskAmount / portfolioValue) * 100;

      // Confidence score (0-1)
      let confidence = 1.0;
      if (riskPercent > 5) confidence -= 0.2; // High price risk
      if (actualRiskPercent > profile.maxPositionRisk) confidence -= 0.3;
      if (method === 'kelly') confidence -= 0.1; // Kelly is more aggressive

      return {
        recommendedSize: actualSize,
        recommendedSizePercent: (actualSize / portfolioValue) * 100,
        maxSize: maxSize * request.entryPrice,
        riskAmount,
        riskPercent: actualRiskPercent,
        method,
        confidence: Math.max(0, Math.min(1, confidence)),
        warnings,
      };
    } catch (error) {
      logger.error('Failed to calculate position size', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // ============================================================================
  // RISK/REWARD ANALYSIS
  // ============================================================================

  async analyzeRiskReward(
    userId: string,
    tenantId: string,
    request: RiskRewardRequest
  ): Promise<RiskRewardAnalysis> {
    try {
      const profile = await this.getRiskProfile(userId, tenantId);
      if (!profile) {
        throw new Error('Risk profile not found');
      }

      const riskAmount = Math.abs(request.entryPrice - request.stopLoss);
      const rewardAmount = Math.abs(request.takeProfit - request.entryPrice);
      const riskRewardRatio = rewardAmount / riskAmount;

      // Calculate expected value if win probability provided
      let expectedValue: number | undefined;
      if (request.winProbability !== undefined) {
        expectedValue = request.winProbability * rewardAmount - (1 - request.winProbability) * riskAmount;
      }

      // Determine recommendation
      let recommendation: 'take' | 'skip' | 'adjust' = 'take';
      const reasons: string[] = [];

      if (riskRewardRatio < profile.minRiskRewardRatio) {
        recommendation = 'skip';
        reasons.push(`R:R ratio ${riskRewardRatio.toFixed(2)} below minimum ${profile.minRiskRewardRatio}`);
      }

      if (expectedValue !== undefined && expectedValue < 0) {
        recommendation = 'skip';
        reasons.push(`Negative expected value: ${expectedValue.toFixed(2)}`);
      }

      if (riskRewardRatio >= profile.minRiskRewardRatio && recommendation === 'take') {
        reasons.push(`Good R:R ratio: ${riskRewardRatio.toFixed(2)}:1`);
      }

      return {
        entryPrice: request.entryPrice,
        stopLoss: request.stopLoss,
        takeProfit: request.takeProfit,
        riskAmount,
        rewardAmount,
        riskRewardRatio,
        winProbability: request.winProbability,
        expectedValue,
        recommendation,
        reasons,
      };
    } catch (error) {
      logger.error('Failed to analyze risk/reward', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // ============================================================================
  // PORTFOLIO ANALYSIS
  // ============================================================================

  async analyzePortfolioRisk(userId: string, tenantId: string): Promise<PortfolioRiskAnalysis> {
    try {
      const metrics = await this.getRiskMetrics(userId, tenantId);
      if (!metrics) {
        throw new Error('Risk metrics not available');
      }

      const openPositions = await db
        .select()
        .from(positions)
        .where(
          and(
            eq(positions.userId, userId),
            eq(positions.tenantId, tenantId),
            eq(positions.status, 'open')
          )
        );

      const totalRisk = parseFloat(metrics.unrealizedPnl.toString());
      const totalRiskPercent = (Math.abs(totalRisk) / metrics.portfolioValue) * 100;

      // Calculate top risks
      const topRisks = openPositions
        .map((pos) => {
          const riskAmount = parseFloat(pos.unrealizedPnl || '0');
          const riskPercent = (Math.abs(riskAmount) / metrics.portfolioValue) * 100;
          return {
            positionId: pos.id,
            symbol: pos.symbol,
            riskAmount,
            riskPercent,
          };
        })
        .sort((a, b) => Math.abs(b.riskAmount) - Math.abs(a.riskAmount))
        .slice(0, 5);

      // Diversification score (0-100)
      const diversificationScore = this.calculateDiversificationScore(openPositions.length);

      // Recommendations
      const recommendations: string[] = [];
      if (openPositions.length < 3) {
        recommendations.push('Consider diversifying across more positions');
      }
      if (totalRiskPercent > 10) {
        recommendations.push('Total portfolio risk is high - consider reducing exposure');
      }
      if (metrics.currentLeverage > 3) {
        recommendations.push('Leverage is elevated - monitor closely');
      }

      return {
        totalRisk,
        totalRiskPercent,
        positionCount: openPositions.length,
        diversificationScore,
        topRisks,
        recommendations,
      };
    } catch (error) {
      logger.error('Failed to analyze portfolio risk', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // ============================================================================
  // DRAWDOWN ANALYSIS
  // ============================================================================

  async analyzeDrawdown(userId: string, tenantId: string): Promise<DrawdownAnalysis> {
    try {
      const metricsHistory = await this.getRiskMetricsHistory(userId, tenantId, 365);

      if (metricsHistory.length === 0) {
        return {
          currentDrawdown: 0,
          currentDrawdownAmount: 0,
          maxDrawdown: 0,
          maxDrawdownAmount: 0,
          peakValue: 0,
          peakDate: new Date(),
          durationDays: 0,
          isAtRisk: false,
          warnings: [],
        };
      }

      // Find peak and calculate drawdown
      let peakValue = 0;
      let peakDate = new Date();
      let maxDrawdown = 0;
      let maxDrawdownAmount = 0;

      for (const m of metricsHistory) {
        if (m.portfolioValue > peakValue) {
          peakValue = m.portfolioValue;
          peakDate = m.calculatedAt;
        }
      }

      const currentValue = metricsHistory[0].portfolioValue;
      const currentDrawdown = ((peakValue - currentValue) / peakValue) * 100;
      const currentDrawdownAmount = peakValue - currentValue;

      // Calculate max drawdown
      for (const m of metricsHistory) {
        const dd = ((peakValue - m.portfolioValue) / peakValue) * 100;
        if (dd > maxDrawdown) {
          maxDrawdown = dd;
          maxDrawdownAmount = peakValue - m.portfolioValue;
        }
      }

      // Calculate duration
      const durationDays = Math.floor((new Date().getTime() - peakDate.getTime()) / (1000 * 60 * 60 * 24));

      // Warnings
      const warnings: string[] = [];
      const profile = await this.getRiskProfile(userId, tenantId);
      const isAtRisk = profile ? currentDrawdown > profile.maxDrawdown : false;

      if (isAtRisk) {
        warnings.push(`Drawdown ${currentDrawdown.toFixed(2)}% exceeds maximum ${profile?.maxDrawdown}%`);
      }
      if (durationDays > 30) {
        warnings.push(`Prolonged drawdown: ${durationDays} days`);
      }

      return {
        currentDrawdown,
        currentDrawdownAmount,
        maxDrawdown,
        maxDrawdownAmount,
        peakValue,
        peakDate,
        durationDays,
        isAtRisk,
        warnings,
      };
    } catch (error) {
      logger.error('Failed to analyze drawdown', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // ============================================================================
  // VAR CALCULATION
  // ============================================================================

  async calculateVaR(
    userId: string,
    tenantId: string,
    request: VaRCalculationRequest
  ): Promise<VaRResult> {
    try {
      const confidence = request.confidence ?? 0.95;
      const timeHorizon = request.timeHorizon ?? 1;
      const method = request.method ?? 'historical';

      const metricsHistory = await this.getRiskMetricsHistory(userId, tenantId, 252); // 1 year

      if (metricsHistory.length < 30) {
        throw new Error('Insufficient historical data for VaR calculation');
      }

      // Calculate daily returns
      const returns: number[] = [];
      for (let i = 0; i < metricsHistory.length - 1; i++) {
        const dailyReturn =
          (metricsHistory[i].portfolioValue - metricsHistory[i + 1].portfolioValue) /
          metricsHistory[i + 1].portfolioValue;
        returns.push(dailyReturn);
      }

      let valueAtRisk = 0;

      if (method === 'historical') {
        // Historical VaR
        returns.sort((a, b) => a - b);
        const index = Math.floor(returns.length * (1 - confidence));
        valueAtRisk = Math.abs(returns[index] * metricsHistory[0].portfolioValue);
      } else if (method === 'parametric') {
        // Parametric VaR (assumes normal distribution)
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        const stdDev = Math.sqrt(variance);

        // Z-score for 95% confidence ≈ 1.645, 99% ≈ 2.326
        const zScore = confidence === 0.99 ? 2.326 : 1.645;
        valueAtRisk = Math.abs((mean - zScore * stdDev) * metricsHistory[0].portfolioValue);
      }

      // Scale by time horizon (square root of time rule)
      valueAtRisk *= Math.sqrt(timeHorizon);

      return {
        valueAtRisk,
        confidence,
        timeHorizon,
        method,
        breakdown: [], // TODO: Implement position-level breakdown
      };
    } catch (error) {
      logger.error('Failed to calculate VaR', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // ============================================================================
  // PERFORMANCE RATIOS
  // ============================================================================

  async calculatePerformanceRatios(userId: string, tenantId: string, days: number): Promise<PerformanceRatios> {
    try {
      const metricsHistory = await this.getRiskMetricsHistory(userId, tenantId, days);

      if (metricsHistory.length < 30) {
        throw new Error('Insufficient data for performance ratio calculation');
      }

      // Calculate daily returns
      const returns: number[] = [];
      for (let i = 0; i < metricsHistory.length - 1; i++) {
        const dailyReturn =
          (metricsHistory[i].portfolioValue - metricsHistory[i + 1].portfolioValue) /
          metricsHistory[i + 1].portfolioValue;
        returns.push(dailyReturn);
      }

      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
      const stdDev = Math.sqrt(variance);

      // Annualize
      const annualizedReturn = avgReturn * 252; // 252 trading days
      const annualizedStdDev = stdDev * Math.sqrt(252);

      // Sharpe Ratio (assuming 2% risk-free rate)
      const riskFreeRate = 0.02;
      const sharpeRatio = (annualizedReturn - riskFreeRate) / annualizedStdDev;

      // Sortino Ratio (downside deviation)
      const downsideReturns = returns.filter((r) => r < 0);
      const downsideVariance =
        downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downsideReturns.length;
      const downsideDeviation = Math.sqrt(downsideVariance) * Math.sqrt(252);
      const sortinoRatio = (annualizedReturn - riskFreeRate) / downsideDeviation;

      // Calmar Ratio (return / max drawdown)
      const drawdown = await this.analyzeDrawdown(userId, tenantId);
      const calmarRatio = drawdown.maxDrawdown > 0 ? annualizedReturn / (drawdown.maxDrawdown / 100) : 0;

      return {
        sharpeRatio,
        sortinoRatio,
        calmarRatio,
      };
    } catch (error) {
      logger.error('Failed to calculate performance ratios', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // ============================================================================
  // VOLATILITY ANALYSIS
  // ============================================================================

  async analyzeVolatility(userId: string, tenantId: string, _symbol?: string): Promise<VolatilityAnalysis> {
    try {
      const metricsHistory = await this.getRiskMetricsHistory(userId, tenantId, 252);

      if (metricsHistory.length < 30) {
        throw new Error('Insufficient data for volatility analysis');
      }

      // Calculate returns
      const returns: number[] = [];
      for (let i = 0; i < metricsHistory.length - 1; i++) {
        const dailyReturn =
          (metricsHistory[i].portfolioValue - metricsHistory[i + 1].portfolioValue) /
          metricsHistory[i + 1].portfolioValue;
        returns.push(dailyReturn);
      }

      // Current volatility (last 30 days)
      const recentReturns = returns.slice(0, 30);
      const recentVariance =
        recentReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / recentReturns.length;
      const currentVolatility = Math.sqrt(recentVariance) * Math.sqrt(252) * 100;

      // Historical volatility (all data)
      const variance = returns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / returns.length;
      const historicalVolatility = Math.sqrt(variance) * Math.sqrt(252) * 100;

      // Volatility trend
      let volatilityTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (currentVolatility > historicalVolatility * 1.2) {
        volatilityTrend = 'increasing';
      } else if (currentVolatility < historicalVolatility * 0.8) {
        volatilityTrend = 'decreasing';
      }

      // Percentile
      const sortedVols = returns.map((r) => Math.abs(r)).sort((a, b) => a - b);
      const currentIndex = sortedVols.findIndex((v) => v > Math.abs(recentReturns[0]));
      const percentile = (currentIndex / sortedVols.length) * 100;

      const isElevated = currentVolatility > historicalVolatility * 1.5;
      const warnings: string[] = [];
      if (isElevated) {
        warnings.push(`Volatility elevated: ${currentVolatility.toFixed(2)}% vs historical ${historicalVolatility.toFixed(2)}%`);
      }

      return {
        currentVolatility,
        historicalVolatility,
        volatilityTrend,
        percentile,
        isElevated,
        warnings,
      };
    } catch (error) {
      logger.error('Failed to analyze volatility', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // ============================================================================
  // ALERTS
  // ============================================================================

  async getAlerts(userId: string, tenantId: string, acknowledged?: boolean): Promise<RiskAlert[]> {
    try {
      const conditions = [eq(riskAlerts.userId, userId), eq(riskAlerts.tenantId, tenantId)];

      if (acknowledged !== undefined) {
        conditions.push(eq(riskAlerts.acknowledged, acknowledged));
      }

      const alerts = await db
        .select()
        .from(riskAlerts)
        .where(and(...conditions))
        .orderBy(desc(riskAlerts.createdAt));

      return alerts.map((a) => this.mapRiskAlert(a));
    } catch (error) {
      logger.error('Failed to get alerts', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async acknowledgeAlert(alertId: string, userId: string, tenantId: string): Promise<void> {
    try {
      await db
        .update(riskAlerts)
        .set({
          acknowledged: true,
          acknowledgedAt: new Date(),
        })
        .where(
          and(
            eq(riskAlerts.id, alertId),
            eq(riskAlerts.userId, userId),
            eq(riskAlerts.tenantId, tenantId)
          )
        );

      logger.info('Risk alert acknowledged', { alertId, userId });
    } catch (error) {
      logger.error('Failed to acknowledge alert', {
        alertId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async resolveAlert(alertId: string, userId: string, tenantId: string): Promise<void> {
    try {
      await db
        .update(riskAlerts)
        .set({
          resolved: true,
          resolvedAt: new Date(),
        })
        .where(
          and(
            eq(riskAlerts.id, alertId),
            eq(riskAlerts.userId, userId),
            eq(riskAlerts.tenantId, tenantId)
          )
        );

      logger.info('Risk alert resolved', { alertId, userId });
    } catch (error) {
      logger.error('Failed to resolve alert', {
        alertId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // ============================================================================
  // TRADE VALIDATION
  // ============================================================================

  async validateTrade(
    userId: string,
    tenantId: string,
    trade: { symbol: string; side: PositionSide; quantity: number; price: number; stopLoss?: number }
  ): Promise<{ allowed: boolean; violations: string[]; warnings: string[] }> {
    try {
      const profile = await this.getRiskProfile(userId, tenantId);
      const metrics = await this.getRiskMetrics(userId, tenantId);
      const violations: string[] = [];
      const warnings: string[] = [];

      if (!profile || !metrics) {
        return { allowed: false, violations: ['Risk profile not configured'], warnings: [] };
      }

      // Check position size
      const tradeValue = trade.quantity * trade.price;
      const positionSizePercent = (tradeValue / metrics.portfolioValue) * 100;

      if (positionSizePercent > profile.maxPositionSize) {
        violations.push(`Position size ${positionSizePercent.toFixed(2)}% exceeds maximum ${profile.maxPositionSize}%`);
      }

      // Check exposure
      const newExposure = metrics.totalExposurePercent + positionSizePercent;
      if (newExposure > profile.maxTotalExposure) {
        violations.push(`Total exposure would be ${newExposure.toFixed(2)}% (max: ${profile.maxTotalExposure}%)`);
      }

      // Check risk/reward if stop loss provided
      if (trade.stopLoss) {
        const riskPerUnit = Math.abs(trade.price - trade.stopLoss);
        const riskPercent = (riskPerUnit / trade.price) * 100;

        if (riskPercent > profile.maxPositionRisk) {
          warnings.push(`Position risk ${riskPercent.toFixed(2)}% is high`);
        }
      }

      const allowed = violations.length === 0;
      return { allowed, violations, warnings };
    } catch (error) {
      logger.error('Failed to validate trade', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private calculateRiskScore(params: {
    leverage: number;
    exposurePercent: number;
    drawdown: number;
    positionCount: number;
    marginUtilization: number;
  }): number {
    let score = 0;

    // Leverage (0-30 points)
    if (params.leverage > 10) score += 30;
    else if (params.leverage > 5) score += 20;
    else if (params.leverage > 3) score += 10;

    // Exposure (0-25 points)
    if (params.exposurePercent > 100) score += 25;
    else if (params.exposurePercent > 80) score += 15;
    else if (params.exposurePercent > 50) score += 5;

    // Drawdown (0-25 points)
    if (params.drawdown > 20) score += 25;
    else if (params.drawdown > 10) score += 15;
    else if (params.drawdown > 5) score += 5;

    // Concentration (0-20 points)
    if (params.positionCount < 3) score += 20;
    else if (params.positionCount < 5) score += 10;

    return Math.min(100, score);
  }

  private calculateDiversificationScore(positionCount: number): number {
    // 0-100 score based on position count
    if (positionCount === 0) return 0;
    if (positionCount >= 10) return 100;
    return (positionCount / 10) * 100;
  }

  private async createAlert(
    userId: string,
    tenantId: string,
    data: {
      limitId?: string;
      alertType: any;
      severity: any;
      title: string;
      message: string;
      limitType?: any;
      limitValue?: number;
      currentValue?: number;
      violationPercent?: number;
      positionId?: string;
      strategyId?: string;
      assetSymbol?: string;
    }
  ): Promise<RiskAlert> {
    const [alert] = await db
      .insert(riskAlerts)
      .values({
        userId,
        tenantId,
        limitId: data.limitId,
        alertType: data.alertType,
        severity: data.severity,
        title: data.title,
        message: data.message,
        limitType: data.limitType,
        limitValue: data.limitValue?.toString(),
        currentValue: data.currentValue?.toString(),
        violationPercent: data.violationPercent?.toString(),
        positionId: data.positionId,
        strategyId: data.strategyId,
        assetSymbol: data.assetSymbol,
      })
      .returning();

    return this.mapRiskAlert(alert);
  }

  // Mapper methods
  private mapRiskProfile(data: any): RiskProfile {
    return {
      id: data.id,
      userId: data.userId,
      tenantId: data.tenantId,
      riskTolerance: data.riskTolerance,
      maxPortfolioRisk: parseFloat(data.maxPortfolioRisk),
      maxPositionRisk: parseFloat(data.maxPositionRisk),
      maxDrawdown: parseFloat(data.maxDrawdown),
      defaultPositionSize: parseFloat(data.defaultPositionSize),
      maxPositionSize: parseFloat(data.maxPositionSize),
      useKellyCriterion: data.useKellyCriterion,
      kellyFraction: parseFloat(data.kellyFraction),
      maxLeverage: parseFloat(data.maxLeverage),
      maxMarginUtilization: parseFloat(data.maxMarginUtilization),
      maxTotalExposure: parseFloat(data.maxTotalExposure),
      maxLongExposure: parseFloat(data.maxLongExposure),
      maxShortExposure: parseFloat(data.maxShortExposure),
      maxSingleAssetExposure: parseFloat(data.maxSingleAssetExposure),
      maxCorrelatedExposure: parseFloat(data.maxCorrelatedExposure),
      minDiversification: parseFloat(data.minDiversification),
      defaultStopLoss: parseFloat(data.defaultStopLoss),
      useTrailingStop: data.useTrailingStop,
      defaultTrailingStop: parseFloat(data.defaultTrailingStop),
      minRiskRewardRatio: parseFloat(data.minRiskRewardRatio),
      alertOnLimitViolation: data.alertOnLimitViolation,
      alertOnDrawdown: data.alertOnDrawdown,
      alertOnLargePosition: data.alertOnLargePosition,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  private mapRiskLimit(data: any): RiskLimit {
    return {
      id: data.id,
      userId: data.userId,
      tenantId: data.tenantId,
      profileId: data.profileId,
      limitType: data.limitType,
      limitName: data.limitName,
      limitValue: parseFloat(data.limitValue),
      limitUnit: data.limitUnit,
      scope: data.scope,
      scopeId: data.scopeId,
      hardLimit: data.hardLimit,
      alertOnViolation: data.alertOnViolation,
      violationAction: data.violationAction,
      enabled: data.enabled,
      currentValue: data.currentValue ? parseFloat(data.currentValue) : undefined,
      lastViolation: data.lastViolation,
      violationCount: parseFloat(data.violationCount),
      notes: data.notes,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  private mapRiskMetrics(data: any): RiskMetrics {
    return {
      id: data.id,
      userId: data.userId,
      tenantId: data.tenantId,
      portfolioValue: parseFloat(data.portfolioValue),
      cashBalance: parseFloat(data.cashBalance),
      totalExposure: parseFloat(data.totalExposure),
      longExposure: parseFloat(data.longExposure),
      shortExposure: parseFloat(data.shortExposure),
      netExposure: parseFloat(data.netExposure),
      grossExposure: parseFloat(data.grossExposure),
      totalExposurePercent: parseFloat(data.totalExposurePercent),
      longExposurePercent: parseFloat(data.longExposurePercent),
      shortExposurePercent: parseFloat(data.shortExposurePercent),
      currentLeverage: parseFloat(data.currentLeverage),
      marginUsed: parseFloat(data.marginUsed),
      marginAvailable: parseFloat(data.marginAvailable),
      marginUtilization: parseFloat(data.marginUtilization),
      openPositions: parseFloat(data.openPositions),
      largestPosition: parseFloat(data.largestPosition),
      largestPositionPercent: parseFloat(data.largestPositionPercent),
      unrealizedPnl: parseFloat(data.unrealizedPnl),
      realizedPnl: parseFloat(data.realizedPnl),
      totalPnl: parseFloat(data.totalPnl),
      currentDrawdown: parseFloat(data.currentDrawdown),
      maxDrawdown: parseFloat(data.maxDrawdown),
      peakValue: parseFloat(data.peakValue),
      drawdownDuration: parseFloat(data.drawdownDuration),
      valueAtRisk: data.valueAtRisk ? parseFloat(data.valueAtRisk) : undefined,
      expectedShortfall: data.expectedShortfall ? parseFloat(data.expectedShortfall) : undefined,
      sharpeRatio: data.sharpeRatio ? parseFloat(data.sharpeRatio) : undefined,
      sortinoRatio: data.sortinoRatio ? parseFloat(data.sortinoRatio) : undefined,
      calmarRatio: data.calmarRatio ? parseFloat(data.calmarRatio) : undefined,
      volatility: data.volatility ? parseFloat(data.volatility) : undefined,
      beta: data.beta ? parseFloat(data.beta) : undefined,
      concentrationRisk: data.concentrationRisk ? parseFloat(data.concentrationRisk) : undefined,
      correlationAverage: data.correlationAverage ? parseFloat(data.correlationAverage) : undefined,
      overallRiskScore: parseFloat(data.overallRiskScore),
      riskLevel: data.riskLevel,
      calculatedAt: data.calculatedAt,
      snapshotDate: data.snapshotDate,
    };
  }

  private mapRiskAlert(data: any): RiskAlert {
    return {
      id: data.id,
      userId: data.userId,
      tenantId: data.tenantId,
      limitId: data.limitId,
      alertType: data.alertType,
      severity: data.severity,
      title: data.title,
      message: data.message,
      limitType: data.limitType,
      limitValue: data.limitValue ? parseFloat(data.limitValue) : undefined,
      currentValue: data.currentValue ? parseFloat(data.currentValue) : undefined,
      violationPercent: data.violationPercent ? parseFloat(data.violationPercent) : undefined,
      positionId: data.positionId,
      strategyId: data.strategyId,
      assetSymbol: data.assetSymbol,
      acknowledged: data.acknowledged,
      acknowledgedAt: data.acknowledgedAt,
      resolved: data.resolved,
      resolvedAt: data.resolvedAt,
      actionTaken: data.actionTaken,
      actionDetails: data.actionDetails,
      createdAt: data.createdAt,
    };
  }
}

// Export singleton instance
export const riskService = new RiskService();
export default riskService;
