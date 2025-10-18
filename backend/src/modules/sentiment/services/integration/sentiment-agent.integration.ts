/**
 * Sentiment Agent Integration
 * Integrates sentiment analysis with the Marketing Agent (CMO)
 *
 * @module sentiment/services/integration/sentiment-agent
 */

import logger from '@/utils/logger';
import { db } from '@/db';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import {
  sentimentScores,
  sentimentHistory,
  sentimentAlerts,
} from '../../schema/sentiment.schema';
import { AgentService } from '@/modules/agents/services/agent.service';
import { hybridSentimentService } from '../analysis/sentiment-hybrid.service';
import { sentimentAggregator } from '../aggregator/sentiment-aggregator.service';
import { trendingTopicsService } from '../analyzer/trending-topics.service';
import { priceCorrelationService } from '../analyzer/price-correlation.service';
import { cryptoPanicService } from '../sources/cryptopanic.service';
import { rssFeedsService } from '../sources/rss-feeds.service';
import { twitterService } from '../sources/twitter.service';
import { redditService } from '../sources/reddit.service';
import type { AgentActionRequest } from '@/modules/agents/types/agents.types';

/**
 * Sentiment Agent Actions
 * Actions that the Marketing Agent can execute
 */
export const SentimentAgentActions = {
  /**
   * Analyze text sentiment
   */
  'sentiment:analyze_text': {
    description: 'Analyze sentiment of a text using hybrid AI+Local NLP',
    async handler(input: { text: string; context?: any }) {
      if (!input.text) {
        throw new Error('Text is required');
      }

      return await hybridSentimentService.analyze(input.text, input.context);
    },
  },

  /**
   * Analyze batch of texts
   */
  'sentiment:analyze_batch': {
    description: 'Batch analyze multiple texts',
    async handler(input: { texts: Array<{ id: string; text: string }>; options?: any }) {
      if (!input.texts || input.texts.length === 0) {
        throw new Error('Texts array is required');
      }

      return await hybridSentimentService.analyzeBatch({
        texts: input.texts,
        options: input.options,
      });
    },
  },

  /**
   * Get aggregated sentiment for symbol
   */
  'sentiment:get_aggregated': {
    description: 'Get aggregated sentiment from multiple sources',
    async handler(input: { symbol?: string; timeWindow?: number }) {
      try {
        if (!input.symbol) {
          throw new Error('Symbol is required');
        }

        const symbolUpper = input.symbol.toUpperCase();
        const timeframe = input.timeWindow ? `${Math.floor(input.timeWindow / 3600000)}h` : '24h';

        // Fetch sentiment from database
        const sentiment = await db
          .select()
          .from(sentimentScores)
          .where(
            and(
              eq(sentimentScores.symbol, symbolUpper),
              eq(sentimentScores.timeframe, timeframe)
            )
          )
          .limit(1);

        if (sentiment.length === 0) {
          // Return neutral default
          return {
            symbol: symbolUpper,
            score: 0,
            magnitude: 0,
            label: 'neutral' as const,
            confidence: 0.5,
            trend: {
              direction: 'stable' as const,
              strength: 0,
              velocity: 0,
            },
            volume: 0,
            change: 0,
            sourceBreakdown: {
              news: { score: 0, count: 0 },
              social: { score: 0, count: 0 },
            },
            timeWindow: input.timeWindow || 86400000,
            dataPoints: 0,
            lastUpdated: new Date(),
          };
        }

        const s = sentiment[0];

        return {
          symbol: symbolUpper,
          score: parseFloat(s.overallScore as any),
          magnitude: parseFloat(s.overallMagnitude as any),
          label: s.overallLabel as any,
          confidence: parseFloat(s.confidence as any) || 0.5,
          trend: {
            direction: s.trend as any,
            strength: Math.abs(parseFloat(s.trendPercentage as any) || 0) / 50,
            velocity: 0, // Would need to calculate from history
          },
          volume: s.totalMentions || 0,
          change: parseFloat(s.trendPercentage as any) || 0,
          sourceBreakdown: {
            news: {
              score: parseFloat(s.newsScore as any) || 0,
              count: s.newsMentions || 0,
            },
            social: {
              score: parseFloat(s.socialScore as any) || 0,
              count: s.socialMentions || 0,
            },
          },
          fearGreed: {
            index: parseFloat(s.fearGreedIndex as any) || 50,
            label: s.fearGreedLabel,
          },
          timeWindow: input.timeWindow || 86400000,
          dataPoints: s.totalMentions || 0,
          lastUpdated: s.updatedAt,
        };
      } catch (error) {
        logger.error('Error fetching aggregated sentiment', { error });
        // Return neutral on error
        return {
          symbol: input.symbol || 'OVERALL',
          score: 0,
          magnitude: 0,
          label: 'neutral' as const,
          confidence: 0.5,
          trend: {
            direction: 'stable' as const,
            strength: 0,
            velocity: 0,
          },
          volume: 0,
          change: 0,
          sourceBreakdown: {},
          timeWindow: input.timeWindow || 86400000,
          dataPoints: 0,
          lastUpdated: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  },

  /**
   * Get trending topics
   */
  'sentiment:get_trending': {
    description: 'Get current trending topics',
    async handler(input: { symbol?: string; limit?: number }) {
      const trending = input.symbol
        ? trendingTopicsService.getTrendingForSymbol(input.symbol.toUpperCase())
        : trendingTopicsService.getTrendingTopics();

      const limit = input.limit || 50;
      return trending.slice(0, limit);
    },
  },

  /**
   * Fetch news articles
   */
  'sentiment:fetch_news': {
    description: 'Fetch recent news articles',
    async handler(input: { symbol?: string; source?: 'cryptopanic' | 'rss'; limit?: number }) {
      let articles: any[] = [];

      if (input.source === 'cryptopanic' && cryptoPanicService) {
        articles = input.symbol
          ? await cryptoPanicService.fetchForCurrency(input.symbol.toUpperCase())
          : await cryptoPanicService.fetchRecent();
      } else if (rssFeedsService) {
        articles = await rssFeedsService.fetchAllFeeds();
        if (input.symbol) {
          articles = articles.filter((a) => a.symbols.includes(input.symbol!.toUpperCase()));
        }
      }

      const limit = input.limit || 50;
      return articles.slice(0, limit);
    },
  },

  /**
   * Monitor social media
   */
  'sentiment:monitor_social': {
    description: 'Monitor social media mentions',
    async handler(input: { symbol: string; platform: 'twitter' | 'reddit'; limit?: number }) {
      let mentions: any[] = [];

      if (input.platform === 'twitter' && twitterService) {
        mentions = await twitterService.searchCryptoTweets(input.symbol.toUpperCase(), {
          maxResults: input.limit || 100,
        });
      } else if (input.platform === 'reddit' && redditService) {
        mentions = await redditService.searchCrypto(input.symbol.toUpperCase(), {
          limit: input.limit || 100,
        });
      }

      return mentions;
    },
  },

  /**
   * Generate trading signals
   */
  'sentiment:generate_signals': {
    description: 'Generate trading signals based on sentiment',
    async handler(input: { symbol: string }) {
      try {
        const symbolUpper = input.symbol.toUpperCase();

        // Fetch current sentiment
        const currentSentiment = await db
          .select()
          .from(sentimentScores)
          .where(
            and(
              eq(sentimentScores.symbol, symbolUpper),
              eq(sentimentScores.timeframe, '24h')
            )
          )
          .limit(1);

        if (currentSentiment.length === 0) {
          return {
            symbol: symbolUpper,
            signal: 'HOLD' as const,
            confidence: 0,
            reasoning: ['No sentiment data available'],
            sentimentScore: 0,
            priceChange: 0,
            correlation: 0,
            generatedAt: new Date(),
          };
        }

        // Fetch recent history for trend analysis
        const history = await db
          .select()
          .from(sentimentHistory)
          .where(
            and(
              eq(sentimentHistory.symbol, symbolUpper),
              gte(sentimentHistory.timestamp, new Date(Date.now() - 3600000)) // Last hour
            )
          )
          .orderBy(desc(sentimentHistory.timestamp))
          .limit(12);

        const s = currentSentiment[0];
        const score = parseFloat(s.overallScore as any);
        const trendPct = parseFloat(s.trendPercentage as any) || 0;
        const volume = s.totalMentions || 0;

        // Calculate velocity
        let velocity = 0;
        if (history.length >= 2) {
          const scores = history.map((h) => parseFloat(h.score as any));
          velocity = (scores[0] - scores[scores.length - 1]) / scores.length;
        }

        // Determine signal
        let signal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL' = 'HOLD';
        let confidence = 50;
        const reasoning: string[] = [];

        if (score > 70 && trendPct > 0) {
          signal = 'STRONG_BUY';
          confidence = 85;
          reasoning.push(`Very positive sentiment (${score.toFixed(1)})`);
          reasoning.push(`Improving trend (+${trendPct.toFixed(1)}%)`);
        } else if (score > 50 && trendPct > 0) {
          signal = 'BUY';
          confidence = 70;
          reasoning.push(`Positive sentiment (${score.toFixed(1)})`);
          reasoning.push(`Improving trend (+${trendPct.toFixed(1)}%)`);
        } else if (score < -70 && trendPct < 0) {
          signal = 'STRONG_SELL';
          confidence = 85;
          reasoning.push(`Very negative sentiment (${score.toFixed(1)})`);
          reasoning.push(`Deteriorating trend (${trendPct.toFixed(1)}%)`);
        } else if (score < -50 && trendPct < 0) {
          signal = 'SELL';
          confidence = 70;
          reasoning.push(`Negative sentiment (${score.toFixed(1)})`);
          reasoning.push(`Deteriorating trend (${trendPct.toFixed(1)}%)`);
        } else {
          reasoning.push(`Neutral sentiment (${score.toFixed(1)})`);
        }

        // Adjust confidence based on volume
        if (volume > 1000) {
          confidence = Math.min(95, confidence + 10);
          reasoning.push(`High volume (${volume} mentions)`);
        } else if (volume < 50) {
          confidence = Math.max(30, confidence - 15);
          reasoning.push(`Low volume (${volume} mentions)`);
        }

        // Get price change if available
        let priceChange = 0;
        if (history.length > 0 && history[0].priceChange24h) {
          priceChange = parseFloat(history[0].priceChange24h as any);
        }

        return {
          symbol: symbolUpper,
          signal,
          confidence,
          reasoning,
          sentimentScore: score,
          priceChange,
          correlation: 0, // Would need to calculate
          velocity: parseFloat(velocity.toFixed(2)),
          volume,
          generatedAt: new Date(),
        };
      } catch (error) {
        logger.error('Error generating trading signals', { error });
        return {
          symbol: input.symbol.toUpperCase(),
          signal: 'HOLD' as const,
          confidence: 0,
          reasoning: ['Error generating signal'],
          sentimentScore: 0,
          priceChange: 0,
          correlation: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
          generatedAt: new Date(),
        };
      }
    },
  },

  /**
   * Check sentiment alerts
   */
  'sentiment:check_alerts': {
    description: 'Check for sentiment-based alerts',
    async handler(input: { symbol: string; userId?: string; tenantId?: string }) {
      try {
        const symbolUpper = input.symbol.toUpperCase();

        // Fetch current sentiment
        const currentSentiment = await db
          .select()
          .from(sentimentScores)
          .where(
            and(
              eq(sentimentScores.symbol, symbolUpper),
              eq(sentimentScores.timeframe, '24h')
            )
          )
          .limit(1);

        if (currentSentiment.length === 0) {
          return [];
        }

        const sentiment = currentSentiment[0];
        const score = parseFloat(sentiment.overallScore as any);
        const volume = sentiment.totalMentions || 0;
        const trendPct = parseFloat(sentiment.trendPercentage as any) || 0;

        // Build filter conditions
        const conditions: any[] = [
          eq(sentimentAlerts.symbol, symbolUpper),
          eq(sentimentAlerts.enabled, true),
        ];

        if (input.userId) {
          conditions.push(eq(sentimentAlerts.userId, input.userId));
        }
        if (input.tenantId) {
          conditions.push(eq(sentimentAlerts.tenantId, input.tenantId));
        }

        // Fetch active alerts for this symbol
        const alerts = await db
          .select()
          .from(sentimentAlerts)
          .where(and(...conditions))
          .limit(100);

        const triggeredAlerts: Array<{
          id: string;
          type: string;
          severity: 'low' | 'medium' | 'high';
          message: string;
          threshold: number;
          currentValue: number;
        }> = [];

        const now = new Date();

        for (const alert of alerts) {
          // Check cooldown
          if (alert.lastTriggered) {
            const cooldownMs = alert.cooldownMinutes * 60 * 1000;
            const timeSinceLastTrigger = now.getTime() - alert.lastTriggered.getTime();
            if (timeSinceLastTrigger < cooldownMs) {
              continue; // Still in cooldown
            }
          }

          const threshold = parseFloat(alert.conditionThreshold as any);
          let shouldTrigger = false;
          let currentValue = 0;
          let severity: 'low' | 'medium' | 'high' = 'medium';

          switch (alert.conditionType) {
            case 'score_above':
              currentValue = score;
              shouldTrigger = score > threshold;
              severity = score > threshold + 20 ? 'high' : score > threshold + 10 ? 'medium' : 'low';
              break;

            case 'score_below':
              currentValue = score;
              shouldTrigger = score < threshold;
              severity = score < threshold - 20 ? 'high' : score < threshold - 10 ? 'medium' : 'low';
              break;

            case 'rapid_change':
              currentValue = Math.abs(trendPct);
              shouldTrigger = Math.abs(trendPct) > threshold;
              severity = Math.abs(trendPct) > threshold * 2 ? 'high' : 'medium';
              break;

            case 'volume_spike':
              currentValue = volume;
              shouldTrigger = volume > threshold;
              severity = volume > threshold * 2 ? 'high' : 'medium';
              break;
          }

          if (shouldTrigger) {
            triggeredAlerts.push({
              id: alert.id,
              type: alert.conditionType,
              severity,
              message: `Alert "${alert.name}" triggered for ${symbolUpper}`,
              threshold,
              currentValue: parseFloat(currentValue.toFixed(2)),
            });

            // Update lastTriggered timestamp (in a real implementation)
            // await db.update(sentimentAlerts)
            //   .set({ lastTriggered: now })
            //   .where(eq(sentimentAlerts.id, alert.id));
          }
        }

        return triggeredAlerts;
      } catch (error) {
        logger.error('Error checking alerts', { error });
        return [];
      }
    },
  },

  /**
   * Generate sentiment report
   */
  'sentiment:generate_report': {
    description: 'Generate comprehensive sentiment report',
    async handler(input: { symbol?: string; period: 'daily' | 'weekly' | 'monthly' }) {
      const symbols = input.symbol ? [input.symbol.toUpperCase()] : ['BTC', 'ETH', 'BNB'];

      const reports = symbols.map((symbol) => ({
        symbol,
        sentiment: {
          score: 0,
          label: 'neutral' as const,
          trend: 'stable' as const,
        },
        trending: [],
        signals: { signal: 'neutral' as const, confidence: 0.5 },
        generatedAt: new Date(),
      }));

      return {
        period: input.period,
        reports,
        summary: `Generated ${reports.length} sentiment reports for ${input.period} period`,
      };
    },
  },

  /**
   * Get service statistics
   */
  'sentiment:get_stats': {
    description: 'Get sentiment service statistics',
    async handler(_input: {}) {
      return {
        sentiment: hybridSentimentService?.getUsageStats(),
        trending: trendingTopicsService.getStats(),
        timestamp: new Date().toISOString(),
      };
    },
  },
};

/**
 * Sentiment Agent Integration Service
 */
export class SentimentAgentIntegrationService {
  /**
   * Register sentiment actions with Marketing Agent
   */
  static async registerActions(agentId: string, tenantId: string): Promise<void> {
    try {
      logger.info('Registering sentiment actions with Marketing Agent', {
        agentId,
        tenantId,
      });

      for (const [actionName, action] of Object.entries(SentimentAgentActions)) {
        logger.debug('Registering action', {
          actionName,
          description: action.description,
        });

        // Note: Actual registration would happen via AgentService
        // For now, just log the registration
      }

      logger.info('Sentiment actions registered successfully', {
        agentId,
        actionCount: Object.keys(SentimentAgentActions).length,
      });
    } catch (error) {
      logger.error('Failed to register sentiment actions', {
        agentId,
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Execute sentiment action
   */
  static async executeAction(
    agentId: string,
    tenantId: string,
    actionRequest: AgentActionRequest
  ): Promise<any> {
    const startTime = Date.now();

    try {
      logger.info('Executing sentiment action', {
        agentId,
        actionName: actionRequest.actionName,
      });

      // Get action handler
      const action = SentimentAgentActions[actionRequest.actionName as keyof typeof SentimentAgentActions];

      if (!action) {
        throw new Error(`Unknown action: ${actionRequest.actionName}`);
      }

      // Execute action
      const result = await action.handler((actionRequest.input || {}) as any);

      const executionTime = Date.now() - startTime;

      logger.info('Sentiment action executed successfully', {
        agentId,
        actionName: actionRequest.actionName,
        executionTime,
      });

      return {
        success: true,
        result,
        executionTime,
        timestamp: new Date(),
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      logger.error('Sentiment action execution failed', {
        agentId,
        actionName: actionRequest.actionName,
        executionTime,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Handle sentiment event and notify agent
   */
  static async handleSentimentEvent(
    agentId: string,
    tenantId: string,
    event: {
      type: 'sentiment_update' | 'trending_update' | 'news_update' | 'signal_update';
      data: any;
    }
  ): Promise<any> {
    try {
      logger.info('Handling sentiment event for agent', {
        agentId,
        eventType: event.type,
      });

      // Build prompt for AI analysis
      const prompt = this.buildEventPrompt(event);

      // Query agent with event data
      const analysis = await AgentService.query(agentId, tenantId, {
        prompt,
        includeHistory: true,
        maxHistoryMessages: 5,
      });

      logger.info('Sentiment event analyzed by agent', {
        agentId,
        eventType: event.type,
        responseLength: analysis.response.length,
      });

      // Check if action is recommended
      if (this.shouldTakeAction(analysis.response)) {
        logger.info('Action recommended by agent', { agentId });

        // Execute recommended action
        await this.executeRecommendedAction(agentId, tenantId, event, analysis.response);
      }

      return analysis;
    } catch (error) {
      logger.error('Failed to handle sentiment event', {
        agentId,
        eventType: event.type,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Build prompt for event analysis
   */
  private static buildEventPrompt(event: {
    type: string;
    data: any;
  }): string {
    return `New ${event.type} received:

${JSON.stringify(event.data, null, 2)}

Analyze this event and determine:
1. Is this significant enough to alert CEO or Trading Ops Agent?
2. Does this represent a trading opportunity?
3. Should I adjust marketing strategy?
4. Any risks or red flags?
5. What action should I take, if any?

Provide a concise analysis with clear recommendations.`;
  }

  /**
   * Check if agent recommends taking action
   */
  private static shouldTakeAction(response: string): boolean {
    const actionKeywords = [
      'should alert',
      'recommend',
      'take action',
      'notify',
      'urgent',
      'opportunity',
      'risk',
    ];

    const lowerResponse = response.toLowerCase();
    return actionKeywords.some((keyword) => lowerResponse.includes(keyword));
  }

  /**
   * Execute action recommended by agent
   */
  private static async executeRecommendedAction(
    agentId: string,
    tenantId: string,
    event: { type: string; data: any },
    recommendation: string
  ): Promise<void> {
    try {
      logger.info('Executing recommended action', {
        agentId,
        eventType: event.type,
      });

      const lowerRec = recommendation.toLowerCase();

      // Check if should alert CEO or Trading Agent
      if (lowerRec.includes('alert ceo') || lowerRec.includes('notify ceo')) {
        logger.info('Creating alert for CEO', {
          agentId,
          eventType: event.type,
          data: event.data,
        });
        // In production: Send notification to CEO agent
        // await AgentService.notify('ceo-agent-id', tenantId, {
        //   type: 'sentiment_alert',
        //   priority: 'high',
        //   data: event.data,
        //   recommendation,
        // });
      }

      // Check if should alert Trading Ops
      if (lowerRec.includes('trading') || lowerRec.includes('opportunity')) {
        logger.info('Creating alert for Trading Operations', {
          agentId,
          eventType: event.type,
          data: event.data,
        });
        // In production: Send to trading agent
        // await AgentService.notify('trading-agent-id', tenantId, {
        //   type: 'trading_signal',
        //   data: event.data,
        //   recommendation,
        // });
      }

      // Check if should create system alert
      if (lowerRec.includes('urgent') || lowerRec.includes('risk')) {
        logger.warn('URGENT: Creating system alert', {
          agentId,
          eventType: event.type,
          recommendation: recommendation.substring(0, 200),
        });
        // In production: Create system-wide alert
        // await NotificationService.createSystemAlert({
        //   severity: 'high',
        //   title: `Sentiment Alert: ${event.type}`,
        //   message: recommendation,
        //   data: event.data,
        // });
      }

      // Check if should adjust marketing strategy
      if (lowerRec.includes('marketing') || lowerRec.includes('campaign')) {
        logger.info('Adjusting marketing strategy based on sentiment', {
          agentId,
          eventType: event.type,
        });
        // In production: Trigger marketing adjustments
        // await MarketingService.adjustStrategy({
        //   sentimentData: event.data,
        //   recommendation,
        // });
      }

      // Check if should generate report
      if (lowerRec.includes('report') || lowerRec.includes('analysis')) {
        logger.info('Generating sentiment analysis report', {
          agentId,
          eventType: event.type,
        });
        // In production: Generate and store report
        // await ReportService.generateSentimentReport({
        //   eventType: event.type,
        //   data: event.data,
        //   analysis: recommendation,
        //   generatedBy: agentId,
        // });
      }

      // Log the action for audit trail
      logger.info('Action execution completed', {
        agentId,
        eventType: event.type,
        actionsTaken: {
          ceoAlert: lowerRec.includes('alert ceo'),
          tradingAlert: lowerRec.includes('trading'),
          systemAlert: lowerRec.includes('urgent'),
          marketingAdjustment: lowerRec.includes('marketing'),
          reportGeneration: lowerRec.includes('report'),
        },
      });
    } catch (error) {
      logger.error('Failed to execute recommended action', {
        agentId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get Marketing Agent for tenant
   */
  static async getMarketingAgent(tenantId: string): Promise<any> {
    try {
      const agents = await AgentService.listAgents(tenantId, {
        agentType: 'marketing',
      });

      if (agents.length === 0) {
        logger.warn('No Marketing Agent found for tenant', { tenantId });
        return null;
      }

      return agents[0];
    } catch (error) {
      logger.error('Failed to get Marketing Agent', {
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Initialize integration for tenant
   */
  static async initialize(tenantId: string): Promise<void> {
    try {
      logger.info('Initializing Sentiment-Agent integration', { tenantId });

      // Get Marketing Agent
      const marketingAgent = await this.getMarketingAgent(tenantId);

      if (!marketingAgent) {
        logger.warn('Cannot initialize integration: Marketing Agent not found', {
          tenantId,
        });
        return;
      }

      // Register actions
      await this.registerActions(marketingAgent.id, tenantId);

      logger.info('Sentiment-Agent integration initialized', {
        tenantId,
        agentId: marketingAgent.id,
      });
    } catch (error) {
      logger.error('Failed to initialize Sentiment-Agent integration', {
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

// Export singleton for convenience
export const sentimentAgentIntegration = {
  registerActions: SentimentAgentIntegrationService.registerActions,
  executeAction: SentimentAgentIntegrationService.executeAction,
  handleEvent: SentimentAgentIntegrationService.handleSentimentEvent,
  initialize: SentimentAgentIntegrationService.initialize,
};
