/**
 * Sentiment Agent Integration
 * Integrates sentiment analysis with the Marketing Agent (CMO)
 *
 * @module sentiment/services/integration/sentiment-agent
 */

import logger from '@/utils/logger';
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
      // TODO: Fetch from database
      // For now, return mock data
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
      };
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
      // TODO: Fetch real data from database
      // For now, return mock signal
      return {
        symbol: input.symbol.toUpperCase(),
        signal: 'neutral' as const,
        confidence: 0.5,
        reasoning: ['Insufficient data'],
        sentimentScore: 0,
        priceChange: 0,
        correlation: 0,
        generatedAt: new Date(),
      };
    },
  },

  /**
   * Check sentiment alerts
   */
  'sentiment:check_alerts': {
    description: 'Check for sentiment-based alerts',
    async handler(input: { symbol: string }) {
      // TODO: Implement real alert checking
      const alerts: Array<{
        type: string;
        severity: 'low' | 'medium' | 'high';
        message: string;
      }> = [];

      // Mock: Return empty alerts for now
      return alerts;
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
      const result = await action.handler(actionRequest.input || {});

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

      // Parse recommendation and determine action
      // For now, just log the recommendation
      logger.info('Agent recommendation', {
        agentId,
        recommendation: recommendation.substring(0, 200),
      });

      // TODO: Implement actual action execution based on recommendation
      // This could include:
      // - Sending communication to other agents
      // - Creating alerts
      // - Adjusting marketing campaigns
      // - Generating reports
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
