/**
 * Estonian Tax System Calculations Tests
 */

import { describe, test, expect } from 'bun:test';
import {
  calculateEstonianVAT,
  calculateEstonianCIT,
  calculateEstonianPIT,
  calculateEstonianSocialTax,
  calculateEstonianUnemploymentInsurance,
  calculateEstonianMandatoryPension,
  calculateEstonianEmploymentCosts,
  calculateEstonianLandTax,
  calculateEstonianEResidencyCosts,
  formatEstonianCurrency,
  getEstonianFiscalYear,
  getEstonianTaxDeadline,
} from '../calculations.estonia';

describe('Estonian Tax Calculations', () => {
  describe('calculateEstonianVAT', () => {
    test('should calculate VAT at 20% before July 2024', () => {
      const date = new Date('2024-06-30');
      const result = calculateEstonianVAT(1000, date, 'standard');

      expect(result.rate).toBe(20);
      expect(result.vatAmount).toBe(200);
      expect(result.totalAmount).toBe(1200);
    });

    test('should calculate VAT at 22% from July 2024', () => {
      const date = new Date('2024-07-01');
      const result = calculateEstonianVAT(1000, date, 'standard');

      expect(result.rate).toBe(22);
      expect(result.vatAmount).toBe(220);
      expect(result.totalAmount).toBe(1220);
    });

    test('should calculate reduced rate VAT at 9%', () => {
      const result = calculateEstonianVAT(1000, new Date(), 'reduced');

      expect(result.rate).toBe(9);
      expect(result.vatAmount).toBe(90);
      expect(result.totalAmount).toBe(1090);
    });

    test('should calculate zero-rated VAT', () => {
      const result = calculateEstonianVAT(1000, new Date(), 'zero');

      expect(result.rate).toBe(0);
      expect(result.vatAmount).toBe(0);
      expect(result.totalAmount).toBe(1000);
    });

    test('should round to 2 decimal places', () => {
      const result = calculateEstonianVAT(100.33, new Date('2024-07-01'), 'standard');

      expect(result.vatAmount).toBe(22.07);
      expect(result.totalAmount).toBe(122.40);
    });
  });

  describe('calculateEstonianCIT', () => {
    test('should calculate regular dividend tax at 20/80', () => {
      const result = calculateEstonianCIT(100, true);

      expect(result.grossDistribution).toBe(100);
      expect(result.taxAmount).toBeCloseTo(16.67, 2);
      expect(result.netDistribution).toBeCloseTo(83.33, 2);
      expect(result.effectiveRate).toBe(25); // 20/80 = 25%
    });

    test('should calculate non-regular dividend tax at 14/86', () => {
      const result = calculateEstonianCIT(100, false);

      expect(result.grossDistribution).toBe(100);
      expect(result.taxAmount).toBeCloseTo(12.28, 2);
      expect(result.netDistribution).toBeCloseTo(87.72, 2);
      expect(result.effectiveRate).toBeCloseTo(16.28, 2); // 14/86 ≈ 16.28%
    });

    test('should handle zero on retained profits', () => {
      // Estonia's unique feature: no tax on retained profits
      const result = calculateEstonianCIT(0, true);

      expect(result.taxAmount).toBe(0);
      expect(result.netDistribution).toBe(0);
    });

    test('should handle large distributions', () => {
      const result = calculateEstonianCIT(100000, true);

      expect(result.taxAmount).toBeCloseTo(16666.67, 2);
      expect(result.netDistribution).toBeCloseTo(83333.33, 2);
    });
  });

  describe('calculateEstonianPIT', () => {
    test('should calculate PIT with full basic allowance', () => {
      const result = calculateEstonianPIT(1500);

      expect(result.allowance).toBe(654);
      expect(result.taxableIncome).toBe(846); // 1500 - 654
      expect(result.taxAmount).toBeCloseTo(169.20, 2); // 846 * 0.20
    });

    test('should reduce allowance for high earners', () => {
      const result = calculateEstonianPIT(3000);

      // Allowance reduces: 654 - (3000 - 2160) = 654 - 840 = 0
      expect(result.allowance).toBe(0);
      expect(result.taxableIncome).toBe(3000);
      expect(result.taxAmount).toBe(600); // 3000 * 0.20
    });

    test('should handle salary below allowance', () => {
      const result = calculateEstonianPIT(500);

      expect(result.allowance).toBe(654);
      expect(result.taxableIncome).toBe(0); // Max(0, 500 - 654)
      expect(result.taxAmount).toBe(0);
    });

    test('should calculate net salary correctly', () => {
      const result = calculateEstonianPIT(2000);

      expect(result.netSalary).toBe(2000 - result.taxAmount);
    });
  });

  describe('calculateEstonianSocialTax', () => {
    test('should calculate social tax at 33%', () => {
      const result = calculateEstonianSocialTax(1000);

      expect(result.socialTax).toBe(330); // 1000 * 0.33
      expect(result.healthInsurance).toBe(130); // 1000 * 0.13
      expect(result.pension).toBe(200); // 1000 * 0.20
    });

    test('should use minimum base for low salaries', () => {
      const result = calculateEstonianSocialTax(500);

      // Should use €654 minimum base
      expect(result.socialTax).toBeCloseTo(215.82, 2); // 654 * 0.33
    });

    test('should have no maximum cap', () => {
      const result = calculateEstonianSocialTax(10000);

      expect(result.socialTax).toBe(3300); // 10000 * 0.33
    });

    test('should split correctly between health and pension', () => {
      const result = calculateEstonianSocialTax(1000);

      expect(result.healthInsurance + result.pension).toBe(result.socialTax);
    });
  });

  describe('calculateEstonianUnemploymentInsurance', () => {
    test('should calculate employee contribution at 1.6%', () => {
      const result = calculateEstonianUnemploymentInsurance(1000);

      expect(result.employee).toBe(16); // 1000 * 0.016
    });

    test('should calculate employer contribution at 0.8%', () => {
      const result = calculateEstonianUnemploymentInsurance(1000);

      expect(result.employer).toBe(8); // 1000 * 0.008
    });

    test('should calculate total correctly', () => {
      const result = calculateEstonianUnemploymentInsurance(1000);

      expect(result.total).toBe(24); // 16 + 8
    });
  });

  describe('calculateEstonianMandatoryPension', () => {
    test('should calculate employee contribution at 2%', () => {
      const result = calculateEstonianMandatoryPension(1000);

      expect(result.employee).toBe(20); // 1000 * 0.02
    });

    test('should calculate state contribution at 4%', () => {
      const result = calculateEstonianMandatoryPension(1000);

      expect(result.state).toBe(40); // 1000 * 0.04
    });

    test('should calculate total correctly', () => {
      const result = calculateEstonianMandatoryPension(1000);

      expect(result.total).toBe(60); // 20 + 40
    });
  });

  describe('calculateEstonianEmploymentCosts', () => {
    test('should calculate complete employment costs', () => {
      const result = calculateEstonianEmploymentCosts(2000);

      expect(result.grossSalary).toBe(2000);
      expect(result.employerCosts.total).toBeGreaterThan(0);
      expect(result.employeeDeductions.total).toBeGreaterThan(0);
      expect(result.netSalary).toBeLessThan(result.grossSalary);
      expect(result.totalCost).toBeGreaterThan(result.grossSalary);
    });

    test('should include all employer costs', () => {
      const result = calculateEstonianEmploymentCosts(2000);

      expect(result.employerCosts.socialTax).toBeCloseTo(660, 2); // 2000 * 0.33
      expect(result.employerCosts.unemploymentInsurance).toBeCloseTo(16, 2); // 2000 * 0.008
    });

    test('should include all employee deductions', () => {
      const result = calculateEstonianEmploymentCosts(2000);

      expect(result.employeeDeductions.incomeTax).toBeGreaterThan(0);
      expect(result.employeeDeductions.unemploymentInsurance).toBeCloseTo(32, 2); // 2000 * 0.016
      expect(result.employeeDeductions.mandatoryPension).toBeCloseTo(40, 2); // 2000 * 0.02
    });

    test('should calculate realistic cost ratio', () => {
      const result = calculateEstonianEmploymentCosts(2000);

      // Total cost should be ~135-165% of net salary (including all employer costs)
      expect(result.costRatio).toBeGreaterThan(1.3);
      expect(result.costRatio).toBeLessThan(1.7);
    });

    test('should balance costs correctly', () => {
      const result = calculateEstonianEmploymentCosts(2000);

      const expectedTotal = result.grossSalary + result.employerCosts.total;
      expect(result.totalCost).toBeCloseTo(expectedTotal, 2);

      const expectedNet = result.grossSalary - result.employeeDeductions.total;
      expect(result.netSalary).toBeCloseTo(expectedNet, 2);
    });
  });

  describe('calculateEstonianLandTax', () => {
    test('should calculate land tax at default 1% rate', () => {
      const result = calculateEstonianLandTax(100000);

      expect(result).toBe(1000); // 100000 * 0.01
    });

    test('should calculate land tax at custom rate', () => {
      const result = calculateEstonianLandTax(100000, 2);

      expect(result).toBe(2000); // 100000 * 0.02
    });

    test('should accept rates between 0.1% and 2.5%', () => {
      expect(calculateEstonianLandTax(100000, 0.1)).toBe(100);
      expect(calculateEstonianLandTax(100000, 2.5)).toBe(2500);
    });

    test('should reject rates outside valid range', () => {
      expect(() => calculateEstonianLandTax(100000, 0.05)).toThrow();
      expect(() => calculateEstonianLandTax(100000, 3)).toThrow();
    });
  });

  describe('calculateEstonianEResidencyCosts', () => {
    test('should calculate zero tax on retained profits', () => {
      const result = calculateEstonianEResidencyCosts(100000, 60000, 0);

      expect(result.profit).toBe(40000); // 100000 - 60000
      expect(result.retainedProfit).toBe(40000); // No distribution
      expect(result.corporateTax).toBe(0); // No tax on retained profits!
      expect(result.netDividend).toBe(0);
      expect(result.effectiveTaxRate).toBe(0);
    });

    test('should calculate tax only on distributed profits', () => {
      const result = calculateEstonianEResidencyCosts(100000, 60000, 20000);

      expect(result.profit).toBe(40000);
      expect(result.retainedProfit).toBe(20000); // 40000 - 20000 distributed
      expect(result.corporateTax).toBeCloseTo(3333.33, 2); // 20/80 of 20000
      expect(result.netDividend).toBeCloseTo(16666.67, 2);
      expect(result.effectiveTaxRate).toBeCloseTo(8.33, 2); // 3333.33 / 40000
    });

    test('should show advantage of Estonian system', () => {
      // Scenario: €100k revenue, €60k expenses, €40k profit
      const fullDistribution = calculateEstonianEResidencyCosts(100000, 60000, 40000);
      const partialDistribution = calculateEstonianEResidencyCosts(100000, 60000, 20000);

      // Partial distribution has lower effective tax rate
      expect(partialDistribution.effectiveTaxRate).toBeLessThan(fullDistribution.effectiveTaxRate);
    });
  });

  describe('formatEstonianCurrency', () => {
    test('should format in Estonian locale', () => {
      const formatted = formatEstonianCurrency(1234.56, 'et-EE');

      expect(formatted).toContain('1'); // Should contain the number
      expect(formatted).toContain('€'); // Should contain euro symbol
    });

    test('should format in US locale', () => {
      const formatted = formatEstonianCurrency(1234.56, 'en-US');

      expect(formatted).toContain('1,234.56');
      expect(formatted).toContain('€');
    });

    test('should handle negative amounts', () => {
      const formatted = formatEstonianCurrency(-100, 'en-US');

      expect(formatted).toContain('-');
      expect(formatted).toContain('100');
    });
  });

  describe('getEstonianFiscalYear', () => {
    test('should return calendar year dates', () => {
      const result = getEstonianFiscalYear(2024);

      expect(result.start).toEqual(new Date(2024, 0, 1)); // Jan 1
      expect(result.end).toEqual(new Date(2024, 11, 31)); // Dec 31
    });

    test('should return 4 quarters', () => {
      const result = getEstonianFiscalYear(2024);

      expect(result.quarters.length).toBe(4);
      expect(result.quarters[0].quarter).toBe(1);
      expect(result.quarters[3].quarter).toBe(4);
    });

    test('should have correct quarter dates', () => {
      const result = getEstonianFiscalYear(2024);

      // Q1: Jan-Mar
      expect(result.quarters[0].start).toEqual(new Date(2024, 0, 1));
      expect(result.quarters[0].end).toEqual(new Date(2024, 2, 31));

      // Q4: Oct-Dec
      expect(result.quarters[3].start).toEqual(new Date(2024, 9, 1));
      expect(result.quarters[3].end).toEqual(new Date(2024, 11, 31));
    });
  });

  describe('getEstonianTaxDeadline', () => {
    test('should return VAT deadline on 20th of next month', () => {
      const period = new Date(2024, 5, 15); // June 15
      const deadline = getEstonianTaxDeadline('VAT', period);

      expect(deadline).toEqual(new Date(2024, 6, 20)); // July 20
    });

    test('should return Social Tax deadline on 10th of next month', () => {
      const period = new Date(2024, 5, 15); // June 15
      const deadline = getEstonianTaxDeadline('SOCIAL', period);

      expect(deadline).toEqual(new Date(2024, 6, 10)); // July 10
    });

    test('should return PIT monthly deadline on 10th of next month', () => {
      const period = new Date(2024, 5, 15); // June 15
      const deadline = getEstonianTaxDeadline('PIT_MONTHLY', period);

      expect(deadline).toEqual(new Date(2024, 6, 10)); // July 10
    });

    test('should return PIT annual deadline on June 30 of next year', () => {
      const period = new Date(2024, 5, 15); // June 2024
      const deadline = getEstonianTaxDeadline('PIT_ANNUAL', period);

      expect(deadline).toEqual(new Date(2025, 5, 30)); // June 30, 2025
    });

    test('should handle year transitions correctly', () => {
      const period = new Date(2024, 11, 15); // December 2024
      const vatDeadline = getEstonianTaxDeadline('VAT', period);

      expect(vatDeadline).toEqual(new Date(2025, 0, 20)); // January 20, 2025
    });
  });

  describe('Real-World Scenarios', () => {
    test('should calculate typical employee costs', () => {
      // Typical Estonian salary: €1,500/month
      const result = calculateEstonianEmploymentCosts(1500);

      expect(result.grossSalary).toBe(1500);
      expect(result.netSalary).toBeGreaterThan(1000);
      expect(result.netSalary).toBeLessThan(1500);
      expect(result.totalCost).toBeGreaterThan(1500);
      expect(result.totalCost).toBeLessThan(2500);
    });

    test('should calculate e-Residency company scenario', () => {
      // Typical e-Residency freelancer:
      // Revenue: €50k, Expenses: €10k, Distribute: €10k, Retain: €30k
      const result = calculateEstonianEResidencyCosts(50000, 10000, 10000);

      expect(result.profit).toBe(40000);
      expect(result.retainedProfit).toBe(30000); // Tax-free reinvestment!
      expect(result.corporateTax).toBeCloseTo(1666.67, 2); // Only on €10k distribution
      expect(result.effectiveTaxRate).toBeCloseTo(4.17, 2); // Very low!
    });

    test('should show VAT rate change impact', () => {
      const amount = 10000;
      const before = calculateEstonianVAT(amount, new Date('2024-06-30'), 'standard');
      const after = calculateEstonianVAT(amount, new Date('2024-07-01'), 'standard');

      expect(after.vatAmount - before.vatAmount).toBe(200); // €200 increase
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero amounts', () => {
      expect(calculateEstonianVAT(0, new Date(), 'standard').vatAmount).toBe(0);
      expect(calculateEstonianCIT(0).taxAmount).toBe(0);
      expect(calculateEstonianPIT(0).taxAmount).toBe(0);
    });

    test('should handle very large amounts', () => {
      const large = 1000000;
      const vat = calculateEstonianVAT(large, new Date('2024-07-01'));

      expect(vat.vatAmount).toBe(220000);
      expect(vat.totalAmount).toBe(1220000);
    });

    test('should handle decimal precision', () => {
      const result = calculateEstonianVAT(100.33, new Date('2024-07-01'));

      expect(result.vatAmount).toBe(22.07);
      expect(result.totalAmount).toBe(122.40);
    });

    test('should handle minimum wage scenarios', () => {
      // Estonian minimum wage 2024: €820/month
      const result = calculateEstonianEmploymentCosts(820);

      expect(result.netSalary).toBeGreaterThan(0);
      expect(result.totalCost).toBeGreaterThan(820);
    });
  });
});
