/**
 * Sentiment Routes
 * REST API + WebSocket endpoints for sentiment analysis
 *
 * @module sentiment/routes
 */

import { Elysia, t } from 'elysia';
import { websocketStreamingService } from '../services/streaming/websocket-streaming.service';
import { hybridSentimentService } from '../services/analysis/sentiment-hybrid.service';
import { sentimentAggregator } from '../services/aggregator/sentiment-aggregator.service';
import { trendingTopicsService } from '../services/analyzer/trending-topics.service';
import { priceCorrelationService } from '../services/analyzer/price-correlation.service';
import { rssFeedsService } from '../services/sources/rss-feeds.service';
import { cryptoPanicService } from '../services/sources/cryptopanic.service';
import { twitterService } from '../services/sources/twitter.service';
import { redditService } from '../services/sources/reddit.service';

/**
 * Sentiment Routes Plugin
 */
export const sentimentRoutes = new Elysia({ prefix: '/sentiment' })
  /**
   * GET /sentiment/health
   * Health check for sentiment services
   */
  .get('/health', async () => {
    const health = {
      sentiment: {
        hybrid: await hybridSentimentService?.healthCheck() || { local: true, ai: false, cache: true },
      },
      sources: {
        rss: rssFeedsService ? true : false,
        cryptopanic: cryptoPanicService ? await cryptoPanicService.healthCheck() : false,
        twitter: twitterService ? await twitterService.healthCheck() : false,
        reddit: redditService ? await redditService.healthCheck() : false,
      },
      streaming: {
        active: true,
        stats: websocketStreamingService.getStats(),
      },
    };

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: health,
    };
  })

  /**
   * GET /sentiment/trending
   * Get trending topics
   * IMPORTANT: Must come BEFORE /:symbol to avoid conflicts
   */
  .get('/trending', async ({ query }) => {
    const { limit, symbol } = query as { limit?: string; symbol?: string };

    const trending = symbol
      ? trendingTopicsService.getTrendingForSymbol(symbol.toUpperCase())
      : trendingTopicsService.getTrendingTopics();

    const limitNum = parseInt(limit || '50', 10);

    return {
      trending: trending.slice(0, limitNum),
      total: trending.length,
      timestamp: new Date().toISOString(),
    };
  })

  /**
   * GET /sentiment/news
   * Get recent news articles
   */
  .get('/news', async ({ query }) => {
    const { symbol, source, limit, filter } = query as {
      symbol?: string;
      source?: string;
      limit?: string;
      filter?: string;
    };

    try {
      let articles: any[] = [];

      // Fetch from appropriate source
      if (source === 'cryptopanic' && cryptoPanicService) {
        if (symbol) {
          articles = await cryptoPanicService.fetchForCurrency(symbol.toUpperCase());
        } else if (filter) {
          articles = await cryptoPanicService.fetchPosts({ filter: filter as any });
        } else {
          articles = await cryptoPanicService.fetchRecent();
        }
      } else if (rssFeedsService) {
        // Fetch from all RSS feeds
        articles = await rssFeedsService.fetchAllFeeds();

        // Filter by symbol if provided
        if (symbol) {
          articles = articles.filter((a) => a.symbols.includes(symbol.toUpperCase()));
        }
      }

      const limitNum = parseInt(limit || '50', 10);

      return {
        articles: articles.slice(0, limitNum),
        total: articles.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error fetching news:', error);
      throw new Error('Failed to fetch news articles');
    }
  })

  /**
   * GET /sentiment/social/:platform
   * Get social mentions from specific platform
   */
  .get('/social/:platform', async ({ params, query }) => {
    const { platform } = params;
    const { symbol, limit } = query as { symbol?: string; limit?: string };

    try {
      let mentions: any[] = [];

      if (platform === 'twitter' && twitterService && symbol) {
        mentions = await twitterService.searchCryptoTweets(symbol.toUpperCase(), {
          maxResults: parseInt(limit || '100', 10),
        });
      } else if (platform === 'reddit' && redditService && symbol) {
        mentions = await redditService.searchCrypto(symbol.toUpperCase(), {
          limit: parseInt(limit || '100', 10),
        });
      }

      return {
        platform,
        mentions,
        total: mentions.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Error fetching ${platform} mentions:`, error);
      throw new Error(`Failed to fetch ${platform} mentions`);
    }
  }, {
    params: t.Object({
      platform: t.Union([t.Literal('twitter'), t.Literal('reddit')]),
    }),
    query: t.Object({
      symbol: t.Optional(t.String()),
      limit: t.Optional(t.String()),
    }),
  })

  /**
   * POST /sentiment/analyze
   * Analyze custom text
   */
  .post('/analyze', async ({ body }) => {
    const { text, options } = body as {
      text: string;
      options?: {
        forceAI?: boolean;
        forceLocal?: boolean;
        context?: {
          symbol?: string;
          author?: string;
          source?: string;
          isInfluencer?: boolean;
          isImportant?: boolean;
        };
      };
    };

    if (!hybridSentimentService) {
      throw new Error('Sentiment service not available');
    }

    const result = await hybridSentimentService.analyze(text, options);

    return {
      result,
      timestamp: new Date().toISOString(),
    };
  }, {
    body: t.Object({
      text: t.String({ minLength: 1, maxLength: 5000 }),
      options: t.Optional(t.Object({
        forceAI: t.Optional(t.Boolean()),
        forceLocal: t.Optional(t.Boolean()),
        context: t.Optional(t.Object({
          symbol: t.Optional(t.String()),
          author: t.Optional(t.String()),
          source: t.Optional(t.String()),
          isInfluencer: t.Optional(t.Boolean()),
          isImportant: t.Optional(t.Boolean()),
        })),
      })),
    }),
  })

  /**
   * POST /sentiment/analyze/batch
   * Batch analyze multiple texts
   */
  .post('/analyze/batch', async ({ body }) => {
    const { texts, options } = body as {
      texts: Array<{ id: string; text: string }>;
      options?: any;
    };

    if (!hybridSentimentService) {
      throw new Error('Sentiment service not available');
    }

    const result = await hybridSentimentService.analyzeBatch({
      texts,
      options,
    });

    return {
      result,
      timestamp: new Date().toISOString(),
    };
  }, {
    body: t.Object({
      texts: t.Array(t.Object({
        id: t.String(),
        text: t.String({ minLength: 1, maxLength: 5000 }),
      })),
      options: t.Optional(t.Any()),
    }),
  })

  /**
   * GET /sentiment/correlation/:symbol
   * Get sentiment-price correlation for symbol
   */
  .get('/correlation/:symbol', async ({ params, query }) => {
    const { symbol } = params;
    const { timeframe } = query as { timeframe?: string };

    // TODO: Fetch sentiment and price data from database
    // For now, return mock structure
    return {
      symbol: symbol.toUpperCase(),
      correlations: [],
      timestamp: new Date().toISOString(),
    };
  }, {
    params: t.Object({
      symbol: t.String(),
    }),
    query: t.Object({
      timeframe: t.Optional(t.String()),
    }),
  })

  /**
   * GET /sentiment/signals/:symbol
   * Get trading signals based on sentiment
   */
  .get('/signals/:symbol', async ({ params }) => {
    const { symbol } = params;

    // TODO: Generate signals from sentiment and price data
    return {
      symbol: symbol.toUpperCase(),
      signals: [],
      timestamp: new Date().toISOString(),
    };
  }, {
    params: t.Object({
      symbol: t.String(),
    }),
  })

  /**
   * GET /sentiment/stats
   * Get service statistics
   */
  .get('/stats', async () => {
    try {
      const sentiment = hybridSentimentService?.getUsageStats?.() || {
        totalAnalyses: 0,
        localAnalyses: 0,
        aiAnalyses: 0,
        cacheHits: 0,
        averageTime: 0,
      };

      const trending = trendingTopicsService?.getStats?.() || {
        topics: 0,
        symbols: 0,
      };

      const streaming = websocketStreamingService?.getStats?.() || {
        connections: 0,
        subscriptions: 0,
        messagesPerMinute: 0,
      };

      const rss = rssFeedsService?.getStats?.() || {
        feeds: 0,
        articles: 0,
      };

      return {
        sentiment,
        trending,
        streaming,
        rss,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error getting sentiment stats:', error);
      // Return default stats on error
      return {
        sentiment: { totalAnalyses: 0, localAnalyses: 0, aiAnalyses: 0, cacheHits: 0, averageTime: 0 },
        trending: { topics: 0, symbols: 0 },
        streaming: { connections: 0, subscriptions: 0, messagesPerMinute: 0 },
        rss: { feeds: 0, articles: 0 },
        timestamp: new Date().toISOString(),
      };
    }
  })

  /**
   * GET /sentiment/aggregate
   * Get aggregated sentiment for multiple symbols
   */
  .get('/aggregate', async ({ query }) => {
    const { symbols, timeframe } = query as { symbols?: string; timeframe?: string };

    if (!symbols) {
      throw new Error('symbols parameter is required');
    }

    const symbolsArray = symbols.split(',').map(s => s.trim());
    const results = await Promise.all(
      symbolsArray.map(async (symbol) => {
        const sentiment = await sentimentAggregator.getAggregatedSentiment(
          symbol,
          timeframe || '24h'
        );
        return {
          symbol: symbol.toUpperCase(),
          ...sentiment,
        };
      })
    );

    return {
      success: true,
      data: results,
      timeframe: timeframe || '24h',
      timestamp: new Date().toISOString(),
    };
  }, {
    query: t.Object({
      symbols: t.String(),
      timeframe: t.Optional(t.String()),
    }),
  })

  /**
   * GET /sentiment/sources
   * Get list of available sentiment sources
   */
  .get('/sources', async () => {
    const sources = [
      {
        id: 'local',
        name: 'Local VADER',
        type: 'local',
        available: true,
        latency: 5,
      },
      {
        id: 'cryptopanic',
        name: 'CryptoPanic API',
        type: 'news',
        available: await cryptoPanicService?.healthCheck() || false,
        latency: 200,
      },
      {
        id: 'twitter',
        name: 'Twitter/X API',
        type: 'social',
        available: await twitterService?.healthCheck() || false,
        latency: 500,
      },
      {
        id: 'reddit',
        name: 'Reddit API',
        type: 'social',
        available: await redditService?.healthCheck() || false,
        latency: 300,
      },
      {
        id: 'rss',
        name: 'RSS Feeds',
        type: 'news',
        available: rssFeedsService ? true : false,
        latency: 100,
      },
    ];

    return {
      success: true,
      data: sources,
      timestamp: new Date().toISOString(),
    };
  })

  /**
   * POST /sentiment/multi-source
   * Analyze sentiment from multiple sources
   */
  .post('/multi-source', async ({ body }) => {
    const { symbol, sources, timeframe } = body as {
      symbol: string;
      sources?: string[];
      timeframe?: string;
    };

    const result = await sentimentAggregator.analyzeMultiSource(
      symbol,
      sources || ['local'],
      timeframe || '24h'
    );

    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }, {
    body: t.Object({
      symbol: t.String(),
      sources: t.Optional(t.Array(t.String())),
      timeframe: t.Optional(t.String()),
    }),
  })

  /**
   * POST /sentiment/correlation
   * Calculate sentiment-price correlation
   */
  .post('/correlation', async ({ body }) => {
    const { symbol, timeframe } = body as {
      symbol: string;
      timeframe?: string;
    };

    // Mock correlation data for testing
    // TODO: Implement full correlation calculation with real data
    const mockCorrelation = {
      symbol: symbol.toUpperCase(),
      correlation: {
        coefficient: 0.65,
        pValue: 0.03,
        significance: 'significant',
        direction: 'positive',
        strength: 'moderate',
      },
      analysis: {
        sentimentTrend: 'bullish',
        priceTrend: 'bullish',
        alignment: 'aligned',
        confidence: 0.75,
      },
      timeframe: timeframe || '7d',
      dataPoints: 168,
      timestamp: new Date().toISOString(),
    };

    return {
      success: true,
      data: mockCorrelation,
      timestamp: new Date().toISOString(),
    };
  }, {
    body: t.Object({
      symbol: t.String(),
      timeframe: t.Optional(t.String()),
    }),
  })

  /**
   * POST /sentiment/batch
   * Batch analyze sentiment for multiple symbols
   */
  .post('/batch', async ({ body }) => {
    const { symbols, options } = body as {
      symbols: string[];
      options?: {
        timeframe?: string;
        sources?: string[];
      };
    };

    const results = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const sentiment = await sentimentAggregator.getAggregatedSentiment(
            symbol,
            options?.timeframe || '24h'
          );
          return {
            symbol: symbol.toUpperCase(),
            status: 'success',
            data: sentiment,
          };
        } catch (error) {
          return {
            symbol: symbol.toUpperCase(),
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    return {
      success: true,
      data: results,
      timestamp: new Date().toISOString(),
    };
  }, {
    body: t.Object({
      symbols: t.Array(t.String()),
      options: t.Optional(t.Object({
        timeframe: t.Optional(t.String()),
        sources: t.Optional(t.Array(t.String())),
      })),
    }),
  })

  /**
   * GET /sentiment/:symbol
   * Get aggregated sentiment for a symbol
   * (Must be LAST to avoid path conflicts with specific routes)
   */
  .get('/:symbol', async ({ params, query }) => {
    const { symbol } = params;
    const { timeWindow } = query as { timeWindow?: string };

    // TODO: Fetch from database
    // For now, return mock data structure
    return {
      symbol: symbol.toUpperCase(),
      score: 0,
      magnitude: 0,
      label: 'neutral' as const,
      confidence: 0.5,
      trend: {
        direction: 'stable' as const,
        strength: 0,
        velocity: 0,
      },
      volume: 0,
      change: 0,
      sourceBreakdown: {},
      timeWindow: parseInt(timeWindow || '86400000', 10),
      dataPoints: 0,
      lastUpdated: new Date(),
    };
  }, {
    params: t.Object({
      symbol: t.String(),
    }),
    query: t.Object({
      timeWindow: t.Optional(t.String()),
    }),
  })

  /**
   * WebSocket /sentiment/stream
   * Real-time sentiment updates
   */
  .ws('/stream', {
    open(ws) {
      const clientId = crypto.randomUUID();
      const metadata = {
        ip: ws.data?.headers?.['x-forwarded-for'] || 'unknown',
        userAgent: ws.data?.headers?.['user-agent'] || 'unknown',
      };

      // Store client ID in ws context
      (ws as any).clientId = clientId;

      websocketStreamingService.onConnect(ws, clientId, metadata);
    },

    message(ws, message) {
      const clientId = (ws as any).clientId;

      if (!clientId) {
        console.error('[WebSocket] Client ID not found');
        return;
      }

      try {
        const parsedMessage = typeof message === 'string' ? JSON.parse(message) : message;
        websocketStreamingService.onMessage(clientId, parsedMessage);
      } catch (error) {
        console.error('[WebSocket] Error parsing message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: 'Invalid message format' },
          timestamp: Date.now(),
        }));
      }
    },

    close(ws) {
      const clientId = (ws as any).clientId;

      if (clientId) {
        websocketStreamingService.onDisconnect(clientId);
      }
    },

    error(ws, error) {
      console.error('[WebSocket] Error:', error);
      const clientId = (ws as any).clientId;

      if (clientId) {
        websocketStreamingService.onDisconnect(clientId);
      }
    },
  })

  /**
   * GET /sentiment/aggregate
   * Aggregate sentiment across multiple symbols
   */
  .get('/aggregate', async ({ query }) => {
    const symbols = query.symbols?.split(',') || [];
    const timeframe = query.timeframe || '24h';

    if (symbols.length === 0) {
      return {
        success: false,
        error: 'At least one symbol required',
      };
    }

    const results = await Promise.all(
      symbols.map(async (symbol) => {
        const sentiment = await sentimentAggregator.getAggregatedSentiment(
          symbol.trim(),
          timeframe
        );
        return { symbol: symbol.trim(), ...sentiment };
      })
    );

    return {
      success: true,
      data: results,
      timeframe,
      timestamp: new Date().toISOString(),
    };
  }, {
    query: t.Object({
      symbols: t.String(),
      timeframe: t.Optional(t.String()),
    }),
  })

  /**
   * GET /sentiment/sources
   * List available sentiment sources
   */
  .get('/sources', async () => {
    const sources = [
      {
        id: 'local',
        name: 'Local VADER Analysis',
        type: 'analysis',
        enabled: true,
        cost: 'free',
        speed: 'fast',
        accuracy: 'good',
      },
      {
        id: 'ai',
        name: 'AI-Powered Analysis',
        type: 'analysis',
        enabled: Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY),
        cost: 'paid',
        speed: 'medium',
        accuracy: 'excellent',
      },
      {
        id: 'rss',
        name: 'RSS News Feeds',
        type: 'source',
        enabled: true,
        cost: 'free',
        speed: 'fast',
        accuracy: 'good',
      },
      {
        id: 'cryptopanic',
        name: 'CryptoPanic',
        type: 'source',
        enabled: Boolean(process.env.CRYPTOPANIC_API_KEY),
        cost: 'free/paid',
        speed: 'fast',
        accuracy: 'good',
      },
      {
        id: 'twitter',
        name: 'Twitter/X',
        type: 'source',
        enabled: Boolean(process.env.TWITTER_API_KEY),
        cost: 'paid',
        speed: 'fast',
        accuracy: 'excellent',
      },
      {
        id: 'reddit',
        name: 'Reddit',
        type: 'source',
        enabled: Boolean(process.env.REDDIT_CLIENT_ID),
        cost: 'free',
        speed: 'medium',
        accuracy: 'good',
      },
    ];

    return {
      success: true,
      data: sources,
      timestamp: new Date().toISOString(),
    };
  })

  /**
   * POST /sentiment/multi-source
   * Analyze sentiment from multiple sources
   */
  .post('/multi-source', async ({ body }) => {
    const { symbol, sources, timeframe } = body;

    const results = await sentimentAggregator.analyzeMultiSource(
      symbol,
      sources || ['local', 'rss'],
      timeframe || '24h'
    );

    return {
      success: true,
      data: results,
      symbol,
      sources: sources || ['local', 'rss'],
      timeframe: timeframe || '24h',
      timestamp: new Date().toISOString(),
    };
  }, {
    body: t.Object({
      symbol: t.String(),
      sources: t.Optional(t.Array(t.String())),
      timeframe: t.Optional(t.String()),
    }),
  })

  /**
   * POST /sentiment/correlation
   * Calculate sentiment-price correlation
   */
  .post('/correlation', async ({ body }) => {
    const { symbol, timeframe } = body;

    const correlation = await priceCorrelationService.calculateCorrelation(
      symbol,
      timeframe || '7d'
    );

    return {
      success: true,
      data: correlation,
      symbol,
      timeframe: timeframe || '7d',
      timestamp: new Date().toISOString(),
    };
  }, {
    body: t.Object({
      symbol: t.String(),
      timeframe: t.Optional(t.String()),
    }),
  })

  /**
   * POST /sentiment/batch
   * Batch analyze multiple texts
   */
  .post('/batch', async ({ body }) => {
    const { texts } = body;

    if (!Array.isArray(texts) || texts.length === 0) {
      return {
        success: false,
        error: 'texts array required',
      };
    }

    const results = await Promise.all(
      texts.map(async (text) => {
        const sentiment = await hybridSentimentService.analyzeSentiment(text, 'en');
        return {
          text,
          ...sentiment,
        };
      })
    );

    return {
      success: true,
      data: results,
      count: results.length,
      timestamp: new Date().toISOString(),
    };
  }, {
    body: t.Object({
      texts: t.Array(t.String()),
    }),
  })

  /**
   * GET /sentiment/:symbol
   * Get aggregated sentiment for a symbol
   * IMPORTANT: Must be LAST to avoid conflicts with specific routes
   */
  .get('/:symbol', async ({ params, query }) => {
    const { symbol } = params;
    const { timeWindow } = query as { timeWindow?: string };

    // Get aggregated sentiment from all sources
    const sentiment = await sentimentAggregator.getAggregatedSentiment(
      symbol.toUpperCase(),
      timeWindow || '24h'
    );

    return {
      success: true,
      data: sentiment,
      symbol: symbol.toUpperCase(),
      timeWindow: timeWindow || '24h',
      timestamp: new Date().toISOString(),
    };
  }, {
    params: t.Object({
      symbol: t.String(),
    }),
    query: t.Object({
      timeWindow: t.Optional(t.String()),
    }),
  });
