import { Elysia } from 'elysia';
import { ForbiddenError } from '../utils/errors';
import { errorMiddleware } from '../middleware/error.middleware';

const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Helper function to check if demo endpoints are allowed
 * SECURITY: Demo endpoints are DISABLED in production to prevent:
 * - Information disclosure about error handling
 * - Potential security testing/probing
 * - Exposure of internal system behavior
 */
const checkDemoAllowed = () => {
  if (NODE_ENV === 'production') {
    throw new ForbiddenError('Demo endpoints are disabled in production');
  }
};

/**
 * Error Demo Routes Plugin
 * Provides endpoints to test error handling (development/testing only)
 */
export const errorRoutes = new Elysia({ prefix: '/api/v1/error', name: 'error-routes' })
  .use(errorMiddleware)
  .get(
    '/bad-request',
    ({ set }) => {
      checkDemoAllowed();
      set.status = 400;
      return {
        error: 'BadRequestError',
        message: 'This is a demo bad request error',
        statusCode: 400,
        timestamp: new Date().toISOString(),
        path: '/api/v1/error/bad-request',
      };
    },
    {
      detail: {
        tags: ['Demo'],
        summary: 'Demo 400 error',
        description: 'Returns a demo 400 Bad Request error response',
      },
    }
  )
  .get(
    '/not-found',
    ({ set }) => {
      checkDemoAllowed();
      set.status = 404;
      return {
        error: 'NotFoundError',
        message: 'This resource does not exist',
        statusCode: 404,
        timestamp: new Date().toISOString(),
        path: '/api/v1/error/not-found',
      };
    },
    {
      detail: {
        tags: ['Demo'],
        summary: 'Demo 404 error',
        description: 'Returns a demo 404 Not Found error response',
      },
    }
  )
  .get(
    '/server',
    ({ set }) => {
      checkDemoAllowed();
      set.status = 500;
      return {
        error: 'InternalServerError',
        message: 'This is an unhandled server error',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: '/api/v1/error/server',
      };
    },
    {
      detail: {
        tags: ['Demo'],
        summary: 'Demo 500 error',
        description: 'Returns a demo 500 Internal Server Error response',
      },
    }
  )
  .get(
    '/validation',
    ({ set, query: _query }) => {
      checkDemoAllowed();
      set.status = 422;
      return {
        error: 'ValidationError',
        message: 'Property \'requiredParam\' is required and must be at least 3 characters',
        statusCode: 422,
        timestamp: new Date().toISOString(),
        path: '/api/v1/error/validation',
      };
    },
    {
      detail: {
        tags: ['Demo'],
        summary: 'Demo validation error',
        description: 'Returns a demo validation error response',
      },
    }
  );
