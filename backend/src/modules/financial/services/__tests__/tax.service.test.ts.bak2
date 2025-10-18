/**
 * TaxService Tests
 * Tests for Brazilian tax system calculations and compliance
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { TaxService } from '../tax.service';
import type { NewTaxFiling } from '../../types/financial.types';

// Mock data
const mockTenantId = 'tenant-123';
const mockUserId = 'user-456';

const mockFilingData: NewTaxFiling = {
  tenantId: mockTenantId,
  taxType: 'ICMS',
  fiscalPeriod: '2025-01',
  dueDate: new Date('2025-02-20'),
  taxableAmount: '100000.00',
  taxAmount: '18000.00',
  status: 'pending',
  filingNumber: null,
  filedAt: null,
  confirmationNumber: null,
  createdBy: mockUserId,
};

describe('TaxService', () => {
  let service: TaxService;

  beforeEach(() => {
    service = new TaxService();
  });

  describe('calculateTax', () => {
    test('should calculate ICMS correctly', async () => {
      const result = await service.calculateTax(
        mockTenantId,
        'ICMS',
        '100000.00',
        'SP', // São Paulo
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.taxType).toBe('ICMS');
        expect(result.data.rate).toBe('18.00'); // SP ICMS rate
        expect(result.data.taxAmount).toBe('18000.00');
      }
    });

    test('should calculate ISS correctly', async () => {
      const result = await service.calculateTax(
        mockTenantId,
        'ISS',
        '50000.00',
        undefined,
        'SP-SAO_PAULO',
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.taxType).toBe('ISS');
        // ISS varies by city, typically 2-5%
        expect(parseFloat(result.data.rate)).toBeGreaterThan(0);
        expect(parseFloat(result.data.taxAmount)).toBeGreaterThan(0);
      }
    });

    test('should calculate PIS correctly', async () => {
      const result = await service.calculateTax(
        mockTenantId,
        'PIS',
        '100000.00',
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.taxType).toBe('PIS');
        expect(result.data.rate).toBe('1.65'); // Standard PIS rate
        expect(result.data.taxAmount).toBe('1650.00');
      }
    });

    test('should calculate COFINS correctly', async () => {
      const result = await service.calculateTax(
        mockTenantId,
        'COFINS',
        '100000.00',
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.taxType).toBe('COFINS');
        expect(result.data.rate).toBe('7.60'); // Standard COFINS rate
        expect(result.data.taxAmount).toBe('7600.00');
      }
    });

    test('should calculate IRPJ correctly', async () => {
      const result = await service.calculateTax(
        mockTenantId,
        'IRPJ',
        '100000.00',
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.taxType).toBe('IRPJ');
        expect(result.data.rate).toBe('15.00'); // Standard IRPJ rate
        expect(result.data.taxAmount).toBe('15000.00');
      }
    });

    test('should calculate CSLL correctly', async () => {
      const result = await service.calculateTax(
        mockTenantId,
        'CSLL',
        '100000.00',
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.taxType).toBe('CSLL');
        expect(result.data.rate).toBe('9.00'); // Standard CSLL rate
        expect(result.data.taxAmount).toBe('9000.00');
      }
    });

    test('should handle different state ICMS rates', async () => {
      const states = ['SP', 'RJ', 'MG', 'RS'];
      const results = await Promise.all(
        states.map((state) =>
          service.calculateTax(mockTenantId, 'ICMS', '100000.00', state),
        ),
      );

      results.forEach((result) => {
        expect(result.success).toBe(true);
        if (result.success) {
          expect(parseFloat(result.data.rate)).toBeGreaterThan(0);
          expect(parseFloat(result.data.rate)).toBeLessThanOrEqual(20);
        }
      });
    });

    test('should validate taxable amount is positive', async () => {
      const result = await service.calculateTax(
        mockTenantId,
        'ICMS',
        '-1000.00',
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Taxable amount must be positive');
      }
    });

    test('should require state code for ICMS', async () => {
      const result = await service.calculateTax(
        mockTenantId,
        'ICMS',
        '100000.00',
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('State code required for ICMS');
      }
    });

    test('should require city code for ISS', async () => {
      const result = await service.calculateTax(
        mockTenantId,
        'ISS',
        '100000.00',
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('City code required for ISS');
      }
    });
  });

  describe('createFiling', () => {
    test('should create tax filing', async () => {
      const result = await service.createFiling(mockFilingData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.taxType).toBe('ICMS');
        expect(result.data.status).toBe('pending');
        expect(result.data.fiscalPeriod).toBe('2025-01');
      }
    });

    test('should validate tax amount matches calculation', async () => {
      const invalidData = {
        ...mockFilingData,
        taxableAmount: '100000.00',
        taxAmount: '5000.00', // Doesn't match ICMS 18%
      };

      const result = await service.createFiling(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Tax amount does not match calculation');
      }
    });

    test('should validate due date is in future', async () => {
      const invalidData = {
        ...mockFilingData,
        dueDate: new Date('2020-01-01'),
      };

      const result = await service.createFiling(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Due date must be in the future');
      }
    });
  });

  describe('getById', () => {
    test('should get filing by id', async () => {
      const created = await service.createFiling(mockFilingData);

      if (!created.success) {
        throw new Error('Failed to create filing');
      }

      const result = await service.getById(created.data.id, mockTenantId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(created.data.id);
      }
    });
  });

  describe('list', () => {
    test('should list filings', async () => {
      const result = await service.list(mockTenantId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);
      }
    });

    test('should filter by tax type', async () => {
      const result = await service.list(mockTenantId, { taxType: 'ICMS' });

      expect(result.success).toBe(true);
      if (result.success) {
        result.data.forEach((filing) => {
          expect(filing.taxType).toBe('ICMS');
        });
      }
    });

    test('should filter by fiscal period', async () => {
      const result = await service.list(mockTenantId, {
        fiscalPeriod: '2025-01',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        result.data.forEach((filing) => {
          expect(filing.fiscalPeriod).toBe('2025-01');
        });
      }
    });

    test('should filter by status', async () => {
      const result = await service.list(mockTenantId, { status: 'filed' });

      expect(result.success).toBe(true);
      if (result.success) {
        result.data.forEach((filing) => {
          expect(filing.status).toBe('filed');
        });
      }
    });
  });

  describe('file', () => {
    test('should file pending tax return', async () => {
      const created = await service.createFiling(mockFilingData);

      if (!created.success) {
        throw new Error('Failed to create filing');
      }

      const result = await service.file(
        created.data.id,
        mockTenantId,
        'FILING-2025-001',
        'CONF-123456',
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('filed');
        expect(result.data.filingNumber).toBe('FILING-2025-001');
        expect(result.data.confirmationNumber).toBe('CONF-123456');
        expect(result.data.filedAt).toBeInstanceOf(Date);
      }
    });

    test('should not file already filed return', async () => {
      const result = await service.file(
        'filed-filing-id',
        mockTenantId,
        'FILING-001',
        'CONF-001',
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Filing already submitted');
      }
    });

    test('should validate filing number', async () => {
      const created = await service.createFiling(mockFilingData);

      if (!created.success) {
        throw new Error('Failed to create filing');
      }

      const result = await service.file(created.data.id, mockTenantId, '', 'CONF-001');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Filing number is required');
      }
    });
  });

  describe('getUpcomingFilings', () => {
    test('should get upcoming filings within 30 days', async () => {
      const result = await service.getUpcomingFilings(mockTenantId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);

        const today = new Date();
        const maxDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

        result.data.forEach((filing) => {
          expect(filing.status).toBe('pending');
          expect(filing.dueDate >= today).toBe(true);
          expect(filing.dueDate <= maxDate).toBe(true);
        });
      }
    });

    test('should get upcoming filings within custom days', async () => {
      const result = await service.getUpcomingFilings(mockTenantId, 7);

      expect(result.success).toBe(true);
      if (result.success) {
        const today = new Date();
        const maxDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        result.data.forEach((filing) => {
          expect(filing.dueDate <= maxDate).toBe(true);
        });
      }
    });
  });

  describe('getTaxSummary', () => {
    test('should get tax summary for fiscal period', async () => {
      const result = await service.getTaxSummary(mockTenantId, '2025-01');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);

        result.data.forEach((summary) => {
          expect(summary).toHaveProperty('taxType');
          expect(summary).toHaveProperty('totalTaxable');
          expect(summary).toHaveProperty('totalTax');
          expect(summary).toHaveProperty('filingCount');
        });
      }
    });

    test('should calculate totals correctly', async () => {
      // Create multiple filings
      await service.createFiling(mockFilingData);
      await service.createFiling({
        ...mockFilingData,
        taxableAmount: '50000.00',
        taxAmount: '9000.00',
      });

      const summary = await service.getTaxSummary(mockTenantId, '2025-01');

      if (summary.success) {
        const icmsSummary = summary.data.find((s) => s.taxType === 'ICMS');

        if (icmsSummary) {
          expect(parseFloat(icmsSummary.totalTaxable)).toBeGreaterThan(0);
          expect(parseFloat(icmsSummary.totalTax)).toBeGreaterThan(0);
          expect(icmsSummary.filingCount).toBeGreaterThanOrEqual(2);
        }
      }
    });
  });

  describe('Business Logic - Brazilian Tax System', () => {
    test('should calculate all federal taxes for a transaction', async () => {
      const taxableAmount = '100000.00';

      const pis = await service.calculateTax(mockTenantId, 'PIS', taxableAmount);
      const cofins = await service.calculateTax(mockTenantId, 'COFINS', taxableAmount);
      const irpj = await service.calculateTax(mockTenantId, 'IRPJ', taxableAmount);
      const csll = await service.calculateTax(mockTenantId, 'CSLL', taxableAmount);

      expect(pis.success).toBe(true);
      expect(cofins.success).toBe(true);
      expect(irpj.success).toBe(true);
      expect(csll.success).toBe(true);

      if (pis.success && cofins.success && irpj.success && csll.success) {
        const totalTax =
          parseFloat(pis.data.taxAmount) +
          parseFloat(cofins.data.taxAmount) +
          parseFloat(irpj.data.taxAmount) +
          parseFloat(csll.data.taxAmount);

        // Total federal tax burden should be 33.25% (1.65 + 7.6 + 15 + 9)
        expect(totalTax).toBeCloseTo(33250, 0);
      }
    });

    test('should handle Simples Nacional regime', async () => {
      // Simples Nacional has simplified tax calculation
      const result = await service.calculateTax(
        mockTenantId,
        'SIMPLES',
        '100000.00',
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // Simples Nacional rate varies by revenue bracket (6-33%)
        expect(parseFloat(result.data.rate)).toBeGreaterThanOrEqual(6);
        expect(parseFloat(result.data.rate)).toBeLessThanOrEqual(33);
      }
    });

    test('should track SPED obligations', async () => {
      const result = await service.list(mockTenantId, {
        taxType: 'SPED',
        fiscalPeriod: '2025-01',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        result.data.forEach((filing) => {
          expect(filing.taxType).toBe('SPED');
        });
      }
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero taxable amount', async () => {
      const result = await service.calculateTax(
        mockTenantId,
        'ICMS',
        '0.00',
        'SP',
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Taxable amount must be greater than 0');
      }
    });

    test('should handle very large amounts', async () => {
      const result = await service.calculateTax(
        mockTenantId,
        'ICMS',
        '999999999999.99',
        'SP',
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(parseFloat(result.data.taxAmount)).toBeGreaterThan(0);
      }
    });

    test('should handle invalid state code', async () => {
      const result = await service.calculateTax(
        mockTenantId,
        'ICMS',
        '100000.00',
        'INVALID',
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid state code');
      }
    });

    test('should handle multiple filings in same period', async () => {
      await service.createFiling(mockFilingData);

      const duplicate = await service.createFiling(mockFilingData);

      expect(duplicate.success).toBe(false);
      if (!duplicate.success) {
        expect(duplicate.error).toContain('Filing already exists for this period');
      }
    });

    test('should calculate taxes with decimal precision', async () => {
      const result = await service.calculateTax(
        mockTenantId,
        'ICMS',
        '123.45',
        'SP',
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // 123.45 * 0.18 = 22.221
        expect(result.data.taxAmount).toBe('22.22');
      }
    });
  });
});
