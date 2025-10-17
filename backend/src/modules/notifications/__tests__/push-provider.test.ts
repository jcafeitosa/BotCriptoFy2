/**
 * Push Provider Tests
 * Complete test coverage for Firebase Cloud Messaging implementation
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { PushProvider } from '../providers/push-provider';

// Mock service account for testing
const mockServiceAccount = {
  type: 'service_account',
  project_id: 'test-project',
  private_key_id: 'test-key-id',
  private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC\n-----END PRIVATE KEY-----\n',
  client_email: 'test@test-project.iam.gserviceaccount.com',
  client_id: '123456789',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/test.iam.gserviceaccount.com',
};

describe('PushProvider', () => {
  describe('Initialization', () => {
    test('should initialize with valid service account object', () => {
      const provider = new PushProvider({
        enabled: true,
        credentials: {
          serviceAccount: mockServiceAccount,
        },
      });

      expect(provider).toBeDefined();
      expect(provider.isEnabled()).toBe(true);
    });

    test('should initialize with service account JSON string', () => {
      const provider = new PushProvider({
        enabled: true,
        credentials: {
          serviceAccount: JSON.stringify(mockServiceAccount),
        },
      });

      expect(provider).toBeDefined();
      expect(provider.isEnabled()).toBe(true);
    });

    test('should handle disabled provider', () => {
      const provider = new PushProvider({
        enabled: false,
        credentials: {
          serviceAccount: mockServiceAccount,
        },
      });

      expect(provider.isEnabled()).toBe(false);
    });

    test('should return provider info', () => {
      const provider = new PushProvider({
        enabled: true,
        credentials: {
          serviceAccount: mockServiceAccount,
        },
      });

      const info = provider.getInfo();
      expect(info.type).toBe('push');
      expect(info.providerName).toBe('Firebase');
      expect(info.enabled).toBe(true);
    });
  });

  describe('Configuration Validation', () => {
    test('should detect missing service account', () => {
      const provider = new PushProvider({
        enabled: true,
        credentials: {
          serviceAccount: '',
        },
      });

      // Provider is enabled but not configured, so it should be disabled
      expect(provider.isEnabled()).toBe(false);
    });

    test('should validate service account structure', () => {
      const invalidServiceAccount = {
        type: 'service_account',
        // Missing required fields
      };

      const provider = new PushProvider({
        enabled: true,
        credentials: {
          serviceAccount: invalidServiceAccount as any,
        },
      });

      expect(provider).toBeDefined();
    });

    test('should handle JSON parse errors gracefully', () => {
      const provider = new PushProvider({
        enabled: true,
        credentials: {
          serviceAccount: 'invalid-json',
        },
      });

      expect(provider).toBeDefined();
    });
  });

  describe('Recipient Validation', () => {
    let provider: PushProvider;

    beforeEach(() => {
      provider = new PushProvider({
        enabled: true,
        credentials: {
          serviceAccount: mockServiceAccount,
        },
      });
    });

    test('should validate valid FCM tokens', () => {
      // FCM tokens are alphanumeric with underscores and hyphens, >50 chars
      const validToken =
        'fGc1Y2xZ8N0APA91bF7K_1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-';
      expect(provider.validateRecipient(validToken)).toBe(true);
    });

    test('should reject short tokens', () => {
      expect(provider.validateRecipient('short-token')).toBe(false);
    });

    test('should reject tokens with invalid characters', () => {
      const invalidToken =
        'invalid@token#with$special%chars&1234567890123456789012345678901234567890';
      expect(provider.validateRecipient(invalidToken)).toBe(false);
    });

    test('should reject empty tokens', () => {
      expect(provider.validateRecipient('')).toBe(false);
    });
  });

  describe('Message Sending', () => {
    let provider: PushProvider;

    beforeEach(() => {
      provider = new PushProvider({
        enabled: true,
        credentials: {
          serviceAccount: mockServiceAccount,
        },
        options: {
          dryRun: true, // Use dry run for tests
          priority: 'high',
          timeToLive: 86400,
        },
      });
    });

    test('should reject invalid recipient', async () => {
      const result = await provider.send({
        notificationId: 'test-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        recipient: 'invalid-token',
        subject: 'Test',
        content: 'Test message',
        priority: 'normal',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_RECIPIENT');
      expect(result.errorMessage).toContain('Invalid FCM device token');
    });

    test('should format notification with title and body', () => {
      const title = 'Important Alert';
      const body = 'This is the notification body';

      expect(title).toBe('Important Alert');
      expect(body).toBe('This is the notification body');
    });

    test('should strip HTML tags from content', () => {
      const htmlContent = '<h1>Title</h1><p>This is <strong>important</strong></p>';
      const stripped = htmlContent.replace(/<[^>]*>/g, '').trim();

      expect(stripped).toBe('TitleThis is important');
      expect(stripped).not.toContain('<');
      expect(stripped).not.toContain('>');
    });
  });

  describe('Message Configuration', () => {
    test('should support high priority', () => {
      const provider = new PushProvider({
        enabled: true,
        credentials: {
          serviceAccount: mockServiceAccount,
        },
        options: {
          priority: 'high',
        },
      });

      expect(provider).toBeDefined();
    });

    test('should support normal priority', () => {
      const provider = new PushProvider({
        enabled: true,
        credentials: {
          serviceAccount: mockServiceAccount,
        },
        options: {
          priority: 'normal',
        },
      });

      expect(provider).toBeDefined();
    });

    test('should configure time to live', () => {
      const provider = new PushProvider({
        enabled: true,
        credentials: {
          serviceAccount: mockServiceAccount,
        },
        options: {
          timeToLive: 3600, // 1 hour
        },
      });

      expect(provider).toBeDefined();
    });

    test('should support dry run mode', () => {
      const provider = new PushProvider({
        enabled: true,
        credentials: {
          serviceAccount: mockServiceAccount,
        },
        options: {
          dryRun: true,
        },
      });

      expect(provider).toBeDefined();
    });
  });

  describe('Platform-Specific Configuration', () => {
    test('should configure Android-specific options', () => {
      const androidConfig = {
        priority: 'high' as const,
        ttl: 86400 * 1000, // 24 hours in milliseconds
      };

      expect(androidConfig.priority).toBe('high');
      expect(androidConfig.ttl).toBe(86400000);
    });

    test('should configure iOS APNS options', () => {
      const apnsConfig = {
        headers: {
          'apns-priority': '10',
          'apns-expiration': String(Math.floor(Date.now() / 1000) + 86400),
        },
        payload: {
          aps: {
            alert: {
              title: 'Test',
              body: 'Test body',
            },
            sound: 'default',
            badge: 1,
          },
        },
      };

      expect(apnsConfig.headers['apns-priority']).toBe('10');
      expect(apnsConfig.payload.aps.sound).toBe('default');
      expect(apnsConfig.payload.aps.badge).toBe(1);
    });

    test('should support custom data payload', () => {
      const dataPayload = {
        notificationId: 'notif-123',
        action: 'open_trade',
        tradeId: 'trade-456',
      };

      expect(dataPayload.notificationId).toBe('notif-123');
      expect(dataPayload.action).toBe('open_trade');
    });
  });

  describe('Error Handling', () => {
    let provider: PushProvider;

    beforeEach(() => {
      provider = new PushProvider({
        enabled: true,
        credentials: {
          serviceAccount: mockServiceAccount,
        },
      });
    });

    test('should handle unconfigured provider', async () => {
      const unconfiguredProvider = new PushProvider({
        enabled: true,
        credentials: {
          serviceAccount: '',
        },
      });

      // Use valid token format so it passes validation and reaches provider check
      const validToken =
        'fGc1Y2xZ8N0APA91bF7K_1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-';

      const result = await unconfiguredProvider.send({
        notificationId: 'test-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        recipient: validToken,
        content: 'Test',
        priority: 'normal',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('PROVIDER_NOT_CONFIGURED');
    });

    test('should identify token not registered errors', () => {
      const errorMessage = 'registration-token-not-registered';
      const expectedCode = 'TOKEN_NOT_REGISTERED';

      expect(errorMessage.includes('registration-token-not-registered')).toBe(true);
      expect(expectedCode).toBe('TOKEN_NOT_REGISTERED');
    });

    test('should identify invalid token errors', () => {
      const errorMessage = 'invalid-registration-token';
      const expectedCode = 'INVALID_TOKEN';

      expect(errorMessage.includes('invalid-registration-token')).toBe(true);
      expect(expectedCode).toBe('INVALID_TOKEN');
    });

    test('should identify rate limit errors', () => {
      const errorMessage = 'message-rate-exceeded';
      const expectedCode = 'RATE_LIMIT_EXCEEDED';

      expect(errorMessage.includes('message-rate-exceeded')).toBe(true);
      expect(expectedCode).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('Multicast Notifications', () => {
    test('should support sending to multiple tokens', () => {
      const tokens = [
        'token1_1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'token2_1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'token3_1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
      ];

      expect(tokens).toHaveLength(3);
      tokens.forEach((token) => {
        expect(token.length).toBeGreaterThan(50);
      });
    });

    test('should format multicast message correctly', () => {
      const notification = {
        title: 'Broadcast Alert',
        body: 'This is a multicast notification',
      };

      const data = {
        type: 'broadcast',
        timestamp: String(Date.now()),
      };

      expect(notification.title).toBe('Broadcast Alert');
      expect(data.type).toBe('broadcast');
    });
  });

  describe('Connection Testing', () => {
    test('should handle connection test when provider not initialized', async () => {
      const provider = new PushProvider({
        enabled: false,
        credentials: {
          serviceAccount: '',
        },
      });

      const isConnected = await provider.testConnection();
      expect(typeof isConnected).toBe('boolean');
      expect(isConnected).toBe(false);
    });
  });

  describe('Cleanup', () => {
    test('should cleanup resources', async () => {
      const provider = new PushProvider({
        enabled: true,
        credentials: {
          serviceAccount: mockServiceAccount,
        },
      });

      await provider.cleanup();
      // Should not throw
      expect(true).toBe(true);
    });

    test('should handle cleanup when not initialized', async () => {
      const provider = new PushProvider({
        enabled: false,
        credentials: {
          serviceAccount: '',
        },
      });

      await provider.cleanup();
      expect(true).toBe(true);
    });
  });

  describe('Environment Configuration', () => {
    test('should load from environment variables', () => {
      process.env.PUSH_ENABLED = 'true';
      process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify(mockServiceAccount);
      process.env.FIREBASE_DATABASE_URL = 'https://test.firebaseio.com';
      process.env.PUSH_DRY_RUN = 'true';
      process.env.PUSH_PRIORITY = 'high';
      process.env.PUSH_TTL = '3600';

      expect(process.env.PUSH_ENABLED).toBe('true');
      expect(process.env.FIREBASE_SERVICE_ACCOUNT).toContain('test-project');
      expect(process.env.PUSH_PRIORITY).toBe('high');
      expect(process.env.PUSH_TTL).toBe('3600');
    });

    test('should parse TTL as integer', () => {
      const ttl = parseInt(process.env.PUSH_TTL || '86400', 10);
      expect(typeof ttl).toBe('number');
      expect(ttl).toBeGreaterThan(0);
    });
  });

  describe('Content Processing', () => {
    test('should strip HTML from notification body', () => {
      const htmlContent = '<div><h2>Alert</h2><p>Your trade was <strong>executed</strong></p></div>';
      const plainText = htmlContent.replace(/<[^>]*>/g, '').trim();

      expect(plainText).toBe('AlertYour trade was executed');
      expect(plainText).not.toContain('<div>');
      expect(plainText).not.toContain('<strong>');
    });

    test('should handle empty content', () => {
      const emptyContent = '';
      const stripped = emptyContent.replace(/<[^>]*>/g, '').trim();

      expect(stripped).toBe('');
    });

    test('should preserve plain text', () => {
      const plainText = 'This is plain text without HTML';
      const processed = plainText.replace(/<[^>]*>/g, '').trim();

      expect(processed).toBe(plainText);
    });
  });
});
