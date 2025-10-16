/**
 * In-App Provider
 * Stores notifications in database for display within the application
 * No external API needed - notifications are already persisted
 */

import logger from '@/utils/logger';
import { BaseProvider, type DeliveryResult, type NotificationPayload } from './base-provider';

/**
 * In-App provider implementation
 */
export class InAppProvider extends BaseProvider {
  constructor(config: any = {}) {
    super('in_app', 'InApp', {
      enabled: true, // Always enabled
      credentials: {},
      options: config.options || {},
    });
  }

  protected isConfigured(): boolean {
    return true; // Always configured (no external dependencies)
  }

  validateRecipient(recipient: string): boolean {
    // Recipient should be a user ID
    return recipient.length > 0;
  }

  async send(payload: NotificationPayload): Promise<DeliveryResult> {
    try {
      if (!this.validateRecipient(payload.recipient)) {
        return {
          success: false,
          errorCode: 'INVALID_RECIPIENT',
          errorMessage: 'Invalid user ID',
        };
      }

      logger.info(`[IN-APP] Marking notification as delivered (already in database)`, {
        notificationId: payload.notificationId,
        userId: payload.recipient,
      });

      // In-app notifications are already stored in the database
      // This provider just marks them as "sent" (delivered to database)
      const providerId = `in_app_${payload.notificationId}`;

      return {
        success: true,
        providerId,
        providerResponse: {
          userId: payload.recipient,
          stored: true,
        },
        deliveredAt: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error(`[IN-APP] Failed to process in-app notification`, {
        notificationId: payload.notificationId,
        userId: payload.recipient,
        error: errorMessage,
      });

      return {
        success: false,
        errorCode: 'IN_APP_FAILED',
        errorMessage,
      };
    }
  }
}

// Export singleton instance
export const inAppProvider = new InAppProvider();
