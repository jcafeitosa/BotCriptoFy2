/**
 * Department Service
 * Business logic for department operations
 */

import { db } from '@/db';
import { departments } from '../schema/departments.schema';
import { eq, and } from 'drizzle-orm';
import type {
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
  DepartmentFilter,
} from '../types/department.types';
import { NotFoundError, ConflictError } from '@/utils/errors';

/**
 * Get all departments
 */
export async function getAllDepartments(filter?: DepartmentFilter) {
  const conditions = [];

  if (filter?.tenantId) {
    conditions.push(eq(departments.tenantId, filter.tenantId));
  }

  if (filter?.type) {
    conditions.push(eq(departments.type, filter.type));
  }

  if (filter?.isActive !== undefined) {
    conditions.push(eq(departments.isActive, filter.isActive));
  }

  const result = await db
    .select()
    .from(departments)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return result;
}

/**
 * Get department by ID
 */
export async function getDepartmentById(id: string) {
  const [department] = await db
    .select()
    .from(departments)
    .where(eq(departments.id, id))
    .limit(1);

  if (!department) {
    throw new NotFoundError('Department not found', { id });
  }

  return department;
}

/**
 * Get department by slug
 */
export async function getDepartmentBySlug(tenantId: string, slug: string) {
  const [department] = await db
    .select()
    .from(departments)
    .where(and(eq(departments.tenantId, tenantId), eq(departments.slug, slug)))
    .limit(1);

  if (!department) {
    throw new NotFoundError('Department not found', { tenantId, slug });
  }

  return department;
}

/**
 * Get departments by tenant ID
 */
export async function getDepartmentsByTenant(tenantId: string) {
  return await db
    .select()
    .from(departments)
    .where(eq(departments.tenantId, tenantId));
}

/**
 * Create department
 */
export async function createDepartment(request: CreateDepartmentRequest) {
  // Check if department with same slug already exists for this tenant
  const existing = await db
    .select()
    .from(departments)
    .where(
      and(
        eq(departments.tenantId, request.tenantId),
        eq(departments.slug, request.slug)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    throw new ConflictError('Department with this slug already exists', {
      tenantId: request.tenantId,
      slug: request.slug,
    });
  }

  const [department] = await db
    .insert(departments)
    .values({
      tenantId: request.tenantId,
      name: request.name,
      slug: request.slug,
      description: request.description,
      type: request.type,
      settings: request.settings || {},
      metadata: request.metadata || {},
      isActive: true,
    })
    .returning();

  return department;
}

/**
 * Update department
 */
export async function updateDepartment(id: string, request: UpdateDepartmentRequest) {
  // Verify department exists
  await getDepartmentById(id);

  // If updating slug, check if it's already in use
  if (request.slug) {
    const [department] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, id))
      .limit(1);

    if (!department) {
      throw new NotFoundError('Department not found', { id });
    }

    const existing = await db
      .select()
      .from(departments)
      .where(
        and(
          eq(departments.tenantId, department.tenantId),
          eq(departments.slug, request.slug)
        )
      )
      .limit(1);

    if (existing.length > 0 && existing[0].id !== id) {
      throw new ConflictError('Department with this slug already exists', {
        slug: request.slug,
      });
    }
  }

  const [updated] = await db
    .update(departments)
    .set({
      ...request,
      updatedAt: new Date(),
    })
    .where(eq(departments.id, id))
    .returning();

  return updated;
}

/**
 * Delete department
 */
export async function deleteDepartment(id: string) {
  // Verify department exists
  await getDepartmentById(id);

  await db.delete(departments).where(eq(departments.id, id));

  return { success: true };
}

/**
 * Toggle department active status
 */
export async function toggleDepartmentStatus(id: string) {
  const department = await getDepartmentById(id);

  const [updated] = await db
    .update(departments)
    .set({
      isActive: !department.isActive,
      updatedAt: new Date(),
    })
    .where(eq(departments.id, id))
    .returning();

  return updated;
}
