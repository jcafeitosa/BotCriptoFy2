/**
 * Estonian Tax System Validators
 * Validates Estonian tax IDs, VAT numbers, and fiscal documents
 */

/**
 * Validate Estonian Personal Identification Code (Isikukood)
 * Format: GYYMMDDSSSC
 * - G: Gender and century (1-8)
 * - YY: Year (00-99)
 * - MM: Month (01-12)
 * - DD: Day (01-31)
 * - SSS: Serial number (000-999)
 * - C: Check digit
 *
 * @see https://www.riik.ee/en/personal-identification-code
 */
export function validateEstonianPersonalCode(code: string): boolean {
  // Remove any spaces or dashes
  const cleaned = code.replace(/[\s-]/g, '');

  // Must be exactly 11 digits
  if (!/^\d{11}$/.test(cleaned)) {
    return false;
  }

  // Extract components
  const gender = parseInt(cleaned[0], 10);
  const _year = parseInt(cleaned.substring(1, 3), 10);
  const month = parseInt(cleaned.substring(3, 5), 10);
  const day = parseInt(cleaned.substring(5, 7), 10);

  // Validate gender/century indicator (1-8)
  if (gender < 1 || gender > 8) {
    return false;
  }

  // Validate month (01-12)
  if (month < 1 || month > 12) {
    return false;
  }

  // Validate day (01-31)
  if (day < 1 || day > 31) {
    return false;
  }

  // Calculate check digit (Modulo 11 algorithm)
  const weights1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 1];
  const weights2 = [3, 4, 5, 6, 7, 8, 9, 1, 2, 3];

  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i], 10) * weights1[i];
  }

  let checkDigit = sum % 11;

  // If remainder is 10, use second weight set
  if (checkDigit === 10) {
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleaned[i], 10) * weights2[i];
    }
    checkDigit = sum % 11;
    if (checkDigit === 10) {
      checkDigit = 0;
    }
  }

  return checkDigit === parseInt(cleaned[10], 10);
}

/**
 * Validate Estonian Business Registry Code (Registrikood)
 * Format: 8 digits (NNNNNNNN)
 * Used for companies, non-profits, and other legal entities
 *
 * @see https://ariregister.rik.ee/
 */
export function validateEstonianBusinessCode(code: string): boolean {
  // Remove any spaces or dashes
  const cleaned = code.replace(/[\s-]/g, '');

  // Must be exactly 8 digits
  if (!/^\d{8}$/.test(cleaned)) {
    return false;
  }

  // Calculate check digit using weighted sum
  const weights = [7, 3, 1, 7, 3, 1, 7];

  let sum = 0;
  for (let i = 0; i < 7; i++) {
    sum += parseInt(cleaned[i], 10) * weights[i];
  }

  const checkDigit = (10 - (sum % 10)) % 10;

  return checkDigit === parseInt(cleaned[7], 10);
}

/**
 * Validate Estonian VAT Number (KMKR - Käibemaksukohustuslasena registreerimise number)
 * Format: EE + 9 digits (EE123456789)
 * The 9 digits are the business registry code + check digit
 *
 * @see https://www.emta.ee/en
 */
export function validateEstonianVAT(vat: string): boolean {
  // Remove any spaces or dashes
  const cleaned = vat.replace(/[\s-]/g, '').toUpperCase();

  // Must start with EE and have 9 digits
  if (!/^EE\d{9}$/.test(cleaned)) {
    return false;
  }

  // Extract the numeric part
  const numbers = cleaned.substring(2);

  // Validate using weighted sum
  const weights = [3, 7, 1, 3, 7, 1, 3, 7];

  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += parseInt(numbers[i], 10) * weights[i];
  }

  const checkDigit = (10 - (sum % 10)) % 10;

  return checkDigit === parseInt(numbers[8], 10);
}

/**
 * Validate Estonian IBAN (International Bank Account Number)
 * Format: EE + 2 check digits + 16 digits
 * Total: 20 characters (EE12 3456 7890 1234 5678)
 */
export function validateEstonianIBAN(iban: string): boolean {
  // Remove any spaces
  const cleaned = iban.replace(/\s/g, '').toUpperCase();

  // Must start with EE and be exactly 20 characters
  if (!/^EE\d{18}$/.test(cleaned)) {
    return false;
  }

  // IBAN validation using mod-97 algorithm
  const rearranged = cleaned.substring(4) + cleaned.substring(0, 4);

  // Convert letters to numbers (A=10, B=11, ..., Z=35)
  const numeric = rearranged.replace(/[A-Z]/g, (char) =>
    (char.charCodeAt(0) - 55).toString()
  );

  // Calculate mod 97
  let remainder = 0;
  for (let i = 0; i < numeric.length; i++) {
    remainder = (remainder * 10 + parseInt(numeric[i], 10)) % 97;
  }

  return remainder === 1;
}

/**
 * Format Estonian Personal Code
 * Input: 39001010001
 * Output: 390-0101-0001
 */
export function formatEstonianPersonalCode(code: string): string {
  const cleaned = code.replace(/[\s-]/g, '');

  if (cleaned.length !== 11) {
    return code;
  }

  return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 7)}-${cleaned.substring(7, 11)}`;
}

/**
 * Format Estonian VAT Number
 * Input: EE123456789
 * Output: EE 123 456 789
 */
export function formatEstonianVAT(vat: string): string {
  const cleaned = vat.replace(/[\s-]/g, '').toUpperCase();

  if (!cleaned.startsWith('EE') || cleaned.length !== 11) {
    return vat;
  }

  const numbers = cleaned.substring(2);
  return `EE ${numbers.substring(0, 3)} ${numbers.substring(3, 6)} ${numbers.substring(6, 9)}`;
}

/**
 * Format Estonian IBAN
 * Input: EE123456789012345678
 * Output: EE12 3456 7890 1234 5678
 */
export function formatEstonianIBAN(iban: string): string {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();

  if (!cleaned.startsWith('EE') || cleaned.length !== 20) {
    return iban;
  }

  return cleaned.match(/.{1,4}/g)?.join(' ') || iban;
}

/**
 * Sanitize Estonian tax ID (remove formatting)
 */
export function sanitizeEstonianTaxId(taxId: string): string {
  return taxId.replace(/[\s-]/g, '').toUpperCase();
}

/**
 * Validate Estonian e-invoice reference number
 * Estonia uses RF reference format (ISO 11649)
 * Format: RF + 2 check digits + up to 21 alphanumeric characters
 */
export function validateEstonianInvoiceReference(reference: string): boolean {
  const cleaned = reference.replace(/\s/g, '').toUpperCase();

  // Must start with RF and have check digits
  if (!/^RF\d{2}[A-Z0-9]{1,21}$/.test(cleaned)) {
    return false;
  }

  // Validate check digits using mod-97
  const checkDigits = cleaned.substring(2, 4);
  const payload = cleaned.substring(4);

  // Rearrange for mod-97: payload + "RF00"
  const rearranged = payload + 'RF00';

  // Convert to numeric
  const numeric = rearranged.replace(/[A-Z]/g, (char) =>
    (char.charCodeAt(0) - 55).toString()
  );

  // Calculate mod 97
  let remainder = 0;
  for (let i = 0; i < numeric.length; i++) {
    remainder = (remainder * 10 + parseInt(numeric[i], 10)) % 97;
  }

  const calculatedCheck = 98 - remainder;

  return calculatedCheck === parseInt(checkDigits, 10);
}

/**
 * Validate Estonian fiscal period
 * Estonia uses calendar year (January 1 - December 31)
 * Format: YYYY or YYYY-MM or YYYY-QN
 */
export function validateEstonianFiscalPeriod(period: string): boolean {
  // Annual: YYYY
  if (/^\d{4}$/.test(period)) {
    const year = parseInt(period, 10);
    return year >= 1991 && year <= 2100; // Estonia independence from 1991
  }

  // Monthly: YYYY-MM
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [year, month] = period.split('-').map(Number);
    return year >= 1991 && year <= 2100 && month >= 1 && month <= 12;
  }

  // Quarterly: YYYY-Q1, YYYY-Q2, YYYY-Q3, YYYY-Q4
  if (/^\d{4}-Q[1-4]$/.test(period)) {
    const year = parseInt(period.substring(0, 4), 10);
    return year >= 1991 && year <= 2100;
  }

  return false;
}

/**
 * Get Estonian VAT rate for date
 * Estonia standard VAT rate: 20% (2009-2024), 22% (from 2024-07-01)
 * Reduced rate: 9% (books, pharmaceuticals, accommodation)
 * Zero rate: 0% (exports, intra-EU supplies)
 */
export function getEstonianVATRate(date: Date, category: 'standard' | 'reduced' | 'zero' = 'standard'): number {
  if (category === 'zero') {
    return 0;
  }

  if (category === 'reduced') {
    return 9;
  }

  // Standard rate changed from 20% to 22% on July 1, 2024
  const changeDate = new Date('2024-07-01');

  if (date >= changeDate) {
    return 22;
  }

  return 20;
}

/**
 * Validate Estonian company form prefix
 * Common forms: OÜ (private limited), AS (public limited), TÜ (general partnership), etc.
 */
export function validateEstonianCompanyForm(form: string): boolean {
  const validForms = [
    'OÜ',    // Osaühing (Private Limited Company)
    'AS',    // Aktsiaselts (Public Limited Company)
    'TÜ',    // Täisühing (General Partnership)
    'UÜ',    // Usaldusühing (Limited Partnership)
    'MTÜ',   // Mittetulundusühing (Non-profit Association)
    'SA',    // Sihtasutus (Foundation)
    'FIE',   // Füüsilisest isikust ettevõtja (Sole Proprietor)
  ];

  return validForms.includes(form.toUpperCase());
}
