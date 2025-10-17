/**
 * Documents Manager Schema
 * Database tables for document management, folders, and sharing
 */

import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  bigint,
  integer,
  boolean,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { tenants } from '../../tenants/schema/tenants.schema';
import { users } from '../../auth/schema/auth.schema';

/**
 * Storage Provider Types
 * Note: Only 'local' is currently supported. S3 and GCS can be added when needed.
 */
export type StorageProvider = 'local';

/**
 * Access Level Types
 */
export type AccessLevel = 'public' | 'tenant' | 'private' | 'role_based';

/**
 * Share Permission Types
 */
export type SharePermission = 'view' | 'download' | 'edit' | 'delete';

/**
 * Folders Table
 * Hierarchical folder structure for organizing documents
 */
export const folders = pgTable(
  'folders',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    parentFolderId: uuid('parent_folder_id').references((): any => folders.id, {
      onDelete: 'cascade',
    }),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id),

    // Folder Information
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    path: text('path').notNull(), // Full path for efficient queries: /root/projects/2024

    // Access Control
    accessLevel: varchar('access_level', { length: 20 })
      .notNull()
      .default('tenant')
      .$type<AccessLevel>(),
    allowedRoles: jsonb('allowed_roles').$type<string[]>(),

    // Metadata
    metadata: jsonb('metadata').$type<Record<string, any>>(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantIdIdx: index('folders_tenant_id_idx').on(table.tenantId),
    parentFolderIdIdx: index('folders_parent_folder_id_idx').on(table.parentFolderId),
    pathIdx: index('folders_path_idx').on(table.path),
    uniqueTenantPath: uniqueIndex('folders_tenant_path_unique').on(
      table.tenantId,
      table.path
    ),
  })
);

/**
 * Documents Table
 * Main table for storing document metadata and file information
 */
export const documents = pgTable(
  'documents',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    tenantId: text('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    folderId: uuid('folder_id').references(() => folders.id, { onDelete: 'set null' }),
    uploadedBy: text('uploaded_by')
      .notNull()
      .references(() => users.id),
    parentDocumentId: uuid('parent_document_id').references((): any => documents.id, {
      onDelete: 'set null',
    }), // For versioning

    // Document Information
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),

    // File Storage
    filePath: text('file_path').notNull(), // Storage path
    fileUrl: text('file_url'), // Public URL (if applicable)
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    fileSize: bigint('file_size', { mode: 'number' }).notNull(), // Size in bytes
    storageProvider: varchar('storage_provider', { length: 20 })
      .notNull()
      .default('local')
      .$type<StorageProvider>(),

    // Versioning
    version: integer('version').notNull().default(1),
    isCurrentVersion: boolean('is_current_version').notNull().default(true),

    // Access Control
    accessLevel: varchar('access_level', { length: 20 })
      .notNull()
      .default('tenant')
      .$type<AccessLevel>(),
    allowedRoles: jsonb('allowed_roles').$type<string[]>(),

    // Metadata
    metadata: jsonb('metadata').$type<Record<string, any>>(), // Tags, custom fields, etc.

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    tenantIdIdx: index('documents_tenant_id_idx').on(table.tenantId),
    folderIdIdx: index('documents_folder_id_idx').on(table.folderId),
    uploadedByIdx: index('documents_uploaded_by_idx').on(table.uploadedBy),
    parentDocumentIdIdx: index('documents_parent_document_id_idx').on(table.parentDocumentId),
    versionIdx: index('documents_version_idx').on(table.parentDocumentId, table.version),
    nameSearchIdx: index('documents_name_search_idx').on(table.name),
  })
);

/**
 * Document Shares Table
 * Sharing documents with specific users or tenants
 */
export const documentShares = pgTable(
  'document_shares',
  {
    // Primary Key
    id: uuid('id').primaryKey().defaultRandom(),

    // Foreign Keys
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    sharedWithUserId: text('shared_with_user_id').references(() => users.id, {
      onDelete: 'cascade',
    }),
    sharedWithTenantId: text('shared_with_tenant_id').references(() => tenants.id, {
      onDelete: 'cascade',
    }),
    createdBy: text('created_by')
      .notNull()
      .references(() => users.id),

    // Share Configuration
    permission: varchar('permission', { length: 20 })
      .notNull()
      .default('view')
      .$type<SharePermission>(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    documentIdIdx: index('document_shares_document_id_idx').on(table.documentId),
    sharedWithUserIdIdx: index('document_shares_shared_with_user_id_idx').on(
      table.sharedWithUserId
    ),
    sharedWithTenantIdIdx: index('document_shares_shared_with_tenant_id_idx').on(
      table.sharedWithTenantId
    ),
    expiresAtIdx: index('document_shares_expires_at_idx').on(table.expiresAt),
  })
);

/**
 * Type Exports
 */
export type Folder = typeof folders.$inferSelect;
export type NewFolder = typeof folders.$inferInsert;

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;

export type DocumentShare = typeof documentShares.$inferSelect;
export type NewDocumentShare = typeof documentShares.$inferInsert;
