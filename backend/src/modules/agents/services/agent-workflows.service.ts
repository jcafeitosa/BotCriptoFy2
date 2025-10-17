/**
 * Agent Workflows Service
 * Autonomous workflows and scheduled tasks for agents with memory
 */

import { MastraAgentService } from './mastra-agent.service';
import { AgentService } from './agent.service';
import { db } from '@/db';
import { eq, and } from 'drizzle-orm';
import logger from '@/utils/logger';
import { agents } from '../schema/agents.schema';
import type { AgentType } from '../types/agents.types';

/**
 * Workflow Context
 */
interface WorkflowContext {
  agentId: string;
  tenantId: string;
  agentType: AgentType;
  trigger: string;
}

/**
 * Agent Workflows Service
 * Manages autonomous workflows and scheduled tasks with learning capabilities
 */
export class AgentWorkflowsService {
  /**
   * Execute Financial Monitoring Workflow
   * Monitors financial metrics and learns from patterns
   */
  static async executeFinancialMonitoring(agentId: string, tenantId: string): Promise<any> {
    try {
      logger.info('Executing financial monitoring workflow', { agentId });

      // Step 1: Analyze Revenue Trends with Memory
      const revenueAnalysis = await MastraAgentService.executeAutonomousTask(
        agentId,
        tenantId,
        'Analyze revenue trends for the last 7 days. Calculate growth rate. Search your memory for similar revenue patterns. If revenue dropped more than 10%, alert the CEO immediately and remember this incident.'
      );

      // Step 2: Check Payment Processing
      const paymentCheck = await MastraAgentService.executeAutonomousTask(
        agentId,
        tenantId,
        'Check payment processing status. Query failed payments in the last 24 hours. Recall past payment issues from memory. If failure rate is above 5%, investigate, report to CEO, and store the resolution pattern.'
      );

      // Step 3: Subscription Health Check
      const subscriptionCheck = await MastraAgentService.executeAutonomousTask(
        agentId,
        tenantId,
        'Analyze subscription metrics: active subscriptions, churn rate, failed renewals. Retrieve similar churn patterns from memory. If churn increased by more than 20%, create action plan, report to CEO, and remember what works.'
      );

      // Step 4: Generate Financial Report with Insights
      const report = await MastraAgentService.executeAutonomousTask(
        agentId,
        tenantId,
        `Based on previous analysis:
        - Revenue: ${JSON.stringify(revenueAnalysis)}
        - Payments: ${JSON.stringify(paymentCheck)}
        - Subscriptions: ${JSON.stringify(subscriptionCheck)}

        Generate executive summary with key findings and recommendations. Store important insights for future reference.`
      );

      logger.info('Financial monitoring workflow completed', { agentId });

      return {
        success: true,
        revenue: revenueAnalysis,
        payments: paymentCheck,
        subscriptions: subscriptionCheck,
        report,
      };
    } catch (error) {
      logger.error('Financial monitoring workflow failed', {
        agentId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Execute Security Monitoring Workflow
   * Monitors security threats and learns threat patterns
   */
  static async executeSecurityMonitoring(agentId: string, tenantId: string): Promise<any> {
    try {
      logger.info('Executing security monitoring workflow', { agentId });

      // Step 1: Check Failed Login Attempts
      const loginCheck = await MastraAgentService.executeAutonomousTask(
        agentId,
        tenantId,
        'Query failed login attempts in the last hour. Search memory for similar attack patterns. If more than 5 attempts from same IP, flag as potential brute force attack, notify security team, and store attack signature.'
      );

      // Step 2: Monitor API Rate Limiting
      const rateLimitCheck = await MastraAgentService.executeAutonomousTask(
        agentId,
        tenantId,
        'Check rate limiting violations. Query blocked requests and identify patterns. Recall past coordinated attacks from memory. If coordinated attack detected, escalate to URGENT, recommend IP blocking, and remember mitigation strategy.'
      );

      // Step 3: Audit Log Analysis
      const auditAnalysis = await MastraAgentService.executeAutonomousTask(
        agentId,
        tenantId,
        'Analyze audit logs for suspicious activities: privilege escalations, unauthorized data access, configuration changes. Retrieve similar incidents from memory. Alert CEO on critical findings and store detection patterns.'
      );

      logger.info('Security monitoring workflow completed', { agentId });

      return {
        success: true,
        loginAttempts: loginCheck,
        rateLimiting: rateLimitCheck,
        auditLogs: auditAnalysis,
      };
    } catch (error) {
      logger.error('Security monitoring workflow failed', {
        agentId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Execute Trading Operations Monitoring Workflow
   * Monitors trading system health and learns from market conditions
   */
  static async executeTradingOpsMonitoring(agentId: string, tenantId: string): Promise<any> {
    try {
      logger.info('Executing trading ops monitoring workflow', { agentId });

      // Step 1: Check Exchange Connectivity
      const exchangeCheck = await MastraAgentService.executeAutonomousTask(
        agentId,
        tenantId,
        'Check connectivity status of all exchange connections. Search memory for past connectivity issues. If any exchange is down or experiencing high latency (>1000ms), alert immediately, recommend switching to backup, and remember downtime patterns.'
      );

      // Step 2: Monitor Order Execution
      const orderCheck = await MastraAgentService.executeAutonomousTask(
        agentId,
        tenantId,
        'Analyze order execution performance. Check failed orders, execution time, slippage. Recall similar market conditions from memory. If success rate drops below 95%, investigate root cause, report with recommendations, and store optimization strategies.'
      );

      // Step 3: Risk Assessment
      const riskCheck = await MastraAgentService.executeAutonomousTask(
        agentId,
        tenantId,
        'Assess current risk exposure: open positions, leverage ratios, stop-loss coverage. Retrieve past high-risk situations from memory. If any position exceeds risk limits, recommend immediate action to risk management and remember successful mitigations.'
      );

      // Step 4: Bot Performance Analysis
      const botAnalysis = await MastraAgentService.executeAutonomousTask(
        agentId,
        tenantId,
        'Analyze trading bot performance: PnL, win rate, trade frequency. Search memory for similar bot performance patterns. If any bot is underperforming (negative PnL > 5%), recommend pause or strategy adjustment and store what works.'
      );

      logger.info('Trading ops monitoring workflow completed', { agentId });

      return {
        success: true,
        exchanges: exchangeCheck,
        orders: orderCheck,
        risk: riskCheck,
        bots: botAnalysis,
      };
    } catch (error) {
      logger.error('Trading ops monitoring workflow failed', {
        agentId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Execute Support Monitoring Workflow
   * Monitors customer support metrics and learns from resolutions
   */
  static async executeSupportMonitoring(agentId: string, tenantId: string): Promise<any> {
    try {
      logger.info('Executing support monitoring workflow', { agentId });

      // Step 1: Check SLA Compliance
      const slaCheck = await MastraAgentService.executeAutonomousTask(
        agentId,
        tenantId,
        'Check SLA compliance for all open tickets. Query tickets approaching SLA deadline. Recall past SLA breaches from memory. If any high-priority ticket is at risk, escalate, notify support manager, and remember successful interventions.'
      );

      // Step 2: Analyze Response Times
      const responseAnalysis = await MastraAgentService.executeAutonomousTask(
        agentId,
        tenantId,
        'Analyze average response times for the last 24 hours. Search memory for similar workload patterns. If response time increased by more than 50%, investigate workload, recommend staffing adjustments, and store optimization strategies.'
      );

      // Step 3: Customer Satisfaction Check
      const satisfactionCheck = await MastraAgentService.executeAutonomousTask(
        agentId,
        tenantId,
        'Analyze customer satisfaction scores (CSAT, NPS). Retrieve past satisfaction improvements from memory. If satisfaction dropped below 80%, identify common issues, create improvement plan, and remember what improves satisfaction.'
      );

      logger.info('Support monitoring workflow completed', { agentId });

      return {
        success: true,
        sla: slaCheck,
        responseTimes: responseAnalysis,
        satisfaction: satisfactionCheck,
      };
    } catch (error) {
      logger.error('Support monitoring workflow failed', {
        agentId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Execute Workflow for Agent
   */
  static async executeWorkflow(agentId: string, tenantId: string, workflowType: string): Promise<any> {
    try {
      logger.info('Executing agent workflow', {
        agentId,
        workflowType,
      });

      const [agentData] = await db
        .select()
        .from(agents)
        .where(and(eq(agents.id, agentId), eq(agents.tenantId, tenantId)))
        .limit(1);

      if (!agentData) {
        throw new Error('Agent not found');
      }

      let result: any;

      // Select workflow based on agent type or explicit workflow type
      const workflow = workflowType || agentData.agentType;

      switch (workflow) {
        case 'financial':
        case 'financial_monitoring':
          result = await this.executeFinancialMonitoring(agentId, tenantId);
          break;
        case 'security':
        case 'security_monitoring':
          result = await this.executeSecurityMonitoring(agentId, tenantId);
          break;
        case 'trading_ops':
        case 'trading_monitoring':
          result = await this.executeTradingOpsMonitoring(agentId, tenantId);
          break;
        case 'support':
        case 'support_monitoring':
          result = await this.executeSupportMonitoring(agentId, tenantId);
          break;
        default:
          throw new Error(`No workflow defined for type: ${workflow}`);
      }

      logger.info('Workflow executed successfully', {
        agentId,
        workflowType: workflow,
      });

      return result;
    } catch (error) {
      logger.error('Workflow execution failed', {
        agentId,
        workflowType,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Schedule Periodic Monitoring for All Agents
   * This should be called by a cron job or scheduler
   */
  static async schedulePeriodicMonitoring(tenantId: string): Promise<void> {
    try {
      logger.info('Starting scheduled monitoring for all agents', { tenantId });

      // Get all active agents
      const activeAgents = await db
        .select()
        .from(agents)
        .where(and(eq(agents.tenantId, tenantId), eq(agents.isEnabled, true), eq(agents.status, 'active')))
        .execute();

      logger.info('Found active agents for monitoring', {
        tenantId,
        count: activeAgents.length,
      });

      // Execute monitoring for each agent in parallel
      const monitoringPromises = activeAgents.map(async (agent) => {
        try {
          await MastraAgentService.runProactiveMonitoring(agent.id, tenantId);
        } catch (error) {
          logger.error('Agent monitoring failed', {
            agentId: agent.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });

      await Promise.all(monitoringPromises);

      logger.info('Scheduled monitoring completed', {
        tenantId,
        agentsMonitored: activeAgents.length,
      });
    } catch (error) {
      logger.error('Scheduled monitoring failed', {
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Execute Daily Report Workflow
   * Generates comprehensive daily reports from all agents to CEO with learning
   */
  static async executeDailyReportWorkflow(tenantId: string): Promise<void> {
    try {
      logger.info('Executing daily report workflow with learning', { tenantId });

      // Get all active agents
      const activeAgents = await db
        .select()
        .from(agents)
        .where(and(eq(agents.tenantId, tenantId), eq(agents.isEnabled, true)))
        .execute();

      // Get CEO agent
      const [ceoAgent] = await db
        .select()
        .from(agents)
        .where(and(eq(agents.tenantId, tenantId), eq(agents.agentType, 'ceo')))
        .limit(1);

      if (!ceoAgent) {
        logger.warn('CEO agent not found, skipping daily report', { tenantId });
        return;
      }

      // Each Level C agent generates and sends report to CEO with learnings
      for (const agent of activeAgents) {
        if (agent.agentType === 'ceo') continue; // Skip CEO itself

        try {
          await MastraAgentService.executeAutonomousTask(
            agent.id,
            tenantId,
            `Generate a comprehensive daily report for your department. Include:
            1. Key metrics and KPIs
            2. Achievements and successes
            3. Issues and challenges
            4. Recommendations and action items
            5. Forecast for tomorrow

            Search your memory for similar past reports. Learn from what worked before.
            Store important insights from today for future reference.

            Report this to your manager (CEO) with subject "Daily Report - ${agent.name}".`
          );

          logger.info('Daily report sent with learning', {
            fromAgent: agent.id,
            agentType: agent.agentType,
            toAgent: ceoAgent.id,
          });
        } catch (error) {
          logger.error('Failed to generate daily report', {
            agentId: agent.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // CEO consolidates all reports with strategic insights
      await MastraAgentService.executeAutonomousTask(
        ceoAgent.id,
        tenantId,
        `Review all daily reports from your Level C agents. Generate an executive summary highlighting:
        1. Overall company performance
        2. Cross-departmental insights
        3. Strategic recommendations
        4. Action items for tomorrow

        Search your memory for similar past situations and successful strategies.
        Compare today's performance with historical patterns.
        Store key strategic insights for future decision-making.

        Create a comprehensive "CEO Daily Executive Summary" with learned patterns.`
      );

      logger.info('Daily report workflow completed with learning', { tenantId });
    } catch (error) {
      logger.error('Daily report workflow failed', {
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Execute Learning Consolidation
   * Agents review their memories and consolidate learnings
   */
  static async executeLearningConsolidation(agentId: string, tenantId: string): Promise<void> {
    try {
      logger.info('Executing learning consolidation', { agentId });

      await MastraAgentService.executeAutonomousTask(
        agentId,
        tenantId,
        `Review your memory storage from the past week. Identify:
        1. Recurring patterns that were successful
        2. Common errors and how they were resolved
        3. Key decisions and their outcomes
        4. Important insights for future reference

        Consolidate these learnings into strategic knowledge.
        Store high-level patterns and insights.
        Create a summary of what you learned this week.`
      );

      logger.info('Learning consolidation completed', { agentId });
    } catch (error) {
      logger.error('Learning consolidation failed', {
        agentId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
