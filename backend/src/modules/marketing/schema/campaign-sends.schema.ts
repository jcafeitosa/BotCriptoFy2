/**
 * Campaign Sends Schema
 * Individual email sends per campaign per lead
 */

import { pgTable, uuid, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { campaigns } from './campaigns.schema';
import { leads } from './leads.schema';

/**
 * Send Status
 */
export type SendStatus = 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';

/**
 * Campaign Sends Table
 * Tracks individual email sends to leads
 */
export const campaignSends = pgTable(
  'campaign_sends',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    leadId: uuid('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),

    // Recipient Info
    email: varchar('email', { length: 255 }).notNull(),

    // Status
    status: varchar('status', { length: 20 }).notNull().default('pending').$type<SendStatus>(),

    // Timing
    sentAt: timestamp('sent_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    openedAt: timestamp('opened_at', { withTimezone: true }),
    clickedAt: timestamp('clicked_at', { withTimezone: true }),
    bouncedAt: timestamp('bounced_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),

    // Error Handling
    failureReason: text('failure_reason'),

    // Metadata
    metadata: jsonb('metadata').$type<{
      subject?: string;
      providerId?: string;
      providerResponse?: any;
      clickedLinks?: string[];
      userAgent?: string;
      ipAddress?: string;
    }>().default({}),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    campaignIdIdx: index('campaign_sends_campaign_id_idx').on(table.campaignId),
    leadIdIdx: index('campaign_sends_lead_id_idx').on(table.leadId),
    statusIdx: index('campaign_sends_status_idx').on(table.status),
    emailIdx: index('campaign_sends_email_idx').on(table.email),
    sentAtIdx: index('campaign_sends_sent_at_idx').on(table.sentAt),
    openedAtIdx: index('campaign_sends_opened_at_idx').on(table.openedAt),
  })
);

/**
 * Relations
 */
export const campaignSendsRelations = relations(campaignSends, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignSends.campaignId],
    references: [campaigns.id],
  }),
  lead: one(leads, {
    fields: [campaignSends.leadId],
    references: [leads.id],
  }),
}));

/**
 * Type Exports
 */
export type CampaignSend = typeof campaignSends.$inferSelect;
export type NewCampaignSend = typeof campaignSends.$inferInsert;
