/**
 * Risk Notification Templates
 * Pre-defined templates for risk-related notifications
 */

import type { NotificationTemplate } from '../../notifications/types/notification.types';

/**
 * Risk notification templates
 */
export const RISK_NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  // Critical Risk Alerts
  'risk_alert_critical': {
    id: 'risk_alert_critical',
    name: 'Critical Risk Alert',
    type: 'email',
    category: 'trading',
    priority: 'urgent',
    subject: '🚨 CRITICAL Risk Alert: {{title}}',
    content: `
# 🚨 CRITICAL Risk Alert

**{{title}}**

{{message}}

## Alert Details
- **Alert Type:** {{alertType}}
- **Severity:** {{severity}}
- **Limit Type:** {{limitType}}
- **Current Value:** {{currentValue}}
- **Limit Value:** {{limitValue}}
- **Threshold:** {{threshold}}%

## Action Required
This is a critical risk alert that requires immediate attention. Please review your portfolio and take appropriate action.

**Alert ID:** {{alertId}}
**Time:** {{createdAt}}
    `.trim(),
    variables: ['title', 'message', 'alertType', 'severity', 'limitType', 'currentValue', 'limitValue', 'threshold', 'alertId', 'createdAt'],
    isActive: true,
  },

  // High Priority Risk Alerts
  'risk_alert_high': {
    id: 'risk_alert_high',
    name: 'High Priority Risk Alert',
    type: 'email',
    category: 'trading',
    priority: 'high',
    subject: '⚠️ High Risk Alert: {{title}}',
    content: `
# ⚠️ High Risk Alert

**{{title}}**

{{message}}

## Alert Details
- **Alert Type:** {{alertType}}
- **Severity:** {{severity}}
- **Limit Type:** {{limitType}}
- **Current Value:** {{currentValue}}
- **Limit Value:** {{limitValue}}
- **Threshold:** {{threshold}}%

Please review this alert and consider taking action.

**Alert ID:** {{alertId}}
**Time:** {{createdAt}}
    `.trim(),
    variables: ['title', 'message', 'alertType', 'severity', 'limitType', 'currentValue', 'limitValue', 'threshold', 'alertId', 'createdAt'],
    isActive: true,
  },

  // Medium Priority Risk Alerts
  'risk_alert_medium': {
    id: 'risk_alert_medium',
    name: 'Medium Priority Risk Alert',
    type: 'email',
    category: 'trading',
    priority: 'normal',
    subject: '📊 Risk Alert: {{title}}',
    content: `
# 📊 Risk Alert

**{{title}}**

{{message}}

## Alert Details
- **Alert Type:** {{alertType}}
- **Severity:** {{severity}}
- **Limit Type:** {{limitType}}
- **Current Value:** {{currentValue}}
- **Limit Value:** {{limitValue}}
- **Threshold:** {{threshold}}%

**Alert ID:** {{alertId}}
**Time:** {{createdAt}}
    `.trim(),
    variables: ['title', 'message', 'alertType', 'severity', 'limitType', 'currentValue', 'limitValue', 'threshold', 'alertId', 'createdAt'],
    isActive: true,
  },

  // Low Priority Risk Alerts
  'risk_alert_low': {
    id: 'risk_alert_low',
    name: 'Low Priority Risk Alert',
    type: 'email',
    category: 'trading',
    priority: 'low',
    subject: 'ℹ️ Risk Notice: {{title}}',
    content: `
# ℹ️ Risk Notice

**{{title}}**

{{message}}

## Alert Details
- **Alert Type:** {{alertType}}
- **Severity:** {{severity}}
- **Limit Type:** {{limitType}}
- **Current Value:** {{currentValue}}
- **Limit Value:** {{limitValue}}
- **Threshold:** {{threshold}}%

**Alert ID:** {{alertId}}
**Time:** {{createdAt}}
    `.trim(),
    variables: ['title', 'message', 'alertType', 'severity', 'limitType', 'currentValue', 'limitValue', 'threshold', 'alertId', 'createdAt'],
    isActive: true,
  },

  // Push Notification Templates
  'risk_alert_push_critical': {
    id: 'risk_alert_push_critical',
    name: 'Critical Risk Push Notification',
    type: 'push',
    category: 'trading',
    priority: 'urgent',
    subject: '🚨 Critical Risk Alert',
    content: '{{title}} - {{message}}',
    variables: ['title', 'message'],
    isActive: true,
  },

  'risk_alert_push_high': {
    id: 'risk_alert_push_high',
    name: 'High Risk Push Notification',
    type: 'push',
    category: 'trading',
    priority: 'high',
    subject: '⚠️ High Risk Alert',
    content: '{{title}} - {{message}}',
    variables: ['title', 'message'],
    isActive: true,
  },

  'risk_alert_push_medium': {
    id: 'risk_alert_push_medium',
    name: 'Medium Risk Push Notification',
    type: 'push',
    category: 'trading',
    priority: 'normal',
    subject: '📊 Risk Alert',
    content: '{{title}} - {{message}}',
    variables: ['title', 'message'],
    isActive: true,
  },

  'risk_alert_push_low': {
    id: 'risk_alert_push_low',
    name: 'Low Risk Push Notification',
    type: 'push',
    category: 'trading',
    priority: 'low',
    subject: 'ℹ️ Risk Notice',
    content: '{{title}} - {{message}}',
    variables: ['title', 'message'],
    isActive: true,
  },

  // In-App Notification Templates
  'risk_alert_in_app': {
    id: 'risk_alert_in_app',
    name: 'Risk Alert In-App Notification',
    type: 'in_app',
    category: 'trading',
    priority: 'normal',
    subject: '{{title}}',
    content: '{{message}}',
    variables: ['title', 'message', 'alertType', 'severity'],
    isActive: true,
  },

  // Webhook Templates
  'risk_alert_webhook': {
    id: 'risk_alert_webhook',
    name: 'Risk Alert Webhook',
    type: 'webhook',
    category: 'trading',
    priority: 'normal',
    subject: 'Risk Alert',
    content: JSON.stringify({
      alertId: '{{alertId}}',
      alertType: '{{alertType}}',
      severity: '{{severity}}',
      title: '{{title}}',
      message: '{{message}}',
      limitType: '{{limitType}}',
      limitValue: '{{limitValue}}',
      currentValue: '{{currentValue}}',
      threshold: '{{threshold}}',
      createdAt: '{{createdAt}}',
    }),
    variables: ['alertId', 'alertType', 'severity', 'title', 'message', 'limitType', 'limitValue', 'currentValue', 'threshold', 'createdAt'],
    isActive: true,
  },

  // Telegram Templates
  'risk_alert_telegram_critical': {
    id: 'risk_alert_telegram_critical',
    name: 'Critical Risk Telegram Alert',
    type: 'telegram',
    category: 'trading',
    priority: 'urgent',
    subject: '🚨 CRITICAL Risk Alert',
    content: `
🚨 *CRITICAL Risk Alert*

*{{title}}*

{{message}}

*Alert Details:*
• Type: {{alertType}}
• Severity: {{severity}}
• Limit: {{limitType}}
• Current: {{currentValue}}
• Limit: {{limitValue}}
• Threshold: {{threshold}}%

*Alert ID:* {{alertId}}
*Time:* {{createdAt}}
    `.trim(),
    variables: ['title', 'message', 'alertType', 'severity', 'limitType', 'currentValue', 'limitValue', 'threshold', 'alertId', 'createdAt'],
    isActive: true,
  },

  'risk_alert_telegram_high': {
    id: 'risk_alert_telegram_high',
    name: 'High Risk Telegram Alert',
    type: 'telegram',
    category: 'trading',
    priority: 'high',
    subject: '⚠️ High Risk Alert',
    content: `
⚠️ *High Risk Alert*

*{{title}}*

{{message}}

*Alert Details:*
• Type: {{alertType}}
• Severity: {{severity}}
• Limit: {{limitType}}
• Current: {{currentValue}}
• Limit: {{limitValue}}
• Threshold: {{threshold}}%

*Alert ID:* {{alertId}}
*Time:* {{createdAt}}
    `.trim(),
    variables: ['title', 'message', 'alertType', 'severity', 'limitType', 'currentValue', 'limitValue', 'threshold', 'alertId', 'createdAt'],
    isActive: true,
  },
};

/**
 * Get template for risk alert based on severity and type
 */
export function getRiskAlertTemplate(severity: string, type: 'email' | 'push' | 'in_app' | 'telegram' | 'webhook'): string {
  const templateMap: Record<string, Record<string, string>> = {
    critical: {
      email: 'risk_alert_critical',
      push: 'risk_alert_push_critical',
      in_app: 'risk_alert_in_app',
      telegram: 'risk_alert_telegram_critical',
      webhook: 'risk_alert_webhook',
    },
    high: {
      email: 'risk_alert_high',
      push: 'risk_alert_push_high',
      in_app: 'risk_alert_in_app',
      telegram: 'risk_alert_telegram_high',
      webhook: 'risk_alert_webhook',
    },
    medium: {
      email: 'risk_alert_medium',
      push: 'risk_alert_push_medium',
      in_app: 'risk_alert_in_app',
      telegram: 'risk_alert_webhook', // Use webhook template for medium telegram
      webhook: 'risk_alert_webhook',
    },
    low: {
      email: 'risk_alert_low',
      push: 'risk_alert_push_low',
      in_app: 'risk_alert_in_app',
      telegram: 'risk_alert_webhook', // Use webhook template for low telegram
      webhook: 'risk_alert_webhook',
    },
  };

  return templateMap[severity]?.[type] || 'risk_alert_in_app';
}

/**
 * Get all risk notification templates
 */
export function getAllRiskTemplates(): NotificationTemplate[] {
  return Object.values(RISK_NOTIFICATION_TEMPLATES);
}