import { db as realDb } from '@/db';

export function getTenantsDb(): any {
  const g: any = globalThis as any;
  return g.__TENANTS_TEST_DB__ || realDb;
}

