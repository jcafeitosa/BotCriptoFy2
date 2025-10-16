/**
 * Session Service
 * Helper functions for session middleware to fetch user roles and tenant memberships
 */

import { db } from '@/db';
import { eq, and } from 'drizzle-orm';
import { rbacUserRoles } from '../../security/schema/security.schema';
import { roles } from '../../security/schema/security.schema';
import { tenantMembers } from '../../tenants/schema/tenants.schema';

/**
 * Get primary role for a user
 * Returns the highest level role the user has
 */
export async function getUserPrimaryRole(userId: string): Promise<string | null> {
  // Get all roles for user ordered by level (super_admin > admin > manager > user > viewer)
  const userRoles = await db
    .select({
      roleName: roles.name,
      roleLevel: roles.level,
    })
    .from(rbacUserRoles)
    .innerJoin(roles, eq(roles.id, rbacUserRoles.roleId))
    .where(eq(rbacUserRoles.userId, userId));

  if (userRoles.length === 0) {
    return null;
  }

  // Priority order (highest first)
  const levelPriority: Record<string, number> = {
    super_admin: 5,
    admin: 4,
    manager: 3,
    user: 2,
    viewer: 1,
  };

  // Sort by level and return highest
  const sortedRoles = userRoles.sort((a, b) => {
    const priorityA = levelPriority[a.roleLevel] || 0;
    const priorityB = levelPriority[b.roleLevel] || 0;
    return priorityB - priorityA;
  });

  return sortedRoles[0].roleName;
}

/**
 * Get all role names for a user
 */
export async function getUserRoles(userId: string): Promise<string[]> {
  const userRoles = await db
    .select({
      roleName: roles.name,
    })
    .from(rbacUserRoles)
    .innerJoin(roles, eq(roles.id, rbacUserRoles.roleId))
    .where(eq(rbacUserRoles.userId, userId));

  return userRoles.map((r) => r.roleName);
}

/**
 * Get primary tenant ID for a user
 * Returns the first tenant the user is a member of
 */
export async function getUserPrimaryTenantId(userId: string): Promise<string | null> {
  const [membership] = await db
    .select({
      tenantId: tenantMembers.tenantId,
    })
    .from(tenantMembers)
    .where(eq(tenantMembers.userId, userId))
    .limit(1);

  return membership?.tenantId || null;
}

/**
 * Get all tenant IDs for a user
 */
export async function getUserTenantIds(userId: string): Promise<string[]> {
  const memberships = await db
    .select({
      tenantId: tenantMembers.tenantId,
    })
    .from(tenantMembers)
    .where(eq(tenantMembers.userId, userId));

  return memberships.map((m) => m.tenantId);
}

/**
 * Check if user has a specific role
 */
export async function userHasRole(userId: string, roleName: string): Promise<boolean> {
  const userRoles = await getUserRoles(userId);
  return userRoles.includes(roleName);
}

/**
 * Check if user is member of a tenant
 */
export async function userIsMemberOfTenant(
  userId: string,
  tenantId: string
): Promise<boolean> {
  const [membership] = await db
    .select()
    .from(tenantMembers)
    .where(and(eq(tenantMembers.userId, userId), eq(tenantMembers.tenantId, tenantId)))
    .limit(1);

  return membership !== undefined;
}
