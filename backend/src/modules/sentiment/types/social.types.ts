/**
 * Social Media Types
 * Types for social media mentions (Twitter, Reddit)
 *
 * @module sentiment/types/social
 */

/**
 * Social Platform
 */
export type SocialPlatform = 'twitter' | 'reddit' | 'telegram' | 'discord';

/**
 * Social Mention Base
 */
export interface SocialMention {
  id: string;
  platform: SocialPlatform;
  platformId: string; // Tweet ID, Reddit post ID, etc.
  author: string;
  authorId: string;
  authorFollowers?: number;
  authorVerified?: boolean;

  // Content
  text: string;
  url: string;
  language?: string;

  // Engagement metrics
  likes: number;
  retweets?: number;     // Twitter
  replies: number;
  views?: number;
  upvotes?: number;      // Reddit
  downvotes?: number;    // Reddit

  // Metadata
  createdAt: Date;
  fetchedAt: Date;

  // Symbols/hashtags mentioned
  symbols: string[];
  hashtags: string[];
  mentions: string[];    // @mentions

  // Sentiment (populated after analysis)
  sentimentScore?: number;
  sentimentMagnitude?: number; // 0 to 1
  sentimentConfidence?: number; // 0 to 1
  sentimentLabel?: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';

  // Flags
  isAnalyzed: boolean;
  isInfluencer?: boolean; // Author has >10k followers
  isVerified?: boolean;
  isRetweet?: boolean;
  isReply?: boolean;
}

/**
 * Twitter/X Mention
 */
export interface TwitterMention extends SocialMention {
  platform: 'twitter';
  tweetId: string;
  conversationId?: string;
  quoteTweetId?: string;
  inReplyToUserId?: string;
  isRetweet: boolean;
  isQuote: boolean;
  retweetCount: number;
  quoteCount: number;
  replyCount: number;
  likeCount: number;
  bookmarkCount: number;
  impressionCount?: number;
}

/**
 * Reddit Mention
 */
export interface RedditMention extends SocialMention {
  platform: 'reddit';
  postId: string;
  subreddit: string;
  postType: 'text' | 'link' | 'image' | 'video';
  score: number;
  upvoteRatio: number;
  numComments: number;
  distinguished?: 'moderator' | 'admin' | null;
  stickied: boolean;
  over18: boolean;
  spoiler: boolean;
}

/**
 * Social Volume Metrics
 */
export interface SocialVolumeMetrics {
  symbol: string;
  timeframe: '5m' | '15m' | '1h' | '4h' | '24h' | '7d';
  timestamp: Date;

  // Total counts
  totalMentions: number;
  twitterMentions: number;
  redditMentions: number;

  // Unique authors
  uniqueAuthors: number;

  // Engagement metrics
  totalLikes: number;
  totalRetweets: number;
  totalReplies: number;
  totalViews: number;

  // Influencer metrics
  influencerMentions: number;
  verifiedMentions: number;

  // Trending
  isRapidlyGrowing: boolean;
  growthPercentage: number;

  // Top mentions (by engagement)
  topMentions: SocialMention[];
}

/**
 * Trending Topic
 */
export interface TrendingTopic {
  id?: string; // Optional ID for tracking
  keyword: string;
  type: 'hashtag' | 'cashtag' | 'keyword';
  symbol?: string;
  symbols?: string[]; // Alternative plural form for compatibility

  // Volume metrics
  mentionCount: number;
  mentionGrowth: number; // % growth in last hour
  score?: number; // Overall trending score (0-100)

  // Sentiment
  averageSentiment: number;
  sentimentTrend: 'improving' | 'stable' | 'deteriorating';
  trendType?: 'rising' | 'falling' | 'stable' | 'emerging' | 'peak' | 'declining' | 'sustained'; // Trend classification

  // Platforms
  platforms: Array<{
    platform: SocialPlatform;
    count: number;
  }>;

  // Timeframe
  period: '1h' | '4h' | '24h';
  timestamp: Date;

  // Top posts
  topPosts: SocialMention[];
}

/**
 * Influencer
 */
export interface Influencer {
  platform: SocialPlatform;
  username: string;
  userId: string;
  displayName: string;
  bio?: string;
  profileImage?: string;

  // Stats
  followers: number;
  following: number;
  totalPosts: number;

  // Verification
  isVerified: boolean;
  verifiedAt?: Date;

  // Crypto relevance
  cryptoRelevance: number; // 0-1 score
  primaryTopics: string[];

  // Tracking
  isTracked: boolean;
  addedAt: Date;
  lastPostAt?: Date;

  // Metadata
  metadata?: Record<string, any>;
}

/**
 * Social Filter Options
 */
export interface SocialFilterOptions {
  platform?: SocialPlatform | SocialPlatform[];
  symbols?: string | string[];
  hashtags?: string[];
  authors?: string[];
  isInfluencer?: boolean;
  isVerified?: boolean;
  minLikes?: number;
  minRetweets?: number;
  language?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Twitter Stream Configuration
 */
export interface TwitterStreamConfig {
  // Tracking
  track: string[];     // Keywords to track
  follow: string[];    // User IDs to follow
  locations?: number[]; // Geographic bounding boxes

  // Filters
  language?: string[];
  minFollowers?: number;

  // Batch settings
  batchSize: number;
  batchInterval: number; // ms
}

/**
 * Reddit Stream Configuration
 */
export interface RedditStreamConfig {
  // Subreddits to monitor
  subreddits: string[];

  // Post types
  postTypes: Array<'submission' | 'comment'>;

  // Filters
  minScore?: number;
  minUpvoteRatio?: number;

  // Polling
  pollInterval: number; // ms
}

/**
 * Social Aggregation Result
 */
export interface SocialAggregation {
  symbol: string;
  period: '1h' | '4h' | '24h' | '7d';

  // Volume
  totalMentions: number;
  uniqueAuthors: number;

  // Sentiment
  averageSentiment: number;
  sentimentDistribution: {
    veryNegative: number;
    negative: number;
    neutral: number;
    positive: number;
    veryPositive: number;
  };

  // Engagement
  totalEngagement: number;
  averageEngagement: number;

  // Top content
  topHashtags: Array<{
    hashtag: string;
    count: number;
  }>;

  topAuthors: Array<{
    author: string;
    mentions: number;
    followers: number;
  }>;

  // Platform breakdown
  platformStats: Array<{
    platform: SocialPlatform;
    mentions: number;
    engagement: number;
  }>;
}

/**
 * Social Stream Event
 */
export interface SocialStreamEvent {
  type: 'new_mention' | 'trending_hashtag' | 'influencer_post' | 'viral_post';
  timestamp: Date;
  platform: SocialPlatform;
  data: SocialMention | TrendingTopic;
}
