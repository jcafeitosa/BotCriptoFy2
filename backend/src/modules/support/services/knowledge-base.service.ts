/**
 * Knowledge Base Service
 * Self-service articles and documentation management
 */

import { db } from '@/db';
import { eq, and, desc, sql, or, like /* , isNull */ } from 'drizzle-orm';
import logger from '@/utils/logger';
import { cacheManager } from '@/cache/cache-manager';
import { CacheNamespace } from '@/cache/types';
import { knowledgeBaseArticles } from '../schema';
import type {
  KnowledgeBaseArticle,
  CreateArticleInput,
  UpdateArticleInput,
  ArticleFilters,
} from '../types';

export class KnowledgeBaseService {
  private static readonly CACHE_TTL = 900; // 15 minutes

  /**
   * Create new article
   */
  static async createArticle(
    data: CreateArticleInput,
    userId: string,
    tenantId: string
  ): Promise<KnowledgeBaseArticle> {
    logger.info('Creating knowledge base article', { title: data.title, tenantId });

    const [article] = await db
      .insert(knowledgeBaseArticles)
      .values({
        tenantId,
        authorId: userId,
        title: data.title,
        content: data.content,
        category: data.category,
        tags: data.tags || [],
        isPublished: false,
      })
      .returning();

    // Invalidate cache
    await this.invalidateCache(tenantId);

    logger.info('Article created', { articleId: article.id });
    return article as KnowledgeBaseArticle;
  }

  /**
   * Get article by ID
   */
  static async getArticleById(id: string, tenantId: string): Promise<KnowledgeBaseArticle | null> {
    const cacheKey = `kb:article:${id}`;

    // Try cache first
    const cached = await cacheManager.get<KnowledgeBaseArticle>(CacheNamespace.SUPPORT, cacheKey);
    if (cached) {
      return cached;
    }

    const [article] = await db
      .select()
      .from(knowledgeBaseArticles)
      .where(and(eq(knowledgeBaseArticles.id, id), eq(knowledgeBaseArticles.tenantId, tenantId)))
      .limit(1);

    if (article) {
      await cacheManager.set(CacheNamespace.SUPPORT, cacheKey, article as KnowledgeBaseArticle, this.CACHE_TTL);
    }

    return (article as KnowledgeBaseArticle) || null;
  }

  /**
   * List articles with filters
   */
  static async listArticles(
    filters: ArticleFilters,
    tenantId: string
  ): Promise<{
    articles: KnowledgeBaseArticle[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const conditions = [eq(knowledgeBaseArticles.tenantId, tenantId)];

    // Apply filters
    if (filters.category) {
      conditions.push(eq(knowledgeBaseArticles.category, filters.category));
    }

    if (filters.isPublished !== undefined) {
      conditions.push(eq(knowledgeBaseArticles.isPublished, filters.isPublished));
    }

    if (filters.search) {
      conditions.push(
        or(
          like(knowledgeBaseArticles.title, `%${filters.search}%`),
          like(knowledgeBaseArticles.content, `%${filters.search}%`)
        )
      );
    }

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(knowledgeBaseArticles)
      .where(and(...conditions));

    const total = Number(countResult?.count || 0);

    // Get articles
    const results = await db
      .select()
      .from(knowledgeBaseArticles)
      .where(and(...conditions))
      .orderBy(desc(knowledgeBaseArticles.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      articles: results as KnowledgeBaseArticle[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Search articles
   */
  static async searchArticles(
    query: string,
    tenantId: string,
    publishedOnly: boolean = true
  ): Promise<KnowledgeBaseArticle[]> {
    logger.info('Searching articles', { query, tenantId });

    const conditions = [
      eq(knowledgeBaseArticles.tenantId, tenantId),
      or(
        like(knowledgeBaseArticles.title, `%${query}%`),
        like(knowledgeBaseArticles.content, `%${query}%`),
        sql`${knowledgeBaseArticles.tags}::text LIKE ${`%${query}%`}`
      ),
    ];

    if (publishedOnly) {
      conditions.push(eq(knowledgeBaseArticles.isPublished, true));
    }

    const results = await db
      .select()
      .from(knowledgeBaseArticles)
      .where(and(...conditions))
      .orderBy(desc(knowledgeBaseArticles.viewsCount))
      .limit(50);

    return results as KnowledgeBaseArticle[];
  }

  /**
   * Update article
   */
  static async updateArticle(
    id: string,
    data: UpdateArticleInput,
    userId: string,
    tenantId: string
  ): Promise<KnowledgeBaseArticle> {
    logger.info('Updating article', { articleId: id, tenantId });

    const [updated] = await db
      .update(knowledgeBaseArticles)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(knowledgeBaseArticles.id, id), eq(knowledgeBaseArticles.tenantId, tenantId)))
      .returning();

    if (!updated) {
      throw new Error('Article not found');
    }

    // Invalidate cache
    await this.invalidateCache(tenantId);
    await cacheManager.delete(CacheNamespace.SUPPORT, `kb:article:${id}`);

    logger.info('Article updated', { articleId: id });
    return updated as KnowledgeBaseArticle;
  }

  /**
   * Publish article
   */
  static async publishArticle(id: string, userId: string, tenantId: string): Promise<KnowledgeBaseArticle> {
    logger.info('Publishing article', { articleId: id, tenantId });

    const [updated] = await db
      .update(knowledgeBaseArticles)
      .set({
        isPublished: true,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(knowledgeBaseArticles.id, id), eq(knowledgeBaseArticles.tenantId, tenantId)))
      .returning();

    if (!updated) {
      throw new Error('Article not found');
    }

    // Invalidate cache
    await this.invalidateCache(tenantId);
    await cacheManager.delete(CacheNamespace.SUPPORT, `kb:article:${id}`);

    logger.info('Article published', { articleId: id });
    return updated as KnowledgeBaseArticle;
  }

  /**
   * Unpublish article
   */
  static async unpublishArticle(id: string, userId: string, tenantId: string): Promise<KnowledgeBaseArticle> {
    logger.info('Unpublishing article', { articleId: id, tenantId });

    const [updated] = await db
      .update(knowledgeBaseArticles)
      .set({
        isPublished: false,
        updatedAt: new Date(),
      })
      .where(and(eq(knowledgeBaseArticles.id, id), eq(knowledgeBaseArticles.tenantId, tenantId)))
      .returning();

    if (!updated) {
      throw new Error('Article not found');
    }

    // Invalidate cache
    await this.invalidateCache(tenantId);
    await cacheManager.delete(CacheNamespace.SUPPORT, `kb:article:${id}`);

    logger.info('Article unpublished', { articleId: id });
    return updated as KnowledgeBaseArticle;
  }

  /**
   * Delete article
   */
  static async deleteArticle(id: string, userId: string, tenantId: string): Promise<void> {
    logger.info('Deleting article', { articleId: id, tenantId });

    await db
      .delete(knowledgeBaseArticles)
      .where(and(eq(knowledgeBaseArticles.id, id), eq(knowledgeBaseArticles.tenantId, tenantId)));

    // Invalidate cache
    await this.invalidateCache(tenantId);
    await cacheManager.delete(CacheNamespace.SUPPORT, `kb:article:${id}`);

    logger.info('Article deleted', { articleId: id });
  }

  /**
   * Mark article as helpful/not helpful
   */
  static async markHelpful(id: string, isHelpful: boolean, tenantId: string): Promise<KnowledgeBaseArticle> {
    logger.info('Marking article feedback', { articleId: id, isHelpful });

    const field = isHelpful ? 'helpfulCount' : 'notHelpfulCount';

    const [updated] = await db
      .update(knowledgeBaseArticles)
      .set({
        [field]: sql`${knowledgeBaseArticles[field]} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(knowledgeBaseArticles.id, id), eq(knowledgeBaseArticles.tenantId, tenantId)))
      .returning();

    if (!updated) {
      throw new Error('Article not found');
    }

    // Invalidate cache
    await cacheManager.delete(CacheNamespace.SUPPORT, `kb:article:${id}`);

    return updated as KnowledgeBaseArticle;
  }

  /**
   * Increment article views
   */
  static async incrementViews(id: string, tenantId: string): Promise<void> {
    await db
      .update(knowledgeBaseArticles)
      .set({
        viewsCount: sql`${knowledgeBaseArticles.viewsCount} + 1`,
      })
      .where(and(eq(knowledgeBaseArticles.id, id), eq(knowledgeBaseArticles.tenantId, tenantId)));

    // Invalidate cache
    await cacheManager.delete(CacheNamespace.SUPPORT, `kb:article:${id}`);
  }

  /**
   * Get popular articles
   */
  static async getPopularArticles(tenantId: string, limit: number = 10): Promise<KnowledgeBaseArticle[]> {
    const articles = await db
      .select()
      .from(knowledgeBaseArticles)
      .where(and(eq(knowledgeBaseArticles.tenantId, tenantId), eq(knowledgeBaseArticles.isPublished, true)))
      .orderBy(desc(knowledgeBaseArticles.viewsCount))
      .limit(limit);

    return articles as KnowledgeBaseArticle[];
  }

  /**
   * Get articles by category
   */
  static async getArticlesByCategory(category: string, tenantId: string): Promise<KnowledgeBaseArticle[]> {
    const articles = await db
      .select()
      .from(knowledgeBaseArticles)
      .where(
        and(
          eq(knowledgeBaseArticles.tenantId, tenantId),
          eq(knowledgeBaseArticles.category, category),
          eq(knowledgeBaseArticles.isPublished, true)
        )
      )
      .orderBy(desc(knowledgeBaseArticles.createdAt));

    return articles as KnowledgeBaseArticle[];
  }

  /**
   * Invalidate knowledge base cache
   */
  private static async invalidateCache(_tenantId: string): Promise<void> {
    await cacheManager.invalidate(CacheNamespace.SUPPORT, `kb:*`);
  }
}
