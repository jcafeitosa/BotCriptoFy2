/**
 * Order Book Types
 * Type definitions for advanced order book analysis
 *
 * Inspired by industry leaders:
 * - Bookmap (acquired by Nelogica) - Liquidity heatmap visualization
 * - ProfitPro - Pulse Indicator & order flow
 * - Institutional trading platforms
 */

import type { z } from 'zod';

/**
 * Order Book Level
 * Single price level in the order book
 */
export interface OrderBookLevel {
  price: number;
  amount: number;
  total?: number; // Cumulative amount (for depth visualization)
  count?: number; // Number of orders at this level
}

/**
 * Order Book Snapshot
 * Complete order book state at a point in time
 */
export interface OrderBookSnapshot {
  id?: string;
  exchangeId: string;
  symbol: string;
  timestamp: Date;

  // Order book levels
  bids: OrderBookLevel[]; // Sorted desc by price
  asks: OrderBookLevel[]; // Sorted asc by price

  // Level 1 (best bid/ask)
  bestBid?: number;
  bestBidSize?: number;
  bestAsk?: number;
  bestAskSize?: number;

  // Spread
  spread?: number;
  spreadPercent?: number;
  midPrice?: number;

  // Depth metrics
  bidDepth10?: number; // Total USD value in top 10 bid levels
  askDepth10?: number;
  bidDepth50?: number;
  askDepth50?: number;
  totalDepth?: number;

  // Metadata
  nonce?: number; // Exchange sequence number
  bidLevels?: number;
  askLevels?: number;
  isComplete?: boolean;

  createdAt?: Date;
}

/**
 * Order Book Delta
 * Incremental changes to order book
 */
export interface OrderBookDelta {
  id?: string;
  exchangeId: string;
  symbol: string;
  timestamp: Date;

  // Changes
  bidChanges?: OrderBookLevel[];
  askChanges?: OrderBookLevel[];

  changeType: 'add' | 'update' | 'remove';
  nonce?: number;

  createdAt?: Date;
}

/**
 * Order Book Level 1 (Top-of-Book)
 * Best bid and ask only
 */
export interface OrderBookLevel1 {
  id?: string;
  exchangeId: string;
  symbol: string;
  timestamp: Date;

  bestBid: number;
  bestBidSize: number;
  bestAsk: number;
  bestAskSize: number;

  spread?: number;
  spreadPercent?: number;
  midPrice?: number;

  createdAt?: Date;
}

/**
 * Liquidity Heatmap Data Point
 * Single data point for heatmap visualization (Bookmap-style)
 */
export interface LiquidityHeatmapPoint {
  id?: string;
  exchangeId: string;
  symbol: string;
  timestamp: Date;
  priceLevel: number;

  bidVolume: number;
  askVolume: number;
  totalVolume: number;

  intensity: number; // 0-100 (for color mapping)

  createdAt?: Date;
}

/**
 * Liquidity Heatmap Data
 * Complete heatmap data for a time period
 */
export interface LiquidityHeatmap {
  exchangeId: string;
  symbol: string;
  startTime: Date;
  endTime: Date;

  // 2D array: [timestamp][price_level]
  data: LiquidityHeatmapPoint[][];

  // Price bounds
  minPrice: number;
  maxPrice: number;

  // Intensity scale
  minIntensity: number;
  maxIntensity: number;
}

/**
 * Order Book Imbalance
 * Imbalance metrics at multiple depth levels
 */
export interface OrderBookImbalance {
  id?: string;
  exchangeId: string;
  symbol: string;
  timestamp: Date;

  // Imbalance at different depths: (bid-ask)/(bid+ask)
  imbalance5: number; // Top 5 levels
  imbalance10: number;
  imbalance20: number;
  imbalance50: number;

  // Volume imbalance (USD value)
  volumeImbalance: number;

  // Pressure score (-100 to +100)
  // Positive = buying pressure, Negative = selling pressure
  pressureScore: number;

  // Momentum (rate of change)
  imbalanceMomentum?: number;

  // Cumulative imbalance (over time window)
  cumulativeImbalance?: number;

  createdAt?: Date;
}

/**
 * Pulse Indicator Signal (ProfitPro-style)
 * Real-time momentum signals from order book
 */
export interface PulseSignal {
  exchangeId: string;
  symbol: string;
  timestamp: Date;

  // Signal direction
  direction: 'bullish' | 'bearish' | 'neutral';

  // Signal strength (0-100)
  strength: number;

  // Components
  imbalance: number;
  pressure: number;
  momentum: number;

  // Confidence (0-100)
  confidence: number;

  // Trigger reason
  reason: string;
}

/**
 * Liquidity Zone
 * Identified support/resistance based on liquidity clustering
 */
export interface LiquidityZone {
  id?: string;
  exchangeId: string;
  symbol: string;

  // Zone definition
  priceLevel: number;
  priceRange?: number; // +/- range
  side: 'bid' | 'ask' | 'both';

  // Liquidity metrics
  totalLiquidity: number;
  averageSize?: number;
  orderCount?: number;

  // Classification
  zoneType: 'support' | 'resistance' | 'accumulation' | 'distribution';
  strength: number; // 0-100

  // Detection
  detectedAt: Date;
  lastSeenAt: Date;
  confidenceScore?: number;

  // Status
  isActive: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Large Order Detection (Iceberg/Hidden Liquidity)
 */
export interface LargeOrder {
  id?: string;
  exchangeId: string;
  symbol: string;
  timestamp: Date;

  // Order details
  side: 'bid' | 'ask';
  priceLevel: number;

  // Size metrics
  visibleSize: number;
  estimatedTotalSize?: number;
  icebergProbability: number; // 0-100

  // Classification
  orderType: 'iceberg' | 'whale' | 'market_maker';

  // Impact
  potentialImpact?: number; // % price impact if filled

  // Status
  status: 'active' | 'partially_filled' | 'filled' | 'cancelled';
  filledSize: number;

  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Spoofing Event
 * Detected spoofing/layering attempts
 */
export interface SpoofingEvent {
  id?: string;
  exchangeId: string;
  symbol: string;
  detectedAt: Date;

  // Pattern
  side: 'bid' | 'ask';
  priceLevel: number;
  orderSize?: number;

  // Detection
  spoofingType: 'layering' | 'quote_stuffing' | 'wash_trading';
  confidenceScore: number; // 0-100

  // Pattern details
  orderLifetimeMs?: number;
  layerCount?: number;

  // Impact
  marketImpact?: number;

  // Resolution
  resolved: boolean;
  resolvedAt?: Date;
  resolution?: string;

  createdAt?: Date;
}

/**
 * Order Flow Toxicity (VPIN)
 * Volume-Synchronized Probability of Informed Trading
 */
export interface OrderFlowToxicity {
  id?: string;
  exchangeId: string;
  symbol: string;
  timestamp: Date;

  // VPIN metric (0-1)
  vpin: number;

  // Components
  volumeBuckets: number;
  buyVolume?: number;
  sellVolume?: number;
  orderImbalance?: number;

  // Classification
  toxicityLevel: 'low' | 'medium' | 'high' | 'extreme';

  // Moving averages
  vpinMA5?: number;
  vpinMA20?: number;

  createdAt?: Date;
}

/**
 * Price Impact Estimate
 * Estimated price impact for different order sizes
 */
export interface PriceImpactEstimate {
  id?: string;
  exchangeId: string;
  symbol: string;
  calculatedAt: Date;

  // Impact by size tier (% impact)
  impact1k?: number; // $1,000
  impact5k?: number;
  impact10k?: number;
  impact50k?: number;
  impact100k?: number;
  impact500k?: number;
  impact1m?: number; // $1M

  // Slippage estimates (absolute price)
  slippage1k?: number;
  slippage10k?: number;
  slippage100k?: number;

  // Context
  liquidityScore?: number;

  createdAt?: Date;
}

/**
 * Liquidity Score
 * Composite liquidity scoring
 */
export interface LiquidityScore {
  id?: string;
  exchangeId: string;
  symbol: string;
  timestamp: Date;

  // Overall score (0-100)
  score: number;

  // Component scores
  depthScore?: number;
  spreadScore?: number;
  volumeScore?: number;
  stabilityScore?: number;

  // Liquidity regime
  regime: 'abundant' | 'normal' | 'scarce' | 'crisis';

  // Metadata
  bidDepth?: number;
  askDepth?: number;
  spread?: number;

  createdAt?: Date;
}

/**
 * Footprint Chart Data (ProfitPro/Nelogica-style)
 * Order flow visualization data
 */
export interface FootprintData {
  exchangeId: string;
  symbol: string;
  timeframe: string; // 1m, 5m, etc
  timestamp: Date;

  // OHLC
  open: number;
  high: number;
  low: number;
  close: number;

  // Volume breakdown by price level
  priceVolumes: FootprintPriceLevel[];

  // Aggregated metrics
  totalVolume: number;
  buyVolume: number;
  sellVolume: number;
  delta: number; // Buy - Sell

  // Imbalance at high/low
  highImbalance?: number;
  lowImbalance?: number;

  // Point of Control (POC)
  poc?: number; // Price with highest volume
}

/**
 * Footprint Price Level
 * Volume data for a single price level in footprint chart
 */
export interface FootprintPriceLevel {
  price: number;
  buyVolume: number;
  sellVolume: number;
  totalVolume: number;
  delta: number; // Buy - Sell
  imbalance: number; // (Buy-Sell)/(Buy+Sell)
}

/**
 * Microstructure Metrics
 * Aggregated market microstructure metrics
 */
export interface MicrostructureMetrics {
  id?: string;
  exchangeId: string;
  symbol: string;
  timestamp: Date;
  intervalMinutes: number; // 1, 5, 15, 60

  // Order flow
  totalOrders?: number;
  totalCancels?: number;
  cancelRate?: number;

  // Liquidity
  averageSpread?: number;
  averageDepth?: number;
  depthVolatility?: number;

  // Price
  priceVolatility?: number;
  returnVariance?: number;

  // Noise
  microstructureNoise?: number;
  effectiveSpread?: number;
  realizedSpread?: number;

  // Queue
  averageQueuePosition?: number;
  queueJumps?: number;

  createdAt?: Date;
}

/**
 * Order Book Subscription
 * WebSocket subscription management
 */
export interface OrderBookSubscription {
  id?: string;
  userId: string;
  tenantId: string;

  // Subscription
  exchangeId: string;
  symbol: string;
  depth: number; // Number of levels to stream

  // Stream settings
  updateIntervalMs: number; // 100ms, 1s, etc
  includeDelta: boolean; // Stream deltas or full snapshots

  // Filters
  minPrice?: number;
  maxPrice?: number;
  minSize?: number;

  // Status
  status: 'active' | 'paused' | 'stopped';
  connectionId?: string;

  createdAt?: Date;
  updatedAt?: Date;
  lastMessageAt?: Date;
}

/**
 * Order Book Query Options
 */
export interface OrderBookQueryOptions {
  exchangeId: string;
  symbol: string;
  limit?: number; // Number of levels per side
  depth?: number; // Depth in levels (5, 10, 20, 50, 100, 200)
}

/**
 * Order Book Historical Query Options
 */
export interface OrderBookHistoricalQuery extends OrderBookQueryOptions {
  startTime: Date;
  endTime: Date;
  interval?: number; // Milliseconds between snapshots
}

/**
 * Order Book Analytics Response
 */
export interface OrderBookAnalytics {
  exchangeId: string;
  symbol: string;
  timestamp: Date;

  // Current state
  snapshot: OrderBookSnapshot;

  // Metrics
  imbalance: OrderBookImbalance;
  liquidityScore: LiquidityScore;
  toxicity?: OrderFlowToxicity;

  // Zones
  liquidityZones: LiquidityZone[];
  largeOrders: LargeOrder[];

  // Signals
  pulseSignal?: PulseSignal;
}

/**
 * Multi-Exchange Order Book Aggregation
 */
export interface AggregatedOrderBook {
  symbol: string;
  timestamp: Date;

  // Aggregated levels
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];

  // Best across exchanges
  bestBid: number;
  bestBidExchange: string;
  bestAsk: number;
  bestAskExchange: string;

  // Spread
  spread: number;
  spreadPercent: number;

  // Depth
  totalDepth: number;

  // Liquidity fragmentation
  fragmentationIndex: number; // 0-1 (0 = all on one exchange, 1 = evenly distributed)

  // Exchange breakdown
  exchanges: {
    exchangeId: string;
    bidDepth: number;
    askDepth: number;
    spread: number;
    liquidityShare: number; // % of total liquidity
  }[];
}

/**
 * DOM (Depth of Market) Display Data (Nelogica-style)
 * Data structure for DOM visualization
 */
export interface DOMDisplayData {
  exchangeId: string;
  symbol: string;
  timestamp: Date;

  // Levels (sorted)
  levels: DOMLevelData[];

  // Summary
  totalBidVolume: number;
  totalAskVolume: number;
  totalBidOrders: number;
  totalAskOrders: number;

  // Spread highlight
  midPrice: number;
  spread: number;
  spreadPercent: number;
}

/**
 * DOM Level Data
 * Single level in DOM display
 */
export interface DOMLevelData {
  price: number;

  // Bid side
  bidSize?: number;
  bidOrders?: number;
  bidIntensity?: number; // 0-100 for visualization

  // Ask side
  askSize?: number;
  askOrders?: number;
  askIntensity?: number;

  // Cumulative
  cumulativeBidSize?: number;
  cumulativeAskSize?: number;

  // Highlights
  isLiquidityZone?: boolean;
  isLargeOrder?: boolean;
  imbalance?: number;
}

/**
 * Volume Profile Data (for Order Flow analysis)
 */
export interface VolumeProfileData {
  exchangeId: string;
  symbol: string;
  startTime: Date;
  endTime: Date;

  // Profile
  priceLevels: VolumeProfileLevel[];

  // Key levels
  poc: number; // Point of Control (highest volume price)
  vah: number; // Value Area High
  val: number; // Value Area Low

  // Statistics
  totalVolume: number;
  valueAreaVolume: number; // 70% of volume
  valueAreaPercent: number; // % of price range in value area
}

/**
 * Volume Profile Level
 */
export interface VolumeProfileLevel {
  price: number;
  volume: number;
  volumePercent: number; // % of total volume
  buyVolume: number;
  sellVolume: number;
  delta: number;
}

/**
 * Order Book Stream Event (WebSocket)
 */
export type OrderBookStreamEvent =
  | { type: 'snapshot'; data: OrderBookSnapshot }
  | { type: 'delta'; data: OrderBookDelta }
  | { type: 'level1'; data: OrderBookLevel1 }
  | { type: 'imbalance'; data: OrderBookImbalance }
  | { type: 'pulse_signal'; data: PulseSignal }
  | { type: 'large_order'; data: LargeOrder }
  | { type: 'spoofing'; data: SpoofingEvent };

/**
 * Order Book Depth Chart Data
 * Data for depth chart visualization
 */
export interface DepthChartData {
  exchangeId: string;
  symbol: string;
  timestamp: Date;

  // Cumulative data points
  bids: { price: number; cumulative: number }[];
  asks: { price: number; cumulative: number }[];

  // Highlights
  bestBid: number;
  bestAsk: number;
  midPrice: number;
}
