/**
 * Order Matching Algorithm
 *
 * Price-time priority matching algorithm for P2P orders
 * Considers: price, reputation, availability, payment methods
 */

import type { OrderMatchingResult, OrderResponse } from '../types/p2p.types';
import type { UserP2PStats } from '../types/p2p.types';

/**
 * Match buyer with best seller orders
 *
 * Algorithm: Multi-factor scoring
 * 1. Price competitiveness (40%)
 * 2. User reputation (30%)
 * 3. Availability (20%)
 * 4. Payment method match (10%)
 */
export function matchOrders(
  buyerRequest: {
    amount: number;
    fiatCurrency: string;
    cryptocurrency: string;
    paymentMethods: string[];
  },
  sellOrders: OrderResponse[],
  sellerStats: Map<string, UserP2PStats>
): OrderMatchingResult[] {
  const matches: OrderMatchingResult[] = [];

  for (const order of sellOrders) {
    // Skip if amount doesn't match
    const minAmount = parseFloat(order.minAmount);
    const maxAmount = parseFloat(order.maxAmount);
    const availableAmount = parseFloat(order.availableAmount);

    if (buyerRequest.amount < minAmount || buyerRequest.amount > maxAmount) {
      continue;
    }

    if (buyerRequest.amount > availableAmount) {
      continue;
    }

    // Calculate scores
    const priceScore = calculatePriceScore(order, sellOrders);
    const reputationScore = calculateReputationScore(order.userId, sellerStats);
    const availabilityScore = calculateAvailabilityScore(order);
    const paymentMethodScore = calculatePaymentMethodScore(
      buyerRequest.paymentMethods,
      order.paymentMethods
    );

    // Weighted total score
    const totalScore =
      priceScore * 0.4 +
      reputationScore * 0.3 +
      availabilityScore * 0.2 +
      paymentMethodScore * 0.1;

    matches.push({
      orderId: order.id,
      matchScore: totalScore,
      priceCompetitiveness: priceScore,
      userReputation: reputationScore,
      availabilityScore,
    });
  }

  // Sort by match score (descending)
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Calculate price competitiveness score (0-100)
 * Lower price = higher score for buy orders
 */
function calculatePriceScore(order: OrderResponse, allOrders: OrderResponse[]): number {
  if (!order.price) return 50; // Market price gets neutral score

  const price = parseFloat(order.price);
  const prices = allOrders
    .filter((o) => o.price !== null)
    .map((o) => parseFloat(o.price!));

  if (prices.length === 0) return 50;

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  if (maxPrice === minPrice) return 100;

  // Normalize: lower price = higher score
  const normalized = 100 - ((price - minPrice) / (maxPrice - minPrice)) * 100;

  return Math.max(0, Math.min(100, normalized));
}

/**
 * Calculate reputation score (0-100)
 */
function calculateReputationScore(
  userId: string,
  sellerStats: Map<string, UserP2PStats>
): number {
  const stats = sellerStats.get(userId);

  if (!stats) return 0;

  // Factors:
  // - Completion rate (40%)
  // - Average rating (30%)
  // - Total trades (20%)
  // - Dispute rate (10% penalty)

  const completionScore = stats.completionRate;
  const ratingScore = (stats.averageRating / 5) * 100;
  const volumeScore = Math.min(100, (stats.completedTrades / 100) * 100);
  const disputePenalty = stats.disputesAgainst > 0
    ? Math.max(0, 100 - stats.disputesAgainst * 10)
    : 100;

  const totalScore =
    completionScore * 0.4 +
    ratingScore * 0.3 +
    volumeScore * 0.2 +
    disputePenalty * 0.1;

  return Math.max(0, Math.min(100, totalScore));
}

/**
 * Calculate availability score (0-100)
 */
function calculateAvailabilityScore(order: OrderResponse): number {
  const available = parseFloat(order.availableAmount);
  const max = parseFloat(order.maxAmount);

  if (max === 0) return 0;

  // Higher available amount = higher score
  const ratio = available / max;
  return ratio * 100;
}

/**
 * Calculate payment method match score (0-100)
 */
function calculatePaymentMethodScore(
  buyerMethods: string[],
  sellerMethods: string[]
): number {
  const matches = buyerMethods.filter((method) => sellerMethods.includes(method));

  if (matches.length === 0) return 0;

  // More matching methods = higher score
  const ratio = matches.length / Math.max(buyerMethods.length, sellerMethods.length);
  return ratio * 100;
}

/**
 * Find optimal trade amount
 *
 * Given buyer's desired amount and seller's order,
 * find the optimal amount to trade
 */
export function findOptimalTradeAmount(
  desiredAmount: number,
  order: OrderResponse
): number | null {
  const minAmount = parseFloat(order.minAmount);
  const maxAmount = parseFloat(order.maxAmount);
  const availableAmount = parseFloat(order.availableAmount);

  // Check if trade is possible
  if (desiredAmount < minAmount) return null;
  if (desiredAmount > maxAmount) return null;
  if (desiredAmount > availableAmount) return null;

  return desiredAmount;
}

/**
 * Calculate market price from recent orders
 */
export function calculateMarketPrice(
  orders: OrderResponse[],
  orderType: 'buy' | 'sell'
): number | null {
  const prices = orders
    .filter((o) => o.price !== null && o.orderType === orderType)
    .map((o) => parseFloat(o.price!));

  if (prices.length === 0) return null;

  // Use median price to avoid outliers
  prices.sort((a, b) => a - b);
  const mid = Math.floor(prices.length / 2);

  if (prices.length % 2 === 0) {
    return (prices[mid - 1] + prices[mid]) / 2;
  }

  return prices[mid];
}

/**
 * Calculate floating price based on market price and margin
 */
export function calculateFloatingPrice(
  marketPrice: number,
  margin: number,
  orderType: 'buy' | 'sell'
): number {
  const marginMultiplier = 1 + margin / 100;

  if (orderType === 'buy') {
    // Buyer wants lower price
    return marketPrice / marginMultiplier;
  }

  // Seller wants higher price
  return marketPrice * marginMultiplier;
}

/**
 * Validate trade constraints
 */
export function validateTradeConstraints(
  order: OrderResponse,
  buyerStats: UserP2PStats | null
): { valid: boolean; reason?: string } {
  // Check minimum trade count
  if (order.minTradeCount && buyerStats) {
    if (buyerStats.completedTrades < order.minTradeCount) {
      return {
        valid: false,
        reason: `Minimum ${order.minTradeCount} completed trades required`,
      };
    }
  }

  // Check minimum completion rate
  if (order.minCompletionRate && buyerStats) {
    const minRate = parseFloat(order.minCompletionRate);
    if (buyerStats.completionRate < minRate) {
      return {
        valid: false,
        reason: `Minimum ${minRate}% completion rate required`,
      };
    }
  }

  return { valid: true };
}

/**
 * Time-priority sort
 *
 * When prices are equal, prioritize by creation time (FIFO)
 */
export function sortByTimePriority(orders: OrderResponse[]): OrderResponse[] {
  return orders.sort((a, b) => {
    const priceA = parseFloat(a.price || '0');
    const priceB = parseFloat(b.price || '0');

    if (priceA !== priceB) {
      return priceA - priceB;
    }

    // Same price: use time priority
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}
