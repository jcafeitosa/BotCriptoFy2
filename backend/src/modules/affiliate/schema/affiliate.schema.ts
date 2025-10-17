/**
 * Affiliate System Schema
 * Complete affiliate marketing system with tracking, commissions, and payouts
 */

import { pgTable, uuid, varchar, text, decimal, boolean, timestamp, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { tenants } from '../../tenants/schema/tenants.schema';
import { users } from '../../auth/schema/auth.schema';
import { subscriptionPlans } from '../../subscriptions/schema/subscription-plans.schema';

/**
 * Affiliate Profiles Table
 * Stores affiliate account information
 */
export const affiliateProfiles = pgTable('affiliate_profiles', {
  // Primary Key
  id: uuid('id').primaryKey().defaultRandom(),

  // Foreign Keys
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),

  // Affiliate Info
  affiliateCode: varchar('affiliate_code', { length: 20 }).notNull().unique(), // e.g., "AFF-ABC123"
  referralLink: text('referral_link').notNull(), // Full URL with tracking

  // Status
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, active, suspended, inactive
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  approvedBy: text('approved_by').references(() => users.id),

  // Tier System
  tierId: uuid('tier_id').references(() => affiliateTiers.id),
  tierName: varchar('tier_name', { length: 50 }).default('Bronze'), // Bronze, Silver, Gold, Platinum

  // Performance Metrics
  totalClicks: integer('total_clicks').notNull().default(0),
  totalSignups: integer('total_signups').notNull().default(0),
  totalConversions: integer('total_conversions').notNull().default(0),
  conversionRate: decimal('conversion_rate', { precision: 5, scale: 2 }).default('0.00'), // percentage

  // Financial
  totalEarned: decimal('total_earned', { precision: 12, scale: 2 }).notNull().default('0.00'),
  totalPaid: decimal('total_paid', { precision: 12, scale: 2 }).notNull().default('0.00'),
  pendingBalance: decimal('pending_balance', { precision: 12, scale: 2 }).notNull().default('0.00'),
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'),

  // Payout Info
  payoutMethod: varchar('payout_method', { length: 50 }).default('stripe'), // stripe, bank_transfer, pix
  stripeAccountId: varchar('stripe_account_id', { length: 255 }), // Stripe Connect account
  payoutEmail: varchar('payout_email', { length: 255 }),
  payoutMinimum: decimal('payout_minimum', { precision: 10, scale: 2 }).default('100.00'),

  // Contact Info
  phoneNumber: varchar('phone_number', { length: 50 }),
  company: varchar('company', { length: 255 }),
  website: varchar('website', { length: 255 }),

  // Social Media
  socialMedia: jsonb('social_media').$type<{
    instagram?: string;
    twitter?: string;
    youtube?: string;
    tiktok?: string;
    linkedin?: string;
  }>(),

  // Marketing Info
  audienceSize: integer('audience_size').default(0),
  niche: varchar('niche', { length: 100 }), // crypto, trading, finance, tech, etc.
  bio: text('bio'),

  // Terms & Compliance
  acceptedTermsAt: timestamp('accepted_terms_at', { withTimezone: true }),
  taxId: varchar('tax_id', { length: 50 }), // CPF/CNPJ for Brazilian affiliates

  // Metadata
  metadata: jsonb('metadata').$type<Record<string, any>>(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => ({
  userIdIdx: index('affiliate_profiles_user_id_idx').on(table.userId),
  tenantIdIdx: index('affiliate_profiles_tenant_id_idx').on(table.tenantId),
  statusIdx: index('affiliate_profiles_status_idx').on(table.status),
  affiliateCodeIdx: index('affiliate_profiles_code_idx').on(table.affiliateCode),
}));

/**
 * Affiliate Referrals Table
 * Tracks referred users and their relationship to affiliates
 */
export const affiliateReferrals = pgTable('affiliate_referrals', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Foreign Keys
  affiliateId: uuid('affiliate_id')
    .notNull()
    .references(() => affiliateProfiles.id, { onDelete: 'cascade' }),
  referredUserId: text('referred_user_id').references(() => users.id, { onDelete: 'set null' }),

  // Tracking
  referralCode: varchar('referral_code', { length: 20 }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  refererUrl: text('referer_url'),

  // UTM Parameters
  utmSource: varchar('utm_source', { length: 100 }),
  utmMedium: varchar('utm_medium', { length: 100 }),
  utmCampaign: varchar('utm_campaign', { length: 100 }),
  utmContent: varchar('utm_content', { length: 100 }),
  utmTerm: varchar('utm_term', { length: 100 }),

  // Status
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, signed_up, converted, churned
  signedUpAt: timestamp('signed_up_at', { withTimezone: true }),
  convertedAt: timestamp('converted_at', { withTimezone: true }),

  // Conversion Info
  subscriptionPlanId: uuid('subscription_plan_id').references(() => subscriptionPlans.id),
  firstPaymentAmount: decimal('first_payment_amount', { precision: 10, scale: 2 }),

  // Metadata
  metadata: jsonb('metadata').$type<Record<string, any>>(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => ({
  affiliateIdIdx: index('affiliate_referrals_affiliate_id_idx').on(table.affiliateId),
  referredUserIdIdx: index('affiliate_referrals_user_id_idx').on(table.referredUserId),
  statusIdx: index('affiliate_referrals_status_idx').on(table.status),
}));

/**
 * Affiliate Clicks Table
 * Tracks every click on affiliate links
 */
export const affiliateClicks = pgTable('affiliate_clicks', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Foreign Keys
  affiliateId: uuid('affiliate_id')
    .notNull()
    .references(() => affiliateProfiles.id, { onDelete: 'cascade' }),
  referralId: uuid('referral_id').references(() => affiliateReferrals.id, { onDelete: 'set null' }),

  // Tracking Data
  affiliateCode: varchar('affiliate_code', { length: 20 }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  refererUrl: text('referer_url'),
  landingPage: text('landing_page'),

  // Geolocation (can be enriched later)
  country: varchar('country', { length: 2 }),
  city: varchar('city', { length: 100 }),

  // UTM Parameters
  utmSource: varchar('utm_source', { length: 100 }),
  utmMedium: varchar('utm_medium', { length: 100 }),
  utmCampaign: varchar('utm_campaign', { length: 100 }),

  // Device Info
  deviceType: varchar('device_type', { length: 20 }), // desktop, mobile, tablet
  browser: varchar('browser', { length: 50 }),
  os: varchar('os', { length: 50 }),

  // Conversion Tracking
  converted: boolean('converted').notNull().default(false),
  convertedAt: timestamp('converted_at', { withTimezone: true }),

  // Metadata
  metadata: jsonb('metadata').$type<Record<string, any>>(),

  // Timestamp
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  affiliateIdIdx: index('affiliate_clicks_affiliate_id_idx').on(table.affiliateId),
  createdAtIdx: index('affiliate_clicks_created_at_idx').on(table.createdAt),
  convertedIdx: index('affiliate_clicks_converted_idx').on(table.converted),
}));

/**
 * Affiliate Conversions Table
 * Tracks successful conversions (signup → paid customer)
 */
export const affiliateConversions = pgTable('affiliate_conversions', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Foreign Keys
  affiliateId: uuid('affiliate_id')
    .notNull()
    .references(() => affiliateProfiles.id, { onDelete: 'cascade' }),
  referralId: uuid('referral_id')
    .notNull()
    .references(() => affiliateReferrals.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Conversion Details
  conversionType: varchar('conversion_type', { length: 50 }).notNull(), // first_payment, subscription, upgrade
  subscriptionPlanId: uuid('subscription_plan_id').references(() => subscriptionPlans.id),

  // Financial
  orderValue: decimal('order_value', { precision: 10, scale: 2 }).notNull(),
  commissionAmount: decimal('commission_amount', { precision: 10, scale: 2 }).notNull(),
  commissionRate: decimal('commission_rate', { precision: 5, scale: 2 }).notNull(), // percentage
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'),

  // Stripe Integration
  stripePaymentId: varchar('stripe_payment_id', { length: 255 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),

  // Status
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, approved, paid, refunded
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  paidAt: timestamp('paid_at', { withTimezone: true }),

  // Metadata
  metadata: jsonb('metadata').$type<Record<string, any>>(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => ({
  affiliateIdIdx: index('affiliate_conversions_affiliate_id_idx').on(table.affiliateId),
  userIdIdx: index('affiliate_conversions_user_id_idx').on(table.userId),
  statusIdx: index('affiliate_conversions_status_idx').on(table.status),
  createdAtIdx: index('affiliate_conversions_created_at_idx').on(table.createdAt),
}));

/**
 * Affiliate Commissions Table
 * Calculated commissions for affiliates
 */
export const affiliateCommissions = pgTable('affiliate_commissions', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Foreign Keys
  affiliateId: uuid('affiliate_id')
    .notNull()
    .references(() => affiliateProfiles.id, { onDelete: 'cascade' }),
  conversionId: uuid('conversion_id')
    .notNull()
    .references(() => affiliateConversions.id, { onDelete: 'cascade' }),

  // Commission Details
  type: varchar('type', { length: 50 }).notNull(), // percentage, fixed, bonus, tier_bonus
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  rate: decimal('rate', { precision: 5, scale: 2 }), // percentage rate if applicable
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'),

  // Payment Status
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, approved, paid, held, cancelled
  payoutId: uuid('payout_id').references(() => affiliatePayouts.id, { onDelete: 'set null' }),
  paidAt: timestamp('paid_at', { withTimezone: true }),

  // Holding Period (anti-fraud)
  holdUntil: timestamp('hold_until', { withTimezone: true }),
  releaseReason: text('release_reason'),

  // Metadata
  metadata: jsonb('metadata').$type<Record<string, any>>(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => ({
  affiliateIdIdx: index('affiliate_commissions_affiliate_id_idx').on(table.affiliateId),
  statusIdx: index('affiliate_commissions_status_idx').on(table.status),
  payoutIdIdx: index('affiliate_commissions_payout_id_idx').on(table.payoutId),
}));

/**
 * Affiliate Payouts Table
 * Tracks payout transactions to affiliates
 */
export const affiliatePayouts = pgTable('affiliate_payouts', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Foreign Keys
  affiliateId: uuid('affiliate_id')
    .notNull()
    .references(() => affiliateProfiles.id, { onDelete: 'cascade' }),

  // Payout Details
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'),
  method: varchar('method', { length: 50 }).notNull(), // stripe, bank_transfer, pix

  // Stripe Integration
  stripeTransferId: varchar('stripe_transfer_id', { length: 255 }),
  stripeAccountId: varchar('stripe_account_id', { length: 255 }),

  // Bank Transfer Info
  bankInfo: jsonb('bank_info').$type<{
    bankName?: string;
    accountNumber?: string;
    routingNumber?: string;
    pixKey?: string;
  }>(),

  // Status
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, processing, completed, failed, cancelled
  processedAt: timestamp('processed_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  failedAt: timestamp('failed_at', { withTimezone: true }),
  failureReason: text('failure_reason'),

  // Commission IDs (JSON array of commission IDs included in this payout)
  commissionIds: jsonb('commission_ids').$type<string[]>().notNull(),

  // Fees
  fee: decimal('fee', { precision: 10, scale: 2 }).default('0.00'),
  netAmount: decimal('net_amount', { precision: 12, scale: 2 }).notNull(),

  // Notes
  notes: text('notes'),
  internalNotes: text('internal_notes'),

  // Metadata
  metadata: jsonb('metadata').$type<Record<string, any>>(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => ({
  affiliateIdIdx: index('affiliate_payouts_affiliate_id_idx').on(table.affiliateId),
  statusIdx: index('affiliate_payouts_status_idx').on(table.status),
  createdAtIdx: index('affiliate_payouts_created_at_idx').on(table.createdAt),
}));

/**
 * Affiliate Tiers Table
 * Defines tier levels and benefits
 */
export const affiliateTiers = pgTable('affiliate_tiers', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Tier Info
  name: varchar('name', { length: 50 }).notNull().unique(), // Bronze, Silver, Gold, Platinum
  level: integer('level').notNull().unique(), // 1, 2, 3, 4
  description: text('description'),

  // Requirements
  minConversions: integer('min_conversions').notNull().default(0),
  minRevenue: decimal('min_revenue', { precision: 10, scale: 2 }).notNull().default('0.00'),

  // Benefits
  commissionRate: decimal('commission_rate', { precision: 5, scale: 2 }).notNull(), // base percentage
  bonusRate: decimal('bonus_rate', { precision: 5, scale: 2 }).default('0.00'), // extra bonus

  // Features
  features: jsonb('features').$type<{
    prioritySupport?: boolean;
    customLinks?: boolean;
    advancedAnalytics?: boolean;
    dedicatedManager?: boolean;
    earlyAccess?: boolean;
  }>(),

  // Display
  color: varchar('color', { length: 20 }).notNull(), // hex color for UI
  icon: varchar('icon', { length: 50 }),
  sortOrder: integer('sort_order').notNull().default(0),

  // Status
  isActive: boolean('is_active').notNull().default(true),

  // Metadata
  metadata: jsonb('metadata').$type<Record<string, any>>(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/**
 * Affiliate Goals Table
 * Tracks affiliate goals and bonuses
 */
export const affiliateGoals = pgTable('affiliate_goals', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Foreign Keys
  affiliateId: uuid('affiliate_id')
    .notNull()
    .references(() => affiliateProfiles.id, { onDelete: 'cascade' }),

  // Goal Details
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull(), // conversions, revenue, signups

  // Target
  targetValue: decimal('target_value', { precision: 12, scale: 2 }).notNull(),
  currentValue: decimal('current_value', { precision: 12, scale: 2 }).notNull().default('0.00'),
  progress: decimal('progress', { precision: 5, scale: 2 }).notNull().default('0.00'), // percentage

  // Period
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }).notNull(),

  // Reward
  rewardType: varchar('reward_type', { length: 50 }).notNull(), // bonus, tier_upgrade, prize
  rewardAmount: decimal('reward_amount', { precision: 10, scale: 2 }),
  rewardDescription: text('reward_description'),

  // Status
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, completed, failed, cancelled
  completedAt: timestamp('completed_at', { withTimezone: true }),
  rewardPaidAt: timestamp('reward_paid_at', { withTimezone: true }),

  // Metadata
  metadata: jsonb('metadata').$type<Record<string, any>>(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => ({
  affiliateIdIdx: index('affiliate_goals_affiliate_id_idx').on(table.affiliateId),
  statusIdx: index('affiliate_goals_status_idx').on(table.status),
  endDateIdx: index('affiliate_goals_end_date_idx').on(table.endDate),
}));

// Export types
export type AffiliateProfile = typeof affiliateProfiles.$inferSelect;
export type NewAffiliateProfile = typeof affiliateProfiles.$inferInsert;

export type AffiliateReferral = typeof affiliateReferrals.$inferSelect;
export type NewAffiliateReferral = typeof affiliateReferrals.$inferInsert;

export type AffiliateClick = typeof affiliateClicks.$inferSelect;
export type NewAffiliateClick = typeof affiliateClicks.$inferInsert;

export type AffiliateConversion = typeof affiliateConversions.$inferSelect;
export type NewAffiliateConversion = typeof affiliateConversions.$inferInsert;

export type AffiliateCommission = typeof affiliateCommissions.$inferSelect;
export type NewAffiliateCommission = typeof affiliateCommissions.$inferInsert;

export type AffiliatePayout = typeof affiliatePayouts.$inferSelect;
export type NewAffiliatePayout = typeof affiliatePayouts.$inferInsert;

export type AffiliateTier = typeof affiliateTiers.$inferSelect;
export type NewAffiliateTier = typeof affiliateTiers.$inferInsert;

export type AffiliateGoal = typeof affiliateGoals.$inferSelect;
export type NewAffiliateGoal = typeof affiliateGoals.$inferInsert;
