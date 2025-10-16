/**
 * Database Reset Script
 *
 * DANGER: This script will DELETE ALL DATA from auth and tenant tables
 * Use only in development
 */

import { db } from './connection';
import { users, sessions, accounts, verifications, twoFactor, passkeys } from '../modules/auth/schema/auth.schema';
import { tenants, tenantMembers } from '../modules/tenants/schema/tenants.schema';

async function resetDatabase() {
  console.log('⚠️  WARNING: This will delete ALL users, sessions, and tenant data!');
  console.log('⚠️  Press Ctrl+C to cancel...\n');

  // Wait 3 seconds to allow cancellation
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('🗑️  Starting database reset...\n');

  try {
    // Delete in correct order (respecting foreign keys)

    console.log('1️⃣  Deleting tenant members...');
    await db.delete(tenantMembers);
    console.log('✅ Deleted all tenant members');

    console.log('2️⃣  Deleting tenants...');
    await db.delete(tenants);
    console.log('✅ Deleted all tenants');

    console.log('3️⃣  Deleting sessions...');
    await db.delete(sessions);
    console.log('✅ Deleted all sessions');

    console.log('4️⃣  Deleting accounts...');
    await db.delete(accounts);
    console.log('✅ Deleted all accounts');

    console.log('5️⃣  Deleting verifications...');
    await db.delete(verifications);
    console.log('✅ Deleted all verifications');

    console.log('6️⃣  Deleting two-factor...');
    await db.delete(twoFactor);
    console.log('✅ Deleted all two-factor records');

    console.log('7️⃣  Deleting passkeys...');
    await db.delete(passkeys);
    console.log('✅ Deleted all passkeys');

    console.log('8️⃣  Deleting users...');
    await db.delete(users);
    console.log('✅ Deleted all users');

    console.log('\n✅ Database reset completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run seed: bun run db:seed');
    console.log('   2. Create CEO account via API:');
    console.log('      POST http://localhost:3000/api/auth/sign-up/email');
    console.log('      {');
    console.log('        "email": "ceo@botcriptofy.com",');
    console.log('        "password": "SecureCEO123!",');
    console.log('        "name": "Julio Cezar Aquino Feitosa"');
    console.log('      }');
    console.log('   3. Promote CEO: POST http://localhost:3000/api/tenants/promote-me-to-ceo');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Reset failed:', error);
    process.exit(1);
  }
}

// Run reset
resetDatabase();
