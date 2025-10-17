/**
 * RSS Feeds Service
 * Aggregates news from multiple RSS feeds
 *
 * @module sentiment/services/sources/rss-feeds
 */

import FeedParser from 'feedparser';
import { franc } from 'franc';
import type { NewsArticle, RSSFeedConfig, NewsProcessingResult } from '../../types/news.types';

/**
 * Default RSS Feed Configurations
 */
const DEFAULT_RSS_FEEDS: Omit<RSSFeedConfig, 'lastFetch' | 'lastError'>[] = [
  // CoinDesk
  {
    name: 'CoinDesk',
    url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
    source: 'rss_coindesk',
    category: 'general',
    enabled: true,
    pollInterval: 300000, // 5 minutes
  },
  // CoinTelegraph
  {
    name: 'CoinTelegraph',
    url: 'https://cointelegraph.com/rss',
    source: 'rss_cointelegraph',
    category: 'general',
    enabled: true,
    pollInterval: 300000,
  },
  // Decrypt
  {
    name: 'Decrypt',
    url: 'https://decrypt.co/feed',
    source: 'rss_decrypt',
    category: 'general',
    enabled: true,
    pollInterval: 300000,
  },
  // The Block
  {
    name: 'The Block',
    url: 'https://www.theblock.co/rss.xml',
    source: 'rss_theblock',
    category: 'general',
    enabled: true,
    pollInterval: 300000,
  },
  // Bitcoin Magazine
  {
    name: 'Bitcoin Magazine',
    url: 'https://bitcoinmagazine.com/feed',
    source: 'rss_bitcoinmagazine',
    category: 'general',
    enabled: true,
    pollInterval: 300000,
  },
  // CryptoSlate
  {
    name: 'CryptoSlate',
    url: 'https://cryptoslate.com/feed/',
    source: 'custom',
    category: 'general',
    enabled: true,
    pollInterval: 300000,
  },
  // U.Today
  {
    name: 'U.Today',
    url: 'https://u.today/rss',
    source: 'custom',
    category: 'general',
    enabled: true,
    pollInterval: 300000,
  },
  // NewsBTC
  {
    name: 'NewsBTC',
    url: 'https://www.newsbtc.com/feed/',
    source: 'custom',
    category: 'general',
    enabled: true,
    pollInterval: 300000,
  },
  // CoinGape
  {
    name: 'CoinGape',
    url: 'https://coingape.com/feed/',
    source: 'custom',
    category: 'general',
    enabled: true,
    pollInterval: 300000,
  },
  // Bitcoin.com
  {
    name: 'Bitcoin.com',
    url: 'https://news.bitcoin.com/feed/',
    source: 'custom',
    category: 'general',
    enabled: true,
    pollInterval: 300000,
  },
];

/**
 * Known crypto symbol patterns
 */
const CRYPTO_SYMBOLS = new Map<RegExp, string>([
  [/bitcoin|btc/i, 'BTC'],
  [/ethereum|ether|eth/i, 'ETH'],
  [/binance coin|bnb/i, 'BNB'],
  [/cardano|ada/i, 'ADA'],
  [/solana|sol/i, 'SOL'],
  [/ripple|xrp/i, 'XRP'],
  [/polkadot|dot/i, 'DOT'],
  [/dogecoin|doge/i, 'DOGE'],
  [/avalanche|avax/i, 'AVAX'],
  [/polygon|matic/i, 'MATIC'],
  [/shiba inu|shib/i, 'SHIB'],
  [/litecoin|ltc/i, 'LTC'],
  [/chainlink|link/i, 'LINK'],
  [/uniswap|uni/i, 'UNI'],
  [/cosmos|atom/i, 'ATOM'],
  [/algorand|algo/i, 'ALGO'],
  [/tron|trx/i, 'TRX'],
  [/near protocol|near/i, 'NEAR'],
  [/vechain|vet/i, 'VET'],
  [/filecoin|fil/i, 'FIL'],
]);

/**
 * RSS Feeds Service Configuration
 */
export interface RSSFeedsServiceConfig {
  /**
   * Use default feeds
   */
  useDefaults?: boolean;

  /**
   * Custom feeds to add
   */
  customFeeds?: Omit<RSSFeedConfig, 'lastFetch' | 'lastError'>[];
}

/**
 * RSS Feeds Service
 */
export class RSSFeedsService {
  private feeds: Map<string, RSSFeedConfig> = new Map();
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(config?: RSSFeedsServiceConfig) {
    const useDefaults = config?.useDefaults !== false; // Default to true
    this.initializeFeeds(useDefaults, config?.customFeeds);
  }

  /**
   * Initialize feeds
   */
  private initializeFeeds(
    useDefaults: boolean,
    customFeeds?: Omit<RSSFeedConfig, 'lastFetch' | 'lastError'>[]
  ): void {
    // Add default feeds if enabled
    if (useDefaults) {
      DEFAULT_RSS_FEEDS.forEach((feed) => {
        this.feeds.set(feed.url, { ...feed });
      });
    }

    // Add custom feeds
    if (customFeeds) {
      customFeeds.forEach((feed) => {
        this.feeds.set(feed.url, { ...feed });
      });
    }
  }

  /**
   * Add custom RSS feed
   */
  addFeed(config: RSSFeedConfig): void {
    this.feeds.set(config.url, config);
  }

  /**
   * Remove RSS feed
   */
  removeFeed(url: string): void {
    this.feeds.delete(url);
    const interval = this.pollingIntervals.get(url);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(url);
    }
  }

  /**
   * Get all feeds
   */
  getAllFeeds(): RSSFeedConfig[] {
    return Array.from(this.feeds.values());
  }

  /**
   * Fetch and parse RSS feed
   */
  async fetchFeed(url: string): Promise<NewsArticle[]> {
    return new Promise((resolve, reject) => {
      const feed = this.feeds.get(url);
      if (!feed) {
        return reject(new Error(`Feed not found: ${url}`));
      }

      const articles: NewsArticle[] = [];
      const parser = new FeedParser({});

      const fetchOptions = {
        headers: {
          'User-Agent': 'BotCriptoFy/1.0 (News Aggregator)',
          'Accept': 'application/rss+xml, application/xml, text/xml',
        },
      };

      // Fetch the RSS feed
      fetch(url, fetchOptions)
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          // Get text content
          const xmlText = await response.text();

          // Convert to Buffer for feedparser
          const buffer = Buffer.from(xmlText, 'utf8');

          // Create readable stream
          const { Readable } = await import('stream');
          const stream = Readable.from([buffer]);

          stream.pipe(parser);
        })
        .catch((error) => {
          feed.lastError = error.message;
          reject(error);
        });

      parser.on('error', (error) => {
        feed.lastError = error.message;
        reject(error);
      });

      parser.on('readable', function (this: FeedParser) {
        let item;
        while ((item = this.read())) {
          try {
            const article = RSSFeedsService.parseRSSItem(item, feed);
            if (article) {
              articles.push(article);
            }
          } catch (error) {
            console.error('Error parsing RSS item:', error);
          }
        }
      });

      parser.on('end', () => {
        feed.lastFetch = new Date();
        feed.lastError = undefined;
        resolve(articles);
      });
    });
  }

  /**
   * Parse RSS item to NewsArticle
   */
  private static parseRSSItem(item: any, feed: RSSFeedConfig): NewsArticle | null {
    try {
      const title = item.title || '';
      const content = item.description || item.summary || '';
      const url = item.link || '';

      if (!title || !url) {
        return null;
      }

      // Detect language
      const textToAnalyze = `${title} ${content}`.substring(0, 500);
      const langCode = franc(textToAnalyze);
      const language = langCode && langCode !== 'und' ? langCode : 'en';

      // Extract symbols mentioned
      const symbols = RSSFeedsService.extractSymbols(`${title} ${content}`);

      // Extract image
      let imageUrl: string | undefined;
      if (item['media:content'] && item['media:content']['$'] && item['media:content']['$'].url) {
        imageUrl = item['media:content']['$'].url;
      } else if (item.enclosures && item.enclosures.length > 0) {
        imageUrl = item.enclosures[0].url;
      } else if (item.image && item.image.url) {
        imageUrl = item.image.url;
      }

      const article: NewsArticle = {
        id: crypto.randomUUID(),
        source: feed.source,
        sourceUrl: feed.url,
        title: title.trim(),
        content: content.trim(),
        summary: content.substring(0, 500).trim(),
        author: item.author || item.creator || undefined,
        publishedAt: item.pubdate || item.published || new Date(),
        fetchedAt: new Date(),
        url: url.trim(),
        imageUrl,
        category: feed.category,
        symbols,
        language,
        isAnalyzed: false,
      };

      return article;
    } catch (error) {
      console.error('Error parsing RSS item:', error);
      return null;
    }
  }

  /**
   * Extract crypto symbols from text
   */
  private static extractSymbols(text: string): string[] {
    const symbols = new Set<string>();

    CRYPTO_SYMBOLS.forEach((symbol, pattern) => {
      if (pattern.test(text)) {
        symbols.add(symbol);
      }
    });

    // Also look for $SYMBOL mentions (e.g., $BTC, $ETH)
    const cashtags = text.match(/\$[A-Z]{2,10}/g);
    if (cashtags) {
      cashtags.forEach((tag) => {
        const symbol = tag.substring(1); // Remove $
        if (symbol.length >= 2 && symbol.length <= 10) {
          symbols.add(symbol);
        }
      });
    }

    return Array.from(symbols);
  }

  /**
   * Fetch all enabled feeds
   */
  async fetchAllFeeds(): Promise<NewsProcessingResult[]> {
    const enabledFeeds = Array.from(this.feeds.values()).filter((feed) => feed.enabled);
    const results: NewsProcessingResult[] = [];

    for (const feed of enabledFeeds) {
      try {
        const startTime = Date.now();
        const articles = await this.fetchFeed(feed.url);

        articles.forEach((article) => {
          results.push({
            article,
            success: true,
            processingTime: Date.now() - startTime,
            analyzedBy: 'none',
          });
        });
      } catch (error) {
        console.error(`Error fetching feed ${feed.name}:`, error);
      }
    }

    return results;
  }

  /**
   * Start polling all feeds
   */
  startPolling(onNewArticles?: (articles: NewsArticle[]) => void): void {
    const enabledFeeds = Array.from(this.feeds.values()).filter((feed) => feed.enabled);

    enabledFeeds.forEach((feed) => {
      // Clear existing interval
      const existingInterval = this.pollingIntervals.get(feed.url);
      if (existingInterval) {
        clearInterval(existingInterval);
      }

      // Set up new polling interval
      const interval = setInterval(async () => {
        try {
          const articles = await this.fetchFeed(feed.url);
          if (onNewArticles && articles.length > 0) {
            onNewArticles(articles);
          }
        } catch (error) {
          console.error(`Error polling feed ${feed.name}:`, error);
        }
      }, feed.pollInterval);

      this.pollingIntervals.set(feed.url, interval);

      // Also fetch immediately
      this.fetchFeed(feed.url)
        .then((articles) => {
          if (onNewArticles && articles.length > 0) {
            onNewArticles(articles);
          }
        })
        .catch((error) => {
          console.error(`Error fetching feed ${feed.name}:`, error);
        });
    });
  }

  /**
   * Stop polling all feeds
   */
  stopPolling(): void {
    this.pollingIntervals.forEach((interval) => clearInterval(interval));
    this.pollingIntervals.clear();
  }

  /**
   * Get feed status
   */
  getFeedStatus(url: string): RSSFeedConfig | undefined {
    return this.feeds.get(url);
  }

  /**
   * Update feed configuration
   */
  updateFeed(url: string, updates: Partial<RSSFeedConfig>): void {
    const feed = this.feeds.get(url);
    if (feed) {
      Object.assign(feed, updates);
    }
  }
}

// Export singleton instance
export const rssFeedsService = new RSSFeedsService();
