/**
 * Guards Middleware
 *
 * Re-exports authentication and authorization guards from the auth module.
 * This file maintains backward compatibility with existing imports.
 *
 * @deprecated Import directly from '@/modules/auth' instead
 */

export {
  authGuard,
  optionalAuthGuard,
  requireRole,
  requireTenant,
  requireVerifiedEmail,
} from '../modules/auth/middleware/guards';
