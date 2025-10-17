/**
 * Department Membership Routes
 * Routes for managing department members
 */

import { Elysia, t } from 'elysia';
import { sessionGuard } from '../../auth/middleware/session.middleware';
import {
  addMemberToDepartment,
  removeMemberFromDepartment,
  updateMemberRole,
  getDepartmentMembers,
  getUserDepartments,
  toggleMemberStatus,
  isUserMemberOfDepartment,
  getMemberRole,
} from '../services/membership.service';

/**
 * Department membership routes
 */
export const membershipRoutes = new Elysia({ prefix: '/api/departments', name: 'department-membership-routes' })
  .use(sessionGuard)

  // Get department members
  .get(
    '/:id/members',
    async ({ params }) => {
      const members = await getDepartmentMembers(params.id);
      return {
        success: true,
        data: members,
        total: members.length,
      };
    },
    {
      params: t.Object({
        id: t.String({ description: 'Department ID' }),
      }),
      detail: {
        tags: ['Department Membership'],
        summary: 'Get department members',
        description: 'Get all members of a department with their roles',
      },
    }
  )

  // Get user departments
  .get(
    '/user/:userId/departments',
    async ({ params }) => {
      const departments = await getUserDepartments(params.userId);
      return {
        success: true,
        data: departments,
        total: departments.length,
      };
    },
    {
      params: t.Object({
        userId: t.String({ description: 'User ID' }),
      }),
      detail: {
        tags: ['Department Membership'],
        summary: 'Get user departments',
        description: 'Get all departments a user belongs to',
      },
    }
  )

  // Check if user is member
  .get(
    '/:id/members/:userId/check',
    async ({ params }) => {
      const isMember = await isUserMemberOfDepartment(params.userId, params.id);
      return {
        success: true,
        isMember,
      };
    },
    {
      params: t.Object({
        id: t.String({ description: 'Department ID' }),
        userId: t.String({ description: 'User ID' }),
      }),
      detail: {
        tags: ['Department Membership'],
        summary: 'Check membership',
        description: 'Check if user is member of department',
      },
    }
  )

  // Get member role
  .get(
    '/:id/members/:userId/role',
    async ({ params }) => {
      const role = await getMemberRole(params.userId, params.id);
      return {
        success: true,
        role,
      };
    },
    {
      params: t.Object({
        id: t.String({ description: 'Department ID' }),
        userId: t.String({ description: 'User ID' }),
      }),
      detail: {
        tags: ['Department Membership'],
        summary: 'Get member role',
        description: 'Get user role in department',
      },
    }
  )

  // Add member to department
  .post(
    '/:id/members',
    async ({ params, body, user }) => {
      const member = await addMemberToDepartment({
        departmentId: params.id,
        userId: body.userId,
        role: body.role,
        assignedBy: user.id,
      });
      return {
        success: true,
        message: 'Member added successfully',
        data: member,
      };
    },
    {
      params: t.Object({
        id: t.String({ description: 'Department ID' }),
      }),
      body: t.Object({
        userId: t.String({ description: 'User ID to add' }),
        role: t.Union([t.Literal('manager'), t.Literal('member'), t.Literal('viewer')], {
          description: 'Member role',
        }),
      }),
      detail: {
        tags: ['Department Membership'],
        summary: 'Add member',
        description: 'Add user to department with specified role',
      },
    }
  )

  // Remove member from department
  .delete(
    '/:id/members/:userId',
    async ({ params }) => {
      await removeMemberFromDepartment(params.id, params.userId);
      return {
        success: true,
        message: 'Member removed successfully',
      };
    },
    {
      params: t.Object({
        id: t.String({ description: 'Department ID' }),
        userId: t.String({ description: 'User ID to remove' }),
      }),
      detail: {
        tags: ['Department Membership'],
        summary: 'Remove member',
        description: 'Remove user from department',
      },
    }
  )

  // Update member role
  .put(
    '/:id/members/:userId/role',
    async ({ params, body }) => {
      const member = await updateMemberRole({
        departmentId: params.id,
        userId: params.userId,
        role: body.role,
      });
      return {
        success: true,
        message: 'Member role updated successfully',
        data: member,
      };
    },
    {
      params: t.Object({
        id: t.String({ description: 'Department ID' }),
        userId: t.String({ description: 'User ID' }),
      }),
      body: t.Object({
        role: t.Union([t.Literal('manager'), t.Literal('member'), t.Literal('viewer')], {
          description: 'New role',
        }),
      }),
      detail: {
        tags: ['Department Membership'],
        summary: 'Update member role',
        description: 'Change user role in department',
      },
    }
  )

  // Toggle member status
  .patch(
    '/:id/members/:userId/toggle-status',
    async ({ params }) => {
      const member = await toggleMemberStatus(params.id, params.userId);
      return {
        success: true,
        message: `Member ${member.isActive ? 'activated' : 'deactivated'} successfully`,
        data: member,
      };
    },
    {
      params: t.Object({
        id: t.String({ description: 'Department ID' }),
        userId: t.String({ description: 'User ID' }),
      }),
      detail: {
        tags: ['Department Membership'],
        summary: 'Toggle member status',
        description: 'Activate or deactivate department member',
      },
    }
  );
