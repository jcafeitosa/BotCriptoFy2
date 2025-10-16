/**
 * User Routes
 * Routes for user profile and management
 */

import { Elysia, t } from 'elysia';
import { sessionGuard } from '../../auth/middleware/session.middleware';
import { getUserProfile, getUserTenants } from '../services/user.service';
import { db } from '@/db';
import { sessions } from '../../auth/schema/auth.schema';
import { eq } from 'drizzle-orm';
import { BadRequestError, NotFoundError } from '@/utils/errors';

/**
 * User routes plugin
 */
export const userRoutes = new Elysia({ prefix: '/api/user', name: 'user-routes' })
  .use(sessionGuard)
  .get(
    '/profile',
    async ({ user, session }) => {
      // sessionGuard ensures user is authenticated
      // Get activeTenantId from session (stored as activeOrganizationId in Better-Auth)
      const activeTenantId = (session as any)?.activeOrganizationId || undefined;
      const profile = await getUserProfile(user.id, activeTenantId);
      return profile;
    },
    {
      detail: {
        tags: ['User'],
        summary: 'Get user profile',
        description: 'Get current user profile with role and profile type',
      },
      response: {
        200: t.Object({
          // Core identity
          userId: t.String({ description: 'User ID' }),
          role: t.String({ description: 'User role (ceo, admin, funcionario, trader, influencer, manager, viewer)' }),
          profileType: t.String({ description: 'Profile type (company, trader, influencer)' }),
          isActive: t.Boolean({ description: 'Whether user is active' }),
          // User data
          name: t.String({ description: 'User full name' }),
          email: t.String({ description: 'User email address' }),
          emailVerified: t.Boolean({ description: 'Whether email is verified' }),
          image: t.Optional(t.String({ description: 'User profile image URL' })),
          // Tenant info
          tenantId: t.Optional(t.String({ description: 'Tenant ID' })),
          tenantName: t.Optional(t.String({ description: 'Tenant name' })),
          tenantStatus: t.Optional(t.String({ description: 'Tenant status (active, inactive, suspended)' })),
          // Member-specific
          permissions: t.Optional(t.Record(t.String(), t.Any(), { description: 'User permissions within tenant' })),
          joinedAt: t.Optional(t.Date({ description: 'Date when user joined the tenant' })),
          // Legacy/optional
          phone: t.Optional(t.String({ description: 'User phone number' })),
          avatar: t.Optional(t.String({ description: 'User avatar URL' })),
        }),
      },
    }
  )

  // List all tenants for current user
  .get(
    '/tenants',
    async ({ user }) => {
      const tenants = await getUserTenants(user.id);
      return {
        success: true,
        data: tenants,
        total: tenants.length,
      };
    },
    {
      detail: {
        tags: ['User'],
        summary: 'List user tenants',
        description: 'Get list of all tenants where user is a member',
      },
    }
  )

  // Switch active tenant
  .post(
    '/switch-tenant',
    async ({ user, session, body }) => {
      // Verify user is member of the tenant
      const userTenants = await getUserTenants(user.id);
      const targetTenant = userTenants.find((t) => t.id === body.tenantId);

      if (!targetTenant) {
        throw new NotFoundError('Tenant not found or user is not a member', {
          tenantId: body.tenantId,
        });
      }

      // Update session with new active tenant
      if (!session?.id) {
        throw new BadRequestError('No active session found');
      }

      await db
        .update(sessions)
        .set({
          activeOrganizationId: body.tenantId,
          updatedAt: new Date(),
        })
        .where(eq(sessions.id, session.id));

      // Get updated profile with new tenant
      const profile = await getUserProfile(user.id, body.tenantId);

      return {
        success: true,
        message: 'Tenant switched successfully',
        data: {
          activeTenant: {
            id: targetTenant.id,
            name: targetTenant.name,
            type: targetTenant.type,
            profileType: targetTenant.profileType,
          },
          profile,
        },
      };
    },
    {
      body: t.Object({
        tenantId: t.String({ description: 'Tenant ID to switch to' }),
      }),
      detail: {
        tags: ['User'],
        summary: 'Switch active tenant',
        description: 'Switch the active tenant context for the current session',
      },
    }
  )

  // Get active tenant
  .get(
    '/active-tenant',
    async ({ user, session }) => {
      const activeTenantId = (session as any)?.activeOrganizationId;

      if (!activeTenantId) {
        // No active tenant set, return user's first tenant
        const tenants = await getUserTenants(user.id);
        if (tenants.length === 0) {
          return {
            success: false,
            message: 'User has no tenant memberships',
            data: null,
          };
        }

        return {
          success: true,
          message: 'No active tenant set, showing first tenant',
          data: {
            id: tenants[0].id,
            name: tenants[0].name,
            type: tenants[0].type,
            profileType: tenants[0].profileType,
            isDefault: true,
          },
        };
      }

      // Get active tenant details
      const tenants = await getUserTenants(user.id);
      const activeTenant = tenants.find((t) => t.id === activeTenantId);

      if (!activeTenant) {
        throw new NotFoundError('Active tenant not found', {
          tenantId: activeTenantId,
        });
      }

      return {
        success: true,
        data: {
          id: activeTenant.id,
          name: activeTenant.name,
          type: activeTenant.type,
          profileType: activeTenant.profileType,
          role: activeTenant.role,
          memberStatus: activeTenant.status,
        },
      };
    },
    {
      detail: {
        tags: ['User'],
        summary: 'Get active tenant',
        description: 'Get the currently active tenant for the session',
      },
    }
  );
