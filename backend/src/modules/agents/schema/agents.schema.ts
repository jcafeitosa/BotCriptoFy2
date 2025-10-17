/**
 * Agents Schema
 * Database schema for autonomous agents management
 */

import { pgTable, text, timestamp, jsonb, varchar, boolean, integer } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

/**
 * Agents Table
 * Stores agent configurations and state
 */
export const agents = pgTable('agents', {
  // Primary
  id: text('id')
    .$defaultFn(() => createId())
    .primaryKey(),

  // Identification
  agentType: varchar('agent_type', { length: 50 }).notNull(), // ceo, financial, marketing, sales, security, trading_ops, support, operations, documents
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  title: varchar('title', { length: 100 }), // Job title (e.g., "CFO", "CMO", "VP Sales")

  // Multi-tenancy
  tenantId: text('tenant_id').notNull(),

  // Department Assignment (agent as employee)
  departmentId: text('department_id'), // Department where agent "works"
  managerId: text('manager_id'), // Usually points to CEO agent
  employeeNumber: varchar('employee_number', { length: 50 }), // Unique employee ID

  // Configuration
  config: jsonb('config').$type<{
    model: string; // ollama model name (e.g., qwen3:0.6b)
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
    capabilities: string[]; // list of capabilities
    telegramChatId?: string;
  }>().notNull(),

  // Status
  status: varchar('status', { length: 20 }).notNull().default('inactive'), // active, inactive, error, maintenance
  isEnabled: boolean('is_enabled').notNull().default(true),

  // Metrics
  metrics: jsonb('metrics').$type<{
    decisionsMade: number;
    actionsExecuted: number;
    successRate: number;
    responseTimeMs: number;
    errorRate: number;
    lastActivity?: string;
  }>(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
});

/**
 * Agent Conversations Table
 * Stores conversation history for context and learning
 */
export const agentConversations = pgTable('agent_conversations', {
  // Primary
  id: text('id')
    .$defaultFn(() => createId())
    .primaryKey(),

  // Relations
  agentId: text('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  tenantId: text('tenant_id').notNull(),

  // Conversation
  role: varchar('role', { length: 20 }).notNull(), // user, assistant, system
  content: text('content').notNull(),

  // Metadata
  metadata: jsonb('metadata').$type<{
    tokens?: number;
    model?: string;
    temperature?: number;
    responseTimeMs?: number;
    error?: string;
  }>(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Agent Actions Table
 * Logs all actions taken by agents
 */
export const agentActions = pgTable('agent_actions', {
  // Primary
  id: text('id')
    .$defaultFn(() => createId())
    .primaryKey(),

  // Relations
  agentId: text('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  tenantId: text('tenant_id').notNull(),

  // Action
  actionType: varchar('action_type', { length: 50 }).notNull(), // decision, command, analysis, report, alert
  actionName: varchar('action_name', { length: 100 }).notNull(),
  description: text('description'),

  // Input/Output
  input: jsonb('input'),
  output: jsonb('output'),

  // Status
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, executing, completed, failed
  errorMessage: text('error_message'),

  // Performance
  executionTimeMs: integer('execution_time_ms'),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

/**
 * Agent Communications Table
 * Stores inter-agent communications
 */
export const agentCommunications = pgTable('agent_communications', {
  // Primary
  id: text('id')
    .$defaultFn(() => createId())
    .primaryKey(),

  // Relations
  fromAgentId: text('from_agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  toAgentId: text('to_agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  tenantId: text('tenant_id').notNull(),

  // Message
  message: text('message').notNull(),
  priority: varchar('priority', { length: 20 }).notNull().default('normal'), // low, normal, high, urgent

  // Status
  status: varchar('status', { length: 20 }).notNull().default('sent'), // sent, delivered, read, failed

  // Response
  response: text('response'),
  respondedAt: timestamp('responded_at', { withTimezone: true }),

  // Metadata
  metadata: jsonb('metadata').$type<{
    channel?: string; // telegram, internal, webhook
    messageId?: string;
  }>(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Agent Metrics Table
 * Time-series metrics for monitoring
 */
export const agentMetrics = pgTable('agent_metrics', {
  // Primary
  id: text('id')
    .$defaultFn(() => createId())
    .primaryKey(),

  // Relations
  agentId: text('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  tenantId: text('tenant_id').notNull(),

  // Metrics
  metricType: varchar('metric_type', { length: 50 }).notNull(), // uptime, response_time, success_rate, etc
  metricName: varchar('metric_name', { length: 100 }).notNull(),
  value: integer('value').notNull(),
  unit: varchar('unit', { length: 20 }), // ms, %, count, bytes

  // Context
  tags: jsonb('tags').$type<Record<string, string>>(),

  // Timestamps
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
});

// Export types
export type Agent = typeof agents.$inferSelect;
export type AgentInsert = typeof agents.$inferInsert;

export type AgentConversation = typeof agentConversations.$inferSelect;
export type AgentConversationInsert = typeof agentConversations.$inferInsert;

export type AgentAction = typeof agentActions.$inferSelect;
export type AgentActionInsert = typeof agentActions.$inferInsert;

export type AgentCommunication = typeof agentCommunications.$inferSelect;
export type AgentCommunicationInsert = typeof agentCommunications.$inferInsert;

export type AgentMetric = typeof agentMetrics.$inferSelect;
export type AgentMetricInsert = typeof agentMetrics.$inferInsert;
