/**
 * Social Trading Types
 */

import type { TraderStatus, PostType, SignalType, StrategyType, PerformancePeriod } from '../schema/social.schema';

// Re-export schema types
export type { TraderStatus, PostType, SignalType, StrategyType, PerformancePeriod };

export interface TraderProfile {
  id: string;
  userId: string;
  displayName: string;
  bio: string | null;
  avatar: string | null;
  country: string | null;
  tradingSince: Date;
  specialties: string[] | null;
  strategyType: StrategyType | null;
  isPublic: boolean;
  allowCopying: boolean;
  maxCopiers: number | null;
  currentCopiers: number;
  isVerified: boolean;
  isPremium: boolean;
  subscriptionFee: string | null;
  totalFollowers: number;
  totalTrades: number;
  winRate: string;
  status: TraderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTraderRequest {
  tenantId: string;
  userId: string;
  displayName: string;
  bio?: string;
  specialties?: string[];
  strategyType?: StrategyType;
}

export interface CopySettings {
  id: string;
  copierId: string;
  traderId: string;
  isActive: boolean;
  copyRatio: string;
  maxAmountPerTrade: string | null;
  maxTradeAmount: string | null;
  maxDailyLoss: string | null;
  copiedPairs: string[] | null;
  excludedPairs: string[] | null;
  minTradeAmount: string | null;
  stopLossPercentage: string | null;
  takeProfitPercentage: string | null;
}

export interface CreateCopySettingsRequest {
  tenantId: string;
  copierId: string;
  traderId: string;
  copyRatio?: number;
  maxAmountPerTrade?: number;
  maxDailyLoss?: number;
  copiedPairs?: string[];
  stopLossPercentage?: number;
  takeProfitPercentage?: number;
}

export interface PerformanceMetrics {
  period: PerformancePeriod;
  totalProfit: string;
  netProfit: string;
  roi: string;
  winRate: string;
  sharpeRatio: string | null;
  maxDrawdown: string | null;
  totalTrades: number;
  winningTrades: number;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface LeaderboardEntry {
  rank: number;
  traderId: string;
  traderName: string;
  totalProfit: string;
  roi: string;
  winRate: string;
  totalTrades: number;
  score: string;
}

export interface TradingSignal {
  id: string;
  traderId: string;
  signalType: SignalType;
  symbol: string;
  entryPrice: string;
  stopLoss: string | null;
  takeProfit: string | null;
  reasoning: string | null;
  confidence: number | null;
  isActive: boolean;
  createdAt: Date;
}
