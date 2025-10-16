/**
 * Forecasting Algorithm
 * Revenue prediction and forecasting utilities
 */

import type { Deal, ForecastMethodology } from '../types';

/**
 * Calculate weighted revenue from deals
 * Formula: Sum of (deal.value * deal.probability / 100)
 *
 * @param deals - Array of open deals
 * @returns Weighted revenue prediction
 */
export function calculateWeightedRevenue(deals: Deal[]): number {
  return deals.reduce((sum, deal) => {
    if (deal.status !== 'open') {
      return sum;
    }
    const probability = deal.probability / 100;
    const value = parseFloat(deal.value.toString());
    return sum + value * probability;
  }, 0);
}

/**
 * Calculate best case scenario
 * Assumes all deals close at full value
 *
 * @param deals - Array of open deals
 * @returns Best case revenue
 */
export function calculateBestCase(deals: Deal[]): number {
  return deals.reduce((sum, deal) => {
    if (deal.status !== 'open') {
      return sum;
    }
    return sum + parseFloat(deal.value.toString());
  }, 0);
}

/**
 * Calculate worst case scenario
 * Only includes deals with >80% probability
 *
 * @param deals - Array of open deals
 * @returns Worst case revenue
 */
export function calculateWorstCase(deals: Deal[]): number {
  return deals.reduce((sum, deal) => {
    if (deal.status !== 'open' || deal.probability < 80) {
      return sum;
    }
    return sum + parseFloat(deal.value.toString());
  }, 0);
}

/**
 * Predict revenue using moving average
 * Uses last N periods to predict next period
 *
 * @param historicalRevenue - Array of past revenue values
 * @param periods - Number of periods to average (default: 3)
 * @returns Predicted revenue
 */
export function predictRevenueMovingAverage(historicalRevenue: number[], periods = 3): number {
  if (historicalRevenue.length === 0) {
    return 0;
  }

  const relevantPeriods = historicalRevenue.slice(-periods);
  const sum = relevantPeriods.reduce((a, b) => a + b, 0);
  return sum / relevantPeriods.length;
}

/**
 * Predict revenue using linear regression
 * Simple linear trend-based prediction
 *
 * @param historicalRevenue - Array of past revenue values
 * @returns Predicted revenue
 */
export function predictRevenueLinearRegression(historicalRevenue: number[]): number {
  if (historicalRevenue.length === 0) {
    return 0;
  }

  const n = historicalRevenue.length;
  const xValues = Array.from({ length: n }, (_, i) => i + 1);
  const yValues = historicalRevenue;

  // Calculate means
  const xMean = xValues.reduce((a, b) => a + b, 0) / n;
  const yMean = yValues.reduce((a, b) => a + b, 0) / n;

  // Calculate slope (m) and intercept (b)
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
    denominator += Math.pow(xValues[i] - xMean, 2);
  }

  const slope = numerator / denominator;
  const intercept = yMean - slope * xMean;

  // Predict next period (n + 1)
  return slope * (n + 1) + intercept;
}

/**
 * Calculate confidence level based on data quality
 * Factors: number of deals, consistency, historical accuracy
 *
 * @param deals - Current open deals
 * @param historicalRevenue - Past revenue data
 * @returns Confidence level (0-100)
 */
export function calculateConfidenceLevel(deals: Deal[], historicalRevenue: number[]): number {
  let confidence = 50; // Base confidence

  // Factor 1: Number of deals (more deals = more confidence)
  if (deals.length > 20) confidence += 20;
  else if (deals.length > 10) confidence += 10;
  else if (deals.length > 5) confidence += 5;

  // Factor 2: Historical data availability
  if (historicalRevenue.length >= 12) confidence += 20;
  else if (historicalRevenue.length >= 6) confidence += 10;
  else if (historicalRevenue.length >= 3) confidence += 5;

  // Factor 3: Revenue consistency (low variance = higher confidence)
  if (historicalRevenue.length >= 3) {
    const mean = historicalRevenue.reduce((a, b) => a + b, 0) / historicalRevenue.length;
    const variance =
      historicalRevenue.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      historicalRevenue.length;
    const coefficientOfVariation = Math.sqrt(variance) / mean;

    if (coefficientOfVariation < 0.2) confidence += 10;
    else if (coefficientOfVariation > 0.5) confidence -= 10;
  }

  // Cap confidence at 100
  return Math.min(Math.max(confidence, 0), 100);
}

/**
 * Generate forecast using specified methodology
 *
 * @param deals - Current open deals
 * @param historicalRevenue - Past revenue data
 * @param methodology - Forecasting method to use
 * @returns Forecast data
 */
export function generateForecast(
  deals: Deal[],
  historicalRevenue: number[],
  methodology: ForecastMethodology
): {
  predictedRevenue: number;
  weightedRevenue: number;
  bestCase: number;
  worstCase: number;
  confidenceLevel: number;
} {
  const weightedRevenue = calculateWeightedRevenue(deals);
  const bestCase = calculateBestCase(deals);
  const worstCase = calculateWorstCase(deals);

  let predictedRevenue = weightedRevenue;

  switch (methodology) {
    case 'weighted_pipeline':
      predictedRevenue = weightedRevenue;
      break;

    case 'historical':
      if (historicalRevenue.length > 0) {
        const lastPeriod = historicalRevenue[historicalRevenue.length - 1];
        predictedRevenue = lastPeriod;
      }
      break;

    case 'linear_regression':
      if (historicalRevenue.length >= 3) {
        predictedRevenue = predictRevenueLinearRegression(historicalRevenue);
      }
      break;

    case 'moving_average':
      if (historicalRevenue.length >= 3) {
        predictedRevenue = predictRevenueMovingAverage(historicalRevenue);
      }
      break;
  }

  const confidenceLevel = calculateConfidenceLevel(deals, historicalRevenue);

  return {
    predictedRevenue,
    weightedRevenue,
    bestCase,
    worstCase,
    confidenceLevel,
  };
}

/**
 * Calculate trend direction and change percentage
 *
 * @param current - Current period value
 * @param previous - Previous period value
 * @returns Trend data
 */
export function calculateTrend(
  current: number,
  previous: number
): {
  direction: 'up' | 'down' | 'stable';
  changePercentage: number;
} {
  if (previous === 0) {
    return { direction: 'stable', changePercentage: 0 };
  }

  const changePercentage = ((current - previous) / previous) * 100;

  let direction: 'up' | 'down' | 'stable';
  if (Math.abs(changePercentage) < 5) {
    direction = 'stable';
  } else if (changePercentage > 0) {
    direction = 'up';
  } else {
    direction = 'down';
  }

  return { direction, changePercentage };
}
