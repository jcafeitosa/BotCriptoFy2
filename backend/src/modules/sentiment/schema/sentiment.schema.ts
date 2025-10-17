/**
 * Sentiment Analysis Schema
 * TimescaleDB hypertables for news, social media, and sentiment data
 *
 * @module sentiment/schema
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  numeric,
  integer,
  bigint,
  jsonb,
  boolean,
  index,
  primaryKey,
  unique,
} from 'drizzle-orm/pg-core';

// ============================================================================
// NEWS ARTICLES (Hypertable)
// ============================================================================

/**
 * News Articles
 * Stores articles from various sources (CryptoPanic, RSS, etc.)
 */
export const newsArticles = pgTable(
  'news_articles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    source: varchar('source', { length: 50 }).notNull(), // cryptopanic, rss_coindesk, etc.
    sourceUrl: varchar('source_url', { length: 500 }).notNull(),
    platformId: varchar('platform_id', { length: 200 }), // External ID from source

    // Content
    title: varchar('title', { length: 500 }).notNull(),
    content: text('content'),
    summary: text('summary'),
    author: varchar('author', { length: 200 }),
    url: varchar('url', { length: 1000 }).notNull(),
    imageUrl: varchar('image_url', { length: 1000 }),
    category: varchar('category', { length: 50 }),
    language: varchar('language', { length: 10 }),

    // Timestamps
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull(),

    // Symbols/coins mentioned
    symbols: jsonb('symbols').$type<string[]>().notNull(), // ['BTC', 'ETH', ...]

    // Sentiment analysis results
    sentimentScore: numeric('sentiment_score', { precision: 5, scale: 2 }), // -100 to 100
    sentimentMagnitude: numeric('sentiment_magnitude', { precision: 3, scale: 2 }), // 0 to 1
    sentimentLabel: varchar('sentiment_label', { length: 20 }), // very_negative, negative, neutral, positive, very_positive
    sentimentProvider: varchar('sentiment_provider', { length: 20 }), // ai, local, hybrid
    sentimentConfidence: numeric('sentiment_confidence', { precision: 3, scale: 2 }), // 0 to 1

    // Metrics
    votes: integer('votes').default(0),
    views: integer('views').default(0),

    // Flags
    isAnalyzed: boolean('is_analyzed').notNull().default(false),
    isImportant: boolean('is_important').default(false),
    isTrending: boolean('is_trending').default(false),

    // Metadata
    metadata: jsonb('metadata'), // Additional source-specific data

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    publishedAtIdx: index('news_published_at_idx').on(table.publishedAt),
    sourceIdx: index('news_source_idx').on(table.source),
    symbolsIdx: index('news_symbols_idx').using('gin', table.symbols),
    categoryIdx: index('news_category_idx').on(table.category),
    sentimentIdx: index('news_sentiment_idx').on(table.sentimentScore),
    importantIdx: index('news_important_idx').on(table.isImportant),
    trendingIdx: index('news_trending_idx').on(table.isTrending),
    analyzedIdx: index('news_analyzed_idx').on(table.isAnalyzed),
    urlUnique: unique('news_url_unique').on(table.url),
  })
);

// ============================================================================
// SOCIAL MENTIONS (Hypertable)
// ============================================================================

/**
 * Social Media Mentions
 * Stores mentions from Twitter, Reddit, etc.
 */
export const socialMentions = pgTable(
  'social_mentions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    platform: varchar('platform', { length: 20 }).notNull(), // twitter, reddit, telegram, discord
    platformId: varchar('platform_id', { length: 200 }).notNull(), // Tweet ID, Reddit post ID, etc.

    // Author
    author: varchar('author', { length: 200 }).notNull(),
    authorId: varchar('author_id', { length: 200 }).notNull(),
    authorFollowers: integer('author_followers'),
    authorVerified: boolean('author_verified').default(false),

    // Content
    text: text('text').notNull(),
    url: varchar('url', { length: 1000 }).notNull(),
    language: varchar('language', { length: 10 }),

    // Engagement metrics
    likes: integer('likes').default(0),
    retweets: integer('retweets').default(0), // Twitter
    replies: integer('replies').default(0),
    views: integer('views').default(0),
    upvotes: integer('upvotes').default(0), // Reddit
    downvotes: integer('downvotes').default(0), // Reddit
    score: integer('score').default(0), // Reddit score

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(), // Original post time
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull(),

    // Symbols/hashtags mentioned
    symbols: jsonb('symbols').$type<string[]>().notNull(), // ['BTC', 'ETH', ...]
    hashtags: jsonb('hashtags').$type<string[]>(), // ['#bitcoin', '#crypto', ...]
    mentions: jsonb('mentions').$type<string[]>(), // ['@elonmusk', ...]

    // Sentiment analysis
    sentimentScore: numeric('sentiment_score', { precision: 5, scale: 2 }), // -100 to 100
    sentimentLabel: varchar('sentiment_label', { length: 20 }),
    sentimentProvider: varchar('sentiment_provider', { length: 20 }),

    // Flags
    isAnalyzed: boolean('is_analyzed').notNull().default(false),
    isInfluencer: boolean('is_influencer').default(false), // >10k followers
    isRetweet: boolean('is_retweet').default(false),
    isReply: boolean('is_reply').default(false),

    // Metadata (platform-specific)
    metadata: jsonb('metadata'),

    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    createdAtIdx: index('social_created_at_idx').on(table.createdAt),
    platformIdx: index('social_platform_idx').on(table.platform),
    authorIdx: index('social_author_idx').on(table.author),
    symbolsIdx: index('social_symbols_idx').using('gin', table.symbols),
    hashtagsIdx: index('social_hashtags_idx').using('gin', table.hashtags),
    sentimentIdx: index('social_sentiment_idx').on(table.sentimentScore),
    influencerIdx: index('social_influencer_idx').on(table.isInfluencer),
    platformIdUnique: unique('social_platform_id_unique').on(table.platform, table.platformId),
  })
);

// ============================================================================
// SENTIMENT SCORES (Regular Table - Frequently Updated)
// ============================================================================

/**
 * Aggregated Sentiment Scores
 * Current sentiment score for each symbol
 */
export const sentimentScores = pgTable(
  'sentiment_scores',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    symbol: varchar('symbol', { length: 20 }).notNull(),
    timeframe: varchar('timeframe', { length: 10 }).notNull(), // 5m, 15m, 1h, 4h, 24h, 7d, 30d

    // Overall sentiment
    overallScore: numeric('overall_score', { precision: 5, scale: 2 }).notNull(), // -100 to 100
    overallMagnitude: numeric('overall_magnitude', { precision: 3, scale: 2 }).notNull(), // 0 to 1
    overallLabel: varchar('overall_label', { length: 20 }).notNull(),

    // Source breakdown
    newsScore: numeric('news_score', { precision: 5, scale: 2 }),
    socialScore: numeric('social_score', { precision: 5, scale: 2 }),

    // Volume metrics
    totalMentions: integer('total_mentions').notNull().default(0),
    newsMentions: integer('news_mentions').notNull().default(0),
    socialMentions: integer('social_mentions').notNull().default(0),

    // Trend
    trend: varchar('trend', { length: 20 }).notNull(), // improving, stable, deteriorating
    trendPercentage: numeric('trend_percentage', { precision: 6, scale: 2 }), // % change

    // Fear & Greed Index
    fearGreedIndex: numeric('fear_greed_index', { precision: 5, scale: 2 }), // 0 to 100
    fearGreedLabel: varchar('fear_greed_label', { length: 20 }), // extreme_fear, fear, neutral, greed, extreme_greed

    // Confidence
    confidence: numeric('confidence', { precision: 3, scale: 2 }), // 0 to 1

    // Timestamps
    calculatedAt: timestamp('calculated_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    symbolTimeframeUnique: unique('sentiment_symbol_timeframe_unique').on(table.symbol, table.timeframe),
    symbolIdx: index('sentiment_symbol_idx').on(table.symbol),
    timeframeIdx: index('sentiment_timeframe_idx').on(table.timeframe),
    scoreIdx: index('sentiment_score_idx').on(table.overallScore),
    calculatedAtIdx: index('sentiment_calculated_at_idx').on(table.calculatedAt),
  })
);

// ============================================================================
// SENTIMENT HISTORY (Hypertable)
// ============================================================================

/**
 * Sentiment History
 * Time-series history of sentiment scores
 */
export const sentimentHistory = pgTable(
  'sentiment_history',
  {
    id: uuid('id').defaultRandom().notNull(),
    symbol: varchar('symbol', { length: 20 }).notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    timeframe: varchar('timeframe', { length: 10 }).notNull(), // 5m, 15m, 1h, 4h, 24h

    // Sentiment metrics
    score: numeric('score', { precision: 5, scale: 2 }).notNull(),
    magnitude: numeric('magnitude', { precision: 3, scale: 2 }).notNull(),
    label: varchar('label', { length: 20 }).notNull(),

    // Volume
    mentions: integer('mentions').notNull().default(0),
    newsCount: integer('news_count').notNull().default(0),
    socialCount: integer('social_count').notNull().default(0),

    // Fear & Greed
    fearGreedIndex: numeric('fear_greed_index', { precision: 5, scale: 2 }),

    // Price correlation (optional)
    price: numeric('price', { precision: 20, scale: 8 }),
    priceChange24h: numeric('price_change_24h', { precision: 6, scale: 2 }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.timestamp, table.symbol, table.timeframe] }),
    timestampIdx: index('sentiment_history_timestamp_idx').on(table.timestamp),
    symbolIdx: index('sentiment_history_symbol_idx').on(table.symbol),
    timeframeIdx: index('sentiment_history_timeframe_idx').on(table.timeframe),
    scoreIdx: index('sentiment_history_score_idx').on(table.score),
  })
);

// ============================================================================
// TRENDING TOPICS
// ============================================================================

/**
 * Trending Topics
 * Hashtags, keywords, and topics currently trending
 */
export const trendingTopics = pgTable(
  'trending_topics',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    keyword: varchar('keyword', { length: 200 }).notNull(),
    type: varchar('type', { length: 20 }).notNull(), // hashtag, cashtag, keyword
    symbol: varchar('symbol', { length: 20 }),

    // Volume metrics
    mentionCount: integer('mention_count').notNull().default(0),
    mentionGrowth: numeric('mention_growth', { precision: 6, scale: 2 }), // % growth

    // Sentiment
    averageSentiment: numeric('average_sentiment', { precision: 5, scale: 2 }),
    sentimentTrend: varchar('sentiment_trend', { length: 20 }), // improving, stable, deteriorating

    // Platform breakdown
    platforms: jsonb('platforms').$type<Array<{ platform: string; count: number }>>(),

    // Timeframe
    period: varchar('period', { length: 10 }).notNull(), // 1h, 4h, 24h
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),

    // Top posts (IDs)
    topPosts: jsonb('top_posts').$type<string[]>(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true}).defaultNow().notNull(),
  },
  (table) => ({
    keywordPeriodUnique: unique('trending_keyword_period_unique').on(table.keyword, table.period, table.timestamp),
    keywordIdx: index('trending_keyword_idx').on(table.keyword),
    symbolIdx: index('trending_symbol_idx').on(table.symbol),
    periodIdx: index('trending_period_idx').on(table.period),
    timestampIdx: index('trending_timestamp_idx').on(table.timestamp),
    mentionCountIdx: index('trending_mention_count_idx').on(table.mentionCount),
  })
);

// ============================================================================
// SENTIMENT ALERTS
// ============================================================================

/**
 * Sentiment Alerts
 * User-configured alerts for sentiment changes
 */
export const sentimentAlerts = pgTable(
  'sentiment_alerts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    symbol: varchar('symbol', { length: 20 }).notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    enabled: boolean('enabled').notNull().default(true),

    // Trigger conditions
    conditionType: varchar('condition_type', { length: 50 }).notNull(), // score_above, score_below, rapid_change, volume_spike
    conditionThreshold: numeric('condition_threshold', { precision: 10, scale: 2 }).notNull(),
    conditionTimeframe: varchar('condition_timeframe', { length: 10 }).notNull(), // 5m, 15m, 1h, 4h

    // Notification settings
    webhookUrl: varchar('webhook_url', { length: 500 }),
    email: varchar('email', { length: 200 }),
    telegram: varchar('telegram', { length: 200 }),

    // Cooldown to avoid spam
    cooldownMinutes: integer('cooldown_minutes').notNull().default(60),
    lastTriggered: timestamp('last_triggered', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('alerts_user_idx').on(table.userId),
    tenantIdx: index('alerts_tenant_idx').on(table.tenantId),
    symbolIdx: index('alerts_symbol_idx').on(table.symbol),
    enabledIdx: index('alerts_enabled_idx').on(table.enabled),
  })
);

// ============================================================================
// INFLUENCERS
// ============================================================================

/**
 * Crypto Influencers
 * Track influential accounts across platforms
 */
export const influencers = pgTable(
  'influencers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    platform: varchar('platform', { length: 20 }).notNull(), // twitter, reddit, telegram
    username: varchar('username', { length: 200 }).notNull(),
    userId: varchar('user_id', { length: 200 }).notNull(),
    displayName: varchar('display_name', { length: 200 }),
    bio: text('bio'),
    profileImage: varchar('profile_image', { length: 500 }),

    // Stats
    followers: integer('followers').notNull(),
    following: integer('following'),
    totalPosts: integer('total_posts'),

    // Verification
    isVerified: boolean('is_verified').default(false),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),

    // Crypto relevance
    cryptoRelevance: numeric('crypto_relevance', { precision: 3, scale: 2 }), // 0 to 1
    primaryTopics: jsonb('primary_topics').$type<string[]>(),

    // Tracking
    isTracked: boolean('is_tracked').notNull().default(true),
    lastPostAt: timestamp('last_post_at', { withTimezone: true }),

    // Metadata
    metadata: jsonb('metadata'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    platformUserUnique: unique('influencers_platform_user_unique').on(table.platform, table.userId),
    platformIdx: index('influencers_platform_idx').on(table.platform),
    followersIdx: index('influencers_followers_idx').on(table.followers),
    verifiedIdx: index('influencers_verified_idx').on(table.isVerified),
    trackedIdx: index('influencers_tracked_idx').on(table.isTracked),
  })
);

// ============================================================================
// RSS FEED CONFIGURATIONS
// ============================================================================

/**
 * RSS Feed Configurations
 * Configure RSS feeds for news aggregation
 */
export const rssFeedConfigs = pgTable(
  'rss_feed_configs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 200 }).notNull(),
    url: varchar('url', { length: 1000 }).notNull(),
    source: varchar('source', { length: 50 }).notNull(), // rss_coindesk, rss_cointelegraph, etc.
    category: varchar('category', { length: 50 }),
    enabled: boolean('enabled').notNull().default(true),
    pollInterval: integer('poll_interval').notNull().default(300000), // ms (5 min default)
    lastFetch: timestamp('last_fetch', { withTimezone: true }),
    lastError: text('last_error'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    urlUnique: unique('rss_url_unique').on(table.url),
    sourceIdx: index('rss_source_idx').on(table.source),
    enabledIdx: index('rss_enabled_idx').on(table.enabled),
  })
);

/**
 * TimescaleDB SQL Migration
 *
 * Run these commands after creating the tables:
 *
 * -- Convert to hypertables
 * SELECT create_hypertable('news_articles', 'published_at', if_not_exists => TRUE);
 * SELECT create_hypertable('social_mentions', 'created_at', if_not_exists => TRUE);
 * SELECT create_hypertable('sentiment_history', 'timestamp', if_not_exists => TRUE);
 *
 * -- Create retention policies (keep data for 90 days)
 * SELECT add_retention_policy('news_articles', INTERVAL '90 days');
 * SELECT add_retention_policy('social_mentions', INTERVAL '90 days');
 * SELECT add_retention_policy('sentiment_history', INTERVAL '365 days');
 *
 * -- Create continuous aggregate for hourly sentiment
 * CREATE MATERIALIZED VIEW sentiment_history_1h
 * WITH (timescaledb.continuous) AS
 * SELECT
 *   time_bucket('1 hour', timestamp) AS bucket,
 *   symbol,
 *   timeframe,
 *   AVG(score) AS avg_score,
 *   AVG(magnitude) AS avg_magnitude,
 *   SUM(mentions) AS total_mentions,
 *   AVG(fear_greed_index) AS avg_fear_greed
 * FROM sentiment_history
 * WHERE timeframe = '5m'
 * GROUP BY bucket, symbol, timeframe;
 *
 * -- Add refresh policy
 * SELECT add_continuous_aggregate_policy('sentiment_history_1h',
 *   start_offset => INTERVAL '2 hours',
 *   end_offset => INTERVAL '5 minutes',
 *   schedule_interval => INTERVAL '5 minutes');
 */
