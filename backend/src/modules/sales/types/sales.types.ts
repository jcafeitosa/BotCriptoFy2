/**
 * Sales Types
 * TypeScript interfaces and types for sales CRM
 */

import type {
  Contact,
  NewContact,
  ContactType,
  Address,
  Deal,
  NewDeal,
  DealStatus,
  ProductLineItem,
  PipelineStage,
  NewPipelineStage,
  Activity,
  NewActivity,
  ActivityType,
  ActivityStatus,
  Note,
  NewNote,
  SalesTarget,
  NewSalesTarget,
  TargetPeriod,
  SalesForecast,
  NewSalesForecast,
  ForecastPeriod,
  ForecastMethodology,
} from '../schema';

/**
 * Re-export schema types
 */
export type {
  Contact,
  NewContact,
  ContactType,
  Address,
  Deal,
  NewDeal,
  DealStatus,
  ProductLineItem,
  PipelineStage,
  NewPipelineStage,
  Activity,
  NewActivity,
  ActivityType,
  ActivityStatus,
  Note,
  NewNote,
  SalesTarget,
  NewSalesTarget,
  TargetPeriod,
  SalesForecast,
  NewSalesForecast,
  ForecastPeriod,
  ForecastMethodology,
};

/**
 * Contact Filters
 */
export interface ContactFilters {
  type?: ContactType;
  ownerId?: string;
  tags?: string[];
  search?: string; // Search in name, email, company
  limit?: number;
  offset?: number;
}

/**
 * Deal Filters
 */
export interface DealFilters {
  status?: DealStatus;
  stageId?: string;
  ownerId?: string;
  contactId?: string;
  minValue?: number;
  maxValue?: number;
  expectedCloseDateFrom?: Date;
  expectedCloseDateTo?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Activity Filters
 */
export interface ActivityFilters {
  type?: ActivityType;
  status?: ActivityStatus;
  ownerId?: string;
  contactId?: string;
  dealId?: string;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Pipeline View
 * Kanban-style pipeline visualization
 */
export interface PipelineView {
  stages: PipelineStageWithDeals[];
  totalPipelineValue: number;
  weightedValue: number;
  totalDeals: number;
}

/**
 * Pipeline Stage with Deals
 */
export interface PipelineStageWithDeals extends PipelineStage {
  deals: Deal[];
  totalValue: number;
  count: number;
}

/**
 * Contact Timeline
 */
export interface ContactTimeline {
  activities: Activity[];
  notes: Note[];
  deals: Deal[];
}

/**
 * Win Rate Metrics
 */
export interface WinRateMetrics {
  totalDeals: number;
  won: number;
  lost: number;
  winRate: number; // Percentage
  averageDealValue: number;
  averageSalesCycle: number; // Days
  averageTimeToClose: number; // Days
}

/**
 * Sales Cycle Analysis
 */
export interface SalesCycleAnalysis {
  averageDays: number;
  medianDays: number;
  shortestDeal: number;
  longestDeal: number;
  byStage: Record<string, number>;
}

/**
 * Forecast Result
 */
export interface ForecastResult {
  forecast: SalesForecast;
  breakdown: {
    openDeals: number;
    totalValue: number;
    weightedValue: number;
    conversionRate: number;
  };
  trends: {
    direction: 'up' | 'down' | 'stable';
    changePercentage: number;
  };
}

/**
 * User Performance
 */
export interface UserPerformance {
  userId: string;
  userName: string;
  targets: SalesTarget[];
  achieved: number;
  targetAmount: number;
  achievementRate: number;
  deals: {
    total: number;
    won: number;
    lost: number;
    open: number;
  };
  rank: number;
}

/**
 * Sales Analytics
 */
export interface SalesAnalytics {
  pipelineValue: number;
  weightedPipelineValue: number;
  totalDeals: number;
  winRate: number;
  averageDealSize: number;
  salesCycle: number;
  monthlyRecurringRevenue: number;
  topPerformers: UserPerformance[];
}

/**
 * Merge Contacts Request
 */
export interface MergeContactsRequest {
  sourceId: string;
  targetId: string;
}

/**
 * Move Deal Request
 */
export interface MoveDealRequest {
  stageId: string;
  probability?: number;
}

/**
 * Win Deal Request
 */
export interface WinDealRequest {
  closeDate: Date;
  actualValue?: number;
}

/**
 * Lose Deal Request
 */
export interface LoseDealRequest {
  reason: string;
}

/**
 * Complete Activity Request
 */
export interface CompleteActivityRequest {
  outcome: string;
  completedAt?: Date;
}

/**
 * Reorder Stages Request
 */
export interface ReorderStagesRequest {
  stageIds: string[];
}

/**
 * Date Range
 */
export interface DateRange {
  from: Date;
  to: Date;
}
