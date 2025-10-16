import { logError } from './logger';

/**
 * Custom Error Classes for BotCriptoFy2
 * Provides structured error handling with HTTP status codes
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad Request', context?: Record<string, any>) {
    super(message, 400, true, context);
  }
}

/**
 * 401 Unauthorized
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', context?: Record<string, any>) {
    super(message, 401, true, context);
  }
}

/**
 * 403 Forbidden
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', context?: Record<string, any>) {
    super(message, 403, true, context);
  }
}

/**
 * 404 Not Found
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', context?: Record<string, any>) {
    super(message, 404, true, context);
  }
}

/**
 * 409 Conflict
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Conflict', context?: Record<string, any>) {
    super(message, 409, true, context);
  }
}

/**
 * 422 Unprocessable Entity
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', context?: Record<string, any>) {
    super(message, 422, true, context);
  }
}

/**
 * 429 Too Many Requests
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', context?: Record<string, any>) {
    super(message, 429, true, context);
  }
}

/**
 * 500 Internal Server Error
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error', context?: Record<string, any>) {
    super(message, 500, false, context);
  }
}

/**
 * 503 Service Unavailable
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service unavailable', context?: Record<string, any>) {
    super(message, 503, true, context);
  }
}

/**
 * Database Errors
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Database error', context?: Record<string, any>) {
    super(message, 500, false, context);
  }
}

/**
 * External API Errors
 */
export class ExternalAPIError extends AppError {
  constructor(message: string = 'External API error', context?: Record<string, any>) {
    super(message, 502, true, context);
  }
}

/**
 * Error Handler - Formats errors for API responses
 */
export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path?: string;
  context?: Record<string, any>;
  stack?: string;
}

export const formatErrorResponse = (
  error: Error | AppError,
  path?: string,
  includeStack: boolean = false,
): ErrorResponse => {
  // Check if it's our custom AppError
  const isAppError = error instanceof AppError;
  const statusCode = isAppError ? error.statusCode : 500;
  const context = isAppError ? error.context : undefined;

  // Log the error
  logError(error, {
    statusCode,
    path,
    context,
  });

  const response: ErrorResponse = {
    error: error.name,
    message: error.message,
    statusCode,
    timestamp: new Date().toISOString(),
  };

  if (path) {
    response.path = path;
  }

  if (context) {
    response.context = context;
  }

  // Include stack trace in development
  if (includeStack && error.stack) {
    response.stack = error.stack;
  }

  return response;
};

/**
 * Handle unknown errors - convert to AppError
 */
export const handleUnknownError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new InternalServerError(error.message, {
      originalError: error.name,
    });
  }

  if (typeof error === 'string') {
    return new InternalServerError(error);
  }

  return new InternalServerError('An unknown error occurred', {
    error: String(error),
  });
};

/**
 * Async error wrapper - catches errors in async functions
 */
export const asyncHandler = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
): ((...args: Parameters<T>) => Promise<ReturnType<T>>) => {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (error) {
      throw handleUnknownError(error);
    }
  };
};

/**
 * Assert function - throws error if condition is false
 */
export const assert = (
  condition: boolean,
  message: string,
  ErrorClass: new (message: string, context?: Record<string, any>) => AppError = BadRequestError,
  context?: Record<string, any>,
): asserts condition => {
  if (!condition) {
    throw new ErrorClass(message, context);
  }
};
