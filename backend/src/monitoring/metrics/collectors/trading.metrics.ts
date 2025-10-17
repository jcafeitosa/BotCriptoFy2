/**
 * Trading Metrics Collector
 * Collects and exports trading-related metrics (positions, orders, P&L)
 */

import { metricsRegistry } from '../registry';
import logger from '@/utils/logger';

/**
 * Trading Metrics Collector
 * Provides methods to record trading operation metrics
 */
class TradingMetricsCollector {
  private static instance: TradingMetricsCollector;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): TradingMetricsCollector {
    if (!TradingMetricsCollector.instance) {
      TradingMetricsCollector.instance = new TradingMetricsCollector();
    }
    return TradingMetricsCollector.instance;
  }

  /**
   * Record an order placement
   */
  public recordOrderPlaced(labels: {
    exchange: string;
    symbol: string;
    type: string;
    side: string;
    status: 'success' | 'failed';
  }): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.tradingOrdersTotal.inc({
        exchange: labels.exchange,
        symbol: labels.symbol,
        type: labels.type,
        side: labels.side,
        status: labels.status,
      });

      logger.debug('Order placement metrics recorded', { labels });
    } catch (error) {
      logger.error('Failed to record order placement metrics', { error, labels });
    }
  }

  /**
   * Record order fill
   */
  public recordOrderFilled(labels: {
    exchange: string;
    symbol: string;
    type: string;
    side: string;
    value: number;
  }): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.tradingOrdersFilledTotal.inc({
        exchange: labels.exchange,
        symbol: labels.symbol,
        type: labels.type,
        side: labels.side,
      });

      metrics.tradingVolumeTotal.inc(
        {
          exchange: labels.exchange,
          symbol: labels.symbol,
          side: labels.side,
        },
        labels.value
      );

      logger.debug('Order fill metrics recorded', { labels });
    } catch (error) {
      logger.error('Failed to record order fill metrics', { error, labels });
    }
  }

  /**
   * Record order cancellation
   */
  public recordOrderCancelled(labels: { exchange: string; symbol: string; reason: string }): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.tradingOrdersCancelledTotal.inc({
        exchange: labels.exchange,
        symbol: labels.symbol,
        reason: labels.reason,
      });

      logger.debug('Order cancellation metrics recorded', { labels });
    } catch (error) {
      logger.error('Failed to record order cancellation metrics', { error, labels });
    }
  }

  /**
   * Record position open
   */
  public recordPositionOpened(labels: {
    exchange: string;
    symbol: string;
    side: 'long' | 'short';
    leverage: number;
  }): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.tradingPositionsOpenedTotal.inc({
        exchange: labels.exchange,
        symbol: labels.symbol,
        side: labels.side,
      });

      logger.debug('Position opened metrics recorded', { labels });
    } catch (error) {
      logger.error('Failed to record position opened metrics', { error, labels });
    }
  }

  /**
   * Record position close
   */
  public recordPositionClosed(labels: {
    exchange: string;
    symbol: string;
    side: 'long' | 'short';
    pnl: number;
    pnlPercent: number;
    result: 'win' | 'loss' | 'breakeven';
  }): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.tradingPositionsClosedTotal.inc({
        exchange: labels.exchange,
        symbol: labels.symbol,
        side: labels.side,
        result: labels.result,
      });

      metrics.tradingPnlTotal.inc(
        {
          exchange: labels.exchange,
          symbol: labels.symbol,
          type: labels.pnl >= 0 ? 'profit' : 'loss',
        },
        Math.abs(labels.pnl)
      );

      logger.debug('Position closed metrics recorded', { labels });
    } catch (error) {
      logger.error('Failed to record position closed metrics', { error, labels });
    }
  }

  /**
   * Update active positions gauge
   */
  public updateActivePositions(labels: { exchange: string; symbol: string; side: 'long' | 'short' }, count: number): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.tradingPositionsActive.set(
        {
          exchange: labels.exchange,
          symbol: labels.symbol,
          side: labels.side,
        },
        count
      );

      logger.debug('Active positions updated', { labels, count });
    } catch (error) {
      logger.error('Failed to update active positions', { error, labels, count });
    }
  }

  /**
   * Update liquidation risk gauge
   */
  public updateLiquidationRisk(labels: { exchange: string; symbol: string }, riskLevel: number): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.tradingLiquidationRisk.set(
        {
          exchange: labels.exchange,
          symbol: labels.symbol,
        },
        riskLevel
      );

      logger.debug('Liquidation risk updated', { labels, riskLevel });
    } catch (error) {
      logger.error('Failed to update liquidation risk', { error, labels, riskLevel });
    }
  }

  /**
   * Update portfolio value
   */
  public updatePortfolioValue(labels: { tenantId: string }, value: number): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.tradingPortfolioValue.set(
        {
          tenant_id: labels.tenantId,
        },
        value
      );

      logger.debug('Portfolio value updated', { labels, value });
    } catch (error) {
      logger.error('Failed to update portfolio value', { error, labels, value });
    }
  }

  /**
   * Update unrealized P&L
   */
  public updateUnrealizedPnl(labels: { tenantId: string; exchange: string }, pnl: number): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.tradingUnrealizedPnl.set(
        {
          tenant_id: labels.tenantId,
          exchange: labels.exchange,
        },
        pnl
      );

      logger.debug('Unrealized P&L updated', { labels, pnl });
    } catch (error) {
      logger.error('Failed to update unrealized P&L', { error, labels, pnl });
    }
  }

  /**
   * Update margin level
   */
  public updateMarginLevel(labels: { tenantId: string; exchange: string }, level: number): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.tradingMarginLevel.set(
        {
          tenant_id: labels.tenantId,
          exchange: labels.exchange,
        },
        level
      );

      logger.debug('Margin level updated', { labels, level });
    } catch (error) {
      logger.error('Failed to update margin level', { error, labels, level });
    }
  }

  /**
   * Record trade execution time
   */
  public recordTradeExecutionTime(labels: { exchange: string; operation: string }, durationMs: number): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.tradingExecutionTime.observe(
        {
          exchange: labels.exchange,
          operation: labels.operation,
        },
        durationMs / 1000 // Convert to seconds
      );

      logger.debug('Trade execution time recorded', { labels, durationMs });
    } catch (error) {
      logger.error('Failed to record trade execution time', { error, labels, durationMs });
    }
  }

  /**
   * Record API error
   */
  public recordApiError(labels: { exchange: string; endpoint: string; error_code: string }): void {
    try {
      const metrics = metricsRegistry.getMetrics();

      metrics.tradingApiErrors.inc({
        exchange: labels.exchange,
        endpoint: labels.endpoint,
        error_code: labels.error_code,
      });

      logger.debug('API error metrics recorded', { labels });
    } catch (error) {
      logger.error('Failed to record API error metrics', { error, labels });
    }
  }
}

// Export singleton instance
export const tradingMetrics = TradingMetricsCollector.getInstance();
