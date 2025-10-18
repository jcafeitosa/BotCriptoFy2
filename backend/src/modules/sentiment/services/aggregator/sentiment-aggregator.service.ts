/**
 * Sentiment Aggregator Service
 * Combines sentiment from multiple sources into unified scores
 *
 * Features:
 * - Multi-source aggregation (news, Twitter, Reddit)
 * - Weighted averaging based on source, recency, engagement
 * - Fear & Greed Index calculation
 * - Trend detection
 * - Historical tracking
 *
 * @module sentiment/services/aggregator/sentiment-aggregator
 */

import { db } from '@/db';
import { eq, and, gte, lte, desc, sql, inArray } from 'drizzle-orm';
import {
  newsArticles,
  socialMentions,
  sentimentScores,
  sentimentHistory,
} from '../../schema/sentiment.schema';
import type {
  SentimentAnalysisResult,
  AggregatedSentiment,
  SentimentTrend,
  FearGreedIndex,
} from '../../types/sentiment.types';
import type { NewsArticle } from '../../types/news.types';
import type { SocialMention } from '../../types/social.types';

/**
 * Helper: Parse timeframe string to milliseconds
 */
function parseTimeframe(timeframe: string): number {
  const match = timeframe.match(/^(\d+)([mhd])$/);
  if (!match) return 86400000; // Default 24h

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'm': return value * 60 * 1000; // minutes
    case 'h': return value * 60 * 60 * 1000; // hours
    case 'd': return value * 24 * 60 * 60 * 1000; // days
    default: return 86400000;
  }
}

/**
 * Source weights for aggregation
 */
const SOURCE_WEIGHTS = {
  // News sources (most reliable)
  cryptopanic: 1.0,
  coindesk: 0.95,
  cointelegraph: 0.9,
  theblock: 0.95,
  decrypt: 0.85,
  bitcoinmagazine: 0.85,
  cryptoslate: 0.8,
  newsbtc: 0.75,
  coingape: 0.7,
  utoday: 0.7,
  bitcoincom: 0.75,
  rss: 0.7,

  // Social sources (less reliable, but valuable for sentiment)
  twitter: 0.6,
  reddit: 0.5,
  telegram: 0.55,
  discord: 0.45,
};

/**
 * Aggregation Configuration
 */
export interface AggregatorConfig {
  /**
   * Time window for aggregation (milliseconds)
   * Default: 24 hours
   */
  timeWindow: number;

  /**
   * Minimum data points required for aggregation
   * Default: 5
   */
  minDataPoints: number;

  /**
   * Recency decay factor (exponential)
   * Higher = more weight on recent data
   * Default: 0.5 (moderate decay)
   */
  recencyDecay: number;

  /**
   * Engagement weight multiplier
   * Default: 0.3 (30% influence)
   */
  engagementWeight: number;

  /**
   * Influencer boost multiplier
   * Default: 1.5 (50% boost for influencer posts)
   */
  influencerBoost: number;

  /**
   * Fear & Greed calculation weights
   */
  fearGreedWeights: {
    sentiment: number; // Sentiment score influence
    volume: number; // Social volume influence
    volatility: number; // Price volatility influence
    momentum: number; // Trend momentum influence
  };
}

/**
 * Sentiment Data Point
 */
interface SentimentDataPoint {
  source: string;
  score: number; // -100 to 100
  magnitude: number; // 0 to 1
  confidence: number; // 0 to 1
  timestamp: Date;
  weight: number; // Calculated weight
  engagement?: number;
  isInfluencer?: boolean;
  symbols: string[];
}

/**
 * Sentiment Aggregator Service
 */
export class SentimentAggregatorService {
  private config: AggregatorConfig;

  constructor(config?: Partial<AggregatorConfig>) {
    this.config = {
      timeWindow: config?.timeWindow || 86400000, // 24 hours
      minDataPoints: config?.minDataPoints || 5,
      recencyDecay: config?.recencyDecay || 0.5,
      engagementWeight: config?.engagementWeight || 0.3,
      influencerBoost: config?.influencerBoost || 1.5,
      fearGreedWeights: config?.fearGreedWeights || {
        sentiment: 0.4,
        volume: 0.25,
        volatility: 0.2,
        momentum: 0.15,
      },
    };
  }

  /**
   * Aggregate sentiment from news articles
   */
  async aggregateFromNews(
    articles: NewsArticle[],
    symbol?: string
  ): Promise<AggregatedSentiment | null> {
    // Filter by symbol if provided
    const filtered = symbol
      ? articles.filter((a) => a.symbols.includes(symbol))
      : articles;

    // Filter by time window
    const cutoff = new Date(Date.now() - this.config.timeWindow);
    const recent = filtered.filter((a) => a.publishedAt >= cutoff);

    if (recent.length < this.config.minDataPoints) {
      return null; // Not enough data
    }

    // Convert to data points
    const dataPoints: SentimentDataPoint[] = recent
      .filter((a) => a.sentimentScore !== undefined)
      .map((article) => ({
        source: article.source,
        score: article.sentimentScore!,
        magnitude: article.sentimentMagnitude || 0.5,
        confidence: 0.8, // News articles have high confidence
        timestamp: article.publishedAt,
        weight: this.calculateNewsWeight(article),
        engagement: article.votes,
        symbols: article.symbols,
      }));

    return this.aggregateDataPoints(dataPoints, symbol);
  }

  /**
   * Aggregate sentiment from social mentions
   */
  async aggregateFromSocial(
    mentions: SocialMention[],
    symbol?: string
  ): Promise<AggregatedSentiment | null> {
    // Filter by symbol if provided
    const filtered = symbol
      ? mentions.filter((m) => m.symbols.includes(symbol))
      : mentions;

    // Filter by time window
    const cutoff = new Date(Date.now() - this.config.timeWindow);
    const recent = filtered.filter((m) => m.createdAt >= cutoff);

    if (recent.length < this.config.minDataPoints) {
      return null;
    }

    // Convert to data points (requires sentiment analysis)
    // Note: This assumes mentions have been analyzed
    const dataPoints: SentimentDataPoint[] = recent
      .filter((m) => m.sentimentScore !== undefined)
      .map((mention) => ({
        source: mention.platform,
        score: mention.sentimentScore!,
        magnitude: mention.sentimentMagnitude || 0.5,
        confidence: mention.sentimentConfidence || 0.5,
        timestamp: mention.createdAt,
        weight: this.calculateSocialWeight(mention),
        engagement: this.calculateEngagement(mention),
        isInfluencer: mention.isInfluencer,
        symbols: mention.symbols,
      }));

    return this.aggregateDataPoints(dataPoints, symbol);
  }

  /**
   * Aggregate sentiment from mixed sources
   */
  async aggregateFromAll(
    news: NewsArticle[],
    social: SocialMention[],
    symbol?: string
  ): Promise<AggregatedSentiment | null> {
    // Combine data points from both sources
    const newsPoints: SentimentDataPoint[] = news
      .filter((a) => a.sentimentScore !== undefined)
      .filter((a) => !symbol || a.symbols.includes(symbol))
      .filter((a) => a.publishedAt >= new Date(Date.now() - this.config.timeWindow))
      .map((article) => ({
        source: article.source,
        score: article.sentimentScore!,
        magnitude: article.sentimentMagnitude || 0.5,
        confidence: 0.8,
        timestamp: article.publishedAt,
        weight: this.calculateNewsWeight(article),
        engagement: article.votes,
        symbols: article.symbols,
      }));

    const socialPoints: SentimentDataPoint[] = social
      .filter((m) => m.sentimentScore !== undefined)
      .filter((m) => !symbol || m.symbols.includes(symbol))
      .filter((m) => m.createdAt >= new Date(Date.now() - this.config.timeWindow))
      .map((mention) => ({
        source: mention.platform,
        score: mention.sentimentScore!,
        magnitude: mention.sentimentMagnitude || 0.5,
        confidence: mention.sentimentConfidence || 0.5,
        timestamp: mention.createdAt,
        weight: this.calculateSocialWeight(mention),
        engagement: this.calculateEngagement(mention),
        isInfluencer: mention.isInfluencer,
        symbols: mention.symbols,
      }));

    const allPoints = [...newsPoints, ...socialPoints];

    if (allPoints.length < this.config.minDataPoints) {
      return null;
    }

    return this.aggregateDataPoints(allPoints, symbol);
  }

  /**
   * Aggregate data points into unified sentiment
   */
  private aggregateDataPoints(
    dataPoints: SentimentDataPoint[],
    symbol?: string
  ): AggregatedSentiment {
    // Calculate weighted average score
    let totalWeightedScore = 0;
    let totalWeight = 0;
    let totalMagnitude = 0;
    let totalConfidence = 0;

    const now = Date.now();

    dataPoints.forEach((point) => {
      // Apply recency decay
      const ageHours = (now - point.timestamp.getTime()) / 3600000;
      const recencyMultiplier = Math.exp(-this.config.recencyDecay * ageHours);

      // Apply engagement boost
      const engagementBoost = point.engagement
        ? 1 + (this.config.engagementWeight * Math.log(1 + point.engagement)) / 10
        : 1;

      // Apply influencer boost
      const influencerMultiplier = point.isInfluencer ? this.config.influencerBoost : 1;

      // Final weight
      const finalWeight = point.weight * recencyMultiplier * engagementBoost * influencerMultiplier;

      totalWeightedScore += point.score * finalWeight;
      totalWeight += finalWeight;
      totalMagnitude += point.magnitude;
      totalConfidence += point.confidence;
    });

    const avgScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
    const avgMagnitude = dataPoints.length > 0 ? totalMagnitude / dataPoints.length : 0;
    const avgConfidence = dataPoints.length > 0 ? totalConfidence / dataPoints.length : 0;

    // Determine label
    const label = this.scoreToLabel(avgScore);

    // Calculate trend
    const trendData = this.calculateTrend(dataPoints);

    // Calculate source breakdown
    const sourceBreakdown = this.calculateSourceBreakdown(dataPoints);

    // Calculate volume
    const volume = dataPoints.length;

    // Calculate change (compared to older half of data)
    const change = this.calculateChange(dataPoints);

    // Calculate scores by source type
    const newsPoints = dataPoints.filter((p) =>
      ['cryptopanic', 'coindesk', 'cointelegraph', 'theblock', 'decrypt',
       'bitcoinmagazine', 'cryptoslate', 'newsbtc', 'coingape', 'utoday',
       'bitcoincom', 'rss'].includes(p.source)
    );

    const socialPoints = dataPoints.filter((p) =>
      ['twitter', 'reddit', 'telegram', 'discord'].includes(p.source)
    );

    const newsScore = newsPoints.length > 0
      ? newsPoints.reduce((sum, p) => sum + p.score, 0) / newsPoints.length
      : 0;

    const socialScore = socialPoints.length > 0
      ? socialPoints.reduce((sum, p) => sum + p.score, 0) / socialPoints.length
      : 0;

    const newsMentions = newsPoints.length;
    const socialMentions = socialPoints.length;

    // Calculate Fear & Greed Index
    // Based on sentiment score (40%), volume (25%), volatility (20%), momentum (15%)
    const sentimentComponent = ((avgScore + 100) / 200) * 100; // Normalize -100..100 to 0..100
    const volumeComponent = Math.min(100, (dataPoints.length / 10) * 100); // Assume 1000 is max
    const volatilityComponent = 50; // Default (would need price data for actual calculation)
    const momentumComponent = ((change + 100) / 200) * 100; // Normalize trend change

    const fearGreedIndex = (
      sentimentComponent * 0.4 +
      volumeComponent * 0.25 +
      volatilityComponent * 0.2 +
      momentumComponent * 0.15
    );

    let fearGreedLabel: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
    if (fearGreedIndex >= 75) fearGreedLabel = 'extreme_greed';
    else if (fearGreedIndex >= 55) fearGreedLabel = 'greed';
    else if (fearGreedIndex >= 45) fearGreedLabel = 'neutral';
    else if (fearGreedIndex >= 25) fearGreedLabel = 'fear';
    else fearGreedLabel = 'extreme_fear';

    const aggregated: AggregatedSentiment = {
      symbol: symbol || 'OVERALL',
      timeframe: '24h',
      timestamp: new Date(),
      score: parseFloat(avgScore.toFixed(2)),
      overallScore: parseFloat(avgScore.toFixed(2)),
      overallMagnitude: parseFloat(avgMagnitude.toFixed(2)),
      overallLabel: label,
      label: label,
      newsScore: parseFloat(newsScore.toFixed(2)),
      socialScore: parseFloat(socialScore.toFixed(2)),
      totalMentions: dataPoints.length,
      newsMentions,
      socialMentions,
      trend: trendData.direction,
      trendPercentage: change,
      fearGreedIndex: parseFloat(fearGreedIndex.toFixed(2)),
      fearGreedLabel,
      confidence: parseFloat(avgConfidence.toFixed(2)),
      updatedAt: new Date(),
    };

    return aggregated;
  }

  /**
   * Calculate Fear & Greed Index
   */
  async calculateFearGreedIndex(
    aggregatedSentiment: AggregatedSentiment,
    socialVolume: number,
    priceVolatility: number,
    priceMomentum: number
  ): Promise<FearGreedIndex> {
    const weights = this.config.fearGreedWeights;

    // Normalize inputs to 0-100 scale
    const sentimentNorm = ((aggregatedSentiment.score + 100) / 200) * 100; // -100..100 → 0..100
    const volumeNorm = Math.min(100, (socialVolume / 1000) * 100); // Assume 1000 is max
    const volatilityNorm = 100 - Math.min(100, priceVolatility * 100); // High volatility = fear
    const momentumNorm = ((priceMomentum + 100) / 200) * 100; // -100..100 → 0..100

    // Calculate weighted index
    const index =
      sentimentNorm * weights.sentiment +
      volumeNorm * weights.volume +
      volatilityNorm * weights.volatility +
      momentumNorm * weights.momentum;

    // Determine label
    let indexLabel: FearGreedIndex['label'];
    if (index >= 75) indexLabel = 'extreme_greed';
    else if (index >= 55) indexLabel = 'greed';
    else if (index >= 45) indexLabel = 'neutral';
    else if (index >= 25) indexLabel = 'fear';
    else indexLabel = 'extreme_fear';

    return {
      value: parseFloat(index.toFixed(2)),
      label: indexLabel,
      timestamp: new Date(),
    };
  }

  /**
   * Calculate news article weight
   */
  private calculateNewsWeight(article: NewsArticle): number {
    let weight = SOURCE_WEIGHTS[article.source as keyof typeof SOURCE_WEIGHTS] || 0.5;

    // Boost for important news
    if (article.isImportant) {
      weight *= 1.3;
    }

    // Boost for trending news
    if (article.isTrending) {
      weight *= 1.2;
    }

    return weight;
  }

  /**
   * Calculate social mention weight
   */
  private calculateSocialWeight(mention: SocialMention): number {
    let weight = SOURCE_WEIGHTS[mention.platform] || 0.5;

    // Boost for verified users
    if ('isVerified' in mention && mention.isVerified) {
      weight *= 1.3;
    }

    // Boost for influencers
    if (mention.isInfluencer) {
      weight *= 1.4;
    }

    return weight;
  }

  /**
   * Calculate engagement score
   */
  private calculateEngagement(mention: SocialMention): number {
    let engagement = 0;

    engagement += mention.likes || 0;
    engagement += (mention.replies || 0) * 2; // Replies worth more
    engagement += (mention.views || 0) / 10; // Views worth less

    if ('retweets' in mention) {
      engagement += (mention.retweets || 0) * 3; // Retweets worth most
    }

    if ('upvotes' in mention) {
      engagement += mention.upvotes || 0;
    }

    return engagement;
  }

  /**
   * Calculate trend from data points
   */
  private calculateTrend(dataPoints: SentimentDataPoint[]): {
    direction: SentimentTrend;
    strength: number;
    velocity: number;
  } {
    if (dataPoints.length < 2) {
      return {
        direction: 'stable',
        strength: 0,
        velocity: 0,
      };
    }

    // Sort by timestamp
    const sorted = [...dataPoints].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Split into two halves
    const mid = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, mid);
    const secondHalf = sorted.slice(mid);

    // Calculate average scores
    const firstAvg = firstHalf.reduce((sum, p) => sum + p.score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, p) => sum + p.score, 0) / secondHalf.length;

    const change = secondAvg - firstAvg;
    const strength = Math.abs(change) / 100; // Normalize to 0-1

    // Determine direction
    let direction: SentimentTrend;
    if (Math.abs(change) < 5) direction = 'stable';
    else if (change > 0) direction = 'improving';
    else direction = 'deteriorating';

    // Calculate velocity (change per hour)
    const timespan = (sorted[sorted.length - 1].timestamp.getTime() - sorted[0].timestamp.getTime()) / 3600000;
    const velocity = timespan > 0 ? change / timespan : 0;

    return {
      direction,
      strength: parseFloat(strength.toFixed(2)),
      velocity: parseFloat(velocity.toFixed(2)),
    };
  }

  /**
   * Calculate change compared to older data
   */
  private calculateChange(dataPoints: SentimentDataPoint[]): number {
    if (dataPoints.length < 2) return 0;

    const sorted = [...dataPoints].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const mid = Math.floor(sorted.length / 2);

    const firstHalf = sorted.slice(0, mid);
    const secondHalf = sorted.slice(mid);

    const firstAvg = firstHalf.reduce((sum, p) => sum + p.score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, p) => sum + p.score, 0) / secondHalf.length;

    return parseFloat((secondAvg - firstAvg).toFixed(2));
  }

  /**
   * Calculate source breakdown
   */
  private calculateSourceBreakdown(
    dataPoints: SentimentDataPoint[]
  ): Record<string, { count: number; avgScore: number; weight: number }> {
    const breakdown: Record<string, { count: number; totalScore: number; totalWeight: number }> = {};

    dataPoints.forEach((point) => {
      if (!breakdown[point.source]) {
        breakdown[point.source] = {
          count: 0,
          totalScore: 0,
          totalWeight: 0,
        };
      }

      breakdown[point.source].count++;
      breakdown[point.source].totalScore += point.score;
      breakdown[point.source].totalWeight += point.weight;
    });

    // Calculate averages
    const result: Record<string, { count: number; avgScore: number; weight: number }> = {};
    Object.entries(breakdown).forEach(([source, data]) => {
      result[source] = {
        count: data.count,
        avgScore: parseFloat((data.totalScore / data.count).toFixed(2)),
        weight: parseFloat((data.totalWeight / data.count).toFixed(2)),
      };
    });

    return result;
  }

  /**
   * Convert score to label
   */
  private scoreToLabel(score: number): AggregatedSentiment['label'] {
    if (score >= 60) return 'very_positive';
    if (score >= 20) return 'positive';
    if (score >= -20) return 'neutral';
    if (score >= -60) return 'negative';
    return 'very_negative';
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AggregatorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): AggregatorConfig {
    return { ...this.config };
  }

  /**
   * Get Aggregated Sentiment for a symbol
   * Fetches from database and calculates if needed
   */
  async getAggregatedSentiment(symbol: string, timeframe: string = '24h'): Promise<any> {
    try {
      const symbolUpper = symbol.toUpperCase();

      // Try to fetch existing aggregated sentiment from database
      const existingSentiment = await db
        .select()
        .from(sentimentScores)
        .where(
          and(
            eq(sentimentScores.symbol, symbolUpper),
            eq(sentimentScores.timeframe, timeframe)
          )
        )
        .limit(1);

      if (existingSentiment.length > 0) {
        const sentiment = existingSentiment[0];
        return {
          symbol: symbolUpper,
          score: parseFloat(sentiment.overallScore as any),
          magnitude: parseFloat(sentiment.overallMagnitude as any),
          label: sentiment.overallLabel,
          confidence: parseFloat(sentiment.confidence as any) || 0.7,
          trend: {
            direction: sentiment.trend,
            strength: Math.abs(parseFloat(sentiment.trendPercentage as any) || 0) / 50,
          },
          newsScore: parseFloat(sentiment.newsScore as any) || 0,
          socialScore: parseFloat(sentiment.socialScore as any) || 0,
          totalMentions: sentiment.totalMentions || 0,
          newsMentions: sentiment.newsMentions || 0,
          socialMentions: sentiment.socialMentions || 0,
          fearGreedIndex: parseFloat(sentiment.fearGreedIndex as any) || 50,
          fearGreedLabel: sentiment.fearGreedLabel,
          sources: ['database'],
          timeframe,
          timestamp: sentiment.updatedAt.toISOString(),
        };
      }

      // If no cached data, calculate from raw data
      const timeMs = parseTimeframe(timeframe);
      const cutoffDate = new Date(Date.now() - timeMs);

      // Fetch recent news articles
      const news = await db
        .select()
        .from(newsArticles)
        .where(
          and(
            sql`${newsArticles.symbols} @> ${JSON.stringify([symbolUpper])}`,
            gte(newsArticles.publishedAt, cutoffDate),
            eq(newsArticles.isAnalyzed, true)
          )
        )
        .limit(1000);

      // Fetch recent social mentions
      const social = await db
        .select()
        .from(socialMentions)
        .where(
          and(
            sql`${socialMentions.symbols} @> ${JSON.stringify([symbolUpper])}`,
            gte(socialMentions.createdAt, cutoffDate),
            eq(socialMentions.isAnalyzed, true)
          )
        )
        .limit(1000);

      // If we have data, aggregate it
      if (news.length > 0 || social.length > 0) {
        const aggregated = await this.aggregateFromAll(news as any[], social as any[], symbolUpper);

        if (aggregated) {
          return {
            symbol: symbolUpper,
            score: aggregated.score,
            magnitude: aggregated.overallMagnitude,
            label: aggregated.label,
            confidence: aggregated.confidence,
            trend: {
              direction: aggregated.trend,
              strength: Math.abs(aggregated.trendPercentage) / 50,
            },
            newsScore: aggregated.newsScore,
            socialScore: aggregated.socialScore,
            totalMentions: aggregated.totalMentions,
            newsMentions: aggregated.newsMentions,
            socialMentions: aggregated.socialMentions,
            fearGreedIndex: aggregated.fearGreedIndex,
            fearGreedLabel: aggregated.fearGreedLabel,
            sources: ['news', 'social'],
            timeframe,
            timestamp: new Date().toISOString(),
          };
        }
      }

      // Return neutral default if no data
      return {
        symbol: symbolUpper,
        score: 0,
        magnitude: 0.5,
        label: 'neutral',
        confidence: 0.5,
        trend: {
          direction: 'stable',
          strength: 0,
        },
        newsScore: 0,
        socialScore: 0,
        totalMentions: 0,
        newsMentions: 0,
        socialMentions: 0,
        fearGreedIndex: 50,
        fearGreedLabel: 'neutral',
        sources: [],
        timeframe,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error getting aggregated sentiment:', error);
      // Return neutral on error
      return {
        symbol: symbol.toUpperCase(),
        score: 0,
        magnitude: 0.5,
        label: 'neutral',
        confidence: 0.5,
        trend: {
          direction: 'stable',
          strength: 0,
        },
        sources: [],
        timeframe,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Analyze Multi-Source Sentiment
   * Mock implementation - analyzes from multiple sources
   */
  async analyzeMultiSource(symbol: string, sources: string[] = ['local'], timeframe: string = '24h'): Promise<any> {
    // Mock implementation
    const results = sources.map(source => ({
      source,
      score: Math.random() * 2 - 1, // -1 to 1
      label: 'neutral',
      confidence: 0.7,
    }));

    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

    return {
      symbol: symbol.toUpperCase(),
      aggregated: {
        score: avgScore,
        label: avgScore > 0.2 ? 'positive' : avgScore < -0.2 ? 'negative' : 'neutral',
        confidence: 0.7,
      },
      sources: results,
      timeframe,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Create Sentiment Aggregator instance
 */
export function createSentimentAggregator(config?: Partial<AggregatorConfig>): SentimentAggregatorService {
  return new SentimentAggregatorService(config);
}

/**
 * Singleton instance
 */
export const sentimentAggregator = new SentimentAggregatorService({
  timeWindow: parseInt(process.env.SENTIMENT_TIME_WINDOW || '86400000', 10),
  minDataPoints: parseInt(process.env.SENTIMENT_MIN_DATA_POINTS || '5', 10),
  recencyDecay: parseFloat(process.env.SENTIMENT_RECENCY_DECAY || '0.5'),
  engagementWeight: parseFloat(process.env.SENTIMENT_ENGAGEMENT_WEIGHT || '0.3'),
  influencerBoost: parseFloat(process.env.SENTIMENT_INFLUENCER_BOOST || '1.5'),
});
