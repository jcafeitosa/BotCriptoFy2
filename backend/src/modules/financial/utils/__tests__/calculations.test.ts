/**
 * Financial Calculations Tests
 */

import { describe, test, expect } from 'bun:test';
import {
  calculatePercentage,
  calculateDiscountAmount,
  calculateTaxAmount,
  calculateTotalWithTax,
  calculateNetMargin,
  calculateVariance,
  calculateCompoundInterest,
  calculateAmortization,
  calculateROI,
  calculateNPV,
  calculateIRR,
  formatCurrency,
  parseCurrency,
  daysBetween,
  getFiscalQuarter,
  getFiscalPeriod,
} from '../calculations';

describe('Financial Calculations', () => {
  describe('calculatePercentage', () => {
    test('should calculate correct percentage', () => {
      expect(calculatePercentage(50, 200)).toBe(25);
      expect(calculatePercentage(100, 100)).toBe(100);
      expect(calculatePercentage(0, 100)).toBe(0);
    });

    test('should return 0 when total is 0', () => {
      expect(calculatePercentage(50, 0)).toBe(0);
    });
  });

  describe('calculateDiscountAmount', () => {
    test('should calculate discount correctly', () => {
      expect(calculateDiscountAmount(100, 10)).toBe(10);
      expect(calculateDiscountAmount(250, 20)).toBe(50);
      expect(calculateDiscountAmount(1000, 15)).toBe(150);
    });
  });

  describe('calculateTaxAmount', () => {
    test('should calculate tax correctly', () => {
      expect(calculateTaxAmount(100, 18)).toBe(18);
      expect(calculateTaxAmount(1000, 5)).toBe(50);
      expect(calculateTaxAmount(500, 12)).toBe(60);
    });
  });

  describe('calculateTotalWithTax', () => {
    test('should calculate total with discount and tax', () => {
      const result = calculateTotalWithTax(100, 10, 5);

      expect(result.subtotal).toBe('100.00');
      expect(result.discountAmount).toBe('5.00');
      expect(result.taxableAmount).toBe('95.00');
      expect(result.taxAmount).toBe('9.50');
      expect(result.totalAmount).toBe('104.50');
    });

    test('should work without discount', () => {
      const result = calculateTotalWithTax(100, 10, 0);

      expect(result.subtotal).toBe('100.00');
      expect(result.discountAmount).toBe('0.00');
      expect(result.taxableAmount).toBe('100.00');
      expect(result.taxAmount).toBe('10.00');
      expect(result.totalAmount).toBe('110.00');
    });
  });

  describe('calculateNetMargin', () => {
    test('should calculate net margin correctly', () => {
      expect(calculateNetMargin(1000, 700)).toBe(30);
      expect(calculateNetMargin(500, 400)).toBe(20);
      expect(calculateNetMargin(1000, 1000)).toBe(0);
    });

    test('should return 0 when revenue is 0', () => {
      expect(calculateNetMargin(0, 100)).toBe(0);
    });
  });

  describe('calculateVariance', () => {
    test('should calculate variance correctly', () => {
      const result1 = calculateVariance(120, 100);
      expect(result1.variance).toBe(20);
      expect(result1.variancePercent).toBe(20);
      expect(result1.status).toBe('over');

      const result2 = calculateVariance(80, 100);
      expect(result2.variance).toBe(-20);
      expect(result2.variancePercent).toBe(-20);
      expect(result2.status).toBe('under');

      const result3 = calculateVariance(100, 100);
      expect(result3.variance).toBe(0);
      expect(result3.status).toBe('on-budget');
    });
  });

  describe('calculateCompoundInterest', () => {
    test('should calculate compound interest correctly', () => {
      const result = calculateCompoundInterest(1000, 10, 2);
      expect(result).toBeCloseTo(1210, 0);
    });

    test('should handle zero periods', () => {
      const result = calculateCompoundInterest(1000, 10, 0);
      expect(result).toBe(1000);
    });

    test('should handle zero rate', () => {
      const result = calculateCompoundInterest(1000, 0, 5);
      expect(result).toBe(1000);
    });
  });

  describe('calculateAmortization', () => {
    test('should calculate amortization schedule correctly', () => {
      const schedule = calculateAmortization(10000, 12, 12);

      expect(schedule).toHaveLength(12);
      expect(schedule[0].period).toBe(1);
      expect(schedule[11].period).toBe(12);

      // Check that last balance is close to zero
      expect(schedule[11].balance).toBeCloseTo(0, 0);

      // All payments should be equal (fixed amortization)
      const firstPayment = schedule[0].payment;
      schedule.forEach((s) => {
        expect(s.payment).toBeCloseTo(firstPayment, 2);
      });

      // Interest should decrease over time
      expect(schedule[0].interest).toBeGreaterThan(schedule[11].interest);

      // Principal should increase over time
      expect(schedule[0].principal).toBeLessThan(schedule[11].principal);
    });

    test('should handle single period', () => {
      const schedule = calculateAmortization(1000, 12, 1);

      expect(schedule).toHaveLength(1);
      expect(schedule[0].balance).toBeCloseTo(0, 0);
    });
  });

  describe('calculateROI', () => {
    test('should calculate ROI correctly', () => {
      expect(calculateROI(150, 100)).toBe(50);
      expect(calculateROI(200, 100)).toBe(100);
      expect(calculateROI(100, 100)).toBe(0);
    });

    test('should return 0 when cost is 0', () => {
      expect(calculateROI(100, 0)).toBe(0);
    });
  });

  describe('calculateNPV', () => {
    test('should calculate NPV correctly', () => {
      const cashFlows = [-1000, 300, 300, 300, 300];
      const npv = calculateNPV(10, cashFlows);

      expect(npv).toBeCloseTo(-49.04, 1);
    });
  });

  describe('calculateIRR', () => {
    test('should calculate IRR correctly', () => {
      const cashFlows = [-1000, 300, 300, 300, 300];
      const irr = calculateIRR(cashFlows);

      expect(irr).toBeCloseTo(7.71, 1);
    });
  });

  describe('formatCurrency', () => {
    test('should format BRL correctly', () => {
      const formatted = formatCurrency(1234.56, 'BRL');
      expect(formatted).toContain('1.234,56');
    });

    test('should format USD correctly', () => {
      const formatted = formatCurrency(1234.56, 'USD');
      // Using pt-BR locale, USD is formatted as "US$ 1.234,56"
      expect(formatted).toContain('1.234,56');
    });
  });

  describe('parseCurrency', () => {
    test('should parse currency strings correctly', () => {
      expect(parseCurrency('R$ 1.234,56')).toBe(1234.56);
      expect(parseCurrency('$1,234.56')).toBe(1234.56);
      expect(parseCurrency('1234.56')).toBe(1234.56);
    });
  });

  describe('daysBetween', () => {
    test('should calculate days between dates correctly', () => {
      const date1 = new Date('2025-01-01');
      const date2 = new Date('2025-01-11');

      expect(daysBetween(date1, date2)).toBe(10);
    });
  });

  describe('getFiscalQuarter', () => {
    test('should return correct fiscal quarter', () => {
      expect(getFiscalQuarter(new Date('2025-01-15'))).toBe('Q1');
      expect(getFiscalQuarter(new Date('2025-04-15'))).toBe('Q2');
      expect(getFiscalQuarter(new Date('2025-07-15'))).toBe('Q3');
      expect(getFiscalQuarter(new Date('2025-10-15'))).toBe('Q4');
    });
  });

  describe('getFiscalPeriod', () => {
    test('should return correct fiscal period', () => {
      expect(getFiscalPeriod(new Date('2025-01-15'))).toBe('2025-01');
      expect(getFiscalPeriod(new Date('2025-12-31'))).toBe('2025-12');
    });
  });
});
