import { Elysia } from 'elysia';
import { AppError, formatErrorResponse } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Elysia Error Handling Middleware
 * Provides structured error responses with Winston logging
 */

export const errorMiddleware = new Elysia({ name: 'error-handler' })
  .onError(({ code, error, set, path }) => {
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Handle AppError instances
    if (error instanceof AppError) {
      set.status = error.statusCode;
      return formatErrorResponse(error, path, isDevelopment);
    }

    // Handle Elysia validation errors
    if (code === 'VALIDATION') {
      set.status = 422;
      logger.warn(`Validation error at ${path}`, {
        error: error.message,
        path,
      });

      return {
        error: 'Validation Error',
        message: error.message,
        statusCode: 422,
        timestamp: new Date().toISOString(),
        path,
      };
    }

    // Handle Elysia NOT_FOUND errors
    if (code === 'NOT_FOUND') {
      set.status = 404;
      logger.warn(`Route not found: ${path}`);

      return {
        error: 'Not Found',
        message: 'The requested resource was not found',
        statusCode: 404,
        timestamp: new Date().toISOString(),
        path,
      };
    }

    // Handle Elysia PARSE errors
    if (code === 'PARSE') {
      set.status = 400;
      logger.warn(`Parse error at ${path}`, {
        error: error.message,
      });

      return {
        error: 'Parse Error',
        message: 'Invalid request body or parameters',
        statusCode: 400,
        timestamp: new Date().toISOString(),
        path,
      };
    }

    // Handle Elysia INVALID_COOKIE_SIGNATURE
    if (code === 'INVALID_COOKIE_SIGNATURE') {
      set.status = 401;
      logger.warn(`Invalid cookie signature at ${path}`);

      return {
        error: 'Unauthorized',
        message: 'Invalid authentication token',
        statusCode: 401,
        timestamp: new Date().toISOString(),
        path,
      };
    }

    // Handle unknown errors
    set.status = 500;

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error(`Unhandled error at ${path}`, {
      code,
      error: errorMessage,
      stack: errorStack,
      path,
    });

    return {
      error: 'Internal Server Error',
      message: isDevelopment ? errorMessage : 'An unexpected error occurred',
      statusCode: 500,
      timestamp: new Date().toISOString(),
      path,
      ...(isDevelopment && errorStack && { stack: errorStack }),
    };
  });
