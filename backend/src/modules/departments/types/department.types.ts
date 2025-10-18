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
  parentId?: string | null;
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
  parentId?: string | null;
}

/**
 * Department Filter
 */
export interface DepartmentFilter {
  tenantId?: string;
  type?: DepartmentType;
  isActive?: boolean;
  search?: string;
}

/**
 * Department Member Role
 */
export type MemberRole = 'manager' | 'member' | 'viewer';

/**
 * Add Member Request
 */
export interface AddMemberRequest {
  departmentId: string;
  userId: string;
  role: MemberRole;
  assignedBy: string;
}

/**
 * Update Member Role Request
 */
export interface UpdateMemberRoleRequest {
  departmentId: string;
  userId: string;
  role: MemberRole;
}

export interface DepartmentHierarchyNode {
  id: string;
  name: string;
  slug: string;
  type: DepartmentType;
  isActive: boolean;
  parentId: string | null;
  level: number;
  path: string[];
  children: DepartmentHierarchyNode[];
  stats?: {
    totalMembers: number;
    activeMembers: number;
    managerCount: number;
  };
}

export interface DepartmentSummary {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  type: DepartmentType;
  description?: string | null;
  isActive: boolean;
  parentId: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  totals: {
    members: number;
    activeMembers: number;
    inactiveMembers: number;
    managers: number;
  };
  trends: {
    newMembers30d: number;
    churn30d: number;
  };
  metadata?: Record<string, any>;
}

export interface DepartmentInsight {
  department: DepartmentSummary;
  crossDepartmentMembers: number;
  multiDepartmentMembers: Array<{
    userId: string;
    departmentCount: number;
  }>;
  roleDistribution: Array<{ role: MemberRole; count: number }>;
  recentMembers: Array<{
    userId: string;
    role: MemberRole;
    assignedAt: Date | null;
    isActive: boolean;
  }>;
}
