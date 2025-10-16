/**
 * Department Types
 */

/**
 * Department type enum
 * Based on the 10 departments: CEO, Financial, Marketing, Sales, Security, SAC, Audit, Documents, Configurations, Subscriptions
 */
export type DepartmentType =
  | 'ceo'
  | 'financial'
  | 'marketing'
  | 'sales'
  | 'security'
  | 'sac'
  | 'audit'
  | 'documents'
  | 'configurations'
  | 'subscriptions';

/**
 * Create Department Request
 */
export interface CreateDepartmentRequest {
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  type: DepartmentType;
  settings?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Update Department Request
 */
export interface UpdateDepartmentRequest {
  name?: string;
  slug?: string;
  description?: string;
  isActive?: boolean;
  settings?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Department Filter
 */
export interface DepartmentFilter {
  tenantId?: string;
  type?: DepartmentType;
  isActive?: boolean;
}
