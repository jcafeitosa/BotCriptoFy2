/**
 * Departments Schema
 * Organizational structure for multi-tenant system
 */

import { pgTable, text, uuid, timestamp, boolean, jsonb, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from '../../tenants/schema/tenants.schema';
import { users } from '../../auth/schema/auth.schema';

/**
 * Departments Table
 * Organizational units within tenants
 */
export const departments = pgTable('departments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description'),
  type: text('type').notNull(), // ceo, financial, marketing, sales, security, sac, audit, documents, configurations, subscriptions
  isActive: boolean('is_active').default(true),
  settings: jsonb('settings').$type<Record<string, any>>().default({}),
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Department Members Table
 * Assigns users to departments with specific roles
 */
export const departmentMembers = pgTable(
  'department_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    departmentId: uuid('department_id')
      .notNull()
      .references(() => departments.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull(), // manager, member, viewer
    isActive: boolean('is_active').default(true),
    assignedAt: timestamp('assigned_at').defaultNow().notNull(),
    assignedBy: text('assigned_by').references(() => users.id),
    metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
  },
  (table) => ({
    // Unique constraint: a user can only have one role per department
    uniqueUserDepartment: unique().on(table.departmentId, table.userId),
  })
);

/**
 * Relations
 */
export const departmentsRelations = relations(departments, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [departments.tenantId],
    references: [tenants.id],
  }),
  members: many(departmentMembers),
}));

export const departmentMembersRelations = relations(departmentMembers, ({ one }) => ({
  department: one(departments, {
    fields: [departmentMembers.departmentId],
    references: [departments.id],
  }),
  user: one(users, {
    fields: [departmentMembers.userId],
    references: [users.id],
  }),
  assignedByUser: one(users, {
    fields: [departmentMembers.assignedBy],
    references: [users.id],
  }),
}));

// Type exports
export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;
export type DepartmentMember = typeof departmentMembers.$inferSelect;
export type NewDepartmentMember = typeof departmentMembers.$inferInsert;
