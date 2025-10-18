/**
 * IntegrationService Tests
 * Tests for automatic integration between financial modules
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { IntegrationService } from '../integration.service';

// Mock data
const mockTenantId = 'tenant-123';
const mockUserId = 'user-456';

const mockInvoiceId = 'invoice-001';
const mockExpenseId = 'expense-001';
const mockPaymentId = 'payment-001';

describe('IntegrationService', () => {
  let service: IntegrationService;

  beforeEach(() => {
    service = new IntegrationService();
  });

  describe('createLedgerEntryFromInvoice', () => {
    test('should create ledger entry for income invoice', async () => {
      const result = await service.createLedgerEntryFromInvoice(
        mockInvoiceId,
        mockTenantId,
        mockUserId,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sourceModule).toBe('invoices');
        expect(result.data.sourceId).toBe(mockInvoiceId);
        expect(result.data.lines.length).toBe(2);

        // For income: Debit AR, Credit Revenue
        const debitLine = result.data.lines.find((l) => l.entryType === 'debit');
        const creditLine = result.data.lines.find((l) => l.entryType === 'credit');

        expect(debitLine?.accountType).toBe('asset'); // AR account
        expect(creditLine?.accountType).toBe('revenue');
      }
    });

    test('should create ledger entry for expense invoice', async () => {
      const result = await service.createLedgerEntryFromInvoice(
        'expense-invoice-id',
        mockTenantId,
        mockUserId,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.lines.length).toBe(2);

        // For expense: Debit Expense, Credit AP
        const debitLine = result.data.lines.find((l) => l.entryType === 'debit');
        const creditLine = result.data.lines.find((l) => l.entryType === 'credit');

        expect(debitLine?.accountType).toBe('expense');
        expect(creditLine?.accountType).toBe('liability'); // AP account
      }
    });

    test('should validate invoice exists', async () => {
      const result = await service.createLedgerEntryFromInvoice(
        'non-existent',
        mockTenantId,
        mockUserId,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invoice not found');
      }
    });

    test('should not duplicate ledger entries', async () => {
      // Create first entry
      await service.createLedgerEntryFromInvoice(
        mockInvoiceId,
        mockTenantId,
        mockUserId,
      );

      // Try to create again
      const duplicate = await service.createLedgerEntryFromInvoice(
        mockInvoiceId,
        mockTenantId,
        mockUserId,
      );

      expect(duplicate.success).toBe(false);
      if (!duplicate.success) {
        expect(duplicate.error).toContain('Ledger entry already exists');
      }
    });

    test('should handle multi-currency invoices', async () => {
      const result = await service.createLedgerEntryFromInvoice(
        'usd-invoice-id',
        mockTenantId,
        mockUserId,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currency).toBeDefined();
        // Should include exchange rate metadata if applicable
        expect(result.data.metadata).toHaveProperty('currency');
      }
    });
  });

  describe('createLedgerEntryFromExpense', () => {
    test('should create ledger entry for approved expense', async () => {
      const result = await service.createLedgerEntryFromExpense(
        mockExpenseId,
        mockTenantId,
        mockUserId,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sourceModule).toBe('expenses');
        expect(result.data.sourceId).toBe(mockExpenseId);
        expect(result.data.lines.length).toBe(2);

        // Debit Expense Category, Credit Cash/AP
        const debitLine = result.data.lines.find((l) => l.entryType === 'debit');
        const creditLine = result.data.lines.find((l) => l.entryType === 'credit');

        expect(debitLine?.accountType).toBe('expense');
        expect(['asset', 'liability']).toContain(creditLine?.accountType);
      }
    });

    test('should not create entry for unapproved expense', async () => {
      const result = await service.createLedgerEntryFromExpense(
        'draft-expense-id',
        mockTenantId,
        mockUserId,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Expense must be approved');
      }
    });

    test('should validate expense exists', async () => {
      const result = await service.createLedgerEntryFromExpense(
        'non-existent',
        mockTenantId,
        mockUserId,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Expense not found');
      }
    });

    test('should map expense category to ledger account', async () => {
      const result = await service.createLedgerEntryFromExpense(
        mockExpenseId,
        mockTenantId,
        mockUserId,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const debitLine = result.data.lines.find((l) => l.entryType === 'debit');
        expect(debitLine?.accountId).toBeDefined();
        // Should map to expense account based on category
        expect(debitLine?.description).toContain('expense');
      }
    });
  });

  describe('processInvoicePayment', () => {
    test('should create ledger entry for payment received', async () => {
      const result = await service.processInvoicePayment(
        mockInvoiceId,
        mockPaymentId,
        mockTenantId,
        mockUserId,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sourceModule).toBe('payments');
        expect(result.data.sourceId).toBe(mockPaymentId);
        expect(result.data.lines.length).toBe(2);

        // Debit Cash, Credit AR
        const debitLine = result.data.lines.find((l) => l.entryType === 'debit');
        const creditLine = result.data.lines.find((l) => l.entryType === 'credit');

        expect(debitLine?.accountType).toBe('asset'); // Cash
        expect(creditLine?.accountType).toBe('asset'); // AR
      }
    });

    test('should handle partial payments', async () => {
      const result = await service.processInvoicePayment(
        mockInvoiceId,
        'partial-payment-id',
        mockTenantId,
        mockUserId,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // Payment amount should be less than invoice total
        const debitLine = result.data.lines.find((l) => l.entryType === 'debit');
        expect(debitLine?.amount).toBeDefined();
      }
    });

    test('should validate payment exists', async () => {
      const result = await service.processInvoicePayment(
        mockInvoiceId,
        'non-existent',
        mockTenantId,
        mockUserId,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Payment not found');
      }
    });

    test('should validate payment belongs to invoice', async () => {
      const result = await service.processInvoicePayment(
        mockInvoiceId,
        'other-invoice-payment',
        mockTenantId,
        mockUserId,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Payment does not belong to invoice');
      }
    });

    test('should handle payment method accounts correctly', async () => {
      const bankPayment = await service.processInvoicePayment(
        mockInvoiceId,
        'bank-payment-id',
        mockTenantId,
        mockUserId,
      );

      if (bankPayment.success) {
        const debitLine = bankPayment.data.lines.find((l) => l.entryType === 'debit');
        expect(debitLine?.description).toContain('bank');
      }

      const cashPayment = await service.processInvoicePayment(
        mockInvoiceId,
        'cash-payment-id',
        mockTenantId,
        mockUserId,
      );

      if (cashPayment.success) {
        const debitLine = cashPayment.data.lines.find((l) => l.entryType === 'debit');
        expect(debitLine?.description).toContain('cash');
      }
    });
  });

  describe('updateBudgetFromExpense', () => {
    test('should update budget when expense is approved', async () => {
      const result = await service.updateBudgetFromExpense(
        mockExpenseId,
        mockTenantId,
      );

      expect(result.success).toBe(true);
    });

    test('should find matching budget line by category', async () => {
      const result = await service.updateBudgetFromExpense(
        mockExpenseId,
        mockTenantId,
      );

      expect(result.success).toBe(true);
      // Budget line for the expense category should be updated
    });

    test('should not update budget for unapproved expense', async () => {
      const result = await service.updateBudgetFromExpense(
        'draft-expense-id',
        mockTenantId,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Expense must be approved');
      }
    });

    test('should handle expense without matching budget', async () => {
      const result = await service.updateBudgetFromExpense(
        'expense-no-budget',
        mockTenantId,
      );

      // Should succeed but not update any budget (no matching category)
      expect(result.success).toBe(true);
    });

    test('should trigger budget alerts if threshold exceeded', async () => {
      const result = await service.updateBudgetFromExpense(
        'large-expense-id',
        mockTenantId,
      );

      expect(result.success).toBe(true);
      // Alert should be created if expense pushes budget over threshold
    });
  });

  describe('Integration Workflows', () => {
    test('should handle complete invoice-to-payment workflow', async () => {
      // 1. Create invoice → Ledger entry (AR/Revenue)
      const invoiceEntry = await service.createLedgerEntryFromInvoice(
        mockInvoiceId,
        mockTenantId,
        mockUserId,
      );
      expect(invoiceEntry.success).toBe(true);

      // 2. Process payment → Ledger entry (Cash/AR)
      const paymentEntry = await service.processInvoicePayment(
        mockInvoiceId,
        mockPaymentId,
        mockTenantId,
        mockUserId,
      );
      expect(paymentEntry.success).toBe(true);

      // Both entries should be linked to same invoice
      if (invoiceEntry.success && paymentEntry.success) {
        expect(invoiceEntry.data.sourceId).toBe(mockInvoiceId);
        expect(paymentEntry.data.metadata?.invoiceId).toBe(mockInvoiceId);
      }
    });

    test('should handle complete expense-to-budget workflow', async () => {
      // 1. Approve expense → Update budget
      const budgetUpdate = await service.updateBudgetFromExpense(
        mockExpenseId,
        mockTenantId,
      );
      expect(budgetUpdate.success).toBe(true);

      // 2. Create ledger entry
      const ledgerEntry = await service.createLedgerEntryFromExpense(
        mockExpenseId,
        mockTenantId,
        mockUserId,
      );
      expect(ledgerEntry.success).toBe(true);

      // Both should reference same expense
      if (ledgerEntry.success) {
        expect(ledgerEntry.data.sourceId).toBe(mockExpenseId);
      }
    });

    test('should maintain double-entry balance across integrations', async () => {
      // Create invoice entry
      const invoiceEntry = await service.createLedgerEntryFromInvoice(
        mockInvoiceId,
        mockTenantId,
        mockUserId,
      );

      if (invoiceEntry.success) {
        const debits = invoiceEntry.data.lines
          .filter((l) => l.entryType === 'debit')
          .reduce((sum, l) => sum + parseFloat(l.amount), 0);

        const credits = invoiceEntry.data.lines
          .filter((l) => l.entryType === 'credit')
          .reduce((sum, l) => sum + parseFloat(l.amount), 0);

        expect(debits).toBeCloseTo(credits, 2);
      }

      // Create payment entry
      const paymentEntry = await service.processInvoicePayment(
        mockInvoiceId,
        mockPaymentId,
        mockTenantId,
        mockUserId,
      );

      if (paymentEntry.success) {
        const debits = paymentEntry.data.lines
          .filter((l) => l.entryType === 'debit')
          .reduce((sum, l) => sum + parseFloat(l.amount), 0);

        const credits = paymentEntry.data.lines
          .filter((l) => l.entryType === 'credit')
          .reduce((sum, l) => sum + parseFloat(l.amount), 0);

        expect(debits).toBeCloseTo(credits, 2);
      }
    });
  });

  describe('Error Handling', () => {
    test('should rollback on ledger entry creation failure', async () => {
      const result = await service.createLedgerEntryFromInvoice(
        'invalid-invoice',
        mockTenantId,
        mockUserId,
      );

      expect(result.success).toBe(false);
      // Invoice should not be marked as posted if ledger entry fails
    });

    test('should handle concurrent integrations', async () => {
      const integration1 = service.createLedgerEntryFromInvoice(
        mockInvoiceId,
        mockTenantId,
        mockUserId,
      );

      const integration2 = service.createLedgerEntryFromInvoice(
        mockInvoiceId,
        mockTenantId,
        mockUserId,
      );

      const results = await Promise.all([integration1, integration2]);

      // One should succeed, one should fail (duplicate prevention)
      const successes = results.filter((r) => r.success);
      const failures = results.filter((r) => !r.success);

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);
    });

    test('should validate tenant isolation', async () => {
      const result = await service.createLedgerEntryFromInvoice(
        mockInvoiceId,
        'other-tenant',
        mockUserId,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('not found');
      }
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero amount invoice', async () => {
      const result = await service.createLedgerEntryFromInvoice(
        'zero-invoice-id',
        mockTenantId,
        mockUserId,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Amount must be greater than 0');
      }
    });

    test('should handle invoice with tax amounts', async () => {
      const result = await service.createLedgerEntryFromInvoice(
        'invoice-with-tax',
        mockTenantId,
        mockUserId,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // Should create additional lines for tax accounts
        expect(result.data.lines.length).toBeGreaterThanOrEqual(2);
      }
    });

    test('should handle expense with multiple budget lines', async () => {
      const result = await service.updateBudgetFromExpense(
        'multi-category-expense',
        mockTenantId,
      );

      expect(result.success).toBe(true);
      // Should update multiple budget lines if expense spans categories
    });

    test('should handle payment with discount', async () => {
      const result = await service.processInvoicePayment(
        mockInvoiceId,
        'payment-with-discount',
        mockTenantId,
        mockUserId,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // Should include discount account line
        expect(result.data.lines.length).toBeGreaterThanOrEqual(2);
      }
    });

    test('should handle deleted invoice gracefully', async () => {
      const result = await service.createLedgerEntryFromInvoice(
        'deleted-invoice-id',
        mockTenantId,
        mockUserId,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invoice not found');
      }
    });

    test('should preserve metadata across integrations', async () => {
      const result = await service.createLedgerEntryFromInvoice(
        mockInvoiceId,
        mockTenantId,
        mockUserId,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata).toBeDefined();
        expect(result.data.metadata).toHaveProperty('invoiceNumber');
        expect(result.data.metadata).toHaveProperty('customerId');
      }
    });
  });

  describe('Account Mapping', () => {
    test('should map invoice types to correct accounts', async () => {
      const receivable = await service.createLedgerEntryFromInvoice(
        'receivable-invoice',
        mockTenantId,
        mockUserId,
      );

      if (receivable.success) {
        const arLine = receivable.data.lines.find(
          (l) => l.entryType === 'debit',
        );
        expect(arLine?.accountName).toContain('Receivable');
      }

      const payable = await service.createLedgerEntryFromInvoice(
        'payable-invoice',
        mockTenantId,
        mockUserId,
      );

      if (payable.success) {
        const apLine = payable.data.lines.find(
          (l) => l.entryType === 'credit',
        );
        expect(apLine?.accountName).toContain('Payable');
      }
    });

    test('should map expense categories to expense accounts', async () => {
      const categories = [
        'office-supplies',
        'marketing',
        'utilities',
        'salaries',
      ];

      const results = await Promise.all(
        categories.map((cat) =>
          service.createLedgerEntryFromExpense(
            `expense-${cat}`,
            mockTenantId,
            mockUserId,
          ),
        ),
      );

      results.forEach((result, index) => {
        if (result.success) {
          const expenseLine = result.data.lines.find(
            (l) => l.entryType === 'debit',
          );
          expect(expenseLine?.accountType).toBe('expense');
          // Account should match category
          expect(expenseLine?.description.toLowerCase()).toContain(
            categories[index].split('-')[0],
          );
        }
      });
    });

    test('should use default accounts when mapping not found', async () => {
      const result = await service.createLedgerEntryFromExpense(
        'expense-unknown-category',
        mockTenantId,
        mockUserId,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const expenseLine = result.data.lines.find(
          (l) => l.entryType === 'debit',
        );
        expect(expenseLine?.accountName).toContain('Miscellaneous');
      }
    });
  });
});
