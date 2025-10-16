/**
 * Marketing Module Types
 * TypeScript types and interfaces for marketing functionality
 */

import type {
  Campaign,
  CampaignType,
  CampaignStatus,
  ScheduleType,
} from '../schema/campaigns.schema';
import type { EmailTemplate } from '../schema/templates.schema';
import type { Lead, LeadStatus } from '../schema/leads.schema';
import type { CampaignSend, SendStatus } from '../schema/campaign-sends.schema';
import type { CampaignAnalytic } from '../schema/analytics.schema';
import type { LeadActivity, ActivityType } from '../schema/lead-activities.schema';

/**
 * Re-export schema types
 */
export type {
  Campaign,
  CampaignType,
  CampaignStatus,
  ScheduleType,
  EmailTemplate,
  Lead,
  LeadStatus,
  CampaignSend,
  SendStatus,
  CampaignAnalytic,
  LeadActivity,
  ActivityType,
};

/**
 * Target Audience Filter
 */
export interface TargetAudience {
  leadStatus?: LeadStatus[];
  minScore?: number;
  maxScore?: number;
  tags?: string[];
  source?: string[];
  dateRange?: {
    from: string;
    to: string;
  };
  customFilters?: Record<string, any>;
}

/**
 * Recurring Pattern
 */
export interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  dayOfMonth?: number; // 1-31
  endDate?: string;
}

/**
 * Template Variables Configuration
 */
export interface TemplateVariables {
  allowed: string[];
  defaults?: Record<string, string>;
  required?: string[];
}

/**
 * Campaign Creation Data
 */
export interface CreateCampaignData {
  name: string;
  description?: string;
  type: CampaignType;
  templateId?: string;
  targetAudience?: TargetAudience;
  scheduleType: ScheduleType;
  scheduledAt?: Date;
  recurringPattern?: RecurringPattern;
}

/**
 * Campaign Update Data
 */
export interface UpdateCampaignData {
  name?: string;
  description?: string;
  status?: CampaignStatus;
  targetAudience?: TargetAudience;
  scheduledAt?: Date;
  recurringPattern?: RecurringPattern;
}

/**
 * Campaign Filters
 */
export interface CampaignFilters {
  status?: CampaignStatus[];
  type?: CampaignType[];
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

/**
 * Lead Creation Data
 */
export interface CreateLeadData {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  source: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

/**
 * Lead Update Data
 */
export interface UpdateLeadData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  status?: LeadStatus;
  score?: number;
  tags?: string[];
  customFields?: Record<string, any>;
}

/**
 * Lead Filters
 */
export interface LeadFilters {
  status?: LeadStatus[];
  minScore?: number;
  maxScore?: number;
  tags?: string[];
  source?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

/**
 * Template Creation Data
 */
export interface CreateTemplateData {
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables?: TemplateVariables;
  category?: string;
}

/**
 * Template Update Data
 */
export interface UpdateTemplateData {
  name?: string;
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  variables?: TemplateVariables;
  category?: string;
  isActive?: boolean;
}

/**
 * Template Rendering Context
 */
export interface TemplateRenderContext {
  // Standard fields
  first_name?: string;
  last_name?: string;
  email?: string;
  company?: string;
  job_title?: string;
  // Links
  unsubscribe_link?: string;
  // Custom fields
  custom?: Record<string, any>;
  [key: string]: any;
}

/**
 * Campaign Analytics Response
 */
export interface CampaignAnalyticsResponse {
  campaignId: string;
  campaignName: string;
  status: CampaignStatus;
  startedAt?: Date;
  completedAt?: Date;
  totalSends: number;
  delivered: number;
  opened: number;
  uniqueOpens: number;
  clicked: number;
  uniqueClicks: number;
  bounced: number;
  unsubscribed: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  dailyMetrics?: Array<{
    date: string;
    totalSends: number;
    delivered: number;
    opened: number;
    clicked: number;
    openRate: number;
    clickRate: number;
  }>;
}

/**
 * Lead Source Stats
 */
export interface LeadSourceStats {
  source: string;
  count: number;
  percentage: number;
  avgScore: number;
  conversionRate: number;
}

/**
 * Conversion Funnel
 */
export interface ConversionFunnel {
  totalLeads: number;
  newLeads: number;
  contacted: number;
  qualified: number;
  converted: number;
  lost: number;
  conversionRate: number;
  stages: Array<{
    stage: LeadStatus;
    count: number;
    percentage: number;
  }>;
}

/**
 * Top Performing Campaign
 */
export interface TopCampaign {
  id: string;
  name: string;
  type: CampaignType;
  totalSends: number;
  openRate: number;
  clickRate: number;
  conversionRate?: number;
}

/**
 * Email Send Request
 */
export interface EmailSendRequest {
  to: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  metadata?: Record<string, any>;
}

/**
 * Email Send Result
 */
export interface EmailSendResult {
  success: boolean;
  sendId: string;
  providerId?: string;
  error?: string;
}

/**
 * CSV Import Result
 */
export interface CSVImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors?: Array<{
    row: number;
    email: string;
    error: string;
  }>;
}

/**
 * Lead Scoring Result
 */
export interface LeadScoringResult {
  leadId: string;
  oldScore: number;
  newScore: number;
  breakdown: {
    dataCompleteness: number;
    engagement: number;
    actions: number;
  };
}

/**
 * Date Range
 */
export interface DateRange {
  from: Date;
  to: Date;
}

/**
 * Pagination Options
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
