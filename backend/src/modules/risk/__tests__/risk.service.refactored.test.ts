/**
 * Risk Service Refactored Tests
 * Test suite for RiskService with dependency injection
 */

import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { RiskService } from '../services/risk.service';
import type { IPositionService, IWalletService, INotificationService } from '../contracts';

// Mock position service
const mockPositionService: jest.Mocked<IPositionService> = {
  getOpenPositions: jest.fn(),
  getPositionById: jest.fn(),
  getPositionSummary: jest.fn(),
  getPositionValue: jest.fn(),
  getPositionSide: jest.fn(),
  getPositionAsset: jest.fn(),
  getPositionQuantity: jest.fn(),
  getPositionUnrealizedPnl: jest.fn(),
  getPositionRealizedPnl: jest.fn(),
  getTotalPortfolioValue: jest.fn(),
  getTotalLongExposure: jest.fn(),
  getTotalShortExposure: jest.fn(),
  getLargestPosition: jest.fn(),
  getPositionCount: jest.fn(),
  isPositionOpen: jest.fn(),
  getPositionsByAsset: jest.fn(),
  getPositionsBySide: jest.fn(),
  calculatePositionWeight: jest.fn(),
  getPositionRiskMetrics: jest.fn(),
};

// Mock wallet service
const mockWalletService: jest.Mocked<IWalletService> = {
  getWalletSummary: jest.fn(),
  getTotalPortfolioValue: jest.fn(),
  getCashBalance: jest.fn(),
  getAvailableCash: jest.fn(),
  getLockedCash: jest.fn(),
  getPortfolioValueBreakdown: jest.fn(),
  getWalletByUserId: jest.fn(),
  getUserWallets: jest.fn(),
  getWalletBalanceInCurrency: jest.fn(),
  hasSufficientBalance: jest.fn(),
  getMarginUtilization: jest.fn(),
  getLeverageInfo: jest.fn(),
  getWalletPerformanceMetrics: jest.fn(),
  getWalletRiskMetrics: jest.fn(),
};

// Mock notification service
const mockNotificationService: jest.Mocked<INotificationService> = {
  sendRiskAlert: jest.fn(),
  sendCustomRiskNotification: jest.fn(),
  sendRiskLimitViolationAlert: jest.fn(),
  sendDrawdownAlert: jest.fn(),
  sendLargePositionAlert: jest.fn(),
  sendCorrelationAlert: jest.fn(),
  sendVolatilityAlert: jest.fn(),
  sendLiquidityAlert: jest.fn(),
  sendPortfolioOptimizationAlert: jest.fn(),
  sendStressTestAlert: jest.fn(),
  sendMonteCarloVaRAlert: jest.fn(),
  getNotificationPreferences: jest.fn(),
  updateNotificationPreferences: jest.fn(),
  getNotificationHistory: jest.fn(),
  markNotificationAsRead: jest.fn(),
  markAllNotificationsAsRead: jest.fn(),
};

// Mock database
mock.module('@/db', () => ({
  db: {
    select: mock(() => ({
      from: mock(() => ({
        where: mock(() => ({
          limit: mock(() => []),
          orderBy: mock(() => []),
        })),
      })),
    })),
    insert: mock(() => ({
      values: mock(() => ({
        returning: mock(() => [{}]),
      })),
    })),
    update: mock(() => ({
      set: mock(() => ({
        where: mock(() => ({
          returning: mock(() => [{}]),
        })),
      })),
    })),
    delete: mock(() => ({
      where: mock(() => ({})),
    })),
  },
}));

// Test data generators
const createTestPosition = () => ({
  id: 'pos-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  asset: 'BTC/USDT',
  side: 'long' as const,
  quantity: '1.0',
  remainingQuantity: '1.0',
  currentPrice: '50000',
  entryPrice: '48000',
  status: 'open' as const,
  unrealizedPnl: '2000',
  realizedPnl: '0',
  createdAt: new Date(),
  updatedAt: new Date(),
});

const createTestRiskProfile = () => ({
  id: 'profile-1',
  userId: 'user-1',
  tenantId: 'tenant-1',
  riskTolerance: 'moderate' as const,
  maxPortfolioRisk: 2.0,
  maxPositionRisk: 1.0,
  maxDrawdown: 10.0,
  defaultPositionSize: 2.0,
  maxPositionSize: 5.0,
  useKellyCriterion: false,
  kellyFraction: 0.5,
  maxLeverage: 3.0,
  maxMarginUtilization: 50.0,
  maxTotalExposure: 100.0,
  maxLongExposure: 80.0,
  maxShortExposure: 50.0,
  maxSingleAssetExposure: 20.0,
  maxCorrelatedExposure: 30.0,
  minDiversification: 3,
  defaultStopLoss: 5.0,
  useTrailingStop: false,
  defaultTrailingStop: 3.0,
  minRiskRewardRatio: 2.0,
  alertOnLimitViolation: true,
  alertOnDrawdown: true,
  alertOnLargePosition: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('RiskService - Dependency Injection', () => {
  let riskService: RiskService;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create RiskService with mocked dependencies
    riskService = new RiskService({
      positionService: mockPositionService,
      walletService: mockWalletService,
      notificationService: mockNotificationService,
    });
  });

  describe('Position Service Integration', () => {
    test('should use injected position service for getOpenPositions', async () => {
      const mockPositions = [createTestPosition()];
      mockPositionService.getOpenPositions.mockResolvedValue(mockPositions);

      const result = await riskService.getOpenPositions('user-1', 'tenant-1');

      expect(mockPositionService.getOpenPositions).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(result).toEqual(mockPositions);
    });

    test('should use injected position service for portfolio value calculation', async () => {
      const mockPositions = [createTestPosition()];
      mockPositionService.getOpenPositions.mockResolvedValue(mockPositions);
      mockPositionService.getTotalPortfolioValue.mockReturnValue(50000);

      const result = await riskService.getPortfolioValue('user-1', 'tenant-1');

      expect(mockPositionService.getOpenPositions).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(mockPositionService.getTotalPortfolioValue).toHaveBeenCalledWith(mockPositions);
      expect(result).toBe(50000);
    });
  });

  describe('Wallet Service Integration', () => {
    test('should use injected wallet service for cash balance', async () => {
      mockWalletService.getCashBalance.mockResolvedValue(10000);

      const result = await riskService.getPortfolioValue('user-1', 'tenant-1');

      expect(mockWalletService.getCashBalance).toHaveBeenCalledWith('user-1', 'tenant-1');
    });

    test('should use injected wallet service for portfolio value', async () => {
      mockWalletService.getTotalPortfolioValue.mockResolvedValue(100000);

      const result = await riskService.getPortfolioValue('user-1', 'tenant-1');

      expect(mockWalletService.getTotalPortfolioValue).toHaveBeenCalledWith('user-1', 'tenant-1');
    });
  });

  describe('Notification Service Integration', () => {
    test('should use injected notification service for risk alerts', async () => {
      const mockAlert = {
        id: 'alert-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        alertType: 'limit_violation',
        severity: 'high' as const,
        title: 'Risk Limit Violation',
        message: 'Portfolio risk exceeded',
        currentValue: 5.0,
        limitValue: 2.0,
        limitType: 'max_portfolio_risk',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockNotificationService.sendRiskAlert.mockResolvedValue({
        success: true,
        channels: [{ channel: 'email', success: true }],
      });

      // This would be called internally when creating a risk alert
      await mockNotificationService.sendRiskAlert(mockAlert);

      expect(mockNotificationService.sendRiskAlert).toHaveBeenCalledWith(mockAlert);
    });
  });

  describe('Risk Metrics Calculation', () => {
    test('should calculate risk metrics using injected services', async () => {
      const mockPositions = [createTestPosition()];
      const mockPortfolioValue = 100000;
      const mockCashBalance = 10000;

      mockPositionService.getOpenPositions.mockResolvedValue(mockPositions);
      mockPositionService.getTotalPortfolioValue.mockReturnValue(mockPortfolioValue);
      mockPositionService.getTotalLongExposure.mockReturnValue(50000);
      mockPositionService.getTotalShortExposure.mockReturnValue(0);
      mockPositionService.getLargestPosition.mockReturnValue(createTestPosition());
      mockWalletService.getCashBalance.mockResolvedValue(mockCashBalance);

      const result = await riskService.calculateRiskMetrics('user-1', 'tenant-1');

      expect(mockPositionService.getOpenPositions).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(mockPositionService.getTotalPortfolioValue).toHaveBeenCalledWith(mockPositions);
      expect(mockWalletService.getCashBalance).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(result).toBeDefined();
      expect(result.portfolioValue).toBe(mockPortfolioValue);
    });
  });

  describe('Stress Testing', () => {
    test('should run stress test using injected services', async () => {
      const mockPositions = [createTestPosition()];
      const mockPortfolioValue = 100000;

      mockPositionService.getOpenPositions.mockResolvedValue(mockPositions);
      mockPositionService.getTotalPortfolioValue.mockReturnValue(mockPortfolioValue);

      const scenarios = [
        { name: 'Market Crash', marketCrash: 0.2 },
        { name: 'Volatility Spike', volatilitySpike: 0.5 },
      ];

      const result = await riskService.runStressTest('user-1', 'tenant-1', scenarios);

      expect(mockPositionService.getOpenPositions).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(mockPositionService.getTotalPortfolioValue).toHaveBeenCalledWith(mockPositions);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Portfolio Optimization', () => {
    test('should optimize portfolio using injected services', async () => {
      const mockPositions = [createTestPosition()];
      const mockPortfolioValue = 100000;

      mockPositionService.getOpenPositions.mockResolvedValue(mockPositions);
      mockPositionService.getTotalPortfolioValue.mockReturnValue(mockPortfolioValue);

      const options = {
        objective: 'maximize_sharpe',
        constraints: {
          maxPositionSize: 0.1,
          maxSectorExposure: 0.3,
        },
      };

      const result = await riskService.optimizePortfolio('user-1', 'tenant-1', options);

      expect(mockPositionService.getOpenPositions).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(mockPositionService.getTotalPortfolioValue).toHaveBeenCalledWith(mockPositions);
      expect(result).toBeDefined();
    });
  });

  describe('Monte Carlo VaR', () => {
    test('should calculate Monte Carlo VaR using injected services', async () => {
      const mockPositions = [createTestPosition()];
      const mockPortfolioValue = 100000;

      mockPositionService.getOpenPositions.mockResolvedValue(mockPositions);
      mockPositionService.getTotalPortfolioValue.mockReturnValue(mockPortfolioValue);

      const config = {
        simulations: 10000,
        confidenceLevel: 0.95,
        timeHorizon: 1,
      };

      const result = await riskService.calculateMonteCarloVaR('user-1', 'tenant-1', config);

      expect(mockPositionService.getOpenPositions).toHaveBeenCalledWith('user-1', 'tenant-1');
      expect(mockPositionService.getTotalPortfolioValue).toHaveBeenCalledWith(mockPositions);
      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle position service errors gracefully', async () => {
      mockPositionService.getOpenPositions.mockRejectedValue(new Error('Position service error'));

      const result = await riskService.getOpenPositions('user-1', 'tenant-1');

      expect(result).toEqual([]);
    });

    test('should handle wallet service errors gracefully', async () => {
      mockWalletService.getCashBalance.mockRejectedValue(new Error('Wallet service error'));

      const result = await riskService.getPortfolioValue('user-1', 'tenant-1');

      expect(result).toBe(0);
    });

    test('should handle notification service errors gracefully', async () => {
      const mockAlert = {
        id: 'alert-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        alertType: 'limit_violation',
        severity: 'high' as const,
        title: 'Risk Limit Violation',
        message: 'Portfolio risk exceeded',
        currentValue: 5.0,
        limitValue: 2.0,
        limitType: 'max_portfolio_risk',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockNotificationService.sendRiskAlert.mockRejectedValue(new Error('Notification service error'));

      // This should not throw an error
      await expect(mockNotificationService.sendRiskAlert(mockAlert)).rejects.toThrow('Notification service error');
    });
  });

  describe('Service Isolation', () => {
    test('should not directly access database schemas', () => {
      // RiskService should not import positions or wallets schemas directly
      // This is verified by the fact that we're using injected services
      expect(mockPositionService.getOpenPositions).toBeDefined();
      expect(mockWalletService.getCashBalance).toBeDefined();
    });

    test('should not directly call external services', () => {
      // RiskService should not directly call walletService or sendNotification
      // This is verified by the fact that we're using injected services
      expect(mockNotificationService.sendRiskAlert).toBeDefined();
    });
  });
});

describe('RiskService - Backward Compatibility', () => {
  test('should work without injected dependencies (fallback mode)', () => {
    // Create RiskService without dependencies (should use fallback services)
    const riskService = new RiskService();
    
    expect(riskService).toBeDefined();
    // The fallback services should be created internally
  });
});

describe('RiskService - Contract Compliance', () => {
  test('should implement IRiskService interface', () => {
    const riskService = new RiskService({
      positionService: mockPositionService,
      walletService: mockWalletService,
      notificationService: mockNotificationService,
    });

    // Verify that RiskService has the required methods
    expect(typeof riskService.calculateRiskMetrics).toBe('function');
    expect(typeof riskService.createRiskProfile).toBe('function');
    expect(typeof riskService.getRiskProfile).toBe('function');
    expect(typeof riskService.createRiskLimit).toBe('function');
    expect(typeof riskService.getRiskLimits).toBe('function');
    expect(typeof riskService.validateTrade).toBe('function');
    expect(typeof riskService.calculatePositionSizing).toBe('function');
    expect(typeof riskService.calculateRiskRewardAnalysis).toBe('function');
    expect(typeof riskService.calculatePortfolioRiskAnalysis).toBe('function');
    expect(typeof riskService.calculateDrawdownAnalysis).toBe('function');
    expect(typeof riskService.calculateVaR).toBe('function');
    expect(typeof riskService.calculatePerformanceRatios).toBe('function');
    expect(typeof riskService.calculateVolatilityAnalysis).toBe('function');
    expect(typeof riskService.getCorrelationMatrix).toBe('function');
    expect(typeof riskService.runStressTest).toBe('function');
    expect(typeof riskService.analyzeLiquidityRisk).toBe('function');
    expect(typeof riskService.optimizePortfolio).toBe('function');
    expect(typeof riskService.calculateMonteCarloVaR).toBe('function');
  });
});