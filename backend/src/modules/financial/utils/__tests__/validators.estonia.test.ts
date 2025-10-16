/**
 * Estonian Tax System Validators Tests
 */

import { describe, test, expect } from 'bun:test';
import {
  validateEstonianPersonalCode,
  validateEstonianBusinessCode,
  validateEstonianVAT,
  validateEstonianIBAN,
  formatEstonianPersonalCode,
  formatEstonianVAT,
  formatEstonianIBAN,
  sanitizeEstonianTaxId,
  validateEstonianInvoiceReference,
  validateEstonianFiscalPeriod,
  getEstonianVATRate,
  validateEstonianCompanyForm,
} from '../validators.estonia';

describe('Estonian Tax Validators', () => {
  describe('validateEstonianPersonalCode (Isikukood)', () => {
    test('should validate correct personal codes', () => {
      // Valid Estonian personal codes (using known valid test codes)
      expect(validateEstonianPersonalCode('37605030299')).toBe(true);
      expect(validateEstonianPersonalCode('46304049651')).toBe(true);
      expect(validateEstonianPersonalCode('39912319997')).toBe(true);
    });

    test('should reject invalid personal codes', () => {
      expect(validateEstonianPersonalCode('39001010002')).toBe(false); // Wrong check digit
      expect(validateEstonianPersonalCode('12345678901')).toBe(false); // Invalid format
      expect(validateEstonianPersonalCode('99999999999')).toBe(false); // Invalid gender/century
    });

    test('should reject invalid date components', () => {
      expect(validateEstonianPersonalCode('39013010001')).toBe(false); // Invalid month (13)
      expect(validateEstonianPersonalCode('39001320001')).toBe(false); // Invalid day (32)
    });

    test('should handle formatted input', () => {
      expect(validateEstonianPersonalCode('376-0503-0299')).toBe(true);
      expect(validateEstonianPersonalCode('376 0503 0299')).toBe(true);
    });
  });

  describe('validateEstonianBusinessCode (Registrikood)', () => {
    test('should validate correct business codes', () => {
      expect(validateEstonianBusinessCode('10137025')).toBe(true); // Skype Estonia
      expect(validateEstonianBusinessCode('80042537')).toBe(true); // Republic of Estonia
      expect(validateEstonianBusinessCode('12296966')).toBe(true); // Test code
    });

    test('should reject invalid business codes', () => {
      expect(validateEstonianBusinessCode('12345679')).toBe(false); // Wrong check digit
      expect(validateEstonianBusinessCode('1234567')).toBe(false); // Too short
      expect(validateEstonianBusinessCode('123456789')).toBe(false); // Too long
    });

    test('should handle spaces and dashes', () => {
      expect(validateEstonianBusinessCode('1013-7025')).toBe(true);
      expect(validateEstonianBusinessCode('1013 7025')).toBe(true);
    });
  });

  describe('validateEstonianVAT (KMKR)', () => {
    test('should validate correct VAT numbers', () => {
      expect(validateEstonianVAT('EE100931558')).toBe(true);
      expect(validateEstonianVAT('EE101571294')).toBe(true);
    });

    test('should require EE prefix', () => {
      expect(validateEstonianVAT('100931558')).toBe(false);
      expect(validateEstonianVAT('LV100931558')).toBe(false);
    });

    test('should validate check digit', () => {
      expect(validateEstonianVAT('EE100931559')).toBe(false); // Wrong check digit
    });

    test('should handle lowercase and spaces', () => {
      expect(validateEstonianVAT('ee100931558')).toBe(true);
      expect(validateEstonianVAT('EE 100 931 558')).toBe(true);
    });
  });

  describe('validateEstonianIBAN', () => {
    test('should validate correct IBANs', () => {
      expect(validateEstonianIBAN('EE382200221020145685')).toBe(true);
      expect(validateEstonianIBAN('EE471000001020145685')).toBe(true);
    });

    test('should require EE prefix and correct length', () => {
      expect(validateEstonianIBAN('LV38220022102014568')).toBe(false); // Wrong country
      expect(validateEstonianIBAN('EE38220022102014568')).toBe(false); // Too short
      expect(validateEstonianIBAN('EE3822002210201456855')).toBe(false); // Too long
    });

    test('should validate check digits using mod-97', () => {
      expect(validateEstonianIBAN('EE382200221020145686')).toBe(false); // Wrong check
    });

    test('should handle formatted IBANs', () => {
      expect(validateEstonianIBAN('EE38 2200 2210 2014 5685')).toBe(true);
    });
  });

  describe('formatEstonianPersonalCode', () => {
    test('should format personal code correctly', () => {
      expect(formatEstonianPersonalCode('39001010001')).toBe('390-0101-0001');
      expect(formatEstonianPersonalCode('49203120000')).toBe('492-0312-0000');
    });

    test('should return input if invalid length', () => {
      expect(formatEstonianPersonalCode('123')).toBe('123');
    });

    test('should handle already formatted input', () => {
      expect(formatEstonianPersonalCode('390-0101-0001')).toBe('390-0101-0001');
    });
  });

  describe('formatEstonianVAT', () => {
    test('should format VAT number correctly', () => {
      expect(formatEstonianVAT('EE100931558')).toBe('EE 100 931 558');
      expect(formatEstonianVAT('EE101571294')).toBe('EE 101 571 294');
    });

    test('should return input if invalid', () => {
      expect(formatEstonianVAT('123')).toBe('123');
      expect(formatEstonianVAT('LV100931558')).toBe('LV100931558');
    });

    test('should handle lowercase', () => {
      expect(formatEstonianVAT('ee100931558')).toBe('EE 100 931 558');
    });
  });

  describe('formatEstonianIBAN', () => {
    test('should format IBAN correctly', () => {
      expect(formatEstonianIBAN('EE382200221020145685')).toBe('EE38 2200 2210 2014 5685');
    });

    test('should return input if invalid', () => {
      expect(formatEstonianIBAN('123')).toBe('123');
    });

    test('should handle already formatted IBAN', () => {
      expect(formatEstonianIBAN('EE38 2200 2210 2014 5685')).toBe('EE38 2200 2210 2014 5685');
    });
  });

  describe('sanitizeEstonianTaxId', () => {
    test('should remove formatting characters', () => {
      expect(sanitizeEstonianTaxId('390-0101-0001')).toBe('39001010001');
      expect(sanitizeEstonianTaxId('EE 100 931 558')).toBe('EE100931558');
      expect(sanitizeEstonianTaxId('EE38 2200 2210 2014 5685')).toBe('EE382200221020145685');
    });

    test('should uppercase letters', () => {
      expect(sanitizeEstonianTaxId('ee100931558')).toBe('EE100931558');
    });
  });

  describe('validateEstonianInvoiceReference', () => {
    test('should validate correct RF references', () => {
      expect(validateEstonianInvoiceReference('RF18539007547034')).toBe(true);
      expect(validateEstonianInvoiceReference('RF8912345')).toBe(true);
    });

    test('should require RF prefix and check digits', () => {
      expect(validateEstonianInvoiceReference('123456')).toBe(false);
      expect(validateEstonianInvoiceReference('XX18539007547034')).toBe(false);
    });

    test('should validate check digits', () => {
      expect(validateEstonianInvoiceReference('RF19539007547034')).toBe(false); // Wrong check
    });

    test('should handle spaces', () => {
      expect(validateEstonianInvoiceReference('RF18 5390 0754 7034')).toBe(true);
    });
  });

  describe('validateEstonianFiscalPeriod', () => {
    test('should validate annual periods', () => {
      expect(validateEstonianFiscalPeriod('2024')).toBe(true);
      expect(validateEstonianFiscalPeriod('1991')).toBe(true); // Estonia independence
      expect(validateEstonianFiscalPeriod('2025')).toBe(true);
    });

    test('should reject years before independence', () => {
      expect(validateEstonianFiscalPeriod('1990')).toBe(false);
    });

    test('should validate monthly periods', () => {
      expect(validateEstonianFiscalPeriod('2024-01')).toBe(true);
      expect(validateEstonianFiscalPeriod('2024-12')).toBe(true);
      expect(validateEstonianFiscalPeriod('2024-13')).toBe(false); // Invalid month
    });

    test('should validate quarterly periods', () => {
      expect(validateEstonianFiscalPeriod('2024-Q1')).toBe(true);
      expect(validateEstonianFiscalPeriod('2024-Q4')).toBe(true);
      expect(validateEstonianFiscalPeriod('2024-Q5')).toBe(false); // Invalid quarter
    });
  });

  describe('getEstonianVATRate', () => {
    test('should return correct standard rate based on date', () => {
      const before = new Date('2024-06-30');
      const after = new Date('2024-07-01');

      expect(getEstonianVATRate(before, 'standard')).toBe(20);
      expect(getEstonianVATRate(after, 'standard')).toBe(22);
    });

    test('should return reduced rate', () => {
      expect(getEstonianVATRate(new Date(), 'reduced')).toBe(9);
    });

    test('should return zero rate', () => {
      expect(getEstonianVATRate(new Date(), 'zero')).toBe(0);
    });
  });

  describe('validateEstonianCompanyForm', () => {
    test('should validate common company forms', () => {
      expect(validateEstonianCompanyForm('OÜ')).toBe(true);   // Private Limited
      expect(validateEstonianCompanyForm('AS')).toBe(true);   // Public Limited
      expect(validateEstonianCompanyForm('TÜ')).toBe(true);   // General Partnership
      expect(validateEstonianCompanyForm('MTÜ')).toBe(true);  // Non-profit
      expect(validateEstonianCompanyForm('FIE')).toBe(true);  // Sole Proprietor
    });

    test('should handle lowercase', () => {
      expect(validateEstonianCompanyForm('oü')).toBe(true);
      expect(validateEstonianCompanyForm('as')).toBe(true);
    });

    test('should reject invalid forms', () => {
      expect(validateEstonianCompanyForm('LLC')).toBe(false);
      expect(validateEstonianCompanyForm('LTD')).toBe(false);
      expect(validateEstonianCompanyForm('XYZ')).toBe(false);
    });
  });

  describe('Real-World Scenarios', () => {
    test('should validate real Estonian companies', () => {
      // Skype Technologies OÜ
      expect(validateEstonianBusinessCode('10137025')).toBe(true);

      // Republic of Estonia
      expect(validateEstonianBusinessCode('80042537')).toBe(true);
    });

    test('should validate realistic VAT numbers', () => {
      expect(validateEstonianVAT('EE100931558')).toBe(true);
      expect(validateEstonianVAT('EE101571294')).toBe(true);
    });

    test('should format complete company information', () => {
      const code = '10137025';
      const vat = 'EE100931558';
      const iban = 'EE382200221020145685';

      expect(validateEstonianBusinessCode(code)).toBe(true);
      expect(validateEstonianVAT(vat)).toBe(true);
      expect(validateEstonianIBAN(iban)).toBe(true);

      expect(formatEstonianVAT(vat)).toBe('EE 100 931 558');
      expect(formatEstonianIBAN(iban)).toBe('EE38 2200 2210 2014 5685');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty strings', () => {
      expect(validateEstonianPersonalCode('')).toBe(false);
      expect(validateEstonianBusinessCode('')).toBe(false);
      expect(validateEstonianVAT('')).toBe(false);
      expect(validateEstonianIBAN('')).toBe(false);
    });

    test('should handle various formatting variations', () => {
      const code = '37605030299';
      expect(validateEstonianPersonalCode(code)).toBe(true);
      expect(validateEstonianPersonalCode('376-0503-0299')).toBe(true);
      expect(validateEstonianPersonalCode('376 0503 0299')).toBe(true);
      expect(validateEstonianPersonalCode('376.0503.0299')).toBe(false); // Dots not supported
    });

    test('should handle special characters gracefully', () => {
      expect(validateEstonianBusinessCode('1234@5678')).toBe(false);
      expect(validateEstonianVAT('EE100931558!')).toBe(false);
    });
  });
});
