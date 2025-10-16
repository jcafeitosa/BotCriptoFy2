/**
 * Security Types
 * Type definitions for RBAC system
 */

/**
 * System role names
 */
export type SystemRoleName =
  | 'super_admin'
  | 'admin'
  | 'manager'
  | 'user'
  | 'viewer';

/**
 * Permission action types
 */
export type PermissionAction =
  | 'read'
  | 'write'
  | 'delete'
  | 'manage'
  | 'execute'
  | 'approve'
  | 'view_all';

/**
 * Resource types in the system
 */
export type ResourceType =
  | 'users'
  | 'tenants'
  | 'departments'
  | 'security'
  | 'configurations'
  | 'notifications'
  | 'trading'
  | 'bots'
  | 'strategies'
  | 'orders'
  | 'portfolio'
  | 'reports'
  | 'financial'
  | 'subscriptions'
  | 'affiliates'
  | 'support'
  | 'documents'
  | 'audit';

/**
 * Permission format: resource:action
 * Example: "users:read", "trading:execute"
 */
export type PermissionString = `${ResourceType}:${PermissionAction}`;

/**
 * Role creation request
 */
export interface CreateRoleRequest {
  name: string;
  description?: string;
  level?: string;
  permissions?: string[]; // Array of permissionIds
}

/**
 * Permission creation request
 */
export interface CreatePermissionRequest {
  resource: ResourceType;
  action: PermissionAction;
  description?: string;
}

/**
 * User role assignment request
 */
export interface AssignRoleRequest {
  userId: string;
  roleId: string;
  tenantId?: string; // Optional: scope to tenant
}

/**
 * Grant permission request
 */
export interface GrantPermissionRequest {
  userId: string;
  permissionId: string;
  tenantId?: string; // Optional: scope to tenant
  granted?: boolean; // true = grant, false = revoke
}

/**
 * Permission check request
 */
export interface PermissionCheckRequest {
  userId: string;
  resource: ResourceType;
  action: PermissionAction;
  tenantId?: string; // Optional: check within tenant context
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  grantedBy?: 'role' | 'direct' | 'tenant_role';
}

/**
 * User permissions response
 */
export interface UserPermissionsResponse {
  userId: string;
  roles: Array<{
    id: string;
    name: string;
    tenantId?: string;
  }>;
  permissions: Array<{
    id: string;
    resource: string;
    action: string;
    grantedBy: 'role' | 'direct';
    tenantId?: string;
  }>;
}

/**
 * Role with permissions
 */
export interface RoleWithPermissions {
  id: string;
  name: string;
  description?: string;
  level: string;
  isSystem: boolean;
  permissions: Array<{
    id: string;
    resource: string;
    action: string;
  }>;
}
