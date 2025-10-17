/**
 * Complete Notification Service
 * Comprehensive notification service with template processing, queue integration, and retry logic
 */

import { db } from '@/db';
import {
  notifications,
  notificationTemplates,
  userNotificationPreferences,
  notificationDeliveryLogs,
} from '../schema/notifications.schema';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import type {
  SendNotificationRequest,
  NotificationFilter,
  NotificationType,
} from '../types/notification.types';
import { renderTemplate } from '../utils/template-engine';
import { providerRegistry } from '../providers';
import { notificationQueue } from '../utils/notification-queue';
import type { NotificationJob } from '../utils/notification-queue';
import logger from '@/utils/logger';

/**
 * Send a notification with full template processing and async delivery
 */
export async function sendNotification(request: SendNotificationRequest) {
  try {
    // Step 1: Check user preferences
    const preferences = await getUserPreferences(request.userId, request.tenantId, request.type);

    if (preferences && !preferences.isEnabled) {
      logger.warn('User has disabled this notification type', {
        userId: request.userId,
        type: request.type,
      });

      return {
        success: false,
        message: 'User has disabled this notification type',
      };
    }

    // Step 2: Process template if templateId is provided
    let content = request.content;
    let subject = request.subject;

    if (request.templateId) {
      const template = await getTemplate(request.templateId);

      if (template) {
        // Render template with variables
        const renderedContent = renderTemplate(template.body, request.variables || {});
        if (renderedContent.success) {
          content = renderedContent.result;
        }

        if (template.subject) {
          const renderedSubject = renderTemplate(template.subject, request.variables || {});
          if (renderedSubject.success) {
            subject = renderedSubject.result;
          }
        }
      }
    }

    // Step 3: Create notification record
    const [notification] = await db
      .insert(notifications)
      .values({
        userId: request.userId,
        tenantId: request.tenantId,
        departmentId: request.departmentId,
        templateId: request.templateId,
        notificationType: request.type,
        category: request.category,
        priority: request.priority || 'normal',
        subject,
        content,
        variables: request.variables || {},
        status: 'pending',
        metadata: request.metadata || {},
      })
      .returning();

    logger.info('Notification created', {
      notificationId: notification.id,
      userId: request.userId,
      type: request.type,
    });

    // Step 4: Queue for async delivery
    await queueNotificationDelivery(notification.id, {
      userId: notification.userId,
      tenantId: notification.tenantId,
      type: notification.notificationType as NotificationType,
      subject: notification.subject || undefined,
      content: notification.content,
      priority: notification.priority,
      metadata: notification.metadata as Record<string, any>,
    });

    return {
      success: true,
      data: notification,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error('Failed to send notification', {
      error: errorMessage,
      request,
    });

    throw error;
  }
}

/**
 * Queue notification for async delivery
 */
async function queueNotificationDelivery(
  notificationId: string,
  data: {
    userId: string;
    tenantId: string;
    type: NotificationType;
    subject?: string;
    content: string;
    priority: string;
    metadata?: Record<string, any>;
  }
) {
  // Check if provider is available for this notification type
  if (!providerRegistry.isAvailable(data.type)) {
    logger.warn(`No provider available for notification type: ${data.type}`, {
      notificationId,
    });

    // Mark notification as failed
    await updateNotificationStatus(notificationId, 'failed', 'No provider available');

    return;
  }

  // Add to queue
  await notificationQueue.add({
    notificationId,
    type: data.type,
    priority: data.priority as any,
    data: {
      userId: data.userId,
      tenantId: data.tenantId,
      subject: data.subject,
      content: data.content,
      metadata: data.metadata,
    },
    maxAttempts: 3,
  });

  logger.debug('Notification queued for delivery', {
    notificationId,
    type: data.type,
  });
}

/**
 * Deliver notification (called by queue worker)
 */
export async function deliverNotification(job: NotificationJob) {
  const { notificationId, type, data } = job;

  try {
    logger.info('Delivering notification', {
      notificationId,
      type,
      attempt: job.attempts,
    });

    // Get provider
    const provider = providerRegistry.get(type);

    if (!provider || !provider.isEnabled()) {
      throw new Error(`Provider not available: ${type}`);
    }

    // Get recipient based on type
    const recipient = await getRecipient(data.userId, type);

    if (!recipient) {
      throw new Error(`No recipient found for user ${data.userId} and type ${type}`);
    }

    // Send via provider
    const result = await provider.send({
      notificationId,
      userId: data.userId,
      tenantId: data.tenantId,
      recipient,
      subject: data.subject,
      content: data.content,
      metadata: data.metadata,
      priority: job.priority,
    });

    // Log delivery attempt
    await logDeliveryAttempt(notificationId, type, job.attempts, result);

    if (result.success) {
      // Update notification status
      await updateNotificationStatus(notificationId, 'sent', undefined, result.deliveredAt);

      logger.info('Notification delivered successfully', {
        notificationId,
        type,
        providerId: result.providerId,
      });
    } else {
      throw new Error(result.errorMessage || 'Unknown delivery error');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error('Notification delivery failed', {
      notificationId,
      type,
      attempt: job.attempts,
      error: errorMessage,
    });

    // Log failed attempt
    await logDeliveryAttempt(notificationId, type, job.attempts, {
      success: false,
      errorMessage,
    });

    // Update notification status if max attempts reached
    if (job.attempts >= job.maxAttempts) {
      await updateNotificationStatus(notificationId, 'failed', errorMessage);
    }

    // Re-throw to trigger queue retry
    throw error;
  }
}

/**
 * Get recipient address/ID for notification type
 * Fetches real data from database
 */
async function getRecipient(userId: string, type: NotificationType): Promise<string | null> {
  const { getUserEmail, getUserPhone, getUserTelegramChatId, getUserDeviceTokens } = await import(
    '../../users/services/profile.service'
  );

  switch (type) {
    case 'in_app':
      // In-app notifications use userId as identifier
      return userId;

    case 'email': {
      // Fetch email from users table
      const email = await getUserEmail(userId);
      if (!email) {
        logger.warn('No email found for user', { userId });
      }
      return email;
    }

    case 'push': {
      // Fetch device tokens from user_profiles table
      const deviceTokens = await getUserDeviceTokens(userId);
      if (deviceTokens.length === 0) {
        logger.warn('No device tokens found for user', { userId });
        return null;
      }
      // Return first device token (providers handle multiple tokens separately)
      return deviceTokens[0];
    }

    case 'telegram': {
      // Fetch Telegram chat ID from user_profiles table
      const telegramChatId = await getUserTelegramChatId(userId);
      if (!telegramChatId) {
        logger.warn('No Telegram chat ID found for user', { userId });
      }
      return telegramChatId;
    }

    case 'sms': {
      // Fetch phone from user_profiles table
      const phone = await getUserPhone(userId);
      if (!phone) {
        logger.warn('No phone number found for user', { userId });
      }
      // SMS currently not available (Twilio removed), but data ready for future implementation
      return null;
    }

    default:
      logger.warn('Unknown notification type', { type });
      return null;
  }
}

/**
 * Get notification template
 */
async function getTemplate(templateId: string) {
  const [template] = await db
    .select()
    .from(notificationTemplates)
    .where(eq(notificationTemplates.id, templateId))
    .limit(1);

  return template || null;
}

/**
 * Get user notification preferences
 */
async function getUserPreferences(userId: string, tenantId: string, notificationType: string) {
  const [preferences] = await db
    .select()
    .from(userNotificationPreferences)
    .where(
      and(
        eq(userNotificationPreferences.userId, userId),
        eq(userNotificationPreferences.tenantId, tenantId),
        eq(userNotificationPreferences.notificationType, notificationType)
      )
    )
    .limit(1);

  return preferences || null;
}

/**
 * Update notification status
 */
async function updateNotificationStatus(
  notificationId: string,
  status: 'pending' | 'sent' | 'failed' | 'read',
  failureReason?: string,
  sentAt?: Date
) {
  await db
    .update(notifications)
    .set({
      status,
      failureReason,
      sentAt,
      updatedAt: new Date(),
    })
    .where(eq(notifications.id, notificationId));
}

/**
 * Log delivery attempt
 */
async function logDeliveryAttempt(
  notificationId: string,
  type: NotificationType,
  attemptNumber: number,
  result: {
    success: boolean;
    providerId?: string;
    providerResponse?: Record<string, any>;
    errorCode?: string;
    errorMessage?: string;
    deliveredAt?: Date;
  }
) {
  const provider = providerRegistry.get(type);

  await db.insert(notificationDeliveryLogs).values({
    notificationId,
    attemptNumber,
    status: result.success ? 'success' : 'failed',
    providerName: provider?.getInfo().providerName || type,
    providerMessageId: result.providerId,
    providerResponse: result.providerResponse,
    errorCode: result.errorCode,
    errorMessage: result.errorMessage,
    deliveredAt: result.deliveredAt,
  });
}

/**
 * Get notifications for a user (from original service)
 */
export async function getUserNotifications(userId: string, filter?: NotificationFilter) {
  const conditions = [eq(notifications.userId, userId)];

  if (filter?.status) {
    conditions.push(eq(notifications.status, filter.status));
  }

  if (filter?.category) {
    conditions.push(eq(notifications.category, filter.category));
  }

  if (filter?.priority) {
    conditions.push(eq(notifications.priority, filter.priority));
  }

  if (filter?.departmentId) {
    conditions.push(eq(notifications.departmentId, filter.departmentId));
  }

  if (filter?.startDate) {
    conditions.push(gte(notifications.createdAt, filter.startDate));
  }

  if (filter?.endDate) {
    conditions.push(lte(notifications.createdAt, filter.endDate));
  }

  const userNotifications = await db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(filter?.limit || 100)
    .offset(filter?.offset || 0);

  return userNotifications;
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string, userId: string) {
  const [updated] = await db
    .update(notifications)
    .set({
      status: 'read',
      readAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
    .returning();

  return updated;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string) {
  await db
    .update(notifications)
    .set({
      status: 'read',
      readAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(notifications.userId, userId), eq(notifications.status, 'pending')));

  return { success: true };
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string) {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.status, 'pending')));

  return result?.count || 0;
}

/**
 * Update user notification preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  tenantId: string,
  notificationType: string,
  channelPreferences: Record<string, boolean>,
  isEnabled: boolean = true
) {
  const existing = await db
    .select()
    .from(userNotificationPreferences)
    .where(
      and(
        eq(userNotificationPreferences.userId, userId),
        eq(userNotificationPreferences.tenantId, tenantId),
        eq(userNotificationPreferences.notificationType, notificationType)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing
    const [updated] = await db
      .update(userNotificationPreferences)
      .set({
        channelPreferences,
        isEnabled,
        updatedAt: new Date(),
      })
      .where(eq(userNotificationPreferences.id, existing[0].id))
      .returning();

    return updated;
  } else {
    // Create new
    const [created] = await db
      .insert(userNotificationPreferences)
      .values({
        userId,
        tenantId,
        notificationType,
        channelPreferences,
        isEnabled,
      })
      .returning();

    return created;
  }
}

/**
 * Get delivery logs for a notification
 */
export async function getDeliveryLogs(notificationId: string) {
  return await db
    .select()
    .from(notificationDeliveryLogs)
    .where(eq(notificationDeliveryLogs.notificationId, notificationId))
    .orderBy(desc(notificationDeliveryLogs.createdAt));
}

/**
 * Initialize notification queue workers
 * Must be called after queue.initialize()
 */
export async function initializeNotificationWorkers(): Promise<void> {
  logger.info('[NOTIFICATION] Initializing notification queue workers...');

  // Initialize BullMQ queue first
  await notificationQueue.initialize();

  // Register workers for each notification type (SMS removed - no Twilio)
  const types: NotificationType[] = ['email', 'push', 'telegram', 'in_app'];

  types.forEach((type) => {
    notificationQueue.registerWorker(type, async (job) => {
      await deliverNotification(job);
    });
  });

  logger.info('[NOTIFICATION] Notification queue workers initialized successfully', {
    availableTypes: types,
  });
}
