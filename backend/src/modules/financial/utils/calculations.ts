/**
 * Financial Calculations Utilities
 */

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

/**
 * Calculate discount amount from percentage
 */
export function calculateDiscountAmount(subtotal: number, discountPercent: number): number {
  return (subtotal * discountPercent) / 100;
}

/**
 * Calculate tax amount
 */
export function calculateTaxAmount(taxableAmount: number, taxRate: number): number {
  return (taxableAmount * taxRate) / 100;
}

/**
 * Calculate total with tax
 */
export function calculateTotalWithTax(
  subtotal: number,
  taxRate: number,
  discountPercent: number = 0
): {
  subtotal: string;
  discountAmount: string;
  taxableAmount: string;
  taxAmount: string;
  totalAmount: string;
} {
  const discountAmount = calculateDiscountAmount(subtotal, discountPercent);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = calculateTaxAmount(taxableAmount, taxRate);
  const totalAmount = taxableAmount + taxAmount;

  return {
    subtotal: subtotal.toFixed(2),
    discountAmount: discountAmount.toFixed(2),
    taxableAmount: taxableAmount.toFixed(2),
    taxAmount: taxAmount.toFixed(2),
    totalAmount: totalAmount.toFixed(2),
  };
}

/**
 * Calculate net margin
 */
export function calculateNetMargin(revenue: number, expenses: number): number {
  if (revenue === 0) return 0;
  return ((revenue - expenses) / revenue) * 100;
}

/**
 * Calculate variance
 */
export function calculateVariance(actual: number, budgeted: number): {
  variance: number;
  variancePercent: number;
  status: 'under' | 'over' | 'on-budget';
} {
  const variance = actual - budgeted;
  const variancePercent = budgeted > 0 ? (variance / budgeted) * 100 : 0;

  let status: 'under' | 'over' | 'on-budget' = 'on-budget';
  if (variance < -0.01) status = 'under';
  if (variance > 0.01) status = 'over';

  return {
    variance,
    variancePercent,
    status,
  };
}

/**
 * Calculate compound interest
 */
export function calculateCompoundInterest(
  principal: number,
  rate: number,
  periods: number
): number {
  return principal * Math.pow(1 + rate / 100, periods);
}

/**
 * Calculate payment schedule (amortization)
 */
export function calculateAmortization(
  principal: number,
  annualRate: number,
  months: number
): Array<{
  period: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}> {
  const monthlyRate = annualRate / 100 / 12;
  const payment =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1);

  const schedule = [];
  let balance = principal;

  for (let period = 1; period <= months; period++) {
    const interest = balance * monthlyRate;
    const principalPayment = payment - interest;
    balance -= principalPayment;

    schedule.push({
      period,
      payment: parseFloat(payment.toFixed(2)),
      principal: parseFloat(principalPayment.toFixed(2)),
      interest: parseFloat(interest.toFixed(2)),
      balance: parseFloat(Math.max(0, balance).toFixed(2)),
    });
  }

  return schedule;
}

/**
 * Calculate ROI (Return on Investment)
 */
export function calculateROI(gain: number, cost: number): number {
  if (cost === 0) return 0;
  return ((gain - cost) / cost) * 100;
}

/**
 * Calculate NPV (Net Present Value)
 */
export function calculateNPV(rate: number, cashFlows: number[]): number {
  return cashFlows.reduce((npv, cashFlow, period) => {
    return npv + cashFlow / Math.pow(1 + rate / 100, period);
  }, 0);
}

/**
 * Calculate IRR (Internal Rate of Return)
 * Uses Newton-Raphson method
 */
export function calculateIRR(cashFlows: number[], guess: number = 0.1): number {
  const maxIterations = 100;
  const tolerance = 0.00001;

  let rate = guess;

  for (let i = 0; i < maxIterations; i++) {
    const npv = calculateNPV(rate * 100, cashFlows);
    const npvDerivative = cashFlows.reduce((sum, cashFlow, period) => {
      return sum - (period * cashFlow) / Math.pow(1 + rate, period + 1);
    }, 0);

    const newRate = rate - npv / npvDerivative;

    if (Math.abs(newRate - rate) < tolerance) {
      return newRate * 100; // Return as percentage
    }

    rate = newRate;
  }

  return rate * 100;
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: string = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Parse currency string to number
 * Handles both Brazilian (1.234,56) and US (1,234.56) formats
 */
export function parseCurrency(value: string): number {
  // Remove currency symbols and whitespace
  let cleaned = value.replace(/[^\d.,-]/g, '');

  // Detect format based on last separator
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  if (lastComma > lastDot) {
    // Brazilian format: 1.234,56 -> remove dots, replace comma with dot
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // US format: 1,234.56 -> remove commas
    cleaned = cleaned.replace(/,/g, '');
  }

  return parseFloat(cleaned);
}

/**
 * Calculate days between dates
 */
export function daysBetween(date1: Date, date2: Date): number {
  const diff = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Calculate fiscal quarter from date
 */
export function getFiscalQuarter(date: Date): string {
  const quarter = Math.ceil((date.getMonth() + 1) / 3);
  return `Q${quarter}`;
}

/**
 * Calculate fiscal period from date
 */
export function getFiscalPeriod(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
