/**
 * Agent Service
 * Main service for managing autonomous agents
 */

import { db } from '@/db';
import { eq, and, desc } from 'drizzle-orm';
import logger from '@/utils/logger';
import { NotFoundError, BadRequestError } from '@/utils/errors';
import { ollamaService } from './ollama.service';
import {
  agents,
  agentConversations,
  agentActions,
  agentCommunications,
  agentMetrics,
} from '../schema/agents.schema';
import type {
  AgentType,
  AgentStatus,
  CreateAgentRequest,
  UpdateAgentRequest,
  AgentQueryRequest,
  AgentQueryResponse,
  AgentActionRequest,
  AgentActionResponse,
  AgentCommunicationRequest,
  AgentHealthCheck,
  AgentSystemPrompts,
  MessageRole,
} from '../types/agents.types';

export class AgentService {
  /**
   * Create a new agent
   */
  static async createAgent(data: CreateAgentRequest) {
    try {
      logger.info('Creating agent', {
        agentType: data.agentType,
        tenantId: data.tenantId,
      });

      // Validate model exists in Ollama
      const modelExists = await ollamaService.checkModel();
      if (!modelExists) {
        logger.warn('Configured model not found, attempting to pull', {
          model: data.config.model,
        });
        await ollamaService.pullModel(data.config.model);
      }

      // Create agent in database
      const [agent] = await db
        .insert(agents)
        .values({
          agentType: data.agentType,
          name: data.name,
          description: data.description,
          title: data.title,
          tenantId: data.tenantId,
          departmentId: data.departmentId,
          managerId: data.managerId,
          employeeNumber: data.employeeNumber,
          config: data.config,
          status: 'inactive',
          isEnabled: true,
          metrics: {
            decisionsMade: 0,
            actionsExecuted: 0,
            successRate: 0,
            responseTimeMs: 0,
            errorRate: 0,
          },
        })
        .returning();

      logger.info('Agent created successfully', {
        agentId: agent.id,
        agentType: agent.agentType,
      });

      return agent;
    } catch (error) {
      logger.error('Failed to create agent', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get agent by ID
   */
  static async getAgentById(agentId: string, tenantId: string) {
    const [agent] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, agentId), eq(agents.tenantId, tenantId)))
      .limit(1);

    if (!agent) {
      throw new NotFoundError('Agent not found');
    }

    return agent;
  }

  /**
   * List agents for tenant
   */
  static async listAgents(tenantId: string, filters?: { agentType?: AgentType; status?: AgentStatus }) {
    const conditions = [eq(agents.tenantId, tenantId)];

    if (filters?.agentType) {
      conditions.push(eq(agents.agentType, filters.agentType));
    }

    if (filters?.status) {
      conditions.push(eq(agents.status, filters.status as string));
    }

    return await db.select().from(agents).where(and(...conditions)).execute();
  }

  /**
   * Update agent
   */
  static async updateAgent(agentId: string, tenantId: string, data: UpdateAgentRequest) {
    const agent = await this.getAgentById(agentId, tenantId);

    const [updated] = await db
      .update(agents)
      .set({
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.departmentId !== undefined && { departmentId: data.departmentId }),
        ...(data.managerId !== undefined && { managerId: data.managerId }),
        ...(data.employeeNumber !== undefined && { employeeNumber: data.employeeNumber }),
        ...(data.config && { config: { ...agent.config, ...data.config } }),
        ...(data.status && { status: data.status }),
        ...(data.isEnabled !== undefined && { isEnabled: data.isEnabled }),
        updatedAt: new Date(),
      })
      .where(and(eq(agents.id, agentId), eq(agents.tenantId, tenantId)))
      .returning();

    logger.info('Agent updated', { agentId, tenantId });

    return updated;
  }

  /**
   * Delete agent
   */
  static async deleteAgent(agentId: string, tenantId: string) {
    await this.getAgentById(agentId, tenantId);

    await db.delete(agents).where(and(eq(agents.id, agentId), eq(agents.tenantId, tenantId)));

    logger.info('Agent deleted', { agentId, tenantId });
  }

  /**
   * List agents by department
   */
  static async listAgentsByDepartment(departmentId: string, tenantId: string) {
    return await db
      .select()
      .from(agents)
      .where(and(eq(agents.departmentId, departmentId), eq(agents.tenantId, tenantId)))
      .execute();
  }

  /**
   * Assign agent to department
   */
  static async assignToDepartment(agentId: string, tenantId: string, departmentId: string, managerId?: string) {
    const agent = await this.getAgentById(agentId, tenantId);

    const [updated] = await db
      .update(agents)
      .set({
        departmentId,
        ...(managerId && { managerId }),
        updatedAt: new Date(),
      })
      .where(and(eq(agents.id, agentId), eq(agents.tenantId, tenantId)))
      .returning();

    logger.info('Agent assigned to department', {
      agentId,
      departmentId,
      managerId,
    });

    return updated;
  }

  /**
   * Remove agent from department
   */
  static async removeFromDepartment(agentId: string, tenantId: string) {
    const agent = await this.getAgentById(agentId, tenantId);

    const [updated] = await db
      .update(agents)
      .set({
        departmentId: null,
        managerId: null,
        updatedAt: new Date(),
      })
      .where(and(eq(agents.id, agentId), eq(agents.tenantId, tenantId)))
      .returning();

    logger.info('Agent removed from department', { agentId });

    return updated;
  }

  /**
   * List agents reporting to a manager
   */
  static async listAgentsByManager(managerId: string, tenantId: string) {
    return await db
      .select()
      .from(agents)
      .where(and(eq(agents.managerId, managerId), eq(agents.tenantId, tenantId)))
      .execute();
  }

  /**
   * Query agent with prompt
   */
  static async query(agentId: string, tenantId: string, request: AgentQueryRequest): Promise<AgentQueryResponse> {
    const startTime = Date.now();

    try {
      const agent = await this.getAgentById(agentId, tenantId);

      if (!agent.isEnabled) {
        throw new BadRequestError('Agent is disabled');
      }

      // Get conversation history if requested
      const messages: Array<{ role: MessageRole; content: string }> = [];

      if (request.includeHistory) {
        const historyLimit = request.maxHistoryMessages || 10;
        const history = await db
          .select()
          .from(agentConversations)
          .where(and(eq(agentConversations.agentId, agentId), eq(agentConversations.tenantId, tenantId)))
          .orderBy(desc(agentConversations.createdAt))
          .limit(historyLimit);

        const historyMessages = history.reverse().map((msg) => ({
          role: msg.role as MessageRole,
          content: msg.content,
        }));

        messages.push(...historyMessages);
      }

      // Add current prompt
      messages.push({
        role: 'user' as MessageRole,
        content: request.prompt,
      });

      // Get response from Ollama
      const response = await ollamaService.chat({
        messages,
        systemPrompt: agent.config.systemPrompt,
        temperature: agent.config.temperature,
        maxTokens: agent.config.maxTokens,
      });

      // Save conversation
      const [userMessage] = await db
        .insert(agentConversations)
        .values({
          agentId,
          tenantId,
          role: 'user',
          content: request.prompt,
        })
        .returning();

      const [assistantMessage] = await db
        .insert(agentConversations)
        .values({
          agentId,
          tenantId,
          role: 'assistant',
          content: response.content,
          metadata: {
            tokens: response.tokens,
            model: response.model,
            temperature: agent.config.temperature,
            responseTimeMs: response.responseTimeMs,
          },
        })
        .returning();

      // Update agent metrics
      await this.updateAgentMetrics(agentId, tenantId, {
        responseTimeMs: response.responseTimeMs,
        success: true,
      });

      // Update last activity
      await db
        .update(agents)
        .set({
          lastActiveAt: new Date(),
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(agents.id, agentId));

      const totalTime = Date.now() - startTime;

      logger.info('Agent query completed', {
        agentId,
        responseTimeMs: totalTime,
        tokens: response.tokens,
      });

      return {
        response: response.content,
        conversationId: assistantMessage.id,
        metadata: {
          tokens: response.tokens,
          model: response.model,
          responseTimeMs: totalTime,
        },
      };
    } catch (error) {
      const totalTime = Date.now() - startTime;

      logger.error('Agent query failed', {
        agentId,
        error: error instanceof Error ? error.message : String(error),
        responseTimeMs: totalTime,
      });

      // Update agent metrics for failure
      await this.updateAgentMetrics(agentId, tenantId, {
        responseTimeMs: totalTime,
        success: false,
      });

      throw error;
    }
  }

  /**
   * Execute agent action
   */
  static async executeAction(
    agentId: string,
    tenantId: string,
    request: AgentActionRequest
  ): Promise<AgentActionResponse> {
    const startTime = Date.now();

    try {
      const agent = await this.getAgentById(agentId, tenantId);

      if (!agent.isEnabled) {
        throw new BadRequestError('Agent is disabled');
      }

      // Create action record
      const [action] = await db
        .insert(agentActions)
        .values({
          agentId,
          tenantId,
          actionType: request.actionType,
          actionName: request.actionName,
          description: request.description,
          input: request.input,
          status: 'executing',
          startedAt: new Date(),
        })
        .returning();

      logger.info('Agent action started', {
        agentId,
        actionId: action.id,
        actionType: request.actionType,
      });

      // Simulate action execution
      // In real implementation, this would call specific action handlers
      const output = {
        actionId: action.id,
        status: 'completed' as const,
        result: 'Action executed successfully',
        timestamp: new Date().toISOString(),
      };

      const executionTime = Date.now() - startTime;

      // Update action record
      await db
        .update(agentActions)
        .set({
          status: 'completed',
          output,
          executionTimeMs: executionTime,
          completedAt: new Date(),
        })
        .where(eq(agentActions.id, action.id));

      // Update agent metrics
      const currentMetrics = agent.metrics as {
        decisionsMade: number;
        actionsExecuted: number;
        successRate: number;
        responseTimeMs: number;
        errorRate: number;
        lastActivity?: string;
      };
      const updatedMetrics = {
        ...currentMetrics,
        actionsExecuted: currentMetrics.actionsExecuted + 1,
      };

      await db
        .update(agents)
        .set({
          metrics: updatedMetrics,
          lastActiveAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(agents.id, agentId));

      logger.info('Agent action completed', {
        agentId,
        actionId: action.id,
        executionTimeMs: executionTime,
      });

      return {
        actionId: action.id,
        status: 'completed',
        output,
        executionTimeMs: executionTime,
      };
    } catch (error) {
      logger.error('Agent action failed', {
        agentId,
        actionType: request.actionType,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Send communication between agents
   */
  static async sendCommunication(tenantId: string, request: AgentCommunicationRequest) {
    try {
      // Validate both agents exist
      await this.getAgentById(request.fromAgentId, tenantId);
      await this.getAgentById(request.toAgentId, tenantId);

      const [communication] = await db
        .insert(agentCommunications)
        .values({
          fromAgentId: request.fromAgentId,
          toAgentId: request.toAgentId,
          tenantId,
          message: request.message,
          priority: request.priority || 'normal',
          status: 'sent',
          metadata: request.metadata,
        })
        .returning();

      logger.info('Agent communication sent', {
        communicationId: communication.id,
        from: request.fromAgentId,
        to: request.toAgentId,
        priority: request.priority,
      });

      return communication;
    } catch (error) {
      logger.error('Failed to send agent communication', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get agent health check
   */
  static async getHealthCheck(agentId: string, tenantId: string): Promise<AgentHealthCheck> {
    const agent = await this.getAgentById(agentId, tenantId);

    const uptime = agent.createdAt
      ? `${Math.floor((Date.now() - agent.createdAt.getTime()) / 1000 / 60 / 60)}h`
      : '0h';

    return {
      agentId: agent.id,
      agentType: agent.agentType as AgentType,
      status: agent.status as AgentStatus,
      uptime,
      lastActivity: agent.lastActiveAt?.toISOString(),
      metrics: agent.metrics as any,
    };
  }

  /**
   * Update agent metrics
   */
  private static async updateAgentMetrics(
    agentId: string,
    tenantId: string,
    data: { responseTimeMs: number; success: boolean }
  ) {
    const agent = await this.getAgentById(agentId, tenantId);
    const metrics = agent.metrics as {
      decisionsMade: number;
      actionsExecuted: number;
      successRate: number;
      responseTimeMs: number;
      errorRate: number;
    };

    const totalDecisions = metrics.decisionsMade + 1;
    const successCount = Math.floor((metrics.successRate / 100) * metrics.decisionsMade) + (data.success ? 1 : 0);
    const newSuccessRate = (successCount / totalDecisions) * 100;
    const newErrorRate = 100 - newSuccessRate;

    await db
      .update(agents)
      .set({
        metrics: {
          decisionsMade: totalDecisions,
          actionsExecuted: metrics.actionsExecuted,
          successRate: newSuccessRate,
          responseTimeMs: Math.floor((metrics.responseTimeMs + data.responseTimeMs) / 2),
          errorRate: newErrorRate,
          lastActivity: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(eq(agents.id, agentId));
  }
}
