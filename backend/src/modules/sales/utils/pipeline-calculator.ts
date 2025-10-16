/**
 * Pipeline Calculator
 * Utilities for pipeline value calculations and metrics
 */

import type { Deal, PipelineStage, PipelineView, PipelineStageWithDeals } from '../types';

/**
 * Calculate total pipeline value
 * Sum of all open deals
 *
 * @param deals - Array of deals
 * @returns Total value
 */
export function calculatePipelineValue(deals: Deal[]): number {
  return deals
    .filter((deal) => deal.status === 'open')
    .reduce((sum, deal) => sum + parseFloat(deal.value.toString()), 0);
}

/**
 * Calculate weighted pipeline value
 * Considers deal probability
 *
 * @param deals - Array of deals
 * @returns Weighted value
 */
export function calculateWeightedPipelineValue(deals: Deal[]): number {
  return deals
    .filter((deal) => deal.status === 'open')
    .reduce((sum, deal) => {
      const value = parseFloat(deal.value.toString());
      const probability = deal.probability / 100;
      return sum + value * probability;
    }, 0);
}

/**
 * Group deals by pipeline stage
 *
 * @param deals - Array of deals
 * @param stages - Array of pipeline stages
 * @returns Pipeline view with stages and deals
 */
export function groupDealsByStage(deals: Deal[], stages: PipelineStage[]): PipelineView {
  // Sort stages by order
  const sortedStages = [...stages].sort((a, b) => a.orderIndex - b.orderIndex);

  // Group deals by stage
  const stagesWithDeals: PipelineStageWithDeals[] = sortedStages.map((stage) => {
    const stageDeals = deals.filter(
      (deal) => deal.stageId === stage.id && deal.status === 'open'
    );

    const totalValue = stageDeals.reduce(
      (sum, deal) => sum + parseFloat(deal.value.toString()),
      0
    );

    return {
      ...stage,
      deals: stageDeals,
      totalValue,
      count: stageDeals.length,
    };
  });

  return {
    stages: stagesWithDeals,
    totalPipelineValue: calculatePipelineValue(deals),
    weightedValue: calculateWeightedPipelineValue(deals),
    totalDeals: deals.filter((d) => d.status === 'open').length,
  };
}

/**
 * Calculate average deal size
 *
 * @param deals - Array of deals
 * @param status - Filter by status (default: 'won')
 * @returns Average value
 */
export function calculateAverageDealSize(deals: Deal[], status: 'won' | 'open' = 'won'): number {
  const filteredDeals = deals.filter((deal) => deal.status === status);

  if (filteredDeals.length === 0) {
    return 0;
  }

  const totalValue = filteredDeals.reduce(
    (sum, deal) => sum + parseFloat(deal.value.toString()),
    0
  );

  return totalValue / filteredDeals.length;
}

/**
 * Calculate win rate
 *
 * @param deals - Array of deals
 * @returns Win rate percentage (0-100)
 */
export function calculateWinRate(deals: Deal[]): number {
  const closedDeals = deals.filter((deal) => deal.status === 'won' || deal.status === 'lost');

  if (closedDeals.length === 0) {
    return 0;
  }

  const wonDeals = deals.filter((deal) => deal.status === 'won').length;

  return (wonDeals / closedDeals.length) * 100;
}

/**
 * Calculate sales cycle length (days from creation to close)
 *
 * @param deals - Array of closed deals
 * @returns Average days
 */
export function calculateSalesCycle(deals: Deal[]): number {
  const closedDeals = deals.filter(
    (deal) => (deal.status === 'won' || deal.status === 'lost') && deal.actualCloseDate
  );

  if (closedDeals.length === 0) {
    return 0;
  }

  const totalDays = closedDeals.reduce((sum, deal) => {
    const createdAt = new Date(deal.createdAt).getTime();
    if (!deal.actualCloseDate) {
      return sum;
    }
    const closedAt = new Date(deal.actualCloseDate).getTime();
    const days = (closedAt - createdAt) / (1000 * 60 * 60 * 24);
    return sum + days;
  }, 0);

  return Math.round(totalDays / closedDeals.length);
}

/**
 * Calculate conversion rate from stage to stage
 *
 * @param deals - Array of all deals
 * @param fromStageId - Starting stage ID
 * @param toStageId - Ending stage ID
 * @returns Conversion percentage
 */
export function calculateStageConversionRate(
  deals: Deal[],
  fromStageId: string,
  toStageId: string
): number {
  // This is a simplified version - would need deal history tracking for accurate conversion
  const dealsInFromStage = deals.filter((deal) => deal.stageId === fromStageId);
  const dealsInToStage = deals.filter((deal) => deal.stageId === toStageId);

  if (dealsInFromStage.length === 0) {
    return 0;
  }

  // Rough estimate based on current snapshot
  return (dealsInToStage.length / dealsInFromStage.length) * 100;
}

/**
 * Calculate monthly recurring revenue (MRR)
 * For subscription-based products
 *
 * @param deals - Array of won deals with recurring products
 * @returns Monthly recurring revenue
 */
export function calculateMRR(deals: Deal[]): number {
  const wonDeals = deals.filter((deal) => deal.status === 'won');

  return wonDeals.reduce((sum, deal) => {
    // Assuming products have recurring flag and frequency
    // This is simplified - actual implementation would check product metadata
    const dealValue = parseFloat(deal.value.toString());

    // For this example, assume 20% of deals are recurring monthly
    // In real implementation, check deal.products for recurring items
    const isRecurring = Math.random() > 0.8; // Placeholder
    return sum + (isRecurring ? dealValue : 0);
  }, 0);
}

/**
 * Calculate velocity (deals won per month)
 *
 * @param deals - Array of won deals
 * @param months - Number of months to calculate (default: 3)
 * @returns Average deals per month
 */
export function calculateVelocity(deals: Deal[], months = 3): number {
  const now = new Date();
  const monthsAgo = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());

  const recentWonDeals = deals.filter((deal) => {
    if (deal.status !== 'won' || !deal.actualCloseDate) {
      return false;
    }
    const closeDate = new Date(deal.actualCloseDate);
    return closeDate >= monthsAgo && closeDate <= now;
  });

  return recentWonDeals.length / months;
}

/**
 * Calculate deal aging (days in current stage)
 *
 * @param deal - Deal to analyze
 * @returns Days in current stage
 */
export function calculateDealAging(deal: Deal): number {
  const now = new Date().getTime();
  const updatedAt = new Date(deal.updatedAt).getTime();
  return Math.round((now - updatedAt) / (1000 * 60 * 60 * 24));
}

/**
 * Identify stale deals (stuck in stage too long)
 *
 * @param deals - Array of open deals
 * @param maxDays - Maximum days before considered stale (default: 30)
 * @returns Array of stale deals
 */
export function identifyStaleDeals(deals: Deal[], maxDays = 30): Deal[] {
  return deals.filter((deal) => {
    if (deal.status !== 'open') {
      return false;
    }
    return calculateDealAging(deal) > maxDays;
  });
}
