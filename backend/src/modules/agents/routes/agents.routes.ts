/**
 * Agents Routes
 * API endpoints for autonomous agents management
 */

import { Elysia, t } from 'elysia';
import { AgentService } from '../services/agent.service';
import { ollamaService } from '../services/ollama.service';
import { MastraAgentService } from '../services/mastra-agent.service';
import { AgentWorkflowsService } from '../services/agent-workflows.service';
import logger from '@/utils/logger';

export const agentsRoutes = new Elysia({ prefix: '/agents' })
  /**
   * Create a new agent
   */
  .post(
    '/',
    async ({ body }) => {
      try {
        const agent = await AgentService.createAgent(body);
        return {
          success: true,
          data: agent,
        };
      } catch (error) {
        logger.error('Create agent failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    {
      body: t.Object({
        agentType: t.Union([
          t.Literal('ceo'),
          t.Literal('financial'),
          t.Literal('marketing'),
          t.Literal('sales'),
          t.Literal('security'),
          t.Literal('trading_ops'),
          t.Literal('support'),
          t.Literal('operations'),
          t.Literal('documents'),
        ]),
        name: t.String(),
        description: t.Optional(t.String()),
        title: t.Optional(t.String()),
        tenantId: t.String(),
        departmentId: t.Optional(t.String()),
        managerId: t.Optional(t.String()),
        employeeNumber: t.Optional(t.String()),
        config: t.Object({
          model: t.String(),
          temperature: t.Number(),
          maxTokens: t.Number(),
          systemPrompt: t.String(),
          capabilities: t.Array(t.String()),
          telegramChatId: t.Optional(t.String()),
        }),
      }),
      detail: {
        tags: ['Agents'],
        summary: 'Create a new autonomous agent',
        description: 'Creates a new agent instance for the specified department/role',
      },
    }
  )

  /**
   * List all agents
   */
  .get(
    '/',
    async ({ query }) => {
      try {
        const { tenantId, agentType, status } = query;
        const agents = await AgentService.listAgents(tenantId, {
          agentType: agentType as any,
          status: status as any,
        });

        return {
          success: true,
          data: agents,
          count: agents.length,
        };
      } catch (error) {
        logger.error('List agents failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    {
      query: t.Object({
        tenantId: t.String(),
        agentType: t.Optional(t.String()),
        status: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Agents'],
        summary: 'List all agents',
        description: 'Retrieves all agents for a tenant with optional filters',
      },
    }
  )

  /**
   * Get agent by ID
   */
  .get(
    '/:agentId',
    async ({ params, query }) => {
      try {
        const agent = await AgentService.getAgentById(params.agentId, query.tenantId);
        return {
          success: true,
          data: agent,
        };
      } catch (error) {
        logger.error('Get agent failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    {
      params: t.Object({
        agentId: t.String(),
      }),
      query: t.Object({
        tenantId: t.String(),
      }),
      detail: {
        tags: ['Agents'],
        summary: 'Get agent by ID',
        description: 'Retrieves a specific agent by its ID',
      },
    }
  )

  /**
   * Update agent
   */
  .patch(
    '/:agentId',
    async ({ params, query, body }) => {
      try {
        const agent = await AgentService.updateAgent(params.agentId, query.tenantId, body);
        return {
          success: true,
          data: agent,
        };
      } catch (error) {
        logger.error('Update agent failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    {
      params: t.Object({
        agentId: t.String(),
      }),
      query: t.Object({
        tenantId: t.String(),
      }),
      body: t.Object({
        name: t.Optional(t.String()),
        description: t.Optional(t.String()),
        title: t.Optional(t.String()),
        departmentId: t.Optional(t.String()),
        managerId: t.Optional(t.String()),
        employeeNumber: t.Optional(t.String()),
        config: t.Optional(
          t.Partial(
            t.Object({
              model: t.String(),
              temperature: t.Number(),
              maxTokens: t.Number(),
              systemPrompt: t.String(),
              capabilities: t.Array(t.String()),
              telegramChatId: t.String(),
            })
          )
        ),
        status: t.Optional(t.Union([t.Literal('active'), t.Literal('inactive'), t.Literal('error'), t.Literal('maintenance')])),
        isEnabled: t.Optional(t.Boolean()),
      }),
      detail: {
        tags: ['Agents'],
        summary: 'Update agent',
        description: 'Updates an existing agent configuration',
      },
    }
  )

  /**
   * Delete agent
   */
  .delete(
    '/:agentId',
    async ({ params, query }) => {
      try {
        await AgentService.deleteAgent(params.agentId, query.tenantId);
        return {
          success: true,
          message: 'Agent deleted successfully',
        };
      } catch (error) {
        logger.error('Delete agent failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    {
      params: t.Object({
        agentId: t.String(),
      }),
      query: t.Object({
        tenantId: t.String(),
      }),
      detail: {
        tags: ['Agents'],
        summary: 'Delete agent',
        description: 'Deletes an agent and all its data',
      },
    }
  )

  /**
   * Query agent (chat)
   */
  .post(
    '/:agentId/query',
    async ({ params, query, body }) => {
      try {
        const response = await AgentService.query(params.agentId, query.tenantId, body);
        return {
          success: true,
          data: response,
        };
      } catch (error) {
        logger.error('Agent query failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    {
      params: t.Object({
        agentId: t.String(),
      }),
      query: t.Object({
        tenantId: t.String(),
      }),
      body: t.Object({
        prompt: t.String(),
        context: t.Optional(t.Any()),
        includeHistory: t.Optional(t.Boolean()),
        maxHistoryMessages: t.Optional(t.Number()),
      }),
      detail: {
        tags: ['Agents'],
        summary: 'Query agent',
        description: 'Send a prompt to the agent and get a response',
      },
    }
  )

  /**
   * Execute agent action
   */
  .post(
    '/:agentId/action',
    async ({ params, query, body }) => {
      try {
        const response = await AgentService.executeAction(params.agentId, query.tenantId, body);
        return {
          success: true,
          data: response,
        };
      } catch (error) {
        logger.error('Agent action failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    {
      params: t.Object({
        agentId: t.String(),
      }),
      query: t.Object({
        tenantId: t.String(),
      }),
      body: t.Object({
        actionType: t.String(),
        actionName: t.String(),
        description: t.Optional(t.String()),
        input: t.Optional(t.Any()),
      }),
      detail: {
        tags: ['Agents'],
        summary: 'Execute agent action',
        description: 'Triggers a specific action for the agent to perform',
      },
    }
  )

  /**
   * Get agent health check
   */
  .get(
    '/:agentId/health',
    async ({ params, query }) => {
      try {
        const health = await AgentService.getHealthCheck(params.agentId, query.tenantId);
        return {
          success: true,
          data: health,
        };
      } catch (error) {
        logger.error('Agent health check failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    {
      params: t.Object({
        agentId: t.String(),
      }),
      query: t.Object({
        tenantId: t.String(),
      }),
      detail: {
        tags: ['Agents'],
        summary: 'Get agent health',
        description: 'Retrieves health status and metrics for an agent',
      },
    }
  )

  /**
   * Send communication between agents
   */
  .post(
    '/communicate',
    async ({ query, body }) => {
      try {
        const communication = await AgentService.sendCommunication(query.tenantId, body);
        return {
          success: true,
          data: communication,
        };
      } catch (error) {
        logger.error('Agent communication failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    {
      query: t.Object({
        tenantId: t.String(),
      }),
      body: t.Object({
        fromAgentId: t.String(),
        toAgentId: t.String(),
        message: t.String(),
        priority: t.Optional(t.Union([t.Literal('low'), t.Literal('normal'), t.Literal('high'), t.Literal('urgent')])),
        metadata: t.Optional(t.Any()),
      }),
      detail: {
        tags: ['Agents'],
        summary: 'Send inter-agent communication',
        description: 'Sends a message from one agent to another',
      },
    }
  )

  /**
   * Check Ollama status
   */
  .get(
    '/ollama/status',
    async () => {
      try {
        const models = await ollamaService.listModels();
        const defaultModelExists = await ollamaService.checkModel();

        return {
          success: true,
          data: {
            available: models.length > 0,
            models,
            defaultModelExists,
            defaultModel: process.env.OLLAMA_MODEL || 'qwen3:0.6b',
          },
        };
      } catch (error) {
        logger.error('Ollama status check failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        return {
          success: false,
          error: 'Ollama not available',
        };
      }
    },
    {
      detail: {
        tags: ['Agents'],
        summary: 'Check Ollama status',
        description: 'Checks if Ollama is available and lists available models',
      },
    }
  )

  /**
   * Pull Ollama model
   */
  .post(
    '/ollama/pull',
    async ({ body }) => {
      try {
        await ollamaService.pullModel(body.model);
        return {
          success: true,
          message: `Model ${body.model} pulled successfully`,
        };
      } catch (error) {
        logger.error('Ollama model pull failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    {
      body: t.Object({
        model: t.String(),
      }),
      detail: {
        tags: ['Agents'],
        summary: 'Pull Ollama model',
        description: 'Downloads a model from Ollama registry',
      },
    }
  )

  /**
   * List agents by department
   */
  .get(
    '/department/:departmentId',
    async ({ params, query }) => {
      try {
        const agents = await AgentService.listAgentsByDepartment(params.departmentId, query.tenantId);
        return {
          success: true,
          data: agents,
          count: agents.length,
        };
      } catch (error) {
        logger.error('List agents by department failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    {
      params: t.Object({
        departmentId: t.String(),
      }),
      query: t.Object({
        tenantId: t.String(),
      }),
      detail: {
        tags: ['Agents'],
        summary: 'List agents by department',
        description: 'Retrieves all agents assigned to a specific department',
      },
    }
  )

  /**
   * Assign agent to department
   */
  .post(
    '/:agentId/assign-department',
    async ({ params, query, body }) => {
      try {
        const agent = await AgentService.assignToDepartment(
          params.agentId,
          query.tenantId,
          body.departmentId,
          body.managerId
        );
        return {
          success: true,
          data: agent,
          message: 'Agent assigned to department successfully',
        };
      } catch (error) {
        logger.error('Assign agent to department failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    {
      params: t.Object({
        agentId: t.String(),
      }),
      query: t.Object({
        tenantId: t.String(),
      }),
      body: t.Object({
        departmentId: t.String(),
        managerId: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Agents'],
        summary: 'Assign agent to department',
        description: 'Assigns an agent to a specific department (like hiring an employee)',
      },
    }
  )

  /**
   * Remove agent from department
   */
  .post(
    '/:agentId/remove-department',
    async ({ params, query }) => {
      try {
        const agent = await AgentService.removeFromDepartment(params.agentId, query.tenantId);
        return {
          success: true,
          data: agent,
          message: 'Agent removed from department successfully',
        };
      } catch (error) {
        logger.error('Remove agent from department failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    {
      params: t.Object({
        agentId: t.String(),
      }),
      query: t.Object({
        tenantId: t.String(),
      }),
      detail: {
        tags: ['Agents'],
        summary: 'Remove agent from department',
        description: 'Removes an agent from its assigned department',
      },
    }
  )

  /**
   * List agents by manager
   */
  .get(
    '/manager/:managerId',
    async ({ params, query }) => {
      try {
        const agents = await AgentService.listAgentsByManager(params.managerId, query.tenantId);
        return {
          success: true,
          data: agents,
          count: agents.length,
        };
      } catch (error) {
        logger.error('List agents by manager failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    {
      params: t.Object({
        managerId: t.String(),
      }),
      query: t.Object({
        tenantId: t.String(),
      }),
      detail: {
        tags: ['Agents'],
        summary: 'List agents by manager',
        description: 'Retrieves all agents reporting to a specific manager (usually CEO agent)',
      },
    }
  )

  /**
   * Execute autonomous task
   */
  .post(
    '/:agentId/autonomous-task',
    async ({ params, query, body }) => {
      try {
        const result = await MastraAgentService.executeAutonomousTask(
          params.agentId,
          query.tenantId,
          body.task
        );

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        logger.error('Autonomous task execution failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    {
      params: t.Object({
        agentId: t.String(),
      }),
      query: t.Object({
        tenantId: t.String(),
      }),
      body: t.Object({
        task: t.String({
          description: 'Task description - agent will autonomously decide which tools to use',
        }),
      }),
      detail: {
        tags: ['Agents - Autonomous'],
        summary: 'Execute autonomous task',
        description: 'Agent autonomously executes a task, deciding which tools to use (database queries, notifications, actions, etc.)',
      },
    }
  )

  /**
   * Run proactive monitoring
   */
  .post(
    '/:agentId/proactive-monitoring',
    async ({ params, query }) => {
      try {
        await MastraAgentService.runProactiveMonitoring(params.agentId, query.tenantId);

        return {
          success: true,
          message: 'Proactive monitoring completed',
        };
      } catch (error) {
        logger.error('Proactive monitoring failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    {
      params: t.Object({
        agentId: t.String(),
      }),
      query: t.Object({
        tenantId: t.String(),
      }),
      detail: {
        tags: ['Agents - Autonomous'],
        summary: 'Run proactive monitoring',
        description: 'Agent proactively monitors its domain and takes action when needed',
      },
    }
  )

  /**
   * Execute workflow
   */
  .post(
    '/:agentId/execute-workflow',
    async ({ params, query, body }) => {
      try {
        const result = await AgentWorkflowsService.executeWorkflow(
          params.agentId,
          query.tenantId,
          body.workflowType
        );

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        logger.error('Workflow execution failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    {
      params: t.Object({
        agentId: t.String(),
      }),
      query: t.Object({
        tenantId: t.String(),
      }),
      body: t.Object({
        workflowType: t.String({
          description: 'Workflow type (e.g., "monitoring", "reporting")',
        }),
      }),
      detail: {
        tags: ['Agents - Autonomous'],
        summary: 'Execute workflow',
        description: 'Execute a predefined autonomous workflow for the agent',
      },
    }
  )

  /**
   * Schedule periodic monitoring (for all agents in tenant)
   */
  .post(
    '/schedule-monitoring',
    async ({ query }) => {
      try {
        await AgentWorkflowsService.schedulePeriodicMonitoring(query.tenantId);

        return {
          success: true,
          message: 'Periodic monitoring scheduled for all agents',
        };
      } catch (error) {
        logger.error('Schedule monitoring failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    {
      query: t.Object({
        tenantId: t.String(),
      }),
      detail: {
        tags: ['Agents - Autonomous'],
        summary: 'Schedule periodic monitoring',
        description: 'Schedule proactive monitoring for all active agents in tenant (should be called by cron)',
      },
    }
  )

  /**
   * Execute daily report workflow
   */
  .post(
    '/daily-report',
    async ({ query }) => {
      try {
        await AgentWorkflowsService.executeDailyReportWorkflow(query.tenantId);

        return {
          success: true,
          message: 'Daily report workflow completed',
        };
      } catch (error) {
        logger.error('Daily report workflow failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    {
      query: t.Object({
        tenantId: t.String(),
      }),
      detail: {
        tags: ['Agents - Autonomous'],
        summary: 'Execute daily report workflow',
        description: 'All Level C agents generate reports and send to CEO (should be called by cron at end of day)',
      },
    }
  )

  /**
   * Get agent memory stats
   */
  .get(
    '/:agentId/memory-stats',
    async ({ params, query }) => {
      try {
        const stats = await MastraAgentService.getMemoryStats(params.agentId, query.tenantId);

        return {
          success: true,
          data: stats,
        };
      } catch (error) {
        logger.error('Get memory stats failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    {
      params: t.Object({
        agentId: t.String(),
      }),
      query: t.Object({
        tenantId: t.String(),
      }),
      detail: {
        tags: ['Agents - Memory & Learning'],
        summary: 'Get agent memory statistics',
        description: 'Retrieves statistics about agent memory usage, stored memories, and learning patterns',
      },
    }
  )

  /**
   * Execute learning consolidation
   */
  .post(
    '/:agentId/consolidate-learning',
    async ({ params, query }) => {
      try {
        await AgentWorkflowsService.executeLearningConsolidation(params.agentId, query.tenantId);

        return {
          success: true,
          message: 'Learning consolidation completed',
        };
      } catch (error) {
        logger.error('Learning consolidation failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    {
      params: t.Object({
        agentId: t.String(),
      }),
      query: t.Object({
        tenantId: t.String(),
      }),
      detail: {
        tags: ['Agents - Memory & Learning'],
        summary: 'Consolidate agent learnings',
        description: 'Agent reviews its memories and consolidates learnings into strategic knowledge (run weekly)',
      },
    }
  );
