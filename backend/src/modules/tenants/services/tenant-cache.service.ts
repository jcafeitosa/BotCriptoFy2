import { cacheManager } from '@/cache/cache-manager';
import { CacheNamespace } from '@/cache/types';
import { getTenantById, getCompanyTenant } from './tenant.service';

const TTL_SECONDS = 300; // 5 minutos

function tenantKey(id: string) {
  return `tenant:${id}`;
}

export class TenantsCacheService {
  static async getTenant(id: string) {
    const key = tenantKey(id);
    const cached = await cacheManager.get(CacheNamespace.USERS, key);
    if (cached) return cached;
    const t = await getTenantById(id);
    await cacheManager.set(CacheNamespace.USERS, key, t, TTL_SECONDS);
    return t;
  }

  static async getCompanyTenant() {
    const key = tenantKey('company');
    const cached = await cacheManager.get(CacheNamespace.USERS, key);
    if (cached) return cached;
    const t = await getCompanyTenant();
    await cacheManager.set(CacheNamespace.USERS, key, t, TTL_SECONDS);
    return t;
  }

  static async invalidate(id: string) {
    await cacheManager.delete(CacheNamespace.USERS, tenantKey(id));
  }
}

