# Sistema de Convites de Afiliados - BotCriptoFy2

## 🎯 Visão Geral

Sistema de convites robusto que permite aos afiliados criar, gerenciar e rastrear convites, com diferentes limitações baseadas no tipo de usuário e funcionalidades avançadas de gestão.

## 🏗️ Arquitetura do Sistema de Convites

### Componentes Principais
- **Invite Manager**: Gerenciador central de convites
- **Invite Generator**: Gerador de códigos e URLs únicos
- **Invite Tracker**: Rastreador de status e conversões
- **Invite Validator**: Validador de convites e limitações
- **Invite Analytics**: Analítico de performance de convites

### Funcionalidades Principais
- **Criação de Convites**: Geração de códigos únicos
- **Gestão de Limites**: Controle por tipo de usuário
- **Rastreamento**: Acompanhamento de status
- **Revogação**: Revogar convites a qualquer momento
- **Reutilização**: Reutilizar convites revogados
- **Analytics**: Métricas de performance

## 📊 Limitações por Tipo de Usuário

### **Traders (5 convites limitados)**
- **Limite**: 5 convites ativos simultaneamente
- **Gestão**: Pode revogar e reutilizar convites
- **Controle**: Controle total sobre seus convites
- **Renovação**: Convites expirados liberam slot

### **Influencers (convites ilimitados)**
- **Limite**: Sem limite de convites
- **Gestão**: Pode criar quantos convites quiser
- **Controle**: Controle total sobre seus convites
- **Escalabilidade**: Suporte a grandes volumes

### **Parceiros (convites ilimitados)**
- **Limite**: Sem limite de convites
- **Gestão**: Pode criar quantos convites quiser
- **Controle**: Controle total sobre seus convites
- **Escalabilidade**: Suporte a grandes volumes

## 🔧 Implementação do Sistema

### 1. Invite Manager

```typescript
// backend/src/affiliate/invite-manager.ts
import { prisma } from '../db';
import { randomBytes } from 'crypto';

export class InviteManager {
  async createInvite(
    affiliateUserId: string,
    options: {
      expiresInDays?: number;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<{
    success: boolean;
    inviteId?: string;
    inviteCode?: string;
    inviteUrl?: string;
    expiresAt?: Date;
    message: string;
  }> {
    try {
      // Verificar se o afiliado existe e está ativo
      const affiliate = await prisma.affiliateUser.findUnique({
        where: { id: affiliateUserId }
      });

      if (!affiliate) {
        return { success: false, message: 'Affiliate not found' };
      }

      if (!affiliate.isActive) {
        return { success: false, message: 'Affiliate is not active' };
      }

      // Verificar limite de convites para traders
      if (affiliate.userType === 'trader' && affiliate.inviteLimit !== null) {
        const activeInvites = await prisma.affiliateInvite.count({
          where: {
            affiliateUserId,
            status: { in: ['pending', 'accepted'] }
          }
        });

        if (activeInvites >= affiliate.inviteLimit) {
          return { 
            success: false, 
            message: `Invite limit reached. Maximum ${affiliate.inviteLimit} invites allowed.` 
          };
        }
      }

      // Gerar código único
      const inviteCode = await this.generateUniqueInviteCode();
      const inviteUrl = `${process.env.FRONTEND_URL}/invite/${inviteCode}`;
      
      // Calcular data de expiração
      const expiresInDays = options.expiresInDays || 30;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      // Criar convite
      const invite = await prisma.affiliateInvite.create({
        data: {
          affiliateUserId,
          inviteCode,
          inviteUrl,
          status: 'pending',
          expiresAt,
          metadata: options.metadata || {}
        }
      });

      return {
        success: true,
        inviteId: invite.id,
        inviteCode: invite.inviteCode,
        inviteUrl: invite.inviteUrl,
        expiresAt: invite.expiresAt,
        message: 'Invite created successfully'
      };

    } catch (error) {
      console.error('Error creating invite:', error);
      return { 
        success: false, 
        message: 'Failed to create invite' 
      };
    }
  }

  async getInvites(
    affiliateUserId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
    } = {}
  ) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { affiliateUserId };
    if (options.status) {
      where.status = options.status;
    }

    const [invites, total] = await Promise.all([
      prisma.affiliateInvite.findMany({
        where,
        include: {
          invitedUser: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.affiliateInvite.count({ where })
    ]);

    return {
      invites: invites.map(invite => ({
        id: invite.id,
        inviteCode: invite.inviteCode,
        inviteUrl: invite.inviteUrl,
        status: invite.status,
        expiresAt: invite.expiresAt,
        acceptedAt: invite.acceptedAt,
        revokedAt: invite.revokedAt,
        invitedUser: invite.invitedUser,
        metadata: invite.metadata,
        createdAt: invite.createdAt
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async revokeInvite(inviteId: string, affiliateUserId: string) {
    try {
      const invite = await prisma.affiliateInvite.findFirst({
        where: {
          id: inviteId,
          affiliateUserId,
          status: { in: ['pending', 'accepted'] }
        }
      });

      if (!invite) {
        return { success: false, message: 'Invite not found or already processed' };
      }

      // Revogar convite
      await prisma.affiliateInvite.update({
        where: { id: inviteId },
        data: {
          status: 'revoked',
          revokedAt: new Date()
        }
      });

      // Se o convite foi aceito, remover relacionamento de afiliado
      if (invite.status === 'accepted' && invite.invitedUserId) {
        await prisma.affiliateRelationship.deleteMany({
          where: {
            inviteId: inviteId
          }
        });
      }

      return { success: true, message: 'Invite revoked successfully' };

    } catch (error) {
      console.error('Error revoking invite:', error);
      return { success: false, message: 'Failed to revoke invite' };
    }
  }

  async reuseInvite(inviteId: string, affiliateUserId: string) {
    try {
      const invite = await prisma.affiliateInvite.findFirst({
        where: {
          id: inviteId,
          affiliateUserId,
          status: 'revoked'
        }
      });

      if (!invite) {
        return { success: false, message: 'Revoked invite not found' };
      }

      // Verificar limite de convites para traders
      const affiliate = await prisma.affiliateUser.findUnique({
        where: { id: affiliateUserId }
      });

      if (affiliate?.userType === 'trader' && affiliate.inviteLimit !== null) {
        const activeInvites = await prisma.affiliateInvite.count({
          where: {
            affiliateUserId,
            status: { in: ['pending', 'accepted'] }
          }
        });

        if (activeInvites >= affiliate.inviteLimit) {
          return { 
            success: false, 
            message: `Invite limit reached. Maximum ${affiliate.inviteLimit} invites allowed.` 
          };
        }
      }

      // Gerar novo código e URL
      const newInviteCode = await this.generateUniqueInviteCode();
      const newInviteUrl = `${process.env.FRONTEND_URL}/invite/${newInviteCode}`;
      
      // Calcular nova data de expiração
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Reutilizar convite
      const updatedInvite = await prisma.affiliateInvite.update({
        where: { id: inviteId },
        data: {
          inviteCode: newInviteCode,
          inviteUrl: newInviteUrl,
          status: 'pending',
          expiresAt,
          revokedAt: null,
          acceptedAt: null,
          invitedUserId: null
        }
      });

      return {
        success: true,
        inviteId: updatedInvite.id,
        inviteCode: updatedInvite.inviteCode,
        inviteUrl: updatedInvite.inviteUrl,
        expiresAt: updatedInvite.expiresAt,
        message: 'Invite reused successfully'
      };

    } catch (error) {
      console.error('Error reusing invite:', error);
      return { success: false, message: 'Failed to reuse invite' };
    }
  }

  async acceptInvite(inviteCode: string, userId: string) {
    try {
      // Buscar convite
      const invite = await prisma.affiliateInvite.findUnique({
        where: { inviteCode },
        include: {
          affiliateUser: true
        }
      });

      if (!invite) {
        return { success: false, message: 'Invalid invite code' };
      }

      if (invite.status !== 'pending') {
        return { success: false, message: 'Invite is not pending' };
      }

      if (invite.expiresAt && invite.expiresAt < new Date()) {
        return { success: false, message: 'Invite has expired' };
      }

      // Verificar se o usuário já é afiliado
      const existingAffiliate = await prisma.affiliateUser.findUnique({
        where: { userId }
      });

      if (existingAffiliate) {
        return { success: false, message: 'User is already an affiliate' };
      }

      // Aceitar convite
      await prisma.affiliateInvite.update({
        where: { id: invite.id },
        data: {
          status: 'accepted',
          acceptedAt: new Date(),
          invitedUserId: userId
        }
      });

      // Criar relacionamento de afiliado
      await prisma.affiliateRelationship.create({
        data: {
          affiliateUserId: invite.affiliateUserId,
          referredUserId: userId,
          level: 1,
          inviteId: invite.id
        }
      });

      return { success: true, message: 'Invite accepted successfully' };

    } catch (error) {
      console.error('Error accepting invite:', error);
      return { success: false, message: 'Failed to accept invite' };
    }
  }

  private async generateUniqueInviteCode(): Promise<string> {
    let code: string;
    let isUnique = false;

    while (!isUnique) {
      code = randomBytes(8).toString('hex').toUpperCase();
      const existing = await prisma.affiliateInvite.findUnique({
        where: { inviteCode: code }
      });
      isUnique = !existing;
    }

    return code!;
  }
}
```

### 2. Invite Analytics

```typescript
// backend/src/affiliate/invite-analytics.ts
export class InviteAnalytics {
  async getInviteStats(affiliateUserId: string, period: 'week' | 'month' | 'year' = 'month') {
    const startDate = this.getStartDate(period);
    const endDate = new Date();

    const stats = await prisma.affiliateInvite.groupBy({
      by: ['status'],
      where: {
        affiliateUserId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: {
        id: true
      }
    });

    const totalInvites = stats.reduce((sum, stat) => sum + stat._count.id, 0);
    const acceptedInvites = stats.find(s => s.status === 'accepted')?._count.id || 0;
    const pendingInvites = stats.find(s => s.status === 'pending')?._count.id || 0;
    const revokedInvites = stats.find(s => s.status === 'revoked')?._count.id || 0;
    const expiredInvites = stats.find(s => s.status === 'expired')?._count.id || 0;

    const conversionRate = totalInvites > 0 ? (acceptedInvites / totalInvites) * 100 : 0;

    return {
      totalInvites,
      acceptedInvites,
      pendingInvites,
      revokedInvites,
      expiredInvites,
      conversionRate: Math.round(conversionRate * 100) / 100
    };
  }

  async getInvitePerformance(affiliateUserId: string, limit: number = 10) {
    const invites = await prisma.affiliateInvite.findMany({
      where: { affiliateUserId },
      include: {
        invitedUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return invites.map(invite => ({
      id: invite.id,
      inviteCode: invite.inviteCode,
      status: invite.status,
      createdAt: invite.createdAt,
      acceptedAt: invite.acceptedAt,
      invitedUser: invite.invitedUser,
      daysToAccept: invite.acceptedAt 
        ? Math.ceil((invite.acceptedAt.getTime() - invite.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        : null
    }));
  }

  async getTopPerformingInvites(affiliateUserId: string, limit: number = 5) {
    const invites = await prisma.affiliateInvite.findMany({
      where: {
        affiliateUserId,
        status: 'accepted'
      },
      include: {
        invitedUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { acceptedAt: 'desc' },
      take: limit
    });

    return invites.map(invite => ({
      id: invite.id,
      inviteCode: invite.inviteCode,
      acceptedAt: invite.acceptedAt,
      invitedUser: invite.invitedUser,
      daysToAccept: Math.ceil((invite.acceptedAt!.getTime() - invite.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    }));
  }

  private getStartDate(period: string): Date {
    const now = new Date();
    switch (period) {
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
}
```

### 3. Invite Validator

```typescript
// backend/src/affiliate/invite-validator.ts
export class InviteValidator {
  async validateInviteCreation(
    affiliateUserId: string,
    options: {
      expiresInDays?: number;
      metadata?: Record<string, any>;
    }
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors = [];
    const warnings = [];

    // Verificar se o afiliado existe
    const affiliate = await prisma.affiliateUser.findUnique({
      where: { id: affiliateUserId }
    });

    if (!affiliate) {
      errors.push('Affiliate not found');
      return { isValid: false, errors, warnings };
    }

    if (!affiliate.isActive) {
      errors.push('Affiliate is not active');
    }

    // Verificar limite de convites para traders
    if (affiliate.userType === 'trader' && affiliate.inviteLimit !== null) {
      const activeInvites = await prisma.affiliateInvite.count({
        where: {
          affiliateUserId,
          status: { in: ['pending', 'accepted'] }
        }
      });

      if (activeInvites >= affiliate.inviteLimit) {
        errors.push(`Invite limit reached. Maximum ${affiliate.inviteLimit} invites allowed.`);
      }
    }

    // Validar período de expiração
    if (options.expiresInDays) {
      if (options.expiresInDays < 1) {
        errors.push('Expiration period must be at least 1 day');
      }
      if (options.expiresInDays > 365) {
        warnings.push('Expiration period is very long (over 1 year)');
      }
    }

    // Validar metadata
    if (options.metadata) {
      const metadataSize = JSON.stringify(options.metadata).length;
      if (metadataSize > 10000) {
        errors.push('Metadata size exceeds limit (10KB)');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async validateInviteAcceptance(
    inviteCode: string,
    userId: string
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors = [];
    const warnings = [];

    // Buscar convite
    const invite = await prisma.affiliateInvite.findUnique({
      where: { inviteCode }
    });

    if (!invite) {
      errors.push('Invalid invite code');
      return { isValid: false, errors, warnings };
    }

    if (invite.status !== 'pending') {
      errors.push('Invite is not pending');
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      errors.push('Invite has expired');
    }

    // Verificar se o usuário já é afiliado
    const existingAffiliate = await prisma.affiliateUser.findUnique({
      where: { userId }
    });

    if (existingAffiliate) {
      errors.push('User is already an affiliate');
    }

    // Verificar se o usuário já aceitou este convite
    if (invite.invitedUserId && invite.invitedUserId !== userId) {
      errors.push('Invite has already been accepted by another user');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
```

## 📊 APIs do Sistema de Convites

### 1. Invite Management APIs

#### POST /api/affiliate/invites
Criar novo convite

```typescript
interface CreateInviteRequest {
  expiresInDays?: number;
  metadata?: Record<string, any>;
}

interface CreateInviteResponse {
  success: boolean;
  inviteId?: string;
  inviteCode?: string;
  inviteUrl?: string;
  expiresAt?: string;
  message: string;
}
```

#### GET /api/affiliate/invites
Listar convites do afiliado

```typescript
interface InviteListRequest {
  page?: number;
  limit?: number;
  status?: 'pending' | 'accepted' | 'revoked' | 'expired';
}

interface InviteListResponse {
  invites: {
    id: string;
    inviteCode: string;
    inviteUrl: string;
    status: string;
    expiresAt: string;
    acceptedAt?: string;
    revokedAt?: string;
    invitedUser?: {
      id: string;
      name: string;
      email: string;
      image?: string;
    };
    metadata: Record<string, any>;
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

#### POST /api/affiliate/invites/{id}/revoke
Revogar convite

```typescript
interface RevokeInviteResponse {
  success: boolean;
  message: string;
}
```

#### POST /api/affiliate/invites/{id}/reuse
Reutilizar convite revogado

```typescript
interface ReuseInviteResponse {
  success: boolean;
  inviteId?: string;
  inviteCode?: string;
  inviteUrl?: string;
  expiresAt?: string;
  message: string;
}
```

### 2. Invite Acceptance APIs

#### POST /api/affiliate/invites/accept
Aceitar convite

```typescript
interface AcceptInviteRequest {
  inviteCode: string;
}

interface AcceptInviteResponse {
  success: boolean;
  message: string;
}
```

#### GET /api/affiliate/invites/validate/{code}
Validar convite

```typescript
interface ValidateInviteResponse {
  isValid: boolean;
  invite?: {
    id: string;
    affiliateCode: string;
    affiliateName: string;
    expiresAt: string;
  };
  errors: string[];
}
```

### 3. Analytics APIs

#### GET /api/affiliate/invites/stats
Estatísticas de convites

```typescript
interface InviteStatsResponse {
  totalInvites: number;
  acceptedInvites: number;
  pendingInvites: number;
  revokedInvites: number;
  expiredInvites: number;
  conversionRate: number;
}
```

#### GET /api/affiliate/invites/performance
Performance de convites

```typescript
interface InvitePerformanceResponse {
  invites: {
    id: string;
    inviteCode: string;
    status: string;
    createdAt: string;
    acceptedAt?: string;
    invitedUser?: {
      id: string;
      name: string;
      email: string;
    };
    daysToAccept?: number;
  }[];
}
```

## 🧪 Testes do Sistema de Convites

### Testes Unitários

```typescript
// tests/unit/affiliate/invite-manager.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { InviteManager } from '../../src/affiliate/invite-manager';
import { prisma } from '../setup';

describe('InviteManager', () => {
  let inviteManager: InviteManager;

  beforeEach(() => {
    inviteManager = new InviteManager();
  });

  describe('createInvite', () => {
    it('should create invite for trader within limit', async () => {
      // Criar afiliado trader
      const affiliate = await prisma.affiliateUser.create({
        data: {
          userId: 'user-1',
          tenantId: 'tenant-1',
          affiliateCode: 'TRADER001',
          userType: 'trader',
          inviteLimit: 5
        }
      });

      const result = await inviteManager.createInvite(affiliate.id);

      expect(result.success).toBe(true);
      expect(result.inviteCode).toBeDefined();
      expect(result.inviteUrl).toBeDefined();
      expect(result.expiresAt).toBeDefined();
    });

    it('should reject invite creation when trader limit reached', async () => {
      // Criar afiliado trader
      const affiliate = await prisma.affiliateUser.create({
        data: {
          userId: 'user-1',
          tenantId: 'tenant-1',
          affiliateCode: 'TRADER001',
          userType: 'trader',
          inviteLimit: 1
        }
      });

      // Criar primeiro convite
      await inviteManager.createInvite(affiliate.id);

      // Tentar criar segundo convite
      const result = await inviteManager.createInvite(affiliate.id);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invite limit reached');
    });

    it('should create unlimited invites for influencer', async () => {
      // Criar afiliado influencer
      const affiliate = await prisma.affiliateUser.create({
        data: {
          userId: 'user-1',
          tenantId: 'tenant-1',
          affiliateCode: 'INFLUENCER001',
          userType: 'influencer',
          inviteLimit: null
        }
      });

      // Criar múltiplos convites
      const results = await Promise.all([
        inviteManager.createInvite(affiliate.id),
        inviteManager.createInvite(affiliate.id),
        inviteManager.createInvite(affiliate.id)
      ]);

      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('revokeInvite', () => {
    it('should revoke pending invite', async () => {
      // Criar afiliado e convite
      const affiliate = await prisma.affiliateUser.create({
        data: {
          userId: 'user-1',
          tenantId: 'tenant-1',
          affiliateCode: 'TRADER001',
          userType: 'trader',
          inviteLimit: 5
        }
      });

      const invite = await prisma.affiliateInvite.create({
        data: {
          affiliateUserId: affiliate.id,
          inviteCode: 'INVITE001',
          inviteUrl: 'https://example.com/invite/INVITE001',
          status: 'pending'
        }
      });

      const result = await inviteManager.revokeInvite(invite.id, affiliate.id);

      expect(result.success).toBe(true);

      // Verificar se o convite foi revogado
      const updatedInvite = await prisma.affiliateInvite.findUnique({
        where: { id: invite.id }
      });

      expect(updatedInvite?.status).toBe('revoked');
      expect(updatedInvite?.revokedAt).toBeDefined();
    });
  });

  describe('reuseInvite', () => {
    it('should reuse revoked invite', async () => {
      // Criar afiliado e convite revogado
      const affiliate = await prisma.affiliateUser.create({
        data: {
          userId: 'user-1',
          tenantId: 'tenant-1',
          affiliateCode: 'TRADER001',
          userType: 'trader',
          inviteLimit: 5
        }
      });

      const invite = await prisma.affiliateInvite.create({
        data: {
          affiliateUserId: affiliate.id,
          inviteCode: 'INVITE001',
          inviteUrl: 'https://example.com/invite/INVITE001',
          status: 'revoked',
          revokedAt: new Date()
        }
      });

      const result = await inviteManager.reuseInvite(invite.id, affiliate.id);

      expect(result.success).toBe(true);
      expect(result.inviteCode).not.toBe('INVITE001');
      expect(result.inviteUrl).not.toContain('INVITE001');

      // Verificar se o convite foi reutilizado
      const updatedInvite = await prisma.affiliateInvite.findUnique({
        where: { id: invite.id }
      });

      expect(updatedInvite?.status).toBe('pending');
      expect(updatedInvite?.revokedAt).toBeNull();
    });
  });
});
```

## 📋 Checklist de Implementação

### ✅ Configuração Inicial
- [ ] Criar tabelas de convites
- [ ] Configurar limitações por tipo
- [ ] Implementar validações
- [ ] Configurar geração de códigos

### ✅ Funcionalidades
- [ ] Criação de convites
- [ ] Revogação de convites
- [ ] Reutilização de convites
- [ ] Aceitação de convites

### ✅ Analytics
- [ ] Estatísticas de convites
- [ ] Performance de convites
- [ ] Relatórios de conversão
- [ ] Métricas de engajamento

### ✅ Testes
- [ ] Testes unitários
- [ ] Testes de integração
- [ ] Testes de validação
- [ ] Testes de limite

---

**Última atualização**: 2024-12-19
**Versão**: 1.0.0
**Responsável**: Agente-CTO