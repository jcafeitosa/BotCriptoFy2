/**
 * Storage Handlers
 * Implements storage operations for different providers (Local, S3, GCS)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import logger from '../../../utils/logger';
import type { StorageProvider } from '../schema/documents.schema';
import type { StorageUploadResult } from '../types/documents.types';

/**
 * Storage Handler Interface
 */
export interface StorageHandler {
  upload(file: Buffer, filePath: string, mimeType: string): Promise<StorageUploadResult>;
  download(filePath: string): Promise<Buffer>;
  delete(filePath: string): Promise<void>;
  exists(filePath: string): Promise<boolean>;
  getSignedUrl(filePath: string, expiresIn: number): Promise<string>;
}

/**
 * Local File System Storage Handler
 */
export class LocalStorageHandler implements StorageHandler {
  private readonly baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || process.env.STORAGE_LOCAL_PATH || './storage/documents';
  }

  /**
   * Upload file to local storage
   */
  async upload(file: Buffer, filePath: string, mimeType: string): Promise<StorageUploadResult> {
    try {
      const fullPath = path.join(this.baseDir, filePath);
      const directory = path.dirname(fullPath);

      // Ensure directory exists
      await fs.mkdir(directory, { recursive: true });

      // Write file
      await fs.writeFile(fullPath, file);

      const stats = await fs.stat(fullPath);

      logger.info('File uploaded to local storage', {
        filePath,
        size: stats.size,
        mimeType,
      });

      return {
        filePath,
        fileUrl: undefined, // Local storage doesn't provide public URLs
        fileSize: stats.size,
      };
    } catch (error) {
      logger.error('Local storage upload failed', {
        filePath,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Download file from local storage
   */
  async download(filePath: string): Promise<Buffer> {
    try {
      const fullPath = path.join(this.baseDir, filePath);
      const file = await fs.readFile(fullPath);

      logger.debug('File downloaded from local storage', { filePath });
      return file;
    } catch (error) {
      logger.error('Local storage download failed', {
        filePath,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Failed to download file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete file from local storage
   */
  async delete(filePath: string): Promise<void> {
    try {
      const fullPath = path.join(this.baseDir, filePath);
      await fs.unlink(fullPath);

      logger.info('File deleted from local storage', { filePath });
    } catch (error) {
      logger.error('Local storage delete failed', {
        filePath,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if file exists in local storage
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.baseDir, filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get signed URL (not supported for local storage)
   */
  async getSignedUrl(_filePath: string, _expiresIn: number): Promise<string> {
    throw new Error('Signed URLs are not supported for local storage');
  }
}

// S3 and GCS storage handlers removed to eliminate non-functional code.
// Implement with @aws-sdk/client-s3 and @google-cloud/storage when needed.

/**
 * Get Storage Handler by Provider
 * Factory pattern for selecting storage provider
 */
export function getStorageHandler(provider: StorageProvider): StorageHandler {
  if (provider === 'local') {
    return new LocalStorageHandler();
  }

  // TypeScript will ensure only 'local' can be passed
  throw new Error(`Unsupported storage provider: ${provider}`);
}

/**
 * Generate unique file path
 * Creates a path with tenant isolation and collision prevention
 */
export function generateFilePath(
  tenantId: string,
  fileName: string,
  folderId?: string
): string {
  // Generate unique ID
  const uniqueId = crypto.randomBytes(8).toString('hex');

  // Sanitize file name
  const sanitized = sanitizeFileName(fileName);

  // Extract extension
  const ext = path.extname(sanitized);
  const baseName = path.basename(sanitized, ext);

  // Build path
  const parts = [tenantId];

  if (folderId) {
    parts.push(folderId);
  }

  parts.push(`${baseName}-${uniqueId}${ext}`);

  return parts.join('/');
}

/**
 * Sanitize file name
 * Remove potentially dangerous characters
 */
export function sanitizeFileName(fileName: string): string {
  // Replace spaces with underscores
  let sanitized = fileName.replace(/\s+/g, '_');

  // Remove special characters except dots, dashes, and underscores
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '');

  // Remove leading dots (hidden files)
  sanitized = sanitized.replace(/^\.+/, '');

  // Limit length to 255 characters
  if (sanitized.length > 255) {
    const ext = path.extname(sanitized);
    const baseName = path.basename(sanitized, ext);
    sanitized = baseName.substring(0, 255 - ext.length) + ext;
  }

  return sanitized || 'unnamed_file';
}

/**
 * Format file size for human reading
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Get file extension from mime type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'text/plain': '.txt',
    'text/csv': '.csv',
    'application/json': '.json',
    'application/xml': '.xml',
    'application/zip': '.zip',
    'application/x-rar-compressed': '.rar',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  };

  return mimeToExt[mimeType] || '';
}

/**
 * Validate path to prevent directory traversal attacks
 */
export function isValidPath(filePath: string): boolean {
  // Check for directory traversal attempts
  if (filePath.includes('..') || filePath.includes('~')) {
    return false;
  }

  // Check for absolute paths
  if (path.isAbsolute(filePath)) {
    return false;
  }

  // Check for null bytes
  if (filePath.includes('\0')) {
    return false;
  }

  return true;
}

/**
 * Export all utilities
 */
export default {
  getStorageHandler,
  generateFilePath,
  sanitizeFileName,
  formatFileSize,
  getExtensionFromMimeType,
  isValidPath,
};
