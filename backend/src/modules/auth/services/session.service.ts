/**
 * Session Service
 * Session-specific helpers (kept within Auth)
 */

import { db } from '@/db';
import { eq } from 'drizzle-orm';
import { sessions } from '../schema/auth.schema';

export async function setActiveOrganization(sessionId: string, tenantId: string): Promise<void> {
  await db
    .update(sessions)
    .set({ activeOrganizationId: tenantId, updatedAt: new Date() })
    .where(eq(sessions.id, sessionId));
}
