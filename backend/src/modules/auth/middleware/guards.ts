/**
 * Authentication Guards (Better-Auth)
 *
 * Guards de autenticação usando Better-Auth sessions
 * Substitui os guards JWT antigos
 *
 * @see https://www.better-auth.com/docs/concepts/session
 */

/**
 * Re-export session guards from session.middleware
 * Mantém compatibilidade com código antigo que importa guards
 */
export {
  sessionGuard as authGuard,
  optionalSessionGuard as optionalAuthGuard,
  requireRole,
  requireVerifiedEmail,
  requireTenant,
} from './session.middleware';
