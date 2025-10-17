/**
 * Risk Metrics Collector
 * Collects and exports risk management metrics (VaR, drawdown, performance ratios)
 */

import { metricsRegistry } from '../registry';
import logger from '@/utils/logger';

/**
 * Risk Metrics Collector
 * Provides methods to record risk management metrics
 */
class RiskMetricsCollector {
  private static instance: RiskMetricsCollector;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): RiskMetricsCollector {
    if (!RiskMetricsCollector.instance) {
      RiskMetricsCollector.instance = new RiskMetricsCollector();
    }
    return RiskMetricsCollector.instance;
  }

  /**
   * Update portfolio risk score
   */
  public updateRiskScore(labels: { tenantId: string }, score: number): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.riskScore.set(
        {
          tenant_id: labels.tenantId,
        },
        score
      );

      logger.debug('Risk score updated', { labels, score });
    } catch (error) {
      logger.error('Failed to update risk score', { error, labels, score });
    }
  }

  /**
   * Update Value at Risk (VaR)
   */
  public updateVaR(labels: { tenantId: string; confidence: string }, value: number): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.riskValueAtRisk.set(
        {
          tenant_id: labels.tenantId,
          confidence: labels.confidence,
        },
        value
      );

      logger.debug('VaR updated', { labels, value });
    } catch (error) {
      logger.error('Failed to update VaR', { error, labels, value });
    }
  }

  /**
   * Update current drawdown
   */
  public updateDrawdown(labels: { tenantId: string }, drawdownPercent: number): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.riskDrawdown.set(
        {
          tenant_id: labels.tenantId,
        },
        drawdownPercent
      );

      logger.debug('Drawdown updated', { labels, drawdownPercent });
    } catch (error) {
      logger.error('Failed to update drawdown', { error, labels, drawdownPercent });
    }
  }

  /**
   * Update max drawdown
   */
  public updateMaxDrawdown(labels: { tenantId: string }, maxDrawdownPercent: number): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.riskMaxDrawdown.set(
        {
          tenant_id: labels.tenantId,
        },
        maxDrawdownPercent
      );

      logger.debug('Max drawdown updated', { labels, maxDrawdownPercent });
    } catch (error) {
      logger.error('Failed to update max drawdown', { error, labels, maxDrawdownPercent });
    }
  }

  /**
   * Update Sharpe Ratio
   */
  public updateSharpeRatio(labels: { tenantId: string }, ratio: number): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.riskSharpeRatio.set(
        {
          tenant_id: labels.tenantId,
        },
        ratio
      );

      logger.debug('Sharpe ratio updated', { labels, ratio });
    } catch (error) {
      logger.error('Failed to update Sharpe ratio', { error, labels, ratio });
    }
  }

  /**
   * Update Sortino Ratio
   */
  public updateSortinoRatio(labels: { tenantId: string }, ratio: number): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.riskSortinoRatio.set(
        {
          tenant_id: labels.tenantId,
        },
        ratio
      );

      logger.debug('Sortino ratio updated', { labels, ratio });
    } catch (error) {
      logger.error('Failed to update Sortino ratio', { error, labels, ratio });
    }
  }

  /**
   * Update Calmar Ratio
   */
  public updateCalmarRatio(labels: { tenantId: string }, ratio: number): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.riskCalmarRatio.set(
        {
          tenant_id: labels.tenantId,
        },
        ratio
      );

      logger.debug('Calmar ratio updated', { labels, ratio });
    } catch (error) {
      logger.error('Failed to update Calmar ratio', { error, labels, ratio });
    }
  }

  /**
   * Update portfolio exposure
   */
  public updateExposure(labels: { tenantId: string; type: 'long' | 'short' | 'net' | 'gross' }, exposurePercent: number): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.riskExposure.set(
        {
          tenant_id: labels.tenantId,
          type: labels.type,
        },
        exposurePercent
      );

      logger.debug('Exposure updated', { labels, exposurePercent });
    } catch (error) {
      logger.error('Failed to update exposure', { error, labels, exposurePercent });
    }
  }

  /**
   * Update leverage
   */
  public updateLeverage(labels: { tenantId: string; exchange: string }, leverage: number): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.riskLeverage.set(
        {
          tenant_id: labels.tenantId,
          exchange: labels.exchange,
        },
        leverage
      );

      logger.debug('Leverage updated', { labels, leverage });
    } catch (error) {
      logger.error('Failed to update leverage', { error, labels, leverage });
    }
  }

  /**
   * Update concentration risk
   */
  public updateConcentrationRisk(labels: { tenantId: string }, herfindahlIndex: number): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.riskConcentration.set(
        {
          tenant_id: labels.tenantId,
        },
        herfindahlIndex
      );

      logger.debug('Concentration risk updated', { labels, herfindahlIndex });
    } catch (error) {
      logger.error('Failed to update concentration risk', { error, labels, herfindahlIndex });
    }
  }

  /**
   * Record risk limit violation
   */
  public recordLimitViolation(labels: { tenantId: string; limitType: string; severity: string }): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.riskLimitViolations.inc({
        tenant_id: labels.tenantId,
        limit_type: labels.limitType,
        severity: labels.severity,
      });

      logger.debug('Risk limit violation recorded', { labels });
    } catch (error) {
      logger.error('Failed to record risk limit violation', { error, labels });
    }
  }

  /**
   * Update position sizing recommendation
   */
  public updatePositionSizing(labels: { tenantId: string; method: string }, sizePercent: number): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.riskPositionSize.set(
        {
          tenant_id: labels.tenantId,
          method: labels.method,
        },
        sizePercent
      );

      logger.debug('Position sizing updated', { labels, sizePercent });
    } catch (error) {
      logger.error('Failed to update position sizing', { error, labels, sizePercent });
    }
  }

  /**
   * Update portfolio volatility
   */
  public updateVolatility(labels: { tenantId: string }, volatilityPercent: number): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.riskVolatility.set(
        {
          tenant_id: labels.tenantId,
        },
        volatilityPercent
      );

      logger.debug('Volatility updated', { labels, volatilityPercent });
    } catch (error) {
      logger.error('Failed to update volatility', { error, labels, volatilityPercent });
    }
  }
}

// Export singleton instance
export const riskMetrics = RiskMetricsCollector.getInstance();
