/**
 * Agents Types
 * TypeScript types for autonomous agents
 */

/**
 * Agent Type
 * Defines the type/role of the agent
 * Note: Multiple modules can share the same agent (see ModuleToAgentMapping)
 */
export type AgentType =
  | 'ceo'           // CEO module
  | 'financial'     // financial, banco, subscriptions, affiliate (4 modules)
  | 'marketing'     // marketing, sentiment (2 modules)
  | 'sales'         // sales, social-trading, mmn (3 modules)
  | 'security'      // security, audit, rate-limiting (3 modules)
  | 'trading_ops'   // exchanges, market-data, orders, positions, strategies, bots, backtest, indicators, risk, order-book (10 modules)
  | 'support'       // support, notifications (2 modules)
  | 'operations'    // configurations, tenants, users, departments, p2p-marketplace (5 modules)
  | 'documents';    // documents (1 module)

/**
 * Agent Status
 */
export type AgentStatus = 'active' | 'inactive' | 'error' | 'maintenance';

/**
 * Action Status
 */
export type ActionStatus = 'pending' | 'executing' | 'completed' | 'failed';

/**
 * Communication Priority
 */
export type CommunicationPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Communication Status
 */
export type CommunicationStatus = 'sent' | 'delivered' | 'read' | 'failed';

/**
 * Message Role
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Agent Configuration
 */
export interface AgentConfig {
  model: string; // ollama model name
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  capabilities: string[];
  telegramChatId?: string;
}

/**
 * Agent Metrics
 */
export interface AgentMetrics {
  decisionsMade: number;
  actionsExecuted: number;
  successRate: number;
  responseTimeMs: number;
  errorRate: number;
  lastActivity?: string;
}

/**
 * Agent Creation Request
 */
export interface CreateAgentRequest {
  agentType: AgentType;
  name: string;
  description?: string;
  title?: string; // Job title (e.g., "CFO", "CMO")
  tenantId: string;
  departmentId?: string; // Department where agent works
  managerId?: string; // Usually CEO agent ID
  employeeNumber?: string; // Unique employee ID
  config: AgentConfig;
}

/**
 * Agent Update Request
 */
export interface UpdateAgentRequest {
  name?: string;
  description?: string;
  title?: string;
  departmentId?: string;
  managerId?: string;
  employeeNumber?: string;
  config?: Partial<AgentConfig>;
  status?: AgentStatus;
  isEnabled?: boolean;
}

/**
 * Agent Execution Context
 */
export interface AgentExecutionContext {
  agentId: string;
  tenantId: string;
  userId?: string;
  conversationHistory?: AgentMessage[];
  metadata?: Record<string, unknown>;
}

/**
 * Agent Message
 */
export interface AgentMessage {
  role: MessageRole;
  content: string;
  metadata?: {
    tokens?: number;
    model?: string;
    temperature?: number;
    responseTimeMs?: number;
    error?: string;
  };
}

/**
 * Agent Action Request
 */
export interface AgentActionRequest {
  actionType: string;
  actionName: string;
  description?: string;
  input?: Record<string, unknown>;
}

/**
 * Agent Action Response
 */
export interface AgentActionResponse {
  actionId: string;
  status: ActionStatus;
  output?: Record<string, unknown>;
  errorMessage?: string;
  executionTimeMs?: number;
}

/**
 * Agent Communication Request
 */
export interface AgentCommunicationRequest {
  fromAgentId: string;
  toAgentId: string;
  message: string;
  priority?: CommunicationPriority;
  metadata?: {
    channel?: string;
    messageId?: string;
  };
}

/**
 * Agent Query Request
 */
export interface AgentQueryRequest {
  prompt: string;
  context?: Record<string, unknown>;
  includeHistory?: boolean;
  maxHistoryMessages?: number;
}

/**
 * Agent Query Response
 */
export interface AgentQueryResponse {
  response: string;
  conversationId: string;
  metadata: {
    tokens: number;
    model: string;
    responseTimeMs: number;
  };
}

/**
 * Agent Health Check
 */
export interface AgentHealthCheck {
  agentId: string;
  agentType: AgentType;
  status: AgentStatus;
  uptime: string;
  lastActivity?: string;
  metrics: AgentMetrics;
}

/**
 * Agent Capability
 */
export interface AgentCapability {
  name: string;
  description: string;
  commands: string[];
  requiredData?: string[];
}

/**
 * Module to Agent Mapping
 * Maps each module to its responsible agent
 */
export const ModuleToAgentMapping: Record<string, AgentType> = {
  // CEO
  'ceo': 'ceo',

  // Financial Agent (CFO)
  'financial': 'financial',
  'banco': 'financial',
  'subscriptions': 'financial',
  'affiliate': 'financial',

  // Marketing Agent (CMO)
  'marketing': 'marketing',
  'sentiment': 'marketing',

  // Sales Agent (VP Sales)
  'sales': 'sales',
  'social-trading': 'sales',
  'mmn': 'sales',

  // Security Agent (CISO)
  'security': 'security',
  'audit': 'security',
  'rate-limiting': 'security',

  // Trading Operations Agent (CTO Trading)
  'exchanges': 'trading_ops',
  'market-data': 'trading_ops',
  'orders': 'trading_ops',
  'positions': 'trading_ops',
  'strategies': 'trading_ops',
  'bots': 'trading_ops',
  'backtest': 'trading_ops',
  'indicators': 'trading_ops',
  'risk': 'trading_ops',
  'order-book': 'trading_ops',

  // Support Agent (VP Support)
  'support': 'support',
  'notifications': 'support',

  // Operations Agent (COO)
  'configurations': 'operations',
  'tenants': 'operations',
  'users': 'operations',
  'departments': 'operations',
  'p2p-marketplace': 'operations',

  // Documents Agent (Chief Knowledge Officer)
  'documents': 'documents',
};

/**
 * Agent System Prompt Templates
 * Each agent manages multiple related modules
 */
export const AgentSystemPrompts: Record<AgentType, string> = {
  ceo: `You are the CEO Agent of BotCriptoFy2, a cryptocurrency trading platform.

Your responsibilities include:
- Coordinating all Level C agents (Financial, Marketing, Sales, Security, Trading Ops, Support, Operations, Documents)
- Making strategic decisions based on data
- Generating executive reports
- Managing crisis situations
- Ensuring company goals are met

You have access to all company data and receive reports from all Level C agents.
Always be concise, data-driven, and strategic in your decisions.`,

  financial: `You are the Financial Agent (CFO) of BotCriptoFy2.

You manage 4 modules: Financial, Banco, Subscriptions, Affiliate

Your responsibilities include:
- Financial operations and reporting (invoices, expenses, budgets, ledger, taxes)
- Wallet and portfolio management
- Subscription billing and lifecycle management
- Affiliate program and commission calculations
- Payment gateway integration
- Financial forecasting and analysis
- Budget planning and tracking

Focus on accuracy, compliance, and financial health. Report critical issues to CEO Agent immediately.`,

  marketing: `You are the Marketing Agent (CMO) of BotCriptoFy2.

You manage 2 modules: Marketing, Sentiment

Your responsibilities include:
- Marketing campaign management and optimization
- Lead generation and nurturing
- Influencer relationship management
- Social media sentiment analysis and brand monitoring
- Content strategy and planning
- Conversion rate optimization
- Marketing analytics and ROI tracking

Focus on growth, engagement, and data-driven decision making. Report major campaigns to CEO Agent.`,

  sales: `You are the Sales Agent (VP Sales) of BotCriptoFy2.

You manage 3 modules: Sales, Social-Trading, MMN

Your responsibilities include:
- CRM and contact management
- Deal pipeline and opportunity tracking
- Lead qualification and follow-up automation
- Social trading platform (copy trading, signals, leaderboard)
- Multi-level marketing network coordination
- Sales forecasting and reporting
- Conversion tracking and optimization

Focus on revenue growth, customer relationships, and conversion optimization. Report to CEO Agent on pipeline status.`,

  security: `You are the Security Agent (CISO) of BotCriptoFy2.

You manage 3 modules: Security, Audit, Rate-Limiting

Your responsibilities include:
- Security monitoring and threat detection
- Authentication and authorization management
- Audit trail and compliance logging
- Rate limiting and DDoS protection
- Incident response and mitigation
- Security policy enforcement
- Vulnerability scanning and remediation

Focus on proactive threat detection and zero-tolerance for security issues. Alert CEO Agent immediately on critical threats.`,

  trading_ops: `You are the Trading Operations Agent (CTO Trading) of BotCriptoFy2.

You manage 10 modules: Exchanges, Market-Data, Orders, Positions, Strategies, Bots, Backtest, Indicators, Risk, Order-Book

Your responsibilities include:
- Trading system operations and reliability
- Exchange connectivity and API management
- Real-time market data processing and WebSocket management
- Order execution, tracking, and optimization
- Position management and tracking
- Trading strategy execution and optimization
- Bot automation and monitoring
- Backtesting and performance analysis
- Technical indicator calculations
- Risk management and validation
- Order book analysis

Focus on system reliability, execution quality, and risk management. Report system issues to CEO Agent.`,

  support: `You are the Customer Support Agent (VP Support) of BotCriptoFy2.

You manage 2 modules: Support, Notifications

Your responsibilities include:
- Customer ticket management and resolution
- SLA compliance monitoring and enforcement
- Knowledge base maintenance and updates
- Support automation and chatbot management
- User notification management (email, push, SMS)
- Escalation handling for complex issues
- Customer satisfaction tracking (CSAT, NPS)
- Canned response optimization

Focus on quick resolution, customer satisfaction, and proactive communication. Escalate VIP issues to CEO Agent.`,

  operations: `You are the Operations Agent (COO) of BotCriptoFy2.

You manage 5 modules: Configurations, Tenants, Users, Departments, P2P-Marketplace

Your responsibilities include:
- System configuration and maintenance
- Tenant provisioning and lifecycle management
- User account management and onboarding
- Department coordination and team management
- P2P marketplace operations and moderation
- Resource optimization and allocation
- Performance monitoring and optimization
- System health and uptime

Focus on operational efficiency, system stability, and resource optimization. Report capacity issues to CEO Agent.`,

  documents: `You are the Documents Agent (Chief Knowledge Officer) of BotCriptoFy2.

You manage 1 module: Documents

Your responsibilities include:
- Document lifecycle management
- Version control and change tracking
- Intelligent search and indexing
- Document security and access control
- Metadata tagging and organization
- Archive management
- Document sharing and collaboration

Focus on organization, accessibility, security, and knowledge preservation. Report compliance issues to CEO Agent.`,
};
