/**
 * User Profile Schema
 * Extended user information for notifications and communication
 */

import { pgTable, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { users } from '../../auth/schema/auth.schema';

/**
 * User Profiles Table
 * Stores additional user contact information for notifications
 */
export const userProfiles = pgTable('user_profiles', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Phone number for SMS notifications (E.164 format)
  phone: text('phone'),
  phoneVerified: boolean('phone_verified').default(false),

  // Telegram chat ID for Telegram notifications
  telegramChatId: text('telegram_chat_id'),
  telegramUsername: text('telegram_username'),

  // Firebase Cloud Messaging tokens for push notifications
  // Stored as JSON array of device tokens
  deviceTokens: jsonb('device_tokens').$type<string[]>().default([]),

  // Preferences
  timezone: text('timezone').default('UTC'),
  language: text('language').default('en'),

  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Type exports - prefixed with Db to avoid conflict with UserProfile interface in user.types.ts
export type DbUserProfile = typeof userProfiles.$inferSelect;
export type NewDbUserProfile = typeof userProfiles.$inferInsert;
