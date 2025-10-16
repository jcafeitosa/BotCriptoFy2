/**
 * ExpenseService Tests
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { ExpenseService } from '../expense.service';
import type { NewExpense } from '../../types/financial.types';

// Mock data
const mockTenantId = 'tenant-123';
const mockUserId = 'user-456';
const mockApproverId = 'approver-789';

const mockExpenseData: NewExpense = {
  tenantId: mockTenantId,
  expenseNumber: 'EXP-2025-001',
  categoryId: 'category-office',
  vendorId: 'vendor-123',
  expenseDate: new Date('2025-01-15'),
  amount: '500.00',
  currency: 'BRL',
  description: 'Office supplies',
  status: 'draft',
  paymentMethod: null,
  receiptUrl: null,
  notes: null,
  metadata: null,
  createdBy: mockUserId,
};

const mockExpense = {
  id: 'expense-001',
  ...mockExpenseData,
  approvedBy: null,
  approvedAt: null,
  rejectedBy: null,
  rejectedAt: null,
  rejectionReason: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ExpenseService', () => {
  let service: ExpenseService;

  beforeEach(() => {
    service = new ExpenseService();
  });

  describe('create', () => {
    test('should create expense successfully', async () => {
      const result = await service.create(mockExpenseData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.expenseNumber).toBe('EXP-2025-001');
        expect(result.data.amount).toBe('500.00');
        expect(result.data.status).toBe('draft');
        expect(result.data.tenantId).toBe(mockTenantId);
      }
    });

    test('should validate required fields', async () => {
      const invalidData = { ...mockExpenseData };
      delete (invalidData as any).expenseNumber;

      const result = await service.create(invalidData as NewExpense);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Expense number is required');
      }
    });

    test('should validate amount is positive', async () => {
      const invalidData = {
        ...mockExpenseData,
        amount: '-100.00',
      };

      const result = await service.create(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Amount must be positive');
      }
    });

    test('should validate category exists', async () => {
      const invalidData = {
        ...mockExpenseData,
        categoryId: 'non-existent-category',
      };

      const result = await service.create(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Category not found');
      }
    });
  });

  describe('getById', () => {
    test('should get expense by id', async () => {
      const result = await service.getById(mockExpense.id, mockTenantId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(mockExpense.id);
        expect(result.data.tenantId).toBe(mockTenantId);
      }
    });

    test('should return error for non-existent expense', async () => {
      const result = await service.getById('non-existent', mockTenantId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Expense not found');
      }
    });
  });

  describe('list', () => {
    test('should list expenses with default pagination', async () => {
      const result = await service.list(mockTenantId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);
      }
    });

    test('should filter by category', async () => {
      const result = await service.list(mockTenantId, {
        categoryId: 'category-office',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        result.data.forEach((expense) => {
          expect(expense.categoryId).toBe('category-office');
        });
      }
    });

    test('should filter by status', async () => {
      const result = await service.list(mockTenantId, { status: 'approved' });

      expect(result.success).toBe(true);
      if (result.success) {
        result.data.forEach((expense) => {
          expect(expense.status).toBe('approved');
        });
      }
    });

    test('should filter by date range', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-12-31');

      const result = await service.list(mockTenantId, { startDate, endDate });

      expect(result.success).toBe(true);
      if (result.success) {
        result.data.forEach((expense) => {
          expect(expense.expenseDate >= startDate).toBe(true);
          expect(expense.expenseDate <= endDate).toBe(true);
        });
      }
    });
  });

  describe('update', () => {
    test('should update draft expense', async () => {
      const updateData = {
        notes: 'Updated notes',
        receiptUrl: 'https://example.com/receipt.pdf',
      };

      const result = await service.update(
        mockExpense.id,
        mockTenantId,
        updateData,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notes).toBe('Updated notes');
        expect(result.data.receiptUrl).toBe('https://example.com/receipt.pdf');
      }
    });

    test('should not update approved expense', async () => {
      const result = await service.update('approved-expense-id', mockTenantId, {
        notes: 'New notes',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Cannot update approved expense');
      }
    });
  });

  describe('delete', () => {
    test('should delete draft expense', async () => {
      const result = await service.delete('draft-expense-id', mockTenantId);

      expect(result.success).toBe(true);
    });

    test('should not delete approved expense', async () => {
      const result = await service.delete('approved-expense-id', mockTenantId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Cannot delete approved expense');
      }
    });
  });

  describe('approve', () => {
    test('should approve pending expense', async () => {
      const result = await service.approve(
        mockExpense.id,
        mockTenantId,
        mockApproverId,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('approved');
        expect(result.data.approvedBy).toBe(mockApproverId);
        expect(result.data.approvedAt).toBeInstanceOf(Date);
      }
    });

    test('should not approve already approved expense', async () => {
      const result = await service.approve(
        'approved-expense-id',
        mockTenantId,
        mockApproverId,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Expense already approved');
      }
    });

    test('should not approve rejected expense', async () => {
      const result = await service.approve(
        'rejected-expense-id',
        mockTenantId,
        mockApproverId,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Cannot approve rejected expense');
      }
    });

    test('should validate approver permissions', async () => {
      const result = await service.approve(
        mockExpense.id,
        mockTenantId,
        'non-approver',
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('User does not have approval permission');
      }
    });
  });

  describe('reject', () => {
    test('should reject pending expense with reason', async () => {
      const result = await service.reject(
        mockExpense.id,
        mockTenantId,
        mockApproverId,
        'Missing receipt',
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('rejected');
        expect(result.data.rejectedBy).toBe(mockApproverId);
        expect(result.data.rejectedAt).toBeInstanceOf(Date);
        expect(result.data.rejectionReason).toBe('Missing receipt');
      }
    });

    test('should require rejection reason', async () => {
      const result = await service.reject(
        mockExpense.id,
        mockTenantId,
        mockApproverId,
        '',
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Rejection reason is required');
      }
    });

    test('should not reject already approved expense', async () => {
      const result = await service.reject(
        'approved-expense-id',
        mockTenantId,
        mockApproverId,
        'Reason',
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Cannot reject approved expense');
      }
    });
  });

  describe('getPendingApprovals', () => {
    test('should get pending approval expenses', async () => {
      const result = await service.getPendingApprovals(mockTenantId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);
        result.data.forEach((expense) => {
          expect(expense.status).toBe('pending_approval');
          expect(expense.tenantId).toBe(mockTenantId);
        });
      }
    });

    test('should return empty array when no pending approvals', async () => {
      const result = await service.getPendingApprovals('tenant-no-pending');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });
  });

  describe('getByCategory', () => {
    test('should get expenses by category', async () => {
      const result = await service.getByCategory(
        mockTenantId,
        'category-office',
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);
        result.data.forEach((expense) => {
          expect(expense.categoryId).toBe('category-office');
        });
      }
    });

    test('should filter by fiscal period', async () => {
      const result = await service.getByCategory(
        mockTenantId,
        'category-office',
        '2025-01',
      );

      expect(result.success).toBe(true);
      if (result.success) {
        result.data.forEach((expense) => {
          const expenseMonth = expense.expenseDate
            .toISOString()
            .substring(0, 7);
          expect(expenseMonth).toBe('2025-01');
        });
      }
    });
  });

  describe('getCategorySummary', () => {
    test('should get category summary', async () => {
      const result = await service.getCategorySummary(mockTenantId, '2025-01');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);
        result.data.forEach((summary) => {
          expect(summary).toHaveProperty('categoryId');
          expect(summary).toHaveProperty('categoryName');
          expect(summary).toHaveProperty('totalAmount');
          expect(summary).toHaveProperty('expenseCount');
          expect(typeof summary.totalAmount).toBe('string');
          expect(typeof summary.expenseCount).toBe('number');
        });
      }
    });
  });

  describe('Business Logic', () => {
    test('should track approval workflow correctly', async () => {
      const expense = await service.create({
        ...mockExpenseData,
        status: 'pending_approval',
      });

      if (!expense.success) {
        throw new Error('Failed to create expense');
      }

      // Approve
      const approved = await service.approve(
        expense.data.id,
        mockTenantId,
        mockApproverId,
      );

      expect(approved.success).toBe(true);
      if (approved.success) {
        expect(approved.data.status).toBe('approved');
        expect(approved.data.approvedBy).toBe(mockApproverId);
        expect(approved.data.approvedAt).toBeInstanceOf(Date);
      }
    });

    test('should calculate category totals correctly', async () => {
      // Create multiple expenses
      await service.create({
        ...mockExpenseData,
        amount: '100.00',
        categoryId: 'category-1',
      });
      await service.create({
        ...mockExpenseData,
        amount: '200.00',
        categoryId: 'category-1',
      });
      await service.create({
        ...mockExpenseData,
        amount: '150.00',
        categoryId: 'category-2',
      });

      const summary = await service.getCategorySummary(
        mockTenantId,
        '2025-01',
      );

      if (summary.success) {
        const cat1 = summary.data.find((s) => s.categoryId === 'category-1');
        expect(cat1?.totalAmount).toBe('300.00');
        expect(cat1?.expenseCount).toBe(2);

        const cat2 = summary.data.find((s) => s.categoryId === 'category-2');
        expect(cat2?.totalAmount).toBe('150.00');
        expect(cat2?.expenseCount).toBe(1);
      }
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero amount expense', async () => {
      const result = await service.create({
        ...mockExpenseData,
        amount: '0.00',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Amount must be greater than 0');
      }
    });

    test('should handle very long description', async () => {
      const longDescription = 'A'.repeat(1000);
      const result = await service.create({
        ...mockExpenseData,
        description: longDescription,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe(longDescription);
      }
    });

    test('should handle multiple approvers', async () => {
      const expense = await service.create({
        ...mockExpenseData,
        status: 'pending_approval',
      });

      if (!expense.success) {
        throw new Error('Failed to create expense');
      }

      // First approver
      const approved1 = await service.approve(
        expense.data.id,
        mockTenantId,
        'approver-1',
      );

      expect(approved1.success).toBe(true);

      // Second approver tries to approve again
      const approved2 = await service.approve(
        expense.data.id,
        mockTenantId,
        'approver-2',
      );

      expect(approved2.success).toBe(false);
      if (!approved2.success) {
        expect(approved2.error).toContain('Expense already approved');
      }
    });

    test('should handle rejection after approval attempt', async () => {
      const expense = await service.create({
        ...mockExpenseData,
        status: 'pending_approval',
      });

      if (!expense.success) {
        throw new Error('Failed to create expense');
      }

      // Approve first
      await service.approve(expense.data.id, mockTenantId, mockApproverId);

      // Try to reject after approval
      const rejected = await service.reject(
        expense.data.id,
        mockTenantId,
        mockApproverId,
        'Changed mind',
      );

      expect(rejected.success).toBe(false);
      if (!rejected.success) {
        expect(rejected.error).toContain('Cannot reject approved expense');
      }
    });
  });
});
