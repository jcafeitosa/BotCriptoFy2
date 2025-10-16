/**
 * Tenant Types
 * Type definitions for multi-tenant system
 */

/**
 * Tenant Types
 * - empresa: Company tenant (1:N - one company, many employees)
 * - trader: Individual trader tenant (1:1)
 * - influencer: Influencer tenant (1:1)
 */
export type TenantType = 'empresa' | 'trader' | 'influencer';

/**
 * Tenant Status
 */
export type TenantStatus = 'active' | 'inactive' | 'suspended';

/**
 * Tenant Member Status
 */
export type TenantMemberStatus = 'active' | 'inactive' | 'suspended';

/**
 * Tenant Member Roles
 * Complete set of roles as documented in docs/security/README.md
 */
export type TenantRole =
  | 'ceo'           // CEO of the system/company
  | 'admin'         // Administrator
  | 'funcionario'   // Employee
  | 'trader'        // Trader
  | 'influencer'    // Influencer
  | 'manager'       // Manager
  | 'viewer';       // View-only access

/**
 * Tenant Settings
 */
export interface TenantSettings {
  timezone?: string;
  language?: string;
  currency?: string;
  features?: Record<string, boolean>;
  limits?: {
    maxUsers?: number;
    maxBots?: number;
    maxOrders?: number;
  };
}

/**
 * Tenant Metadata
 */
export interface TenantMetadata {
  industry?: string;
  companySize?: string;
  country?: string;
  [key: string]: any;
}

/**
 * Tenant Member Permissions
 */
export interface TenantMemberPermissions {
  canManageUsers?: boolean;
  canManageBots?: boolean;
  canTrade?: boolean;
  canViewReports?: boolean;
  canManageSettings?: boolean;
  [key: string]: any;
}

/**
 * Tenant with member info (for JOIN queries)
 */
export interface TenantWithMember {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  tenantType: TenantType;
  tenantStatus: TenantStatus;
  memberRole: TenantRole;
  memberStatus: TenantMemberStatus;
  memberPermissions: TenantMemberPermissions;
  joinedAt: Date;
}
