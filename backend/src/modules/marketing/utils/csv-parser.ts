/**
 * CSV Parser
 * Parse CSV files for lead import
 */

import logger from '@/utils/logger';
import { EmailValidator } from './email-validator';
import type { CreateLeadData } from '../types';

/**
 * CSV Row
 */
export interface CSVRow {
  [key: string]: string;
}

/**
 * CSV Parse Result
 */
export interface CSVParseResult {
  success: boolean;
  data: CreateLeadData[];
  errors: Array<{
    row: number;
    error: string;
  }>;
}

/**
 * CSV Parser class
 */
export class CSVParser {
  /**
   * Parse CSV text content
   */
  static parse(csvContent: string, source: string = 'csv_import'): CSVParseResult {
    const errors: Array<{ row: number; error: string }> = [];
    const data: CreateLeadData[] = [];

    try {
      // Split into lines
      const lines = csvContent.split(/\r?\n/).filter((line) => line.trim());

      if (lines.length < 2) {
        return {
          success: false,
          data: [],
          errors: [{ row: 0, error: 'CSV file is empty or has no data rows' }],
        };
      }

      // Parse header
      const headers = this.parseCSVLine(lines[0]);
      const headerMap = this.mapHeaders(headers);

      // Validate required columns
      if (!headerMap.email) {
        return {
          success: false,
          data: [],
          errors: [{ row: 0, error: 'CSV must have an "email" column' }],
        };
      }

      // Parse data rows
      for (let i = 1; i < lines.length; i++) {
        const rowNumber = i + 1;
        const values = this.parseCSVLine(lines[i]);

        // Skip empty rows
        if (values.every((v) => !v.trim())) {
          continue;
        }

        try {
          const rowData = this.parseRow(values, headerMap, source);
          data.push(rowData);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push({ row: rowNumber, error: errorMessage });
          logger.debug('CSV row parse error', { row: rowNumber, error: errorMessage });
        }
      }

      logger.info('CSV parsed', {
        totalRows: lines.length - 1,
        successfulRows: data.length,
        errorRows: errors.length,
      });

      return {
        success: errors.length === 0,
        data,
        errors,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('CSV parse error', { error: errorMessage });

      return {
        success: false,
        data: [],
        errors: [{ row: 0, error: errorMessage }],
      };
    }
  }

  /**
   * Parse a single CSV line (handles quoted values)
   */
  private static parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let currentValue = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          // Escaped quote
          currentValue += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        // End of value
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }

    // Add last value
    values.push(currentValue.trim());

    return values;
  }

  /**
   * Map CSV headers to standard field names
   */
  private static mapHeaders(headers: string[]): Record<string, number> {
    const map: Record<string, number> = {};

    headers.forEach((header, index) => {
      const normalized = header.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');

      // Map common variations to standard field names
      if (normalized === 'email' || normalized === 'e_mail' || normalized === 'email_address') {
        map.email = index;
      } else if (
        normalized === 'first_name' ||
        normalized === 'firstname' ||
        normalized === 'fname'
      ) {
        map.firstName = index;
      } else if (normalized === 'last_name' || normalized === 'lastname' || normalized === 'lname') {
        map.lastName = index;
      } else if (normalized === 'phone' || normalized === 'phone_number' || normalized === 'mobile') {
        map.phone = index;
      } else if (normalized === 'company' || normalized === 'organization' || normalized === 'org') {
        map.company = index;
      } else if (
        normalized === 'job_title' ||
        normalized === 'title' ||
        normalized === 'position'
      ) {
        map.jobTitle = index;
      } else if (normalized === 'tags' || normalized === 'labels') {
        map.tags = index;
      } else {
        // Store as custom field
        map[`custom_${normalized}`] = index;
      }
    });

    return map;
  }

  /**
   * Parse a single row into CreateLeadData
   */
  private static parseRow(
    values: string[],
    headerMap: Record<string, number>,
    source: string
  ): CreateLeadData {
    // Get email (required)
    const email = values[headerMap.email]?.trim();
    if (!email) {
      throw new Error('Email is required');
    }

    // Validate email
    const emailValidation = EmailValidator.validate(email);
    if (!emailValidation.valid) {
      throw new Error(`Invalid email: ${emailValidation.errors.join(', ')}`);
    }

    // Extract standard fields
    const leadData: CreateLeadData = {
      email: emailValidation.email,
      source,
    };

    // Optional fields
    if (headerMap.firstName !== undefined) {
      const firstName = values[headerMap.firstName]?.trim();
      if (firstName) leadData.firstName = firstName;
    }

    if (headerMap.lastName !== undefined) {
      const lastName = values[headerMap.lastName]?.trim();
      if (lastName) leadData.lastName = lastName;
    }

    if (headerMap.phone !== undefined) {
      const phone = values[headerMap.phone]?.trim();
      if (phone) leadData.phone = phone;
    }

    if (headerMap.company !== undefined) {
      const company = values[headerMap.company]?.trim();
      if (company) leadData.company = company;
    }

    if (headerMap.jobTitle !== undefined) {
      const jobTitle = values[headerMap.jobTitle]?.trim();
      if (jobTitle) leadData.jobTitle = jobTitle;
    }

    // Parse tags
    if (headerMap.tags !== undefined) {
      const tagsStr = values[headerMap.tags]?.trim();
      if (tagsStr) {
        leadData.tags = tagsStr
          .split(/[,;|]/)
          .map((t) => t.trim())
          .filter((t) => t);
      }
    }

    // Custom fields
    const customFields: Record<string, any> = {};
    Object.entries(headerMap).forEach(([key, index]) => {
      if (key.startsWith('custom_')) {
        const value = values[index]?.trim();
        if (value) {
          const fieldName = key.replace('custom_', '');
          customFields[fieldName] = value;
        }
      }
    });

    if (Object.keys(customFields).length > 0) {
      leadData.customFields = customFields;
    }

    return leadData;
  }

  /**
   * Generate CSV template
   */
  static generateTemplate(): string {
    const headers = [
      'email',
      'first_name',
      'last_name',
      'phone',
      'company',
      'job_title',
      'tags',
    ];

    const exampleRow = [
      'john.doe@example.com',
      'John',
      'Doe',
      '+1-555-1234',
      'Acme Inc',
      'Marketing Director',
      'vip,enterprise',
    ];

    return `${headers.join(',')}\n${exampleRow.join(',')}\n`;
  }

  /**
   * Validate CSV format (without parsing all data)
   */
  static validateFormat(csvContent: string): { valid: boolean; error?: string } {
    try {
      const lines = csvContent.split(/\r?\n/).filter((line) => line.trim());

      if (lines.length < 1) {
        return { valid: false, error: 'CSV file is empty' };
      }

      const headers = this.parseCSVLine(lines[0]);
      const headerMap = this.mapHeaders(headers);

      if (!headerMap.email) {
        return { valid: false, error: 'CSV must have an "email" column' };
      }

      return { valid: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { valid: false, error: errorMessage };
    }
  }
}

/**
 * Convenience function for parsing CSV
 */
export function parseCSV(csvContent: string, source?: string): CSVParseResult {
  return CSVParser.parse(csvContent, source);
}

/**
 * Convenience function for generating template
 */
export function generateCSVTemplate(): string {
  return CSVParser.generateTemplate();
}
