/**
 * Budget Service
 *
 * Gerenciamento de orçamentos e controle de gastos
 */

import { db } from '../../../db';
import { eq, and, desc, sql } from 'drizzle-orm';
import {
  budgets,
  budgetLines,
  budgetAlerts,
  budgetAdjustments,
  type Budget,
  type NewBudget,
  type BudgetLine,
  type NewBudgetLine,
  type BudgetAlert,
  type BudgetAdjustment,
  type NewBudgetAdjustment,
  type AlertSeverity,
} from '../schema/budgets.schema';
import type { ServiceResponse } from '../types';
import logger from '@/utils/logger';
import { expenseService } from './expense.service';

export class BudgetService {
  /**
   * Create new budget
   */
  async create(
    budgetData: NewBudget,
    lines: Omit<NewBudgetLine, 'budgetId' | 'tenantId'>[]
  ): Promise<ServiceResponse<Budget>> {
    try {
      // Calculate total budgeted
      const totalBudgeted = lines.reduce((sum, line) => sum + parseFloat(line.budgetedAmount), 0);

      const [budget] = await db
        .insert(budgets)
        .values({
          ...budgetData,
          totalBudgeted: totalBudgeted.toFixed(2),
        })
        .returning();

      // Create budget lines
      const linePromises = lines.map((line) =>
        db.insert(budgetLines).values({
          ...line,
          budgetId: budget.id,
          tenantId: budget.tenantId,
          availableAmount: line.budgetedAmount, // Initially, all budgeted amount is available
        })
      );

      await Promise.all(linePromises);

      logger.info('Budget created', {
        budgetId: budget.id,
        budgetNumber: budget.budgetNumber,
        totalBudgeted: budget.totalBudgeted,
      });

      return { success: true, data: budget };
    } catch (error) {
      logger.error('Error creating budget', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'BUDGET_CREATE_ERROR',
      };
    }
  }

  /**
   * Get budget by ID with lines
   */
  async getById(
    id: string,
    tenantId: string
  ): Promise<ServiceResponse<{ budget: Budget; lines: BudgetLine[] }>> {
    try {
      const [budget] = await db
        .select()
        .from(budgets)
        .where(and(eq(budgets.id, id), eq(budgets.tenantId, tenantId)))
        .limit(1);

      if (!budget) {
        return {
          success: false,
          error: 'Budget not found',
          code: 'BUDGET_NOT_FOUND',
        };
      }

      const lines = await db
        .select()
        .from(budgetLines)
        .where(eq(budgetLines.budgetId, id))
        .orderBy(budgetLines.categoryName);

      return { success: true, data: { budget, lines } };
    } catch (error) {
      logger.error('Error fetching budget', { error, budgetId: id });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'BUDGET_FETCH_ERROR',
      };
    }
  }

  /**
   * Update budget line actual amount (when expense is created)
   */
  async updateLineActual(
    budgetLineId: string,
    tenantId: string,
    expenseAmount: string
  ): Promise<ServiceResponse<BudgetLine>> {
    try {
      const amount = parseFloat(expenseAmount);

      const [line] = await db
        .update(budgetLines)
        .set({
          actualAmount: sql`${budgetLines.actualAmount} + ${amount}`,
          availableAmount: sql`${budgetLines.availableAmount} - ${amount}`,
          variance: sql`${budgetLines.actualAmount} + ${amount} - ${budgetLines.budgetedAmount}`,
          updatedAt: new Date(),
        })
        .where(and(eq(budgetLines.id, budgetLineId), eq(budgetLines.tenantId, tenantId)))
        .returning();

      if (!line) {
        return {
          success: false,
          error: 'Budget line not found',
          code: 'LINE_NOT_FOUND',
        };
      }

      // Calculate variance percentage
      const actualAmount = parseFloat(line.actualAmount || '0');
      const budgetedAmount = parseFloat(line.budgetedAmount);
      const variancePercent = budgetedAmount > 0 ? (actualAmount / budgetedAmount) * 100 : 0;

      await db
        .update(budgetLines)
        .set({
          variancePercent: variancePercent.toFixed(2),
        })
        .where(eq(budgetLines.id, budgetLineId));

      // Check for alerts
      await this.checkAndCreateAlert(budgetLineId, tenantId, variancePercent);

      logger.info('Budget line updated', {
        budgetLineId,
        expenseAmount,
        variancePercent: variancePercent.toFixed(2),
      });

      return { success: true, data: line };
    } catch (error) {
      logger.error('Error updating budget line', { error, budgetLineId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'LINE_UPDATE_ERROR',
      };
    }
  }

  /**
   * Check and create alert if thresholds are exceeded
   */
  private async checkAndCreateAlert(
    budgetLineId: string,
    tenantId: string,
    variancePercent: number
  ): Promise<void> {
    try {
      const [line] = await db
        .select()
        .from(budgetLines)
        .where(eq(budgetLines.id, budgetLineId))
        .limit(1);

      if (!line) return;

      const warningThreshold = parseFloat(line.warningThreshold || '80');
      const criticalThreshold = parseFloat(line.criticalThreshold || '100');

      let severity: AlertSeverity | null = null;
      let message = '';

      if (variancePercent >= criticalThreshold) {
        severity = 'critical';
        message = `Budget CRITICALLY exceeded: ${variancePercent.toFixed(1)}% of budget used (${line.categoryName})`;
      } else if (variancePercent >= warningThreshold) {
        severity = 'warning';
        message = `Budget warning: ${variancePercent.toFixed(1)}% of budget used (${line.categoryName})`;
      }

      if (severity) {
        // Check if alert already exists
        const existingAlerts = await db
          .select()
          .from(budgetAlerts)
          .where(
            and(
              eq(budgetAlerts.budgetLineId, budgetLineId),
              eq(budgetAlerts.severity, severity),
              eq(budgetAlerts.isResolved, false)
            )
          );

        if (existingAlerts.length === 0) {
          await db.insert(budgetAlerts).values({
            tenantId,
            budgetId: line.budgetId,
            budgetLineId,
            severity,
            message,
            thresholdPercent: (severity === 'critical' ? criticalThreshold : warningThreshold).toString(),
            currentPercent: variancePercent.toFixed(2),
          });

          logger.warn('Budget alert created', {
            budgetLineId,
            severity,
            variancePercent: variancePercent.toFixed(1),
          });
        }
      }

      // Update line alert level
      await db
        .update(budgetLines)
        .set({
          currentAlertLevel: severity,
        })
        .where(eq(budgetLines.id, budgetLineId));
    } catch (error) {
      logger.error('Error checking/creating alert', { error, budgetLineId });
    }
  }

  /**
   * Get active alerts for budget
   */
  async getAlerts(budgetId: string, tenantId: string): Promise<ServiceResponse<BudgetAlert[]>> {
    try {
      const alerts = await db
        .select()
        .from(budgetAlerts)
        .where(
          and(
            eq(budgetAlerts.budgetId, budgetId),
            eq(budgetAlerts.tenantId, tenantId),
            eq(budgetAlerts.isResolved, false)
          )
        )
        .orderBy(desc(budgetAlerts.createdAt));

      return { success: true, data: alerts };
    } catch (error) {
      logger.error('Error fetching budget alerts', { error, budgetId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'ALERTS_FETCH_ERROR',
      };
    }
  }

  /**
   * Resolve alert
   */
  async resolveAlert(
    alertId: string,
    tenantId: string,
    resolvedBy: string,
    resolutionNotes: string
  ): Promise<ServiceResponse<BudgetAlert>> {
    try {
      const [alert] = await db
        .update(budgetAlerts)
        .set({
          isResolved: true,
          resolvedAt: new Date(),
          resolvedBy,
          resolutionNotes,
          updatedAt: new Date(),
        })
        .where(and(eq(budgetAlerts.id, alertId), eq(budgetAlerts.tenantId, tenantId)))
        .returning();

      if (!alert) {
        return {
          success: false,
          error: 'Alert not found',
          code: 'ALERT_NOT_FOUND',
        };
      }

      logger.info('Budget alert resolved', { alertId, resolvedBy });

      return { success: true, data: alert };
    } catch (error) {
      logger.error('Error resolving alert', { error, alertId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'ALERT_RESOLVE_ERROR',
      };
    }
  }

  /**
   * Create budget adjustment
   */
  async createAdjustment(data: NewBudgetAdjustment): Promise<ServiceResponse<BudgetAdjustment>> {
    try {
      const [adjustment] = await db.insert(budgetAdjustments).values(data).returning();

      logger.info('Budget adjustment created', {
        adjustmentId: adjustment.id,
        adjustmentNumber: adjustment.adjustmentNumber,
        amount: adjustment.amount,
      });

      return { success: true, data: adjustment };
    } catch (error) {
      logger.error('Error creating adjustment', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'ADJUSTMENT_CREATE_ERROR',
      };
    }
  }

  /**
   * Sync budget with actual expenses
   * Updates all budget lines with current expense totals
   */
  async syncWithExpenses(budgetId: string, tenantId: string): Promise<ServiceResponse<void>> {
    try {
      const budgetResult = await this.getById(budgetId, tenantId);
      if (!budgetResult.success || !budgetResult.data) {
        return {
          success: false,
          error: budgetResult.error || 'Budget not found',
          code: budgetResult.code || 'BUDGET_NOT_FOUND',
        };
      }

      const { budget, lines } = budgetResult.data;

      // For each budget line, get total expenses
      for (const line of lines) {
        if (!line.categoryId) continue;

        const expensesResult = await expenseService.getByCategory(
          tenantId,
          line.categoryName,
          budget.startDate,
          budget.endDate
        );

        if (expensesResult.success && expensesResult.data) {
          const actualAmount = expensesResult.data.total;
          const budgetedAmount = parseFloat(line.budgetedAmount);
          const variance = parseFloat(actualAmount) - budgetedAmount;
          const variancePercent = budgetedAmount > 0 ? (parseFloat(actualAmount) / budgetedAmount) * 100 : 0;

          await db
            .update(budgetLines)
            .set({
              actualAmount,
              variance: variance.toFixed(2),
              variancePercent: variancePercent.toFixed(2),
              availableAmount: (budgetedAmount - parseFloat(actualAmount)).toFixed(2),
              updatedAt: new Date(),
            })
            .where(eq(budgetLines.id, line.id));

          // Check for alerts
          await this.checkAndCreateAlert(line.id, tenantId, variancePercent);
        }
      }

      // Update budget totals
      const [updatedLines] = await db
        .select({
          totalActual: sql<string>`SUM(${budgetLines.actualAmount})::text`,
          totalVariance: sql<string>`SUM(${budgetLines.variance})::text`,
        })
        .from(budgetLines)
        .where(eq(budgetLines.budgetId, budgetId));

      const totalBudgeted = parseFloat(budget.totalBudgeted);
      const totalActual = parseFloat(updatedLines.totalActual || '0');
      const variancePercent = totalBudgeted > 0 ? ((totalActual / totalBudgeted) * 100) : 0;

      await db
        .update(budgets)
        .set({
          totalActual: totalActual.toFixed(2),
          totalVariance: updatedLines.totalVariance || '0.00',
          variancePercent: variancePercent.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(budgets.id, budgetId));

      logger.info('Budget synced with expenses', { budgetId });

      return { success: true };
    } catch (error) {
      logger.error('Error syncing budget', { error, budgetId });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'BUDGET_SYNC_ERROR',
      };
    }
  }
}

// Export singleton instance
export const budgetService = new BudgetService();
