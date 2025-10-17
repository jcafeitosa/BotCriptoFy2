/**
 * Sentiment Monitoring Workflow
 * Autonomous workflow for continuous sentiment monitoring
 *
 * @module sentiment/workflows/sentiment-monitoring
 */

import logger from '@/utils/logger';
import { AgentService } from '@/modules/agents/services/agent.service';
import { SentimentAgentIntegrationService } from '../services/integration/sentiment-agent.integration';

/**
 * Sentiment Monitoring Workflow Configuration
 */
export interface SentimentMonitoringConfig {
  /**
   * Symbols to monitor
   * Default: ['BTC', 'ETH', 'BNB', 'SOL', 'ADA']
   */
  symbols: string[];

  /**
   * Execution interval (cron expression)
   * Default: '*/15 * * * *' (every 15 minutes)
   */
  schedule: string;

  /**
   * Sentiment thresholds for alerts
   */
  thresholds: {
    extremeScore: number; // Default: 80 (alert if |score| > 80)
    rapidChange: number; // Default: 30 (alert if |change| > 30)
    lowConfidence: number; // Default: 0.3 (alert if confidence < 0.3)
  };

  /**
   * Enable notifications to other agents
   */
  notifications: {
    ceo: boolean; // Notify CEO Agent
    tradingOps: boolean; // Notify Trading Ops Agent
    sales: boolean; // Notify Sales Agent (for social trading)
  };
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: SentimentMonitoringConfig = {
  symbols: ['BTC', 'ETH', 'BNB', 'SOL', 'ADA'],
  schedule: '*/15 * * * *', // Every 15 minutes
  thresholds: {
    extremeScore: 80,
    rapidChange: 30,
    lowConfidence: 0.3,
  },
  notifications: {
    ceo: true,
    tradingOps: true,
    sales: false,
  },
};

/**
 * Alert Type
 */
interface SentimentAlert {
  symbol: string;
  type: 'extreme_bullish' | 'extreme_bearish' | 'rapid_change' | 'low_confidence' | 'divergence';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  data: any;
  timestamp: Date;
}

/**
 * Workflow Result
 */
interface WorkflowResult {
  success: boolean;
  executionTime: number;
  symbolsChecked: number;
  alertsGenerated: number;
  alerts: SentimentAlert[];
  summary: string;
  timestamp: Date;
}

/**
 * Sentiment Monitoring Workflow
 */
export class SentimentMonitoringWorkflow {
  private config: SentimentMonitoringConfig;

  constructor(config?: Partial<SentimentMonitoringConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute workflow
   */
  async execute(agentId: string, tenantId: string): Promise<WorkflowResult> {
    const startTime = Date.now();

    try {
      logger.info('Starting Sentiment Monitoring Workflow', {
        agentId,
        tenantId,
        symbols: this.config.symbols,
      });

      const alerts: SentimentAlert[] = [];

      // Check sentiment for each symbol
      for (const symbol of this.config.symbols) {
        try {
          const symbolAlerts = await this.checkSymbol(agentId, tenantId, symbol);
          alerts.push(...symbolAlerts);
        } catch (error) {
          logger.error('Error checking symbol', {
            symbol,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Send notifications if there are high/critical alerts
      const criticalAlerts = alerts.filter((a) => a.severity === 'critical' || a.severity === 'high');

      if (criticalAlerts.length > 0) {
        await this.sendNotifications(agentId, tenantId, criticalAlerts);
      }

      const executionTime = Date.now() - startTime;

      const result: WorkflowResult = {
        success: true,
        executionTime,
        symbolsChecked: this.config.symbols.length,
        alertsGenerated: alerts.length,
        alerts,
        summary: this.generateSummary(alerts),
        timestamp: new Date(),
      };

      logger.info('Sentiment Monitoring Workflow completed', {
        agentId,
        executionTime,
        alertsGenerated: alerts.length,
        criticalAlerts: criticalAlerts.length,
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      logger.error('Sentiment Monitoring Workflow failed', {
        agentId,
        tenantId,
        executionTime,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        executionTime,
        symbolsChecked: 0,
        alertsGenerated: 0,
        alerts: [],
        summary: `Workflow failed: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check sentiment for a single symbol
   */
  private async checkSymbol(
    agentId: string,
    tenantId: string,
    symbol: string
  ): Promise<SentimentAlert[]> {
    const alerts: SentimentAlert[] = [];

    try {
      // Get aggregated sentiment
      const sentimentResult = await SentimentAgentIntegrationService.executeAction(
        agentId,
        tenantId,
        {
          actionType: 'sentiment',
          actionName: 'sentiment:get_aggregated',
          input: { symbol },
        }
      );

      if (!sentimentResult.success) {
        logger.warn('Failed to get sentiment for symbol', {
          symbol,
          error: sentimentResult.error,
        });
        return alerts;
      }

      const sentiment = sentimentResult.result;

      // Check for extreme sentiment
      if (sentiment.score > this.config.thresholds.extremeScore) {
        alerts.push({
          symbol,
          type: 'extreme_bullish',
          severity: 'high',
          message: `Extreme bullish sentiment detected for ${symbol}`,
          data: {
            score: sentiment.score,
            magnitude: sentiment.magnitude,
            confidence: sentiment.confidence,
          },
          timestamp: new Date(),
        });
      } else if (sentiment.score < -this.config.thresholds.extremeScore) {
        alerts.push({
          symbol,
          type: 'extreme_bearish',
          severity: 'high',
          message: `Extreme bearish sentiment detected for ${symbol}`,
          data: {
            score: sentiment.score,
            magnitude: sentiment.magnitude,
            confidence: sentiment.confidence,
          },
          timestamp: new Date(),
        });
      }

      // Check for rapid change
      if (Math.abs(sentiment.change) > this.config.thresholds.rapidChange) {
        alerts.push({
          symbol,
          type: 'rapid_change',
          severity: 'medium',
          message: `Rapid sentiment change detected for ${symbol}`,
          data: {
            change: sentiment.change,
            direction: sentiment.change > 0 ? 'positive' : 'negative',
            score: sentiment.score,
          },
          timestamp: new Date(),
        });
      }

      // Check for low confidence
      if (sentiment.confidence < this.config.thresholds.lowConfidence) {
        alerts.push({
          symbol,
          type: 'low_confidence',
          severity: 'low',
          message: `Low confidence in sentiment analysis for ${symbol}`,
          data: {
            confidence: sentiment.confidence,
            dataPoints: sentiment.dataPoints,
          },
          timestamp: new Date(),
        });
      }

      // Get trading signals
      const signalsResult = await SentimentAgentIntegrationService.executeAction(
        agentId,
        tenantId,
        {
          actionType: 'sentiment',
          actionName: 'sentiment:generate_signals',
          input: { symbol },
        }
      );

      if (signalsResult.success) {
        const signal = signalsResult.result;

        // Check for strong signals
        if (signal.signal === 'strong_buy' || signal.signal === 'strong_sell') {
          alerts.push({
            symbol,
            type: signal.signal === 'strong_buy' ? 'extreme_bullish' : 'extreme_bearish',
            severity: 'critical',
            message: `Strong ${signal.signal} signal for ${symbol}`,
            data: {
              signal: signal.signal,
              confidence: signal.confidence,
              reasoning: signal.reasoning,
              sentimentScore: signal.sentimentScore,
            },
            timestamp: new Date(),
          });
        }
      }

      logger.debug('Symbol checked successfully', {
        symbol,
        alertsGenerated: alerts.length,
      });
    } catch (error) {
      logger.error('Error checking symbol sentiment', {
        symbol,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return alerts;
  }

  /**
   * Send notifications to other agents
   */
  private async sendNotifications(
    agentId: string,
    tenantId: string,
    alerts: SentimentAlert[]
  ): Promise<void> {
    try {
      const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
      const highCount = alerts.filter((a) => a.severity === 'high').length;

      const message = `SENTIMENT ALERT: ${alerts.length} alerts detected (${criticalCount} critical, ${highCount} high priority)

Symbols affected: ${Array.from(new Set(alerts.map((a) => a.symbol))).join(', ')}

Top alerts:
${alerts.slice(0, 3).map((a) => `- ${a.symbol}: ${a.message}`).join('\n')}`;

      // Notify CEO if configured
      if (this.config.notifications.ceo) {
        try {
          const ceoAgents = await AgentService.listAgents(tenantId, {
            agentType: 'ceo',
          });

          if (ceoAgents.length > 0) {
            await AgentService.sendCommunication(tenantId, {
              fromAgentId: agentId,
              toAgentId: ceoAgents[0].id,
              message,
              priority: criticalCount > 0 ? 'urgent' : 'high',
              metadata: {
                alertCount: alerts.length,
                criticalCount,
                highCount,
                alerts: alerts.slice(0, 5),
              },
            });

            logger.info('Notification sent to CEO', {
              agentId,
              alertCount: alerts.length,
            });
          }
        } catch (error) {
          logger.error('Failed to notify CEO', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Notify Trading Ops if configured
      if (this.config.notifications.tradingOps) {
        try {
          const tradingOpsAgents = await AgentService.listAgents(tenantId, {
            agentType: 'trading_ops',
          });

          if (tradingOpsAgents.length > 0) {
            await AgentService.sendCommunication(tenantId, {
              fromAgentId: agentId,
              toAgentId: tradingOpsAgents[0].id,
              message: message + '\n\nConsider adjusting trading strategies based on sentiment.',
              priority: criticalCount > 0 ? 'urgent' : 'high',
              metadata: {
                alertCount: alerts.length,
                alerts: alerts.filter((a) => a.severity === 'critical' || a.severity === 'high'),
              },
            });

            logger.info('Notification sent to Trading Ops', {
              agentId,
              alertCount: alerts.length,
            });
          }
        } catch (error) {
          logger.error('Failed to notify Trading Ops', {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } catch (error) {
      logger.error('Failed to send notifications', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Generate workflow summary
   */
  private generateSummary(alerts: SentimentAlert[]): string {
    if (alerts.length === 0) {
      return 'No significant sentiment alerts detected. Market sentiment is stable.';
    }

    const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
    const highCount = alerts.filter((a) => a.severity === 'high').length;
    const mediumCount = alerts.filter((a) => a.severity === 'medium').length;

    const affectedSymbols = Array.from(new Set(alerts.map((a) => a.symbol)));

    let summary = `Detected ${alerts.length} sentiment alerts:\n`;
    summary += `- ${criticalCount} critical, ${highCount} high, ${mediumCount} medium priority\n`;
    summary += `- Symbols affected: ${affectedSymbols.join(', ')}\n\n`;

    // Group alerts by type
    const alertsByType = alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    summary += 'Alert breakdown:\n';
    Object.entries(alertsByType).forEach(([type, count]) => {
      summary += `- ${type}: ${count}\n`;
    });

    return summary;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SentimentMonitoringConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): SentimentMonitoringConfig {
    return { ...this.config };
  }
}

/**
 * Create and export workflow instance
 */
export const sentimentMonitoringWorkflow = new SentimentMonitoringWorkflow();
