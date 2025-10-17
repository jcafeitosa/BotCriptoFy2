/**
 * Local Sentiment Analysis Service
 * Fast, offline sentiment analysis using sentiment.js and compromise
 *
 * @module sentiment/services/analysis/sentiment-local
 */

import Sentiment from 'sentiment';
import nlp from 'compromise';
import type { SentimentAnalysisResult, TextAnalysisOptions } from '../../types/sentiment.types';

/**
 * Custom crypto-specific lexicon for sentiment analysis
 */
const CRYPTO_LEXICON: Record<string, number> = {
  // Very positive (5)
  'moon': 5,
  'mooning': 5,
  'bullish': 5,
  'lambo': 5,
  'rocket': 5,
  'hodl': 4,
  'buy': 4,
  'pump': 4,
  'rally': 4,
  'surge': 4,
  'breakout': 4,
  'adoption': 4,
  'mainstream': 3,
  'accumulate': 3,
  'undervalued': 3,
  'gem': 4,
  'golden': 4,
  'profits': 3,
  'gains': 3,
  'winning': 3,
  'success': 3,

  // Positive (2-3)
  'green': 2,
  'up': 2,
  'rise': 2,
  'increase': 2,
  'growth': 3,
  'upgrade': 3,
  'partnership': 3,
  'innovative': 3,
  'promising': 3,

  // Very negative (-5)
  'crash': -5,
  'scam': -5,
  'rug': -5,
  'rugpull': -5,
  'dump': -5,
  'ponzi': -5,
  'fraud': -5,
  'hack': -5,
  'exploit': -5,
  'bearish': -5,
  'rekt': -5,

  // Negative (-2 to -4)
  'sell': -4,
  'selling': -4,
  'dump': -4,
  'dumping': -4,
  'fall': -3,
  'drop': -3,
  'decline': -3,
  'plunge': -4,
  'tank': -4,
  'red': -2,
  'down': -2,
  'loss': -3,
  'losses': -3,
  'concern': -2,
  'worried': -3,
  'fear': -3,
  'panic': -4,
  'bubble': -3,
  'overvalued': -3,

  // Uncertainty (-1)
  'uncertain': -1,
  'volatile': -1,
  'risky': -2,
  'speculation': -1,
  'maybe': -1,
  'might': -1,
  'could': -1,

  // Crypto slang
  'fomo': 2, // Fear of missing out
  'fud': -4, // Fear, uncertainty, doubt
  'rip': -4,
  'bag': -2, // Bagholder
  'bagholder': -3,
  'whale': 1,
  'dip': -1,
  'btfd': 3, // Buy the f*ing dip
  'wagmi': 4, // We're all gonna make it
  'ngmi': -4, // Not gonna make it
  'ath': 4, // All time high
  'atl': -3, // All time low
};

/**
 * Local Sentiment Analysis Service
 */
export class SentimentLocalService {
  private analyzer: Sentiment;

  constructor() {
    // Initialize sentiment analyzer
    this.analyzer = new Sentiment();
  }

  /**
   * Analyze text sentiment
   */
  async analyze(text: string, options?: TextAnalysisOptions): Promise<SentimentAnalysisResult> {
    const startTime = Date.now();

    // Preprocess text
    const processedText = this.preprocessText(text);

    // Run sentiment analysis with crypto-specific lexicon
    const result = this.analyzer.analyze(processedText, {
      extras: CRYPTO_LEXICON,
    });

    // Calculate normalized score (-100 to 100)
    const normalizedScore = this.normalizeScore(result.score, processedText.split(' ').length);

    // Calculate magnitude (0 to 1) based on word count and score
    const magnitude = this.calculateMagnitude(result);

    // Determine label
    const label = this.determineLabel(normalizedScore);

    // Calculate confidence (higher for extreme scores, lower for neutral)
    const confidence = this.calculateConfidence(normalizedScore, magnitude);

    // Extract keywords
    const keywords = this.extractKeywords(text, result);

    // Calculate aspects (fear, greed, uncertainty, hype)
    const aspects = this.calculateAspects(text, result);

    const analysisResult: SentimentAnalysisResult = {
      score: parseFloat(normalizedScore.toFixed(2)),
      magnitude: parseFloat(magnitude.toFixed(2)),
      label,
      confidence: parseFloat(confidence.toFixed(2)),
      provider: 'local',
      processedAt: new Date(),
      processingTime: Date.now() - startTime,
      aspects,
      keywords,
    };

    return analysisResult;
  }

  /**
   * Batch analyze multiple texts
   */
  async analyzeBatch(texts: string[], options?: TextAnalysisOptions): Promise<SentimentAnalysisResult[]> {
    const results: SentimentAnalysisResult[] = [];

    for (const text of texts) {
      try {
        const result = await this.analyze(text, options);
        results.push(result);
      } catch (error) {
        console.error('Error analyzing text:', error);
        // Return neutral result on error
        results.push(this.createNeutralResult());
      }
    }

    return results;
  }

  /**
   * Preprocess text for analysis
   */
  private preprocessText(text: string): string {
    // Convert to lowercase
    let processed = text.toLowerCase();

    // Remove URLs
    processed = processed.replace(/https?:\/\/[^\s]+/g, '');

    // Remove mentions (@username)
    processed = processed.replace(/@[\w]+/g, '');

    // Remove excessive punctuation
    processed = processed.replace(/[!?]{2,}/g, '!');

    // Remove extra whitespace
    processed = processed.replace(/\s+/g, ' ').trim();

    return processed;
  }

  /**
   * Normalize sentiment score to -100 to 100 scale
   */
  private normalizeScore(rawScore: number, wordCount: number): number {
    if (wordCount === 0) return 0;

    // Normalize based on word count (avoid extreme scores for short texts)
    const normalizedScore = (rawScore / Math.sqrt(wordCount)) * 10;

    // Clamp to -100 to 100
    return Math.max(-100, Math.min(100, normalizedScore));
  }

  /**
   * Calculate magnitude (strength of emotion)
   */
  private calculateMagnitude(result: any): number {
    const totalTokens = result.tokens.length;
    if (totalTokens === 0) return 0;

    // Count how many words have sentiment
    const sentimentWords = result.positive.length + result.negative.length;

    // Magnitude is the ratio of sentiment words to total words
    const magnitude = sentimentWords / totalTokens;

    return Math.min(1, magnitude * 2); // Scale up a bit
  }

  /**
   * Determine sentiment label
   */
  private determineLabel(score: number): SentimentAnalysisResult['label'] {
    if (score >= 60) return 'very_positive';
    if (score >= 20) return 'positive';
    if (score >= -20) return 'neutral';
    if (score >= -60) return 'negative';
    return 'very_negative';
  }

  /**
   * Calculate confidence level
   */
  private calculateConfidence(score: number, magnitude: number): number {
    // Higher confidence for extreme scores
    const scoreConfidence = Math.abs(score) / 100;

    // Higher confidence when magnitude is high
    const magnitudeConfidence = magnitude;

    // Combined confidence
    const confidence = (scoreConfidence * 0.7) + (magnitudeConfidence * 0.3);

    return Math.min(1, Math.max(0.1, confidence));
  }

  /**
   * Extract keywords that influenced sentiment
   */
  private extractKeywords(text: string, result: any): Array<{ word: string; score: number; weight: number }> {
    const keywords: Array<{ word: string; score: number; weight: number }> = [];

    // Add positive words
    result.positive.forEach((word: string) => {
      const score = CRYPTO_LEXICON[word] || 1;
      keywords.push({
        word,
        score,
        weight: score / 5, // Normalize to 0-1
      });
    });

    // Add negative words
    result.negative.forEach((word: string) => {
      const score = CRYPTO_LEXICON[word] || -1;
      keywords.push({
        word,
        score,
        weight: Math.abs(score) / 5, // Normalize to 0-1
      });
    });

    // Sort by absolute score
    keywords.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));

    // Return top 10
    return keywords.slice(0, 10);
  }

  /**
   * Calculate emotional aspects (fear, greed, uncertainty, hype)
   */
  private calculateAspects(text: string, result: any): {
    fear?: number;
    greed?: number;
    uncertainty?: number;
    hype?: number;
  } {
    const lowerText = text.toLowerCase();

    // Fear indicators
    const fearWords = ['crash', 'scam', 'hack', 'panic', 'fear', 'fud', 'rekt', 'loss', 'dump'];
    const fearScore = fearWords.reduce((sum, word) => {
      return sum + (lowerText.includes(word) ? 1 : 0);
    }, 0);

    // Greed indicators
    const greedWords = ['moon', 'lambo', 'pump', 'gains', 'profits', 'buy', 'hodl', 'rocket'];
    const greedScore = greedWords.reduce((sum, word) => {
      return sum + (lowerText.includes(word) ? 1 : 0);
    }, 0);

    // Uncertainty indicators
    const uncertaintyWords = ['maybe', 'might', 'could', 'uncertain', 'volatile', 'speculation'];
    const uncertaintyScore = uncertaintyWords.reduce((sum, word) => {
      return sum + (lowerText.includes(word) ? 1 : 0);
    }, 0);

    // Hype indicators
    const hypeWords = ['breakthrough', 'revolutionary', 'game-changer', 'mainstream', 'adoption', 'gem'];
    const hypeScore = hypeWords.reduce((sum, word) => {
      return sum + (lowerText.includes(word) ? 1 : 0);
    }, 0);

    return {
      fear: Math.min(1, fearScore / 3),
      greed: Math.min(1, greedScore / 3),
      uncertainty: Math.min(1, uncertaintyScore / 3),
      hype: Math.min(1, hypeScore / 3),
    };
  }

  /**
   * Create neutral result (for errors)
   */
  private createNeutralResult(): SentimentAnalysisResult {
    return {
      score: 0,
      magnitude: 0,
      label: 'neutral',
      confidence: 0.1,
      provider: 'local',
      processedAt: new Date(),
      processingTime: 0,
    };
  }

  /**
   * Extract entities (coins, people, exchanges)
   */
  extractEntities(text: string): {
    coins: string[];
    people: string[];
    exchanges: string[];
    technologies: string[];
  } {
    const doc = nlp(text);

    // Extract proper nouns
    const properNouns = doc.match('#ProperNoun').out('array');

    // Known exchanges
    const knownExchanges = ['binance', 'coinbase', 'kraken', 'ftx', 'okx', 'bybit', 'kucoin', 'huobi'];

    // Known technologies
    const knownTech = ['blockchain', 'defi', 'nft', 'web3', 'metaverse', 'dao', 'ethereum', 'bitcoin'];

    const entities = {
      coins: [] as string[],
      people: properNouns.filter((noun) => {
        const lower = noun.toLowerCase();
        return !knownExchanges.includes(lower) && !knownTech.includes(lower);
      }),
      exchanges: properNouns.filter((noun) => knownExchanges.includes(noun.toLowerCase())),
      technologies: properNouns.filter((noun) => knownTech.includes(noun.toLowerCase())),
    };

    // Extract coin symbols ($BTC, $ETH)
    const coinPattern = /\$([A-Z]{2,10})/g;
    const matches = text.matchAll(coinPattern);
    for (const match of matches) {
      entities.coins.push(match[1]);
    }

    return entities;
  }

  /**
   * Detect language
   */
  detectLanguage(text: string): string {
    // Simple heuristic - check for common English words
    const englishWords = ['the', 'is', 'are', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'];
    const lowerText = text.toLowerCase();
    const englishWordCount = englishWords.reduce((count, word) => {
      return count + (lowerText.includes(` ${word} `) ? 1 : 0);
    }, 0);

    return englishWordCount >= 2 ? 'en' : 'unknown';
  }
}

// Export singleton instance
export const sentimentLocalService = new SentimentLocalService();
