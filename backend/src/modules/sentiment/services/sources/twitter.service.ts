/**
 * Twitter/X Service
 * Real-time Twitter/X streaming and search
 *
 * @module sentiment/services/sources/twitter
 */

import { TwitterApi, ETwitterStreamEvent, TweetV2, TweetSearchRecentV2Paginator } from 'twitter-api-v2';
import type { TwitterMention, TwitterStreamConfig } from '../../types/social.types';

/**
 * Twitter Service Class
 */
export class TwitterService {
  private client: TwitterApi;
  private stream?: AsyncGenerator<any>;
  private isStreaming: boolean = false;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 5;

  constructor(bearerToken: string) {
    this.client = new TwitterApi(bearerToken);
  }

  /**
   * Search recent tweets
   */
  async searchTweets(query: string, options?: {
    maxResults?: number;
    startTime?: Date;
    endTime?: Date;
  }): Promise<TwitterMention[]> {
    try {
      const tweets = await this.client.v2.search(query, {
        max_results: options?.maxResults || 100,
        start_time: options?.startTime?.toISOString(),
        end_time: options?.endTime?.toISOString(),
        'tweet.fields': [
          'created_at',
          'public_metrics',
          'author_id',
          'conversation_id',
          'lang',
          'referenced_tweets',
          'entities',
        ],
        'user.fields': ['username', 'name', 'verified', 'public_metrics'],
        expansions: ['author_id', 'referenced_tweets.id'],
      });

      const mentions: TwitterMention[] = [];

      for await (const tweet of tweets) {
        const mention = this.transformToTwitterMention(tweet);
        if (mention) {
          mentions.push(mention);
        }
      }

      return mentions;
    } catch (error) {
      console.error('Error searching tweets:', error);
      throw error;
    }
  }

  /**
   * Search tweets for specific crypto symbol
   */
  async searchCryptoTweets(symbol: string, options?: {
    maxResults?: number;
    includeRetweets?: boolean;
  }): Promise<TwitterMention[]> {
    // Build query for crypto mentions
    const queries = [
      `$${symbol}`,  // Cashtag
      `#${symbol}`,  // Hashtag
      symbol === 'BTC' ? 'bitcoin' : '',
      symbol === 'ETH' ? 'ethereum' : '',
    ].filter(Boolean);

    const query = `(${queries.join(' OR ')}) lang:en ${!options?.includeRetweets ? '-is:retweet' : ''}`;

    return this.searchTweets(query, {
      maxResults: options?.maxResults || 100,
    });
  }

  /**
   * Get tweets from specific user
   */
  async getUserTweets(username: string, maxResults: number = 100): Promise<TwitterMention[]> {
    try {
      const user = await this.client.v2.userByUsername(username, {
        'user.fields': ['public_metrics', 'verified'],
      });

      if (!user.data) {
        throw new Error(`User not found: ${username}`);
      }

      const tweets = await this.client.v2.userTimeline(user.data.id, {
        max_results: maxResults,
        'tweet.fields': ['created_at', 'public_metrics', 'lang', 'entities'],
      });

      const mentions: TwitterMention[] = [];

      for await (const tweet of tweets) {
        const mention = this.transformToTwitterMention(tweet, user.data);
        if (mention) {
          mentions.push(mention);
        }
      }

      return mentions;
    } catch (error) {
      console.error(`Error fetching tweets for user ${username}:`, error);
      throw error;
    }
  }

  /**
   * Start filtered stream
   */
  async startFilteredStream(
    rules: Array<{ value: string; tag?: string }>,
    onTweet: (mention: TwitterMention) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    try {
      // Delete existing rules
      const existingRules = await this.client.v2.streamRules();
      if (existingRules.data?.length) {
        await this.client.v2.updateStreamRules({
          delete: { ids: existingRules.data.map((rule) => rule.id) },
        });
      }

      // Add new rules
      await this.client.v2.updateStreamRules({
        add: rules,
      });

      // Start streaming
      const stream = await this.client.v2.searchStream({
        'tweet.fields': ['created_at', 'public_metrics', 'author_id', 'lang', 'entities', 'referenced_tweets'],
        'user.fields': ['username', 'name', 'verified', 'public_metrics'],
        expansions: ['author_id', 'referenced_tweets.id'],
      });

      this.isStreaming = true;
      this.reconnectAttempts = 0;

      stream.on(ETwitterStreamEvent.Data, (tweet) => {
        try {
          const mention = this.transformToTwitterMention(tweet.data);
          if (mention) {
            onTweet(mention);
          }
        } catch (error) {
          console.error('Error processing tweet:', error);
        }
      });

      stream.on(ETwitterStreamEvent.DataError, (error) => {
        console.error('Stream data error:', error);
        if (onError) {
          onError(new Error('Stream data error'));
        }
      });

      stream.on(ETwitterStreamEvent.ConnectionError, (error) => {
        console.error('Stream connection error:', error);
        this.handleReconnect(rules, onTweet, onError);
      });

      stream.on(ETwitterStreamEvent.Error, (error: any) => {
        console.error('Stream error:', error);
        if (onError) {
          onError(error instanceof Error ? error : new Error(String(error)));
        }
      });

      stream.on(ETwitterStreamEvent.ConnectionClosed, () => {
        console.log('Stream connection closed');
        this.isStreaming = false;
      });

    } catch (error) {
      console.error('Error starting filtered stream:', error);
      if (onError) {
        onError(error as Error);
      }
      throw error;
    }
  }

  /**
   * Handle reconnection after stream failure
   */
  private async handleReconnect(
    rules: Array<{ value: string; tag?: string }>,
    onTweet: (mention: TwitterMention) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      if (onError) {
        onError(new Error('Max reconnection attempts reached'));
      }
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 60000); // Exponential backoff, max 60s

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.startFilteredStream(rules, onTweet, onError);
    }, delay);
  }

  /**
   * Stop streaming
   */
  stopStream(): void {
    this.isStreaming = false;
    // The stream will close on next iteration
  }

  /**
   * Transform Twitter API response to TwitterMention
   */
  private transformToTwitterMention(tweet: TweetV2, author?: any): TwitterMention | null {
    try {
      // Extract symbols and hashtags
      const symbols: string[] = [];
      const hashtags: string[] = [];
      const mentions: string[] = [];

      if (tweet.entities) {
        // Cashtags ($BTC, $ETH)
        if (tweet.entities.cashtags) {
          tweet.entities.cashtags.forEach((tag) => {
            symbols.push(tag.tag.toUpperCase());
          });
        }

        // Hashtags
        if (tweet.entities.hashtags) {
          tweet.entities.hashtags.forEach((tag) => {
            hashtags.push(`#${tag.tag}`);

            // Map common hashtags to symbols
            const hashtagUpper = tag.tag.toUpperCase();
            if (['BITCOIN', 'BTC'].includes(hashtagUpper)) symbols.push('BTC');
            if (['ETHEREUM', 'ETH'].includes(hashtagUpper)) symbols.push('ETH');
            if (['CRYPTO', 'CRYPTOCURRENCY'].includes(hashtagUpper)) {
              // Generic crypto hashtag - don't add specific symbol
            } else if (hashtagUpper.length >= 2 && hashtagUpper.length <= 10) {
              // Might be a symbol
              symbols.push(hashtagUpper);
            }
          });
        }

        // Mentions
        if (tweet.entities.mentions) {
          tweet.entities.mentions.forEach((mention) => {
            mentions.push(`@${mention.username}`);
          });
        }
      }

      // Get metrics
      const metrics = tweet.public_metrics || {
        retweet_count: 0,
        reply_count: 0,
        like_count: 0,
        quote_count: 0,
      };

      // Determine if retweet or quote
      const isRetweet = tweet.referenced_tweets?.some((ref) => ref.type === 'retweeted') || false;
      const isQuote = tweet.referenced_tweets?.some((ref) => ref.type === 'quoted') || false;

      const twitterMention: TwitterMention = {
        id: crypto.randomUUID(),
        platform: 'twitter',
        platformId: tweet.id,
        tweetId: tweet.id,
        author: author?.username || tweet.author_id || 'unknown',
        authorId: tweet.author_id || 'unknown',
        authorFollowers: author?.public_metrics?.followers_count,
        authorVerified: author?.verified || false,

        // Content
        text: tweet.text,
        url: `https://twitter.com/i/web/status/${tweet.id}`,
        language: tweet.lang,

        // Engagement
        likes: metrics.like_count || 0,
        retweets: metrics.retweet_count,
        replies: metrics.reply_count || 0,
        views: 0,

        // Timestamps
        createdAt: tweet.created_at ? new Date(tweet.created_at) : new Date(),
        fetchedAt: new Date(),

        // Extracted data
        symbols: Array.from(new Set(symbols)),
        hashtags: Array.from(new Set(hashtags)),
        mentions: Array.from(new Set(mentions)),

        // Flags
        isAnalyzed: false,
        isInfluencer: (author?.public_metrics?.followers_count || 0) > 10000,
        isVerified: author?.verified || false,
        isRetweet,
        isReply: tweet.referenced_tweets?.some((ref) => ref.type === 'replied_to') || false,

        // Twitter-specific
        conversationId: tweet.conversation_id,
        isQuote,
        retweetCount: metrics.retweet_count || 0,
        quoteCount: metrics.quote_count || 0,
        replyCount: metrics.reply_count || 0,
        likeCount: metrics.like_count || 0,
        bookmarkCount: 0,
      };

      return twitterMention;
    } catch (error) {
      console.error('Error transforming tweet:', error);
      return null;
    }
  }

  /**
   * Get stream status
   */
  getStreamStatus(): { isStreaming: boolean; reconnectAttempts: number } {
    return {
      isStreaming: this.isStreaming,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * Get current stream rules
   */
  async getStreamRules(): Promise<Array<{ id: string; value: string; tag?: string }>> {
    try {
      const rules = await this.client.v2.streamRules();
      return rules.data || [];
    } catch (error) {
      console.error('Error fetching stream rules:', error);
      return [];
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.v2.me();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Create Twitter service instance
 */
export function createTwitterService(bearerToken: string): TwitterService {
  return new TwitterService(bearerToken);
}

/**
 * Singleton instance (requires bearer token from env)
 */
export const twitterService = process.env.TWITTER_BEARER_TOKEN
  ? new TwitterService(process.env.TWITTER_BEARER_TOKEN)
  : undefined;
