/**
 * User Profile Service
 * Functions to fetch user contact information for notifications
 */

import { db } from '@/db';
import { eq } from 'drizzle-orm';
import { users } from '../../auth/schema/auth.schema';
import { userProfiles } from '../schema/user-profile.schema';

export interface UserContactInfo {
  email: string | null;
  phone: string | null;
  telegramChatId: string | null;
  deviceTokens: string[];
}

/**
 * Get user email address
 * Fetches from users table
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);

  return user?.email || null;
}

/**
 * Get user phone number
 * Fetches from user_profiles table
 */
export async function getUserPhone(userId: string): Promise<string | null> {
  const [profile] = await db
    .select({ phone: userProfiles.phone })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  return profile?.phone || null;
}

/**
 * Get user Telegram chat ID
 * Fetches from user_profiles table
 */
export async function getUserTelegramChatId(userId: string): Promise<string | null> {
  const [profile] = await db
    .select({ telegramChatId: userProfiles.telegramChatId })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  return profile?.telegramChatId || null;
}

/**
 * Get user device tokens for push notifications
 * Fetches from user_profiles table
 */
export async function getUserDeviceTokens(userId: string): Promise<string[]> {
  const [profile] = await db
    .select({ deviceTokens: userProfiles.deviceTokens })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  return (profile?.deviceTokens as string[]) || [];
}

/**
 * Get all contact information for a user
 * Single query with LEFT JOIN for efficiency
 */
export async function getUserContactInfo(userId: string): Promise<UserContactInfo> {
  const [result] = await db
    .select({
      email: users.email,
      phone: userProfiles.phone,
      telegramChatId: userProfiles.telegramChatId,
      deviceTokens: userProfiles.deviceTokens,
    })
    .from(users)
    .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
    .where(eq(users.id, userId))
    .limit(1);

  if (!result) {
    return {
      email: null,
      phone: null,
      telegramChatId: null,
      deviceTokens: [],
    };
  }

  return {
    email: result.email || null,
    phone: result.phone || null,
    telegramChatId: result.telegramChatId || null,
    deviceTokens: (result.deviceTokens as string[]) || [],
  };
}

/**
 * Create or update user profile
 */
export async function upsertUserProfile(
  userId: string,
  data: {
    phone?: string;
    phoneVerified?: boolean;
    telegramChatId?: string;
    telegramUsername?: string;
    deviceTokens?: string[];
    timezone?: string;
    language?: string;
  }
) {
  const existing = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    // Update
    const [updated] = await db
      .update(userProfiles)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, userId))
      .returning();

    return updated;
  } else {
    // Insert
    const [created] = await db
      .insert(userProfiles)
      .values({
        userId,
        ...data,
      })
      .returning();

    return created;
  }
}

/**
 * Add device token to user profile
 */
export async function addDeviceToken(userId: string, deviceToken: string) {
  const existing = await db
    .select({ deviceTokens: userProfiles.deviceTokens })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    const tokens = (existing[0].deviceTokens as string[]) || [];

    // Add if not already present
    if (!tokens.includes(deviceToken)) {
      tokens.push(deviceToken);

      await db
        .update(userProfiles)
        .set({
          deviceTokens: tokens,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.userId, userId));
    }
  } else {
    // Create profile with device token
    await db.insert(userProfiles).values({
      userId,
      deviceTokens: [deviceToken],
    });
  }
}

/**
 * Remove device token from user profile
 */
export async function removeDeviceToken(userId: string, deviceToken: string) {
  const existing = await db
    .select({ deviceTokens: userProfiles.deviceTokens })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    const tokens = (existing[0].deviceTokens as string[]) || [];
    const filtered = tokens.filter((t) => t !== deviceToken);

    await db
      .update(userProfiles)
      .set({
        deviceTokens: filtered,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, userId));
  }
}
