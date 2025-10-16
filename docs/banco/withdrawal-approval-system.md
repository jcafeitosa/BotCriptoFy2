# Sistema de Aprovação de Saques - BotCriptoFy2

## 🚀 Visão Geral

Sistema de aprovação de saques com dupla autorização para valores acima de $500, garantindo controle total sobre movimentações financeiras de alto valor na plataforma.

## 🏗️ Arquitetura do Sistema

### Componentes Principais
- **Withdrawal Request Manager**: Gerenciador de solicitações de saque
- **Approval Workflow Engine**: Motor de fluxo de aprovação
- **Manager Approval System**: Sistema de aprovação do gerente
- **CEO Approval System**: Sistema de aprovação do CEO
- **Notification System**: Sistema de notificações para aprovações
- **Audit Trail**: Rastreamento completo de aprovações
- **Security Validator**: Validador de segurança e limites
- **Approval Rules Engine**: Motor de regras de aprovação configuráveis
- **Configuration Manager**: Gerenciador de configurações de limites
- **Exception Handler**: Gerenciador de exceções e regras especiais

### Estratégia de Funcionamento
- **Valor Limite Configurável**: Limite personalizável por tenant/usuário
- **Regras Flexíveis**: Múltiplas regras de aprovação configuráveis
- **Fluxo Duplo**: Gerente → CEO → Execução (configurável)
- **Notificações Automáticas**: Alertas em tempo real
- **Auditoria Completa**: Log de todas as aprovações
- **Validação de Segurança**: Verificações de identidade e limites
- **Timeouts Configuráveis**: Prazos personalizáveis para aprovação
- **Exceções**: Usuários/roles com limites especiais

## 📊 Estrutura de Dados

### Tabelas do Sistema

#### 1. withdrawal_requests
```sql
CREATE TABLE withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  wallet_id UUID NOT NULL REFERENCES wallets(id),
  asset_id UUID NOT NULL REFERENCES assets(id),
  amount DECIMAL(20,8) NOT NULL,
  amount_usd DECIMAL(20,2) NOT NULL,
  destination_address VARCHAR(255) NOT NULL,
  destination_type VARCHAR(20) NOT NULL, -- external_wallet, bank_account, exchange
  withdrawal_type VARCHAR(20) NOT NULL, -- crypto, fiat, internal
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, manager_approved, ceo_approved, completed, rejected, cancelled
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  approval_level INTEGER DEFAULT 0, -- 0: none, 1: manager, 2: ceo
  current_approval_level INTEGER DEFAULT 0,
  priority VARCHAR(10) DEFAULT 'normal', -- low, normal, high, urgent
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. withdrawal_approvals
```sql
CREATE TABLE withdrawal_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_request_id UUID NOT NULL REFERENCES withdrawal_requests(id),
  approver_id UUID NOT NULL REFERENCES users(id),
  approver_type VARCHAR(20) NOT NULL, -- manager, ceo
  approval_level INTEGER NOT NULL, -- 1: manager, 2: ceo
  status VARCHAR(20) NOT NULL, -- approved, rejected, pending
  comments TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3. withdrawal_approval_rules
```sql
CREATE TABLE withdrawal_approval_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  rule_name VARCHAR(100) NOT NULL,
  description TEXT,
  min_amount_usd DECIMAL(20,2) NOT NULL,
  max_amount_usd DECIMAL(20,2),
  approval_levels INTEGER NOT NULL, -- 1: manager only, 2: manager + ceo
  manager_role_id UUID REFERENCES roles(id),
  ceo_role_id UUID REFERENCES roles(id),
  timeout_hours INTEGER DEFAULT 24, -- Timeout para aprovação
  auto_approve_after_hours INTEGER, -- Auto-aprovar após X horas
  priority INTEGER DEFAULT 0, -- Prioridade da regra (maior = mais específica)
  applies_to_user_id UUID REFERENCES users(id), -- Regra específica para usuário
  applies_to_role_id UUID REFERENCES roles(id), -- Regra específica para role
  applies_to_asset_id UUID REFERENCES assets(id), -- Regra específica para ativo
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 4. withdrawal_approval_config
```sql
CREATE TABLE withdrawal_approval_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  config_key VARCHAR(100) NOT NULL,
  config_value TEXT NOT NULL,
  config_type VARCHAR(20) NOT NULL, -- string, number, boolean, json
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, config_key)
);
```

#### 5. withdrawal_approval_exceptions
```sql
CREATE TABLE withdrawal_approval_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID REFERENCES users(id),
  role_id UUID REFERENCES roles(id),
  asset_id UUID REFERENCES assets(id),
  exception_type VARCHAR(50) NOT NULL, -- no_approval, single_approval, custom_rule
  min_amount_usd DECIMAL(20,2),
  max_amount_usd DECIMAL(20,2),
  approval_levels INTEGER,
  custom_rule_id UUID REFERENCES withdrawal_approval_rules(id),
  reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 6. withdrawal_approval_history
```sql
CREATE TABLE withdrawal_approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_request_id UUID NOT NULL REFERENCES withdrawal_requests(id),
  action VARCHAR(50) NOT NULL, -- created, manager_approved, ceo_approved, completed, rejected, cancelled
  actor_id UUID NOT NULL REFERENCES users(id),
  actor_type VARCHAR(20) NOT NULL, -- user, manager, ceo, system
  previous_status VARCHAR(20),
  new_status VARCHAR(20),
  comments TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 7. withdrawal_limits
```sql
CREATE TABLE withdrawal_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  tenant_id UUID REFERENCES tenants(id),
  asset_id UUID REFERENCES assets(id),
  daily_limit DECIMAL(20,8) DEFAULT 0,
  weekly_limit DECIMAL(20,8) DEFAULT 0,
  monthly_limit DECIMAL(20,8) DEFAULT 0,
  current_daily_usage DECIMAL(20,8) DEFAULT 0,
  current_weekly_usage DECIMAL(20,8) DEFAULT 0,
  current_monthly_usage DECIMAL(20,8) DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 8. withdrawal_notifications
```sql
CREATE TABLE withdrawal_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_request_id UUID NOT NULL REFERENCES withdrawal_requests(id),
  recipient_id UUID NOT NULL REFERENCES users(id),
  notification_type VARCHAR(50) NOT NULL, -- request_created, manager_approval_needed, ceo_approval_needed, approved, rejected, completed
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔧 Implementação do Sistema

### 1. Configuration Manager

```typescript
// backend/src/banco/approval-configuration-manager.ts
import { prisma } from '../db';
import { AuditLogger } from '../audit/audit-logger';

export class ApprovalConfigurationManager {
  private auditLogger: AuditLogger;

  constructor() {
    this.auditLogger = new AuditLogger();
  }

  async getConfiguration(
    tenantId: string,
    configKey?: string
  ): Promise<{
    success: boolean;
    config?: any;
    message: string;
  }> {
    try {
      const whereClause: any = {
        tenantId,
        isActive: true
      };

      if (configKey) {
        whereClause.configKey = configKey;
      }

      const configs = await prisma.withdrawalApprovalConfig.findMany({
        where: whereClause
      });

      const configMap = configs.reduce((acc, config) => {
        acc[config.configKey] = this.parseConfigValue(config.configValue, config.configType);
        return acc;
      }, {});

      return {
        success: true,
        config: configKey ? configMap[configKey] : configMap,
        message: 'Configuration retrieved successfully'
      };

    } catch (error) {
      console.error('Error getting configuration:', error);
      return {
        success: false,
        message: 'Failed to get configuration'
      };
    }
  }

  async setConfiguration(
    tenantId: string,
    configKey: string,
    configValue: any,
    configType: 'string' | 'number' | 'boolean' | 'json',
    description?: string,
    context?: any
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const serializedValue = this.serializeConfigValue(configValue, configType);

      await prisma.withdrawalApprovalConfig.upsert({
        where: {
          tenantId_configKey: {
            tenantId,
            configKey
          }
        },
        update: {
          configValue: serializedValue,
          configType,
          description,
          updatedAt: new Date()
        },
        create: {
          tenantId,
          configKey,
          configValue: serializedValue,
          configType,
          description
        }
      });

      // Log de auditoria
      if (context) {
        await this.auditLogger.logAction(context.userId, {
          type: 'update',
          resourceType: 'approval_config',
          resourceId: configKey,
          module: 'banco',
          description: `Updated approval configuration: ${configKey}`,
          newValues: {
            configKey,
            configValue,
            configType
          },
          metadata: { tenantId }
        }, context);
      }

      return {
        success: true,
        message: 'Configuration updated successfully'
      };

    } catch (error) {
      console.error('Error setting configuration:', error);
      return {
        success: false,
        message: 'Failed to set configuration'
      };
    }
  }

  async createApprovalRule(
    tenantId: string,
    ruleData: {
      ruleName: string;
      description?: string;
      minAmountUsd: number;
      maxAmountUsd?: number;
      approvalLevels: number;
      managerRoleId?: string;
      ceoRoleId?: string;
      timeoutHours?: number;
      autoApproveAfterHours?: number;
      priority?: number;
      appliesToUserId?: string;
      appliesToRoleId?: string;
      appliesToAssetId?: string;
    },
    context?: any
  ): Promise<{
    success: boolean;
    ruleId?: string;
    message: string;
  }> {
    try {
      const rule = await prisma.withdrawalApprovalRule.create({
        data: {
          tenantId,
          ruleName: ruleData.ruleName,
          description: ruleData.description,
          minAmountUsd: ruleData.minAmountUsd,
          maxAmountUsd: ruleData.maxAmountUsd,
          approvalLevels: ruleData.approvalLevels,
          managerRoleId: ruleData.managerRoleId,
          ceoRoleId: ruleData.ceoRoleId,
          timeoutHours: ruleData.timeoutHours || 24,
          autoApproveAfterHours: ruleData.autoApproveAfterHours,
          priority: ruleData.priority || 0,
          appliesToUserId: ruleData.appliesToUserId,
          appliesToRoleId: ruleData.appliesToRoleId,
          appliesToAssetId: ruleData.appliesToAssetId
        }
      });

      // Log de auditoria
      if (context) {
        await this.auditLogger.logAction(context.userId, {
          type: 'create',
          resourceType: 'approval_rule',
          resourceId: rule.id,
          module: 'banco',
          description: `Created approval rule: ${ruleData.ruleName}`,
          newValues: ruleData,
          metadata: { tenantId, ruleId: rule.id }
        }, context);
      }

      return {
        success: true,
        ruleId: rule.id,
        message: 'Approval rule created successfully'
      };

    } catch (error) {
      console.error('Error creating approval rule:', error);
      return {
        success: false,
        message: 'Failed to create approval rule'
      };
    }
  }

  async updateApprovalRule(
    ruleId: string,
    ruleData: Partial<{
      ruleName: string;
      description: string;
      minAmountUsd: number;
      maxAmountUsd: number;
      approvalLevels: number;
      managerRoleId: string;
      ceoRoleId: string;
      timeoutHours: number;
      autoApproveAfterHours: number;
      priority: number;
      isActive: boolean;
    }>,
    context?: any
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const existingRule = await prisma.withdrawalApprovalRule.findUnique({
        where: { id: ruleId }
      });

      if (!existingRule) {
        return {
          success: false,
          message: 'Approval rule not found'
        };
      }

      await prisma.withdrawalApprovalRule.update({
        where: { id: ruleId },
        data: {
          ...ruleData,
          updatedAt: new Date()
        }
      });

      // Log de auditoria
      if (context) {
        await this.auditLogger.logAction(context.userId, {
          type: 'update',
          resourceType: 'approval_rule',
          resourceId: ruleId,
          module: 'banco',
          description: `Updated approval rule: ${existingRule.ruleName}`,
          oldValues: existingRule,
          newValues: ruleData,
          metadata: { ruleId }
        }, context);
      }

      return {
        success: true,
        message: 'Approval rule updated successfully'
      };

    } catch (error) {
      console.error('Error updating approval rule:', error);
      return {
        success: false,
        message: 'Failed to update approval rule'
      };
    }
  }

  async deleteApprovalRule(
    ruleId: string,
    context?: any
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const existingRule = await prisma.withdrawalApprovalRule.findUnique({
        where: { id: ruleId }
      });

      if (!existingRule) {
        return {
          success: false,
          message: 'Approval rule not found'
        };
      }

      await prisma.withdrawalApprovalRule.update({
        where: { id: ruleId },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });

      // Log de auditoria
      if (context) {
        await this.auditLogger.logAction(context.userId, {
          type: 'delete',
          resourceType: 'approval_rule',
          resourceId: ruleId,
          module: 'banco',
          description: `Deleted approval rule: ${existingRule.ruleName}`,
          oldValues: existingRule,
          metadata: { ruleId }
        }, context);
      }

      return {
        success: true,
        message: 'Approval rule deleted successfully'
      };

    } catch (error) {
      console.error('Error deleting approval rule:', error);
      return {
        success: false,
        message: 'Failed to delete approval rule'
      };
    }
  }

  async getApprovalRules(
    tenantId: string,
    filters: {
      isActive?: boolean;
      appliesToUserId?: string;
      appliesToRoleId?: string;
      appliesToAssetId?: string;
    } = {}
  ): Promise<{
    success: boolean;
    rules?: any[];
    message: string;
  }> {
    try {
      const rules = await prisma.withdrawalApprovalRule.findMany({
        where: {
          tenantId,
          ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
          ...(filters.appliesToUserId ? { appliesToUserId: filters.appliesToUserId } : {}),
          ...(filters.appliesToRoleId ? { appliesToRoleId: filters.appliesToRoleId } : {}),
          ...(filters.appliesToAssetId ? { appliesToAssetId: filters.appliesToAssetId } : {})
        },
        include: {
          managerRole: true,
          ceoRole: true,
          appliesToUser: true,
          appliesToRole: true,
          appliesToAsset: true
        },
        orderBy: [
          { priority: 'desc' },
          { minAmountUsd: 'asc' }
        ]
      });

      return {
        success: true,
        rules: rules.map(rule => ({
          id: rule.id,
          ruleName: rule.ruleName,
          description: rule.description,
          minAmountUsd: rule.minAmountUsd,
          maxAmountUsd: rule.maxAmountUsd,
          approvalLevels: rule.approvalLevels,
          managerRole: rule.managerRole,
          ceoRole: rule.ceoRole,
          timeoutHours: rule.timeoutHours,
          autoApproveAfterHours: rule.autoApproveAfterHours,
          priority: rule.priority,
          appliesToUser: rule.appliesToUser,
          appliesToRole: rule.appliesToRole,
          appliesToAsset: rule.appliesToAsset,
          isActive: rule.isActive,
          createdAt: rule.createdAt,
          updatedAt: rule.updatedAt
        })),
        message: 'Approval rules retrieved successfully'
      };

    } catch (error) {
      console.error('Error getting approval rules:', error);
      return {
        success: false,
        message: 'Failed to get approval rules'
      };
    }
  }

  async createException(
    tenantId: string,
    exceptionData: {
      userId?: string;
      roleId?: string;
      assetId?: string;
      exceptionType: 'no_approval' | 'single_approval' | 'custom_rule';
      minAmountUsd?: number;
      maxAmountUsd?: number;
      approvalLevels?: number;
      customRuleId?: string;
      reason: string;
      expiresAt?: Date;
    },
    context?: any
  ): Promise<{
    success: boolean;
    exceptionId?: string;
    message: string;
  }> {
    try {
      const exception = await prisma.withdrawalApprovalException.create({
        data: {
          tenantId,
          userId: exceptionData.userId,
          roleId: exceptionData.roleId,
          assetId: exceptionData.assetId,
          exceptionType: exceptionData.exceptionType,
          minAmountUsd: exceptionData.minAmountUsd,
          maxAmountUsd: exceptionData.maxAmountUsd,
          approvalLevels: exceptionData.approvalLevels,
          customRuleId: exceptionData.customRuleId,
          reason: exceptionData.reason,
          expiresAt: exceptionData.expiresAt
        }
      });

      // Log de auditoria
      if (context) {
        await this.auditLogger.logAction(context.userId, {
          type: 'create',
          resourceType: 'approval_exception',
          resourceId: exception.id,
          module: 'banco',
          description: `Created approval exception: ${exceptionData.reason}`,
          newValues: exceptionData,
          metadata: { tenantId, exceptionId: exception.id }
        }, context);
      }

      return {
        success: true,
        exceptionId: exception.id,
        message: 'Approval exception created successfully'
      };

    } catch (error) {
      console.error('Error creating exception:', error);
      return {
        success: false,
        message: 'Failed to create approval exception'
      };
    }
  }

  private parseConfigValue(value: string, type: string): any {
    switch (type) {
      case 'number':
        return Number(value);
      case 'boolean':
        return value === 'true';
      case 'json':
        return JSON.parse(value);
      default:
        return value;
    }
  }

  private serializeConfigValue(value: any, type: string): string {
    switch (type) {
      case 'json':
        return JSON.stringify(value);
      default:
        return String(value);
    }
  }
}
```

### 2. Approval Rules Engine

```typescript
// backend/src/banco/approval-rules-engine.ts
import { prisma } from '../db';
import { ApprovalConfigurationManager } from './approval-configuration-manager';

export class ApprovalRulesEngine {
  private configManager: ApprovalConfigurationManager;

  constructor() {
    this.configManager = new ApprovalConfigurationManager();
  }

  async determineApprovalRequirements(
    userId: string,
    assetId: string,
    amountUsd: number,
    tenantId: string
  ): Promise<{
    requiresApproval: boolean;
    approvalLevels: number;
    managerRoleId?: string;
    ceoRoleId?: string;
    timeoutHours: number;
    autoApproveAfterHours?: number;
    ruleId?: string;
    exceptionId?: string;
  }> {
    try {
      // Verificar exceções primeiro
      const exception = await this.checkExceptions(userId, assetId, amountUsd, tenantId);
      if (exception) {
        return {
          requiresApproval: exception.approvalLevels > 0,
          approvalLevels: exception.approvalLevels || 0,
          managerRoleId: exception.customRule?.managerRoleId,
          ceoRoleId: exception.customRule?.ceoRoleId,
          timeoutHours: exception.customRule?.timeoutHours || 24,
          autoApproveAfterHours: exception.customRule?.autoApproveAfterHours,
          ruleId: exception.customRuleId,
          exceptionId: exception.id
        };
      }

      // Buscar regra aplicável
      const rule = await this.findApplicableRule(userId, assetId, amountUsd, tenantId);
      if (rule) {
        return {
          requiresApproval: rule.approvalLevels > 0,
          approvalLevels: rule.approvalLevels,
          managerRoleId: rule.managerRoleId,
          ceoRoleId: rule.ceoRoleId,
          timeoutHours: rule.timeoutHours,
          autoApproveAfterHours: rule.autoApproveAfterHours,
          ruleId: rule.id
        };
      }

      // Regra padrão (sem aprovação)
      return {
        requiresApproval: false,
        approvalLevels: 0,
        timeoutHours: 24
      };

    } catch (error) {
      console.error('Error determining approval requirements:', error);
      // Em caso de erro, aplicar regra mais restritiva
      return {
        requiresApproval: true,
        approvalLevels: 2,
        timeoutHours: 24
      };
    }
  }

  private async checkExceptions(
    userId: string,
    assetId: string,
    amountUsd: number,
    tenantId: string
  ): Promise<any> {
    const userRoles = await this.getUserRoles(userId);

    const exception = await prisma.withdrawalApprovalException.findFirst({
      where: {
        tenantId,
        isActive: true,
        OR: [
          { userId },
          { roleId: { in: userRoles } },
          { assetId },
          { userId: null, roleId: null, assetId: null } // Exceção geral
        ],
        OR: [
          { minAmountUsd: null },
          { minAmountUsd: { lte: amountUsd } }
        ],
        OR: [
          { maxAmountUsd: null },
          { maxAmountUsd: { gte: amountUsd } }
        ],
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        customRule: true
      },
      orderBy: [
        { userId: 'desc' }, // Exceções específicas do usuário primeiro
        { roleId: 'desc' }, // Exceções específicas do role
        { assetId: 'desc' }, // Exceções específicas do ativo
        { createdAt: 'desc' } // Mais recentes primeiro
      ]
    });

    return exception;
  }

  private async findApplicableRule(
    userId: string,
    assetId: string,
    amountUsd: number,
    tenantId: string
  ): Promise<any> {
    const userRoles = await this.getUserRoles(userId);

    // Buscar regras específicas primeiro
    const specificRules = await prisma.withdrawalApprovalRule.findMany({
      where: {
        tenantId,
        isActive: true,
        minAmountUsd: { lte: amountUsd },
        OR: [
          { maxAmountUsd: null },
          { maxAmountUsd: { gte: amountUsd } }
        ],
        OR: [
          { appliesToUserId: userId },
          { appliesToRoleId: { in: userRoles } },
          { appliesToAssetId: assetId }
        ]
      },
      orderBy: [
        { priority: 'desc' },
        { minAmountUsd: 'desc' }
      ]
    });

    if (specificRules.length > 0) {
      return specificRules[0];
    }

    // Buscar regras gerais
    const generalRules = await prisma.withdrawalApprovalRule.findMany({
      where: {
        tenantId,
        isActive: true,
        minAmountUsd: { lte: amountUsd },
        OR: [
          { maxAmountUsd: null },
          { maxAmountUsd: { gte: amountUsd } }
        ],
        appliesToUserId: null,
        appliesToRoleId: null,
        appliesToAssetId: null
      },
      orderBy: [
        { priority: 'desc' },
        { minAmountUsd: 'desc' }
      ]
    });

    return generalRules[0] || null;
  }

  private async getUserRoles(userId: string): Promise<string[]> {
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: { role: true }
    });
    return userRoles.map(ur => ur.role.id);
  }

  async getDefaultConfiguration(tenantId: string): Promise<any> {
    const config = await this.configManager.getConfiguration(tenantId);
    
    if (config.success) {
      return config.config;
    }

    // Configuração padrão se não houver configuração específica
    return {
      defaultApprovalLimit: 500,
      defaultApprovalLevels: 2,
      defaultTimeoutHours: 24,
      autoApproveEnabled: false,
      notificationEnabled: true,
      auditEnabled: true
    };
  }

  async setDefaultConfiguration(
    tenantId: string,
    config: {
      defaultApprovalLimit: number;
      defaultApprovalLevels: number;
      defaultTimeoutHours: number;
      autoApproveEnabled: boolean;
      notificationEnabled: boolean;
      auditEnabled: boolean;
    },
    context?: any
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const configs = [
        { key: 'defaultApprovalLimit', value: config.defaultApprovalLimit, type: 'number' },
        { key: 'defaultApprovalLevels', value: config.defaultApprovalLevels, type: 'number' },
        { key: 'defaultTimeoutHours', value: config.defaultTimeoutHours, type: 'number' },
        { key: 'autoApproveEnabled', value: config.autoApproveEnabled, type: 'boolean' },
        { key: 'notificationEnabled', value: config.notificationEnabled, type: 'boolean' },
        { key: 'auditEnabled', value: config.auditEnabled, type: 'boolean' }
      ];

      for (const configItem of configs) {
        await this.configManager.setConfiguration(
          tenantId,
          configItem.key,
          configItem.value,
          configItem.type as any,
          `Default configuration for ${configItem.key}`,
          context
        );
      }

      return {
        success: true,
        message: 'Default configuration updated successfully'
      };

    } catch (error) {
      console.error('Error setting default configuration:', error);
      return {
        success: false,
        message: 'Failed to set default configuration'
      };
    }
  }
}
```

### 1. Withdrawal Request Manager

```typescript
// backend/src/banco/withdrawal-request-manager.ts
import { prisma } from '../db';
import { AuditLogger } from '../audit/audit-logger';
import { NotificationService } from '../notifications/notification-service';
import { ApprovalWorkflowEngine } from './approval-workflow-engine';

export class WithdrawalRequestManager {
  private auditLogger: AuditLogger;
  private notificationService: NotificationService;
  private workflowEngine: ApprovalWorkflowEngine;
  private rulesEngine: ApprovalRulesEngine;

  constructor() {
    this.auditLogger = new AuditLogger();
    this.notificationService = new NotificationService();
    this.workflowEngine = new ApprovalWorkflowEngine();
    this.rulesEngine = new ApprovalRulesEngine();
  }

  async createWithdrawalRequest(
    userId: string,
    requestData: {
      walletId: string;
      assetId: string;
      amount: number;
      destinationAddress: string;
      destinationType: 'external_wallet' | 'bank_account' | 'exchange';
      withdrawalType: 'crypto' | 'fiat' | 'internal';
      reason?: string;
    },
    context: any
  ): Promise<{
    success: boolean;
    requestId?: string;
    requiresApproval?: boolean;
    approvalLevel?: number;
    message: string;
  }> {
    try {
      // Validar saldo disponível
      const wallet = await prisma.wallet.findUnique({
        where: { id: requestData.walletId },
        include: {
          balances: {
            where: { assetId: requestData.assetId }
          }
        }
      });

      if (!wallet || wallet.balances.length === 0) {
        return {
          success: false,
          message: 'Wallet or asset not found'
        };
      }

      const balance = wallet.balances[0];
      if (balance.availableBalance < requestData.amount) {
        return {
          success: false,
          message: 'Insufficient balance'
        };
      }

      // Converter para USD para verificar limites
      const amountUsd = await this.convertToUsd(requestData.assetId, requestData.amount);
      
      // Verificar limites de saque
      const limitCheck = await this.checkWithdrawalLimits(userId, requestData.assetId, requestData.amount);
      if (!limitCheck.success) {
        return {
          success: false,
          message: limitCheck.message
        };
      }

      // Determinar se precisa de aprovação usando o motor de regras
      const approvalRequirements = await this.rulesEngine.determineApprovalRequirements(
        userId,
        requestData.assetId,
        amountUsd,
        wallet.tenantId
      );
      
      const requiresApproval = approvalRequirements.requiresApproval;
      const approvalLevel = approvalRequirements.approvalLevels;

      // Criar solicitação
      const withdrawalRequest = await prisma.withdrawalRequest.create({
        data: {
          userId,
          tenantId: wallet.tenantId,
          walletId: requestData.walletId,
          assetId: requestData.assetId,
          amount: requestData.amount,
          amountUsd,
          destinationAddress: requestData.destinationAddress,
          destinationType: requestData.destinationType,
          withdrawalType: requestData.withdrawalType,
          requiresApproval,
          approvalLevel,
          currentApprovalLevel: 0,
          reason: requestData.reason,
          status: requiresApproval ? 'pending' : 'approved'
        }
      });

      // Log de auditoria
      await this.auditLogger.logAction(userId, {
        type: 'create',
        resourceType: 'withdrawal_request',
        resourceId: withdrawalRequest.id,
        module: 'banco',
        description: `Created withdrawal request for ${requestData.amount} ${requestData.assetId}`,
        newValues: {
          amount: requestData.amount,
          amountUsd,
          destinationAddress: requestData.destinationAddress,
          requiresApproval,
          approvalLevel
        },
        metadata: {
          withdrawalRequestId: withdrawalRequest.id
        }
      }, context);

      // Iniciar fluxo de aprovação se necessário
      if (requiresApproval) {
        await this.workflowEngine.startApprovalFlow(withdrawalRequest.id);
      } else {
        // Processar saque imediatamente
        await this.processWithdrawal(withdrawalRequest.id);
      }

      return {
        success: true,
        requestId: withdrawalRequest.id,
        requiresApproval,
        approvalLevel,
        message: requiresApproval ? 'Withdrawal request created, awaiting approval' : 'Withdrawal request approved and processing'
      };

    } catch (error) {
      console.error('Error creating withdrawal request:', error);
      return {
        success: false,
        message: 'Failed to create withdrawal request'
      };
    }
  }

  private async convertToUsd(assetId: string, amount: number): Promise<number> {
    // Implementar conversão para USD usando preços de mercado
    // Por simplicidade, retornando valor fixo
    return amount * 1.0; // Assumindo 1:1 para exemplo
  }

  private async checkWithdrawalLimits(
    userId: string,
    assetId: string,
    amount: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      const limits = await prisma.withdrawalLimit.findFirst({
        where: {
          userId,
          assetId,
          isActive: true
        }
      });

      if (!limits) {
        return { success: true, message: 'No limits configured' };
      }

      // Verificar limite diário
      if (limits.dailyLimit > 0 && limits.currentDailyUsage + amount > limits.dailyLimit) {
        return {
          success: false,
          message: 'Daily withdrawal limit exceeded'
        };
      }

      // Verificar limite semanal
      if (limits.weeklyLimit > 0 && limits.currentWeeklyUsage + amount > limits.weeklyLimit) {
        return {
          success: false,
          message: 'Weekly withdrawal limit exceeded'
        };
      }

      // Verificar limite mensal
      if (limits.monthlyLimit > 0 && limits.currentMonthlyUsage + amount > limits.monthlyLimit) {
        return {
          success: false,
          message: 'Monthly withdrawal limit exceeded'
        };
      }

      return { success: true, message: 'Limits check passed' };

    } catch (error) {
      console.error('Error checking withdrawal limits:', error);
      return {
        success: false,
        message: 'Failed to check withdrawal limits'
      };
    }
  }

  private async getApprovalRule(
    amountUsd: number,
    userId: string,
    assetId: string,
    tenantId: string
  ): Promise<any> {
    // Buscar regras específicas primeiro (maior prioridade)
    const specificRules = await prisma.withdrawalApprovalRule.findMany({
      where: {
        tenantId,
        minAmountUsd: { lte: amountUsd },
        OR: [
          { maxAmountUsd: null },
          { maxAmountUsd: { gte: amountUsd } }
        ],
        OR: [
          { appliesToUserId: userId },
          { appliesToAssetId: assetId },
          { appliesToRoleId: { in: await this.getUserRoles(userId) } }
        ],
        isActive: true
      },
      orderBy: [
        { priority: 'desc' },
        { minAmountUsd: 'desc' }
      ]
    });

    if (specificRules.length > 0) {
      return specificRules[0];
    }

    // Buscar regras gerais
    const generalRules = await prisma.withdrawalApprovalRule.findMany({
      where: {
        tenantId,
        minAmountUsd: { lte: amountUsd },
        OR: [
          { maxAmountUsd: null },
          { maxAmountUsd: { gte: amountUsd } }
        ],
        appliesToUserId: null,
        appliesToRoleId: null,
        appliesToAssetId: null,
        isActive: true
      },
      orderBy: [
        { priority: 'desc' },
        { minAmountUsd: 'desc' }
      ]
    });

    return generalRules[0] || null;
  }

  private async getUserRoles(userId: string): Promise<string[]> {
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: { role: true }
    });
    return userRoles.map(ur => ur.role.id);
  }

  private async processWithdrawal(requestId: string): Promise<void> {
    // Implementar lógica de processamento do saque
    // Por exemplo: transferir para carteira externa, processar via exchange, etc.
    
    await prisma.withdrawalRequest.update({
      where: { id: requestId },
      data: {
        status: 'completed',
        updatedAt: new Date()
      }
    });

    // Notificar usuário
    const request = await prisma.withdrawalRequest.findUnique({
      where: { id: requestId },
      include: { user: true }
    });

    if (request) {
      await this.notificationService.sendNotification({
        userId: request.userId,
        type: 'withdrawal_completed',
        title: 'Saque Processado',
        message: `Seu saque de ${request.amount} foi processado com sucesso`,
        metadata: {
          withdrawalRequestId: requestId,
          amount: request.amount
        }
      });
    }
  }

  async getWithdrawalRequests(
    userId: string,
    filters: {
      status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    success: boolean;
    requests?: any[];
    message: string;
  }> {
    try {
      const requests = await prisma.withdrawalRequest.findMany({
        where: {
          userId,
          ...(filters.status ? { status: filters.status } : {})
        },
        include: {
          asset: true,
          wallet: true,
          approvals: {
            include: {
              approver: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0
      });

      return {
        success: true,
        requests: requests.map(request => ({
          id: request.id,
          amount: request.amount,
          amountUsd: request.amountUsd,
          asset: request.asset,
          destinationAddress: request.destinationAddress,
          destinationType: request.destinationType,
          withdrawalType: request.withdrawalType,
          status: request.status,
          requiresApproval: request.requiresApproval,
          approvalLevel: request.approvalLevel,
          currentApprovalLevel: request.currentApprovalLevel,
          reason: request.reason,
          approvals: request.approvals,
          createdAt: request.createdAt,
          updatedAt: request.updatedAt
        })),
        message: 'Withdrawal requests retrieved successfully'
      };

    } catch (error) {
      console.error('Error getting withdrawal requests:', error);
      return {
        success: false,
        message: 'Failed to get withdrawal requests'
      };
    }
  }

  async cancelWithdrawalRequest(
    requestId: string,
    userId: string,
    reason: string,
    context: any
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const request = await prisma.withdrawalRequest.findUnique({
        where: { id: requestId }
      });

      if (!request || request.userId !== userId) {
        return {
          success: false,
          message: 'Withdrawal request not found'
        };
      }

      if (request.status !== 'pending' && request.status !== 'manager_approved') {
        return {
          success: false,
          message: 'Cannot cancel withdrawal request in current status'
        };
      }

      await prisma.withdrawalRequest.update({
        where: { id: requestId },
        data: {
          status: 'cancelled',
          updatedAt: new Date()
        }
      });

      // Log de auditoria
      await this.auditLogger.logAction(userId, {
        type: 'cancel',
        resourceType: 'withdrawal_request',
        resourceId: requestId,
        module: 'banco',
        description: `Cancelled withdrawal request: ${reason}`,
        oldValues: { status: request.status },
        newValues: { status: 'cancelled' },
        metadata: { reason }
      }, context);

      return {
        success: true,
        message: 'Withdrawal request cancelled successfully'
      };

    } catch (error) {
      console.error('Error cancelling withdrawal request:', error);
      return {
        success: false,
        message: 'Failed to cancel withdrawal request'
      };
    }
  }
}
```

### 2. Approval Workflow Engine

```typescript
// backend/src/banco/approval-workflow-engine.ts
import { prisma } from '../db';
import { NotificationService } from '../notifications/notification-service';
import { AuditLogger } from '../audit/audit-logger';

export class ApprovalWorkflowEngine {
  private notificationService: NotificationService;
  private auditLogger: AuditLogger;

  constructor() {
    this.notificationService = new NotificationService();
    this.auditLogger = new AuditLogger();
  }

  async startApprovalFlow(requestId: string): Promise<void> {
    try {
      const request = await prisma.withdrawalRequest.findUnique({
        where: { id: requestId },
        include: {
          user: true,
          asset: true
        }
      });

      if (!request) {
        throw new Error('Withdrawal request not found');
      }

      // Criar aprovação do gerente
      await this.createManagerApproval(requestId);
      
      // Notificar gerente
      await this.notifyManager(request);

    } catch (error) {
      console.error('Error starting approval flow:', error);
    }
  }

  private async createManagerApproval(requestId: string): Promise<void> {
    const request = await prisma.withdrawalRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) return;

    // Buscar gerente do setor (Financeiro)
    const manager = await this.getDepartmentManager('financeiro');
    
    if (!manager) {
      throw new Error('Manager not found for approval');
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 horas para aprovação

    await prisma.withdrawalApproval.create({
      data: {
        withdrawalRequestId: requestId,
        approverId: manager.id,
        approverType: 'manager',
        approvalLevel: 1,
        status: 'pending',
        expiresAt
      }
    });
  }

  private async getDepartmentManager(department: string): Promise<any> {
    return await prisma.user.findFirst({
      where: {
        roles: {
          some: {
            role: {
              name: `${department}_manager`
            }
          }
        }
      }
    });
  }

  private async notifyManager(request: any): Promise<void> {
    const manager = await this.getDepartmentManager('financeiro');
    
    if (manager) {
      await this.notificationService.sendNotification({
        userId: manager.id,
        type: 'withdrawal_approval_needed',
        title: 'Aprovação de Saque Necessária',
        message: `Solicitação de saque de ${request.amount} ${request.asset.symbol} aguardando sua aprovação`,
        metadata: {
          withdrawalRequestId: request.id,
          amount: request.amount,
          assetSymbol: request.asset.symbol,
          userName: request.user.name
        }
      });
    }
  }

  async approveWithdrawal(
    requestId: string,
    approverId: string,
    approvalLevel: number,
    comments: string,
    context: any
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const request = await prisma.withdrawalRequest.findUnique({
        where: { id: requestId },
        include: {
          user: true,
          asset: true
        }
      });

      if (!request) {
        return {
          success: false,
          message: 'Withdrawal request not found'
        };
      }

      // Verificar se a aprovação é válida
      const approval = await prisma.withdrawalApproval.findFirst({
        where: {
          withdrawalRequestId: requestId,
          approverId,
          approvalLevel,
          status: 'pending'
        }
      });

      if (!approval) {
        return {
          success: false,
          message: 'Approval not found or already processed'
        };
      }

      // Atualizar aprovação
      await prisma.withdrawalApproval.update({
        where: { id: approval.id },
        data: {
          status: 'approved',
          comments,
          approvedAt: new Date()
        }
      });

      // Atualizar nível de aprovação da solicitação
      const newApprovalLevel = request.currentApprovalLevel + 1;
      const newStatus = newApprovalLevel >= request.approvalLevel ? 'ceo_approved' : 'manager_approved';

      await prisma.withdrawalRequest.update({
        where: { id: requestId },
        data: {
          currentApprovalLevel: newApprovalLevel,
          status: newStatus,
          updatedAt: new Date()
        }
      });

      // Log de auditoria
      await this.auditLogger.logAction(approverId, {
        type: 'approve',
        resourceType: 'withdrawal_request',
        resourceId: requestId,
        module: 'banco',
        description: `Approved withdrawal request at level ${approvalLevel}`,
        newValues: {
          approvalLevel,
          status: newStatus,
          comments
        },
        metadata: {
          withdrawalRequestId: requestId,
          approverId
        }
      }, context);

      // Se aprovado pelo CEO, processar saque
      if (newStatus === 'ceo_approved') {
        await this.processApprovedWithdrawal(requestId);
      } else {
        // Notificar CEO para próxima aprovação
        await this.notifyCEO(request);
      }

      return {
        success: true,
        message: 'Withdrawal request approved successfully'
      };

    } catch (error) {
      console.error('Error approving withdrawal:', error);
      return {
        success: false,
        message: 'Failed to approve withdrawal request'
      };
    }
  }

  async rejectWithdrawal(
    requestId: string,
    approverId: string,
    approvalLevel: number,
    comments: string,
    context: any
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const request = await prisma.withdrawalRequest.findUnique({
        where: { id: requestId }
      });

      if (!request) {
        return {
          success: false,
          message: 'Withdrawal request not found'
        };
      }

      // Verificar se a aprovação é válida
      const approval = await prisma.withdrawalApproval.findFirst({
        where: {
          withdrawalRequestId: requestId,
          approverId,
          approvalLevel,
          status: 'pending'
        }
      });

      if (!approval) {
        return {
          success: false,
          message: 'Approval not found or already processed'
        };
      }

      // Atualizar aprovação
      await prisma.withdrawalApproval.update({
        where: { id: approval.id },
        data: {
          status: 'rejected',
          comments,
          approvedAt: new Date()
        }
      });

      // Atualizar status da solicitação
      await prisma.withdrawalRequest.update({
        where: { id: requestId },
        data: {
          status: 'rejected',
          updatedAt: new Date()
        }
      });

      // Log de auditoria
      await this.auditLogger.logAction(approverId, {
        type: 'reject',
        resourceType: 'withdrawal_request',
        resourceId: requestId,
        module: 'banco',
        description: `Rejected withdrawal request at level ${approvalLevel}`,
        newValues: {
          approvalLevel,
          status: 'rejected',
          comments
        },
        metadata: {
          withdrawalRequestId: requestId,
          approverId
        }
      }, context);

      // Notificar usuário
      await this.notificationService.sendNotification({
        userId: request.userId,
        type: 'withdrawal_rejected',
        title: 'Saque Rejeitado',
        message: `Seu saque foi rejeitado: ${comments}`,
        metadata: {
          withdrawalRequestId: requestId,
          comments
        }
      });

      return {
        success: true,
        message: 'Withdrawal request rejected successfully'
      };

    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      return {
        success: false,
        message: 'Failed to reject withdrawal request'
      };
    }
  }

  private async notifyCEO(request: any): Promise<void> {
    const ceo = await prisma.user.findFirst({
      where: {
        roles: {
          some: {
            role: {
              name: 'ceo'
            }
          }
        }
      }
    });

    if (ceo) {
      await this.notificationService.sendNotification({
        userId: ceo.id,
        type: 'withdrawal_ceo_approval_needed',
        title: 'Aprovação de Saque - CEO',
        message: `Solicitação de saque de ${request.amount} ${request.asset.symbol} aguardando sua aprovação final`,
        metadata: {
          withdrawalRequestId: request.id,
          amount: request.amount,
          assetSymbol: request.asset.symbol,
          userName: request.user.name
        }
      });
    }
  }

  private async processApprovedWithdrawal(requestId: string): Promise<void> {
    // Implementar lógica de processamento do saque aprovado
    // Por exemplo: transferir para carteira externa, processar via exchange, etc.
    
    await prisma.withdrawalRequest.update({
      where: { id: requestId },
      data: {
        status: 'completed',
        updatedAt: new Date()
      }
    });

    // Notificar usuário
    const request = await prisma.withdrawalRequest.findUnique({
      where: { id: requestId },
      include: { user: true }
    });

    if (request) {
      await this.notificationService.sendNotification({
        userId: request.userId,
        type: 'withdrawal_completed',
        title: 'Saque Processado',
        message: `Seu saque de ${request.amount} foi processado com sucesso`,
        metadata: {
          withdrawalRequestId: requestId,
          amount: request.amount
        }
      });
    }
  }

  async getPendingApprovals(
    approverId: string,
    approvalLevel: number
  ): Promise<{
    success: boolean;
    approvals?: any[];
    message: string;
  }> {
    try {
      const approvals = await prisma.withdrawalApproval.findMany({
        where: {
          approverId,
          approvalLevel,
          status: 'pending'
        },
        include: {
          withdrawalRequest: {
            include: {
              user: true,
              asset: true,
              wallet: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      return {
        success: true,
        approvals: approvals.map(approval => ({
          id: approval.id,
          withdrawalRequest: approval.withdrawalRequest,
          approvalLevel: approval.approvalLevel,
          status: approval.status,
          expiresAt: approval.expiresAt,
          createdAt: approval.createdAt
        })),
        message: 'Pending approvals retrieved successfully'
      };

    } catch (error) {
      console.error('Error getting pending approvals:', error);
      return {
        success: false,
        message: 'Failed to get pending approvals'
      };
    }
  }
}
```

### 3. Manager Approval System

```typescript
// backend/src/banco/manager-approval-system.ts
import { prisma } from '../db';
import { ApprovalWorkflowEngine } from './approval-workflow-engine';
import { NotificationService } from '../notifications/notification-service';

export class ManagerApprovalSystem {
  private workflowEngine: ApprovalWorkflowEngine;
  private notificationService: NotificationService;

  constructor() {
    this.workflowEngine = new ApprovalWorkflowEngine();
    this.notificationService = new NotificationService();
  }

  async getManagerDashboard(managerId: string): Promise<{
    success: boolean;
    dashboard?: any;
    message: string;
  }> {
    try {
      const [pendingApprovals, recentApprovals, stats] = await Promise.all([
        this.getPendingApprovals(managerId),
        this.getRecentApprovals(managerId),
        this.getApprovalStats(managerId)
      ]);

      const dashboard = {
        pendingApprovals: pendingApprovals.approvals || [],
        recentApprovals: recentApprovals.approvals || [],
        stats: {
          totalPending: stats.totalPending,
          totalApproved: stats.totalApproved,
          totalRejected: stats.totalRejected,
          averageApprovalTime: stats.averageApprovalTime
        }
      };

      return {
        success: true,
        dashboard,
        message: 'Manager dashboard retrieved successfully'
      };

    } catch (error) {
      console.error('Error getting manager dashboard:', error);
      return {
        success: false,
        message: 'Failed to get manager dashboard'
      };
    }
  }

  private async getPendingApprovals(managerId: string): Promise<any> {
    return await this.workflowEngine.getPendingApprovals(managerId, 1);
  }

  private async getRecentApprovals(managerId: string): Promise<any> {
    try {
      const approvals = await prisma.withdrawalApproval.findMany({
        where: {
          approverId: managerId,
          approvalLevel: 1,
          status: { in: ['approved', 'rejected'] }
        },
        include: {
          withdrawalRequest: {
            include: {
              user: true,
              asset: true
            }
          }
        },
        orderBy: { approvedAt: 'desc' },
        take: 10
      });

      return {
        success: true,
        approvals: approvals.map(approval => ({
          id: approval.id,
          withdrawalRequest: approval.withdrawalRequest,
          status: approval.status,
          comments: approval.comments,
          approvedAt: approval.approvedAt
        }))
      };

    } catch (error) {
      console.error('Error getting recent approvals:', error);
      return { success: false, approvals: [] };
    }
  }

  private async getApprovalStats(managerId: string): Promise<any> {
    try {
      const stats = await prisma.withdrawalApproval.groupBy({
        by: ['status'],
        where: {
          approverId: managerId,
          approvalLevel: 1
        },
        _count: {
          id: true
        }
      });

      const totalPending = stats.find(s => s.status === 'pending')?._count.id || 0;
      const totalApproved = stats.find(s => s.status === 'approved')?._count.id || 0;
      const totalRejected = stats.find(s => s.status === 'rejected')?._count.id || 0;

      // Calcular tempo médio de aprovação
      const approvedApprovals = await prisma.withdrawalApproval.findMany({
        where: {
          approverId: managerId,
          approvalLevel: 1,
          status: 'approved',
          approvedAt: { not: null }
        },
        select: {
          createdAt: true,
          approvedAt: true
        }
      });

      const averageApprovalTime = approvedApprovals.length > 0 
        ? approvedApprovals.reduce((sum, approval) => {
            const diff = approval.approvedAt!.getTime() - approval.createdAt.getTime();
            return sum + diff;
          }, 0) / approvedApprovals.length / (1000 * 60 * 60) // em horas
        : 0;

      return {
        totalPending,
        totalApproved,
        totalRejected,
        averageApprovalTime
      };

    } catch (error) {
      console.error('Error getting approval stats:', error);
      return {
        totalPending: 0,
        totalApproved: 0,
        totalRejected: 0,
        averageApprovalTime: 0
      };
    }
  }

  async approveWithdrawal(
    requestId: string,
    managerId: string,
    comments: string,
    context: any
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    return await this.workflowEngine.approveWithdrawal(
      requestId,
      managerId,
      1, // Manager level
      comments,
      context
    );
  }

  async rejectWithdrawal(
    requestId: string,
    managerId: string,
    comments: string,
    context: any
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    return await this.workflowEngine.rejectWithdrawal(
      requestId,
      managerId,
      1, // Manager level
      comments,
      context
    );
  }
}
```

### 4. CEO Approval System

```typescript
// backend/src/banco/ceo-approval-system.ts
import { prisma } from '../db';
import { ApprovalWorkflowEngine } from './approval-workflow-engine';
import { NotificationService } from '../notifications/notification-service';

export class CEOApprovalSystem {
  private workflowEngine: ApprovalWorkflowEngine;
  private notificationService: NotificationService;

  constructor() {
    this.workflowEngine = new ApprovalWorkflowEngine();
    this.notificationService = new NotificationService();
  }

  async getCEODashboard(ceoId: string): Promise<{
    success: boolean;
    dashboard?: any;
    message: string;
  }> {
    try {
      const [pendingApprovals, recentApprovals, stats, highValueRequests] = await Promise.all([
        this.getPendingApprovals(ceoId),
        this.getRecentApprovals(ceoId),
        this.getApprovalStats(ceoId),
        this.getHighValueRequests()
      ]);

      const dashboard = {
        pendingApprovals: pendingApprovals.approvals || [],
        recentApprovals: recentApprovals.approvals || [],
        highValueRequests: highValueRequests.requests || [],
        stats: {
          totalPending: stats.totalPending,
          totalApproved: stats.totalApproved,
          totalRejected: stats.totalRejected,
          averageApprovalTime: stats.averageApprovalTime,
          totalAmountPending: stats.totalAmountPending
        }
      };

      return {
        success: true,
        dashboard,
        message: 'CEO dashboard retrieved successfully'
      };

    } catch (error) {
      console.error('Error getting CEO dashboard:', error);
      return {
        success: false,
        message: 'Failed to get CEO dashboard'
      };
    }
  }

  private async getPendingApprovals(ceoId: string): Promise<any> {
    return await this.workflowEngine.getPendingApprovals(ceoId, 2);
  }

  private async getRecentApprovals(ceoId: string): Promise<any> {
    try {
      const approvals = await prisma.withdrawalApproval.findMany({
        where: {
          approverId: ceoId,
          approvalLevel: 2,
          status: { in: ['approved', 'rejected'] }
        },
        include: {
          withdrawalRequest: {
            include: {
              user: true,
              asset: true
            }
          }
        },
        orderBy: { approvedAt: 'desc' },
        take: 10
      });

      return {
        success: true,
        approvals: approvals.map(approval => ({
          id: approval.id,
          withdrawalRequest: approval.withdrawalRequest,
          status: approval.status,
          comments: approval.comments,
          approvedAt: approval.approvedAt
        }))
      };

    } catch (error) {
      console.error('Error getting recent approvals:', error);
      return { success: false, approvals: [] };
    }
  }

  private async getHighValueRequests(): Promise<any> {
    try {
      const requests = await prisma.withdrawalRequest.findMany({
        where: {
          amountUsd: { gte: 10000 }, // Acima de $10,000
          status: { in: ['manager_approved', 'ceo_approved', 'completed'] }
        },
        include: {
          user: true,
          asset: true,
          approvals: {
            include: {
              approver: true
            }
          }
        },
        orderBy: { amountUsd: 'desc' },
        take: 10
      });

      return {
        success: true,
        requests: requests.map(request => ({
          id: request.id,
          amount: request.amount,
          amountUsd: request.amountUsd,
          user: request.user,
          asset: request.asset,
          status: request.status,
          approvals: request.approvals,
          createdAt: request.createdAt
        }))
      };

    } catch (error) {
      console.error('Error getting high value requests:', error);
      return { success: false, requests: [] };
    }
  }

  private async getApprovalStats(ceoId: string): Promise<any> {
    try {
      const stats = await prisma.withdrawalApproval.groupBy({
        by: ['status'],
        where: {
          approverId: ceoId,
          approvalLevel: 2
        },
        _count: {
          id: true
        }
      });

      const totalPending = stats.find(s => s.status === 'pending')?._count.id || 0;
      const totalApproved = stats.find(s => s.status === 'approved')?._count.id || 0;
      const totalRejected = stats.find(s => s.status === 'rejected')?._count.id || 0;

      // Calcular tempo médio de aprovação
      const approvedApprovals = await prisma.withdrawalApproval.findMany({
        where: {
          approverId: ceoId,
          approvalLevel: 2,
          status: 'approved',
          approvedAt: { not: null }
        },
        select: {
          createdAt: true,
          approvedAt: true
        }
      });

      const averageApprovalTime = approvedApprovals.length > 0 
        ? approvedApprovals.reduce((sum, approval) => {
            const diff = approval.approvedAt!.getTime() - approval.createdAt.getTime();
            return sum + diff;
          }, 0) / approvedApprovals.length / (1000 * 60 * 60) // em horas
        : 0;

      // Calcular valor total pendente
      const pendingRequests = await prisma.withdrawalRequest.findMany({
        where: {
          status: 'manager_approved'
        },
        select: {
          amountUsd: true
        }
      });

      const totalAmountPending = pendingRequests.reduce((sum, request) => 
        sum + Number(request.amountUsd), 0
      );

      return {
        totalPending,
        totalApproved,
        totalRejected,
        averageApprovalTime,
        totalAmountPending
      };

    } catch (error) {
      console.error('Error getting approval stats:', error);
      return {
        totalPending: 0,
        totalApproved: 0,
        totalRejected: 0,
        averageApprovalTime: 0,
        totalAmountPending: 0
      };
    }
  }

  async approveWithdrawal(
    requestId: string,
    ceoId: string,
    comments: string,
    context: any
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    return await this.workflowEngine.approveWithdrawal(
      requestId,
      ceoId,
      2, // CEO level
      comments,
      context
    );
  }

  async rejectWithdrawal(
    requestId: string,
    ceoId: string,
    comments: string,
    context: any
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    return await this.workflowEngine.rejectWithdrawal(
      requestId,
      ceoId,
      2, // CEO level
      comments,
      context
    );
  }

  async getApprovalAnalytics(
    startDate: Date,
    endDate: Date
  ): Promise<{
    success: boolean;
    analytics?: any;
    message: string;
  }> {
    try {
      const [approvalTrends, departmentBreakdown, amountAnalysis] = await Promise.all([
        this.getApprovalTrends(startDate, endDate),
        this.getDepartmentBreakdown(startDate, endDate),
        this.getAmountAnalysis(startDate, endDate)
      ]);

      const analytics = {
        approvalTrends,
        departmentBreakdown,
        amountAnalysis,
        period: {
          startDate,
          endDate
        }
      };

      return {
        success: true,
        analytics,
        message: 'Approval analytics retrieved successfully'
      };

    } catch (error) {
      console.error('Error getting approval analytics:', error);
      return {
        success: false,
        message: 'Failed to get approval analytics'
      };
    }
  }

  private async getApprovalTrends(startDate: Date, endDate: Date): Promise<any> {
    // Implementar análise de tendências de aprovação
    return {
      dailyApprovals: [],
      weeklyApprovals: [],
      monthlyApprovals: []
    };
  }

  private async getDepartmentBreakdown(startDate: Date, endDate: Date): Promise<any> {
    // Implementar breakdown por departamento
    return {
      departments: []
    };
  }

  private async getAmountAnalysis(startDate: Date, endDate: Date): Promise<any> {
    // Implementar análise de valores
    return {
      totalAmount: 0,
      averageAmount: 0,
      maxAmount: 0,
      minAmount: 0
    };
  }
}
```

## 🎨 Interface do Usuário

### 1. Dashboard de Aprovação do Gerente

```typescript
// frontend/src/components/banco/ManagerApprovalDashboard.tsx
import React, { useState, useEffect } from 'react';

interface ManagerApprovalDashboardProps {
  managerId: string;
}

export const ManagerApprovalDashboard: React.FC<ManagerApprovalDashboardProps> = ({ managerId }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [managerId]);

  const loadDashboardData = async () => {
    try {
      const response = await fetch(`/api/banco/approvals/manager-dashboard`);
      const data = await response.json();
      
      if (data.success) {
        setDashboardData(data.dashboard);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (requestId: string, approved: boolean, comments: string) => {
    try {
      const response = await fetch(`/api/banco/approvals/${approved ? 'approve' : 'reject'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          comments
        })
      });
      
      const data = await response.json();
      if (data.success) {
        loadDashboardData(); // Recarregar dados
      }
    } catch (error) {
      console.error('Error processing approval:', error);
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="manager-approval-dashboard">
      <h2>🔐 Dashboard de Aprovação - Gerente</h2>
      
      {/* Estatísticas */}
      <div className="approval-stats">
        <div className="stat-card">
          <h3>Pendentes</h3>
          <div className="stat-value">{dashboardData?.stats.totalPending}</div>
        </div>
        <div className="stat-card">
          <h3>Aprovados</h3>
          <div className="stat-value">{dashboardData?.stats.totalApproved}</div>
        </div>
        <div className="stat-card">
          <h3>Rejeitados</h3>
          <div className="stat-value">{dashboardData?.stats.totalRejected}</div>
        </div>
        <div className="stat-card">
          <h3>Tempo Médio</h3>
          <div className="stat-value">{dashboardData?.stats.averageApprovalTime.toFixed(1)}h</div>
        </div>
      </div>

      {/* Solicitações Pendentes */}
      <div className="pending-approvals">
        <h3>📋 Solicitações Pendentes</h3>
        <div className="approvals-list">
          {dashboardData?.pendingApprovals.map(approval => (
            <div key={approval.id} className="approval-item">
              <div className="approval-header">
                <h4>Saque #{approval.withdrawalRequest.id.slice(0, 8)}</h4>
                <span className="approval-amount">
                  ${approval.withdrawalRequest.amountUsd.toLocaleString()}
                </span>
              </div>
              
              <div className="approval-details">
                <div className="detail-item">
                  <span className="label">Usuário:</span>
                  <span className="value">{approval.withdrawalRequest.user.name}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Ativo:</span>
                  <span className="value">{approval.withdrawalRequest.asset.symbol}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Valor:</span>
                  <span className="value">{approval.withdrawalRequest.amount}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Destino:</span>
                  <span className="value">{approval.withdrawalRequest.destinationAddress}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Motivo:</span>
                  <span className="value">{approval.withdrawalRequest.reason || 'Não informado'}</span>
                </div>
              </div>

              <div className="approval-actions">
                <button
                  onClick={() => handleApproval(approval.withdrawalRequest.id, true, 'Aprovado pelo gerente')}
                  className="approve-button"
                >
                  ✅ Aprovar
                </button>
                <button
                  onClick={() => handleApproval(approval.withdrawalRequest.id, false, 'Rejeitado pelo gerente')}
                  className="reject-button"
                >
                  ❌ Rejeitar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Aprovações Recentes */}
      <div className="recent-approvals">
        <h3>📊 Aprovações Recentes</h3>
        <div className="approvals-list">
          {dashboardData?.recentApprovals.map(approval => (
            <div key={approval.id} className="approval-item">
              <div className="approval-header">
                <h4>Saque #{approval.withdrawalRequest.id.slice(0, 8)}</h4>
                <span className={`approval-status ${approval.status}`}>
                  {approval.status === 'approved' ? '✅ Aprovado' : '❌ Rejeitado'}
                </span>
              </div>
              
              <div className="approval-details">
                <div className="detail-item">
                  <span className="label">Usuário:</span>
                  <span className="value">{approval.withdrawalRequest.user.name}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Valor:</span>
                  <span className="value">${approval.withdrawalRequest.amountUsd.toLocaleString()}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Comentários:</span>
                  <span className="value">{approval.comments}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Data:</span>
                  <span className="value">
                    {new Date(approval.approvedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

### 2. Dashboard de Aprovação do CEO

```typescript
// frontend/src/components/banco/CEOApprovalDashboard.tsx
import React, { useState, useEffect } from 'react';

interface CEOApprovalDashboardProps {
  ceoId: string;
}

export const CEOApprovalDashboard: React.FC<CEOApprovalDashboardProps> = ({ ceoId }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [ceoId]);

  const loadDashboardData = async () => {
    try {
      const response = await fetch(`/api/banco/approvals/ceo-dashboard`);
      const data = await response.json();
      
      if (data.success) {
        setDashboardData(data.dashboard);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (requestId: string, approved: boolean, comments: string) => {
    try {
      const response = await fetch(`/api/banco/approvals/${approved ? 'approve' : 'reject'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          comments
        })
      });
      
      const data = await response.json();
      if (data.success) {
        loadDashboardData(); // Recarregar dados
      }
    } catch (error) {
      console.error('Error processing approval:', error);
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="ceo-approval-dashboard">
      <h2>👑 Dashboard de Aprovação - CEO</h2>
      
      {/* Estatísticas */}
      <div className="approval-stats">
        <div className="stat-card">
          <h3>Pendentes</h3>
          <div className="stat-value">{dashboardData?.stats.totalPending}</div>
        </div>
        <div className="stat-card">
          <h3>Aprovados</h3>
          <div className="stat-value">{dashboardData?.stats.totalApproved}</div>
        </div>
        <div className="stat-card">
          <h3>Rejeitados</h3>
          <div className="stat-value">{dashboardData?.stats.totalRejected}</div>
        </div>
        <div className="stat-card">
          <h3>Valor Pendente</h3>
          <div className="stat-value">${dashboardData?.stats.totalAmountPending.toLocaleString()}</div>
        </div>
      </div>

      {/* Solicitações Pendentes */}
      <div className="pending-approvals">
        <h3>📋 Solicitações Pendentes - Aprovação Final</h3>
        <div className="approvals-list">
          {dashboardData?.pendingApprovals.map(approval => (
            <div key={approval.id} className="approval-item high-value">
              <div className="approval-header">
                <h4>Saque #{approval.withdrawalRequest.id.slice(0, 8)}</h4>
                <span className="approval-amount">
                  ${approval.withdrawalRequest.amountUsd.toLocaleString()}
                </span>
              </div>
              
              <div className="approval-details">
                <div className="detail-item">
                  <span className="label">Usuário:</span>
                  <span className="value">{approval.withdrawalRequest.user.name}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Ativo:</span>
                  <span className="value">{approval.withdrawalRequest.asset.symbol}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Valor:</span>
                  <span className="value">{approval.withdrawalRequest.amount}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Destino:</span>
                  <span className="value">{approval.withdrawalRequest.destinationAddress}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Motivo:</span>
                  <span className="value">{approval.withdrawalRequest.reason || 'Não informado'}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Aprovado por:</span>
                  <span className="value">Gerente Financeiro</span>
                </div>
              </div>

              <div className="approval-actions">
                <button
                  onClick={() => handleApproval(approval.withdrawalRequest.id, true, 'Aprovado pelo CEO')}
                  className="approve-button"
                >
                  ✅ Aprovar Final
                </button>
                <button
                  onClick={() => handleApproval(approval.withdrawalRequest.id, false, 'Rejeitado pelo CEO')}
                  className="reject-button"
                >
                  ❌ Rejeitar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Saques de Alto Valor */}
      <div className="high-value-requests">
        <h3>💰 Saques de Alto Valor</h3>
        <div className="requests-list">
          {dashboardData?.highValueRequests.map(request => (
            <div key={request.id} className="request-item">
              <div className="request-header">
                <h4>Saque #{request.id.slice(0, 8)}</h4>
                <span className="request-amount">
                  ${request.amountUsd.toLocaleString()}
                </span>
              </div>
              
              <div className="request-details">
                <div className="detail-item">
                  <span className="label">Usuário:</span>
                  <span className="value">{request.user.name}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Status:</span>
                  <span className={`value status-${request.status}`}>
                    {request.status === 'completed' ? '✅ Processado' : 
                     request.status === 'ceo_approved' ? '⏳ Aguardando Processamento' :
                     request.status === 'manager_approved' ? '⏳ Aguardando CEO' : '❓ Desconhecido'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="label">Data:</span>
                  <span className="value">
                    {new Date(request.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

## 🧪 Testes do Sistema

### 1. Testes de Aprovação

```typescript
// tests/unit/banco/withdrawal-approval-system.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { WithdrawalRequestManager } from '../../src/banco/withdrawal-request-manager';
import { ApprovalWorkflowEngine } from '../../src/banco/approval-workflow-engine';
import { prisma } from '../setup';

describe('Withdrawal Approval System', () => {
  let requestManager: WithdrawalRequestManager;
  let workflowEngine: ApprovalWorkflowEngine;

  beforeEach(() => {
    requestManager = new WithdrawalRequestManager();
    workflowEngine = new ApprovalWorkflowEngine();
  });

  describe('createWithdrawalRequest', () => {
    it('should create withdrawal request with approval for amounts above $500', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      const wallet = await prisma.wallet.create({
        data: {
          userId: user.id,
          tenantId: 'tenant_123',
          walletType: 'internal',
          name: 'Main Wallet',
          isPrimary: true
        }
      });

      const asset = await prisma.asset.create({
        data: {
          symbol: 'BTC',
          name: 'Bitcoin',
          type: 'crypto'
        }
      });

      // Criar regra de aprovação para valores acima de $500
      await prisma.withdrawalApprovalRule.create({
        data: {
          tenantId: 'tenant_123',
          minAmountUsd: 500,
          approvalLevels: 2, // Manager + CEO
          timeoutHours: 24
        }
      });

      const result = await requestManager.createWithdrawalRequest(user.id, {
        walletId: wallet.id,
        assetId: asset.id,
        amount: 1.0,
        destinationAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        destinationType: 'external_wallet',
        withdrawalType: 'crypto',
        reason: 'Personal use'
      }, { userId: user.id });

      expect(result.success).toBe(true);
      expect(result.requiresApproval).toBe(true);
      expect(result.approvalLevel).toBe(2);
    });

    it('should create withdrawal request without approval for amounts below $500', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User'
        }
      });

      const wallet = await prisma.wallet.create({
        data: {
          userId: user.id,
          tenantId: 'tenant_123',
          walletType: 'internal',
          name: 'Main Wallet',
          isPrimary: true
        }
      });

      const asset = await prisma.asset.create({
        data: {
          symbol: 'BTC',
          name: 'Bitcoin',
          type: 'crypto'
        }
      });

      const result = await requestManager.createWithdrawalRequest(user.id, {
        walletId: wallet.id,
        assetId: asset.id,
        amount: 0.001, // Valor baixo
        destinationAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        destinationType: 'external_wallet',
        withdrawalType: 'crypto'
      }, { userId: user.id });

      expect(result.success).toBe(true);
      expect(result.requiresApproval).toBe(false);
    });
  });

  describe('approval workflow', () => {
    it('should process manager approval correctly', async () => {
      const manager = await prisma.user.create({
        data: {
          email: 'manager@example.com',
          name: 'Manager User'
        }
      });

      const request = await prisma.withdrawalRequest.create({
        data: {
          userId: 'user_123',
          tenantId: 'tenant_123',
          walletId: 'wallet_123',
          assetId: 'asset_123',
          amount: 1.0,
          amountUsd: 1000,
          destinationAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
          destinationType: 'external_wallet',
          withdrawalType: 'crypto',
          requiresApproval: true,
          approvalLevel: 2,
          currentApprovalLevel: 0,
          status: 'pending'
        }
      });

      const result = await workflowEngine.approveWithdrawal(
        request.id,
        manager.id,
        1, // Manager level
        'Approved by manager',
        { userId: manager.id }
      );

      expect(result.success).toBe(true);

      // Verificar se o status foi atualizado
      const updatedRequest = await prisma.withdrawalRequest.findUnique({
        where: { id: request.id }
      });

      expect(updatedRequest?.status).toBe('manager_approved');
      expect(updatedRequest?.currentApprovalLevel).toBe(1);
    });
  });
});
```

## 🔧 APIs de Configuração

### 1. Configuration APIs

#### GET /api/banco/approvals/configuration
Obter configuração de aprovação

```typescript
interface GetApprovalConfigurationResponse {
  success: boolean;
  config?: {
    defaultApprovalLimit: number;
    defaultApprovalLevels: number;
    defaultTimeoutHours: number;
    autoApproveEnabled: boolean;
    notificationEnabled: boolean;
    auditEnabled: boolean;
  };
  message: string;
}
```

#### PUT /api/banco/approvals/configuration
Atualizar configuração de aprovação

```typescript
interface UpdateApprovalConfigurationRequest {
  defaultApprovalLimit?: number;
  defaultApprovalLevels?: number;
  defaultTimeoutHours?: number;
  autoApproveEnabled?: boolean;
  notificationEnabled?: boolean;
  auditEnabled?: boolean;
}

interface UpdateApprovalConfigurationResponse {
  success: boolean;
  message: string;
}
```

### 2. Rules APIs

#### POST /api/banco/approvals/rules
Criar regra de aprovação

```typescript
interface CreateApprovalRuleRequest {
  ruleName: string;
  description?: string;
  minAmountUsd: number;
  maxAmountUsd?: number;
  approvalLevels: number;
  managerRoleId?: string;
  ceoRoleId?: string;
  timeoutHours?: number;
  autoApproveAfterHours?: number;
  priority?: number;
  appliesToUserId?: string;
  appliesToRoleId?: string;
  appliesToAssetId?: string;
}

interface CreateApprovalRuleResponse {
  success: boolean;
  ruleId?: string;
  message: string;
}
```

#### GET /api/banco/approvals/rules
Obter regras de aprovação

```typescript
interface GetApprovalRulesRequest {
  isActive?: boolean;
  appliesToUserId?: string;
  appliesToRoleId?: string;
  appliesToAssetId?: string;
}

interface GetApprovalRulesResponse {
  success: boolean;
  rules?: Array<{
    id: string;
    ruleName: string;
    description?: string;
    minAmountUsd: number;
    maxAmountUsd?: number;
    approvalLevels: number;
    managerRole?: any;
    ceoRole?: any;
    timeoutHours: number;
    autoApproveAfterHours?: number;
    priority: number;
    appliesToUser?: any;
    appliesToRole?: any;
    appliesToAsset?: any;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  message: string;
}
```

#### PUT /api/banco/approvals/rules/:ruleId
Atualizar regra de aprovação

```typescript
interface UpdateApprovalRuleRequest {
  ruleName?: string;
  description?: string;
  minAmountUsd?: number;
  maxAmountUsd?: number;
  approvalLevels?: number;
  managerRoleId?: string;
  ceoRoleId?: string;
  timeoutHours?: number;
  autoApproveAfterHours?: number;
  priority?: number;
  isActive?: boolean;
}

interface UpdateApprovalRuleResponse {
  success: boolean;
  message: string;
}
```

#### DELETE /api/banco/approvals/rules/:ruleId
Excluir regra de aprovação

```typescript
interface DeleteApprovalRuleResponse {
  success: boolean;
  message: string;
}
```

### 3. Exceptions APIs

#### POST /api/banco/approvals/exceptions
Criar exceção de aprovação

```typescript
interface CreateApprovalExceptionRequest {
  userId?: string;
  roleId?: string;
  assetId?: string;
  exceptionType: 'no_approval' | 'single_approval' | 'custom_rule';
  minAmountUsd?: number;
  maxAmountUsd?: number;
  approvalLevels?: number;
  customRuleId?: string;
  reason: string;
  expiresAt?: string;
}

interface CreateApprovalExceptionResponse {
  success: boolean;
  exceptionId?: string;
  message: string;
}
```

#### GET /api/banco/approvals/exceptions
Obter exceções de aprovação

```typescript
interface GetApprovalExceptionsResponse {
  success: boolean;
  exceptions?: Array<{
    id: string;
    userId?: string;
    roleId?: string;
    assetId?: string;
    exceptionType: string;
    minAmountUsd?: number;
    maxAmountUsd?: number;
    approvalLevels?: number;
    customRuleId?: string;
    reason: string;
    expiresAt?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  message: string;
}
```

## 🎨 Interface de Configuração

### 1. Dashboard de Configuração de Aprovação

```typescript
// frontend/src/components/banco/ApprovalConfigurationDashboard.tsx
import React, { useState, useEffect } from 'react';

interface ApprovalConfigurationDashboardProps {
  tenantId: string;
}

export const ApprovalConfigurationDashboard: React.FC<ApprovalConfigurationDashboardProps> = ({ tenantId }) => {
  const [configuration, setConfiguration] = useState(null);
  const [rules, setRules] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfigurationData();
  }, [tenantId]);

  const loadConfigurationData = async () => {
    try {
      const [configResponse, rulesResponse, exceptionsResponse] = await Promise.all([
        fetch('/api/banco/approvals/configuration'),
        fetch('/api/banco/approvals/rules'),
        fetch('/api/banco/approvals/exceptions')
      ]);

      const configData = await configResponse.json();
      const rulesData = await rulesResponse.json();
      const exceptionsData = await exceptionsResponse.json();

      if (configData.success) setConfiguration(configData.config);
      if (rulesData.success) setRules(rulesData.rules);
      if (exceptionsData.success) setExceptions(exceptionsData.exceptions);

    } catch (error) {
      console.error('Error loading configuration data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateConfiguration = async (newConfig: any) => {
    try {
      const response = await fetch('/api/banco/approvals/configuration', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      
      const data = await response.json();
      if (data.success) {
        setConfiguration({ ...configuration, ...newConfig });
      }
    } catch (error) {
      console.error('Error updating configuration:', error);
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="approval-configuration-dashboard">
      <h2>⚙️ Configuração de Aprovação de Saques</h2>
      
      {/* Configuração Geral */}
      <div className="general-configuration">
        <h3>🔧 Configuração Geral</h3>
        <div className="config-grid">
          <div className="config-item">
            <label>
              Limite Padrão de Aprovação (USD):
              <input
                type="number"
                value={configuration?.defaultApprovalLimit || 500}
                onChange={(e) => updateConfiguration({ 
                  defaultApprovalLimit: Number(e.target.value) 
                })}
              />
            </label>
          </div>
          
          <div className="config-item">
            <label>
              Níveis de Aprovação Padrão:
              <select
                value={configuration?.defaultApprovalLevels || 2}
                onChange={(e) => updateConfiguration({ 
                  defaultApprovalLevels: Number(e.target.value) 
                })}
              >
                <option value="0">Sem Aprovação</option>
                <option value="1">Apenas Gerente</option>
                <option value="2">Gerente + CEO</option>
              </select>
            </label>
          </div>
          
          <div className="config-item">
            <label>
              Timeout Padrão (horas):
              <input
                type="number"
                value={configuration?.defaultTimeoutHours || 24}
                onChange={(e) => updateConfiguration({ 
                  defaultTimeoutHours: Number(e.target.value) 
                })}
              />
            </label>
          </div>
          
          <div className="config-item">
            <label>
              <input
                type="checkbox"
                checked={configuration?.autoApproveEnabled || false}
                onChange={(e) => updateConfiguration({ 
                  autoApproveEnabled: e.target.checked 
                })}
              />
              Auto-aprovação Habilitada
            </label>
          </div>
          
          <div className="config-item">
            <label>
              <input
                type="checkbox"
                checked={configuration?.notificationEnabled || true}
                onChange={(e) => updateConfiguration({ 
                  notificationEnabled: e.target.checked 
                })}
              />
              Notificações Habilitadas
            </label>
          </div>
          
          <div className="config-item">
            <label>
              <input
                type="checkbox"
                checked={configuration?.auditEnabled || true}
                onChange={(e) => updateConfiguration({ 
                  auditEnabled: e.target.checked 
                })}
              />
              Auditoria Habilitada
            </label>
          </div>
        </div>
      </div>

      {/* Regras de Aprovação */}
      <div className="approval-rules">
        <h3>📋 Regras de Aprovação</h3>
        <div className="rules-list">
          {rules.map(rule => (
            <div key={rule.id} className="rule-item">
              <div className="rule-header">
                <h4>{rule.ruleName}</h4>
                <span className={`rule-status ${rule.isActive ? 'active' : 'inactive'}`}>
                  {rule.isActive ? '✅ Ativa' : '❌ Inativa'}
                </span>
              </div>
              
              <div className="rule-details">
                <div className="detail-item">
                  <span className="label">Valor Mínimo:</span>
                  <span className="value">${rule.minAmountUsd.toLocaleString()}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Valor Máximo:</span>
                  <span className="value">
                    {rule.maxAmountUsd ? `$${rule.maxAmountUsd.toLocaleString()}` : 'Sem limite'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="label">Níveis de Aprovação:</span>
                  <span className="value">{rule.approvalLevels}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Timeout:</span>
                  <span className="value">{rule.timeoutHours}h</span>
                </div>
                <div className="detail-item">
                  <span className="label">Prioridade:</span>
                  <span className="value">{rule.priority}</span>
                </div>
                {rule.appliesToUser && (
                  <div className="detail-item">
                    <span className="label">Usuário:</span>
                    <span className="value">{rule.appliesToUser.name}</span>
                  </div>
                )}
                {rule.appliesToRole && (
                  <div className="detail-item">
                    <span className="label">Role:</span>
                    <span className="value">{rule.appliesToRole.name}</span>
                  </div>
                )}
                {rule.appliesToAsset && (
                  <div className="detail-item">
                    <span className="label">Ativo:</span>
                    <span className="value">{rule.appliesToAsset.symbol}</span>
                  </div>
                )}
              </div>
              
              <div className="rule-actions">
                <button className="edit-button">✏️ Editar</button>
                <button className="delete-button">🗑️ Excluir</button>
              </div>
            </div>
          ))}
        </div>
        
        <button className="add-rule-button">
          ➕ Adicionar Nova Regra
        </button>
      </div>

      {/* Exceções */}
      <div className="approval-exceptions">
        <h3>⚠️ Exceções de Aprovação</h3>
        <div className="exceptions-list">
          {exceptions.map(exception => (
            <div key={exception.id} className="exception-item">
              <div className="exception-header">
                <h4>Exceção #{exception.id.slice(0, 8)}</h4>
                <span className={`exception-status ${exception.isActive ? 'active' : 'inactive'}`}>
                  {exception.isActive ? '✅ Ativa' : '❌ Inativa'}
                </span>
              </div>
              
              <div className="exception-details">
                <div className="detail-item">
                  <span className="label">Tipo:</span>
                  <span className="value">{exception.exceptionType}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Motivo:</span>
                  <span className="value">{exception.reason}</span>
                </div>
                {exception.minAmountUsd && (
                  <div className="detail-item">
                    <span className="label">Valor Mínimo:</span>
                    <span className="value">${exception.minAmountUsd.toLocaleString()}</span>
                  </div>
                )}
                {exception.maxAmountUsd && (
                  <div className="detail-item">
                    <span className="label">Valor Máximo:</span>
                    <span className="value">${exception.maxAmountUsd.toLocaleString()}</span>
                  </div>
                )}
                {exception.expiresAt && (
                  <div className="detail-item">
                    <span className="label">Expira em:</span>
                    <span className="value">
                      {new Date(exception.expiresAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="exception-actions">
                <button className="edit-button">✏️ Editar</button>
                <button className="delete-button">🗑️ Excluir</button>
              </div>
            </div>
          ))}
        </div>
        
        <button className="add-exception-button">
          ➕ Adicionar Nova Exceção
        </button>
      </div>
    </div>
  );
};
```

## 📋 Checklist de Implementação

### ✅ Sistema de Aprovação de Saques Configurável
- [ ] Withdrawal Request Manager
- [ ] Approval Workflow Engine
- [ ] Manager Approval System
- [ ] CEO Approval System
- [ ] Sistema de notificações
- [ ] Auditoria completa
- [ ] **Configuration Manager**
- [ ] **Approval Rules Engine**
- [ ] **Exception Handler**

### ✅ Funcionalidades Implementadas
- [ ] Criação de solicitações de saque
- [ ] Validação de limites e saldos
- [ ] Fluxo de aprovação duplo (Gerente → CEO)
- [ ] Notificações automáticas
- [ ] Dashboard de aprovação
- [ ] Relatórios e analytics
- [ ] **Configuração de limites personalizável**
- [ ] **Regras de aprovação flexíveis**
- [ ] **Sistema de exceções**
- [ ] **Interface de configuração**

### ✅ Segurança e Validação
- [ ] Validação de saldos
- [ ] Verificação de limites
- [ ] Auditoria de todas as ações
- [ ] Timeouts de aprovação
- [ ] Validação de permissões
- [ ] **Validação de regras configuráveis**
- [ ] **Verificação de exceções**
- [ ] **Auditoria de configurações**

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO