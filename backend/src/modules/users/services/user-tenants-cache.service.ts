import { cacheManager } from '@/cache/cache-manager';
import { CacheNamespace } from '@/cache/types';
import { getUserTenants } from './user.service';

const TTL_SECONDS = 120; // 2 minutos

function tenantsCacheKey(userId: string) {
  return `tenants:${userId}`;
}

export class UsersTenantsCacheService {
  static async getTenants(userId: string) {
    const key = tenantsCacheKey(userId);
    const cached = await cacheManager.get(CacheNamespace.USERS, key);
    if (cached) return cached;
    const tenants = await getUserTenants(userId);
    await cacheManager.set(CacheNamespace.USERS, key, tenants, TTL_SECONDS);
    return tenants;
  }

  static async invalidateTenants(userId: string) {
    await cacheManager.delete(CacheNamespace.USERS, tenantsCacheKey(userId));
  }
}

