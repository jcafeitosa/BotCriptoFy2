/**
 * Cacheable Decorator
 * Automatically cache method results
 */

import { cacheManager } from '../cache-manager';
import logger from '@/utils/logger';

export interface CacheableOptions {
  namespace: string;
  ttl?: number;
  keyGenerator?: (...args: any[]) => string;
  condition?: (...args: any[]) => boolean;
}

/**
 * Cacheable method decorator
 *
 * @example
 * ```typescript
 * class UserService {
 *   @Cacheable({ namespace: 'users', ttl: 300 })
 *   async getUser(userId: string) {
 *     return await db.query('SELECT * FROM users WHERE id = $1', [userId]);
 *   }
 * }
 * ```
 */
export function Cacheable(options: CacheableOptions) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Check condition if provided
      if (options.condition && !options.condition(...args)) {
        return await originalMethod.apply(this, args);
      }

      // Generate cache key
      const key = options.keyGenerator
        ? options.keyGenerator(...args)
        : generateDefaultKey(propertyKey, args);

      // Try to get from cache
      const cached = await cacheManager.get(options.namespace, key);
      if (cached !== null) {
        logger.debug('Cache hit (decorator)', {
          namespace: options.namespace,
          key,
          method: propertyKey,
        });
        return cached;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Store in cache
      await cacheManager.set(options.namespace, key, result, options.ttl);

      logger.debug('Cache miss (decorator)', {
        namespace: options.namespace,
        key,
        method: propertyKey,
      });

      return result;
    };

    return descriptor;
  };
}

/**
 * CacheInvalidate decorator
 * Invalidate cache after method execution
 *
 * @example
 * ```typescript
 * class UserService {
 *   @CacheInvalidate({ namespace: 'users', keyGenerator: (userId) => userId })
 *   async updateUser(userId: string, data: any) {
 *     return await db.query('UPDATE users SET ... WHERE id = $1', [userId]);
 *   }
 * }
 * ```
 */
export function CacheInvalidate(options: {
  namespace: string;
  keyGenerator?: (...args: any[]) => string;
  pattern?: string;
}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Invalidate cache
      if (options.keyGenerator) {
        const key = options.keyGenerator(...args);
        await cacheManager.delete(options.namespace, key);
        logger.debug('Cache invalidated (decorator)', {
          namespace: options.namespace,
          key,
          method: propertyKey,
        });
      } else if (options.pattern) {
        await cacheManager.invalidate({ pattern: options.pattern });
        logger.debug('Cache invalidated by pattern (decorator)', {
          pattern: options.pattern,
          method: propertyKey,
        });
      } else {
        // Invalidate entire namespace
        await cacheManager.invalidate({ namespace: options.namespace });
        logger.debug('Cache namespace invalidated (decorator)', {
          namespace: options.namespace,
          method: propertyKey,
        });
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * CachePut decorator
 * Always execute method and update cache
 *
 * @example
 * ```typescript
 * class UserService {
 *   @CachePut({ namespace: 'users', ttl: 300 })
 *   async refreshUser(userId: string) {
 *     return await api.fetchUser(userId);
 *   }
 * }
 * ```
 */
export function CachePut(options: {
  namespace: string;
  ttl?: number;
  keyGenerator?: (...args: any[]) => string;
}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Always execute original method
      const result = await originalMethod.apply(this, args);

      // Generate cache key
      const key = options.keyGenerator
        ? options.keyGenerator(...args)
        : generateDefaultKey(propertyKey, args);

      // Update cache
      await cacheManager.set(options.namespace, key, result, options.ttl);

      logger.debug('Cache updated (decorator)', {
        namespace: options.namespace,
        key,
        method: propertyKey,
      });

      return result;
    };

    return descriptor;
  };
}

/**
 * Generate default cache key from method name and arguments
 */
function generateDefaultKey(methodName: string, args: any[]): string {
  if (args.length === 0) {
    return methodName;
  }

  // Use first argument as key (usually an ID)
  const firstArg = args[0];

  if (typeof firstArg === 'string' || typeof firstArg === 'number') {
    return `${methodName}:${firstArg}`;
  }

  // For objects, create a hash-like key
  return `${methodName}:${JSON.stringify(firstArg)}`;
}
