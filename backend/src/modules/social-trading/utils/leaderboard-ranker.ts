/**
 * Leaderboard Ranking Algorithm
 *
 * Scores and ranks traders based on multiple factors
 */

import type { PerformanceMetrics } from '../types/social.types';

export interface TraderScore {
  traderId: string;
  totalScore: number;
  roiScore: number;
  consistencyScore: number;
  riskScore: number;
  volumeScore: number;
}

/**
 * Calculate composite ranking score
 *
 * Weighted factors:
 * - ROI (35%)
 * - Consistency/Win Rate (25%)
 * - Risk-adjusted returns (25%)
 * - Trading volume (15%)
 */
export function calculateRankingScore(metrics: PerformanceMetrics): TraderScore {
  const roiScore = calculateRoiScore(parseFloat(metrics.roi));
  const consistencyScore = calculateConsistencyScore(parseFloat(metrics.winRate));
  const riskScore = calculateRiskScore(
    parseFloat(metrics.sharpeRatio || '0'),
    parseFloat(metrics.maxDrawdown || '0')
  );
  const volumeScore = calculateVolumeScore(metrics.totalTrades);

  const totalScore =
    roiScore * 0.35 +
    consistencyScore * 0.25 +
    riskScore * 0.25 +
    volumeScore * 0.15;

  return {
    traderId: '', // Set by caller
    totalScore,
    roiScore,
    consistencyScore,
    riskScore,
    volumeScore,
  };
}

/**
 * ROI Score (0-100)
 */
function calculateRoiScore(roi: number): number {
  // Logarithmic scale: higher ROI = higher score
  if (roi <= 0) return 0;
  if (roi >= 200) return 100;

  // Score = 100 * log(roi + 1) / log(201)
  return (100 * Math.log(roi + 1)) / Math.log(201);
}

/**
 * Consistency Score (0-100)
 */
function calculateConsistencyScore(winRate: number): number {
  // Linear scaling with bonus for high win rates
  if (winRate >= 70) return 100;
  if (winRate <= 30) return 0;

  return ((winRate - 30) / 40) * 100;
}

/**
 * Risk Score (0-100)
 */
function calculateRiskScore(sharpeRatio: number, maxDrawdown: number): number {
  // Sharpe ratio component (60%)
  const sharpeScore = Math.min(100, (sharpeRatio / 3) * 100);

  // Max drawdown component (40%)
  const drawdownPenalty = Math.max(0, 100 - maxDrawdown * 2);

  return sharpeScore * 0.6 + drawdownPenalty * 0.4;
}

/**
 * Volume Score (0-100)
 */
function calculateVolumeScore(totalTrades: number): number {
  if (totalTrades === 0) return 0;
  if (totalTrades >= 500) return 100;

  // Logarithmic scale
  return (100 * Math.log(totalTrades + 1)) / Math.log(501);
}

/**
 * Rank traders by score
 */
export function rankTraders(traders: Array<{ traderId: string; metrics: PerformanceMetrics }>): TraderScore[] {
  const scores = traders.map(trader => {
    const score = calculateRankingScore(trader.metrics);
    return { ...score, traderId: trader.traderId };
  });

  // Sort by total score (descending)
  return scores.sort((a, b) => b.totalScore - a.totalScore);
}

/**
 * Assign ranks with tie-breaking
 */
export function assignRanks(scores: TraderScore[]): Array<TraderScore & { rank: number }> {
  const ranked = scores.map((score, index) => ({
    ...score,
    rank: index + 1,
  }));

  return ranked;
}
