/**
 * News Types
 * Types for news articles from multiple sources
 *
 * @module sentiment/types/news
 */

/**
 * News Source Types
 */
export type NewsSource =
  | 'cryptopanic'
  | 'rss_cointelegraph'
  | 'rss_coindesk'
  | 'rss_decrypt'
  | 'rss_theblock'
  | 'rss_bitcoinmagazine'
  | 'twitter'
  | 'reddit'
  | 'custom';

/**
 * News Category
 */
export type NewsCategory =
  | 'general'
  | 'regulation'
  | 'exchange'
  | 'wallet'
  | 'blockchain'
  | 'mining'
  | 'security'
  | 'defi'
  | 'nft'
  | 'technology'
  | 'market'
  | 'adoption';

/**
 * News Article Interface
 */
export interface NewsArticle {
  id: string;
  platformId?: string; // External platform ID (e.g., CryptoPanic ID)
  source: NewsSource;
  sourceUrl: string;
  title: string;
  content?: string;
  summary?: string;
  author?: string;
  publishedAt: Date;
  fetchedAt: Date;
  url: string;
  imageUrl?: string;
  category?: NewsCategory;

  // Symbols mentioned in the article
  symbols: string[];

  // Sentiment data (populated after analysis)
  sentimentScore?: number; // -100 to 100
  sentimentMagnitude?: number; // 0 to 1
  sentimentLabel?: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';

  // Metadata
  language?: string;
  votes?: number;
  views?: number;

  // Flags
  isAnalyzed: boolean;
  isImportant?: boolean;
  isTrending?: boolean;
}

/**
 * News Filter Options
 */
export interface NewsFilterOptions {
  source?: NewsSource | NewsSource[];
  category?: NewsCategory | NewsCategory[];
  symbols?: string | string[];
  startDate?: Date;
  endDate?: Date;
  minSentiment?: number;
  maxSentiment?: number;
  isImportant?: boolean;
  isTrending?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * News Aggregation Result
 */
export interface NewsAggregation {
  symbol: string;
  period: '1h' | '4h' | '24h' | '7d' | '30d';
  totalArticles: number;
  averageSentiment: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  importantCount: number;
  trendingCount: number;
  topSources: Array<{
    source: NewsSource;
    count: number;
  }>;
  topCategories: Array<{
    category: NewsCategory;
    count: number;
  }>;
}

/**
 * RSS Feed Configuration
 */
export interface RSSFeedConfig {
  name: string;
  url: string;
  source: NewsSource;
  category?: NewsCategory;
  enabled: boolean;
  pollInterval: number; // milliseconds
  lastFetch?: Date;
  lastError?: string;
}

/**
 * CryptoPanic Specific Types
 */
export interface CryptoPanicNews {
  kind: 'news' | 'media';
  domain: string;
  source: {
    title: string;
    region: string;
    domain: string;
    path: string | null;
  };
  title: string;
  published_at: string;
  slug: string;
  id: number;
  url: string;
  created_at: string;
  currencies: Array<{
    code: string;
    title: string;
    slug: string;
    url: string;
  }>;
  votes: {
    negative: number;
    positive: number;
    important: number;
    liked: number;
    disliked: number;
    lol: number;
    toxic: number;
    saved: number;
    comments: number;
  };
}

/**
 * News Processing Result
 */
export interface NewsProcessingResult {
  article: NewsArticle;
  success: boolean;
  error?: string;
  processingTime: number;
  analyzedBy: 'ai' | 'local' | 'none';
}
