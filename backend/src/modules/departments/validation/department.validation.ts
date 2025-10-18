/**
 * Department Validation Schemas
 * Comprehensive Zod schemas for department operations
 *
 * @module departments/validation
 */

import { z } from 'zod';

/**
 * Department Type Enum
 * Based on the 10 departments in the system
 */
export const departmentTypeSchema = z.enum([
  'ceo',
  'financial',
  'marketing',
  'sales',
  'security',
  'sac',
  'audit',
  'documents',
  'configurations',
  'subscriptions',
], {
  errorMap: () => ({ message: 'Invalid department type' }),
});

/**
 * Member Role Enum
 * Hierarchical roles: viewer < member < manager
 */
export const memberRoleSchema = z.enum(['viewer', 'member', 'manager'], {
  errorMap: () => ({ message: 'Invalid member role. Must be viewer, member, or manager' }),
});

/**
 * Slug Validation
 * Must be lowercase, alphanumeric with hyphens only
 */
export const slugSchema = z
  .string()
  .min(3, 'Slug must be at least 3 characters')
  .max(50, 'Slug must not exceed 50 characters')
  .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
  .transform((s) => s.toLowerCase().trim());

/**
 * UUID Validation
 */
export const uuidSchema = z.string().uuid({ message: 'Invalid UUID format' });

/**
 * Create Department Request Schema
 */
export const createDepartmentSchema = z
  .object({
    tenantId: uuidSchema,
    name: z
      .string()
      .min(3, 'Department name must be at least 3 characters')
      .max(100, 'Department name must not exceed 100 characters')
      .trim(),
    slug: slugSchema,
    description: z
      .string()
      .max(500, 'Description must not exceed 500 characters')
      .trim()
      .optional(),
    type: departmentTypeSchema,
    settings: z.record(z.any()).optional().default({}),
    metadata: z.record(z.any()).optional().default({}),
  })
  .strict(); // Disallow extra fields

/**
 * Update Department Request Schema
 * All fields optional except restrictions on type and tenantId
 */
export const updateDepartmentSchema = z
  .object({
    name: z
      .string()
      .min(3, 'Department name must be at least 3 characters')
      .max(100, 'Department name must not exceed 100 characters')
      .trim()
      .optional(),
    slug: slugSchema.optional(),
    description: z
      .string()
      .max(500, 'Description must not exceed 500 characters')
      .trim()
      .optional(),
    isActive: z.boolean().optional(),
    settings: z.record(z.any()).optional(),
    metadata: z.record(z.any()).optional(),
  })
  .strict();

/**
 * Department Filter Schema
 */
export const departmentFilterSchema = z
  .object({
    tenantId: uuidSchema.optional(),
    type: departmentTypeSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

/**
 * Add Member Request Schema
 */
export const addMemberSchema = z
  .object({
    userId: uuidSchema,
    role: memberRoleSchema,
  })
  .strict();

/**
 * Update Member Role Schema
 */
export const updateMemberRoleSchema = z
  .object({
    role: memberRoleSchema,
  })
  .strict();

/**
 * Pagination Schema
 */
export const paginationSchema = z
  .object({
    page: z
      .number()
      .int()
      .positive('Page must be a positive integer')
      .default(1)
      .optional(),
    limit: z
      .number()
      .int()
      .positive('Limit must be a positive integer')
      .max(100, 'Limit must not exceed 100')
      .default(50)
      .optional(),
    sortBy: z
      .string()
      .max(50)
      .default('createdAt')
      .optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
  })
  .strict();

/**
 * ID Parameter Schema
 */
export const idParamSchema = z.object({
  id: uuidSchema,
});

/**
 * Tenant ID Parameter Schema
 */
export const tenantIdParamSchema = z.object({
  tenantId: uuidSchema,
});

/**
 * Slug Parameter Schema
 */
export const slugParamSchema = z.object({
  slug: slugSchema,
});

/**
 * User ID Parameter Schema
 */
export const userIdParamSchema = z.object({
  userId: uuidSchema,
});

/**
 * Department ID + User ID Parameters Schema
 */
export const departmentUserParamSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
});

/**
 * Tenant ID + Slug Parameters Schema
 */
export const tenantSlugParamSchema = z.object({
  tenantId: uuidSchema,
  slug: slugSchema,
});

/**
 * Bulk Create Departments Schema
 */
export const bulkCreateDepartmentsSchema = z
  .object({
    departments: z
      .array(createDepartmentSchema)
      .min(1, 'At least one department required')
      .max(50, 'Maximum 50 departments per bulk operation'),
  })
  .strict();

/**
 * Bulk Add Members Schema
 */
export const bulkAddMembersSchema = z
  .object({
    members: z
      .array(
        z.object({
          userId: uuidSchema,
          role: memberRoleSchema,
        })
      )
      .min(1, 'At least one member required')
      .max(100, 'Maximum 100 members per bulk operation'),
  })
  .strict();

/**
 * Bulk Delete Departments Schema
 */
export const bulkDeleteSchema = z
  .object({
    ids: z
      .array(uuidSchema)
      .min(1, 'At least one ID required')
      .max(50, 'Maximum 50 IDs per bulk operation'),
  })
  .strict();

/**
 * Bulk Update Departments Schema
 */
export const bulkUpdateSchema = z
  .object({
    updates: z
      .array(
        z.object({
          id: uuidSchema,
          data: updateDepartmentSchema,
        })
      )
      .min(1, 'At least one update required')
      .max(50, 'Maximum 50 updates per bulk operation'),
  })
  .strict();

/**
 * Search Departments Schema
 */
export const searchDepartmentsSchema = z
  .object({
    q: z.string().min(1, 'Search query required').max(100).trim(),
    type: departmentTypeSchema.optional(),
    tenantId: uuidSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .merge(paginationSchema);

/**
 * Department Metrics Query Schema
 */
export const metricsQuerySchema = z
  .object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    interval: z.enum(['daily', 'weekly', 'monthly']).default('daily').optional(),
  })
  .strict();

/**
 * Compare Departments Schema
 */
export const compareDepartmentsSchema = z
  .object({
    ids: z
      .array(uuidSchema)
      .min(2, 'At least 2 departments required for comparison')
      .max(5, 'Maximum 5 departments per comparison'),
    metric: z
      .enum(['members', 'activity', 'performance'])
      .default('members')
      .optional(),
  })
  .strict();

/**
 * Export Format Schema
 */
export const exportFormatSchema = z
  .object({
    format: z.enum(['csv', 'json', 'excel', 'pdf']).default('json'),
  })
  .strict();

/**
 * Department Hierarchy Schema
 */
export const departmentHierarchySchema = z
  .object({
    parentId: uuidSchema.optional().nullable(),
    level: z.number().int().min(0).max(10).default(0).optional(),
  })
  .strict();

/**
 * Move Department Schema
 */
export const moveDepartmentSchema = z
  .object({
    newParentId: uuidSchema.optional().nullable(),
  })
  .strict();

/**
 * Department Template Schema
 */
export const departmentTemplateSchema = z
  .object({
    templateId: uuidSchema,
    customizations: z.record(z.any()).optional(),
  })
  .strict();

/**
 * Approval Request Schema
 */
export const approvalRequestSchema = z
  .object({
    action: z.enum(['add_member', 'remove_member', 'change_role', 'update_settings', 'deactivate']),
    actionData: z.record(z.any()),
    reason: z.string().min(10, 'Reason must be at least 10 characters').max(500).optional(),
  })
  .strict();

/**
 * Approval Response Schema
 */
export const approvalResponseSchema = z
  .object({
    approved: z.boolean(),
    reason: z.string().max(500).optional(),
  })
  .strict();

/**
 * Webhook Configuration Schema
 */
export const webhookConfigSchema = z
  .object({
    url: z.string().url('Invalid webhook URL'),
    events: z
      .array(
        z.enum([
          'department.created',
          'department.updated',
          'department.deleted',
          'member.added',
          'member.removed',
          'member.role_changed',
        ])
      )
      .min(1, 'At least one event required'),
    secret: z.string().min(16, 'Webhook secret must be at least 16 characters').optional(),
    isActive: z.boolean().default(true).optional(),
  })
  .strict();

/**
 * Type exports for use in services and routes
 */
export type DepartmentType = z.infer<typeof departmentTypeSchema>;
export type MemberRole = z.infer<typeof memberRoleSchema>;
export type CreateDepartmentRequest = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentRequest = z.infer<typeof updateDepartmentSchema>;
export type DepartmentFilter = z.infer<typeof departmentFilterSchema>;
export type AddMemberRequest = z.infer<typeof addMemberSchema>;
export type UpdateMemberRoleRequest = z.infer<typeof updateMemberRoleSchema>;
export type PaginationParams = z.infer<typeof paginationSchema>;
export type BulkCreateDepartmentsRequest = z.infer<typeof bulkCreateDepartmentsSchema>;
export type BulkAddMembersRequest = z.infer<typeof bulkAddMembersSchema>;
export type BulkDeleteRequest = z.infer<typeof bulkDeleteSchema>;
export type BulkUpdateRequest = z.infer<typeof bulkUpdateSchema>;
export type SearchDepartmentsQuery = z.infer<typeof searchDepartmentsSchema>;
export type MetricsQuery = z.infer<typeof metricsQuerySchema>;
export type CompareDepartmentsQuery = z.infer<typeof compareDepartmentsSchema>;
export type ExportFormat = z.infer<typeof exportFormatSchema>;
export type DepartmentHierarchy = z.infer<typeof departmentHierarchySchema>;
export type MoveDepartmentRequest = z.infer<typeof moveDepartmentSchema>;
export type DepartmentTemplateRequest = z.infer<typeof departmentTemplateSchema>;
export type ApprovalRequest = z.infer<typeof approvalRequestSchema>;
export type ApprovalResponse = z.infer<typeof approvalResponseSchema>;
export type WebhookConfig = z.infer<typeof webhookConfigSchema>;
