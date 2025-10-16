/**
 * Permission Service
 * Business logic for RBAC permissions management
 */

import { db } from '@/db';
import { eq, and, inArray, or, isNull } from 'drizzle-orm';
import {
  roles,
  permissions,
  rolePermissions,
  rbacUserRoles,
  userPermissions,
} from '../schema/security.schema';
import { tenantMembers } from '../../tenants/schema/tenants.schema';
import type {
  PermissionCheckRequest,
  PermissionCheckResult,
  UserPermissionsResponse,
  CreateRoleRequest,
  CreatePermissionRequest,
  AssignRoleRequest,
  GrantPermissionRequest,
  RoleWithPermissions,
} from '../types/security.types';
import { NotFoundError, BadRequestError } from '@/utils/errors';

/**
 * Check if user has a specific permission
 */
export async function checkPermission(
  request: PermissionCheckRequest
): Promise<PermissionCheckResult> {
  const { userId, resource, action, tenantId } = request;

  // 1. Check direct user permissions (highest priority)
  const directPermission = await db
    .select({
      granted: userPermissions.granted,
      permissionId: userPermissions.permissionId,
    })
    .from(userPermissions)
    .innerJoin(permissions, eq(permissions.id, userPermissions.permissionId))
    .where(
      and(
        eq(userPermissions.userId, userId),
        eq(permissions.resource, resource),
        eq(permissions.action, action),
        tenantId ? eq(userPermissions.tenantId, tenantId) : undefined
      )
    )
    .limit(1);

  if (directPermission.length > 0) {
    return {
      allowed: directPermission[0].granted,
      reason: directPermission[0].granted ? 'Direct permission granted' : 'Direct permission revoked',
      grantedBy: 'direct',
    };
  }

  // 2. Check tenant role permissions (if tenantId provided)
  if (tenantId) {
    const tenantRole = await db
      .select({
        role: tenantMembers.role,
        permissions: tenantMembers.permissions,
      })
      .from(tenantMembers)
      .where(and(eq(tenantMembers.userId, userId), eq(tenantMembers.tenantId, tenantId)))
      .limit(1);

    if (tenantRole.length > 0) {
      const _permString = `${resource}:${action}`;
      const tenantPerms = JSON.parse(tenantRole[0].permissions || '{}');

      if (tenantPerms[resource]?.includes(action) || tenantPerms['*']?.includes('*')) {
        return {
          allowed: true,
          reason: `Permission granted by tenant role: ${tenantRole[0].role}`,
          grantedBy: 'tenant_role',
        };
      }
    }
  }

  // 3. Check global role permissions
  const rolePerms = await db
    .select({
      roleName: roles.name,
      resource: permissions.resource,
      action: permissions.action,
    })
    .from(rbacUserRoles)
    .innerJoin(roles, eq(roles.id, rbacUserRoles.roleId))
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(
      and(
        eq(rbacUserRoles.userId, userId),
        eq(permissions.resource, resource),
        eq(permissions.action, action),
        tenantId ? or(eq(rbacUserRoles.tenantId, tenantId), isNull(rbacUserRoles.tenantId)) : undefined
      )
    );

  if (rolePerms.length > 0) {
    return {
      allowed: true,
      reason: `Permission granted by role: ${rolePerms[0].roleName}`,
      grantedBy: 'role',
    };
  }

  // 4. No permission found
  return {
    allowed: false,
    reason: `User does not have permission ${resource}:${action}`,
  };
}

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(
  userId: string,
  tenantId?: string
): Promise<UserPermissionsResponse> {
  // Get user roles
  const rbacUserRolesData = await db
    .select({
      id: roles.id,
      name: roles.name,
      tenantId: rbacUserRoles.tenantId,
    })
    .from(rbacUserRoles)
    .innerJoin(roles, eq(roles.id, rbacUserRoles.roleId))
    .where(
      and(
        eq(rbacUserRoles.userId, userId),
        tenantId ? or(eq(rbacUserRoles.tenantId, tenantId), isNull(rbacUserRoles.tenantId)) : undefined
      )
    );

  // Get permissions from roles
  const roleIds = rbacUserRolesData.map((r) => r.id);
  const rolePermissionsData = roleIds.length > 0
    ? await db
        .select({
          id: permissions.id,
          resource: permissions.resource,
          action: permissions.action,
        })
        .from(rolePermissions)
        .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
        .where(inArray(rolePermissions.roleId, roleIds))
    : [];

  // Get direct permissions
  const directPermissionsData = await db
    .select({
      id: permissions.id,
      resource: permissions.resource,
      action: permissions.action,
      tenantId: userPermissions.tenantId,
      granted: userPermissions.granted,
    })
    .from(userPermissions)
    .innerJoin(permissions, eq(permissions.id, userPermissions.permissionId))
    .where(
      and(
        eq(userPermissions.userId, userId),
        tenantId ? eq(userPermissions.tenantId, tenantId) : undefined
      )
    );

  return {
    userId,
    roles: rbacUserRolesData.map((r) => ({
      id: r.id,
      name: r.name,
      tenantId: r.tenantId || undefined,
    })),
    permissions: [
      ...rolePermissionsData.map((p) => ({
        id: p.id,
        resource: p.resource,
        action: p.action,
        grantedBy: 'role' as const,
        tenantId: undefined,
      })),
      ...directPermissionsData
        .filter((p) => p.granted)
        .map((p) => ({
          id: p.id,
          resource: p.resource,
          action: p.action,
          grantedBy: 'direct' as const,
          tenantId: p.tenantId || undefined,
        })),
    ],
  };
}

/**
 * Create a new role
 */
export async function createRole(request: CreateRoleRequest) {
  const [role] = await db
    .insert(roles)
    .values({
      name: request.name,
      description: request.description,
      level: request.level || 'user',
      isSystem: false,
    })
    .returning();

  // Assign permissions if provided
  if (request.permissions && request.permissions.length > 0) {
    await db.insert(rolePermissions).values(
      request.permissions.map((permId) => ({
        roleId: role.id,
        permissionId: permId,
      }))
    );
  }

  return role;
}

/**
 * Get role with permissions
 */
export async function getRoleWithPermissions(roleId: string): Promise<RoleWithPermissions> {
  const [role] = await db.select().from(roles).where(eq(roles.id, roleId));

  if (!role) {
    throw new NotFoundError('Role not found', { roleId });
  }

  const perms = await db
    .select({
      id: permissions.id,
      resource: permissions.resource,
      action: permissions.action,
    })
    .from(rolePermissions)
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(eq(rolePermissions.roleId, roleId));

  return {
    id: role.id,
    name: role.name,
    description: role.description || undefined,
    level: role.level,
    isSystem: role.isSystem,
    permissions: perms,
  };
}

/**
 * Create a new permission
 */
export async function createPermission(request: CreatePermissionRequest) {
  const [permission] = await db
    .insert(permissions)
    .values({
      resource: request.resource,
      action: request.action,
      description: request.description,
      isSystem: false,
    })
    .returning();

  return permission;
}

/**
 * Get all permissions
 */
export async function getAllPermissions() {
  return await db.select().from(permissions);
}

/**
 * Get all roles
 */
export async function getAllRoles() {
  return await db.select().from(roles);
}

/**
 * Assign role to user
 */
export async function assignRole(request: AssignRoleRequest) {
  // Check if role exists
  const [role] = await db.select().from(roles).where(eq(roles.id, request.roleId));

  if (!role) {
    throw new NotFoundError('Role not found', { roleId: request.roleId });
  }

  // Check if already assigned
  const existing = await db
    .select()
    .from(rbacUserRoles)
    .where(
      and(
        eq(rbacUserRoles.userId, request.userId),
        eq(rbacUserRoles.roleId, request.roleId),
        request.tenantId ? eq(rbacUserRoles.tenantId, request.tenantId) : undefined
      )
    );

  if (existing.length > 0) {
    throw new BadRequestError('Role already assigned to user');
  }

  const [userRole] = await db
    .insert(rbacUserRoles)
    .values({
      userId: request.userId,
      roleId: request.roleId,
      tenantId: request.tenantId,
    })
    .returning();

  return userRole;
}

/**
 * Remove role from user
 */
export async function removeRole(userId: string, roleId: string, tenantId?: string) {
  await db
    .delete(rbacUserRoles)
    .where(
      and(
        eq(rbacUserRoles.userId, userId),
        eq(rbacUserRoles.roleId, roleId),
        tenantId ? eq(rbacUserRoles.tenantId, tenantId) : undefined
      )
    );
}

/**
 * Grant or revoke permission to user
 */
export async function grantPermission(request: GrantPermissionRequest) {
  // Check if permission exists
  const [permission] = await db
    .select()
    .from(permissions)
    .where(eq(permissions.id, request.permissionId));

  if (!permission) {
    throw new NotFoundError('Permission not found', { permissionId: request.permissionId });
  }

  // Upsert user permission
  const existing = await db
    .select()
    .from(userPermissions)
    .where(
      and(
        eq(userPermissions.userId, request.userId),
        eq(userPermissions.permissionId, request.permissionId),
        request.tenantId ? eq(userPermissions.tenantId, request.tenantId) : undefined
      )
    );

  if (existing.length > 0) {
    // Update
    await db
      .update(userPermissions)
      .set({
        granted: request.granted ?? true,
        updatedAt: new Date(),
      })
      .where(eq(userPermissions.id, existing[0].id));

    return existing[0];
  }

  // Insert
  const [userPerm] = await db
    .insert(userPermissions)
    .values({
      userId: request.userId,
      permissionId: request.permissionId,
      tenantId: request.tenantId,
      granted: request.granted ?? true,
    })
    .returning();

  return userPerm;
}

/**
 * Remove direct permission from user
 */
export async function revokePermission(
  userId: string,
  permissionId: string,
  tenantId?: string
) {
  await db
    .delete(userPermissions)
    .where(
      and(
        eq(userPermissions.userId, userId),
        eq(userPermissions.permissionId, permissionId),
        tenantId ? eq(userPermissions.tenantId, tenantId) : undefined
      )
    );
}

/**
 * Add permission to role
 */
export async function addPermissionToRole(roleId: string, permissionId: string) {
  // Check if exists
  const existing = await db
    .select()
    .from(rolePermissions)
    .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permissionId)));

  if (existing.length > 0) {
    throw new BadRequestError('Permission already assigned to role');
  }

  const [rolePerm] = await db
    .insert(rolePermissions)
    .values({
      roleId,
      permissionId,
    })
    .returning();

  return rolePerm;
}

/**
 * Remove permission from role
 */
export async function removePermissionFromRole(roleId: string, permissionId: string) {
  await db
    .delete(rolePermissions)
    .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permissionId)));
}
