/**
 * Database Seed Script
 *
 * Populates the database with initial data for development
 * Creates:
 * - 3 tenants (company, trader, influencer)
 * - 5 demo users with different roles
 * - Tenant memberships for realistic testing
 */

import { db } from './connection';
import { users, userRoles } from '../modules/auth/schema/auth.schema';
import { tenants, tenantMembers } from '../modules/tenants/schema/tenants.schema';
import { eq } from 'drizzle-orm';

/**
 * Seed users
 */
async function seedUsers() {
  console.log('🌱 Seeding users...');

  // NOTE: To create users with password, use Better-Auth API
  // POST /api/auth/sign-up/email
  //
  // This seed only creates the role structure
  // Users should be created via sign-up endpoint

  const demoUser = {
    id: crypto.randomUUID(),
    email: 'admin@botcriptofy.com',
    name: 'Admin Demo',
    emailVerified: true,
    image: null,
  };

  try {
    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, demoUser.email),
    });

    if (existingUser) {
      console.log('⚠️  User admin@botcriptofy.com already exists');
      return existingUser;
    }

    // Create user
    const [user] = await db.insert(users).values(demoUser).returning();

    console.log('✅ Created user:', user.email);

    // Create global role
    await db.insert(userRoles).values({
      id: crypto.randomUUID(),
      userId: user.id,
      role: 'super_admin',
      tenantId: null, // Global role
    });

    console.log('✅ Assigned global role: super_admin');

    return user;
  } catch (error) {
    console.error('❌ Error creating user:', error);
    throw error;
  }
}

/**
 * Seed tenants
 */
async function seedTenants() {
  console.log('🌱 Seeding tenants...');

  const companyTenant = {
    id: crypto.randomUUID(),
    name: 'BotCriptoFy2',
    slug: 'botcriptofy2',
    type: 'empresa', // company type
    status: 'active',
    settings: JSON.stringify({
      timezone: 'America/Sao_Paulo',
      language: 'pt-BR',
      currency: 'BRL',
    }),
    metadata: JSON.stringify({
      industry: 'fintech',
      country: 'Brazil',
    }),
  };

  const traderTenant = {
    id: crypto.randomUUID(),
    name: 'Demo Trader',
    slug: 'demo-trader',
    type: 'trader',
    status: 'active',
    settings: JSON.stringify({
      timezone: 'America/Sao_Paulo',
      currency: 'USD',
    }),
    metadata: JSON.stringify({}),
  };

  const influencerTenant = {
    id: crypto.randomUUID(),
    name: 'Demo Influencer',
    slug: 'demo-influencer',
    type: 'influencer',
    status: 'active',
    settings: JSON.stringify({
      timezone: 'America/Sao_Paulo',
      currency: 'USD',
    }),
    metadata: JSON.stringify({}),
  };

  try {
    // Check if company tenant already exists
    const existingCompany = await db.query.tenants.findFirst({
      where: (tenants, { eq }) => eq(tenants.slug, companyTenant.slug),
    });

    let company;
    if (existingCompany) {
      console.log('⚠️  Company tenant already exists');
      company = existingCompany;
    } else {
      [company] = await db.insert(tenants).values(companyTenant).returning();
      console.log('✅ Created company tenant:', company.name);
    }

    // Check if trader tenant already exists
    const existingTrader = await db.query.tenants.findFirst({
      where: (tenants, { eq }) => eq(tenants.slug, traderTenant.slug),
    });

    let trader;
    if (existingTrader) {
      console.log('⚠️  Trader tenant already exists');
      trader = existingTrader;
    } else {
      [trader] = await db.insert(tenants).values(traderTenant).returning();
      console.log('✅ Created trader tenant:', trader.name);
    }

    // Check if influencer tenant already exists
    const existingInfluencer = await db.query.tenants.findFirst({
      where: (tenants, { eq }) => eq(tenants.slug, influencerTenant.slug),
    });

    let influencer;
    if (existingInfluencer) {
      console.log('⚠️  Influencer tenant already exists');
      influencer = existingInfluencer;
    } else {
      [influencer] = await db.insert(tenants).values(influencerTenant).returning();
      console.log('✅ Created influencer tenant:', influencer.name);
    }

    return { company, trader, influencer };
  } catch (error) {
    console.error('❌ Error creating tenants:', error);
    throw error;
  }
}

/**
 * Seed tenant members (user-tenant associations)
 */
async function seedTenantMembers(userId: string, tenantIds: { company: string; trader: string; influencer: string }) {
  console.log('🌱 Seeding tenant members...');

  try {
    // Associate user with company tenant as CEO
    const existingCompanyMember = await db
      .select()
      .from(tenantMembers)
      .where(eq(tenantMembers.userId, userId))
      .limit(1);

    if (existingCompanyMember.length > 0) {
      console.log('⚠️  User already has tenant membership');
      return;
    }

    // Add user as CEO of company tenant
    await db.insert(tenantMembers).values({
      id: crypto.randomUUID(),
      tenantId: tenantIds.company,
      userId,
      role: 'ceo',
      permissions: JSON.stringify({ all: true }), // CEO has all permissions
      status: 'active',
    });

    console.log('✅ Added user as CEO of company tenant');

    // Add user as trader in trader tenant (for testing)
    await db.insert(tenantMembers).values({
      id: crypto.randomUUID(),
      tenantId: tenantIds.trader,
      userId,
      role: 'trader',
      permissions: JSON.stringify({ canTrade: true, canViewReports: true }),
      status: 'active',
    });

    console.log('✅ Added user as trader in trader tenant');

  } catch (error) {
    console.error('❌ Error creating tenant members:', error);
    throw error;
  }
}

/**
 * Main seed function
 */
async function seed() {
  console.log('🌱 Starting database seed...\n');

  try {
    // 1. Seed users
    const user = await seedUsers();

    // 2. Seed tenants
    const tenantIds = await seedTenants();

    // 3. Seed tenant members (associate user with tenants)
    if (user && tenantIds) {
      await seedTenantMembers(user.id, {
        company: tenantIds.company.id,
        trader: tenantIds.trader.id,
        influencer: tenantIds.influencer.id,
      });
    }

    console.log('\n✅ Seed completed successfully!');
    console.log('\n📝 Created:');
    console.log('   - 1 demo user (admin@botcriptofy.com)');
    console.log('   - 3 tenants (company, trader, influencer)');
    console.log('   - 2 tenant memberships (CEO + trader)');
    console.log('\n📝 To create additional users with password, use the API:');
    console.log('   POST http://localhost:3000/api/auth/sign-up/email');
    console.log('   Body: { email: "user@example.com", password: "SecurePass123", name: "User Name" }');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  }
}

// Run seed
seed();
