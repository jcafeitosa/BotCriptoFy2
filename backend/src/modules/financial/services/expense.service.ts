/**
 * Expense Service
 *
 * Gerenciamento de despesas operacionais com workflow de aprovação
 */

import { db } from '../../../db';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import {
  expenses,
  expenseCategories,
  type Expense,
  type NewExpense,
  type ExpenseCategory_,
  type NewExpenseCategory,
} from '../schema/expenses.schema';
import type { ServiceResponse, PaginatedResponse, ExpenseFilters } from '../types';
import logger from '@/utils/logger';

export class ExpenseService {
  /**
   * Create new expense
   */
  async create(data: NewExpense): Promise<ServiceResponse<Expense>> {
    try {
      // Calculate total
      const amount = parseFloat(data.amount);
      const taxAmount = parseFloat(data.taxAmount || '0');
      const totalAmount = amount + taxAmount;

      // Check if approval is required
      const requiresApproval = await this.checkApprovalRequired(
        data.tenantId,
        data.category,
        totalAmount.toString()
      );

      const [expense] = await db
        .insert(expenses)
        .values({
          ...data,
          totalAmount: totalAmount.toFixed(2),
          requiresApproval,
          status: requiresApproval ? 'pending_approval' : 'draft',
        })
        .returning();

      logger.info('Expense created', {
        expenseId: expense.id,
        expenseNumber: expense.expenseNumber,
        totalAmount: expense.totalAmount,
        requiresApproval,
      });

      return { success: true, data: expense };
    } catch (error) {
      logger.error('Error creating expense', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'EXPENSE_CREATE_ERROR',
      };
    }
  }

  /**
   * Check if expense requires approval
   */
  private async checkApprovalRequired(
    tenantId: string,
    category: string,
    amount: string
  ): Promise<boolean> {
    try {
      // Get category settings
      const [categorySettings] = await db
        .select()
        .from(expenseCategories)
        .where(and(eq(expenseCategories.tenantId, tenantId), eq(expenseCategories.slug, category)))
        .limit(1);

      if (!categorySettings) {
        return false;
      }

      if (!categorySettings.requiresApproval) {
        return false;
      }

      if (categorySettings.approvalThreshold) {
        return parseFloat(amount) >= parseFloat(categorySettings.approvalThreshold);
      }

      return true;
    } catch (error) {
      logger.error('Error checking approval requirement', { error });
      return false;
    }
  }

  /**
   * Get expense by ID
   */
  async getById(id: string, tenantId: string): Promise<ServiceResponse<Expense>> {
    try {
      const [expense] = await db
        .select()
        .from(expenses)
        .where(and(eq(expenses.id, id), eq(expenses.tenantId, tenantId)))
        .limit(1);

      if (!expense) {
        return {
          success: false,
          error: 'Expense not found',
          code: 'EXPENSE_NOT_FOUND',
        };
      }

      return { success: true, data: expense };
    } catch (error) {
      logger.error('Error fetching expense', { error, expenseId: id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'EXPENSE_FETCH_ERROR',
      };
    }
  }

  /**
   * List expenses with filters and pagination
   */
  async list(
    filters: ExpenseFilters,
    page = 1,
    pageSize = 20
  ): Promise<ServiceResponse<PaginatedResponse<Expense>>> {
    try {
      const conditions = [eq(expenses.tenantId, filters.tenantId)];

      if (filters.category) {
        conditions.push(eq(expenses.category, filters.category as any));
      }

      if (filters.status) {
        conditions.push(eq(expenses.status, filters.status as any));
      }

      if (filters.departmentId) {
        conditions.push(eq(expenses.departmentId, filters.departmentId));
      }

      if (filters.startDate) {
        conditions.push(gte(expenses.createdAt, filters.startDate));
      }

      if (filters.endDate) {
        conditions.push(lte(expenses.createdAt, filters.endDate));
      }

      const whereClause = and(...conditions);

      // Get total count
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(expenses)
        .where(whereClause);

      // Get paginated data
      const data = await db
        .select()
        .from(expenses)
        .where(whereClause)
        .orderBy(desc(expenses.createdAt))
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
      logger.error('Error listing expenses', { error, filters });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'EXPENSE_LIST_ERROR',
      };
    }
  }

  /**
   * Update expense
   */
  async update(
    id: string,
    tenantId: string,
    data: Partial<NewExpense>
  ): Promise<ServiceResponse<Expense>> {
    try {
      const [expense] = await db
        .update(expenses)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(and(eq(expenses.id, id), eq(expenses.tenantId, tenantId)))
        .returning();

      if (!expense) {
        return {
          success: false,
          error: 'Expense not found',
          code: 'EXPENSE_NOT_FOUND',
        };
      }

      logger.info('Expense updated', { expenseId: expense.id });

      return { success: true, data: expense };
    } catch (error) {
      logger.error('Error updating expense', { error, expenseId: id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'EXPENSE_UPDATE_ERROR',
      };
    }
  }

  /**
   * Delete expense
   */
  async delete(id: string, tenantId: string): Promise<ServiceResponse<void>> {
    try {
      const [expense] = await db
        .delete(expenses)
        .where(and(eq(expenses.id, id), eq(expenses.tenantId, tenantId)))
        .returning();

      if (!expense) {
        return {
          success: false,
          error: 'Expense not found',
          code: 'EXPENSE_NOT_FOUND',
        };
      }

      logger.info('Expense deleted', { expenseId: id });

      return { success: true };
    } catch (error) {
      logger.error('Error deleting expense', { error, expenseId: id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'EXPENSE_DELETE_ERROR',
      };
    }
  }

  /**
   * Approve expense
   */
  async approve(
    id: string,
    tenantId: string,
    approverId: string
  ): Promise<ServiceResponse<Expense>> {
    try {
      const [expense] = await db
        .update(expenses)
        .set({
          status: 'approved',
          approvedBy: approverId,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(expenses.id, id), eq(expenses.tenantId, tenantId)))
        .returning();

      if (!expense) {
        return {
          success: false,
          error: 'Expense not found',
          code: 'EXPENSE_NOT_FOUND',
        };
      }

      logger.info('Expense approved', {
        expenseId: expense.id,
        approverId,
      });

      return { success: true, data: expense };
    } catch (error) {
      logger.error('Error approving expense', { error, expenseId: id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'EXPENSE_APPROVE_ERROR',
      };
    }
  }

  /**
   * Reject expense
   */
  async reject(
    id: string,
    tenantId: string,
    rejectorId: string,
    reason: string
  ): Promise<ServiceResponse<Expense>> {
    try {
      const [expense] = await db
        .update(expenses)
        .set({
          status: 'rejected',
          rejectedBy: rejectorId,
          rejectedAt: new Date(),
          rejectionReason: reason,
          updatedAt: new Date(),
        })
        .where(and(eq(expenses.id, id), eq(expenses.tenantId, tenantId)))
        .returning();

      if (!expense) {
        return {
          success: false,
          error: 'Expense not found',
          code: 'EXPENSE_NOT_FOUND',
        };
      }

      logger.info('Expense rejected', {
        expenseId: expense.id,
        rejectorId,
        reason,
      });

      return { success: true, data: expense };
    } catch (error) {
      logger.error('Error rejecting expense', { error, expenseId: id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'EXPENSE_REJECT_ERROR',
      };
    }
  }

  /**
   * Get pending approvals
   */
  async getPendingApprovals(tenantId: string): Promise<ServiceResponse<Expense[]>> {
    try {
      const pendingExpenses = await db
        .select()
        .from(expenses)
        .where(and(eq(expenses.tenantId, tenantId), eq(expenses.status, 'pending_approval')))
        .orderBy(expenses.createdAt);

      return { success: true, data: pendingExpenses };
    } catch (error) {
      logger.error('Error fetching pending approvals', { error, tenantId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'PENDING_FETCH_ERROR',
      };
    }
  }

  /**
   * Category Management
   */

  async createCategory(data: NewExpenseCategory): Promise<ServiceResponse<ExpenseCategory_>> {
    try {
      const [category] = await db.insert(expenseCategories).values(data).returning();

      logger.info('Expense category created', {
        categoryId: category.id,
        name: category.name,
      });

      return { success: true, data: category };
    } catch (error) {
      logger.error('Error creating expense category', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'CATEGORY_CREATE_ERROR',
      };
    }
  }

  async listCategories(tenantId: string): Promise<ServiceResponse<ExpenseCategory_[]>> {
    try {
      const categories = await db
        .select()
        .from(expenseCategories)
        .where(eq(expenseCategories.tenantId, tenantId))
        .orderBy(expenseCategories.displayOrder);

      return { success: true, data: categories };
    } catch (error) {
      logger.error('Error listing expense categories', { error, tenantId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'CATEGORY_LIST_ERROR',
      };
    }
  }

  /**
   * Get expenses by category (for budget tracking)
   */
  async getByCategory(
    tenantId: string,
    category: string,
    startDate: Date,
    endDate: Date
  ): Promise<ServiceResponse<{ total: string; count: number }>> {
    try {
      const [result] = await db
        .select({
          total: sql<string>`COALESCE(SUM(${expenses.totalAmount}), 0)::text`,
          count: sql<number>`COUNT(*)::int`,
        })
        .from(expenses)
        .where(
          and(
            eq(expenses.tenantId, tenantId),
            eq(expenses.category, category as any),
            gte(expenses.createdAt, startDate),
            lte(expenses.createdAt, endDate),
            sql`${expenses.status} NOT IN ('draft', 'rejected', 'cancelled')`
          )
        );

      return { success: true, data: result };
    } catch (error) {
      logger.error('Error getting expenses by category', { error, tenantId, category });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'CATEGORY_EXPENSES_ERROR',
      };
    }
  }
}

// Export singleton instance
export const expenseService = new ExpenseService();
