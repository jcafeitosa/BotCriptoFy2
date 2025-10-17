/**
 * Escrow Fee Calculator
 *
 * Calculates fees for P2P trades (maker/taker fees)
 */

import type { FeeCalculationResponse } from '../types/p2p.types';
import type { FeeType } from '../schema/p2p.schema';

/**
 * Fee Tiers
 */
interface FeeTier {
  minVolume: number;
  maxVolume: number;
  makerFee: number; // percentage
  takerFee: number; // percentage
}

/**
 * Default fee tiers (volume-based)
 */
const DEFAULT_FEE_TIERS: FeeTier[] = [
  { minVolume: 0, maxVolume: 10000, makerFee: 0.1, takerFee: 0.2 },
  { minVolume: 10000, maxVolume: 50000, makerFee: 0.08, takerFee: 0.15 },
  { minVolume: 50000, maxVolume: 100000, makerFee: 0.06, takerFee: 0.12 },
  { minVolume: 100000, maxVolume: 500000, makerFee: 0.04, takerFee: 0.1 },
  { minVolume: 500000, maxVolume: Infinity, makerFee: 0.02, takerFee: 0.08 },
];

/**
 * Calculate trading fee
 */
export function calculateTradeFee(
  amount: number,
  feeType: FeeType,
  userVolume: number = 0,
  customTiers?: FeeTier[]
): FeeCalculationResponse {
  const tiers = customTiers || DEFAULT_FEE_TIERS;

  // Find applicable tier
  const tier = tiers.find(
    (t) => userVolume >= t.minVolume && userVolume < t.maxVolume
  );

  if (!tier) {
    throw new Error('No fee tier found for user volume');
  }

  // Get fee percentage
  const feePercentage = feeType === 'maker' ? tier.makerFee : tier.takerFee;

  // Calculate fee
  const totalFee = (amount * feePercentage) / 100;

  return {
    feeType,
    cryptocurrency: 'BTC', // Default, should be passed as param
    amount: amount.toFixed(8),
    percentage: feePercentage.toFixed(2),
    fixedAmount: '0',
    totalFee: totalFee.toFixed(8),
  };
}

/**
 * Calculate maker fee
 */
export function calculateMakerFee(
  amount: number,
  userVolume: number = 0
): number {
  const result = calculateTradeFee(amount, 'maker', userVolume);
  return parseFloat(result.totalFee);
}

/**
 * Calculate taker fee
 */
export function calculateTakerFee(
  amount: number,
  userVolume: number = 0
): number {
  const result = calculateTradeFee(amount, 'taker', userVolume);
  return parseFloat(result.totalFee);
}

/**
 * Calculate net amount after fees
 */
export function calculateNetAmount(
  grossAmount: number,
  feeType: FeeType,
  userVolume: number = 0
): { netAmount: number; fee: number } {
  const fee = feeType === 'maker'
    ? calculateMakerFee(grossAmount, userVolume)
    : calculateTakerFee(grossAmount, userVolume);

  const netAmount = grossAmount - fee;

  return { netAmount, fee };
}

/**
 * Calculate required gross amount to receive specific net amount
 */
export function calculateRequiredGrossAmount(
  desiredNetAmount: number,
  feeType: FeeType,
  userVolume: number = 0
): { grossAmount: number; fee: number } {
  const tiers = DEFAULT_FEE_TIERS;

  const tier = tiers.find(
    (t) => userVolume >= t.minVolume && userVolume < t.maxVolume
  );

  if (!tier) {
    throw new Error('No fee tier found for user volume');
  }

  const feePercentage = feeType === 'maker' ? tier.makerFee : tier.takerFee;
  const grossAmount = desiredNetAmount / (1 - feePercentage / 100);
  const fee = grossAmount - desiredNetAmount;

  return { grossAmount, fee };
}

/**
 * Get user's fee tier
 */
export function getUserFeeTier(userVolume: number): FeeTier {
  const tier = DEFAULT_FEE_TIERS.find(
    (t) => userVolume >= t.minVolume && userVolume < t.maxVolume
  );

  if (!tier) {
    return DEFAULT_FEE_TIERS[DEFAULT_FEE_TIERS.length - 1];
  }

  return tier;
}

/**
 * Calculate fee savings from volume discount
 */
export function calculateFeeSavings(
  amount: number,
  currentVolume: number,
  baseVolume: number = 0
): { currentFee: number; baseFee: number; savings: number; savingsPercentage: number } {
  const currentFee = calculateTakerFee(amount, currentVolume);
  const baseFee = calculateTakerFee(amount, baseVolume);
  const savings = baseFee - currentFee;
  const savingsPercentage = baseFee > 0 ? (savings / baseFee) * 100 : 0;

  return {
    currentFee,
    baseFee,
    savings,
    savingsPercentage,
  };
}

/**
 * Estimate monthly fees based on trading volume
 */
export function estimateMonthlyFees(
  monthlyVolume: number,
  makerPercentage: number = 50
): {
  totalFees: number;
  makerFees: number;
  takerFees: number;
  averageFeeRate: number;
} {
  const makerVolume = monthlyVolume * (makerPercentage / 100);
  const takerVolume = monthlyVolume - makerVolume;

  const makerFees = calculateMakerFee(makerVolume, monthlyVolume);
  const takerFees = calculateTakerFee(takerVolume, monthlyVolume);
  const totalFees = makerFees + takerFees;

  const averageFeeRate = monthlyVolume > 0 ? (totalFees / monthlyVolume) * 100 : 0;

  return {
    totalFees,
    makerFees,
    takerFees,
    averageFeeRate,
  };
}

/**
 * Calculate volume needed for next fee tier
 */
export function calculateVolumeForNextTier(
  currentVolume: number
): { nextTierVolume: number; volumeNeeded: number; nextTier: FeeTier | null } {
  const currentTier = getUserFeeTier(currentVolume);
  const currentTierIndex = DEFAULT_FEE_TIERS.indexOf(currentTier);

  if (currentTierIndex === DEFAULT_FEE_TIERS.length - 1) {
    return {
      nextTierVolume: Infinity,
      volumeNeeded: Infinity,
      nextTier: null,
    };
  }

  const nextTier = DEFAULT_FEE_TIERS[currentTierIndex + 1];
  const volumeNeeded = nextTier.minVolume - currentVolume;

  return {
    nextTierVolume: nextTier.minVolume,
    volumeNeeded: Math.max(0, volumeNeeded),
    nextTier,
  };
}

/**
 * Validate fee calculation
 */
export function validateFeeCalculation(
  amount: number,
  fee: number,
  feeType: FeeType
): { valid: boolean; error?: string } {
  if (amount <= 0) {
    return { valid: false, error: 'Amount must be greater than zero' };
  }

  if (fee < 0) {
    return { valid: false, error: 'Fee cannot be negative' };
  }

  if (fee > amount) {
    return { valid: false, error: 'Fee cannot exceed amount' };
  }

  const expectedFee = feeType === 'maker'
    ? calculateMakerFee(amount)
    : calculateTakerFee(amount);

  const tolerance = 0.00000001; // 1 satoshi for BTC
  if (Math.abs(fee - expectedFee) > tolerance) {
    return { valid: false, error: 'Fee calculation mismatch' };
  }

  return { valid: true };
}
