/**
 * Better-Auth Routes
 *
 * Rotas de autenticação usando Better-Auth
 * Todas as rotas de auth são gerenciadas pelo Better-Auth handler
 */

import { Elysia } from 'elysia';
import { auth } from '../services/auth.config';

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
  );
