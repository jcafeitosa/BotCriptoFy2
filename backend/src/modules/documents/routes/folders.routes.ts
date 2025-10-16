/**
 * Folders Routes
 * API endpoints for folder management
 */

import { Elysia, t } from 'elysia';
import { foldersService } from '../services/folders.service';
import logger from '../../../utils/logger';

export const foldersRoutes = new Elysia({ prefix: '/folders' })
  /**
   * Create folder
   * POST /api/v1/folders
   */
  .post(
    '/',
    async ({ body, set }) => {
      try {
        // TODO: Get user from auth context
        const userId = 'mock-user-id';
        const tenantId = 'mock-tenant-id';

        const result = await foldersService.createFolder(body, userId, tenantId);

        if (!result.success) {
          set.status = 400;
          return result;
        }

        set.status = 201;
        return result;
      } catch (error) {
        logger.error('Create folder endpoint error', {
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
        name: t.String(),
        description: t.Optional(t.String()),
        parentFolderId: t.Optional(t.String()),
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
   * List folders
   * GET /api/v1/folders
   */
  .get(
    '/',
    async ({ query, set }) => {
      try {
        // TODO: Get user from auth context
        const userId = 'mock-user-id';
        const tenantId = 'mock-tenant-id';

        // If tree view requested
        if (query.view === 'tree') {
          const result = await foldersService.getFolderTree(userId, tenantId);

          if (!result.success) {
            set.status = 400;
            return result;
          }

          return result;
        }

        // List folders by parent
        const parentId = query.parentId || null;
        const result = await foldersService.listFolders(parentId, userId, tenantId);

        if (!result.success) {
          set.status = 400;
          return result;
        }

        return result;
      } catch (error) {
        logger.error('List folders endpoint error', {
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
        parentId: t.Optional(t.String()),
        view: t.Optional(t.String()),
      }),
    }
  )

  /**
   * Get folder by ID
   * GET /api/v1/folders/:id
   */
  .get(
    '/:id',
    async ({ params, set }) => {
      try {
        // TODO: Get user from auth context
        const userId = 'mock-user-id';
        const tenantId = 'mock-tenant-id';

        const result = await foldersService.getFolderById(params.id, userId, tenantId);

        if (!result.success) {
          set.status = result.code === 'NOT_FOUND' ? 404 : 400;
          return result;
        }

        return result;
      } catch (error) {
        logger.error('Get folder endpoint error', {
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
   * Update folder
   * PATCH /api/v1/folders/:id
   */
  .patch(
    '/:id',
    async ({ params, body, set }) => {
      try {
        // TODO: Get user from auth context
        const userId = 'mock-user-id';
        const tenantId = 'mock-tenant-id';

        const result = await foldersService.updateFolder(
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
        logger.error('Update folder endpoint error', {
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
        parentFolderId: t.Optional(t.String()),
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
   * Delete folder
   * DELETE /api/v1/folders/:id
   */
  .delete(
    '/:id',
    async ({ params, query, set }) => {
      try {
        // TODO: Get user from auth context
        const userId = 'mock-user-id';
        const tenantId = 'mock-tenant-id';

        const recursive = query.recursive === 'true';

        const result = await foldersService.deleteFolder(
          params.id,
          userId,
          tenantId,
          recursive
        );

        if (!result.success) {
          set.status = result.code === 'NOT_FOUND' ? 404 : 400;
          return result;
        }

        return result;
      } catch (error) {
        logger.error('Delete folder endpoint error', {
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
      query: t.Object({
        recursive: t.Optional(t.String()),
      }),
    }
  )

  /**
   * Move folder
   * POST /api/v1/folders/:id/move
   */
  .post(
    '/:id/move',
    async ({ params, body, set }) => {
      try {
        // TODO: Get user from auth context
        const userId = 'mock-user-id';
        const tenantId = 'mock-tenant-id';

        const result = await foldersService.moveFolder(
          params.id,
          body.newParentId || null,
          userId,
          tenantId
        );

        if (!result.success) {
          set.status = result.code === 'NOT_FOUND' ? 404 : 400;
          return result;
        }

        return result;
      } catch (error) {
        logger.error('Move folder endpoint error', {
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
        newParentId: t.Optional(t.String()),
      }),
    }
  );
