/**
 * Development Auth Routes
 * ONLY FOR DEVELOPMENT - Auto-verify emails, bypass restrictions
 */

import { Elysia, t } from 'elysia';
import { db } from '@/db';
import { users } from '../schema/auth.schema';
import { eq } from 'drizzle-orm';
import { NotFoundError } from '@/utils/errors';

const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

/**
 * Development-only auth routes
 * These endpoints are disabled in production
 */
export const devAuthRoutes = new Elysia({ prefix: '/api/dev/auth', name: 'dev-auth-routes' })
  .onBeforeHandle(({ set }) => {
    if (!isDevelopment) {
      set.status = 403;
      return {
        error: 'Forbidden',
        message: 'Development endpoints are disabled in production',
      };
    }
    return; // Explicit return for TypeScript
  })

  // Auto-verify email by email address
  .post(
    '/verify-email',
    async ({ body }) => {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, body.email))
        .limit(1);

      if (!user) {
        throw new NotFoundError('User not found', { email: body.email });
      }

      if (user.emailVerified) {
        return {
          success: true,
          message: 'Email already verified',
          data: {
            userId: user.id,
            email: user.email,
            emailVerified: true,
          },
        };
      }

      const [updatedUser] = await db
        .update(users)
        .set({ emailVerified: true })
        .where(eq(users.email, body.email))
        .returning();

      return {
        success: true,
        message: 'Email verified successfully',
        data: {
          userId: updatedUser.id,
          email: updatedUser.email,
          emailVerified: updatedUser.emailVerified,
        },
      };
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
      }),
      detail: {
        tags: ['Development'],
        summary: '[DEV] Auto-verify email',
        description: 'Automatically verify user email (development only)',
      },
    }
  )

  // Get all users (simplified)
  .get(
    '/users',
    async () => {
      const allUsers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          emailVerified: users.emailVerified,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(users.createdAt);

      return {
        success: true,
        data: allUsers,
        total: allUsers.length,
      };
    },
    {
      detail: {
        tags: ['Development'],
        summary: '[DEV] List all users',
        description: 'Get list of all users (development only, no auth required)',
      },
    }
  )

  // Quick login helper (returns user data without actual session)
  .post(
    '/quick-info',
    async ({ body }) => {
      const [user] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          emailVerified: users.emailVerified,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.email, body.email))
        .limit(1);

      if (!user) {
        throw new NotFoundError('User not found', { email: body.email });
      }

      return {
        success: true,
        data: user,
        hint: user.emailVerified
          ? 'Email verified - ready to login'
          : 'Email not verified - use POST /api/dev/auth/verify-email first',
      };
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
      }),
      detail: {
        tags: ['Development'],
        summary: '[DEV] Get user info',
        description: 'Get user information by email (development only)',
      },
    }
  );
