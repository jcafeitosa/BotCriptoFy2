/**
 * Tax Report Service
 * Generates automated fiscal reports based on current jurisdiction
 * Supports Brazil (ICMS, ISS, PIS, COFINS, IRPJ, CSLL) and Estonia (VAT, CIT)
 */

import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { db } from '../../../db';
import {
  taxReports,
  type TaxReport,
} from '../schema/tax-jurisdiction.schema';
import { invoices } from '../schema/invoices.schema';
import { expenses } from '../schema/expenses.schema';
import { taxJurisdictionService } from './tax-jurisdiction.service';
import type { TaxJurisdiction } from '../types/tax-jurisdiction.types';

/**
 * Report generation configuration
 */
interface ReportConfig {
  tenantId: string;
  reportType: 'monthly' | 'quarterly' | 'annual' | 'custom';
  fiscalYear: string;
  fiscalPeriod: string;
  periodStartDate: Date;
  periodEndDate: Date;
  generatedBy: string;
  generationMethod: 'automatic' | 'manual' | 'scheduled';
}

/**
 * Report data structure
 */
interface TaxReportData {
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    totalTaxableAmount: number;
    totalTaxAmount: number;
    netIncome: number;
  };
  taxBreakdown: Array<{
    taxType: string;
    taxableBasis: number;
    rate: number;
    taxAmount: number;
    description: string;
  }>;
  deductions: Array<{
    type: string;
    amount: number;
    description: string;
  }>;
  complianceData?: {
    jurisdiction: TaxJurisdiction;
    filingDeadline: Date;
    requiredDocuments: string[];
    specialNotes: string[];
  };
}

/**
 * Tax Report Service
 */
export class TaxReportService {
  /**
   * Generate comprehensive tax report for a period
   */
  async generateReport(config: ReportConfig): Promise<{
    success: boolean;
    data?: TaxReport;
    error?: string;
  }> {
    try {
      // Get current jurisdiction
      const currentJurisdiction = taxJurisdictionService.getCurrentJurisdiction();
      if (!currentJurisdiction) {
        return {
          success: false,
          error: 'Tax jurisdiction not configured. CEO must configure jurisdiction first.',
        };
      }

      // Collect financial data for the period
      const financialData = await this.collectFinancialData(
        config.tenantId,
        config.periodStartDate,
        config.periodEndDate,
      );

      // Calculate taxes based on jurisdiction
      const reportData =
        currentJurisdiction.jurisdiction === 'BR'
          ? await this.generateBrazilReport(financialData, config)
          : await this.generateEstoniaReport(financialData, config);

      // Save report to database
      const [savedReport] = await db
        .insert(taxReports)
        .values({
          tenantId: config.tenantId,
          reportType: config.reportType,
          reportName: this.generateReportName(currentJurisdiction.jurisdiction, config),
          jurisdiction: currentJurisdiction.jurisdiction,
          fiscalYear: config.fiscalYear,
          fiscalPeriod: config.fiscalPeriod,
          periodStartDate: config.periodStartDate,
          periodEndDate: config.periodEndDate,
          reportData: reportData as any,
          status: 'ready',
          generatedAt: new Date(),
          generatedBy: config.generatedBy,
          generationMethod: config.generationMethod,
        })
        .returning();

      return {
        success: true,
        data: savedReport,
      };
    } catch (error) {
      console.error('Failed to generate tax report:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Report generation failed',
      };
    }
  }

  /**
   * Generate Brazil tax report
   */
  private async generateBrazilReport(
    data: any,
    config: ReportConfig,
  ): Promise<TaxReportData> {
    const { totalRevenue, totalExpenses } = data;

    // Calculate Brazilian taxes
    const icmsRate = 0.18; // 18% ICMS (São Paulo)
    const issRate = 0.05; // 5% ISS
    const pisRate = 0.0165; // 1.65% PIS
    const cofinsRate = 0.076; // 7.6% COFINS
    const irpjRate = 0.15; // 15% IRPJ
    const csllRate = 0.09; // 9% CSLL

    // ICMS (state VAT on goods)
    const icmsAmount = totalRevenue * icmsRate;

    // ISS (service tax)
    const issAmount = totalRevenue * issRate;

    // PIS and COFINS (federal contributions)
    const pisAmount = totalRevenue * pisRate;
    const cofinsAmount = totalRevenue * cofinsRate;

    // IRPJ and CSLL (corporate income tax)
    const grossProfit = totalRevenue - totalExpenses;
    const taxableProfitIRPJ = Math.max(grossProfit, 0);
    const irpjAmount = taxableProfitIRPJ * irpjRate;
    const csllAmount = taxableProfitIRPJ * csllRate;

    // Total taxes
    const totalTaxAmount =
      icmsAmount + issAmount + pisAmount + cofinsAmount + irpjAmount + csllAmount;

    // Net income after taxes
    const netIncome = grossProfit - totalTaxAmount;

    // Filing deadline (20th of next month for Brazil)
    const filingDeadline = new Date(config.periodEndDate);
    filingDeadline.setMonth(filingDeadline.getMonth() + 1);
    filingDeadline.setDate(20);

    return {
      summary: {
        totalRevenue,
        totalExpenses,
        totalTaxableAmount: totalRevenue,
        totalTaxAmount: Math.round(totalTaxAmount * 100) / 100,
        netIncome: Math.round(netIncome * 100) / 100,
      },
      taxBreakdown: [
        {
          taxType: 'ICMS',
          taxableBasis: totalRevenue,
          rate: icmsRate * 100,
          taxAmount: Math.round(icmsAmount * 100) / 100,
          description: 'Imposto sobre Circulação de Mercadorias e Serviços (State VAT)',
        },
        {
          taxType: 'ISS',
          taxableBasis: totalRevenue,
          rate: issRate * 100,
          taxAmount: Math.round(issAmount * 100) / 100,
          description: 'Imposto sobre Serviços (Municipal Service Tax)',
        },
        {
          taxType: 'PIS',
          taxableBasis: totalRevenue,
          rate: pisRate * 100,
          taxAmount: Math.round(pisAmount * 100) / 100,
          description: 'Programa de Integração Social',
        },
        {
          taxType: 'COFINS',
          taxableBasis: totalRevenue,
          rate: cofinsRate * 100,
          taxAmount: Math.round(cofinsAmount * 100) / 100,
          description: 'Contribuição para Financiamento da Seguridade Social',
        },
        {
          taxType: 'IRPJ',
          taxableBasis: taxableProfitIRPJ,
          rate: irpjRate * 100,
          taxAmount: Math.round(irpjAmount * 100) / 100,
          description: 'Imposto de Renda Pessoa Jurídica (Corporate Income Tax)',
        },
        {
          taxType: 'CSLL',
          taxableBasis: taxableProfitIRPJ,
          rate: csllRate * 100,
          taxAmount: Math.round(csllAmount * 100) / 100,
          description: 'Contribuição Social sobre o Lucro Líquido',
        },
      ],
      deductions: [
        {
          type: 'Operational Expenses',
          amount: totalExpenses,
          description: 'Total deductible operational expenses',
        },
      ],
      complianceData: {
        jurisdiction: 'BR',
        filingDeadline,
        requiredDocuments: [
          'NF-e (Nota Fiscal Eletrônica)',
          'SPED Fiscal',
          'SPED Contribuições',
          'DCTF (Declaração de Débitos e Créditos Tributários Federais)',
          'EFD-Reinf (Escrituração Fiscal Digital de Retenções)',
        ],
        specialNotes: [
          'ICMS rate may vary by state (18% for São Paulo)',
          'ISS rate may vary by municipality (5% average)',
          'IRPJ additional 10% on profits above R$ 20,000/month',
          'All invoices must be submitted via NF-e system',
          'SPED filings must be submitted by 5th business day of next month',
        ],
      },
    };
  }

  /**
   * Generate Estonia tax report
   */
  private async generateEstoniaReport(
    data: any,
    config: ReportConfig,
  ): Promise<TaxReportData> {
    const { totalRevenue, totalExpenses } = data;

    // Calculate Estonian taxes
    const vatRate = 0.22; // 22% standard VAT (Estonia)
    const _citRate = 0.2; // 20% CIT (only on distributions)

    // VAT calculation (standard rate)
    const vatAmount = totalRevenue * vatRate;

    // Corporate Income Tax (only on distributed profits)
    const grossProfit = totalRevenue - totalExpenses;
    const retainedProfit = Math.max(grossProfit, 0);

    // In Estonia, CIT is 0% on retained profits
    // Tax is only paid when distributing dividends (20/80 formula)
    const _citAmount = 0; // Zero until distribution
    const potentialDistributionTax = retainedProfit > 0 ? (retainedProfit * 20) / 80 : 0;

    // Total current taxes (only VAT for now)
    const totalTaxAmount = vatAmount;

    // Net income (before any distribution)
    const netIncome = grossProfit - totalTaxAmount;

    // Filing deadline (20th of next month for Estonia)
    const filingDeadline = new Date(config.periodEndDate);
    filingDeadline.setMonth(filingDeadline.getMonth() + 1);
    filingDeadline.setDate(20);

    return {
      summary: {
        totalRevenue,
        totalExpenses,
        totalTaxableAmount: totalRevenue,
        totalTaxAmount: Math.round(totalTaxAmount * 100) / 100,
        netIncome: Math.round(netIncome * 100) / 100,
      },
      taxBreakdown: [
        {
          taxType: 'VAT',
          taxableBasis: totalRevenue,
          rate: vatRate * 100,
          taxAmount: Math.round(vatAmount * 100) / 100,
          description: 'Value Added Tax (Käibemaks)',
        },
        {
          taxType: 'CIT (Retained)',
          taxableBasis: retainedProfit,
          rate: 0,
          taxAmount: 0,
          description:
            'Corporate Income Tax on Retained Profits (0% - Estonia unique feature)',
        },
        {
          taxType: 'CIT (Potential Distribution)',
          taxableBasis: retainedProfit,
          rate: 20,
          taxAmount: Math.round(potentialDistributionTax * 100) / 100,
          description: 'Potential tax if profits are distributed as dividends (20/80)',
        },
      ],
      deductions: [
        {
          type: 'Operational Expenses',
          amount: totalExpenses,
          description: 'Total deductible operational expenses',
        },
      ],
      complianceData: {
        jurisdiction: 'EE',
        filingDeadline,
        requiredDocuments: [
          'VAT Declaration (KMD INF)',
          'E-Invoice Records',
          'Annual Report (if required)',
          'Corporate Income Tax Declaration (only if distributing)',
        ],
        specialNotes: [
          'Estonia has 0% corporate tax on retained profits',
          'Tax is only paid when distributing profits (20/80 formula)',
          'VAT returns must be filed monthly via e-MTA',
          'E-invoicing is mandatory for B2B transactions',
          'Annual reports due by June 30th of following year',
          'E-Residency compatible - can file from anywhere',
        ],
      },
    };
  }

  /**
   * Collect financial data for period
   */
  private async collectFinancialData(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalRevenue: number;
    totalExpenses: number;
    invoiceCount: number;
    expenseCount: number;
  }> {
    try {
      // Get all invoices for period
      const periodInvoices = await db
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.tenantId, tenantId),
            gte(invoices.issueDate, startDate),
            lte(invoices.issueDate, endDate),
            eq(invoices.status, 'paid'),
          ),
        );

      // Get all expenses for period
      const periodExpenses = await db
        .select()
        .from(expenses)
        .where(
          and(
            eq(expenses.tenantId, tenantId),
            gte(expenses.receiptDate, startDate),
            lte(expenses.receiptDate, endDate),
            eq(expenses.status, 'approved'),
          ),
        );

      // Calculate totals
      const totalRevenue = periodInvoices.reduce(
        (sum, inv) => sum + parseFloat(inv.totalAmount),
        0,
      );

      const totalExpenses = periodExpenses.reduce(
        (sum, exp) => sum + parseFloat(exp.amount),
        0,
      );

      return {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        invoiceCount: periodInvoices.length,
        expenseCount: periodExpenses.length,
      };
    } catch (error) {
      console.error('Failed to collect financial data:', error);
      // Return zeros if data collection fails
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        invoiceCount: 0,
        expenseCount: 0,
      };
    }
  }

  /**
   * Generate report name
   */
  private generateReportName(jurisdiction: TaxJurisdiction, config: ReportConfig): string {
    const jurisdictionName = jurisdiction === 'BR' ? 'Brazil' : 'Estonia';
    const reportTypeName = {
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      annual: 'Annual',
      custom: 'Custom',
    }[config.reportType];

    return `${jurisdictionName} ${reportTypeName} Tax Report - ${config.fiscalPeriod}`;
  }

  /**
   * Get reports for tenant
   */
  async getReports(
    tenantId: string,
    limit: number = 50,
  ): Promise<{
    success: boolean;
    data?: TaxReport[];
    error?: string;
  }> {
    try {
      const reports = await db
        .select()
        .from(taxReports)
        .where(eq(taxReports.tenantId, tenantId))
        .orderBy(desc(taxReports.generatedAt))
        .limit(limit);

      return {
        success: true,
        data: reports,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch reports',
      };
    }
  }

  /**
   * Get specific report by ID
   */
  async getReportById(
    reportId: string,
    tenantId: string,
  ): Promise<{
    success: boolean;
    data?: TaxReport;
    error?: string;
  }> {
    try {
      const [report] = await db
        .select()
        .from(taxReports)
        .where(and(eq(taxReports.id, reportId), eq(taxReports.tenantId, tenantId)))
        .limit(1);

      if (!report) {
        return {
          success: false,
          error: 'Report not found',
        };
      }

      return {
        success: true,
        data: report,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch report',
      };
    }
  }

  /**
   * Delete report
   */
  async deleteReport(
    reportId: string,
    tenantId: string,
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await db
        .delete(taxReports)
        .where(and(eq(taxReports.id, reportId), eq(taxReports.tenantId, tenantId)));

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete report',
      };
    }
  }

  /**
   * Mark report as filed
   */
  async markAsFiled(
    reportId: string,
    tenantId: string,
    filedBy: string,
    filingReference?: string,
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await db
        .update(taxReports)
        .set({
          status: 'filed',
          filedAt: new Date(),
          filedBy,
          filingReference,
          updatedAt: new Date(),
        })
        .where(and(eq(taxReports.id, reportId), eq(taxReports.tenantId, tenantId)));

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update report',
      };
    }
  }
}

// Export singleton instance
export const taxReportService = new TaxReportService();
