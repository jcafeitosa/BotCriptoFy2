/**
 * Knowledge Base Schema
 * Self-service articles and documentation
 */

import { pgTable, uuid, text, varchar, integer, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { tenants } from '../../tenants/schema/tenants.schema';
import { users } from '../../auth/schema/auth.schema';

/**
 * Knowledge Base Articles Table
 * Documentation and help articles
 */
export const knowledgeBaseArticles = pgTable(
  'knowledge_base_articles',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    authorId: text('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),

    // Article Content
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),

    // Classification
    category: varchar('category', { length: 100 }).notNull(),
    tags: jsonb('tags').$type<string[]>().default([]),

    // Publishing
    isPublished: boolean('is_published').notNull().default(false),

    // Analytics
    viewsCount: integer('views_count').notNull().default(0),
    helpfulCount: integer('helpful_count').notNull().default(0),
    notHelpfulCount: integer('not_helpful_count').notNull().default(0),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (table) => ({
    tenantIdIdx: index('kb_articles_tenant_id_idx').on(table.tenantId),
    categoryIdx: index('kb_articles_category_idx').on(table.category),
    isPublishedIdx: index('kb_articles_is_published_idx').on(table.isPublished),
    authorIdIdx: index('kb_articles_author_id_idx').on(table.authorId),
    viewsCountIdx: index('kb_articles_views_count_idx').on(table.viewsCount),
  })
);

/**
 * Knowledge Base Articles Relations
 */
export const knowledgeBaseArticlesRelations = relations(knowledgeBaseArticles, ({ one }) => ({
  tenant: one(tenants, {
    fields: [knowledgeBaseArticles.tenantId],
    references: [tenants.id],
  }),
  author: one(users, {
    fields: [knowledgeBaseArticles.authorId],
    references: [users.id],
  }),
}));
