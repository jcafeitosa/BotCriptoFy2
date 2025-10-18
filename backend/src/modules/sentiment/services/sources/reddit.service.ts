/**
 * Reddit Service
 * Monitor Reddit posts and comments from crypto subreddits
 *
 * @module sentiment/services/sources/reddit
 */

import Snoowrap from 'snoowrap';

// Types from snoowrap
type Submission = any;
type Comment = any;
import type { RedditMention, RedditStreamConfig } from '../../types/social.types';

/**
 * Default crypto subreddits to monitor
 */
const DEFAULT_SUBREDDITS = [
  'cryptocurrency',
  'bitcoin',
  'ethereum',
  'cryptomarkets',
  'cryptomoonshots',
  'satoshistreetbets',
  'ethtrader',
  'bitcoinmarkets',
  'defi',
  'nft',
];

/**
 * Reddit Service Class
 */
export class RedditService {
  private client: Snoowrap;
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private lastPostIds: Map<string, Set<string>> = new Map();

  constructor(config: {
    clientId: string;
    clientSecret: string;
    username: string;
    password: string;
    userAgent: string;
  }) {
    this.client = new Snoowrap({
      userAgent: config.userAgent || 'BotCriptoFy/1.0',
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      username: config.username,
      password: config.password,
    });

    // Configure request delay to respect rate limits
    this.client.config({ requestDelay: 1000, warnings: false });
  }

  /**
   * Get recent posts from subreddit
   */
  async getRecentPosts(subreddit: string, options?: {
    limit?: number;
    sort?: 'hot' | 'new' | 'rising' | 'top';
    timeframe?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  }): Promise<RedditMention[]> {
    try {
      const sort = options?.sort || 'new';
      const limit = options?.limit || 100;

      let submissions: Submission[];

      switch (sort) {
        case 'hot':
          submissions = await this.client.getSubreddit(subreddit).getHot({ limit });
          break;
        case 'new':
          submissions = await this.client.getSubreddit(subreddit).getNew({ limit });
          break;
        case 'rising':
          submissions = await this.client.getSubreddit(subreddit).getRising({ limit });
          break;
        case 'top':
          submissions = await this.client.getSubreddit(subreddit).getTop({
            limit,
            time: options?.timeframe || 'day',
          });
          break;
        default:
          submissions = await this.client.getSubreddit(subreddit).getNew({ limit });
      }

      return submissions.map((post) => this.transformToRedditMention(post, subreddit));
    } catch (error) {
      console.error(`Error fetching posts from r/${subreddit}:`, error);
      throw error;
    }
  }

  /**
   * Search posts across all subreddits
   */
  async searchPosts(query: string, options?: {
    subreddit?: string;
    limit?: number;
    sort?: 'relevance' | 'hot' | 'top' | 'new' | 'comments';
    timeframe?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  }): Promise<RedditMention[]> {
    try {
      const searchOptions = {
        query,
        subreddit: options?.subreddit,
        limit: options?.limit || 100,
        sort: options?.sort || 'new',
        time: options?.timeframe || 'day',
      };

      const results = await this.client.search(searchOptions);

      return results.map((post) => {
        const subreddit = post.subreddit?.display_name || 'unknown';
        return this.transformToRedditMention(post, subreddit);
      });
    } catch (error) {
      console.error('Error searching Reddit:', error);
      throw error;
    }
  }

  /**
   * Search for crypto mentions
   */
  async searchCrypto(symbol: string, options?: {
    subreddit?: string;
    limit?: number;
  }): Promise<RedditMention[]> {
    const queries = [
      symbol,
      `$${symbol}`,
      symbol === 'BTC' ? 'bitcoin' : '',
      symbol === 'ETH' ? 'ethereum' : '',
    ].filter(Boolean);

    const query = queries.join(' OR ');

    return this.searchPosts(query, {
      subreddit: options?.subreddit || DEFAULT_SUBREDDITS.join('+'),
      limit: options?.limit || 100,
    });
  }

  /**
   * Get post comments
   */
  getPostComments(postId: string, limit: number = 100): Promise<RedditMention[]> {
    return Promise.resolve().then(async () => {
      try {
        const submission: any = await (this.client.getSubmission(postId) as Promise<any>);
        await submission.expandReplies({ limit, depth: 1 });

        const comments: RedditMention[] = [];

        const processComment = (comment: any): void => {
          if (comment && typeof comment === 'object') {
            const mention = this.transformCommentToMention(comment);
            if (mention) {
              comments.push(mention);
            }

            // Process replies
            if (comment.replies && Array.isArray(comment.replies)) {
              comment.replies.forEach(processComment);
            }
          }
        };

        submission.comments.forEach(processComment);

        return comments;
      } catch (error) {
        console.error(`Error fetching comments for post ${postId}:`, error);
        throw error;
      }
    });
  }

  /**
   * Start monitoring subreddits
   */
  startMonitoring(
    subreddits: string[] = DEFAULT_SUBREDDITS,
    onNewPost: (mention: RedditMention) => void,
    pollInterval: number = 60000 // 1 minute
  ): void {
    subreddits.forEach((subreddit) => {
      // Initialize last post IDs set
      this.lastPostIds.set(subreddit, new Set());

      // Clear existing interval
      const existingInterval = this.pollingIntervals.get(subreddit);
      if (existingInterval) {
        clearInterval(existingInterval);
      }

      // Set up polling
      const interval = setInterval(async () => {
        try {
          const posts = await this.getRecentPosts(subreddit, { limit: 25, sort: 'new' });
          const lastIds = this.lastPostIds.get(subreddit)!;

          // Filter new posts
          const newPosts = posts.filter((post) => !lastIds.has(post.platformId));

          // Update last IDs
          posts.forEach((post) => lastIds.add(post.platformId));

          // Keep only last 100 IDs
          if (lastIds.size > 100) {
            const idsArray = Array.from(lastIds);
            this.lastPostIds.set(subreddit, new Set(idsArray.slice(-100)));
          }

          // Emit new posts
          newPosts.forEach((post) => onNewPost(post));
        } catch (error) {
          console.error(`Error monitoring r/${subreddit}:`, error);
        }
      }, pollInterval);

      this.pollingIntervals.set(subreddit, interval);

      // Also fetch immediately
      this.getRecentPosts(subreddit, { limit: 25, sort: 'new' })
        .then((posts) => {
          const lastIds = this.lastPostIds.get(subreddit)!;
          posts.forEach((post) => {
            lastIds.add(post.platformId);
            onNewPost(post);
          });
        })
        .catch((error) => {
          console.error(`Error fetching initial posts from r/${subreddit}:`, error);
        });
    });
  }

  /**
   * Stop monitoring all subreddits
   */
  stopMonitoring(): void {
    this.pollingIntervals.forEach((interval) => clearInterval(interval));
    this.pollingIntervals.clear();
    this.lastPostIds.clear();
  }

  /**
   * Stop monitoring specific subreddit
   */
  stopMonitoringSubreddit(subreddit: string): void {
    const interval = this.pollingIntervals.get(subreddit);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(subreddit);
    }
    this.lastPostIds.delete(subreddit);
  }

  /**
   * Transform Reddit submission to RedditMention
   */
  private transformToRedditMention(post: Submission, subreddit: string): RedditMention {
    // Extract symbols from title and text
    const text = `${post.title} ${post.selftext || ''}`;
    const symbols = this.extractSymbols(text);

    // Determine post type
    let postType: 'text' | 'link' | 'image' | 'video' = 'text';
    if (post.is_video) {
      postType = 'video';
    } else if (post.post_hint === 'image' || post.url?.match(/\.(jpg|jpeg|png|gif)$/i)) {
      postType = 'image';
    } else if (post.is_self) {
      postType = 'text';
    } else {
      postType = 'link';
    }

    const redditMention: RedditMention = {
      id: crypto.randomUUID(),
      platform: 'reddit',
      platformId: post.id,
      postId: post.id,
      subreddit,
      author: post.author?.name || '[deleted]',
      authorId: post.author?.id || 'deleted',
      authorFollowers: undefined,
      authorVerified: false,

      // Content
      text: text.substring(0, 2000), // Limit text length
      url: `https://www.reddit.com${post.permalink}`,
      language: 'en', // Reddit doesn't provide language detection

      // Engagement
      likes: post.ups || 0,
      replies: post.num_comments || 0,
      views: 0,
      upvotes: post.ups || 0,
      downvotes: post.downs || 0,
      score: post.score || 0,

      // Timestamps
      createdAt: new Date((post.created_utc || 0) * 1000),
      fetchedAt: new Date(),

      // Extracted data
      symbols,
      hashtags: [],
      mentions: [],

      // Flags
      isAnalyzed: false,
      isInfluencer: false, // Reddit doesn't have follower counts on posts
      isRetweet: false,
      isReply: false,

      // Reddit-specific
      postType,
      upvoteRatio: post.upvote_ratio || 0,
      numComments: post.num_comments || 0,
      distinguished: post.distinguished as any,
      stickied: post.stickied || false,
      over18: post.over_18 || false,
      spoiler: post.spoiler || false,
    };

    return redditMention;
  }

  /**
   * Transform Reddit comment to RedditMention
   */
  private transformCommentToMention(comment: any): RedditMention | null {
    try {
      const symbols = this.extractSymbols(comment.body || '');

      const mention: RedditMention = {
        id: crypto.randomUUID(),
        platform: 'reddit',
        platformId: comment.id,
        postId: comment.link_id?.replace('t3_', '') || comment.id,
        subreddit: comment.subreddit?.display_name || 'unknown',
        author: comment.author?.name || '[deleted]',
        authorId: comment.author?.id || 'deleted',
        authorFollowers: undefined,
        authorVerified: false,

        // Content
        text: comment.body || '',
        url: `https://www.reddit.com${comment.permalink}`,
        language: 'en',

        // Engagement
        likes: comment.ups || 0,
        replies: 0, // Comments don't have reply count in API
        views: 0,
        upvotes: comment.ups || 0,
        downvotes: comment.downs || 0,
        score: comment.score || 0,

        // Timestamps
        createdAt: new Date((comment.created_utc || 0) * 1000),
        fetchedAt: new Date(),

        // Extracted data
        symbols,
        hashtags: [],
        mentions: [],

        // Flags
        isAnalyzed: false,
        isInfluencer: false,
        isRetweet: false,
        isReply: true, // Comments are always replies

        // Reddit-specific
        postType: 'text',
        upvoteRatio: 0,
        numComments: 0,
        distinguished: comment.distinguished as any,
        stickied: comment.stickied || false,
        over18: false,
        spoiler: false,
      };

      return mention;
    } catch (error) {
      console.error('Error transforming comment:', error);
      return null;
    }
  }

  /**
   * Extract crypto symbols from text
   */
  private extractSymbols(text: string): string[] {
    const symbols = new Set<string>();

    // Common crypto keywords
    const cryptoMap: Record<string, string> = {
      'bitcoin': 'BTC',
      'btc': 'BTC',
      'ethereum': 'ETH',
      'eth': 'ETH',
      'ether': 'ETH',
      'binance': 'BNB',
      'bnb': 'BNB',
      'cardano': 'ADA',
      'ada': 'ADA',
      'solana': 'SOL',
      'sol': 'SOL',
      'ripple': 'XRP',
      'xrp': 'XRP',
      'dogecoin': 'DOGE',
      'doge': 'DOGE',
      'polkadot': 'DOT',
      'dot': 'DOT',
    };

    // Check for keywords
    const lowerText = text.toLowerCase();
    Object.entries(cryptoMap).forEach(([keyword, symbol]) => {
      if (lowerText.includes(keyword)) {
        symbols.add(symbol);
      }
    });

    // Check for $SYMBOL mentions
    const cashtags = text.match(/\$[A-Z]{2,10}/g);
    if (cashtags) {
      cashtags.forEach((tag) => {
        symbols.add(tag.substring(1));
      });
    }

    return Array.from(symbols);
  }

  /**
   * Get monitoring status
   */
  getMonitoringStatus(): Array<{
    subreddit: string;
    isMonitoring: boolean;
    lastPostCount: number;
  }> {
    const status: Array<{ subreddit: string; isMonitoring: boolean; lastPostCount: number }> = [];

    this.pollingIntervals.forEach((_, subreddit) => {
      status.push({
        subreddit,
        isMonitoring: true,
        lastPostCount: this.lastPostIds.get(subreddit)?.size || 0,
      });
    });

    return status;
  }

  /**
   * Health check
   */
  healthCheck(): Promise<boolean> {
    const checkHealthAsync = async (): Promise<boolean> => {
      try {
        const subreddit: any = this.client.getSubreddit('cryptocurrency');
        await subreddit.fetch();
        return true;
      } catch {
        return false;
      }
    };

    return checkHealthAsync();
  }
}

/**
 * Create Reddit service instance
 */
export function createRedditService(config: {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  userAgent: string;
}): RedditService {
  return new RedditService(config);
}

/**
 * Singleton instance (requires credentials from env)
 */
export const redditService =
  process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET
    ? new RedditService({
        clientId: process.env.REDDIT_CLIENT_ID,
        clientSecret: process.env.REDDIT_CLIENT_SECRET,
        username: process.env.REDDIT_USERNAME || '',
        password: process.env.REDDIT_PASSWORD || '',
        userAgent: 'BotCriptoFy/1.0 (Crypto Sentiment Analysis)',
      })
    : undefined;
