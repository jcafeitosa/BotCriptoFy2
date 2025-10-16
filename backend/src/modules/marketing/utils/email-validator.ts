/**
 * Email Validator
 * Validates email addresses with advanced checks
 */

import logger from '@/utils/logger';

/**
 * Email validation result
 */
export interface EmailValidationResult {
  valid: boolean;
  email: string;
  errors: string[];
}

/**
 * Email validator class
 */
export class EmailValidator {
  // RFC 5322 compliant email regex (simplified)
  private static readonly EMAIL_REGEX =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  // Disposable email domains (common ones)
  private static readonly DISPOSABLE_DOMAINS = new Set([
    'tempmail.com',
    'guerrillamail.com',
    '10minutemail.com',
    'mailinator.com',
    'throwaway.email',
    'temp-mail.org',
    'maildrop.cc',
  ]);

  /**
   * Validate email format
   */
  static validateFormat(email: string): boolean {
    if (!email || typeof email !== 'string') {
      return false;
    }

    // Basic format check
    if (!this.EMAIL_REGEX.test(email)) {
      return false;
    }

    // Check length (RFC 5321 limit)
    if (email.length > 254) {
      return false;
    }

    const [localPart, domain] = email.split('@');

    // Local part checks
    if (!localPart || localPart.length > 64) {
      return false;
    }

    // Domain checks
    if (!domain || domain.length > 253) {
      return false;
    }

    // Domain must have at least one dot
    if (!domain.includes('.')) {
      return false;
    }

    return true;
  }

  /**
   * Check if email is from a disposable domain
   */
  static isDisposable(email: string): boolean {
    const domain = email.split('@')[1]?.toLowerCase();
    return domain ? this.DISPOSABLE_DOMAINS.has(domain) : false;
  }

  /**
   * Normalize email address
   */
  static normalize(email: string): string {
    return email.toLowerCase().trim();
  }

  /**
   * Validate email comprehensively
   */
  static validate(email: string, options?: { allowDisposable?: boolean }): EmailValidationResult {
    const errors: string[] = [];
    const normalizedEmail = this.normalize(email);

    // Format validation
    if (!this.validateFormat(normalizedEmail)) {
      errors.push('Invalid email format');
    }

    // Disposable email check
    if (!options?.allowDisposable && this.isDisposable(normalizedEmail)) {
      errors.push('Disposable email addresses are not allowed');
    }

    const result: EmailValidationResult = {
      valid: errors.length === 0,
      email: normalizedEmail,
      errors,
    };

    if (!result.valid) {
      logger.debug('Email validation failed', { email: normalizedEmail, errors });
    }

    return result;
  }

  /**
   * Validate multiple emails
   */
  static validateBatch(
    emails: string[],
    options?: { allowDisposable?: boolean }
  ): EmailValidationResult[] {
    return emails.map((email) => this.validate(email, options));
  }

  /**
   * Extract email from string (finds first email-like pattern)
   */
  static extract(text: string): string | null {
    // Create a global regex to search in text
    const emailRegex = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+/g;
    const match = text.match(emailRegex);
    return match ? this.normalize(match[0]) : null;
  }

  /**
   * Extract all emails from text
   */
  static extractAll(text: string): string[] {
    // Create a global regex to search in text
    const emailRegex = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+/g;
    const matches = text.match(emailRegex);
    return matches ? matches.map((email) => this.normalize(email)) : [];
  }

  /**
   * Check if email domain matches pattern
   */
  static matchesDomain(email: string, pattern: string): boolean {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return false;

    // Exact match
    if (domain === pattern.toLowerCase()) {
      return true;
    }

    // Wildcard match (*.example.com)
    if (pattern.startsWith('*.')) {
      const baseDomain = pattern.substring(2).toLowerCase();
      return domain.endsWith(baseDomain);
    }

    return false;
  }

  /**
   * Get email domain
   */
  static getDomain(email: string): string | null {
    const domain = email.split('@')[1];
    return domain ? domain.toLowerCase() : null;
  }

  /**
   * Get email local part (before @)
   */
  static getLocalPart(email: string): string | null {
    const localPart = email.split('@')[0];
    return localPart || null;
  }
}

/**
 * Convenience function for quick validation
 */
export function validateEmail(email: string, options?: { allowDisposable?: boolean }): boolean {
  return EmailValidator.validate(email, options).valid;
}

/**
 * Convenience function for normalization
 */
export function normalizeEmail(email: string): string {
  return EmailValidator.normalize(email);
}
