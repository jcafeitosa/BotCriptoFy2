/**
 * Documents Service
 * Business logic for document management operations
 */

import { db } from '../../../db';
import { eq, and, sql, desc, asc, isNull, or, ilike, gte, lte } from 'drizzle-orm';
import { documents, folders, documentShares } from '../schema/documents.schema';
import { cacheManager } from '../../../cache/cache-manager';
import logger from '../../../utils/logger';
import {
  getStorageHandler,
  generateFilePath,
  formatFileSize,
  sanitizeFileName,
} from '../utils/storage';
import {
  validateFile,
  canAccessDocument,
  documentUploadSchema,
  documentUpdateSchema,
  documentShareSchema,
  documentListFiltersSchema,
  paginationSchema,
} from '../utils/validators';
import type {
  DocumentUploadRequest,
  DocumentUpdateRequest,
  DocumentWithDetails,
  DocumentListFilters,
  PaginationOptions,
  PaginatedResponse,
  ServiceResponse,
  DocumentVersionInfo,
  DocumentShareRequest,
  DocumentShareWithDetails,
  DocumentSearchResult,
} from '../types/documents.types';
import type { StorageProvider } from '../schema/documents.schema';

export class DocumentsService {
  private readonly CACHE_NAMESPACE = 'documents';
  private readonly CACHE_TTL = 300; // 5 minutes

  /**
   * Upload new document
   */
  async uploadDocument(
    file: Buffer,
    request: DocumentUploadRequest,
    userId: string,
    tenantId: string
  ): Promise<ServiceResponse<DocumentWithDetails>> {
    try {
      // Validate request
      const validated = documentUploadSchema.parse({
        fileName: request.fileName,
        folderId: request.folderId,
        description: request.description,
        accessLevel: request.accessLevel,
        allowedRoles: request.allowedRoles,
        metadata: request.metadata,
      });

      // Detect MIME type (in real scenario, use file-type library)
      const mimeType = this.detectMimeType(request.fileName);

      // Validate file
      const validation = validateFile(request.fileName, file.length, mimeType);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', '),
          code: 'VALIDATION_ERROR',
        };
      }

      // Verify folder exists and user has access (if folderId provided)
      if (validated.folderId) {
        const folder = await db.query.folders.findFirst({
          where: and(
            eq(folders.id, validated.folderId),
            eq(folders.tenantId, tenantId),
            isNull(folders.deletedAt)
          ),
        });

        if (!folder) {
          return {
            success: false,
            error: 'Folder not found',
            code: 'FOLDER_NOT_FOUND',
          };
        }
      }

      // Get storage provider (default to local)
      const storageProvider: StorageProvider =
        (process.env.STORAGE_PROVIDER as StorageProvider) || 'local';
      const storage = getStorageHandler(storageProvider);

      // Generate unique file path
      const filePath = generateFilePath(
        tenantId,
        sanitizeFileName(validated.fileName),
        validated.folderId
      );

      // Upload to storage
      const uploadResult = await storage.upload(file, filePath, mimeType);

      // Create document record
      const [document] = await db
        .insert(documents)
        .values({
          tenantId,
          folderId: validated.folderId,
          name: validated.fileName,
          description: validated.description,
          filePath: uploadResult.filePath,
          fileUrl: uploadResult.fileUrl,
          mimeType,
          fileSize: uploadResult.fileSize,
          storageProvider,
          version: 1,
          isCurrentVersion: true,
          uploadedBy: userId,
          accessLevel: validated.accessLevel || 'tenant',
          allowedRoles: validated.allowedRoles,
          metadata: validated.metadata,
        })
        .returning();

      logger.info('Document uploaded', {
        documentId: document.id,
        tenantId,
        userId,
        fileName: validated.fileName,
        fileSize: uploadResult.fileSize,
      });

      // Get full document details
      const documentDetails = await this.getDocumentById(document.id, userId, tenantId);

      // Invalidate cache
      await this.invalidateCache(tenantId);

      return documentDetails;
    } catch (error) {
      logger.error('Document upload failed', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        tenantId,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
        code: 'UPLOAD_ERROR',
      };
    }
  }

  /**
   * Get document by ID
   */
  async getDocumentById(
    id: string,
    userId: string,
    tenantId: string
  ): Promise<ServiceResponse<DocumentWithDetails>> {
    try {
      const cacheKey = `document:${id}`;

      // Try cache first
      const cached = await cacheManager.get<DocumentWithDetails>(this.CACHE_NAMESPACE, cacheKey);
      if (cached && cached.tenantId === tenantId) {
        return { success: true, data: cached };
      }

      // Query document with related data
      const document = await db.query.documents.findFirst({
        where: and(eq(documents.id, id), isNull(documents.deletedAt)),
        with: {
          folder: true,
          uploadedByUser: true,
        },
      });

      if (!document) {
        return {
          success: false,
          error: 'Document not found',
          code: 'NOT_FOUND',
        };
      }

      // Check access permissions
      // Get user roles from auth context
      const userRoles = await this.getUserRoles(userId, tenantId);
      const hasAccess =
        document.tenantId === tenantId &&
        (document.uploadedBy === userId ||
          canAccessDocument(
            document.accessLevel,
            document.tenantId,
            tenantId,
            userRoles,
            document.allowedRoles
          ));

      if (!hasAccess) {
        return {
          success: false,
          error: 'Access denied',
          code: 'ACCESS_DENIED',
        };
      }

      const details: DocumentWithDetails = {
        ...document,
        fileSizeFormatted: formatFileSize(document.fileSize),
        folderName: (document.folder as any)?.name,
        folderPath: (document.folder as any)?.path,
        uploadedByName: (document.uploadedByUser as any)?.name,
      } as DocumentWithDetails;

      // Cache result
      await cacheManager.set(this.CACHE_NAMESPACE, cacheKey, details, this.CACHE_TTL);

      return { success: true, data: details };
    } catch (error) {
      logger.error('Get document failed', {
        error: error instanceof Error ? error.message : String(error),
        documentId: id,
        userId,
        tenantId,
      });

      return {
        success: false,
        error: 'Failed to retrieve document',
        code: 'QUERY_ERROR',
      };
    }
  }

  /**
   * List documents with filters and pagination
   */
  async listDocuments(
    filters: DocumentListFilters,
    pagination: PaginationOptions,
    userId: string,
    tenantId: string
  ): Promise<ServiceResponse<PaginatedResponse<DocumentWithDetails>>> {
    try {
      // Validate inputs
      const validatedFilters = documentListFiltersSchema.parse(filters);
      const validatedPagination = paginationSchema.parse(pagination);

      // Build query conditions
      const conditions = [eq(documents.tenantId, tenantId), isNull(documents.deletedAt)];

      if (validatedFilters.folderId) {
        conditions.push(eq(documents.folderId, validatedFilters.folderId));
      }

      if (validatedFilters.mimeType) {
        conditions.push(eq(documents.mimeType, validatedFilters.mimeType));
      }

      if (validatedFilters.uploadedBy) {
        conditions.push(eq(documents.uploadedBy, validatedFilters.uploadedBy));
      }

      if (validatedFilters.accessLevel) {
        conditions.push(eq(documents.accessLevel, validatedFilters.accessLevel));
      }

      if (validatedFilters.fromDate) {
        conditions.push(gte(documents.createdAt, validatedFilters.fromDate));
      }

      if (validatedFilters.toDate) {
        conditions.push(lte(documents.createdAt, validatedFilters.toDate));
      }

      if (validatedFilters.isCurrentVersion !== undefined) {
        conditions.push(eq(documents.isCurrentVersion, validatedFilters.isCurrentVersion));
      }

      if (validatedFilters.search) {
        conditions.push(ilike(documents.name, `%${validatedFilters.search}%`));
      }

      // Count total
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(documents)
        .where(and(...conditions));

      // Calculate pagination
      const { page, limit, sortBy, sortOrder } = validatedPagination;
      const offset = (page - 1) * limit;
      const totalPages = Math.ceil(count / limit);

      // Get documents
      const sortColumn = sortBy === 'name' ? documents.name : documents.createdAt;
      const sortDirection = sortOrder === 'asc' ? asc : desc;

      const results = await db.query.documents.findMany({
        where: and(...conditions),
        with: {
          folder: true,
          uploadedByUser: true,
        },
        orderBy: sortDirection(sortColumn),
        limit,
        offset,
      });

      const documentsList: DocumentWithDetails[] = results.map((doc) => ({
        ...doc,
        fileSizeFormatted: formatFileSize(doc.fileSize),
        folderName: (doc.folder as any)?.name,
        folderPath: (doc.folder as any)?.path,
        uploadedByName: (doc.uploadedByUser as any)?.name,
      } as DocumentWithDetails));

      return {
        success: true,
        data: {
          data: documentsList,
          pagination: {
            page,
            limit,
            total: count,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        },
      };
    } catch (error) {
      logger.error('List documents failed', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        tenantId,
      });

      return {
        success: false,
        error: 'Failed to list documents',
        code: 'QUERY_ERROR',
      };
    }
  }

  /**
   * Update document metadata
   */
  async updateDocument(
    id: string,
    request: DocumentUpdateRequest,
    userId: string,
    tenantId: string
  ): Promise<ServiceResponse<DocumentWithDetails>> {
    try {
      // Validate request
      const validated = documentUpdateSchema.parse(request);

      // Check document exists and user has access
      const existing = await this.getDocumentById(id, userId, tenantId);
      if (!existing.success || !existing.data) {
        return existing;
      }

      // Verify folder if changing
      if (validated.folderId && validated.folderId !== existing.data.folderId) {
        const folder = await db.query.folders.findFirst({
          where: and(
            eq(folders.id, validated.folderId),
            eq(folders.tenantId, tenantId),
            isNull(folders.deletedAt)
          ),
        });

        if (!folder) {
          return {
            success: false,
            error: 'Target folder not found',
            code: 'FOLDER_NOT_FOUND',
          };
        }
      }

      // Update document
      await db
        .update(documents)
        .set({
          ...validated,
          updatedAt: new Date(),
        })
        .where(and(eq(documents.id, id), eq(documents.tenantId, tenantId)))
        .returning();

      logger.info('Document updated', {
        documentId: id,
        userId,
        tenantId,
        changes: validated,
      });

      // Invalidate cache
      await this.invalidateCache(tenantId, id);

      return await this.getDocumentById(id, userId, tenantId);
    } catch (error) {
      logger.error('Update document failed', {
        error: error instanceof Error ? error.message : String(error),
        documentId: id,
        userId,
        tenantId,
      });

      return {
        success: false,
        error: 'Failed to update document',
        code: 'UPDATE_ERROR',
      };
    }
  }

  /**
   * Delete document (soft delete)
   */
  async deleteDocument(
    id: string,
    userId: string,
    tenantId: string
  ): Promise<ServiceResponse<void>> {
    try {
      // Check document exists and user has access
      const existing = await this.getDocumentById(id, userId, tenantId);
      if (!existing.success || !existing.data) {
        return { success: false, error: existing.error, code: existing.code };
      }

      // Soft delete
      await db
        .update(documents)
        .set({ deletedAt: new Date() })
        .where(and(eq(documents.id, id), eq(documents.tenantId, tenantId)));

      logger.info('Document deleted', {
        documentId: id,
        userId,
        tenantId,
      });

      // Invalidate cache
      await this.invalidateCache(tenantId, id);

      return { success: true };
    } catch (error) {
      logger.error('Delete document failed', {
        error: error instanceof Error ? error.message : String(error),
        documentId: id,
        userId,
        tenantId,
      });

      return {
        success: false,
        error: 'Failed to delete document',
        code: 'DELETE_ERROR',
      };
    }
  }

  /**
   * Download document
   */
  async downloadDocument(
    id: string,
    userId: string,
    tenantId: string
  ): Promise<ServiceResponse<{ file: Buffer; document: DocumentWithDetails }>> {
    try {
      // Check access
      const documentResult = await this.getDocumentById(id, userId, tenantId);
      if (!documentResult.success || !documentResult.data) {
        return { success: false, error: documentResult.error, code: documentResult.code };
      }

      const document = documentResult.data;

      // Download from storage
      const storage = getStorageHandler(document.storageProvider);
      const file = await storage.download(document.filePath);

      logger.info('Document downloaded', {
        documentId: id,
        userId,
        tenantId,
        fileName: document.name,
      });

      return {
        success: true,
        data: { file, document },
      };
    } catch (error) {
      logger.error('Download document failed', {
        error: error instanceof Error ? error.message : String(error),
        documentId: id,
        userId,
        tenantId,
      });

      return {
        success: false,
        error: 'Failed to download document',
        code: 'DOWNLOAD_ERROR',
      };
    }
  }

  /**
   * Create new version of document
   */
  async createNewVersion(
    documentId: string,
    file: Buffer,
    fileName: string,
    userId: string,
    tenantId: string
  ): Promise<ServiceResponse<DocumentWithDetails>> {
    try {
      // Get parent document
      const parentResult = await this.getDocumentById(documentId, userId, tenantId);
      if (!parentResult.success || !parentResult.data) {
        return { success: false, error: parentResult.error, code: parentResult.code };
      }

      const parent = parentResult.data;

      // Detect MIME type
      const mimeType = this.detectMimeType(fileName);

      // Validate file
      const validation = validateFile(fileName, file.length, mimeType);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', '),
          code: 'VALIDATION_ERROR',
        };
      }

      // Upload new version
      const storage = getStorageHandler(parent.storageProvider);
      const filePath = generateFilePath(tenantId, sanitizeFileName(fileName), parent.folderId);
      const uploadResult = await storage.upload(file, filePath, mimeType);

      // Mark current version as old
      await db
        .update(documents)
        .set({ isCurrentVersion: false })
        .where(
          and(
            or(eq(documents.id, documentId), eq(documents.parentDocumentId, documentId)),
            eq(documents.isCurrentVersion, true)
          )
        );

      // Get next version number
      const versions = await db.query.documents.findMany({
        where: or(eq(documents.id, documentId), eq(documents.parentDocumentId, documentId)),
        orderBy: desc(documents.version),
      });

      const nextVersion = versions.length > 0 ? versions[0].version + 1 : 2;

      // Create new version
      const [newVersion] = await db
        .insert(documents)
        .values({
          tenantId,
          folderId: parent.folderId,
          name: fileName,
          description: parent.description,
          filePath: uploadResult.filePath,
          fileUrl: uploadResult.fileUrl,
          mimeType,
          fileSize: uploadResult.fileSize,
          storageProvider: parent.storageProvider,
          version: nextVersion,
          isCurrentVersion: true,
          parentDocumentId: documentId,
          uploadedBy: userId,
          accessLevel: parent.accessLevel,
          allowedRoles: parent.allowedRoles,
          metadata: parent.metadata,
        })
        .returning();

      logger.info('Document version created', {
        parentId: documentId,
        versionId: newVersion.id,
        version: nextVersion,
        userId,
        tenantId,
      });

      // Invalidate cache
      await this.invalidateCache(tenantId, documentId);

      return await this.getDocumentById(newVersion.id, userId, tenantId);
    } catch (error) {
      logger.error('Create version failed', {
        error: error instanceof Error ? error.message : String(error),
        documentId,
        userId,
        tenantId,
      });

      return {
        success: false,
        error: 'Failed to create new version',
        code: 'VERSION_ERROR',
      };
    }
  }

  /**
   * Get document versions
   */
  async getDocumentVersions(
    documentId: string,
    userId: string,
    tenantId: string
  ): Promise<ServiceResponse<DocumentVersionInfo[]>> {
    try {
      // Check access to parent document
      const parentResult = await this.getDocumentById(documentId, userId, tenantId);
      if (!parentResult.success) {
        return { success: false, error: parentResult.error, code: parentResult.code };
      }

      // Get all versions
      const versions = await db.query.documents.findMany({
        where: and(
          or(eq(documents.id, documentId), eq(documents.parentDocumentId, documentId)),
          eq(documents.tenantId, tenantId),
          isNull(documents.deletedAt)
        ),
        with: {
          uploadedByUser: true,
        },
        orderBy: desc(documents.version),
      });

      const versionInfo: DocumentVersionInfo[] = versions.map((v) => ({
        version: v.version,
        documentId: v.id,
        name: v.name,
        fileSize: v.fileSize,
        uploadedBy: v.uploadedBy,
        uploadedByName: (v.uploadedByUser as any)?.name,
        isCurrentVersion: v.isCurrentVersion,
        createdAt: v.createdAt,
      }));

      return { success: true, data: versionInfo };
    } catch (error) {
      logger.error('Get versions failed', {
        error: error instanceof Error ? error.message : String(error),
        documentId,
        userId,
        tenantId,
      });

      return {
        success: false,
        error: 'Failed to get versions',
        code: 'QUERY_ERROR',
      };
    }
  }

  /**
   * Restore specific version
   */
  async restoreVersion(
    documentId: string,
    versionNumber: number,
    userId: string,
    tenantId: string
  ): Promise<ServiceResponse<DocumentWithDetails>> {
    try {
      // Find version to restore
      const version = await db.query.documents.findFirst({
        where: and(
          or(eq(documents.id, documentId), eq(documents.parentDocumentId, documentId)),
          eq(documents.version, versionNumber),
          eq(documents.tenantId, tenantId),
          isNull(documents.deletedAt)
        ),
      });

      if (!version) {
        return {
          success: false,
          error: 'Version not found',
          code: 'VERSION_NOT_FOUND',
        };
      }

      // Mark all versions as not current
      await db
        .update(documents)
        .set({ isCurrentVersion: false })
        .where(
          and(
            or(eq(documents.id, documentId), eq(documents.parentDocumentId, documentId)),
            eq(documents.isCurrentVersion, true)
          )
        );

      // Mark selected version as current
      await db
        .update(documents)
        .set({ isCurrentVersion: true })
        .where(eq(documents.id, version.id));

      logger.info('Version restored', {
        documentId,
        versionId: version.id,
        version: versionNumber,
        userId,
        tenantId,
      });

      // Invalidate cache
      await this.invalidateCache(tenantId, documentId);

      return await this.getDocumentById(version.id, userId, tenantId);
    } catch (error) {
      logger.error('Restore version failed', {
        error: error instanceof Error ? error.message : String(error),
        documentId,
        versionNumber,
        userId,
        tenantId,
      });

      return {
        success: false,
        error: 'Failed to restore version',
        code: 'RESTORE_ERROR',
      };
    }
  }

  /**
   * Share document
   */
  async shareDocument(
    request: DocumentShareRequest,
    userId: string,
    tenantId: string
  ): Promise<ServiceResponse<DocumentShareWithDetails>> {
    try {
      // Validate request
      const validated = documentShareSchema.parse(request);

      // Check document exists and user has access
      const documentResult = await this.getDocumentById(validated.documentId, userId, tenantId);
      if (!documentResult.success) {
        return { success: false, error: documentResult.error, code: documentResult.code };
      }

      // Create share
      const [share] = await db
        .insert(documentShares)
        .values({
          documentId: validated.documentId,
          sharedWithUserId: validated.sharedWithUserId,
          sharedWithTenantId: validated.sharedWithTenantId,
          permission: validated.permission,
          expiresAt: validated.expiresAt,
          createdBy: userId,
        })
        .returning();

      logger.info('Document shared', {
        shareId: share.id,
        documentId: validated.documentId,
        sharedWith: validated.sharedWithUserId || validated.sharedWithTenantId,
        userId,
        tenantId,
      });

      // Get share details
      const shareDetails = await this.getShareDetails(share.id);

      return { success: true, data: shareDetails };
    } catch (error) {
      logger.error('Share document failed', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        tenantId,
      });

      return {
        success: false,
        error: 'Failed to share document',
        code: 'SHARE_ERROR',
      };
    }
  }

  /**
   * Revoke document share
   */
  async revokeShare(shareId: string, userId: string, tenantId: string): Promise<ServiceResponse<void>> {
    try {
      // Verify share exists and user has permission
      const share = await db.query.documentShares.findFirst({
        where: eq(documentShares.id, shareId),
        with: {
          document: true,
        },
      });

      if (!share || (share.document as any).tenantId !== tenantId) {
        return {
          success: false,
          error: 'Share not found',
          code: 'NOT_FOUND',
        };
      }

      // Delete share
      await db.delete(documentShares).where(eq(documentShares.id, shareId));

      logger.info('Share revoked', {
        shareId,
        documentId: share.documentId,
        userId,
        tenantId,
      });

      return { success: true };
    } catch (error) {
      logger.error('Revoke share failed', {
        error: error instanceof Error ? error.message : String(error),
        shareId,
        userId,
        tenantId,
      });

      return {
        success: false,
        error: 'Failed to revoke share',
        code: 'REVOKE_ERROR',
      };
    }
  }

  /**
   * Search documents
   */
  async searchDocuments(
    query: string,
    filters: DocumentListFilters,
    pagination: PaginationOptions,
    userId: string,
    tenantId: string
  ): Promise<ServiceResponse<PaginatedResponse<DocumentSearchResult>>> {
    try {
      // Use list with search filter
      const result = await this.listDocuments(
        { ...filters, search: query },
        pagination,
        userId,
        tenantId
      );

      if (!result.success || !result.data) {
        return result as any;
      }

      // Convert to search results
      const searchResults: DocumentSearchResult[] = result.data.data.map((doc) => ({
        document: doc,
        score: 1.0, // Basic scoring
        highlights: [
          {
            field: 'name',
            matches: [doc.name],
          },
        ],
      }));

      return {
        success: true,
        data: {
          data: searchResults,
          pagination: result.data.pagination,
        },
      };
    } catch (error) {
      logger.error('Search documents failed', {
        error: error instanceof Error ? error.message : String(error),
        query,
        userId,
        tenantId,
      });

      return {
        success: false,
        error: 'Search failed',
        code: 'SEARCH_ERROR',
      };
    }
  }

  /**
   * Helper: Get share details
   */
  private async getShareDetails(shareId: string): Promise<DocumentShareWithDetails> {
    const share = await db.query.documentShares.findFirst({
      where: eq(documentShares.id, shareId),
      with: {
        document: true,
        sharedWithUser: true,
        sharedWithTenant: true,
        createdByUser: true,
      },
    });

    if (!share) {
      throw new Error('Share not found');
    }

    const isExpired = share.expiresAt ? new Date() > share.expiresAt : false;

    return {
      id: share.id,
      documentId: share.documentId,
      documentName: (share.document as any).name,
      sharedWithUserId: share.sharedWithUserId || undefined,
      sharedWithUserName: (share.sharedWithUser as any)?.name,
      sharedWithTenantId: share.sharedWithTenantId || undefined,
      sharedWithTenantName: (share.sharedWithTenant as any)?.name,
      permission: share.permission,
      expiresAt: share.expiresAt || undefined,
      isExpired,
      createdBy: share.createdBy,
      createdByName: (share.createdByUser as any)?.name,
      createdAt: share.createdAt,
    };
  }

  /**
   * Get all shares for a document
   */
  async getDocumentShares(
    documentId: string,
    userId: string,
    tenantId: string
  ): Promise<ServiceResponse<DocumentShareWithDetails[]>> {
    try {
      const documentResult = await this.getDocumentById(documentId, userId, tenantId);
      if (!documentResult.success) {
        return {
          success: false,
          error: documentResult.error,
          code: documentResult.code,
        };
      }

      const shares = await db.query.documentShares.findMany({
        where: eq(documentShares.documentId, documentId),
        with: {
          document: true,
          sharedWithUser: true,
          sharedWithTenant: true,
          createdByUser: true,
        },
        orderBy: desc(documentShares.createdAt),
      });

      const results = shares.map((share) => {
        const isExpired = share.expiresAt ? new Date() > share.expiresAt : false;

        return {
          id: share.id,
          documentId: share.documentId,
          documentName:
            documentResult.data?.name || ((share.document as any)?.name ?? ''),
          sharedWithUserId: share.sharedWithUserId || undefined,
          sharedWithUserName: (share.sharedWithUser as any)?.name,
          sharedWithTenantId: share.sharedWithTenantId || undefined,
          sharedWithTenantName: (share.sharedWithTenant as any)?.name,
          permission: share.permission,
          expiresAt: share.expiresAt || undefined,
          isExpired,
          createdBy: share.createdBy,
          createdByName: (share.createdByUser as any)?.name,
          createdAt: share.createdAt,
        } satisfies DocumentShareWithDetails;
      });

      return {
        success: true,
        data: results,
      };
    } catch (error) {
      logger.error('Get document shares failed', {
        error: error instanceof Error ? error.message : String(error),
        documentId,
        userId,
        tenantId,
      });

      return {
        success: false,
        error: 'Failed to get document shares',
        code: 'GET_SHARES_FAILED',
      };
    }
  }

  /**
   * Helper: Detect MIME type from filename
   */
  private detectMimeType(fileName: string): string {
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Helper: Get user roles from auth service
   */
  private async getUserRoles(userId: string, tenantId: string): Promise<string[]> {
    try {
      // Import tenant membership service
      const { getTenantMember } = await import('../../tenants/services/tenant.service');

      // Get user's tenant membership to determine roles
      const membership = await getTenantMember(tenantId, userId);

      if (!membership || !membership.role) {
        return [];
      }

      // Return role as an array (tenant members have single role, not array)
      return [membership.role];
    } catch (error) {
      logger.warn('Failed to get user roles, defaulting to empty', {
        userId,
        tenantId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Helper: Invalidate cache
   */
  private async invalidateCache(tenantId: string, documentId?: string): Promise<void> {
    if (documentId) {
      await cacheManager.delete(this.CACHE_NAMESPACE, `document:${documentId}`);
    }
    // Could invalidate list cache here if implemented
  }
}

export const documentsService = new DocumentsService();
export default documentsService;
