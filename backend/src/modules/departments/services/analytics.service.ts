/**
 * Department Analytics Service
 * Provides statistics and metrics for departments
 */

import { db } from '@/db';
import { departments, departmentMembers } from '../schema/departments.schema';
import { eq, and, sql, count } from 'drizzle-orm';

/**
 * Get department statistics
 */
export async function getDepartmentStats(departmentId: string) {
  // Get total members
  const [memberCount] = await db
    .select({ count: count() })
    .from(departmentMembers)
    .where(eq(departmentMembers.departmentId, departmentId));

  // Get active members
  const [activeMemberCount] = await db
    .select({ count: count() })
    .from(departmentMembers)
    .where(
      and(
        eq(departmentMembers.departmentId, departmentId),
        eq(departmentMembers.isActive, true)
      )
    );

  // Get members by role
  const membersByRole = await db
    .select({
      role: departmentMembers.role,
      count: count(),
    })
    .from(departmentMembers)
    .where(eq(departmentMembers.departmentId, departmentId))
    .groupBy(departmentMembers.role);

  return {
    totalMembers: memberCount?.count || 0,
    activeMembers: activeMemberCount?.count || 0,
    inactiveMembers: (memberCount?.count || 0) - (activeMemberCount?.count || 0),
    membersByRole: membersByRole.map((r) => ({
      role: r.role,
      count: Number(r.count),
    })),
  };
}

/**
 * Get tenant-wide department statistics
 */
export async function getTenantDepartmentStats(tenantId: string) {
  // Get total departments
  const [deptCount] = await db
    .select({ count: count() })
    .from(departments)
    .where(eq(departments.tenantId, tenantId));

  // Get active departments
  const [activeDeptCount] = await db
    .select({ count: count() })
    .from(departments)
    .where(
      and(eq(departments.tenantId, tenantId), eq(departments.isActive, true))
    );

  // Get departments by type
  const deptsByType = await db
    .select({
      type: departments.type,
      count: count(),
    })
    .from(departments)
    .where(eq(departments.tenantId, tenantId))
    .groupBy(departments.type);

  // Get total members across all departments
  const [totalMembers] = await db
    .select({ count: sql<number>`count(distinct ${departmentMembers.userId})` })
    .from(departmentMembers)
    .leftJoin(departments, eq(departmentMembers.departmentId, departments.id))
    .where(eq(departments.tenantId, tenantId));

  return {
    totalDepartments: deptCount?.count || 0,
    activeDepartments: activeDeptCount?.count || 0,
    inactiveDepartments: (deptCount?.count || 0) - (activeDeptCount?.count || 0),
    departmentsByType: deptsByType.map((d) => ({
      type: d.type,
      count: Number(d.count),
    })),
    totalUniqueMembers: Number(totalMembers?.count || 0),
  };
}

/**
 * Get department member activity summary
 */
export async function getDepartmentMemberActivity(departmentId: string) {
  const recentMembers = await db
    .select({
      userId: departmentMembers.userId,
      role: departmentMembers.role,
      assignedAt: departmentMembers.assignedAt,
    })
    .from(departmentMembers)
    .where(eq(departmentMembers.departmentId, departmentId))
    .orderBy(sql`${departmentMembers.assignedAt} DESC`)
    .limit(10);

  return {
    recentMembers,
    recentMemberCount: recentMembers.length,
  };
}

/**
 * Get user department summary
 */
export async function getUserDepartmentSummary(userId: string) {
  const userDepts = await db
    .select({
      departmentId: departmentMembers.departmentId,
      departmentName: departments.name,
      departmentType: departments.type,
      role: departmentMembers.role,
      isActive: departmentMembers.isActive,
    })
    .from(departmentMembers)
    .leftJoin(departments, eq(departmentMembers.departmentId, departments.id))
    .where(eq(departmentMembers.userId, userId));

  const activeCount = userDepts.filter((d) => d.isActive).length;
  const roleBreakdown = userDepts.reduce((acc, dept) => {
    const role = dept.role || 'unknown';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalDepartments: userDepts.length,
    activeDepartments: activeCount,
    inactiveDepartments: userDepts.length - activeCount,
    roleBreakdown,
    departments: userDepts,
  };
}
