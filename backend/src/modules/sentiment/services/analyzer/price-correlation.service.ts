/**
 * Price Correlation Service
 * Analyzes correlation between sentiment and price movements
 *
 * Features:
 * - Pearson correlation calculation
 * - Leading/lagging relationship detection
 * - Sentiment-driven price signal generation
 * - Multi-timeframe analysis
 * - Divergence detection
 *
 * @module sentiment/services/analyzer/price-correlation
 */

import type { AggregatedSentiment } from '../../types/sentiment.types';

/**
 * Price Data Point
 */
export interface PriceDataPoint {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Correlation Result
 */
export interface CorrelationResult {
  symbol: string;
  coefficient: number; // -1 to 1 (Pearson correlation)
  pValue: number; // Statistical significance (0 to 1)
  isSignificant: boolean; // p-value < 0.05
  strength: 'very_weak' | 'weak' | 'moderate' | 'strong' | 'very_strong';
  direction: 'positive' | 'negative' | 'none';
  lag: number; // Time lag in hours (sentiment leads if positive, lags if negative)
  dataPoints: number;
  timeframe: string;
  calculatedAt: Date;
}

/**
 * Divergence Detection Result
 */
export interface DivergenceResult {
  symbol: string;
  type: 'bullish' | 'bearish';
  severity: 'weak' | 'moderate' | 'strong';
  sentimentTrend: 'up' | 'down';
  priceTrend: 'up' | 'down';
  startTime: Date;
  endTime: Date;
  description: string;
}

/**
 * Sentiment-Price Signal
 */
export interface SentimentPriceSignal {
  symbol: string;
  signal: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
  confidence: number; // 0 to 1
  reasoning: string[];
  sentimentScore: number;
  priceChange: number;
  correlation: number;
  generatedAt: Date;
}

/**
 * Correlation Configuration
 */
export interface CorrelationConfig {
  /**
   * Minimum data points for correlation
   * Default: 20
   */
  minDataPoints: number;

  /**
   * Time windows to analyze (hours)
   * Default: [1, 4, 24, 168] (1h, 4h, 24h, 1w)
   */
  timeframes: number[];

  /**
   * Max lag to test (hours)
   * Default: 24 (test up to 24h lag)
   */
  maxLag: number;

  /**
   * P-value threshold for significance
   * Default: 0.05 (95% confidence)
   */
  significanceThreshold: number;

  /**
   * Divergence detection threshold
   * Default: 0.3 (30% difference in normalized trends)
   */
  divergenceThreshold: number;
}

/**
 * Price Correlation Service
 */
export class PriceCorrelationService {
  private config: CorrelationConfig;

  constructor(config?: Partial<CorrelationConfig>) {
    this.config = {
      minDataPoints: config?.minDataPoints || 20,
      timeframes: config?.timeframes || [1, 4, 24, 168], // 1h, 4h, 24h, 1w
      maxLag: config?.maxLag || 24,
      significanceThreshold: config?.significanceThreshold || 0.05,
      divergenceThreshold: config?.divergenceThreshold || 0.3,
    };
  }

  /**
   * Calculate correlation between sentiment and price
   */
  async calculateCorrelation(
    sentimentData: Array<{ timestamp: Date; score: number }>,
    priceData: PriceDataPoint[],
    symbol: string,
    timeframeHours?: number
  ): Promise<CorrelationResult> {
    // Align data points by timestamp
    const aligned = this.alignDataPoints(sentimentData, priceData);

    if (aligned.length < this.config.minDataPoints) {
      throw new Error(`Insufficient data points. Need at least ${this.config.minDataPoints}, got ${aligned.length}`);
    }

    // Calculate price returns (percentage change)
    const priceReturns = aligned.map((point, i) => {
      if (i === 0) return 0;
      return ((point.price - aligned[i - 1].price) / aligned[i - 1].price) * 100;
    });

    // Extract sentiment scores
    const sentimentScores = aligned.map((point) => point.sentiment);

    // Calculate Pearson correlation
    const coefficient = this.pearsonCorrelation(sentimentScores, priceReturns);

    // Calculate p-value (approximate)
    const pValue = this.calculatePValue(coefficient, aligned.length);

    // Determine statistical significance
    const isSignificant = pValue < this.config.significanceThreshold;

    // Determine correlation strength
    const strength = this.determineStrength(Math.abs(coefficient));

    // Determine direction
    let direction: CorrelationResult['direction'];
    if (Math.abs(coefficient) < 0.1) {
      direction = 'none';
    } else if (coefficient > 0) {
      direction = 'positive';
    } else {
      direction = 'negative';
    }

    // Find optimal lag (sentiment leading or lagging price)
    const lag = await this.findOptimalLag(sentimentScores, priceReturns);

    return {
      symbol,
      coefficient: parseFloat(coefficient.toFixed(4)),
      pValue: parseFloat(pValue.toFixed(4)),
      isSignificant,
      strength,
      direction,
      lag,
      dataPoints: aligned.length,
      timeframe: timeframeHours ? `${timeframeHours}h` : 'custom',
      calculatedAt: new Date(),
    };
  }

  /**
   * Calculate correlation for multiple timeframes
   */
  async calculateMultiTimeframeCorrelation(
    sentimentData: Array<{ timestamp: Date; score: number }>,
    priceData: PriceDataPoint[],
    symbol: string
  ): Promise<CorrelationResult[]> {
    const results: CorrelationResult[] = [];

    for (const timeframeHours of this.config.timeframes) {
      try {
        // Filter data for this timeframe
        const cutoff = new Date(Date.now() - timeframeHours * 3600000);

        const filteredSentiment = sentimentData.filter((d) => d.timestamp >= cutoff);
        const filteredPrice = priceData.filter((d) => d.timestamp >= cutoff);

        if (filteredSentiment.length >= this.config.minDataPoints &&
            filteredPrice.length >= this.config.minDataPoints) {
          const result = await this.calculateCorrelation(
            filteredSentiment,
            filteredPrice,
            symbol,
            timeframeHours
          );
          results.push(result);
        }
      } catch (error) {
        console.error(`Error calculating correlation for ${timeframeHours}h:`, error);
      }
    }

    return results;
  }

  /**
   * Detect divergences between sentiment and price
   */
  async detectDivergences(
    sentimentData: Array<{ timestamp: Date; score: number }>,
    priceData: PriceDataPoint[]
  ): Promise<DivergenceResult[]> {
    const divergences: DivergenceResult[] = [];

    // Need at least 10 points to detect divergence
    if (sentimentData.length < 10 || priceData.length < 10) {
      return divergences;
    }

    // Align data
    const aligned = this.alignDataPoints(sentimentData, priceData);

    // Calculate trends (using linear regression)
    const sentimentTrend = this.calculateTrend(aligned.map((p) => p.sentiment));
    const priceTrend = this.calculateTrend(aligned.map((p) => p.price));

    // Normalize trends to -1 to 1 scale
    const sentimentSlope = sentimentTrend / 100; // Sentiment is -100 to 100
    const priceSlope = priceTrend / aligned[0].price; // Normalize by initial price

    // Check for divergence
    const difference = Math.abs(sentimentSlope - priceSlope);

    if (difference > this.config.divergenceThreshold) {
      // Bullish divergence: price down, sentiment up
      if (priceSlope < 0 && sentimentSlope > 0) {
        divergences.push({
          symbol: priceData[0] ? 'UNKNOWN' : 'UNKNOWN', // Would need symbol passed in
          type: 'bullish',
          severity: this.determineDivergenceSeverity(difference),
          sentimentTrend: 'up',
          priceTrend: 'down',
          startTime: aligned[0].timestamp,
          endTime: aligned[aligned.length - 1].timestamp,
          description: 'Price declining while sentiment improving - potential reversal signal',
        });
      }
      // Bearish divergence: price up, sentiment down
      else if (priceSlope > 0 && sentimentSlope < 0) {
        divergences.push({
          symbol: priceData[0] ? 'UNKNOWN' : 'UNKNOWN',
          type: 'bearish',
          severity: this.determineDivergenceSeverity(difference),
          sentimentTrend: 'down',
          priceTrend: 'up',
          startTime: aligned[0].timestamp,
          endTime: aligned[aligned.length - 1].timestamp,
          description: 'Price rising while sentiment deteriorating - potential correction signal',
        });
      }
    }

    return divergences;
  }

  /**
   * Generate trading signals based on sentiment-price correlation
   */
  async generateSignals(
    currentSentiment: AggregatedSentiment,
    priceData: PriceDataPoint[],
    correlation: CorrelationResult
  ): Promise<SentimentPriceSignal> {
    const reasoning: string[] = [];
    let signalStrength = 0; // -2 to +2

    // Factor 1: Current sentiment score
    if (currentSentiment.score > 60) {
      signalStrength += 1;
      reasoning.push(`Strong positive sentiment (${currentSentiment.score})`);
    } else if (currentSentiment.score < -60) {
      signalStrength -= 1;
      reasoning.push(`Strong negative sentiment (${currentSentiment.score})`);
    }

    // Factor 2: Sentiment trend
    if (currentSentiment.trend.direction === 'improving') {
      signalStrength += 0.5;
      reasoning.push('Sentiment improving');
    } else if (currentSentiment.trend.direction === 'deteriorating') {
      signalStrength -= 0.5;
      reasoning.push('Sentiment deteriorating');
    }

    // Factor 3: Correlation strength
    if (correlation.isSignificant) {
      if (correlation.direction === 'positive') {
        // Strong positive correlation: sentiment predicts price
        const correlationBoost = Math.abs(correlation.coefficient) * 0.5;
        signalStrength += (currentSentiment.score > 0 ? correlationBoost : -correlationBoost);
        reasoning.push(`Strong ${correlation.direction} correlation (${correlation.coefficient.toFixed(2)})`);
      }
    } else {
      reasoning.push('Weak correlation - sentiment not predictive');
    }

    // Factor 4: Recent price change
    if (priceData.length >= 2) {
      const recentPriceChange = ((priceData[priceData.length - 1].close - priceData[0].close) / priceData[0].close) * 100;

      // Divergence check: if sentiment and price diverge, it's a potential reversal
      if (currentSentiment.score > 20 && recentPriceChange < -5) {
        signalStrength += 1;
        reasoning.push('Bullish divergence detected');
      } else if (currentSentiment.score < -20 && recentPriceChange > 5) {
        signalStrength -= 1;
        reasoning.push('Bearish divergence detected');
      }
    }

    // Map signal strength to signal type
    let signal: SentimentPriceSignal['signal'];
    let confidence: number;

    if (signalStrength >= 1.5) {
      signal = 'strong_buy';
      confidence = Math.min(0.95, 0.6 + signalStrength * 0.15);
    } else if (signalStrength >= 0.5) {
      signal = 'buy';
      confidence = 0.5 + signalStrength * 0.2;
    } else if (signalStrength <= -1.5) {
      signal = 'strong_sell';
      confidence = Math.min(0.95, 0.6 + Math.abs(signalStrength) * 0.15);
    } else if (signalStrength <= -0.5) {
      signal = 'sell';
      confidence = 0.5 + Math.abs(signalStrength) * 0.2;
    } else {
      signal = 'neutral';
      confidence = 0.3;
      reasoning.push('No strong signal detected');
    }

    const recentPriceChange = priceData.length >= 2
      ? ((priceData[priceData.length - 1].close - priceData[0].close) / priceData[0].close) * 100
      : 0;

    return {
      symbol: currentSentiment.symbol,
      signal,
      confidence: parseFloat(confidence.toFixed(2)),
      reasoning,
      sentimentScore: currentSentiment.score,
      priceChange: parseFloat(recentPriceChange.toFixed(2)),
      correlation: correlation.coefficient,
      generatedAt: new Date(),
    };
  }

  /**
   * Align sentiment and price data by timestamp
   */
  private alignDataPoints(
    sentimentData: Array<{ timestamp: Date; score: number }>,
    priceData: PriceDataPoint[]
  ): Array<{ timestamp: Date; sentiment: number; price: number }> {
    const aligned: Array<{ timestamp: Date; sentiment: number; price: number }> = [];

    // For each sentiment data point, find closest price point
    sentimentData.forEach((sentiment) => {
      // Find nearest price point (within 30 minutes)
      const nearest = priceData.find((price) => {
        const diff = Math.abs(price.timestamp.getTime() - sentiment.timestamp.getTime());
        return diff < 1800000; // 30 minutes
      });

      if (nearest) {
        aligned.push({
          timestamp: sentiment.timestamp,
          sentiment: sentiment.score,
          price: nearest.close,
        });
      }
    });

    return aligned;
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private pearsonCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) return 0;

    return numerator / denominator;
  }

  /**
   * Calculate p-value (approximate using t-distribution)
   */
  private calculatePValue(r: number, n: number): number {
    if (n < 3) return 1;

    // t-statistic
    const t = (r * Math.sqrt(n - 2)) / Math.sqrt(1 - r * r);

    // Degrees of freedom
    const df = n - 2;

    // Approximate p-value using normal approximation
    // (For more accuracy, use a proper t-distribution library)
    const p = 2 * (1 - this.normalCDF(Math.abs(t)));

    return Math.max(0, Math.min(1, p));
  }

  /**
   * Normal cumulative distribution function (approximation)
   */
  private normalCDF(z: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp((-z * z) / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

    return z > 0 ? 1 - p : p;
  }

  /**
   * Find optimal lag between sentiment and price
   */
  private async findOptimalLag(sentiment: number[], price: number[]): Promise<number> {
    let bestLag = 0;
    let bestCorrelation = 0;

    // Test different lags
    for (let lag = -this.config.maxLag; lag <= this.config.maxLag; lag++) {
      const correlation = this.calculateLaggedCorrelation(sentiment, price, lag);

      if (Math.abs(correlation) > Math.abs(bestCorrelation)) {
        bestCorrelation = correlation;
        bestLag = lag;
      }
    }

    return bestLag;
  }

  /**
   * Calculate correlation with lag
   */
  private calculateLaggedCorrelation(x: number[], y: number[], lag: number): number {
    if (lag === 0) {
      return this.pearsonCorrelation(x, y);
    }

    if (lag > 0) {
      // Sentiment leads price
      const xLagged = x.slice(0, -lag);
      const yLagged = y.slice(lag);
      return this.pearsonCorrelation(xLagged, yLagged);
    } else {
      // Price leads sentiment
      const xLagged = x.slice(-lag);
      const yLagged = y.slice(0, lag);
      return this.pearsonCorrelation(xLagged, yLagged);
    }
  }

  /**
   * Calculate trend (linear regression slope)
   */
  private calculateTrend(values: number[]): number {
    const n = values.length;
    if (n < 2) return 0;

    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    return slope;
  }

  /**
   * Determine correlation strength
   */
  private determineStrength(absCorr: number): CorrelationResult['strength'] {
    if (absCorr >= 0.7) return 'very_strong';
    if (absCorr >= 0.5) return 'strong';
    if (absCorr >= 0.3) return 'moderate';
    if (absCorr >= 0.1) return 'weak';
    return 'very_weak';
  }

  /**
   * Determine divergence severity
   */
  private determineDivergenceSeverity(difference: number): DivergenceResult['severity'] {
    if (difference >= 0.6) return 'strong';
    if (difference >= 0.4) return 'moderate';
    return 'weak';
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CorrelationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): CorrelationConfig {
    return { ...this.config };
  }
}

/**
 * Create Price Correlation Service
 */
export function createPriceCorrelationService(config?: Partial<CorrelationConfig>): PriceCorrelationService {
  return new PriceCorrelationService(config);
}

/**
 * Singleton instance
 */
export const priceCorrelationService = new PriceCorrelationService({
  minDataPoints: parseInt(process.env.CORRELATION_MIN_DATA_POINTS || '20', 10),
  timeframes: process.env.CORRELATION_TIMEFRAMES
    ? JSON.parse(process.env.CORRELATION_TIMEFRAMES)
    : [1, 4, 24, 168],
  maxLag: parseInt(process.env.CORRELATION_MAX_LAG || '24', 10),
  significanceThreshold: parseFloat(process.env.CORRELATION_SIGNIFICANCE || '0.05'),
  divergenceThreshold: parseFloat(process.env.CORRELATION_DIVERGENCE_THRESHOLD || '0.3'),
});
