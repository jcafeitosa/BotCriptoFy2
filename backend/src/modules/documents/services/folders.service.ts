/**
 * Folders Service
 * Business logic for folder management operations
 */

import { db } from '../../../db';
import { eq, and, sql, isNull } from 'drizzle-orm';
import { folders, documents } from '../schema/documents.schema';
import { cacheManager } from '../../../cache/cache-manager';
import logger from '../../../utils/logger';
import {
  validateFolderName,
  wouldCreateCircularReference,
  folderCreateSchema,
  folderUpdateSchema,
} from '../utils/validators';
import type {
  FolderCreateRequest,
  FolderUpdateRequest,
  FolderWithDetails,
  FolderTreeNode,
  ServiceResponse,
} from '../types/documents.types';

export class FoldersService {
  private readonly CACHE_NAMESPACE = 'folders';
  private readonly CACHE_TTL = 600; // 10 minutes

  /**
   * Create new folder
   */
  async createFolder(
    request: FolderCreateRequest,
    userId: string,
    tenantId: string
  ): Promise<ServiceResponse<FolderWithDetails>> {
    try {
      // Validate request
      const validated = folderCreateSchema.parse(request);

      // Validate folder name
      const nameValidation = validateFolderName(validated.name);
      if (!nameValidation.isValid) {
        return {
          success: false,
          error: nameValidation.errors.join(', '),
          code: 'VALIDATION_ERROR',
        };
      }

      // Build folder path
      let folderPath = `/${validated.name}`;
      let parentFolder = null;

      if (validated.parentFolderId) {
        parentFolder = await db.query.folders.findFirst({
          where: and(
            eq(folders.id, validated.parentFolderId),
            eq(folders.tenantId, tenantId),
            isNull(folders.deletedAt)
          ),
        });

        if (!parentFolder) {
          return {
            success: false,
            error: 'Parent folder not found',
            code: 'PARENT_NOT_FOUND',
          };
        }

        folderPath = `${parentFolder.path}/${validated.name}`;
      }

      // Check for duplicate path in same tenant
      const existingFolder = await db.query.folders.findFirst({
        where: and(
          eq(folders.tenantId, tenantId),
          eq(folders.path, folderPath),
          isNull(folders.deletedAt)
        ),
      });

      if (existingFolder) {
        return {
          success: false,
          error: 'Folder already exists at this path',
          code: 'DUPLICATE_PATH',
        };
      }

      // Create folder
      const [folder] = await db
        .insert(folders)
        .values({
          tenantId,
          parentFolderId: validated.parentFolderId,
          name: validated.name,
          description: validated.description,
          path: folderPath,
          accessLevel: validated.accessLevel || 'tenant',
          allowedRoles: validated.allowedRoles,
          createdBy: userId,
          metadata: validated.metadata,
        })
        .returning();

      logger.info('Folder created', {
        folderId: folder.id,
        name: validated.name,
        path: folderPath,
        userId,
        tenantId,
      });

      // Invalidate cache
      await this.invalidateCache(tenantId);

      return await this.getFolderById(folder.id, userId, tenantId);
    } catch (error) {
      logger.error('Create folder failed', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        tenantId,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create folder',
        code: 'CREATE_ERROR',
      };
    }
  }

  /**
   * Get folder by ID with details
   */
  async getFolderById(
    id: string,
    userId: string,
    tenantId: string
  ): Promise<ServiceResponse<FolderWithDetails>> {
    try {
      const cacheKey = `folder:${id}`;

      // Try cache first
      const cached = await cacheManager.get<FolderWithDetails>(this.CACHE_NAMESPACE, cacheKey);
      if (cached && cached.tenantId === tenantId) {
        return { success: true, data: cached };
      }

      // Query folder
      const folder = await db.query.folders.findFirst({
        where: and(eq(folders.id, id), isNull(folders.deletedAt)),
        with: {
          createdByUser: true,
        },
      });

      if (!folder) {
        return {
          success: false,
          error: 'Folder not found',
          code: 'NOT_FOUND',
        };
      }

      // Check access
      if (folder.tenantId !== tenantId) {
        return {
          success: false,
          error: 'Access denied',
          code: 'ACCESS_DENIED',
        };
      }

      // Count documents and subfolders
      const [{ documentCount }] = await db
        .select({ documentCount: sql<number>`count(*)::int` })
        .from(documents)
        .where(and(eq(documents.folderId, id), isNull(documents.deletedAt)));

      const [{ subfolderCount }] = await db
        .select({ subfolderCount: sql<number>`count(*)::int` })
        .from(folders)
        .where(and(eq(folders.parentFolderId, id), isNull(folders.deletedAt)));

      // Calculate total size
      const [{ totalSize }] = await db
        .select({ totalSize: sql<number>`coalesce(sum(file_size), 0)::bigint` })
        .from(documents)
        .where(and(eq(documents.folderId, id), isNull(documents.deletedAt)));

      const details: FolderWithDetails = {
        ...folder,
        documentCount,
        subfolderCount,
        totalSize: Number(totalSize),
        createdByName: (folder.createdByUser as any)?.name,
      } as FolderWithDetails;

      // Cache result
      await cacheManager.set(this.CACHE_NAMESPACE, cacheKey, details, this.CACHE_TTL);

      return { success: true, data: details };
    } catch (error) {
      logger.error('Get folder failed', {
        error: error instanceof Error ? error.message : String(error),
        folderId: id,
        userId,
        tenantId,
      });

      return {
        success: false,
        error: 'Failed to retrieve folder',
        code: 'QUERY_ERROR',
      };
    }
  }

  /**
   * List folders (optionally by parent)
   */
  async listFolders(
    parentFolderId: string | null,
    userId: string,
    tenantId: string
  ): Promise<ServiceResponse<FolderWithDetails[]>> {
    try {
      const conditions = [eq(folders.tenantId, tenantId), isNull(folders.deletedAt)];

      if (parentFolderId) {
        conditions.push(eq(folders.parentFolderId, parentFolderId));
      } else {
        conditions.push(isNull(folders.parentFolderId));
      }

      // Get folders
      const foldersList = await db.query.folders.findMany({
        where: and(...conditions),
        with: {
          createdByUser: true,
        },
        orderBy: folders.name,
      });

      // Get counts for each folder
      const foldersWithDetails = await Promise.all(
        foldersList.map(async (folder) => {
          const [{ documentCount }] = await db
            .select({ documentCount: sql<number>`count(*)::int` })
            .from(documents)
            .where(and(eq(documents.folderId, folder.id), isNull(documents.deletedAt)));

          const [{ subfolderCount }] = await db
            .select({ subfolderCount: sql<number>`count(*)::int` })
            .from(folders)
            .where(and(eq(folders.parentFolderId, folder.id), isNull(folders.deletedAt)));

          const [{ totalSize }] = await db
            .select({ totalSize: sql<number>`coalesce(sum(file_size), 0)::bigint` })
            .from(documents)
            .where(and(eq(documents.folderId, folder.id), isNull(documents.deletedAt)));

          return {
            ...folder,
            documentCount,
            subfolderCount,
            totalSize: Number(totalSize),
            createdByName: (folder.createdByUser as any)?.name,
          } as FolderWithDetails;
        })
      );

      return { success: true, data: foldersWithDetails as FolderWithDetails[] };
    } catch (error) {
      logger.error('List folders failed', {
        error: error instanceof Error ? error.message : String(error),
        parentFolderId,
        userId,
        tenantId,
      });

      return {
        success: false,
        error: 'Failed to list folders',
        code: 'QUERY_ERROR',
      };
    }
  }

  /**
   * Update folder
   */
  async updateFolder(
    id: string,
    request: FolderUpdateRequest,
    userId: string,
    tenantId: string
  ): Promise<ServiceResponse<FolderWithDetails>> {
    try {
      // Validate request
      const validated = folderUpdateSchema.parse(request);

      // Check folder exists
      const existing = await this.getFolderById(id, userId, tenantId);
      if (!existing.success || !existing.data) {
        return existing;
      }

      // Validate name if provided
      if (validated.name) {
        const nameValidation = validateFolderName(validated.name);
        if (!nameValidation.isValid) {
          return {
            success: false,
            error: nameValidation.errors.join(', '),
            code: 'VALIDATION_ERROR',
          };
        }
      }

      // Check for circular reference if moving folder
      if (validated.parentFolderId !== undefined && validated.parentFolderId !== existing.data.parentFolderId) {
        if (validated.parentFolderId) {
          // Build folder hierarchy
          const allFolders = await db.query.folders.findMany({
            where: and(eq(folders.tenantId, tenantId), isNull(folders.deletedAt)),
          });

          const hierarchy = new Map<string, string | null>();
          allFolders.forEach((f) => {
            hierarchy.set(f.id, f.parentFolderId);
          });

          if (wouldCreateCircularReference(id, validated.parentFolderId, hierarchy)) {
            return {
              success: false,
              error: 'Cannot move folder: would create circular reference',
              code: 'CIRCULAR_REFERENCE',
            };
          }
        }
      }

      // Calculate new path if name or parent changes
      let newPath = existing.data.path;
      if (validated.name || validated.parentFolderId !== undefined) {
        const folderName = validated.name || existing.data.name;

        if (validated.parentFolderId !== undefined) {
          if (validated.parentFolderId) {
            const parent = await db.query.folders.findFirst({
              where: eq(folders.id, validated.parentFolderId),
            });

            if (!parent) {
              return {
                success: false,
                error: 'Parent folder not found',
                code: 'PARENT_NOT_FOUND',
              };
            }

            newPath = `${parent.path}/${folderName}`;
          } else {
            newPath = `/${folderName}`;
          }
        } else {
          // Just name change, keep same parent
          const pathParts = existing.data.path.split('/');
          pathParts[pathParts.length - 1] = folderName;
          newPath = pathParts.join('/');
        }
      }

      // Update folder
      await db
        .update(folders)
        .set({
          ...validated,
          path: newPath,
          updatedAt: new Date(),
        })
        .where(and(eq(folders.id, id), eq(folders.tenantId, tenantId)))
        .returning();

      // If path changed, update all subfolder paths recursively
      if (newPath !== existing.data.path) {
        await this.updateSubfolderPaths(id, existing.data.path, newPath, tenantId);
      }

      logger.info('Folder updated', {
        folderId: id,
        userId,
        tenantId,
        changes: validated,
      });

      // Invalidate cache
      await this.invalidateCache(tenantId, id);

      return await this.getFolderById(id, userId, tenantId);
    } catch (error) {
      logger.error('Update folder failed', {
        error: error instanceof Error ? error.message : String(error),
        folderId: id,
        userId,
        tenantId,
      });

      return {
        success: false,
        error: 'Failed to update folder',
        code: 'UPDATE_ERROR',
      };
    }
  }

  /**
   * Delete folder (soft delete, recursive)
   */
  async deleteFolder(
    id: string,
    userId: string,
    tenantId: string,
    recursive: boolean = false
  ): Promise<ServiceResponse<{ deletedFolders: number; deletedDocuments: number }>> {
    try {
      // Check folder exists
      const existing = await this.getFolderById(id, userId, tenantId);
      if (!existing.success || !existing.data) {
        return { success: false, error: existing.error, code: existing.code };
      }

      // Check if folder has contents
      if (!recursive && (existing.data.documentCount > 0 || existing.data.subfolderCount > 0)) {
        return {
          success: false,
          error: 'Folder is not empty. Use recursive delete to remove all contents.',
          code: 'FOLDER_NOT_EMPTY',
        };
      }

      let deletedFolders = 0;
      let deletedDocuments = 0;

      if (recursive) {
        // Get all subfolders recursively
        const subfolders = await this.getSubfoldersRecursive(id, tenantId);

        // Delete all documents in all folders
        const folderIds = [id, ...subfolders.map((f) => f.id)];
        const docsResult = await db
          .update(documents)
          .set({ deletedAt: new Date() })
          .where(and(eq(documents.tenantId, tenantId), sql`folder_id = ANY(${folderIds})`))
          .returning();

        deletedDocuments = docsResult.length;

        // Delete all subfolders
        const foldersResult = await db
          .update(folders)
          .set({ deletedAt: new Date() })
          .where(and(eq(folders.tenantId, tenantId), sql`id = ANY(${folderIds})`))
          .returning();

        deletedFolders = foldersResult.length;
      } else {
        // Just delete the empty folder
        await db
          .update(folders)
          .set({ deletedAt: new Date() })
          .where(and(eq(folders.id, id), eq(folders.tenantId, tenantId)));

        deletedFolders = 1;
      }

      logger.info('Folder deleted', {
        folderId: id,
        recursive,
        deletedFolders,
        deletedDocuments,
        userId,
        tenantId,
      });

      // Invalidate cache
      await this.invalidateCache(tenantId);

      return {
        success: true,
        data: { deletedFolders, deletedDocuments },
      };
    } catch (error) {
      logger.error('Delete folder failed', {
        error: error instanceof Error ? error.message : String(error),
        folderId: id,
        userId,
        tenantId,
      });

      return {
        success: false,
        error: 'Failed to delete folder',
        code: 'DELETE_ERROR',
      };
    }
  }

  /**
   * Move folder to new parent
   */
  async moveFolder(
    id: string,
    newParentId: string | null,
    userId: string,
    tenantId: string
  ): Promise<ServiceResponse<FolderWithDetails>> {
    try {
      return await this.updateFolder(
        id,
        { parentFolderId: newParentId || undefined },
        userId,
        tenantId
      );
    } catch (error) {
      logger.error('Move folder failed', {
        error: error instanceof Error ? error.message : String(error),
        folderId: id,
        newParentId,
        userId,
        tenantId,
      });

      return {
        success: false,
        error: 'Failed to move folder',
        code: 'MOVE_ERROR',
      };
    }
  }

  /**
   * Get folder tree (hierarchical structure)
   */
  async getFolderTree(userId: string, tenantId: string): Promise<ServiceResponse<FolderTreeNode[]>> {
    try {
      const cacheKey = `tree:${tenantId}`;

      // Try cache first
      const cached = await cacheManager.get<FolderTreeNode[]>(this.CACHE_NAMESPACE, cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      // Get all folders
      const allFolders = await db.query.folders.findMany({
        where: and(eq(folders.tenantId, tenantId), isNull(folders.deletedAt)),
        orderBy: folders.path,
      });

      // Get counts for each folder
      const foldersWithCounts = await Promise.all(
        allFolders.map(async (folder) => {
          const [{ documentCount }] = await db
            .select({ documentCount: sql<number>`count(*)::int` })
            .from(documents)
            .where(and(eq(documents.folderId, folder.id), isNull(documents.deletedAt)));

          const [{ subfolderCount }] = await db
            .select({ subfolderCount: sql<number>`count(*)::int` })
            .from(folders)
            .where(and(eq(folders.parentFolderId, folder.id), isNull(folders.deletedAt)));

          return {
            ...folder,
            documentCount,
            subfolderCount,
          };
        })
      );

      // Build tree structure
      const tree = this.buildFolderTree(foldersWithCounts);

      // Cache result
      await cacheManager.set(this.CACHE_NAMESPACE, cacheKey, tree, this.CACHE_TTL);

      return { success: true, data: tree };
    } catch (error) {
      logger.error('Get folder tree failed', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        tenantId,
      });

      return {
        success: false,
        error: 'Failed to get folder tree',
        code: 'QUERY_ERROR',
      };
    }
  }

  /**
   * Helper: Build folder tree from flat list
   */
  private buildFolderTree(
    folders: Array<{ id: string; parentFolderId: string | null; name: string; path: string; documentCount: number; subfolderCount: number }>
  ): FolderTreeNode[] {
    const map = new Map<string, FolderTreeNode>();
    const roots: FolderTreeNode[] = [];

    // Create nodes
    folders.forEach((folder) => {
      map.set(folder.id, {
        id: folder.id,
        name: folder.name,
        path: folder.path,
        parentFolderId: folder.parentFolderId || undefined,
        documentCount: folder.documentCount,
        subfolderCount: folder.subfolderCount,
        children: [],
      });
    });

    // Build hierarchy
    folders.forEach((folder) => {
      const node = map.get(folder.id);
      if (!node) return;

      if (folder.parentFolderId) {
        const parent = map.get(folder.parentFolderId);
        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  /**
   * Helper: Get all subfolders recursively
   */
  private async getSubfoldersRecursive(
    folderId: string,
    tenantId: string
  ): Promise<Array<{ id: string; path: string }>> {
    const result: Array<{ id: string; path: string }> = [];

    const children = await db.query.folders.findMany({
      where: and(
        eq(folders.parentFolderId, folderId),
        eq(folders.tenantId, tenantId),
        isNull(folders.deletedAt)
      ),
    });

    for (const child of children) {
      result.push({ id: child.id, path: child.path });

      const grandchildren = await this.getSubfoldersRecursive(child.id, tenantId);
      result.push(...grandchildren);
    }

    return result;
  }

  /**
   * Helper: Update subfolder paths recursively
   */
  private async updateSubfolderPaths(
    folderId: string,
    oldPath: string,
    newPath: string,
    tenantId: string
  ): Promise<void> {
    const subfolders = await db.query.folders.findMany({
      where: and(
        eq(folders.parentFolderId, folderId),
        eq(folders.tenantId, tenantId),
        isNull(folders.deletedAt)
      ),
    });

    for (const subfolder of subfolders) {
      const updatedPath = subfolder.path.replace(oldPath, newPath);

      await db
        .update(folders)
        .set({ path: updatedPath })
        .where(eq(folders.id, subfolder.id));

      // Recursively update nested folders
      await this.updateSubfolderPaths(subfolder.id, subfolder.path, updatedPath, tenantId);
    }
  }

  /**
   * Helper: Invalidate cache
   */
  private async invalidateCache(tenantId: string, folderId?: string): Promise<void> {
    if (folderId) {
      await cacheManager.delete(this.CACHE_NAMESPACE, `folder:${folderId}`);
    }
    await cacheManager.delete(this.CACHE_NAMESPACE, `tree:${tenantId}`);
  }
}

export const foldersService = new FoldersService();
export default foldersService;
