/**
 * Redis Connection with Fallback
 *
 * Automatically detects if Redis is available and provides:
 * - Full Redis connection when available (Docker/Production)
 * - In-memory fallback for local development
 * - Consistent API regardless of backend
 */

import { createClient, type RedisClientType } from 'redis';
import logger from './logger';

// In-memory store for fallback mode
const inMemoryStore = new Map<string, { value: string; expiry?: number }>();

// Redis client instance
let client: RedisClientType | null = null;
let isConnected = false;
let isRedisAvailable = false;

/**
 * Initialize Redis connection
 * Gracefully falls back to in-memory if Redis is not available
 */
export async function initializeRedis(): Promise<void> {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  try {
    logger.info('Attempting to connect to Redis', { url: redisUrl.replace(/:[^:]*@/, ':***@') });

    client = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            logger.warn('Redis reconnection failed after 3 attempts, using in-memory fallback');
            return false; // Stop reconnecting
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    client.on('error', (err) => {
      logger.error('Redis client error', { error: err.message });
      isRedisAvailable = false;
    });

    client.on('connect', () => {
      logger.info('Redis client connected successfully');
      isConnected = true;
      isRedisAvailable = true;
    });

    client.on('ready', () => {
      logger.info('Redis client ready');
    });

    client.on('end', () => {
      logger.warn('Redis connection closed');
      isConnected = false;
    });

    await client.connect();
    isRedisAvailable = true;
    isConnected = true;

    logger.info('Redis initialized successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.warn('Redis not available, using in-memory fallback', {
      error: errorMessage,
      mode: 'development',
    });

    client = null;
    isRedisAvailable = false;
    isConnected = false;
  }
}

/**
 * Check if Redis is available
 */
export function isRedisConnected(): boolean {
  return isRedisAvailable && isConnected;
}

/**
 * Set a key-value pair with optional expiry
 */
export async function set(key: string, value: string, expiryInSeconds?: number): Promise<void> {
  if (isRedisConnected() && client) {
    try {
      if (expiryInSeconds) {
        await client.setEx(key, expiryInSeconds, value);
      } else {
        await client.set(key, value);
      }
    } catch (error) {
      logger.error('Redis SET error, falling back to in-memory', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      inMemorySet(key, value, expiryInSeconds);
    }
  } else {
    inMemorySet(key, value, expiryInSeconds);
  }
}

/**
 * Get a value by key
 */
export async function get(key: string): Promise<string | null> {
  if (isRedisConnected() && client) {
    try {
      return await client.get(key);
    } catch (error) {
      logger.error('Redis GET error, falling back to in-memory', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return inMemoryGet(key);
    }
  } else {
    return inMemoryGet(key);
  }
}

/**
 * Delete a key
 */
export async function del(key: string): Promise<void> {
  if (isRedisConnected() && client) {
    try {
      await client.del(key);
    } catch (error) {
      logger.error('Redis DEL error, falling back to in-memory', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      inMemoryStore.delete(key);
    }
  } else {
    inMemoryStore.delete(key);
  }
}

/**
 * Delete multiple keys
 */
export async function delMany(keys: string[]): Promise<void> {
  if (keys.length === 0) {
    return;
  }

  if (isRedisConnected() && client) {
    try {
      await client.del(keys);
    } catch (error) {
      logger.error('Redis DEL MANY error, falling back to in-memory', {
        keysCount: keys.length,
        error: error instanceof Error ? error.message : String(error),
      });
      keys.forEach((key) => inMemoryStore.delete(key));
    }
  } else {
    keys.forEach((key) => inMemoryStore.delete(key));
  }
}

/**
 * Check if a key exists
 */
export async function exists(key: string): Promise<boolean> {
  if (isRedisConnected() && client) {
    try {
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS error, falling back to in-memory', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return inMemoryStore.has(key);
    }
  } else {
    return inMemoryStore.has(key);
  }
}

/**
 * Set expiry on a key
 */
export async function expire(key: string, seconds: number): Promise<void> {
  if (isRedisConnected() && client) {
    try {
      await client.expire(key, seconds);
    } catch (error) {
      logger.error('Redis EXPIRE error, falling back to in-memory', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      const entry = inMemoryStore.get(key);
      if (entry) {
        entry.expiry = Date.now() + seconds * 1000;
      }
    }
  } else {
    const entry = inMemoryStore.get(key);
    if (entry) {
      entry.expiry = Date.now() + seconds * 1000;
    }
  }
}

/**
 * Scan keys matching a pattern
 */
export async function scan(
  cursor: string,
  pattern: string,
  count: number
): Promise<[string, string[]]> {
  if (isRedisConnected() && client) {
    try {
      const cursorNum = parseInt(cursor, 10) || 0;
      // @ts-expect-error - Redis client scan accepts number but TypeScript definition is restrictive
      const result = await client.scan(cursorNum, {
        MATCH: pattern,
        COUNT: count,
      });
      return [result.cursor.toString(), result.keys];
    } catch (error) {
      logger.error('Redis SCAN error, falling back to in-memory', {
        pattern,
        error: error instanceof Error ? error.message : String(error),
      });
      return inMemoryScan(pattern);
    }
  } else {
    return inMemoryScan(pattern);
  }
}

/**
 * Clear all keys (use with caution!)
 */
export async function flushAll(): Promise<void> {
  if (isRedisConnected() && client) {
    try {
      await client.flushAll();
    } catch (error) {
      logger.error('Redis FLUSHALL error', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  inMemoryStore.clear();
}

/**
 * Close Redis connection gracefully
 */
export async function closeRedis(): Promise<void> {
  if (client && isConnected) {
    try {
      await client.quit();
      logger.info('Redis connection closed gracefully');
    } catch (error) {
      logger.error('Error closing Redis connection', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  inMemoryStore.clear();
}

// ============================================================================
// In-Memory Fallback Functions
// ============================================================================

function inMemorySet(key: string, value: string, expiryInSeconds?: number): void {
  const expiry = expiryInSeconds ? Date.now() + expiryInSeconds * 1000 : undefined;
  inMemoryStore.set(key, { value, expiry });
}

function inMemoryGet(key: string): string | null {
  const entry = inMemoryStore.get(key);

  if (!entry) {
    return null;
  }

  // Check expiry
  if (entry.expiry && Date.now() > entry.expiry) {
    inMemoryStore.delete(key);
    return null;
  }

  return entry.value;
}

function inMemoryScan(pattern: string): [string, string[]] {
  const keys: string[] = [];
  const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'));

  for (const [key] of inMemoryStore.entries()) {
    if (regex.test(key)) {
      keys.push(key);
    }
  }

  return ['0', keys]; // In-memory always returns cursor 0 (no pagination)
}

// Clean up expired keys every 60 seconds (only for in-memory mode)
if (!isRedisAvailable) {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of inMemoryStore.entries()) {
      if (entry.expiry && now > entry.expiry) {
        inMemoryStore.delete(key);
      }
    }
  }, 60000);
}

// ============================================================================
// Exports
// ============================================================================

export default {
  initialize: initializeRedis,
  isConnected: isRedisConnected,
  set,
  get,
  del,
  delMany,
  exists,
  expire,
  scan,
  flushAll,
  close: closeRedis,
};
