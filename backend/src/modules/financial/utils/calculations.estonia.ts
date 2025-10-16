/**
 * Estonian Tax System Calculations
 * Implements Estonian tax rules and calculations
 *
 * Key Features of Estonian Tax System:
 * - Corporate Income Tax (CIT): 20% only on distributed profits (dividends)
 * - No tax on reinvested profits (unique in EU)
 * - Personal Income Tax (PIT): 20% flat rate
 * - Social Tax: 33% (employer pays on gross salary)
 * - Unemployment Insurance: 1.6% employee + 0.8% employer
 * - VAT: 22% standard (from July 2024), 9% reduced, 0% exports
 */

/**
 * Estonian Tax Types
 */
export type EstonianTaxType =
  | 'VAT'              // Käibemaks (Value Added Tax)
  | 'CIT'              // Tulumaks (Corporate Income Tax - on distributions only)
  | 'PIT'              // Füüsilise isiku tulumaks (Personal Income Tax)
  | 'SOCIAL'           // Sotsiaalmaks (Social Tax)
  | 'UNEMPLOYMENT'     // Töötuskindlustus (Unemployment Insurance)
  | 'PENSION'          // Kohustuslik kogumispension (Mandatory Pension - II pillar)
  | 'LAND'             // Maamaks (Land Tax)
  | 'EXCISE';          // Aktsiis (Excise Duty)

/**
 * Calculate Estonian VAT
 * Standard rate: 22% (from 2024-07-01), 20% (before)
 * Reduced rate: 9% (books, pharmaceuticals, accommodation)
 * Zero rate: 0% (exports, intra-EU)
 *
 * @param amount Taxable amount
 * @param date Transaction date
 * @param category VAT category
 * @returns VAT amount and rate
 */
export function calculateEstonianVAT(
  amount: number,
  date: Date = new Date(),
  category: 'standard' | 'reduced' | 'zero' = 'standard'
): { vatAmount: number; rate: number; totalAmount: number } {
  let rate = 0;

  if (category === 'standard') {
    // Standard rate changed from 20% to 22% on July 1, 2024
    const changeDate = new Date('2024-07-01');
    rate = date >= changeDate ? 22 : 20;
  } else if (category === 'reduced') {
    rate = 9;
  } else {
    rate = 0; // Zero-rated
  }

  const vatAmount = (amount * rate) / 100;
  const totalAmount = amount + vatAmount;

  return {
    vatAmount: Math.round(vatAmount * 100) / 100,
    rate,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}

/**
 * Calculate Estonian Corporate Income Tax (CIT)
 * UNIQUE: Tax only applies to DISTRIBUTED PROFITS (dividends, fringe benefits, gifts, donations)
 * Rate: 20% on GROSS distribution (or 20/80 = 25% on net)
 * No tax on retained/reinvested profits
 *
 * @param distributedAmount Amount being distributed (dividends, etc.)
 * @param isRegularDividend true if regular dividend (20/80), false if non-regular (14/86)
 * @returns Tax amount
 */
export function calculateEstonianCIT(
  distributedAmount: number,
  isRegularDividend: boolean = true
): { taxAmount: number; netDistribution: number; grossDistribution: number; effectiveRate: number } {
  // Regular dividends: 20/80 = 25% effective rate on net
  // Non-regular dividends (from retained earnings taxed before 2000): 14/86 = 16.28% effective rate
  const rate = isRegularDividend ? 20 : 14;
  const denominator = isRegularDividend ? 80 : 86;

  // Tax is calculated on the GROSS amount
  // If distributing 100, tax is 20, net to shareholder is 80
  const taxAmount = (distributedAmount * rate) / (100 + rate);
  const netDistribution = distributedAmount - taxAmount;
  const effectiveRate = (rate / denominator) * 100;

  return {
    taxAmount: Math.round(taxAmount * 100) / 100,
    netDistribution: Math.round(netDistribution * 100) / 100,
    grossDistribution: distributedAmount,
    effectiveRate: Math.round(effectiveRate * 100) / 100,
  };
}

/**
 * Calculate Estonian Personal Income Tax (PIT)
 * Flat rate: 20%
 * Tax-free allowance: €654/month (€7,848/year) in 2024
 * Allowance reduces for income above €2,160/month
 *
 * @param monthlyGrossSalary Monthly gross salary
 * @returns Tax amount and net salary
 */
export function calculateEstonianPIT(
  monthlyGrossSalary: number
): { taxAmount: number; netSalary: number; taxableIncome: number; allowance: number } {
  const basicAllowance = 654; // €654/month in 2024
  const reductionThreshold = 2160; // Reduction starts at €2,160/month

  let allowance = basicAllowance;

  // Reduce allowance for high earners
  if (monthlyGrossSalary > reductionThreshold) {
    const excess = monthlyGrossSalary - reductionThreshold;
    allowance = Math.max(0, basicAllowance - excess);
  }

  const taxableIncome = Math.max(0, monthlyGrossSalary - allowance);
  const taxAmount = taxableIncome * 0.20; // 20% flat rate

  return {
    taxAmount: Math.round(taxAmount * 100) / 100,
    netSalary: Math.round((monthlyGrossSalary - taxAmount) * 100) / 100,
    taxableIncome: Math.round(taxableIncome * 100) / 100,
    allowance: Math.round(allowance * 100) / 100,
  };
}

/**
 * Calculate Estonian Social Tax
 * Rate: 33% of gross salary (paid by employer)
 * Minimum base: €654/month (2024)
 * No maximum cap
 *
 * @param grossSalary Monthly gross salary
 * @returns Social tax amount
 */
export function calculateEstonianSocialTax(
  grossSalary: number
): { socialTax: number; healthInsurance: number; pension: number } {
  const minBase = 654; // Minimum calculation base
  const base = Math.max(grossSalary, minBase);

  const socialTax = base * 0.33; // 33% total

  // Social tax is split:
  // - 13% goes to health insurance
  // - 20% goes to pension insurance
  const healthInsurance = base * 0.13;
  const pension = base * 0.20;

  return {
    socialTax: Math.round(socialTax * 100) / 100,
    healthInsurance: Math.round(healthInsurance * 100) / 100,
    pension: Math.round(pension * 100) / 100,
  };
}

/**
 * Calculate Estonian Unemployment Insurance
 * Employee: 1.6% of gross salary
 * Employer: 0.8% of gross salary
 *
 * @param grossSalary Monthly gross salary
 * @returns Unemployment insurance contributions
 */
export function calculateEstonianUnemploymentInsurance(
  grossSalary: number
): { employee: number; employer: number; total: number } {
  const employee = grossSalary * 0.016; // 1.6%
  const employer = grossSalary * 0.008; // 0.8%

  return {
    employee: Math.round(employee * 100) / 100,
    employer: Math.round(employer * 100) / 100,
    total: Math.round((employee + employer) * 100) / 100,
  };
}

/**
 * Calculate Estonian Mandatory Pension Contribution (II Pillar)
 * Employee: 2% of gross salary
 * State contribution: 4% (from social tax)
 * Voluntary (not calculated here)
 *
 * @param grossSalary Monthly gross salary
 * @returns Pension contribution
 */
export function calculateEstonianMandatoryPension(
  grossSalary: number
): { employee: number; state: number; total: number } {
  const employee = grossSalary * 0.02; // 2%
  const state = grossSalary * 0.04; // 4% from social tax

  return {
    employee: Math.round(employee * 100) / 100,
    state: Math.round(state * 100) / 100,
    total: Math.round((employee + state) * 100) / 100,
  };
}

/**
 * Calculate total Estonian employment costs
 * Includes all employer and employee contributions
 *
 * @param grossSalary Monthly gross salary
 * @returns Complete breakdown of employment costs
 */
export function calculateEstonianEmploymentCosts(grossSalary: number): {
  grossSalary: number;
  employerCosts: {
    socialTax: number;
    unemploymentInsurance: number;
    total: number;
  };
  employeeDeductions: {
    incomeTax: number;
    unemploymentInsurance: number;
    mandatoryPension: number;
    total: number;
  };
  netSalary: number;
  totalCost: number;
  costRatio: number; // Total cost / Net salary
} {
  const pit = calculateEstonianPIT(grossSalary);
  const socialTax = calculateEstonianSocialTax(grossSalary);
  const unemployment = calculateEstonianUnemploymentInsurance(grossSalary);
  const pension = calculateEstonianMandatoryPension(grossSalary);

  const employerCosts = {
    socialTax: socialTax.socialTax,
    unemploymentInsurance: unemployment.employer,
    total: socialTax.socialTax + unemployment.employer,
  };

  const employeeDeductions = {
    incomeTax: pit.taxAmount,
    unemploymentInsurance: unemployment.employee,
    mandatoryPension: pension.employee,
    total: pit.taxAmount + unemployment.employee + pension.employee,
  };

  const netSalary = grossSalary - employeeDeductions.total;
  const totalCost = grossSalary + employerCosts.total;
  const costRatio = totalCost / netSalary;

  return {
    grossSalary: Math.round(grossSalary * 100) / 100,
    employerCosts: {
      socialTax: Math.round(employerCosts.socialTax * 100) / 100,
      unemploymentInsurance: Math.round(employerCosts.unemploymentInsurance * 100) / 100,
      total: Math.round(employerCosts.total * 100) / 100,
    },
    employeeDeductions: {
      incomeTax: Math.round(employeeDeductions.incomeTax * 100) / 100,
      unemploymentInsurance: Math.round(employeeDeductions.unemploymentInsurance * 100) / 100,
      mandatoryPension: Math.round(employeeDeductions.mandatoryPension * 100) / 100,
      total: Math.round(employeeDeductions.total * 100) / 100,
    },
    netSalary: Math.round(netSalary * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    costRatio: Math.round(costRatio * 100) / 100,
  };
}

/**
 * Calculate Estonian Land Tax
 * Rate: 0.1% - 2.5% of land value (set by local municipality)
 * Most common: 1% - 2%
 *
 * @param landValue Taxable value of land
 * @param rate Municipality rate (default 1%)
 * @returns Annual land tax
 */
export function calculateEstonianLandTax(
  landValue: number,
  rate: number = 1
): number {
  if (rate < 0.1 || rate > 2.5) {
    throw new Error('Land tax rate must be between 0.1% and 2.5%');
  }

  return Math.round((landValue * rate) / 100 * 100) / 100;
}

/**
 * Calculate Estonian e-Residency company costs
 * Popular for digital nomads and remote entrepreneurs
 *
 * @param revenue Annual revenue
 * @param expenses Annual expenses
 * @param dividendDistribution Amount to distribute as dividends
 * @returns Cost breakdown
 */
export function calculateEstonianEResidencyCosts(
  revenue: number,
  expenses: number,
  dividendDistribution: number = 0
): {
  profit: number;
  retainedProfit: number;
  corporateTax: number;
  netDividend: number;
  effectiveTaxRate: number;
} {
  const profit = revenue - expenses;
  const retainedProfit = profit - dividendDistribution;

  // Corporate tax only on distributed amount
  const cit = calculateEstonianCIT(dividendDistribution);

  const effectiveTaxRate = profit > 0 ? (cit.taxAmount / profit) * 100 : 0;

  return {
    profit: Math.round(profit * 100) / 100,
    retainedProfit: Math.round(retainedProfit * 100) / 100,
    corporateTax: cit.taxAmount,
    netDividend: cit.netDistribution,
    effectiveTaxRate: Math.round(effectiveTaxRate * 100) / 100,
  };
}

/**
 * Format currency in Estonian format
 * Estonia uses Euro (€) since 2011
 * Format: 1 234,56 € or €1,234.56
 *
 * @param amount Amount to format
 * @param locale 'et-EE' for Estonian, 'en-US' for US format
 * @returns Formatted currency string
 */
export function formatEstonianCurrency(
  amount: number,
  locale: 'et-EE' | 'en-US' = 'et-EE'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

/**
 * Get Estonian fiscal year dates
 * Estonia uses calendar year (Jan 1 - Dec 31)
 *
 * @param year Fiscal year
 * @returns Start and end dates
 */
export function getEstonianFiscalYear(year: number): {
  start: Date;
  end: Date;
  quarters: Array<{ quarter: number; start: Date; end: Date }>;
} {
  const start = new Date(year, 0, 1); // January 1
  const end = new Date(year, 11, 31); // December 31

  const quarters = [
    { quarter: 1, start: new Date(year, 0, 1), end: new Date(year, 2, 31) },   // Q1: Jan-Mar
    { quarter: 2, start: new Date(year, 3, 1), end: new Date(year, 5, 30) },   // Q2: Apr-Jun
    { quarter: 3, start: new Date(year, 6, 1), end: new Date(year, 8, 30) },   // Q3: Jul-Sep
    { quarter: 4, start: new Date(year, 9, 1), end: new Date(year, 11, 31) },  // Q4: Oct-Dec
  ];

  return { start, end, quarters };
}

/**
 * Calculate Estonian tax filing deadlines
 * - VAT: 20th of following month
 * - Social Tax: 10th of following month
 * - Income Tax (annual): June 30 of following year
 * - Corporate Tax: No annual filing for retained profits
 *
 * @param taxType Type of tax
 * @param period Period (month or year)
 * @returns Due date
 */
export function getEstonianTaxDeadline(
  taxType: 'VAT' | 'SOCIAL' | 'PIT_ANNUAL' | 'PIT_MONTHLY',
  period: Date
): Date {
  const year = period.getFullYear();
  const month = period.getMonth();

  switch (taxType) {
    case 'VAT':
      // 20th of following month
      return new Date(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1, 20);

    case 'SOCIAL':
      // 10th of following month
      return new Date(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1, 10);

    case 'PIT_MONTHLY':
      // 10th of following month
      return new Date(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1, 10);

    case 'PIT_ANNUAL':
      // June 30 of following year
      return new Date(year + 1, 5, 30);

    default:
      throw new Error('Invalid tax type');
  }
}
