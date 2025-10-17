/**
 * P2P Marketplace Types
 *
 * Type definitions for P2P marketplace module
 */

import type {
  OrderType,
  OrderStatus,
  PriceType,
  TradeStatus,
  EscrowStatus,
  DisputeStatus,
  DisputeReason,
  FeeType,
} from '../schema/p2p.schema';

/**
 * Order Creation Request
 */
export interface CreateOrderRequest {
  tenantId: string;
  userId: string;
  orderType: OrderType;
  cryptocurrency: string;
  fiatCurrency: string;
  priceType: PriceType;
  price?: number;
  priceMargin?: number;
  minAmount: number;
  maxAmount: number;
  availableAmount: number;
  paymentTimeLimit?: number;
  paymentMethods: string[];
  terms?: string;
  autoReply?: string;
  minTradeCount?: number;
  minCompletionRate?: number;
  verifiedUsersOnly?: boolean;
  expiresAt?: Date;
}

/**
 * Order Response
 */
export interface OrderResponse {
  id: string;
  userId: string;
  orderType: OrderType;
  cryptocurrency: string;
  fiatCurrency: string;
  priceType: PriceType;
  price: string | null;
  priceMargin: string | null;
  minAmount: string;
  maxAmount: string;
  availableAmount: string;
  paymentTimeLimit: number;
  paymentMethods: string[];
  terms: string | null;
  status: OrderStatus;
  totalTrades: number;
  completedTrades: number;
  minTradeCount?: number;
  minCompletionRate?: string;
  verifiedUsersOnly?: boolean;
  autoReply?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Trade Creation Request
 */
export interface CreateTradeRequest {
  tenantId: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  cryptoAmount: number;
  fiatAmount: number;
  price: number;
  paymentMethod: string;
  paymentDetails: Record<string, any>;
}

/**
 * Trade Response
 */
export interface TradeResponse {
  id: string;
  orderId: string;
  sellerId: string;
  buyerId: string;
  cryptocurrency: string;
  cryptoAmount: string;
  fiatCurrency: string;
  fiatAmount: string;
  price: string;
  paymentMethod: string;
  status: TradeStatus;
  paymentDeadline: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Escrow Response
 */
export interface EscrowResponse {
  id: string;
  tradeId: string;
  cryptocurrency: string;
  amount: string;
  holderId: string;
  status: EscrowStatus;
  lockedAt: Date;
  releasedAt: Date | null;
}

/**
 * Message Request
 */
export interface SendMessageRequest {
  tenantId: string;
  tradeId: string;
  senderId: string;
  recipientId: string;
  message: string;
  attachments?: any[];
}

/**
 * Message Response
 */
export interface MessageResponse {
  id: string;
  tradeId: string;
  senderId: string;
  recipientId: string;
  message: string;
  attachments: any[];
  isRead: boolean;
  isSystem: boolean;
  createdAt: Date;
}

/**
 * Dispute Request
 */
export interface CreateDisputeRequest {
  tenantId: string;
  tradeId: string;
  openedBy: string;
  reason: DisputeReason;
  description: string;
  evidence?: any[];
}

/**
 * Dispute Response
 */
export interface DisputeResponse {
  id: string;
  tradeId: string;
  openedBy: string;
  reason: DisputeReason;
  description: string;
  status: DisputeStatus;
  assignedTo: string | null;
  resolution: string | null;
  resolvedInFavorOf: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Reputation Request
 */
export interface CreateReputationRequest {
  tenantId: string;
  tradeId: string;
  reviewerId: string;
  reviewedUserId: string;
  rating: number;
  comment?: string;
}

/**
 * Reputation Response
 */
export interface ReputationResponse {
  id: string;
  tradeId: string;
  reviewerId: string;
  reviewedUserId: string;
  rating: number;
  comment: string | null;
  isPositive: boolean;
  createdAt: Date;
}

/**
 * User Stats
 */
export interface UserP2PStats {
  userId: string;
  totalTrades: number;
  completedTrades: number;
  completionRate: number;
  averageRating: number;
  totalReviews: number;
  positiveReviews: number;
  negativeReviews: number;
  totalVolume: string;
  averageTradeTime: number;
  disputesOpened: number;
  disputesAgainst: number;
}

/**
 * Payment Method Request
 */
export interface CreatePaymentMethodRequest {
  tenantId: string;
  userId: string;
  methodType: string;
  methodName: string;
  details: Record<string, any>;
}

/**
 * Payment Method Response
 */
export interface PaymentMethodResponse {
  id: string;
  userId: string;
  methodType: string;
  methodName: string;
  details: Record<string, any>;
  isActive: boolean;
  isVerified: boolean;
  timesUsed: number;
  createdAt: Date;
}

/**
 * Fee Calculation Request
 */
export interface FeeCalculationRequest {
  tenantId: string;
  feeType: FeeType;
  cryptocurrency: string;
  amount: number;
  userVolume?: number;
}

/**
 * Fee Calculation Response
 */
export interface FeeCalculationResponse {
  feeType: FeeType;
  cryptocurrency: string;
  amount: string;
  percentage: string;
  fixedAmount: string;
  totalFee: string;
}

/**
 * Order Matching Result
 */
export interface OrderMatchingResult {
  orderId: string;
  matchScore: number;
  priceCompetitiveness: number;
  userReputation: number;
  availabilityScore: number;
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
 * Pagination
 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

/**
 * Order Filters
 */
export interface OrderFilters extends PaginationParams {
  orderType?: OrderType;
  cryptocurrency?: string;
  fiatCurrency?: string;
  status?: OrderStatus;
  minPrice?: number;
  maxPrice?: number;
  paymentMethods?: string[];
}

/**
 * Trade Filters
 */
export interface TradeFilters extends PaginationParams {
  status?: TradeStatus;
  userId?: string;
  cryptocurrency?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * WebSocket Events
 */
export interface WebSocketMessage {
  type: 'message' | 'trade_update' | 'order_update' | 'system';
  data: any;
  timestamp: Date;
}

/**
 * Trade Update Event
 */
export interface TradeUpdateEvent {
  tradeId: string;
  status: TradeStatus;
  updatedBy: string;
  timestamp: Date;
}

/**
 * Order Update Event
 */
export interface OrderUpdateEvent {
  orderId: string;
  status: OrderStatus;
  availableAmount: string;
  timestamp: Date;
}

/**
 * Escrow Lock Request
 */
export interface EscrowLockRequest {
  tenantId: string;
  tradeId: string;
  cryptocurrency: string;
  amount: number;
  holderId: string;
}

/**
 * Escrow Release Request
 */
export interface EscrowReleaseRequest {
  tradeId: string;
  releaseTo: string;
}

/**
 * Reputation Summary
 */
export interface ReputationSummary {
  userId: string;
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  positivePercentage: number;
  recentReviews: ReputationResponse[];
}
