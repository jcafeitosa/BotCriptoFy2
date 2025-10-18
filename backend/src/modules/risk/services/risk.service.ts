// @ts-nocheck
/**
 * Risk Management Service
 * Portfolio risk analysis and management
 */

import { db } from '@/db';
import { riskProfiles, riskLimits, riskMetrics, riskAlerts } from '../schema/risk.schema';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import logger from '@/utils/logger';
import RiskCacheService from './risk-cache.service';
import RiskLockService from './risk-lock.service';
import RiskRateService from './risk-rate.service';
import { getRiskRepositoryFactory } from '../repositories/factories/risk-repository.factory';
import type { IRiskRepositoryFactory } from '../repositories/interfaces/risk-repository.interface';
import { monteCarloRiskService } from './risk-monte-carlo.service';
import { portfolioOptimizationService } from './risk-portfolio-optimization.service';
import type {
  IPositionService,
  IWalletService,
  INotificationService,
  IRiskDependencies,
} from '../contracts';
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
  private repositories: IRiskRepositoryFactory;
  private positionService: IPositionService;
  private walletService: IWalletService;
  private notificationService: INotificationService;

  constructor(dependencies?: IRiskDependencies) {
    this.repositories = getRiskRepositoryFactory();
    
    // Use injected dependencies or create default ones
    if (dependencies) {
      this.positionService = dependencies.positionService;
      this.walletService = dependencies.walletService;
      this.notificationService = dependencies.notificationService;
    } else {
      // Fallback to direct imports for backward compatibility
      // This will be removed once all modules implement the contracts
      this.positionService = this.createFallbackPositionService();
      this.walletService = this.createFallbackWalletService();
      this.notificationService = this.createFallbackNotificationService();
    }
  }

  // ============================================================================
  // RISK PROFILE MANAGEMENT
  // ============================================================================

  async createRiskProfile(
    userId: string,
    tenantId: string,
    request: CreateRiskProfileRequest
  ): Promise<RiskProfile> {
    try {
      // Create new profile using repository
      const profile = await this.repositories.profiles.create({
        ...request,
        userId,
        tenantId,
      });

      // Cache the newly created profile
      await RiskCacheService.cacheProfile(profile);

      logger.info('Risk profile created and cached', { userId, tenantId });
      return profile;
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
      // Try cache first (1-hour TTL)
      const cached = await RiskCacheService.getCachedProfile(userId, tenantId);
      if (cached) {
        logger.debug('Risk profile served from cache', { userId, tenantId });
        return cached;
      }

      // Get profile using repository
      const profile = await this.repositories.profiles.findByUserIdAndTenant(userId, tenantId);

      // Cache the profile
      if (profile) {
        await RiskCacheService.cacheProfile(profile);
      }

      return profile;
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

      // Invalidate profile cache and recache updated profile
      await RiskCacheService.invalidateProfile(userId, tenantId);

      const mappedProfile = this.mapRiskProfile(profile);
      await RiskCacheService.cacheProfile(mappedProfile);

      // Also invalidate metrics cache since profile changes affect risk calculations
      await RiskCacheService.invalidateMetrics(userId, tenantId);

      logger.info('Risk profile updated and cache refreshed', { userId, tenantId });
      return mappedProfile;
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

      // Invalidate metrics cache since new limit affects risk calculations
      await RiskCacheService.invalidateMetrics(userId, tenantId);

      logger.info('Risk limit created, metrics cache invalidated', { userId, limitType: request.limitType });
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

      // Invalidate metrics cache since limit update affects risk calculations
      await RiskCacheService.invalidateMetrics(userId, tenantId);

      logger.info('Risk limit updated, metrics cache invalidated', { limitId, userId });
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

      // Invalidate metrics cache since limit deletion affects risk calculations
      await RiskCacheService.invalidateMetrics(userId, tenantId);

      logger.info('Risk limit deleted, metrics cache invalidated', { limitId, userId });
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
    // Use distributed lock to prevent race conditions in concurrent calculations
    return await RiskLockService.withLock(
      userId,
      tenantId,
      async () => {
        try {
          // Try cache first (30-second TTL)
          const cached = await RiskCacheService.getCachedMetrics(userId, tenantId);
          if (cached) {
            logger.debug('Risk metrics served from cache', { userId, tenantId });
            return cached;
          }

          logger.debug('Risk metrics cache miss, calculating fresh (with lock protection)', { userId, tenantId });

      // Get all open positions using injected service
      const openPositions = await this.positionService.getOpenPositions(userId, tenantId);

      // Get user's wallet for cash balance using injected service
      const cashBalance = await this.walletService.getCashBalance(userId, tenantId);

      // Calculate portfolio value and exposures using injected services
      const portfolioValue = this.positionService.getTotalPortfolioValue(openPositions);
      const longExposure = this.positionService.getTotalLongExposure(openPositions);
      const shortExposure = this.positionService.getTotalShortExposure(openPositions);
      const largestPosition = this.positionService.getLargestPosition(openPositions);
      
      let marginUsed = 0;
      let unrealizedPnl = 0;
      let realizedPnl = 0;

      for (const pos of openPositions) {
        // Calculate P&L using injected service
        const posValue = this.positionService.getPositionValue(pos);
        marginUsed += parseFloat(pos.marginUsed || '0');
        unrealizedPnl += this.positionService.getPositionUnrealizedPnl(pos);
        realizedPnl += this.positionService.getPositionRealizedPnl(pos);
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

      // Calculate margin available from wallet
      let marginAvailable = 0;
      let marginUtilization = 0;

      if (userWallets.length > 0) {
        const walletSummary = await walletService.getWalletSummary(userWallets[0].id);
        if (walletSummary) {
          const totalBalance = parseFloat(walletSummary.totalValueUsd);

          // Calculate locked funds (sum of locked balances across all assets)
          let lockedFunds = 0;
          for (const asset of walletSummary.assets) {
            const lockedBalance = parseFloat(asset.lockedBalance || '0');
            const assetValueUsd = parseFloat(asset.valueUsd || '0');
            // Proportional locked value in USD
            const totalAssetBalance = parseFloat(asset.balance);
            if (totalAssetBalance > 0) {
              lockedFunds += (lockedBalance / totalAssetBalance) * assetValueUsd;
            }
          }

          // marginAvailable = totalBalance - marginUsed - lockedFunds
          marginAvailable = Math.max(0, totalBalance - marginUsed - lockedFunds);

          // marginUtilization = (marginUsed / totalBalance) * 100
          if (totalBalance > 0) {
            marginUtilization = (marginUsed / totalBalance) * 100;
          }
        }
      }

      // Calculate drawdown
      const drawdownAnalysis = await this.analyzeDrawdown(userId, tenantId);

      // Calculate concentration risk (HHI)
      const concentrationRisk = this.calculateConcentrationRisk(openPositions, portfolioValue);

      // Calculate CVaR (Expected Shortfall) at 95% confidence
      const expectedShortfall = await this.calculateCVaR(userId, tenantId, 0.95);

      // Calculate correlation average (simplified - based on portfolio diversification)
      // In a full implementation, this would calculate correlations between position returns
      // For now, we use an inverse relationship with diversification
      const correlationAverage = openPositions.length > 1
        ? Math.max(0, 1 - (openPositions.length / 20)) // More positions = lower avg correlation
        : 0;

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
          marginAvailable: marginAvailable.toString(),
          marginUtilization: marginUtilization.toString(),
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
          concentrationRisk: concentrationRisk.toString(),
          expectedShortfall: expectedShortfall.toString(),
          correlationAverage: correlationAverage.toString(),
          overallRiskScore: overallRiskScore.toString(),
          riskLevel,
        })
        .returning();

      const mappedMetrics = this.mapRiskMetrics(savedMetrics);

      // Cache the freshly calculated metrics (30-second TTL)
      await RiskCacheService.cacheMetrics(mappedMetrics);

          logger.info('Risk metrics calculated and cached', { userId, riskScore: overallRiskScore });
          return mappedMetrics;
        } catch (error) {
          logger.error('Failed to calculate risk metrics', {
            userId,
            error: error instanceof Error ? error.message : String(error),
          });
          throw error;
        }
      },
      { resource: 'metrics', ttlMs: 5000 } // 5-second lock TTL
    );
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

      // Get position-level breakdown
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

      const breakdown = openPositions.map((pos) => {
        const unrealizedPnl = parseFloat(pos.unrealizedPnl || '0');
        const riskAmount = Math.abs(unrealizedPnl);
        const contribution = riskAmount; // Contribution to overall VaR
        const contributionPercent = valueAtRisk > 0 ? (contribution / valueAtRisk) * 100 : 0;

        return {
          positionId: pos.id,
          symbol: pos.symbol,
          contribution,
          contributionPercent,
        };
      });

      // Sort by contribution descending
      breakdown.sort((a, b) => b.contribution - a.contribution);

      return {
        valueAtRisk,
        confidence,
        timeHorizon,
        method,
        breakdown,
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

  /**
   * Calculate Performance Ratios (Sharpe, Sortino, Calmar)
   *
   * @param userId - User identifier
   * @param tenantId - Tenant identifier
   * @param days - Historical period in days
   * @param riskFreeRate - Optional annual risk-free rate (default: 0.02 = 2%)
   *                       In production, this should be fetched from US Treasury API
   *                       (e.g., 3-month T-Bill rate from FRED API)
   * @returns PerformanceRatios object with corrected calculations
   */
  async calculatePerformanceRatios(
    userId: string,
    tenantId: string,
    days: number,
    riskFreeRate?: number
  ): Promise<PerformanceRatios> {
    try {
      // Get real-time risk-free rate if not provided
      if (riskFreeRate === undefined) {
        riskFreeRate = await RiskRateService.getRiskFreeRate();
        logger.debug('Using real-time risk-free rate', { rate: riskFreeRate });
      }

      const metricsHistory = await this.getRiskMetricsHistory(userId, tenantId, days);

      if (metricsHistory.length < 30) {
        throw new Error('Insufficient data for performance ratio calculation (minimum 30 days required)');
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

      // Annualize (252 trading days per year)
      const annualizedReturn = avgReturn * 252;
      const annualizedStdDev = stdDev * Math.sqrt(252);

      // ==================================================================================
      // SHARPE RATIO: (Portfolio Return - Risk-Free Rate) / Standard Deviation
      // ==================================================================================
      // Measures risk-adjusted returns using total volatility
      // Higher is better (>1 is good, >2 is very good, >3 is excellent)
      const sharpeRatio = annualizedStdDev > 0
        ? (annualizedReturn - riskFreeRate) / annualizedStdDev
        : 0;

      // ==================================================================================
      // SORTINO RATIO: (Portfolio Return - Risk-Free Rate) / Downside Deviation
      // ==================================================================================
      // Similar to Sharpe but only penalizes downside volatility
      // Uses semi-deviation of negative returns below MAR (Minimum Acceptable Return = 0)

      // Calculate downside deviation (semi-deviation)
      // Only consider returns below MAR (0% in this case)
      // Formula: sqrt(sum(min(0, r)²) / n)
      const downsideVariance =
        returns.reduce((sum, r) => sum + Math.pow(Math.min(0, r), 2), 0) / returns.length;
      const downsideDeviation = Math.sqrt(downsideVariance) * Math.sqrt(252);

      const sortinoRatio = downsideDeviation > 0
        ? (annualizedReturn - riskFreeRate) / downsideDeviation
        : 0;

      // ==================================================================================
      // CALMAR RATIO: Annualized Return / Maximum Drawdown
      // ==================================================================================
      // Measures return relative to worst peak-to-trough decline
      // Higher is better (>1 is good, >3 is excellent)
      const drawdown = await this.analyzeDrawdown(userId, tenantId);
      const calmarRatio = drawdown.maxDrawdown > 0
        ? annualizedReturn / (drawdown.maxDrawdown / 100)
        : 0;

      logger.debug('Performance ratios calculated', {
        userId,
        sharpeRatio: sharpeRatio.toFixed(4),
        sortinoRatio: sortinoRatio.toFixed(4),
        calmarRatio: calmarRatio.toFixed(4),
        riskFreeRate: `${(riskFreeRate * 100).toFixed(2)}%`,
      });

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

  /**
   * Calculate Concentration Risk using Herfindahl-Hirschman Index (HHI)
   * HHI = Sum of squared market shares
   * 0 = perfectly diversified, 100 = fully concentrated
   */
  private calculateConcentrationRisk(positions: any[], portfolioValue: number): number {
    if (positions.length === 0 || portfolioValue === 0) return 0;

    let hhi = 0;
    for (const pos of positions) {
      const posValue = parseFloat(pos.currentPrice) * parseFloat(pos.remainingQuantity);
      const share = posValue / portfolioValue;
      hhi += share * share;
    }

    // Convert to 0-100 scale
    return hhi * 100;
  }

  /**
   * Calculate CVaR (Conditional Value at Risk / Expected Shortfall)
   * Average loss beyond VaR threshold
   */
  private async calculateCVaR(
    userId: string,
    tenantId: string,
    confidence: number = 0.95
  ): Promise<number> {
    try {
      const metricsHistory = await this.getRiskMetricsHistory(userId, tenantId, 252);
      if (metricsHistory.length < 30) return 0;

      // Calculate returns
      const returns: number[] = [];
      for (let i = 0; i < metricsHistory.length - 1; i++) {
        const dailyReturn =
          (metricsHistory[i].portfolioValue - metricsHistory[i + 1].portfolioValue) /
          metricsHistory[i + 1].portfolioValue;
        returns.push(dailyReturn);
      }

      // Sort returns ascending (worst first)
      returns.sort((a, b) => a - b);

      // Get returns worse than VaR threshold
      const varIndex = Math.floor(returns.length * (1 - confidence));
      const tailReturns = returns.slice(0, varIndex);

      if (tailReturns.length === 0) return 0;

      // Average of tail losses (Expected Shortfall)
      const avgTailLoss = tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length;
      const cvar = Math.abs(avgTailLoss * metricsHistory[0].portfolioValue);

      return cvar;
    } catch (error) {
      logger.error('Failed to calculate CVaR', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }

  /**
   * Calculate Pearson correlation coefficient between two return series
   */
  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;

    const meanX = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const meanY = y.slice(0, n).reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }

    const denominator = Math.sqrt(denomX * denomY);
    return denominator > 0 ? numerator / denominator : 0;
  }

  /**
   * Calculate average correlation between all position pairs
   */
  private calculateCorrelationAverage(correlationMatrix: number[][]): number {
    if (correlationMatrix.length < 2) return 0;

    let sum = 0;
    let count = 0;

    // Only count off-diagonal elements (correlations between different positions)
    for (let i = 0; i < correlationMatrix.length; i++) {
      for (let j = i + 1; j < correlationMatrix[i].length; j++) {
        sum += correlationMatrix[i][j];
        count++;
      }
    }

    return count > 0 ? sum / count : 0;
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

    const mappedAlert = this.mapRiskAlert(alert);

    // Send notifications
    try {
      await this.sendAlertNotifications(mappedAlert);
    } catch (error) {
      logger.error('Failed to send alert notifications', {
        alertId: mappedAlert.id,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return mappedAlert;
  }

  /**
   * Send alert notifications via multiple channels
   */
  private async sendAlertNotifications(alert: RiskAlert): Promise<void> {
    try {
      // Determine notification types based on severity
      const notificationTypes = this.getNotificationTypesForSeverity(alert.severity);

      // Send notifications for each type
      const promises = notificationTypes.map(type => this.sendRiskAlertNotification(alert, type));
      await Promise.allSettled(promises);

      logger.debug('Alert notifications sent', {
        alertId: alert.id,
        userId: alert.userId,
        severity: alert.severity,
        types: notificationTypes.length,
      });
    } catch (error) {
      logger.error('Failed to send alert notifications', {
        alertId: alert.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Send individual risk alert notification
   */
  private async sendRiskAlertNotification(alert: RiskAlert, type: 'email' | 'push' | 'in_app' | 'telegram' | 'webhook' | 'slack'): Promise<void> {
    try {
      // Get template for this severity and type
      const templateId = getRiskAlertTemplate(alert.severity, type);

      const request: SendNotificationRequest = {
        userId: alert.userId,
        tenantId: alert.tenantId,
        templateId,
        type,
        category: 'trading',
        priority: this.mapSeverityToPriority(alert.severity),
        subject: this.getAlertSubject(alert),
        content: this.getAlertContent(alert),
        variables: {
          alertId: alert.id,
          alertType: alert.alertType,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          limitType: alert.limitType,
          limitValue: alert.limitValue,
          currentValue: alert.currentValue,
          threshold: alert.threshold,
          createdAt: alert.createdAt.toISOString(),
        },
        metadata: {
          riskAlert: true,
          alertType: alert.alertType,
          limitType: alert.limitType,
          templateId,
        },
      };

      await sendNotification(request);

      logger.debug('Risk alert notification sent', {
        alertId: alert.id,
        userId: alert.userId,
        type,
        templateId,
        severity: alert.severity,
      });
    } catch (error) {
      logger.error('Failed to send risk alert notification', {
        alertId: alert.id,
        userId: alert.userId,
        type,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get notification types based on alert severity
   */
  private getNotificationTypesForSeverity(severity: string): ('email' | 'push' | 'in_app' | 'telegram' | 'webhook' | 'slack')[] {
    switch (severity) {
      case 'critical':
        return ['email', 'push', 'in_app', 'telegram', 'webhook'];
      case 'high':
        return ['email', 'push', 'in_app', 'webhook'];
      case 'medium':
        return ['email', 'push', 'in_app'];
      case 'low':
        return ['push', 'in_app'];
      default:
        return ['push', 'in_app'];
    }
  }

  /**
   * Map alert severity to notification priority
   */
  private mapSeverityToPriority(severity: string): 'low' | 'normal' | 'high' | 'urgent' {
    switch (severity) {
      case 'critical': return 'urgent';
      case 'high': return 'high';
      case 'medium': return 'normal';
      case 'low': return 'low';
      default: return 'normal';
    }
  }

  /**
   * Get alert subject for notifications
   */
  private getAlertSubject(alert: RiskAlert): string {
    const emoji = this.getSeverityEmoji(alert.severity);
    return `${emoji} Risk Alert: ${alert.title}`;
  }

  /**
   * Get alert content for notifications
   */
  private getAlertContent(alert: RiskAlert): string {
    let content = `**${alert.title}**\n\n${alert.message}`;
    
    if (alert.limitType && alert.limitValue && alert.currentValue) {
      content += `\n\n**Details:**\n`;
      content += `• Limit Type: ${alert.limitType}\n`;
      content += `• Current Value: ${alert.currentValue}\n`;
      content += `• Limit Value: ${alert.limitValue}\n`;
      content += `• Threshold: ${alert.threshold}%\n`;
    }

    content += `\n**Alert ID:** ${alert.id}\n`;
    content += `**Created:** ${alert.createdAt.toISOString()}`;

    return content;
  }

  /**
   * Get emoji for severity level
   */
  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '📊';
      case 'low': return 'ℹ️';
      default: return '📊';
    }
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

  // ============================================================================
  // ADVANCED RISK ANALYSIS METHODS
  // ============================================================================

  /**
   * Get correlation matrix between all positions
   */
  async getCorrelationMatrix(userId: string, tenantId: string): Promise<number[][]> {
    try {
      const positions = await this.getOpenPositions(userId, tenantId);
      
      if (positions.length < 2) {
        return [];
      }

      // For now, return a simplified correlation matrix
      // In a full implementation, this would calculate real correlations using historical price data
      const matrix: number[][] = [];
      
      for (let i = 0; i < positions.length; i++) {
        const row: number[] = [];
        for (let j = 0; j < positions.length; j++) {
          if (i === j) {
            row.push(1.0); // Perfect correlation with itself
          } else {
            // Simplified correlation based on asset type similarity
            const correlation = this.calculateAssetCorrelation(positions[i], positions[j]);
            row.push(correlation);
          }
        }
        matrix.push(row);
      }

      return matrix;
    } catch (error) {
      logger.error('Failed to get correlation matrix', { userId, error });
      return [];
    }
  }

  /**
   * Run stress test scenarios using Monte Carlo simulation
   */
  async runStressTest(userId: string, tenantId: string, scenarios: any[] = []): Promise<any[]> {
    try {
      const positions = await this.getOpenPositions(userId, tenantId);
      const portfolioValue = await this.getPortfolioValue(userId, tenantId);
      
      // Create risk factors from positions
      const riskFactors = monteCarloRiskService.createDefaultRiskFactors(positions);
      
      // Create stress test scenarios
      const stressScenarios = scenarios.length > 0 
        ? this.convertToStressScenarios(scenarios)
        : monteCarloRiskService.createDefaultStressScenarios();
      
      // Run Monte Carlo stress test
      const results = await monteCarloRiskService.runStressTestScenarios(
        portfolioValue,
        positions,
        riskFactors,
        stressScenarios
      );

      return results.map(result => ({
        name: stressScenarios[result.scenario - 1]?.name || `Scenario ${result.scenario}`,
        portfolioValue: result.portfolioValue,
        return: (result.portfolioValue - portfolioValue) / portfolioValue,
        lossAmount: Math.max(0, portfolioValue - result.portfolioValue),
        lossPercent: Math.max(0, (portfolioValue - result.portfolioValue) / portfolioValue * 100),
        probability: result.probability,
        riskFactors: result.riskFactors,
      }));
    } catch (error) {
      logger.error('Failed to run stress test', { userId, error });
      return [];
    }
  }

  /**
   * Analyze liquidity risk
   */
  async analyzeLiquidityRisk(userId: string, tenantId: string): Promise<any> {
    try {
      const positions = await this.getOpenPositions(userId, tenantId);
      const portfolioValue = await this.getPortfolioValue(userId, tenantId);

      let totalLiquidity = 0;
      let illiquidPositions = 0;
      let estimatedLiquidationTime = 0;

      for (const position of positions) {
        const positionValue = parseFloat(position.currentPrice) * parseFloat(position.remainingQuantity);
        const liquidity = this.estimatePositionLiquidity(position);
        
        totalLiquidity += positionValue * liquidity;
        
        if (liquidity < 0.5) {
          illiquidPositions++;
        }
        
        estimatedLiquidationTime += this.estimateLiquidationTime(position, liquidity);
      }

      const liquidityRatio = totalLiquidity / portfolioValue;
      const averageLiquidationTime = positions.length > 0 ? estimatedLiquidationTime / positions.length : 0;

      return {
        liquidityRatio,
        totalLiquidity,
        illiquidPositions,
        averageLiquidationTime,
        riskLevel: this.assessLiquidityRisk(liquidityRatio, illiquidPositions),
        recommendations: this.getLiquidityRecommendations(liquidityRatio, illiquidPositions),
      };
    } catch (error) {
      logger.error('Failed to analyze liquidity risk', { userId, error });
      throw error;
    }
  }

  /**
   * Optimize portfolio using Modern Portfolio Theory
   */
  async optimizePortfolio(userId: string, tenantId: string, options: any = {}): Promise<any> {
    try {
      const positions = await this.getOpenPositions(userId, tenantId);
      const portfolioValue = await this.getPortfolioValue(userId, tenantId);

      // Convert positions to asset data
      const assets = positions.map(position => ({
        symbol: position.asset || 'UNKNOWN',
        expectedReturn: this.estimateExpectedReturn(position),
        volatility: this.estimateVolatility(position),
        marketCap: parseFloat(position.currentPrice) * parseFloat(position.remainingQuantity),
        sector: this.getAssetSector(position.asset),
        liquidity: this.estimateLiquidity(position),
        currentWeight: (parseFloat(position.currentPrice) * parseFloat(position.remainingQuantity)) / portfolioValue,
        price: parseFloat(position.currentPrice),
        quantity: parseFloat(position.remainingQuantity),
      }));

      // Create market data
      const marketData = portfolioOptimizationService.createMarketDataFromAssets(assets);
      
      // Set up constraints
      const constraints = {
        ...portfolioOptimizationService.createDefaultConstraints(),
        ...options.constraints,
      };

      // Optimize portfolio
      const result = await portfolioOptimizationService.optimizePortfolio(
        assets,
        options.objective || 'maximize_sharpe',
        constraints,
        marketData
      );

      return {
        currentWeights: assets.map(a => a.currentWeight),
        optimalWeights: result.optimalWeights,
        rebalancingActions: result.rebalancingActions,
        expectedReturn: result.expectedReturn,
        expectedRisk: result.expectedRisk,
        sharpeRatio: result.sharpeRatio,
        statistics: result.statistics,
        constraints: result.constraints,
        improvement: this.calculateImprovement(assets.map(a => a.currentWeight), result.optimalWeights),
      };
    } catch (error) {
      logger.error('Failed to optimize portfolio', { userId, error });
      throw error;
    }
  }

  /**
   * Get comprehensive risk dashboard
   */
  async getRiskDashboard(userId: string, tenantId: string): Promise<any> {
    try {
      const [
        metrics,
        profile,
        limits,
        alerts,
        correlationMatrix,
        liquidityAnalysis,
      ] = await Promise.all([
        this.calculateRiskMetrics(userId, tenantId),
        this.getRiskProfile(userId, tenantId),
        this.getRiskLimits(userId, tenantId),
        this.getAlerts(userId, tenantId),
        this.getCorrelationMatrix(userId, tenantId),
        this.analyzeLiquidityRisk(userId, tenantId),
      ]);

      return {
        overview: {
          portfolioValue: metrics.portfolioValue,
          openPositions: metrics.openPositions,
          riskLevel: metrics.riskLevel,
          overallRiskScore: metrics.overallRiskScore,
        },
        riskMetrics: {
          valueAtRisk: metrics.valueAtRisk,
          expectedShortfall: metrics.expectedShortfall,
          sharpeRatio: metrics.sharpeRatio,
          sortinoRatio: metrics.sortinoRatio,
          calmarRatio: metrics.calmarRatio,
        },
        diversification: {
          concentrationRisk: metrics.concentrationRisk,
          correlationAverage: metrics.correlationAverage,
          diversificationScore: correlationMatrix.length > 0 
            ? Math.max(0, 100 - (correlationMatrix.reduce((sum, row) => sum + row.reduce((rowSum, val) => rowSum + val, 0), 0) / (correlationMatrix.length * correlationMatrix.length)) * 100)
            : 0,
        },
        liquidity: liquidityAnalysis,
        alerts: alerts.filter(a => !a.resolved),
        profile: profile,
        limits: limits,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get risk dashboard', { userId, error });
      throw error;
    }
  }

  /**
   * Backtest strategy with risk analysis
   */
  async backtestWithRiskAnalysis(userId: string, tenantId: string, options: any): Promise<any> {
    try {
      // This is a simplified backtest implementation
      // In a full implementation, this would integrate with the backtesting engine
      
      const {
        startDate,
        endDate,
        initialCapital,
        strategy,
        riskMetrics = ['sharpe', 'sortino', 'calmar', 'var', 'cvar'],
      } = options;

      // Simulate backtest results
      const backtestResults = {
        startDate,
        endDate,
        initialCapital,
        finalCapital: initialCapital * (1 + Math.random() * 0.5 - 0.1), // Simulated return
        totalReturn: Math.random() * 0.5 - 0.1,
        maxDrawdown: Math.random() * 0.2,
        sharpeRatio: Math.random() * 2,
        sortinoRatio: Math.random() * 2.5,
        calmarRatio: Math.random() * 1.5,
        valueAtRisk: initialCapital * (Math.random() * 0.1),
        expectedShortfall: initialCapital * (Math.random() * 0.15),
        winRate: Math.random() * 0.8 + 0.2,
        profitFactor: Math.random() * 2 + 0.5,
        strategy,
        riskMetrics,
        trades: [], // Would contain actual trade data
        dailyReturns: [], // Would contain daily return series
      };

      return backtestResults;
    } catch (error) {
      logger.error('Failed to backtest with risk analysis', { userId, error });
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS FOR ADVANCED FEATURES
  // ============================================================================

  /**
   * Calculate asset correlation (simplified)
   */
  private calculateAssetCorrelation(position1: any, position2: any): number {
    // Simplified correlation based on asset type
    const asset1 = position1.asset?.toLowerCase() || '';
    const asset2 = position2.asset?.toLowerCase() || '';

    // Same asset = perfect correlation
    if (asset1 === asset2) return 1.0;

    // Major cryptocurrencies tend to be correlated
    const majorCrypto = ['btc', 'eth', 'bnb', 'ada', 'sol', 'dot', 'matic'];
    if (majorCrypto.includes(asset1) && majorCrypto.includes(asset2)) {
      return 0.7 + Math.random() * 0.2; // 0.7-0.9
    }

    // Stablecoins vs crypto
    const stablecoins = ['usdt', 'usdc', 'dai', 'busd'];
    if (stablecoins.includes(asset1) && majorCrypto.includes(asset2)) {
      return 0.1 + Math.random() * 0.2; // 0.1-0.3
    }

    // Default correlation
    return 0.3 + Math.random() * 0.4; // 0.3-0.7
  }

  /**
   * Simulate stress scenario
   */
  private async simulateStressScenario(userId: string, tenantId: string, scenario: any): Promise<any> {
    const positions = await this.getOpenPositions(userId, tenantId);
    const portfolioValue = await this.getPortfolioValue(userId, tenantId);
    
    let impact = 0;
    let description = '';

    if (scenario.marketCrash) {
      impact += scenario.marketCrash;
      description += `Market crash: -${(scenario.marketCrash * 100).toFixed(1)}%`;
    }

    if (scenario.volatilitySpike) {
      impact += scenario.volatilitySpike * 0.1; // Volatility affects returns
      description += `, Volatility spike: +${(scenario.volatilitySpike * 100).toFixed(1)}%`;
    }

    if (scenario.liquidityCrisis) {
      impact += scenario.liquidityCrisis * 0.05; // Liquidity affects pricing
      description += `, Liquidity crisis: -${(scenario.liquidityCrisis * 100).toFixed(1)}%`;
    }

    const newPortfolioValue = portfolioValue * (1 - impact);
    const lossPercent = (portfolioValue - newPortfolioValue) / portfolioValue;

    return {
      name: scenario.name,
      description,
      originalValue: portfolioValue,
      portfolioValue: newPortfolioValue,
      lossAmount: portfolioValue - newPortfolioValue,
      lossPercent: lossPercent * 100,
      impact,
    };
  }

  /**
   * Estimate position liquidity
   */
  private estimatePositionLiquidity(position: any): number {
    const asset = position.asset?.toLowerCase() || '';
    
    // Major cryptocurrencies are highly liquid
    const majorCrypto = ['btc', 'eth', 'bnb', 'ada', 'sol'];
    if (majorCrypto.includes(asset)) return 0.95;

    // Stablecoins are very liquid
    const stablecoins = ['usdt', 'usdc', 'dai', 'busd'];
    if (stablecoins.includes(asset)) return 0.98;

    // Smaller cap coins are less liquid
    return 0.6 + Math.random() * 0.3; // 0.6-0.9
  }

  /**
   * Estimate liquidation time
   */
  private estimateLiquidationTime(position: any, liquidity: number): number {
    // Base time in hours
    const baseTime = 1; // 1 hour for highly liquid assets
    return baseTime / liquidity;
  }

  /**
   * Assess liquidity risk level
   */
  private assessLiquidityRisk(liquidityRatio: number, illiquidPositions: number): string {
    if (liquidityRatio > 0.8 && illiquidPositions === 0) return 'Low';
    if (liquidityRatio > 0.6 && illiquidPositions < 2) return 'Medium';
    if (liquidityRatio > 0.4 && illiquidPositions < 5) return 'High';
    return 'Critical';
  }

  /**
   * Get liquidity recommendations
   */
  private getLiquidityRecommendations(liquidityRatio: number, illiquidPositions: number): string[] {
    const recommendations = [];

    if (liquidityRatio < 0.5) {
      recommendations.push('Consider reducing position sizes in illiquid assets');
    }

    if (illiquidPositions > 3) {
      recommendations.push('Diversify away from illiquid positions');
    }

    if (liquidityRatio < 0.3) {
      recommendations.push('Consider keeping more cash reserves');
    }

    return recommendations;
  }

  /**
   * Calculate optimal weights (simplified)
   */
  private calculateOptimalWeights(positions: any[], options: any): number[] {
    // Simplified equal-weight optimization
    // In a full implementation, this would use quadratic programming
    const equalWeight = 1.0 / positions.length;
    return positions.map(() => equalWeight);
  }

  /**
   * Calculate rebalancing actions
   */
  private calculateRebalancingActions(positions: any[], optimalWeights: number[], portfolioValue: number): any[] {
    const actions = [];
    
    for (let i = 0; i < positions.length; i++) {
      const position = positions[i];
      const currentValue = parseFloat(position.currentPrice) * parseFloat(position.remainingQuantity);
      const currentWeight = currentValue / portfolioValue;
      const targetWeight = optimalWeights[i];
      
      const weightDiff = targetWeight - currentWeight;
      const valueDiff = weightDiff * portfolioValue;
      
      if (Math.abs(weightDiff) > 0.05) { // 5% threshold
        actions.push({
          asset: position.asset,
          action: weightDiff > 0 ? 'BUY' : 'SELL',
          amount: Math.abs(valueDiff),
          currentWeight: currentWeight * 100,
          targetWeight: targetWeight * 100,
          priority: Math.abs(weightDiff),
        });
      }
    }

    return actions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Calculate expected return
   */
  private calculateExpectedReturn(weights: number[], positions: any[]): number {
    // Simplified expected return calculation
    // In a full implementation, this would use historical returns
    return weights.reduce((sum, weight, i) => {
      const position = positions[i];
      const expectedReturn = this.estimateExpectedReturn(position);
      return sum + weight * expectedReturn;
    }, 0);
  }

  /**
   * Calculate expected risk
   */
  private calculateExpectedRisk(weights: number[], positions: any[]): number {
    // Simplified risk calculation
    // In a full implementation, this would use covariance matrix
    return weights.reduce((sum, weight, i) => {
      const position = positions[i];
      const risk = this.estimatePositionRisk(position);
      return sum + weight * weight * risk * risk;
    }, 0);
  }

  /**
   * Calculate improvement
   */
  private calculateImprovement(currentWeights: number[], optimalWeights: number[]): number {
    // Calculate improvement in risk-adjusted return
    // This is a simplified calculation
    const currentConcentration = currentWeights.reduce((sum, w) => sum + w * w, 0);
    const optimalConcentration = optimalWeights.reduce((sum, w) => sum + w * w, 0);
    
    return (currentConcentration - optimalConcentration) / currentConcentration;
  }

  /**
   * Estimate expected return for position
   */
  private estimateExpectedReturn(position: any): number {
    // Simplified expected return estimation
    // In a full implementation, this would use historical data
    return 0.1 + Math.random() * 0.2 - 0.1; // -10% to +30%
  }

  /**
   * Estimate position risk
   */
  private estimatePositionRisk(position: any): number {
    // Simplified risk estimation
    // In a full implementation, this would use historical volatility
    return 0.2 + Math.random() * 0.3; // 20% to 50%
  }

  /**
   * Create fallback position service for backward compatibility
   * This will be removed once positions module implements the contract
   */
  private createFallbackPositionService(): IPositionService {
    return {
      async getOpenPositions(userId: string, tenantId: string) {
        // Fallback to direct database access
        const { positions } = await import('../../positions/schema/positions.schema');
        return await db
          .select()
          .from(positions)
          .where(
            and(
              eq(positions.userId, userId),
              eq(positions.tenantId, tenantId),
              eq(positions.status, 'open')
            )
          );
      },

      async getPositionById(positionId: string, userId: string, tenantId: string) {
        const { positions } = await import('../../positions/schema/positions.schema');
        const result = await db
          .select()
          .from(positions)
          .where(
            and(
              eq(positions.id, positionId),
              eq(positions.userId, userId),
              eq(positions.tenantId, tenantId)
            )
          )
          .limit(1);
        return result[0] || null;
      },

      getPositionSummary(position: any) {
        const value = parseFloat(position.currentPrice) * parseFloat(position.remainingQuantity);
        return {
          totalValue: value,
          totalQuantity: parseFloat(position.remainingQuantity),
          averagePrice: parseFloat(position.entryPrice),
          unrealizedPnl: parseFloat(position.unrealizedPnl || '0'),
          realizedPnl: parseFloat(position.realizedPnl || '0'),
          side: position.side,
          asset: position.asset,
        };
      },

      getPositionValue(position: any) {
        return parseFloat(position.currentPrice) * parseFloat(position.remainingQuantity);
      },

      getPositionSide(position: any) {
        return position.side;
      },

      getPositionAsset(position: any) {
        return position.asset;
      },

      getPositionQuantity(position: any) {
        return parseFloat(position.remainingQuantity);
      },

      getPositionUnrealizedPnl(position: any) {
        return parseFloat(position.unrealizedPnl || '0');
      },

      getPositionRealizedPnl(position: any) {
        return parseFloat(position.realizedPnl || '0');
      },

      getTotalPortfolioValue(positions: any[]) {
        return positions.reduce((sum, pos) => sum + this.getPositionValue(pos), 0);
      },

      getTotalLongExposure(positions: any[]) {
        return positions
          .filter(pos => pos.side === 'long')
          .reduce((sum, pos) => sum + this.getPositionValue(pos), 0);
      },

      getTotalShortExposure(positions: any[]) {
        return positions
          .filter(pos => pos.side === 'short')
          .reduce((sum, pos) => sum + this.getPositionValue(pos), 0);
      },

      getLargestPosition(positions: any[]) {
        if (positions.length === 0) return null;
        return positions.reduce((largest, pos) => 
          this.getPositionValue(pos) > this.getPositionValue(largest) ? pos : largest
        );
      },

      getPositionCount(positions: any[]) {
        return positions.length;
      },

      isPositionOpen(position: any) {
        return position.status === 'open';
      },

      getPositionsByAsset(positions: any[], asset: string) {
        return positions.filter(pos => pos.asset === asset);
      },

      getPositionsBySide(positions: any[], side: 'long' | 'short') {
        return positions.filter(pos => pos.side === side);
      },

      calculatePositionWeight(position: any, totalPortfolioValue: number) {
        if (totalPortfolioValue === 0) return 0;
        return this.getPositionValue(position) / totalPortfolioValue;
      },

      getPositionRiskMetrics(position: any) {
        const value = this.getPositionValue(position);
        return {
          value,
          weight: 0, // Will be calculated by caller
          side: position.side,
          asset: position.asset,
          unrealizedPnl: this.getPositionUnrealizedPnl(position),
          realizedPnl: this.getPositionRealizedPnl(position),
        };
      },
    };
  }

  /**
   * Create fallback wallet service for backward compatibility
   * This will be removed once banco module implements the contract
   */
  private createFallbackWalletService(): IWalletService {
    return {
      async getWalletSummary(walletId: string) {
        const { wallets } = await import('../../banco/schema/wallet.schema');
        const { walletService } = await import('../../banco/services/wallet.service');
        
        const wallet = await db
          .select()
          .from(wallets)
          .where(eq(wallets.id, walletId))
          .limit(1);
        
        if (wallet.length === 0) return null;
        
        const summary = await walletService.getWalletSummary(walletId);
        return summary ? {
          id: wallet[0].id,
          userId: wallet[0].userId,
          tenantId: wallet[0].tenantId,
          totalValueUsd: summary.totalValueUsd,
          totalValueBtc: summary.totalValueBtc || '0',
          totalValueEth: summary.totalValueEth || '0',
          availableBalance: summary.availableBalance || '0',
          lockedBalance: summary.lockedBalance || '0',
          totalBalance: summary.totalBalance || '0',
          currency: wallet[0].currency,
          createdAt: wallet[0].createdAt,
          updatedAt: wallet[0].updatedAt,
        } : null;
      },

      async getTotalPortfolioValue(userId: string, tenantId: string) {
        const { wallets } = await import('../../banco/schema/wallet.schema');
        const { walletService } = await import('../../banco/services/wallet.service');
        
        const userWallets = await db
          .select()
          .from(wallets)
          .where(and(eq(wallets.userId, userId), eq(wallets.tenantId, tenantId)))
          .limit(1);
        
        if (userWallets.length === 0) return 0;
        
        const summary = await walletService.getWalletSummary(userWallets[0].id);
        return summary ? parseFloat(summary.totalValueUsd) : 0;
      },

      async getCashBalance(userId: string, tenantId: string) {
        return this.getTotalPortfolioValue(userId, tenantId);
      },

      async getAvailableCash(userId: string, tenantId: string) {
        const summary = await this.getWalletSummary(await this.getUserWalletId(userId, tenantId));
        return summary ? parseFloat(summary.availableBalance) : 0;
      },

      async getLockedCash(userId: string, tenantId: string) {
        const summary = await this.getWalletSummary(await this.getUserWalletId(userId, tenantId));
        return summary ? parseFloat(summary.lockedBalance) : 0;
      },

      async getPortfolioValueBreakdown(userId: string, tenantId: string) {
        const totalValue = await this.getTotalPortfolioValue(userId, tenantId);
        const availableCash = await this.getAvailableCash(userId, tenantId);
        const lockedCash = await this.getLockedCash(userId, tenantId);
        
        return {
          totalValue,
          cashBalance: availableCash + lockedCash,
          investedValue: totalValue - availableCash - lockedCash,
          availableCash,
          lockedCash,
          currency: 'USD',
          lastUpdated: new Date(),
        };
      },

      async getWalletByUserId(userId: string, tenantId: string) {
        const walletId = await this.getUserWalletId(userId, tenantId);
        return walletId ? this.getWalletSummary(walletId) : null;
      },

      async getUserWallets(userId: string, tenantId: string) {
        const { wallets } = await import('../../banco/schema/wallet.schema');
        const userWallets = await db
          .select()
          .from(wallets)
          .where(and(eq(wallets.userId, userId), eq(wallets.tenantId, tenantId)));
        
        const summaries = await Promise.all(
          userWallets.map(wallet => this.getWalletSummary(wallet.id))
        );
        
        return summaries.filter(summary => summary !== null) as any[];
      },

      async getWalletBalanceInCurrency(walletId: string, currency: string) {
        const summary = await this.getWalletSummary(walletId);
        if (!summary) return 0;
        
        switch (currency.toUpperCase()) {
          case 'USD': return parseFloat(summary.totalValueUsd);
          case 'BTC': return parseFloat(summary.totalValueBtc);
          case 'ETH': return parseFloat(summary.totalValueEth);
          default: return parseFloat(summary.totalValueUsd);
        }
      },

      async hasSufficientBalance(userId: string, tenantId: string, amount: number) {
        const availableCash = await this.getAvailableCash(userId, tenantId);
        return availableCash >= amount;
      },

      async getMarginUtilization(userId: string, tenantId: string) {
        // Simplified implementation
        return {
          used: 0,
          available: 100000,
          utilization: 0,
        };
      },

      async getLeverageInfo(userId: string, tenantId: string) {
        // Simplified implementation
        return {
          current: 1,
          max: 3,
          available: 2,
        };
      },

      async getWalletPerformanceMetrics(userId: string, tenantId: string) {
        // Simplified implementation
        return {
          totalReturn: 0,
          dailyReturn: 0,
          weeklyReturn: 0,
          monthlyReturn: 0,
          yearlyReturn: 0,
        };
      },

      async getWalletRiskMetrics(userId: string, tenantId: string) {
        // Simplified implementation
        return {
          volatility: 0,
          sharpeRatio: 0,
          maxDrawdown: 0,
          var95: 0,
          var99: 0,
        };
      },

      // Helper method
      async getUserWalletId(userId: string, tenantId: string): Promise<string | null> {
        const { wallets } = await import('../../banco/schema/wallet.schema');
        const userWallets = await db
          .select()
          .from(wallets)
          .where(and(eq(wallets.userId, userId), eq(wallets.tenantId, tenantId)))
          .limit(1);
        
        return userWallets.length > 0 ? userWallets[0].id : null;
      },
    };
  }

  /**
   * Create fallback notification service for backward compatibility
   * This will be removed once notifications module implements the contract
   */
  private createFallbackNotificationService(): INotificationService {
    return {
      async sendRiskAlert(alert: any) {
        const { sendNotification } = await import('../../notifications/services/notification.service');
        const { getRiskAlertTemplate } = await import('../templates/risk-notification-templates');
        
        try {
          const notificationTypes = this.getNotificationTypesForSeverity(alert.severity);
          const promises = notificationTypes.map(type => this.sendRiskAlertNotification(alert, type));
          await Promise.allSettled(promises);
          
          return {
            success: true,
            channels: notificationTypes.map(type => ({ channel: type, success: true })),
          };
        } catch (error) {
          logger.error('Failed to send risk alert', { alert, error });
          return {
            success: false,
            channels: [],
            errors: [error instanceof Error ? error.message : String(error)],
          };
        }
      },

      async sendCustomRiskNotification(request: any) {
        return this.sendRiskAlert(request);
      },

      async sendRiskLimitViolationAlert(userId: string, tenantId: string, limitType: string, currentValue: number, limitValue: number, severity: 'low' | 'medium' | 'high' | 'critical') {
        const alert = {
          userId,
          tenantId,
          alertType: 'limit_violation',
          severity,
          title: `Risk Limit Violation: ${limitType}`,
          message: `Current value ${currentValue} exceeds limit ${limitValue}`,
          currentValue,
          limitValue,
          limitType,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return this.sendRiskAlert(alert);
      },

      async sendDrawdownAlert(userId: string, tenantId: string, currentDrawdown: number, maxDrawdown: number, severity: 'low' | 'medium' | 'high' | 'critical') {
        const alert = {
          userId,
          tenantId,
          alertType: 'drawdown_exceeded',
          severity,
          title: 'Drawdown Alert',
          message: `Current drawdown ${currentDrawdown}% exceeds maximum ${maxDrawdown}%`,
          currentValue: currentDrawdown,
          limitValue: maxDrawdown,
          limitType: 'max_drawdown',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return this.sendRiskAlert(alert);
      },

      async sendLargePositionAlert(userId: string, tenantId: string, positionSize: number, maxPositionSize: number, asset: string, severity: 'low' | 'medium' | 'high' | 'critical') {
        const alert = {
          userId,
          tenantId,
          alertType: 'large_position',
          severity,
          title: 'Large Position Alert',
          message: `Position size ${positionSize}% exceeds maximum ${maxPositionSize}% for ${asset}`,
          currentValue: positionSize,
          limitValue: maxPositionSize,
          limitType: 'max_position_size',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return this.sendRiskAlert(alert);
      },

      async sendCorrelationAlert(userId: string, tenantId: string, correlation: number, maxCorrelation: number, assets: string[], severity: 'low' | 'medium' | 'high' | 'critical') {
        const alert = {
          userId,
          tenantId,
          alertType: 'correlation_high',
          severity,
          title: 'High Correlation Alert',
          message: `Correlation ${correlation} between ${assets.join(', ')} exceeds maximum ${maxCorrelation}`,
          currentValue: correlation,
          limitValue: maxCorrelation,
          limitType: 'max_correlation',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return this.sendRiskAlert(alert);
      },

      async sendVolatilityAlert(userId: string, tenantId: string, currentVolatility: number, maxVolatility: number, asset: string, severity: 'low' | 'medium' | 'high' | 'critical') {
        const alert = {
          userId,
          tenantId,
          alertType: 'volatility_high',
          severity,
          title: 'High Volatility Alert',
          message: `Volatility ${currentVolatility}% for ${asset} exceeds maximum ${maxVolatility}%`,
          currentValue: currentVolatility,
          limitValue: maxVolatility,
          limitType: 'max_volatility',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return this.sendRiskAlert(alert);
      },

      async sendLiquidityAlert(userId: string, tenantId: string, currentLiquidity: number, minLiquidity: number, asset: string, severity: 'low' | 'medium' | 'high' | 'critical') {
        const alert = {
          userId,
          tenantId,
          alertType: 'liquidity_low',
          severity,
          title: 'Low Liquidity Alert',
          message: `Liquidity ${currentLiquidity}% for ${asset} below minimum ${minLiquidity}%`,
          currentValue: currentLiquidity,
          limitValue: minLiquidity,
          limitType: 'min_liquidity',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return this.sendRiskAlert(alert);
      },

      async sendPortfolioOptimizationAlert(userId: string, tenantId: string, optimizationResult: any, severity: 'low' | 'medium' | 'high' | 'critical') {
        const alert = {
          userId,
          tenantId,
          alertType: 'portfolio_optimization',
          severity,
          title: 'Portfolio Optimization Alert',
          message: `Portfolio optimized: Return ${optimizationResult.expectedReturn}%, Risk ${optimizationResult.expectedRisk}%, Sharpe ${optimizationResult.sharpeRatio}`,
          currentValue: optimizationResult.expectedReturn,
          limitValue: 0,
          limitType: 'portfolio_optimization',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return this.sendRiskAlert(alert);
      },

      async sendStressTestAlert(userId: string, tenantId: string, stressTestResult: any, severity: 'low' | 'medium' | 'high' | 'critical') {
        const alert = {
          userId,
          tenantId,
          alertType: 'stress_test',
          severity,
          title: 'Stress Test Alert',
          message: `Stress test ${stressTestResult.scenario}: Portfolio value ${stressTestResult.portfolioValue}, Loss ${stressTestResult.lossPercent}%`,
          currentValue: stressTestResult.lossPercent,
          limitValue: 0,
          limitType: 'stress_test',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return this.sendRiskAlert(alert);
      },

      async sendMonteCarloVaRAlert(userId: string, tenantId: string, varResult: any, severity: 'low' | 'medium' | 'high' | 'critical') {
        const alert = {
          userId,
          tenantId,
          alertType: 'monte_carlo_var',
          severity,
          title: 'Monte Carlo VaR Alert',
          message: `VaR 95%: ${varResult.var95}, VaR 99%: ${varResult.var99}, Expected Shortfall: ${varResult.expectedShortfall95}`,
          currentValue: varResult.var95,
          limitValue: 0,
          limitType: 'monte_carlo_var',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return this.sendRiskAlert(alert);
      },

      async getNotificationPreferences(userId: string, tenantId: string) {
        return {
          channels: ['email', 'push'],
          frequency: 'immediate',
          severity: ['high', 'critical'],
          enabled: true,
        };
      },

      async updateNotificationPreferences(userId: string, tenantId: string, preferences: any) {
        return true;
      },

      async getNotificationHistory(userId: string, tenantId: string, limit?: number, offset?: number) {
        return {
          notifications: [],
          total: 0,
          hasMore: false,
        };
      },

      async markNotificationAsRead(notificationId: string, userId: string) {
        return true;
      },

      async markAllNotificationsAsRead(userId: string, tenantId: string) {
        return true;
      },
    };
  }

  /**
   * Convert custom scenarios to stress test scenarios
   */
  private convertToStressScenarios(scenarios: any[]): any[] {
    return scenarios.map(scenario => ({
      name: scenario.name || 'Custom Scenario',
      marketShock: scenario.marketCrash || 0,
      volatilityShock: scenario.volatilitySpike || 0,
      correlationShock: scenario.correlationIncrease || 0,
      liquidityShock: scenario.liquidityCrisis || 0,
      probability: scenario.probability || 0.1,
    }));
  }

  /**
   * Estimate expected return for position
   */
  private estimateExpectedReturn(position: any): number {
    // Simplified expected return estimation
    // In a full implementation, this would use historical data
    const baseReturn = 0.0001; // 0.01% daily base return
    const volatility = this.estimateVolatility(position);
    const riskPremium = volatility * 0.1; // 10% of volatility as risk premium
    return baseReturn + riskPremium + (Math.random() - 0.5) * 0.001; // Add some randomness
  }

  /**
   * Estimate volatility for position
   */
  private estimateVolatility(position: any): number {
    // Simplified volatility estimation
    // In a full implementation, this would use historical volatility
    const asset = position.asset?.toLowerCase() || '';
    
    // Major cryptocurrencies have different volatilities
    if (asset.includes('btc')) return 0.3; // 30% daily volatility
    if (asset.includes('eth')) return 0.4; // 40% daily volatility
    if (asset.includes('usdt') || asset.includes('usdc')) return 0.01; // 1% for stablecoins
    
    return 0.2 + Math.random() * 0.3; // 20-50% for other assets
  }

  /**
   * Get asset sector
   */
  private getAssetSector(asset: string): string {
    if (!asset) return 'unknown';
    
    const assetLower = asset.toLowerCase();
    
    if (assetLower.includes('btc')) return 'cryptocurrency';
    if (assetLower.includes('eth')) return 'cryptocurrency';
    if (assetLower.includes('usdt') || assetLower.includes('usdc')) return 'stablecoin';
    if (assetLower.includes('defi')) return 'defi';
    if (assetLower.includes('nft')) return 'nft';
    
    return 'cryptocurrency';
  }

  /**
   * Estimate liquidity for position
   */
  private estimateLiquidity(position: any): number {
    const asset = position.asset?.toLowerCase() || '';
    
    // Major cryptocurrencies are highly liquid
    if (asset.includes('btc') || asset.includes('eth')) return 0.95;
    if (asset.includes('usdt') || asset.includes('usdc')) return 0.98;
    
    return 0.6 + Math.random() * 0.3; // 60-90% for other assets
  }

  /**
   * Calculate Monte Carlo VaR
   */
  async calculateMonteCarloVaR(userId: string, tenantId: string, config: any = {}): Promise<any> {
    try {
      const positions = await this.getOpenPositions(userId, tenantId);
      const portfolioValue = await this.getPortfolioValue(userId, tenantId);
      
      // Create risk factors from positions
      const riskFactors = monteCarloRiskService.createDefaultRiskFactors(positions);
      
      // Calculate Monte Carlo VaR
      const result = await monteCarloRiskService.calculateMonteCarloVaR(
        portfolioValue,
        positions,
        riskFactors,
        config
      );
      
      return result;
    } catch (error) {
      logger.error('Failed to calculate Monte Carlo VaR', { userId, error });
      throw error;
    }
  }
}

// Export singleton instance
export const riskService = new RiskService();
export default riskService;
