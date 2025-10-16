import { Elysia } from 'elysia';
import logger, { logRequest, getCorrelationId } from '../utils/logger';

/**
 * Enterprise-Grade Logging Middleware
 * Features:
 * - Correlation IDs for distributed tracing
 * - Request/Response logging with full context
 * - Performance monitoring
 * - User/Tenant context tracking
 */

interface RequestContext {
  correlation_id: string;
  startTime: number;
  user_id?: string;
  tenant_id?: string;
}

export const loggerMiddleware = new Elysia({ name: 'logger' })
  .derive({ as: 'global' }, () => ({
    // Attach logger to context for use in routes
    logger,
  }))
  .onRequest(({ request }) => {
    // Extract path from request URL
    const url = new URL(request.url);
    const path = url.pathname;

    // Skip logging for swagger documentation routes (to avoid duplicates)
    if (path === '/swagger' || path.startsWith('/swagger/')) {
      return;
    }

    // Generate correlation ID for this request
    const correlation_id = request.headers.get('x-correlation-id') || getCorrelationId();

    // Store request context
    const context: RequestContext = {
      correlation_id,
      startTime: Date.now(),
    };

    // Attach to request
    (request as any).context = context;

    // Log incoming request (debug level only, minimal metadata)
    logger.debug(`→ ${request.method} ${path}`, {
      source: 'http',
      correlation_id,
    });
  })
  .onAfterResponse(({ request, set }) => {
    // Extract path from request URL
    const url = new URL(request.url);
    const path = url.pathname;

    // Skip logging for swagger documentation routes
    if (path === '/swagger' || path.startsWith('/swagger/')) {
      return;
    }

    // Get request context
    const context: RequestContext = (request as any).context || {
      correlation_id: getCorrelationId(),
      startTime: Date.now(),
    };

    // Calculate request duration
    const duration = Date.now() - context.startTime;
    const statusCode = typeof set.status === 'number' ? set.status : 200;

    // Extract user context if available (from auth middleware)
    const user_id = (request as any).user?.id;
    const tenant_id = (request as any).tenant?.id;

    // Log request with minimal context
    logRequest(
      request.method,
      path,
      statusCode,
      duration,
      {
        source: 'http',
        correlation_id: context.correlation_id,
        ...(user_id && { user_id }),
        ...(tenant_id && { tenant_id }),
      }
    );
  })
  .onError(({ request, error, set }) => {
    // Extract path from request URL
    const url = new URL(request.url);
    const path = url.pathname;

    // Skip logging for swagger documentation routes
    if (path === '/swagger' || path.startsWith('/swagger/')) {
      return;
    }

    // Get request context
    const context: RequestContext = (request as any).context || {
      correlation_id: getCorrelationId(),
      startTime: Date.now(),
    };

    // Calculate request duration
    const duration = Date.now() - context.startTime;
    const statusCode = typeof set.status === 'number' ? set.status : 500;

    // Extract user context
    const user_id = (request as any).user?.id;
    const tenant_id = (request as any).tenant?.id;

    // Extract error details safely
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : 'Error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Log error with essential context only
    logger.error(`✗ ${request.method} ${path} ${statusCode} ${duration}ms - ${errorMessage}`, {
      source: 'http',
      correlation_id: context.correlation_id,
      error_type: errorName,
      ...(user_id && { user_id }),
      ...(tenant_id && { tenant_id }),
      ...(statusCode >= 500 && errorStack && { stack: errorStack }), // Stack trace only for 5xx errors
    });
  });
