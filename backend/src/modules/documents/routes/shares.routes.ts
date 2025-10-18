/**
 * Shares Routes
 * API endpoints for document sharing
 */

import { Elysia, t } from 'elysia';
import { documentsService } from '../services/documents.service';
import logger from '../../../utils/logger';
import { sessionGuard } from '../../auth/middleware/session.middleware';
import { getUserPrimaryTenantId } from '../../tenants/services/membership.service';
import { BadRequestError } from '../../../utils/errors';

export const sharesRoutes = new Elysia({ prefix: '/documents' })
  .use(sessionGuard)
  /**
   * Share document
   * POST /api/v1/documents/:id/share
   */
  .post(
    '/:id/share',
    async ({ user, params, body, set }) => {
      try {
        const userId = user.id;
        const tenantId = await getUserPrimaryTenantId(user.id);

        if (!tenantId) {
          throw new BadRequestError('User has no tenant membership');
        }

        const result = await documentsService.shareDocument(
          {
            documentId: params.id,
            ...body,
          } as any,
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
    async ({ user, params, set }) => {
      try {
        const userId = user.id;
        const tenantId = await getUserPrimaryTenantId(user.id);

        if (!tenantId) {
          throw new BadRequestError('User has no tenant membership');
        }

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

        // Get document shares
        const result = await documentsService.getDocumentShares(
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
    async ({ user, params, set }) => {
      try {
        const userId = user.id;
        const tenantId = await getUserPrimaryTenantId(user.id);

        if (!tenantId) {
          throw new BadRequestError('User has no tenant membership');
        }

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
