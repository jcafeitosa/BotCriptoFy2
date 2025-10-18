import { emailProvider } from '../../notifications/providers';
import logger from '@/utils/logger';

function uuid(): string {
  return crypto.randomUUID();
}

export async function sendVerificationEmail(to: string, url: string) {
  if (!emailProvider.isEnabled()) {
    logger.warn('Email provider not configured; skipping verification email', { to });
    return { success: false };
  }

  const payload = {
    notificationId: uuid(),
    userId: 'system',
    tenantId: 'system',
    recipient: to,
    subject: 'Verify your email address',
    content: `Please verify your email by visiting: ${url}`,
    priority: 'normal' as const,
    metadata: { category: 'auth.verify_email', url },
  };

  return emailProvider.send(payload);
}

export async function sendResetPasswordEmail(to: string, url: string) {
  if (!emailProvider.isEnabled()) {
    logger.warn('Email provider not configured; skipping reset email', { to });
    return { success: false };
  }

  const payload = {
    notificationId: uuid(),
    userId: 'system',
    tenantId: 'system',
    recipient: to,
    subject: 'Reset your password',
    content: `Reset your password using: ${url}`,
    priority: 'high' as const,
    metadata: { category: 'auth.reset_password', url },
  };

  return emailProvider.send(payload);
}
