/**
 * Health Check Utilities
 * Real health checks for external services (database, redis, ollama)
 */

import { db } from '@/db';
import { sql } from 'drizzle-orm';
import logger from './logger';
import redis from './redis';

export interface HealthCheckResult {
  status: 'ok' | 'error' | 'degraded';
  message?: string;
  latency?: number;
}

export interface SystemHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: {
    database: HealthCheckResult;
    redis: HealthCheckResult;
    ollama: HealthCheckResult;
  };
  uptime: number;
  timestamp: string;
}

/**
 * Check database connection
 */
export async function checkDatabase(): Promise<HealthCheckResult> {
  const start = Date.now();

  try {
    // Execute simple query to test connection
    await db.execute(sql`SELECT 1 as health_check`);

    const latency = Date.now() - start;

    return {
      status: 'ok',
      latency,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error('Database health check failed', { error: errorMessage });

    return {
      status: 'error',
      message: errorMessage,
      latency: Date.now() - start,
    };
  }
}

/**
 * Check Redis connection
 */
export async function checkRedis(): Promise<HealthCheckResult> {
  const start = Date.now();

  try {
    const isConnected = redis.isConnected();

    if (!isConnected) {
      return {
        status: 'ok',
        message: 'Redis not available - using in-memory fallback',
        latency: Date.now() - start,
      };
    }

    // Test Redis with a simple SET/GET
    const testKey = '__health_check__';
    const testValue = Date.now().toString();

    await redis.set(testKey, testValue, 10); // 10 seconds expiry
    const retrieved = await redis.get(testKey);
    await redis.del(testKey);

    const latency = Date.now() - start;

    if (retrieved === testValue) {
      return {
        status: 'ok',
        message: 'Redis connected',
        latency,
      };
    } else {
      return {
        status: 'degraded',
        message: 'Redis response mismatch',
        latency,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.warn('Redis health check failed (using in-memory fallback)', { error: errorMessage });

    return {
      status: 'ok',
      message: 'Redis unavailable - in-memory fallback active',
      latency: Date.now() - start,
    };
  }
}

/**
 * Check Ollama AI service connection
 */
export async function checkOllama(): Promise<HealthCheckResult> {
  const start = Date.now();

  try {
    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

    // Try to reach Ollama API
    const response = await fetch(`${ollamaUrl}/api/version`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    const latency = Date.now() - start;

    if (response.ok) {
      const version = (await response.json()) as { version?: string };

      return {
        status: 'ok',
        message: `Ollama ${version.version || 'unknown'}`,
        latency,
      };
    } else {
      return {
        status: 'error',
        message: `Ollama returned ${response.status}`,
        latency,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.warn('Ollama health check failed (optional service)', { error: errorMessage });

    // Ollama is optional, so mark as degraded instead of error
    return {
      status: 'degraded',
      message: errorMessage,
      latency: Date.now() - start,
    };
  }
}

/**
 * Perform complete system health check
 */
export async function performHealthCheck(): Promise<SystemHealth> {
  const [database, redis, ollama] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkOllama(),
  ]);

  // Determine overall status
  let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

  // Database is critical
  if (database.status === 'error') {
    overallStatus = 'unhealthy';
  }
  // Redis and Ollama are optional
  else if (
    database.status === 'degraded' ||
    redis.status === 'error' ||
    ollama.status === 'error'
  ) {
    overallStatus = 'degraded';
  }

  return {
    status: overallStatus,
    checks: {
      database,
      redis,
      ollama,
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
}
