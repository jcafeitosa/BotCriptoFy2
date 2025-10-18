/**
 * Documents Routes
 * API endpoints for document management
 */

import { Elysia, t } from 'elysia';
import { documentsService } from '../services/documents.service';
import logger from '../../../utils/logger';
import { sessionGuard } from '../../auth/middleware/session.middleware';
import { getUserPrimaryTenantId } from '../../auth/services/session.service';
import { BadRequestError } from '../../../utils/errors';

export const documentsRoutes = new Elysia({ prefix: '/documents' })
  .use(sessionGuard)
  /**
   * Upload document
   * POST /api/v1/documents/upload
   */
  .post(
    '/upload',
    async ({ user, body, set }) => {
      try {
        const userId = user.id;
        const tenantId = await getUserPrimaryTenantId(user.id);

        if (!tenantId) {
          throw new BadRequestError('User has no tenant membership');
        }

        // Extract file
        const { file, ...metadata } = body;

        if (!file) {
          set.status = 400;
          return {
            success: false,
            error: 'File is required',
            code: 'FILE_REQUIRED',
          };
        }

        // Convert file to buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        const result = await documentsService.uploadDocument(
          buffer,
          {
            fileName: file.name,
            folderId: metadata.folderId,
            description: metadata.description,
            accessLevel: metadata.accessLevel,
            allowedRoles: metadata.allowedRoles,
            metadata: metadata.metadata,
          } as any,
          userId,
          tenantId
        );

        if (!result.success) {
          set.status = 400;
          return result;
        }

        set.status = 201;
        return result;
      } catch (error) {
        logger.error('Upload endpoint error', {
          error: error instanceof Error ? error.message : String(error),
        });

        set.status = 500;
        return {
          success: false,
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
        };
      }
    },
    {
      body: t.Object({
        file: t.File(),
        folderId: t.Optional(t.String()),
        description: t.Optional(t.String()),
        accessLevel: t.Optional(t.Union([
          t.Literal('public'),
          t.Literal('tenant'),
          t.Literal('private'),
          t.Literal('role_based'),
        ])),
        allowedRoles: t.Optional(t.Array(t.String())),
        metadata: t.Optional(t.Record(t.String(), t.Any())),
      }),
    }
  )

  /**
   * List documents
   * GET /api/v1/documents
   */
  .get(
    '/',
    async ({ user, query, set }) => {
      try {
        const userId = user.id;
        const tenantId = await getUserPrimaryTenantId(user.id);

        if (!tenantId) {
          throw new BadRequestError('User has no tenant membership');
        }

        const filters = {
          folderId: query.folderId,
          mimeType: query.mimeType,
          uploadedBy: query.uploadedBy,
          accessLevel: query.accessLevel as any,
          search: query.search,
        };

        const pagination = {
          page: query.page ? parseInt(query.page) : 1,
          limit: query.limit ? parseInt(query.limit) : 20,
          sortBy: query.sortBy || 'createdAt',
          sortOrder: (query.sortOrder as 'asc' | 'desc') || 'desc',
        };

        const result = await documentsService.listDocuments(
          filters,
          pagination,
          userId,
          tenantId
        );

        if (!result.success) {
          set.status = 400;
          return result;
        }

        return result;
      } catch (error) {
        logger.error('List documents endpoint error', {
          error: error instanceof Error ? error.message : String(error),
        });

        set.status = 500;
        return {
          success: false,
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
        };
      }
    },
    {
      query: t.Object({
        folderId: t.Optional(t.String()),
        mimeType: t.Optional(t.String()),
        uploadedBy: t.Optional(t.String()),
        accessLevel: t.Optional(t.String()),
        search: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        sortBy: t.Optional(t.String()),
        sortOrder: t.Optional(t.String()),
      }),
    }
  )

  /**
   * Get document by ID
   * GET /api/v1/documents/:id
   */
  .get(
    '/:id',
    async ({ user, params, set }) => {
      try {
        const userId = user.id;
        const tenantId = await getUserPrimaryTenantId(user.id);

        if (!tenantId) {
          throw new BadRequestError('User has no tenant membership');
        }

        const result = await documentsService.getDocumentById(
          params.id,
          userId,
          tenantId
        );

        if (!result.success) {
          set.status = result.code === 'NOT_FOUND' ? 404 : 400;
          return result;
        }

        return result;
      } catch (error) {
        logger.error('Get document endpoint error', {
          error: error instanceof Error ? error.message : String(error),
        });

        set.status = 500;
        return {
          success: false,
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  /**
   * Update document
   * PATCH /api/v1/documents/:id
   */
  .patch(
    '/:id',
    async ({ user, params, body, set }) => {
      try {
        const userId = user.id;
        const tenantId = await getUserPrimaryTenantId(user.id);

        if (!tenantId) {
          throw new BadRequestError('User has no tenant membership');
        }

        const result = await documentsService.updateDocument(
          params.id,
          body,
          userId,
          tenantId
        );

        if (!result.success) {
          set.status = result.code === 'NOT_FOUND' ? 404 : 400;
          return result;
        }

        return result;
      } catch (error) {
        logger.error('Update document endpoint error', {
          error: error instanceof Error ? error.message : String(error),
        });

        set.status = 500;
        return {
          success: false,
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        name: t.Optional(t.String()),
        description: t.Optional(t.String()),
        folderId: t.Optional(t.String()),
        accessLevel: t.Optional(t.Union([
          t.Literal('public'),
          t.Literal('tenant'),
          t.Literal('private'),
          t.Literal('role_based'),
        ])),
        allowedRoles: t.Optional(t.Array(t.String())),
        metadata: t.Optional(t.Record(t.String(), t.Any())),
      }),
    }
  )

  /**
   * Delete document
   * DELETE /api/v1/documents/:id
   */
  .delete(
    '/:id',
    async ({ user, params, set }) => {
      try {
        const userId = user.id;
        const tenantId = await getUserPrimaryTenantId(user.id);

        if (!tenantId) {
          throw new BadRequestError('User has no tenant membership');
        }

        const result = await documentsService.deleteDocument(
          params.id,
          userId,
          tenantId
        );

        if (!result.success) {
          set.status = result.code === 'NOT_FOUND' ? 404 : 400;
          return result;
        }

        set.status = 204;
        return;
      } catch (error) {
        logger.error('Delete document endpoint error', {
          error: error instanceof Error ? error.message : String(error),
        });

        set.status = 500;
        return {
          success: false,
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  /**
   * Download document
   * GET /api/v1/documents/:id/download
   */
  .get(
    '/:id/download',
    async ({ user, params, set }) => {
      try {
        const userId = user.id;
        const tenantId = await getUserPrimaryTenantId(user.id);

        if (!tenantId) {
          throw new BadRequestError('User has no tenant membership');
        }

        const result = await documentsService.downloadDocument(
          params.id,
          userId,
          tenantId
        );

        if (!result.success || !result.data) {
          set.status = result.code === 'NOT_FOUND' ? 404 : 400;
          return {
            success: false,
            error: result.error,
            code: result.code,
          };
        }

        const { file, document } = result.data;

        set.headers['Content-Type'] = document.mimeType;
        set.headers['Content-Disposition'] = `attachment; filename="${document.name}"`;
        set.headers['Content-Length'] = document.fileSize.toString();

        return new Response(file);
      } catch (error) {
        logger.error('Download document endpoint error', {
          error: error instanceof Error ? error.message : String(error),
        });

        set.status = 500;
        return {
          success: false,
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  /**
   * Create new version
   * POST /api/v1/documents/:id/versions
   */
  .post(
    '/:id/versions',
    async ({ user, params, body, set }) => {
      try {
        const userId = user.id;
        const tenantId = await getUserPrimaryTenantId(user.id);

        if (!tenantId) {
          throw new BadRequestError('User has no tenant membership');
        }

        const { file } = body;

        if (!file) {
          set.status = 400;
          return {
            success: false,
            error: 'File is required',
            code: 'FILE_REQUIRED',
          };
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        const result = await documentsService.createNewVersion(
          params.id,
          buffer,
          file.name,
          userId,
          tenantId
        );

        if (!result.success) {
          set.status = result.code === 'NOT_FOUND' ? 404 : 400;
          return result;
        }

        set.status = 201;
        return result;
      } catch (error) {
        logger.error('Create version endpoint error', {
          error: error instanceof Error ? error.message : String(error),
        });

        set.status = 500;
        return {
          success: false,
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        file: t.File(),
      }),
    }
  )

  /**
   * Get document versions
   * GET /api/v1/documents/:id/versions
   */
  .get(
    '/:id/versions',
    async ({ user, params, set }) => {
      try {
        const userId = user.id;
        const tenantId = await getUserPrimaryTenantId(user.id);

        if (!tenantId) {
          throw new BadRequestError('User has no tenant membership');
        }

        const result = await documentsService.getDocumentVersions(
          params.id,
          userId,
          tenantId
        );

        if (!result.success) {
          set.status = result.code === 'NOT_FOUND' ? 404 : 400;
          return result;
        }

        return result;
      } catch (error) {
        logger.error('Get versions endpoint error', {
          error: error instanceof Error ? error.message : String(error),
        });

        set.status = 500;
        return {
          success: false,
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  )

  /**
   * Restore version
   * POST /api/v1/documents/:id/versions/:version/restore
   */
  .post(
    '/:id/versions/:version/restore',
    async ({ user, params, set }) => {
      try {
        const userId = user.id;
        const tenantId = await getUserPrimaryTenantId(user.id);

        if (!tenantId) {
          throw new BadRequestError('User has no tenant membership');
        }

        const result = await documentsService.restoreVersion(
          params.id,
          parseInt(params.version),
          userId,
          tenantId
        );

        if (!result.success) {
          set.status = result.code === 'NOT_FOUND' ? 404 : 400;
          return result;
        }

        return result;
      } catch (error) {
        logger.error('Restore version endpoint error', {
          error: error instanceof Error ? error.message : String(error),
        });

        set.status = 500;
        return {
          success: false,
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
        };
      }
    },
    {
      params: t.Object({
        id: t.String(),
        version: t.String(),
      }),
    }
  )

  /**
   * Search documents
   * GET /api/v1/documents/search
   */
  .get(
    '/search',
    async ({ user, query, set }) => {
      try {
        const userId = user.id;
        const tenantId = await getUserPrimaryTenantId(user.id);

        if (!tenantId) {
          throw new BadRequestError('User has no tenant membership');
        }

        if (!query.q) {
          set.status = 400;
          return {
            success: false,
            error: 'Search query is required',
            code: 'QUERY_REQUIRED',
          };
        }

        const filters = {
          folderId: query.folderId,
          mimeType: query.mimeType,
        };

        const pagination = {
          page: query.page ? parseInt(query.page) : 1,
          limit: query.limit ? parseInt(query.limit) : 20,
        };

        const result = await documentsService.searchDocuments(
          query.q,
          filters,
          pagination,
          userId,
          tenantId
        );

        if (!result.success) {
          set.status = 400;
          return result;
        }

        return result;
      } catch (error) {
        logger.error('Search documents endpoint error', {
          error: error instanceof Error ? error.message : String(error),
        });

        set.status = 500;
        return {
          success: false,
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
        };
      }
    },
    {
      query: t.Object({
        q: t.String(),
        folderId: t.Optional(t.String()),
        mimeType: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  );
