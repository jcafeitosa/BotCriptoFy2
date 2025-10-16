import { Elysia } from 'elysia';

/**
 * Transform Middleware Plugin
 * Sanitizes and normalizes incoming data before validation
 * Uses transform hook following Elysia best practices
 */
export const transformMiddleware = new Elysia({ name: 'transform' })
  .onTransform(({ body, query, params }) => {
    // Sanitize body
    if (body && typeof body === 'object') {
      sanitizeObject(body);
    }

    // Sanitize query params
    if (query && typeof query === 'object') {
      sanitizeObject(query);
    }

    // Sanitize URL params
    if (params && typeof params === 'object') {
      sanitizeObject(params);
    }
  });

/**
 * Recursively sanitizes an object by:
 * - Trimming string values
 * - Converting email fields to lowercase
 * - Removing null/undefined values from arrays
 */
function sanitizeObject(obj: Record<string, any>): void {
  for (const key in obj) {
    const value = obj[key];

    // Trim strings
    if (typeof value === 'string') {
      obj[key] = value.trim();

      // Normalize email fields to lowercase
      if (key.toLowerCase().includes('email')) {
        obj[key] = value.toLowerCase();
      }
    }

    // Recursively sanitize nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitizeObject(value);
    }

    // Clean arrays
    if (Array.isArray(value)) {
      obj[key] = value.filter((item) => item !== null && item !== undefined);
      // Recursively sanitize array items
      value.forEach((item) => {
        if (item && typeof item === 'object') {
          sanitizeObject(item);
        }
      });
    }
  }
}

/**
 * Email normalization transform
 * Specifically for email fields - converts to lowercase and trims
 */
export const emailTransform = new Elysia({ name: 'email-transform' })
  .onTransform(({ body }) => {
    if (body && typeof body === 'object') {
      if ('email' in body && typeof body.email === 'string') {
        body.email = body.email.toLowerCase().trim();
      }
    }
  });

/**
 * Pagination transform
 * Normalizes pagination parameters with defaults
 */
export const paginationTransform = new Elysia({ name: 'pagination-transform' })
  .onTransform(({ query }) => {
    if (query && typeof query === 'object') {
      // Set defaults for pagination
      if ('page' in query) {
        const page = parseInt(query.page as string, 10);
        (query as any).page = isNaN(page) || page < 1 ? 1 : page;
      }

      if ('limit' in query) {
        const limit = parseInt(query.limit as string, 10);
        (query as any).limit = isNaN(limit) || limit < 1 ? 10 : Math.min(limit, 100);
      }
    }
  });
