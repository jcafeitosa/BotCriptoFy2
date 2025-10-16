# Security Module Documentation

## Overview

The Security module provides a complete **Role-Based Access Control (RBAC)** system for BotCriptoFy2, enabling fine-grained permission management across the entire platform.

## Quick Links

- [Architecture Overview](../architecture/security.md) - Complete system architecture
- [API Reference](#api-reference) - All available endpoints
- [Usage Guide](#usage-guide) - How to use RBAC in your code
- [Examples](#examples) - Common use cases and code examples

## Table of Contents

1. [Getting Started](#getting-started)
2. [Core Concepts](#core-concepts)
3. [API Reference](#api-reference)
4. [Usage Guide](#usage-guide)
5. [Examples](#examples)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

- PostgreSQL database with security tables (migrated)
- Seeded RBAC data (roles and permissions)

### Setup

```bash
# 1. Run database migrations
bun run db:migrate

# 2. Seed RBAC data (roles, permissions, mappings)
bun run src/db/seed-rbac.ts

# 3. Verify setup
psql -d botcriptofy2 -c "SELECT COUNT(*) FROM roles;"
# Should return: 5

psql -d botcriptofy2 -c "SELECT COUNT(*) FROM permissions;"
# Should return: 42
```

### Quick Start

```typescript
import { requirePermission, checkPermission } from '@/modules/security';

// Protect a route with a permission guard
app
  .use(requirePermission('trading', 'execute'))
  .post('/api/trade', async ({ body, user }) => {
    // Only users with 'trading:execute' permission can access
    return executeTrade(body);
  });

// Check permission programmatically
const result = await checkPermission({
  userId: user.id,
  resource: 'trading',
  action: 'execute',
});

if (result.allowed) {
  // User has permission
} else {
  // User denied: result.reason
}
```

---

## Core Concepts

### 1. Resources
Resources are the entities that can be protected:
- `users`, `tenants`, `departments`, `security`
- `trading`, `bots`, `strategies`
- `notifications`, `configurations`, `reports`
- And more...

### 2. Actions
Actions define what can be done with a resource:
- `read` - View/list resources
- `write` - Create/update resources
- `delete` - Delete resources
- `manage` - Full management
- `execute` - Execute operations
- `approve` - Approve operations
- `view_all` - View all tenant resources

### 3. Permissions
Permissions combine resources and actions: `resource:action`

Examples:
- `users:read` - View user profiles
- `trading:execute` - Execute trades
- `bots:manage` - Full bot management

### 4. Roles
Roles are collections of permissions:
- **super_admin** - Full system access (42 permissions)
- **admin** - Tenant admin (38 permissions)
- **manager** - Department manager (22 permissions)
- **user** - Regular user (14 permissions)
- **viewer** - Read-only (8 permissions)

### 5. Permission Checking
Three-tier permission resolution:

```
1. Direct User Permissions (Highest Priority)
   ↓
2. Tenant Role Permissions (Medium Priority)
   ↓
3. Global Role Permissions (Lowest Priority)
```

---

## API Reference

### Authentication Required
All security endpoints require authentication via Better-Auth session.

### Base URL
```
/api/security
```

### Endpoints

#### Roles

##### List All Roles
```http
GET /api/security/roles
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "admin",
      "description": "Administrator - Tenant-level admin",
      "level": "admin",
      "isSystem": true
    }
  ],
  "total": 5
}
```

##### Get Role with Permissions
```http
GET /api/security/roles/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "admin",
    "description": "Administrator",
    "level": "admin",
    "isSystem": true,
    "permissions": [
      {
        "id": "uuid",
        "resource": "users",
        "action": "read"
      }
    ]
  }
}
```

##### Create Role (Admin Only)
```http
POST /api/security/roles
```

**Request:**
```json
{
  "name": "custom_role",
  "description": "Custom role for specific use case",
  "level": "user",
  "permissions": ["perm-id-1", "perm-id-2"]
}
```

#### Permissions

##### List All Permissions
```http
GET /api/security/permissions
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "resource": "users",
      "action": "read",
      "description": "View user profiles",
      "isSystem": true
    }
  ],
  "total": 42
}
```

##### Create Permission (Admin Only)
```http
POST /api/security/permissions
```

**Request:**
```json
{
  "resource": "custom_resource",
  "action": "custom_action",
  "description": "Custom permission description"
}
```

#### Role-Permission Management

##### Add Permission to Role
```http
POST /api/security/roles/:roleId/permissions/:permissionId
```

##### Remove Permission from Role
```http
DELETE /api/security/roles/:roleId/permissions/:permissionId
```

#### User-Role Management

##### Assign Role to User
```http
POST /api/security/users/:userId/roles
```

**Request:**
```json
{
  "roleId": "role-uuid",
  "tenantId": "tenant-uuid" // Optional: scope to tenant
}
```

##### Remove Role from User
```http
DELETE /api/security/users/:userId/roles/:roleId?tenantId=tenant-uuid
```

#### User Permissions

##### Get User Permissions
```http
GET /api/security/users/:userId/permissions?tenantId=tenant-uuid
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "roles": [
      {
        "id": "role-uuid",
        "name": "admin",
        "tenantId": "tenant-uuid"
      }
    ],
    "permissions": [
      {
        "id": "perm-uuid",
        "resource": "users",
        "action": "read",
        "grantedBy": "role",
        "tenantId": null
      }
    ]
  }
}
```

##### Grant/Revoke Permission
```http
POST /api/security/users/:userId/permissions
```

**Request:**
```json
{
  "permissionId": "perm-uuid",
  "tenantId": "tenant-uuid", // Optional
  "granted": true // true = grant, false = revoke
}
```

##### Remove Direct Permission
```http
DELETE /api/security/users/:userId/permissions/:permissionId?tenantId=tenant-uuid
```

#### Permission Checking

##### Check Permission
```http
POST /api/security/check-permission
```

**Request:**
```json
{
  "userId": "user-uuid", // Optional: defaults to current user
  "resource": "trading",
  "action": "execute",
  "tenantId": "tenant-uuid" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "allowed": true,
    "reason": "Permission granted by role: admin",
    "grantedBy": "role" // 'direct' | 'tenant_role' | 'role'
  }
}
```

---

## Usage Guide

### Protecting Routes with Middleware

#### 1. Require Specific Permission

```typescript
import { requirePermission } from '@/modules/security';

app
  .use(requirePermission('trading', 'execute'))
  .post('/api/trade', async ({ body }) => {
    // Protected: only users with 'trading:execute'
    return executeTrade(body);
  });
```

#### 2. Require Specific Role

```typescript
import { requireRole } from '@/modules/security';

app
  .use(requireRole('admin'))
  .delete('/api/users/:id', async ({ params }) => {
    // Protected: only admins
    return deleteUser(params.id);
  });
```

#### 3. Require Any Role

```typescript
import { requireAnyRole } from '@/modules/security';

app
  .use(requireAnyRole(['admin', 'manager']))
  .get('/api/reports', async () => {
    // Protected: admins OR managers
    return getReports();
  });
```

#### 4. Require All Roles

```typescript
import { requireAllRoles } from '@/modules/security';

app
  .use(requireAllRoles(['admin', 'auditor']))
  .get('/api/sensitive-data', async () => {
    // Protected: must have BOTH admin AND auditor
    return getSensitiveData();
  });
```

#### 5. Super Admin Only

```typescript
import { requireSuperAdmin } from '@/modules/security';

app
  .use(requireSuperAdmin())
  .post('/api/system/config', async ({ body }) => {
    // Protected: super_admin only
    return updateSystemConfig(body);
  });
```

#### 6. Admin or Super Admin

```typescript
import { requireAdmin } from '@/modules/security';

app
  .use(requireAdmin())
  .post('/api/tenants', async ({ body }) => {
    // Protected: admin OR super_admin
    return createTenant(body);
  });
```

### Programmatic Permission Checking

```typescript
import { checkPermission, getUserPermissions } from '@/modules/security';

// Check single permission
const result = await checkPermission({
  userId: 'user-id',
  resource: 'trading',
  action: 'execute',
  tenantId: 'tenant-id', // Optional
});

if (result.allowed) {
  console.log(`Permission granted: ${result.reason}`);
} else {
  console.log(`Permission denied: ${result.reason}`);
}

// Get all user permissions
const perms = await getUserPermissions('user-id', 'tenant-id');
console.log('User roles:', perms.roles);
console.log('User permissions:', perms.permissions);
```

### Managing Roles and Permissions

```typescript
import {
  createRole,
  createPermission,
  assignRole,
  grantPermission,
  addPermissionToRole,
} from '@/modules/security';

// Create custom role
const role = await createRole({
  name: 'trader_pro',
  description: 'Professional trader with advanced permissions',
  level: 'user',
  permissions: ['perm-id-1', 'perm-id-2'],
});

// Create custom permission
const permission = await createPermission({
  resource: 'advanced_analytics',
  action: 'view',
  description: 'View advanced analytics dashboard',
});

// Assign role to user
await assignRole({
  userId: 'user-id',
  roleId: role.id,
  tenantId: 'tenant-id', // Optional: null for global
});

// Grant direct permission to user
await grantPermission({
  userId: 'user-id',
  permissionId: permission.id,
  tenantId: 'tenant-id', // Optional
  granted: true, // or false to revoke
});

// Add permission to role
await addPermissionToRole(role.id, permission.id);
```

---

## Examples

### Example 1: Protect Trading Endpoint

```typescript
import { Elysia } from 'elysia';
import { requirePermission } from '@/modules/security';
import { sessionGuard } from '@/modules/auth';

export const tradingRoutes = new Elysia({ prefix: '/api/trading' })
  .use(sessionGuard) // Require authentication
  .use(requirePermission('trading', 'execute')) // Require permission
  .post('/execute', async ({ body, user }) => {
    // User is authenticated and has 'trading:execute' permission
    return {
      success: true,
      message: `Trade executed by ${user.name}`,
      trade: body,
    };
  });
```

### Example 2: Multi-Level Access Control

```typescript
import { Elysia } from 'elysia';
import { requirePermission, requireRole, requireAdmin } from '@/modules/security';

export const userManagementRoutes = new Elysia({ prefix: '/api/users' })
  // Anyone authenticated can view users (with 'users:read' permission)
  .use(requirePermission('users', 'read'))
  .get('/', async () => {
    return getAllUsers();
  })

  // Only users with 'users:write' can create users
  .use(requirePermission('users', 'write'))
  .post('/', async ({ body }) => {
    return createUser(body);
  })

  // Only admins can delete users
  .use(requireAdmin())
  .delete('/:id', async ({ params }) => {
    return deleteUser(params.id);
  });
```

### Example 3: Conditional Permission Check

```typescript
import { checkPermission } from '@/modules/security';

export async function getBotDetails(botId: string, userId: string, tenantId?: string) {
  // Get bot from database
  const bot = await db.query.bots.findFirst({
    where: eq(bots.id, botId),
  });

  if (!bot) {
    throw new NotFoundError('Bot not found');
  }

  // Check if user can view all bots or only their own
  const canViewAll = await checkPermission({
    userId,
    resource: 'bots',
    action: 'view_all',
    tenantId,
  });

  // If user can't view all, verify ownership
  if (!canViewAll.allowed && bot.ownerId !== userId) {
    throw new ForbiddenError('You can only view your own bots');
  }

  return bot;
}
```

### Example 4: Dynamic Role-Based UI

```typescript
// In your API endpoint that returns UI configuration
import { getUserPermissions } from '@/modules/security';

export async function getUserUIConfig(userId: string, tenantId?: string) {
  const perms = await getUserPermissions(userId, tenantId);

  // Build permission map for quick lookups
  const permMap = new Set(
    perms.permissions.map((p) => `${p.resource}:${p.action}`)
  );

  return {
    navigation: {
      trading: permMap.has('trading:read'),
      bots: permMap.has('bots:read'),
      analytics: permMap.has('reports:read'),
      admin: permMap.has('users:manage'),
    },
    features: {
      canTrade: permMap.has('trading:execute'),
      canCreateBots: permMap.has('bots:write'),
      canManageUsers: permMap.has('users:write'),
      canViewAllReports: permMap.has('reports:view_all'),
    },
    roles: perms.roles.map((r) => r.name),
  };
}
```

---

## Best Practices

### 1. Use Roles for Groups, Direct Permissions for Exceptions

```typescript
// ✅ Good: Assign role for general access
await assignRole({ userId, roleId: 'trader', tenantId });

// ✅ Good: Use direct permission for specific exception
await grantPermission({
  userId,
  permissionId: 'trading:execute',
  granted: false, // Temporarily revoke
});
```

### 2. Scope Permissions to Tenants

```typescript
// ✅ Good: Tenant-scoped role
await assignRole({
  userId,
  roleId: 'admin',
  tenantId: 'tenant-123', // User is admin only in this tenant
});

// ⚠️ Use with caution: Global role
await assignRole({
  userId,
  roleId: 'admin',
  tenantId: null, // User is admin everywhere
});
```

### 3. Check Permissions Early

```typescript
// ✅ Good: Check permission before expensive operations
const canExecute = await checkPermission({
  userId,
  resource: 'trading',
  action: 'execute',
});

if (!canExecute.allowed) {
  throw new ForbiddenError('Permission denied');
}

// Now perform expensive operations
await executeTrade(...);
```

### 4. Use Middleware for Route Protection

```typescript
// ✅ Good: Use middleware guards
app
  .use(requirePermission('users', 'write'))
  .post('/users', createUserHandler);

// ❌ Bad: Manual checks in every handler
app.post('/users', async ({ user }) => {
  const perm = await checkPermission({
    userId: user.id,
    resource: 'users',
    action: 'write',
  });
  if (!perm.allowed) throw new ForbiddenError();
  // ... handler logic
});
```

### 5. Document Custom Roles and Permissions

```typescript
// ✅ Good: Document why custom permission exists
const customRole = await createRole({
  name: 'limited_trader',
  description: 'Trader with limited access - can only trade BTC/USDT pair (requested by compliance team)',
  level: 'user',
});
```

---

## Troubleshooting

### Problem: Permission check always fails

**Causes:**
1. User doesn't have the required role or permission
2. Security schema not imported in database connection
3. Permission doesn't exist in database

**Solutions:**
```bash
# 1. Check if user has any roles
psql -d botcriptofy2 -c "
SELECT u.email, r.name
FROM users u
LEFT JOIN rbac_user_roles rur ON u.id = rur.user_id
LEFT JOIN roles r ON r.id = rur.role_id
WHERE u.email = 'user@example.com';
"

# 2. Check if permission exists
psql -d botcriptofy2 -c "
SELECT * FROM permissions
WHERE resource = 'trading' AND action = 'execute';
"

# 3. Re-run RBAC seed if needed
bun run src/db/seed-rbac.ts
```

### Problem: "Export named 'roles' not found"

**Cause:** Security schema not imported in database connection.

**Solution:**
```typescript
// In src/db/connection.ts
import * as securitySchema from '../modules/security/schema/security.schema';

const schema = {
  ...authSchema,
  ...tenantSchema,
  ...securitySchema, // ← Add this
};
```

### Problem: Role assignment fails with unique constraint error

**Cause:** User already has that role assigned.

**Solution:**
```typescript
// Check existing roles first
const existing = await db.query.rbacUserRoles.findFirst({
  where: and(
    eq(rbacUserRoles.userId, userId),
    eq(rbacUserRoles.roleId, roleId)
  ),
});

if (existing) {
  console.log('User already has this role');
} else {
  await assignRole({ userId, roleId });
}
```

### Problem: Direct permission not overriding role permission

**Cause:** Check permission logic order.

**Solution:**
Direct permissions are checked FIRST and have highest priority. Make sure:
1. Permission exists in `user_permissions` table
2. `granted` column is set correctly (true/false)
3. Check logs to see which tier granted/denied the permission

---

## Additional Resources

- [Architecture Documentation](../architecture/security.md)
- [Multi-Tenancy Guide](../architecture/multi-tenancy.md)
- [API Reference](../api/README.md)
- [Database Schema](../database/schema.md)

---

**Last Updated:** 2025-10-16
**Version:** 1.0.0
**Status:** ✅ Complete
