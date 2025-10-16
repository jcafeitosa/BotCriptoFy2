/**
 * Storage Tests
 * Unit tests for storage utilities
 */

import { describe, it, expect } from 'bun:test';
import {
  sanitizeFileName,
  formatFileSize,
  isValidPath,
  getExtensionFromMimeType,
} from '../utils/storage';

describe('Storage Utilities', () => {
  describe('sanitizeFileName', () => {
    it('should remove special characters', () => {
      const result = sanitizeFileName('file@#$%name.pdf');
      expect(result).toBe('filename.pdf');
    });

    it('should replace spaces with underscores', () => {
      const result = sanitizeFileName('my file name.pdf');
      expect(result).toBe('my_file_name.pdf');
    });

    it('should remove leading dots', () => {
      const result = sanitizeFileName('...hidden.txt');
      expect(result).toBe('hidden.txt');
    });

    it('should preserve valid characters', () => {
      const result = sanitizeFileName('file-name_v1.2.pdf');
      expect(result).toBe('file-name_v1.2.pdf');
    });

    it('should handle empty names', () => {
      const result = sanitizeFileName('');
      expect(result).toBe('unnamed_file');
    });

    it('should truncate long names', () => {
      const longName = 'a'.repeat(300) + '.pdf';
      const result = sanitizeFileName(longName);
      expect(result.length).toBeLessThanOrEqual(255);
      expect(result.endsWith('.pdf')).toBe(true);
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(500)).toBe('500.00 B');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.00 KB');
      expect(formatFileSize(2048)).toBe('2.00 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.00 MB');
      expect(formatFileSize(5 * 1024 * 1024)).toBe('5.00 MB');
    });

    it('should format gigabytes', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.00 GB');
      expect(formatFileSize(2.5 * 1024 * 1024 * 1024)).toBe('2.50 GB');
    });

    it('should format terabytes', () => {
      expect(formatFileSize(1024 * 1024 * 1024 * 1024)).toBe('1.00 TB');
    });

    it('should handle zero', () => {
      expect(formatFileSize(0)).toBe('0.00 B');
    });
  });

  describe('isValidPath', () => {
    it('should accept valid relative paths', () => {
      expect(isValidPath('folder/file.txt')).toBe(true);
      expect(isValidPath('documents/2024/report.pdf')).toBe(true);
    });

    it('should reject directory traversal attempts', () => {
      expect(isValidPath('../../../etc/passwd')).toBe(false);
      expect(isValidPath('folder/../../../secret')).toBe(false);
    });

    it('should reject absolute paths', () => {
      expect(isValidPath('/etc/passwd')).toBe(false);
      expect(isValidPath('/var/www/file.txt')).toBe(false);
    });

    it('should reject paths with tilde', () => {
      expect(isValidPath('~/secrets')).toBe(false);
    });

    it('should reject null bytes', () => {
      expect(isValidPath('file\0.txt')).toBe(false);
    });
  });

  describe('getExtensionFromMimeType', () => {
    it('should return correct extension for common types', () => {
      expect(getExtensionFromMimeType('application/pdf')).toBe('.pdf');
      expect(getExtensionFromMimeType('image/jpeg')).toBe('.jpg');
      expect(getExtensionFromMimeType('image/png')).toBe('.png');
      expect(getExtensionFromMimeType('text/plain')).toBe('.txt');
    });

    it('should return correct extension for office documents', () => {
      expect(getExtensionFromMimeType('application/msword')).toBe('.doc');
      expect(
        getExtensionFromMimeType(
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
      ).toBe('.docx');
      expect(getExtensionFromMimeType('application/vnd.ms-excel')).toBe('.xls');
      expect(
        getExtensionFromMimeType(
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
      ).toBe('.xlsx');
    });

    it('should return empty string for unknown types', () => {
      expect(getExtensionFromMimeType('application/unknown')).toBe('');
      expect(getExtensionFromMimeType('custom/type')).toBe('');
    });
  });
});
