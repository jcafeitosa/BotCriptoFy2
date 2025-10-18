/**
 * InvoiceService Tests
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { InvoiceService } from '../invoice.service';
import type { NewInvoice } from '../../types/financial.types';

// Mock data
const mockTenantId = 'tenant-123';
const mockUserId = 'user-456';

const mockInvoiceData: NewInvoice = {
  tenantId: mockTenantId,
  invoiceNumber: 'INV-2025-001',
  invoiceType: 'receivable',
  customerId: 'customer-789',
  issueDate: new Date('2025-01-15'),
  dueDate: new Date('2025-02-15'),
  currency: 'BRL',
  subtotal: '1000.00',
  taxAmount: '150.00',
  discountAmount: '0.00',
  totalAmount: '1150.00',
  status: 'draft',
  description: 'Test invoice for services',
  items: [],
  createdBy: mockUserId,
};

const mockInvoice = {
  id: 'invoice-001',
  ...mockInvoiceData,
  paidAmount: '0.00',
  balanceAmount: '1150.00',
  paymentTerms: null,
  notes: null,
  metadata: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const _mockPaymentData = {
  paymentDate: new Date('2025-01-20'),
  amount: '575.00',
  paymentMethod: 'bank_transfer' as const,
  reference: 'TRANSFER-123',
  notes: 'Partial payment',
};

const _mockPayment = {
  id: 'payment-001',
  invoiceId: mockInvoice.id,
  tenantId: mockTenantId,
  ..._mockPaymentData,
  createdBy: mockUserId,
  createdAt: new Date(),
};

describe('InvoiceService', () => {
  let service: InvoiceService;

  beforeEach(() => {
    service = new InvoiceService();
  });

  describe('create', () => {
    test('should create invoice successfully', async () => {
      const result = await service.create(mockInvoiceData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.invoiceNumber).toBe('INV-2025-001');
        expect(result.data.invoiceType).toBe('receivable');
        expect(result.data.totalAmount).toBe('1000.00');
        expect(result.data.status).toBe('draft');
        expect(result.data.tenantId).toBe(mockTenantId);
      }
    });

    test('should validate required fields', async () => {
      const invalidData = { ...mockInvoiceData };
      delete (invalidData as any).invoiceNumber;

      const result = await service.create(invalidData as NewInvoice);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invoice number is required');
      }
    });

    test('should validate invoice type', async () => {
      const invalidData = {
        ...mockInvoiceData,
        invoiceType: 'invalid' as any,
      };

      const result = await service.create(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid invoice type');
      }
    });

    test('should validate due date after issue date', async () => {
      const invalidData = {
        ...mockInvoiceData,
        issueDate: new Date('2025-02-15'),
        dueDate: new Date('2025-01-15'),
      };

      const result = await service.create(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Due date must be after issue date');
      }
    });

    test('should validate amounts are positive', async () => {
      const invalidData = {
        ...mockInvoiceData,
        totalAmount: '-100.00',
      };

      const result = await service.create(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Amount must be positive');
      }
    });
  });

  describe('getById', () => {
    test('should get invoice by id', async () => {
      const result = await service.getById(mockInvoice.id, mockTenantId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(mockInvoice.id);
        expect(result.data.tenantId).toBe(mockTenantId);
      }
    });

    test('should return error for non-existent invoice', async () => {
      const result = await service.getById('non-existent', mockTenantId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invoice not found');
      }
    });

    test('should prevent access to other tenant invoice', async () => {
      const result = await service.getById(mockInvoice.id, 'other-tenant');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invoice not found');
      }
    });
  });

  describe('list', () => {
    test('should list invoices with default pagination', async () => {
      const result = await service.list(mockTenantId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data.length).toBeGreaterThanOrEqual(0);
      }
    });

    test('should filter by invoice type', async () => {
      const result = await service.list(mockTenantId, {
        invoiceType: 'receivable',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        result.data.forEach((invoice) => {
          expect(invoice.invoiceType).toBe('receivable');
        });
      }
    });

    test('should filter by status', async () => {
      const result = await service.list(mockTenantId, { status: 'paid' });

      expect(result.success).toBe(true);
      if (result.success) {
        result.data.forEach((invoice) => {
          expect(invoice.status).toBe('paid');
        });
      }
    });

    test('should filter by customer', async () => {
      const result = await service.list(mockTenantId, {
        customerId: 'customer-789',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        result.data.forEach((invoice) => {
          expect(invoice.customerId).toBe('customer-789');
        });
      }
    });

    test('should filter by date range', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-12-31');

      const result = await service.list(mockTenantId, { startDate, endDate });

      expect(result.success).toBe(true);
      if (result.success) {
        result.data.forEach((invoice) => {
          expect(invoice.issueDate).toBeInstanceOf(Date);
          expect(invoice.issueDate >= startDate).toBe(true);
          expect(invoice.issueDate <= endDate).toBe(true);
        });
      }
    });

    test('should paginate results', async () => {
      const result = await service.list(mockTenantId, {
        limit: 10,
        offset: 0,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('update', () => {
    test('should update invoice successfully', async () => {
      const updateData = {
        notes: 'Updated notes',
        paymentTerms: 'Net 30',
      };

      const result = await service.update(
        mockInvoice.id,
        mockTenantId,
        updateData,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notes).toBe('Updated notes');
        expect(result.data.paymentTerms).toBe('Net 30');
      }
    });

    test('should not allow updating immutable fields', async () => {
      const updateData = {
        invoiceNumber: 'INV-2025-999',
        tenantId: 'other-tenant',
      };

      const result = await service.update(
        mockInvoice.id,
        mockTenantId,
        updateData,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Cannot update immutable fields');
      }
    });

    test('should not allow updating posted invoice', async () => {
      const updateData = { notes: 'New notes' };

      const result = await service.update(
        'posted-invoice-id',
        mockTenantId,
        updateData,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Cannot update posted invoice');
      }
    });
  });

  describe('delete', () => {
    test('should delete draft invoice', async () => {
      const result = await service.delete('draft-invoice-id', mockTenantId);

      expect(result.success).toBe(true);
    });

    test('should not delete posted invoice', async () => {
      const result = await service.delete('posted-invoice-id', mockTenantId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Cannot delete posted invoice');
      }
    });

    test('should not delete paid invoice', async () => {
      const result = await service.delete('paid-invoice-id', mockTenantId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Cannot delete paid invoice');
      }
    });
  });

  describe('addPayment', () => {
    test('should add payment successfully', async () => {
      const result = await service.addPayment(
        mockInvoice.id,
        mockTenantId,
        mockPaymentData,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.amount).toBe('575.00');
        expect(result.data.paymentMethod).toBe('bank_transfer');
        expect(result.data.invoiceId).toBe(mockInvoice.id);
      }
    });

    test('should validate payment amount', async () => {
      const invalidPayment = {
        ...mockPaymentData,
        amount: '-100.00',
      };

      const result = await service.addPayment(
        mockInvoice.id,
        mockTenantId,
        invalidPayment,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Payment amount must be positive');
      }
    });

    test('should not allow overpayment', async () => {
      const overpayment = {
        ...mockPaymentData,
        amount: '2000.00', // More than invoice total
      };

      const result = await service.addPayment(
        mockInvoice.id,
        mockTenantId,
        overpayment,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Payment exceeds balance');
      }
    });

    test('should update invoice status to partial on partial payment', async () => {
      const partialPayment = {
        ...mockPaymentData,
        amount: '500.00',
      };

      const result = await service.addPayment(
        mockInvoice.id,
        mockTenantId,
        partialPayment,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // Get updated invoice
        const invoiceResult = await service.getById(
          mockInvoice.id,
          mockTenantId,
        );
        if (invoiceResult.success) {
          expect(invoiceResult.data.status).toBe('partial');
        }
      }
    });

    test('should update invoice status to paid on full payment', async () => {
      const fullPayment = {
        ...mockPaymentData,
        amount: '1150.00',
      };

      const result = await service.addPayment(
        mockInvoice.id,
        mockTenantId,
        fullPayment,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // Get updated invoice
        const invoiceResult = await service.getById(
          mockInvoice.id,
          mockTenantId,
        );
        if (invoiceResult.success) {
          expect(invoiceResult.data.status).toBe('paid');
        }
      }
    });
  });

  describe('getPayments', () => {
    test('should get payments for invoice', async () => {
      const result = await service.getPayments(mockInvoice.id, mockTenantId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);
        result.data.forEach((payment) => {
          expect(payment.invoiceId).toBe(mockInvoice.id);
          expect(payment.tenantId).toBe(mockTenantId);
        });
      }
    });

    test('should return empty array for invoice without payments', async () => {
      const result = await service.getPayments(
        'invoice-no-payments',
        mockTenantId,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });
  });

  describe('updateStatus', () => {
    test('should update status to posted', async () => {
      const result = await service.updateStatus(
        mockInvoice.id,
        mockTenantId,
        'posted',
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('posted');
      }
    });

    test('should update status to void', async () => {
      const result = await service.updateStatus(
        mockInvoice.id,
        mockTenantId,
        'void',
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('void');
      }
    });

    test('should not allow invalid status transitions', async () => {
      const result = await service.updateStatus(
        'paid-invoice-id',
        mockTenantId,
        'draft',
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid status transition');
      }
    });

    test('should validate status value', async () => {
      const result = await service.updateStatus(
        mockInvoice.id,
        mockTenantId,
        'invalid-status' as any,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid status');
      }
    });
  });

  describe('getOverdue', () => {
    test('should get overdue invoices', async () => {
      const result = await service.getOverdue(mockTenantId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);
        result.data.forEach((invoice) => {
          expect(invoice.dueDate).toBeInstanceOf(Date);
          expect(invoice.dueDate < new Date()).toBe(true);
          expect(invoice.status).not.toBe('paid');
          expect(invoice.status).not.toBe('void');
        });
      }
    });

    test('should return empty array when no overdue invoices', async () => {
      const result = await service.getOverdue('tenant-no-overdue');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });
  });

  describe('Business Logic', () => {
    test('should calculate balance correctly after payment', async () => {
      const invoice = await service.create({
        ...mockInvoiceData,
        totalAmount: '1000.00',
      });

      if (!invoice.success) {
        throw new Error('Failed to create invoice');
      }

      await service.addPayment(invoice.data.id, mockTenantId, {
        ...mockPaymentData,
        amount: '300.00',
      });

      const updated = await service.getById(invoice.data.id, mockTenantId);

      if (updated.success) {
        expect(updated.data.paidAmount).toBe('300.00');
        expect(updated.data.balanceAmount).toBe('700.00');
      }
    });

    test('should handle multiple payments', async () => {
      const invoice = await service.create({
        ...mockInvoiceData,
        totalAmount: '1000.00',
      });

      if (!invoice.success) {
        throw new Error('Failed to create invoice');
      }

      await service.addPayment(invoice.data.id, mockTenantId, {
        ...mockPaymentData,
        amount: '300.00',
      });

      await service.addPayment(invoice.data.id, mockTenantId, {
        ...mockPaymentData,
        amount: '400.00',
      });

      const updated = await service.getById(invoice.data.id, mockTenantId);

      if (updated.success) {
        expect(updated.data.paidAmount).toBe('700.00');
        expect(updated.data.balanceAmount).toBe('300.00');
        expect(updated.data.status).toBe('partial');
      }
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero amount invoice', async () => {
      const result = await service.create({
        ...mockInvoiceData,
        totalAmount: '0.00',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Total amount must be greater than 0');
      }
    });

    test('should handle very large amounts', async () => {
      const result = await service.create({
        ...mockInvoiceData,
        totalAmount: '999999999999.99',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.totalAmount).toBe('999999999999.99');
      }
    });

    test('should handle concurrent payments', async () => {
      const invoice = await service.create({
        ...mockInvoiceData,
        totalAmount: '1000.00',
      });

      if (!invoice.success) {
        throw new Error('Failed to create invoice');
      }

      // Simulate concurrent payments
      const payment1 = service.addPayment(invoice.data.id, mockTenantId, {
        ...mockPaymentData,
        amount: '600.00',
      });

      const payment2 = service.addPayment(invoice.data.id, mockTenantId, {
        ...mockPaymentData,
        amount: '600.00',
      });

      const results = await Promise.all([payment1, payment2]);

      // One should succeed, one should fail (would exceed balance)
      const successes = results.filter((r) => r.success);
      const failures = results.filter((r) => !r.success);

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);
    });
  });
});
