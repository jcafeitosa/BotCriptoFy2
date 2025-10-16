/**
 * Validators Tests
 * Unit tests for document validators
 */

import { describe, it, expect } from 'bun:test';
import {
  validateFile,
  validateFolderName,
  canAccessDocument,
  wouldCreateCircularReference,
  getMimeTypeCategory,
} from '../utils/validators';

describe('Document Validators', () => {
  describe('validateFile', () => {
    it('should validate correct file', () => {
      const result = validateFile('test.pdf', 1024, 'application/pdf');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty file name', () => {
      const result = validateFile('', 1024, 'application/pdf');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File name is required');
    });

    it('should reject oversized file', () => {
      const result = validateFile('test.pdf', 100 * 1024 * 1024, 'application/pdf');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject dangerous file extension', () => {
      const result = validateFile('malware.exe', 1024, 'application/octet-stream');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('not allowed'))).toBe(true);
    });

    it('should reject invalid MIME type', () => {
      const result = validateFile('test.unknown', 1024, 'application/x-unknown');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('MIME type'))).toBe(true);
    });

    it('should warn about large files', () => {
      const result = validateFile('large.pdf', 15 * 1024 * 1024, 'application/pdf');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.length ?? 0).toBeGreaterThan(0);
    });
  });

  describe('validateFolderName', () => {
    it('should validate correct folder name', () => {
      const result = validateFolderName('My Documents');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty name', () => {
      const result = validateFolderName('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Folder name is required');
    });

    it('should reject invalid characters', () => {
      const result = validateFolderName('folder/name');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('invalid characters'))).toBe(true);
    });

    it('should reject reserved names', () => {
      const result = validateFolderName('CON');
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('reserved'))).toBe(true);
    });

    it('should reject too long names', () => {
      const result = validateFolderName('a'.repeat(300));
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('exceeds'))).toBe(true);
    });
  });

  describe('canAccessDocument', () => {
    it('should allow access to public documents', () => {
      const result = canAccessDocument('public', 'tenant1', 'tenant2', [], null);
      expect(result).toBe(true);
    });

    it('should allow access to tenant documents for same tenant', () => {
      const result = canAccessDocument('tenant', 'tenant1', 'tenant1', [], null);
      expect(result).toBe(true);
    });

    it('should deny access to tenant documents for different tenant', () => {
      const result = canAccessDocument('tenant', 'tenant1', 'tenant2', [], null);
      expect(result).toBe(false);
    });

    it('should allow role-based access with matching role', () => {
      const result = canAccessDocument(
        'role_based',
        'tenant1',
        'tenant1',
        ['admin', 'editor'],
        ['editor']
      );
      expect(result).toBe(true);
    });

    it('should deny role-based access without matching role', () => {
      const result = canAccessDocument(
        'role_based',
        'tenant1',
        'tenant1',
        ['viewer'],
        ['admin', 'editor']
      );
      expect(result).toBe(false);
    });

    it('should deny role-based access for different tenant', () => {
      const result = canAccessDocument(
        'role_based',
        'tenant1',
        'tenant2',
        ['admin'],
        ['admin']
      );
      expect(result).toBe(false);
    });
  });

  describe('wouldCreateCircularReference', () => {
    it('should detect direct circular reference', () => {
      const hierarchy = new Map<string, string | null>([
        ['folder1', null],
        ['folder2', 'folder1'],
      ]);

      const result = wouldCreateCircularReference('folder1', 'folder2', hierarchy);
      expect(result).toBe(true);
    });

    it('should detect indirect circular reference', () => {
      const hierarchy = new Map<string, string | null>([
        ['folder1', null],
        ['folder2', 'folder1'],
        ['folder3', 'folder2'],
      ]);

      const result = wouldCreateCircularReference('folder1', 'folder3', hierarchy);
      expect(result).toBe(true);
    });

    it('should allow valid hierarchy', () => {
      const hierarchy = new Map<string, string | null>([
        ['folder1', null],
        ['folder2', null],
        ['folder3', 'folder2'],
      ]);

      const result = wouldCreateCircularReference('folder1', 'folder2', hierarchy);
      expect(result).toBe(false);
    });
  });

  describe('getMimeTypeCategory', () => {
    it('should categorize images', () => {
      expect(getMimeTypeCategory('image/jpeg')).toBe('image');
      expect(getMimeTypeCategory('image/png')).toBe('image');
    });

    it('should categorize videos', () => {
      expect(getMimeTypeCategory('video/mp4')).toBe('video');
    });

    it('should categorize audio', () => {
      expect(getMimeTypeCategory('audio/mpeg')).toBe('audio');
    });

    it('should categorize documents', () => {
      expect(getMimeTypeCategory('application/pdf')).toBe('document');
      expect(getMimeTypeCategory('application/msword')).toBe('document');
    });

    it('should categorize archives', () => {
      expect(getMimeTypeCategory('application/zip')).toBe('archive');
      expect(getMimeTypeCategory('application/x-rar-compressed')).toBe('archive');
    });

    it('should categorize text files', () => {
      expect(getMimeTypeCategory('text/plain')).toBe('text');
      expect(getMimeTypeCategory('text/csv')).toBe('text');
    });

    it('should categorize unknown as other', () => {
      expect(getMimeTypeCategory('application/octet-stream')).toBe('other');
    });
  });
});
