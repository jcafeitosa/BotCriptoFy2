/**
 * Shares Routes
 * API endpoints for document sharing
 */

import { Elysia, t } from 'elysia';
import { documentsService } from '../services/documents.service';
import logger from '../../../utils/logger';

export const sharesRoutes = new Elysia({ prefix: '/documents' })
  /**
   * Share document
   * POST /api/v1/documents/:id/share
   */
  .post(
    '/:id/share',
    async ({ params, body, set }) => {
      try {
        // TODO: Get user from auth context
        const userId = 'mock-user-id';
        const tenantId = 'mock-tenant-id';

        const result = await documentsService.shareDocument(
          {
            documentId: params.id,
            ...body,
          },
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
        logger.error('Share document endpoint error', {
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
        sharedWithUserId: t.Optional(t.String()),
        sharedWithTenantId: t.Optional(t.String()),
        permission: t.Union([
          t.Literal('view'),
          t.Literal('download'),
          t.Literal('edit'),
          t.Literal('delete'),
        ]),
        expiresAt: t.Optional(t.String()),
      }),
    }
  )

  /**
   * Get document shares
   * GET /api/v1/documents/:id/shares
   */
  .get(
    '/:id/shares',
    async ({ params, set }) => {
      try {
        // TODO: Get user from auth context
        const userId = 'mock-user-id';
        const tenantId = 'mock-tenant-id';

        // First verify user has access to document
        const docResult = await documentsService.getDocumentById(
          params.id,
          userId,
          tenantId
        );

        if (!docResult.success) {
          set.status = docResult.code === 'NOT_FOUND' ? 404 : 400;
          return docResult;
        }

        // TODO: Implement getDocumentShares in service
        // For now return empty array
        return {
          success: true,
          data: [],
        };
      } catch (error) {
        logger.error('Get shares endpoint error', {
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
   * Revoke document share
   * DELETE /api/v1/documents/shares/:shareId
   */
  .delete(
    '/shares/:shareId',
    async ({ params, set }) => {
      try {
        // TODO: Get user from auth context
        const userId = 'mock-user-id';
        const tenantId = 'mock-tenant-id';

        const result = await documentsService.revokeShare(
          params.shareId,
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
        logger.error('Revoke share endpoint error', {
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
        shareId: t.String(),
      }),
    }
  );
