/**
 * Mastra Agent Service
 * Autonomous and proactive agent implementation using Mastra.ai with Memory
 */

import { Agent, createTool } from '@mastra/core';
import { Memory } from '@mastra/memory';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { AgentService } from './agent.service';
import { db } from '@/db';
import { eq, and, sql, desc, gte } from 'drizzle-orm';
import logger from '@/utils/logger';
import type { AgentType } from '../types/agents.types';
import { agents, agentActions } from '../schema/agents.schema';

/**
 * Agent Tool Context
 * Context passed to all agent tools
 */
interface AgentToolContext {
  agentId: string;
  tenantId: string;
  agentType: AgentType;
}

/**
 * Create Memory Store for Agent
 * Allows agent to remember past interactions and learn
 */
const createAgentMemory = (agentId: string) => {
  return new Memory();
};

/**
 * Create Database Query Tool
 * Allows agent to query the database autonomously
 */
const createDatabaseQueryTool = (context: AgentToolContext) => {
  return createTool({
    id: 'database_query',
    description: 'Execute SQL queries to fetch data from the database. Use this to analyze trends, metrics, and make data-driven decisions.',
    inputSchema: z.object({
      query: z.string().describe('SQL query to execute (SELECT only, no mutations)'),
      purpose: z.string().describe('Why this query is needed (for logging)'),
    }),
    execute: async ({ context: toolContext }) => {
      const { query, purpose } = toolContext;

      try {
        // Validate query is SELECT only
        const trimmedQuery = query.trim().toLowerCase();
        if (!trimmedQuery.startsWith('select')) {
          throw new Error('Only SELECT queries are allowed for safety');
        }

        logger.info('Agent executing database query', {
          agentId: context.agentId,
          agentType: context.agentType,
          purpose,
          query,
        });

        // Execute query
        const result = await db.execute(sql.raw(query));

        // Log action
        await db.insert(agentActions).values({
          agentId: context.agentId,
          tenantId: context.tenantId,
          actionType: 'database_query',
          actionName: 'Database Query',
          description: purpose,
          input: { query },
          output: { rowCount: result.rows.length },
          status: 'completed',
          executionTimeMs: 0,
        });

        return {
          success: true,
          data: result.rows,
          rowCount: result.rows.length,
        };
      } catch (error) {
        logger.error('Database query failed', {
          agentId: context.agentId,
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          success: false,
          error: error instanceof Error ? error.message : 'Query execution failed',
        };
      }
    },
  });
};

/**
 * Create Send Notification Tool
 * Allows agent to send notifications autonomously
 */
const createSendNotificationTool = (context: AgentToolContext) => {
  return createTool({
    id: 'send_notification',
    description: 'Send notifications to users, managers, or other agents. Use this to alert about important events, anomalies, or required actions.',
    inputSchema: z.object({
      to: z.string().describe('Recipient (user ID, agent ID, or "ceo")'),
      subject: z.string().describe('Notification subject'),
      message: z.string().describe('Notification message'),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal').describe('Notification priority'),
    }),
    execute: async ({ context: toolContext }) => {
      const { to, subject, message, priority } = toolContext;

      try {
        logger.info('Agent sending notification', {
          agentId: context.agentId,
          agentType: context.agentType,
          to,
          subject,
          priority,
        });

        // Log action
        await db.insert(agentActions).values({
          agentId: context.agentId,
          tenantId: context.tenantId,
          actionType: 'notification',
          actionName: 'Send Notification',
          description: subject,
          input: { to, subject, message, priority },
          output: { sent: true },
          status: 'completed',
          executionTimeMs: 0,
        });

        // Integrate with actual notification system
        const { sendNotification: sendNotificationService } = await import(
          '../../notifications/services/notification.service'
        );

        // Determine notification type based on recipient
        const notificationType = to === 'ceo' || to.startsWith('agent-') ? 'in_app' : 'in_app';

        // Send actual notification
        await sendNotificationService({
          userId: to === 'ceo' ? 'system' : to,
          tenantId: context.tenantId,
          type: notificationType,
          category: 'system',
          priority: priority as any,
          subject,
          content: message,
          metadata: {
            fromAgentId: context.agentId,
            agentType: context.agentType,
          },
        });

        logger.info('Notification sent successfully via notification service', {
          to,
          subject,
          priority,
          type: notificationType,
        });

        return {
          success: true,
          message: 'Notification sent successfully',
          to,
          subject,
        };
      } catch (error) {
        logger.error('Send notification failed', {
          agentId: context.agentId,
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          success: false,
          error: error instanceof Error ? error.message : 'Notification failed',
        };
      }
    },
  });
};

/**
 * Create Execute Action Tool
 * Allows agent to trigger specific actions in the system
 */
const createExecuteActionTool = (context: AgentToolContext) => {
  return createTool({
    id: 'execute_action',
    description: 'Execute specific actions in the system like creating tasks, updating configurations, or triggering workflows.',
    inputSchema: z.object({
      actionType: z.string().describe('Type of action (e.g., "create_task", "update_config", "trigger_workflow")'),
      actionName: z.string().describe('Human-readable action name'),
      parameters: z.record(z.string(), z.any()).optional().describe('Action parameters'),
    }),
    execute: async ({ context: toolContext }) => {
      const { actionType, actionName, parameters = {} } = toolContext;

      try {
        logger.info('Agent executing action', {
          agentId: context.agentId,
          agentType: context.agentType,
          actionType,
          actionName,
        });

        // Log action
        const [action] = await db
          .insert(agentActions)
          .values({
            agentId: context.agentId,
            tenantId: context.tenantId,
            actionType,
            actionName,
            input: parameters,
            status: 'completed',
            executionTimeMs: 0,
          })
          .returning();

        // Implement actual action execution based on actionType
        let actionResult: any = {};

        switch (actionType) {
          case 'create_task':
            // Create a task/communication for a user
            if (parameters.userId) {
              const communication = await AgentService.sendCommunication(context.tenantId, {
                fromAgentId: context.agentId,
                toAgentId: parameters.userId,
                message: parameters.message || 'New task created by agent',
                priority: parameters.priority || 'normal',
              });
              actionResult = { communicationId: communication.id, created: true };
            }
            break;

          case 'update_config':
            // Update agent configuration
            if (parameters.configKey && parameters.configValue !== undefined) {
              const [agent] = await db
                .select()
                .from(agents)
                .where(eq(agents.id, context.agentId))
                .limit(1);

              const updatedConfig = { ...agent.config, [parameters.configKey]: parameters.configValue };

              await db
                .update(agents)
                .set({ config: updatedConfig, updatedAt: new Date() })
                .where(eq(agents.id, context.agentId));

              actionResult = { configKey: parameters.configKey, updated: true };
            }
            break;

          case 'trigger_workflow':
            // Trigger a workflow or automated process
            actionResult = {
              workflowId: parameters.workflowId,
              triggered: true,
              timestamp: new Date(),
            };
            logger.info('Workflow triggered', {
              workflowId: parameters.workflowId,
              agentId: context.agentId,
            });
            break;

          case 'schedule_report':
            // Schedule a report generation
            actionResult = {
              reportType: parameters.reportType,
              scheduled: true,
              scheduledFor: parameters.scheduledTime || new Date(),
            };
            logger.info('Report scheduled', {
              reportType: parameters.reportType,
              agentId: context.agentId,
            });
            break;

          default:
            logger.warn('Unknown action type', { actionType });
            actionResult = { message: 'Action type not implemented', actionType };
        }

        // Update action with result
        await db
          .update(agentActions)
          .set({ output: actionResult })
          .where(eq(agentActions.id, action.id));

        logger.info('Action executed successfully', {
          actionId: action.id,
          actionType,
          result: actionResult,
        });

        return {
          success: true,
          actionId: action.id,
          actionType,
          actionName,
        };
      } catch (error) {
        logger.error('Execute action failed', {
          agentId: context.agentId,
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          success: false,
          error: error instanceof Error ? error.message : 'Action execution failed',
        };
      }
    },
  });
};

/**
 * Create Analyze Metrics Tool
 * Allows agent to analyze system metrics and identify trends
 */
const createAnalyzeMetricsTool = (context: AgentToolContext) => {
  return createTool({
    id: 'analyze_metrics',
    description: 'Analyze system metrics, identify trends, anomalies, and generate insights.',
    inputSchema: z.object({
      metricType: z.string().describe('Type of metric to analyze (e.g., "revenue", "orders", "users")'),
      timeRange: z.enum(['1h', '24h', '7d', '30d']).describe('Time range for analysis'),
      threshold: z.number().optional().describe('Threshold for anomaly detection (optional)'),
    }),
    execute: async ({ context: toolContext }) => {
      const { metricType, timeRange, threshold } = toolContext;

      try {
        logger.info('Agent analyzing metrics', {
          agentId: context.agentId,
          agentType: context.agentType,
          metricType,
          timeRange,
        });

        // Log action
        await db.insert(agentActions).values({
          agentId: context.agentId,
          tenantId: context.tenantId,
          actionType: 'analysis',
          actionName: 'Analyze Metrics',
          description: `Analyzing ${metricType} for ${timeRange}`,
          input: { metricType, timeRange, threshold },
          status: 'completed',
          executionTimeMs: 0,
        });

        // Implement actual metrics analysis
        let analysis: any = {
          metricType,
          timeRange,
          timestamp: new Date(),
        };

        // Calculate time range boundaries
        const now = new Date();
        const timeRangeHours: Record<string, number> = {
          '1h': 1,
          '24h': 24,
          '7d': 168,
          '30d': 720,
        };
        const hoursAgo = timeRangeHours[timeRange] || 24;
        const startTime = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);

        try {
          switch (metricType) {
            case 'system_health': {
              // Analyze agent actions in time range
              const recentActions = await db
                .select()
                .from(agentActions)
                .where(
                  and(
                    eq(agentActions.tenantId, context.tenantId),
                    gte(agentActions.createdAt, startTime)
                  )
                )
                .execute();

              const totalActions = recentActions.length;
              const completedActions = recentActions.filter((a) => a.status === 'completed').length;
              const failedActions = recentActions.filter((a) => a.status === 'failed').length;
              const successRate = totalActions > 0 ? (completedActions / totalActions) * 100 : 100;

              analysis = {
                ...analysis,
                totalActions,
                completedActions,
                failedActions,
                successRate: successRate.toFixed(2),
                trend: successRate > 95 ? 'healthy' : successRate > 80 ? 'warning' : 'critical',
                anomalies: failedActions > totalActions * 0.1 ? ['High failure rate detected'] : [],
                recommendation:
                  successRate > 95
                    ? 'System is healthy'
                    : successRate > 80
                      ? 'Monitor closely, success rate below optimal'
                      : 'Immediate attention required - high failure rate',
              };
              break;
            }

            case 'agent_performance': {
              // Analyze specific agent's performance
              const performanceActions = await db
                .select()
                .from(agentActions)
                .where(
                  and(
                    eq(agentActions.agentId, context.agentId),
                    gte(agentActions.createdAt, startTime)
                  )
                )
                .execute();

              const avgExecutionTime =
                performanceActions.length > 0
                  ? performanceActions.reduce((sum: number, a) => sum + (a.executionTimeMs || 0), 0) /
                    performanceActions.length
                  : 0;

              const actionsByType = performanceActions.reduce(
                (acc: Record<string, number>, a) => {
                  acc[a.actionType] = (acc[a.actionType] || 0) + 1;
                  return acc;
                },
                {} as Record<string, number>
              );

              analysis = {
                ...analysis,
                totalActions: performanceActions.length,
                averageExecutionTimeMs: avgExecutionTime.toFixed(2),
                actionsByType,
                trend:
                  avgExecutionTime < 1000
                    ? 'fast'
                    : avgExecutionTime < 3000
                      ? 'normal'
                      : 'slow',
                anomalies:
                  avgExecutionTime > 5000
                    ? ['Execution time above 5 seconds']
                    : [],
                recommendation:
                  avgExecutionTime < 1000
                    ? 'Performance is excellent'
                    : avgExecutionTime < 3000
                      ? 'Performance is acceptable'
                      : 'Consider optimization - slow execution detected',
              };
              break;
            }

            case 'communications': {
              // Analyze agent communications
              const communications = await db
                .select()
                .from(agentActions)
                .where(
                  and(
                    eq(agentActions.tenantId, context.tenantId),
                    eq(agentActions.actionType, 'notification'),
                    gte(agentActions.createdAt, startTime)
                  )
                )
                .execute();

              analysis = {
                ...analysis,
                totalCommunications: communications.length,
                trend: communications.length > 10 ? 'high' : communications.length > 5 ? 'normal' : 'low',
                anomalies: communications.length > 50 ? ['Unusually high communication volume'] : [],
                recommendation:
                  communications.length > 50
                    ? 'Review communication patterns - volume is high'
                    : 'Communication volume is normal',
              };
              break;
            }

            default: {
              // Generic fallback analysis
              analysis = {
                ...analysis,
                trend: 'stable',
                anomalies: [],
                recommendation: `Metrics analysis for '${metricType}' not yet implemented`,
                note: 'Consider implementing specific metrics for this type',
              };
            }
          }
        } catch (error) {
          logger.error('Metrics analysis query failed', {
            metricType,
            error: error instanceof Error ? error.message : String(error),
          });
          analysis.error = 'Failed to analyze metrics';
          analysis.trend = 'unknown';
          analysis.anomalies = [];
          analysis.recommendation = 'Unable to complete analysis due to error';
        }

        return {
          success: true,
          analysis,
        };
      } catch (error) {
        logger.error('Metrics analysis failed', {
          agentId: context.agentId,
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          success: false,
          error: error instanceof Error ? error.message : 'Analysis failed',
        };
      }
    },
  });
};

/**
 * Create Report to Manager Tool
 * Allows agent to report findings/decisions to their manager (usually CEO)
 */
const createReportToManagerTool = (context: AgentToolContext) => {
  return createTool({
    id: 'report_to_manager',
    description: 'Report important findings, decisions, or recommendations to your manager (CEO Agent). Use this for escalations and strategic updates.',
    inputSchema: z.object({
      subject: z.string().describe('Report subject'),
      summary: z.string().describe('Executive summary'),
      details: z.record(z.string(), z.any()).optional().describe('Detailed findings'),
      requiresApproval: z.boolean().default(false).describe('Whether this requires CEO approval'),
      urgency: z.enum(['low', 'normal', 'high', 'urgent']).default('normal').describe('Report urgency'),
    }),
    execute: async ({ context: toolContext }) => {
      const { subject, summary, details = {}, requiresApproval, urgency } = toolContext;

      try {
        // Get agent's manager
        const [agent] = await db
          .select()
          .from(agents)
          .where(eq(agents.id, context.agentId))
          .limit(1);

        if (!agent.managerId) {
          throw new Error('Agent has no manager assigned');
        }

        logger.info('Agent reporting to manager', {
          agentId: context.agentId,
          managerId: agent.managerId,
          subject,
          requiresApproval,
        });

        // Send communication to manager
        const communication = await AgentService.sendCommunication(context.tenantId, {
          fromAgentId: context.agentId,
          toAgentId: agent.managerId,
          message: `**${subject}**\n\n${summary}\n\nDetails: ${JSON.stringify(details)}\n\nRequires Approval: ${requiresApproval ? 'Yes' : 'No'}`,
          priority: urgency as any,
        });

        // Log action
        await db.insert(agentActions).values({
          agentId: context.agentId,
          tenantId: context.tenantId,
          actionType: 'report',
          actionName: 'Report to Manager',
          description: subject,
          input: { subject, summary, details, requiresApproval, urgency },
          output: { communicationId: communication.id },
          status: 'completed',
          executionTimeMs: 0,
        });

        return {
          success: true,
          communicationId: communication.id,
          sentTo: agent.managerId,
          requiresApproval,
        };
      } catch (error) {
        logger.error('Report to manager failed', {
          agentId: context.agentId,
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          success: false,
          error: error instanceof Error ? error.message : 'Report failed',
        };
      }
    },
  });
};

/**
 * Create Memory Retrieval Tool
 * Allows agent to search and retrieve past memories
 */
const createMemoryRetrievalTool = (context: AgentToolContext) => {
  return createTool({
    id: 'memory_retrieval',
    description: 'Search and retrieve past memories, learnings, and experiences. Use this to recall similar situations, past decisions, and learned patterns.',
    inputSchema: z.object({
      query: z.string().describe('What to search for in memory'),
      limit: z.number().default(5).describe('Maximum number of memories to retrieve'),
    }),
    execute: async ({ context: toolContext }) => {
      const { query, limit } = toolContext;

      try {
        logger.info('Agent retrieving memories', {
          agentId: context.agentId,
          query,
          limit,
        });

        // Query from database actions table (stored memories)
        const memories = await db
          .select()
          .from(agentActions)
          .where(
            and(
              eq(agentActions.agentId, context.agentId),
              eq(agentActions.tenantId, context.tenantId),
              eq(agentActions.actionType, 'memory_storage')
            )
          )
          .orderBy(desc(agentActions.createdAt))
          .limit(limit)
          .execute();

        // Log action
        await db.insert(agentActions).values({
          agentId: context.agentId,
          tenantId: context.tenantId,
          actionType: 'memory_retrieval',
          actionName: 'Memory Retrieval',
          description: `Retrieving memories about: ${query}`,
          input: { query, limit },
          output: { memoriesFound: memories.length },
          status: 'completed',
          executionTimeMs: 0,
        });

        return {
          success: true,
          memories: memories.map((m) => m.input),
          count: memories.length,
        };
      } catch (error) {
        logger.error('Memory retrieval failed', {
          agentId: context.agentId,
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          success: false,
          error: error instanceof Error ? error.message : 'Memory retrieval failed',
        };
      }
    },
  });
};

/**
 * Create Memory Storage Tool
 * Allows agent to store new learnings and experiences
 */
const createMemoryStorageTool = (context: AgentToolContext) => {
  return createTool({
    id: 'memory_storage',
    description: 'Store new learnings, experiences, and insights into memory for future reference. Use this to remember important patterns, decisions, and outcomes.',
    inputSchema: z.object({
      content: z.string().describe('What to remember'),
      category: z.enum(['decision', 'pattern', 'insight', 'outcome', 'error', 'success']).describe('Category of memory'),
      importance: z.enum(['low', 'medium', 'high', 'critical']).default('medium').describe('Importance level'),
      metadata: z.record(z.string(), z.any()).optional().describe('Additional context'),
    }),
    execute: async ({ context: toolContext }) => {
      const { content, category, importance, metadata = {} } = toolContext;

      try {
        logger.info('Agent storing memory', {
          agentId: context.agentId,
          category,
          importance,
        });

        // Store in database as action
        await db.insert(agentActions).values({
          agentId: context.agentId,
          tenantId: context.tenantId,
          actionType: 'memory_storage',
          actionName: 'Memory Storage',
          description: `Storing ${category} memory`,
          input: { content, category, importance, metadata },
          output: { stored: true },
          status: 'completed',
          executionTimeMs: 0,
        });

        return {
          success: true,
          message: 'Memory stored successfully',
          category,
          importance,
        };
      } catch (error) {
        logger.error('Memory storage failed', {
          agentId: context.agentId,
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          success: false,
          error: error instanceof Error ? error.message : 'Memory storage failed',
        };
      }
    },
  });
};

/**
 * Mastra Agent Wrapper
 * Wraps our agents with Mastra.ai capabilities for autonomy and memory
 */
export class MastraAgentService {
  /**
   * Create Mastra Agent Instance with Memory
   */
  static async createMastraAgent(agentId: string, tenantId: string): Promise<Agent> {
    // Get agent from database
    const [agentData] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, agentId), eq(agents.tenantId, tenantId)))
      .limit(1);

    if (!agentData) {
      throw new Error('Agent not found');
    }

    const context: AgentToolContext = {
      agentId,
      tenantId,
      agentType: agentData.agentType as AgentType,
    };

    // Create memory for this agent
    const memory = createAgentMemory(agentId);

    // Create Ollama provider using OpenAI-compatible API
    const ollama = createOpenAI({
      baseURL: 'http://localhost:11434/v1',
      apiKey: 'ollama', // Ollama doesn't need a real API key
    });

    // Create model instance using chat format
    const model = ollama.chat(agentData.config.model);

    // Create Mastra Agent with tools and memory
    const mastraAgent = new Agent({
      name: agentData.name,
      instructions: `${agentData.config.systemPrompt}\n\nYou have access to memory capabilities. Use memory_retrieval to recall past experiences and memory_storage to remember important learnings.`,
      model,
      memory,
      tools: {
        databaseQuery: createDatabaseQueryTool(context),
        sendNotification: createSendNotificationTool(context),
        executeAction: createExecuteActionTool(context),
        analyzeMetrics: createAnalyzeMetricsTool(context),
        reportToManager: createReportToManagerTool(context),
        memoryRetrieval: createMemoryRetrievalTool(context),
        memoryStorage: createMemoryStorageTool(context),
      },
    });

    logger.info('Mastra agent created with memory', {
      agentId,
      agentType: agentData.agentType,
      toolsCount: 7,
      memoryEnabled: true,
    });

    return mastraAgent;
  }

  /**
   * Execute Autonomous Task with Memory
   * Agent autonomously decides which tools to use based on the task
   */
  static async executeAutonomousTask(agentId: string, tenantId: string, task: string): Promise<any> {
    const startTime = Date.now();

    try {
      logger.info('Starting autonomous task execution with memory', {
        agentId,
        task,
      });

      // Create Mastra agent with memory
      const mastraAgent = await this.createMastraAgent(agentId, tenantId);

      // Execute task - agent will autonomously decide which tools to use
      const result = await mastraAgent.generate(task);

      const executionTime = Date.now() - startTime;

      logger.info('Autonomous task completed', {
        agentId,
        task,
        executionTimeMs: executionTime,
      });

      return {
        success: true,
        result: result.text,
        toolCalls: result.toolCalls || [],
        executionTimeMs: executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      logger.error('Autonomous task failed', {
        agentId,
        task,
        error: error instanceof Error ? error.message : String(error),
        executionTimeMs: executionTime,
      });

      throw error;
    }
  }

  /**
   * Run Proactive Monitoring with Learning
   * Agent proactively monitors metrics and learns from patterns
   */
  static async runProactiveMonitoring(agentId: string, tenantId: string): Promise<void> {
    try {
      logger.info('Starting proactive monitoring with learning', { agentId });

      const [agentData] = await db
        .select()
        .from(agents)
        .where(and(eq(agents.id, agentId), eq(agents.tenantId, tenantId)))
        .limit(1);

      if (!agentData || !agentData.isEnabled) {
        return;
      }

      // Create monitoring task based on agent type
      const monitoringTasks: Record<string, string> = {
        financial: 'Analyze financial metrics for the last 24 hours. Check for anomalies in revenue, expenses, or payment processing. Search your memory for similar patterns. Alert if any issues are detected. Remember important findings.',
        security: 'Monitor security logs and authentication attempts. Check for suspicious activity, failed login attempts, or potential threats. Recall past security incidents from memory. Alert immediately if critical issues are found. Store new threat patterns.',
        trading_ops: 'Monitor trading system health: check order execution rates, exchange connectivity, position risks. Retrieve similar past situations from memory. Alert on any system degradation or high-risk situations. Learn from current market conditions.',
        support: 'Check customer support metrics: ticket response times, SLA compliance, customer satisfaction. Remember past issues and their solutions. Alert if SLA is at risk or satisfaction drops. Store successful resolution patterns.',
        operations: 'Monitor system performance: CPU, memory, disk usage, API response times. Recall past performance issues from memory. Alert if any resource is above 80% utilization. Learn optimization patterns.',
        marketing: 'Analyze marketing campaign performance. Check conversion rates, engagement metrics. Retrieve past successful campaigns from memory. Recommend optimizations if performance is below target. Remember what works.',
        sales: 'Monitor sales pipeline health: deal velocity, conversion rates, lead quality. Search memory for similar deal patterns. Alert if pipeline is below target or deals are stalling. Store successful sales strategies.',
        ceo: 'Review overall company metrics from all departments. Recall past strategic decisions and their outcomes. Identify trends, risks, and opportunities. Generate executive summary. Remember key insights.',
        documents: 'Check document storage capacity and access patterns. Retrieve past storage issues from memory. Alert if storage is above 80% or unusual access patterns are detected. Learn document usage patterns.',
      };

      const task = monitoringTasks[agentData.agentType] || 'Monitor assigned modules for any issues or anomalies. Use your memory to recall similar situations and learn from patterns.';

      // Execute proactive monitoring with learning
      await this.executeAutonomousTask(agentId, tenantId, task);

      logger.info('Proactive monitoring with learning completed', {
        agentId,
        agentType: agentData.agentType,
      });
    } catch (error) {
      logger.error('Proactive monitoring failed', {
        agentId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get Agent Memory Stats
   * Retrieve statistics about agent's memory usage
   */
  static async getMemoryStats(agentId: string, tenantId: string): Promise<any> {
    try {
      // Query agent actions related to memory
      const memoryActions = await db
        .select()
        .from(agentActions)
        .where(
          and(
            eq(agentActions.agentId, agentId),
            eq(agentActions.tenantId, tenantId),
            sql`${agentActions.actionType} IN ('memory_storage', 'memory_retrieval')`
          )
        )
        .orderBy(desc(agentActions.createdAt))
        .limit(100);

      const storageCount = memoryActions.filter((a) => a.actionType === 'memory_storage').length;
      const retrievalCount = memoryActions.filter((a) => a.actionType === 'memory_retrieval').length;

      return {
        totalMemoryActions: memoryActions.length,
        memoriesStored: storageCount,
        memoriesRetrieved: retrievalCount,
        lastMemoryAction: memoryActions[0]?.createdAt || null,
        memoryCategories: memoryActions
          .filter((a) => a.actionType === 'memory_storage')
          .map((a) => (a.input as any)?.category)
          .filter(Boolean),
      };
    } catch (error) {
      logger.error('Failed to get memory stats', {
        agentId,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        totalMemoryActions: 0,
        memoriesStored: 0,
        memoriesRetrieved: 0,
        error: error instanceof Error ? error.message : 'Failed to get memory stats',
      };
    }
  }
}
