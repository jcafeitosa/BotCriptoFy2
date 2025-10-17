/**
 * Email Provider
 * Sends email notifications using SMTP (Nodemailer) or SendGrid API
 * Production-ready implementation with dual provider support
 */

import logger from '@/utils/logger';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import sgMail from '@sendgrid/mail';
import { BaseProvider, type DeliveryResult, type NotificationPayload } from './base-provider';

/**
 * Email provider configuration
 */
interface EmailProviderConfig {
  enabled: boolean;
  credentials: {
    provider: 'smtp' | 'sendgrid';
    // SMTP credentials
    smtp?: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
    };
    // SendGrid credentials
    sendgrid?: {
      apiKey: string;
    };
    // Sender email
    from: string;
    fromName?: string;
  };
  options?: {
    maxRetries?: number;
    timeout?: number;
  };
}

/**
 * Email provider implementation with dual support (SMTP + SendGrid)
 */
export class EmailProvider extends BaseProvider {
  private transporter?: Transporter;
  private readonly emailConfig: EmailProviderConfig;

  constructor(config: Partial<EmailProviderConfig> = {}) {
    super('email', config.credentials?.provider === 'sendgrid' ? 'SendGrid' : 'SMTP', {
      enabled: config.enabled !== false,
      credentials: config.credentials || {},
      options: config.options || {},
    });

    this.emailConfig = config as EmailProviderConfig;

    // Initialize provider
    if (this.isEnabled()) {
      this.initializeProvider();
    }
  }

  /**
   * Initialize email provider (SMTP or SendGrid)
   */
  private initializeProvider(): void {
    if (!this.emailConfig.credentials) {
      logger.warn('[EMAIL] No credentials provided, provider disabled');
      return;
    }

    const { provider, smtp, sendgrid } = this.emailConfig.credentials;

    if (provider === 'smtp' && smtp) {
      // Initialize Nodemailer SMTP transporter
      this.transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: {
          user: smtp.auth.user,
          pass: smtp.auth.pass,
        },
        pool: true, // Use connection pooling
        maxConnections: 5,
        maxMessages: 100,
      });

      logger.info('[EMAIL] SMTP transporter initialized', {
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
      });
    } else if (provider === 'sendgrid' && sendgrid) {
      // Initialize SendGrid
      sgMail.setApiKey(sendgrid.apiKey);
      logger.info('[EMAIL] SendGrid API initialized');
    } else {
      logger.error('[EMAIL] Invalid provider configuration', { provider });
    }
  }

  /**
   * Check if provider is properly configured
   */
  protected isConfigured(): boolean {
    if (!this.emailConfig.credentials) {
      return false;
    }

    const { provider, smtp, sendgrid, from } = this.emailConfig.credentials;

    // Validate sender email
    if (!from || !this.validateRecipient(from)) {
      logger.error('[EMAIL] Invalid sender email address');
      return false;
    }

    // Validate provider-specific config
    if (provider === 'smtp') {
      return !!(smtp?.host && smtp?.port && smtp?.auth?.user && smtp?.auth?.pass);
    } else if (provider === 'sendgrid') {
      return !!(sendgrid?.apiKey);
    }

    return false;
  }

  /**
   * Validate email address format
   */
  validateRecipient(recipient: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(recipient);
  }

  /**
   * Send email notification
   */
  async send(payload: NotificationPayload): Promise<DeliveryResult> {
    try {
      // Validate recipient
      if (!this.validateRecipient(payload.recipient)) {
        return {
          success: false,
          errorCode: 'INVALID_RECIPIENT',
          errorMessage: 'Invalid email address format',
        };
      }

      // Validate configuration
      if (!this.isConfigured()) {
        return {
          success: false,
          errorCode: 'PROVIDER_NOT_CONFIGURED',
          errorMessage: 'Email provider not properly configured',
        };
      }

      logger.info(`[EMAIL] Sending email notification`, {
        notificationId: payload.notificationId,
        recipient: payload.recipient,
        subject: payload.subject,
        provider: this.emailConfig.credentials.provider,
      });

      // Send via configured provider
      const result =
        this.emailConfig.credentials.provider === 'smtp'
          ? await this.sendViaSMTP(payload)
          : await this.sendViaSendGrid(payload);

      if (result.success) {
        logger.info(`[EMAIL] Email sent successfully`, {
          notificationId: payload.notificationId,
          providerId: result.providerId,
          recipient: payload.recipient,
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error(`[EMAIL] Failed to send email`, {
        notificationId: payload.notificationId,
        recipient: payload.recipient,
        error: errorMessage,
      });

      return {
        success: false,
        errorCode: 'EMAIL_SEND_FAILED',
        errorMessage,
      };
    }
  }

  /**
   * Send email via SMTP (Nodemailer)
   */
  private async sendViaSMTP(payload: NotificationPayload): Promise<DeliveryResult> {
    if (!this.transporter) {
      throw new Error('SMTP transporter not initialized');
    }

    const { from, fromName } = this.emailConfig.credentials;

    const info = await this.transporter.sendMail({
      from: fromName ? `"${fromName}" <${from}>` : from,
      to: payload.recipient,
      subject: payload.subject || 'Notification',
      html: payload.content,
      text: payload.content.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    });

    return {
      success: true,
      providerId: info.messageId,
      providerResponse: {
        messageId: info.messageId,
        response: info.response,
        accepted: info.accepted,
        rejected: info.rejected,
      },
      deliveredAt: new Date(),
    };
  }

  /**
   * Send email via SendGrid API
   */
  private async sendViaSendGrid(payload: NotificationPayload): Promise<DeliveryResult> {
    const { from, fromName } = this.emailConfig.credentials;

    const msg = {
      to: payload.recipient,
      from: {
        email: from,
        name: fromName || 'Notifications',
      },
      subject: payload.subject || 'Notification',
      html: payload.content,
      text: payload.content.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    };

    const [response] = await sgMail.send(msg);

    return {
      success: true,
      providerId: response.headers['x-message-id'] as string,
      providerResponse: {
        statusCode: response.statusCode,
        headers: response.headers,
      },
      deliveredAt: new Date(),
    };
  }

  /**
   * Test connection to email provider
   */
  override async testConnection(): Promise<boolean> {
    if (!this.isEnabled() || !this.isConfigured()) {
      return false;
    }

    try {
      if (this.emailConfig.credentials.provider === 'smtp' && this.transporter) {
        // Test SMTP connection
        await this.transporter.verify();
        logger.info('[EMAIL] SMTP connection test successful');
        return true;
      } else if (this.emailConfig.credentials.provider === 'sendgrid') {
        // SendGrid doesn't have a direct test method, but we can validate API key format
        const apiKey = this.emailConfig.credentials.sendgrid?.apiKey;
        if (apiKey && apiKey.startsWith('SG.')) {
          logger.info('[EMAIL] SendGrid API key format valid');
          return true;
        }
      }

      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[EMAIL] Connection test failed', { error: errorMessage });
      return false;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      logger.info('[EMAIL] SMTP transporter closed');
    }
  }
}

/**
 * Load email provider configuration from environment variables
 */
function loadEmailConfig(): Partial<EmailProviderConfig> {
  const provider = (process.env.EMAIL_PROVIDER || 'smtp') as 'smtp' | 'sendgrid';

  const config: Partial<EmailProviderConfig> = {
    enabled: process.env.EMAIL_ENABLED !== 'false',
    credentials: {
      provider,
      from: process.env.EMAIL_FROM || 'noreply@example.com',
      fromName: process.env.EMAIL_FROM_NAME || 'Notifications',
    },
  };

  // Load SMTP config
  if (provider === 'smtp') {
    config.credentials!.smtp = {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    };
  }

  // Load SendGrid config
  if (provider === 'sendgrid') {
    config.credentials!.sendgrid = {
      apiKey: process.env.SENDGRID_API_KEY || '',
    };
  }

  return config;
}

// Export singleton instance with environment config
export const emailProvider = new EmailProvider(loadEmailConfig());
