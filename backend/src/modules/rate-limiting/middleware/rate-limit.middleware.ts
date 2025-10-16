/**
 * Rate Limiting Middleware
 * Elysia middleware for rate limiting
 */

import { Elysia } from 'elysia';
import { rateLimitService } from '../services/rate-limit.service';
import type { RateLimitKey } from '../types/rate-limit.types';
import { RateLimitRule } from '../types/rate-limit.types';

/**
 * Extract client IP from request
 */
function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP.trim();
  }

  return 'unknown';
}

/**
 * Determine rate limit rule based on endpoint
 */
function getRuleForEndpoint(path: string): string {
  if (path.startsWith('/api/auth')) {
    return RateLimitRule.AUTH;
  }
  if (path.startsWith('/api/admin')) {
    return RateLimitRule.ADMIN;
  }
  if (path.startsWith('/api')) {
    return RateLimitRule.API;
  }
  return RateLimitRule.GLOBAL;
}

/**
 * Rate limiting middleware
 * Applies rate limiting to all requests
 */
export const rateLimitMiddleware = new Elysia({ name: 'rate-limit' }).onRequest(
  async ({ request, set }) => {
    // Extract path from request URL (path parameter is not available in onRequest)
    const url = new URL(request.url);
    const path = url.pathname;

    const ip = getClientIP(request);
    const ruleId = getRuleForEndpoint(path);

    const key: RateLimitKey = {
      ip,
      endpoint: path,
      // userId and tenantId can be added from context if available
    };

    const result = await rateLimitService.checkLimit(key, ruleId);

    // Set rate limit headers
    set.headers = set.headers || {};
    set.headers['X-RateLimit-Limit'] = String(result.limit);
    set.headers['X-RateLimit-Remaining'] = String(result.remaining);
    set.headers['X-RateLimit-Reset'] = String(Math.floor(result.resetAt / 1000));

    if (!result.allowed) {
      set.status = 429;
      if (result.retryAfter) {
        set.headers['Retry-After'] = String(result.retryAfter);
      }

      // Return response to short-circuit the request
      return new Response(
        JSON.stringify({
          error: 'RateLimitError',
          message: 'Rate limit exceeded. Please try again later.',
          statusCode: 429,
          timestamp: new Date().toISOString(),
          context: {
            limit: result.limit,
            remaining: result.remaining,
            resetAt: result.resetAt,
            retryAfter: result.retryAfter,
          },
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(result.limit),
            'X-RateLimit-Remaining': String(result.remaining),
            'X-RateLimit-Reset': String(Math.floor(result.resetAt / 1000)),
            'Retry-After': String(result.retryAfter || 60),
          },
        }
      );
    }
    return; // Explicit return for TypeScript
  }
);
