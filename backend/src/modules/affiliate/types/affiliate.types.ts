/**
 * Affiliate System Types
 * TypeScript types and interfaces for affiliate module
 */

import type {
  AffiliateProfile,
  AffiliateReferral,
  AffiliateClick,
  AffiliateConversion,
  AffiliateCommission,
  AffiliatePayout,
  AffiliateTier,
  AffiliateGoal,
} from '../schema/affiliate.schema';

/**
 * Affiliate Status
 */
export type AffiliateStatus = 'pending' | 'active' | 'suspended' | 'inactive';

/**
 * Referral Status
 */
export type ReferralStatus = 'pending' | 'signed_up' | 'converted' | 'churned';

/**
 * Conversion Type
 */
export type ConversionType = 'first_payment' | 'subscription' | 'upgrade' | 'renewal';

/**
 * Commission Type
 */
export type CommissionType = 'percentage' | 'fixed' | 'bonus' | 'tier_bonus';

/**
 * Commission Status
 */
export type CommissionStatus = 'pending' | 'approved' | 'paid' | 'held' | 'cancelled';

/**
 * Payout Method
 */
export type PayoutMethod = 'stripe' | 'bank_transfer' | 'pix';

/**
 * Payout Status
 */
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

/**
 * Goal Type
 */
export type GoalType = 'conversions' | 'revenue' | 'signups' | 'clicks';

/**
 * Goal Status
 */
export type GoalStatus = 'active' | 'completed' | 'failed' | 'cancelled';

/**
 * Create Affiliate Profile Data
 */
export interface CreateAffiliateData {
  userId: string;
  tenantId: string;
  phoneNumber?: string;
  company?: string;
  website?: string;
  socialMedia?: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    tiktok?: string;
    linkedin?: string;
  };
  audienceSize?: number;
  niche?: string;
  bio?: string;
  payoutMethod?: PayoutMethod;
  payoutEmail?: string;
  taxId?: string;
}

/**
 * Update Affiliate Profile Data
 */
export interface UpdateAffiliateData {
  phoneNumber?: string;
  company?: string;
  website?: string;
  socialMedia?: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    tiktok?: string;
    linkedin?: string;
  };
  audienceSize?: number;
  niche?: string;
  bio?: string;
  payoutMethod?: PayoutMethod;
  payoutEmail?: string;
  payoutMinimum?: number;
  taxId?: string;
  // Admin-only fields
  tierId?: string;
  tierName?: string;
}

/**
 * Track Click Data
 */
export interface TrackClickData {
  affiliateCode: string;
  ipAddress?: string;
  userAgent?: string;
  refererUrl?: string;
  landingPage?: string;
  country?: string;
  city?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  os?: string;
}

/**
 * Create Referral Data
 */
export interface CreateReferralData {
  affiliateCode: string;
  referredUserId?: string;
  ipAddress?: string;
  userAgent?: string;
  refererUrl?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
}

/**
 * Create Conversion Data
 */
export interface CreateConversionData {
  affiliateId: string;
  referralId: string;
  userId: string;
  conversionType: ConversionType;
  subscriptionPlanId?: string;
  orderValue: number;
  commissionRate: number;
  stripePaymentId?: string;
  stripeSubscriptionId?: string;
}

/**
 * Request Payout Data
 */
export interface RequestPayoutData {
  amount: number;
  method: PayoutMethod;
  bankInfo?: {
    bankName?: string;
    accountNumber?: string;
    routingNumber?: string;
    pixKey?: string;
  };
  notes?: string;
}

/**
 * Create Goal Data
 */
export interface CreateGoalData {
  affiliateId: string;
  name: string;
  description?: string;
  type: GoalType;
  targetValue: number;
  startDate: Date;
  endDate: Date;
  rewardType: 'bonus' | 'tier_upgrade' | 'prize';
  rewardAmount?: number;
  rewardDescription?: string;
}

/**
 * Affiliate Statistics
 */
export interface AffiliateStats {
  totalClicks: number;
  totalSignups: number;
  totalConversions: number;
  conversionRate: number;
  totalEarned: number;
  totalPaid: number;
  pendingBalance: number;
  averageOrderValue: number;
  topReferrals: Array<{
    userId: string;
    userName: string;
    orderValue: number;
    convertedAt: Date;
  }>;
  clicksBySource: Record<string, number>;
  conversionsByMonth: Array<{
    month: string;
    conversions: number;
    revenue: number;
  }>;
}

/**
 * Affiliate Filters
 */
export interface AffiliateFilters {
  status?: AffiliateStatus[];
  tierName?: string[];
  minEarned?: number;
  maxEarned?: number;
  minConversions?: number;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string; // Search by name, email, company
}

/**
 * Referral Filters
 */
export interface ReferralFilters {
  affiliateId?: string;
  status?: ReferralStatus[];
  dateFrom?: Date;
  dateTo?: Date;
  utmSource?: string;
  utmCampaign?: string;
}

/**
 * Commission Filters
 */
export interface CommissionFilters {
  affiliateId?: string;
  status?: CommissionStatus[];
  type?: CommissionType[];
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Payout Filters
 */
export interface PayoutFilters {
  affiliateId?: string;
  status?: PayoutStatus[];
  method?: PayoutMethod[];
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: number;
  maxAmount?: number;
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
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Commission Calculation Result
 */
export interface CommissionCalculation {
  commissionAmount: number;
  commissionRate: number;
  type: CommissionType;
  bonusAmount?: number;
  tierBonus?: number;
  totalAmount: number;
}

/**
 * Analytics Period
 */
export type AnalyticsPeriod = 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month' | 'this_year' | 'custom';

/**
 * Analytics Data
 */
export interface AnalyticsData {
  period: AnalyticsPeriod;
  startDate: Date;
  endDate: Date;
  metrics: {
    clicks: number;
    signups: number;
    conversions: number;
    revenue: number;
    commissions: number;
    averageOrderValue: number;
    conversionRate: number;
    clickToSignupRate: number;
    signupToConversionRate: number;
  };
  charts: {
    clicksOverTime: Array<{ date: string; clicks: number }>;
    conversionsOverTime: Array<{ date: string; conversions: number; revenue: number }>;
    topSources: Array<{ source: string; clicks: number; conversions: number }>;
    deviceBreakdown: Array<{ device: string; count: number; percentage: number }>;
  };
}

/**
 * Leaderboard Entry
 */
export interface LeaderboardEntry {
  rank: number;
  affiliateId: string;
  affiliateName: string;
  affiliateCode: string;
  tierName: string;
  conversions: number;
  revenue: number;
  commissions: number;
}

/**
 * Tier Upgrade Result
 */
export interface TierUpgradeResult {
  upgraded: boolean;
  previousTier: string | null;
  newTier: string;
  tierLevel: number;
  benefits: {
    commissionRate: number;
    bonusRate: number;
    features: Record<string, boolean>;
  };
}

/**
 * Affiliate Dashboard Data
 */
export interface AffiliateDashboard {
  profile: AffiliateProfile;
  stats: AffiliateStats;
  recentConversions: AffiliateConversion[];
  activeGoals: AffiliateGoal[];
  tier: AffiliateTier | null;
  nextTier: AffiliateTier | null;
  progressToNextTier: number;
  pendingCommissions: AffiliateCommission[];
  recentPayouts: AffiliatePayout[];
}

/**
 * Export all types
 */
export type {
  AffiliateProfile,
  AffiliateReferral,
  AffiliateClick,
  AffiliateConversion,
  AffiliateCommission,
  AffiliatePayout,
  AffiliateTier,
  AffiliateGoal,
};
