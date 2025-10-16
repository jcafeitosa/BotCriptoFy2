/**
 * Email Validator Tests
 */

import { describe, it, expect } from 'bun:test';
import { EmailValidator, validateEmail, normalizeEmail } from '../utils/email-validator';

describe('EmailValidator', () => {
  describe('validateFormat', () => {
    it('should validate correct email formats', () => {
      expect(EmailValidator.validateFormat('test@example.com')).toBe(true);
      expect(EmailValidator.validateFormat('user+tag@domain.co.uk')).toBe(true);
      expect(EmailValidator.validateFormat('first.last@company.com')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(EmailValidator.validateFormat('invalid')).toBe(false);
      expect(EmailValidator.validateFormat('invalid@')).toBe(false);
      expect(EmailValidator.validateFormat('@invalid.com')).toBe(false);
      expect(EmailValidator.validateFormat('invalid@domain')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(EmailValidator.validateFormat('')).toBe(false);
      expect(EmailValidator.validateFormat('a@b.c')).toBe(true);
      expect(EmailValidator.validateFormat('test@localhost.localdomain')).toBe(true);
    });
  });

  describe('isDisposable', () => {
    it('should detect disposable email domains', () => {
      expect(EmailValidator.isDisposable('test@tempmail.com')).toBe(true);
      expect(EmailValidator.isDisposable('user@guerrillamail.com')).toBe(true);
      expect(EmailValidator.isDisposable('test@mailinator.com')).toBe(true);
    });

    it('should allow legitimate domains', () => {
      expect(EmailValidator.isDisposable('test@gmail.com')).toBe(false);
      expect(EmailValidator.isDisposable('test@company.com')).toBe(false);
    });
  });

  describe('normalize', () => {
    it('should normalize email addresses', () => {
      expect(EmailValidator.normalize('Test@Example.COM')).toBe('test@example.com');
      expect(EmailValidator.normalize('  user@domain.com  ')).toBe('user@domain.com');
    });
  });

  describe('validate', () => {
    it('should validate with all checks', () => {
      const result = EmailValidator.validate('test@example.com');
      expect(result.valid).toBe(true);
      expect(result.email).toBe('test@example.com');
      expect(result.errors).toEqual([]);
    });

    it('should fail for invalid format', () => {
      const result = EmailValidator.validate('invalid');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should fail for disposable emails by default', () => {
      const result = EmailValidator.validate('test@tempmail.com');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Disposable email addresses are not allowed');
    });

    it('should allow disposable emails when configured', () => {
      const result = EmailValidator.validate('test@tempmail.com', { allowDisposable: true });
      expect(result.valid).toBe(true);
    });
  });

  describe('extract', () => {
    it('should extract email from text', () => {
      expect(EmailValidator.extract('Contact me at test@example.com')).toBe('test@example.com');
      expect(EmailValidator.extract('Email: user@domain.com for info')).toBe('user@domain.com');
    });

    it('should return null when no email found', () => {
      expect(EmailValidator.extract('No email here')).toBe(null);
    });
  });

  describe('extractAll', () => {
    it('should extract multiple emails', () => {
      const emails = EmailValidator.extractAll('Contact test@example.com or admin@example.com');
      expect(emails).toEqual(['test@example.com', 'admin@example.com']);
    });
  });

  describe('getDomain', () => {
    it('should extract domain from email', () => {
      expect(EmailValidator.getDomain('test@example.com')).toBe('example.com');
      expect(EmailValidator.getDomain('user@subdomain.domain.co.uk')).toBe(
        'subdomain.domain.co.uk'
      );
    });
  });

  describe('getLocalPart', () => {
    it('should extract local part from email', () => {
      expect(EmailValidator.getLocalPart('test@example.com')).toBe('test');
      expect(EmailValidator.getLocalPart('user+tag@domain.com')).toBe('user+tag');
    });
  });

  describe('convenience functions', () => {
    it('validateEmail should work', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('invalid')).toBe(false);
    });

    it('normalizeEmail should work', () => {
      expect(normalizeEmail('Test@Example.COM')).toBe('test@example.com');
    });
  });
});
