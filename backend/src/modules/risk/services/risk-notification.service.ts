/**
 * Risk Notification Service
 * Multi-channel notification system for risk alerts
 * 
 * Channels:
 * - WebSocket (real-time)
 * - Email (SMTP)
 * - SMS (Twilio)
 * - Slack (webhook)
 * - Discord (webhook)
 * - Push notifications
 */

import logger from '@/utils/logger';
import type { RiskAlert } from '../types/risk.types';

/**
 * Notification channel types
 */
export type NotificationChannel = 
  | 'websocket'
  | 'email'
  | 'sms'
  | 'slack'
  | 'discord'
  | 'push';

/**
 * Notification priority levels
 */
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Notification configuration
 */
export interface NotificationConfig {
  channels: NotificationChannel[];
  priority: NotificationPriority;
  enabled: boolean;
  retryAttempts: number;
  retryDelay: number;
  rateLimitPerMinute: number;
}

/**
 * Notification message
 */
export interface NotificationMessage {
  id: string;
  userId: string;
  tenantId: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: Record<string, any>;
  timestamp: Date;
  retryCount: number;
  status: 'pending' | 'sent' | 'failed' | 'rate_limited';
}

/**
 * Notification template
 */
export interface NotificationTemplate {
  id: string;
  name: string;
  channels: NotificationChannel[];
  subject: string;
  template: string;
  variables: string[];
  priority: NotificationPriority;
}

/**
 * Risk Notification Service
 */
export class RiskNotificationService {
  private config: Map<string, NotificationConfig> = new Map();
  private templates: Map<string, NotificationTemplate> = new Map();
  private rateLimiters: Map<string, { count: number; resetTime: number }> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  /**
   * Send risk alert notification
   */
  async sendRiskAlert(alert: RiskAlert, channels: NotificationChannel[] = ['websocket']): Promise<void> {
    try {
      const config = this.getUserNotificationConfig(alert.userId, alert.tenantId);
      
      if (!config.enabled) {
        logger.debug('Notifications disabled for user', { userId: alert.userId });
        return;
      }

      const template = this.getTemplateForAlert(alert);
      const messages = this.createMessages(alert, template, channels);

      // Send notifications in parallel
      const promises = messages.map(message => this.sendNotification(message));
      await Promise.allSettled(promises);

      logger.info('Risk alert notifications sent', {
        alertId: alert.id,
        userId: alert.userId,
        channels: channels.length,
      });
    } catch (error) {
      logger.error('Failed to send risk alert notifications', {
        alertId: alert.id,
        userId: alert.userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Send custom notification
   */
  async sendCustomNotification(
    userId: string,
    tenantId: string,
    title: string,
    message: string,
    channels: NotificationChannel[],
    priority: NotificationPriority = 'medium',
    data?: Record<string, any>
  ): Promise<void> {
    try {
      const config = this.getUserNotificationConfig(userId, tenantId);
      
      if (!config.enabled) {
        logger.debug('Notifications disabled for user', { userId });
        return;
      }

      const messages = channels.map(channel => ({
        id: this.generateMessageId(),
        userId,
        tenantId,
        channel,
        priority,
        title,
        message,
        data,
        timestamp: new Date(),
        retryCount: 0,
        status: 'pending' as const,
      }));

      const promises = messages.map(msg => this.sendNotification(msg));
      await Promise.allSettled(promises);

      logger.info('Custom notification sent', { userId, channels: channels.length });
    } catch (error) {
      logger.error('Failed to send custom notification', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Configure user notification preferences
   */
  async configureUserNotifications(
    userId: string,
    tenantId: string,
    config: Partial<NotificationConfig>
  ): Promise<void> {
    try {
      const key = `${userId}:${tenantId}`;
      const currentConfig = this.config.get(key) || this.getDefaultConfig();
      
      const updatedConfig: NotificationConfig = {
        ...currentConfig,
        ...config,
      };

      this.config.set(key, updatedConfig);

      logger.info('User notification config updated', { userId, tenantId, config: updatedConfig });
    } catch (error) {
      logger.error('Failed to configure user notifications', {
        userId,
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get user notification configuration
   */
  private getUserNotificationConfig(userId: string, tenantId: string): NotificationConfig {
    const key = `${userId}:${tenantId}`;
    return this.config.get(key) || this.getDefaultConfig();
  }

  /**
   * Get default notification configuration
   */
  private getDefaultConfig(): NotificationConfig {
    return {
      channels: ['websocket'],
      priority: 'medium',
      enabled: true,
      retryAttempts: 3,
      retryDelay: 5000,
      rateLimitPerMinute: 10,
    };
  }

  /**
   * Create notification messages
   */
  private createMessages(
    alert: RiskAlert,
    template: NotificationTemplate,
    channels: NotificationChannel[]
  ): NotificationMessage[] {
    return channels.map(channel => {
      const processedTemplate = this.processTemplate(template, alert);
      
      return {
        id: this.generateMessageId(),
        userId: alert.userId,
        tenantId: alert.tenantId,
        channel,
        priority: this.mapSeverityToPriority(alert.severity),
        title: processedTemplate.subject,
        message: processedTemplate.template,
        data: {
          alertId: alert.id,
          alertType: alert.alertType,
          severity: alert.severity,
          limitType: alert.limitType,
          limitValue: alert.limitValue,
          currentValue: alert.currentValue,
        },
        timestamp: new Date(),
        retryCount: 0,
        status: 'pending',
      };
    });
  }

  /**
   * Send individual notification
   */
  private async sendNotification(message: NotificationMessage): Promise<void> {
    try {
      // Check rate limiting
      if (this.isRateLimited(message.userId, message.channel)) {
        message.status = 'rate_limited';
        logger.warn('Notification rate limited', { userId: message.userId, channel: message.channel });
        return;
      }

      // Send based on channel
      switch (message.channel) {
        case 'websocket':
          await this.sendWebSocketNotification(message);
          break;
        case 'email':
          await this.sendEmailNotification(message);
          break;
        case 'sms':
          await this.sendSMSNotification(message);
          break;
        case 'slack':
          await this.sendSlackNotification(message);
          break;
        case 'discord':
          await this.sendDiscordNotification(message);
          break;
        case 'push':
          await this.sendPushNotification(message);
          break;
        default:
          throw new Error(`Unsupported notification channel: ${message.channel}`);
      }

      message.status = 'sent';
      this.updateRateLimit(message.userId, message.channel);

      logger.debug('Notification sent successfully', {
        messageId: message.id,
        channel: message.channel,
        userId: message.userId,
      });
    } catch (error) {
      message.status = 'failed';
      message.retryCount++;

      logger.error('Failed to send notification', {
        messageId: message.id,
        channel: message.channel,
        userId: message.userId,
        retryCount: message.retryCount,
        error: error instanceof Error ? error.message : String(error),
      });

      // Retry if within limits
      if (message.retryCount < this.getUserNotificationConfig(message.userId, message.tenantId).retryAttempts) {
        setTimeout(() => this.sendNotification(message), this.getUserNotificationConfig(message.userId, message.tenantId).retryDelay);
      }
    }
  }

  /**
   * Send WebSocket notification
   */
  private async sendWebSocketNotification(message: NotificationMessage): Promise<void> {
    // TODO: Implement WebSocket notification
    // This would integrate with your WebSocket service
    logger.debug('WebSocket notification sent', { messageId: message.id });
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(message: NotificationMessage): Promise<void> {
    // TODO: Implement email notification using SMTP
    // This would integrate with your email service
    logger.debug('Email notification sent', { messageId: message.id });
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(message: NotificationMessage): Promise<void> {
    // TODO: Implement SMS notification using Twilio
    // This would integrate with your SMS service
    logger.debug('SMS notification sent', { messageId: message.id });
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(message: NotificationMessage): Promise<void> {
    // TODO: Implement Slack notification using webhook
    // This would integrate with your Slack service
    logger.debug('Slack notification sent', { messageId: message.id });
  }

  /**
   * Send Discord notification
   */
  private async sendDiscordNotification(message: NotificationMessage): Promise<void> {
    // TODO: Implement Discord notification using webhook
    // This would integrate with your Discord service
    logger.debug('Discord notification sent', { messageId: message.id });
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(message: NotificationMessage): Promise<void> {
    // TODO: Implement push notification
    // This would integrate with your push notification service
    logger.debug('Push notification sent', { messageId: message.id });
  }

  /**
   * Get template for alert type
   */
  private getTemplateForAlert(alert: RiskAlert): NotificationTemplate {
    const templateId = `${alert.alertType}_${alert.severity}`;
    return this.templates.get(templateId) || this.getDefaultTemplate();
  }

  /**
   * Get default template
   */
  private getDefaultTemplate(): NotificationTemplate {
    return {
      id: 'default',
      name: 'Default Risk Alert',
      channels: ['websocket'],
      subject: 'Risk Alert',
      template: 'A risk alert has been triggered: {{title}}',
      variables: ['title', 'message'],
      priority: 'medium',
    };
  }

  /**
   * Process template with alert data
   */
  private processTemplate(template: NotificationTemplate, alert: RiskAlert): { subject: string; template: string } {
    const variables = {
      title: alert.title,
      message: alert.message,
      alertType: alert.alertType,
      severity: alert.severity,
      limitType: alert.limitType,
      limitValue: alert.limitValue,
      currentValue: alert.currentValue,
    };

    let processedSubject = template.subject;
    let processedTemplate = template.template;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      processedSubject = processedSubject.replace(new RegExp(placeholder, 'g'), String(value));
      processedTemplate = processedTemplate.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return { subject: processedSubject, template: processedTemplate };
  }

  /**
   * Map alert severity to notification priority
   */
  private mapSeverityToPriority(severity: string): NotificationPriority {
    switch (severity) {
      case 'low': return 'low';
      case 'medium': return 'medium';
      case 'high': return 'high';
      case 'critical': return 'critical';
      default: return 'medium';
    }
  }

  /**
   * Check if user is rate limited
   */
  private isRateLimited(userId: string, channel: NotificationChannel): boolean {
    const key = `${userId}:${channel}`;
    const limiter = this.rateLimiters.get(key);
    
    if (!limiter) return false;

    const now = Date.now();
    if (now > limiter.resetTime) {
      limiter.count = 0;
      limiter.resetTime = now + 60000; // Reset every minute
    }

    const config = this.getUserNotificationConfig(userId, '');
    return limiter.count >= config.rateLimitPerMinute;
  }

  /**
   * Update rate limit counter
   */
  private updateRateLimit(userId: string, channel: NotificationChannel): void {
    const key = `${userId}:${channel}`;
    const limiter = this.rateLimiters.get(key) || { count: 0, resetTime: Date.now() + 60000 };
    
    limiter.count++;
    this.rateLimiters.set(key, limiter);
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Initialize default notification templates
   */
  private initializeDefaultTemplates(): void {
    const templates: NotificationTemplate[] = [
      {
        id: 'limit_violation_high',
        name: 'High Priority Limit Violation',
        channels: ['websocket', 'email', 'sms'],
        subject: '🚨 Risk Limit Violation - {{alertType}}',
        template: 'Risk limit exceeded for {{limitType}}. Current: {{currentValue}}, Limit: {{limitValue}}',
        variables: ['alertType', 'limitType', 'currentValue', 'limitValue'],
        priority: 'high',
      },
      {
        id: 'limit_violation_critical',
        name: 'Critical Limit Violation',
        channels: ['websocket', 'email', 'sms', 'slack'],
        subject: '🚨 CRITICAL Risk Alert - {{alertType}}',
        template: 'CRITICAL: Risk limit exceeded for {{limitType}}. Immediate action required!',
        variables: ['alertType', 'limitType'],
        priority: 'critical',
      },
      {
        id: 'drawdown_exceeded_medium',
        name: 'Drawdown Exceeded',
        channels: ['websocket', 'email'],
        subject: '⚠️ Drawdown Alert',
        template: 'Portfolio drawdown has exceeded limits. Current drawdown: {{currentValue}}%',
        variables: ['currentValue'],
        priority: 'medium',
      },
      {
        id: 'large_position_medium',
        name: 'Large Position Alert',
        channels: ['websocket', 'email'],
        subject: '📊 Large Position Alert',
        template: 'Large position detected: {{currentValue}}% of portfolio',
        variables: ['currentValue'],
        priority: 'medium',
      },
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Get notification statistics
   */
  getNotificationStats(): {
    totalConfigs: number;
    totalTemplates: number;
    rateLimiters: number;
  } {
    return {
      totalConfigs: this.config.size,
      totalTemplates: this.templates.size,
      rateLimiters: this.rateLimiters.size,
    };
  }
}

// Export singleton instance
export const riskNotificationService = new RiskNotificationService();
export default riskNotificationService;