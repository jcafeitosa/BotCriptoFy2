/**
 * File Validators
 * Validation utilities for file uploads and document operations
 */

import { z } from 'zod';
import type { FileValidationResult } from '../types/documents.types';

/**
 * Maximum file size (50MB by default)
 */
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '52428800'); // 50MB in bytes

/**
 * Allowed MIME types
 * Comprehensive list of commonly used file types
 */
const ALLOWED_MIME_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/rtf',

  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',

  // Archives
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/x-tar',
  'application/gzip',

  // Data formats
  'application/json',
  'application/xml',
  'text/xml',
  'application/yaml',

  // Audio
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/webm',

  // Video
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
];

/**
 * Dangerous file extensions that should be blocked
 */
const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.pif', '.scr',
  '.vbs', '.js', '.jar', '.app', '.deb', '.rpm',
  '.sh', '.bash', '.ps1', '.msi',
];

/**
 * Zod Schema for Document Upload
 */
export const documentUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  folderId: z.string().uuid().optional(),
  description: z.string().max(1000).optional(),
  accessLevel: z.enum(['public', 'tenant', 'private', 'role_based']).optional(),
  allowedRoles: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Zod Schema for Document Update
 */
export const documentUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  folderId: z.string().uuid().optional(),
  accessLevel: z.enum(['public', 'tenant', 'private', 'role_based']).optional(),
  allowedRoles: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Zod Schema for Folder Create
 */
export const folderCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  parentFolderId: z.string().uuid().optional(),
  accessLevel: z.enum(['public', 'tenant', 'private', 'role_based']).optional(),
  allowedRoles: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Zod Schema for Folder Update
 */
export const folderUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  parentFolderId: z.string().uuid().optional(),
  accessLevel: z.enum(['public', 'tenant', 'private', 'role_based']).optional(),
  allowedRoles: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Zod Schema for Document Share
 */
export const documentShareSchema = z.object({
  documentId: z.string().uuid(),
  sharedWithUserId: z.string().optional(),
  sharedWithTenantId: z.string().optional(),
  permission: z.enum(['view', 'download', 'edit', 'delete']),
  expiresAt: z.coerce.date().optional(),
}).refine(
  (data) => data.sharedWithUserId || data.sharedWithTenantId,
  {
    message: 'Either sharedWithUserId or sharedWithTenantId must be provided',
  }
);

/**
 * Zod Schema for Document List Filters
 */
export const documentListFiltersSchema = z.object({
  folderId: z.string().uuid().optional(),
  mimeType: z.string().optional(),
  uploadedBy: z.string().optional(),
  accessLevel: z.enum(['public', 'tenant', 'private', 'role_based']).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  minSize: z.coerce.number().min(0).optional(),
  maxSize: z.coerce.number().min(0).optional(),
  tags: z.array(z.string()).optional(),
  isCurrentVersion: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

/**
 * Zod Schema for Pagination
 */
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * Validate file upload
 */
export function validateFile(
  fileName: string,
  fileSize: number,
  mimeType: string
): FileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate file name
  if (!fileName || fileName.trim() === '') {
    errors.push('File name is required');
  }

  if (fileName.length > 255) {
    errors.push('File name exceeds 255 characters');
  }

  // Check for dangerous extensions
  const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
  if (DANGEROUS_EXTENSIONS.includes(extension)) {
    errors.push(`File extension '${extension}' is not allowed for security reasons`);
  }

  // Validate file size
  if (fileSize <= 0) {
    errors.push('File size must be greater than 0');
  }

  if (fileSize > MAX_FILE_SIZE) {
    errors.push(`File size exceeds maximum allowed size of ${formatBytes(MAX_FILE_SIZE)}`);
  }

  // Validate MIME type
  if (!mimeType || mimeType.trim() === '') {
    errors.push('MIME type is required');
  } else if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    errors.push(`MIME type '${mimeType}' is not allowed`);
  }

  // Warnings for large files
  if (fileSize > 10 * 1024 * 1024) { // 10MB
    warnings.push('Large file detected. Upload may take longer.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate folder name
 */
export function validateFolderName(name: string): FileValidationResult {
  const errors: string[] = [];

  if (!name || name.trim() === '') {
    errors.push('Folder name is required');
  }

  if (name.length > 255) {
    errors.push('Folder name exceeds 255 characters');
  }

  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*\x00-\x1F]/g;
  if (invalidChars.test(name)) {
    errors.push('Folder name contains invalid characters');
  }

  // Check for reserved names
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'LPT1', 'LPT2'];
  if (reservedNames.includes(name.toUpperCase())) {
    errors.push('Folder name is reserved and cannot be used');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Check if folder path would create a circular reference
 */
export function wouldCreateCircularReference(
  folderId: string,
  newParentId: string,
  folderHierarchy: Map<string, string | null>
): boolean {
  let currentId: string | null = newParentId;

  while (currentId) {
    if (currentId === folderId) {
      return true; // Circular reference detected
    }

    currentId = folderHierarchy.get(currentId) || null;
  }

  return false;
}

/**
 * Validate document access
 * Check if user has permission to access document based on access level
 */
export function canAccessDocument(
  accessLevel: string,
  documentTenantId: string,
  userTenantId: string,
  userRoles: string[],
  allowedRoles?: string[] | null
): boolean {
  // Public documents are accessible to everyone
  if (accessLevel === 'public') {
    return true;
  }

  // Tenant-level access requires same tenant
  if (accessLevel === 'tenant') {
    return documentTenantId === userTenantId;
  }

  // Role-based access requires matching role and same tenant
  if (accessLevel === 'role_based') {
    if (documentTenantId !== userTenantId) {
      return false;
    }

    if (!allowedRoles || allowedRoles.length === 0) {
      return false;
    }

    return userRoles.some(role => allowedRoles.includes(role));
  }

  // Private access is handled at service level (owner only)
  return accessLevel === 'private';
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Get MIME type category
 */
export function getMimeTypeCategory(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('text/')) return 'text';

  if (
    mimeType.includes('pdf') ||
    mimeType.includes('word') ||
    mimeType.includes('excel') ||
    mimeType.includes('powerpoint') ||
    mimeType.includes('document')
  ) {
    return 'document';
  }

  if (
    mimeType.includes('zip') ||
    mimeType.includes('rar') ||
    mimeType.includes('7z') ||
    mimeType.includes('tar') ||
    mimeType.includes('gzip')
  ) {
    return 'archive';
  }

  return 'other';
}

/**
 * Export validators
 */
export default {
  documentUploadSchema,
  documentUpdateSchema,
  folderCreateSchema,
  folderUpdateSchema,
  documentShareSchema,
  documentListFiltersSchema,
  paginationSchema,
  validateFile,
  validateFolderName,
  wouldCreateCircularReference,
  canAccessDocument,
  getMimeTypeCategory,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
};
