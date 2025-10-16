# Integração do Sistema de Auditoria - BotCriptoFy2

## 🔗 Visão Geral

Sistema de integração que conecta o sistema de auditoria com todos os módulos da plataforma, garantindo que todas as ações dos usuários sejam registradas de forma imutável e acessível.

## 🏗️ Arquitetura de Integração

### Componentes de Integração
- **Audit Middleware**: Middleware para interceptar ações
- **Module Audit Adapters**: Adaptadores para cada módulo
- **Audit Event Bus**: Barramento de eventos de auditoria
- **Audit Sync Service**: Serviço de sincronização
- **Audit Health Monitor**: Monitor de saúde da auditoria

### Estratégia de Integração
- **Interceptação Automática**: Middleware intercepta todas as ações
- **Adaptadores Específicos**: Cada módulo tem seu adaptador
- **Eventos Assíncronos**: Processamento assíncrono de logs
- **Sincronização em Tempo Real**: Logs processados em tempo real
- **Monitoramento Contínuo**: Monitoramento da integridade

## 🔧 Implementação da Integração

### 1. Audit Middleware

```typescript
// backend/src/middleware/audit.middleware.ts
import { Elysia } from 'elysia';
import { AuditLogger } from '../audit/audit-logger';
import { TraderAuditLogger } from '../audit/trader-audit-logger';
import { InfluencerAuditLogger } from '../audit/influencer-audit-logger';

export const auditMiddleware = new Elysia({ name: 'audit' })
  .derive(async ({ request, headers, set }) => {
    const startTime = Date.now();
    
    return {
      auditContext: {
        startTime,
        requestId: crypto.randomUUID(),
        ipAddress: getClientIP(request),
        userAgent: headers['user-agent'],
        location: await getLocationFromIP(getClientIP(request))
      }
    };
  })
  .onAfterHandle(async ({ request, auditContext, set }) => {
    try {
      // Extrair informações da requisição
      const method = request.method;
      const url = new URL(request.url);
      const path = url.pathname;
      const query = Object.fromEntries(url.searchParams);
      
      // Determinar módulo baseado no path
      const module = determineModule(path);
      
      // Determinar tipo de ação
      const actionType = determineActionType(method, path);
      
      // Extrair dados da requisição
      const requestData = await extractRequestData(request);
      
      // Buscar usuário autenticado
      const user = await getAuthenticatedUser(request);
      
      if (!user) {
        return; // Não auditar se usuário não estiver autenticado
      }

      // Determinar tipo de usuário
      const userType = await getUserType(user.id);
      
      // Criar contexto de auditoria
      const auditContext = {
        sessionId: getSessionId(request),
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
        location: auditContext.location,
        deviceInfo: extractDeviceInfo(auditContext.userAgent)
      };

      // Logar ação baseado no tipo de usuário
      if (userType === 'trader') {
        await logTraderAction(user.id, {
          category: determineActionCategory(actionType, module),
          type: actionType,
          resourceType: determineResourceType(path),
          resourceId: extractResourceId(path, requestData),
          module,
          description: generateActionDescription(actionType, path, requestData),
          oldValues: requestData.oldValues,
          newValues: requestData.newValues,
          metadata: {
            method,
            path,
            query,
            responseTime: Date.now() - auditContext.startTime,
            statusCode: set.status || 200
          }
        }, auditContext);
      } else if (userType === 'influencer' || userType === 'partner') {
        await logInfluencerAction(user.id, {
          category: determineActionCategory(actionType, module),
          type: actionType,
          resourceType: determineResourceType(path),
          resourceId: extractResourceId(path, requestData),
          module,
          description: generateActionDescription(actionType, path, requestData),
          oldValues: requestData.oldValues,
          newValues: requestData.newValues,
          metadata: {
            method,
            path,
            query,
            responseTime: Date.now() - auditContext.startTime,
            statusCode: set.status || 200
          }
        }, auditContext);
      } else {
        await logAdminAction(user.id, {
          type: actionType,
          resourceType: determineResourceType(path),
          resourceId: extractResourceId(path, requestData),
          module,
          description: generateActionDescription(actionType, path, requestData),
          oldValues: requestData.oldValues,
          newValues: requestData.newValues,
          metadata: {
            method,
            path,
            query,
            responseTime: Date.now() - auditContext.startTime,
            statusCode: set.status || 200
          }
        }, auditContext);
      }

    } catch (error) {
      console.error('Error in audit middleware:', error);
      // Não falhar a requisição por erro de auditoria
    }
  });

// Funções auxiliares
function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('x-remote-addr');
  
  return forwarded?.split(',')[0] || realIP || remoteAddr || 'unknown';
}

async function getLocationFromIP(ip: string): Promise<any> {
  // Implementar geolocalização por IP
  return {
    country: 'BR',
    region: 'SP',
    city: 'São Paulo',
    coordinates: { lat: -23.5505, lng: -46.6333 }
  };
}

function determineModule(path: string): string {
  const pathSegments = path.split('/').filter(Boolean);
  
  if (pathSegments.includes('financeiro')) return 'financeiro';
  if (pathSegments.includes('marketing')) return 'marketing';
  if (pathSegments.includes('vendas')) return 'vendas';
  if (pathSegments.includes('seguranca')) return 'seguranca';
  if (pathSegments.includes('sac')) return 'sac';
  if (pathSegments.includes('auditoria')) return 'auditoria';
  if (pathSegments.includes('documentos')) return 'documentos';
  if (pathSegments.includes('configuracoes')) return 'configuracoes';
  if (pathSegments.includes('assinaturas')) return 'assinaturas';
  if (pathSegments.includes('ceo')) return 'ceo';
  if (pathSegments.includes('affiliate')) return 'affiliate';
  if (pathSegments.includes('mmn')) return 'mmn';
  if (pathSegments.includes('notificacoes')) return 'notificacoes';
  
  return 'unknown';
}

function determineActionType(method: string, path: string): string {
  if (method === 'GET') return 'view';
  if (method === 'POST') return 'create';
  if (method === 'PUT' || method === 'PATCH') return 'update';
  if (method === 'DELETE') return 'delete';
  if (path.includes('export')) return 'export';
  if (path.includes('import')) return 'import';
  if (path.includes('login')) return 'login';
  if (path.includes('logout')) return 'logout';
  
  return 'unknown';
}

function determineActionCategory(actionType: string, module: string): string {
  if (actionType === 'login' || actionType === 'logout') return 'security';
  if (module === 'financeiro' && ['create', 'update', 'delete'].includes(actionType)) return 'financial';
  if (module === 'affiliate' || module === 'mmn') return 'affiliate';
  if (actionType === 'export' || actionType === 'import') return 'data';
  
  return 'general';
}

function determineResourceType(path: string): string {
  const pathSegments = path.split('/').filter(Boolean);
  const resource = pathSegments[pathSegments.length - 1];
  
  // Mapear recursos comuns
  const resourceMap: Record<string, string> = {
    'users': 'user',
    'transactions': 'transaction',
    'affiliates': 'affiliate',
    'invites': 'invite',
    'trees': 'tree',
    'nodes': 'node',
    'notifications': 'notification',
    'reports': 'report',
    'exports': 'export'
  };
  
  return resourceMap[resource] || 'unknown';
}

function extractResourceId(path: string, requestData: any): string | undefined {
  const pathSegments = path.split('/').filter(Boolean);
  const idSegment = pathSegments.find(segment => 
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)
  );
  
  return idSegment || requestData.id || requestData.resourceId;
}

function generateActionDescription(actionType: string, path: string, requestData: any): string {
  const resourceType = determineResourceType(path);
  const resourceId = extractResourceId(path, requestData);
  
  const descriptions: Record<string, string> = {
    'view': `Visualizou ${resourceType}${resourceId ? ` ${resourceId}` : ''}`,
    'create': `Criou ${resourceType}${resourceId ? ` ${resourceId}` : ''}`,
    'update': `Atualizou ${resourceType}${resourceId ? ` ${resourceId}` : ''}`,
    'delete': `Deletou ${resourceType}${resourceId ? ` ${resourceId}` : ''}`,
    'export': `Exportou dados de ${resourceType}`,
    'import': `Importou dados para ${resourceType}`,
    'login': 'Fez login no sistema',
    'logout': 'Fez logout do sistema'
  };
  
  return descriptions[actionType] || `${actionType} em ${resourceType}`;
}

async function extractRequestData(request: Request): Promise<any> {
  try {
    if (request.method === 'GET') {
      const url = new URL(request.url);
      return Object.fromEntries(url.searchParams);
    } else {
      const body = await request.json();
      return body;
    }
  } catch {
    return {};
  }
}

async function getAuthenticatedUser(request: Request): Promise<any> {
  // Implementar autenticação
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  
  // Verificar token e retornar usuário
  return null; // Placeholder
}

async function getUserType(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { affiliateUser: true }
  });
  
  if (!user) return 'unknown';
  if (user.affiliateUser) return user.affiliateUser.userType;
  return 'admin';
}

function getSessionId(request: Request): string {
  return request.headers.get('x-session-id') || 'unknown';
}

function extractDeviceInfo(userAgent: string): any {
  // Implementar extração de informações do dispositivo
  return {
    type: 'desktop',
    os: 'Windows',
    browser: 'Chrome',
    version: '120.0'
  };
}
```

### 2. Module Audit Adapters

```typescript
// backend/src/audit/adapters/financeiro-audit.adapter.ts
import { AuditLogger } from '../audit-logger';
import { prisma } from '../../db';

export class FinanceiroAuditAdapter {
  private auditLogger: AuditLogger;

  constructor() {
    this.auditLogger = new AuditLogger();
  }

  async logTransactionCreation(
    userId: string,
    transactionData: any,
    context: any
  ) {
    await this.auditLogger.logAction(userId, {
      type: 'create',
      resourceType: 'transaction',
      resourceId: transactionData.id,
      module: 'financeiro',
      description: `Criou transação de ${transactionData.amount} ${transactionData.currency}`,
      newValues: this.sanitizeTransactionData(transactionData),
      metadata: {
        transactionType: transactionData.type,
        amount: transactionData.amount,
        currency: transactionData.currency,
        gateway: transactionData.gateway
      }
    }, context);
  }

  async logTransactionUpdate(
    userId: string,
    transactionId: string,
    oldData: any,
    newData: any,
    context: any
  ) {
    await this.auditLogger.logAction(userId, {
      type: 'update',
      resourceType: 'transaction',
      resourceId: transactionId,
      module: 'financeiro',
      description: `Atualizou transação ${transactionId}`,
      oldValues: this.sanitizeTransactionData(oldData),
      newValues: this.sanitizeTransactionData(newData),
      metadata: {
        changedFields: this.getChangedFields(oldData, newData)
      }
    }, context);
  }

  async logPaymentProcessing(
    userId: string,
    paymentData: any,
    context: any
  ) {
    await this.auditLogger.logAction(userId, {
      type: 'payment_process',
      resourceType: 'payment',
      resourceId: paymentData.id,
      module: 'financeiro',
      description: `Processou pagamento via ${paymentData.gateway}`,
      newValues: this.sanitizePaymentData(paymentData),
      metadata: {
        gateway: paymentData.gateway,
        amount: paymentData.amount,
        currency: paymentData.currency,
        status: paymentData.status
      }
    }, context);
  }

  private sanitizeTransactionData(data: any): any {
    if (!data) return data;

    const sanitized = { ...data };
    
    // Remover dados sensíveis
    delete sanitized.creditCard;
    delete sanitized.cvv;
    delete sanitized.expiryDate;
    delete sanitized.cardNumber;
    
    return sanitized;
  }

  private sanitizePaymentData(data: any): any {
    if (!data) return data;

    const sanitized = { ...data };
    
    // Remover dados sensíveis
    delete sanitized.paymentMethod;
    delete sanitized.cardDetails;
    delete sanitized.bankAccount;
    
    return sanitized;
  }

  private getChangedFields(oldData: any, newData: any): string[] {
    const changedFields: string[] = [];
    
    for (const key in newData) {
      if (oldData[key] !== newData[key]) {
        changedFields.push(key);
      }
    }
    
    return changedFields;
  }
}
```

```typescript
// backend/src/audit/adapters/affiliate-audit.adapter.ts
import { TraderAuditLogger } from '../trader-audit-logger';
import { InfluencerAuditLogger } from '../influencer-audit-logger';
import { AuditLogger } from '../audit-logger';

export class AffiliateAuditAdapter {
  private traderAuditLogger: TraderAuditLogger;
  private influencerAuditLogger: InfluencerAuditLogger;
  private auditLogger: AuditLogger;

  constructor() {
    this.traderAuditLogger = new TraderAuditLogger();
    this.influencerAuditLogger = new InfluencerAuditLogger();
    this.auditLogger = new AuditLogger();
  }

  async logAffiliateRegistration(
    userId: string,
    userType: string,
    affiliateData: any,
    context: any
  ) {
    const action = {
      category: 'affiliate' as const,
      type: 'register',
      resourceType: 'affiliate',
      resourceId: affiliateData.id,
      module: 'affiliate',
      description: `Registrou-se como afiliado ${userType}`,
      newValues: this.sanitizeAffiliateData(affiliateData),
      metadata: {
        userType,
        affiliateCode: affiliateData.affiliateCode,
        inviteLimit: affiliateData.inviteLimit
      }
    };

    if (userType === 'trader') {
      await this.traderAuditLogger.logTraderAction(userId, action, context);
    } else if (userType === 'influencer' || userType === 'partner') {
      await this.influencerAuditLogger.logInfluencerAction(userId, action, context);
    } else {
      await this.auditLogger.logAction(userId, action, context);
    }
  }

  async logInviteCreation(
    userId: string,
    userType: string,
    inviteData: any,
    context: any
  ) {
    const action = {
      category: 'affiliate' as const,
      type: 'create_invite',
      resourceType: 'invite',
      resourceId: inviteData.id,
      module: 'affiliate',
      description: `Criou convite de afiliado`,
      newValues: this.sanitizeInviteData(inviteData),
      metadata: {
        inviteCode: inviteData.inviteCode,
        expiresAt: inviteData.expiresAt
      }
    };

    if (userType === 'trader') {
      await this.traderAuditLogger.logTraderAction(userId, action, context);
    } else if (userType === 'influencer' || userType === 'partner') {
      await this.influencerAuditLogger.logInfluencerAction(userId, action, context);
    } else {
      await this.auditLogger.logAction(userId, action, context);
    }
  }

  async logCommissionCalculation(
    userId: string,
    commissionData: any,
    context: any
  ) {
    const action = {
      category: 'financial' as const,
      type: 'calculate_commission',
      resourceType: 'commission',
      resourceId: commissionData.id,
      module: 'affiliate',
      description: `Calculou comissão de ${commissionData.amount}`,
      newValues: this.sanitizeCommissionData(commissionData),
      metadata: {
        level: commissionData.level,
        percentage: commissionData.percentage,
        baseAmount: commissionData.baseAmount
      }
    };

    if (userType === 'trader') {
      await this.traderAuditLogger.logTraderAction(userId, action, context);
    } else if (userType === 'influencer' || userType === 'partner') {
      await this.influencerAuditLogger.logInfluencerAction(userId, action, context);
    } else {
      await this.auditLogger.logAction(userId, action, context);
    }
  }

  private sanitizeAffiliateData(data: any): any {
    if (!data) return data;

    const sanitized = { ...data };
    
    // Manter apenas dados não sensíveis
    return {
      id: sanitized.id,
      affiliateCode: sanitized.affiliateCode,
      userType: sanitized.userType,
      inviteLimit: sanitized.inviteLimit,
      isActive: sanitized.isActive,
      createdAt: sanitized.createdAt
    };
  }

  private sanitizeInviteData(data: any): any {
    if (!data) return data;

    const sanitized = { ...data };
    
    return {
      id: sanitized.id,
      inviteCode: sanitized.inviteCode,
      status: sanitized.status,
      expiresAt: sanitized.expiresAt,
      createdAt: sanitized.createdAt
    };
  }

  private sanitizeCommissionData(data: any): any {
    if (!data) return data;

    const sanitized = { ...data };
    
    return {
      id: sanitized.id,
      level: sanitized.level,
      percentage: sanitized.percentage,
      amount: sanitized.amount,
      baseAmount: sanitized.baseAmount,
      status: sanitized.status,
      createdAt: sanitized.createdAt
    };
  }
}
```

### 3. Audit Event Bus

```typescript
// backend/src/audit/audit-event-bus.ts
import { EventEmitter } from 'events';
import { AuditLogger } from './audit-logger';
import { TraderAuditLogger } from './trader-audit-logger';
import { InfluencerAuditLogger } from './influencer-audit-logger';

export class AuditEventBus extends EventEmitter {
  private auditLogger: AuditLogger;
  private traderAuditLogger: TraderAuditLogger;
  private influencerAuditLogger: InfluencerAuditLogger;

  constructor() {
    super();
    this.auditLogger = new AuditLogger();
    this.traderAuditLogger = new TraderAuditLogger();
    this.influencerAuditLogger = new InfluencerAuditLogger();
    
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Eventos de usuário
    this.on('user.created', this.handleUserCreated.bind(this));
    this.on('user.updated', this.handleUserUpdated.bind(this));
    this.on('user.deleted', this.handleUserDeleted.bind(this));
    
    // Eventos de transação
    this.on('transaction.created', this.handleTransactionCreated.bind(this));
    this.on('transaction.updated', this.handleTransactionUpdated.bind(this));
    this.on('transaction.deleted', this.handleTransactionDeleted.bind(this));
    
    // Eventos de afiliado
    this.on('affiliate.registered', this.handleAffiliateRegistered.bind(this));
    this.on('affiliate.invite_created', this.handleInviteCreated.bind(this));
    this.on('affiliate.invite_accepted', this.handleInviteAccepted.bind(this));
    this.on('affiliate.invite_revoked', this.handleInviteRevoked.bind(this));
    
    // Eventos de comissão
    this.on('commission.calculated', this.handleCommissionCalculated.bind(this));
    this.on('commission.paid', this.handleCommissionPaid.bind(this));
    
    // Eventos de árvore MMN
    this.on('mmn.tree_created', this.handleTreeCreated.bind(this));
    this.on('mmn.node_added', this.handleNodeAdded.bind(this));
    this.on('mmn.node_removed', this.handleNodeRemoved.bind(this));
    this.on('mmn.subtree_reconnected', this.handleSubtreeReconnected.bind(this));
    
    // Eventos de notificação
    this.on('notification.sent', this.handleNotificationSent.bind(this));
    this.on('notification.delivered', this.handleNotificationDelivered.bind(this));
    this.on('notification.read', this.handleNotificationRead.bind(this));
  }

  private async handleUserCreated(data: any) {
    await this.auditLogger.logAction(data.userId, {
      type: 'create',
      resourceType: 'user',
      resourceId: data.userId,
      module: 'admin',
      description: 'Usuário criado',
      newValues: this.sanitizeUserData(data.userData),
      metadata: data.metadata
    }, data.context);
  }

  private async handleUserUpdated(data: any) {
    await this.auditLogger.logAction(data.userId, {
      type: 'update',
      resourceType: 'user',
      resourceId: data.userId,
      module: 'admin',
      description: 'Usuário atualizado',
      oldValues: this.sanitizeUserData(data.oldData),
      newValues: this.sanitizeUserData(data.newData),
      metadata: data.metadata
    }, data.context);
  }

  private async handleUserDeleted(data: any) {
    await this.auditLogger.logAction(data.userId, {
      type: 'delete',
      resourceType: 'user',
      resourceId: data.userId,
      module: 'admin',
      description: 'Usuário deletado',
      oldValues: this.sanitizeUserData(data.userData),
      metadata: data.metadata
    }, data.context);
  }

  private async handleTransactionCreated(data: any) {
    const userType = await this.getUserType(data.userId);
    
    if (userType === 'trader') {
      await this.traderAuditLogger.logTraderAction(data.userId, {
        category: 'financial',
        type: 'create',
        resourceType: 'transaction',
        resourceId: data.transactionId,
        module: 'financeiro',
        description: 'Transação criada',
        newValues: this.sanitizeTransactionData(data.transactionData),
        metadata: data.metadata
      }, data.context);
    } else {
      await this.auditLogger.logAction(data.userId, {
        type: 'create',
        resourceType: 'transaction',
        resourceId: data.transactionId,
        module: 'financeiro',
        description: 'Transação criada',
        newValues: this.sanitizeTransactionData(data.transactionData),
        metadata: data.metadata
      }, data.context);
    }
  }

  private async handleAffiliateRegistered(data: any) {
    const userType = data.userType;
    
    if (userType === 'trader') {
      await this.traderAuditLogger.logTraderAction(data.userId, {
        category: 'affiliate',
        type: 'register',
        resourceType: 'affiliate',
        resourceId: data.affiliateId,
        module: 'affiliate',
        description: 'Registrado como afiliado trader',
        newValues: this.sanitizeAffiliateData(data.affiliateData),
        metadata: data.metadata
      }, data.context);
    } else if (userType === 'influencer' || userType === 'partner') {
      await this.influencerAuditLogger.logInfluencerAction(data.userId, {
        category: 'affiliate',
        type: 'register',
        resourceType: 'affiliate',
        resourceId: data.affiliateId,
        module: 'affiliate',
        description: `Registrado como afiliado ${userType}`,
        newValues: this.sanitizeAffiliateData(data.affiliateData),
        metadata: data.metadata
      }, data.context);
    }
  }

  private async handleInviteCreated(data: any) {
    const userType = await this.getUserType(data.userId);
    
    if (userType === 'trader') {
      await this.traderAuditLogger.logTraderAction(data.userId, {
        category: 'affiliate',
        type: 'create_invite',
        resourceType: 'invite',
        resourceId: data.inviteId,
        module: 'affiliate',
        description: 'Convite de afiliado criado',
        newValues: this.sanitizeInviteData(data.inviteData),
        metadata: data.metadata
      }, data.context);
    } else if (userType === 'influencer' || userType === 'partner') {
      await this.influencerAuditLogger.logInfluencerAction(data.userId, {
        category: 'affiliate',
        type: 'create_invite',
        resourceType: 'invite',
        resourceId: data.inviteId,
        module: 'affiliate',
        description: 'Convite de afiliado criado',
        newValues: this.sanitizeInviteData(data.inviteData),
        metadata: data.metadata
      }, data.context);
    }
  }

  private async handleCommissionCalculated(data: any) {
    const userType = await this.getUserType(data.userId);
    
    if (userType === 'trader') {
      await this.traderAuditLogger.logTraderAction(data.userId, {
        category: 'financial',
        type: 'calculate_commission',
        resourceType: 'commission',
        resourceId: data.commissionId,
        module: 'affiliate',
        description: 'Comissão calculada',
        newValues: this.sanitizeCommissionData(data.commissionData),
        metadata: data.metadata
      }, data.context);
    } else if (userType === 'influencer' || userType === 'partner') {
      await this.influencerAuditLogger.logInfluencerAction(data.userId, {
        category: 'financial',
        type: 'calculate_commission',
        resourceType: 'commission',
        resourceId: data.commissionId,
        module: 'affiliate',
        description: 'Comissão calculada',
        newValues: this.sanitizeCommissionData(data.commissionData),
        metadata: data.metadata
      }, data.context);
    }
  }

  private async handleTreeCreated(data: any) {
    await this.auditLogger.logAction(data.userId, {
      type: 'create',
      resourceType: 'tree',
      resourceId: data.treeId,
      module: 'mmn',
      description: 'Árvore MMN criada',
      newValues: this.sanitizeTreeData(data.treeData),
      metadata: data.metadata
    }, data.context);
  }

  private async handleNodeAdded(data: any) {
    await this.auditLogger.logAction(data.userId, {
      type: 'create',
      resourceType: 'node',
      resourceId: data.nodeId,
      module: 'mmn',
      description: 'Nó adicionado à árvore MMN',
      newValues: this.sanitizeNodeData(data.nodeData),
      metadata: data.metadata
    }, data.context);
  }

  private async handleNodeRemoved(data: any) {
    await this.auditLogger.logAction(data.userId, {
      type: 'delete',
      resourceType: 'node',
      resourceId: data.nodeId,
      module: 'mmn',
      description: 'Nó removido da árvore MMN',
      oldValues: this.sanitizeNodeData(data.nodeData),
      metadata: data.metadata
    }, data.context);
  }

  private async handleSubtreeReconnected(data: any) {
    await this.auditLogger.logAction(data.userId, {
      type: 'reconnect_subtree',
      resourceType: 'tree',
      resourceId: data.treeId,
      module: 'mmn',
      description: 'Sub-árvore reconectada à raiz',
      metadata: {
        ...data.metadata,
        reconnectedNodes: data.reconnectedNodes
      }
    }, data.context);
  }

  private async handleNotificationSent(data: any) {
    await this.auditLogger.logAction(data.userId, {
      type: 'send_notification',
      resourceType: 'notification',
      resourceId: data.notificationId,
      module: 'notificacoes',
      description: 'Notificação enviada',
      newValues: this.sanitizeNotificationData(data.notificationData),
      metadata: data.metadata
    }, data.context);
  }

  // Funções auxiliares
  private async getUserType(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { affiliateUser: true }
    });
    
    if (!user) return 'unknown';
    if (user.affiliateUser) return user.affiliateUser.userType;
    return 'admin';
  }

  private sanitizeUserData(data: any): any {
    if (!data) return data;
    
    const sanitized = { ...data };
    delete sanitized.password;
    delete sanitized.tokens;
    return sanitized;
  }

  private sanitizeTransactionData(data: any): any {
    if (!data) return data;
    
    const sanitized = { ...data };
    delete sanitized.creditCard;
    delete sanitized.cvv;
    return sanitized;
  }

  private sanitizeAffiliateData(data: any): any {
    if (!data) return data;
    
    return {
      id: data.id,
      affiliateCode: data.affiliateCode,
      userType: data.userType,
      inviteLimit: data.inviteLimit,
      isActive: data.isActive
    };
  }

  private sanitizeInviteData(data: any): any {
    if (!data) return data;
    
    return {
      id: data.id,
      inviteCode: data.inviteCode,
      status: data.status,
      expiresAt: data.expiresAt
    };
  }

  private sanitizeCommissionData(data: any): any {
    if (!data) return data;
    
    return {
      id: data.id,
      level: data.level,
      percentage: data.percentage,
      amount: data.amount,
      status: data.status
    };
  }

  private sanitizeTreeData(data: any): any {
    if (!data) return data;
    
    return {
      id: data.id,
      name: data.name,
      maxDepth: data.maxDepth,
      isActive: data.isActive
    };
  }

  private sanitizeNodeData(data: any): any {
    if (!data) return data;
    
    return {
      id: data.id,
      level: data.level,
      position: data.position,
      path: data.path,
      isActive: data.isActive
    };
  }

  private sanitizeNotificationData(data: any): any {
    if (!data) return data;
    
    return {
      id: data.id,
      type: data.type,
      channel: data.channel,
      status: data.status,
      recipient: data.recipient
    };
  }
}
```

## 🔧 APIs de Integração

### 1. Audit Integration APIs

#### POST /api/audit/integration/emit-event
Emitir evento de auditoria

```typescript
interface EmitAuditEventRequest {
  eventType: string;
  userId: string;
  data: any;
  context: any;
}

interface EmitAuditEventResponse {
  success: boolean;
  message: string;
}
```

#### GET /api/audit/integration/health
Verificar saúde da integração de auditoria

```typescript
interface AuditHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  modules: {
    name: string;
    status: 'up' | 'down';
    lastCheck: string;
    error?: string;
  }[];
  metrics: {
    totalLogs: number;
    logsPerMinute: number;
    errorRate: number;
    averageProcessingTime: number;
  };
}
```

### 2. Module Integration APIs

#### POST /api/audit/integration/modules/{module}/sync
Sincronizar logs de auditoria de um módulo

```typescript
interface SyncModuleAuditRequest {
  module: string;
  startDate?: string;
  endDate?: string;
  force?: boolean;
}

interface SyncModuleAuditResponse {
  success: boolean;
  syncedLogs: number;
  errors: string[];
  message: string;
}
```

## 🧪 Testes de Integração

### Testes de Middleware

```typescript
// tests/integration/audit-middleware.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { Elysia } from 'elysia';
import { auditMiddleware } from '../../src/middleware/audit.middleware';
import { prisma } from '../setup';

describe('Audit Middleware', () => {
  let app: Elysia;

  beforeEach(() => {
    app = new Elysia()
      .use(auditMiddleware)
      .get('/test', () => ({ message: 'test' }));
  });

  it('should log audit for authenticated user', async () => {
    // Mock authenticated user
    const response = await app.handle(
      new Request('http://localhost:3000/test', {
        headers: {
          'authorization': 'Bearer valid-token',
          'x-session-id': 'session-123'
        }
      })
    );

    expect(response.status).toBe(200);

    // Verificar se log foi criado
    const logs = await prisma.auditLog.findMany({
      where: { module: 'unknown' }
    });

    expect(logs.length).toBeGreaterThan(0);
  });

  it('should not log audit for unauthenticated user', async () => {
    const response = await app.handle(
      new Request('http://localhost:3000/test')
    );

    expect(response.status).toBe(200);

    // Verificar se nenhum log foi criado
    const logs = await prisma.auditLog.findMany({
      where: { module: 'unknown' }
    });

    expect(logs.length).toBe(0);
  });
});
```

## 📋 Checklist de Integração

### ✅ Configuração Inicial
- [ ] Configurar middleware de auditoria
- [ ] Criar adaptadores para cada módulo
- [ ] Configurar event bus
- [ ] Configurar sincronização

### ✅ Funcionalidades
- [ ] Interceptação automática de ações
- [ ] Logging baseado no tipo de usuário
- [ ] Sincronização em tempo real
- [ ] Monitoramento de saúde

### ✅ APIs
- [ ] APIs de integração
- [ ] APIs de sincronização
- [ ] APIs de monitoramento
- [ ] APIs de eventos

### ✅ Testes
- [ ] Testes de middleware
- [ ] Testes de adaptadores
- [ ] Testes de event bus
- [ ] Testes de sincronização

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO