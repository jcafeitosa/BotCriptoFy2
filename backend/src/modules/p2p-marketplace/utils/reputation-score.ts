/**
 * Reputation Score Calculator
 *
 * Calculates and manages user reputation scores in P2P marketplace
 */

import type { ReputationSummary, UserP2PStats } from '../types/p2p.types';

/**
 * Calculate overall reputation score (0-100)
 *
 * Weighted factors:
 * - Average rating (40%)
 * - Completion rate (30%)
 * - Total trades (20%)
 * - Dispute rate penalty (10%)
 */
export function calculateReputationScore(stats: UserP2PStats): number {
  // Rating component (0-100)
  const ratingScore = (stats.averageRating / 5) * 100;

  // Completion rate component (0-100)
  const completionScore = stats.completionRate;

  // Volume component (0-100) - logarithmic scale
  const volumeScore = calculateVolumeScore(stats.completedTrades);

  // Dispute penalty (0-100)
  const disputeScore = calculateDisputeScore(
    stats.disputesAgainst,
    stats.totalTrades
  );

  // Weighted total
  const totalScore =
    ratingScore * 0.4 +
    completionScore * 0.3 +
    volumeScore * 0.2 +
    disputeScore * 0.1;

  return Math.max(0, Math.min(100, totalScore));
}

/**
 * Calculate volume score (logarithmic)
 *
 * More trades = higher score, but with diminishing returns
 */
function calculateVolumeScore(completedTrades: number): number {
  if (completedTrades === 0) return 0;
  if (completedTrades >= 1000) return 100;

  // Logarithmic scale: score = 100 * log(trades + 1) / log(1001)
  const score = (100 * Math.log(completedTrades + 1)) / Math.log(1001);

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate dispute score (penalty system)
 */
function calculateDisputeScore(disputesAgainst: number, totalTrades: number): number {
  if (totalTrades === 0) return 100;

  const disputeRate = disputesAgainst / totalTrades;

  // 0% disputes = 100 score
  // 1% disputes = 90 score
  // 5% disputes = 50 score
  // 10% disputes = 0 score

  const score = 100 - disputeRate * 1000;

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate trust level from reputation score
 */
export function getTrustLevel(reputationScore: number): {
  level: string;
  description: string;
  color: string;
} {
  if (reputationScore >= 90) {
    return {
      level: 'Elite',
      description: 'Highly trusted trader with excellent track record',
      color: 'gold',
    };
  }

  if (reputationScore >= 75) {
    return {
      level: 'Expert',
      description: 'Experienced trader with strong reputation',
      color: 'blue',
    };
  }

  if (reputationScore >= 60) {
    return {
      level: 'Verified',
      description: 'Reliable trader with good history',
      color: 'green',
    };
  }

  if (reputationScore >= 40) {
    return {
      level: 'Standard',
      description: 'New or average trader',
      color: 'gray',
    };
  }

  return {
    level: 'Caution',
    description: 'Trade with caution - limited or poor history',
    color: 'red',
  };
}

/**
 * Calculate completion rate
 */
export function calculateCompletionRate(
  completedTrades: number,
  totalTrades: number
): number {
  if (totalTrades === 0) return 0;

  return (completedTrades / totalTrades) * 100;
}

/**
 * Calculate average rating from reviews
 */
export function calculateAverageRating(ratings: number[]): number {
  if (ratings.length === 0) return 0;

  const sum = ratings.reduce((acc, rating) => acc + rating, 0);
  return sum / ratings.length;
}

/**
 * Calculate rating distribution
 */
export function calculateRatingDistribution(ratings: number[]): {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
} {
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  for (const rating of ratings) {
    if (rating >= 1 && rating <= 5) {
      distribution[rating as 1 | 2 | 3 | 4 | 5]++;
    }
  }

  return distribution;
}

/**
 * Calculate positive review percentage
 */
export function calculatePositivePercentage(
  positiveReviews: number,
  totalReviews: number
): number {
  if (totalReviews === 0) return 0;

  return (positiveReviews / totalReviews) * 100;
}

/**
 * Determine if review is positive
 *
 * Rating >= 4 is considered positive
 */
export function isPositiveReview(rating: number): boolean {
  return rating >= 4;
}

/**
 * Calculate average trade time (in hours)
 */
export function calculateAverageTradeTime(tradeTimes: number[]): number {
  if (tradeTimes.length === 0) return 0;

  const sum = tradeTimes.reduce((acc, time) => acc + time, 0);
  const averageMs = sum / tradeTimes.length;

  // Convert to hours
  return averageMs / (1000 * 60 * 60);
}

/**
 * Calculate response time score
 *
 * Faster responses = higher score
 */
export function calculateResponseTimeScore(averageResponseMinutes: number): number {
  // < 5 minutes = 100
  // 5-15 minutes = 80
  // 15-30 minutes = 60
  // 30-60 minutes = 40
  // > 60 minutes = 20

  if (averageResponseMinutes < 5) return 100;
  if (averageResponseMinutes < 15) return 80;
  if (averageResponseMinutes < 30) return 60;
  if (averageResponseMinutes < 60) return 40;
  return 20;
}

/**
 * Build reputation summary
 */
export function buildReputationSummary(
  stats: UserP2PStats,
  ratings: number[],
  recentReviews: any[]
): ReputationSummary {
  const averageRating = calculateAverageRating(ratings);
  const distribution = calculateRatingDistribution(ratings);
  const positivePercentage = calculatePositivePercentage(
    stats.positiveReviews,
    stats.totalReviews
  );

  return {
    userId: stats.userId,
    averageRating,
    totalReviews: stats.totalReviews,
    ratingDistribution: distribution,
    positivePercentage,
    recentReviews: recentReviews.slice(0, 10), // Last 10 reviews
  };
}

/**
 * Validate reputation score
 */
export function validateReputationScore(score: number): boolean {
  return score >= 0 && score <= 100;
}

/**
 * Compare two users' reputations
 */
export function compareReputations(
  userA: UserP2PStats,
  userB: UserP2PStats
): { winner: string; difference: number } {
  const scoreA = calculateReputationScore(userA);
  const scoreB = calculateReputationScore(userB);

  const difference = Math.abs(scoreA - scoreB);

  return {
    winner: scoreA > scoreB ? userA.userId : userB.userId,
    difference,
  };
}

/**
 * Calculate reputation trend
 *
 * Compares recent performance with overall stats
 */
export function calculateReputationTrend(
  overallStats: UserP2PStats,
  recentStats: UserP2PStats
): { trend: 'improving' | 'stable' | 'declining'; change: number } {
  const overallScore = calculateReputationScore(overallStats);
  const recentScore = calculateReputationScore(recentStats);

  const change = recentScore - overallScore;

  let trend: 'improving' | 'stable' | 'declining';

  if (change > 5) {
    trend = 'improving';
  } else if (change < -5) {
    trend = 'declining';
  } else {
    trend = 'stable';
  }

  return { trend, change };
}

/**
 * Get reputation badge
 */
export function getReputationBadge(stats: UserP2PStats): {
  name: string;
  icon: string;
  requirement: string;
} | null {
  // Elite Trader: 1000+ trades, 95%+ completion, 4.8+ rating
  if (
    stats.completedTrades >= 1000 &&
    stats.completionRate >= 95 &&
    stats.averageRating >= 4.8
  ) {
    return {
      name: 'Elite Trader',
      icon: '⭐',
      requirement: '1000+ trades, 95%+ completion, 4.8+ rating',
    };
  }

  // Pro Trader: 500+ trades, 90%+ completion, 4.5+ rating
  if (
    stats.completedTrades >= 500 &&
    stats.completionRate >= 90 &&
    stats.averageRating >= 4.5
  ) {
    return {
      name: 'Pro Trader',
      icon: '💎',
      requirement: '500+ trades, 90%+ completion, 4.5+ rating',
    };
  }

  // Experienced: 100+ trades, 85%+ completion, 4.0+ rating
  if (
    stats.completedTrades >= 100 &&
    stats.completionRate >= 85 &&
    stats.averageRating >= 4.0
  ) {
    return {
      name: 'Experienced',
      icon: '🏆',
      requirement: '100+ trades, 85%+ completion, 4.0+ rating',
    };
  }

  return null;
}
