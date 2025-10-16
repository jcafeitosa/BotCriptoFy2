/**
 * Department Routes
 * Routes for department management
 */

import { Elysia, t } from 'elysia';
import { sessionGuard } from '../../auth/middleware/session.middleware';
import {
  getAllDepartments,
  getDepartmentById,
  getDepartmentBySlug,
  getDepartmentsByTenant,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  toggleDepartmentStatus,
} from '../services/department.service';

/**
 * Department routes plugin
 */
export const departmentRoutes = new Elysia({ prefix: '/api/departments', name: 'department-routes' })
  .use(sessionGuard)

  // Get all departments with optional filters
  .get(
    '/',
    async ({ query }) => {
      const departments = await getAllDepartments({
        tenantId: query.tenantId,
        type: query.type as any,
        isActive: query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined,
      });

      return {
        success: true,
        data: departments,
        total: departments.length,
      };
    },
    {
      query: t.Object({
        tenantId: t.Optional(t.String({ description: 'Filter by tenant ID' })),
        type: t.Optional(t.String({ description: 'Filter by department type' })),
        isActive: t.Optional(t.String({ description: 'Filter by active status (true/false)' })),
      }),
      detail: {
        tags: ['Departments'],
        summary: 'List departments',
        description: 'Get list of all departments with optional filters',
      },
    }
  )

  // Get department by ID
  .get(
    '/:id',
    async ({ params }) => {
      const department = await getDepartmentById(params.id);
      return { success: true, data: department };
    },
    {
      params: t.Object({
        id: t.String({ description: 'Department ID' }),
      }),
      detail: {
        tags: ['Departments'],
        summary: 'Get department by ID',
        description: 'Get department details by ID',
      },
    }
  )

  // Get departments by tenant
  .get(
    '/tenant/:tenantId',
    async ({ params }) => {
      const departments = await getDepartmentsByTenant(params.tenantId);
      return {
        success: true,
        data: departments,
        total: departments.length,
      };
    },
    {
      params: t.Object({
        tenantId: t.String({ description: 'Tenant ID' }),
      }),
      detail: {
        tags: ['Departments'],
        summary: 'Get departments by tenant',
        description: 'Get all departments for a specific tenant',
      },
    }
  )

  // Get department by slug
  .get(
    '/tenant/:tenantId/slug/:slug',
    async ({ params }) => {
      const department = await getDepartmentBySlug(params.tenantId, params.slug);
      return { success: true, data: department };
    },
    {
      params: t.Object({
        tenantId: t.String({ description: 'Tenant ID' }),
        slug: t.String({ description: 'Department slug' }),
      }),
      detail: {
        tags: ['Departments'],
        summary: 'Get department by slug',
        description: 'Get department by slug within a tenant',
      },
    }
  )

  // Create department
  .post(
    '/',
    async ({ body }) => {
      const department = await createDepartment(body);
      return {
        success: true,
        message: 'Department created successfully',
        data: department,
      };
    },
    {
      body: t.Object({
        tenantId: t.String({ description: 'Tenant ID' }),
        name: t.String({ description: 'Department name' }),
        slug: t.String({ description: 'Department slug (unique within tenant)' }),
        description: t.Optional(t.String({ description: 'Department description' })),
        type: t.Union(
          [
            t.Literal('ceo'),
            t.Literal('financial'),
            t.Literal('marketing'),
            t.Literal('sales'),
            t.Literal('security'),
            t.Literal('sac'),
            t.Literal('audit'),
            t.Literal('documents'),
            t.Literal('configurations'),
            t.Literal('subscriptions'),
          ],
          { description: 'Department type' }
        ),
        settings: t.Optional(t.Record(t.String(), t.Any(), { description: 'Department settings' })),
        metadata: t.Optional(t.Record(t.String(), t.Any(), { description: 'Department metadata' })),
      }),
      detail: {
        tags: ['Departments'],
        summary: 'Create department',
        description: 'Create a new department',
      },
    }
  )

  // Update department
  .put(
    '/:id',
    async ({ params, body }) => {
      const department = await updateDepartment(params.id, body);
      return {
        success: true,
        message: 'Department updated successfully',
        data: department,
      };
    },
    {
      params: t.Object({
        id: t.String({ description: 'Department ID' }),
      }),
      body: t.Object({
        name: t.Optional(t.String({ description: 'Department name' })),
        slug: t.Optional(t.String({ description: 'Department slug' })),
        description: t.Optional(t.String({ description: 'Department description' })),
        isActive: t.Optional(t.Boolean({ description: 'Active status' })),
        settings: t.Optional(t.Record(t.String(), t.Any(), { description: 'Department settings' })),
        metadata: t.Optional(t.Record(t.String(), t.Any(), { description: 'Department metadata' })),
      }),
      detail: {
        tags: ['Departments'],
        summary: 'Update department',
        description: 'Update department details',
      },
    }
  )

  // Delete department
  .delete(
    '/:id',
    async ({ params }) => {
      await deleteDepartment(params.id);
      return {
        success: true,
        message: 'Department deleted successfully',
      };
    },
    {
      params: t.Object({
        id: t.String({ description: 'Department ID' }),
      }),
      detail: {
        tags: ['Departments'],
        summary: 'Delete department',
        description: 'Delete a department',
      },
    }
  )

  // Toggle department status
  .patch(
    '/:id/toggle-status',
    async ({ params }) => {
      const department = await toggleDepartmentStatus(params.id);
      return {
        success: true,
        message: `Department ${department.isActive ? 'activated' : 'deactivated'} successfully`,
        data: department,
      };
    },
    {
      params: t.Object({
        id: t.String({ description: 'Department ID' }),
      }),
      detail: {
        tags: ['Departments'],
        summary: 'Toggle department status',
        description: 'Activate or deactivate a department',
      },
    }
  );
