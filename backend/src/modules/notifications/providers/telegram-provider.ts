/**
 * Telegram Provider
 * Sends Telegram notifications using Telegram Bot API
 * Production-ready implementation with node-telegram-bot-api
 */

import logger from '@/utils/logger';
import TelegramBot from 'node-telegram-bot-api';
import { BaseProvider, type DeliveryResult, type NotificationPayload } from './base-provider';

/**
 * Telegram provider configuration
 */
interface TelegramProviderConfig {
  enabled: boolean;
  credentials: {
    botToken: string;
  };
  options?: {
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    disableNotification?: boolean;
    timeout?: number;
  };
}

/**
 * Telegram provider implementation with Bot API
 */
export class TelegramProvider extends BaseProvider {
  private bot?: TelegramBot;
  private readonly telegramConfig: TelegramProviderConfig;

  constructor(config: Partial<TelegramProviderConfig> = {}) {
    super('telegram', 'Telegram', {
      enabled: config.enabled !== false,
      credentials: config.credentials || {},
      options: config.options || {},
    });

    this.telegramConfig = config as TelegramProviderConfig;

    // Initialize bot
    if (this.isEnabled() && this.isConfigured()) {
      this.initializeBot();
    }
  }

  /**
   * Initialize Telegram Bot
   */
  private initializeBot(): void {
    if (!this.telegramConfig.credentials?.botToken) {
      logger.warn('[TELEGRAM] No bot token provided, provider disabled');
      return;
    }

    try {
      // Initialize bot without polling (we only send messages)
      this.bot = new TelegramBot(this.telegramConfig.credentials.botToken, {
        polling: false,
      });

      logger.info('[TELEGRAM] Bot initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[TELEGRAM] Failed to initialize bot', { error: errorMessage });
    }
  }

  /**
   * Check if provider is properly configured
   */
  protected isConfigured(): boolean {
    return !!(
      this.telegramConfig.credentials?.botToken &&
      this.telegramConfig.credentials.botToken.length > 0
    );
  }

  /**
   * Validate Telegram chat ID format
   * Can be numeric (positive for users, negative for groups/channels)
   */
  validateRecipient(recipient: string): boolean {
    // Telegram chat ID validation (numeric, can be negative for groups)
    // Also supports @username format
    return /^-?\d+$/.test(recipient) || /^@[a-zA-Z0-9_]{5,32}$/.test(recipient);
  }

  /**
   * Send Telegram notification
   */
  async send(payload: NotificationPayload): Promise<DeliveryResult> {
    try {
      if (!this.validateRecipient(payload.recipient)) {
        return {
          success: false,
          errorCode: 'INVALID_RECIPIENT',
          errorMessage: 'Invalid Telegram chat ID (must be numeric or @username)',
        };
      }

      if (!this.bot || !this.isConfigured()) {
        return {
          success: false,
          errorCode: 'PROVIDER_NOT_CONFIGURED',
          errorMessage: 'Telegram bot not properly configured',
        };
      }

      logger.info(`[TELEGRAM] Sending Telegram notification`, {
        notificationId: payload.notificationId,
        recipient: payload.recipient,
      });

      // Format message (add subject if present)
      let message = payload.content;
      if (payload.subject) {
        message = `<b>${payload.subject}</b>\n\n${payload.content}`;
      }

      // Send message
      const parseMode = this.telegramConfig.options?.parseMode || 'HTML';
      const disableNotification = this.telegramConfig.options?.disableNotification || false;

      const result = await this.bot.sendMessage(payload.recipient, message, {
        parse_mode: parseMode,
        disable_notification: disableNotification,
      });

      logger.info(`[TELEGRAM] Message sent successfully`, {
        notificationId: payload.notificationId,
        messageId: result.message_id,
        chatId: result.chat.id,
      });

      return {
        success: true,
        providerId: `tg_${result.message_id}_${result.chat.id}`,
        providerResponse: {
          messageId: result.message_id,
          chatId: result.chat.id,
          chatType: result.chat.type,
          date: result.date,
        },
        deliveredAt: new Date(result.date * 1000),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error(`[TELEGRAM] Failed to send message`, {
        notificationId: payload.notificationId,
        chatId: payload.recipient,
        error: errorMessage,
      });

      // Parse Telegram-specific errors
      let errorCode = 'TELEGRAM_SEND_FAILED';
      if (errorMessage.includes('chat not found')) {
        errorCode = 'CHAT_NOT_FOUND';
      } else if (errorMessage.includes('bot was blocked')) {
        errorCode = 'BOT_BLOCKED';
      } else if (errorMessage.includes('user is deactivated')) {
        errorCode = 'USER_DEACTIVATED';
      }

      return {
        success: false,
        errorCode,
        errorMessage,
      };
    }
  }

  /**
   * Test bot connection by getting bot info
   */
  override async testConnection(): Promise<boolean> {
    if (!this.isEnabled() || !this.isConfigured() || !this.bot) {
      return false;
    }

    try {
      const me = await this.bot.getMe();
      logger.info('[TELEGRAM] Bot connection test successful', {
        botUsername: me.username,
        botId: me.id,
        botName: me.first_name,
      });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[TELEGRAM] Connection test failed', { error: errorMessage });
      return false;
    }
  }

  /**
   * Get bot information
   */
  async getBotInfo(): Promise<TelegramBot.User | null> {
    if (!this.bot) {
      return null;
    }

    try {
      return await this.bot.getMe();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[TELEGRAM] Failed to get bot info', { error: errorMessage });
      return null;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.bot) {
      // Close bot connection (if polling was enabled)
      try {
        await this.bot.close();
        logger.info('[TELEGRAM] Bot closed');
      } catch (error) {
        // Ignore errors if bot wasn't polling
      }
    }
  }
}

/**
 * Load Telegram provider configuration from environment variables
 */
function loadTelegramConfig(): Partial<TelegramProviderConfig> {
  return {
    enabled: process.env.TELEGRAM_ENABLED !== 'false',
    credentials: {
      botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    },
    options: {
      parseMode: (process.env.TELEGRAM_PARSE_MODE as 'HTML' | 'Markdown' | 'MarkdownV2') || 'HTML',
      disableNotification: process.env.TELEGRAM_DISABLE_NOTIFICATION === 'true',
    },
  };
}

// Export singleton instance with environment config
export const telegramProvider = new TelegramProvider(loadTelegramConfig());
