/**
 * Zod Validation Middleware for Elysia
 * Provides automatic validation using Zod schemas
 */

import { Elysia } from 'elysia';
import { safeValidate, formatZodError } from '../validation/risk.validation';

/**
 * Zod validation middleware factory
 */
export function zodValidation<T>(schema: any) {
  return new Elysia()
    .onBeforeHandle(({ body, set }) => {
      if (body) {
        const validation = safeValidate(schema, body);
        if (!validation.success) {
          set.status = 400;
          return validation.error;
        }
        // Replace body with validated data
        (body as any) = validation.data;
      }
    });
}

/**
 * Query validation middleware
 */
export function zodQueryValidation<T>(schema: any) {
  return new Elysia()
    .onBeforeHandle(({ query, set }) => {
      if (query) {
        const validation = safeValidate(schema, query);
        if (!validation.success) {
          set.status = 400;
          return validation.error;
        }
        // Replace query with validated data
        (query as any) = validation.data;
      }
    });
}

/**
 * Params validation middleware
 */
export function zodParamsValidation<T>(schema: any) {
  return new Elysia()
    .onBeforeHandle(({ params, set }) => {
      if (params) {
        const validation = safeValidate(schema, params);
        if (!validation.success) {
          set.status = 400;
          return validation.error;
        }
        // Replace params with validated data
        (params as any) = validation.data;
      }
    });
}

/**
 * Response validation middleware
 */
export function zodResponseValidation<T>(schema: any) {
  return new Elysia()
    .onAfterHandle(({ response, set }) => {
      if (response) {
        const validation = safeValidate(schema, response);
        if (!validation.success) {
          set.status = 500;
          return {
            success: false,
            error: 'Response validation failed',
            details: validation.error,
          };
        }
      }
    });
}

/**
 * Custom validation error handler
 */
export function zodErrorHandler() {
  return new Elysia()
    .onError(({ error, set }) => {
      if (error.name === 'ZodError') {
        set.status = 400;
        return formatZodError(error);
      }
    });
}

/**
 * Validation decorator for methods
 */
export function validate(schema: any) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const [request] = args;
      
      if (request.body) {
        const validation = safeValidate(schema, request.body);
        if (!validation.success) {
          throw new Error(JSON.stringify(validation.error));
        }
        request.body = validation.data;
      }
      
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}