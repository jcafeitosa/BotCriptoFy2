/**
 * Copy Trading Engine
 *
 * Mirrors trades from leaders to copiers automatically
 */

import type { CopySettings } from '../types/social.types';

export interface TradeToConform {
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface CopiedTrade extends TradeToConform {
  adjustedAmount: number;
  shouldExecute: boolean;
  reason?: string;
}

/**
 * Calculate adjusted trade amount based on copy ratio
 */
export function calculateCopiedAmount(
  originalAmount: number,
  copySettings: CopySettings
): number {
  const ratio = parseFloat(copySettings.copyRatio);
  return originalAmount * ratio;
}

/**
 * Validate if trade should be copied
 */
export function shouldCopyTrade(
  trade: TradeToConform,
  copySettings: CopySettings
): { should: boolean; reason?: string } {
  if (!copySettings.isActive) {
    return { should: false, reason: 'Copy trading is paused' };
  }

  // Check pair filters
  if (copySettings.copiedPairs && copySettings.copiedPairs.length > 0) {
    if (!copySettings.copiedPairs.includes(trade.symbol)) {
      return { should: false, reason: 'Symbol not in copied pairs list' };
    }
  }

  if (copySettings.excludedPairs && copySettings.excludedPairs.includes(trade.symbol)) {
    return { should: false, reason: 'Symbol is excluded' };
  }

  // Check amount limits
  const adjustedAmount = calculateCopiedAmount(trade.amount, copySettings);

  if (copySettings.minTradeAmount) {
    const minAmount = parseFloat(copySettings.minTradeAmount);
    if (adjustedAmount < minAmount) {
      return { should: false, reason: 'Amount below minimum' };
    }
  }

  if (copySettings.maxTradeAmount) {
    const maxAmount = parseFloat(copySettings.maxTradeAmount);
    if (adjustedAmount > maxAmount) {
      return { should: false, reason: 'Amount exceeds maximum' };
    }
  }

  if (copySettings.maxAmountPerTrade) {
    const maxPerTrade = parseFloat(copySettings.maxAmountPerTrade);
    if (adjustedAmount > maxPerTrade) {
      return { should: false, reason: 'Amount exceeds per-trade limit' };
    }
  }

  return { should: true };
}

/**
 * Apply stop loss and take profit adjustments
 */
export function applyRiskManagement(
  trade: TradeToConform,
  copySettings: CopySettings
): { stopLoss?: number; takeProfit?: number } {
  let stopLoss = trade.stopLoss;
  let takeProfit = trade.takeProfit;

  if (copySettings.stopLossPercentage) {
    const slPercentage = parseFloat(copySettings.stopLossPercentage);
    const slMultiplier = 1 - (slPercentage / 100);
    stopLoss = trade.price * slMultiplier;
  }

  if (copySettings.takeProfitPercentage) {
    const tpPercentage = parseFloat(copySettings.takeProfitPercentage);
    const tpMultiplier = 1 + (tpPercentage / 100);
    takeProfit = trade.price * tpMultiplier;
  }

  return { stopLoss, takeProfit };
}

/**
 * Execute copy trade
 */
export function prepareCopiedTrade(
  originalTrade: TradeToConform,
  copySettings: CopySettings
): CopiedTrade {
  const validation = shouldCopyTrade(originalTrade, copySettings);

  if (!validation.should) {
    return {
      ...originalTrade,
      adjustedAmount: 0,
      shouldExecute: false,
      reason: validation.reason,
    };
  }

  const adjustedAmount = calculateCopiedAmount(originalTrade.amount, copySettings);
  const riskManagement = applyRiskManagement(originalTrade, copySettings);

  return {
    ...originalTrade,
    ...riskManagement,
    adjustedAmount,
    shouldExecute: true,
  };
}

/**
 * Calculate daily loss for risk management
 */
export function calculateDailyLoss(trades: Array<{ profit: number }>): number {
  return trades.reduce((total, trade) => {
    return total + (trade.profit < 0 ? trade.profit : 0);
  }, 0);
}

/**
 * Check if daily loss limit is exceeded
 */
export function isDailyLossExceeded(
  currentDailyLoss: number,
  maxDailyLoss: number
): boolean {
  return Math.abs(currentDailyLoss) >= maxDailyLoss;
}
