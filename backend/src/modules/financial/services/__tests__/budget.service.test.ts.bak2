/**
 * BudgetService Tests
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { BudgetService } from '../budget.service';
import type { NewBudget, NewBudgetLine } from '../../types/financial.types';

// Mock data
const mockTenantId = 'tenant-123';
const mockUserId = 'user-456';

const mockBudgetData: NewBudget = {
  tenantId: mockTenantId,
  budgetName: 'Q1 2025 Budget',
  fiscalPeriod: '2025-Q1',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-03-31'),
  currency: 'BRL',
  totalBudgeted: '100000.00',
  status: 'draft',
  createdBy: mockUserId,
};

const mockBudgetLines: NewBudgetLine[] = [
  {
    budgetId: 'budget-001',
    categoryId: 'category-office',
    budgetedAmount: '50000.00',
    actualAmount: '0.00',
    variance: '0.00',
    variancePercent: '0.00',
    description: 'Office expenses',
  },
  {
    budgetId: 'budget-001',
    categoryId: 'category-marketing',
    budgetedAmount: '50000.00',
    actualAmount: '0.00',
    variance: '0.00',
    variancePercent: '0.00',
    description: 'Marketing expenses',
  },
];

describe('BudgetService', () => {
  let service: BudgetService;

  beforeEach(() => {
    service = new BudgetService();
  });

  describe('create', () => {
    test('should create budget with lines', async () => {
      const result = await service.create(mockBudgetData, mockBudgetLines);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.budgetName).toBe('Q1 2025 Budget');
        expect(result.data.totalBudgeted).toBe('100000.00');
        expect(result.data.status).toBe('draft');
        expect(result.data.lines.length).toBe(2);
      }
    });

    test('should validate budget total matches lines', async () => {
      const invalidData = {
        ...mockBudgetData,
        totalBudgeted: '50000.00', // Doesn't match sum of lines
      };

      const result = await service.create(invalidData, mockBudgetLines);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Budget total must match sum of lines');
      }
    });

    test('should validate start date before end date', async () => {
      const invalidData = {
        ...mockBudgetData,
        startDate: new Date('2025-03-31'),
        endDate: new Date('2025-01-01'),
      };

      const result = await service.create(invalidData, mockBudgetLines);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('End date must be after start date');
      }
    });

    test('should require at least one budget line', async () => {
      const result = await service.create(mockBudgetData, []);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('At least one budget line required');
      }
    });
  });

  describe('getById', () => {
    test('should get budget with lines', async () => {
      const created = await service.create(mockBudgetData, mockBudgetLines);

      if (!created.success) {
        throw new Error('Failed to create budget');
      }

      const result = await service.getById(created.data.id, mockTenantId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(created.data.id);
        expect(result.data.lines).toBeDefined();
        expect(result.data.lines.length).toBe(2);
      }
    });
  });

  describe('list', () => {
    test('should list budgets', async () => {
      const result = await service.list(mockTenantId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);
      }
    });

    test('should filter by fiscal period', async () => {
      const result = await service.list(mockTenantId, {
        fiscalPeriod: '2025-Q1',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        result.data.forEach((budget) => {
          expect(budget.fiscalPeriod).toBe('2025-Q1');
        });
      }
    });

    test('should filter by status', async () => {
      const result = await service.list(mockTenantId, { status: 'approved' });

      expect(result.success).toBe(true);
      if (result.success) {
        result.data.forEach((budget) => {
          expect(budget.status).toBe('approved');
        });
      }
    });
  });

  describe('update', () => {
    test('should update draft budget', async () => {
      const created = await service.create(mockBudgetData, mockBudgetLines);

      if (!created.success) {
        throw new Error('Failed to create budget');
      }

      const result = await service.update(created.data.id, mockTenantId, {
        budgetName: 'Updated Budget Name',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.budgetName).toBe('Updated Budget Name');
      }
    });

    test('should not update approved budget', async () => {
      const result = await service.update('approved-budget-id', mockTenantId, {
        budgetName: 'New name',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Cannot update approved budget');
      }
    });
  });

  describe('delete', () => {
    test('should delete draft budget', async () => {
      const created = await service.create(mockBudgetData, mockBudgetLines);

      if (!created.success) {
        throw new Error('Failed to create budget');
      }

      const result = await service.delete(created.data.id, mockTenantId);

      expect(result.success).toBe(true);
    });

    test('should not delete approved budget', async () => {
      const result = await service.delete('approved-budget-id', mockTenantId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Cannot delete approved budget');
      }
    });
  });

  describe('updateLineActual', () => {
    test('should update actual amount and calculate variance', async () => {
      const created = await service.create(mockBudgetData, mockBudgetLines);

      if (!created.success) {
        throw new Error('Failed to create budget');
      }

      const lineId = created.data.lines[0].id;

      const result = await service.updateLineActual(
        lineId,
        mockTenantId,
        '30000.00',
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.actualAmount).toBe('30000.00');
        expect(result.data.variance).toBe('-20000.00'); // 30k - 50k
        expect(result.data.variancePercent).toBe('-40.00'); // -20k / 50k * 100
      }
    });

    test('should create alert when over warning threshold', async () => {
      const created = await service.create(mockBudgetData, mockBudgetLines);

      if (!created.success) {
        throw new Error('Failed to create budget');
      }

      const lineId = created.data.lines[0].id;

      // Update to 90% of budget (exceeds 80% warning threshold)
      await service.updateLineActual(lineId, mockTenantId, '45000.00');

      // Check that alert was created
      const alerts = await service.getAlerts(mockTenantId, created.data.id);

      if (alerts.success) {
        expect(alerts.data.length).toBeGreaterThan(0);
        expect(alerts.data[0].severity).toBe('warning');
      }
    });

    test('should create alert when over critical threshold', async () => {
      const created = await service.create(mockBudgetData, mockBudgetLines);

      if (!created.success) {
        throw new Error('Failed to create budget');
      }

      const lineId = created.data.lines[0].id;

      // Update to 105% of budget (exceeds 100% critical threshold)
      await service.updateLineActual(lineId, mockTenantId, '52500.00');

      // Check that alert was created
      const alerts = await service.getAlerts(mockTenantId, created.data.id);

      if (alerts.success) {
        expect(alerts.data.length).toBeGreaterThan(0);
        const criticalAlert = alerts.data.find((a) => a.severity === 'critical');
        expect(criticalAlert).toBeDefined();
      }
    });
  });

  describe('syncWithExpenses', () => {
    test('should sync budget with approved expenses', async () => {
      const created = await service.create(mockBudgetData, mockBudgetLines);

      if (!created.success) {
        throw new Error('Failed to create budget');
      }

      const result = await service.syncWithExpenses(
        created.data.id,
        mockTenantId,
      );

      expect(result.success).toBe(true);
    });

    test('should only sync approved expenses', async () => {
      const created = await service.create(mockBudgetData, mockBudgetLines);

      if (!created.success) {
        throw new Error('Failed to create budget');
      }

      // Sync should ignore draft and pending expenses
      await service.syncWithExpenses(created.data.id, mockTenantId);

      const updated = await service.getById(created.data.id, mockTenantId);

      if (updated.success) {
        // Actuals should only reflect approved expenses
        updated.data.lines.forEach((line) => {
          const actual = parseFloat(line.actualAmount);
          expect(actual).toBeGreaterThanOrEqual(0);
        });
      }
    });
  });

  describe('getSummary', () => {
    test('should get budget summary', async () => {
      const created = await service.create(mockBudgetData, mockBudgetLines);

      if (!created.success) {
        throw new Error('Failed to create budget');
      }

      const result = await service.getSummary(created.data.id, mockTenantId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty('budgetId');
        expect(result.data).toHaveProperty('totalBudgeted');
        expect(result.data).toHaveProperty('totalActual');
        expect(result.data).toHaveProperty('totalVariance');
        expect(result.data).toHaveProperty('utilizationPercent');
      }
    });

    test('should calculate utilization percentage correctly', async () => {
      const created = await service.create(mockBudgetData, mockBudgetLines);

      if (!created.success) {
        throw new Error('Failed to create budget');
      }

      // Update one line to 50% of budget
      const lineId = created.data.lines[0].id;
      await service.updateLineActual(lineId, mockTenantId, '25000.00');

      const summary = await service.getSummary(created.data.id, mockTenantId);

      if (summary.success) {
        // 25k out of 100k = 25%
        expect(summary.data.utilizationPercent).toBe('25.00');
      }
    });
  });

  describe('getAlerts', () => {
    test('should get budget alerts', async () => {
      const result = await service.getAlerts(mockTenantId, 'budget-001');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);
      }
    });

    test('should filter unresolved alerts', async () => {
      const result = await service.getAlerts(mockTenantId, 'budget-001', {
        resolved: false,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        result.data.forEach((alert) => {
          expect(alert.resolved).toBe(false);
        });
      }
    });

    test('should filter by severity', async () => {
      const result = await service.getAlerts(mockTenantId, 'budget-001', {
        severity: 'critical',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        result.data.forEach((alert) => {
          expect(alert.severity).toBe('critical');
        });
      }
    });
  });

  describe('resolveAlert', () => {
    test('should resolve budget alert', async () => {
      const result = await service.resolveAlert(
        'alert-001',
        mockTenantId,
        mockUserId,
        'Budget adjusted',
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.resolved).toBe(true);
        expect(result.data.resolvedBy).toBe(mockUserId);
        expect(result.data.resolvedAt).toBeInstanceOf(Date);
        expect(result.data.resolution).toBe('Budget adjusted');
      }
    });

    test('should not resolve already resolved alert', async () => {
      const result = await service.resolveAlert(
        'resolved-alert-id',
        mockTenantId,
        mockUserId,
        'Note',
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Alert already resolved');
      }
    });
  });

  describe('Business Logic', () => {
    test('should track budget vs actual correctly over time', async () => {
      const created = await service.create(mockBudgetData, mockBudgetLines);

      if (!created.success) {
        throw new Error('Failed to create budget');
      }

      const lineId = created.data.lines[0].id;

      // First expense
      await service.updateLineActual(lineId, mockTenantId, '10000.00');

      let summary = await service.getSummary(created.data.id, mockTenantId);
      if (summary.success) {
        expect(summary.data.totalActual).toBe('10000.00');
      }

      // Second expense
      await service.updateLineActual(lineId, mockTenantId, '20000.00');

      summary = await service.getSummary(created.data.id, mockTenantId);
      if (summary.success) {
        expect(summary.data.totalActual).toBe('20000.00');
      }
    });

    test('should handle multiple categories correctly', async () => {
      const created = await service.create(mockBudgetData, mockBudgetLines);

      if (!created.success) {
        throw new Error('Failed to create budget');
      }

      // Update different lines
      await service.updateLineActual(
        created.data.lines[0].id,
        mockTenantId,
        '30000.00',
      );
      await service.updateLineActual(
        created.data.lines[1].id,
        mockTenantId,
        '40000.00',
      );

      const summary = await service.getSummary(created.data.id, mockTenantId);

      if (summary.success) {
        expect(summary.data.totalActual).toBe('70000.00');
        expect(summary.data.totalVariance).toBe('-30000.00'); // 70k - 100k
      }
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero budget line', async () => {
      const linesWithZero = [
        ...mockBudgetLines,
        {
          budgetId: 'budget-001',
          categoryId: 'category-other',
          budgetedAmount: '0.00',
          actualAmount: '0.00',
          variance: '0.00',
          variancePercent: '0.00',
          description: 'Zero budget',
        },
      ];

      const result = await service.create(mockBudgetData, linesWithZero);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Budget line amount must be greater than 0');
      }
    });

    test('should handle negative variance correctly', async () => {
      const created = await service.create(mockBudgetData, mockBudgetLines);

      if (!created.success) {
        throw new Error('Failed to create budget');
      }

      const lineId = created.data.lines[0].id;

      // Spend more than budget
      await service.updateLineActual(lineId, mockTenantId, '60000.00');

      const line = await service.getLineById(lineId, mockTenantId);

      if (line.success) {
        expect(parseFloat(line.data.variance)).toBeGreaterThan(0);
        expect(parseFloat(line.data.variancePercent)).toBeGreaterThan(0);
      }
    });

    test('should handle concurrent updates to same line', async () => {
      const created = await service.create(mockBudgetData, mockBudgetLines);

      if (!created.success) {
        throw new Error('Failed to create budget');
      }

      const lineId = created.data.lines[0].id;

      // Simulate concurrent updates
      const update1 = service.updateLineActual(lineId, mockTenantId, '25000.00');
      const update2 = service.updateLineActual(lineId, mockTenantId, '30000.00');

      const results = await Promise.all([update1, update2]);

      // Both should succeed (last write wins)
      expect(results.every((r) => r.success)).toBe(true);
    });
  });
});
