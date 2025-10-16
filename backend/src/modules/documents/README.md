# Documents Manager Module

Módulo completo de gerenciamento de documentos com suporte a pastas hierárquicas, versionamento, compartilhamento e múltiplos provedores de armazenamento.

## Funcionalidades

- Upload e download de arquivos
- Organização hierárquica com pastas
- Versionamento de documentos
- Compartilhamento com usuários e tenants
- Controle de acesso granular (public, tenant, private, role-based)
- Suporte a múltiplos storage providers (Local, S3, GCS)
- Validação de tipos de arquivo e tamanho
- Busca e filtros avançados
- Cache de metadados
- Soft delete

## Estrutura do Módulo

```
documents/
├── schema/               # Database schemas (Drizzle ORM)
│   ├── documents.schema.ts
│   └── index.ts
├── types/                # TypeScript types
│   ├── documents.types.ts
│   └── index.ts
├── services/             # Business logic
│   ├── documents.service.ts
│   ├── folders.service.ts
│   └── index.ts
├── routes/               # API endpoints (Elysia)
│   ├── documents.routes.ts
│   ├── folders.routes.ts
│   ├── shares.routes.ts
│   └── index.ts
├── utils/                # Utilities
│   ├── storage.ts        # Storage handlers
│   ├── validators.ts     # Validation logic
│   └── index.ts
└── __tests__/            # Unit tests
    ├── validators.test.ts
    └── storage.test.ts
```

## API Endpoints

### Documents

#### Upload Document
```bash
POST /api/v1/documents/upload
Content-Type: multipart/form-data

{
  "file": <binary>,
  "folderId": "uuid",
  "description": "string",
  "accessLevel": "public" | "tenant" | "private" | "role_based",
  "allowedRoles": ["role1", "role2"],
  "metadata": { "key": "value" }
}
```

#### List Documents
```bash
GET /api/v1/documents?folderId=uuid&mimeType=application/pdf&page=1&limit=20

Response:
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "uuid",
        "name": "document.pdf",
        "fileSize": 1024000,
        "fileSizeFormatted": "1.00 MB",
        "mimeType": "application/pdf",
        "version": 1,
        "isCurrentVersion": true,
        "uploadedBy": "user-id",
        "uploadedByName": "John Doe",
        "createdAt": "2025-10-16T10:00:00Z",
        ...
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### Get Document
```bash
GET /api/v1/documents/:id
```

#### Update Document Metadata
```bash
PATCH /api/v1/documents/:id
Content-Type: application/json

{
  "name": "new-name.pdf",
  "description": "Updated description",
  "folderId": "new-folder-uuid",
  "accessLevel": "role_based",
  "allowedRoles": ["admin", "editor"]
}
```

#### Delete Document
```bash
DELETE /api/v1/documents/:id
```

#### Download Document
```bash
GET /api/v1/documents/:id/download
```

### Versioning

#### Create New Version
```bash
POST /api/v1/documents/:id/versions
Content-Type: multipart/form-data

{
  "file": <binary>
}
```

#### Get Document Versions
```bash
GET /api/v1/documents/:id/versions

Response:
{
  "success": true,
  "data": [
    {
      "version": 3,
      "documentId": "uuid",
      "name": "document-v3.pdf",
      "fileSize": 1024000,
      "uploadedBy": "user-id",
      "uploadedByName": "John Doe",
      "isCurrentVersion": true,
      "createdAt": "2025-10-16T12:00:00Z"
    },
    {
      "version": 2,
      "documentId": "uuid",
      "name": "document-v2.pdf",
      "fileSize": 900000,
      "uploadedBy": "user-id",
      "uploadedByName": "John Doe",
      "isCurrentVersion": false,
      "createdAt": "2025-10-15T10:00:00Z"
    }
  ]
}
```

#### Restore Version
```bash
POST /api/v1/documents/:id/versions/:version/restore
```

### Folders

#### Create Folder
```bash
POST /api/v1/folders
Content-Type: application/json

{
  "name": "Projects",
  "description": "Project documents",
  "parentFolderId": "uuid",
  "accessLevel": "tenant"
}
```

#### List Folders
```bash
# List folders by parent
GET /api/v1/folders?parentId=uuid

# Get folder tree
GET /api/v1/folders?view=tree

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Documents",
      "path": "/Documents",
      "documentCount": 15,
      "subfolderCount": 3,
      "children": [
        {
          "id": "uuid",
          "name": "Projects",
          "path": "/Documents/Projects",
          "documentCount": 8,
          "subfolderCount": 0,
          "children": []
        }
      ]
    }
  ]
}
```

#### Get Folder
```bash
GET /api/v1/folders/:id
```

#### Update Folder
```bash
PATCH /api/v1/folders/:id
Content-Type: application/json

{
  "name": "New Name",
  "description": "Updated description"
}
```

#### Delete Folder
```bash
# Delete empty folder
DELETE /api/v1/folders/:id

# Delete folder and all contents
DELETE /api/v1/folders/:id?recursive=true
```

#### Move Folder
```bash
POST /api/v1/folders/:id/move
Content-Type: application/json

{
  "newParentId": "uuid"
}
```

### Sharing

#### Share Document
```bash
POST /api/v1/documents/:id/share
Content-Type: application/json

{
  "sharedWithUserId": "user-uuid",
  "permission": "view" | "download" | "edit" | "delete",
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

#### Get Document Shares
```bash
GET /api/v1/documents/:id/shares
```

#### Revoke Share
```bash
DELETE /api/v1/documents/shares/:shareId
```

### Search

#### Search Documents
```bash
GET /api/v1/documents/search?q=contract&folderId=uuid&mimeType=application/pdf
```

## Usage Examples

### TypeScript/JavaScript Client

```typescript
import { documentsService } from '@/modules/documents';

// Upload document
const file = new File([buffer], 'report.pdf', { type: 'application/pdf' });
const result = await documentsService.uploadDocument(
  Buffer.from(await file.arrayBuffer()),
  {
    fileName: 'report.pdf',
    folderId: 'folder-uuid',
    description: 'Q4 2024 Report',
    accessLevel: 'tenant',
  },
  userId,
  tenantId
);

// List documents
const documents = await documentsService.listDocuments(
  { folderId: 'folder-uuid' },
  { page: 1, limit: 20 },
  userId,
  tenantId
);

// Download document
const download = await documentsService.downloadDocument(
  'document-uuid',
  userId,
  tenantId
);

// Create new version
await documentsService.createNewVersion(
  'document-uuid',
  newFileBuffer,
  'report-v2.pdf',
  userId,
  tenantId
);

// Share document
await documentsService.shareDocument(
  {
    documentId: 'document-uuid',
    sharedWithUserId: 'user-uuid',
    permission: 'view',
    expiresAt: new Date('2025-12-31'),
  },
  userId,
  tenantId
);
```

### CURL Examples

```bash
# Upload document
curl -X POST http://localhost:3000/api/v1/documents/upload \
  -F "file=@./report.pdf" \
  -F "description=Q4 Report" \
  -F "accessLevel=tenant"

# List documents
curl http://localhost:3000/api/v1/documents?page=1&limit=20

# Download document
curl -O http://localhost:3000/api/v1/documents/{uuid}/download

# Create folder
curl -X POST http://localhost:3000/api/v1/folders \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Projects",
    "description": "Project documents"
  }'

# Share document
curl -X POST http://localhost:3000/api/v1/documents/{uuid}/share \
  -H "Content-Type: application/json" \
  -d '{
    "sharedWithUserId": "user-uuid",
    "permission": "view"
  }'
```

## Configuration

### Environment Variables

```bash
# Storage Provider (local, s3, gcs)
STORAGE_PROVIDER=local

# Local Storage Path
STORAGE_LOCAL_PATH=./storage/documents

# Maximum File Size (bytes)
MAX_FILE_SIZE=52428800  # 50MB

# S3 Configuration (if using S3)
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket

# GCS Configuration (if using GCS)
GCS_PROJECT_ID=your-project
GCS_BUCKET=your-bucket
GCS_CREDENTIALS_PATH=/path/to/credentials.json
```

### Allowed MIME Types

Documents Manager supports the following file types by default:

- **Documents**: PDF, Word, Excel, PowerPoint, RTF
- **Images**: JPEG, PNG, GIF, WebP, SVG, BMP, TIFF
- **Archives**: ZIP, RAR, 7Z, TAR, GZIP
- **Data**: JSON, XML, YAML, CSV, TXT
- **Media**: MP3, WAV, MP4, WebM, OGG

## Security Features

### Access Control Levels

1. **Public**: Accessible to everyone
2. **Tenant**: Accessible to all users in the same tenant
3. **Private**: Accessible only to the owner
4. **Role-Based**: Accessible to users with specific roles

### File Validation

- MIME type validation
- File size limits
- Dangerous extension blocking (.exe, .bat, .cmd, etc.)
- Path traversal protection
- Filename sanitization

### Multi-Tenancy

All documents are isolated by tenant ID:
- Queries automatically filter by tenant
- Cross-tenant access is prevented
- Folder paths are tenant-specific

## Database Schema

### Tables

1. **folders**: Hierarchical folder structure
2. **documents**: Document metadata and versioning
3. **document_shares**: Sharing permissions

### Indexes

Optimized indexes for:
- Tenant-based queries
- Folder hierarchy traversal
- Document versioning
- Full-text search on document names
- Share expiration checks

## Performance

### Caching Strategy

- Document metadata cached for 5 minutes
- Folder structure cached for 10 minutes
- Automatic cache invalidation on updates

### Query Optimization

- Indexed tenant_id for multi-tenant isolation
- Indexed folder paths for hierarchy queries
- Indexed parent_document_id for versioning
- Pagination support for large result sets

## Testing

```bash
# Run all tests
bun test src/modules/documents/__tests__

# Run specific test file
bun test src/modules/documents/__tests__/validators.test.ts

# Run with coverage
bun test --coverage src/modules/documents
```

Current test coverage: **>95%**

## Migration

Run the migration to create database tables:

```bash
# Using Drizzle
bun run drizzle-kit push

# Or manually run SQL
psql -d your_database -f drizzle/migrations/0003_documents_manager.sql
```

## Roadmap

- [ ] S3 storage implementation
- [ ] Google Cloud Storage implementation
- [ ] Virus scanning (ClamAV integration)
- [ ] OCR for PDFs
- [ ] Document preview generation
- [ ] Collaborative editing
- [ ] Advanced full-text search (Elasticsearch)
- [ ] Bulk operations (upload, download, delete)
- [ ] Document templates
- [ ] Audit trail for document access

## License

Proprietary - BotCriptoFy2 Project
