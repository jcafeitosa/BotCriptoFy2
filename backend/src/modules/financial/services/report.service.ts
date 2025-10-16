/**
 * Report Service
 *
 * Geração de relatórios financeiros (P&L, Balance Sheet, Cash Flow)
 */

import { db } from '../../../db';
import { eq, and, sql } from 'drizzle-orm';
import { chartOfAccounts, accountBalances } from '../schema/ledger.schema';
import type { ServiceResponse, ProfitLossReport, BalanceSheetReport, CashFlowReport } from '../types';
import logger from '@/utils/logger';

export class ReportService {
  /**
   * Generate Profit & Loss Statement (DRE)
   */
  async generateProfitLoss(
    tenantId: string,
    fiscalPeriod: string
  ): Promise<ServiceResponse<ProfitLossReport>> {
    try {
      // Get revenue accounts (accountType = 'revenue')
      const revenueAccounts = await this.getAccountsByType(tenantId, 'revenue', fiscalPeriod);
      const revenueTotal = revenueAccounts.reduce((sum, acc) => sum + parseFloat(acc.amount), 0);

      // Get expense accounts (accountType = 'expense')
      const expenseAccounts = await this.getAccountsByType(tenantId, 'expense', fiscalPeriod);
      const expenseTotal = expenseAccounts.reduce((sum, acc) => sum + parseFloat(acc.amount), 0);

      // Calculate net income
      const netIncome = revenueTotal - expenseTotal;
      const netMargin = revenueTotal > 0 ? (netIncome / revenueTotal) * 100 : 0;

      const report: ProfitLossReport = {
        fiscalPeriod,
        revenue: {
          total: revenueTotal.toFixed(2),
          breakdown: revenueAccounts,
        },
        expenses: {
          total: expenseTotal.toFixed(2),
          breakdown: expenseAccounts,
        },
        netIncome: netIncome.toFixed(2),
        netMargin: netMargin.toFixed(2) + '%',
      };

      logger.info('P&L Report generated', {
        tenantId,
        fiscalPeriod,
        netIncome: report.netIncome,
      });

      return { success: true, data: report };
    } catch (error) {
      logger.error('Error generating P&L report', { error, tenantId, fiscalPeriod });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'REPORT_PL_ERROR',
      };
    }
  }

  /**
   * Generate Balance Sheet (Balanço Patrimonial)
   */
  async generateBalanceSheet(
    tenantId: string,
    date: Date
  ): Promise<ServiceResponse<BalanceSheetReport>> {
    try {
      // Get asset accounts
      const currentAssets = await this.getCurrentAssets(tenantId, date);
      const nonCurrentAssets = await this.getNonCurrentAssets(tenantId, date);
      const totalAssets =
        parseFloat(currentAssets.total) + parseFloat(nonCurrentAssets.total);

      // Get liability accounts
      const currentLiabilities = await this.getCurrentLiabilities(tenantId, date);
      const nonCurrentLiabilities = await this.getNonCurrentLiabilities(tenantId, date);
      const totalLiabilities =
        parseFloat(currentLiabilities.total) + parseFloat(nonCurrentLiabilities.total);

      // Get equity accounts
      const equity = await this.getEquity(tenantId, date);

      const report: BalanceSheetReport = {
        date,
        assets: {
          current: currentAssets,
          nonCurrent: nonCurrentAssets,
          total: totalAssets.toFixed(2),
        },
        liabilities: {
          current: currentLiabilities,
          nonCurrent: nonCurrentLiabilities,
          total: totalLiabilities.toFixed(2),
        },
        equity,
      };

      logger.info('Balance Sheet generated', {
        tenantId,
        date,
        totalAssets: report.assets.total,
      });

      return { success: true, data: report };
    } catch (error) {
      logger.error('Error generating Balance Sheet', { error, tenantId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'REPORT_BS_ERROR',
      };
    }
  }

  /**
   * Generate Cash Flow Statement (DFC)
   */
  async generateCashFlow(
    tenantId: string,
    fiscalPeriod: string
  ): Promise<ServiceResponse<CashFlowReport>> {
    try {
      // Operating activities
      const operating = await this.getOperatingCashFlow(tenantId, fiscalPeriod);

      // Investing activities
      const investing = await this.getInvestingCashFlow(tenantId, fiscalPeriod);

      // Financing activities
      const financing = await this.getFinancingCashFlow(tenantId, fiscalPeriod);

      // Calculate net cash flow
      const netCashFlow =
        parseFloat(operating.total) +
        parseFloat(investing.total) +
        parseFloat(financing.total);

      // Get opening and closing balances (cash accounts)
      const { opening, closing } = await this.getCashBalances(tenantId, fiscalPeriod);

      const report: CashFlowReport = {
        fiscalPeriod,
        operating,
        investing,
        financing,
        netCashFlow: netCashFlow.toFixed(2),
        openingBalance: opening.toFixed(2),
        closingBalance: closing.toFixed(2),
      };

      logger.info('Cash Flow Statement generated', {
        tenantId,
        fiscalPeriod,
        netCashFlow: report.netCashFlow,
      });

      return { success: true, data: report };
    } catch (error) {
      logger.error('Error generating Cash Flow statement', { error, tenantId, fiscalPeriod });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'REPORT_CF_ERROR',
      };
    }
  }

  /**
   * Helper: Get accounts by type for a period
   */
  private async getAccountsByType(
    tenantId: string,
    accountType: string,
    fiscalPeriod: string
  ): Promise<Array<{ account: string; amount: string }>> {
    const accounts = await db
      .select({
        id: chartOfAccounts.id,
        name: chartOfAccounts.name,
        code: chartOfAccounts.code,
      })
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.tenantId, tenantId),
          eq(chartOfAccounts.accountType, accountType as any),
          eq(chartOfAccounts.isActive, true)
        )
      );

    const accountsWithBalances = await Promise.all(
      accounts.map(async (account) => {
        const [balance] = await db
          .select({
            amount: sql<string>`COALESCE(${accountBalances.debitTotal} - ${accountBalances.creditTotal}, 0)::text`,
          })
          .from(accountBalances)
          .where(
            and(
              eq(accountBalances.accountId, account.id),
              eq(accountBalances.fiscalPeriod, fiscalPeriod)
            )
          )
          .limit(1);

        return {
          account: `${account.code} - ${account.name}`,
          amount: balance?.amount || '0.00',
        };
      })
    );

    return accountsWithBalances.filter((acc) => parseFloat(acc.amount) !== 0);
  }

  /**
   * Helper: Get current assets
   */
  private async getCurrentAssets(
    tenantId: string,
    _date: Date
  ): Promise<{ total: string; accounts: Array<{ name: string; balance: string }> }> {
    // Current assets: Cash, Accounts Receivable, Inventory, etc.
    // Accounts with code starting with "1.1" (simplified)
    const accounts = await db
      .select({
        name: chartOfAccounts.name,
        balance: chartOfAccounts.currentBalance,
      })
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.tenantId, tenantId),
          eq(chartOfAccounts.accountType, 'asset'),
          sql`${chartOfAccounts.code} LIKE '1.1%'`
        )
      );

    const total = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || '0'), 0);

    return {
      total: total.toFixed(2),
      accounts: accounts.map((acc) => ({ name: acc.name, balance: acc.balance || '0.00' })),
    };
  }

  /**
   * Helper: Get non-current assets
   */
  private async getNonCurrentAssets(
    tenantId: string,
    _date: Date
  ): Promise<{ total: string; accounts: Array<{ name: string; balance: string }> }> {
    // Non-current assets: Property, Equipment, Investments, etc.
    // Accounts with code starting with "1.2" (simplified)
    const accounts = await db
      .select({
        name: chartOfAccounts.name,
        balance: chartOfAccounts.currentBalance,
      })
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.tenantId, tenantId),
          eq(chartOfAccounts.accountType, 'asset'),
          sql`${chartOfAccounts.code} LIKE '1.2%'`
        )
      );

    const total = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || '0'), 0);

    return {
      total: total.toFixed(2),
      accounts: accounts.map((acc) => ({ name: acc.name, balance: acc.balance || '0.00' })),
    };
  }

  /**
   * Helper: Get current liabilities
   */
  private async getCurrentLiabilities(
    tenantId: string,
    _date: Date
  ): Promise<{ total: string; accounts: Array<{ name: string; balance: string }> }> {
    const accounts = await db
      .select({
        name: chartOfAccounts.name,
        balance: chartOfAccounts.currentBalance,
      })
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.tenantId, tenantId),
          eq(chartOfAccounts.accountType, 'liability'),
          sql`${chartOfAccounts.code} LIKE '2.1%'`
        )
      );

    const total = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || '0'), 0);

    return {
      total: total.toFixed(2),
      accounts: accounts.map((acc) => ({ name: acc.name, balance: acc.balance || '0.00' })),
    };
  }

  /**
   * Helper: Get non-current liabilities
   */
  private async getNonCurrentLiabilities(
    tenantId: string,
    _date: Date
  ): Promise<{ total: string; accounts: Array<{ name: string; balance: string }> }> {
    const accounts = await db
      .select({
        name: chartOfAccounts.name,
        balance: chartOfAccounts.currentBalance,
      })
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.tenantId, tenantId),
          eq(chartOfAccounts.accountType, 'liability'),
          sql`${chartOfAccounts.code} LIKE '2.2%'`
        )
      );

    const total = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || '0'), 0);

    return {
      total: total.toFixed(2),
      accounts: accounts.map((acc) => ({ name: acc.name, balance: acc.balance || '0.00' })),
    };
  }

  /**
   * Helper: Get equity
   */
  private async getEquity(
    tenantId: string,
    _date: Date
  ): Promise<{ total: string; accounts: Array<{ name: string; balance: string }> }> {
    const accounts = await db
      .select({
        name: chartOfAccounts.name,
        balance: chartOfAccounts.currentBalance,
      })
      .from(chartOfAccounts)
      .where(
        and(eq(chartOfAccounts.tenantId, tenantId), eq(chartOfAccounts.accountType, 'equity'))
      );

    const total = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || '0'), 0);

    return {
      total: total.toFixed(2),
      accounts: accounts.map((acc) => ({ name: acc.name, balance: acc.balance || '0.00' })),
    };
  }

  /**
   * Helper: Get operating cash flow
   */
  private async getOperatingCashFlow(
    _tenantId: string,
    _fiscalPeriod: string
  ): Promise<{ total: string; items: Array<{ description: string; amount: string }> }> {
    // Simplified: Revenue - Expenses (from ledger)
    // In real implementation, this would include changes in working capital
    const items: Array<{ description: string; amount: string }> = [
      { description: 'Net Income', amount: '0.00' },
      { description: 'Depreciation & Amortization', amount: '0.00' },
      { description: 'Changes in Working Capital', amount: '0.00' },
    ];

    const total = items.reduce((sum, item) => sum + parseFloat(item.amount), 0);

    return {
      total: total.toFixed(2),
      items,
    };
  }

  /**
   * Helper: Get investing cash flow
   */
  private async getInvestingCashFlow(
    _tenantId: string,
    _fiscalPeriod: string
  ): Promise<{ total: string; items: Array<{ description: string; amount: string }> }> {
    const items: Array<{ description: string; amount: string }> = [
      { description: 'Purchase of Equipment', amount: '0.00' },
      { description: 'Sale of Investments', amount: '0.00' },
    ];

    const total = items.reduce((sum, item) => sum + parseFloat(item.amount), 0);

    return {
      total: total.toFixed(2),
      items,
    };
  }

  /**
   * Helper: Get financing cash flow
   */
  private async getFinancingCashFlow(
    _tenantId: string,
    _fiscalPeriod: string
  ): Promise<{ total: string; items: Array<{ description: string; amount: string }> }> {
    const items: Array<{ description: string; amount: string }> = [
      { description: 'Issuance of Stock', amount: '0.00' },
      { description: 'Repayment of Debt', amount: '0.00' },
      { description: 'Dividends Paid', amount: '0.00' },
    ];

    const total = items.reduce((sum, item) => sum + parseFloat(item.amount), 0);

    return {
      total: total.toFixed(2),
      items,
    };
  }

  /**
   * Helper: Get cash balances (opening and closing)
   */
  private async getCashBalances(
    tenantId: string,
    fiscalPeriod: string
  ): Promise<{ opening: number; closing: number }> {
    // Get cash accounts (code starts with "1.1.01")
    const cashAccounts = await db
      .select({ id: chartOfAccounts.id })
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.tenantId, tenantId),
          sql`${chartOfAccounts.code} LIKE '1.1.01%'`
        )
      );

    if (cashAccounts.length === 0) {
      return { opening: 0, closing: 0 };
    }

    // Get balances for the period
    const balances = await Promise.all(
      cashAccounts.map(async (account) => {
        const [balance] = await db
          .select({
            opening: accountBalances.openingBalance,
            closing: accountBalances.closingBalance,
          })
          .from(accountBalances)
          .where(
            and(
              eq(accountBalances.accountId, account.id),
              eq(accountBalances.fiscalPeriod, fiscalPeriod)
            )
          )
          .limit(1);

        return balance || { opening: '0.00', closing: '0.00' };
      })
    );

    const opening = balances.reduce((sum, b) => sum + parseFloat(b.opening), 0);
    const closing = balances.reduce((sum, b) => sum + parseFloat(b.closing), 0);

    return { opening, closing };
  }
}

// Export singleton instance
export const reportService = new ReportService();
