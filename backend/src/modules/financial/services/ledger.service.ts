/**
 * Ledger Service
 *
 * Contabilidade de partidas dobradas (Double-entry bookkeeping)
 */

import { db } from '../../../db';
import { eq, and, sql } from 'drizzle-orm';
import {
  chartOfAccounts,
  ledgerEntries,
  ledgerEntryLines,
  accountBalances,
  fiscalPeriods,
  type ChartOfAccount,
  type NewChartOfAccount,
  type LedgerEntry,
  type NewLedgerEntry,
  type LedgerEntryLine,
  type NewLedgerEntryLine,
  type AccountBalance,
  type FiscalPeriod,
} from '../schema/ledger.schema';
import type { ServiceResponse } from '../types';
import logger from '@/utils/logger';

export class LedgerService {
  /**
   * Create ledger entry (double-entry)
   * Ensures debits = credits
   */
  async createEntry(
    entryData: NewLedgerEntry,
    lines: Omit<NewLedgerEntryLine, 'entryId' | 'tenantId'>[]
  ): Promise<ServiceResponse<LedgerEntry>> {
    try {
      // Validate double-entry (debits must equal credits)
      const debits = lines
        .filter((l) => l.entryType === 'debit')
        .reduce((sum, l) => sum + parseFloat(l.amount), 0);

      const credits = lines
        .filter((l) => l.entryType === 'credit')
        .reduce((sum, l) => sum + parseFloat(l.amount), 0);

      if (Math.abs(debits - credits) > 0.01) {
        return {
          success: false,
          error: `Debits (${debits}) must equal credits (${credits})`,
          code: 'UNBALANCED_ENTRY',
        };
      }

      // Create entry
      const [entry] = await db.insert(ledgerEntries).values(entryData).returning();

      // Create lines
      const linePromises = lines.map((line) =>
        db.insert(ledgerEntryLines).values({
          ...line,
          entryId: entry.id,
          tenantId: entryData.tenantId,
        })
      );

      await Promise.all(linePromises);

      logger.info('Ledger entry created', {
        entryId: entry.id,
        entryNumber: entry.entryNumber,
        debits,
        credits,
      });

      return { success: true, data: entry };
    } catch (error) {
      logger.error('Error creating ledger entry', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'ENTRY_CREATE_ERROR',
      };
    }
  }

  /**
   * Post entry (move from draft to posted)
   */
  async postEntry(
    entryId: string,
    tenantId: string,
    postedBy: string
  ): Promise<ServiceResponse<LedgerEntry>> {
    try {
      const [entry] = await db
        .update(ledgerEntries)
        .set({
          status: 'posted',
          postingDate: new Date(),
          postedBy,
          updatedAt: new Date(),
        })
        .where(and(eq(ledgerEntries.id, entryId), eq(ledgerEntries.tenantId, tenantId)))
        .returning();

      if (!entry) {
        return {
          success: false,
          error: 'Entry not found',
          code: 'ENTRY_NOT_FOUND',
        };
      }

      // Update account balances
      await this.updateAccountBalances(entryId, tenantId);

      logger.info('Ledger entry posted', { entryId, postedBy });

      return { success: true, data: entry };
    } catch (error) {
      logger.error('Error posting ledger entry', { error, entryId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'ENTRY_POST_ERROR',
      };
    }
  }

  /**
   * Update account balances after posting
   */
  private async updateAccountBalances(entryId: string, tenantId: string): Promise<void> {
    try {
      // Get entry lines
      const lines = await db
        .select()
        .from(ledgerEntryLines)
        .where(and(eq(ledgerEntryLines.entryId, entryId), eq(ledgerEntryLines.tenantId, tenantId)));

      // Update each account's current balance
      for (const line of lines) {
        const amount = parseFloat(line.amount);
        const isDebit = line.entryType === 'debit';

        // Get account to check if it's debit-normal
        const [account] = await db
          .select()
          .from(chartOfAccounts)
          .where(eq(chartOfAccounts.id, line.accountId))
          .limit(1);

        if (!account) continue;

        // Calculate new balance based on account type
        const balanceChange = account.isDebitNormal
          ? isDebit
            ? amount
            : -amount
          : isDebit
            ? -amount
            : amount;

        await db
          .update(chartOfAccounts)
          .set({
            currentBalance: sql`${chartOfAccounts.currentBalance} + ${balanceChange}`,
            updatedAt: new Date(),
          })
          .where(eq(chartOfAccounts.id, line.accountId));
      }
    } catch (error) {
      logger.error('Error updating account balances', { error, entryId });
    }
  }

  /**
   * Reverse entry (create reversal)
   */
  async reverseEntry(
    entryId: string,
    tenantId: string,
    reversalReason: string,
    createdBy: string
  ): Promise<ServiceResponse<LedgerEntry>> {
    try {
      // Get original entry
      const [originalEntry] = await db
        .select()
        .from(ledgerEntries)
        .where(and(eq(ledgerEntries.id, entryId), eq(ledgerEntries.tenantId, tenantId)))
        .limit(1);

      if (!originalEntry) {
        return {
          success: false,
          error: 'Entry not found',
          code: 'ENTRY_NOT_FOUND',
        };
      }

      // Get original lines
      const originalLines = await db
        .select()
        .from(ledgerEntryLines)
        .where(eq(ledgerEntryLines.entryId, entryId));

      // Create reversal entry
      const reversalEntryNumber = `${originalEntry.entryNumber}-REV`;
      const [reversalEntry] = await db
        .insert(ledgerEntries)
        .values({
          tenantId,
          entryNumber: reversalEntryNumber,
          entryDate: new Date(),
          status: 'posted',
          postingDate: new Date(),
          description: `Reversal: ${reversalReason}`,
          reference: originalEntry.entryNumber,
          fiscalYear: originalEntry.fiscalYear,
          fiscalPeriod: originalEntry.fiscalPeriod,
          fiscalQuarter: originalEntry.fiscalQuarter,
          isReversal: true,
          reversedEntryId: entryId,
          notes: reversalReason,
          createdBy,
          postedBy: createdBy,
        })
        .returning();

      // Create reversed lines (swap debit/credit)
      const reversalLines = originalLines.map((line) => ({
        tenantId,
        entryId: reversalEntry.id,
        accountId: line.accountId,
        entryType: line.entryType === 'debit' ? ('credit' as const) : ('debit' as const),
        amount: line.amount,
        currency: line.currency,
        description: `Reversal: ${line.description}`,
      }));

      await db.insert(ledgerEntryLines).values(reversalLines);

      // Update account balances
      await this.updateAccountBalances(reversalEntry.id, tenantId);

      // Mark original as voided
      await db
        .update(ledgerEntries)
        .set({ status: 'voided', updatedAt: new Date() })
        .where(eq(ledgerEntries.id, entryId));

      logger.info('Ledger entry reversed', {
        originalEntryId: entryId,
        reversalEntryId: reversalEntry.id,
      });

      return { success: true, data: reversalEntry };
    } catch (error) {
      logger.error('Error reversing entry', { error, entryId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'ENTRY_REVERSE_ERROR',
      };
    }
  }

  /**
   * Get entry with lines
   */
  async getEntryWithLines(
    entryId: string,
    tenantId: string
  ): Promise<ServiceResponse<{ entry: LedgerEntry; lines: LedgerEntryLine[] }>> {
    try {
      const [entry] = await db
        .select()
        .from(ledgerEntries)
        .where(and(eq(ledgerEntries.id, entryId), eq(ledgerEntries.tenantId, tenantId)))
        .limit(1);

      if (!entry) {
        return {
          success: false,
          error: 'Entry not found',
          code: 'ENTRY_NOT_FOUND',
        };
      }

      const lines = await db
        .select()
        .from(ledgerEntryLines)
        .where(eq(ledgerEntryLines.entryId, entryId));

      return { success: true, data: { entry, lines } };
    } catch (error) {
      logger.error('Error fetching entry with lines', { error, entryId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'ENTRY_FETCH_ERROR',
      };
    }
  }

  /**
   * Chart of Accounts Management
   */

  async createAccount(data: NewChartOfAccount): Promise<ServiceResponse<ChartOfAccount>> {
    try {
      const [account] = await db.insert(chartOfAccounts).values(data).returning();

      logger.info('Account created', {
        accountId: account.id,
        code: account.code,
        name: account.name,
      });

      return { success: true, data: account };
    } catch (error) {
      logger.error('Error creating account', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'ACCOUNT_CREATE_ERROR',
      };
    }
  }

  async listAccounts(tenantId: string): Promise<ServiceResponse<ChartOfAccount[]>> {
    try {
      const accounts = await db
        .select()
        .from(chartOfAccounts)
        .where(eq(chartOfAccounts.tenantId, tenantId))
        .orderBy(chartOfAccounts.code);

      return { success: true, data: accounts };
    } catch (error) {
      logger.error('Error listing accounts', { error, tenantId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'ACCOUNT_LIST_ERROR',
      };
    }
  }

  /**
   * Get account balance for period
   */
  async getAccountBalance(
    tenantId: string,
    accountId: string,
    fiscalPeriod: string
  ): Promise<ServiceResponse<AccountBalance | null>> {
    try {
      const [balance] = await db
        .select()
        .from(accountBalances)
        .where(
          and(
            eq(accountBalances.tenantId, tenantId),
            eq(accountBalances.accountId, accountId),
            eq(accountBalances.fiscalPeriod, fiscalPeriod)
          )
        )
        .limit(1);

      return { success: true, data: balance || null };
    } catch (error) {
      logger.error('Error fetching account balance', { error, accountId, fiscalPeriod });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'BALANCE_FETCH_ERROR',
      };
    }
  }

  /**
   * Get trial balance (all accounts for a period)
   */
  async getTrialBalance(
    tenantId: string,
    fiscalPeriod: string
  ): Promise<
    ServiceResponse<
      Array<{
        account: ChartOfAccount;
        debitTotal: string;
        creditTotal: string;
        balance: string;
      }>
    >
  > {
    try {
      const accounts = await db
        .select()
        .from(chartOfAccounts)
        .where(and(eq(chartOfAccounts.tenantId, tenantId), eq(chartOfAccounts.isActive, true)))
        .orderBy(chartOfAccounts.code);

      const trialBalance = await Promise.all(
        accounts.map(async (account) => {
          const [balanceData] = await db
            .select()
            .from(accountBalances)
            .where(
              and(
                eq(accountBalances.accountId, account.id),
                eq(accountBalances.fiscalPeriod, fiscalPeriod)
              )
            )
            .limit(1);

          return {
            account,
            debitTotal: balanceData?.debitTotal || '0.00',
            creditTotal: balanceData?.creditTotal || '0.00',
            balance: account.currentBalance || '0.00',
          };
        })
      );

      return { success: true, data: trialBalance };
    } catch (error) {
      logger.error('Error generating trial balance', { error, tenantId, fiscalPeriod });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'TRIAL_BALANCE_ERROR',
      };
    }
  }

  /**
   * Close fiscal period
   */
  async closeFiscalPeriod(
    tenantId: string,
    fiscalPeriod: string,
    closedBy: string
  ): Promise<ServiceResponse<FiscalPeriod>> {
    try {
      const [period] = await db
        .update(fiscalPeriods)
        .set({
          isClosed: true,
          closedAt: new Date(),
          closedBy,
          updatedAt: new Date(),
        })
        .where(and(eq(fiscalPeriods.tenantId, tenantId), eq(fiscalPeriods.fiscalPeriod, fiscalPeriod)))
        .returning();

      if (!period) {
        return {
          success: false,
          error: 'Fiscal period not found',
          code: 'PERIOD_NOT_FOUND',
        };
      }

      logger.info('Fiscal period closed', { fiscalPeriod, closedBy });

      return { success: true, data: period };
    } catch (error) {
      logger.error('Error closing fiscal period', { error, fiscalPeriod });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'PERIOD_CLOSE_ERROR',
      };
    }
  }
}

// Export singleton instance
export const ledgerService = new LedgerService();
