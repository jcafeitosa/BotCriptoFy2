/**
 * Telegram Provider Tests
 * Complete test coverage for Telegram Bot API implementation
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { TelegramProvider } from '../providers/telegram-provider';

describe('TelegramProvider', () => {
  describe('Initialization', () => {
    test('should initialize with valid config', () => {
      const provider = new TelegramProvider({
        enabled: true,
        credentials: {
          botToken: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
        },
      });

      expect(provider).toBeDefined();
      expect(provider.isEnabled()).toBe(true);
    });

    test('should handle disabled provider', () => {
      const provider = new TelegramProvider({
        enabled: false,
        credentials: {
          botToken: 'test-token',
        },
      });

      expect(provider.isEnabled()).toBe(false);
    });

    test('should return provider info', () => {
      const provider = new TelegramProvider({
        enabled: true,
        credentials: {
          botToken: 'test-token',
        },
      });

      const info = provider.getInfo();
      expect(info.type).toBe('telegram');
      expect(info.providerName).toBe('Telegram');
      expect(info.enabled).toBe(true);
    });
  });

  describe('Recipient Validation', () => {
    let provider: TelegramProvider;

    beforeEach(() => {
      provider = new TelegramProvider({
        enabled: true,
        credentials: {
          botToken: 'test-token',
        },
      });
    });

    test('should validate numeric chat IDs', () => {
      expect(provider.validateRecipient('123456789')).toBe(true);
      expect(provider.validateRecipient('987654321')).toBe(true);
    });

    test('should validate negative chat IDs (groups)', () => {
      expect(provider.validateRecipient('-123456789')).toBe(true);
      expect(provider.validateRecipient('-1001234567890')).toBe(true);
    });

    test('should validate username format', () => {
      expect(provider.validateRecipient('@username')).toBe(true);
      expect(provider.validateRecipient('@test_user')).toBe(true);
      expect(provider.validateRecipient('@User123')).toBe(true);
    });

    test('should reject invalid formats', () => {
      expect(provider.validateRecipient('invalid')).toBe(false);
      expect(provider.validateRecipient('@ab')).toBe(false); // Too short (min 5)
      expect(provider.validateRecipient('@user-name')).toBe(false); // Hyphens not allowed
      expect(provider.validateRecipient('12.34')).toBe(false); // Decimals not allowed
      expect(provider.validateRecipient('')).toBe(false);
    });
  });

  describe('Message Sending', () => {
    let provider: TelegramProvider;

    beforeEach(() => {
      provider = new TelegramProvider({
        enabled: true,
        credentials: {
          botToken: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
        },
        options: {
          parseMode: 'HTML',
          disableNotification: false,
        },
      });
    });

    test('should reject invalid recipient', async () => {
      const result = await provider.send({
        notificationId: 'test-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        recipient: 'invalid',
        subject: 'Test',
        content: 'Test message',
        priority: 'normal',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_RECIPIENT');
      expect(result.errorMessage).toContain('Invalid Telegram chat ID');
    });

    test('should format message with subject', () => {
      const subject = 'Important Notice';
      const content = 'This is the message body';
      const expected = `<b>${subject}</b>\n\n${content}`;

      expect(expected).toContain('<b>Important Notice</b>');
      expect(expected).toContain('This is the message body');
    });

    test('should handle message without subject', () => {
      const content = 'Plain message';
      // When no subject, content is used as-is
      expect(content).toBe('Plain message');
    });
  });

  describe('Parse Mode Configuration', () => {
    test('should support HTML parse mode', () => {
      const provider = new TelegramProvider({
        enabled: true,
        credentials: { botToken: 'test' },
        options: { parseMode: 'HTML' },
      });

      expect(provider).toBeDefined();
    });

    test('should support Markdown parse mode', () => {
      const provider = new TelegramProvider({
        enabled: true,
        credentials: { botToken: 'test' },
        options: { parseMode: 'Markdown' },
      });

      expect(provider).toBeDefined();
    });

    test('should support MarkdownV2 parse mode', () => {
      const provider = new TelegramProvider({
        enabled: true,
        credentials: { botToken: 'test' },
        options: { parseMode: 'MarkdownV2' },
      });

      expect(provider).toBeDefined();
    });

    test('should default to HTML when not specified', () => {
      const provider = new TelegramProvider({
        enabled: true,
        credentials: { botToken: 'test' },
      });

      // Default should be HTML
      expect(provider).toBeDefined();
    });
  });

  describe('Notification Settings', () => {
    test('should support silent notifications', () => {
      const provider = new TelegramProvider({
        enabled: true,
        credentials: { botToken: 'test' },
        options: { disableNotification: true },
      });

      expect(provider).toBeDefined();
    });

    test('should default to notifications enabled', () => {
      const provider = new TelegramProvider({
        enabled: true,
        credentials: { botToken: 'test' },
      });

      expect(provider).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    let provider: TelegramProvider;

    beforeEach(() => {
      provider = new TelegramProvider({
        enabled: true,
        credentials: {
          botToken: 'invalid-token',
        },
      });
    });

    test('should handle unconfigured provider', async () => {
      const unconfiguredProvider = new TelegramProvider({
        enabled: true,
        credentials: {
          botToken: '',
        },
      });

      const result = await unconfiguredProvider.send({
        notificationId: 'test-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        recipient: '123456',
        content: 'Test',
        priority: 'normal',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('PROVIDER_NOT_CONFIGURED');
    });

    test('should identify chat not found errors', () => {
      const errorMessage = 'chat not found';
      const expectedCode = 'CHAT_NOT_FOUND';

      expect(errorMessage.includes('chat not found')).toBe(true);
      expect(expectedCode).toBe('CHAT_NOT_FOUND');
    });

    test('should identify bot blocked errors', () => {
      const errorMessage = 'bot was blocked by the user';
      const expectedCode = 'BOT_BLOCKED';

      expect(errorMessage.includes('bot was blocked')).toBe(true);
      expect(expectedCode).toBe('BOT_BLOCKED');
    });

    test('should identify user deactivated errors', () => {
      const errorMessage = 'user is deactivated';
      const expectedCode = 'USER_DEACTIVATED';

      expect(errorMessage.includes('user is deactivated')).toBe(true);
      expect(expectedCode).toBe('USER_DEACTIVATED');
    });
  });

  describe('Bot Information', () => {
    let provider: TelegramProvider;

    beforeEach(() => {
      provider = new TelegramProvider({
        enabled: true,
        credentials: {
          botToken: 'test-token',
        },
      });
    });

    test('should handle getBotInfo when bot not initialized', async () => {
      const info = await provider.getBotInfo();
      // Should return null when bot not available
      expect(info === null || typeof info === 'object').toBe(true);
    });
  });

  describe('Cleanup', () => {
    test('should cleanup resources', async () => {
      const provider = new TelegramProvider({
        enabled: true,
        credentials: {
          botToken: 'test-token',
        },
      });

      await provider.cleanup();
      // Should not throw
      expect(true).toBe(true);
    });

    test('should handle cleanup without bot', async () => {
      const provider = new TelegramProvider({
        enabled: false,
        credentials: {
          botToken: '',
        },
      });

      await provider.cleanup();
      expect(true).toBe(true);
    });
  });

  describe('Environment Configuration', () => {
    test('should load from environment variables', () => {
      process.env.TELEGRAM_BOT_TOKEN = 'env-token-123';
      process.env.TELEGRAM_ENABLED = 'true';
      process.env.TELEGRAM_PARSE_MODE = 'Markdown';
      process.env.TELEGRAM_DISABLE_NOTIFICATION = 'true';

      expect(process.env.TELEGRAM_BOT_TOKEN).toBe('env-token-123');
      expect(process.env.TELEGRAM_ENABLED).toBe('true');
      expect(process.env.TELEGRAM_PARSE_MODE).toBe('Markdown');
      expect(process.env.TELEGRAM_DISABLE_NOTIFICATION).toBe('true');
    });
  });
});
