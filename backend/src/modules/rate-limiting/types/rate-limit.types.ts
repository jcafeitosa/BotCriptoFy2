/**
 * Rate Limiting Types
 * Type definitions for rate limiting module
 */

/**
 * Rate limit configuration for a specific rule
 */
export interface RateLimitConfig {
  id: string;
  maxRequests: number;
  windowMs: number;
  message?: string;
  statusCode?: number;
}

/**
 * Rate limit result after checking
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Rate limit key for identifying requests
 */
export interface RateLimitKey {
  ip: string;
  userId?: string;
  tenantId?: string;
  endpoint: string;
}

/**
 * Rate limit statistics
 */
export interface RateLimitStats {
  totalRequests: number;
  blockedRequests: number;
  allowedRequests: number;
  blockRate: number;
}

/**
 * Predefined rate limit rules
 */
export enum RateLimitRule {
  GLOBAL = 'global',
  AUTH = 'auth',
  API = 'api',
  ADMIN = 'admin',
}
