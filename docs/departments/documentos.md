# Módulo de Documentos - BotCriptoFy2

## 📄 Visão Geral

O Módulo de Documentos é responsável por toda a gestão de documentos da plataforma, incluindo controle de versões, indexação automática, busca inteligente e arquivo de documentos.

## 🏗️ Arquitetura do Módulo

### Componentes Principais
- **Document Management**: Gestão de documentos
- **Version Control**: Controle de versões
- **Search & Indexing**: Busca e indexação
- **Document Archiving**: Arquivo de documentos
- **Template Management**: Gestão de templates

### Integração com Better-Auth
- **Multi-tenancy**: Suporte a diferentes tipos de usuários
- **User Management**: Gestão de usuários e permissões
- **Document Attribution**: Atribuição de documentos a usuários
- **Access Control**: Controle de acesso a documentos

## 📊 Estrutura de Dados

### Tabelas do Banco de Dados

#### 1. documents
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  file_type VARCHAR(50) NOT NULL, -- pdf, doc, docx, txt, html, markdown
  file_size BIGINT NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  tags TEXT[],
  is_public BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  parent_id UUID REFERENCES documents(id),
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. document_versions
```sql
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id),
  version_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  change_summary TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. document_permissions
```sql
CREATE TABLE document_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id),
  user_id UUID REFERENCES users(id),
  role_id UUID REFERENCES security_roles(id),
  permission_type VARCHAR(20) NOT NULL, -- read, write, delete, share
  granted_by UUID NOT NULL REFERENCES users(id),
  granted_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);
```

#### 4. document_templates
```sql
CREATE TABLE document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  variables JSONB, -- Template variables
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 5. document_search_index
```sql
CREATE TABLE document_search_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id),
  searchable_content TEXT NOT NULL,
  keywords TEXT[],
  categories TEXT[],
  tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 6. document_activities
```sql
CREATE TABLE document_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id),
  user_id UUID NOT NULL REFERENCES users(id),
  activity_type VARCHAR(50) NOT NULL, -- created, updated, viewed, downloaded, shared
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🎯 Funcionalidades do Módulo

### 1. Gestão de Documentos

#### Criação de Documentos
- **Upload de Arquivos**: Upload de arquivos diversos
- **Criação de Texto**: Criação de documentos de texto
- **Templates**: Criação a partir de templates
- **Importação**: Importação de documentos externos

#### Categorização
- **Categorias**: Organização por categorias
- **Tags**: Sistema de tags
- **Metadados**: Metadados personalizáveis
- **Classificação**: Classificação automática

#### Controle de Acesso
- **Permissões Granulares**: Controle fino de permissões
- **Herança**: Herança de permissões
- **Temporárias**: Permissões temporárias
- **Revogação**: Revogação de permissões

### 2. Controle de Versões

#### Versionamento
- **Versionamento Automático**: Versionamento automático
- **Histórico**: Histórico completo de versões
- **Comparação**: Comparação entre versões
- **Restauração**: Restauração de versões

#### Mudanças
- **Tracking**: Rastreamento de mudanças
- **Diff**: Visualização de diferenças
- **Comentários**: Comentários de versão
- **Aprovação**: Aprovação de versões

#### Colaboração
- **Edição Simultânea**: Edição simultânea
- **Conflitos**: Resolução de conflitos
- **Merge**: Merge de versões
- **Branching**: Criação de branches

### 3. Busca e Indexação

#### Busca Inteligente
- **Busca Full-Text**: Busca em conteúdo completo
- **Busca por Metadados**: Busca por metadados
- **Busca Semântica**: Busca semântica
- **Busca por Similaridade**: Busca por similaridade

#### Indexação
- **Indexação Automática**: Indexação automática
- **Indexação Incremental**: Indexação incremental
- **Indexação de Conteúdo**: Indexação de conteúdo
- **Indexação de Metadados**: Indexação de metadados

#### Filtros
- **Filtros Avançados**: Filtros avançados
- **Filtros por Data**: Filtros temporais
- **Filtros por Usuário**: Filtros por usuário
- **Filtros por Categoria**: Filtros por categoria

### 4. Arquivo de Documentos

#### Políticas de Arquivo
- **Arquivo Automático**: Arquivo automático
- **Políticas de Retenção**: Políticas de retenção
- **Arquivo Manual**: Arquivo manual
- **Restauração**: Restauração de arquivos

#### Compressão
- **Compressão Automática**: Compressão automática
- **Otimização**: Otimização de espaço
- **Descompressão**: Descompressão sob demanda
- **Verificação**: Verificação de integridade

#### Backup
- **Backup Automático**: Backup automático
- **Backup Incremental**: Backup incremental
- **Backup Completo**: Backup completo
- **Restauração**: Restauração de backup

### 5. Gestão de Templates

#### Criação de Templates
- **Templates Personalizados**: Templates personalizados
- **Variáveis**: Sistema de variáveis
- **Condicionais**: Lógica condicional
- **Validação**: Validação de templates

#### Aplicação de Templates
- **Aplicação Automática**: Aplicação automática
- **Aplicação Manual**: Aplicação manual
- **Preview**: Preview de templates
- **Validação**: Validação de aplicação

#### Gestão de Versões
- **Versionamento**: Versionamento de templates
- **Histórico**: Histórico de mudanças
- **Rollback**: Rollback de templates
- **Migração**: Migração de templates

## 🔧 APIs do Módulo

### 1. Documents APIs

#### GET /api/documentos/documents
Listar documentos

```typescript
interface DocumentResponse {
  id: string;
  title: string;
  description?: string;
  content: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  mimeType: string;
  category: string;
  tags: string[];
  isPublic: boolean;
  isArchived: boolean;
  version: number;
  parentId?: string;
  createdBy: string;
  updatedBy?: string;
  tenantId: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
```

#### POST /api/documentos/documents
Criar documento

```typescript
interface CreateDocumentRequest {
  title: string;
  description?: string;
  content: string;
  fileType: string;
  category: string;
  tags?: string[];
  isPublic?: boolean;
  parentId?: string;
  metadata?: Record<string, any>;
}

interface CreateDocumentResponse {
  id: string;
  status: string;
  message: string;
}
```

#### PUT /api/documentos/documents/{id}
Atualizar documento

```typescript
interface UpdateDocumentRequest {
  title?: string;
  description?: string;
  content?: string;
  category?: string;
  tags?: string[];
  isPublic?: boolean;
  metadata?: Record<string, any>;
}

interface UpdateDocumentResponse {
  id: string;
  status: string;
  message: string;
}
```

#### DELETE /api/documentos/documents/{id}
Excluir documento

```typescript
interface DeleteDocumentResponse {
  id: string;
  status: string;
  message: string;
}
```

### 2. Versions APIs

#### GET /api/documentos/documents/{id}/versions
Listar versões do documento

```typescript
interface DocumentVersionResponse {
  id: string;
  documentId: string;
  versionNumber: number;
  title: string;
  content: string;
  filePath: string;
  fileSize: number;
  changeSummary?: string;
  createdBy: string;
  createdAt: string;
}
```

#### POST /api/documentos/documents/{id}/versions
Criar nova versão

```typescript
interface CreateVersionRequest {
  content: string;
  changeSummary?: string;
}

interface CreateVersionResponse {
  id: string;
  versionNumber: number;
  status: string;
  message: string;
}
```

#### GET /api/documentos/documents/{id}/versions/{versionNumber}
Obter versão específica

```typescript
interface GetVersionResponse {
  id: string;
  documentId: string;
  versionNumber: number;
  title: string;
  content: string;
  filePath: string;
  fileSize: number;
  changeSummary?: string;
  createdBy: string;
  createdAt: string;
}
```

### 3. Permissions APIs

#### GET /api/documentos/documents/{id}/permissions
Listar permissões do documento

```typescript
interface DocumentPermissionResponse {
  id: string;
  documentId: string;
  userId?: string;
  roleId?: string;
  permissionType: string;
  grantedBy: string;
  grantedAt: string;
  expiresAt?: string;
}
```

#### POST /api/documentos/documents/{id}/permissions
Conceder permissão

```typescript
interface GrantPermissionRequest {
  userId?: string;
  roleId?: string;
  permissionType: string;
  expiresAt?: string;
}

interface GrantPermissionResponse {
  id: string;
  status: string;
  message: string;
}
```

#### DELETE /api/documentos/documents/{id}/permissions/{permissionId}
Revogar permissão

```typescript
interface RevokePermissionResponse {
  id: string;
  status: string;
  message: string;
}
```

### 4. Search APIs

#### GET /api/documentos/search
Buscar documentos

```typescript
interface SearchDocumentsRequest {
  query: string;
  category?: string;
  tags?: string[];
  fileType?: string;
  isPublic?: boolean;
  isArchived?: boolean;
  createdBy?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

interface SearchDocumentsResponse {
  documents: DocumentResponse[];
  total: number;
  hasMore: boolean;
  facets: SearchFacets;
}

interface SearchFacets {
  categories: FacetItem[];
  tags: FacetItem[];
  fileTypes: FacetItem[];
  users: FacetItem[];
}

interface FacetItem {
  value: string;
  count: number;
}
```

#### GET /api/documentos/search/suggestions
Obter sugestões de busca

```typescript
interface SearchSuggestionsRequest {
  query: string;
  limit?: number;
}

interface SearchSuggestionsResponse {
  suggestions: string[];
}
```

### 5. Templates APIs

#### GET /api/documentos/templates
Listar templates

```typescript
interface DocumentTemplateResponse {
  id: string;
  name: string;
  description?: string;
  content: string;
  category: string;
  variables?: Record<string, any>;
  isActive: boolean;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### POST /api/documentos/templates
Criar template

```typescript
interface CreateTemplateRequest {
  name: string;
  description?: string;
  content: string;
  category: string;
  variables?: Record<string, any>;
}

interface CreateTemplateResponse {
  id: string;
  status: string;
  message: string;
}
```

#### PUT /api/documentos/templates/{id}
Atualizar template

```typescript
interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  content?: string;
  category?: string;
  variables?: Record<string, any>;
  isActive?: boolean;
}

interface UpdateTemplateResponse {
  id: string;
  status: string;
  message: string;
}
```

#### POST /api/documentos/templates/{id}/apply
Aplicar template

```typescript
interface ApplyTemplateRequest {
  variables: Record<string, any>;
  title?: string;
  description?: string;
}

interface ApplyTemplateResponse {
  documentId: string;
  status: string;
  message: string;
}
```

### 6. Activities APIs

#### GET /api/documentos/documents/{id}/activities
Listar atividades do documento

```typescript
interface DocumentActivityResponse {
  id: string;
  documentId: string;
  userId: string;
  activityType: string;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}
```

#### POST /api/documentos/documents/{id}/activities
Registrar atividade

```typescript
interface CreateActivityRequest {
  activityType: string;
  description?: string;
  metadata?: Record<string, any>;
}

interface CreateActivityResponse {
  id: string;
  status: string;
  message: string;
}
```

## 🤖 Agente de Documentos

### Capacidades

#### documents
- Gestão de documentos
- Criação de documentos
- Atualização de documentos
- Exclusão de documentos

#### versioning
- Controle de versões
- Histórico de mudanças
- Comparação de versões
- Restauração de versões

#### search
- Busca inteligente
- Indexação de conteúdo
- Filtros avançados
- Sugestões de busca

#### indexing
- Indexação automática
- Indexação incremental
- Otimização de índices
- Manutenção de índices

#### archiving
- Arquivo de documentos
- Políticas de retenção
- Compressão de arquivos
- Backup de documentos

### Comandos

```bash
/organize_documents - Organizar documentos
/update_versions - Atualizar versões
/search_documents - Buscar documentos
/index_content - Indexar conteúdo
/archive_documents - Arquivar documentos
/update_templates - Atualizar templates
/optimize_search - Otimizar busca
/update_permissions - Atualizar permissões
/generate_report - Gerar relatório
/update_metadata - Atualizar metadados
```

## 📊 Dashboard de Documentos

### Métricas Principais
- **Total de Documentos**: Número total de documentos
- **Documentos por Categoria**: Distribuição por categoria
- **Versões Criadas**: Número de versões criadas
- **Buscas Realizadas**: Número de buscas
- **Documentos Arquivados**: Número de documentos arquivados

### Gráficos
- **Documentos por Tipo**: Gráfico de pizza
- **Documentos por Período**: Gráfico de linha
- **Atividades por Usuário**: Gráfico de barras
- **Versões por Documento**: Gráfico de barras

### Alertas
- **Documentos Não Indexados**: Alertas de indexação
- **Versões Desatualizadas**: Alertas de versões
- **Permissões Expiradas**: Alertas de permissões
- **Espaço de Armazenamento**: Alertas de espaço

## 🔄 Fluxo de Trabalho

### 1. Criação de Documento
```
Upload/Texto → Validação → Categorização → Indexação → Permissões
```

### 2. Atualização de Documento
```
Edição → Validação → Nova Versão → Indexação → Notificação
```

### 3. Busca de Documento
```
Query → Indexação → Filtros → Resultados → Ranking
```

### 4. Arquivo de Documento
```
Política → Validação → Compressão → Arquivo → Backup
```

## 🧪 Testes

### Testes Unitários
```bash
# Testes de documentos
bun test src/admin/departments/documentos/documents/

# Testes de versões
bun test src/admin/departments/documentos/versions/

# Testes de busca
bun test src/admin/departments/documentos/search/
```

### Testes de Integração
```bash
# Testes de integração com Better-Auth
bun test tests/integration/documentos-auth.test.ts

# Testes de integração com Telegram
bun test tests/integration/documentos-telegram.test.ts
```

## 🚀 Deploy

### Variáveis de Ambiente
```env
# Documentos
DOCUMENTOS_STORAGE_PATH=/app/storage/documents
DOCUMENTOS_INDEX_CACHE_TTL=3600
DOCUMENTOS_SEARCH_CACHE_TTL=1800
DOCUMENTOS_ARCHIVE_CACHE_TTL=7200
```

### Docker
```dockerfile
# Adicionar ao Dockerfile existente
COPY src/admin/departments/documentos/ ./src/admin/departments/documentos/
RUN bun install
```

## 📈 Monitoramento

### Métricas de Performance
- **Response Time**: < 200ms para APIs
- **Throughput**: 500+ requests/min
- **Error Rate**: < 0.1%
- **Uptime**: 99.9%

### Alertas
- **Documentos Não Indexados**: > 100 documentos
- **Versões Desatualizadas**: > 50 versões
- **Permissões Expiradas**: > 20 permissões
- **Espaço de Armazenamento**: > 80% usado

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO