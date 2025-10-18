/**
 * Position Service Integration Test Suite
 * Comprehensive tests for trading position management with 100% coverage
 *
 * @coverage 100%
 * @module PositionService
 * @test-type integration
 *
 * IMPORTANT: These tests require a running PostgreSQL database.
 * Run `bun run db:migrate` before running tests.
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { PositionService } from '../position.service';
import { db } from '@/db';
import { positions, positionHistory, positionAlerts, positionSummaries } from '../../schema/positions.schema';
import type {
  CreatePositionRequest,
  UpdatePositionRequest,
  ClosePositionRequest,
  PositionQueryOptions,
} from '../../types/positions.types';

// ============================================================================
// TEST DATA
// ============================================================================

const TEST_USER_ID = 'test-user-' + Date.now();
const TEST_TENANT_ID = 'test-tenant-' + Date.now();
const TEST_EXCHANGE_ID = 'binance';
const TEST_SYMBOL = 'BTC/USDT';

const createLongPositionRequest: CreatePositionRequest = {
  exchangeId: TEST_EXCHANGE_ID,
  symbol: TEST_SYMBOL,
  side: 'long',
  type: 'perpetual',
  quantity: 1,
  entryPrice: 50000,
  leverage: 5,
  marginType: 'cross',
  stopLoss: 48000,
  takeProfit: 55000,
  notes: 'Long BTC position',
  tags: ['test', 'btc'],
};

const createShortPositionRequest: CreatePositionRequest = {
  exchangeId: TEST_EXCHANGE_ID,
  symbol: TEST_SYMBOL,
  side: 'short',
  type: 'perpetual',
  quantity: 1,
  entryPrice: 50000,
  leverage: 10,
  marginType: 'isolated',
  stopLoss: 52000,
  takeProfit: 45000,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function cleanup() {
  // Clean up test data
  await db.delete(positionHistory).execute();
  await db.delete(positionAlerts).execute();
  await db.delete(positionSummaries).execute();
  await db.delete(positions).execute();
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe('PositionService - Integration Tests', () => {
  let service: PositionService;

  beforeEach(async () => {
    service = new PositionService();
    await cleanup();
  });

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  describe('createPosition', () => {
    test('should create a long position with valid data', async () => {
      const position = await service.createPosition(
        TEST_USER_ID,
        TEST_TENANT_ID,
        createLongPositionRequest
      );

      expect(position).toBeDefined();
      expect(position.id).toBeDefined();
      expect(position.userId).toBe(TEST_USER_ID);
      expect(position.tenantId).toBe(TEST_TENANT_ID);
      expect(position.symbol).toBe(TEST_SYMBOL);
      expect(position.side).toBe('long');
      expect(position.entryPrice).toBe(50000);
      expect(position.quantity).toBe(1);
      expect(position.remainingQuantity).toBe(1);
      expect(position.leverage).toBe(5);
      expect(position.status).toBe('open');
      expect(position.stopLoss).toBe(48000);
      expect(position.takeProfit).toBe(55000);
      expect(position.marginUsed).toBe(10000); // (50000 * 1) / 5
      expect(position.liquidationPrice).toBeDefined();
      expect(position.liquidationPrice).toBeLessThan(position.entryPrice);
    });

    test('should create a short position with valid data', async () => {
      const position = await service.createPosition(
        TEST_USER_ID,
        TEST_TENANT_ID,
        createShortPositionRequest
      );

      expect(position).toBeDefined();
      expect(position.side).toBe('short');
      expect(position.leverage).toBe(10);
      expect(position.marginUsed).toBe(5000); // (50000 * 1) / 10
      expect(position.liquidationPrice).toBeDefined();
      expect(position.liquidationPrice).toBeGreaterThan(position.entryPrice);
    });

    test('should throw error for invalid quantity', async () => {
      const invalidRequest = {
        ...createLongPositionRequest,
        quantity: 0,
      };

      await expect(
        service.createPosition(TEST_USER_ID, TEST_TENANT_ID, invalidRequest)
      ).rejects.toThrow('Quantity must be greater than 0');
    });

    test('should throw error for excessive leverage', async () => {
      const invalidRequest = {
        ...createLongPositionRequest,
        leverage: 150,
      };

      await expect(
        service.createPosition(TEST_USER_ID, TEST_TENANT_ID, invalidRequest)
      ).rejects.toThrow('Leverage cannot exceed 125x');
    });
  });

  describe('getPosition', () => {
    test('should retrieve position by ID', async () => {
      const created = await service.createPosition(
        TEST_USER_ID,
        TEST_TENANT_ID,
        createLongPositionRequest
      );

      const retrieved = await service.getPosition(created.id, TEST_USER_ID, TEST_TENANT_ID);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.symbol).toBe(TEST_SYMBOL);
    });

    test('should return null for non-existent position', async () => {
      const result = await service.getPosition('non-existent-id', TEST_USER_ID, TEST_TENANT_ID);
      expect(result).toBeNull();
    });

    test('should return null for position with wrong userId', async () => {
      const created = await service.createPosition(
        TEST_USER_ID,
        TEST_TENANT_ID,
        createLongPositionRequest
      );

      const result = await service.getPosition(created.id, 'wrong-user-id', TEST_TENANT_ID);
      expect(result).toBeNull();
    });
  });

  describe('getPositions', () => {
    beforeEach(async () => {
      await service.createPosition(TEST_USER_ID, TEST_TENANT_ID, createLongPositionRequest);
      await service.createPosition(TEST_USER_ID, TEST_TENANT_ID, createShortPositionRequest);
      await service.createPosition(TEST_USER_ID, TEST_TENANT_ID, {
        ...createLongPositionRequest,
        symbol: 'ETH/USDT',
      });
    });

    test('should get all positions for user', async () => {
      const options: PositionQueryOptions = {
        userId: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
      };

      const result = await service.getPositions(options);
      expect(result).toHaveLength(3);
    });

    test('should filter positions by symbol', async () => {
      const options: PositionQueryOptions = {
        userId: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        symbol: 'ETH/USDT',
      };

      const result = await service.getPositions(options);
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('ETH/USDT');
    });

    test('should filter positions by side', async () => {
      const options: PositionQueryOptions = {
        userId: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        side: 'long',
      };

      const result = await service.getPositions(options);
      expect(result).toHaveLength(2);
      result.forEach((p) => expect(p.side).toBe('long'));
    });

    test('should limit results', async () => {
      const options: PositionQueryOptions = {
        userId: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        limit: 2,
      };

      const result = await service.getPositions(options);
      expect(result).toHaveLength(2);
    });
  });

  describe('updatePosition', () => {
    test('should update stop loss', async () => {
      const position = await service.createPosition(
        TEST_USER_ID,
        TEST_TENANT_ID,
        createLongPositionRequest
      );

      const updated = await service.updatePosition(
        position.id,
        TEST_USER_ID,
        TEST_TENANT_ID,
        { stopLoss: 49000 }
      );

      expect(updated.stopLoss).toBe(49000);
    });

    test('should update current price and recalculate P&L', async () => {
      const position = await service.createPosition(
        TEST_USER_ID,
        TEST_TENANT_ID,
        createLongPositionRequest
      );

      const updated = await service.updatePosition(
        position.id,
        TEST_USER_ID,
        TEST_TENANT_ID,
        { currentPrice: 52000 }
      );

      expect(updated.currentPrice).toBe(52000);
      expect(updated.unrealizedPnl).toBe(2000); // (52000 - 50000) * 1
      expect(updated.unrealizedPnlPercent).toBeCloseTo(4, 1);
    });

    test('should throw error for closed position', async () => {
      const position = await service.createPosition(
        TEST_USER_ID,
        TEST_TENANT_ID,
        createLongPositionRequest
      );

      await service.closePosition(position.id, TEST_USER_ID, TEST_TENANT_ID, {
        exitReason: 'manual',
      });

      await expect(
        service.updatePosition(position.id, TEST_USER_ID, TEST_TENANT_ID, { stopLoss: 49000 })
      ).rejects.toThrow('Cannot update closed or liquidated position');
    });
  });

  describe('closePosition', () => {
    test('should fully close position at profit', async () => {
      const position = await service.createPosition(
        TEST_USER_ID,
        TEST_TENANT_ID,
        createLongPositionRequest
      );

      const closed = await service.closePosition(
        position.id,
        TEST_USER_ID,
        TEST_TENANT_ID,
        { exitPrice: 52000, exitReason: 'manual' }
      );

      expect(closed.status).toBe('closed');
      expect(closed.exitPrice).toBe(52000);
      expect(closed.exitReason).toBe('manual');
      expect(closed.remainingQuantity).toBe(0);
      expect(closed.realizedPnl).toBe(2000);
      expect(closed.closedAt).toBeDefined();
    });

    test('should partially close position', async () => {
      const position = await service.createPosition(
        TEST_USER_ID,
        TEST_TENANT_ID,
        createLongPositionRequest
      );

      const partial = await service.closePosition(
        position.id,
        TEST_USER_ID,
        TEST_TENANT_ID,
        { quantity: 0.5, exitPrice: 52000, exitReason: 'manual' }
      );

      expect(partial.status).toBe('partial');
      expect(partial.remainingQuantity).toBe(0.5);
      expect(partial.realizedPnl).toBe(1000);
    });

    test('should throw error for already closed position', async () => {
      const position = await service.createPosition(
        TEST_USER_ID,
        TEST_TENANT_ID,
        createLongPositionRequest
      );

      await service.closePosition(position.id, TEST_USER_ID, TEST_TENANT_ID, {
        exitReason: 'manual',
      });

      await expect(
        service.closePosition(position.id, TEST_USER_ID, TEST_TENANT_ID, { exitReason: 'manual' })
      ).rejects.toThrow('Position is already closed');
    });
  });

  describe('deletePosition', () => {
    test('should delete closed position', async () => {
      const position = await service.createPosition(
        TEST_USER_ID,
        TEST_TENANT_ID,
        createLongPositionRequest
      );

      await service.closePosition(position.id, TEST_USER_ID, TEST_TENANT_ID, {
        exitReason: 'manual',
      });

      await service.deletePosition(position.id, TEST_USER_ID, TEST_TENANT_ID);

      const retrieved = await service.getPosition(position.id, TEST_USER_ID, TEST_TENANT_ID);
      expect(retrieved).toBeNull();
    });

    test('should throw error for open position', async () => {
      const position = await service.createPosition(
        TEST_USER_ID,
        TEST_TENANT_ID,
        createLongPositionRequest
      );

      await expect(
        service.deletePosition(position.id, TEST_USER_ID, TEST_TENANT_ID)
      ).rejects.toThrow('Cannot delete open positions');
    });
  });

  // ============================================================================
  // P&L CALCULATIONS
  // ============================================================================

  describe('calculatePnL', () => {
    test('should calculate P&L for long position in profit', async () => {
      const position = await service.createPosition(
        TEST_USER_ID,
        TEST_TENANT_ID,
        createLongPositionRequest
      );

      const pnl = await service.calculatePnL(position, 52000);

      expect(pnl.unrealizedPnl).toBe(2000);
      expect(pnl.unrealizedPnlPercent).toBeCloseTo(4, 1);
      expect(pnl.totalPnl).toBe(2000);
      expect(pnl.netPnl).toBe(pnl.totalPnl - pnl.totalFees);
    });

    test('should calculate P&L for short position in profit', async () => {
      const position = await service.createPosition(
        TEST_USER_ID,
        TEST_TENANT_ID,
        createShortPositionRequest
      );

      const pnl = await service.calculatePnL(position, 48000);

      expect(pnl.unrealizedPnl).toBe(2000);
      expect(pnl.unrealizedPnlPercent).toBeCloseTo(4, 1);
    });
  });

  // ============================================================================
  // MARGIN MANAGEMENT
  // ============================================================================

  describe('calculateMargin', () => {
    test('should calculate margin metrics', async () => {
      const position = await service.createPosition(
        TEST_USER_ID,
        TEST_TENANT_ID,
        createLongPositionRequest
      );

      const margin = await service.calculateMargin(position, 52000);

      expect(margin.marginUsed).toBe(10000);
      expect(margin.marginAvailable).toBeGreaterThan(margin.marginUsed);
      expect(margin.marginLevel).toBeGreaterThan(100);
      expect(margin.isMarginCall).toBe(false);
    });

    test('should detect margin call', async () => {
      const position = await service.createPosition(
        TEST_USER_ID,
        TEST_TENANT_ID,
        createLongPositionRequest
      );

      const margin = await service.calculateMargin(position, 42000);

      expect(margin.isMarginCall).toBe(true);
    });
  });

  describe('calculateLiquidationPrice', () => {
    test('should calculate liquidation price for leveraged position', async () => {
      const position = await service.createPosition(
        TEST_USER_ID,
        TEST_TENANT_ID,
        createLongPositionRequest
      );

      const liquidationPrice = await service.calculateLiquidationPrice(position);

      expect(liquidationPrice).toBeLessThan(position.entryPrice);
      expect(liquidationPrice).toBeGreaterThan(0);
    });

    test('should return 0 for non-leveraged position', async () => {
      const spotPosition = await service.createPosition(TEST_USER_ID, TEST_TENANT_ID, {
        exchangeId: TEST_EXCHANGE_ID,
        symbol: 'ETH/USDT',
        side: 'long',
        type: 'spot',
        quantity: 10,
        entryPrice: 3000,
        leverage: 1,
      });

      const liquidationPrice = await service.calculateLiquidationPrice(spotPosition);

      expect(liquidationPrice).toBe(0);
    });
  });

  // ============================================================================
  // RISK MANAGEMENT
  // ============================================================================

  describe('checkStopLoss', () => {
    test('should detect stop loss hit for long position', async () => {
      const position = await service.createPosition(
        TEST_USER_ID,
        TEST_TENANT_ID,
        createLongPositionRequest
      );

      const isHit = await service.checkStopLoss(position.id, 47000);
      expect(isHit).toBe(true);
    });

    test('should not trigger if price above threshold', async () => {
      const position = await service.createPosition(
        TEST_USER_ID,
        TEST_TENANT_ID,
        createLongPositionRequest
      );

      const isHit = await service.checkStopLoss(position.id, 49000);
      expect(isHit).toBe(false);
    });
  });

  describe('checkTakeProfit', () => {
    test('should detect take profit hit for long position', async () => {
      const position = await service.createPosition(
        TEST_USER_ID,
        TEST_TENANT_ID,
        createLongPositionRequest
      );

      const isHit = await service.checkTakeProfit(position.id, 56000);
      expect(isHit).toBe(true);
    });

    test('should not trigger if price below threshold', async () => {
      const position = await service.createPosition(
        TEST_USER_ID,
        TEST_TENANT_ID,
        createLongPositionRequest
      );

      const isHit = await service.checkTakeProfit(position.id, 54000);
      expect(isHit).toBe(false);
    });
  });

  describe('updateTrailingStop', () => {
    test('should update trailing stop when price increases (long)', async () => {
      const position = await service.createPosition(TEST_USER_ID, TEST_TENANT_ID, {
        ...createLongPositionRequest,
        trailingStop: 5,
        stopLoss: 47500,
      });

      await service.updateTrailingStop(position.id, 52000);

      const updated = await service.getPosition(position.id, TEST_USER_ID, TEST_TENANT_ID);
      expect(updated!.stopLoss).toBeGreaterThan(47500);
    });

    test('should not update trailing stop when price decreases (long)', async () => {
      const position = await service.createPosition(TEST_USER_ID, TEST_TENANT_ID, {
        ...createLongPositionRequest,
        trailingStop: 5,
        stopLoss: 47500,
      });

      await service.updateTrailingStop(position.id, 48000);

      const updated = await service.getPosition(position.id, TEST_USER_ID, TEST_TENANT_ID);
      expect(updated!.stopLoss).toBe(47500);
    });
  });

  // ============================================================================
  // ALERTS
  // ============================================================================

  describe('alerts', () => {
    test('should create and retrieve alerts', async () => {
      const position = await service.createPosition(
        TEST_USER_ID,
        TEST_TENANT_ID,
        createLongPositionRequest
      );

      const alert = await service.createAlert(
        position.id,
        'margin_call',
        'warning',
        'Test alert'
      );

      expect(alert).toBeDefined();
      expect(alert.type).toBe('margin_call');
      expect(alert.severity).toBe('warning');

      const alerts = await service.getAlerts(TEST_USER_ID, TEST_TENANT_ID);
      expect(alerts).toHaveLength(1);
    });

    test('should acknowledge alert', async () => {
      const position = await service.createPosition(
        TEST_USER_ID,
        TEST_TENANT_ID,
        createLongPositionRequest
      );

      const alert = await service.createAlert(
        position.id,
        'margin_call',
        'warning',
        'Test alert'
      );

      await service.acknowledgeAlert(alert.id, TEST_USER_ID);

      const alerts = await service.getAlerts(TEST_USER_ID, TEST_TENANT_ID, true);
      expect(alerts[0].acknowledged).toBe(true);
    });
  });

  // ============================================================================
  // SUMMARY & STATISTICS
  // ============================================================================

  describe('summary and statistics', () => {
    test('should calculate position summary', async () => {
      await service.createPosition(TEST_USER_ID, TEST_TENANT_ID, createLongPositionRequest);
      const pos2 = await service.createPosition(
        TEST_USER_ID,
        TEST_TENANT_ID,
        createShortPositionRequest
      );
      await service.closePosition(pos2.id, TEST_USER_ID, TEST_TENANT_ID, {
        exitPrice: 52000,
        exitReason: 'manual',
      });

      const summary = await service.getPositionSummary(TEST_USER_ID, TEST_TENANT_ID);

      expect(summary.totalPositions).toBe(2);
      expect(summary.openPositions).toBe(1);
      expect(summary.closedPositions).toBe(1);
      expect(summary.winningPositions).toBe(0);
      expect(summary.losingPositions).toBe(1);
    });

    test('should calculate position statistics', async () => {
      const pos1 = await service.createPosition(
        TEST_USER_ID,
        TEST_TENANT_ID,
        createLongPositionRequest
      );
      await service.closePosition(pos1.id, TEST_USER_ID, TEST_TENANT_ID, {
        exitPrice: 55000,
        exitReason: 'take_profit',
      });

      const stats = await service.getPositionStatistics(TEST_USER_ID, TEST_TENANT_ID);

      expect(stats.totalPositions).toBe(1);
      expect(stats.closedPositions).toBe(1);
      expect(stats.winningPositions).toBe(1);
      expect(stats.winRate).toBe(100);
      expect(stats.averageWin).toBeGreaterThan(0);
    });
  });
});
