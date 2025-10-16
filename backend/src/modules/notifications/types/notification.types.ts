/**
 * Notification Types
 *
 * Note: 'sms' type is defined but not currently available (Twilio removed).
 * Available types: email, push, in_app, telegram
 * Planned: webhook, slack
 */

export type NotificationType = 'email' | 'sms' | 'push' | 'in_app' | 'telegram' | 'webhook' | 'slack';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'read';
export type NotificationCategory =
  | 'system'
  | 'trading'
  | 'billing'
  | 'security'
  | 'marketing'
  | 'support'
  | 'social';

export interface SendNotificationRequest {
  userId: string;
  tenantId: string;
  departmentId?: string; // Optional: associate notification with a department
  templateId?: string; // Optional: use a template
  type: NotificationType;
  category: NotificationCategory;
  priority?: NotificationPriority;
  subject?: string;
  content: string;
  variables?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface NotificationFilter {
  userId?: string;
  tenantId?: string;
  departmentId?: string; // Filter by department
  status?: NotificationStatus;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  startDate?: Date;
  endDate?: Date;
  limit?: number; // Pagination limit
  offset?: number; // Pagination offset
}
