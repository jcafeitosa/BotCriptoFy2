# Security & RBAC Architecture

## Overview

The Security module implements a complete **Role-Based Access Control (RBAC)** system for BotCriptoFy2. It provides fine-grained permissions management with three-tier permission checking: direct user permissions, tenant-specific roles, and global system roles.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     RBAC Security System                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐      ┌───────────┐ │
│  │   Roles      │      │ Permissions  │      │   Users   │ │
│  │              │      │              │      │           │ │
│  │ super_admin  │◄────►│ users:read   │◄────►│  User A   │ │
│  │ admin        │      │ users:write  │      │  User B   │ │
│  │ manager      │      │ trading:exec │      │  User C   │ │
│  │ user         │      │ bots:manage  │      │           │ │
│  │ viewer       │      │ ...          │      │           │ │
│  └──────────────┘      └──────────────┘      └───────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘

Permission Check Flow:
Request → Middleware Guard → Check Direct Permission
                           → Check Tenant Role Permission
                           → Check Global Role Permission
                           → Allow/Deny
```

## Database Schema

### Tables

#### 1. `roles`
Defines system roles with hierarchical levels.

```typescript
{
  id: uuid (PK)
  name: text (UNIQUE) - 'super_admin', 'admin', 'manager', 'user', 'viewer'
  description: text
  level: text - Hierarchy level
  isSystem: boolean - System roles cannot be deleted
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### 2. `permissions`
Defines granular permissions in `resource:action` format.

```typescript
{
  id: uuid (PK)
  resource: text - 'users', 'tenants', 'departments', 'trading', etc.
  action: text - 'read', 'write', 'delete', 'manage', 'execute', etc.
  description: text
  isSystem: boolean
  createdAt: timestamp
  updatedAt: timestamp

  UNIQUE(resource, action)
}
```

**Examples:**
- `users:read` - View user profiles
- `users:write` - Create/update users
- `trading:execute` - Execute trades
- `bots:manage` - Full bot management

#### 3. `role_permissions`
Maps which permissions each role has.

```typescript
{
  id: uuid (PK)
  roleId: uuid (FK → roles.id)
  permissionId: uuid (FK → permissions.id)
  createdAt: timestamp

  UNIQUE(roleId, permissionId)
}
```

#### 4. `rbac_user_roles`
Assigns global and tenant-scoped roles to users.

**Note:** Named `rbac_user_roles` to avoid conflict with Better-Auth's `user_roles` table.

```typescript
{
  id: uuid (PK)
  userId: text (FK → users.id)
  roleId: uuid (FK → roles.id)
  tenantId: text (FK → tenants.id, nullable) - Optional tenant scope
  createdAt: timestamp
  updatedAt: timestamp

  UNIQUE(userId, roleId, tenantId)
}
```

#### 5. `user_permissions`
Direct permissions granted to users (override role permissions).

```typescript
{
  id: uuid (PK)
  userId: text (FK → users.id)
  permissionId: uuid (FK → permissions.id)
  tenantId: text (FK → tenants.id, nullable) - Optional tenant scope
  granted: boolean - true = grant, false = revoke
  createdAt: timestamp
  updatedAt: timestamp

  UNIQUE(userId, permissionId, tenantId)
}
```

## System Roles

### Role Hierarchy

```
super_admin (Level 5)
    ↓
admin (Level 4)
    ↓
manager (Level 3)
    ↓
user (Level 2)
    ↓
viewer (Level 1)
```

### Role Definitions

#### 1. **super_admin**
- **Description:** Super Administrator with full system access
- **Permissions:** ALL (42 permissions)
- **Use Cases:** System administrators, platform owners
- **Scope:** Global only

#### 2. **admin**
- **Description:** Tenant-level administrator
- **Permissions:** 38 permissions (all except some audit operations)
- **Use Cases:** Tenant administrators, company admins
- **Scope:** Global or tenant-specific

#### 3. **manager**
- **Description:** Department or team manager
- **Permissions:** 22 permissions (read/write on most resources)
- **Use Cases:** Department heads, team leaders
- **Scope:** Global or tenant-specific

#### 4. **user**
- **Description:** Regular user with standard access
- **Permissions:** 14 permissions (basic operations)
- **Use Cases:** Traders, regular employees
- **Scope:** Global or tenant-specific

#### 5. **viewer**
- **Description:** Read-only access user
- **Permissions:** 8 permissions (read-only)
- **Use Cases:** Auditors, observers, reports viewers
- **Scope:** Global or tenant-specific

## Permission System

### Permission Format

All permissions follow the format: `resource:action`

### Resources (15+)

- `users` - User management
- `tenants` - Tenant management
- `departments` - Department management
- `security` - Security and RBAC management
- `configurations` - System configurations
- `notifications` - Notification system
- `trading` - Trading operations
- `bots` - Trading bot management
- `strategies` - Strategy management
- `reports` - Report generation
- `support` - Support tickets
- `audit` - Audit logs
- `subscriptions` - Subscription management
- `financial` - Financial operations
- `marketing` - Marketing operations

### Actions (7)

- `read` - View/list resources
- `write` - Create/update resources
- `delete` - Delete resources
- `manage` - Full resource management
- `execute` - Execute operations (trades, bots)
- `approve` - Approve operations
- `view_all` - View all tenant resources

### Total System Permissions

**42 permissions** created by default seed:

```
users:read, users:write, users:delete, users:manage
tenants:read, tenants:write, tenants:delete, tenants:manage
departments:read, departments:write, departments:delete, departments:manage
security:read, security:write, security:manage
configurations:read, configurations:write, configurations:manage
notifications:read, notifications:write, notifications:manage
trading:read, trading:write, trading:execute, trading:manage
bots:read, bots:write, bots:execute, bots:manage
strategies:read, strategies:write, strategies:execute, strategies:manage
reports:read, reports:write, reports:view_all
support:read, support:write, support:manage
audit:read, audit:view_all, audit:manage
```

## Permission Checking Logic

### Three-Tier Permission Check

The system checks permissions in the following order (first match wins):

```typescript
1. Direct User Permissions (Highest Priority)
   → Check user_permissions table
   → If granted=true: ALLOW
   → If granted=false: DENY
   → If not found: Continue to step 2

2. Tenant Role Permissions (Medium Priority)
   → Check tenant_members.permissions JSON field
   → If permission exists: ALLOW
   → If not found: Continue to step 3

3. Global Role Permissions (Lowest Priority)
   → Check rbac_user_roles → role_permissions → permissions
   → If permission exists: ALLOW
   → If not found: DENY
```

### Example Permission Check

```typescript
// User: john@example.com
// Checking: trading:execute

// Step 1: Direct permissions
SELECT * FROM user_permissions
WHERE userId = 'john-id'
  AND permissionId = (SELECT id FROM permissions
                      WHERE resource='trading' AND action='execute')
// Result: granted=false → DENY (short-circuit)

// The check stops here, user is denied even if they have the role
```

## API Endpoints

### Role Management

```
GET    /api/security/roles                    - List all roles
GET    /api/security/roles/:id                - Get role details
POST   /api/security/roles                    - Create role (Admin)
```

### Permission Management

```
GET    /api/security/permissions              - List all permissions
POST   /api/security/permissions              - Create permission (Admin)
```

### Role-Permission Assignment

```
POST   /api/security/roles/:roleId/permissions/:permissionId    - Add permission to role
DELETE /api/security/roles/:roleId/permissions/:permissionId    - Remove permission from role
```

### User-Role Assignment

```
POST   /api/security/users/:userId/roles      - Assign role to user
DELETE /api/security/users/:userId/roles/:roleId - Remove role from user
```

### User Permissions

```
GET    /api/security/users/:userId/permissions              - Get user permissions
POST   /api/security/users/:userId/permissions              - Grant/revoke permission
DELETE /api/security/users/:userId/permissions/:permissionId - Revoke permission
```

### Permission Checking

```
POST   /api/security/check-permission         - Check if user has permission
```

## Middleware Guards

### Usage Examples

#### 1. **requirePermission**
Protect routes by required permission.

```typescript
import { requirePermission } from '@/modules/security';

.use(requirePermission('trading', 'execute'))
.post('/trade', async ({ body }) => {
  // Only users with 'trading:execute' permission can access
  return executeTrade(body);
});
```

#### 2. **requireRole**
Protect routes by required role.

```typescript
import { requireRole } from '@/modules/security';

.use(requireRole('admin'))
.post('/admin/users', async ({ body }) => {
  // Only admins can access
  return createUser(body);
});
```

#### 3. **requireAnyRole**
Require any of the specified roles.

```typescript
import { requireAnyRole } from '@/modules/security';

.use(requireAnyRole(['admin', 'manager']))
.get('/reports', async () => {
  // Admins OR managers can access
  return getReports();
});
```

#### 4. **requireAllRoles**
Require all specified roles.

```typescript
import { requireAllRoles } from '@/modules/security';

.use(requireAllRoles(['admin', 'auditor']))
.get('/sensitive-data', async () => {
  // User must have BOTH admin AND auditor roles
  return getSensitiveData();
});
```

#### 5. **requireSuperAdmin**
Only super admins.

```typescript
import { requireSuperAdmin } from '@/modules/security';

.use(requireSuperAdmin())
.post('/system/config', async ({ body }) => {
  // Only super_admin can access
  return updateSystemConfig(body);
});
```

#### 6. **requireAdmin**
Admins or super admins.

```typescript
import { requireAdmin } from '@/modules/security';

.use(requireAdmin())
.post('/tenants', async ({ body }) => {
  // admin OR super_admin can access
  return createTenant(body);
});
```

## Service Functions

### Core Functions

```typescript
import {
  checkPermission,
  getUserPermissions,
  assignRole,
  removeRole,
  grantPermission,
  revokePermission,
  createRole,
  createPermission,
  addPermissionToRole,
  removePermissionFromRole,
} from '@/modules/security';

// Check if user has permission
const result = await checkPermission({
  userId: 'user-id',
  resource: 'trading',
  action: 'execute',
  tenantId: 'tenant-id' // optional
});

// Get all user permissions
const perms = await getUserPermissions('user-id', 'tenant-id');

// Assign role to user
await assignRole({
  userId: 'user-id',
  roleId: 'role-id',
  tenantId: 'tenant-id' // optional for global role
});

// Grant direct permission
await grantPermission({
  userId: 'user-id',
  permissionId: 'permission-id',
  tenantId: 'tenant-id', // optional
  granted: true // or false to revoke
});
```

## Seed Data

### Running the RBAC Seed

```bash
bun run src/db/seed-rbac.ts
```

### What Gets Created

- **5 System Roles:** super_admin, admin, manager, user, viewer
- **42 Permissions:** Across all resources
- **124 Role-Permission Mappings:** Pre-configured role permissions

## Security Best Practices

### 1. Principle of Least Privilege
- Start users with minimal permissions (viewer or user role)
- Grant additional permissions as needed
- Use tenant-scoped roles when possible

### 2. Direct Permission Overrides
- Use direct permissions sparingly
- Primarily for exceptions and temporary access
- Document why direct permissions were granted

### 3. Regular Audits
- Periodically review user permissions
- Remove unused permissions
- Audit permission changes

### 4. Role Management
- Don't modify system roles (isSystem=true)
- Create custom roles for specific use cases
- Keep role hierarchies simple

### 5. Tenant Isolation
- Always scope permissions to tenants when applicable
- Use tenantId parameter in permission checks
- Verify tenant membership before granting access

## Integration with Multi-Tenancy

### Hybrid Role System

The RBAC system works seamlessly with the multi-tenancy architecture:

```
┌─────────────────────────────────────────┐
│ User: john@example.com                  │
├─────────────────────────────────────────┤
│ Global Role: manager                     │ ← From rbac_user_roles
│                                          │
│ Tenant A:                                │
│   ├─ Tenant Role: admin                 │ ← From tenant_members
│   └─ Direct Perm: trading:execute=false │ ← From user_permissions
│                                          │
│ Tenant B:                                │
│   └─ Tenant Role: user                  │ ← From tenant_members
└─────────────────────────────────────────┘
```

### Permission Resolution Example

```typescript
// User checking: trading:execute in Tenant A

// 1. Direct permission (user_permissions)
//    Found: trading:execute = false
//    → DENY (highest priority, short-circuit)

// Even though user is 'admin' in Tenant A,
// the direct permission override denies access
```

## Troubleshooting

### Common Issues

#### 1. "Permission Denied" Error
- Check if user has required permission
- Verify tenant context if applicable
- Check for direct permission overrides (granted=false)

#### 2. Role Assignment Not Working
- Ensure role exists in database
- Check if user already has the role (unique constraint)
- Verify tenantId is correct

#### 3. Permission Check Always Fails
- Ensure security schema is imported in db connection
- Verify permission exists in database
- Check permission format (resource:action)

### Debug Commands

```bash
# Check user roles
psql -d botcriptofy2 -c "
SELECT u.email, r.name, rur.tenant_id
FROM users u
JOIN rbac_user_roles rur ON u.id = rur.user_id
JOIN roles r ON r.id = rur.role_id
WHERE u.email = 'user@example.com';
"

# Check user permissions
psql -d botcriptofy2 -c "
SELECT u.email, p.resource, p.action, up.granted
FROM users u
JOIN user_permissions up ON u.id = up.user_id
JOIN permissions p ON p.id = up.permission_id
WHERE u.email = 'user@example.com';
"

# Check role permissions
psql -d botcriptofy2 -c "
SELECT r.name, p.resource, p.action
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
WHERE r.name = 'admin'
ORDER BY p.resource, p.action;
"
```

## Performance Considerations

### Caching Strategy

For production, consider implementing Redis cache for:

```typescript
// Cache key format: perm:{userId}:{resource}:{action}:{tenantId}
const cacheKey = `perm:${userId}:${resource}:${action}:${tenantId}`;

// Cache TTL: 5 minutes (300 seconds)
const CACHE_TTL = 300;

// Invalidate cache on:
// - Role assignment/removal
// - Permission grant/revoke
// - Role permission changes
```

### Database Indexes

All critical indexes are already created:

```sql
-- Composite unique indexes for fast lookups
permissions_resource_action_unique (resource, action)
rbac_user_roles_user_role_tenant_unique (user_id, role_id, tenant_id)
role_permissions_role_permission_unique (role_id, permission_id)
user_permissions_user_permission_tenant_unique (user_id, permission_id, tenant_id)
```

## Future Enhancements

### Planned Features

1. **Permission Groups**
   - Group related permissions for bulk assignment
   - Example: "Trader Package" = trading + bots + strategies permissions

2. **Time-Based Permissions**
   - Grant permissions for specific time periods
   - Auto-revoke after expiration

3. **Conditional Permissions**
   - Context-aware permissions based on IP, time, location
   - Example: Allow trading only during market hours

4. **Permission Requests**
   - Users can request permissions
   - Approval workflow for managers

5. **Audit Trail**
   - Log all permission changes
   - Track who granted/revoked permissions
   - Historical permission snapshots

## References

- [Multi-Tenancy Architecture](./multi-tenancy.md)
- [Middleware Documentation](./middleware.md)
- [Authentication System](../authentication/better-auth.md)
- [API Documentation](../api/README.md)
