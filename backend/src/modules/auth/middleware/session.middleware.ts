/**
 * Session Middleware (Better-Auth)
 *
 * Middleware para validar sessões usando Better-Auth
 * Injeta informações do usuário no contexto da requisição
 */

import { Elysia } from 'elysia';
import { auth } from '../services/auth.config';
import { UnauthorizedError, ForbiddenError } from '../../../utils/errors';
import { getUserRoles } from '../../security/services/role.service';
import { getUserPrimaryTenantId } from '../../tenants/services/membership.service';

/**
 * Session Guard
 *
 * Valida sessão do Better-Auth e injeta user no contexto
 * Throws UnauthorizedError se não autenticado
 */
export const sessionGuard = new Elysia({ name: 'session-guard' })
  .derive({ as: 'scoped' }, async ({ request, set }) => {
    try {
      const session = await auth.api.getSession({ headers: request.headers });

      if (!session || !session.user) {
        set.status = 401;
        throw new UnauthorizedError('Not authenticated');
      }

      return {
        user: session.user,
        session: session.session,
      };
    } catch {
      set.status = 401;
      throw new UnauthorizedError('Invalid or expired session');
    }
  });

/**
 * Optional Session Guard
 *
 * Tenta obter sessão, mas não falha se não existir
 * Útil para endpoints que funcionam com ou sem autenticação
 */
export const optionalSessionGuard = new Elysia({ name: 'optional-session-guard' })
  .derive({ as: 'scoped' }, async ({ request }) => {
    try {
      const session = await auth.api.getSession({ headers: request.headers });

      return {
        user: session?.user || null,
        session: session?.session || null,
      };
    } catch {
      return {
        user: null,
        session: null,
      };
    }
  });

/**
 * Role Guard
 *
 * Valida que o usuário tem a role necessária
 * Deve ser usado DEPOIS do sessionGuard
 */
export const requireRole = (allowedRoles: string | string[]) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return new Elysia({ name: `role-guard-${roles.join('-')}` })
    .derive({ as: 'scoped' }, async (context: any) => {
      const { user, set } = context;

      if (!user) {
        set.status = 401;
        throw new UnauthorizedError('Authentication required');
      }

      // Fetch user roles from database
      const userRoles = await getUserRoles(user.id);

      // Check if user has any of the allowed roles
      const hasRole = userRoles.some((role) => roles.includes(role));

      if (!hasRole) {
        set.status = 403;
        throw new ForbiddenError(`Required role: ${roles.join(' or ')}`);
      }

      return {
        userRoles, // Expose roles to route handlers
      };
    });
};

/**
 * Email Verified Guard
 *
 * Valida que o email do usuário foi verificado
 */
export const requireVerifiedEmail = new Elysia({ name: 'verified-email-guard' })
  .derive({ as: 'scoped' }, (context: any) => {
    const { user, set } = context;

    if (!user) {
      set.status = 401;
      throw new UnauthorizedError('Authentication required');
    }

    if (!user.emailVerified) {
      set.status = 403;
      throw new ForbiddenError('Email verification required');
    }

    return {};
  });

/**
 * Tenant Guard
 *
 * Valida que o usuário pertence a um tenant
 * Útil para recursos multi-tenant
 */
export const requireTenant = new Elysia({ name: 'tenant-guard' })
  .derive({ as: 'scoped' }, async (context: any) => {
    const { user, set } = context;

    if (!user) {
      set.status = 401;
      throw new UnauthorizedError('Authentication required');
    }

    // Fetch user's primary tenant from database
    const tenantId = await getUserPrimaryTenantId(user.id);

    if (!tenantId) {
      set.status = 403;
      throw new ForbiddenError('User must belong to a tenant');
    }

    return {
      tenantId,
    };
  });
