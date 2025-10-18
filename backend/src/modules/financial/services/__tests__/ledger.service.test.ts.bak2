/**
 * LedgerService Tests
 * Tests for double-entry bookkeeping system
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { LedgerService } from '../ledger.service';
import type { NewLedgerEntry, NewLedgerEntryLine } from '../../types/financial.types';

// Mock data
const mockTenantId = 'tenant-123';
const mockUserId = 'user-456';

const mockAccountDebit = {
  id: 'account-cash',
  accountNumber: '1010',
  accountName: 'Cash',
  accountType: 'asset' as const,
  tenantId: mockTenantId,
};

const mockAccountCredit = {
  id: 'account-revenue',
  accountNumber: '4010',
  accountName: 'Revenue',
  accountType: 'revenue' as const,
  tenantId: mockTenantId,
};

const mockEntryData: NewLedgerEntry = {
  tenantId: mockTenantId,
  entryNumber: 'JE-2025-001',
  entryDate: new Date('2025-01-15'),
  fiscalPeriod: '2025-01',
  description: 'Record revenue',
  status: 'draft',
  sourceModule: null,
  sourceId: null,
  createdBy: mockUserId,
};

const mockLines: NewLedgerEntryLine[] = [
  {
    accountId: mockAccountDebit.id,
    entryType: 'debit',
    amount: '1000.00',
    description: 'Cash received',
  },
  {
    accountId: mockAccountCredit.id,
    entryType: 'credit',
    amount: '1000.00',
    description: 'Revenue earned',
  },
];

describe('LedgerService', () => {
  let service: LedgerService;

  beforeEach(() => {
    service = new LedgerService();
  });

  describe('createEntry', () => {
    test('should create balanced ledger entry', async () => {
      const result = await service.createEntry(mockEntryData, mockLines);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.entryNumber).toBe('JE-2025-001');
        expect(result.data.status).toBe('draft');
        expect(result.data.tenantId).toBe(mockTenantId);
      }
    });

    test('should reject unbalanced entry', async () => {
      const unbalancedLines: NewLedgerEntryLine[] = [
        {
          accountId: mockAccountDebit.id,
          entryType: 'debit',
          amount: '1000.00',
          description: 'Debit',
        },
        {
          accountId: mockAccountCredit.id,
          entryType: 'credit',
          amount: '500.00',
          description: 'Credit',
        },
      ];

      const result = await service.createEntry(mockEntryData, unbalancedLines);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Debits must equal credits');
      }
    });

    test('should require at least 2 lines', async () => {
      const singleLine: NewLedgerEntryLine[] = [
        {
          accountId: mockAccountDebit.id,
          entryType: 'debit',
          amount: '1000.00',
          description: 'Single line',
        },
      ];

      const result = await service.createEntry(mockEntryData, singleLine);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('At least 2 lines required');
      }
    });

    test('should validate all accounts exist', async () => {
      const invalidLines: NewLedgerEntryLine[] = [
        {
          accountId: 'non-existent',
          entryType: 'debit',
          amount: '1000.00',
          description: 'Debit',
        },
        {
          accountId: mockAccountCredit.id,
          entryType: 'credit',
          amount: '1000.00',
          description: 'Credit',
        },
      ];

      const result = await service.createEntry(mockEntryData, invalidLines);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Account not found');
      }
    });

    test('should allow rounding differences within tolerance', async () => {
      const linesWithRounding: NewLedgerEntryLine[] = [
        {
          accountId: mockAccountDebit.id,
          entryType: 'debit',
          amount: '1000.00',
          description: 'Debit',
        },
        {
          accountId: mockAccountCredit.id,
          entryType: 'credit',
          amount: '1000.005',
          description: 'Credit',
        },
      ];

      const result = await service.createEntry(mockEntryData, linesWithRounding);

      expect(result.success).toBe(true);
    });
  });

  describe('getById', () => {
    test('should get entry by id with lines', async () => {
      const created = await service.createEntry(mockEntryData, mockLines);

      if (!created.success) {
        throw new Error('Failed to create entry');
      }

      const result = await service.getById(created.data.id, mockTenantId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(created.data.id);
        expect(result.data.lines).toBeDefined();
        expect(result.data.lines.length).toBe(2);
      }
    });

    test('should return error for non-existent entry', async () => {
      const result = await service.getById('non-existent', mockTenantId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Entry not found');
      }
    });
  });

  describe('list', () => {
    test('should list entries with filters', async () => {
      const result = await service.list(mockTenantId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);
      }
    });

    test('should filter by fiscal period', async () => {
      const result = await service.list(mockTenantId, {
        fiscalPeriod: '2025-01',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        result.data.forEach((entry) => {
          expect(entry.fiscalPeriod).toBe('2025-01');
        });
      }
    });

    test('should filter by status', async () => {
      const result = await service.list(mockTenantId, { status: 'posted' });

      expect(result.success).toBe(true);
      if (result.success) {
        result.data.forEach((entry) => {
          expect(entry.status).toBe('posted');
        });
      }
    });

    test('should filter by date range', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const result = await service.list(mockTenantId, { startDate, endDate });

      expect(result.success).toBe(true);
      if (result.success) {
        result.data.forEach((entry) => {
          expect(entry.entryDate >= startDate).toBe(true);
          expect(entry.entryDate <= endDate).toBe(true);
        });
      }
    });
  });

  describe('update', () => {
    test('should update draft entry', async () => {
      const created = await service.createEntry(mockEntryData, mockLines);

      if (!created.success) {
        throw new Error('Failed to create entry');
      }

      const result = await service.update(created.data.id, mockTenantId, {
        description: 'Updated description',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe('Updated description');
      }
    });

    test('should not update posted entry', async () => {
      const result = await service.update('posted-entry-id', mockTenantId, {
        description: 'New description',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Cannot update posted entry');
      }
    });
  });

  describe('delete', () => {
    test('should delete draft entry', async () => {
      const created = await service.createEntry(mockEntryData, mockLines);

      if (!created.success) {
        throw new Error('Failed to create entry');
      }

      const result = await service.delete(created.data.id, mockTenantId);

      expect(result.success).toBe(true);
    });

    test('should not delete posted entry', async () => {
      const result = await service.delete('posted-entry-id', mockTenantId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Cannot delete posted entry');
      }
    });
  });

  describe('postEntry', () => {
    test('should post draft entry', async () => {
      const created = await service.createEntry(mockEntryData, mockLines);

      if (!created.success) {
        throw new Error('Failed to create entry');
      }

      const result = await service.postEntry(
        created.data.id,
        mockTenantId,
        mockUserId,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('posted');
        expect(result.data.postedBy).toBe(mockUserId);
        expect(result.data.postedAt).toBeInstanceOf(Date);
      }
    });

    test('should not post already posted entry', async () => {
      const result = await service.postEntry(
        'posted-entry-id',
        mockTenantId,
        mockUserId,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Entry already posted');
      }
    });

    test('should validate balance before posting', async () => {
      // This would catch if someone bypassed validation during creation
      const result = await service.postEntry(
        'unbalanced-entry-id',
        mockTenantId,
        mockUserId,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Entry is not balanced');
      }
    });
  });

  describe('reverseEntry', () => {
    test('should reverse posted entry', async () => {
      const created = await service.createEntry(mockEntryData, mockLines);

      if (!created.success) {
        throw new Error('Failed to create entry');
      }

      // Post it first
      await service.postEntry(created.data.id, mockTenantId, mockUserId);

      // Now reverse it
      const result = await service.reverseEntry(
        created.data.id,
        mockTenantId,
        'Correction needed',
        mockUserId,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('posted');
        expect(result.data.entryNumber).toContain('REV');
        expect(result.data.description).toContain('REVERSAL');

        // Check that debits and credits are swapped
        const originalDebit = mockLines.find((l) => l.entryType === 'debit');
        const reversalCredit = result.data.lines.find(
          (l) => l.accountId === originalDebit?.accountId,
        );
        expect(reversalCredit?.entryType).toBe('credit');
      }
    });

    test('should not reverse draft entry', async () => {
      const result = await service.reverseEntry(
        'draft-entry-id',
        mockTenantId,
        'Reason',
        mockUserId,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Can only reverse posted entries');
      }
    });

    test('should require reversal reason', async () => {
      const result = await service.reverseEntry(
        'posted-entry-id',
        mockTenantId,
        '',
        mockUserId,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Reversal reason is required');
      }
    });
  });

  describe('getTrialBalance', () => {
    test('should calculate trial balance', async () => {
      const result = await service.getTrialBalance(mockTenantId, '2025-01');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);

        result.data.forEach((account) => {
          expect(account).toHaveProperty('accountId');
          expect(account).toHaveProperty('accountNumber');
          expect(account).toHaveProperty('accountName');
          expect(account).toHaveProperty('debitTotal');
          expect(account).toHaveProperty('creditTotal');
          expect(account).toHaveProperty('balance');
        });

        // Trial balance should be balanced
        const totalDebits = result.data.reduce(
          (sum, a) => sum + parseFloat(a.debitTotal),
          0,
        );
        const totalCredits = result.data.reduce(
          (sum, a) => sum + parseFloat(a.creditTotal),
          0,
        );

        expect(Math.abs(totalDebits - totalCredits)).toBeLessThan(0.01);
      }
    });

    test('should filter by account type', async () => {
      const result = await service.getTrialBalance(mockTenantId, '2025-01', {
        accountType: 'asset',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        result.data.forEach((account) => {
          expect(account.accountType).toBe('asset');
        });
      }
    });
  });

  describe('getAccountBalance', () => {
    test('should get balance for specific account', async () => {
      const result = await service.getAccountBalance(
        mockTenantId,
        'account-cash',
        '2025-01',
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty('accountId');
        expect(result.data).toHaveProperty('balance');
        expect(result.data).toHaveProperty('debitTotal');
        expect(result.data).toHaveProperty('creditTotal');
        expect(typeof result.data.balance).toBe('string');
      }
    });

    test('should return zero balance for account with no transactions', async () => {
      const result = await service.getAccountBalance(
        mockTenantId,
        'account-no-transactions',
        '2025-01',
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.balance).toBe('0.00');
        expect(result.data.debitTotal).toBe('0.00');
        expect(result.data.creditTotal).toBe('0.00');
      }
    });
  });

  describe('Business Logic - Double Entry', () => {
    test('should maintain double-entry balance across multiple entries', async () => {
      // Entry 1: Cash debit, Revenue credit
      await service.createEntry(mockEntryData, [
        {
          accountId: 'account-cash',
          entryType: 'debit',
          amount: '1000.00',
          description: 'Cash',
        },
        {
          accountId: 'account-revenue',
          entryType: 'credit',
          amount: '1000.00',
          description: 'Revenue',
        },
      ]);

      // Entry 2: Expense debit, Cash credit
      await service.createEntry(
        { ...mockEntryData, entryNumber: 'JE-2025-002' },
        [
          {
            accountId: 'account-expense',
            entryType: 'debit',
            amount: '300.00',
            description: 'Expense',
          },
          {
            accountId: 'account-cash',
            entryType: 'credit',
            amount: '300.00',
            description: 'Cash',
          },
        ],
      );

      const trialBalance = await service.getTrialBalance(
        mockTenantId,
        '2025-01',
      );

      if (trialBalance.success) {
        const totalDebits = trialBalance.data.reduce(
          (sum, a) => sum + parseFloat(a.debitTotal),
          0,
        );
        const totalCredits = trialBalance.data.reduce(
          (sum, a) => sum + parseFloat(a.creditTotal),
          0,
        );

        expect(totalDebits).toBeCloseTo(totalCredits, 2);
      }
    });

    test('should handle complex multi-line entries', async () => {
      const complexLines: NewLedgerEntryLine[] = [
        {
          accountId: 'account-cash',
          entryType: 'debit',
          amount: '1000.00',
          description: 'Cash',
        },
        {
          accountId: 'account-ar',
          entryType: 'debit',
          amount: '500.00',
          description: 'AR',
        },
        {
          accountId: 'account-revenue',
          entryType: 'credit',
          amount: '1200.00',
          description: 'Revenue',
        },
        {
          accountId: 'account-tax',
          entryType: 'credit',
          amount: '300.00',
          description: 'Tax',
        },
      ];

      const result = await service.createEntry(mockEntryData, complexLines);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.lines.length).toBe(4);

        const debits = result.data.lines
          .filter((l) => l.entryType === 'debit')
          .reduce((sum, l) => sum + parseFloat(l.amount), 0);

        const credits = result.data.lines
          .filter((l) => l.entryType === 'credit')
          .reduce((sum, l) => sum + parseFloat(l.amount), 0);

        expect(debits).toBeCloseTo(credits, 2);
      }
    });
  });

  describe('Edge Cases', () => {
    test('should handle decimal precision correctly', async () => {
      const precisionLines: NewLedgerEntryLine[] = [
        {
          accountId: mockAccountDebit.id,
          entryType: 'debit',
          amount: '123.456789',
          description: 'Debit',
        },
        {
          accountId: mockAccountCredit.id,
          entryType: 'credit',
          amount: '123.456789',
          description: 'Credit',
        },
      ];

      const result = await service.createEntry(mockEntryData, precisionLines);

      expect(result.success).toBe(true);
    });

    test('should prevent posting entry with zero amount lines', async () => {
      const zeroLines: NewLedgerEntryLine[] = [
        {
          accountId: mockAccountDebit.id,
          entryType: 'debit',
          amount: '0.00',
          description: 'Zero debit',
        },
        {
          accountId: mockAccountCredit.id,
          entryType: 'credit',
          amount: '0.00',
          description: 'Zero credit',
        },
      ];

      const result = await service.createEntry(mockEntryData, zeroLines);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Line amount must be greater than 0');
      }
    });

    test('should handle same account on both sides', async () => {
      const sameAccountLines: NewLedgerEntryLine[] = [
        {
          accountId: mockAccountDebit.id,
          entryType: 'debit',
          amount: '1000.00',
          description: 'Debit',
        },
        {
          accountId: mockAccountDebit.id,
          entryType: 'credit',
          amount: '1000.00',
          description: 'Credit',
        },
      ];

      const result = await service.createEntry(mockEntryData, sameAccountLines);

      // This is technically valid (e.g., reclassification within same account)
      expect(result.success).toBe(true);
    });

    test('should handle reversal of reversal', async () => {
      const created = await service.createEntry(mockEntryData, mockLines);

      if (!created.success) {
        throw new Error('Failed to create entry');
      }

      // Post and reverse
      await service.postEntry(created.data.id, mockTenantId, mockUserId);
      const reversal1 = await service.reverseEntry(
        created.data.id,
        mockTenantId,
        'First reversal',
        mockUserId,
      );

      if (!reversal1.success) {
        throw new Error('Failed to reverse entry');
      }

      // Reverse the reversal
      const reversal2 = await service.reverseEntry(
        reversal1.data.id,
        mockTenantId,
        'Second reversal',
        mockUserId,
      );

      expect(reversal2.success).toBe(true);
      if (reversal2.success) {
        // Should be back to original amounts
        expect(reversal2.data.entryNumber).toContain('REV');
      }
    });
  });
});
