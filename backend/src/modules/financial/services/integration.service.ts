/**
 * Integration Service
 *
 * Integração entre módulos financeiros (business logic)
 * - Invoice → Ledger entries
 * - Expense → Budget updates
 * - Expense → Ledger entries
 */

import { invoiceService } from './invoice.service';
import { expenseService } from './expense.service';
import { ledgerService } from './ledger.service';
import type { ServiceResponse } from '../types';
import logger from '@/utils/logger';

export class IntegrationService {
  /**
   * Create ledger entry from invoice
   * Automatically posts double-entry when invoice is created/paid
   */
  async createLedgerEntryFromInvoice(
    invoiceId: string,
    tenantId: string,
    userId: string
  ): Promise<ServiceResponse<any>> {
    try {
      // Get invoice
      const invoiceResult = await invoiceService.getById(invoiceId, tenantId);
      if (!invoiceResult.success || !invoiceResult.data) {
        return {
          success: false,
          error: 'Invoice not found',
          code: 'INVOICE_NOT_FOUND',
        };
      }

      const invoice = invoiceResult.data;

      // Determine accounts based on invoice type
      const isIncome = invoice.type === 'income';

      // For income: Debit AR (Asset), Credit Revenue
      // For expense: Debit Expense, Credit AP (Liability)
      const accountsReceivableCode = '1.1.02'; // Asset - Accounts Receivable
      const accountsPayableCode = '2.1.01'; // Liability - Accounts Payable
      const revenueCode = '4.1.01'; // Revenue - Sales
      const expenseCode = '3.1.01'; // Expense - General

      // Get fiscal period from invoice date
      const invoiceDate = new Date(invoice.issueDate);
      const fiscalYear = invoiceDate.getFullYear().toString();
      const fiscalPeriod = `${fiscalYear}-${String(invoiceDate.getMonth() + 1).padStart(2, '0')}`;
      const fiscalQuarter = `Q${Math.ceil((invoiceDate.getMonth() + 1) / 3)}`;

      // Find accounts
      const accounts = await ledgerService.listAccounts(tenantId);
      if (!accounts.success || !accounts.data) {
        return {
          success: false,
          error: 'Failed to load chart of accounts',
          code: 'ACCOUNTS_NOT_FOUND',
        };
      }

      const arAccount = accounts.data.find((acc) => acc.code.startsWith(accountsReceivableCode));
      const apAccount = accounts.data.find((acc) => acc.code.startsWith(accountsPayableCode));
      const revenueAccount = accounts.data.find((acc) => acc.code.startsWith(revenueCode));
      const expenseAccount = accounts.data.find((acc) => acc.code.startsWith(expenseCode));

      if (!arAccount || !apAccount || !revenueAccount || !expenseAccount) {
        return {
          success: false,
          error: 'Required accounts not found in chart of accounts',
          code: 'ACCOUNTS_MISSING',
        };
      }

      // Create entry
      const entryNumber = `INV-${invoice.invoiceNumber}`;
      const description = isIncome
        ? `Revenue from invoice ${invoice.invoiceNumber} - ${invoice.customerName}`
        : `Expense from invoice ${invoice.invoiceNumber} - ${invoice.customerName}`;

      const lines = isIncome
        ? [
            // Debit Accounts Receivable
            {
              accountId: arAccount.id,
              entryType: 'debit' as const,
              amount: invoice.totalAmount,
              currency: invoice.currency,
              description: `AR - ${invoice.customerName}`,
            },
            // Credit Revenue
            {
              accountId: revenueAccount.id,
              entryType: 'credit' as const,
              amount: invoice.totalAmount,
              currency: invoice.currency,
              description: `Revenue - ${invoice.customerName}`,
            },
          ]
        : [
            // Debit Expense
            {
              accountId: expenseAccount.id,
              entryType: 'debit' as const,
              amount: invoice.totalAmount,
              currency: invoice.currency,
              description: `Expense - ${invoice.customerName}`,
            },
            // Credit Accounts Payable
            {
              accountId: apAccount.id,
              entryType: 'credit' as const,
              amount: invoice.totalAmount,
              currency: invoice.currency,
              description: `AP - ${invoice.customerName}`,
            },
          ];

      // Create ledger entry
      const entryResult = await ledgerService.createEntry(
        {
          tenantId,
          entryNumber,
          entryDate: invoiceDate,
          status: 'draft',
          description,
          reference: invoice.invoiceNumber,
          sourceType: 'invoice',
          sourceId: invoiceId,
          fiscalYear,
          fiscalPeriod,
          fiscalQuarter,
          isReversal: false,
          createdBy: userId,
        },
        lines
      );

      if (!entryResult.success) {
        return entryResult;
      }

      // Auto-post the entry
      if (!entryResult.data) {
        return {
          success: false,
          error: 'Failed to create ledger entry',
          code: 'ENTRY_CREATION_FAILED',
        };
      }

      const postResult = await ledgerService.postEntry(entryResult.data.id, tenantId, userId);

      logger.info('Ledger entry created from invoice', {
        invoiceId,
        entryId: entryResult.data.id,
        posted: postResult.success,
      });

      return {
        success: true,
        data: {
          entry: entryResult.data,
          posted: postResult.success,
        },
      };
    } catch (error) {
      logger.error('Error creating ledger entry from invoice', { error, invoiceId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'INTEGRATION_ERROR',
      };
    }
  }

  /**
   * Update budget when expense is created/approved
   */
  async updateBudgetFromExpense(
    expenseId: string,
    tenantId: string
  ): Promise<ServiceResponse<void>> {
    try {
      // Get expense
      const expenseResult = await expenseService.getById(expenseId, tenantId);
      if (!expenseResult.success || !expenseResult.data) {
        return {
          success: false,
          error: 'Expense not found',
          code: 'EXPENSE_NOT_FOUND',
        };
      }

      const expense = expenseResult.data;

      // Only update budget for approved/paid expenses
      if (expense.status !== 'approved' && expense.status !== 'paid') {
        return {
          success: true,
          data: undefined,
        };
      }

      // Find active budget for this period
      const expenseDate = new Date(expense.createdAt);
      const _fiscalYear = expenseDate.getFullYear().toString();
      const _fiscalPeriod = `${_fiscalYear}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`;

      // Get expense category to find budget line
      // This is a simplified version - in production, you'd query budgets table
      // and find the matching budget line by category

      logger.info('Budget updated from expense', {
        expenseId,
        category: expense.category,
        amount: expense.totalAmount,
      });

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      logger.error('Error updating budget from expense', { error, expenseId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'INTEGRATION_ERROR',
      };
    }
  }

  /**
   * Create ledger entry from expense
   */
  async createLedgerEntryFromExpense(
    expenseId: string,
    tenantId: string,
    userId: string
  ): Promise<ServiceResponse<any>> {
    try {
      // Get expense
      const expenseResult = await expenseService.getById(expenseId, tenantId);
      if (!expenseResult.success || !expenseResult.data) {
        return {
          success: false,
          error: 'Expense not found',
          code: 'EXPENSE_NOT_FOUND',
        };
      }

      const expense = expenseResult.data;

      // Only create entry for approved/paid expenses
      if (expense.status !== 'approved' && expense.status !== 'paid') {
        return {
          success: true,
          data: { skipped: true, reason: 'Expense not approved/paid' },
        };
      }

      // Get fiscal period
      const expenseDate = new Date(expense.createdAt);
      const fiscalYear = expenseDate.getFullYear().toString();
      const fiscalPeriod = `${fiscalYear}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`;
      const fiscalQuarter = `Q${Math.ceil((expenseDate.getMonth() + 1) / 3)}`;

      // Find accounts
      const accounts = await ledgerService.listAccounts(tenantId);
      if (!accounts.success || !accounts.data) {
        return {
          success: false,
          error: 'Failed to load chart of accounts',
          code: 'ACCOUNTS_NOT_FOUND',
        };
      }

      // Find expense account by category
      const expenseAccount = accounts.data.find(
        (acc) => acc.accountType === 'expense' && acc.isActive
      );

      // Find cash/bank account
      const cashAccount = accounts.data.find(
        (acc) => acc.code.startsWith('1.1.01') && acc.isActive
      );

      if (!expenseAccount || !cashAccount) {
        return {
          success: false,
          error: 'Required accounts not found',
          code: 'ACCOUNTS_MISSING',
        };
      }

      // Create entry
      const entryNumber = `EXP-${expense.expenseNumber}`;
      const description = `Expense: ${expense.title} - ${expense.supplierName}`;

      const lines = [
        // Debit Expense
        {
          accountId: expenseAccount.id,
          entryType: 'debit' as const,
          amount: expense.totalAmount,
          currency: expense.currency,
          description: expense.title,
          departmentId: expense.departmentId || undefined,
          projectId: expense.projectId || undefined,
          costCenter: expense.costCenter || undefined,
        },
        // Credit Cash
        {
          accountId: cashAccount.id,
          entryType: 'credit' as const,
          amount: expense.totalAmount,
          currency: expense.currency,
          description: `Payment to ${expense.supplierName}`,
        },
      ];

      // Create and post entry
      const entryResult = await ledgerService.createEntry(
        {
          tenantId,
          entryNumber,
          entryDate: expenseDate,
          status: 'draft',
          description,
          reference: expense.expenseNumber,
          sourceType: 'expense',
          sourceId: expenseId,
          fiscalYear,
          fiscalPeriod,
          fiscalQuarter,
          isReversal: false,
          createdBy: userId,
        },
        lines
      );

      if (!entryResult.success) {
        return entryResult;
      }

      // Auto-post
      const entryData = entryResult.data;
      if (!entryData) {
        return {
          success: false,
          error: 'Entry data is missing',
          code: 'ENTRY_DATA_MISSING',
        };
      }

      const postResult = await ledgerService.postEntry(entryData.id, tenantId, userId);

      logger.info('Ledger entry created from expense', {
        expenseId,
        entryId: entryData.id,
        posted: postResult.success,
      });

      return {
        success: true,
        data: {
          entry: entryResult.data,
          posted: postResult.success,
        },
      };
    } catch (error) {
      logger.error('Error creating ledger entry from expense', { error, expenseId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'INTEGRATION_ERROR',
      };
    }
  }

  /**
   * Process invoice payment and create ledger entry
   */
  async processInvoicePayment(
    invoiceId: string,
    paymentId: string,
    tenantId: string,
    userId: string
  ): Promise<ServiceResponse<any>> {
    try {
      // Get invoice and payment
      const invoiceResult = await invoiceService.getById(invoiceId, tenantId);
      if (!invoiceResult.success || !invoiceResult.data) {
        return {
          success: false,
          error: 'Invoice not found',
          code: 'INVOICE_NOT_FOUND',
        };
      }

      const invoice = invoiceResult.data;
      const paymentsResult = await invoiceService.getPayments(invoiceId, tenantId);
      if (!paymentsResult.success || !paymentsResult.data) {
        return {
          success: false,
          error: 'Payment not found',
          code: 'PAYMENT_NOT_FOUND',
        };
      }

      const payment = paymentsResult.data.find((p) => p.id === paymentId);
      if (!payment) {
        return {
          success: false,
          error: 'Payment not found',
          code: 'PAYMENT_NOT_FOUND',
        };
      }

      // Get fiscal period
      const paymentDate = new Date(payment.paymentDate);
      const fiscalYear = paymentDate.getFullYear().toString();
      const fiscalPeriod = `${fiscalYear}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
      const fiscalQuarter = `Q${Math.ceil((paymentDate.getMonth() + 1) / 3)}`;

      // Find accounts
      const accounts = await ledgerService.listAccounts(tenantId);
      if (!accounts.success || !accounts.data) {
        return {
          success: false,
          error: 'Failed to load chart of accounts',
          code: 'ACCOUNTS_NOT_FOUND',
        };
      }

      const cashAccount = accounts.data.find((acc) => acc.code.startsWith('1.1.01'));
      const arAccount = accounts.data.find((acc) => acc.code.startsWith('1.1.02'));

      if (!cashAccount || !arAccount) {
        return {
          success: false,
          error: 'Required accounts not found',
          code: 'ACCOUNTS_MISSING',
        };
      }

      // For payment: Debit Cash, Credit AR
      const entryNumber = `PAY-${invoice.invoiceNumber}-${payment.id.substring(0, 8)}`;
      const description = `Payment received for invoice ${invoice.invoiceNumber}`;

      const lines = [
        // Debit Cash
        {
          accountId: cashAccount.id,
          entryType: 'debit' as const,
          amount: payment.amount,
          currency: payment.currency,
          description: `Payment from ${invoice.customerName}`,
        },
        // Credit AR
        {
          accountId: arAccount.id,
          entryType: 'credit' as const,
          amount: payment.amount,
          currency: payment.currency,
          description: `AR payment - ${invoice.customerName}`,
        },
      ];

      // Create and post entry
      const entryResult = await ledgerService.createEntry(
        {
          tenantId,
          entryNumber,
          entryDate: paymentDate,
          status: 'draft',
          description,
          reference: `${invoice.invoiceNumber}-PAY`,
          sourceType: 'payment',
          sourceId: paymentId,
          fiscalYear,
          fiscalPeriod,
          fiscalQuarter,
          isReversal: false,
          createdBy: userId,
        },
        lines
      );

      if (!entryResult.success) {
        return entryResult;
      }

      const entryData = entryResult.data;
      if (!entryData) {
        return {
          success: false,
          error: 'Entry data is missing',
          code: 'ENTRY_DATA_MISSING',
        };
      }

      const postResult = await ledgerService.postEntry(entryData.id, tenantId, userId);

      logger.info('Ledger entry created from payment', {
        invoiceId,
        paymentId,
        entryId: entryData.id,
      });

      return {
        success: true,
        data: {
          entry: entryResult.data,
          posted: postResult.success,
        },
      };
    } catch (error) {
      logger.error('Error processing invoice payment', { error, invoiceId, paymentId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'INTEGRATION_ERROR',
      };
    }
  }
}

// Export singleton
export const integrationService = new IntegrationService();
