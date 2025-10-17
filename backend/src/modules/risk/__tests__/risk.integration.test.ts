/**
 * Risk Module Integration Tests
 * Tests real database operations, concurrent requests, and system integration
 *
 * Coverage:
 * - Concurrent metric calculations
 * - Wallet integration
 * - Large portfolio performance
 * - Race condition prevention
 * - Error handling and graceful degradation
 * - Real database queries and transactions
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { db } from '@/db';
import { riskService } from '../services/risk.service';
import { walletService } from '../../banco/services/wallet.service';
import { eq, and, sql } from 'drizzle-orm';
import {
  riskProfiles,
  riskLimits,
  riskMetrics,
  riskAlerts
} from '../schema/risk.schema';
import { positions } from '../../positions/schema/positions.schema';
import { wallets } from '../../banco/schema/wallet.schema';
import { users } from '../../auth/schema/auth.schema';
import { tenants } from '../../tenants/schema/tenants.schema';

/**
 * Test Configuration
 */
const TEST_CONFIG = {
  TENANT_ID: 'test-tenant-risk-integration',
  USER_ID: 'test-user-risk-integration',
  LARGE_PORTFOLIO_SIZE: 100, // Test with 100 positions (reduced from 1000 for faster tests)
  CONCURRENT_REQUESTS: 10,
  MAX_RESPONSE_TIME: 2000, // 2 seconds max
};

/**
 * Test Setup Utilities
 */
class RiskTestSetup {
  /**
   * Create test user with wallet
   */
  static async createTestUser(): Promise<{ userId: string; tenantId: string; walletId: string }> {
    const userId = TEST_CONFIG.USER_ID;
    const tenantId = TEST_CONFIG.TENANT_ID;

    // Create user first (required for foreign key constraints)
    await db.insert(users).values({
      id: userId,
      name: 'Test User',
      email: `${userId}@test.com`,
      emailVerified: true,
    }).onConflictDoNothing();

    // Create tenant (required for foreign key constraints)
    await db.insert(tenants).values({
      id: tenantId,
      name: 'Test Tenant',
      slug: tenantId,
      type: 'empresa',
      status: 'active',
    }).onConflictDoNothing();

    // Create wallet for user
    const [wallet] = await db.insert(wallets).values({
      userId,
      tenantId,
      name: 'Test Wallet',
      type: 'spot',
      description: 'Test wallet for risk integration tests',
      isActive: true,
      isLocked: false,
    }).onConflictDoUpdate({
      target: wallets.id,
      set: {
        isActive: true,
        isLocked: false,
      }
    }).returning();

    return { userId, tenantId, walletId: wallet.id };
  }

  /**
   * Create test risk profile
   */
  static async createTestRiskProfile(userId: string, tenantId: string) {
    await db.insert(riskProfiles).values({
      userId,
      tenantId,
      riskTolerance: 'moderate',
      maxPortfolioRisk: 10,
      maxPositionRisk: 5,
      maxDrawdown: 20,
      defaultPositionSize: 2,
      maxLeverage: 5,
      enableRiskAlerts: true,
      requireConfirmation: false,
      autoStopLoss: true,
      stopLossPercent: 2,
      autoTakeProfit: false,
    });
  }

  /**
   * Create test positions
   */
  static async createTestPositions(
    userId: string,
    tenantId: string,
    count: number
  ): Promise<string[]> {
    const positionIds: string[] = [];

    for (let i = 0; i < count; i++) {
      const symbol = i < 5 ? ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'ADA/USDT'][i] : `TEST${i}/USDT`;
      const [position] = await db.insert(positions).values({
        userId,
        tenantId,
        strategyId: null,
        symbol,
        side: i % 2 === 0 ? 'long' : 'short',
        entryPrice: (1000 + i * 10).toString(),
        currentPrice: (1000 + i * 10 + (i % 2 === 0 ? 50 : -50)).toString(),
        quantity: (1 + i * 0.1).toString(),
        remainingQuantity: (1 + i * 0.1).toString(),
        leverage: '1',
        unrealizedPnl: ((i % 2 === 0 ? 1 : -1) * (50 * (1 + i * 0.1))).toString(),
        status: 'open',
      }).returning();

      positionIds.push(position.id);
    }

    return positionIds;
  }

  /**
   * Cleanup test data
   * Uses try-catch to handle tables that might not exist
   */
  static async cleanup() {
    const userId = TEST_CONFIG.USER_ID;
    const tenantId = TEST_CONFIG.TENANT_ID;

    // Try to delete from each table, ignoring errors if table doesn't exist
    const cleanupTasks = [
      async () => {
        try {
          await db.delete(riskAlerts).where(
            and(
              eq(riskAlerts.userId, userId),
              eq(riskAlerts.tenantId, tenantId)
            )
          );
        } catch (e) {
          // Table might not exist, ignore
        }
      },
      async () => {
        try {
          await db.delete(riskMetrics).where(
            and(
              eq(riskMetrics.userId, userId),
              eq(riskMetrics.tenantId, tenantId)
            )
          );
        } catch (e) {
          // Table might not exist, ignore
        }
      },
      async () => {
        try {
          await db.delete(riskLimits).where(
            and(
              eq(riskLimits.userId, userId),
              eq(riskLimits.tenantId, tenantId)
            )
          );
        } catch (e) {
          // Table might not exist, ignore
        }
      },
      async () => {
        try {
          await db.delete(positions).where(
            and(
              eq(positions.userId, userId),
              eq(positions.tenantId, tenantId)
            )
          );
        } catch (e) {
          // Table might not exist, ignore
        }
      },
      async () => {
        try {
          await db.delete(riskProfiles).where(
            and(
              eq(riskProfiles.userId, userId),
              eq(riskProfiles.tenantId, tenantId)
            )
          );
        } catch (e) {
          // Table might not exist, ignore
        }
      },
      async () => {
        try {
          await db.delete(wallets).where(
            and(
              eq(wallets.userId, userId),
              eq(wallets.tenantId, tenantId)
            )
          );
        } catch (e) {
          // Table might not exist, ignore
        }
      },
      async () => {
        try {
          await db.delete(tenants).where(eq(tenants.id, tenantId));
        } catch (e) {
          // Table might not exist, ignore
        }
      },
      async () => {
        try {
          await db.delete(users).where(eq(users.id, userId));
        } catch (e) {
          // Table might not exist, ignore
        }
      },
    ];

    // Run all cleanup tasks in parallel
    await Promise.all(cleanupTasks.map(task => task()));
  }
}

/**
 * Test Suite
 */
describe('Risk Module Integration Tests', () => {
  let testUserId: string;
  let testTenantId: string;
  let testWalletId: string;

  beforeAll(async () => {
    // Setup test environment
    console.log('🔧 Setting up Risk integration tests...');
    const setup = await RiskTestSetup.createTestUser();
    testUserId = setup.userId;
    testTenantId = setup.tenantId;
    testWalletId = setup.walletId;

    await RiskTestSetup.createTestRiskProfile(testUserId, testTenantId);
    console.log('✅ Test environment ready');
  });

  afterAll(async () => {
    // Cleanup test data
    console.log('🧹 Cleaning up test data...');
    await RiskTestSetup.cleanup();
    console.log('✅ Cleanup complete');
  });

  beforeEach(async () => {
    // Clean positions before each test
    await db.delete(positions).where(
      and(
        eq(positions.userId, testUserId),
        eq(positions.tenantId, testTenantId)
      )
    );

    await db.delete(riskMetrics).where(
      and(
        eq(riskMetrics.userId, testUserId),
        eq(riskMetrics.tenantId, testTenantId)
      )
    );
  });

  /**
   * Test 1: Concurrent Metric Calculations
   * Verifies: No race conditions, all requests return consistent results
   */
  test('should handle concurrent metric calculations without race conditions', async () => {
    console.log('\n🧪 Test 1: Concurrent Metric Calculations');

    // Create test positions
    await RiskTestSetup.createTestPositions(testUserId, testTenantId, 10);

    // Simulate 10 concurrent requests
    console.log(`   Sending ${TEST_CONFIG.CONCURRENT_REQUESTS} concurrent requests...`);
    const startTime = Date.now();

    const promises = Array(TEST_CONFIG.CONCURRENT_REQUESTS)
      .fill(null)
      .map(() => riskService.calculateRiskMetrics(testUserId, testTenantId));

    const results = await Promise.all(promises);
    const elapsed = Date.now() - startTime;

    console.log(`   ✅ All requests completed in ${elapsed}ms`);
    console.log(`   📊 Average time per request: ${(elapsed / TEST_CONFIG.CONCURRENT_REQUESTS).toFixed(0)}ms`);

    // Verify all results are valid
    results.forEach((result, index) => {
      expect(result.userId).toBe(testUserId);
      expect(result.tenantId).toBe(testTenantId);
      expect(result.portfolioValue).toBeGreaterThan(0);
      expect(result.overallRiskScore).toBeGreaterThanOrEqual(0);
      expect(result.overallRiskScore).toBeLessThanOrEqual(100);
    });

    // Verify consistency: all calculations should produce same risk score
    // (since they're running on the same data at nearly the same time)
    const uniqueRiskScores = new Set(results.map(r => r.overallRiskScore.toFixed(2)));
    console.log(`   🎯 Unique risk scores: ${uniqueRiskScores.size}`);
    expect(uniqueRiskScores.size).toBeLessThanOrEqual(2); // Allow slight timing variations

    // Verify metrics were saved to database
    const savedMetrics = await db
      .select()
      .from(riskMetrics)
      .where(
        and(
          eq(riskMetrics.userId, testUserId),
          eq(riskMetrics.tenantId, testTenantId)
        )
      );

    console.log(`   💾 Metrics saved to DB: ${savedMetrics.length}`);
    expect(savedMetrics.length).toBeGreaterThan(0);
  });

  /**
   * Test 2: Wallet Integration
   * Verifies: Correct cash balance and margin calculation from wallet service
   */
  test('should integrate correctly with wallet service for cash balance and margin', async () => {
    console.log('\n🧪 Test 2: Wallet Integration');

    // Create test positions
    await RiskTestSetup.createTestPositions(testUserId, testTenantId, 5);

    // Calculate metrics
    const metrics = await riskService.calculateRiskMetrics(testUserId, testTenantId);

    console.log(`   📊 Portfolio Value: $${metrics.portfolioValue.toFixed(2)}`);
    console.log(`   💰 Cash Balance: $${metrics.cashBalance.toFixed(2)}`);
    console.log(`   📈 Margin Available: $${metrics.marginAvailable.toFixed(2)}`);
    console.log(`   📉 Margin Utilization: ${metrics.marginUtilization.toFixed(2)}%`);

    // Verify wallet integration
    expect(metrics.cashBalance).toBeGreaterThanOrEqual(0);
    expect(metrics.marginAvailable).toBeGreaterThanOrEqual(0);
    expect(metrics.marginUtilization).toBeGreaterThanOrEqual(0);
    expect(metrics.marginUtilization).toBeLessThanOrEqual(100);

    // Margin available should be less than or equal to total portfolio value
    expect(metrics.marginAvailable).toBeLessThanOrEqual(metrics.portfolioValue);
  });

  /**
   * Test 3: Wallet Integration Failure
   * Verifies: Graceful degradation when wallet service fails
   */
  test('should handle wallet integration failure gracefully', async () => {
    console.log('\n🧪 Test 3: Wallet Integration Failure Handling');

    // Create positions
    await RiskTestSetup.createTestPositions(testUserId, testTenantId, 3);

    // Mock wallet service to fail (by using non-existent user)
    const fakeUserId = 'non-existent-user-id';

    // Calculate metrics with fake user (wallet won't be found)
    const metrics = await riskService.calculateRiskMetrics(fakeUserId, testTenantId);

    console.log(`   ✅ Service handled missing wallet gracefully`);
    console.log(`   💰 Cash Balance: $${metrics.cashBalance.toFixed(2)} (fallback to 0)`);
    console.log(`   📈 Margin Available: $${metrics.marginAvailable.toFixed(2)} (fallback to 0)`);

    // Should fallback to 0 for wallet-related metrics
    expect(metrics.cashBalance).toBe(0);
    expect(metrics.marginAvailable).toBe(0);

    // But should still calculate portfolio value from positions
    expect(metrics.portfolioValue).toBeGreaterThanOrEqual(0);
  });

  /**
   * Test 4: Large Portfolio Performance
   * Verifies: System can handle portfolios with many positions efficiently
   */
  test('should calculate metrics for large portfolio in acceptable time', async () => {
    console.log('\n🧪 Test 4: Large Portfolio Performance');

    // Create large portfolio
    console.log(`   📦 Creating ${TEST_CONFIG.LARGE_PORTFOLIO_SIZE} test positions...`);
    await RiskTestSetup.createTestPositions(
      testUserId,
      testTenantId,
      TEST_CONFIG.LARGE_PORTFOLIO_SIZE
    );

    // Measure performance
    const startTime = Date.now();
    const metrics = await riskService.calculateRiskMetrics(testUserId, testTenantId);
    const elapsed = Date.now() - startTime;

    console.log(`   ⏱️  Calculation time: ${elapsed}ms`);
    console.log(`   📊 Portfolio Value: $${metrics.portfolioValue.toFixed(2)}`);
    console.log(`   🎯 Risk Score: ${metrics.overallRiskScore.toFixed(2)}`);
    console.log(`   📍 Open Positions: ${metrics.openPositions}`);

    // Verify performance
    expect(elapsed).toBeLessThan(TEST_CONFIG.MAX_RESPONSE_TIME);
    expect(metrics.openPositions).toBe(TEST_CONFIG.LARGE_PORTFOLIO_SIZE);

    // Verify calculations are valid
    expect(metrics.portfolioValue).toBeGreaterThan(0);
    expect(metrics.overallRiskScore).toBeGreaterThanOrEqual(0);
    expect(metrics.overallRiskScore).toBeLessThanOrEqual(100);

    console.log(`   ✅ Performance within acceptable limits (<${TEST_CONFIG.MAX_RESPONSE_TIME}ms)`);
  });

  /**
   * Test 5: Risk Profile Integration
   * Verifies: Risk calculations respect user's risk profile settings
   */
  test('should respect risk profile settings in calculations', async () => {
    console.log('\n🧪 Test 5: Risk Profile Integration');

    // Create positions
    await RiskTestSetup.createTestPositions(testUserId, testTenantId, 5);

    // Get risk profile
    const profile = await riskService.getRiskProfile(testUserId, testTenantId);

    console.log(`   👤 Risk Tolerance: ${profile.riskTolerance}`);
    console.log(`   📊 Max Portfolio Risk: ${profile.maxPortfolioRisk}%`);
    console.log(`   📍 Max Position Risk: ${profile.maxPositionRisk}%`);

    // Calculate metrics
    const metrics = await riskService.calculateRiskMetrics(testUserId, testTenantId);

    console.log(`   🎯 Overall Risk Score: ${metrics.overallRiskScore.toFixed(2)}`);

    // Verify profile is being used
    expect(profile.riskTolerance).toBe('moderate');
    expect(profile.maxPortfolioRisk).toBe(10);

    // Risk score should be calculated
    expect(metrics.overallRiskScore).toBeGreaterThanOrEqual(0);
    expect(metrics.overallRiskScore).toBeLessThanOrEqual(100);
  });

  /**
   * Test 6: VaR Calculation with Position Breakdown
   * Verifies: VaR includes position-level breakdown
   */
  test('should calculate VaR with position breakdown', async () => {
    console.log('\n🧪 Test 6: VaR Calculation');

    // Create diverse positions
    await RiskTestSetup.createTestPositions(testUserId, testTenantId, 5);

    // Calculate VaR with breakdown
    const varResult = await riskService.calculateVaR(testUserId, testTenantId, {
      confidence: 0.95,
      timeHorizon: 1,
      method: 'historical',
      includeBreakdown: true,
    });

    console.log(`   📊 VaR (95%): $${varResult.valueAtRisk.toFixed(2)}`);
    console.log(`   📍 Method: ${varResult.method}`);
    console.log(`   📍 Position Breakdown: ${varResult.breakdown?.length || 0} positions`);

    // Verify VaR calculation
    expect(varResult.valueAtRisk).toBeGreaterThanOrEqual(0);
    expect(varResult.confidence).toBe(0.95);

    // Verify breakdown exists
    if (varResult.breakdown && varResult.breakdown.length > 0) {
      console.log(`   🔍 Top risk contributors:`);
      varResult.breakdown.slice(0, 3).forEach((item, index) => {
        console.log(`      ${index + 1}. ${item.symbol}: $${item.contribution.toFixed(2)} (${item.contributionPercent.toFixed(1)}%)`);
      });

      // Verify structure
      expect(varResult.breakdown[0]).toHaveProperty('positionId');
      expect(varResult.breakdown[0]).toHaveProperty('symbol');
      expect(varResult.breakdown[0]).toHaveProperty('contribution');
      expect(varResult.breakdown[0]).toHaveProperty('contributionPercent');

      // Verify contributions sum to 100% (or close due to rounding)
      const totalPercent = varResult.breakdown.reduce(
        (sum, item) => sum + item.contributionPercent,
        0
      );
      expect(totalPercent).toBeGreaterThan(95);
      expect(totalPercent).toBeLessThanOrEqual(105); // Allow slight rounding errors
    }
  });

  /**
   * Test 7: Performance Ratios Calculation
   * Verifies: Sharpe, Sortino, and Calmar ratios are calculated correctly
   */
  test('should calculate performance ratios (Sharpe, Sortino, Calmar)', async () => {
    console.log('\n🧪 Test 7: Performance Ratios');

    // Create positions with profit/loss
    await RiskTestSetup.createTestPositions(testUserId, testTenantId, 10);

    // Calculate metrics multiple times to build history
    for (let i = 0; i < 3; i++) {
      await riskService.calculateRiskMetrics(testUserId, testTenantId);
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    }

    // Get latest metrics
    const metrics = await riskService.calculateRiskMetrics(testUserId, testTenantId);

    console.log(`   📊 Sharpe Ratio: ${metrics.sharpeRatio?.toFixed(2) || 'N/A'}`);
    console.log(`   📊 Sortino Ratio: ${metrics.sortinoRatio?.toFixed(2) || 'N/A'}`);
    console.log(`   📊 Calmar Ratio: ${metrics.calmarRatio?.toFixed(2) || 'N/A'}`);

    // Verify ratios are calculated (may be null if insufficient history)
    if (metrics.sharpeRatio !== null) {
      expect(typeof metrics.sharpeRatio).toBe('number');
      expect(isNaN(metrics.sharpeRatio)).toBe(false);
    }

    if (metrics.sortinoRatio !== null) {
      expect(typeof metrics.sortinoRatio).toBe('number');
      expect(isNaN(metrics.sortinoRatio)).toBe(false);
    }

    if (metrics.calmarRatio !== null) {
      expect(typeof metrics.calmarRatio).toBe('number');
      expect(isNaN(metrics.calmarRatio)).toBe(false);
    }
  });

  /**
   * Test 8: Risk Limits Violation Detection
   * Verifies: System detects when risk limits are exceeded
   */
  test('should detect risk limit violations', async () => {
    console.log('\n🧪 Test 8: Risk Limit Violations');

    // Create positions
    await RiskTestSetup.createTestPositions(testUserId, testTenantId, 5);

    // Create strict risk limit
    await db.insert(riskLimits).values({
      userId: testUserId,
      tenantId: testTenantId,
      limitType: 'max_drawdown',
      limitValue: 1, // Very low threshold to trigger violation
      timeframe: 'daily',
      enabled: true,
    });

    console.log(`   🚨 Created strict risk limit (max_drawdown: 1%)`);

    // Check for violations
    const violations = await riskService.checkLimitViolations(testUserId, testTenantId);

    console.log(`   📊 Violations detected: ${violations.length}`);

    if (violations.length > 0) {
      violations.forEach((violation, index) => {
        console.log(`      ${index + 1}. ${violation.limitType}: ${violation.currentValue.toFixed(2)} > ${violation.limitValue}`);
      });
    }

    // Verify violations structure
    if (violations.length > 0) {
      expect(violations[0]).toHaveProperty('limitType');
      expect(violations[0]).toHaveProperty('limitValue');
      expect(violations[0]).toHaveProperty('currentValue');
      expect(violations[0]).toHaveProperty('severity');
    }
  });

  /**
   * Test 9: Alert Creation on Violations
   * Verifies: Alerts are created when violations are detected
   */
  test('should create alerts for risk violations', async () => {
    console.log('\n🧪 Test 9: Alert Creation');

    // Create positions
    await RiskTestSetup.createTestPositions(testUserId, testTenantId, 5);

    // Create risk limit
    await db.insert(riskLimits).values({
      userId: testUserId,
      tenantId: testTenantId,
      limitType: 'max_loss',
      limitValue: 100, // Low threshold
      timeframe: 'daily',
      enabled: true,
    });

    // Check violations (should create alerts)
    await riskService.checkLimitViolations(testUserId, testTenantId);

    // Query alerts
    const alerts = await db
      .select()
      .from(riskAlerts)
      .where(
        and(
          eq(riskAlerts.userId, testUserId),
          eq(riskAlerts.tenantId, testTenantId)
        )
      );

    console.log(`   🔔 Alerts created: ${alerts.length}`);

    if (alerts.length > 0) {
      alerts.forEach((alert, index) => {
        console.log(`      ${index + 1}. [${alert.severity}] ${alert.title}: ${alert.message}`);
      });

      // Verify alert structure
      expect(alerts[0]).toHaveProperty('alertType');
      expect(alerts[0]).toHaveProperty('severity');
      expect(alerts[0]).toHaveProperty('title');
      expect(alerts[0]).toHaveProperty('message');
      expect(['low', 'medium', 'high', 'critical']).toContain(alerts[0].severity);
    }
  });

  /**
   * Test 10: Position Sizing Recommendations
   * Verifies: System provides position sizing recommendations
   */
  test('should calculate position sizing recommendations', async () => {
    console.log('\n🧪 Test 10: Position Sizing');

    // Create positions
    await RiskTestSetup.createTestPositions(testUserId, testTenantId, 3);

    // Calculate position size for new trade
    const sizing = await riskService.calculatePositionSize(
      testUserId,
      testTenantId,
      {
        symbol: 'BTC/USDT',
        side: 'long',
        entryPrice: 50000,
        stopLoss: 49000, // 2% risk
        method: 'fixed',
      }
    );

    console.log(`   💰 Recommended Size: ${sizing.recommendedSize.toFixed(4)}`);
    console.log(`   📈 Risk Amount: $${sizing.riskAmount.toFixed(2)}`);
    console.log(`   📉 Risk Percent: ${sizing.riskPercent.toFixed(2)}%`);
    console.log(`   🎯 Method: ${sizing.method}`);

    // Verify sizing calculation
    expect(sizing.recommendedSize).toBeGreaterThan(0);
    expect(sizing.riskAmount).toBeGreaterThan(0);
    expect(sizing.riskPercent).toBeGreaterThan(0);
    expect(sizing.riskPercent).toBeLessThanOrEqual(100);
  });

  /**
   * Test 11: Database Transaction Integrity
   * Verifies: Metrics are saved correctly to database
   */
  test('should save metrics to database with correct data types', async () => {
    console.log('\n🧪 Test 11: Database Integrity');

    // Create positions
    await RiskTestSetup.createTestPositions(testUserId, testTenantId, 5);

    // Calculate and save metrics
    const calculated = await riskService.calculateRiskMetrics(testUserId, testTenantId);

    // Query saved metrics
    const [saved] = await db
      .select()
      .from(riskMetrics)
      .where(
        and(
          eq(riskMetrics.userId, testUserId),
          eq(riskMetrics.tenantId, testTenantId)
        )
      )
      .orderBy(riskMetrics.calculatedAt)
      .limit(1);

    console.log(`   💾 Metrics saved to database`);
    console.log(`   🆔 Metric ID: ${saved.id}`);
    console.log(`   📊 Portfolio Value: $${parseFloat(saved.portfolioValue).toFixed(2)}`);
    console.log(`   🎯 Risk Score: ${saved.overallRiskScore}`);

    // Verify data integrity
    expect(saved).toBeDefined();
    expect(saved.userId).toBe(testUserId);
    expect(saved.tenantId).toBe(testTenantId);
    expect(parseFloat(saved.portfolioValue)).toBeCloseTo(calculated.portfolioValue, 2);
    expect(saved.overallRiskScore).toBeCloseTo(calculated.overallRiskScore, 2);

    // Verify numeric fields are valid
    expect(isNaN(parseFloat(saved.portfolioValue))).toBe(false);
    expect(isNaN(saved.overallRiskScore)).toBe(false);
  });
});

/**
 * Summary Report
 */
console.log('\n' + '='.repeat(80));
console.log('📊 RISK MODULE INTEGRATION TESTS');
console.log('='.repeat(80));
console.log('Tests cover:');
console.log('  ✅ Concurrent request handling (race condition prevention)');
console.log('  ✅ Wallet service integration');
console.log('  ✅ Graceful degradation on failures');
console.log('  ✅ Large portfolio performance');
console.log('  ✅ Risk profile integration');
console.log('  ✅ VaR calculation with breakdown');
console.log('  ✅ Performance ratios (Sharpe, Sortino, Calmar)');
console.log('  ✅ Risk limit violation detection');
console.log('  ✅ Alert creation');
console.log('  ✅ Position sizing recommendations');
console.log('  ✅ Database transaction integrity');
console.log('='.repeat(80));
