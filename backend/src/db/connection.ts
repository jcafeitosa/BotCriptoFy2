/**
 * Database Connection
 *
 * PostgreSQL connection using Drizzle ORM with node-postgres
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import 'dotenv/config';

// Import all schemas for query API
import * as authSchema from '../modules/auth/schema/auth.schema';
import * as userProfileSchema from '../modules/users/schema/user-profile.schema';
import * as tenantSchema from '../modules/tenants/schema/tenants.schema';
import * as securitySchema from '../modules/security/schema/security.schema';
import * as departmentSchema from '../modules/departments/schema/departments.schema';
import * as configurationSchema from '../modules/configurations/schema/configurations.schema';
import * as notificationSchema from '../modules/notifications/schema/notifications.schema';
import * as auditSchema from '../modules/audit/schema/audit.schema';
import * as financialSchema from '../modules/financial/schema';

/**
 * PostgreSQL Connection Pool
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection cannot be established
});

/**
 * Combined schema for Drizzle query API
 */
const schema = {
  ...authSchema,
  ...userProfileSchema,
  ...tenantSchema,
  ...securitySchema,
  ...departmentSchema,
  ...configurationSchema,
  ...notificationSchema,
  ...auditSchema,
  ...financialSchema,
};

/**
 * Drizzle Database Instance
 */
export const db = drizzle(pool, { schema });

/**
 * Connection Events
 */
pool.on('connect', () => {
  console.log('✅ Database connected');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

/**
 * Graceful Shutdown
 */
export async function closeDatabase() {
  await pool.end();
  console.log('👋 Database connection closed');
}

// Handle process termination
process.on('SIGTERM', closeDatabase);
process.on('SIGINT', closeDatabase);
