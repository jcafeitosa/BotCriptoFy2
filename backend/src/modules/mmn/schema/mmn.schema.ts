/**
 * MMN (Marketing Multi-Nível) Schema
 * Binary tree structure with spillover and multi-level commissions
 */

import { pgTable, uuid, varchar, text, decimal, boolean, timestamp, integer, jsonb, index, unique } from 'drizzle-orm/pg-core';
import { tenants } from '../../tenants/schema/tenants.schema';
import { users } from '../../auth/schema/auth.schema';
// import { subscriptionPlans } from '../../subscriptions/schema/subscription-plans.schema';

/**
 * MMN Tree Table
 * Stores the binary tree structure
 */
export const mmnTree: any = pgTable('mmn_tree', {
  // Primary Key
  id: uuid('id').primaryKey().defaultRandom(),

  // Foreign Keys
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),

  // Parent-Child Relationship
  parentId: uuid('parent_id').references(() => mmnTree.id, { onDelete: 'restrict' }),
  sponsorId: text('sponsor_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }), // Who invited this user

  // Position in Binary Tree
  position: varchar('position', { length: 10 }).notNull(), // 'left' or 'right'
  level: integer('level').notNull().default(1), // Tree depth level
  path: text('path').notNull(), // Hierarchical path (e.g., '1.2.3')

  // Left and Right Children
  leftChildId: uuid('left_child_id').references(() => mmnTree.id),
  rightChildId: uuid('right_child_id').references(() => mmnTree.id),

  // Status
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, inactive, suspended
  isQualified: boolean('is_qualified').notNull().default(false), // Qualification for commissions

  // Join Info
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  activatedAt: timestamp('activated_at', { withTimezone: true }),

  // Metadata
  metadata: jsonb('metadata').$type<Record<string, any>>(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => ({
  userIdIdx: index('mmn_tree_user_id_idx').on(table.userId),
  parentIdIdx: index('mmn_tree_parent_id_idx').on(table.parentId),
  sponsorIdIdx: index('mmn_tree_sponsor_id_idx').on(table.sponsorId),
  pathIdx: index('mmn_tree_path_idx').on(table.path),
  uniqueUserTenant: unique('mmn_tree_user_tenant_unique').on(table.userId, table.tenantId),
}));

/**
 * MMN Genealogy Table
 * Stores complete upline/downline relationships for fast queries
 */
export const mmnGenealogy = pgTable('mmn_genealogy', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Member and Ancestor
  memberId: uuid('member_id')
    .notNull()
    .references(() => mmnTree.id, { onDelete: 'cascade' }),
  ancestorId: uuid('ancestor_id')
    .notNull()
    .references(() => mmnTree.id, { onDelete: 'cascade' }),

  // Relationship
  level: integer('level').notNull(), // 1 = direct child, 2 = grandchild, etc.
  leg: varchar('leg', { length: 10 }), // 'left' or 'right' - which leg this member is under

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  memberIdIdx: index('mmn_genealogy_member_id_idx').on(table.memberId),
  ancestorIdIdx: index('mmn_genealogy_ancestor_id_idx').on(table.ancestorId),
  uniqueMemberAncestor: unique('mmn_genealogy_unique').on(table.memberId, table.ancestorId),
}));

/**
 * MMN Positions Table
 * Tracks available positions in the tree for spillover
 */
export const mmnPositions = pgTable('mmn_positions', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Parent Node
  parentId: uuid('parent_id')
    .notNull()
    .references(() => mmnTree.id, { onDelete: 'cascade' }),

  // Position Info
  position: varchar('position', { length: 10 }).notNull(), // 'left' or 'right'
  level: integer('level').notNull(),
  isOccupied: boolean('is_occupied').notNull().default(false),

  // Occupied By
  occupiedBy: uuid('occupied_by').references(() => mmnTree.id),
  occupiedAt: timestamp('occupied_at', { withTimezone: true }),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => ({
  parentIdIdx: index('mmn_positions_parent_id_idx').on(table.parentId),
  isOccupiedIdx: index('mmn_positions_is_occupied_idx').on(table.isOccupied),
  uniqueParentPosition: unique('mmn_positions_unique').on(table.parentId, table.position),
}));

/**
 * MMN Volumes Table
 * Tracks volume for each leg (left/right) for binary calculations
 */
export const mmnVolumes = pgTable('mmn_volumes', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Member
  memberId: uuid('member_id')
    .notNull()
    .references(() => mmnTree.id, { onDelete: 'cascade' }),

  // Volume by Leg
  leftVolume: decimal('left_volume', { precision: 12, scale: 2 }).notNull().default('0.00'),
  rightVolume: decimal('right_volume', { precision: 12, scale: 2 }).notNull().default('0.00'),
  personalVolume: decimal('personal_volume', { precision: 12, scale: 2 }).notNull().default('0.00'),
  totalVolume: decimal('total_volume', { precision: 12, scale: 2 }).notNull().default('0.00'),

  // Carried Forward (for binary balance)
  leftCarryForward: decimal('left_carry_forward', { precision: 12, scale: 2 }).notNull().default('0.00'),
  rightCarryForward: decimal('right_carry_forward', { precision: 12, scale: 2 }).notNull().default('0.00'),

  // Period
  period: varchar('period', { length: 20 }).notNull(), // 'weekly', 'monthly'
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),

  // Status
  isProcessed: boolean('is_processed').notNull().default(false),
  processedAt: timestamp('processed_at', { withTimezone: true }),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => ({
  memberIdIdx: index('mmn_volumes_member_id_idx').on(table.memberId),
  periodIdx: index('mmn_volumes_period_idx').on(table.period),
  isProcessedIdx: index('mmn_volumes_is_processed_idx').on(table.isProcessed),
}));

/**
 * MMN Commissions Table
 * Multi-level commission tracking
 */
export const mmnCommissions = pgTable('mmn_commissions', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Commission Receiver
  memberId: uuid('member_id')
    .notNull()
    .references(() => mmnTree.id, { onDelete: 'cascade' }),

  // Commission Source (who generated the sale)
  sourceId: uuid('source_id')
    .notNull()
    .references(() => mmnTree.id, { onDelete: 'cascade' }),

  // Commission Details
  type: varchar('type', { length: 50 }).notNull(), // 'binary', 'unilevel', 'matching', 'leadership'
  level: integer('level').notNull(), // Which level (1-10)
  leg: varchar('leg', { length: 10 }), // 'left', 'right', or null for unilevel

  // Financial
  volume: decimal('volume', { precision: 12, scale: 2 }).notNull(), // Sales volume
  rate: decimal('rate', { precision: 5, scale: 2 }).notNull(), // Commission rate %
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'),

  // Status
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, approved, paid, cancelled
  payoutId: uuid('payout_id'), // Reference to payout when paid

  // Period
  period: varchar('period', { length: 20 }).notNull(),
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),

  // Payment
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
  memberIdIdx: index('mmn_commissions_member_id_idx').on(table.memberId),
  sourceIdIdx: index('mmn_commissions_source_id_idx').on(table.sourceId),
  statusIdx: index('mmn_commissions_status_idx').on(table.status),
  periodIdx: index('mmn_commissions_period_idx').on(table.period),
}));

/**
 * MMN Ranks Table
 * Rank/qualification tracking
 */
export const mmnRanks = pgTable('mmn_ranks', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Member
  memberId: uuid('member_id')
    .notNull()
    .references(() => mmnTree.id, { onDelete: 'cascade' }),

  // Rank Info
  rankName: varchar('rank_name', { length: 50 }).notNull(), // Distributor, Bronze, Silver, Gold, Diamond
  rankLevel: integer('rank_level').notNull(), // 1-10
  previousRank: varchar('previous_rank', { length: 50 }),

  // Achievement
  achievedAt: timestamp('achieved_at', { withTimezone: true }).notNull().defaultNow(),

  // Requirements Met
  requirements: jsonb('requirements').$type<{
    personalSales?: number;
    teamSales?: number;
    activeDownline?: number;
    leftLegVolume?: number;
    rightLegVolume?: number;
    qualifiedLegs?: number;
  }>(),

  // Bonuses
  achievementBonus: decimal('achievement_bonus', { precision: 10, scale: 2 }),
  monthlyBonus: decimal('monthly_bonus', { precision: 10, scale: 2 }),

  // Status
  isActive: boolean('is_active').notNull().default(true),
  lostAt: timestamp('lost_at', { withTimezone: true }),

  // Metadata
  metadata: jsonb('metadata').$type<Record<string, any>>(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => ({
  memberIdIdx: index('mmn_ranks_member_id_idx').on(table.memberId),
  rankNameIdx: index('mmn_ranks_rank_name_idx').on(table.rankName),
  isActiveIdx: index('mmn_ranks_is_active_idx').on(table.isActive),
}));

/**
 * MMN Payouts Table
 * Payout transactions for MMN commissions
 */
export const mmnPayouts = pgTable('mmn_payouts', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Member
  memberId: uuid('member_id')
    .notNull()
    .references(() => mmnTree.id, { onDelete: 'cascade' }),

  // Payout Details
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('BRL'),
  method: varchar('method', { length: 50 }).notNull(), // stripe, bank_transfer, pix

  // Commission IDs included
  commissionIds: jsonb('commission_ids').$type<string[]>().notNull(),

  // Stripe Integration
  stripeTransferId: varchar('stripe_transfer_id', { length: 255 }),
  stripeAccountId: varchar('stripe_account_id', { length: 255 }),

  // Bank Info
  bankInfo: jsonb('bank_info').$type<{
    bankName?: string;
    accountNumber?: string;
    routingNumber?: string;
    pixKey?: string;
  }>(),

  // Status
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  failedAt: timestamp('failed_at', { withTimezone: true }),
  failureReason: text('failure_reason'),

  // Fees
  fee: decimal('fee', { precision: 10, scale: 2 }).default('0.00'),
  netAmount: decimal('net_amount', { precision: 12, scale: 2 }).notNull(),

  // Notes
  notes: text('notes'),

  // Metadata
  metadata: jsonb('metadata').$type<Record<string, any>>(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => ({
  memberIdIdx: index('mmn_payouts_member_id_idx').on(table.memberId),
  statusIdx: index('mmn_payouts_status_idx').on(table.status),
}));

/**
 * MMN Config Table
 * System configuration for MMN plan
 */
export const mmnConfig = pgTable('mmn_config', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Tenant
  tenantId: text('tenant_id')
    .notNull()
    .unique()
    .references(() => tenants.id, { onDelete: 'cascade' }),

  // Binary Plan Configuration
  binaryCommissionRate: decimal('binary_commission_rate', { precision: 5, scale: 2 }).notNull().default('10.00'),
  maxPayoutPercentage: decimal('max_payout_percentage', { precision: 5, scale: 2 }).default('50.00'),
  weakerLegPercentage: decimal('weaker_leg_percentage', { precision: 5, scale: 2 }).default('100.00'),

  // Unilevel Configuration
  unilevelLevels: integer('unilevel_levels').notNull().default(10),
  unilevelRates: jsonb('unilevel_rates').$type<number[]>().default([5, 4, 3, 2, 2, 1, 1, 1, 1, 1]),

  // Qualification
  personalSalesRequired: decimal('personal_sales_required', { precision: 10, scale: 2 }).default('100.00'),
  minimumActiveDownline: integer('minimum_active_downline').default(2),

  // Spillover Settings
  spilloverEnabled: boolean('spillover_enabled').notNull().default(true),
  spilloverStrategy: varchar('spillover_strategy', { length: 20 }).default('weaker_leg'), // weaker_leg, balanced, manual

  // Payment Settings
  minimumPayout: decimal('minimum_payout', { precision: 10, scale: 2 }).default('50.00'),
  paymentFrequency: varchar('payment_frequency', { length: 20 }).default('weekly'), // weekly, bi-weekly, monthly

  // Active Status
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

// Export types
export type MmnTree = typeof mmnTree.$inferSelect;
export type NewMmnTree = typeof mmnTree.$inferInsert;

export type MmnGenealogy = typeof mmnGenealogy.$inferSelect;
export type NewMmnGenealogy = typeof mmnGenealogy.$inferInsert;

export type MmnPosition = typeof mmnPositions.$inferSelect;
export type NewMmnPosition = typeof mmnPositions.$inferInsert;

export type MmnVolume = typeof mmnVolumes.$inferSelect;
export type NewMmnVolume = typeof mmnVolumes.$inferInsert;

export type MmnCommission = typeof mmnCommissions.$inferSelect;
export type NewMmnCommission = typeof mmnCommissions.$inferInsert;

export type MmnRank = typeof mmnRanks.$inferSelect;
export type NewMmnRank = typeof mmnRanks.$inferInsert;

export type MmnPayout = typeof mmnPayouts.$inferSelect;
export type NewMmnPayout = typeof mmnPayouts.$inferInsert;

export type MmnConfig = typeof mmnConfig.$inferSelect;
export type NewMmnConfig = typeof mmnConfig.$inferInsert;
