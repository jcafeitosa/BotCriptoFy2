/**
 * Prometheus Metrics Registry
 * Central registry for all application metrics
 */

import { Registry, Counter, Gauge, Histogram } from 'prom-client';
import type { MetricsRegistry } from '../types';
import logger from '@/utils/logger';

/**
 * Global Prometheus registry
 * Singleton instance that holds all metrics
 */
class MetricsRegistryManager {
  private static instance: MetricsRegistryManager;
  private registry: Registry;
  private metrics: MetricsRegistry | null = null;
  private initialized = false;

  private constructor() {
    this.registry = new Registry();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): MetricsRegistryManager {
    if (!MetricsRegistryManager.instance) {
      MetricsRegistryManager.instance = new MetricsRegistryManager();
    }
    return MetricsRegistryManager.instance;
  }

  /**
   * Initialize all metrics
   */
  public initialize(): void {
    if (this.initialized) {
      logger.warn('Metrics registry already initialized');
      return;
    }

    try {
      // HTTP Metrics
      const httpRequestsTotal = new Counter({
        name: 'http_requests_total',
        help: 'Total number of HTTP requests',
        labelNames: ['method', 'path', 'status'],
        registers: [this.registry],
      });

      const httpRequestDuration = new Histogram({
        name: 'http_request_duration_seconds',
        help: 'HTTP request duration in seconds',
        labelNames: ['method', 'path'],
        buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
        registers: [this.registry],
      });

      const httpActiveConnections = new Gauge({
        name: 'http_active_connections',
        help: 'Number of active HTTP connections',
        registers: [this.registry],
      });

      // Database Metrics
      const dbQueriesTotal = new Counter({
        name: 'db_queries_total',
        help: 'Total number of database queries',
        labelNames: ['type', 'table'],
        registers: [this.registry],
      });

      const dbQueryDuration = new Histogram({
        name: 'db_query_duration_seconds',
        help: 'Database query duration in seconds',
        labelNames: ['type'],
        buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
        registers: [this.registry],
      });

      const dbPoolConnections = new Gauge({
        name: 'db_pool_connections',
        help: 'Number of database pool connections by state',
        labelNames: ['state'],
        registers: [this.registry],
      });

      // Cache Metrics
      const cacheOperationsTotal = new Counter({
        name: 'cache_operations_total',
        help: 'Total number of cache operations',
        labelNames: ['operation', 'namespace', 'result'],
        registers: [this.registry],
      });

      const cacheHitRate = new Gauge({
        name: 'cache_hit_rate',
        help: 'Cache hit rate by namespace',
        labelNames: ['namespace'],
        registers: [this.registry],
      });

      const cacheMemoryUsage = new Gauge({
        name: 'cache_memory_usage_bytes',
        help: 'Cache memory usage in bytes by namespace',
        labelNames: ['namespace'],
        registers: [this.registry],
      });

      // Rate Limiting Metrics
      const rateLimitRequestsTotal = new Counter({
        name: 'rate_limit_requests_total',
        help: 'Total number of rate limit checks',
        labelNames: ['rule', 'result'],
        registers: [this.registry],
      });

      const rateLimitBlockRate = new Gauge({
        name: 'rate_limit_block_rate',
        help: 'Rate limit block rate by rule',
        labelNames: ['rule'],
        registers: [this.registry],
      });

      // System Metrics
      const nodejsMemoryUsage = new Gauge({
        name: 'nodejs_memory_usage_bytes',
        help: 'Node.js memory usage in bytes by type',
        labelNames: ['type'],
        registers: [this.registry],
      });

      const nodejsCpuUsage = new Gauge({
        name: 'nodejs_cpu_usage_percent',
        help: 'Node.js CPU usage percentage',
        registers: [this.registry],
      });

      const nodejsGcRuns = new Counter({
        name: 'nodejs_gc_runs_total',
        help: 'Total number of garbage collection runs',
        labelNames: ['type'],
        registers: [this.registry],
      });

      const nodejsEventLoopLag = new Gauge({
        name: 'nodejs_event_loop_lag_seconds',
        help: 'Event loop lag in seconds',
        registers: [this.registry],
      });

      // Bot metrics instrumentation (updated by runtime collectors)
      const botsActive = new Gauge({ name: 'bots_active', help: 'Active bots', labelNames: ['bot_id'], registers: [this.registry] });
      const botsExecutionsTotal = new Counter({ name: 'bots_executions_total', help: 'Total bot executions', labelNames: ['bot_id'], registers: [this.registry] });
      const botsErrors = new Counter({ name: 'bots_errors', help: 'Bot errors', labelNames: ['bot_id'], registers: [this.registry] });
      const botsWinRate = new Gauge({ name: 'bots_win_rate', help: 'Bot win rate', labelNames: ['bot_id'], registers: [this.registry] });
      const botsProfitFactor = new Gauge({ name: 'bots_profit_factor', help: 'Bot profit factor', labelNames: ['bot_id'], registers: [this.registry] });
      const botsPnl = new Gauge({ name: 'bots_pnl', help: 'Bot PnL', labelNames: ['bot_id'], registers: [this.registry] });
      const botsTradesTotal = new Counter({ name: 'bots_trades_total', help: 'Total bot trades', labelNames: ['bot_id'], registers: [this.registry] });
      const botsUptime = new Gauge({ name: 'bots_uptime', help: 'Bot uptime', labelNames: ['bot_id'], registers: [this.registry] });
      const botsHealthScore = new Gauge({ name: 'bots_health_score', help: 'Bot health score', labelNames: ['bot_id'], registers: [this.registry] });
      const botsCapitalUtilization = new Gauge({ name: 'bots_capital_utilization', help: 'Bot capital utilization', labelNames: ['bot_id'], registers: [this.registry] });
      const botsExecutionTime = new Histogram({ name: 'bots_execution_time', help: 'Bot execution time', labelNames: ['bot_id'], registers: [this.registry] });
      const botsSharpeRatio = new Gauge({ name: 'bots_sharpe_ratio', help: 'Bot Sharpe ratio', labelNames: ['bot_id'], registers: [this.registry] });
      const botsDrawdown = new Gauge({ name: 'bots_drawdown', help: 'Bot drawdown', labelNames: ['bot_id'], registers: [this.registry] });

      // Risk Metrics
      const riskScore = new Gauge({ name: 'risk_score', help: 'Risk score', labelNames: ['symbol'], registers: [this.registry] });
      const riskValueAtRisk = new Gauge({ name: 'risk_value_at_risk', help: 'Value at Risk', labelNames: ['symbol'], registers: [this.registry] });
      const riskDrawdown = new Gauge({ name: 'risk_drawdown', help: 'Risk drawdown', labelNames: ['symbol'], registers: [this.registry] });
      const riskMaxDrawdown = new Gauge({ name: 'risk_max_drawdown', help: 'Max drawdown', labelNames: ['symbol'], registers: [this.registry] });
      const riskSharpeRatio = new Gauge({ name: 'risk_sharpe_ratio', help: 'Sharpe ratio', labelNames: ['symbol'], registers: [this.registry] });
      const riskSortinoRatio = new Gauge({ name: 'risk_sortino_ratio', help: 'Sortino ratio', labelNames: ['symbol'], registers: [this.registry] });
      const riskCalmarRatio = new Gauge({ name: 'risk_calmar_ratio', help: 'Calmar ratio', labelNames: ['symbol'], registers: [this.registry] });
      const riskExposure = new Gauge({ name: 'risk_exposure', help: 'Risk exposure', labelNames: ['symbol'], registers: [this.registry] });
      const riskLeverage = new Gauge({ name: 'risk_leverage', help: 'Risk leverage', labelNames: ['symbol'], registers: [this.registry] });
      const riskConcentration = new Gauge({ name: 'risk_concentration', help: 'Risk concentration', labelNames: ['symbol'], registers: [this.registry] });
      const riskLimitViolations = new Counter({ name: 'risk_limit_violations', help: 'Risk limit violations', labelNames: ['type'], registers: [this.registry] });
      const riskPositionSize = new Gauge({ name: 'risk_position_size', help: 'Position size', labelNames: ['symbol'], registers: [this.registry] });
      const riskVolatility = new Gauge({ name: 'risk_volatility', help: 'Risk volatility', labelNames: ['symbol'], registers: [this.registry] });

      // Trading Metrics
      const tradingOrdersTotal = new Counter({ name: 'trading_orders_total', help: 'Total orders', labelNames: ['type'], registers: [this.registry] });
      const tradingOrdersFilledTotal = new Counter({ name: 'trading_orders_filled_total', help: 'Filled orders', labelNames: ['symbol'], registers: [this.registry] });
      const tradingVolumeTotal = new Counter({ name: 'trading_volume_total', help: 'Trading volume', labelNames: ['symbol'], registers: [this.registry] });
      const tradingOrdersCancelledTotal = new Counter({ name: 'trading_orders_cancelled_total', help: 'Cancelled orders', labelNames: ['symbol'], registers: [this.registry] });
      const tradingPositionsOpenedTotal = new Counter({ name: 'trading_positions_opened_total', help: 'Opened positions', labelNames: ['symbol'], registers: [this.registry] });
      const tradingPositionsClosedTotal = new Counter({ name: 'trading_positions_closed_total', help: 'Closed positions', labelNames: ['symbol'], registers: [this.registry] });
      const tradingPnlTotal = new Gauge({ name: 'trading_pnl_total', help: 'Total PnL', labelNames: ['symbol'], registers: [this.registry] });
      const tradingPositionsActive = new Gauge({ name: 'trading_positions_active', help: 'Active positions', labelNames: ['symbol'], registers: [this.registry] });
      const tradingLiquidationRisk = new Gauge({ name: 'trading_liquidation_risk', help: 'Liquidation risk', labelNames: ['symbol'], registers: [this.registry] });
      const tradingPortfolioValue = new Gauge({ name: 'trading_portfolio_value', help: 'Portfolio value', registers: [this.registry] });
      const tradingUnrealizedPnl = new Gauge({ name: 'trading_unrealized_pnl', help: 'Unrealized PnL', labelNames: ['symbol'], registers: [this.registry] });
      const tradingMarginLevel = new Gauge({ name: 'trading_margin_level', help: 'Margin level', registers: [this.registry] });
      const tradingExecutionTime = new Histogram({ name: 'trading_execution_time', help: 'Execution time', labelNames: ['type'], registers: [this.registry] });
      const tradingApiErrors = new Counter({ name: 'trading_api_errors', help: 'API errors', labelNames: ['exchange'], registers: [this.registry] });

      // Store all metrics
      this.metrics = {
        httpRequestsTotal,
        httpRequestDuration,
        httpActiveConnections,
        dbQueriesTotal,
        dbQueryDuration,
        dbPoolConnections,
        cacheOperationsTotal,
        cacheHitRate,
        cacheMemoryUsage,
        rateLimitRequestsTotal,
        rateLimitBlockRate,
        nodejsMemoryUsage,
        nodejsCpuUsage,
        nodejsGcRuns,
        nodejsEventLoopLag,
        botsActive,
        botsExecutionsTotal,
        botsErrors,
        botsWinRate,
        botsProfitFactor,
        botsPnl,
        botsTradesTotal,
        botsUptime,
        botsHealthScore,
        botsCapitalUtilization,
        botsExecutionTime,
        botsSharpeRatio,
        botsDrawdown,
        riskScore,
        riskValueAtRisk,
        riskDrawdown,
        riskMaxDrawdown,
        riskSharpeRatio,
        riskSortinoRatio,
        riskCalmarRatio,
        riskExposure,
        riskLeverage,
        riskConcentration,
        riskLimitViolations,
        riskPositionSize,
        riskVolatility,
        tradingOrdersTotal,
        tradingOrdersFilledTotal,
        tradingVolumeTotal,
        tradingOrdersCancelledTotal,
        tradingPositionsOpenedTotal,
        tradingPositionsClosedTotal,
        tradingPnlTotal,
        tradingPositionsActive,
        tradingLiquidationRisk,
        tradingPortfolioValue,
        tradingUnrealizedPnl,
        tradingMarginLevel,
        tradingExecutionTime,
        tradingApiErrors,
      };

      this.initialized = true;

      logger.info('Metrics registry initialized', {
        metricsCount: this.metrics ? Object.keys(this.metrics).length : 0,
      });
    } catch (error) {
      logger.error('Failed to initialize metrics registry', { error });
      throw error;
    }
  }

  /**
   * Get the registry instance
   */
  public getRegistry(): Registry {
    return this.registry;
  }

  /**
   * Get all metrics
   */
  public getMetrics(): MetricsRegistry {
    if (!this.metrics) {
      throw new Error('Metrics registry not initialized. Call initialize() first.');
    }
    return this.metrics;
  }

  /**
   * Get metrics as Prometheus text format
   */
  public async getMetricsText(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Get metrics as JSON
   */
  public async getMetricsJSON(): Promise<any> {
    return this.registry.getMetricsAsJSON();
  }

  /**
   * Reset all metrics (useful for testing)
   */
  public reset(): void {
    this.registry.resetMetrics();
    logger.debug('Metrics registry reset');
  }

  /**
   * Clear all metrics and registry
   */
  public clear(): void {
    this.registry.clear();
    this.metrics = null;
    this.initialized = false;
    logger.debug('Metrics registry cleared');
  }
}

// Export singleton instance
export const metricsRegistry = MetricsRegistryManager.getInstance();

// Initialize on import
metricsRegistry.initialize();
