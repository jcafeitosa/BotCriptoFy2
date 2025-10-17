/**
 * Sentiment Analysis Module
 * Real-time news and social media sentiment tracking
 *
 * Features:
 * - Multi-source news aggregation (RSS, CryptoPanic)
 * - Social media monitoring (Twitter, Reddit)
 * - Hybrid sentiment analysis (AI + Local NLP)
 * - Trending topics detection
 * - Price correlation analysis
 * - Real-time WebSocket streaming
 *
 * @module sentiment
 */

// ============================================================================
// Types
// ============================================================================
export * from './types/news.types';
export * from './types/sentiment.types';
export * from './types/social.types';

// ============================================================================
// Schema
// ============================================================================
export * from './schema/sentiment.schema';

// ============================================================================
// Data Sources
// ============================================================================
export * from './services/sources/cryptopanic.service';
export * from './services/sources/rss-feeds.service';
export * from './services/sources/twitter.service';
export * from './services/sources/reddit.service';

// ============================================================================
// Sentiment Analysis
// ============================================================================
export * from './services/analysis/sentiment-ai.service';
export * from './services/analysis/sentiment-local.service';
export * from './services/analysis/sentiment-hybrid.service';

// ============================================================================
// Aggregation & Analysis
// ============================================================================
export * from './services/aggregator/sentiment-aggregator.service';
export * from './services/analyzer/trending-topics.service';
export * from './services/analyzer/price-correlation.service';

// ============================================================================
// Streaming
// ============================================================================
export * from './services/streaming/websocket-streaming.service';

// ============================================================================
// Routes
// ============================================================================
export * from './routes/sentiment.routes';

// ============================================================================
// Module Metadata
// ============================================================================
export const SENTIMENT_MODULE_INFO = {
  name: 'Sentiment Analysis',
  version: '1.0.0',
  description: 'Real-time cryptocurrency sentiment analysis from news and social media',
  features: [
    'Multi-source news aggregation',
    'Social media monitoring (Twitter, Reddit)',
    'Hybrid AI + Local NLP sentiment analysis',
    'Trending topics detection',
    'Price correlation analysis',
    'Fear & Greed Index calculation',
    'Real-time WebSocket streaming',
    'Trading signal generation',
  ],
  dataSources: [
    'CryptoPanic API',
    'RSS Feeds (10+ crypto news sites)',
    'Twitter/X Filtered Stream',
    'Reddit API (10 crypto subreddits)',
  ],
  technologies: [
    'Claude AI (Anthropic)',
    'Sentiment.js (Local NLP)',
    'Compromise (NLP)',
    'Twitter API v2',
    'Snoowrap (Reddit)',
    'FeedParser (RSS)',
    'TimescaleDB (Time-series)',
  ],
} as const;
