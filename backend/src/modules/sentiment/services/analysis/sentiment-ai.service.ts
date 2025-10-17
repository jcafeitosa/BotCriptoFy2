/**
 * AI Sentiment Analysis Service
 * High-accuracy sentiment analysis using Claude API
 *
 * @module sentiment/services/analysis/sentiment-ai
 */

import Anthropic from '@anthropic-ai/sdk';
import type { SentimentAnalysisResult, TextAnalysisOptions, BatchAnalysisRequest, BatchAnalysisResult } from '../../types/sentiment.types';

/**
 * System prompt for sentiment analysis
 */
const SENTIMENT_ANALYSIS_PROMPT = `You are an expert cryptocurrency market sentiment analyst. Analyze the provided text and determine its sentiment regarding cryptocurrency markets.

Consider:
1. Market sentiment (bullish, bearish, neutral)
2. Emotional tone (fear, greed, uncertainty, excitement)
3. Context and implications for crypto prices
4. Sarcasm, irony, and nuanced language
5. Technical and fundamental analysis mentions

Respond with a JSON object containing:
{
  "score": number (-100 to 100, where -100 is extremely bearish and 100 is extremely bullish),
  "magnitude": number (0 to 1, strength of the sentiment),
  "label": "very_negative" | "negative" | "neutral" | "positive" | "very_positive",
  "confidence": number (0 to 1, your confidence in the analysis),
  "aspects": {
    "fear": number (0 to 1),
    "greed": number (0 to 1),
    "uncertainty": number (0 to 1),
    "hype": number (0 to 1)
  },
  "keywords": [
    { "word": string, "score": number (-5 to 5), "weight": number (0 to 1) }
  ],
  "reasoning": string (brief explanation of your analysis)
}`;

/**
 * Sentiment AI Service
 */
export class SentimentAIService {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;

  constructor(apiKey: string, model: string = 'claude-3-haiku-20240307') {
    this.client = new Anthropic({
      apiKey,
    });
    this.model = model;
    this.maxTokens = 1024;
  }

  /**
   * Analyze text sentiment using Claude
   */
  async analyze(text: string, options?: TextAnalysisOptions): Promise<SentimentAnalysisResult> {
    const startTime = Date.now();

    try {
      // Add context if available
      let contextPrompt = '';
      if (options?.context) {
        const parts: string[] = [];
        if (options.context.symbol) parts.push(`Symbol: ${options.context.symbol}`);
        if (options.context.author) parts.push(`Author: ${options.context.author}`);
        if (options.context.source) parts.push(`Source: ${options.context.source}`);

        if (parts.length > 0) {
          contextPrompt = `\n\nContext:\n${parts.join('\n')}\n`;
        }
      }

      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: SENTIMENT_ANALYSIS_PROMPT,
        messages: [
          {
            role: 'user',
            content: `${contextPrompt}\nAnalyze the following text:\n\n"${text}"`,
          },
        ],
      });

      // Parse response
      const content = message.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // Extract JSON from response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to extract JSON from Claude response');
      }

      const analysis = JSON.parse(jsonMatch[0]);

      // Validate and sanitize response
      const result: SentimentAnalysisResult = {
        score: this.clamp(analysis.score, -100, 100),
        magnitude: this.clamp(analysis.magnitude, 0, 1),
        label: this.validateLabel(analysis.label),
        confidence: this.clamp(analysis.confidence, 0, 1),
        provider: 'ai',
        processedAt: new Date(),
        processingTime: Date.now() - startTime,
        aspects: {
          fear: this.clamp(analysis.aspects?.fear || 0, 0, 1),
          greed: this.clamp(analysis.aspects?.greed || 0, 0, 1),
          uncertainty: this.clamp(analysis.aspects?.uncertainty || 0, 0, 1),
          hype: this.clamp(analysis.aspects?.hype || 0, 0, 1),
        },
        keywords: (analysis.keywords || []).slice(0, 10).map((kw: any) => ({
          word: kw.word,
          score: this.clamp(kw.score, -5, 5),
          weight: this.clamp(kw.weight, 0, 1),
        })),
      };

      return result;
    } catch (error) {
      console.error('Error analyzing sentiment with AI:', error);

      // Return neutral result on error
      return {
        score: 0,
        magnitude: 0,
        label: 'neutral',
        confidence: 0.1,
        provider: 'ai',
        processedAt: new Date(),
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Batch analyze multiple texts
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

      // Rate limiting - wait 100ms between requests
      if (item !== request.texts[request.texts.length - 1]) {
        await new Promise((resolve) => setTimeout(resolve, 100));
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
   * Analyze with streaming (for long texts)
   */
  async* analyzeStream(text: string, options?: TextAnalysisOptions): AsyncGenerator<string> {
    try {
      let contextPrompt = '';
      if (options?.context) {
        const parts: string[] = [];
        if (options.context.symbol) parts.push(`Symbol: ${options.context.symbol}`);
        if (options.context.author) parts.push(`Author: ${options.context.author}`);
        if (options.context.source) parts.push(`Source: ${options.context.source}`);

        if (parts.length > 0) {
          contextPrompt = `\n\nContext:\n${parts.join('\n')}\n`;
        }
      }

      const stream = await this.client.messages.stream({
        model: this.model,
        max_tokens: this.maxTokens,
        system: SENTIMENT_ANALYSIS_PROMPT,
        messages: [
          {
            role: 'user',
            content: `${contextPrompt}\nAnalyze the following text:\n\n"${text}"`,
          },
        ],
      });

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          yield chunk.delta.text;
        }
      }
    } catch (error) {
      console.error('Error in streaming analysis:', error);
      throw error;
    }
  }

  /**
   * Analyze comparative sentiment (compare two texts)
   */
  async analyzeComparative(text1: string, text2: string): Promise<{
    text1: SentimentAnalysisResult;
    text2: SentimentAnalysisResult;
    comparison: {
      scoreDifference: number;
      trend: 'improving' | 'stable' | 'deteriorating';
      summary: string;
    };
  }> {
    const [result1, result2] = await Promise.all([
      this.analyze(text1),
      this.analyze(text2),
    ]);

    const scoreDifference = result2.score - result1.score;
    let trend: 'improving' | 'stable' | 'deteriorating';

    if (Math.abs(scoreDifference) < 10) {
      trend = 'stable';
    } else if (scoreDifference > 0) {
      trend = 'improving';
    } else {
      trend = 'deteriorating';
    }

    return {
      text1: result1,
      text2: result2,
      comparison: {
        scoreDifference,
        trend,
        summary: `Sentiment ${trend} by ${Math.abs(scoreDifference).toFixed(1)} points`,
      },
    };
  }

  /**
   * Extract key insights from text
   */
  async extractInsights(text: string): Promise<{
    mainTopics: string[];
    keyPoints: string[];
    sentiment: SentimentAnalysisResult;
    actionable: boolean;
    urgency: 'low' | 'medium' | 'high';
  }> {
    try {
      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [
          {
            role: 'user',
            content: `Analyze this crypto-related text and extract:
1. Main topics/themes (max 5)
2. Key points (max 3)
3. Sentiment analysis
4. Is it actionable for trading? (true/false)
5. Urgency level (low/medium/high)

Text: "${text}"

Respond with JSON:
{
  "mainTopics": string[],
  "keyPoints": string[],
  "sentiment": { score, magnitude, label, confidence },
  "actionable": boolean,
  "urgency": "low" | "medium" | "high"
}`,
          },
        ],
      });

      const content = message.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to extract JSON');
      }

      const insights = JSON.parse(jsonMatch[0]);

      // Ensure sentiment is properly formatted
      insights.sentiment = {
        score: this.clamp(insights.sentiment.score, -100, 100),
        magnitude: this.clamp(insights.sentiment.magnitude, 0, 1),
        label: this.validateLabel(insights.sentiment.label),
        confidence: this.clamp(insights.sentiment.confidence, 0, 1),
        provider: 'ai' as const,
        processedAt: new Date(),
        processingTime: 0,
      };

      return insights;
    } catch (error) {
      console.error('Error extracting insights:', error);

      // Return basic sentiment analysis as fallback
      const sentiment = await this.analyze(text);
      return {
        mainTopics: [],
        keyPoints: [],
        sentiment,
        actionable: false,
        urgency: 'low',
      };
    }
  }

  /**
   * Utility: Clamp number to range
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  /**
   * Utility: Validate label
   */
  private validateLabel(label: string): SentimentAnalysisResult['label'] {
    const validLabels = ['very_negative', 'negative', 'neutral', 'positive', 'very_positive'];
    return validLabels.includes(label) ? (label as SentimentAnalysisResult['label']) : 'neutral';
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
      provider: 'ai',
      processedAt: new Date(),
      processingTime: 0,
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const testResult = await this.analyze('Bitcoin price is stable today.');
      return testResult.confidence > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get usage stats (if available)
   */
  getUsageStats(): {
    model: string;
    maxTokens: number;
  } {
    return {
      model: this.model,
      maxTokens: this.maxTokens,
    };
  }
}

/**
 * Create Sentiment AI service instance
 */
export function createSentimentAIService(apiKey: string, model?: string): SentimentAIService {
  return new SentimentAIService(apiKey, model);
}

/**
 * Singleton instance (requires API key from env)
 */
export const sentimentAIService = process.env.ANTHROPIC_API_KEY
  ? new SentimentAIService(
      process.env.ANTHROPIC_API_KEY,
      process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307'
    )
  : undefined;
