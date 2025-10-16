/**
 * Notification Routes
 * API endpoints for notification management
 */

import { Elysia, t } from 'elysia';
import { sessionGuard } from '../../auth/middleware/session.middleware';
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  updateNotificationPreferences,
} from '../services/notification.service';
import type { NotificationStatus, NotificationCategory, NotificationPriority } from '../types/notification.types';
import { getUserPrimaryTenantId } from '../../auth/services/session.service';
import { BadRequestError } from '@/utils/errors';

export const notificationRoutes = new Elysia({ prefix: '/api/notifications', name: 'notification-routes' })
  .use(sessionGuard)

  // Get user notifications
  .get(
    '/',
    async ({ user, query }) => {
      const notifications = await getUserNotifications(user.id, {
        status: query.status as NotificationStatus | undefined,
        category: query.category as NotificationCategory | undefined,
        priority: query.priority as NotificationPriority | undefined,
      });

      return {
        success: true,
        data: notifications,
        total: notifications.length,
      };
    },
    {
      query: t.Object({
        status: t.Optional(t.String()),
        category: t.Optional(t.String()),
        priority: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Notifications'],
        summary: 'Get user notifications',
        description: 'Get list of notifications for the current user',
      },
    }
  )

  // Get unread count
  .get(
    '/unread-count',
    async ({ user }) => {
      const count = await getUnreadCount(user.id);

      return {
        success: true,
        count,
      };
    },
    {
      detail: {
        tags: ['Notifications'],
        summary: 'Get unread count',
        description: 'Get count of unread notifications',
      },
    }
  )

  // Mark notification as read
  .post(
    '/:id/read',
    async ({ user, params }) => {
      const notification = await markAsRead(params.id, user.id);

      return {
        success: true,
        data: notification,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ['Notifications'],
        summary: 'Mark as read',
        description: 'Mark a notification as read',
      },
    }
  )

  // Mark all as read
  .post(
    '/mark-all-read',
    async ({ user }) => {
      await markAllAsRead(user.id);

      return {
        success: true,
        message: 'All notifications marked as read',
      };
    },
    {
      detail: {
        tags: ['Notifications'],
        summary: 'Mark all as read',
        description: 'Mark all user notifications as read',
      },
    }
  )

  // Update notification preferences
  .put(
    '/preferences',
    async ({ user, body }) => {
      // Get tenantId from body or fetch user's primary tenant
      let tenantId: string | null | undefined = body.tenantId;

      if (!tenantId) {
        tenantId = await getUserPrimaryTenantId(user.id);
      }

      if (!tenantId) {
        throw new BadRequestError('User has no tenant membership. Please provide tenantId.');
      }

      const preferences = await updateNotificationPreferences(
        user.id,
        tenantId,
        body.notificationType,
        body.channelPreferences,
        body.isEnabled
      );

      return {
        success: true,
        data: preferences,
      };
    },
    {
      body: t.Object({
        notificationType: t.String(),
        channelPreferences: t.Record(t.String(), t.Boolean()),
        isEnabled: t.Optional(t.Boolean()),
        tenantId: t.Optional(t.String()),
      }),
      detail: {
        tags: ['Notifications'],
        summary: 'Update preferences',
        description: 'Update notification preferences for the user',
      },
    }
  );
