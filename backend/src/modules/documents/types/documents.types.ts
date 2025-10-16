/**
 * Documents Manager Types
 * Type definitions for document management operations
 */

import type { StorageProvider, AccessLevel, SharePermission } from '../schema/documents.schema';

/**
 * Document Upload Request
 */
export interface DocumentUploadRequest {
  file: File | Blob;
  fileName: string;
  folderId?: string;
  description?: string;
  accessLevel?: AccessLevel;
  allowedRoles?: string[];
  metadata?: Record<string, any>;
}

/**
 * Document Update Request
 */
export interface DocumentUpdateRequest {
  name?: string;
  description?: string;
  folderId?: string;
  accessLevel?: AccessLevel;
  allowedRoles?: string[];
  metadata?: Record<string, any>;
}

/**
 * Folder Create Request
 */
export interface FolderCreateRequest {
  name: string;
  description?: string;
  parentFolderId?: string;
  accessLevel?: AccessLevel;
  allowedRoles?: string[];
  metadata?: Record<string, any>;
}

/**
 * Folder Update Request
 */
export interface FolderUpdateRequest {
  name?: string;
  description?: string;
  parentFolderId?: string;
  accessLevel?: AccessLevel;
  allowedRoles?: string[];
  metadata?: Record<string, any>;
}

/**
 * Document Share Request
 */
export interface DocumentShareRequest {
  documentId: string;
  sharedWithUserId?: string;
  sharedWithTenantId?: string;
  permission: SharePermission;
  expiresAt?: Date;
}

/**
 * Document with Details
 */
export interface DocumentWithDetails {
  id: string;
  tenantId: string;
  folderId?: string;
  folderName?: string;
  folderPath?: string;
  name: string;
  description?: string;
  filePath: string;
  fileUrl?: string;
  mimeType: string;
  fileSize: number;
  fileSizeFormatted: string;
  storageProvider: StorageProvider;
  version: number;
  isCurrentVersion: boolean;
  parentDocumentId?: string;
  uploadedBy: string;
  uploadedByName?: string;
  accessLevel: AccessLevel;
  allowedRoles?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

/**
 * Folder with Details
 */
export interface FolderWithDetails {
  id: string;
  tenantId: string;
  parentFolderId?: string;
  name: string;
  description?: string;
  path: string;
  accessLevel: AccessLevel;
  allowedRoles?: string[];
  documentCount: number;
  subfolderCount: number;
  totalSize: number;
  createdBy: string;
  createdByName?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

/**
 * Folder Tree Node
 */
export interface FolderTreeNode {
  id: string;
  name: string;
  path: string;
  parentFolderId?: string;
  documentCount: number;
  subfolderCount: number;
  children: FolderTreeNode[];
}

/**
 * Document Share with Details
 */
export interface DocumentShareWithDetails {
  id: string;
  documentId: string;
  documentName: string;
  sharedWithUserId?: string;
  sharedWithUserName?: string;
  sharedWithTenantId?: string;
  sharedWithTenantName?: string;
  permission: SharePermission;
  expiresAt?: Date;
  isExpired: boolean;
  createdBy: string;
  createdByName?: string;
  createdAt: Date;
}

/**
 * Document List Filters
 */
export interface DocumentListFilters {
  folderId?: string;
  mimeType?: string;
  uploadedBy?: string;
  accessLevel?: AccessLevel;
  fromDate?: Date;
  toDate?: Date;
  minSize?: number;
  maxSize?: number;
  tags?: string[];
  isCurrentVersion?: boolean;
  search?: string;
}

/**
 * Pagination Options
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Storage Upload Result
 */
export interface StorageUploadResult {
  filePath: string;
  fileUrl?: string;
  fileSize: number;
}

/**
 * File Validation Result
 */
export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Document Version Info
 */
export interface DocumentVersionInfo {
  version: number;
  documentId: string;
  name: string;
  fileSize: number;
  uploadedBy: string;
  uploadedByName?: string;
  isCurrentVersion: boolean;
  createdAt: Date;
}

/**
 * Document Statistics
 */
export interface DocumentStatistics {
  totalDocuments: number;
  totalSize: number;
  totalSizeFormatted: string;
  documentsByType: Array<{
    mimeType: string;
    count: number;
    size: number;
  }>;
  documentsByFolder: Array<{
    folderId: string;
    folderName: string;
    count: number;
    size: number;
  }>;
  recentUploads: number; // Last 30 days
  storageUsage: {
    used: number;
    limit: number;
    percentage: number;
  };
}

/**
 * Service Response
 */
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * File Upload Progress
 */
export interface FileUploadProgress {
  documentId?: string;
  fileName: string;
  uploadedBytes: number;
  totalBytes: number;
  percentage: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  error?: string;
}

/**
 * Bulk Operation Result
 */
export interface BulkOperationResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
}

/**
 * Document Search Result
 */
export interface DocumentSearchResult {
  document: DocumentWithDetails;
  score: number;
  highlights: {
    field: string;
    matches: string[];
  }[];
}

/**
 * Export Types
 */
export type {
  StorageProvider,
  AccessLevel,
  SharePermission,
};
