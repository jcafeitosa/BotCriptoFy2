/**
 * User Service
 * Business logic for user operations
 */

import { db } from '@/db';
import { users } from '../../auth/schema/auth.schema';
import { tenants, tenantMembers } from '../../tenants/schema/tenants.schema';
import { eq, and } from 'drizzle-orm';
import type { UserProfile, ProfileType, UserRole } from '../types/user.types';
import logger from '@/utils/logger';

/**
 * Get user profile
 * Fetches user profile with tenant membership info
 * Queries tenant_members table (the correct multi-tenant table)
 * @param userId - User ID
 * @param activeTenantId - Optional active tenant ID to use (for tenant switching)
 */
export async function getUserProfile(userId: string, activeTenantId?: string): Promise<UserProfile> {
  try {
    // Build where condition based on activeTenantId
    const whereCondition = activeTenantId
      ? and(eq(tenantMembers.userId, userId), eq(tenantMembers.tenantId, activeTenantId))
      : eq(tenantMembers.userId, userId);

    // Query tenant_members with JOIN to tenants and users tables
    const memberData = await db
      .select({
        // User info
        userId: users.id,
        name: users.name,
        email: users.email,
        emailVerified: users.emailVerified,
        image: users.image,
        // Tenant info
        tenantId: tenants.id,
        tenantName: tenants.name,
        tenantType: tenants.type,
        tenantStatus: tenants.status,
        // Member info
        role: tenantMembers.role,
        memberStatus: tenantMembers.status,
        permissions: tenantMembers.permissions,
        joinedAt: tenantMembers.joinedAt,
      })
      .from(tenantMembers)
      .innerJoin(tenants, eq(tenantMembers.tenantId, tenants.id))
      .innerJoin(users, eq(tenantMembers.userId, users.id))
      .where(whereCondition)
      .limit(1);

    // If user is a member of a tenant
    if (memberData.length > 0) {
      const data = memberData[0];

      // Map tenants.type → profileType
      // 'empresa' → 'company', 'trader' → 'trader', 'influencer' → 'influencer'
      const profileType: ProfileType =
        data.tenantType === 'empresa'
          ? 'company'
          : data.tenantType === 'trader'
            ? 'trader'
            : 'influencer';

      return {
        userId: data.userId,
        role: data.role as UserRole,
        profileType,
        isActive: data.memberStatus === 'active',
        // Additional fields
        tenantId: data.tenantId,
        tenantName: data.tenantName,
        tenantStatus: data.tenantStatus,
        name: data.name,
        email: data.email,
        emailVerified: data.emailVerified,
        image: data.image || undefined,
        permissions: typeof data.permissions === 'string'
          ? JSON.parse(data.permissions)
          : data.permissions
            ? (data.permissions as Record<string, any>)
            : {},
        joinedAt: data.joinedAt,
      };
    }

    // If user has no tenant membership, query basic user info
    const userData = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userData.length > 0) {
      const user = userData[0];

      // Default profile for users without tenant membership
      return {
        userId: user.id,
        role: 'viewer', // Default role for users without tenant
        profileType: 'trader', // Default profile type
        isActive: false, // Not active until assigned to a tenant
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image || undefined,
      };
    }

    // User not found - this shouldn't happen if auth is working
    throw new Error(`User ${userId} not found`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error('Error fetching user profile', {
      userId,
      error: errorMessage,
    });

    // Return minimal profile on error
    return {
      userId,
      role: 'viewer',
      profileType: 'trader',
      isActive: false,
      name: 'Unknown User',
      email: '',
      emailVerified: false,
    };
  }
}

/**
 * Get all tenants for a user
 * Returns list of all tenants where user is a member
 */
export async function getUserTenants(userId: string) {
  const userTenants = await db
    .select({
      tenantId: tenants.id,
      tenantName: tenants.name,
      tenantSlug: tenants.slug,
      tenantType: tenants.type,
      tenantStatus: tenants.status,
      role: tenantMembers.role,
      memberStatus: tenantMembers.status,
      joinedAt: tenantMembers.joinedAt,
    })
    .from(tenantMembers)
    .innerJoin(tenants, eq(tenantMembers.tenantId, tenants.id))
    .where(eq(tenantMembers.userId, userId))
    .orderBy(tenantMembers.joinedAt);

  return userTenants.map((t) => ({
    id: t.tenantId,
    name: t.tenantName,
    slug: t.tenantSlug,
    type: t.tenantType,
    status: t.tenantStatus,
    role: t.role,
    memberStatus: t.memberStatus,
    joinedAt: t.joinedAt,
    profileType: t.tenantType === 'empresa' ? 'company' : t.tenantType === 'trader' ? 'trader' : 'influencer',
  }));
}
