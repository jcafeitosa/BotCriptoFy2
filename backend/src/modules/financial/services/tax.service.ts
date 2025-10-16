/**
 * Tax Service
 *
 * Gerenciamento de impostos e obrigações fiscais (Brazilian)
 */

import { db } from '../../../db';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import {
  taxRates,
  taxRecords,
  taxObligations,
  taxFilings,
  type TaxRate,
  type NewTaxRate,
  type TaxRecord,
  type NewTaxRecord,
  type TaxObligation,
  type NewTaxObligation,
  type TaxFiling,
  type NewTaxFiling,
  type TaxType,
} from '../schema/tax.schema';
import type { ServiceResponse } from '../types';
import logger from '@/utils/logger';

export class TaxService {
  /**
   * Calculate tax amount based on tax type and taxable amount
   */
  async calculateTax(
    tenantId: string,
    taxType: TaxType,
    taxableAmount: string,
    stateCode?: string,
    cityCode?: string
  ): Promise<ServiceResponse<{ taxRate: string; taxAmount: string; netAmount: string }>> {
    try {
      // Get applicable tax rate
      const today = new Date();
      const conditions = [
        eq(taxRates.tenantId, tenantId),
        eq(taxRates.taxType, taxType),
        eq(taxRates.isActive, true),
        lte(taxRates.effectiveFrom, today),
      ];

      if (stateCode) {
        conditions.push(eq(taxRates.stateCode, stateCode));
      }

      if (cityCode) {
        conditions.push(eq(taxRates.cityCode, cityCode));
      }

      const [rate] = await db
        .select()
        .from(taxRates)
        .where(and(...conditions))
        .orderBy(desc(taxRates.effectiveFrom))
        .limit(1);

      if (!rate) {
        return {
          success: false,
          error: `Tax rate not found for ${taxType}`,
          code: 'RATE_NOT_FOUND',
        };
      }

      const taxableAmountNum = parseFloat(taxableAmount);
      const taxRateNum = parseFloat(rate.rate);
      const taxAmount = (taxableAmountNum * taxRateNum) / 100;
      const netAmount = taxableAmountNum - taxAmount;

      return {
        success: true,
        data: {
          taxRate: rate.rate,
          taxAmount: taxAmount.toFixed(2),
          netAmount: netAmount.toFixed(2),
        },
      };
    } catch (error) {
      logger.error('Error calculating tax', { error, taxType });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'TAX_CALC_ERROR',
      };
    }
  }

  /**
   * Create tax record
   */
  async createRecord(data: NewTaxRecord): Promise<ServiceResponse<TaxRecord>> {
    try {
      const [record] = await db.insert(taxRecords).values(data).returning();

      logger.info('Tax record created', {
        recordId: record.id,
        recordNumber: record.recordNumber,
        taxType: record.taxType,
        taxAmount: record.taxAmount,
      });

      return { success: true, data: record };
    } catch (error) {
      logger.error('Error creating tax record', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'RECORD_CREATE_ERROR',
      };
    }
  }

  /**
   * Get tax records for period
   */
  async getRecordsForPeriod(
    tenantId: string,
    fiscalPeriod: string
  ): Promise<ServiceResponse<TaxRecord[]>> {
    try {
      const records = await db
        .select()
        .from(taxRecords)
        .where(and(eq(taxRecords.tenantId, tenantId), eq(taxRecords.fiscalPeriod, fiscalPeriod)))
        .orderBy(taxRecords.taxType, taxRecords.dueDate);

      return { success: true, data: records };
    } catch (error) {
      logger.error('Error fetching tax records', { error, tenantId, fiscalPeriod });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'RECORDS_FETCH_ERROR',
      };
    }
  }

  /**
   * Get overdue tax records
   */
  async getOverdueRecords(tenantId: string): Promise<ServiceResponse<TaxRecord[]>> {
    try {
      const today = new Date();
      const records = await db
        .select()
        .from(taxRecords)
        .where(
          and(
            eq(taxRecords.tenantId, tenantId),
            lte(taxRecords.dueDate, today),
            sql`${taxRecords.status} != 'paid'`
          )
        )
        .orderBy(taxRecords.dueDate);

      return { success: true, data: records };
    } catch (error) {
      logger.error('Error fetching overdue tax records', { error, tenantId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'OVERDUE_FETCH_ERROR',
      };
    }
  }

  /**
   * Mark tax record as paid
   */
  async markAsPaid(
    recordId: string,
    tenantId: string,
    paidAmount: string,
    paidDate: Date,
    paymentMethod: string,
    paymentReference: string
  ): Promise<ServiceResponse<TaxRecord>> {
    try {
      const [record] = await db
        .update(taxRecords)
        .set({
          paidAmount,
          paidDate,
          paymentMethod,
          paymentReference,
          status: 'paid',
          updatedAt: new Date(),
        })
        .where(and(eq(taxRecords.id, recordId), eq(taxRecords.tenantId, tenantId)))
        .returning();

      if (!record) {
        return {
          success: false,
          error: 'Tax record not found',
          code: 'RECORD_NOT_FOUND',
        };
      }

      logger.info('Tax record marked as paid', {
        recordId,
        paidAmount,
        paymentMethod,
      });

      return { success: true, data: record };
    } catch (error) {
      logger.error('Error marking tax as paid', { error, recordId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'PAYMENT_UPDATE_ERROR',
      };
    }
  }

  /**
   * Tax Obligations Management
   */

  async createObligation(data: NewTaxObligation): Promise<ServiceResponse<TaxObligation>> {
    try {
      const [obligation] = await db.insert(taxObligations).values(data).returning();

      logger.info('Tax obligation created', {
        obligationId: obligation.id,
        name: obligation.name,
        code: obligation.code,
      });

      return { success: true, data: obligation };
    } catch (error) {
      logger.error('Error creating tax obligation', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'OBLIGATION_CREATE_ERROR',
      };
    }
  }

  async listObligations(tenantId: string): Promise<ServiceResponse<TaxObligation[]>> {
    try {
      const obligations = await db
        .select()
        .from(taxObligations)
        .where(and(eq(taxObligations.tenantId, tenantId), eq(taxObligations.isActive, true)))
        .orderBy(taxObligations.name);

      return { success: true, data: obligations };
    } catch (error) {
      logger.error('Error listing tax obligations', { error, tenantId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'OBLIGATIONS_LIST_ERROR',
      };
    }
  }

  /**
   * Tax Filings Management
   */

  async createFiling(data: NewTaxFiling): Promise<ServiceResponse<TaxFiling>> {
    try {
      const [filing] = await db.insert(taxFilings).values(data).returning();

      logger.info('Tax filing created', {
        filingId: filing.id,
        obligationId: filing.obligationId,
        fiscalPeriod: filing.fiscalPeriod,
      });

      return { success: true, data: filing };
    } catch (error) {
      logger.error('Error creating tax filing', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'FILING_CREATE_ERROR',
      };
    }
  }

  async submitFiling(
    filingId: string,
    tenantId: string,
    filedBy: string,
    receiptNumber: string,
    protocolNumber: string
  ): Promise<ServiceResponse<TaxFiling>> {
    try {
      const [filing] = await db
        .update(taxFilings)
        .set({
          status: 'filed',
          filedDate: new Date(),
          filedBy,
          receiptNumber,
          protocolNumber,
          updatedAt: new Date(),
        })
        .where(and(eq(taxFilings.id, filingId), eq(taxFilings.tenantId, tenantId)))
        .returning();

      if (!filing) {
        return {
          success: false,
          error: 'Filing not found',
          code: 'FILING_NOT_FOUND',
        };
      }

      logger.info('Tax filing submitted', {
        filingId,
        receiptNumber,
        protocolNumber,
      });

      return { success: true, data: filing };
    } catch (error) {
      logger.error('Error submitting filing', { error, filingId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'FILING_SUBMIT_ERROR',
      };
    }
  }

  async getUpcomingFilings(tenantId: string, days = 30): Promise<ServiceResponse<TaxFiling[]>> {
    try {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + days);

      const filings = await db
        .select()
        .from(taxFilings)
        .where(
          and(
            eq(taxFilings.tenantId, tenantId),
            gte(taxFilings.dueDate, today),
            lte(taxFilings.dueDate, futureDate),
            sql`${taxFilings.status} != 'filed'`
          )
        )
        .orderBy(taxFilings.dueDate);

      return { success: true, data: filings };
    } catch (error) {
      logger.error('Error fetching upcoming filings', { error, tenantId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'UPCOMING_FETCH_ERROR',
      };
    }
  }

  /**
   * Tax Rate Management
   */

  async createRate(data: NewTaxRate): Promise<ServiceResponse<TaxRate>> {
    try {
      const [rate] = await db.insert(taxRates).values(data).returning();

      logger.info('Tax rate created', {
        rateId: rate.id,
        taxType: rate.taxType,
        rate: rate.rate,
      });

      return { success: true, data: rate };
    } catch (error) {
      logger.error('Error creating tax rate', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'RATE_CREATE_ERROR',
      };
    }
  }

  async listRates(tenantId: string, taxType?: TaxType): Promise<ServiceResponse<TaxRate[]>> {
    try {
      const conditions = [eq(taxRates.tenantId, tenantId), eq(taxRates.isActive, true)];

      if (taxType) {
        conditions.push(eq(taxRates.taxType, taxType));
      }

      const rates = await db
        .select()
        .from(taxRates)
        .where(and(...conditions))
        .orderBy(taxRates.taxType, desc(taxRates.effectiveFrom));

      return { success: true, data: rates };
    } catch (error) {
      logger.error('Error listing tax rates', { error, tenantId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'RATES_LIST_ERROR',
      };
    }
  }

  /**
   * Get tax summary for period
   */
  async getTaxSummary(
    tenantId: string,
    fiscalPeriod: string
  ): Promise<
    ServiceResponse<
      Array<{
        taxType: string;
        totalTaxable: string;
        totalTax: string;
        totalPaid: string;
        totalDue: string;
      }>
    >
  > {
    try {
      const summary = await db
        .select({
          taxType: taxRecords.taxType,
          totalTaxable: sql<string>`SUM(${taxRecords.taxableAmount})::text`,
          totalTax: sql<string>`SUM(${taxRecords.taxAmount})::text`,
          totalPaid: sql<string>`SUM(${taxRecords.paidAmount})::text`,
          totalDue: sql<string>`SUM(${taxRecords.netTaxAmount} - ${taxRecords.paidAmount})::text`,
        })
        .from(taxRecords)
        .where(and(eq(taxRecords.tenantId, tenantId), eq(taxRecords.fiscalPeriod, fiscalPeriod)))
        .groupBy(taxRecords.taxType)
        .orderBy(taxRecords.taxType);

      return { success: true, data: summary };
    } catch (error) {
      logger.error('Error getting tax summary', { error, tenantId, fiscalPeriod });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'SUMMARY_ERROR',
      };
    }
  }
}

// Export singleton instance
export const taxService = new TaxService();
