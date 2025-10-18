/**
 * Tenant Routes
 * Routes for tenant management and membership
 */

import { Elysia, t } from 'elysia';
import { sessionGuard } from '../../auth/middleware/session.middleware';
import { ensureTenantMember, ensureTenantAdmin } from '../services/tenant.service';
import { TENANT_ROLES } from '../types/tenant.types';
import {
  getTenantById,
  getUserTenants,
  getTenantMembers,
  addTenantMember,
  removeTenantMember,
  promoteToCEO,
  getCompanyTenant,
} from '../services/tenant.service';
import { TenantsCacheService } from '../services/tenant-cache.service';

/**
 * Tenant routes plugin
 */
export const tenantRoutes = new Elysia({ prefix: '/api/v1/tenants', name: 'tenant-routes' })
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
    async ({ params, user }) => {
      await ensureTenantMember(params.id, user.id);
      const tenant = await TenantsCacheService.getTenant(params.id);
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
    async ({ params, user, query }) => {
      await ensureTenantAdmin(params.id, user.id);
      const page = query.page ?? 1;
      const limit = query.limit ?? 50;
      const result = await getTenantMembersPaginated(params.id, page, limit);
      return { success: true, data: result.data, pagination: result.pagination };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      query: t.Object({
        page: t.Optional(t.Number()),
        limit: t.Optional(t.Number()),
      }),
      detail: {
        tags: ['Tenants'],
        summary: 'Get tenant members',
        description: 'Get tenant members with pagination',
      },
    }
  )

  // Add member to tenant
  .post(
    '/:id/members',
    async ({ params, body, user }) => {
      await ensureTenantAdmin(params.id, user.id);
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
      body: (() => {
        const roleLiterals = (TENANT_ROLES as readonly string[]).map((r) => t.Literal(r));
        return t.Object({
          userId: t.String({ minLength: 3 }),
          role: t.Union(roleLiterals as any),
          permissions: t.Optional(t.Record(t.String(), t.Any())),
        });
      })(),
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
    async ({ params, user }) => {
      await ensureTenantAdmin(params.id, user.id);
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
    async ({ user }) => {
      const tenant = await TenantsCacheService.getCompanyTenant();
      // Require membership to view company tenant details
      await ensureTenantMember(tenant.id, user.id);
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
