/**
 * CryptoPanic Service
 * Aggregates news from CryptoPanic API
 * API Docs: https://cryptopanic.com/developers/api/
 *
 * @module sentiment/services/sources/cryptopanic
 */

import type { NewsArticle, CryptoPanicNews } from '../../types/news.types';

/**
 * CryptoPanic API Configuration
 */
interface CryptoPanicConfig {
  apiKey: string;
  baseUrl: string;
  currencies?: string[]; // Filter by specific currencies
  regions?: string[];    // Filter by regions (en, de, es, etc.)
  kinds?: ('news' | 'media')[]; // Filter by content type
  filter?: 'rising' | 'hot' | 'bullish' | 'bearish' | 'important' | 'saved' | 'lol';
}

/**
 * CryptoPanic API Response
 */
interface CryptoPanicResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: CryptoPanicNews[];
}

/**
 * CryptoPanic Service Class
 */
export class CryptoPanicService {
  private config: CryptoPanicConfig;
  private lastFetchTimestamp?: Date;
  private pollingInterval?: NodeJS.Timeout;

  constructor(apiKey: string) {
    this.config = {
      apiKey,
      baseUrl: 'https://cryptopanic.com/api/v1',
    };
  }

  /**
   * Set filter options
   */
  setConfig(options: Partial<Omit<CryptoPanicConfig, 'apiKey' | 'baseUrl'>>): void {
    this.config = { ...this.config, ...options };
  }

  /**
   * Fetch posts from CryptoPanic
   */
  async fetchPosts(options?: {
    currencies?: string[];
    filter?: CryptoPanicConfig['filter'];
    kind?: 'news' | 'media';
    regions?: string[];
    public?: boolean;
  }): Promise<NewsArticle[]> {
    const params = new URLSearchParams({
      auth_token: this.config.apiKey,
    });

    // Add filters
    if (options?.currencies) {
      params.append('currencies', options.currencies.join(','));
    } else if (this.config.currencies) {
      params.append('currencies', this.config.currencies.join(','));
    }

    if (options?.filter) {
      params.append('filter', options.filter);
    } else if (this.config.filter) {
      params.append('filter', this.config.filter);
    }

    if (options?.kind) {
      params.append('kind', options.kind);
    }

    if (options?.regions) {
      params.append('regions', options.regions.join(','));
    } else if (this.config.regions) {
      params.append('regions', this.config.regions.join(','));
    }

    if (options?.public !== undefined) {
      params.append('public', options.public ? 'true' : 'false');
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/posts/?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`CryptoPanic API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as CryptoPanicResponse;
      this.lastFetchTimestamp = new Date();

      return data.results.map((post) => this.transformToNewsArticle(post));
    } catch (error) {
      console.error('Error fetching CryptoPanic posts:', error);
      throw error;
    }
  }

  /**
   * Fetch recent posts (last hour)
   */
  async fetchRecent(): Promise<NewsArticle[]> {
    return this.fetchPosts({ filter: 'hot' });
  }

  /**
   * Fetch important posts
   */
  async fetchImportant(): Promise<NewsArticle[]> {
    return this.fetchPosts({ filter: 'important' });
  }

  /**
   * Fetch bullish posts
   */
  async fetchBullish(): Promise<NewsArticle[]> {
    return this.fetchPosts({ filter: 'bullish' });
  }

  /**
   * Fetch bearish posts
   */
  async fetchBearish(): Promise<NewsArticle[]> {
    return this.fetchPosts({ filter: 'bearish' });
  }

  /**
   * Fetch posts for specific currency
   */
  async fetchForCurrency(symbol: string): Promise<NewsArticle[]> {
    return this.fetchPosts({ currencies: [symbol] });
  }

  /**
   * Transform CryptoPanic post to NewsArticle
   */
  private transformToNewsArticle(post: CryptoPanicNews): NewsArticle {
    // Calculate sentiment from votes
    const totalVotes = post.votes.positive + post.votes.negative;
    let sentimentScore: number | undefined;
    let sentimentLabel: NewsArticle['sentimentLabel'];

    if (totalVotes > 0) {
      const positiveRatio = post.votes.positive / totalVotes;
      // Map to -100 to 100 scale
      sentimentScore = (positiveRatio - 0.5) * 200;

      // Determine label
      if (sentimentScore >= 60) {
        sentimentLabel = 'very_positive';
      } else if (sentimentScore >= 20) {
        sentimentLabel = 'positive';
      } else if (sentimentScore >= -20) {
        sentimentLabel = 'neutral';
      } else if (sentimentScore >= -60) {
        sentimentLabel = 'negative';
      } else {
        sentimentLabel = 'very_negative';
      }
    }

    // Extract symbols from currencies
    const symbols = post.currencies.map((currency) => currency.code);

    // Determine importance
    const isImportant = post.votes.important > 5 || (totalVotes > 20 && Math.abs(sentimentScore || 0) > 40);

    // Determine trending
    const totalEngagement = Object.values(post.votes).reduce((sum, val) => sum + val, 0);
    const isTrending = totalEngagement > 50;

    const article: NewsArticle = {
      id: crypto.randomUUID(),
      source: 'cryptopanic',
      sourceUrl: 'https://cryptopanic.com',
      platformId: post.id.toString(),
      title: post.title,
      content: undefined, // CryptoPanic doesn't provide full content
      summary: post.title,
      author: post.source.title,
      publishedAt: new Date(post.published_at),
      fetchedAt: new Date(),
      url: post.url,
      imageUrl: undefined,
      category: 'general',
      symbols,
      language: post.source.region || 'en',

      // Sentiment from votes
      sentimentScore,
      sentimentLabel,
      sentimentMagnitude: totalVotes > 0 ? Math.min(totalVotes / 100, 1) : undefined,

      // Metrics
      votes: post.votes.positive + post.votes.negative,
      views: undefined,

      // Flags
      isAnalyzed: totalVotes > 0, // If has votes, we have community sentiment
      isImportant,
      isTrending,
    };

    return article;
  }

  /**
   * Start polling for new posts
   */
  startPolling(
    intervalMs: number = 300000, // 5 minutes
    onNewPosts?: (articles: NewsArticle[]) => void
  ): void {
    // Stop existing polling
    this.stopPolling();

    // Set up new polling
    this.pollingInterval = setInterval(async () => {
      try {
        const articles = await this.fetchRecent();
        if (onNewPosts && articles.length > 0) {
          onNewPosts(articles);
        }
      } catch (error) {
        console.error('Error polling CryptoPanic:', error);
      }
    }, intervalMs);

    // Also fetch immediately
    this.fetchRecent()
      .then((articles) => {
        if (onNewPosts && articles.length > 0) {
          onNewPosts(articles);
        }
      })
      .catch((error) => {
        console.error('Error fetching CryptoPanic posts:', error);
      });
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }
  }

  /**
   * Get last fetch timestamp
   */
  getLastFetchTimestamp(): Date | undefined {
    return this.lastFetchTimestamp;
  }

  /**
   * Fetch posts with pagination
   */
  async* fetchAllPages(options?: Parameters<CryptoPanicService['fetchPosts']>[0]): AsyncGenerator<NewsArticle[]> {
    let nextUrl: string | null = `${this.config.baseUrl}/posts/`;
    const params = new URLSearchParams({
      auth_token: this.config.apiKey,
    });

    if (options?.currencies) params.append('currencies', options.currencies.join(','));
    if (options?.filter) params.append('filter', options.filter);
    if (options?.kind) params.append('kind', options.kind);
    if (options?.regions) params.append('regions', options.regions.join(','));

    nextUrl += `?${params.toString()}`;

    while (nextUrl) {
      try {
        const response = await fetch(nextUrl);

        if (!response.ok) {
          throw new Error(`CryptoPanic API error: ${response.status}`);
        }

        const data = await response.json() as CryptoPanicResponse;
        const articles = data.results.map((post) => this.transformToNewsArticle(post));

        yield articles;

        nextUrl = data.next;

        // Rate limiting - wait 1 second between requests
        if (nextUrl) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error('Error fetching CryptoPanic page:', error);
        break;
      }
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const params = new URLSearchParams({
        auth_token: this.config.apiKey,
      });

      const response = await fetch(`${this.config.baseUrl}/posts/?${params.toString()}`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Create CryptoPanic service instance
 */
export function createCryptoPanicService(apiKey: string): CryptoPanicService {
  return new CryptoPanicService(apiKey);
}

/**
 * Singleton instance (requires API key from env)
 */
export const cryptoPanicService = process.env.CRYPTOPANIC_API_KEY
  ? new CryptoPanicService(process.env.CRYPTOPANIC_API_KEY)
  : undefined;
