/**
 * Tenant Membership Service
 * Centralizes membership utilities for multi-tenant
 */

import { db } from '@/db';
import { eq, and } from 'drizzle-orm';
import { tenantMembers } from '../schema/tenants.schema';

export async function getUserPrimaryTenantId(userId: string): Promise<string | null> {
  const [membership] = await db
    .select({ tenantId: tenantMembers.tenantId })
    .from(tenantMembers)
    .where(eq(tenantMembers.userId, userId))
    .limit(1);

  return membership?.tenantId || null;
}

export async function getUserTenantIds(userId: string): Promise<string[]> {
  const memberships = await db
    .select({ tenantId: tenantMembers.tenantId })
    .from(tenantMembers)
    .where(eq(tenantMembers.userId, userId));

  return memberships.map((m) => m.tenantId);
}

export async function userIsMemberOfTenant(userId: string, tenantId: string): Promise<boolean> {
  const [membership] = await db
    .select()
    .from(tenantMembers)
    .where(and(eq(tenantMembers.userId, userId), eq(tenantMembers.tenantId, tenantId)))
    .limit(1);

  return !!membership;
}

