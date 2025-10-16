-- Documents Manager Migration
-- Creates tables for document management system
-- Migration: 0003_documents_manager
-- Date: 2025-10-16

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- FOLDERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS "folders" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "tenant_id" TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "parent_folder_id" UUID REFERENCES "folders"("id") ON DELETE CASCADE,
  "created_by" TEXT NOT NULL REFERENCES "users"("id"),

  -- Folder Information
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "path" TEXT NOT NULL,

  -- Access Control
  "access_level" VARCHAR(20) NOT NULL DEFAULT 'tenant',
  "allowed_roles" JSONB,

  -- Metadata
  "metadata" JSONB,

  -- Timestamps
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "deleted_at" TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT "folders_access_level_check" CHECK (
    "access_level" IN ('public', 'tenant', 'private', 'role_based')
  )
);

-- Indexes for folders
CREATE INDEX "folders_tenant_id_idx" ON "folders"("tenant_id");
CREATE INDEX "folders_parent_folder_id_idx" ON "folders"("parent_folder_id");
CREATE INDEX "folders_path_idx" ON "folders"("path");
CREATE UNIQUE INDEX "folders_tenant_path_unique" ON "folders"("tenant_id", "path");

-- ============================================================================
-- DOCUMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS "documents" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "tenant_id" TEXT NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "folder_id" UUID REFERENCES "folders"("id") ON DELETE SET NULL,
  "uploaded_by" TEXT NOT NULL REFERENCES "users"("id"),
  "parent_document_id" UUID REFERENCES "documents"("id") ON DELETE SET NULL,

  -- Document Information
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,

  -- File Storage
  "file_path" TEXT NOT NULL,
  "file_url" TEXT,
  "mime_type" VARCHAR(100) NOT NULL,
  "file_size" BIGINT NOT NULL,
  "storage_provider" VARCHAR(20) NOT NULL DEFAULT 'local',

  -- Versioning
  "version" INTEGER NOT NULL DEFAULT 1,
  "is_current_version" BOOLEAN NOT NULL DEFAULT true,

  -- Access Control
  "access_level" VARCHAR(20) NOT NULL DEFAULT 'tenant',
  "allowed_roles" JSONB,

  -- Metadata
  "metadata" JSONB,

  -- Timestamps
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "deleted_at" TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT "documents_storage_provider_check" CHECK (
    "storage_provider" IN ('local', 's3', 'gcs')
  ),
  CONSTRAINT "documents_access_level_check" CHECK (
    "access_level" IN ('public', 'tenant', 'private', 'role_based')
  ),
  CONSTRAINT "documents_file_size_check" CHECK ("file_size" > 0),
  CONSTRAINT "documents_version_check" CHECK ("version" > 0)
);

-- Indexes for documents
CREATE INDEX "documents_tenant_id_idx" ON "documents"("tenant_id");
CREATE INDEX "documents_folder_id_idx" ON "documents"("folder_id");
CREATE INDEX "documents_uploaded_by_idx" ON "documents"("uploaded_by");
CREATE INDEX "documents_parent_document_id_idx" ON "documents"("parent_document_id");
CREATE INDEX "documents_version_idx" ON "documents"("parent_document_id", "version");
CREATE INDEX "documents_name_search_idx" ON "documents"("name");

-- ============================================================================
-- DOCUMENT SHARES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS "document_shares" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "document_id" UUID NOT NULL REFERENCES "documents"("id") ON DELETE CASCADE,
  "shared_with_user_id" TEXT REFERENCES "users"("id") ON DELETE CASCADE,
  "shared_with_tenant_id" TEXT REFERENCES "tenants"("id") ON DELETE CASCADE,
  "created_by" TEXT NOT NULL REFERENCES "users"("id"),

  -- Share Configuration
  "permission" VARCHAR(20) NOT NULL DEFAULT 'view',
  "expires_at" TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT "document_shares_permission_check" CHECK (
    "permission" IN ('view', 'download', 'edit', 'delete')
  ),
  CONSTRAINT "document_shares_target_check" CHECK (
    ("shared_with_user_id" IS NOT NULL) OR ("shared_with_tenant_id" IS NOT NULL)
  )
);

-- Indexes for document shares
CREATE INDEX "document_shares_document_id_idx" ON "document_shares"("document_id");
CREATE INDEX "document_shares_shared_with_user_id_idx" ON "document_shares"("shared_with_user_id");
CREATE INDEX "document_shares_shared_with_tenant_id_idx" ON "document_shares"("shared_with_tenant_id");
CREATE INDEX "document_shares_expires_at_idx" ON "document_shares"("expires_at");

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp for folders
CREATE OR REPLACE FUNCTION update_folders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER folders_updated_at_trigger
  BEFORE UPDATE ON "folders"
  FOR EACH ROW
  EXECUTE FUNCTION update_folders_updated_at();

-- Auto-update updated_at timestamp for documents
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_updated_at_trigger
  BEFORE UPDATE ON "documents"
  FOR EACH ROW
  EXECUTE FUNCTION update_documents_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE "folders" IS 'Hierarchical folder structure for organizing documents';
COMMENT ON TABLE "documents" IS 'Document metadata and file information with versioning support';
COMMENT ON TABLE "document_shares" IS 'Document sharing permissions with users and tenants';

COMMENT ON COLUMN "folders"."path" IS 'Full hierarchical path for efficient queries (e.g., /root/projects/2024)';
COMMENT ON COLUMN "documents"."file_path" IS 'Storage path (local, S3, or GCS)';
COMMENT ON COLUMN "documents"."file_url" IS 'Public URL if applicable';
COMMENT ON COLUMN "documents"."is_current_version" IS 'Indicates if this is the current active version';
COMMENT ON COLUMN "documents"."parent_document_id" IS 'Reference to original document for versioning';
COMMENT ON COLUMN "document_shares"."expires_at" IS 'Optional expiration date for temporary shares';

-- ============================================================================
-- SAMPLE DATA (Optional - for development)
-- ============================================================================

-- Uncomment below to insert sample data for testing
/*
INSERT INTO "folders" ("tenant_id", "name", "path", "access_level", "created_by")
VALUES
  ('sample-tenant-id', 'Documents', '/Documents', 'tenant', 'sample-user-id'),
  ('sample-tenant-id', 'Images', '/Images', 'tenant', 'sample-user-id'),
  ('sample-tenant-id', 'Archives', '/Archives', 'tenant', 'sample-user-id');
*/
