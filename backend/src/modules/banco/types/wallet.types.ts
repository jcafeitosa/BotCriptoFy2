/**
 * Wallet Types
 *
 * Type definitions for wallet operations
 */

import type {
  AssetType,
  WalletType,
  TransactionType,
  TransactionStatus,
  WithdrawalStatus,
  Wallet,
  WalletAsset,
  WalletTransaction,
  WithdrawalRequest,
  SavingsGoal,
} from '../schema/wallet.schema';

/**
 * Create Wallet Request
 */
export interface CreateWalletRequest {
  userId: string;
  tenantId: string;
  name: string;
  type: WalletType;
  description?: string;
  metadata?: {
    color?: string;
    icon?: string;
    displayOrder?: number;
  };
}

/**
 * Create Wallet Response
 */
export interface CreateWalletResponse {
  success: boolean;
  wallet?: Wallet;
  error?: string;
}

/**
 * Deposit Request
 */
export interface DepositRequest {
  walletId: string;
  userId: string;
  tenantId: string;
  asset: AssetType;
  amount: number;
  fromAddress?: string;
  txHash?: string;
  network?: string;
  metadata?: Record<string, any>;
}

/**
 * Withdrawal Request Creation
 */
export interface CreateWithdrawalRequest {
  walletId: string;
  userId: string;
  tenantId: string;
  asset: AssetType;
  amount: number;
  destinationAddress: string;
  network: string;
  twoFactorCode?: string;
  notes?: string;
}

/**
 * Transfer Request
 */
export interface TransferRequest {
  fromWalletId: string;
  toWalletId: string;
  userId: string;
  tenantId: string;
  asset: AssetType;
  amount: number;
  description?: string;
}

/**
 * Balance Response
 */
export interface BalanceResponse {
  asset: AssetType;
  balance: string;
  availableBalance: string;
  lockedBalance: string;
  valueUsd?: string;
  valueBtc?: string;
  allocationPercent?: string;
  unrealizedPnl?: string;
  unrealizedPnlPercent?: string;
}

/**
 * Wallet Summary
 */
export interface WalletSummary {
  wallet: Wallet;
  totalValueUsd: string;
  totalValueBtc: string;
  assets: BalanceResponse[];
  assetCount: number;
  lastUpdated: Date;
}

/**
 * Portfolio Analytics
 */
export interface PortfolioAnalytics {
  totalValueUsd: string;
  totalValueBtc: string;
  totalValueBrl: string;
  change24h: string;
  change24hPercent: string;
  change7d: string;
  change7dPercent: string;
  change30d: string;
  change30dPercent: string;
  totalPnl: string;
  totalPnlPercent: string;
  assetAllocation: Array<{
    asset: AssetType;
    percentage: string;
    valueUsd: string;
  }>;
  topGainers: Array<{
    asset: AssetType;
    pnlPercent: string;
    pnl: string;
  }>;
  topLosers: Array<{
    asset: AssetType;
    pnlPercent: string;
    pnl: string;
  }>;
}

/**
 * Price Data
 */
export interface PriceData {
  asset: AssetType;
  priceUsd: string;
  priceBtc?: string;
  priceBrl?: string;
  marketCap?: string;
  volume24h?: string;
  change24h?: string;
  change7d?: string;
  change30d?: string;
  lastUpdate: Date;
}

/**
 * Transaction Filter
 */
export interface TransactionFilter {
  walletId?: string;
  userId?: string;
  tenantId?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  asset?: AssetType;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Withdrawal Approval Request
 */
export interface WithdrawalApprovalRequest {
  withdrawalId: string;
  approverId: string;
  approved: boolean;
  reason?: string;
}

/**
 * Savings Goal Request
 */
export interface CreateSavingsGoalRequest {
  userId: string;
  walletId: string;
  name: string;
  description?: string;
  targetAmount: number;
  asset: AssetType;
  targetDate?: Date;
  metadata?: {
    color?: string;
    icon?: string;
    category?: string;
  };
}

/**
 * Savings Goal Progress
 */
export interface SavingsGoalProgress {
  goal: SavingsGoal;
  currentAmount: string;
  targetAmount: string;
  progressPercent: string;
  remainingAmount: string;
  daysRemaining?: number;
  onTrack: boolean;
  badges: Array<{
    id: string;
    name: string;
    description: string;
    earnedAt: string;
    icon?: string;
  }>;
  nextMilestone?: {
    percent: number;
    amount: string;
    remainingAmount: string;
  };
}

/**
 * Asset Statistics
 */
export interface AssetStatistics {
  asset: AssetType;
  totalBalance: string;
  totalValueUsd: string;
  holders: number;
  totalTransactions: number;
  totalDeposits: string;
  totalWithdrawals: string;
  avgTransactionSize: string;
  largestHolding: string;
}

/**
 * Wallet Activity
 */
export interface WalletActivity {
  date: string;
  deposits: number;
  withdrawals: number;
  transfers: number;
  trades: number;
  totalVolume: string;
}

/**
 * Service Response
 */
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * CoinGecko Price Response
 */
export interface CoinGeckoPriceResponse {
  [key: string]: {
    usd: number;
    usd_market_cap?: number;
    usd_24h_vol?: number;
    usd_24h_change?: number;
    btc?: number;
    brl?: number;
  };
}

/**
 * Exchange Balance Response
 */
export interface ExchangeBalanceResponse {
  exchange: string;
  asset: AssetType;
  free: string;
  used: string;
  total: string;
}

/**
 * Re-export schema types
 */
export type {
  AssetType,
  WalletType,
  TransactionType,
  TransactionStatus,
  WithdrawalStatus,
  Wallet,
  WalletAsset,
  WalletTransaction,
  WithdrawalRequest,
  SavingsGoal,
};
