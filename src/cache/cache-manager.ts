/**
 * CacheManager - Centralized cache management with multiple strategies
 */

import { redis } from '@/lib/redis';
import { logger } from '@/utils/logger';

export type CacheStrategy = 'write-through' | 'write-behind' | 'write-around';

export interface CacheOptions {
  ttl?: number;
  strategy?: CacheStrategy;
  namespace?: string;
  tags?: string[];
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalKeys: number;
  memoryUsage: number;
}

class CacheManager {
  private static instance: CacheManager;
  private defaultTTL = 3600;
  private stats = { hits: 0, misses: 0 };

  private constructor() {
    logger.info('CacheManager initialized', { source: 'cache' });
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  private buildKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key;
  }

  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    try {
      const fullKey = this.buildKey(key, options.namespace);
      const value = await redis.get(fullKey);

      if (value) {
        this.stats.hits++;
        return JSON.parse(value) as T;
      }

      this.stats.misses++;
      return null;
    } catch (error) {
      logger.error('Cache get error', { source: 'cache', key, error });
      return null;
    }
  }

  async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, options.namespace);
      const ttl = options.ttl || this.defaultTTL;
      await redis.setex(fullKey, ttl, JSON.stringify(value));

      if (options.tags?.length) {
        await this.addTags(fullKey, options.tags);
      }
      return true;
    } catch (error) {
      logger.error('Cache set error', { source: 'cache', key, error });
      return false;
    }
  }

  async delete(key: string, options: CacheOptions = {}): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, options.namespace);
      await redis.del(fullKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  async clearNamespace(namespace: string): Promise<number> {
    try {
      const keys = await redis.keys(`${namespace}:*`);
      if (keys.length > 0) await redis.del(...keys);
      return keys.length;
    } catch (error) {
      return 0;
    }
  }

  async getOrSet<T>(key: string, fetchFn: () => Promise<T>, options: CacheOptions = {}): Promise<T> {
    const cached = await this.get<T>(key, options);
    if (cached !== null) return cached;

    const value = await fetchFn();
    await this.set(key, value, options);
    return value;
  }

  async getStats(): Promise<CacheStats> {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
      : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      totalKeys: await redis.dbsize(),
      memoryUsage: 0,
    };
  }

  private async addTags(key: string, tags: string[]): Promise<void> {
    for (const tag of tags) {
      await redis.sadd(`tag:${tag}`, key);
    }
  }
}

export const cacheManager = CacheManager.getInstance();
