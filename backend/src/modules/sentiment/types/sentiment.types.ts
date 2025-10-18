/**
 * Sentiment Analysis Types
 * Types for sentiment analysis and scoring
 *
 * @module sentiment/types/sentiment
 */

/**
 * Sentiment Label
 */
export type SentimentLabel =
  | 'very_negative'  // -100 to -60
  | 'negative'       // -60 to -20
  | 'neutral'        // -20 to 20
  | 'positive'       // 20 to 60
  | 'very_positive'; // 60 to 100

/**
 * Sentiment Analysis Provider
 */
export type SentimentProvider = 'ai' | 'local' | 'hybrid';

/**
 * Sentiment Analysis Result
 */
export interface SentimentAnalysisResult {
  // Score (-100 to 100)
  score: number;

  // Magnitude (0 to 1) - strength of emotion
  magnitude: number;

  // Label classification
  label: SentimentLabel;

  // Confidence (0 to 1)
  confidence: number;

  // Provider used
  provider: SentimentProvider;

  // Metadata
  processedAt: Date;
  processingTime: number;

  // Detailed sentiment aspects
  aspects?: {
    fear?: number;      // 0 to 1
    greed?: number;     // 0 to 1
    uncertainty?: number; // 0 to 1
    hype?: number;      // 0 to 1
  };

  // Keywords/phrases that influenced the score
  keywords?: Array<{
    word: string;
    score: number;
    weight: number;
  }>;
}

/**
 * Aggregated Sentiment Score
 */
export interface AggregatedSentiment {
  symbol: string;
  timeframe: '5m' | '15m' | '1h' | '4h' | '24h' | '7d' | '30d';
  timestamp: Date;

  // Overall sentiment
  score: number;              // -100 to 100 (alias for overallScore)
  overallScore: number;       // -100 to 100
  overallMagnitude: number;   // 0 to 1
  overallLabel: SentimentLabel;
  label: SentimentLabel;      // alias for overallLabel

  // Source breakdown
  newsScore: number;
  socialScore: number;

  // Volume metrics
  totalMentions: number;
  newsMentions: number;
  socialMentions: number;

  // Trend
  trend: 'improving' | 'stable' | 'deteriorating';
  trendPercentage: number; // % change from previous period

  // Fear & Greed components
  fearGreedIndex: number; // 0 to 100 (0=fear, 100=greed)
  fearGreedLabel: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';

  // Confidence
  confidence: number; // 0 to 1

  // Last update
  updatedAt: Date;
}

/**
 * Sentiment History Point
 */
export interface SentimentHistoryPoint {
  symbol: string;
  timestamp: Date;
  score: number;
  magnitude: number;
  mentions: number;
  newsCount: number;
  socialCount: number;
  price?: number; // optional price correlation
}

/**
 * Sentiment Alert Configuration
 */
export interface SentimentAlert {
  id: string;
  userId: string;
  symbol: string;
  name: string;
  enabled: boolean;

  // Trigger conditions
  conditions: {
    type: 'score_above' | 'score_below' | 'rapid_change' | 'volume_spike';
    threshold: number;
    timeframe: '5m' | '15m' | '1h' | '4h';
  };

  // Notification settings
  notification: {
    webhook?: string;
    email?: string;
    telegram?: string;
  };

  // Cooldown to avoid spam
  cooldownMinutes: number;
  lastTriggered?: Date;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Sentiment Configuration
 */
export interface SentimentConfig {
  // Analysis settings
  aiProvider: 'claude' | 'openai' | 'none';
  aiModel: string;
  aiThreshold: number; // Confidence threshold to use AI vs local

  // Update intervals
  newsUpdateInterval: number;   // ms
  socialUpdateInterval: number; // ms
  aggregationInterval: number;  // ms

  // Scoring weights
  weights: {
    news: number;       // 0-1
    twitter: number;    // 0-1
    reddit: number;     // 0-1
  };

  // Fear & Greed calculation
  fearGreedWeights: {
    sentiment: number;    // 0-1
    volume: number;       // 0-1
    volatility: number;   // 0-1
    momentum: number;     // 0-1
  };
}

/**
 * Sentiment Stream Event
 */
export interface SentimentStreamEvent {
  type: 'sentiment_update' | 'news_alert' | 'trending_topic' | 'volume_spike';
  timestamp: Date;
  symbol?: string;
  data: Record<string, any>;
}

/**
 * Text Analysis Options
 */
export interface TextAnalysisOptions {
  // Provider selection
  provider?: SentimentProvider;

  // Force AI analysis even if local is confident
  forceAI?: boolean;

  // Context for better analysis
  context?: {
    symbol?: string;
    author?: string;
    source?: string;
    isInfluencer?: boolean;
    isImportant?: boolean;
  };

  // Language
  language?: string;
}

/**
 * Batch Analysis Request
 */
export interface BatchAnalysisRequest {
  texts: Array<{
    id: string;
    text: string;
    metadata?: Record<string, any>;
  }>;
  options?: TextAnalysisOptions;
}

/**
 * Batch Analysis Result
 */
export interface BatchAnalysisResult {
  results: Array<{
    id: string;
    sentiment: SentimentAnalysisResult;
    error?: string;
  }>;
  totalProcessed: number;
  totalErrors: number;
  averageProcessingTime: number;
}

/**
 * Sentiment Trend Direction
 */
export type SentimentTrend = 'improving' | 'stable' | 'deteriorating';

/**
 * Fear & Greed Index Value
 */
export interface FearGreedIndex {
  value: number; // 0-100
  label: 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';
  timestamp: Date;
}
