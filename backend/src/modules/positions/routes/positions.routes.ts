/**
 * Positions Routes
 * REST API endpoints for position management
 */

import { Elysia, t } from 'elysia';
import { sessionGuard, requireTenant } from '../../auth/middleware/session.middleware';
import { positionService } from '../services/position.service';
import type {
  CreatePositionRequest,
  UpdatePositionRequest,
  ClosePositionRequest,
  PositionQueryOptions
} from '../types/positions.types';

/**
 * Positions Router
 * Handles all position-related endpoints
 */
export const positionsRouter = new Elysia({ prefix: '/api/v1/positions' })
  .use(sessionGuard)
  .use(requireTenant)

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  /**
   * Create Position
   * POST /api/v1/positions
   */
  .post(
    '/',
    async ({ body, user, tenantId }: any) => {
      try {
        const position = await positionService.createPosition(
          user.id,
          tenantId,
          body as CreatePositionRequest
        );

        return {
          success: true,
          data: position,
          message: 'Position opened successfully',
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to create position',
        };
      }
    },
    {
      body: t.Object({
        exchangeId: t.String({ minLength: 1, description: 'Exchange ID' }),
        symbol: t.String({ minLength: 1, description: 'Trading symbol (e.g., BTC/USDT)' }),
        side: t.Union([t.Literal('long'), t.Literal('short')], { description: 'Position side' }),
        type: t.Union([
          t.Literal('spot'),
          t.Literal('margin'),
          t.Literal('futures'),
          t.Literal('perpetual'),
        ], { description: 'Position type' }),
        quantity: t.Number({ minimum: 0, description: 'Quantity to trade' }),
        entryPrice: t.Optional(t.Number({ minimum: 0, description: 'Entry price (optional for market orders)' })),
        leverage: t.Optional(t.Number({ minimum: 1, maximum: 125, description: 'Leverage (1x-125x)' })),
        marginType: t.Optional(t.Union([t.Literal('cross'), t.Literal('isolated')], { description: 'Margin type' })),
        stopLoss: t.Optional(t.Number({ minimum: 0, description: 'Stop loss price' })),
        takeProfit: t.Optional(t.Number({ minimum: 0, description: 'Take profit price' })),
        trailingStop: t.Optional(t.Number({ minimum: 0, maximum: 100, description: 'Trailing stop percentage' })),
        openOrderId: t.Optional(t.String({ description: 'Related order ID' })),
        strategyId: t.Optional(t.String({ description: 'Related strategy ID' })),
        botId: t.Optional(t.String({ description: 'Related bot ID' })),
        signalId: t.Optional(t.String({ description: 'Related signal ID' })),
        notes: t.Optional(t.String({ description: 'Position notes' })),
        tags: t.Optional(t.Array(t.String(), { description: 'Position tags' })),
      }),
      detail: {
        tags: ['Positions'],
        summary: 'Create new position',
        description: 'Open a new trading position with optional risk management parameters',
      },
    }
  )

  /**
   * Get Position by ID
   * GET /api/v1/positions/:id
   */
  .get(
    '/:id',
    async ({ params, user, tenantId }: any) => {
      try {
        const position = await positionService.getPosition(params.id, user.id, tenantId);

        if (!position) {
          return {
            success: false,
            error: 'Position not found',
          };
        }

        return {
          success: true,
          data: position,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to get position',
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ description: 'Position ID' }),
      }),
      detail: {
        tags: ['Positions'],
        summary: 'Get position by ID',
        description: 'Retrieve a specific position by its ID',
      },
    }
  )

  /**
   * Get Positions (Query/List)
   * GET /api/v1/positions
   */
  .get(
    '/',
    async ({ query, user, tenantId }: any) => {
      try {
        const options: PositionQueryOptions = {
          userId: user.id,
          tenantId: tenantId,
          exchangeId: query.exchangeId,
          symbol: query.symbol,
          side: query.side as 'long' | 'short' | undefined,
          type: query.type as any,
          status: query.status as any,
          strategyId: query.strategyId,
          botId: query.botId,
          limit: query.limit ? parseInt(query.limit) : 50,
          offset: query.offset ? parseInt(query.offset) : 0,
        };

        const positions = await positionService.getPositions(options);

        return {
          success: true,
          data: positions,
          count: positions.length,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to get positions',
        };
      }
    },
    {
      query: t.Object({
        exchangeId: t.Optional(t.String({ description: 'Filter by exchange' })),
        symbol: t.Optional(t.String({ description: 'Filter by symbol' })),
        side: t.Optional(t.Union([t.Literal('long'), t.Literal('short')], { description: 'Filter by side' })),
        type: t.Optional(t.String({ description: 'Filter by type' })),
        status: t.Optional(t.String({ description: 'Filter by status' })),
        strategyId: t.Optional(t.String({ description: 'Filter by strategy' })),
        botId: t.Optional(t.String({ description: 'Filter by bot' })),
        limit: t.Optional(t.String({ description: 'Limit results (default: 50)' })),
        offset: t.Optional(t.String({ description: 'Offset for pagination (default: 0)' })),
      }),
      detail: {
        tags: ['Positions'],
        summary: 'List positions',
        description: 'Get all positions with optional filters',
      },
    }
  )

  /**
   * Update Position
   * PUT /api/v1/positions/:id
   */
  .put(
    '/:id',
    async ({ params, body, user, tenantId }: any) => {
      try {
        const position = await positionService.updatePosition(
          params.id,
          user.id,
          tenantId,
          body as UpdatePositionRequest
        );

        return {
          success: true,
          data: position,
          message: 'Position updated successfully',
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to update position',
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ description: 'Position ID' }),
      }),
      body: t.Object({
        currentPrice: t.Optional(t.Number({ minimum: 0, description: 'Current market price' })),
        stopLoss: t.Optional(t.Number({ minimum: 0, description: 'Stop loss price' })),
        takeProfit: t.Optional(t.Number({ minimum: 0, description: 'Take profit price' })),
        trailingStop: t.Optional(t.Number({ minimum: 0, maximum: 100, description: 'Trailing stop percentage' })),
        notes: t.Optional(t.String({ description: 'Position notes' })),
        tags: t.Optional(t.Array(t.String(), { description: 'Position tags' })),
      }),
      detail: {
        tags: ['Positions'],
        summary: 'Update position',
        description: 'Update position parameters (price, stops, notes, tags)',
      },
    }
  )

  /**
   * Close Position
   * POST /api/v1/positions/:id/close
   */
  .post(
    '/:id/close',
    async ({ params, body, user, tenantId }: any) => {
      try {
        const position = await positionService.closePosition(
          params.id,
          user.id,
          tenantId,
          body as ClosePositionRequest
        );

        return {
          success: true,
          data: position,
          message: 'Position closed successfully',
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to close position',
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ description: 'Position ID' }),
      }),
      body: t.Object({
        quantity: t.Optional(t.Number({ minimum: 0, description: 'Quantity to close (omit for full close)' })),
        exitPrice: t.Optional(t.Number({ minimum: 0, description: 'Exit price (optional for market orders)' })),
        exitReason: t.Union([
          t.Literal('manual'),
          t.Literal('stop_loss'),
          t.Literal('take_profit'),
          t.Literal('trailing_stop'),
          t.Literal('liquidation'),
        ], { description: 'Reason for closing position' }),
        closeOrderId: t.Optional(t.String({ description: 'Related close order ID' })),
        notes: t.Optional(t.String({ description: 'Close notes' })),
      }),
      detail: {
        tags: ['Positions'],
        summary: 'Close position',
        description: 'Close position (fully or partially)',
      },
    }
  )

  /**
   * Delete Position
   * DELETE /api/v1/positions/:id
   */
  .delete(
    '/:id',
    async ({ params, user, tenantId }: any) => {
      try {
        await positionService.deletePosition(params.id, user.id, tenantId);

        return {
          success: true,
          message: 'Position deleted successfully',
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to delete position',
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ description: 'Position ID' }),
      }),
      detail: {
        tags: ['Positions'],
        summary: 'Delete position',
        description: 'Delete a closed position (only closed positions can be deleted)',
      },
    }
  )

  // ============================================================================
  // P&L CALCULATIONS
  // ============================================================================

  /**
   * Get Current P&L
   * GET /api/v1/positions/:id/pnl
   */
  .get(
    '/:id/pnl',
    async ({ params, query, user, tenantId }: any) => {
      try {
        const position = await positionService.getPosition(params.id, user.id, tenantId);

        if (!position) {
          return {
            success: false,
            error: 'Position not found',
          };
        }

        const currentPrice = query.currentPrice
          ? parseFloat(query.currentPrice)
          : position.currentPrice;

        const pnl = await positionService.calculatePnL(position, currentPrice);

        return {
          success: true,
          data: {
            positionId: params.id,
            currentPrice,
            ...pnl,
          },
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to calculate P&L',
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ description: 'Position ID' }),
      }),
      query: t.Object({
        currentPrice: t.Optional(t.String({ description: 'Current market price (optional)' })),
      }),
      detail: {
        tags: ['Positions', 'P&L'],
        summary: 'Calculate current P&L',
        description: 'Calculate unrealized and realized P&L at current or specified price',
      },
    }
  )

  /**
   * Update Position P&L
   * POST /api/v1/positions/:id/pnl/update
   */
  .post(
    '/:id/pnl/update',
    async ({ params, body, user: _user, tenantId: _tenantId }: any) => {
      try {
        const position = await positionService.updatePositionPnL(
          params.id,
          body.currentPrice
        );

        return {
          success: true,
          data: position,
          message: 'P&L updated successfully',
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to update P&L',
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ description: 'Position ID' }),
      }),
      body: t.Object({
        currentPrice: t.Number({ minimum: 0, description: 'Current market price' }),
      }),
      detail: {
        tags: ['Positions', 'P&L'],
        summary: 'Update position P&L',
        description: 'Update position with current price and recalculate P&L',
      },
    }
  )

  // ============================================================================
  // MARGIN MANAGEMENT
  // ============================================================================

  /**
   * Get Margin Status
   * GET /api/v1/positions/:id/margin
   */
  .get(
    '/:id/margin',
    async ({ params, query, user, tenantId }: any) => {
      try {
        const position = await positionService.getPosition(params.id, user.id, tenantId);

        if (!position) {
          return {
            success: false,
            error: 'Position not found',
          };
        }

        const currentPrice = query.currentPrice
          ? parseFloat(query.currentPrice)
          : position.currentPrice;

        const margin = await positionService.calculateMargin(position, currentPrice);

        return {
          success: true,
          data: {
            positionId: params.id,
            currentPrice,
            ...margin,
          },
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to calculate margin',
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ description: 'Position ID' }),
      }),
      query: t.Object({
        currentPrice: t.Optional(t.String({ description: 'Current market price (optional)' })),
      }),
      detail: {
        tags: ['Positions', 'Margin'],
        summary: 'Get margin status',
        description: 'Calculate margin level, liquidation price, and margin call status',
      },
    }
  )

  /**
   * Check Margin Calls
   * GET /api/v1/positions/margin/calls
   */
  .get(
    '/margin/calls',
    async ({ user, tenantId }: any) => {
      try {
        const alerts = await positionService.checkMarginCall(user.id, tenantId);

        return {
          success: true,
          data: alerts,
          count: alerts.length,
          hasMarginCalls: alerts.length > 0,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to check margin calls',
        };
      }
    },
    {
      detail: {
        tags: ['Positions', 'Margin'],
        summary: 'Check margin calls',
        description: 'Check all positions for margin calls and liquidation warnings',
      },
    }
  )

  // ============================================================================
  // RISK MANAGEMENT
  // ============================================================================

  /**
   * Check Stop Loss
   * GET /api/v1/positions/:id/risk/stop-loss
   */
  .get(
    '/:id/risk/stop-loss',
    async ({ params, query, user: _user, tenantId: _tenantId }: any) => {
      try {
        const currentPrice = query.currentPrice ? parseFloat(query.currentPrice) : 0;

        if (!currentPrice) {
          return {
            success: false,
            error: 'Current price is required',
          };
        }

        const isHit = await positionService.checkStopLoss(params.id, currentPrice);

        return {
          success: true,
          data: {
            positionId: params.id,
            currentPrice,
            stopLossHit: isHit,
          },
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to check stop loss',
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ description: 'Position ID' }),
      }),
      query: t.Object({
        currentPrice: t.String({ description: 'Current market price' }),
      }),
      detail: {
        tags: ['Positions', 'Risk'],
        summary: 'Check stop loss',
        description: 'Check if stop loss has been hit at current price',
      },
    }
  )

  /**
   * Check Take Profit
   * GET /api/v1/positions/:id/risk/take-profit
   */
  .get(
    '/:id/risk/take-profit',
    async ({ params, query, user: _user, tenantId: _tenantId }: any) => {
      try {
        const currentPrice = query.currentPrice ? parseFloat(query.currentPrice) : 0;

        if (!currentPrice) {
          return {
            success: false,
            error: 'Current price is required',
          };
        }

        const isHit = await positionService.checkTakeProfit(params.id, currentPrice);

        return {
          success: true,
          data: {
            positionId: params.id,
            currentPrice,
            takeProfitHit: isHit,
          },
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to check take profit',
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ description: 'Position ID' }),
      }),
      query: t.Object({
        currentPrice: t.String({ description: 'Current market price' }),
      }),
      detail: {
        tags: ['Positions', 'Risk'],
        summary: 'Check take profit',
        description: 'Check if take profit has been hit at current price',
      },
    }
  )

  /**
   * Update Trailing Stop
   * POST /api/v1/positions/:id/risk/trailing-stop
   */
  .post(
    '/:id/risk/trailing-stop',
    async ({ params, body, user: _user, tenantId: _tenantId }: any) => {
      try {
        await positionService.updateTrailingStop(params.id, body.currentPrice);

        return {
          success: true,
          message: 'Trailing stop updated successfully',
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to update trailing stop',
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ description: 'Position ID' }),
      }),
      body: t.Object({
        currentPrice: t.Number({ minimum: 0, description: 'Current market price' }),
      }),
      detail: {
        tags: ['Positions', 'Risk'],
        summary: 'Update trailing stop',
        description: 'Update trailing stop based on current price movement',
      },
    }
  )

  // ============================================================================
  // ALERTS
  // ============================================================================

  /**
   * Get Alerts
   * GET /api/v1/positions/alerts
   */
  .get(
    '/alerts',
    async ({ query, user, tenantId }: any) => {
      try {
        const acknowledged = query.acknowledged === 'true' ? true : query.acknowledged === 'false' ? false : undefined;
        const alerts = await positionService.getAlerts(user.id, tenantId, acknowledged);

        return {
          success: true,
          data: alerts,
          count: alerts.length,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to get alerts',
        };
      }
    },
    {
      query: t.Object({
        acknowledged: t.Optional(t.String({ description: 'Filter by acknowledged status (true/false)' })),
      }),
      detail: {
        tags: ['Positions', 'Alerts'],
        summary: 'Get position alerts',
        description: 'Get all position alerts (margin calls, liquidation warnings, etc.)',
      },
    }
  )

  /**
   * Acknowledge Alert
   * POST /api/v1/positions/alerts/:alertId/acknowledge
   */
  .post(
    '/alerts/:alertId/acknowledge',
    async ({ params, user, tenantId: _tenantId }: any) => {
      try {
        await positionService.acknowledgeAlert(params.alertId, user.id);

        return {
          success: true,
          message: 'Alert acknowledged successfully',
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to acknowledge alert',
        };
      }
    },
    {
      params: t.Object({
        alertId: t.String({ description: 'Alert ID' }),
      }),
      detail: {
        tags: ['Positions', 'Alerts'],
        summary: 'Acknowledge alert',
        description: 'Mark an alert as acknowledged',
      },
    }
  )

  // ============================================================================
  // HISTORY
  // ============================================================================

  /**
   * Get Position History
   * GET /api/v1/positions/:id/history
   */
  .get(
    '/:id/history',
    async ({ params, user, tenantId }: any) => {
      try {
        const history = await positionService.getPositionHistory(params.id, user.id, tenantId);

        return {
          success: true,
          data: history,
          count: history.length,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to get position history',
        };
      }
    },
    {
      params: t.Object({
        id: t.String({ description: 'Position ID' }),
      }),
      detail: {
        tags: ['Positions', 'History'],
        summary: 'Get position history',
        description: 'Get complete audit trail of position changes',
      },
    }
  )

  // ============================================================================
  // SUMMARY & STATISTICS
  // ============================================================================

  /**
   * Get Position Summary
   * GET /api/v1/positions/summary
   */
  .get(
    '/summary',
    async ({ user, tenantId }: any) => {
      try {
        const summary = await positionService.getPositionSummary(user.id, tenantId);

        return {
          success: true,
          data: summary,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to get position summary',
        };
      }
    },
    {
      detail: {
        tags: ['Positions', 'Statistics'],
        summary: 'Get position summary',
        description: 'Get aggregated position summary for dashboard',
      },
    }
  )

  /**
   * Update Position Summary
   * POST /api/v1/positions/summary/update
   */
  .post(
    '/summary/update',
    async ({ user, tenantId }: any) => {
      try {
        const summary = await positionService.updatePositionSummary(user.id, tenantId);

        return {
          success: true,
          data: summary,
          message: 'Position summary updated successfully',
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to update position summary',
        };
      }
    },
    {
      detail: {
        tags: ['Positions', 'Statistics'],
        summary: 'Update position summary',
        description: 'Recalculate and update cached position summary',
      },
    }
  )

  /**
   * Get Position Statistics
   * GET /api/v1/positions/statistics
   */
  .get(
    '/statistics',
    async ({ user, tenantId }: any) => {
      try {
        const statistics = await positionService.getPositionStatistics(user.id, tenantId);

        return {
          success: true,
          data: statistics,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || 'Failed to get position statistics',
        };
      }
    },
    {
      detail: {
        tags: ['Positions', 'Statistics'],
        summary: 'Get position statistics',
        description: 'Get detailed trading statistics (win rate, profit factor, etc.)',
      },
    }
  );
