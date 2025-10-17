/**
 * Orders Types
 * Type definitions for trading orders and positions
 */

/**
 * Order Types
 */
export type OrderType =
  | 'market'
  | 'limit'
  | 'stop_loss'
  | 'stop_loss_limit'
  | 'take_profit'
  | 'take_profit_limit'
  | 'trailing_stop'
  | 'trailing_stop_limit';

/**
 * Order Side
 */
export type OrderSide = 'buy' | 'sell';

/**
 * Order Status
 */
export type OrderStatus =
  | 'pending' // Order created but not yet submitted
  | 'open' // Order submitted and active
  | 'partially_filled' // Order partially filled
  | 'filled' // Order completely filled
  | 'canceled' // Order canceled by user
  | 'rejected' // Order rejected by exchange
  | 'expired'; // Order expired

/**
 * Time In Force
 */
export type TimeInForce =
  | 'GTC' // Good Till Cancel
  | 'IOC' // Immediate Or Cancel
  | 'FOK' // Fill Or Kill
  | 'PO'; // Post Only (maker-only)

/**
 * Position Side
 */
export type PositionSide = 'long' | 'short';

/**
 * Position Status
 */
export type PositionStatus = 'open' | 'closed' | 'liquidated';

/**
 * Trading Order
 */
export interface TradingOrder {
  id?: string;
  userId: string;
  tenantId: string;
  exchangeConnectionId: string;
  exchangeId: string;
  symbol: string;

  // Order identification
  clientOrderId: string;
  exchangeOrderId?: string;

  // Order type and parameters
  type: OrderType;
  side: OrderSide;
  timeInForce?: TimeInForce;

  // Price and quantity
  price?: number; // Limit price
  stopPrice?: number; // Stop price
  amount: number; // Order amount
  filled: number; // Filled amount
  remaining: number; // Remaining amount
  cost?: number; // Total cost
  average?: number; // Average fill price

  // Trailing stop parameters
  trailingDelta?: number;
  trailingPercent?: number;

  // Status
  status: OrderStatus;
  lastTradeTimestamp?: Date;

  // Fee information
  fee?: {
    cost: number;
    currency: string;
    rate?: number;
  };
  fees?: Array<{
    cost: number;
    currency: string;
    rate?: number;
  }>;

  // Metadata
  reduceOnly?: boolean;
  postOnly?: boolean;
  strategy?: string;
  notes?: string;
  info?: any;

  // Timestamps
  createdAt?: Date;
  submittedAt?: Date;
  updatedAt?: Date;
  filledAt?: Date;
  canceledAt?: Date;
}

/**
 * Order Fill/Trade
 */
export interface OrderFill {
  id?: string;
  orderId: string;
  userId: string;
  tenantId: string;
  exchangeId: string;
  symbol: string;

  // Trade identification
  tradeId: string;
  exchangeOrderId?: string;

  // Trade details
  price: number;
  amount: number;
  cost: number;
  side: OrderSide;
  takerOrMaker?: 'taker' | 'maker';

  // Fee information
  fee?: {
    cost: number;
    currency: string;
    rate?: number;
  };

  // Metadata
  info?: any;
  timestamp: Date;
  createdAt?: Date;
}

/**
 * Trading Position
 */
export interface TradingPosition {
  id?: string;
  userId: string;
  tenantId: string;
  exchangeConnectionId: string;
  exchangeId: string;
  symbol: string;

  // Position details
  side: PositionSide;
  contracts: number;
  contractSize?: number;
  leverage?: number;
  collateral?: number;

  // Entry details
  entryPrice: number;
  entryTimestamp: Date;

  // Current state
  markPrice?: number;
  liquidationPrice?: number;
  unrealizedPnl?: number;
  realizedPnl?: number;
  percentage?: number;

  // Stop loss and take profit
  stopLoss?: number;
  takeProfit?: number;

  // Margin details
  maintenanceMargin?: number;
  maintenanceMarginPercentage?: number;
  initialMargin?: number;
  initialMarginPercentage?: number;

  // Status
  status: PositionStatus;
  strategy?: string;

  // Metadata
  info?: any;
  createdAt?: Date;
  updatedAt?: Date;
  closedAt?: Date;
}

/**
 * Create Order Request
 */
export interface CreateOrderRequest {
  exchangeConnectionId: string;
  symbol: string;
  type: OrderType;
  side: OrderSide;
  amount: number;
  price?: number; // Required for limit orders
  stopPrice?: number; // Required for stop orders
  timeInForce?: TimeInForce;
  trailingDelta?: number; // For trailing stop
  trailingPercent?: number; // For trailing stop
  reduceOnly?: boolean;
  postOnly?: boolean;
  strategy?: string;
  notes?: string;
}

/**
 * Update Order Request
 */
export interface UpdateOrderRequest {
  amount?: number;
  price?: number;
  stopPrice?: number;
  trailingDelta?: number;
  trailingPercent?: number;
}

/**
 * Cancel Order Request
 */
export interface CancelOrderRequest {
  orderId: string;
  reason?: string;
}

/**
 * Order Query Options
 */
export interface OrderQueryOptions {
  userId?: string;
  tenantId?: string;
  exchangeId?: string;
  symbol?: string;
  status?: OrderStatus | OrderStatus[];
  strategy?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Position Query Options
 */
export interface PositionQueryOptions {
  userId?: string;
  tenantId?: string;
  exchangeId?: string;
  symbol?: string;
  status?: PositionStatus;
  strategy?: string;
  limit?: number;
  offset?: number;
}

/**
 * Order Statistics
 */
export interface OrderStatistics {
  totalOrders: number;
  openOrders: number;
  filledOrders: number;
  canceledOrders: number;
  rejectedOrders: number;
  totalVolume: number;
  totalCost: number;
  totalFees: number;
  averageFillRate: number; // Percentage of orders filled
  averageExecutionTime: number; // Average time to fill (ms)
}

/**
 * Position Statistics
 */
export interface PositionStatistics {
  totalPositions: number;
  openPositions: number;
  closedPositions: number;
  totalPnl: number;
  totalPnlPercentage: number;
  winRate: number; // Percentage of profitable positions
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  profitFactor: number; // Total wins / Total losses
}

/**
 * Order Book Entry
 */
export interface OrderBookEntry {
  id?: string;
  symbol: string;
  side: OrderSide;
  price: number;
  amount: number;
  orderId: string;
  userId: string;
  timestamp?: Date;
}

/**
 * Order Execution Result
 */
export interface OrderExecutionResult {
  success: boolean;
  order?: TradingOrder;
  fills?: OrderFill[];
  error?: string;
  message?: string;
}

/**
 * Batch Order Request
 */
export interface BatchOrderRequest {
  orders: CreateOrderRequest[];
}

/**
 * Batch Order Result
 */
export interface BatchOrderResult {
  success: number;
  failed: number;
  results: OrderExecutionResult[];
}

/**
 * Order Service Interface
 */
export interface IOrderService {
  // Order creation
  createOrder(userId: string, tenantId: string, request: CreateOrderRequest): Promise<TradingOrder>;
  createBatchOrders(
    userId: string,
    tenantId: string,
    requests: CreateOrderRequest[]
  ): Promise<BatchOrderResult>;

  // Order management
  getOrder(orderId: string, userId: string, tenantId: string): Promise<TradingOrder | null>;
  getOrders(options: OrderQueryOptions): Promise<TradingOrder[]>;
  updateOrder(
    orderId: string,
    userId: string,
    tenantId: string,
    updates: UpdateOrderRequest
  ): Promise<TradingOrder>;
  cancelOrder(orderId: string, userId: string, tenantId: string, reason?: string): Promise<TradingOrder>;
  cancelAllOrders(userId: string, tenantId: string, symbol?: string): Promise<number>;

  // Order fills
  getOrderFills(orderId: string): Promise<OrderFill[]>;

  // Order statistics
  getOrderStatistics(userId: string, tenantId: string, options?: OrderQueryOptions): Promise<OrderStatistics>;

  // Order sync (fetch from exchange)
  syncOrders(userId: string, tenantId: string, exchangeConnectionId: string): Promise<number>;
}

/**
 * Position Service Interface
 */
export interface IPositionService {
  // Position management
  getPosition(positionId: string, userId: string, tenantId: string): Promise<TradingPosition | null>;
  getPositions(options: PositionQueryOptions): Promise<TradingPosition[]>;
  updatePosition(positionId: string, updates: Partial<TradingPosition>): Promise<TradingPosition>;
  closePosition(positionId: string, userId: string, tenantId: string): Promise<TradingPosition>;

  // Position statistics
  getPositionStatistics(
    userId: string,
    tenantId: string,
    options?: PositionQueryOptions
  ): Promise<PositionStatistics>;

  // Position sync (fetch from exchange)
  syncPositions(userId: string, tenantId: string, exchangeConnectionId: string): Promise<number>;
}
