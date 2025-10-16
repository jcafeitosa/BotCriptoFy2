/**
 * Auth Module
 *
 * Authentication and authorization using Better-Auth
 *
 * Features:
 * - Email & Password authentication
 * - Session management
 * - Email verification
 * - Password reset
 * - Two-factor authentication
 * - Passkeys/WebAuthn
 * - Social login (Google, GitHub)
 * - Role-based access control
 * - Multi-tenant support
 *
 * @see https://www.better-auth.com/docs
 */

// Configuration
export { auth, authHandler, authApi } from './services/auth.config';

// Services
export {
  getUserPrimaryRole,
  getUserRoles,
  getUserPrimaryTenantId,
  getUserTenantIds,
  userHasRole,
  userIsMemberOfTenant,
} from './services/session.service';

// Routes
export { authRoutes, authCustomRoutes } from './routes/auth.routes';
export { adminAuthRoutes } from './routes/admin.routes';
export { devAuthRoutes } from './routes/dev.routes';

// Middleware & Guards
export {
  sessionGuard,
  optionalSessionGuard,
  requireRole,
  requireVerifiedEmail,
  requireTenant,
} from './middleware/session.middleware';

// Backward compatibility with old guards
export {
  authGuard,
  optionalAuthGuard,
} from './middleware/guards';

// Types
export type {
  User,
  NewUser,
  Session,
  NewSession,
  Account,
  NewAccount,
  Verification,
  UserRole,
  NewUserRole,
  Passkey,
  AuthContext,
  OptionalAuthContext,
  UserWithRole,
  SessionWithUser,
  SignUpResponse,
  SignInResponse,
  SignOutResponse,
  SessionResponse,
} from './types/auth.types';

export {
  Role,
  AuthError,
  InvalidCredentialsError,
  EmailNotVerifiedError,
  SessionExpiredError,
  TwoFactorRequiredError,
} from './types/auth.types';

// Schema
export {
  users,
  sessions,
  accounts,
  verifications,
  twoFactor,
  userRoles,
  passkeys,
} from './schema/auth.schema';
