/**
 * Commission Calculator
 * Calculates affiliate commissions based on tier, order value, and rules
 */

import type { AffiliateTier } from '../schema/affiliate.schema';
import type { CommissionCalculation, CommissionType } from '../types/affiliate.types';

/**
 * Commission Configuration
 */
export interface CommissionConfig {
  baseRate: number; // Default commission rate (percentage)
  fixedBonus?: number; // Fixed bonus amount
  tierMultiplier?: number; // Tier-based multiplier
  minimumCommission?: number; // Minimum commission amount
  maximumCommission?: number; // Maximum commission amount
  roundTo?: number; // Round to decimal places (default: 2)
}

/**
 * Calculate commission amount
 */
export const calculateCommission = (
  orderValue: number,
  rate: number,
  tier?: AffiliateTier | null,
  config?: Partial<CommissionConfig>
): CommissionCalculation => {
  const defaultConfig: CommissionConfig = {
    baseRate: rate,
    roundTo: 2,
    ...config,
  };

  // Base commission (percentage of order value)
  let commissionAmount = (orderValue * rate) / 100;
  let type: CommissionType = 'percentage';
  let bonusAmount = 0;
  let tierBonus = 0;

  // Apply tier bonus if applicable
  if (tier && tier.bonusRate && parseFloat(tier.bonusRate) > 0) {
    tierBonus = (orderValue * parseFloat(tier.bonusRate)) / 100;
    bonusAmount += tierBonus;
  }

  // Apply fixed bonus if configured
  if (defaultConfig.fixedBonus && defaultConfig.fixedBonus > 0) {
    bonusAmount += defaultConfig.fixedBonus;
    type = 'bonus';
  }

  // Apply tier multiplier if configured
  if (defaultConfig.tierMultiplier && defaultConfig.tierMultiplier > 1) {
    commissionAmount *= defaultConfig.tierMultiplier;
  }

  // Total commission
  let totalAmount = commissionAmount + bonusAmount;

  // Apply minimum commission
  if (defaultConfig.minimumCommission && totalAmount < defaultConfig.minimumCommission) {
    totalAmount = defaultConfig.minimumCommission;
  }

  // Apply maximum commission
  if (defaultConfig.maximumCommission && totalAmount > defaultConfig.maximumCommission) {
    totalAmount = defaultConfig.maximumCommission;
  }

  // Round to specified decimal places
  const roundTo = defaultConfig.roundTo ?? 2;
  const multiplier = Math.pow(10, roundTo);
  totalAmount = Math.round(totalAmount * multiplier) / multiplier;
  commissionAmount = Math.round(commissionAmount * multiplier) / multiplier;
  bonusAmount = Math.round(bonusAmount * multiplier) / multiplier;
  tierBonus = Math.round(tierBonus * multiplier) / multiplier;

  return {
    commissionAmount,
    commissionRate: rate,
    type: bonusAmount > 0 ? 'bonus' : type,
    bonusAmount: bonusAmount > 0 ? bonusAmount : undefined,
    tierBonus: tierBonus > 0 ? tierBonus : undefined,
    totalAmount,
  };
};

/**
 * Calculate recurring commission for subscriptions
 */
export const calculateRecurringCommission = (
  subscriptionValue: number,
  rate: number,
  months: number,
  tier?: AffiliateTier | null
): {
  monthlyCommission: number;
  totalCommission: number;
  breakdown: Array<{ month: number; amount: number }>;
} => {
  const breakdown: Array<{ month: number; amount: number }> = [];
  let totalCommission = 0;

  for (let month = 1; month <= months; month++) {
    const calculation = calculateCommission(subscriptionValue, rate, tier);
    breakdown.push({
      month,
      amount: calculation.totalAmount,
    });
    totalCommission += calculation.totalAmount;
  }

  const monthlyCommission = totalCommission / months;

  return {
    monthlyCommission: Math.round(monthlyCommission * 100) / 100,
    totalCommission: Math.round(totalCommission * 100) / 100,
    breakdown,
  };
};

/**
 * Calculate tiered commission (different rates for different value ranges)
 */
export interface TierRange {
  minValue: number;
  maxValue: number;
  rate: number;
}

export const calculateTieredCommission = (
  orderValue: number,
  tiers: TierRange[]
): CommissionCalculation => {
  let totalCommission = 0;
  let remainingValue = orderValue;

  // Sort tiers by minValue
  const sortedTiers = [...tiers].sort((a, b) => a.minValue - b.minValue);

  for (const tier of sortedTiers) {
    if (remainingValue <= 0) break;

    const tierMin = tier.minValue;
    const tierMax = tier.maxValue === Infinity ? remainingValue : tier.maxValue;
    const tierRange = tierMax - tierMin;

    // Calculate amount in this tier
    const amountInTier = Math.min(remainingValue, tierRange);
    const tierCommission = (amountInTier * tier.rate) / 100;

    totalCommission += tierCommission;
    remainingValue -= amountInTier;
  }

  totalCommission = Math.round(totalCommission * 100) / 100;

  return {
    commissionAmount: totalCommission,
    commissionRate: (totalCommission / orderValue) * 100,
    type: 'percentage',
    totalAmount: totalCommission,
  };
};

/**
 * Calculate performance bonus based on monthly targets
 */
export const calculatePerformanceBonus = (
  monthlyRevenue: number,
  targets: Array<{ threshold: number; bonusRate: number }>
): number => {
  // Sort targets by threshold descending
  const sortedTargets = [...targets].sort((a, b) => b.threshold - a.threshold);

  // Find the highest threshold met
  for (const target of sortedTargets) {
    if (monthlyRevenue >= target.threshold) {
      const bonus = (monthlyRevenue * target.bonusRate) / 100;
      return Math.round(bonus * 100) / 100;
    }
  }

  return 0;
};

/**
 * Calculate conversion bonus (first sale bonus)
 */
export const calculateConversionBonus = (
  isFirstConversion: boolean,
  orderValue: number,
  bonusRate: number = 5
): number => {
  if (!isFirstConversion) return 0;

  const bonus = (orderValue * bonusRate) / 100;
  return Math.round(bonus * 100) / 100;
};

/**
 * Calculate holding period for commission (anti-fraud)
 */
export const calculateHoldingPeriod = (
  orderValue: number,
  isNewCustomer: boolean,
  customDays?: number
): Date => {
  const now = new Date();
  let holdDays = customDays ?? 30; // Default 30 days

  // Longer holding period for high-value orders
  if (orderValue > 10000) {
    holdDays = 60;
  } else if (orderValue > 5000) {
    holdDays = 45;
  }

  // Shorter holding period for returning customers
  if (!isNewCustomer) {
    holdDays = Math.floor(holdDays / 2);
  }

  const holdUntil = new Date(now);
  holdUntil.setDate(holdUntil.getDate() + holdDays);

  return holdUntil;
};

/**
 * Estimate monthly earnings based on current performance
 */
export const estimateMonthlyEarnings = (
  currentEarnings: number,
  currentDayOfMonth: number,
  daysInMonth: number
): {
  estimated: number;
  projectedDaily: number;
  remainingDays: number;
} => {
  const projectedDaily = currentEarnings / currentDayOfMonth;
  const remainingDays = daysInMonth - currentDayOfMonth;
  const estimated = currentEarnings + (projectedDaily * remainingDays);

  return {
    estimated: Math.round(estimated * 100) / 100,
    projectedDaily: Math.round(projectedDaily * 100) / 100,
    remainingDays,
  };
};

/**
 * Calculate commission split (for multi-level or team splits)
 */
export const calculateCommissionSplit = (
  totalCommission: number,
  splits: Array<{ id: string; percentage: number }>
): Array<{ id: string; amount: number; percentage: number }> => {
  // Validate percentages sum to 100
  const totalPercentage = splits.reduce((sum, split) => sum + split.percentage, 0);
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new Error('Commission splits must sum to 100%');
  }

  return splits.map((split) => ({
    id: split.id,
    amount: Math.round((totalCommission * split.percentage) / 100 * 100) / 100,
    percentage: split.percentage,
  }));
};

/**
 * Calculate effective commission rate including all bonuses
 */
export const calculateEffectiveRate = (
  orderValue: number,
  totalCommission: number
): number => {
  if (orderValue === 0) return 0;
  const rate = (totalCommission / orderValue) * 100;
  return Math.round(rate * 100) / 100;
};
