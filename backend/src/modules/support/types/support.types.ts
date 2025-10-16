/**
 * Support Module Types
 * Type definitions for support tickets system
 */

import type {
  TicketPriority,
  TicketStatus,
  TicketSource,
} from '../schema/tickets.schema';
import type { AutomationTrigger } from '../schema/automations.schema';
import type { FileAttachment } from '../schema/ticket-messages.schema';

/**
 * Ticket Interface
 */
export interface Ticket {
  id: string;
  tenantId: string;
  ticketNumber: string;
  contactId?: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  category: string;
  source: TicketSource;
  assignedTo?: string;
  slaId?: string;
  dueDate?: Date;
  resolutionTime?: number;
  firstResponseTime?: number;
  satisfactionRating?: number;
  satisfactionComment?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  deletedAt?: Date;
}

/**
 * Create Ticket Input
 */
export interface CreateTicketInput {
  contactId?: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  category: string;
  source: TicketSource;
  assignedTo?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

/**
 * Update Ticket Input
 */
export interface UpdateTicketInput {
  subject?: string;
  description?: string;
  priority?: TicketPriority;
  category?: string;
  assignedTo?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

/**
 * Ticket Filters
 */
export interface TicketFilters {
  status?: TicketStatus | TicketStatus[];
  priority?: TicketPriority | TicketPriority[];
  category?: string | string[];
  assignedTo?: string;
  contactId?: string;
  source?: TicketSource;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'priority' | 'dueDate';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Ticket Message Interface
 */
export interface TicketMessage {
  id: string;
  ticketId: string;
  message: string;
  isInternal: boolean;
  isFromCustomer: boolean;
  attachments: FileAttachment[];
  createdBy?: string;
  createdAt: Date;
}

/**
 * Create Message Input
 */
export interface CreateMessageInput {
  message: string;
  isInternal?: boolean;
  isFromCustomer?: boolean;
  attachments?: FileAttachment[];
}

/**
 * SLA Policy Interface
 */
export interface SLAPolicy {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  priority: TicketPriority;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  businessHoursOnly: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create SLA Policy Input
 */
export interface CreateSLAPolicyInput {
  name: string;
  description?: string;
  priority: TicketPriority;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  businessHoursOnly?: boolean;
}

/**
 * Update SLA Policy Input
 */
export interface UpdateSLAPolicyInput {
  name?: string;
  description?: string;
  firstResponseMinutes?: number;
  resolutionMinutes?: number;
  businessHoursOnly?: boolean;
  isActive?: boolean;
}

/**
 * SLA Metrics
 */
export interface SLAMetrics {
  totalTickets: number;
  withinSLA: number;
  breachedSLA: number;
  complianceRate: number; // percentage
  avgFirstResponseTime: number; // minutes
  avgResolutionTime: number; // minutes
  byPriority: {
    [key in TicketPriority]: {
      total: number;
      withinSLA: number;
      breached: number;
      complianceRate: number;
    };
  };
}

/**
 * Knowledge Base Article Interface
 */
export interface KnowledgeBaseArticle {
  id: string;
  tenantId: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  isPublished: boolean;
  viewsCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

/**
 * Create Article Input
 */
export interface CreateArticleInput {
  title: string;
  content: string;
  category: string;
  tags?: string[];
}

/**
 * Update Article Input
 */
export interface UpdateArticleInput {
  title?: string;
  content?: string;
  category?: string;
  tags?: string[];
}

/**
 * Article Filters
 */
export interface ArticleFilters {
  category?: string;
  tags?: string[];
  isPublished?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Ticket Automation Interface
 */
export interface TicketAutomation {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  trigger: AutomationTrigger;
  conditions: Record<string, any>;
  actions: Record<string, any>;
  isActive: boolean;
  executionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create Automation Input
 */
export interface CreateAutomationInput {
  name: string;
  description?: string;
  trigger: AutomationTrigger;
  conditions: Record<string, any>;
  actions: Record<string, any>;
}

/**
 * Update Automation Input
 */
export interface UpdateAutomationInput {
  name?: string;
  description?: string;
  conditions?: Record<string, any>;
  actions?: Record<string, any>;
  isActive?: boolean;
}

/**
 * Canned Response Interface
 */
export interface CannedResponse {
  id: string;
  tenantId: string;
  ownerId: string;
  title: string;
  content: string;
  category?: string;
  isShared: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create Canned Response Input
 */
export interface CreateCannedResponseInput {
  title: string;
  content: string;
  category?: string;
  isShared?: boolean;
}

/**
 * Update Canned Response Input
 */
export interface UpdateCannedResponseInput {
  title?: string;
  content?: string;
  category?: string;
  isShared?: boolean;
}

/**
 * Ticket Statistics
 */
export interface TicketStats {
  total: number;
  byStatus: {
    [key in TicketStatus]: number;
  };
  byPriority: {
    [key in TicketPriority]: number;
  };
  byCategory: Record<string, number>;
  avgResolutionTime: number; // minutes
  avgFirstResponseTime: number; // minutes
  satisfactionScore: number; // average rating
}

/**
 * Agent Performance
 */
export interface AgentPerformance {
  userId: string;
  totalTickets: number;
  resolvedTickets: number;
  avgResolutionTime: number;
  avgFirstResponseTime: number;
  satisfactionScore: number;
  slaCompliance: number;
}

/**
 * Satisfaction Metrics
 */
export interface SatisfactionMetrics {
  totalRatings: number;
  averageScore: number; // 1-5
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  csatScore: number; // % of 4-5 stars
}

/**
 * Timeline Event
 */
export interface TimelineEvent {
  id: string;
  type: 'created' | 'assigned' | 'status_change' | 'message' | 'note' | 'resolved' | 'closed' | 'reopened';
  description: string;
  data?: Record<string, any>;
  userId?: string;
  timestamp: Date;
}

/**
 * Ticket Timeline
 */
export interface TicketTimeline {
  ticketId: string;
  events: TimelineEvent[];
}

/**
 * Re-export schema types
 */
export type {
  TicketPriority,
  TicketStatus,
  TicketSource,
  AutomationTrigger,
  FileAttachment,
};
