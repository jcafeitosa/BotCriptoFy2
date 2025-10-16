/**
 * Security Schema
 * RBAC (Role-Based Access Control) system
 * @see docs/security/README.md
 */

import { pgTable, text, timestamp, uuid, boolean, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from '../../auth/schema/auth.schema';
import { tenants } from '../../tenants/schema/tenants.schema';

/**
 * System Roles Table
 * Defines all available roles in the system
 *
 * Roles are hierarchical:
 * - super_admin: Full system access
 * - admin: Tenant-level admin
 * - manager: Department/team manager
 * - user: Regular user
 * - viewer: Read-only access
 */
export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(), // 'super_admin', 'admin', 'manager', 'user', 'viewer'
  description: text('description'),
  level: text('level').notNull().default('user'), // Hierarchy level
  isSystem: boolean('is_system').notNull().default(false), // System roles cannot be deleted
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Permissions Table
 * Defines granular permissions for resources
 *
 * Permission format: resource:action
 * Examples:
 * - users:read, users:write, users:delete
 * - tenants:read, tenants:manage
 * - departments:read, departments:write
 * - trading:execute, trading:view
 */
export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  resource: text('resource').notNull(), // 'users', 'tenants', 'departments', 'trading', etc
  action: text('action').notNull(), // 'read', 'write', 'delete', 'manage', 'execute'
  description: text('description'),
  isSystem: boolean('is_system').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  uniqueResourceAction: uniqueIndex('permissions_resource_action_unique').on(
    table.resource,
    table.action
  ),
}));

/**
 * Role Permissions Table
 * Maps which permissions each role has
 */
export const rolePermissions = pgTable(
  'role_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqueRolePermission: uniqueIndex('role_permissions_role_permission_unique').on(
      table.roleId,
      table.permissionId
    ),
  })
);

/**
 * RBAC User Roles Table (Global)
 * Assigns global system roles to users
 * Note: This is different from:
 * - Better-Auth's user_roles table (simple role strings)
 * - tenant_members.role (tenant-specific roles)
 */
export const rbacUserRoles = pgTable(
  'rbac_user_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }), // Optional: role scoped to tenant
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqueUserRoleTenant: uniqueIndex('rbac_user_roles_user_role_tenant_unique').on(
      table.userId,
      table.roleId,
      table.tenantId
    ),
  })
);

/**
 * User Permissions Table (Direct Permissions)
 * Grants specific permissions directly to users (override role permissions)
 */
export const userPermissions = pgTable(
  'user_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    tenantId: text('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }), // Optional: permission scoped to tenant
    granted: boolean('granted').notNull().default(true), // true = grant, false = revoke
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqueUserPermissionTenant: uniqueIndex('user_permissions_user_permission_tenant_unique').on(
      table.userId,
      table.permissionId,
      table.tenantId
    ),
  })
);

/**
 * Type definitions for TypeScript
 */
export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;

export type RolePermission = typeof rolePermissions.$inferSelect;
export type NewRolePermission = typeof rolePermissions.$inferInsert;

export type RbacUserRole = typeof rbacUserRoles.$inferSelect;
export type NewRbacUserRole = typeof rbacUserRoles.$inferInsert;

export type UserPermission = typeof userPermissions.$inferSelect;
export type NewUserPermission = typeof userPermissions.$inferInsert;
