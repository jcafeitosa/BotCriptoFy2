/**
 * Users Admin Routes
 * Administrative endpoints for user management (moved from Auth)
 */

import { Elysia, t } from 'elysia';
import { sessionGuard } from '../../auth/middleware/session.middleware';
import { db } from '@/db';
import { users } from '../../auth/schema/auth.schema';
import { eq } from 'drizzle-orm';
import { ForbiddenError, NotFoundError } from '@/utils/errors';
import { getUserRoles } from '../../security/services/role.service';

async function requireAdmin(user: any) {
  const userRoles = await getUserRoles(user.id);
  const isAdmin = userRoles.some((role) => role === 'admin' || role === 'super_admin');
  if (!isAdmin) throw new ForbiddenError('Admin access required');
}

export const adminUserRoutes = new Elysia({ prefix: '/api/admin/users', name: 'admin-user-routes' })
  .use(sessionGuard)

  // List all users
  .get(
    '/',
    async ({ user }) => {
      await requireAdmin(user);

      const allUsers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          emailVerified: users.emailVerified,
          image: users.image,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(users.createdAt);

      return { success: true, data: allUsers, total: allUsers.length };
    },
    {
      detail: {
        tags: ['Users - Admin'],
        summary: 'List all users',
        description: 'Get list of all users (admin only)',
      },
    }
  )

  // Verify user email (admin override)
  .post(
    '/:userId/verify-email',
    async ({ user, params }) => {
      await requireAdmin(user);

      const [updatedUser] = await db
        .update(users)
        .set({ emailVerified: true })
        .where(eq(users.id, params.userId))
        .returning();

      if (!updatedUser) throw new NotFoundError('User not found', { userId: params.userId });

      return {
        success: true,
        message: 'Email verified successfully',
        data: { userId: updatedUser.id, email: updatedUser.email, emailVerified: updatedUser.emailVerified },
      };
    },
    {
      params: t.Object({ userId: t.String() }),
      detail: {
        tags: ['Users - Admin'],
        summary: 'Verify user email',
        description: 'Manually verify a user email (admin only)',
      },
    }
  )

  // Get user details
  .get(
    '/:userId',
    async ({ user, params }) => {
      await requireAdmin(user);

      const [targetUser] = await db.select().from(users).where(eq(users.id, params.userId)).limit(1);
      if (!targetUser) throw new NotFoundError('User not found', { userId: params.userId });

      return { success: true, data: targetUser };
    },
    {
      params: t.Object({ userId: t.String() }),
      detail: {
        tags: ['Users - Admin'],
        summary: 'Get user details',
        description: 'Get detailed user information (admin only)',
      },
    }
  )

  // Delete user
  .delete(
    '/:userId',
    async ({ user, params }) => {
      await requireAdmin(user);
      if (user.id === params.userId) throw new ForbiddenError('Cannot delete your own account');

      const [deletedUser] = await db.delete(users).where(eq(users.id, params.userId)).returning();
      if (!deletedUser) throw new NotFoundError('User not found', { userId: params.userId });

      return { success: true, message: 'User deleted successfully', data: { userId: deletedUser.id, email: deletedUser.email } };
    },
    {
      params: t.Object({ userId: t.String() }),
      detail: {
        tags: ['Users - Admin'],
        summary: 'Delete user',
        description: 'Delete a user account (admin only, cannot delete self)',
      },
    }
  );

