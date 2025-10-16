/**
 * Knowledge Base Routes
 * API endpoints for knowledge base articles
 */

import { Elysia, t } from 'elysia';
import { sessionGuard /* , requireRole */ } from '../../auth/middleware/session.middleware';
import { KnowledgeBaseService } from '../services';
import logger from '@/utils/logger';

export const kbRoutes = new Elysia({ prefix: '/api/v1/support/kb' })
  .use(sessionGuard)

  /**
   * POST /api/v1/support/kb/articles
   * Create article (managers only)
   */
  .post(
    '/articles',
    async ({ body, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;
        const userId = (session as any)?.userId;

        // Check role
        const userRoles = (session as any)?.user?.roles || [];
        if (!['ceo', 'admin', 'support_manager'].some((role) => userRoles.includes(role))) {
          set.status = 403;
          return { success: false, error: 'Insufficient permissions' };
        }

        const article = await KnowledgeBaseService.createArticle(body, userId, tenantId);

        logger.info('KB article created', { articleId: article.id, tenantId });
        return { success: true, data: article };
      } catch (error) {
        logger.error('Error creating article', { error });
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      body: t.Object({
        title: t.String({ minLength: 3, maxLength: 255 }),
        content: t.String({ minLength: 10 }),
        category: t.String({ maxLength: 100 }),
        tags: t.Optional(t.Array(t.String())),
      }),
    }
  )

  /**
   * GET /api/v1/support/kb/articles
   * List articles
   */
  .get('/articles', async ({ query, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      const filters = {
        category: query.category,
        isPublished: query.isPublished === 'true' ? true : query.isPublished === 'false' ? false : undefined,
        search: query.search,
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : 20,
      };

      const result = await KnowledgeBaseService.listArticles(filters, tenantId);

      return { success: true, data: result };
    } catch (error) {
      logger.error('Error listing articles', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * GET /api/v1/support/kb/articles/:id
   * Get article by ID
   */
  .get('/articles/:id', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      const article = await KnowledgeBaseService.getArticleById(params.id, tenantId);

      if (!article) {
        set.status = 404;
        return { success: false, error: 'Article not found' };
      }

      // Increment views
      await KnowledgeBaseService.incrementViews(params.id, tenantId);

      return { success: true, data: article };
    } catch (error) {
      logger.error('Error getting article', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * GET /api/v1/support/kb/search
   * Search articles
   */
  .get('/search', async ({ query, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;

      if (!query.q) {
        return { success: true, data: [] };
      }

      const publishedOnly = query.publishedOnly !== 'false';

      const articles = await KnowledgeBaseService.searchArticles(
        query.q as string,
        tenantId,
        publishedOnly
      );

      return { success: true, data: articles };
    } catch (error) {
      logger.error('Error searching articles', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * PATCH /api/v1/support/kb/articles/:id
   * Update article (managers only)
   */
  .patch(
    '/articles/:id',
    async ({ params, body, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;
        const userId = (session as any)?.userId;

        // Check role
        const userRoles = (session as any)?.user?.roles || [];
        if (!['ceo', 'admin', 'support_manager'].some((role) => userRoles.includes(role))) {
          set.status = 403;
          return { success: false, error: 'Insufficient permissions' };
        }

        const article = await KnowledgeBaseService.updateArticle(params.id, body, userId, tenantId);

        return { success: true, data: article };
      } catch (error) {
        logger.error('Error updating article', { error });
        set.status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      body: t.Object({
        title: t.Optional(t.String({ minLength: 3, maxLength: 255 })),
        content: t.Optional(t.String({ minLength: 10 })),
        category: t.Optional(t.String({ maxLength: 100 })),
        tags: t.Optional(t.Array(t.String())),
      }),
    }
  )

  /**
   * POST /api/v1/support/kb/articles/:id/publish
   * Publish article (managers only)
   */
  .post('/articles/:id/publish', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;
      const userId = (session as any)?.userId;

      // Check role
      const userRoles = (session as any)?.user?.roles || [];
      if (!['ceo', 'admin', 'support_manager'].some((role) => userRoles.includes(role))) {
        set.status = 403;
        return { success: false, error: 'Insufficient permissions' };
      }

      const article = await KnowledgeBaseService.publishArticle(params.id, userId, tenantId);

      return { success: true, data: article };
    } catch (error) {
      logger.error('Error publishing article', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * POST /api/v1/support/kb/articles/:id/unpublish
   * Unpublish article (managers only)
   */
  .post('/articles/:id/unpublish', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;
      const userId = (session as any)?.userId;

      // Check role
      const userRoles = (session as any)?.user?.roles || [];
      if (!['ceo', 'admin', 'support_manager'].some((role) => userRoles.includes(role))) {
        set.status = 403;
        return { success: false, error: 'Insufficient permissions' };
      }

      const article = await KnowledgeBaseService.unpublishArticle(params.id, userId, tenantId);

      return { success: true, data: article };
    } catch (error) {
      logger.error('Error unpublishing article', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * DELETE /api/v1/support/kb/articles/:id
   * Delete article (managers only)
   */
  .delete('/articles/:id', async ({ params, set, session }) => {
    try {
      const tenantId = (session as any)?.activeOrganizationId;
      const userId = (session as any)?.userId;

      // Check role
      const userRoles = (session as any)?.user?.roles || [];
      if (!['ceo', 'admin', 'support_manager'].some((role) => userRoles.includes(role))) {
        set.status = 403;
        return { success: false, error: 'Insufficient permissions' };
      }

      await KnowledgeBaseService.deleteArticle(params.id, userId, tenantId);

      return { success: true, message: 'Article deleted successfully' };
    } catch (error) {
      logger.error('Error deleting article', { error });
      set.status = 500;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })

  /**
   * POST /api/v1/support/kb/articles/:id/helpful
   * Mark article as helpful/not helpful
   */
  .post(
    '/articles/:id/helpful',
    async ({ params, body, set, session }) => {
      try {
        const tenantId = (session as any)?.activeOrganizationId;

        const article = await KnowledgeBaseService.markHelpful(params.id, body.helpful, tenantId);

        return { success: true, data: article };
      } catch (error) {
        logger.error('Error marking article feedback', { error });
        set.status = 500;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    {
      body: t.Object({
        helpful: t.Boolean(),
      }),
    }
  );
