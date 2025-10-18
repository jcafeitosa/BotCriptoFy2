/**
 * Order Book Routes
 * REST API endpoints for advanced order book analysis
 *
 * Modules:
 * - Order Book Snapshots (Level 1 & Full Depth)
 * - Analytics & Metrics
 * - Liquidity Heatmaps
 * - Imbalance Detection
 * - Pulse Indicators
 * - Footprint Charts
 * - SuperDOM Interface
 * - Market Microstructure
 * - Large Order Detection
 * - Price Impact Analysis
 * - Multi-Exchange Aggregation
 */

import { Elysia, t } from 'elysia';
import { OrderBookSnapshotService } from '../services/order-book-snapshot.service';
import { OrderBookAnalyticsService } from '../services/order-book-analytics.service';
import { LiquidityHeatmapService } from '../services/liquidity-heatmap.service';
import { OrderBookImbalanceService } from '../services/order-book-imbalance.service';
import { PulseIndicatorService } from '../services/pulse-indicator.service';
import { FootprintChartService } from '../services/footprint-chart.service';
import { SuperDOMService } from '../services/superdom.service';
import { MicrostructureService } from '../services/microstructure.service';
import { LargeOrderDetectionService } from '../services/large-order-detection.service';
import { PriceImpactService } from '../services/price-impact.service';
import { OrderBookAggregatorService } from '../services/order-book-aggregator.service';
import logger from '@/utils/logger';

export const orderBookRoutes = new Elysia({ prefix: '/order-book' })
  /**
   * =================================================================
   * ORDER BOOK SNAPSHOTS
   * =================================================================
   */
  .get(
    '/snapshot',
    async ({ query }: any) => {
      logger.info('Fetching order book snapshot', query);
      const snapshot = await OrderBookSnapshotService.fetchAndStore({
        exchangeId: query.exchangeId,
        symbol: query.symbol,
        limit: query.limit,
      });
      return snapshot;
    },
    {
      query: t.Object({
        exchangeId: t.String({ description: 'Exchange ID (e.g., binance, coinbase)' }),
        symbol: t.String({ description: 'Trading pair (e.g., BTC/USDT)' }),
        limit: t.Optional(t.Number({ description: 'Number of levels (default: 20)', minimum: 1, maximum: 100 })),
      }),
      detail: {
        summary: 'Get order book snapshot',
        description: 'Fetch and store a full order book snapshot from exchange',
        tags: ['Order Book - Snapshots'],
      },
    }
  )

  .get(
    '/level1',
    async ({ query }: any) => {
      logger.info('Fetching Level 1 order book', query);
      const level1 = await OrderBookSnapshotService.getLatestLevel1(query.exchangeId, query.symbol);
      return level1;
    },
    {
      query: t.Object({
        exchangeId: t.String(),
        symbol: t.String(),
      }),
      detail: {
        summary: 'Get Level 1 (Top of Book)',
        description: 'Get latest best bid/ask prices and sizes',
        tags: ['Order Book - Snapshots'],
      },
    }
  )

  .get(
    '/historical',
    async ({ query }: any) => {
      logger.info('Fetching historical snapshots', query);
      const snapshots = await OrderBookSnapshotService.getHistoricalSnapshots({
        exchangeId: query.exchangeId,
        symbol: query.symbol,
        startTime: new Date(query.startTime),
        endTime: new Date(query.endTime),
        limit: query.limit,
      });
      return snapshots;
    },
    {
      query: t.Object({
        exchangeId: t.String(),
        symbol: t.String(),
        startTime: t.String({ description: 'ISO 8601 timestamp' }),
        endTime: t.String({ description: 'ISO 8601 timestamp' }),
        limit: t.Optional(t.Number({ default: 100 })),
      }),
      detail: {
        summary: 'Get historical snapshots',
        description: 'Retrieve order book snapshots for a time range',
        tags: ['Order Book - Snapshots'],
      },
    }
  )

  .get(
    '/statistics',
    async ({ query }: any) => {
      logger.info('Calculating snapshot statistics', query);
      const stats = await OrderBookSnapshotService.getSnapshotStatistics(
        query.exchangeId,
        query.symbol,
        new Date(query.startTime),
        new Date(query.endTime)
      );
      return stats;
    },
    {
      query: t.Object({
        exchangeId: t.String(),
        symbol: t.String(),
        startTime: t.String({ description: 'ISO 8601 timestamp' }),
        endTime: t.String({ description: 'ISO 8601 timestamp' }),
      }),
      detail: {
        summary: 'Get snapshot statistics',
        description: 'Calculate aggregated statistics (avg spread, depth, imbalance) for a period',
        tags: ['Order Book - Snapshots'],
      },
    }
  )

  /**
   * =================================================================
   * ANALYTICS & METRICS
   * =================================================================
   */
  .get(
    '/analytics',
    async ({ query }: any) => {
      logger.info('Calculating order book analytics', query);
      const analytics = await OrderBookAnalyticsService.calculateAnalytics({
        exchangeId: query.exchangeId,
        symbol: query.symbol,
        limit: query.limit,
      });
      return analytics;
    },
    {
      query: t.Object({
        exchangeId: t.String(),
        symbol: t.String(),
        limit: t.Optional(t.Number({ default: 20 })),
      }),
      detail: {
        summary: 'Calculate order book analytics',
        description: 'Get comprehensive order book metrics and analytics',
        tags: ['Order Book - Analytics'],
      },
    }
  )

  /**
   * =================================================================
   * LIQUIDITY HEATMAP
   * =================================================================
   */
  .get(
    '/heatmap',
    async ({ query }: any) => {
      logger.info('Generating liquidity heatmap', query);
      const heatmap = await LiquidityHeatmapService.generateHeatmap({
        exchangeId: query.exchangeId,
        symbol: query.symbol,
        timeframe: query.timeframe,
        priceRange: query.priceRange,
        resolution: query.resolution,
      });
      return heatmap;
    },
    {
      query: t.Object({
        exchangeId: t.String(),
        symbol: t.String(),
        timeframe: t.Optional(t.String({ description: 'Timeframe (e.g., 1h, 4h, 1d)', default: '1h' })),
        priceRange: t.Optional(t.Number({ description: 'Price range % around current price', default: 5 })),
        resolution: t.Optional(t.Number({ description: 'Number of price levels', default: 50 })),
      }),
      detail: {
        summary: 'Generate liquidity heatmap',
        description: 'Create a visual heatmap of liquidity distribution over time and price',
        tags: ['Order Book - Liquidity'],
      },
    }
  )

  .get(
    '/liquidity/zones',
    async ({ query }: any) => {
      logger.info('Detecting liquidity zones', query);
      const zones = await LiquidityHeatmapService.detectLiquidityZones({
        exchangeId: query.exchangeId,
        symbol: query.symbol,
        limit: query.limit,
      });
      return zones;
    },
    {
      query: t.Object({
        exchangeId: t.String(),
        symbol: t.String(),
        limit: t.Optional(t.Number({ default: 20 })),
      }),
      detail: {
        summary: 'Detect liquidity zones',
        description: 'Identify areas of concentrated liquidity (support/resistance)',
        tags: ['Order Book - Liquidity'],
      },
    }
  )

  /**
   * =================================================================
   * IMBALANCE DETECTION
   * =================================================================
   */
  .get(
    '/imbalance',
    async ({ query }: any) => {
      logger.info('Calculating order book imbalance', query);
      const imbalance = await OrderBookImbalanceService.calculateImbalance({
        exchangeId: query.exchangeId,
        symbol: query.symbol,
        depth: query.depth,
      });
      return imbalance;
    },
    {
      query: t.Object({
        exchangeId: t.String(),
        symbol: t.String(),
        depth: t.Optional(t.Number({ description: 'Number of levels to analyze', default: 10 })),
      }),
      detail: {
        summary: 'Calculate order book imbalance',
        description: 'Measure buy/sell pressure through bid/ask imbalance',
        tags: ['Order Book - Imbalance'],
      },
    }
  )

  .get(
    '/imbalance/stream',
    async ({ query }: any) => {
      logger.info('Streaming imbalance history', query);
      const history = await OrderBookImbalanceService.getImbalanceHistory({
        exchangeId: query.exchangeId,
        symbol: query.symbol,
        startTime: new Date(query.startTime),
        endTime: new Date(query.endTime),
        limit: query.limit,
      });
      return history;
    },
    {
      query: t.Object({
        exchangeId: t.String(),
        symbol: t.String(),
        startTime: t.String(),
        endTime: t.String(),
        limit: t.Optional(t.Number({ default: 100 })),
      }),
      detail: {
        summary: 'Get imbalance history',
        description: 'Retrieve historical order book imbalance data',
        tags: ['Order Book - Imbalance'],
      },
    }
  )

  /**
   * =================================================================
   * PULSE INDICATOR
   * =================================================================
   */
  .get(
    '/pulse',
    async ({ query }: any) => {
      logger.info('Calculating pulse indicator', query);
      const pulse = await PulseIndicatorService.calculatePulse({
        exchangeId: query.exchangeId,
        symbol: query.symbol,
        depth: query.depth,
        threshold: query.threshold,
      });
      return pulse;
    },
    {
      query: t.Object({
        exchangeId: t.String(),
        symbol: t.String(),
        depth: t.Optional(t.Number({ default: 10 })),
        threshold: t.Optional(t.Number({ description: 'Signal threshold (0-1)', default: 0.6 })),
      }),
      detail: {
        summary: 'Calculate Pulse Indicator',
        description: 'Detect aggressive buying/selling through large bid/ask shifts',
        tags: ['Order Book - Signals'],
      },
    }
  )

  .get(
    '/pulse/signals',
    async ({ query }: any) => {
      logger.info('Getting pulse signals', query);
      const signals = await PulseIndicatorService.getPulseSignals({
        exchangeId: query.exchangeId,
        symbol: query.symbol,
        startTime: new Date(query.startTime),
        endTime: new Date(query.endTime),
        limit: query.limit,
      });
      return signals;
    },
    {
      query: t.Object({
        exchangeId: t.String(),
        symbol: t.String(),
        startTime: t.String(),
        endTime: t.String(),
        limit: t.Optional(t.Number({ default: 50 })),
      }),
      detail: {
        summary: 'Get pulse signals history',
        description: 'Retrieve historical pulse trading signals',
        tags: ['Order Book - Signals'],
      },
    }
  )

  /**
   * =================================================================
   * FOOTPRINT CHART
   * =================================================================
   */
  .get(
    '/footprint',
    async ({ query }: any) => {
      logger.info('Generating footprint chart', query);
      const footprint = await FootprintChartService.generateFootprint({
        exchangeId: query.exchangeId,
        symbol: query.symbol,
        timeframe: query.timeframe,
        bars: query.bars,
      });
      return footprint;
    },
    {
      query: t.Object({
        exchangeId: t.String(),
        symbol: t.String(),
        timeframe: t.Optional(t.String({ description: 'Timeframe (e.g., 1m, 5m, 15m)', default: '5m' })),
        bars: t.Optional(t.Number({ description: 'Number of bars', default: 50 })),
      }),
      detail: {
        summary: 'Generate Footprint Chart',
        description: 'Create a footprint chart showing volume distribution at each price level',
        tags: ['Order Book - Visualization'],
      },
    }
  )

  /**
   * =================================================================
   * SUPERDOM (DEPTH OF MARKET)
   * =================================================================
   */
  .get(
    '/superdom',
    async ({ query }: any) => {
      logger.info('Generating SuperDOM view', query);
      const superdom = await SuperDOMService.generateDOMView({
        exchangeId: query.exchangeId,
        symbol: query.symbol,
        depth: query.depth,
      });
      return superdom;
    },
    {
      query: t.Object({
        exchangeId: t.String(),
        symbol: t.String(),
        depth: t.Optional(t.Number({ description: 'Number of levels to show', default: 20 })),
      }),
      detail: {
        summary: 'Get SuperDOM view',
        description: 'Get enhanced Depth of Market (DOM) visualization data',
        tags: ['Order Book - Visualization'],
      },
    }
  )

  .get(
    '/volume-profile',
    async ({ query }: any) => {
      logger.info('Generating volume profile', query);
      const profile = await SuperDOMService.generateVolumeProfile({
        exchangeId: query.exchangeId,
        symbol: query.symbol,
        startTime: new Date(query.startTime),
        endTime: new Date(query.endTime),
        resolution: query.resolution,
      });
      return profile;
    },
    {
      query: t.Object({
        exchangeId: t.String(),
        symbol: t.String(),
        startTime: t.String(),
        endTime: t.String(),
        resolution: t.Optional(t.Number({ description: 'Number of price levels', default: 50 })),
      }),
      detail: {
        summary: 'Get Volume Profile',
        description: 'Generate volume profile showing traded volume at each price level',
        tags: ['Order Book - Visualization'],
      },
    }
  )

  /**
   * =================================================================
   * MARKET MICROSTRUCTURE
   * =================================================================
   */
  .get(
    '/microstructure',
    async ({ query }: any) => {
      logger.info('Analyzing market microstructure', query);
      const metrics = await MicrostructureService.analyzeMetrics({
        exchangeId: query.exchangeId,
        symbol: query.symbol,
        depth: query.depth,
      });
      return metrics;
    },
    {
      query: t.Object({
        exchangeId: t.String(),
        symbol: t.String(),
        depth: t.Optional(t.Number({ default: 20 })),
      }),
      detail: {
        summary: 'Analyze market microstructure',
        description: 'Calculate advanced microstructure metrics (spread, depth, resilience)',
        tags: ['Order Book - Microstructure'],
      },
    }
  )

  .get(
    '/toxicity',
    async ({ query }: any) => {
      logger.info('Detecting order flow toxicity', query);
      const toxicity = await MicrostructureService.detectOrderFlowToxicity({
        exchangeId: query.exchangeId,
        symbol: query.symbol,
        window: query.window,
      });
      return toxicity;
    },
    {
      query: t.Object({
        exchangeId: t.String(),
        symbol: t.String(),
        window: t.Optional(t.Number({ description: 'Time window in minutes', default: 5 })),
      }),
      detail: {
        summary: 'Detect order flow toxicity',
        description: 'Identify toxic order flow and adverse selection risk',
        tags: ['Order Book - Microstructure'],
      },
    }
  )

  /**
   * =================================================================
   * LARGE ORDER DETECTION
   * =================================================================
   */
  .get(
    '/large-orders',
    async ({ query }: any) => {
      logger.info('Detecting large orders', query);
      const orders = await LargeOrderDetectionService.detectLargeOrders({
        exchangeId: query.exchangeId,
        symbol: query.symbol,
        minSize: query.minSize,
        lookback: query.lookback,
      });
      return orders;
    },
    {
      query: t.Object({
        exchangeId: t.String(),
        symbol: t.String(),
        minSize: t.Optional(t.Number({ description: 'Minimum order size (USD)', default: 100000 })),
        lookback: t.Optional(t.Number({ description: 'Lookback period (minutes)', default: 60 })),
      }),
      detail: {
        summary: 'Detect large orders',
        description: 'Identify institutional-sized orders and walls',
        tags: ['Order Book - Detection'],
      },
    }
  )

  .get(
    '/spoofing',
    async ({ query }: any) => {
      logger.info('Detecting spoofing', query);
      const events = await LargeOrderDetectionService.detectSpoofing({
        exchangeId: query.exchangeId,
        symbol: query.symbol,
        minSize: query.minSize,
        window: query.window,
      });
      return events;
    },
    {
      query: t.Object({
        exchangeId: t.String(),
        symbol: t.String(),
        minSize: t.Optional(t.Number({ default: 50000 })),
        window: t.Optional(t.Number({ description: 'Detection window (minutes)', default: 10 })),
      }),
      detail: {
        summary: 'Detect spoofing events',
        description: 'Identify potential spoofing and layering manipulation',
        tags: ['Order Book - Detection'],
      },
    }
  )

  /**
   * =================================================================
   * PRICE IMPACT ANALYSIS
   * =================================================================
   */
  .get(
    '/price-impact',
    async ({ query }: any) => {
      logger.info('Estimating price impact', query);
      const impact = await PriceImpactService.estimatePriceImpact({
        exchangeId: query.exchangeId,
        symbol: query.symbol,
        side: query.side as 'buy' | 'sell',
        size: query.size,
      });
      return impact;
    },
    {
      query: t.Object({
        exchangeId: t.String(),
        symbol: t.String(),
        side: t.String({ description: 'Order side (buy/sell)' }),
        size: t.Number({ description: 'Order size in base currency' }),
      }),
      detail: {
        summary: 'Estimate price impact',
        description: 'Calculate expected price impact and slippage for a given order size',
        tags: ['Order Book - Price Impact'],
      },
    }
  )

  .get(
    '/liquidity-score',
    async ({ query }: any) => {
      logger.info('Calculating liquidity score', query);
      const score = await PriceImpactService.calculateLiquidityScore({
        exchangeId: query.exchangeId,
        symbol: query.symbol,
        depth: query.depth,
      });
      return score;
    },
    {
      query: t.Object({
        exchangeId: t.String(),
        symbol: t.String(),
        depth: t.Optional(t.Number({ default: 20 })),
      }),
      detail: {
        summary: 'Calculate liquidity score',
        description: 'Get overall market liquidity score (0-100)',
        tags: ['Order Book - Price Impact'],
      },
    }
  )

  /**
   * =================================================================
   * MULTI-EXCHANGE AGGREGATION
   * =================================================================
   */
  .get(
    '/aggregated',
    async ({ query }: any) => {
      logger.info('Aggregating multi-exchange order book', query);
      const aggregated = await OrderBookAggregatorService.aggregateOrderBooks({
        symbol: query.symbol,
        exchangeIds: query.exchangeIds.split(','),
        depth: query.depth,
      });
      return aggregated;
    },
    {
      query: t.Object({
        symbol: t.String({ description: 'Trading pair (must exist on all exchanges)' }),
        exchangeIds: t.String({ description: 'Comma-separated exchange IDs (e.g., binance,coinbase,kraken)' }),
        depth: t.Optional(t.Number({ default: 20 })),
      }),
      detail: {
        summary: 'Get aggregated order book',
        description: 'Combine order books from multiple exchanges into a unified view',
        tags: ['Order Book - Aggregation'],
      },
    }
  )

  .get(
    '/arbitrage',
    async ({ query }: any) => {
      logger.info('Detecting arbitrage opportunities', query);
      const opportunities = await OrderBookAggregatorService.findArbitrageOpportunities({
        symbol: query.symbol,
        exchangeIds: query.exchangeIds.split(','),
        minProfitPercent: query.minProfitPercent,
      });
      return opportunities;
    },
    {
      query: t.Object({
        symbol: t.String(),
        exchangeIds: t.String({ description: 'Comma-separated exchange IDs' }),
        minProfitPercent: t.Optional(t.Number({ description: 'Minimum profit % (after fees)', default: 0.5 })),
      }),
      detail: {
        summary: 'Find arbitrage opportunities',
        description: 'Detect profitable arbitrage between exchanges',
        tags: ['Order Book - Aggregation'],
      },
    }
  );
