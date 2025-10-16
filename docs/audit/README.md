# Sistema de Auditoria Completo - BotCriptoFy2

## 🔍 Visão Geral

Sistema de auditoria robusto e imutável que registra todas as ações dos usuários administrativos, com atenção especial para traders e influencers/parceiros. Todos os dados são imutáveis, criptografados e acessíveis no perfil de cada usuário.

## 🏗️ Arquitetura do Sistema de Auditoria

### Componentes Principais
- **Audit Logger**: Logger central de auditoria
- **Audit Encryptor**: Criptografador de dados sensíveis
- **Audit Validator**: Validador de integridade dos logs
- **Audit Retriever**: Recuperador de logs de auditoria
- **Audit Analyzer**: Analisador de padrões de auditoria
- **Audit Notifier**: Notificador de eventos críticos

### Estratégia de Auditoria
- **Imutabilidade**: Logs nunca podem ser alterados ou deletados
- **Criptografia**: Dados sensíveis criptografados
- **Integridade**: Hash de verificação para cada log
- **Rastreabilidade**: Rastreamento completo de ações
- **Acessibilidade**: Acesso via perfil do usuário

## 📊 Estrutura de Dados

### Tabelas do Banco de Dados

#### 1. audit_logs
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  tenant_id UUID REFERENCES tenants(id),
  session_id VARCHAR(255),
  action_type VARCHAR(100) NOT NULL, -- login, logout, create, update, delete, view, export, etc.
  resource_type VARCHAR(100) NOT NULL, -- user, transaction, affiliate, tree, etc.
  resource_id VARCHAR(255),
  module VARCHAR(50) NOT NULL, -- financeiro, marketing, vendas, seguranca, etc.
  description TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  location JSONB, -- {country, region, city, coordinates}
  device_info JSONB, -- {type, os, browser, version}
  risk_level VARCHAR(20) DEFAULT 'low', -- low, medium, high, critical
  is_sensitive BOOLEAN DEFAULT false,
  encrypted_data TEXT, -- Dados sensíveis criptografados
  data_hash VARCHAR(64) NOT NULL, -- SHA-256 hash para integridade
  created_at TIMESTAMP DEFAULT NOW(),
  created_at_tz TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. audit_sessions
```sql
CREATE TABLE audit_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  session_id VARCHAR(255) UNIQUE NOT NULL,
  ip_address INET NOT NULL,
  user_agent TEXT,
  location JSONB,
  device_info JSONB,
  login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  logout_at TIMESTAMP WITH TIME ZONE,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  risk_score INTEGER DEFAULT 0, -- 0-100
  flags JSONB DEFAULT '{}', -- {suspicious_activity, multiple_ips, etc.}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3. audit_events
```sql
CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL, -- security_breach, data_export, admin_action, etc.
  severity VARCHAR(20) NOT NULL, -- info, warning, error, critical
  user_id UUID REFERENCES users(id),
  tenant_id UUID REFERENCES tenants(id),
  module VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 4. audit_retention
```sql
CREATE TABLE audit_retention (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module VARCHAR(50) NOT NULL,
  user_type VARCHAR(20) NOT NULL, -- admin, trader, influencer, partner
  retention_days INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 5. audit_exports
```sql
CREATE TABLE audit_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  export_type VARCHAR(50) NOT NULL, -- personal, module, full
  filters JSONB DEFAULT '{}',
  file_path VARCHAR(500),
  file_size BIGINT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  expires_at TIMESTAMP WITH TIME ZONE,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 6. audit_alerts
```sql
CREATE TABLE audit_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(50) NOT NULL, -- suspicious_activity, data_breach, unauthorized_access
  user_id UUID REFERENCES users(id),
  tenant_id UUID REFERENCES tenants(id),
  severity VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔧 Implementação do Sistema

### 1. Audit Logger

```typescript
// backend/src/audit/audit-logger.ts
import { prisma } from '../db';
import { createHash, createCipher, createDecipher } from 'crypto';
import { AuditEncryptor } from './audit-encryptor';
import { AuditValidator } from './audit-validator';

export class AuditLogger {
  private encryptor: AuditEncryptor;
  private validator: AuditValidator;

  constructor() {
    this.encryptor = new AuditEncryptor();
    this.validator = new AuditValidator();
  }

  async logAction(
    userId: string,
    action: {
      type: string;
      resourceType: string;
      resourceId?: string;
      module: string;
      description: string;
      oldValues?: any;
      newValues?: any;
      metadata?: any;
    },
    context: {
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
      location?: any;
      deviceInfo?: any;
    }
  ): Promise<{
    success: boolean;
    logId?: string;
    message: string;
  }> {
    try {
      // Validar dados de entrada
      const validation = await this.validator.validateAuditData(userId, action);
      if (!validation.isValid) {
        return {
          success: false,
          message: `Validation failed: ${validation.errors.join(', ')}`
        };
      }

      // Determinar nível de risco
      const riskLevel = await this.calculateRiskLevel(userId, action, context);

      // Determinar se dados são sensíveis
      const isSensitive = this.isSensitiveData(action);

      // Criptografar dados sensíveis se necessário
      let encryptedData: string | null = null;
      let oldValues = action.oldValues;
      let newValues = action.newValues;

      if (isSensitive) {
        const sensitiveData = {
          oldValues: action.oldValues,
          newValues: action.newValues,
          metadata: action.metadata
        };

        encryptedData = await this.encryptor.encrypt(JSON.stringify(sensitiveData));
        
        // Limpar dados sensíveis dos campos normais
        oldValues = this.sanitizeSensitiveData(action.oldValues);
        newValues = this.sanitizeSensitiveData(action.newValues);
      }

      // Criar hash de integridade
      const dataToHash = {
        userId,
        actionType: action.type,
        resourceType: action.resourceType,
        resourceId: action.resourceId,
        module: action.module,
        description: action.description,
        oldValues,
        newValues,
        metadata: action.metadata,
        timestamp: new Date().toISOString()
      };

      const dataHash = createHash('sha256')
        .update(JSON.stringify(dataToHash))
        .digest('hex');

      // Criar log de auditoria
      const auditLog = await prisma.auditLog.create({
        data: {
          userId,
          tenantId: await this.getUserTenant(userId),
          sessionId: context.sessionId,
          actionType: action.type,
          resourceType: action.resourceType,
          resourceId: action.resourceId,
          module: action.module,
          description: action.description,
          oldValues,
          newValues,
          metadata: action.metadata || {},
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          location: context.location,
          deviceInfo: context.deviceInfo,
          riskLevel,
          isSensitive,
          encryptedData,
          dataHash
        }
      });

      // Verificar se precisa criar alerta
      if (riskLevel === 'high' || riskLevel === 'critical') {
        await this.createSecurityAlert(userId, action, context, riskLevel);
      }

      // Atualizar sessão de auditoria
      if (context.sessionId) {
        await this.updateAuditSession(context.sessionId, userId);
      }

      return {
        success: true,
        logId: auditLog.id,
        message: 'Audit log created successfully'
      };

    } catch (error) {
      console.error('Error creating audit log:', error);
      return {
        success: false,
        message: 'Failed to create audit log'
      };
    }
  }

  private async calculateRiskLevel(
    userId: string,
    action: any,
    context: any
  ): Promise<'low' | 'medium' | 'high' | 'critical'> {
    let riskScore = 0;

    // Verificar tipo de ação
    const highRiskActions = ['delete', 'export', 'admin_action', 'security_change'];
    if (highRiskActions.includes(action.type)) {
      riskScore += 30;
    }

    // Verificar tipo de usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        affiliateUser: true
      }
    });

    if (user?.affiliateUser?.userType === 'trader') {
      riskScore += 20; // Traders têm maior risco
    } else if (user?.affiliateUser?.userType === 'influencer' || user?.affiliateUser?.userType === 'partner') {
      riskScore += 15; // Influencers/Parceiros têm risco médio
    }

    // Verificar dados sensíveis
    if (this.isSensitiveData(action)) {
      riskScore += 25;
    }

    // Verificar localização suspeita
    if (context.location?.country && !this.isExpectedLocation(userId, context.location)) {
      riskScore += 20;
    }

    // Verificar múltiplos IPs na mesma sessão
    const sessionIPs = await this.getSessionIPs(context.sessionId);
    if (sessionIPs.length > 3) {
      riskScore += 15;
    }

    // Determinar nível de risco
    if (riskScore >= 70) return 'critical';
    if (riskScore >= 50) return 'high';
    if (riskScore >= 30) return 'medium';
    return 'low';
  }

  private isSensitiveData(action: any): boolean {
    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'credit_card',
      'ssn', 'cpf', 'rg', 'bank_account', 'private_key'
    ];

    const dataString = JSON.stringify(action);
    return sensitiveFields.some(field => 
      dataString.toLowerCase().includes(field.toLowerCase())
    );
  }

  private sanitizeSensitiveData(data: any): any {
    if (!data) return data;

    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'credit_card',
      'ssn', 'cpf', 'rg', 'bank_account', 'private_key'
    ];

    const sanitize = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;

      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }

      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (sensitiveFields.some(field => 
          key.toLowerCase().includes(field.toLowerCase())
        )) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = sanitize(value);
        }
      }
      return sanitized;
    };

    return sanitize(data);
  }

  private async createSecurityAlert(
    userId: string,
    action: any,
    context: any,
    riskLevel: string
  ) {
    await prisma.auditAlert.create({
      data: {
        alertType: 'suspicious_activity',
        userId,
        tenantId: await this.getUserTenant(userId),
        severity: riskLevel,
        title: `High Risk Action: ${action.type}`,
        description: `User performed high-risk action: ${action.description}`,
        data: {
          action,
          context,
          riskLevel
        }
      }
    });
  }

  private async updateAuditSession(sessionId: string, userId: string) {
    await prisma.auditSession.upsert({
      where: { sessionId },
      update: {
        lastActivity: new Date(),
        userId
      },
      create: {
        sessionId,
        userId,
        ipAddress: '0.0.0.0', // Será atualizado pelo contexto
        isActive: true
      }
    });
  }

  private async getUserTenant(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        affiliateUser: true
      }
    });

    return user?.affiliateUser?.tenantId || null;
  }

  private isExpectedLocation(userId: string, location: any): boolean {
    // Implementar lógica para verificar se localização é esperada
    // Baseado no histórico do usuário
    return true; // Placeholder
  }

  private async getSessionIPs(sessionId: string): Promise<string[]> {
    const session = await prisma.auditSession.findUnique({
      where: { sessionId }
    });

    return session ? [session.ipAddress] : [];
  }
}
```

### 2. Audit Encryptor

```typescript
// backend/src/audit/audit-encryptor.ts
import { createCipher, createDecipher, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export class AuditEncryptor {
  private algorithm = 'aes-256-gcm';
  private keyLength = 32;
  private ivLength = 16;
  private tagLength = 16;

  async encrypt(data: string): Promise<string> {
    try {
      // Gerar chave de criptografia
      const password = process.env.AUDIT_ENCRYPTION_KEY || 'default-key';
      const salt = randomBytes(16);
      const key = await scryptAsync(password, salt, this.keyLength) as Buffer;

      // Gerar IV
      const iv = randomBytes(this.ivLength);

      // Criar cipher
      const cipher = createCipher(this.algorithm, key);
      cipher.setAAD(salt);

      // Criptografar dados
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Obter tag de autenticação
      const tag = cipher.getAuthTag();

      // Combinar salt, iv, tag e dados criptografados
      const combined = Buffer.concat([
        salt,
        iv,
        tag,
        Buffer.from(encrypted, 'hex')
      ]);

      return combined.toString('base64');

    } catch (error) {
      console.error('Error encrypting audit data:', error);
      throw new Error('Failed to encrypt audit data');
    }
  }

  async decrypt(encryptedData: string): Promise<string> {
    try {
      // Decodificar dados
      const combined = Buffer.from(encryptedData, 'base64');

      // Extrair componentes
      const salt = combined.subarray(0, 16);
      const iv = combined.subarray(16, 32);
      const tag = combined.subarray(32, 48);
      const encrypted = combined.subarray(48);

      // Gerar chave
      const password = process.env.AUDIT_ENCRYPTION_KEY || 'default-key';
      const key = await scryptAsync(password, salt, this.keyLength) as Buffer;

      // Criar decipher
      const decipher = createDecipher(this.algorithm, key);
      decipher.setAAD(salt);
      decipher.setAuthTag(tag);

      // Descriptografar dados
      let decrypted = decipher.update(encrypted, null, 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;

    } catch (error) {
      console.error('Error decrypting audit data:', error);
      throw new Error('Failed to decrypt audit data');
    }
  }

  async verifyIntegrity(data: string, hash: string): Promise<boolean> {
    const crypto = require('crypto');
    const calculatedHash = crypto.createHash('sha256').update(data).digest('hex');
    return calculatedHash === hash;
  }
}
```

### 3. Audit Validator

```typescript
// backend/src/audit/audit-validator.ts
export class AuditValidator {
  async validateAuditData(
    userId: string,
    action: any
  ): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    // Validar usuário
    if (!userId) {
      errors.push('User ID is required');
    }

    // Validar ação
    if (!action.type) {
      errors.push('Action type is required');
    }

    if (!action.resourceType) {
      errors.push('Resource type is required');
    }

    if (!action.module) {
      errors.push('Module is required');
    }

    if (!action.description) {
      errors.push('Description is required');
    }

    // Validar tipos de ação permitidos
    const allowedActionTypes = [
      'login', 'logout', 'create', 'update', 'delete', 'view',
      'export', 'import', 'admin_action', 'security_change',
      'data_access', 'configuration_change'
    ];

    if (!allowedActionTypes.includes(action.type)) {
      errors.push(`Invalid action type: ${action.type}`);
    }

    // Validar módulos permitidos
    const allowedModules = [
      'financeiro', 'marketing', 'vendas', 'seguranca', 'sac',
      'auditoria', 'documentos', 'configuracoes', 'assinaturas',
      'ceo', 'affiliate', 'mmn', 'notificacoes'
    ];

    if (!allowedModules.includes(action.module)) {
      errors.push(`Invalid module: ${action.module}`);
    }

    // Validar tamanho dos dados
    const dataSize = JSON.stringify(action).length;
    if (dataSize > 1000000) { // 1MB
      errors.push('Action data too large');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async validateUserAccess(
    userId: string,
    resourceType: string,
    action: string
  ): Promise<boolean> {
    // Implementar lógica de validação de acesso
    // Baseada em roles e permissões do usuário
    return true; // Placeholder
  }
}
```

### 4. Audit Retriever

```typescript
// backend/src/audit/audit-retriever.ts
import { prisma } from '../db';
import { AuditEncryptor } from './audit-encryptor';

export class AuditRetriever {
  private encryptor: AuditEncryptor;

  constructor() {
    this.encryptor = new AuditEncryptor();
  }

  async getUserAuditLogs(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      module?: string;
      actionType?: string;
      startDate?: Date;
      endDate?: Date;
      riskLevel?: string;
    } = {}
  ): Promise<{
    logs: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { userId };

    if (options.module) {
      where.module = options.module;
    }

    if (options.actionType) {
      where.actionType = options.actionType;
    }

    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt.gte = options.startDate;
      }
      if (options.endDate) {
        where.createdAt.lte = options.endDate;
      }
    }

    if (options.riskLevel) {
      where.riskLevel = options.riskLevel;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.auditLog.count({ where })
    ]);

    // Descriptografar dados sensíveis se necessário
    const processedLogs = await Promise.all(
      logs.map(async (log) => {
        if (log.isSensitive && log.encryptedData) {
          try {
            const decryptedData = await this.encryptor.decrypt(log.encryptedData);
            const sensitiveData = JSON.parse(decryptedData);
            
            return {
              ...log,
              oldValues: sensitiveData.oldValues,
              newValues: sensitiveData.newValues,
              metadata: sensitiveData.metadata
            };
          } catch (error) {
            console.error('Error decrypting audit log:', error);
            return log;
          }
        }
        return log;
      })
    );

    return {
      logs: processedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getAuditSummary(
    userId: string,
    period: 'day' | 'week' | 'month' | 'year' = 'month'
  ): Promise<{
    totalActions: number;
    actionsByType: Record<string, number>;
    actionsByModule: Record<string, number>;
    riskDistribution: Record<string, number>;
    topActions: Array<{
      action: string;
      count: number;
    }>;
    suspiciousActivity: number;
  }> {
    const startDate = this.getStartDate(period);
    const endDate = new Date();

    const logs = await prisma.auditLog.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const totalActions = logs.length;

    const actionsByType = logs.reduce((acc, log) => {
      acc[log.actionType] = (acc[log.actionType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const actionsByModule = logs.reduce((acc, log) => {
      acc[log.module] = (acc[log.module] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const riskDistribution = logs.reduce((acc, log) => {
      acc[log.riskLevel] = (acc[log.riskLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topActions = Object.entries(actionsByType)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([action, count]) => ({ action, count }));

    const suspiciousActivity = logs.filter(log => 
      log.riskLevel === 'high' || log.riskLevel === 'critical'
    ).length;

    return {
      totalActions,
      actionsByType,
      actionsByModule,
      riskDistribution,
      topActions,
      suspiciousActivity
    };
  }

  async exportUserAuditLogs(
    userId: string,
    filters: any
  ): Promise<{
    success: boolean;
    exportId?: string;
    message: string;
  }> {
    try {
      // Criar registro de exportação
      const exportRecord = await prisma.auditExport.create({
        data: {
          userId,
          exportType: 'personal',
          filters,
          status: 'pending',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias
        }
      });

      // Processar exportação em background
      this.processExport(exportRecord.id, userId, filters);

      return {
        success: true,
        exportId: exportRecord.id,
        message: 'Export started successfully'
      };

    } catch (error) {
      console.error('Error creating audit export:', error);
      return {
        success: false,
        message: 'Failed to create audit export'
      };
    }
  }

  private async processExport(exportId: string, userId: string, filters: any) {
    try {
      // Buscar logs
      const logs = await this.getUserAuditLogs(userId, filters);
      
      // Gerar arquivo CSV/JSON
      const exportData = this.formatExportData(logs.logs);
      const filePath = await this.saveExportFile(exportId, exportData);
      
      // Atualizar registro de exportação
      await prisma.auditExport.update({
        where: { id: exportId },
        data: {
          status: 'completed',
          filePath,
          fileSize: Buffer.byteLength(exportData)
        }
      });

    } catch (error) {
      console.error('Error processing export:', error);
      await prisma.auditExport.update({
        where: { id: exportId },
        data: { status: 'failed' }
      });
    }
  }

  private getStartDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'year':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  private formatExportData(logs: any[]): string {
    // Formatar dados para exportação (CSV ou JSON)
    return JSON.stringify(logs, null, 2);
  }

  private async saveExportFile(exportId: string, data: string): Promise<string> {
    // Salvar arquivo de exportação
    const fileName = `audit_export_${exportId}.json`;
    const filePath = `./exports/${fileName}`;
    
    // Implementar salvamento do arquivo
    return filePath;
  }
}
```

## 🔧 APIs do Sistema de Auditoria

### 1. Audit Logging APIs

#### POST /api/audit/log
Criar log de auditoria

```typescript
interface CreateAuditLogRequest {
  action: {
    type: string;
    resourceType: string;
    resourceId?: string;
    module: string;
    description: string;
    oldValues?: any;
    newValues?: any;
    metadata?: any;
  };
  context: {
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    location?: any;
    deviceInfo?: any;
  };
}

interface CreateAuditLogResponse {
  success: boolean;
  logId?: string;
  message: string;
}
```

#### GET /api/audit/logs
Listar logs de auditoria do usuário

```typescript
interface GetAuditLogsRequest {
  page?: number;
  limit?: number;
  module?: string;
  actionType?: string;
  startDate?: string;
  endDate?: string;
  riskLevel?: string;
}

interface GetAuditLogsResponse {
  logs: {
    id: string;
    actionType: string;
    resourceType: string;
    resourceId?: string;
    module: string;
    description: string;
    oldValues?: any;
    newValues?: any;
    metadata: any;
    ipAddress?: string;
    userAgent?: string;
    location?: any;
    deviceInfo?: any;
    riskLevel: string;
    isSensitive: boolean;
    createdAt: string;
  }[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### 2. Audit Summary APIs

#### GET /api/audit/summary
Obter resumo de auditoria do usuário

```typescript
interface AuditSummaryResponse {
  totalActions: number;
  actionsByType: Record<string, number>;
  actionsByModule: Record<string, number>;
  riskDistribution: Record<string, number>;
  topActions: Array<{
    action: string;
    count: number;
  }>;
  suspiciousActivity: number;
}
```

#### GET /api/audit/sessions
Obter sessões de auditoria do usuário

```typescript
interface AuditSessionsResponse {
  sessions: {
    id: string;
    sessionId: string;
    ipAddress: string;
    userAgent?: string;
    location?: any;
    deviceInfo?: any;
    loginAt: string;
    logoutAt?: string;
    lastActivity: string;
    isActive: boolean;
    riskScore: number;
    flags: any;
  }[];
}
```

### 3. Audit Export APIs

#### POST /api/audit/export
Exportar logs de auditoria

```typescript
interface ExportAuditLogsRequest {
  filters: {
    module?: string;
    actionType?: string;
    startDate?: string;
    endDate?: string;
    riskLevel?: string;
  };
  format?: 'json' | 'csv';
}

interface ExportAuditLogsResponse {
  success: boolean;
  exportId?: string;
  message: string;
}
```

#### GET /api/audit/exports
Listar exportações do usuário

```typescript
interface AuditExportsResponse {
  exports: {
    id: string;
    exportType: string;
    filters: any;
    filePath?: string;
    fileSize?: number;
    status: string;
    expiresAt?: string;
    downloadCount: number;
    createdAt: string;
  }[];
}
```

## 🧪 Testes do Sistema de Auditoria

### Testes Unitários

```typescript
// tests/unit/audit/audit-logger.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { AuditLogger } from '../../src/audit/audit-logger';
import { prisma } from '../setup';

describe('AuditLogger', () => {
  let auditLogger: AuditLogger;

  beforeEach(() => {
    auditLogger = new AuditLogger();
  });

  describe('logAction', () => {
    it('should create audit log for user action', async () => {
      // Criar usuário
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      const action = {
        type: 'create',
        resourceType: 'user',
        resourceId: 'user_123',
        module: 'financeiro',
        description: 'Created new user',
        newValues: { name: 'New User', email: 'new@example.com' }
      };

      const context = {
        sessionId: 'session_123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        location: { country: 'BR', city: 'São Paulo' }
      };

      const result = await auditLogger.logAction(user.id, action, context);

      expect(result.success).toBe(true);
      expect(result.logId).toBeDefined();

      // Verificar se log foi criado
      const log = await prisma.auditLog.findUnique({
        where: { id: result.logId! }
      });

      expect(log).toBeDefined();
      expect(log?.userId).toBe(user.id);
      expect(log?.actionType).toBe('create');
      expect(log?.module).toBe('financeiro');
    });

    it('should encrypt sensitive data', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      const action = {
        type: 'update',
        resourceType: 'user',
        module: 'financeiro',
        description: 'Updated user password',
        newValues: { password: 'secret123' }
      };

      const result = await auditLogger.logAction(user.id, action, {});

      expect(result.success).toBe(true);

      const log = await prisma.auditLog.findUnique({
        where: { id: result.logId! }
      });

      expect(log?.isSensitive).toBe(true);
      expect(log?.encryptedData).toBeDefined();
      expect(log?.newValues).toEqual({ password: '[REDACTED]' });
    });

    it('should calculate risk level correctly', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      // Criar afiliado trader (maior risco)
      await prisma.affiliateUser.create({
        data: {
          userId: user.id,
          tenantId: 'main-tenant',
          affiliateCode: 'TRADER001',
          userType: 'trader',
          inviteLimit: 5,
          isActive: true
        }
      });

      const action = {
        type: 'delete',
        resourceType: 'transaction',
        module: 'financeiro',
        description: 'Deleted financial transaction'
      };

      const result = await auditLogger.logAction(user.id, action, {});

      expect(result.success).toBe(true);

      const log = await prisma.auditLog.findUnique({
        where: { id: result.logId! }
      });

      expect(['high', 'critical']).toContain(log?.riskLevel);
    });
  });
});
```

## 📋 Checklist de Implementação

### ✅ Configuração Inicial
- [ ] Criar tabelas de auditoria
- [ ] Configurar criptografia
- [ ] Configurar validações
- [ ] Configurar retenção de dados

### ✅ Funcionalidades
- [ ] Logger de auditoria
- [ ] Criptografia de dados sensíveis
- [ ] Validação de integridade
- [ ] Recuperação de logs

### ✅ APIs
- [ ] APIs de logging
- [ ] APIs de consulta
- [ ] APIs de exportação
- [ ] APIs de resumo

### ✅ Testes
- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Testes de criptografia
- [ ] Testes de performance

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO