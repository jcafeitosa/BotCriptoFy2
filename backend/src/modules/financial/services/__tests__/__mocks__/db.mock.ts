/**
 * Database Mock for Service Tests
 * Provides in-memory mock implementation of Drizzle ORM operations
 */

import { mock } from 'bun:test';

// In-memory storage
const mockStorage = {
  invoices: new Map(),
  invoicePayments: new Map(),
  expenses: new Map(),
  ledgerEntries: new Map(),
  ledgerEntryLines: new Map(),
  budgets: new Map(),
  budgetLines: new Map(),
  budgetAlerts: new Map(),
  taxFilings: new Map(),
  accounts: new Map(),
  categories: new Map(),
};

// Reset storage between tests
export function resetMockDb() {
  Object.values(mockStorage).forEach((map) => map.clear());

  // Seed default accounts
  mockStorage.accounts.set('account-cash', {
    id: 'account-cash',
    accountNumber: '1010',
    accountName: 'Cash',
    accountType: 'asset',
    tenantId: 'tenant-123',
  });

  mockStorage.accounts.set('account-ar', {
    id: 'account-ar',
    accountNumber: '1020',
    accountName: 'Accounts Receivable',
    accountType: 'asset',
    tenantId: 'tenant-123',
  });

  mockStorage.accounts.set('account-ap', {
    id: 'account-ap',
    accountNumber: '2010',
    accountName: 'Accounts Payable',
    accountType: 'liability',
    tenantId: 'tenant-123',
  });

  mockStorage.accounts.set('account-revenue', {
    id: 'account-revenue',
    accountNumber: '4010',
    accountName: 'Revenue',
    accountType: 'revenue',
    tenantId: 'tenant-123',
  });

  mockStorage.accounts.set('account-expense', {
    id: 'account-expense',
    accountNumber: '5010',
    accountName: 'General Expense',
    accountType: 'expense',
    tenantId: 'tenant-123',
  });

  // Seed default categories
  mockStorage.categories.set('category-office', {
    id: 'category-office',
    categoryName: 'Office Supplies',
    categoryType: 'expense',
    tenantId: 'tenant-123',
  });

  mockStorage.categories.set('category-marketing', {
    id: 'category-marketing',
    categoryName: 'Marketing',
    categoryType: 'expense',
    tenantId: 'tenant-123',
  });
}

// Mock Drizzle query builder
export const mockDb = {
  select: mock(() => ({
    from: mock(() => ({
      where: mock(() => ({
        limit: mock(() => ({
          offset: mock(() => Promise.resolve([])),
        })),
      })),
    })),
  })),

  insert: mock((_table: any) => ({
    values: mock((data: any) => ({
      returning: mock(() => {
        const id = `${_table.name}-${Date.now()}`;
        const record = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
        (mockStorage as any)[_table.name]?.set(id, record);
        return Promise.resolve([record]);
      }),
    })),
  })),

  update: mock((_table: any) => ({
    set: mock((data: any) => ({
      where: mock((_condition: any) => ({
        returning: mock(() => {
          // Simplified update logic
          return Promise.resolve([{ ...data, updatedAt: new Date() }]);
        }),
      })),
    })),
  })),

  delete: mock((_table: any) => ({
    where: mock((_condition: any) => ({
      returning: mock(() => Promise.resolve([])),
    })),
  })),
};

// Initialize mock db
resetMockDb();

export default mockDb;
