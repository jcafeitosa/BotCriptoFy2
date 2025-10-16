/**
 * Tenant Service
 * Business logic for tenant operations
 */

import { db } from '@/db';
import { tenants, tenantMembers } from '../schema/tenants.schema';
import { eq, and } from 'drizzle-orm';
import { NotFoundError, ConflictError } from '@/utils/errors';

/**
 * Get tenant by ID
 */
export async function getTenantById(tenantId: string) {
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) {
    throw new NotFoundError('Tenant not found', { tenantId });
  }

  return tenant;
}

/**
 * Get tenant by slug
 */
export async function getTenantBySlug(slug: string) {
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);

  if (!tenant) {
    throw new NotFoundError('Tenant not found', { slug });
  }

  return tenant;
}

/**
 * Get company tenant (type = 'empresa')
 */
export async function getCompanyTenant() {
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.type, 'empresa'))
    .limit(1);

  if (!tenant) {
    throw new NotFoundError('Company tenant not found');
  }

  return tenant;
}

/**
 * Check if user is a member of tenant
 */
export async function isTenantMember(tenantId: string, userId: string): Promise<boolean> {
  const [member] = await db
    .select()
    .from(tenantMembers)
    .where(
      and(
        eq(tenantMembers.tenantId, tenantId),
        eq(tenantMembers.userId, userId)
      )
    )
    .limit(1);

  return !!member;
}

/**
 * Get user's tenant membership
 */
export async function getTenantMember(tenantId: string, userId: string) {
  const [member] = await db
    .select()
    .from(tenantMembers)
    .where(
      and(
        eq(tenantMembers.tenantId, tenantId),
        eq(tenantMembers.userId, userId)
      )
    )
    .limit(1);

  if (!member) {
    throw new NotFoundError('Tenant membership not found', { tenantId, userId });
  }

  return member;
}

/**
 * Add user to tenant
 */
export async function addTenantMember(
  tenantId: string,
  userId: string,
  role: string,
  permissions?: Record<string, any>
) {
  // Check if already a member
  const existing = await isTenantMember(tenantId, userId);
  if (existing) {
    throw new ConflictError('User is already a member of this tenant', { tenantId, userId });
  }

  // Verify tenant exists
  await getTenantById(tenantId);

  // Add member
  const [member] = await db
    .insert(tenantMembers)
    .values({
      id: crypto.randomUUID(),
      tenantId,
      userId,
      role,
      permissions: permissions ? JSON.stringify(permissions) : null,
      status: 'active',
    })
    .returning();

  return member;
}

/**
 * Update tenant member role
 */
export async function updateTenantMemberRole(
  tenantId: string,
  userId: string,
  role: string,
  permissions?: Record<string, any>
) {
  // Verify member exists
  await getTenantMember(tenantId, userId);

  // Update member
  const [updated] = await db
    .update(tenantMembers)
    .set({
      role,
      ...(permissions && { permissions: JSON.stringify(permissions) }),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(tenantMembers.tenantId, tenantId),
        eq(tenantMembers.userId, userId)
      )
    )
    .returning();

  return updated;
}

/**
 * Remove user from tenant
 */
export async function removeTenantMember(tenantId: string, userId: string) {
  // Verify member exists
  await getTenantMember(tenantId, userId);

  // Delete member
  await db
    .delete(tenantMembers)
    .where(
      and(
        eq(tenantMembers.tenantId, tenantId),
        eq(tenantMembers.userId, userId)
      )
    );

  return { success: true };
}

/**
 * Get all members of a tenant
 */
export async function getTenantMembers(tenantId: string) {
  // Verify tenant exists
  await getTenantById(tenantId);

  const members = await db
    .select()
    .from(tenantMembers)
    .where(eq(tenantMembers.tenantId, tenantId));

  return members;
}

/**
 * Get all tenants for a user
 */
export async function getUserTenants(userId: string) {
  const userTenants = await db
    .select({
      tenant: tenants,
      membership: tenantMembers,
    })
    .from(tenantMembers)
    .innerJoin(tenants, eq(tenantMembers.tenantId, tenants.id))
    .where(eq(tenantMembers.userId, userId));

  return userTenants;
}

/**
 * Promote user to CEO of company tenant
 * This is a special operation for onboarding the first CEO
 */
export async function promoteToCEO(userId: string) {
  // Get company tenant
  const companyTenant = await getCompanyTenant();

  // Check if user is already a member
  const isAlreadyMember = await isTenantMember(companyTenant.id, userId);

  if (isAlreadyMember) {
    // Update existing membership to CEO
    const updated = await updateTenantMemberRole(
      companyTenant.id,
      userId,
      'ceo',
      { all: true } // CEO has all permissions
    );
    return { tenant: companyTenant, membership: updated, action: 'updated' };
  } else {
    // Add as new CEO
    const member = await addTenantMember(
      companyTenant.id,
      userId,
      'ceo',
      { all: true }
    );
    return { tenant: companyTenant, membership: member, action: 'created' };
  }
}
