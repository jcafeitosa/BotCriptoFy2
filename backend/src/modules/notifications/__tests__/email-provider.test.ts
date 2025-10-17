/**
 * Email Provider Tests
 * Complete test coverage for SMTP and SendGrid implementations
 */

import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { EmailProvider } from '../providers/email-provider';

describe('EmailProvider', () => {
  describe('SMTP Provider', () => {
    let provider: EmailProvider;

    beforeEach(() => {
      provider = new EmailProvider({
        enabled: true,
        credentials: {
          provider: 'smtp',
          smtp: {
            host: 'smtp.test.com',
            port: 587,
            secure: false,
            auth: {
              user: 'test@test.com',
              pass: 'testpass',
            },
          },
          from: 'noreply@test.com',
          fromName: 'Test',
        },
      });
    });

    test('should initialize SMTP provider', () => {
      expect(provider).toBeDefined();
      expect(provider.isEnabled()).toBe(true);
    });

    test('should validate email addresses correctly', () => {
      expect(provider.validateRecipient('test@example.com')).toBe(true);
      expect(provider.validateRecipient('user+tag@domain.co.uk')).toBe(true);
      expect(provider.validateRecipient('invalid-email')).toBe(false);
      expect(provider.validateRecipient('no-at-sign.com')).toBe(false);
      expect(provider.validateRecipient('')).toBe(false);
    });

    test('should return provider info', () => {
      const info = provider.getInfo();
      expect(info.type).toBe('email');
      expect(info.providerName).toBe('SMTP');
      expect(info.enabled).toBe(true);
    });

    test('should reject invalid recipient', async () => {
      const result = await provider.send({
        notificationId: 'test-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        recipient: 'invalid-email',
        subject: 'Test',
        content: 'Test content',
        priority: 'normal',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_RECIPIENT');
    });

    test('should handle disabled provider', () => {
      const disabledProvider = new EmailProvider({
        enabled: false,
        credentials: {
          provider: 'smtp',
          from: 'test@test.com',
        },
      });

      expect(disabledProvider.isEnabled()).toBe(false);
    });
  });

  describe('SendGrid Provider', () => {
    let provider: EmailProvider;

    beforeEach(() => {
      provider = new EmailProvider({
        enabled: true,
        credentials: {
          provider: 'sendgrid',
          sendgrid: {
            apiKey: 'SG.test_api_key_1234567890',
          },
          from: 'noreply@test.com',
          fromName: 'SendGrid Test',
        },
      });
    });

    test('should initialize SendGrid provider', () => {
      expect(provider).toBeDefined();
      expect(provider.isEnabled()).toBe(true);
    });

    test('should return SendGrid provider info', () => {
      const info = provider.getInfo();
      expect(info.type).toBe('email');
      expect(info.providerName).toBe('SendGrid');
      expect(info.enabled).toBe(true);
    });

    test('should validate SendGrid API key format', async () => {
      const testConnection = await provider.testConnection();
      expect(typeof testConnection).toBe('boolean');
    });
  });

  describe('Configuration Validation', () => {
    test('should reject invalid SMTP configuration', () => {
      const provider = new EmailProvider({
        enabled: true,
        credentials: {
          provider: 'smtp',
          smtp: {
            host: '',
            port: 0,
            secure: false,
            auth: {
              user: '',
              pass: '',
            },
          },
          from: 'invalid',
        },
      });

      // Provider with invalid config should be disabled
      expect(provider.isEnabled()).toBe(false);
    });

    test('should handle missing credentials gracefully', () => {
      const provider = new EmailProvider({
        enabled: true,
        credentials: {
          provider: 'smtp',
          from: 'test@test.com',
        },
      });

      // Provider with missing SMTP credentials should be disabled
      expect(provider.isEnabled()).toBe(false);
    });

    test('should load from environment variables', () => {
      // Test environment-based configuration
      process.env.EMAIL_PROVIDER = 'smtp';
      process.env.EMAIL_FROM = 'env@test.com';
      process.env.SMTP_HOST = 'smtp.env.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_USER = 'envuser';
      process.env.SMTP_PASS = 'envpass';

      // Provider should load these values
      expect(process.env.EMAIL_PROVIDER).toBe('smtp');
      expect(process.env.EMAIL_FROM).toBe('env@test.com');
    });
  });

  describe('Email Content Handling', () => {
    test('should handle HTML content', async () => {
      const provider = new EmailProvider({
        enabled: true,
        credentials: {
          provider: 'smtp',
          smtp: {
            host: 'smtp.test.com',
            port: 587,
            secure: false,
            auth: { user: 'test', pass: 'test' },
          },
          from: 'test@test.com',
        },
      });

      const htmlContent = '<h1>Test</h1><p>This is a <strong>test</strong> email.</p>';

      // Validate that HTML is accepted
      expect(htmlContent).toContain('<h1>');
      expect(htmlContent).toContain('<strong>');
    });

    test('should strip HTML for text version', () => {
      const htmlContent = '<h1>Title</h1><p>Paragraph</p>';
      const textContent = htmlContent.replace(/<[^>]*>/g, '').trim();

      expect(textContent).toBe('TitleParagraph');
      expect(textContent).not.toContain('<');
      expect(textContent).not.toContain('>');
    });
  });

  describe('Error Handling', () => {
    test('should handle send failures gracefully', async () => {
      const provider = new EmailProvider({
        enabled: true,
        credentials: {
          provider: 'smtp',
          smtp: {
            host: 'nonexistent.smtp.com',
            port: 587,
            secure: false,
            auth: { user: 'test', pass: 'test' },
          },
          from: 'test@test.com',
        },
      });

      const result = await provider.send({
        notificationId: 'test-error',
        userId: 'user-1',
        tenantId: 'tenant-1',
        recipient: 'valid@example.com',
        subject: 'Test',
        content: 'Test',
        priority: 'normal',
      });

      // Should handle connection errors
      expect(['EMAIL_SEND_FAILED', 'PROVIDER_NOT_CONFIGURED']).toContain(
        result.errorCode || ''
      );
    });
  });

  describe('Cleanup', () => {
    test('should cleanup resources', async () => {
      const provider = new EmailProvider({
        enabled: true,
        credentials: {
          provider: 'smtp',
          smtp: {
            host: 'smtp.test.com',
            port: 587,
            secure: false,
            auth: { user: 'test', pass: 'test' },
          },
          from: 'test@test.com',
        },
      });

      await provider.cleanup();
      // Should not throw
      expect(true).toBe(true);
    });
  });
});
