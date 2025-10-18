/**
 * Better-Auth Routes
 *
 * Rotas de autenticação usando Better-Auth
 * Todas as rotas de auth são gerenciadas pelo Better-Auth handler
 */

import { Elysia, t } from 'elysia';
import { auth } from '../services/auth.config';
import { db } from '@/db';
import { sessions, twoFactor } from '../schema/auth.schema';
import { sessionGuard } from '../middleware/session.middleware';
import { getUserRoles, getUserPrimaryRole } from '../../security/services/role.service';
import { userIsMemberOfTenant } from '../../tenants/services/membership.service';
import { setActiveOrganization } from '../services/session.service';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Auth Routes Plugin
 *
 * Processa todas as requisições de autenticação:
 * - POST /api/auth/sign-up/email
 * - POST /api/auth/sign-in/email
 * - POST /api/auth/sign-out
 * - GET  /api/auth/session
 * - POST /api/auth/verify-email
 * - POST /api/auth/forget-password
 * - POST /api/auth/reset-password
 * - POST /api/auth/update-user
 * - POST /api/auth/change-password
 * - POST /api/auth/two-factor/*
 * - E muito mais...
 *
 * @see https://www.better-auth.com/docs/concepts/api-reference
 * @see https://www.better-auth.com/docs/integrations/elysia
 */
export const authRoutes = new Elysia({ prefix: '/api/auth', name: 'auth-routes' })
  /**
   * Better-Auth handler usando .mount() conforme documentação oficial
   * Isso garante que o request body não seja consumido antes de chegar ao handler
   */
  .mount(auth.handler);

/**
 * Custom Auth Endpoints (Extensões)
 *
 * Endpoints customizados além dos fornecidos pelo Better-Auth
 */
export const authCustomRoutes = new Elysia({ prefix: '/api/auth', name: 'auth-custom-routes' })
  .get(
    '/me',
    async ({ request, set }) => {
      /**
       * Get current user session
       * Similar ao /api/auth/session, mas pode ser customizado
       */
      try {
        const session = await auth.api.getSession({ headers: request.headers });

        if (!session) {
          set.status = 401;
          return { success: false, error: 'Not authenticated' };
        }

        return {
          success: true,
          data: {
            user: session.user,
            session: session.session,
          },
        };
      } catch {
        set.status = 500;
        return { success: false, error: 'Failed to get session' };
      }
    },
    {
      detail: {
        tags: ['Auth'],
        summary: 'Get current user',
        description: 'Returns the current authenticated user and session',
      },
    }
  )
  .get(
    '/status',
    async ({ request }) => {
      /**
       * Check authentication status (without failing)
       */
      try {
        const session = await auth.api.getSession({ headers: request.headers });

        return {
          authenticated: !!session,
          user: session?.user || null,
        };
      } catch {
        return {
          authenticated: false,
          user: null,
        };
      }
    },
    {
      detail: {
        tags: ['Auth'],
        summary: 'Check auth status',
        description: 'Returns authentication status without throwing errors',
      },
    }
  )
  // =========================================
  // Sessions Management (Auth required)
  // =========================================
  .use(sessionGuard)
  .get(
    '/sessions',
    async ({ user }) => {
      const rows = await db
        .select({
          id: sessions.id,
          createdAt: sessions.createdAt,
          updatedAt: sessions.updatedAt,
          expiresAt: sessions.expiresAt,
          ipAddress: sessions.ipAddress,
          userAgent: sessions.userAgent,
          activeOrganizationId: sessions.activeOrganizationId,
        })
        .from(sessions)
        .where(eq(sessions.userId, user.id));

      return {
        success: true,
        total: rows.length,
        data: rows,
      };
    },
    {
      detail: {
        tags: ['Auth - Sessions'],
        summary: 'List active sessions',
        description: 'Lists all active sessions for the current user',
      },
    }
  )
  .post(
    '/sessions/revoke-others',
    async ({ user, session }) => {
      const res = await db
        .delete(sessions)
        .where(and(eq(sessions.userId, user.id), sql`${sessions.id} <> ${session.id}`));

      return {
        success: true,
        message: 'Other sessions revoked',
        count: (res as unknown as { rowCount?: number }).rowCount ?? undefined,
      };
    },
    {
      detail: {
        tags: ['Auth - Sessions'],
        summary: 'Revoke other sessions',
        description: 'Revokes all sessions except the current one',
      },
    }
  )
  .post(
    '/sessions/revoke/:sessionId',
    async ({ user, params }) => {
      const res = await db
        .delete(sessions)
        .where(and(eq(sessions.userId, user.id), eq(sessions.id, params.sessionId)));

      return {
        success: true,
        message: 'Session revoked (if existed)',
        count: (res as unknown as { rowCount?: number }).rowCount ?? undefined,
      };
    },
    {
      params: t.Object({ sessionId: t.String() }),
      detail: {
        tags: ['Auth - Sessions'],
        summary: 'Revoke a specific session',
        description: 'Revokes a specific session by id (owned by current user)',
      },
    }
  )
  // =========================================
  // Tenant switching (Auth required)
  // =========================================
  .post(
    '/tenant/switch',
    async ({ user, session, body, set }) => {
      const { tenantId } = body;
      const isMember = await userIsMemberOfTenant(user.id, tenantId);
      if (!isMember) {
        set.status = 403;
        return { success: false, error: 'User is not a member of this tenant' };
      }

      await setActiveOrganization(session.id, tenantId);
      return { success: true, activeOrganizationId: tenantId };
    },
    {
      body: t.Object({ tenantId: t.String() }),
      detail: {
        tags: ['Auth - Tenant'],
        summary: 'Switch active tenant',
        description: 'Sets the active organization (tenant) for the current session',
      },
    }
  )
  // =========================================
  // Roles and 2FA status (Auth required)
  // =========================================
  .get(
    '/roles',
    async ({ user }) => {
      const roles = await getUserRoles(user.id);
      const primaryRole = await getUserPrimaryRole(user.id);
      return { success: true, roles, primaryRole };
    },
    {
      detail: {
        tags: ['Auth - Security'],
        summary: 'Get user roles',
        description: 'Returns all roles and the primary role for the current user',
      },
    }
  )
  .get(
    '/two-factor/status',
    async ({ user }) => {
      const [row] = await db
        .select({ id: twoFactor.id })
        .from(twoFactor)
        .where(eq(twoFactor.userId, user.id))
        .limit(1);

      return { success: true, enabled: !!row };
    },
    {
      detail: {
        tags: ['Auth - Security'],
        summary: 'Two-factor status',
        description: 'Returns whether two-factor authentication is enabled for the user',
      },
    }
  );
