/**
 * Two-Factor Service (Auth)
 * Thin service to expose 2FA state to other modules without leaking schema details.
 */

import { db } from '@/db';
import { twoFactor } from '../schema/auth.schema';
import { eq } from 'drizzle-orm';

/**
 * Returns true if the user has 2FA enabled.
 */
export async function isTwoFactorEnabled(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: twoFactor.id })
    .from(twoFactor)
    .where(eq(twoFactor.userId, userId))
    .limit(1);

  return !!row;
}

