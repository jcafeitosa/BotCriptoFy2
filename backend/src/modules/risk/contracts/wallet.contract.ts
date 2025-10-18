/**
 * Wallet Service Contract
 * Interface for wallet-related operations used by Risk module
 * 
 * This contract defines the interface that Risk module expects
 * from the Banco/Wallet module, ensuring loose coupling and
 * adherence to Clean Architecture principles.
 */

/**
 * Wallet summary data structure
 */
export interface WalletSummary {
  id: string;
  userId: string;
  tenantId: string;
  totalValueUsd: string;
  totalValueBtc: string;
  totalValueEth: string;
  availableBalance: string;
  lockedBalance: string;
  totalBalance: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Portfolio value breakdown
 */
export interface PortfolioValueBreakdown {
  totalValue: number;
  cashBalance: number;
  investedValue: number;
  availableCash: number;
  lockedCash: number;
  currency: string;
  lastUpdated: Date;
}

/**
 * Wallet Service Contract
 * Defines the interface for wallet-related operations
 */
export interface IWalletService {
  /**
   * Get wallet summary by wallet ID
   */
  getWalletSummary(walletId: string): Promise<WalletSummary | null>;

  /**
   * Get total portfolio value for user
   */
  getTotalPortfolioValue(userId: string, tenantId: string): Promise<number>;

  /**
   * Get cash balance for user
   */
  getCashBalance(userId: string, tenantId: string): Promise<number>;

  /**
   * Get available cash balance
   */
  getAvailableCash(userId: string, tenantId: string): Promise<number>;

  /**
   * Get locked cash balance
   */
  getLockedCash(userId: string, tenantId: string): Promise<number>;

  /**
   * Get portfolio value breakdown
   */
  getPortfolioValueBreakdown(userId: string, tenantId: string): Promise<PortfolioValueBreakdown>;

  /**
   * Get wallet by user ID
   */
  getWalletByUserId(userId: string, tenantId: string): Promise<WalletSummary | null>;

  /**
   * Get all wallets for user
   */
  getUserWallets(userId: string, tenantId: string): Promise<WalletSummary[]>;

  /**
   * Get wallet balance in specific currency
   */
  getWalletBalanceInCurrency(walletId: string, currency: string): Promise<number>;

  /**
   * Check if user has sufficient balance
   */
  hasSufficientBalance(userId: string, tenantId: string, amount: number): Promise<boolean>;

  /**
   * Get margin utilization
   */
  getMarginUtilization(userId: string, tenantId: string): Promise<{
    used: number;
    available: number;
    utilization: number;
  }>;

  /**
   * Get leverage information
   */
  getLeverageInfo(userId: string, tenantId: string): Promise<{
    current: number;
    max: number;
    available: number;
  }>;

  /**
   * Get wallet performance metrics
   */
  getWalletPerformanceMetrics(userId: string, tenantId: string): Promise<{
    totalReturn: number;
    dailyReturn: number;
    weeklyReturn: number;
    monthlyReturn: number;
    yearlyReturn: number;
  }>;

  /**
   * Get wallet risk metrics
   */
  getWalletRiskMetrics(userId: string, tenantId: string): Promise<{
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
    var95: number;
    var99: number;
  }>;
}

/**
 * Wallet Service Factory
 * Factory for creating wallet service instances
 */
export interface IWalletServiceFactory {
  createWalletService(): IWalletService;
}

/**
 * Wallet Service Configuration
 */
export interface WalletServiceConfig {
  enableCaching: boolean;
  cacheTtl: number;
  enableMetrics: boolean;
  enableLogging: boolean;
  defaultCurrency: string;
  enableRealTimeUpdates: boolean;
}