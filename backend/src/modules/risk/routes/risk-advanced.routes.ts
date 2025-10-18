/**
 * Risk Advanced Routes
 * Advanced risk management endpoints for institutional-grade features
 * 
 * Features:
 * - Correlation matrix analysis
 * - Stress testing scenarios
 * - Liquidity risk analysis
 * - Portfolio optimization
 * - Risk dashboard
 * - Backtesting with risk metrics
 */

import { Elysia, t } from 'elysia';
import { riskService } from '../services/risk.service';
import { RiskRateService } from '../services/risk-rate.service';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import { 
  StressTestRequestSchema,
  PortfolioOptimizationSchema,
  BacktestRequestSchema,
  safeValidate,
  formatZodError
} from '../validation/risk.validation';
import logger from '@/utils/logger';

/**
 * Advanced Risk Routes
 */
export const riskAdvancedRoutes = new Elysia({ prefix: '/risk/advanced' })
  .use(sessionGuard)
  .use(requireTenant)

  /**
   * GET /risk/advanced/correlation-matrix
   * Get correlation matrix between all positions
   */
  .get('/correlation-matrix', async ({ user, tenant }) => {
    try {
      const matrix = await riskService.getCorrelationMatrix(user.id, tenant.id);
      
      return {
        success: true,
        data: {
          matrix,
          positions: matrix.map((_, i) => `Position ${i + 1}`),
          averageCorrelation: matrix.length > 0 
            ? matrix.reduce((sum, row) => sum + row.reduce((rowSum, val) => rowSum + val, 0), 0) / (matrix.length * matrix.length)
            : 0,
          diversificationScore: matrix.length > 0 
            ? Math.max(0, 100 - (matrix.reduce((sum, row) => sum + row.reduce((rowSum, val) => rowSum + val, 0), 0) / (matrix.length * matrix.length)) * 100)
            : 0,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get correlation matrix', { userId: user.id, error });
      return {
        success: false,
        error: 'Failed to calculate correlation matrix',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }, {
    detail: {
      summary: 'Get correlation matrix',
      description: 'Returns correlation matrix between all portfolio positions',
      tags: ['Risk', 'Advanced'],
    },
  })

  /**
   * POST /risk/advanced/stress-test
   * Run stress test scenarios
   */
  .post('/stress-test', async ({ user, tenant, body }) => {
    try {
      // Validate request body with Zod
      const validation = safeValidate(StressTestRequestSchema, body);
      if (!validation.success) {
        return validation.error;
      }

      const scenarios = await riskService.runStressTest(user.id, tenant.id, validation.data.scenarios);
      
      return {
        success: true,
        data: {
          scenarios,
          summary: {
            totalScenarios: scenarios.length,
            worstCase: scenarios.reduce((worst, scenario) => 
              scenario.portfolioValue < worst.portfolioValue ? scenario : worst, scenarios[0] || { portfolioValue: 0 }),
            bestCase: scenarios.reduce((best, scenario) => 
              scenario.portfolioValue > best.portfolioValue ? scenario : best, scenarios[0] || { portfolioValue: 0 }),
            averageLoss: scenarios.reduce((sum, s) => sum + s.lossPercent, 0) / scenarios.length,
          },
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to run stress test', { userId: user.id, error });
      return {
        success: false,
        error: 'Failed to run stress test',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }, {
    body: t.Object({
      scenarios: t.Array(t.Object({
        name: t.String(),
        marketCrash: t.Optional(t.Number()),
        volatilitySpike: t.Optional(t.Number()),
        liquidityCrisis: t.Optional(t.Number()),
        correlationIncrease: t.Optional(t.Number()),
      }), { default: [] }),
    }),
    detail: {
      summary: 'Run stress test',
      description: 'Run stress test scenarios to evaluate portfolio resilience',
      tags: ['Risk', 'Advanced'],
    },
  })

  /**
   * GET /risk/advanced/liquidity-analysis
   * Analyze liquidity risk
   */
  .get('/liquidity-analysis', async ({ user, tenant }) => {
    try {
      const analysis = await riskService.analyzeLiquidityRisk(user.id, tenant.id);
      
      return {
        success: true,
        data: analysis,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to analyze liquidity risk', { userId: user.id, error });
      return {
        success: false,
        error: 'Failed to analyze liquidity risk',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }, {
    detail: {
      summary: 'Analyze liquidity risk',
      description: 'Analyze portfolio liquidity risk and time to liquidate',
      tags: ['Risk', 'Advanced'],
    },
  })

  /**
   * POST /risk/advanced/portfolio-optimization
   * Get portfolio optimization suggestions
   */
  .post('/portfolio-optimization', async ({ user, tenant, body }) => {
    try {
      // Validate request body with Zod
      const validation = safeValidate(PortfolioOptimizationSchema, body);
      if (!validation.success) {
        return validation.error;
      }

      const optimization = await riskService.optimizePortfolio(user.id, tenant.id, validation.data);
      
      return {
        success: true,
        data: optimization,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to optimize portfolio', { userId: user.id, error });
      return {
        success: false,
        error: 'Failed to optimize portfolio',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }, {
    body: t.Object({
      targetReturn: t.Optional(t.Number()),
      maxRisk: t.Optional(t.Number()),
      rebalanceThreshold: t.Optional(t.Number()),
      constraints: t.Optional(t.Object({
        maxPositionSize: t.Optional(t.Number()),
        minPositionSize: t.Optional(t.Number()),
        maxSectorExposure: t.Optional(t.Number()),
      })),
    }),
    detail: {
      summary: 'Optimize portfolio',
      description: 'Get portfolio optimization suggestions using Modern Portfolio Theory',
      tags: ['Risk', 'Advanced'],
    },
  })

  /**
   * GET /risk/advanced/dashboard
   * Get comprehensive risk dashboard
   */
  .get('/dashboard', async ({ user, tenant }) => {
    try {
      const dashboard = await riskService.getRiskDashboard(user.id, tenant.id);
      
      return {
        success: true,
        data: dashboard,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get risk dashboard', { userId: user.id, error });
      return {
        success: false,
        error: 'Failed to get risk dashboard',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }, {
    detail: {
      summary: 'Get risk dashboard',
      description: 'Get comprehensive risk dashboard with all key metrics',
      tags: ['Risk', 'Advanced'],
    },
  })

  /**
   * POST /risk/advanced/backtest-risk
   * Backtest strategy with risk analysis
   */
  .post('/backtest-risk', async ({ user, tenant, body }) => {
    try {
      // Validate request body with Zod
      const validation = safeValidate(BacktestRequestSchema, body);
      if (!validation.success) {
        return validation.error;
      }

      const backtest = await riskService.backtestWithRiskAnalysis(user.id, tenant.id, validation.data);
      
      return {
        success: true,
        data: backtest,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to backtest with risk analysis', { userId: user.id, error });
      return {
        success: false,
        error: 'Failed to backtest strategy',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }, {
    body: t.Object({
      startDate: t.String(),
      endDate: t.String(),
      initialCapital: t.Number(),
      strategy: t.Object({
        type: t.String(),
        parameters: t.Record(t.String(), t.Any()),
      }),
      riskMetrics: t.Array(t.String(), { default: ['sharpe', 'sortino', 'calmar', 'var', 'cvar'] }),
    }),
    detail: {
      summary: 'Backtest with risk analysis',
      description: 'Backtest trading strategy with comprehensive risk analysis',
      tags: ['Risk', 'Advanced'],
    },
  })

  /**
   * GET /risk/advanced/rate-stats
   * Get risk-free rate statistics
   */
  .get('/rate-stats', async () => {
    try {
      const stats = await RiskRateService.getRateStats();
      
      return {
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get rate stats', { error });
      return {
        success: false,
        error: 'Failed to get rate statistics',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }, {
    detail: {
      summary: 'Get rate statistics',
      description: 'Get current risk-free rate and source information',
      tags: ['Risk', 'Advanced'],
    },
  })

  /**
   * POST /risk/advanced/refresh-rates
   * Force refresh risk-free rates
   */
  .post('/refresh-rates', async () => {
    try {
      const newRate = await RiskRateService.refreshRate();
      
      return {
        success: true,
        data: {
          newRate,
          message: 'Risk-free rates refreshed successfully',
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to refresh rates', { error });
      return {
        success: false,
        error: 'Failed to refresh risk-free rates',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }, {
    detail: {
      summary: 'Refresh risk-free rates',
      description: 'Force refresh risk-free rates from external APIs',
      tags: ['Risk', 'Advanced'],
    },
  })

  /**
   * GET /risk/advanced/rate-history
   * Get risk-free rate history
   */
  .get('/rate-history', async ({ query }) => {
    try {
      const days = parseInt(query.days as string) || 30;
      const history = await RiskRateService.getRateHistory(days);
      
      return {
        success: true,
        data: {
          history,
          days,
          averageRate: history.length > 0 
            ? history.reduce((sum, h) => sum + h.rate, 0) / history.length 
            : 0,
          minRate: history.length > 0 ? Math.min(...history.map(h => h.rate)) : 0,
          maxRate: history.length > 0 ? Math.max(...history.map(h => h.rate)) : 0,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get rate history', { error });
      return {
        success: false,
        error: 'Failed to get rate history',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }, {
    query: t.Object({
      days: t.Optional(t.String()),
    }),
    detail: {
      summary: 'Get rate history',
      description: 'Get historical risk-free rate data',
      tags: ['Risk', 'Advanced'],
    },
  });