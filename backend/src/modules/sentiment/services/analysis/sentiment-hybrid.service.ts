/**
 * Hybrid Sentiment Analysis Service
 * Intelligently routes between local NLP and AI analysis
 *
 * Strategy:
 * 1. Try local NLP first (fast, free)
 * 2. If confidence < threshold, use AI (accurate, paid)
 * 3. Cache results to avoid duplicate API calls
 * 4. Track usage statistics
 *
 * @module sentiment/services/analysis/sentiment-hybrid
 */

import type {
  SentimentAnalysisResult,
  TextAnalysisOptions,
  BatchAnalysisRequest,
  BatchAnalysisResult,
} from '../../types/sentiment.types';
import { SentimentLocalService } from './sentiment-local.service';
import { SentimentAIService } from './sentiment-ai.service';

/**
 * Hybrid Service Configuration
 */
export interface HybridConfig {
  /**
   * Confidence threshold to trigger AI analysis
   * Default: 0.7 (70%)
   * If local confidence < threshold, use AI
   */
  confidenceThreshold: number;

  /**
   * Always use AI for certain conditions
   */
  alwaysUseAI?: {
    minTextLength?: number; // Use AI for texts longer than N chars
    forInfluencers?: boolean; // Use AI for influencer posts
    forImportantNews?: boolean; // Use AI for important news
  };

  /**
   * Cache configuration
   */
  cache?: {
    enabled: boolean;
    ttl: number; // Time to live in milliseconds
    maxSize: number; // Max number of cached results
  };

  /**
   * AI Service configuration
   */
  ai?: {
    apiKey: string;
    model?: string;
  };
}

/**
 * Cache Entry
 */
interface CacheEntry {
  result: SentimentAnalysisResult;
  timestamp: number;
}

/**
 * Usage Statistics
 */
export interface UsageStats {
  totalAnalyses: number;
  localAnalyses: number;
  aiAnalyses: number;
  cacheHits: number;
  localRatio: number; // % of analyses done locally
  aiRatio: number; // % of analyses done with AI
  cacheHitRatio: number; // % of cache hits
  averageConfidence: {
    local: number;
    ai: number;
    overall: number;
  };
  costEstimate?: {
    totalTokens: number;
    estimatedCost: number; // USD
  };
}

/**
 * Hybrid Sentiment Analysis Service
 */
export class SentimentHybridService {
  private localService: SentimentLocalService;
  private aiService?: SentimentAIService;
  private config: HybridConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private stats: UsageStats = {
    totalAnalyses: 0,
    localAnalyses: 0,
    aiAnalyses: 0,
    cacheHits: 0,
    localRatio: 0,
    aiRatio: 0,
    cacheHitRatio: 0,
    averageConfidence: {
      local: 0,
      ai: 0,
      overall: 0,
    },
  };

  constructor(config?: Partial<HybridConfig>) {
    this.config = {
      confidenceThreshold: config?.confidenceThreshold || 0.7,
      alwaysUseAI: config?.alwaysUseAI || {
        minTextLength: 500,
        forInfluencers: true,
        forImportantNews: true,
      },
      cache: config?.cache || {
        enabled: true,
        ttl: 3600000, // 1 hour
        maxSize: 1000,
      },
      ai: config?.ai,
    };

    // Initialize services
    this.localService = new SentimentLocalService();

    if (this.config.ai?.apiKey) {
      this.aiService = new SentimentAIService(
        this.config.ai.apiKey,
        this.config.ai.model
      );
    }

    // Start cache cleanup interval (every 5 minutes)
    if (this.config.cache?.enabled) {
      setInterval(() => this.cleanupCache(), 300000);
    }
  }

  /**
   * Analyze text with hybrid approach
   */
  async analyze(
    text: string,
    options?: TextAnalysisOptions & {
      forceAI?: boolean; // Force use of AI service
      forceLocal?: boolean; // Force use of local service
    }
  ): Promise<SentimentAnalysisResult> {
    this.stats.totalAnalyses++;

    // Check cache first
    if (this.config.cache?.enabled) {
      const cached = this.getCached(text);
      if (cached) {
        this.stats.cacheHits++;
        this.updateStats();
        return cached;
      }
    }

    // Force AI if requested
    if (options?.forceAI && this.aiService) {
      const result = await this.analyzeWithAI(text, options);
      this.setCached(text, result);
      this.updateStats();
      return result;
    }

    // Force local if requested
    if (options?.forceLocal) {
      const result = await this.analyzeWithLocal(text, options);
      this.setCached(text, result);
      this.updateStats();
      return result;
    }

    // Check if should always use AI
    if (this.shouldAlwaysUseAI(text, options)) {
      if (this.aiService) {
        const result = await this.analyzeWithAI(text, options);
        this.setCached(text, result);
        this.updateStats();
        return result;
      }
      // Fallback to local if AI not available
      console.warn('AI service not configured, falling back to local');
    }

    // Default hybrid approach: try local first
    const localResult = await this.analyzeWithLocal(text, options);

    // If local confidence is high enough, use it
    if (localResult.confidence >= this.config.confidenceThreshold) {
      this.setCached(text, localResult);
      this.updateStats();
      return localResult;
    }

    // Low confidence, use AI if available
    if (this.aiService) {
      console.log(
        `Local confidence ${localResult.confidence.toFixed(2)} < ${this.config.confidenceThreshold}, using AI`
      );
      const aiResult = await this.analyzeWithAI(text, options);
      this.setCached(text, aiResult);
      this.updateStats();
      return aiResult;
    }

    // AI not available, return local result with warning
    console.warn('AI service not configured, using local result despite low confidence');
    this.setCached(text, localResult);
    this.updateStats();
    return localResult;
  }

  /**
   * Batch analyze with hybrid approach
   */
  async analyzeBatch(request: BatchAnalysisRequest): Promise<BatchAnalysisResult> {
    const startTime = Date.now();
    const results: BatchAnalysisResult['results'] = [];
    let totalErrors = 0;

    for (const item of request.texts) {
      try {
        const sentiment = await this.analyze(item.text, request.options);
        results.push({
          id: item.id,
          sentiment,
        });
      } catch (error) {
        console.error(`Error analyzing text ${item.id}:`, error);
        results.push({
          id: item.id,
          sentiment: this.createNeutralResult(),
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        totalErrors++;
      }
    }

    const totalTime = Date.now() - startTime;

    return {
      results,
      totalProcessed: request.texts.length,
      totalErrors,
      averageProcessingTime: totalTime / request.texts.length,
    };
  }

  /**
   * Analyze with local NLP service
   */
  private async analyzeWithLocal(
    text: string,
    options?: TextAnalysisOptions
  ): Promise<SentimentAnalysisResult> {
    this.stats.localAnalyses++;
    const result = await this.localService.analyze(text, options);

    // Update local confidence average
    const totalLocal = this.stats.localAnalyses;
    this.stats.averageConfidence.local =
      (this.stats.averageConfidence.local * (totalLocal - 1) + result.confidence) / totalLocal;

    return result;
  }

  /**
   * Analyze with AI service
   */
  private async analyzeWithAI(
    text: string,
    options?: TextAnalysisOptions
  ): Promise<SentimentAnalysisResult> {
    if (!this.aiService) {
      throw new Error('AI service not configured');
    }

    this.stats.aiAnalyses++;
    const result = await this.aiService.analyze(text, options);

    // Update AI confidence average
    const totalAI = this.stats.aiAnalyses;
    this.stats.averageConfidence.ai =
      (this.stats.averageConfidence.ai * (totalAI - 1) + result.confidence) / totalAI;

    return result;
  }

  /**
   * Check if should always use AI
   */
  private shouldAlwaysUseAI(text: string, options?: TextAnalysisOptions): boolean {
    const { alwaysUseAI } = this.config;

    if (!alwaysUseAI) return false;

    // Check text length
    if (alwaysUseAI.minTextLength && text.length >= alwaysUseAI.minTextLength) {
      return true;
    }

    // Check if from influencer
    if (alwaysUseAI.forInfluencers && options?.context?.isInfluencer) {
      return true;
    }

    // Check if important news
    if (alwaysUseAI.forImportantNews && options?.context?.isImportant) {
      return true;
    }

    return false;
  }

  /**
   * Get cached result
   */
  private getCached(text: string): SentimentAnalysisResult | null {
    if (!this.config.cache?.enabled) return null;

    const cacheKey = this.getCacheKey(text);
    const entry = this.cache.get(cacheKey);

    if (!entry) return null;

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > (this.config.cache?.ttl || 3600000)) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.result;
  }

  /**
   * Set cached result
   */
  private setCached(text: string, result: SentimentAnalysisResult): void {
    if (!this.config.cache?.enabled) return;

    const cacheKey = this.getCacheKey(text);

    // Check cache size limit
    if (this.cache.size >= (this.config.cache?.maxSize || 1000)) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * Generate cache key
   */
  private getCacheKey(text: string): string {
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Cleanup expired cache entries
   */
  private cleanupCache(): void {
    if (!this.config.cache?.enabled) return;

    const now = Date.now();
    const ttl = this.config.cache?.ttl || 3600000;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    const total = this.stats.totalAnalyses;
    if (total === 0) return;

    this.stats.localRatio = (this.stats.localAnalyses / total) * 100;
    this.stats.aiRatio = (this.stats.aiAnalyses / total) * 100;
    this.stats.cacheHitRatio = (this.stats.cacheHits / total) * 100;

    // Overall average confidence
    const totalAnalyzed = this.stats.localAnalyses + this.stats.aiAnalyses;
    if (totalAnalyzed > 0) {
      this.stats.averageConfidence.overall =
        (this.stats.averageConfidence.local * this.stats.localAnalyses +
          this.stats.averageConfidence.ai * this.stats.aiAnalyses) /
        totalAnalyzed;
    }
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
      provider: 'hybrid',
      processedAt: new Date(),
      processingTime: 0,
    };
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): UsageStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalAnalyses: 0,
      localAnalyses: 0,
      aiAnalyses: 0,
      cacheHits: 0,
      localRatio: 0,
      aiRatio: 0,
      cacheHitRatio: 0,
      averageConfidence: {
        local: 0,
        ai: 0,
        overall: 0,
      },
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<HybridConfig>): void {
    this.config = { ...this.config, ...config };

    // Reinitialize AI service if needed
    if (config.ai?.apiKey && !this.aiService) {
      this.aiService = new SentimentAIService(config.ai.apiKey, config.ai.model);
    }
  }

  /**
   * Get configuration
   */
  getConfig(): HybridConfig {
    return { ...this.config };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    local: boolean;
    ai: boolean;
    cache: boolean;
  }> {
    const localHealth = true; // Local service is always available

    let aiHealth = false;
    if (this.aiService) {
      aiHealth = await this.aiService.healthCheck();
    }

    const cacheHealth = this.config.cache?.enabled || false;

    return {
      local: localHealth,
      ai: aiHealth,
      cache: cacheHealth,
    };
  }
}

/**
 * Create Hybrid Sentiment service instance
 */
export function createHybridSentimentService(config?: Partial<HybridConfig>): SentimentHybridService {
  return new SentimentHybridService(config);
}

/**
 * Singleton instance (with env config)
 */
export const hybridSentimentService = new SentimentHybridService({
  confidenceThreshold: parseFloat(process.env.SENTIMENT_CONFIDENCE_THRESHOLD || '0.7'),
  ai: process.env.ANTHROPIC_API_KEY
    ? {
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
      }
    : undefined,
  cache: {
    enabled: process.env.SENTIMENT_CACHE_ENABLED !== 'false',
    ttl: parseInt(process.env.SENTIMENT_CACHE_TTL || '3600000', 10),
    maxSize: parseInt(process.env.SENTIMENT_CACHE_MAX_SIZE || '1000', 10),
  },
  alwaysUseAI: {
    minTextLength: parseInt(process.env.SENTIMENT_AI_MIN_TEXT_LENGTH || '500', 10),
    forInfluencers: process.env.SENTIMENT_AI_FOR_INFLUENCERS !== 'false',
    forImportantNews: process.env.SENTIMENT_AI_FOR_IMPORTANT !== 'false',
  },
});
