/**
 * Bots Metrics Collector
 * Collects and exports automated trading bot metrics
 */

import { metricsRegistry } from '../registry';
import logger from '@/utils/logger';

/**
 * Bots Metrics Collector
 * Provides methods to record bot operation metrics
 */
class BotsMetricsCollector {
  private static instance: BotsMetricsCollector;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): BotsMetricsCollector {
    if (!BotsMetricsCollector.instance) {
      BotsMetricsCollector.instance = new BotsMetricsCollector();
    }
    return BotsMetricsCollector.instance;
  }

  /**
   * Update active bots count
   */
  public updateActiveBots(labels: { tenantId: string; status: string }, count: number): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.botsActive.set(
        {
          tenant_id: labels.tenantId,
          status: labels.status,
        },
        count
      );

      logger.debug('Active bots updated', { labels, count });
    } catch (error) {
      logger.error('Failed to update active bots', { error, labels, count });
    }
  }

  /**
   * Record bot execution start
   */
  public recordBotStarted(labels: { tenantId: string; botId: string; botType: string }): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.botsExecutionsTotal.inc({
        tenant_id: labels.tenantId,
        bot_type: labels.botType,
        event: 'started',
      });

      logger.debug('Bot start recorded', { labels });
    } catch (error) {
      logger.error('Failed to record bot start', { error, labels });
    }
  }

  /**
   * Record bot execution stop
   */
  public recordBotStopped(labels: { tenantId: string; botId: string; botType: string; reason: string }): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.botsExecutionsTotal.inc({
        tenant_id: labels.tenantId,
        bot_type: labels.botType,
        event: 'stopped',
      });

      logger.debug('Bot stop recorded', { labels });
    } catch (error) {
      logger.error('Failed to record bot stop', { error, labels });
    }
  }

  /**
   * Record bot error
   */
  public recordBotError(labels: { tenantId: string; botId: string; botType: string; errorType: string }): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.botsErrors.inc({
        tenant_id: labels.tenantId,
        bot_type: labels.botType,
        error_type: labels.errorType,
      });

      logger.debug('Bot error recorded', { labels });
    } catch (error) {
      logger.error('Failed to record bot error', { error, labels });
    }
  }

  /**
   * Update bot performance (win rate)
   */
  public updateBotWinRate(labels: { tenantId: string; botId: string; botType: string }, winRatePercent: number): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.botsWinRate.set(
        {
          tenant_id: labels.tenantId,
          bot_id: labels.botId,
          bot_type: labels.botType,
        },
        winRatePercent
      );

      logger.debug('Bot win rate updated', { labels, winRatePercent });
    } catch (error) {
      logger.error('Failed to update bot win rate', { error, labels, winRatePercent });
    }
  }

  /**
   * Update bot profit factor
   */
  public updateBotProfitFactor(labels: { tenantId: string; botId: string; botType: string }, profitFactor: number): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.botsProfitFactor.set(
        {
          tenant_id: labels.tenantId,
          bot_id: labels.botId,
          bot_type: labels.botType,
        },
        profitFactor
      );

      logger.debug('Bot profit factor updated', { labels, profitFactor });
    } catch (error) {
      logger.error('Failed to update bot profit factor', { error, labels, profitFactor });
    }
  }

  /**
   * Update bot total P&L
   */
  public updateBotPnl(labels: { tenantId: string; botId: string; botType: string }, pnl: number): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.botsPnl.set(
        {
          tenant_id: labels.tenantId,
          bot_id: labels.botId,
          bot_type: labels.botType,
        },
        pnl
      );

      logger.debug('Bot P&L updated', { labels, pnl });
    } catch (error) {
      logger.error('Failed to update bot P&L', { error, labels, pnl });
    }
  }

  /**
   * Record bot trade
   */
  public recordBotTrade(labels: {
    tenantId: string;
    botId: string;
    botType: string;
    side: 'buy' | 'sell';
    result: 'win' | 'loss' | 'breakeven';
  }): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.botsTradesTotal.inc({
        tenant_id: labels.tenantId,
        bot_id: labels.botId,
        bot_type: labels.botType,
        side: labels.side,
        result: labels.result,
      });

      logger.debug('Bot trade recorded', { labels });
    } catch (error) {
      logger.error('Failed to record bot trade', { error, labels });
    }
  }

  /**
   * Update bot uptime
   */
  public updateBotUptime(labels: { tenantId: string; botId: string; botType: string }, uptimeSeconds: number): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.botsUptime.set(
        {
          tenant_id: labels.tenantId,
          bot_id: labels.botId,
          bot_type: labels.botType,
        },
        uptimeSeconds
      );

      logger.debug('Bot uptime updated', { labels, uptimeSeconds });
    } catch (error) {
      logger.error('Failed to update bot uptime', { error, labels, uptimeSeconds });
    }
  }

  /**
   * Update bot health score
   */
  public updateBotHealthScore(labels: { tenantId: string; botId: string; botType: string }, healthScore: number): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.botsHealthScore.set(
        {
          tenant_id: labels.tenantId,
          bot_id: labels.botId,
          bot_type: labels.botType,
        },
        healthScore
      );

      logger.debug('Bot health score updated', { labels, healthScore });
    } catch (error) {
      logger.error('Failed to update bot health score', { error, labels, healthScore });
    }
  }

  /**
   * Update bot capital utilization
   */
  public updateBotCapitalUtilization(labels: { tenantId: string; botId: string; botType: string }, utilizationPercent: number): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.botsCapitalUtilization.set(
        {
          tenant_id: labels.tenantId,
          bot_id: labels.botId,
          bot_type: labels.botType,
        },
        utilizationPercent
      );

      logger.debug('Bot capital utilization updated', { labels, utilizationPercent });
    } catch (error) {
      logger.error('Failed to update bot capital utilization', { error, labels, utilizationPercent });
    }
  }

  /**
   * Record bot execution time
   */
  public recordBotExecutionTime(labels: { tenantId: string; botType: string; operation: string }, durationMs: number): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.botsExecutionTime.observe(
        {
          tenant_id: labels.tenantId,
          bot_type: labels.botType,
          operation: labels.operation,
        },
        durationMs / 1000 // Convert to seconds
      );

      logger.debug('Bot execution time recorded', { labels, durationMs });
    } catch (error) {
      logger.error('Failed to record bot execution time', { error, labels, durationMs });
    }
  }

  /**
   * Update bot Sharpe ratio
   */
  public updateBotSharpeRatio(labels: { tenantId: string; botId: string; botType: string }, sharpeRatio: number): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.botsSharpeRatio.set(
        {
          tenant_id: labels.tenantId,
          bot_id: labels.botId,
          bot_type: labels.botType,
        },
        sharpeRatio
      );

      logger.debug('Bot Sharpe ratio updated', { labels, sharpeRatio });
    } catch (error) {
      logger.error('Failed to update bot Sharpe ratio', { error, labels, sharpeRatio });
    }
  }

  /**
   * Update bot drawdown
   */
  public updateBotDrawdown(labels: { tenantId: string; botId: string; botType: string }, drawdownPercent: number): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.botsDrawdown.set(
        {
          tenant_id: labels.tenantId,
          bot_id: labels.botId,
          bot_type: labels.botType,
        },
        drawdownPercent
      );

      logger.debug('Bot drawdown updated', { labels, drawdownPercent });
    } catch (error) {
      logger.error('Failed to update bot drawdown', { error, labels, drawdownPercent });
    }
  }
}

// Export singleton instance
export const botsMetrics = BotsMetricsCollector.getInstance();
