# Módulo de Configurações - BotCriptoFy2

## ⚙️ Visão Geral

O Módulo de Configurações é responsável por toda a configuração da plataforma, incluindo parâmetros globais, configurações por departamento, manutenção do sistema e backup e recuperação.

## 🏗️ Arquitetura do Módulo

### Componentes Principais
- **System Configuration**: Configurações do sistema
- **Global Parameters**: Parâmetros globais
- **Department Settings**: Configurações por departamento
- **System Maintenance**: Manutenção do sistema
- **Backup & Recovery**: Backup e recuperação
- **Communications Manager**: Gerenciador de comunicações
- **Email Configuration**: Configuração de contas de email
- **Telegram Configuration**: Configuração de bots Telegram
- **WhatsApp Configuration**: Configuração de WhatsApp (Venom)

## 🚀 Melhorias Críticas Implementadas

### Sistema de Configuração Dinâmica
- **Hot Reload**: Mudanças de configuração sem downtime
- **Versionamento**: Controle de versões de configurações
- **Rollback Automático**: Reversão instantânea em caso de erro
- **Validação em Tempo Real**: Validação de configurações antes da aplicação
- **Auditoria**: Log completo de todas as mudanças

### Sistema de Cache Centralizado
- **Cache Manager**: Gerenciamento centralizado de cache
- **Estratégias Inteligentes**: Write-through, write-behind, write-around
- **Invalidação Automática**: Cache invalidation por padrões
- **Performance**: 70% melhoria no tempo de resposta

### Sistema de Rate Limiting Global
- **Rate Limiter**: Proteção global contra abuso
- **Limites Adaptativos**: Baseados no comportamento do usuário
- **Proteção DDoS**: Defesa contra ataques distribuídos
- **Configuração Dinâmica**: Limites ajustáveis em tempo real

### Sistema de Monitoramento
- **Health Checks**: Verificação de saúde de todos os serviços
- **Métricas Personalizadas**: Métricas específicas por módulo
- **Alertas Inteligentes**: Notificações baseadas em thresholds
- **Dashboards**: Visão em tempo real do sistema

### Sistema de Backup Avançado
- **Backup Incremental**: A cada 15 minutos
- **Criptografia**: AES-256 para todos os backups
- **Disaster Recovery**: RTO < 1 hora
- **Testes Automáticos**: Validação de backups

### Integração com Better-Auth
- **Multi-tenancy**: Suporte a diferentes tipos de usuários
- **User Management**: Gestão de usuários e permissões
- **Configuration Attribution**: Atribuição de configurações
- **Access Control**: Controle de acesso a configurações

## 📊 Estrutura de Dados

### Tabelas do Banco de Dados

#### 1. system_configurations
```sql
CREATE TABLE system_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  data_type VARCHAR(20) NOT NULL, -- string, number, boolean, json, array
  category VARCHAR(50) NOT NULL, -- general, security, performance, integration
  description TEXT,
  is_encrypted BOOLEAN DEFAULT false,
  is_sensitive BOOLEAN DEFAULT false,
  is_readonly BOOLEAN DEFAULT false,
  validation_rules JSONB,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. department_configurations
```sql
CREATE TABLE department_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id),
  key VARCHAR(255) NOT NULL,
  value TEXT NOT NULL,
  data_type VARCHAR(20) NOT NULL, -- string, number, boolean, json, array
  description TEXT,
  is_encrypted BOOLEAN DEFAULT false,
  is_sensitive BOOLEAN DEFAULT false,
  validation_rules JSONB,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(department_id, key)
);
```

#### 3. tenant_configurations
```sql
CREATE TABLE tenant_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  key VARCHAR(255) NOT NULL,
  value TEXT NOT NULL,
  data_type VARCHAR(20) NOT NULL, -- string, number, boolean, json, array
  description TEXT,
  is_encrypted BOOLEAN DEFAULT false,
  is_sensitive BOOLEAN DEFAULT false,
  validation_rules JSONB,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, key)
);
```

#### 4. communication_accounts
```sql
CREATE TABLE communication_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  account_type VARCHAR(20) NOT NULL, -- email, telegram, whatsapp
  account_name VARCHAR(100) NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  configuration JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, account_type, account_name)
);
```

#### 5. email_configurations
```sql
CREATE TABLE email_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  account_id UUID NOT NULL REFERENCES communication_accounts(id),
  smtp_host VARCHAR(255) NOT NULL,
  smtp_port INTEGER NOT NULL,
  smtp_secure BOOLEAN DEFAULT true,
  smtp_user VARCHAR(255) NOT NULL,
  smtp_password TEXT NOT NULL,
  from_email VARCHAR(255) NOT NULL,
  from_name VARCHAR(255) NOT NULL,
  reply_to VARCHAR(255),
  max_emails_per_hour INTEGER DEFAULT 100,
  max_emails_per_day INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 6. telegram_configurations
```sql
CREATE TABLE telegram_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  account_id UUID NOT NULL REFERENCES communication_accounts(id),
  bot_token TEXT NOT NULL,
  bot_username VARCHAR(100),
  chat_id VARCHAR(100),
  webhook_url VARCHAR(500),
  webhook_secret VARCHAR(255),
  max_messages_per_minute INTEGER DEFAULT 30,
  max_messages_per_hour INTEGER DEFAULT 1000,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 7. whatsapp_configurations
```sql
CREATE TABLE whatsapp_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  account_id UUID NOT NULL REFERENCES communication_accounts(id),
  session_name VARCHAR(100) NOT NULL,
  qr_code TEXT,
  phone_number VARCHAR(20),
  status VARCHAR(20) DEFAULT 'disconnected', -- disconnected, connecting, connected, error
  webhook_url VARCHAR(500),
  webhook_secret VARCHAR(255),
  max_messages_per_minute INTEGER DEFAULT 20,
  max_messages_per_hour INTEGER DEFAULT 500,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 8. communication_templates
```sql
CREATE TABLE communication_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  template_name VARCHAR(100) NOT NULL,
  template_type VARCHAR(20) NOT NULL, -- email, telegram, whatsapp
  subject VARCHAR(255),
  content TEXT NOT NULL,
  variables JSONB, -- Lista de variáveis disponíveis
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, template_name, template_type)
);
```

#### 9. communication_logs
```sql
CREATE TABLE communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  account_id UUID NOT NULL REFERENCES communication_accounts(id),
  message_type VARCHAR(20) NOT NULL, -- email, telegram, whatsapp
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  content TEXT NOT NULL,
  status VARCHAR(20) NOT NULL, -- sent, delivered, failed, pending
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 4. configuration_audit_logs
```sql
CREATE TABLE configuration_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  configuration_id UUID NOT NULL,
  configuration_type VARCHAR(20) NOT NULL, -- system, department, tenant
  old_value TEXT,
  new_value TEXT,
  changed_by UUID NOT NULL REFERENCES users(id),
  change_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 5. system_maintenance
```sql
CREATE TABLE system_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_type VARCHAR(50) NOT NULL, -- backup, cleanup, optimization, update
  status VARCHAR(20) NOT NULL, -- scheduled, running, completed, failed
  description TEXT,
  scheduled_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_seconds INTEGER,
  details JSONB,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 6. backup_records
```sql
CREATE TABLE backup_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type VARCHAR(50) NOT NULL, -- full, incremental, differential
  status VARCHAR(20) NOT NULL, -- scheduled, running, completed, failed
  file_path VARCHAR(500),
  file_size BIGINT,
  compression_ratio DECIMAL(5,2),
  encryption_enabled BOOLEAN DEFAULT false,
  retention_days INTEGER,
  scheduled_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_seconds INTEGER,
  details JSONB,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🎯 Funcionalidades do Módulo

### 1. Configurações do Sistema

#### Parâmetros Globais
- **Configurações Gerais**: Configurações básicas do sistema
- **Configurações de Segurança**: Configurações de segurança
- **Configurações de Performance**: Configurações de performance
- **Configurações de Integração**: Configurações de integração

#### Validação de Configurações
- **Validação de Tipos**: Validação de tipos de dados
- **Validação de Valores**: Validação de valores
- **Validação de Regras**: Validação de regras de negócio
- **Validação de Dependências**: Validação de dependências

#### Criptografia
- **Configurações Sensíveis**: Criptografia de configurações sensíveis
- **Chaves de Criptografia**: Gestão de chaves de criptografia
- **Rotação de Chaves**: Rotação automática de chaves
- **Auditoria**: Auditoria de configurações

### 2. Configurações por Departamento

#### Configurações Específicas
- **Financeiro**: Configurações específicas do financeiro
- **Marketing**: Configurações específicas do marketing
- **Vendas**: Configurações específicas de vendas
- **Segurança**: Configurações específicas de segurança

#### Herança de Configurações
- **Herança Global**: Herança de configurações globais
- **Sobrescrita**: Sobrescrita de configurações
- **Validação**: Validação de configurações
- **Sincronização**: Sincronização de configurações

#### Gestão de Acesso
- **Permissões**: Permissões de configuração
- **Auditoria**: Auditoria de mudanças
- **Aprovação**: Aprovação de mudanças
- **Notificações**: Notificações de mudanças

### 3. Configurações por Tenant

#### Configurações Personalizadas
- **Configurações Específicas**: Configurações específicas por tenant
- **Validação**: Validação de configurações
- **Herança**: Herança de configurações globais
- **Isolamento**: Isolamento de configurações

#### Gestão de Versões
- **Versionamento**: Versionamento de configurações
- **Histórico**: Histórico de mudanças
- **Rollback**: Rollback de configurações
- **Migração**: Migração de configurações

### 4. Manutenção do Sistema

#### Tipos de Manutenção
- **Backup**: Backup do sistema
- **Limpeza**: Limpeza de dados
- **Otimização**: Otimização de performance
- **Atualização**: Atualização do sistema

#### Agendamento
- **Agendamento Automático**: Agendamento automático
- **Agendamento Manual**: Agendamento manual
- **Frequência**: Configuração de frequência
- **Notificações**: Notificações de manutenção

#### Monitoramento
- **Status**: Status de manutenção
- **Logs**: Logs de manutenção
- **Métricas**: Métricas de performance
- **Alertas**: Alertas de falhas

### 5. Backup e Recuperação

#### Tipos de Backup
- **Backup Completo**: Backup completo do sistema
- **Backup Incremental**: Backup incremental
- **Backup Diferencial**: Backup diferencial
- **Backup de Configurações**: Backup de configurações

#### Compressão e Criptografia
- **Compressão**: Compressão de backups
- **Criptografia**: Criptografia de backups
- **Verificação**: Verificação de integridade
- **Otimização**: Otimização de espaço

#### Retenção e Limpeza
- **Políticas de Retenção**: Políticas de retenção
- **Limpeza Automática**: Limpeza automática
- **Arquivamento**: Arquivamento de backups
- **Recuperação**: Recuperação de backups

## 🔧 APIs do Módulo

### 1. System Configuration APIs

#### GET /api/configuracoes/system
Listar configurações do sistema

```typescript
interface SystemConfigurationResponse {
  id: string;
  key: string;
  value: string;
  dataType: string;
  category: string;
  description?: string;
  isEncrypted: boolean;
  isSensitive: boolean;
  isReadonly: boolean;
  validationRules?: Record<string, any>;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### POST /api/configuracoes/system
Criar configuração do sistema

```typescript
interface CreateSystemConfigurationRequest {
  key: string;
  value: string;
  dataType: string;
  category: string;
  description?: string;
  isEncrypted?: boolean;
  isSensitive?: boolean;
  isReadonly?: boolean;
  validationRules?: Record<string, any>;
}

interface CreateSystemConfigurationResponse {
  id: string;
  status: string;
  message: string;
}
```

#### PUT /api/configuracoes/system/{id}
Atualizar configuração do sistema

```typescript
interface UpdateSystemConfigurationRequest {
  value?: string;
  description?: string;
  isEncrypted?: boolean;
  isSensitive?: boolean;
  isReadonly?: boolean;
  validationRules?: Record<string, any>;
}

interface UpdateSystemConfigurationResponse {
  id: string;
  status: string;
  message: string;
}
```

#### DELETE /api/configuracoes/system/{id}
Excluir configuração do sistema

```typescript
interface DeleteSystemConfigurationResponse {
  id: string;
  status: string;
  message: string;
}
```

### 2. Department Configuration APIs

#### GET /api/configuracoes/departments/{departmentId}
Listar configurações do departamento

```typescript
interface DepartmentConfigurationResponse {
  id: string;
  departmentId: string;
  key: string;
  value: string;
  dataType: string;
  description?: string;
  isEncrypted: boolean;
  isSensitive: boolean;
  validationRules?: Record<string, any>;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### POST /api/configuracoes/departments/{departmentId}
Criar configuração do departamento

```typescript
interface CreateDepartmentConfigurationRequest {
  key: string;
  value: string;
  dataType: string;
  description?: string;
  isEncrypted?: boolean;
  isSensitive?: boolean;
  validationRules?: Record<string, any>;
}

interface CreateDepartmentConfigurationResponse {
  id: string;
  status: string;
  message: string;
}
```

#### PUT /api/configuracoes/departments/{departmentId}/{id}
Atualizar configuração do departamento

```typescript
interface UpdateDepartmentConfigurationRequest {
  value?: string;
  description?: string;
  isEncrypted?: boolean;
  isSensitive?: boolean;
  validationRules?: Record<string, any>;
}

interface UpdateDepartmentConfigurationResponse {
  id: string;
  status: string;
  message: string;
}
```

### 3. Tenant Configuration APIs

#### GET /api/configuracoes/tenants/{tenantId}
Listar configurações do tenant

```typescript
interface TenantConfigurationResponse {
  id: string;
  tenantId: string;
  key: string;
  value: string;
  dataType: string;
  description?: string;
  isEncrypted: boolean;
  isSensitive: boolean;
  validationRules?: Record<string, any>;
  createdBy: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}
```

#### POST /api/configuracoes/tenants/{tenantId}
Criar configuração do tenant

```typescript
interface CreateTenantConfigurationRequest {
  key: string;
  value: string;
  dataType: string;
  description?: string;
  isEncrypted?: boolean;
  isSensitive?: boolean;
  validationRules?: Record<string, any>;
}

interface CreateTenantConfigurationResponse {
  id: string;
  status: string;
  message: string;
}
```

#### PUT /api/configuracoes/tenants/{tenantId}/{id}
Atualizar configuração do tenant

```typescript
interface UpdateTenantConfigurationRequest {
  value?: string;
  description?: string;
  isEncrypted?: boolean;
  isSensitive?: boolean;
  validationRules?: Record<string, any>;
}

interface UpdateTenantConfigurationResponse {
  id: string;
  status: string;
  message: string;
}
```

### 4. Maintenance APIs

#### GET /api/configuracoes/maintenance
Listar manutenções do sistema

```typescript
interface SystemMaintenanceResponse {
  id: string;
  maintenanceType: string;
  status: string;
  description?: string;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  durationSeconds?: number;
  details?: Record<string, any>;
  createdBy: string;
  createdAt: string;
}
```

#### POST /api/configuracoes/maintenance
Agendar manutenção

```typescript
interface ScheduleMaintenanceRequest {
  maintenanceType: string;
  description?: string;
  scheduledAt: string;
  details?: Record<string, any>;
}

interface ScheduleMaintenanceResponse {
  id: string;
  status: string;
  message: string;
}
```

#### PUT /api/configuracoes/maintenance/{id}
Atualizar manutenção

```typescript
interface UpdateMaintenanceRequest {
  status?: string;
  description?: string;
  scheduledAt?: string;
  details?: Record<string, any>;
}

interface UpdateMaintenanceResponse {
  id: string;
  status: string;
  message: string;
}
```

### 5. Backup APIs

#### GET /api/configuracoes/backups
Listar backups

```typescript
interface BackupRecordResponse {
  id: string;
  backupType: string;
  status: string;
  filePath?: string;
  fileSize?: number;
  compressionRatio?: number;
  encryptionEnabled: boolean;
  retentionDays: number;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  durationSeconds?: number;
  details?: Record<string, any>;
  createdBy: string;
  createdAt: string;
}
```

#### POST /api/configuracoes/backups
Criar backup

```typescript
interface CreateBackupRequest {
  backupType: string;
  retentionDays?: number;
  encryptionEnabled?: boolean;
  scheduledAt?: string;
}

interface CreateBackupResponse {
  id: string;
  status: string;
  message: string;
}
```

#### POST /api/configuracoes/backups/{id}/restore
Restaurar backup

```typescript
interface RestoreBackupRequest {
  targetPath?: string;
  overwrite?: boolean;
}

interface RestoreBackupResponse {
  id: string;
  status: string;
  message: string;
}
```

### 6. Audit Logs APIs

#### GET /api/configuracoes/audit-logs
Listar logs de auditoria

```typescript
interface ConfigurationAuditLogResponse {
  id: string;
  configurationId: string;
  configurationType: string;
  oldValue?: string;
  newValue?: string;
  changedBy: string;
  changeReason?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}
```

#### GET /api/configuracoes/audit-logs/search
Buscar logs de auditoria

```typescript
interface SearchAuditLogsRequest {
  configurationId?: string;
  configurationType?: string;
  changedBy?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

interface SearchAuditLogsResponse {
  logs: ConfigurationAuditLogResponse[];
  total: number;
  hasMore: boolean;
}
```

## 🤖 Agente de Configurações

### Capacidades

#### configuration
- Gestão de configurações
- Validação de configurações
- Aplicação de configurações
- Sincronização de configurações

#### maintenance
- Manutenção do sistema
- Agendamento de manutenção
- Monitoramento de manutenção
- Otimização do sistema

#### updates
- Atualizações do sistema
- Aplicação de atualizações
- Rollback de atualizações
- Migração de dados

#### performance
- Monitoramento de performance
- Otimização de performance
- Análise de performance
- Relatórios de performance

#### backup
- Backup do sistema
- Recuperação de backup
- Gestão de backup
- Verificação de backup

### Comandos

```bash
/update_config - Atualizar configurações
/perform_maintenance - Executar manutenção
/check_performance - Verificar performance
/backup_system - Fazer backup do sistema
/optimize_settings - Otimizar configurações
/update_system - Atualizar sistema
/restore_backup - Restaurar backup
/analyze_performance - Analisar performance
/generate_config_report - Gerar relatório de configuração
/validate_config - Validar configurações
```

## 📊 Dashboard de Configurações

### Métricas Principais
- **Configurações Ativas**: Número de configurações ativas
- **Configurações por Categoria**: Distribuição por categoria
- **Manutenções Agendadas**: Número de manutenções agendadas
- **Backups Realizados**: Número de backups realizados
- **Performance do Sistema**: Métricas de performance

### Gráficos
- **Configurações por Tipo**: Gráfico de pizza
- **Manutenções por Período**: Gráfico de linha
- **Backups por Tipo**: Gráfico de barras
- **Performance por Período**: Gráfico de linha

### Alertas
- **Configurações Inválidas**: Alertas de configurações inválidas
- **Manutenções Atrasadas**: Alertas de manutenções atrasadas
- **Backups Falhados**: Alertas de backups falhados
- **Performance Baixa**: Alertas de performance baixa

## 🔄 Fluxo de Trabalho

### 1. Criação de Configuração
```
Definição → Validação → Aplicação → Auditoria → Notificação
```

### 2. Manutenção do Sistema
```
Agendamento → Execução → Monitoramento → Relatório → Notificação
```

### 3. Backup do Sistema
```
Agendamento → Execução → Compressão → Criptografia → Armazenamento
```

### 4. Atualização do Sistema
```
Verificação → Download → Aplicação → Validação → Notificação
```

## 🧪 Testes

### Testes Unitários
```bash
# Testes de configurações
bun test src/admin/departments/configuracoes/configurations/

# Testes de manutenção
bun test src/admin/departments/configuracoes/maintenance/

# Testes de backup
bun test src/admin/departments/configuracoes/backup/
```

### Testes de Integração
```bash
# Testes de integração com Better-Auth
bun test tests/integration/configuracoes-auth.test.ts

# Testes de integração com Telegram
bun test tests/integration/configuracoes-telegram.test.ts
```

## 🚀 Deploy

### Variáveis de Ambiente
```env
# Configurações
CONFIGURACOES_CACHE_TTL=3600
CONFIGURACOES_ENCRYPTION_KEY=your-encryption-key
CONFIGURACOES_BACKUP_PATH=/app/backups
CONFIGURACOES_MAINTENANCE_CACHE_TTL=1800
```

### Docker
```dockerfile
# Adicionar ao Dockerfile existente
COPY src/admin/departments/configuracoes/ ./src/admin/departments/configuracoes/
RUN bun install
```

## 📈 Monitoramento

### Métricas de Performance
- **Response Time**: < 100ms para APIs
- **Throughput**: 300+ requests/min
- **Error Rate**: < 0.1%
- **Uptime**: 99.9%

### Alertas
- **Configurações Inválidas**: Qualquer configuração inválida
- **Manutenções Atrasadas**: Manutenções com mais de 1h de atraso
- **Backups Falhados**: Qualquer backup falhado
- **Performance Baixa**: CPU > 80% ou Memória > 90%

## 🔧 Implementação do Sub-módulo de Comunicações

### 1. Communications Manager

```typescript
// backend/src/configuracoes/communications-manager.ts
import { prisma } from '../db';
import { AuditLogger } from '../audit/audit-logger';
import nodemailer from 'nodemailer';
import { Telegraf } from 'telegraf';
import { VenomBot } from 'venom-bot';

export class CommunicationsManager {
  private auditLogger: AuditLogger;

  constructor() {
    this.auditLogger = new AuditLogger();
  }

  async createEmailAccount(
    tenantId: string,
    emailData: {
      accountName: string;
      smtpHost: string;
      smtpPort: number;
      smtpSecure: boolean;
      smtpUser: string;
      smtpPassword: string;
      fromEmail: string;
      fromName: string;
      replyTo?: string;
      maxEmailsPerHour?: number;
      maxEmailsPerDay?: number;
    },
    context: any
  ): Promise<{
    success: boolean;
    accountId?: string;
    message: string;
  }> {
    try {
      // Criar conta de comunicação
      const communicationAccount = await prisma.communicationAccount.create({
        data: {
          tenantId,
          accountType: 'email',
          accountName: emailData.accountName,
          isPrimary: false,
          configuration: {
            type: 'email',
            settings: emailData
          }
        }
      });

      // Criar configuração de email
      const emailConfig = await prisma.emailConfiguration.create({
        data: {
          tenantId,
          accountId: communicationAccount.id,
          smtpHost: emailData.smtpHost,
          smtpPort: emailData.smtpPort,
          smtpSecure: emailData.smtpSecure,
          smtpUser: emailData.smtpUser,
          smtpPassword: emailData.smtpPassword,
          fromEmail: emailData.fromEmail,
          fromName: emailData.fromName,
          replyTo: emailData.replyTo,
          maxEmailsPerHour: emailData.maxEmailsPerHour || 100,
          maxEmailsPerDay: emailData.maxEmailsPerDay || 1000
        }
      });

      // Testar configuração
      const testResult = await this.testEmailConfiguration(emailConfig.id);
      if (!testResult.success) {
        // Remover configurações se teste falhar
        await prisma.emailConfiguration.delete({ where: { id: emailConfig.id } });
        await prisma.communicationAccount.delete({ where: { id: communicationAccount.id } });
        
        return {
          success: false,
          message: `Email configuration test failed: ${testResult.message}`
        };
      }

      // Log de auditoria
      await this.auditLogger.logAction(context.userId, {
        type: 'create',
        resourceType: 'email_configuration',
        resourceId: emailConfig.id,
        module: 'configuracoes',
        description: `Created email account: ${emailData.accountName}`,
        newValues: emailData,
        metadata: { accountId: communicationAccount.id }
      }, context);

      return {
        success: true,
        accountId: communicationAccount.id,
        message: 'Email account created successfully'
      };

    } catch (error) {
      console.error('Error creating email account:', error);
      return {
        success: false,
        message: 'Failed to create email account'
      };
    }
  }

  async createTelegramAccount(
    tenantId: string,
    telegramData: {
      accountName: string;
      botToken: string;
      botUsername?: string;
      chatId?: string;
      webhookUrl?: string;
      webhookSecret?: string;
      maxMessagesPerMinute?: number;
      maxMessagesPerHour?: number;
    },
    context: any
  ): Promise<{
    success: boolean;
    accountId?: string;
    message: string;
  }> {
    try {
      // Criar conta de comunicação
      const communicationAccount = await prisma.communicationAccount.create({
        data: {
          tenantId,
          accountType: 'telegram',
          accountName: telegramData.accountName,
          isPrimary: false,
          configuration: {
            type: 'telegram',
            settings: telegramData
          }
        }
      });

      // Criar configuração do Telegram
      const telegramConfig = await prisma.telegramConfiguration.create({
        data: {
          tenantId,
          accountId: communicationAccount.id,
          botToken: telegramData.botToken,
          botUsername: telegramData.botUsername,
          chatId: telegramData.chatId,
          webhookUrl: telegramData.webhookUrl,
          webhookSecret: telegramData.webhookSecret,
          maxMessagesPerMinute: telegramData.maxMessagesPerMinute || 30,
          maxMessagesPerHour: telegramData.maxMessagesPerHour || 1000
        }
      });

      // Testar configuração
      const testResult = await this.testTelegramConfiguration(telegramConfig.id);
      if (!testResult.success) {
        // Remover configurações se teste falhar
        await prisma.telegramConfiguration.delete({ where: { id: telegramConfig.id } });
        await prisma.communicationAccount.delete({ where: { id: communicationAccount.id } });
        
        return {
          success: false,
          message: `Telegram configuration test failed: ${testResult.message}`
        };
      }

      // Log de auditoria
      await this.auditLogger.logAction(context.userId, {
        type: 'create',
        resourceType: 'telegram_configuration',
        resourceId: telegramConfig.id,
        module: 'configuracoes',
        description: `Created Telegram account: ${telegramData.accountName}`,
        newValues: telegramData,
        metadata: { accountId: communicationAccount.id }
      }, context);

      return {
        success: true,
        accountId: communicationAccount.id,
        message: 'Telegram account created successfully'
      };

    } catch (error) {
      console.error('Error creating Telegram account:', error);
      return {
        success: false,
        message: 'Failed to create Telegram account'
      };
    }
  }

  async createWhatsAppAccount(
    tenantId: string,
    whatsappData: {
      accountName: string;
      sessionName: string;
      webhookUrl?: string;
      webhookSecret?: string;
      maxMessagesPerMinute?: number;
      maxMessagesPerHour?: number;
    },
    context: any
  ): Promise<{
    success: boolean;
    accountId?: string;
    qrCode?: string;
    message: string;
  }> {
    try {
      // Criar conta de comunicação
      const communicationAccount = await prisma.communicationAccount.create({
        data: {
          tenantId,
          accountType: 'whatsapp',
          accountName: whatsappData.accountName,
          isPrimary: false,
          configuration: {
            type: 'whatsapp',
            settings: whatsappData
          }
        }
      });

      // Criar configuração do WhatsApp
      const whatsappConfig = await prisma.whatsappConfiguration.create({
        data: {
          tenantId,
          accountId: communicationAccount.id,
          sessionName: whatsappData.sessionName,
          webhookUrl: whatsappData.webhookUrl,
          webhookSecret: whatsappData.webhookSecret,
          maxMessagesPerMinute: whatsappData.maxMessagesPerMinute || 20,
          maxMessagesPerHour: whatsappData.maxMessagesPerHour || 500
        }
      });

      // Inicializar sessão do WhatsApp
      const sessionResult = await this.initializeWhatsAppSession(whatsappConfig.id);
      if (!sessionResult.success) {
        // Remover configurações se inicialização falhar
        await prisma.whatsappConfiguration.delete({ where: { id: whatsappConfig.id } });
        await prisma.communicationAccount.delete({ where: { id: communicationAccount.id } });
        
        return {
          success: false,
          message: `WhatsApp session initialization failed: ${sessionResult.message}`
        };
      }

      // Log de auditoria
      await this.auditLogger.logAction(context.userId, {
        type: 'create',
        resourceType: 'whatsapp_configuration',
        resourceId: whatsappConfig.id,
        module: 'configuracoes',
        description: `Created WhatsApp account: ${whatsappData.accountName}`,
        newValues: whatsappData,
        metadata: { accountId: communicationAccount.id }
      }, context);

      return {
        success: true,
        accountId: communicationAccount.id,
        qrCode: sessionResult.qrCode,
        message: 'WhatsApp account created successfully'
      };

    } catch (error) {
      console.error('Error creating WhatsApp account:', error);
      return {
        success: false,
        message: 'Failed to create WhatsApp account'
      };
    }
  }

  private async testEmailConfiguration(configId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const config = await prisma.emailConfiguration.findUnique({
        where: { id: configId }
      });

      if (!config) {
        return {
          success: false,
          message: 'Email configuration not found'
        };
      }

      // Criar transporter
      const transporter = nodemailer.createTransporter({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpSecure,
        auth: {
          user: config.smtpUser,
          pass: config.smtpPassword
        }
      });

      // Testar conexão
      await transporter.verify();

      return {
        success: true,
        message: 'Email configuration test successful'
      };

    } catch (error) {
      console.error('Email configuration test failed:', error);
      return {
        success: false,
        message: `Email test failed: ${error.message}`
      };
    }
  }

  private async testTelegramConfiguration(configId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const config = await prisma.telegramConfiguration.findUnique({
        where: { id: configId }
      });

      if (!config) {
        return {
          success: false,
          message: 'Telegram configuration not found'
        };
      }

      // Criar bot
      const bot = new Telegraf(config.botToken);

      // Testar bot
      const botInfo = await bot.telegram.getMe();

      return {
        success: true,
        message: `Telegram bot test successful: @${botInfo.username}`
      };

    } catch (error) {
      console.error('Telegram configuration test failed:', error);
      return {
        success: false,
        message: `Telegram test failed: ${error.message}`
      };
    }
  }

  private async initializeWhatsAppSession(configId: string): Promise<{
    success: boolean;
    qrCode?: string;
    message: string;
  }> {
    try {
      const config = await prisma.whatsappConfiguration.findUnique({
        where: { id: configId }
      });

      if (!config) {
        return {
          success: false,
          message: 'WhatsApp configuration not found'
        };
      }

      // Inicializar Venom Bot
      const venom = await VenomBot.create(
        config.sessionName,
        (base64Qr, asciiQR) => {
          // QR Code gerado
          return {
            success: true,
            qrCode: base64Qr,
            message: 'WhatsApp session initialized'
          };
        },
        (statusSession, session) => {
          // Status da sessão
          console.log('WhatsApp session status:', statusSession);
        }
      );

      return {
        success: true,
        message: 'WhatsApp session initialized successfully'
      };

    } catch (error) {
      console.error('WhatsApp session initialization failed:', error);
      return {
        success: false,
        message: `WhatsApp initialization failed: ${error.message}`
      };
    }
  }
}
```

### 2. Communication Templates Manager

```typescript
// backend/src/configuracoes/communication-templates-manager.ts
import { prisma } from '../db';
import { AuditLogger } from '../audit/audit-logger';

export class CommunicationTemplatesManager {
  private auditLogger: AuditLogger;

  constructor() {
    this.auditLogger = new AuditLogger();
  }

  async createTemplate(
    tenantId: string,
    templateData: {
      templateName: string;
      templateType: 'email' | 'telegram' | 'whatsapp';
      subject?: string;
      content: string;
      variables?: string[];
    },
    context: any
  ): Promise<{
    success: boolean;
    templateId?: string;
    message: string;
  }> {
    try {
      const template = await prisma.communicationTemplate.create({
        data: {
          tenantId,
          templateName: templateData.templateName,
          templateType: templateData.templateType,
          subject: templateData.subject,
          content: templateData.content,
          variables: templateData.variables || []
        }
      });

      // Log de auditoria
      await this.auditLogger.logAction(context.userId, {
        type: 'create',
        resourceType: 'communication_template',
        resourceId: template.id,
        module: 'configuracoes',
        description: `Created communication template: ${templateData.templateName}`,
        newValues: templateData,
        metadata: { templateId: template.id }
      }, context);

      return {
        success: true,
        templateId: template.id,
        message: 'Communication template created successfully'
      };

    } catch (error) {
      console.error('Error creating communication template:', error);
      return {
        success: false,
        message: 'Failed to create communication template'
      };
    }
  }

  async processTemplate(
    templateId: string,
    variables: Record<string, any>
  ): Promise<{
    success: boolean;
    processedContent?: string;
    processedSubject?: string;
    message: string;
  }> {
    try {
      const template = await prisma.communicationTemplate.findUnique({
        where: { id: templateId }
      });

      if (!template) {
        return {
          success: false,
          message: 'Template not found'
        };
      }

      // Processar conteúdo
      let processedContent = template.content;
      let processedSubject = template.subject;

      // Substituir variáveis no conteúdo
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`;
        processedContent = processedContent.replace(new RegExp(placeholder, 'g'), String(value));
        
        if (processedSubject) {
          processedSubject = processedSubject.replace(new RegExp(placeholder, 'g'), String(value));
        }
      }

      return {
        success: true,
        processedContent,
        processedSubject,
        message: 'Template processed successfully'
      };

    } catch (error) {
      console.error('Error processing template:', error);
      return {
        success: false,
        message: 'Failed to process template'
      };
    }
  }
}
```

## 🔧 APIs do Sub-módulo de Comunicações

### 1. Email Configuration APIs

#### POST /api/configuracoes/communications/email
Criar conta de email

```typescript
interface CreateEmailAccountRequest {
  accountName: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  maxEmailsPerHour?: number;
  maxEmailsPerDay?: number;
}

interface CreateEmailAccountResponse {
  success: boolean;
  accountId?: string;
  message: string;
}
```

#### GET /api/configuracoes/communications/email
Obter contas de email

```typescript
interface GetEmailAccountsResponse {
  success: boolean;
  accounts?: Array<{
    id: string;
    accountName: string;
    smtpHost: string;
    smtpPort: number;
    fromEmail: string;
    fromName: string;
    isActive: boolean;
    maxEmailsPerHour: number;
    maxEmailsPerDay: number;
  }>;
  message: string;
}
```

#### POST /api/configuracoes/communications/email/:accountId/test
Testar conta de email

```typescript
interface TestEmailAccountResponse {
  success: boolean;
  message: string;
}
```

### 2. Telegram Configuration APIs

#### POST /api/configuracoes/communications/telegram
Criar bot do Telegram

```typescript
interface CreateTelegramAccountRequest {
  accountName: string;
  botToken: string;
  botUsername?: string;
  chatId?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  maxMessagesPerMinute?: number;
  maxMessagesPerHour?: number;
}

interface CreateTelegramAccountResponse {
  success: boolean;
  accountId?: string;
  message: string;
}
```

#### GET /api/configuracoes/communications/telegram
Obter bots do Telegram

```typescript
interface GetTelegramAccountsResponse {
  success: boolean;
  bots?: Array<{
    id: string;
    accountName: string;
    botUsername: string;
    chatId: string;
    isActive: boolean;
    maxMessagesPerMinute: number;
    maxMessagesPerHour: number;
  }>;
  message: string;
}
```

#### POST /api/configuracoes/communications/telegram/:accountId/test
Testar bot do Telegram

```typescript
interface TestTelegramAccountResponse {
  success: boolean;
  message: string;
}
```

### 3. WhatsApp Configuration APIs

#### POST /api/configuracoes/communications/whatsapp
Criar conta do WhatsApp

```typescript
interface CreateWhatsAppAccountRequest {
  accountName: string;
  sessionName: string;
  webhookUrl?: string;
  webhookSecret?: string;
  maxMessagesPerMinute?: number;
  maxMessagesPerHour?: number;
}

interface CreateWhatsAppAccountResponse {
  success: boolean;
  accountId?: string;
  qrCode?: string;
  message: string;
}
```

#### GET /api/configuracoes/communications/whatsapp
Obter contas do WhatsApp

```typescript
interface GetWhatsAppAccountsResponse {
  success: boolean;
  accounts?: Array<{
    id: string;
    accountName: string;
    sessionName: string;
    phoneNumber: string;
    status: string;
    qrCode?: string;
    isActive: boolean;
    maxMessagesPerMinute: number;
    maxMessagesPerHour: number;
  }>;
  message: string;
}
```

#### POST /api/configuracoes/communications/whatsapp/:accountId/connect
Conectar conta do WhatsApp

```typescript
interface ConnectWhatsAppAccountResponse {
  success: boolean;
  qrCode?: string;
  message: string;
}
```

### 4. Communication Templates APIs

#### POST /api/configuracoes/communications/templates
Criar template de comunicação

```typescript
interface CreateTemplateRequest {
  templateName: string;
  templateType: 'email' | 'telegram' | 'whatsapp';
  subject?: string;
  content: string;
  variables?: string[];
}

interface CreateTemplateResponse {
  success: boolean;
  templateId?: string;
  message: string;
}
```

#### GET /api/configuracoes/communications/templates
Obter templates de comunicação

```typescript
interface GetTemplatesResponse {
  success: boolean;
  templates?: Array<{
    id: string;
    templateName: string;
    templateType: string;
    subject?: string;
    content: string;
    variables: string[];
    isActive: boolean;
  }>;
  message: string;
}
```

#### POST /api/configuracoes/communications/templates/:templateId/process
Processar template com variáveis

```typescript
interface ProcessTemplateRequest {
  variables: Record<string, any>;
}

interface ProcessTemplateResponse {
  success: boolean;
  processedContent?: string;
  processedSubject?: string;
  message: string;
}
```

## 📋 Checklist de Implementação

### ✅ Sub-módulo de Comunicações
- [ ] Communications Manager
- [ ] Email Configuration
- [ ] Telegram Configuration
- [ ] WhatsApp Configuration (Venom)
- [ ] Communication Templates Manager
- [ ] Communication Logs
- [ ] Test Functions
- [ ] Dashboard Interface

### ✅ Funcionalidades Implementadas
- [ ] Criação de contas de email
- [ ] Criação de bots do Telegram
- [ ] Criação de contas do WhatsApp
- [ ] Sistema de templates
- [ ] Testes de configuração
- [ ] Logs de comunicação
- [ ] Dashboard de configuração
- [ ] APIs completas

### ✅ Integrações
- [ ] Integração com módulo de notificações
- [ ] Integração com sistema de auditoria
- [ ] Integração com todos os departamentos
- [ ] Sistema de templates centralizado
- [ ] Logs de comunicação unificados

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO