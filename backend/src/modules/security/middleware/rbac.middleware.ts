/**
 * RBAC Middleware
 * Guards for role-based and permission-based access control
 */

import { Elysia } from 'elysia';
import { checkPermission, getUserPermissions } from '../services/permission.service';
import { ForbiddenError, UnauthorizedError } from '@/utils/errors';
import type { ResourceType, PermissionAction, SystemRoleName } from '../types/security.types';
import { sessionGuard } from '../../auth/middleware/session.middleware';

/**
 * Require specific permission
 * Usage: .use(requirePermission('users', 'read'))
 */
export function requirePermission(resource: ResourceType, action: PermissionAction) {
  return new Elysia({ name: `rbac-permission-${resource}:${action}` })
    .use(sessionGuard)
    .derive(async ({ user, session }) => {
      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }

      const tenantId = (session as any)?.activeOrganizationId || undefined;

      const result = await checkPermission({
        userId: user.id,
        resource,
        action,
        tenantId,
      });

      if (!result.allowed) {
        throw new ForbiddenError(`Missing permission: ${resource}:${action}`, {
          required: `${resource}:${action}`,
          reason: result.reason,
        });
      }

      return {};
    });
}

/**
 * Require specific role
 * Usage: .use(requireRole('admin'))
 */
export function requireRole(roleName: SystemRoleName) {
  return new Elysia({ name: `rbac-role-${roleName}` })
    .use(sessionGuard)
    .derive(async ({ user, session }) => {
      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }

      const tenantId = (session as any)?.activeOrganizationId || undefined;
      const permissions = await getUserPermissions(user.id, tenantId);

      const hasRole = permissions.roles.some((r) => r.name === roleName);

      if (!hasRole) {
        throw new ForbiddenError(`Missing required role: ${roleName}`, {
          required: roleName,
          userRoles: permissions.roles.map((r) => r.name),
        });
      }

      return {};
    });
}

/**
 * Require ANY of the specified roles
 * Usage: .use(requireAnyRole(['admin', 'manager']))
 */
export function requireAnyRole(roleNames: SystemRoleName[]) {
  return new Elysia({ name: `rbac-any-role-${roleNames.join('|')}` })
    .use(sessionGuard)
    .derive(async ({ user, session }) => {
      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }

      const tenantId = (session as any)?.activeOrganizationId || undefined;
      const permissions = await getUserPermissions(user.id, tenantId);

      const hasAnyRole = permissions.roles.some((r) => roleNames.includes(r.name as SystemRoleName));

      if (!hasAnyRole) {
        throw new ForbiddenError(`Missing one of required roles: ${roleNames.join(', ')}`, {
          required: roleNames,
          userRoles: permissions.roles.map((r) => r.name),
        });
      }

      return {};
    });
}

/**
 * Require ALL of the specified roles
 * Usage: .use(requireAllRoles(['admin', 'manager']))
 */
export function requireAllRoles(roleNames: SystemRoleName[]) {
  return new Elysia({ name: `rbac-all-roles-${roleNames.join('+')}` })
    .use(sessionGuard)
    .derive(async ({ user, session }) => {
      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }

      const tenantId = (session as any)?.activeOrganizationId || undefined;
      const permissions = await getUserPermissions(user.id, tenantId);

      const userRoleNames = permissions.roles.map((r) => r.name);
      const hasAllRoles = roleNames.every((roleName) => userRoleNames.includes(roleName));

      if (!hasAllRoles) {
        throw new ForbiddenError(`Missing all required roles: ${roleNames.join(', ')}`, {
          required: roleNames,
          userRoles: userRoleNames,
        });
      }

      return {};
    });
}

/**
 * Require super admin role
 * Usage: .use(requireSuperAdmin())
 */
export function requireSuperAdmin() {
  return requireRole('super_admin');
}

/**
 * Require admin role (admin or super_admin)
 * Usage: .use(requireAdmin())
 */
export function requireAdmin() {
  return requireAnyRole(['super_admin', 'admin']);
}

/**
 * Check multiple permissions (ANY)
 * Usage: .use(requireAnyPermission([['users', 'read'], ['users', 'write']]))
 */
export function requireAnyPermission(permissions: Array<[ResourceType, PermissionAction]>) {
  return new Elysia({ name: `rbac-any-permission` })
    .use(sessionGuard)
    .derive(async ({ user, session }) => {
      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }

      const tenantId = (session as any)?.activeOrganizationId || undefined;

      const results = await Promise.all(
        permissions.map(([resource, action]) =>
          checkPermission({
            userId: user.id,
            resource,
            action,
            tenantId,
          })
        )
      );

      const hasAnyPermission = results.some((r) => r.allowed);

      if (!hasAnyPermission) {
        throw new ForbiddenError(`Missing any of required permissions`, {
          required: permissions.map(([r, a]) => `${r}:${a}`),
        });
      }

      return {};
    });
}

/**
 * Check multiple permissions (ALL)
 * Usage: .use(requireAllPermissions([['users', 'read'], ['users', 'write']]))
 */
export function requireAllPermissions(permissions: Array<[ResourceType, PermissionAction]>) {
  return new Elysia({ name: `rbac-all-permissions` })
    .use(sessionGuard)
    .derive(async ({ user, session }) => {
      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }

      const tenantId = (session as any)?.activeOrganizationId || undefined;

      const results = await Promise.all(
        permissions.map(([resource, action]) =>
          checkPermission({
            userId: user.id,
            resource,
            action,
            tenantId,
          })
        )
      );

      const hasAllPermissions = results.every((r) => r.allowed);

      if (!hasAllPermissions) {
        const missing = permissions
          .filter((_, i) => !results[i].allowed)
          .map(([r, a]) => `${r}:${a}`);

        throw new ForbiddenError(`Missing required permissions: ${missing.join(', ')}`, {
          required: permissions.map(([r, a]) => `${r}:${a}`),
          missing,
        });
      }

      return {};
    });
}
