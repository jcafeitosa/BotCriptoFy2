/**
 * Mock Database Helper for Financial Module Tests
 *
 * Provides in-memory database mocking for unit tests
 */

import { mock } from 'bun:test';

export interface MockData {
  expenses: any[];
  expenseCategories: any[];
  invoices: any[];
  invoiceItems: any[];
  budgets: any[];
  budgetEntries: any[];
  taxRecords: any[];
  taxJurisdictions: any[];
  ledgerEntries: any[];
  payments: any[];
}

export function createMockDatabase() {
  const data: MockData = {
    expenses: [],
    expenseCategories: [],
    invoices: [],
    invoiceItems: [],
    budgets: [],
    budgetEntries: [],
    taxRecords: [],
    taxJurisdictions: [],
    ledgerEntries: [],
    payments: [],
  };

  let idCounter = 1;

  const generateId = () => `id-${idCounter++}`;

  // Helper to evaluate conditions
  const evaluateCondition = (row: any, condition: any): boolean => {
    if (!condition) return true;
    if (Array.isArray(condition)) {
      return condition.every((c) => evaluateCondition(row, c));
    }
    if (condition.type === 'eq') {
      const columnName = getColumnName(condition.column);
      return row[columnName] === condition.value;
    }
    if (condition.type === 'gte') {
      const columnName = getColumnName(condition.column);
      if (row[columnName] instanceof Date && condition.value instanceof Date) {
        return row[columnName].getTime() >= condition.value.getTime();
      }
      return row[columnName] >= condition.value;
    }
    if (condition.type === 'lte') {
      const columnName = getColumnName(condition.column);
      if (row[columnName] instanceof Date && condition.value instanceof Date) {
        return row[columnName].getTime() <= condition.value.getTime();
      }
      return row[columnName] <= condition.value;
    }
    return true;
  };

  const getColumnName = (column: any): string => {
    if (typeof column === 'string') return column;
    if (column && typeof column === 'object') {
      if (typeof column.name === 'string') return column.name;
      if (typeof column.columnName === 'string') return column.columnName;
    }
    const str = String(column);
    const match = str.match(/\.([A-Za-z0-9_]+)"?$/) || str.match(/\.([A-Za-z0-9_]+)$/);
    if (match) return match[1];
    return str;
  };

  const getTableKey = (table: any): keyof MockData => {
    const tableStr = String(table);
    if (tableStr.includes('expenses') && !tableStr.includes('Categories')) return 'expenses';
    if (tableStr.includes('expenseCategories')) return 'expenseCategories';
    if (tableStr.includes('invoices') && !tableStr.includes('Items')) return 'invoices';
    if (tableStr.includes('invoiceItems')) return 'invoiceItems';
    if (tableStr.includes('budgets') && !tableStr.includes('Entries')) return 'budgets';
    if (tableStr.includes('budgetEntries')) return 'budgetEntries';
    if (tableStr.includes('taxRecords')) return 'taxRecords';
    if (tableStr.includes('taxJurisdictions')) return 'taxJurisdictions';
    if (tableStr.includes('ledgerEntries')) return 'ledgerEntries';
    if (tableStr.includes('payments')) return 'payments';
    throw new Error(`Unknown table: ${tableStr}`);
  };

  class SelectBuilder {
    private condition: any = undefined;
    private limitValue: number | undefined;
    private offsetValue = 0;
    private orderByValue: any;

    constructor(private readonly tableKey: keyof MockData) {}

    where(cond?: any) {
      this.condition = cond;
      return this;
    }

    orderBy(order?: any) {
      this.orderByValue = order;
      return this;
    }

    limit(value: number) {
      this.limitValue = value;
      return this;
    }

    offset(value: number) {
      this.offsetValue = value;
      return this;
    }

    then(resolve: (rows: any[]) => void) {
      let results = data[this.tableKey].filter((row) =>
        evaluateCondition(row, this.condition)
      );

      if (this.offsetValue > 0) {
        results = results.slice(this.offsetValue);
      }

      if (this.limitValue !== undefined) {
        results = results.slice(0, this.limitValue);
      }

      resolve(results.map((row) => ({ ...row })));
    }
  }

  class InsertBuilder {
    private valuesToInsert: any;

    constructor(private readonly tableKey: keyof MockData) {}

    values(vals: any) {
      this.valuesToInsert = vals;
      return this;
    }

    returning() {
      return {
        then: (resolve: (rows: any[]) => void) => {
          const newRow = {
            ...this.valuesToInsert,
            id: this.valuesToInsert.id || generateId(),
            createdAt: this.valuesToInsert.createdAt || new Date(),
            updatedAt: this.valuesToInsert.updatedAt || new Date(),
          };
          data[this.tableKey].push(newRow);
          resolve([{ ...newRow }]);
        },
      };
    }
  }

  class UpdateBuilder {
    private condition: any = undefined;
    private valuesToUpdate: any;

    constructor(private readonly tableKey: keyof MockData) {}

    set(vals: any) {
      this.valuesToUpdate = vals;
      return this;
    }

    where(cond?: any) {
      this.condition = cond;
      return this;
    }

    returning() {
      return {
        then: (resolve: (rows: any[]) => void) => {
          const results: any[] = [];
          for (let i = 0; i < data[this.tableKey].length; i++) {
            const row = data[this.tableKey][i];
            if (evaluateCondition(row, this.condition)) {
              const updated = {
                ...row,
                ...this.valuesToUpdate,
                updatedAt: new Date(),
              };
              data[this.tableKey][i] = updated;
              results.push({ ...updated });
            }
          }
          resolve(results);
        },
      };
    }
  }

  class DeleteBuilder {
    private condition: any = undefined;

    constructor(private readonly tableKey: keyof MockData) {}

    where(cond?: any) {
      this.condition = cond;
      return this;
    }

    returning() {
      return {
        then: (resolve: (rows: any[]) => void) => {
          const results: any[] = [];
          data[this.tableKey] = data[this.tableKey].filter((row) => {
            if (evaluateCondition(row, this.condition)) {
              results.push({ ...row });
              return false;
            }
            return true;
          });
          resolve(results);
        },
      };
    }
  }

  const mockDb = {
    select: () => ({
      from: (table: any) => new SelectBuilder(getTableKey(table)),
    }),
    insert: (table: any) => new InsertBuilder(getTableKey(table)),
    update: (table: any) => new UpdateBuilder(getTableKey(table)),
    delete: (table: any) => new DeleteBuilder(getTableKey(table)),
  };

  return { mockDb, data, generateId };
}
