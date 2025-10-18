// @ts-nocheck
/**
 * Bots Module Routes
 * REST API endpoints for automated trading bot management
 */

import { Elysia, t } from 'elysia';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import { requirePermission } from '../../security/middleware/rbac.middleware';
import { botEngineRegistry } from '../engine/bot-engine.registry';
import { botService } from '../services/bot.service';

export const botsRoutes = new Elysia({ prefix: '/api/v1/bots' })
  .use(sessionGuard)
  .use(requireTenant)

  // ============================================================================
  // BOT MANAGEMENT
  // ============================================================================

  /**
   * Create New Bot
   * POST /api/v1/bots
   */
  .post(
    '/',
    { beforeHandle: [requirePermission('bots', 'write')] },
    async ({ body, user, tenantId }: any) => {
      try {
        const bot = await botService.createBot(user.id, tenantId, body);
        return { success: true, data: bot, message: 'Bot created successfully' };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to create bot' };
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 100 }),
        description: t.Optional(t.String()),
        type: t.Union([
          t.Literal('grid'),
          t.Literal('dca'),
          t.Literal('scalping'),
          t.Literal('arbitrage'),
          t.Literal('market_making'),
          t.Literal('trend_following'),
          t.Literal('mean_reversion'),
          t.Literal('momentum'),
          t.Literal('breakout'),
        ]),
        templateId: t.Optional(t.String()),
        strategyId: t.Optional(t.String()),
        exchangeId: t.String({ minLength: 1 }),
        symbol: t.String({ minLength: 1 }),
        timeframe: t.Optional(t.String()),
        allocatedCapital: t.Number({ minimum: 0 }),
        maxDrawdown: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
        stopLossPercent: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
        takeProfitPercent: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
        maxPositions: t.Optional(t.Number({ minimum: 1, maximum: 50 })),
        positionSizing: t.Optional(t.Union([t.Literal('fixed'), t.Literal('kelly'), t.Literal('risk_parity')])),
        positionSizePercent: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
        orderType: t.Optional(t.Union([t.Literal('market'), t.Literal('limit'), t.Literal('stop_limit')])),
        useTrailingStop: t.Optional(t.Boolean()),
        trailingStopPercent: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
        gridLevels: t.Optional(t.Number({ minimum: 2, maximum: 100 })),
        gridUpperPrice: t.Optional(t.Number({ minimum: 0 })),
        gridLowerPrice: t.Optional(t.Number({ minimum: 0 })),
        gridProfitPercent: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
        dcaOrderCount: t.Optional(t.Number({ minimum: 2, maximum: 50 })),
        dcaOrderAmount: t.Optional(t.Number({ minimum: 0 })),
        dcaStepPercent: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
        dcaTakeProfitPercent: t.Optional(t.Number({ minimum: 0, maximum: 1000 })),
        parameters: t.Optional(t.Record(t.String(), t.Any())),
        riskLimits: t.Optional(t.Record(t.String(), t.Any())),
        notifications: t.Optional(t.Record(t.String(), t.Any())),
        runOnWeekends: t.Optional(t.Boolean()),
        runOnHolidays: t.Optional(t.Boolean()),
        startTime: t.Optional(t.String()),
        endTime: t.Optional(t.String()),
        maxDailyTrades: t.Optional(t.Number({ minimum: 1, maximum: 1000 })),
        cooldownMinutes: t.Optional(t.Number({ minimum: 0, maximum: 1440 })),
        autoRestart: t.Optional(t.Boolean()),
        autoStopOnDrawdown: t.Optional(t.Boolean()),
        autoStopOnLoss: t.Optional(t.Boolean()),
        enabled: t.Optional(t.Boolean()),
        notes: t.Optional(t.String()),
        tags: t.Optional(t.Array(t.String())),
      }),
      detail: {
        tags: ['Bots'],
        summary: 'Create new trading bot',
        description: 'Create and configure a new automated trading bot',
      },
    }
  )

  /**
   * Get All Bots
   * GET /api/v1/bots
   */
  .get(
    '/',
    { beforeHandle: [requirePermission('bots', 'read')] },
    async ({ user, tenantId, query }: any) => {
      try {
        const filters: any = {};
        if (query.status) filters.status = query.status;
        if (query.type) filters.type = query.type;
        if (query.exchangeId) filters.exchangeId = query.exchangeId;
        if (query.symbol) filters.symbol = query.symbol;
        if (query.enabled !== undefined) filters.enabled = query.enabled === 'true';
        if (query.search) filters.search = query.search;

        const bots = await botService.getBots(user.id, tenantId, filters);
        return { success: true, data: bots, count: bots.length };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to get bots' };
      }
    },
    {
      query: t.Object({
        status: t.Optional(t.String()),
        type: t.Optional(t.String()),
        exchangeId: t.Optional(t.String()),
        symbol: t.Optional(t.String()),
        enabled: t.Optional(t.String()),
        search: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Bots'],
        summary: 'Get all bots',
        description: 'Retrieve all trading bots with optional filters',
      },
    }
  )

  /**
   * Get Bot by ID
   * GET /api/v1/bots/:botId
   */
  .get(
    '/:botId',
    { beforeHandle: [requirePermission('bots', 'read')] },
    async ({ params, user, tenantId }: any) => {
      try {
        const bot = await botService.getBot(params.botId, user.id, tenantId);
        if (!bot) {
          return { success: false, error: 'Bot not found' };
        }
        return { success: true, data: bot };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to get bot' };
      }
    },
    {
      params: t.Object({
        botId: t.String(),
      }),
      detail: {
        tags: ['Bots'],
        summary: 'Get bot by ID',
        description: 'Retrieve detailed bot configuration and status',
      },
    }
  )

  /**
   * Update Bot
   * PUT /api/v1/bots/:botId
   */
  .put(
    '/:botId',
    { beforeHandle: [requirePermission('bots', 'write')] },
    async ({ params, body, user, tenantId }: any) => {
      try {
        const bot = await botService.updateBot(params.botId, user.id, tenantId, body);
        return { success: true, data: bot, message: 'Bot updated successfully' };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to update bot' };
      }
    },
    {
      params: t.Object({
        botId: t.String(),
      }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
        description: t.Optional(t.String()),
        allocatedCapital: t.Optional(t.Number({ minimum: 0 })),
        maxDrawdown: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
        stopLossPercent: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
        takeProfitPercent: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
        maxPositions: t.Optional(t.Number({ minimum: 1, maximum: 50 })),
        positionSizing: t.Optional(t.Union([t.Literal('fixed'), t.Literal('kelly'), t.Literal('risk_parity')])),
        positionSizePercent: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
        orderType: t.Optional(t.Union([t.Literal('market'), t.Literal('limit'), t.Literal('stop_limit')])),
        useTrailingStop: t.Optional(t.Boolean()),
        trailingStopPercent: t.Optional(t.Number({ minimum: 0, maximum: 100 })),
        parameters: t.Optional(t.Record(t.String(), t.Any())),
        riskLimits: t.Optional(t.Record(t.String(), t.Any())),
        notifications: t.Optional(t.Record(t.String(), t.Any())),
        runOnWeekends: t.Optional(t.Boolean()),
        runOnHolidays: t.Optional(t.Boolean()),
        startTime: t.Optional(t.String()),
        endTime: t.Optional(t.String()),
        maxDailyTrades: t.Optional(t.Number({ minimum: 1, maximum: 1000 })),
        cooldownMinutes: t.Optional(t.Number({ minimum: 0, maximum: 1440 })),
        autoRestart: t.Optional(t.Boolean()),
        autoStopOnDrawdown: t.Optional(t.Boolean()),
        autoStopOnLoss: t.Optional(t.Boolean()),
        enabled: t.Optional(t.Boolean()),
        notes: t.Optional(t.String()),
        tags: t.Optional(t.Array(t.String())),
      }),
      detail: {
        tags: ['Bots'],
        summary: 'Update bot configuration',
        description: 'Update bot settings and parameters',
      },
    }
  )

  /**
   * Delete Bot
   * DELETE /api/v1/bots/:botId
   */
  .delete(
    '/:botId',
    { beforeHandle: [requirePermission('bots', 'manage')] },
    async ({ params, user, tenantId }: any) => {
      try {
        await botService.deleteBot(params.botId, user.id, tenantId);
        return { success: true, message: 'Bot deleted successfully' };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to delete bot' };
      }
    },
    {
      params: t.Object({
        botId: t.String(),
      }),
      detail: {
        tags: ['Bots'],
        summary: 'Delete bot',
        description: 'Permanently delete a trading bot',
      },
    }
  )

  // ============================================================================
  // BOT CONTROL
  // ============================================================================

  /**
   * Start Bot
   * POST /api/v1/bots/:botId/start
   */
  .post(
    '/:botId/start',
    { beforeHandle: [requirePermission('bots', 'execute')] },
    async ({ params, user, tenantId }: any) => {
      try {
        const execution = await botService.startBot(params.botId, user.id, tenantId);
        return { success: true, data: execution, message: 'Bot started successfully' };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to start bot' };
      }
    },
    {
      params: t.Object({
        botId: t.String(),
      }),
      detail: {
        tags: ['Bots'],
        summary: 'Start bot',
        description: 'Start bot execution',
      },
    }
  )

  /**
   * Stop Bot
   * POST /api/v1/bots/:botId/stop
   */
  .post(
    '/:botId/stop',
    { beforeHandle: [requirePermission('bots', 'execute')] },
    async ({ params, body, user, tenantId }: any) => {
      try {
        await botService.stopBot(params.botId, user.id, tenantId, body?.reason);
        return { success: true, message: 'Bot stopped successfully' };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to stop bot' };
      }
    },
    {
      params: t.Object({
        botId: t.String(),
      }),
      body: t.Optional(
        t.Object({
          reason: t.Optional(t.String()),
        })
      ),
      detail: {
        tags: ['Bots'],
        summary: 'Stop bot',
        description: 'Stop bot execution',
      },
    }
  )

  /**
   * Pause Bot
   * POST /api/v1/bots/:botId/pause
   */
  .post(
    '/:botId/pause',
    { beforeHandle: [requirePermission('bots', 'execute')] },
    async ({ params, user, tenantId }: any) => {
      try {
        await botService.pauseBot(params.botId, user.id, tenantId);
        return { success: true, message: 'Bot paused successfully' };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to pause bot' };
      }
    },
    {
      params: t.Object({
        botId: t.String(),
      }),
      detail: {
        tags: ['Bots'],
        summary: 'Pause bot',
        description: 'Pause bot execution temporarily',
      },
    }
  )

  /**
   * Resume Bot
   * POST /api/v1/bots/:botId/resume
   */
  .post(
    '/:botId/resume',
    { beforeHandle: [requirePermission('bots', 'execute')] },
    async ({ params, user, tenantId }: any) => {
      try {
        await botService.resumeBot(params.botId, user.id, tenantId);
        return { success: true, message: 'Bot resumed successfully' };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to resume bot' };
      }
    },
    {
      params: t.Object({
        botId: t.String(),
      }),
      detail: {
        tags: ['Bots'],
        summary: 'Resume bot',
        description: 'Resume paused bot execution',
      },
    }
  )

  /**
   * Restart Bot
   * POST /api/v1/bots/:botId/restart
   */
  .post(
    '/:botId/restart',
    { beforeHandle: [requirePermission('bots', 'execute')] },
    async ({ params, user, tenantId }: any) => {
      try {
        const execution = await botService.restartBot(params.botId, user.id, tenantId);
        return { success: true, data: execution, message: 'Bot restarted successfully' };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to restart bot' };
      }
    },
    {
      params: t.Object({
        botId: t.String(),
      }),
      detail: {
        tags: ['Bots'],
        summary: 'Restart bot',
        description: 'Stop and start bot execution',
      },
    }
  )

  // ============================================================================
  // BOT STATISTICS & MONITORING
  // ============================================================================

  /**
   * Get Bot Statistics
   * GET /api/v1/bots/:botId/statistics
   */
  .get(
    '/:botId/statistics',
    { beforeHandle: [requirePermission('bots', 'read')] },
    async ({ params, user, tenantId }: any) => {
      try {
        const statistics = await botService.getBotStatistics(params.botId, user.id, tenantId);
        return { success: true, data: statistics };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to get bot statistics' };
      }
    },
    {
      params: t.Object({
        botId: t.String(),
      }),
      detail: {
        tags: ['Bots'],
        summary: 'Get bot statistics',
        description: 'Retrieve comprehensive bot performance statistics',
      },
    }
  )

  /**
   * Get Bot Performance
   * GET /api/v1/bots/:botId/performance
   */
  .get(
    '/:botId/performance',
    { beforeHandle: [requirePermission('bots', 'read')] },
    async ({ params, user, tenantId }: any) => {
      try {
        const performance = await botService.getBotPerformance(params.botId, user.id, tenantId);
        return { success: true, data: performance };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to get bot performance' };
      }
    },
    {
      params: t.Object({
        botId: t.String(),
      }),
      detail: {
        tags: ['Bots'],
        summary: 'Get bot performance',
        description: 'Retrieve bot performance summary',
      },
    }
  )

  /**
   * Get Bot Health
   * GET /api/v1/bots/:botId/health
   */
  .get(
    '/:botId/health',
    { beforeHandle: [requirePermission('bots', 'read')] },
    async ({ params, user, tenantId }: any) => {
      try {
        const health = await botService.getBotHealth(params.botId, user.id, tenantId);
        return { success: true, data: health };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to get bot health' };
      }
    },
    {
      params: t.Object({
        botId: t.String(),
      }),
      detail: {
        tags: ['Bots'],
        summary: 'Get bot health status',
        description: 'Check bot health and identify issues',
      },
    }
  )

  /**
   * Update Bot Performance
   * POST /api/v1/bots/:botId/performance/update
   */
  .post(
    '/:botId/performance/update',
    { beforeHandle: [requirePermission('bots', 'manage')] },
    async ({ params, user, tenantId }: any) => {
      try {
        await botService.updateBotPerformance(params.botId, user.id, tenantId);
        return { success: true, message: 'Bot performance metrics updated' };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to update performance metrics' };
      }
    },
    {
      params: t.Object({
        botId: t.String(),
      }),
      detail: {
        tags: ['Bots'],
        summary: 'Update performance metrics',
        description: 'Recalculate bot performance metrics from trades',
      },
    }
  )

  // ============================================================================
  // EXECUTIONS
  // ============================================================================

  /**
   * Get Executions
   * GET /api/v1/bots/executions
   */
  .get(
    '/executions',
    { beforeHandle: [requirePermission('bots', 'read')] },
    async ({ user, tenantId, query }: any) => {
      try {
        const filters: any = {};
        if (query.botId) filters.botId = query.botId;
        if (query.status) filters.status = query.status;
        if (query.dateFrom) filters.dateFrom = new Date(query.dateFrom);
        if (query.dateTo) filters.dateTo = new Date(query.dateTo);

        const pagination = {
          page: query.page ? parseInt(query.page) : 1,
          limit: query.limit ? parseInt(query.limit) : 20,
        };

        const result = await botService.getExecutions(user.id, tenantId, filters, pagination);
        return { success: true, ...result };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to get executions' };
      }
    },
    {
      query: t.Object({
        botId: t.Optional(t.String()),
        status: t.Optional(t.String()),
        dateFrom: t.Optional(t.String()),
        dateTo: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Bots'],
        summary: 'Get bot executions',
        description: 'Retrieve bot execution history with pagination',
      },
    }
  )

  /**
   * Get Current Execution
   * GET /api/v1/bots/:botId/execution/current
   */
  .get(
    '/:botId/execution/current',
    { beforeHandle: [requirePermission('bots', 'read')] },
    async ({ params, user, tenantId }: any) => {
      try {
        const execution = await botService.getCurrentExecution(params.botId, user.id, tenantId);
        return { success: true, data: execution };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to get current execution' };
      }
    },
    {
      params: t.Object({
        botId: t.String(),
      }),
      detail: {
        tags: ['Bots'],
        summary: 'Get current execution',
        description: 'Retrieve currently running execution for bot',
      },
    }
  )

  // ============================================================================
  // TRADES
  // ============================================================================

  /**
   * Get Trades
   * GET /api/v1/bots/trades
   */
  .get(
    '/trades',
    { beforeHandle: [requirePermission('bots', 'read')] },
    async ({ user, tenantId, query }: any) => {
      try {
        const filters: any = {};
        if (query.botId) filters.botId = query.botId;
        if (query.executionId) filters.executionId = query.executionId;
        if (query.status) filters.status = query.status;
        if (query.symbol) filters.symbol = query.symbol;
        if (query.side) filters.side = query.side;
        if (query.dateFrom) filters.dateFrom = new Date(query.dateFrom);
        if (query.dateTo) filters.dateTo = new Date(query.dateTo);

        const pagination = {
          page: query.page ? parseInt(query.page) : 1,
          limit: query.limit ? parseInt(query.limit) : 50,
        };

        const result = await botService.getTrades(user.id, tenantId, filters, pagination);
        return { success: true, ...result };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to get trades' };
      }
    },
    {
      query: t.Object({
        botId: t.Optional(t.String()),
        executionId: t.Optional(t.String()),
        status: t.Optional(t.String()),
        symbol: t.Optional(t.String()),
        side: t.Optional(t.String()),
        dateFrom: t.Optional(t.String()),
        dateTo: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Bots'],
        summary: 'Get bot trades',
        description: 'Retrieve bot trade history with pagination',
      },
    }
  )

  /**
   * Get Open Trades
   * GET /api/v1/bots/:botId/trades/open
   */
  .get(
    '/:botId/trades/open',
    { beforeHandle: [requirePermission('bots', 'read')] },
    async ({ params, user, tenantId }: any) => {
      try {
        const trades = await botService.getOpenTrades(params.botId, user.id, tenantId);
        return { success: true, data: trades, count: trades.length };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to get open trades' };
      }
    },
    {
      params: t.Object({
        botId: t.String(),
      }),
      detail: {
        tags: ['Bots'],
        summary: 'Get open trades',
        description: 'Retrieve currently open trades for bot',
      },
    }
  )

  // ============================================================================
  // LOGS
  // ============================================================================

  /**
   * Get Logs
   * GET /api/v1/bots/logs
   */
  .get(
    '/logs',
    { beforeHandle: [requirePermission('bots', 'read')] },
    async ({ user, tenantId, query }: any) => {
      try {
        const filters: any = {};
        if (query.botId) filters.botId = query.botId;
        if (query.executionId) filters.executionId = query.executionId;
        if (query.level) filters.level = query.level;
        if (query.category) filters.category = query.category;
        if (query.dateFrom) filters.dateFrom = new Date(query.dateFrom);
        if (query.dateTo) filters.dateTo = new Date(query.dateTo);

        const pagination = {
          page: query.page ? parseInt(query.page) : 1,
          limit: query.limit ? parseInt(query.limit) : 100,
        };

        const result = await botService.getLogs(user.id, tenantId, filters, pagination);
        return { success: true, ...result };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to get logs' };
      }
    },
    {
      query: t.Object({
        botId: t.Optional(t.String()),
        executionId: t.Optional(t.String()),
        level: t.Optional(t.String()),
        category: t.Optional(t.String()),
        dateFrom: t.Optional(t.String()),
        dateTo: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Bots'],
        summary: 'Get bot logs',
        description: 'Retrieve bot execution logs with pagination',
      },
    }
  )

  // ============================================================================
  // TEMPLATES
  // ============================================================================

  /**
   * Create Template
   * POST /api/v1/bots/templates
   */
  .post(
    '/templates',
    { beforeHandle: [requirePermission('bots', 'write')] },
    async ({ body, user, tenantId }: any) => {
      try {
        const template = await botService.createTemplate(user.id, tenantId, body);
        return { success: true, data: template, message: 'Template created successfully' };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to create template' };
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 100 }),
        description: t.Optional(t.String()),
        type: t.Union([
          t.Literal('grid'),
          t.Literal('dca'),
          t.Literal('scalping'),
          t.Literal('arbitrage'),
          t.Literal('market_making'),
          t.Literal('trend_following'),
          t.Literal('mean_reversion'),
          t.Literal('momentum'),
          t.Literal('breakout'),
        ]),
        category: t.Optional(t.Union([t.Literal('beginner'), t.Literal('intermediate'), t.Literal('advanced'), t.Literal('experimental')])),
        configuration: t.Record(t.String(), t.Any()),
        requiredParameters: t.Optional(t.Record(t.String(), t.Any())),
        defaultParameters: t.Optional(t.Record(t.String(), t.Any())),
        isPublic: t.Optional(t.Boolean()),
        documentation: t.Optional(t.String()),
        setupInstructions: t.Optional(t.String()),
        riskWarning: t.Optional(t.String()),
        tags: t.Optional(t.Array(t.String())),
      }),
      detail: {
        tags: ['Bots'],
        summary: 'Create bot template',
        description: 'Create reusable bot configuration template',
      },
    }
  )

  /**
   * Get Templates
   * GET /api/v1/bots/templates
   */
  .get(
    '/templates',
    { beforeHandle: [requirePermission('bots', 'read')] },
    async ({ query }: any) => {
      try {
        const filters: any = {};
        if (query.type) filters.type = query.type;
        if (query.category) filters.category = query.category;
        if (query.isPublic !== undefined) filters.isPublic = query.isPublic === 'true';
        if (query.isSystem !== undefined) filters.isSystem = query.isSystem === 'true';
        if (query.isFeatured !== undefined) filters.isFeatured = query.isFeatured === 'true';
        if (query.search) filters.search = query.search;

        const templates = await botService.getTemplates(filters);
        return { success: true, data: templates, count: templates.length };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to get templates' };
      }
    },
    {
      query: t.Object({
        type: t.Optional(t.String()),
        category: t.Optional(t.String()),
        isPublic: t.Optional(t.String()),
        isSystem: t.Optional(t.String()),
        isFeatured: t.Optional(t.String()),
        search: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Bots'],
        summary: 'Get bot templates',
        description: 'Retrieve available bot templates',
      },
    }
  )

  /**
   * Get Template by ID
   * GET /api/v1/bots/templates/:templateId
   */
  .get(
    '/templates/:templateId',
    { beforeHandle: [requirePermission('bots', 'read')] },
    async ({ params }: any) => {
      try {
        const template = await botService.getTemplate(params.templateId);
        if (!template) {
          return { success: false, error: 'Template not found' };
        }
        return { success: true, data: template };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to get template' };
      }
    },
    {
      params: t.Object({
        templateId: t.String(),
      }),
      detail: {
        tags: ['Bots'],
        summary: 'Get template by ID',
        description: 'Retrieve bot template details',
      },
    }
  )

  /**
   * Clone Bot from Template
   * POST /api/v1/bots/templates/:templateId/clone
   */
  .post(
    '/templates/:templateId/clone',
    { beforeHandle: [requirePermission('bots', 'write')] },
    async ({ params, body, user, tenantId }: any) => {
      try {
        const bot = await botService.cloneBotFromTemplate(params.templateId, user.id, tenantId, body || {});
        return { success: true, data: bot, message: 'Bot created from template successfully' };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to clone bot from template' };
      }
    },
    {
      params: t.Object({
        templateId: t.String(),
      }),
      body: t.Optional(t.Record(t.String(), t.Any())),
      detail: {
        tags: ['Bots'],
        summary: 'Clone bot from template',
        description: 'Create new bot from template with optional overrides',
      },
    }
  )

  /**
   * Validate Bot Configuration
   * POST /api/v1/bots/validate
   */
  .post(
    '/validate',
    { beforeHandle: [requirePermission('bots', 'read')] },
    async ({ body }: any) => {
      try {
        const result = await botService.validateBotConfiguration(body);
        return { success: true, data: result };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to validate configuration' };
      }
    },
    {
      body: t.Record(t.String(), t.Any()),
      detail: {
        tags: ['Bots'],
        summary: 'Validate bot configuration',
        description: 'Validate bot configuration before creation',
      },
    }
  )

  /**
   * Engine Metrics
   * GET /api/v1/bots/:botId/engine/metrics
   */
  .get(
    '/:botId/engine/metrics',
    { beforeHandle: [requirePermission('bots', 'read')] },
    async ({ params }: any) => {
      const metrics = botEngineRegistry.getMetrics(params.botId);
      if (!metrics) return { success: false, error: 'Engine not running' };
      return { success: true, data: metrics };
    },
    {
      params: t.Object({ botId: t.String() }),
      detail: {
        tags: ['Bots'],
        summary: 'Get engine metrics',
        description: 'Return live engine metrics for a running bot',
      },
    }
  )

  /**
   * Engine State
   * GET /api/v1/bots/:botId/engine/state
   */
  .get(
    '/:botId/engine/state',
    { beforeHandle: [requirePermission('bots', 'read')] },
    async ({ params }: any) => {
      const state = botEngineRegistry.getState(params.botId);
      return { success: true, data: { state } };
    },
    {
      params: t.Object({ botId: t.String() }),
      detail: {
        tags: ['Bots'],
        summary: 'Get engine state',
        description: 'Return live engine state for a bot',
      },
    }
  )

  /**
   * List Running Engines
   * GET /api/v1/bots/running
   */
  .get(
    '/running',
    { beforeHandle: [requirePermission('bots', 'read')] },
    async () => {
      const list = botEngineRegistry.list();
      return { success: true, data: list, count: list.length };
    },
    {
      detail: {
        tags: ['Bots'],
        summary: 'List running bot engines',
        description: 'Return list of botIds with active engines',
      },
    }
  )
