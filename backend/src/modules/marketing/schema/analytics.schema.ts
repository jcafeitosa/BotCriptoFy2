/**
 * Campaign Analytics Schema
 * Daily aggregated metrics per campaign
 */

import { pgTable, uuid, date, integer, decimal, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { campaigns } from './campaigns.schema';

/**
 * Campaign Analytics Table
 * Daily aggregated performance metrics
 */
export const campaignAnalytics = pgTable(
  'campaign_analytics',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),

    // Date
    date: date('date').notNull(),

    // Send Metrics
    totalSends: integer('total_sends').notNull().default(0),
    delivered: integer('delivered').notNull().default(0),
    bounced: integer('bounced').notNull().default(0),

    // Engagement Metrics
    opened: integer('opened').notNull().default(0),
    uniqueOpens: integer('unique_opens').notNull().default(0),
    clicked: integer('clicked').notNull().default(0),
    uniqueClicks: integer('unique_clicks').notNull().default(0),
    unsubscribed: integer('unsubscribed').notNull().default(0),

    // Calculated Rates (percentages)
    openRate: decimal('open_rate', { precision: 5, scale: 2 }).notNull().default('0.00'), // %
    clickRate: decimal('click_rate', { precision: 5, scale: 2 }).notNull().default('0.00'), // %
    bounceRate: decimal('bounce_rate', { precision: 5, scale: 2 }).notNull().default('0.00'), // %

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    campaignIdIdx: index('campaign_analytics_campaign_id_idx').on(table.campaignId),
    dateIdx: index('campaign_analytics_date_idx').on(table.date),
    campaignDateIdx: unique('campaign_analytics_campaign_date_unique').on(table.campaignId, table.date),
  })
);

/**
 * Relations
 */
export const campaignAnalyticsRelations = relations(campaignAnalytics, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignAnalytics.campaignId],
    references: [campaigns.id],
  }),
}));

/**
 * Type Exports
 */
export type CampaignAnalytic = typeof campaignAnalytics.$inferSelect;
export type NewCampaignAnalytic = typeof campaignAnalytics.$inferInsert;
