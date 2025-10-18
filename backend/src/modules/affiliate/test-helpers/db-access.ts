import { db as realDb } from '@/db';

// Permite override do DB em testes do módulo affiliate via globalThis
export function getAffiliateDb(): any {
  const g: any = globalThis as any;
  return g.__AFFILIATE_TEST_DB__ || realDb;
}

