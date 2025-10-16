/**
 * Auth Types
 *
 * TypeScript types for authentication module
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import {
  users,
  sessions,
  accounts,
  verifications,
  twoFactor,
  userRoles,
  passkeys,
} from '../schema/auth.schema';

/**
 * User Types
 */
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

/**
 * Session Types
 */
export type Session = InferSelectModel<typeof sessions>;
export type NewSession = InferInsertModel<typeof sessions>;

/**
 * Account Types
 */
export type Account = InferSelectModel<typeof accounts>;
export type NewAccount = InferInsertModel<typeof accounts>;

/**
 * Verification Types
 */
export type Verification = InferSelectModel<typeof verifications>;
export type NewVerification = InferInsertModel<typeof verifications>;

/**
 * Two Factor Types
 */
export type TwoFactor = InferSelectModel<typeof twoFactor>;
export type NewTwoFactor = InferInsertModel<typeof twoFactor>;

/**
 * User Role Types
 */
export type UserRole = InferSelectModel<typeof userRoles>;
export type NewUserRole = InferInsertModel<typeof userRoles>;

/**
 * Passkey Types
 */
export type Passkey = InferSelectModel<typeof passkeys>;
export type NewPasskey = InferInsertModel<typeof passkeys>;

/**
 * Role Enum
 */
export enum Role {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  USER = 'user',
  VIEWER = 'viewer',
}

/**
 * Auth Context
 *
 * Context injected by auth middleware
 */
export interface AuthContext {
  user: User;
  session: Session;
}

/**
 * Optional Auth Context
 *
 * Context injected by optional auth middleware
 */
export interface OptionalAuthContext {
  user: User | null;
  session: Session | null;
}

/**
 * User with Role
 *
 * Extended user type with role information
 */
export interface UserWithRole extends User {
  role: Role;
  tenantId?: string;
}

/**
 * Session with User
 *
 * Session with populated user data
 */
export interface SessionWithUser extends Session {
  user: User;
}

/**
 * Auth Response Types
 */
export interface SignUpResponse {
  success: boolean;
  user?: User;
  session?: Session;
  error?: string;
}

export interface SignInResponse {
  success: boolean;
  user?: User;
  session?: Session;
  error?: string;
}

export interface SignOutResponse {
  success: boolean;
}

export interface SessionResponse {
  authenticated: boolean;
  user: User | null;
  session: Session | null;
}

/**
 * Auth Error Types
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class InvalidCredentialsError extends AuthError {
  constructor(message = 'Invalid email or password') {
    super(message, 'INVALID_CREDENTIALS', 401);
  }
}

export class EmailNotVerifiedError extends AuthError {
  constructor(message = 'Email not verified') {
    super(message, 'EMAIL_NOT_VERIFIED', 403);
  }
}

export class SessionExpiredError extends AuthError {
  constructor(message = 'Session expired') {
    super(message, 'SESSION_EXPIRED', 401);
  }
}

export class TwoFactorRequiredError extends AuthError {
  constructor(message = 'Two-factor authentication required') {
    super(message, 'TWO_FACTOR_REQUIRED', 403);
  }
}
