/**
 * Tenant Service
 * Business logic for tenant operations
 */

import { getTenantsDb } from '../test-helpers/db-access';
import { tenants, tenantMembers } from '../schema/tenants.schema';
import { eq, and, sql } from 'drizzle-orm';
import { NotFoundError, ConflictError, ForbiddenError } from '@/utils/errors';

/**
 * Get tenant by ID
 */
export async function getTenantById(tenantId: string) {
  const [tenant] = await getTenantsDb()
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
  const [tenant] = await getTenantsDb()
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
  const [tenant] = await getTenantsDb()
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
  const [member] = await getTenantsDb()
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
  const [member] = await getTenantsDb()
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
  const [member] = await getTenantsDb()
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

  // Publish event
  try {
    await publishMembershipEvent({ type: 'added', tenantId, userId, payload: { role } });
  } catch {}
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
  const [updated] = await getTenantsDb()
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

  try {
    await publishMembershipEvent({ type: 'updated', tenantId, userId, payload: { role } });
  } catch {}
  return updated;
}

/**
 * Remove user from tenant
 */
export async function removeTenantMember(tenantId: string, userId: string) {
  // Verify member exists
  await getTenantMember(tenantId, userId);

  // Delete member
  await getTenantsDb()
    .delete(tenantMembers)
    .where(
      and(
        eq(tenantMembers.tenantId, tenantId),
        eq(tenantMembers.userId, userId)
      )
    );
  try {
    await publishMembershipEvent({ type: 'removed', tenantId, userId });
  } catch {}
  return { success: true };
}

/**
 * Get all members of a tenant
 */
export async function getTenantMembers(tenantId: string) {
  // Verify tenant exists
  await getTenantById(tenantId);

  const members = await getTenantsDb()
    .select()
    .from(tenantMembers)
    .where(eq(tenantMembers.tenantId, tenantId));

  return members;
}

/**
 * Get tenant members with pagination
 */
export async function getTenantMembersPaginated(tenantId: string, page = 1, limit = 50) {
  await getTenantById(tenantId);
  const offset = (page - 1) * limit;
  const rows = await getTenantsDb()
    .select()
    .from(tenantMembers)
    .where(eq(tenantMembers.tenantId, tenantId))
    .limit(limit)
    .offset(offset);
  const [{ count }] = await getTenantsDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(tenantMembers)
    .where(eq(tenantMembers.tenantId, tenantId));
  const totalPages = Math.ceil(count / limit);
  return {
    data: rows,
    pagination: { page, limit, total: count, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
  };
}

/**
 * Get all tenants for a user
 */
export async function getUserTenants(userId: string) {
  const userTenants = await getTenantsDb()
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

  // Ensure there is no existing CEO in company tenant (setup only)
  const [existingCeo] = await getTenantsDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(tenantMembers)
    .where(and(eq(tenantMembers.tenantId, companyTenant.id), eq(tenantMembers.role, 'ceo')))
    .limit(1);
  if (existingCeo?.count && existingCeo.count > 0) {
    throw new ForbiddenError('CEO already exists for company tenant');
  }

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

/**
 * Ensure user is a member of tenant
 */
export async function ensureTenantMember(tenantId: string, userId: string) {
  const [member] = await getTenantsDb()
    .select()
    .from(tenantMembers)
    .where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.userId, userId)))
    .limit(1);
  if (!member) throw new ForbiddenError('User is not a member of this tenant');
  return member;
}

/**
 * Ensure user is admin or CEO in tenant
 */
export async function ensureTenantAdmin(tenantId: string, userId: string) {
  const member = await ensureTenantMember(tenantId, userId);
  const allowed = member.role === 'admin' || member.role === 'ceo';
  if (!allowed) throw new ForbiddenError('Insufficient role for this tenant');
  return member;
}
