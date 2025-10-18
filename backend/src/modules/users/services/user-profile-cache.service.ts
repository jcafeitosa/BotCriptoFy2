import { cacheManager } from '@/cache/cache-manager';
import { CacheNamespace } from '@/cache/types';
import { getUserProfile } from './user.service';

const TTL_SECONDS = 300; // 5 minutos

function profileCacheKey(userId: string, tenantId?: string) {
  return `profile:${userId}:${tenantId || 'none'}`;
}

export class UsersProfileService {
  static async getProfile(userId: string, tenantId?: string) {
    const key = profileCacheKey(userId, tenantId);
    const cached = await cacheManager.get(CacheNamespace.USERS, key);
    if (cached) return cached;

    const profile = await getUserProfile(userId, tenantId);
    await cacheManager.set(CacheNamespace.USERS, key, profile, TTL_SECONDS);
    return profile;
  }

  static async invalidateProfile(userId: string) {
    await cacheManager.invalidate({ namespace: CacheNamespace.USERS, pattern: `profile:${userId}:*` });
  }
}

