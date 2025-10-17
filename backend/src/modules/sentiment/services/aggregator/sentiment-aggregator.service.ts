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

import type {
  SentimentAnalysisResult,
  AggregatedSentiment,
  SentimentTrend,
  FearGreedIndex,
} from '../../types/sentiment.types';
import type { NewsArticle } from '../../types/news.types';
import type { SocialMention } from '../../types/social.types';

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
    const trend = this.calculateTrend(dataPoints);

    // Calculate source breakdown
    const sourceBreakdown = this.calculateSourceBreakdown(dataPoints);

    // Calculate volume
    const volume = dataPoints.length;

    // Calculate change (compared to older half of data)
    const change = this.calculateChange(dataPoints);

    const aggregated: AggregatedSentiment = {
      symbol: symbol || 'OVERALL',
      score: parseFloat(avgScore.toFixed(2)),
      magnitude: parseFloat(avgMagnitude.toFixed(2)),
      label,
      confidence: parseFloat(avgConfidence.toFixed(2)),
      trend,
      volume,
      change,
      sourceBreakdown,
      timeWindow: this.config.timeWindow,
      dataPoints: dataPoints.length,
      lastUpdated: new Date(),
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
      index: parseFloat(index.toFixed(2)),
      label: indexLabel,
      components: {
        sentiment: parseFloat(sentimentNorm.toFixed(2)),
        volume: parseFloat(volumeNorm.toFixed(2)),
        volatility: parseFloat(volatilityNorm.toFixed(2)),
        momentum: parseFloat(momentumNorm.toFixed(2)),
      },
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
  private calculateTrend(dataPoints: SentimentDataPoint[]): SentimentTrend {
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
    let direction: SentimentTrend['direction'];
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
