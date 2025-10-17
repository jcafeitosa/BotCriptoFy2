/**
 * Notifications Schema
 * Tables for notification system with multi-channel support
 */

import { pgTable, text, uuid, timestamp, boolean, jsonb, time, index, integer } from 'drizzle-orm/pg-core';
import { users } from '../../auth/schema/auth.schema';
import { tenants } from '../../tenants/schema/tenants.schema';
import { departments } from '../../departments/schema/departments.schema';

/**
 * Notification Templates
 * Reusable templates for different types of notifications
 */
export const notificationTemplates = pgTable('notification_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  departmentId: uuid('department_id').references(() => departments.id), // Optional: templates can be department-specific
  templateKey: text('template_key').notNull(),
  templateName: text('template_name').notNull(),
  templateType: text('template_type').notNull(), // email, sms, push, in_app, telegram, webhook
  subject: text('subject'),
  body: text('body').notNull(),
  variables: jsonb('variables').$type<Record<string, any>>().default({}),
  isActive: boolean('is_active').default(true),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id),
  updatedBy: text('updated_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Notification Channels
 * Configuration for different notification channels
 */
export const notificationChannels = pgTable('notification_channels', {
  id: uuid('id').primaryKey().defaultRandom(),
  channelName: text('channel_name').notNull(),
  channelType: text('channel_type').notNull(), // email, sms, push, in_app, telegram, webhook, slack
  configuration: jsonb('configuration').$type<Record<string, any>>().notNull(),
  isActive: boolean('is_active').default(true),
  priority: text('priority').default('normal'), // low, normal, high
  retryPolicy: jsonb('retry_policy').$type<Record<string, any>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Notifications
 * Individual notification records
 */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    departmentId: uuid('department_id').references(() => departments.id), // Optional: tracks which department sent/relates to this notification
    templateId: uuid('template_id').references(() => notificationTemplates.id),
    channelId: uuid('channel_id').references(() => notificationChannels.id),
    notificationType: text('notification_type').notNull(),
    category: text('category').notNull(),
    priority: text('priority').notNull().default('normal'), // low, normal, high, urgent
    subject: text('subject'),
    content: text('content').notNull(),
    variables: jsonb('variables').$type<Record<string, any>>().default({}),
    status: text('status').notNull().default('pending'), // pending, sent, failed, read
    sentAt: timestamp('sent_at'),
    readAt: timestamp('read_at'),
    failureReason: text('failure_reason'),
    metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('notifications_user_id_idx').on(table.userId),
    tenantIdIdx: index('notifications_tenant_id_idx').on(table.tenantId),
    statusIdx: index('notifications_status_idx').on(table.status),
    priorityIdx: index('notifications_priority_idx').on(table.priority),
    createdAtIdx: index('notifications_created_at_idx').on(table.createdAt),
    userStatusIdx: index('notifications_user_status_idx').on(table.userId, table.status),
    tenantStatusIdx: index('notifications_tenant_status_idx').on(table.tenantId, table.status),
  })
);

/**
 * User Notification Preferences
 * Per-user settings for notification delivery
 */
export const userNotificationPreferences = pgTable('user_notification_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  notificationType: text('notification_type').notNull(),
  channelPreferences: jsonb('channel_preferences').$type<Record<string, boolean>>().notNull(),
  isEnabled: boolean('is_enabled').default(true),
  quietHoursStart: time('quiet_hours_start'),
  quietHoursEnd: time('quiet_hours_end'),
  timezone: text('timezone').default('UTC'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Notification Delivery Logs
 * Tracks each delivery attempt with provider responses and retry information
 */
export const notificationDeliveryLogs = pgTable(
  'notification_delivery_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    notificationId: uuid('notification_id')
      .notNull()
      .references(() => notifications.id, { onDelete: 'cascade' }),
    channelId: uuid('channel_id').references(() => notificationChannels.id),
    attemptNumber: integer('attempt_number').notNull().default(1),
    status: text('status').notNull(), // success, failed, pending, retrying
    providerName: text('provider_name'), // SendGrid, Firebase, Telegram, etc. (Twilio removed)
    providerMessageId: text('provider_message_id'), // External provider's message ID
    providerResponse: jsonb('provider_response').$type<Record<string, any>>(),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
    deliveredAt: timestamp('delivered_at'),
    nextRetryAt: timestamp('next_retry_at'),
    metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    notificationIdIdx: index('delivery_logs_notification_id_idx').on(table.notificationId),
    statusIdx: index('delivery_logs_status_idx').on(table.status),
    providerIdIdx: index('delivery_logs_provider_message_id_idx').on(table.providerMessageId),
    nextRetryIdx: index('delivery_logs_next_retry_idx').on(table.nextRetryAt),
    createdAtIdx: index('delivery_logs_created_at_idx').on(table.createdAt),
  })
);

/**
 * Notification Campaigns
 * Bulk and scheduled notification campaigns with targeting
 */
export const notificationCampaigns = pgTable(
  'notification_campaigns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id),
    departmentId: uuid('department_id').references(() => departments.id),
    templateId: uuid('template_id').references(() => notificationTemplates.id),
    campaignName: text('campaign_name').notNull(),
    campaignType: text('campaign_type').notNull(), // bulk, scheduled, triggered
    status: text('status').notNull().default('draft'), // draft, scheduled, active, paused, completed, cancelled
    priority: text('priority').notNull().default('normal'),
    targetAudience: jsonb('target_audience').$type<Record<string, any>>().notNull(), // Criteria for targeting users
    channels: jsonb('channels').$type<string[]>().notNull(), // [email, sms, push, etc.]
    content: jsonb('content').$type<Record<string, any>>().notNull(), // Template variables and content overrides
    scheduledAt: timestamp('scheduled_at'),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    totalRecipients: integer('total_recipients').default(0),
    sentCount: integer('sent_count').default(0),
    deliveredCount: integer('delivered_count').default(0),
    failedCount: integer('failed_count').default(0),
    readCount: integer('read_count').default(0),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id),
    updatedBy: text('updated_by').references(() => users.id),
    metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    tenantIdIdx: index('notification_campaigns_tenant_id_idx').on(table.tenantId),
    statusIdx: index('notification_campaigns_status_idx').on(table.status),
    scheduledAtIdx: index('notification_campaigns_scheduled_at_idx').on(table.scheduledAt),
    createdAtIdx: index('notification_campaigns_created_at_idx').on(table.createdAt),
    tenantStatusIdx: index('notification_campaigns_tenant_status_idx').on(table.tenantId, table.status),
  })
);

// Type exports
export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
export type NewNotificationTemplate = typeof notificationTemplates.$inferInsert;
export type NotificationChannel = typeof notificationChannels.$inferSelect;
export type NewNotificationChannel = typeof notificationChannels.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type UserNotificationPreference = typeof userNotificationPreferences.$inferSelect;
export type NewUserNotificationPreference = typeof userNotificationPreferences.$inferInsert;
export type NotificationDeliveryLog = typeof notificationDeliveryLogs.$inferSelect;
export type NewNotificationDeliveryLog = typeof notificationDeliveryLogs.$inferInsert;
export type NotificationCampaign = typeof notificationCampaigns.$inferSelect;
export type NewNotificationCampaign = typeof notificationCampaigns.$inferInsert;
