/**
 * Tenants Schema
 * Multi-tenant architecture tables
 * @see docs/database-schema.md:84-110
 */

import { pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from '../../auth/schema/auth.schema';

/**
 * Tenants Table
 * Main table for multi-tenant structure
 * Supports three types: 'empresa' (1:N), 'trader' (1:1), 'influencer' (1:1)
 */
export const tenants = pgTable('tenants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  type: text('type').notNull(), // 'empresa' | 'trader' | 'influencer'
  status: text('status').notNull().default('active'), // 'active' | 'inactive' | 'suspended'
  settings: text('settings').default('{}'),
  metadata: text('metadata').default('{}'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * Tenant Members Table
 * Join table linking users to tenants with roles and permissions
 * This is the PRIMARY table for multi-tenant membership
 *
 * Different from userRoles (Better-Auth global roles):
 * - userRoles: Global system roles (super_admin, etc)
 * - tenant_members: Tenant-specific membership and roles
 */
export const tenantMembers = pgTable(
  'tenant_members',
  {
    id: text('id').primaryKey(),
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull(), // 'ceo' | 'admin' | 'funcionario' | 'trader' | 'influencer' | 'manager' | 'viewer'
    permissions: text('permissions').default('{}'),
    status: text('status').notNull().default('active'), // 'active' | 'inactive' | 'suspended'
    joinedAt: timestamp('joined_at').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqueTenantUser: uniqueIndex('tenant_members_tenant_user_unique').on(
      table.tenantId,
      table.userId
    ),
  })
);

/**
 * Type definitions for TypeScript
 */
export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;

export type TenantMember = typeof tenantMembers.$inferSelect;
export type NewTenantMember = typeof tenantMembers.$inferInsert;
