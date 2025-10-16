/**
 * Financial Validators Tests
 */

import { describe, test, expect } from 'bun:test';
import {
  validateCNPJ,
  validateCPF,
  validateEmail,
  validateDateRange,
  validateFiscalPeriod,
  validateAmount,
  validateCurrency,
  validateBankAccount,
  validateDoubleEntry,
  validateInvoiceNumber,
  sanitizeTaxId,
  formatTaxId,
  validateNFeKey,
  formatNFeKey,
} from '../validators';

describe('Financial Validators', () => {
  describe('validateCNPJ', () => {
    test('should validate correct CNPJ', () => {
      expect(validateCNPJ('11.222.333/0001-81')).toBe(true);
      expect(validateCNPJ('11222333000181')).toBe(true);
    });

    test('should reject invalid CNPJ', () => {
      expect(validateCNPJ('11.222.333/0001-82')).toBe(false); // Wrong check digit
      expect(validateCNPJ('11111111111111')).toBe(false); // Repeated digits
      expect(validateCNPJ('123')).toBe(false); // Too short
      expect(validateCNPJ('')).toBe(false); // Empty
    });

    test('should handle formatted and unformatted CNPJ', () => {
      const cnpj = '11.222.333/0001-81';
      const unformatted = cnpj.replace(/[^\d]/g, '');
      expect(validateCNPJ(cnpj)).toBe(validateCNPJ(unformatted));
    });
  });

  describe('validateCPF', () => {
    test('should validate correct CPF', () => {
      expect(validateCPF('123.456.789-09')).toBe(true);
      expect(validateCPF('12345678909')).toBe(true);
    });

    test('should reject invalid CPF', () => {
      expect(validateCPF('123.456.789-10')).toBe(false); // Wrong check digit
      expect(validateCPF('11111111111')).toBe(false); // Repeated digits
      expect(validateCPF('123')).toBe(false); // Too short
      expect(validateCPF('')).toBe(false); // Empty
    });

    test('should handle formatted and unformatted CPF', () => {
      const cpf = '123.456.789-09';
      const unformatted = cpf.replace(/[^\d]/g, '');
      expect(validateCPF(cpf)).toBe(validateCPF(unformatted));
    });
  });

  describe('validateEmail', () => {
    test('should validate correct email', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.user@domain.co.uk')).toBe(true);
      expect(validateEmail('user+tag@example.com')).toBe(true);
    });

    test('should reject invalid email', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('user @domain.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('validateDateRange', () => {
    test('should validate correct date range', () => {
      const start = new Date('2025-01-01');
      const end = new Date('2025-12-31');
      expect(validateDateRange(start, end)).toBe(true);
    });

    test('should allow same date', () => {
      const date = new Date('2025-01-01');
      expect(validateDateRange(date, date)).toBe(true);
    });

    test('should reject invalid date range', () => {
      const start = new Date('2025-12-31');
      const end = new Date('2025-01-01');
      expect(validateDateRange(start, end)).toBe(false);
    });
  });

  describe('validateFiscalPeriod', () => {
    test('should validate correct fiscal period', () => {
      expect(validateFiscalPeriod('2025-01')).toBe(true);
      expect(validateFiscalPeriod('2025-12')).toBe(true);
      expect(validateFiscalPeriod('2024-06')).toBe(true);
    });

    test('should reject invalid fiscal period', () => {
      expect(validateFiscalPeriod('2025-13')).toBe(false); // Invalid month
      expect(validateFiscalPeriod('2025-00')).toBe(false); // Invalid month
      expect(validateFiscalPeriod('25-01')).toBe(false); // Invalid year format
      expect(validateFiscalPeriod('2025/01')).toBe(false); // Wrong separator
      expect(validateFiscalPeriod('2025-1')).toBe(false); // Month not zero-padded
      expect(validateFiscalPeriod('')).toBe(false);
    });
  });

  describe('validateAmount', () => {
    test('should validate positive numbers', () => {
      expect(validateAmount(100)).toBe(true);
      expect(validateAmount(0)).toBe(true);
      expect(validateAmount(0.01)).toBe(true);
      expect(validateAmount('100')).toBe(true);
      expect(validateAmount('0.01')).toBe(true);
    });

    test('should reject negative numbers', () => {
      expect(validateAmount(-100)).toBe(false);
      expect(validateAmount('-100')).toBe(false);
    });

    test('should reject invalid values', () => {
      expect(validateAmount('abc')).toBe(false);
      expect(validateAmount('')).toBe(false);
      expect(validateAmount(NaN)).toBe(false);
    });
  });

  describe('validateCurrency', () => {
    test('should validate correct currency codes', () => {
      expect(validateCurrency('BRL')).toBe(true);
      expect(validateCurrency('USD')).toBe(true);
      expect(validateCurrency('EUR')).toBe(true);
      expect(validateCurrency('GBP')).toBe(true);
    });

    test('should reject invalid currency codes', () => {
      expect(validateCurrency('brl')).toBe(false); // Lowercase
      expect(validateCurrency('BR')).toBe(false); // Too short
      expect(validateCurrency('BRLL')).toBe(false); // Too long
      expect(validateCurrency('123')).toBe(false); // Numbers
      expect(validateCurrency('')).toBe(false);
    });
  });

  describe('validateBankAccount', () => {
    test('should validate correct bank accounts', () => {
      expect(validateBankAccount('1234')).toBe(true); // Minimum length
      expect(validateBankAccount('123456789012')).toBe(true); // Maximum length
      expect(validateBankAccount('12345-6')).toBe(true); // With dash
      expect(validateBankAccount('12345 6')).toBe(true); // With space
    });

    test('should reject invalid bank accounts', () => {
      expect(validateBankAccount('123')).toBe(false); // Too short
      expect(validateBankAccount('1234567890123')).toBe(false); // Too long
      expect(validateBankAccount('')).toBe(false);
    });
  });

  describe('validateDoubleEntry', () => {
    test('should validate balanced entries', () => {
      const lines = [
        { entryType: 'debit' as const, amount: '100.00' },
        { entryType: 'credit' as const, amount: '100.00' },
      ];

      const result = validateDoubleEntry(lines);
      expect(result.valid).toBe(true);
      expect(result.debitsTotal).toBe(100);
      expect(result.creditsTotal).toBe(100);
      expect(result.difference).toBe(0);
    });

    test('should validate multiple balanced entries', () => {
      const lines = [
        { entryType: 'debit' as const, amount: '50.00' },
        { entryType: 'debit' as const, amount: '50.00' },
        { entryType: 'credit' as const, amount: '100.00' },
      ];

      const result = validateDoubleEntry(lines);
      expect(result.valid).toBe(true);
      expect(result.debitsTotal).toBe(100);
      expect(result.creditsTotal).toBe(100);
    });

    test('should allow tiny rounding differences within tolerance', () => {
      const lines = [
        { entryType: 'debit' as const, amount: '100.00' },
        { entryType: 'credit' as const, amount: '100.005' },
      ];

      const result = validateDoubleEntry(lines);
      expect(result.valid).toBe(true); // Within 0.01 tolerance
      expect(result.difference).toBeLessThan(0.01);
    });

    test('should reject unbalanced entries', () => {
      const lines = [
        { entryType: 'debit' as const, amount: '100.00' },
        { entryType: 'credit' as const, amount: '50.00' },
      ];

      const result = validateDoubleEntry(lines);
      expect(result.valid).toBe(false);
      expect(result.debitsTotal).toBe(100);
      expect(result.creditsTotal).toBe(50);
      expect(result.difference).toBe(50);
    });

    test('should handle decimal amounts correctly', () => {
      const lines = [
        { entryType: 'debit' as const, amount: '123.45' },
        { entryType: 'debit' as const, amount: '67.89' },
        { entryType: 'credit' as const, amount: '191.34' },
      ];

      const result = validateDoubleEntry(lines);
      expect(result.valid).toBe(true);
      expect(result.debitsTotal).toBeCloseTo(191.34, 2);
      expect(result.creditsTotal).toBeCloseTo(191.34, 2);
    });
  });

  describe('validateInvoiceNumber', () => {
    test('should validate correct invoice numbers', () => {
      expect(validateInvoiceNumber('INV-001')).toBe(true);
      expect(validateInvoiceNumber('2025/001')).toBe(true);
      expect(validateInvoiceNumber('NF-2025-001')).toBe(true);
      expect(validateInvoiceNumber('123456')).toBe(true);
    });

    test('should reject invalid invoice numbers', () => {
      expect(validateInvoiceNumber('inv-001')).toBe(false); // Lowercase
      expect(validateInvoiceNumber('INV 001')).toBe(false); // Space
      expect(validateInvoiceNumber('INV_001')).toBe(false); // Underscore
      expect(validateInvoiceNumber('')).toBe(false);
    });
  });

  describe('sanitizeTaxId', () => {
    test('should remove formatting from tax IDs', () => {
      expect(sanitizeTaxId('123.456.789-09')).toBe('12345678909');
      expect(sanitizeTaxId('11.222.333/0001-81')).toBe('11222333000181');
      expect(sanitizeTaxId('123-456-789')).toBe('123456789');
    });

    test('should handle already clean IDs', () => {
      expect(sanitizeTaxId('12345678909')).toBe('12345678909');
      expect(sanitizeTaxId('11222333000181')).toBe('11222333000181');
    });
  });

  describe('formatTaxId', () => {
    test('should format CPF correctly', () => {
      expect(formatTaxId('12345678909')).toBe('123.456.789-09');
    });

    test('should format CNPJ correctly', () => {
      expect(formatTaxId('11222333000181')).toBe('11.222.333/0001-81');
    });

    test('should handle already formatted IDs', () => {
      expect(formatTaxId('123.456.789-09')).toBe('123.456.789-09');
      expect(formatTaxId('11.222.333/0001-81')).toBe('11.222.333/0001-81');
    });

    test('should return unmodified for invalid lengths', () => {
      expect(formatTaxId('123')).toBe('123');
      expect(formatTaxId('12345678901234567')).toBe('12345678901234567');
    });
  });

  describe('validateNFeKey', () => {
    test('should validate correct NF-e key', () => {
      const validKey = '35250111222333000181550010000001231234567890';
      expect(validateNFeKey(validKey)).toBe(true);
    });

    test('should validate formatted NF-e key', () => {
      const formattedKey = '3525 0111 2223 3300 0181 5500 1000 0001 2312 3456 7890';
      expect(validateNFeKey(formattedKey)).toBe(true);
    });

    test('should reject invalid NF-e key', () => {
      expect(validateNFeKey('123')).toBe(false); // Too short
      expect(validateNFeKey('12345678901234567890123456789012345678901234567')).toBe(false); // Too long
      expect(validateNFeKey('3525011122233300018155001000000123123456789A')).toBe(false); // Contains letter
      expect(validateNFeKey('')).toBe(false);
    });
  });

  describe('formatNFeKey', () => {
    test('should format NF-e key correctly', () => {
      const key = '35250111222333000181550010000001231234567890';
      const formatted = formatNFeKey(key);
      expect(formatted).toBe('3525 0111 2223 3300 0181 5500 1000 0001 2312 3456 7890');
    });

    test('should handle already formatted key', () => {
      const formatted = '3525 0111 2223 3300 0181 5500 1000 0001 2312 3456 7890';
      const result = formatNFeKey(formatted);
      // Should re-format (remove spaces and add them back)
      expect(result).toBe(formatted);
    });

    test('should handle partial keys', () => {
      const partial = '352501112223';
      const formatted = formatNFeKey(partial);
      expect(formatted).toBe('3525 0111 2223');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty strings gracefully', () => {
      expect(validateCNPJ('')).toBe(false);
      expect(validateCPF('')).toBe(false);
      expect(validateEmail('')).toBe(false);
      expect(validateFiscalPeriod('')).toBe(false);
      expect(validateCurrency('')).toBe(false);
      expect(validateBankAccount('')).toBe(false);
      expect(validateInvoiceNumber('')).toBe(false);
      expect(validateNFeKey('')).toBe(false);
    });

    test('should handle null/undefined in sanitizeTaxId', () => {
      expect(sanitizeTaxId('')).toBe('');
    });

    test('should validate zero amounts', () => {
      expect(validateAmount(0)).toBe(true);
      expect(validateAmount('0')).toBe(true);
      expect(validateAmount('0.00')).toBe(true);
    });

    test('should handle very large amounts', () => {
      expect(validateAmount(999999999999.99)).toBe(true);
      expect(validateAmount('999999999999.99')).toBe(true);
    });

    test('should handle very small positive amounts', () => {
      expect(validateAmount(0.0001)).toBe(true);
      expect(validateAmount('0.0001')).toBe(true);
    });
  });

  describe('Real-World Scenarios', () => {
    test('should validate real Brazilian CNPJ examples', () => {
      // Common test CNPJs (not real companies)
      const testCNPJs = [
        '11.222.333/0001-81',
        '00.000.000/0001-91',
      ];

      testCNPJs.forEach((cnpj) => {
        expect(validateCNPJ(cnpj)).toBe(true);
      });
    });

    test('should validate real Brazilian CPF examples', () => {
      // Test CPFs (algorithmically valid)
      const testCPFs = [
        '123.456.789-09',
        '000.000.001-91',
      ];

      testCPFs.forEach((cpf) => {
        expect(validateCPF(cpf)).toBe(true);
      });
    });

    test('should validate complex double-entry scenarios', () => {
      // Invoice with multiple line items
      const invoiceLines = [
        { entryType: 'debit' as const, amount: '1000.00' }, // AR
        { entryType: 'credit' as const, amount: '850.00' }, // Revenue
        { entryType: 'credit' as const, amount: '150.00' }, // Tax Payable
      ];

      const result = validateDoubleEntry(invoiceLines);
      expect(result.valid).toBe(true);
      expect(result.debitsTotal).toBe(1000);
      expect(result.creditsTotal).toBe(1000);
    });

    test('should validate fiscal periods for full year', () => {
      const periods = [
        '2025-01',
        '2025-02',
        '2025-03',
        '2025-04',
        '2025-05',
        '2025-06',
        '2025-07',
        '2025-08',
        '2025-09',
        '2025-10',
        '2025-11',
        '2025-12',
      ];

      periods.forEach((period) => {
        expect(validateFiscalPeriod(period)).toBe(true);
      });
    });
  });
});
