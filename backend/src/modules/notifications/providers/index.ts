/**
 * Provider Registry
 * Central registry for all notification channel providers
 */

import type { BaseProvider } from './base-provider';
import { emailProvider } from './email-provider';
// SMS provider removed - using free alternative instead of Twilio
// import { smsProvider } from './sms-provider';
import { pushProvider } from './push-provider';
import { telegramProvider } from './telegram-provider';
import { inAppProvider } from './in-app-provider';
import type { NotificationType } from '../types/notification.types';
import logger from '@/utils/logger';

/**
 * Provider registry
 */
class ProviderRegistry {
  private providers: Map<NotificationType, BaseProvider> = new Map();

  /**
   * Register a provider
   */
  register(type: NotificationType, provider: BaseProvider) {
    this.providers.set(type, provider);
    logger.info(`Provider registered: ${type}`, {
      providerName: provider.getInfo().providerName,
      enabled: provider.isEnabled(),
    });
  }

  /**
   * Get provider by type
   */
  get(type: NotificationType): BaseProvider | undefined {
    return this.providers.get(type);
  }

  /**
   * Get all registered providers
   */
  getAll(): BaseProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get all enabled providers
   */
  getEnabled(): BaseProvider[] {
    return this.getAll().filter((p) => p.isEnabled());
  }

  /**
   * Check if provider is registered and enabled
   */
  isAvailable(type: NotificationType): boolean {
    const provider = this.providers.get(type);
    return provider ? provider.isEnabled() : false;
  }

  /**
   * Get provider info
   */
  getInfo() {
    return Array.from(this.providers.entries()).map(([, provider]) => provider.getInfo());
  }
}

// Create singleton registry
export const providerRegistry = new ProviderRegistry();

// Register all providers
providerRegistry.register('email', emailProvider);
// SMS provider removed - using free alternative instead of Twilio
// providerRegistry.register('sms', smsProvider);
providerRegistry.register('push', pushProvider);
providerRegistry.register('telegram', telegramProvider);
providerRegistry.register('in_app', inAppProvider);

// Log registered providers
logger.info('Notification providers registered', {
  providers: providerRegistry.getInfo(),
});

// Export individual providers
export { emailProvider } from './email-provider';
// SMS provider removed - using free alternative instead of Twilio
// export { smsProvider } from './sms-provider';
export { pushProvider } from './push-provider';
export { telegramProvider } from './telegram-provider';
export { inAppProvider } from './in-app-provider';
export { BaseProvider } from './base-provider';
export type { DeliveryResult, NotificationPayload, ProviderConfig } from './base-provider';
