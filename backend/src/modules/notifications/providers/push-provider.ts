/**
 * Push Notification Provider
 * Sends push notifications using Firebase Cloud Messaging (FCM)
 * Production-ready implementation with firebase-admin SDK
 */

import logger from '@/utils/logger';
import admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';
import { BaseProvider, type DeliveryResult, type NotificationPayload } from './base-provider';

/**
 * Push provider configuration
 */
interface PushProviderConfig {
  enabled: boolean;
  credentials: {
    serviceAccount: ServiceAccount | string;
    databaseURL?: string;
  };
  options?: {
    dryRun?: boolean;
    priority?: 'high' | 'normal';
    timeToLive?: number; // in seconds
  };
}

/**
 * Push provider implementation with Firebase Cloud Messaging
 */
export class PushProvider extends BaseProvider {
  private messaging?: admin.messaging.Messaging;
  private readonly pushConfig: PushProviderConfig;
  private isInitialized = false;

  constructor(config: Partial<PushProviderConfig> = {}) {
    super('push', 'Firebase', {
      enabled: config.enabled !== false,
      credentials: config.credentials || {},
      options: config.options || {},
    });

    this.pushConfig = config as PushProviderConfig;

    // Initialize Firebase
    if (this.isEnabled() && this.isConfigured()) {
      this.initializeFirebase();
    }
  }

  /**
   * Initialize Firebase Admin SDK
   */
  private initializeFirebase(): void {
    if (!this.pushConfig.credentials?.serviceAccount) {
      logger.warn('[PUSH] No service account provided, provider disabled');
      return;
    }

    try {
      // Parse service account if it's a JSON string
      let serviceAccount: ServiceAccount;
      if (typeof this.pushConfig.credentials.serviceAccount === 'string') {
        serviceAccount = JSON.parse(this.pushConfig.credentials.serviceAccount);
      } else {
        serviceAccount = this.pushConfig.credentials.serviceAccount;
      }

      // Check if Firebase app already exists
      let app: admin.app.App;
      try {
        app = admin.app('[NOTIFICATIONS]');
      } catch {
        // Initialize new app
        app = admin.initializeApp(
          {
            credential: admin.credential.cert(serviceAccount),
            databaseURL: this.pushConfig.credentials.databaseURL,
          },
          '[NOTIFICATIONS]'
        );
      }

      this.messaging = admin.messaging(app);
      this.isInitialized = true;

      logger.info('[PUSH] Firebase Admin SDK initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[PUSH] Failed to initialize Firebase', { error: errorMessage });
    }
  }

  /**
   * Check if provider is properly configured
   */
  protected isConfigured(): boolean {
    if (!this.pushConfig.credentials?.serviceAccount) {
      return false;
    }

    try {
      // Validate service account structure
      const serviceAccount =
        typeof this.pushConfig.credentials.serviceAccount === 'string'
          ? JSON.parse(this.pushConfig.credentials.serviceAccount)
          : this.pushConfig.credentials.serviceAccount;

      return !!(
        serviceAccount.project_id &&
        serviceAccount.private_key &&
        serviceAccount.client_email
      );
    } catch {
      return false;
    }
  }

  /**
   * Validate FCM device token format
   * FCM tokens are typically 140+ characters, alphanumeric with hyphens and underscores
   */
  validateRecipient(recipient: string): boolean {
    return recipient.length > 50 && /^[A-Za-z0-9_-]+$/.test(recipient);
  }

  /**
   * Send push notification
   */
  async send(payload: NotificationPayload): Promise<DeliveryResult> {
    try {
      if (!this.validateRecipient(payload.recipient)) {
        return {
          success: false,
          errorCode: 'INVALID_RECIPIENT',
          errorMessage: 'Invalid FCM device token format',
        };
      }

      if (!this.messaging || !this.isInitialized) {
        return {
          success: false,
          errorCode: 'PROVIDER_NOT_CONFIGURED',
          errorMessage: 'Firebase messaging not properly configured',
        };
      }

      logger.info(`[PUSH] Sending push notification`, {
        notificationId: payload.notificationId,
        recipient: payload.recipient.substring(0, 20) + '...',
      });

      // Build FCM message
      const message: admin.messaging.Message = {
        token: payload.recipient,
        notification: {
          title: payload.subject || 'Notification',
          body: this.stripHtmlTags(payload.content),
        },
        data: {
          notificationId: payload.notificationId,
          ...(payload.metadata || {}),
        },
        android: {
          priority: this.pushConfig.options?.priority || 'high',
          ttl: (this.pushConfig.options?.timeToLive || 86400) * 1000, // Convert to milliseconds
        },
        apns: {
          headers: {
            'apns-priority': this.pushConfig.options?.priority === 'high' ? '10' : '5',
            'apns-expiration': String(
              Math.floor(Date.now() / 1000) + (this.pushConfig.options?.timeToLive || 86400)
            ),
          },
          payload: {
            aps: {
              alert: {
                title: payload.subject || 'Notification',
                body: this.stripHtmlTags(payload.content),
              },
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      // Send message
      const dryRun = this.pushConfig.options?.dryRun || false;
      const messageId = await this.messaging.send(message, dryRun);

      logger.info(`[PUSH] Push notification sent successfully`, {
        notificationId: payload.notificationId,
        messageId,
        dryRun,
      });

      return {
        success: true,
        providerId: messageId,
        providerResponse: {
          messageId,
          dryRun,
        },
        deliveredAt: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error(`[PUSH] Failed to send push notification`, {
        notificationId: payload.notificationId,
        error: errorMessage,
      });

      // Parse FCM-specific errors
      let errorCode = 'PUSH_SEND_FAILED';
      if (errorMessage.includes('registration-token-not-registered')) {
        errorCode = 'TOKEN_NOT_REGISTERED';
      } else if (errorMessage.includes('invalid-registration-token')) {
        errorCode = 'INVALID_TOKEN';
      } else if (errorMessage.includes('message-rate-exceeded')) {
        errorCode = 'RATE_LIMIT_EXCEEDED';
      }

      return {
        success: false,
        errorCode,
        errorMessage,
      };
    }
  }

  /**
   * Send push notification to multiple tokens
   */
  async sendMulticast(
    tokens: string[],
    notification: { title: string; body: string },
    data?: Record<string, string>
  ): Promise<{ successCount: number; failureCount: number; responses: any[] }> {
    if (!this.messaging || !this.isInitialized) {
      throw new Error('Firebase messaging not initialized');
    }

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification,
      data,
      android: {
        priority: this.pushConfig.options?.priority || 'high',
      },
      apns: {
        payload: {
          aps: {
            alert: notification,
            sound: 'default',
          },
        },
      },
    };

    const response = await this.messaging.sendEachForMulticast(message);

    logger.info('[PUSH] Multicast notification sent', {
      successCount: response.successCount,
      failureCount: response.failureCount,
    });

    return response;
  }

  /**
   * Test Firebase connection
   */
  override async testConnection(): Promise<boolean> {
    if (!this.isEnabled() || !this.isConfigured() || !this.messaging || !this.isInitialized) {
      return false;
    }

    try {
      // Test with a dry run message (won't actually send)
      const testMessage: admin.messaging.Message = {
        token:
          'test_token_1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-',
        notification: {
          title: 'Test',
          body: 'Connection test',
        },
      };

      // This will fail with invalid token, but proves Firebase is accessible
      await this.messaging.send(testMessage, true);
      logger.info('[PUSH] Firebase connection test successful');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // If error is about invalid token, it means Firebase is accessible
      if (errorMessage.includes('invalid-registration-token')) {
        logger.info('[PUSH] Firebase connection test successful (token validation works)');
        return true;
      }
      logger.error('[PUSH] Connection test failed', { error: errorMessage });
      return false;
    }
  }

  /**
   * Strip HTML tags from content
   */
  private stripHtmlTags(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.isInitialized) {
      try {
        const app = admin.app('[NOTIFICATIONS]');
        await app.delete();
        logger.info('[PUSH] Firebase app deleted');
      } catch (error) {
        // App might not exist or already deleted
      }
      this.isInitialized = false;
    }
  }
}

/**
 * Load Push provider configuration from environment variables
 */
function loadPushConfig(): Partial<PushProviderConfig> {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT || '{}';

  return {
    enabled: process.env.PUSH_ENABLED !== 'false',
    credentials: {
      serviceAccount: serviceAccountJson,
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    },
    options: {
      dryRun: process.env.PUSH_DRY_RUN === 'true',
      priority: (process.env.PUSH_PRIORITY as 'high' | 'normal') || 'high',
      timeToLive: parseInt(process.env.PUSH_TTL || '86400', 10), // 24 hours default
    },
  };
}

// Export singleton instance with environment config
export const pushProvider = new PushProvider(loadPushConfig());
