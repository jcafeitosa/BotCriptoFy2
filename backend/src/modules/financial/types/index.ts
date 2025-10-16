/**
 * Financial Module Types
 */

// Re-export all types from schemas
export * from '../schema/invoices.schema';
export * from '../schema/expenses.schema';
export * from '../schema/ledger.schema';
export * from '../schema/budgets.schema';
export * from '../schema/tax.schema';

/**
 * Service Response Types
 */
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Filter Types
 */
export interface DateRangeFilter {
  startDate: Date;
  endDate: Date;
}

export interface InvoiceFilters extends Partial<DateRangeFilter> {
  tenantId: string;
  type?: 'income' | 'expense';
  status?: string;
  customerId?: string;
  supplierId?: string;
}

export interface ExpenseFilters extends Partial<DateRangeFilter> {
  tenantId: string;
  category?: string;
  status?: string;
  departmentId?: string;
}

export interface LedgerFilters extends Partial<DateRangeFilter> {
  tenantId: string;
  accountId?: string;
  fiscalYear?: string;
  fiscalPeriod?: string;
}

export interface BudgetFilters {
  tenantId: string;
  fiscalYear?: string;
  status?: string;
  departmentId?: string;
}

/**
 * Report Types
 */
export interface ProfitLossReport {
  fiscalPeriod: string;
  revenue: {
    total: string;
    breakdown: Array<{ account: string; amount: string }>;
  };
  expenses: {
    total: string;
    breakdown: Array<{ account: string; amount: string }>;
  };
  netIncome: string;
  netMargin: string;
}

export interface BalanceSheetReport {
  date: Date;
  assets: {
    current: { total: string; accounts: Array<{ name: string; balance: string }> };
    nonCurrent: { total: string; accounts: Array<{ name: string; balance: string }> };
    total: string;
  };
  liabilities: {
    current: { total: string; accounts: Array<{ name: string; balance: string }> };
    nonCurrent: { total: string; accounts: Array<{ name: string; balance: string }> };
    total: string;
  };
  equity: {
    total: string;
    accounts: Array<{ name: string; balance: string }>;
  };
}

export interface CashFlowReport {
  fiscalPeriod: string;
  operating: {
    total: string;
    items: Array<{ description: string; amount: string }>;
  };
  investing: {
    total: string;
    items: Array<{ description: string; amount: string }>;
  };
  financing: {
    total: string;
    items: Array<{ description: string; amount: string }>;
  };
  netCashFlow: string;
  openingBalance: string;
  closingBalance: string;
}

/**
 * PDF Generation Types
 */
export interface InvoicePDFData {
  invoice: any; // Invoice type
  companyInfo: {
    name: string;
    taxId: string;
    address: string;
    phone: string;
    email: string;
    logo?: string;
  };
}
