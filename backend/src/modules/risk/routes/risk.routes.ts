/**
 * Risk Management Routes
 * REST API endpoints for portfolio risk management
 */

import { Elysia, t } from 'elysia';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import { riskService } from '../services/risk.service';
import { riskAdvancedRoutes } from './risk-advanced.routes';
import { 
  CreateRiskProfileSchema,
  UpdateRiskProfileSchema,
  CreateRiskLimitSchema,
  UpdateRiskLimitSchema,
  TradeValidationSchema,
  safeValidate,
  formatZodError
} from '../validation/risk.validation';

export const riskRoutes = new Elysia({ prefix: '/api/v1/risk' })
  .use(sessionGuard)
  .use(requireTenant)

  // ============================================================================
  // RISK PROFILE
  // ============================================================================

  /**
   * Get Risk Profile
   * GET /api/v1/risk/profile
   */
  .get(
    '/profile',
    async ({ user, tenantId }: any) => {
      try {
        const profile = await riskService.getRiskProfile(user.id, tenantId);
        return { success: true, data: profile };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to get risk profile' };
      }
    },
    {
      detail: {
        tags: ['Risk Management'],
        summary: 'Get user risk profile',
        description: 'Retrieve risk tolerance and preferences',
      },
    }
  )

  /**
   * Create Risk Profile
   * POST /api/v1/risk/profile
   */
  .post(
    '/profile',
    async ({ user, tenantId, body }: any) => {
      try {
        // Validate request body with Zod
        const validation = safeValidate(CreateRiskProfileSchema, body);
        if (!validation.success) {
          return validation.error;
        }

        const profile = await riskService.createRiskProfile(user.id, tenantId, validation.data);
        return { success: true, data: profile, message: 'Risk profile created successfully' };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to create risk profile' };
      }
    },
    {
      body: t.Object({
        riskTolerance: t.Union([t.Literal('conservative'), t.Literal('moderate'), t.Literal('aggressive')]),
        investmentHorizon: t.Union([t.Literal('short'), t.Literal('medium'), t.Literal('long')]),
        maxDrawdown: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
        maxLeverage: t.Optional(t.Number({ minimum: 1, maximum: 125 })),
        maxPositionSize: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
        maxSectorExposure: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
        maxCorrelation: t.Optional(t.Number({ minimum: 0, maximum: 1 })),
        isActive: t.Optional(t.Boolean()),
        preferences: t.Optional(t.Record(t.String(), t.Any())),
      }),
      detail: {
        tags: ['Risk Management'],
        summary: 'Create risk profile',
        description: 'Set risk tolerance and position sizing preferences',
      },
    }
  )

  /**
   * Update Risk Profile
   * PUT /api/v1/risk/profile
   */
  .put(
    '/profile',
    async ({ user, tenantId, body }: any) => {
      try {
        const profile = await riskService.updateRiskProfile(user.id, tenantId, body);
        return { success: true, data: profile, message: 'Risk profile updated successfully' };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to update risk profile' };
      }
    },
    {
      body: t.Object({
        riskTolerance: t.Optional(t.Union([t.Literal('conservative'), t.Literal('moderate'), t.Literal('aggressive')])),
        maxPortfolioRisk: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
        maxPositionRisk: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
        maxDrawdown: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
      }),
      detail: {
        tags: ['Risk Management'],
        summary: 'Update risk profile',
        description: 'Update risk tolerance settings',
      },
    }
  )

  // ============================================================================
  // RISK METRICS
  // ============================================================================

  /**
   * Get Risk Metrics
   * GET /api/v1/risk/metrics
   */
  .get(
    '/metrics',
    async ({ user, tenantId }: any) => {
      try {
        const metrics = await riskService.getRiskMetrics(user.id, tenantId);
        return { success: true, data: metrics };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to get risk metrics' };
      }
    },
    {
      detail: {
        tags: ['Risk Management'],
        summary: 'Get current risk metrics',
        description: 'Retrieve latest portfolio risk metrics',
      },
    }
  )

  /**
   * Calculate Risk Metrics
   * POST /api/v1/risk/metrics/calculate
   */
  .post(
    '/metrics/calculate',
    async ({ user, tenantId }: any) => {
      try {
        const metrics = await riskService.calculateRiskMetrics(user.id, tenantId);
        return { success: true, data: metrics, message: 'Risk metrics calculated successfully' };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to calculate risk metrics' };
      }
    },
    {
      detail: {
        tags: ['Risk Management'],
        summary: 'Calculate risk metrics',
        description: 'Recalculate all portfolio risk metrics',
      },
    }
  )

  /**
   * Get Risk Metrics History
   * GET /api/v1/risk/metrics/history
   */
  .get(
    '/metrics/history',
    async ({ user, tenantId, query }: any) => {
      try {
        const days = query.days ? parseInt(query.days) : 30;
        const history = await riskService.getRiskMetricsHistory(user.id, tenantId, days);
        return { success: true, data: history, count: history.length };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to get metrics history' };
      }
    },
    {
      query: t.Object({
        days: t.Optional(t.String({ description: 'Number of days (default: 30)' })),
      }),
      detail: {
        tags: ['Risk Management'],
        summary: 'Get risk metrics history',
        description: 'Retrieve historical risk metrics',
      },
    }
  )

  // ============================================================================
  // POSITION SIZING
  // ============================================================================

  /**
   * Calculate Position Size
   * POST /api/v1/risk/position-sizing
   */
  .post(
    '/position-sizing',
    async ({ user, tenantId, body }: any) => {
      try {
        const result = await riskService.calculatePositionSize(user.id, tenantId, body);
        return { success: true, data: result };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to calculate position size' };
      }
    },
    {
      body: t.Object({
        symbol: t.String({ minLength: 1 }),
        side: t.Union([t.Literal('long'), t.Literal('short')]),
        entryPrice: t.Number({ minimum: 0 }),
        stopLoss: t.Number({ minimum: 0 }),
        portfolioValue: t.Optional(t.Number({ minimum: 0 })),
        method: t.Optional(t.Union([t.Literal('fixed'), t.Literal('kelly'), t.Literal('risk_parity')])),
      }),
      detail: {
        tags: ['Risk Management'],
        summary: 'Calculate position size',
        description: 'Calculate recommended position size using Kelly Criterion, fixed %, or risk parity',
      },
    }
  )

  // ============================================================================
  // RISK/REWARD ANALYSIS
  // ============================================================================

  /**
   * Analyze Risk/Reward
   * POST /api/v1/risk/risk-reward
   */
  .post(
    '/risk-reward',
    async ({ user, tenantId, body }: any) => {
      try {
        const analysis = await riskService.analyzeRiskReward(user.id, tenantId, body);
        return { success: true, data: analysis };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to analyze risk/reward' };
      }
    },
    {
      body: t.Object({
        symbol: t.String({ minLength: 1 }),
        side: t.Union([t.Literal('long'), t.Literal('short')]),
        entryPrice: t.Number({ minimum: 0 }),
        stopLoss: t.Number({ minimum: 0 }),
        takeProfit: t.Number({ minimum: 0 }),
        winProbability: t.Optional(t.Number({ minimum: 0, maximum: 1 })),
      }),
      detail: {
        tags: ['Risk Management'],
        summary: 'Analyze risk/reward ratio',
        description: 'Evaluate trade setup R:R ratio and expected value',
      },
    }
  )

  // ============================================================================
  // PORTFOLIO ANALYSIS
  // ============================================================================

  /**
   * Analyze Portfolio Risk
   * GET /api/v1/risk/portfolio
   */
  .get(
    '/portfolio',
    async ({ user, tenantId }: any) => {
      try {
        const analysis = await riskService.analyzePortfolioRisk(user.id, tenantId);
        return { success: true, data: analysis };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to analyze portfolio risk' };
      }
    },
    {
      detail: {
        tags: ['Risk Management'],
        summary: 'Analyze portfolio risk',
        description: 'Get comprehensive portfolio risk analysis',
      },
    }
  )

  /**
   * Analyze Drawdown
   * GET /api/v1/risk/drawdown
   */
  .get(
    '/drawdown',
    async ({ user, tenantId }: any) => {
      try {
        const analysis = await riskService.analyzeDrawdown(user.id, tenantId);
        return { success: true, data: analysis };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to analyze drawdown' };
      }
    },
    {
      detail: {
        tags: ['Risk Management'],
        summary: 'Analyze drawdown',
        description: 'Calculate current and maximum drawdown',
      },
    }
  )

  /**
   * Calculate VaR
   * POST /api/v1/risk/var
   */
  .post(
    '/var',
    async ({ user, tenantId, body }: any) => {
      try {
        const result = await riskService.calculateVaR(user.id, tenantId, body || {});
        return { success: true, data: result };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to calculate VaR' };
      }
    },
    {
      body: t.Optional(
        t.Object({
          confidence: t.Optional(t.Number({ minimum: 0.9, maximum: 0.99 })),
          timeHorizon: t.Optional(t.Number({ minimum: 1, maximum: 30 })),
          method: t.Optional(t.Union([t.Literal('historical'), t.Literal('parametric'), t.Literal('monte_carlo')])),
          includeBreakdown: t.Optional(t.Boolean()),
        })
      ),
      detail: {
        tags: ['Risk Management'],
        summary: 'Calculate Value at Risk',
        description: 'Calculate portfolio VaR (95% or 99% confidence)',
      },
    }
  )

  /**
   * Calculate Performance Ratios
   * GET /api/v1/risk/performance
   */
  .get(
    '/performance',
    async ({ user, tenantId, query }: any) => {
      try {
        const days = query.days ? parseInt(query.days) : 252;
        const ratios = await riskService.calculatePerformanceRatios(user.id, tenantId, days);
        return { success: true, data: ratios };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to calculate performance ratios' };
      }
    },
    {
      query: t.Object({
        days: t.Optional(t.String({ description: 'Number of days (default: 252)' })),
      }),
      detail: {
        tags: ['Risk Management'],
        summary: 'Calculate performance ratios',
        description: 'Calculate Sharpe, Sortino, and Calmar ratios',
      },
    }
  )

  /**
   * Analyze Volatility
   * GET /api/v1/risk/volatility
   */
  .get(
    '/volatility',
    async ({ user, tenantId, query }: any) => {
      try {
        const analysis = await riskService.analyzeVolatility(user.id, tenantId, query.symbol);
        return { success: true, data: analysis };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to analyze volatility' };
      }
    },
    {
      query: t.Object({
        symbol: t.Optional(t.String({ description: 'Optional symbol filter' })),
      }),
      detail: {
        tags: ['Risk Management'],
        summary: 'Analyze volatility',
        description: 'Calculate current and historical volatility',
      },
    }
  )

  // ============================================================================
  // ALERTS
  // ============================================================================

  /**
   * Get Alerts
   * GET /api/v1/risk/alerts
   */
  .get(
    '/alerts',
    async ({ user, tenantId, query }: any) => {
      try {
        const acknowledged = query.acknowledged === 'true' ? true : query.acknowledged === 'false' ? false : undefined;
        const alerts = await riskService.getAlerts(user.id, tenantId, acknowledged);
        return { success: true, data: alerts, count: alerts.length };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to get alerts' };
      }
    },
    {
      query: t.Object({
        acknowledged: t.Optional(t.String({ description: 'Filter by acknowledged status (true/false)' })),
      }),
      detail: {
        tags: ['Risk Management'],
        summary: 'Get risk alerts',
        description: 'Retrieve risk limit violations and warnings',
      },
    }
  )

  /**
   * Acknowledge Alert
   * POST /api/v1/risk/alerts/:alertId/acknowledge
   */
  .post(
    '/alerts/:alertId/acknowledge',
    async ({ user, tenantId, params }: any) => {
      try {
        await riskService.acknowledgeAlert(params.alertId, user.id, tenantId);
        return { success: true, message: 'Alert acknowledged successfully' };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to acknowledge alert' };
      }
    },
    {
      params: t.Object({
        alertId: t.String(),
      }),
      detail: {
        tags: ['Risk Management'],
        summary: 'Acknowledge alert',
        description: 'Mark risk alert as acknowledged',
      },
    }
  )

  /**
   * Resolve Alert
   * POST /api/v1/risk/alerts/:alertId/resolve
   */
  .post(
    '/alerts/:alertId/resolve',
    async ({ user, tenantId, params }: any) => {
      try {
        await riskService.resolveAlert(params.alertId, user.id, tenantId);
        return { success: true, message: 'Alert resolved successfully' };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to resolve alert' };
      }
    },
    {
      params: t.Object({
        alertId: t.String(),
      }),
      detail: {
        tags: ['Risk Management'],
        summary: 'Resolve alert',
        description: 'Mark risk alert as resolved',
      },
    }
  )

  // ============================================================================
  // TRADE VALIDATION
  // ============================================================================

  /**
   * Validate Trade
   * POST /api/v1/risk/validate
   */
  .post(
    '/validate',
    async ({ user, tenantId, body }: any) => {
      try {
        // Validate request body with Zod
        const validation = safeValidate(TradeValidationSchema, body);
        if (!validation.success) {
          return validation.error;
        }

        const result = await riskService.validateTrade(user.id, tenantId, validation.data);
        return { success: true, data: result };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to validate trade' };
      }
    },
    {
      body: t.Object({
        symbol: t.String({ minLength: 1 }),
        side: t.Union([t.Literal('long'), t.Literal('short')]),
        quantity: t.Number({ minimum: 0 }),
        price: t.Number({ minimum: 0 }),
        stopLoss: t.Optional(t.Number({ minimum: 0 })),
      }),
      detail: {
        tags: ['Risk Management'],
        summary: 'Validate trade',
        description: 'Check if trade complies with risk limits',
      },
    })

  // ============================================================================
  // ADVANCED RISK ROUTES
  // ============================================================================
  .use(riskAdvancedRoutes);
