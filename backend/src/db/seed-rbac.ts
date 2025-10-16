/**
 * RBAC Seed Script
 *
 * Populates the database with initial roles and permissions
 * Creates:
 * - 5 system roles (super_admin, admin, manager, user, viewer)
 * - Granular permissions for all resources
 * - Role-permission mappings
 */

import { db } from './connection';
import { roles, permissions, rolePermissions } from '../modules/security/schema/security.schema';
import type { ResourceType, PermissionAction } from '../modules/security/types/security.types';

/**
 * System roles to create
 */
const systemRoles = [
  {
    name: 'super_admin',
    description: 'Super Administrator - Full system access',
    level: 'super_admin',
    isSystem: true,
  },
  {
    name: 'admin',
    description: 'Administrator - Tenant-level admin',
    level: 'admin',
    isSystem: true,
  },
  {
    name: 'manager',
    description: 'Manager - Department/team manager',
    level: 'manager',
    isSystem: true,
  },
  {
    name: 'user',
    description: 'Regular User - Standard access',
    level: 'user',
    isSystem: true,
  },
  {
    name: 'viewer',
    description: 'Viewer - Read-only access',
    level: 'viewer',
    isSystem: true,
  },
];

/**
 * System permissions to create
 * Format: [resource, action, description]
 */
const systemPermissions: Array<[ResourceType, PermissionAction, string]> = [
  // Users
  ['users', 'read', 'View user profiles'],
  ['users', 'write', 'Create and update users'],
  ['users', 'delete', 'Delete users'],
  ['users', 'manage', 'Full user management'],

  // Tenants
  ['tenants', 'read', 'View tenant information'],
  ['tenants', 'write', 'Create and update tenants'],
  ['tenants', 'delete', 'Delete tenants'],
  ['tenants', 'manage', 'Full tenant management'],

  // Departments
  ['departments', 'read', 'View departments'],
  ['departments', 'write', 'Create and update departments'],
  ['departments', 'delete', 'Delete departments'],
  ['departments', 'manage', 'Full department management'],

  // Security & RBAC
  ['security', 'read', 'View roles and permissions'],
  ['security', 'write', 'Create roles and permissions'],
  ['security', 'manage', 'Full security management'],

  // Configurations
  ['configurations', 'read', 'View system configurations'],
  ['configurations', 'write', 'Update configurations'],
  ['configurations', 'manage', 'Full configuration management'],

  // Notifications
  ['notifications', 'read', 'View notifications'],
  ['notifications', 'write', 'Send notifications'],
  ['notifications', 'manage', 'Full notification management'],

  // Trading
  ['trading', 'read', 'View trading data'],
  ['trading', 'write', 'Create trading orders'],
  ['trading', 'execute', 'Execute trades'],
  ['trading', 'manage', 'Full trading management'],

  // Bots
  ['bots', 'read', 'View bots'],
  ['bots', 'write', 'Create and configure bots'],
  ['bots', 'execute', 'Start/stop bots'],
  ['bots', 'manage', 'Full bot management'],

  // Strategies
  ['strategies', 'read', 'View strategies'],
  ['strategies', 'write', 'Create and update strategies'],
  ['strategies', 'execute', 'Execute strategies'],
  ['strategies', 'manage', 'Full strategy management'],

  // Reports
  ['reports', 'read', 'View reports'],
  ['reports', 'write', 'Create custom reports'],
  ['reports', 'view_all', 'View all tenant reports'],

  // Support
  ['support', 'read', 'View support tickets'],
  ['support', 'write', 'Create and update tickets'],
  ['support', 'manage', 'Full support management'],

  // Audit
  ['audit', 'read', 'View audit logs'],
  ['audit', 'view_all', 'View all audit logs'],
  ['audit', 'manage', 'Full audit management'],
];

/**
 * Role-Permission mappings
 */
const rolePermissionMappings = {
  super_admin: 'all', // Will get all permissions
  admin: [
    // Users
    'users:read', 'users:write', 'users:manage',
    // Tenants
    'tenants:read', 'tenants:write', 'tenants:manage',
    // Departments
    'departments:read', 'departments:write', 'departments:manage',
    // Security
    'security:read', 'security:write', 'security:manage',
    // Configurations
    'configurations:read', 'configurations:write', 'configurations:manage',
    // Notifications
    'notifications:read', 'notifications:write', 'notifications:manage',
    // Trading
    'trading:read', 'trading:write', 'trading:execute', 'trading:manage',
    // Bots
    'bots:read', 'bots:write', 'bots:execute', 'bots:manage',
    // Strategies
    'strategies:read', 'strategies:write', 'strategies:execute', 'strategies:manage',
    // Reports
    'reports:read', 'reports:write', 'reports:view_all',
    // Support
    'support:read', 'support:write', 'support:manage',
    // Audit
    'audit:read', 'audit:view_all',
  ],
  manager: [
    // Users
    'users:read', 'users:write',
    // Tenants
    'tenants:read',
    // Departments
    'departments:read', 'departments:write',
    // Security
    'security:read',
    // Configurations
    'configurations:read',
    // Notifications
    'notifications:read', 'notifications:write',
    // Trading
    'trading:read', 'trading:write', 'trading:execute',
    // Bots
    'bots:read', 'bots:write', 'bots:execute',
    // Strategies
    'strategies:read', 'strategies:write',
    // Reports
    'reports:read', 'reports:write',
    // Support
    'support:read', 'support:write',
    // Audit
    'audit:read',
  ],
  user: [
    // Users
    'users:read',
    // Tenants
    'tenants:read',
    // Departments
    'departments:read',
    // Notifications
    'notifications:read',
    // Trading
    'trading:read', 'trading:write', 'trading:execute',
    // Bots
    'bots:read', 'bots:write',
    // Strategies
    'strategies:read', 'strategies:write',
    // Reports
    'reports:read',
    // Support
    'support:read', 'support:write',
  ],
  viewer: [
    // Users
    'users:read',
    // Tenants
    'tenants:read',
    // Departments
    'departments:read',
    // Notifications
    'notifications:read',
    // Trading
    'trading:read',
    // Bots
    'bots:read',
    // Strategies
    'strategies:read',
    // Reports
    'reports:read',
  ],
};

/**
 * Seed roles
 */
async function seedRoles() {
  console.log('🌱 Seeding roles...');

  const createdRoles: any[] = [];

  for (const roleData of systemRoles) {
    try {
      // Check if role already exists
      const existing = await db.query.roles.findFirst({
        where: (roles, { eq }) => eq(roles.name, roleData.name),
      });

      if (existing) {
        console.log(`⚠️  Role '${roleData.name}' already exists`);
        createdRoles.push(existing);
        continue;
      }

      // Create role
      const [role] = await db.insert(roles).values(roleData).returning();
      console.log(`✅ Created role: ${role.name}`);
      createdRoles.push(role);
    } catch (error) {
      console.error(`❌ Error creating role '${roleData.name}':`, error);
      throw error;
    }
  }

  return createdRoles;
}

/**
 * Seed permissions
 */
async function seedPermissions() {
  console.log('🌱 Seeding permissions...');

  const createdPermissions: any[] = [];

  for (const [resource, action, description] of systemPermissions) {
    try {
      // Check if permission already exists
      const existing = await db.query.permissions.findFirst({
        where: (permissions, { and, eq }) =>
          and(eq(permissions.resource, resource), eq(permissions.action, action)),
      });

      if (existing) {
        console.log(`⚠️  Permission '${resource}:${action}' already exists`);
        createdPermissions.push(existing);
        continue;
      }

      // Create permission
      const [permission] = await db
        .insert(permissions)
        .values({
          resource,
          action,
          description,
          isSystem: true,
        })
        .returning();

      console.log(`✅ Created permission: ${resource}:${action}`);
      createdPermissions.push(permission);
    } catch (error) {
      console.error(`❌ Error creating permission '${resource}:${action}':`, error);
      throw error;
    }
  }

  return createdPermissions;
}

/**
 * Seed role-permission mappings
 */
async function seedRolePermissions(rolesMap: any[], permissionsMap: any[]) {
  console.log('🌱 Seeding role-permission mappings...');

  for (const role of rolesMap) {
    const roleName = role.name;
    const mapping = rolePermissionMappings[roleName as keyof typeof rolePermissionMappings];

    if (!mapping) {
      console.log(`⚠️  No permission mapping for role '${roleName}'`);
      continue;
    }

    // Super admin gets all permissions
    const permissionsToAssign =
      mapping === 'all'
        ? permissionsMap
        : permissionsMap.filter((p) => mapping.includes(`${p.resource}:${p.action}`));

    console.log(`🔗 Assigning ${permissionsToAssign.length} permissions to '${roleName}'...`);

    for (const permission of permissionsToAssign) {
      try {
        // Check if already assigned
        const existing = await db.query.rolePermissions.findFirst({
          where: (rolePermissions, { and, eq }) =>
            and(
              eq(rolePermissions.roleId, role.id),
              eq(rolePermissions.permissionId, permission.id)
            ),
        });

        if (existing) {
          continue; // Skip if already assigned
        }

        // Assign permission to role
        await db.insert(rolePermissions).values({
          roleId: role.id,
          permissionId: permission.id,
        });
      } catch (error) {
        console.error(
          `❌ Error assigning permission '${permission.resource}:${permission.action}' to role '${roleName}':`,
          error
        );
      }
    }

    console.log(`✅ Assigned permissions to role '${roleName}'`);
  }
}

/**
 * Main seed function
 */
async function seed() {
  console.log('🌱 Starting RBAC seed...\n');

  try {
    // 1. Seed roles
    const rolesMap = await seedRoles();
    console.log(`\n✅ Created ${rolesMap.length} roles\n`);

    // 2. Seed permissions
    const permissionsMap = await seedPermissions();
    console.log(`\n✅ Created ${permissionsMap.length} permissions\n`);

    // 3. Seed role-permission mappings
    await seedRolePermissions(rolesMap, permissionsMap);

    console.log('\n✅ RBAC seed completed successfully!');
    console.log('\n📝 Summary:');
    console.log(`   - ${rolesMap.length} roles (super_admin, admin, manager, user, viewer)`);
    console.log(`   - ${permissionsMap.length} permissions across all resources`);
    console.log(`   - Role-permission mappings created`);
    console.log('\n📝 You can now:');
    console.log('   - Assign roles to users via API: POST /api/security/users/:userId/roles');
    console.log('   - Check permissions via API: POST /api/security/check-permission');
    console.log('   - View all roles: GET /api/security/roles');
    console.log('   - View all permissions: GET /api/security/permissions');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ RBAC seed failed:', error);
    process.exit(1);
  }
}

// Run seed
seed();
