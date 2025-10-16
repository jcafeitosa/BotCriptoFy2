/**
 * Financial Validators
 */

/**
 * Validate CNPJ (Brazilian company tax ID)
 */
export function validateCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/[^\d]+/g, '');

  if (cnpj.length !== 14) return false;

  // Eliminate known invalid CNPJs
  if (/^(\d)\1+$/.test(cnpj)) return false;

  // Validate check digits
  let length = cnpj.length - 2;
  let numbers = cnpj.substring(0, length);
  const digits = cnpj.substring(length);
  let sum = 0;
  let pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  length = length + 1;
  numbers = cnpj.substring(0, length);
  sum = 0;
  pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
}

/**
 * Validate CPF (Brazilian personal tax ID)
 */
export function validateCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]+/g, '');

  if (cpf.length !== 11) return false;

  // Eliminate known invalid CPFs
  if (/^(\d)\1+$/.test(cpf)) return false;

  // Validate check digits
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }

  let remainder = 11 - (sum % 11);
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }

  remainder = 11 - (sum % 11);
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(10))) return false;

  return true;
}

/**
 * Validate email
 */
export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Validate date range
 */
export function validateDateRange(startDate: Date, endDate: Date): boolean {
  return startDate <= endDate;
}

/**
 * Validate fiscal period format (YYYY-MM)
 */
export function validateFiscalPeriod(period: string): boolean {
  const re = /^\d{4}-(0[1-9]|1[0-2])$/;
  return re.test(period);
}

/**
 * Validate amount (positive number)
 */
export function validateAmount(amount: string | number): boolean {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return !isNaN(num) && num >= 0;
}

/**
 * Validate currency code (3 letters)
 */
export function validateCurrency(currency: string): boolean {
  const re = /^[A-Z]{3}$/;
  return re.test(currency);
}

/**
 * Validate Brazilian bank account
 */
export function validateBankAccount(account: string): boolean {
  // Remove non-digits
  const cleaned = account.replace(/\D/g, '');

  // Bank account should have 4-12 digits
  return cleaned.length >= 4 && cleaned.length <= 12;
}

/**
 * Validate double-entry (debits = credits)
 */
export function validateDoubleEntry(
  lines: Array<{ entryType: 'debit' | 'credit'; amount: string }>
): { valid: boolean; debitsTotal: number; creditsTotal: number; difference: number } {
  const debitsTotal = lines
    .filter((l) => l.entryType === 'debit')
    .reduce((sum, l) => sum + parseFloat(l.amount), 0);

  const creditsTotal = lines
    .filter((l) => l.entryType === 'credit')
    .reduce((sum, l) => sum + parseFloat(l.amount), 0);

  const difference = Math.abs(debitsTotal - creditsTotal);
  const valid = difference < 0.01; // Allow 1 cent difference for rounding

  return {
    valid,
    debitsTotal,
    creditsTotal,
    difference,
  };
}

/**
 * Validate invoice number format
 */
export function validateInvoiceNumber(invoiceNumber: string): boolean {
  // Allow alphanumeric with dashes and slashes
  const re = /^[A-Z0-9\-\/]+$/;
  return re.test(invoiceNumber);
}

/**
 * Sanitize tax ID (remove formatting)
 */
export function sanitizeTaxId(taxId: string): string {
  return taxId.replace(/[^\d]+/g, '');
}

/**
 * Format tax ID for display
 */
export function formatTaxId(taxId: string): string {
  const cleaned = sanitizeTaxId(taxId);

  if (cleaned.length === 11) {
    // CPF: 000.000.000-00
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (cleaned.length === 14) {
    // CNPJ: 00.000.000/0000-00
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  return taxId;
}

/**
 * Validate NF-e key (44 digits)
 */
export function validateNFeKey(key: string): boolean {
  const cleaned = key.replace(/\s/g, '');
  return /^\d{44}$/.test(cleaned);
}

/**
 * Format NF-e key for display
 */
export function formatNFeKey(key: string): string {
  const cleaned = key.replace(/\s/g, '');
  // Format as: 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000
  return cleaned.replace(/(\d{4})/g, '$1 ').trim();
}
