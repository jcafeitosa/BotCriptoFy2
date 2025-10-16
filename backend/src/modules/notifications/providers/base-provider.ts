/**
 * Base Provider Interface
 * Abstract base class for all notification channel providers
 */

import type { NotificationType } from '../types/notification.types';

/**
 * Provider configuration interface
 */
export interface ProviderConfig {
  enabled: boolean;
  credentials?: Record<string, any>;
  options?: Record<string, any>;
}

/**
 * Notification delivery result
 */
export interface DeliveryResult {
  success: boolean;
  providerId?: string; // External provider's message ID
  providerResponse?: Record<string, any>;
  errorCode?: string;
  errorMessage?: string;
  deliveredAt?: Date;
}

/**
 * Notification payload
 */
export interface NotificationPayload {
  notificationId: string;
  userId: string;
  tenantId: string;
  recipient: string; // email address, phone number, device token, etc.
  subject?: string;
  content: string;
  metadata?: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

/**
 * Abstract base provider class
 */
export abstract class BaseProvider {
  protected config: ProviderConfig;
  protected type: NotificationType;
  protected providerName: string;

  constructor(type: NotificationType, providerName: string, config: ProviderConfig) {
    this.type = type;
    this.providerName = providerName;
    this.config = config;
  }

  /**
   * Check if provider is enabled and configured
   */
  isEnabled(): boolean {
    return this.config.enabled && this.isConfigured();
  }

  /**
   * Check if provider is properly configured
   * Must be implemented by subclasses
   */
  protected abstract isConfigured(): boolean;

  /**
   * Send notification
   * Must be implemented by subclasses
   */
  abstract send(payload: NotificationPayload): Promise<DeliveryResult>;

  /**
   * Validate recipient format
   * Must be implemented by subclasses
   */
  abstract validateRecipient(recipient: string): boolean;

  /**
   * Get provider information
   */
  getInfo() {
    return {
      type: this.type,
      providerName: this.providerName,
      enabled: this.isEnabled(),
    };
  }

  /**
   * Test provider connection (optional)
   */
  async testConnection(): Promise<boolean> {
    return this.isEnabled();
  }
}
