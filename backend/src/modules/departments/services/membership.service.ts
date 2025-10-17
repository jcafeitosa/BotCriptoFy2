/**
 * Department Membership Service
 * Manages user assignments to departments
 */

import { db } from '@/db';
import { departmentMembers, departments } from '../schema/departments.schema';
import { users } from '../../auth/schema/auth.schema';
import { eq, and } from 'drizzle-orm';
import { NotFoundError, ConflictError } from '@/utils/errors';

/**
 * Add user to department
 */
export async function addMemberToDepartment(params: {
  departmentId: string;
  userId: string;
  role: 'manager' | 'member' | 'viewer';
  assignedBy: string;
}) {
  // Verify department exists
  const [department] = await db
    .select()
    .from(departments)
    .where(eq(departments.id, params.departmentId))
    .limit(1);

  if (!department) {
    throw new NotFoundError('Department not found', { departmentId: params.departmentId });
  }

  // Verify user exists
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, params.userId))
    .limit(1);

  if (!user) {
    throw new NotFoundError('User not found', { userId: params.userId });
  }

  // Check if user is already a member
  const existing = await db
    .select()
    .from(departmentMembers)
    .where(
      and(
        eq(departmentMembers.departmentId, params.departmentId),
        eq(departmentMembers.userId, params.userId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    throw new ConflictError('User is already a member of this department', {
      departmentId: params.departmentId,
      userId: params.userId,
    });
  }

  // Add member
  const [member] = await db
    .insert(departmentMembers)
    .values({
      departmentId: params.departmentId,
      userId: params.userId,
      role: params.role,
      assignedBy: params.assignedBy,
      isActive: true,
    })
    .returning();

  return member;
}

/**
 * Remove user from department
 */
export async function removeMemberFromDepartment(departmentId: string, userId: string) {
  const [member] = await db
    .select()
    .from(departmentMembers)
    .where(
      and(
        eq(departmentMembers.departmentId, departmentId),
        eq(departmentMembers.userId, userId)
      )
    )
    .limit(1);

  if (!member) {
    throw new NotFoundError('Member not found in this department', {
      departmentId,
      userId,
    });
  }

  await db
    .delete(departmentMembers)
    .where(
      and(
        eq(departmentMembers.departmentId, departmentId),
        eq(departmentMembers.userId, userId)
      )
    );

  return { success: true };
}

/**
 * Update member role
 */
export async function updateMemberRole(params: {
  departmentId: string;
  userId: string;
  role: 'manager' | 'member' | 'viewer';
}) {
  const [member] = await db
    .select()
    .from(departmentMembers)
    .where(
      and(
        eq(departmentMembers.departmentId, params.departmentId),
        eq(departmentMembers.userId, params.userId)
      )
    )
    .limit(1);

  if (!member) {
    throw new NotFoundError('Member not found in this department', {
      departmentId: params.departmentId,
      userId: params.userId,
    });
  }

  const [updated] = await db
    .update(departmentMembers)
    .set({ role: params.role })
    .where(eq(departmentMembers.id, member.id))
    .returning();

  return updated;
}

/**
 * Get department members
 */
export async function getDepartmentMembers(departmentId: string) {
  const members = await db
    .select({
      id: departmentMembers.id,
      userId: departmentMembers.userId,
      role: departmentMembers.role,
      isActive: departmentMembers.isActive,
      assignedAt: departmentMembers.assignedAt,
      assignedBy: departmentMembers.assignedBy,
      userName: users.name,
      userEmail: users.email,
    })
    .from(departmentMembers)
    .leftJoin(users, eq(departmentMembers.userId, users.id))
    .where(eq(departmentMembers.departmentId, departmentId));

  return members;
}

/**
 * Get user departments
 */
export async function getUserDepartments(userId: string) {
  const userDepts = await db
    .select({
      id: departmentMembers.id,
      departmentId: departmentMembers.departmentId,
      role: departmentMembers.role,
      isActive: departmentMembers.isActive,
      assignedAt: departmentMembers.assignedAt,
      departmentName: departments.name,
      departmentType: departments.type,
      departmentSlug: departments.slug,
    })
    .from(departmentMembers)
    .leftJoin(departments, eq(departmentMembers.departmentId, departments.id))
    .where(eq(departmentMembers.userId, userId));

  return userDepts;
}

/**
 * Check if user is member of department
 */
export async function isUserMemberOfDepartment(userId: string, departmentId: string): Promise<boolean> {
  const [member] = await db
    .select()
    .from(departmentMembers)
    .where(
      and(
        eq(departmentMembers.userId, userId),
        eq(departmentMembers.departmentId, departmentId),
        eq(departmentMembers.isActive, true)
      )
    )
    .limit(1);

  return !!member;
}

/**
 * Get member role in department
 */
export async function getMemberRole(userId: string, departmentId: string): Promise<string | null> {
  const [member] = await db
    .select({ role: departmentMembers.role })
    .from(departmentMembers)
    .where(
      and(
        eq(departmentMembers.userId, userId),
        eq(departmentMembers.departmentId, departmentId),
        eq(departmentMembers.isActive, true)
      )
    )
    .limit(1);

  return member?.role || null;
}

/**
 * Toggle member active status
 */
export async function toggleMemberStatus(departmentId: string, userId: string) {
  const [member] = await db
    .select()
    .from(departmentMembers)
    .where(
      and(
        eq(departmentMembers.departmentId, departmentId),
        eq(departmentMembers.userId, userId)
      )
    )
    .limit(1);

  if (!member) {
    throw new NotFoundError('Member not found', { departmentId, userId });
  }

  const [updated] = await db
    .update(departmentMembers)
    .set({ isActive: !member.isActive })
    .where(eq(departmentMembers.id, member.id))
    .returning();

  return updated;
}
