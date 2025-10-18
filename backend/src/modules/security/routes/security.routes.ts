/**
 * Security Routes
 * Routes for RBAC management (roles, permissions)
 */

import { Elysia, t } from 'elysia';
import { sessionGuard } from '../../auth/middleware/session.middleware';
import { requireAdmin } from '../middleware/rbac.middleware';
import {
  getAllRoles,
  getAllPermissions,
  getRoleWithPermissions,
  createRole,
  createPermission,
  assignRole,
  removeRole,
  grantPermission,
  revokePermission,
  addPermissionToRole,
  removePermissionFromRole,
  getUserPermissions,
  checkPermission,
} from '../services/permission.service';
import type { ResourceType, PermissionAction } from '../types/security.types';
import { runAnomalyDetection } from '../services/anomaly-detection.service';

/**
 * Security routes plugin
 */
export const securityRoutes = new Elysia({ prefix: '/api/security', name: 'security-routes' })
  .use(sessionGuard)

  // ===========================================
  // ROLES MANAGEMENT (Admin only)
  // ===========================================

  // List all roles
  .get(
    '/roles',
    async () => {
      const roles = await getAllRoles();
      return { success: true, data: roles, total: roles.length };
    },
    {
      detail: {
        tags: ['Security'],
        summary: 'List all roles',
        description: 'Get list of all roles in the system',
      },
    }
  )

  // ===========================================
  // ANOMALY DETECTION (Admin only)
  // ===========================================

  .use(requireAdmin())
  .post(
    '/anomaly-detection',
    async ({ body, session }: any) => {
      const tenantId = body.tenantId || (session as any)?.activeOrganizationId;
      const result = await runAnomalyDetection(body.userId, body.ipAddress, tenantId);
      return { success: true, data: result };
    },
    {
      body: t.Object({
        userId: t.String({ description: 'User ID to check' }),
        ipAddress: t.Optional(t.String({ description: 'IP address' })),
        tenantId: t.Optional(t.String({ description: 'Tenant ID' })),
      }),
      detail: {
        tags: ['Security'],
        summary: 'Run anomaly detection',
        description: 'Run comprehensive anomaly detection for a user (Admin only)',
      },
    }
  )

  // Get role with permissions
  .get(
    '/roles/:id',
    async ({ params }: any) => {
      const role = await getRoleWithPermissions(params.id);
      return { success: true, data: role };
    },
    {
      params: t.Object({
        id: t.String({ description: 'Role ID' }),
      }),
      detail: {
        tags: ['Security'],
        summary: 'Get role details',
        description: 'Get role with all its permissions',
      },
    }
  )

  // Create role (Admin only)
  .use(requireAdmin())
  .post(
    '/roles',
    async ({ body }: any) => {
      const role = await createRole(body);
      return {
        success: true,
        message: 'Role created successfully',
        data: role,
      };
    },
    {
      body: t.Object({
        name: t.String({ description: 'Role name' }),
        description: t.Optional(t.String({ description: 'Role description' })),
        level: t.Optional(t.String({ description: 'Role level' })),
        permissions: t.Optional(t.Array(t.String(), { description: 'Permission IDs' })),
      }),
      detail: {
        tags: ['Security'],
        summary: 'Create role',
        description: 'Create a new role (Admin only)',
      },
    }
  )

  // ===========================================
  // PERMISSIONS MANAGEMENT (Admin only)
  // ===========================================

  // List all permissions
  .get(
    '/permissions',
    async () => {
      const permissions = await getAllPermissions();
      return { success: true, data: permissions, total: permissions.length };
    },
    {
      detail: {
        tags: ['Security'],
        summary: 'List all permissions',
        description: 'Get list of all permissions in the system',
      },
    }
  )

  // Create permission (Admin only)
  .post(
    '/permissions',
    async ({ body }: any) => {
      const permission = await createPermission(body as any);
      return {
        success: true,
        message: 'Permission created successfully',
        data: permission,
      };
    },
    {
      body: t.Object({
        resource: t.String({ description: 'Resource type' }),
        action: t.String({ description: 'Permission action' }),
        description: t.Optional(t.String({ description: 'Permission description' })),
      }),
      detail: {
        tags: ['Security'],
        summary: 'Create permission',
        description: 'Create a new permission (Admin only)',
      },
    }
  )

  // ===========================================
  // ROLE-PERMISSION ASSIGNMENT (Admin only)
  // ===========================================

  // Add permission to role
  .post(
    '/roles/:roleId/permissions/:permissionId',
    async ({ params }: any) => {
      const result = await addPermissionToRole(params.roleId, params.permissionId);
      return {
        success: true,
        message: 'Permission added to role successfully',
        data: result,
      };
    },
    {
      params: t.Object({
        roleId: t.String({ description: 'Role ID' }),
        permissionId: t.String({ description: 'Permission ID' }),
      }),
      detail: {
        tags: ['Security'],
        summary: 'Add permission to role',
        description: 'Assign a permission to a role (Admin only)',
      },
    }
  )

  // Remove permission from role
  .delete(
    '/roles/:roleId/permissions/:permissionId',
    async ({ params }: any) => {
      await removePermissionFromRole(params.roleId, params.permissionId);
      return {
        success: true,
        message: 'Permission removed from role successfully',
      };
    },
    {
      params: t.Object({
        roleId: t.String({ description: 'Role ID' }),
        permissionId: t.String({ description: 'Permission ID' }),
      }),
      detail: {
        tags: ['Security'],
        summary: 'Remove permission from role',
        description: 'Remove a permission from a role (Admin only)',
      },
    }
  )

  // ===========================================
  // USER-ROLE ASSIGNMENT (Admin only)
  // ===========================================

  // Assign role to user
  .post(
    '/users/:userId/roles',
    async ({ params, body }: any) => {
      const result = await assignRole({
        userId: params.userId,
        roleId: body.roleId,
        tenantId: body.tenantId,
      });
      return {
        success: true,
        message: 'Role assigned to user successfully',
        data: result,
      };
    },
    {
      params: t.Object({
        userId: t.String({ description: 'User ID' }),
      }),
      body: t.Object({
        roleId: t.String({ description: 'Role ID' }),
        tenantId: t.Optional(t.String({ description: 'Tenant ID (scope to tenant)' })),
      }),
      detail: {
        tags: ['Security'],
        summary: 'Assign role to user',
        description: 'Assign a role to a user (Admin only)',
      },
    }
  )

  // Remove role from user
  .delete(
    '/users/:userId/roles/:roleId',
    async ({ params, query }: any) => {
      await removeRole(params.userId, params.roleId, query.tenantId);
      return {
        success: true,
        message: 'Role removed from user successfully',
      };
    },
    {
      params: t.Object({
        userId: t.String({ description: 'User ID' }),
        roleId: t.String({ description: 'Role ID' }),
      }),
      query: t.Object({
        tenantId: t.Optional(t.String({ description: 'Tenant ID' })),
      }),
      detail: {
        tags: ['Security'],
        summary: 'Remove role from user',
        description: 'Remove a role from a user (Admin only)',
      },
    }
  )

  // ===========================================
  // USER PERMISSIONS (Admin only)
  // ===========================================

  // Get user permissions
  .get(
    '/users/:userId/permissions',
    async ({ params, query }: any) => {
      const permissions = await getUserPermissions(params.userId, query.tenantId);
      return { success: true, data: permissions };
    },
    {
      params: t.Object({
        userId: t.String({ description: 'User ID' }),
      }),
      query: t.Object({
        tenantId: t.Optional(t.String({ description: 'Tenant ID' })),
      }),
      detail: {
        tags: ['Security'],
        summary: 'Get user permissions',
        description: 'Get all permissions for a user',
      },
    }
  )

  // Grant permission to user
  .post(
    '/users/:userId/permissions',
    async ({ params, body }: any) => {
      const result = await grantPermission({
        userId: params.userId,
        permissionId: body.permissionId,
        tenantId: body.tenantId,
        granted: body.granted,
      });
      return {
        success: true,
        message: body.granted !== false
          ? 'Permission granted to user successfully'
          : 'Permission revoked from user successfully',
        data: result,
      };
    },
    {
      params: t.Object({
        userId: t.String({ description: 'User ID' }),
      }),
      body: t.Object({
        permissionId: t.String({ description: 'Permission ID' }),
        tenantId: t.Optional(t.String({ description: 'Tenant ID (scope to tenant)' })),
        granted: t.Optional(t.Boolean({ description: 'Grant or revoke (default: true)' })),
      }),
      detail: {
        tags: ['Security'],
        summary: 'Grant/revoke permission to user',
        description: 'Grant or revoke a specific permission to a user (Admin only)',
      },
    }
  )

  // Revoke permission from user
  .delete(
    '/users/:userId/permissions/:permissionId',
    async ({ params, query }: any) => {
      await revokePermission(params.userId, params.permissionId, query.tenantId);
      return {
        success: true,
        message: 'Permission revoked from user successfully',
      };
    },
    {
      params: t.Object({
        userId: t.String({ description: 'User ID' }),
        permissionId: t.String({ description: 'Permission ID' }),
      }),
      query: t.Object({
        tenantId: t.Optional(t.String({ description: 'Tenant ID' })),
      }),
      detail: {
        tags: ['Security'],
        summary: 'Revoke permission from user',
        description: 'Completely remove a direct permission from a user (Admin only)',
      },
    }
  )

  // ===========================================
  // PERMISSION CHECKING (Public)
  // ===========================================

  // Check permission (any authenticated user can check their own)
  .post(
    '/check-permission',
    async ({ user, body, session }: any) => {
      const tenantId = body.tenantId || (session as any)?.activeOrganizationId || undefined;

      const result = await checkPermission({
        userId: body.userId || user.id,
        resource: body.resource as ResourceType,
        action: body.action as PermissionAction,
        tenantId,
      });

      return { success: true, data: result };
    },
    {
      body: t.Object({
        userId: t.Optional(t.String({ description: 'User ID (defaults to current user)' })),
        resource: t.String({ description: 'Resource type' }),
        action: t.String({ description: 'Permission action' }),
        tenantId: t.Optional(t.String({ description: 'Tenant ID' })),
      }),
      detail: {
        tags: ['Security'],
        summary: 'Check permission',
        description: 'Check if user has a specific permission',
      },
    }
  );
