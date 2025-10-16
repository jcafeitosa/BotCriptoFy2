/**
 * Tenant Routes
 * Routes for tenant management and membership
 */

import { Elysia, t } from 'elysia';
import { sessionGuard } from '../../auth/middleware/session.middleware';
import {
  getTenantById,
  getUserTenants,
  getTenantMembers,
  addTenantMember,
  removeTenantMember,
  promoteToCEO,
  getCompanyTenant,
} from '../services/tenant.service';

/**
 * Tenant routes plugin
 */
export const tenantRoutes = new Elysia({ prefix: '/api/tenants', name: 'tenant-routes' })
  .use(sessionGuard)

  // Get all user's tenants
  .get(
    '/me',
    async ({ user }) => {
      const tenants = await getUserTenants(user.id);
      return {
        success: true,
        data: tenants.map(t => ({
          tenant: t.tenant,
          role: t.membership.role,
          status: t.membership.status,
          joinedAt: t.membership.joinedAt,
        })),
      };
    },
    {
      detail: {
        tags: ['Tenants'],
        summary: 'Get my tenants',
        description: 'Get all tenants the current user is a member of',
      },
    }
  )

  // Get tenant by ID
  .get(
    '/:id',
    async ({ params }) => {
      const tenant = await getTenantById(params.id);
      return { success: true, data: tenant };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ['Tenants'],
        summary: 'Get tenant by ID',
        description: 'Get tenant details by ID',
      },
    }
  )

  // Get tenant members
  .get(
    '/:id/members',
    async ({ params }) => {
      const members = await getTenantMembers(params.id);
      return { success: true, data: members };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ['Tenants'],
        summary: 'Get tenant members',
        description: 'Get all members of a tenant',
      },
    }
  )

  // Add member to tenant
  .post(
    '/:id/members',
    async ({ params, body }) => {
      const member = await addTenantMember(
        params.id,
        body.userId,
        body.role,
        body.permissions
      );
      return { success: true, data: member };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        userId: t.String(),
        role: t.String(),
        permissions: t.Optional(t.Record(t.String(), t.Any())),
      }),
      detail: {
        tags: ['Tenants'],
        summary: 'Add member to tenant',
        description: 'Add a user as a member of a tenant',
      },
    }
  )

  // Remove member from tenant
  .delete(
    '/:id/members/:userId',
    async ({ params }) => {
      const result = await removeTenantMember(params.id, params.userId);
      return { success: true, data: result };
    },
    {
      params: t.Object({
        id: t.String(),
        userId: t.String(),
      }),
      detail: {
        tags: ['Tenants'],
        summary: 'Remove member from tenant',
        description: 'Remove a user from a tenant',
      },
    }
  )

  // **SPECIAL ENDPOINT**: Promote current user to CEO
  // This endpoint is for initial setup/onboarding
  .post(
    '/promote-me-to-ceo',
    async ({ user }) => {
      const result = await promoteToCEO(user.id);
      return {
        success: true,
        message: `User ${result.action} as CEO of company tenant`,
        data: {
          tenant: result.tenant,
          role: result.membership.role,
          action: result.action,
        },
      };
    },
    {
      detail: {
        tags: ['Tenants'],
        summary: '[SETUP] Promote to CEO',
        description: 'Promote current user to CEO of the company tenant (for initial setup)',
      },
    }
  )

  // Get company tenant info
  .get(
    '/company/info',
    async () => {
      const tenant = await getCompanyTenant();
      return { success: true, data: tenant };
    },
    {
      detail: {
        tags: ['Tenants'],
        summary: 'Get company tenant',
        description: 'Get the company tenant information',
      },
    }
  );
