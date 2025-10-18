import { db as realDb } from '@/db';

export function getUsersDb(): any {
  const g: any = globalThis as any;
  return g.__USERS_TEST_DB__ || realDb;
}

