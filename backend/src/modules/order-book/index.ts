/**
 * Order Book Module Main Export
 *
 * Advanced Order Book Analysis Module
 * Inspired by industry leaders: Bookmap, ProfitPro, Nelogica
 */

// Schema
export * from './schema/order-book.schema';

// Types (selective export to avoid duplicates)
export type {
  OrderBookLevel,
  OrderBookSnapshot,
  OrderBookDelta,
  OrderBookLevel1,
  LiquidityHeatmapPoint,
  LiquidityHeatmap,
  OrderBookImbalance,
  PulseSignal,
  LiquidityZone,
  LargeOrder,
  SpoofingEvent,
  OrderFlowToxicity,
  PriceImpactEstimate,
  LiquidityScore,
  FootprintData,
  FootprintPriceLevel,
  MicrostructureMetrics,
  OrderBookSubscription,
  OrderBookQueryOptions,
  OrderBookHistoricalQuery,
  OrderBookAnalytics,
  AggregatedOrderBook,
  DOMDisplayData,
  DOMLevelData,
  VolumeProfileData,
  VolumeProfileLevel,
  OrderBookStreamEvent,
  DepthChartData,
} from './types/order-book.types';

// Core Services (✅ Implemented)
export * from './services/order-book-snapshot.service';
export * from './services/order-book-analytics.service';
export * from './services/liquidity-heatmap.service';
export * from './services/order-book-imbalance.service';

// Trading Signal Services (✅ Implemented)
export * from './services/pulse-indicator.service';
export * from './services/footprint-chart.service';

// Trading Interface Services (✅ Implemented)
export * from './services/superdom.service';

// Market Microstructure Services (✅ Implemented)
export * from './services/microstructure.service';

// Detection & Analysis Services (✅ Implemented)
export * from './services/large-order-detection.service';

// Execution & Cost Analysis Services (✅ Implemented)
export * from './services/price-impact.service';

// Multi-Exchange Services (✅ Implemented)
export * from './services/order-book-aggregator.service';

// Routes (✅ Implemented)
export { orderBookRoutes } from './routes/order-book.routes';
