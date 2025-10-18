#!/usr/bin/env bun

/**
 * Grant Super Admin Role to a User by Email
 * Usage:
 *   bun backend/scripts/grant-super-admin.ts --email user@example.com
 * or set env:
 *   USER_EMAIL=user@example.com bun backend/scripts/grant-super-admin.ts
 */

import { db } from '@/db';
import { users } from '@/modules/auth/schema/auth.schema';
import { roles, rbacUserRoles } from '@/modules/security/schema/security.schema';
import { eq, and, isNull } from 'drizzle-orm';

function parseArgs(): string | null {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) return args[i + 1];
  }
  const envEmail = process.env.USER_EMAIL || process.env.TEST_EMAIL;
  return envEmail || null;
}

async function main() {
  const email = parseArgs();
  if (!email) {
    console.error('Missing email. Use --email or set USER_EMAIL/TEST_EMAIL env.');
    process.exit(1);
  }

  console.log(`Granting super_admin to ${email} ...`);

  // Find user by email
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  // Ensure super_admin role exists
  let [superRole] = await db.select().from(roles).where(eq(roles.name, 'super_admin')).limit(1);
  if (!superRole) {
    const inserted = await db.insert(roles).values({
      name: 'super_admin',
      description: 'System super administrator',
      level: 'super_admin',
      isSystem: true,
    }).returning();
    superRole = inserted[0];
    console.log('Created role: super_admin');
  }

  // Assign role if not present (global role, tenantId = null)
  const existing = await db
    .select()
    .from(rbacUserRoles)
    .where(and(eq(rbacUserRoles.userId, user.id), eq(rbacUserRoles.roleId, superRole.id), isNull(rbacUserRoles.tenantId)))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(rbacUserRoles).values({ userId: user.id, roleId: superRole.id, tenantId: null });
    console.log(`Assigned super_admin to ${email}`);
  } else {
    console.log(`User already has super_admin role: ${email}`);
  }

  console.log('Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

