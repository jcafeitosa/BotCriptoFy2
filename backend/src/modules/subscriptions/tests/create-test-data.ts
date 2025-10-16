/**
 * Create Test Data
 * Creates a test tenant and user for subscription testing
 */

import { db } from '@/db';
import { tenants } from '../../tenants/schema/tenants.schema';
import { users } from '../../auth/schema/auth.schema';
import logger from '@/utils/logger';

async function createTestData() {
  try {
    logger.info('🌱 Creating test data for subscriptions...\n');

    // Create test user
    const testUserId = 'test-user-' + Date.now();
    const testUserEmail = `test-${Date.now()}@example.com`;

    logger.info('Creating test user...');
    const [user] = await db
      .insert(users)
      .values({
        id: testUserId,
        name: 'Test User',
        email: testUserEmail,
        emailVerified: true,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    logger.info(`✅ User created: ${user.email} (${user.id})\n`);

    // Create test tenant
    const testTenantId = 'test-tenant-' + Date.now();
    const testTenantSlug = 'test-tenant-' + Date.now();

    logger.info('Creating test tenant...');
    const [tenant] = await db
      .insert(tenants)
      .values({
        id: testTenantId,
        name: 'Test Tenant Company',
        slug: testTenantSlug,
        type: 'empresa',
        status: 'active',
        settings: '{}',
        metadata: '{}',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    logger.info(`✅ Tenant created: ${tenant.name} (${tenant.id})\n`);

    // Display test data
    logger.info('📋 Test Data Created:');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info(`User ID:    ${user.id}`);
    logger.info(`User Email: ${user.email}`);
    logger.info(`Tenant ID:  ${tenant.id}`);
    logger.info(`Tenant Slug: ${tenant.slug}`);
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    logger.info('💡 Use these IDs in your tests:\n');
    logger.info(`const TENANT_ID = '${tenant.id}';`);
    logger.info(`const USER_ID = '${user.id}';\n`);

    logger.info('✅ Test data creation completed!');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Failed to create test data:', error);
    process.exit(1);
  }
}

// Run
createTestData();
