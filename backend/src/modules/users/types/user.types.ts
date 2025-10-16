/**
 * User Profile Types
 */

export type ProfileType = 'company' | 'trader' | 'influencer';

/**
 * Complete set of user roles as documented in docs/security/README.md
 */
export type UserRole =
  | 'ceo'           // CEO of the system/company
  | 'admin'         // Administrator
  | 'funcionario'   // Employee
  | 'trader'        // Trader
  | 'influencer'    // Influencer
  | 'manager'       // Manager
  | 'viewer';       // View-only access

/**
 * User Profile with tenant membership information
 */
export interface UserProfile {
  // Core identity
  userId: string;
  role: UserRole;
  profileType: ProfileType;
  isActive: boolean;

  // User data (from users table)
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string;

  // Tenant info (from tenant_members JOIN tenants)
  tenantId?: string;
  tenantName?: string;
  tenantStatus?: string;

  // Member-specific data
  permissions?: Record<string, any>;
  joinedAt?: Date;

  // Legacy/optional fields
  phone?: string;
  avatar?: string;
}
