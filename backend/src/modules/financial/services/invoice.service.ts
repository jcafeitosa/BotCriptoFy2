/**
 * Invoice Service
 *
 * Gerenciamento de faturas (AR/AP)
 */

import { db } from '../../../db';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import {
  invoices,
  invoicePayments,
  invoiceReminders,
  type Invoice,
  type NewInvoice,
  type InvoicePayment,
  type NewInvoicePayment,
  type InvoiceReminder,
  type NewInvoiceReminder,
} from '../schema/invoices.schema';
import type { ServiceResponse, PaginatedResponse, InvoiceFilters } from '../types';
import logger from '@/utils/logger';

export class InvoiceService {
  /**
   * Create new invoice
   */
  async create(data: NewInvoice): Promise<ServiceResponse<Invoice>> {
    try {
      // Calculate totals
      const subtotal = parseFloat(data.subtotal);
      const discountAmount = parseFloat(data.discountAmount || '0');
      const taxAmount = parseFloat(data.taxAmount || '0');
      const totalAmount = subtotal - discountAmount + taxAmount;

      const [invoice] = await db
        .insert(invoices)
        .values({
          ...data,
          totalAmount: totalAmount.toFixed(2),
          remainingAmount: totalAmount.toFixed(2),
        })
        .returning();

      logger.info('Invoice created', {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount,
      });

      return { success: true, data: invoice };
    } catch (error) {
      logger.error('Error creating invoice', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'INVOICE_CREATE_ERROR',
      };
    }
  }

  /**
   * Get invoice by ID
   */
  async getById(id: string, tenantId: string): Promise<ServiceResponse<Invoice>> {
    try {
      const [invoice] = await db
        .select()
        .from(invoices)
        .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)))
        .limit(1);

      if (!invoice) {
        return {
          success: false,
          error: 'Invoice not found',
          code: 'INVOICE_NOT_FOUND',
        };
      }

      return { success: true, data: invoice };
    } catch (error) {
      logger.error('Error fetching invoice', { error, invoiceId: id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'INVOICE_FETCH_ERROR',
      };
    }
  }

  /**
   * List invoices with filters and pagination
   */
  async list(
    filters: InvoiceFilters,
    page = 1,
    pageSize = 20
  ): Promise<ServiceResponse<PaginatedResponse<Invoice>>> {
    try {
      const conditions = [eq(invoices.tenantId, filters.tenantId)];

      if (filters.type) {
        conditions.push(eq(invoices.type, filters.type));
      }

      if (filters.status) {
        conditions.push(eq(invoices.status, filters.status as any));
      }

      if (filters.customerId) {
        conditions.push(eq(invoices.customerId, filters.customerId));
      }

      if (filters.supplierId) {
        conditions.push(eq(invoices.supplierId, filters.supplierId));
      }

      if (filters.startDate) {
        conditions.push(gte(invoices.issueDate, filters.startDate));
      }

      if (filters.endDate) {
        conditions.push(lte(invoices.issueDate, filters.endDate));
      }

      const whereClause = and(...conditions);

      // Get total count
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(invoices)
        .where(whereClause);

      // Get paginated data
      const data = await db
        .select()
        .from(invoices)
        .where(whereClause)
        .orderBy(desc(invoices.issueDate))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      return {
        success: true,
        data: {
          data,
          total: count,
          page,
          pageSize,
          totalPages: Math.ceil(count / pageSize),
        },
      };
    } catch (error) {
      logger.error('Error listing invoices', { error, filters });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'INVOICE_LIST_ERROR',
      };
    }
  }

  /**
   * Update invoice
   */
  async update(
    id: string,
    tenantId: string,
    data: Partial<NewInvoice>
  ): Promise<ServiceResponse<Invoice>> {
    try {
      const [invoice] = await db
        .update(invoices)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)))
        .returning();

      if (!invoice) {
        return {
          success: false,
          error: 'Invoice not found',
          code: 'INVOICE_NOT_FOUND',
        };
      }

      logger.info('Invoice updated', { invoiceId: invoice.id });

      return { success: true, data: invoice };
    } catch (error) {
      logger.error('Error updating invoice', { error, invoiceId: id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'INVOICE_UPDATE_ERROR',
      };
    }
  }

  /**
   * Delete invoice
   */
  async delete(id: string, tenantId: string): Promise<ServiceResponse<void>> {
    try {
      const [invoice] = await db
        .delete(invoices)
        .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)))
        .returning();

      if (!invoice) {
        return {
          success: false,
          error: 'Invoice not found',
          code: 'INVOICE_NOT_FOUND',
        };
      }

      logger.info('Invoice deleted', { invoiceId: id });

      return { success: true };
    } catch (error) {
      logger.error('Error deleting invoice', { error, invoiceId: id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'INVOICE_DELETE_ERROR',
      };
    }
  }

  /**
   * Add payment to invoice
   */
  async addPayment(
    invoiceId: string,
    tenantId: string,
    paymentData: Omit<NewInvoicePayment, 'invoiceId' | 'tenantId'>
  ): Promise<ServiceResponse<InvoicePayment>> {
    try {
      // Get current invoice
      const invoiceResult = await this.getById(invoiceId, tenantId);
      if (!invoiceResult.success || !invoiceResult.data) {
        return {
          success: false,
          error: 'Invoice not found',
          code: 'INVOICE_NOT_FOUND',
        };
      }

      const invoice = invoiceResult.data;
      const paymentAmount = parseFloat(paymentData.amount);
      const currentPaid = parseFloat(invoice.paidAmount || '0');
      const newPaidAmount = currentPaid + paymentAmount;
      const newRemainingAmount = parseFloat(invoice.totalAmount) - newPaidAmount;

      // Create payment record
      const [payment] = await db
        .insert(invoicePayments)
        .values({
          ...paymentData,
          invoiceId,
          tenantId,
        })
        .returning();

      // Update invoice payment status
      const newPaymentStatus =
        newRemainingAmount <= 0 ? 'paid' : newRemainingAmount < parseFloat(invoice.totalAmount) ? 'partial' : 'pending';

      await db
        .update(invoices)
        .set({
          paidAmount: newPaidAmount.toFixed(2),
          remainingAmount: newRemainingAmount.toFixed(2),
          paymentStatus: newPaymentStatus,
          paidDate: newRemainingAmount <= 0 ? new Date() : null,
          status: newRemainingAmount <= 0 ? 'paid' : invoice.status,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, invoiceId));

      logger.info('Payment added to invoice', {
        invoiceId,
        paymentId: payment.id,
        amount: payment.amount,
        newPaymentStatus,
      });

      return { success: true, data: payment };
    } catch (error) {
      logger.error('Error adding payment', { error, invoiceId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'PAYMENT_ADD_ERROR',
      };
    }
  }

  /**
   * Get invoice payments
   */
  async getPayments(
    invoiceId: string,
    tenantId: string
  ): Promise<ServiceResponse<InvoicePayment[]>> {
    try {
      const payments = await db
        .select()
        .from(invoicePayments)
        .where(and(eq(invoicePayments.invoiceId, invoiceId), eq(invoicePayments.tenantId, tenantId)))
        .orderBy(desc(invoicePayments.paymentDate));

      return { success: true, data: payments };
    } catch (error) {
      logger.error('Error fetching payments', { error, invoiceId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'PAYMENT_FETCH_ERROR',
      };
    }
  }

  /**
   * Create invoice reminder
   */
  async createReminder(
    invoiceId: string,
    tenantId: string,
    reminderData: Omit<NewInvoiceReminder, 'invoiceId' | 'tenantId'>
  ): Promise<ServiceResponse<InvoiceReminder>> {
    try {
      const [reminder] = await db
        .insert(invoiceReminders)
        .values({
          ...reminderData,
          invoiceId,
          tenantId,
        })
        .returning();

      logger.info('Invoice reminder created', {
        invoiceId,
        reminderId: reminder.id,
      });

      return { success: true, data: reminder };
    } catch (error) {
      logger.error('Error creating reminder', { error, invoiceId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'REMINDER_CREATE_ERROR',
      };
    }
  }

  /**
   * Update invoice status
   */
  async updateStatus(
    id: string,
    tenantId: string,
    status: typeof invoices.status.enumValues[number]
  ): Promise<ServiceResponse<Invoice>> {
    try {
      const [invoice] = await db
        .update(invoices)
        .set({
          status: status as any,
          updatedAt: new Date(),
        })
        .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)))
        .returning();

      if (!invoice) {
        return {
          success: false,
          error: 'Invoice not found',
          code: 'INVOICE_NOT_FOUND',
        };
      }

      logger.info('Invoice status updated', { invoiceId: id, status });

      return { success: true, data: invoice };
    } catch (error) {
      logger.error('Error updating invoice status', { error, invoiceId: id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'STATUS_UPDATE_ERROR',
      };
    }
  }

  /**
   * Get overdue invoices
   */
  async getOverdue(tenantId: string): Promise<ServiceResponse<Invoice[]>> {
    try {
      const today = new Date();
      const overdueInvoices = await db
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.tenantId, tenantId),
            eq(invoices.type, 'income'),
            lte(invoices.dueDate, today),
            sql`${invoices.paymentStatus} != 'paid'`
          )
        )
        .orderBy(invoices.dueDate);

      return { success: true, data: overdueInvoices };
    } catch (error) {
      logger.error('Error fetching overdue invoices', { error, tenantId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'OVERDUE_FETCH_ERROR',
      };
    }
  }
}

// Export singleton instance
export const invoiceService = new InvoiceService();
