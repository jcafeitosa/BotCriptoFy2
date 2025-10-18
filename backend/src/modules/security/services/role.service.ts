/**
 * Role Service (Security)
 * Centralizes user role resolution for RBAC
 */

import { db } from '@/db';
import { eq } from 'drizzle-orm';
import { rbacUserRoles, roles } from '../schema/security.schema';

/**
 * Get all role names for a user (global or tenant-scoped)
 */
export async function getUserRoles(userId: string): Promise<string[]> {
  const rows = await db
    .select({ roleName: roles.name })
    .from(rbacUserRoles)
    .innerJoin(roles, eq(roles.id, rbacUserRoles.roleId))
    .where(eq(rbacUserRoles.userId, userId));

  return rows.map((r) => r.roleName);
}

/**
 * Get primary role for a user by hierarchy
 */
export async function getUserPrimaryRole(userId: string): Promise<string | null> {
  const rows = await db
    .select({ name: roles.name, level: roles.level })
    .from(rbacUserRoles)
    .innerJoin(roles, eq(roles.id, rbacUserRoles.roleId))
    .where(eq(rbacUserRoles.userId, userId));

  if (rows.length === 0) return null;

  const priority: Record<string, number> = {
    super_admin: 5,
    admin: 4,
    manager: 3,
    user: 2,
    viewer: 1,
  };

  rows.sort((a, b) => (priority[b.level] || 0) - (priority[a.level] || 0));
  return rows[0].name;
}

